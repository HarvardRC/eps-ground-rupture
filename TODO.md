# TODO

Open work items that aren't tracked elsewhere (ADRs, git history, dashboard
specs). Add new entries here rather than scattering them across files.

## Data pipeline

### ~~Replace pre-cleaned FDHI CSV with raw flatfile + in-pipeline cleaning~~ — done (2026-08-01)
- The raw flatfile (`02_FDHI_FLATFILE_MEASUREMENTS_20220719.csv`, UCLA
  Dataverse DOI `10.25346/S6/Y4F9LJ`, file `ABRP7B`) is in `data/raw/`, and
  `prep.clean_fdhi` / `prep.fdhi_measurements` clean it in-pipeline. The
  chain is reverse / reverse-oblique style, positive `vs_*`/`sh_*`,
  `0 < fzw_central_meters < 50`, usage flag in {Check, Keep} — with **no**
  `rupture_rank == 'Principal'` filter (dropped in the prior owner's newer
  version). `tests/test_prep.py` pins it, including equivalence with the
  shipped `FDHI_Cleaned_Measurements.csv`.
- `egr-build` now **requires** the flatfile rather than falling back to the
  pre-cleaned CSV: the fallback produced a differently-shaped `fdhi_cleaned`
  and no `fdhi_measurements`, which left the Parquet, the DDL and the
  committed Glue schema disagreeing.
- **Still open**: `data/raw/` is gitignored and populated by hand. Worth
  automating — mirror the inputs on Zenodo, or script the UCLA Dataverse
  download — so a fresh clone can fetch them.

### Optional: incorporate the 3D DEM datasets when files arrive
- The prior owner's updated script also references `combinedCases123_v2.csv`
  (3D DEM Cases 1–3) and `combinedCase4_v2.csv` (3D DEM Case 4). Neither
  is in `data/raw/` yet. They're not blockers for v1 — the legacy 2D DEM
  analyses still work — but adding them would let dashboards reproduce the
  full multi-DEM scatter overlay in `legacy/FDHI-SURE-DEM-2D-3D-Scatter_ONLY.pdf`.

### Consider snake_case column names at export time
- Athena columns are now sanitized versions of the Parquet names, mapped
  by ordinal position (part of the parked AWS lane — see
  `docs/adr/dead-ends.md`). The cleaner long-term story is to emit
  snake_case names from `export_tidy` itself so every engine sees the
  same identifiers — but that breaks the existing Tableau workbook and
  DuckDB views, so it's a coordinated migration: rename at export →
  regenerate views/DDL/tables.json → repoint the workbook. Do it when
  there's a natural breaking-change moment (e.g. the FDHI raw-flatfile
  switch above).

## Deployment

### AWS (Terraform) — parked, low priority (2026-07-25)

- **Whether we need it at all is open.** Current delivery works without
  it: DuckDB locally, CSV-fed `-public` workbooks on Tableau Public.
  The desktop workbooks *do* carry Athena (AwsDataCatalog, URC Dev)
  connections, but they run off local `.hyper` extracts — if the AWS
  side lapses they keep working and can be repointed at DuckDB.
- **It becomes worth applying/keeping when** one of these materializes:
  - a live shared SQL endpoint — Tableau Cloud/Server or a hosted
    Superset querying Athena directly instead of file handoffs;
  - collaborators who need to query the tables without cloning the repo
    and rebuilding the Parquet locally;
  - data outgrowing the CSV/Sheets handoff path.
- **How to stand it up (when needed)**: in `deploy/terraform/envs/dev`
  run `terraform init` + `terraform apply`, then
  `aws s3 sync data/processed/ s3://eps-ground-rapture-dev/processed/`,
  then an Athena smoke query; BI connection details are in
  `deploy/terraform/README.md`. Unapplied it costs nothing; applied,
  storage + queries at this data size are negligible.
- Terraform state is local and absent from this clone — verify actual
  AWS state (URC Dev console, or the machine the apply ran from) before
  assuming resources exist or re-applying. Move state to an S3 backend
  if collaborators arrive.

## Dashboards

- Shipped: `dem-model-vs-reality.twb` (Dashboard 1 + Viable
  Combinations) and `dem-response-curve.twb` (Dashboard 2, response
  curves), each with a CSV-fed `-public` twin on Tableau Public
  (`dem-overview.twb` was split/renamed into these).
- Next: Dashboard 3 — per-event boxplots (see `notes/Roadmap.md`,
  Build order); its data-side prep — `magnitude` in
  `unified_observations` — is done (2026-07-31).
- Superset YAML exports still absent. A *hosted* Superset presupposes a
  shared SQL endpoint (the parked AWS item above); a local Superset
  over DuckDB is possible without it.

## Tooling friction (open JetBrains issue)

- IDEA Module SDK for `:subprojects:python` resets to the project JDK on
  every Gradle sync (see ADR-0001 → consequences). Manual five-click
  re-apply via `Project Structure → Modules → :subprojects:python →
  Dependencies` until JetBrains closes the gap. Investigated workarounds
  (`iml.withXml`, cache XML snapshot/restore) all required IDE restart
  and were heavier than the manual step.
