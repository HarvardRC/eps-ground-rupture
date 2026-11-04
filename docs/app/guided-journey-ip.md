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
and their evidence stand unchanged.

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
| G-12 | Main-plan T-60 lane; G-08–G-11 | Implement the guided browser specs of guided DDD §9.5 inside the T-60 lane, running against the strict preview build. | All eleven guided specs pass in both lane projects, the race and continuity specs included; touch and cross-engine coverage recorded as outstanding; evidence recorded. |

G-08 is independent of the application tasks. G-09–G-11 share
`app.ts` and `state.ts` and run in order. G-12 waits for the main
plan's accepted T-60 task to build the browser lane; implementing
T-60 next is the recommended order for the same agent. The owner
runs the deployment beside T-54 after G-08 lands.

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
build retains the draft boundary until G-08 lands. Do not deploy.
Stage, commit, push, or open pull requests only as the owner's
kickoff instruction for each task states.

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
