"""Tests for DuckDB view -> CSV export."""

from __future__ import annotations

import csv
from pathlib import Path

import duckdb
import pandas as pd
import pytest

from eps_ground_rapture import csvexport


def _make_duckdb(tmp_path: Path, df: pd.DataFrame, view: str = "v") -> Path:
    path = tmp_path / "test.duckdb"
    con = duckdb.connect(str(path))
    con.register("src", df)
    con.execute(f"CREATE TABLE {view}_t AS SELECT * FROM src")
    con.execute(f"CREATE VIEW {view} AS SELECT * FROM {view}_t")
    con.close()
    return path


def test_view_to_csv_writes_header_and_rows(tmp_path):
    df = pd.DataFrame({"source": ["DEM", "FDHI"], "x": [1.5, 2.0]})
    db = _make_duckdb(tmp_path, df)
    out = tmp_path / "v.csv"
    res = csvexport.view_to_csv("v", out, duckdb_path=db)

    assert res.path == out and res.rows == 2
    rows = list(csv.reader(out.open()))
    assert rows[0] == ["source", "x"]  # header
    assert len(rows) == 3  # header + 2 data rows
    assert {r[0] for r in rows[1:]} == {"DEM", "FDHI"}


def test_view_to_csv_default_path(tmp_path, monkeypatch):
    df = pd.DataFrame({"a": [1]})
    db = _make_duckdb(tmp_path, df)
    monkeypatch.setattr(csvexport, "DEFAULT_CSV_DIR", tmp_path / "dist" / "csv")
    res = csvexport.view_to_csv("v", duckdb_path=db)
    assert res.path == tmp_path / "dist" / "csv" / "v.csv"
    assert res.path.is_file()


def test_view_to_csv_identifier_guard(tmp_path):
    db = _make_duckdb(tmp_path, pd.DataFrame({"a": [1]}))
    with pytest.raises(ValueError, match="Unsafe view name"):
        csvexport.view_to_csv("v; DROP TABLE x", tmp_path / "out.csv", duckdb_path=db)


def test_view_to_csv_missing_duckdb(tmp_path):
    with pytest.raises(FileNotFoundError, match="egr-build"):
        csvexport.view_to_csv("v", tmp_path / "out.csv", duckdb_path=tmp_path / "nope.duckdb")
