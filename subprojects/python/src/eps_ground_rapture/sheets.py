"""Push a DuckDB view to Google Sheets so Tableau Public can auto-refresh.

Tableau Public cannot connect to DuckDB/Athena, but it *can* connect to a
Google Sheet and refresh from it on a schedule. This module loads a view
from `dashboards/duckdb/eps.duckdb` into a DataFrame and writes it to a
worksheet as an **idempotent full replace** (clear + rewrite), so re-runs
are safe and the Sheet always mirrors the current view.

Credentials are a Google service-account **key file** whose path comes from
the `GOOGLE_SHEETS_SA_KEYFILE` environment variable, defaulting to
`resources/local/eps-sheets-sa.json` (gitignored) under the repo root. The
key file itself never enters version control; only its path is referenced.
The CLI entry point is `egr-push-sheets` (see `cli.py` and
`dashboards/sheets/README.md`).

Caveat: a Google spreadsheet caps at 10,000,000 cells. We guard at
9,000,000 (rows × cols) with headroom; views over that (e.g. the full
`dem` table at ~9.0M cells) must use the Drive-CSV fallback documented in
the README rather than this push.
"""

from __future__ import annotations

import json
import math
import os
import re
import time
from dataclasses import dataclass
from pathlib import Path

import duckdb
import gspread
import numpy as np
import pandas as pd

from .config import REPO_ROOT
from .views import DEFAULT_DUCKDB_PATH

#: Environment variable holding the *path* to the service-account key file.
GOOGLE_SHEETS_SA_KEYFILE_ENV = "GOOGLE_SHEETS_SA_KEYFILE"

#: Default key-file location (gitignored) used when the env var is unset.
DEFAULT_SA_KEYFILE = REPO_ROOT / "resources" / "local" / "eps-sheets-sa.json"

#: Max cells (rows × cols) we will push to a single Sheet. Google's hard cap
#: is 10M; we leave headroom so the Sheet stays editable.
CELL_LIMIT = 9_000_000

#: Hard upper bound on rows per Sheets write request. The actual chunk size
#: is usually smaller — capped by ``BYTE_BUDGET`` (see ``_rows_per_chunk``) —
#: but never larger than this.
CHUNK_ROWS = 50_000

#: Soft byte ceiling per write request. Google recommends keeping a Sheets
#: API request payload under ~2 MB; we budget 1.8 MB so a 10-column view like
#: ``unified_observations`` (≈77 B/row) chunks to ~23k rows/≈1.8 MB instead of
#: a single 50k-row/3.8 MB body that risks transport timeouts.
BYTE_BUDGET = 1_800_000

#: HTTP statuses worth retrying (besides any 5xx): rate-limit and request-timeout.
_RETRYABLE_STATUS = frozenset({408, 429})

#: A legal DuckDB identifier — the view name is interpolated into SQL, so we
#: refuse anything that isn't a bare identifier (defense in depth; the name
#: comes from committed config, not user input).
_IDENTIFIER_RE = re.compile(r"[A-Za-z_][A-Za-z0-9_]*")


@dataclass(frozen=True)
class SheetPushResult:
    """Outcome of one `push_view_to_sheet` call."""

    view: str
    worksheet: str
    spreadsheet_id: str
    rows: int  # data rows (excludes header)
    cols: int
    url: str


def resolve_keyfile() -> Path:
    """Resolve the service-account key-file path and confirm it exists.

    Reads the path from `GOOGLE_SHEETS_SA_KEYFILE` (a relative path there is
    resolved against the repo root), or falls back to `DEFAULT_SA_KEYFILE`.
    Raises `FileNotFoundError` with a clear message if no file is present —
    there is no fallback to any other credential source.
    """
    raw = os.environ.get(GOOGLE_SHEETS_SA_KEYFILE_ENV)
    if raw:
        path = Path(raw).expanduser()
        if not path.is_absolute():
            path = REPO_ROOT / path
    else:
        path = DEFAULT_SA_KEYFILE
    if not path.is_file():
        raise FileNotFoundError(
            f"Service-account key file not found: {path}\n"
            f"Place the key at {DEFAULT_SA_KEYFILE} (gitignored) or set "
            f"{GOOGLE_SHEETS_SA_KEYFILE_ENV} to its path. "
            f"See dashboards/sheets/README.md."
        )
    return path


def _load_view(view: str, duckdb_path: Path | str) -> pd.DataFrame:
    """Read an entire view from DuckDB into a DataFrame (read-only connection)."""
    if not _IDENTIFIER_RE.fullmatch(view):
        raise ValueError(
            f"Unsafe view name {view!r}: expected a bare identifier "
            f"(letters, digits, underscore)."
        )
    con = duckdb.connect(str(duckdb_path), read_only=True)
    try:
        return con.execute(f"SELECT * FROM {view}").df()
    finally:
        con.close()


def _clean_cell(value: object) -> object:
    """Coerce a DataFrame cell to a JSON-serializable value gspread accepts.

    NaN / NaT / None / pandas NA become empty strings; numpy scalars become
    native Python; date-likes become ISO strings.
    """
    if value is None:
        return ""
    try:
        if pd.isna(value):  # nan, NaT, pd.NA
            return ""
    except (TypeError, ValueError):
        pass  # array-like or unhashable — fall through (not expected for flat tables)
    if isinstance(value, np.integer):
        return int(value)
    if isinstance(value, np.floating):
        f = float(value)
        # Non-finite floats (NaN and ±inf) are not valid JSON; blank them so a
        # stray inf can't reject the whole chunk on the live push.
        return "" if not math.isfinite(f) else f
    if isinstance(value, np.bool_):
        return bool(value)
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return value


def _is_retryable(exc: gspread.exceptions.APIError) -> bool:
    """True for transient statuses: 429 (rate limit), 408 (timeout), any 5xx.

    Mirrors gspread's own ``BackOffHTTPClient`` retry set. We check both the
    parsed ``APIError.code`` and the raw ``response.status_code`` (either may
    be absent / -1 if the error body didn't parse).
    """
    for code in (
        getattr(exc, "code", None),
        getattr(getattr(exc, "response", None), "status_code", None),
    ):
        if isinstance(code, int) and (code in _RETRYABLE_STATUS or code >= 500):
            return True
    return False


def _rows_per_chunk(
    values: list[list], *, byte_budget: int | None = None, hard_cap: int | None = None
) -> int:
    """Rows per write request: the most rows (≤ ``hard_cap``) whose JSON body
    stays under ``byte_budget``, estimated from a sample.

    Keeps each Sheets write under Google's recommended payload size, adapting
    to the view's width (a wide view chunks into fewer rows than a narrow one).
    ``byte_budget`` / ``hard_cap`` default to the module globals, resolved at
    call time so they stay overridable.
    """
    budget = BYTE_BUDGET if byte_budget is None else byte_budget
    cap = CHUNK_ROWS if hard_cap is None else hard_cap
    if not values:
        return cap
    sample = values[: min(len(values), 1000)]
    per_row = max(1.0, len(json.dumps(sample)) / len(sample))
    return max(1, min(cap, int(budget / per_row)))


def _with_retry(fn, *, max_attempts: int = 6, base_delay: float = 1.0, sleep=time.sleep):
    """Call `fn`, retrying transient API errors with exponential backoff (1, 2, 4, … s)."""
    for attempt in range(1, max_attempts + 1):
        try:
            return fn()
        except gspread.exceptions.APIError as exc:
            if _is_retryable(exc) and attempt < max_attempts:
                sleep(base_delay * (2 ** (attempt - 1)))
                continue
            raise


def push_view_to_sheet(
    view: str,
    spreadsheet_id: str,
    worksheet: str,
    *,
    duckdb_path: Path | str = DEFAULT_DUCKDB_PATH,
    keyfile: Path | str,
) -> SheetPushResult:
    """Replace `worksheet` in spreadsheet `spreadsheet_id` with the rows of `view`.

    Full replace (not append): the worksheet is cleared, resized to fit, and
    rewritten header-first in chunks of ~``CHUNK_ROWS`` rows, retrying any
    chunk on rate-limit (429). Idempotent and re-runnable.

    Raises ``ValueError`` if the view exceeds ``CELL_LIMIT`` cells (use the
    Drive-CSV fallback instead — see ``dashboards/sheets/README.md``).
    """
    df = _load_view(view, duckdb_path)
    nrows, ncols = df.shape
    cells = nrows * ncols
    if cells > CELL_LIMIT:
        raise ValueError(
            f"View {view!r} is {nrows:,} rows x {ncols} cols = {cells:,} cells, "
            f"over the {CELL_LIMIT:,}-cell limit for a Google Sheet. "
            f"Use the Drive-CSV fallback instead (see dashboards/sheets/README.md)."
        )

    header = [str(c) for c in df.columns]
    data_values = [[_clean_cell(v) for v in row] for row in df.itertuples(index=False, name=None)]
    all_values = [header, *data_values]
    total_rows = len(all_values)  # header + data
    width = max(ncols, 1)

    gc = gspread.service_account(filename=str(keyfile))
    spreadsheet = gc.open_by_key(spreadsheet_id)

    try:
        ws = spreadsheet.worksheet(worksheet)
    except gspread.WorksheetNotFound:
        ws = spreadsheet.add_worksheet(title=worksheet, rows=max(total_rows, 1), cols=width)

    # Full replace: clear stale cells, size the grid exactly, rewrite in chunks
    # sized to stay under the byte budget (and never above CHUNK_ROWS).
    _with_retry(ws.clear)
    _with_retry(lambda: ws.resize(rows=max(total_rows, 1), cols=width))
    chunk_size = _rows_per_chunk(all_values)
    for start in range(0, total_rows, chunk_size):
        chunk = all_values[start : start + chunk_size]
        a1 = f"A{start + 1}"  # 1-based top-left of this chunk
        _with_retry(
            lambda c=chunk, r=a1: ws.update(
                values=c, range_name=r, value_input_option=gspread.utils.ValueInputOption.raw
            )
        )

    url = f"https://docs.google.com/spreadsheets/d/{spreadsheet_id}/edit#gid={ws.id}"
    return SheetPushResult(
        view=view,
        worksheet=worksheet,
        spreadsheet_id=spreadsheet_id,
        rows=nrows,
        cols=ncols,
        url=url,
    )
