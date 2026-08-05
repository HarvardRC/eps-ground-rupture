# Python pipeline

Pipeline that turns the legacy DEM notebooks into Parquet tables and the
DDL needed to register them in AWS Athena (production) or Apache Spark
Thrift Server (development).

This module is a Gradle subproject — `./gradlew :subprojects:python:check`
runs the tests, `./gradlew :subprojects:python:egrBuild` runs the pipeline.
For direct work, use Poetry inside this directory as below.

## Setup

This project uses a **manually created virtualenv** at a fixed location
rather than letting Poetry manage venv placement. `poetry.toml` sets
`virtualenvs.create = false`, so Poetry installs into the active venv
instead of creating its own under `~/Library/Caches/pypoetry/`.

```bash
# 1. Create the venv (one time, outside the project).
#    /opt is root-owned on macOS, so this needs a writable parent first:
#      sudo mkdir -p /opt/python/venvs && sudo chown "$(whoami)" /opt/python/venvs
#    If you keep venvs elsewhere, use that path and see the override below.
python3.13 -m venv /opt/python/venvs/eps-ground-rapture
# Python 3.13 because pyarrow 18 has no 3.14 wheel — see ADR-0002.

# 2. Activate, then install via Poetry.
source /opt/python/venvs/eps-ground-rapture/bin/activate
cd subprojects/python
poetry install
```

If Poetry is not installed:

```bash
brew install poetry            # or: pipx install poetry
```

To use a different venv location, set `EGR_VENV=/path/to/venv` in your
environment or pass `-Ppython.venv=/path/to/venv` to Gradle. To make the
override stick for both terminal and IDEA-launched Gradle, put
`python.venv=/path/to/venv` in `~/.gradle/gradle.properties`.

## Usage

With the venv activated:

```bash
# from subprojects/python (with /opt/python/venvs/eps-ground-rapture activated)
poetry run egr-build                # writes data/processed/<table>/, dashboards/sql/,
                                    # dashboards/duckdb/eps.duckdb, deploy/terraform/tables.json
poetry run pytest                   # smoke tests
```

CLI flags:

| Flag              | Default                       | Effect |
|-------------------|-------------------------------|--------|
| `--database NAME` | `eps_ground_rapture`          | Schema name baked into the generated DDL scripts. |
| `--s3-prefix URI` | `s3://CHANGE_ME/processed/`   | S3 prefix baked into the reference `athena.sql`. Per-table dirs are appended. For a Terraform-provisioned env use `s3://eps-ground-rapture-<env>/processed/` with `--database eps_ground_rapture_<env>`. |

(Neither flag affects the Terraform path — `deploy/terraform/tables.json`
carries only the schema; bucket and database names live in the Terraform
module. See `../../deploy/terraform/README.md`.)

Raw inputs go in `../../data/raw/` (e.g. `DEM_dataset.csv`,
`02_FDHI_FLATFILE_MEASUREMENTS_<date>.csv`, `SURE.csv`,
`Combine_BuwaldaFDHI_KernSDC.csv` — see `../../data/README.md`). All four
are required: `egr-build` checks for them up front and exits 2 naming any
that are missing. Parquet outputs land in
`../../data/processed/<table>/data.parquet`.

Or via Gradle from anywhere (no manual activation — Gradle sets `VIRTUAL_ENV`
and `PATH` on each task):

```bash
./gradlew :subprojects:python:poetryInstall
./gradlew :subprojects:python:pytest
./gradlew :subprojects:python:egrBuild
./gradlew :subprojects:python:wheel          # → dist/python/eps_ground_rupture-*.whl
./gradlew :subprojects:python:clean          # removes dist/python/
```

Build artifacts from every subproject collect under the repo-level `dist/`
(this module writes to `dist/python/`; future Java modules would write to
`dist/java/`).

## IntelliJ IDEA setup

**Source roots and excluded folders are declared in `build.gradle.kts`**
(`idea { module { ... } }` block) and IDEA's Gradle sync reproduces them
correctly. You don't need to mark `src/`, `tests/`, `.venv/`, or `dist/`
by hand.

**The Module SDK is not.** IDEA's Gradle integration doesn't carry Python
SDK assignments through from `build.gradle.kts`; it always resets the
module's interpreter to the project JDK after each sync. This is a
JetBrains limitation — see ADR-0001. Workaround is a small manual step,
described below.

### One-time setup

1. Create the Python SDK in IDEA:
   `Settings → Project Structure → SDKs → + → Python SDK → Virtualenv → Existing environment`.
2. Interpreter: `/opt/python/venvs/eps-ground-rapture/bin/python`.
3. Name it whatever you like; we recommend `Python 3.13 (eps-ground-rapture)` for clarity.
4. OK.

### After every Gradle sync

`Project Structure → Modules → :subprojects:python → Dependencies → Module SDK → Python 3.13 (eps-ground-rapture) → OK`.

(About five clicks. We tried automating it via a `./gradlew restoreIdeaPythonModule`
task that copied the underlying cache XML, but it required a full IDEA
"Invalidate Caches → Restart" to take effect, which is heavier than just
re-selecting the SDK. The manual click is the steady state until JetBrains
closes the gap.)

## Layout

Uses Python's modern "src-layout" — package code lives under `src/`, not at
the module root. See [ADR-0001](../../docs/adr/0001-gradle-multi-project-build.md).

```
src/
  eps_ground_rupture/
    config.py     repo-relative paths, categorical vocab, SURE magnitudes
    io.py         loaders for DEM, FDHI, SURE, Kern; raw-input checks
    prep.py       FDHI cleaning/filtering (clean_fdhi, fdhi_measurements)
    export.py     Parquet writer with Arrow type coercion (dir-per-table)
    register.py   Athena + Spark Thrift DDL generation
    views.py      DuckDB view definitions + their Athena/Trino twins
    csvexport.py  view -> dist/csv/<view>.csv (`egr-csv`)
    sheets.py     view -> Google Sheets (`egr-push-sheets`)
    cli.py        `egr-build` / `egr-csv` / `egr-push-sheets` entry points
tests/            test_smoke, test_prep, test_raw_inputs, test_csvexport,
                  test_sheets
```

`duckdb` is a runtime dependency for the embedded query path (tests,
optional CLI inspection). It's not required for the pipeline to write
Parquet — pyarrow does that — but it's useful for verifying outputs without
spinning up a server.
