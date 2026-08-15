"""Tests for the Dashboard 5 `historic_events` view.

The view feeds the Fig-15-style reference-line overlays: one row per
FIELD MEASUREMENT (not per event) — nb2 draws one `axvline` per
measurement value, so the within-event spread is part of the figure.
These pins hold the row populations against the shipped raw data, so a
cleaning-chain change cannot silently move the lines the dashboard draws.

Same fixture discipline as `test_regression_views`: the views are rebuilt
from the Parquet into a temporary DuckDB file, so the tests exercise the
current `views.py` rather than whatever `eps.duckdb` was last built.
Skips where the processed Parquet is absent (raw inputs are gitignored),
and where `fdhi_measurements` is absent — the view requires the
raw-flatfile lane, exactly like that table.
"""

from __future__ import annotations

import duckdb
import pytest

from eps_ground_rupture import config, views

#: (source, rows) computed from the shipped raw data, 2026-08-15.
#: FDHI = flatfile 20220719 rows with either central measure > 0;
#: SURE = FNC > 0 (185) ∪ SH > 0 (74), overlap 56; Kern = DZW > 0 (11)
#: ∪ Vertical > 0 (16), overlap 6.
PINNED_SOURCE_ROWS = [
    ("FDHI", 2392),
    ("SURE", 203),
    ("Kern", 21),
]

#: The nb2 cell-25 labelled events that our two measures can support,
#: with their FDHI-arm row counts. (nb2 also labels Bohol, but Bohol has
#: no fzw/vs central values in the flatfile — its notebook lines came
#: from a measure outside this dashboard's two; deliberately absent.)
PINNED_FDHI_EVENTS = [
    ("Wenchuan", 250, 7.9),
    ("Kashmir", 140, 7.6),
    ("Killari", 3, 6.2),
]


def _fdhi_measurements_parquet():
    return config.PROCESSED_DIR / "fdhi_measurements" / "data.parquet"


@pytest.fixture(scope="module")
def con(tmp_path_factory):
    processed = config.PROCESSED_DIR
    missing = [t for t in views.REQUIRED_TABLES
               if not (processed / t / "data.parquet").is_file()]
    if missing:
        pytest.skip(f"processed Parquet missing {missing}; run egr-build")
    if not _fdhi_measurements_parquet().is_file():
        pytest.skip("fdhi_measurements Parquet missing; sync the raw FDHI "
                    "flatfile and run egr-build")

    db = views.build_duckdb_views(
        processed_dir=processed,
        duckdb_path=tmp_path_factory.mktemp("historic") / "eps.duckdb",
    )
    c = duckdb.connect(str(db), read_only=True)
    yield c
    c.close()


# --------------------------------------------------------------------------
# populations
# --------------------------------------------------------------------------


def test_historic_events_total_and_per_source_rows(con):
    total = con.execute("SELECT COUNT(*) FROM historic_events").fetchone()[0]
    assert total == sum(n for _, n in PINNED_SOURCE_ROWS)  # 2,616
    got = dict(con.execute(
        "SELECT source, COUNT(*) FROM historic_events GROUP BY 1").fetchall())
    assert got == dict(PINNED_SOURCE_ROWS)


def test_every_row_carries_at_least_one_positive_measure(con):
    bad = con.execute(
        """
        SELECT COUNT(*) FROM historic_events
        WHERE (dzw IS NULL AND scarp_height IS NULL)
           OR dzw <= 0 OR scarp_height <= 0
        """
    ).fetchone()[0]
    # NULL <= 0 is NULL, not TRUE, so the OR arms only catch real
    # non-positive values that slipped past the per-column CASE.
    assert bad == 0


@pytest.mark.parametrize("eq_name,rows,magnitude", PINNED_FDHI_EVENTS)
def test_fdhi_arm_carries_the_nb2_labelled_events(con, eq_name, rows, magnitude):
    got_rows, mags = con.execute(
        "SELECT COUNT(*), COUNT(DISTINCT magnitude) FROM historic_events "
        "WHERE source = 'FDHI' AND eq_name = ?", [eq_name]).fetchone()
    assert got_rows == rows
    assert mags == 1
    got_mag = con.execute(
        "SELECT DISTINCT magnitude FROM historic_events "
        "WHERE source = 'FDHI' AND eq_name = ?", [eq_name]).fetchone()[0]
    assert got_mag == pytest.approx(magnitude)


def test_kern_arm_matches_the_hand_compiled_dataset(con):
    n, n_dzw, n_sh, labels, mag = con.execute(
        """
        SELECT COUNT(*), COUNT(dzw), COUNT(scarp_height),
               COUNT(DISTINCT eq_name), MIN(magnitude)
        FROM historic_events WHERE source = 'Kern'
        """
    ).fetchone()
    assert (n, n_dzw, n_sh) == (21, 11, 16)
    assert labels == 1
    assert con.execute(
        "SELECT DISTINCT eq_name FROM historic_events WHERE source = 'Kern'"
    ).fetchone()[0] == "Kern County (1952)"
    assert mag == pytest.approx(views.KERN_MAGNITUDE)


def test_sure_arm_magnitudes_are_fully_sourced(con):
    """Every SURE event carries a Nurminen-sourced magnitude (config pin),
    so no SURE reference line can render unlabelled."""
    nulls = con.execute(
        "SELECT COUNT(*) FROM historic_events "
        "WHERE source = 'SURE' AND magnitude IS NULL").fetchone()[0]
    assert nulls == 0


# --------------------------------------------------------------------------
# optionality
# --------------------------------------------------------------------------


def test_view_is_skipped_without_the_flatfile_lane(tmp_path):
    """Symlink a processed dir holding only the required tables: the build
    must succeed and simply omit historic_events (and fdhi_measurements),
    mirroring the optional-table behaviour."""
    processed = config.PROCESSED_DIR
    slim = tmp_path / "processed"
    slim.mkdir()
    for t in views.REQUIRED_TABLES:
        src = processed / t
        if not (src / "data.parquet").is_file():
            pytest.skip(f"processed Parquet missing {t}; run egr-build")
        (slim / t).symlink_to(src, target_is_directory=True)

    db = views.build_duckdb_views(
        processed_dir=slim, duckdb_path=tmp_path / "slim.duckdb")
    c = duckdb.connect(str(db), read_only=True)
    try:
        names = {r[0].lower() for r in c.execute(
            "SELECT table_name FROM information_schema.tables "
            "WHERE table_schema = 'main'").fetchall()}
        assert "historic_events" not in names
        assert "fdhi_measurements" not in names
        with pytest.raises(ValueError, match="historic_events"):
            views.require_view(c, "historic_events", db)
    finally:
        c.close()


# --------------------------------------------------------------------------
# Athena twin
# --------------------------------------------------------------------------


def test_athena_twin_exists_and_uses_sanitized_names():
    sql = views.athena_historic_events_view_sql()
    assert "CREATE OR REPLACE VIEW historic_events" in sql
    # sanitized Athena names, not the quoted Parquet originals
    for quoted in ('"FNC"', '"SH"', '"DZW"', '"Vertical"'):
        assert quoted not in sql
    assert "FROM fdhi_measurements" in sql
    # per-column sentinel handling survives the translation
    assert "IF(fzw_central_meters > 0, fzw_central_meters)" in sql
    assert "IF(vertical > 0, vertical)" in sql


def test_athena_views_script_carries_the_twin():
    path = config.REPO_ROOT / "dashboards" / "sql" / "athena-views.sql"
    if not path.is_file():
        pytest.skip("athena-views.sql not generated; run egr-build")
    assert "CREATE OR REPLACE VIEW historic_events" in path.read_text()
