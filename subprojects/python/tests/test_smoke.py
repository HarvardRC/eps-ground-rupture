"""Smoke tests: package imports, paths resolve, IO + export + DDL + views all work."""

from pathlib import Path

import duckdb
import pandas as pd
import pytest

from eps_ground_rupture import __version__, config, export, io, register, views


def test_version_present():
    assert __version__


def test_repo_paths_exist():
    assert config.REPO_ROOT.is_dir()
    assert config.DATA_DIR.is_dir()


def test_sure_loader_strips_bom_and_returns_frame():
    """The SURE CSV ships with a UTF-8 BOM on `IdE`; load_sure must strip it."""
    if not (config.RAW_DIR / "SURE.csv").is_file():
        pytest.skip("data/raw/SURE.csv not present in this checkout")
    df = io.load_sure()
    assert "IdE" in df.columns and "﻿IdE" not in df.columns
    # Columns the prior owner's script depends on for the overlay scatter.
    for col in ("eq_name", "FNC", "SH"):
        assert col in df.columns


def _sample_frame() -> pd.DataFrame:
    return pd.DataFrame(
        {
            "id": [1, 2, 3],
            "score": [0.1, 0.2, None],
            "label": ["a", "b", None],
        }
    )


def test_export_writes_dir_per_table(tmp_path: Path):
    out = export.export_tidy(_sample_frame(), "widgets", out_dir=tmp_path)
    assert out == tmp_path / "widgets"
    assert (out / "data.parquet").is_file()


def test_athena_ddl_emits_explicit_columns(tmp_path: Path):
    table_dir = export.export_tidy(_sample_frame(), "widgets", out_dir=tmp_path)
    ddl = register.athena_ddl(
        register.Table(name="widgets", location=table_dir),
        database="db",
        s3_location="s3://bucket/widgets/",
    )
    assert "CREATE EXTERNAL TABLE" in ddl
    assert "`widgets`" in ddl
    assert "`id` bigint" in ddl
    assert "`score` double" in ddl
    assert "`label` string" in ddl
    assert "s3://bucket/widgets/" in ddl
    assert "ParquetHiveSerDe" in ddl


def test_spark_ddl_infers_via_using_parquet(tmp_path: Path):
    table_dir = export.export_tidy(_sample_frame(), "widgets", out_dir=tmp_path)
    ddl = register.spark_ddl(register.Table(name="widgets", location=table_dir))
    assert "USING parquet" in ddl
    assert table_dir.resolve().as_uri() in ddl
    # Spark infers columns from Parquet — no explicit column list.
    assert "BIGINT" not in ddl


def test_athena_type_map_rejects_unknown():
    with pytest.raises(ValueError):
        register._athena_type("list<int32>")


def test_sanitize_column_real_world_names():
    cases = {
        "Trial": "trial",
        "Us - Ud": "us_ud",
        "DZW xmin": "dzw_xmin",
        "R^2 Value": "r_2_value",
        "SS_uc+": "ss_uc_plus",
        "SS_uc-": "ss_uc_minus",
        "Location ID": "location_id",
        "Comments.1": "comments_1",
        "fzw_central_meters": "fzw_central_meters",
    }
    for raw, expected in cases.items():
        assert register.sanitize_column(raw) == expected, raw


def test_sanitize_column_degenerate_names():
    assert register.sanitize_column("123abc") == "c_123abc"
    assert register.sanitize_column("---") == "col"


def test_tables_json_payload(tmp_path: Path):
    df = pd.DataFrame({"id": [1], "Us - Ud": [0.5], "SS_uc+": [1.0], "SS_uc-": [2.0]})
    table_dir = export.export_tidy(df, "widgets", out_dir=tmp_path)
    payload = register.glue_tables_payload([register.Table(name="widgets", location=table_dir)])
    cols = payload["widgets"]
    assert [c["name"] for c in cols] == ["id", "us_ud", "ss_uc_plus", "ss_uc_minus"]
    assert cols[0]["type"] == "bigint"
    assert cols[1]["type"] == "double"
    assert cols[1]["comment"] == "Parquet field: Us - Ud"

    out = register.write_tables_json(
        [register.Table(name="widgets", location=table_dir)], tmp_path / "tables.json"
    )
    import json

    assert json.loads(out.read_text())["widgets"][1]["name"] == "us_ud"


def test_sanitized_schema_dedup_never_collides(tmp_path: Path):
    """Suffix-dedup must probe against ALL emitted names: 'Comments',
    'Comments', 'Comments.2' would naively yield comments_2 twice."""
    df = pd.DataFrame([[1, 2, 3, 4]], columns=["Comments", "Comments", "Comments.2", "a_b_2"])
    # pandas would mangle duplicate column names on construction round-trips;
    # write via pyarrow directly to preserve the duplicate-name scenario.
    import pyarrow as pa
    import pyarrow.parquet as pq

    table_dir = tmp_path / "widgets"
    table_dir.mkdir()
    arr = pa.table(
        [pa.array([1]), pa.array([2]), pa.array([3]), pa.array([4])],
        names=["Comments", "Comments", "Comments.2", "a_b_2"],
    )
    pq.write_table(arr, table_dir / "data.parquet")

    cols = register._sanitized_schema(table_dir)
    names = [c["name"] for c in cols]
    assert len(names) == len(set(names)), names
    del df  # noqa: F841 — constructed only to document the naive shape


def test_athena_ddl_escapes_quotes_in_comments(tmp_path: Path):
    df = pd.DataFrame({"Observer's note": [1.0]})
    table_dir = export.export_tidy(df, "widgets", out_dir=tmp_path)
    ddl = register.athena_ddl(
        register.Table(name="widgets", location=table_dir),
        database="db",
        s3_location="s3://bucket/widgets/",
    )
    assert "Observer\\'s note" in ddl


def test_athena_ddl_uses_sanitized_names_and_index_access(tmp_path: Path):
    df = pd.DataFrame({"Us - Ud": [0.5]})
    table_dir = export.export_tidy(df, "widgets", out_dir=tmp_path)
    ddl = register.athena_ddl(
        register.Table(name="widgets", location=table_dir),
        database="db",
        s3_location="s3://bucket/widgets/",
    )
    assert "`us_ud` double" in ddl
    assert "Us - Ud` " not in ddl.replace("Parquet field: Us - Ud", "")
    assert "parquet.column.index.access" in ddl


def _views_fixture_frames() -> dict[str, pd.DataFrame]:
    # Slip / VD_HW are what the dem_regression views fit; they are part of the
    # real dem table, so the fixture carries them or those views fail to bind.
    dem = pd.DataFrame({"DZW": [1.0], "Scarp_Height": [0.5], "Scarp_Class": ["Simple"],
                        "Fault_Dip": [30], "Cohesion": ["R1"], "Set": ["Homogeneous"],
                        "Slip": [2.0], "VD_HW": [1.0]})
    # NB: the second FDHI row has valid measures but the -999
    # missing-magnitude sentinel — the unified view must null it.
    fdhi = pd.DataFrame({"fzw_central_meters": [10.0, 4.0],
                         "vs_central_meters": [2.0, 1.5],
                         "eq_name": ["Wenchuan", "Landers"],
                         "magnitude": [7.9, -999.0],
                         "latitude_degrees": [31.0, 34.2],
                         "longitude_degrees": [103.0, -116.4]})
    # NB: the trailing NBSP on the second eq_name is deliberate — SURE.csv
    # really contains 'Tennant Creek\xa0', and the magnitude lookup must
    # normalize it.
    sure = pd.DataFrame({"FNC": [5.0, 6.0], "SH": [1.0, 1.2],
                         "eq_name": ["Chi-Chi", "Tennant Creek\xa0"],
                         "Latitude": [23.8, -19.8], "Longitude": [120.8, 134.0]})
    # "Location ID" is used by kern_inferred_slip.
    kern = pd.DataFrame({"DZW": [3.0], "Vertical": [0.3], "Location ID": ["K-1"]})
    return {"dem": dem, "fdhi_cleaned": fdhi, "sure": sure, "kern_combined": kern}


def test_build_duckdb_views_creates_unified_view(tmp_path: Path):
    """Build Parquet tables and a DuckDB views file in an isolated tmp dir,
    then confirm the `unified_observations` view groups rows by source and
    carries per-source event magnitudes.
    """
    processed_dir = tmp_path / "processed"
    for name, df in _views_fixture_frames().items():
        export.export_tidy(df, name, out_dir=processed_dir)

    duckdb_path = views.build_duckdb_views(
        processed_dir=processed_dir,
        duckdb_path=tmp_path / "eps.duckdb",
    )
    assert duckdb_path.is_file()

    con = duckdb.connect(str(duckdb_path), read_only=True)
    try:
        rows = con.execute(
            "SELECT source, COUNT(*) AS n FROM unified_observations GROUP BY source ORDER BY source"
        ).fetchall()
        # Each source contributes the lat/lon we'd expect.
        geo = dict(con.execute(
            "SELECT source, MIN(latitude) FROM unified_observations GROUP BY source"
        ).fetchall())
        mags = dict(con.execute(
            "SELECT coalesce(eq_name, source), magnitude FROM unified_observations"
        ).fetchall())
    finally:
        con.close()
    assert rows == [("DEM", 1), ("FDHI", 2), ("Kern", 1), ("SURE", 2)]
    assert geo["DEM"] is None
    assert geo["FDHI"] == 31.0
    assert geo["SURE"] == -19.8  # MIN over the two SURE fixture rows
    assert geo["Kern"] == views.KERN_LATITUDE
    # Magnitude semantics: DEM rows have none; FDHI carries its own column;
    # SURE values come from the config lookup (NBSP-tolerant); Kern is 1952.
    assert mags["DEM"] is None
    assert mags["Wenchuan"] == 7.9
    assert mags["Landers"] is None  # -999 sentinel nulled, not passed through
    assert mags["Chi-Chi"] == 7.6
    assert mags["Tennant Creek\xa0"] == 6.6
    assert mags["Kern County (1952)"] == views.KERN_MAGNITUDE


def test_build_duckdb_views_handles_apostrophe_in_path(tmp_path: Path):
    """Parquet paths are interpolated into DDL, so a checkout under e.g.
    `/Users/o'brien/...` must not produce unparseable SQL."""
    processed_dir = tmp_path / "o'brien" / "processed"
    for name, df in _views_fixture_frames().items():
        export.export_tidy(df, name, out_dir=processed_dir)

    db = views.build_duckdb_views(
        processed_dir=processed_dir, duckdb_path=tmp_path / "eps.duckdb")
    con = duckdb.connect(str(db), read_only=True)
    try:
        assert con.execute("SELECT COUNT(*) FROM unified_observations").fetchone()[0] > 0
    finally:
        con.close()


def test_build_duckdb_views_optional_fdhi_measurements(tmp_path: Path):
    """The fdhi_measurements view exists exactly when its Parquet does."""
    processed_dir = tmp_path / "processed"
    for name, df in _views_fixture_frames().items():
        export.export_tidy(df, name, out_dir=processed_dir)

    def view_names(db: Path) -> set[str]:
        con = duckdb.connect(str(db), read_only=True)
        try:
            return {r[0] for r in con.execute(
                "SELECT view_name FROM duckdb_views() WHERE NOT internal"
            ).fetchall()}
        finally:
            con.close()

    without = views.build_duckdb_views(
        processed_dir=processed_dir, duckdb_path=tmp_path / "a.duckdb")
    assert "fdhi_measurements" not in view_names(without)

    export.export_tidy(
        pd.DataFrame({"eq_name": ["Wenchuan"], "sh_central_meters": [1.0]}),
        "fdhi_measurements", out_dir=processed_dir)
    with_it = views.build_duckdb_views(
        processed_dir=processed_dir, duckdb_path=tmp_path / "b.duckdb")
    assert "fdhi_measurements" in view_names(with_it)
    con = duckdb.connect(str(with_it), read_only=True)
    try:
        assert con.execute("SELECT COUNT(*) FROM fdhi_measurements").fetchone()[0] == 1
    finally:
        con.close()


def test_athena_unified_view_sql_shape():
    sql = views.athena_unified_view_sql()
    assert "CREATE OR REPLACE VIEW unified_observations" in sql
    # sanitized names, not the raw Parquet ones
    assert "fzw_central_meters" in sql and "Us - Ud" not in sql
    # reserved word double-quoted (Trino view, not Hive DDL backticks)
    assert '"set" AS dem_set' in sql and "`set`" not in sql
    # all four sources present, Kern pinned to its epicenter
    for token in ("'DEM'", "'FDHI'", "'SURE'", "'Kern'", str(views.KERN_LATITUDE)):
        assert token in sql
    # magnitude comes along: FDHI with its -999 sentinel nulled, SURE via
    # the NBSP-normalizing CASE lookup, Kern as the 1952 constant.
    assert "magnitude" in sql
    assert "CASE WHEN magnitude > 0 THEN magnitude END" in sql
    assert "chr(160)" in sql
    assert "WHEN 'Chi-Chi' THEN 7.6" in sql
    assert str(views.KERN_MAGNITUDE) in sql


def test_sure_magnitude_case_escapes_apostrophes(monkeypatch):
    """An event name with an apostrophe (e.g. L'Aquila) must not break the
    generated SQL — the literal is escaped by doubling the quote."""
    monkeypatch.setattr(
        views, "SURE_EVENT_MAGNITUDES", {"L'Aquila": 6.3, "Chi-Chi": 7.6}
    )
    case = views._sure_magnitude_case("eq_name")
    assert "WHEN 'L''Aquila' THEN 6.3" in case
    # and the result is still parseable SQL
    con = duckdb.connect()
    try:
        got = con.execute(
            f"SELECT {case} FROM (SELECT 'L''Aquila' AS eq_name)"
        ).fetchone()[0]
    finally:
        con.close()
    assert got == 6.3


def test_sure_magnitude_case_skips_unknowns():
    from eps_ground_rupture.config import SURE_EVENT_MAGNITUDES

    case = views._sure_magnitude_case("eq_name")
    for name, mw in SURE_EVENT_MAGNITUDES.items():
        if mw is None:
            assert f"'{name}'" not in case  # falls through to NULL
        else:
            assert f"WHEN '{name}' THEN {mw}" in case


def test_sure_event_magnitudes_fully_sourced_per_nurminen_2022():
    """Owner-confirmed against the SURE 2.0 data descriptor (Nurminen et al.
    2022, doi:10.1038/s41597-022-01835-z) on 2026-08-06: every SURE event
    carries a magnitude — nothing is awaiting verification — and the four
    values that changed in that confirmation are pinned so a stale copy of
    the table cannot creep back in.
    """
    from eps_ground_rupture.config import SURE_EVENT_MAGNITUDES

    assert all(mw is not None for mw in SURE_EVENT_MAGNITUDES.values())
    # The 2026-08-06 corrections: 5.8 → 5.7, 5.2 → 5.4, and the two
    # formerly-None events gaining values.
    assert SURE_EVENT_MAGNITUDES["Marryat Creek"] == 5.7
    assert SURE_EVENT_MAGNITUDES["Pukatja"] == 5.4
    assert SURE_EVENT_MAGNITUDES["Parina"] == 6.2
    assert SURE_EVENT_MAGNITUDES["Coalinga (Nuñez)"] == 5.4


def test_sure_enriched_view(tmp_path: Path):
    """`sure_enriched` keeps every SURE row and joins the magnitude in,
    tolerating the trailing-NBSP eq_name variants."""
    processed_dir = tmp_path / "processed"
    for name, df in _views_fixture_frames().items():
        export.export_tidy(df, name, out_dir=processed_dir)
    db = views.build_duckdb_views(
        processed_dir=processed_dir, duckdb_path=tmp_path / "eps.duckdb")

    con = duckdb.connect(str(db), read_only=True)
    try:
        got = dict(con.execute(
            "SELECT eq_name, magnitude FROM sure_enriched").fetchall())
    finally:
        con.close()
    assert got == {"Chi-Chi": 7.6, "Tennant Creek\xa0": 6.6}


def test_athena_sure_enriched_view_sql_shape():
    sql = views.athena_sure_enriched_view_sql()
    assert "CREATE OR REPLACE VIEW sure_enriched" in sql
    assert "FROM sure" in sql
    assert "chr(160)" in sql and "WHEN 'Chi-Chi' THEN 7.6" in sql


def test_jdbc_url_shape(tmp_path: Path):
    target = tmp_path / "eps.duckdb"
    url = views.jdbc_url(target)
    assert url.startswith("jdbc:duckdb:/")
    assert url.endswith("eps.duckdb")
