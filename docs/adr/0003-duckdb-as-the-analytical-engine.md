# ADR-0003: DuckDB views as the single analytical engine

- **Status**: Accepted
- **Date**: evolved 2026-05-24 → 2026-08-04; recorded 2026-08-05 (old ADR-0005 described the starting point)
- **Deciders**: Claude (original proposal); Michael Bouzinier (accepted, and accepted each extension)

## Context

DuckDB entered the project as a convenience — an embedded engine for
tests and ad-hoc checks, "the value is the option, not the usage." The
Tableau Public pivot ([ADR-0005](0005-tableau-public-as-the-publication-channel.md))
then removed every server engine from the delivery path, and the option
became the architecture.

Two pressures made views-in-DuckDB the right center:

1. Published dashboards are fed by **static CSV exports**
   ([ADR-0006](0006-csv-extracts-for-tableau-public.md)) — something must
   define, reproducibly, what goes in them.
2. Some dashboards need **derived analytics** (per-dip OLS fits and
   back-projected slips for the regression dashboard). Computing those in
   Tableau calculated fields would make them untestable; the project's
   rule is that any number a reader sees must be pinned by a test.

## Decision

All tabular products are **DuckDB SQL views over the tidy Parquet**
(`data/processed/<table>/`), defined in
`eps_ground_rupture.views` and materialized into a views-only database
file (`dashboards/duckdb/eps.duckdb`, gitignored, rebuilt by `egr-build`):

- normalization views (`unified_observations`, `sure_enriched`, per-source
  projections), and
- analytical views (`dem_regression`, `dem_regression_lines`,
  `kern_inferred_slip`) using DuckDB's `regr_slope`/`regr_intercept`/`regr_r2`.

Every analytical view gets a **pinned test**
(`tests/test_regression_views.py` pins coefficients, counts and inferred
ranges to fixed expected values), so the numbers on the dashboards and the
companion site are the numbers the test suite asserts. Views that the
parked AWS lane would need have Athena/Trino twins in the same module
(kept compiling, unused — see [Dead ends](dead-ends.md)).

## Alternatives considered

- **pandas transforms in the pipeline** — works, but logic written as SQL
  views ports to any engine (the Athena twins fell out almost for free)
  and keeps one declarative definition per product.
- **Tableau-side calculations** — untestable, invisible to the repo, and
  Tableau cannot express per-group regression cleanly; rejected as a home
  for anything a test should pin.
- **Spark / Athena as the view engine** — the servers the pivot removed;
  nothing on the delivery path can query them.

## Consequences

- One `egr-build` gives identical view results on any machine, offline,
  in CI — no services.
- The CSV exports ([ADR-0006](0006-csv-extracts-for-tableau-public.md))
  are exactly "a view, written out": adding a dashboard's data means
  adding a view + test + export line.
- Desktop workbooks can also connect to `eps.duckdb` directly via the
  DuckDB driver — useful for authoring even though the published twins
  use CSV extracts.
- Fits shown on dashboards are computed here, not in the browser or the
  workbook — a deliberate authorial choice the companion site documents.

## References

- `subprojects/python/src/eps_ground_rupture/views.py`
- `subprojects/python/tests/test_regression_views.py`
- `dashboards/duckdb/README.md`
- `notes/dashboard-4-build-spec.md` — the pinned coefficient table
