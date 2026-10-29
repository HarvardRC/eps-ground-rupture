# ADR-0015: Golden-scenario references and a pipeline↔client parity harness

- **Status**: Accepted
- **Date**: 2026-10-15 (drafted with the HLDD, `docs/app/hldd.md`); rewritten in plain language and accepted 2026-10-28
- **Deciders**: Michael Bouzinier (project owner)

## Context

The product puts a second implementation of the project's statistics
into the world. The pipeline computes them in Python and DuckDB
([ADR-0003 — DuckDB views as the single analytical
engine](0003-duckdb-as-the-analytical-engine.md)); the app recomputes
them in the reader's browser, in TypeScript
([ADR-0011 — Webapp toolchain — TypeScript + esbuild, no framework,
SVG charts](0011-webapp-toolchain.md)). Two
implementations of the same formulas drift apart unless something pins
them together, and
[DR-1 — Controlled data
source](../app/prd.md#dr-1-controlled-data-source) says which one is
right: the pipeline is the single computational source of truth.

[SC-3 (correctness)](../app/pdd.md#101-success-criteria) sets the bar:
every displayed statistic must equal the pipeline's reference value,
rounded the same way, exactly — and the parity tests also compare the
full-precision values, within the small per-calculation tolerance that
the closing note of
[PDD §10.1 — Success criteria](../app/pdd.md#101-success-criteria)
allows for floating-point arithmetic. One constraint shapes the
mechanics: continuous integration cannot run the pipeline, because the
raw inputs are local-only
([R-17](../app/prd.md#94-delivery-and-technical-risks)) — so the
reference numbers must themselves be pinned artifacts that CI fetches
and verifies without running the pipeline.

## Decision

**Every number the reader sees traces back to the pipeline, and tests
enforce the tracing.** The app computes only from pipeline-exported
data; its constants arrive only through pipeline-written files, never
hardcoded; and its calculations are compared against the pipeline's
own answers, so the two implementations cannot drift apart unnoticed.

- The pipeline computes the eight **golden scenarios GS-0–GS-7**
  ([PDD §10.2 — Golden
  scenarios](../app/pdd.md#102-golden-scenarios)) — fixed, named
  scenario settings whose correct answers the pipeline computes and
  stores, so other implementations can be checked against them. For
  each: the
  matching-record count, the per-measurement valid and excluded-null
  counts, and the full set of
  [FR-O2 — Summary
  statistics](../app/prd.md#fr-o2-summary-statistics), all at full
  precision. They are written as a **versioned reference artifact**
  paired to the scenario artifact
  ([ADR-0012 — Purpose-built product exports feed the scenario
  app](0012-product-data-exports.md)).
- **Exported data and calculations are verified separately**, so a
  failure points at its cause. The export task re-reads the artifact it has
  just written and compares every record and value with the pipeline
  view it came from — catching packing mistakes at the source — before
  writing the manifest; CI then verifies the committed manifest's
  checksums against the fetched files
  ([ADR-0014 — Product artifacts in release assets, pinned by a
  committed manifest](0014-committed-content-hashed-artifacts.md)). The
  golden scenarios verify the calculations.
- The references have **three consumers**: the pipeline's pytest
  contracts pin the product views; the **webapp parity job** (in
  `.github/workflows/tests.yml`) replays every golden scenario through
  the client query engine — headlessly in Node, against the fetched,
  checksum-verified artifacts — and compares full-precision values
  within the tolerance
  and display-rounded values exactly; and the acceptance walkthroughs
  ([PDD §10.3 — Acceptance
  walkthroughs](../app/pdd.md#103-acceptance-walkthroughs)) read the
  same numbers.
- The one-state view of
  [DR-3 — One-state-per-trial
  population](../app/prd.md#dr-3-one-state-per-trial-population) — for
  each trial, the record at the highest slip value within the selected
  window — is
  implemented and tested **pipeline-first**: 3,434 trials, no ties at
  maximum slip, both verified against the current export. The client's
  selection rule always has a pipeline twin to agree with.
- **Nothing displayed is hardcoded.** The offset-to-slip assist uses
  the per-dip regression slopes from the pipeline's regression export —
  the relationship the dashboards already publish, which
  `test_regression_views.py` already pins (0.5021 at 30°, 0.6453 at
  40°) — with slope, dip, and provenance carried in the export so the
  copy of
  [PDD §5.6 — Conversion assist (FR-S5,
  D-3)](../app/pdd.md#56-conversion-assist-fr-s5-d-3) can cite it.
  The scarp-class palette and its canonical order reach the app only
  through the manifest, re-emitted from `config.py`'s
  `SCARP_CLASS_PALETTE`
  ([FR-G2 — Scarp-type colors and
  identification](../app/prd.md#fr-g2-scarp-type-colors-and-identification)).
  Ranges and steps come from the manifest
  ([ADR-0013 — Row-level, trial-major columnar scenario
  artifact](0013-row-level-scenario-artifact.md)).

## Alternatives considered

- **Bit-exact equality instead of a tolerance** — unrealistic across
  DuckDB, pandas, and JavaScript floating-point paths; the PDD §10.1
  tolerance note is the contract for a reason.
- **Hand-maintained expected values in the webapp tests** — drift by
  construction; the dashboard lane already learned to pin views with
  generated fixtures instead.
- **A browser farm for end-to-end numbers** — heavy for the MVP; the
  query engine is pure and synchronous precisely so Node can drive it
  headlessly. A browser pass stays a post-MVP option.
- **Trusting the client implementation** — would quietly invert DR-1:
  the pipeline, not the app, is the source of truth the paper's
  readers are promised.

## Consequences

- Every release carries machine-checked evidence that the app agrees
  with the pipeline.
- A new displayed statistic must land in the reference generator first
  — a deliberate pipeline-first discipline.
- Golden scenarios double as acceptance-walkthrough material; a parity
  failure blocks merge in `tests.yml`.

## References

- [HLDD §5.6 — Reference results and verification
  (ADR-0015)](../app/hldd.md#56-reference-results-and-verification-adr-0015),
  [HLDD §5.7 — Conversion coefficients
  (ADR-0015)](../app/hldd.md#57-conversion-coefficients-adr-0015), and
  [HLDD §9 — Testing and release
  architecture](../app/hldd.md#9-testing-and-release-architecture) —
  the design detail
- [PDD §10 — Acceptance and
  success](../app/pdd.md#10-acceptance-and-success) — the golden
  scenarios and the tolerance note
- `subprojects/python/tests/test_regression_views.py`;
  `subprojects/python/src/eps_ground_rupture/config.py`
