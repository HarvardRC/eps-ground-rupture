# Guided explorer: detailed design

**Status: implementation candidate, 2026-11-04.** The owner approved
the reviewed journey and authorized an autonomous implementation at a
different path from `/scenario/`. This additive design governs
`/explore/` only. The [existing DDD](ddd.md) remains the numerical and
legacy-page contract. This document does not change accepted IP tasks.

Product authority is the [PDD](pdd.md), D-26 onward, and the
[prototype record](scenario-journey-prototype.md). The bounded candidate
choices recorded there are implementation choices made under the
owner's delegation, not earlier owner approvals. Architecture follows
[ADR-0020](../adr/0020-parallel-guided-explorer.md).

## 1. Scope and file boundaries

The new page completes Understand → Site → Movement → Review → Results
with real pinned simulation data, confirmed-result downloads, the
approved refinement controls, and contextual supporting links.

No new framework or runtime dependency. Use these files:

| File under `subprojects/webapp/` | Responsibility |
| --- | --- |
| `src/explore/state.ts` | Pure draft defaults, validation, canonicalization, change detection, exact decimal increments, coverage shortcut. |
| `src/explore/compute.ts` | Orchestrate existing scientific functions into `RenderInput`; no new algorithms. |
| `src/explore/glossary.ts` | Typed short explanations and their existing glossary source anchors. |
| `src/explore/app.ts` | DOM wizard, controlled draft, review, confirmed results, supporting help, download. |
| `src/explore/main.ts` | Independent capability checks, data loading, lifecycle, failures and mounting. |
| `src/explore/explore.css` | Rules scoped to `#gre-explore`; prototype visual direction. |
| `test/explore-state.test.ts` | State, boundary and precision tests. |
| `test/explore-compute.test.ts` | Fixture parity and confirmed-input computation. |

`build.mjs` additionally emits `explore.js` and `explore.css`.
`subprojects/mkdocs/docs/explore.md` includes a generated
`includes/explore-head.html`. Assets live in `assets/explore/`;
data URLs point to the already staged `assets/scenario/data/`.
No existing scenario bundle or page is replaced.

## 2. State and pure module interface

Export the following from `explore/state.ts`:

```ts
type Step = 'intro' | 'site' | 'movement' | 'review' | 'results';
interface Draft {
  faultDip: number[];
  depth: number[];
  density: string[];
  sediment: SedimentPair[];
  mode: 'slip' | 'offset';
  slipMin: string;
  slipMax: string;
  offsetMax: string;
  population: Population;
  scarpClass: string[];
}
interface Issue {
  step: 'site' | 'movement' | 'results';
  field: string;
  message: string;
}
interface Judgment {
  issues: Issue[];
  scenario: Scenario | null;
}
freshDraft(manifest: Manifest): Draft;
cloneDraft(draft: Draft): Draft;
draftChanged(draft: Draft, confirmed: Draft | null): boolean;
validateDraft(draft: Draft, manifest: Manifest): Judgment;
stepDecimal(raw: string, direction: -1 | 1): string;
offsetShortcut(dips: readonly number[], regression: Regression,
               slipMax: number): string | null;
```

`Scenario`, `Population` and `SedimentPair` are existing state types;
`Manifest` and `Regression` come from `decode/fields.ts`. Mutable arrays
belong only to Draft. Clone before saving a confirmation or restoring
it. Canonicalize set order for comparisons; array order alone is not a
change. Raw movement text, including inactive entries, counts as a
change. A null confirmation has no retained result and no pending
banner.

Fresh defaults: all four site sets empty; mode slip; minimum `'0'`;
both maxima `''`; population `all_stages`; every manifest scarp class.
Never silently turn an empty selected set into all values.

Validation order is faultDip, depth, density, sediment, active movement
fields, scarpClass. Require at least one valid dictionary member in each
set. Reject unknown values. In Scenario, sort numeric sets ascending,
sediment pairs by code point (set, then strength), and use dictionary
order for density and scarp classes, following the existing state
contract.
Use existing `readDecimal`, `compareDecimals`, `judgeSlipWindow`, and
`judgeOffset`, with explicit nonblank checks before the old slip judge.
Both raw and normalized values must fit the existing 16-character rule.
Slip minimum and maximum are required, nonnegative, ordered, and no
greater than the manifest maximum. Offset maximum is required and
0–1000 inclusive. Ignore invalid inactive-mode strings for validation.
Do not clamp or silently substitute an input. Return `scenario: null`
whenever any issue exists.

Issue field names are `faultDip`, `depth`, `density`, `sediment`,
`slipMin`, `slipMax`, `offsetMax`, `scarpClass`, and `population`.
The latter guards an invalid population identifier. Scarp issues return
to Results with refinements open when a confirmed result exists.

`stepDecimal` adjusts a valid decimal by exactly 0.1 using decimal
digits, not floating point. Clamp decrements at zero. Blank increments
start at 0.1; blank decrements set 0. Invalid nonblank text remains
unchanged.
Do not cap increments at the modeled maximum: validation must explain
the boundary. If the result cannot fit the decimal grammar, preserve
the input rather than round it.

`offsetShortcut` calculates each selected angle's
`slope * slipMax + intercept`, takes the smallest nonnegative cap, and
rounds down to 0.01 m. Return null for missing/nonpositive coefficients,
a negative cap, or no dips. Format as a canonical decimal and reject
it if `judgeOffset` rejects it or `convertWindows` yields any upper
endpoint above the modeled slip maximum. It sets the upper coverage
limit, not a plausibility limit. A fit whose intercept makes the
converted lower endpoint negative still needs the ordinary lower-end
coverage warning. Slip shortcut sets only the maximum to exactly `'5'`.

## 3. Transitions and validation display

App-local step navigation does not push browser history. Browser Back
and Forward navigate site pages normally. A reload or remount starts
a fresh draft; state is not stored in a URL, localStorage or session.
Show this limit on the introduction and before leaving the page via
supporting links. Supporting links open a separate tab with `noopener`.

Introduce the purpose and approved research-tool wording, then Start
opens Site. Site requires all four selections before Movement. Back
preserves every entry. Continue from Movement and every Review action
validate the entire draft; route to the first invalid step and focus its
first control. Reached steps can be revisited. Results is unavailable
until the first successful confirmation.

Review renders the complete draft: site sets, entered movement mode
and values, per-angle conversion and coverage, population, scarp types.
Do not compute counts as a preview. Show results validates again,
computes a new `RenderInput`, then atomically commits the draft snapshot
and result. Failures retain the previous confirmation and show an error.

Returning to Results never applies a draft. While changed, show the
approved pending banner with Return to review and Discard changes.
Discard restores both modes and all refinements from the confirmation.
Start a new scenario clears result and confirmation and opens fresh
Site.
It is available as a secondary action after entry has begun.

Each site group has Select all with checked/mixed/unchecked states and
individually highlighted native checkbox labels. Before validation,
empty groups say Required and Choose one or more values to continue.
After attempted progression use a specific error beside each invalid
group, with `aria-invalid`, `aria-describedby`, and a live summary.

Movement uses text inputs with `inputmode="decimal"` and labeled
minus/plus buttons; avoid native number-input exponent acceptance.
Typing preserves raw strings. Warn immediately in red for numeric slip
above 5 m, explaining the actual manifest maximum. Values between 5 and
the actual maximum remain valid. Offset feedback uses selected angles
and `convertWindows`/`rangeFlag`. Partial or wholly uncovered converted
ranges are warnings, not invented hard bounds; results explain coverage.

## 4. Shared scientific pipeline

Export `computeResult(vintage, scenario, sequence, regression)` from
`explore/compute.ts`, returning `RenderInput` with `field: null`.
Use precisely the orchestration in legacy `main.ts` `compute`: in offset
mode convert all manifest dips, derive selected-angle flags, then query;
use `validValues`, `summarize`, and `histogram` for each measurement and
`histogramLog` for width. Missing offset regression throws. Pure tests
compare all derived values with the existing functions and fixtures.

Use the existing query's last-stage-before-class-filter rule. Never
select an earlier stage because the last stage has an excluded type or
missing measurement. All six scarp types means no filter, retaining
unclassified records. Keep per-measurement excluded-null counts.

## 5. Results and refinements

Use readable text sizes throughout the guided page, including forms
and help. In the site's default 20 px root context, body text is
18 px; controls, explanations and statistics are at least 16 px;
compact captions and metadata are at least 14 px. Define these sizes
in `rem` so browser font preferences apply. Preserve the large heading
hierarchy. Narrow layouts wrap controls instead of reducing font sizes.
Keep any chart-label enlargement scoped to the guided page.
The cumulative chart's vertical title is `Measurements at or below (%)`
to fit at the larger size; retain its complete explanatory caption.
Move rotated axis titles two pixels right within the guided SVG to
avoid clipping their larger glyphs. Shared chart builders stay intact.

Use the approved warm neutral/crimson presentation. Always show the
confirmed site, movement, population, scarp selection, count, and
applicable notices. Render `selectNotices` output for empty, zero-valid,
small, low-slip, partial coverage, provisional dip, and width warnings.
Do not replace source notices with less precise warnings.

One guided-page correction is needed for lower-end-only coverage:
the legacy per-dip notice assumes that every partial range exceeds
the upper bound. Suppress that specific notice when the converted
upper stored bound does not exceed the manifest maximum. The visible
per-angle coverage explanation must instead identify the uncovered
lower end. Preserve all other applicable notices and do not change
the shared selector or the existing page's bundle in this candidate.

Height is the initial measurement. Height, width and dip controls and
Distribution/Cumulative controls change presentation immediately and
do not dirty the draft. Keep the full nine-row `statsRows` table beside
the chart at wide widths and below it at narrow widths. Append units
only to non-null measurement statistics, never counts. Preserve the
unclassified-record line and interpretation disclaimer.

Use `histogramSpec`/`histogramSvg`, `ecdfSpec`/`ecdfSvg` and
`toSvgElement`, plus accessible captions and chart-data tables. Read-off
uses `quantileLinear` on the complete sorted array. Keep the existing
less-than-0.2-percentage-point display-simplification explanation.
Respect chart suppression below 10 valid values and caution below 30.
Redraw on ResizeObserver using the actual container width; disconnect
on unmount. The first candidate need not expose optional family/log
views or field overlays; retain access to the existing explorer.

Refine results opens a two-column population/scarp editor, stacked at
narrow widths. It edits the same draft. A scarp-empty draft is allowed
but blocks review; put the error above its choices and focus Select all.
Select all is checked for all six, mixed for a subset and unchecked for
none. Use canonical order/colors and reviewed schematic shapes.

Copy and three-stage example follow the saved refinement prototype.
The example changes with the draft population only, explicitly keeps
all scarp types included, and uses invented values. Its 0–3 m slip
example has heights 0.2, 0.7, 1.1 m at slips 0.5, 1.5, 2.5 m. All stages
has median 0.7 m; last stage has median 1.1 m. Do not use those values
in production queries. Confirmed explanatory text follows the confirmed
population, not the pending choice.

### 5.1 Prominent refinement entry

PDD D-36 governs the clearer controls and optional results walkthrough.
In normal results, replace the small refinement button with one
full-width disclosure below the confirmed scenario and pending banner.
Its fixed title is `Refine results`, its subtitle is
`Simulation stages · Scarp types`, and its trailing label is
`Show options` or `Hide options`, with a decorative chevron.
Keep `gx-refine-button`, `aria-expanded`, and `aria-controls` pointing
to `gx-refinements`. Follow it with the visible reminder
`Review changes before applying them.` Opening it edits nothing.

The owner selected Choice cards. Above the measurement section, show
`What would you like to examine?` followed by three native buttons
in the existing measurement order. Each card contains the full
measurement name and its corresponding question from §5.2. Retain
the existing measurement button IDs, `data-measurement` handlers,
and `aria-pressed` state. Mark the current card with a strong crimson
border, a pale selected background, and visible `Viewing` text with
a check mark; do not rely on color alone. Use three equal-width
columns above 600 px and stacked cards at 600 px or below. Use 14 px
card padding and 8 px internal gaps to keep the selector shallow.
Names and
questions remain at least 16 px in the default site context.
Render cards in empty results too, outside the no-match content
branch, so the same selection and exit-focus targets exist.
Place the optional walkthrough entry alongside the selector heading
when space permits; wrap it without reducing the text size.

### 5.2 Optional results walkthrough

Keep `guideIndex: 0 | 1 | 2 | 3 | 4 | null` local to `app.ts`.
Null means normal browsing. It is presentation state, never part of
Draft, Scenario, download metadata, or calculation inputs. The ordered
stops are `scarp_height`, `dzw`, `scarp_dip`, `stages`, and `types`.
Expose `Walk me through results` in normal results, including empty
results. Starting sets index zero and measurement `scarp_height`,
closes normal refinements, and preserves draft and chart preferences.

While active, hide the normal measurement selector and refinement
disclosure. In their place show one guide header with the current
label, `Step N of 5`, an ordered five-label progress indicator, and
`Browse freely`. Use `aria-current="step"` on the current progress
item; progress labels are not additional navigation controls.
Use compact progress labels `Height`, `Width`, `Dip`, `Stages`, and
`Types`; keep the full current name in the heading and Next action.
Let progress labels wrap into rows without forcing one label per row.
Use these measurement prompts, in order:

- `How high is the scarp?`
- `How wide is the disturbed ground?`
- `How steep is the scarp face?`

Stops zero through two set `display.measurement` to their measurement
and render its existing live measurement section, controls, statistics,
notices, interpretation, and glossary help. An empty result instead
shows the selected measurement heading, description, and existing
no-match explanation; do not invent chart or statistic values. Keep
the width-scope and provisional-dip notices in empty views too. Keep
zero-valid and small-result suppression exactly as in §5.

Stops three and four render only the existing population or scarp
editor respectively, instead of the measurement section. Extract
shared fieldset renderers so their input IDs, values, events, errors,
and explanations are identical in both modes. Render each input once.
Preserve `exampleOpen` and the three-stage example. Keep the reminder
that these are draft choices and results wait for Show results.
Do not change the retained measurement at either editor stop.

Keep the confirmed context, pending banner, global caveats, download,
and supporting links available at every stop. Place one Back/Next
row in the guide header so navigation is reachable without scrolling
past a chart. Back is disabled at zero. Next names the next stop;
at index four it becomes `Review changes` when `dirty()` is true,
otherwise `Finish walkthrough`. No guide movement invokes computation
or validation. Review changes invokes the existing full-draft review;
it must never call confirmation directly.

On guide start, Back, or Next, render and focus a `tabindex="-1"`
guide heading and scroll it into view. Existing chart/editor controls
retain ordinary keyboard focus across edits. Browse freely and Finish
set the index to null without changing draft or display. If leaving
an editor stop, set `refineOpen = true` and focus its selected stage
radio or scarp Select all; otherwise focus the selected measurement
button. Scroll that target into view. No focus trap or overlay.
Give programmatic scroll targets an 80 px top scroll margin so the
site's fixed header does not cover the focused heading or control.

All review actions end the guide before validation, including when
validation fails. Render normal results immediately when ending an
active guide for review, before awaiting offset-conversion data.
Guide start, Back, Next, and exit increment `navigationVersion` so
they cancel an older asynchronous review request. `showIssues` must
also clear the guide before its
direct step assignment, so the existing normal refinement error and
focus path remain valid. Navigation to a different main journey step
ends the guide; returning to Results does not resume it. Successful
confirmation clears it. Discard restores the confirmed draft, clears
the guide, and preserves display; keep normal refinements open if it
was invoked from either editor stop. New scenario and remount start
with the guide off and the existing default display state.

## 6. Downloads and supporting content

Download results builds the real existing ZIP with `buildPackage` from
the confirmed `RenderInput` and mount version stamps, even during draft
edits. No result means no download. Use a temporary object URL and an
anchor download; remove the anchor and revoke the URL after delivery.
Failure shows a retryable message and keeps the result intact.

Link relevant terms to existing glossary anchors: fault dip, sediment
strength/cohesion, slip, vertical separation, scarp classes, height,
width, dip and statistics. Use plain descriptions from the glossary,
not newly invented scientific definitions. Pair help with a normal
glossary link and a native details disclosure. The disclosure works by
click, touch and keyboard. Also mark relevant terms as dotted-underlined
explanation buttons. Cover the four site-condition headings, slip,
surface offset, simulation stages, scarp types, the three measurement
headings, median, and percentiles. Use short definitions derived from
the existing glossary, kept in a typed dictionary with source anchors.

Use one text-only floating `role="tooltip"` per mounted explorer.
Connect its current trigger with `aria-describedby`; do not place
interactive controls inside the tooltip. Existing disclosures retain
the full glossary links. Pointer hover and keyboard focus show it;
click/tap pins it until another activation, outside click, Escape,
or a screen change. Moving onto the tooltip keeps it visible. Allow
a short pointer-leave delay to cross the gap; cancel timers on disposal.
Keep it within the visible window, flipping above its trigger when
needed. On scroll or resize, close it rather than leave it detached
from the term. For keyboard focus, wait two quiet animation frames
after automatic focus scrolling before showing it. Cancel a pending
opening on dismissal, blur, navigation, disposal, or user scrolling;
it must not reopen after Escape. Opening help does not change drafts
or confirmed results.
Keep longer help and essential instructions/warnings visible as before.

Movement links to Slip regression. Results link to Distributions and
Model vs reality, explaining these show broader datasets rather than
the current scenario. Keep paper, data/citation, glossary and existing
explorer links available. Do not embed Tableau in the guided page.

## 7. Entry, loading and failures

Mount `#gre-explore`. The generated script `#gre-explore-app` carries
`data-manifest`, `data-software-version`, and `data-data-version`.
Resolve `data-manifest` against the script's absolute `src`; the
staged value is `../scenario/data/<manifest-name>`. Resolve the
manifest's regression filename against the manifest URL. Call existing
`loadVintage` with expected data version; preserve mismatch refusal.
Load regression on entry to offset mode or before offset review; failed
loading offers retry and preserves draft. A direct-slip scenario remains
usable when only regression loading fails.

Probe APIs used by the guided page before constructing its application.
An unavailable capability produces an explicit update-browser message
with failed feature names. Keep real Markdown fallback, JavaScript-off
help, and supporting links. Data failures are not empty results.

Use a document-global mount slot isolated from legacy `__gre*` slots.
Subscribe to MkDocs `document$` when available; otherwise initialize
after DOMContentLoaded. Repeated notification on the same root is a
no-op. Dispose listeners, observers and in-flight work on navigation
or replacement. Ignore completion from an old/disconnected root.
On `pageshow` with `persisted=true`, release this bundle's retained
mount and mount afresh. Browser Back/Forward cache restoration must
honor the same fresh-draft behavior as a new page load.

## 8. Verification and completion

Typecheck and build both entries. Run all existing Node tests and new
state/compute tests. Run document links, PDD agreement and traceability
checks. Build the MkDocs preview with both paths and verify asset/data
URLs; preserve legacy staging checks and add checks for explore assets.

Browser-check a real-data scenario through all five steps, invalid
site/movement/scarp selection, inactive-mode preservation, pending vs
confirmed values, discard/restart, both populations, measurement and
chart controls, a downloaded ZIP, glossary/dashboard destinations,
keyboard progression and 320/1024-pixel layouts. Confirm `/scenario/`
still loads. Report actual evidence and any untested requirements in
the [execution record](guided-journey-ip.md); do not infer release
acceptance from a first candidate or from the illustrative prototype.
