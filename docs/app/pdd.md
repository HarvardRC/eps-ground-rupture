# Ground Rupture Explorer — product definition document

**Status:** first draft for owner review (2026-10-15).

This product definition document (PDD) is the second of the project's
staged documents (PRD → PDD → HLDD). It has two parts:

<!-- toc -->

- [1. Decision register](#1-decision-register)
- [2. Product structure and navigation](#2-product-structure-and-navigation)
  * [2.1 Page inventory](#21-page-inventory)
  * [2.2 Entry point (D-2, Proposed)](#22-entry-point-d-2-proposed)
  * [2.3 User journeys](#23-user-journeys)
  * [2.4 Future native panels (D-19)](#24-future-native-panels-d-19)
- [3. Scenario page: inputs](#3-scenario-page-inputs)
  * [3.1 Fault dip (FR-S1)](#31-fault-dip-fr-s1)
  * [3.2 Sediment strength and structure (FR-S2)](#32-sediment-strength-and-structure-fr-s2)
  * [3.3 Sediment depth (FR-S3) and density (FR-S4)](#33-sediment-depth-fr-s3-and-density-fr-s4)
  * [3.4 Displacement window (FR-S5)](#34-displacement-window-fr-s5)
  * [3.5 Offset-entry mode and conversion assist (FR-S5)](#35-offset-entry-mode-and-conversion-assist-fr-s5)
  * [3.6 Multi-dip conversion rule (D-3, Proposed)](#36-multi-dip-conversion-rule-d-3-proposed)
  * [3.7 Population, scarp filter, family view, reset](#37-population-scarp-filter-family-view-reset)
  * [3.8 Inverse mode (FR-X2, P2)](#38-inverse-mode-fr-x2-p2)
- [4. Scenario page: results](#4-scenario-page-results)
  * [4.1 Measurement views (FR-O1)](#41-measurement-views-fr-o1)
  * [4.2 Statistics table (FR-O2)](#42-statistics-table-fr-o2)
  * [4.3 Unclassified records (D-12, Proposed)](#43-unclassified-records-d-12-proposed)
  * [4.4 Field overlay (FR-O5, D-18 Proposed)](#44-field-overlay-fr-o5-d-18-proposed)
  * [4.5 Small, empty, and partial results (FR-O3, D-11 Proposed)](#45-small-empty-and-partial-results-fr-o3-d-11-proposed)
  * [4.6 Low-slip caveat (D-4, Interim)](#46-low-slip-caveat-d-4-interim)
  * [4.7 Kern County worked example (FR-O6, D-6 Open)](#47-kern-county-worked-example-fr-o6-d-6-open)
  * [4.8 Inverse-mode results (FR-X2, P2)](#48-inverse-mode-results-fr-x2-p2)
- [5. Copy deck](#5-copy-deck)
  * [5.1 Standing disclaimer (CR-4; D-10 Open)](#51-standing-disclaimer-cr-4-d-10-open)
  * [5.2 Short disclaimer](#52-short-disclaimer)
  * [5.3 Population explainer (FR-S6)](#53-population-explainer-fr-s6)
  * [5.4 Scarp-dip provisional notice (FR-O4, D-5)](#54-scarp-dip-provisional-notice-fr-o4-d-5)
  * [5.5 Statistics framing (CR-5)](#55-statistics-framing-cr-5)
  * [5.6 Conversion assist (FR-S5, D-3)](#56-conversion-assist-fr-s5-d-3)
  * [5.7 Field-overlay framing (CR-6, FR-O5)](#57-field-overlay-framing-cr-6-fr-o5)
  * [5.8 Small and empty results (FR-O3, D-11)](#58-small-and-empty-results-fr-o3-d-11)
  * [5.9 Low-slip caveat (D-4, Interim)](#59-low-slip-caveat-d-4-interim)
  * [5.10 Inverse-search framing (FR-X2)](#510-inverse-search-framing-fr-x2)
  * [5.11 Labels, units, and glossary links (FR-G3, CR-3, CR-7)](#511-labels-units-and-glossary-links-fr-g3-cr-3-cr-7)
  * [5.12 Morphology descriptions (FR-E1; research-group review required)](#512-morphology-descriptions-fr-e1-research-group-review-required)
  * [5.13 Measurement explanation (FR-E2)](#513-measurement-explanation-fr-e2)
- [6. Downloads, citation, and provenance](#6-downloads-citation-and-provenance)
  * [6.1 Download package (FR-D1)](#61-download-package-fr-d1)
  * [6.2 File naming](#62-file-naming)
  * [6.3 Chart export (FR-D2, P2; D-14 Proposed)](#63-chart-export-fr-d2-p2-d-14-proposed)
  * [6.4 Animation offer and dominance (FR-D4, P2; D-7 Proposed)](#64-animation-offer-and-dominance-fr-d4-p2-d-7-proposed)
- [7. Sharing and versioning](#7-sharing-and-versioning)
  * [7.1 Shared links](#71-shared-links)
  * [7.2 Version display and notice (D-15, Proposed)](#72-version-display-and-notice-d-15-proposed)
- [8. Education and media surfaces](#8-education-and-media-surfaces)
  * [8.1 Morphology page (FR-E1)](#81-morphology-page-fr-e1)
  * [8.2 Animation library (D-8, Open)](#82-animation-library-d-8-open)
  * [8.3 How the measurements are made (FR-E2)](#83-how-the-measurements-are-made-fr-e2)
  * [8.4 Contact and requests (FR-E3, P3)](#84-contact-and-requests-fr-e3-p3)
- [9. Product quality bars](#9-product-quality-bars)
  * [9.1 Performance budgets (D-9, Proposed)](#91-performance-budgets-d-9-proposed)
  * [9.2 Browser and mobile baseline (D-16, Proposed)](#92-browser-and-mobile-baseline-d-16-proposed)
  * [9.3 Accessibility target (D-17, Proposed)](#93-accessibility-target-d-17-proposed)
  * [9.4 Releases](#94-releases)
- [10. Acceptance and success](#10-acceptance-and-success)
  * [10.1 Success criteria](#101-success-criteria)
  * [10.2 Golden scenarios](#102-golden-scenarios)
  * [10.3 Acceptance walkthroughs](#103-acceptance-walkthroughs)
- [11. Explicitly not in this document](#11-explicitly-not-in-this-document)

<!-- tocstop -->

- **Part I — Requirements.** The product requirements document (PRD),
  included by reference: `docs/app/prd.md`. The PRD defines what must
  be true. The PRD remains authoritative for product requirements.
  This PDD does not change those requirements; it defines the pages,
  controls, states, copy, defaults, and acceptance behavior needed
  to satisfy them.
- **Part II — Product definition** (this document). What the product *is*:
  its pages, controls, states, words, and numbers — still renderable
  by any technology. How it is built belongs to the high-level design
  document (HLDD); chapter 11 lists what this document deliberately
  does not decide.

Decision statuses used throughout: **Decided** (recorded, with date
and decider), **Proposed** (this draft's recommendation, awaiting the
owner's confirmation), **Open** (waiting on the named owner, usually
the research group), **Interim** (an explicit interim rule applies
until the owner decides).

---

## 1. Decision register

The single tracking table for every decision the PRD defers, plus the
§9.5 decisions. The PDD is complete when no row is blank. Sections
named in the last column carry the detail.

| ID | Decision | Source (PRD) | Owner | Status | Resolution / proposal |
|---|---|---|---|---|---|
| D-1 | P1 is the MVP and release target (v0.3). | §2.2, §9.5-1 | Product owner | Decided (2026-10-15) | Yes. |
| D-2 | Site entry point (the name is decided: Ground Rupture Explorer, 2026-10-15). | §9.5-2, R-11 | Owner + research group | Proposed | §2.2. |
| D-3 | Multi-dip behavior of the offset-to-slip assist. | FR-S5, §9.5-3 | Owner, research-group review | Proposed | Per-dip converted windows; §3.6. |
| D-4 | Low-slip measurement-reliability policy. | DR-4, R-3, §9.5-4 | Research group | Interim | Document, do not filter; caveat in §4.6 and §5.9. |
| D-5 | Scarp-dip correction status at release. | FR-O4, R-1, §9.5-5 | Research group | Interim | Provisional-data notice everywhere scarp dip appears; text in §5.4. |
| D-6 | Kern County field-data group and principal-width rule. | FR-O6, R-4, §9.5-6 | Research group | Open | Walkthrough specified with the data slot pending; §4.7. |
| D-7 | Dominant-scarp-type rule for animation offers. | FR-D4, §9.5-7 | Product owner | Proposed | Most-frequent anchor, 10-point companion gap, 30 % floor — all over classified records; zero-classified suppresses the offer; §6.4. |
| D-8 | Animation coverage required for public release. | FR-E1, R-13, §9.5-8 | Research group | Open | Page layout degrades per-type; §8.2. |
| D-9 | Numeric performance and payload budgets. | NFR-3, DR-6, §9.5-9 | Product owner | Proposed | Budgets, test conditions, and the first-meaningful-render end point; §9.1. |
| D-10 | Liability-limitation text referenced by CR-4. | FR-G4/CR-4, §9.5-10 | Product owner | Open | Placeholder marked in §5.1; must be authored or sourced before release. |
| D-11 | Small-result warning threshold, chart floor, and empty-result diagnosis rule. | FR-O3 | Product owner | Proposed | Warn below 30 valid; suppress chart below 10; single-condition diagnosis; no-match state distinct from no-valid-measurement state; §4.5. |
| D-12 | Unclassified records: population and display semantics. | FR-G2, FR-S7 | Product owner | Proposed | "All scarp types" applies no filter — unclassified records stay in the matching population (GS-0's 346,834); excluded from class-colored charts and class counts; §3.7, §4.3. |
| D-13 | Scarp-family view availability and label. | FR-G2 | Product owner | Proposed | Toggle "Group collapse variants"; §3.7. |
| D-14 | Chart-export provenance format. | FR-D2 (P2) | Product owner | Proposed | Caption strip + sidecar text; §6.3. |
| D-15 | Shared-link version notice. | FR-X1 (P2) | Product owner | Proposed | URLs carry no version stamp when links first ship (P2); notice rule for later; §7.2. |
| D-16 | Browser and mobile baseline. | NFR-4 | Product owner | Proposed | Evergreen 24-month window; 360 px floor; §9.2. |
| D-17 | Accessibility conformance target. | NFR-5 | Product owner | Proposed | WCAG 2.2 AA for new pages; §9.3. |
| D-18 | Field-overlay default set and per-source analogue map. | FR-O5 | Owner, research-group review | Proposed | §4.4. |
| D-19 | Native full-dataset exploration panel in v0.3. | FR-G5, C8 | Product owner | Proposed | None — no documented gap; the five dashboards serve C8; recorded gap process in §2.4. |
| D-20 | Us − Ud as a fourth displayed measurement. | FR-O1, R-10 | Owner + research group | Open | Out of the MVP; the results page reserves the slot; §4.1. |
| D-21 | Success criteria and acceptance walkthroughs. | §2.2 | Product owner | Proposed | §10. |
| D-22 | Default displacement-window state. | FR-S5, FR-S6, FR-S8 | Product owner | Proposed | No active window by default ("slip: any"); GS-0 and GS-7 pin it; §3.4. |
| D-23 | Reader-facing display precision per quantity. | FR-O2, §10.1 note | Product owner | Proposed | Scarp height and slip 0.01 m; width 0.1 m; scarp dip 1° (D-5 provisionality); counts exact; shares whole percent; §4.2. |

---

## 2. Product structure and navigation

Serves: §2.1, §2.3, FR-D3, FR-E1–E3, FR-G5, NFR-2.

### 2.1 Page inventory

The product adds four product surfaces to the existing site. Nothing
existing moves.

| Surface | Priority | Content owner chapters |
|---|---|---|
| **Scenario page** — the product's core: inputs, results, downloads. | P1 | §3, §4, §5, §6 |
| **Morphology page** — the six scarp types taught. | P2 | §8.1–8.2 |
| **How the measurements are made** — the measurement explanation. | P2 | §8.3 |
| **Contact and requests** | P3 | §8.4 |

The existing dashboards, glossary, data, and citation pages remain the
site's reference layer; the scenario page links into them rather than
duplicating them (FR-G5, D-19).

### 2.2 Entry point (D-2, Proposed)

The scenario page joins the existing site navigation as a top-level
entry named **Scenario explorer**, placed after Dashboards. The page
masthead carries the product name, Ground Rupture Explorer. The
morphology and measurement pages join under the existing explanatory
section of the navigation; Contact joins last. No separate domain, no
separate visual identity: §2.1 of the PRD keeps the product inside the
existing site.

### 2.3 User journeys

| Journey (PRD story) | Path through the product |
|---|---|
| US-1 dam scenario | Scenario page → inputs (§3) → conversion assist (§3.6) → results (§4) → download (§6.1) |
| US-2 pipeline width | Scenario page → inputs → deformation-zone width view (§4.1) → field overlay (§4.4) |
| US-3 review | Manual re-entry of the stated scenario (§3), or from P2 a shared link (§7) → results → download with provenance (§6.1–6.2) |
| US-4 inverse search (P2) | Scenario page, inverse mode (§3.8) → condition distributions (§4.8) |
| US-5 teaching (P2) | Morphology page (§8.1) → animations (§8.2) → scenario page preset links |

### 2.4 Future native panels (D-19)

v0.3 ships no native full-dataset exploration panel: C8's uses are
served by the five published dashboards, and no documented gap exists.
A future proposal for one must add a register row naming the gap, the
dashboard that fails to meet it, and the user evidence — the "named
gap and rationale" FR-G5 requires.

---

## 3. Scenario page: inputs

Serves: FR-S1–S8, C1. Layout: on wide screens, an input rail beside
the results; on small screens, inputs stack above results with a
persistent summary of the active scenario. Every control change
updates results immediately (NFR-3); there is no "submit" step.

A one-line **scenario summary** restates the active scenario in words
above the results at all times (FR-G3: generated from state, never
frozen text), e.g.:

> Dip 30° or 40° · Strong (uniform) · depth 5 or 10 m · any density ·
> slip 0–3 m · all stages in window · all scarp types (no filter) ·
> matching records: …

The summary's count is the number of simulation records that match
the active inputs under the active population — the population size,
before any per-measurement validity split. It is deliberately not
labeled "N": each §4.1 measurement panel shows its own
valid-measurement count N, which can differ by measurement because a
record can yield one valid measurement and not another; the statistics
table (§4.2) reconciles the two for every panel (matching records =
valid count + excluded-null count).

### 3.1 Fault dip (FR-S1)

Seven discrete selectable values: 20°, 30°, 40°, 45°, 50°, 60°, 70°.
Multi-select; all selected by default. A range entry assist accepts
"30–40" and echoes which modeled values that includes ("30° and 40°
only") before applying. No continuous slider.

### 3.2 Sediment strength and structure (FR-S2)

A two-arm multi-select control presents sediment conditions separately
for uniform and layered cases.

- **Uniform:** Weak · Moderate · Strong
- **Layered:** Weak · Moderate · Strong · Random Heterogeneous ·
  Cohesive Top Unit · Alternating Strong–Weak

The dataset uses six distinct strength-label names, but Weak, Moderate,
and Strong can occur in both uniform and layered cases. The selectable
state is therefore the combination of sediment arm and label, not the
label alone.

The control is a two-arm multi-select: picking "Strong" in the uniform
arm and nothing in the layered arm selects uniform-Strong only;
picking "Strong" in both arms selects both, and the scenario summary
says so ("Strong — uniform and layered"). Helper text states that the
same word means different built profiles in the two arms. The
letter-coded profile refinement (five uniform values, lettered layered
profiles) is reserved as a collapsed "Advanced" group, disabled in
v0.3 pending R-2.

### 3.3 Sediment depth (FR-S3) and density (FR-S4)

Depth: multi-select over 3 m, 5 m, 10 m (all by default). Density:
multi-select over Dense, Medium, Loose (all by default).

### 3.4 Displacement window (FR-S5)

Primary mode: **Fault slip at depth (m)** — a min–max pair over the
modeled range (approximately 0–5 m), inclusive at both ends, with the
export's actual recorded range and recording step (~0.05 m) stated
beside the control. Entering only a maximum sets the window to 0–max,
matching the "up to X m" phrasing FR-S6's default rationale cites.

**Default: no active window (D-22, Proposed).** The default and reset
state leaves the window inactive — the scenario summary reads "slip:
any" — and matches every recorded stage (GS-0's 346,834). A window
becomes active only when the user sets an endpoint or enters offset
mode (whose converted windows are always active). An entered window
applies literally: the recorded final states sit slightly above 5 m
(≈5.013 m in the current export), so a hand-typed 0–5 m window
excludes them. The control's maximum selectable value is therefore
the export's actual recorded maximum slip (≈5.0135 m currently,
data-version dependent) — entering it captures the final states —
while FR-S5's "approximately 0–5 m" stays as the descriptive label
beside the control. With no active window, one state per trial uses each trial's
actual final recorded state, never an intersection with any window
(FR-S6).

### 3.5 Offset-entry mode and conversion assist (FR-S5)

A clearly separated second mode: **Anticipated vertical surface
offset (m)**. Switching modes never silently converts a typed value.
In offset mode the assist panel shows, for each selected dip, the
converted slip window, the regression used (the glossary's
back-projection relationship), and an in-range / partly-out-of-range /
out-of-range flag per dip. Copy in §5.6.

Offset-entry mode accepts an anticipated maximum vertical surface offset.
It represents an offset range from 0 m to the entered maximum. For
each selected dip, the product converts both endpoints into that
dip's fault-slip window.

### 3.6 Multi-dip conversion rule (D-3, Proposed)

With several dips selected in offset mode, the product applies a
**separate converted slip window per dip**: each simulation is matched
against the window converted for its own dip, and the result is the
union of those per-dip matches. Rationale: the conversion is
dip-specific by construction, and one common window would mix
conversions the research group never co-validated; it also reproduces
US-1's narrative exactly (30° partly out of range while 40° is
covered, each flagged individually). Direct-slip mode is unaffected:
one window applies to all dips.

### 3.7 Population, scarp filter, family view, reset

- **Population (FR-S6):** a two-option switch, "All model stages in
  the slip window" (default) / "One state per simulation trial," with
  the explainer of §5.3 one tap away. The active population is named
  in the scenario summary, always; with no active window (§3.4) the
  all-stages token reads "all recorded stages", since there is no
  window to cite. For one state per trial, the
  per-trial state is selected from the slip window alone — or, with
  no active window, it is the trial's final recorded state (§3.4,
  FR-S6) — and every other condition, including the scarp-type
  filter, then applies to the selected states.
- **Scarp-type filter (FR-S7):** multi-select over the six types in
  canonical order and colors (FR-G2); default all; labeled "Resulting
  scarp type (a model output, not a site input)." With all six
  selected (the default), the control applies **no scarp-type
  filter**: unclassified records stay in the matching population
  (§4.3). Deselecting any type restricts matches to records labeled
  with a selected type, which excludes unclassified records. The
  summary's token for the default state is "all scarp types (no
  filter)".
- **Scarp-family view (D-13, Proposed):** a display toggle labeled
  **"Group collapse variants"** available wherever scarp types color a
  chart (scenario results and the morphology page). On, it folds each
  collapse variant into its base type, colors with the three base
  hues, and retains text identification (FR-G2). Default off. On the
  scenario page the toggle is available only while all six types are
  selected; a partial scarp-type filter disables it ("Family grouping
  needs all six types") so a fold can never silently mix filtered and
  unfiltered variants. The
  remaining presentation details FR-G2 defers — fill opacity over
  white, overlay conventions — are adopted by citation from the
  dashboards' established visual-identity rules (ADR-0007 and the
  visual-identity note).
- **Reset (FR-S8):** one action restoring every scenario control
  (§3.1–§3.8) to the full-ensemble default — entry mode, population,
  the window to its inactive state (§3.4) and, when inverse mode
  ships, the inverse-mode switch.

### 3.8 Inverse mode (FR-X2, P2)

A mode switch, "Start from an observed measurement": the user enters a
range for one or more of scarp height, deformation-zone width, scarp
dip; results show distributions of the modeled input conditions
(§4.8). Forward controls remain available as narrowing filters. The
results header always reads "Simulation conditions consistent with the
selected observation." Magnitude is never an input (FR-G1).

---

## 4. Scenario page: results

Serves: FR-O1–O6, C2, C3, FR-G1–G3.

### 4.1 Measurement views (FR-O1)

Three measurement panels — scarp height, deformation-zone width,
scarp dip — each offering:

- a **histogram** of matching valid measurements;
- a **cumulative view** (empirical cumulative distribution) with a
  percentile read-off: selecting a probability shows the value, and
  the median and 84th percentile are pre-marked;
- **N**, the matching valid-measurement count, displayed at the panel
  head at all times.

FR-O1's prominently displayed record count is served twice over: the
always-visible scenario summary carries the matching-record count
(§3), and the panel head's N is the valid-measurement count among
those records — FR-O2's valid count. The two differ exactly by the
panel's excluded-null count (§4.2).

Default measurement on load: scarp height; the other panels are one
action away (tabs or stacked sections — final arrangement is visual
design, not a product decision). The deformation-zone-width panel
always carries the width-scope note of §5.7. Binning: automatic bin
width scaled to the matching range and count, with the bin rule stated in the
panel's info note; axes linear by default; deformation-zone width may
offer a log scale toggle where the matched range spans more than two
decades. A fourth panel slot is reserved for Us − Ud (D-20, out of the
MVP).

### 4.2 Statistics table (FR-O2)

One table per measurement, rendered in every state with matching
records (§4.5; it is also the accessible alternative required by
NFR-5): valid count; excluded null count;
median; 16th and 84th percentiles; minimum; maximum; mean; standard
deviation. Displayed values round to the D-23 precisions — scarp
height and fault slip 0.01 m; deformation-zone width 0.1 m; scarp
dip 1° (provisional data, D-5); counts exact; shares whole
percentages — and the §10.1 note binds each displayed value to the
correspondingly rounded pipeline reference. Headed by the statistics
framing line of §5.5 (statistics of matching simulation records,
never a recommended design value).

### 4.3 Unclassified records (D-12, Proposed)

Records without a scarp-type label — each trial's zero-slip initial
stage, 3,434 in all — are ordinary members of the matching
population: the default "all scarp types" selection applies no
scarp-type filter (§3.7), so they count toward the matching records
and are included in downloads (§6.1). The default empty scenario
therefore matches the full 346,834-record ensemble (GS-0). In the
archive the zero-slip stages carry no valid scarp-height,
deformation-zone-width, or scarp-dip measurement, so they never enter
measurement statistics; they appear only in the matching-record count
and in each panel's excluded-null count (§4.2).

They are excluded from scarp-type breakdowns, class-colored displays,
the scarp-type filter's counts, and dominance (§6.4); deselecting any
type excludes them from the matching population (§3.7). When any are
in the matching population, the statistics table adds one line:
"Unclassified records excluded from scarp-type views: X (zero-slip
initial stages)." If a future view draws them, they render neutral
gray, listed last (FR-G2).

### 4.4 Field overlay (FR-O5, D-18 Proposed)

Off by default; one switch, "Compare with field measurements (past
earthquakes)." On:

- field marks render black (FR-G2/FR-O5), visually distinct from
  simulation marks, labeled **"Analogous, not identical"** with the
  source named per mark group;
- the default set is the project's established labeled event set for
  the displayed measurement, with "show all field measurements" one
  action away;
- the per-source analogue map is fixed as: scarp height ↔ FDHI
  vertical separation, SURE's scarp-height measurement, and Kern
  County's vertical scarp-height values; width ↔ FDHI fault-zone
  width, Kern County deformation-zone width, SURE fault-normal
  component (a displacement quantity, not a width; labeled as a
  limited comparison per FR-O5) — each labeled with its own name,
  never pooled into one series;
- width overlays default to the paper's less-than-50-metre criterion
  with the full-range toggle and its explanation (§5.7);
- for scarp dip, the switch is disabled with the note "Field sources
  provide no comparable scarp-dip measurement."

### 4.5 Small, empty, and partial results (FR-O3, D-11 Proposed)

- **N < 30 valid** for a displayed measurement: a prominent warning
  (§5.8) accompanies the panel.
- **N < 10 valid:** the distribution chart is suppressed; the
  statistics table and the applicable §5.8 notice (the suppression
  notice, per the precedence rule below) remain.
- **No matching records:** the results area is replaced by the
  empty-state explainer. The product computes the single-condition
  diagnostic FR-O3 requires: for each selected condition in turn, it
  tests whether relaxing that condition alone yields matches, and
  names those that do ("Relaxing sediment depth alone would produce
  matches."). Diagnosing combinations beyond single conditions is out
  of scope for v0.3 and recorded here as the PDD-defined rule.
- **Matching records, but no valid measurement** in the displayed
  panel (reachable: a slip window topping out below the first
  recorded nonzero stage — first stages sit at ≈0.052–0.057 m, so a
  0–0.04 m window qualifies — matches only zero-slip stages, §4.3):
  the
  panel shows the no-valid-measurement notice of §5.8 — never the
  no-match explainer, because records do match — and the statistics
  table renders with valid count 0 and the excluded-null count.
- **Partial coverage** (an out-of-range converted window, FR-S5): the
  per-dip flag of §3.5 plus a results-level note (§5.6); never a
  silent clip.

FR-O3 also requires the matching-record count to accompany every
small, empty, or partly covered result; the always-visible scenario
summary's matching-record count (§3) satisfies this everywhere.
Exactly one §5.8 result notice shows at a time: zero valid with
matching records shows the no-valid-measurement notice; 1–9 valid
shows the suppression notice; 10–29 valid shows the small-result
warning.

### 4.6 Low-slip caveat (D-4, Interim)

No automatic filtering. When an active window includes slip below
0.5 m, the results carry the low-slip caveat of §5.9. The no-window
default state (§3.4) does not fire the caveat: §5.9's copy presupposes
a user-chosen window, and whether the full-ensemble view needs its own
notice joins the open R-3 questions. The threshold
and treatment are the research group's open decision (R-3); 0.5 m is
an interim display trigger only. It covers the Monoclinal- and
Pressure-Ridge-family plotting start values recovered from the paper
(0.25–0.40 m) but not the Simple families' (0.65 m and 1.85 m) —
whether those need a higher or per-type trigger is part of the open
R-3 decision. The trigger is never presented to readers as a validity
boundary.

### 4.7 Kern County worked example (FR-O6, D-6 Open)

A preset entry — "Worked example: Kern County (1952)" — loads dip
30°, the Pressure Ridge scarp type (fixed by FR-O6), the
deformation-zone-width panel, the field overlay on with the Kern
County source, and a three-step annotated walkthrough: (1) the
scenario and why these inputs; (2) reading the simulated distribution
against the field widths; (3) what the comparison does and does not
establish (§5.7's framing). D-6 decides only the exact family and
slip-cap filter and the field-data group; the preset ships only after
it.

### 4.8 Inverse-mode results (FR-X2, P2)

For the matching simulations: distribution panels for fault dip,
sediment strength arm and label, sediment density, sediment depth,
and fault slip — the same chart grammar as §4.1, headed by the
consistent-with-observation framing (§5.10). Each condition panel's
N is the matching-record count itself: condition values are never
null, so the excluded-null count is always zero and the two counts of
§3 coincide. The §4.5 tiers apply with that N. The accessible
alternative for condition charts is a per-value count-and-share
table — FR-O2's statistic set applies to measurements, not
conditions. No map from conditions back to "your site" is ever
drawn.

---

## 5. Copy deck

Serves: CR-1–CR-10, FR-G3, FR-G4. These are the canonical reader-facing
texts; placeholders in brackets. All texts here require research-group
approval before public release (CR-10); the glossary-link map is in
§5.11.

### 5.1 Standing disclaimer (CR-4; D-10 Open)

Full text, reachable from every product surface, short form near
results (§5.2):

> Ground Rupture Explorer is a research tool and may be revised as the
> research develops. It is provided without warranty, subject to
> [the project's liability limitations — text pending, D-10]. It shows
> conditional results from a published computer-simulation ensemble.
> It does not provide earthquake occurrence rates, annual
> probabilities, return periods, probability-of-exceedance results,
> site-specific predictions, or a probabilistic fault-displacement
> hazard analysis (PFDHA). Results must be interpreted by qualified
> professionals using appropriate site investigation, applicable
> regulations, and relevant engineering guidance.

### 5.2 Short disclaimer

> Research tool: simulated results, not site predictions. Interpret
> with professional judgment. [Full disclaimer →]

### 5.3 Population explainer (FR-S6)

> **All model stages in the slip window** counts every recorded stage
> of every matching simulation inside your slip range — the
> measurements recorded at any stage within the range; with no slip
> window set, it counts every recorded stage. **One state per
> trial** counts only the last stage inside the window for each
> simulation — the measurements at the upper end of your range. With
> no slip window set, one state per trial is each simulation's final
> recorded state (approximately 5 m of slip). The two populations
> answer different questions and are never mixed.

### 5.4 Scarp-dip provisional notice (FR-O4, D-5)

> Provisional data: scarp-dip values await a correction from the
> research group; the largest errors are concentrated in the Simple
> scarp types. Treat scarp-dip results as provisional.

### 5.5 Statistics framing (CR-5)

> These are statistics of the matching simulation records. The median
> is a typical result among them; the 84th percentile is a commonly
> used higher fractile in deterministic engineering practice. No
> statistic here is a recommended design value — selecting a design
> value remains the responsibility of the engineer of record.

### 5.6 Conversion assist (FR-S5, D-3)

> You entered an anticipated vertical surface offset of {X} m. For
> each selected fault dip, this converts to the fault slip at depth
> shown here, using the ensemble's tested dip-specific relationship.
> The conversion assumes scarp height is approximately equal to
> vertical surface displacement — closest for Simple and Monoclinal
> scarps; Pressure Ridge scarps stand higher than the fault's vertical
> displacement, so the conversion tends to overstate slip where they
> dominate.

Per-dip out-of-range line:

> {Dip}°: converted slip ≈ {Y} m — beyond the modeled range
> (approximately 0–5 m). Coverage for this dip is partial; matching
> simulations exist only up to the modeled maximum (≈5 m of slip).

### 5.7 Field-overlay framing (CR-6, FR-O5)

> Field measurements (black): **analogous, not identical.** Field and
> simulated values represent related but non-identical quantities;
> each field source is named with its own measure. Width overlays
> default to measurements under the paper's 50 m criterion; larger
> field widths may include distributed, multi-strand deformation the
> model does not represent. [Show all field widths]

Width-scope note (CR-8), shown with the deformation-zone-width panel
in its default view, overlay on or off:

> Deformation-zone width measures the main modeled rupture zone. Real
> earthquakes can also produce separate deformation away from the main
> trace, which the model does not represent.

### 5.8 Small and empty results (FR-O3, D-11)

> Only {N} valid measurements match this scenario — too few for a
> reliable distribution. Interpret with caution.

> Fewer than 10 valid measurements match — too few for a reliable
> distribution. Showing the statistics table only; interpret with
> caution.

> {X} simulation records match this scenario, but none has a valid
> {measurement} value — no distribution can be computed. The records
> appear in the excluded count of the statistics table.

> No simulations match this scenario. Relaxing any one of
> {condition(s)} alone would produce matches.

### 5.9 Low-slip caveat (D-4, Interim)

> Your window includes very small slip values, where automated
> measurements can be less reliable. The research group is reviewing
> measurement reliability at low slip; treat results near zero slip
> with extra caution.

### 5.10 Inverse-search framing (FR-X2)

> Simulation conditions consistent with the selected observation.
> Similar surface measurements can arise from different combinations
> of modeled conditions; these results do not infer, estimate, or
> predict the actual conditions at any site.

### 5.11 Labels, units, and glossary links (FR-G3, CR-3, CR-7)

Canonical labels: Scarp height (m) · Deformation-zone width (m) ·
Scarp dip (°) · Fault dip (°) · Fault slip at depth (m) · Anticipated
vertical surface offset (m) · Sediment depth (m) · Sediment density ·
Sediment strength · Resulting scarp type.

First-use glossary links on product surfaces (site glossary anchors):
scarp height `#scarp-height` · deformation-zone width `#dzw` · scarp
dip `#scarp-dip` · fault dip `#fault-dip` · fault slip `#slip` ·
sediment strength and cohesion `#sediment-strength`, `#cohesion` ·
scarp types `#scarp-classes` · back-projection `#back-projection` ·
DEM `#dem` · derived magnitude `#magnitude` · vertical separation
`#vertical-separation` · fault-zone width `#fzw` · fault-normal
component `#fnc` · SURE `#sure` · Kern County `#kern-county-1952`.
Glossary additions needed before launch: PFDHA; engineer of record
(or an in-context gloss); and the FDHI entry's spelling aligned to
the singular "Fault Displacement Hazard Initiative" (CR-7's rule:
add the entry or gloss in place).

### 5.12 Morphology descriptions (FR-E1; research-group review required)

> **Monoclinal** — the surface bends into a smooth ramp or flexure
> as shearing spreads through the sediment, with no single clean
> break.
> **Monoclinal Collapse** — the same ramp after its steepened face
> has failed, slumping into a degraded step.
> **Pressure Ridge** — material is pushed up and ahead of the fault
> into a mound at the scarp front; the scarp stands higher than the
> fault's own vertical displacement.
> **Pressure Ridge Collapse** — the ridge's steep face has slumped or
> crumbled, leaving a degraded mound.
> **Simple** — a clean, steep scarp face: the surface breaks along a
> well-defined step.
> **Simple Collapse** — the steep face has failed and crumbled,
> leaving debris at its base.

### 5.13 Measurement explanation (FR-E2)

> Every simulated land surface was measured automatically. A
> computer-vision model locates the
> scarp in each recorded stage and reads off scarp height,
> deformation-zone width, and scarp dip — the same procedure for all
> 346,834 recorded stages. These are measurements of computer
> simulations, not of any real site, and a small share of stages
> yields no valid measurement; those appear in the excluded-null
> counts. [Figure reference to the paper's measurement figure;
> author-supplied animation slot, R-14.]

---

## 6. Downloads, citation, and provenance

Serves: FR-D1–D4, C4, C5, DR-2.

### 6.1 Download package (FR-D1)

One action, "Download this result," producing the matching simulation
records (CSV at minimum) and the summary-statistics table (the FR-O2
set per displayed measurement), plus a provenance text carrying, in
this order: paper citation; DesignSafe DOIs; software version;
data-export version and date; the full scenario settings in the
scenario summary's wording; the population; the matching-record count
and each displayed measurement's valid-measurement N; the generation
date; and every active caveat (scarp-dip provisional notice, low-slip
caveat, partial-coverage note).

Field measurements shown in the overlay are not included in the scenario
download. The overlay identifies the source and provides links or
citations for obtaining the field data separately.

### 6.2 File naming

Human-sortable and self-describing:
`ground-rupture-explorer_{scenario-slug}_{population}_{data-version}_
{date}` — the slug built from the scenario summary's settings
portion, excluding the matching-record count and the population
(which has its own token). Exact slug rules are presentation detail
left to implementation.

### 6.3 Chart export (FR-D2, P2; D-14 Proposed)

An exported chart image carries a rendered caption strip: product
name; the displayed measurement and its unit; the one-line scenario
summary (which always names the population, §3.7); the count line
"N = {valid} valid measurements of {matching} matching records
({excluded} excluded null)"; software and data-export versions; and
"Cite: Chiama et al. (2025)" with the pointer to the full citation.
The
export action pairs the image with the §6.1 provenance text.

### 6.4 Animation offer and dominance (FR-D4, P2; D-7 Proposed)

Dominance is computed over classified matching records only (PRD
FR-D4): every share, including the 30 % floor, uses the
classified-record denominator, and the reader-facing copy names it
("Pressure Ridge — 72 % of classified matching records"). Rule: the
**dominant type** is the most frequent scarp type among classified
matching records; the offer lists it together with any other type
whose share is within 10 percentage points of it (ties included), up
to three types in descending share; a tie at the three-type cap is
resolved by canonical order (FR-G2). When the most frequent type's
share is below 30 %, or fewer than 20 classified records match, no
type is treated as dominant and the offer shows the full six-type
menu instead; when zero classified records match, the offer is
suppressed entirely (no scarp formed in the matching records).
Dominance and offers ignore the family-view toggle and always name
the six types (§3.7). Animations come from the morphology
library (§8.2) and are introduced with: "An illustrative example of
this scarp type — not a visualization of your scenario."

---

## 7. Sharing and versioning

Serves: FR-X1 (P2), FR-G4, DR-2.

### 7.1 Shared links

The URL restores: dips; sediment selections (arm and label); sediment
depth; sediment density; displacement window and entry mode (with the
entered offset value in offset mode); population; scarp filter;
family-view toggle; selected measurement and view; field-overlay
state. When inverse mode ships (FR-X2), its observed-measurement
ranges and mode switch join this list. Opening a link computes
results with the currently published software and data versions.

### 7.2 Version display and notice (D-15, Proposed)

Links carry no version stamp when they first ship (P2). The page
footer and every download always name the current software version
and data-export version, so two people comparing a shared link across
releases can see why results differ. If a later release adds a
version stamp to links, a notice appears when the stamp differs from
the current versions ("Created under software X / data Y; showing
current Z / W."); nothing is recomputed against old versions.

---

## 8. Education and media surfaces

Serves: FR-E1–E3, C9, C11, NFR-6, R-12–R-15.

### 8.1 Morphology page (FR-E1)

One section per scarp type, in canonical order and colors, each with:
the §5.12 description; a representative model snapshot; the glossary
link; the animation slot; and an optional field-photograph slot. The
family toggle groups the page into the three base types. Photograph
slots render only when permission is documented (NFR-6, R-12);
during development they may hold third-party photos, which are
removed or cleared before any public release.

### 8.2 Animation library (D-8, Open)

One library serves the morphology page and the §6.4 offers. Each
entry: scarp type, source attribution, and a one-line caption. Where
a type has no approved animation, the slot states "Animation not yet
available" — the page never implies complete coverage (R-13). The
research group decides whether all six are required for release.

### 8.3 How the measurements are made (FR-E2)

A short page: the §5.13 text, the paper's measurement figure
reference, and the animation slot (R-14). Links from every statistics
table ("How were these measured?").

### 8.4 Contact and requests (FR-E3, P3)

The research group's preferred channel; links to the site's existing
resources; repository links added only when the group supplies
approved URLs (R-15).

---

## 9. Product quality bars

Serves: NFR-3, NFR-4, NFR-5, DR-6.

### 9.1 Performance budgets (D-9, Proposed)

Reference conditions: a mid-range laptop (2020 or later), cold cache,
10 Mbps connection; and the same laptop warm-cache for repeat visits.

| Budget | Target |
|---|---|
| Initial data payload for the scenario page | ≤ 4 MB compressed |
| First meaningful render (scenario page, cold cache) | ≤ 2.0 s |
| Repeat visit render (warm cache) | ≤ 1.0 s |
| Scenario change → updated results, 95th percentile | ≤ 200 ms |

**First meaningful render** is the point at which the results for the
scenario the page opens with are on screen: for the measurement shown
on load, its statistics table and its chart in the view the panel
opens with (§4.1–§4.2). Where §4.5 suppresses the chart or finds no
valid measurement, its notice stands in for the chart beside the
table; with no matching records, the empty-state explainer replaces
both. A heading, the controls, or a loading indicator alone does not
count. The repeat-visit budget uses the same end point.

The budgets bind the product; how they are met (format, caching,
precomputation) is the HLDD's problem (DR-6). No browser-based Python
runtime or comparably heavy environment (NFR-3).

### 9.2 Browser and mobile baseline (D-16, Proposed)

Evergreen Chrome, Edge, Firefox, and Safari versions released within
24 months of each product release; iOS Safari and Android Chrome in
the same window; no legacy-browser support. Mobile floor: fully
usable at 360 px width, no hover-dependent essentials (NFR-4).

### 9.3 Accessibility target (D-17, Proposed)

WCAG 2.2 AA is the conformance target for the product's new pages;
the NFR-5 list is the project-specific floor on top of it. The
statistics table is the canonical text alternative for every
measurement chart; inverse-mode condition charts use §4.8's per-value
count-and-share table. Chart colors follow FR-G2, including its
never-color-alone rule.

### 9.4 Releases

A product release is a site release that changes the product; each
one updates the displayed software version, and a data refresh
updates the displayed data-export version (DR-2). Both always appear
in the footer and downloads. Asset changes follow the site's
cache-busting convention (NFR-7).

---

## 10. Acceptance and success

Serves: §2.2 (deferral), US-1–US-5, DR-1, NFR-7.

### 10.1 Success criteria

- **SC-1 (core workflow):** a practicing engineer new to the product
  completes US-1 end to end — scenario, conversion, results,
  download — without assistance or documentation.
- **SC-2 (download reproducibility):** A reviewer can use a downloaded
  result package to identify the scenario settings, data-export version,
  matching-record count, and every FR-O2 statistic used in the result.
- **SC-3 (correctness):** displayed statistics equal the pipeline's
  reference results for every golden scenario (§10.2), exactly.
- **SC-4 (performance):** the §9.1 budgets hold under the stated
  reference conditions.
- **SC-5 (candor):** every applicable CR-8 caveat — scarp-dip notice,
  population context, small/empty/partial warnings, width-scope
  limitation, magnitude warning — is present in the default view of
  any result it applies to, never relegated to footnotes; for the
  population, the always-visible population name in the scenario
  summary with its explainer one action away satisfies this.
- **SC-6 (site integrity):** the strict build stays green and the
  existing dashboards, navigation, citation pages, and deployment are
  unaffected by the release (NFR-7).
- **SC-7 (scientific sign-off):** the research group has approved the
  reader-facing texts of §5 (CR-10).

> The pipeline's statistical definitions and full-precision reference
values are authoritative. Product tests must reproduce reference values
within a defined numerical tolerance appropriate to the calculation.
Values shown to users are rounded consistently to the PDD-defined
display precision; displayed values must match the correspondingly
rounded pipeline reference values.

### 10.2 Golden scenarios

Acceptance anchors, each pinned in the data pipeline's reference
results (DR-1); the PDD fixes the scenarios, the pipeline fixes the
numbers.

| ID | Scenario | What it proves |
|---|---|---|
| GS-0 | Empty scenario (no active slip window), default population | Full-ensemble counts: 346,834 matching records including the 3,434 unclassified zero-slip stages ("all scarp types" = no filter, §4.3); per-measurement valid and excluded-null counts match the reference. |
| GS-1 | US-1: dips {30°, 40°}, Strong (uniform and layered), offset mode 3 m | Per-dip conversion (D-3): 30° flagged beyond the modeled range, 40° in range; counts and statistics match the reference. |
| GS-2 | Moderate strength (both arms), dip 20°, depth 3 m, Dense, one state per trial | Warning tier: 18 valid measurements — the small-result warning fires while the chart still renders. |
| GS-3 | Kern preset (after D-6) | The worked example reproduces the research group's chosen field group and filter. |
| GS-4 | Alternating Strong–Weak + depth 3 m | Empty result: the diagnostic names both sediment strength and sediment depth — relaxing either alone yields matches. |
| GS-5 | Alternating Strong–Weak, one state per trial | Suppression tier: 9 valid measurements — the chart is suppressed and the statistics table remains. |
| GS-6 | Slip window 0–0.04 m, all other controls default | Count-vs-validity split (§4.5): 3,434 matching records — the zero-slip stages — with zero valid measurements in every panel; the no-valid-measurement notice appears, never the no-match diagnostic; statistics tables show valid 0, excluded-null 3,434. |
| GS-7 | One state per simulation trial, no active slip window | FR-S6's no-window rule: 3,434 matching records — each trial's actual final recorded state (slip ≈ 5.013 m), never an intersection with any window; per-measurement valid counts match the reference. |

### 10.3 Acceptance walkthroughs

US-1 through US-3 are executed as scripted demos against the golden
scenarios before release; US-4 and US-5 join when their capabilities
ship. Each walkthrough's pass condition is its story's "Expected
result" paragraph plus the relevant SC rows.

---

## 11. Explicitly not in this document

Owned by the HLDD and its ADRs (PRD §2.3, FR-G5, DR-1/DR-6, NFR-2,
NFR-8): the technical platform; per-surface link/embed/native/hybrid
implementation choices; data formats, row-level vs precomputed
structures, caching, and refresh mechanics; the toolchain and
repository layout; and how the §9.1 budgets are met. Owned by the
research group: every row of the register marked Open with a
research-group owner. Owned by the PRD: all requirements — this
document adds definition, never new obligations.
