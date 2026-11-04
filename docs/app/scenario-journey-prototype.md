# Ground Rupture Explorer scenario journey prototype

**Review record: 2026-11-03. Selected version: Focused steps.**

This prototype shows how a reader can build a scenario before
exploring its results. It replaces the opening collection of filters
with a sequence that explains what to choose and why. The owner
approved the journey and introduction, liked the visual direction,
and selected **Focused steps** in the prototype review.

The journey, introduction, review variant, selection, review,
displacement-mode, restart, step-navigation, and movement-entry
decisions below are agreed. Other detailed interactions remain
proposals. The saved full-journey prototype is an earlier snapshot:
its unspecified-condition, displacement-default, and result-update
behavior is superseded by those decisions. The later component
examples capture the site-selection and movement-entry discussions.
None queries simulation records or calculates result distributions;
the movement example does calculate the illustrated conversion.
These examples do not replace the product definition or
implementation plan.

- [Earlier full-journey prototype](prototypes/scenario-journey.html).
- [Full-journey editable source](prototypes/scenario-journey.fragment.html).
- [Site-condition selection example](prototypes/site-condition-selection.html).
- [Site-selection editable source](prototypes/site-condition-selection.fragment.html).
- [Fault-movement entry example](prototypes/fault-movement-entry.html).
- [Movement-entry editable source](prototypes/fault-movement-entry.fragment.html).
- [Product definition and approved introduction](pdd.md#23-user-journeys).

Open the clickable HTML file in a browser. When viewing it on
GitHub, download the file first; the repository's source view does
not run it. The saved page includes the prototype and its controls,
with shared interface assets loaded from public content-delivery
networks. These pages are not offline bundles. The three examples
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

## Agreed interaction decisions — 2026-11-03

[PDD §2.3](pdd.md#23-user-journeys) records the authoritative product
definition in D-26–D-31.

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

Before an attempt to continue, an empty condition says **Choose
one or more values to continue**. Continue with missing selections
shows condition-specific errors and moves focus to the first
incomplete condition. A valid selection clears its error.

**Draft and confirmed scenarios (D-27).** Site-condition and
displacement edits remain a draft. They affect results only after
**Review scenario → Show results**, for both the first scenario
and subsequent revisions. Any retained
results and their summary remain associated with the previously
confirmed scenario. Their exact placement, browser navigation,
recovery, and when population and scarp-type refinements
take effect remain open.

**Displacement-mode entries (D-28).** The draft preserves fault-slip
minimum and maximum separately from the surface-offset maximum.
Switching back restores that mode's entries. Only the selected
mode contributes to validation for review, the reviewed scenario,
and its results. Switching does not silently convert or erase
entries, and does not update previously confirmed results.
Restarting follows D-29; sample replacement, returning visits,
and recovery remain open.

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
mode; inactive entries still do not contribute to results.
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
edits count as unapplied changes; merely visiting a step does not.
Restoring the confirmed entries removes the notice. Visiting results
never applies edits; no results are available before confirmation
or after **Start a new scenario**. Browser Back and Forward and
reload behavior remain open.

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
choices and replacement behavior still need a product decision;
do not silently fill them with all values.

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
agreed; 0.1 m is the demonstrated increment, not a separately
approved product rule.

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
all of them, then round downward so the shortcut itself does not
trigger partial coverage. The general rounding rule and this
multi-angle shortcut policy remain proposals; approval of the
single-angle example does not settle them.

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

The heading is **Review your scenario**. A row for each site
condition and for fault movement shows the draft choice, with an
**Edit** action. A completed draft has no unanswered site
conditions. The saved snapshot's explanation of unspecified
conditions is superseded by D-26 and must be removed when updated.

Editing a site condition returns to the site-conditions stage;
editing fault movement returns to its stage. The next action there
becomes **Return to review**. Other choices remain intact.

**How simulation stages are included** explains the current default:
all recorded stages within the chosen slip range. The saved
snapshot also describes all recorded stages when no range is set;
D-31 supersedes that fresh-journey path. The prototype mentions a
later result refinement for one state per trial but does not
implement it.

Under D-27, **Show results** confirms the reviewed valid draft and
opens its results. The saved snapshot labels this action **Explore
matching results** and does not model confirmation separately from
editing. No result is calculated by this prototype.

**Next review-screen proposal.** The next suggested design exercise
is a complete review screen with site-condition and fault-movement
summaries and Edit actions, converted slip windows for each selected
angle in offset mode, visible coverage warnings, a plain explanation
of the contributing simulation records, and one **Show results**
action. D-27 already defines confirmation and D-31 requires coverage
warnings on review. The new layout and remaining presentation
details have not been approved merely by recording this proposal.

## Stage 5 — Explore results

The heading is **Explore your scenario**, with the instruction:

> Read the range of simulated results, then change a condition to
> investigate a different scenario.

The reader can switch between **Scarp height**,
**Deformation-zone width**, and **Scarp dip**. Each view shows a
measurement explanation, an illustrative distribution, and places
for the median and 16th–84th percentile range. Numbers are left as
dashes. The chart shapes are fixed illustrations and do not respond
to the selected conditions.

The width view carries the main-rupture-zone limitation. The dip
view carries a provisional-data notice. The statistics framing says
that the summaries describe matching simulations and are not
recommended design values. This wording is proposed pending the
usual product and scientific-content review.

**Your scenario and result context** opens the scenario summary and
edit actions. **Refine the analysis** is a placeholder for population,
scarp-type filtering, chart views, and field comparisons.

**Change site conditions** and **Change fault movement** return to
the corresponding stage, followed by review. Under D-27 these are
draft edits until **Show results** confirms them. Any retained
results must continue to identify the previously confirmed scenario.
The saved snapshot does not model that distinction. **Download result**
only explains that the prototype has no calculated data to download.
It creates no result package.

## Choices still to resolve before implementation

The selected visual direction does not settle the following details:

1. **Guidance.** Explain how to choose site-condition values without
   recommending Select all as a substitute for understanding them.
   Resolve explanations, diagrams, and the worked-example inputs.
   Settle the movement-button increment and general offset-shortcut
   rounding and multi-angle policy described under D-31 above.
2. **Entry and revision.** Define returning visits,
   sample-input replacement, and the treatment of an unfinished
   draft outside the mode switches and discard/restart actions
   already decided by D-28 and D-29.
3. **Presentation around results.** D-27 and D-30 define review,
   step navigation, and the unapplied-changes notice. Define the
   placement of retained results and editing actions. Define how
   draft recovery and performance endpoints fit the revised journey.
   The saved snapshot does not model these flows.
4. **Complete results.** Place all required statistics, counts,
   population information, conversions, coverage flags, small and
   empty states, and warnings. Their absence or placement inside a
   disclosure in this mockup does not authorize hiding information
   that the PRD and PDD require to remain visible.
5. **Refinements and downloads.** Define the population and scarp-type
   controls, chart alternatives, field comparison, and real download
   experience while retaining the existing scientific rules.
6. **Navigation and access.** Define browser Back and Forward,
   persistence and recovery, keyboard focus and announcements, and
   behavior at ordinary laptop and narrow-window sizes. The saved
   prototype is not accessibility or viewport acceptance evidence.

The current decimal-validation requirements, conversion rules, and
scientific safeguards remain authoritative except for the explicit
product amendments recorded in the PDD. D-26–D-31 amend site-condition
and displacement defaults, result-update timing, mode preservation,
discard/restart behavior, step navigation, and movement-entry
feedback. The dependent design and implementation plan still need
revision. Fixed example values, omitted controls, and simplified
validation are not instructions to change unrelated scientific
rules or to treat remaining proposals as agreed.

After the remaining product choices are resolved, amend the PDD and
the dependent design and task bodies. A realistic scenario walkthrough
should establish whether a new reader can complete the journey and
explain the results without being told which controls to operate.
