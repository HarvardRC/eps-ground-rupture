# ADR-0014: Terraform for the AWS data layer; sanitized Athena columns mapped by ordinal

- **Status**: Accepted
- **Date**: 2026-06-11
- **Deciders**: Michael Bouzinier (requested Terraform + dev/prod modes); Claude (schema plumbing and column-sanitization design)

## Context

Production dashboards query Athena over Parquet in S3 (ADR-0003). Until
now the AWS side was manual ("paste `athena.sql` into the console" —
listed as a known gap). The owner requested a Terraform deployment with
two modes (dev / prod), AWS profile `urc`, bucket
`eps-ground-rapture-[dev|prod]`, and Athena tables over the Parquet.

Two design problems surfaced:

1. **Schema duplication.** Hand-writing Glue table columns in `.tf`
   would create a second source of truth beside the pipeline-generated
   DDL, drifting on every pipeline change (violates ADR-0007).
2. **Illegal Athena identifiers.** The raw Parquet columns include
   `Us - Ud`, `DZW xmin`, `R^2 Value` (DEM), `SS_uc+` / `SS_uc-` (SURE),
   `Location ID` (Kern). Athena does not support spaces or special
   characters in column names — the previously generated `athena.sql`
   would have failed on first real deployment. Renaming columns in the
   Parquet itself would break the existing Tableau workbook and DuckDB
   views built against the original names.

## Decision

1. **Terraform owns the AWS resources**; the **pipeline owns the schema**.
   `egr-build` emits `deploy/terraform/tables.json` (sanitized column
   names + Glue types, derived from the actual Parquet schemas);
   Terraform consumes it via `jsondecode(file(...))`. No column lists in
   `.tf`. The JSON is committed (a schema lockfile — `terraform apply`
   must work without running the pipeline first).
2. **Module + thin env roots**: `modules/data` creates the S3 bucket
   (SSE-S3, public access blocked, lifecycle expiry for
   `athena-results/`), Glue database, one Glue table per Parquet dir,
   and an Athena workgroup pinned to the results prefix. `envs/dev`
   (force_destroy, unversioned) and `envs/prod` (protected, versioned)
   instantiate it with separate local state.
3. **Column sanitization with ordinal mapping**: Athena/Glue column
   names are sanitized (`us_ud`, `ss_uc_plus`, `r_2_value`, …) and the
   Parquet SerDe maps columns by position
   (`parquet.column.index.access = true`). The Parquet keeps original
   names; each Glue column's comment records the original field name.
   The generated `athena.sql` was updated to match in column names and
   SerDe settings; database name and S3 location must still be supplied
   via `--database` / `--s3-prefix` to match a Terraform-provisioned
   environment (the defaults stay as loud `CHANGE_ME` placeholders so a
   mismatched copy-paste fails rather than silently querying an empty
   location).

## Alternatives considered

- **Glue Crawler** — no columns in TF, but a runtime moving part,
  eventual consistency, and it would register the *raw* (illegal) names.
- **Hand-written columns in `.tf`** — immediate drift risk; 245 columns
  across 4 tables today.
- **Rename columns in the Parquet (snake_case at export)** — cleanest
  long-term, but breaks the existing Tableau workbook + DuckDB views;
  deferred (noted in TODO.md as a possible future migration).
- **Terraform workspaces instead of env directories** — fewer files, but
  shared state directory and easier to apply to the wrong env; directory
  per env is the convention the owner's Java-side tooling experience maps
  to best.
- **OpenTofu** — viable drop-in; stayed with HashiCorp Terraform
  (installed via `hashicorp/tap`) as the default the owner named.

## Consequences

- `terraform apply` in `envs/dev` / `envs/prod` is the whole deployment;
  data upload stays a one-line `aws s3 sync` (data ≠ infrastructure).
- Column **order** in the Parquet is now load-bearing for Athena: a
  pipeline change that reorders/adds/removes columns requires
  `egr-build` → `terraform apply` → re-sync, in that order. All three
  derive from the same run, so the invariant is easy to keep.
- Athena names differ from the local (DuckDB/Spark) names — queries are
  not always copy-pastable across engines. Acceptable: the engines
  already differ in dialect; the unified Tableau path goes through
  views/extracts per engine anyway.
- `set` (DEM) is a reserved word in Athena and needs quoting in queries.
- Local TF state limits this to a single operator; S3 backend is the
  known upgrade path if collaborators arrive.

## References

- `deploy/terraform/` — module, env roots, README with deploy steps
- `eps_ground_rapture.register.sanitize_column` / `write_tables_json`
- ADR-0003 (Athena), ADR-0007 (pipeline-generated DDL)
