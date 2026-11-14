# ADR-0021: Explaining sediment-profile coverage and contribution

- **Status:** Accepted, 2026-11-14, for the first official release,
  0.4.0.
- **Decider:** the product owner.
- **History:** proposed 2026-11-13 as 1B + 2A; expanded 2026-11-14
  with a recommendation of 1F + 2D and the research background.
  After the tough review and discussion, the owner chose 1F + 2B
  on 2026-11-14. The alternatives below explain that choice.
- **Authority:** the owner's direction to use 1F + 2B in 0.4.0,
  address the tough review, and defer new experiments and further
  selection guidance until after that release. PDD D-56 records the
  corresponding product decision.

## Summary

The explorer lets a reader choose nine sediment profiles. Two have
simulations for only a few combinations of fault angle, sediment depth
and density. A reader can select one, see it named in the scenario,
and never learn that none of its simulations reached the results.
A profile can also be represented for only part of the chosen range.

**For 0.4.0, use 1F + 2B.** Put stable, data-derived availability notes
beside the limited profiles. At review, distinguish the reader's
selected conditions from the available models. In confirmed results
and downloads, distinguish those selections from the profiles and
conditions actually represented. Keep all profiles and every explicit
selection. A limitation of the data is not an invalid geological
assumption.

The notes describe the loaded release and stay unchanged as inputs
change. They appear beside the two limited profiles in data-v1,
including when those profiles are unselected. The other seven need
no availability note. This gives early information without adding
live profile-status updates to the site step. The existing PNG
caption strip is also qualified; all its current fields remain.

The decision releases only the sediment-profile item in D-55's hold:
the release data and the group's 2026-11-06 answer establish the
availability facts. Assembled wording still follows D-51 and the
existing scientific-text sign-off for 0.4.0. Illustrations in this ADR
are not a separately approved copy deck.

New experiments and further guidance are post-0.4.0 work. The owner's
inclination is to investigate explicit, optional adjustment actions
(2G), or simulation counts (2F), with the research group. Neither is
accepted for implementation; 2D is not the default next step.

## Context and evidence

### Coverage verified in data-v1 on 2026-11-13

There are 63 combinations of the seven modeled fault angles
(20, 30, 40, 45, 50, 60 and 70 degrees), three sediment depths
(3, 5 and 10 m) and three densities (Loose, Medium and Dense).
Seven profiles have simulations in all 63 combinations.

| Profile | Combinations with simulations |
|---|---|
| Random Heterogeneous | Dense, 10 m, at all seven angles: 7 combinations |
| Alternating Strong-Weak | Dense, 10 m, at 20, 40 and 60 degrees: 3 combinations |

The research group's answer of 2026-11-06 identifies the Dense/10 m
limits. The [Response curves page](../../subprojects/mkdocs/docs/dashboards/response-curves.md)
also states the angle restriction. The [verification note](../../notes/site-review-2026-11-13.md#verification-note-planning-session-2026-11-13)
checks these facts against the published data release. Display names
for the profiles remain a separate question for the research group.

**Observed example.** Choose 45 degrees, 10 m, Dense, Uniform Strong
and Alternating Strong-Weak, with fault slip from 0 to 5 m. The result
contains 1,200 matching stages and 1,164 scarp-height measurements,
exactly as for Uniform Strong alone, as the review's
[verification note](../../notes/site-review-2026-11-13.md#verification-note-planning-session-2026-11-13) records.
The entered 0–5 m range is not the entire modeled slip range; the data
extends to 5.0135 m. Every scenario summary in that checked version
names both profiles. A [stage](../../subprojects/mkdocs/docs/glossary.md#model-stage)
is one saved point as movement accumulates in a simulation.

**Partial example.** Choose angles from 40 to 45 degrees, Dense and
10 m. Alternating Strong-Weak has simulations at 40 degrees but not
45 degrees; Uniform Strong has both. Saying only that both profiles
contribute hides this difference. The range selects the modeled
values 40 and 45; it does not imply simulations at every intervening
angle. Pooling these records also does not make the profiles a
comparison over identical conditions.

**Possible selections, not observed usage.** The site controls allow
1,176 combinations: 28 angle ranges, 6 depth ranges and 7 nonempty
sets of densities. Giving each combination equal weight produces:

| Profile | No combinations covered | Some covered | All covered |
|---|---:|---:|---:|
| Random Heterogeneous | 840 (71.4%) | 308 (26.2%) | 28 (2.4%) |
| Alternating Strong-Weak | 900 (76.5%) | 273 (23.2%) | 3 (0.3%) |

These figures show the extent of the limitation across possible
contiguous ranges. Restored scenarios may retain sets with gaps under
D-50; assess their actual stored values, not every stop between the
extremes. The table does not count those additional possibilities.
The percentages are neither probabilities nor observed reader usage.

Both limited profiles would show a 2D status for 1,148 of these
1,176 selections (97.6%). This means the two messages usually occupy
space, not that most of the nine profile choices are affected.
A changing message can still distinguish no models from some models.
However, both 2B and 2D attach the explanation to the checkbox, and
these two simple restrictions do not establish a need for live text.
The owner chose 2B's simpler interaction for 0.4.0.

### Why these gaps exist

The restrictions originate in the supplied simulation experiments.
The 2026-11-14 check found the same coverage in the raw
`DEM_dataset.csv` and the exported data: 9 Alternating Strong-Weak
trials across 3 site-condition combinations, and 210 Random
Heterogeneous trials across 7 combinations. The
[loader](../../subprojects/python/src/eps_ground_rupture/io.py)
reads the supplied measurements, and the
[preparation module](../../subprojects/python/src/eps_ground_rupture/prep.py)
records that DEM needs no pipeline-side cleaning. The pipeline has
not removed the missing combinations. This repository processes
existing experiment outputs; it does not run the original simulator
([input dataset description](../datasets.md#dem-trials-dem_datasetcsv)).

The [paper's Methods section](https://journals.sagepub.com/doi/10.1177/87552930251346434)
explicitly describes the restricted random and alternating experiment
sets, including their 210 and 9 experiments. The study combines
several sets with different scopes; it does not supply every profile
at every combination of conditions.

**The reason for choosing these particular limits remains unknown.**
The paper reports approximately 20,000 CPU hours and 27 TB of output
for the whole study, so computing cost is a plausible consideration.
It does not establish that cost caused these specific restrictions.
That explanation is an inference for the researchers to confirm,
not an established fact. The checks also do not establish whether
additional, unpublished or separately archived experiments exist.

### What filling the gaps would require

After 0.4.0, first inspect the published DesignSafe archives for
[homogeneous experiments](https://doi.org/10.17603/ds2-xpq0-gw80) and
[heterogeneous experiments](https://doi.org/10.17603/ds2-gfsj-pp60),
which the paper identifies as the archive of the study's outputs.
Check their inventory before asking the group whether additional runs
exist elsewhere or remain unpublished. An archive inventory has not
been completed for this ADR; public availability does not prove that
it contains experiments beyond those described in the paper. Any
additional outputs would need validation before import. Otherwise,
an extension would require a research effort:

1. **Define the additional experiments.** Choose which conditions
   matter and how to construct the profiles. The existing random
   profiles use ten one-metre layers. Extending them to 3 m or 5 m
   requires a scientific decision about the shorter layer sequences;
   it is not just a change to a depth field.
2. **Run and check the simulations.** Establish the compatible
   PFC2D software, scripts, parameters and computing environment.
   The linked [model-code repository](https://github.com/kchiama/DEM_PFC2D_models)
   accompanies the 2023 BSSA study's 45 homogeneous trials; its
   automation is `homogenous.py`, and PFC2D requires an Itasca licence
   for models of this size. It is background, not the verified
   random/alternating workflow. Locate the appropriate scripts and
   reproduce an existing case before relying on newly generated ones.
3. **Extract and validate the measurements.** Apply the approved
   measurement procedure, check the outputs and their comparability
   with the existing data, and retain their scientific provenance.
   Adding combinations changes the composition of pooled results;
   it does not by itself establish equal representation or greater
   confidence in those results.
4. **Publish an expanded data release.** Ingest the approved outputs,
   update dataset-specific checks, regenerate exports and reference
   results, and check calculation agreement, download size and browser
   performance. Publish a new immutable release under
   [ADR-0019](0019-release-based-data-identity.md), then update the
   application's data selection. Preserve the existing release.

The current format also requires the same number of recorded stages
in every trial within a release. If the new runs do not satisfy that
contract, their representation needs a separate design decision under
[ADR-0018](0018-manifest-defined-stage-count.md). The exporter must not
pad or interpolate records to make them fit. More generally, estimating
missing cases by interpolation would introduce a separate scientific
method needing validation and clear labeling; it would not supply
the missing experiments.

### Conditional size of an experiment extension

The raw trial identities checked on 2026-11-14 show three
[starting fault-tip configurations](../../subprojects/mkdocs/docs/glossary.md#fault-seed)
for each existing Alternating combination. Each Random combination
has ten layer-strength arrangements, each with those three
configurations. Keeping that pattern gives the following counts:

| Extension | Calculation | Additional runs |
|---|---|---:|
| Alternating: add 30°, 45°, 50° and 70°, still Dense/10 m | 4 missing angles × 3 configurations | 12 |
| Alternating: cover all 63 existing site-condition combinations | (63 − 3) × 3 configurations | 180 |
| Random: cover all 63 existing site-condition combinations | (63 − 7) × 10 arrangements × 3 configurations | 1,680 |

These are conditional experiment counts, not approved scientific
requirements or estimates of elapsed time, staff effort or cost.
The Random count assumes ten suitable arrangements can be defined
for each new depth and density. The full extension of both profiles
would be 1,860 additional runs; the 12-run angle extension is already
included in the 180-run Alternating total and must not be added again.
Completing this grid would cover only the existing modeled values,
not every possible angle, depth or density.

**Possible first investigation:** discuss the 12-run angle extension
with the research group, after checking for existing outputs and the
reason for the original limits. It is a bounded candidate for extending
the data, not a commitment to run it or a substitute for choosing the
scientifically useful questions. Resource estimates would need the
actual execution environment and output-retention requirements.

This background does not make new experiments a prerequisite of the
interface correction. Coverage explanations remain necessary for the
current release and for any future release with different limits.
Acceptance of this ADR's presentation approach does not authorize an
experiment campaign or change the scientific dataset. The archive and
research questions are routed through
[briefing question 8](../../notes/research-group-questions.md#8-what-do-the-specialist-sediment-labels-mean)
as follow-up after 0.4.0.

### Reader needs and assumptions

The [PRD personas](../app/prd.md#3-users-and-personas) and the
[PDD's guided journey](../app/pdd.md#23-user-journeys)
include readers who know the site or engineering question but are
unfamiliar with the simulation collection. They need to understand
whether the available evidence addresses their question. A reader
who knows the dataset may instead want to inspect its limits or
reproduce a result from a download. These are needs within the
existing personas, not newly established user groups.

Both 2B and 2D place the explanation beside the choice. That placement
helps associate the text with the profile, but does not establish an
advantage for changing text. The extra benefit of 2D would be making
the comparison with the reader's inputs automatically; that benefit
has not been measured. Stable notes also occupy space, so their phone
layout must keep profile definitions and availability distinct.

### Existing behavior and decisions

The site step offers every profile equally. Summaries repeat the
request. The existing empty-result explanation runs only when the
whole result is empty, so one contributing profile hides the absence
of another. The download records requested settings; its records CSV
reveals the actual stages, but requires readers to inspect the data.

The following decisions still apply:

- [D-55](../app/pdd.md#1-decision-register) held sediment-profile
  coverage "for the group's answers, not shipped". The 2026-11-14
  amendment and D-56 release this item for 0.4.0 because the group's
  2026-11-06 answer plus the verified release data establish the
  facts, including the angle restriction. The remaining group role
  for this correction is sight of assembled strings under D-51 and
  the standing text approval process. Other D-55 holds remain.
- D-14 already fixes the shipped PNG caption strip and provenance
  sidecar. Its 2026-11-14 amendment adds the requested/represented
  qualification, preserving the existing fields. PDD §6.3 records
  that product change; guided DDD §16 must carry it into the design.
- [D-51](../app/pdd.md#1-decision-register) uses the research group's
  wording. Text assembled from its answers is identified as such
  and returned to the group for sight. The known coverage facts do
  not need another broad scientific question; display names and
  interpretation remain separate from factual availability.
- [D-26 and D-50](../app/pdd.md#1-decision-register) preserve Select
  all and the modeled-value range controls, including restored sets
  with gaps. D-51's adopted "If unknown, select all" hint remains.
  A broad selection asks for every profile; it does not promise that
  every profile exists for every selected combination.
- [D-47](../app/pdd.md#1-decision-register) keeps progression buttons
  enabled and explains missing required inputs. It is not a general
  prohibition on every availability-aware control. The
  [state rules](../app/guided-journey-ddd.md#2-state-and-pure-module-interface)
  do forbid silently substituting or filling selections.
- The [review design](../app/guided-journey-ddd.md#3-transitions-and-validation-display)
  does not calculate result counts as a preview. Results are
  calculated at Show results. A contribution preview would be a
  further design change, not a free consequence of this ADR.
- [ADR-0020](0020-parallel-guided-explorer.md) keeps `/scenario/`
  alongside `/explore/`. This decision changes the guided explorer
  only; shared calculations and the older page retain their behavior.

## What the explanation must distinguish

### Available models, matching stages and usable measurements

These are three different questions:

1. **Model availability:** does the loaded data release contain a
   simulation for this profile at these site conditions? This is
   independent of the movement range and result refinements.
2. **Result contribution:** do any stages from this profile remain
   after applying the confirmed movement range, stage-selection rule
   and scarp-type filter? Available simulations may contribute none.
3. **Measurement availability:** do those stages contain a recorded
   value for the measurement being shown? A profile can contribute
   stages but no usable scarp heights, widths or dips.

An absent measurement must not be called an absent simulation. A
profile excluded by the reader's filters must not be described as
unmodeled. If several restrictions act together, the explanation must
not invent one sole cause.

The site step explains general model availability; review explains
availability for the selected site conditions. Actual contribution
belongs to the confirmed results and downloads.
The accepted scope keeps result calculation at Show results;
review does not promise that an available profile will contribute.
Measurement-specific counts retain their existing meaning. Any later
per-profile counts must identify which measurement they concern.
Profile wording uses "availability" to distinguish it from the
existing movement/offset conversion coverage. Review already shows
per-angle conversion messages, including no matching stages for an
angle; the new explanation must identify its profile/site-condition
scope and must not contradict or impersonate those messages.

### Whole combinations, not independent lists

Coverage concerns combinations of angle, depth and density together.
A future release might contain one profile at 20 degrees/10 m and at
40 degrees/5 m, without containing either crossed combination.
Listing both angles and both depths as independently available would
be false. Derive the assessment from the actual combinations in the
loaded release. Use an exact list or table when a short sentence
cannot describe the pattern honestly.

Full coverage means that each selected combination of modeled values
has a simulation for that profile. It does not mean equal numbers of
simulations, equal representation in pooled results, coverage between
modeled values, or a guarantee about a real site.

### Unanswered choices and confirmed results

An unanswered condition is not the same as Select all or no matching
models. Under 2B, general release limits are shown immediately and stay
fixed during selection. Scenario-specific availability is explained at
review after required inputs are complete. If live statuses are ever
adopted later, their incomplete-input behavior needs its own design.
The availability notes do not change required-input rules.

The site step and review describe the draft. Results, chart captions
and downloads describe the confirmed scenario that produced them.
Editing a draft must not change the explanation attached to an older
result that remains visible.

## Decision criteria

Every acceptable approach must:

- Distinguish requested conditions from evidence actually represented.
- Explain zero and partial availability, including joint conditions.
- Preserve explicit choices unless the reader knowingly changes them.
- Follow the selected data release without hard-coded profile limits.
- Give an equivalent explanation on screen and in saved results.
- Work with keyboard and assistive technology and at 320 px width.

The comparison also weighs when readers learn, how easily they can
act, visual space, risk of suggesting scientifically preferable
choices, implementation effort and maintenance. Early explanation is
an important benefit, not a claim that all later-only approaches are
invalid. Conversely, preserving choices does not require pretending
that every selected profile contributes.

The effort comparisons below are qualitative. Exact sentence counts
and task estimates are not yet justified. Every interactive option
needs checks for focus, slider behavior and announcements; those are
not disadvantages unique to one layout.

## Part 1: at review and in confirmed results

Options 1A, 1B, 1C and 1F change presentation. Options 1D and 1E also
change what readers may ask and therefore affect the whole journey.

### 1A. Keep the current summaries

Continue listing requested profiles without explaining representation.

- **Advantages:** no new interface, copy or implementation work;
  settings remain an accurate record of the request.
- **Disadvantages:** readers cannot tell that a selected profile
  supplied nothing, or only part of the requested conditions.
  Downloads require inspecting the records to discover the gap.
- **Assessment:** does not address the problem. Accurate settings
  alone are insufficient as an explanation of a result.

### 1B. Add explanatory notices to the existing summaries

Keep the existing summary and add a notice for selected profiles
with no or partial model availability. On results and downloads,
also identify profiles with models but no matching stages.

- **Advantages:** a contained correction using familiar notice
  styling; preserves the current layout; can describe precise
  limitations and carry the same facts into downloads.
- **Disadvantages:** the summary still needs an explicit label such
  as Selected profiles. Otherwise the notice has to correct an
  impression created by the summary itself. Notices can be skimmed,
  compete with other caveats, or look like input errors. A separate
  notice repeated across many surfaces increases visual repetition.
- **Assessment:** a sound minimum correction, especially with an
  early signal. It is not the only truthful solution, and adding a
  notice does not by itself make every caption unambiguous.

### 1C. Show a per-profile contribution table

In confirmed results, list each selected profile with its matching
stage count, represented conditions and reason for any absence.
If measurement counts are included, distinguish them from stages.
Review can show available conditions, but not result counts without
changing the existing review contract.

- **Advantages:** direct, auditable and useful when several profiles
  are pooled; a reader can inspect exactly what each supplied. A
  table with conditions and explanations can handle partial coverage
  fully; it need not be a table of unexplained zeros.
- **Disadvantages:** numbers can dominate the result or be mistaken
  for scientific importance. Counts alone do not explain absence.
  More columns require a stacked phone layout, and separate valid
  counts for three measurements can become dense.
- **Assessment:** a credible primary presentation for analytical
  readers, or detail beneath 1B/1F. It adds aggregation and layout
  work. A counts-only version is an inadequate replacement for an
  explanation; a well-explained version can meet the criteria.

### 1D. Constrain the choices to combinations with simulations

These variants have materially different consequences:

- **Hide or silently clear incompatible choices.** This produces
  tidier selections but hides the dataset's limits and changes the
  reader's question. Silent clearing conflicts with the state rules.
- **Prevent a new unavailable selection, with an explanation.** This
  avoids knowingly adding an empty profile. It can remain discoverable
  and understandable, but needs a separate rule for a profile that
  was selected before another condition changed. It also changes
  Select all and restored-scenario behavior.
- **Choose profiles first, then restrict other conditions.** This
  makes available combinations easier to find, but starts with an
  unfamiliar question and may prevent readers describing their site.
  Multiple profiles need a policy: require conditions shared by all,
  or allow conditions available for any one of them? Either choice
  changes the question the interface supports.

Disabled controls are not inherently inaccessible. Native disabled
controls usually leave the tab sequence; discoverability and an
accessible explanation need deliberate design. W3C discusses this
trade-off in [Focusability of disabled controls](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/#focusabilityofdisabledcontrols).
That is a design obligation, not grounds to dismiss the whole option.
Constraining selections would also require revisiting D-26's Select
all contract and D-50's range controls. For example, exactly 20, 40
and 60 degrees cannot be entered as one contiguous thumb range.
Those product amendments are outside the accepted 0.4.0 correction.

- **Advantages:** less opportunity to select a profile that cannot
  supply data; potentially efficient for exploring only what exists.
- **Disadvantages:** can confuse a limit of this dataset with an
  impossible geological condition. Partial coverage, edits and several
  selected profiles make the policy more complex. Even full model
  availability cannot prevent later filters from excluding a profile.
- **Assessment:** explained constraints are a genuine product option,
  not categorically forbidden by D-47. They fit a dataset-browsing
  workflow better than the current site-first journey. They do not
  remove the need to describe actual result contribution.

### 1E. Remove the two limited profiles

Offer seven profiles instead of nine. For the present release, this
removes 219 of 3,434 simulations and 22,119 of 346,834 stages from
exploration through this page.

- **Advantages:** the remaining model grid is complete for current
  site controls; the first-use explanation becomes simpler.
- **Disadvantages:** hides useful published experiments, differs from
  the dashboards, and needs a policy for saved scenarios and samples.
  Later filters can still remove a profile from a result. Another
  incomplete profile in a future release reintroduces the problem.
- **Assessment:** defensible only as an explicit scope decision about
  which scientific questions this explorer serves. It is a substantial
  product/content change, not merely a small interface fix.

### 1F. Make the distinction part of the normal summary

Keep the reader's requested profiles visible as selections. Alongside
that request, show what the release can represent at review, and what
the confirmed result actually represents on results and in downloads.
Explain absent or partially represented profiles beside their names,
with the relevant conditions. Avoid duplicating the whole scenario.

Illustrative result structure for the 45-degree example, not approved
reader-facing copy:

```text
Selected profiles
  Uniform: Strong; Layered: Alternating Strong-Weak

Profiles represented in these results
  Uniform: Strong

Alternating Strong-Weak has no simulations for these site
conditions in this data release. Your selection has been kept.
```

Illustrative partial-case review for Dense sediment, 10 m deep:

```text
Selected conditions
  Fault angles: 40° and 45°; depth: 10 m; density: Dense
  Profiles: Uniform: Strong; Layered: Alternating Strong-Weak

Available models for these conditions
  Uniform: Strong — at 40° and 45°
  Layered: Alternating Strong-Weak — at 40°; none at 45°
```

This reports available models, not a preview of result contribution.
After confirmation, the result describes stages surviving the filters;
for each measurement it distinguishes stages from usable values. A
bare list of two represented profiles is insufficient in a partial
case. A compact list or table of represented conditions is part of
1F, borrowing 1C's presentation when helpful; it does not introduce
1C's optional numerical contribution table or result-count preview.

These sketches use the current summary-style profile names. Checkbox
labels live under the Uniform sediment / Layered sediment subheadings;
the new notes sit beside the affected choices in the Layered group.
Shared download tokens use a different form. The PDD copy record and
detailed design must fix the form for each guided surface, without
renaming the profiles or altering shared `/scenario/` wording.

- **Advantages:** the normal summary communicates the distinction;
  a reader need not reconcile a generic label with a separate warning.
  It works for empty and partial cases and gives saved results an
  intelligible account of both intent and evidence. Counts can remain
  optional detail instead of dominating the page.
- **Disadvantages:** more summary structure and wording; poor layout
  could repeat every selection twice. Review and results need
  different labels because available models are not yet matching
  stages. The PNG's existing caption strip needs a legible form.
- **Assessment:** accepted for 0.4.0. It addresses the misleading mental
  model directly, while retaining the scenario and existing query.
  It still needs an early explanation to guide scenario construction.

### Comparison for part 1

| Option | Main benefit | Main cost or limitation |
|---|---|---|
| 1A Current summaries | No change | Leaves the problem unresolved |
| 1B Notices | Contained correction | Depends on noticing and interpreting a separate message |
| 1C Explained table | Precise contribution detail | More numbers and layout; counts need result calculation |
| 1D Constraints | Avoids some unsupported selections | Changes the workflow; filters can still remove profiles |
| 1E Remove profiles | Simpler current model grid | Reduces scientific scope; not a durable general solution |
| 1F Integrated summary | Clear distinction between request and evidence | More presentation work across summaries and exports |

1B, an explanatory 1C and 1F can all meet the criteria. The preference
for 1F is the owner's product judgment about clarity, not a claim
that the other presentations are infeasible.

## Part 2: while the reader chooses

Early feedback complements result explanations; it cannot replace
them because later filters may change contribution. The options below
can accompany 1B, 1C or 1F. They concern model availability only.

### 2A. Leave the site step unchanged

- **Advantages:** least interface work; no additional text competing
  with explanations of the profiles.
- **Disadvantages:** known limitations surface late, requiring readers
  to revisit completed steps. A correction at review may be enough
  for an experienced user but offers little guidance during setup.
- **Assessment:** a reasonable staged delivery if effort is tightly
  limited, but not the preferred finished journey. There is no usage
  evidence establishing that readers do not need earlier information.

### 2B. State general limits beside each limited profile

A stable note describes where the profile exists in the current
release, independent of the reader's selections. It can include all
three dimensions: for example, Dense, 10 m, at 20, 40 and 60 degrees.
Generate it from the data; do not hard-code today's limits.

- **Advantages:** early and predictable; works before other conditions
  are answered; no changing status during interaction. Particularly
  suitable when only two profiles have short, simple restrictions.
- **Disadvantages:** the reader must compare the limits with their
  selections. It remains visible when all selected conditions fit.
  More irregular future coverage may need expandable detail.
- **Assessment:** accepted for 0.4.0. Its limitation is the comparison
  burden, not an inability to mention angles or partial availability.
  A manually maintained note risks becoming stale and is not accepted.
  Notes are derived from the release, not updated as inputs change.

The adopted "If unknown, select all" hint still applies. The notes
explain the dataset's limits without suggesting the reader made a
mistake by following that hint. Selecting all keeps every value;
review and results then identify partial availability/representation.
A single note near the hint naming both limited profiles was also
considered. The accepted placement is beside the affected profiles,
so it does not require readers to locate names in a group paragraph.

### 2C. One live explanation beneath the profile group

Once site conditions are answered, summarize zero or partial
availability among selected profiles. Update after an interaction,
without interrupting slider movement or moving focus.

- **Advantages:** compact when few profiles are affected; one place to
  read the explanation; can name exact limitations and point to detail.
- **Disadvantages:** a distant message can be harder to associate with
  its checkbox. Several limitations can turn the single line into a
  long paragraph. A selected-only message does not inform the reader
  about an unselected profile until they choose it.
- **Assessment:** a viable compromise. It can meet the same semantic
  requirements as 2D. Its space advantage depends on message length,
  not simply on having one message container.

### 2D. A short status beside each affected profile

Once site conditions are answered, place a short text status beside
profiles with no or partial availability, whether selected or not.
Provide the exact affected conditions in associated detail. Fully
covered profiles do not need repetitive positive badges. Before site
conditions are complete, offer the general release limits instead of
claiming that an unanswered choice has no simulations.

- **Advantages:** makes the comparison with current inputs for the
  reader, distinguishing no models from some models. Like 2B, it can
  attach the explanation to the choice; placement is not a benefit
  unique to 2D.
- **Disadvantages:** extra vertical space, particularly on a phone;
  a wall of badges could obscure profile meanings. Status and checkbox
  selection must remain visually distinct. Poor update behavior can
  shift controls or produce repeated announcements.
- **Assessment:** not selected for 0.4.0. Both limited profiles would
  usually retain a status; changing its meaning can help, but there
  is no demonstrated benefit sufficient to justify the extra site-step
  behavior for these two short restrictions. Future evaluation must
  compare it with 2G/2F, not assume it follows 2B automatically.

The range controls already announce their selections. A future live
availability design must coordinate with those announcements, specify
how cleared statuses are announced, and avoid repeated speech during
a drag. Neither sample selects a limited profile, yet 2D would show
statuses beside both unselected profiles alongside sample annotations.
These effects, the phone layout and the risk of steering readers away
from legitimate assumptions need prototype evaluation before adoption.

Review/result/report text required by 1F is a cost of either package.
Only new site-step status variants and their update behavior are extra
2D costs. Moving from 2B to 2D later would still require design and
verification work; it is an option, not a cost-free upgrade.

If 2C or 2D is adopted later, changed status must be available to
assistive technology without stealing focus. W3C's [status-message guidance](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)
explains both this need and the risk of unnecessarily interrupting
users. Check clearing messages as well as adding them; avoid announcing
all intermediate slider positions. This is not a reason to withhold
visible explanations until review; 0.4.0 uses stable notes instead.

### 2E. Offer a reference view of available combinations

Provide expandable, data-derived detail showing the actual combinations
for a profile. Group repeated values so it need not be a 63-cell grid.

- **Advantages:** exact, inspectable and useful for readers exploring
  the dataset; can explain irregular future coverage without forcing
  it into a misleading sentence. Complements 2B, 2C or 2D.
- **Disadvantages:** opening it takes an extra action; as the only
  signal it is easy to miss. The reader still has to compare the
  reference with their own choices unless those are identified too.
- **Assessment:** useful supporting detail, not a sufficient sole
  explanation of a selected profile's absence.

### 2F. Show available simulation counts beside profiles

Show the number of distinct simulations matching the site conditions.
These are not counts of stages or predictions of the final result.

- **Advantages:** a clear zero and a way to inspect the dataset's
  composition. Counting trial records is simpler than previewing the
  final query; it is not inherently an expensive operation.
- **Disadvantages:** counts do not explain which conditions are
  missing or why. Larger counts can imply greater importance or
  confidence: at 45 degrees, Dense and 10 m, Random Heterogeneous
  has 30 simulations while Uniform Strong has 12. The numbers alone
  justify neither interpretation. They also add changing text.
- **Assessment:** useful optional detail, but weaker guidance than
  stating availability directly. It needs explicit count definitions
  and approval as a preview, even if no result query is run.

### 2G. Offer an explicit action to explore available conditions

Show the limits, then offer an optional action that previews changes
to angle, depth or density and applies them only if the reader agrees.
An ordinary Edit link is a smaller variant: it moves to the relevant
condition and changes nothing automatically.

- **Advantages:** turns an explanation into a possible next step;
  preserves agency when changes are explicit; useful to readers whose
  purpose is exploring the model collection rather than a known site.
- **Disadvantages:** can encourage changing geological assumptions
  merely to obtain a result. Several profiles may have incompatible
  limits; there is no neutral automatic choice of which to favor.
  Some sets, such as exactly 20, 40 and 60 degrees, cannot be expressed
  by the current continuous range of modeled angle stops without also
  selecting intervening stops. Undo and confirmation add complexity.
- **Assessment:** worth considering for a future dataset-exploration
  workflow. Start with ordinary editing and exact explanations; do
  not introduce an automatic repair policy in this correction.

### Comparison for part 2

| Option | Helps before selection? | Main burden |
|---|---|---|
| 2A No early explanation | No | Late surprise and backtracking |
| 2B General limits | Yes, even before other inputs | Reader compares limits with choices |
| 2C Group message | After an affected profile is selected | Associates a combined message with individual choices |
| 2D Per-profile status | Yes, once conditions are known | More space; careful update behavior |
| 2E Reference view | If opened | Extra action and interpretation |
| 2F Counts | Once conditions are known | Numbers need explanations and careful interpretation |
| 2G Explicit adjustment | After a limitation is identified | Changes the question; policy needed for competing choices |

## Decision for 0.4.0

The owner accepted the following on 2026-11-14 for the first official
release. The priority is completing 0.4.0 within this scope.

1. **1F: integrate the distinction into review and results.** Review
   names selected profiles and their available site conditions, without
   calculating result counts. Confirmed results distinguish the request
   from actual representation after filtering, including zero and
   partial cases and missing measurement values where relevant.
2. **2B: stable availability notes at selection.** Derive general
   limits from the loaded release and place them beside each limited
   profile, selected or not. Notes stay fixed while the reader changes
   inputs; they do not turn into live none/partial statuses. Keep a
   neutral explanatory treatment on fresh, restored and sample drafts.
3. **Keep all profiles and explicit selections.** Select all includes
   every value, and the adopted uncertainty hint stays. No clearing,
   hiding, disabling, reordering, profile-specific live counts or
   automatic adjustment is introduced. Existing editing remains.
4. **Qualify all saved results, including the PNG itself.** Retain
   D-14's existing caption strip and sidecar. Label scenario settings
   as requested and add a visible representation qualification when
   needed, specific to the plotted measurement. Preserve the product,
   measurement, counts, versions, citation, licence, accuracy and
   caveat fields. Record full details in the report and provenance.
   This explicitly amends D-14 / PDD §6.3 and requires the corresponding
   guided DDD §16 update; the old strip was never just a sidecar.
5. **Release the profile-availability part of D-55.** Record that its
   stated need for the group's answers is satisfied by the supplied
   answer and verified release data. Route assembled copy for the
   group's sight under D-51 and the existing 0.4.0 text approval. This
   decision does not release other held scientific changes.
6. **Preserve scientific calculations and `/scenario/`.** Use loaded
   simulation records for availability and the actual confirmed query
   for contribution. No new simulations, inferred records, changed
   weights, query rules or shared-page wording are part of this work.

This chooses 1F over 1A, 1B and a counts-first 1C. Options 1D and 1E
are not adopted. It chooses 2B over 2A, 2C and 2D for 0.4.0; 2E may
supply exact detail where necessary, but no separate dataset browser
is introduced. Options 2F and 2G are next-release investigations.
The illustrations remain examples; the implementation plan must cite
one settled copy and behavior specification rather than asking its
implementer to choose wording or product behavior.

## Consequences and matters for detailed design

- **Separate evidence, shared explanation.** A guided-only assessment
  represents model availability separately from filtered contribution.
  Screen and download presentations use the same facts. Existing
  trial records suffice; no new data asset is required. Use actual
  joint combinations, including restored sets with gaps; use exact
  detail if the pattern cannot be summarized without implying models
  that do not exist.
- **Keep query behavior authoritative.** With the population choice
  Last stage within the slip range (`one_state_per_trial`), the query
  chooses that stage before applying the scarp-type filter. This rule
  is the same for both movement modes; offset conversion determines
  the per-angle bounds. Missing measurements remain distinct from
  excluded stages. Do not substitute an earlier stage to make a
  profile appear represented.
- **Respect shared code boundaries.** The shared provenance builder
  lives in `download/package.ts`, using `views/summary.ts`. Add the
  availability/contribution explanation through one consistent
  explorer-side composition at all three guided uses: ZIP provenance
  in `guidedArchive`, chart provenance in `sidecarText`, and the Word
  report's provenance section. Keep shared builders and
  `views/notices.ts` unchanged for `/scenario/`. Review/result
  summaries, the PNG strip, report body and download README are
  explorer-owned; update those descriptions consistently as needed.
- **Preserve the request and reproducibility.** `scenario.json` stays
  the requested settings; `records.csv` stays the actual matching
  stages. The provenance text and report distinguish intent and
  representation for the same release under
  [ADR-0019](0019-release-based-data-identity.md). No new machine file
  or schema is introduced by this decision.
- **Complete the chart-format amendment.** PDD §6.3 records the added
  qualification to the existing, already wrapped caption strip.
  Guided DDD §16 must fix its composition and wrapping while retaining
  all fields. The sidecar and report carry exact details; the image
  must remain truthful on its own and legible with long profile names.
  This is a format extension, not an assumption that captions are
  short or currently absent.
- **Keep review and results distinct.** Site notes describe the release;
  review explains the draft's model availability and the existing
  movement conversion information. Results and downloads describe
  only their confirmed snapshot, including when another draft exists.
  Fix the selected/available/represented labels consistently in the
  PDD and design, using availability for the profile facts.
- **Verify the accepted scope.** Cover the 45-degree absence, the
  40/45-degree split, depth and density restrictions, Select all,
  incomplete inputs, both sample landings, restored gapped sets and
  a release with irregular joint availability. Also cover later-filter
  exclusions, missing measurements, an empty result, unchanged
  confirmed results during draft edits, narrow-screen layout, keyboard
  and screen-reader access, and every saved-result surface. Verify
  that fixed profile notes do not change on slider movement or add
  live announcements. Preserve the existing range announcements.
- **Finish the release design and plan.** PDD D-56 records the accepted
  product behavior and amendments to D-14/D-55. Carry that behavior
  and the settled copy through the architecture/design references and
  a bounded 0.4.0 implementation task. These downstream records still
  need completing; accepting this ADR is not evidence that the feature
  has been implemented or that release checks have passed. Do not
  reopen the selected approach or add the later features to that task.

## Follow-up after 0.4.0

Inspect the DesignSafe archive inventory, then consult the research
group through [briefing question 8](../../notes/research-group-questions.md#8-what-do-the-specialist-sediment-labels-mean)
about any outputs beyond the known 210 + 9 trials, the reasons for the
limits, and whether useful new experiments can fill them. Display-name
changes remain with briefing questions 8 and 1. The known three-angle
restriction and assembled release wording go to the group for sight;
there is no new pre-release experiment or archive-research requirement.

If additional user guidance is useful, evaluate **2G first, or 2F**,
as the owner's inclination rather than an accepted feature. They are
different: 2G helps a reader deliberately change conditions after seeing
what will change; 2F shows available simulation counts and does not
itself change any conditions. Neither may imply that a larger count
makes a geological assumption more appropriate. Their value, wording,
selection policy and accessibility need a later product decision.

2D remains a documented alternative, not the next committed upgrade.
The next-release discussion may conclude that 2B remains sufficient.
It does not block completing 1F + 2B and the existing 0.4.0 release
work.

## References

- [PDD decisions: D-14, D-26, D-39, D-47, D-50, D-51, D-55, D-56](../app/pdd.md#1-decision-register)
- [Guided design: state rules](../app/guided-journey-ddd.md#2-state-and-pure-module-interface)
- [Guided design: review and confirmation](../app/guided-journey-ddd.md#3-transitions-and-validation-display)
- [ADR-0019: Release-based data identity](0019-release-based-data-identity.md)
- [ADR-0020: Parallel guided explorer](0020-parallel-guided-explorer.md)
- [Research-group briefing: sediment labels](../../notes/research-group-questions.md#8-what-do-the-specialist-sediment-labels-mean)
- [Site review 2026-11-12: R2](../../notes/site-review-2026-11-12.md#r2--p1-disclose-unavailable-sediment-combinations)
- [Site review 2026-11-13: R2](../../notes/site-review-2026-11-13.md#r2--p1-still-open-coverage-depends-on-fault-angle-too)
- [Explorer application](../../subprojects/webapp/src/explore/app.ts)
- [Query engine](../../subprojects/webapp/src/engine/query.ts)
- [Verification note of the 13 November review](../../notes/site-review-2026-11-13.md#verification-note-planning-session-2026-11-13)
- Tough review of the proposed ADR, 2026-11-14 — planning notes, not
  tracked: `notes/2026-11-14/adr-0021-tough-review.md`, with the detailed
  verification record `notes/2026-11-13/site-review-verification.md`
