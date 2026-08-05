"""Command-line entry point: `poetry run egr-build`.

Reads raw inputs from `data/raw/`, writes Parquet tables to
`data/processed/<table>/data.parquet`, and emits DDL scripts under
`dashboards/sql/` for both production (Athena over S3) and development
(Spark Thrift over local filesystem).

FDHI is the one input with a cleaning step: both `fdhi_cleaned` (scatter
subset, prior owner's chain) and `fdhi_measurements` (per-event statistics
base) are derived in-pipeline from the raw UCLA flatfile (see
`io.FDHI_FLATFILE_GLOB`).

Every raw input is required. `data/raw/` is gitignored, so the build checks
for all of them up front and exits 2 with one message naming what's missing
rather than writing a partial, self-inconsistent set of artifacts.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from . import io, prep, register, views
from .config import PROCESSED_DIR, REPO_ROOT
from .export import export_tidy

# NB: the Glue/Athena schema name keeps the original (pre-rename) spelling —
# it matches AWS resources provisioned under the old repo name. Rename it only
# as part of an AWS-lane revival (Terraform + desktop workbooks together).
DEFAULT_DATABASE = "eps_ground_rapture"
# Matches the Terraform bucket layout: s3://<bucket>/processed/<table>/.
# For a Terraform-provisioned env, invoke e.g.:
#   egr-build --database eps_ground_rapture_dev --s3-prefix s3://eps-ground-rapture-dev/processed/
DEFAULT_S3_PREFIX = "s3://CHANGE_ME/processed/"
SQL_OUT_DIR = REPO_ROOT / "dashboards" / "sql"
TERRAFORM_TABLES_JSON = REPO_ROOT / "deploy" / "terraform" / "tables.json"
SHEETS_TARGETS_YAML = REPO_ROOT / "dashboards" / "sheets" / "targets.yaml"


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

    # Fail fast, before anything is written: an incomplete input set would
    # otherwise rewrite generated artifacts (including the tracked
    # deploy/terraform/tables.json) partway through, leaving them describing
    # different things.
    try:
        io.require_raw_inputs()
    except FileNotFoundError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2

    flatfile = io.find_fdhi_flatfile()
    raw_fdhi = io.load_fdhi_flatfile(flatfile)
    frames = [
        ("dem", io.load_dem()),
        ("fdhi_cleaned", prep.clean_fdhi(raw_fdhi)),
        ("fdhi_measurements", prep.fdhi_measurements(raw_fdhi)),
    ]
    print(f"fdhi source: {flatfile.name} (raw flatfile, cleaned in-pipeline)")
    frames.append(("sure", io.load_sure()))
    frames.append(("kern_combined", io.load_kern_combined()))

    tables: list[register.Table] = []
    for name, df in frames:
        path = export_tidy(df, name)
        tables.append(register.Table(name=name, location=path))
        print(f"{name} -> {path}/data.parquet")

    _warn_stale_tables({name for name, _ in frames})

    _write_sql_scripts(tables, database=args.database, s3_prefix=args.s3_prefix)

    register.write_tables_json(tables, TERRAFORM_TABLES_JSON)
    print(f"terraform schema -> {_rel(TERRAFORM_TABLES_JSON)}")

    duckdb_path = views.build_duckdb_views()
    print(f"duckdb views -> {_rel(duckdb_path)}")
    print(f"  Tableau JDBC URL: {views.jdbc_url(duckdb_path)}")

    return 0


def _warn_stale_tables(built: set[str]) -> None:
    """Flag processed tables this run did not rebuild.

    `export_tidy` only writes; it never removes. So a table that drops out of
    the build — `fdhi_measurements` when the raw flatfile is gone, say —
    leaves its Parquet behind, and `views.build_duckdb_views` keeps serving
    it: silently stale data sitting next to freshly built neighbors.
    """
    if not PROCESSED_DIR.is_dir():
        return
    stale = sorted(
        p.name
        for p in PROCESSED_DIR.iterdir()
        if p.is_dir() and (p / "data.parquet").is_file() and p.name not in built
    )
    if not stale:
        return
    print(
        f"warning: {len(stale)} processed table(s) not rebuilt by this run: "
        f"{', '.join(stale)}\n"
        "         they are stale relative to the rest but still back views in "
        "eps.duckdb.\n"
        "         Remove with: rm -rf "
        + " ".join(f"{_rel(PROCESSED_DIR)}/{name}" for name in stale),
        file=sys.stderr,
    )


def _write_sql_scripts(tables: list[register.Table], *, database: str, s3_prefix: str) -> None:
    SQL_OUT_DIR.mkdir(parents=True, exist_ok=True)

    athena_path = SQL_OUT_DIR / "athena.sql"
    athena_path.write_text(register.athena_script(tables, database=database, s3_prefix=s3_prefix))
    print(f"athena DDL -> {_rel(athena_path)}")

    spark_path = SQL_OUT_DIR / "spark-thrift.sql"
    spark_path.write_text(register.spark_script(tables, database=database))
    print(f"spark-thrift DDL -> {_rel(spark_path)}")

    athena_views_path = SQL_OUT_DIR / "athena-views.sql"
    athena_views_path.write_text(
        "\n".join(
            (
                views.athena_unified_view_sql(),
                views.athena_sure_enriched_view_sql(),
                views.athena_dem_regression_view_sql(),
                views.athena_dem_regression_lines_view_sql(),
                views.athena_kern_inferred_slip_view_sql(),
            )
        )
    )
    print(f"athena views -> {_rel(athena_views_path)}")


def _rel(path: Path) -> str:
    try:
        return str(path.relative_to(REPO_ROOT))
    except ValueError:
        return str(path)


# --------------------------------------------------------------------------
# egr-push-sheets — push DuckDB views to Google Sheets for Tableau Public
# --------------------------------------------------------------------------

_SPREADSHEET_ID_PLACEHOLDER = "PUT_SPREADSHEET_ID_HERE"


def load_sheet_targets(path: Path) -> dict[str, dict[str, str]]:
    """Parse `targets.yaml` into `{view: {spreadsheet_id, worksheet}}`.

    Accepts either a top-level `targets:` mapping or a bare mapping. The
    `worksheet` key defaults to the view name when omitted.
    """
    import yaml

    if not path.is_file():
        raise FileNotFoundError(
            f"Sheets targets file not found: {path}. " f"See dashboards/sheets/README.md."
        )
    data = yaml.safe_load(path.read_text()) or {}
    raw = data.get("targets", data) if isinstance(data, dict) else {}
    if not isinstance(raw, dict) or not raw:
        raise ValueError(f"No targets defined in {path}.")

    targets: dict[str, dict[str, str]] = {}
    for view, cfg in raw.items():
        if not isinstance(cfg, dict) or "spreadsheet_id" not in cfg:
            raise ValueError(
                f"Target {view!r} in {path} needs a 'spreadsheet_id' "
                f"(and optionally a 'worksheet')."
            )
        targets[view] = {
            "spreadsheet_id": str(cfg["spreadsheet_id"]),
            "worksheet": str(cfg.get("worksheet", view)),
        }
    return targets


def push_sheets_main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Push DuckDB views to Google Sheets so Tableau Public can auto-refresh.",
    )
    parser.add_argument(
        "--targets",
        default=str(SHEETS_TARGETS_YAML),
        help=f"targets.yaml mapping views to Sheets (default: {_rel(SHEETS_TARGETS_YAML)}).",
    )
    parser.add_argument(
        "--view",
        action="append",
        metavar="VIEW",
        help="Push only this view (repeatable); default: every target in the file.",
    )
    parser.add_argument(
        "--duckdb",
        default=None,
        help="Path to eps.duckdb (default: dashboards/duckdb/eps.duckdb).",
    )
    args = parser.parse_args(argv)

    # Lazy imports: keep `egr-build` from paying gspread's import cost.
    from . import sheets

    # Setup errors (missing creds, unreadable/empty targets file) should read
    # as a clean message + exit 2, not a traceback.
    try:
        targets = load_sheet_targets(Path(args.targets))
        if args.view:
            wanted = set(args.view)
            missing = wanted - set(targets)
            if missing:
                parser.error(f"--view not found in targets file: {sorted(missing)}")
            targets = {k: v for k, v in targets.items() if k in wanted}
        keyfile = sheets.resolve_keyfile()
    except (FileNotFoundError, ValueError, RuntimeError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2

    duckdb_path = Path(args.duckdb) if args.duckdb else views.DEFAULT_DUCKDB_PATH

    failures = 0
    for view, cfg in targets.items():
        sid = cfg["spreadsheet_id"]
        if not sid or sid == _SPREADSHEET_ID_PLACEHOLDER:
            print(
                f"FAILED {view}: spreadsheet_id is still the placeholder "
                f"({_SPREADSHEET_ID_PLACEHOLDER!r}); set the real ID in {args.targets}.",
                file=sys.stderr,
            )
            failures += 1
            continue
        try:
            result = sheets.push_view_to_sheet(
                view,
                sid,
                cfg["worksheet"],
                duckdb_path=duckdb_path,
                keyfile=keyfile,
            )
            print(
                f"pushed {result.view}: {result.rows:,} rows x {result.cols} cols "
                f"-> {result.url}"
            )
        except Exception as exc:  # noqa: BLE001 — report per-target, continue others
            print(f"FAILED {view}: {exc}", file=sys.stderr)
            failures += 1

    return 1 if failures else 0


# --------------------------------------------------------------------------
# egr-csv — export a DuckDB view to a CSV file
# --------------------------------------------------------------------------


def csv_main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Export a DuckDB view to a CSV file (e.g. the Drive-CSV fallback for `dem`).",
    )
    parser.add_argument(
        "--view",
        default="dem",
        help="View in eps.duckdb to export (default: dem).",
    )
    parser.add_argument(
        "--out",
        default=None,
        help="Output CSV path (default: dist/csv/<view>.csv).",
    )
    parser.add_argument(
        "--duckdb",
        default=None,
        help="Path to eps.duckdb (default: dashboards/duckdb/eps.duckdb).",
    )
    args = parser.parse_args(argv)

    from . import csvexport

    duckdb_path = Path(args.duckdb) if args.duckdb else views.DEFAULT_DUCKDB_PATH
    try:
        result = csvexport.view_to_csv(args.view, args.out, duckdb_path=duckdb_path)
    except (FileNotFoundError, ValueError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2
    print(f"wrote {result.view}: {result.rows:,} rows -> {_rel(result.path)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())


# Re-export for tests / shells that want it.
__all__ = [
    "main",
    "push_sheets_main",
    "csv_main",
    "load_sheet_targets",
    "PROCESSED_DIR",
    "SQL_OUT_DIR",
]
