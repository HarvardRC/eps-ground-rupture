# ADR-0018: Manifest-defined uniform stage count

- **Status**: Accepted
- **Date**: 2026-11-01 (the owner's decision of the same day,
  resolving DF-5 of the DDD review; drafted with the DF-5
  correction); accepted 2026-11-01
- **Deciders**: Michael Bouzinier (project owner)
- **Amends**:
  [ADR-0013 — Row-level, trial-major columnar scenario artifact](0013-row-level-scenario-artifact.md):
  replaces its fixed 101-stage stride; its other decisions and
  amendments stand.

## Context

The current simulation ensemble contains 3,434 trials with 101 stages
each. ADR-0013 uses that measured stage count as the query stride. The
export validation that the DDD specified, however, accepted any
uniform count and recorded it as `counts.stages_per_trial` in the
artifact manifest. A different count could therefore have passed
export validation while a query using stride 101 read across trial
boundaries.

The owner selected a manifest-defined uniform count when resolving
[DF-5 — Stage count and stride](../app/ddd-review.md#deferred-finding-discussion-2026-11-01)
of the DDD review. This accommodates future ensembles with a
different number of stages without introducing per-trial offsets or
changing the scientific records. The application and its schema-1
artifact have not yet been published, so this decision fixes schema 1
before its first publication; it is not a compatibility claim for a
previously shipped fixed-stride client.

## Decision

Schema 1 uses one stage count **N per data vintage**, measured from the
source records and stored as `counts.stages_per_trial`. Every trial in
that vintage has exactly N stages. N is an integer of at least 2, so
each trial has a consecutive-stage interval and the existing
`stage_spacing` minimum, maximum, and mean are defined. There is at
least one trial, and the record count equals `trials * N`. All three
counts are integers no greater than 4,294,967,295, the largest value
that the binary header's unsigned 32-bit record and trial counts can
hold; the header is unchanged and does not carry N, which only the
manifest records.

The exporter measures and validates these counts; it rejects an empty
ensemble, a trial with fewer than two stages, unequal trial lengths,
or counts outside the format's bounds. It never pads, drops,
interpolates, or resamples records to make an ensemble fit. Stages
remain strictly ordered by slip within each trial, with no repeated
slip value; equal counts do not require equal slip spacing.

The decoder validates the manifest's count bounds and product
identity, the header's agreement, and block lengths before
constructing usable views. After the DDD's snake_case-to-camelCase
field mapping, the browser obtains N from `counts.stagesPerTrial`.
Trial t occupies the half-open interval `[t * N, (t + 1) * N)`; its
final stage is `(t + 1) * N - 1`. Querying and downloads use these
boundaries, and reference generation uses each trial's own run of N
stages; none uses the current dataset's literal 101.

All other decisions and accepted amendments of ADR-0013 stand
unchanged. Among them: the artifact carries every approved record in
trial-major columnar arrays; site conditions are stored once per
trial; only scalar side-values are precomputed; encodings preserve the
recorded precision; nulls are sentinels and negative measurements are
carried as-is; the trial table reserves a model-family dimension; and
at 3D scale the partition is one artifact per model family. No
additional binary block is introduced. The DDD continues to fix the
encoding and layout details.

Different lengths within one vintage are not supported by this
schema. Such data need a separately specified representation and its
validation. This does not prescribe the format of future 3D data.

## Alternatives considered

- **Require 101 stages.** This is the smallest correction and would
  reject an accidentally shortened current ensemble. It also rejects
  legitimate future ensembles with a different uniform count. The
  owner preferred the modest flexibility of a measured count.
- **Allow different lengths per trial.** Per-trial offsets or lengths
  would support irregular ensembles, but add format and validation
  work and require consideration of unequal representation in the
  all-stages population. No current requirement calls for it.

## Consequences

- The existing manifest field carries the count, and the current
  101-stage dataset keeps its layout and results. The browser's index
  arithmetic uses N throughout; the pipeline's reference generator
  takes each stage's position from its own trial's run, so parity
  also checks the layout and N.
- Format validity and dataset completeness remain separate checks.
  The current ensemble's full-data checks retain 3,434 trials,
  346,834 records, and 101 stages. General schema support for 100
  stages does not establish that a 100-stage copy of this ensemble is
  complete or scientifically approved.
- Planned tests cover multiple uniform counts, trial boundaries,
  last-stage selection, and malformed counts; the DDD and IP specify
  the cases. The pipeline remains the calculation authority, and
  pipeline-to-client parity checks the client against it.
- Larger valid ensembles still must meet the payload and performance
  budgets. A flexible count provides no exemption from those checks.
- ADR-0013 stays Accepted; its dated amendment of 2026-11-01 points
  here. The HLDD, DDD, and IP use this count rule with the rest of
  that architecture.

## References

- [ADR-0013 — Row-level, trial-major columnar scenario artifact](0013-row-level-scenario-artifact.md).
- [HLDD §5.2 — Simulation data organization (ADR-0013)](../app/hldd.md#52-simulation-data-organization-adr-0013).
- [HLDD §5.3 — Records rather than precomputed summaries (ADR-0013)](../app/hldd.md#53-records-rather-than-precomputed-summaries-adr-0013).
- [DDD §3.1 — Scenario artifact binary layout](../app/ddd.md#31-scenario-artifact-binary-layout).
- [DDD §3.2 — Artifact manifest](../app/ddd.md#32-artifact-manifest).
- [DDD §4.1 — Export task and validation](../app/ddd.md#41-export-task-and-validation).
- [DDD §5.2 — Artifact loading and decoding](../app/ddd.md#52-artifact-loading-and-decoding).
- [DDD §5.3 — Query engine](../app/ddd.md#53-query-engine).
- [DDD review ledger — Deferred-finding discussion (2026-11-01)](../app/ddd-review.md#deferred-finding-discussion-2026-11-01).
