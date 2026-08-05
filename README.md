# eps-ground-rapture

Productizing 2D DEM earthquake-rupture analyses (Chiama et al., 2025,
*Earthquake Spectra*) as interactive dashboards.

The legacy material — two Jupyter notebooks and the accompanying paper —
lives under `legacy/` as local reference artifacts (gitignored). This repo
turns that notebook-driven workflow into:

1. A **Python data pipeline** (modules + CLI; no notebooks) that ingests
   raw measurements and writes Parquet tables, plus the schema artifacts
   derived from them (DDL scripts, DuckDB views, Glue table definitions).
2. An **AWS data layer managed by Terraform** (`deploy/terraform/`):
   S3 + Glue + Athena per environment (dev/prod). For local development,
   DuckDB views and Spark Thrift DDL serve the same tables.
3. **Dashboards** in Tableau and Apache Superset that query those tables
   via SQL.

## Repository layout

```
# Project-level (root owns these)
README.md, LICENSE, .gitignore
docs/                  design notes, ADRs, dataset notes
data/
  raw/                 raw CSVs (gitignored; drop inputs here)
  interim/             intermediate cleaning artifacts (gitignored)
  processed/           dir-per-table Parquet outputs (gitignored)
                         e.g. data/processed/dem/data.parquet
dashboards/
  duckdb/              generated DuckDB views file (gitignored) — first-pass Tableau source
  sql/                 generated CREATE TABLE scripts (gitignored)
                         athena.sql       — reference DDL (prod is Terraform-managed)
                         spark-thrift.sql — development DDL (local file:// URIs)
  tableau/             Tableau workbooks (.twb / .twbx)
  superset/            Superset YAML exports
  sheets/              push DuckDB views to Google Sheets for Tableau Public
                         (egr-push-sheets; see dashboards/sheets/README.md)
deploy/
  terraform/           AWS data layer: S3 + Glue + Athena per env (dev/prod);
                         tables.json — generated schema lockfile (committed)
ai/                    initial scoping conversation (gitignored)
legacy/                original notebooks and 2025 paper PDF (gitignored)

# Gradle root — orchestrator only
settings.gradle.kts    lists subprojects
build.gradle.kts       cross-cutting tasks

# Code modules (Gradle subprojects)
subprojects/
  python/              Poetry-managed pipeline package
                         (see subprojects/python/README.md)
```

See [ADR-0013](docs/adr/0013-gradle-multi-project-subprojects-layout.md)
for the layout rationale.

## Quickstart

Via Gradle (orchestrates Poetry behind the scenes):

```bash
./gradlew :subprojects:python:pytest        # tests
./gradlew :subprojects:python:egrBuild      # pipeline
```

Or directly via Poetry:

```bash
cd subprojects/python
poetry install
poetry run egr-build    # writes data/processed/<table>/, dashboards/sql/*,
                        # dashboards/duckdb/eps.duckdb, deploy/terraform/tables.json
poetry run pytest
```

Then pick a delivery path:
- **Local dev**: connect Tableau Desktop to `dashboards/duckdb/eps.duckdb`
  via the DuckDB JDBC driver (see `dashboards/duckdb/README.md`), or run a
  Spark Thrift Server with `dashboards/sql/spark-thrift.sql`.
- **AWS (dev or prod)**: `./gradlew :deploy:terraform:applyDev` then
  `./gradlew :deploy:terraform:syncDataDev` (or the `…Prod` variants;
  raw `terraform` / `aws s3 sync` work too).
  See `deploy/terraform/README.md` for connection details (Tableau, Superset).
  (`dashboards/sql/athena.sql` remains as reference DDL for manual setups —
  pass `--database eps_ground_rapture_<env>
  --s3-prefix s3://eps-ground-rapture-<env>/processed/` to `egr-build` so it
  matches the Terraform layout.)
- **Tableau Public**: Tableau *Public* can't connect to DuckDB or Athena, so
  publish a view to Google Sheets and let it auto-refresh:
  `poetry run egr-push-sheets` (see `dashboards/sheets/README.md`).

## Documentation

- `docs/setup.md` — what's scaffolded, decisions taken, known gaps
- `docs/adr/` — Architecture Decision Records (one per major decision)
- `docs/datasets.md` — reference notes on the input datasets (DEM, FDHI, Kern)
- `notes/Roadmap.md` — dashboard build plan; `notes/chart-families.md` — chart inventory
- `subprojects/python/README.md` — pipeline package usage
- `deploy/terraform/README.md` — AWS deployment (S3 + Glue + Athena, dev/prod)
- `dashboards/tableau/README.md`, `dashboards/superset/README.md` — dashboard conventions
- `dashboards/sheets/README.md` — Google Sheets push for Tableau Public (`egr-push-sheets`)

## License

Apache 2.0 — see `LICENSE`.
