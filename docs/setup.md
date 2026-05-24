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
    spark-thrift.sql           dev DDL: `USING parquet LOCATION 'file:///.../<table>/'`
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
        io.py                DEM / FDHI / Kern CSV loaders
        prep.py              cleaning/filtering ported from the legacy notebooks
        export.py            Parquet writer (Arrow type coercion, dir-per-table)
        register.py          Athena + Spark Thrift DDL generators
        cli.py               `egr-build` entry point
    tests/test_smoke.py
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
eps_ground_rapture.register                 emits DDL for both engines
        │
        ├──► dashboards/sql/athena.sql         ──► Athena (S3)         ──► Tableau Cloud / Superset
        └──► dashboards/sql/spark-thrift.sql   ──► Spark Thrift (local) ──► Tableau Desktop / Superset
```

Single CLI: `poetry run egr-build` writes both the Parquet files and the
two DDL scripts. Flags:

- `--skip-fdhi` — skip the FDHI stage while the raw file is unavailable.
- `--database <name>` — logical schema name in the DDL (default `eps_ground_rapture`).
- `--s3-prefix <uri>` — S3 prefix baked into Athena DDL (default placeholder
  `s3://CHANGE_ME/eps-ground-rapture/processed/`).

## Ported logic so far

Only one piece of notebook logic has been ported, intentionally:

- **`prep.clean_fdhi`** — reproduces the filter chain in
  `2D DEM - Figures for 2024 DEM Paper.ipynb`:
  - `style ∈ {Reverse, Reverse-Oblique}`
  - `rupture_rank == 'Principal'`
  - any positive scarp-height measurement across `vs_*` / `sh_*` columns
  - `0 < fzw_central_meters < 50`
  - `recommended_net_preferred_usage_flag ∈ {Check, Keep}`

Everything else in the legacy notebooks is plotting code (matplotlib /
seaborn). That work belongs in Tableau/Superset, not in the Python
pipeline, so it has been deliberately not ported.

## What runs today

Verified end-to-end on 2026-05-24:

- `poetry install` from `subprojects/python/` — clean install on Python
  3.13.7 (Poetry 2.4.1) at the new module location.
- `poetry run pytest` — **7/7** smoke tests pass: version present, repo
  paths resolve (`config.REPO_ROOT` still correct after the move), `clean_fdhi`
  filters correctly, `export_tidy` produces dir-per-table Parquet,
  `athena_ddl` emits explicit columns from inferred schema, `spark_ddl` uses
  `USING parquet` inference, and unknown Arrow types raise a clear
  `ValueError`.
- `poetry run egr-build --skip-fdhi` — produces:
  - `data/processed/dem/data.parquet` (~10.6 MB; 73 MB raw input)
  - `dashboards/sql/athena.sql` (CREATE DATABASE + CREATE EXTERNAL TABLE)
  - `dashboards/sql/spark-thrift.sql` (CREATE DATABASE + USE + CREATE TABLE)

- `./gradlew :subprojects:python:pytest` — 7/7 pass via the Gradle
  orchestrator (Gradle 8.10.2 wrapper, JDK 21).

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

- **FDHI raw file missing.** `02_FDHI_FLATFILE_MEASUREMENTS_20220719.csv`
  is an externally-curated dataset (FDHI Project release of 2022-07-19).
  Until it lands in `data/raw/`, run with `--skip-fdhi`.
- **Kern County loader is stubbed** (`io.load_kern_combined`) but no
  cleaning routine exists; the legacy notebook uses it mostly as-is. See
  `docs/datasets.md` for what the file is and how it's used.
- **No dashboards yet.** `dashboards/tableau/` and `dashboards/superset/`
  contain only READMEs describing the intended workflow.
- **No Athena/Glue automation.** The pipeline emits DDL text; running it
  in AWS (or via a Glue Crawler) is a manual step. Could be wired through
  `boto3` later if needed.
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
python3.13 -m venv /opt/python/venvs/eps-ground-rapture
# (Or override with EGR_VENV=/your/path before running Gradle.)

# Via Gradle (orchestrates Poetry behind the scenes; sets VIRTUAL_ENV per task):
./gradlew :subprojects:python:poetryInstall
./gradlew :subprojects:python:pytest
./gradlew :subprojects:python:egrBuild

# Or directly via Poetry (activate the venv first):
source /opt/python/venvs/eps-ground-rapture/bin/activate
cd subprojects/python
poetry install
poetry run pytest
poetry run egr-build --skip-fdhi    # writes data/processed/<table>/ + dashboards/sql/*

# Development: start Spark Thrift, then in beeline / DBeaver / Tableau:
#   $ beeline -u jdbc:hive2://localhost:10000 -f dashboards/sql/spark-thrift.sql
#
# Production: upload data/processed/ to S3, edit dashboards/sql/athena.sql
# (or pass --s3-prefix at build time), then run it in the Athena console.
```
