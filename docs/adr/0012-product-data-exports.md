# ADR-0012: Purpose-built product exports feed the scenario app

- **Status**: Accepted
- **Date**: 2026-10-15 (drafted with the HLDD, `docs/app/hldd.md`); rewritten in plain language and accepted 2026-10-28
- **Deciders**: Michael Bouzinier (project owner)

## Context

The product needs compact, versioned data files made for it, because
the files the pipeline already writes serve other consumers.

The pipeline's one full-detail export is `dem.csv`: 73 MB, shaped for
the Tableau workbooks
([ADR-0006 — CSV exports feed the published
workbooks](0006-csv-extracts-for-tableau-public.md)), not for a
browser. Two requirements rule it out for the product:
[DR-1 — Controlled data
source](../app/prd.md#dr-1-controlled-data-source) names the pipeline
the single computational source of truth and rules out `dem.csv` as
the product's primary data source, and
[DR-6 — Payload and interaction
support](../app/prd.md#dr-6-payload-and-interaction-support) rules out
an initial page load that requires downloading it or any comparably
large payload.

Each product surface also has needs of its own:

- The field measurements need the analogue mapping of
  [PDD §4.4 — Field overlay (FR-O5, D-18
  Proposed)](../app/pdd.md#44-field-overlay-fr-o5-d-18-proposed) —
  which measurement from each source compilation stands in for which
  simulated quantity — and the name normalization of
  [DR-5 — Field-data
  preparation](../app/prd.md#dr-5-field-data-preparation).
- The photographs and animations need per-item provenance and a
  release gate: [NFR-6 — Licensing](../app/prd.md#nfr-6-licensing),
  and the media risks
  [R-12–R-14](../app/prd.md#93-content-and-media-dependencies) (photo
  permissions unresolved; animations may not cover all six scarp
  types; measurement-process media may not materialize).
- The conversion assist — the control that turns an entered surface
  offset into fault slip — needs the regression coefficients
  ([FR-S5 — Displacement
  window](../app/prd.md#fr-s5-displacement-window)).
- The test architecture needs reference numbers to compare the app
  against
  ([PDD §10.2 — Golden scenarios](../app/pdd.md#102-golden-scenarios)).

> **Amendment 2026-10-28.** ADR-0014 was reworked at the owner's
> review after this record was accepted: the five artifacts are stored
> as GitHub release assets and pinned from the repository by a
> committed manifest, not committed as files. Where this record says
> "committed, versioned" or "committed artifacts", read "versioned and
> pinned from git". The artifacts, their shapes, and the export task
> are unchanged.

## Decision

**The pipeline gains five new outputs, written for the product.** They
are produced the way the dashboard exports already are: new saved
queries (DuckDB **views**, in `views.py`, beside the dashboard views
of [ADR-0003 — DuckDB views as the single analytical
engine](0003-duckdb-as-the-analytical-engine.md)) shape the data, and
a new export task writes it out as the five files below.

| Artifact | Content |
|---|---|
| Scenario artifact | The complete simulation dataset, packed for the browser: every record of the ensemble (3,434 trials × 101 slip stages) in one binary file, plus a JSON manifest that describes it — counts, value ranges, labels, checksums. The packing is [ADR-0013 — Row-level, trial-major columnar scenario artifact](0013-row-level-scenario-artifact.md) |
| Field export | One row per measurement taken **in the field at a real earthquake** (the FDHI, SURE, and Kern County compilations): source compilation, event, the measurement with its source-specific analogue kind ([PDD §4.4](../app/pdd.md#44-field-overlay-fr-o5-d-18-proposed)) — which simulated quantity it stands in for — units, the sub-50 m criterion flag, labeled-event-set membership, provenance |
| Regression export | The conversion slope for each fault dip, used by the offset-to-slip assist, with provenance ([ADR-0015 — Golden-scenario references and a pipeline↔client parity harness](0015-golden-scenario-parity.md)) |
| Reference results | The correct answers for the eight **golden scenarios** — fixed, named test scenarios whose results the pipeline computes at full precision, so the app's own calculations can be checked against them (ADR-0015) |
| Media index (P2) | The inventory of animations and photographs: which scarp type each illustrates, attribution, permission status, caption |

- The field data is normalized — made consistent across the source
  compilations — **in the pipeline**, not in the browser. The sources
  are views already in the dashboard lane: `fdhi_cleaned`,
  `kern_combined`, `sure_enriched`, `historic_events`. Two questions
  stay open with the research group — which Kern County data group to
  use, and the principal-width rule
  ([PDD D-6](../app/pdd.md#1-decision-register)) — and the export
  keeps a column for the answer either way, so a later decision
  changes data, not the file format.
- The media index makes availability and permissions **data
  conditions, not code branches**. "Animation not yet available"
  ([R-13](../app/prd.md#93-content-and-media-dependencies)) and the
  third-party photo release gate
  ([R-12](../app/prd.md#93-content-and-media-dependencies): usable in
  the working tree during development, excluded from release until
  permissions are documented) are both read from the index rather than
  written into page code. The research group supplies the animations
  and photographs ([PDD D-8](../app/pdd.md#1-decision-register)); the
  owner gates the release. The index is a
  **[P2](../app/prd.md#22-mvp-and-delivery-priorities) export** (the
  second delivery priority, after the MVP) — every surface that reads
  it (the morphology and measurement pages, the animation offers) is
  P2 — so the MVP (v0.3) ships the other four artifacts.
- A data refresh is a product release
  ([PDD §9.4 — Releases](../app/pdd.md#94-releases)): the export task
  writes the artifacts, manifest, and reference results together, so
  they can never disagree
  ([ADR-0014 — Product artifacts in release assets, pinned by a
  committed manifest](0014-committed-content-hashed-artifacts.md)).

## Alternatives considered

- **Reuse `dem.csv`** — 73 MB against a 4 MB payload budget, and
  shaped for Tableau rather than a browser; DR-1 and DR-6 rule it out.
- **Reuse the `dist/csv` exports as they are** — deliberately
  machine-local, uncommitted build artifacts (ADR-0006); the product
  needs committed, versioned, product-shaped files (ADR-0014).
- **Normalize the field data in the app** — would move the DR-5 rules
  out of the tested Python pipeline into TypeScript, splitting the
  single source of truth that DR-1 establishes.
- **No media index** — availability and permission states would become
  hardcoded page branches, and the release gate would become a manual
  search instead of a data check.

## Consequences

- The pipeline grows product views and their tests exactly as the
  dashboard lane did; the `egr-csv` pattern extends rather than
  changes.
- Five committed artifacts (four from the MVP, the media index from
  P2), delivered and licensed per ADR-0014.
- The app never parses research-shaped data: every product file is
  shaped for its purpose and small — except the scenario artifact,
  which is shaped for its purpose and measured (ADR-0013).

## References

- [HLDD §5.1 — Application data exports, not `dem.csv`
  (ADR-0012)](../app/hldd.md#51-application-data-exports-not-demcsv-adr-0012),
  [HLDD §5.5 — Field-data
  export (ADR-0012)](../app/hldd.md#55-field-data-export-adr-0012),
  and [HLDD §6.2 — Media architecture
  (ADR-0012)](../app/hldd.md#62-media-architecture-adr-0012) — the
  design detail
- `subprojects/python/src/eps_ground_rupture/views.py`, `export.py`,
  `csvexport.py`; `subprojects/python/build.gradle.kts` (`csvViews`)
