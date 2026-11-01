# ADR-0017: An unadvertised prototype deployment precedes the public release

- **Status**: Accepted
- **Date**: 2026-10-30 (the owner's decision of the same day; drafted
  with the DDD correction pass); 2026-10-31, the deferral of the
  licensing decision made explicit after an external review of the
  implementation plan; accepted 2026-10-31
- **Deciders**: Michael Bouzinier (project owner)

## Context

The product's remaining open questions belong to the research group:
the reader-facing texts ([PDD §5](../app/pdd.md#5-copy-deck), SC-7),
the liability-limitation text (D-10), the field-overlay default set
(D-18), the Kern County preset (D-6), and confirmation of the terms
under which the derived data may be redistributed. The research group
cannot answer them in the abstract: they need to see the working
application first.

As the documents stood, nothing could be deployed before those
answers. The HLDD defines "a public release" as "the deployed site or a
tagged GitHub release", requires research-group approval of the texts
before a public release (PRD CR-10), allows no placeholder liability
text to ship, and requires the source terms to be confirmed before the
first data upload. Read literally, these rules made the review
impossible: the prototype the reviewers need is itself a deployment.

## Decision

The work proceeds in **two phases**.

1. **Prototype (unadvertised).** The application is built and
   deployed to the live companion site at its final address, together
   with its first data vintage, but it is not advertised: the page has
   no navigation entry, no page links to it, it is excluded from the
   site's search index and from `sitemap.xml`, and it shows a short
   notice that it is a prototype under review. The owner shares the
   address with the research group. The licensing decision is
   deferred (below): the prototype runs on the project's current
   licensing, stated as an assumption — code Apache-2.0; prose CC BY
   4.0; the derived data exports CC BY 4.0 with attribution to each
   source. Reader-facing texts still awaiting approval, including the
   PDD's pending D-10 slot, appear as drafted.
2. **Review and public release.** The research group reviews the
   prototype; the owner records their approvals and decisions (texts,
   D-10, D-18, D-6, and the deferred licensing decision) in the owning
   documents. Only then is
   the page **activated** — navigation entry, search and sitemap
   inclusion, the prototype notice removed — and the first software
   release is cut.

**An unadvertised prototype deployment is not a public release.** A
public release is the activated site (the scenario page in the site's
navigation) or a tagged GitHub release. The rules attached to a public
release — the research group's approval of the texts (PRD CR-10), the
D-10 text in place, third-party media permissions (PRD NFR-6), and the
release checklist — therefore apply at activation and at the first
software release, not at the prototype deployment. The
deployment safeguards that do not depend on review stay in force from
the first deployment: the CI test and parity gates, the build's
publication-inventory and media checks, and the rule that no
third-party photograph is deployed without documented permission.

**The licensing decision is deferred to Phase 2.** This ADR decides no
licensing question for the derived data. Two questions stay open until
the research group's review: the terms under which the project offers
the derived data exports, and whether each source's terms permit
redistributing data derived from it. The owner answers both with the
research group in Phase 2, before activation, and records the answer
in the owning documents. Until then the exports carry the assumption
above, written down as an assumption: in `data/REDISTRIBUTION.md`,
beside each source's own published terms and the attribution it asks
for, and in the record line the publication tool checks before every
upload. The assumption is not evidence that any source permits
redistribution. HLDD's rule that permission to redistribute an export
is confirmed before its first public upload is deferred with it: for
the prototype's data vintages, the confirmation is required before
activation and before the first software release, whose pinned
vintage carries the confirmed terms.

**Implementation sequencing only.** This decision orders the
implementation; it does not change the product. The PRD and the PDD
are not amended and hold no rule about the prototype, the two phases,
or the deferral of the licensing decision: what they require of the
public release is required of it unchanged. The documents that carry
this decision are the HLDD, the DDD, and the implementation plan.

**Four authorizations, kept apart.** Sharing the prototype is the
owner's decision, recorded by this ADR. It stands for none of the
three that the review supplies in Phase 2: the research group's
approval of the scientific statements and other reader-facing texts
(SC-7), the liability-limitation text (D-10), and the licensing
decision above, source by source. Until those are given, the prototype
shows its texts as drafted and the PDD's pending D-10 slot under the
prototype notice, and its data under the stated assumption.

## Alternatives considered

- **Review from screenshots or a local demonstration.** The reviewers
  could not try their own scenarios, which is the point of the review.
  Rejected.
- **A separate preview host or repository.** GitHub Pages serves one
  site per repository; a second host adds infrastructure and a
  configuration that differs from production. Rejected.
- **Keep the old rule and approve the texts first.** Circular: the
  texts are judged in context. Rejected.

## Consequences

- The prototype's address is public, though unlinked; anyone who has
  it sees unapproved text. The prototype notice and the standing
  disclaimer say what the page is.
- The first data vintage is published as public release assets while
  the licensing decision is deferred: unadvertised, but fetchable by
  anyone who finds it. The owner accepts that. A change of the stated
  terms alone is a new vintage (releases are immutable and cheap to
  replace). If the deferred decision finds that a source's terms do
  not permit the redistribution, the remedy is the withdrawal
  procedure of
  [DDD §4.3](../app/ddd.md#43-retention-rollback-recovery-and-withdrawal),
  applied to each vintage carrying data derived from that source;
  copies already fetched cannot be recalled.
- The DDD separates the two phases: the publication boundary of the
  scenario page has three states (draft, unlisted prototype,
  activated), and the release checklist applies at activation and at
  the software release.
- HLDD's definition of a public release, its D-10 row, and its two
  rules that redistribution permission is confirmed before an export's
  first public upload are amended to cite this ADR.

## References

- [HLDD — Licensing and media permissions](../app/hldd.md#licensing-and-media-permissions);
  [HLDD — Licensing and archival distribution](../app/hldd.md#licensing-and-archival-distribution);
  [HLDD — Data rights and archival distribution](../app/hldd.md#data-rights-and-archival-distribution);
  [HLDD §9 — Testing and release architecture](../app/hldd.md#9-testing-and-release-architecture).
- [CR-10 — Scientific-content approval](../app/prd.md#cr-10-scientific-content-approval)
  (research-group approval before a public release).
- [ADR-0014](0014-committed-content-hashed-artifacts.md) (data
  vintages as release assets); [ADR-0016](0016-performance-reference-environment.md).
