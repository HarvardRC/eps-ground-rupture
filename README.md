# eps-ground-rupture

Productizing 2D DEM earthquake-rupture analyses as interactive dashboards
and a companion web site.

- **Companion site**: <https://harvardrc.github.io/eps-ground-rupture/>
- **Dashboards**: <https://public.tableau.com/app/profile/michael.bouzinier>
  (free to view, no login)
- **The paper**: Chiama et al. (2025), *Earthquake Spectra* **41**(5),
  3977–4014, DOI
  [10.1177/87552930251346434](https://doi.org/10.1177/87552930251346434)
  — not open access; no paper content is reproduced in this repo.

The legacy material — two Jupyter notebooks and the accompanying paper —
lives under `legacy/` as local reference artifacts (gitignored). This repo
turns that notebook-driven workflow into:

1. A **Python data pipeline** (modules + CLI; no notebooks) that ingests
   the raw measurement sets, writes tidy Parquet tables, defines every
   derived product as a DuckDB SQL view, pins the analytical results with
   tests, and exports the CSVs the dashboards consume.
2. **Interactive Tableau Public dashboards** — five published, covering
   all six chart families: the model-vs-reality scatter (+ coverage
   matrix), response curves, per-event boxplots, the slip regression with
   Kern County inference, and the faceted distributions with mean ± σ
   summary.
3. A **MkDocs companion site** on GitHub Pages that embeds the dashboards
   and reads as an interactive version of the paper — glossary, data
   documentation, figure-by-figure crosswalk.

Architecture decisions live in `docs/adr/`: nine active ADRs, plus
[the story of the dead ends](docs/adr/dead-ends.md) — the earlier
SQL-engine/AWS/Superset architecture, retired or parked.

## Repository layout

```
# Project-level (root owns these)
README.md, LICENSE, TODO.md, .gitignore, .gitattributes, .env.example
docs/
  setup.md             the developer manual: layout, pipeline, tools, setup
  datasets.md          the input datasets and the derived views
  adr/                 active ADRs + dead-ends.md (the retired architecture)
  dashboards/          per-dashboard developer docs: data contracts,
                         calculated fields, editing traps
data/
  raw/                 raw CSVs (gitignored; drop inputs here — data/README.md)
  interim/             intermediate cleaning artifacts (gitignored)
  processed/           dir-per-table Parquet outputs (gitignored)
                         e.g. data/processed/dem/data.parquet
dist/                  build outputs (gitignored)
  csv/                 egr-csv exports — what the published workbooks read
  python/              the wheel
dashboards/
  tableau/             seven .twb: five published `-public` workbooks, one
                         per dashboard, plus desktop copies of the two June
                         families (Athena, pre-pivot); README = workbook
                         index + publish procedure
  duckdb/              generated views-only DuckDB file (gitignored)
  sql/                 generated DDL for the parked AWS lane (gitignored)
  sheets/              dormant Google Sheets push — the central `dem` view
                         exceeds the Sheets cell cap (see dead-ends.md)
  superset/            retired; README only (see dead-ends.md)
deploy/
  terraform/           AWS data layer — parked; revival triggers in TODO.md
notes/                 roadmap, chart inventory, dashboard build specs,
                         multi-machine notes, dated working notes
resources/local/       local secrets, e.g. the Sheets service-account key
                         (gitignored; see .env.example)
ai/                    initial scoping conversation (gitignored)
legacy/                original notebooks and 2025 paper PDF (gitignored)

# Gradle root — orchestrator only (ADR-0001)
settings.gradle.kts    lists :subprojects:python, :subprojects:mkdocs,
                         :deploy:terraform
build.gradle.kts       cross-cutting tasks (just the `base` plugin today)
.github/workflows/     mkdocs.yml — builds and deploys the site to Pages

# Code modules (Gradle subprojects)
subprojects/
  python/              Poetry-managed pipeline package
                         (see subprojects/python/README.md)
  mkdocs/              the companion site (MkDocs Material)
```

See [ADR-0001](docs/adr/0001-gradle-multi-project-build.md)
for the layout rationale.

## Quickstart

Via Gradle (orchestrates Poetry behind the scenes):

```bash
./gradlew :subprojects:python:pytest             # tests
./gradlew :subprojects:python:egrBuild           # pipeline: Parquet + views
./gradlew :subprojects:python:egrBuildAndExport  # …then every CSV into dist/csv/
```

Or directly via Poetry (activate the project venv first — see
`docs/setup.md`):

```bash
cd subprojects/python
poetry install
poetry run pytest
poetry run egr-build          # data/processed/<table>/ + dashboards/duckdb/eps.duckdb
poetry run egr-csv --view dem # one view -> dist/csv/dem.csv; the workbooks read
                              # several each — csvExportAll (Gradle) does them all
```

Then:

- **Dashboards**: open a workbook from `dashboards/tableau/` in the
  Tableau app and refresh extracts so they rebuild from your
  `dist/csv/`. The published versions live on the Tableau Public
  profile linked above.
- **Companion site, locally**: one-time
  `poetry install --only docs --no-root` (from `subprojects/python`),
  then `cd subprojects/mkdocs && mkdocs serve`. Deployment to GitHub
  Pages is automatic via `.github/workflows/mkdocs.yml`
  ([ADR-0009](docs/adr/0009-github-pages-hosting.md)).
- **Optional desktop lanes**: Tableau Desktop can connect straight to
  `dashboards/duckdb/eps.duckdb`; the AWS/Athena lane is parked — status
  and revival triggers in `TODO.md` → Deployment.

## Documentation

- `docs/setup.md` — the developer manual: layout, pipeline, the `egr-*` and
  Gradle tool surface, setup, known gaps
- `docs/adr/` — active decisions + [dead-ends.md](docs/adr/dead-ends.md)
- `docs/datasets.md` — the input datasets (DEM, FDHI, SURE, Kern) and the
  twelve derived views
- `docs/dashboards/` — per-dashboard developer docs: data contracts,
  calculated fields, how to edit a workbook safely; `tableau-editing-notes.md`
  collects the `.twb` traps that apply to every workbook
- `dashboards/tableau/README.md` — workbook index (files, dashboards,
  published slugs) and the publish/republish procedure
- `data/README.md` — the raw input files `egr-build` expects
- `notes/Roadmap.md` — build plan and statuses; `notes/chart-families.md` —
  chart inventory; `notes/dashboard-*-build-spec.md` — per-dashboard specs;
  `notes/multi-machine.md` — working across two machines (absolute paths
  in workbooks, the `rapture`/`rupture` folder-name story)
- `subprojects/python/README.md` — pipeline package usage and the IDEA setup
- `subprojects/mkdocs/DEPLOY.md` — site deployment, plus the open byline
  and figure-rights questions; `subprojects/mkdocs/EMBEDS.md` — the
  Tableau embed pattern and the view ↔ page ↔ size map
- `deploy/terraform/README.md` — the parked AWS lane;
  `dashboards/duckdb/README.md` — connecting a desktop client to the
  DuckDB file

## License

Apache 2.0 — see `LICENSE`. The underlying paper is not open access and
is not reproduced here.
