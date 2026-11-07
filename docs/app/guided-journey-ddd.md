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
and Forward navigate site pages normally. Same-tab continuity
follows §9.2 (D-38): reload or Back/Forward cache restoration in
the same tab restores the reader's work; a new tab or later visit
starts a fresh draft. State never enters the URL or any persistent
storage beyond the §9.2 session record. Show the continuity limits
on the introduction and before leaving the page via
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
on unmount. The guided page need not expose family views or field
overlays; retain access to the existing explorer. The width
log-scale offer joins in §9.3.

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
mount and mount afresh; §9.2's restore then applies, so Back/Forward
cache restoration behaves like a same-tab reload, not a fresh visit.

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

## 9. Second increment (D-37–D-39, 2026-11-04)

[PDD §2.3's second increment](pdd.md#23-user-journeys) governs this
section; [ADR-0020](../adr/0020-parallel-guided-explorer.md) still
applies. It amends §§3, 5, and 7 only where those sections say so;
everything else above stands. No new runtime dependency.

### 9.1 Sample inputs (D-37)

Add to `explore/state.ts`:

```ts
sampleDraft(manifest: Manifest): Draft;
```

It returns a fresh draft whose `faultDip` holds the members for 30°
and 40°, `depth` the member for 5 m, `density` the member labeled
Dense, and `sediment` the Uniform: Strong and Layered: Strong
pairs, all taken from the manifest dictionaries, with mode
`offset` and `offsetMax` `'3'`. Slip entries, population, and scarp
classes keep fresh defaults. Throw when any member is missing from
the manifest; the sample must not silently shrink to the values
that exist.

The introduction renders **Try sample inputs** as a secondary
action beside **Build your scenario**, with the helper text
`Sample inputs, not recommended site values.` Activation with a
draft equal to `freshDraft` and no confirmed scenario replaces the
draft with `sampleDraft` and opens Site conditions. Otherwise
render an inline confirmation in place of the introduction actions
— `Replace your current choices with the sample inputs?` with
**Use the sample** and **Keep my choices** — never a browser
dialog. Use the sample replaces the whole draft, both movement
modes and refinements included; Keep my choices dismisses and
returns focus to the trigger. The fill never changes the confirmed
scenario, its results, or the walkthrough state; D-30's pending
banner applies as for any draft edit.

On arrival at Site conditions from a sample fill, show one status
line above the conditions — `These are sample inputs, not
recommended site values. Change anything.` — with `role="status"`.
Clear it when the reader leaves the step; it is presentation state,
never part of Draft. The sample's 3 m offset at 30° produces the
ordinary §3 coverage warning on the movement step and review; that
demonstration is deliberate (D-37). State tests cover completeness,
validity against the fixture manifest, canonical ordering, the
fresh slip entries, and the missing-member throw.

The next phase's §10 (D-42) replaces the single action with a
chooser and adds a second sample; this section's values, flow, and
status line are the baseline it amends.

### 9.2 Same-tab continuity (D-38)

Add `src/explore/session.ts`, a pure serialization module plus a
storage wrapper, wired in `app.ts` and `main.ts`:

```ts
interface SessionRecord {
  record: 1;
  dataVersion: string;
  step: Step;
  draft: Draft;
  confirmed: Draft | null;
  display: DisplayChoices;
}
saveSession(storage: Storage, record: SessionRecord): boolean;
loadSession(storage: Storage): SessionRecord | 'absent' | 'invalid';
clearSession(storage: Storage): void;
```

`DisplayChoices` serializes the §5 presentation choices: selected
measurement, per-measurement chart view and read-off, width log
scale (§9.3), chart-data and stage-example disclosures, and whether
refinements are open. The walkthrough index is never stored (PDD
D-38). Results, `RenderInput`, counts, and version stamps beyond
`dataVersion` are never stored. Use `window.sessionStorage`, key
`gre-explore-session`, JSON-encoded; every access sits in
try/catch. An unavailable or throwing storage disables continuity
for the mount: the page runs with the first-version fresh behavior
and the introduction keeps its earlier kept-only-while-open
wording.

Save after every committed state change — draft edits, step moves,
confirmation, discard, display changes — through the single render
path. Start a new scenario clears the record before saving the
fresh state. A failed save disables further saves for the mount and
adjusts the introduction wording the same way; it never interrupts
the reader.

On mount, including §7's `pageshow` remount, when a record exists:

1. `'invalid'` JSON, a wrong `record` version, or a `dataVersion`
   differing from the served stamps: do not restore. Render the
   introduction with a visible explanation — unreadable saved work,
   or `The data release changed since this tab last used it.` — and
   require the explicit **Start a new scenario** action, which
   clears the record, per §7.3's explicit-choice rule. Never apply
   defaults silently over a record that existed.
2. Otherwise validate both stored drafts against the manifest with
   `validateDraft` and the §2 structural rules. A `confirmed` draft
   with issues, or a structurally unreadable `draft`, is case 1.
   An incomplete or invalid working draft and inactive-mode strings
   are valid to restore (D-30).
3. Restore draft, display choices, and step. A non-null `confirmed`
   recomputes through the ordinary confirmation pipeline, including
   the regression load in offset mode, before Results renders real
   values; the busy state is §3's. A regression or data failure
   keeps the restored draft, shows the §7 retry affordance, and
   leaves Results unavailable until retry succeeds.
   `navigationVersion` cancellation applies to a restore in flight
   exactly as to review requests.
4. After a successful restore, show one `role="status"` line near
   the heading — `Restored the work in this tab.` — cleared on the
   next navigation or edit. Never claim a restoration that did not
   happen; the no-record path renders the ordinary introduction.

Copy: the introduction's limitation line becomes `Your work stays
in this tab, including across a reload. Closing the tab or opening
a new one starts a fresh scenario.`; the supporting-links aside and
the static fallback paragraph in
`subprojects/mkdocs/docs/explore.md` say the same. The
storage-unavailable path keeps the previous wording. Add no
`beforeunload` prompt. Node tests cover round-trip, tampered JSON,
a wrong record version, data-version mismatch classification, and
that no result field is serialized; restores in a real page are
§9.5's to verify.

### 9.3 Width log scale

Display state gains `logScale: boolean`, initially false, applying
to the width Distribution view only. When the confirmed
`RenderInput.histogramLog` is non-null and width's Distribution
view is shown, render a labeled native checkbox after the chart
choices — id `gx-dzw-log`, label
`copyText('ddd5.8.logScaleLabel')` — checked from `logScale`. Omit
it entirely otherwise. When it is on, build the chart from
`histogramLog` through the same shared
`histogramSpec`/`histogramSvg` path, append
`copyText('ddd5.11.logAxisClause')` to the caption through the
existing chart-text option, show
`copyText('ddd5.12.logScaleNote')` as the bin-rule hint, and keep
the bin-data table consistent with the displayed bins. When a new
confirmation yields a null `histogramLog` while `logScale` is on,
turn it off and show `copyText('ddd5.10.recoveryLogScaleOff')` once
as a status line. The toggle is immediate presentation under D-34:
it never dirties the draft, joins `DisplayChoices` (§9.2), and
leaves the Cumulative view and the other measurements untouched.
The walkthrough's width stop uses the same live section and
inherits the control.

### 9.4 Unlisted publication (D-39)

One configuration change moves `explore.md` and `assets/explore/`
out of `draft_docs` in `subprojects/mkdocs/mkdocs.yml`, keeping
both `not_in_nav` lines, so the publication build serves the page
unlisted, exactly as T-54 arranges for the existing page. Keep the
front-matter search exclusion. Extend `hooks/site_checks.py` and
its tests so the unlisted invariants hold for `explore/` in the
publication tree — no navigation, sitemap, or search entry, with
arm (f) applying there — and the preview keeps its current
coverage. The deployment itself stays the owner's manual
Companion-site run beside T-54; nothing in this candidate deploys.
`/scenario/` keeps its configuration, and its bundles stay
byte-identical.

### 9.5 Guided browser specs

When the main plan's T-60 lane exists, add guided specs that run in
the same projects, reporters, and strict-preview server. Cover,
with real pinned data and fixture scenarios:

1. The five-step journey to a confirmed result with its matching
   count, and `/scenario/` still mounting.
2. Validation routing and focus for incomplete site, movement, and
   scarp selections, including review attempts from Results.
3. The draft/confirmed boundary: pending banner, Discard changes,
   Start a new scenario, and retained results unchanged during
   edits.
4. Displacement-mode preservation across switches and discard.
5. Sample inputs: silent fresh fill; both ask-before-replace
   outcomes; confirmed results untouched (§9.1).
6. Continuity: reload restores work and says so; an injected
   corrupt or version-mismatched record requires the explicit
   fresh-start choice; a new context starts fresh (§9.2).
7. The offset-review race: delay the regression response, navigate
   away, and assert no stale review applies (`navigationVersion`).
8. The walkthrough's five stops, exits, empty-type review block,
   and focus targets (§5.2).
9. The width log-scale offer, captions, note, and the
   off-adjustment when a confirmation stops offering it (§9.3).
10. A downloaded package delivered from a confirmed result during
    draft edits.
11. 320 px and 1,024 px layouts without horizontal overflow across
    steps, results, refinements, and the guide.

Specs assert the visible text and ARIA states that §§3–5 and
§§9.1–9.3 name; they invent no values. Touch-device and
cross-engine coverage stay outside this lane and remain recorded as
outstanding in the execution record.

## 10. Sample scenarios (D-42, next phase)

[PDD §2.3's sample-scenarios block](pdd.md#23-user-journeys)
governs this section. It amends §9.1 for the next phase; nothing
here joins the second increment. Tasks G-14 and G-15 in
[the plan's next phase](guided-journey-ip.md#next-phase-owner-instruction-2026-11-04)
carry it.

### 10.1 Two samples and the chooser (G-14)

`explore/state.ts` replaces `sampleDraft` with named builders:

```ts
sampleDraft(manifest: Manifest, sample: SampleId): Draft;
```

`SampleId` is `'illustrative' | 'kern'`. The illustrative builder
keeps §9.1's values exactly. The Kern builder returns a fresh
draft whose `faultDip` holds the members for 60° and 70°, with
mode `offset` and `offsetMax` `'1.3'`; its sediment, depth, and
density completion values are agent selections under the PDD §2.3
delegation, chosen from the manifest and named in the evidence.
Both builders throw when any member is missing from the manifest;
a sample must not silently shrink to the values that exist.

The introduction replaces **Try sample inputs** with a chooser:
one secondary action beside **Build your scenario** offering both
samples by name, singular in form, each labeled as sample values,
not recommended site values. The arrangement — two buttons or one
disclosure — and the final strings are agent selections under the
PDD §2.3 delegation. D-37's flow applies to either sample
unchanged: silent fill from a fresh draft with no confirmed
scenario, the inline ask-before-replace otherwise, whole-draft
replacement on **Use the sample**, never a browser dialog, and no
effect on confirmed results. The §9.1 status line now names the
chosen sample. The Kern offset of 1.3 m at 60° and 70° may sit
inside or outside per-dip coverage; either way the ordinary §3
coverage behavior is the demonstration, as with D-37's deliberate
30° warning — verify and record the observed state in the G-14
evidence. The §9.5 sample spec (item 5) parameterizes over both
samples and asserts the chooser's keyboard operation.

### 10.2 Sample stories (G-15)

After a sample fill, Site conditions offers one closed disclosure
under the §9.1 status line — **About this sample** — per sample,
presentation state, never part of Draft:

- The illustrative story anchors its scale to the 1999 M 7.6
  Chi-Chi earthquake as the published figures page already frames
  it (`subprojects/mkdocs/docs/figures.md`): meters of offset on
  the Chelungpu fault at the collapsed bridge and the Shih-Kang
  Dam. The preserved school grounds lifted about 2.5 m carry their
  own citation — the scenic-area administration's page about the
  museum states the playground lift
  ([Tri-Mountain NSA](https://www.trimt-nsa.gov.tw/en/attraction/857/)),
  with any scholarly companion verified during G-15. The story
  states plainly that the values are illustrative, of that scale,
  and model no event.
- The Kern story names the 1952 M 7.36 Kern County earthquake on
  the White Wolf fault — the magnitude is the site's constant —
  and says the release's field measurements include the Buwalda &
  St. Amand (1955) digitisation the dashboards overlay, which a
  later guided field overlay (next phase, PDD §4.4) would compare
  against. Its anchors: a dip near 75° in the geodetic record and
  about 1.3 m of maximum surface elevation change. The same
  anchored-not-modeled sentence applies.

A story may carry one or two images, each with alt text and a
visible credit naming author and license. They are project
images, never application assets: the files live in the committed
`subprojects/mkdocs/docs/images/` tree, publish at `images/`, and
enter the legacy DDD §6.1 arm (b) publication inventory by one
reviewed line each in `subprojects/mkdocs/publication-allowlist.txt`;
the app references them relatively from `/explore/`. Nothing
enters `assets/explore/`: the Gradle staging sync and the hook's
subtree exactness keep that directory to the hashed bundle, so an
image placed there is deleted or fails the build.
Public-domain or CC BY / CC BY-SA files only: verify the
license on the source's own page per file and record source URL,
author, license, and verification date in the G-15 evidence.
Candidates to verify: the USGS ScienceBase Bealville bent-track
photograph (stated U.S. public domain) for Kern; the Wikimedia
Commons Chelungpu preservation-site photographs for the
illustrative story. Story texts are reader-facing scientific
prose: CR-10 approval precedes the merge.

### 10.3 Sample presentation rework (D-43, G-18)

Owner review of the built §§10.1–10.2 supersedes parts of both:

- One secondary action, **Try a prefilled sample**, replaces the
  two sample buttons. It opens a listbox or an equivalent
  accessible menu naming both samples by scale — Chi-Chi scale —
  shallow fault (30°/40°); Kern County 1952 scale — steep fault
  (60°/70°) — each option with a one-line descriptor. Final
  strings go to the owner before merge.
- The ask-before-replace confirmation renders as an accessible
  modal dialog: the question and both choices inside it, focus
  trapped, Escape dismissing as Keep my choices. §9.1's never a
  browser dialog stands; this amends D-37's inline presentation.
- The prefill notice reads "Prefilled with the {sample} values.
  This is an illustration — change anything you wish." and shows
  on Site conditions and Fault movement while the fill stands
  unedited; the first draft edit or replacement clears it. For
  this notice, §9.1's clear-on-leaving-the-step is superseded.
- After a fill, Site conditions' primary action is Continue to
  fault movement; Return to review stays available once reached.
- Both movement modes prefill. The Kern slip window is 1.6–1.9 m
  (Bawden 2001), independent of the model's offset-to-slip
  conversion; the illustrative sample's slip window is an agent
  selection under the PDD §2.3 delegation, named in the evidence.
  Switching modes shows the prefilled values; validation and
  conversion behavior are unchanged.
- The §9.5 specs follow: the chooser's keyboard operation, the
  modal's focus behavior, notice persistence, the sequential
  footer, and both-mode prefills, parameterized over both samples.

### 10.4 Story trigger and value annotations (D-43, G-19)

- The story panel moves behind a prominent trigger — **Where
  these values come from** — directly under the prefill notice on
  both input steps, collapsed by default, the §10.2 content
  unchanged inside: paragraphs, pictures, captions, credits, and
  sources.
- While a sample is active, short annotations appear beside the
  prefilled controls — for example, by the fault angles: geodetic
  studies put the White Wolf fault near 75°, and the sample uses
  the two steepest modeled angles — one or two sentences each,
  with the §10.2 source links where they apply. Floating or
  inline is the agent's layout choice; annotations must not
  obstruct input or be announced redundantly.
- Annotation and trigger texts are reader-facing scientific
  prose: CR-10 — the exact strings go to the owner for approval
  before the merge, like the §10.2 stories.

### 10.5 Review revision (D-44)

A relayed external review, read before the G-18 merge, revises
§§10.3–10.4 as follows; everything not named here stands.

- The chooser: **Try a prefilled sample** opens a small dialog of
  two selectable cards, not a listbox. Card titles name inputs —
  **Lower fault angles** (30° and 40°; surface offset up to 3 m);
  **Steeper fault angles** (60° and 70°; surface offset up to
  1.3 m) — and each card holds the key values, the story's
  background with its photographs, and the sources. Selecting a
  card previews it without changing the draft; **Use this
  sample** applies it; when the draft is not fresh, the §10.3
  modal question becomes the dialog's next step. The cards form
  one tab stop with arrow movement; Escape closes without
  applying.
- Names and event wording: the Chi-Chi and Kern County
  connections appear in the previews, the stories, and the
  per-field annotations, never in the card titles (owner ruling,
  2026-11-05, with the G-19 approval). The shared
  story sentence becomes "These examples help you try the tool.
  They do not reconstruct either earthquake." — a CR-10 story
  edit replacing §10.2's anchored-not-modeled sentence.
- The prefill notice: "Prefilled with the {sample} sample. You
  can change any value." After the first edit it becomes "Started
  from the {sample} sample · Modified" and keeps that form;
  replacement or Start a new scenario removes it. The background
  trigger — **Why these sample values?**, helper "Background,
  photos and sources" — follows the notice's lifetime, not the
  first edit.
- Per-field annotations (§10.4) update or clear when their
  control's value changes, so a sample explanation never reads as
  justifying a reader's own value.
- Movement modes: the §10.3 prefills stand. The Kern slip window
  is presented as Bawden 2001's two patch estimates — 1.6 m and
  1.9 m — used as an example band, never as an uncertainty
  interval; card descriptors name the offset only. While a sample
  is active, switching movement modes shows a short note, whose
  text §12.7 (D-47) now sets.
- The §9.5 specs follow: card preview without draft change, the
  apply and replace steps, the notice's Modified form, trigger
  persistence, annotation updates, and the mode-switch note.

## 11. Wording and UX polish (D-45)

The second external audit
(`notes/2026-11-05/explorer-wording-ux-audit.html`) governs this
section; PDD D-45 adopts it. Tasks G-20 and G-21 carry it after
the §10.5 rework lands.

### 11.1 Wording (G-20)

The audit's swaps apply wherever the current string appears on
the guided page — through a guided-side copy layer where the
string is shared, so `/scenario/`'s bundles and the PDD copy deck
stay byte-identical (overnight ruling, 2026-11-05) — and never in
a `/scenario/`-only file (D-39):

| Current | Adopted |
| --- | --- |
| matching records | matching simulation stages |
| valid measurements | measurements used |
| Excluded null count | Missing values (excluded) |
| Corresponding fault slip at depth | Estimated fault slip at depth |
| Your window includes | Your selected range includes — superseded 2026-11-06: the low-slip caveat now carries D-4's decided text whole (PDD §5.9; task G-25), not this swap |
| Histogram bin data | Histogram counts by value range |
| Browse freely | Exit walkthrough |
| Download results | Download data (ZIP) |

The normalization phrase becomes a plain-language explanation of
the particular input error, and **Download data (ZIP)** gains a
short contents description; both texts return through the string
gate. Specs asserting the old strings update with them.

### 11.2 Presentation (G-20)

- Results screen: a compact confirmed-scenario summary and the
  critical warnings stay visible; the full summary moves behind
  **View full scenario**; chart and measurement choices move above
  it. This amends the D-32 and D-36 presentations.
- The walkthrough's header reads **Results walkthrough · n of 5**,
  leaving the journey stepper's Step 5 of 5 unambiguous; Next
  stays within reach after long content.
- A help disclosure must add information beyond the sentence it
  follows; those that only repeat it gain content or go.
- The Scarp dip choice card carries its provisional mark before
  selection, using the existing notice wording.
- Density choices order physically: Dense, Medium, Loose.

### 11.3 Defects (G-21)

- The disclosure info icon must not overlap summary labels, on the
  sample story and every other disclosure using the pattern.
- A first calculation failure must not claim preserved results
  when none exist; the message states only what holds.
- The version-mismatch message and its control agree: either the
  control reloads the page or the message asks to retry loading.
- The recurring axe contrast report on the theme's Back to top
  control (`.md-top`, the `/scenario/` failure states, load- or
  timing-dependent): determine whether the contrast genuinely
  fails there — then fix the style, a defect fix permitted under
  D-39 — or whether the report is a measurement artifact — then
  stabilize the spec, with a narrowly scoped, recorded exclusion
  only as the last resort. The determination enters the evidence.
- The §9.5 specs cover the fixes.

## 12. Progression guidance and review fixes (D-47)

The owner's review of the deployed build and a third external
review, relayed 2026-11-05 and taken at f3f94a7, govern this
section; PDD D-47 adopts them. Tasks G-22 and G-23 carry it,
sequenced after G-21.

### 12.1 Readiness guidance (G-22)

Progression stays enabled, and the page explains instead of
refusing; GOV.UK's button guidance and the W3C form-feedback
guidance are the owner's cited authorities.

- Before any attempt, a neutral line near the step's forward
  button names each unfinished condition — "Still needed:
  Sediment depth · Sediment density." — each name a link moving
  focus to its group. It updates as conditions change, and no
  red marking shows on arrival.
- An unsuccessful forward click renders a visible summary —
  "Choose values for 2 conditions before continuing." — linking
  each named condition. Focus moves to the summary, no longer to
  the first group's Select all control; the per-group inline
  messages stay.
- The empty-group presentation emphasizes the group boundary and
  its message. The per-checkbox red outlines and invalid marks
  go; single numeric fields keep their own.
- A corrected condition keeps clearing its message at once; an
  action disables only while an operation runs, as Show results
  does while calculating.
- The step list stays a sequence indicator with no new click
  behavior (owner ruling, 2026-11-05). Unreached steps, and
  Results before results exist, stop rendering as disabled
  buttons and render as non-interactive entries, so no control
  reads as refusing; the rest stay clickable. A top-of-page Next
  duplicating the footer was floated and is declined this round;
  the queued display work may revisit it.
- Final strings pass the owner's gate before merge.

### 12.2 Start a new scenario (G-22)

Start a new scenario returns to the opening step with the fresh
draft, where Build your scenario and Try a prefilled sample are
both offered; today it lands on Site conditions, past the only
sample entry point.

### 12.3 The floating Back to top control (G-23)

The theme's Back to top control leaves the guided page (owner
ruling, 2026-11-05): the owner's screenshot and the review both
show it covering the movement step's heading and + control after
validation — overlap the fixed scroll clearances cannot address,
since the control floats mid-viewport. The rest of the site
keeps it, and G-21's settled-wait a11y helper stays for the
pages that keep it.

### 12.4 Sample dialog actions (G-23)

Use this sample and Cancel stay in view in a persistent dialog
footer while the preview — values, story, photograph, sources —
scrolls; at 1280 × 720 the review measured the actions about
1,500 px below the viewport's top. The photographs and the
background stay in the preview, per §10.2.

### 12.5 Required marks (G-23)

Both slip endpoints carry the Required mark: clearing the
prefilled Minimum blocks review while only Maximum says
Required. This adopts audit entry 16, which D-45 had left open.
The initial minimum stays 0.

### 12.6 Explanation styling (G-23)

The sample notice, the per-field annotations, and the
mode-switch note read as information, not caution: they leave
the warning-family washes for a neutral treatment, and caution
styling stays reserved for coverage and interpretation
warnings. Contrast holds in both lane projects.

### 12.7 Mode-switch note (G-23)

The note reads: "The sample has separate example values for each
mode; one is not converted from the other. Switching modes can
change the results." It replaces the sentence saying each mode
selects a different set of simulations, which read as a general
claim about switching; the new text states the sample behavior —
the per-mode values are separate by design, the Kern slip window
being Bawden 2001's band rather than a conversion. (CR-10;
§10.5's description of the note is superseded.)

## 13. Result report (D-48)

PDD D-48 sets the result report first in the P1.5 band,
release-blocking for v0.4, delivered with no new control: the
FR-D1 download gains one member. PDD §6.5 holds the product rule;
this section fixes the design guided task G-13 implements. Every
change is guided-only — no file served to `/scenario/` changes,
and its bundles stay byte-identical (D-39).

### 13.1 Delivery inside the FR-D1 download

The guided results download keeps its button, its file name rule,
and its availability (confirmed results only). Its archive adds
one final member, `report.docx`, after the four members of DDD
§5.9. The guided download handler composes the archive itself: it
takes the four text members from the shared `packageTexts`
(unchanged), appends the report member, and writes the archive
with the shared `zip` writer (unchanged), all at the handler's
one `generatedAt` instant. The shared `buildPackage`, the
`/scenario/` button and delivery, and every shared module keep
their bytes.

The hint under the button names the report (§13.7); the button
label and the ready status line stay. A second activation while
the archive is being assembled is ignored — a download-local busy
flag, released when delivery or failure settles.

### 13.2 Document content

The report is one self-contained Word document of the confirmed
scenario. Its order:

1. Title block: the document title (§13.7); the scenario table —
   one row per summary condition in the DDD §5.8 order, labels
   the guided page's own condition names (the compact summary's
   wording), values reusing the summary
   tokens' own wording, the label column shaded light gray by
   direct formatting (the owner's Word-check direction at the
   G-13 gate, 2026-11-05, replacing the one-line summary here;
   the captions keep that one-line form); and the generated
   instant with the software and data-export versions.
2. Provenance: the blocks of `provenance.txt` (DDD §5.9; PDD
   §6.1) rendered as paragraphs — citation, DesignSafe DOIs,
   versions, scenario settings, population, generation date, and
   every active caveat, the same words as the text member.
3. One section per measurement, in the PDD §4.1 order (scarp
   height, deformation-zone width, scarp dip): the measurement
   label and unit; the PDD §4.2 statistics table with the page's
   row labels and formatted values; the histogram and the
   cumulative chart as images, each followed by its caption.
   The small-result warning, when active, opens the section in
   the page's wording; scarp dip's section carries the
   Provisional-data notice exactly as the page does (PDD §5.4).
4. Nothing else: no field measurements (PDD §6.1), and no content
   the page does not show.

Each caption is document text carrying the D-14 fields: the
displayed measurement and its unit; the one-line scenario
summary; the count line in the page's wording; the software and
data-export versions; "Cite: Chiama et al. (2025)"; and, on the
cumulative chart, the PDD §4.1 accuracy statement in the guided
overlay's approved wording. D-14's on-image strip is not used
here (PDD §6.3): inside a document the caption is better as
selectable text, and the on-image rule waits for the standalone
chart export.

### 13.3 Fixed chart set

The report's charts do not follow the on-screen toggles: two per
measurement — the linear histogram and the cumulative curve —
whatever view, scale, or walkthrough state the page is in, so the
same confirmed scenario always files the same record. The width
log-scale variant stays out of the report this round (recorded; a
D-23-governed refinement may revisit it). Where the page's chart
floor suppresses a chart (D-11, fewer than 10 valid), the report
prints the page's suppression notice in the image's and caption's
place; the statistics table still renders whenever the page shows
it.

### 13.4 The `.docx` assembly

`report.docx` is itself a stored ZIP written by the same shared
`zip` writer, holding the minimal OOXML part set:
`[Content_Types].xml`; `_rels/.rels`; `word/document.xml`;
`word/_rels/document.xml.rels`; and one `word/media/chart-<n>.png`
per rendered chart, numbered in document order. The document uses
direct run and paragraph properties (bold, sizes) and no styles
part; a styles part is a permitted refinement at review if Word's
defaults disappoint. All XML parts are deterministic functions of
the `RenderInput`, the version stamps, and `generatedAt`; only
the PNG bytes are browser-dependent.

Chart images are rasterized from the same SVG the shared DDD
§5.12 builders produce for the guided page, overlay wording
included: the SVG is serialized, drawn to a canvas at twice its
CSS size, and encoded as PNG; the drawing embeds inline at the
chart's CSS size (9,525 EMU per pixel). Rasterization is the only
browser-bound step and is injected into the assembly, which is
otherwise a browser-and-Node module (DDD §5.1) under
`src/explore/`, so no `/scenario/`-served file changes.

### 13.5 Failure behavior

If rasterization or assembly fails, the download still delivers
the four-member archive of DDD §5.9 and says so: the status line
states that the data files are ready and the Word report could
not be built this time (§13.7). The archive never carries a
partial or corrupt `report.docx`, and the existing whole-download
failure message is unchanged for failures before the four members
exist. Failure honesty follows ADR-0010: the message names what
is missing and claims nothing that did not happen.

### 13.6 Archive layout and the independent checker

DDD §5.9's four-member layout continues to hold for `/scenario/`,
unchanged. The guided archive's layout is that plus `report.docx`
last. `test/zipcheck.py` learns the guided case: the expected
member list becomes an argument (the four names, or the four plus
`report.docx`), and for the guided list it also opens
`report.docx` as a nested archive and asserts the §13.4 part set,
every part stored, names ASCII. The Node tests keep their digests
for the four text members; the report member is asserted
structurally, never by digest, because PNG bytes vary by browser.

### 13.7 Strings

New and changed reader-facing texts; final wording goes to the
owner at the gate:

- The hint under the download button, today "Matching simulation
  stages, statistics, scenario settings and sources.", becomes:
  "Matching simulation stages, statistics, scenario settings and
  sources, with a Word report of this result (report.docx)."
- The report-failure status line: "Your data download is ready.
  The Word report could not be built this time, so the archive
  holds the data files without it."
- The document title: "Ground Rupture Explorer — result report".
- The provenance section heading: "Provenance".

Every other string in the report is an existing registry or
overlay text used verbatim: the measurement labels, the PDD §4.2
row labels, the count line, the view names, the PDD §4.1
cumulative accuracy statement in its guided form, the PDD §5.4
provisional notice, the DDD §5.8 summary wording, and the
`provenance.txt` blocks. The report introduces no second wording
for anything the page already says.

### 13.8 Acceptance

- Node tests cover the assembly as a pure function with injected
  fixture PNGs: the part set, well-formed XML, every image
  relationship resolving to a media part and every embed to a
  relationship, the §13.2 order, the scenario table's rows and
  shading, captions carrying the D-14 fields, the suppression
  branch, the §13.5 fallback under a failing injected
  rasterizer, and a fixed-scenario `document.xml` snapshot.
- `zipcheck.py` passes over a guided archive produced by the Node
  tests: the outer layout, the nested part set, stored methods
  throughout, and the DDD §5.9 digests for the four text members.
- The guided browser specs (both lane projects) download a
  confirmed scenario's archive, read it, and assert the member
  list, the nested parts, one image per non-suppressed chart, the
  caption and accuracy texts inside `document.xml`, and the
  updated hint. The `/scenario/` bundles are asserted
  byte-identical, as in every guided task.
- The owner opens `report.docx` from a downloaded archive in Word
  and the evidence records the check (G-13's completion).

## 14. Range controls on the site conditions (D-50)

PDD D-50 (2026-11-06) replaces the per-value checkboxes of the two
ordered numeric conditions — Fault angle and Sediment depth — with
paired-thumb range controls on guided Step 2. The ask reached the
owner from the project's sponsor on 2026-11-06, and the research
group's review of the same date asks for the same control ("option
for max to min values"). FR-S3 permits a range-style control that
selects only modeled values; FR-S1 forbids implying simulations
between them. Density and strength keep their checkboxes: their
values are unordered labels. Every change is guided-only — no file
served to `/scenario/` changes, and its bundles stay byte-identical
(D-39); `/scenario/` keeps its checkboxes and typed dip-range
assist.

The owner accepted the checkbox replacement on one condition — that
a non-contiguous selection has no real use in the guided journey.
The recorded assessment: the journey describes one plausible site,
and uncertainty about a site's dip or depth is an interval;
selecting separated values while excluding the middle is a
comparison workflow, which belongs to `/scenario/`'s checkboxes or
to two runs of the journey; both shipped samples are contiguous.
The choice stays amendable on sight.

### 14.1 Control

Each of the two groups renders one track with two thumbs — a pair
of native range inputs labeled Minimum and Maximum whose steps are
the indices of the modeled values from the manifest (seven fault
angles: 20, 30, 40, 45, 50, 60, 70 degrees; three depths: 3, 5,
10 m) — never interpolated positions. A fixed scale row under the
track labels every modeled stop with its value; the track is a
connector between stops, not a continuum: no position between
stops is selectable, and each thumb's accessible value speaks the
modeled value with its unit ("40 degrees"), not an index. The
thumbs clamp against each other so Minimum never exceeds Maximum;
arrow keys move one modeled stop per press.

### 14.2 The set stays the state

The draft and the scenario keep their `number[]` sets for fault
angle and depth — D-26's "one or more values" unchanged — so
`scenario.json`, the session record, the engine, the report, and
the summaries are untouched. The thumbs render the set's minimum
and maximum; a thumb move materializes the full contiguous set of
modeled values inside the chosen bounds. A selection echo under
each track names what the range selects — "Selected: 30°, 40°,
45° — 3 of 7 modeled angles." — in a polite live region, so the
control cannot read as continuous (FR-S1) and the review and
results summaries keep their explicit value lists.

A restored or prefilled set renders at its extremes without being
rewritten: both samples are contiguous ([30, 40]; [60, 70]), but a
pre-§14 session may hold gaps. The stored set stays the truth —
the echo lists it verbatim and appends "(with gaps)" — until the
reader moves a thumb, which materializes the contiguous range. No
scenario changes silently on restore.

### 14.3 Emptiness, hints, and Select all

A range always selects at least one modeled value, so the two
groups can never be empty: their Required mark and empty-group
hint become unreachable and the D-47 readiness line simply never
names them; `validateDraft`'s set rules stand with no change. The
Select all checkbox leaves the two groups; in its place a **Full
range** action sets both thumbs to the extremes, with the hint "If
unknown, keep the full range." — the research group's 2026-11-06
ask applied to the two ordered conditions (the checkbox groups'
equivalent hint is a queued intake item). The group tooltip,
glossary link, and sample annotations stay.

### 14.4 Presentation

`explore.css` only: the track and thumbs in both themes with
visible focus, the scale row wrapping at 320 px without horizontal
scroll, the echo line, and the Full range action styled as the
existing tertiary actions. Charts, results, and the movement step
are unchanged.

### 14.5 Acceptance

- State tests: a thumb move materializes the contiguous modeled
  set; a restored gapped set stays verbatim until a move; sample
  prefills render at their extremes; validation and readiness
  behavior unchanged for the checkbox groups.
- Browser specs (both lane projects): per-stop keyboard movement
  with spoken modeled values, clamping, the echo's list and count,
  Full range, and the 320/1024 px layouts; the `/scenario/`
  bundles byte-identical, as in every guided task.
- Exact strings — the labels, the echo pattern, the Full range
  action, and the hint — go to the owner before the merge.

## 15. SME wording adoption (D-51)

PDD D-51 (2026-11-06): the owner directs that reader-facing
wording follow the research group's supplied texts — they are the
subject-matter experts. This section fixes the strings task G-26
implements. Guided-only (D-39): explore-local strings and the
D-45 overlay change; registry baselines stay per PDD §3.7's
supersession pattern, and the `/scenario/` bundles stay
byte-identical. Strings marked **assembled** are built from the
review's own sentences where it gave substance without copy; they
go back to the group for sight with the next briefing round.

### 15.1 Steps and headings (the review's renames)

- Step 2 name: **Geological site conditions** (was Site
  conditions); heading **Describe the geological site
  conditions**; buttons **Edit geological site conditions** and
  **Change geological site conditions**; the review step's block
  heading follows the new name.
- Step 3 name: **Fault slip** (was Fault movement — the review:
  "rather than fault movement, it is fault slip or fault
  displacement"); heading **Choose the assumed fault slip**;
  buttons **Continue to fault slip** and **Change fault slip**.
- The stepper, step list, readiness lines, and session labels
  follow the two names; the mode labels of CR-3 (**Fault slip at
  depth**, **Vertical surface offset**) are already compliant and
  do not change.

### 15.2 Introduction (assembled)

The PDD §2.3 amended block, replacing the second and third
sentences of the 2026-11-03 introduction:

> Describe the geological site conditions and fault slip you want
> to investigate, then see the simulated results. This research
> tool helps you forecast what could happen at a site with known
> conditions — probabilities from simulations, not a prediction
> of what will happen at a particular site.

The intro grid's first card reads "Choose the modeled geological
site conditions and fault slip you want to investigate."; the
second card's "cover your movement range" becomes "cover your
slip range"; the static `/explore/` landing text follows the
amended block. The no-site-prediction clause stays, so CR-2 and
CR-4 hold.

### 15.3 Site-condition hints (the review's definitions)

- Fault angle hint: **How steeply the fault is dipping, measured
  from the horizontal. Also called fault dip.** (the bridge
  sentence names the glossary term; the label itself stays Fault
  angle).
- Sediment depth hint: **Thickness of the sediment above
  bedrock.** — replacing "above the fault".
- The density and strength groups append **If unknown, select
  all.** to their hints; the §14 range groups carry "If unknown,
  keep the full range."

### 15.4 Fault-slip help (the review's definition; the slip-rate
sentence assembled)

The "What is fault slip?" disclosure becomes:

> Fault slip is the displacement between the two sides of a fault
> as they move past each other. It is different from the vertical
> displacement measured at the ground surface. These models
> measure fault slip as cumulative dip-slip — movement along the
> fault plane, parallel to its dip. The models run the fault at a
> slip rate of 0.3 m/s — near coseismic slip rates, chosen so the
> models stay stable.

The first three sentences are the review's definition lightly
fitted; the slip-rate sentence is assembled from its
parenthetical.

### 15.5 Small-count notices (assembled; overlay)

- 10–29 used: **Only {N} measurements can be used for this
  scenario. They are not less trustworthy — a very specific set
  of site conditions matches few simulations, so the distribution
  is coarse. Try adding more options to include a range of
  results.**
- 1–9 used: **Fewer than 10 measurements can be used — too few to
  draw a distribution. They are not less trustworthy; the
  selection is very specific. Showing the statistics table only;
  try adding more options to include a range of results.**
- The zero-valid and empty-scenario texts are unchanged.

### 15.6 Pressure ridge and additional uplift (the review's
terminology)

"Raised ridge" leaves the guided strings. The scarp-type overview
says **a pressure ridge** where it said a raised ridge, and the
diagram caption follows. The scarp-height tooltip's second
sentence becomes: **A pressure ridge can stand above the
undeformed ground on the lifted side as well — that extra height
is called additional uplift (Us − Ud).** The MkDocs glossary's
plain-language column and the dashboard page's mention adopt the
same terms (they ride with G-26).

### 15.7 Deformation zone width (the review's spelling)

Reader-facing guided surfaces spell the term **Deformation zone
width**: the guided measurement names, the chart label through
the overlay ("Deformation zone width (m)"), the intro text, the
report labels, and the glossary link text. CR-3 is amended and
the PRD swept; the sandbox registry keeps the hyphenated baseline
until the registry moves.

### 15.8 Negative-height note (assembled; D-46)

When the scarp-height panel's matched minimum is below zero, a
note joins the panel and the report's scarp-height section:

> Small negative heights are at the model's resolution — single
> particles are about 0.02 m — and can reflect smoothing or extra
> compaction at low slip, not measured subsidence.

### 15.9 Glossary content (the review's definitions)

The MkDocs glossary adopts the review's updated definitions —
fault slip, surface offset, fault dip (fault angle), fault scarp,
the surface-deformation-characteristics family (scarp height,
additional uplift, deformation zone width, scarp dip), simulation
stage, and sediment depth — keeping every anchor id unchanged.
The source texts are quoted verbatim in the review record's
entry "The review's updated definitions (2026-11-06, verbatim)";
G-26 fits them to the glossary's reader register, and any
sentence the fitting alters joins the assembled list for the
group's sight. The briefing's short terms list is not replaced
by them; its stage and width lines were already updated.

### 15.10 Acceptance

- Strings land exactly as §§15.1–15.9 give them; the assembled
  strings are listed in the pull request for the group's sight.
- The §9.5 specs asserting renamed steps, hints, notices, labels,
  and the tooltip are updated; both lane projects pass; the
  `/scenario/` bundles stay byte-identical.
- The static landing text, the MkDocs glossary, and the dashboard
  page's term fix land in the same change.

### 15.11 Fitting decisions (2026-11-06, G-26 start)

Six gaps the implementing session found between §15's strings and
the page, decided by the planning session under D-51 and the §13.7
precedent, amendable by the owner on sight:

1. The two registry texts reaching the guided page with the
   hyphenated spelling follow §15.7: the width-scope note through
   an overlay entry, and the no-valid notice's lower-cased
   measurement slot by a guided-side fix. Spelling only; the
   registry baselines keep their bytes.
2. The two remaining "raised … ridges" sentences — the offset
   help's "raised surface ridges can make that estimate too large"
   and the conversion hint's counterpart — say **pressure ridges**;
   both altered sentences join the assembled list.
3. The summaries' "Movement:" label follows the renamed block —
   **Fault slip:** — and in slip mode the value drops its now
   redundant tail: "Fault slip: 0–5 m" (offset mode keeps its mode
   words, "Fault slip: 0–1.3 m surface offset"); the review hint
   reads "as fault slip increases". The trimmed slip-mode value
   joins the assembled list.
4. The sediment-depth tooltip adopts the review's definition ("The
   thickness of the sediment above bedrock."); the fault-angle
   tooltip stands — "tilted" does not contradict "dipping" — and
   every other tooltip waits for question 1's read-through.
5. The static landing paragraph is the §15.2 amended block's two
   sentences verbatim, replacing the current three.
6. The fault-slip help keeps its title and glossary link; only its
   body changes, to §15.4's sentences.
7. The review's surface-offset definition gets its own glossary
   entry — **Surface offset**, anchored `#surface-offset`, after
   Slip in "Faults, in plain terms" — holding the review's text;
   the Vertical separation entry stands. The briefing's
   surface-offset term link retargets to the new anchor in the
   same change, so the checker stays green in every state; the
   guided offset-help link and the §5.11 first-use map keep
   `#vertical-separation` until question 1's read-through.
8. Two leftovers outside §15's original scope, decided by the owner
   with the G-26 string approval (2026-11-06): the results empty
   state says "Change a condition or slip range, then review the
   scenario again."; and the results footer replaces the original
   research-tool sentence with §15.2's amended forecast sentence,
   keeping the Full disclaimer link — so the page carries one
   framing, not two. Both join the assembled list.

## 16. Chart-image export (D-14, FR-D2)

PDD D-48 set the chart-image export second in the P1.5 band,
release-blocking for v0.4, "a thin action over the same
rendering" as the result report; the owner decided D-14 on
2026-11-06, adopting PDD §6.3's strip-and-sidecar format. This
section fixes the design task G-27 implements. Every change is
guided-only — explore-local code and strings; the shared chart
builders, `packageTexts`, and the `/scenario/` page keep their
bytes (D-39).

### 16.1 The action

Each measurement card with a rendered chart gains one button
under the chart, beside the chart-data disclosure: **Download
this chart (PNG)**. It exports the chart as displayed — histogram
or cumulative, linear or logarithmic — for the confirmed scenario
(FR-D1's gate). No button renders while results are unconfirmed
or where the chart is suppressed below the chart floor: there is
no chart to export. A per-card busy flag ignores a second
activation until delivery or failure settles, like the report's
(§13.1).

### 16.2 The image

The exported PNG is the displayed chart's SVG rendered by the
§13.4 rasterizer — 2× on white, the report's geometry — with the
D-14 caption strip composed beneath it in the same image:

- the product and page name ("Ground Rupture Explorer — guided
  journey");
- the measurement with its unit and the chart kind
  ("Deformation zone width (m) — histogram, log scale");
- the one-line scenario summary of §13.2, naming the population;
- the count line in the page's own wording (§13.3's precedent for
  the D-14 fields): "N = {used} measurements used of {matching}
  matching simulation stages ({excluded} missing values
  excluded)";
- the software and data-export versions (the §6.2 stamps);
- "Cite: Chiama et al. (2025)" with the pointer to the full
  citation in the download's citation file and the site's How to
  cite;
- on a cumulative image, the PDD §4.1 accuracy statement.

The displayed panel's active caveats — the low-slip caveat, the
scarp-dip provisional notice, the width-scope note, the
small-result warning — join the strip as single lines in the
page's wording: PDD §5.4 requires the scarp-dip notice everywhere
the measurement appears, and CR-8 keeps warnings with results, so
an image circulating alone keeps its warnings.

### 16.3 The sidecar

The same activation saves a second file: the §6.1 provenance text
rendered through the guided overlay (the G-25 rule), leaving the
shared `packageTexts` untouched. The PNG's strip alone already
satisfies FR-D2's include branch, so a blocked second save is
reported in the card's status line and is not fatal.

### 16.4 Naming

Both files extend the FR-D1 download's base-name rule (§13.1):
`{base}-{measurement}-{chart kind}.png` and
`{base}-{measurement}-{chart kind}-provenance.txt`, the
measurement slug per the §13.6 member convention and the chart
kind one of `histogram`, `histogram-log`, `cumulative`.

### 16.5 Acceptance

- Node tests: the strip's fields from a scenario fixture in both
  modes; the cumulative accuracy line; caveat lines present
  exactly when active; deterministic bytes for a recomputed
  result; the sidecar equal to the overlay-rendered provenance;
  the rasterizer-failure fallback leaves no partial file and
  reports in the status line.
- Browser specs (both lane projects): the button on each rendered
  chart and absent when suppressed or unconfirmed; a real PNG and
  its sidecar download with plausible sizes; the busy flag; the
  320/1024 px layouts; the `/scenario/` bundles byte-identical,
  as in every guided task.
- Exact strings — the button, status lines, and strip labels — go
  to the owner before the merge.
