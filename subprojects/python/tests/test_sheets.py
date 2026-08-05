"""Tests for the Google Sheets push path.

The real Google push needs service-account credentials and a shared Sheet,
so the network is fully mocked: a fake gspread client records the
clear / resize / chunked-update calls. The DuckDB → DataFrame path is
exercised for real against tmp Parquet/DuckDB and (optionally) the
committed views file.
"""

from __future__ import annotations

import json
from pathlib import Path

import duckdb
import gspread
import numpy as np
import pandas as pd
import pytest
import requests

from eps_ground_rupture import cli, config, sheets

# --------------------------------------------------------------------------
# helpers: build a tiny DuckDB with a view, and a fake gspread client
# --------------------------------------------------------------------------


def _make_duckdb(tmp_path: Path, df: pd.DataFrame, view: str = "v") -> Path:
    path = tmp_path / "test.duckdb"
    con = duckdb.connect(str(path))
    con.register("src", df)
    con.execute(f"CREATE VIEW {view} AS SELECT * FROM src")
    # Materialize so the view survives after the registration goes away.
    con.execute(f"CREATE TABLE {view}_t AS SELECT * FROM src")
    con.execute(f"DROP VIEW {view}")
    con.execute(f"CREATE VIEW {view} AS SELECT * FROM {view}_t")
    con.close()
    return path


class FakeWorksheet:
    def __init__(self, title: str, rows: int = 100, cols: int = 26, gid: int = 7):
        self.title = title
        self._rows = rows
        self._cols = cols
        self.id = gid
        self.calls: list[tuple] = []

    def clear(self):
        self.calls.append(("clear",))
        return {}

    def resize(self, rows=None, cols=None):
        self.calls.append(("resize", rows, cols))
        self._rows, self._cols = rows, cols
        return {}

    def update(self, values=None, range_name=None, value_input_option=None, **kw):
        self.calls.append(("update", range_name, len(values), value_input_option))
        return {}


class FakeSpreadsheet:
    def __init__(self, existing: dict[str, FakeWorksheet] | None = None):
        self._ws = existing or {}
        self.added: list[str] = []

    def worksheet(self, title):
        if title not in self._ws:
            raise gspread.WorksheetNotFound(title)
        return self._ws[title]

    def add_worksheet(self, title, rows, cols, index=None):
        self.added.append(title)
        ws = FakeWorksheet(title, rows=rows, cols=cols)
        self._ws[title] = ws
        return ws


class FakeClient:
    def __init__(self, spreadsheet):
        self._sh = spreadsheet
        self.opened: list[str] = []

    def open_by_key(self, key):
        self.opened.append(key)
        return self._sh


def _install_fake_gspread(monkeypatch, spreadsheet) -> FakeClient:
    client = FakeClient(spreadsheet)
    # auth now goes through service_account(filename=...); the filename is
    # ignored by the fake (tests pass a dummy keyfile path).
    monkeypatch.setattr(sheets.gspread, "service_account", lambda filename=None, **kw: client)
    return client


def _api_error(status: int) -> gspread.exceptions.APIError:
    resp = requests.models.Response()
    resp.status_code = status
    resp._content = json.dumps(
        {"error": {"code": status, "message": "boom", "status": "X"}}
    ).encode()
    return gspread.exceptions.APIError(resp)


_KEYFILE = "/tmp/eps-sheets-sa.json"  # dummy; service_account is mocked in push tests


# --------------------------------------------------------------------------
# credentials (key-file path resolution)
# --------------------------------------------------------------------------


def test_resolve_keyfile_from_env(tmp_path, monkeypatch):
    kf = tmp_path / "my-key.json"
    kf.write_text("{}")
    monkeypatch.setenv(sheets.GOOGLE_SHEETS_SA_KEYFILE_ENV, str(kf))
    assert sheets.resolve_keyfile() == kf


def test_resolve_keyfile_env_relative_to_repo_root(tmp_path, monkeypatch):
    # a relative env path resolves against REPO_ROOT
    rel = "resources/local/eps-sheets-sa.json"
    target = sheets.REPO_ROOT / rel
    monkeypatch.setenv(sheets.GOOGLE_SHEETS_SA_KEYFILE_ENV, rel)
    if target.is_file():
        assert sheets.resolve_keyfile() == target
    else:
        with pytest.raises(FileNotFoundError):
            sheets.resolve_keyfile()


def test_resolve_keyfile_default(tmp_path, monkeypatch):
    kf = tmp_path / "default-sa.json"
    kf.write_text("{}")
    monkeypatch.delenv(sheets.GOOGLE_SHEETS_SA_KEYFILE_ENV, raising=False)
    monkeypatch.setattr(sheets, "DEFAULT_SA_KEYFILE", kf)
    assert sheets.resolve_keyfile() == kf


def test_resolve_keyfile_missing_raises(tmp_path, monkeypatch):
    monkeypatch.setenv(sheets.GOOGLE_SHEETS_SA_KEYFILE_ENV, str(tmp_path / "nope.json"))
    with pytest.raises(FileNotFoundError) as exc:
        sheets.resolve_keyfile()
    msg = str(exc.value)
    assert "not found" in msg and sheets.GOOGLE_SHEETS_SA_KEYFILE_ENV in msg


# --------------------------------------------------------------------------
# guards
# --------------------------------------------------------------------------


def test_identifier_guard(tmp_path):
    path = _make_duckdb(tmp_path, pd.DataFrame({"a": [1]}))
    with pytest.raises(ValueError, match="Unsafe view name"):
        sheets._load_view("v; DROP TABLE x", path)


def test_undefined_view_guard(tmp_path):
    """A targets.yaml entry naming an optional view that wasn't built (no
    raw input on this machine) reports it, rather than surfacing a raw
    DuckDB CatalogException through the CLI's broad except."""
    path = _make_duckdb(tmp_path, pd.DataFrame({"a": [1]}))
    with pytest.raises(ValueError, match="not defined") as exc:
        sheets._load_view("fdhi_measurements", path)
    assert "Available: v, v_t." in str(exc.value)


def test_cell_limit_guard(tmp_path, monkeypatch):
    df = pd.DataFrame({"a": range(5), "b": range(5)})  # 5x2 = 10 cells
    path = _make_duckdb(tmp_path, df)
    monkeypatch.setattr(sheets, "CELL_LIMIT", 5)
    with pytest.raises(ValueError) as exc:
        sheets.push_view_to_sheet("v", "sid", "ws", duckdb_path=path, keyfile=_KEYFILE)
    msg = str(exc.value)
    assert "'v'" in msg and "5 rows x 2 cols" in msg and "fallback" in msg.lower()


def test_clean_cell():
    assert sheets._clean_cell(None) == ""
    assert sheets._clean_cell(np.nan) == ""
    assert sheets._clean_cell(pd.NaT) == ""
    assert sheets._clean_cell(np.int64(3)) == 3 and isinstance(sheets._clean_cell(np.int64(3)), int)
    assert sheets._clean_cell(np.float64(1.5)) == 1.5 and isinstance(
        sheets._clean_cell(np.float64(1.5)), float
    )
    assert sheets._clean_cell(np.bool_(True)) is True
    assert sheets._clean_cell("DEM") == "DEM"
    assert sheets._clean_cell(pd.Timestamp("2025-01-02")) == "2025-01-02T00:00:00"
    # non-finite floats (±inf) blanked, like NaN — they aren't valid JSON
    assert sheets._clean_cell(np.float64(np.inf)) == ""
    assert sheets._clean_cell(np.float64(-np.inf)) == ""


def test_rows_per_chunk_byte_budget():
    # tiny rows -> hard cap binds
    small = [["a"]] * 10
    assert sheets._rows_per_chunk(small) == sheets.CHUNK_ROWS
    # tiny byte budget -> byte budget binds, well below hard cap, but >= 1
    rpc = sheets._rows_per_chunk(small, byte_budget=50)
    assert 1 <= rpc < sheets.CHUNK_ROWS


# --------------------------------------------------------------------------
# full push flow (mocked)
# --------------------------------------------------------------------------


def test_push_creates_clears_resizes_writes(tmp_path, monkeypatch):
    df = pd.DataFrame({"source": ["DEM", "FDHI"], "x": [1.0, np.nan]})
    path = _make_duckdb(tmp_path, df)
    sh = FakeSpreadsheet()  # worksheet does not exist yet
    _install_fake_gspread(monkeypatch, sh)

    res = sheets.push_view_to_sheet("v", "SID123", "v", duckdb_path=path, keyfile=_KEYFILE)

    assert res.rows == 2 and res.cols == 2
    assert res.url == "https://docs.google.com/spreadsheets/d/SID123/edit#gid=7"
    assert "v" in sh.added  # get-or-create created it
    ws = sh._ws["v"]
    kinds = [c[0] for c in ws.calls]
    assert kinds == ["clear", "resize", "update"]  # clear, resize, single chunk
    # resize to header+2 data rows x 2 cols
    assert ws.calls[1] == ("resize", 3, 2)
    # the single update wrote 3 rows (header + 2) starting at A1, RAW
    _, rng, n, vio = ws.calls[2]
    assert rng == "A1" and n == 3
    assert vio == gspread.utils.ValueInputOption.raw


def test_push_chunks_large_view(tmp_path, monkeypatch):
    df = pd.DataFrame({"a": range(120_000)})  # > 2 * CHUNK_ROWS(50k) => 3 chunks
    path = _make_duckdb(tmp_path, df)
    sh = FakeSpreadsheet()
    _install_fake_gspread(monkeypatch, sh)

    sheets.push_view_to_sheet("v", "SID", "v", duckdb_path=path, keyfile=_KEYFILE)

    ws = sh._ws["v"]
    updates = [c for c in ws.calls if c[0] == "update"]
    # 1-col int rows are tiny, so the byte budget doesn't bind: the CHUNK_ROWS
    # hard cap (50_000) does. header + 120_000 = 120_001 rows => 3 updates.
    assert len(updates) == 3
    assert [c[1] for c in updates] == ["A1", "A50001", "A100001"]
    assert sum(c[2] for c in updates) == 120_001  # every row written exactly once


def test_push_chunks_by_byte_budget(tmp_path, monkeypatch):
    # Force the byte budget (not the row cap) to bind: a tiny budget should
    # split even a small view into multiple chunks covering every row once.
    df = pd.DataFrame({"a": range(300)})
    path = _make_duckdb(tmp_path, df)
    sh = FakeSpreadsheet()
    _install_fake_gspread(monkeypatch, sh)
    monkeypatch.setattr(sheets, "BYTE_BUDGET", 200)  # ~tens of rows per chunk

    sheets.push_view_to_sheet("v", "SID", "v", duckdb_path=path, keyfile=_KEYFILE)

    ws = sh._ws["v"]
    updates = [c for c in ws.calls if c[0] == "update"]
    assert len(updates) > 1  # byte budget forced multiple chunks
    assert sum(c[2] for c in updates) == 301  # header + 300 rows, each once
    assert updates[0][1] == "A1"  # first chunk anchored at the top


@pytest.mark.parametrize("status", [429, 408, 500, 503])
def test_push_retries_transient(tmp_path, monkeypatch, status):
    df = pd.DataFrame({"a": [1, 2, 3]})
    path = _make_duckdb(tmp_path, df)

    calls = {"n": 0}
    ws = FakeWorksheet("v")
    real_update = ws.update

    def flaky_update(**kw):
        calls["n"] += 1
        if calls["n"] == 1:
            raise _api_error(status)
        return real_update(**kw)

    ws.update = flaky_update
    sh = FakeSpreadsheet({"v": ws})
    _install_fake_gspread(monkeypatch, sh)
    monkeypatch.setattr(sheets.time, "sleep", lambda *_: None)  # no real backoff

    sheets.push_view_to_sheet("v", "SID", "v", duckdb_path=path, keyfile=_KEYFILE)
    assert calls["n"] == 2  # failed once on a transient status, retried, succeeded


def test_push_non_retryable_error_propagates(tmp_path, monkeypatch):
    df = pd.DataFrame({"a": [1]})
    path = _make_duckdb(tmp_path, df)
    ws = FakeWorksheet("v")
    ws.update = lambda **kw: (_ for _ in ()).throw(_api_error(403))  # client error, not transient
    sh = FakeSpreadsheet({"v": ws})
    _install_fake_gspread(monkeypatch, sh)
    monkeypatch.setattr(sheets.time, "sleep", lambda *_: None)
    with pytest.raises(gspread.exceptions.APIError):
        sheets.push_view_to_sheet("v", "SID", "v", duckdb_path=path, keyfile=_KEYFILE)


# --------------------------------------------------------------------------
# targets.yaml parsing
# --------------------------------------------------------------------------


def test_load_sheet_targets(tmp_path):
    p = tmp_path / "targets.yaml"
    p.write_text(
        "targets:\n"
        "  unified_observations:\n"
        "    spreadsheet_id: ABC\n"
        "    worksheet: uo\n"
        "  other:\n"
        "    spreadsheet_id: DEF\n"  # worksheet omitted -> defaults to view name
    )
    t = cli.load_sheet_targets(p)
    assert t["unified_observations"] == {"spreadsheet_id": "ABC", "worksheet": "uo"}
    assert t["other"] == {"spreadsheet_id": "DEF", "worksheet": "other"}


def test_load_sheet_targets_missing_id(tmp_path):
    p = tmp_path / "targets.yaml"
    p.write_text("targets:\n  v:\n    worksheet: w\n")
    with pytest.raises(ValueError, match="spreadsheet_id"):
        cli.load_sheet_targets(p)


def test_committed_targets_yaml_parses():
    p = config.REPO_ROOT / "dashboards" / "sheets" / "targets.yaml"
    t = cli.load_sheet_targets(p)
    assert "unified_observations" in t


# --------------------------------------------------------------------------
# real DuckDB load (validates the SELECT * -> DataFrame path end to end)
# --------------------------------------------------------------------------


def test_real_unified_observations_load():
    db = config.REPO_ROOT / "dashboards" / "duckdb" / "eps.duckdb"
    if not db.is_file():
        pytest.skip("eps.duckdb not built; run egr-build")
    df = sheets._load_view("unified_observations", db)
    assert df.shape[1] == 11  # incl. magnitude (added 2026-07-31)
    assert df.shape[0] > 0
