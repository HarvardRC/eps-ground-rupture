# ADR-0013: Row-level, trial-major columnar scenario artifact

- **Status**: Accepted
- **Date**: 2026-10-15 (drafted with the HLDD, `docs/app/hldd.md`); rewritten in plain language and accepted 2026-10-28
- **Deciders**: Michael Bouzinier (project owner)

## Context

The scenario page answers any combination of site conditions a reader
picks. The question this ADR settles: what, exactly, is in the data
file the page loads — precomputed answers, or the records themselves?

Precomputed answers are impossible here.
[DR-1 — Controlled data
source](../app/prd.md#dr-1-controlled-data-source) left the choice
open (precomputed aggregations, compact row-level data, or a
combination), but the scenario space decides it: multi-selects over 7 fault dips, 9 sediment
arm-and-strength states, 3 depths, 3 densities, 64 scarp-type subsets,
and two populations, crossed with a continuous slip window
([PDD §3 — Scenario page:
inputs](../app/pdd.md#3-scenario-page-inputs)), make far too many
combinations to compute in advance. And the percentiles of
[FR-O2 — Summary statistics](../app/prd.md#fr-o2-summary-statistics)
are order statistics: a percentile of a combined group cannot be
assembled from the percentiles of its parts, so partial summaries
would not even help.

So the records must ship. The ensemble's geometry is verified and
regular — 3,434 simulation trials, each recorded at exactly 101 stages
of slip: 346,834 records, with every site condition constant within a
trial.
The budgets it must fit
([PDD §9.1 — Performance budgets (D-9,
Proposed)](../app/pdd.md#91-performance-budgets-d-9-proposed)): a data
payload of at most 4 MB compressed, and a scenario change rendered
within 200 ms at the 95th percentile.
[R-16](../app/prd.md#94-delivery-and-technical-risks) names exactly
this tension — enough record-level detail for arbitrary filters inside
a strict payload budget — and
[DR-6 — Payload and interaction
support](../app/prd.md#dr-6-payload-and-interaction-support) requires
the export format to meet the budget without preventing the combined
filtering.

> **Amendment 2026-10-28 (review adopted by the owner).** The scarp-dip
> encoding options below are tightened: the selected encoding must
> preserve the pipeline's recorded precision for filtering, statistics,
> and downloads — rounding for display (PDD D-23) is a separate
> operation that never reduces stored precision — so the
> "display-justified coarser scale" option is withdrawn, and the named
> candidates are a wider scaled integer or a dictionary with a 16-bit
> per-record index (float32 is no longer named: a binary float suggests
> exact decimal storage, which it does not guarantee). The size figures
> below are measurements of candidate layouts; dictionary tables and
> the artifact manifest count toward the selected representation's
> total, which the DDD reports. HLDD §5.2 carries the full wording.

> **Amendment 2026-10-29 (owner review of HLDD §5).** Within each
> trial's contiguous run, stages are stored in ascending slip order,
> with no slip value repeated within a trial (verified in the current
> export: 3,434 trials, no within-trial slip ties), and the export
> task's validation checks this ordering. It makes the "last stage
> within the window" wording of FR-S6 equivalent to DR-3's rule — the
> record at the highest slip value within the selected window. HLDD
> §5.2 and §5.6.

## Decision

The scenario artifact ships **every record, organized for fast
scanning**; the client computes every count and statistic from it
([ADR-0010 — Ground Rupture Explorer is a native client-side
application](0010-native-client-side-scenario-app.md)). Only scalar
side-values are precomputed (the regression slopes and the artifact
manifest's ranges). The title's three terms carry the design:

- **Row-level** — individual records, not summaries.
- **Trial-major** — records are grouped by trial: each trial's 101
  stages sit together in one contiguous run, so one scan visits each
  trial exactly once.
- **Columnar** — values are stored column by column (all slips
  together, all scarp heights together, …), each column a typed array
  the browser reads directly, with no parsing step.

The concrete layout:

- **Trial table** (3,434 rows): fault dip, sediment arm and strength
  label, depth, density, and a model-family dimension reserved for the
  on-hold 3D arm
  ([DR-7 — Future 3D
  compatibility](../app/prd.md#dr-7-future-3d-compatibility)) — about
  6 bytes per trial, ≈ 21 KB in all.
- **Stage arrays** (346,834 entries): slip, scarp height,
  deformation-zone width, scarp dip, scarp class. Slip (1,797 distinct
  values), scarp height, and width are stored as **16-bit scaled
  integers** — each value divided by its recording step gives a whole
  number that restores the recorded precision exactly — with an
  explicit **null sentinel**, a reserved value meaning "no measurement
  here". Scarp dip, recorded at 0.001°, does not fit: its −12.529° to
  89.765° range spans 102,295 steps, more than 16 bits can hold. Its
  column is therefore float32, a 16-bit dictionary over its 35,854
  distinct values, or a coarser scale justified by display precision
  ([PDD D-23 — Reader-facing display precision per
  quantity](../app/pdd.md#1-decision-register)); the DDD decides,
  under the [SC-3 (correctness)](../app/pdd.md#101-success-criteria)
  parity rule. At 9–11 bytes per record, the stage arrays run
  ≈ 3.12–3.82 MB raw beside the ≈ 21 KB trial table — inside the 4 MB
  budget even uncompressed — and measure ≈ 0.84–1.07 MB gzipped.
- **Artifact manifest** (a JSON file) — the artifact's table of
  contents: export version
  and date; record and trial counts; each column's minimum, maximum,
  and recording step; the label dictionaries in canonical order,
  including the scarp-class palette re-emitted from `config.py`
  ([FR-G2 — Scarp-type colors and
  identification](../app/prd.md#fr-g2-scarp-type-colors-and-identification));
  the null-sentinel definitions; checksums; and the version of the
  paired reference results.
- Nulls are sentinels, never dropped rows: the two-count model of
  [PDD §3](../app/pdd.md#3-scenario-page-inputs) (records matched, and
  valid values per measurement) and the FR-O2 excluded-null line both
  need to count what is missing. Negative measurements are carried
  as-is, per the pipeline's
  [DR-4 — Measurement
  hygiene](../app/prd.md#dr-4-measurement-hygiene) policy.

How a query runs: test the 3,434 trials against the selected
conditions (one mask), then scan the stage arrays in strides of 101
for the slip window, population rule, scarp-type filter, and the
valid/null split. The dominant cost is sorting the matched values for
percentiles, and it stays inside the 200 ms budget at full-ensemble
size.

## Alternatives considered

- **Precomputed aggregate matrix** — combinatorially impossible for
  this input space, and percentiles do not compose; it would also
  freeze the PDD's filter semantics into the export format.
- **Hybrid (aggregates plus rows)** — the row-level artifact already
  fits the budget even raw, so the added schema buys nothing.
- **JSON or CSV rows** — several times the binary size before
  compression, plus a parse step on every load; typed-array views need
  neither.
- **DuckDB-wasm / SQLite-wasm** — a multi-megabyte database engine to
  serve one fixed scan pattern, against the rule of
  [NFR-3 — Responsive
  interaction](../app/prd.md#nfr-3-responsive-interaction) that no
  browser-based Python runtime or comparably heavy execution
  environment may be required.

## Consequences

- Any scenario is answered in one linear pass: no query planner, no
  indexes, no cache invalidation.
- Exact field encodings, scales, endianness, and byte layout are DDD
  material under the SC-3 parity rule; the dip-column encoding is the
  one named decision left open for the DDD.
- At 3D scale, if the ensemble grows several-fold, a single artifact
  stops fitting the budgets; the partition is one artifact per model
  family
  ([ADR-0014 — Product artifacts in release assets, pinned by a
  committed manifest](0014-committed-content-hashed-artifacts.md)).

## References

- [HLDD §5.2 — Simulation data organization
  (ADR-0013)](../app/hldd.md#52-simulation-data-organization-adr-0013),
  [HLDD §5.3 — Records rather than precomputed summaries
  (ADR-0013)](../app/hldd.md#53-records-rather-than-precomputed-summaries-adr-0013),
  and [HLDD §7.1 — Budget
  arithmetic](../app/hldd.md#71-budget-arithmetic) — the design detail
  and the measured sizes
- [PDD §3 — Scenario page:
  inputs](../app/pdd.md#3-scenario-page-inputs) (the two-count model)
  and [PDD §10.1 — Success
  criteria](../app/pdd.md#101-success-criteria) (the closing note on
  tolerance)
- `subprojects/python/src/eps_ground_rupture/config.py`
  (`SCARP_CLASS_PALETTE`)
