# ADR-0015: Golden-scenario references and a pipeline↔client parity harness

- **Status**: Proposed
- **Date**: 2026-10-15 (drafted with the HLDD, `docs/app/hldd.md`)
- **Deciders**: Michael Bouzinier (project owner)

## Context

The product puts a second implementation of the project's statistics
into the world: the pipeline computes in Python and DuckDB
([ADR-0003](0003-duckdb-as-the-analytical-engine.md)), the app in
TypeScript ([ADR-0011](0011-webapp-toolchain.md)). Two implementations
drift unless something pins them together, and DR-1 says the pipeline
is the single computational source of truth. SC-3 sets the bar:
displayed statistics equal the correspondingly rounded pipeline
references exactly, and the parity tests compare full-precision
values within the PDD §10.1 tolerance. CI cannot run the pipeline
(R-17), so the references must themselves be committed artifacts.

## Decision

**The pipeline pins every number the reader sees.**

- The pipeline computes the eight golden scenarios **GS-0–GS-7** (PDD
  §10.2) — matching-record counts, per-measurement valid and
  excluded-null counts, and the full FR-O2 statistic set — at full
  precision, and writes them as a **versioned reference artifact**
  paired to the scenario artifact
  ([ADR-0012](0012-product-data-exports.md)).
- Three consumers: pipeline pytest contracts pin the product views;
  the **webapp parity job** (in `tests.yml`) replays every golden
  scenario through the client query engine, headlessly in Node against
  the committed artifacts, and compares within the tolerance; and the
  acceptance walkthroughs (PDD §10.3) read the same numbers.
- The DR-3 one-state view (the last stage inside the window, per
  trial) is implemented and tested **pipeline-first** — 3,434 trials,
  no max-slip ties, both verified against the current export — so the
  client's selection rule always has a pipeline twin to agree with.
- **Nothing displayed is hardcoded.** The offset-to-slip assist uses
  per-dip regression slopes from the pipeline's regression export —
  the relationship the dashboards already publish and
  `test_regression_views.py` already pins (0.5021 at 30°, 0.6453 at
  40°) — with slope, dip, and provenance carried in the export so the
  PDD §5.6 copy can cite it. The scarp-class palette and canonical
  order reach the app only through the manifest, re-emitted from
  `config.py`'s `SCARP_CLASS_PALETTE` (FR-G2). Ranges and steps come
  from the manifest ([ADR-0013](0013-row-level-scenario-artifact.md)).

## Alternatives considered

- **Bit-exact equality instead of a tolerance** — unrealistic across
  DuckDB, pandas, and JavaScript float paths; the PDD §10.1 tolerance
  note is the contract for a reason.
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
- A new displayed statistic must land in the reference generator
  first — a deliberate pipeline-first discipline.
- Golden scenarios double as acceptance-walkthrough material; a parity
  failure blocks merge in `tests.yml`.

## References

- `docs/app/hldd.md` §5.6, §5.7, §9 — the design detail
- `docs/app/pdd.md` §10 — golden scenarios and the tolerance note
- `subprojects/python/tests/test_regression_views.py`;
  `subprojects/python/src/eps_ground_rupture/config.py`
