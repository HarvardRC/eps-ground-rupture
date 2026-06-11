# TODO

Open work items that aren't tracked elsewhere (ADRs, git history, dashboard
specs). Add new entries here rather than scattering them across files.

## Data pipeline

### Replace pre-cleaned FDHI CSV with raw flatfile + in-pipeline cleaning
- **Current state**: `subprojects/python/src/eps_ground_rapture/io.py::load_fdhi`
  reads `data/raw/FDHI_Cleaned_Measurements.csv` directly. That CSV is a
  cleaned ~20-row extract produced by the prior owner's `legacy/FDHI-SURE-DEM_SCATTER.py`,
  not a pipeline-managed artifact.
- **What to do**: download the raw FDHI flatfile from UCLA Dataverse —
  DOI `10.25346/S6/Y4F9LJ`, file `ABRP7B` (version 1.4 at time of writing).
  Add it to `data/raw/` as `02_FDHI_FLATFILE_MEASUREMENTS_<date>.csv`.
  Re-add a `prep.clean_fdhi` matching the prior owner's updated filter
  chain: reverse / reverse-oblique style, positive vs_*/sh_* measurements,
  `0 < fzw_central_meters < 50`, usage flag in {Check, Keep}.
  Note this is *not* the same as the legacy notebook's chain — the
  `rupture_rank == 'Principal'` filter was dropped in the new version.
- **Why now is fine without it**: pre-cleaned CSV is sufficient for v1
  dashboards. The pipeline-side cleaning is a reproducibility / freshness
  concern, not a feature concern.

### Optional: incorporate the 3D DEM datasets when files arrive
- The prior owner's updated script also references `combinedCases123_v2.csv`
  (3D DEM Cases 1–3) and `combinedCase4_v2.csv` (3D DEM Case 4). Neither
  is in `data/raw/` yet. They're not blockers for v1 — the legacy 2D DEM
  analyses still work — but adding them would let dashboards reproduce the
  full multi-DEM scatter overlay in `legacy/FDHI-SURE-DEM-2D-3D-Scatter_ONLY.pdf`.

### Consider snake_case column names at export time
- Athena columns are now sanitized versions of the Parquet names, mapped
  by ordinal position (ADR-0014). The cleaner long-term story is to emit
  snake_case names from `export_tidy` itself so every engine sees the
  same identifiers — but that breaks the existing Tableau workbook and
  DuckDB views, so it's a coordinated migration: rename at export →
  regenerate views/DDL/tables.json → repoint the workbook. Do it when
  there's a natural breaking-change moment (e.g. the FDHI raw-flatfile
  switch above).

## Deployment

- Terraform for S3 + Glue + Athena exists under `deploy/terraform/`
  (ADR-0014). Not yet applied to the AWS account — first
  `terraform apply` (dev) + `aws s3 sync` + Athena smoke query still to
  be run by the owner.
- Local TF state; move to an S3 backend if collaborators arrive.

## Dashboards

- `dashboards/tableau/dem-overview.twb` holds Dashboard 1 + Viable
  Combinations; Superset YAML exports still absent.

## Tooling friction (open JetBrains issue)

- IDEA Module SDK for `:subprojects:python` resets to the project JDK on
  every Gradle sync (see ADR-0013 → known limitations). Manual five-click
  re-apply via `Project Structure → Modules → :subprojects:python →
  Dependencies` until JetBrains closes the gap. Investigated workarounds
  (`iml.withXml`, cache XML snapshot/restore) all required IDE restart
  and were heavier than the manual step.
