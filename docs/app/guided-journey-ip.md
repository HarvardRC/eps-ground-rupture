# Guided explorer: implementation plan and execution record

**Status: authorized implementation candidate, 2026-11-04.** This
additive plan implements the owner's approved journey at `/explore/`
and preserves `/scenario/`. The historical [IP](ip.md) task bodies
and completion records remain unchanged. Its existing core tests and
scientific contracts still apply.

**Second increment, 2026-11-04.** The owner restored sample inputs
(D-37), accepted the delegated same-tab continuity rule (D-38), set
the publication path and paused `/scenario/` (D-39), kept the §5
copy baseline, and requested width log-scale parity.
[Guided DDD §9](guided-journey-ddd.md#9-second-increment-d-37d-39-2026-11-04)
specifies the increment; tasks G-08–G-12 below execute it. G-01–G-07
and their evidence stand unchanged. The owner accepted this
increment's documents in `adf8fed` (2026-11-04) and granted
autonomous execution — commit, push, pull requests, and merges —
recorded under [Commands](#commands).

Execute the following tasks in order. Parallel work is allowed only
after the preceding contract exists and file ownership is disjoint.
All design comes from the [guided DDD](guided-journey-ddd.md), which
supersedes legacy interaction design only for the new page.

| Task | Prerequisite | Exact work and authority | Completion |
| --- | --- | --- | --- |
| G-01 | Owner approval/delegation | Save the approved refinement source and standalone HTML; update PDD and prototype record; record candidate scope; add ADR-0020 and HLD reference. | Product authority, scope and separate route are explicit; links resolve. |
| G-02 | G-01 | Implement `explore/state.ts` and `compute.ts` exactly to DDD §§2–4; add state and computation tests. | Required selections, decimal limits, mode preservation, snapshots, stage filtering and real calculations pass tests. |
| G-03 | G-02 interfaces fixed | Implement `app.ts`, `main.ts`, `explore.css` to DDD §§3–7 and saved prototypes. | Complete five-step journey, actual charts/statistics/downloads, draft/confirmed separation, notices, supporting links and errors. |
| G-04 | G-01 and DDD §1 | Add isolated build outputs, generated include and `/explore/` page; reuse pinned data URLs; extend preview staging checks. | Both pages build with correct scoped assets, versions and data URLs. |
| G-05 | G-02–G-04 | Run DDD §8 checks, inspect UI through CUA, fix observed defects, and update execution evidence below. | Working candidate plus truthful verification and remaining limitations. |
| G-06 | G-05; owner walkthrough, 2026-11-04 | Apply readable typography in DDD §5 and floating glossary help in §6; preserve existing disclosures and scientific behavior. | Typecheck and strict builds pass; mouse, keyboard, dismissal, viewport fit and unchanged draft are verified; record evidence. |
| G-07 | G-06; PDD D-36 | Implement the prominent refinement disclosure, selected Choice cards, and optional results walkthrough exactly to guided DDD §§5.1–5.2 in `app.ts` and `explore.css`. | Verify five-stop navigation, measurement cards, chart choices, exit/focus, draft isolation, empty-type review, discard, confirmation, empty results, and 320/1024 px layouts. Typecheck and strict builds pass; record actual evidence. |
| G-08 | G-01; PDD D-39 | Move `explore.md` and `assets/explore/` out of `draft_docs`, keep `not_in_nav` and the search exclusion, and extend `site_checks.py` and its tests to hold the unlisted invariants in the publication tree, exactly to guided DDD §9.4. No deployment. | Both strict builds pass with the page published unlisted — no nav, sitemap, or search entry — and hook tests cover it; `/scenario/` bundles stay byte-identical; evidence recorded. |
| G-09 | G-02 interfaces; PDD D-37 | Implement `sampleDraft` and the introduction's sample action, inline replacement confirmation, and site-conditions status line exactly to guided DDD §9.1, with state tests. | Fresh fill, both ask-before-replace outcomes, sample labeling, the deliberate 30° coverage warning, and untouched confirmed results verified; typecheck, tests, and builds pass; evidence recorded. |
| G-10 | G-09 (shared files); PDD D-38 | Implement `session.ts` and the restore flow, the copy updates in `app.ts` and `explore.md`, and the §7 `pageshow` amendment exactly to guided DDD §9.2, with session tests. | Same-tab reload and back/forward restore the draft, confirmed settings, step, and display with the visible notice; invalid or mismatched records require the explicit fresh start; storage failure keeps the fresh behavior and wording; results recompute and are never stored; tests and builds pass; evidence recorded. |
| G-11 | G-10 (shared files) | Implement the width log-scale offer exactly to guided DDD §9.3, reusing the registry texts and shared chart builders. | The toggle appears exactly when the log histogram exists, switches bins, caption, and note, reports the off-adjustment, never dirties the draft, and persists with display choices; tests and builds pass; evidence recorded. |
| G-12 | Main-plan T-60 lane (implemented); G-08–G-11 | Implement the guided browser specs of guided DDD §9.5 inside the T-60 lane, running against the strict preview build; extend the mobile project's spec filter to the guided spec files. | All eleven guided specs pass in the lane's desktop and mobile projects, the race and continuity specs included; physical-touch and cross-engine coverage recorded as outstanding; evidence recorded. |

G-08 is independent of the application tasks. G-09–G-11 share
`app.ts` and `state.ts` and run in order. The main plan's T-60
browser lane is already implemented on `dev-v.0.4.x`, so G-12 has
no missing prerequisite beyond G-08–G-11; its specs join the
lane's desktop and mobile projects. The owner reruns the T-54
unlisted deployment after G-08 lands. Nothing from the
[next phase](#next-phase-owner-instruction-2026-11-04) joins this
kickoff.

### G-07 browser verification

Use the current pinned data and a confirmed scenario with 30° fault
dip, 5 m depth, Dense sediment, Uniform Strong material, and 0–5 m
slip. Keep its matching-record count as the comparison baseline.

1. In normal results, verify that the full-width refinement entry
   opens both existing editors and reports expanded state. Close it.
   Begin the walkthrough: height is first and Back is disabled.
2. Advance to width, choose Cumulative, and Browse freely. Width and
   its chart choice remain selected; no pending scenario is created.
   Restart the guide; it starts at height. Visit all five stops and
   check labels, progress, focus, and only one set of editor inputs.
3. At Simulation stages, select Last stage. At Scarp types, clear
   every type. The confirmed count remains the baseline. Review
   changes ends the guide, blocks review, opens normal refinements,
   and focuses scarp Select all with its validation message.
4. Select all types, review, and verify the last-stage draft summary.
   Show results applies it and returns to normal browsing. Restart
   the guide without edits; the last action is Finish walkthrough.
   Finishing retains the current measurement and opens refinements.
5. Make an unapplied editor change, Browse freely, and verify both
   the draft and pending notice remain. Discard restores confirmed
   choices. Repeat Discard while inside an editor stop; the guide
   ends and normal refinements stay open. A main-step edit followed
   by Back to results returns to normal browsing too.
6. Confirm a no-match scenario (the checked `data-v1` gap is
   0.01–0.02 m slip with the same site). Walk through all stops;
   measurement stops retain no-match messaging without fabricated
   charts, and both refinement editors remain usable.
7. Check normal controls, guide navigation, and both editor stops
   at 320 px and 1,024 px. Check keyboard focus after Next, Back,
   Browse freely, and failed review. Start a new scenario and reload
   to verify that guide state does not survive either reset.

## Commands

Use Gradle from the repository root so Node and the test environment
match the repository's pinned toolchain:

```sh
python3 .github/scripts/check_doc_links.py
python3 .github/scripts/check_pdd_agreement.py
python3 .github/scripts/check_traceability.py
./gradlew :subprojects:webapp:check :subprojects:webapp:webappBundle
./gradlew :subprojects:mkdocs:mkdocsBuild \
  :subprojects:mkdocs:mkdocsPreview
```

The preview includes both unadvertised routes; the publication
build retains the draft boundary until G-08 lands. Do not deploy;
deployments stay the owner's manual workflow runs.

**Owner grant, 2026-11-04.** For this increment the implementing
agent works autonomously: it stages, commits, pushes, opens, and
merges its own pull requests into `dev-v.0.4.x` without per-task
owner approval. The grant covers tasks G-08–G-12 and the
doc-bearing evidence and ledger updates those tasks carry. The
owner merges `dev-v.0.4.1-redesign` into `dev-v.0.4.x` and pushes
it before the kickoff, so task branches start from the accepted
candidate beside the implemented T-54 deployment and T-60 lane.
The main contract's merge conditions still hold — CI green,
independent review passed, no open owner question, branch current
with `dev-v.0.4.x` — and everything outside this grant keeps the
main plan's rules.

**Renewal, 2026-11-04.** The owner renewed the grant on the same
terms for the released next-phase tasks G-14–G-17
([Next phase](#next-phase-owner-instruction-2026-11-04)).

**Renewal extension, 2026-11-04.** The owner extended the same
terms to the rework tasks G-18 and G-19
([Next phase](#next-phase-owner-instruction-2026-11-04)).

**Renewal extension, 2026-11-05.** The same terms cover the audit
tasks G-20 and G-21
([Next phase](#next-phase-owner-instruction-2026-11-04)).

## Next phase (owner instruction, 2026-11-04)

The owner queued every deliberate deferral as the phase after this
increment ([PDD D-41](pdd.md#1-decision-register)). Team
availability schedules it; it may run before the team
demonstration. Advertising still follows D-39. Nothing below
joined the second increment's kickoff: each item first needs its
guided DDD section and, where named, a product decision, accepted
the ordinary way.
G-14 and G-15 arrive with guided DDD §10 and PDD D-42 drafted
2026-11-04; the commit that carries them is their acceptance.
G-16 and G-17 record the external review's defects of 2026-11-04
against §§9.2–9.3 behavior; the owner schedules any earlier run.

**Owner release, 2026-11-04.** The owner released G-14–G-17 for
execution ahead of the rest of the phase and handed the run to the
implementing session. This instruction is the ask to create task
branches, push them, and open pull requests against `dev-v.0.4.x`,
and the [Commands](#commands) renewal covers their merges. Story
texts under CR-10 (G-15) go to the owner for approval before that
merge. The queue's other items stay queued; advertising still
follows D-39.

**Owner release, 2026-11-04 (rework).** Reviewing the built
samples, the owner decided D-43 and released G-18 and G-19 on the
first release's terms; the [Commands](#commands) renewal extension
covers their merges. Exact chooser, notice, trigger, and
annotation strings go to the owner for approval before the
affected merges.

**Owner revision, 2026-11-05 (external review).** Before the G-18
merge the owner adopted a relayed external review: PDD D-44 and
guided DDD §10.5 revise the presentation, and the G-18 and G-19
rows above are rewritten to match. The release terms are
unchanged.

**Owner release, 2026-11-05 (audit).** The owner adopted the
second external audit as PDD D-45 and released G-20 and G-21 on
the standing terms, sequenced after G-19; the
[Commands](#commands) extension covers their merges. D-46 stays
proposed with the research group; nothing in this release changes
the §10.5 rework.

| Task | Prerequisite | Exact work and authority | Completion |
| --- | --- | --- | --- |
| G-13 | Next phase; a guided DDD report section, to be drafted; PDD D-40 (P2) and D-14 | Implement the result report: one action on confirmed results producing a single self-contained HTML or PDF document pairing the §6.1 provenance and scenario summary with the rendered charts and D-14 caption strips, the §4.2 statistics table, and every active caveat, per [PDD §6.5](pdd.md#65-result-report-d-40-p2). | Fixed by its design section when drafted; the §6.1 content rules and D-14 caption requirements apply unchanged. |
| G-14 | Next phase; PDD D-42; guided DDD §10.1 | Replace the introduction's single sample action with the chooser; add the Kern builder — fault angles 60° and 70°, offset 1.3 m, completion values delegated and named in the evidence — validated against the manifest like §9.1's; name the chosen sample in the status line; parameterize the §9.5 sample spec over both samples, each option keeping its identity through the ask-before-replace flow; verify the 60–70° offset coverage and record the observed state. | Guided DDD §10.1 holds for both samples; D-37's confirm-replace flow is unchanged; the specs pass in the lane's desktop and mobile projects. |
| G-15 | Next phase; G-14; PDD D-42; guided DDD §10.2 | Add the **About this sample** disclosures: the illustrative story anchored to Chi-Chi scale as the figures page frames it; the Kern story at the site's M 7.36 with the Buwalda & St. Amand digitisation and the future field-overlay tie-in; up to two images each, published as project images per guided DDD §10.2, with alt text and visible credits; per-file license verification (public domain or CC BY / CC BY-SA) with source URL, author, license, and date recorded in the evidence. | Disclosures render per guided DDD §10.2 after either fill; CR-10 approval of the story texts is recorded; the licensing evidence is complete; a spec covers the disclosure. |
| G-16 | Next phase; guided DDD §9.2 | Release the restoration's busy state as soon as navigation or a superseding action invalidates a pending restore, instead of only after its conversion fetch settles — today a stalled restore disables Show results even for a slip-mode draft that needs no conversion data (`src/explore/app.ts`, `restoreResults`); the late continuation still leaves every shared flag alone. Extend the §9.5 continuity spec with the stalled-restore cancellation. | Show results enables as soon as the reader supersedes a pending restore; §9.2 restore outcomes unchanged; specs pass in the lane's desktop and mobile projects. |
| G-17 | Next phase; guided DDD §9.3 | Clear the width log-scale-off notice consistently around downloads: after a zero-slip confirmation turns the log scale off, a successful download leaves the dismissed notice's element visible (`src/explore/app.ts`, `download`). Align the flag and the element, and cover log-on, zero-slip confirmation, then download in the §9.5 width spec. | The notice clears wherever its flag does; download contents unchanged; specs pass in the lane's desktop and mobile projects. |
| G-18 | Released 2026-11-04; PDD D-43, D-44; guided DDD §§10.3, 10.5 | Rework the sample interaction: the **Try a prefilled sample** card-preview dialog (preview without draft change; Use this sample; the modal replacement question as the dialog's next step); the prefill notice with its Started from · Modified form; the sequential footer after a fill; both-mode prefills (Kern 1.6–1.9 m as Bawden 2001's two patch estimates used as an example band; illustrative 3–5 m delegated, named in the evidence) with the mode-switch note; extend the §9.5 specs accordingly. Final strings to the owner before merge. | Guided DDD §§10.3 and 10.5 behaviors hold; D-27/D-30 draft boundaries unchanged; specs pass in the lane's desktop and mobile projects. |
| G-19 | Released 2026-11-04; G-18; PDD D-43, D-44; guided DDD §§10.4, 10.5 | The **Why these sample values?** trigger (helper: Background, photos and sources) following the notice's lifetime; per-field annotations updating or clearing with their values; the CR-10 story edit to the shared sentence; the card previews share the §10.2 story material. Annotation, trigger, and revised story strings to the owner for approval before merge. | Guided DDD §§10.4 and 10.5 hold; the §10.2 licensing evidence stays valid; specs cover preview content, trigger, and annotations in both lane projects. |
| G-20 | Released 2026-11-05; after G-19; PDD D-45; guided DDD §§11.1–11.2 | Apply the audit's wording table across the guided page and shared components (D-39 boundary: no `/scenario/`-only file); the results-screen rework with **View full scenario**; the walkthrough label; help disclosures that add information; the Scarp dip provisional mark; physical density ordering; update the specs asserting old strings. The normalization explanation and the ZIP contents description go to the owner before merge. | Guided DDD §§11.1–11.2 hold; audit entries addressed or recorded as declined in the evidence; specs pass in the lane's desktop and mobile projects. |
| G-21 | Released 2026-11-05; after G-19; PDD D-45; guided DDD §11.3 | Fix the disclosure icon overlap everywhere the pattern appears; make the first-calculation failure message claim only what exists; reconcile the version-mismatch message with its control; resolve the recurring `.md-top` axe contrast report per §11.3 (owner addition, 2026-11-05); extend the §9.5 specs. | Guided DDD §11.3 holds; the defects verified fixed or determined in both lane projects; the evidence records the before and after. |

Queued definitions and decisions, with their authorities:

- the field-overlay decision for the guided page
  ([PDD §4.4](pdd.md#44-field-overlay-fr-o5-d-18-proposed));
- the family-view offer on the guided page (D-13,
  [PDD §3.7](pdd.md#37-population-scarp-filter-family-view-reset));
- shared links restoring a guided scenario
  ([PDD §7.1](pdd.md#71-shared-links));
- recovery between visits beyond D-38
  ([PDD §7.3](pdd.md#73-reload-recovery-mvp));
- scenario import, excluded by the first-version scope
  ([PDD §2.3](pdd.md#23-user-journeys));
- the entry-point re-pointing
  ([PDD §2.2](pdd.md#22-entry-point-d-2-decided-2026-10-28));
- budgets and measurement marks for the guided bundle and the
  quality bars ([PDD §9](pdd.md#9-product-quality-bars));
- acceptance walkthroughs re-pointed to the guided page
  ([PDD §10.3](pdd.md#103-acceptance-walkthroughs));
- touch and cross-engine browser coverage beyond G-12's lane;
- the paused `/scenario/` engineer-sandbox rework decision
  (D-39).

## Execution evidence

**Verification record, 2026-11-04.** G-01–G-05 were completed for the
bounded candidate in the working tree. This is a local implementation
candidate; it has not been deployed, committed, or accepted as the
public release.

The candidate added the isolated
[guided application](../../subprojects/webapp/src/explore/app.ts),
[state](../../subprojects/webapp/src/explore/state.ts),
[calculation orchestration](../../subprojects/webapp/src/explore/compute.ts),
[entry lifecycle](../../subprojects/webapp/src/explore/main.ts), and
[stylesheet](../../subprojects/webapp/src/explore/explore.css).
The [page](../../subprojects/mkdocs/docs/explore.md), build outputs,
generated include, and staging checks preserve the separate routes.
The saved refinement example, PDD supplement, ADR-0020, and HLD
reference record their product and architectural authority.

At this verification:

- The pinned Node suite passed all 401 tests, including 25 new guided
  state and computation tests. Typechecking and both bundles passed.
- All 16 MkDocs hook fixtures passed.
- Strict publication and preview builds passed. The publication
  build preserved the draft boundary; the preview included both
  unadvertised routes.
- Real-data numerical parity produced zero differences against
  the existing scientific calculation pipeline.
- The existing scenario JavaScript and CSS bundles were identical
  to the baseline bundles.
- All 5,440 relative links across 57 Markdown files resolved. PDD
  agreement passed; traceability accepted 491 rows with zero gaps.
  Whitespace and new-document prose-width checks passed.
  A separate scan including the new, untracked design files resolved
  all 5,390 relative links across 34 Markdown files.

Manual browser checks at this verification covered the fresh journey,
required site selections, decimal and movement-mode validation, and
real-data calculation. With a 30° fault, 5 m depth, Dense sediment,
Uniform Strong material, all stages and all scarp types, the checked
scenario returned 1,200 records over 0–5 m slip. Its median scarp
height was 1.74 m and its 84th percentile was 2.67 m.
A separate 3 m offset scenario
with 30° and 40° faults, 5 m depth, Dense sediment, and Uniform Strong
material returned 2,304 records and a 2.76 m read-off at the 84th
percentile. These are observed checks, not recommended scenario
inputs or permanent data-release reference values.

The browser checks also confirmed that draft edits left the confirmed
result and downloaded ZIP unchanged, an empty scarp selection blocked
review, and last-stage selection returned 12 records in the checked
scenario. Zero-valid-height and no-match results, per-angle offset
coverage warnings, and distinct loading, unsupported-browser, and
data-version errors were exercised. Disposable page fixtures verified
explicit errors for missing gzip decompression and `replaceChildren`.
The latter check caught and verified a repair to the error renderer;
all disposable fixture pages were removed after verification.

All journey screens, results, and refinements fit a 320 px viewport
without horizontal overflow. At 1,024 px, the root measured 992 px
without overflow. ArrowRight retained focus on the newly selected
last-stage radio; Back to results preserved the draft; Edit refinements
focused the selected radio. Start a new scenario reset every site
selection and removed results. The existing `/scenario/` mounted and
displayed 346,834 records in a final browser smoke check.

Inspection of the built preview HTML verified all 13 linked glossary
anchors, six supporting pages, and the existing scenario's
`gre-disclaimer` anchor. This checked the destinations' existence;
it was not a separate browser-navigation test of each link.

**Remaining acceptance limits.** Cross-browser coverage, performance
acceptance, and a full accessibility audit were not completed. The
candidate has no cross-browser, performance, accessibility, or
research-group certification; the existing scientific-review gates
remain in force.

### Walkthrough refinements, 2026-11-04

G-06 was completed after the owner reported small text and missing
floating explanations. Guided body text now renders at 18 px in the
default site context, with 16 px controls, main explanations and
statistics, and 14 px compact captions. Sizes use `rem`; narrow
screens retain the same text sizes. The guided chart uses larger
labels and a shorter cumulative axis title that fits its geometry.

Thirteen glossary-derived definitions now support dotted-underlined
terms. One floating panel handles hover, focus, and click/tap pinning;
existing expandable explanations and glossary links remain available.
Browser checks verified click opening, second activation, outside-click
and Escape dismissal, keyboard focus after automatic scrolling, scroll
and resize dismissal, and unchanged scenario selections/results.
At 320 px the checked panel stayed within x=12–308 px; the larger
forms, results and refinements had no horizontal overflow. The 1,024 px
layout also fit. A real scenario still returned 1,200 records; result
and stage explanations left it unchanged. The enlarged cumulative-axis
title fit wholly within its chart.

Typechecking and both strict builds passed. The old scenario bundles
remained byte-identical. All thirteen definition source anchors exist
in the built glossary. Link, agreement, traceability and whitespace
checks passed. The scientific test suite was not rerun for these
presentation changes. Pointer-hover handlers were reviewed in source;
physical touch-device and cross-browser verification remain outstanding.

### Results controls and walkthrough, 2026-11-04

G-07 was completed after the owner selected Choice cards. The normal
results now show three named measurement cards with explanatory
questions and a visible Viewing marker. The full-width refinement
entry identifies its stage and scarp-type options. The optional
walkthrough visits the three measurements and then each refinement
editor, preserving the existing review and confirmation boundary.

At this verification, browser checks covered all five stops, disabled
Back at the start, keyboard activation, focus, and exit to the current
measurement. Width's Cumulative choice survived leaving the guide;
view changes alone did not create pending scenario edits. Stage edits
and an empty scarp draft retained the confirmed 1,200-record result.
Review blocked the empty selection, exited the guide, opened normal
refinements, and focused Select all. After restoring the types, Review
showed the pending last-stage choice; Show results applied it and
returned 12 records for the checked scenario. A clean walkthrough
offered Finish walkthrough and returned to normal refinements.

Browse freely retained pending refinements. Discard restored confirmed
choices both outside and inside an editor stop. Main-step navigation
ended the guide. Reload and Start a new scenario cleared it; the latter
also restored unanswered site choices and disabled Results. The
checked no-match slip range, 0.01–0.02 m, allowed all five stops without
fabricated charts. Empty width and dip views retained their scientific
notices after a review finding was repaired.

Normal cards, guide navigation, and both editors fit 320 px without
horizontal overflow; card questions remained 16 px. The 1,024 px
layout fit three equal-width cards. A final layout check at the
preview's 706 px width showed all three cards in one row, each about
166 px tall. The guide heading remained 80 px below the viewport top
after navigation, clear of the fixed site header. Temporary viewport
overrides were removed after checking.

Pinned typechecking and both strict site builds passed. The final
assets were `explore-2d90789ca249.js` and
`explore-b86e68537c5b.css`. The legacy bundles remained byte-identical;
the preview/publication draft boundary remained intact. Agreement,
traceability, relative-link, and whitespace checks passed. The
scientific suite was not rerun for these presentation changes.
Pending offset-review cancellation was checked in source; a delayed
network race was not forced in the browser. The broader acceptance
limits above remain in force. Changes remained uncommitted at that
verification; the owner then committed the candidate to
`dev-v.0.4.1-redesign` as `a570fbe` (2026-11-04).

### Unlisted publication, 2026-11-04 (G-08)

G-08 removed `explore.md` and `assets/explore/` from `draft_docs`
in `mkdocs.yml`, leaving `media/dev/`. Both `not_in_nav` lines and
the page's `search: exclude: true` front matter remain. Nothing was
deployed; the owner's manual Companion-site run deploys the page.

The first strict publication build after that change failed arm
(d): the guided page links to the unlisted `scenario.md`, and the
hook rejected a link to an unlisted page from any other built page.
Guided DDD §6 keeps that existing-explorer link, and D-39 defines
unlisted as no navigation, sitemap, or search entry. Review found
that this departed from the legacy DDD §6.1 wording, so G-08 put the
question to the owner rather than merging.

**Owner ruling, 2026-11-05.** The owner chose to amend legacy
[DDD §6.1](ddd.md#61-build-outputs-asset-paths-and-page-scaffold)
arm (d) and its phase-2 paragraph with a dated, narrow exemption:
links to an unlisted page are permitted only from pages that are
themselves published unlisted — today exactly `explore.md` →
`scenario.md`, per D-39 (comparison and field-overlay access) and
guided DDD §6. Arm (d) must still fail any link from an advertised
page to an unlisted one, and the hook tests must cover both sides.
The rule stays deliberately strict: when the D-39 reconciliation
advertises `/explore/`, arm (d) trips and forces the field-overlay
and linking decision, queued in the next phase. A legacy-DDD
amendment lies outside the standing grant's letter; this ruling
authorizes it for G-08 only. The owner then authorized the
autonomous merge.

The hook and the legacy DDD now carry that rule. In a publication
build that outputs `explore/index.html`, a new arm (d) finding also
requires the guided page to stay unlisted.

Fifteen new hook tests cover the guided page in the publication
tree: the allowed `explore` → `scenario` link; rejected links from
a listed page, including rendered navigation, to either unlisted
page; sitemap and search entries; the not-unlisted guard; the trip
on the existing-explorer link once `/explore/` is advertised;
sitemap removal; arm (f) under `on_post_build`; the preview's
unchanged coverage, drafts included; and the committed
configurations. All 31 hook tests passed. The allowed link and the
guard each fail against the base hook.

At this verification:

- Strict publication and preview builds passed. The publication
  tree contained `explore/index.html`, `explore-2d90789ca249.js`,
  and `explore-b86e68537c5b.css`. Neither `sitemap.xml` (10
  entries), `sitemap.xml.gz`, nor the search index named
  `explore/`, and no built page other than `explore/` itself
  linked to it. The preview kept its sitemap entry, as before.
- The `/scenario/` bundles `app-26490347afd0.js` and
  `app-08bebc049c15.css` matched the pre-change baseline SHA-256s.
- The pinned Node suite passed all 401 tests; typechecking and the
  bundle passed. 5,498 relative links in 61 Markdown files
  resolved; PDD agreement passed; traceability linted 491 rows
  with no gaps.

Apart from `sitemap.xml` and `sitemap.xml.gz`, every file of the
publication tree was byte-identical to the preview's. No browser
visit to the publication build was made. The deployed page
and its unlisted state are verified only when the owner reruns T-54.

The T-60 lane, run as T-54's pre-deployment check, gave 151 passed,
5 skipped, and 1 failed: `axe: the failure states` reported a
serious `color-contrast` violation on `.md-top` in the existing
explorer's incompatible-settings decision. It failed identically on
the unchanged base `7581b80`, where T-54 had recorded 152 passes,
so G-08 did not cause it. It is a legacy-page spec outside this
increment, reported to the owner as a T-54 rerun item rather than a
G-08 question.

### Sample inputs, 2026-11-04 (G-09)

G-09 added `sampleDraft` to the guided state. It fills 30° and 40°
fault angles, 5 m depth, Dense density, and the Uniform: Strong and
Layered: Strong pairs, all taken from the manifest dictionaries,
with offset mode and a 3 m maximum. Slip entries, population, and
scarp types keep their fresh defaults. A missing member throws
rather than shrinking the sample. The existing sediment-group
labeling moved from `app.ts` into `state.ts` unchanged, so the
sample and the page name sediment the same way.

The introduction offers **Try sample inputs** beside **Build your
scenario**, with `Sample inputs, not recommended site values.` A
fresh, unconfirmed draft fills silently and opens Site conditions.
Otherwise the introduction actions give way to an inline question,
`Replace your current choices with the sample inputs?`, focused,
with **Use the sample** and **Keep my choices**. The status line
`These are sample inputs, not recommended site values. Change
anything.` (`role="status"`) appears on Site conditions after a fill
and clears when the reader leaves that step.

Three new state tests cover completeness, validity against the
fixture manifest, canonical ordering, independent copies, the fresh
slip entries and refinements, and each missing member.

At this verification, after rebasing onto the merged G-08:

- The pinned Node suite passed all 404 tests; typechecking and the
  bundles passed. Strict publication and preview builds passed
  with `explore-57b0e14797fe.js` and `explore-ea4ea319bbbd.css`.
  The `/scenario/` bundles `app-26490347afd0.js` and
  `app-08bebc049c15.css` were unchanged. All 31 hook tests passed.
- 5,498 relative links in 61 Markdown files resolved; PDD
  agreement passed; traceability linted 491 rows with no gaps.

A disposable Playwright script drove the strict preview build with
the pinned data at 1,024 px and 320 px; 35 checks passed and the
script was not committed. They covered:

- the fresh fill, its six site selections, offset mode with 3 m,
  and the status line, cleared on leaving Site;
- the deliberate coverage warning at 30° only on the movement step
  and review (coverage up to about 2.51 m). The confirmed sample
  returned 2,880 matching records;
- with a confirmed scenario, the focused inline question; Keep my
  choices restoring the actions and focusing the trigger;
- Use the sample after slip-mode and last-stage edits, which
  restored offset mode, 3 m, fresh slip entries, and all stages,
  leaving the confirmed count unchanged;
- a confirmed 30-record last-stage scenario, unchanged after a fill
  that raised the pending banner, with the walkthrough off on
  return;
- an edited, unconfirmed draft asking first, with Keep my choices
  leaving it;
- no browser dialog, no page error, and no horizontal overflow at
  320 px, where the status line renders at 16 px.

Screen-reader announcement of the inserted status line, touch, and
other engines were not checked; G-12 adds the committed spec.

### Same-tab continuity, 2026-11-04 (G-10)

G-10 added `session.ts`: the version-1 record of the draft, the
confirmed settings, the step, and the display choices, stored under
`gre-explore-session` in the tab's session storage. Every storage
access is guarded. Results, `RenderInput`, counts, stamps other than
`dataVersion`, and the walkthrough index are never stored.
`classifySession` checks a loaded record against the served data
version and validates the confirmed draft with `validateDraft`.
A working draft only needs the §2 structure.

The page saves from its single render path. Typing, percentile, and
disclosure changes, which update without a full render, call the same
save directly. On mount, including the `pageshow` remount, a
restorable record restores the draft, display choices, refinement and
example disclosures, and step. Earlier steps count as reached, and
all steps do when a confirmation exists. A confirmation recomputes
through the ordinary pipeline, with the regression in offset mode.
`navigationVersion` cancellation applies, and a failure or
interruption offers **Retry restoring results** while Results stays
unavailable. `Restored the work in this tab.` (`role="status"`)
appears only after a restore completes, never for an untouched
introduction, and clears on the next navigation or edit. An unreadable or version-mismatched record
leaves the introduction with its explanation and only **Start a new
scenario**. The record stays untouched until that choice clears it.
Implementation choices where the DDD names no wording or control:

- the unreadable-case text `The work saved in this tab could not be
  read.`, with `Your earlier choices have not been restored.` added in
  both cases;
- the **Retry restoring results** control as the §7 retry affordance
  for a restore. A restore cancelled by navigation stays recoverable
  and reports `Restoring the results was interrupted.`;
- `Recalculating the results of your confirmed scenario…` while busy.

Unavailable storage, or a failed save, keeps the first-version
behavior and wording. A failed save also clears any older record, so
a reload starts fresh as that wording says. A reload on Review in
offset mode loads the conversion, as on Movement. The
introduction, supporting aside, and static fallback in `explore.md`
carry the new continuity sentence. No `beforeunload` prompt was
added.

Thirteen new session tests cover:

- round trips under the documented key, including an invalid working
  draft and an unconfirmed record;
- the serialized field set, with no result fields;
- tampered JSON, wrong record versions, and ten structural tamperings;
- the data-version mismatch and an invalid confirmed draft;
- a results step without a confirmation;
- absence, clearing, and throwing storage.

At this verification:

- The pinned Node suite passed all 417 tests; typechecking and the
  bundles passed. Strict publication and preview builds passed
  with `explore-61092bd8467a.js` and `explore-2c551385ec3a.css`. The
  `/scenario/` bundles were unchanged. All 31 hook tests passed.
- 5,498 relative links in 61 Markdown files resolved; PDD
  agreement passed; traceability linted 491 rows with no gaps.

A disposable Playwright script drove the strict preview build with
the pinned data. All 47 checks passed; the script was not committed.
An independent review found the untouched-introduction claim, the
stale record after a late save failure, and the missing Review
conversion; their repairs are included and checked.
They covered:

- the new intro and aside wording, with no notice on a first visit;
- a Site-step reload restoring selections with the notice, which
  the next edit cleared;
- a confirmed sample scenario (2,880 records) reloaded from the
  walkthrough's Width stop. The same count was recomputed in about
  50–65 ms, with Width, Cumulative, the 90th-percentile read-off,
  the chart-data and stage-example disclosures, the pending
  last-stage edit, and the confirmed all-stages population
  restored. The walkthrough restarted off, and the stored record
  held only its six fields;
- Back from the glossary in the same tab restoring the results
  with the notice;
- a new tab starting fresh;
- corrupt and version-mismatched records explained, offering only
  Start a new scenario, kept until that choice, and then replaced
  by the fresh Site state;
- a failed regression response leaving Results unavailable without
  a restore claim, and Retry restoring the count;
- a held regression response during navigation to Site: the stale
  restore applied nothing, and Retry kept the current step;
- a throwing `setItem` and an unavailable `sessionStorage`, each
  keeping the earlier wording, starting fresh after reload, and
  raising no page error;
- a save failing after three successful ones, which cleared the
  older record; the reload started fresh without a claim;
- a reload of an untouched introduction claiming nothing, and a
  Review-step reload in offset mode showing the conversion and its
  30° coverage warning;
- the blocked introduction at 320 px without horizontal overflow.

The Back navigation reported navigation type `back_forward`, a
reload rather than a Back/Forward-cache restoration. The
`persisted` `pageshow` remount was therefore reviewed in source but
not exercised. Touch and other engines were not checked; G-12 adds
the committed spec.

As the DDD designs it, the restore runs on any mount in the tab. A
return to `/explore/` in the same tab through a site link therefore
also restores, and the copy says the work stays in the tab. This is
recorded for the owner's awareness against the PDD's "later visit"
wording; no product decision was changed.

### Width log scale, 2026-11-04 (G-11)

G-11 offers the native checkbox `gx-dzw-log`, labeled by
`ddd5.8.logScaleLabel`, after the chart choices. It appears exactly
when the confirmed result's `histogramLog` is non-null and width's
Distribution view is shown, which requires a drawn chart. Turned on, the chart comes from the shared
`histogramLogSpec`/`histogramSvg` path. That spec's chart label
appends `ddd5.11.logAxisClause` through the existing `chartLabel`
option. The bin-rule hint becomes `ddd5.12.logScaleNote`, and the bin
table is built from the displayed log bins. A confirmation, or a
same-tab restore, whose result has no log histogram turns the scale off
and shows `ddd5.10.recoveryLogScaleOff` once, as a `role="status"`
line cleared by the next step change, entry edit, or button press.
The persistent live region announces the same sentence. The toggle is presentation
only. It does not change `navigationVersion` or the draft, and it is
saved with the display choices. The Cumulative view and the other
measurements are unchanged. The walkthrough's width stop shows the
same control. No unit test was added: the behavior is DOM
presentation over shared, already tested builders. G-12's browser
spec covers it.

At this verification, after rebasing onto the merged G-10:

- The pinned Node suite passed all 417 tests; typechecking and the
  bundles passed. Strict publication and preview builds passed
  with `explore-b81440e55cb3.js` and `explore-abe9a2aa7049.css`. The
  `/scenario/` bundles were unchanged. All 31 hook tests passed.
- 5,498 relative links in 61 Markdown files resolved; PDD
  agreement passed; traceability linted 491 rows with no gaps.

A disposable Playwright script drove the strict preview build with
the pinned data. All 24 checks passed; the script was not committed.
It used the 30°, 5 m, Dense, Uniform: Strong scenario over 0–5 m slip,
which returned 1,200 records. Width had 1,142 valid measurements, 23
linear bin rows, and 9 log rows, including a `below 0.1 m` bar. The
checks covered:

- the offer's presence, label, and initial state;
- the chart label's log clause, the note, and the log bin table;
- no pending banner, the saved display choice, and focus kept on the
  checkbox;
- an unchanged Cumulative view and other measurements;
- restoration after reload, and the walkthrough's width stop;
- the off-adjustment after confirming the no-match 0.01–0.02 m slip
  range, shown once and saved off;
- a later offering confirmation that stayed unchecked;
- the off-adjustment reported by a restore;
- 320 px without horizontal overflow.

### Guided browser specs, 2026-11-04 (G-12)

G-12 added one spec per guided DDD §9.5 item to the T-60 lane's
`playwright/specs/`, with shared helpers in
`playwright/explore-support.ts`. The specs run in the lane's existing
desktop and mobile projects, reporters, and strict-preview server. The
mobile project's spec filter now also matches `explore-*.spec.ts`:

1. `explore-journey`: the five steps to the GS-1 result with its
   reference count (25,920) and valid height count; `/scenario/`
   still mounts.
2. `explore-validation`: site, movement, and scarp-type routing,
   messages, `aria-invalid`, and focus. Review attempts from Results
   route back to an emptied site group on Site and to a blank slip
   maximum on Movement, keeping the confirmed count.
3. `explore-draft-boundary`: the pending banner, Discard changes,
   Return to review, Start a new scenario, and the GS-6 result
   (3,434 records) unchanged during edits.
4. `explore-modes`: each mode's entries kept across switches and
   restored by Discard.
5. `explore-sample`: the silent fill, both ask-before-replace
   outcomes, the 30°-only coverage warning, no browser dialog, and
   confirmed results untouched.
6. `explore-continuity`: reload restores with the notice; corrupt and
   other-release records require the explicit fresh start; a new tab
   and a new context start fresh. It also covers the G-10 review
   repairs: a Review reload in offset mode, and a save failing
   mid-session, which clears the record.
7. `explore-race`: a held regression response during navigation away
   from an offset review, and from a restore, applies nothing stale;
   Retry then recovers.
8. `explore-walkthrough`: the five stops, progress, prompts, single
   editors, Back/Next labels, Browse freely and Finish focus targets,
   and the empty-type review block.
9. `explore-log-scale`: the offer, label, chart-label clause, note,
   and log bin rows (equal to GS-1's reference bins and its below-bar);
   Cumulative and other measurements untouched; the walkthrough width
   stop; the off-adjustment confirming GS-6, which has no log histogram.
10. `explore-download`: the package delivered during a draft edit,
    holding the four package members, GS-6's record count, and the
    confirmed slip window rather than the draft's.
11. `explore-layout`: no horizontal overflow at 320 and 1,024 px
    across the steps, validation, results, charts, refinements, and
    all five walkthrough stops.

Expected values come from the served reference results (GS-1 and
GS-6), the served manifest and pointer, and the copy registry. GS-6's
records are all zero-slip stages with no valid measurement, so the
specs that need charts use GS-1. A first run had five failing tests
from three wrong spec assumptions: charts under GS-6 (three tests),
a click on a not-yet-reached, disabled step button, and the race
assertion's direction. All were spec errors and were corrected; no
application defect appeared. Besides DDD and registry texts, some
assertions pin the page's own validation, loading, download, and
unreadable-record copy; a copy change there fails those specs
loudly.

An independent review mutation-tested the race, continuity, and
sample specs: each failed when its guarded behavior was broken.
Following that review, G-12 added a cross-step routing test, made the
race spec wait until the held response was processed, and made new
contexts keep the project's device emulation. On the reviewer's machine the full lane
passed 206 with the legacy a11y spec passing, so that failure
appears environment-dependent.

At this verification, on the branch rebased onto the merged G-11:

- `webappBrowserTest` (desktop and mobile) gave 207 passed, 5
  skipped, and 1 failed. All 28 guided tests passed in each project.
  The failure is the existing `axe: the failure states` legacy spec
  recorded under G-08, failing identically on base; the 151 legacy
  passes are unchanged.
- The final guided specs passed 168 of 168 runs with
  `--repeat-each 3` in both projects.
- The pinned Node suite passed all 417 tests; typechecking, which
  includes the specs, and both strict builds passed. The `/scenario/`
  bundles were unchanged. All 31 hook tests passed. 5,498 relative
  links in 61 Markdown files resolved; PDD agreement passed;
  traceability linted 491 rows with no gaps.

Outstanding beyond this lane, as §9.5 records:

- physical touch devices; the mobile project only emulates a 360 px
  touch viewport in Chromium;
- other browser engines;
- an actual Back/Forward-cache (`persisted`) restoration;
- screen-reader announcement of the inserted status lines.

The lane is not part of CI; it runs through
`./gradlew :subprojects:webapp:webappBrowserTest`.

**Documentation follow-up for the owner.** The legacy
[DDD §7.5](ddd.md#75-browser-test-lane) still quotes the earlier
mobile `testMatch` and calls the lane "the eleven specs". The G-12
row and guided DDD §9.5 authorize the filter change, but the owner
authorized legacy-DDD amendments for G-08 only, so §7.5 was left
unchanged. It now describes the legacy specs only; the guided specs
are §9.5's.

### Sample chooser, 2026-11-04 (G-14)

G-14 ran under the owner's release and grant renewal of 2026-11-04
([Commands](#commands)). `sampleDraft(manifest, sample)` now takes
a `SampleId`, `'illustrative' | 'kern'`, and reads each sample's
values from one table typed `Record<SampleId, …>`. The illustrative
sample keeps §9.1's values unchanged. The Kern sample fills fault
angles 60° and 70°, offset mode, and a 1.3 m maximum (PDD D-42).
Both builders take every member from the manifest and throw on a
missing one. `isSampleId` narrows the clicked button's
`data-sample` attribute to a known sample.

Agent selections under the PDD §2.3 delegation (guided DDD §10.1),
named here as the row requires:

- Kern completion values: 10 m sediment depth, Medium density, and
  the Uniform: Moderate and Layered: Moderate pairs. These are sample
  values for a demonstration, chosen from the manifest; they are not
  a characterization of the White Wolf fault site. All four are
  present in data release `data-v1`.
- The chooser is two buttons, not a disclosure. A `role="group"`
  labeled `Try a sample:` holds **Illustrative sample** and
  **Kern County 1952 sample**, beside **Build your scenario**. Each
  button is described by the hint `Sample values, not recommended
  site values.`; **Try sample inputs** is gone.
- The question reads `Replace your current choices with the
  illustrative sample?` (or `the Kern County 1952 sample?`). The
  status line reads `Filled with the illustrative sample: sample
  values, not recommended site values. Change anything.` (or the
  Kern name), still `role="status"` and cleared when the reader
  leaves Site conditions. **Use the sample** and **Keep my
  choices** are unchanged. Keep my choices returns focus to the
  button that asked.

D-37's flow is otherwise unchanged for both samples. It still
fills silently from a fresh draft with nothing confirmed and
otherwise asks inline. It still replaces the whole draft only on
Use the sample, never opens a browser dialog, and never changes
confirmed results. The sample state is presentation state; the
session record stores neither the question nor the status line.

Observed 60–70° coverage. On the strict preview with the pinned
data release `data-v1`, the Kern sample's 1.3 m offset converts to
about 0.01–1.51 m of slip at 60° and 0.01–1.39 m at 70°, both
**Within range** of the modeled 0–5.0135 m, so no coverage warning
appears. This agrees with the external live check on the deployed
page. The confirmed Kern sample returned 1,011 matching records
with all charts rendered. The spec asserts the Within-range state
at both angles, so a change in data or conversion fails the lane
rather than silently changing the demonstration.

Tests and specs:

- State tests now run over both samples: completeness, validity,
  canonical order, offset mode, fresh slip entries and
  refinements, independent copies, and each missing member. One
  test removes a member only one sample uses, to show the builders
  are independent; another checks `isSampleId`.
- The §9.5 sample spec (item 5) is parameterized over both samples:
  - the chooser's names, group, and hint;
  - each sample's silent fill, with its site values and offset;
  - its coverage: the 30° warning for the illustrative sample, and
    no warning, with both rows Within range, for Kern;
  - Keep and Use with a confirmed scenario, which leave the
    confirmed count unchanged and focus the asking button;
  - each option keeping its identity when the reader asks about one
    and then the other, from an edited draft and from a filled
    Kern draft;
  - keyboard operation: Tab order through the chooser, Enter and
    Space, and Keep and Use by keyboard.
- The continuity and layout specs now use the illustrative button.

At this verification:

- The pinned Node suite passed all 422 tests; typechecking and the
  bundles passed. Strict publication and preview builds passed
  with `explore-faeb1b0a595d.js` and `explore-cbf963b397ab.css`.
  The `/scenario/` bundles `app-26490347afd0.js` and
  `app-08bebc049c15.css` were unchanged. All 31 hook tests passed.
- 5,504 relative links in 61 Markdown files resolved; PDD agreement
  passed; traceability linted 491 rows with no gaps.
- The guided specs passed 64 of 64 (32 each in `desktop` and
  `mobile`), and the sample spec passed 42 of 42 over three repeats.
- The full lane, run before the review clean-ups (`isSampleId`, the
  value table, and the singular error prefix), passed 215, skipped
  5, and failed 1: the legacy `/scenario/` `axe: the failure states`
  spec, the same environment-dependent `.md-top` contrast failure
  recorded under G-12 at its base. The guided specs alone were
  rerun after the clean-ups.

Independent review passed with no blocking finding. The three
clean-ups above came from its nits. Its one should-fix was this
evidence.

Not verified: screen-reader announcement of the renamed status
line, touch, and engines other than Chromium.
### Restore busy release, 2026-11-04 (G-16)

G-16 ran under the owner's release and grant renewal of 2026-11-04
([Commands](#commands)). It fixes the external review's defect
against §9.2. A restore in offset mode waits for the conversion
data. Until now, a navigation during that wait marked the restore
interrupted only when the fetch settled, so a stalled fetch kept
**Show results** disabled even for a slip-mode draft that needs no
conversion data.

- Every former `navigationVersion` increment in
  `src/explore/app.ts` now calls `invalidate()`. Version semantics
  are unchanged.
- While a restore owns `busy` (the new `restoring` flag),
  `invalidate()` releases it immediately and records `Restoring the
  results was interrupted.`, so the retry panel and **Show results**
  are available at once.
- Typing in an entry field does not re-render the page, so the
  release replaces a visible progress line in place.
- The restore's late continuation now returns on any version change
  as well as on supersession, leaving every shared flag alone. It
  can therefore never clear the `busy` state of a confirmation the
  reader started after the release.
- A successful confirmation also clears `restoring`. After the
  review, a restore superseded by a confirmation can no longer leave
  the flag stale.
- Restore outcomes are otherwise unchanged: success, a validation
  failure, a conversion-load failure, the interruption message, and
  Retry.

The §9.5 continuity spec (item 6) gains two tests. Each holds the
regression response for its whole run:

- **Navigation.** After a reload on Results, a navigation clears
  the progress line and shows the interruption at once. A slip-mode
  draft then reviews and confirms while the fetch is still held. The
  released fetch, processed before the checks run (proved by the
  offset conversion table rendering), changes neither the confirmed
  count nor the movement, and adds no restore notice.
- **Typing.** After a reload on Movement, typing in the offset field
  cancels the restore in place. After the release, the interruption
  stays until Retry succeeds.

Both tests failed against the unfixed code at the progress-line
check. The hold helpers moved from the race spec into
`playwright/explore-support.ts`, shared by both specs.

One limit is accepted under the row's wording. Suppose a reload
lands on Review with a slip-mode draft over an offset confirmation
while the fetch stalls. **Show results** stays disabled until the
reader navigates or edits, because a disabled button cannot itself
supersede the restore.

At this verification:

- The pinned Node suite passed all 417 tests; typechecking and the
  bundles passed. Strict publication and preview builds passed
  with `explore-b97a505fb764.js` and `explore-abe9a2aa7049.css`.
  After rebasing onto the merged G-14, the suite passed all 422
  tests and the builds passed with `explore-18adc509ae2e.js` and
  `explore-cbf963b397ab.css`.
  The `/scenario/` bundles `app-26490347afd0.js` and
  `app-08bebc049c15.css` were unchanged. All 31 hook tests passed.
- The doc checks below passed: relative links resolved, PDD
  agreement held, and traceability linted 491 rows with no gaps.
- The guided specs passed 60 of 60 in `desktop` and `mobile`, and
  68 of 68 after the rebase onto G-14. The
  continuity and race specs passed 60 of 60 over three repeats.
- The full lane passed 211, skipped 5, and failed 1: the legacy
  `/scenario/` `axe: the failure states` spec, the same failure
  recorded under G-12.

Independent review passed with no blocking finding. Its
should-fix, a deterministic proof that the held response was
processed, and its nits (the stale `restoring` flag, the shared
helpers, a test title) are applied. The accepted limit above is its
third nit.

Not verified: a real network stall, as opposed to a held route;
touch; and engines other than Chromium.

### Log-off notice around downloads, 2026-11-04 (G-17)

G-17 ran under the owner's release and grant renewal of 2026-11-04
([Commands](#commands)). It fixes the external review's defect
against §9.3.

The click handler clears `logOffNotice` on every button press, as
G-11 recorded. A successful download does not re-render, so after a
zero-slip confirmation had turned the log scale off, the dismissed
notice's line stayed on screen. The handler now removes
`.gx-log-off` where it clears the flag. That covers the download
and any other press that does not re-render.

The independent review found one more place where the flag and the
line could disagree. The read-off slider's closing `change` event
cleared the flag, without removing the line, and also bumped
`navigationVersion`. The slider is display state handled on
`input`, and its `change` is neither an edit nor a navigation, so
the `change` handler now returns for `#gx-percentile` before
clearing anything. Neither change touches `download()` or the
package code.

The §9.5 width spec (item 9) gains one test:

- turn the log scale on at GS-1;
- reconfirm GS-6, a zero-slip result, so the notice appears;
- download: the line clears at once, the ready status appears, and
  the package keeps its member names and GS-6's reference record
  count;
- a later render does not bring the line back, and the log scale
  stays off in the stored display.

The test failed against the unfixed code at the cleared-line
check. The slider path has no committed spec, because no golden
scenario yields a chartable result without a log histogram; it was
checked by reading the code.

At this verification:

- The pinned Node suite passed all 417 tests; typechecking and the
  bundles passed. Strict publication and preview builds passed with
  `explore-5f2a0c708a9a.js` and `explore-abe9a2aa7049.css`. The
  `/scenario/` bundles `app-26490347afd0.js` and
  `app-08bebc049c15.css` were unchanged. All 31 hook tests passed.
  After rebasing onto the merged G-14 and G-16, the suite passed
  all 422 tests, the builds passed with `explore-38b2b0ac6af5.js`
  and `explore-cbf963b397ab.css`, and the guided specs passed 70 of
  70 in `desktop` and `mobile`.
- Relative links resolved, PDD agreement passed, and traceability
  linted 491 rows with no gaps.
- The full lane passed 210 and skipped 5, with no failure. The
  legacy `/scenario/` `axe: the failure states` spec, which failed
  in the G-12, G-14, and G-16 runs on this machine, passed in this
  run. That is further evidence that its failure depends on the
  environment, not on these changes. The log-scale and walkthrough
  specs passed 30 of 30 over three repeats.

Independent review passed. Its should-fix, the slider path, is
applied. It also noted that the click handler clears
`restoredNotice` while a successful download leaves `Restored the
work in this tab.` on screen. §9.2 keeps that notice until the next
navigation or edit, and a download is neither, so the visible line
is arguably correct and was left unchanged. The out-of-step flag is
recorded here for a later decision.

Not verified: touch, engines other than Chromium, and
screen-reader behaviour when the status line is removed.

### Sample stories, 2026-11-04 (G-15)

G-15 ran under the owner's release and grant renewal of 2026-11-04
([Commands](#commands)). After either sample fill, Site conditions
shows a closed **About this sample** disclosure under the status
line (guided DDD §10.2).

- The disclosure is presentation state: its open state lives in
  `storyOpen`, survives the re-renders of Site conditions, resets on
  every fill, and leaves with the status line. Neither the draft nor
  the session record holds it.
- The texts live in `src/explore/stories.ts`. Both stories carry the
  same sentence: `These are sample values anchored to that
  earthquake's scale; they reproduce no event and model no
  particular site.`
- Each story has one image, with alt text, a caption, and a visible
  credit naming author, licence, and title. Links use the page's
  new-tab helper.
- The images are project images, not application assets. They live
  at `subprojects/mkdocs/docs/images/sample-chichi-kuangfu-track.jpg`
  and `…/sample-kern-bealville-tracks.jpg`, each resized to 960 px
  wide. They publish at `images/`, each with one line in
  `publication-allowlist.txt`, and the page references them as
  `../images/…`. Nothing enters `assets/explore/`.

**Licence verification, per file, 2026-11-04.**

| File | Source | Author | Licence | Verification |
| --- | --- | --- | --- | --- |
| `sample-chichi-kuangfu-track.jpg` | Wikimedia Commons, [Ruin of the destructed running tracks at the 921 Earthquake Museum of Taiwan 2024-09-21.jpg](https://commons.wikimedia.org/wiki/File:Ruin_of_the_destructed_running_tracks_at_the_921_Earthquake_Museum_of_Taiwan_2024-09-21.jpg), from [Flickr 54010394084](https://www.flickr.com/photos/presidentialoffice/54010394084/) | Liu Shu fu / Office of the President, Taiwan | CC BY 2.0 | Commons page licence and FlickreviewR pass (cc-by-2.0, reviewed 2024-09-22); Flickr page licence id 4, CC BY 2.0; SHA-1 of the downloaded original `3d3919eed2eb9ccfee6b7e38a5ae17b859b3f552` matched Commons |
| `sample-kern-bealville-tracks.jpg` | USGS ScienceBase item [51dd6f2be4b0f72b4471a1d7](https://www.sciencebase.gov/catalog/item/51dd6f2be4b0f72b4471a1d7), file `kdh00001.jpg` | Donald H. Kupfer (photographer), 1952; U.S. Geological Survey (data owner) | U.S. public domain | The item's `rights` field: "This USGS product is considered to be in the U.S. public domain." Read through the item's JSON API because the HTML page refuses automated requests |

The ScienceBase item also records that the photograph was published
in California Division of Mines Bulletin 171 (1955). The
public-domain statement is USGS's own, on its source page.

A second CC BY 2.0 file was verified the same way and left out to
keep the disclosure short: the Chelungpu fault trench exhibit, from
the same photographer (Flickr 54010493650).

Story sources. The illustrative story follows
`subprojects/mkdocs/docs/figures.md`, Figure 1: the M 7.6 Chi-Chi
earthquake, the bridge, and the Shih-Kang Dam's roughly 8 m of
uplift. The 2.5 m playground lift comes from the
[Tri-Mountain NSA page](https://www.trimt-nsa.gov.tw/en/attraction/857/),
checked 2026-11-04.

No scholarly companion was verified. Angelier et al. (2003,
*Journal of Structural Geology* 25(3): 351–370) studies the
Kuangfu stadium scarp, but its figure could not be read. Lee et al.
report 2.2 ± 0.1 m average and 2.5 m maximum at the nearby Wufeng
trench, which is a different site. The Tri-Mountain page gives the
earthquake as "magnitude 7.3"; the story uses M 7.6, as the figures
page frames it.

The Kern story uses PDD D-42's anchors: the dip near 75° from Stein
& Thatcher (1981) and Bawden (2001), and SCEDC's "rise of about 1.3
meters". M 7.36 is the site's constant. The Buwalda & St. Amand
sentence follows `docs/datasets.md`, under which the lead author
digitised part of the 1955 report.

Tests and specs:

- New state tests check:
  - one story per sample;
  - the shared sentence in both stories;
  - each story's §10.2 anchors;
  - that the figures citation's anchor still exists;
  - that each image is a committed, allowlisted JPEG whose
    `width` and `height` match the file, with alt text, a caption,
    and a credit naming a CC BY licence or public domain.
- The §9.5 sample spec covers, for both samples:
  - the closed disclosure and its summary;
  - the sample's own text and not the other's;
  - the image loading from `../images/`;
  - the credit;
  - four new-tab links, each with its screen-reader hint;
  - the open state kept across a re-render, gone after leaving
    Site, and closed again on a new fill.
- The layout spec checks 320 px and 1,024 px with the disclosure
  open.

At this verification, on `dev-v.0.4.x` after G-17:

- The pinned Node suite passed all 429 tests; typechecking and the
  bundles passed. Strict publication and preview builds passed with
  `explore-4a5711e9c99a.js` and `explore-daf816cb719a.css`, and both
  images published under `images/` through the allowlist. The
  `/scenario/` bundles `app-26490347afd0.js` and
  `app-08bebc049c15.css` were unchanged. All 31 hook tests passed.
- Relative links resolved, PDD agreement passed, and traceability
  linted 491 rows with no gaps.
- The guided specs passed 74 of 74 in `desktop` and `mobile`. The
  sample and layout specs passed 66 of 66 over three repeats.
- The full lane, run on the first text revision, passed 224 and
  skipped 5, with no failure. Only the story strings, the alt text,
  and the tests changed after that run.

The independent review passed the code. Its findings on the texts
were applied before the owner's review. It asked for one shared
anchored-not-modeled sentence and for the fault angles to stay out
of the Chi-Chi claim. It asked to say "part of" the 1955 survey,
digitised by the lead author, and to stop attaching "geodetic" to
the 1.3 m. It asked for alt text that matches the photograph, for
the CC work title in the credit, and for pinned anchors and
non-vacuous link checks in the tests.

**Owner approval, 2026-11-04 (CR-10, relayed through the planning
session).** The owner approved the revised story texts exactly as
they stand in `src/explore/stories.ts`, with both images and one
image per story. The trench photograph stays out by the owner's
choice after viewing it. On the open points:

- the Kern wording "the scale of that elevation change" stands;
- the field-overlay sentence is confirmed as written;
- the Tri-Mountain citation alone supports the 2.5 m lift, with
  nothing further to verify now, as §10.2 allows;
- a README line for third-party photographs is approved, but stays
  outside G-15 for the owner's own commit.

Not verified: screen-reader reading of the disclosure, touch, and
engines other than Chromium. The README licensing table does not
yet mention third-party photographs; that is outside G-15 and left
to the owner.

### Sample presentation rework, 2026-11-05 (G-18)

G-18 ran under the renewal extension of 2026-11-04. It was first
built to PDD D-43, then held and reworked when the owner adopted
D-44 and guided DDD §10.5 before the merge (the owner revision
above). The branch was rebased onto the owner's docs commits
`8f809b8` and `c5e121d`; neither changed G-18's scope.

**The dialog (§10.5).** **Try a prefilled sample** on the
introduction opens a native modal `<dialog>` titled "Try a
prefilled sample".

- It holds two selectable cards, titled by their inputs: "Lower
  fault angles" (30° and 40°; surface offset up to 3 m) and "Steeper
  fault angles" (60° and 70°; surface offset up to 1.3 m). The
  descriptors name the offset only.
- The cards form a radio group labelled "Samples", with one tab
  stop. The arrow keys move the selection and wrap; Home and End
  reach the ends. The dialog opens with the first card selected.
- The selected card's preview shows its values under the review
  page's labels, the offset and slip ranges, and the slip framing
  note. Selecting a card never changes the draft; the specs compare
  the stored record before and after.
- **Use this sample** applies the selection on a fresh draft. On any
  other draft, including a confirmed scenario or a pending restore,
  the replacement question becomes the dialog's next step: "Replace
  your current choices with the {sample} sample?", with focus on
  **Keep my choices**.
- Escape at either step, Cancel, and Keep my choices close the
  dialog with nothing changed, and return focus to the trigger. Tab
  is held inside the dialog and reaches every focusable item in
  document order.

**Notice and footer.** After a fill, Site conditions and Fault
movement both show "Prefilled with the {sample} sample. You can
change any value." The first draft edit, checked by comparing the
draft with the fill's values, turns it into "Started from the
{sample} sample · Modified". Once Modified, it stays Modified. The
notice stays until another fill replaces it or Start a new scenario
clears it.

- A mode switch is not an edit. While a sample is active, the first
  switch shows and announces the note "The two modes are separate
  assumptions. Each selects a different set of simulations, so
  results can differ." The note stays on Fault movement.
- Discard changes returns to the notice of the fill the confirmed
  scenario started from. The Modified flag of that fill carries over
  while it is still the working fill, so Discard never shows it as
  Prefilled again. A confirmation made without a sample discards
  the notice with the draft.
- After a fill, Site conditions offers only **Continue to fault
  movement** as its primary action, with **Return to review** as a
  secondary one when review was reached. The ordinary footer
  returns once the reader moves past Site conditions.
- Until G-19, the G-15 **About this sample** disclosure stays under
  the notice on Site conditions, with the notice's lifetime.

**Both-mode prefills.** Each sample fills both movement modes;
offset mode stays active.

- Kern: 0–1.3 m offset, and 1.6–1.9 m slip. The preview frames the
  slip as "The slip range spans Bawden (2001)'s two patch estimates,
  1.6 m and 1.9 m, used as an example band." It is never presented
  as an uncertainty interval.
- Illustrative: 0–3 m offset, and 3–5 m slip, an agent selection
  under the PDD §2.3 delegation. The band lies inside the release's
  modeled slip coverage (0–5.0135 m in the manifest), ends near its
  top at the value the page's own **Set maximum to 5 m** shortcut
  uses, and starts at the sample's 3 m offset scale. It is not a
  conversion of the offset. The preview says "The slip range is an
  example band within the simulations' coverage."
- `sampleDraft` throws, rather than shrinking the sample, if a
  release does not accept a sample's slip window. In slip mode both
  windows are accepted with no coverage warning; offset mode keeps
  G-14's observed coverage states.

**Owner approval, 2026-11-05 (relayed through the planning
session).** The owner approved:

- strings 1–8 exactly as sent: the trigger and its hint, the dialog
  title, the card titles and descriptors, the preview labels and
  both slip notes, the dialog buttons, the replacement question and
  its buttons, both notice forms, and the mode-switch note;
- choices a–d: {sample} in sentences is the card title in lower
  case; the dialog opens with the first card selected; Escape,
  Cancel, and Keep my choices close the whole dialog unchanged; the
  mode-switch note appears on the first switch, is announced once,
  and stays until replacement or a new scenario;
- the review-driven Discard rule above, in place of choice (e), as
  the §10.5-compliant rule;
- the screen-reader group label "Samples";
- the consequence of interpretation (a): after a fill, a mode
  switch, and Show results, the notice still says "Prefilled…",
  and the mode-switch note flags the switch.

**Owner decision R, 2026-11-05: the notice survives a reload.**
Before this decision, a reload restored the draft and the
confirmation (§9.2) but dropped the notice. The owner chose to keep
it, as a small §9.2 extension within D-38's display-choices scope.

- The record's display choices now hold `sample` (the working
  fill's `{id, modified}`) and `confirmedSample` (the confirmed
  scenario's fill, with `current` saying whether it is still the
  working fill). Without the second, Discard after a reload could
  not return to the right notice.
- Both keys are validated like the rest of the record: a known
  sample id, boolean flags, no extra keys, and no confirmed fill
  without a confirmed scenario and a working fill. A record written
  before the keys existed restores without a notice rather than
  being refused.
- A restored fill rebuilds its values from the served release; a
  sample the release no longer supports drops only the notice (and
  with it the confirmed scenario's fill).
- Three things are derived or reset on reload rather than stored,
  so a reload can differ slightly from the moment before it:
  - the mode-switch note returns only while the draft is in the
    mode the sample did not set, so it is gone after a switch back
    to offset mode;
  - the story disclosure restores closed;
  - the sequential footer does not return: Site conditions shows
    the ordinary footer, which offers **Return to review** first
    when a confirmed scenario exists.

**Reviews.** The independent review of the D-43 build found five
issues: the chooser lost across an asynchronous re-render, opening
and closing clearing the restore notice, focus moving twice into
the question, a pending restore treated as a fresh draft for the
silent fill, and vacuous spec assertions. All were fixed; the D-44
rework replaced most of that code, keeping the pending-restore rule
and the dialog's initial focus. The re-review of the D-44 rework
found nothing blocking. Its fixes: Discard never un-Modifies a fill,
the Tab trap covers every focusable item, the card group has its
own label, and new specs cover discard, the in-place Modified
update, and previewing over a confirmed scenario. The review of the
decision-R change found nothing blocking. Its two fixes, applied: a
confirmed fill is dropped with a working fill that cannot be
rebuilt, so the next save never writes a record the validator
refuses; and records from before the sample keys are normalised in
`loadSession` instead of inside the validator. It also noted the
three reload differences listed above, now recorded here.

Tests and specs:

- State tests: both-mode prefills validate in slip mode; a release
  that does not cover a sample's slip window throws; `holdsSample`
  treats a mode switch and set order as no edit and every field
  edit as one.
- Session tests: the sample keys round-trip; a record without them
  loads with nulls; nine kinds of tampering are refused.
- The §9.5 sample spec, for both samples: the cards and preview;
  keyboard operation; the fresh fill in both modes with the mode
  note; the notice's Modified form and lifetime; the confirmed
  scenario and the question; Discard; the notice, story, and mode
  note across reloads; Discard after a reload; the dialog across a
  settling restore; and the story disclosure. The layout spec fits
  the open dialog, a preview, and the open story at 320 px and
  1,024 px.

At this verification, on `task/g-18-sample-rework` rebased onto
`c5e121d`:

- The pinned Node suite passed all 435 tests; typechecking and the
  bundles passed. Strict publication and preview builds passed with
  `explore-4d7bf5d8a62d.js` and `explore-35adcbc6a1cb.css`. The
  `/scenario/` bundles `app-26490347afd0.js` and
  `app-08bebc049c15.css` were unchanged. All 31 hook tests passed.
- Relative links resolved (5,511 in 61 files), PDD agreement passed,
  and traceability reported no gap rows.
- The guided specs passed 96 of 96 in `desktop` and `mobile`. The
  sample, layout, and continuity specs passed 180 of 180 over three
  repeats.
- The full lane passed 247 and skipped 5, with one failure outside
  G-18: `a11y.spec.ts`, "axe: the failure states", on `/scenario/`,
  reports `color-contrast (serious): .md-top` — the theme's Back to
  top button — in the unavailable and incompatible-settings states.
  The same spec failed the same way 3 of 3 on the base commit
  `c5e121d`, built and run in the same worktree. This branch changes
  none of the spec, its support module, the `/scenario/` page, or
  its bundles. The spec passed in the lane on 2026-11-05 earlier in
  this task and has failed intermittently once before, so it is
  recorded as a pre-existing, environment-dependent failure (the
  machine's load average was about 12 throughout) and reported to
  the planning session rather than fixed under G-18. CI does not run
  the browser lane.

Not verified: screen-reader reading of the dialog, the radio group,
and the notice; touch operation of the cards; and engines other
than Chromium.

### Sample background and annotations, 2026-11-05 (G-19)

G-19 ran under the renewal extension of 2026-11-04, after G-18, to
guided DDD §§10.4 and 10.5 (PDD D-43, D-44).

**The trigger.** The G-15 **About this sample** disclosure becomes
the closed **Why these sample values?** trigger, with the helper
"Background, photos and sources" in its summary.

- It stands directly under the prefill notice on both Site
  conditions and Fault movement and follows the notice's lifetime:
  it stays through edits and the Modified form, and leaves only on
  replacement or Start a new scenario. Since G-18's decision R, it
  also survives a reload.
- Its open state carries between the two steps, closes on every new
  fill, and restores closed after a reload (choice h).
- Inside it is the §10.2 story material, unchanged except for the
  shared sentence below.

**The card preview.** Under the selected card's values and slip
note, the preview carries the same story material: the paragraphs,
the photograph with caption and credit, and the sources, under the
heading "Why these sample values?". Its links are in the dialog's
Tab order between the cards and **Use this sample**. Licensing is
unchanged: the same two images and credits, so the G-15 licence
evidence stays valid.

**The shared sentence (CR-10).** In both stories, "These are sample
values anchored to that earthquake's scale; they reproduce no event
and model no particular site." becomes "These examples help you try
the tool. They do not reconstruct either earthquake." The rest of
each paragraph stands.

**Annotations.** While a sample is active, each prefilled control
carries a short annotation at the end of its group or below its
entry, so it never moves the control being used.

- An annotation shows only while its own control holds the sample's
  value (`fieldHoldsSample`): sets compare without order, entries as
  typed text, like `holdsSample`. Any change clears it, including
  "3" → "3.0" or a third fault angle, and the sample's value again
  brings it back (choice g). Checkboxes, Select all, the steppers,
  and the shortcuts re-render; typing updates the movement
  annotation in place, redrawing only when it comes or goes.
- Movement annotations follow the active mode: offset in offset
  mode, slip in slip mode (choice i).
- They are plain text in reading order, outside every live region
  and every `aria-describedby`, so they are never announced on
  their own.
- The trigger's summary and the annotations' source links carry
  ids, so focus on them survives the re-render when the conversion
  data arrives.

Final annotation strings:

| Control | Lower fault angles | Steeper fault angles |
| --- | --- | --- |
| Fault angle | "These angles are sample choices, not taken from the 1999 Chi-Chi earthquake." | "Geodetic studies put the White Wolf fault's dip near 75°; the sample uses the two steepest modeled angles." — Stein and Thatcher (1981); Bawden (2001) |
| Sediment depth, density, strength and structure | "A sample choice, not a description of any real site." | the same |
| Surface-offset maximum | "Of the scale of the surface offsets in the sample's background: meters of uplift, including about 2.5 m at a school playground in the 1999 Chi-Chi earthquake." — Chiama et al. (2025), Figure 1; Tri-Mountain National Scenic Area, 921 Earthquake Museum of Taiwan | "The scale of the largest surface elevation change in the 1952 Kern County earthquake, about 1.3 m." — SCEDC, 1952 Kern County earthquake |
| Slip range | "An example band within the simulations' coverage. It is not converted from the surface offset." | "Bawden (2001)'s two patch estimates, 1.6 m and 1.9 m, used as an example band, not an uncertainty range." — Bawden (2001) |

In the Lower offset annotation, the Figure 1 link supports the
meters of uplift and the Tri-Mountain page supports the 2.5 m, as
recorded in G-15; the links follow the sentence's order.

**Approvals, 2026-11-05 (relayed through the planning session).**

- The owner approved the trigger and helper, the card preview's
  story material and heading, and the revised shared sentence
  (CR-10) exactly as sent, and confirmed choices g, h, and i.
- The owner approved the annotations with choice (f) overturned:
  §10.5's "previews and stories only" governs the card titles, not
  the annotations, which name the events and the White Wolf fault
  as the stories do, with the stories' full link labels. The owner
  covered these insertions without a further round; the planning
  session is amending the §10.5 sentence to match.
- The illustrative fault-angle sentence was then revised, approved
  under the owner's overnight delegation of 2026-11-05, relayed by
  the planning session. The approved form, "A sample choice; the
  1999 Chi-Chi earthquake does not set these angles.", could be
  read as a claim about the Chelungpu fault's own dip; the
  independent review raised this, and the sentence above replaces
  it, matching the story's "sample choices".
- The info-icon overlap on the trigger's summary is the shared
  disclosure pattern that G-21 (§11.3) covers; G-19 leaves it.

**Review.** The independent review found no blocking defect. Its
findings, applied:

- focus could fall to the page body when the conversion data
  re-rendered Fault movement with focus on the trigger or a source
  link; both now carry ids, and a spec checks it;
- the fault-angle wording above;
- specs for Select all, the steppers, the coverage shortcut, and
  replacement by the other sample;
- stale comments, and the in-place refresh comparing escaped HTML.

Tests and specs:

- Story tests: the shared sentence appears once in each story and
  the old one is gone; every sample annotates every control in one
  or two sentences; annotations link only their own story's sources
  under the stories' labels; each names its own sample's event and
  never the other's; the Kern anchors stand.
- State tests: `fieldHoldsSample` holds for the fill, a mode switch,
  and set order, and fails for each control's own edits only.
- The §9.5 sample spec, for both samples:
  - the preview's story material, image, credit, and sources, and
    not the other sample's;
  - the Tab order through the preview's links;
  - the trigger under the notice on both steps, its summary and
    helper, its open state across steps and through Modified, and
    closed on a new fill;
  - the annotations on both steps: their texts and links, outside
    live regions and descriptions, clearing with their own value
    and returning, in place while typing, through Select all, the
    steppers, the shortcut, the mode switch, a reload, replacement,
    and Start a new scenario;
  - focus kept across the conversion re-render.

At this verification, on `task/g-19-sample-background` rebased
onto `5385b93`:

- The pinned Node suite passed all 441 tests; typechecking and the
  bundles passed. Strict publication and preview builds passed with
  `explore-c74f3a5830d5.js` and `explore-8c72500af305.css`. The
  `/scenario/` bundles `app-26490347afd0.js` and
  `app-08bebc049c15.css` were unchanged. All 31 hook tests passed.
- Relative links resolved (5,511 in 61 files), PDD agreement passed,
  and traceability reported no gap rows.
- On the final tree, the full lane passed 256 and skipped 5, with no
  failure. One commit earlier, which differed only in the
  illustrative fault-angle string, the lane passed 255 with one
  failure, the pre-existing `a11y.spec.ts` `.md-top` contrast check
  recorded under G-18 and now assigned to G-21. In that same run,
  the sample and layout specs passed 156 of 156 over three repeats
  in `desktop` and `mobile`.

Not verified: screen-reader reading of the trigger, the preview's
story, and the annotations; touch; and engines other than Chromium.

### Wording and presentation polish, 2026-11-05 (G-20)

G-20 ran under the renewal extension and the D-45 release, after G-19,
to guided DDD §§11.1–11.2. The audit is the owner's local file
`notes/2026-11-05/explorer-wording-ux-audit.html` (reviewed at
`635e59b`, 75 entries).

**Ruling (A), 2026-11-05.** Four of §11.1's swaps live in shared code
that `/scenario/` also bundles (`views/copy.json`, `views/stats-table.ts`),
and `copy.json` is the PDD copy deck. Applying them there would have
changed the `/scenario/` bundles, which must stay byte-identical, and
amended the copy deck. The planning session ruled, under the owner's
overnight delegation of 2026-11-05: the guided page gets the full
adopted wording through a guided-only copy layer; `copy.json`, the PDD
copy deck and `/scenario/` stay unchanged. Adopting the wording for
`/scenario/` too (option B) is on the owner's morning list, with the
slip Minimum "Required" mark (audit entry 16).

**The copy overlay.** `src/explore/copy-overlay.ts` maps copy.json keys
to their adopted texts with the same slots. `guided()` turns each
registry template, slots captured, into the adopted one, and
`guidedSvg()` does the same through a chart's tree. The guided page
applies them to the shared builders' output only: notices and caveats,
statistics row labels, chart accessible names and axis titles, the
histogram-table caption, and the cumulative caption. A registry edit
that changes a key's slots fails loudly. Adopting option B later means
moving these texts into copy.json and deleting the calls.

**Wording (§11.1).** On the guided page:

- "matching records" → "matching simulation stages" (singular "stage"),
  with the same term in the statistics hint, the empty-result heading,
  the status lines, the introduction, and the no-measurement notice;
- "valid measurements" → "measurements used" (singular "measurement
  used"), in the panel count, the small-result and suppression notices,
  the chart names and axis, the table caption, and the cumulative note;
- "Valid count" → "Measurements used"; "Excluded null count" →
  "Missing values (excluded)";
- "Corresponding fault slip at depth" → "Estimated fault slip at depth";
- "Your window includes" → "Your selected range includes";
- "Histogram bin data" → "Histogram counts by value range";
- "Browse freely" → "Exit walkthrough";
- "Download results" → "Download data (ZIP)", described by "Matching
  simulation stages, statistics, scenario settings and sources.";
- the normalization phrase → the audit's two messages, chosen by the
  rule the entry broke: "Enter 0 or a positive number, such as 0.5."
  for malformed text, and "Use at most 16 characters, counting the
  decimal point and the 0 before it." over either length limit. The
  limits themselves are unchanged.

The ZIP's contents are unchanged, including provenance.txt's "matching
records: {count}", as the audit asks for export contents.

**Presentation (§11.2).**

- Results: "Your confirmed scenario" opens with its count, a compact
  two-line summary in the review's own labels, and the partial-coverage
  warning. The caveats and the unapplied-changes bar stay where they
  were. Measurement choices, the chart and the statistics follow; **View
  full scenario** comes after them, holding the full summary, the stage
  explanation and the conversion table. It starts closed, keeps its open
  state across re-renders, and is not persisted.
- Walkthrough: "Results walkthrough · n of 5"; Back and Next repeat after
  the stop's content.
- Help: the four site-condition disclosures repeated their visible
  sentence word for word, so each gives way to the existing "Read the
  glossary" link at the end of that sentence. The two movement
  disclosures add information and stay.
- The Scarp dip card carries "Provisional data", the opening words of the
  §5.4 notice, before selection.
- Density reads Dense, Medium, Loose in the choices and every summary;
  each choice keeps its own value.

**Audit dispositions (all 75 entries).**

- Addressed in G-20: 8, 11, 17, 33, 34, 35, 40, 55, 56 (the repeated
  Back and Next; not sticky), 61.
- Addressed in part (the parts §11.1 names): 19 ("Estimated fault slip at
  depth"; "Simulation coverage / Fully covered / Not covered" not
  adopted), 37 (the range wording; the rest of the sentence unchanged),
  45 (the summary, and "measurements used" in the caption; "bin" stays),
  59 ("measurements used" in the notices; thresholds and behaviour
  unchanged), 75 (singular and plural for the new guided counts only).
- Done in G-18 and G-19 (D-43, D-44): 25, 26, 27, 28, 32; 29 in part (the
  shared sentence under CR-10).
- For G-21 (§11.3): 12, 64, 67.
- Keep, no change needed: 1, 5, 13, 15, 22, 23, 31, 42, 48, 50, 51, 52,
  54, 60, 62, 63, 74.
- Research, held for the research group: 9, 10, 29 (the rest), 38 (D-46,
  proposed), 39.
- Not adopted by D-45: 2, 3, 4, 6, 7, 14, 16, 18, 20, 21, 24, 30, 36, 41,
  43, 44, 46, 47, 49, 53, 57, 58, 65, 66, 68, 69, 70, 71, 72.
- Existing open item: 73 (D-10, the liability text).

**Approvals, 2026-11-05.** Approved under the owner's overnight
delegation of 2026-11-05, relayed by the planning session:

- ruling (A), and the scope reading above (dispositions, entry 16 left
  out);
- the two refused-number messages and the download description, exactly
  as listed above;
- the overlay texts, with one substitution: the cumulative note ends
  "Statistics and percentile read-offs rely on all measurements used for
  this scenario.", avoiding a use/used echo;
- the guided count wording, the compact summary, the "Provisional data"
  mark, the help change, the walkthrough label and repeated navigation,
  and the density order;
- keeping "bin" in the table caption, and leaving the ZIP's contents
  unchanged.

**Review.** The independent review found nothing blocking and
confirmed that nothing under `src/views/` or in any `/scenario/`-only
file changed. Its findings, applied:

- the chart overlay scanned every attribute, a full cumulative polyline
  included, on each slider move (about 0.2 s a call in its timing); it
  now rewrites only accessible names and text, and skips a template
  whose literal text is absent;
- an empty or multi-line slot, or one ending a template, could fail to
  match silently; the patterns now cover them;
- with both slip entries refused, the alert repeated the same message;
  it now says each distinct message once, and each field keeps its own
  error and description.

Left as they are: the stage explanation's "record" wording next to the
new terms, which §11.1 does not list.

Tests and specs:

- Overlay tests: every key exists and the registry keeps its own text;
  filled registry texts become the adopted ones with their slots,
  inside markup too; a chart tree is rewritten in attributes and text;
  no adopted text keeps the replaced wording.
- State tests: each refused entry gets the message for the rule it broke,
  in both modes.
- The new `explore-polish` spec, in both lane projects: the results
  order and the compact summary, the warning visible and the table
  behind the disclosure, its open state across a re-render; the adopted
  wording on the page, the shared builders' output included, and none of
  the replaced wording; the download's description; the Scarp dip mark;
  density order; the help change; the two messages in the browser; Exit
  walkthrough. The walkthrough spec checks the label and the repeated
  navigation at every stop, and uses the lower Next once. Specs asserting
  the old strings were updated.

At this verification, on `task/g-20-wording-polish` rebased onto
`5e863e1`:

- The pinned Node suite passed all 447 tests; typechecking and the
  bundles passed. Strict publication and preview builds passed with
  `explore-504bd1c8f6a1.js` and `explore-2957d9d013fd.css`. The
  `/scenario/` bundles `app-26490347afd0.js` and `app-08bebc049c15.css`
  were unchanged, as ruling (A) requires. All 31 hook tests passed.
- Relative links resolved (5,511 in 61 files), PDD agreement passed with
  the copy deck untouched, and traceability reported no gap rows.
- The guided specs passed 118 of 118 in `desktop` and `mobile` before
  the review fixes. The polish, walkthrough, and layout specs passed 72
  of 72 over three repeats after them.
- The full lane passed 269 and skipped 5, with one failure outside G-20:
  the pre-existing `a11y.spec.ts` `.md-top` contrast check on
  `/scenario/` (load average about 15), recorded under G-18 and assigned
  to G-21.

Not verified: screen-reader reading of the new layout and labels,
touch, and engines other than Chromium.

## Separate CI investigation

The reported job `126383105016` belongs to historical run
`41771840814`, commit `51bed5a`, which lacked saved prototype files.
A later failure at `a718559` similarly lacked the results files.
At this investigation, HEAD `ad5d4c0` had a
[successful documentation job](https://github.com/HarvardRC/eps-ground-rupture/actions/runs/41789213295/job/126438413697).
Local checks at that commit resolved 5,421 links across 57 Markdown
files, passed PDD agreement, accepted 491 traceability rows without
gaps, and passed 19 documentation-script tests. Old failed runs retain
their historical status; no rerun or workflow modification was needed.
