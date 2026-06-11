"""Build a DuckDB database of views over the Parquet outputs.

The `.duckdb` file is tiny — it contains only view definitions; the actual
rows stay in `data/processed/<table>/data.parquet`. Tableau connects to
this file via the DuckDB JDBC driver and sees five logical tables:

* `dem`            — the 2D DEM trial measurements
* `fdhi_cleaned`   — the prior owner's pre-cleaned FDHI extract
* `sure`           — the SURE database (surface-rupture observations)
* `kern_combined`  — the Buwalda / FDHI / SDC Kern County dataset
* `unified_observations` — the four above UNIONed with normalized columns

The unified view is what makes the cross-source DZW-vs-Scarp-Height
scatter natural in Tableau: every row has `source`, `dzw`,
`scarp_height`, plus source-specific labels (`scarp_class`, `eq_name`)
that downstream filters can pivot on. Latitude / longitude come along
where the source supplies them; for Kern (which has no per-measurement
location) we tag every row with the 1952 Kern County epicenter
(35.0° N, 118.9° W).
"""

from __future__ import annotations

from pathlib import Path

import duckdb

from .config import PROCESSED_DIR, REPO_ROOT

DEFAULT_DUCKDB_PATH = REPO_ROOT / "dashboards" / "duckdb" / "eps.duckdb"

# Kern County (1952 M 7.36) epicenter, per project owner. The Kern CSV holds
# no per-measurement location; we tag every Kern row with this point so it
# can be mapped alongside per-measurement FDHI/SURE points.
KERN_LATITUDE = 35.0
KERN_LONGITUDE = -118.9  # negative = west


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
        name: processed_dir / name / "data.parquet"
        for name in ("dem", "fdhi_cleaned", "sure", "kern_combined")
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
                f"SELECT * FROM read_parquet('{path}')"
            )

        # Kern's raw CSV has no per-row location. Attach the 1952 epicenter
        # as a separate view so map-style dashboards have something to plot.
        con.execute(
            f"""
            CREATE OR REPLACE VIEW kern_combined_geo AS
              SELECT *,
                     CAST({KERN_LATITUDE}  AS DOUBLE) AS latitude,
                     CAST({KERN_LONGITUDE} AS DOUBLE) AS longitude
              FROM read_parquet('{parquet_files['kern_combined']}')
            """
        )

        # Unified observation table. Each row: one (source, dzw, scarp_height) point
        # plus the labels each source happens to expose.
        con.execute(
            f"""
            CREATE OR REPLACE VIEW unified_observations AS
              SELECT
                'DEM'           AS source,
                "DZW"           AS dzw,
                "Scarp_Height"  AS scarp_height,
                "Scarp_Class"   AS scarp_class,
                NULL            AS eq_name,
                "Fault_Dip"     AS fault_dip,
                "Cohesion"      AS cohesion,
                "Set"           AS dem_set,
                CAST(NULL AS DOUBLE) AS latitude,
                CAST(NULL AS DOUBLE) AS longitude
              FROM read_parquet('{parquet_files['dem']}')
              WHERE "DZW" > 0 AND "Scarp_Height" > 0

              UNION ALL

              SELECT
                'FDHI'                  AS source,
                fzw_central_meters      AS dzw,
                vs_central_meters       AS scarp_height,
                NULL                    AS scarp_class,
                eq_name                 AS eq_name,
                NULL                    AS fault_dip,
                NULL                    AS cohesion,
                NULL                    AS dem_set,
                latitude_degrees        AS latitude,
                longitude_degrees       AS longitude
              FROM read_parquet('{parquet_files['fdhi_cleaned']}')
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
                NULL             AS fault_dip,
                NULL             AS cohesion,
                NULL             AS dem_set,
                "Latitude"       AS latitude,
                "Longitude"      AS longitude
              FROM read_parquet('{parquet_files['sure']}')
              WHERE "FNC" > 0 AND "SH" > 0

              UNION ALL

              SELECT
                'Kern'                   AS source,
                "DZW"                    AS dzw,
                "Vertical"               AS scarp_height,
                NULL                     AS scarp_class,
                'Kern County (1952)'     AS eq_name,
                NULL                     AS fault_dip,
                NULL                     AS cohesion,
                NULL                     AS dem_set,
                CAST({KERN_LATITUDE}  AS DOUBLE) AS latitude,
                CAST({KERN_LONGITUDE} AS DOUBLE) AS longitude
              FROM read_parquet('{parquet_files['kern_combined']}')
              WHERE "DZW" > 0 AND "Vertical" > 0
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
    against the **sanitized** Athena column names (ADR-0014) instead of
    the raw Parquet names. Emitted unqualified — run it with the target
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
        "       CAST(NULL AS varchar) AS eq_name, fault_dip, cohesion,\n"
        '       "set" AS dem_set,\n'
        "       CAST(NULL AS double) AS latitude, CAST(NULL AS double) AS longitude\n"
        "FROM dem WHERE dzw > 0 AND scarp_height > 0\n"
        "UNION ALL\n"
        "SELECT 'FDHI', fzw_central_meters, vs_central_meters, CAST(NULL AS varchar),\n"
        "       eq_name, CAST(NULL AS bigint), CAST(NULL AS varchar), CAST(NULL AS varchar),\n"
        "       latitude_degrees, longitude_degrees\n"
        "-- FDHI uses -999 as a missing-data sentinel; > 0 drops it.\n"
        "FROM fdhi_cleaned WHERE fzw_central_meters > 0 AND vs_central_meters > 0\n"
        "UNION ALL\n"
        "SELECT 'SURE', fnc, sh, CAST(NULL AS varchar),\n"
        "       eq_name, CAST(NULL AS bigint), CAST(NULL AS varchar), CAST(NULL AS varchar),\n"
        "       latitude, longitude\n"
        "FROM sure WHERE fnc > 0 AND sh > 0\n"
        "UNION ALL\n"
        f"SELECT 'Kern', dzw, vertical, CAST(NULL AS varchar),\n"
        "       'Kern County (1952)', CAST(NULL AS bigint), CAST(NULL AS varchar), CAST(NULL AS varchar),\n"
        f"       {KERN_LATITUDE}, {KERN_LONGITUDE}\n"
        "FROM kern_combined WHERE dzw > 0 AND vertical > 0;\n"
    )
