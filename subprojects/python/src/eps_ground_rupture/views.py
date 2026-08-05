"""Build a DuckDB database of views over the Parquet outputs.

The `.duckdb` file is tiny — it contains only view definitions; the actual
rows stay in `data/processed/<table>/data.parquet`. Tableau connects to
this file via the DuckDB JDBC driver and sees these logical tables:

* `dem`            — the 2D DEM trial measurements
* `fdhi_cleaned`   — the FDHI scatter-overlay subset (prior owner's chain)
* `fdhi_measurements` — reverse-style FDHI rows with sentinels nulled
                        (per-event boxplots; present only when the raw
                        flatfile has been downloaded — see TODO.md)
* `sure`           — the SURE database (surface-rupture observations)
* `sure_enriched`  — SURE + an event `magnitude` column (lookup-joined)
* `kern_combined`  — the Buwalda / FDHI / SDC Kern County dataset
* `kern_combined_geo` — `kern_combined` + the 1952 epicenter as lat/lon
* `unified_observations` — the sources UNIONed with normalized columns
* `dem_regression` — per-`Fault_Dip` OLS fit of `VD_HW ~ Slip`
* `dem_regression_lines` — two endpoint rows per dip, for drawing the fits
* `kern_inferred_slip` — Kern verticals back-projected through each fit

The unified view is what makes the cross-source DZW-vs-Scarp-Height
scatter natural in Tableau: every row has `source`, `dzw`,
`scarp_height`, plus source-specific labels (`scarp_class`, `eq_name`,
`magnitude`) that downstream filters can pivot on. Latitude / longitude
come along where the source supplies them; for Kern (which has no
per-measurement location) we tag every row with the 1952 Kern County
epicenter (35.0° N, 118.9° W).

Magnitude semantics: `magnitude` is the **event** magnitude — FDHI rows
carry it natively, Kern is the 1952 M 7.36 event, SURE rows get it from
`config.SURE_EVENT_MAGNITUDES` (the CSV has no magnitude column), and DEM
rows are NULL (model trials aren't earthquakes; the response-curve
"Magnitude" axis is a derived quantity, not an event property).
"""

from __future__ import annotations

from pathlib import Path

import duckdb

from .config import PROCESSED_DIR, REPO_ROOT, SURE_EVENT_MAGNITUDES

DEFAULT_DUCKDB_PATH = REPO_ROOT / "dashboards" / "duckdb" / "eps.duckdb"

# Kern County (1952 M 7.36) epicenter, per project owner. The Kern CSV holds
# no per-measurement location; we tag every Kern row with this point so it
# can be mapped alongside per-measurement FDHI/SURE points.
KERN_LATITUDE = 35.0
KERN_LONGITUDE = -118.9  # negative = west
KERN_MAGNITUDE = 7.36

#: Tables the views build requires — `egr-build` always emits these.
REQUIRED_TABLES: tuple[str, ...] = ("dem", "fdhi_cleaned", "sure", "kern_combined")

#: Tables that may be absent (their raw input is optional); a view is
#: created for each one whose Parquet exists, and skipped otherwise.
OPTIONAL_TABLES: tuple[str, ...] = ("fdhi_measurements",)


def _sql_literal(value: object) -> str:
    """A single-quoted SQL string literal, with embedded quotes doubled.

    Parquet paths are interpolated into DDL, so a repo checked out under a
    directory containing an apostrophe would otherwise emit unparseable SQL.
    """
    return "'" + str(value).replace("'", "''") + "'"


def require_view(con: duckdb.DuckDBPyConnection, view: str, source: object) -> None:
    """Raise ``ValueError`` if ``view`` isn't defined in the connected DB.

    Views for :data:`OPTIONAL_TABLES` exist only when their Parquet was
    found at view-build time, so a caller (a Gradle task, a Sheets target)
    can outlive the view. Callers already handle ``ValueError``; without
    this they'd surface a raw DuckDB ``CatalogException`` instead.
    """
    available = sorted(
        r[0] for r in con.execute(
            "SELECT table_name FROM information_schema.tables "
            "WHERE table_schema = 'main'"
        ).fetchall()
    )
    # DuckDB resolves identifiers case-insensitively; don't be stricter.
    if view.lower() not in {name.lower() for name in available}:
        raise ValueError(
            f"View {view!r} is not defined in {source}. "
            f"Available: {', '.join(available)}. "
            f"(Optional views need their raw input in data/raw/ at `egr-build` time.)"
        )


def _sure_magnitude_case(column: str) -> str:
    """A CASE expression mapping SURE `eq_name` values to event Mw.

    SURE.csv's `eq_name` values sometimes carry a stray trailing NBSP
    (U+00A0) — e.g. 'Tennant Creek\\xa0' — so the match normalizes NBSPs
    to spaces and trims before comparing. `replace`/`trim`/`chr` all
    exist in both DuckDB and Trino (Athena), so the same expression
    serves both engines. Events with no established magnitude are simply
    absent from the CASE and fall through to NULL.

    Event names are interpolated as SQL string literals, so any apostrophe
    is doubled — "L'Aquila" is a plausible future entry and would otherwise
    emit unparseable SQL into both eps.duckdb and dashboards/sql/.
    """
    whens = "\n".join(
        f"                  WHEN {_sql_literal(name)} THEN {mw}"
        for name, mw in SURE_EVENT_MAGNITUDES.items()
        if mw is not None
    )
    # CAST: bare decimal literals make the CASE a DECIMAL in DuckDB/Trino;
    # keep the column a plain double like every other magnitude source.
    return (
        f"CAST(CASE trim(replace({column}, chr(160), ' '))\n"
        f"{whens}\n"
        f"                END AS DOUBLE)"
    )


def build_duckdb_views(
    *,
    processed_dir: Path | None = None,
    duckdb_path: Path | None = None,
) -> Path:
    """(Re)create the DuckDB file with one view per Parquet table + the
    `unified_observations` UNION view.

    Returns the absolute path of the written `.duckdb` file.

    Parquet paths embedded in the view definitions are **absolute**, so
    the file is portable across cwd changes but tied to this machine's
    layout — rebuild after moving the repo.
    """
    processed_dir = (processed_dir or PROCESSED_DIR).resolve()
    duckdb_path = (duckdb_path or DEFAULT_DUCKDB_PATH).resolve()
    duckdb_path.parent.mkdir(parents=True, exist_ok=True)
    # Start from a clean file — view DDL can't drop unknown columns mid-flight.
    if duckdb_path.exists():
        duckdb_path.unlink()

    parquet_files: dict[str, Path] = {
        name: processed_dir / name / "data.parquet" for name in REQUIRED_TABLES
    }
    missing = [name for name, path in parquet_files.items() if not path.is_file()]
    if missing:
        raise FileNotFoundError(
            f"Parquet inputs missing for view build: {missing}. "
            f"Run `poetry run egr-build` first."
        )

    con = duckdb.connect(str(duckdb_path))
    try:
        for name, path in parquet_files.items():
            con.execute(
                f"CREATE OR REPLACE VIEW {name} AS "
                f"SELECT * FROM read_parquet({_sql_literal(path)})"
            )

        # Optional tables: only viewable when their Parquet was built
        # (e.g. fdhi_measurements needs the raw FDHI flatfile).
        for name in OPTIONAL_TABLES:
            path = processed_dir / name / "data.parquet"
            if path.is_file():
                con.execute(
                    f"CREATE OR REPLACE VIEW {name} AS "
                    f"SELECT * FROM read_parquet({_sql_literal(path)})"
                )

        # SURE with the event magnitude joined in (SURE.csv itself has no
        # magnitude column). Dashboard 3's per-event SURE worksheets build
        # on this so "M 7.6 Chi-Chi"-style labels are possible.
        con.execute(
            f"""
            CREATE OR REPLACE VIEW sure_enriched AS
              SELECT *,
                     {_sure_magnitude_case("eq_name")} AS magnitude
              FROM read_parquet({_sql_literal(parquet_files['sure'])})
            """
        )

        # Kern's raw CSV has no per-row location. Attach the 1952 epicenter
        # as a separate view so map-style dashboards have something to plot.
        con.execute(
            f"""
            CREATE OR REPLACE VIEW kern_combined_geo AS
              SELECT *,
                     CAST({KERN_LATITUDE}  AS DOUBLE) AS latitude,
                     CAST({KERN_LONGITUDE} AS DOUBLE) AS longitude
              FROM read_parquet({_sql_literal(parquet_files['kern_combined'])})
            """
        )

        # Unified observation table. Each row: one (source, dzw, scarp_height)
        # point plus the labels each source happens to expose.
        con.execute(
            f"""
            CREATE OR REPLACE VIEW unified_observations AS
              SELECT
                'DEM'           AS source,
                "DZW"           AS dzw,
                "Scarp_Height"  AS scarp_height,
                "Scarp_Class"   AS scarp_class,
                NULL            AS eq_name,
                CAST(NULL AS DOUBLE) AS magnitude,
                "Fault_Dip"     AS fault_dip,
                "Cohesion"      AS cohesion,
                "Set"           AS dem_set,
                CAST(NULL AS DOUBLE) AS latitude,
                CAST(NULL AS DOUBLE) AS longitude
              FROM read_parquet({_sql_literal(parquet_files['dem'])})
              WHERE "DZW" > 0 AND "Scarp_Height" > 0

              UNION ALL

              SELECT
                'FDHI'                  AS source,
                fzw_central_meters      AS dzw,
                vs_central_meters       AS scarp_height,
                NULL                    AS scarp_class,
                eq_name                 AS eq_name,
                -- same -999 sentinel convention as the measures below
                CASE WHEN magnitude > 0 THEN magnitude END AS magnitude,
                NULL                    AS fault_dip,
                NULL                    AS cohesion,
                NULL                    AS dem_set,
                latitude_degrees        AS latitude,
                longitude_degrees       AS longitude
              FROM read_parquet({_sql_literal(parquet_files['fdhi_cleaned'])})
              -- FDHI uses -999 as a missing-data sentinel; `> 0` filters
              -- those out alongside actual nulls.
              WHERE fzw_central_meters > 0 AND vs_central_meters > 0

              UNION ALL

              SELECT
                'SURE'           AS source,
                "FNC"            AS dzw,
                "SH"             AS scarp_height,
                NULL             AS scarp_class,
                eq_name          AS eq_name,
                {_sure_magnitude_case("eq_name")} AS magnitude,
                NULL             AS fault_dip,
                NULL             AS cohesion,
                NULL             AS dem_set,
                "Latitude"       AS latitude,
                "Longitude"      AS longitude
              FROM read_parquet({_sql_literal(parquet_files['sure'])})
              WHERE "FNC" > 0 AND "SH" > 0

              UNION ALL

              SELECT
                'Kern'                   AS source,
                "DZW"                    AS dzw,
                "Vertical"               AS scarp_height,
                NULL                     AS scarp_class,
                'Kern County (1952)'     AS eq_name,
                CAST({KERN_MAGNITUDE} AS DOUBLE) AS magnitude,
                NULL                     AS fault_dip,
                NULL                     AS cohesion,
                NULL                     AS dem_set,
                CAST({KERN_LATITUDE}  AS DOUBLE) AS latitude,
                CAST({KERN_LONGITUDE} AS DOUBLE) AS longitude
              FROM read_parquet({_sql_literal(parquet_files['kern_combined'])})
              WHERE "DZW" > 0 AND "Vertical" > 0
            """
        )

        # ------------------------------------------------------------------
        # Dashboard 4 — regression and inference (paper Fig. 14 / Equation 2)
        # ------------------------------------------------------------------
        # Ordinary least squares of vertical displacement on slip, one fit per
        # fault dip. No Set/Cohesion subsetting — the whole dip subset is
        # fitted, as the legacy notebook does; rows with a null in either axis
        # drop out, matching pandas' NaN handling there.
        # DuckDB's regr_* take (y, x) — y first.
        #
        # The slopes come out ≈ sin(dip), which is Equation 2's physical
        # content: the vertical component of slip on a dipping fault. Left as
        # a comment rather than an assertion — it is a property of the data,
        # not a constraint the pipeline should impose.
        con.execute(
            f"""
            CREATE OR REPLACE VIEW dem_regression AS
              SELECT "Fault_Dip"                     AS fault_dip,
                     COUNT(*)                        AS n,
                     regr_slope("VD_HW", "Slip")     AS slope,
                     regr_intercept("VD_HW", "Slip") AS intercept,
                     regr_r2("VD_HW", "Slip")        AS r2
              FROM read_parquet({_sql_literal(parquet_files['dem'])})
              WHERE "Slip" IS NOT NULL AND "VD_HW" IS NOT NULL
              GROUP BY 1
              ORDER BY 1
            """
        )

        # Two endpoint rows per dip, spanning that dip's own Slip range, so
        # Tableau can draw the fit fan as line marks straight from data.
        # Chosen over Tableau's native per-colour trend lines, which
        # recompute client-side and so cannot be pinned by tests.
        con.execute(
            f"""
            CREATE OR REPLACE VIEW dem_regression_lines AS
              WITH bounds AS (
                SELECT "Fault_Dip"  AS fault_dip,
                       MIN("Slip")  AS slip_min,
                       MAX("Slip")  AS slip_max
                FROM read_parquet({_sql_literal(parquet_files['dem'])})
                WHERE "Slip" IS NOT NULL AND "VD_HW" IS NOT NULL
                GROUP BY 1
              )
              SELECT r.fault_dip,
                     p.point_order,
                     CASE p.point_order WHEN 0 THEN b.slip_min ELSE b.slip_max END AS slip,
                     r.slope * (CASE p.point_order WHEN 0 THEN b.slip_min ELSE b.slip_max END)
                       + r.intercept AS vdhw_hat
              FROM dem_regression r
              JOIN bounds b USING (fault_dip)
              CROSS JOIN (SELECT 0 AS point_order UNION ALL SELECT 1) p
              ORDER BY r.fault_dip, p.point_order
            """
        )

        # Back-projection: invert each fit to ask what slip would have
        # produced Kern County's measured vertical displacements. Every dip is
        # emitted; the dashboard defaults to 30 (the notebook's choice) and
        # can expose the rest as a parameter.
        con.execute(
            f"""
            CREATE OR REPLACE VIEW kern_inferred_slip AS
              SELECT k."Location ID"                       AS location_id,
                     k."Vertical"                          AS vertical,
                     r.fault_dip,
                     (k."Vertical" - r.intercept) / r.slope AS inferred_slip
              FROM read_parquet({_sql_literal(parquet_files['kern_combined'])}) k
              CROSS JOIN dem_regression r
              WHERE k."Vertical" IS NOT NULL
              ORDER BY r.fault_dip, k."Location ID"
            """
        )
    finally:
        con.close()

    return duckdb_path


def jdbc_url(duckdb_path: Path | None = None) -> str:
    """Return the JDBC URL Tableau should connect to."""
    path = (duckdb_path or DEFAULT_DUCKDB_PATH).resolve()
    return f"jdbc:duckdb:{path}"


def athena_unified_view_sql() -> str:
    """Athena (Trino) twin of the DuckDB `unified_observations` view.

    Same output columns and filters as `build_duckdb_views`, but written
    against the **sanitized** Athena column names (`docs/adr/dead-ends.md`,
    AWS lane) instead of the raw Parquet names. Emitted unqualified — run
    it with the target
    database (`eps_ground_rapture_<env>`) selected as the query context,
    so one script serves both envs. Note `"set"` is double-quoted: it is
    a reserved word, and Trino-style views use double quotes, not the
    backticks of Hive DDL.
    """
    return (
        "-- Run with the target database selected (eps_ground_rapture_dev|prod).\n"
        "-- Generated by egr-build; mirrors the DuckDB unified_observations view.\n"
        "CREATE OR REPLACE VIEW unified_observations AS\n"
        "SELECT 'DEM' AS source, dzw, scarp_height, scarp_class,\n"
        "       CAST(NULL AS varchar) AS eq_name, CAST(NULL AS double) AS magnitude,\n"
        "       fault_dip, cohesion,\n"
        '       "set" AS dem_set,\n'
        "       CAST(NULL AS double) AS latitude, CAST(NULL AS double) AS longitude\n"
        "FROM dem WHERE dzw > 0 AND scarp_height > 0\n"
        "UNION ALL\n"
        "SELECT 'FDHI', fzw_central_meters, vs_central_meters, CAST(NULL AS varchar),\n"
        "       eq_name, CASE WHEN magnitude > 0 THEN magnitude END,\n"
        "       CAST(NULL AS bigint), CAST(NULL AS varchar), CAST(NULL AS varchar),\n"
        "       latitude_degrees, longitude_degrees\n"
        "-- FDHI uses -999 as a missing-data sentinel; > 0 drops it.\n"
        "FROM fdhi_cleaned WHERE fzw_central_meters > 0 AND vs_central_meters > 0\n"
        "UNION ALL\n"
        "SELECT 'SURE', fnc, sh, CAST(NULL AS varchar),\n"
        "       eq_name,\n"
        f"       {_sure_magnitude_case('eq_name')},\n"
        "       CAST(NULL AS bigint), CAST(NULL AS varchar), CAST(NULL AS varchar),\n"
        "       latitude, longitude\n"
        "FROM sure WHERE fnc > 0 AND sh > 0\n"
        "UNION ALL\n"
        f"SELECT 'Kern', dzw, vertical, CAST(NULL AS varchar),\n"
        f"       'Kern County (1952)', CAST({KERN_MAGNITUDE} AS double),\n"
        "       CAST(NULL AS bigint),\n"
        "       CAST(NULL AS varchar), CAST(NULL AS varchar),\n"
        f"       {KERN_LATITUDE}, {KERN_LONGITUDE}\n"
        "FROM kern_combined WHERE dzw > 0 AND vertical > 0;\n"
    )


def athena_sure_enriched_view_sql() -> str:
    """Athena (Trino) twin of the DuckDB `sure_enriched` view."""
    return (
        "-- SURE + event magnitude (SURE has no magnitude column of its own).\n"
        "CREATE OR REPLACE VIEW sure_enriched AS\n"
        "SELECT *,\n"
        f"       {_sure_magnitude_case('eq_name')} AS magnitude\n"
        "FROM sure;\n"
    )


def athena_dem_regression_view_sql() -> str:
    """Athena (Trino) twin of the DuckDB `dem_regression` view.

    Trino spells the regression aggregates `regr_slope` / `regr_intercept`
    like DuckDB, but has no `regr_r2` — the coefficient of determination is
    the square of `corr(y, x)`, which agrees with DuckDB's `regr_r2` exactly
    on this data. The two differ only where the response has zero variance:
    `regr_r2` special-cases that to 1.0, `power(corr(...), 2)` yields NaN.
    Not reachable here (every r² is ≈ 0.999), but worth knowing before
    reusing this against a degenerate group.
    """
    return (
        "-- Per-dip OLS fit of vertical displacement on slip (paper Eq. 2).\n"
        "-- Slopes come out ~ sin(dip): the vertical component of fault slip.\n"
        "CREATE OR REPLACE VIEW dem_regression AS\n"
        "SELECT fault_dip,\n"
        "       COUNT(*)                        AS n,\n"
        "       regr_slope(vd_hw, slip)         AS slope,\n"
        "       regr_intercept(vd_hw, slip)     AS intercept,\n"
        "       power(corr(vd_hw, slip), 2)     AS r2\n"
        "FROM dem\n"
        "WHERE slip IS NOT NULL AND vd_hw IS NOT NULL\n"
        "GROUP BY fault_dip;\n"
    )


def athena_dem_regression_lines_view_sql() -> str:
    """Athena (Trino) twin of the DuckDB `dem_regression_lines` view."""
    return (
        "-- Two endpoint rows per dip so a BI tool can draw the fit as a line.\n"
        "CREATE OR REPLACE VIEW dem_regression_lines AS\n"
        "WITH bounds AS (\n"
        "  SELECT fault_dip, MIN(slip) AS slip_min, MAX(slip) AS slip_max\n"
        "  FROM dem\n"
        "  WHERE slip IS NOT NULL AND vd_hw IS NOT NULL\n"
        "  GROUP BY fault_dip\n"
        ")\n"
        "SELECT r.fault_dip,\n"
        "       p.point_order,\n"
        "       IF(p.point_order = 0, b.slip_min, b.slip_max) AS slip,\n"
        "       r.slope * IF(p.point_order = 0, b.slip_min, b.slip_max)\n"
        "         + r.intercept AS vdhw_hat\n"
        "FROM dem_regression r\n"
        "JOIN bounds b ON b.fault_dip = r.fault_dip\n"
        "CROSS JOIN (SELECT 0 AS point_order UNION ALL SELECT 1) p;\n"
    )


def athena_kern_inferred_slip_view_sql() -> str:
    """Athena (Trino) twin of the DuckDB `kern_inferred_slip` view."""
    return (
        "-- Invert each per-dip fit: what slip would produce Kern's measured\n"
        "-- vertical displacement? Fig. 14 uses the dip-30 fit.\n"
        "CREATE OR REPLACE VIEW kern_inferred_slip AS\n"
        "SELECT k.location_id,\n"
        "       k.vertical,\n"
        "       r.fault_dip,\n"
        "       (k.vertical - r.intercept) / r.slope AS inferred_slip\n"
        "FROM kern_combined k\n"
        "CROSS JOIN dem_regression r\n"
        "WHERE k.vertical IS NOT NULL;\n"
    )
