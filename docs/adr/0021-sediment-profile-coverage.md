# ADR-0021: Telling readers when a chosen sediment profile adds no simulations

- **Status:** Proposed, 2026-11-13.
- **Decider:** the product owner.
- **Prepared by:** the planning session, from the outside site reviews
  of 2026-11-12 and 2026-11-13 and their verification.

## Summary

In the explorer's site step, the reader picks a range of fault
angles, a range of sediment depths, one or more densities, and any
of nine sediment profiles (tick boxes). The explorer offers all nine
profiles as if every one had simulations for every setting. Two do
not. Random Heterogeneous
exists only for Dense sediment 10 m deep, and Alternating Strong-Weak
only for Dense, 10 m, at three of the seven fault angles. A reader
can tick such a profile, see it named in every summary and download,
and never learn that it added nothing to the results.

The decision has two parts:

1. **After the reader confirms** (review, results, downloads). This
   part is needed in any case, because today's summaries and
   downloads name profiles that contributed nothing.
2. **While the reader chooses** (the site step). This part is
   optional: an earlier signal, on top of part 1.

**Proposed:** for part 1, name every chosen profile that added
nothing, or added only for some of the chosen settings, on the review
screen, the results and the downloads. For part 2, add nothing yet;
one live status line under the profile list is offered as a separate
later step. Never untick, disable, hide or reorder the reader's
choices, and keep both profiles in the explorer.

## Context

**The facts.** Of the 63 combinations of fault angle (20, 30, 40, 45,
50, 60 and 70 degrees), sediment depth (3, 5 and 10 m) and density
(Loose, Medium, Dense), seven profiles have simulations in all 63.
Random Heterogeneous has them in 7 (Dense, 10 m, every angle) and
Alternating Strong-Weak in 3 (Dense, 10 m, at 20, 40 and 60 degrees).
On 2026-11-06 the research group wrote of Random Heterogeneous
"modeled only for dense, 10 m deep profiles", and of Alternating
Strong-Weak "also dense, 10 m only". The angle limit is stated only
on the [Response curves
page](../../subprojects/mkdocs/docs/dashboards/response-curves.md).
These facts were verified against the published data release (see
the [verification
note](../../notes/site-review-2026-11-13.md#verification-note-planning-session-2026-11-13)).

**An example.** Choose 45 degrees, 10 m, Dense, Uniform Strong plus
Alternating Strong-Weak, and fault slip from 0 to 5 m. The results
show 1,200 matching simulation stages (a stage is one saved point in
a simulation as fault slip accumulates) and 1,164 scarp heights (a
scarp is "a step, slope, or ridge formed at the ground surface by
fault slip and related deformation", in the site's glossary), the
same as for Uniform Strong alone, while every summary names both
profiles. Partial cases exist too: with angles from 40 to 45
degrees, Alternating Strong-Weak contributes at 40 but not at 45, so
a plain "added nothing" or "added something" would be wrong.

**How often.** Counting all 1,176 combinations the controls allow
(28 angle ranges times 6 depth ranges times 7 sets of densities;
percentages rounded): Random Heterogeneous adds nothing in 71% of
them and adds only for some of the chosen settings in 26% (for
example, at 10 m but not at 5 m); it covers the whole choice in 2%.
Alternating Strong-Weak adds nothing in 77%, adds only for some of
the chosen settings in 23%, and covers the whole choice in 3
combinations (under 1%). No warning appears while any other ticked
profile still has simulations: the existing "no matching stages"
help appears only when the whole result is empty.

**What the explorer does today.** The site step lists all nine
profiles the same way
([app.ts](../../subprojects/webapp/src/explore/app.ts)). The
summaries repeat what the reader asked for. The only coverage notice
concerns the fault-slip or offset range. The empty-result help in
[query.ts](../../subprojects/webapp/src/engine/query.ts) runs only
when nothing matches. In the downloads, `scenario.json` (the
reader's settings), `provenance.txt` (the citation, the data and
software versions, the settings and the counts) and the Word report
record the request; only `records.csv` (the matching stages) shows
which profiles contributed.

**Why it matters.** A reader who is not a geologist sees
"Alternating Strong-Weak" beside 1,200 stages and concludes that the
profile shaped them. Someone reproducing the scenario from the
downloads is misled the same way. The explorer already commits to
honesty about failures: its download failure message "claims nothing
that did not happen" ([guided design, failure
behavior](../app/guided-journey-ddd.md#135-failure-behavior),
following [ADR-0010](0010-native-client-side-scenario-app.md)).

**Already decided or held.**

- The owner's decision of 2026-11-12
  ([D-55](../app/pdd.md#1-decision-register), "Corrections from the
  outside site review of 2026-11-12 land as guided task G-33") holds
  "sediment-profile coverage" "for the group's answers, not
  shipped". Accepting this ADR chooses the approach but does not
  lift that hold: the owner approves wording by committing a change
  to the product definition document (PDD), so the hold is lifted
  by the commit that carries the new sentences. The group's answer
  of 2026-11-06 already gives the substance (dense, 10 m); the angle
  limit comes from the data.
- Reader-facing sentences use the research group's words, or are
  assembled from them and marked "assembled"
  ([D-51](../app/pdd.md#1-decision-register), "Reader-facing wording
  follows the research group's supplied texts"). Display names for
  these profiles are still an open question for the group.
- The guided journey explains rather than refuses
  ([D-47](../app/pdd.md#1-decision-register), "Progression guidance
  and review fixes"), and its [state
  rules](../app/guided-journey-ddd.md#2-state-and-pure-module-interface)
  forbid silently filling an empty selection, clamping or
  substituting an input.
- The older `/scenario/` page is paused
  ([D-39](../app/pdd.md#1-decision-register), "Guided publication
  path; `/scenario/` paused"), and no guided task so far has changed
  its files. It shares the data, query and download code with the
  explorer, built beside it under
  [ADR-0020](0020-parallel-guided-explorer.md).

**Constraints.** The explorer already loads which simulation exists
for every combination, so it can work out availability itself; no
new data export is needed. Future data releases may fill or change
the grid ([ADR-0019](0019-release-based-data-identity.md)), so
nothing may hard-code "Dense, 10 m". Angle and depth are sliders and
density and profile are tick boxes; a live message must not interrupt
a slider drag. On a phone the site step is one column about 350 px
wide, and the boxes wrap.

## Criteria

Must-haves:

- **Truthful.** No screen, summary, ZIP file or report implies that a
  profile contributed when it did not.
- **Keeps the reader's choices.** Nothing ticked is removed,
  disabled, hidden or replaced without saying so.
- **Handles partial cases.** A profile present for only some of the
  chosen angles, depths or densities is described correctly.
- **Follows the data.** A new data release needs no code change.
- **Works on a phone and with assistive technology.** Text, not
  colour alone; readable at 320 px; no stream of screen-reader
  announcements; slider drags keep working.

Also weighed:

- **Early.** The reader learns before finishing the site step.
- **Cost.** Building effort, risk of breaking something, and the
  number of new sentences the research group must see.

Sizes below are relative (small, medium, large), not estimates.

## Part 1: after the reader confirms

### 1A. Keep as is

Nothing changes; every requested profile is named; downloads repeat
the request.

- For: no work and no new wording.
- Against: fails "truthful" and "partial cases"; both outside
  reviews flag it.

### 1B. Name the profiles that added nothing (proposed)

On the review screen and the results, the explorer works out, for
each chosen profile, where it has simulations among the chosen
angles, depths and densities. It then names, in the existing notice
style, every profile that added nothing, and every profile that added
only for some of the chosen settings, saying where it did (for
example, only at 40 degrees, or only for Dense sediment at 10 m).
The summary still lists the reader's choices, and the notice says
the choice is kept. The same sentence goes into `provenance.txt`
(which already records the data release), the Word report and each
chart's provenance file. `records.csv` and `scenario.json` stay as
they are: `records.csv` holds the matching stages, which already
show what each profile contributed, and `scenario.json` records
what the reader asked for, so it names every ticked profile; the
notice in `provenance.txt` says which of them added nothing.

The notice keeps two reasons apart: the model has no simulations
for these site conditions, or the reader's own filters (the
fault-slip range or the scarp types) left nothing from this
profile.

```text
Review your scenario
  Sediment: Uniform Strong; Alternating Strong-Weak
  ┌──────────────────────────────────────────────────────────────┐
  │ [Notice: names Alternating Strong-Weak, says where it has    │
  │  simulations (40 degrees) and where it has none (45), and    │
  │  says the choice is kept]                                    │
  └──────────────────────────────────────────────────────────────┘
```

(Bracketed text describes what a sentence must say; it is not
proposed wording.)

- For: meets every must-have in every screen and file, from one
  calculation; reuses an existing pattern; lowest risk.
- Against: the reader learns only at review, after the site step;
  a reader who skims the review may miss it; a warning look can read
  as "you made a mistake", so its tone must be neutral.
- Size: medium. About four new sentences, assembled from the group's
  description and the data.

### 1C. A contribution table

A small table per chosen profile, on review and results, giving how
many stages and scarp heights it contributed; zero is the signal.

- For: the numbers are accurate; very little new wording; answers
  "what did this profile add?".
- Against: the reader must interpret a zero, and learns neither why
  nor at which angles; it fits inside 1B rather than replacing it.
- Size: small to medium.

### 1D. Make the choices constrain each other

Two variants: disable or hide profiles that do not fit the other
choices; or ask for the profile first, then limit the angle and
depth sliders and the density tick boxes to what exists.

- For: a summary can never name an unavailable profile.
- Against: breaks "keeps the reader's choices" and the
  explain-rather-than-refuse rule; partial cases need an arbitrary
  rule (offer the profile if it exists at any chosen angle, or only
  if it exists at every one?); a tick that vanishes when a slider
  moves is a silent change; disabled boxes are skipped by keyboard
  users and rarely say why; asking for the profile first puts the
  least familiar question first.
- Size: large.

### 1E. Remove the two limited profiles

Offer seven profiles instead of nine. This removes 219 of the 3,434
simulations (22,119 of 346,834 stages).

- For: the simplest screen; nothing to explain.
- Against: discards data the research group built and described;
  the explorer would disagree with the dashboards and `/scenario/`;
  saved drafts and links need handling; a future limited profile
  brings the problem back. It is a content decision that needs the
  group.
- Size: small in code, large for the product.

### Comparison for part 1

| Option | Truthful | Keeps choices | Partial cases | Follows data | Phone and assistive tech | Cost |
|---|---|---|---|---|---|---|
| 1A Keep as is | No | Yes | No | n/a | Yes | None |
| 1B Name them | Yes | Yes | Yes | Yes | Yes | Medium |
| 1C Contribution table | Partly | Yes | Partly | Yes | Yes | Small to medium |
| 1D Constrain choices | Yes | No | No | Yes | Poor | Large |
| 1E Remove profiles | Yes | No | n/a | Partly (a future limited profile brings the problem back) | Yes | Small in code, large for the product |

Only 1B meets every must-have.

## Part 2: while the reader chooses (optional)

Each option here comes on top of 1B and uses the same calculation, so
the site step and the review can never disagree.

### 2A. Nothing extra (proposed for now)

The reader learns at review.

- For: no cost; no risk of a message that reads as advice.
- Against: the signal comes after the reader has finished the site
  step.

### 2B. A fixed note beside the two profiles

One line under the two boxes saying where they were modeled. It can
be typed once, or derived from the data and shown only while the
data says the profile is limited.

```text
[ ] Random Heterogeneous   [x] Alternating Strong-Weak
[Note: where these two were modeled; assembled from the group's words]
```

- For: early; cheap; close to the group's own sentence.
- Against: speaks about the profile in general, not the reader's
  choices; says nothing about angles, so a reader who follows it by
  choosing Dense and 10 m can still pick an angle where the profile
  has nothing; repeats itself to
  readers who already chose Dense and 10 m. A typed note goes stale
  with the next data release.
- Size: small.

### 2C. One live status line under the profile list (offered as a later step)

A single line, shown only when a ticked profile adds nothing, or
adds only for some settings, for the site conditions chosen so far.
It names the profile and where it has simulations, says the choice
is kept, and updates after a slider is released, not during a drag.

```text
[x] Uniform Strong   [x] Alternating Strong-Weak   [ ] Random Heterogeneous
[Status: names Alternating Strong-Weak, says it has no simulations
 at 45 degrees for the site conditions chosen so far, and says the
 choice is kept]
```

- For: tells this reader, at the moment of choice; moving a slider
  shows where the profile exists.
- Against: a line that changes while the reader works can read as
  advice or as an error; it can speak only about site conditions,
  because the fault-slip range is chosen later; a reader who ticks
  all nine profiles and then narrows the site conditions will see it
  often, so it must make clear that a missing profile is not the
  reader's mistake.
- Size: medium; two more sentences.

### 2D. A status on each profile

Like 2C, but a short status beside every affected box.

- For: the clearest per profile, the best for a first-time reader.
- Against: up to nine changing descriptions that shift a phone page
  and multiply screen-reader announcements; the largest risk of
  breaking slider drags and keyboard focus.
- Size: large.

### 2E. A reference table

A collapsed table, derived from the data, of which profile exists at
which angle, depth and density, linked from the limited profiles.

- For: exact; useful to reviewers and experts.
- Against: passive, so the reader who most needs it never opens it;
  the reader must compare it with their own choices; 63 cells per
  profile need condensing on a phone.
- Size: small to medium.

### 2F. Counts beside each profile

A live number of matching simulations beside each box; zero is the
signal.

- For: zero is widely understood.
- Against: a number that changes with every slider move is noisy;
  "stages" is jargon at this point; large counts read as importance
  (at 45 degrees, 10 m, Dense, Random Heterogeneous has 30
  simulations and Uniform Strong 12, which says nothing about which
  matters more); a zero never says why.
- Size: large.

### Comparison for part 2

| Option | Early | Speaks to the reader's choices | Partial cases | Phone and assistive tech | Cost |
|---|---|---|---|---|---|
| 2A Nothing extra | No | n/a | n/a | Yes | None |
| 2B Fixed note | Yes | No | No | Yes | Small |
| 2C One live line | Yes | Yes | Yes | Yes, with care | Medium |
| 2D Status per profile | Yes | Yes | Partly | Risky | Large |
| 2E Reference table | Only if opened | No | Yes | Needs condensing | Small to medium |
| 2F Counts | Yes | Partly | No | Noisy | Large |

Every part 2 option keeps the reader's choices; only a typed 2B
fails "follows the data". 2C is the best early signal; the
question is whether it is needed before readers have used part 1.

## Proposed decision

1. **Part 1: 1B.** On review, results and downloads, name every
   chosen profile that added nothing or added only for some of the
   chosen settings, from one availability calculation derived from
   the loaded data.
   The reader's choices stay as made, and both profiles stay in the
   explorer.
2. **Part 2: nothing yet.** Part 1 already stops the misleading
   summaries and downloads; 2C would add a second medium-sized
   change and two more sentences for the research group. The price
   of waiting is that readers learn at review, not while choosing.
   2C is offered as a separate step the owner can approve later,
   for example after readers have used part 1, reusing the same
   calculation and sentences.
3. **Never** untick, disable, hide or reorder choices to make the
   problem disappear.

Not proposed: 1D and 2D (they break must-haves or carry the highest
risk), 2F (noisy and needs scientific wording), 2B (says the wrong
thing for some choices), and 1E (a content decision for the owner
and the research group). 1C and 2E may be added later as
supplements. `/scenario/` does not change.

This remains a proposal until the owner accepts it.

## Consequences

- **Code.** One function works out, from the loaded data, where each
  chosen profile has simulations among the chosen settings; the
  review and results screens show the notice; the explorer's
  downloads carry the same sentence. All of it lives in code only the
  explorer uses, so `/scenario/` stays unchanged.
- **Downloads.** `provenance.txt`, the Word report and each chart's
  provenance file carry the notice. Because `provenance.txt` also
  records the data release, someone reproducing the scenario under a
  later release can see why the set of contributing profiles
  differs. `records.csv` and `scenario.json` are unchanged.
- **Tests.** Tests cover no, partial and full contribution
  (including the 45-degree example, the 40-to-45 split and a depth
  range of 5 to 10 m), a data release with different coverage, the
  review and results on a phone, by keyboard and with a screen
  reader, and the download contents.
- **Records.** The decision register in the product definition
  document (PDD) gains a row, the guided explorer's design document
  a section on this notice, and its implementation plan a task; this
  ADR's index row moves to "Accepted" when the owner accepts it.
- **Sentences.** About four for 1B (two more if 2C follows),
  assembled from the group's words and the data. They reach the
  explorer only through one PDD change the owner commits, which also
  lifts the D-55 hold for this item; they are then shown to the
  research group in the next briefing round.
- **Research group.** They may supply their own sentence for the
  three-angle limit, which would replace the assembled one, and their
  answer on display names would update the profile names in these
  sentences.
- **Risks.** With 1B alone the reader learns late; a warning style
  can read as the reader's error; the sentences must be updated if
  the display names change.

## Open questions for the owner

1. **Part 1: adopt 1B, naming every chosen profile that added
   nothing or added only for some settings?** Proposed: yes. If not,
   which option from the part 1 table?
2. **Part 2: add the live status line (2C) now, later, or never?**
   Proposed: later, after readers have used part 1.
3. **Keep both limited profiles in the explorer?** Proposed: keep
   them. Removing them (1E) discards data the group built and would
   need their agreement.

## References

- [D-55 — Corrections from the outside site review of 2026-11-12 land as guided task G-33.](../app/pdd.md#1-decision-register)
- [D-51 — Reader-facing wording follows the research group's supplied texts.](../app/pdd.md#1-decision-register)
- [D-47 — Progression guidance and review fixes.](../app/pdd.md#1-decision-register)
- [D-39 — Guided publication path; `/scenario/` paused.](../app/pdd.md#1-decision-register)
- [Guided design §2 — State and pure module interface](../app/guided-journey-ddd.md#2-state-and-pure-module-interface)
- [Guided design §13.5 — Failure behavior](../app/guided-journey-ddd.md#135-failure-behavior)
- [ADR-0010: Ground Rupture Explorer is a native client-side application](0010-native-client-side-scenario-app.md)
- [ADR-0019: Release-based data identity](0019-release-based-data-identity.md)
- [ADR-0020: Build the guided explorer beside the existing scenario page](0020-parallel-guided-explorer.md)
- [Research-group briefing §8 — What do the specialist sediment labels mean?](../../notes/research-group-questions.md#8-what-do-the-specialist-sediment-labels-mean)
- [Site review 2026-11-12, R2 — disclose unavailable sediment combinations](../../notes/site-review-2026-11-12.md#r2--p1-disclose-unavailable-sediment-combinations)
- [Site review 2026-11-13, R2 — coverage depends on fault angle too](../../notes/site-review-2026-11-13.md#r2--p1-still-open-coverage-depends-on-fault-angle-too)
- [Verification note of 2026-11-13](../../notes/site-review-2026-11-13.md#verification-note-planning-session-2026-11-13)
- [Explorer application code (`app.ts`)](../../subprojects/webapp/src/explore/app.ts)
- [Query engine (`query.ts`)](../../subprojects/webapp/src/engine/query.ts)
