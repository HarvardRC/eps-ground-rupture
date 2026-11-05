# Ground Rupture Explorer — product definition document

**Status:** first draft for owner review (2026-10-15).

This product definition document (PDD) is the second of the project's
staged documents (PRD → PDD → HLDD). It has two parts:

<!-- toc -->

- [1. Decision register](#1-decision-register)
- [2. Product structure and navigation](#2-product-structure-and-navigation)
  * [2.1 Page inventory](#21-page-inventory)
  * [2.2 Entry point (D-2, Decided 2026-10-28)](#22-entry-point-d-2-decided-2026-10-28)
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
  * [4.9 Display preferences (FR-G6, P2)](#49-display-preferences-fr-g6-p2)
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
  * [7.3 Reload recovery (MVP)](#73-reload-recovery-mvp)
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
until the owner decides), **Superseded** (a later decision replaces
the earlier proposal or rule).

---

## 1. Decision register

The single tracking table for every decision the PRD defers, plus the
§9.5 decisions. The PDD is complete when no row is blank. Sections
named in the last column carry the detail.

| ID | Decision | Source (PRD) | Owner | Status | Resolution / proposal |
|---|---|---|---|---|---|
| D-1 | P1 is the MVP and release target (v0.4). | §2.2, §9.5-1 | Product owner | Decided (2026-10-15) | Yes. Release target renumbered from v0.3 by the owner's decision of 2026-11-01. |
| D-2 | Site entry point (the name is decided: Ground Rupture Explorer, 2026-10-15). | §9.5-2, R-11 | Owner + research group | Decided (2026-10-28) | §2.2; decided by the product owner alone, taking responsibility. |
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
| D-16 | Browser and mobile baseline. | NFR-4 | Product owner | Proposed | Evergreen 12-month window; 360 px floor; §9.2. Browser window amended at owner review, 2026-11-01. |
| D-17 | Accessibility conformance target. | NFR-5 | Product owner | Proposed | WCAG 2.2 AA for new pages; §9.3. |
| D-18 | Field-overlay default set and per-source analogue map. | FR-O5 | Owner, research-group review | Proposed | §4.4. |
| D-19 | Native full-dataset exploration panel in v0.4. | FR-G5, C8 | Product owner | Proposed | None — no documented gap; the five dashboards serve C8; recorded gap process in §2.4. |
| D-20 | Us − Ud as a fourth displayed measurement. | FR-O1, R-10 | Owner + research group | Open | Out of the MVP; the results page reserves the slot; §4.1. |
| D-21 | Success criteria and acceptance walkthroughs. | §2.2 | Product owner | Proposed | §10. |
| D-22 | Default displacement-window state. | FR-S5, FR-S6, FR-S8 | Product owner | Superseded (2026-11-03) | The earlier no-active-window default ("slip: any") is replaced by D-31's editable minimum 0 m and required maximum. The no-window numerical reference cases remain calculation baselines; §3.4 and §10.2. |
| D-23 | Reader-facing display precision per quantity. | FR-O2, §10.1 note | Product owner | Proposed | Scarp height and slip 0.01 m; width 0.1 m; scarp dip 1° (D-5 provisionality); counts exact; shares whole percent; §4.2. |
| D-24 | Independent display preferences, including small laptop windows and later tablet and phone views. | FR-G6, C12, NFR-4 | Product owner | Decided (2026-11-03) | Scope agreed: P2 reader choice of visible result components and display size and layout within the existing application; §4.9. Until then, §9.1 uses a temporary 1280 × 1080 measurement window. The detailed P2 choices listed in §4.9 remain open before implementation. |
| D-25 | Guided first-use scenario journey. | §5.1, C1, CR-1 | Product owner | Decided (2026-11-03) | Sequence and introductory copy agreed: understand purpose → describe site conditions → choose assumed displacement → review scenario → explore and interpret matching results. MVP scope; §2.3 records the approved introduction, D-26–D-36, and the first implementation scope. |
| D-26 | Explicit site-condition selections. | FR-S1–S4, FR-S8 | Product owner | Decided (2026-11-03) | Fresh site conditions are unanswered and require one or more values. Select all selects every value as a convenience; it is not advice for uncertainty. Empty selections remain incomplete. §2.3. |
| D-27 | Review before results change. | C1, FR-G3, NFR-3 | Product owner | Decided (2026-11-03) | Site-condition and displacement edits remain a draft until Review scenario → Show results. Retained results stay associated with the previously confirmed scenario. §2.3; step navigation follows D-30 and refinements follow D-34. The §2.3 supplement bounds initial browser navigation and recovery at /explore/. |
| D-28 | Preserve entries across displacement-mode switches. | FR-S5 | Product owner | Decided (2026-11-03) | Keep fault-slip and surface-offset entries separately within the draft. Switching back restores that mode's entries; only the selected mode contributes to the scenario. No silent conversion or erasure. §3.5; restarting follows D-29. The §2.3 supplement bounds initial recovery at /explore/. |
| D-29 | Discard edits or start a new scenario. | FR-S8 | Product owner | Decided (2026-11-03) | Discard changes returns to the last confirmed scenario and its results, restoring both modes' entries as they stood at confirmation. Start a new scenario clears the reader's entries in both modes and current results, restores fresh defaults under D-31, then returns to unanswered site conditions. §2.3 and §3.7. |
| D-30 | Preserve drafts while moving between steps. | C1, FR-G3 | Product owner | Decided (2026-11-03) | Back and revisiting input steps preserve the draft. Review requires complete, valid inputs. Returning to confirmed results preserves edits and shows You have unapplied changes with a return-to-review action while edits remain. The §2.3 supplement bounds initial browser Back/Forward and recovery at /explore/. |
| D-31 | Explicit movement entries, maximum shortcuts, and immediate range guidance. | FR-S5, FR-S8 | Product owner | Decided (2026-11-03) | Editable slip minimum 0 m; blank, required maxima; typing and mouse adjustment; slip shortcut sets exactly 5 m; immediate red slip guidance above 5 m; offset guidance and maximum shortcut use selected fault angles. Coverage warnings persist on review. §3.4–§3.5 distinguish the accepted examples from agent-selected initial step-size and multi-angle shortcut choices under §2.3. |
| D-32 | Scenario review presentation. | C1, FR-S5, FR-S6, FR-G3 | Product owner | Decided (2026-11-03) | Site-condition and movement summaries with Edit actions; entered ranges distinct from per-angle conversions; visible conversion caveat and coverage warnings; plain explanation of contributing stages; Back and Show results. §2.3. The example values are illustrative; D-34 subsequently defines refinement confirmation. |
| D-33 | First version of the guided results presentation. | FR-O1–O4, FR-G3, FR-D1, CR-4–CR-5 | Product owner | Decided (2026-11-04) | Initial populated-results layout accepted: visible confirmed scenario, counts and warnings; measurement tabs; chart and full statistics; interpretation and revision/download actions. §4.1. Invented values, omitted states, and unfinished refinement, revision, and download flows are not accepted implementations. |
| D-34 | Result refinements use the scenario's draft and confirmation flow. | FR-S6–S8, FR-G3 | Product owner | Decided (2026-11-04) | Refine results opens population and scarp-type controls. Their edits join the draft and apply together through Review scenario → Show results; review requires one or more scarp types. Discard restores confirmed refinements; Start a new scenario restores all-stages/all-types defaults. Measurement and chart-view choices take effect immediately. §2.3 and §3.7; D-35 accepts the first control presentation. |
| D-35 | First refinement presentation and stage explanation. | FR-S6–S8, FR-G3, CR-3 | Product owner | Decided (2026-11-04) | Refinement layout, stage-choice explanation and example, scarp explanations and schematic illustrations, empty-selection validation, and review/discard flow accepted. §3.7. Invented data and sketches are presentation aids, not scientific validation or accessibility certification. The separate-route implementation supplement in §2.3 distinguishes authorized agent choices from owner decisions. |
| D-36 | Clearer results controls and an optional results walkthrough. | FR-O1, FR-S6–S8, FR-G3, NFR-5 | Product owner | Decided (2026-11-04) | The shared results-controls direction and optional five-stop walkthrough are approved. The owner selected Choice cards for normal browsing, with a short explanatory question for each measurement. §4.1 preserves the draft/review/confirmation boundary and labels detailed integration choices as delegated implementation decisions. |
| D-37 | Sample inputs on the guided introduction. | §5.1, C1 | Product owner | Decided (2026-11-04) | Try sample inputs fills the approved illustrative scenario, completed with 5 m depth and Dense density, and opens site conditions; a non-fresh draft is replaced only after an explicit confirmation. §2.3; the completion values and the replacement rule are agent selections under the §2.3 delegation. D-42 subsequently adds a second named sample and a chooser. |
| D-38 | Same-tab continuity at `/explore/`. | §5.1, FR-S8 | Product owner | Decided (2026-11-04) | Scope delegated to the implementing agent and recorded: same-tab reload and back/forward restoration restore the draft, confirmed settings, step, and display choices and recompute results, with a visible notice; a new tab or later visit starts fresh. §2.3 and §7.3. |
| D-39 | Guided publication path; `/scenario/` paused. | §2.2, R-11 | Product owner | Decided (2026-11-04) | `/explore/` joins the unlisted prototype deployment; a team demonstration and the redistribution-license decision precede advertising it. `/scenario/` stays deployed unlisted without further UX investment and is no longer the activation candidate. §2.3. |
| D-40 | Result-report export. | FR-D1, FR-D2 | Product owner | Decided (2026-11-04) | One self-contained document pairing the §6.1 provenance and scenario summary with rendered charts and statistics; builds on D-14. The owner set it P2; guided task G-13 carries it in the next-phase queue (D-41). §6.5. |
| D-41 | Next-phase queue for the deliberate deferrals. | §2.2 | Product owner | Decided (2026-11-04) | Every deliberate deferral of the guided redesign is queued as the phase after the second increment: the D-39 reconciliation list, family view, shared links, between-visit recovery, scenario import, the result report (G-13), the sample scenarios and stories (D-42: G-14, G-15), remaining browser coverage, and the paused `/scenario/` rework decision. Team availability schedules the phase; it may precede the team demonstration. Advertising still follows D-39. §2.3. |
| D-42 | Two named sample scenarios with stories. | §5.1, C1, CR-10 | Product owner | Decided (2026-11-04) | One chooser offers two named samples: D-37's illustrative scenario, unchanged, and a second anchored to the 1952 M 7.36 Kern County earthquake — fault angles 60° and 70°, maximum vertical surface offset 1.3 m, completion values delegated as in D-37. Each carries a short story and up to two licensed images where suitable verified files exist; values are anchored to the named event's scale, never presented as modeling it. §2.3; guided DDD §10; tasks G-14 and G-15 in the next-phase queue (D-41). D-43 subsequently reworks the presentation. |
| D-43 | Sample presentation rework. | §5.1, C1, CR-10 | Product owner | Decided (2026-11-04) | Reviewing the built result, the owner replaced the two sample buttons with one **Try a prefilled sample** action opening a scale-named listbox; made the replacement confirmation a modal dialog (never a browser dialog, as before); reworded the prefill notice and made it persist across the input steps; put the story panel behind a prominent Where these values come from trigger on both input steps; restored the sequential walk after a fill; prefilled both movement modes (the Kern slip window anchored to Bawden 2001's 1.6–1.9 m, the illustrative delegated); and added CR-10 per-field annotations. §2.3; guided DDD §§10.3–10.4; tasks G-18 and G-19. D-44 subsequently revises the presentation. |
| D-44 | Sample presentation revision after external review. | §5.1, C1, CR-10 | Product owner | Decided (2026-11-05) | Before the G-18 merge, a relayed external review revised the D-43 presentation and the owner adopted it: a preview dialog of two selectable cards named by inputs (Lower fault angles — 30° and 40°, offset up to 3 m; Steeper fault angles — 60° and 70°, offset up to 1.3 m), event context and photographs in the previews, preview without changing the draft, the replacement question as the dialog's next step; the notice gains a "Started from the {sample} sample · Modified" form with background and photos reachable until the draft is replaced; the trigger reads Why these sample values?; the slip prefills stand with Bawden 2001's 1.6 m and 1.9 m framed as two patch estimates used as an example band, plus a visible mode-switch note; the shared story sentence becomes "These examples help you try the tool. They do not reconstruct either earthquake." (CR-10). §2.3; guided DDD §10.5; the revised G-18 and G-19. |
| D-45 | Wording and UX polish from the second external audit. | FR-O1, FR-G3, NFR-5 | Product owner | Decided (2026-11-05) | The owner adopted the audit's wording table (matching simulation stages; measurements used; Missing values (excluded); Estimated fault slip at depth; Your selected range includes; Histogram counts by value range; Exit walkthrough; Download data (ZIP) with a contents description; a plain-language normalization explanation), the results-screen rework (compact summary and critical warnings with View full scenario, chart and measurement choices higher), the Results walkthrough · n of 5 label, help disclosures that add information, a provisional mark on the Scarp dip choice card, physical density ordering, and the overlap and message-truthfulness fixes. Audit: `notes/2026-11-05/explorer-wording-ux-audit.html`. §2.3; guided DDD §11; tasks G-20 and G-21, sequenced after G-19. |
| D-46 | Interpretation of negative scarp heights. | FR-O1, CR-10 | Product owner | Proposed (2026-11-05) | The Kern sample surfaces a −0.02 m scarp height while the description says height above the ground; the data contract retains negative measurements deliberately. The research group is asked for the interpretation; the application keeps showing the data unchanged, and the explanation lands as CR-10 text once the group answers. §2.3. |

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

### 2.2 Entry point (D-2, Decided 2026-10-28)

The scenario page joins the existing site navigation as a top-level
entry named **Scenario explorer**, placed after Dashboards. The page
masthead carries the product name, Ground Rupture Explorer. The
morphology and measurement pages join under the existing explanatory
section of the navigation; Contact joins last. No separate domain, no
separate visual identity: §2.1 of the PRD keeps the product inside the
existing site.

**Parallel guided implementation (2026-11-04).** The owner requested
that the new journey be implemented at a separate route while the
existing scenario page remains available. The implementing agent
selected `/explore/` for that route; `/scenario/` continues to serve
the existing interface. Both live within the existing project site.
The implementation supplement in §2.3 limits the initial new route;
it does not replace the established page or its release requirements.

### 2.3 User journeys

**Agreed first-use sequence (D-25, 2026-11-03).** The scenario page
guides a reader through:

1. Understanding what the tool offers.
2. Describing the site conditions.
3. Choosing an assumed displacement.
4. Reviewing the scenario.
5. Exploring and interpreting the matching results.

This sequence serves the practicing engineer described in PRD §3.1,
who knows the engineering problem but may be unfamiliar with the
simulation data and methods. It is an MVP requirement. The P2
display preferences in §4.9 remain a separate capability.

**Prototype recorded.** The owner has agreed the sequence and
the introduction below, welcomed the prototype's visual direction,
and selected **Focused steps** as the review variant. The
[prototype record](scenario-journey-prototype.md) describes the
screens and links to the saved clickable version. The alternative
Guided page remains in that snapshot for comparison.

**Agreed site-condition behavior (D-26, 2026-11-03).** A fresh
scenario leaves fault angle, sediment depth, sediment density, and
sediment strength and structure unanswered. Each condition is
marked **Required**. The instruction is:

> Choose one or more values for each condition.

- Each condition requires one or more selected values. An empty
  condition shows **Choose one or more values to continue**.
- **Select all** selects and highlights every available value in
  that condition, exactly as individual selection would. It is a
  convenience; do not recommend it because the reader is unsure,
  or suggest that a broad selection is inherently useful.
- The checkbox is unchecked for no selections, mixed for a subset,
  and checked when every value is selected, including when the
  reader selected them individually. Clicking an unchecked or
  mixed checkbox selects all; unchecking it clears that condition.
- Clicking a selected value removes only that value. Removing the
  last value leaves an incomplete draft; it never selects all.
- Sediment strength and structure is one required condition across
  both visible groups. Uniform: Strong alone is valid; choosing a
  value in each group is not required.
- Continue remains available. If a required selection is missing,
  it keeps the reader on the site-conditions stage, shows a specific
  error beside each incomplete condition, and moves focus to the
  first incomplete condition. No error appears before an attempt
  to continue. Selecting a value clears that condition's error.
  The error wording uses **Choose one or more**, rather than
  recommending Select all as a way to proceed.

**Agreed review and results behavior (D-27, 2026-11-03).** Site
conditions and assumed displacement being edited form a draft.
The scenario that produced the current
results is the confirmed scenario. A draft becomes confirmed only
through **Review scenario → Show results**, with the required
selections and existing numeric validation satisfied. This applies
to the first scenario and to edits after viewing results. Draft
edits do not recalculate or relabel the previous results. If those
results remain visible, their summary identifies the previously
confirmed scenario, not the draft. In the remaining result
sections, **active scenario** means this confirmed scenario.
D-34 extends the same draft and confirmation to population and
scarp-type selections.

**Agreed displacement-mode behavior (D-28, 2026-11-03).** Switching
between fault slip and surface offset preserves each mode's
entries separately. Only the selected mode contributes to the
draft scenario. [§3.5](#35-offset-entry-mode-and-conversion-assist-fr-s5)
defines this behavior; mode switching does not bypass D-27's review.

**Agreed discard and restart behavior (D-29, 2026-11-03).**
**Discard changes** abandons the draft and returns to the last
confirmed scenario and its results. It therefore requires a
previously confirmed scenario. **Start a new scenario** clears the
reader's scenario choices, including the entries retained for both
displacement modes, and removes the current results. It restores
the fresh defaults: slip minimum 0 m and blank maxima (D-31). It
opens the site-conditions step with unanswered selections (D-26). A new
scenario must pass through review and **Show results** before
results appear again (D-27).

When **Show results** confirms a scenario, remember the entries
in both displacement modes as they stand at that point. **Discard
changes** restores both sets of entries, including the inactive
mode, together with the confirmed mode and site conditions. This
abandons all later draft edits; it does not retain changes made to
the inactive mode. Only the confirmed mode contributes to results
(D-28). The placement of the two actions and presentation when no
confirmed scenario exists remain to be defined.

**Agreed step navigation (D-30, 2026-11-03).**

- The journey's **Back** action and revisiting input steps preserve
  the draft, including entries in both displacement modes. They
  neither apply nor discard edits.
- Every entry to **Review scenario**, including a previously
  reached review step, requires complete site-condition selections
  and valid entries for the selected displacement mode. If the
  draft fails validation, open its first incomplete or invalid
  input step and show the applicable errors. Inactive-mode entries
  do not block review (D-28).
- A reader may return to existing results even while the draft is
  incomplete or invalid. Preserve that draft; show the confirmed
  scenario's results and summary. While unapplied changes remain,
  display **You have unapplied changes** with **Return to review**.
  That action follows the same validation rule as any review entry.
- The notice reflects differences from the last-confirmed draft
  state, including remembered entries in the inactive mode (D-29).
  Merely revisiting a step does not create a change. The order in
  which site-condition values were selected does not matter.
  Restoring all entries to their confirmed state removes the
  notice, as do confirmation or discarding changes.
- Navigating to results never confirms a draft or bypasses
  **Show results**. Results are unavailable before first
  confirmation and after **Start a new scenario** clears them.

These rules cover navigation within the journey. The implementation
supplement below defines the initial `/explore/` navigation and
fresh-start behavior. Full recovery remains a later definition.

**Agreed movement entry (D-31, 2026-11-03).** A fresh draft starts
in fault-slip mode, with a visible, editable minimum of **0 m**
and an unanswered maximum. Offset mode also starts with an
unanswered maximum. The reader must choose a maximum in the active
mode before review. Typing, mouse adjustment, maximum shortcuts,
and immediate range guidance follow §3.4–§3.5. These decisions
replace D-22's proposed no-window default. D-28 still preserves
both modes' entries; D-29 restores the fresh defaults when starting
again.

**Agreed review presentation (D-32, 2026-11-03).** The owner approved
the review-screen example. The heading is **Review your scenario**,
followed by **Check your assumptions before showing results.**
Present the following sections in order:

1. **Site conditions.** Show every selected fault angle, sediment
   depth, density, and strength and structure, with an **Edit**
   action for the section.
2. **Fault movement.** Identify the selected entry mode and the
   reader's assumed range, with an **Edit** action. In offset mode,
   show **Corresponding fault slip at depth** separately, with a
   converted range and coverage indication for each selected angle.
   Show the modeled slip range and explain that conversion is
   approximate: raised ridges at the surface can cause it to
   overestimate slip. Keep applicable movement warnings visible.
3. **What the results will include.** Explain the current population
   in plain language. For **All stages within the slip range**
   (the label adopted in D-34),
   include every recorded stage within the corresponding slip range
   from simulations matching the site conditions. Each simulation
   may contribute more than one stage. Explain that a stage is a
   saved point as fault movement increases, and identify the scarp
   types included. With multiple angles in offset mode, explain
   that each simulation uses its angle's corresponding slip range.

Partial coverage does not shorten the reader's displayed assumption.
State which angles have incomplete coverage, the covered offset
maximum for each, and that results describe only the covered part.
The valid draft may still proceed with that warning (D-31).

**Edit** returns to the corresponding input step while preserving
all draft choices. Its primary action becomes **Return to review**,
which follows D-30's validation. **Back** returns to fault movement.
The review screen's primary action is **Show results**; it confirms
the valid draft and opens its results under D-27.

Approval covers this presentation. The completed example's values
are illustrative, not fresh defaults or approved worked-example
inputs. Its final prototype acknowledgment is not a product screen.
D-35 subsequently accepts the first refinement controls. The
implementation supplement below selects initial movement-button
details; neither decision changes D-3's scientific-review status.

**First results presentation agreed (D-33, 2026-11-04).** The owner
accepted the results-screen example as a first version. §4.1 records
its layout and scope. D-35 subsequently accepts the refinement flow;
the initial candidate uses the existing result-state safeguards and
the shared draft flow. The
[execution record](guided-journey-ip.md#execution-evidence) distinguishes
implemented behavior from remaining verification and later scope.

**Agreed refinement confirmation (D-34, 2026-11-04).** Open
**Refine results** from the results screen to choose contributing
simulation stages and resulting scarp types (§3.7). These choices
join the same draft as site conditions and movement:

- Editing either refinement leaves the existing charts, statistics,
  counts, and summary associated with the confirmed scenario.
  Distinguish the draft refinement selections from that summary.
  Refinement differences also trigger D-30's unapplied-changes
  notice; restoring the confirmed selections removes that
  difference. Selection order does not matter.
- **Review scenario → Show results** confirms all pending changes
  together. Review identifies the draft population and scarp-type
  selection and explains which records they include. Pending site
  and movement edits must pass the existing validation; a refinement
  cannot bypass an incomplete or invalid input step. There is no
  separate **Apply refinements** or automatic result update.
- Deselecting the last scarp type leaves an incomplete draft. Keep
  the empty selection visible and preserve the confirmed results.
  Review requires one or more types; on an attempt with none,
  explain that requirement at the refinement control. Never
  silently select all again or interpret no selection as all types.
- Each confirmation remembers the population and scarp-type
  selection alongside the other scenario entries. **Discard
  changes** restores them to their last-confirmed values too.
- **Start a new scenario** restores the all-stages population and
  all six scarp types, alongside D-26 and D-31's fresh defaults.
  The same refinement defaults apply before the first confirmation.
- Choosing a measurement tab or switching between Distribution
  and Cumulative changes presentation immediately. Neither action
  creates a scenario draft change or requires confirmation.

**First refinement presentation agreed (D-35, 2026-11-04).** The
owner approved the refinement example, including the stage explainer
and its illustrated comparison. §3.7 records the accepted control
layout, empty-selection validation, and review/discard flow.

**Definition still open beyond the first implementation.**
Additional result states, field comparisons, recovery between
visits, and later guidance still need definition or verification;
the second increment below defines sample inputs (D-37) and
same-tab continuity (D-38), and the next phase (D-41) queues the
remaining deferrals. The initial separate-route choices are
explicit in the supplement below. The selected review variant does
not accept every detail of its behavior. D-26–D-36 supersede the
corresponding behavior in the saved full-journey prototype; it is
an earlier snapshot. The journey table and unaffected parts of §3
remain the baseline for the remaining definition. The additive
[guided design](guided-journey-ddd.md) and
[execution plan](guided-journey-ip.md) define the bounded first
implementation separately from the accepted legacy tasks.

**First implementation scope at `/explore/` (2026-11-04).** The
owner authorized autonomous implementation on a separate route. The
following choices were selected by the implementing agent under that
authorization; they are not earlier owner decisions or changes to
the release contract of `/scenario/`. They make the first guided
version concrete while preserving the agreed journey:

- Start with the approved introduction and a fresh draft. Offer
  neither sample-input presets nor scenario import in this version.
  No data values are silently recommended or preselected beyond
  the agreed movement and refinement defaults.
- Keep choices during navigation within the running page. Journey
  steps do not create browser-history entries. Browser Back and
  Forward retain their normal page-navigation meaning; a new page
  load, reload, or return visit starts a fresh scenario. This version
  does not save drafts or confirmed settings between page loads.
  State that limitation in the introduction. The established
  `/scenario/` recovery behavior remains unchanged (§7.3).
- Use the agreed **Start a new scenario** action to clear current
  results and restore unanswered site conditions, slip minimum 0,
  blank maxima, all stages, and all scarp types; open Site conditions.
  **Discard changes** restores every confirmed scenario choice and
  returns to its results. It is available only after confirmation.
- Use **− / +** controls with a 0.1 m increment alongside typing.
  Preserve the existing decimal precision and validity rules.
  For the offset shortcut, choose the smallest coverage maximum
  among all selected fault angles and round down to 0.01 m. Enter
  exactly the value printed on the button. This settles the earlier
  step-size and general shortcut proposals for this version only.
- Supply contextual links to the existing
  [glossary](../../subprojects/mkdocs/docs/glossary.md) and relevant
  [dashboards](../../subprojects/mkdocs/docs/dashboards/distributions.md),
  as requested by the owner. Short hover explanations must also
  be available on keyboard focus and through a touch/click action;
  essential instructions and warnings remain visible. Reference
  links open separately so following them preserves the scenario.
  The owner's follow-up on 2026-11-04 brings floating explanations
  into this candidate. Mark explained terms with a dotted underline.
  Hovering or focusing a term shows a short glossary explanation;
  clicking or tapping keeps it open. Escape, a second activation,
  or clicking elsewhere closes it. Readers can move the pointer
  onto an explanation without losing it. Only one is open at a time.
  Explanations fit within the window and never change scenario
  choices. Longer explanations and the full glossary remain available.
  Text stays readable on narrow screens rather than becoming smaller.
- The first guided version shows simulation results and provides
  real result downloads. Field comparisons and additional chart
  views remain available in the existing explorer and dashboards.
  This candidate does not yet bring field overlays into the guided
  results.

These choices do not waive scientific safeguards, decimal validation,
accessible operation, result provenance, or the requirement to use
real published data for calculated results. Prototype values and
schematic sketches remain identified as illustrations. The old
copy registry is a baseline for the existing page; adding guided
copy does not silently rewrite it or accepted implementation tasks.

**Second increment (D-37–D-39, 2026-11-04).** After walking through
the working candidate, the owner restored sample inputs, delegated
and accepted a continuity rule, and set the publication path. These
amend the first-version scope above; D-26–D-36 and the agreed
journey are unchanged. Width log-scale parity with §4.1 returns in
the same increment as an implementation correction, not a new
decision.

- **Sample inputs (D-37, owner decision).** The introduction offers
  **Try sample inputs** beside the primary action. It fills the
  draft with the approved illustrative scenario — fault angles 30°
  and 40°, Uniform: Strong and Layered: Strong sediment, and a
  maximum vertical surface offset of 3 m — completed, because D-26
  allows no unanswered condition, with sediment depth 5 m and Dense
  density, then opens site conditions so the reader can inspect and
  change every value. The completion values and the replacement
  rule below are agent selections under the standing §2.3
  delegation; the restoration and the originally approved sample
  values are the owner's. Label the values as sample inputs, not
  recommended site values. At 30° the sample's offset extends
  beyond coverage, so the ordinary warning appears; demonstrating
  coverage reporting with the sample is deliberate. The fill is an
  ordinary draft edit under D-27 and D-30: it never changes
  confirmed results. From a fresh draft with no confirmed scenario
  it fills silently; otherwise the action asks before replacing the
  reader's entries, offering **Use the sample** and **Keep my
  choices**, and replaces the whole draft — both movement modes and
  refinements — only on the former. The next phase adds a second
  named sample and a chooser (D-42, 2026-11-04, below).

- **Same-tab continuity (D-38, scope delegated).** Within one
  browser tab, the guided page keeps the reader's work across
  reload and back/forward restoration: the draft with both movement
  modes, the confirmed scenario's settings, the journey step, and
  display choices. Results are never stored; a restored confirmed
  scenario recomputes from the currently served data. A successful
  restore says so visibly. A new tab, window, or later visit starts
  fresh, as before. Stored values are validated against the loaded
  data before any result is shown; unknown, malformed, or
  version-mismatched records stop the restore with an explicit
  **Start a new scenario** choice and are never silently replaced
  with defaults, following §7.3's rules. Storage failure falls back
  to the first-version fresh behavior with its stated limitation.
  The §4.1 walkthrough is presentation state and restarts off.

- **Publication path (D-39, owner decision).** `/explore/` joins
  the unlisted prototype deployment beside `/scenario/`: published,
  with no navigation, sitemap, or search entry. The owner will
  demonstrate it to the team and decide the redistribution license;
  only then is it advertised. `/scenario/` is paused: it stays
  deployed unlisted for comparison and field-overlay access and
  receives no further UX investment; a later rework as a faster
  iteration surface for engineers is possible but undefined. It is
  no longer the activation candidate. Before `/explore/` is
  advertised, reconcile the activation contract: the D-2 entry
  point, the §10.3 walkthrough page, §9.1 budgets and measurement
  marks for the guided bundle, browser-lane coverage, the §4.4
  field-overlay decision for the guided page, and the §9 quality
  bars. Activation remains a separate owner step; this decision
  deploys and advertises nothing by itself.

The owner also kept the existing copy baseline on 2026-11-04; small
clarifications may ride along with tasks without reopening §5. The
[guided design §9](guided-journey-ddd.md#9-second-increment-d-37d-39-2026-11-04)
and plan tasks
[G-08–G-12](guided-journey-ip.md#execution-evidence) implement this
increment.

**Next phase (D-41, 2026-11-04).** The owner queued every remaining
deliberate deferral as the phase after the second increment. Team
availability schedules it, and it may run before the team
demonstration; advertising still follows D-39 and its
reconciliation list. The queue: the §4.4 field-overlay decision for
the guided page; the §3.7 family-view offer there (D-13); §7.1
shared links for a guided scenario; recovery between visits beyond
D-38 (§7.3); scenario import, excluded by the first-version scope
above; the D-2 entry point (§2.2); the §9.1 budgets and measurement
marks for the guided bundle and the §9 quality bars; the §10.3
acceptance walkthroughs re-pointed to the guided page; touch and
cross-engine browser coverage beyond the second increment's lane;
the result report (D-40, §6.5), set P2 and recorded as guided task
G-13; the sample chooser, second sample, and sample stories
(D-42), recorded as guided tasks G-14 and G-15; and the
`/scenario/` engineer-sandbox rework decision left open by D-39. The
[guided plan's next phase](guided-journey-ip.md#next-phase-owner-instruction-2026-11-04)
holds the queue's task view; most items still need their design
section or product decision before execution, while the sample
tasks (D-42, below) arrive with both drafted.

**Sample scenarios (D-42, 2026-11-04).** The next phase replaces
the introduction's single sample action with a chooser offering
two named samples, each labeled as sample values, not recommended
site values. The first is D-37's approved illustrative scenario,
unchanged. The second anchors to the 1952 M 7.36 Kern County
earthquake on the White Wolf fault, whose digitised surface
measurements the data release already carries
(`docs/datasets.md`): fault angles 60° and 70°, a maximum vertical
surface offset of 1.3 m, completion values remaining agent
selections under the standing delegation. Anchored, never modeled:
each sample says its values are of the named event's scale and
reproduce no event. The anchors follow the published record — a
steep White Wolf dip near 75°
([Stein & Thatcher 1981](https://ui.adsabs.harvard.edu/abs/1981JGR....86.4913S/abstract);
[Bawden 2001](https://zenodo.org/records/1231281)) and about
1.3 m of maximum surface elevation change
([SCEDC](https://scedc.caltech.edu/earthquake/kern1952.html)) —
and the magnitude is the site's own constant. Each sample carries
a short story behind a closed disclosure, with up to two images
where a suitable file verifies — public domain or
CC BY / CC BY-SA only, license verified per file at its source
and credited visibly, published as guided DDD §10.2 specifies;
the
[USGS ScienceBase Bealville photograph](https://www.sciencebase.gov/catalog/item/51dd6f2be4b0f72b4471a1d7)
is the Kern candidate. Story texts follow CR-10. Guided DDD §10
holds the design; guided tasks G-14 and G-15 carry it in the
next-phase queue above.

**Sample presentation rework (D-43, 2026-11-04).** Reviewing the
built samples, the owner reworked their presentation. One
secondary action — **Try a prefilled sample** — opens a listbox
naming the two samples by scale: Chi-Chi scale — shallow fault
(30°/40°) and Kern County 1952 scale — steep fault (60°/70°),
each option carrying a one-line descriptor; event-derived names
stay excluded because the illustrative values are anchored to the
event's scale, not taken from it. The replacement confirmation
becomes an accessible modal dialog holding the question and both
choices; the browser-dialog ban stands. The prefill notice reads
"Prefilled with the {sample} values. This is an illustration —
change anything you wish." and persists on Site conditions and
Fault movement until the fill is edited or replaced. The story
panel sits behind a prominent **Where these values come from**
trigger under the notice on both input steps, collapsed by
default, its §10.2 content unchanged. After a fill the walk is
sequential again: Continue to fault movement is the primary
action, review staying reachable. Both movement modes prefill:
the Kern slip window is anchored to the 1.6–1.9 m of reverse slip
in [Bawden 2001](https://zenodo.org/records/1231281) —
independent of the model's own offset-to-slip conversion — and
the illustrative slip window is an agent selection named in the
evidence. Short per-field annotations appear while a sample is
active, their texts following CR-10; all exact strings return to
the owner for approval before the affected merges. Guided DDD
§§10.3–10.4 hold the design; guided tasks G-18 and G-19 carry it.

**Sample presentation revision (D-44, 2026-11-05).** A relayed
external review, read before the G-18 merge, revised the D-43
presentation and the owner adopted it. The chooser is one action —
**Try a prefilled sample** — opening a small dialog of two
selectable cards named by their inputs: **Lower fault angles**
(30° and 40°; surface offset up to 3 m) and **Steeper fault
angles** (60° and 70°; surface offset up to 1.3 m). A selected
card previews its values, background, and photographs without
changing the draft; **Use this sample** applies it, and when a
draft would be replaced, the D-43 modal question becomes the next
step of the same dialog. The event connections live in the
previews, not the titles, and the stories' shared sentence
becomes "These examples help you try the tool. They do not
reconstruct either earthquake." under CR-10. The prefill notice
reads "Prefilled with the {sample} sample. You can change any
value." and, after the first edit, "Started from the {sample}
sample · Modified"; the background trigger — **Why these sample
values?**, helper "Background, photos and sources" — stays
reachable until the draft is replaced or a new scenario starts.
Per-field annotations update or clear when their value changes.
The D-43 slip prefills stand — 1.6–1.9 m for Kern, framed as
Bawden 2001's two patch estimates used as an example band, 3–5 m
delegated for the illustrative sample — and a visible note on
switching movement modes says the modes are separate assumptions
that select different simulations. Everything else in D-43 holds.
Guided DDD §10.5 holds the design; the revised G-18 and G-19
carry it.

**Audit polish (D-45, 2026-11-05).** The owner adopted the second
external audit's wording and presentation package
(`notes/2026-11-05/explorer-wording-ux-audit.html`): the wording
table — matching simulation stages; measurements used; Missing
values (excluded); Estimated fault slip at depth; Your selected
range includes; Histogram counts by value range; Exit walkthrough;
Download data (ZIP) with a short contents description; a
plain-language explanation in place of the normalization phrase —
and the presentation items: a compact confirmed-scenario summary
with critical warnings and a **View full scenario** disclosure,
chart and measurement choices higher on the results screen
(amending the D-32 and D-36 presentations); the walkthrough
progress labeled Results walkthrough · n of 5; help disclosures
that add information beyond the sentence they follow; a
provisional mark on the Scarp dip choice card before selection;
density choices ordered Dense, Medium, Loose; the disclosure icon
overlap fixed; and truthful recovery messages — a first
calculation failure claims no preserved results, and the
version-mismatch message and its control agree. Strings the audit
gives verbatim are approved; the rest return through the string
gates. Shared-component changes reach `/scenario/` as fixes, not
new UX investment (D-39). Guided DDD §11 holds the design; tasks
G-20 and G-21 carry it, sequenced after G-19.

**Negative scarp heights (D-46, Proposed 2026-11-05).** The Kern
sample surfaces a −0.02 m scarp height while the description says
height above the ground; the data contract retains negative
measurements deliberately. The research group is asked for the
interpretation; the application keeps showing the data unchanged,
and the explanation lands as CR-10 text once the group answers.

**Approved introduction (product owner, 2026-11-03).**

> **Use simulations to understand ground rupture.**
>
> Describe the site conditions and fault movement you want to
> investigate, then see the simulated results. This is a research
> tool; it does not predict what will happen at a particular site.

This introduction is approved for the revised journey and appears in
the `/explore/` candidate. The prototype's existing §5 copy remains the
baseline for the rest of the wording review. Scientific-content
approval continues to follow CR-10. The product continues to show
results from existing simulations.

| Journey (PRD story) | Path through the product |
|---|---|
| US-1 dam scenario | Scenario page → inputs (§3) → conversion assist (§3.6) → results (§4) → download (§6.1) |
| US-2 pipeline width | Scenario page → inputs → deformation-zone width view (§4.1) → field overlay (§4.4) |
| US-3 review | Manual re-entry of the stated scenario (§3), or from P2 a shared link (§7) → results → download with provenance (§6.1–6.2) |
| US-4 inverse search (P2) | Scenario page, inverse mode (§3.8) → condition distributions (§4.8) |
| US-5 teaching (P2) | Morphology page (§8.1) → animations (§8.2) → scenario page preset links |

### 2.4 Future native panels (D-19)

v0.4 ships no native full-dataset exploration panel: C8's uses are
served by the five published dashboards, and no documented gap exists.
A future proposal for one must add a register row naming the gap, the
dashboard that fails to meet it, and the user evidence — the "named
gap and rationale" FR-G5 requires.

---

## 3. Scenario page: inputs

Serves: FR-S1–S8, C1. The guided journey follows
[§2.3](#23-user-journeys): site conditions require explicit
selections (D-26), and draft changes update results only after
review and **Show results** (D-27). The earlier prototype's input
rail beside immediately updating results is superseded. Remaining
layout choices are open. P2 adds the independent display
preferences of [§4.9](#49-display-preferences-fr-g6-p2).

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
Multi-select; initially unanswered and required (D-26).
A range entry assist accepts
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
v0.4 pending R-2.

### 3.3 Sediment depth (FR-S3) and density (FR-S4)

Depth: multi-select over 3 m, 5 m, 10 m. Density: multi-select over
Dense, Medium, Loose. Both are initially unanswered and required;
the shared selection rules of D-26 apply.

### 3.4 Displacement window (FR-S5)

Primary mode: **Fault slip at depth (m)** — a min–max pair over the
modeled range (approximately 0–5 m), inclusive at both ends, with the
export's actual recorded range and recording step (~0.05 m) stated
beside the control.

**Fresh entries (D-31).** Show **Minimum (m)** with the actual
editable value **0**, not a placeholder or a blank-to-zero rule.
Show **Maximum (m)** marked **Required**, initially blank. A
maximum is an explicit reader choice, including when selected by
the shortcut below. A cleared minimum remains an unfinished draft;
do not silently restore zero during editing or review. Review with
a missing endpoint shows **Enter a minimum value.** or **Enter a
maximum value.** beside the field and focuses the first invalid
field. Existing numeric validation still applies, including the
16-character limit before and after normalization. An explicitly
entered zero is valid, and minimum and maximum may be equal.

Each displacement field supports direct typing and adjacent
**− / +** buttons. The example adjusts by 0.1 m per click while
preserving the allowed precision of typed values. Mouse adjustment
and typing are agreed. The §2.3 implementation supplement selects
0.1 m for the initial `/explore/` version; it does not establish a
permanent increment for later versions. Existing validity limits
continue to apply at the recording boundary.
The buttons are a convenience, not a restriction on typed decimals.

The single **Set maximum to 5 m** shortcut changes only the slip
maximum to exactly **5**. It preserves the minimum, the inactive
offset entry, and all site conditions. It does not confirm the
draft. A typed or shortcut-selected 0–5 m window applies literally:
the final recorded stages sit slightly above 5 m (approximately
5.0135 m at the current data maximum), so this shortcut does not
mean all stages. Do not silently extend it to the actual maximum.

**Immediate slip guidance.** When either active slip entry exceeds
5 m, highlight that field in red and show a message beside it
without waiting for Review. Preserve the entered value. Distinguish:

- Above 5 m but within the actual recorded range: a warning, not
  an invalid entry. Current example: **Above 5 m, but within the
  recorded range, which ends at 5.0135 m.**
- Above the actual recorded maximum: a blocking validation error.
  Current example: **Above the recorded maximum of 5.0135 m.
  Enter a smaller value.**

The warning clears when the value returns to 5 m or below; other
validation errors may still apply. Use the selected data release's
actual limit, not a permanently fixed 5.0135 m. The rounded 5 m
warning boundary and shortcut are the agreed current product
choices; future data with a different descriptive range require
their own product review. Neither boundary establishes physical
plausibility at a particular site.

**Earlier no-window baseline.** D-31 supersedes D-22's proposed
fresh "slip: any" state. Blank maxima no longer request every
stage. The no-window calculation behavior remains defined for
existing numerical reference cases (§10.2): no slip restriction,
or each trial's actual final state for one state per trial (FR-S6).
This record does not change those reference populations or decide
how older saved scenarios are recovered into the new journey.

### 3.5 Offset-entry mode and conversion assist (FR-S5)

A clearly separated second mode: **Anticipated vertical surface
offset (m)**. Switching modes never silently converts a typed value.
Under D-28, the draft retains the fault-slip minimum and maximum
separately from the surface-offset maximum. Switching back restores
that mode's entries, including blanks and unfinished or invalid
text. Switching alone neither clears entries nor
replaces them with values calculated from the other mode.

Only the selected mode's entries are validated for proceeding to
review and used in the reviewed scenario and subsequent results.
An unfinished or invalid entry in the inactive mode does not block
the selected mode; switching back makes the existing validation
rules applicable to that entry again. Retaining entries does not
relax numeric limits, normalization, or conversion-coverage rules.
The review identifies the selected mode and its entries, without
presenting the inactive entries as additional scenario conditions.

Mode switching is a draft edit and does not change previously
confirmed results until **Review scenario → Show results** (D-27).
D-28 covers switches within the draft. **Start a new scenario**
clears both modes' reader entries and restores D-31's fresh
defaults under D-29. The §2.3 supplement excludes sample-input
replacement and saved recovery from the initial `/explore/` scope;
their later behavior remains a separate definition.

In offset mode the assist panel shows, for each selected dip, the
converted slip window, the regression used (the glossary's
back-projection relationship), and an in-range / partly-out-of-range /
out-of-range flag per dip. Copy in §5.6.
These calculated windows do not overwrite the retained direct-slip
entries. The conversion assist remains active in surface-offset
mode; preserving entries does not disable it.

Offset-entry mode starts with a blank **Maximum (m)** field marked
**Required**. It accepts an anticipated maximum vertical surface
offset, entered by typing, mouse adjustment, or its maximum
shortcut. It represents an offset range from 0 m to that maximum. For
each selected dip, the product converts both endpoints into that
dip's fault-slip window.

An entry that is not a non-negative number is rejected: the field
explains the rejection with the §5.6 copy, leaves the previous results
unchanged, and never silently corrects the entry. The retained results
visibly belong to the last valid scenario — the rejected value never
appears in the active-scenario summary or in download provenance.
Valid entries that convert partly or entirely outside the modeled
range are not rejected for that reason: the conversion is shown with
the per-dip coverage flags above.

**Immediate offset guidance (D-31).** Use the fault angles selected
in site conditions, not the retained direct-slip entries. Show the
applicable offset coverage beside the input. As a readable value
changes, show its corresponding slip and coverage for every
selected angle. Highlight the offset field in red and show a
warning if any converted range extends outside available data.
Identify each affected angle and preserve the entered offset.
Do not apply the direct-slip 5 m threshold to the offset value.
Changing fault-angle selections updates this guidance without
changing the offset entry or the confirmed results.

Partial coverage remains a valid scenario. Review is available
with the warning, and the warning remains visible on review and
with the resulting coverage information. It must explain that
results represent only the modeled part of the requested range.
With a 30° fault angle, the current example shows coverage up to
approximately 2.51 m offset. Entering 3 m converts to approximately
5.99 m slip and warns; entering 2 m converts to approximately
3.99 m slip and clears that coverage warning. These examples use
the data release's fitted relationship, not a general limit on
earthquake displacement.

**Offset maximum shortcut (D-31).** Provide one button beside the
offset field, labeled **Set maximum to {value} m**, with its value
based on the selected fault angle and available data. It fills
only the offset maximum, preserves both direct-slip entries, and
does not confirm the draft. The accepted 30° example uses the
label **Set maximum to 2.51 m** and enters exactly **2.51**, within
coverage. Do not present a hidden, more precise value than the one
the button names.

**First-version shortcut rule (§2.3 implementation supplement).**
For multiple selected angles,
use the largest offset covered for every selected angle: choose
the smallest of their upper coverage limits. Round that value
down to hundredths of a metre so it does not exceed the upper
coverage limit. A conversion whose lower end is below modeled slip
can still require a coverage warning. This general multi-angle and
rounding rule is an agent-selected implementation choice for
`/explore/`; the earlier owner-approved example used only 30°.
It does not change the per-angle conversion windows of §3.6.

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

**Agreed refinement entry (D-34).** The results screen offers a
**Refine results** section with the two controls below. Keep them
out of site-condition selection: scarp types describe simulated
outcomes. Provide short explanations and illustrations of those
types. The population choice answers **Which simulation stages
should contribute?** Its reader-facing choices are **All stages
within the slip range** and **Last stage within the slip range**.
The latter means the last available stage from each simulation
within the range; it need not lie exactly at the entered maximum.
These labels express the existing population definitions below,
without changing their scientific meaning or default.

**Earlier copy baseline.** The existing interface uses **All model
stages in the slip window** and **One state per simulation trial**.
These earlier labels are superseded for the guided presentation by
D-34's labels above. Their copy-registry replacement remains part
of the pending guided-journey design and implementation amendment.

Both controls edit the shared draft and follow §2.3's confirmation,
discard, and restart rules. The owner also requires one or more
scarp types before review: an empty selection is an unfinished
draft, with no automatic return to all types.

**First control presentation (D-35, 2026-11-04).** The owner approved
the refinement example with these observable behaviors:

- Open or hide the **Refine results** section from results. Label
  its controls **Draft choices**, separate from the confirmed
  scenario summary. Place the population choice beside scarp types
  in a wide window and stack them when space is limited.
- Explain that a stage is a saved ground shape as fault slip
  increases, with its own measurements. The all-stages choice
  explores the range; the last-stage choice compares the greatest
  recorded slip within it, which can fall below the entered maximum.
  Explain that this changes counts, chart shapes, and statistics.
- Offer **See how stages change the results** as an expandable
  example. Show one simulation at three saved stages and distinguish
  which stages each choice includes. Explain that all stages gives
  more influence to simulations with more included measurements,
  whereas last stage uses at most one per simulation. Neither
  guarantees larger or smaller results. Mark the example's numbers
  as invented; changing it does not apply the scenario draft.
- Show all six scarp types with selectable checkboxes, short
  explanations, and schematic shape sketches in canonical order.
  **Select all** reflects none, some, or all selected types. Selecting
  it from none or some selects every type; clearing it clears the
  draft selection. The sketches explain shape, not scale or data.
- **Review changes**, **Review scenario**, and **Return to review**
  use the same validation. If no scarp type is selected, open the
  section, show **Select one or more scarp types before review.**,
  and focus its Select all control. A valid selection clears that
  error. Do not disable the attempt or silently select values.
- Above the controls, show **You have unapplied changes** with
  **Return to review** and **Discard changes** while the draft
  differs. Retain the confirmed summary, counts, charts, and
  statistics until **Show results** confirms the reviewed draft.
- Review lists the draft population and scarp types under **What
  the results will include**, with **Edit refinements**. That action
  opens the refinement section and focuses the selected population
  choice. **Back to results** preserves the draft and shows existing
  confirmed results. This label applies when returning from review
  of an existing result; the fresh journey retains D-32's Back action.

Approval covers the first presentation and illustrated validation
flow. It does not make the example's invented measurements scientific
data, certify its sketches as research figures, or establish full
accessibility and supported-window acceptance. Scientific labels and
definitions retain their existing review status.

D-36's optional results walkthrough (§4.1) presents the stage and
scarp-type editors separately. It changes their presentation only;
the shared draft, validation, review, and confirmation rules above
continue to apply.

- **Population (FR-S6):** a two-option switch, **All stages within
  the slip range** (default) / **Last stage within the slip range**,
  using D-34's labels for the existing all-stages and
  one-state-per-trial populations, with
  the explainer of §5.3 one tap away. The active population is named
  in the scenario summary, always; in the earlier no-window
  calculation state (§3.4), the
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
- **Discard changes (FR-S8, D-29):** abandon edits and return to the
  last confirmed scenario and its results. Restore both displacement
  modes' entries to what they held at confirmation (§2.3), including
  the inactive mode, and the confirmed population and scarp-type
  selection (D-34). Do not substitute a fresh scenario or
  recalculate results from the abandoned draft.
- **Start a new scenario (FR-S8, D-29):** clear the reader's choices,
  including both displacement modes' entries, and current results.
  Restore D-31's fresh defaults: slip minimum 0 m, both maxima
  blank, plus D-34's all-stages population and all scarp types.
  Return to unanswered site conditions, rather than all selected.
  The previous full-ensemble reset is superseded.

The existing prototype labels its single action **Reset**. D-29
replaces that label and behavior with the two actions above; the
prototype's copy and implementation await the journey amendment.

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

**Results controls and optional walkthrough (D-36, 2026-11-04).**
The owner approved the shared direction of the results-controls
sketch and an optional walkthrough. In normal browsing, a prominent
**Refine results** disclosure identifies **Simulation stages · Scarp
types** and clearly indicates whether its options are shown. Keep
this action separate from choosing a measurement to view.

The owner selected **Choice cards** for normal browsing. Under
**What would you like to examine?**, show three cards: **Scarp
height**, **Deformation-zone width**, and **Scarp dip**. Each contains
its measurement name and, respectively, **How high is the scarp?**,
**How wide is the disturbed ground?**, or **How steep is the scarp
face?**. Visibly mark the selected card in addition to its color.
Place the cards side by side in a wide window and stack them when
space is limited. Selecting a card changes the viewed measurement
immediately; it does not change or confirm the scenario draft.
These questions supplement existing measurement explanations and
notices. The Compact selector was an alternative, not the selected
presentation.

The following walkthrough details are bounded implementation choices
made under the owner's delegation. They make the optional guide
concrete; they are not separate owner approvals of every edge case:

- Normal browsing remains the default. **Walk me through results**
  starts an optional sequence after a confirmed result exists:
  **Scarp height → Deformation-zone width → Scarp dip → Simulation
  stages → Scarp types**. Starting or restarting it begins at height.
- While the guide is active, progress and **Back**/**Next** replace
  the normal measurement selector. Identify the current stop and
  its position out of five. Back is unavailable at the first stop;
  Next names the following stop.
- The first three stops show the current confirmed result's actual
  chart and full statistics for that measurement, with its existing
  explanation, notices, and chart choices. Visiting a measurement
  selects it immediately without changing the scenario draft.
  Preserve that measurement's chart view and percentile selection.
- The last two stops show only the corresponding existing editor:
  simulation stages at stop four, scarp types at stop five. Preserve
  their explanations, examples, and glossary links. Their edits join
  the same draft as pending site and movement edits; visiting a stop
  or choosing Back or Next never changes input values or calculates
  results. The last selected measurement remains retained.
- Keep the confirmed scenario, counts, applicable warnings, and
  unapplied-changes notice visible. The guide works with empty,
  small, and zero-valid results, retaining their existing messages
  and chart suppression; it never substitutes illustrative charts.
- **Browse freely** is available at every stop, including with an
  unfinished empty scarp selection. It ends the guide while retaining
  the current measurement, chart choices, and draft. Leaving either
  editor stop opens the normal refinement section. The pending
  notice remains whenever the draft still differs.
- At the last stop, show **Review changes** when any draft field
  differs from the confirmation; otherwise show **Finish
  walkthrough**. Finishing returns to normal browsing with the
  current measurement and normal refinements open. Review ends the
  guide before invoking the existing full-draft validation. An empty
  scarp selection therefore opens the normal refinement error and
  focuses Select all. Only **Show results** confirms a valid draft.
- **Discard changes** ends the guide and restores the confirmed
  draft through D-29. It retains the current measurement; when used
  from either editor stop, normal refinements remain open.
  Navigation to another main journey step and successful confirmation
  also end the guide. Returning to results uses normal browsing.
- A fresh page or **Start a new scenario** has the guide off and
  resets the measurement to height. The guide is not saved across
  reloads or return visits. It adds no scenario defaults, presets,
  calculations, or alternative confirmation path.

These additions change presentation at `/explore/` only. D-27–D-35,
scientific safeguards, explanatory links, and the separate P2 display
preferences remain in force. The saved sketch demonstrates controls,
not real scientific outputs or release acceptance.

**Agreed first presentation (D-33, 2026-11-04).** The results screen
is headed **Explore your scenario**. D-36 extends its controls as
specified above. The first version presents:

1. **Your confirmed scenario**, showing the site conditions,
   entered movement range, applicable per-angle conversions,
   population, scarp-type selection, and matching-record count.
   Explain that records are saved stages and that one simulation
   may contribute several. Keep this context visible above results.
2. Applicable partial-coverage and low-slip warnings below that
   summary. Preserve the entered range when coverage is partial.
3. Tabs for **Scarp height**, **Deformation-zone width**, and
   **Scarp dip**, with scarp height initially selected. Each shows
   a plain measurement explanation and its valid-measurement count.
   Keep the width-scope and provisional-dip notices visible in
   their respective views.
4. **Distribution** and **Cumulative** chart choices, with
   Distribution initially selected. Cumulative has a percentile
   selector and a value read-off. Both mark the median and 84th
   percentile. Place the full §4.2 statistics table beside the
   chart on wider windows and below it on narrower windows. Counts
   have no physical unit; measurement statistics carry their units.
5. **Reading these results**, explaining the median and percentile
   range and explicitly stating that the summaries are not
   recommended design values. Retain the research-tool sentence
   approved in §2.3 near the results.

**Review scenario** sits beside the heading. **Change site
conditions** and **Change fault movement** sit below the results,
with **Download results** as the prominent action at that level.
These positions are agreed for the first version. Revision still
follows D-27–D-30, extended to refinements by D-34; it cannot
silently apply changes or relabel retained results as a new
draft's results.

This is acceptance of the initial populated-results presentation.
The prototype's counts and measurements are invented. Its action
acknowledgments are review aids, not product dialogs or completed
revision and download flows. Small, empty, and zero-valid-result
presentations, field comparisons, integration of the accepted
refinement and retained-draft presentation, and the full download
experience still need implementation and verification. D-35 records
the refinement layout and validation now accepted.
Their existing requirements remain in force. Example numerical
methods, thresholds, and sizes do not amend scientific rules or
establish accessibility or supported-window acceptance.

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

The cumulative curve may be simplified for display only if its
vertical simplification error is guaranteed to be less than 0.2
percentage points at every measurement value. This is an absolute
cumulative-probability bound, not a relative percentage error.
Statistics, pre-marked percentiles, and percentile read-offs use the
full matching valid measurements. Every drawn cumulative chart carries
this visible statement in its caption, also available to assistive
technology:

> The curve may be simplified for display. Simplification changes
> cumulative percentages by less than 0.2 percentage points. Statistics
> and percentile read-offs use all matching valid measurements.

A reader choice of cumulative-curve accuracy is a P3 consideration
(owner direction, 2026-11-01), not an MVP control. Whether to offer an
exact curve, alternative error limits, or both remains to be decided
when that work is opened, with performance verified for each option.

Default measurement on load: scarp height; the other panels are one
action away through the normal measurement selector. D-36 also offers
optional sequential guidance. Choosing the visible result
components and target display size is the separate P2 setting of
[§4.9](#49-display-preferences-fr-g6-p2), not the cumulative-curve
accuracy choice above. The deformation-zone-width panel
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
and are included in downloads (§6.1). A scenario explicitly
selecting all site-condition values, all scarp types, all stages,
and no active slip window matches the full 346,834-record ensemble
in the earlier calculation reference GS-0. D-31's guided builder
requires an explicit maximum; this reference is not its initial
state or a new completed draft. In the
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
  of scope for v0.4 and recorded here as the PDD-defined rule.
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
0.5 m, the results carry the low-slip caveat of §5.9. This includes
a D-31 scenario whose reader keeps the 0 m minimum and chooses a
maximum. The earlier no-window calculation state (§3.4) does not
fire the caveat: §5.9's copy presupposes a user-chosen window, and
whether a full-ensemble view needs its own notice joins the open
R-3 questions. The threshold
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

### 4.9 Display preferences (FR-G6, P2)

Serves: [FR-G6 — Display preferences](prd.md#fr-g6-display-preferences-p2),
C12, NFR-4, and NFR-5. The owner decided this scope on 2026-11-03
(D-24). P2 means the delivery priority after the MVP, not the
prototype-to-public-release phases of the MVP.

Within the scenario page, the reader chooses which result
components to show and the display size and layout they should
fit. This setting is independent of device detection: a reader
using a small laptop window can select a suitable view without
being classified as a phone user. Tablet and phone views added
later use the same setting. The capability is not limited to two
views or to a switch between desktop and phone.

Here, resolution means display size and layout, not chart-image
export resolution, numeric display precision, or cumulative-curve
accuracy. A change of view leaves the accepted scenario, matching
records, calculated statistics and percentiles, scientific and
stored-data precision, and data provenance unchanged. Applicable
warnings, counts, population context, and accessible alternatives
remain available as required for the results shown; the setting
does not waive §5's copy rules, §9.3, or SC-5.

**Remaining product choices.** The scope is agreed. The P2
definition must fix the selectable content and combinations,
layout choices and their target dimensions, defaults and reset
behavior, whether preferences
persist or travel in shared links, and behavior when the actual
window differs from the selected size. It must also define the
accessibility and performance acceptance matrix for those views,
including a small laptop window and the tablet and phone views
when each is introduced. No exact preset dimensions or storage
behavior are implied by the temporary measurement window below.

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

**Guided-copy amendment pending (D-33).** The guided results use the
approved research-tool sentence in §2.3. The earlier wording below
is retained only as the existing copy-registry baseline until the
dependent design and implementation are amended. It is superseded
for the guided presentation; the full disclaimer remains reachable
as required by §5.1.

> Research tool: simulated results, not site predictions. Interpret
> with professional judgment. [Full disclaimer →]

### 5.3 Population explainer (FR-S6)

**Guided-copy amendment pending.** The copy below is the earlier
baseline, including its no-window branches. D-31 requires a
maximum in a new guided scenario; those branches are not current
journey instructions. The guided explainer must describe records
within the chosen window. The copy registry and its dependent
implementation await that amendment; §10.2 preserves the separate
no-window numerical reference cases.

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

Rejected-entry line:

> Enter the anticipated vertical surface offset (m) as a non-negative
> number — for example, 3 or 0.5. The value typed could not be read as
> one; the results still show the last valid scenario.

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
A cumulative-chart image also carries the §4.1 accuracy statement in
that rendered strip. The export action pairs the image with the §6.1 provenance text.

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

### 6.5 Result report (D-40, P2)

Proposed 2026-11-04 and decided the same day: the owner set the
report P2 and had a task recorded. One action produces a single
self-contained document of the confirmed scenario — HTML or PDF —
pairing the §6.1 provenance and scenario summary with the rendered
charts and their D-14 caption strips, the full §4.2 statistics
table, and every active caveat, so a reader can file or share one
presentable record rather than CSV and JSON alone. It builds on
chart export (D-14), adds no new calculation, and keeps every §6.1
content rule. Guided task G-13 records it in the next-phase queue
(D-41); its design section is drafted and accepted before
execution, and the implementation plan's parked list keeps the
schedule pointer.

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

### 7.3 Reload recovery (MVP)

**Initial `/explore/` scope, amended by D-38.** The §2.3
implementation supplement first used a fresh scenario after every
new page load or reload, without saved settings and without
**Reload and restore settings**. The second increment (D-38,
2026-11-04) narrows that rule: same-tab reload and back/forward
restoration restore the reader's work under this section's
validation and failure-reporting rules; a new tab or later visit
still starts fresh. This scope applies only to the separate guided
route; the existing `/scenario/` behavior and release contract
below remain.

**Guided-journey reconciliation (D-38, 2026-11-04).** The rules
below describe recovery of the earlier prototype's accepted
scenario. D-27 now distinguishes a draft from the confirmed
scenario. The §2.3 second increment adds same-tab continuity at
`/explore/`: reload and back/forward restoration in the same tab
restore the draft, the confirmed scenario's settings, the journey
step, and display choices, recompute any results from the served
data, and report the restore visibly, under this section's
validation, explicit-choice, and failure-reporting rules. Returning
visits and recovery between visits remain undefined for the guided
page; the fresh-start action follows D-29. References below to
default results do not authorize results for unanswered site
conditions. The flows below remain the existing page's contract.

An open scenario may still refer to files from an earlier data vintage.
If field measurements or conversion coefficients cannot be loaded, the
page offers **Reload and restore settings**. A load failure alone does
not establish that the dataset changed. The deployed site continues to
carry one vintage; recovery uses the version served after the reload.

The action preserves the latest accepted scenario inputs and display
settings in the current tab before reloading, including an accepted
offset whose results are still waiting for coefficients. Uncommitted
or rejected entry text and old calculated results are not restored.
On reload, validate the saved settings against the newly loaded data
before showing any scenario result; use the full saved selections and
effective window endpoints without silently dropping or clipping them.
Recompute all results, and state when the data version changed.
The ordinary rule that disables logarithmic width display when it is
unavailable still applies; recovery explicitly reports that adjustment.

Incompatible or malformed saved settings require an explicit **Start a
new scenario** choice before defaults are applied. Storage failures are
reported clearly: a failed save does not reload; if saved settings
cannot be read after reload, the page reports that failure and, if default
results are produced, explicitly says it started with default settings.
It never claims restoration or results that have not been shown. This recovery
request is consumed once and is not replayed on later instant
navigation. It is local reload recovery, independent of the P2 public
shared-link codec.

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

Reference conditions: a fixed reference environment standing in for
a mid-range laptop (2020 or later) — a cloud virtual machine whose
exact specification the
[DDD](ddd.md#76-performance-and-compatibility-measurements) fixes, so
every measurement is reproducible — with a cold cache and a 10 Mbps
connection; and the same environment warm-cache for repeat visits.
Each time budget is judged at the 95th percentile of 30 measured runs.

| Budget | Target |
|---|---|
| Initial data payload for the scenario page | ≤ 4 MB compressed |
| First meaningful render (scenario page, cold cache), 95th percentile | ≤ 2.0 s |
| Repeat visit render (warm cache), 95th percentile | ≤ 1.0 s |
| Confirmed scenario change → updated results, 95th percentile | ≤ 200 ms |

For a change to an already displayed scenario, the update budget
starts when the reader confirms it with **Show results** (D-27),
not on each draft edit.
The first- and repeat-render endpoints below describe the earlier
prototype, which opened directly on results. Their adaptation to
the guided journey remains open; this amendment does not change
the numeric targets or silently substitute a new endpoint.

**First meaningful render** is the point at which the results for the
scenario the page opens with are on screen: for the measurement shown
on load, its statistics table and its chart in the view the panel
opens with (§4.1–§4.2). Where §4.5 suppresses the chart or finds no
valid measurement, its notice stands in for the chart beside the
table; with no matching records, the empty-state explainer replaces
both. A heading, the controls, or a loading indicator alone does not
count. The repeat-visit budget uses the same end point.

**Temporary measurement window (D-24).** Until the P2 display
preferences of [§4.9](#49-display-preferences-fr-g6-p2) ship, the
reference measurement uses a 1280 × 1080 CSS-pixel browser content
area. The owner accepted this increased height on 2026-11-03
because the current chart and statistics table do not both fit
after the initial scroll at 1280 × 720. The first-render endpoint
still requires both, or their specified replacements, on screen.
This is a temporary performance-test accommodation, not a minimum
supported window height or evidence that the current view fits a
small laptop without scrolling. P2 must define and measure each
supported view at its target dimensions, with the first-render
endpoint appropriate to that view's chosen content, before release.

The budgets bind the product; how they are met (format, caching,
precomputation) is the HLDD's problem (DR-6). No browser-based Python
runtime or comparably heavy environment (NFR-3).

### 9.2 Browser and mobile baseline (D-16, Proposed)

Evergreen Chrome, Edge, Firefox, and Safari versions released within
12 months before each product release; iOS Safari and Android Chrome in
the same window; no legacy-browser support. Mobile floor: fully
usable at 360 px width, no hover-dependent essentials (NFR-4).
The temporary height in §9.1 does not change this floor: smaller
windows retain usable scrolling, resizing, and accessible reflow.
P2's display preferences address what to show within constrained
windows, including small laptops as well as later tablet and phone
views (§4.9).

The browser window was narrowed at the owner's review on 2026-11-01.
When a required browser feature is unavailable, the page names the
missing feature and tells the reader to update to the latest stable
browser and reload; for Safari on iPhone or iPad it tells the reader
to update iOS or iPadOS. The ordinary static fallback also states
the supported-browser policy and recovery steps, so the guidance is
visible even when the application script cannot start. An older
browser is not rejected solely because of its version: startup
checks the required features.

### 9.3 Accessibility target (D-17, Proposed)

WCAG 2.2 AA is the conformance target for the product's new pages;
the NFR-5 list is the project-specific floor on top of it. The
statistics table is the canonical text alternative for every
measurement chart; inverse-mode condition charts use §4.8's per-value
count-and-share table. Chart colors follow FR-G2, including its
never-color-alone rule.
The P2 display choices of §4.9 must preserve an accessible way to
obtain the information behind every shown chart; choosing a
compact view does not remove that obligation.

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

When P2 display preferences ship, acceptance also verifies that
changing visible components or display size preserves the scenario
and results, retains the context and accessible alternatives
required for shown results, and meets the view-specific conditions
defined in §4.9. The temporary measurement window alone supplies
none of that evidence.

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

For these reference scenarios, any site condition not explicitly
narrowed in the row selects all its available values. This
convention preserves the reference populations; it does not
describe the guided builder's unanswered initial state.

Likewise, an omitted displacement window retains the earlier
no-window calculation case. D-31 changes the fresh journey, not
these numerical baselines. GS-0 and GS-7 remain explicit no-window
references; they are not instructions to let a new draft skip its
required maximum. Updated journey walkthroughs must use complete
entries and identify the resulting populations explicitly.

| ID | Scenario | What it proves |
|---|---|---|
| GS-0 | Explicitly all site-condition values, no active slip window, default population and scarp-type filter | Full-ensemble counts: 346,834 matching records including the 3,434 unclassified zero-slip stages ("all scarp types" = no filter, §4.3); per-measurement valid and excluded-null counts match the reference. Earlier calculation baseline, not a completed D-31 draft. |
| GS-1 | US-1: dips {30°, 40°}, Strong (uniform and layered), offset mode 3 m | Per-dip conversion (D-3): 30° flagged beyond the modeled range, 40° in range; counts and statistics match the reference. |
| GS-2 | Moderate strength (both arms), dip 20°, depth 3 m, Dense, one state per trial | Warning tier: 18 valid measurements — the small-result warning fires while the chart still renders. |
| GS-3 | Kern preset (after D-6) | The worked example reproduces the research group's chosen field group and filter. |
| GS-4 | Alternating Strong–Weak + depth 3 m | Empty result: the diagnostic names both sediment strength and sediment depth — relaxing either alone yields matches. |
| GS-5 | Alternating Strong–Weak, one state per trial | Suppression tier: 9 valid measurements — the chart is suppressed and the statistics table remains. |
| GS-6 | Slip window 0–0.04 m, explicitly all site-condition values, default population and scarp-type filter | Count-vs-validity split (§4.5): 3,434 matching records — the zero-slip stages — with zero valid measurements in every panel; the no-valid-measurement notice appears, never the no-match diagnostic; statistics tables show valid 0, excluded-null 3,434. |
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
