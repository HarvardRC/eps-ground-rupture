# Repository and public-site review — 12 November 2026

This review covers the Ground Rupture Explorer, its downloads, the five
dashboard pages and their Tableau workbooks, the supporting site text,
and the implementation behind them. It incorporates the research
group's supplied feedback and the subsequent owner decisions.

Source baseline: `dev-v.0.4.x`, commit `15d0451` (full hash
`15d04519081448b556e7dcf07e42ad5e18f07ad9`). The working tree was clean
at the start. The public Explorer reported software 0.4.0 and data-v1.
The deployed commit was not independently established. Findings below
distinguish live observations, source findings, and design proposals.

At the original review, no application, pipeline, workbook, or design
specification was changed. The subsequent authorized correction pass
is recorded at the end of this note; unaddressed recommendations remain
proposals, not amendments to accepted tasks.

## Overall assessment

The guided Explorer now provides a coherent way to construct a scenario.
The required selections, review step, measurement choice cards,
refinement flow, and explanation of simulation stages are worth keeping.
The main journey worked in the live checks, and an actual downloaded
archive agreed with the displayed counts and statistics.

The most urgent remaining problems concern scientific interpretation
and access to information:

1. Public dashboard explanations present some horizontal displacement
   measurements as deformation-zone widths.
2. A selected sediment profile can contribute no simulations without
   the app explaining that its depth or density is unavailable.
3. Tableau embeds crop charts and controls at narrow widths because
   their scaling code assumes a different layout width from the one
   the browser actually uses.

Beyond those issues, the site needs a coordinated wording pass. The
Explorer, glossary, Markdown dashboard guides, embedded Tableau text,
and exported files have evolved at different rates. A correct sentence
on one surface does not ensure that the reader sees it elsewhere.

Priority meanings: **P1** should be addressed before a broad research
demonstration or promotion; **P2** should be planned next; **P3** is
editorial polish. These are review recommendations, not new release
gates. Scientific questions are explicitly identified below.

## Priority findings

### R1 — P1: distinguish displacement from width in field comparisons

**Evidence: source and public dashboard text.** The pipeline puts
SURE's fault-normal component (`FNC`) into a column named `dzw` in both
the scatter comparison and the historic-event reference data. FNC is
horizontal movement perpendicular to the fault trace; it is not the
width of the disturbed ground. Another export in the same pipeline
already records this distinction with `limited_comparison`.

The Distributions guide nevertheless describes the reference lines as
measuring the same quantity, calls the values widths, and interprets
overlap as the simulations bracketing reality. The Model vs reality
guide's general qualification does not explain the FNC substitution.
This is an existing public-dashboard issue, independent of the owner's
decision to defer field overlays in the guided Explorer.

Sources: [views.py](../subprojects/python/src/eps_ground_rupture/views.py)
at lines 287, 500, and 617;
[Distributions](../subprojects/mkdocs/docs/dashboards/distributions.md)
at lines 53–78 and its field-count footnote;
[Model vs reality](../subprojects/mkdocs/docs/dashboards/model-vs-reality.md)
at line 47. The local historic export has 185 positive SURE FNC values;
56 SURE observations have both coordinates for the scatter comparison.

**Recommendation:** identify the source and original physical quantity
in the chart, legend, tooltip, and adjacent explanation. Remove claims
of equivalent quantities or general model validation. Do not quietly
change the data mapping: whether the limited comparison should remain
is a research-group decision.

Suggested explanation:

> FDHI and Kern County provide widths of disturbed ground. SURE provides
> fault-normal displacement: horizontal movement across a rupture, not
> deformation zone width. SURE is a separate, limited comparison; its
> position does not establish agreement in width.

### R2 — P1: disclose unavailable sediment combinations

**Evidence: live reproduction and source data.** Random Heterogeneous
and Alternating Strong-Weak profiles were modeled only for dense
sediment 10 m deep. The current choices allow other depths and
densities, and a mixed selection can hide the absence of those models.

Live reproduction: select all fault angles, depth 3 m, Dense, Uniform
Strong plus Random Heterogeneous, and surface offset 0–1.3 m. Results
show 3,492 matching stages and 3,124 scarp-height measurements. Removing
Random Heterogeneous produces exactly the same counts. The confirmed
summary still lists Random Heterogeneous when selected, with no warning
that it contributed nothing.

Sources: [app.ts](../subprojects/webapp/src/explore/app.ts), sediment
choices around line 485 and summaries around line 639; the research
group's answer on sediment profiles; the already-recorded coverage
question in [research-group-questions.md](research-group-questions.md)
around line 349.

**Recommendation:** show “Modeled only for dense sediment, 10 m deep”
beside these profiles. Before confirmation, explain which selected
profiles have no matching models. In results, distinguish requested
conditions from conditions represented by the contributing simulations.
Do not silently select another depth or discard the user's choice.

This needs a defined product rule for partial coverage, not merely a
different empty-results message. “Select all” does not create a complete
matrix of modeled combinations.

### R3 — P1: fix Tableau cropping before visual polishing

**Evidence: live desktop/mobile inspection and source.** At a 390 × 844
viewport, the Distributions wrapper is 358 px wide. Its Tableau host
has a layout width of 356 px, then receives a scale of 0.445, producing
a rendered width of only 158.42 px. The chart occupies a narrow strip;
other chart content and controls are cropped, and the loading message
remains exposed. The condition persisted after the chart rendered.

The fitting script assumes the host has the declared native width of
800 px. That HTML component attribute does not establish the CSS box
that the script transforms. At a desktop width, the same assumption
can instead enlarge the host beyond its wrapper.

Sources:
[tableau-fit.js](../subprojects/mkdocs/docs/javascripts/tableau-fit.js)
at lines 26–35 and
[extra.css](../subprojects/mkdocs/docs/stylesheets/extra.css) at lines
181–205. The loading message deliberately depends on the visualization
covering it rather than being dismissed when rendering completes.

**Recommendation:** establish matching native host and iframe dimensions
before applying a transform, or use responsive embedding without the
second scaling operation. Explicitly dismiss the loading state on
successful rendering. Verify all seven embeds across the five pages
after they become interactive, at both narrow and wide widths.

The current regression test establishes that an iframe exists and has
the expected address; it does not prove that the chart and controls are
visible. Add a check for completed rendering, dimensions, and clipping.
Correct scaling alone will not make a desktop Tableau dashboard easy
to read on a phone; a readable narrow-screen presentation remains a
separate design task.

## Scientific meaning and qualifications

### R4 — P2: explain what the percentages represent

The owner has adopted the research group's forecast framing and
“If unknown, select all” guidance in PDD D-51. This review does not
propose reversing that decision. It does recommend making the scope
and denominator more visible next to the claims.

“Probabilities from simulations” can be read as site hazard probability.
Selecting every value pools the available experiments; it does not
establish how likely each condition is at a real site. The current
all-stages mode can also give one simulation several contributions.
The refinement explanation handles that well, but readers can miss it.

Suggested short additions:

> The tool uses published two-dimensional simulations of thrust and
> reverse faults.

> Percentages describe the selected simulation measurements. They do
> not estimate how likely these conditions are at your site.

Show both stage count and distinct simulation count. In one verified
download, 10,488 stages came from 252 simulations. “10,488 matching
stages from 252 simulations” is more informative than either alone.
Keep the measurement-specific missing-value counts as they are.

Sources: [app.ts](../subprojects/webapp/src/explore/app.ts), introduction
around line 312, stage explanation around line 660, and footer around
line 731; [explore.md](../subprojects/mkdocs/docs/explore.md), disclaimer
around line 42. The longer disclaimer already limits hazard claims;
the proposal is to make the essential distinction visible sooner.

### R5 — P2: separate approval of per-angle selection from the formula

The research group approved converting offset separately for each
selected fault angle and described the relation as slip × sin(dip).
PDD D-3 says the existing conversion already applies that geometry.
The implementation actually inverts a fitted regression with a nonzero
intercept: `(offset - intercept) / slope`.

These are close but not identical. For 1 m offset at 70°, the fitted
conversion gives about 1.072883 m slip; pure sine geometry gives about
1.064178 m. At zero offset, the fitted conversion can give a small
positive slip because of its negative intercept.

Sources: [PDD](../docs/app/pdd.md), D-3 and §3.6;
[convert.ts](../subprojects/webapp/src/convert/convert.ts) around line 79;
[views.py](../subprojects/python/src/eps_ground_rupture/views.py) around
line 322.

**Recommendation:** correct the decision record so it does not imply
approval of a formula the group did not explicitly review. Ask one
precise question: retain the fitted relation, or use the geometric
relation? Explain the zero-offset consequence. Do not change numerical
behavior merely to make the wording true.

### R6 — P2: describe scarp dip as awaiting verification of this release

The group says the published correction is ready and has been checked.
The project's unresolved question is whether its imported `Scarp_Dip`
column contains that corrected series. The dataset has no imported
`Convert_Scarp_Dip` column. Its Simple classes have no negative dips,
but 30 negative values remain in other classes.

Retaining the provisional status is justified by the unresolved data
identity. Saying the values “await a correction from the research
group,” or are “known to be wrong here,” misstates the current question.

Suggested wording:

> Scarp-dip results remain provisional while we confirm that this data
> release contains the approved corrections.

Sources: [PDD](../docs/app/pdd.md), D-5;
[copy.json](../subprojects/webapp/src/views/copy.json), scarp-dip notice;
[Distributions](../subprojects/mkdocs/docs/dashboards/distributions.md)
around line 136. Obtain confirmation for the named data release and
column before removing provisional labels from any surface.

### R7 — P2: qualify the two assembled warning messages

The group supplied the underlying explanations; it did not approve
every inference in the assembled display sentences.

**Negative height:** the note fires whenever the selected minimum is
negative and says small negatives are at the approximately 0.02 m
particle scale. The source data contain 1,232 negative heights:
495 below −0.02 m, 37 below −0.04 m, and a minimum of −0.182 m. All are
at slip below 0.5 m. The explanation of the sample's −0.02 m should not
automatically become an explanation of every negative magnitude.

Suggested wording:

> Small negative heights can reflect particle-scale resolution,
> smoothing, or compaction at low slip. The recorded values are
> retained.

Ask the group whether larger negative values need a separate explanation
or data check. Do not replace them with zero or remove them.

**Small counts:** “They are not less trustworthy” is categorical and
can appear beside a low-slip reliability warning. Few values can also
result from a narrow slip range, a scarp filter, missing measurements,
or limited model coverage, rather than only specific site conditions.

Suggested wording:

> Only {N} measurements are available for this selection. A small count
> does not itself make them less reliable, but it limits how much of the
> modeled variation the result shows. Consider a wider range of
> conditions if that fits your question.

Sources: [wording.ts](../subprojects/webapp/src/explore/wording.ts),
negative-height note around line 42;
[copy-overlay.ts](../subprojects/webapp/src/explore/copy-overlay.ts),
small-count and suppression messages around lines 18–22.

## Consistency across the app, exports, and dashboards

### R8 — P2: apply the adopted wording to the entire guided download

**Evidence: an actual live download.** The page and Word report use
the adopted below-0.5-m warning, but `provenance.txt` still carries
the older statement that the group is reviewing low-slip reliability.
The `statistics.csv` label still spells “Deformation-zone width” with a
hyphen. These are human-readable labels, not a need to rename stable
CSV columns.

The guided archive directly uses shared `packageTexts()` output, while
the Word report and chart-image sidecar apply the guided copy overlay.
This explains the divergence within a single result package.

Sources: [report.ts](../subprojects/webapp/src/explore/report.ts) at
lines 279–285 and 400;
[chart-export.ts](../subprojects/webapp/src/explore/chart-export.ts)
around line 107.

**Recommendation:** make the guided archive use the approved wording
for all human-readable labels and caveats. Preserve machine-readable
identifiers and the explicitly retained legacy `/scenario/` contract.
Verify one complete package against the visible result after changing
the copy. The README and report are already substantial improvements;
they should remain part of the download.

### R9 — P2: stop labelling surface offset as fault slip

**Evidence: live and source.** Offset-mode results show wording such as
“Fault slip: 0–1.3 m surface offset.” The compact and full summaries
hard-code the first label even though they already know the input mode.
The movement heading also assumes fault-slip input. The Word report
already switches the label correctly.

Use “Fault slip at depth” in slip mode and “Vertical surface offset” in
offset mode. A mode-neutral heading can be “Specify fault slip or
surface offset.” Preserve the distinction between the entered offset
and the estimated slip windows shown below it.

Sources: [app.ts](../subprojects/webapp/src/explore/app.ts) at lines 594,
646, and 651; [report.ts](../subprojects/webapp/src/explore/report.ts)
around line 218.

### R10 — P2: bring the Tableau text into the wording review

Changing Markdown does not change text inside a published workbook.
The following need workbook edits, publication, and verification of
the resulting embeds:

| Surface | Finding | Recommended direction |
|---|---|---|
| Response curves | Live axes say `Driver Value` and `Response Value`. | Use the selected measurement name and unit. |
| Response curves | “Individual simulated trials” describes stage points. | Say “simulation stages.” |
| Response curves | “Net displacement,” “as the earthquake grows,” and “more severe rupture.” | Use “additional uplift,” “as fault slip accumulates,” and the particular measured response. |
| Model vs reality | Caption describes thousands of earthquakes and says the model can be trusted to estimate how severely a site deforms. | Describe saved measurements from simulations; say the comparison examines ranges, not general predictive validity. |
| Distributions | “All stages pooled” remains in the caption after selecting “Final state per trial.” | Make the caption reflect the active population. This was reproduced live. |
| Several dashboards | `Needle`, `PointColor`, `Layer`, `Avg. Measure Value`, abbreviations, and inconsistent `Hue By`/`Color By` labels. | Name the reader's action or physical quantity; keep worksheet terminology internal. |

Sources: the committed workbooks under
[dashboards/tableau](../dashboards/tableau/), particularly
`dem-response-curve-public.twb` around lines 455 and 1261,
`dem-model-vs-reality-public.twb` around line 839, and
`dem-distributions-public.twb` around lines 1736 and 1813.

The committed Response curves workbook already has static, unit-bearing
axis overrides at lines 1140–1141. Diagnose the difference between that
source and the live generic labels as a publication or rendering issue;
do not assume those source titles are absent. Labels that follow the
selected measurement and unit remain the preferred result.

The Response curves workbook also contains stray `Æ` characters in
captions. Its site guide says each response curve's slope is near
sin(dip), although that relationship concerns fault slip and vertical
displacement, not every selectable response. Replace the link wording
with “How fault slip relates to vertical displacement.”

The Slip regression guide overstates transfer to real sites with
phrases such as “must have produced,” “any rupture site,” and “any
site's geometry.” Prefer “the fitted relation estimates” and state the
measurement and model assumptions. This is more precise without
diminishing the group's intended forecast use.

Finally, the Kern sample describes an approximately 75° fault and uses
60°/70° model choices, while the regression page presents a measured
30° dip as the appropriate setting. These may describe different fault
segments or depths. Ask the group to reconcile the contexts; do not
choose one number by editorial preference.

Sources: [Response curves](../subprojects/mkdocs/docs/dashboards/response-curves.md)
at lines 24 and 155;
[Slip regression](../subprojects/mkdocs/docs/dashboards/slip-regression.md)
at lines 51–110 and 149;
[stories.ts](../subprojects/webapp/src/explore/stories.ts) around line 66.

## UX and visual design

### R11 — P2: put the result or primary action earlier on the page

These are design proposals informed by live inspection, not failures
of the calculation.

**Explorer introduction:** at 1280 × 720, the initial action falls below
the first viewport. Page title, app identity, introductory copy, and
the three explanatory blocks consume substantial height. Reduce
duplicated heading space and place the primary action before the
longer explanation. Keep the forecast qualification near that action.

**Explorer results:** the scenario summary, refinement callout,
warnings, and measurement cards occupy a long stretch before the chart.
On a phone, three full cards and the expanded summary make this more
pronounced. Keep the explanatory choice cards, but reduce their mobile
padding and use a short scenario summary with details available on
request. A compact step indicator can replace repeated large headings.
Keep the relevant scientific caution next to its measurement.

**Dashboards:** on the tested desktop viewport, the first chart began
roughly 1,200–1,600 px down on four pages and 3,165 px down on
Distributions. On a phone, Distributions began around 5,295 px down.
Readers encounter a methods essay before the object it explains.

Use a consistent order: the question, a short reading guide and
essential limitation, the interactive chart, then detailed controls,
methods, and interpretation. Preserve the useful technical content in
sections or disclosures below the visualization.

### R12 — P2: introduce the Explorer on the home page

The home-page body and site description still frame the project mainly
as a dashboard companion. The navigation contains the Explorer, but
the principal introduction and cards do not explain that route.

This is already an owner-approved task, G-32; it is not a new scope
request. A clear first sentence and link should be completed. A later
design option is to offer two explicit actions: “Build a scenario” and
“Explore the research dataset.” Preserve the decided navigation order.

Suggested introduction:

> Explore simulated ground rupture and compare it with measurements
> from past earthquakes. Build a scenario in the Ground Rupture
> Explorer, or use the dashboards to examine the wider research dataset.

Sources: [index.md](../subprojects/mkdocs/docs/index.md),
[mkdocs.yml](../subprojects/mkdocs/mkdocs.yml), and PDD D-54. The data
guide's description of the pipeline should also mention Explorer data
exports, not only dashboard tables.

### R13 — P2: explain the sediment choices at the point of selection

The group has supplied enough information for much better explanations;
some already appears in the Response curves guide. It is hard to find
while constructing a scenario.

Uniform Weak/Moderate/Strong describe model bond-strength groups.
Layered Weak/Moderate/Strong are gradients with strength increasing
downward, in 1 m layers. The repeated short labels conceal that
difference. Proposed display names are “Weak gradient,” “Moderate
gradient,” and “Strong gradient,” with the existing data identifiers
unchanged.

Use one-line descriptions for random layer strengths, alternating
strong and weak layers, and the strong top layer. Small cross-section
drawings would explain these arrangements better than more paragraphs.
Include the Dense/10 m restrictions from R2. Explain that these are
model settings, not universal natural-soil classifications.

The existing description of strength as resistance to being pulled
apart also needs reconciliation with the group's distinction between
cohesion and tensile strength. Prefer a brief model-bond explanation
and leave the detailed parameters in the glossary.

Sources: [app.ts](../subprojects/webapp/src/explore/app.ts), choices and
help around lines 485–579;
[explore/glossary.ts](../subprojects/webapp/src/explore/glossary.ts);
[Response curves](../subprojects/mkdocs/docs/dashboards/response-curves.md)
at lines 46–103.

### R14 — P2: define histogram controls as a small product feature

The research group's request for less blocky distributions is valid
product feedback, not proof that the current bin calculation is wrong.
Offer an Automatic default and a simple way to request coarser or
finer bins, or a clearly labelled bin width. Decide the interaction,
limits, and restoration/export behavior in the PDD before
implementation.

Keep underlying statistics and percentile read-offs independent of
display bins. Explain that changing binning changes how values are
grouped visually, not which measurements are used. Avoid immediately
adding several specialist histogram parameters to the main result view.

### R15 — P2/P3: make visual language and chart legends consistent

The site uses different typography across Markdown pages, the guided
app, and Tableau captions; some workbook explanatory text is 7-point
monospaced type. Use readable body typography for explanations and
reserve monospace for identifiers and formulas. Check font size after
embedding and scaling, not only inside Tableau's authoring view.

Use one accent treatment for selected controls and primary actions.
Keep the current visible refinement action and explanatory measurement
cards. Give chart legends enough contrast and avoid implying that all
six scarp classes contributed when some have zero records. Options are
to show contributing classes only, or retain selected classes with
explicit counts. Decide how the legend relates to the scarp filter.

Sources: [app.ts](../subprojects/webapp/src/explore/app.ts) around line
775; [chart-export.ts](../subprojects/webapp/src/explore/chart-export.ts)
around line 155; committed Tableau workbook captions.

## Accessibility and recovery

### R16 — P2: retain useful validation, fix semantic structure

Keep Continue and Review usable before all fields are filled. The
tested behavior provides a focused error summary and links to the
missing groups; a disabled button would remove that route to help.
Retain the visible required-state cues, clear error descriptions, and
focus behavior. This is a product recommendation consistent with the
observed implementation, not a claim that accessibility rules mandate
enabled buttons in every form.

The Explorer currently inserts a `<main>` inside MkDocs' existing
`<main>`. Use a labelled section or equivalent container for the inner
app. The generated Word report's section headings are bold paragraphs
rather than semantic Word headings; apply heading styles so navigation
and assistive technology can find them. Chart alternative text is
already present.

Sources: [app.ts](../subprojects/webapp/src/explore/app.ts) around line
801; [report.ts](../subprojects/webapp/src/explore/report.ts) at lines
122–127. The app-scoped, tag-filtered axe test does not substitute for
whole-page landmark and assistive-technology checks.

References: W3C's
[main-landmark guidance](https://www.w3.org/WAI/ARIA/apg/patterns/landmarks/examples/main.html)
and [form validation tutorial](https://www.w3.org/WAI/tutorials/forms/validation/).

### R17 — P2: make download progress and partial success visible

The archive builder deliberately delivers data without `report.docx`
if Word generation fails. That is useful recovery, but the explanatory
status is sent to a visually hidden live region. A sighted reader can
receive an incomplete archive without a visible explanation. During
generation, repeated clicks are guarded internally without a prominent
visible progress state.

Show “Preparing download…” and a visible partial-success message:

> Your data files are ready. The Word report could not be created.
> Download again to retry.

Sources: [report.ts](../subprojects/webapp/src/explore/report.ts) around
line 404; [app.ts](../subprojects/webapp/src/explore/app.ts) around lines
196 and 1126–1140. This is a source-path finding; the tested live
download successfully included its report.

The chart action initiates two downloads, a PNG and provenance text.
The app warns about browser multiple-download permission, but a reader
needs a way to recover the provenance file separately if it is blocked.
Consider one ZIP or an explicit secondary download action. The PNG
already contains citation/licence information. Blocking of the second
download was not reproduced in this review.

## Suggested wording and editorial clean-up

These are proposals for review, not silently adopted scientific text.

| Current wording or pattern | Suggested direction |
|---|---|
| Download data (ZIP) | Download results (ZIP), since the archive includes the report, settings, and sources. |
| Distribution / Cumulative | Distribution (counts) / Cumulative (%), with a short explanation available. |
| Move a thumb | Drag a range handle. |
| Provenance, as a report heading | Sources and versions. Keep `provenance.txt` as the filename. |
| Smaller fault angle means a shallower fault | A smaller angle means a more gently inclined fault. “Shallow” can also mean nearer the surface. |
| Distance the fault moves underground | Movement of one side relative to the other along the fault plane. |
| Pressure ridge: a pressure ridge | Explain the pop-up structure and additional height above the undeformed hanging-wall surface, using the group's definitions. |
| Curve grows with slip | Curve changes as slip accumulates, unless monotonic growth is established for that quantity. |
| Glossary assumes you know nothing | Definitions of the geological and statistical terms used on this site. |

Further P3 corrections:

- The paper page says six illustrations are shown; the site currently
  reproduces four, Figures 3, 4, 5, and 7.
- Several pages invite readers to see shapes in Figure 2, which is
  described but withheld. Say that its description is available, or
  provide an approved alternative illustration.
- The abbreviation include omits additional uplift from SDC even though
  the full glossary now includes it.
- The data guide's SURE citation should clearly identify the particular
  release, alongside the descriptor citation already used elsewhere.
- Make repository build-note references usable links rather than code
  labels that readers cannot follow.
- Remove the duplicate Model vs reality link in the results paragraph.
- Distinguish dashboard “Final state per trial” from Explorer “Last
  stage within the slip range.” They are different selections.
- Update stale “Proposed” labels around the now-decided D-3 while
  resolving the formula distinction in R5; do not reopen the approved
  per-angle selection rule.

Relevant sources: [paper.md](../subprojects/mkdocs/docs/paper.md),
[figures.md](../subprojects/mkdocs/docs/figures.md),
[abbreviations.md](../subprojects/mkdocs/docs/includes/abbreviations.md),
[data.md](../subprojects/mkdocs/docs/data.md), and
[glossary.md](../subprojects/mkdocs/docs/glossary.md).

## Research-group request reconciliation

| Request | Review status |
|---|---|
| Forecast framing, geological site conditions, fault-slip terminology, dip-slip and 0.3 m/s explanation | Adopted and substantially implemented. Clarify scope and percentage meaning as in R4. |
| Fault-angle and depth ranges; unknown-value guidance | Implemented. D-51 explicitly supersedes the earlier owner preference against unknown-value guidance. Do not ask that question again. |
| Updated quantity definitions and unhyphenated Deformation zone width | Mostly implemented in guided text and glossary; exports and Tableau still need reconciliation. |
| Retain low-slip values with the 0.5 m warning | Implemented on the page and Word report. Plain provenance remains stale. |
| Corrected scarp dip | Group says ready. Confirm the imported release/column; change the explanation of the remaining uncertainty. |
| Negative-height explanation | Implemented, but the assembled wording overgeneralizes the supplied −0.02 m example. |
| Explain sediment strengths and arrangements | Scientific detail supplied; point-of-selection explanations and coverage restrictions remain insufficient. |
| More histogram bins or user control | A proposed product improvement requiring defined behavior, not an unnoticed existing control. |
| Additional uplift as fourth result | Scientifically supported; explicitly outside v0.4, with a later P2 view and its own data release under D-20. Not a missing MVP feature. |
| Animations and measurement demonstration | Source folders supplied. Plan selection, captions, credits, hosting, and placement before publication. The private collection was not downloaded or audited here. |
| Kern worked example | Explicitly deferred by D-49; do not revive it as a release blocker. Sample-story scientific checks remain relevant. |
| Per-angle offset conversion | Implemented and approved as a selection rule. Exact fitted-versus-geometric formula needs the narrower clarification in R5. |
| Explorer field overlays | Explicitly deferred by D-53 pending the group's answer. This does not resolve misleading comparisons already public in dashboards. |

## Verification and limits

Completed during this review:

- Read the supplied research feedback, current decisions, application
  source, export code, relevant pipeline views, dashboard guides, and
  committed Tableau text. Three independent review passes covered
  scientific alignment, copy/content, and implementation.
- Exercised the live guided journey: missing-field validation, site
  choices, range input, offset conversion, scenario review, results,
  measurement switching, cumulative view, percentile controls,
  refinements, and returning to edit the scenario.
- Confirmed that deselecting every scarp type leaves the draft invalid
  and requests a selection rather than silently restoring all types.
- Reproduced partial profile coverage, offset mislabelling, and the
  stale Distributions population caption on the public site.
- Inspected desktop and 390 × 844 layouts. The Explorer did not create
  horizontal page overflow at that phone width. Tableau cropping did.
- Opened the five dashboard pages and loaded their main visualizations;
  inspected the home page and citation dialog.
- Downloaded a real six-member ZIP. Its 10,488 records and 252 distinct
  trials agreed with the selected scenario. Scarp-height statistics
  used 9,710 values and excluded 778 missing values; the displayed
  median, percentiles, extrema, mean, and standard deviation agreed
  with the export. Scarp dip had its own valid/missing counts.
- Ran 501 Node tests across 97 suites: all passed. The pure-module
  TypeScript check and all three MkDocs licence-notice tests passed.

Limits:

- Full browser-test typechecking was blocked by the local installed
  Playwright version, 1.47.2, differing from the declared 1.64.1. The
  error concerns newer locator typing. This is an environment mismatch,
  not a demonstrated product defect.
- The Python/data test suite was not run: the local environment lacks
  the required pytest, PyArrow, and DuckDB installation. No dependencies
  were installed for this review.
- Current GitHub Actions status could not be independently retrieved.
  Historical green runs do not establish that this HEAD passes CI.
- This was not a full Safari/Firefox, VoiceOver, or real-phone pass;
  those recorded acceptance checks remain necessary. No accessibility
  conformance claim follows from the automated tests.
- Not every dashboard filter combination, error path, or data result
  was exercised. The successful ZIP was checked for content, not given
  a rendered Word-page visual audit. This is not a security audit or a
  scientific validation of every calculation.

## Recommended order of work

1. Correct R1's scientific presentation, disclose R2's model coverage,
   and fix R3's embedding defect. These have the largest immediate
   effect on what a reader can understand or use.
2. Resolve the exact conversion and data-column questions in R5/R6.
   Send the assembled warnings and larger negative-height examples to
   the group together, avoiding already-settled questions.
3. Apply one coordinated wording pass across page text, glossary,
   downloads, and Tableau. Verify a representative scenario in every
   output rather than checking only source strings.
4. Complete the home-page introduction, improve chart placement and
   mobile density, fix semantic headings/landmarks, and expose download
   recovery visibly.
5. Define histogram controls, profile illustrations, additional uplift,
   and educational animations through the established document sequence:
   PRD, PDD, ADRs where needed, HLD, DDD, and then an unambiguous IP.

Preserve the successful guided journey. The next iteration should make
its scientific boundaries and available data easier to understand,
while bringing the surrounding dashboards up to the same standard.

## Follow-up: safe corrections prepared for owner review

The owner subsequently authorized safe, unambiguous changes on a
separate branch, to review before committing. Branch:
`codex/site-review-safe-fixes`. The changes are uncommitted and
unstaged. This section records work after the review baseline above.

Implemented:

- R3: size the Tableau host and iframe consistently before scaling;
  remove each loading message when that visualization becomes ready.
- R6: describe scarp dip as awaiting verification of the release's
  corrected data, preserving provisional status. Apply the guided
  wording to the page, report, provenance, and chart export; update
  the public dashboard explanation of the unresolved column check.
- R8: propagate guided wording into downloaded statistics labels and
  provenance. Records, scenario settings, identifiers, numbers, and
  missing values remain unchanged. The shared `/scenario/` package
  builder and baseline copy remain unchanged.
- R9: use mode-specific result labels and a mode-neutral input heading;
  clarify that fault slip is relative movement along the fault plane.
- R16, page portion: replace the nested main landmark with a section
  labelled by the current step heading. Word heading styles are deferred.
- R17, archive portion: show download preparation, success, and missing
  Word-report status visibly beside the download. Preserve existing
  cancellation and fallback behavior. Chart-sidecar recovery is deferred.
- Editorial corrections: describe the four available figures and the
  withheld Figure 2 accurately; include additional uplift in SDC's
  abbreviation; qualify the slip/vertical-displacement relationship;
  simplify the glossary introduction and fault-angle wording; say
  "range handle" instead of "thumb"; remove a duplicated results link.

The PDD and guided DDD reflect these corrections. Accepted IP task
bodies were not changed. R1's scientific comparison, R2's coverage
behavior, numerical conversion, warning interpretations, histogram
controls, workbook edits, and broader layout proposals remain open.
No data, calculation, licence, dependency declaration, or lockfile
was changed, and nothing was published.

Verification of the correction pass:

- Restored installed JavaScript packages from the existing lockfile
  using the local cache; the earlier Playwright version mismatch is
  resolved without changing dependency declarations.
- All 505 Node tests passed under the pinned Node 22.12.0 runtime,
  including new Tableau fitting and guided-archive regression checks.
- Both TypeScript configurations passed. Strict preview and publication
  site builds passed. The three existing licence-notice tests passed.
- Browser inspection of the fresh local preview confirmed that the
  Distributions iframe and host fill the available 356 px at 390 px
  viewport width and 996 px at 1280 px width. The loading message was
  removed, and the full mobile chart and controls were visible. This
  does not claim that scaled desktop controls are ideal for a phone.
- The local Explorer has one main landmark, uses the correct offset
  label, and shows a visible preparing/ready download status. Its real
  six-file ZIP held the displayed 2,880 matching stages, unhyphenated
  width label, and the same low-slip and scarp-dip notices in provenance
  and Word.
- Browser regression expectations were updated; the full automated
  browser suite, other browser engines, all seven live Tableau embeds,
  Word visual layout, and assistive technology were not rechecked in
  this pass. Fallback archive content was tested with a failing injected
  rasterizer; the visible fallback message was not induced manually.
