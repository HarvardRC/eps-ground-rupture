# Site review follow-up — 13 November 2026

Reviewed `dev-v.0.4.x` at `7c033a0`
(`7c033a06748ff7ee44d06dc400ff077f516d8360`) against the
[12 November review](site-review-2026-11-12.md), the research-group
feedback, and the subsequent owner decisions. The working tree was
clean at the start. This pass made no application or design changes.

The approved G-33 fixes and G-32 home-page introduction have landed.
The current commit was successfully deployed by the
[Companion site workflow](https://github.com/HarvardRC/eps-ground-rupture/actions/runs/43384082113).
The public Explorer serves `explore-ac4e15ec645e.js`, matching the
recorded G-33 bundle, and the home page contains the G-32 paragraph.

## Assessment

No introduced regression was found in the reviewed changes. The
Tableau sizing defect is fixed on the public site, the input-mode
labels are correct, and the revised scarp-dip notice explains the
remaining uncertainty accurately. The new home-page link is present
and matches the approved task.

Two P1 findings remain: the field displacement/width comparison and
silent gaps in selected model coverage. They were deliberately held
under D-55, rather than missed by the implementation. This pass adds
an important detail to the coverage finding and identifies two
additional P2 issues: contradictory messages after a download retry,
and outdated status information in the research briefing.

## Findings to address next

### R2 — P1, still open: coverage depends on fault angle too

The first review correctly identified that Random Heterogeneous and
Alternating Strong-Weak are restricted to Dense sediment at 10 m
depth in this dataset. That description was incomplete:

- Random Heterogeneous has all seven modeled fault angles.
- Alternating Strong-Weak has only **20°, 40°, and 60°**.

The latter restriction is already documented in the
[Response curves guide](../subprojects/mkdocs/docs/dashboards/response-curves.md)
at line 88 and was confirmed against the current CSV export.

**Live reproduction in this review:** choose 45°, 10 m, Dense, Uniform
Strong plus Alternating Strong-Weak, and 0–5 m fault slip. The review
and results include both profiles without a coverage warning. Results
show **1,200 matching stages and 1,164 scarp-height measurements**.
Remove Alternating Strong-Weak and confirm again: both counts remain
exactly the same.

The issue is the implied contribution of the selected profile, not
incorrect filtering arithmetic. A Dense/10 m badge alone would leave
this example unexplained.

**Recommendation:** derive coverage from the available combinations
of angle, depth, density, and sediment profile. Explain which selected
profiles contribute no records, while retaining the user's choices.
Distinguish model availability from a filter that happens to leave no
matching stages. The known coverage does not need another broad
scientific question; the remaining choice is how to present partial
coverage, followed by release of the held change.

Sources: [app.ts](../subprojects/webapp/src/explore/app.ts), choices
around line 487 and result summaries around line 642. D-55 explicitly
holds this work; no behavior was changed in this review.

### R1 — P1, still open: displacement is described as width

The public Distributions guide still says the field data measure the
same quantity and calls the pooled values deformation-zone widths.
SURE's fault-normal component is horizontal displacement across the
rupture, not a width of disturbed ground. The pipeline mapping and
the Model vs reality explanation are unchanged.

**Recommendation:** identify the original physical quantity by source
in the explanation and visualization, and qualify the interpretation
of overlap. Whether to retain the limited SURE comparison requires the
group's decision. This review does not conclude that every comparison
of different quantities must be removed.

Sources: [Distributions](../subprojects/mkdocs/docs/dashboards/distributions.md)
at lines 64 and 205;
[Model vs reality](../subprojects/mkdocs/docs/dashboards/model-vs-reality.md)
at line 47;
[views.py](../subprojects/python/src/eps_ground_rupture/views.py) at
lines 287 and 502. Deferring the Explorer's field overlay does not
resolve the presentation already present in the public dashboards.

### R18 — P2, newly identified: retry success retains a failure message

If archive creation fails, the app sets the visible general error and
the alert to “The download could not be created…”. A successful retry
then sets the download status to “Your confirmed result download is
ready” without clearing the earlier error. Both messages can remain
on the same results screen.

This predates the recent fixes. It was verified by executing the actual
download handler with an archive failure followed by success, and by
checking the enclosing click handler: the download action does not
clear the general error there either. It was not induced in the public
browser session.

**Recommendation:** clear the previous download-owned failure and its
alert when retrying or succeeding, without discarding unrelated
errors. Add a failure → retry → success regression check that verifies
the visible error is removed and the success status remains.

Source: [app.ts](../subprojects/webapp/src/explore/app.ts), retry and
success at lines 1137–1149, failure at lines 1153–1155, rendering at
line 807, and click dispatch at line 1295.

### R19 — P2, newly identified: the research briefing has stale statuses

The [research-group briefing](research-group-questions.md) contains
answers and status statements from 6 November without the later
decisions that now supersede them:

- Its opening and lines 556–565 still describe D-18 field comparisons
  as a public-release gate. D-53 removed that gate on 9 November.
- Lines 572–574 still describe the liability text as a placeholder.
  D-10 is decided, and the public page carries the final text.
- Lines 575–578 state the earlier general CC BY 4.0 export decision
  without the 8 November amendment distinguishing DEM-derived
  databases from produced works and the field export.
- Lines 512–515 say the shipped conversion already applies sine
  geometry. The implementation uses the fitted slope and intercept;
  this is the previously identified R5 documentation ambiguity.

These are discrepancies between project records, not new legal or
scientific conclusions. See the 8–9 November amendments in
[ADR-0017](../docs/adr/0017-unadvertised-prototype-before-public-release.md),
PDD D-10/D-53, and
[the current disclaimer](../subprojects/mkdocs/docs/explore.md).

**Recommendation:** retain the dated historical answers but add the
current disposition directly beside them. Replace current-tense
statements that no longer apply. Do not ask the group to settle the
release scope or liability text again. The PDD §5.1 heading also still
says “D-10 Open” despite its decided register entry and final text.

## Disposition of the previous review

“Resolved” below refers to the identified defect, not to every possible
future improvement in that area.

| Finding | Current status |
|---|---|
| R1 — SURE displacement/width | Open and explicitly held. See above. |
| R2 — unavailable sediment combinations | Open and explicitly held. New angle restriction and live reproduction above. |
| R3 — Tableau sizing/loading | Resolved. All seven public embeds reached ready state; their widths fit the containers at desktop and narrow viewport sizes. Loading messages cleared. |
| R4 — percentage meaning/simulation counts | Open improvement proposal. Preserve the approved forecast framing and unknown-value guidance. |
| R5 — regression versus sine conversion | Open and explicitly held. Per-angle selection is already approved; only the precise relation and its description need clarification. |
| R6 — scarp-dip notice | Wording resolved. Confirmation of the exact release's corrected column remains open; provisional status correctly remains. |
| R7 — negative-height/small-count messages | Open and explicitly held. The supplied −0.02 m explanation should not automatically explain every negative magnitude; the small-count sentence remains categorical. |
| R8 — archive wording | Resolved in source and targeted tests. Guided CSV labels and provenance receive the overlay; records, settings, identifiers, and numbers retain their shared-package content. |
| R9 — surface offset labelled fault slip | Resolved in source and live UI. The movement heading is neutral and result summaries name the entered quantity. |
| R10 — workbook/scientific copy | Partial. Response curves' Markdown link now names the correct relationship. Workbook wording, fixed population caption, general forecasting claims, and Kern-angle context remain open. |
| R11 — content placement/density | Deferred design proposal. No redesign was part of G-33. |
| R12 — home introduction | G-32 complete and live, including its approved placement after the cards. Broader metadata/Data-guide suggestions remain optional follow-up work. |
| R13 — sediment explanations | Open. The group has supplied the substance; placement, display names, and sketches are product choices. |
| R14 — histogram controls | Deferred product proposal, not a missed existing control. |
| R15 — typography/legends | Open design proposal. Tableau text remains dense and often very small; legends still include all classes. |
| R16 — semantic structure | Page main landmark resolved. Word section headings remain bold paragraphs rather than semantic headings. |
| R17 — download feedback | Visible preparation/success/partial-success status implemented. Chart-sidecar recovery remains open. R18 identifies an additional whole-download retry issue. |

The owner deliberately held the fault-steepness wording change and
restored the repeated Model vs reality link. They are not implementation
omissions. G-32 required one exact sentence in one location; this review
does not reclassify that completed task as incomplete because broader
home-page redesign was not included.

## Visual and wording observations

The mobile Tableau repair is substantial: the chart no longer appears
as a cropped strip, and its controls are visible. Scaling a full desktop
dashboard still makes its type and controls small. A readable phone
layout remains separate design work, not a recurrence of R3.

The strongest next visual improvements remain:

1. Put a short reading guide and the chart before the longer dashboard
   methods discussion. Preserve the detailed explanations below it.
2. Reduce the vertical space used by the Explorer's result summary and
   measurement cards on narrow screens, preserving their explanatory
   questions and the conspicuous refinement action.
3. Give Tableau axes and controls human-readable measurement names and
   units. Retain technical identifiers in data downloads where needed.
4. Explain uniform versus layered strengths at selection, with simple
   profile diagrams when the presentation is agreed.

Two retained workbook issues were re-observed live:

- In Distributions, selecting “Final state per trial” leaves the
  caption “Typical values per class (all stages pooled)”. The caption
  needs to follow the selected population.
- Response curves still calls saved stage points “individual simulated
  trials” and describes responses “as an earthquake grows,” using
  “net displacement” and “more severe rupture.” The committed workbook
  remains the place to correct these strings before republishing it.

The source workbook already has static unit-bearing axis overrides;
generic live axis titles are a publication/rendering discrepancy to
investigate, not proof that those source overrides are absent.

A smaller editorial leftover is the home-page glossary tip: it still
says the glossary “assumes you have none of it” and defines every term,
despite the glossary's improved opening. Suggested future wording:
“The glossary explains the geological and statistical terms used across
the site.” The metadata and the Data guide also remain focused on
dashboards.

## Verification and limits

Independently completed in this pass:

- Source and decision reconciliation by three review passes: functional
  changes, copy/UX, and scientific alignment.
- 49 targeted Node tests for Tableau fitting, guided reports/archives,
  chart export, and range controls; all passed under Node 22.12.0.
- Both TypeScript configurations passed.
- Read the current-commit workflow result: webapp checks, calculation
  parity, site build, and deployment all succeeded. The separate
  [documentation check](https://github.com/HarvardRC/eps-ground-rupture/actions/runs/43372415492)
  also succeeded for this commit.
- Public home-page introduction/link; Explorer input, review, results,
  edit/reconfirm flow, both movement modes, revised scarp-dip notice,
  and one main landmark.
- Live coverage comparison at 45°/Dense/10 m, with and without the
  unavailable alternating profile.
- All five dashboard pages and all seven Tableau embeds. Each reached
  ready state; fitting was checked at 1280 px and 390 px viewport
  widths. Available content widths in this browser were 981 px and
  341 px respectively; hosts and inspected iframe boxes matched their
  available widths. The loading messages cleared after readiness.
- Distributions population switching and the retained caption mismatch.
- Source-path reproduction of download failure followed by success.

The implementation record reports 505 passing Node tests and a full
Chromium lane of 391 passed/11 skipped for G-32/G-33. This review did
not rerun that entire lane. It did not repeat a real ZIP download,
render Word pages, test other browser engines or assistive technology,
or perform a security audit. The earlier local archive check and the
current targeted archive tests support R8; they are not represented as
a new public download in this pass.

## Suggested next step

Resolve the model-coverage presentation and the field-comparison
wording first. Coverage can be based on the known dataset; the narrower
scientific follow-ups concern whether to retain the SURE comparison,
the fitted-versus-geometric conversion, confirmation of corrected
scarp dip in the named release, and the larger negative-height values.

The retry-message cleanup and briefing-status reconciliation can form
a small, separate maintenance change. Broader layout and visualization
controls should proceed through the product/design sequence rather
than being folded into that maintenance work.

## Verification note (planning session, 2026-11-13)

Seven independent read-only checks of this review covered the live
site at `7c033a0`, the shipped data-v1 vintage, the code, and the
project records; the Tableau workbooks were searched, not opened.
They confirmed its findings, with these corrections:

- **R2.** Reproduced exactly: 1,200 stages and 1,164 scarp heights,
  with and without Alternating Strong-Weak. Of the 63 combinations of
  angle, depth and density, Random Heterogeneous has simulations in 7
  and Alternating Strong-Weak in 3; every other profile has all 63.
  The explorer names a profile's absence only when the whole result
  is empty, and a profile can contribute at some selected angles and
  not at others, so a fix must cover partial contribution and the
  downloads as well as the screens.
- **R1.** The effect is larger than stated: 185 of the 209 width
  values the Distributions chart shows by default are SURE
  fault-normal displacements. The distinction is not absent from the
  site: the glossary and the Per-event boxplots guide define the
  fault-normal component correctly; the gap is on the Distributions
  and Model vs reality pages.
- **R18.** Reproduced on the public site with an injected archive
  failure; fixed by guided task G-34.
- **R19.** Confirmed. The briefing already recorded the 2026-11-08
  licence refinement under question 2, so only its summary lines
  were out of date; its opening also still described the release
  timing. G-34 updates them, except the conversion sentence held
  with R5. Two PDD section headings also lag their decided register
  rows (§3.6, §5.1).
- **Disposition table.** The fault-steepness hold and the restored
  second Model vs reality link came from the planning session's G-33
  repairs, which the owner's commit of PDD D-55 ratified; the
  steepness word is held for the research group's answer. R16's
  "Word" means the downloadable Word report. R17: a message already
  reports a blocked provenance file; only a way to download that
  file again on its own is missing. R3: the embeds load when they
  scroll into view. Not listed: the step list still names the
  movement step "Fault slip".
