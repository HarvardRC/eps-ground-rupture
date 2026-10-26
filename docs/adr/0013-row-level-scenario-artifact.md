# ADR-0013: Row-level, trial-major columnar scenario artifact

- **Status**: Proposed
- **Date**: 2026-10-15 (drafted with the HLDD, `docs/app/hldd.md`)
- **Deciders**: Michael Bouzinier (project owner)

## Context

DR-1 left open whether the product's data is precomputed aggregations,
compact row-level data, or a combination. The scenario space cannot be
pre-aggregated: multi-selects over 7 fault dips, 9 sediment
arm×strength states, 3 depths, 3 densities, 64 scarp-type subsets, and
two populations, crossed with a continuous slip window (PDD §3),
explode combinatorially — and FR-O2's percentiles are order statistics
that do not compose from partial aggregates. The ensemble's geometry
is verified and regular: 3,434 trials × exactly 101 recorded stages =
346,834 records, with every site condition constant within a trial.
The budgets: data payload ≤ 4 MB compressed; scenario change ≤ 200 ms
at the 95th percentile (PDD §9.1). Keeping enough record-level detail
for arbitrary filters within the 4 MB payload budget is the tension R-16
names, and DR-6 requires the export format to meet that budget without
preventing the combined filtering.

## Decision

The scenario artifact is **row-level, trial-major, and columnar**; the
client computes every count and statistic from it
([ADR-0010](0010-native-client-side-scenario-app.md)); only scalar
side-tables are precomputed (regression coefficients, manifest
ranges).

- **Trial table** (3,434 rows): fault dip, sediment arm and strength
  label, depth, density, and a model-family dimension reserved for the
  on-hold 3D arm (DR-7) — about 6 bytes per trial, ≈ 21 KB.
- **Stage arrays** (346,834 entries; each trial owns a contiguous
  101-stage run): slip, scarp height, deformation-zone width, scarp
  dip, scarp class. Slip (1,797 distinct values), scarp height, and
  width fit 16-bit scaled integers losslessly at the export's recorded
  precision, with explicit null sentinels. Scarp dip, recorded at
  0.001°, does not — its −12.529–89.765° range needs 102,295 steps —
  so that column is float32, a 16-bit dictionary over its 35,854
  distinct values, or a display-justified coarser scale (PDD D-23);
  the DDD decides under the SC-3 parity rule. At 9–11 bytes per
  record: ≈ 3.12–3.82 MB raw beside the ≈ 21 KB trial table;
  measured ≈ 0.84–1.07 MB gzipped.
- **JSON manifest**: export version and date; record and trial counts;
  per-column minima, maxima, and recording step; label dictionaries in
  canonical order, including the scarp-class palette re-emitted from
  `config.py` (FR-G2); null sentinel definitions; checksums; the
  paired reference-results version.
- Nulls are sentinels, never dropped rows — the PDD §3 two-count model
  and the FR-O2 excluded-null line need them. Negative measurements
  are carried as-is per the pipeline's DR-4 hygiene policy.

Query shape: a per-trial condition mask (3,434 tests), then a
stride-101 scan of the stage arrays for window, population, class
filter, and the valid/null split; sorting matched values for
percentiles is the dominant cost and stays inside the 200 ms budget at
full-ensemble size.

## Alternatives considered

- **Precomputed aggregate matrix** — combinatorially impossible for
  this input space, and percentiles do not compose; it would also
  freeze the PDD's filter semantics into the export format.
- **Hybrid (aggregates plus rows)** — the row-level artifact already
  fits the budget even raw, so the added schema buys nothing.
- **JSON or CSV rows** — several times the binary size before
  compression, plus a parse step on every load; typed-array views need
  neither.
- **DuckDB-wasm / SQLite-wasm** — a multi-megabyte engine against
  NFR-3's weight rule, to serve one fixed scan pattern.

## Consequences

- Any scenario is answered in one linear pass: no query planner, no
  indexes, no cache invalidation.
- Exact field encodings, scales, endianness, and layout are DDD
  material under the SC-3 parity rule; the dip-column encoding is the
  one named decision left open for the DDD.
- At 3D scale, if the ensemble grows several-fold, a single artifact
  stops fitting the budgets; the partition is per model family
  ([ADR-0014](0014-committed-content-hashed-artifacts.md)).

## References

- `docs/app/hldd.md` §5.2–§5.3, §7.1 — the design detail and the
  measured sizes
- `docs/app/pdd.md` §3 (two-count model), §10.1 (closing note on tolerance)
- `subprojects/python/src/eps_ground_rupture/config.py`
  (`SCARP_CLASS_PALETTE`)
