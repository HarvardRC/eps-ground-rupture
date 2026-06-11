"""Command-line entry point: `poetry run egr-build`.

Reads raw inputs from `data/raw/`, writes Parquet tables to
`data/processed/<table>/data.parquet`, and emits DDL scripts under
`dashboards/sql/` for both production (Athena over S3) and development
(Spark Thrift over local filesystem).

No cleaning step today — every input arrives in a state we ship directly.
See repo-root TODO.md for the FDHI raw-flatfile + cleaning revisit.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from . import io, register, views
from .config import PROCESSED_DIR, REPO_ROOT
from .export import export_tidy

DEFAULT_DATABASE = "eps_ground_rapture"
# Matches the Terraform bucket layout: s3://<bucket>/processed/<table>/.
# For a Terraform-provisioned env, invoke e.g.:
#   egr-build --database eps_ground_rapture_dev --s3-prefix s3://eps-ground-rapture-dev/processed/
DEFAULT_S3_PREFIX = "s3://CHANGE_ME/processed/"
SQL_OUT_DIR = REPO_ROOT / "dashboards" / "sql"
TERRAFORM_TABLES_JSON = REPO_ROOT / "deploy" / "terraform" / "tables.json"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Build Parquet tables and DDL for dashboards.")
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
    for name, loader in (
        ("dem", io.load_dem),
        ("fdhi_cleaned", io.load_fdhi),
        ("sure", io.load_sure),
        ("kern_combined", io.load_kern_combined),
    ):
        path = export_tidy(loader(), name)
        tables.append(register.Table(name=name, location=path))
        print(f"{name} -> {path}/data.parquet")

    _write_sql_scripts(tables, database=args.database, s3_prefix=args.s3_prefix)

    register.write_tables_json(tables, TERRAFORM_TABLES_JSON)
    print(f"terraform schema -> {_rel(TERRAFORM_TABLES_JSON)}")

    duckdb_path = views.build_duckdb_views()
    print(f"duckdb views -> {_rel(duckdb_path)}")
    print(f"  Tableau JDBC URL: {views.jdbc_url(duckdb_path)}")

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

    athena_views_path = SQL_OUT_DIR / "athena-views.sql"
    athena_views_path.write_text(views.athena_unified_view_sql())
    print(f"athena views -> {_rel(athena_views_path)}")


def _rel(path: Path) -> str:
    try:
        return str(path.relative_to(REPO_ROOT))
    except ValueError:
        return str(path)


if __name__ == "__main__":
    sys.exit(main())


# Re-export for tests / shells that want it.
__all__ = ["main", "PROCESSED_DIR", "SQL_OUT_DIR"]
