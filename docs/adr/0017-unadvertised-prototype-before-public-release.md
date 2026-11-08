# ADR-0017: An unadvertised prototype deployment precedes the public release

- **Status**: Accepted
- **Date**: 2026-10-30 (the owner's decision of the same day; drafted
  with the DDD correction pass); 2026-10-31, the deferral of the
  licensing decision made explicit after an external review of the
  implementation plan; accepted 2026-10-31; amended
  2026-11-01, 2026-11-06, and 2026-11-08 (the amendments precede
  References)
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

> **Amendment 2026-11-01 (owner decision on versions and branches).**
> `dev-v.0.3.x`, which holds the design only, merges into `main` as
> the design state, changing no page of the site, tagged `v0.3.0` by a
> plain git tag — not a GitHub release, so not a public release. The
> implementation proceeds on `dev-v.0.4.x`, created from `main` after
> that merge, and reaches `main` only at the first software release,
> v0.4.0, by the release merge (a merge commit). Before that merge,
> the prototype reaches the live site only by the owner's manual runs
> (`workflow_dispatch`) of the Companion site workflow
> (`.github/workflows/mkdocs.yml`) on `dev-v.0.4.x`, its first
> deployment and every later update alike, each deploying the site as
> built from that branch, its other changes included; until the
> first, `main`'s design state stays live. Pull requests and pushes to
> `dev-v.*` branches build and check the site without deploying; only
> a push to `main` or a manual run deploys, and a manual run only from
> a branch that the `github-pages` environment's deployment-branch
> policy admits. That policy admits `main` always and `dev-v.0.4.x`
> from owner action OA-20 of
> [IP §4 — Owner and research-group actions](../app/ip.md#4-owner-and-research-group-actions),
> taken before the first prototype deployment, until owner action
> OA-21, taken just before the first commit of the release-branch
> order of
> [IP §3 — Gates and release sequence](../app/ip.md#3-gates-and-release-sequence),
> the D-10 text. From then on nothing deploys from `dev-v.0.4.x`, so
> the commits of that order — the D-10 text, the glossary additions,
> and the activation among them — reach the live site only with the
> release merge. An emergency data withdrawal between OA-21 and the
> release merge does not re-admit `dev-v.0.4.x`: it reaches the live
> site by a manual run on `main`, which deploys the design state and
> so takes the scenario page and its data off the site until the
> release merge. After the release only `main` deploys; every later
> change is a pull request into `dev-v.0.5.x`, created from `main`
> after the release, and reaches `main` by that branch's merges into
> `main`. The public release is still published from `main`, as
> [NFR-2 — Static-site hosting](../app/prd.md#nfr-2-static-site-hosting)
> requires; the manual runs on `dev-v.0.4.x` deploy the unlisted
> prototype, which is not a public release (Decision, above), so
> NFR-2 is not amended.
> [ADR-0009 — GitHub Pages (via Actions) as site hosting](0009-github-pages-hosting.md)
> records the admission of `dev-v.0.4.x` in its amendment of this
> date. Every other decision of this ADR stands.

> **Amendment 2026-11-06 (the deferred licensing decision answered;
> D-6 out of the pre-activation set).** The owner relayed the
> research group's answer to question 2 of
> [the owner's briefing](../../notes/research-group-questions.md),
> which put both halves of the deferred decision to the group:
> CC BY 4.0 is good. The owner adopts it. The derived data exports
> are offered under CC BY 4.0 with attribution to each source — the
> assumption above, now confirmed — and the per-source terms stand
> as `data/REDISTRIBUTION.md` documents them: ODC-By (the DEM
> experiments), CC0 1.0 (FDHI), CC BY 4.0 (SURE), and the
> compiler's written permission of 2026-09-18 (Kern County). The
> mechanics are unchanged: the prototype's vintage keeps the
> assumption wording, and the vintage the first software release
> pins carries the confirmed terms, written into
> `data/REDISTRIBUTION.md` and its `data-terms` copy when that
> vintage is cut in the release sequence (IP §3–§4). Separately,
> the owner's release-scope amendment of the same date (PDD D-49)
> takes FR-O6, the Kern County worked example, out of the v0.4
> release, so the decisions this ADR's Phase 2 records before
> activation no longer include D-6; that decision stays open for
> the example's post-MVP return. Every other decision of this ADR
> stands.

> **Amendment 2026-11-08 (export licences fitted to ODC-By 1.0).**
> Before the confirmed terms were recorded, the owner reviewed the
> DEM experiments' licence, ODC-By 1.0, which asks more than
> attribution: its section 4.2(a) requires anyone who publicly
> conveys a derivative database to do so "only under the terms of
> this License". The data exports built from the DEM experiments —
> the scenario artifact, the regression export, the reference
> results, and the matching-records file of each scenario
> download — are such databases, so they are distributed under
> ODC-By 1.0 with attribution, not CC BY 4.0. Charts, chart images,
> reports, and the site's pages are produced works in the licence's
> terms — images or text resulting from a query — which section 4.3
> lets carry any licence with a notice that the content came from
> the DEM experiments and is available under ODC-By 1.0; they stay
> under CC BY 4.0 with that notice. The field-data export, which
> uses no DEM data, stays under CC BY 4.0. The 2026-11-06
> amendment's adoption of CC BY 4.0 stands for everything except the
> DEM-derived databases. `data/REDISTRIBUTION.md` records the final
> terms with its confirmed record; guided task G-28 adds the
> notices to the pages and downloads.

## References

- [HLDD — Licensing and media permissions](../app/hldd.md#licensing-and-media-permissions);
  [HLDD — Licensing and archival distribution](../app/hldd.md#licensing-and-archival-distribution);
  [HLDD — Data rights and archival distribution](../app/hldd.md#data-rights-and-archival-distribution);
  [HLDD §9 — Testing and release architecture](../app/hldd.md#9-testing-and-release-architecture).
- [CR-10 — Scientific-content approval](../app/prd.md#cr-10-scientific-content-approval)
  (research-group approval before a public release).
- [ADR-0014](0014-committed-content-hashed-artifacts.md) (data
  vintages as release assets); [ADR-0016](0016-performance-reference-environment.md).
