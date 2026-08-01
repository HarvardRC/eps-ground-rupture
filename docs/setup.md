# Project setup notes

A snapshot of what's been scaffolded, decisions taken, and where the work is
parked. Mirrors the conversation in `ai/inital-conversation.md` and the work
done on top of it.

## Goal

Turn the two legacy notebooks under `legacy/` into a productized, interactive
dashboard. Specifically:

- A **Python data pipeline** (modules + CLI; no notebooks) that reads raw
  measurements (DEM trials, FDHI flatfile, Kern County) and writes Parquet
  tables suitable for SQL query engines.
- **Dashboards in Tableau and Apache Superset** that consume those tables
  via SQL — Athena in production (Parquet on S3) and Spark Thrift Server
  in development (Parquet on the local filesystem).
- **No Python UI layer** (Dash/Streamlit) and **no notebooks** in this
  repo. Legacy `.ipynb` files stay under `legacy/` as reference artifacts.

## Decisions

Each row links to its own ADR under `docs/adr/`, which is the source of
truth (context, alternatives considered, consequences). This table is a
quick reference.

| ADR | Decision                                          | Choice |
|-----|---------------------------------------------------|--------|
| [0001](adr/0001-bi-platforms-tableau-and-superset.md) | Dashboard platforms              | Tableau **and** Apache Superset |
| [0002](adr/0002-no-notebooks-no-python-ui.md)         | UI surface                       | No notebooks, no Python UI — modules + CLI only |
| [0003](adr/0003-production-query-engine-athena.md)    | Production query engine          | AWS Athena over S3 Parquet (Glue catalog) |
| [0004](adr/0004-development-query-engine-spark-thrift.md) | Development query engine    | Apache Spark Thrift Server over local Parquet |
| [0005](adr/0005-embedded-sql-engine-duckdb.md)        | Embedded SQL engine              | DuckDB (for tests + CLI checks) |
| [0006](adr/0006-parquet-only-dir-per-table.md)        | Output format                    | Parquet only, dir-per-table layout |
| [0007](adr/0007-ddl-generation-in-python.md)          | DDL generation                   | Python-emitted scripts from pyarrow schema |
| [0008](adr/0008-python-toolchain-poetry.md)           | Python toolchain                 | Poetry |
| ~~[0009](adr/0009-repository-layout-src-python.md)~~  | ~~Repository layout~~            | ~~`src/python/` under language-agnostic `src/`~~ — superseded by 0013 |
| [0010](adr/0010-python-version-range.md)              | Python version range             | `>=3.11,<3.14` |
| [0011](adr/0011-postgres-not-warehouse.md)            | PostgreSQL as warehouse?         | No — engine-class mismatch with prod |
| [0012](adr/0012-plotting-libs-dev-only.md)            | Plotting libs                    | `matplotlib`/`seaborn` in `dev` group only |
| [0013](adr/0013-gradle-multi-project-subprojects-layout.md) | Repository layout          | Gradle multi-project; code modules under `subprojects/` |
| [0014](adr/0014-terraform-aws-data-deployment.md)     | AWS deployment                   | Terraform (S3 + Glue + Athena per env); sanitized Athena columns |

## Repository layout

```
# Project-level (root owns these)
README.md, LICENSE, .gitignore
ai/                          initial scoping conversation (gitignored, kept locally)
legacy/                      original notebooks + 2025 paper PDF (gitignored, kept locally)
data/
  raw/                       raw inputs (gitignored)
  interim/                   intermediate cleaning artifacts (gitignored)
  processed/<table>/         dir-per-table Parquet (gitignored)
                               e.g. data/processed/dem/data.parquet
dashboards/
  sql/                       generated CREATE TABLE scripts (gitignored)
    athena.sql                 prod DDL: external tables over `s3://.../<table>/`
    athena-views.sql           Athena/Trino twins of `unified_observations` + `sure_enriched`
    spark-thrift.sql           dev DDL: `USING parquet LOCATION 'file:///.../<table>/'`
  duckdb/eps.duckdb          DuckDB view definitions Tableau connects to (gitignored)
  sheets/                    Google Sheets push targets (targets.yaml + README)
  tableau/                   Tableau workbooks (.twb / .twbx)
  superset/                  Superset YAML exports
docs/                        this directory + adr/

# Gradle root — orchestrator only (ADR-0013)
settings.gradle.kts          lists subprojects
build.gradle.kts             cross-cutting tasks (currently just `base` plugin)

# Code modules — Gradle subprojects
subprojects/
  python/                    Poetry-managed pipeline package
    build.gradle.kts         thin Exec wrapper around Poetry
    pyproject.toml           Poetry config (ADR-0008)
    poetry.lock              committed lockfile
    src/                     Python "src-layout" (ADR-0013)
      eps_ground_rapture/
        config.py            repo-relative paths, categorical vocab, palettes
        io.py                DEM / FDHI / SURE / Kern CSV loaders
        prep.py              FDHI cleaning/filtering (clean_fdhi, fdhi_measurements)
        export.py            Parquet writer (Arrow type coercion, dir-per-table)
        register.py          Athena + Spark Thrift DDL generators
        views.py             DuckDB view definitions + Athena/Trino twins
        csvexport.py         view -> dist/csv/<view>.csv (`egr-csv`)
        sheets.py            view -> Google Sheets (`egr-push-sheets`)
        cli.py               `egr-build` / `egr-csv` / `egr-push-sheets` entry points
    tests/                   test_smoke.py, test_prep.py, test_raw_inputs.py,
                             test_csvexport.py, test_sheets.py
```

## Pipeline overview

```
data/raw/*.csv                              raw inputs (user-supplied)
        │
        ▼
eps_ground_rapture.io.load_*                typed loaders
        │
        ▼
eps_ground_rapture.prep.*                   filtering (e.g. clean_fdhi)
        │
        ▼
eps_ground_rapture.export.export_tidy       Parquet writer (dir-per-table)
        │
        ▼
data/processed/<table>/data.parquet         physical storage
        │
        ▼
eps_ground_rapture.register                 emits table schemas
        │
        ├──► dashboards/sql/athena.sql         ──► reference DDL (prod is Terraform-managed)
        ├──► dashboards/sql/spark-thrift.sql   ──► Spark Thrift (local) ──► Tableau Desktop / Superset
        └──► deploy/terraform/tables.json      ──► Terraform → Glue/Athena (ADR-0014; committed)

eps_ground_rapture.views                    emits view definitions
        │
        ├──► dashboards/duckdb/eps.duckdb      ──► DuckDB views ──► Tableau Desktop (first pass)
        └──► dashboards/sql/athena-views.sql   ──► Athena/Trino twins of `unified_observations`
                                                   and `sure_enriched` (the two the dashboards need)
```

Single CLI: `poetry run egr-build` writes the Parquet files and all five
schema/view artifacts above.

**Every raw input is required**, and the build checks for all of them before
writing anything: a missing file means exit 2 and one message naming what's
absent and where to get it, rather than a traceback partway through a run
that has already rewritten half the artifacts. (Only *presence* is checked —
an empty or malformed file still fails later, in the loader that reads it.)
There is deliberately no fallback to the pre-cleaned FDHI CSV: it yields a
`fdhi_cleaned` of a different shape and no `fdhi_measurements`, so a build
from it would leave the Parquet, the DDL and the Terraform schema
describing different things. `egr-build` also warns when a processed table
was not rebuilt this run — its Parquet lingers and still backs a view.

Flags:

- `--database <name>` — logical schema name in the DDL (default `eps_ground_rapture`).
- `--s3-prefix <uri>` — S3 prefix baked into the reference `athena.sql`
  (default placeholder `s3://CHANGE_ME/processed/`). To match a
  Terraform-provisioned env: `--database eps_ground_rapture_<env>
  --s3-prefix s3://eps-ground-rapture-<env>/processed/`.

## Ported logic so far

FDHI is the one input with cleaning logic in the pipeline. `prep.py`
holds `clean_fdhi` (the prior owner's filter chain, reproducing the
scatter-overlay subset that used to arrive as
`data/raw/FDHI_Cleaned_Measurements.csv`) and `fdhi_measurements` (the
reverse-style rows — the per-event statistics base — with the `-999`
sentinel nulled in numeric columns; string sentinels are left alone and
no row-level filters are applied, those being per-chart choices). Both
derive from the raw UCLA Dataverse flatfile, which the build requires.
The other inputs ship as-is. `tests/test_prep.py` pins both chains,
including a check that `clean_fdhi` reproduces the prior owner's shipped
`FDHI_Cleaned_Measurements.csv` row-for-row.

Everything else in the legacy notebooks is plotting code (matplotlib /
seaborn). That work belongs in Tableau/Superset, not in the Python
pipeline, so it has been deliberately not ported.

## What runs today

Verified end-to-end on 2026-08-01:

- `poetry install` from `subprojects/python/` — clean install on Python
  3.13.7 (Poetry 2.4.1). Note `poetry.toml` sets
  `virtualenvs.create = false`, so the project venv must already be
  **activated** before any bare `poetry` command; otherwise Poetry falls
  back to the system Python and fails. The Gradle tasks activate it for
  you — see the venv setup below, and `EGR_VENV` / `-Ppython.venv` to
  point them at a different location.
- `poetry run pytest` — **85/85** pass, covering the FDHI cleaning chains,
  Parquet export, Athena/Spark DDL generation, the DuckDB views
  (including event `magnitude` and the optional `fdhi_measurements`),
  CSV export, and the Sheets targets.
- `poetry run egr-build` — no flags needed; requires the raw FDHI flatfile
  in `data/raw/` and exits 2 if any raw input is missing. Produces:
  - `data/processed/<table>/data.parquet` for `dem`, `fdhi_cleaned`,
    `fdhi_measurements`, `sure`, `kern_combined`
  - `dashboards/sql/athena.sql`, `spark-thrift.sql`, `athena-views.sql`
  - `deploy/terraform/tables.json` and `dashboards/duckdb/eps.duckdb`
- `./gradlew :subprojects:python:pytest` — 85/85 pass via the Gradle
  orchestrator (Gradle 8.10.2 wrapper; verified on JDK 17, and nothing in
  the build pins a toolchain version).

## Issues encountered and fixed

1. **Poetry picked Python 3.14** by default, which has no pyarrow 18 wheel
   and triggered a from-source build that failed at `cmake`. Fixed by
   capping `python = ">=3.11,<3.14"` and running `poetry env use python3.13`.

2. **Arrow type inference failed on `Cohesion`** because the column mixes
   strings (`R1..R10`, `Q`, `S`, `A..M`) with NaN. Fixed in
   `export._coerce_object_columns`: cast every `object` column to pandas'
   nullable `string` dtype before writing Parquet.

3. **Pandas DtypeWarning on the same column** during CSV load. Fixed by
   passing `low_memory=False` to `pd.read_csv` in `io.load_dem` — the
   warning is a chunk-boundary inference artifact, not real data drift.

## Known gaps / open work

- ~~**FDHI is consumed pre-cleaned.**~~ Resolved 2026-07-31: the pipeline
  now cleans the raw UCLA flatfile in-process (`prep.clean_fdhi`,
  `prep.fdhi_measurements`) whenever it is in `data/raw/`, falling back to
  `FDHI_Cleaned_Measurements.csv` only when it is not.
- **Kern County loader is stubbed** (`io.load_kern_combined`) but no
  cleaning routine exists; the legacy notebook uses it mostly as-is. See
  `docs/datasets.md` for what the file is and how it's used.
- **Dashboards in progress.** `dem-model-vs-reality.twb` (Dashboard 1 +
  Viable Combinations) and `dem-response-curve.twb` (Dashboard 2) are
  shipped, each with a `-public` Tableau Public twin; Dashboard 3 is next.
  Superset exports still absent. See `notes/Roadmap.md`.
- **AWS deployment via Terraform** (`deploy/terraform/`, ADR-0014):
  S3 bucket + Glue database/tables + Athena workgroup per env (dev/prod).
  Not yet applied to the account.
- **Notebook 2 (`2Ddem 2025 Paper Revisions ...`)** has not been ported.
  Most of its filtering is by `Set ∈ {Homogeneous, Heterogeneous}` and
  `Cohesion` — both already columns in the DEM table, so the dashboards
  may not need additional Python prep here.

## Quickstart for a new contributor

```bash
git clone <repo>
cd eps-ground-rapture

# Put raw CSVs in data/raw/ — see data/README.md for the expected file list.
cp /path/to/DEM_dataset.csv data/raw/

# One-time: create the venv at the project convention location.
# /opt is root-owned on macOS — make the parent writable first:
sudo mkdir -p /opt/python/venvs && sudo chown "$(whoami)" /opt/python/venvs
python3.13 -m venv /opt/python/venvs/eps-ground-rapture
# (Or keep it elsewhere: EGR_VENV=/your/path, -Ppython.venv=/your/path, or
#  python.venv=/your/path in ~/.gradle/gradle.properties.)

# Via Gradle (orchestrates Poetry behind the scenes; sets VIRTUAL_ENV per task):
./gradlew :subprojects:python:poetryInstall
./gradlew :subprojects:python:pytest
./gradlew :subprojects:python:egrBuild

# Or directly via Poetry (activate the venv first):
source /opt/python/venvs/eps-ground-rapture/bin/activate
cd subprojects/python
poetry install
poetry run pytest
poetry run egr-build    # writes data/processed/<table>/, dashboards/sql/*,
                        # dashboards/duckdb/eps.duckdb, deploy/terraform/tables.json

# Local development — either:
#   DuckDB: connect Tableau to dashboards/duckdb/eps.duckdb (see dashboards/duckdb/README.md)
#   Spark Thrift: beeline -u jdbc:hive2://localhost:10000 -f dashboards/sql/spark-thrift.sql
#
# AWS (dev/prod) — Terraform-managed (ADR-0014):
#   cd deploy/terraform/envs/dev && terraform apply
#   aws --profile urc s3 sync data/processed/ s3://eps-ground-rapture-dev/processed/ --exclude '*.gitkeep'
#   (details + BI connection strings: deploy/terraform/README.md)
```
