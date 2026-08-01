"""Export a DuckDB view to a CSV file.

Useful for the Drive-CSV fallback (the full ``dem`` view is too large for a
Google Sheet — see ``dashboards/sheets/README.md``) and for any ad-hoc CSV
of a view in ``dashboards/duckdb/eps.duckdb``. Outputs default to
``dist/csv/<view>.csv`` (gitignored, alongside the wheel under ``dist/``).
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

import duckdb

from .config import REPO_ROOT
from .views import DEFAULT_DUCKDB_PATH, require_view

#: Default output directory (gitignored via the top-level `dist/` rule).
DEFAULT_CSV_DIR = REPO_ROOT / "dist" / "csv"

#: A bare DuckDB identifier — the view name is interpolated into SQL, so we
#: refuse anything that isn't a plain identifier (defense in depth).
_IDENTIFIER_RE = re.compile(r"[A-Za-z_][A-Za-z0-9_]*")


@dataclass(frozen=True)
class CsvResult:
    """Outcome of one `view_to_csv` call."""

    view: str
    path: Path
    rows: int


def default_csv_path(view: str) -> Path:
    return DEFAULT_CSV_DIR / f"{view}.csv"


def view_to_csv(
    view: str,
    out_path: Path | str | None = None,
    *,
    duckdb_path: Path | str = DEFAULT_DUCKDB_PATH,
) -> CsvResult:
    """Write ``SELECT * FROM <view>`` to a CSV file (with header).

    Returns the output path and the row count. Raises ``ValueError`` for a
    non-identifier view name or a view the database doesn't define, and
    ``FileNotFoundError`` if the DuckDB file is absent (run ``egr-build``
    first).
    """
    if not _IDENTIFIER_RE.fullmatch(view):
        raise ValueError(
            f"Unsafe view name {view!r}: expected a bare identifier "
            f"(letters, digits, underscore)."
        )
    duckdb_path = Path(duckdb_path)
    if not duckdb_path.is_file():
        raise FileNotFoundError(f"DuckDB file not found: {duckdb_path}. Run `egr-build` first.")

    out = Path(out_path) if out_path else default_csv_path(view)
    out.parent.mkdir(parents=True, exist_ok=True)
    # Single-quote any quotes in the target path for the SQL string literal.
    out_literal = str(out).replace("'", "''")

    con = duckdb.connect(str(duckdb_path), read_only=True)
    try:
        require_view(con, view, duckdb_path)
        con.execute(f"COPY (SELECT * FROM {view}) TO '{out_literal}' (HEADER, FORMAT csv)")
        rows = con.execute(f"SELECT COUNT(*) FROM {view}").fetchone()[0]
    finally:
        con.close()
    return CsvResult(view=view, path=out, rows=int(rows))
