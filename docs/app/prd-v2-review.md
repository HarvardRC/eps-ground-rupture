# PRD v2 review — first complete draft (2026-10-15)

Review of `docs/app/prd-v2.md` at commit `3f55174` (1,845 lines).
Method: four independent review lenses (domain facts vs. the project's
committed sources and shipped exports; internal consistency;
requirements quality; lay-architect readability), with every blocker-
or major-severity finding re-verified by an adversarial agent
instructed to refute it. 79 checks came back clean, including
pandas-level verification against `dist/csv/dem.csv`,
`dist/csv/historic_events.csv`, and the pinned regression export.

**Verdict: approve pending the fixes below.** No factual claim in the
document contradicts a committed source or shipped export except the
two listed first. The P1 set is buildable and largely testable. The
confirmed findings are all local edits — none requires restructuring.

Line numbers refer to `3f55174`; quoted fragments are included so
findings survive renumbering.

---

## A. Confirmed findings (verified; fix before freeze)

### A1. FR-D4: "Every simulation record has a scarp-type label" is false
Lines 1051–1053. The export has 3,434 unlabeled records — exactly the
zero-slip initial stage of every trial (verified twice with pandas:
all null-`Scarp_Class` rows have `Slip == 0.0`). The sentence also
contradicts FR-G2's own rule for "Records without a scarp
classification." Under the default population and full-range window,
the unlabeled records sit inside the matching set; in a low-slip
window they can dominate it.
**Fix:** "Every simulation record except each trial's zero-slip
initial stage carries a scarp-type label. The dominant type is the
most frequent label among matching records that carry one."

### A2. FR-O6: the second Kern group is not a "Buwalda group"
Lines 970–978. Widths, count, and missing marker all verify exactly
(eleven widths 0.3048–30.48 m, no principal-rupture marker). But the
committed documentation (`docs/datasets.md:152–157`, site `data.md`)
describes that compilation as a **three-source merge** — Buwalda &
St. Amand (1955) + the FDHI Kern entries + SDC — with no per-row
source column. So the two FR-O6 "groups" are not disjoint
alternatives: the merge already contains FDHI's Kern rows (FDHI's
15 m / 30.5 m reappear as 15.24 m / 30.48 m — 50 ft and 100 ft). This
materially affects the R-4 decision the requirement defers to the
research group.
**Fix:** call it "the hand-compiled Kern County compilation (Buwalda &
St. Amand survey merged with the FDHI Kern entries and the event's
surface-deformation characteristics)" and state explicitly that it
overlaps the FDHI group.

### A3. FR-G4 vs CR-4: two diverging canonical disclaimers
Lines 1323–1331 vs 1564–1575. Both require the standing disclaimer to
"state" its content, but CR-4's list adds annual probabilities,
probability-of-exceedance results, and PFDHA, and its professional-use
item differs. Neither references the other; a disclaimer satisfying
FR-G4 can violate CR-4.
**Fix:** make CR-4 the single canonical definition; FR-G4 requires
"the standing disclaimer defined in CR-4" instead of restating it.

### A4. §9.5 omits five deferrals the body sends to the PDD
Lines 1830–1844. Missing from the list: FR-O3's minimum-count warning
threshold; FR-D2's chart-provenance format; FR-X1's older-version
notification rule; FR-G2's unclassified-record display and
scarp-family details; NFR-4's exact browser baseline. Also FR-O1
defers Us − Ud to "the relevant open question," which exists nowhere
by that name (it is risk R-10, unnamed at that point).
**Fix:** either add the missing items, or state that §9.5 lists only
decisions requiring resolution *before* the PDD (research-group/owner
gates), while PDD-internal design decisions are enumerated by the
"must be defined in the PDD" clauses. Name R-10 in FR-O1.

### A5. §2.4 hangs on an unidentified, uncommitted mockup
Lines 380–399. "The provided PowerPoint mockup" is never named,
attributed, or located; it exists only at
`legacy/mockup/DEM website GUI.pptx`, and `legacy/` is **gitignored**,
so a reader of the committed PRD cannot resolve any "Mockup area"
cell. In the same table: "the NZ NSHM app" (C6) is never expanded or
referenced, and C9 lists "author-supplied media" as an *existing*
asset although no committed source records such media (the same
pending deliverable is risk R-13).
**Fix:** one sentence identifying the mockup (author-provided, kept
locally, not committed — or commit it); expand NZ NSHM (New Zealand
National Seismic Hazard Model web tool); move author-supplied
animations from "existing assets" to pending (R-13).

### A6. Success criteria dropped without replacement or deferral
The v1 draft had seven measurable success criteria; v2 has none and
never says where they went. The PRD defines what to build but not how
anyone will know it succeeded, and the PDD loses its acceptance
anchor.
**Fix:** either restore a short success-criteria section or add one
sentence to §2.2: "Measurable success criteria and acceptance
walkthroughs for the MVP are defined in the PDD, derived from
US-1..US-3 and the requirements below." (The proposed PDD outline
gives them a chapter.)

### A7. FR-O3: two untestable clauses without deferral
Lines 892–903. "Where possible, it must identify the condition …" and
"must not show … in a way that appears more certain than the data
supports" give a reviewer no pass/fail criterion, unlike the
neighboring threshold clause, which is properly deferred to the PDD.
**Fix:** give the identification rule a decidable floor plus a PDD
deferral (e.g. "at minimum, when relaxing a single selected condition
would produce matches, the product must name that condition"), and
either delete the "appears more certain" sentence (N-display, the
warning, and CR-8 already cover the intent) or restate it testably.

### A8. §9.5 is in draft state
Lines 1830–1846. Inline answers carry no decider or date; the file
ends with the unattributed first-person line "I would defer 3-9.";
item 2's "(Name is defined…)" contradicts R-11's "name … not fully
settled"; no owners are named, so the architect cannot tell which
decisions are closed or who closes the open ones.
**Fix:** recast as a table — Decision | Owner (cross-ref the R-row) |
Status (Decided <date, by whom> / Deferred with interim rule / Open).
Record "defer 3–9" as a dated owner decision with interim rules.
Narrow R-11 to the entry-point half.

### A9. "Simulation record" is never defined
The term appears ~15 times as the downloaded, counted, and
statistics-bearing unit, but the document never says a record is one
stage of one trial (3,434 × 101 = 346,834). The reviewer persona
(US-3) must reproduce N exactly. FR-S6 also says "one **state** per
trial" where everything else says "stage."
**Fix:** one definition sentence at §1.3 or the §6 opening: "a
simulation record is one model stage of one simulation trial — one
row of the published dataset; which records a result uses is governed
by FR-S6." Align state/stage.

### A10. FR-S2: the joint structure of the sediment control is unstated
Lines 719–739. Two reasonable engineers build different things: two
orthogonal facets (strength × structure — impossible to populate) or
one six-option selector. The dataset's actual domain (verified) is six
mutually exclusive labels of a single dimension: Weak/Moderate/Strong
(uniform) and Random Heterogeneous/Cohesive Top Unit/Alternating
Strong–Weak (layered).
**Fix:** add: "Each simulation carries exactly one of these six
mutually exclusive strength labels. Weak, Moderate, and Strong occur
in both uniform and layered cases (with different meanings, below);
the three named structures occur only in layered cases."

### A11. "Principal rupture band" is a coinage, and it collides with FR-O6
Lines 144–149, 1551 vs 974. §1.2 asserts "In fault-displacement
practice, this is called the principal rupture band," but no committed
project source uses that phrase, and the glossary's related term
("principal rupture") names something else: the **field**
compilations' rank for main-trace vs distributed breaks — the sense
FR-O6's "principal-rupture marker" uses. Near-identical terms for two
different concepts.
**Fix:** either have the research group confirm the term (and add a
glossary entry), or drop the coinage ("the main modeled rupture
zone") and add one sentence distinguishing the modeled zone from the
field compilations' principal/distributed rank.

### A12. Scarp-type names precede any description; FR-S5's bias has no direction
US-5 (line 664) and FR-S5 (777–778) use Monoclinal/Pressure
Ridge/Simple before FR-S7 first enumerates them, and the document
never says what the three base shapes are (only the collapse variants
get a gloss). FR-S5's "may be biased for Pressure Ridges" cannot be
turned into warning copy: direction and cause are unstated (pressure
ridges stand higher than the fault's vertical displacement, so the
conversion overstates slip).
**Fix:** one-line descriptions of the three base shapes at FR-S7, and
in FR-S5: "Pressure Ridge scarps add height beyond the fault's
vertical displacement, so the conversion tends to overstate slip
where they dominate."

---

## B. Verified but downgraded to minor

1. **No modal-verb convention** (two lenses converged). §5's intro
   defines only priority semantics; FR-X1/X2/E1/E2 are P2 "must"
   while FR-D2/D4/E3 are "should … This is a P2/P3 capability."
   Suggested one-liner for the §5 intro: "'must' binds within
   whichever release delivers the requirement's capability; priority
   says when that is" — then align the three "should" FRs or leave
   them deliberately advisory.
2. **Stale names:** "an interactive Scenario Explorer session"
   (1083–84 — the v1 working title, line-wrapped so greps miss it);
   "the interactive scenario explorer" (NFR-5, 1736; elsewhere the
   term is "scenario page"); "The app" (DR-1, 1378; elsewhere "the
   product").
3. **R-11 vs §9.5 item 2** on whether the name is settled (see A8).

## C. Notable minors (screened from 51; grouped)

**Facts and data nuances**
- §1.2 "the ensemble does not provide the accompanying horizontal
  ground shortening": the export does carry `HD_HW` (hanging-wall
  horizontal displacement). Qualify ("does not report horizontal
  shortening across the scarp as a primary output") or acknowledge it.
- DR-4 "recovered per-scarp-type low-slip reliability cutoffs"
  over-labels the committed record: the recovered values are the
  paper's Figure-8 per-class plotting start-slips, described as
  hand-chosen — calling them "reliability cutoffs" pre-frames the R-3
  decision.
- FR-O6's Pressure-Ridge-only filter diverges from the authors'
  notebook precedent (which filters the Kern panel by family and slip
  cap). Worth passing to the research group with R-4.
- §3.5 group name "Structural Geology & Earth Resources Group"
  appears in no committed source (the department name is sourced via
  `.zenodo.json`). Likely correct — confirm and add a source (site
  About page or paper affiliation line).

**Terminology (binds to the parked follow-ups)**
- uniform/layered vs homogeneous/heterogeneous: never bound as
  synonym pairs; "Random Heterogeneous" (a layered *structure*)
  collides with "heterogeneous deposit" (the archive split). One
  binding sentence in CR-3 would settle both.
- "scarp type" vs "scarp class": still mixed (FR-G2 prose vs CR-3's
  canonical "Modeled scarp type"); the sources uniformly say "class."
  Add the synonym note to CR-3 (parked item #3).
- "medium-dense" (summary) vs the modeled label "Medium" (FR-S4).
- Two bold-defined synonyms for one concept: "modeled surface-rupture
  measurements" (§2.1) vs "Simulated surface-rupture measurement"
  (CR-3). Pick one as canonical, make the other a stated synonym.

**Structure and references**
- C8 and C10 map to no §5 section; FR-E2 carries no capability or
  priority; §2.2's P2 list omits C10.
- Acronym hygiene: PDD and HLDD are never expanded (the document's
  central deferral devices); ADR is used (377) before its expansion
  (1778); PFDHA is expanded three times; FDHI, SURE, NZ NSHM, Us − Ud
  never expanded. Us − Ud is also never glossed, and FR-O1's "the
  relevant open question" should name R-10.
- "The project's stated liability limitations" (FR-G4/CR-4) are
  stated nowhere, and no one is assigned to author them. Add to §9.5
  or assign an owner.
- NFR-4's "the project's supported mobile layouts" is a dangling
  baseline (no committed definition; existing dashboards are fixed
  ~800 px). Let the PDD define it alongside the browser baseline.
- NFR-5 has no conformance anchor (is the bullet list the whole
  accessibility bar, or an excerpt of a named standard?). A PDD
  decision; say so.

**Requirement gaps worth one sentence each (or a PDD home)**
- Degraded state when the versioned data export fails to load or
  mismatches the page version (the CDN-cache risk NFR-7 already
  worries about).
- FR-D1's "summary-statistics table" contents: say "the FR-O2
  statistics set" explicitly.
- FR-O5: who selects the overlaid field measurements and what the
  default set is; the scarp-height analogue also differs by source
  (SURE supplies its own scarp height); scarp dip has no field
  analogue at all (say what the overlay does then).
- FR-S5: whether the window is endpoint-inclusive (FR-S1 has the
  analogous rule; FR-S5 doesn't); clarify that the multi-dip question
  arises in conversion mode (a directly entered slip window is
  dip-independent).
- FR-S6's gloss assumes the window starts at zero ("anywhere along
  the way to this amount of slip") — a 2–3 m window makes the gloss
  wrong; one clause fixes it.
- Metric-only / English-only statement; release-versioning note (what
  a product release is, since versions must be displayed); a
  content-governance line (who approves reader-facing scientific
  text — presumably the research group per §3.5, but no requirement
  says so).
- US-1 narrates per-dip conversion behavior that FR-S5 explicitly
  defers (§9.5 item 3) — add "illustrative, not normative" to §4's
  intro or align US-1 with the deferral; stories cite no FR IDs.
- CR-7's priority glossary list omits PFDHA (used three times to
  define the boundary; glossary lacks an entry — the known gap), and
  lists back-projection, which the body never uses by that name.
- Lay-reader first-use glosses worth adding: thrust/reverse fault
  (the product's subject is never explained), fractile /
  deterministic review / engineer of record cluster (§1.2),
  trenching, "pinned per-measurement export" (FR-O6), cache-busting
  convention (NFR-7).

## D. Formatting nits (one pass)
Trailing whitespace: 80, 378 (≈44 trailing spaces), 382–385, 1836.
Double blank line 400–401. Unspaced em dashes 792–794 vs spaced
elsewhere. Line 1846 ("I would defer 3-9.") — see A8.

## E. Raised and refuted (so they don't come back)
- "§5.3 header says P1 but contains P2 requirements" — refuted: the
  headers mirror the §2.4 capability map 1:1, and the two P2 FRs
  (FR-D2, FR-D4) flag their priority inline.
- "FR-O1 doesn't define minimum chart interactivity" — refuted: the
  floor is derivable (percentiles readable via the FR-O2 table
  without pointer interaction; NFR-5 already requires the accessible
  table).

## F. What verified clean (highlights of 79)
- Every dataset-domain enumeration matches the shipped export
  exactly: 3,434 × 101 = 346,834; dips {20,30,40,45,50,60,70};
  depths {3,5,10} m; densities {Dense, Medium, Loose}; the six
  sediment-strength labels; slip 0–5.0135 m in ~0.05 m stages (the
  double "approximately" is correct — values are not on an exact
  grid); null-measurement counts are committed knowledge.
- US-1's physics is exactly right: 3 m anticipated offset at 30°
  back-projects to ≈6.0 m slip (pinned slope 0.5021) — beyond the
  5.0135 m max — while 40° gives ≈4.6 m, in range. The conversion
  assist's caveats match the glossary's back-projection entry,
  including "closest for Simple and Monoclinal."
- FR-O6's Kern numbers are exact: FDHI widths under 50 m are
  {11, 15, 30.5} (three rows ≥50 m withheld); the hand-compiled arm
  holds exactly eleven widths 0.3048–30.48 m, no principal marker;
  Kern 1952 is a thrust event with the 30° dip a Buwalda &
  St. Amand field measurement.
- FR-G2 reproduces the canonical palette, order, and both
  color-vision caveats verbatim from the visual-identity note.
- FR-S6/DR-3's population model matches the shipped precedent and
  the data (final states at ≈5 m; no ties at any trial's maximum
  slip; the expected-count test is well-grounded).
- FR-G1's magnitude rules are the site's existing discipline,
  including the shipped warning text; FR-O4's scarp-dip caveat
  matches the committed record ("error concentrated in the Simple
  classes").
- NFR-2/6/7 match the committed infrastructure (main-branch Pages
  deploys, strict build, Apache-2.0 / CC BY 4.0 / publisher
  figure terms); DR-1's "Tableau compatibility export"
  characterization matches the data docs verbatim.
- The reuse-first principle is coherently enforced end to end
  (§2.3 → FR-G5 → R-7 → C8), and the PRD's implementation-silence is
  disciplined throughout.
- Deliberate strengths to preserve: the inline ensemble definition
  (§summary), the early fault-dip/scarp-dip distinction, §1.2's
  two-reason distribution rationale, the zero use of hanging-wall
  jargon, "analogous, not identical" reused verbatim from the site.

## Post-fix verification (2026-10-15, second pass)

The fix pass (52 replacements) and the new PDD were themselves
adversarially verified by three agents. All A/B ledger items confirmed
applied; the pass's own regressions were then fixed:

- §9.5's preamble now lists all body-to-PDD deferrals (it had omitted
  three the fix pass itself created) and is phrased as "among them."
- FR-O3 now distinguishes the warning threshold from a (possibly
  lower) chart minimum, and FR-O1's chart list is explicitly subject
  to FR-O3 — the two no longer conflict at low N.
- FR-O6's overlap sentence corrected: the compilation *incorporates
  FDHI's Kern entries* (two of the three FDHI widths reappear; its
  eleven values include no 11 m — verified against the export).
- US-1 now says "uniform and layered," honoring the new CR-3 binding.
- PDD expanded at first use (§2.2); CR-2's duplicate PFDHA expansion
  dropped; FR-G4's jurisdiction sentence corrected (CR-4 owns content
  and placement).
- PDD verification also corrected: shared-link state now includes
  depth and density; the dominance rule anchors on the most frequent
  type per FR-D4; GS-2 replaced with a *verified* sparse scenario
  (Moderate, dip 20°, depth 3 m, Dense, one-state → 18 valid) and
  GS-5 added for the suppression tier (Alternating Strong–Weak,
  one-state → 9 valid); GS-4's expected diagnostic names both
  narrowed conditions; the low-slip trigger's rationale is stated
  honestly against the per-type start values (0.25–1.85 m); Kern
  County's vertical scarp-height values joined the analogue map; the
  Kern preset pins Pressure Ridge per FR-O6; a standalone width-scope
  caveat now ships with the DZW panel; the family view adopts the
  dashboards' presentation rules by citation; two unsourced copy
  claims ("trained by the research group", the monoclinal fault-tip
  mechanism) were reworded to match committed sources.

Still open for the owner: §3.5's research-group name remains
unsourced in committed material (likely correct; one confirmation
line wanted — see C).

## G. Parked follow-ups (unchanged, per owner instruction)
The three items in `prd-follow-ups.md` (file since retired with the
finished PRD, commit a3c79c2; item 1 is now served by the HLDD
recording `config.py` as the palette source, item 2 by the HLDD §11
errata note) were open at review time; reviewers
independently re-confirmed all three (FR-G2's ADR-0007-only
provenance; scarp type/class terminology; ADR-0007's stale "Kern
County is red" clause, which is outside the PRD).
