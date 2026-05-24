"""Write tidy datasets as Parquet, in the dir-per-table layout expected by
Athena (S3) and Spark Thrift (local fs).

Layout produced::

    data/processed/
        dem/
            data.parquet
        fdhi_cleaned/
            data.parquet

Both engines treat a directory of Parquet files as a single table — keeping
one file per dir makes future partitioning (e.g. by `Set` or `Fault_Dip`) a
non-breaking change.
"""

from __future__ import annotations

from pathlib import Path

import pandas as pd

from .config import PROCESSED_DIR


def _coerce_object_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Convert pandas `object` columns to pyarrow-friendly nullable strings.

    Mixed `str` + `NaN` object columns (e.g. the DEM dataset's `Cohesion`)
    break Arrow type inference; casting to pandas' `string` dtype yields a
    clean nullable Arrow `large_string` column.
    """
    out = df.copy()
    for col in out.select_dtypes(include=["object"]).columns:
        out[col] = out[col].astype("string")
    return out


def export_tidy(df: pd.DataFrame, name: str, out_dir: Path | None = None) -> Path:
    """Write `df` to `<out_dir>/<name>/data.parquet`.

    Returns the directory path (the "table location") — that's what both
    Athena DDL and Spark Thrift DDL reference, not the file inside.
    """
    out_dir = out_dir or PROCESSED_DIR
    table_dir = out_dir / name
    table_dir.mkdir(parents=True, exist_ok=True)

    parquet_path = table_dir / "data.parquet"
    _coerce_object_columns(df).to_parquet(parquet_path, index=False)
    return table_dir
