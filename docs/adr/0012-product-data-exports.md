# ADR-0012: Purpose-built product exports feed the scenario app

- **Status**: Proposed
- **Date**: 2026-10-15 (drafted with the HLDD, `docs/app/hldd.md`)
- **Deciders**: Michael Bouzinier (project owner)

## Context

DR-1 names the pipeline the single computational source of truth and
rules out `dem.csv` as the product's data source — the 73 MB
Tableau-compatibility export whose shape serves the workbook lane
([ADR-0006](0006-csv-extracts-for-tableau-public.md)), not a browser —
and DR-6 forbids making readers download it.
The product needs compact, product-shaped, versioned data; the field
compilations need the PDD §4.4 analogue mapping and DR-5 name
normalization; media need per-item provenance and a release gate
(NFR-6, R-12–R-14); the conversion assist needs the regression
coefficients (FR-S5); and the test architecture needs golden-scenario
references (PDD §10.2).

## Decision

The pipeline gains **product-facing DuckDB views** (in `views.py`,
beside the dashboard views of
[ADR-0003](0003-duckdb-as-the-analytical-engine.md)) and an export
task that writes **five product artifacts**:

| Artifact | Content |
|---|---|
| Scenario artifact | The full ensemble, product-shaped — binary + manifest ([ADR-0013](0013-row-level-scenario-artifact.md)) |
| Field export | One row per field measurement: source compilation, event, the measurement with its source-specific analogue kind (PDD §4.4), units, the sub-50 m criterion flag, labeled-event-set membership, provenance |
| Regression export | Per-dip conversion slopes with provenance ([ADR-0015](0015-golden-scenario-parity.md)) |
| Reference results | Golden-scenario numbers at full precision (ADR-0015) |
| Media index | Animation/photo inventory: scarp type illustrated, attribution, permission status, caption |

- The field export is normalized **in the pipeline** (the sources are
  already in the export lane: `fdhi_cleaned.csv`, `kern_combined.csv`,
  `sure_enriched.csv`, `historic_events.csv`); the Kern data group and
  principal-width questions stay open with the research group (PDD
  D-6), and the export carries the slot either way.
- The media index makes availability and permissions **data
  conditions, not code branches**: "Animation not yet available"
  (R-13) and the third-party photo release gate (R-12: usable in the
  working tree during development, excluded from release until
  permissions are documented) both read from it. The research group
  supplies the animations and photographs (PDD D-8); the owner gates
  the release.
- A data refresh is a product release (PDD §9.4): the export task
  writes the artifacts, manifest, and references together so they can
  never diverge ([ADR-0014](0014-committed-content-hashed-artifacts.md)).

## Alternatives considered

- **Reuse `dem.csv`** — 73 MB against a 4 MB payload budget;
  Tableau-shaped; DR-1 and DR-6 rule it out.
- **Reuse the `dist/csv` lane as-is** — those exports are gitignored,
  machine-local build artifacts by design (ADR-0006); the product
  needs committed, versioned, product-shaped files (ADR-0014).
- **Normalize field data in the app** — moves DR-5 logic out of the
  tested pipeline into TypeScript, splitting the source of truth that
  DR-1 establishes.
- **No media index** — availability and permission states become
  hardcoded page branches, and the release gate becomes a manual
  search instead of a data check.

## Consequences

- The pipeline grows product views and tests exactly as the dashboard
  lane did; the `egr-csv` pattern extends rather than changes.
- Five committed artifacts, delivered per ADR-0014.
- The app never parses research-shaped data: every product file is
  purpose-shaped and small, except the scenario artifact, which is
  purpose-shaped and measured (ADR-0013).

## References

- `docs/app/hldd.md` §5.1, §5.5, §6.2 — the design detail
- `subprojects/python/src/eps_ground_rupture/views.py`, `export.py`,
  `csvexport.py`; `subprojects/python/build.gradle.kts` (`csvViews`)
