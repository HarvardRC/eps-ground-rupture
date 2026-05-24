"""Command-line entry point: `poetry run egr-build`.

Reads raw inputs from `data/raw/`, applies cleaning, writes Parquet tables
to `data/processed/<table>/data.parquet`, and emits DDL scripts under
`dashboards/sql/` for both production (Athena over S3) and development
(Spark Thrift over local filesystem).
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from . import io, prep, register
from .config import PROCESSED_DIR, REPO_ROOT
from .export import export_tidy

DEFAULT_DATABASE = "eps_ground_rapture"
DEFAULT_S3_PREFIX = "s3://CHANGE_ME/eps-ground-rapture/processed/"
SQL_OUT_DIR = REPO_ROOT / "dashboards" / "sql"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Build Parquet tables and DDL for dashboards.")
    parser.add_argument(
        "--skip-fdhi",
        action="store_true",
        help="Skip the FDHI cleaning step (use when the raw flatfile is absent).",
    )
    parser.add_argument(
        "--database",
        default=DEFAULT_DATABASE,
        help=f"Logical database/schema name (default: {DEFAULT_DATABASE}).",
    )
    parser.add_argument(
        "--s3-prefix",
        default=DEFAULT_S3_PREFIX,
        help=(
            "S3 prefix where Parquet will live in production; embedded in Athena DDL "
            f"(default: {DEFAULT_S3_PREFIX}). Per-table dirs are appended."
        ),
    )
    args = parser.parse_args(argv)

    tables: list[register.Table] = []

    dem_dir = export_tidy(io.load_dem(), "dem")
    tables.append(register.Table(name="dem", location=dem_dir))
    print(f"dem -> {dem_dir}/data.parquet")

    if not args.skip_fdhi:
        fdhi_dir = export_tidy(prep.clean_fdhi(io.load_fdhi()), "fdhi_cleaned")
        tables.append(register.Table(name="fdhi_cleaned", location=fdhi_dir))
        print(f"fdhi_cleaned -> {fdhi_dir}/data.parquet")

    _write_sql_scripts(tables, database=args.database, s3_prefix=args.s3_prefix)
    return 0


def _write_sql_scripts(
    tables: list[register.Table], *, database: str, s3_prefix: str
) -> None:
    SQL_OUT_DIR.mkdir(parents=True, exist_ok=True)

    athena_path = SQL_OUT_DIR / "athena.sql"
    athena_path.write_text(register.athena_script(tables, database=database, s3_prefix=s3_prefix))
    print(f"athena DDL -> {_rel(athena_path)}")

    spark_path = SQL_OUT_DIR / "spark-thrift.sql"
    spark_path.write_text(register.spark_script(tables, database=database))
    print(f"spark-thrift DDL -> {_rel(spark_path)}")


def _rel(path: Path) -> str:
    try:
        return str(path.relative_to(REPO_ROOT))
    except ValueError:
        return str(path)


if __name__ == "__main__":
    sys.exit(main())


# Re-export for tests / shells that want it.
__all__ = ["main", "PROCESSED_DIR", "SQL_OUT_DIR"]
