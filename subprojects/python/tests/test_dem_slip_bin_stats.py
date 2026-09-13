"""Tests for the Dashboard 5 `dem_slip_bin_stats` view (paper Figure 8).

Figure 8 is mean ± σ **per 0.05 m slip increment** per scarp class — not a
per-class pooled summary. The ground truth is Kristen Chiama's notebook
(`legacy/DEM_slip_averages_figure - part 1.ipynb`, cell 4): for each `s`
from `np.arange(start, 5.05, 0.05)`, take the rows with
`s < Slip <= s + 0.05`, drop NaNs per measure, and record
`statistics.mean` / `statistics.stdev` (sample SD) of scarp height,
`Us - Ud`, DZW and scarp dip.

`test_view_reproduces_the_notebook_method` re-runs that cell in pandas —
the raw `np.arange` floats as the notebook uses them, the same open/closed
edges, `statistics.stdev` — for **all six classes and all four measures**,
and compares every bin to the SQL. The fixture rebuilds the views from
Parquet into a temp DuckDB, as the other view tests do, so it exercises
`views.py` rather than the committed database. Skips where
`data/processed` is absent.
"""

from __future__ import annotations

import statistics as st

import duckdb
import numpy as np
import pandas as pd
import pytest

from eps_ground_rupture import config, views

SIX_CLASSES = {
    "Monoclinal",
    "Monoclinal Collapse",
    "Pressure Ridge",
    "Pressure Ridge Collapse",
    "Simple",
    "Simple Collapse",
}


@pytest.fixture(scope="module")
def con(tmp_path_factory):
    processed = config.PROCESSED_DIR
    if not (processed / "dem" / "data.parquet").is_file():
        pytest.skip("processed dem Parquet missing; run egr-build")
    db = views.build_duckdb_views(
        processed_dir=processed,
        duckdb_path=tmp_path_factory.mktemp("slipbins") / "eps.duckdb",
    )
    c = duckdb.connect(str(db), read_only=True)
    yield c
    c.close()


@pytest.fixture(scope="module")
def dem() -> pd.DataFrame:
    p = config.PROCESSED_DIR / "dem" / "data.parquet"
    if not p.is_file():
        pytest.skip("processed dem Parquet missing; run egr-build")
    return pd.read_parquet(p)


def test_view_has_all_six_classes_and_sorted_bins(con):
    rows = con.execute(
        "SELECT scarp_class, COUNT(*), MIN(slip_bin), MAX(slip_bin), MIN(n) "
        "FROM dem_slip_bin_stats GROUP BY 1 ORDER BY 1"
    ).fetchall()
    assert {r[0] for r in rows} == SIX_CLASSES
    for _cls, nbins, lo, hi, min_n in rows:
        assert nbins > 50  # dozens of increments per class, not a handful
        assert 0.0 <= lo < hi <= 5.0
        assert min_n >= 2  # statistics.stdev needs two values


def test_bins_are_right_closed_on_a_five_centimetre_grid(con):
    bins = [
        r[0]
        for r in con.execute(
            "SELECT DISTINCT slip_bin FROM dem_slip_bin_stats ORDER BY 1"
        ).fetchall()
    ]
    # every lower edge is a multiple of 0.05 …
    assert all(abs(b / 0.05 - round(b / 0.05)) < 1e-9 for b in bins)
    # … and the top bin is the notebook's last `s` (np.arange(..., 5.05, 0.05))
    assert max(bins) == pytest.approx(5.0)


def test_every_classed_stage_lands_in_exactly_one_bin(con, dem):
    """Sum of n over the view == classed rows with Slip > 0, minus the rows
    lost to the n >= 2 gate (singleton bins). This checks the partition is
    complete and the gate is applied; the EDGE placement is checked by
    `test_view_reproduces_the_notebook_method`, not here — any deterministic
    partition of the same rows would satisfy a sum."""
    in_view = con.execute("SELECT SUM(n) FROM dem_slip_bin_stats").fetchone()[0]
    classed = dem[dem["Scarp_Class"].notna() & (dem["Slip"] > 0)]
    edges = (np.ceil(classed["Slip"] / 0.05) - 1) * 0.05
    sizes = classed.groupby([classed["Scarp_Class"], edges.round(2)]).size()
    assert in_view == int(sizes[sizes >= 2].sum())
    assert int(sizes[sizes < 2].sum()) < 50  # singletons are a rounding tail, not a population


MEASURES = {  # view column stem -> Parquet column, as the notebook reads them
    "scarp_height": "Scarp_Height",
    "us_ud": "Us - Ud",
    "dzw": "DZW",
    "scarp_dip": "Scarp_Dip",  # notebook: Convert_Scarp_Dip, absent from DEM_dataset.csv
}


@pytest.mark.parametrize("cls", sorted(SIX_CLASSES))
def test_view_reproduces_the_notebook_method(con, dem, cls):
    """Notebook cell 4, re-run per class with its raw np.arange floats."""
    df = dem[dem["Scarp_Class"] == cls]
    expected = {}
    for s in np.arange(0.05, 5.05, 0.05):  # raw floats, exactly as the notebook compares
        win = df[(df["Slip"] > s) & (df["Slip"] <= s + 0.05)]
        if len(win) < 2:
            continue
        row = [len(win)]
        for col in MEASURES.values():
            vals = win[col].dropna().tolist()
            row += [st.mean(vals), st.stdev(vals)]
        expected[round(float(s), 2)] = row

    cols = ", ".join(f"mean_{m}, sd_{m}" for m in MEASURES)
    got = {
        round(r[0], 2): list(r[1:])
        for r in con.execute(
            f"SELECT slip_bin, n, {cols} FROM dem_slip_bin_stats "
            "WHERE scarp_class = ? ORDER BY slip_bin",
            [cls],
        ).fetchall()
    }
    assert set(got) == set(expected), "bin set differs from the notebook's"
    for s, exp in expected.items():
        assert got[s][0] == exp[0], f"n differs at s={s}"
        for e, g in zip(exp[1:], got[s][1:], strict=False):
            assert g == pytest.approx(e, rel=1e-9), f"stat differs at s={s}"


def test_pinned_row_counts(con):
    """Bins per class with the shipped inputs (2026-09-10). A changed DEM
    export moves these — re-pin deliberately, don't loosen."""
    rows = dict(
        con.execute("SELECT scarp_class, COUNT(*) FROM dem_slip_bin_stats GROUP BY 1").fetchall()
    )
    assert rows == {
        "Monoclinal": 100,
        "Monoclinal Collapse": 96,
        "Pressure Ridge": 100,
        "Pressure Ridge Collapse": 100,
        "Simple": 88,
        "Simple Collapse": 71,
    }
    total, stages = con.execute("SELECT COUNT(*), SUM(n) FROM dem_slip_bin_stats").fetchone()
    assert (total, stages) == (555, 343_392)


def test_athena_twin_is_consistent_with_the_duckdb_view():
    sql = views.athena_dem_slip_bin_stats_view_sql()
    assert "CREATE OR REPLACE VIEW dem_slip_bin_stats" in sql
    # sanitized names, not the quoted Parquet originals
    assert "us_ud" in sql and '"Us - Ud"' not in sql
    # sample SD and the same right-closed 0.05 m binning
    assert "stddev_samp" in sql
    assert "ceiling(slip / 0.05) - 1" in sql
    assert "HAVING COUNT(*) >= 2" in sql
