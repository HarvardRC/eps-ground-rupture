# Ground Rupture Explorer scenario journey prototype

**Review record: 2026-11-03–04. Selected version: Focused steps.**

This prototype shows how a reader can build a scenario before
exploring its results. It replaces the opening collection of filters
with a sequence that explains what to choose and why. The owner
approved the journey and introduction, liked the visual direction,
and selected **Focused steps** in the prototype review.

The journey, introduction, review variant, selection, review,
displacement-mode, restart, step-navigation, movement-entry,
review-screen, first results presentation, and result-refinement
decisions below are agreed. D-36 adds Choice cards for normal results
browsing, clearer refinement controls, and an optional results
walkthrough. Other detailed interactions remain
proposals. The saved full-journey prototype is an earlier
snapshot: its unspecified-condition, displacement-default, and
result-update behavior is superseded by those decisions. The later
component examples capture the site-selection, movement-entry,
review-screen, results, and refinement discussions. None queries
simulation records. The movement and review examples calculate
illustrated conversions; the results and refinement examples calculate
statistics
from invented measurements.
These examples do not replace the product definition or
implementation plan.

- [Earlier full-journey prototype](prototypes/scenario-journey.html).
- [Full-journey editable source](prototypes/scenario-journey.fragment.html).
- [Site-condition selection example](prototypes/site-condition-selection.html).
- [Site-selection editable source](prototypes/site-condition-selection.fragment.html).
- [Fault-movement entry example](prototypes/fault-movement-entry.html).
- [Movement-entry editable source](prototypes/fault-movement-entry.fragment.html).
- [Scenario-review example](prototypes/scenario-review.html).
- [Scenario-review editable source](prototypes/scenario-review.fragment.html).
- [Scenario-results example](prototypes/scenario-results.html).
- [Scenario-results editable source](prototypes/scenario-results.fragment.html).
- [Scenario-refinement example](prototypes/scenario-refinements.html).
- [Refinement editable source](prototypes/scenario-refinements.fragment.html).
- [Product definition and approved introduction](pdd.md#23-user-journeys).

Open the clickable HTML file in a browser. When viewing it on
GitHub, download the file first; the repository's source view does
not run it. The saved page includes the prototype and its controls,
with shared interface assets loaded from public content-delivery
networks. These pages are not offline bundles. The six examples
are separate pages; a selection made in one does not update another.

## Reader and purpose

The primary reader is the
[practicing engineer](prd.md#31-primary-persona-the-practicing-engineer)
who understands the engineering problem but may not know the
simulation dataset or its methods. The reader may have approximate
site conditions and a displacement assumption, with uncertainty
about some inputs.

The interface should help that reader describe those assumptions,
review them, and understand the matching simulated measurements.
It searches existing simulations; it does not run a new simulation
or predict what will happen at a particular site.

## Agreed direction and selected presentation

The agreed MVP journey is:

1. Understand what the tool offers.
2. Describe the site conditions.
3. Choose an assumed displacement.
4. Review the scenario.
5. Explore and interpret the matching results.

**Focused steps** shows one stage at a time. A numbered navigation
list names all five stages and identifies the current stage. A
clear primary action advances the journey; **Back** returns to the
previous stage. Stages already reached can be revisited. Later
stages are initially unavailable. D-30 below now defines draft
preservation and the checks required when revisiting review or
results; the saved snapshot does not yet implement those rules.

The header retains the name **Ground Rupture Explorer**, with the
secondary label **Research companion**. The visual direction uses
quiet backgrounds, restrained crimson accents, clear headings,
short explanations, and one prominent next action. On a wider
window, the stage list and a compact selection summary sit beside
the main content. In a narrower window, stage navigation moves
above the content and the side summary disappears.

The saved prototype also retains **Guided page** for comparison.
It presents the same stages as expandable sections, opening one at
a time while keeping the other section headings visible. Each
version keeps its own selections in the prototype.

The variant picker and **Interaction proposal · Results are
illustrative** label belong to the review environment, not to the
proposed released product. The review control for showing supporting
explanations is also a design-comparison aid, not an agreed product
setting.

## Agreed interaction decisions — through 2026-11-04

[PDD §2.3](pdd.md#23-user-journeys) records the authoritative product
definition in D-26–D-36.

**Required site conditions (D-26).** A fresh scenario starts with
no values selected for fault angle, sediment depth, sediment
density, or sediment strength and structure. Each is marked
**Required**, with the instruction **Choose one or more values for
each condition**. An empty condition is an incomplete draft.

**Select all** is a convenience that selects and highlights every
value exactly as individual selection would. It must not be
recommended because the reader is unsure what to choose. A subset
produces a mixed checkbox; all values selected produces a checked
checkbox, including when selected individually. Clicking unchecked
or mixed Select all selects every value. Unchecking it clears the
condition. Removing the last value leaves the condition incomplete.
Uniform and layered sediment share one required selection; Uniform:
Strong alone is valid.

*Superseded in part (2026-11-06, PDD D-51):* on the research
group's advice the page suggests Select all for a condition the
reader does not know; it still never applies by default.

Before an attempt to continue, an empty condition says **Choose
one or more values to continue**. Continue with missing selections
shows condition-specific errors and moves focus to the first
incomplete condition. A valid selection clears its error.

**Draft and confirmed scenarios (D-27, extended by D-34).**
Site-condition, displacement, population, and scarp-type edits
remain one draft. They affect results only after
**Review scenario → Show results**, for both the first scenario
and subsequent revisions. Any retained
results, counts, and their summary remain associated with the
previously confirmed scenario. The complete retained-results flow
still needs integration. The PDD supplement defines initial browser
navigation without saved recovery. D-34 defines
when population and scarp-type refinements take effect below.

**Displacement-mode entries (D-28).** The draft preserves fault-slip
minimum and maximum separately from the surface-offset maximum.
Switching back restores that mode's entries. Only the selected
mode contributes to validation for review, the reviewed scenario,
and its results. Switching does not silently convert or erase
entries, and does not update previously confirmed results.
Restarting follows D-29; the PDD supplement excludes sample
replacement and saved recovery from the first separate-route version.

**Discard or start again (D-29).** **Discard changes** abandons the
draft and returns to the last confirmed scenario and its results.
It requires a previously confirmed scenario. **Start a new
scenario** clears the reader's choices in both displacement modes
and current results, then restores D-31's fresh defaults: slip
minimum 0 m and blank maxima. It returns to the site-conditions
step with no values selected. Results appear again
only after the new scenario is completed, reviewed, and confirmed.
Each confirmation remembers both displacement modes' entries.
**Discard changes** restores them to what they held at that
confirmation, including the inactive mode, and restores the
confirmed mode and site conditions. It abandons edits to either
mode; inactive entries still do not contribute to results. D-34
extends the same confirmation and discard behavior to population
and scarp-type selections. Starting a new scenario also restores
all stages within the slip range and all scarp types.
The placement and availability presentation of these actions
remain open.

**Moving between steps (D-30).** **Back** and revisiting input
steps preserve the draft. Every route to **Review scenario**
requires complete, valid inputs; otherwise the reader returns to
the first incomplete or invalid input step with its errors shown.
Only the selected displacement mode must be valid (D-28).

Returning to existing results preserves the draft, even if it is
incomplete or invalid. Those results still describe the confirmed
scenario. While the draft differs from its last-confirmed state,
show **You have unapplied changes** and **Return to review**. That
action applies the same review validation. Remembered inactive-mode
edits count as unapplied changes; population and scarp-type edits
do too under D-34. Merely visiting a step does not create a change.
Restoring the confirmed entries removes the notice. Visiting results
never applies edits; no results are available before confirmation
or after **Start a new scenario**. The PDD supplement defines initial
Browser Back and Forward and fresh-after-reload behavior.

**Explicit movement entries and limits (D-31).** The fault-slip
minimum starts at an editable **0**; both modes start with a blank,
required maximum. Entries support typing and mouse adjustment.
Cleared fields remain unfinished, rather than silently becoming
zero or including all stages. Each mode has a maximum shortcut.
Slip values above 5 m receive immediate red feedback; offset
coverage is checked using the fault angles selected in the preceding
step. Offset coverage warnings remain visible on review. The
[movement step below](#stage-3--fault-movement) records the accepted
behavior, current example values, and remaining proposals separately.

**Review presentation (D-32).** The owner approved the complete
review-screen example on 2026-11-03. It presents editable summaries,
the entered movement range separately from its conversion, visible
coverage warnings, and a plain explanation of the contributing
records before **Show results**. The
[review step below](#stage-4--review-scenario) records the accepted
presentation and the example's limits.

**First results presentation (D-33).** On 2026-11-04, the owner
accepted the results example as a first version. It keeps the
confirmed scenario, record counts, population, scarp types, and
warnings visible above measurement views. Charts, full statistics,
interpretation guidance, and review, edit, and download actions
follow. The [results step below](#stage-5--explore-results) records
this presentation and the remaining work. This is not acceptance
of invented results, a final release, or unshown result states.

**Result refinements (D-34).** On 2026-11-04, the owner agreed to
open **Refine results** from the results screen. Population and
scarp-type choices join the same draft as site conditions and
movement. All pending changes take effect together only through
**Review scenario → Show results**. Measurement and chart-view
changes remain immediate presentation choices. The
[results step below](#stage-5--explore-results) records the choices,
defaults, discard/restart behavior, and the accepted presentation.
The later refinement example demonstrates that flow with invented
measurements; the earlier examples do not.

**Refinement presentation and explanation (D-35).** On 2026-11-04,
the owner approved the refinement layout, selection validation,
review/discard flow, scarp descriptions and shape sketches, and
the expanded explanation of simulation stages. The stage example
compares all stages with the last stage using invented measurements.
This accepts its first presentation, not scientific data or full
accessibility certification. The owner then authorized autonomous
implementation at a separate route alongside the existing scenario
page. The [PDD implementation supplement](pdd.md#23-user-journeys)
distinguishes the agent's first-version scope choices from the
owner's accepted product decisions.

**Results controls and optional walkthrough (D-36).** On 2026-11-04,
the owner approved the shared results-controls direction and an
optional five-stop walkthrough, then selected **Choice cards** for
normal browsing, with a short explanatory question per measurement.
[PDD §4.1](pdd.md#41-measurement-views-fr-o1) records the approved
direction and separates delegated integration choices from owner
decisions. The control sketch uses placeholders; it does not show
real calculated charts or supersede scientific safeguards.

These decisions supersede the corresponding behavior in the saved
full-journey HTML snapshot. That snapshot still permits unspecified
conditions and blank displacement limits, clears displacement entries
on a mode switch, and does not model separate draft and confirmed
results. It is not an implementation reference for those behaviors.

## Stage 1 — Start here

The opening introduces the purpose before asking for inputs. Its
main wording is approved by the product owner:

> **Use simulations to understand ground rupture.**
>
> Describe the site conditions and fault movement you want to
> investigate, then see the simulated results. This is a research
> tool; it does not predict what will happen at a particular site.

The prototype places the first two sentences above the actions and
the research-tool sentence below them. It also says, “Results come
from an existing set of research simulations.” The supplementary
wording and placement remain part of the design proposal.

Three short explanations introduce the outputs:

| Output | Prototype explanation |
|---|---|
| Scarp height | The vertical step in the ground. |
| Deformation-zone width | The width of the main disturbed zone. |
| Scarp dip | The steepness of the scarp face. |

**Build your scenario** advances to site conditions. The secondary
action **Try sample inputs** fills an example and opens the same
stage, so the reader can inspect and change the assumptions.

From a fresh start, that example selects fault angles 30° and 40°,
Strong sediment in both the uniform and layered groups, and a
maximum vertical surface offset of 3 m. Depth and density remain
unspecified. These are sample inputs, not recommended site values.
This saved example is incomplete under D-26. Its depth and density
choices and replacement behavior needed a product decision; do not
silently fill them with all values. D-37 (2026-11-04) completes the
sample with 5 m depth and Dense density and defines
ask-before-replace behavior; see the PDD's second increment.

## Stage 2 — Site conditions

The heading is **Describe the site conditions**. The agreed
instruction replaces the saved snapshot's advice about leaving
conditions unspecified:

> Choose one or more values for each condition.

Each condition has a short explanation and selectable values:

| Condition | Explanation and available values |
|---|---|
| Fault angle (dip) | The angle of the fault below the ground surface. Values: 20°, 30°, 40°, 45°, 50°, 60°, 70°. |
| Sediment depth | The depth of sediment above bedrock. Values: 3 m, 5 m, 10 m. |
| Sediment density | How loosely or densely the sediment is packed. Values: Loose, Medium, Dense. |
| Sediment strength and structure | Uniform: Weak, Moderate, Strong. Layered: Weak, Moderate, Strong, Random heterogeneous, Cohesive top unit, Alternating strong–weak. |

The sediment explanation reads, “Choose uniform sediment or a
layered profile. You can include more than one possibility.” The
two groups remain visibly separate.

The D-26 rules above apply to each condition. In particular, the
saved snapshot's **Not specified — include all** default and its
automatic return to all values after the last deselection are
superseded. There is no unspecified condition in a completed draft.

**Continue to fault movement** advances to stage 3 only when each
condition has one or more selected values. **Back** returns to the
introduction. Selections remain available during the journey.

The saved site-selection component demonstrates these rules with
fault angle and sediment strength and structure. It omits sediment
depth and density to isolate the interaction. Those omissions do
not make either condition optional in the full journey. Its
Continue action reports selection completeness; it does not open
the separate movement example.

## Stage 3 — Fault movement

The later movement component is the current visual reference for
D-31. Its heading is **Choose the assumed fault movement**, followed
by:

> Choose what you want to specify, then enter a maximum value.

The question **What are you specifying?** offers:

- **Fault slip at depth:** “The distance the fault moves
  underground.” This is the initial mode and has **Minimum (m)**
  and **Maximum (m)** fields.
- **Vertical surface offset:** “The vertical difference across the
  rupture at the ground surface.” This mode has **Maximum (m)**.

**Starting values and editing.** Fault-slip minimum shows **0** as
an actual editable value, not a placeholder or an implied value.
The old **Optional** label and **Leave blank to use 0 m** helper are
removed. Both maximum fields start blank and are marked
**Required**. The reader must enter or explicitly select a maximum
before review. Surface-offset mode represents zero through its
entered maximum.

All three fields support direct typing and adjacent **− / +**
buttons. Typed decimals retain their permitted precision. The
component adjusts by 0.1 m per click and says **Type a value or use
− / + to change it by 0.1 m**. The mouse-and-typing interaction is
agreed. The PDD supplement now selects this demonstrated increment
for the first `/explore/` version under the owner's autonomous
authorization, not as a separately approved permanent product rule.

Clearing a field leaves an unfinished entry. Review reports **Enter
a minimum value** or **Enter a maximum value**, as applicable,
beside the field and focuses the first invalid field. Blank does
not silently become zero or mean all recorded stages. An explicit
zero is a value; the existing non-negative decimal, input-length,
normalization, and minimum/maximum-order rules still apply. Only
the active mode is validated. **Your entries are kept when you
switch modes** describes D-28, including unfinished entries.

**Slip shortcut and warnings.** **Set maximum to 5 m** changes only
the fault-slip maximum to exactly 5. It does not change the minimum,
select the value by default, or mean all recorded stages. The
current data ends at 5.0135 m, so a literal 5 m limit excludes the
slightly later final stages.

Either slip field turns red and shows feedback immediately when
its entered value exceeds 5 m, without waiting for Review:

- Above 5 m through the actual recorded maximum, the example says
  **Above 5 m, but within the recorded range, which ends at
  5.0135 m.** This is a warning; a valid range can proceed.
- Above the actual recorded maximum, it says **Above the recorded
  maximum of 5.0135 m. Enter a smaller value.** This is an error
  and prevents review while that mode is active.

The distinction between the rounded 5 m boundary and the actual
release's limit must remain explicit. The example's 5.0135 m value
does not authorize hard-coding the scientific limit for all releases.
Correcting the value removes the corresponding red feedback.

**Offset shortcut and warnings.** Offset coverage uses the selected
fault angle from the site-conditions step, not the inactive fault-slip
entries. With several angles selected, show the conversion and
coverage separately for each angle. A valid offset extending beyond
coverage warns immediately in red but may proceed to review;
the warning remains visible there. The warning concerns limited
simulation coverage, not physical impossibility.

The isolated example fixes the angle at 30°, matching the selection
used in the preceding component discussion. It does not read live
state from that separate example. At 30°, it shows coverage up to
approximately 2.51 m of offset. Entering 3 m shows:

> 30° fault angle: about 5.99 m of slip is needed. Warning: this
> exceeds the simulated range. Results cover only part of your
> offset range.

**Set maximum to 2.51 m** fills only the offset maximum and clears
that coverage warning. It preserves both direct-slip entries.
The shortcut is a convenience, not a recommended site assumption.

For this example, the shortcut's value is rounded downward to
0.01 m from the converted coverage limit. The proposed rule for
several selected angles is to use the largest offset covered for
all of them, then round downward to avoid exceeding the upper
coverage limit. A converted lower end below modeled slip may still
need a coverage warning. The general rounding rule and this
multi-angle shortcut policy were proposals at that review. The PDD
supplement subsequently selects them for the first `/explore/`
implementation, without representing them as prior owner decisions.

The component's **Review scenario** action opens a movement-only
summary of quantity, entered range, and any offset coverage warning.
**Edit fault movement** returns to the inputs. It has no complete
site-condition review or results calculation. The original full
journey snapshot still has the superseded blank-limit and
mode-clearing behavior; it has not been rebuilt from these decisions.

### Model limits discussed during review

At the 2026-11-03 review, the local data-v1 export covered fault
slip from 0 to 5.0135 m, recorded in roughly 0.05 m stages. These
are dataset limits, not a universal
range of plausible movement at a real site. A supported input is
not automatically a scientifically justified site assumption.
See [PDD §3.4](pdd.md#34-displacement-window-fr-s5).

Using that release's full-precision conversion coefficients,
the approximate offset corresponding to maximum modeled slip is:

| Fault angle | Offset at the modeled slip maximum |
|---|---|
| 20° | 1.72 m |
| 30° | 2.51 m |
| 40° | 3.23 m |
| 45° | 3.55 m |
| 50° | 3.85 m |
| 60° | 4.35 m |
| 70° | 4.72 m |

These are rounded coverage illustrations, not prescribed inputs or
exact cutoff values. The calculation uses the relationship recorded
in [DDD §3.5](ddd.md#35-regression-export). In particular, 3 m of
offset converts to approximately 5.99 m of slip at 30°, beyond
coverage, but approximately 4.66 m at 40°, within coverage. A 1 m
offset is covered for every modeled angle. The conversion assumes
surface scarp height approximates vertical displacement; pressure
ridges can violate that assumption, as explained in the
[glossary](../../subprojects/mkdocs/docs/glossary.md#how-the-quantities-relate).

The below-0.5 m slip notice is an interim measurement-reliability
caveat, not a minimum plausible input or a validity boundary. The
research group's final treatment remains open under
[PDD §4.6](pdd.md#46-low-slip-caveat-d-4-interim).

## Stage 4 — Review scenario

**Agreed presentation (D-32, 2026-11-03).** The heading is **Review
your scenario**, followed by **Check your assumptions before showing
results**. The screen has three sections, in this order:

1. **Site conditions.** Show the selected fault angles, sediment
   depth, sediment density, and sediment strength and structure.
   A completed draft has no unanswered conditions. The section's
   **Edit** action returns to the site-conditions step.
2. **Fault movement.** Identify the active entry mode and show
   **Your assumed range**. In offset mode, separately show
   **Corresponding fault slip at depth** for every selected angle,
   with its coverage status and the modeled slip range. The
   section's **Edit** action returns to the fault-movement step.
3. **What the results will include.** Explain the contributing
   simulation records before confirmation.

Both Edit routes preserve the draft. Their next action becomes
**Return to review**, with D-30's complete-input validation. **Back**
returns to fault movement. The primary action is **Show results**;
under D-27 it confirms the valid draft and opens its results.

Keep the full entered offset range visible, even when only part is
covered by the simulations. Do not silently shorten it. Converted
slip ranges are approximate and retain the caveat that raised ridges
at the surface can cause the conversion to overestimate fault slip.
A visible **Part of your range is outside the simulations** warning
identifies affected angles and their covered offset maxima, then
states: **Results will describe only the part covered by the
simulations**. Partial coverage does not block confirmation when
the inputs otherwise satisfy the existing validity rules.

For the initial population, the explanation identifies **All model
stages in the slip window** and says:

> For simulations matching these site conditions, include every
> recorded stage within the corresponding slip range. Each
> simulation may contribute more than one stage.

With multiple selected angles in offset mode, identify each
simulation's corresponding range for its fault angle. Explain that
a stage is a saved point as fault movement increases and that all
resulting scarp types are included in the initial scenario. Under
D-34, review must reflect the draft's chosen population and scarp
types before confirming all pending changes. D-35 supplies the later
refinement review presentation. The separate saved review example
retains the initial defaults and has no refinement controls.
Neither presentation decision changes D-3's scientific-review status.

**Illustrative completed scenario.** The saved review example opens
with fault angle 30°, depth 5 m, Dense sediment, Uniform: strong,
and a surface-offset range of 0–3 m. These demonstrate a completed
review; they are neither fresh defaults nor an approved sample or
site recommendation. At the reviewed data-v1 limits, the conversion
shows approximately 0.01–5.99 m of slip and partial coverage against
the modeled 0–5.0135 m range. Changing the offset to 2 m removes that
coverage warning. Adding 40° shows a separate conversion and status.

The saved example's Edit actions work, including required-condition
validation. Its **Show results** action ends with a clearly labeled
prototype acknowledgement; it calculates no results or match counts.
That acknowledgement is outside the proposed product screen. The
example includes the 0.1 m mouse increment and general multi-angle
offset-shortcut rule that remained proposals when review was
accepted. The PDD supplement now selects them for the first guided
implementation under the owner's autonomous authorization.

The earlier full-journey snapshot retains superseded unspecified
conditions, a no-window explanation, and **Explore matching results**
wording. Use this later example for the accepted review presentation.

## Stage 5 — Explore results

**Later controls direction (D-36, 2026-11-04).** Normal browsing
separates a prominent **Refine results** disclosure, identified by
**Simulation stages · Scarp types**, from the three measurement
choices. Selection is clear, and plain questions explain height,
width, and dip. The owner selected **Choice cards** under **What
would you like to examine?**. Each card contains the measurement
name and its question: **How high is the scarp?**, **How wide is the
disturbed ground?**, or **How steep is the scarp face?**. The selected
card has a visible marker in addition to its color. Cards sit side
by side in a wide window and stack in a narrow one. Compact selector
was the unselected alternative. These choices change the displayed
measurement immediately and do not apply scenario edits.

The optional **Walk me through results** sequence visits height,
width, dip, simulation stages, then scarp types. Its progress and
Back/Next controls replace the normal measurement selector. The
first three stops show the real confirmed measurement; the last two
show the corresponding existing editor alone. The earlier saved
results and refinement examples do not implement this walkthrough.

The PDD records delegated details: start the guide at height, retain
chart choices and all draft edits, and never calculate from guide
navigation. **Browse freely** always exits, even with no scarp types
selected, retaining the current measurement and opening normal
refinements when leaving an editor stop. At the last stop, a changed
draft offers **Review changes**; otherwise **Finish walkthrough**
returns to normal browsing. Review exits before the existing full
validation, so an empty selection uses the normal error and focus
path. **Discard changes** ends the guide and restores confirmed
choices while retaining the measurement. Leaving the results step
also ends the guide; a fresh scenario starts with it off.

Confirmed context, notices, and unapplied-change information remain
visible. Empty, small, and zero-valid results keep their real states
and chart-suppression rules. These integration details were selected
under the owner's implementation delegation, not individually
approved in the sketch. D-27–D-35 still govern review and confirmation.

**First version accepted (D-33, 2026-11-04).** The owner approved
the later results example with the qualification, “at least as the
first version.” It establishes the presentation of a normal populated
result. It does not establish release readiness or resolve unshown
states and interactions.

The heading remains **Explore your scenario**. The accepted order is:

1. **Your confirmed scenario**, with the matching-record count,
   site conditions, entered movement and converted slip range,
   population, and included scarp types. Explain that each record
   is a saved stage and that one simulation may contribute several.
2. Applicable result limitations, including partial coverage and
   the small-slip caution. Preserve the complete entered movement
   range when only part is covered. These warnings remain visible.
3. Measurement selection: **Scarp height**, **Deformation-zone
   width**, and **Scarp dip**, with Scarp height shown first.
4. The selected measurement's explanation, valid-measurement count,
   applicable warning, chart, full statistics, and reading guidance.
5. Actions for changing the scenario and downloading its results,
   followed by the research-tool disclaimer.

The chart offers **Distribution** and **Cumulative** views, with
Distribution shown initially. Distribution explains how often each
measurement range appears. Cumulative explains the share of matching
measurements at or below a value and offers a percentile read-off.
The chart shows median and 84th-percentile markers. A cumulative
read-off describes matching measurements, not earthquake probability.
The visible explanation of cumulative-curve simplification retains
the existing below-0.2-percentage-point error bound and distinguishes
the displayed curve from statistics and read-offs using all valid
matching measurements. Accepting this presentation does not replace
the authoritative scientific calculations or numerical rules.

**Statistics** sits beside the chart when space permits and stacks
below it in a narrow window. Keep the full table visible: valid
measurements, excluded missing values, median, 16th and 84th
percentiles, minimum, maximum, mean, and standard deviation, with
units where applicable. State that missing values are excluded from
that measurement's chart and statistics.

**Reading these results** explains the median and middle 68% range.
It states that these summaries are not recommended design values
and that choosing a design value requires engineering judgment.
The width view retains the limitation to the main modeled rupture
zone; the dip view retains the provisional-data warning. Existing
scientific safeguards remain authoritative.

**Review scenario** is beside the heading. **Change site conditions**
and **Change fault movement** are below the results, with
**Download results** as the prominent action alongside them. This
accepts their placement. D-27–D-32, extended by D-34, still govern
their behavior: input and refinement edits remain drafts until
review and **Show results**, and retained results continue to
identify their confirmed scenario.
The complete retained-draft workflow and download experience remain
to be designed.

**Refine results (D-34, 2026-11-04).** A **Refine results** section
opens from the results screen and provides these choices:

- **Population:** all recorded stages within the chosen slip range
  (the existing default), or the last stage within that range for
  each simulation. Keep the existing scientific population rules.
- **Scarp types:** select multiple types, initially including all
  types. Short explanations and illustrations help readers
  understand the choices. Review requires one or more selected
  scarp types. Removing the last selection leaves an unfinished
  empty draft; it never silently restores all types. The draft
  cannot pass review until at least one type is selected. Existing
  confirmed results remain unchanged while the draft is empty.

Refinement edits join the same scenario draft as any pending site
conditions or movement edits. Review and **Show results** apply all
of them together. There is no separate Apply action or automatic
update when a refinement changes. Until confirmation, existing
results, matching counts, and the scenario summary continue to
describe the previously confirmed choices. The unapplied-changes
notice follows D-30, including changes to refinements.

**Discard changes** restores the last confirmed population and
scarp-type selections along with the rest of the draft. **Start a
new scenario** restores all stages within the slip range and all
scarp types along with D-29 and D-31's fresh defaults. Switching
measurement tabs or chart views immediately changes the presentation
of the confirmed results; it does not require scenario confirmation
or apply draft edits.

**Accepted refinement presentation (D-35, 2026-11-04).** The later
refinement example opens the controls beneath the confirmed summary.
**Refine results** and **Hide refinements** expand or hide that
section. It labels editable controls **Draft choices** and reminds
the reader that the results change only after review. Population
and scarp-type controls sit beside one another when space permits
and stack in narrower windows.

The population explanation says that a simulation saves the ground's
shape as slip increases; each saved point is a stage with its own
measurements. It distinguishes exploring measurements throughout the
range from comparing the last recorded stage within it. That stage
can fall below the range's maximum. The selection can change counts,
chart shapes, medians, and percentiles.

**See how stages change the results** expands an example of one
simulation with three stages and invented heights. Changing the
population choice updates the included-stage indicators and example
median immediately, while actual displayed results retain confirmed
settings. The example explains that all stages gives more influence
to simulations with more measurements; last stage contributes at
most one per simulation. Neither guarantees larger or smaller
results. The example's numbers are illustrations, not sample data.

Each of the six scarp types has a checkbox, a short description, and
a schematic shape sketch. **Select all** is unchecked for none,
mixed for a subset, and checked for all. Selecting it from none or
some includes every type; clearing it leaves the draft empty.
On any attempt to review an empty scarp selection, open the section,
show **Select one or more scarp types before review.**, and focus
Select all. Choosing a type clears the error. The review actions
remain available for the attempt; they do not silently select types.

The unapplied-changes notice sits above the controls with **Return
to review** and **Discard changes**. **Review changes** also opens
review through the same validation. Review identifies the draft's
population and included types and offers **Edit refinements**, which
returns to the open controls and focuses the selected population.
**Back to results** preserves this draft and shows the confirmed
results. That return applies when reviewing an existing result;
the fresh journey still uses D-32's Back action. **Show results**
confirms the draft and returns to results.

This example demonstrates refinement confirmation, discard, and
presentation changes with invented records. Its site/movement edit
and download actions still show prototype-boundary notices. It
does not implement the complete fresh journey or validate real
scientific results. Sketches are schematic; the approved layout is
not a claim of research-group or accessibility certification.

**Illustrative data and prototype limits.** The results example
uses the same illustrative complete scenario as the review example.
Its counts, measurement arrays, chart shapes, and statistics are
invented. They are not research findings, approved sample values,
production calculation fixtures, or a replacement for scientific
algorithms. Switching measurements and chart views and adjusting the
percentile read-off demonstrate the presentation using those values.
Review, edit, and download actions show prototype-boundary notices;
they do not connect the separate examples or generate a result
package. Those notices and the invented-data label belong to the
review environment, not the product.

Empty results, small populations, zero valid measurements, field
comparisons, integrated retained-draft workflows, and actual downloads
remain beyond the accepted results example. D-35 supplies the later
refinement presentation. Neither approval establishes accessibility
or viewport acceptance.

**Earlier snapshot.** The original full-journey prototype showed
fixed illustrative charts with dashes for statistics, a **Your
scenario and result context** disclosure, a **Refine the analysis**
placeholder, and a **Download result** acknowledgement. That earlier
screen is historical. Use the later results example for D-33's
accepted first presentation; it does not authorize hiding required
context, statistics, or warnings in a disclosure.

## First implementation scope and later decisions

The owner has now authorized autonomous implementation on a separate
route. The implementing agent selected `/explore/`, leaving
`/scenario/` available. The authoritative
[PDD supplement](pdd.md#23-user-journeys) records the first-version
scope: no sample presets, import, or between-visit recovery; a fresh
scenario after reload; app-local step navigation; 0.1 m mouse steps;
and an offset shortcut using the smallest selected-angle coverage
limit rounded down to 0.01 m. These are agent-selected initial
implementation choices under that authorization, not earlier owner
decisions. Start new and discard retain the agreed behaviors.

The owner also requested contextual glossary and dashboard links.
Short hover help must also work through keyboard focus and touch;
essential instructions and warnings remain visible. The PDD records
these requirements without changing the existing copy registry or
accepted implementation task bodies. The owner requested the missing
floating explanations during the 2026-11-04 walkthrough, bringing
them into the candidate alongside the longer expandable help and
glossary links. Mouse hover, keyboard focus, and touch must all work.

The candidate implements the bounded journey in the
[guided design](guided-journey-ddd.md). Its
[execution record](guided-journey-ip.md#execution-evidence) distinguishes
actual checks from saved-example behavior and pending verification.
The implementation does not settle all later product choices:

1. **Guidance.** Explain how to choose site-condition values without
   recommending Select all as a substitute for understanding them.
   Resolve explanations, diagrams, and the worked-example inputs.
   D-35 supplies the initial refinement explanations. The PDD
   supplement fixes movement increments and shortcuts for the first
   separate-route version; later revisions may reconsider them.
2. **Entry and revision.** Define later returning-visit recovery,
   sample-input replacement, and restoration of an unfinished draft.
   The candidate starts afresh on return and retains the mode-switch,
   discard, and restart actions already decided by D-28 and D-29.
   D-37 and D-38 (2026-11-04) now define sample replacement and
   same-tab restoration; recovery between visits remains open and
   is queued in the next phase (PDD D-41, 2026-11-04).
3. **Presentation around results.** D-27, D-30, and D-32 define review,
   step navigation, and the unapplied-changes notice. D-33 places
   review and edit actions; D-34 includes refinements in the same
   draft. The candidate supplies the retained-draft notice and
   discard/restart actions. Define how later draft recovery and
   performance endpoints fit the revised journey. The saved examples
   do not establish those integrated flows' correctness.
4. **Complete results.** D-33 establishes a normal populated result's
   first presentation. The candidate retains the existing safeguards
   for empty results, small populations, and measurements with no
   valid values. Later presentation changes must preserve required
   context and warnings; the accepted example does not authorize
   hiding information that the PRD and PDD require to remain visible.
5. **Refinements and downloads.** D-34 and D-35 define the choices,
   activation, first layout, explanations, illustrations, validation,
   and focus. The candidate integrates those controls and real
   downloads from confirmed results. Define later chart alternatives
   and field comparison while retaining the scientific rules.
6. **Navigation and access.** The first separate-route version uses
   the PDD supplement's app-local navigation and fresh reload.
   Define later persistence and recovery, and verify keyboard
   focus, announcements, and ordinary laptop and narrow-window
   operation. The examples are not accessibility or viewport
   acceptance evidence.

The current decimal-validation requirements, conversion rules, and
scientific safeguards remain authoritative except for the explicit
product amendments recorded in the PDD. D-26–D-36 amend site-condition
and displacement defaults, result-update timing, mode preservation,
discard/restart behavior, step navigation, and movement-entry
feedback, review and results presentation, result refinements, and
optional guidance through results.
The additive [guided detailed design](guided-journey-ddd.md) and
[implementation plan](guided-journey-ip.md) now define the bounded
first implementation at `/explore/`. Fixed example values,
omitted controls, and simplified validation are not instructions to
change unrelated scientific rules or to treat remaining proposals
as agreed.

The additive plan records implementation and verification separately
from the accepted legacy tasks. Later product choices remain
separate. A realistic scenario walkthrough
should establish whether a new reader can complete the journey and
explain the results without being told which controls to operate.
