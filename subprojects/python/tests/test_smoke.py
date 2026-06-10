"""Smoke tests: package imports, paths resolve, IO + export + DDL + views all work."""

from pathlib import Path

import duckdb
import pandas as pd
import pytest

from eps_ground_rapture import __version__, config, export, io, register, views


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
    assert "`id` BIGINT" in ddl
    assert "`score` DOUBLE" in ddl
    assert "`label` STRING" in ddl
    assert "s3://bucket/widgets/" in ddl
    assert "STORED AS PARQUET" in ddl


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


def test_build_duckdb_views_creates_unified_view(tmp_path: Path):
    """Build Parquet tables and a DuckDB views file in an isolated tmp dir,
    then confirm the `unified_observations` view groups rows by source.
    """
    processed_dir = tmp_path / "processed"
    dem = pd.DataFrame({"DZW": [1.0], "Scarp_Height": [0.5], "Scarp_Class": ["Simple"],
                        "Fault_Dip": [30], "Cohesion": ["R1"], "Set": ["Homogeneous"]})
    fdhi = pd.DataFrame({"fzw_central_meters": [10.0], "vs_central_meters": [2.0],
                         "eq_name": ["Wenchuan"],
                         "latitude_degrees": [31.0], "longitude_degrees": [103.0]})
    sure = pd.DataFrame({"FNC": [5.0], "SH": [1.0], "eq_name": ["Chi-Chi"],
                         "Latitude": [23.8], "Longitude": [120.8]})
    kern = pd.DataFrame({"DZW": [3.0], "Vertical": [0.3]})

    for name, df in (("dem", dem), ("fdhi_cleaned", fdhi), ("sure", sure), ("kern_combined", kern)):
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
            "SELECT source, latitude FROM unified_observations ORDER BY source"
        ).fetchall())
    finally:
        con.close()
    assert rows == [("DEM", 1), ("FDHI", 1), ("Kern", 1), ("SURE", 1)]
    assert geo["DEM"] is None
    assert geo["FDHI"] == 31.0
    assert geo["SURE"] == 23.8
    assert geo["Kern"] == views.KERN_LATITUDE


def test_jdbc_url_shape(tmp_path: Path):
    target = tmp_path / "eps.duckdb"
    url = views.jdbc_url(target)
    assert url.startswith("jdbc:duckdb:/")
    assert url.endswith("eps.duckdb")
