# Questions for the research group — Ground Rupture Explorer

Compiled 2026-11-05; clarified 2026-11-06; first answers recorded
the same day.

This note explains what we need to ask the research group, why we
need the answers, and what the app does while we wait. It is written
for someone who knows the product but is not an Earth scientist.

The [product definition][pdd], [release decision][adr17], and
[wording-review record][audit] remain the authoritative records.
This briefing does not approve scientific statements or change the
release requirements. An [editable copy in Claude][claude-copy] also
exists; edits to this file do not update that copy automatically.

## A few terms used in the questions

- **[Fault slip][slip]:** how far two blocks of rock move past each
  other along a fault underground.
- **[Surface offset][offset]:** the vertical difference between the
  two sides of a rupture at the ground surface. This is a different
  measurement from fault slip.
- **[Fault angle, or dip][fault-dip]:** the fault's angle from
  horizontal. This describes its tilt, not its depth underground.
- **[Scarp][scarp]:** the step, slope, or ridge at the ground surface
  left by rupture. *Scarp height* measures its height; *scarp dip*
  measures the slope of its face, not the fault angle underground.
- **[Deformation zone width][dzw]:** the width of the disturbed
  ground across the rupture.
- **[Simulation stage][stage]:** one saved point in a simulation as
  fault slip accumulates. One simulation has many stages, each
  with its own measurements.

## What needs an answer, and when?

The prototype is already accessible to anyone with its address.
Here, **before public release** means before it is advertised through
site navigation and search, or published as the first software
release. It does not mean before the group can try the prototype.

Question 1 still needs its answer before that release; questions 2
and 3 were answered on 2026-11-06 and are recorded below, and the
group's written review of the same date answered questions 4–9, 11,
12, and 13 in one pass — each answer is recorded under its
question. Question 10 got no reply yet and stays with question 1.
Question 14 — the group will come back to it — still
needs a pre-release decision, including an owner decision about
field comparisons in the guided app. The remaining open questions
concern temporary approaches already in use, proposed rules, or
later features. **P2** means a later delivery priority, not the
prototype review phase.

| # | Topic | When the answer is needed |
| --- | --- | --- |
| 1 | Scientific explanations in the app | Before public release |
| 2 | Permission and license for sharing data | Answered 2026-11-06: CC BY 4.0 confirmed |
| 3 | Kern County comparison with real measurements | Answered 2026-11-06: deferred past the MVP (PDD D-49) |
| 4 | Reliability at small fault movements | Answered 2026-11-06: 0.5 m warning kept, text supplied (PDD D-4) |
| 5 | Correction to scarp-slope measurements | Answered 2026-11-06: corrected; one confirmation still needed (PDD D-5) |
| 6 | Meaning of negative scarp heights | Answered 2026-11-06: particle-scale resolution effect (PDD D-46) |
| 7 | Weak / Moderate / Strong in different models | Answered 2026-11-06: parameter tables supplied |
| 8 | Names of layered sediment arrangements | Answered 2026-11-06: arrangements described (see question 7) |
| 9 | Explanation of a raised ridge | Answered 2026-11-06: pressure ridge, additional uplift (Us − Ud) |
| 10 | Scientific accuracy of the sample stories | Part of question 1; no reply yet (2026-11-06) |
| 11 | Additional uplift as another result | Answered 2026-11-06: yes — still a later feature (PDD D-20) |
| 12 | Animations and other supporting material | Answered 2026-11-06: full collection, rights confirmed in writing |
| 13 | Surface-offset conversion for several angles | Answered 2026-11-06: approved (PDD D-3) |
| 14 | Which real measurements to show alongside results | Before public release; the group will circle back (2026-11-06) |

The minimum viable product (**MVP**) is the initial agreed feature
set. This table covers research questions, not every release task;
the owner's separate responsibilities appear at the end.

## 1. Are the scientific explanations in the app accurate?

**Reference: [scientific-content approval, CR-10][cr10].**

We need the group to read the [working prototype][prototype] and
approve the scientific statements people will encounter: the
explanations of inputs and results, chart captions, warnings, and
sample stories. Product-owner approval allowed prototype work to
proceed; it does not replace scientific approval.

**Ask:** Which statements can be approved as written? For anything
inaccurate, incomplete, or likely to mislead a reader, please provide
replacement wording and, where relevant, a supporting reference.
Question 10 identifies specific sample-story claims to check.

**Why it matters:** a clear interface can still teach the wrong
thing if its explanations are scientifically inaccurate.

**Progress 2026-11-06.** The review's supplied texts are adopted
as decided wording on the owner's directive (PDD D-51; guided DDD
§15): the step renames, the definitions and hints, the pressure
ridge and additional-uplift terminology, and the unhyphenated
deformation zone width. A few strings had to be assembled from
the review's sentences — the forecast line, the small-count
notices, the negative-height note, the slip-rate sentence — and
are listed for the group's sight. What remains of this question
is the full prototype read-through: the statements the review did
not touch, and question 10's story checks.

## 2. May we share the data files, and on what terms?

**Reference: [prototype and release decision, ADR-0017][adr17].**

The project turns source datasets into files used by the app and
offered for download. These are the *derived data exports*. There
are two separate decisions:

1. **Permission from each source:** do its terms allow us to share
   the data derived from it? Please identify the license or written
   permission, and any required credit or restrictions.
2. **Terms we offer to users:** under which license should people
   receive our exports? This is a product-owner decision with the
   team, informed by the source permissions above.

The prototype currently assumes CC BY 4.0 for the derived exports,
with credit to each source. The code uses Apache-2.0 and the written
content uses CC BY 4.0. These assumptions are recorded in
[the data redistribution record][redistribution]; they are not
proof that every source permits the proposed use.

**Answer needed:** documented source permissions and an agreed
license for the exports before public release. Permission to share
the digitised Kern County field data was already confirmed on
2026-09-18; the broader question was answered on 2026-11-06.

**Answered 2026-11-06.** The group's answer, relayed by the owner:
CC BY 4.0 is good. The owner adopts CC BY 4.0 for the derived data
exports, with the per-source terms as documented in
[the data redistribution record][redistribution]. The record is the
2026-11-06 amendment of [ADR-0017][adr17]; the vintage pinned by the
first software release carries the confirmed terms, as that decision
already provides. The group's written review of the same date adds
that the underlying experiments are already published on
DesignSafe-CI — Chiama et al. 2024a (homogeneous),
DOI 10.17603/ds2-xpq0-gw80, and 2024b (heterogeneous),
DOI 10.17603/ds2-gfsj-pp60 — “should be safe to put under new CC
license.”

## 3. Which Kern County measurements should we compare with the models?

**Reference: D-6; [Kern County worked-example requirement][kern-prd]
and [planned walkthrough][kern-pdd].**

The planned worked example compares simulated deformation-zone
widths with widths measured after the 1952 Kern County earthquake.
The group needs to choose the real measurements and the simulation
selection that make this a meaningful comparison.

This is **separate from the current prefilled Kern County sample**.
That sample uses 60° and 70° fault angles to help people try the app.
The planned worked comparison specifies 30° and the Pressure Ridge
scarp type (a raised ridge); it is intended to reproduce a documented
comparison with real measurements.

**Ask:**

1. Which field-data group should the worked example use? The
   documented candidates are three widths from the Fault
   Displacement Hazards Initiative (**FDHI**) dataset—11, 15, and
   30.5 m under the less-than-50-metre rule—or eleven widths from
   the combined Kern County compilation, ranging from 0.30 to
   30.48 m. The compilation includes some FDHI measurements, so
   these groups overlap and must not be treated as independent.
2. Should we use only widths associated with the **main rupture**,
   rather than disturbance away from it? This is what the documents
   call the *principal-width* question. The combined compilation
   does not label that distinction; if it matters, please provide a
   rule or an identified set of measurements we can use consistently.
3. Which related scarp types should we include, and what maximum
   fault slip should we use to reproduce the paper's comparison?

**Why it matters:** choosing a different group or mixing overlapping
measurements could change the apparent agreement with the models.
The current requirements include this worked example in the first
public release. Deferring it would require an explicit scope change
by the product owner.

**Answered 2026-11-06.** The group's answer, relayed by the owner:
no need, at least for the MVP. The owner took exactly the scope
change described above: FR-O6 leaves the v0.4 release by the
release-scope amendment recorded as PDD decision D-49 (2026-11-06),
moving from P1 to P2. The walkthrough specification stands, and
this question — which field-data group and which principal-width
rule — stays open for the example's post-MVP return.

## 4. How should we handle results at very small fault movements?

**Reference: D-4; [low-slip policy][low-slip].**

The app measures simulated ground shapes automatically. At small
amounts of fault slip, those measurements may be less reliable.
We need to know when this matters and how to explain or handle it.

**Ask:**

- Is there a scientifically supported minimum slip below which a
  measurement should be treated cautiously? Does it differ by scarp
  type or by the measurement being shown?
- Should the app keep those values with a warning, exclude them
  automatically, or let the reader choose whether to include them?
- What should the warning say?

**Current approach:** retain the values and show a warning when the
selected range includes slip below 0.5 m. That number is a temporary
trigger for the warning, **not a validated boundary between reliable
and unreliable data**. The slip values at which the paper's plotted
results begin also are not validated reliability cutoffs. The
research group's answer must determine the final policy.

**Answered 2026-11-06.** Keep the warning at 0.5 m of slip: even
natural low-slip events leave very small surface displacements, and
discrete measurements are hard to obtain. Keep showing the values,
with the group's warning text, now the decided wording (PDD D-4,
Decided 2026-11-06):

> Low-slip measurements may be less reliable. Below 0.5 m of fault
> slip, surface deformation can be difficult to distinguish from
> model roughness. These values are shown, but interpret them with
> caution.

The hard-coded per-class starting slips in the paper's figures
(0.25–1.85 m) marked where manually quality-checked measurements
begin — the automated measurement struggled below about 0.5 m —
not a validity boundary, so no per-type trigger is needed.

## 5. Are corrected scarp-slope measurements ready to use?

**Reference: D-5; [scarp-dip notice][dip-notice].**

*Scarp dip* is the angle of the surface slope. The current data await
a correction from the research group; the recorded notice says the
largest errors are concentrated in the Simple scarp types.

**Ask:** Is the correction ready and approved? If so, please identify
the corrected data or calculation and any remaining limitations.
If not, is the current provisional-data notice sufficient, and what
conditions must be met before we can remove it?

**Current approach:** display the results with a “Provisional data”
notice wherever scarp dip appears. We need a scientific decision,
not just a wording change, before treating those values as final.

**Answered 2026-11-06.** The Simple-scarp dips were accidentally
measured backwards; the corrected values — about 50–70° positive,
similar to the fault's own dip — live in a **Convert Scarp Dip**
column that keeps the originals alongside, and the group reports
the published measurements corrected, bad ones eliminated, and the
plots checked. One confirmation is still needed before the notice
comes down: the 26-column `DEM_dataset.csv` this project ingests
has **no** `Convert_Scarp_Dip` column, and its `Scarp_Dip` values
for the Simple classes are already all positive (18,058 values,
+5.3° to +89.8°, mean 63.6°; Simple Collapse mean 74.8°) —
consistent with the corrected series. Please confirm that this
column **is** the corrected one, and that the thirty negative
values remaining in the Monoclinal and collapse classes (minimum
−12.5°) are expected. PDD D-5 stays Interim, and the notice stays
up, until that word arrives.

## 6. What should a reader understand from a negative scarp height?

**Reference: D-46, raised 2026-11-05; [decision register][decisions].**

The Kern sample produces a minimum scarp height of −0.02 m
(minus two centimetres). Yet the app describes scarp height as a
height above the reference ground on the lower side of the fault.
A reader needs help reconciling the negative value with that
definition.

**Ask:** What does a negative value mean in this dataset? Please
explain it in ordinary language and provide one sentence the app
can show beside affected results. Does the interpretation depend
on the scarp type or stage of the simulation?

**Current approach:** keep the recorded values in the charts,
statistics, and downloads. We do not replace them with zero, remove
them, or call them noise or subsidence without the group's answer.

**Answered 2026-11-06.** A negative scarp height can still be
reported: values of −0.02 m are the size of the model's particles,
so this is a resolution and smoothing effect, or extra compaction
at low slip. A warning about model resolution would be useful.
Recorded as PDD D-46 (Decided 2026-11-06); the display sentence is
assembled from this answer's words (guided DDD §15.8), goes back
to the group for sight, and reaches the scarp-height panel with
task G-26.

## 7. Does “Strong” mean the same thing in uniform and layered sediment?

**Reference: wording audit, entry 9; [review record][audit].**

The app offers Weak, Moderate, and Strong for both uniform sediment
and layered sediment. Uniform sediment uses one material throughout;
layered sediment uses an arrangement of materials. The repeated
labels can make the two choices sound equivalent.

**Ask:** What does each strength label describe in each model? For
example, how does “Strong” uniform sediment differ from “Strong”
layered sediment? Please provide a short explanation, and a sketch
of the material arrangement if that would make the difference clear.

**Why it matters:** readers need to understand what they are
selecting. Until the explanation is approved, the app must not
imply that matching labels describe identical materials.

**Answered 2026-11-06.** The group supplied the parameter tables.
Density is set by gravitational settling and the inter-particle
friction coefficient (Dense 0, Medium 0.25, Loose 0.5; measured
porosities 0.156, 0.175, 0.184). Uniform (“homogeneous”) strength
is the cohesion of the particle bonds: 0.1 and 0.5 MPa are Weak,
1.0 Moderate, 1.5 and 2.0 Strong. Layered (“heterogeneous”) Weak,
Moderate, and Strong are vertical gradients of 1 m layers,
strongest at the base — the 3 m weak gradient, for example, is
0.1, 0.5, 1.0 MPa top to bottom. The labels describe modeled bond
strengths, not universal soil classes: strong reads as brittle or
stiff sediment, weak as soft or unconsolidated. Decoding the
served dataset confirms the mapping exactly (the review record of
2026-11-06 holds the numbers). The supplied interpretation note
and tables are the approved content for the planned per-option
explanations; building that surface stays queued in the review
record's intake.

## 8. What do the specialist sediment labels mean?

**Reference: wording audit, entry 10; [review record][audit].**

Three choices are particularly hard for a non-specialist to interpret:
“Random Heterogeneous,” “Cohesive Top Unit,” and “Alternating
Strong-Weak.” These are names in the dataset, not explanations.

**Ask:** For each name, please describe what materials or strengths
are present and how they are arranged. Provide a short definition
and, if possible, a simple cross-section showing the arrangement.
Would a plainer display name be accurate? If so, what should it be?

**Current approach:** keep the dataset names. The planned later
explanations and sketches need scientific approval; we should not
invent their meanings from the names alone.

**Answered 2026-11-06** (with question 7's tables). **Random
Heterogeneous**: ten non-repeating layer-strength sequences drawn
from 0.1–2.0 MPa — modeled only for dense, 10 m deep profiles.
**Cohesive Top Unit**: a 2.0 MPa crust over 1.0 MPa layers that
act as unconsolidated sediment — modeled at every depth and
density. **Alternating Strong-Weak**: alternating 2.0 and 0.1 MPa
layers — also dense, 10 m only. The group's own name for the first
is “Randomized strengths”; whether plainer display names replace
the dataset names stays an open wording choice under question 1.
The dense-10 m restriction on two of the three is stated nowhere a
reader can see it — logged as intake in the review record.

## 9. How should we explain the extra height of a raised ridge?

**Reference: wording audit, entry 39; [review record][audit].**

The current explanation says a raised ridge “can add height beyond
the fault's own movement.” That is ambiguous: height is measured
vertically, whereas fault slip is movement along a tilted fault.

The proposed replacement is:

> A raised ridge can stand above the surrounding raised ground.

**Ask:** Is that an accurate description? By “surrounding raised
ground,” do we mean the neighboring ground on the lifted side of
the fault? Please confirm or replace the sentence, using a clear
reference level for the ridge's height.

**Why it matters:** the explanation should help readers picture the
shape without suggesting that two different measurements are
interchangeable. The replacement remains a proposal.

**Answered 2026-11-06.** “Raised ridge” is not the group's
terminology: use **pressure ridge** (or pop-up structure), and
describe the extra height as **additional uplift (Us − Ud)** — the
height of the scarp above the undeformed surface of the lifted
side, from backthrusting and folding at shallow fault dips. The
proposed replacement sentence above is withdrawn in favor of
wording built on those terms, adopted under PDD D-51 (guided DDD
§15.6) and implemented by task G-26.

## 10. Are the sample stories' real-earthquake comparisons accurate?

**Reference: wording audit, entry 29; [sample-story decisions][pdd].**

The two sample scenarios are illustrations, not reconstructions of
the Chi-Chi or Kern County earthquakes. Their stories connect the
sample values to measurements or estimates reported for those
events. We need the group to verify those connections.

**Ask:** Please check the event descriptions, numerical claims, and
the way they are used to explain the sample choices. In particular:

- Is the Chi-Chi story's comparison between the sample's 0–3 m
  surface-offset range and the reported ground-height changes fair?
- Is it appropriate to use the cited Kern County elevation change
  to explain the sample's 0–1.3 m surface-offset range?
- Are the fault-angle explanation and the separate 1.6–1.9 m slip
  example described accurately? The latter spans two reported
  estimates for different parts of the fault. It is neither a range
  expressing uncertainty about one estimate nor a conversion of
  the surface-offset value.

The product-approved qualifier is: “These examples help you try the
tool. They do not reconstruct either earthquake.” Scientific review
of the stories remains part of question 1, including their
[per-field explanations][stories].

## 11. Would “additional uplift” be useful as a fourth result?

**Reference: D-20; [measurement views][measurements].**

The documents call this quantity **Us − Ud**:

- **Us** is the scarp height at the surface.
- **Ud** is the vertical uplift caused by movement on the fault at
  depth. It is not the total distance moved along the tilted fault.
- **Us − Ud** is the difference, called *additional uplift* in the
  [project glossary][additional-uplift]. It helps describe surface
  height associated with deformation such as folding and movement
  on secondary faults.

**Ask:** What would a reader learn from this result that the current
height, width, and slope results do not show? Is it useful enough to
add, and what explanation and qualifications would it need?

**Status:** outside the current MVP. This is a later product decision
with research-group input, not a question blocking the first release.

**Answered 2026-11-06.** Yes — add it, with the definitions the
review supplies (Us is total scarp height; Ud is vertical
displacement on the fault at depth; the difference is the pressure
ridge's extra “pop-up”). It stays outside the MVP: the served data
vintage carries no Us − Ud column, so the view needs a pipeline
export change and a new vintage. PDD D-20 records the yes and that
sizing; the owner may fold the column into the release vintage so
the later view needs no further one.

## 12. How complete must the animation collection be?

**Reference: D-8 and R-13–R-15; [education and media pages][media].**

The planned educational pages explain the different scarp shapes
(*morphology* means shape) and may show animations of their formation.
There are six scarp types in the app, but approved animations may
not be available for all six.

**Ask:** Must every type have an approved animation before these
pages are published, or can we publish a partial collection with
clear “Animation not yet available” messages? Which animations are
available now, with their captions, credits, and permission to use?

Two related requests have different consequences:

- **How measurements are made (R-14):** will an animation explaining
  the measurement process be supplied? That page can start with
  text and figures; it does not have to wait for an animation.
- **Links to research code (R-15):** which repository addresses may
  the later contact page link to? These links remain optional until
  approved addresses are supplied.

**Status:** affects later educational and contact pages, not the
current explorer's first release.

**Answered 2026-11-06.** Every model has an animation: per-model
folders hold MP4s of the sedimentary strata (“particles”) and of
the bond networks showing internal deformation (“contacts”),
organized by experiment series. The collection has never been
posted publicly, and the group states in writing that the project
has full rights to distribute it — the documented permission R-12
requires. A GIF showing how the surface measurements were made
exists for the measurement-process page (R-14). The group offers
either per-scarp-type animations or exact per-model matches; that
choice, captions, credits, and hosting are product work recorded
as intake in the review record. The folder links stay out of this
public repository deliberately until a curated, licensed subset is
published through the project's own channel.

## 13. Should each selected fault angle have its own slip estimate?

**Reference: D-3; [proposed conversion rule][conversion].**

Readers can enter a vertical surface offset instead of underground
fault slip. The app estimates the corresponding slip range. The
conversion depends on fault angle, so selecting several angles
raises a question about which simulations to include.

The proposal is to convert the offset **separately for each angle**.
For example, with 30° and 40° selected, the app calculates a slip
range for 30° and another for 40°. It includes a simulation stage
only if its slip fits the range for its own fault angle, then
combines the selected results. It does not average the angles or
apply one angle's converted range to every simulation.

**Ask:** Is that scientifically appropriate? What limitations should
we explain when results for several angles are combined?

**Status:** product-owner proposal awaiting research review. When
the reader enters fault slip directly, the same entered range
applies to all selected angles; this question concerns the
surface-offset conversion.

**Answered 2026-11-06.** Yes — convert per angle; the geometry is
the dip-slip relation (vertical component = slip × sin of the
fault dip), which is what the shipped conversion already does.
Recorded as PDD D-3, Decided 2026-11-06; no behavior changes.

## 14. Which real measurements should we compare with the results?

**Reference: D-18; [field-comparison proposal][field-comparison]
and [release decision][adr17].**

A *field overlay* places measurements from real earthquakes on the
simulation charts for context. The *per-source analogue map* is
simply a list of which real measurement we compare with which
simulated measurement. It is not a geographical map, and the
measurements are not necessarily equivalent.

**Ask the group to review two choices:**

1. **Which measurements appear initially?** The proposal starts
   with comparisons switched off. When enabled, it shows FDHI
   records for Wenchuan, Kashmir, and Killari, plus all SURE and
   Kern County records available in the field export for the
   displayed measurement. Width comparisons initially use the
   paper's less-than-50-metre rule, with the full range available.
   Are that selection and that restriction appropriate?
2. **Which quantities may be compared?** The proposed pairings are
   listed below. Are they useful and scientifically defensible,
   and what qualifications should accompany each one?

| Simulated result | Proposed real-earthquake comparison |
| --- | --- |
| Scarp height | FDHI vertical separation; SURE scarp height; Kern County vertical scarp height |
| Deformation-zone width | FDHI fault-zone width; Kern County deformation-zone width |
| Deformation-zone width, as a limited comparison | SURE horizontal movement perpendicular to the fault's surface trace, called the fault-normal component |
| Scarp dip | None: the listed sources provide no comparable measurement |

**A specific point to check:** SURE's fault-normal component is a
distance moved, **not a width of disturbed ground**. Is showing it
beside simulated width useful at all? If so, how should we prevent
readers from mistaking it for a like-for-like comparison? The
proposal keeps the sources separate and labels the comparisons
“Analogous, not identical.” SURE is a published database of surface
ruptures; [the data guide][data-guide] describes all three sources.

**Release significance:** this is not merely an optional wording
review. ADR-0017 includes D-18 among the decisions required before
public release. The later decision to make `/explore/` the public
entry point also requires the owner to settle whether and how field
comparisons belong in that guided app. The research group reviews
the scientific comparisons; the owner records their product scope.

**Status 2026-11-06.** The group will come back to this one (“I'll
circle back”). With questions 2 and 3 resolved, this is the one
research-side decision still gating the public release.

## Separate product-owner decisions

These belong in the same review discussion, but are not scientific
questions for the group to settle alone:

- **Liability text (D-10):** the owner must obtain or write the
  final text before release. The prototype currently has a marked
  placeholder.
- **Export license:** the owner decides the license with the team,
  taking account of the source permissions requested in question 2.
  Decided with question 2's answer (2026-11-06): CC BY 4.0, the
  ADR-0017 amendment of that date.
- **Guided-page release scope (D-39):** the owner must reconcile the
  guided app with the release requirements, including field
  comparisons in question 14. The deferral of the Kern worked
  example in question 3 needed its own scope decision; the owner
  took it on 2026-11-06 (PDD D-49).

Already settled, so we need not ask again:

- Permission to redistribute the digitised Kern County field data
  from the Buwalda and St. Amand 1955 survey was confirmed on
  2026-09-18.
- The product owner decided the site entry point (D-2) on
  2026-10-28, taking responsibility for what had been a joint
  question. The later D-39 decision makes `/explore/` the page to
  prepare for public introduction; `/scenario/` stays unlisted.

[pdd]: ../docs/app/pdd.md
[decisions]: ../docs/app/pdd.md#1-decision-register
[adr17]: ../docs/adr/0017-unadvertised-prototype-before-public-release.md
[audit]: ../docs/app/ddd-review.md#second-external-audit-2026-11-05
[claude-copy]: https://claude.ai/artifact/YTiqx2kDjE5U4GqPq8ThqF
[prototype]: https://harvardrc.github.io/eps-ground-rupture/explore/
[slip]: ../subprojects/mkdocs/docs/glossary.md#slip
[offset]: ../subprojects/mkdocs/docs/glossary.md#surface-offset
[fault-dip]: ../subprojects/mkdocs/docs/glossary.md#fault-dip
[scarp]: ../subprojects/mkdocs/docs/glossary.md#scarp
[dzw]: ../subprojects/mkdocs/docs/glossary.md#dzw
[stage]: ../subprojects/mkdocs/docs/glossary.md#model-stage
[cr10]: ../docs/app/prd.md#cr-10-scientific-content-approval
[redistribution]: ../data/REDISTRIBUTION.md
[kern-prd]: ../docs/app/prd.md#fr-o6-kern-county-worked-example
[kern-pdd]: ../docs/app/pdd.md#47-kern-county-worked-example-fr-o6-d-6-open
[low-slip]: ../docs/app/pdd.md#46-low-slip-caveat-d-4-interim
[dip-notice]: ../docs/app/pdd.md#54-scarp-dip-provisional-notice-fr-o4-d-5
[stories]: ../subprojects/webapp/src/explore/stories.ts
[measurements]: ../docs/app/pdd.md#41-measurement-views-fr-o1
[additional-uplift]: ../subprojects/mkdocs/docs/glossary.md#us-ud
[media]: ../docs/app/pdd.md#8-education-and-media-surfaces
[conversion]: ../docs/app/pdd.md#36-multi-dip-conversion-rule-d-3-proposed
[field-comparison]: ../docs/app/pdd.md#44-field-overlay-fr-o5-d-18-proposed
[data-guide]: ../subprojects/mkdocs/docs/data.md
