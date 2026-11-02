# ADR-0019: Release-based data identity

- **Status**: Accepted
- **Date**: 2026-11-01 (the owner's decision of the same day,
  resolving DF-3 of the DDD review; drafted with the DF-3
  correction); accepted 2026-11-01
- **Deciders**: Michael Bouzinier (project owner)
- **Amends**:
  [ADR-0014 — Product artifacts in release assets, pinned by a committed manifest](0014-committed-content-hashed-artifacts.md):
  replaces its commit-based data-identity wording; its other
  decisions and amendments stand.

## Context

ADR-0014 stores generated data in release assets and commits only a
pointer manifest. Its consequence that every deployed vintage is
"pinned by a commit" conflates the software revision carrying that
pointer with the identity of the data it selects. The evidence ledger
of the release record, as first drafted in
[DDD §7.7 — Site validation and release checklist](../app/ddd.md#77-site-validation-and-release-checklist),
repeated that conflation by requiring data checks to name a commit as
their subject.

The owner clarified that data is pinned to releases. A release is
associated with a tag, but a tag alone does not establish that a
release exists or has been published. The owner separately retained
the exporter's source commit solely as code provenance.

## Decision

A data vintage is identified by its **published dedicated data
release in this repository and its exact assets**. The data release
is the GitHub prerelease that ADR-0014 prescribes. The pointer's
`data_tag` locates that release in `HarvardRC/eps-ground-rupture`;
its `files` map fixes every asset filename and full SHA-256 checksum.
Together these identify the selected data. No Git commit identifies
or pins a data vintage. A bare Git tag, a draft release, and a
published release not marked as a prerelease are not published data
vintages. The locator does not require a numeric release ID.

Publication verifies the complete asset set and its checksums before
the draft is published and verifies the published release before the
pointer can be committed. Release publication, retention checks, and
software-release acceptance establish that the locator denotes the
published data release. They do not infer publication from the tag's
existence. Published vintages remain immutable and a correction uses
a new data release; a deleted release's tag name is never reused.

The committed pointer records the application's data selection. Its
containing commit versions that selection together with application
code, so reverting the pointer can restore an earlier compatible
selection. That repository operation does not turn a commit into a
data identifier. Software releases may reuse one data release.

The exporter's `source_commit` remains code provenance: it identifies
the source used to generate the files and supports reproducibility.
Publication's `tag_commit` and tag-object checks remain transaction
and code-provenance checks. These values neither select data nor
replace the release locator and asset checksums in data evidence.

Evidence about a data vintage names its published release and exact
asset set as the subject. Publication evidence may be reused across
software releases only when it covers the same data and the
requirement still being checked. A new or strengthened requirement
needs corresponding evidence. Release-state and retention results
describe the release when they ran, so every software-release
acceptance repeats them and never reuses an earlier result.
Current-code checks, including application calculation parity and
performance, remain checks of the current application and cannot be
satisfied by historical data-publication evidence. A recorded commit
identifies code — the software checked, or the code that exported or
checked the data — and never the data.

Builds and tests continue to verify files against the pointer. A
checksum-valid local cache may be used offline; the release-identity
rule does not require a network lookup on every cached build. A cache
does not establish publication, restore a withdrawn release, or
replace the release checks required for publication and acceptance.

All other decisions and accepted amendments of ADR-0014 stand
unchanged. Among them: generated data stays out of Git; dedicated
data releases hold the files; the committed pointer and artifact
manifest have distinct roles; filenames contain content hashes; CI
retrieves and verifies the selected files and includes them in the
static site; and the retention, rollback, withdrawal, compression,
and licensing rules continue to apply. The DDD specifies the
transaction and evidence formats.

## Alternatives considered

- **Use the pointer or exporter commit as data identity.** A software
  change need not change the data. A commit identifies repository
  state and does not establish that a data release was published.
- **Use a Git tag alone.** Tags without releases and tags with draft
  releases would be indistinguishable from published vintages.
- **Require online release discovery for every build.** This would
  remove the existing offline use of checksum-valid cached files.
  Publication and release acceptance already verify release state.

## Consequences

- The existing release locator and exact checksum map remain the
  data pin. No numeric release ID or data-format migration is needed.
- The evidence ledger distinguishes data subjects from code
  revisions. Reusing a data vintage does not require rerunning its
  unchanged publication checks merely to produce a new commit label.
- Exporter code provenance and publication transaction checks remain
  available without becoming data selectors or data version labels.
- ADR-0014 stays Accepted; its dated amendment of 2026-11-01 points
  here. Current design documents apply this identity rule with
  ADR-0014's storage and publication architecture.

## References

- [ADR-0014 — Product artifacts in release assets, pinned by a committed manifest](0014-committed-content-hashed-artifacts.md).
- [HLDD §5.4 — Pinned, versioned artifacts (ADR-0014)](../app/hldd.md#54-pinned-versioned-artifacts-adr-0014).
- [DDD §3.3 — Pointer manifest](../app/ddd.md#33-pointer-manifest).
- [DDD §4.2 — Publication of a data vintage](../app/ddd.md#42-publication-of-a-data-vintage).
- [DDD §7.7 — Site validation and release checklist](../app/ddd.md#77-site-validation-and-release-checklist).
- [DDD review ledger — Deferred-finding discussion (2026-11-01)](../app/ddd-review.md#deferred-finding-discussion-2026-11-01).
