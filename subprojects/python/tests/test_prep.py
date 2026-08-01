"""Tests for the FDHI cleaning chain.

The prior owner's reference script (`legacy/FDHI-SURE-DEM_SCATTER.py`) is
not distributed with the repo, so these pin `prep`'s documented behavior
against synthetic frames instead — including the quirks that are
deliberate (duplicate rows from the concat-of-subsets, no `rupture_rank`
filter) and would otherwise look like bugs to a future reader.
"""

from __future__ import annotations

import pandas as pd
import pytest

from eps_ground_rapture import io, prep


def _row(**overrides):
    """One flatfile-shaped row; every filtered column defaults to passing."""
    row = {
        "style": "Reverse",
        "fzw_central_meters": 10.0,
        "recommended_net_preferred_usage_flag": "Keep",
        "rupture_rank": "Principal",
        "eq_name": "Wenchuan",
        # positivity columns — only vs_central is positive by default, so a
        # default row survives exactly one of the six subsets.
        "vs_central_meters": 2.0,
        "vs_low_meters": -999.0,
        "vs_high_meters": -999.0,
        "sh_central_meters": -999.0,
        "sh_low_meters": -999.0,
        "sh_high_meters": -999.0,
    }
    row.update(overrides)
    return row


def _frame(*rows):
    return pd.DataFrame(list(rows))


# --------------------------------------------------------------------------
# clean_fdhi — the Dashboard-1 scatter subset
# --------------------------------------------------------------------------


def test_clean_fdhi_keeps_only_reverse_styles():
    df = _frame(
        _row(style="Reverse"),
        _row(style="Reverse-Oblique"),
        _row(style="Strike-Slip"),
        _row(style="Normal"),
    )
    assert set(prep.clean_fdhi(df)["style"]) == {"Reverse", "Reverse-Oblique"}


def test_clean_fdhi_duplicates_rows_positive_in_several_measures():
    """A row positive in N of the six measures appears N times — the
    concat-of-subsets behavior the shipped CSV also contains."""
    df = _frame(_row(vs_central_meters=2.0, sh_central_meters=1.0, sh_low_meters=0.5))
    assert len(prep.clean_fdhi(df)) == 3
    assert len(prep.clean_fdhi(df, deduplicate=True)) == 1


def test_clean_fdhi_drops_rows_positive_in_no_measure():
    df = _frame(_row(vs_central_meters=-999.0))  # all six now non-positive
    assert prep.clean_fdhi(df).empty


@pytest.mark.parametrize(
    "fzw,kept",
    [(-999.0, False), (0.0, False), (0.1, True), (49.9, True), (50.0, False), (75.0, False)],
)
def test_clean_fdhi_fzw_window_is_exclusive_at_both_ends(fzw, kept):
    df = _frame(_row(fzw_central_meters=fzw))
    assert (len(prep.clean_fdhi(df)) == 1) is kept


@pytest.mark.parametrize(
    "flag,kept", [("Keep", True), ("Check", True), ("Discard", False), ("", False)]
)
def test_clean_fdhi_usage_flag_filter(flag, kept):
    df = _frame(_row(recommended_net_preferred_usage_flag=flag))
    assert (len(prep.clean_fdhi(df)) == 1) is kept


def test_clean_fdhi_does_not_filter_on_rupture_rank():
    """The prior owner dropped the notebook's `rupture_rank == 'Principal'`
    filter; re-adding it would silently shrink Dashboard 1's overlay."""
    df = _frame(_row(rupture_rank="Secondary"), _row(rupture_rank="Principal"))
    assert len(prep.clean_fdhi(df)) == 2


# --------------------------------------------------------------------------
# fdhi_measurements — the Dashboard-3 per-event base table
# --------------------------------------------------------------------------


def test_clean_fdhi_reproduces_the_shipped_pre_cleaned_csv():
    """The load-bearing check on `clean_fdhi` being a faithful port: run it
    over the raw flatfile and it must reproduce the prior owner's shipped
    `FDHI_Cleaned_Measurements.csv` row-for-row. Both inputs are gitignored,
    so this skips where they're absent.
    """
    flatfile = io.find_fdhi_flatfile()
    if flatfile is None:
        pytest.skip("raw FDHI flatfile not in data/raw/")
    try:
        shipped = io.load_fdhi()
    except FileNotFoundError:
        pytest.skip("FDHI_Cleaned_Measurements.csv not in data/raw/")

    ours = prep.clean_fdhi(io.load_fdhi_flatfile(flatfile))
    assert len(ours) == len(shipped)
    # same rows, same multiplicity (the chain's duplicates are deliberate)
    assert sorted(ours["index"]) == sorted(shipped["index"])
    # the shipped CSV carries two extra scratch columns the flatfile lacks
    assert set(shipped.columns) - set(ours.columns) == {"convert", "slip"}
    assert set(ours.columns) - set(shipped.columns) == set()


def test_fdhi_measurements_keeps_only_reverse_styles():
    df = _frame(_row(style="Reverse"), _row(style="Normal"), _row(style="Strike-Slip"))
    assert set(prep.fdhi_measurements(df)["style"]) == {"Reverse"}


def test_fdhi_measurements_nulls_the_sentinel_in_numeric_columns():
    df = _frame(_row(vs_low_meters=-999.0, vs_central_meters=2.0))
    out = prep.fdhi_measurements(df)
    assert out["vs_low_meters"].isna().all()
    assert out["vs_central_meters"].tolist() == [2.0]


def test_fdhi_measurements_applies_no_row_filters_beyond_style():
    """Positivity / window / flag filters belong to the charts, not here —
    otherwise the per-event boxplots would silently lose measurements."""
    df = _frame(
        _row(fzw_central_meters=100.0, recommended_net_preferred_usage_flag="Discard"),
        _row(vs_central_meters=-999.0),
    )
    assert len(prep.fdhi_measurements(df)) == 2


def test_fdhi_measurements_leaves_string_sentinels_alone():
    """Only numeric columns are masked — a '-999' string stays as-is."""
    df = _frame(_row(originator_id="-999"))
    assert prep.fdhi_measurements(df)["originator_id"].tolist() == ["-999"]


def test_fdhi_measurements_upcasts_int_columns_carrying_the_sentinel():
    """Masking an int column introduces NaN, so pandas upcasts it to float.
    That is what makes Parquet store these as nullable doubles — and why
    `fdhi_measurements`' Glue schema types ~18 columns differently from
    `fdhi_cleaned`'s. The input frame is left untouched."""
    df = _frame(_row(obs_year=-999), _row(obs_year=2008))
    assert df["obs_year"].dtype == "int64"

    out = prep.fdhi_measurements(df)
    assert out["obs_year"].dtype == "float64"
    assert out["obs_year"].isna().sum() == 1
    assert df["obs_year"].tolist() == [-999, 2008]  # caller's frame intact
