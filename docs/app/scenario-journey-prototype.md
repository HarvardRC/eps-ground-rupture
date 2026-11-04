# Ground Rupture Explorer scenario journey prototype

**Review record: 2026-11-03. Selected version: Focused steps.**

This prototype shows how a reader can build a scenario before
exploring its results. It replaces the opening collection of filters
with a sequence that explains what to choose and why. The owner
approved the journey and introduction, liked the visual direction,
and selected **Focused steps** in the prototype review.

Except for the agreed journey, approved introduction, and selected
review variant, the detailed interactions below are proposals. The
prototype does not query simulation data, calculate results, or
replace the product definition and implementation plan.

- [Open the clickable prototype](prototypes/scenario-journey.html).
- [Editable prototype source](prototypes/scenario-journey.fragment.html).
- [Product definition and approved introduction](pdd.md#23-user-journeys).

Open the clickable HTML file in a browser. When viewing it on
GitHub, download the file first; the repository's source view does
not run it. The saved page includes the prototype and its controls,
with shared interface assets loaded from public content-delivery
networks. It is not an offline bundle.

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
stages are initially unavailable.

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

## Stage 2 — Site conditions

The heading is **Describe the site conditions**, followed by:

> Select the conditions you want to investigate. Include several
> possibilities when you are uncertain, or leave a condition
> unspecified.

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

In a fresh scenario, each condition starts with **Not specified —
include all** selected. Choosing individual values replaces that
state with the chosen subset. The reader can select several values.
Selecting **Not specified — include all** again clears the explicit
selection and includes all modeled values for that condition.

The prototype also returns to the unspecified state when the last
individual value is deselected. Unchecking the unspecified option
selects every individual value. These mechanics are observable in
the prototype but need a product decision before implementation.

**Continue to fault movement** advances to stage 3. **Back** returns
to the introduction. Selections remain available during the journey.

## Stage 3 — Fault movement

The heading is **Choose the assumed fault movement**, followed by:

> Describe the movement you want to investigate. This is an
> assumption for your scenario.

Two choices distinguish the quantities:

- **Fault movement at depth (slip):** “The distance the fault moves
  underground.” This is the initial mode and has **Minimum (m)**
  and **Maximum (m)** fields.
- **Vertical ground offset at the surface:** “An assumed vertical
  difference across the rupture.” This mode has **Maximum (m)**.

For slip, both fields blank means all recorded stages. A maximum
alone means zero to that maximum. A minimum alone means that value
through the recorded maximum. For surface offset, a maximum is
required and represents zero to the entered maximum.

The prototype checks for negative or invalid values, a maximum
below the minimum, and slip beyond its fixed example limit of
5.0135 m. Messages appear beside the fields. **Review your scenario**
advances only when these checks pass. The example limit and these
simplified checks are not replacements for the existing rules for
data-dependent ranges, decimal input, normalization, or coverage.

**What does this choice mean?** opens an explanation that fault slip
and vertical surface offset differ, and that surface-offset entry
uses a research relationship to find corresponding fault slip. The
prototype does not calculate that conversion or its coverage flags.

Switching modes currently clears both displacement fields. That is
a prototype behavior requiring an explicit decision, not an agreed
rule for preserving or discarding a reader's entries.

## Stage 4 — Review scenario

The heading is **Review your scenario**. A row for each site
condition and for fault movement shows the current choice, with an
**Edit** action. Unspecified conditions are explicitly identified.

The review explains:

> Unspecified conditions include every modeled value for that
> condition. They do not mean the site has been characterized.

Editing a site condition returns to the site-conditions stage;
editing fault movement returns to its stage. The next action there
becomes **Return to review**. Other choices remain intact.

**How simulation stages are included** explains the current default:
all recorded stages within the chosen slip range, or all recorded
stages when no range is set. The prototype mentions a later result
refinement for one state per trial but does not implement it.

**Explore matching results** opens stage 5. No result is calculated
by this prototype when that action is used.

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
the corresponding stage, followed by review. **Download result**
only explains that the prototype has no calculated data to download.
It creates no result package.

## Choices still to resolve before implementation

The selected visual direction does not settle the following details:

1. **Unspecified conditions.** Confirm the distinction between
   unknown conditions, explicitly including all values, and selecting
   no values. Resolve what happens when the last value is removed.
2. **Entry and revision.** Define first visits, returning visits,
   reset, sample-input replacement, preservation of entries when
   changing modes, and how uncertainty is explained.
3. **When results change.** Define when a draft scenario becomes the
   active scenario, whether updates require review, and how retained
   results are labeled after edits. The prototype permits shortcuts
   to previously reached stages and does not model stale results.
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

The current numeric defaults, decimal-validation requirements,
conversion rules, and scientific safeguards remain authoritative
until amended in the product and design documents. The fixed sample
values, omitted controls, and simplified validation here are not
instructions to change them.

After the remaining product choices are resolved, amend the PDD and
the dependent design and task bodies. A realistic scenario walkthrough
should establish whether a new reader can complete the journey and
explain the results without being told which controls to operate.
