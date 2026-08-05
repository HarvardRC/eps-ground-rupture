"""Tests for the Dashboard 4 regression views.

These pin the fitted coefficients against the shipped `dem` data, so a
change in the cleaning chain or the fit cannot silently move the numbers
the dashboard (and the paper's Equation 2 comparison) rests on.

The fixture **rebuilds the views from the Parquet into a temporary DuckDB
file** rather than reading `dashboards/duckdb/eps.duckdb`. That matters: the
committed database is a build artifact, so testing it would validate
whatever was last built rather than the current `views.py` — a swapped
`regr_*` argument order would pass green until someone happened to re-run
`egr-build`. Tests skip where `data/processed` is absent, since the raw
inputs are gitignored.
"""

from __future__ import annotations

import duckdb
import pytest

from eps_ground_rapture import config, views

#: (fault_dip, n, slope, intercept) computed from the shipped dem data,
#: cross-checked against the legacy notebook's per-dip fits.
#:
#: Every slope lands within ~0.005 of sin(radians(dip)) — Equation 2's
#: physical content, the vertical component of slip on a dipping fault.
#: Deliberately *not* asserted: it is a property of the data, not a
#: constraint the pipeline should impose, and pinning it would make a
#: legitimate re-clean of the DEM set fail for the wrong reason.
PINNED = [
    (20, 49551, 0.3436, -0.0040),
    (30, 49453, 0.5021, -0.0051),
    (40, 49551, 0.6453, -0.0071),
    (45, 49251, 0.7103, -0.0103),
    (50, 49251, 0.7695, -0.0107),
    (60, 49551, 0.8703, -0.0125),
    (70, 49251, 0.9445, -0.0133),
]


@pytest.fixture(scope="module")
def con(tmp_path_factory):
    """Build the views fresh from the real Parquet, so these tests exercise
    `views.py` rather than a previously-built database."""
    processed = config.PROCESSED_DIR
    missing = [t for t in views.REQUIRED_TABLES
               if not (processed / t / "data.parquet").is_file()]
    if missing:
        pytest.skip(f"processed Parquet missing {missing}; run egr-build")

    db = views.build_duckdb_views(
        processed_dir=processed,
        duckdb_path=tmp_path_factory.mktemp("regression") / "eps.duckdb",
    )
    c = duckdb.connect(str(db), read_only=True)
    yield c
    c.close()


# --------------------------------------------------------------------------
# dem_regression
# --------------------------------------------------------------------------


def test_dem_regression_has_exactly_the_seven_modelled_dips(con):
    dips = [r[0] for r in con.execute(
        "SELECT fault_dip FROM dem_regression ORDER BY 1").fetchall()]
    assert dips == [d for d, _, _, _ in PINNED]


@pytest.mark.parametrize("dip,n,slope,intercept", PINNED)
def test_dem_regression_coefficients(con, dip, n, slope, intercept):
    got_n, got_slope, got_intercept, got_r2 = con.execute(
        "SELECT n, slope, intercept, r2 FROM dem_regression WHERE fault_dip = ?",
        [dip],
    ).fetchone()
    assert got_n == n
    assert got_slope == pytest.approx(slope, abs=0.001)
    assert got_intercept == pytest.approx(intercept, abs=0.001)
    assert got_r2 > 0.997


# --------------------------------------------------------------------------
# dem_regression_lines
# --------------------------------------------------------------------------


def test_dem_regression_lines_has_two_endpoints_per_dip(con):
    rows = con.execute(
        "SELECT fault_dip, COUNT(*), MIN(point_order), MAX(point_order) "
        "FROM dem_regression_lines GROUP BY 1 ORDER BY 1").fetchall()
    assert len(rows) == len(PINNED)
    assert con.execute("SELECT COUNT(*) FROM dem_regression_lines").fetchone()[0] == 14
    for _, count, lo, hi in rows:
        assert (count, lo, hi) == (2, 0, 1)


def test_dem_regression_lines_endpoints_lie_on_the_fit(con):
    """vdhw_hat must equal slope * slip + intercept for that dip."""
    bad = con.execute(
        """
        SELECT COUNT(*) FROM dem_regression_lines l
        JOIN dem_regression r USING (fault_dip)
        WHERE abs(l.vdhw_hat - (r.slope * l.slip + r.intercept)) > 1e-9
        """
    ).fetchone()[0]
    assert bad == 0


def test_dem_regression_lines_span_each_dips_own_slip_range(con):
    """point_order 0/1 are the min/max Slip actually observed at that dip,
    so the drawn segment never extrapolates beyond the data."""
    mismatched = con.execute(
        """
        WITH bounds AS (
          SELECT "Fault_Dip" AS fault_dip, MIN("Slip") AS lo, MAX("Slip") AS hi
          FROM dem WHERE "Slip" IS NOT NULL AND "VD_HW" IS NOT NULL GROUP BY 1
        )
        SELECT COUNT(*) FROM dem_regression_lines l JOIN bounds b USING (fault_dip)
        -- IS DISTINCT FROM, not <>: a NULL slip would make <> evaluate to
        -- NULL and go uncounted, letting a broken view pass.
        WHERE (l.point_order = 0 AND l.slip IS DISTINCT FROM b.lo)
           OR (l.point_order = 1 AND l.slip IS DISTINCT FROM b.hi)
        """
    ).fetchone()[0]
    assert mismatched == 0


# --------------------------------------------------------------------------
# kern_inferred_slip
# --------------------------------------------------------------------------


def test_kern_inferred_slip_is_every_vertical_by_every_dip(con):
    n_vertical = con.execute(
        'SELECT COUNT(*) FROM kern_combined WHERE "Vertical" IS NOT NULL').fetchone()[0]
    assert n_vertical == 16
    assert con.execute("SELECT COUNT(*) FROM kern_inferred_slip").fetchone()[0] == 112
    assert con.execute(
        "SELECT COUNT(DISTINCT fault_dip) FROM kern_inferred_slip").fetchone()[0] == 7
    assert con.execute(
        "SELECT COUNT(*) FROM kern_inferred_slip WHERE vertical IS NULL").fetchone()[0] == 0


def test_kern_inferred_slip_range_at_dip_30(con):
    """The notebook's Figure 14 case: Kern verticals back-projected through
    the dip-30 fit."""
    lo, hi = con.execute(
        "SELECT MIN(inferred_slip), MAX(inferred_slip) "
        "FROM kern_inferred_slip WHERE fault_dip = 30").fetchone()
    assert lo == pytest.approx(0.162, abs=0.01)
    assert hi == pytest.approx(2.742, abs=0.01)


def test_kern_inferred_slip_inverts_the_fit(con):
    """inferred_slip must satisfy vertical = slope * inferred_slip + intercept."""
    bad = con.execute(
        """
        SELECT COUNT(*) FROM kern_inferred_slip k
        JOIN dem_regression r USING (fault_dip)
        WHERE abs(k.vertical - (r.slope * k.inferred_slip + r.intercept)) > 1e-9
        """
    ).fetchone()[0]
    assert bad == 0


# --------------------------------------------------------------------------
# Athena twins
# --------------------------------------------------------------------------


def test_athena_twins_exist_for_each_regression_view():
    sqls = {
        "dem_regression": views.athena_dem_regression_view_sql(),
        "dem_regression_lines": views.athena_dem_regression_lines_view_sql(),
        "kern_inferred_slip": views.athena_kern_inferred_slip_view_sql(),
    }
    for name, sql in sqls.items():
        assert f"CREATE OR REPLACE VIEW {name}" in sql
        # sanitized Athena names (ADR-0014), not the quoted Parquet originals
        assert '"Fault_Dip"' not in sql and '"VD_HW"' not in sql
    # Trino has no regr_r2; the twin squares corr() instead
    assert "regr_r2" not in sqls["dem_regression"]
    assert "corr(vd_hw, slip)" in sqls["dem_regression"]
    # Argument ORDER is the easy silent error — regr_* take (y, x), so the
    # slope is d(vd_hw)/d(slip). corr() is symmetric and proves nothing here.
    assert "regr_slope(vd_hw, slip)" in sqls["dem_regression"]
    assert "regr_intercept(vd_hw, slip)" in sqls["dem_regression"]
    # ...and the same inversion direction as the DuckDB view.
    assert "(k.vertical - r.intercept) / r.slope" in sqls["kern_inferred_slip"]


def test_athena_twins_use_the_sanitized_names_terraform_declares():
    """The twins run against Glue tables whose columns are the sanitized
    names in tables.json — a typo would only surface at query time."""
    import json

    tables = json.loads(
        (config.REPO_ROOT / "deploy" / "terraform" / "tables.json").read_text())
    dem_cols = {c["name"] for c in tables["dem"]}
    kern_cols = {c["name"] for c in tables["kern_combined"]}
    assert {"fault_dip", "slip", "vd_hw"} <= dem_cols
    assert {"location_id", "vertical"} <= kern_cols


def test_athena_views_script_carries_every_twin():
    path = config.REPO_ROOT / "dashboards" / "sql" / "athena-views.sql"
    if not path.is_file():
        pytest.skip("athena-views.sql not generated; run egr-build")
    sql = path.read_text()
    for name in ("unified_observations", "sure_enriched", "dem_regression",
                 "dem_regression_lines", "kern_inferred_slip"):
        assert f"CREATE OR REPLACE VIEW {name}" in sql
