"""Smoke tests: package imports, paths resolve, prep + export + DDL all work."""

from pathlib import Path

import pandas as pd
import pytest

from eps_ground_rapture import __version__, config, export, prep, register


def test_version_present():
    assert __version__


def test_repo_paths_exist():
    assert config.REPO_ROOT.is_dir()
    assert config.DATA_DIR.is_dir()


def test_clean_fdhi_filters():
    df = pd.DataFrame(
        {
            "style": ["Reverse", "Strike-Slip", "Reverse-Oblique"],
            "rupture_rank": ["Principal", "Principal", "Secondary"],
            "vs_central_meters": [1.0, 1.0, 1.0],
            "vs_low_meters": [0.0, 0.0, 0.0],
            "vs_high_meters": [0.0, 0.0, 0.0],
            "sh_central_meters": [0.0, 0.0, 0.0],
            "sh_low_meters": [0.0, 0.0, 0.0],
            "sh_high_meters": [0.0, 0.0, 0.0],
            "fzw_central_meters": [10.0, 10.0, 10.0],
            "recommended_net_preferred_usage_flag": ["Keep", "Keep", "Keep"],
        }
    )
    out = prep.clean_fdhi(df)
    assert len(out) == 1
    assert out.iloc[0]["style"] == "Reverse"


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
