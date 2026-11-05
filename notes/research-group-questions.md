# Research group questions — Ground Rupture Explorer

Compiled 2026-11-05 for the prototype review round, from the PDD
decision register (`../docs/app/pdd.md`), ADR-0017
(`../docs/adr/0017-unadvertised-prototype-before-public-release.md`),
and the wording audit of the same day (kept locally at
`notes/2026-11-05/explorer-wording-ux-audit.html`; its adoption is
recorded in `../docs/app/ddd-review.md`). The governed documents stay
the record; this page is the briefing view. An editable copy lives
in the owner's Claude workspace:
<https://claude.ai/artifact/YTiqx2kDjE5U4GqPq8ThqF>.

## How to read this

Fourteen questions wait on the research group; three block the
public release. Everything else has an approved stopgap live on
the page, or gates later work only.

**Blocks release** means public activation — navigation entry,
search listing, the first tagged release — cannot happen without
the answer. *Interim holds* means an approved stopgap ships
meanwhile. *Gates P2* means only the planned later pages wait on
it.

| # | Question | Ref | Standing |
| --- | --- | --- | --- |
| 1 | Approve the reader-facing texts | CR-10 | **Blocks release** |
| 2 | Confirm redistribution terms (two parts) | ADR-0017 | **Blocks release** |
| 3 | Kern County field data and principal width | D-6 | **Blocks release** |
| 4 | Low-slip measurement reliability | D-4 | Interim holds |
| 5 | Scarp-dip correction status | D-5 | Interim holds |
| 6 | Negative scarp heights | D-46 | Interim holds |
| 7 | Strength labels across sediment modes | audit 9 | Interim holds |
| 8 | Composition label meanings | audit 10 | Gates P2 |
| 9 | Raised-ridge wording | audit 39 | Wording check |
| 10 | Sample-story framing | audit 29 | Feeds CR-10 |
| 11 | Us − Ud fourth measurement | D-20 | Post-MVP |
| 12 | Animation coverage required | D-8 | Gates P2 |
| 13 | Multi-dip conversion windows | D-3 | Review of proposal |
| 14 | Field-overlay default set | D-18 | Review of proposal |

## Blocks release — answer before the site is advertised

**1. Do you approve the reader-facing texts?** (PRD rule CR-10.)
Every scientific sentence a reader sees — explanations, captions,
caveats, the two sample stories — needs the group's approval
before the page is advertised. Texts shipped so far carry the
product owner's approval so work could proceed; the group's
sign-off happens by reading the deployed prototype at its
unlisted address. The sample-story framing (question 10) folds
into this read.

**2. May the project redistribute its derived data, and under
what terms?** (ADR-0017, deferred to the prototype review.) Two
parts: (a) do the source datasets' terms permit redistributing
data derived from them; (b) what license the project offers its
exports under. The current assumption ships with every data
vintage in `data/REDISTRIBUTION.md`: code Apache-2.0, prose
CC BY 4.0, derived exports CC BY 4.0 with per-source attribution.
The record states this is an assumption, not evidence.
Confirmation is required before activation and before the first
software release. A different, earlier redistribution question —
the Kern field digitisation — was answered 2026-09-18; see the
settled list at the end.

**3. Which field measurements form the Kern County comparison
group, and how is principal width defined?** (D-6.) The Kern
County worked example is a P1 requirement (FR-O6): a preset plus
a walkthrough reproducing a documented comparison. The
walkthrough is fully specified with the data slot pending (PDD
§4.7). Until D-6 is answered the preset task is blocked, and the
release task depends on it — this is the one science answer the
release schedule is waiting on. The recorded alternative is a
product-scope amendment moving FR-O6 out of P1, which is the
owner's call, not a research answer.

## Interim rules standing — answers replace hedges

None of these block the release; an approved stopgap is live in
each case.

**4. Below what slip are measurements unreliable, and should they
be filtered?** (D-4.) Interim: document, never filter — a caveat
shows at low slip. The group owns the final policy: a threshold,
a treatment, or confirmation that the caveat is enough.

**5. Is the scarp-dip correction final?** (D-5.) Interim: a
"Provisional data" notice appears everywhere scarp dip does. The
group decides the correction's status at release; the notice then
stays or goes.

**6. What does a negative scarp height mean?** (D-46, raised
2026-11-05.) The Kern sample's results include a −0.02 m scarp
height while the copy defines height above the ground. The data
contract keeps negative values deliberately, and the app shows
them unchanged. Needed: the interpretation and one reader-facing
sentence. Until then nothing is clamped, removed, or labeled as
noise or subsidence.

**7. The same strength words describe two different models — how
do they differ?** (Audit entry 9.) Uniform and layered sediment
both offer Weak / Moderate / Strong, but the modeled profiles
differ. Needed: an approved explanation or profile sketch; until
then the page must not imply identical materials across the two
sets.

**8. What do the composition labels mean, exactly?** (Audit
entry 10.) Random Heterogeneous, Cohesive Top Unit, and
Alternating Strong-Weak are dataset identifiers. The audit
recommends keeping them with short plain-language explanations
and small profile sketches — the meanings need approval before
any friendlier display names are invented.

**9. Is the revised raised-ridge sentence right?** (Audit
entry 39.) Proposed: "A raised ridge can stand above the
surrounding raised ground," replacing "can add height beyond the
fault's own movement," which compares vertical height with
along-fault movement ambiguously. Verify the definition before
adoption.

**10. Are the sample stories' comparison sentences right?**
(Audit entry 29, remainder.) The shared qualifier already shipped
approved: example values at the named event's scale, reproducing
no event. The per-sample context sentences — for instance the
Chi-Chi comparison — still want scientific verification. Part of
the question 1 read.

**11. Should Us − Ud ship as a fourth measurement?** (D-20.) Out
of the MVP by decision; the results page reserves the slot. A
question for a later phase, parked here so it is not lost.

## Gates the next phase (P2 pages)

**12. Which scarp types must have animations before the
morphology pages go public?** (D-8.) The planned P2 pages —
morphology education and scenario-linked animation offers —
degrade per scarp type where media is missing, so the layout
survives gaps; the group decides the minimum coverage required
before those pages go public. Three supply questions ride along:
whether the supplied animations cover all six scarp types (R-13),
whether animated media explaining the measurement process will
exist (R-14 — that page ships text-and-figures first regardless),
and the repository links the contact page needs (R-15).

## Owner proposals awaiting research review

These are decided as proposals by the product owner; the group's
review confirms or corrects them.

**13. Multi-dip conversion windows** (D-3). With several fault
angles selected, the offset-to-slip assist converts the entered
surface offset separately per dip, producing per-dip slip
windows. Confirm this is the right scientific treatment.

**14. Field-overlay defaults** (D-18). The default set of
field-measurement sources drawn as chart context, and the
per-source analogue map. Review both the set and the mapping.

## Same review round, not research questions

Two items sit in the same prototype review but belong to the
product owner, listed so the full activation gate is visible:

- The liability-limitation text (D-10) must be authored or
  sourced before release; the page shows a marked placeholder
  today.
- The license the project offers is the owner's decision with the
  team (D-39: demonstrate, then decide, then advertise). The
  group's part is the source-permission confirmation in
  question 2.

Settled already, for orientation:

- Redistribution of the Kern County field digitisation (the
  Buwalda & St. Amand 1955 rows) was confirmed 2026-09-18.
- The site entry point (D-2) was decided by the product owner on
  2026-10-28, taking responsibility for what was originally a
  joint question.
