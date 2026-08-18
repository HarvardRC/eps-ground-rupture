# Developer manual

What this repository contains, how the pipeline fits together, and how to
run it. Companion documents: `docs/adr/` for *why* each decision was made,
`docs/datasets.md` for what the input data is, `docs/dashboards/` for the
Tableau workbooks, `notes/Roadmap.md` for what's next, `TODO.md` for chores.

Counts and versions below are marked with the date they were taken. Re-take
them rather than trusting them.

## Goal

Turn the two legacy notebooks under `legacy/` into a productized,
interactive publication:

- A **Python pipeline** (modules + CLI, no notebooks) that reads raw
  measurements — DEM trials, the FDHI flatfile, SURE, Kern County — and
  writes tidy Parquet plus the DuckDB views the analyses need.
- **Tableau dashboards** built on those views and published to **Tableau
  Public**, fed by CSV extracts.
- A **MkDocs companion site** on GitHub Pages that embeds the dashboards
  and explains them for a non-specialist reader.
- **No Python UI layer** (Dash/Streamlit) and **no notebooks** in this
  repo. Legacy `.ipynb` files stay under `legacy/` as reference artifacts.

An earlier architecture aimed at SQL engines instead: Athena in production,
Spark Thrift in development, Superset alongside Tableau. Superset and Spark
Thrift are retired; the AWS/Athena lane is parked but intact. That story —
what was built, why it stopped, and what would revive it — is told once in
[`adr/dead-ends.md`](adr/dead-ends.md). Code and generated artifacts
belonging to it still exist and are noted below where they appear.

## Decisions

Decisions live in `docs/adr/`, which is the source of truth (context,
alternatives, consequences). The active set was rewritten 2026-08-05 after
the Tableau Public pivot; this table is a quick reference.

| ADR | Decision                | Choice |
|-----|-------------------------|--------|
| [0001](adr/0001-gradle-multi-project-build.md)            | Build & repo layout        | Gradle multi-project; code modules under `subprojects/` |
| [0002](adr/0002-python-pipeline-shape-and-toolchain.md)   | Pipeline shape & toolchain | Modules + CLI, Poetry, no notebooks/UI; Python `>=3.11,<3.14` |
| [0003](adr/0003-duckdb-as-the-analytical-engine.md)       | Analytical engine          | DuckDB views over tidy Parquet, pinned by tests |
| [0004](adr/0004-tableau-as-the-dashboard-platform.md)     | Dashboard platform         | Tableau only (Superset retired) |
| [0005](adr/0005-tableau-public-as-the-publication-channel.md) | Publication channel    | Tableau Public (vs Cloud / Server) |
| [0006](adr/0006-csv-extracts-for-tableau-public.md)       | Published data format      | CSV exports (`egr-csv` → `dist/csv/`) |
| [0007](adr/0007-dashboard-design-conventions.md)          | Dashboard conventions      | Paper palette, web variants, interactivity baseline |
| [0008](adr/0008-mkdocs-material-companion-site.md)        | Companion site             | MkDocs Material (`subprojects/mkdocs/`) |
| [0009](adr/0009-github-pages-hosting.md)                  | Site hosting               | GitHub Pages via Actions (`--strict` gate) |
| [—](adr/dead-ends.md)                                     | The retired plan           | Athena / Spark Thrift / Superset / DDL / Sheets — one story |

## Repository layout

```
# Project-level
README.md, TODO.md, LICENSE, .gitignore, .gitattributes, .env.example
.github/workflows/mkdocs.yml  builds + deploys the companion site (ADR-0009)
ai/                          initial scoping conversation (gitignored, local only)
legacy/                      original notebooks + 2025 paper PDF (gitignored, local only)
notes/                       Roadmap.md, chart-families.md, dashboard-N-build-spec.md,
                             multi-machine.md, dated working notes
data/
  raw/                       raw inputs (gitignored) — see data/README.md
  interim/                   intermediate cleaning artifacts (gitignored)
  processed/<table>/         dir-per-table Parquet (gitignored)
                               e.g. data/processed/dem/data.parquet
dist/                        build outputs (gitignored)
  csv/                       egr-csv exports — what the published workbooks read
  python/                    the wheel
dashboards/
  duckdb/eps.duckdb          the view definitions clients connect to (gitignored)
  tableau/                   the seven .twb workbooks + README (index + publish procedure)
  sql/                       generated DDL (gitignored; parked AWS lane)
    athena.sql                 external tables over s3://.../<table>/
    athena-views.sql           Athena/Trino twins of six DuckDB views
    spark-thrift.sql           USING parquet LOCATION 'file:///.../<table>/'
  sheets/                    Google Sheets push targets (targets.yaml + README; dormant)
  superset/                  retired (ADR-0004); README kept for its connector strings
deploy/
  terraform/                 AWS data layer (parked); tables.json is committed
docs/                        this file, datasets.md, adr/, dashboards/

# Gradle root — orchestrator only (ADR-0001)
settings.gradle.kts          lists :subprojects:python, :subprojects:mkdocs, :deploy:terraform
build.gradle.kts             cross-cutting tasks (currently just the `base` plugin)

# Code modules — Gradle subprojects
subprojects/
  python/                    Poetry-managed pipeline package
    build.gradle.kts         thin Exec wrappers around Poetry
    pyproject.toml           Poetry config (ADR-0002)
    poetry.lock              committed lockfile
    src/eps_ground_rupture/  Python "src-layout" (ADR-0001)
      config.py              repo-relative paths, categorical vocab, SURE magnitudes
      io.py                  loaders + the required-raw-input checks
      prep.py                FDHI cleaning (clean_fdhi, fdhi_measurements)
      export.py              Parquet writer (Arrow type coercion, dir-per-table)
      register.py            Athena + Spark Thrift DDL generators (parked lane)
      views.py               DuckDB view definitions + their Athena/Trino twins
      csvexport.py           view -> dist/csv/<view>.csv (`egr-csv`)
      sheets.py              view -> Google Sheets (`egr-push-sheets`; dormant)
      cli.py                 the three console-script entry points
    tests/                   test_smoke, test_prep, test_raw_inputs,
                             test_regression_views, test_historic_events,
                             test_csvexport, test_sheets, test_fdhi_flatfile
  mkdocs/                    the companion site (ADR-0008)
    build.gradle.kts         mkdocsServe / mkdocsBuild wrappers (same venv)
    mkdocs.yml, docs/, DEPLOY.md, EMBEDS.md
```

The package directory is `eps_ground_rupture` (renamed 2026-08-05). The
local checkout folder and the Athena/Glue identifiers deliberately keep the
older `rapture` spelling — see `notes/multi-machine.md`.

## Pipeline overview

```
data/raw/*.csv                            raw inputs (user-supplied, gitignored)
        │
        ▼
io.load_*  +  prep.clean_fdhi/fdhi_measurements
        │
        ▼
export.export_tidy
        │
        ▼
data/processed/<table>/data.parquet        the tidy analytical store
        │
        ├──► views.build_duckdb_views ──► dashboards/duckdb/eps.duckdb   (12 views)
        │             │
        │             └──► csvexport ──► dist/csv/<view>.csv ──► Tableau Public
        │                                                        └──► embedded in the site
        │
        └──► register ──► dashboards/sql/*.sql + deploy/terraform/tables.json   [parked]
```

**The shipping path is the middle one.** `egr-csv` writes one CSV per view
into `dist/csv/`; the published Tableau workbooks read those files, because
Tableau Public cannot hold a live connection to anything (ADR-0005,
ADR-0006). Changes reach a dashboard only after `egr-build` →
`csvExportAll` → open the workbook → **Data → \<source\> → Refresh** →
republish.

**Parquet is not a leftover of the AWS plan.** It is the durable analytical
store this project computes against: DuckDB reads it directly, the views
and their pinned coefficients are defined over it, and it is the one format
that will still be useful when the delivery lane changes. CSV is a
concession to what Tableau Public accepts today — flat, static, and copied
per workbook. If the published dashboards need to get faster (they are on
the slow side today; see `TODO.md` → Dashboard responsiveness), the options
that matter — pre-aggregated views, a live query endpoint, a different
front end — all build on the Parquet layer rather than replacing it. Keep
that door open.

The DDL branch is generated on every run but consumed by nothing right now:
`athena.sql` and `spark-thrift.sql` are reference scripts, `athena-views.sql`
carries Trino twins of six views, and `deploy/terraform/tables.json` is the
committed Glue schema. See [`adr/dead-ends.md`](adr/dead-ends.md).

### Fail-fast on raw inputs

**Every raw input is required**, and `egr-build` checks for all of them
before writing anything: a missing file means exit 2 and one message naming
what's absent and where to get it, rather than a traceback partway through
a run that has already rewritten half the artifacts — including the tracked
`deploy/terraform/tables.json`. Only *presence* is checked; an empty or
malformed file still fails later, in the loader that reads it.

**There is deliberately no fallback to the pre-cleaned FDHI CSV.** It
yields an `fdhi_cleaned` of a different shape and no `fdhi_measurements`,
so a build from it would leave the Parquet, the DDL and the Terraform
schema describing different things. `io.load_fdhi` still exists but nothing
in the pipeline calls it — it survives only as the reference
`tests/test_prep.py` and `tests/test_fdhi_flatfile.py` check the cleaning
chain against.

`egr-build` also warns when a processed table was not rebuilt this run —
its Parquet lingers and still backs a view.

## Tools

### `egr-build`

Raw CSVs → Parquet → DuckDB views → DDL. No flags needed.

| Flag | Default | Effect |
|------|---------|--------|
| `--database <name>` | `eps_ground_rapture` | Logical schema name baked into the generated DDL. Keeps the pre-rename spelling: it names provisioned AWS resources. |
| `--s3-prefix <uri>` | `s3://CHANGE_ME/processed/` | S3 prefix baked into `athena.sql`; per-table dirs are appended. |

Both flags only affect the parked DDL branch. For a Terraform-provisioned
env: `--database eps_ground_rapture_<env> --s3-prefix s3://eps-ground-rapture-<env>/processed/`.

Writes `data/processed/<table>/data.parquet` for `dem`, `fdhi_cleaned`,
`fdhi_measurements`, `sure` and `kern_combined`; `dashboards/duckdb/eps.duckdb`;
`dashboards/sql/{athena,spark-thrift,athena-views}.sql`; and
`deploy/terraform/tables.json`.

### `egr-csv`

One DuckDB view → `dist/csv/<view>.csv`. This is the publication step.

```bash
poetry run egr-csv --view unified_observations
```

Twelve views are wired up as Gradle tasks (`csvViews` in
`subprojects/python/build.gradle.kts`); `csvExportAll` refreshes all of
them, which is what you want after any `egr-build`, since the workbooks
read several files each. Note that a bare `csvExportAll` exports from
whatever views the *last* `egr-build` left in `eps.duckdb` — on a machine
that hasn't built since the view list grew, it dies mid-run on the first
missing view. `egrBuildAndExport` is the guard-railed combination (build
first, then every export); prefer it on arrive-on-a-machine days.

### `egr-push-sheets` — dormant

Pushes a view to Google Sheets so a Tableau Public workbook could
auto-refresh from it. Superseded by the CSV lane and not in use — and the
largest table cannot go through it anyway: a Google spreadsheet caps at
10,000,000 cells, `sheets.CELL_LIMIT` guards at 9,000,000, and `dem` is
346,834 × 26 = 9,017,684 cells, so `egr-push-sheets --view dem` raises
rather than uploading. Views that big need the Drive-CSV route. Setup is in
`dashboards/sheets/README.md`; the story is in
[`adr/dead-ends.md`](adr/dead-ends.md).

### Gradle tasks

Gradle sets `VIRTUAL_ENV` and `PATH` per task, so no manual activation.

```bash
./gradlew :subprojects:python:poetryInstall
./gradlew :subprojects:python:pytest
./gradlew :subprojects:python:egrBuild
./gradlew :subprojects:python:csvExportAll   # every view -> dist/csv/ (dem alone ~73 MB)
./gradlew :subprojects:python:egrBuildAndExport  # egrBuild + csvExportAll, ordered — the safe one-click refresh
./gradlew :subprojects:python:csvExportDem   # one view; one task per view exists
./gradlew :subprojects:python:wheel          # -> dist/python/eps_ground_rupture-*.whl
./gradlew :subprojects:python:clean          # removes dist/python/ and dist/csv/

./gradlew :subprojects:mkdocs:mkdocsServe    # live-reload site at localhost:8000
./gradlew :subprojects:mkdocs:mkdocsBuild    # --strict build

./gradlew :deploy:terraform:planDev          # parked lane: init/plan/apply/output/syncData
```

## Setup

The project uses a **manually created virtualenv at a fixed location**
rather than letting Poetry place one. `subprojects/python/poetry.toml` sets
`virtualenvs.create = false`, so Poetry installs into whatever venv is
**active** — and without one it targets the system Python and fails.

The convention (and the Gradle default, ADR-0001) is
**`/opt/python/venvs/<name>`**:

```bash
python3.13 -m venv /opt/python/venvs/eps-ground-rapture
# Python 3.13 because pyarrow 18 has no 3.14 wheel — see ADR-0002.
source /opt/python/venvs/eps-ground-rapture/bin/activate
cd subprojects/python && poetry install
```

If Poetry is missing: `brew install poetry` (or `pipx install poetry`).

If your venvs live elsewhere (some machines keep them under
`/opt/venv/<name>` — on the laptop that is a symlink to the same place),
set `EGR_VENV=/path/to/venv` or pass `-Ppython.venv=/path/to/venv`. To make
it stick for both the terminal and IDEA-launched Gradle, put
`python.venv=/path/to/venv` in `~/.gradle/gradle.properties`. Check which
path actually exists before trusting either spelling.

IntelliJ IDEA needs one manual step after every Gradle sync (the Python
Module SDK resets to the project JDK — a JetBrains limitation). Details in
`subprojects/python/README.md`.

## What runs today

Verified 2026-08-18:

- `poetry install` — clean on Python 3.13.7 / Poetry 2.4.1.
- `poetry run pytest` — **115 collected, 113 passed, 2 failed** in ~6 s:
  `test_csvexport` 7, `test_fdhi_flatfile` 2, `test_historic_events` 10,
  `test_prep` 20, `test_raw_inputs` 15, `test_regression_views` 17,
  `test_sheets` 21, `test_smoke` 23. Coverage spans the FDHI cleaning
  chains, the required-input checks, Parquet export, DDL generation, the
  DuckDB views (incl. the regression and historic-events views), CSV
  export and the Sheets targets. The two failures are open items in
  `TODO.md` → Data pipeline: the `test_smoke` optional-`fdhi_measurements`
  fixture predates the `historic_events` view and lacks the columns it
  reads, and `test_fdhi_flatfile` expects Bohol among the reverse-style
  FDHI events, which the current cleaning chain does not yield. (Until
  2026-08-18 `test_fdhi_flatfile.py` still imported the pre-rename package
  name, so the whole suite died at collection.)

  Two limits worth knowing. `test_smoke`'s view tests build from
  **synthetic fixture frames** and pin *behaviour* — shapes, filters,
  sentinel handling; `test_regression_views` and `test_historic_events`
  instead rebuild the views from the real `data/processed/` Parquet into a
  temp DuckDB file and pin the coefficients and row counts the shipped
  inputs produce (per-dip n, FDHI 2,392 / SURE 203 / Kern 21), skipping
  when the Parquet is absent — so a re-clean of the raw data moves those
  pins on purpose. And `kern_combined_geo` has no assertions at all: it is
  executed as a side effect of `build_duckdb_views` but nothing checks its
  columns or its constants. The Dashboard 4 coefficients are pinned with
  `pytest.approx(..., abs=0.001)`, so despite being written to four
  decimals they are enforced to three.
- `./gradlew :subprojects:python:pytest` — same suite via the orchestrator
  (Gradle 8.10.2 wrapper; nothing in the build pins a JDK toolchain).
- `poetry run egr-build` — requires all four raw inputs, exits 2 naming any
  that are missing.
- The companion site builds `--strict` on every pull request that touches
  it (validation only, no deploy) and deploys from `main` on push.

## Ported logic

FDHI is the one input with cleaning logic in the pipeline. `prep.py` holds
`clean_fdhi` (the prior owner's filter chain, reproducing the
scatter-overlay subset that used to arrive as
`data/raw/FDHI_Cleaned_Measurements.csv`) and `fdhi_measurements` (the
reverse-style rows — the per-event statistics base — with the `-999`
sentinel nulled in numeric columns; string sentinels are left alone and no
row-level filters are applied, those being per-chart choices). Both derive
from the raw UCLA Dataverse flatfile, which the build requires.
`tests/test_prep.py` pins both chains, including that `clean_fdhi`
reproduces the shipped pre-cleaned CSV row for row.

Derived analytics were ported later, into `views.py` rather than into
Tableau: the per-dip OLS fits, their line endpoints, and the Kern
back-projection behind Dashboard 4. Computing those in Tableau calculated
fields would make them untestable (ADR-0003).

The rest of the legacy notebooks is plotting code (matplotlib / seaborn).
That work belongs in Tableau, so it has deliberately not been ported.

## Known gaps

- **`data/raw/` is populated by hand** and gitignored, so a fresh clone
  cannot build. Worth automating — mirror the inputs on Zenodo, or script
  the UCLA Dataverse download. (`TODO.md`)
- **Kern County has no cleaning routine.** `io.load_kern_combined` is a
  thin `read_csv`; the derived work happens downstream in the
  `kern_combined_geo` and `kern_inferred_slip` views.
- **All five dashboards are built** (Dashboard 5, 2026-08-15). What is
  left is polish and the open questions in
  `notes/dashboard-5-build-spec.md`; build-order item #6 (static images)
  is parked on the figure-rights question. `notes/Roadmap.md` has the
  statuses.
- **Published dashboards are slow.** Candidate levers are recorded in
  `TODO.md`; the biggest single one — Dashboard 3's two DEM boxplot sheets
  drawing ~330k disaggregated marks each — was pulled 2026-08-16
  (underlying marks hidden); nothing has been measured since.
- **AWS deployment via Terraform** is parked and never applied to the
  account. `TODO.md` → Deployment records the revival triggers.
- **Notebook 2** (`2Ddem 2025 Paper Revisions …`) is no longer a gap: its
  non-plotting logic lives in `views.py` (the per-dip fits and Kern
  back-projection, the `historic_events` reference lines) and every figure
  cell maps onto a built dashboard (`notes/chart-families.md`). Its `Set` /
  `Cohesion` filtering needed no Python prep — both are DEM columns.

## Quickstart

```bash
git clone git@github.com:HarvardRC/eps-ground-rupture.git eps-ground-rapture
cd eps-ground-rapture   # the folder keeps the old spelling — see the last paragraph

# Put raw CSVs in data/raw/ — see data/README.md for the expected file list.
cp /path/to/DEM_dataset.csv data/raw/

# One-time: create the venv (convention: /opt/python/venvs/<name>).
python3.13 -m venv /opt/python/venvs/eps-ground-rapture
# Or keep it elsewhere: EGR_VENV=/your/path, -Ppython.venv=/your/path, or
# python.venv=/your/path in ~/.gradle/gradle.properties.

# Via Gradle (orchestrates Poetry; sets VIRTUAL_ENV per task):
./gradlew :subprojects:python:poetryInstall
./gradlew :subprojects:python:pytest
./gradlew :subprojects:python:egrBuild
./gradlew :subprojects:python:csvExportAll

# Or directly via Poetry (activate the venv first):
source /opt/python/venvs/eps-ground-rapture/bin/activate
cd subprojects/python
poetry install && poetry run pytest && poetry run egr-build

# Then:
#   Dashboards — open a workbook from dashboards/tableau/, refresh its
#     extracts so they rebuild from dist/csv/. See dashboards/tableau/README.md.
#   Site       — cd subprojects/mkdocs && mkdocs serve
#   DuckDB     — connect any client to dashboards/duckdb/eps.duckdb
#                (dashboards/duckdb/README.md has the Tableau JDBC recipe)
```

Existing checkouts keep the folder name `eps-ground-rapture`: the Tableau
workbooks store absolute CSV paths, so renaming it would force a connection
repair across the five `-public` workbooks (`notes/multi-machine.md`).
