# eps-ground-rapture

Productizing 2D DEM earthquake-rupture analyses (Chiama et al., 2025,
*Earthquake Spectra*) as interactive dashboards.

The legacy material — two Jupyter notebooks and the accompanying paper —
lives under `legacy/` as local reference artifacts (gitignored). This repo
turns that notebook-driven workflow into:

1. A **Python data pipeline** (modules + CLI; no notebooks) that ingests
   raw measurements and writes Parquet tables.
2. **DDL scripts** that register those tables against AWS Athena (production,
   Parquet on S3) and Apache Spark Thrift Server (development, Parquet on
   local filesystem).
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
  sql/                 generated CREATE TABLE scripts (gitignored)
                         athena.sql       — production DDL (S3 locations)
                         spark-thrift.sql — development DDL (local file:// URIs)
  tableau/             Tableau workbooks (.twb / .twbx)
  superset/            Superset YAML exports
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
poetry run egr-build --skip-fdhi    # writes data/processed/<table>/ + dashboards/sql/*
poetry run pytest
```

Then either:
- **Dev**: point Spark Thrift Server at `dashboards/sql/spark-thrift.sql`, then
  connect Tableau Desktop / Superset to Spark Thrift via JDBC.
- **Prod**: sync `data/processed/` to S3, run `dashboards/sql/athena.sql` in
  the Athena console (or pass `--s3-prefix s3://your-bucket/...` at build
  time so the DDL points at the right location), then connect Tableau Cloud
  / Superset to Athena.

## Documentation

- `docs/setup.md` — what's scaffolded, decisions taken, known gaps
- `docs/adr/` — Architecture Decision Records (one per major decision)
- `docs/datasets.md` — reference notes on the input datasets (DEM, FDHI, Kern)
- `subprojects/python/README.md` — pipeline package usage
- `dashboards/tableau/README.md`, `dashboards/superset/README.md` — dashboard conventions

## License

Apache 2.0 — see `LICENSE`.
