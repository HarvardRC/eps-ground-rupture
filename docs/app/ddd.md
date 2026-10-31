# Ground Rupture Explorer — detailed design document

**Status:** first full draft, corrected after external review
(2026-10-30). Every section is drafted and normative; every register
row is Proposed. Nothing it specifies has been built yet, and none of
the checks it introduces has run: every *Verification (planned):*
line names a planned check. The external review findings and their
dispositions are recorded in the review ledger,
[`docs/app/ddd-review.md`](ddd-review.md). The owner reviews the
completed document together with the
[implementation plan](ip.md).

This detailed design document (DDD) is the fourth of the project's
staged documents (PRD → PDD → HLDD → DDD → implementation plan). It
turns the accepted architecture into exact formats, algorithms,
procedures, and tests.

<!-- toc -->

- [Introduction](#introduction)
  * [Readers and review contract](#readers-and-review-contract)
  * [Authority and change control](#authority-and-change-control)
  * [Verification contract](#verification-contract)
  * [Document conventions](#document-conventions)
- [1. DDD decision register](#1-ddd-decision-register)
- [2. Repository structure, naming, and toolchain](#2-repository-structure-naming-and-toolchain)
- [3. Data formats](#3-data-formats)
  * [3.1 Scenario artifact binary layout](#31-scenario-artifact-binary-layout)
  * [3.2 Artifact manifest](#32-artifact-manifest)
  * [3.3 Pointer manifest](#33-pointer-manifest)
  * [3.4 Field-data export](#34-field-data-export)
  * [3.5 Regression export](#35-regression-export)
  * [3.6 Reference results](#36-reference-results)
  * [3.7 Media index (P2)](#37-media-index-p2)
  * [3.8 Measured sizes](#38-measured-sizes)
- [4. Export task and data lifecycle](#4-export-task-and-data-lifecycle)
  * [4.1 Export task and validation](#41-export-task-and-validation)
  * [4.2 Publication of a data vintage](#42-publication-of-a-data-vintage)
  * [4.3 Retention, rollback, recovery, and withdrawal](#43-retention-rollback-recovery-and-withdrawal)
  * [4.4 Licensing, archival distribution, and release attachments](#44-licensing-archival-distribution-and-release-attachments)
- [5. Application design](#5-application-design)
  * [5.1 Modules and interfaces](#51-modules-and-interfaces)
  * [5.2 Artifact loading and decoding](#52-artifact-loading-and-decoding)
  * [5.3 Query engine](#53-query-engine)
  * [5.4 Statistics](#54-statistics)
  * [5.5 Offset-to-slip conversion assist](#55-offset-to-slip-conversion-assist)
  * [5.6 Scenario state and URL encoding](#56-scenario-state-and-url-encoding)
  * [5.7 Scenario controls](#57-scenario-controls)
  * [5.8 View layer](#58-view-layer)
  * [5.9 Downloads](#59-downloads)
  * [5.10 Failure states](#510-failure-states)
  * [5.11 Accessibility, supported environments, and navigation lifecycle](#511-accessibility-supported-environments-and-navigation-lifecycle)
  * [5.12 Charts](#512-charts)
  * [5.13 Application configuration](#513-application-configuration)
  * [5.14 Inverse mode (P2)](#514-inverse-mode-p2)
- [6. Build, site, and CI integration](#6-build-site-and-ci-integration)
  * [6.1 Build outputs, asset paths, and page scaffold](#61-build-outputs-asset-paths-and-page-scaffold)
  * [6.2 Software and data version stamps](#62-software-and-data-version-stamps)
  * [6.3 CI workflows](#63-ci-workflows)
  * [6.4 Product pages beyond the scenario page (P2/P3)](#64-product-pages-beyond-the-scenario-page-p2p3)
- [7. Testing specification](#7-testing-specification)
  * [7.1 Numerical tolerances](#71-numerical-tolerances)
  * [7.2 Calculation-parity tests](#72-calculation-parity-tests)
  * [7.3 Pipeline and export tests](#73-pipeline-and-export-tests)
  * [7.4 Application tests](#74-application-tests)
  * [7.5 Browser test lane](#75-browser-test-lane)
  * [7.6 Performance and compatibility measurements](#76-performance-and-compatibility-measurements)
  * [7.7 Site validation and release checklist](#77-site-validation-and-release-checklist)
- [8. Traceability](#8-traceability)
  * [8.1 From the HLDD](#81-from-the-hldd)
  * [8.2 From the PDD](#82-from-the-pdd)
  * [8.3 From the PRD and notes/Roadmap.md](#83-from-the-prd-and-notesroadmapmd)
  * [8.4 From the ADRs and the ADR process](#84-from-the-adrs-and-the-adr-process)
- [9. Deferred and out of scope](#9-deferred-and-out-of-scope)
- [10. Relationship to the implementation plan](#10-relationship-to-the-implementation-plan)

<!-- tocstop -->

## Introduction

### Readers and review contract

The primary readers of this document are coding agents: the DDD, and
the implementation plan after it, are written to be executed, not
narrated. Precision takes priority over plain-language glosses, and
every section is written so that an agent can act on it without
consulting a person.

The owner reviews this document structurally — the section map, the
decision register, the fixed-here indexes of [§5.8](#58-view-layer),
the owner-acceptance list of
[Authority and change control](#authority-and-change-control), and
product-facing statements — rather than every technical detail,
and accepts each drafted section on evidence rather than on careful
reading. The evidence is layered, and none of it is a proof: each
drafted section states its design rationale; an adversarial review
round examines it against the sources; the executable checks of the
verification contract below, once implemented and run, establish
exactly the properties they test; and the traceability matrix of
[§8](#8-traceability) shows coverage, not satisfaction — each
obligation's home and the check planned to evidence it. Approval
remains the owner's accountable act, taken on that evidence.

### Authority and change control

This document inherits the boundary set by
[HLDD §12 — Scope of the following
documents](hldd.md#12-scope-of-the-following-documents): the DDD
specifies implementation under rules already established by the
product documents and the core Python implementation, and it must not
independently redefine scientific or statistical behavior.

- Product behavior, reader-facing text, and user-visible states are
  the PDD's; this document cites them and does not rewrite them.
  Where an arrangement the PDD delegates makes a PDD rule unworkable
  as written — the rule of
  [PDD §4.4 — Field overlay (FR-O5, D-18 Proposed)](pdd.md#44-field-overlay-fr-o5-d-18-proposed)
  that for scarp dip "the switch is disabled with the note", while one
  overlay switch serves all the stacked panels of row DD-4 of
  [§1](#1-ddd-decision-register) — this document states its reading,
  and the owner's acceptance of that section, or a PDD amendment,
  closes the reading.
- Reader-facing strings the design needs and the PDD does not provide
  are **fixed-here** texts: entries of the copy registry
  ([§5.8](#58-view-layer)), or blocks between copy markers in a
  page's Markdown, such as the no-JavaScript fallback of
  [§5.10](#510-failure-states) in `scenario.md`.
  `check_pdd_agreement.py` lists every fixed-here text, in
  `copy.json` or between copy markers, for the
  [SC-7](pdd.md#101-success-criteria) (scientific sign-off) review.
- For failure states the [PDD §5 — Copy deck](pdd.md#5-copy-deck)
  does not cover, the "error-state presentation using the messages
  specified in the PDD" that HLDD §12 asks of this document is met by
  the fixed-here entries of §5.10, approved under SC-7, and by the
  owner's acceptance of §5.10 — an owner decision, Proposed here.
- Every user-visible choice — rows DD-4, DD-5, DD-6, DD-9, and DD-11
  of §1, and each user-visible behavior marked "fixed here", indexed
  in [§5.8](#58-view-layer) (fixed-here behavior index) beside the
  fixed-here copy index — closes only with the owner's acceptance of
  its drafted section (for DD-11,
  [§5.6](#56-scenario-state-and-url-encoding) and
  [§5.9](#59-downloads)), and so does row DD-12, the reference
  environment on which every [SC-4](pdd.md#101-success-criteria)
  (performance) verdict rests. So do three readings and owner
  decisions that stand outside the register and the §5.8 indexes:
  the reading of
  [ADR-0014](../adr/0014-committed-content-hashed-artifacts.md)'s
  "lightweight prerelease data tag" as an annotated tag
  ([§4.2](#42-publication-of-a-data-vintage)); the deletion and
  replacement of software releases in steps 2 and 5 of the
  withdrawal procedure
  ([§4.3](#43-retention-rollback-recovery-and-withdrawal); an owner
  decision, Proposed); and the `main` ruleset of
  [§6.3](#63-ci-workflows), its reading of
  [ADR-0015](../adr/0015-golden-scenario-parity.md)'s "a parity
  failure blocks merge" under the admin bypass included (owner
  action OA-10, Proposed).
- Architecture is the ADRs': [ADR-0010–ADR-0015](../adr/README.md),
  accepted, and two Proposed decisions,
  [ADR-0016 — Performance reference environment — an on-demand AWS VM defined by Terraform](../adr/0016-performance-reference-environment.md)
  and
  [ADR-0017 — An unadvertised prototype deployment precedes the public release](../adr/0017-unadvertised-prototype-before-public-release.md),
  whose two phases — an unlisted prototype for the research group's
  review, then the public release — are publication states of
  [§6.1](#61-build-outputs-asset-paths-and-page-scaffold). A change,
  or a new decision such as these two, completes the repository's
  ADR process before dependent work proceeds: for ADR-0016 that is
  the owner's acceptance, owner action OA-12 of
  [IP §4 — Owner and research-group actions](ip.md#4-owner-and-research-group-actions),
  and for ADR-0017 the owner's acceptance before the first data
  vintage is published under its assumed terms
  ([§4.2](#42-publication-of-a-data-vintage) step 1) and before the
  prototype deployment.
- Scientific and statistical rules are the core Python
  implementation's and its tests'; the pipeline is the single
  computational source of truth
  ([DR-1 — Controlled data
  source](prd.md#dr-1-controlled-data-source)).
- Decisions that belong to the research group or the product owner
  (the Open rows of the
  [PDD §1 — Decision register](pdd.md#1-decision-register)) stay
  open here; the DDD designs around them without closing them.

### Verification contract

Every normative value in this document must have exactly one of three
origins, stated where the value appears:

1. **Cited** — quoted from and linked to an approved document (PRD,
   PDD, HLDD, an accepted ADR, or `notes/Roadmap.md`).
2. **Generated or measured** — produced from the repository's actual
   data or build by a named, repeatable check (an export-task
   validation, a pytest contract, a measurement procedure of
   [§7.6](#76-performance-and-compatibility-measurements)), with the
   check named beside the value. A value measured while drafting,
   before its check exists, is labeled a *drafting measurement*: it
   names its input file with that file's SHA-256 and the check, with
   its IP task, that will reproduce it, and it stays provisional
   until that check runs.
3. **Registered** — recorded as a row of
   [§1](#1-ddd-decision-register), the register of decisions this
   document itself closes, each with its own planned verification.

A number with none of these origins is a defect. Reader-visible
content splits by authority
([ADR-0015 — Golden-scenario references and a pipeline↔client parity
harness](../adr/0015-golden-scenario-parity.md)): research-derived
values and research-group conventions — coefficients, the scarp-class
palette and its canonical order, physical ranges, storage metadata,
stage spacing — are never hardcoded and arrive only through
pipeline-written files; product settings decided in the PDD reach the
application only through the configuration of
[§5.13](#513-application-configuration), where each entry of
`src/config.json` quotes the PDD statement that fixes its value;
reader-facing copy is the PDD's, carried as entries of
`src/views/copy.json` that cite their copy-deck section or, for text
a page's Markdown holds (the standing disclaimer of `scenario.md`),
between copy markers that cite it; a reader-facing string the PDD
does not provide is a **fixed-here** text — an entry of the same
registry ([§5.8](#58-view-layer)) or a copy-marked block of a page's
Markdown, such as the no-JavaScript fallback of
[§5.10](#510-failure-states) in `scenario.md` — listed for the
[SC-7](pdd.md#101-success-criteria) (scientific sign-off) review;
and state-derived text is generated from the active state, never
frozen. The mechanical part of this split is checked by
`.github/scripts/check_pdd_agreement.py` in the `links` job of
`doc-links.yml` ([§6.3](#63-ci-workflows)), which establishes the
four properties that §5.13 lists: every cited anchor is a real
heading, each setting equals the value its quote states inside the
cited section, every registry text and every copy-marked block is
reproduced verbatim from its cited section, and the configuration's
keys match the settings table of §5.13. Whether a quote is the
governing statement, whether that table lists every PDD setting, and
whether the fixed-here texts are acceptable remain human review: the
owner's acceptance of §5.13 and of every configuration or copy
change, and the SC-7 approval.

### Document conventions

The mechanical conventions of the earlier documents bind here: link
text is the target's verbatim heading or register-row title, status
suffixes included (a bare linked ID carries any paraphrase outside
the link); every requirement, decision, and risk ID is linked at its
first use under each `##` or `###` heading, with its source's
verbatim title unless the adjacent words already say what it is;
prose wraps at 72 columns; the word "outcomes" is not used; the PRD
and PDD are never called design documents. Each section ends with a
References list; sections that close a register row say *Closes:*,
and each names its *Verification (planned):* — the check planned to
show that the section's content holds. None of the checks this draft
introduces has run, so no such line reports a result; executed
results live only in the release records of
[§7.7](#77-site-validation-and-release-checklist), which the
withdrawal procedure of
[§4.3](#43-retention-rollback-recovery-and-withdrawal) saves before
it deletes a software release and carries into the replacement
release. In generated registers (the §8 matrix) bare `§n`
coordinates are a stated exemption from the link rule, as are table
rows and lines carrying a link or a literal command.

## 1. DDD decision register

The register holds the decisions this document closes itself:
choices the approved documents explicitly left to the DDD, plus
conventions this document must fix that have no governing source. A
row is **Open** while its choice is unresolved, **Proposed** when a
drafted section proposes a resolution, and **Accepted** when the owner
accepts that section; the register records the chosen option, the
grounds, and the check planned to verify the choice.

| ID | Decision to close | Constraints and candidates | Sources | Status |
|---|---|---|---|---|
| DD-1 | Scarp-dip column encoding. | Closed set: wider scaled integer, or a dictionary of the 35,854 distinct values with a 16-bit per-record index. Must restore the recorded 0.001° precision exactly for filtering, statistics, and downloads. | [HLDD §5.2 — Simulation data organization (ADR-0013)](hldd.md#52-simulation-data-organization-adr-0013); [ADR-0013](../adr/0013-row-level-scenario-artifact.md). | Proposed (2026-10-30) |
| DD-2 | Per-calculation numerical tolerances. | Display-rounded values compare exactly; full-precision values compare within a small per-calculation tolerance the DDD fixes and justifies. | [PDD §10.1 — Success criteria](pdd.md#101-success-criteria) (closing note); [HLDD §5.6 — Reference results and verification (ADR-0015)](hldd.md#56-reference-results-and-verification-adr-0015). | Proposed (2026-10-30) |
| DD-3 | Browser-testing tool and test inventory. | One evergreen browser engine; runs locally on request; required before a release; covers the checks named in the ADR-0015 second amendment of 2026-10-29 and the HLDD §9 browser-lane list. | [HLDD §9 — Testing and release architecture](hldd.md#9-testing-and-release-architecture); [ADR-0015](../adr/0015-golden-scenario-parity.md). | Proposed (2026-10-30) |
| DD-4 | Measurement-panel arrangement (tabs or stacked). | Both named by the PDD, which delegates the final arrangement as visual design; the walkthroughs and the default-panel rule must hold under the chosen arrangement, the arrangement must accommodate the reserved fourth panel slot ([D-20](pdd.md#1-decision-register), Open), and it decides how the one field-overlay switch of PDD §4.4 serves the panels. Because the choice is user-visible, the row closes only with the owner's acceptance of the drafted section. | [PDD §4.1 — Measurement views (FR-O1)](pdd.md#41-measurement-views-fr-o1); [PDD §4.4 — Field overlay (FR-O5, D-18 Proposed)](pdd.md#44-field-overlay-fr-o5-d-18-proposed). | Proposed (2026-10-30) |
| DD-5 | Histogram bin rule. | Automatic bin width scaled to the matching range and count; the rule stated in the panel's info note; the width panel's log-scale toggle, which the PDD permits — “may offer” — where the matched range spans more than two decades: offered, by the owner's ruling of 2026-10-30, with bins this document fixes. Because the info note and the bins are user-visible, the row closes only with the owner's acceptance of the drafted section. | [PDD §4.1 — Measurement views (FR-O1)](pdd.md#41-measurement-views-fr-o1). | Proposed (2026-10-30) |
| DD-6 | Download file-name scenario-slug rules. | Must instantiate the PDD's file-name template deterministically from scenario state. Because the file name is user-visible, the row closes only with the owner's acceptance of the drafted section. | [PDD §6.2 — File naming](pdd.md#62-file-naming). | Proposed (2026-10-30) |
| DD-7 | Design §4.2 against the proposed no-raw-twin rule and record the dependency. | ADR-0014 marks the rule proposed: the compressed file is the artifact, with no uncompressed twin uploaded. The DDD designs against it and records the dependency; settling or changing the rule itself belongs to the ADR process, not to this document. | [ADR-0014](../adr/0014-committed-content-hashed-artifacts.md). | Proposed (2026-10-30) |
| DD-8 | Release data-attachment mechanism. | Attaching the current exports to a software release: manual checklist step or automated job. | [HLDD §9 — Testing and release architecture](hldd.md#9-testing-and-release-architecture) (Software-release data attachments). | Proposed (2026-10-30) |
| DD-9 | Chart text-alternative mechanism. | Every chart needs a text alternative equivalent to its content; the PDD sets the target, the DDD the mechanism. Because the mechanism is user-visible, the row closes only with the owner's acceptance of the drafted section. | [PDD §9.3 — Accessibility target (D-17, Proposed)](pdd.md#93-accessibility-target-d-17-proposed); [HLDD §7.2 — Accessibility and supported environments](hldd.md#72-accessibility-and-supported-environments). | Proposed (2026-10-30) |
| DD-10 | Field-naming convention at the pipeline-to-application boundary. | Export field names cross from the Python pipeline into TypeScript; fix one convention and the single mapping point. No approved document governs this; the row exists so the choice is registered rather than implicit. | [HLDD §12 — Scope of the following documents](hldd.md#12-scope-of-the-following-documents) (module interfaces; schemas). | Proposed (2026-10-30) |
| DD-11 | Canonical scenario serialization. | One lossless, machine-readable form of the accepted scenario, byte-identical from the Python reference generator and the TypeScript client, shared by the reference results' scenario inputs, the download package, and the P2 shared-link vocabulary; display state excluded. PDD §6.1 fixes the package contents but no serialization; the fourth package member, `scenario.json` ([§5.9](#59-downloads)), is a user-visible addition, so the row closes only with the owner's acceptance of §5.6 and §5.9. | [FR-D1 — Download matching simulation records and statistics](prd.md#fr-d1-download-matching-simulation-records-and-statistics); [PDD §6.1 — Download package (FR-D1)](pdd.md#61-download-package-fr-d1); [PDD §7.1 — Shared links](pdd.md#71-shared-links). | Proposed (2026-10-30) |
| DD-12 | Performance reference environment. | The amended PDD §9.1 sets as reference conditions "a fixed reference environment standing in for a mid-range laptop (2020 or later) — a cloud virtual machine whose exact specification the DDD fixes", each time budget judged at the 95th percentile of 30 measured runs; HLDD §2 (Performance budgets) leaves "the machine specification and the run procedure" to the DDD, and ADR-0016 (Proposed) records the kind — an AWS virtual machine of fixed specification, defined by Terraform — and leaves "the exact values" to the DDD. Left to the DDD: instance type and region, image, root volume, the network conditions beyond the PDD's 10 Mbps, and the percentile's definition over 30 runs, which must meet HLDD §2's "for at least 95% of measured interactions". Candidates: instance types without CPU burst credits; burstable types, whose CPU credits tie a run to the instance's history, are excluded. The environment is the agreed acceptance baseline, recreatable from the repository, not a calibration against laptops; its timings still vary from run to run. Because every [SC-4](pdd.md#101-success-criteria) (performance) verdict rests on the choice, the row closes only with the owner's acceptance of the drafted section. | [PDD §9.1 — Performance budgets (D-9, Proposed)](pdd.md#91-performance-budgets-d-9-proposed); [HLDD §2 — Architectural constraints](hldd.md#2-architectural-constraints) (Performance budgets, amended 2026-10-30); [HLDD §7.1 — Performance estimates and verification](hldd.md#71-performance-estimates-and-verification); [ADR-0016](../adr/0016-performance-reference-environment.md) (Proposed). | Proposed (2026-10-30) |

### Closure notes (Proposed 2026-10-30)

Each note states the proposed resolution, its grounds, and the check
planned to verify it; none of those checks has run yet. Figures
marked *drafting measurement* were taken while drafting on
`data/processed/dem/data.parquet` (SHA-256
`6a6e9149066f503588e09ecb6772a8392685716672e298d75aa925e7826eb303`;
pipeline package version 0.2.0) by a measurement battery that is not
in the repository. Each names the repository check, with its IP
task, that will reproduce it, and stays provisional until that check
runs.

1. **DD-1 — dictionary encoding for the scarp-dip column.** The
   column is stored as a 16-bit index (`uint16`) into a dictionary of
   the distinct recorded values, the dictionary itself stored as
   `int32` thousandths of a degree in ascending order; a dip restores
   as `dictionary[i] / 1000`, one division of an exact integer that
   reproduces the pipeline's value bit for bit (the restore rule of
   [§3.1](#31-scenario-artifact-binary-layout)). Grounds, from
   drafting measurements ([§3.8](#38-measured-sizes)): the shipped
   vintage holds 35,854 distinct dip values, well within the indices
   0–65,534 that leave the `uint16` null sentinel 65,535 free (a
   vintage with more distinct values would put an index on the
   sentinel and fail the export rule `sentinel-collision` of
   [§4.1](#41-export-task-and-validation)); and the complete artifact
   in the spec-exact framing of §3.1 measures 3,288,980 bytes raw /
   944,325 gzip −9 in the dictionary layout, against 3,839,232 /
   991,359 for a 32-bit scaled-integer column — about 550 KB smaller
   decompressed (less memory and decode work) and 4.7 % smaller
   compressed, the size that the 4 MB payload budget of
   [PDD §9.1 — Performance budgets (D-9,
   Proposed)](pdd.md#91-performance-budgets-d-9-proposed) counts. The
   143,416-byte dictionary is counted in those totals. The export run
   reproduces the selected layout's figures: the artifact manifest's
   `blocks` lengths (T-11) and the payload diagnostic (T-17). No
   repository check builds the rejected layout, so its figures stay
   drafting measurements that ground the choice without being
   normative. Both layouts restore the recorded 0.001° exactly.
   Because the dictionary is sorted, indices are rank-ordered: a dip
   range filter binary-searches the window endpoints in the
   dictionary once, then compares bare `uint16` indices — no
   per-record indirection. *Verification (planned):* the bitwise
   round-trip rule `bitwise-restore` of
   [§4.1](#41-export-task-and-validation) (T-12), and the selected
   layout's [§3.8](#38-measured-sizes) figures, which every export
   run's size report and payload diagnostic reproduce (T-11, T-17).
2. **DD-2 — tolerances.** One rule, stated with its grounds in
   [§7.1](#71-numerical-tolerances): a full-precision value agrees
   with its reference when
   `|app − reference| ≤ 1e-9 · max(|reference|, 1e-3)`; every other
   comparison — integers (counts, selections, flags, codes),
   null-ness, histogram rules, edges, and counts, and display
   strings — is exact, and no case carries an override. Exact display
   agreement rests on construction, not on the tolerance:
   bit-identical inputs (the restore rule of
   [§3.1](#31-scenario-artifact-binary-layout)), operation-identical
   algorithms in the client and the reference generator
   ([§5.4](#54-statistics)), and one deterministic rounding rule,
   `displayRound` ([§5.8](#58-view-layer)). On a rounding tie any
   nonzero difference changes the displayed digit, and ties are
   common: 10.3 % of valid scarp-height values lie exactly on a
   0.01 m tie (drafting measurement, reproduced per vintage by
   `test_reference_results.py::test_full_display_tie_census`, T-14).
   The tolerance is the full-precision criterion of the closing note
   of [PDD §10.1 — Success criteria](pdd.md#101-success-criteria)
   plus a margin for a change of evaluation order: NumPy's pairwise
   reductions move means and standard deviations by at most 2.6e-13
   relative on the shipped columns (drafting measurement, reproduced by
   `test_reference_results.py::test_full_evaluation_order_effect`,
   T-14, which asserts at most 1e-11). At each column's largest
   magnitude the tolerance is 5.0e-9 m for scarp height, 4.6e-8 m for
   deformation-zone width, and 9.0e-8° for scarp dip, against the
   [D-23](pdd.md#1-decision-register) (Reader-facing display
   precision per quantity) steps of 0.01 m, 0.1 m, and 1° (drafting
   measurements; §7.1 names the manifest figures that reproduce
   them). The `1e-3` floor, one recording step of the 0.001-grid
   columns (slip records at 1e-4), keeps near-zero statistics from
   demanding relative agreement that a change of evaluation order
   could break. A defect whose effect on every compared value stays
   below the tolerance is not detected by the full-precision
   comparison; selections, counts, flags, and display strings compare
   exactly and do not rely on it.
   *Verification (planned):* the parity runs of
   [§7.2](#72-calculation-parity-tests) show conformance at these
   values — a run does not justify the tolerance; these grounds do —
   and print the largest observed full-precision difference
   (expected 0) as a diagnostic; the two named full-data tests
   reproduce the tie share and the evaluation-order effect.
3. **DD-3 — browser-testing tool.** Playwright (`@playwright/test`
   1.47.2) driving the Chromium build it pins — one evergreen engine,
   per the second amendment of 2026-10-29 to
   [ADR-0015](../adr/0015-golden-scenario-parity.md) — with
   `@axe-core/playwright` 4.10.0 as its one accessibility engine, both
   pinned in [§2](#2-repository-structure-naming-and-toolchain),
   wrapped in the Gradle task `webappBrowserTest`, which first
   installs that Chromium build through `playwrightInstall` (§2), run
   locally on request and required before a release; no lifecycle
   task and no CI job runs it. Grounds: scriptable against the
   locally built site, auto-waiting assertions instead of sleep-based
   timing, machine-readable pass/fail and traces, no hosted testing
   service. The inventory and the functional projects `desktop` and
   `mobile` are [§7.5](#75-browser-test-lane)'s. The same pinned
   Playwright runs the `measure` project — the feasibility
   measurement that
   [HLDD §7.1 — Performance estimates and
   verification](hldd.md#71-performance-estimates-and-verification)
   delegates to [§7.6](#76-performance-and-compatibility-measurements),
   not part of this lane — through `webappMeasureReference` (§2) on
   the reference environment that §7.6 fixes
   ([DD-12](#1-ddd-decision-register)).
   *Verification (planned):* the pins are read from the committed
   `package.json` (T-01), and the release checklist of
   [§7.7](#77-site-validation-and-release-checklist) records each
   lane run.
4. **DD-4 — stacked measurement panels.** The three measurement
   panels render stacked inside `#gre-panels` ([§5.8](#58-view-layer),
   which closes the row), in the canonical measurement order (scarp
   height, deformation-zone width, scarp dip), each a labeled
   `<section>`; the reserved fourth slot
   ([D-20](pdd.md#1-decision-register)) is a documented insertion
   point after the third. The PDD's default panel on load is
   satisfied by initial focus and scroll at the selected
   measurement's panel — scarp height by default — when the page URL
   carries no fragment; when the first render shows the empty state
   or a failure, the target is `#gre-state` instead. When
   `location.hash` is not empty — a link to the full disclaimer at
   `#gre-disclaimer`, for instance — mount moves no focus; after the
   first commit, when the fragment names an element outside
   `#gre-root`, it calls that element's `scrollIntoView()`, because
   the commit replaced the shorter fallback above it, and otherwise
   it moves no scroll
   ([§5.11](#511-accessibility-supported-environments-and-navigation-lifecycle)).
   The stacked panels share the one field-overlay switch of
   [PDD §4.4 — Field overlay (FR-O5, D-18
   Proposed)](pdd.md#44-field-overlay-fr-o5-d-18-proposed),
   which sits in the results header, and this note records how the
   arrangement reads that section. The switch is display state, which
   Reset leaves alone: the Reset of
   [PDD §3.7 — Population, scarp filter, family view,
   reset](pdd.md#37-population-scarp-filter-family-view-reset) covers
   the scenario controls of PDD §3.1–§3.8, while the overlay is a
   results control of PDD §4.4. It applies to the height and width
   panels and stays enabled, and the PDD's "for scarp dip, the switch
   is disabled with the note" becomes: while the switch is on, the
   scarp-dip panel's `.gre-legend` slot shows the note "Field sources
   provide no comparable scarp-dip measurement." as HTML text, never
   inside the chart's `<svg>`. Grounds:
   stacking keeps every panel and its caveats in the default view, as
   [SC-5](pdd.md#101-success-criteria) (candor) requires, needs no
   tab-state management or announcement, survives the 360 px floor
   and printing, and leaves the PDD walkthrough steps executable in
   written order; one switch serves three panels visible at once, so
   disabling it for the scarp-dip panel would disable it for all
   three; and a fragment names where the reader asked to land, so
   mount moves no focus and brings the named element back into view
   once the commit has grown the page above it. Neither the
   browser's fragment scroll nor scroll anchoring survives that
   commit. *Verification (planned):* the browser lane
   ([§7.5](#75-browser-test-lane)) — `golden-scenario.spec.ts`
   (every applicable caveat in the default view), the overlay drive
   of `interactions.spec.ts` (marks on the height and width panels,
   the scarp-dip note as HTML text, Reset leaving the switch),
   `a11y.spec.ts`, and two drives of `mount.spec.ts`: a load of
   `scenario/` without a fragment ends with focus on
   `#gre-scarp_height` and that section in the viewport, and a direct
   load of `scenario/#gre-disclaimer`, its artifact response held by
   `page.route` until after the page's `load` event so that the first
   commit lands late, ends with `#gre-disclaimer` in the viewport and
   focus not on the first panel.
5. **DD-5 — histogram bin rule.** One rule, implemented as
   `histogram()` in `src/stats/histogram.ts` and as its Python twin
   `histogram()` in `product_export.py` for the reference generator,
   and stated exactly in [§5.12](#512-charts): computed on the
   matched valid values as integers in recording steps, the width is
   Freedman–Diaconis — Scott's rule when the interquartile range is
   zero, one bin for constant data — rounded up to whole display
   steps of the panel's D-23 precision, with every power of ten
   written as an integer literal, and widened until at most 60 bins
   remain; bins are half-open, each including its lower edge, and
   their per-class counts sum to the panel's valid count. By the
   owner's ruling of 2026-10-30, the width panel's histogram view
   also offers the log-scale toggle that
   [PDD §4.1 — Measurement views
   (FR-O1)](pdd.md#41-measurement-views-fr-o1) permits ("may offer")
   where the matched positive valid widths span more than two
   decades, the PDD's condition. The logarithmic bins double in width
   from 0.1 m, and the widths below 0.1 m, 0 m included, are counted
   in a leading bar labeled "below 0.1 m"; `histogramLog()` and its
   Python twin `histogram_log()` compute them by the Logarithmic
   scale rule of §5.12, the one home of the offer test, the edges,
   the first edge, the assignment, and the counts.
   [§5.8](#58-view-layer) shows the toggle only while the width
   panel's histogram view renders a chart and the scale is offered;
   when it is not offered, the histogram is linear and the panel's
   `logScale` display state
   ([§5.6](#56-scenario-state-and-url-encoding)) returns to false.
   The cumulative view stays linear, so the read-off and the
   pre-marks do not change. The panel's info note states the rule in
   fixed-here sentences, which stand verbatim in §5.12 and are
   entries of the §5.8 copy registry — on the width panel, while the
   toggle is shown, one more for the log bins — listed for the
   [SC-7](pdd.md#101-success-criteria) (scientific sign-off) review.
   Grounds: the PDD requires an automatic width scaled to the
   matching range and count, with the rule stated; Freedman–Diaconis
   is the standard robust such rule, with Scott's rule as its
   fallback when the quartiles coincide; widths in whole display
   steps keep every edge printable at the D-23 precision, and every
   log edge is a multiple of the 0.1 m width step, so log labels
   print exactly at that precision too, with no PDD change; integer
   arithmetic in recording steps, on both scales, lets the client and
   the generator produce identical bins; and half-open bins assign
   values on internal edges deterministically. Because the info note
   and the bins are user-visible, the row closes with the owner's
   acceptance of the drafted section, as DD-4 does.
   *Verification (planned):* reference coverage, not hand-written
   expectations. [§3.6](#36-reference-results) carries each golden
   scenario's `histogram` and, for the width panel, `histogram_log`
   (null when the toggle is not offered), and the
   `synthetic.histograms` cases, linear and logarithmic; the parity
   runs of [§7.2](#72-calculation-parity-tests) compare them exactly;
   the fixture lane of `test_reference_results.py` recomputes the
   linear and the logarithmic counts with `numpy.histogram`;
   `histogram.test.ts` covers mechanics only (the cap loop ends with
   K ≤ 60, edges ascend, log edges double, a value on a log edge
   falls in the bin that edge starts, the counts and the leading bar
   sum to n, determinism); and the browser lane
   ([§7.5](#75-browser-test-lane)) checks the info note and, on the
   width panel of
   [GS-0](pdd.md#102-golden-scenarios) (Empty scenario (no active
   slip window), default population), the toggle and its octave bin
   table.
6. **DD-6 — download slug rules.** [§5.9](#59-downloads), which
   closes the row, fixes the slug exactly. In summary: the slug is
   the `_`-joined `key-value` tokens, in the key order `dip`,
   `sediment`, `depth`, `density`, `window`, `offset`, `classes`, of
   every part of the canonical scenario
   ([DD-11](#1-ddd-decision-register)) that differs from the default
   scenario's, and `all` when none does. The sediment token names the
   uniform arm (`Homogeneous`) and then the layered arm
   (`Heterogeneous`), each arm with a selection as its word followed
   by its selected labels in the `arm_strength_states` order of
   [§3.2](#32-artifact-manifest); `window` is `{min}-to-{max}` from
   the effective endpoints of `slip_window`, and `offset` is
   `offset_max`; an empty group's raw value is `none`; every `.`
   becomes `p` before the raw values are sanitized to `[a-z0-9-]`;
   and a slug over 80 characters keeps its first 71, drops trailing
   `-` and `_`, and appends `-` plus the first 8 hexadecimal digits of
   the FNV-1a 64-bit hash of the full slug (offset basis
   `0xcbf29ce484222325`, prime `0x100000001b3`). The slug is one
   field of the [PDD §6.2 — File naming](pdd.md#62-file-naming)
   template, which also carries the population token, the data
   version, and the date; the software version rides in the
   download's provenance text ([PDD §6.1 — Download package
   (FR-D1)](pdd.md#61-download-package-fr-d1)). Grounds: a pure
   function of the accepted scenario; legible for common cases;
   injective before truncation, so distinct scenarios get distinct
   untruncated names — {(Homogeneous, Strong), (Heterogeneous, Weak)}
   gives `sediment-uniform-strong-layered-weak` and {(Homogeneous,
   Weak), (Heterogeneous, Strong)} gives
   `sediment-uniform-weak-layered-strong`, and windows of 1.5–3 m and
   1–5.3 m give `window-1p5-to-3` and `window-1-to-5p3`; and a
   truncated name keeps 32 bits of the full slug's hash, so two
   truncated names can collide — the file name is a label, and the
   package's `scenario.json` member is the scenario's identity.
   Because the file name is user-visible, the row closes with the
   owner's acceptance of the drafted section, as DD-4 does.
   *Verification (planned):* `file-name.test.ts`
   ([§7.4](#74-application-tests)) — the two sediment selections and
   the two windows above give distinct slugs; within each group —
   the sediment pairs, dips, scarp classes, depths, and densities —
   every subset gives a distinct token, and no token contains the
   `_` that joins tokens, so injectivity is checked token by token,
   never by enumerating complete scenarios; a truncated slug is at
   most 80 characters and ends in the hash suffix; and the hash
   vectors match.
7. **DD-7 — no-raw-twin dependency.**
   [§4.2](#42-publication-of-a-data-vintage) is designed against the
   proposed rule of
   [ADR-0014](../adr/0014-committed-content-hashed-artifacts.md): the
   gzip file is the artifact; nothing uploads an uncompressed twin.
   The rule itself stays ADR-0014's to settle; this document records
   the dependency and would follow an amendment.
   *Verification (planned):* the export rules `pointer-exact` and
   `file-names` of [§4.1](#41-export-task-and-validation) — the
   pointer lists exactly the vintage's files, each name matching its
   role's one pattern, for the scenario artifact
   `scenario-<h12>.bin.gz` — so no uncompressed twin can enter a
   staged vintage.
8. **DD-8 — release data attachments as a scripted owner step.** The
   release checklist carries a verbatim `gh release upload` command
   block whose file list is generated from the committed pointer
   manifest and which also regenerates the dashboards' plotting CSVs
   and uploads them
   ([§4.4](#44-licensing-archival-distribution-and-release-attachments)).
   The owner runs it while the software release is still a draft;
   the checklist's attachment check then re-downloads every attached
   file the pointer names and compares each SHA-256 with the pointer
   manifest, and the release is published only after that check,
   because the repository's releases are immutable: once published, a
   release's assets can no longer change. Grounds: the owner already
   runs every publication step ([HLDD §9 — Testing and release
   architecture](hldd.md#9-testing-and-release-architecture)), a
   scripted step adds no workflow credentials or new automation
   surface for the MVP, and the identity check is byte-exact either
   way. Automating it later is an ordinary CI change under
   [§6.3](#63-ci-workflows). *Verification (planned):* the attachment
   check of the [§7.7](#77-site-validation-and-release-checklist)
   release checklist.
9. **DD-9 — chart text alternatives.** The statistics table of
   [§5.8](#58-view-layer), which
   [PDD §9.3 — Accessibility target (D-17,
   Proposed)](pdd.md#93-accessibility-target-d-17-proposed) designates
   as the canonical text alternative for every measurement chart,
   stays canonical, and every element a chart draws maps to a text
   element built in the same render pass from the same data — the
   element list of
   [§5.11](#511-accessibility-supported-environments-and-navigation-lifecycle),
   which closes the row. Bar totals, per-group segments, and the
   value axis map to a bin table with one row per bin — on the
   logarithmic scale, one per octave bin, led by a "below 0.1 m" row
   when that bar is drawn; the cumulative curve and the read-off
   marker map to the statistics table and the read-off `<output>`;
   field-overlay ticks map to a field table; and the legends and the
   scarp-dip overlay note are HTML already. The chart's
   `<svg role="img">` sits in a `<figure>` whose
   `<figcaption id="{pid}-cap">` is a one-sentence summary; its
   fixed-here `aria-label` names the measurement, the chart kind, the
   panel head's valid count N, and the stacking, overlay, and
   log-scale state; its `aria-describedby` targets the figcaption;
   and its `aria-details` targets the collapsed
   `<details id="{pid}-data">` that follows the figure, holding the
   bin table `{pid}-bins` and, while the panel draws field ticks, the
   field table `{pid}-field`. Nothing sits inside the svg, whose
   children are presentational under `role="img"`, and a suppressed
   chart renders neither figure nor disclosure. Grounds: the element
   list makes the alternative complete for what each chart draws;
   building text and marks from the same data keeps them consistent
   but does not by itself make the text complete. The tables are
   visible on demand rather than screen-reader-only because the
   per-class split cannot rest on segment color — PDD §9.3 applies
   the never-color-alone rule of
   [FR-G2 — Scarp-type colors and
   identification](prd.md#fr-g2-scarp-type-colors-and-identification)
   — so sighted readers need them too; the disclosure label and the
   table captions are fixed-here copy for the SC-7 review. The
   disclosure is user-visible, so the row closes with the owner's
   acceptance of the drafted section, as DD-4 does.
   *Verification (planned):* `chart-text.test.ts`
   ([§7.4](#74-application-tests)) on the pure table and label
   builders with injected counts (header order, the family fold keeps
   row totals, each row's cells sum to its Total, field-row order,
   one label per state combination); the browser lane's
   `a11y.spec.ts` ([§7.5](#75-browser-test-lane)) — role, accessible
   name and description, the `aria-details` target, table sums
   against N, segment and tick counts, and axe with the disclosures
   closed and open; and the assistive-technology pass of
   [§7.7](#77-site-validation-and-release-checklist), which reads one
   bin table and one field table.
10. **DD-10 — snake_case at the data boundary.** Two rules. Every
    field name in the exports, both manifests, the download files,
    and any future URL parameters is snake_case; and every name that
    denotes a pipeline column is the pipeline's sanitized name,
    exactly as `register.sanitize_column` already produces for the
    warehouse DDL — the thirteen names `trial`, `fault_dip`,
    `sediment_strength`, `cohesion`, `set`, `depth`, `density`,
    `slip`, `scarp_height`, `dzw`, `scarp_dip`, `scarp_class`, and
    `us_ud`. TypeScript code uses camelCase internally, and
    `src/decode/fields.ts` is the single mapping point, with total
    coverage: every structural key of every JSON format the
    TypeScript reads, nested members included, is renamed to its
    `snakeToCamel` form through that module's tables, which
    [§5.2](#52-artifact-loading-and-decoding) lists with their one
    renaming function, `mapRecord`. Four things are never renamed:
    keys that are data values — the maps of the
    [§3](#3-data-formats) records-and-maps rule, keyed by block,
    column, measurement, class, or file names or by dips; enumerated
    values; the manifests' `provenance` object, carried through as
    one opaque value; and the `inputs` objects of
    [§3.6](#36-reference-results), which `parseScenario` reads in
    their canonical [DD-11](#1-ddd-decision-register) form. All JSON
    loading goes through `decode/`.
    Grounds: the convention already exists in the pipeline
    (`register.py`) and keeps export fields greppable across Python,
    SQL, and JSON; verbatim data-valued keys let column names be
    reused unchanged in downloads, references, and the configuration
    keys of [§5.13](#513-application-configuration); and one mapping
    module keeps the rename auditable. *Verification (planned):* the
    export rules `format-spec` and `dd10-names` of
    [§4.1](#41-export-task-and-validation) (T-12), and
    `fields.test.ts` ([§7.4](#74-application-tests)): the tables are
    total and injective over the closed field lists of §3.2–§3.6 and
    the canonical scenario object, each camelCase name is
    `snakeToCamel` of its snake_case name, and decoding each format's
    fixture leaves no snake_case key at any depth outside the
    data-keyed maps, `provenance`, and the `inputs` objects.
11. **DD-11 — canonical scenario serialization.** The accepted
    scenario has one canonical JSON form, defined in
    [§5.6](#56-scenario-state-and-url-encoding), which closes the
    row: an object whose DD-10 snake_case keys are `fault_dip`,
    `sediment` (pairs of `set` and `sediment_strength`), `depth`,
    `density`, `entry_mode`, `slip_window`, `offset_max`,
    `population`, and `scarp_class`, and which holds only strings
    (manifest vocabulary verbatim, enumerated values, canonical
    decimals), integers, arrays, objects, and `null` — never a float,
    and never display state (overlay, family view, panel view, log
    scale, read-off, disclosures). §5.6 fixes every member's domain
    and order — the sediment pairs sort by `set`, then
    `sediment_strength`, in code-point order, unlike the display
    order of the controls — and the serialization: keys sorted by
    code point and no whitespace, so `canonical_scenario()` in
    `product_export.py` and `serializeScenario` in
    `src/state/scenario-json.ts` write the same bytes, nothing in the
    object depending on float formatting; `parseScenario` throws
    `ScenarioInputError`, the typed invalid-input failure of
    [§5.10](#510-failure-states), on an unknown key or an
    out-of-vocabulary value. Three consumers share it: the reference
    results' scenario `inputs` ([§3.6](#36-reference-results)), the
    download package's `scenario.json` member
    ([§5.9](#59-downloads)), and the value vocabulary of the P2
    shared-link grammar (§5.6). Grounds:
    [FR-D1 — Download matching simulation records and
    statistics](prd.md#fr-d1-download-matching-simulation-records-and-statistics)
    requires "sufficient provenance to reproduce and cite the result",
    and [SC-2](pdd.md#101-success-criteria) (download
    reproducibility) asks a reviewer to identify the scenario
    settings; the summary is prose for readers and a truncated file
    name keeps only a hash, so the package needs one machine-readable
    identity, which the parity harness also needs to replay a golden
    scenario; and PDD §6.1 fixes the package contents but no
    serialization, so the convention is registered here. Because the
    `scenario.json` member it adds to that package is user-visible,
    the row closes with the owner's acceptance of §5.6 and §5.9, as
    DD-4 does. *Verification (planned):*
    `scenario-json.test.ts` ([§7.4](#74-application-tests)) — the
    golden bytes for [GS-1](pdd.md#102-golden-scenarios) ("US-1: dips
    {30°, 40°}, Strong (uniform and layered), offset mode 3 m"),
    round trips, and the canonical-decimal cases; the fixture lane of
    `test_reference_results.py`, where the generator's GS-1 `inputs`
    equal the same golden literal; and `consistency.spec.ts`
    ([§7.5](#75-browser-test-lane)), which compares the downloaded
    `scenario.json` with the page's scenario.
12. **DD-12 — one `c6i.xlarge` in `us-east-1` as the performance
    reference environment.**
    [§7.6](#76-performance-and-compatibility-measurements), which
    closes the row, fixes the environment and the run procedure
    exactly, and `perf/`
    ([§2](#2-repository-structure-naming-and-toolchain)) provisions
    it. In summary: one Amazon EC2 instance of type `c6i.xlarge`
    (4 vCPUs, 8 GiB, no CPU burst credits) in region `us-east-1`,
    running Ubuntu Server 24.04 LTS for amd64 from the AMI ID that
    the default of the Terraform variable `ami_id` pins — changed
    only by a deliberate commit — on a gp3 root volume of 30 GiB;
    the network emulated in the browser at 1,250,000 bytes/s down and
    up (10 Mbit/s, the PDD's 10 Mbps) with a fixed 40 ms round trip,
    the project's choice, taken from the `rttMs` of the Chrome
    DevTools and Lighthouse desktop profile `desktopDense4G`, whose
    own request-latency and throughput-emulation fields are 0; and
    each time budget judged on the nearest-rank 95th percentile,
    `sorted[28]`, the 29th of the 30 ascending samples, so that a
    workload meets its time budget exactly when at least 29 of its 30
    observed runs are within it — the "for at least 95% of measured
    interactions" of
    [HLDD §2 — Architectural constraints](hldd.md#2-architectural-constraints)
    (Performance budgets). The kind of environment — an AWS virtual
    machine of fixed specification, defined by Terraform, created for
    a run, destroyed once a measurement run has completed and its
    report is downloaded, whether the report records a budget pass or
    a budget miss, and kept after an infrastructure, execution, or
    report-retrieval failure
    ([§7.6](#76-performance-and-compatibility-measurements)) — is
    that of
    [ADR-0016](../adr/0016-performance-reference-environment.md),
    which is Proposed: the Terraform root of T-59, and with it every
    reference run, waits for its acceptance, owner action OA-12 of
    [IP §4 — Owner and research-group actions](ip.md#4-owner-and-research-group-actions).
    Grounds: PDD §9.1 asks for a fixed stand-in for a device class,
    not a calibrated copy of one laptop, so no laptop benchmark
    enters the choice: the environment is the project's agreed
    acceptance baseline, a configuration anyone with the AWS account
    can recreate from the repository, not calibrated against laptops
    of the class it stands in for, and its timings predict no
    particular reader's machine (ADR-0016); a type without burst
    credits makes runs more repeatable — no run depends on a credit
    balance, as on a burstable type — but it is a reference
    configuration, not identical processor time: timings still vary
    from run to run (ADR-0016), which is why each budget is judged
    over 30 runs; 4 vCPUs and 8 GiB hold the browser's other
    processes, the virtual display, and the Playwright runner beside
    the main thread that carries the page's almost entirely
    single-threaded work (ADR-0016); the VM has no GPU, so Chromium
    rasterizes in software — a limitation of the reference
    environment, not a proven safety margin; one region keeps the
    pinned image ID valid, since an AMI ID belongs to one region, the
    pinned image keeps the operating system fixed between runs, and
    the root volume holds the system, Node.js, Chromium, the site
    tree, and the traces; the throughput is PDD §9.1's own, and the
    latency is fixed rather than measured because the VM may sit
    close to the CDN, where a measured round trip could flatter the
    result — a fixed emulation that standardizes the condition but
    neither reproduces the whole `desktopDense4G` profile nor removes
    all real network variation; and the nearest rank reads HLDD §2's
    criterion exactly — a single slow run among the 30 cannot fail a
    budget, and two slow runs always do — where
    `quantileLinear(sorted, 0.95)` of
    `src/stats/quantile.ts` ([§5.4](#54-statistics)), interpolating
    between the 28th and 29th samples, can pass a set in which only
    28 runs are within budget; `quantileLinear` stays the definition
    of the reported median. The rule is a sample-based acceptance
    rule: it says that the 30 observed runs met the budget, not that
    later runs will, and it does not presume that an isolated slow
    run is noise. Because every
    [SC-4](pdd.md#101-success-criteria) (performance) verdict rests
    on these values, the row closes with the owner's acceptance of
    §7.6, as DD-4 does.
    *Verification (planned):* every run's report records the
    `environment` fields of §7.6, read from the EC2 instance metadata
    service — `kind` `aws-ec2`, `instance_type`, `region`, and
    `ami_id` — and the emulated `network` values; §7.6 counts a run
    as SC-4 evidence only when they equal the values above, and the
    release checklist's item 5
    ([§7.7](#77-site-validation-and-release-checklist)) accepts only
    such a report (T-59, T-61).

## 2. Repository structure, naming, and toolchain

The webapp is a fourth Gradle module, `:subprojects:webapp`, added to
`settings.gradle.kts` beside `:subprojects:python`,
`:subprojects:mkdocs`, and `:deploy:terraform`. Its tree follows;
pure modules run in browsers and under Node, browser-only modules
need a DOM, and [§5.1](#51-modules-and-interfaces) holds the full
split:

```
subprojects/webapp/
  build.gradle.kts        # plugin and Node.js pins; tasks below
  package.json            # private; exact dev pins; npm scripts
  package-lock.json       # committed lockfile pins the whole tree
  tsconfig.json           # type check of the whole module
  tsconfig.node.json      # type check of the pure modules, no DOM
  build.mjs               # esbuild driver: bundle, stylesheet, tests
  playwright.config.ts    # §7.5 projects and local server
  README.md               # local lane invocation (§7.5)
  data/                   # pointer.json — committed vintage pin (§3.3)
  src/
    main.ts               # page entry: §5.11 navigation lifecycle
    app.css               # stylesheet source of build/dist/app.css
    config.ts             # §5.13 typed accessors over config.json
    config.json           # §5.13 product settings quoting the PDD
    decode/               # §5.2 loaders, decoder, fields.ts (DD-10)
    engine/               # §5.3 query engine (pure core)
    stats/                # §5.4 statistics: quantile.ts, histogram.ts
    convert/              # §5.5 offset-to-slip assist
    state/                # §5.6 state: parse.ts, scenario-json.ts
    views/                # §5.8, §5.12 pure builders, incl. format.ts,
                          #   chart-text.ts, copy.ts, copy.json
      dom/                # §5.8 DOM appliers (browser only)
    overlay/              # §5.8 overlay: model.ts (pure),
                          #   field-overlay.ts (browser only)
    download/             # §5.9 package.ts, csv.ts, zip.ts,
                          #   file-name.ts (pure); deliver.ts (browser)
    a11y/                 # §5.11 announcements, focus (browser only)
  test/                   # §7.4 Node tests with fixtures.ts and
                          #   compat-inventory.ts (§7.6);
                          #   caniuse-lite.d.ts (below); §7.2
                          #   parity.ts; zipcheck.py, the §5.9
                          #   archive check; spot-timing.ts, the
                          #   §5.3 diagnostic
  playwright/             # §7.5 browser lane (DD-3); serve.mjs,
                          #   global-setup.ts (the globalSetup module)
    specs/                # functional specs: desktop, mobile projects
    measure/              # §7.6 measurement specs: measure project
  perf/                   # §7.6 reference environment: Terraform root
    versions.tf           # Terraform and provider constraints
    main.tf               # the VM, its security group, and its SSH
                          #   key pair, which Terraform generates
    variables.tf          # aws_profile, operator_cidr, ami_id
    outputs.tf            # the values run.mjs reads
    .terraform.lock.hcl   # committed: exact provider versions
    cloud-init.yaml       # VM bootstrap and 24-hour shutdown
    run.mjs               # driver: run, destroy, ssh, status (below);
                          #   keeps the SSH key and known_hosts in a
                          #   per-run temporary directory, never in
                          #   ~/.ssh
    README.md             # owner instructions
```

**Toolchain pins.** The Node.js runtime and the Gradle plugin that
provides it are pinned in `subprojects/webapp/build.gradle.kts`, and
package versions in the committed lockfile
([ADR-0011](../adr/0011-webapp-toolchain.md), amendment 2). The plugin
version and the runtime version are separate pins:

```kotlin
plugins {
    base
    id("com.github.node-gradle.node") version "7.1.0"
}

node {
    version.set("22.12.0")
    download.set(true)
}
```

`settings.gradle.kts` has no `pluginManagement` block, so the module
carries the plugin version itself. The plugin downloads the runtime
into `subprojects/webapp/.gradle/nodejs/`, which the existing
`.gradle/` rule of `.gitignore` already ignores, and runs the npm
bundled with it (no `npmVersion` is set). Every build, local and CI,
therefore runs the same runtime, and no workflow step installs Node.js
([HLDD §4.3 — Language, toolchain, and repository structure
(ADR-0011)](hldd.md#43-language-toolchain-and-repository-structure-adr-0011):
"Local development and CI use the same declared tool versions").

Development dependencies, each listed at an exact version in
`package.json` (no `^` or `~` range): `typescript 5.5.4`,
`esbuild 0.24.0`, `@playwright/test 1.47.2`, `@types/node 22.10.2`
(the Node.js 22 typings that `tsconfig.node.json` and the tests'
`node:test` imports need — they also declare the `fetch`,
`performance`, and `DecompressionStream` globals that `decode/`
calls in both environments — released alongside the runtime pin),
`@axe-core/playwright 4.10.0` (the accessibility engine of
[§7.5](#75-browser-test-lane), contemporary with the other pins; the
lockfile resolves its `axe-core` dependency to one exact version, and
`@playwright/test` satisfies its `playwright-core` peer), and
`caniuse-lite 1.0.30001687` (the browser-support dataset of the
compatibility test of
[§7.6](#76-performance-and-compatibility-measurements), which states
when the dataset is upgraded). The list is complete: another package
joins only by amending it. The shipped bundle has zero runtime
dependencies, so `dependencies` stays empty. The committed
`package-lock.json` pins the whole tree; builds install with
`npm ci`, and `npm install` runs only to create the lockfile or
change a pin. `node_modules/` is never committed: the entry
`subprojects/webapp/node_modules/` joins `.gitignore` before the
first npm command runs in the module, because no existing rule
covers it, while everything the module writes under `build/` — the
bundle, the compiled tests, the Playwright report and traces of
§7.5, and the measurement reports of §7.6 — is already covered by
the root `build/` rule. Upgrades are reviewed under ADR-0011; a new
toolchain introduced into the repository — a package that changes
what the reader receives or how it is built, or a tool such as the
Terraform of `perf/` (below) — needs an ADR first
([NFR-8 — Architecture decision record](prd.md#nfr-8-architecture-decision-record)),
and `perf/`'s is
[ADR-0016](../adr/0016-performance-reference-environment.md)
(Proposed); no application framework may be introduced. No DOM
implementation (jsdom, happy-dom, linkedom) joins the dependencies
either, although one would change neither: Node tests import only the
pure modules of [§5.1](#51-modules-and-interfaces), and every check
that needs a DOM belongs to the browser lane
([§7.5](#75-browser-test-lane)).

**npm scripts and `build.mjs`.** `package.json` has
`"private": true` and no `"type"` field, and carries the five scripts
the Gradle tasks run:

```json
"scripts": {
  "typecheck": "tsc --noEmit -p tsconfig.json && tsc --noEmit -p tsconfig.node.json",
  "test": "node build.mjs --tests && node --test \"build/test/**/*.test.js\"",
  "parity": "node build.mjs --tests && node build/test/parity.js",
  "browser-install": "playwright install chromium",
  "browser-test": "playwright test --project=desktop --project=mobile"
}
```

`npm ci` installs `@playwright/test` but downloads no browser, so
`browser-install` downloads the Chromium build that the locked
`@playwright/test` pins, unless that build is already present, into
Playwright's per-user browser cache outside the repository.

`node --test` receives the quoted glob unexpanded and runs only the
compiled test files; without the pattern, Node 22's default discovery
would also run every other `.js` file under a `test` directory, the
compiled parity harness included. Run without flags, `build.mjs`
builds the page assets: it bundles `src/main.ts` into
`build/dist/app.js` with `bundle: true`, `format: "esm"`,
`platform: "browser"`, `target: "es2020"`, `minify: true`, and no
source map, and it builds `src/app.css` into `build/dist/app.css`.
The format is ESM because esbuild's browser default, `iife`, empties
`import.meta`, and the navigation lifecycle of
[§5.11](#511-accessibility-supported-environments-and-navigation-lifecycle)
identifies its bundle by `import.meta.url`; ADR-0011 counts
minification among the reasons for a build step; and no source map
is written because `scenarioAssets` publishes exactly the one `.js`
and the one `.css` file
([§6.1](#61-build-outputs-asset-paths-and-page-scaffold)). With
`--tests`, `build.mjs` compiles every `test/**/*.test.ts` file and,
when that file exists, `test/parity.ts` into `build/test/` at the
same relative paths, each bundled with its imports
(`platform: "node"`, `format: "esm"`, `target: "es2020"`), and
writes `build/test/package.json` as `{"type": "module"}`, so Node
loads those outputs as ES modules while the module's own
`package.json` stays untyped. No other file of `test/` is an entry
point: the diagnostic `test/spot-timing.ts` is bundled by hand
(Node.js outside Gradle, below).

**Gradle tasks.** Every webapp task is a task type of the node-gradle
plugin, never Gradle `Exec`: only the plugin's runner puts the
downloaded Node.js and npm first on `PATH`, while a plain `Exec` runs
whatever `node` the machine provides, so the `Exec` style of the
python module does not carry over. The task types are
`com.github.gradle.node.npm.task.NpmTask` (property `npmCommand`) and
`com.github.gradle.node.task.NodeTask` (properties `script` and
`args`), both with an `environment` map; each depends on the plugin's
runtime setup by itself, and every task below other than `npmCi`
declares `dependsOn(npmCi)`.

| Task | Plugin task type and command | Wired into |
|---|---|---|
| `npmCi` | `NpmTask`, `npmCommand` `["ci"]`; inputs `package.json` and `package-lock.json`, output `node_modules/` | dependency of every task below |
| `tscCheck` | `NpmTask`, `npmCommand` `["run", "typecheck"]`: both TypeScript configurations, never fused with bundling | `check`, as its own task |
| `webappTest` | `NpmTask`, `npmCommand` `["run", "test"]`, with the environment variable `EGR_EXPECTED_NODE` set from `node.version`; `test/toolchain.test.ts` fails unless `process.version` equals `v` followed by that variable, so a run on any other runtime, or outside Gradle, fails | `check` |
| `webappParity` | `NpmTask`, `npmCommand` `["run", "parity"]`: the [§7.2](#72-calculation-parity-tests) harness — fetch, verify, replay | its own **Parity** step in the `webapp-test` job of `tests.yml` and the `webapp-bundle` job of `mkdocs.yml` ([§6.3](#63-ci-workflows)), and on demand locally — not `check`, which needs no research data and, once `npmCi` has downloaded the runtime and installed the packages, no network; the python suite's data-dependent skips are the precedent |
| `webappBundle` | `NodeTask`, `script` = `build.mjs`: `build/dist/app.js` and `build/dist/app.css` | `assemble`; consumed by the site build ([§6.1](#61-build-outputs-asset-paths-and-page-scaffold)) |
| `playwrightInstall` | `NpmTask`, `npmCommand` `["run", "browser-install"]`: the Chromium build of the locked `@playwright/test`, into Playwright's per-user browser cache | dependency of `webappBrowserTest`; run as `./gradlew :subprojects:webapp:playwrightInstall` before a local `measure` diagnostic ([§7.6](#76-performance-and-compatibility-measurements)) — never `check`, never CI |
| `webappBrowserTest` | `NpmTask`, `npmCommand` `["run", "browser-test"]`, also `dependsOn(":subprojects:mkdocs:mkdocsPreview")` and `dependsOn(playwrightInstall)`: the functional projects `desktop` and `mobile` against the preview tree ([§7.5](#75-browser-test-lane)) | the release checklist only — never `check`, never CI |
| `webappMeasureReference` | `NodeTask`, `script` = `perf/run.mjs`, `args` = `["run"]`, also `dependsOn(":subprojects:mkdocs:mkdocsPreview")`; environment `TF_VAR_aws_profile` = the Gradle property `egr.perf.awsProfile` when it is set (the owner sets it in `~/.gradle/gradle.properties`; it is never committed, and the script's preconditions refuse a run without it), and, when `-Pegr.perf.target=published` is given, `EGR_BASE_URL` = the `site_url` value of `subprojects/mkdocs/mkdocs.yml` (any other value of `egr.perf.target` fails the task when it executes, in a `doFirst` action before `run.mjs` starts, with the message `egr.perf.target must be 'published' (got '<value>')`, `<value>` being the value given): the `measure` project on the reference VM — created if it does not exist, destroyed once the measurement run has completed and its report is downloaded, whether or not the budgets are met ([§7.6](#76-performance-and-compatibility-measurements)) | owner-invoked, for the release checklist ([§7.7](#77-site-validation-and-release-checklist)) — never `check`, never CI |
| `webappMeasureDestroy` | `NodeTask`, `script` = `perf/run.mjs`, `args` = `["destroy"]`, with the same `TF_VAR_aws_profile`: `terraform destroy -auto-approve -input=false -var operator_cidr=192.0.2.1/32` in `perf/`, with no public-IP lookup, which removes every resource the state records and also succeeds when the VM has already terminated itself ([§7.6](#76-performance-and-compatibility-measurements)) | owner-invoked only — never `check`, never CI |

**Node.js outside Gradle.** Every command that runs `node` or `npx`
outside a Gradle task — a direct `run.mjs` call, such as the `ssh`
subcommand below or a `--dry-run`; a local `measure` diagnostic of
[§7.6](#76-performance-and-compatibility-measurements); a
`playwright/serve.mjs` started by hand ([§7.5](#75-browser-test-lane);
item 15 of [§7.7](#77-site-validation-and-release-checklist)); and
the bundling and running of the diagnostic `test/spot-timing.ts`
of [§5.3](#53-query-engine) — runs on the same plugin-downloaded
runtime, never on the machine's own `node`, whose version nothing
pins. Once `./gradlew :subprojects:webapp:npmCi`, run from the
repository root, has downloaded the runtime and installed the
packages, a shell whose working directory is `subprojects/webapp`
first runs

```sh
export PATH="$(ls -d "$PWD"/.gradle/nodejs/node-v22.12.0-*)/bin:$PATH"
```

and then the command, its paths relative to `subprojects/webapp`.
This is the one form: every other place in this document or the
implementation plan that runs Node.js outside Gradle cites it, and a
change of the runtime pin changes the version in it in the same
commit.

**TypeScript configuration.** `tsconfig.json` checks the whole
module: `"strict": true`; `"target": "ES2020"` and
`"lib": ["ES2020", "DOM", "DOM.Iterable"]`, the ES2020 syntax floor
chosen for the [PDD §9.2 — Browser and mobile baseline (D-16,
Proposed)](pdd.md#92-browser-and-mobile-baseline-d-16-proposed), with
required APIs checked against that baseline by
[§7.6](#76-performance-and-compatibility-measurements), never assumed
from the language label; `"module": "ESNext"` with
`"moduleResolution": "Bundler"`, because esbuild resolves imports and
`import.meta` needs an ES module target; `"resolveJsonModule": true`,
because `config.ts` and `copy.ts` import their JSON files;
`"isolatedModules": true`, because esbuild compiles each file alone;
`"noEmit": true`; and `"include"` set to `src/**/*.ts`,
`test/**/*.ts`, `playwright/**/*.ts`, and `playwright.config.ts`.
`tsconfig.node.json` extends it for the pure modules with
`"lib": ["ES2020"]`, so no DOM type exists, `"types": ["node"]`,
`"include"` set to `src/**/*.ts` and `test/**/*.ts`, and `"exclude"`
set to the browser-only files of the
[§5.1](#51-modules-and-interfaces) module table: `src/main.ts`,
`src/views/dom/**`, `src/overlay/field-overlay.ts`,
`src/download/deliver.ts`, `src/a11y/**`, and any other file §5.1
marks browser only. A pure file that uses a DOM identifier, directly
or by importing a browser-only file, therefore fails `tscCheck`.
`caniuse-lite` ships no type declarations, so
`test/caniuse-lite.d.ts` holds exactly `declare module 'caniuse-lite';`,
which both configurations include through `test/**/*.ts`, and no
`@types` package joins the list above. esbuild performs all emitting.

**Reference environment (`perf/`).** `perf/` is the Terraform root
that provisions, for `webappMeasureReference`, the performance
reference environment of
[§7.6](#76-performance-and-compatibility-measurements)
([DD-12](#1-ddd-decision-register)) — the "cloud virtual machine
whose exact specification the DDD fixes" of
[PDD §9.1 — Performance budgets (D-9,
Proposed)](pdd.md#91-performance-budgets-d-9-proposed), of the kind
that [ADR-0016](../adr/0016-performance-reference-environment.md),
Proposed, records together with its toolchain, Terraform `~> 1.7`
with the `hashicorp/aws` and `hashicorp/tls` providers. It is
separate from the parked data layer under `deploy/terraform/`: it
never references that directory and shares no module, state,
backend, or Gradle task with it. `perf/versions.tf` sets
`required_version = "~> 1.7"` (the owner's machine runs Terraform
v1.7.5) and requires the providers `hashicorp/aws` at `~> 6.0`, its
current major version, and `hashicorp/tls` at `~> 4.0`, which
generates the VM's SSH key; the committed `perf/.terraform.lock.hcl`
pins their exact versions, which `terraform init` without `-upgrade`
keeps. The lock file pins the providers, not the CLI: every report
records the Terraform version used
([§7.6](#76-performance-and-compatibility-measurements), Report).
Terraform is the operator's installation, never a Gradle
download, and the run refuses a `terraform` on `PATH` outside the
constraint (§7.6). State is local — the root declares no backend —
and the existing `.gitignore` rules `**/.terraform/`, `*.tfstate`,
and `*.tfstate.*` already ignore `perf/.terraform/` and
`perf/terraform.tfstate*`, so no entry is added; the lock file is
committed, as the comment beside those rules states. The state holds
the VM's private key, so the state, its backups, any saved plan, and
the temporary key files of §7.6 are sensitive: they stay out of
commits, logs, and uploaded evidence by handling and permissions,
not merely by being gitignored (§7.6, Access). `run.mjs`
imports only Node.js built-in modules, so the package list above is
unchanged. On the VM, `perf/cloud-init.yaml` installs the Node.js
22.12.0 pinned above, so the measured run uses the same runtime as
every build. The pinned image fixes the base system; what the VM
installs beyond it and that checksum-verified Node.js — the `xvfb`
package and Chromium's system dependencies — is pinned only as far
as each installer allows. Nothing under `perf/` is built, checked,
or run in CI ([§6.3](#63-ci-workflows)).

The interface between Gradle and `run.mjs` has its one home here:
the command line is `perf/run.mjs [run|destroy|ssh|status] [--dry-run]`,
with `run` as the default subcommand. `run.mjs` works on the
Terraform root that the environment variable `EGR_PERF_DIR` names,
by default its own directory; the T-59 drills set it to a temporary
copy of `perf/`, so no drill reads, changes, or deletes a real state
file or its backup.

- `run` is the create → measure → destroy-on-completion lifecycle of
  §7.6: the VM is destroyed once the measurement run has completed
  and its report is downloaded, a budget miss included, and kept
  after an infrastructure, execution, or report-retrieval failure.
  `webappMeasureReference` invokes it and is the only task that
  runs the `measure` project; a local
  `npx playwright test --project=measure --workers=1`, run after
  `playwrightInstall` in the form of Node.js outside Gradle (above),
  is a diagnostic (§7.6).
- `destroy` removes, with `terraform destroy`, every resource the
  Terraform state records, whether or not the VM has terminated itself,
  and never looks up the operator's IP (§7.6, Terraform commands);
  `webappMeasureDestroy` invokes it.
- `ssh` opens an interactive session on a VM kept after a failed
  run, with the key handling of §7.6. No Gradle task wraps it; the
  owner runs `node perf/run.mjs ssh` in `subprojects/webapp`, in the
  form of Node.js outside Gradle (above).
- `status` prints the resources the Terraform state records and the
  instance's EC2 state, and changes nothing in AWS or in the state
  (§7.6, Self-termination and cleanup). No Gradle task wraps it; the
  owner runs `node perf/run.mjs status` in `subprojects/webapp`, in the
  form of Node.js outside Gradle (above), with `TF_VAR_aws_profile` set
  to the profile that `egr.perf.awsProfile` names.
- `--dry-run` prints, in order, the commands the subcommand would
  run, and runs none of them, checking no precondition.

Every invocation, `--dry-run` included, first compares
`process.version` with `v22.12.0`, the runtime pin above, and exits
1, printing both, when they differ; a change of that pin changes
`run.mjs` in the same commit, as it changes `perf/cloud-init.yaml`
(§7.6).

Neither `webappMeasureReference` nor `webappMeasureDestroy` checks
anything while Gradle configures the build script, which every CI
`./gradlew` run does without `egr.perf.awsProfile` or `terraform`
([§6.3](#63-ci-workflows)): `run.mjs` checks `TF_VAR_aws_profile`
and `terraform`, and the `doFirst` action of
`webappMeasureReference` checks `egr.perf.target`, when the task
executes.

**Naming** ([DD-10](#1-ddd-decision-register), Proposed). Data-facing
names — export fields, both manifests' keys, download headers, and
any future URL parameters — are snake_case, and every name denoting a
pipeline column is the pipeline's sanitized name exactly as
`register.sanitize_column` produces it, one of the thirteen names of
the DD-10 closure note. TypeScript identifiers are camelCase; the
only snake-to-camel mapping lives in `src/decode/fields.ts`
([§5.2](#52-artifact-loading-and-decoding)), with the coverage the
DD-10 closure note fixes: every structural key renamed by
`snakeToCamel`, keys that are data kept verbatim, and `provenance`
opaque. File names in `src/` and `test/` are lowercase with hyphens;
there is one directory per concern, named after the DDD section that
specifies it, with the DOM appliers kept apart from the pure builders
in `src/views/dom/`.

*Closes:* DD-10. *Verification (planned):* the pins are read from the
committed `build.gradle.kts`, `package.json`, and `package-lock.json`
(T-01), and from `perf/versions.tf` and `perf/.terraform.lock.hcl`
(T-59); `test/toolchain.test.ts` fails any `webappTest` run on
another runtime; the `run.mjs` command line and its
destroy-on-completion rule are exercised by the `--dry-run` and
stub-executable drills of T-59, outside CI because nothing under
`perf/` runs there; CI runs `tscCheck` as its own task in the
**Webapp checks** steps of [§6.3](#63-ci-workflows); the export
rules `format-spec` and `dd10-names` of
[§4.1](#41-export-task-and-validation) reject any field name outside
the closed field lists of
[§3.2](#32-artifact-manifest)–[§3.7](#37-media-index-p2) and any
pipeline-column name outside the thirteen names of the DD-10 closure
note; and `fields.test.ts` ([§7.4](#74-application-tests)) checks the
mapping's coverage.

References:

- [HLDD §4.3 — Language, toolchain, and repository
  structure (ADR-0011)](hldd.md#43-language-toolchain-and-repository-structure-adr-0011).
- [ADR-0011](../adr/0011-webapp-toolchain.md);
  [ADR-0016](../adr/0016-performance-reference-environment.md)
  (Proposed: the reference environment and its Terraform toolchain).
- [NFR-8 — Architecture decision record](prd.md#nfr-8-architecture-decision-record).
- [gradle-node-plugin 7.1.0 — Usage](https://github.com/node-gradle/gradle-node-plugin/blob/7.1.0/docs/usage.md)
  (the `node { }` extension; task types `NpmTask` and `NodeTask`).
- `subprojects/python/src/eps_ground_rupture/register.py`
  (`sanitize_column`).
- `settings.gradle.kts`; `.gitignore` (`build/`, `.gradle/`, and the
  Terraform rules); `subprojects/python/build.gradle.kts` (the
  `base`-plugin module conventions; its `Exec` tasks are not the
  webapp's pattern); `deploy/terraform/` (the parked data layer that
  `perf/` never references).
- [PDD §9.1 — Performance budgets (D-9,
  Proposed)](pdd.md#91-performance-budgets-d-9-proposed);
  [§7.6 Performance and compatibility measurements](#76-performance-and-compatibility-measurements)
  (the environment `perf/` provisions).
- [Dependency Lock File (.terraform.lock.hcl)](https://developer.hashicorp.com/terraform/language/files/dependency-lock)
  (Terraform documentation: a recorded selection is re-selected
  unless `terraform init -upgrade` runs).

## 3. Data formats

This chapter fixes the exact schema of every file a data vintage
contains and every file the repository commits to pin one. The
subsections preserve the PRD's four-way distinction — simulation
records, derived statistics, field measurements, reader-facing
exports — and the Tableau-oriented `dem.csv` file is not a product
input
([DR-1 — Controlled data source](prd.md#dr-1-controlled-data-source)).
Each subsection fixes fields, types, encodings, and invariants;
nothing here re-decides what a value means — meanings stay with the
pipeline views and the PDD.

**Rules every format follows.** The subsections apply these rules
without restating them:

- **Schema versions.** Every JSON and binary format of this chapter
  carries `schema_version`, distinct from the data vintage; every
  schema version starts at 1 and increments only on an incompatible
  change. A reader checks `schema_version` against the versions it
  supports before it interprets any other field, and structural
  validation precedes any read of binary offsets.
- **Required fields and nulls.** Every listed field is required and
  never omitted. A field holds JSON `null` only where its type says
  "or null".
- **Records and maps.** Every JSON object is either a record, whose
  keys its subsection lists exactly, or a map, whose keys are data
  values — block, column, measurement, class, or file names, or dips
  written as decimal strings; each description says which. Decoding
  keeps map keys verbatim ([§5.2](#52-artifact-loading-and-decoding)).
- **Closed specs.** `product_export.py` holds one closed spec per
  JSON format — every field with its type and nullability — and the
  export's rule `format-spec`
  ([§4.1](#41-export-task-and-validation)) checks every JSON file the
  run writes, the pointer manifest included, against its spec.
- **Unlisted members.** A reader ignores record members this chapter
  does not list, except in the `inputs` objects of
  [§3.6](#36-reference-results), where `parseScenario` rejects any
  unknown key ([§5.6](#56-scenario-state-and-url-encoding));
  `format-spec` rejects unlisted members everywhere, so additions
  are deliberate.
- **JSON form.** Every JSON file is written in the canonical form of
  [§4.1](#41-export-task-and-validation): keys sorted, compact
  separators, UTF-8 without ASCII escaping, one trailing newline, and
  `allow_nan=False`, so a non-finite number fails the export instead
  of becoming a `NaN` token that `JSON.parse` rejects. Member order
  inside an object therefore carries no meaning; every order this
  chapter fixes is an array order. Integer fields are JSON integers
  (no fraction, no exponent); every other number is a finite float64
  written as Python's shortest round-trip `repr`.
- **Value formats.** `export_date` is a UTC timestamp of the form
  `YYYY-MM-DDTHH:MM:SSZ`. `export_version`, and every field defined
  equal to it, matches `^data-v(0-test|[1-9][0-9]*)$`: `data-vN`
  (N ≥ 1, no leading zero) is a publishable vintage tag, and
  `data-v0-test` is the single development tag, which `exportApp`
  accepts for local test exports and `publishVintage` refuses
  ([§4.2](#42-publication-of-a-data-vintage)). A SHA-256 value is 64
  lowercase hexadecimal characters.
- **Checksums.** Every checksum is SHA-256 over the file's bytes
  exactly as uploaded and served — for a compressed file, the
  compressed bytes. The checksum graph is acyclic: the artifact
  manifest checksums the browser-loaded data files, the pointer
  manifest checksums every vintage file including the artifact
  manifest, and no file checksums itself.
- **Compression and byte order.** A compressed file is one gzip
  member written only by
  `gzip.compress(payload, compresslevel=9, mtime=0)`
  ([§4.1](#41-export-task-and-validation)), so its bytes depend only
  on the payload and on the Python and zlib versions that
  `provenance` records ([§3.2](#32-artifact-manifest)). Multi-byte
  integers in binary formats are little-endian.
- **Names.** Field names follow [DD-10](#1-ddd-decision-register):
  snake_case, with every name that denotes a pipeline column spelled
  exactly as the pipeline's sanitized column name.

### 3.1 Scenario artifact binary layout

The scenario artifact is one gzip-compressed binary file (the
compressed file is the artifact — [DD-7](#1-ddd-decision-register)),
served under its content-hashed name `scenario-<h12>.bin.gz`
([§4.1](#41-export-task-and-validation)). Decompressed, it is a
16-byte header followed by seven 4-byte-aligned blocks in this
physical order: `trial_table`, `slip`, `scarp_height`, `dzw`,
`scarp_dip`, `scarp_class`, `dip_dictionary`. The artifact manifest
declares each block's byte offset, length, and dtype
([§3.2](#32-artifact-manifest)). Each block starts at the next
4-byte boundary after its predecessor —
`offset_i = align4(offset_{i−1} + length_{i−1})`, starting at
offset 16, with `length` always the data length — the at-most-three
gap bytes before a block are zero and belong to no block, and the
decompressed file length is `align4(last offset + last length)`.
The file carries no other framing, so a decoder needs the manifest,
and structural validation
([§5.2](#52-artifact-loading-and-decoding)) precedes every read.

**Header** (16 bytes): ASCII magic `GRXA`; `uint32` schema version
(1); `uint32` record count; `uint32` trial count. The header must
agree with the manifest's `schema_version` and counts, or decoding
stops in the unavailable state.

**Trial table** — one `uint8` block of 3,434 rows × 7 columns
(24,038 bytes), row-major, one row per trial in ascending code-point
order of the pipeline's `Trial` string; a trial's position is its
`trial_id` (0–3,433). Schema version 1 fixes the column order:
`fault_dip`, `sediment_strength`, `cohesion`, `set`, `depth`,
`density`, `model_family`. `src/decode/fields.ts` compiles this
order in as `TRIAL_TABLE_COLUMNS` and never derives it from the
manifest's `trial_columns`, whose keys the canonical JSON form sorts
alphabetically. Each cell is an index into its column's
`trial_columns` dictionary: `fault_dip` (7 values: 20, 30, 40, 45,
50, 60, 70°), `sediment_strength` (6 labels), `cohesion` (26
strings), `set` (2 arms: `Heterogeneous`, `Homogeneous`), `depth`
(3, 5, 10 m), `density` (`Dense`, `Loose`, `Medium`), and
`model_family` (reserved; 0 = the published 2D ensemble). Site
conditions are constant within a trial (validated). The nine
selectable arm-and-strength states are the measured combinations of
`set` × `sediment_strength`; the manifest's `arm_strength_states`
lists them.

**Stage arrays** — the five blocks `slip`, `scarp_height`, `dzw`,
`scarp_dip`, and `scarp_class`, each of 346,834 entries,
trial-major: trial `t`'s stages occupy entries `[t·101, (t+1)·101)`,
in strictly ascending slip with no within-trial ties (validated at
export; this makes "last stage within the window" equal "highest
slip within the window",
[DR-3 — One-state-per-trial
population](prd.md#dr-3-one-state-per-trial-population)).

**Restoring values.** A scaled column carries two integers in its
manifest `columns` entry: `decimals` d (4 for `slip`, 3 for
`scarp_height` and `dzw`) and `offset_steps` (−182 for
`scarp_height`, 0 for the others). Every recorded value v lies on
its column's decimal grid — with `s = round(v · 10^d)`, the division
below returns exactly v — and is stored as the non-negative integer
`stored = s − offset_steps`. Decoding restores
`x = (stored + offset_steps) / 10000` for `slip`,
`x = (stored + offset_steps) / 1000` for `scarp_height` and `dzw`,
and a dip as `x = dictionary[i] / 1000`: one IEEE 754 division of
two exact integers, written with the integer literal `10000` or
`1000` — never `10 ** d` or `Math.pow`, whose JavaScript results are
implementation-approximated. The export asserts, for every value,
that x equals the pipeline view's float64 v bit for bit
(`x.hex() == v.hex()`, rule `bitwise-restore`,
[§4.1](#41-export-task-and-validation)), so the client and the
reference generator of [§3.6](#36-reference-results) start from
identical numbers. The manifest's `scale` and `offset` serve only
the window guard of [§5.3](#53-query-engine); restoring never uses
them. Negative measurements are valid values carried as-is
([DR-4 — Measurement hygiene](prd.md#dr-4-measurement-hygiene), cited
rather than re-decided); `offset_steps` makes them non-negative
stored integers.

The table below, the dictionary size, and the unclassified-record
facts that follow are drafting measurements on
`data/processed/dem/data.parquet` (SHA-256
`6a6e9149066f503588e09ecb6772a8392685716672e298d75aa925e7826eb303`),
reproduced on every export by the `columns` and `blocks` figures the
export measures and re-measures from the packed data
([§4.1](#41-export-task-and-validation); tasks T-11 and T-12 of the
[implementation plan](ip.md#2-task-graph)); the negative counts,
which no manifest field carries, are also cited from
[HLDD §5.2 — Simulation data organization
(ADR-0013)](hldd.md#52-simulation-data-organization-adr-0013):

| Column | dtype | Encoding (`columns` entry) | Physical range | Step | Stored range | Null sentinel | Nulls | Negatives |
|---|---|---|---|---|---|---|---|---|
| `slip` | `uint16` | `scaled`: `decimals` 4, `offset_steps` 0 | 0 … 5.0135 m | 1e-4 m | 0 … 50,135 | 65,535 (no nulls) | 0 | 0 |
| `scarp_height` | `uint16` | `scaled`: `decimals` 3, `offset_steps` −182 | −0.182 … 5.029 m | 1e-3 m | 0 … 5,211 | 65,535 | 13,675 | 1,232 |
| `dzw` | `uint16` | `scaled`: `decimals` 3, `offset_steps` 0 | 0 … 45.811 m | 1e-3 m | 0 … 45,811 | 65,535 | 13,686 | 0 |
| `scarp_dip` | `uint16` | `dict`: index into the dip dictionary ([DD-1](#1-ddd-decision-register)) | −12.529 … 89.765° | 1e-3° | 0 … 35,853 | 65,535 | 16,647 | 30 |
| `scarp_class` | `uint8` | `code`: index into `scarp_classes` | 6 classes | — | 0 … 5 | 255 | 3,434 | — |

**Dip dictionary** — one `int32` block of 35,854 entries: every
distinct recorded dip in ascending order, in thousandths of a
degree, so indices are rank-ordered — the scarp-dip range filter of
inverse mode ([§5.14](#514-inverse-mode-p2), P2; the MVP has none)
maps its physical endpoints to index space by binary search once,
then compares bare indices. The 143,416-byte block is part of the
artifact and of every size figure.

**Unclassified records.** The 3,434 `scarp_class` nulls are exactly
the slip-0 first stage of each trial — the initial state has no
scarp yet — and are the unclassified records of
[PDD §4.3 — Unclassified records (D-12,
Proposed)](pdd.md#43-unclassified-records-d-12-proposed). None of
them has a valid `scarp_height`, `dzw`, or `scarp_dip`; the export
asserts this on every vintage (rule
`unclassified-has-no-valid-measurement`,
[§4.1](#41-export-task-and-validation)), because the class-stacked
histograms of [§5.12](#512-charts) count valid values by class and
would otherwise drop some.

**The `us_ud` measurement** stays out of the artifact:
[D-20](pdd.md#1-decision-register), Us − Ud as a fourth displayed
measurement, is out of the MVP, and a drafting measurement that no
repository check reproduces — nothing exports the column — found
58,252 distinct values on no decimal grid, so admitting it later is
a new encoding decision and a new vintage
([§9](#9-deferred-and-out-of-scope)).

The decoding boundary does not make this layout permanent: the
manifest reserves `scenario_artifact_<family>` file keys
([§3.2](#32-artifact-manifest)) for the per-family partition
contingency of [ADR-0013](../adr/0013-row-level-scenario-artifact.md),
kept open while the 3D format stays undecided
([HLDD §10 — Risks and open
dependencies](hldd.md#10-risks-and-open-dependencies)), and the
`model_family` column plus `schema_version` give a future format
room without breaking this one.

*Closes:* DD-1. *Verification (planned):* the export's rules
`bitwise-restore`, `sentinel-collision`, `slip-order`,
`site-constancy`, `unclassified-has-no-valid-measurement`,
`dictionary-order`, and `block-tiling`
([§4.1](#41-export-task-and-validation)) check the
invariants above on every vintage; the decoder applies the same
restore ([§5.2](#52-artifact-loading-and-decoding)); sizes are
reported in [§3.8](#38-measured-sizes).

References:

- [HLDD §5.2 — Simulation data organization
  (ADR-0013)](hldd.md#52-simulation-data-organization-adr-0013).
- [ADR-0013](../adr/0013-row-level-scenario-artifact.md).
- [DR-7 — Future 3D compatibility](prd.md#dr-7-future-3d-compatibility).
- [PDD §4.3 — Unclassified records (D-12,
  Proposed)](pdd.md#43-unclassified-records-d-12-proposed).
- `data/processed/dem/data.parquet` (the drafting input, SHA-256
  above); `subprojects/python/src/eps_ground_rupture/config.py`
  (`SCARP_CLASSES` canonical order).

### 3.2 Artifact manifest

The artifact manifest is one uncompressed JSON file,
`manifest-<h12>.json` ([§4.1](#41-export-task-and-validation) fixes
compression per file and the name template), fetched by the page
before anything else. It is a record whose fields this table lists;
field names follow [DD-10](#1-ddd-decision-register).
`schema_version` is the format's version (1), distinct from the data
vintage; the application supports exactly the versions it names
([§5.2](#52-artifact-loading-and-decoding)), and a manifest outside
them is the unavailable state, never a guess.

| Field | Type | Content |
|---|---|---|
| `schema_version` | int | 1. |
| `export_version` | string | The data vintage — the data tag of [§4.2](#42-publication-of-a-data-vintage), in the tag format of [§3](#3-data-formats). |
| `export_date` | string | UTC timestamp of the export run, `YYYY-MM-DDTHH:MM:SSZ`; a `--reproduce` run reuses it verbatim ([§4.3](#43-retention-rollback-recovery-and-withdrawal)). |
| `pipeline_version` | string | `eps_ground_rupture.__version__` of the exporting package — a label; `provenance.source_commit` identifies the code. |
| `provenance` | object | Record identifying the export run (members below), byte-identical to the pointer manifest's ([§3.3](#33-pointer-manifest)). |
| `counts` | object | Record of ints: `records` (346,834), `trials` (3,434), `stages_per_trial` (101) — the geometry of [HLDD §5.2 — Simulation data organization (ADR-0013)](hldd.md#52-simulation-data-organization-adr-0013), measured by the export, never assumed. |
| `blocks` | object | Map with exactly the keys `trial_table`, `slip`, `scarp_height`, `dzw`, `scarp_dip`, `scarp_class`, `dip_dictionary`, laid out in that order ([§3.1](#31-scenario-artifact-binary-layout)). Each value is a record {`offset` int, `length` int — data bytes, decompressed — and `dtype` string}: `trial_table` is `"uint8"` with length `counts.trials` × 7; `slip`, `scarp_height`, `dzw`, and `scarp_dip` are `"uint16"` with length `counts.records` × 2; `scarp_class` is `"uint8"` with length `counts.records`; `dip_dictionary` is `"int32"` with length 4 × its entry count. Offsets follow the §3.1 alignment rule from 16, and the decompressed length is `align4(last offset + last length)` — 3,288,980 bytes on the shipped vintage ([§3.8](#38-measured-sizes)). |
| `columns` | object | Map with exactly the keys `slip`, `scarp_height`, `dzw`, `scarp_dip`, `scarp_class`; each value is the record of ten members tabulated below. |
| `trial_columns` | object | Map with exactly the seven trial-table column names; each value is that column's dictionary, the array the trial-table cells index: `fault_dip` (ints, degrees) and `depth` (ints, metres) ascending; `sediment_strength`, `cohesion`, `set`, and `density` (strings) in Python `sorted()` code-point order; `model_family` `["2D"]`. The trial table's column order is `TRIAL_TABLE_COLUMNS` ([§3.1](#31-scenario-artifact-binary-layout)), never this map's key order. |
| `arm_strength_states` | array | The nine selectable pairs, measured from the data, as records {`set`, `sediment_strength`} in data spellings, in display order: the uniform arm (`Homogeneous`) first, then the layered arm (`Heterogeneous`); within an arm the order of [PDD §3.2 — Sediment strength and structure (FR-S2)](pdd.md#32-sediment-strength-and-structure-fr-s2) — `Weak`, `Moderate`, `Strong`, `Random Heterogeneous`, `Cohesive Top Unit`, `Alternating Strong-Weak` — keeping only pairs present. `product_export.py` holds the nine pairs in this order as a constant citing PDD §3.2, and the export's rule `dictionary-order` ([§4.1](#41-export-task-and-validation)) fails when the measured pair set differs from it. This order drives the controls ([§5.7](#57-scenario-controls)), the scenario-summary token, and the download slug ([§5.9](#59-downloads)); the canonical scenario serialization ([DD-11](#1-ddd-decision-register)) sorts pairs by code point instead. Reader-facing labels go through the display-label map of [§5.8](#58-view-layer) (data `Alternating Strong-Weak`, PDD `Alternating Strong–Weak`). |
| `scarp_classes` | array | The six class-name strings in `config.SCARP_CLASSES` order; class code i ([§3.1](#31-scenario-artifact-binary-layout)) names `scarp_classes[i]`. |
| `scarp_class_palette` | object | Map from each of the six class names to a color string matching `^#[0-9a-f]{6}$`, re-emitted from `config.SCARP_CLASS_PALETTE` ([FR-G2 — Scarp-type colors and identification](prd.md#fr-g2-scarp-type-colors-and-identification)). |
| `trials` | array | The 3,434 pipeline `Trial` strings in `trial_id` order — selection identities and downloads name trials by these strings, never by position alone. |
| `stage_spacing` | object | Record {`min`, `max`, `mean`} in metres: consecutive within-trial slip differences — drafting measurement 0.0468 / 0.0565 / 0.0501 m on the [§3.1](#31-scenario-artifact-binary-layout) input, reproduced by every export run (T-11). This is the simulation spacing that [PDD §3.4 — Displacement window (FR-S5)](pdd.md#34-displacement-window-fr-s5) calls the "recording step (~0.05 m)" and the [§5.7](#57-scenario-controls) helper line states; it is never a storage scale. |
| `slip_window_bounds` | object | Record {`min`, `max`, `recording_step`} in metres: `min` 0; `max` the largest recorded slip (≈5.0135 m currently, per PDD §3.4); `recording_step` 0.0001. The shortest round-trip decimal string of `max` (`String` in JavaScript; in Python `repr` with grammar G's canonical form of [§5.7](#57-scenario-controls) applied — a trailing `.0` dropped, so `5.0` gives `5`) is the canonical decimal against which the slip-window rules of §5.7 compare entries. `recording_step` is the storage grid of recorded slip — the unit of the stored window bounds ([§5.3](#53-query-engine)) and of the `step` shifts of the [§3.6](#36-reference-results) boundary cases — and is not the PDD's "recording step", which is `stage_spacing`. |
| `files` | object | Record of the vintage's browser-loaded files, with exactly the keys `scenario_artifact`, `field_export`, `regression_export`, plus `media_index` from [P2](prd.md#22-mvp-and-delivery-priorities) (the second delivery priority, after the MVP); the values are the content-hashed names `scenario-<h12>.bin.gz`, `field-<h12>.json.gz`, `regression-<h12>.json.gz`, and `media-<h12>.json` of [§4.1](#41-export-task-and-validation). Keys matching `^scenario_artifact_[a-z0-9]+$` are reserved (below). |
| `reference_results_version` | string | The paired reference file's `reference_version` ([§3.6](#36-reference-results)); equal to `export_version`. |
| `checksums` | object | Map from file name to SHA-256 whose keys are exactly the values of `files` — never the manifest itself (the pointer manifest checksums it; the graph stays acyclic). |

**`columns` members.** Every member is present for every column; the
`code` column holds null where the table says so.

| Member | Type | `slip`, `scarp_height`, `dzw` | `scarp_dip` | `scarp_class` |
|---|---|---|---|---|
| `encoding` | string | `"scaled"` | `"dict"` (values index the dip dictionary) | `"code"` (values index `scarp_classes`) |
| `decimals` | int or null | 4 for `slip`; 3 otherwise | 3 (of the dictionary values) | null |
| `offset_steps` | int or null | −182 for `scarp_height`; 0 otherwise | 0 | null |
| `scale` | number or null | the float64 nearest `10^−decimals`: 0.0001 for `slip`; 0.001 otherwise | 0.001 | null |
| `offset` | number or null | the float64 nearest `offset_steps · 10^−decimals`: −0.182 for `scarp_height`; 0 otherwise | 0 | null |
| `physical_min`, `physical_max` | number or null | the measured extremes, metres | the measured extremes, degrees | null |
| `recording_step` | number or null | 0.0001 for `slip`; 0.001 otherwise (metres) | 0.001 (degrees) | null |
| `null_sentinel` | int | 65535 | 65535 | 255 |
| `null_count` | int | measured | measured | measured |

**`provenance` members.** The export writes the record once per run
and copies it byte-identically into the pointer manifest;
`src/decode/fields.ts` maps the object opaquely
([§5.2](#52-artifact-loading-and-decoding)). It holds no absolute
path and no user or host name.

| Member | Type | Content |
|---|---|---|
| `source_commit` | string | 40 lowercase hexadecimal characters: `git rev-parse HEAD` at run start; the run fails unless HEAD is unchanged at run end. |
| `source_tree_clean` | bool | `true` when the clean-tree command of [§4.1](#41-export-task-and-validation) step 1 prints nothing at both run start and run end. The export records a dirty tree and does not refuse it ([§4.1](#41-export-task-and-validation)); publication refuses it ([§4.2](#42-publication-of-a-data-vintage)). |
| `inputs` | array | Records {`path` (repository-relative POSIX path), `sha256`, `bytes` (int)}, unique and sorted by `path`, covering exactly the four processed tables the exports read — `data/processed/dem/data.parquet`, `data/processed/fdhi_measurements/data.parquet`, `data/processed/kern_combined/data.parquet`, `data/processed/sure/data.parquet` — and the four raw files `egr-build` produces them from: `data/raw/DEM_dataset.csv`, the file `io.find_fdhi_flatfile()` returns, `data/raw/SURE.csv`, and `data/raw/Combine_BuwaldaFDHI_KernSDC.csv`. The export re-hashes them before it finishes; any change fails the run. `data/raw/FDHI_Cleaned_Measurements.csv` — the pre-cleaned extract against which `test_fdhi_flatfile.py` and `test_prep.py` check the cleaning chain, which the full-data run of [§7.3](#73-pipeline-and-export-tests) also requires — is not an export input and is not in `inputs`. |
| `environment` | object | Record of strings: `python` (`platform.python_version()`), `duckdb`, `numpy`, `pandas`, `pyarrow` (each module's `__version__`), `zlib` (`zlib.ZLIB_RUNTIME_VERSION`), and `platform` (`sys.platform`, `-`, and `platform.machine()` concatenated). |
| `compression` | object | Record {`format` `"gzip"`, `call` `"gzip.compress"`, `compresslevel` 9, `mtime` 0}. |

The `files` keys matching `^scenario_artifact_[a-z0-9]+$` are
reserved for the per-family partition contingency, which stays open
without prescribing the undecided 3D format
([DR-7 — Future 3D compatibility](prd.md#dr-7-future-3d-compatibility)):
validation and readers accept them, no export emits them under
schema version 1, and the page fetches only `scenario_artifact`.

*Verification (planned):* the export's rules `dictionary-order`,
`block-tiling`, `manifest-figures`, `checksums`, `format-spec`,
`envelope-agreement`, and `provenance`
([§4.1](#41-export-task-and-validation)) check the manifest against
the artifact, the views, the paired files, and the repository state
of the same run; the fixture lane of `test_manifests.py` rejects a
missing `provenance` key, a manifest–pointer `provenance` mismatch,
and unsorted or duplicate `inputs`
([§7.3](#73-pipeline-and-export-tests)); the decoder re-validates
structure before reading ([§5.2](#52-artifact-loading-and-decoding)).

References:

- [HLDD §5.2 — Simulation data organization
  (ADR-0013)](hldd.md#52-simulation-data-organization-adr-0013).
- [HLDD §5.4 — Pinned, versioned artifacts
  (ADR-0014)](hldd.md#54-pinned-versioned-artifacts-adr-0014).
- [HLDD §5.7 — Conversion coefficients
  (ADR-0015)](hldd.md#57-conversion-coefficients-adr-0015) (Other
  pipeline-supplied values).
- [PDD §3.2 — Sediment strength and structure
  (FR-S2)](pdd.md#32-sediment-strength-and-structure-fr-s2).
- [PDD §3.4 — Displacement window (FR-S5)](pdd.md#34-displacement-window-fr-s5).
- `subprojects/python/src/eps_ground_rupture/config.py`
  (`SCARP_CLASSES`, `SCARP_CLASS_PALETTE`);
  `subprojects/python/src/eps_ground_rupture/io.py`
  (`find_fdhi_flatfile`).

### 3.3 Pointer manifest

The pointer manifest is the one committed JSON file that pins a
vintage: `subprojects/webapp/data/pointer.json`, a record in the
canonical JSON form of [§3](#3-data-formats). Build tooling and
tests read it — the staging tasks of
[§6.1](#61-build-outputs-asset-paths-and-page-scaffold), CI's
fetch-and-verify of [§6.3](#63-ci-workflows), and the parity harness
of [§7.2](#72-calculation-parity-tests); the page never fetches it.

| Field | Type | Content |
|---|---|---|
| `schema_version` | int | 1. |
| `data_tag` | string | The vintage's git tag — the dedicated data release the assets hang on ([§4.2](#42-publication-of-a-data-vintage)); equals `export_version`. |
| `export_version` | string | Equals the artifact manifest's `export_version`. |
| `export_date` | string | Equals the artifact manifest's `export_date`. |
| `provenance` | object | Byte-identical to the artifact manifest's `provenance` ([§3.2](#32-artifact-manifest)) — the same canonical serialization — so the run's identity stays in the repository even when the release assets are gone ([§4.3](#43-retention-rollback-recovery-and-withdrawal)). |
| `files` | object | Map from content-hashed file name to SHA-256, covering **every** file in the vintage (below). |

**The exact file set.** `files` names exactly: the artifact manifest
(`manifest-<h12>.json`); every file the artifact manifest's `files`
names, under the same names and with the same checksums as its
`checksums` (`scenario-<h12>.bin.gz`, `field-<h12>.json.gz`,
`regression-<h12>.json.gz`, and from
[P2](prd.md#22-mvp-and-delivery-priorities) (the second delivery
priority, after the MVP) `media-<h12>.json`); the reference-results
file (`references-<h12>.json.gz`); and the vintage-terms file of
[§4.4](#44-licensing-archival-distribution-and-release-attachments)
(`data-terms-<h12>.txt`) — nothing more, nothing less. Every name
follows the [§4.1](#41-export-task-and-validation) template — one
pattern per role, none ending in `.md` — and the pointer checksums
nothing it does not name, never itself. A reserved
`scenario_artifact_<family>` file ([§3.2](#32-artifact-manifest))
would be pinned the same way, and the reference-results file is
pinned here even though the page never fetches it — the parity
harness does.

*Verification (planned):* CI fetches every `files` entry from the
`data_tag` release and fails the build on any missing file or
checksum mismatch ([§6.3](#63-ci-workflows)); before anything is
committed, the export's rules `pointer-exact` and `file-names`
([§4.1](#41-export-task-and-validation)) check the exact file set,
the names, and the `provenance` equality of the two manifests, and
the fixture lane of `test_manifests.py` exercises the same rules
([§7.3](#73-pipeline-and-export-tests)).

References:

- [HLDD §5.4 — Pinned, versioned artifacts
  (ADR-0014)](hldd.md#54-pinned-versioned-artifacts-adr-0014).
- [ADR-0014](../adr/0014-committed-content-hashed-artifacts.md).
- [DR-2 — Versioned exports](prd.md#dr-2-versioned-exports).

### 3.4 Field-data export

The field-data export is one gzip-compressed JSON file,
`field-<h12>.json.gz` ([§4.1](#41-export-task-and-validation)),
pinned like every vintage file, carrying the field measurements the
overlay draws
([PDD §4.4 — Field overlay (FR-O5, D-18
Proposed)](pdd.md#44-field-overlay-fr-o5-d-18-proposed)). It is
produced by a new product view of `views.py`, `field_export`, over
the same processed tables the dashboards read — `fdhi_measurements`,
`sure`, `kern_combined` — with the per-source analogue mapping the
PDD fixes; the views are not simply combined: each (source, analogue)
arm contributes the rows whose source quantity is positive, mirroring
the hygiene the established views apply. Envelope (record):
`schema_version` (1), `export_version`, `export_date`,
`pipeline_version` (as in [§3.2](#32-artifact-manifest)), and `rows`,
an array of row records ordered ascending by (`source`, `analogue`,
`eq_name`, `source_quantity`, `value`) — strings by code point,
`value` numerically — with rows equal on all five keys ordered by
their canonical serialization, so that a reproduction run rewrites
identical bytes
([§4.3](#43-retention-rollback-recovery-and-withdrawal)) and the
export's row-for-row comparison is defined
([§4.1](#41-export-task-and-validation)). Each row:

| Field | Type | Content |
|---|---|---|
| `source` | string | `"FDHI"`, `"SURE"`, or `"Kern"` — the source named per mark group. |
| `eq_name` | string | Normalized event name (the pipeline's normalization: NBSP-stripped, trimmed); Kern rows carry `Kern County (1952)`. |
| `magnitude` | number or null | Event moment magnitude (Mw) as the pipeline's `historic_events` view carries it: FDHI per row (non-positive values become null), SURE from `config.SURE_EVENT_MAGNITUDES`, Kern `views.KERN_MAGNITUDE` (7.36); null where the source has none, never invented. |
| `analogue` | string | The simulated measurement the value stands in for: `"scarp_height"` or `"dzw"`. |
| `source_quantity` | string | The source's own column, verbatim — FDHI `vs_central_meters`, SURE `SH`, Kern `Vertical` (height analogues); FDHI `fzw_central_meters`, SURE `FNC`, Kern `DZW` (width analogues). A machine key: the reader sees the [§5.8](#58-view-layer) copy-registry label for its (`source`, `source_quantity`) pair, worded as PDD §4.4 names the measure, never this string. |
| `value` | number | The measurement in metres, greater than 0. |
| `limited_comparison` | bool | `true` exactly on SURE `FNC` rows — a displacement quantity, not a width, labeled as a limited comparison per the PDD. |
| `criterion_sub50` | string | The paper's less-than-50-metre width criterion in three states: `"met"` when `analogue` is `"dzw"` and `value < 50.0`; `"not_met"` when `analogue` is `"dzw"` and `value ≥ 50.0`; `"not_applicable"` when `analogue` is `"scarp_height"` — so "not applicable" is never conflated with "failed" ([ADR-0012](../adr/0012-product-data-exports.md), amendment of 2026-10-29). |
| `labeled_set` | bool | `true` exactly when the row belongs to the default set of [D-18](pdd.md#1-decision-register) (Field-overlay default set and per-source analogue map) — the project's established labeled event set, which PDD §4.4 makes the overlay's default — as `config.LABELED_FIELD_EVENTS` records it (Labeled set, below). |
| `kern_field_group` | string or null | Reserved for the answers to [D-6](pdd.md#1-decision-register) (Kern County field-data group and principal-width rule), which is Open; null in every row until the research group decides. |

**Labeled set.** The production source of `labeled_set` is the
pipeline constant `LABELED_FIELD_EVENTS` in
`subprojects/python/src/eps_ground_rupture/config.py`, new with task
T-10 of the [implementation plan](ip.md#2-task-graph): a
`dict[str, tuple[str, ...] | None]` with exactly the keys `"FDHI"`,
`"SURE"`, and `"Kern"`, mapping each source to the normalized
`eq_name` values whose rows are members, or to `None` when every row
of that source is a member. The `field_export` view sets
`labeled_set` true exactly when the row's source maps to `None` or
the row's `eq_name` is in its source's tuple, for both analogues
alike. Which rows are members is the D-18 default set: an owner
decision with research-group review, which owner action OA-14 of the
[implementation plan](ip.md#4-owner-and-research-group-actions)
records in the PDD and the constant then carries — a change to the
constant alone, in a commit of its own. A vintage carries the
membership the constant held at its export, so the public activation
(task T-55) checks, before its commit, that the constant equals the
recorded membership both at `HEAD` and at the `tag_commit` of the
pinned vintage's publication record
([§4.2](#42-publication-of-a-data-vintage)). Until OA-14 records it,
the constant holds the Proposed reading, which the development
exports and any vintage published before then carry: `"FDHI"` maps to
`("Wenchuan", "Kashmir", "Killari")`, the events labeled in cell 25
of the notebook
`legacy/2Ddem 2025 Paper Revisions - FDHI Scarp Height & DZW.ipynb`
that carry an FDHI central measure (`vs_central_meters` or
`fzw_central_meters`; Bohol, also labeled there, carries neither), as
`PINNED_FDHI_EVENTS` of
`subprojects/python/tests/test_historic_events.py` pins them; `"SURE"`
and `"Kern"` map to `None`. The pipeline tests import the constant
wherever they need the membership and never re-pin it.

Because its FDHI arms read the optional `fdhi_measurements` table,
`build_duckdb_views` creates `field_export` only when
`data/processed/fdhi_measurements/data.parquet` exists — alongside
`historic_events`, which it creates under the same condition — and
skips it otherwise. The view has no Athena twin, the Athena layer of
`deploy/terraform/` being parked
([§7.6](#76-performance-and-compatibility-measurements)), and the
`views.py` module docstring lists it as a product view with no
Athena twin.

*Verification (planned):* the export's rule `view-reread`
([§4.1](#41-export-task-and-validation)) compares the rows against
the `field_export` view of the same run; the fixture lane of
`test_field_export.py` checks the arm rules, the three
`criterion_sub50` states — `value` exactly 50.0 included, as
`"not_met"` — and `limited_comparison`, and its full-data lane pins
the row counts per (source, analogue) and checks labeled-set
membership against `config.LABELED_FIELD_EVENTS`, which it imports
instead of re-pinning ([§7.3](#73-pipeline-and-export-tests)),
extending the fzw and vs populations `test_historic_events.py` and
`test_fdhi_flatfile.py` already pin (FDHI's sh-only rows stay outside
the fixed PDD map).

References:

- [HLDD §5.5 — Field-data export (ADR-0012)](hldd.md#55-field-data-export-adr-0012).
- [ADR-0012](../adr/0012-product-data-exports.md).
- [DR-5 — Field-data preparation](prd.md#dr-5-field-data-preparation).
- [PDD §4.4 — Field overlay (FR-O5, D-18
  Proposed)](pdd.md#44-field-overlay-fr-o5-d-18-proposed) (the
  default set).
- `subprojects/python/src/eps_ground_rupture/views.py`
  (`unified_observations`, `historic_events`, `KERN_MAGNITUDE` — the
  mapping precedents);
  `subprojects/python/src/eps_ground_rupture/config.py`
  (`SURE_EVENT_MAGNITUDES`; `LABELED_FIELD_EVENTS`, new);
  `subprojects/python/tests/test_historic_events.py`
  (`PINNED_FDHI_EVENTS`, the FDHI events of the Proposed
  membership).

### 3.5 Regression export

The regression export is one gzip-compressed JSON file,
`regression-<h12>.json.gz` ([§4.1](#41-export-task-and-validation)),
pinned like every vintage file, carrying the approved
offset-to-slip relationship — the same coefficients the dashboards
publish and `test_regression_views.py` pins. Envelope (record):
`schema_version` (1), `export_version`, `export_date`,
`pipeline_version` (as in [§3.2](#32-artifact-manifest)),
`relationship`, and `coefficients`.

**`relationship`** — a record stating the relationship in words a
copy deck can cite, every leaf a string. `product_export.py` holds
the exact texts below as constants, written in ASCII so that the
bytes are the same in Python, in JSON, and in the TypeScript tests:

| Member | Exact value |
|---|---|
| `y` | Record {`name`: `vd_hw`, `description`: `vertical displacement on the hanging wall`, `unit`: `m`}. |
| `x` | Record {`name`: `slip`, `description`: `fault slip at depth`, `unit`: `m`}. |
| `form` | `vd_hw = slope * slip + intercept` |
| `fit` | `ordinary least squares of vd_hw on slip per fault_dip over all dem records with both vd_hw and slip present; intercept fitted, not constrained through zero; DuckDB regr_slope, regr_intercept, and regr_r2 in the view dem_regression` |
| `back_projection` | `slip = (vd_hw - intercept) / slope` |

The back-projection is the approved one
([ADR-0012](../adr/0012-product-data-exports.md), amendment of
2026-10-29). The assist's provenance line
([§5.5](#55-offset-to-slip-conversion-assist)) is a fixed-here
copy-registry entry of [§5.8](#58-view-layer), so it joins the
[SC-7](pdd.md#101-success-criteria) (scientific sign-off) review;
its slots take `form`, `back_projection`, and each selected dip's
`slope` and `intercept` from this file, and the client never
re-types the relationship.

**`coefficients`** — an array of seven records {`fault_dip` int,
`n` int, `slope` number (m per m), `intercept` number (m), `r2`
number}, one per value of the artifact manifest's
`trial_columns.fault_dip`, ascending by `fault_dip`, at full float64
precision as fitted. Every row satisfies `slope > 0`,
`intercept ≤ 0`, and `−intercept / slope ≤ slip_window_bounds.max`,
which the export asserts ([§4.1](#41-export-task-and-validation)
rule `coefficient-reach`), so an offset of 0 m back-projects into
[0, max] for every dip, and the `out_of_range` flag and a below-zero
converted endpoint cannot occur with exported coefficients
([§5.5](#55-offset-to-slip-conversion-assist)). The rows below are
a drafting measurement on `data/processed/dem/data.parquet` (SHA-256
`6a6e9149066f503588e09ecb6772a8392685716672e298d75aa925e7826eb303`),
reproduced by
`test_regression_views.py::test_dem_regression_coefficients` (`n`
exactly; `slope` and `intercept` within 0.001) and by the export's
comparison against `dem_regression`
([§4.1](#41-export-task-and-validation); task T-12 of the
[implementation plan](ip.md#2-task-graph)), display-rounded here to
six decimals for reading:

| `fault_dip` | `n` | `slope` | `intercept` | `r2` |
|---|---|---|---|---|
| 20 | 49,551 | 0.343631 | −0.003977 | 0.99794 |
| 30 | 49,453 | 0.502076 | −0.005125 | 0.99870 |
| 40 | 49,551 | 0.645307 | −0.007146 | 0.99905 |
| 45 | 49,251 | 0.710315 | −0.010324 | 0.99930 |
| 50 | 49,251 | 0.769532 | −0.010747 | 0.99931 |
| 60 | 49,551 | 0.870313 | −0.012492 | 0.99932 |
| 70 | 49,251 | 0.944509 | −0.013348 | 0.99930 |

*Verification (planned):* `test_regression_views.py` pins the
coefficients against the view; the export's rules `view-reread` and
`coefficient-reach` ([§4.1](#41-export-task-and-validation)) compare
the file against `dem_regression` and check the coefficient bounds
in the same run; the synthetic `conversion` cases of
[§3.6](#36-reference-results) exercise all three range flags through
the client ([§7.2](#72-calculation-parity-tests)).

References:

- [HLDD §5.7 — Conversion coefficients (ADR-0015)](hldd.md#57-conversion-coefficients-adr-0015).
- [ADR-0012](../adr/0012-product-data-exports.md) (amendment of
  2026-10-29).
- `subprojects/python/src/eps_ground_rupture/views.py`
  (`dem_regression`);
  `subprojects/python/tests/test_regression_views.py`.

### 3.6 Reference results

The reference results are one gzip-compressed JSON file,
`references-<h12>.json.gz` ([§4.1](#41-export-task-and-validation)),
pinned in the pointer manifest and fetched only by tests — the
parity harness of [§7.2](#72-calculation-parity-tests), which gunzips
it before reading, and the browser lane of
[§7.5](#75-browser-test-lane) — never by the page
([§5.2](#52-artifact-loading-and-decoding)). The pipeline's
reference generator in `product_export.py` computes it from the
authoritative pipeline views, never from the decoded artifact
([HLDD §5.6 — Reference results and verification
(ADR-0015)](hldd.md#56-reference-results-and-verification-adr-0015)),
and every number in it is a pipeline-first expected value: the
client reproduces it, and the parity harness only compares.

**Envelope** (record):

| Field | Type | Content |
|---|---|---|
| `schema_version` | int | 1. |
| `reference_version` | string | Equals `export_version`; the paired artifact manifest's `reference_results_version` names it ([§3.2](#32-artifact-manifest)). |
| `export_version` | string | The paired vintage's data tag; equals the artifact manifest's `export_version`. |
| `export_date` | string | The export run's timestamp; equals the artifact manifest's `export_date`. |
| `pipeline_version` | string | As in [§3.2](#32-artifact-manifest). |
| `display_decimals` | object | Map, exactly `slip` 2, `scarp_height` 2, `dzw` 1, `scarp_dip` 0 — the decimal places of [D-23](pdd.md#1-decision-register) (Reader-facing display precision per quantity): 0.01 m, 0.01 m, 0.1 m, 1°. Every display string in the file uses them, and the parity harness checks the client's configured decimals against them ([§7.2](#72-calculation-parity-tests)). |
| `log_scale_min_decades` | int | 2 — the number of decades in the offer rule of [§5.12](#512-charts), the "more than two decades" of [PDD §4.1 — Measurement views (FR-O1)](pdd.md#41-measurement-views-fr-o1), written from the constant `LOG_SCALE_MIN_DECADES = 2` that `product_export.py` holds. Every `histogram_log` value in the file is computed with it (generator step 6, below), and the parity harness checks the client's configured `logScaleMinDecades` against it ([§7.2](#72-calculation-parity-tests)). |
| `scenarios` | array | One scenario entry per golden scenario of [PDD §10.2 — Golden scenarios](pdd.md#102-golden-scenarios), ascending by number; [GS-3](pdd.md#102-golden-scenarios) — Kern preset (after D-6) — joins when [D-6](pdd.md#1-decision-register) (Kern County field-data group and principal-width rule) is decided. |
| `boundary_cases` | array | The selection-boundary battery (below). |
| `synthetic` | object | Record with exactly the arrays `ensembles`, `statistics`, `histograms`, `display_rounding`, and `conversion`: algorithm cases independent of the vintage (below). |

The pairing runs both ways — `reference_version` equals the artifact
manifest's `reference_results_version`, and `export_version` equals
the manifest's `export_version` — and the harness asserts both
before it replays anything ([§7.2](#72-calculation-parity-tests)).

**Scenario entry** (record). Its maps `counts.per_measurement`,
`statistics`, `percentiles`, `histogram`, and `display` have exactly
the keys `scarp_height`, `dzw`, and `scarp_dip`, and its map
`histogram_log` has exactly the key `dzw`; below, m is one of them,
v its valid values in ascending order, and "valid" its
`counts.per_measurement.<m>.valid`.

| Field | Type | Content |
|---|---|---|
| `id` | string | `GS-<n>`. |
| `inputs` | object | The canonical scenario object of [DD-11](#1-ddd-decision-register), exactly as [§5.6](#56-scenario-state-and-url-encoding) defines and serializes it: the record with the keys `fault_dip`, `sediment`, `depth`, `density`, `entry_mode`, `slip_window`, `offset_max`, `population`, and `scarp_class`, whose value domains and orders are §5.6's; it holds no display state. The generator writes it with `canonical_scenario()`, and the bytes for [GS-1](pdd.md#102-golden-scenarios) — US-1: dips {30°, 40°}, Strong (uniform and layered), offset mode 3 m — equal the golden literal of §5.6. The parity harness replays it through `parseScenario` and requires `serializeScenario` to reproduce it exactly ([§7.2](#72-calculation-parity-tests)). |
| `counts` | object | Record {`matching_records` int, `unclassified` int, `per_measurement` map from m to {`valid` int, `excluded_null` int}}: `unclassified` counts the class-code-255 records among the matching records — the X of the statistics-table line of [PDD §4.3 — Unclassified records (D-12, Proposed)](pdd.md#43-unclassified-records-d-12-proposed) — and `valid + excluded_null = matching_records` for every m (the two-count model). |
| `statistics` | object | Map from m to the record {`median`, `p16`, `p84`, `min`, `max`, `mean`, `sd`} — the [FR-O2 — Summary statistics](prd.md#fr-o2-summary-statistics) set in physical units (m; degrees for `scarp_dip`) — or null when valid = 0. Within the record only `sd` may be null, exactly when valid = 1. |
| `percentiles` | object | Map from m to an array of 101 numbers, `quantile_linear(v, q/100)` for q = 0 … 100 — the full-precision values behind the percentile read-off of [§5.12](#512-charts) — or null when valid = 0. |
| `histogram` | object | Map from m to the record {`rule` (`"fd"`, `"scott"`, or `"single"`), `width_units` (int k, the bin width in display steps), `first_edge` (int e0, the lowest bin's lower edge in recording steps of 0.001 m or 0.001°), `bins` (int K, 1 to 60), `counts` (K arrays of six ints, bins ascending, classes in `scarp_classes` order, summing to valid)} — the [DD-5](#1-ddd-decision-register) bin rule of [§5.12](#512-charts) — or null when valid = 0. Bin j covers the recording steps `[e0 + j·W, e0 + (j+1)·W)` with `W = k · 10^(3 − display_decimals[m])`. |
| `histogram_log` | object | Map from `dzw` to the width panel's logarithmic histogram — the logarithmic bin rule of [§5.12](#512-charts) ([DD-5](#1-ddd-decision-register)) — or null when that panel does not offer the logarithmic axis, valid = 0 included. The record: {`first_edge` (int f, the lowest bin's lower edge in recording steps of 0.001 m, equal to 100 · 2^i for an integer i ≥ 0), `bins` (int K ≥ 1), `counts` (K arrays of six ints, bins ascending, classes in `scarp_classes` order), `below_counts` (six ints in `scarp_classes` order: the valid values below 100 steps, 0.1 m, zeros included)}. Bin j covers the recording steps `[f · 2^j, f · 2^(j+1))`, and `counts` and `below_counts` together sum to valid. |
| `display` | object | Map from m to the record of the seven statistics as display strings, each `display_round(value, display_decimals[m])` per [§5.8](#58-view-layer), with `sd` null where the statistic is null — or null when `statistics.<m>` is null. |
| `selection` | object | Exactly one of two records: {`identities`} when `matching_records` ≤ 10,000, otherwise {`signature`, `count`} (below). |
| `converted_windows` | array or null | Null in slip mode. In offset mode, one record per selected dip, ascending by `fault_dip`: {`fault_dip` int, `window_lo` number, `window_hi` number (m), `range_flag` (`"in_range"`, `"partly_out"`, or `"out_of_range"`), `window_lo_display` and `window_hi_display` (strings, `display_round(·, display_decimals.slip)`)}. |
| `diagnosed_conditions` | array or null | Null unless `matching_records` is 0; then the condition groups whose relaxation alone yields matches ([§5.3](#53-query-engine)), possibly none, as keys in the fixed order `fault_dip`, `sediment`, `depth`, `density`, `window`, `scarp_class` — `window` standing for the window group (`entry_mode`, `slip_window`, `offset_max`). [GS-4](pdd.md#102-golden-scenarios) (Alternating Strong–Weak + depth 3 m) yields `["sediment", "depth"]`. |

**Selection.** `identities` is an array of
`[trial, stage_index, class_code]` triples, one per selected record,
in artifact order (ascending `trial_id`, then ascending
`stage_index`): `trial` is the record's string in the manifest's
`trials`, `stage_index` its position 0–100 in the trial's
ascending-slip run, and `class_code` its `scarp_classes` index 0–5,
or 255 for an unclassified record. `signature` is the SHA-256 of the
UTF-8 bytes of the lines `trial;stage_index;class_code` — one per
selected record in artifact order, decimal integers, 255 for an
unclassified record — joined by single U+000A characters with no
trailing newline; `count` equals `matching_records`. Either way
agreement means the same records with the same classes, not merely
the same totals. The 10,000 bound is a convention fixed here: the
golden scenarios of at most 3,434 records compare record by record,
and the larger ones stay one hash in size.

**Generator algorithms.** `product_export.py` computes every value
with these exact operations. Its statistics are the Python twins of
the client algorithms of [§5.4](#54-statistics), their single home:
both sides perform the same float64 operations in the same order, so
agreement holds by construction and the
[DD-2](#1-ddd-decision-register) tolerance stays the pass criterion
rather than the mechanism:

1. **Inputs.** For each measurement, the valid view values v as
   float64 and their recording steps `s = round(v · 1000)`
   (`· 10000` for slip), with `s / 1000 == v` (`/ 10000` for slip)
   asserted for every value (rule `bitwise-restore`) — the numbers
   the client restores ([§3.1](#31-scenario-artifact-binary-layout)).
2. **Order statistics.** v is sorted ascending; `min`, `max`,
   `median`, `p16`, and `p84` follow the Extremes and Percentiles
   steps of §5.4, and `percentiles.<m>[q]` is
   `quantile_linear(v, q/100)`, `quantile_linear` being the Python
   twin of `quantileLinear`.
3. **Mean.** The Mean step of §5.4 over the integer steps s, with
   the divisor `D` = 1000 (10000 for slip).
4. **Standard deviation.** The Standard deviation step of §5.4, the
   sample standard deviation, over the ascending v; §5.4 also names
   the summation and power operations that neither side uses.
5. **Nulls.** With valid = 0 the generator writes null for
   `statistics.<m>`, `percentiles.<m>`, `histogram.<m>`,
   `display.<m>`, and, for `dzw`, `histogram_log.dzw` without
   computing anything; with valid = 1, `sd` is null and `median`,
   `p16`, and `p84` come from the endpoint branch, equal to `min` and
   `max`.
6. **Histograms.** `histogram()` applies the bin rule of
   [§5.12](#512-charts) to the steps s, the class codes, and
   `display_decimals[m]`; for `dzw`,
   `histogram_log(steps, classes, offer_ratio)` applies the
   logarithmic bin rule of §5.12, its offer rule included, to the
   same steps and class codes, with `offer_ratio` 100: the ratio that
   `logScaleOfferRatio()` ([§5.13](#513-application-configuration))
   assigns to the 2 decades of `LOG_SCALE_MIN_DECADES`, which the
   envelope records as `log_scale_min_decades`.
7. **Display strings.** `display_round` applies the display rounding
   of [§5.8](#58-view-layer).
8. **Windows, flags, and selection.** Converted windows apply the
   back-projection of [§5.5](#55-offset-to-slip-conversion-assist)
   with `o_max = float(offset_max)`; range flags apply the
   stored-space rule of §5.5. The selection takes the steps of
   [§5.3](#53-query-engine) in its order on the view records: the
   trial conditions; then the window, comparing each record's slip
   step `round(slip · 10000)` with the inclusive stored bounds — from
   `stored_bounds_from_decimal` for slip-mode strings, from
   `_stored_bounds` for converted windows, and no comparison when no
   window is active; then the
   [DR-3 — One-state-per-trial
   population](prd.md#dr-3-one-state-per-trial-population) rule; and
   only then the scarp-type filter, so the one-state rule never
   searches back for a stage of a selected class.
9. **Finite numbers.** The generator asserts `math.isfinite` on
   every number it writes (rule `finite-reference-values`). The rule
   is an assertion inside the generator, not one of the
   validation-report rules of
   [§4.1](#41-export-task-and-validation): it prints no `ok` line,
   and on failure it prints
   `finite-reference-values: FAILED — <detail>` and ends the run with
   a non-zero exit, as a failing rule does.

The fixture lane of `test_reference_results.py`
([§7.3](#73-pipeline-and-export-tests)) pins `quantile_linear` to
NumPy's `linear` method bit for bit (`float.hex` equality at
q = 0 … 100), so the generator matches NumPy without calling it.
DuckDB's `quantile_cont`, the pipeline's established percentile,
agrees with `quantile_linear` within one ulp on the FR-O2 quantiles
of the shipped columns: a drafting measurement on
`data/processed/dem/data.parquet` (SHA-256
`6a6e9149066f503588e09ecb6772a8392685716672e298d75aa925e7826eb303`)
found the largest gap, 1.5e-16 relative, at p84 of scarp height
(3.0439999999999996 against 3.044), and the full-data lane of
`test_reference_results.py` asserts the one-ulp bound on every
vintage (task T-14 of the [implementation plan](ip.md#2-task-graph))
— far inside the DD-2 tolerance.

**Boundary cases.** `boundary_cases` is an array of records
generated from the pipeline views; each fixes every input
explicitly, so the harness never recomputes a perturbation:

| Field | Type | Content |
|---|---|---|
| `id` | string | The case name (grammars below). |
| `base` | string | The golden scenario whose `inputs` the case starts from: `"GS-0"`, `"GS-1"`, or `"GS-7"`. |
| `inputs` | object | The case's canonical scenario object, as in a scenario entry. |
| `windows` | object or null | Offset path: a map from every modeled dip — every value of the vintage's `trial_columns.fault_dip` ([§3.2](#32-artifact-manifest)) — as a decimal string, to the record {`lo`, `hi`} of numbers (m) that `query` uses as that dip's converted window: one entry of the `PerDipWindows` argument of the [§5.3](#53-query-engine) query, which needs an entry for every dip that the match and its empty-result diagnostic can mask in. Slip path: null. |
| `expected` | object | Record {`stored_bounds`, `counts`, `selection`}: `stored_bounds` maps every modeled dip, as a decimal string, to `[lo_s, hi_s]` (ints, stored slip units) — on the offset path `_stored_bounds` of that dip's `windows` entry; `counts` and `selection` are shaped as in a scenario entry. |

*Offset path.* The base is GS-1, with `population` either value. For
each selected dip d (30 and 40) and each side, let r be the recorded
slip — the view's float64 — nearest the converted endpoint on the
inside, among the dip-d records that the case's `inputs` select with
the converted windows: for the `lo` side the smallest such slip
≥ `window_lo(d)`, for the `hi` side the largest ≤ `window_hi(d)`.
The generator converts the case's `offset_max` for every modeled dip
and keeps every converted `windows` endpoint except that one, which
each case replaces by:

- `exact` — r;
- `ulp-`, `ulp+` — `math.nextafter(r, -math.inf)`,
  `math.nextafter(r, math.inf)`;
- `in-`, `in+` — r − 1e-14, r + 1e-14: 1e-10 stored units, inside
  the 1e-9 guard of [§5.3](#53-query-engine), so the stored bounds
  equal those of `exact`;
- `out-`, `out+` — r − 1e-12, r + 1e-12: 1e-8 stored units, beyond
  the guard, so the inward shift (`out+` on `lo`, `out-` on `hi`)
  moves that stored bound by one unit and drops r;
- `step-`, `step+` — r − 1e-4, r + 1e-4: one
  `slip_window_bounds.recording_step`;
- `roundtrip` — `((r · slope_d + intercept_d) − intercept_d) / slope_d`.

That makes 2 populations × 2 dips × 2 sides × 10 perturbations = 80
cases, named `B-GS1-<population>-d<dip>-<side>-<perturbation>` with
`<population>` `allstages` or `onestate`
(`B-GS1-onestate-d40-hi-out+`).

*Slip path.* With M the canonical decimal of
`slip_window_bounds.max` (`5.0135` on the shipped vintage),
slip-mode cases set `slip_window` on base
[GS-7](pdd.md#102-golden-scenarios) (One state per simulation trial,
no active slip window) to {`0`, M} — the explicit twin of GS-7's
no-window rule — and to {`0`, M − 0.0001}; on base
[GS-0](pdd.md#102-golden-scenarios) — Empty scenario (no active slip
window), default population — to {`0`, M} and to {`0.0001`, M}; and
on both bases to the sub-step pair {`0.00005`, M − 0.00001}, whose
exact stored bounds are [1, 50134] on the shipped vintage. Endpoints
are computed in exact decimal arithmetic and written in grammar G's
canonical form ([§5.7](#57-scenario-controls)), and
`expected.stored_bounds` maps every modeled dip to the same pair,
`stored_bounds_from_decimal(min, max)` ([§5.3](#53-query-engine)).
The six cases are named `B-<base>-slip-<min>-<max>`, with `<base>`
written without its hyphen (`B-GS7-slip-0-5.0135`), and none
exceeds M, which [§5.7](#57-scenario-controls) rejects.

**Synthetic cases.** `synthetic` holds algorithm cases that do not
depend on the vintage, built deterministically by
`eps_ground_rupture/reference_cases.py`, which the pytest fixture
lane shares ([§7.3](#73-pipeline-and-export-tests)):

- `ensembles` — at most four records {`id`, `purpose`,
  `scarp_classes`, `trials`, `stages`, `cases`}, each of at most 8
  trials, every trial with exactly 101 stages (the
  [§3.1](#31-scenario-artifact-binary-layout) stride).
  `scarp_classes` is the six class names in `config.SCARP_CLASSES`
  order, written by the generator: every `stages.scarp_class` name is
  one of them, and every `class_code` in `expected.selection` other
  than 255 indexes this list. `trials` lists
  `[trial, fault_dip, sediment_strength, cohesion, set, depth, density]`
  rows — the `Trial` string, then the §3.1 trial-table columns without
  `model_family`, each typed as in its `trial_columns` dictionary
  ([§3.2](#32-artifact-manifest)) — in ascending code-point order of
  `trial`; `stages` is a map with
  exactly the keys `slip`, `scarp_height`, `dzw`, `scarp_dip`, and
  `scarp_class`, each a trial-major array in that trial order, slip
  strictly ascending within each trial: `slip` (ints, 1e-4 m steps),
  `scarp_height` and `dzw` (ints in 1e-3 m steps, or null),
  `scarp_dip` (ints in thousandths of a degree, or null), and
  `scarp_class` (class names, or null). `test/fixtures.ts` builds a
  synthetic vintage from exactly this declarative spec
  ([§7.4](#74-application-tests)), writing `scarp_classes` as the
  fixture manifest's `scarp_classes` and a palette of its choosing as
  its `scarp_class_palette`. Each case is a record {`id`,
  `inputs`, `windows`, `expected`}, with `windows` as in
  `boundary_cases` — the ensemble's modeled dips being the distinct
  `fault_dip` values of its `trials` — and `expected` the record
  {`counts`, `selection` ({`identities`}), `statistics`,
  `diagnosed_conditions`} shaped as in a scenario entry. The cases
  cover inclusive endpoints on recorded slips; one state per trial
  picking the highest slip within the window; one state per trial
  under a scarp-type filter that deselects the class of a trial's
  highest in-window stage, so that trial contributes nothing — the
  filter applies after the one-state rule (generator step 8); with
  no window, picking the final stage, never an implicit-window
  intersection; a trial with no stage in the window contributing
  nothing; the two-count model with nulls; the default scarp-type
  state keeping unclassified records and any deselected type
  dropping them; the single-condition diagnostic; per-dip windows
  where one `out_of_range` dip contributes nothing;
  `(set, sediment_strength)` matched as pairs — with trials
  (Homogeneous, Strong), (Heterogeneous, Strong), and (Homogeneous,
  Weak), selecting only (Homogeneous, Strong) matches only the first;
  a slip window empty in stored units (`hi_s < lo_s`) matching
  nothing; and an empty condition group matching nothing, with the
  diagnostic naming that group.
- `statistics` — records {`id`, `decimals` (3 or 4), `steps` (ints:
  the values in recording steps, in any order), `expected`}, with
  `expected` the record {`statistics`, `percentiles`} shaped as one
  measurement's entries in a scenario; the cases include n = 0 (both
  null), n = 1, and n = 2, with duplicate and negative values.
- `histograms` — records {`id`, `display_decimals` (0, 1, or 2),
  `steps` (ints in 0.001 recording steps), `class_codes` (ints 0–5,
  one per step), `expected` ({`histogram`, `histogram_log`})}:
  `histogram` is `histogram()` of the case, shaped as one
  measurement's `histogram` entry; `histogram_log` is
  `histogram_log()` of the same steps and class codes, with the
  `offer_ratio` of generator step 6, shaped as
  `histogram_log.dzw`, when `display_decimals` is 1 (the width
  panel's, the only panel with a logarithmic axis), and null
  otherwise. Cases with `display_decimals` 1 have no negative step,
  as recorded widths have none. The linear cases are constant data,
  a zero interquartile range with distinct values, a width forced up
  by the 60-bin cap, values on internal edges, a negative minimum,
  n = 1, and n = 2. The logarithmic cases, each with
  `display_decimals` 1 and with `minpos_s` and `maxpos_s` the
  smallest and largest positive steps, are: an offered case with
  zeros and positive steps below 100 (`below_counts` nonzero,
  `first_edge` 100); an offered case with `minpos_s` ≥ 100 strictly
  between two bin edges; the offer threshold from both sides,
  `maxpos_s = 100 · minpos_s` (not offered) and
  `maxpos_s = 100 · minpos_s + 1` (offered); an offered case with
  positive steps on bin edges, 100 and `maxpos_s` among them; and a
  case whose steps are all 0.
- `display_rounding` — records {`id`, `value` (number), `decimals`
  (int), `expected` (string)}: the display-rounding vectors listed in
  [§7.3](#73-pipeline-and-export-tests), in that order, each
  `expected` written by `display_round`, the rule of
  [§5.8](#58-view-layer), and each `id` `round-<decimals>-<value>`
  with `<value>` Python's `repr` of `value` (`round-2-2.675`,
  `round-2--0.005`), unique because no two vectors share both
  `decimals` and `value`.
- `conversion` — records {`id`, `slip_window_bounds` ({`max`,
  `recording_step`}), `coefficients` (records {`fault_dip`,
  `slope`, `intercept`}), `offset_max` (a canonical decimal string),
  `expected` ({`converted_windows`}, shaped as in a scenario
  entry)}. The synthetic coefficient rows produce all three range
  flags — among them an `out_of_range` row with intercept −6 m,
  which exported coefficients cannot reach
  ([§3.5](#35-regression-export)) — plus, in the stored-space terms
  of [§5.5](#55-offset-to-slip-conversion-assist), `hi_s = max_s`
  (`in_range`) against `hi_s = max_s + 1` (`partly_out`),
  `offset_max` `"0"`, and `offset_max` `"1000"` — the largest entry
  R2 of [§5.7](#57-scenario-controls) accepts — on a row of slope 0.3
  and intercept −0.02, a smaller slope than any exported row's
  (§3.5), whose converted windows are finite. The client's
  conversion has no hand-written unit expectations; these cases test
  it ([§7.2](#72-calculation-parity-tests)).

**Animation offer.** When the
[P2](prd.md#22-mvp-and-delivery-priorities) (the second delivery
priority, after the MVP) animation offer ships, per-class counts over
classified matching records join each scenario entry — a new
displayed statistic lands in the reference generator first
([ADR-0015](../adr/0015-golden-scenario-parity.md)).

*Verification (planned):* the reference generator (task T-13 of the
[implementation plan](ip.md#2-task-graph)) writes the file, and the
export's rules `format-spec` and `reference-invariants`
([§4.1](#41-export-task-and-validation)) validate it; the parity
harness of [§7.2](#72-calculation-parity-tests) consumes it unchanged
— it replays the scenarios, the boundary cases, and the synthetic
cases through the real modules and never computes an expected value;
the fixture lane of `test_reference_results.py`
([§7.3](#73-pipeline-and-export-tests)) checks the generator against
independent recomputation — the NumPy pin above, `_stored_bounds`
probes on recorded slips at each perturbation size, the synthetic
ensembles recomputed with pandas, linear and logarithmic histogram
counts recomputed with `numpy.histogram` over their bin edges, and
the display-rounding vectors — and its full-data lane regenerates the
golden scenarios, asserts the populations PDD §10.2 states, and
asserts that for each dip at least one `out` or `step` case changes
the selection relative to `exact`, so the battery stays
discriminating.

References:

- [HLDD §5.6 — Reference results and verification
  (ADR-0015)](hldd.md#56-reference-results-and-verification-adr-0015).
- [PDD §10.2 — Golden scenarios](pdd.md#102-golden-scenarios).
- [ADR-0015](../adr/0015-golden-scenario-parity.md).
- `subprojects/python/src/eps_ground_rupture/views.py`
  (`dem_slip_bin_stats`, the `STDDEV_SAMP` precedent).

### 3.7 Media index (P2)

The media index is one uncompressed JSON file, `media-<h12>.json`
([§4.1](#41-export-task-and-validation)), written by the export task
from project-maintained metadata — no DuckDB view
([ADR-0012](../adr/0012-product-data-exports.md), amendment of
2026-10-29). It ships with
[P2](prd.md#22-mvp-and-delivery-priorities) (the second delivery
priority, after the MVP); the schema is fixed now so the vintage
layout does not change later. Envelope (record): `schema_version`
(1), `export_version`, `export_date`, `pipeline_version` (as in
[§3.2](#32-artifact-manifest)), and `entries`, an array of entry
records in ascending code-point order of `id`, so that a
reproduction run rewrites identical bytes. Each entry: `id` (string,
unique); `kind` (`"animation"` or `"photograph"`); `file` (string,
the media file's site-relative POSIX path — never under
`media/dev/`, where development copies live
([§6.4](#64-product-pages-beyond-the-scenario-page-p2p3))); `purpose`
(`"morphology"`, `"measurement"`, or `"offer"`); `scarp_class` (one
of the six canonical names, or null where not applicable);
`caption` (string); `attribution` (string); `permission` — a record
with `status` (`"granted"`, `"pending"`, or `"internal_only"`) and
`record` (string, the identifier of the documented permission); and
`available` (bool). Availability and permission are data conditions
the surfaces read, never assumptions
([HLDD §6.2 — Media architecture (ADR-0012)](hldd.md#62-media-architecture-adr-0012)).

*Verification (planned):* the MkDocs hook
`subprojects/mkdocs/hooks/site_checks.py`
([§6.1](#61-build-outputs-asset-paths-and-page-scaffold)) fails any
build whose output contains a media file that is neither allowlisted
nor the `file` of an entry whose `permission.status` is
`"granted"`, whether a page references it or not (its
publication-inventory arm), or any `media/dev/` path or reference
(its development-media arm); this is the response to
[R-12](prd.md#93-content-and-media-dependencies) (Public permission
for third-party earthquake photographs is unresolved.), and
[§7.7](#77-site-validation-and-release-checklist) names the hook as
the media-permission check.

References:

- [HLDD §6.2 — Media architecture (ADR-0012)](hldd.md#62-media-architecture-adr-0012).
- [ADR-0012](../adr/0012-product-data-exports.md).

### 3.8 Measured sizes

Every measured figure in this section is a drafting measurement on
`data/processed/dem/data.parquet` (SHA-256
`6a6e9149066f503588e09ecb6772a8392685716672e298d75aa925e7826eb303`),
taken by a drafting battery that is not in the repository. The text
names, for each figure, the repository check that reproduces it —
the size report near the end of every successful export run
([§4.1](#41-export-task-and-validation) fixes its line format; task
T-11 of the [implementation plan](ip.md#2-task-graph)), the payload
diagnostic line that T-17 adds to the same run as its last line, or
the measurement suite of
[§7.6](#76-performance-and-compatibility-measurements) (T-61) — or
says that none does; the section is updated from those checks'
reports, never hand-edited.

The selected representation ([DD-1](#1-ddd-decision-register),
dictionary layout) and the measured alternative:

| Layout | Raw bytes | gzip −9 | gzip −6 | Per record |
|---|---|---|---|---|
| **Selected: dip as `uint16` dictionary index + `int32` dictionary** | 3,288,980 | 944,325 | 947,765 | 9.48 B |
| Alternative: dip as `int32` scaled integer | 3,839,232 | 991,359 | 996,330 | 11.07 B |

Both rows measure the complete decompressed artifact exactly as
[§3.1](#31-scenario-artifact-binary-layout) frames it — 16-byte
header, 4-byte-aligned blocks, the five stage arrays, the
24,038-byte trial table (3,434 × 7 bytes) — and, in the selected
layout, the 143,416-byte dip dictionary. For the selected layout,
the size report reproduces the raw size as the artifact's
decompressed byte count, equal to the length its `blocks` declare,
and the gzip −9 size as its file byte count (T-11). The artifact's
bytes carry no tag, date, or `provenance`, so the `data-v0-test`
export that T-11 runs reproduces them for any vintage built from the
same `dem` view and zlib build.
No repository check reproduces the gzip −6 column, the alternative
row, or the per-block gzip −9 sizes of the selected layout — `slip`
9,624 B; `scarp_height` 153,642 B; `dzw` 322,167 B; `scarp_dip`
index 385,270 B; `scarp_class` 16,902 B — which support the DD-1
choice and bind nothing else. Against the 4 MB compressed payload
budget of
[PDD §9.1 — Performance budgets (D-9,
Proposed)](pdd.md#91-performance-budgets-d-9-proposed) the selected
artifact alone measured 0.944 MB. That figure is a diagnostic lower
bound for
[R-16](prd.md#94-delivery-and-technical-risks) (Combined scenario
filtering requires enough detail to support arbitrary filters, but
the static site has a strict payload budget.), not evidence about
it: the budget is accepted only against the full payload scope of
[§7.6](#76-performance-and-compatibility-measurements). The payload
diagnostic line, which T-17 adds to the export run after the size
report, repeats the artifact's file byte count against that budget
as `payload diagnostic: <bytes> of 4 MB (4,000,000 B) budget`, with
`<bytes>` that count as a plain decimal integer and the 4 MB read as
4,000,000 B as §7.6 reads it. A count above the budget changes only
the printed figure, and the run continues: the line is a diagnostic,
never a gate.

The artifact manifest's dominant content is measured: the
3,434-entry `trials` array is 118,237 bytes in the canonical JSON
form of [§4.1](#41-export-task-and-validation) (9,213 bytes at
gzip −9; trial strings of the form `D10_K_dip20_FS0.25`). No check
reproduces these two figures separately; item 1 below supersedes
them. The rest of the manifest, `provenance` included, adds a few
kilobytes, so the whole manifest is estimated near 125 KB raw and
12 KB compressed — an estimate, not a measurement.

**Pending first generation**, each recorded here from the named
check's report. The size report's figures are measured on a
`data-v0-test` export (T-11), the only tag an agent exports from the
research data, and are recorded with that label: a published
vintage's JSON and terms files differ from them in length wherever
its tag, its `provenance` strings, or its `data/REDISTRIBUTION.md`
differ. An item leaves this list, its figures joining the text above,
once every figure it names is recorded; until then the figures
recorded so far stand in the item.

1. the artifact manifest's byte count — from the size report (T-11)
   — and its compressed size as served — from the measurement suite
   (T-61);
2. the complete size of the selected representation, which
   [HLDD §5.2 — Simulation data organization
   (ADR-0013)](hldd.md#52-simulation-data-organization-adr-0013) and
   the amendment of 2026-10-28 to
   [ADR-0013](../adr/0013-row-level-scenario-artifact.md) require to
   count the artifact manifest beside the artifact and its
   dictionary (the figures above exclude the manifest): its raw
   figure, the artifact's decompressed byte count plus item 1's byte
   count, from the size report (T-11), and its compressed figure, the
   artifact's file byte count plus item 1's compressed size as
   served, from the measurement suite (T-61);
3. the field-data, regression, reference-results, and vintage-terms
   files' byte counts and, for the `.gz` files, decompressed byte
   counts — from the size report (T-11; the reference-results
   file's once T-13 joins the run);
4. the JavaScript bundle and stylesheet sizes, and the compressed
   total over the full payload scope of
   [§7.6](#76-performance-and-compatibility-measurements) — from the
   measurement suite (T-61);
5. from [P2](prd.md#22-mvp-and-delivery-priorities) (the second
   delivery priority, after the MVP), the media index's size — from
   the size report.

*Contributes to:* the size half of the R-16 feasibility
measurements; with items 1, 2, and 4 pending, nothing here closes
R-16, whose gate the owner confirms
([HLDD §10 — Risks and open
dependencies](hldd.md#10-risks-and-open-dependencies)).
*Verification (planned):* every successful export run's size report
re-measures each vintage file's byte count and, for a `.gz` file,
its decompressed byte count (T-11), and its payload diagnostic line
prints the artifact's compressed size against the budget (T-17); the
measurement suite of
[§7.6](#76-performance-and-compatibility-measurements) measures and
itemizes the full payload as served (T-61).

References:

- [HLDD §5.2 — Simulation data organization
  (ADR-0013)](hldd.md#52-simulation-data-organization-adr-0013).
- [HLDD §7.1 — Performance estimates and
  verification](hldd.md#71-performance-estimates-and-verification).
- [HLDD §10 — Risks and open
  dependencies](hldd.md#10-risks-and-open-dependencies).
- [ADR-0013](../adr/0013-row-level-scenario-artifact.md) (amendment
  of 2026-10-28).

## 4. Export task and data lifecycle

### 4.1 Export task and validation

The export lives in a new pipeline module,
`eps_ground_rupture/product_export.py`, exposed as the Poetry script
`egr-export-app` (entry point `eps_ground_rupture.product_export:main`)
and as the Gradle task `exportApp`: an `Exec` task in
`subprojects/python/build.gradle.kts` (group `build`) that, like
`egrBuild`, activates the project virtualenv (`useVenv()`), depends
on `poetryInstall`, and runs
`poetry run egr-export-app --data-tag data-vN` for the required
property `-Pdata.tag=data-vN`. It is wired into no lifecycle task:
it needs the local research data and writes the working-tree pointer
manifest. Throughout §4, `data-vN` is that tag. One run produces one
complete vintage in `dist/app/data-vN/` — the four research-data
exports from their DuckDB views and, from P2 on, the media index from
project-maintained metadata, without a view
([ADR-0012](../adr/0012-product-data-exports.md), amendment of
2026-10-29) — together with the vintage-terms file and both
manifests, all in that same run.

Every check below names its rule. The run prints its validation
report to standard output: first `source_commit` and
`source_tree_clean` (step 1), then `<rule>: ok` for each rule of
steps 1, 3, 5, and 6, one line per rule in the order this section
lists them. The first failing rule prints
`<rule>: FAILED — <detail>` and ends the run with a non-zero exit;
any other error ends it the same way, with the error printed. The
pointer manifest is written only in step 6, so a failed run never
changes it. A successful run then prints the size report and the
payload diagnostic line (end of this section).

1. **Preconditions and provenance.**
   - Rule `data-tag`: `--data-tag` matches
     `^data-v(0-test|[1-9][0-9]*)$`, the tag format of
     [§3](#3-data-formats), and becomes `export_version`. A
     development export uses `data-v0-test`, the single development
     tag, which `publishVintage` refuses
     ([§4.2](#42-publication-of-a-data-vintage) step 1); the export
     does not check that `N` is the next free number — publication
     does (§4.2 step 3) — and `exportApp` itself uploads nothing.
   - Rule `retained-copy`: the run refuses while
     `dist/app/data-vN.publication.json` exists, because the
     directory then holds a staged or published vintage — the
     retained copy of
     [§4.3](#43-retention-rollback-recovery-and-withdrawal).
     Otherwise it deletes and recreates `dist/app/data-vN/`. A
     `--reproduce` run skips this rule: it writes only
     `dist/app/data-vN.reproduced/`
     ([§4.3](#43-retention-rollback-recovery-and-withdrawal)).
   - Rule `inputs-present`: these files exist — the four processed
     tables `data/processed/<table>/data.parquet` for `dem`,
     `fdhi_measurements`, `kern_combined`, and `sure` (the
     established `egr-build` outputs); the four raw inputs
     `egr-build` reads, `data/raw/DEM_dataset.csv`, the FDHI flatfile
     `io.find_fdhi_flatfile()` returns, `data/raw/SURE.csv`, and
     `data/raw/Combine_BuwaldaFDHI_KernSDC.csv`; and, for every run
     whose tag is not `data-v0-test`, `data/REDISTRIBUTION.md`
     ([§4.4](#44-licensing-archival-distribution-and-release-attachments),
     Vintage terms), which the owner commits with the assumed terms
     under owner action OA-1 of the
     [implementation plan](ip.md#4-owner-and-research-group-actions) in
     Phase 1, its texts replaced by OA-13's final ones in Phase 2 — the
     two phases of §4.4. Development exports run without it (step 4).
   - Provenance: the run computes the `provenance` object of
     [§3.2](#32-artifact-manifest), running every command at the
     repository root. `source_commit` is the output of
     `git rev-parse HEAD`; `source_tree_clean` is true when the
     clean-tree command
     `git status --porcelain=v1 --untracked-files=all -- . ':(exclude)subprojects/webapp/data/pointer.json'`
     prints nothing; `inputs` lists the eight data files above —
     repository-relative POSIX `path`, `sha256`, and `bytes` — sorted
     by `path` (not `data/REDISTRIBUTION.md`, which `source_commit`
     already identifies); `environment` and `compression` hold the
     values §3.2 defines. A dirty tree is recorded
     (`source_tree_clean` false), never refused here: development
     exports run on working trees, and publication refuses a dirty
     tree ([§4.2](#42-publication-of-a-data-vintage) step 2).
   - Views: the run builds its own DuckDB views,
     `views.build_duckdb_views(duckdb_path=Path(tmp, "views.duckdb"))`
     with `tmp` a `tempfile.TemporaryDirectory()`, so every export
     comes from the running code. It never opens
     `dashboards/duckdb/eps.duckdb`, which holds whatever views the
     last `egrBuild` left — the stale-file hazard noted at the
     `csvExport` tasks of `subprojects/python/build.gradle.kts`.
2. **Build the data files.** The scenario artifact is packed from
   the `dem` view exactly per
   [§3.1](#31-scenario-artifact-binary-layout); the field, regression,
   and reference files follow [§3.4](#34-field-data-export),
   [§3.5](#35-regression-export), and
   [§3.6](#36-reference-results). Every JSON file the export writes
   is serialized as
   `json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False, allow_nan=False)`
   — floats in Python's shortest round-trip `repr` — and encoded as
   UTF-8 with one trailing newline, so its bytes are reproducible.
   `allow_nan=False` makes a NaN or an infinity fail the run instead
   of becoming a token `JSON.parse` rejects, and the reference
   generator also asserts `math.isfinite` on every number it writes
   (rule `finite-reference-values` of §3.6).
   `finite-reference-values` is an assertion inside the generator:
   it prints no `ok` line; on failure it prints
   `finite-reference-values: FAILED — <detail>`. The four data files
   are compressed only with
   `gzip.compress(payload, compresslevel=9, mtime=0)` — never
   `gzip.open` or `GzipFile`, which write the output file's name into
   the gzip header — so their bytes depend only on the payload and
   the zlib build `provenance.environment` records; the artifact
   manifest, the vintage-terms file (step 4), and from P2 the media
   index stay uncompressed.
   Every vintage file is named over its exact bytes — the compressed
   bytes of a `.gz` file — with `<h12>` the first 12 lowercase
   hexadecimal digits of its SHA-256 and one pattern per role, whose
   stems are the ones
   [§6.1](#61-build-outputs-asset-paths-and-page-scaffold) selects
   files by:
   - `scenario-<h12>.bin.gz` — the scenario artifact;
   - `manifest-<h12>.json` — the artifact manifest;
   - `field-<h12>.json.gz` — the field-data export;
   - `regression-<h12>.json.gz` — the regression export;
   - `references-<h12>.json.gz` — the reference results;
   - `data-terms-<h12>.txt` — the vintage terms
     ([§4.4](#44-licensing-archival-distribution-and-release-attachments));
   - `media-<h12>.json` — the media index, from P2.

   Under `schema_version` 1 no other vintage file exists — the
   reserved per-family artifact keys of §3.2 are never emitted — and
   step 6 rejects any other name.
3. **Validate from in-memory decode information** — the task decodes
   the files it has just written using the decoding information it
   holds in memory, before any manifest exists:
   - `counts`: records, trials, and stages per trial are measured
     from the `dem` view; every trial has the same number of stages,
     and records equal trials × stages per trial. On the shipped
     vintage they are 346,834, 3,434, and 101 (drafting measurement
     on `data/processed/dem/data.parquet` (SHA-256
     `6a6e9149066f503588e09ecb6772a8392685716672e298d75aa925e7826eb303`),
     reproduced by the full-data lane of `test_scenario_export.py`
     (T-14)); the rule measures them and hardcodes none.
   - `slip-order`: slip strictly ascends within every trial, with no
     ties.
   - `site-constancy`: site conditions are constant within every
     trial.
   - `bitwise-restore`: every value decodes back to its source. A
     scaled or dictionary value, restored by the restore rule of
     [§3.1](#31-scenario-artifact-binary-layout), has the same
     `float.hex()` as the view value it was packed from; a class code
     or trial-table index maps back, through its manifest dictionary,
     to the view's value (class code 255 to null).
   - `sentinel-collision`: no valid stored value — a `scarp_dip`
     dictionary index included — equals its column's null sentinel.
   - `null-counts`: every column's null count equals the view's.
   - `unclassified-has-no-valid-measurement`: every record whose
     `scarp_class` is null has null `scarp_height`, `dzw`, and
     `scarp_dip` — the property the per-class histogram counts of
     §3.6 rely on.
   - `dictionary-order`: `scarp_classes`, each `trial_columns`
     dictionary, and `arm_strength_states`, as the run holds them for
     the manifest, are in their [§3.2](#32-artifact-manifest) orders;
     the `dip_dictionary` block, decoded from the written artifact, is
     strictly ascending, as [§3.1](#31-scenario-artifact-binary-layout)
     requires; and the measured `set` × `sediment_strength` pair set
     equals the nine-pair `product_export.py` constant of §3.2.
   - `view-reread`: the field and regression exports, re-read from
     the written files, equal the rows the run-private views return —
     the field-export product view of §3.4 and `dem_regression` — row
     for row in the §3.4 and §3.5 row orders, floats compared by
     `float.hex()`.
   - `coefficient-reach`: every regression row has `slope > 0`,
     `intercept ≤ 0`, and
     `-intercept / slope ≤ slip_window_bounds.max` in float64, so the
     0 m end of every offset window converts to a slip inside the
     recorded range. The `out_of_range` flag and a converted window
     starting below 0 m
     ([§5.5](#55-offset-to-slip-conversion-assist)) therefore cannot
     occur. The per-dip coverage line of
     [PDD §5.6 — Conversion assist (FR-S5, D-3)](pdd.md#56-conversion-assist-fr-s5-d-3)
     is written for partial coverage and describes neither, so a
     vintage that could produce them fails here until the PDD
     provides copy for them.
   - `reference-invariants`: the reference file, gunzipped and
     parsed, equals the generator's in-memory object, and for every
     scenario and measurement `valid` + `excluded_null` equals
     `matching_records` (the reconciliation of
     [PDD §3 — Scenario page: inputs](pdd.md#3-scenario-page-inputs));
     `statistics`, `percentiles`, `histogram`, and `display` are null
     exactly when `valid` is 0; `sd` is null exactly when `valid` is
     1; every `histogram` counts table sums to `valid`;
     `histogram_log.dzw` is null exactly when the width panel does not
     offer the logarithmic axis under the offer test of
     [§5.12](#512-charts) (Logarithmic scale), so always when
     `counts.per_measurement.dzw.valid` is 0, and otherwise its
     `counts` and `below_counts` together sum to that `valid` and its
     `first_edge` is 100 · 2^i recording steps for an integer i ≥ 0;
     and `selection` holds `identities` with `matching_records`
     entries when `matching_records` ≤ 10,000, otherwise a `count`
     equal to `matching_records`.
4. **Write and hash-name the artifact manifest and the vintage
   terms** — only once every step-3 rule holds, the
   [HLDD §5.4 — Pinned, versioned artifacts (ADR-0014)](hldd.md#54-pinned-versioned-artifacts-adr-0014)
   order (the manifests are written only after these checks pass):
   the artifact manifest from the measured decode information,
   carrying step 1's `provenance`; the terms file as a byte-for-byte
   copy of `data/REDISTRIBUTION.md`
   ([§4.4](#44-licensing-archival-distribution-and-release-attachments))
   — for a `data-v0-test` run without that file, an empty file;
   both uncompressed and named by the step-2 patterns.
5. **Cross-check the manifest against the written files:**
   - `block-tiling`: block offsets and lengths satisfy the
     [§3.1](#31-scenario-artifact-binary-layout) alignment rule
     against the artifact actually written.
   - `manifest-figures`: every data-derived manifest figure —
     `counts`, `columns`, `trial_columns`, `arm_strength_states`,
     `stage_spacing`, and `slip_window_bounds` — equals its value
     re-measured from the packed artifact.
   - `checksums`: every manifest checksum equals the SHA-256
     recomputed from the written file.
   - `format-spec`: every JSON file of the vintage — the field,
     regression, and reference exports, the artifact manifest, and
     from P2 the media index — matches its closed format spec in
     `product_export.py`: the field lists, member types, nullability,
     and string formats of
     [§3.2](#32-artifact-manifest)–[§3.7](#37-media-index-p2), with
     no required member missing and no unknown member. Step 6 applies
     the same rule to the pointer manifest before writing it.
   - `dd10-names`: every name denoting a pipeline column is one of the
     thirteen names of the [DD-10](#1-ddd-decision-register) closure
     note.
   - `envelope-agreement`: every JSON envelope's `export_version`,
     `export_date`, and `pipeline_version` equal the artifact
     manifest's, and the manifest's `reference_results_version` and
     the reference file's `reference_version` both equal
     `export_version`.
   - `provenance`: the object has exactly the §3.2 members;
     `source_commit` matches `^[0-9a-f]{40}$` and still equals
     `git rev-parse HEAD`; when `source_tree_clean` is true, the
     clean-tree command still prints nothing; `inputs` is sorted by
     `path` with no path repeated, and every input re-hashes to its
     recorded `sha256` and `bytes`.
6. **Write the pointer manifest.** The run builds the
   [§3.3](#33-pointer-manifest) pointer manifest in memory, checks
   it, and only then writes it to
   `subprojects/webapp/data/pointer.json`:
   - `pointer-exact`: the pointer lists precisely the artifact
     manifest, every file the artifact manifest names, the
     reference-results file, and the terms file — nothing more,
     nothing less — each with the SHA-256 of the written file, equal
     to the artifact manifest's checksum wherever that manifest names
     the file; its `data_tag` and `export_version` equal the
     manifest's `export_version`, and its `export_date` the
     manifest's; and its `provenance` deep-equals the manifest's.
   - `file-names`: every pointer name matches its role's step-2
     pattern, with `<h12>` equal to the first 12 digits of its
     SHA-256, and no name ends in `.md`, `.markdown`, `.mdown`,
     `.mkdn`, or `.mkd`. Every vintage file is staged under the
     MkDocs `docs/` tree (§6.1), where such a file would become a
     page outside the navigation — a strict-build failure under the
     site's `validation.omitted_files: warn` — and would be rendered
     instead of served byte-identical.

   The pointer stays uncommitted — committing it is the publication
   act of [§4.2](#42-publication-of-a-data-vintage). A `--reproduce`
   run writes no pointer and applies both rules to the pointer it was
   given ([§4.3](#43-retention-rollback-recovery-and-withdrawal)).

A successful run then prints its size report, one line per vintage
file sorted by file name — `size: <name> <bytes>`, and for a `.gz`
file `size: <name> <bytes> <decompressed bytes>`, each count a plain
decimal integer — from which [§3.8](#38-measured-sizes) is updated.
After it, as the run's last line, comes the payload diagnostic of §3.8
(T-17), `payload diagnostic: <bytes> of 4 MB (4,000,000 B) budget`,
`<bytes>` being the scenario artifact's file byte count, a plain
decimal integer, and 4,000,000 B the reading of 4 MB that
[§7.6](#76-performance-and-compatibility-measurements) uses. The
diagnostic is no rule: a count above the budget changes only the
printed figure, and the run still exits 0.

**Full-data checks.** `exportApp` runs no pytest. The required
full-data checks — the pytest battery of
[§7.3](#73-pipeline-and-export-tests) under
`EGR_REQUIRE_FULL_DATA=1` — run inside the publication task against
the vintage its export has just staged
([§4.2](#42-publication-of-a-data-vintage) step 4), so they check the
bytes that are published. A full-data run counts only with zero
skips and every test the required-test manifest
`subprojects/python/tests/full_data_required.txt` names collected and
passed — the "skipped check is not a pass" rule of
[HLDD §9 — Testing and release architecture](hldd.md#9-testing-and-release-architecture)
made executable.

*Verification (planned):* the fixture lane of
`test_scenario_export.py` ([§7.3](#73-pipeline-and-export-tests))
drives the step-3 and step-5 rules on synthetic frames, each
single-property corruption failing its rule by name; the fixture
lane of `test_manifests.py` rejects a missing `provenance` member, a
manifest–pointer `provenance` mismatch, and unsorted or duplicate
`inputs`; and a `--reproduce` run
([§4.3](#43-retention-rollback-recovery-and-withdrawal)) must
regenerate byte-identical files.

References:

- [HLDD §5.6 — Reference results and verification
  (ADR-0015)](hldd.md#56-reference-results-and-verification-adr-0015).
- [HLDD §9 — Testing and release architecture](hldd.md#9-testing-and-release-architecture).
- [HLDD §5.4 — Pinned, versioned artifacts
  (ADR-0014)](hldd.md#54-pinned-versioned-artifacts-adr-0014).
- [ADR-0012](../adr/0012-product-data-exports.md) (amendment of
  2026-10-29).
- [ADR-0014](../adr/0014-committed-content-hashed-artifacts.md).
- [PDD §5.6 — Conversion assist (FR-S5, D-3)](pdd.md#56-conversion-assist-fr-s5-d-3).
- `subprojects/python/build.gradle.kts` (the `egrBuild` task
  conventions; the stale-`eps.duckdb` note at the `csvExport`
  tasks); `subprojects/python/src/eps_ground_rupture/views.py`
  (`build_duckdb_views`);
  `subprojects/python/src/eps_ground_rupture/io.py`
  (`find_fdhi_flatfile`).

### 4.2 Publication of a data vintage

Publication is one Gradle task, `publishVintage`, run by the owner:
an `Exec` task in `subprojects/python/build.gradle.kts` (group
`deployment`, like `pushSheets`; wired into no lifecycle task) that
activates the project virtualenv, depends on `poetryInstall`, and
runs `poetry run egr-publish-vintage --data-tag data-vN` (entry point
`eps_ground_rupture.publish:main`) for the required property
`-Pdata.tag=data-vN`. Every `git` and `gh` command below runs at the
repository root; the pipeline commands of step 4 run in
`subprojects/python`, as their Gradle tasks do. The vintage is
exported exactly once, by the run that starts it — one run writes
the artifact, both manifests, and the reference results, and one
commit pins them
([ADR-0014](../adr/0014-committed-content-hashed-artifacts.md)).
Every step first detects work already done and skips it, so a rerun
after any interruption resumes without re-exporting: a new export
would change `export_date`, and with it every JSON file's bytes and
name.
The compressed files are the artifacts; no uncompressed twin is
uploaded ([DD-7](#1-ddd-decision-register), the proposed ADR-0014
rule this design follows). Content-hashed names make the no-reuse
rule structural: a filename is never reused for different bytes,
because different bytes produce a different name.

The data release is a GitHub prerelease — never shown as the
repository's latest
([HLDD §5.4 — Pinned, versioned artifacts (ADR-0014)](hldd.md#54-pinned-versioned-artifacts-adr-0014))
— on the annotated git tag `data-vN`, ADR-0014's "lightweight
prerelease data tag" read with "lightweight" qualifying the
prerelease — a reading of ADR-0014 that the owner's acceptance of
this section closes, or an ADR-0014 amendment
([Authority and change control](#authority-and-change-control)).
The repository has GitHub release immutability enabled
(owner action OA-11 of the
[implementation plan](ip.md#4-owner-and-research-group-actions),
done 2026-10-30; step 1 re-checks it): once a release is published,
its assets can no longer be added, changed, or deleted, and its tag
can no longer be moved or deleted while the release exists. The
release is therefore created as a draft — invisible to the public and
to CI, and repairable — and published only after its assets are read
back (steps 6–9). A published vintage is never modified: every
correction is a new vintage under the next tag number, one more run
of this task. Publication also gives the release GitHub's release
attestation of its tag, commit SHA, and assets, which
`gh release verify data-vN` checks — provenance beside, never
instead of, the manifests' `provenance` object.

The sequence, with `S` the commit at `HEAD` when the run starts and
`T` the commit the remote tag `data-vN` points to — the commit
`git ls-remote origin 'refs/tags/data-vN^{}'` prints, or, for a tag
without such a peeled line, the commit of its `refs/tags/data-vN`
line; `T` is empty when no such tag exists:

1. **Permission gate.** The task refuses to run unless all four
   hold: `--data-tag` matches `^data-v[1-9][0-9]*$`, the publishable
   form of the [§3](#3-data-formats) tag format, so the development
   tag `data-v0-test` is refused; `data/REDISTRIBUTION.md` holds
   exactly one OA-1 record line — the record of the per-source terms
   and attributions the file sets out (the G-1/OA-1 artifact of the
   [implementation plan](ip.md#4-owner-and-research-group-actions);
   [§4.4](#44-licensing-archival-distribution-and-release-attachments)
   says who writes the file in each phase), required because assets
   on a public repository are public
   ([Licensing and archival distribution](hldd.md#licensing-and-archival-distribution)):
   in Phase 1 of
   [ADR-0017 — An unadvertised prototype deployment precedes the public release](../adr/0017-unadvertised-prototype-before-public-release.md)
   (Proposed), the assumed record, a line equal to
   `Assumed YYYY-MM-DD: code Apache-2.0, prose CC BY 4.0, derived data exports CC BY 4.0 with per-source attribution — pending research-group confirmation`,
   with which the owner accepts publishing before the research group
   confirms the terms, in place of the HLDD's confirmation "before its
   first public upload"; from Phase 2, the confirmed record that
   replaces it, a line equal to `Confirmed: YYYY-MM-DD`; in both,
   `YYYY-MM-DD` matches `[0-9]{4}-[0-9]{2}-[0-9]{2}` and every other
   character is as written; `README.md` and `LICENSE-docs` each
   contain the path `data/REDISTRIBUTION.md` — the §4.4 wording that
   tells application code, raw inputs, and distributed derived
   exports apart; and
   `gh api repos/HarvardRC/eps-ground-rupture/immutable-releases --jq .enabled`
   prints `true`.
2. **Clean tree.** The task refuses unless the clean-tree command of
   [§4.1](#41-export-task-and-validation) step 1 prints nothing, so
   `S` is exactly the committed source; that command leaves out the
   pointer file, which the task itself stages.
3. **State.** The task reads `T`, the release
   (`gh release view data-vN --json isDraft,isPrerelease,assets`,
   which also finds a draft by its tag name), and the staged
   vintage, and applies the first case that holds, in this order:
   - (c) `T` is not empty and differs from `S`: refuse, naming both
     commits. For an unfinished attempt — the release is a draft, or
     no release exists and `dist/app/data-vN.publication.json`
     exists without `published_at` — the refusal also prints the
     cleanup commands: `gh release delete data-vN --yes` (when a
     draft exists), `git push origin :refs/tags/data-vN`,
     `git tag -d data-vN`, for the pointer file
     `git checkout -- subprojects/webapp/data/pointer.json` when
     `git ls-files --error-unmatch subprojects/webapp/data/pointer.json`
     succeeds and `rm subprojects/webapp/data/pointer.json` otherwise
     (the first vintage's pointer is untracked), and
     `rm -r dist/app/data-vN dist/app/data-vN.publication.json`;
     never for a published or withdrawn vintage, whose tag stays
     ([§4.3](#43-retention-rollback-recovery-and-withdrawal)).
   - (d) A published release exists (`isDraft` false): when the
     working-tree pointer has `data_tag` `data-vN` and the release's
     asset names and SHA-256s, downloaded as in step 8, equal its
     `files` exactly, report "already published" and continue at
     step 10. Otherwise refuse: a published release is never
     changed, so the staged vintage can only be published under the
     next tag number.
   - (e) No release exists and `dist/app/data-vN.publication.json`
     holds `published_at`: refuse, naming the next tag number, as (a)
     computes it — the vintage was published and its release
     deleted, and a deleted release's tag name can never carry
     another release; publish the next tag number
     ([§4.3](#43-retention-rollback-recovery-and-withdrawal),
     Recovery).
   - (b) A staged vintage exists — the working-tree pointer has
     `data_tag` `data-vN`, every file it names is in
     `dist/app/data-vN/` with the pointer's SHA-256, and
     `dist/app/data-vN.publication.json` holds that pointer file's
     SHA-256 as `pointer_sha256`, `S` as `tag_commit`, and no
     `published_at` — and the release is absent or a draft: check
     that the staged `provenance.source_commit` equals `S`, then
     continue at step 5 without re-exporting.
   - (a) `T` is empty, no release exists, and no
     `dist/app/data-vN.publication.json` exists: a fresh run,
     continuing at step 4, provided `N` is 1 + the largest `K` among
     the remote tags named `data-vK` that
     `git ls-remote --tags origin 'refs/tags/data-v*'` lists (1 when
     there is none); otherwise refuse, naming the expected tag. Tags
     of withdrawn vintages count, so no tag name is ever reused
     ([§4.3](#43-retention-rollback-recovery-and-withdrawal)).
   - Any other combination is refused, with the applicable cleanup
     commands of (c) printed for an unfinished attempt.
4. **Export and full-data checks** (fresh runs only). The task runs,
   from the project virtualenv and in `subprojects/python`,
   `egr-build`, then `egr-export-app --data-tag data-vN`, then
   `pytest` with `EGR_REQUIRE_FULL_DATA=1` — the commands of the
   Gradle tasks `egrBuild`, `exportApp`, and `pytestFullData`. The
   processed tables are thereby rebuilt from the raw inputs by the
   code at `S`, and the full-data checks of
   [§7.3](#73-pipeline-and-export-tests), whose `test_manifests.py`
   lane reads the working-tree pointer and `dist/app/data-vN/`, run
   against exactly the staged bytes. The full-data run also requires
   `data/raw/FDHI_Cleaned_Measurements.csv`, the pre-cleaned extract
   against which `test_fdhi_flatfile.py` and `test_prep.py` check the
   cleaning chain; it is not an export input and is not in
   `provenance.inputs`. The task then requires the staged pointer's
   `provenance.source_commit` to equal `S`, its
   `provenance.source_tree_clean` to be true, and the clean-tree
   command to print nothing still (an `egr-build` that rewrites the
   tracked `deploy/terraform/tables.json` stops the run here). Last,
   it writes the staged record `dist/app/data-vN.publication.json`
   — the record state (b) recognizes and steps 9 and 10 complete —
   with `data_tag`, `tag_commit` (`S`), `pointer_sha256` (the
   SHA-256 of the pointer file), `files` (the pointer's `files`),
   `pytest_full_data` (the final summary line of that pytest run),
   and `size_report` (the export run's `size:` lines of
   [§4.1](#41-export-task-and-validation), as an array of strings in
   printed order).
5. **Tag.** `git tag -a data-vN -m 'Data vintage data-vN' S`, skipped
   when the local tag already points to `S`; a local tag pointing
   elsewhere is refused, with `git tag -d data-vN` printed. Then
   `git push origin refs/tags/data-vN`, skipped when `T` equals `S`.
   The task then requires
   `git ls-remote origin 'refs/tags/data-vN^{}'` to print `S`. The
   tag exists before the release because `gh release create` would
   otherwise create a missing tag from the head of the default
   branch, `main`, not from `S`.
6. **Draft prerelease**, skipped when a draft exists:
   `gh release create data-vN --verify-tag --draft --prerelease --title 'Data vintage data-vN' --notes-file dist/app/data-vN/data-terms-<h12>.txt`,
   the terms file the pointer names — its text is the release body
   ([§4.4](#44-licensing-archival-distribution-and-release-attachments)).
7. **Upload.** For each file the pointer names: when the release has
   no asset of that name,
   `gh release upload data-vN dist/app/data-vN/<name>`; when it has
   one, the task downloads it
   (`gh release download data-vN --pattern <name> --dir <empty temporary directory>`)
   and compares SHA-256s, and on a mismatch runs
   `gh release delete-asset data-vN <name> --yes` and uploads again.
   It then deletes every asset whose name the pointer does not list.
   Deletions happen only while the release is a draft. The test hook
   `-Ppublish.failAfterUploads=<k>` (`--fail-after-uploads <k>`)
   makes the task exit non-zero after its `k`-th upload; a real
   publication never sets it.
8. **Read back.**
   `gh release download data-vN --dir <empty temporary directory>`:
   the downloaded names must equal the pointer's `files` keys
   exactly, and every SHA-256 must match. On a failure the release
   stays a draft, and the next run resumes at step 7.
9. **Publish.** `gh release edit data-vN --draft=false`. As soon as
   it succeeds, the task writes `published_at` — the release's
   `publishedAt`, read with
   `gh release view data-vN --json publishedAt` — into the staged
   record, so the record marks the vintage published before
   anything else can fail (state (e) relies on it). Then
   `gh release view data-vN --json isDraft,isPrerelease` must report
   `isDraft` false and `isPrerelease` true, and step 8 runs once more
   against the published release. A failure here stops the task
   before step 10, and no pointer naming such a release is ever
   committed: a rerun continues at step 10 through (d) when the
   read-back now matches, and otherwise refuses the release as (d)'s
   non-matching case — the owner then deletes it
   (`gh release delete data-vN --yes`, keeping the tag) and publishes
   the next tag number.
10. **Publication record.** The task completes
    `dist/app/data-vN.publication.json` with `tag_object` (the output
    of `git rev-parse refs/tags/data-vN`, the annotated tag object),
    `gh_version` and `git_version` (the first lines of `gh --version`
    and `git --version`), and, when step 9 did not write it,
    `published_at` (read as step 9 reads it), serialized as the
    canonical JSON of [§4.1](#41-export-task-and-validation) step 2.
    It then sets the release body to the terms text followed by a
    fenced `json` block holding the record
    (`gh release edit data-vN --notes-file <file>`;
    release notes stay editable under release immutability). The
    step is skipped when the body already carries the record, and
    refused, naming the file, when the staged record of step 4 is
    missing. This file is the publication record the release
    checklist cites ([§7.7](#77-site-validation-and-release-checklist)).
    The task ends by printing the step-11 commands; it never commits.
11. **Pointer commit.** The owner commits only
    `subprojects/webapp/data/pointer.json`, as a child of `S`, with
    the message `Data vintage data-vN`
    (`git add subprojects/webapp/data/pointer.json && git commit -m 'Data vintage data-vN' -- subprojects/webapp/data/pointer.json`
    with `HEAD` still at `S`; the add is required for the first
    vintage, whose pointer is untracked, and is harmless later), and
    checks that `git rev-parse HEAD^` prints `S` and that
    `git diff --name-only HEAD^ HEAD` prints only that path. The
    commit then takes the normal pull-request path, where CI's
    fetch-and-verify validates the published state independently
    ([§6.3](#63-ci-workflows)), and the vintage becomes current when
    that pull request is merged into `main`, by a merge commit (§6.3,
    Required checks).

*Closes:* DD-7 (by design-against; the rule itself stays
ADR-0014's). *Verification (planned):* the read-back of steps 8 and
9; CI's independent fetch-and-verify of the committed pointer; and
publication drills, scheduled by the implementation plan's
publication-tooling task. The drills reach no GitHub repository:
they run in a drill clone, a clone whose `origin` is a local bare
repository cloned from this one, with a stub `gh` first on `PATH`
that models releases, drafts, tags, and immutability — it keeps its
releases in a local directory, answers the `gh` commands of this
section, keeps a draft modifiable, refuses every asset change to a
published release and every new release on the tag name of a
deleted one, accepts `--verify-tag` only for a tag that
`git ls-remote origin` lists, and prints `true` for step 1's
immutability check — against a synthetic raw-input fixture, never
the research data, so no drill asset is ever public and no research
data is uploaded. The first real publication is the end-to-end run:
a failure there resumes by the same command while its release is a
draft, and a published release that fails its checks is replaced
under the next tag number (steps 3 and 9). The fixture
is the four raw inputs of rule `inputs-present`
([§4.1](#41-export-task-and-validation) step 1), built in the drill
clone's gitignored `data/raw/` from the synthetic frames of the
[§7.3](#73-pipeline-and-export-tests) fixture lanes, in the column
layouts `egr-build` reads. The drill copy of
`data/REDISTRIBUTION.md` — and, while the §4.4 wording has not
landed, drill edits of `README.md` and `LICENSE-docs` that name it —
exist only in the drill clone and its bare origin, and the drill copy
carries a comment line stating that it is a drill fixture. The
drills set the drill override, `publishVintage`'s option
`-Ppublish.drillRepository=<owner>/<name>`, passed as
`--drill-repository <owner>/<name>` beside the test hook
`-Ppublish.failAfterUploads` of step 7, which a real publication
never sets. With it, every `gh` call but the `gh repo view` check
below targets that repository — each `gh release` command with
`--repo <owner>/<name>`, and step 1's immutability check as
`gh api repos/<owner>/<name>/immutable-releases --jq .enabled` in
place of the literal `HarvardRC/eps-ground-rupture` path — and step
4's pytest run, whose full-data pins hold only for the research
data, is replaced by recording `pytest_full_data` as
`drill: not run`. Step 1 refuses the option while
`gh repo view --json nameWithOwner --jq .nameWithOwner`, which reads
the working tree's own repository, prints
`HarvardRC/eps-ground-rupture`. The drills: a fresh run publishes,
its tag peeling to `S` and its asset set exact; a run stopped by
`-Ppublish.failAfterUploads=1` resumes with `export_date` unchanged;
a planted extra draft asset is deleted; a tag at another commit is
refused, with the cleanup commands for an unfinished attempt and
without them for a withdrawn vintage; a dirty tree and the tag
`data-v0-test` are refused; a matching published release exits 0; a
non-matching published release is refused; and a rerun after the
published release's deletion is refused under state (e).

References:

- [HLDD §5.4 — Pinned, versioned artifacts
  (ADR-0014)](hldd.md#54-pinned-versioned-artifacts-adr-0014).
- [Data refresh and deployment](hldd.md#data-refresh-and-deployment).
- [ADR-0014](../adr/0014-committed-content-hashed-artifacts.md)
  (amendment of 2026-10-29).
- [`notes/Roadmap.md` — Decisions made](../../notes/Roadmap.md#decisions-made).
- `gh` 2.96.0 (`gh release create --help`: `--verify-tag`, the
  default-branch tag creation it prevents, and its "Immutable
  Releases" section — drafts stay modifiable; `gh release verify`);
  GitHub documentation, "Immutable releases" (published assets and
  tags locked, release notes editable, a deleted release's tag name
  never reusable, the release attestation).

### 4.3 Retention, rollback, recovery, and withdrawal

**Retention.** A published `data-vN` tag is never moved or deleted,
and no other release ever reuses its name; release immutability
([§4.2](#42-publication-of-a-data-vintage)) keeps the release's
assets unchanged for as long as it exists. The data release is never
deleted while any supported repository state — the current pointer
or any rollback target — references the vintage, except by withdrawal
(below). A vintage counts as retained when its data release is
published and
`gh release download data-vN --dir <empty temporary directory>`
yields exactly the files its pointer names, each with the pointer's
SHA-256 — the retention check that rollback (below) and the release
checklist's rollback-readiness item
([§7.7](#77-site-validation-and-release-checklist)) run. The owner
additionally keeps each published vintage's local
`dist/app/data-vN/` directory, read back byte for byte at
publication ([§4.2](#42-publication-of-a-data-vintage) step 8),
together with its publication record
`dist/app/data-vN.publication.json`, as the retained copy — the
source of the software-release attachments of
[§4.4](#44-licensing-archival-distribution-and-release-attachments).
No Gradle `clean` task deletes `dist/app/` (of `dist/`, the python
module's `clean` removes only `dist/python/` and `dist/csv/`), and
the `retained-copy` rule of [§4.1](#41-export-task-and-validation)
keeps an export from overwriting it.

**Rollback** is a revert of the pointer-manifest commit
(`git revert <pointer commit>`), merged like any other change, and
taken only when the conditions of
[HLDD §5.4 — Pinned, versioned artifacts
(ADR-0014)](hldd.md#54-pinned-versioned-artifacts-adr-0014) hold: the
retention check finds the target vintage retained, and the current
application supports its `schema_version`
([§5.2](#52-artifact-loading-and-decoding)). When the release being
rolled back changed both application code and data, the rollback
restores a compatible pair — the pointer commit and the application
are reverted together, to versions whose supported `schema_version`
matches — and the rollback rehearsal records which pair it checked.
The release checklist's rollback-readiness item
([§7.7](#77-site-validation-and-release-checklist), item 12) names
each release's rollback target, which the owner approves: an earlier
software tag, whose application and pointer manifest a rollback
restores together and whose pointer's vintage passes the retention
check above — not necessarily the immediately preceding tag, and
never one whose vintage is withdrawn or also affected by a
withdrawal's reason (for a source's terms, each vintage carrying
files derived from that source). When no tag qualifies, the item
records the owner-approved absence `no rollback target: <reason>`
instead: `<reason>` is `first release` while no earlier software tag
carries a pointer manifest, and otherwise names the withdrawal or
loss and the data tags it excluded. The normal validation and
deployment checks apply to the rollback build like any other; it
never bypasses checksum verification or substitutes another vintage
([Rollback](hldd.md#rollback)).

**Recovery** — when a published vintage's release assets become
unavailable, so that CI's fetch-and-verify fails on them
([§6.3](#63-ci-workflows)). Release immutability leaves one cause,
the deletion of the whole release, and no repair in place: a
published release's assets cannot be replaced, and a deleted
release's tag name can never carry another release. Recovery is
therefore steps 3–5 of the withdrawal procedure below, with the loss
as the reason — a replacement vintage or a rollback, the notice in
that pointer commit, and the notice in the next release notes.

**Regeneration** rebuilds a vintage's files byte for byte from its
pointer and publishes nothing: it is the byte-identity check that
[§4.1](#41-export-task-and-validation) plans, and it restores a
vintage's files locally — a lost retained copy, or the files a
historical build needs — when no release supplies them. It runs at
the repository root with the project virtualenv active and
`<pointer commit>` the commit `Data vintage data-vN`:

```sh
tmp=$(mktemp -d)
git show <pointer commit>:subprojects/webapp/data/pointer.json > "$tmp/pointer.json"
git checkout --detach data-vN
cd subprojects/python
poetry sync
poetry run egr-export-app --reproduce "$tmp/pointer.json"
```

`--reproduce` takes the tag from the pointer and refuses, naming the
failing `provenance` member, unless `HEAD` equals `source_commit`;
`source_tree_clean` is true and the clean-tree command of
[§4.1](#41-export-task-and-validation) prints nothing; every `inputs`
file matches its recorded SHA-256 (when only the processed tables
differ and the raw files match, the owner runs `egr-build` and
retries); and the running environment equals `environment` member by
member. It then exports into `dist/app/data-vN.reproduced/` (deleted
and recreated first; never into the retained `dist/app/data-vN/`),
reusing the pointer's `export_version`, `export_date`, and
`provenance` verbatim, and validates like any export run: it runs
every rule of [§4.1](#41-export-task-and-validation) but
`retained-copy`, those of steps 3 and 5 included, and checks step
6's `pointer-exact` and `file-names` against the pointer it was
given — it writes no pointer — so every output file's SHA-256 is
compared with the pointer's, a `pointer-exact` failure naming every
file that differs; and it prints the validation report, the size
report, and the payload diagnostic like any run. When all match, the
directory holds the vintage's files exactly; a difference is a
reproducibility defect to investigate. `--allow-environment-drift`
waives the environment match and records the running environment
instead, so the comparison shows which files another environment
still reproduces. Either way the output is never uploaded: its
`export_version` names an existing vintage. Afterwards the owner
checks out the working branch and runs `poetry sync` again. Nothing
ever replaces the files behind an existing pointer.

**Withdrawal** — when a published vintage must be pulled, over a
licensing problem for instance. The owner:

1. deletes the whole data release — release immutability forbids
   deleting a single published asset — with
   `gh release delete data-vN --yes`, which removes its assets and
   keeps the git tag: never `--cleanup-tag`, so history is not
   rewritten
   ([ADR-0014](../adr/0014-committed-content-hashed-artifacts.md))
   and the kept tag holds the name out of the numbering of
   [§4.2](#42-publication-of-a-data-vintage) step 3;
2. *(owner decision, Proposed)* for every software release that
   attaches the withdrawn files
   ([§4.4](#44-licensing-archival-distribution-and-release-attachments)),
   first saves its release record and its plotting CSVs — its assets
   that the withdrawn pointer does not name — into the gitignored
   directory `dist/withdrawn/<software tag>/`:
   `mkdir -p dist/withdrawn/<software tag>`, then
   `gh release view <software tag> --json body,assets > dist/withdrawn/<software tag>/release.json`
   and
   `gh release download <software tag> --pattern '*.csv' --dir dist/withdrawn/<software tag>`;
   then deletes it with `gh release delete <software tag> --yes`,
   since release immutability forbids deleting its withdrawn assets
   alone; the software tag, which carries no data, stays and is
   never reused;
3. publishes a replacement vintage by §4.2 — the next tag number,
   `data-v(N+1)` when `data-vN` is the newest — or reverts to a
   retained clean vintage under the rollback rules above, and writes
   the withdrawal notice into the body of that pointer commit (a second
   `-m` of the §4.2 step-11 commit, or the revert's message): the
   reason, the withdrawn `data-vN`, and the range of commits whose
   pointer names `data-vN` — the site builds and parity runs that can
   no longer be reproduced from retained assets;
4. merges that commit, whose deploy replaces the site-published
   copies (the Pages artifact carries only the current build).
   Staging is a sync
   ([§6.1](#61-build-outputs-asset-paths-and-page-scaffold)), so the
   next `scenarioAssets` run on any working tree removes the
   withdrawn files, and `./gradlew :subprojects:mkdocs:clean` removes
   the built site trees and the fetch cache under
   `subprojects/mkdocs/build/vintage/`;
5. *(owner decision, Proposed)* when step 2 deleted a software
   release, publishes a replacement software release — the next patch
   version after the newest software tag, cut from `main` once step
   4's merge is in it (at once when steps 3 and 4 do not apply),
   under the release checklist of
   [§7.7](#77-site-validation-and-release-checklist) and the
   attachment procedure of §4.4 — whose notes carry, after its own
   release record, the withdrawal notice and the `body` of every
   `release.json` that step 2 saved, and whose plotting CSVs are
   those step 2 saved from the newest of the deleted releases —
   `gh release upload <software tag> dist/withdrawn/<deleted tag>/<file>`
   per file, in place of the attachment block's two CSV commands —
   except every CSV that the withdrawal reason also affects (for a
   source's terms, each CSV derived from that source), which is left
   out and named in the notice. When step 2
   deleted no software release, the owner records the same notice in
   the release notes of the next software release.

Steps 3 and 4 apply only when the current pointer (the pointer
manifest on `main`) names `data-vN`. When it names another vintage,
no pointer commit follows — the site built from `main` carries none
of the withdrawn files — and the notice of step 3 goes in the
release notes of step 5 alone.

Steps 2 and 5 are an owner decision (Proposed): deleting a published
software release also removes its release record
([§7.7](#77-site-validation-and-release-checklist)) and the release
page that gives the plotting CSVs their citable home
([`notes/Roadmap.md` — Decisions made](../../notes/Roadmap.md#decisions-made)),
and the replacement release of step 5 carries both again, beside the
exports that replace the withdrawn ones — re-attaching only the saved
plotting CSVs that the withdrawal reason does not affect, so no CSV
the reason covers is published again.

Withdrawal thereby reaches both the release assets and the site
copies, per the ADR-0014 amendment. The deleted data release cannot
carry the notice, so the notice lives in the pointer commit, when
step 3 applies, and in the release notes.

*Verification (planned):* the rollback rehearsal of the
[implementation plan](ip.md#2-task-graph), under the normal checks;
the retention check of each release's rollback target before every
release, or the owner-approved absence of one
([§7.7](#77-site-validation-and-release-checklist), item 12); and, for
regeneration, the `--reproduce` comparison of every output SHA-256
with the pointer.

References:

- [HLDD §5.4 — Pinned, versioned artifacts
  (ADR-0014)](hldd.md#54-pinned-versioned-artifacts-adr-0014)
  (Retention, rollback, and withdrawal).
- [Rollback](hldd.md#rollback).
- [HLDD §10 — Risks and open
  dependencies](hldd.md#10-risks-and-open-dependencies).
- [ADR-0014](../adr/0014-committed-content-hashed-artifacts.md)
  (amendment of 2026-10-29).
- GitHub documentation, "Immutable releases" (published assets and
  tags locked; a deleted release's tag name never reusable).

### 4.4 Licensing, archival distribution, and release attachments

**Vintage terms.** Every vintage carries its license and attribution
text twice: as the body of its data release
([§4.2](#42-publication-of-a-data-vintage) step 6, followed by the
publication record of step 10), and as the pinned asset
`data-terms-<h12>.txt` of the
[§4.1](#41-export-task-and-validation) naming patterns, listed in the
pointer manifest. The terms file is a byte-for-byte copy of the
committed `data/REDISTRIBUTION.md` — the per-source terms and
attributions for the DEM, FDHI, SURE, and Kern County sources, and
the OA-1 record line of §4.2 step 1
([NFR-6 — Licensing](prd.md#nfr-6-licensing)) — so the published
terms are exactly the recorded ones, and its `.txt` name keeps MkDocs
from treating the staged copy as a page (§4.1 step 6). The file and
the wording of the Licensing section of `README.md` and of
`LICENSE-docs` that distinguishes application code, raw inputs, and
distributed derived exports, naming `data/REDISTRIBUTION.md` for
the exports' terms, come in the two phases of
[ADR-0017 — An unadvertised prototype deployment precedes the public release](../adr/0017-unadvertised-prototype-before-public-release.md)
(Proposed). In Phase 1 the owner commits the file stating the
assumed terms — code Apache-2.0, prose CC BY 4.0, derived data
exports CC BY 4.0 with per-source attribution — with the assumed
record, and the `README.md` and `LICENSE-docs` lines that name it; in
Phase 2 the final texts that the owner writes with the research
group (owner action OA-13 of the
[implementation plan](ip.md#4-owner-and-research-group-actions))
replace them, and the confirmed record replaces the assumed one.
§4.2 step 1 refuses publication until both texts are in place. This
document cites that gate, never grants it. A published vintage is
never modified (§4.2), so a vintage exported under the assumed
record serves only the unlisted prototype of
[§6.1](#61-build-outputs-asset-paths-and-page-scaffold): the release
that activates the scenario page, and every release after it, pins
a vintage whose terms file holds the confirmed record
([§7.7](#77-site-validation-and-release-checklist), item 17) — a new
vintage when the pinned one holds the assumed record. A
`data-v0-test` development export, which is never published, needs
no such file; without it, the export writes an empty terms file
([§4.1](#41-export-task-and-validation) step 4).

**Software-release attachments** ([DD-8](#1-ddd-decision-register),
Proposed): the release checklist carries this verbatim command
block, run at the repository root on the release commit. It attaches
the files the committed pointer manifest names, its file list
generated from that manifest when it runs, and the dashboards'
plotting CSVs — the files that the Gradle task `egrBuildAndExport`
(`egrBuild`, then `csvExportAll`) writes to `dist/csv/`, the CSV
exports the Tableau Public workbooks read:

```sh
files=$(python3 -c '
import json
p = json.load(open("subprojects/webapp/data/pointer.json"))
print(" ".join("dist/app/%s/%s" % (p["data_tag"], f) for f in sorted(p["files"])))
')
gh release upload <software tag> $files
rm -rf dist/csv && ./gradlew :subprojects:python:egrBuildAndExport
gh release upload <software tag> dist/csv/*.csv
```

The owner runs it when cutting a software release, attaching the
current exports from the retained copy of
[§4.3](#43-retention-rollback-recovery-and-withdrawal) beside the
plotting CSVs
([`notes/Roadmap.md` — Decisions made](../../notes/Roadmap.md#decisions-made));
on a machine without that copy,
`gh release download <data_tag> --dir dist/app/<data_tag>` restores
it first. The checklist's attachment check then re-downloads every
attached file the pointer names and compares each SHA-256 with the
pointer manifest. The software release is created as a draft on its
pushed annotated tag
(`gh release create <software tag> --verify-tag --draft`), receives
every attachment and the attachment check while it is a draft, and
only then is published
(`gh release edit <software tag> --draft=false`) — the order release
immutability ([§4.2](#42-publication-of-a-data-vintage)) requires,
since a published release takes no new asset. Automating the step
later is an ordinary CI change under [§6.3](#63-ci-workflows).

**Archival distribution.** The Zenodo GitHub integration archives
only the tag's source archive — release assets are not picked up —
so until the dataset record the owner decides with the first release
exists, published vintages have no archival copy. The deposit
procedure, once owner action OA-6 decides it, therefore checks what
each deposit actually preserved: it downloads every deposited file
and compares its SHA-256 with the pointer manifest, and the owner
records that comparison with the deposit. The deposit decision
itself is the owner's
([implementation plan, §4](ip.md#4-owner-and-research-group-actions)).

*Closes:* DD-8. *Verification (planned):* the release checklist of
[§7.7](#77-site-validation-and-release-checklist) compares the
attachments byte for byte with the pointer manifest (item 11); each
deposit's archival comparison (above) is recorded with that deposit,
outside the release checklist.

References:

- [Licensing and archival distribution](hldd.md#licensing-and-archival-distribution).
- [`notes/Roadmap.md` — Decisions made](../../notes/Roadmap.md#decisions-made).
- [NFR-6 — Licensing](prd.md#nfr-6-licensing).
- `subprojects/python/build.gradle.kts` (the `csvExport` tasks,
  `csvExportAll`, and `egrBuildAndExport`, which write `dist/csv/`).

## 5. Application design

### 5.1 Modules and interfaces

The application is framework-free TypeScript under `src/`
([§2](#2-repository-structure-naming-and-toolchain)); the scenario
application is the product's only application surface — dashboards
are linked, never embedded, and the P2 morphology-page
family-grouping control is a page-local script outside this module
map ([HLDD §4.2 — Surface map (ADR-0010)](hldd.md#42-surface-map-adr-0010)).

Every file belongs to one of two environments, the split the test
lanes follow
([HLDD §9 — Testing and release architecture](hldd.md#9-testing-and-release-architecture),
Webapp tests — Node on CI). A **browser-and-Node** file references
no DOM global and no DOM type and imports only browser-and-Node
files; `tscCheck` type-checks these files a second time under
`tsconfig.node.json`, which declares no DOM library, so a DOM
identifier in one of them is a type error
([§2](#2-repository-structure-naming-and-toolchain)), and Node runs
them with no DOM emulator. A **browser-only** file may use the DOM,
and only the browser lane executes it
([§7.5](#75-browser-test-lane)). Modules and their interfaces:

| Module | Interface | Environment |
|---|---|---|
| `decode/` | `loadVintage(manifestUrl, expected: { exportVersion, schemaVersions }) → Promise<Vintage>`, a fetching wrapper around the in-memory core `decodeVintage(manifestBytes, readFile, expected) → Promise<Vintage>`; `loadFieldExport(url) → Promise<FieldRow[]>`; `loadRegression(url) → Promise<Regression>`; `parseReferences(bytes) → References` (parity harness only); `fields.ts` — the [DD-10](#1-ddd-decision-register) mapping tables, `mapRecord(raw, spec, path)`, the `ColumnName` and `BlockName` unions, and the trial-table and CSV column lists ([§5.2](#52-artifact-loading-and-decoding)). | browser and Node |
| `engine/` | `query(vintage, scenario, windows?: PerDipWindows) → Selection`, `storedBounds(lo, hi, scale) → [number, number]`, and the `PerDipWindows` type, which `convert/` imports together with `storedBounds` ([§5.5](#55-offset-to-slip-conversion-assist)) — pure and synchronous ([ADR-0015](../adr/0015-golden-scenario-parity.md)): no DOM, no clock, no randomness, no I/O ([§5.3](#53-query-engine)). | browser and Node |
| `stats/` | `validValues(vintage, selection, measurement) → ValidValues`; `summarize(values: ValidValues) → Stats \| null`, with `Stats.sd: number \| null` — the [FR-O2 — Summary statistics](prd.md#fr-o2-summary-statistics) set ([§5.4](#54-statistics)); `quantile.ts` — `quantileLinear(sorted, p) → number`; `histogram.ts` — `histogram(steps, classes, sorted, displayDecimals) → Histogram \| null`, the [DD-5](#1-ddd-decision-register) bin rule, and `histogramLog(steps: Int32Array, classes: Uint8Array, offerRatio: number) → HistogramLog \| null`, the width panel's logarithmic bins, null exactly when the logarithmic axis is not offered (valid = 0 included), its caller passing `logScaleOfferRatio()` of `config.ts` ([§5.13](#513-application-configuration)) as `offerRatio` — both of [§5.12](#512-charts), each result the camelCase form of its [§3.6](#36-reference-results) record (`histogram.<m>`; `histogram_log.dzw`, so `HistogramLog` is `{ firstEdge, bins, counts, belowCounts }`). | browser and Node |
| `convert/` | `convertWindows(offsetMax: number, dips: readonly number[], coefficients) → PerDipWindows` and `rangeFlag(window, bounds) → RangeFlag` ([§5.5](#55-offset-to-slip-conversion-assist)). | browser and Node |
| `state/` | the `Scenario` and `DisplayState` types, `defaultScenario(manifest)`, and pure reducers ([§5.6](#56-scenario-state-and-url-encoding)); `parse.ts` — grammar G and the free-entry validation of [§5.7](#57-scenario-controls), and `storedBoundsFromDecimal(min, max)` ([§5.3](#53-query-engine)); `scenario-json.ts` — `serializeScenario`, `parseScenario`, and `canonicalJson` ([DD-11](#1-ddd-decision-register), [§5.6](#56-scenario-state-and-url-encoding)). | browser and Node |
| `views/*.ts` | builders: `format.ts` — `displayRound(v, decimals)`, `formatCount(n)`; `svg.ts` — `SvgNode`, `serializeSvg`; `charts.ts` — `histogramSvg(spec, width)`, `ecdfSvg(spec, width)`, `ecdfSteps(sorted)`; `chart-text.ts` — `chartLabel(state)`, `binTableSpec(binsByGroup, groups, edges)`, `fieldTableSpec(rows, order)`, `segmentTitle`; `summary.ts` — `summaryText(state, counts)`, `settingsText(state)`, `populationText(state)`, `chartSummary(stats, measurement, cfg)`; `assist.ts` — `assistLines(input)`, the assist panel's lines ([§5.5](#55-offset-to-slip-conversion-assist)); `render-input.ts` — the `RenderInput` type ([§5.8](#58-view-layer)); `notices.ts` — `selectNotices(input, cfg)`; `stats-table.ts` — `statsRows(stats, measurement, cfg)`; `scenario-controls.ts` — `controlModel(manifest, state)`, `dipRangeEcho(entry, dips)`; `copy.ts` with `copy.json`; `offer.ts` (P2) ([§5.7](#57-scenario-controls), [§5.8](#58-view-layer), [§5.12](#512-charts)). | browser and Node |
| `views/dom/` | appliers: `svg.ts` — `toSvgElement`; `panels.ts`; `controls.ts`, with `commitField(id)` and `sync(scenario)`; `table.ts`; `notices.ts`; `glossary.ts` — `linkGlossary`, the first-use glossary linker; `export.ts` (P2); `marks.ts` — `markAfterPaint(name, seq, check, live)`; and `render.ts` — `render`, the render pass ([§5.8](#58-view-layer), [§5.12](#512-charts)); beside them `wiring.ts`, which declares the `Wiring` and `Scheduler` types (Wiring, below). | browser only |
| `overlay/model.ts` | `overlayRows(rows, measurement, showAll)`, `overlayGroups(rows)`, `overlayNote(measurement)` ([§5.8](#58-view-layer)). | browser and Node |
| `overlay/field-overlay.ts` | the overlay marks over `decode/`'s `FieldRow[]` ([§5.8](#58-view-layer)). | browser only |
| `download/` (`package.ts`, `csv.ts`, `zip.ts`, `file-name.ts`) | `buildPackage(input, stamps, generatedAt: Date)`, the CSV writer, `zip(members, modified: Date)`, and the [DD-6](#1-ddd-decision-register) file name ([§5.9](#59-downloads)). | browser and Node |
| `download/deliver.ts` | reads the clock once and the last committed `RenderInput` through the scheduler's `lastRenderInput()`, and delivers the archive ([§5.9](#59-downloads)). | browser only |
| `a11y/` | `announce.ts` — `announce(region, text, live?)` over the live regions — and `focus.ts` ([§5.11](#511-accessibility-supported-environments-and-navigation-lifecycle)). | browser only |
| `config.ts` | the PDD-decided settings, read from `config.json` ([§5.13](#513-application-configuration)). | browser and Node |
| `main.ts` | mount and the navigation lifecycle — `onPageReady`, `start(a, tag)`, and the vintage cache's `vintageFor(tag)` ([§5.11](#511-accessibility-supported-environments-and-navigation-lifecycle)) — the guarded startup with its capability probe `missingCapabilities()` ([§5.10](#510-failure-states)), and the per-mount scheduler ([§5.3](#53-query-engine)). | browser only |

**Event flow** is one direction. A control change makes at most one
reducer call in `state/` (the event map of
[§5.7](#57-scenario-controls)), which yields the next accepted
`Scenario` or, for a display-only control, the next `DisplayState`
([§5.6](#56-scenario-state-and-url-encoding)). The per-mount
scheduler of [§5.3](#53-query-engine) then computes, for the latest
accepted Scenario, `convertWindows` and each selected dip's
`rangeFlag` (offset mode only), `query`, per measurement
`validValues`, `summarize`, and `histogram`, and for `dzw`
`histogramLog`; `render` (`views/dom/render.ts`) and `announce`
(`a11y/`) consume the result as the `RenderInput` of
[§5.8](#58-view-layer), whose members `windows`, `flags`,
`regression`, and `field` carry what the views read beyond the
engine's output. No browser-and-Node module touches the DOM, so
everything the parity harness of
[§7.2](#72-calculation-parity-tests) replays — `decode/`,
`convert/`, `engine/`, `stats/`, `state/parse.ts`,
`state/scenario-json.ts`, `views/format.ts`, and `config.ts` — runs
identically under Node.

**Builders and appliers.** Every browser-only module that constructs
DOM nodes — `views/dom/` and `overlay/field-overlay.ts` — is an
applier: it constructs them only from a builder's output — an
`SvgNode` tree, a table spec, a notice plan, a control model — and
commits them into the skeleton and slots of
[§5.8](#58-view-layer); it computes nothing a builder could. A
builder's output is a plain value: `serializeSvg` turns an `SvgNode`
tree into a string (the determinism tests of
[§7.4](#74-application-tests)) and `toSvgElement` turns it into DOM
nodes (the page); [§5.12](#512-charts) fixes the `SvgNode` type and
both materializations. The value types and their two materializers
involve no diffing, no component model, and no retained state, so
the no-framework rule of [ADR-0011](../adr/0011-webapp-toolchain.md)
holds.

**Mount.** `main.ts` implements the navigation-lifecycle algorithm of
[§5.11](#511-accessibility-supported-environments-and-navigation-lifecycle);
there is no separate evaluation-time scan — every mount starts from
that algorithm's one page-ready handler. The application mounts only
into `#gre-root`, and it finds the `#gre-app` script element with
`document.getElementById('gre-app')` at every mount, reading its
`data-*` attributes then and never at module evaluation
([§6.1](#61-build-outputs-asset-paths-and-page-scaffold)).

**Wiring.** No module imports `main.ts`, the entry whose evaluation
runs the lifecycle. `start(a, tag)` hands every other browser-only
module that adds listeners — the appliers, `download/deliver.ts` —
one `Wiring` record `{ signal, scheduler, status }`, declared with
the `Scheduler` type in `src/views/dom/wiring.ts`: `signal` is the
mount's `a.ac.signal`, given as the `signal` option of every
`addEventListener` call the module makes
([§5.10](#510-failure-states)); `scheduler` is the per-mount
scheduler, reached only through the five operations of its
`Scheduler` type — `current()`, `update(next)`,
`prefetchRegression()`, `rerenderChart(measurement)`, and
`lastRenderInput()` ([§5.3](#53-query-engine), Scheduling); and
`status` is the `role="status"` live region, the `region` of the
module's own `announce` calls — a rejected entry, a committed
read-off
([§5.11](#511-accessibility-supported-environments-and-navigation-lifecycle)).
The module keeps no other reference to the mount.

*Verification (planned):* `tscCheck` under `tsconfig.node.json`
rejects a DOM identifier in any browser-and-Node file
([§2](#2-repository-structure-naming-and-toolchain)); the application
tests of [§7.4](#74-application-tests) import only browser-and-Node
files; the parity harness of [§7.2](#72-calculation-parity-tests)
drives the same `decode/`, `convert/`, `engine/`, and `stats/` code
headlessly; the browser lane's mount and navigation-lifecycle checks
([§7.5](#75-browser-test-lane)) exercise `main.ts`, and its render,
interaction, accessibility, and consistency checks are the only
coverage of `views/dom/`, `overlay/field-overlay.ts`, and
`download/deliver.ts`.

References:

- [HLDD §6 — Application architecture](hldd.md#6-application-architecture).
- [HLDD §4.2 — Surface map (ADR-0010)](hldd.md#42-surface-map-adr-0010).
- [HLDD §4.3 — Language, toolchain, and repository
  structure (ADR-0011)](hldd.md#43-language-toolchain-and-repository-structure-adr-0011).
- [HLDD §9 — Testing and release architecture](hldd.md#9-testing-and-release-architecture)
  (Webapp tests — Node on CI).
- [ADR-0011](../adr/0011-webapp-toolchain.md).

### 5.2 Artifact loading and decoding

All JSON and binary loading lives in `decode/`.
`loadVintage(manifestUrl, expected)` fetches the artifact manifest
and hands its bytes to the in-memory core
`decodeVintage(manifestBytes, readFile, expected)`, whose
`readFile(name)` fetches `new URL(name, manifestUrl)`; every fetch
is the global `fetch`. `main.ts` calls `loadVintage` through
`vintageFor(tag)` of
[§5.11](#511-accessibility-supported-environments-and-navigation-lifecycle),
which fixes `manifestUrl` (`data-manifest` resolved against the
`#gre-app` element's `src`) and `expected`
([§6.1](#61-build-outputs-asset-paths-and-page-scaffold)); the
parity harness of [§7.2](#72-calculation-parity-tests) calls
`decodeVintage` over the verified bytes and loads the regression
export with `loadRegression` behind its `file:` `fetch` shim, and
the application tests of [§7.4](#74-application-tests) call
`decodeVintage` with in-memory files. Each step gates the next; a
failure rejects the load (`decodeVintage`, and `loadVintage` around
it) with the `LoadError` of [§5.10](#510-failure-states) — a
`SchemaError` of `mapRecord` counting as kind `'read'` — and routes
to that section's failure states, never to empty or stale results:

1. **Manifest.** Parse the bytes as JSON and, before reading any
   other member ([§3](#3-data-formats)), require `schema_version` to
   be in `expected.schemaVersions`, the application's supported
   schema versions (exactly `[1]` in this release) — kind
   `'schema-version'` otherwise. Then map the object through
   `MANIFEST_FIELDS`, so every required field of
   [§3.2](#32-artifact-manifest) is present with its JSON type
   (`mapRecord` throws `SchemaError` otherwise), and validate: every
   column whose `encoding` is `scaled` or `dict` has `decimals` 3 or
   4; every column's `null_sentinel` is its dtype's maximum (65,535
   for `uint16`, 255 for `uint8`, [§3.2](#32-artifact-manifest));
   and `export_version` equals `expected.exportVersion`, the page's
   `data-data-version` stamp
   ([§6.2](#62-software-and-data-version-stamps)) — a mismatch is
   kind `'data-version'`, carrying `expected` and `loaded`.
2. **Artifact bytes.** Record `performance.mark('egr:decode-start')`,
   then obtain the file that `files.scenario_artifact` names through
   `readFile`. The transport contract of
   [§6.1](#61-build-outputs-asset-paths-and-page-scaffold) delivers
   the compressed bytes; the loader checks the gzip magic (`1f 8b`)
   and decompresses explicitly with `DecompressionStream('gzip')` —
   if the magic is absent (a host that transparently decoded, which
   the validated hosting does not do), the bytes are used as-is, so
   double decompression cannot occur.
3. **Structural validation before any offset is read.** The 16-byte
   header's magic, schema version, and counts must equal the
   manifest's; the manifest's block offsets and lengths must satisfy
   the [§3.1](#31-scenario-artifact-binary-layout) alignment rule —
   offsets strictly ascending with
   `offset_i = align4(offset_{i−1} + length_{i−1})` from 16, the
   decompressed length equal to `align4(last offset + last length)`;
   and each block's `length` must equal its element count
   ([§3.2](#32-artifact-manifest)) times its dtype's byte width.
4. **Views.** Typed-array views (`Uint8Array`, `Uint16Array`,
   `Int32Array`) are constructed over the one decompressed buffer at
   the declared offsets — alignment is guaranteed by the 4-byte
   block padding — and wrapped in the `Vintage` together with the
   decoded dictionaries and `manifest`, the mapped manifest record
   that `defaultScenario`, `serializeScenario`, `parseScenario`, and
   `controlModel` take; then `performance.mark('egr:decode-end')` is
   recorded. Nothing is copied, and decoding is O(1) apart from the
   gunzip. The page computes no SHA-256: file identity is established
   by CI's fetch-and-verify of the pinned files
   ([§3.3](#33-pointer-manifest)).

**Restoring values.** The views hold stored integers. A consumer
restores a stored value only by the
[§3.1](#31-scenario-artifact-binary-layout) rule: for a scaled
column, `x = (stored + offset_steps) / D`, with `offset_steps` from
the manifest's `columns` and `D` the integer literal `1000` when the
column's `decimals` is 3 and `10000` when it is 4; for scarp dip,
whose `decimals` is 3, `x = dictionary[index] / 1000`. Each is one
IEEE 754 division of exact integers and reproduces the pipeline
view's float64 value bit for bit; `offset + stored · scale`,
`10 ** decimals`, and `Math.pow` are never used.
[§5.4](#54-statistics) applies the rule.

**Lazy exports.** The regression export and the field export load
only when needed — the regression export for offset mode, the field
export for the overlay — at the requests the scheduler of
[§5.3](#53-query-engine) makes. Each is the file its manifest
`files` key (`regression_export`, `field_export`) names, resolved
against `manifestUrl`: `loadRegression(url)` and
`loadFieldExport(url)` decompress it behind the step-2 gzip guard,
require `schema_version` 1, and map it through `REGRESSION_FIELDS`
or `FIELD_EXPORT_FIELDS`, rejecting with `LoadError` as the steps
above do, and the caller requires its `export_version` to equal the
vintage's (kind `'data-version'` otherwise). The load promises are the
`regression` and `field` members of the vintage cache entry of
[§5.11](#511-accessibility-supported-environments-and-navigation-lifecycle),
under that section's rules: never aborted by a mount's disposal, and
deleted when rejected, so the next request fetches again. The loaded
records reach the views only as the `regression` and `field` members
of the `RenderInput` of [§5.8](#58-view-layer), and a settled
field-export load re-renders the slots that read `field`
([§5.3](#53-query-engine) item 3). A failure is handled
by [§5.10](#510-failure-states): a failed regression export that an
accepted offset-mode Scenario awaits gives the unavailable state
naming the conversion coefficients; a failed field export gives a
fixed-here line in the overlay legend ([§5.8](#58-view-layer)) and
leaves the simulation results untouched. The reference results are
test inputs only: the page never fetches them,
`parseReferences(bytes)` maps the decompressed reference JSON
through `REFERENCE_FIELDS` only inside the parity harness, which
fetches, verifies, and gunzips the file first, and they are excluded
from the payload measurement of
[§7.6](#76-performance-and-compatibility-measurements).

**The DD-10 mapping (`src/decode/fields.ts`).** The single
snake-to-camel mapping point of [DD-10](#1-ddd-decision-register)
covers every structural key, nested members included, of every JSON
format the TypeScript reads: the artifact manifest
([§3.2](#32-artifact-manifest)), the pointer manifest
([§3.3](#33-pointer-manifest), read by the parity harness), the
field and regression exports ([§3.4](#34-field-data-export),
[§3.5](#35-regression-export)), the reference results
([§3.6](#36-reference-results)), and the canonical scenario object
([§5.6](#56-scenario-state-and-url-encoding)). Its tables are
`MANIFEST_FIELDS`, `POINTER_FIELDS`, `FIELD_EXPORT_FIELDS`,
`REGRESSION_FIELDS`, `REFERENCE_FIELDS`, and
`SCENARIO_INPUT_FIELDS`; in each, the camelCase name is
`snakeToCamel` of the snake_case name. One function,
`mapRecord(raw, spec, path)`, renames keys, throws
`SchemaError(path, key)` on a missing required key or a wrong JSON
type, and drops unknown keys (the unlisted-members rule of
[§3](#3-data-formats)). Keys that are data values rather than field
names stay verbatim: the maps keyed by column, block, or measurement
name — `blocks`, `columns`, `trial_columns`, `display_decimals`,
every `per_measurement`, `statistics`, `percentiles`, `histogram`,
`histogram_log`, `display`, and the `stages` of each synthetic
ensemble — typed by the string-literal unions `ColumnName` (the 13
DD-10 names) and `BlockName`; the class-keyed
`scarp_class_palette`; the filename-keyed `checksums` and pointer
`files`; and the dip-keyed `windows` and `expected.stored_bounds` of
the boundary and synthetic cases. Enumerated values are never
renamed; `provenance` maps as one opaque object; and every
[§3.6](#36-reference-results) `inputs` object stays verbatim for
`parseScenario` to map strictly
([§5.6](#56-scenario-state-and-url-encoding)). The module also holds
`TRIAL_TABLE_COLUMNS` — the
[§3.1](#31-scenario-artifact-binary-layout) trial-table column
order, fixed by schema version 1 and never read from
`trial_columns` — and the [§5.9](#59-downloads) CSV headers,
`RECORDS_CSV_COLUMNS` and `STATISTICS_CSV_COLUMNS`.

*Verification (planned):* `decode.test.ts`
([§7.4](#74-application-tests)) feeds `decodeVintage` malformed,
truncated, wrong-version, mis-tiled, and wrong-sentinel fixtures,
each of which must reject with its `LoadError` kind
([§5.10](#510-failure-states)) and never yield a partial decode;
`fields.test.ts` checks that every table is total and injective over
the closed field lists of
[§3.2](#32-artifact-manifest)–[§3.6](#36-reference-results) and the
canonical scenario object, and that decoding each format's fixture
leaves no snake_case key outside the data-keyed maps and the
verbatim `provenance` and `inputs` objects; the parity harness
decodes the pinned vintage through the real `decode/` and compares
selections record for record with the references
([§7.2](#72-calculation-parity-tests)); the export's
`bitwise-restore` rule ([§4.1](#41-export-task-and-validation))
checks the restore rule against every source value.

References:

- [HLDD §7.3 — Delivery and caching](hldd.md#73-delivery-and-caching).
- [HLDD §7.1 — Performance estimates and
  verification](hldd.md#71-performance-estimates-and-verification).
- [HLDD §8 — Site integration](hldd.md#8-site-integration) (Software
  and data versions).

### 5.3 Query engine

The engine is one pure, synchronous pass over the
[§3.1](#31-scenario-artifact-binary-layout) arrays:
`query(vintage, scenario, windows?)` reads the decoded vintage and
an accepted `Scenario` ([§5.6](#56-scenario-state-and-url-encoding))
and returns a `Selection`. `windows` is given exactly when the
Scenario's window is in offset mode, and it must hold an entry for
every dip the query masks in, the empty-result diagnostic below
included. Production code therefore converts every modeled dip —
`convertWindows(Number(offsetMax), modeledDips, coefficients)` with
`modeledDips` the manifest's `trial_columns.fault_dip`
([§5.5](#55-offset-to-slip-conversion-assist)) — and the parity
harness ([§7.2](#72-calculation-parity-tests)) turns a reference
case's dip-keyed `windows` map ([§3.6](#36-reference-results)) into
`PerDipWindows` without altering a value: one `{ faultDip, lo, hi }`
per key, `faultDip` the key's integer, ascending. Called in offset
mode without `windows`, in slip mode with it, or with a masked-in
dip that has no entry, `query` throws.

**Trial mask.** The Scenario's `faultDip`, `sediment`, `depth`, and
`density` sets become sets of trial-table codes; one pass over the
`counts.trials` rows of the trial table (3,434 in the shipped
vintage, [§3.1](#31-scenario-artifact-binary-layout)) marks each
trial in or out. `sediment` holds `(set, sediment_strength)` pairs
and matches as pairs: a trial is in only when its own pair is
selected, never on its label alone
([PDD §3.2 — Sediment strength and structure (FR-S2)](pdd.md#32-sediment-strength-and-structure-fr-s2)).
An empty set is a valid selection that masks every trial out
([§5.7](#57-scenario-controls)).

**Window resolution.** Slip comparisons happen in stored-integer
space — slip is stored in units of 1e-4 m with offset 0
([§3.1](#31-scenario-artifact-binary-layout)) — and every bound is
inclusive at both ends
([PDD §3.4 — Displacement window (FR-S5)](pdd.md#34-displacement-window-fr-s5)):

- **Inactive window** (the [D-22](pdd.md#1-decision-register)
  default, Default displacement-window state): no bound applies.
- **Slip mode.** The Scenario's canonical decimal strings `min` and
  `max`, already the effective endpoints
  ([§5.6](#56-scenario-state-and-url-encoding)), convert exactly,
  with integer (`BigInt`) arithmetic on the digit string and never
  through a float: `lo_s = ⌈min · 10^4⌉` and `hi_s = ⌊max · 10^4⌋`,
  computed by `storedBoundsFromDecimal(min, max)` in
  `src/state/parse.ts` (Python twin `stored_bounds_from_decimal`).
  An entry finer than the 1e-4 m grid therefore rounds inward
  (`"0.00005"` gives `lo_s` 1, `"5.01349"` gives `hi_s` 50,134), and
  the recorded maximum `"5.0135"` gives 50,135, which captures the
  final recorded states as PDD §3.4 requires.
- **Offset mode.** Each dip's converted window `[lo, hi]` (float64
  metres, [§5.5](#55-offset-to-slip-conversion-assist)) becomes
  `storedBounds(lo, hi, scale)` =
  `[⌈lo / scale − 1e-9⌉, ⌊hi / scale + 1e-9⌋]`, with `scale` the
  manifest's `columns.slip.scale` (1e-4) and a −0 result returned
  as 0; the reference generator's twin is `_stored_bounds`
  ([§3.6](#36-reference-results)). The guard of 1e-9 stored units
  (1e-13 m) moves a bound only when the scaled endpoint lies within
  1e-9 of a grid point, and then onto that point, so an endpoint
  whose exact value is a recorded slip stays inclusive although its
  float64 result misses the grid by rounding. Where a bound can
  matter (scaled values up to 50,135), the three IEEE 754 roundings
  between the entry and the scaled endpoint — the subtraction and
  division of §5.5 and the division by `scale` — err by a few ulps,
  under 2e-11 stored units, fifty times inside the guard. Both
  implementations evaluate the same operations on the same inputs,
  so their bounds agree exactly.
- A window with `hi_s < lo_s` is valid and empty: it selects
  nothing.

**Scan.** For each masked-in trial `t`, the engine binary-searches
the trial's ascending slip segment `[t·101, (t+1)·101)` for its
stored window: `a` is the first index whose stored slip is at least
`lo_s`, and `b` the first whose stored slip exceeds `hi_s` (each
`(t+1)·101` when no index qualifies). In offset mode the bounds are
those of the trial's own `fault_dip`, so the result is the union of
the per-dip matches
([PDD §3.6 — Multi-dip conversion rule (D-3, Proposed)](pdd.md#36-multi-dip-conversion-rule-d-3-proposed)).
Population rule
([DR-3 — One-state-per-trial
population](prd.md#dr-3-one-state-per-trial-population)): one-state
selects index `b − 1` — the highest slip within the window — when
`b > a`, and nothing otherwise; with no active window it selects the
trial's final recorded state, index `t·101 + 100`, never an
intersection with an implicit window — the trap that
[GS-7](pdd.md#102-golden-scenarios) (One state per simulation
trial, no active slip window) pins, because the final recorded
states sit slightly above 5 m (PDD §3.4). The all-stages population
selects every index in `[a, b)`, or the whole segment when no window
is active. A trial with no stage inside its window contributes
nothing.

**Class filter and the two-count model.** The scarp-type filter is
inactive exactly when all six classes of the manifest's
`scarp_classes` ([§3.2](#32-artifact-manifest)) are selected, the
default
([PDD §3.7 — Population, scarp filter, family view,
reset](pdd.md#37-population-scarp-filter-family-view-reset));
otherwise a record that the population rule selected is kept only
when its class code is in the selected class set. Unclassified
records (code 255 — exactly the slip-0 initial states,
[§3.1](#31-scenario-artifact-binary-layout)) are therefore kept only
while the filter is inactive, and an empty class selection keeps
nothing. Population selection precedes the filter: the one-state
rule picks a trial's state from the window alone and then tests its
class, never searching back for an earlier stage
([HLDD §6 — Application architecture](hldd.md#6-application-architecture),
Query engine). The counts are `matching_records`, the records kept
by every step; `unclassified`, those with code 255 — the X of
[PDD §4.3 — Unclassified records (D-12, Proposed)](pdd.md#43-unclassified-records-d-12-proposed);
and per measurement `valid`, the matching records whose value is not
the null sentinel, and `excluded_null`
(`matching_records − valid`). An unclassified record never holds a
valid measurement — the export's
`unclassified-has-no-valid-measurement` rule
([§4.1](#41-export-task-and-validation)) — so class-colored
displays lose nothing; [§5.4](#54-statistics) treats a violation as
an internal failure.

**Selection.** `query` returns a `Selection`: the matching records'
indices in artifact order (`indices`, a `Uint32Array`, ascending —
trial order, then stage), `matchingRecords`, `unclassified`,
`perMeasurement` with each measurement's `valid` and
`excludedNull`, and `diagnosedConditions`, null unless
`matchingRecords` is 0 — the [§3.6](#36-reference-results)
`selection`, `counts`, and `diagnosed_conditions` quantities under
their [DD-10](#1-ddd-decision-register) camelCase names.

**Empty-result diagnostic.** When `matchingRecords` is 0, the engine
relaxes, one at a time, each condition group whose Scenario value
differs from its `defaultScenario` value: it re-runs the match with
that group alone reset to its default. The groups, in this order and
with their [§3.6](#36-reference-results) `diagnosed_conditions` keys
— the [DD-11](#1-ddd-decision-register) key names, `window` standing
for `entry_mode`, `slip_window`, and `offset_max` together — are the
fault dips (`fault_dip`), the sediment pairs (`sediment`), depth
(`depth`), density (`density`), the displacement window with the
entry mode (`window`; its default is the inactive slip-mode window,
so that re-run takes no `windows`), and the scarp-type filter
(`scarp_class`); the population is a selection rule, not a
condition, and is never relaxed. The groups whose relaxation alone
yields matches are the diagnosed conditions, reported as their keys
in that order
([PDD §4.5 — Small, empty, and partial results (FR-O3, D-11 Proposed)](pdd.md#45-small-empty-and-partial-results-fr-o3-d-11-proposed));
combinations of conditions are not diagnosed (PDD §4.5). Reading
the PDD's "relaxing that condition alone" as resetting one group to
its default — the population never relaxed, an offset-mode window
relaxed to the inactive slip-mode window — is fixed here, and the
empty-state explainer names the conditions it finds
([§5.8](#58-view-layer)).

**Scheduling** (browser only, outside the pure core). Each mount's
`start(a, tag)` of
[§5.11](#511-accessibility-supported-environments-and-navigation-lifecycle)
creates one scheduler for that mount in `main.ts`. It holds the latest
accepted `Scenario` and `DisplayState`, a sequence number, the last
computed result with the sequence number it belongs to, the field
export's state (item 3), and at most one pending animation frame.
Other modules reach it only through the five operations of its
`Scheduler` type ([§5.1](#51-modules-and-interfaces), Wiring):

- `current()` returns the held `{ scenario, display }`;
- `update(next)` takes the next `{ scenario, display }`, makes
  item 3's requests for an accepted offset-mode Scenario and for
  `next.display.overlay` turning true, and returns the sequence
  number it stamped, or null when it stamped none. It is an accepted
  Scenario change (item 1) when
  `next.scenario !== current().scenario`, so Reset's default
  Scenario and its `familyView` off are one update; otherwise it is
  a display-only update, which adds no stamp: unless an accepted
  Scenario change is also pending, its frame runs no query, no
  `summarize`, and no announcement, and re-renders only the panels
  whose display state changed, a change of `overlay` or
  `familyView` counting for every panel, and the slots that item 3
  marks for re-rendering;
- `prefetchRegression()` is item 3's prefetch;
- `rerenderChart(measurement)` re-renders that panel's `.gre-chart`
  slot, the contents of its chart-data disclosure included, from
  the last committed `RenderInput` at the panel's current width —
  the `ResizeObserver` path of [§5.12](#512-charts) (Resizing); it
  requests a frame as item 1 does and runs no query and no
  announcement;
- `lastRenderInput()` returns the `RenderInput` of the last
  committed frame — the first render below counting as one — or null
  before the first commit; it is what `download/deliver.ts` reads
  ([§5.9](#59-downloads)).

The DOM applier `render` of `src/views/dom/render.ts` commits every
frame's render ([§5.8](#58-view-layer)). The first render of a
mount is the startup step of [§5.10](#510-failure-states), which
computes the result of the mount's initial Scenario (the default, in
the MVP) by the computation of item 2 as sequence number 0 and hands
it to the scheduler; the scheduler makes every later render:

1. Control events never compute. An accepted Scenario change
   ([§5.7](#57-scenario-controls)) increments the sequence number,
   stamps the new Scenario with it, and requests an animation frame
   unless one is pending; a display-only update requests a frame the
   same way without a new stamp.
2. The frame callback returns at once when the scheduler has stopped
   (item 5). If the latest stamp is newer than the last computed
   result's and its inputs are loaded (item 3), it computes that
   result — in offset mode `convertWindows` and each selected dip's
   `rangeFlag` against the manifest's `slip_window_bounds`
   ([§5.5](#55-offset-to-slip-conversion-assist)), then `query`, then
   per measurement `validValues`, `summarize`, and `histogram`, and
   for `dzw` `histogramLog` with `offerRatio` =
   `logScaleOfferRatio()` ([§5.13](#513-application-configuration))
   — so at most one query, statistics pass, and render run per frame,
   always for the latest accepted Scenario; a newly computed result
   whose `dzw` `histogramLog` is null also sets `logScale` to false
   ([§5.6](#56-scenario-state-and-url-encoding)).
   It then renders the `RenderInput` of [§5.8](#58-view-layer) — the
   last computed result with the `windows`, `flags`, and `regression`
   fixed when it was computed, and the `field` of the field-export
   state then held (item 3) — with the current display state, so the
   field export's arrival repeats no calculation. When the render
   commits a newly computed result, of sequence number s, the
   callback calls `markAfterPaint('egr:results-updated', s, …)` of
   `views/dom/marks.ts` (that mark and the `egr:change-accepted` mark
   that starts the interval are defined in
   [§7.6](#76-performance-and-compatibility-measurements)) and hands
   the update to `announce` — the settled update of §5.11. Both act
   in a later task — the mark in its `MessageChannel` message's task,
   the announcement in `announce`'s `setTimeout(…, 0)` write — and
   both take `live = () => isLatest(s)`, doing nothing in that task
   unless `isLatest(s)`, a test internal to the scheduler and not a
   `Scheduler` operation, finds s still the latest stamp and the
   scheduler not stopped (item 5). A result that a newer accepted
   Scenario supersedes before those tasks run is therefore never
   marked as painted and never announced (fixed here), and any later
   callback scheduled for a committed result is bound the same way.
3. Lazy exports ([§5.2](#52-artifact-loading-and-decoding)) load
   on events, never from a frame. The regression export is
   prefetched when the entry-mode radio selects offset mode, and
   requested — started, or joined while in flight — when an
   offset-mode Scenario is accepted before it has loaded; that
   request carries the Scenario's sequence number. The field export
   is requested when the overlay switch turns on while its state is
   `absent` or `failed`. A frame whose latest Scenario is in offset
   mode while the regression export has not loaded renders no new
   result, so the displayed results and summary stay those of the
   last rendered Scenario. When a request settles, its continuation
   returns if the scheduler has stopped (item 5) or, for the
   regression export, if a newer Scenario has been accepted since.
   Otherwise, for the regression export, it requests a frame on
   fulfilment — that frame computes the awaiting result, whose
   commit renders every slot — and on rejection it applies the
   failure handling of [§5.10](#510-failure-states) and requests
   nothing — the next request fetches again; no slot reads the
   regression export except through a computed result. A failed
   prefetch shows nothing. The field export's state is `absent`
   before its first request, `loading` while a request is in flight,
   and then `ready`, with its rows, or `failed` (fixed here). Its
   continuation sets `ready` or `failed` — on `failed` also
   announcing the §5.8 field-export line (§5.11) — marks for
   re-rendering the slots that read the state, the `.gre-legend` and
   `.gre-chart` slots of the height and width panels (the overlay
   legend or that line, the marks, and the field table), and
   requests a frame as item 1 does. That frame re-renders every
   marked slot from the last committed `RenderInput` with `field`
   taken from the new state ([§5.8](#58-view-layer)), even when
   neither the Scenario nor the display state has changed, and runs
   no query and announces nothing. While the overlay is on, `failed`
   shows the line; switching the overlay off and on again requests
   the export anew and sets `loading`, which shows neither line nor
   marks, so a successful retry leaves the marks and no line. The
   field export never holds back results: while it loads, frames
   render without overlay marks. No render ever commits a result
   older than the one it replaces.
4. Everything the frame callback does runs inside one
   `try`/`catch` — the "scheduler's guarded step" that
   [§5.10](#510-failure-states) names; a throw routes to the
   internal-failure state of §5.10, and the error is written to the
   console.
5. The scheduler stops on the mount signal's `abort` event and when
   the mount enters the unavailable state of §5.10, which is
   terminal for the mount: it cancels its pending frame with
   `cancelAnimationFrame`, requests no further frame, and ignores
   every later frame and lazy-load continuation (items 2 and 3).

Expected cost — the
[HLDD §5.3 — Records rather than precomputed summaries (ADR-0013)](hldd.md#53-records-rather-than-precomputed-summaries-adr-0013)
estimate of "a scan of a few milliseconds and a percentile sort of
tens of milliseconds" — is inside the 200 ms budget from a scenario
change to updated results of
[PDD §9.1 — Performance budgets (D-9, Proposed)](pdd.md#91-performance-budgets-d-9-proposed),
judged at the 95th percentile of 30 measured runs. T-31 and T-37 of
the [implementation plan](ip.md#2-task-graph) record diagnostic spot
checks with `test/spot-timing.ts`, bundled and run outside Gradle on
the runtime that [§2](#2-repository-structure-naming-and-toolchain)
fixes; the acceptance measurement is
[§7.6](#76-performance-and-compatibility-measurements)'s (T-61), in
the reference environment that section fixes
([DD-12](#1-ddd-decision-register)). If a measurement breaches the
budget, the fail-optimize-remeasure loop of
[HLDD §7.1 — Performance estimates and
verification](hldd.md#71-performance-estimates-and-verification)
applies — the engine's purity keeps a worker split possible without
API change.

*Verification (planned):* for the golden scenarios of
[PDD §10.2 — Golden scenarios](pdd.md#102-golden-scenarios), the
parity harness ([§7.2](#72-calculation-parity-tests)) compares
selection identities with classes, counts, range flags, and GS-4's
diagnosed-condition set with the references exactly. The reference
`boundary_cases` (both sides of the guard at GS-1's converted
endpoints, and exact decimal slip-mode bounds including the explicit
twin of GS-7) and `synthetic` cases (inclusive endpoints; both
population branches; one state per trial under a scarp-type filter
that deselects the class of a trial's highest in-window stage, so
that trial contributes nothing; the two-count model with nulls;
unclassified records under the default and a partial filter;
sediment pairs; the single-condition diagnostic; and per-dip
windows) pin the engine's semantics pipeline-first
([§3.6](#36-reference-results)) and are replayed by §7.2.
`engine.test.ts` ([§7.4](#74-application-tests)) asserts only
implementation properties — identical output for identical input,
the vintage's buffers unmodified, and binary-searched segments equal
to a linear scan — and `parse.test.ts` pins
`storedBoundsFromDecimal`. The browser lane
([§7.5](#75-browser-test-lane)) exercises the scheduler's ordering,
guard, and disposal, the field-export re-render, and the discard of
a superseded announcement and mark.

References:

- [HLDD §6 — Application architecture](hldd.md#6-application-architecture)
  (Query engine).
- [HLDD §5.3 — Records rather than precomputed summaries
  (ADR-0013)](hldd.md#53-records-rather-than-precomputed-summaries-adr-0013)
  (The required calculations stay fast enough in the browser).
- [ADR-0013](../adr/0013-row-level-scenario-artifact.md).
- [PDD §3.4 — Displacement window (FR-S5)](pdd.md#34-displacement-window-fr-s5);
  [PDD §3.7 — Population, scarp filter, family view,
  reset](pdd.md#37-population-scarp-filter-family-view-reset);
  [PDD §4.5 — Small, empty, and partial results (FR-O3, D-11 Proposed)](pdd.md#45-small-empty-and-partial-results-fr-o3-d-11-proposed).

### 5.4 Statistics

For each measurement, `stats/` computes the
[FR-O2 — Summary statistics](prd.md#fr-o2-summary-statistics) set
over the selection's valid values with the algorithms below, the one
specification for both sides: the reference generator's Python twins
([§3.6](#36-reference-results)) run the same IEEE 754 float64
operations, in the same order, on bit-identical inputs, so the
expected difference is zero and agreement does not rest on the
[DD-2](#1-ddd-decision-register) tolerance.

1. **Gather.** `validValues(vintage, selection, measurement)` walks
   the selected records in artifact order and keeps every value that
   is not the column's null sentinel, as an integer `s` in recording
   steps — `stored + offset_steps` for scarp height and
   deformation-zone width, the dip dictionary entry (thousandths of
   a degree) for scarp dip — together with its class code. A kept
   value whose class code is 255 breaks the export's
   `unclassified-has-no-valid-measurement` rule
   ([§4.1](#41-export-task-and-validation)), and `validValues`
   throws — an internal failure ([§5.10](#510-failure-states)). The
   result, `ValidValues`, holds `steps` (`Int32Array`) and `classes`
   (`Uint8Array`) in artifact order, the divisor `D` of
   [§5.2](#52-artifact-loading-and-decoding) (1000 for all three
   measurements), and `sorted`: the restored values `x = s / D` in a
   `Float64Array` sorted ascending by the typed-array numeric sort.
2. **Extremes.** `min` and `max` are `sorted[0]` and
   `sorted[n − 1]`.
3. **Percentiles.** `median`, `p16`, and `p84` are
   `quantileLinear(sorted, p)` with `p` = 50/100, 16/100, and
   84/100, each the float64 quotient of the integer by 100.
   `quantileLinear` (`src/stats/quantile.ts`; Python twin
   `quantile_linear`) is NumPy's `'linear'` method with its endpoint
   branch:

   ```
   # v ascending float64, n = len(v) >= 1; p = q/100 with integer q in 0..100
   h = (n - 1) * p
   if h >= n - 1: return v[n - 1]        # p = 1, and the singleton n = 1
   i = floor(h); t = h - i
   a = v[i]; b = v[i + 1]; d = b - a
   return a + d * t if t < 0.5 else b - d * (1 - t)
   ```

   It is never called with `n = 0`. The percentile read-off of
   [§5.12](#512-charts) calls it with `p = q / 100` for the
   committed integer `q`; the [DD-5](#1-ddd-decision-register) bin
   rule calls it for the interquartile range.
4. **Mean.** `mean = S / (n · D)`, where `S = Σ s` is an exact
   integer sum — at most 346,834 values of magnitude at most 89,765
   steps ([§3.1](#31-scenario-artifact-binary-layout)), so every
   partial sum is an integer far below 2^53 that a float64
   accumulator holds exactly — followed by one correctly rounded
   division; the order of summation cannot change it.
5. **Standard deviation.** `sd = sqrt(acc / (n − 1))`, where an
   explicit loop over `sorted`, ascending, accumulates
   `acc += (x − mean) · (x − mean)` — the sample standard
   deviation, the pipeline's established convention (`STDDEV_SAMP`
   in `dem_slip_bin_stats`).

Neither side uses Python's builtin `sum` over floats (compensated
since Python 3.12), a NumPy reduction (pairwise), or `**` for a
square.

**Null rules.** With no valid value `summarize` returns null — the
reference holds JSON `null` for that `statistics.<m>` — and the
states of
[PDD §4.5 — Small, empty, and partial results (FR-O3, D-11 Proposed)](pdd.md#45-small-empty-and-partial-results-fr-o3-d-11-proposed)
take over; with one valid value `sd` is null and `median`, `p16`,
and `p84` come from the endpoint branch, equal to `min` and `max`;
with two or more, all seven statistics are numbers.

Values are full precision end to end; rounding happens once, at
display, by `displayRound(v, decimals)` of `src/views/format.ts` at
the [D-23](pdd.md#1-decision-register) decimals (Reader-facing
display precision per quantity; [§5.8](#58-view-layer)), and
downloads carry the recorded precision ([§5.9](#59-downloads)).
Measurement hygiene — nulls, small negative values, low-slip
reliability — is the pipeline's policy
([DR-4 — Measurement hygiene](prd.md#dr-4-measurement-hygiene)),
carried entirely by the export's validity semantics: the application
never re-filters, clamps, or excludes a value on its own, in
displays, statistics, or downloads. A new displayed statistic lands
in the pipeline's reference generator first
([ADR-0015](../adr/0015-golden-scenario-parity.md)).

*Verification (planned):* the parity harness
([§7.2](#72-calculation-parity-tests)) compares every golden
scenario's statistics, and `quantileLinear` at q = 0…100 against the
scenario's `percentiles`, within the DD-2 tolerance, printing the
largest observed difference — expected zero — as a diagnostic; it
compares a null against a number exactly (rule `presence`) and the
displayed strings against the reference `display` strings exactly,
and it replays the reference `synthetic.statistics` cases (n = 0, 1,
and 2) against `stats/`. The fixture lane of
`test_reference_results.py` ([§7.3](#73-pipeline-and-export-tests))
pins `quantile_linear` bit for bit against
`np.percentile(v, q, method='linear')` for q = 0…100.

References:

- [HLDD §5.6 — Reference results and verification
  (ADR-0015)](hldd.md#56-reference-results-and-verification-adr-0015).
- [ADR-0015](../adr/0015-golden-scenario-parity.md).
- [PDD §4.2 — Statistics table (FR-O2)](pdd.md#42-statistics-table-fr-o2);
  [PDD §4.5 — Small, empty, and partial results (FR-O3, D-11 Proposed)](pdd.md#45-small-empty-and-partial-results-fr-o3-d-11-proposed).
- `subprojects/python/tests/test_dem_slip_bin_stats.py` (the sample-SD
  precedent).

### 5.5 Offset-to-slip conversion assist

**One entry, both ends back-projected.** Offset mode takes one
entry, the anticipated maximum vertical surface offset `o_max`: the
Scenario's `offsetMax`, a canonical decimal string
([§5.6](#56-scenario-state-and-url-encoding)), converted to float64
by `Number(offsetMax)` at the engine boundary. "It represents an
offset range from 0 m to the entered maximum"
([PDD §3.5 — Offset-entry mode and conversion assist
(FR-S5)](pdd.md#35-offset-entry-mode-and-conversion-assist-fr-s5)),
and offset mode has no second configurable endpoint. For each dip
`d` it is given, `convertWindows` back-projects both ends with the
exported coefficients of [§3.5](#35-regression-export) — never a
hardcoded copy — through the approved back-projection
`slip = (vd_hw − intercept) / slope`:

```
window_lo(d) = (0 − intercept_d) / slope_d
window_hi(d) = (o_max − intercept_d) / slope_d
```

Each is evaluated in float64 exactly as written — one subtraction,
one division — by the reference generator as well, so both produce
the same bits. `PerDipWindows` — a type of `src/engine/`, which
`convert/` imports with `storedBounds`
([§5.1](#51-modules-and-interfaces)) — is a readonly array of
`{ faultDip, lo, hi }` (metres), one entry per given dip, ascending
by `faultDip`; [§5.3](#53-query-engine) states why production code
converts every modeled dip. `convertWindows` throws — an internal
failure, [§5.10](#510-failure-states) — when a given dip has no
coefficient row or its `slope_d` is not positive, so
`window_lo(d) ≤ window_hi(d)` always holds, and when a computed `lo`
or `hi` is not finite (`Number.isFinite` false), which the 1000 m
bound on the entry makes unreachable on the shipped coefficients
(Validation, below).

Two consequences follow from the shipped coefficients of §3.5 — a
drafting measurement on `data/processed/dem/data.parquet` (SHA-256
`6a6e9149066f503588e09ecb6772a8392685716672e298d75aa925e7826eb303`)
whose rows the export task reproduces against `dem_regression`
([§4.1](#41-export-task-and-validation); T-12). First,
`window_lo(d)` lies between 0.0102 m and 0.0145 m for every dip, so
an offset-mode window never includes a zero-slip unclassified stage
and always reaches below the 0.5 m low-slip trigger of
[§5.8](#58-view-layer). Second, GS-1 of
[PDD §10.2 — Golden scenarios](pdd.md#102-golden-scenarios), with
`o_max` = 3 m, converts to ≈[0.0102, 5.9854] m at 30°, flagged
`partly_out`, and to ≈[0.0111, 4.6600] m at 40°, flagged
`in_range` — 30° partly out of range while 40° is covered, as
[PDD §3.6 — Multi-dip conversion rule (D-3, Proposed)](pdd.md#36-multi-dip-conversion-rule-d-3-proposed)
describes; the reference generator in `product_export.py`
reproduces these figures as GS-1's `converted_windows` (T-13). The
"flagged beyond the modeled range" of PDD §10.2 (GS-1 at 30°) is
read as `partly_out`, the only flag a window starting at 0.0102 m
can carry (`out_of_range` needs `lo_s > max_s`, which the
`coefficient-reach` rule of [§4.1](#41-export-task-and-validation)
excludes); the wording is that of the per-dip out-of-range line of
[PDD §5.6 — Conversion assist (FR-S5, D-3)](pdd.md#56-conversion-assist-fr-s5-d-3),
which §5.8 shows for each `partly_out` dip.

**Range flags, in stored space.** `rangeFlag(window, bounds)`
classifies a window on the stored bounds the scan uses
([§5.3](#53-query-engine)), with `bounds` the decoded
`slip_window_bounds` record — the manifest's, or a reference
`synthetic.conversion` case's ([§3.6](#36-reference-results)):
`[lo_s, hi_s]` =
`storedBounds(window.lo, window.hi, bounds.recordingStep)`,
`recordingStep` being 1e-4, the same float64 as the scan's
`columns.slip.scale` ([§3.2](#32-artifact-manifest)), and
`max_s = Math.round(bounds.max / bounds.recordingStep)` — 50,135 on
the shipped vintage ([§3.1](#31-scenario-artifact-binary-layout)),
rounded and never floored, because 5.0135 / 1e-4 evaluates to
50134.99999999999 in float64:

- `in_range` ⟺ `lo_s ≥ 0` and `hi_s ≤ max_s`;
- `out_of_range` ⟺ `hi_s < 0` or `lo_s > max_s`;
- `partly_out` otherwise.

A window with `hi_s < lo_s` is valid and empty; `o_max` = 0, for
instance, converts to the single point `−intercept_d / slope_d`,
which selects nothing unless it lies within the §5.3 guard of a
1e-4 m grid point. The reference generator implements the identical
rule pipeline-first (T-13).

**Unreachable flags.** For an accepted entry (`o_max` ≥ 0,
[§5.7](#57-scenario-controls)), the export's `coefficient-reach`
rule ([§4.1](#41-export-task-and-validation)) — `slope_d > 0`,
`intercept_d ≤ 0`, and
`−intercept_d / slope_d ≤ slip_window_bounds.max` for every dip —
puts `window_lo(d)` inside the recorded range, so `out_of_range` and
a window starting below 0 m cannot occur with exported coefficients,
and coverage can fall short only at the upper end; §4.1 states why
a vintage that could reach them fails export. The `convertWindows`
throw on a non-positive slope stays as the client's own guard, and
`rangeFlag` still implements all three values, exercised by the
reference `synthetic.conversion` cases, among them an
`out_of_range` coefficient row with intercept −6 m
([§3.6](#36-reference-results)).

**Use.** The engine applies each dip's own window to that dip's
trials ([§5.3](#53-query-engine)), so a dip whose stored window
holds no recorded slip contributes no records. In offset mode the
assist panel fills the `#gre-assist-body` slot
([§5.8](#58-view-layer)): the pure builder `assistLines(input)` of
`src/views/assist.ts` computes its paragraphs from the `RenderInput`
alone — its Scenario snapshot and its `windows`, `flags`, and
`regression` members (§5.8) — as a `readonly string[]`, and `render`
commits each string as one `<p>` of the slot; in slip mode
`assistLines` returns null and the slot holds nothing. The
paragraphs are the first text of
[PDD §5.6 — Conversion assist (FR-S5, D-3)](pdd.md#56-conversion-assist-fr-s5-d-3)
with `{X}` = the canonical `offsetMax`, then, for each selected dip
in ascending order, a window line and a provenance line. Both lines
are fixed-here copy-registry entries (§5.8), flagged for the
[SC-7](pdd.md#101-success-criteria) (scientific sign-off) review:

> {Dip}°: fault slip {lo}–{hi} m, {flag}

> {Dip}° — {back_projection}, inverting {form} with slope {slope}
> and intercept {intercept} m.

`{lo}` and `{hi}` are the window's ends by `displayRound(v, 2)` — 2
being `displayDecimals('slip')`, the
[D-23](pdd.md#1-decision-register) slip precision of 0.01 m
(Reader-facing display precision per quantity) from configuration
([§5.13](#513-application-configuration)) — so they equal the
reference `window_lo_display` and `window_hi_display`
([§3.6](#36-reference-results)); `{flag}` is the PDD §3.5 term for
the range flag, `in-range`, `partly-out-of-range`, or
`out-of-range`, a registry entry quoting that section; `{form}` and
`{back_projection}` are the `relationship` strings of §3.5,
verbatim; and `{slope}` and `{intercept}` are that dip's
coefficients by `displayRound(v, 6)` — six decimals, the reading
precision of the §3.5 coefficient table (fixed here). The PDD §5.6
per-dip out-of-range line, for each `partly_out` dip, is §5.8's,
which fixes its `{Dip}` and `{Y}`: `{Y}` is `window_hi(d)`, the
converted slip of the entered maximum, by `displayRound(v, 2)` as
`{hi}` above, so on the shipped vintage GS-1's 30° line begins
"30°: converted slip ≈ 5.99 m".

**Validation.** Entry validation — the grammar, the rejection of an
unreadable or blank commit or of an offset above 1000 m, and what a
rejection leaves unchanged — is the free-entry validation table of
[§5.7](#57-scenario-controls), implemented once in
`src/state/parse.ts`; this section receives only accepted entries.
Valid entries that convert partly or entirely outside the modeled
range are accepted and flagged, never rejected (PDD §3.5). The
1000 m bound keeps every value finite: with the smallest slope,
0.343631 (20°), and the most negative intercept, −0.013348 (70°), of
the §3.5 drafting measurement, every `window_hi(d)` is at most
(1000 + 0.013348) / 0.343631 ≈ 2910.1 m, so every converted window,
its stored bounds (§5.3), and each value displayed or downloaded
from it are finite.

*Verification (planned):* GS-1's converted windows within the
[DD-2](#1-ddd-decision-register) tolerance, and its range flags,
selections, and window display strings (`window_lo_display`,
`window_hi_display`) exactly ([§7.2](#72-calculation-parity-tests));
the browser lane's `golden-scenario.spec.ts`
([§7.5](#75-browser-test-lane)), which compares every
converted-window value GS-1 displays — the assist panel's `{lo}` and
`{hi}` and the `{Y}` of its 30° line — with those strings exactly;
the reference `boundary_cases`, which move GS-1's converted
endpoints inside and outside the guard, and the
`synthetic.conversion` cases ([§3.6](#36-reference-results)), both
replayed by §7.2; the export's `coefficient-reach` rule
([§4.1](#41-export-task-and-validation)).

References:

- [HLDD §5.7 — Conversion coefficients (ADR-0015)](hldd.md#57-conversion-coefficients-adr-0015).
- [ADR-0012](../adr/0012-product-data-exports.md) (amendment of
  2026-10-29, the approved back-projection).
- [PDD §3.5 — Offset-entry mode and conversion assist
  (FR-S5)](pdd.md#35-offset-entry-mode-and-conversion-assist-fr-s5);
  [PDD §3.6 — Multi-dip conversion rule (D-3, Proposed)](pdd.md#36-multi-dip-conversion-rule-d-3-proposed);
  [PDD §5.6 — Conversion assist (FR-S5, D-3)](pdd.md#56-conversion-assist-fr-s5-d-3).

### 5.6 Scenario state and URL encoding

The application keeps two state objects in `src/state/`: the
`Scenario`, which selects records, and the `DisplayState`, which
changes only how a computed result is presented. Each setting lives
in exactly one of them, so no component keeps a conflicting copy,
and a display-only change repeats no calculation
([HLDD §6 — Application architecture](hldd.md#6-application-architecture),
Scenario state and shared-link encoding).

**Scenario: accepted values only.** `Scenario` holds the last
accepted value of every scenario control of
[§5.7](#57-scenario-controls):

| Member | Value | Default |
|---|---|---|
| `faultDip` | set of modeled dips, from `trial_columns.fault_dip` | all |
| `sediment` | set of `(set, sediment_strength)` pairs, from `arm_strength_states` | all nine |
| `depth` | set of `trial_columns.depth` values | all |
| `density` | set of `trial_columns.density` values | all |
| `window` | `{ mode: 'slip', min, max }` or `{ mode: 'offset', offsetMax }` | `{ mode: 'slip', min: null, max: null }`, the inactive window ([D-22](pdd.md#1-decision-register), Default displacement-window state) |
| `population` | `'all_stages'` or `'one_state_per_trial'` | `'all_stages'` ([FR-S6 — Population selection](prd.md#fr-s6-population-selection)) |
| `scarpClass` | set of class names, from `scarp_classes` | all six — no filter |

In slip mode `min` and `max` are both canonical decimal strings —
the effective inclusive endpoints, a lone maximum giving `min` `"0"`
and a lone minimum giving `max` the canonical decimal of
`slip_window_bounds.max` ([§3.2](#32-artifact-manifest): `String` in
JavaScript; in Python `repr` with grammar G's canonical form
applied, so `5.0` gives `5`; `"5.0135"` on the shipped vintage) — or
both null while the window is inactive. An accepted window satisfies
0 ≤ `min` ≤ `max` ≤ `slip_window_bounds.max` as exact decimals,
because the free-entry validation of §5.7 rejects every other entry.
In offset mode `offsetMax` is the canonical decimal of the single
offset entry ([§5.5](#55-offset-to-slip-conversion-assist)), from 0
to 1000 as exact decimals by the same validation (R2).
A canonical decimal is grammar G's canonical form (§5.7): leading
zeros reduced to one before the point, trailing fractional zeros and
a bare point removed (`"03.50"` → `"3.5"`, `"0.000"` → `"0"`,
`"5.0"` → `"5"`). No member holds a float; decimal strings are
converted at the engine boundary — exactly, with integer arithmetic,
in slip mode ([§5.3](#53-query-engine)) and by `Number(offsetMax)`
in offset mode (§5.5). Every set may be empty (§5.7).

A Scenario member changes only through a reducer call that a control
change of the §5.7 event map makes — a checkbox or radio change, an
accepted field commit, Apply, or Reset — or, from P2, a link
restore. Rejected entries, field text, caret, selection, and
`<details>` open state never reach it: they are editing state the
browser owns, which the engine, the summary, downloads, and the
codec never read. Reducers are pure — a state and an action in, a
new state out, nothing mutated — and `defaultScenario(manifest)`
builds the defaults above from the decoded artifact manifest's
dictionaries, never from literals in components. How the controls
show the accepted Scenario — `sync(scenario)` after Reset and a P2
link restore only, Apply setting `checked` on the dip checkboxes
alone so that a pending entry-mode choice survives — is §5.7's.

**Display state.** `DisplayState` holds:

- `measurement` — the selected measurement, default `scarp_height`
  ("Default measurement on load: scarp height",
  [PDD §4.1 — Measurement views (FR-O1)](pdd.md#41-measurement-views-fr-o1));
  it names the panel that receives initial focus
  ([§5.11](#511-accessibility-supported-environments-and-navigation-lifecycle))
  and the panel a P2 link restores;
- per panel, keyed by measurement name: `view` (`'histogram'` or
  `'cumulative'`, default `'histogram'`, [§5.8](#58-view-layer)),
  `readoff` (the committed percentile, an integer from 0 to 100, or
  null when blank or invalid; default null; [§5.12](#512-charts)),
  and `chartDataOpen` (the panel's chart-data disclosure, default
  closed; §5.8);
- per overlay panel (`scarp_height`, `dzw`): `showAll`, the
  overlay's show-all, default off (§5.8);
- on the `dzw` panel only: `logScale`, the log-scale toggle that
  PDD §4.1 permits, true when that panel's histogram view draws the
  logarithmic value axis of [§5.12](#512-charts); default false;
  the cumulative view ignores it. The toggle is offered exactly
  while the latest computed result's `dzw` `histogramLog`
  ([§5.1](#51-modules-and-interfaces)) is non-null, and the
  [§5.3](#53-query-engine) frame callback sets `logScale` to false
  whenever it computes a result whose `histogramLog` is null, so a
  renewed offer starts linear;
- `overlay` — the one field-overlay switch in the results header,
  default off (§5.8);
- `familyView` — the "Group collapse variants" toggle
  ([D-13](pdd.md#1-decision-register), Scarp-family view
  availability and label), default off; a scarp-filter change that
  leaves fewer than six classes sets it to false in the same update,
  and the toggle stays disabled until all six are selected again
  (§5.8;
  [PDD §3.7 — Population, scarp filter, family view,
  reset](pdd.md#37-population-scarp-filter-family-view-reset)).

Reset (§5.7) replaces the Scenario with `defaultScenario(manifest)`
and sets `familyView` to off in one update — PDD §3.7's Reset
restores every control of PDD §3.1–§3.8, and the family view is one
of them — and leaves the rest of the display state unchanged. The
overlay switch and the log-scale toggle are results controls of
[PDD §4.4 — Field overlay (FR-O5, D-18 Proposed)](pdd.md#44-field-overlay-fr-o5-d-18-proposed)
and PDD §4.1, not scenario controls, so Reset leaves them alone —
for the overlay, part of the [DD-4](#1-ddd-decision-register)
reading of PDD §4.4, which closes with the owner's acceptance. When
inverse mode ships, its switch and observed ranges join `Scenario`,
the canonical object below gains the key `observed`, and Reset
restores forward mode ([§5.14](#514-inverse-mode-p2)).

**Canonical serialization ([DD-11](#1-ddd-decision-register)).**
`src/state/scenario-json.ts` exports `serializeScenario(s, manifest)`,
which returns the canonical JSON text of the scenario object below,
and `parseScenario(o, manifest)`, which builds a `Scenario` from a
parsed object; both take the decoded artifact manifest, whose
dictionaries fix the vocabularies and orders. The Python twin
`canonical_scenario()` in `product_export.py` writes the
[§3.6](#36-reference-results) `inputs`. The object's keys are
[DD-10](#1-ddd-decision-register) snake_case, with the pipeline
column name wherever a key denotes a column:

- `fault_dip`: integers, ascending;
- `sediment`: objects `{"set", "sediment_strength"}` holding the
  manifest strings verbatim, sorted by `set`, then by
  `sediment_strength`, in code-point order — not the display order
  of §5.7;
- `depth`: integers, ascending;
- `density`: strings in `trial_columns.density` dictionary order;
- `entry_mode`: `"slip"` or `"offset"`;
- `slip_window`: null, or `{"min", "max"}` holding the effective
  endpoints as canonical decimals — null while the window is
  inactive and whenever `entry_mode` is `"offset"`;
- `offset_max`: null, or the canonical decimal of the offset entry
  — non-null exactly when `entry_mode` is `"offset"`;
- `population`: `"all_stages"` or `"one_state_per_trial"`;
- `scarp_class`: class names in `config.SCARP_CLASSES` canonical
  order (the manifest's `scarp_classes`); all six means no filter.

The object holds no float and no display state — no overlay, family
view, panel view, read-off, disclosure, or log-scale state.
`serializeScenario` writes it with `canonicalJson(v)`, the one
canonical JSON writer of the TypeScript side, which sorts every
object's keys by code point at every depth and emits no whitespace,
exactly as Python's
`json.dumps(v, sort_keys=True, separators=(",", ":"), ensure_ascii=False)`
does; because every key is ASCII and every value an integer or a
string, both produce the same bytes. GS-1 of
[PDD §10.2 — Golden scenarios](pdd.md#102-golden-scenarios)
serializes to exactly:

```json
{"density":["Dense","Loose","Medium"],"depth":[3,5,10],"entry_mode":"offset","fault_dip":[30,40],"offset_max":"3","population":"all_stages","scarp_class":["Monoclinal","Monoclinal Collapse","Pressure Ridge","Pressure Ridge Collapse","Simple","Simple Collapse"],"sediment":[{"sediment_strength":"Strong","set":"Heterogeneous"},{"sediment_strength":"Strong","set":"Homogeneous"}],"slip_window":null}
```

`parseScenario` maps keys through `SCENARIO_INPUT_FIELDS`
([§5.2](#52-artifact-loading-and-decoding)) and throws
`ScenarioInputError(path)` — the typed invalid-input failure of
[§5.10](#510-failure-states), `path` naming the offending key or
element — on a missing or unknown key, a wrong JSON type, an
out-of-vocabulary value, array elements out of canonical order or
repeated, a decimal that is not canonical, or an inconsistent
combination — `slip_window` or `offset_max` disagreeing with
`entry_mode`, or a slip window or offset that breaks the §5.7 rules; a
`SchemaError` from `mapRecord` becomes a `ScenarioInputError` for
the same key. For every valid object `o` and the vintage's manifest `m`,
`JSON.parse(serializeScenario(parseScenario(o, m), m))` deep-equals
`o`. The serialization is the scenario's identity: the download's
`scenario.json` carries it as the object
`JSON.parse(serializeScenario(s, manifest))`
([§5.9](#59-downloads)), and the parity harness replays every
reference `inputs` through it ([§7.2](#72-calculation-parity-tests)).

**URL encoding (P2).** The MVP reads and writes no URL state, and no
MVP module parses or writes a query parameter. The P2 shared-link
codec will encode the `Scenario` and the display state on the
restore list of [PDD §7.1 — Shared links](pdd.md#71-shared-links) —
the selected measurement, each panel's view, each overlay panel's
show-all, the overlay switch, and the family view — as query
parameters; results are never stored in links
([ADR-0010](../adr/0010-native-client-side-scenario-app.md)).
Because links circulate in readers' documents, the parameter names
are a de facto public interface (ADR-0010) and are reserved now,
each snake_case per DD-10:

| Parameter | Carries |
|---|---|
| `dips` | `fault_dip` |
| `strength` | `sediment` |
| `depth` | `depth` |
| `density` | `density` |
| `mode` | `entry_mode` |
| `win` | `slip_window`, slip mode only |
| `offset` | `offset_max`, offset mode only |
| `pop` | `population` |
| `classes` | `scarp_class` |
| `family` | `familyView` |
| `overlay` | `overlay` |
| `meas` | `measurement` |
| `view` | each panel's `view` |
| `showall` | each overlay panel's `showAll` |
| `inv` | the inverse-mode switch of [§5.14](#514-inverse-mode-p2) (P2) |

**Value grammar: deferred to P2.** Only the reserved names bind now.
The value grammar is fixed by the DDD revision that opens the P2
shared-links lane, after the product owner adds to PDD §7.1 the rule
for what a reader sees when a link carries an invalid or
out-of-vocabulary value — an owner decision, since PDD §7.1 is
silent on it. Values reuse the canonical scenario object's
vocabulary for `Scenario` members and the display-state values above
for the rest. Links first ship with no version stamp
([D-15](pdd.md#1-decision-register), Shared-link version notice);
only if a later release adds one does a decoded link whose stamp
differs from the page's versions show the version notice of
[PDD §7.2 — Version display and notice (D-15, Proposed)](pdd.md#72-version-display-and-notice-d-15-proposed).

*Closes:* DD-11, a user-visible choice — the download's
`scenario.json` ([§5.9](#59-downloads)) carries the serialization —
so the row closes only with the owner's acceptance of this section
and of §5.9
([Authority and change control](#authority-and-change-control)).
*Verification (planned):* `state.test.ts`
([§7.4](#74-application-tests)) checks that `defaultScenario`
equals the manifest-derived defaults, that reducers are pure, that
Reset from any mutated state yields the default `Scenario` and
`familyView` off with the rest of the display state unchanged, and
that out-of-vocabulary settings are rejected;
`scenario-json.test.ts` checks GS-1's golden bytes above, round
trips for the default, GS-1, a lone minimum, a lone maximum, offset
mode, and the sediment selections {(Homogeneous, Strong),
(Heterogeneous, Weak)} and {(Homogeneous, Weak), (Heterogeneous,
Strong)} — which must serialize differently — the canonical-decimal
cases, and the `ScenarioInputError` of an unknown key and of an
out-of-vocabulary value; the fixture lane of
`test_reference_results.py` ([§7.3](#73-pipeline-and-export-tests))
checks that the generator's GS-1 `inputs` equal the same golden
bytes; the parity harness replays every reference `inputs` through
`parseScenario` and `serializeScenario` (§7.2);
`consistency.spec.ts` compares the downloaded `scenario.json` with
the page state, and the lane's width-panel log-scale drive shows the
toggle hidden and the linear view back once a narrowed selection no
longer offers it ([§7.5](#75-browser-test-lane)). The codec's tests
ship with the P2 grammar revision; no MVP test exercises URL
parameters.

References:

- [HLDD §6 — Application architecture](hldd.md#6-application-architecture)
  (Scenario state and shared-link encoding).
- [ADR-0010](../adr/0010-native-client-side-scenario-app.md).
- [PDD §7.1 — Shared links](pdd.md#71-shared-links);
  [PDD §3.7 — Population, scarp filter, family view,
  reset](pdd.md#37-population-scarp-filter-family-view-reset).
- [§3.6 Reference results](#36-reference-results) (`inputs`).

### 5.7 Scenario controls

The scenario controls render every input control of
[PDD §3 — Scenario page: inputs](pdd.md#3-scenario-page-inputs) into
`#gre-controls`, the controls container of the skeleton the view
layer builds at mount ([§5.8](#58-view-layer)). They are a
builder/applier pair ([§5.1](#51-modules-and-interfaces)): the pure
`src/views/scenario-controls.ts` computes
`controlModel(manifest, state)` — option lists, defaults, and
disabled flags — and `dipRangeEcho(entry, dips)`; the browser-only
`src/views/dom/controls.ts` builds the elements once, wires their
events, and writes their properties. Only native HTML elements are
used — fieldsets of checkboxes, radio groups, text inputs, buttons,
and `<details>` disclosures; no custom widget
([HLDD §7.2 — Accessibility and supported environments](hldd.md#72-accessibility-and-supported-environments)).
“Every control change updates results immediately (NFR-3); there is
no "submit" step”
([PDD §3 — Scenario page: inputs](pdd.md#3-scenario-page-inputs);
[NFR-3 — Responsive interaction](prd.md#nfr-3-responsive-interaction)):
a text field changes at its commit — Enter, or leaving the field —
which is its control change, not a submit step, and the only
deferral permitted is the [§5.3](#53-query-engine) scheduling that
meets the interaction budget.

**Accepted scenario and editing state.** The `Scenario` of
[§5.6](#56-scenario-state-and-url-encoding) holds accepted values
only: canonical decimal strings for the free entries, never typed
text. Field text, caret, selection, IME composition, and every
`<details>` open state are editing state the browser owns; the
engine, the summary, downloads, and the P2 codec never read them.
The event map, implemented once in `controls.ts`:

- a checkbox or radio `change`, an Apply or Reset `click`, and a
  commit of a slip or offset field each make at most one reducer
  call, which hands the new Scenario, with the display state, to the
  [§5.3](#53-query-engine) scheduler's `update(next)`; a rejected
  commit, and a commit that changes no accepted value, make none.
  Immediately after that call the handler records
  `performance.mark('egr:change-accepted', { startTime: event.timeStamp, detail: { seq } })`,
  `seq` the sequence number `update(next)` returns
  ([§5.3](#53-query-engine)), the start of the interaction interval of
  [§7.6](#76-performance-and-compatibility-measurements). The family
  toggle is the exception: its `change` is a display-only update
  ([§5.8](#58-view-layer));
- a slip or offset field commits on its `change` event or an Enter
  `keydown`, both calling `commitField(id)`, which is idempotent: a
  commit whose text equals the text the field last committed is a
  no-op, because an Enter and the `change` that may follow it carry
  the same text. The record starts as none and Reset sets it back to
  none; any other commit records its text and is judged by the
  free-entry table below;
- the dip-range field has no commit of its own: its `input` event
  refreshes the echo, and an Enter `keydown` activates Apply when
  Apply is enabled (fixed here: the keyboard path of the button);
- no other `input` event does anything: nothing is validated,
  rejected, or applied while typing, so incomplete text such as
  `1.`, `-`, `1e`, or an empty field is judged only at commit.

`sync(scenario)` in `controls.ts` writes `checked`, `value`,
`disabled`, and `hidden` on the controls from the accepted Scenario
after Reset and after a P2 link restore; it skips the `value` of
`document.activeElement` and never writes a `<details>` `open`.
Apply sets `checked` on the dip checkboxes alone, to the applied
set, so a pending mode choice (R3) survives it. A render can land
while the reader is editing a field — a lazy export load
([§5.2](#52-artifact-loading-and-decoding)), a resize, or a frame
queued by an earlier change. A render touches only slots and
unfocused properties ([§5.8](#58-view-layer)), so the field keeps
its text, caret, selection, and composition; the summary keeps
naming the accepted scenario the results belong to, and the draft
takes effect at its own commit. A render computed for a superseded
Scenario is dropped ([§5.3](#53-query-engine)).

**Enumerations and bounds come from the manifest.** Every option
list, bound, and default is read at mount from the decoded
[§3.2](#32-artifact-manifest) fields — `trial_columns` (the fault
dip, depth, and density dictionaries), `arm_strength_states` (the
nine selectable arm-and-label combinations), `scarp_classes` with
`scarp_class_palette`, `slip_window_bounds`, and `stage_spacing` —
never hardcoded. Each multi-select renders one option per entry, in
manifest order. The inventory:

| Control | Elements | [§3.2](#32-artifact-manifest) source | Default |
|---|---|---|---|
| Fault dip ([PDD §3.1 — Fault dip (FR-S1)](pdd.md#31-fault-dip-fr-s1)) | one checkbox per modeled dip, plus the dip-range assist (R4 below) | `trial_columns.fault_dip` | all selected |
| Sediment strength and structure ([PDD §3.2 — Sediment strength and structure (FR-S2)](pdd.md#32-sediment-strength-and-structure-fr-s2)) | two arm fieldsets, one checkbox per arm-and-label combination | `arm_strength_states` | all nine selected |
| Sediment depth and density ([PDD §3.3 — Sediment depth (FR-S3) and density (FR-S4)](pdd.md#33-sediment-depth-fr-s3-and-density-fr-s4)) | one checkbox per value | `trial_columns.depth`, `trial_columns.density` | all selected |
| Displacement window ([PDD §3.4 — Displacement window (FR-S5)](pdd.md#34-displacement-window-fr-s5)) | two text inputs, minimum and maximum (R1), with the descriptive label and the helper line | `slip_window_bounds`, `stage_spacing` | inactive ([D-22](pdd.md#1-decision-register), Default displacement-window state) |
| Entry mode ([PDD §3.5 — Offset-entry mode and conversion assist (FR-S5)](pdd.md#35-offset-entry-mode-and-conversion-assist-fr-s5)) | radio pair "Fault slip at depth (m)" / "Anticipated vertical surface offset (m)" (R3), under the legend "Enter displacement as" (fixed here); the offset fieldset, under the legend "Anticipated vertical surface offset (m)", holds the offset text input (R2) labeled "Maximum (m)", the slip maximum's label entry, its error line, and the assist panel `#gre-assist-body` of [§5.5](#55-offset-to-slip-conversion-assist) | — | slip mode |
| Population ([PDD §3.7 — Population, scarp filter, family view, reset](pdd.md#37-population-scarp-filter-family-view-reset)) | radio pair under the legend "Population", the PDD §3.7 control name; the population explainer in an adjacent `<details>`, "one tap away", whose `<summary>` reads "What do the two populations mean?" (fixed here) | — | "All model stages in the slip window" |
| Scarp-type filter ([PDD §3.7 — Population, scarp filter, family view, reset](pdd.md#37-population-scarp-filter-family-view-reset)) | one checkbox per class in canonical order, color swatch plus text label | `scarp_classes`, `scarp_class_palette` | all six — "all scarp types (no filter)" |
| Family view ([D-13](pdd.md#1-decision-register), Scarp-family view availability and label) | one checkbox, "Group collapse variants", with its note `#gre-family-note`; display state, not part of the Scenario ([§5.8](#58-view-layer)) | — | off |
| Reset ([PDD §3.7 — Population, scarp filter, family view, reset](pdd.md#37-population-scarp-filter-family-view-reset)) | one button, "Reset" | — | — |

The control labels are the canonical labels of
[PDD §5.11 — Labels, units, and glossary links (FR-G3, CR-3, CR-7)](pdd.md#511-labels-units-and-glossary-links-fr-g3-cr-3-cr-7)
and the option labels of PDD §3.2–§3.7, served from the copy
registry of [§5.8](#58-view-layer); the scarp-type filter is labeled
"Resulting scarp type (a model output, not a site input)"
([PDD §3.7 — Population, scarp filter, family view, reset](pdd.md#37-population-scarp-filter-family-view-reset)).
Option labels are the manifest values — dips as `{d}°` and depths as
`{d} m` (formats fixed here), densities and class names verbatim,
and sediment labels through the display-label map below.

**Free-entry validation.** One closed table covers every free
entry. `src/state/parse.ts` — pure, tested under Node
([§7.4](#74-application-tests)) — implements it once, and the
commit model above applies it. Every decimal entry is read by
grammar G (fixed here):

- trim ASCII whitespace; text that is empty after trimming is BLANK;
- text longer than 16 characters after trimming is INVALID (fixed
  here, to bound the exact comparisons below): `1234567890.12345` is
  valid, `1234567890.123456` is not; the inputs carry no
  `maxlength`, which would cut a pasted text short silently;
- if the text holds no `.` and exactly one `,`, the `,` is the
  decimal point;
- the text is valid iff it matches `^(\d+(\.\d*)?|\.\d+)$`; its
  canonical form drops leading zeros (keeping one before the point),
  trailing fractional zeros, and a trailing point — `03.50` → `3.5`,
  `.5` → `0.5`, `3.` → `3`, `1,5` → `1.5`, `0.000` → `0`;
- everything else is INVALID: any sign (`-`, `-0`, `+3`), an
  exponent (`1e3`), a unit (`3 m`), letters, inner spaces, a second
  separator (`1,000.5`), and a lone `.`.

Decimals compare exactly — as integers (`BigInt`) after scaling both
to the larger number of fraction digits, never through a float. The
rows:

- **R1 — slip minimum and maximum (slip mode).** Two
  `<input type="text" inputmode="decimal" autocomplete="off">` with
  no `min`, `max`, or `step` attribute, judged together at either
  field's commit. Both BLANK: accepted, the window inactive.
  Otherwise the effective endpoints are the canonical texts, a BLANK
  minimum read as `0` — "Entering only a maximum sets the window to
  0–max"
  ([PDD §3.4 — Displacement window (FR-S5)](pdd.md#34-displacement-window-fr-s5))
  — and a BLANK maximum read as the recorded maximum
  `String(slip_window_bounds.max)` (fixed here: the symmetric
  reading, so a lone endpoint always yields a fully specified
  window) — a canonical decimal, because `Number::toString` writes
  every value from 1e-6 to below 1e21 with no exponent and no
  trailing fractional zero. Rejected: either text INVALID; an
  effective maximum above the recorded maximum, which is "the
  control's maximum selectable value" (PDD §3.4); and an effective
  minimum above the effective maximum, a lone minimum above the
  recorded maximum included.
  Accepted windows, `min` = `max` included, apply literally, through
  the exact stored bounds of `storedBoundsFromDecimal`
  ([§5.3](#53-query-engine)). The rejection line, in
  `#gre-slip-error`, is fixed here: "Enter slip values from 0 to
  {max} m, the minimum not above the maximum. The results still show
  the last valid scenario.", with `{max}` =
  `String(slip_window_bounds.max)`.
- **R2 — offset maximum (offset mode).** One text input of the same
  kind. Accepted: a G-valid text whose canonical decimal is at most
  `1000`, compared exactly as decimals, becomes the Scenario's offset
  maximum, a canonical decimal converted to float64 only at the
  engine boundary ([§5.5](#55-offset-to-slip-conversion-assist)).
  The 1000 m bound is fixed here: far above any offset the modeled
  slips produce, it keeps every converted window finite (§5.5).
  `0` is valid: every converted window is then the single point
  `−intercept_d/slope_d` (§5.5). Rejected: INVALID text, a canonical
  decimal above `1000`, and BLANK at a commit — a blank entry "is not
  a non-negative number"
  ([PDD §3.5 — Offset-entry mode and conversion assist (FR-S5)](pdd.md#35-offset-entry-mode-and-conversion-assist-fr-s5))
  — each with the PDD §5.6 rejected-entry line in
  `#gre-offset-error`. A field never committed and BLANK when offset
  mode is chosen changes nothing and shows no error (fixed here: the
  reader has not entered anything yet). Coverage: the per-dip flags
  of [§5.5](#55-offset-to-slip-conversion-assist) and, for each
  `partly_out` dip, the per-dip line of [§5.8](#58-view-layer).
- **R3 — entry-mode radios.** Each mode keeps its own field text;
  the radio's `change` shows the chosen mode's fieldset and sets
  `hidden` on the other's, and a change to offset mode starts the
  regression-export prefetch through the scheduler's
  `prefetchRegression()` ([§5.3](#53-query-engine)). A switch judges
  the chosen mode's retained texts through R1 or R2 directly, never
  through `commitField`'s last-committed records — so a switch back
  to texts committed earlier applies them again — and then sets
  those fields' records to the texts it judged; it never copies,
  converts, or reinterprets a value across modes: "Switching modes
  never silently converts a typed value" (PDD §3.5). Accepted: one
  reducer call sets the entry mode and the window together.
  Rejected, or the offset field never committed and BLANK, which is
  not judged and keeps its record none: the radio shows the chosen
  mode while the Scenario, the summary, and the results stay as they
  were. When R1 rejects at a switch, every non-BLANK slip field gets
  the marks below. Switching away from a mode clears that mode's
  error marks; its text stays.
- **R4 — dip-range assist.** A text input (label "Fault dip range",
  fixed here) with an Apply button and the echo `#gre-dip-echo`,
  which the input's `aria-describedby` names; the echo is not a live
  region. Readable text has at most 16 characters after trimming
  ASCII whitespace, as in grammar G, and matches
  `^\s*(\d+(\.\d+)?)\s*°?\s*([-–]\s*(\d+(\.\d+)?)\s*°?)?\s*$` —
  hyphen-minus or en dash; one value means the interval [v, v], two
  values in either order the interval between them — and its
  endpoints compare with the modeled dips exactly as decimals.
  `dipRangeEcho(entry, dips)` returns a status and the included
  dips, and each `input` event writes the echo: included dips as
  `{list} only` — ascending, each with `°`, `, ` between and ` and `
  before the last, the form of the PDD §3.1 example "30° and 40°
  only"; no modeled dip included: "No modeled fault dip in this
  range."; unreadable: "Enter one fault dip or a range such as
  30–40."; BLANK: empty (texts fixed here). Apply is `disabled`
  unless some dip is included; its `click` makes one reducer call
  that replaces the dip set with exactly the echoed dips — the assist
  "echoes which modeled values that includes … before applying"
  ([PDD §3.1 — Fault dip (FR-S1)](pdd.md#31-fault-dip-fr-s1)). There
  is no continuous slider.
- **R5 — checkbox groups** (dips, the nine arm-and-label pairs,
  depths, densities, scarp types). Every subset is accepted, the
  empty set included; the application never re-selects a box, which
  would be a silent correction. An empty group gives zero matches
  and the empty-state explainer, whose diagnostic names that group
  ([§5.8](#58-view-layer)); its summary token is the group's
  empty-group token (below), and its raw value in the
  [DD-6](#1-ddd-decision-register) download slug is `none`
  ([§5.9](#59-downloads)); a scarp-type selection of fewer than six
  clears and disables the family toggle ([§5.8](#58-view-layer));
  with no dip selected in offset mode there are no per-dip rows and
  no coverage lines.
- **R6 — percentile read-off** — display state, never part of the
  Scenario, the provenance, or the file name: a native number input
  per panel. A commit is BLANK when `value === ''` and
  `validity.badInput` is false; invalid when `validity.badInput` is
  true or the value is not an integer from 0 to 100; otherwise it is
  the percentile q. What each shows — no read-off, a hint with no
  marker, or the marker and its output — and the 100th-percentile
  endpoint are [§5.12](#512-charts)'s.

Rejection mechanics, for R1 and R2 (fixed here) — R3 rejects only
through them, R4 and R5 reject nothing, and R6 presents its own
invalid value (§5.12):

- the field's text stays exactly as typed;
- the rejected field — for R1, the field just committed, or at an
  R3 switch every non-BLANK slip field — gets `aria-invalid="true"`,
  and the error line's id is appended to its `aria-describedby`;
- one status announcement carries the error line
  ([§5.11](#511-accessibility-supported-environments-and-navigation-lifecycle));
- focus never moves (§5.11);
- the Scenario does not change, so nothing renders: the results,
  the summary, and the download keep describing the last accepted
  scenario — "the rejected value never appears in the
  active-scenario summary or in download provenance" (PDD §3.5) —
  and the download stays enabled; only the unavailable state of
  [§5.10](#510-failure-states) disables it;
- the marks clear — attribute and id removed, line emptied — at the
  field's next accepted commit (for R1, an accepted commit of either
  slip field), on switching away from its mode, and on Reset.

**Two-arm sediment selection.** "The selectable state is therefore
the combination of sediment arm and label, not the label alone"
([PDD §3.2 — Sediment strength and structure (FR-S2)](pdd.md#32-sediment-strength-and-structure-fr-s2)).
The uniform arm's fieldset presents the `arm_strength_states`
entries whose `set` is `Homogeneous`, the layered arm's those whose
`set` is `Heterogeneous`, each in manifest order — Weak, Moderate,
Strong, then, in the layered arm only, Random Heterogeneous,
Cohesive Top Unit, Alternating Strong-Weak
([§3.2](#32-artifact-manifest)) — and each checkbox toggles one
`(set, sediment_strength)` pair. The arm names "Uniform" and
"Layered" are the PDD's. A label displays as its data string except
where the registry's display-label map, keyed by the data string,
gives the PDD spelling — today only `Alternating Strong-Weak` →
"Alternating Strong–Weak" (PDD §3.2). The arm-ambiguity helper text
renders under the control; the PDD describes it without giving its
wording, so it is fixed here: "The same word means different built
profiles in the two arms." The letter-coded profile refinement
renders as a collapsed `<details>` whose summary is "Advanced"
(PDD §3.2), holding a `disabled` `<fieldset>` with no inputs,
pending [R-2](prd.md#91-scientific-and-data-dependencies), as the
PDD reserves it.

**Displacement window.** The two text inputs of R1 carry the
fixed-here labels "Minimum (m)" and "Maximum (m)" under the legend
"Fault slip at depth (m)"; both endpoints are inclusive
([PDD §3.4 — Displacement window (FR-S5)](pdd.md#34-displacement-window-fr-s5)).
Directly after the legend, `<p id="gre-slip-range">` holds the
PDD's descriptive label — "FR-S5's "approximately 0–5 m" stays as
the descriptive label beside the control" (PDD §3.4) — as the
PDD-sourced registry entry "approximately 0–5 m" citing PDD §3.4.
The window is inactive by default and after Reset
([D-22](pdd.md#1-decision-register)): "A window becomes active only
when the user sets an endpoint or enters offset mode (whose
converted windows are always active)" (PDD §3.4). Both inputs name
`gre-slip-range` and then the helper line `#gre-slip-help` in
`aria-describedby`. The helper line is generated from the manifest,
never frozen — the export's "actual recorded range and recording
step (~0.05 m)" the PDD states beside the control. Its fixed-here
template is "Recorded range: {min}–{max}
m. Recording step: about {step} m.", with `{min}` and `{max}` the
`String()` of `slip_window_bounds.min` and `.max`, and `{step}` =
`displayRound(stage_spacing.mean, 2)` ([§5.8](#58-view-layer)) —
`0.05` for the drafting value 0.0501 m of
[§3.2](#32-artifact-manifest). The PDD's "recording step" is this
simulation stage spacing; `slip_window_bounds.recording_step`
(1e-4 m) is the stored-unit grid of R1 and is never shown.

**Reset.** One button, "Reset" (PDD §3.7). Its `click` makes one
reducer call that replaces the Scenario with the default — every
Scenario control of the table above at its default: all dips, pairs,
depths, densities, and scarp types selected, the window inactive, the
entry mode slip, the population all-stages, and, when inverse mode
ships, forward mode ([§5.14](#514-inverse-mode-p2)) — per
[PDD §3.7 — Population, scarp filter, family view, reset](pdd.md#37-population-scarp-filter-family-view-reset)
and
[FR-S8 — Default and reset state](prd.md#fr-s8-default-and-reset-state).
The same click sets the display state's family view to off, because
PDD §3.7 lists the family view among the §3.1–§3.8 controls Reset
restores; empties every text field and its last-committed record;
clears every error mark and the dip-range echo; and calls
`sync(scenario)`. Focus is on Reset at that point
([§5.11](#511-accessibility-supported-environments-and-navigation-lifecycle)),
so no field under edit is overwritten. The overlay switch, the
per-panel views, read-offs, show-all states, chart-data
disclosures, and the width panel's log-scale state are display
state of the results, outside PDD §3.7's list, and stay as they
are; so do the `<details>` open states.

**Layout and scenario summary.** Wide screens render `#gre-controls`
as an input rail beside the results; small screens stack it above
the results
([PDD §3 — Scenario page: inputs](pdd.md#3-scenario-page-inputs));
the switch is one stylesheet breakpoint at 768 CSS px (fixed here),
above the 360 px floor of
[PDD §9.2 — Browser and mobile baseline (D-16, Proposed)](pdd.md#92-browser-and-mobile-baseline-d-16-proposed).
The one-line scenario summary renders in `#gre-summary`, the first
element of the skeleton ([§5.8](#58-view-layer) region model),
above the controls and the results at all times. Below the
breakpoint it is the PDD's "persistent summary of the active
scenario" (PDD §3), by this reading (fixed here): `#gre-summary` is
`position: sticky` with `top: 2.4rem`, `z-index: 1`, and the opaque
background `var(--md-default-bg-color)`. The offset 2.4rem is the
height of Material's own sticky header, `.md-header` (`top: 0`,
`z-index: 4`, a title row 2.4rem tall), and the offset at which
Material's sticky sidebar, `.md-sidebar`, stops — both rules of
`assets/stylesheets/main.ec1eaa64.min.css` in mkdocs-material
9.7.7 — so the header never covers the summary. The summary's
containing block holds the whole application inside `#gre-root`: it
stays in view while the reader works through the stacked controls
and the results, and it leaves with the end of the application. So
that it never hides a focused control (WCAG 2.2 SC 2.4.11, Focus Not
Obscured (Minimum)), a `ResizeObserver` that the mount attaches to
`#gre-summary` at the first commit writes its border-box height in
CSS px to the custom property `--gre-summary-block` on `#gre-root`,
and below the breakpoint the stylesheet gives every element inside
`#gre-root` the rule
`#gre-root * { scroll-margin-top: calc(2.4rem + var(--gre-summary-block, 0px)) }`,
whose id selector outranks the `.md-typeset [id]` margin of
[§5.11](#511-accessibility-supported-environments-and-navigation-lifecycle).
That has the effect of a `scroll-padding-top` of the summary's
height on the document, which the application cannot set: it
writes nothing outside `#gre-root` except the `tabindex="-1"` that
the fragment-link guard of
[§5.11](#511-accessibility-supported-environments-and-navigation-lifecycle)
gives a target that cannot otherwise take focus
([§6.1](#61-build-outputs-asset-paths-and-page-scaffold)). The
summary's text comes from the pure `summaryText(state, counts)` of
`src/views/summary.ts`, where `state` is the accepted Scenario with
the manifest dictionaries it was accepted against. Every token is
generated from state
([FR-G3 — Reader-facing labels and data-driven text](prd.md#fr-g3-reader-facing-labels-and-data-driven-text)),
in the token order of the PDD §3 example — dip, sediment, depth,
density, window, population, scarp filter, matching records —
joined with ` · ` (U+00B7 with a space each side), and the
summary's first character is upper-cased. "All" means every entry
of the group's dictionary. A list slot — `{dips}`, `{items}`,
`{depths}`, `{densities}`, `{classes}` — joins its items with
` or `, in the order stated for it. The tokens, fixed here where
the PDD gives no text:

| Token | All selected, or no window | Empty group | Otherwise |
|---|---|---|---|
| dip | `any dip` | `no fault dip selected` | `dip {dips}`, each dip as `{d}°`, ascending (PDD §3: "Dip 30° or 40°") |
| sediment | `any sediment` | `no sediment strength selected` | `{items}`, the per-label items below |
| depth | `any depth` | `no sediment depth selected` | `depth {depths} m`, ascending (PDD §3: "depth 5 or 10 m") |
| density | `any density` (PDD §3) | `no sediment density selected` | `density {densities}`, in dictionary order |
| window | `slip: any` (PDD §3.4), slip mode with no window | — | slip mode: `slip {min}–{max} m` from the effective endpoints (PDD §3: "slip 0–3 m"); offset mode: `offset 0–{X} m (converted to slip per dip)`, `{X}` the accepted offset maximum |
| population | — | — | `all stages in window` (PDD §3) with an active window; `all recorded stages` (PDD §3.7) in slip mode with no window; `one state per simulation trial` for the one-state population |
| scarp filter | `all scarp types (no filter)` (PDD §3.7) | `no resulting scarp type selected` | `scarp type {classes}`, in canonical order |
| count | — | — | `matching records: {count}` (PDD §3), the count through `formatCount` ([§5.8](#58-view-layer)) |

The sediment token is lossless over the nine pairs. For each label
with at least one selected arm, in the order of the label's first
appearance in `arm_strength_states` (Weak, Moderate, Strong, Random
Heterogeneous, Cohesive Top Unit, Alternating Strong-Weak), the item
is `{L} — uniform and layered` when both arms select it (PDD §3.2),
`{L} (uniform)` when only the uniform arm does (PDD §3), and
`{L} (layered)` when only the layered arm does, `{L}` passing
through the display-label map; so the pairs
{(`Homogeneous`, `Strong`), (`Heterogeneous`, `Weak`)} read
`Weak (layered) or Strong (uniform)`. `settingsText(state)` is the
summary without the population and count tokens — the "settings
portion" of
[PDD §6.2 — File naming](pdd.md#62-file-naming) — and
`populationText(state)` is the population token alone. The count is
the engine's matching-record count, deliberately not labeled "N"
(PDD §3). All three functions are pure; downloads
([§5.9](#59-downloads)) and the P2 chart export
([§5.12](#512-charts)) reuse them verbatim wherever the PDD requires
"the scenario summary's wording".

*Verification (planned):* `scenario-controls.test.ts` —
`controlModel` option lists equal the fixture manifest's
dictionaries, `arm_strength_states` in manifest order, defaults
equal the manifest-derived values, and the display-label map
applies; `dipRangeEcho` statuses and dips. `parse.test.ts` — every
grammar-G and table example above, the stored bounds `0.00005` →
`lo_s` 1, `5.01349` → `hi_s` 50134, `5.0135` → `hi_s` 50135, entries
with twelve decimals, and each rejection. `summary.test.ts` — the
PDD tokens verbatim, the sediment token distinct over all 512 pair
subsets, and the empty-group and offset tokens
([§7.4](#74-application-tests)). The browser lane
([§7.5](#75-browser-test-lane)) drives the rejected entries and the
mode switch — slip 0–3; offset with an empty field (no error, summary
unchanged); `3` and Enter (offset token and flags); back to slip
(fields `0` and `3`, summary "slip 0–3 m"); then `6` and Enter in
the slip maximum (rejected), offset mode, and slip mode again, which
rejects at the switch (both slip fields marked, the summary still
the offset token) — keeps focus and an uncommitted draft through a
held field-export response, and asserts the collapsed, disabled
Advanced group. `render.spec.ts` asserts the descriptive label
"approximately 0–5 m" and the helper line against the served
manifest — `String` of `slip_window_bounds.min` and `.max`, and
`displayRound(stage_spacing.mean, 2)`. In the `mobile` project,
`keyboard-responsive.spec.ts` asserts `#gre-summary` in the viewport
and its box clear of the focused control's, first with focus on the
first fault-dip checkbox and then on Reset, reached by Tab.

References:

- [PDD §3 — Scenario page: inputs](pdd.md#3-scenario-page-inputs)
  and its §3.1–§3.5, §3.7.
- [§3.2 Artifact manifest](#32-artifact-manifest) (control
  dictionaries, `arm_strength_states`, `slip_window_bounds`,
  `stage_spacing`).
- [HLDD §6 — Application architecture](hldd.md#6-application-architecture)
  (View layer; Scenario state and shared-link encoding).
- [HLDD §6.1 — Failure honesty (ADR-0010)](hldd.md#61-failure-honesty-adr-0010)
  (Invalid or out-of-range input).
- [HLDD §7.2 — Accessibility and supported environments](hldd.md#72-accessibility-and-supported-environments)
  (native controls; focus).
- [FR-S5 — Displacement window](prd.md#fr-s5-displacement-window);
  [FR-S8 — Default and reset state](prd.md#fr-s8-default-and-reset-state).

### 5.8 View layer

The view layer renders the query engine's results and never
re-implements filtering or statistics
([HLDD §6 — Application architecture](hldd.md#6-application-architecture),
View layer). It is split the way [§5.1](#51-modules-and-interfaces)
requires. Pure builders compute every value and string:
`src/views/summary.ts` ([§5.7](#57-scenario-controls)),
`src/views/stats-table.ts`, `src/views/notices.ts`,
`src/views/format.ts`, `src/views/copy.ts` with
`src/views/copy.json` (the copy registry below),
`src/views/charts.ts` and `src/views/chart-text.ts`
([§5.12](#512-charts)), `src/views/assist.ts` with
`assistLines(input)`, the assist panel's lines of
[§5.5](#55-offset-to-slip-conversion-assist),
`src/views/render-input.ts`, which declares `RenderInput` (below),
`src/views/offer.ts` (P2), and `src/overlay/model.ts`. The
browser-only appliers — `src/views/dom/` (`panels.ts`,
`controls.ts`, `table.ts`, `notices.ts`, `glossary.ts`, `svg.ts`,
`marks.ts`, and `render.ts`) and `src/overlay/field-overlay.ts` —
construct nodes only from builder output and commit them; no
incremental DOM diffing and no framework.

Each render pass receives one immutable `RenderInput` — the engine
result with the statistics and histograms computed from it
([§5.1](#51-modules-and-interfaces) event flow), the accepted
Scenario snapshot they were computed from with its sequence number
([§5.3](#53-query-engine)), and the `Vintage` they were computed
over — plus the current display state
([§5.6](#56-scenario-state-and-url-encoding)). `RenderInput` also
carries what the assist panel, the caveats, the overlay, and
`buildPackage` read beyond the result, in four members named here
and used under these names everywhere:

- `windows` — in offset mode, the `PerDipWindows`
  ([§5.5](#55-offset-to-slip-conversion-assist)) that the result's
  `convertWindows` produced for every modeled dip and its `query`
  used;
- `flags` — in offset mode, one `{ faultDip, rangeFlag }` per
  selected dip, ascending by `faultDip`, with
  `rangeFlag(window, bounds)` of §5.5 against the vintage
  manifest's `slip_window_bounds`, computed in the frame that
  computes the result ([§5.3](#53-query-engine));
- `regression` — in offset mode, the loaded `Regression`
  ([§3.5](#35-regression-export): its `relationship` strings and
  coefficient rows) that the windows were converted with;
- `field` — the loaded field-export rows, `FieldRow[]`
  ([§3.4](#34-field-data-export)), while the field export's state
  ([§5.3](#53-query-engine) item 3) is `ready`; the string `'failed'`
  while it is `failed`; and null otherwise.

`windows`, `flags`, and `regression` are null in slip mode. The
frame that computes a result fixes every member but `field`; a later
render — a display-only update, or the re-render of the slots that
read `field` when the field export's state changes (§5.3 item 3) —
takes a `RenderInput` with the same computed members and the current
`field`, so it repeats no calculation. The scheduler
keeps the `RenderInput` of the last committed frame, which its
`lastRenderInput()` returns ([§5.3](#53-query-engine)); it is the
only object downloads may read ([§5.9](#59-downloads)), and
`buildPackage` never reads its `field` member.

**Region model.** The first commit replaces the no-JS fallback body
inside `#gre-root`
([§6.1](#61-build-outputs-asset-paths-and-page-scaffold)) with one
stable skeleton through `#gre-root.replaceChildren(…)`
([§5.10](#510-failure-states), startup step 3); no skeleton element
is re-created while the mount lives. The skeleton, in document
order:

- `#gre-summary` — the scenario summary of
  [§5.7](#57-scenario-controls), first, so that below the §5.7
  breakpoint it stays in view above the controls and the results
  (§5.7, Layout and scenario summary);
- `#gre-controls` — every §5.7 control: the checkbox groups; the
  dip-range field, Apply, and `#gre-dip-echo`; the entry-mode
  radios; the slip fields with `#gre-slip-range`, `#gre-slip-help`,
  and `#gre-slip-error`; the offset field with `#gre-offset-error`
  and `#gre-assist-body`; the population radios and the explainer
  `<details>`; the family toggle and `#gre-family-note`; the
  Advanced `<details>`; and Reset;
- the results header — while `copy.json` holds the fixed-here entry
  `ddd5.8.prototypeNotice`, first the prototype notice, a
  `<p id="gre-prototype">` built at mount and never replaced, holding
  that entry's text, "Prototype — shared for the research team's
  review; not yet released." (fixed here, and listed for the
  [SC-7](pdd.md#101-success-criteria) (scientific sign-off) review
  like every fixed-here text: the "short notice that it is a
  prototype under review" of
  [ADR-0017 — An unadvertised prototype deployment precedes the public release](../adr/0017-unadvertised-prototype-before-public-release.md)
  for the unlisted prototype of
  [§6.1](#61-build-outputs-asset-paths-and-page-scaffold), whose
  activation commit deletes the entry and with it the notice); then
  `#gre-caveats`; the overlay switch, an
  `<input type="checkbox" id="gre-overlay">` inside its `<label>`;
  and the "Download this result" button,
  `<button type="button" id="gre-download">`;
- `#gre-panels` — the three panel sections below, each with its
  skeleton controls;
- `#gre-state` (`tabindex="-1"`) — the empty-state explainer or the
  unavailable notice, empty otherwise;
- `#gre-versions` — the product footer that
  [§6.2](#62-software-and-data-version-stamps) names, "Software
  version {software} · Data-export version {data}" (fixed here),
  `{software}` the `data-software-version` and `{data}` the
  `data-data-version` stamp of `#gre-app`, filled whenever the
  skeleton is committed and left empty when either stamp is missing
  or empty — the page footer that "always" names both versions
  ([PDD §7.2 — Version display and notice (D-15, Proposed)](pdd.md#72-version-display-and-notice-d-15-proposed));
- the two live regions that `start(a, tag)` of
  [§5.11](#511-accessibility-supported-environments-and-navigation-lifecycle)
  created before the commit, kept and never re-created.

A render pass does only two things. It replaces the children of
slot elements — `#gre-summary`, `#gre-assist-body`, `#gre-caveats`,
`#gre-state`, and per panel `.gre-n`, `.gre-notice`, `.gre-legend`,
`.gre-chart`, `.gre-info`, `.gre-table`, and the read-off `<output>`
— whose content is generated text plus links, buttons, and the
chart-data `<details>`; every focusable element generated into a
slot carries a deterministic `data-focus-key` (`disclaimer-full`,
`glossary:{anchor}`, `overlay-source:{measurement}:{source}`,
`showall:{measurement}`, `chart-data:{measurement}`, the table
scroll wrappers' `gre-{measurement}-bins` and
`gre-{measurement}-field`, and from P2
`how-measured:{measurement}`) for the focus rule of
[§5.11](#511-accessibility-supported-environments-and-navigation-lifecycle).
And it sets `checked`, `disabled`, `hidden`, or `value` on skeleton
controls, never `value` on `document.activeElement`. The echo and
the two error lines of `#gre-controls` change only through the
[§5.7](#57-scenario-controls) event handlers. The empty and
unavailable states set `hidden` on `#gre-panels` and fill
`#gre-state`; they never remove the panels or the results header.

**Measurement panels.** The arrangement is
[DD-4](#1-ddd-decision-register): the three panels render stacked
inside `#gre-panels`, in the canonical measurement order — scarp
height, deformation-zone width, scarp dip — each a `<section>` with
`tabindex="-1"` and the id `{pid}` = `gre-{measurement}` under the
[DD-10](#1-ddd-decision-register) names (`gre-scarp_height`,
`gre-dzw`, `gre-scarp_dip`), headed by an `<h2>` holding its
canonical label with unit. Initial focus and scroll sit at the first
panel, with the fragment exception of
[§5.11](#511-accessibility-supported-environments-and-navigation-lifecycle);
the reserved fourth slot ([D-20](pdd.md#1-decision-register), Us − Ud
as a fourth displayed measurement) is a documented insertion point
after the third — a fixed comment at the
measurement-order array in `src/views/dom/panels.ts`. "Default
measurement on load: scarp height"
([PDD §4.1 — Measurement views (FR-O1)](pdd.md#41-measurement-views-fr-o1)):
the display state's selected measurement (default `scarp_height`)
names the panel that receives initial focus and scroll and the
panel a P2 shared link restores
([PDD §7.1 — Shared links](pdd.md#71-shared-links)). Panel contents,
in this order:

1. the panel head: the `<h2>`, then the `.gre-n` slot with N, "the
   matching valid-measurement count, displayed at the panel head at
   all times" (PDD §4.1), as "N = {N} valid measurements" (fixed
   here, the wording of the PDD §6.3 count line); the scarp-dip head
   also holds the PDD §5.4 provisional notice and the width head the
   PDD §5.7 width-scope note, both stable text built at mount;
2. the view switch — a radio pair, "Histogram" / "Cumulative", in a
   `<fieldset>` under the legend "Chart view" (labels and legend
   fixed here), one active view per panel kept in display state; the
   opening view is the histogram (fixed here: the PDD §4.1 listing
   order), and changing it is a display-only update that repeats no
   calculation
   ([HLDD §6 — Application architecture](hldd.md#6-application-architecture)).
   On the width panel the switch is followed by the log-scale toggle
   that [DD-5](#1-ddd-decision-register) (Histogram bin rule) offers
   — the PDD §4.1 option to "offer a log scale toggle where the
   matched range spans more than two decades": a checkbox,
   `<input type="checkbox" id="gre-dzw-log">` inside its `<label>`,
   labeled "Logarithmic scale" (fixed here). It is shown exactly
   while the panel's histogram view renders a chart and the latest
   computed result's `dzw` `histogramLog` is non-null — the offer
   rule of [§5.12](#512-charts) (Logarithmic scale) — and `hidden`
   otherwise. Its `checked` mirrors the display state's `logScale`,
   which is false whenever `histogramLog` is null
   ([§5.6](#56-scenario-state-and-url-encoding)); toggling it is a
   display-only update of the width panel that announces nothing
   ([§5.11](#511-accessibility-supported-environments-and-navigation-lifecycle)).
   The cumulative view stays linear (§5.12);
3. the `.gre-notice` slot — the small-result warning when N is 10–29,
   empty otherwise;
4. the `.gre-legend` slot, filled only while the chart renders — in
   histogram view the scarp-type legend (swatch and text label per
   stacking group, [§5.12](#512-charts)); while the overlay is on,
   also the overlay legend on the height and width panels and the
   PDD §4.4 note on the scarp-dip panel (Field overlay, below);
5. the `.gre-chart` slot — when N is at least the chart floor
   (`chartFloorBelow()`, 10, [§5.13](#513-application-configuration)),
   the `<figure>` of [§5.12](#512-charts) and, directly after it,
   the chart-data disclosure `<details id="{pid}-data">`, whose
   `<summary>` reads "Chart data" (fixed here) and whose markup,
   tables, and open state (`chartDataOpen`) are
   [§5.11](#511-accessibility-supported-environments-and-navigation-lifecycle)'s.
   When the chart is suppressed, the slot holds the tier's notice
   standing in for the chart, and no figure or disclosure. The slot
   keeps at least the chart's height ([§5.12](#512-charts) geometry)
   in both cases, so a tier change shifts nothing below it;
6. the read-off, in cumulative view while the chart renders: the
   stable input `{pid}-pct` and its `<output id="{pid}-pct-out">`
   slot ([§5.12](#512-charts));
7. the `.gre-info` slot, in histogram view while the chart renders —
   the DD-5 bin rule in the bin-rule sentence of
   [§5.12](#512-charts); on the width panel, while the log-scale
   toggle is shown, followed by the logarithmic-scale sentence of
   §5.12. Both sentences are `fixed-here` entries citing §5.12, which
   states them verbatim;
8. the `.gre-table` slot — the statistics table.

The chart is therefore followed by its chart-data disclosure, then
the read-off or the info note, then the statistics table.

**Statistics tables.** `.gre-table` holds one real HTML `<table>`,
built by `src/views/dom/table.ts` from
`statsRows(stats, measurement, cfg)` of `src/views/stats-table.ts`;
it renders in every state with matching records and is the
canonical text alternative for the chart
([PDD §4.2 — Statistics table (FR-O2)](pdd.md#42-statistics-table-fr-o2);
[PDD §9.3 — Accessibility target (D-17, Proposed)](pdd.md#93-accessibility-target-d-17-proposed),
[D-17](pdd.md#1-decision-register)). Rows in the PDD §4.2 order,
labeled (fixed here) "Valid count", "Excluded null count", "Median",
"16th percentile", "84th percentile", "Minimum", "Maximum", "Mean",
and "Standard deviation". The table caption is the statistics
framing of
[PDD §5.5 — Statistics framing (CR-5)](pdd.md#55-statistics-framing-cr-5).
A null statistic — all seven at valid 0, the standard deviation at
valid 1 ([§5.4](#54-statistics)) — shows `—` (U+2014, fixed here).
Values are display-rounded at render time only, to the precisions
of [D-23](pdd.md#1-decision-register) (Reader-facing display
precision per quantity) held in configuration
([§5.13](#513-application-configuration)); the engine's float64
results are never mutated, and the same full-precision values feed
[§5.9](#59-downloads).

Display rounding is one pure function, `displayRound(v, decimals)`
in `src/views/format.ts`, implemented identically as
`display_round` in the reference generator
([§3.6](#36-reference-results)), so the app's strings compare
exactly with the generator's `display` strings
([§7.2](#72-calculation-parity-tests)). It is fixed here, because
D-23 gives precisions but no tie rule, and the two languages' default
rounding differs:

1. `v` must be finite; a non-finite value is an internal failure
   ([§5.10](#510-failure-states)).
2. Take the shortest round-trip decimal string of `|v|` —
   `String(Math.abs(v))` in TypeScript, `repr(abs(v))` in Python,
   exponent forms included. ECMA-262 `Number::toString` makes the
   digit count as small as possible, so a decimal tie appears in
   the string exactly when it round-trips to `v`, on the same side
   in both languages.
3. Round half away from zero to `decimals` places by integer or
   string arithmetic on those digits — in Python,
   `Decimal(repr(abs(v))).quantize(Decimal(1).scaleb(-decimals), ROUND_HALF_UP)`.
4. If the rounded magnitude is zero, emit no sign; otherwise prefix
   the ASCII hyphen-minus `-` (U+002D) when `v < 0`.
5. Emit exactly `decimals` fraction digits, with no grouping.

At two decimals 3.635 → `3.64`, 1.005 → `1.01`, −0.055 → `-0.06`,
and −0.004 → `0.00`; at zero decimals 89.5 → `90` and −12.5 → `-13`
— vectors of the [§3.6](#36-reference-results)
`synthetic.display_rounding` cases. `decimals` is the quantity's
D-23 precision as a count of places — scarp height and slip 2,
width 1, dip 0 — equal to the reference envelope's
`display_decimals`. The one function formats the table, the
read-off, axis ticks, bin labels, converted windows, and
`statistics.csv` ([§5.9](#59-downloads)). Counts render through
`formatCount(n)` in the same module: exact digits with comma
thousands separators, never a locale API (fixed here: locale output
is not deterministic across engines).

When the matching population holds unclassified records, the
table's `<tfoot>` adds the line of
[PDD §4.3 — Unclassified records (D-12, Proposed)](pdd.md#43-unclassified-records-d-12-proposed)
("Unclassified records excluded from scarp-type views: X (zero-slip
initial stages).") with X the `formatCount` of the engine's matched
class-code-255 count; the reference carries the same count as
`counts.unclassified` ([§3.6](#36-reference-results)), compared
exactly. [D-12](pdd.md#1-decision-register)'s population semantics
apply in the engine, not here. The `<tfoot>` gains the "How were
these measured?" link,
`<a href="../measurements/" data-focus-key="how-measured:{measurement}">`,
in the release that ships the measurements page
([PDD §8.3 — How the measurements are made (FR-E2)](pdd.md#83-how-the-measurements-are-made-fr-e2),
P2; [§6.4](#64-product-pages-beyond-the-scenario-page-p2p3)).

**Result notices — exactly one at a time.** The pure
`selectNotices(input, cfg)` of `src/views/notices.ts` returns a
`NoticePlan`: the results-level state (`'empty'` or none), one
notice key or none per panel, and `caveats` — the active caveats of
the list below, each a registry key with its slot values, in this
order: the PDD §5.4 scarp-dip notice, in every plan while
[D-5](pdd.md#1-decision-register) (Scarp-dip correction status at
release) stands; the low-slip caveat when its trigger holds; then
the per-dip line of each `partly_out` selected dip, by ascending
dip. It implements
[PDD §4.5 — Small, empty, and partial results (FR-O3, D-11 Proposed)](pdd.md#45-small-empty-and-partial-results-fr-o3-d-11-proposed)
with the [D-11](pdd.md#1-decision-register) (Small-result warning
threshold, chart floor, and empty-result diagnosis rule) thresholds
`smallResultWarnBelow()` and `chartFloorBelow()` of `config.ts`
([§5.13](#513-application-configuration)) and the texts of
[PDD §5.8 — Small and empty results (FR-O3, D-11)](pdd.md#58-small-and-empty-results-fr-o3-d-11).
`src/views/dom/notices.ts` places them, and provenance block 9 of
[§5.9](#59-downloads) writes `caveats` as the plan returns them,
never re-deriving them:

- zero matching records — `#gre-panels` is hidden and `#gre-state`
  holds the empty-state explainer, the fourth §5.8 text, naming the
  engine's single-condition diagnostic set
  ([§5.3](#53-query-engine)); the scenario summary and its count stay
  visible, which carries the count accompaniment of
  [FR-O3 — Small or empty result sets](prd.md#fr-o3-small-or-empty-result-sets)
  (PDD §4.5);
- otherwise, per panel by valid count N: N = 0 — the
  no-valid-measurement notice (third text) stands in for the chart;
  1–9 ("N < 10 valid") — the chart is suppressed, and the
  suppression notice (second text) stands in for it beside the
  statistics table; 10–29 ("N < 30 valid") — the chart renders, and
  the warning (first text) fills `.gre-notice`; 30 and above — no
  result notice.

Slots fill as rendered: `{N}` and `{X}` through `formatCount`;
`{measurement}` the panel's canonical label without its unit,
lower-cased ("scarp height", "deformation-zone width", "scarp dip");
`{condition(s)}` the engine's `diagnosedConditions`, which carry the
[§3.6](#36-reference-results) `diagnosed_conditions` keys in that
section's order, each key named — `fault_dip` "fault dip",
`sediment` "sediment strength", `depth` "sediment depth", `density`
"sediment density", `window` "displacement window", `scarp_class`
"resulting scarp type" — and joined with `, ` and a final ` and `
(names and joiner fixed here, after the PDD §5.11 labels). The
population is never a diagnosed condition, and relaxing the window
means the inactive slip-mode window (§5.3). The registry holds the
explainer as two parts, "No simulations match this scenario." and
"Relaxing any one of {condition(s)} alone would produce matches.";
the second renders only when the diagnosed set is non-empty (fixed
here: the PDD §4.5 rule diagnoses single conditions only, so a
scenario that needs two relaxations has an empty set). "Exactly one
§5.8 result notice shows at a time" (PDD §4.5); the caveats below
coexist with any of them.

**Caveats — independent, coexisting.**

- Scarp-dip provisional notice
  ([D-5](pdd.md#1-decision-register), text of
  [PDD §5.4 — Scarp-dip provisional notice (FR-O4, D-5)](pdd.md#54-scarp-dip-provisional-notice-fr-o4-d-5)):
  rendered everywhere scarp dip appears — the scarp-dip panel head,
  the download provenance ([§5.9](#59-downloads)), and the dip
  panel's chart export ([§5.12](#512-charts)) — while D-5 stands.
- Low-slip caveat ([D-4](pdd.md#1-decision-register) (Low-slip
  measurement-reliability policy), text of
  [PDD §5.9 — Low-slip caveat (D-4, Interim)](pdd.md#59-low-slip-caveat-d-4-interim)):
  fires when an active window includes slip below the configured
  `lowSlipCaveatBelowMetres` (0.5 m,
  [§5.13](#513-application-configuration)) — concretely, when the
  stored lower bound `lo_s` of the direct window
  ([§5.7](#57-scenario-controls) R1) or of any selected dip's
  converted window in `windows` (`storedBounds`,
  [§5.3](#53-query-engine)) is below
  `t_s`, `lowSlipThresholdStored()` of `config.ts` (§5.13) — 5,000
  at 0.5 m. An offset-mode window starts at the
  back-projection of 0 m, `window_lo(d)`, which lies below 0.5 m for
  every dip on the shipped vintage
  ([§5.5](#55-offset-to-slip-conversion-assist)), so there every
  offset-mode scenario with a selected dip fires it. The
  inactive-window default never fires it
  ([PDD §4.6 — Low-slip caveat (D-4, Interim)](pdd.md#46-low-slip-caveat-d-4-interim)).
- Partial coverage: the per-dip flags belong to the assist panel
  ([§5.5](#55-offset-to-slip-conversion-assist)); for each selected
  dip whose `flags` entry is `partly_out`, `#gre-caveats` also
  carries the per-dip out-of-range line of
  [PDD §5.6 — Conversion assist (FR-S5, D-3)](pdd.md#56-conversion-assist-fr-s5-d-3)
  — "never a silent clip" (PDD §4.5). Its `{Dip}` is the dip in
  degrees and its `{Y}` that dip's `window_hi(d)` — the converted
  slip of the entered maximum, written by `displayRound(v, 2)` as
  §5.5 writes the window line's `{hi}`, so it equals the reference
  `window_hi_display` ([§3.6](#36-reference-results)) (fixed here);
  coverage falls short only at the upper end (§5.5), so the
  window's upper end is the value beyond the modeled range.
  `out_of_range` is unreachable on any vintage the
  [§4.1](#41-export-task-and-validation) export accepts, so no copy
  exists for it (§5.5).
- Short disclaimer
  ([PDD §5.2 — Short disclaimer](pdd.md#52-short-disclaimer)): the
  first line of `#gre-caveats` in every state that commits the
  skeleton — all but the [§5.10](#510-failure-states) capability
  notice, which builds none — the empty and the unavailable states
  included, since the results header sits outside the `#gre-panels`
  they hide. Its `[Full disclaimer →]` renders as
  the link `<a href="#gre-disclaimer" data-focus-key="disclaimer-full">`
  to the persistent section outside `#gre-root` that holds
  [PDD §5.1 — Standing disclaimer (CR-4; D-10 Open)](pdd.md#51-standing-disclaimer-cr-4-d-10-open)
  verbatim, so it stands without JavaScript and survives every
  render ([§6.1](#61-build-outputs-asset-paths-and-page-scaffold)).
  A click on it is taken by the fragment-link `guard` of
  [§5.11](#511-accessibility-supported-environments-and-navigation-lifecycle),
  which scrolls `#gre-disclaimer` into view and focuses it, writing
  no history entry, so following the link never re-mounts the
  application.

`#gre-caveats` holds the short disclaimer, then the plan's `caveats`
other than the scarp-dip notice, which stands at the scarp-dip panel
head: the low-slip caveat, then the coverage lines by ascending dip.
The placement puts every applicable caveat in the default view of
the result it applies to, never in a footnote — the
[SC-5](pdd.md#101-success-criteria) candor rule
([CR-8 — Reader-visible caveats](prd.md#cr-8-reader-visible-caveats)).

**Copy registry.** Reader-facing text lives in
`src/views/copy.json`, which `src/views/copy.ts` imports (esbuild's
JSON loader; `resolveJsonModule`), checks for shape with
`satisfies`, deep-freezes, and exposes through typed accessors —
the entries "that cite their copy-deck section" of the
[Verification contract](#verification-contract). Each entry has
`key` (unique), `source` (`docs/app/pdd.md#<fragment>`, or
`docs/app/ddd.md#<fragment>` for a fixed-here entry, whose cited
section states the text verbatim), `part` (its 0-based order within
the source, because one PDD subsection can hold several texts — §5.6
three, §5.7 two, §5.8 four — and a text whose sentences have
different use sites is split into consecutive parts), `text`, and
`slots`. Keys follow one pattern, `{doc}{section}.{name}`: `{doc}`
is `pdd` or `ddd`, `{section}` the number of the section `source`
cites, and `{name}` a lowerCamelCase name unique within that
section, as in `pdd5.6.perDipLine` and `ddd5.7.slipRejection`. The
text is verbatim and keeps the PDD's own placeholder spelling and
emphasis: `{N}`, the bare `X` of PDD §4.3, `[Full disclaimer →]`,
and the `**` markers of PDD §5.3 and §5.7. Views compose text only
by filling slots, by joining registry items with registry joiners,
by omitting a part where this document says so, by rendering a
bracketed placeholder as the element its use site names, and by
rendering a `**…**` span as `<strong>` — the PDD's emphasis, shown as
the PDD sets it; a plain-text use, such as `provenance.txt` or an
announcement, drops the markers. No module writes a reader-facing
sentence of its own, so every template of the state-generated
texts — the summary tokens of [§5.7](#57-scenario-controls), the
announcements of
[§5.11](#511-accessibility-supported-environments-and-navigation-lifecycle),
the failure texts of [§5.10](#510-failure-states) — is a registry
entry. Some texts are not in the registry; each is authored once
between copy markers: in `scenario.md`
([§6.1](#61-build-outputs-asset-paths-and-page-scaffold)), the PDD
§5.1 standing disclaimer, in the `#gre-disclaimer` section, so the
bundle never carries its pending D-10 slot, which stands there as
PDD §5.1's bracketed text verbatim, and the §5.10 no-JS
fallback body, inside `#gre-root`, which must stand before any
script runs; and in `glossary.md`, a page the application never
renders, the two glossary additions of
[§6.4](#64-product-pages-beyond-the-scenario-page-p2p3). The
use-site map:

| Copy (PDD §5) | Use site | Trigger |
|---|---|---|
| [PDD §5.1 — Standing disclaimer (CR-4; D-10 Open)](pdd.md#51-standing-disclaimer-cr-4-d-10-open) | `scenario.md`'s `#gre-disclaimer`, outside `#gre-root`, between `<!-- copy:docs/app/pdd.md#51-standing-disclaimer-cr-4-d-10-open -->` and `<!-- /copy -->` ([§6.1](#61-build-outputs-asset-paths-and-page-scaffold)); not in `copy.json`; linked from every product surface | always; releasable only once [D-10](pdd.md#1-decision-register) text lands ([§7.7](#77-site-validation-and-release-checklist)) |
| [PDD §5.2 — Short disclaimer](pdd.md#52-short-disclaimer) | first line of `#gre-caveats`; `[Full disclaimer →]` as the `#gre-disclaimer` link | every state that commits the skeleton (all but the [§5.10](#510-failure-states) capability notice) |
| [PDD §5.3 — Population explainer (FR-S6)](pdd.md#53-population-explainer-fr-s6) | `<details>` beside the population switch ([§5.7](#57-scenario-controls)) | reader opens it |
| [PDD §5.4 — Scarp-dip provisional notice (FR-O4, D-5)](pdd.md#54-scarp-dip-provisional-notice-fr-o4-d-5) | scarp-dip panel head; provenance block 9 ([§5.9](#59-downloads)); dip chart export (P2) | while [D-5](pdd.md#1-decision-register) stands |
| [PDD §5.5 — Statistics framing (CR-5)](pdd.md#55-statistics-framing-cr-5) | every statistics-table `<caption>` | with every table |
| [PDD §5.6 — Conversion assist (FR-S5, D-3)](pdd.md#56-conversion-assist-fr-s5-d-3) | first text: `#gre-assist-body` ([§5.5](#55-offset-to-slip-conversion-assist)); per-dip line: `#gre-caveats` and provenance block 9; rejected-entry line: `#gre-offset-error` ([§5.7](#57-scenario-controls)) | offset mode; each `partly_out` dip; a rejected offset commit |
| [PDD §5.7 — Field-overlay framing (CR-6, FR-O5)](pdd.md#57-field-overlay-framing-cr-6-fr-o5) | four parts: the framing's first two sentences, its width sentence, `[Show all field widths]` (the width panel's show-all toggle), and the width-scope note — overlay legends and the width panel head | overlay on; the note always on the width panel |
| [PDD §5.8 — Small and empty results (FR-O3, D-11)](pdd.md#58-small-and-empty-results-fr-o3-d-11) | five parts: the warning in `.gre-notice`; the suppression and no-valid-measurement notices in `.gre-chart`; the explainer's two sentences in `#gre-state` | the tiers above |
| [PDD §5.9 — Low-slip caveat (D-4, Interim)](pdd.md#59-low-slip-caveat-d-4-interim) | `#gre-caveats`; provenance block 9 | the low-slip trigger above |
| [PDD §5.10 — Inverse-search framing (FR-X2)](pdd.md#510-inverse-search-framing-fr-x2) | inverse results header ([§5.14](#514-inverse-mode-p2)) | inverse mode (P2) |
| [PDD §5.11 — Labels, units, and glossary links (FR-G3, CR-3, CR-7)](pdd.md#511-labels-units-and-glossary-links-fr-g3-cr-3-cr-7) | every control and panel label; glossary links | always |
| [PDD §5.12 — Morphology descriptions (FR-E1; research-group review required)](pdd.md#512-morphology-descriptions-fr-e1-research-group-review-required) | the body of `morphology.md` ([§6.4](#64-product-pages-beyond-the-scenario-page-p2p3), P2) | page render |
| [PDD §5.13 — Measurement explanation (FR-E2)](pdd.md#513-measurement-explanation-fr-e2) | the body of `measurements.md` ([§6.4](#64-product-pages-beyond-the-scenario-page-p2p3), P2) | page render |

How the PDD §5.12 and §5.13 texts of those two P2 pages are checked
is the record that follows step 8 of the
[§5.13](#513-application-configuration) check.

Entries also come from PDD sections outside §5, each verbatim from
its section's body: the control, option, and arm labels — the
population legend "Population" among them — the sediment display
label, and the family-view note of PDD §3.2–§3.7; the PDD §3.4
descriptive label "approximately 0–5 m"
([§5.7](#57-scenario-controls));
the PDD §3.5 range-flag terms `in-range`, `partly-out-of-range`, and
`out-of-range` ([§5.5](#55-offset-to-slip-conversion-assist));
the PDD §4.3 unclassified line; the PDD §4.4 switch label,
"Analogous, not identical" label, scarp-dip note, and field-group
labels; the PDD §6.1 button label; and, from P2, the PDD §8.3 link
text. Every other reader-facing string is a fixed-here entry,
defined where it is used:

| Defined in | Fixed-here entries |
|---|---|
| [§5.5](#55-offset-to-slip-conversion-assist) | the assist panel's window line and provenance line |
| [§5.7](#57-scenario-controls) | the dip-range label, echo, and Apply; the slip-field labels (the offset field reuses "Maximum (m)"), helper line, and rejection line; the entry-mode legend; the population explainer's summary; the dip and depth option formats; the arm helper text; the summary tokens and joiners |
| [§5.8](#58-view-layer) (this section) | the prototype notice, until activation; the product footer; the N line; the view-switch labels and legend; the log-scale toggle label; the chart-data disclosure label; the statistics row labels and null mark; the condition names and their joiner; the height show-all label, limited-comparison form, and field-export line |
| [§5.9](#59-downloads) | the provenance labels, citation and DOI texts, and empty-caveat line |
| [§5.10](#510-failure-states) | the no-JS fallback body and its `<noscript>` sentence, in `scenario.md`'s `#gre-root` between copy markers citing §5.10, not in `copy.json`; the capability notice; the unavailable notice and its reasons |
| [§5.11](#511-accessibility-supported-environments-and-navigation-lifecycle) | the announcement templates; the chart label, caption, and chart-data table templates |
| [§5.12](#512-charts) | the axis titles, pre-mark labels, read-off strings, segment title, the "below 0.1 m" label, and both info-note sentences |
| [§5.14](#514-inverse-mode-p2) (P2) | the observed-range rejection line, condition name, and summary token |
| [§6.4](#64-product-pages-beyond-the-scenario-page-p2p3) | the PFDHA and engineer-of-record glossary entries, in `subprojects/mkdocs/docs/glossary.md` between copy markers citing §6.4, not in `copy.json` |

The [§5.13](#513-application-configuration) check lists every
fixed-here text, in `copy.json` or between copy markers, for the
[SC-7](pdd.md#101-success-criteria) (scientific sign-off) review,
the approval these strings receive
([CR-10 — Scientific-content approval](prd.md#cr-10-scientific-content-approval)).

User-visible behaviors are indexed the same way. A user-visible
choice of this document — the [DD-4](#1-ddd-decision-register),
[DD-5](#1-ddd-decision-register), [DD-6](#1-ddd-decision-register),
[DD-9](#1-ddd-decision-register), [DD-11](#1-ddd-decision-register),
and [DD-12](#1-ddd-decision-register) rows, and each user-visible
behavior marked "fixed here", which the table below indexes by its
defining section — closes only with the owner's acceptance of that
section ([Authority and change control](#authority-and-change-control));
a section that marks a further one fixed here adds it to the table.

| Defined in | Fixed-here user-visible behaviors |
|---|---|
| [§5.3](#53-query-engine) | the empty-result diagnostic's reading of "relaxing that condition alone": one condition group reset to its default, the population never relaxed, an offset-mode window relaxed to the inactive slip-mode window; the field export's four states, a retry showing neither the failure line nor marks while it loads; a committed result that a newer accepted Scenario supersedes before its announcement's write, never announced |
| [§5.5](#55-offset-to-slip-conversion-assist) | the conversion coefficients shown to six decimals in the assist panel's provenance line |
| [§5.7](#57-scenario-controls) | grammar G's readings — a lone comma as the decimal point, the canonical forms, the 16-character limit, R4's included; the 1000 m bound on the offset maximum; a lone slip endpoint read as a window from 0 or to the recorded maximum; Enter in the dip-range field activating Apply; no error for a never-committed blank offset field at the mode switch; the rejection mechanics, a switch's judgment of the retained texts included; the 768 CSS px breakpoint; the sticky summary below it |
| [§5.8](#58-view-layer) (this section) | the prototype notice at the head of the results header while `copy.json` holds its entry, which the activation commit of §6.1 deletes; the histogram as each panel's opening view; the display-rounding tie rule and the comma thousands separator; the explainer's second sentence only with a non-empty diagnosed set; a partial scarp-type filter unchecking and disabling the family toggle; the 60 % fill opacity; the overlay source-link targets; `{Y}` of the per-dip line as the window's upper end; the DD-4 overlay reading (the switch stays enabled, the scarp-dip note in its legend) |
| [§5.9](#59-downloads) | one ZIP archive per download; a header-only records file for an empty match; `model_family` left out of `records.csv`; the full-precision `statistics.csv` columns |
| [§5.10](#510-failure-states) | the capability probe's order, which orders the notice's API list; the unavailable state terminal for the mount |
| [§5.11](#511-accessibility-supported-environments-and-navigation-lifecycle) | focus moved after mount only for slot replacement and for hidden, disabled, or emptied focus, never scrolling; the fragment-link guard — a same-page link scrolls to its target and focuses it, adding `tabindex="-1"` when needed, with no history entry; the scroll to a fragment target outside `#gre-root` after the first commit; the chart-data table scroll wrappers (`.gre-table-scroll`, `overflow-x: auto`); the quantity and range formats |
| [§5.12](#512-charts) | the chart geometry and margins; the 1–2–5 tick rule; the stacking order, first class at the bottom; no bar stroke; the unclassed cumulative curve, its value-axis span with constant data centered on one display step, and its decimation above 512 distinct values; the pre-mark and read-off guides through (`quantileLinear(sorted, q / 100)`, q / 100); the 12 px overlay band in every chart; empty plot for marks beyond the bins; one coalesced re-render per resize frame; the logarithmic-scale rendering; (P2) the chart export's presentation-attribute-only drawing, its PNG at twice the CSS resolution, and its `_chart-{measurement}.png` and `_chart-{measurement}.txt` file names |
| [§5.14](#514-inverse-mode-p2) (P2) | the inverse-mode switch at the head of `#gre-controls`; the signed grammar; conjoined observed ranges |
| [§6.1](#61-build-outputs-asset-paths-and-page-scaffold) | the `#gre-disclaimer` section's place, after `#gre-root` and before the include block |
| [§6.4](#64-product-pages-beyond-the-scenario-page-p2p3) | the PDD §5.11 entry-or-gloss alternative for engineer of record closed as a glossary entry; (P2) the morphology page's acceptance of the family toggle's reset to unchecked by the first same-page fragment link after a direct load, at most once per direct load |

Glossary links follow the PDD §5.11 anchor map, carried as registry
entries. The linker, `linkGlossary` of the applier
`src/views/dom/glossary.ts`, wraps the first DOM-order occurrence
of each mapped term (case-insensitive, whole words) in a link to
its site-glossary anchor, `href="../glossary/#{anchor}"` with
`data-focus-key="glossary:{anchor}"`, and leaves later occurrences
plain — the first-use rule as a mechanism, not an editorial habit.
It links the stable skeleton text once at mount and, on each render
pass, only the terms whose first occurrence lies in a replaced slot.
Text inside a `<label>`, `<summary>`, `<button>`, or `<svg>` is never
linked: a link there would nest interactive content or vanish from
the accessibility tree.

PDD §5.11 also needs two glossary additions before launch: "PFDHA;
engineer of record (or an in-context gloss)". The Glossary additions
(MVP) paragraph of
[§6.4](#64-product-pages-beyond-the-scenario-page-p2p3) states both
entries and closes the in-context-gloss alternative for engineer of
record as a glossary entry. The linker's anchor map stays PDD
§5.11's, which names neither term.

**Family view ([D-13](pdd.md#1-decision-register)).** A display-time
fold kept in display state (`familyView`): with "Group collapse
variants" on, the histogram's stacking groups and legend merge each
collapse variant into its base type, colored with the three base
types' palette entries from the manifest, text identification
retained
([PDD §3.7 — Population, scarp filter, family view, reset](pdd.md#37-population-scarp-filter-family-view-reset)).
Engine results, counts, and statistics are unchanged — a fold never
alters the matching population. The toggle is enabled only while
all six types are selected; a scarp-filter change that leaves fewer
than six disables it, unchecks it, and sets `familyView` to false
(fixed here: a disabled toggle never shows a fold that is not
applied). While it is disabled, `#gre-family-note`, which its
`aria-describedby` names, shows the PDD §3.7 note "Family grouping
needs all six types"; while it is enabled, the note is `hidden`.
Reset sets it to off ([§5.7](#57-scenario-controls)). The remaining
presentation details are adopted by citation, as PDD §3.7 fixes,
from `docs/dashboards/visual-identity.md`: class fills at 60 %
opacity over white — inside its 55–65 % range, the value fixed
here — and black field marks. Dominance and offers ignore the toggle
([PDD §6.4 — Animation offer and dominance (FR-D4, P2; D-7 Proposed)](pdd.md#64-animation-offer-and-dominance-fr-d4-p2-d-7-proposed)).

**Field overlay.** `src/overlay/field-overlay.ts` draws the
[§3.4](#34-field-data-export) rows that the
[§5.3](#53-query-engine) scheduler requests through
`loadFieldExport(url)` of `decode/` when the switch turns on
([§5.2](#52-artifact-loading-and-decoding)); the pure
`src/overlay/model.ts` selects them through
`overlayRows(rows, measurement, showAll)`, `overlayGroups(rows)`,
and `overlayNote(measurement)`. Field rows never reach the engine:
they enter no statistic, no count, and no matching population
([HLDD §6 — Application architecture](hldd.md#6-application-architecture),
Field overlay). Mechanics, each a citation of
[PDD §4.4 — Field overlay (FR-O5, D-18 Proposed)](pdd.md#44-field-overlay-fr-o5-d-18-proposed)
([D-18](pdd.md#1-decision-register)):

- one switch, "Compare with field measurements (past earthquakes)",
  the `#gre-overlay` checkbox of the results header, off by default.
  It is display state, not
  part of the Scenario: PDD §3.7's Reset covers the §3.1–§3.8
  scenario controls, and the overlay is a PDD §4.4 results control,
  so Reset leaves it alone; a P2 shared link restores it with the
  rest of the display state
  ([PDD §7.1 — Shared links](pdd.md#71-shared-links));
- on, the scarp-height and width panels draw the rows whose
  `analogue` names their measurement as the overlay marks of
  [§5.12](#512-charts) — black ticks in the 12 px overlay band that
  §5.12 reserves in every chart, so switching the overlay never
  moves the plot; one group per (`source`, `source_quantity`) pair,
  never pooled — and their
  `.gre-legend` slot carries the overlay legend: the PDD §4.4 label
  "Analogous, not identical"; the PDD §5.7 framing (its first two
  sentences on the height panel; its whole first text on the width
  panel, where `[Show all field widths]` renders as that panel's
  show-all toggle); then one entry per group, in the PDD §4.4 order
  below. An entry's label is the PDD §4.4 wording for its pair —
  followed, when the group's rows carry `limited_comparison`, by the
  fixed-here suffix " (limited comparison: a displacement quantity,
  not a width)" in PDD §4.4's words — and links to the source's
  section of the site's data page,
  "for obtaining the field data separately"
  ([PDD §6.1 — Download package (FR-D1)](pdd.md#61-download-package-fr-d1));
  the link targets are fixed here, relative to the scenario page's
  published depth:

  | Panel | `source` | `source_quantity` | Label | Link |
  |---|---|---|---|---|
  | height | `FDHI` | `vs_central_meters` | FDHI vertical separation | `../data/#fdhi-flatfile` |
  | height | `SURE` | `SH` | SURE's scarp-height measurement | `../data/#sure-database` |
  | height | `Kern` | `Vertical` | Kern County's vertical scarp-height values | `../data/#kern-county-1952` |
  | width | `FDHI` | `fzw_central_meters` | FDHI fault-zone width | `../data/#fdhi-flatfile` |
  | width | `Kern` | `DZW` | Kern County deformation-zone width | `../data/#kern-county-1952` |
  | width | `SURE` | `FNC` | SURE fault-normal component | `../data/#sure-database` |

- default sets — PDD §4.4's "project's established labeled event
  set", whose membership per source is a D-18 choice of the owner
  with research-group review, recorded in the pipeline constant from
  which [§3.4](#34-field-data-export) takes `labeled_set`: the
  scarp-height panel shows rows with `labeled_set`
  true; the width panel shows rows with `labeled_set` true and
  `criterion_sub50` equal to `met` (the paper's less-than-50-metre
  criterion). Each panel's one-action expansion is a toggle button
  in its legend with `aria-pressed` — "Show all field widths" on the
  width panel (PDD §5.7), "Show all field measurements" on the
  height panel (fixed here, after PDD §4.4's "show all field
  measurements") — which shows every row of that panel's analogue;
  its state is per-panel display state;
- while the overlay is on, the scarp-dip panel's `.gre-legend` slot,
  where the other panels carry their overlay legend, holds the
  PDD §4.4 note "Field sources provide no comparable scarp-dip
  measurement." (`overlayNote('scarp_dip')`). The header switch
  stays enabled, because one switch serves three panels visible at
  once ([DD-4](#1-ddd-decision-register)). The arrangement makes the
  PDD §4.4 rule "for scarp dip, the switch is disabled with the
  note" unworkable as written, so this is DD-4's reading of it, not
  a rewrite: user-visible, it closes with the owner's acceptance of
  this section, as DD-4's arrangement does, or with a PDD
  amendment. The note is HTML text,
  never drawn inside the chart's `<svg>`, whose content assistive
  technology does not see ([§5.12](#512-charts));
- while a panel draws ticks, its chart-data disclosure adds the field
  table of
  [§5.11](#511-accessibility-supported-environments-and-navigation-lifecycle),
  listing exactly the rows the ticks mark;
- field marks never use a scarp-class color
  ([FR-G2 — Scarp-type colors and identification](prd.md#fr-g2-scarp-type-colors-and-identification));
- a failed field-export load leaves the simulation results untouched
  and puts the fixed-here line "Field measurements could not be
  loaded. The simulation results are unaffected." in the height and
  width legends ([§5.10](#510-failure-states)) while `field` is
  `'failed'` and the overlay is on; the retry of
  [§5.3](#53-query-engine) item 3 removes it.

The Kern County preset — "Worked example: Kern County (1952)" — is
withheld: no preset entry renders while
[D-6](pdd.md#1-decision-register) is open ("the preset ships only
after it",
[PDD §4.7 — Kern County worked example (FR-O6, D-6 Open)](pdd.md#47-kern-county-worked-example-fr-o6-d-6-open)).
When D-6 closes, the preset is a predefined Scenario plus display
state (the width panel selected, the overlay on), the field-data
group selected through the export's `kern_field_group` field (null
in every row until then, [§3.4](#34-field-data-export)), and
walkthrough copy joining the registry.

**Animation offer (P2).** `src/views/offer.ts` computes the
[D-7](pdd.md#1-decision-register) rule of
[PDD §6.4 — Animation offer and dominance (FR-D4, P2; D-7 Proposed)](pdd.md#64-animation-offer-and-dominance-fr-d4-p2-d-7-proposed)
from the engine's per-class counts over classified matching records
only, with the rule's four numbers as configuration entries
([§5.13](#513-application-configuration)): the dominant type is the
most frequent; the offer adds any type within 10 percentage points
(ties included), up to three types in descending share, a tie at
the cap resolved by canonical order; an anchor share below 30 %, or
fewer than 20 classified records, yields the full six-type menu;
zero classified records suppresses the offer entirely. Shares
display as whole percent ([D-23](pdd.md#1-decision-register)) with
the classified denominator named in the copy. Offers ignore the
family toggle and always name the six types; animations come
through the media index ([§3.7](#37-media-index-p2)) with the PDD
§6.4 introduction line. The per-class reference counts join
[§3.6](#36-reference-results) when this ships.

**Presentation precedence per update.** In order: the unavailable
state ([§5.10](#510-failure-states)) overrides everything; else zero
matching records hides `#gre-panels` and fills `#gre-state` with the
explainer, while the summary with its count and `#gre-caveats` stay;
else `#gre-state` is empty and every panel renders with its single
result notice per the tiers, the caveats coexisting. `#gre-caveats`
attaches to the results header independently of the tiers.

*Closes:* DD-4, DD-5. *Verification (planned):* DD-4 and DD-5 —
with the overlay reading and the log-scale toggle above — close on
the owner's acceptance of this section, with the browser lane's
`golden-scenario.spec.ts`, `a11y.spec.ts`, and `mount.spec.ts`
([§7.5](#75-browser-test-lane)) as evidence — the last asserting,
after a fragment-free direct load, focus on `#gre-scarp_height` and
that panel in the viewport, DD-4's default-panel rule. Those
specs and the [§7.2](#72-calculation-parity-tests) parity harness
compare every displayed statistic string with the reference
`display` strings and every displayed count, `counts.unclassified`
included, with the reference counts exactly
([§3.6](#36-reference-results)). `notices.test.ts` runs
`selectNotices` at N = 0, 9, 10, 29, 30 and at zero matches, and on
injected `RenderInput`s asserts the plan's `caveats` in their
order: the scarp-dip notice first; the low-slip caveat for a direct
window whose `lo_s` is `t_s − 1`, not for one at `t_s`, for a
converted window below `t_s`, and never for the inactive window;
and a per-dip line, its `{Y}` from `windows`, for exactly the
`partly_out` entries of `flags`. `views-text.test.ts` runs
`displayRound` on the `synthetic.display_rounding` vectors and
`statsRows` ([§7.4](#74-application-tests)). `render.spec.ts`
asserts the info note's bin-rule sentence and the PDD emphasis of
the population explainer and the overlay framing as `<strong>`
elements, with no literal `**`; the browser lane drives the
width-panel log-scale toggle from
[GS-0](pdd.md#102-golden-scenarios) (Empty
scenario (no active slip window), default population) — visible,
switched on to the logarithmic bin table, hidden again for a
selection whose positive widths span two decades or less
([§7.5](#75-browser-test-lane)); offer shares (P2) are recomputable
from the per-class reference counts that join
[§3.6](#36-reference-results). The
[§5.13](#513-application-configuration) check
`.github/scripts/check_pdd_agreement.py` compares every PDD-sourced
`copy.json` text with its PDD section and every fixed-here text in
`copy.json` or between copy markers — the copy-marked fallback body
of [§5.10](#510-failure-states) included — verbatim with the DDD
section it cites, so each
fixed-here string must stand verbatim in its cited section; it
resolves every `source` fragment under GitHub's slug rule. It
establishes verbatim
reproduction, not that a fixed-here string is acceptable — that is
the SC-7 review.

References:

- [HLDD §6 — Application architecture](hldd.md#6-application-architecture)
  (View layer; Field overlay).
- [PDD §4.1 — Measurement views (FR-O1)](pdd.md#41-measurement-views-fr-o1);
  [PDD §4.2 — Statistics table (FR-O2)](pdd.md#42-statistics-table-fr-o2);
  [PDD §4.3 — Unclassified records (D-12, Proposed)](pdd.md#43-unclassified-records-d-12-proposed);
  [PDD §4.4 — Field overlay (FR-O5, D-18 Proposed)](pdd.md#44-field-overlay-fr-o5-d-18-proposed);
  [PDD §4.5 — Small, empty, and partial results (FR-O3, D-11 Proposed)](pdd.md#45-small-empty-and-partial-results-fr-o3-d-11-proposed);
  [PDD §4.6 — Low-slip caveat (D-4, Interim)](pdd.md#46-low-slip-caveat-d-4-interim);
  [PDD §4.7 — Kern County worked example (FR-O6, D-6 Open)](pdd.md#47-kern-county-worked-example-fr-o6-d-6-open).
- [PDD §5 — Copy deck](pdd.md#5-copy-deck) (the use-site map
  above).
- [PDD §6.4 — Animation offer and dominance (FR-D4, P2; D-7 Proposed)](pdd.md#64-animation-offer-and-dominance-fr-d4-p2-d-7-proposed).
- [§3.4 Field-data export](#34-field-data-export);
  [§3.6 Reference results](#36-reference-results).
- [FR-G2 — Scarp-type colors and identification](prd.md#fr-g2-scarp-type-colors-and-identification);
  [CR-8 — Reader-visible caveats](prd.md#cr-8-reader-visible-caveats).

### 5.9 Downloads

The download component generates files in the browser; nothing is
sent to a server
([HLDD §6 — Application architecture](hldd.md#6-application-architecture),
Downloads). It is a builder/applier pair
([§5.1](#51-modules-and-interfaces)): the pure `src/download/`
modules — `package.ts` with
`buildPackage(input, stamps, generatedAt: Date)`, which returns
`{ fileName, bytes }`; `csv.ts`, the CSV writer; `zip.ts` with
`zip(members, modified: Date)`, which returns a `Uint8Array`; and
`file-name.ts`, the [DD-6](#1-ddd-decision-register) slug and
template — compute the archive, and the browser-only
`src/download/deliver.ts` reads the clock and hands the bytes to
the browser.

**Consistency invariant.** The package is produced by one action,
the "Download this result" button `#gre-download` in the results
header
([PDD §6.1 — Download package (FR-D1)](pdd.md#61-download-package-fr-d1)).
Its handler, in `deliver.ts`, reads the clock once
(`generatedAt = new Date()`) and the `RenderInput` of the last
committed frame, which `scheduler.lastRenderInput()` of its
`Wiring` returns ([§5.3](#53-query-engine); [§5.8](#58-view-layer))
— the engine result with the accepted Scenario snapshot it was
computed from and, in offset mode, the `windows`, `flags`, and
`regression` it was converted with — and calls `buildPackage` with
them and the page's version stamps
([§6.2](#62-software-and-data-version-stamps)): the whole package is
a pure function of those three arguments and the
[§5.13](#513-application-configuration) configuration, and
provenance block 8, the `{date}` token, and every ZIP timestamp use
the one instant. `buildPackage` never reads the `RenderInput`'s
`field` rows (PDD §6.1, below). A download therefore never combines
current settings with previous results
([HLDD §6.1 — Failure honesty (ADR-0010)](hldd.md#61-failure-honesty-adr-0010)).
A rejected entry leaves the button enabled, and the package
describes the last accepted scenario ([§5.7](#57-scenario-controls));
the button is disabled only in the unavailable state of
[§5.10](#510-failure-states). An empty match downloads a package
whose records file holds the header row only (fixed here:
deterministic and honest).

**Package form.** One ZIP archive per action (fixed here), written
by `zip.ts` without compression and without a dependency
([§2](#2-repository-structure-naming-and-toolchain)). Members, in
this order, each UTF-8 without a byte-order mark (encoded with
`TextEncoder`): `records.csv`, `statistics.csv`, `provenance.txt`,
`scenario.json`. The byte format, fixed here so an independent
reader can check it, with every integer little-endian:

- each member: a local file header — signature `0x04034b50`; version
  needed 20; flags 0 (ASCII names, no data descriptor); method 0
  (stored); DOS time `(h<<11)|(m<<5)|(s>>1)` and DOS date
  `((y−1980)<<9)|(mo<<5)|d` from `modified`'s UTC fields; the
  CRC-32; compressed and uncompressed sizes, both the byte length;
  the name length; extra length 0 — then the name and the raw bytes;
- one central-directory header per member, in the same order —
  signature `0x02014b50`; version made by 20; version needed 20; the
  same flags, method, time, date, CRC, and sizes; the name length;
  extra and comment lengths 0; disk 0; internal and external
  attributes 0; the member's local-header offset — then the name;
- the end-of-central-directory record — signature `0x06054b50`; disk
  numbers 0; 4 entries on this disk and 4 in total; the central
  directory's size and offset; comment length 0.

The CRC-32 uses the reflected polynomial `0xEDB88320`, initial value
`0xFFFFFFFF`, and final xor `0xFFFFFFFF`, with a 256-entry table
built once. There is no zip64: `zip` throws `RangeError` when a size
or offset reaches `0xFFFFFFFF` or the entry count `0xFFFF`, which is
unreachable — a `records.csv` row is at most a few hundred bytes,
and the artifact holds 346,834 records
([§3.2](#32-artifact-manifest)). The archive leaves as a `Blob` of
type `application/zip`: `deliver.ts` creates its object URL, appends
to `#gre-root` an `<a download="{fileName}">` element whose `href` is
that URL, clicks it, and removes it in the same task; it revokes the
previous download's object URL when it creates the next, and the
mount's abort revokes the last ([§5.10](#510-failure-states) rules
for `start`).

**`records.csv`.** One row per selected record, in artifact order
(trial order, then stage) — the order of the canonical selection
serialization of [§3.6](#36-reference-results). The header row is
`RECORDS_CSV_COLUMNS` of `src/decode/fields.ts`, under the
[DD-10](#1-ddd-decision-register) names: `trial`; then the trial
conditions in the `TRIAL_TABLE_COLUMNS` order of
[§3.1](#31-scenario-artifact-binary-layout) without `model_family` —
`fault_dip`, `sediment_strength`, `cohesion`, `set`, `depth`,
`density`; then the stage columns `slip`, `scarp_height`, `dzw`,
`scarp_dip`, `scarp_class`. The reserved `model_family` column is
excluded while only the published 2D ensemble exists (fixed here).
Values: `trial` is the manifest's trial string; `fault_dip` and
`depth` are the integer dictionary values; `sediment_strength`,
`cohesion`, `set`, and `density` are the manifest dictionary
strings verbatim; `slip` and each measurement are written from the
recorded integer `s` — `stored + offset_steps` for the scaled
columns, the dictionary's thousandths for scarp dip
([§3.1](#31-scenario-artifact-binary-layout)) — with exactly the
column's `decimals` fraction digits (slip 4, the others 3; both
values from the manifest's `columns`, [§3.2](#32-artifact-manifest))
by integer arithmetic, never through a float: `-` (U+002D) when
`s < 0`, then the digits of `|s|`, left-padded with zeros to
`decimals + 1` digits, with the point before the last `decimals`, so
`s = −182` at 3 decimals is `-0.182`. A null is an empty field;
`scarp_class` is the canonical class name, empty for an
unclassified record. The file is UTF-8 with LF line ends, header row
first, a field quoted only when it contains `,`, `"`, CR, or LF,
inner quotes doubled — RFC 4180 quoting, with the LF line end fixed
here. It carries the pipeline's recorded vocabulary, not display
labels; the reader-facing wording lives in `provenance.txt`.

**`statistics.csv`.** One row per measurement panel, in canonical
measurement order, under `STATISTICS_CSV_COLUMNS`: `measurement`
(the DD-10 name), `label` (the canonical label with unit,
[PDD §5.11 — Labels, units, and glossary links (FR-G3, CR-3, CR-7)](pdd.md#511-labels-units-and-glossary-links-fr-g3-cr-3-cr-7)),
`valid`, `excluded_null`, then the
[FR-O2 — Summary statistics](prd.md#fr-o2-summary-statistics) set
under the [§3.6](#36-reference-results) keys — `median`, `p16`,
`p84`, `min`, `max`, `mean`, `sd` — holding the display-rounded
strings exactly as rendered (`displayRound`,
[§5.8](#58-view-layer), [D-23](pdd.md#1-decision-register)), then
`median_full`, `p16_full`, `p84_full`, `min_full`, `max_full`,
`mean_full`, `sd_full` holding the engine's float64 values as
`Number.prototype.toString` writes them (the shortest round-trip
form), so a reviewer can check both what was displayed and what was
computed ([SC-2](pdd.md#101-success-criteria), download
reproducibility) (fixed here). Counts
are plain decimal digits, without the table's thousands separators;
a null statistic ([§5.4](#54-statistics)) is an empty field in both
of its columns.

**`provenance.txt`.** UTF-8 plain text with LF line ends: nine
blocks in exactly the order of PDD §6.1, each a label line (labels
fixed here), its content lines, and one empty line.

| Block | Label | Content |
|---|---|---|
| 1 | `Paper citation` | the paper reference of `subprojects/mkdocs/docs/includes/cite.md`, as plain text |
| 2 | `DesignSafe DOIs` | one line per 2D DEM DesignSafe-CI entry under "How to cite this data" in `subprojects/mkdocs/docs/data.md` (DOIs `10.17603/ds2-xpq0-gw80` and `10.17603/ds2-gfsj-pp60`), as plain text |
| 3 | `Software version` | the `data-software-version` stamp |
| 4 | `Data-export version and date` | `{export_version} ({export_date})` from the loaded manifest |
| 5 | `Scenario settings` | `settingsText(state)` ([§5.7](#57-scenario-controls)) — the full scenario settings in the scenario summary's wording |
| 6 | `Population` | `populationText(state)` |
| 7 | `Counts` | `matching records: {count}`, then one line `{label}: N = {N}` per panel, in canonical order, counts through `formatCount` |
| 8 | `Generated (UTC)` | `generatedAt` as `YYYY-MM-DDTHH:MM:SSZ` |
| 9 | `Caveats` | one line per active caveat, or `none` |

"As plain text" means the source's Markdown emphasis and link syntax
removed, the words otherwise verbatim; blocks 1 and 2 are fixed-here
registry entries copied from those site files, which the
[§6.4](#64-product-pages-beyond-the-scenario-page-p2p3) surfaces
cite as well. Like every fixed-here text ([§5.8](#58-view-layer)),
they stand here verbatim — block 1's line, then block 2's two lines:

> Chiama, K., Bednarz, W., Moss, R., Plesch, A., and Shaw, J. H.
> (2025). "Quantifying relationships between fault parameters and
> rupture characteristics associated with thrust and reverse fault
> earthquakes." Earthquake Spectra, 41(5), 3977–4014. DOI:
> 10.1177/87552930251346434

> Chiama, K., W. Bednarz, R. Moss, A. Plesch, and J. Shaw (2024a).
> "Homogeneous 2D DEM Experiments," in Influence of sediment depth,
> sediment strength, fault dip, and slip on fault scarp morphology,
> DesignSafe-CI. DOI: 10.17603/ds2-xpq0-gw80

> Chiama, K., W. Bednarz, R. Moss, A. Plesch, and J. Shaw (2024b).
> "Heterogeneous 2D DEM Experiments," in Influence of sediment depth,
> sediment strength, fault dip, and slip on fault scarp morphology,
> DesignSafe-CI. DOI: 10.17603/ds2-gfsj-pp60

Block 9 writes, one line each, the `caveats` of the `NoticePlan`
that `selectNotices(input, cfg)` ([§5.8](#58-view-layer)) returns
for the package's `RenderInput` — never re-derived in `download/` —
each the registry text with its slots filled as the page fills
them: the PDD §5.4 scarp-dip notice, applicable in every MVP
package while [D-5](pdd.md#1-decision-register) (Scarp-dip
correction status at release) stands, because all three panels
display under [DD-4](#1-ddd-decision-register); the PDD §5.9
low-slip caveat when its §5.8 trigger holds; and each PDD §5.6
per-dip line `#gre-caveats` shows. The line `none`, fixed here,
stands for an empty list, which no MVP package reaches while D-5
stands. Field measurements are never included; the overlay legend
carries their sources and links (PDD §6.1).

**`scenario.json`.** The machine-readable identity of the scenario
([DD-11](#1-ddd-decision-register), Canonical scenario
serialization): `canonicalJson`
([§5.6](#56-scenario-state-and-url-encoding)) — keys sorted by code
point at every depth, no whitespace, non-ASCII characters unescaped
— of
`{schema_version: 1, software_version, export_version, scenario, converted_windows}`,
followed by one LF. `software_version` is the
`data-software-version` stamp and `export_version` the loaded
manifest's; `scenario` is the canonical scenario object of the
`RenderInput`'s Scenario snapshot,
`JSON.parse(serializeScenario(snapshot, manifest))`
(`src/state/scenario-json.ts`); `converted_windows` is null in slip
mode and, in offset mode, one
`{fault_dip, window_lo, window_hi, range_flag}` per selected dip in
ascending dip order — that dip's `lo` and `hi` in the
`RenderInput`'s `windows` and its `rangeFlag` in `flags`
([§5.5](#55-offset-to-slip-conversion-assist), §5.8) — its floats
written by `Number.prototype.toString` as in the `*_full` columns.
PDD §6.1 fixes the package's contents — the records, the statistics
table, and the provenance text — but no serialization; the fourth
member, `scenario.json`, is a user-visible addition that gives the
package machine identity, so it closes only with the owner's
acceptance of this section (DD-11), while `provenance.txt` keeps the
nine PDD blocks unchanged.

**File naming.** The archive name instantiates the
[PDD §6.2 — File naming](pdd.md#62-file-naming) template verbatim —
`ground-rupture-explorer_{scenario-slug}_{population}_{data-version}_{date}`
— with `.zip` appended:

- `{scenario-slug}` per [DD-6](#1-ddd-decision-register): the
  `_`-joined `key-value` tokens of every control that differs from
  its default, in the fixed key order `dip`, `sediment`, `depth`,
  `density`, `window`, `offset`, `classes`; an all-default scenario
  yields `all`. Raw values, fixed here: `dip` — the selected dips,
  ascending, joined with `-`; `sediment` — for the uniform arm
  (`Homogeneous`) and then the layered arm (`Heterogeneous`), each
  arm with a selection contributes its word, `uniform` or `layered`,
  followed by its selected labels in manifest order
  ([§5.7](#57-scenario-controls)); `depth` and `density` — the
  selected values in dictionary order; `window` (slip mode, active
  window) — `{min}-to-{max}` from the effective endpoints; `offset`
  (offset mode, which has no `window` token) — the accepted offset
  maximum; `classes` — the selected class names in canonical order.
  An empty group's raw value is `none`. Each raw value has `.`
  replaced by `p`; then it is lowercased, every character outside
  `[a-z0-9-]` becomes `-`, runs of `-` collapse to one, and leading
  and trailing `-` are dropped — so 1.5–3 m gives `window-1p5-to-3`
  and 1–5.3 m gives `window-1-to-5p3`. A slug longer than 80
  characters keeps its first 71, drops trailing `-` and `_`, and
  appends `-` plus the first 8 characters of the 16-digit lowercase
  zero-padded hexadecimal FNV-1a 64-bit hash of the full slug's
  UTF-8 bytes (vectors: `''` → `cbf29ce484222325`, `'a'` →
  `af63dc4c8601ec8c`).
- `{population}` — `all-stages` or `one-state` (fixed here).
- `{data-version}` — the manifest's `export_version`
  ([§3.2](#32-artifact-manifest)).
- `{date}` — `generatedAt` as `YYYY-MM-DD` UTC (fixed here; the name
  stays human-sortable per PDD §6.2).

The slug is injective before truncation over the manifest
vocabularies: within each group distinct values give distinct
tokens, and no token contains `_` (the sanitizer turns it into `-`),
so the `_`-joined tokens split back into their groups unambiguously.
The file-name tests check these two properties separately — every
subset of each group, and the delimiter rule — never by enumerating
complete scenarios. A truncated name keeps 32 bits of the full
slug's hash. The file name is a label, and `scenario.json` is the
scenario's identity.
Chart-export file naming reuses this base ([§5.12](#512-charts)).

*Closes:* DD-6. *Verification (planned):* `downloads.test.ts` —
`buildPackage` with a fixed `generatedAt`: the members exactly
`records.csv`, `statistics.csv`, `provenance.txt`, `scenario.json`,
in that order; both CSV column orders; `records.csv` values by the
integer rule — `s = −182` at 3 decimals written `-0.182`, a slip
with 4 fraction digits, a null as an empty field; both version
stamps; the nine
provenance label lines in the PDD §6.1 order; provenance block 5
equal to `settingsText`; on an offset-mode input with a
`partly_out` dip, block 9 equal, line for line, to the `caveats`
that `selectNotices` returns for the same input, and
`converted_windows` equal to the selected dips' injected `windows`
entries and `flags`, floats by `Number.prototype.toString`, where
slip mode gives null; `scenario.json`'s `scenario` equal to
`JSON.parse(serializeScenario(snapshot, manifest))`; no field row
in any member when `field` is set; two
`RenderInput`s never mixed. `zip.test.ts` with `test/zipcheck.py` —
`crc32('123456789')` = `0xCBF43926`; agreement with Node's
`zlib.crc32` on seeded random buffers, lengths 0, 1, and 65,536
included; signatures, offsets, and entry counts; identical bytes for
identical input and instant; and an independent reader,
`python3 -I test/zipcheck.py <file> <ISO instant> <member SHA-256s>`,
which exits 0 only if `ZipFile(file).testzip()` is `None`, the names
are the four above in order, every member is `ZIP_STORED` with
`flag_bits` 0, `date_time` equals the instant floored to 2 s, and
the member digests match; a missing `python3` fails the test, never
skips it. `file-name.test.ts` — the key order, the `.`→`p` rule,
`all`, `none`, truncation with the hash vectors, the two window
cases above, and per-token injectivity over every sediment (512),
dip (128), class (64), depth (8), and density (8) subset, with the
delimiter rule checked separately ([§7.4](#74-application-tests)).
`consistency.spec.ts`
([§7.5](#75-browser-test-lane)) runs `zipcheck.py` on a captured
download and compares its `scenario.json` with the page state.
Together these contribute to
[SC-2](pdd.md#101-success-criteria)'s reviewer path; they do not by
themselves establish it.

References:

- [PDD §6.1 — Download package (FR-D1)](pdd.md#61-download-package-fr-d1);
  [PDD §6.2 — File naming](pdd.md#62-file-naming).
- [FR-D1 — Download matching simulation records and statistics](prd.md#fr-d1-download-matching-simulation-records-and-statistics).
- [HLDD §6 — Application architecture](hldd.md#6-application-architecture)
  (Downloads);
  [HLDD §6.1 — Failure honesty (ADR-0010)](hldd.md#61-failure-honesty-adr-0010).
- [§3.1 Scenario artifact binary layout](#31-scenario-artifact-binary-layout);
  [§3.2 Artifact manifest](#32-artifact-manifest);
  [§5.6 Scenario state and URL encoding](#56-scenario-state-and-url-encoding);
  [§6.2 Software and data version stamps](#62-software-and-data-version-stamps).
- `subprojects/mkdocs/docs/includes/cite.md`;
  `subprojects/mkdocs/docs/data.md` (How to cite this data).

### 5.10 Failure states

The four categories and their honesty rules are
[HLDD §6.1 — Failure honesty (ADR-0010)](hldd.md#61-failure-honesty-adr-0010)'s:
"Invalid or out-of-range input", "No data for the selected
scenario", "Unavailable browser capabilities", and "Internal
failure" — never a blank page, never one kind presented as another.
This section fixes the checks and the mechanics: `src/main.ts` runs
the guarded startup, `src/views/dom/notices.ts` renders the
capability notice and the unavailable state, and the
[§5.7](#57-scenario-controls) free-entry table owns input rejection.

**Startup sequence (`main.ts`).** Three steps, run by the
navigation-lifecycle algorithm of
[§5.11](#511-accessibility-supported-environments-and-navigation-lifecycle).
Step 1, the capability probe below, is `missingCapabilities()` of
`src/main.ts`, which `onPageReady` calls before it claims the mount
slot, because the slot's `AbortController` is itself a probed API;
when the probe
names a missing API, `showCapabilityNotice(root, missing)` of
`src/views/dom/notices.ts` shows the capability notice and nothing
else runs. Otherwise `onPageReady` claims the slot and calls
`start(a, tag)`, with `a` the mount's `{ build, root, ac }` record
and `tag` the `#gre-app` script element. `start` never probes: after
creating the §5.11 live regions and registering its fragment-link
`guard` (§5.11), it adds the two `window` listeners of Error routing
below, then runs only steps 2 and 3, the load and the first render,
in order, inside one `try`/`catch`:

2. the load: it reads `data-software-version`, `data-data-version`,
   and `data-manifest` from `tag.dataset` at this point — never at
   module evaluation, so a re-entry sees the current page's stamps —
   and a missing or empty attribute is an internal failure
   ([§6.2](#62-software-and-data-version-stamps)); it then awaits
   the vintage through `vintageFor(tag)`, the keyed one-entry cache
   of §5.11, which runs `loadVintage` — fetch, decompression, and
   validation, the data-version and schema-version checks included
   ([§5.2](#52-artifact-loading-and-decoding));
3. the first engine run and first render: it builds the
   [§5.8](#58-view-layer) skeleton from the vintage, computes the
   default Scenario's result as sequence number 0 and hands it to
   the [§5.3](#53-query-engine) scheduler, and commits through
   `#gre-root.replaceChildren(…)` — the fallback body is replaced
   only now, "only after the corresponding interactive content is
   ready" (HLDD §6.1) — then applies the initial focus and scroll of
   [§5.11](#511-accessibility-supported-environments-and-navigation-lifecycle)
   (with a fragment in the URL: no focus move, and a fragment target
   outside `#gre-root` scrolled back into view, since this commit put
   the taller skeleton above it) and calls
   `markAfterPaint('egr:first-result', 0, …)`
   ([§7.6](#76-performance-and-compatibility-measurements)).

Rules binding `start` and everything it schedules:

- after every `await`, timer, and animation frame it returns at once
  when `a.ac.signal.aborted`; a rejection that arrives after the
  abort is logged with `console.debug`, never rendered;
- it never aborts the shared vintage load, nor the field- and
  regression-export loads kept on the same cache entry (§5.11):
  their files are content-hashed, so re-entry reuses them;
- the scheduler is per mount and stops on the signal's `abort` event
  ([§5.3](#53-query-engine) item 5);
- every listener — control, window, and document level, the two
  `window` listeners of Error routing and the §5.11 fragment-link
  `guard` included — is added by `addEventListener` with the option
  `signal: a.ac.signal`, never by assigning `window.onerror`;
  `ResizeObserver`s, the §5.7 summary observer among them,
  disconnect, and the outstanding download object URL is revoked
  ([§5.9](#59-downloads)), from the signal's `abort` event;
- after the first commit — step 3's, or that of the unavailable
  state below — it writes `#gre-summary`'s border-box height to
  `--gre-summary-block` on `#gre-root`, makes the §5.11 at-mount
  focus move or fragment-entry scroll, then sets the test hooks
  `data-gre-mounted` and `data-gre-build` (the bundle's
  `import.meta.url`) on `#gre-root`
  ([§6.1](#61-build-outputs-asset-paths-and-page-scaffold)); they
  never decide whether to mount.

**Error routing.** The two `window` listeners act only on errors of
this bundle: an `error` event whose `ErrorEvent.filename` equals
`import.meta.url`, or an `unhandledrejection` whose `reason` is an
`Error` whose `stack` contains `import.meta.url`. Each such event
enters the unavailable state below. Every other event — from the
theme, the site-wide scripts that also load on the scenario page, or
a browser extension — is left to the console, so it can never
replace valid results.

**Unavailable browser capabilities.** The scenario page's Markdown
scaffold carries the no-JS fallback body inside `#gre-root` and the
full standing disclaimer in `#gre-disclaimer` outside it
([§6.1](#61-build-outputs-asset-paths-and-page-scaffold)); the
fallback body "doubles as the page's search-indexable description"
([ADR-0010](../adr/0010-native-client-side-scenario-app.md)). It is
the honest fallback content of
[NFR-5 — Accessibility](prd.md#nfr-5-accessibility): it says what
the page does and that the interactive page requires JavaScript,
and it links to "the paper, data archive, dashboards, glossary, and
limitations". The PDD copy deck holds no such text, so the body is
fixed here, for the [SC-7](pdd.md#101-success-criteria) (scientific
sign-off) review. `scenario.md` carries exactly the content of the
fenced block below — two paragraphs, then a `<noscript>` element
holding one `<p>` — between
`<!-- copy:docs/app/ddd.md#510-failure-states -->` and
`<!-- /copy -->`, and step 7 of the
[§5.13](#513-application-configuration) check compares the text
between those markers with that content:

```markdown
Ground Rupture Explorer shows conditional results from a published
computer-simulation ensemble. Choose a scenario — fault dip,
sediment strength, depth, and density, and a fault-slip window or
an anticipated vertical surface offset — to see the scarp height,
deformation-zone width, and scarp dip of the matching simulations,
with summary statistics, and to download the matching records. The
limits of these results are stated in the
[full disclaimer](#gre-disclaimer) below.

Related pages: [the paper](paper.md),
[the data and how to cite it](data.md),
[the dashboards](index.md), and [the glossary](glossary.md).

<noscript><p>The scenario controls and results need JavaScript,
which is turned off or unavailable in this browser.</p></noscript>
```

Its five link targets are written relative to `scenario.md`:
`#gre-disclaimer` is the section after `#gre-root`; `data.md` is the
site's Data page, whose citations name the DesignSafe archive — the
PRD's "data archive"; and `index.md` is the site's home page, which
introduces the five dashboards.

The first sentence restates the PDD's own "It shows conditional
results from a published computer-simulation ensemble"
([PDD §5.1 — Standing disclaimer (CR-4; D-10 Open)](pdd.md#51-standing-disclaimer-cr-4-d-10-open));
the rest names inputs and outputs of PDD §3, §4, and §6.1 and makes
no scientific claim. The `<noscript>` text can appear only when
scripts never ran, so a startup failure is never misrepresented as
disabled JavaScript. With scripts running, step 1 tests the subset
of the
[§7.6](#76-performance-and-compatibility-measurements) required-API
inventory without which no result can be loaded, shown, or
downloaded, and never the user-agent string: a browser outside the
[PDD §9.2 — Browser and mobile baseline (D-16, Proposed)](pdd.md#92-browser-and-mobile-baseline-d-16-proposed)
baseline "is not by itself treated as proof that the application
cannot run" (HLDD §6.1). The tests, in this order (fixed here):

- `typeof` gives `'function'` for `fetch`, `ReadableStream`,
  `ReadableStream.prototype.pipeThrough`, `TextDecoder`,
  `TextEncoder`, `Uint8Array`, `Uint16Array`, `Uint32Array`,
  `Int32Array`, `Float64Array`, `DataView`, `Blob`, `URL`,
  `URL.createObjectURL`, `URL.revokeObjectURL`, `ResizeObserver`,
  `AbortController`, `requestAnimationFrame`,
  `cancelAnimationFrame`, `Element.prototype.replaceChildren`, and
  `performance.mark`;
- `new DecompressionStream('gzip')` returns without throwing
  (reported as `DecompressionStream`);
- `'download' in HTMLAnchorElement.prototype` is true (reported as
  `HTMLAnchorElement.download`).

A test that throws fails. The rest of the inventory is documented
availability only (§7.6), never probed: `MessageChannel` and the User
Timing Level 3 options object of `performance.mark` serve
measurement alone, and the `signal` option of `addEventListener`
has no type to test. On a missing capability the fallback stays
standing and `showCapabilityNotice(root, missing)` inserts, as the
first child of `#gre-root`, a `<p role="alert">` holding the
fixed-here notice "This browser lacks {apis}, which Ground Rupture
Explorer needs to show results. Use a current version of Chrome,
Edge, Firefox, or Safari." — `{apis}` the failing names in test
order joined with `, `, and the browsers those of PDD §9.2. No
skeleton is built and no live region exists.

**Internal failure.** These enter the unavailable state: a failure
in step 2 or 3 — a loader rejection, a missing or empty `data-*`
attribute of `#gre-app`
([§6.2](#62-software-and-data-version-stamps)), or a throw while
calculating or rendering, the unclassified-record check of
[§5.4](#54-statistics) included; a later throw inside the
scheduler's guarded step ([§5.3](#53-query-engine)); a failed
regression-export request of an accepted offset-mode Scenario
(below); and a routed `window` error. The
loaders of [§5.2](#52-artifact-loading-and-decoding) —
`loadVintage`, `loadRegression`, and `loadFieldExport` — reject with
`LoadError`, whose `kind` is `'retrieval'`, `'read'`,
`'schema-version'`, or `'data-version'`, the last carrying
`expected` and `loaded` (fixed here); a `SchemaError` of `mapRecord`
counts as `'read'`. The state is one presentation, built by
`notices.ts`:

- `#gre-panels` is `hidden`, and `#gre-state` holds the fixed-here
  notice "Results are unavailable: {reason}. Reload the page to try
  again.", announced through the alert region of
  [§5.11](#511-accessibility-supported-environments-and-navigation-lifecycle);
- `#gre-summary` is emptied and `#gre-caveats` keeps only the short
  disclaimer, since both otherwise describe results; every control
  in `#gre-controls`, the overlay switch `#gre-overlay`, and the
  download button `#gre-download` get `disabled`;
- before the first commit, `notices.ts` commits that same skeleton
  through `#gre-root.replaceChildren(…)` with `#gre-controls` and
  `#gre-panels` empty and `hidden`: this path reads nothing from the
  vintage, so it cannot fail for the reason the startup did.

`{reason}` names the failed step in one fixed-here phrase; a failed
regression-export request of an accepted offset-mode Scenario
(Lazy-load failures, below) takes its row whatever the error:

| Failure | `{reason}` |
|---|---|
| `'retrieval'`: a rejected fetch or a non-2xx status | the simulation data could not be downloaded |
| `'read'`: decompression, structural validation, or a missing or mistyped field | the simulation data could not be read |
| `'schema-version'`: an unsupported `schema_version` | the simulation data has a format version this application does not support |
| `'data-version'`: the loaded `export_version` differs from the page's stamp | this page expects data version {expected}, but the loaded data is version {loaded} |
| a missing or empty `data-*` attribute of `#gre-app` (`data-software-version`, `data-data-version`, or `data-manifest`) | the page is missing information it needs to load the data |
| the regression-export request of an accepted offset-mode Scenario | the conversion coefficients could not be loaded |
| any other throw, and a routed `window` error | an internal error stopped the calculation or display of results |

`{expected}` is the page's `data-data-version` and `{loaded}` the
loaded manifest's `export_version`, the two values the `LoadError`
carries, generated at the failure, never frozen. The notice is how
"the application states that results are unavailable" (HLDD §6.1).
The PDD copy deck holds no capability or unavailable-results
message, so the two notices and the reasons are fixed-here entries.
[HLDD §12 — Scope of the following documents](hldd.md#12-scope-of-the-following-documents)
asks for "error-state presentation using the messages specified in
the PDD"; as
[Authority and change control](#authority-and-change-control)
records, these entries meet it through their SC-7 approval and the
owner's acceptance of this section — an owner decision, Proposed.
Nothing stale is retained: the panels are hidden, so no empty
distribution and no stale statistics can read as a valid result
([NFR-5 — Accessibility](prd.md#nfr-5-accessibility)).
The error object is written to the console with `console.error`,
never swallowed (fixed here). The state is terminal for the mount
(fixed here: with a single exit, no later render can replace the
notice while its cause may persist): the scheduler cancels its
pending frame and ignores every later frame and lazy-load
continuation ([§5.3](#53-query-engine) item 5), and the state ends
only when a new mount starts, on re-entry or reload; the §5.11
vintage cache never keeps a failed load. Focus follows §5.11: when
the state is the mount's first render, mount focuses `#gre-state`
(with an empty `location.hash`); entered later, it moves any focus
inside `#gre-root` to `#gre-state` (§5.11, rule 2).

**Lazy-load failures.** The [§5.3](#53-query-engine) scheduler
requests the regression export for offset mode and the field export
for the overlay ([§5.2](#52-artifact-loading-and-decoding)), and a
failed load is never cached. A failed prefetch — the one the
entry-mode radio starts — shows nothing. When the request for an
accepted offset-mode Scenario fails, the unavailable state follows
with the coefficients reason, because offset-mode results cannot be
computed without the coefficients and no slip-mode substitute is
shown. A failed field-export load is not
a results failure: the simulation results stay as rendered, the
height and width legends carry the fixed-here line of
[§5.8](#58-view-layer), the switch stays on, and switching it off
and on again requests the export again. The line, and the marks that
replace it after a successful retry, are rendered from the
scheduler's field-export state with no Scenario or display change
([§5.3](#53-query-engine) item 3).

**Invalid or out-of-range input.** The constrained controls make
most invalid actions impossible (HLDD §6.1). The free entries follow
the closed free-entry table of [§5.7](#57-scenario-controls) and its
single set of rejection mechanics, under which the retained results
"visibly belong to the last valid scenario" and "the rejected value
never appears in the active-scenario summary or in download
provenance"
([PDD §3.5 — Offset-entry mode and conversion assist (FR-S5)](pdd.md#35-offset-entry-mode-and-conversion-assist-fr-s5)).
Valid offset entries that convert partly or entirely outside the
modeled range are accepted and flagged, never rejected — "The
product must never silently clip an out-of-range conversion"
([FR-S5 — Displacement window](prd.md#fr-s5-displacement-window));
no entry is silently corrected anywhere. An offset entry above
1000 m, the bound of §5.7 R2, is rejected as invalid input, so no
accepted entry can produce a non-finite converted window, on which
`convertWindows` would throw — an internal failure
([§5.5](#55-offset-to-slip-conversion-assist)). A scenario object that
`parseScenario` ([§5.6](#56-scenario-state-and-url-encoding)) cannot
accept makes it throw `ScenarioInputError`, the typed invalid-input
failure, whose `path` names the offending key or element (fixed
here). In the MVP only the tests and the parity harness parse
scenario objects; the P2 link restore will map the error to the
reader-facing rule that PDD §7.1 is to gain (§5.6).

**No data for the selected scenario.** Expected product states, not
failures — "These are results, not failures" (HLDD §6.1): the empty,
no-valid-measurement, small-result, and partial-coverage
presentations are the notice rules of [§5.8](#58-view-layer), with
their counts always visible. The empty state shares `#gre-state`
with the unavailable state but never its text, its live region
(status, not alert), or its controls (enabled, not disabled), and
the unavailable state is never phrased as "no matching records".

*Verification (planned):* `failure-states.spec.ts`
([§7.5](#75-browser-test-lane)) drives each category and asserts the
four presentations pairwise distinct. Deleting `DecompressionStream`
with an init script gives the capability notice, the fallback and
`#gre-disclaimer` standing and no skeleton. An aborted artifact
request, a truncated artifact, and a wrong-version manifest give the
unavailable state, the last naming both versions — never empty or
stale results — and the scenario HTML served by `page.route` with
`data-software-version=""` gives it with the reason "the page is
missing information it needs to load the data" and an empty
`#gre-versions`. With
every regression-export request aborted, choosing offset mode shows
nothing (the failed prefetch), and the offset `3`, committed by
moving focus to the short disclaimer's link (the field's `change`),
then gives the coefficients reason and moves focus from that link
to `#gre-state`; an aborted field-export request with the overlay on
gives the legend line, the results unchanged, and switching the
overlay off and on again unrouted gives the marks and no line. An
error thrown by an unrelated injected script leaves the results
rendered. The offset entries `abc`, `-1`, `1000.0001`, and a blank
commit, and the slip entries `abc`, `-1`, a minimum above the
maximum, and a
maximum above the recorded one, each leave the field text unchanged,
set `aria-invalid`, give the field an accessible description that
ends with its registry line verbatim — after the `#gre-slip-range`
and `#gre-slip-help` texts for a slip field — with the element the
appended id names holding exactly that line, and leave the summary
and a captured download's provenance unchanged. The short disclaimer
is present in the
[GS-4](pdd.md#102-golden-scenarios) (Alternating Strong–Weak + depth
3 m) empty state and in every unavailable state, and
`#gre-disclaimer` in every state. `check_pdd_agreement.py` compares
the copy-marked fallback body with the fenced block above
([§5.13](#513-application-configuration), step 7), and
`render.spec.ts` finds it in the page source with its five link
targets served.
`decode.test.ts`
([§7.4](#74-application-tests)) pins the `LoadError` kinds, and
`scenario-json.test.ts` the `ScenarioInputError` of an unknown key
and of an out-of-vocabulary value.

References:

- [HLDD §6.1 — Failure honesty (ADR-0010)](hldd.md#61-failure-honesty-adr-0010);
  [HLDD §12 — Scope of the following documents](hldd.md#12-scope-of-the-following-documents)
  (error-state messages).
- [ADR-0010](../adr/0010-native-client-side-scenario-app.md)
  (no-JS body as search-indexable description).
- [PDD §3.5 — Offset-entry mode and conversion assist (FR-S5)](pdd.md#35-offset-entry-mode-and-conversion-assist-fr-s5);
  [PDD §5.1 — Standing disclaimer (CR-4; D-10 Open)](pdd.md#51-standing-disclaimer-cr-4-d-10-open);
  [PDD §5.6 — Conversion assist (FR-S5, D-3)](pdd.md#56-conversion-assist-fr-s5-d-3);
  [PDD §9.2 — Browser and mobile baseline (D-16, Proposed)](pdd.md#92-browser-and-mobile-baseline-d-16-proposed).
- [NFR-5 — Accessibility](prd.md#nfr-5-accessibility);
  [FR-S5 — Displacement window](prd.md#fr-s5-displacement-window).
- [§5.2 Artifact loading and decoding](#52-artifact-loading-and-decoding);
  [§5.3 Query engine](#53-query-engine);
  [§5.6 Scenario state and URL encoding](#56-scenario-state-and-url-encoding);
  [§5.11 Accessibility, supported environments, and navigation lifecycle](#511-accessibility-supported-environments-and-navigation-lifecycle);
  [§6.2 Software and data version stamps](#62-software-and-data-version-stamps);
  [§7.6 Performance and compatibility measurements](#76-performance-and-compatibility-measurements).

### 5.11 Accessibility, supported environments, and navigation lifecycle

The conformance target is WCAG 2.2 AA
([PDD §9.3 — Accessibility target (D-17, Proposed)](pdd.md#93-accessibility-target-d-17-proposed);
[D-17](pdd.md#1-decision-register) Accessibility conformance target);
the browser baseline and the mobile floor are those of
[PDD §9.2 — Browser and mobile baseline (D-16, Proposed)](pdd.md#92-browser-and-mobile-baseline-d-16-proposed)
([D-16](pdd.md#1-decision-register) Browser and mobile baseline).
Modules ([§5.1](#51-modules-and-interfaces)): `src/a11y/announce.ts`
(live regions) and `src/a11y/focus.ts` (focus management), browser
only, and the pure chart-text generators of `src/views/chart-text.ts`
(browser and Node), whose output the appliers of `src/views/dom/`
commit; the rules below bind every view module. The visually-hidden
utility is the class `gre-visually-hidden`, the stylesheet's standard
clip pattern (`position: absolute`, a 1 × 1 px box,
`overflow: hidden`, `clip-path: inset(50%)`, `white-space: nowrap`).

**Keyboard operability.** Every control is a native HTML element
([§5.7](#57-scenario-controls)), and the MVP ships no custom widget
([HLDD §7.2 — Accessibility and supported environments](hldd.md#72-accessibility-and-supported-environments),
Controls and navigation). The only hand-written keyboard handling is
the Enter `keydown` on the free-entry text fields and on the
percentile read-off, which calls the same idempotent commit as the
field's `change` event ([§5.7](#57-scenario-controls),
[§5.12](#512-charts)). Charts are non-interactive images; every
element they draw has the text counterpart listed under Chart text
alternatives below. Focus outlines are never removed: the stylesheet
styles `:focus-visible`. Every control's pointer target measures at
least 24 × 24 CSS px — each checkbox and radio sits inside its
`<label>`, whose box is part of the target — per WCAG 2.2 SC 2.5.8,
part of the AA set of
[PDD §9.3 — Accessibility target (D-17, Proposed)](pdd.md#93-accessibility-target-d-17-proposed).

**Focus management (`focus.ts`).** At mount, after the first render
commits and only when `location.hash` is empty,
`focus({ preventScroll: true })` moves focus to the selected
measurement's panel `<section>` (`tabindex="-1"`; the selected
measurement defaults to `scarp_height`, [§5.8](#58-view-layer)) and its
`scrollIntoView()` brings it into view — the
[DD-4](#1-ddd-decision-register) initial-focus rule. When the first
render shows the empty-state explainer or a failure notice, the target
is `#gre-state` instead, because a hidden panel cannot take focus. With
a fragment in the URL — `scenario/#gre-disclaimer`, reached from a
product page's disclaimer link
([§6.4](#64-product-pages-beyond-the-scenario-page-p2p3)) — mount moves
no focus. After the first commit, of results or of the
[§5.10](#510-failure-states) unavailable state, when the fragment names
an element outside `#gre-root` (`fragmentTarget(location.hash)` of
`main.ts`, Navigation lifecycle, below), `start` calls that element's
`scrollIntoView()`, because the commit replaced the shorter fallback
above it and neither the browser's fragment anchor nor scroll anchoring
survives that. Otherwise it moves no scroll. Every `scrollIntoView()` of
this section stops below Material's sticky header (`.md-header`, 2.4rem
tall): the stylesheet gives `.md-typeset [id]`, `#gre-disclaimer`
included, `scroll-margin-top: 3.6rem`, the margin mkdocs-material
9.7.7 gives a `:target` inside `.md-typeset`
(`assets/stylesheets/main.ec1eaa64.min.css`), so the application's
scrolls clear the header as Material's own anchor scrolling does.
Material's rule alone would not serve the same-page link `guard`
(Navigation lifecycle, below), which writes no history entry and so
sets no `:target`. Below the
[§5.7](#57-scenario-controls) breakpoint, an element inside
`#gre-root` takes the sticky summary's `scroll-margin-top` of §5.7
instead, so a scroll to it also clears `#gre-summary`; `start` writes
the summary's height before the at-mount scroll (Navigation
lifecycle, below).

After mount, a render never writes `value` on
`document.activeElement`, so a field under edit keeps its text,
caret, selection, and composition ([§5.8](#58-view-layer) region
model), and it calls `focus()` in two cases only, both with
`{ preventScroll: true }` so the reader's position holds (fixed
here); the only other focus move is the reader's own same-page link
(`guard`, Navigation lifecycle, below). An element's focus fallback
is its nearest ancestor with `tabindex="-1"` that the render leaves
visible — a panel `<section>` or `#gre-state` — and otherwise
`#gre-state` while `#gre-panels` is hidden, or the selected
measurement's panel `<section>`.

1. Slot replacement. Before a render pass replaces a slot that
   contains `document.activeElement`, it records that element's
   `data-focus-key`; after the replacement it focuses the element in
   that slot that carries the same key, or, when none does, the
   slot's focus fallback.
2. Hidden, disabled, or emptied focus. When a render hides or
   disables the focused element or a container holding it, or
   empties the focused `#gre-state`, it focuses that element's focus
   fallback — `#gre-state` when the render hides `#gre-panels` for an
   empty or failure state, the selected measurement's panel
   `<section>` when results replace a focused empty-state explainer
   (the unavailable state is terminal for the mount,
   [§5.10](#510-failure-states), so results never replace it). The
   render that enters the unavailable state moves any focus inside
   `#gre-root` to `#gre-state`, the short disclaimer's link included,
   overriding rule 1 for that render.

A rejected commit never moves focus — WCAG 2.2 SC 3.2.2 counts a
focus move as a change of context — and reaches assistive technology
through the field's `aria-describedby` and one status announcement.
Reset leaves focus on the Reset button; loading moves no focus.

**Live announcements (`announce.ts`).** Two regions, each of class
`gre-visually-hidden`: one `role="status"` (polite) and one
`role="alert"`, exactly one of each inside `#gre-root` once
`start()` (Navigation lifecycle, below) runs. `start()` creates them
before the load of the [§5.10](#510-failure-states) startup sequence
and appends them to `#gre-root` after the fallback body, so they
exist before any change they announce; the first render commits
`root.replaceChildren(skeleton, status, alert)` with the same two
elements, which are never re-created (fixed here). The first commit,
of results or of the [§5.10](#510-failure-states) unavailable state,
empties the status region without announcing anything, so "Loading
simulation data…" never outlasts the load.
`announce(region, text, live?)` empties the region and writes `text`
in a later task (`setTimeout(…, 0)`), so a just-inserted region is
registered before its first text and a text repeated by two
consecutive updates is announced both times; given `live`, it writes
only if `live()` is true in that task — the binding of a settled
update to its sequence number ([§5.3](#53-query-engine) item 2).

A settled update is the render of a newly accepted Scenario
([§5.7](#57-scenario-controls) commit model). The first render is
not one — the mount's focus move conveys it — and keystrokes never
produce one: text-field `input` events refresh only the dip-assist
echo, which the field references through `aria-describedby` and
which is not a live region. The [§5.3](#53-query-engine) scheduler
emits at most one announcement per settled update, after its render
commits; a render dropped as superseded announces nothing, and so
does a committed one whose Scenario a newer accepted Scenario
supersedes before the announcement's write (§5.3 item 2);
display-only updates (§5.3) — the view switch, family view, the
overlay switch, the log-scale toggle, a chart-data disclosure — and
the resize re-render of `rerenderChart` announce nothing, since the
operated control conveys its own state or no control was operated;
and a notice or caveat the previous render already showed is never
announced again — the previous render being, here and in the
inventory below, the last render whose settled-update announcement
was written, or the first render before any; the same registry
entry, in the same panel for a notice and for the same dip for a
per-dip line, counts as shown whatever its slot values
([HLDD §7.2 — Accessibility and supported environments](hldd.md#72-accessibility-and-supported-environments),
Notices and result updates). The inventory — every quoted text is a
`fixed-here` copy-registry entry citing this section
([§5.8](#58-view-layer)), listed for the
[SC-7](pdd.md#101-success-criteria) (scientific sign-off) review:

| Event | Region | Text (state-generated) |
|---|---|---|
| the [§5.10](#510-failure-states) load begins | status | "Loading simulation data…" |
| settled update with matching records | status | "Results updated: {matching} matching records." — "Results updated: 1 matching record." when {matching} is 1 — followed by "{label}: {notice}" for each panel that shows a result notice ([§5.8](#58-view-layer)) other than the one it showed in the previous render, in panel order, and by the first sentence of each results-header caveat the previous render did not show, its slots filled exactly as `#gre-caveats` renders them ([§5.8](#58-view-layer)); {matching} is the matching-record count by `formatCount`, {label} the panel's canonical label, {notice} the notice's first sentence |
| settled update with no matching records | status | the first sentence of the empty-state explainer ([PDD §5.8 — Small and empty results (FR-O3, D-11)](pdd.md#58-small-and-empty-results-fr-o3-d-11)) |
| rejected slip-window entry | status | the [§5.7](#57-scenario-controls) slip-window rejection line, which is also the field's `aria-describedby` description |
| rejected offset entry | status | the rejected-entry line of [PDD §5.6 — Conversion assist (FR-S5, D-3)](pdd.md#56-conversion-assist-fr-s5-d-3), which is also the field's `aria-describedby` description |
| read-off committed | status | the read-off `<output>` text ([§5.12](#512-charts)); never emitted by a settled update |
| field export unavailable | status | the [§5.8](#58-view-layer) field-export-unavailable line |
| failure | alert | the unavailable-results notice ([§5.10](#510-failure-states)) |
| missing capability | — | no region exists in this state, because `start()` never runs (Navigation lifecycle, below); the [§5.10](#510-failure-states) capability notice itself carries `role="alert"` |

Statistics tables, charts, the chart-data tables, and the read-off
`<output>` (`aria-live="off"`) are never inside a live region — the
status line is the announcement, not the changing cells
([HLDD §7.2 — Accessibility and supported environments](hldd.md#72-accessibility-and-supported-environments)).

**Chart text alternatives.** The [DD-9](#1-ddd-decision-register)
mechanism. The panel's statistics table, last in the panel order of
[§5.8](#58-view-layer), stays "the canonical text alternative for
every measurement chart"
([PDD §9.3 — Accessibility target (D-17, Proposed)](pdd.md#93-accessibility-target-d-17-proposed)).
It carries no per-bin or per-scarp-type counts, so every element a
chart draws also has one text counterpart, visible on demand
([HLDD §7.2 — Accessibility and supported environments](hldd.md#72-accessibility-and-supported-environments),
Charts and text alternatives: "information not captured by summary
statistics alone"):

- bar totals → the "Total" column of the bin table;
- per-scarp-type segments → one bin-table column per displayed
  stacking group, in canonical order — the six classes, or the three
  base types while the [D-13](pdd.md#1-decision-register) family view
  (Scarp-family view availability and label) is on — headed by the
  legend's labels;
- the value axis and the log-scale toggle → the bin-table row
  headers, which are the bins' edges — on the logarithmic scale the
  octave edges, after a first "below 0.1 m" row while that bar is
  drawn ([§5.12](#512-charts)) — and, while the histogram is drawn on
  the logarithmic scale, the chart label's ", logarithmic value
  axis" clause;
- the cumulative curve → the statistics table's minimum, 16th
  percentile, median, 84th percentile, and maximum rows (the median
  and 84th-percentile pre-marks are two of them) plus the read-off
  `<output>`;
- the read-off marker → the read-off `<output>`
  ([§5.12](#512-charts));
- field-overlay ticks → the field table;
- the overlay legend and the scarp-dip panel's overlay note → already
  HTML ([§5.8](#58-view-layer), [§5.12](#512-charts)).

Scarp-type identification never relies on color alone: legends carry
text labels, every segment carries a title naming its group, and the
bin table names every group
([FR-G2 — Scarp-type colors and identification](prd.md#fr-g2-scarp-type-colors-and-identification)).

Markup, generated into the panel's `.gre-chart` slot only while its
chart renders (valid N at or above `chartFloorBelow`,
[§5.13](#513-application-configuration)); below the chart floor the
slot holds only the [§5.8](#58-view-layer) notice that stands in for
the chart, at chart height — no figure, disclosure, or text
alternative — so no alternative re-exposes a distribution that
[PDD §4.5 — Small, empty, and partial results (FR-O3, D-11 Proposed)](pdd.md#45-small-empty-and-partial-results-fr-o3-d-11-proposed)
suppresses. With `{pid}` = `gre-{measurement}`, the
[DD-10](#1-ddd-decision-register) name:

- a `<figure>` holding the chart's
  `<svg role="img" aria-label="{chartLabel}" aria-describedby="{pid}-cap" aria-details="{pid}-data">`
  — the builders put these attributes on the root `SvgNode` — and the
  visible `<figcaption id="{pid}-cap">` holding the caption sentence;
- directly after the figure, `<details id="{pid}-data">`: its
  `<summary>`, carrying `data-focus-key="chart-data:{measurement}"`,
  holds the chart-data label of [§5.8](#58-view-layer) and is
  followed by the bin table and, while the panel draws field ticks,
  the field table, each `<table id="{tid}">` with its
  `<caption id="{tid}-cap">` inside its own scroll wrapper
  `<div class="gre-table-scroll" role="region" tabindex="0" aria-labelledby="{tid}-cap" data-focus-key="{tid}">`,
  {tid} being `{pid}-bins` or `{pid}-field`; the stylesheet gives
  `.gre-table-scroll` `overflow-x: auto` (fixed here).

Alternative content is a sibling of the `<svg>`, never inside it:
WAI-ARIA 1.2 makes the children of `role="img"` presentational, so
text inside the chart would leave the accessibility tree.
`aria-describedby` targets only the one-sentence caption, because it
would flatten a table of up to 60 rows into one string; `aria-details`
keeps the tables' structure. A table wider than its panel — the bin
table's header row names every stacking group, which at 360 CSS px
can exceed the content width — scrolls inside its wrapper, never the
page: data tables are the two-dimensional content that WCAG 2.2
SC 1.4.10 excepts from reflow, and the wrapper takes keyboard focus,
so it can be scrolled without a pointer, and carries the table's
caption as its name.

Formatting, fixed here: a quantity prints as `displayRound(v, dd)`
([§5.8](#58-view-layer)), dd being the measurement's
[D-23](pdd.md#1-decision-register) (Reader-facing display precision
per quantity) decimals, followed by a space and `m` for metres or by
`°` for degrees, with no space (SI spacing); a range prints as
`{lo}–{hi} m` or `{lo}–{hi}°`. In the templates below, {label} is the
measurement's canonical label
([PDD §5.11 — Labels, units, and glossary links (FR-G3, CR-3, CR-7)](pdd.md#511-labels-units-and-glossary-links-fr-g3-cr-3-cr-7)),
and {N} is the panel head's valid count by `formatCount` — never the
matching-record count, which exceeds it by the excluded-null count.
The pure generators of `src/views/chart-text.ts` and
`src/views/summary.ts` produce them, and every quoted template is a
`fixed-here` registry entry citing this section.

- `chartLabel(state)`: "{label}: histogram of {N} valid measurements"
  followed by ", stacked by scarp type" (family view: ", stacked by
  scarp family") and, while it is drawn on the logarithmic scale
  ([§5.12](#512-charts)), by ", logarithmic value axis"; or "{label}:
  cumulative distribution of {N} valid measurements"; either one
  followed by ", with field measurements marked" while the panel
  draws field ticks.
- The caption, `chartSummary(stats, measurement, cfg)`: "{label}: {N}
  valid measurements, median {median}, 16th–84th percentile range
  {p16} to {p84}." — the three statistics as quantities.
- `binTableSpec(binsByGroup, groups, edges)`: caption "{label}: valid
  measurements per bin, by scarp type" (family view: "{label}: valid
  measurements per bin, by scarp family"); one header row of
  `<th scope="col">` cells — {label}, each group's legend label, then
  "Total"; one row per bin, ascending, headed by a `<th scope="row">`
  reading "{lo}–{hi}" (the bin's edges at dd decimals; the column
  header carries the unit), then each group's count and the total by
  `formatCount`. On the logarithmic scale `edges` are the octave
  edges, and while the leading bar is drawn `binsByGroup` begins with
  its counts, whose row is headed "below 0.1 m" (the label of
  [§5.12](#512-charts)). It is built in the render pass that draws
  the bars, from the same per-bin, per-group arrays.
- `fieldTableSpec(rows, order)`: caption "{label}: field measurements
  marked on the chart"; columns "Source and measure" (the
  [§5.8](#58-view-layer) overlay group label of the row's (`source`,
  `source_quantity`), followed, when `limited_comparison` is true, by
  the §5.8 limited-comparison wording), "Event" ("{eq_name} (M
  {magnitude})", or the bare `eq_name` when `magnitude` is null, with
  {magnitude} printed as exported by `String(magnitude)`), and "Value
  ({unit})" (`displayRound(value, dd)`; {unit} is "m"). Its rows are
  exactly the rows the chart draws as ticks — the field rows that
  `RenderInput` carries ([§5.8](#58-view-layer)) — grouped by
  (`source`, `source_quantity`) in the order
  [PDD §4.4 — Field overlay (FR-O5, D-18 Proposed)](pdd.md#44-field-overlay-fr-o5-d-18-proposed)
  lists them for the panel's measurement, ascending by value within a
  group, ties broken by `eq_name` in code-point order; the spec is
  memoized per (analogue, default set or show-all).

Disclosure state: `chartDataOpen[measurement]` is display state
([§5.6](#56-scenario-state-and-url-encoding)), closed by default and
applied to the generated `<details>` on every render pass; the tables
are generated only while it is open. The panel `<section>` listens
for `toggle` in the capture phase, because `toggle` does not bubble;
an event whose `details.open` differs from that state updates it
through the scheduler's `update(next)`, a display-only update of
that panel ([§5.3](#53-query-engine)) — a generated
`<details open>` also fires `toggle`, which the comparison ignores —
and focus returns to the `<summary>` through its key. The disclosure
belongs to the panel, so both views show the same tables.

Contrast: at the [§5.8](#58-view-layer) fill opacity, or at any
other value of the 55–65 % range of
`docs/dashboards/visual-identity.md`, adjacent canonical segments
stay below the 3:1 non-text contrast of WCAG 2.2 SC 1.4.11 (the WCAG
relative-luminance formula over the
[§3.2](#32-artifact-manifest) palette), and no stroke separates them
([§5.12](#512-charts)). The segments therefore meet SC 1.4.11 through
its exception for information available in another form — the bin
table, open to every reader — not through contrast. axe-core has no
rule for SC 1.4.11, so the automated lane cannot detect a regression
here; the assistive-technology pass of
[§7.7](#77-site-validation-and-release-checklist) item 14 reads one
bin table and one field table.

Grounds: shared arrays give consistency, not equivalence — building
the tables in the pass that draws the bars keeps text and chart from
drifting apart — and completeness comes from the element list above,
checked by the browser lane ([§7.5](#75-browser-test-lane)) and
§7.7 item 14.

**Supported environments as design constraints.** The layout is
single column below the 768 CSS px breakpoint of
[§5.7](#57-scenario-controls), where `#gre-summary` stays in view
while the reader works through the controls and never hides the
focused control (WCAG 2.2 SC 2.4.11; §5.7, Layout and scenario
summary), and fully usable at 360 CSS px with no page-level
horizontal scrolling — a chart-data table scrolls inside its wrapper
(Markup, above); charts re-render at the container width
([§5.12](#512-charts)); nothing essential depends on hover — segment
`<title>` tooltips duplicate the bin table, and the read-off is an
input operable by keyboard and touch
([PDD §9.2 — Browser and mobile baseline (D-16, Proposed)](pdd.md#92-browser-and-mobile-baseline-d-16-proposed)).
The required runtime APIs are the inventory of
[§7.6](#76-performance-and-compatibility-measurements), and the
[§5.10](#510-failure-states) capability probe tests the subset it
names before each mount (Navigation lifecycle, below). Two kinds of
evidence cover the baseline and are reported separately. §7.6
documents API availability in the oldest in-window version of every
baseline browser from the pinned dataset, executing nothing in those
browsers. Execution is the automated
lane's single engine — its pinned Chromium, at a desktop viewport
and at 360 px under Chromium mobile emulation
([§7.5](#75-browser-test-lane)) — and the owner's pass on the
remaining engines and on mobile browsers,
[§7.7](#77-site-validation-and-release-checklist) item 15. A
language-level label is not sufficient evidence
([HLDD §7.2 — Accessibility and supported environments](hldd.md#72-accessibility-and-supported-environments),
Browser compatibility).

**Navigation lifecycle.** The site enables Material's
`navigation.instant` (`subprojects/mkdocs/mkdocs.yml`), so a page
visit does not reload the document, and the integration must use the
theme's navigation lifecycle
([HLDD §4.3 — Language, toolchain, and repository
structure (ADR-0011)](hldd.md#43-language-toolchain-and-repository-structure-adr-0011),
Page loading and navigation). The algorithm relies on these theme
facts, cited to mkdocs-material 9.7.7 as locked in
`subprojects/python/poetry.lock`, whose TypeScript sources ship in
the installed package's
`assets/javascripts/bundle.d7400e89.min.js.map`:

- `document$` is a `ReplaySubject<Document>(1)` exposed as
  `window.document$` (`browser/document/index.ts` L41–48, `bundle.ts`
  L316); it emits first on `DOMContentLoaded` and again after every
  instant swap (`bundle.ts` L159–162).
- Instant navigation listens for `click` on `document.body`
  (`integrations/instant/index.ts` L289–296). Its `handle()` skips a
  click made with Ctrl or Meta or on a link with a `target` (L104)
  and intercepts, with `preventDefault()`, a click on any other link
  whose URL, search and hash removed, is in the site's `sitemap.xml`
  (L113–130) — a same-page fragment link included; the browser
  follows every other link.
- After a swap, `inject()` replaces `[data-md-component=container]`
  and re-creates every `<script>` inside it
  (`integrations/instant/index.ts` L181–248), so the generated tag
  block of [§6.1](#61-build-outputs-asset-paths-and-page-scaffold),
  which sits in page content, loads on instant entry.
- Material's own inline content script
  (`partials/javascripts/content.html`) is always the container's
  last script, so on a first instant entry `document$` emits before
  the bundle evaluates, and the bundle receives that page through
  the replay.
- `document$` is keyed by pathname (`integrations/instant/index.ts`
  L337–339), but its source `location$` is an unseeded `Subject`
  (`browser/location/_/index.ts` L83–84; `bundle.ts` L130). After a
  direct load, the first intercepted click, a fragment link included,
  therefore re-fetches the current page, replaces the container, and
  emits `document$`; only once `location$` has carried this pathname
  does a fragment link emit nothing. A same-page fragment link — the
  short disclaimer's `#gre-disclaimer` ([§5.8](#58-view-layer)) among
  them — must therefore never reach `handle()` (`guard`, below).
- A re-created module script whose URL is already in the document's
  module map is neither fetched nor evaluated again (HTML Living
  Standard, fetch a single module script); a re-created classic
  script runs again.
- On a direct load the deferred module evaluates after Material's
  classic bundle, at `readyState` `interactive`, before
  `DOMContentLoaded`.

The algorithm, at module scope in `src/main.ts` (esbuild emits
`format: 'esm'`, [§2](#2-repository-structure-naming-and-toolchain),
so `import.meta.url` is the bundle's own URL). The slot decides which
mount is live; no DOM marker does:

```ts
const SELF = import.meta.url;
const SLOT = Symbol.for('gre.activeMount');   // document-global: at most one live mount
type Active = { build: string; root: HTMLElement; ac: AbortController };
type Entry = { key: string; vintage: Promise<Vintage>; field?: Promise<FieldRow[]>; regression?: Promise<Regression> };
const g = window as unknown as { [SLOT]?: Active };
const same = (a: string, b: string) => { const x = new URL(a), y = new URL(b); return x.pathname + x.search === y.pathname + y.search; };
let cache: Entry | null = null;   // one vintage per bundle instance
function release(a: Active) { a.ac.abort(); if (g[SLOT] === a) delete g[SLOT]; }
function onPageReady(): void {
  try {
    const root = document.getElementById('gre-root');
    const tag = document.getElementById('gre-app') as HTMLScriptElement | null;
    const held = g[SLOT];
    if (!root || !tag || !same(tag.src, SELF)) {   // another page, or a page naming another bundle URL
      if (held?.build === SELF) release(held);
      if (tag && !same(tag.src, SELF)) cache = null;
      return;
    }
    if (held?.root === root) return;   // this element's mount already started
    if (held) release(held);   // whichever instance held the slot
    const missing = missingCapabilities();   // the §5.10 capability probe, before any probed API is used
    if (missing.length > 0) { showCapabilityNotice(root, missing); return; }
    const a: Active = { build: SELF, root, ac: new AbortController() };
    g[SLOT] = a;   // claimed before the first await
    void start(a, tag);
  } catch (e) { console.error(e); }   // never throw into document$: rxjs re-throws consumer errors asynchronously
}
function vintageFor(tag: HTMLScriptElement): Promise<Vintage> {
  const manifestUrl = new URL(tag.dataset.manifest!, tag.src).href;
  const key = manifestUrl + ' ' + tag.dataset.dataVersion;
  if (cache?.key !== key) {
    const entry: Entry = { key, vintage: loadVintage(manifestUrl, { exportVersion: tag.dataset.dataVersion!, schemaVersions: [1] }) };
    cache = entry;
    entry.vintage.catch(() => { if (cache === entry) cache = null; });   // failures are never cached
  }
  return cache!.vintage;
}
function fragmentTarget(hash: string): HTMLElement | null {   // the element a non-empty URL hash names
  let id = hash.slice(1);
  try { id = decodeURIComponent(id); } catch { /* a malformed escape: the id as written */ }
  return document.getElementById(id);
}
function guard(ev: MouseEvent): void {   // same-page fragment links; start() registers it on document, capture phase
  const el = ev.target instanceof Element ? ev.target.closest('a[href]') : null;
  if (!(el instanceof HTMLAnchorElement) || el.target || ev.ctrlKey || ev.metaKey) return;   // the clicks handle() skips (L104)
  let u: URL;
  try { u = new URL(el.href); } catch { return; }   // an unparsable href is left to the browser
  if (u.origin !== location.origin || u.pathname !== location.pathname || u.search !== location.search || u.hash === '') return;
  ev.preventDefault();             // no fragment navigation, so no history entry
  ev.stopImmediatePropagation();   // never reaches Material's document.body listener
  const t = fragmentTarget(u.hash);
  if (!t) return;
  t.scrollIntoView();
  t.focus({ preventScroll: true });
  if (document.activeElement !== t) { t.setAttribute('tabindex', '-1'); t.focus({ preventScroll: true }); }
}
const ready = (window as unknown as { document$?: { subscribe(next: () => void): unknown } }).document$;
if (ready && typeof ready.subscribe === 'function') ready.subscribe(onPageReady);   // the replay covers late evaluation
else if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', onPageReady, { once: true });
else onPageReady();
```

`missingCapabilities()`, a function of `src/main.ts`, runs the
[§5.10](#510-failure-states) capability probe (pure feature tests,
never the user-agent string) and returns the missing API names; it
runs here, before the slot claim, because the slot's
`AbortController` is itself a probed capability, so `start` never
probes again. When the probe names a missing API, `main.ts` calls
`showCapabilityNotice(root, missing)` of `src/views/dom/notices.ts`,
whose notice text, element, and placement are §5.10's, and claims no
slot. `start(a, tag)` creates the two live regions, appends them to
`#gre-root` after the fallback body, registers the fragment-link
guard with
`document.addEventListener('click', guard, { capture: true, signal: a.ac.signal })`,
and announces "Loading simulation data…"; it then runs the load,
which takes the vintage from `vintageFor(tag)`, and the first
render, as the §5.10 startup sequence fixes them. Rules binding
`start` and everything it schedules:

- After every `await`, timer, and animation frame, return at once
  when `a.ac.signal.aborted`; a rejection that arrives after the
  abort is logged with `console.debug`, never rendered.
- Never abort the shared vintage load, nor the lazily loaded field
  and regression exports ([§5.2](#52-artifact-loading-and-decoding)),
  kept on the vintage's cache entry as `field` and `regression`:
  their files are content-hashed, so re-entry reuses them, and a
  rejected lazy load deletes its member, so no failure is cached. A
  render pass reads their resolved rows only through `RenderInput`
  ([§5.8](#58-view-layer)).
- Add every listener — control, window, and document level, the
  §5.10 `window` `error` and `unhandledrejection` listeners
  included — with `addEventListener(…, { signal: a.ac.signal })`,
  never by assigning `window.onerror`.
- On the signal's `abort` event the per-mount
  [§5.3](#53-query-engine) scheduler stops, every `ResizeObserver`
  disconnects, and the last download's object URL
  ([§5.9](#59-downloads)) is revoked.
- After the first commit — of results or of the §5.10 unavailable
  state — write `#gre-summary`'s border-box height to
  `--gre-summary-block` on `#gre-root`, because the
  [§5.7](#57-scenario-controls) summary observer first reports only
  in the next rendering update; make the at-mount focus move or the
  fragment-entry scroll of Focus management (above); then set
  `data-gre-mounted` and `data-gre-build` (`SELF`) on `#gre-root`
  ([§6.1](#61-build-outputs-asset-paths-and-page-scaffold)
  identifier contract): test hooks only, never read by the algorithm.

While the mount lives, `guard` keeps every same-page fragment link
from Material — the short disclaimer's link ([§5.8](#58-view-layer)),
Material's skip link, a heading permalink, a table-of-contents link.
Its capture-phase listener on `document` runs before Material's
`document.body` listener. For a click without Ctrl or Meta on a link
without a `target` whose URL differs from `location` only by a
non-empty hash, it scrolls to the named element (Focus management,
above) and focuses it, giving it `tabindex="-1"` when it cannot take
focus otherwise (fixed here), and writes no history entry; a name
that matches no element leaves the page as it is. That attribute, on
a target outside `#gre-root` such as `#gre-disclaimer` or a heading,
is the one write the application makes outside `#gre-root`; it
changes no text, so the full disclaimer still stands in every state
([§6.1](#61-build-outputs-asset-paths-and-page-scaffold)). A `target`
attribute on the link would not do: the browser's own fragment
navigation pushes a history entry, whose Back traversal becomes
`location$`'s first value and re-fetches the page.

The cache key makes a data-only refresh re-run the full
[§5.2](#52-artifact-loading-and-decoding) load and its version check
rather than re-mount the old vintage under the new stamp: the
application "must not label a result with the expected version
without verifying the data actually loaded" (HLDD §8,
[Software and data versions](hldd.md#software-and-data-versions)).
After a redeploy, a second bundle instance can evaluate in the same
document; the slot decides which one mounts, and an instance whose
URL the page no longer names releases only its own mount. The MVP
writes no history entries; when shared links ship, URL writing
belongs to the [§5.6](#56-scenario-state-and-url-encoding) codec.

*Closes:* DD-9. *Verification (planned):* `chart-text.test.ts`
([§7.4](#74-application-tests)) asserts the chart-text generators
with injected counts — canonical header order, the six-to-three
family fold keeping row totals, group cells summing to each row's
total, the field-row order, one distinct chart label per combination
of chart kind and field ticks, and on the histogram also of family
view and logarithmic scale. The browser lane
([§7.5](#75-browser-test-lane)) asserts, in `a11y.spec.ts`, zero axe
violations under the tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`,
and `wcag22aa` with every chart-data disclosure closed and again
open, and each chart's role, accessible name, description,
`aria-details` target, and table contents against the drawn marks;
in `keyboard-responsive.spec.ts`, focus retention across settled and
display-only updates, mid-edit preservation, empty-state focus, and
the 360 px project operated by touch, with `#gre-summary` in view
while a control near the top of `#gre-controls` has focus and no
page-level horizontal scroll with every chart-data disclosure open;
and in `mount.spec.ts` and `navigation-lifecycle.spec.ts`, direct
and first instant entry with focus on the selected measurement's
panel, fragment entry with the artifact response held until after
the `load` event, the short disclaimer's link after a direct entry
and one committed scenario change (the same `#gre-root` still
connected, the changed scenario kept, `#gre-disclaimer` in view,
nothing announced), three leave-and-return cycles, a changed bundle
URL, a changed data stamp, and in-flight disposal. §7.6 documents the
API baseline; [§7.7](#77-site-validation-and-release-checklist)
items 14 and 15 are the human assistive-technology and
browser-engine checks.

References:

- [HLDD §7.2 — Accessibility and supported environments](hldd.md#72-accessibility-and-supported-environments).
- [PDD §9.2 — Browser and mobile baseline (D-16, Proposed)](pdd.md#92-browser-and-mobile-baseline-d-16-proposed);
  [PDD §9.3 — Accessibility target (D-17, Proposed)](pdd.md#93-accessibility-target-d-17-proposed).
- [HLDD §4.3 — Language, toolchain, and repository
  structure (ADR-0011)](hldd.md#43-language-toolchain-and-repository-structure-adr-0011)
  (Page loading and navigation); HLDD §8,
  [Software and data versions](hldd.md#software-and-data-versions).
- [NFR-5 — Accessibility](prd.md#nfr-5-accessibility);
  [FR-G2 — Scarp-type colors and identification](prd.md#fr-g2-scarp-type-colors-and-identification).
- mkdocs-material 9.7.7 (`subprojects/python/poetry.lock`), sources
  in `assets/javascripts/bundle.d7400e89.min.js.map`, stylesheet
  `assets/stylesheets/main.ec1eaa64.min.css`.

### 5.12 Charts

"Exactly two chart kinds exist — histogram and empirical cumulative
curve (PDD §4.1) — plus overlay marks"
([ADR-0011](../adr/0011-webapp-toolchain.md)); all are hand-rolled
SVG, no charting library. Each chart is a builder–applier pair
([§5.1](#51-modules-and-interfaces)): the pure builders
`histogramSvg(spec, width)` and `ecdfSvg(spec, width)` in
`src/views/charts.ts` return an `SvgNode` (`src/views/svg.ts`), and
the same spec at the same width serializes byte-identically through
`serializeSvg` — asserted in Node ([§7.4](#74-application-tests));
the browser applier `toSvgElement` (`src/views/dom/svg.ts`)
materializes the node with `createElementNS`, setting attributes in
array order and each string child as a text node. The node type and
its serialization, fixed here:
`type SvgNode = { tag: string; attrs: readonly (readonly [string, string])[]; children: readonly (SvgNode | string)[] }`,
a string child being text. `serializeSvg` writes `<{tag}`, then
` {name}="{value}"` per attribute in array order, `>`, the children
in order, and `</{tag}>` — no self-closing form and no whitespace or
line break between nodes — escaping `&`, `<`, `>`, and `"` in values
and `&`, `<`, and `>` in text as `&amp;`, `&lt;`, `&gt;`, and
`&quot;`. Chart data comes from the engine and statistics modules
([§5.3](#53-query-engine), [§5.4](#54-statistics)) — the
[DD-5](#1-ddd-decision-register) histogram from `histogram()` and its
logarithmic variant from `histogramLog()`, both in
`src/stats/histogram.ts`, percentiles from `quantileLinear()` in
`src/stats/quantile.ts` — and charts only draw. Quantities and
ranges print in the forms of
[§5.11](#511-accessibility-supported-environments-and-navigation-lifecycle).
Every reader-facing string of a chart, and of the info note that
states its bins, is a copy-registry entry ([§5.8](#58-view-layer)):
PDD wording cites its PDD section, and the templates this section
introduces — the two axis titles, the pre-mark labels, the read-off
label, output, and hint, the segment title, the "below 0.1 m" label
of the logarithmic scale, and the info note's two sentences — are
`fixed-here` entries citing this section. The log-scale checkbox
label is §5.8's.

**Geometry and scales.** The SVG's `viewBox` matches the panel's CSS
width (re-rendered on resize, below), with a fixed inner plot height
of 240 CSS px, margins left 56, right 16, top 8, bottom 40 px (fixed
here — room for tick labels at display precision), and the 12 px
overlay band (below), so every chart is 300 CSS px tall, the minimum
height of the [§5.8](#58-view-layer) chart slot. Value axes are
linear by default
([PDD §4.1 — Measurement views (FR-O1)](pdd.md#41-measurement-views-fr-o1):
"axes linear by default"); the width panel's histogram also offers a
logarithmic value axis, whose ticks follow Logarithmic scale, below.
Tick steps follow the 1–2–5 rule: the step is the smallest value
{1, 2, 5}·10^k that gives at most six ticks over the axis extent
and, on a value axis, is at least one display step 10^(−dd), so
adjacent labels never print alike (fixed here); ticks sit at the
step's multiples inside the extent. Value tick labels are
`displayRound(v, dd)`, dd being the measurement's
[D-23](pdd.md#1-decision-register) (Reader-facing display precision
per quantity) decimals from configuration
([§5.13](#513-application-configuration)); count ticks are exact
integers (k ≥ 0) printed by `formatCount`; the cumulative view's
vertical axis runs from 0 to 100 under the same rule, which puts a
tick every 20. Axis titles: the value axis carries the canonical
label with unit
([PDD §5.11 — Labels, units, and glossary links (FR-G3, CR-3, CR-7)](pdd.md#511-labels-units-and-glossary-links-fr-g3-cr-3-cr-7));
the histogram's count axis reads "Valid measurements", and the
cumulative axis "Cumulative share of valid measurements (%)".

**Histogram.** The DD-5 rule, implemented identically in TypeScript
and as Python `histogram()` in the reference generator
([§3.6](#36-reference-results)), over the [§5.3](#53-query-engine)
engine's selection:

`histogram(steps: Int32Array, classes: Uint8Array, sorted: Float64Array, displayDecimals: number) → Histogram | null`

Inputs per panel: the valid values as integers s in recording steps
(`stored + offset_steps`, or the scarp-dip dictionary value, both
per [§3.1](#31-scenario-artifact-binary-layout); the generator takes
`round(v·10^d)` and asserts it exact); the same values as float64 x,
ascending ([§5.4](#54-statistics)); their class codes 0–5; d =
`columns.<m>.decimals` ([§3.2](#32-artifact-manifest); 3 for every
measurement); dd = the panel's D-23 decimals (height 2, width 1, dip
0); and u = 10^(d − dd), one display step in recording steps. Each
power of ten is an integer literal — 10^dd is 100, 10, or 1 and u is
10, 100, or 1000 for height, width, and dip — never computed with
`10 **` or `Math.pow`. A panel with no valid value has no histogram
(`null`). Steps:

- (a) Rule. If s_min = s_max, the rule is `single` with k = 1.
  Otherwise IQR = `quantileLinear(x, 0.75)` −
  `quantileLinear(x, 0.25)`; if IQR > 0 the rule is `fd` with X =
  2·IQR·10^dd, otherwise `scott` with X = 3.49·σ·10^dd, σ being the
  §5.4 sample standard deviation. k is the smallest integer ≥ 1 with
  k·k·k·n ≥ X·X·X, every product evaluated in float64 left to right:
  start from any positive integer hint (the result does not depend
  on it; `Math.ceil(X / Math.cbrt(n))` is the suggested hint), step
  down while k > 1 and (k−1)·(k−1)·(k−1)·n ≥ X·X·X, and step up while
  k·k·k·n < X·X·X.
- (b) W = k·u; e0 = W·⌊s_min / W⌋, the floor taken toward −∞ (s_min
  can be negative); K = ⌊(s_max − e0) / W⌋ + 1.
- (c) While K > 60, increment k and repeat (b).
- (d) Bin j, for j = 0 … K−1, is [e0 + j·W, e0 + (j+1)·W) and
  includes its lower edge; a value goes to bin ⌊(s − e0) / W⌋. Since
  e0 + K·W > s_max, the maximum falls in bin K−1, and no closed last
  bin is needed.
- (e) The counts form a K × 6 table in canonical class order that
  sums to the panel's valid count. A valid value whose class code is
  255 (unclassified) is an internal failure
  ([§5.10](#510-failure-states)); the export check
  `unclassified-has-no-valid-measurement`
  ([§4.1](#41-export-task-and-validation)) keeps such a vintage from
  publication, so every stack carries every valid value
  ([PDD §4.3 — Unclassified records (D-12, Proposed)](pdd.md#43-unclassified-records-d-12-proposed)).
- (f) Constant data give one bin [e0, e0 + u): one display step of
  extent.
- (g) Every edge e is a multiple of u, so ticks, segment titles, and
  the bin table print it exactly as `displayRound(e / 1000, dd)` —
  `e / 10000` for slip ([§5.14](#514-inverse-mode-p2)) — dividing by
  the integer literal, never by `10 ** d`.

The panel's info note ([§5.8](#58-view-layer)) states this rule in
one sentence, a `fixed-here` entry citing this section: "Bins:
Freedman–Diaconis width (Scott's rule when the interquartile range
is zero), rounded up to the display precision and widened if needed
to keep at most 60 bins; each bin includes its lower edge."

Bars tile the bins; each bar is a stack of per-class `<rect>`
segments in canonical class order, first class at the bottom (fixed
here), a segment being drawn only for a nonzero count and filled
from the manifest palette ([§3.2](#32-artifact-manifest)) at the
adopted fill opacity ([§5.8](#58-view-layer)) — scarp types are
shown, so the canonical colors and order apply
([FR-G2 — Scarp-type colors and identification](prd.md#fr-g2-scarp-type-colors-and-identification)).
The [D-13](pdd.md#1-decision-register) (Scarp-family view
availability and label) family view folds the six classes into the
three base types at display time ([§5.8](#58-view-layer)). No bar
stroke (fixed here); the contrast consequence, and the bin table
that answers it, are in
[§5.11](#511-accessibility-supported-environments-and-navigation-lifecycle).
Each segment carries a native `<title>`, built by `segmentTitle`:
"{group}: {count} of {total} ({range})" — {group} the legend label,
{count} and {total} by `formatCount`, {range} the bin as a §5.11
range — a supplemental tooltip whose text equivalent is the bin
table.

**Empirical cumulative curve.** The pooled ascending valid values
drawn as a step polyline in the stylesheet's neutral ink color — the
pooled distribution has no class identity, so the curve is not
class-colored (fixed here); class structure lives in the histogram.
`ecdfSvg` takes the curve's points from a pure function of
`src/views/charts.ts`:

`ecdfSteps(sorted: Float64Array) → { x: Float64Array; c: Int32Array }`

Its input is the [§5.4](#54-statistics) `sorted` array of n ≥ 1
values; x_0 < x_1 < … < x_{m−1} are its m distinct values, found by
comparing adjacent entries with `===`, and c_k is the number of
values ≤ x_k, so tied values share one point and c_{m−1} = n — the
right-continuous empirical distribution F(x_k) = c_k / n. For
m ≤ 512 it returns, in `x` and `c`, every point (x_k, c_k); for
m > 512, the 512 points with k = `Math.round(j * (m - 1) / 511)` for
j = 0 … 511, first and last included (fixed here; the exact quotient
is never a half-integer, so float64 evaluation cannot change k). For
the M points returned, (X_j, C_j) with F_j = C_j / n, the path is
(X_0, 0) → (X_0, F_0) → (X_1, F_0) → (X_1, F_1) → … →
(X_{M−1}, F_{M−1} = 1), each height drawn at 100·F on the cumulative
axis: a rise at each point and a level run to the next, 2M ≤ 1,024
vertices. For consecutive kept indices a < b, the path holds c_a / n
from x_a to x_b, so the decimated curve never exceeds the full one
and falls short of it by at most (c_{b−1} − c_a) / n, the share of
the values strictly between x_a and x_b; the largest such share is
the maximum vertical error, zero for m ≤ 512. The value axis spans
[x_0, x_{m−1}]; for constant data (m = 1) it spans one display step
centered on the value, x_0 ± u / (2·D), u being the display step of
Histogram, above, and D the §5.4 divisor — ± 0.005 m, 0.05 m, and
0.5° for height, width, and dip — so the single rise stands at the
plot's horizontal center (fixed here). Drawn field rows outside that
span extend the axis as in Overlay marks, below; the curve keeps
[x_0, x_{m−1}], and the extension renders as empty plot with marks.

The pre-marks and the read-off marker compute from the full array
with `quantileLinear(sorted, q / 100)` ([§5.4](#54-statistics)),
never from the decimated path, q being 50 and 84 for the pre-marks
and the committed integer for the read-off. Each marks the point
(`quantileLinear(sorted, q / 100)`, q / 100), drawn at q on the
cumulative axis, with a guide from that axis to the point and from
the point down to the overlay band (fixed here). The linear method
interpolates between adjacent sorted values, so the point need not
lie on the curve: it can fall between two steps, above or below the
full curve by less than 1/n, and it is never moved onto a step. "The
median and 84th percentile are pre-marked"
([PDD §4.1 — Measurement views (FR-O1)](pdd.md#41-measurement-views-fr-o1))
as dashed guide lines labeled "Median {value}" and "84th percentile
{value}", each {value} a quantity.

**Percentile read-off.** A skeleton control of each panel, placed by
the [§5.8](#58-view-layer) panel contents:
`<input type="number" id="{pid}-pct" min="0" max="100" step="1" aria-describedby="{pid}-pct-out">`,
labeled "Percentile", with the replaced slot
`<output id="{pid}-pct-out" for="{pid}-pct" aria-live="off">` beside
it. It is shown only in the cumulative view of a panel whose chart
renders; otherwise the input is `hidden` and the output empty, so no
read-off re-exposes a suppressed distribution. Its value is display
state (`readoff[measurement]`,
[§5.6](#56-scenario-state-and-url-encoding)) and never part of the
Scenario, the provenance, the file name, or a link. It commits on
`change` and on Enter (`keydown`, the same idempotent commit); typing
alone commits nothing. On commit, per row R6 of the
[§5.7](#57-scenario-controls) free-entry table:

- `value` is `''` and `validity.badInput` is false — blank:
  `readoff` becomes null, with no marker, an empty output, and no
  announcement;
- `validity.badInput`, a non-integer, or a value outside 0–100 — no
  marker, `aria-invalid="true"`, and the output reads "Enter a whole
  number from 0 to 100.", announced once;
- an integer q from 0 to 100 — `readoff` becomes q and
  `aria-invalid` is removed; the value
  `quantileLinear(sorted, q / 100)` is drawn as a marker line and
  written to the output as "Percentile {q}: {value}", announced once
  in the status region
  ([§5.11](#511-accessibility-supported-environments-and-navigation-lifecycle)).

The input is never re-rendered, so its text survives scenario
updates; a settled update recomputes the output for the new selection
without announcing it. q = 100 and a single valid value take the
endpoint branch of `quantileLinear`.

**Overlay marks.** The third mark kind
([ADR-0011](../adr/0011-webapp-toolchain.md)): black (`#000000`, the
field-mark convention of
[PDD §4.4 — Field overlay (FR-O5, D-18 Proposed)](pdd.md#44-field-overlay-fr-o5-d-18-proposed))
vertical ticks in the overlay band — 12 px directly above the value
axis, reserved in every chart of both views so switching the overlay
never moves the plot (fixed here) — one tick per drawn field row at
its value, the rows being those `RenderInput` carries
([§5.8](#58-view-layer)), grouped per (`source`, `source_quantity`).
Groups are identified in the HTML overlay legend
([§5.8](#58-view-layer)), and every tick appears in the field table
([§5.11](#511-accessibility-supported-environments-and-navigation-lifecycle)).
While the [§5.8](#58-view-layer) overlay switch is on, the
scarp-height and width panels draw their rows; the scarp-dip panel
draws no tick, and its §5.8 note is HTML in its legend slot, never
SVG text, which the `role="img"` chart would hide. When drawn rows
fall outside the bins' extent — width rows above the paper's
less-than-50-metre criterion with show-all on — the value axis
extends to cover them: the bins keep their DD-5 extent, the extension
renders as empty plot with marks (fixed here), and the axis never
clips marks silently.

**Resizing.** One `ResizeObserver` per panel; a width change calls
the scheduler's `rerenderChart(measurement)`
([§5.3](#53-query-engine)), which re-renders only that panel's
`.gre-chart` slot, its chart-data disclosure contents included, from
the last committed `RenderInput` at the panel's new width on the next
animation frame, one coalesced render per frame (fixed here); it
runs no query and announces nothing, focus inside the slot returning
through its key
([§5.11](#511-accessibility-supported-environments-and-navigation-lifecycle)).
Observers disconnect on the mount's abort signal (§5.11). Below the
chart floor the slot holds only the [§5.8](#58-view-layer) notice
that stands in for the chart, at chart height: no figure,
disclosure, or text alternative.

**Logarithmic scale.** In the words of
[PDD §4.1 — Measurement views (FR-O1)](pdd.md#41-measurement-views-fr-o1),
"deformation-zone width may offer a log scale toggle where the
matched range spans more than two decades". The width panel's
histogram view offers it — the owner's ruling of 2026-10-30,
recorded under [DD-5](#1-ddd-decision-register) — and the cumulative
view stays linear, so the read-off and the pre-marks are unchanged.
Its bins double in width from 0.1 m, so every edge prints exactly at
the D-23 width precision of 0.1 m and no PDD change is needed. One
rule, implemented identically in `src/stats/histogram.ts`
([§5.1](#51-modules-and-interfaces)) and as Python
`histogram_log(steps, classes, offer_ratio)` in the reference
generator's `product_export.py` ([§3.6](#36-reference-results)):

`histogramLog(steps: Int32Array, classes: Uint8Array, offerRatio: number) → HistogramLog | null`

Inputs: the width panel's valid values as integers s in recording
steps, as for the histogram above (`columns.dzw.decimals` is 3, so
0.1 m is 100 steps); their class codes; and the offer ratio R, which
is 100 — on the client the value of `logScaleOfferRatio()`
([§5.13](#513-application-configuration)), in the generator a value
derived from its own `LOG_SCALE_MIN_DECADES`
([§3.6](#36-reference-results)). Steps:

- (a) Offer. minpos_s and maxpos_s are the smallest and the largest
  s > 0. The scale is offered iff such values exist and
  maxpos_s > R · minpos_s, the positive widths spanning more than two
  decades: maxpos_s = 100 · minpos_s does not offer it, and
  maxpos_s = 100 · minpos_s + 1 does. The result is null exactly
  when the scale is not offered, a panel with no valid value
  included.
- (b) Edges. The octave edges are e_k = 100 · 2^k steps for k ≥ 0
  (0.1, 0.2, 0.4, 0.8, 1.6, … m), produced by integer doubling. The
  first edge f is the largest e_k ≤ minpos_s when minpos_s ≥ 100, and
  100 otherwise. Bin j, for j = 0 … K−1, is [f · 2^j, f · 2^(j+1)),
  half-open, and K is the smallest count with f · 2^K > maxpos_s, so
  the last bin holds maxpos_s.
- (c) Assignment. A value s ≥ 100 goes to the bin j with
  f · 2^j ≤ s < f · 2^(j+1), found by integer comparison against the
  edge list, never through a floating-point logarithm; a value
  s < 100, 0 m included, goes to the leading "below 0.1 m" count. No
  value lies in [100, f), because f exceeds 100 only when
  f ≤ minpos_s.
- (d) Counts. A K × 6 table and six leading counts, both in canonical
  class order, together sum to the valid count n; class code 255 is
  the internal failure of step (e) above. The result is the §3.6
  `histogram_log` record — `first_edge` (f), `bins` (K), `counts`,
  and `below_counts` — which `HistogramLog` carries in camelCase
  ([DD-10](#1-ddd-decision-register)) as `firstEdge`, `bins`,
  `counts`, and `belowCounts`.

Rendering, fixed here:

- Left to right: the leading band, labeled "below 0.1 m" beneath it,
  whose bar is drawn only for a nonzero leading count; a gap of
  8 CSS px with no axis line; the logarithmic axis. The band, its
  label, and the gap are laid out while the leading count is nonzero
  or a drawn field row lies below 0.1 m.
- Every octave on the axis has one width b, and the band is one b
  wide: b = (P − 8) / (O + 1) with the band and b = P / O without
  it, P being the plot width and O the number of octaves on the
  axis. `log10` places pixels only: a value v sits at
  x0 + b · log10(v / a) / log10(2), with a the axis's first edge and
  x0 its left end.
- Value ticks sit at every decade on the axis, ends included — the
  values 100 · 10^i steps for i ≥ 0 (0.1, 1, 10, … m) — labeled
  `displayRound(v / 1000, 1)` (`0.1`, `1.0`, `10.0`); the octave
  edges are the bin-table row headers
  ([§5.11](#511-accessibility-supported-environments-and-navigation-lifecycle)),
  "below 0.1 m" heading the first row while the leading bar is drawn.
- Stacking, the family fold, the count axis (over every bar, the
  leading one included), per-segment titles — {range} reading
  "below 0.1 m" on the leading bar — and the overlay work as on the
  linear axis. A drawn field row below 0.1 m is drawn at the
  horizontal center of the band; the axis extends by whole octaves,
  in either direction, to cover drawn rows of 0.1 m and above that
  fall outside the bins' extent.

The width panel's log-scale checkbox ([§5.8](#58-view-layer)) sets
the panel's `logScale` display state
([§5.6](#56-scenario-state-and-url-encoding)); toggling it is a
display-only update that runs no query. `logScale` is forced to
false whenever the current selection's `histogramLog` is null, so a
selection that no longer offers the scale returns the linear view.
The chart label adds the clause of
[§5.11](#511-accessibility-supported-environments-and-navigation-lifecycle).
While §5.8 shows the checkbox, the panel's info note follows the
bin-rule sentence with a second sentence, a `fixed-here` entry
citing this section: "On the logarithmic scale, bins double in width
from 0.1 m (0.1–0.2, 0.2–0.4, … m); widths below 0.1 m, including
0 m, are counted in the first bar." Finer bins that subdivide each
decade by mantissa steps are a P2 option that would need a
[D-23](pdd.md#1-decision-register) amendment, because their edges do
not all print exactly at 0.1 m; [§9](#9-deferred-and-out-of-scope)
lists it.

**Chart export (P2, [D-14](pdd.md#1-decision-register)
Chart-export provenance format).** Charts are drawn with presentation
attributes only (fill, stroke, and font attributes on the elements,
no external-stylesheet dependence — fixed here), so a serialized
chart is style-complete. The export action (`src/views/dom/export.ts`)
serializes the panel's current `SvgNode` with `serializeSvg` after
adding the attribute `xmlns="http://www.w3.org/2000/svg"` to the
root — an image decoder needs the namespace, which the DOM applier
gets from `createElementNS` — rasterizes it through an `Image` onto a
`<canvas>` at twice the CSS resolution (fixed here), draws the
caption strip below the chart as text lines with the
[PDD §6.3 — Chart export (FR-D2, P2; D-14 Proposed)](pdd.md#63-chart-export-fr-d2-p2-d-14-proposed)
content — product name; the displayed measurement and its unit; the
one-line scenario summary (`summaryText`,
[§5.7](#57-scenario-controls)); the count line "N = {valid} valid
measurements of {matching} matching records ({excluded} excluded
null)", counts by `formatCount`; software and data-export versions;
"Cite: Chiama et al. (2025)" with the pointer to the full citation —
plus, on the scarp-dip panel while
[D-5](pdd.md#1-decision-register) (Scarp-dip correction status at
release) stands, the
[PDD §5.4 — Scarp-dip provisional notice (FR-O4, D-5)](pdd.md#54-scarp-dip-provisional-notice-fr-o4-d-5)
text (the [§5.8](#58-view-layer) everywhere-scarp-dip-appears
rule), and exports the canvas as a PNG blob. The action pairs the
image with the [§5.9](#59-downloads) provenance text as the sidecar
([PDD §6.3 — Chart export (FR-D2, P2; D-14 Proposed)](pdd.md#63-chart-export-fr-d2-p2-d-14-proposed)):
file names are the §5.9 base plus `_chart-{measurement}.png` and
`_chart-{measurement}.txt` (fixed here).

**Inverse-mode condition panels.** The inverse mode of
[§5.14](#514-inverse-mode-p2) draws the
[PDD §4.8 — Inverse-mode results (FR-X2, P2)](pdd.md#48-inverse-mode-results-fr-x2-p2)
condition panels in the same chart grammar; because four of its
distributions are categorical, shipping them requires either the
histogram kind over discrete condition values or an amendment of
ADR-0011 — resolved through the ADR process before §5.14 ships —
with the per-value count-and-share table as their accessible
alternative.

*Verification (planned):* the bin rule, edges, and per-class counts
compare exactly against the [§3.6](#36-reference-results)
`histogram` entries; the logarithmic offer and bins — null when not
offered, else `first_edge`, `bins`, `counts`, and `below_counts` —
against its `histogram_log` entries, which the reference generator
computes before the client ships the scale
([ADR-0015](../adr/0015-golden-scenario-parity.md)); and the
read-off values against its `percentiles`, in the parity tests
([§7.2](#72-calculation-parity-tests)). In
[§7.4](#74-application-tests), `charts.test.ts` asserts that two
independently built specs serialize identically, that tick labels
equal `displayRound` at the D-23 decimals, and the `ecdfSteps`
construction for tied values, constant data, and 511, 512, and 513
distinct values, and `histogram.test.ts` asserts mechanics only — the
cap loop ends with K ≤ 60, edges ascend, counts sum to n, identical
input gives identical output; for `histogramLog`, edges double, the
counts plus the leading counts sum to n, and a value on an edge goes
to the bin that edge opens.
The browser lane ([§7.5](#75-browser-test-lane)) asserts rendering
in `render.spec.ts`, which also narrows the desktop viewport to
600 CSS px with `page.setViewportSize` and then requires each
rendered chart's `<svg>` `viewBox` width to equal its panel's new
CSS width, with the status region unchanged (Resizing); chart
suppression below 10 valid measurements in `interactions.spec.ts`;
the read-off by keyboard and touch in `keyboard-responsive.spec.ts`;
the replayed golden scenario's bin table against the reference
histogram in `golden-scenario.spec.ts`; and, in
`interactions.spec.ts`, the log-scale drive on the width panel of
[GS-0](pdd.md#102-golden-scenarios) — Empty scenario (no active slip
window), default population.

References:

- [ADR-0011](../adr/0011-webapp-toolchain.md);
  [HLDD §4.3 — Language, toolchain, and repository
  structure (ADR-0011)](hldd.md#43-language-toolchain-and-repository-structure-adr-0011)
  (Chart implementation).
- [ADR-0015](../adr/0015-golden-scenario-parity.md) (a new displayed
  statistic lands in the reference generator first).
- [PDD §4.1 — Measurement views (FR-O1)](pdd.md#41-measurement-views-fr-o1);
  [PDD §4.4 — Field overlay (FR-O5, D-18 Proposed)](pdd.md#44-field-overlay-fr-o5-d-18-proposed);
  [PDD §6.3 — Chart export (FR-D2, P2; D-14 Proposed)](pdd.md#63-chart-export-fr-d2-p2-d-14-proposed).
- [FR-G2 — Scarp-type colors and identification](prd.md#fr-g2-scarp-type-colors-and-identification).
- [§3.6 Reference results](#36-reference-results);
  [§5.4 Statistics](#54-statistics);
  [§5.6 Scenario state and URL encoding](#56-scenario-state-and-url-encoding);
  [§5.8 View layer](#58-view-layer).

### 5.13 Application configuration

`subprojects/webapp/src/config.json` holds exactly the product
settings the PDD decides — the
[Verification contract](#verification-contract)'s channel for them —
and nothing else. `src/config.ts` imports it through esbuild's
default JSON loader (`resolveJsonModule: true`,
[§2](#2-repository-structure-naming-and-toolchain)), checks its shape
with `satisfies`, deep-freezes it, and exports typed accessors; no
other module reads the JSON. The file is one JSON object whose member
names are exactly the entry names of the register table below — a
dotted name such as `displayPrecision.scarp_height` is a single
member name. Names are camelCase, except that a per-quantity entry
ends in its quantity's name: the
[DD-10](#1-ddd-decision-register) measurement name verbatim (the
`ColumnName` spelling of `src/decode/fields.ts`,
[§5.2](#52-artifact-loading-and-decoding)) for slip and the three
measurements, and `counts` or `shares` for the two count quantities.
Each member is an entry with six fields:

- `value` — the setting: a number, or the PDD's own words when the
  PDD states the setting in words;
- `governs` — the quantity or surface it governs, in words;
- `decision` — the deciding PDD register ID (`"D-11"` for the first
  row), or null when no register row decides it;
- `source` — the deciding section as a repository path with fragment
  (`"docs/app/pdd.md#45-small-empty-and-partial-results-fr-o3-d-11-proposed"`
  for the first row);
- `quote` — the PDD's exact words inside that section;
- `quoted` — the part of `quote` that states `value`.

The accessors derive what the code consumes and never hold a second
literal; `config.ts` exports these six, and the MVP entries have no
other: `smallResultWarnBelow()` and `chartFloorBelow()` return those
entries' values, the [D-11](pdd.md#1-decision-register) (Small-result
warning threshold, chart floor, and empty-result diagnosis rule)
thresholds of the [§5.8](#58-view-layer) notice tiers;
`lowSlipThresholdStored()` returns `t_s`, the `lowSlipCaveatBelowMetres`
value in 1e-4 m stored units by exact decimal arithmetic — 5,000 for 0.5
— which the low-slip trigger of §5.8 (Caveats) compares with;
`displayDecimals(m)`, for m one of `scarp_height`, `dzw`, `scarp_dip`,
and `slip`, is the number of fraction digits in the shortest decimal
string of the `displayPrecision.<m>` value (`0.01` gives 2, `0.1` gives
1, `1` gives 0), which [§7.2](#72-calculation-parity-tests) compares
with the reference envelope's `display_decimals`; `logScaleMinDecades()`
returns the `logScaleMinDecades` value, which §7.2 compares with the
envelope's `log_scale_min_decades` (rule `PDD §4.1 transcription`); and
`logScaleOfferRatio()` maps that value through the literal table
`{1: 10, 2: 100, 3: 1000}` — powers of ten as integer literals, never
`10 **` — to the ratio R of the [§5.12](#512-charts) offer rule, 100 for
the value 2, and throws for a value outside the table.
`displayPrecision.counts` and `displayPrecision.shares` need no
accessor: `formatCount` prints counts exactly, and every share — the
cumulative axis's ticks of [§5.12](#512-charts) included — prints as a
whole percentage, the forms their words state. The register:

| Entry | `value` | `decision`; `source` | `quote` | `quoted` |
|---|---|---|---|---|
| `smallResultWarnBelow` | 30 | [D-11](pdd.md#1-decision-register) (Small-result warning threshold, chart floor, and empty-result diagnosis rule); [PDD §4.5 — Small, empty, and partial results (FR-O3, D-11 Proposed)](pdd.md#45-small-empty-and-partial-results-fr-o3-d-11-proposed) | "N < 30 valid" | "30" |
| `chartFloorBelow` | 10 | [D-11](pdd.md#1-decision-register); [PDD §4.5 — Small, empty, and partial results (FR-O3, D-11 Proposed)](pdd.md#45-small-empty-and-partial-results-fr-o3-d-11-proposed) | "N < 10 valid" | "10" |
| `lowSlipCaveatBelowMetres` | 0.5 | [D-4](pdd.md#1-decision-register) (Low-slip measurement-reliability policy); [PDD §4.6 — Low-slip caveat (D-4, Interim)](pdd.md#46-low-slip-caveat-d-4-interim) | "includes slip below 0.5 m" | "0.5" |
| `displayPrecision.scarp_height` | 0.01 | [D-23](pdd.md#1-decision-register) (Reader-facing display precision per quantity); [PDD §4.2 — Statistics table (FR-O2)](pdd.md#42-statistics-table-fr-o2) | "scarp height and fault slip 0.01 m" | "0.01" |
| `displayPrecision.slip` | 0.01 | [D-23](pdd.md#1-decision-register); [PDD §4.2 — Statistics table (FR-O2)](pdd.md#42-statistics-table-fr-o2) | "scarp height and fault slip 0.01 m" | "0.01" |
| `displayPrecision.dzw` | 0.1 | [D-23](pdd.md#1-decision-register); [PDD §4.2 — Statistics table (FR-O2)](pdd.md#42-statistics-table-fr-o2) | "deformation-zone width 0.1 m" | "0.1" |
| `displayPrecision.scarp_dip` | 1 | [D-23](pdd.md#1-decision-register); [PDD §4.2 — Statistics table (FR-O2)](pdd.md#42-statistics-table-fr-o2) | "scarp dip 1°" | "1" |
| `displayPrecision.counts` | "exact" | [D-23](pdd.md#1-decision-register); [PDD §4.2 — Statistics table (FR-O2)](pdd.md#42-statistics-table-fr-o2) | "counts exact" | "exact" |
| `displayPrecision.shares` | "whole percentages" | [D-23](pdd.md#1-decision-register); [PDD §4.2 — Statistics table (FR-O2)](pdd.md#42-statistics-table-fr-o2) | "shares whole percentages" | "whole percentages" |
| `logScaleMinDecades` | 2 | null; [PDD §4.1 — Measurement views (FR-O1)](pdd.md#41-measurement-views-fr-o1) | "more than two decades" | "two" |
| `offer.dominanceGapPoints` (P2) | 10 | [D-7](pdd.md#1-decision-register) (Dominant-scarp-type rule for animation offers); [PDD §6.4 — Animation offer and dominance (FR-D4, P2; D-7 Proposed)](pdd.md#64-animation-offer-and-dominance-fr-d4-p2-d-7-proposed) | "within 10 percentage points" | "10" |
| `offer.dominanceFloorShare` (P2) | 30 | [D-7](pdd.md#1-decision-register); [PDD §6.4 — Animation offer and dominance (FR-D4, P2; D-7 Proposed)](pdd.md#64-animation-offer-and-dominance-fr-d4-p2-d-7-proposed) | "below 30 %" | "30" |
| `offer.dominanceMinClassified` (P2) | 20 | [D-7](pdd.md#1-decision-register); [PDD §6.4 — Animation offer and dominance (FR-D4, P2; D-7 Proposed)](pdd.md#64-animation-offer-and-dominance-fr-d4-p2-d-7-proposed) | "fewer than 20 classified records" | "20" |
| `offer.typeCap` (P2) | 3 | [D-7](pdd.md#1-decision-register); [PDD §6.4 — Animation offer and dominance (FR-D4, P2; D-7 Proposed)](pdd.md#64-animation-offer-and-dominance-fr-d4-p2-d-7-proposed) | "up to three types" | "three" |

Rows marked (P2) ship with their features: the MVP file holds the
ten unmarked entries, and a P2 entry joins with its feature, so
(unmarked rows) ⊆ keys ⊆ (all rows). Reader-facing texts are the
same contract's other half: they live in `src/views/copy.json`, the
copy registry of [§5.8](#58-view-layer), each entry citing its
source anchor — a `docs/app/pdd.md` fragment, or, for a `fixed-here`
entry, the `docs/app/ddd.md` section whose body states the text
verbatim. The page texts the bundle never carries live between copy
markers citing their sections (step 7 below): the PDD §5.1 standing
disclaimer and the no-JS fallback of [§5.10](#510-failure-states) in
`subprojects/mkdocs/docs/scenario.md`, and the two glossary additions
of [§6.4](#64-product-pages-beyond-the-scenario-page-p2p3) in
`subprojects/mkdocs/docs/glossary.md`.

**The PDD-agreement check.** `.github/scripts/check_pdd_agreement.py`
reads the PDD itself. It uses the standard library only and reuses
`slug`, `heading_text`, `collect_refs`, `ATX`, `FENCE`, `scan`, and
`resolve` from `.github/scripts/check_doc_links.py`, so its anchors
follow the GitHub slug rule that checker implements. It runs as a
step of the `links` job of `.github/workflows/doc-links.yml` — no
path filter, nothing installed — beside
`python -m unittest discover -s .github/scripts -p 'test_*.py'`, so
an edit to `docs/app/pdd.md` or `docs/app/ddd.md` alone re-runs it
([§6.3](#63-ci-workflows)). Normalization below means: strip `> `
prefixes and `**`, then collapse whitespace; a section's body is its
text outside fenced code from its heading to the next heading of the
same or a higher level. The script reads Markdown only as these
definitions and the steps below state, and it stays that narrow:
where a cited text's source format defeats that reading, the remedy
is an explicit structured source that one of the steps already
reads — in the PDD, only an owner commit restructures a section — or
a narrow exception listed in the script, as the P2 list of step 6
is, which the owner accepts with the script's diff; never a wider
parser. Steps:

1. If `subprojects/webapp/src` is absent, print a skip line and exit
   0; otherwise `config.json` and `copy.json` are both required.
2. Walk each Markdown file it reads, skipping fenced code; compute
   every heading's anchor with `slug` and the link checker's `-N`
   duplicate rule, and require these anchors to be a subset of
   `scan()`'s.
3. Resolve every `source` exactly like a Markdown link written in a
   file at the repository root: `resolve()`, then the fragment in
   `scan(dest).anchors`.
4. For each config entry, after normalization: `quote` occurs in the
   cited section's body, `quoted` occurs in `quote`, and
   `parse(quoted)` equals `value`, where `parse` reads a decimal
   numeral as its number, the words one to ten as theirs, and any
   other text as itself.
5. Read the backticked first cells of the register table above from
   `docs/app/ddd.md`; rows marked (P2) form the P2 set; require
   (rows − P2) ⊆ config keys ⊆ rows.
6. For each PDD §5 subsection that has a blockquote, except §5.1,
   join its `copy.json` entries in `part` order and compare them with
   its blockquotes joined the same way. Each such subsection needs at
   least one entry, except those on the script's P2 list, whose
   product surfaces ship with P2 — exempt as the (P2) rows of step 5
   are, and compared only when they have entries: PDD §5.10, used by
   inverse mode ([§5.14](#514-inverse-mode-p2)), and PDD §5.12 and
   §5.13, used by the P2 pages (copy markers, below;
   [§5.8](#58-view-layer) use-site map). Every other entry — PDD
   §5.11 texts, texts from PDD sections outside §5, and `fixed-here`
   entries citing `docs/app/ddd.md` — occurs verbatim, after
   normalization, in its cited section's body.
7. In `subprojects/mkdocs/docs/scenario.md` and
   `subprojects/mkdocs/docs/glossary.md`, each block between a
   `<!-- copy:<source> -->` line and the next `<!-- /copy -->` line,
   markers excluded, is compared with the section `<source>` cites,
   resolved as in step 3; any other `<source>` than a
   `docs/app/pdd.md` or `docs/app/ddd.md` fragment fails. A file
   that is absent or holds no copy markers contributes no blocks —
   `glossary.md` holds none until the glossary additions of
   [§6.4](#64-product-pages-beyond-the-scenario-page-p2p3) land. A
   block citing `docs/app/pdd.md` equals, after normalization, that
   section's blockquotes joined in order: the PDD §5.1 standing
   disclaimer in `#gre-disclaimer`, cited as
   `<!-- copy:docs/app/pdd.md#51-standing-disclaimer-cr-4-d-10-open -->`,
   carries the PDD's bracketed slot "[the project's liability
   limitations — text pending, D-10]" verbatim while
   [D-10](pdd.md#1-decision-register) (Liability-limitation text
   referenced by CR-4) is open, so it is compared directly, with no
   stand-in token; `copy.json` holds no §5.1 entry
   ([§5.8](#58-view-layer),
   [§6.1](#61-build-outputs-asset-paths-and-page-scaffold)). A block
   citing `docs/app/ddd.md` — the no-JS fallback body in `#gre-root`,
   its `<noscript>` element included, cited as
   `<!-- copy:docs/app/ddd.md#510-failure-states -->`
   ([§5.10](#510-failure-states)), and the glossary block of
   `glossary.md`, cited as
   `<!-- copy:docs/app/ddd.md#64-product-pages-beyond-the-scenario-page-p2p3 -->`
   (§6.4) — equals the content of one fenced code block of the cited
   section byte for byte, once both have their line endings converted
   to LF and trailing whitespace stripped from every line and from
   the end; no other normalization applies, so Markdown links, HTML
   tags, and `**` count as written. An owner commit that records a
   PDD decision keeps the PDD heading anchors that copy markers and
   links cite, or updates every reference in that commit; this step,
   step 3, and `check_doc_links.py` catch a miss.
8. Print one line per failure, then the listing for the
   [SC-7](pdd.md#101-success-criteria) (scientific sign-off) review,
   each text with the SHA-256 of its UTF-8 bytes in lowercase hex:
   one line per `fixed-here` `copy.json` entry, its key and the
   SHA-256 of its `text`; one line per copy-marked block citing
   `docs/app/ddd.md`, its file, line, cited section, and the SHA-256
   of its text as step 7 compares it; then one line per PDD §5
   subsection that has a blockquote, §5.1 included, its anchor and
   the SHA-256 of its blockquotes joined and normalized as step 6
   joins them — and exit 1 on any failure. The
   [§7.7](#77-site-validation-and-release-checklist) SC-7 approval
   record holds this listing.

The P2 morphology and measurement pages carry the PDD §5.12 and
§5.13 texts in their Markdown
([§6.4](#64-product-pages-beyond-the-scenario-page-p2p3)), not in
`copy.json`. When those pages ship, each text stands between copy
markers that cite its PDD section, like the `scenario.md` markers of
step 7, and step 7 reads those pages too, comparing each marked text
with that section's blockquotes the same way — a P2 record, which
[§9](#9-deferred-and-out-of-scope) lists.

`.github/scripts/test_check_pdd_agreement.py` runs the script on
temporary fixtures and asserts its exit status. It must exit 1 for a
renamed heading behind a stale table of contents, a fragment that
occurs only as text (`#dzw`), a value of 29 with `quoted` "30", a PDD
edited to "N < 25 valid", a one-word change in a copy text, a
one-word change in a copy-marked block citing `docs/app/ddd.md`, and
an unknown key; it must exit 0 for a valid heading missing from a
table of contents, PDD §5.12 split into six parts, a §5.1 block
carrying the PDD's bracketed D-10 slot verbatim, a missing P2 key,
no entry for a P2-list subsection, and a `glossary.md` that is
absent or holds no copy markers.

**What the check establishes, and what stays human review.** It
establishes four things: every cited anchor is a real heading under
GitHub's slug rule; each value equals what its quote states inside
the cited section; the copy-deck texts, every other registry text,
and every copy-marked block are reproduced verbatim from their cited
sections; and the key set matches the register table. It does
not establish three things, which are named human review: that each
quote is the governing statement; that the table lists every PDD
setting; and that the fixed-here texts are acceptable. That review
is the owner's acceptance of this section and of every `config.json`
or `copy.json` diff — a PDD edit that moves a quoted value fails the
check until such a diff lands — plus the SC-7 approval of every
fixed-here text the check lists, in `copy.json` or between copy
markers, recorded under gate G-4
([IP §3 — Gates and release sequence](ip.md#3-gates-and-release-sequence))
and owner action OA-4
([IP §4 — Owner and research-group actions](ip.md#4-owner-and-research-group-actions)).

**Exclusions.** No research-derived value may appear in
`config.json`: class names, the palette, canonical orders, physical
ranges, recording steps, stage spacing, and regression coefficients
arrive only through the pipeline-written exports
([§3.2](#32-artifact-manifest), [§3.5](#35-regression-export);
[ADR-0015](../adr/0015-golden-scenario-parity.md), amendment of
2026-10-29). Software and data versions are build stamps
([§6.2](#62-software-and-data-version-stamps)), not configuration.
The quality bars of [D-9](pdd.md#1-decision-register) (Numeric
performance and payload budgets),
[D-16](pdd.md#1-decision-register) (Browser and mobile baseline), and
[D-17](pdd.md#1-decision-register) (Accessibility conformance target)
are checked by [§7.5](#75-browser-test-lane) and
[§7.6](#76-performance-and-compatibility-measurements), not
represented at runtime. The exclusion is enforced by the closed key
set — step 5 rejects any key outside the register table — and by the
review of each entry's `quote`; no test inspects a value for research
origin.

*Verification (planned):* `check_pdd_agreement.py` in the `links`
job, with its self-tests, for the four properties above; the owner's
acceptance and the SC-7 approval for the three human-review items.

References:

- [ADR-0015](../adr/0015-golden-scenario-parity.md) (amendment of
  2026-10-29, product-settings exclusion).
- [HLDD §5.7 — Conversion coefficients (ADR-0015)](hldd.md#57-conversion-coefficients-adr-0015)
  (Other pipeline-supplied values).
- [PDD §4.1 — Measurement views (FR-O1)](pdd.md#41-measurement-views-fr-o1);
  [PDD §4.2 — Statistics table (FR-O2)](pdd.md#42-statistics-table-fr-o2);
  [PDD §4.5 — Small, empty, and partial results (FR-O3, D-11 Proposed)](pdd.md#45-small-empty-and-partial-results-fr-o3-d-11-proposed);
  [PDD §4.6 — Low-slip caveat (D-4, Interim)](pdd.md#46-low-slip-caveat-d-4-interim);
  [PDD §6.4 — Animation offer and dominance (FR-D4, P2; D-7 Proposed)](pdd.md#64-animation-offer-and-dominance-fr-d4-p2-d-7-proposed).
- [PDD §5 — Copy deck](pdd.md#5-copy-deck).
- `.github/scripts/check_doc_links.py` (the slug rule and anchor
  scan the check reuses).

### 5.14 Inverse mode (P2)

Inverse mode ships in P2; this section fixes the decisions its
implementation depends on
([FR-X2 — Inverse search](prd.md#fr-x2-inverse-search)). The mode
switch — "Start from an observed measurement"
([PDD §3.8 — Inverse mode (FR-X2, P2)](pdd.md#38-inverse-mode-fr-x2-p2))
— is a skeleton checkbox at the head of `#gre-controls` (fixed here),
default off (forward mode); it is scenario state, so Reset restores
forward mode ([§5.7](#57-scenario-controls)). Magnitude is never an
input
([FR-G1 — Slip and derived magnitude displays](prd.md#fr-g1-slip-and-derived-magnitude-displays);
[PDD §3.8 — Inverse mode (FR-X2, P2)](pdd.md#38-inverse-mode-fr-x2-p2)).

**Observed-measurement inputs.** One minimum–maximum pair per
measurement — scarp height, deformation-zone width, scarp dip — each
field an `<input type="text" inputmode="decimal" autocomplete="off">`
under the [§5.7](#57-scenario-controls) commit model and rejection
mechanics, with one grammar change (fixed here): the signed grammar
is §5.7's grammar G preceded by at most one ASCII `-` (U+002D),
because scarp height and scarp dip record negative values. Its
canonical form is grammar G's, prefixed with `-` when the value is
negative; a zero value carries no sign (`-0.0` becomes `0`).
Endpoints are inclusive. Only a maximum reads `physical_min`-to-maximum
and only a minimum reads minimum-to-`physical_max` — the column's
recorded extent from its [§3.2](#32-artifact-manifest) `columns`
entry, mirroring the §5.7 lone-endpoint rules; both blank applies no
constraint for that measurement, and "a range for one or more of" the
three may be active
([PDD §3.8 — Inverse mode (FR-X2, P2)](pdd.md#38-inverse-mode-fr-x2-p2)).
A commit is rejected — text kept as typed, `aria-invalid`, one status
announcement — when the text fails the signed grammar or the minimum
exceeds the maximum, compared exactly. The field's rejection line, a
`fixed-here` registry entry citing this section, is "Enter the
observed {measurement} as numbers, the minimum not above the
maximum. The results still show the last valid scenario.", with
{measurement} the canonical label in lower case without its unit. An
entry outside the recorded extent is accepted literally, never
clamped; a range that selects no record yields the
[PDD §4.5 — Small, empty, and partial results (FR-O3, D-11 Proposed)](pdd.md#45-small-empty-and-partial-results-fr-o3-d-11-proposed)
empty state, whose single-condition diagnostic treats each active
observed range as one condition, named "observed {measurement}" (a
`fixed-here` entry). Accepting such an entry, rather than rejecting
it as [§5.7](#57-scenario-controls) rejects a slip maximum above the
recorded one, is the recommended reading of PDD §3.8, which sets no
selectable maximum; it awaits the owner's decision, which
[§9](#9-deferred-and-out-of-scope) lists.

**Inverse query.** An engine extension, not a second engine: the
forward pipeline of [§5.3](#53-query-engine) runs unchanged —
"Forward controls remain available as narrowing filters"
([PDD §3.8 — Inverse mode (FR-X2, P2)](pdd.md#38-inverse-mode-fr-x2-p2))
— and each active observed range adds one per-record predicate beside
the scarp-type filter, evaluated on integers. `src/state/parse.ts`
turns the range's canonical decimals into lo_s = ⌈min·10^d⌉ and
hi_s = ⌊max·10^d⌋ with exact BigInt decimal arithmetic, d being
`columns.<m>.decimals` ([§3.2](#32-artifact-manifest)); a record
matches when its stored value is not the column's `null_sentinel`
and its integer value s — `stored + offset_steps` for `scarp_height`
and `dzw`, `dip_dictionary[index]` for `scarp_dip` — satisfies
lo_s ≤ s ≤ hi_s. A null never matches, and several active ranges
conjoin (fixed here — the record must be consistent with the whole
selected observation,
[PDD §5.10 — Inverse-search framing (FR-X2)](pdd.md#510-inverse-search-framing-fr-x2)).
Because the scarp-dip comparison runs on the dictionary's integers,
range endpoints on and between dictionary values select exactly what
a full scan selects.

**Results.** Distribution panels for fault dip, sediment strength
arm and label, sediment density, sediment depth, and fault slip, in
that order, headed always by the
[PDD §5.10 — Inverse-search framing (FR-X2)](pdd.md#510-inverse-search-framing-fr-x2)
copy
([PDD §4.8 — Inverse-mode results (FR-X2, P2)](pdd.md#48-inverse-mode-results-fr-x2-p2)).
Each condition panel's N is the matching-record count itself:
"condition values are never null, so the excluded-null count is
always zero and the two counts of §3 coincide"
([PDD §4.8 — Inverse-mode results (FR-X2, P2)](pdd.md#48-inverse-mode-results-fr-x2-p2));
the
[PDD §4.5 — Small, empty, and partial results (FR-O3, D-11 Proposed)](pdd.md#45-small-empty-and-partial-results-fr-o3-d-11-proposed)
tiers apply with that N, thresholds from
[§5.13](#513-application-configuration). The fault-slip panel is
continuous and uses the measurement-panel machinery unchanged: the
[§5.12](#512-charts) histogram over the matched slip values, with
d = `columns.slip.decimals` (4) and dd = 2 — the slip precision of
0.01 m that [D-23](pdd.md#1-decision-register) (Reader-facing display
precision per quantity) fixes — and the cumulative view. The four
categorical panels render per-value counts over their
`trial_columns` dictionaries ([§3.2](#32-artifact-manifest)),
sediment as its (`set`, `sediment_strength`) pairs, in the chart
grammar of the measurement views, subject to the categorical-chart
question of [§5.12](#512-charts). The accessible alternative for
every condition panel is its per-value count-and-share table
([PDD §9.3 — Accessibility target (D-17, Proposed)](pdd.md#93-accessibility-target-d-17-proposed))
— one row per dictionary value, or per bin for fault slip; counts by
`formatCount`; shares as whole percent,
`displayRound(100 · count / N, 0)` followed by " %" — rendered in
every state with matching records, exactly as the statistics tables
of [§5.8](#58-view-layer) are; the
[FR-O2 — Summary statistics](prd.md#fr-o2-summary-statistics) set
applies to measurements, not conditions
([PDD §4.8 — Inverse-mode results (FR-X2, P2)](pdd.md#48-inverse-mode-results-fr-x2-p2)).
No display maps conditions back to "your site" — no such view exists
in the module
([PDD §4.8 — Inverse-mode results (FR-X2, P2)](pdd.md#48-inverse-mode-results-fr-x2-p2)).

**Surrounding machinery.** The [DD-11](#1-ddd-decision-register)
canonical scenario object
([§5.6](#56-scenario-state-and-url-encoding)) gains the key
`observed`: null in forward mode; in inverse mode an object with the
keys `scarp_height`, `dzw`, and `scarp_dip`, each null (no
constraint) or {`min`, `max`} holding the effective inclusive
endpoints as canonical decimals — a lone maximum gives `min` the
canonical decimal of `physical_min`, a lone minimum gives `max` that
of `physical_max`. The [§5.9](#59-downloads) `scenario.json` then
carries `schema_version` 2, and the [§3.6](#36-reference-results)
`inputs` gain the key pipeline-first. The scenario summary
([§5.7](#57-scenario-controls);
[FR-G3 — Reader-facing labels and data-driven text](prd.md#fr-g3-reader-facing-labels-and-data-driven-text))
gains one token per active range, after the scarp-filter token and
before the matching-record count, in panel order: "observed
{measurement} {range}" (a `fixed-here` entry), {range} being the
[§5.11](#511-accessibility-supported-environments-and-navigation-lifecycle)
range form over the canonical decimals. In inverse mode the §5.9
package replaces `statistics.csv` with `conditions.csv`: one row per
row of the condition panels' count-and-share tables, in panel order,
with the columns `condition` (`fault_dip`, `sediment`, `density`,
`depth`, or `slip`), `value` (the dictionary value;
`{set}/{sediment_strength}` for sediment; for a slip bin, its edges
at the slip display decimals), `count`, and `share` (whole percent);
provenance block (5) carries the observed-range tokens through
`summaryText` (fixed here). The inverse-mode switch and the observed
ranges join the shared-link restore list when the mode ships
([PDD §7.1 — Shared links](pdd.md#71-shared-links)): §5.6 reserves
`inv` now, and the names and value grammar of the range parameters
are fixed, as [DD-10](#1-ddd-decision-register) snake_case names, by
the §5.6 grammar revision that opens the shared-links lane.

*Verification (planned):* reference coverage is extended
pipeline-first before the mode ships
([ADR-0015](../adr/0015-golden-scenario-parity.md)): inverse golden
scenarios with their condition distributions, and `synthetic`
observed-range cases in [§3.6](#36-reference-results), built by
`eps_ground_rupture/reference_cases.py` — among them scarp-dip range
endpoints on and between dictionary values, the case moved here from
the MVP engine tests, since the MVP has no dip-range control. The
checks then join the parity replay
([§7.2](#72-calculation-parity-tests)), `parse.test.ts` with
signed-grammar cases ([§7.4](#74-application-tests)), and the
browser lane ([§7.5](#75-browser-test-lane)).

References:

- [PDD §3.8 — Inverse mode (FR-X2, P2)](pdd.md#38-inverse-mode-fr-x2-p2);
  [PDD §4.8 — Inverse-mode results (FR-X2, P2)](pdd.md#48-inverse-mode-results-fr-x2-p2);
  [PDD §5.10 — Inverse-search framing (FR-X2)](pdd.md#510-inverse-search-framing-fr-x2);
  [PDD §7.1 — Shared links](pdd.md#71-shared-links).
- [FR-X2 — Inverse search](prd.md#fr-x2-inverse-search);
  [FR-G1 — Slip and derived magnitude displays](prd.md#fr-g1-slip-and-derived-magnitude-displays).
- [§5.3 Query engine](#53-query-engine);
  [§5.6 Scenario state and URL encoding](#56-scenario-state-and-url-encoding);
  [§5.7 Scenario controls](#57-scenario-controls);
  [§5.12 Charts](#512-charts).

## 6. Build, site, and CI integration

### 6.1 Build outputs, asset paths, and page scaffold

Every file the product adds to the served site is a build product:
generated or retrieved during the build, written to gitignored
paths, and never committed
([ADR-0011](../adr/0011-webapp-toolchain.md);
[HLDD §4.3 — Language, toolchain, and repository structure (ADR-0011)](hldd.md#43-language-toolchain-and-repository-structure-adr-0011),
[Build outputs](hldd.md#build-outputs)). The layout, under
`subprojects/mkdocs/docs/`:

| Path | Content | Written by |
|---|---|---|
| `assets/scenario/app-<hash>.js` | the application bundle, copied from `subprojects/webapp/build/dist/app.js`, the `webappBundle` output of [§2](#2-repository-structure-naming-and-toolchain) | `scenarioAssets` |
| `assets/scenario/app-<hash>.css` | the application stylesheet, copied from `subprojects/webapp/build/dist/app.css`, the same output | `scenarioAssets` |
| `assets/scenario/data/<name>` | every vintage file the pointer manifest lists, byte-identical, under exactly the content-hashed names it lists ([§3.3](#33-pointer-manifest); naming template in [§4.1](#41-export-task-and-validation)), copied from the verified cache `fetchVintage` keeps | `scenarioAssets` |
| `includes/scenario-head.html` | the generated tag block below | `scenarioAssets` |
| `includes/media/*.html` | the generated media-slot includes (P2, [§6.4](#64-product-pages-beyond-the-scenario-page-p2p3)) | `mediaIncludes` |

`assets/scenario/data/` is the "dedicated data directory beside the
scenario page (exact path in the DDD)" that
[ADR-0014](../adr/0014-committed-content-hashed-artifacts.md)
delegates here. For the two application assets, `<hash>` is the
first 12 lowercase hexadecimal digits of the SHA-256 of the file's
bytes — the digest [§3 — Data formats](#3-data-formats) fixes for
every checksum — so a changed file always gets a new address and an
existing address is never reused for different contents
([HLDD §7.3 — Delivery and caching](hldd.md#73-delivery-and-caching),
[Content-hashed assets](hldd.md#content-hashed-assets)). Twelve
digits make a name collision between differing contents no practical
concern while keeping addresses legible; data files keep the full
names the pointer lists, which carry the same 12-digit hash. MkDocs
renders a Markdown file anywhere under `docs/` as a page instead of
copying its bytes, so no vintage file name ends in a Markdown
extension: the vintage-terms file is `data-terms-<h12>.txt`, and
the export validation of [§4.1](#41-export-task-and-validation)
rejects any name that does not match the one pattern of its role.

For the site, `.gitignore` gains exactly five entries:
`subprojects/mkdocs/docs/assets/scenario/`,
`subprojects/mkdocs/docs/includes/scenario-head.html`,
`subprojects/mkdocs/docs/includes/media/` (P2),
`subprojects/mkdocs/docs/media/dev/` (development media,
[§6.4](#64-product-pages-beyond-the-scenario-page-p2p3)), and
`subprojects/mkdocs/site-preview/` (the preview build below); the
repository's existing `build/` rule already covers
`subprojects/mkdocs/build/`, where `fetchVintage` keeps its cache.
Because every generated file is untracked, `git archive` and the
Zenodo software record never carry them, and the `.gitattributes`
`export-ignore` rule (today covering only
`subprojects/mkdocs/docs/images/fig-*`, `.gitattributes`) needs no
widening for them. `.gitignore` decides only what git tracks: MkDocs
never reads it, so what a build publishes is decided by the
`draft_docs` boundary and the site checks hook below. The
`assets/scenario/` subtree is ordinary MkDocs source content copied
verbatim into the built site — in the draft state of Publication and
activation (below), into the preview build only; it shares nothing
with Material's own generated `assets/` bundles, which live in other
subdirectories of the built `site/assets/`.

**Staging tasks.** Two new tasks in
`subprojects/mkdocs/build.gradle.kts`, in that file's own task
style — Gradle's built-in task types registered with
`tasks.registering` in the group `documentation`, as its `Exec`
tasks `mkdocsBuild` and `mkdocsServe` are — each with declared
inputs and outputs so an unchanged input skips work; neither is an
`Exec` task. Each output has one owner: `fetchVintage` writes only
its cache, and `scenarioAssets` is the only writer of the
application subtree under `docs/`.

- `fetchVintage` — a plain task (`tasks.registering`, its work in
  `doLast`) that reads `subprojects/webapp/data/pointer.json`
  ([§3.3](#33-pointer-manifest)), its declared input; its declared
  output is the cache directory `subprojects/mkdocs/build/vintage/`.
  For each `files` entry (name → SHA-256): when
  `build/vintage/<data_tag>/<name>` exists and its SHA-256 matches,
  the entry is skipped; otherwise the task runs
  `gh release download <data_tag> --repo HarvardRC/eps-ground-rupture --pattern <name> --dir build/vintage/<data_tag> --clobber`
  — the `gh` tooling the [DD-8](#1-ddd-decision-register)
  attachment step already uses — and hashes the file again. A file
  still missing or mismatched after its download fails the task with
  a `GradleException` naming the file. The task writes nothing under
  `docs/`; its cache makes it idempotent and lets a staged checkout
  build offline. Nothing anywhere in the lane resolves "latest": the
  pointer at the checked-out revision is the only data selector
  ([HLDD §8 — Site integration](hldd.md#8-site-integration),
  [Software and data versions](hldd.md#software-and-data-versions)).
- `scenarioAssets` — a Gradle `Sync` task
  (`tasks.registering(Sync::class)`) into `docs/assets/scenario/`,
  with `dependsOn(":subprojects:webapp:webappBundle", fetchVintage)`
  and the declared inputs `subprojects/webapp/data/pointer.json` and
  the root `CITATION.cff`. It copies `app.js` and `app.css` from
  `subprojects/webapp/build/dist/`, renaming each to
  `app-<first 12 lowercase hex of its SHA-256>.<extension>`, and
  copies from `build/vintage/<data_tag>/` into `data/` exactly the
  names the pointer's `files` lists. A `Sync` destination holds only
  the files the task copied (Gradle 8.10.2, the wrapper's pin), so
  every run leaves exactly the current bundle pair and exactly the
  pinned vintage: stale bundles, files of an earlier vintage, and
  withdrawn files are deleted
  ([§4.3](#43-retention-rollback-recovery-and-withdrawal)). After
  the copy the task writes `includes/scenario-head.html`, its second
  declared output, carrying the two hashed names, the artifact
  manifest's filename — the one pointer `files` key that matches
  `manifest-<h12>.json`, the artifact-manifest pattern of the
  [§4.1](#41-export-task-and-validation) naming template — and the
  two version values of
  [§6.2](#62-software-and-data-version-stamps).

`mkdocsBuild`, `mkdocsServe`, and `mkdocsPreview` (below) gain
`dependsOn(scenarioAssets)`, which runs `fetchVintage` first, so a
local build, `mkdocs serve`, and the preview build carry the same
files CI publishes ("Locally, the corresponding Gradle build
prepares the same files for `mkdocs serve`",
[Build outputs](hldd.md#build-outputs)); from P2 the three tasks
also depend on `mediaIncludes`
([§6.4](#64-product-pages-beyond-the-scenario-page-p2p3)). The
module's `clean` — the `base` plugin's task, which already deletes
`build/` and with it the cache — additionally deletes exactly
`site/`, `site-preview/`, `docs/assets/scenario/`,
`docs/includes/scenario-head.html`, and `docs/includes/media/`. It
never deletes `docs/assets/` or `docs/includes/` as a whole:
`docs/includes/` holds four committed includes, and `docs/assets/`
is where a committed theme override such as Material's
`assets/images/favicon.png` would live. CI runs
`scenarioAssets` — and through it `fetchVintage` — in the site
workflow's build job, excluding the bundle dependency there because
the `webapp-bundle` job hands the `build/dist/` output over as a
workflow artifact (`-x :subprojects:webapp:webappBundle`,
[§6.3](#63-ci-workflows)).

**Generated tag block.** `scenarioAssets` writes
`includes/scenario-head.html` exactly as (placeholders in angle
brackets):

```html
<link rel="stylesheet" href="../assets/scenario/app-<csshash>.css">
<script type="module" id="gre-app"
        src="../assets/scenario/app-<jshash>.js"
        data-software-version="<software version>"
        data-data-version="<pointer export_version>"
        data-manifest="data/<artifact-manifest filename>"></script>
```

The `../` matches the page's published depth: root-level pages
publish one directory deep, the same depth rule the site's citation
includes and figure links already encode
(`subprojects/mkdocs/EMBEDS.md`;
`subprojects/mkdocs/docs/dashboards/model-vs-reality.md`). At every
mount the application finds this element (identifier contract
below) and resolves `data-manifest` against the element's own `src`
(`new URL(tag.dataset.manifest, tag.src)`), which lands on
`assets/scenario/data/<name>` from any page URL; the loader of
[§5.2](#52-artifact-loading-and-decoding) starts there.
The three `data-*` attribute names are fixed; renaming one is a
breaking change to the §5.2 loader contract.

**Page scaffold.** The scenario page is
`subprojects/mkdocs/docs/scenario.md`. Until activation it opens with
the front matter `search: exclude: true` (Publication and
activation, below); its body, in order: the `#`
masthead carrying the product name — "The page masthead carries the
product name, Ground Rupture Explorer"
([PDD §2.2 — Entry point (D-2, Decided 2026-10-28)](pdd.md#22-entry-point-d-2-decided-2026-10-28))
— then the mount element, then the standing-disclaimer section,
then the include block:

```markdown
---
search:
  exclude: true
---

# Ground Rupture Explorer

<div id="gre-root" markdown="1">
<!-- copy:docs/app/ddd.md#510-failure-states -->
(the no-JS fallback body and its <noscript> sentence: the fixed-here
copy of §5.10, verbatim; also the page's search-indexable description
per ADR-0010)
<!-- /copy -->
</div>

<div id="gre-disclaimer" markdown="1">
<!-- copy:docs/app/pdd.md#51-standing-disclaimer-cr-4-d-10-open -->
(the PDD §5.1 disclaimer text verbatim as plain paragraphs: the
blockquote's lines without their "> " prefixes, one paragraph per
blockquote paragraph, compared after the step-7 normalization; its
pending slot written as PDD §5.1's bracketed text verbatim, "[the
project's liability limitations — text pending, D-10]", until the
D-10 text is sourced)
<!-- /copy -->
</div>

<div markdown="0">
--8<-- "includes/scenario-head.html"
</div>
```

`#gre-root` holds the no-JS fallback body and its `<noscript>`
sentence — the fixed-here copy that [§5.10](#510-failure-states)
states verbatim — between copy markers that cite that section. It
is the page's search-indexable description
([ADR-0010](../adr/0010-native-client-side-scenario-app.md)), and
the first render replaces it in the browser. It is public
reader-facing text, so step 7 of the PDD-agreement check of
[§5.13](#513-application-configuration) compares the marked text
with §5.10's, and step 8 lists it for the
[SC-7](pdd.md#101-success-criteria) (scientific sign-off) review.

`#gre-disclaimer` holds the full standing disclaimer of
[PDD §5.1 — Standing disclaimer (CR-4; D-10 Open)](pdd.md#51-standing-disclaimer-cr-4-d-10-open)
— "Full text, reachable from every product surface" — outside the
element the application replaces. The application writes nothing
outside `#gre-root` except the `tabindex="-1"` that the
fragment-link guard of
[§5.11](#511-accessibility-supported-environments-and-navigation-lifecycle)
gives a target that cannot otherwise take focus; that attribute
changes no text, so the full disclaimer stands in every state: no
JavaScript, loading, mounted, empty, capability, and failure. The
section carries no heading, because a heading would be new
reader-facing copy. The short disclaimer near the results links to
it as `#gre-disclaimer` ([§5.8](#58-view-layer)), and each P2/P3
page links to `scenario.md#gre-disclaimer`
([§6.4](#64-product-pages-beyond-the-scenario-page-p2p3)). The text
between its copy markers is authored only here — the bundle
carries no PDD §5.1 text — and the PDD-agreement check of
[§5.13](#513-application-configuration) requires it to equal PDD
§5.1, its bracketed D-10 slot included. The section's place, after
the application and before the include block, is a user-visible
arrangement fixed here; like the [DD-4](#1-ddd-decision-register)
panel arrangement, it is settled only by the owner's acceptance of
this section.

The include uses the site's established snippets pattern
(`pymdownx.snippets` with `base_path` `docs` and
`check_paths: true`, `subprojects/mkdocs/mkdocs.yml`), inside a
`markdown="0"` wrapper that keeps the Markdown parser out of the raw
HTML. The tag block is inlined into the built page at build time, so
only the scenario page carries the bundle — the
loads-only-on-the-scenario-page rule of
[ADR-0011](../adr/0011-webapp-toolchain.md) — and a strict build of
the page without staging fails on the missing include
(`check_paths`), never producing an application-less page. In
`mkdocs build` MkDocs reads no drafted page, so in the draft state
that failure arises in the preview build, which builds the page;
from the prototype deployment on, in both builds. `includes/` is
already excluded from pages (`exclude_docs`,
`subprojects/mkdocs/mkdocs.yml`), and the directive never sits
inside an HTML comment, where it would expand silently
(`subprojects/mkdocs/EMBEDS.md`).

The application mounts into `#gre-root` and replaces the fallback
only once its interactive content is ready
([HLDD §9 — Testing and release architecture](hldd.md#9-testing-and-release-architecture)).
Material re-creates every `<script>` inside its content container
on an instant-navigation swap, so the tag block also loads the
bundle when a reader first enters the page by instant navigation
(the theme facts are recorded in
[§5.11](#511-accessibility-supported-environments-and-navigation-lifecycle)).
A module script evaluates once per document per bundle URL: re-entry
under the same URL re-initializes through the §5.11
navigation-lifecycle algorithm, never through re-evaluation; after
a redeploy a second instance can evaluate in the same document, and
the §5.11 slot decides which one mounts
([Page loading and navigation](hldd.md#page-loading-and-navigation)).

**Identifier contract.** The HLDD requires "an application mount
point" and leaves the exact identifiers to this document
([Scenario page and generated assets](hldd.md#scenario-page-and-generated-assets));
they are fixed here, and every other section cites this list. Every
DOM id and class the product introduces carries the `gre-` prefix
(Ground Rupture Explorer).

- `#gre-root` — the mount element, a `<div>` authored with the no-JS
  fallback body as its children. The first render replaces those
  children wholesale (`replaceChildren`) with the skeleton of
  [§5.8](#58-view-layer); the element itself persists, and the
  application writes nothing outside it except the `tabindex="-1"`
  that the fragment-link `guard` of
  [§5.11](#511-accessibility-supported-environments-and-navigation-lifecycle)
  gives a target that cannot otherwise take focus, such as
  `#gre-disclaimer`; that attribute changes no text (above). After
  the first render commits, mount sets two test hooks on it:
  `data-gre-mounted` and `data-gre-build` (the mounting bundle's
  `import.meta.url`). The hooks never decide idempotence; the
  [§5.11](#511-accessibility-supported-environments-and-navigation-lifecycle)
  slot does.
- `#gre-app` — the `type="module"` script of the generated tag
  block. It loads the bundle and carries `data-software-version`,
  `data-data-version`, and `data-manifest`. The application finds it
  with `document.getElementById('gre-app')` at every mount — a module
  script has no `document.currentScript` — and reads its dataset
  then, never at module evaluation; it is never a mount point and is
  never mutated.
- `#gre-disclaimer` — the persistent full-disclaimer section, a
  sibling after `#gre-root` (above).
- The skeleton's region ids, replaced slots, and panel ids
  (`gre-{measurement}`) — the region model of
  [§5.8](#58-view-layer), built at mount inside `#gre-root`.
- `#gre-family-toggle`, with the marker attribute `data-gre-bound` —
  the morphology page's toggle mount
  ([§6.4](#64-product-pages-beyond-the-scenario-page-p2p3)).
- `gre-visually-hidden` — the class of the visually-hidden utility
  ([§5.11](#511-accessibility-supported-environments-and-navigation-lifecycle)).
- `gre-table-scroll` — the class of the scroll wrapper around each
  chart-data table
  ([§5.11](#511-accessibility-supported-environments-and-navigation-lifecycle)).

**Publication and activation.** The publication boundary is MkDocs'
`draft_docs`; `not_in_nav` only declares a nav omission deliberate.
A `not_in_nav` page is still built, deployed, publicly addressable,
and listed in `sitemap.xml` and the site search index, whereas a
drafted page or file is left out of `mkdocs build` entirely —
absent from the output tree, `sitemap.xml`, and the search index —
while `mkdocs serve` still includes it (mkdocs 1.6.1, locked in
`subprojects/python/poetry.lock`). The scenario page passes through
three publication states, which the publication configuration
`subprojects/mkdocs/mkdocs.yml` declares: development, then the two
phases of
[ADR-0017 — An unadvertised prototype deployment precedes the public release](../adr/0017-unadvertised-prototype-before-public-release.md)
(Proposed):

1. *draft* (development): `draft_docs` lists `scenario.md` and
   `assets/scenario/`, so no deploy carries the page, the bundle, or
   a data file;
2. *unlisted prototype* (Phase 1, deployed for the research group's
   review): `draft_docs` lists neither, so the page is deployed, but
   nothing lists it — `not_in_nav` keeps it out of the nav, its front
   matter `search: exclude: true` keeps it out of the search index
   (the search plugin of Material 9.7.7 skips such a page), and in
   publication builds the site checks hook removes it from
   `sitemap.xml` and fails the build when any other page links to it
   (arm (d), below); its results header shows the prototype notice
   ([§5.8](#58-view-layer));
3. *activated* (Phase 2, the public release): nav entry, search and
   sitemap inclusion, no prototype notice — the activation commit
   below.

In the draft state `subprojects/mkdocs/mkdocs.yml` carries:

```yaml
draft_docs: |
  media/dev/
  scenario.md
  assets/scenario/
not_in_nav: |
  scenario.md
hooks:
  - hooks/site_checks.py
```

The unlisted prototype is not a public release — "A public release
is the activated site — the scenario page in the site's navigation —
or a tagged GitHub release"
([Licensing and media permissions](hldd.md#licensing-and-media-permissions))
— so it shows its unapproved copy, PDD §5.1's pending D-10 slot
included, as drafted (ADR-0017), and the approval that reader-facing
texts need "before a public release that introduces or changes them"
([CR-10 — Scientific-content approval](prd.md#cr-10-scientific-content-approval))
is recorded before the release that activates the page
([§7.7](#77-site-validation-and-release-checklist)).
`media/dev/` stays drafted permanently
([§6.4](#64-product-pages-beyond-the-scenario-page-p2p3)).
`not_in_nav` stays until activation because the preview build, and
from the prototype deployment on the publication build, includes the
page without a nav entry, and the site's `validation` block promotes
`omitted_files` to a warning that `--strict` turns into a build
failure (`subprojects/mkdocs/mkdocs.yml`).

The committed `subprojects/mkdocs/mkdocs.preview.yml` is the
preview configuration:

```yaml
INHERIT: mkdocs.yml
draft_docs: |
  media/dev/
site_dir: site-preview
```

MkDocs deep-merges the inherited file and replaces a scalar the
child sets, so the preview build is the publication configuration
with every product draft included, `media/dev/` still drafted, and
its output in `subprojects/mkdocs/site-preview/` — validated in CI,
served by the browser lane ([§7.5](#75-browser-test-lane)) and by
the reference-environment measurement of
[§7.6](#76-performance-and-compatibility-measurements), and never
part of the Pages artifact or a deploy. It keeps the publication
`site_url`; the lane's server rewrites the origin in `sitemap.xml`
alone (§7.5). The Gradle task `mkdocsPreview` builds it: an `Exec`
task in this module in the style of `mkdocsBuild` — group
`documentation`, `workingDir = projectDir`, running the venv's
`mkdocs build --strict -f mkdocs.preview.yml`, with
`dependsOn(poetryInstall, scenarioAssets)`, inputs `docs/`,
`mkdocs.yml`, `mkdocs.preview.yml`, `hooks/site_checks.py`, and
`publication-allowlist.txt`, output `site-preview/` — and wired
into `assemble` like `mkdocsBuild`. `mkdocsBuild` gains the same
two inputs `hooks/site_checks.py` and `publication-allowlist.txt`,
so an edit to the hook or the allowlist re-runs both builds instead
of leaving them up to date.

**Site checks hook.** One MkDocs hook,
`subprojects/mkdocs/hooks/site_checks.py`, registered by the
`hooks` entry above and inherited by the preview configuration,
checks every build that writes a site tree: CI's, the local Gradle
tasks', a bare `mkdocs build`, and the `mkdocs gh-deploy` fallback
that [ADR-0009](../adr/0009-github-pages-hosting.md) keeps, which
calls the same build. `on_startup` records the command, and every
check, and the sitemap edit below, is skipped for `serve`;
`on_files` records which source files the running configuration
marks as drafts and which pages it lists under `not_in_nav` without
drafting them — its unlisted pages. Every build whose configuration
file (`config.config_file_path`) is not `mkdocs.preview.yml` is a
publication build; in a publication build `on_post_template`, for
the template `sitemap.xml`, removes from the rendered output each
`<url>` element whose `<loc>` is an unlisted page's
`canonical_url`, before MkDocs writes `sitemap.xml` and
`sitemap.xml.gz` from that output. The preview build keeps those
entries, because Material's instant navigation intercepts a click
only when the target URL is in the sitemap
([§7.5](#75-browser-test-lane)). `on_post_build` walks
`config.site_dir` and raises `PluginError` — which aborts the build
with a nonzero exit (mkdocs 1.6.1) — listing every offending
site-relative path under five arms:

- (a) **Development media** — any path under `media/dev/`, and any
  built `.html`, `.js`, or `.css` file containing the substring
  `media/dev/`.
- (b) **Publication inventory** — any file outside
  `assets/scenario/` whose suffix is not `.html`, `.js`, `.css`,
  `.map`, `.json`, `.xml`, or `.txt` (`sitemap.xml.gz` excepted),
  referenced or not, unless its path matches a line of the committed
  `subprojects/mkdocs/publication-allowlist.txt` (fnmatch patterns,
  `#` comments) or, from P2, equals the `file` of a media-index
  entry whose `permission.status` is `granted` — the index the
  pointer names, read from `docs/assets/scenario/data/`
  ([§6.4](#64-product-pages-beyond-the-scenario-page-p2p3)).
- (c) **Application subtree** — when `assets/scenario/` exists in
  the output: `assets/scenario/data/` holds exactly the `files` keys
  of the committed `subprojects/webapp/data/pointer.json`, each
  file's SHA-256 equal to the pointer's, and `assets/scenario/`
  holds at top level exactly
  `data/` plus the `app-<hash>.js` and `app-<hash>.css` that the
  built `scenario/index.html` names (the `#gre-app` `src` and the
  stylesheet `href`).
- (d) **Publication boundary** — the publication state the running
  configuration declares: for every drafted source file, its output
  path is absent from the output tree, its URL is absent from
  `sitemap.xml` and from `search/search_index.json`, and no `href`
  or `src` in a built page resolves to it; in a publication build,
  for every unlisted page, its URL is absent from `sitemap.xml` and
  from `search/search_index.json`, and no `href` or `src` in any
  other built page resolves to it. MkDocs itself logs a link to a
  draft at INFO only, which `--strict` ignores, and a link to a
  `not_in_nav` page not at all.
- (e) **Tableau exclusion** — no built page carries a `<script>`
  whose `src` begins with
  `https://public.tableau.com/javascripts/api/`, and every built
  page carries a `<script>` whose `src` ends with
  `javascripts/tableau-loader.js` (below).

The initial allowlist is the non-text inventory of the site as built
at drafting (2026-10-30): `assets/images/favicon.png` (the Material
theme default) and the four committed paper figures
`images/fig-03-dem-model-schematic.png`,
`images/fig-04-compare-dem-models.png`,
`images/fig-05-ml-model-measurements.jpg`, and
`images/fig-07-homogeneous-vs-ctu.png`
([`notes/Roadmap.md` — Decisions made](../../notes/Roadmap.md#decisions-made),
Paper figures). A new project image — a P2 model snapshot under
`docs/images/` included — enters by a reviewed one-line diff of the
allowlist.

The **prototype deployment** (draft → unlisted prototype) is one
commit to `subprojects/mkdocs/mkdocs.yml`: remove `scenario.md` and
`assets/scenario/` from `draft_docs`, leaving `media/dev/`, and keep
the `not_in_nav` block and the `hooks` entry; its merge into `main`
deploys the unlisted page with the staged bundle and the
checksum-verified data.

**Activation** (unlisted prototype → activated) of the scenario page
is one commit: delete the `not_in_nav` block, whose only line is
`scenario.md`; keep `draft_docs`, now `media/dev/` alone, and the
`hooks` entry; insert
`- Scenario explorer: scenario.md`
immediately after the `Dashboards` block, before `- Data: data.md` —
the [D-2](pdd.md#1-decision-register) entry "placed after
Dashboards"
([PDD §2.2 — Entry point (D-2, Decided 2026-10-28)](pdd.md#22-entry-point-d-2-decided-2026-10-28));
delete the front matter of `scenario.md`, whose only key is
`search`; and delete the entry `ddd5.8.prototypeNotice` from
`subprojects/webapp/src/views/copy.json`, which removes the
prototype notice ([§5.8](#58-view-layer)).
The release run of the browser lane
([§7.7](#77-site-validation-and-release-checklist), item 4) is taken
on the release branch, which carries the activation commit — the
branch on which §7.7 runs its pre-merge checks — "Before the merge
that releases the change"
([Data refresh and deployment](hldd.md#data-refresh-and-deployment),
step 7). From that commit on, the page participates in the site's
navigation, search, sitemap, and strict build like every other page
([Existing-site integration](hldd.md#existing-site-integration)).
Each later surface ships through the same three states
([§6.4](#64-product-pages-beyond-the-scenario-page-p2p3)).

**Transport contract.** The page fetches every data file from the
site's own origin under `assets/scenario/data/` — "the page
downloads nothing from a release at run time"
([ADR-0014](../adr/0014-committed-content-hashed-artifacts.md)).
The files are served exactly as uploaded — pre-compressed where
their format fixes compression
([§3.1](#31-scenario-artifact-binary-layout),
[§3.4](#34-field-data-export), [§3.5](#35-regression-export)), plain
JSON otherwise ([§3.2](#32-artifact-manifest)) —
the bytes every checksum covers
([§3 — Data formats](#3-data-formats)).
The page decides decompression from the received bytes, never from
response headers, by the gzip guard of
[§5.2](#52-artifact-loading-and-decoding) step 2, which the lazily
loaded exports share; decompression therefore happens at most once,
and no `Content-Encoding`, `Content-Type`, or cache header
capability is assumed of the host, which promises none for binary
files ([ADR-0014](../adr/0014-committed-content-hashed-artifacts.md)).
Either path ends in the §5.2 validation that precedes every read, so
even a misidentified stream lands in the explicit failure state of
[§5.10](#510-failure-states), never in a silent wrong result. The
decompress path runs in CI in the parity harness, which decodes the
same compressed files through the same loader
([§7.2](#72-calculation-parity-tests)); the browser lane's server
mirrors the published host's headers
([§7.5](#75-browser-test-lane)) — the manifest gzip-encoded in
transit, `.gz` files served as stored — so in the lane the manifest
arrives through HTTP content decoding and every `.gz` file reaches
the decompress path; the host's actual headers are recorded on the
published site after activation and compared, per file class and
for every same-origin response under the site's base path, with
what the lane's server sends, by the published-site run of
[§7.6](#76-performance-and-compatibility-measurements), per the
rule that cache and header behavior is measured, not assumed
([HLDD §7.3 — Delivery and caching](hldd.md#73-delivery-and-caching)).

**Tableau exclusion.**
[ADR-0011](../adr/0011-webapp-toolchain.md) rules that "the scenario
page does not load the site-wide Tableau Embedding API module it has
no use for" and assigns the exclusion mechanics to this document.
The module leaves `extra_javascript`; a small committed loader takes
its place and injects it only where embeds exist:

- `subprojects/mkdocs/mkdocs.yml`: the first `extra_javascript`
  entry — the `public.tableau.com` Embedding API `path` with its
  `type: module` line — is replaced by
  `javascripts/tableau-loader.js`. The three other site-wide scripts
  (`tableau-fit.js`, `cite-modal.js`, `figure-modal.js`) stay where
  they are: the established site-wide pattern is untouched
  ([ADR-0011](../adr/0011-webapp-toolchain.md)).
- `subprojects/mkdocs/docs/javascripts/tableau-loader.js` (new,
  committed): a presence-guarded injector in the delegated,
  guard-first pattern of the site's `figure-modal.js`. Material
  emits `extra_javascript` after its own bundle and outside its
  content container, so the loader evaluates once per document. It
  subscribes to Material's `document$` page-ready observable, which
  replays the current page to a late subscriber; without
  `document$` it runs its check on `DOMContentLoaded` while
  `document.readyState` is `loading`, and at once otherwise. On each
  page-ready event it checks the current document for a
  `<tableau-viz>` element or a `.tableau-fit` container; when one is
  present and a flag in the loader's closure shows no injection
  yet, it sets the flag and appends one `<script type="module">` tag
  for the Embedding API
  (`https://public.tableau.com/javascripts/api/tableau.embedding.3.latest.min.js`)
  to `document.head` — never a second one; a module script evaluates
  once per document. No page front matter and no theme override is
  involved; `subprojects/mkdocs/EMBEDS.md` records the loader as
  part of the one embed pattern.

The presence guard makes the exclusion hold on both navigation
paths. On a direct load of a page without embeds — the scenario page
and every other non-dashboard page — the module is never requested.
Under Material's `navigation.instant`, page visits swap content
without reloading the document, and instant navigation adopts
head-emitted elements without executing their scripts, so a per-page
head tag would run only on full loads; the loader instead runs on
every `document$` emission, so a reader who lands anywhere and
navigates into a dashboard gets the module injected exactly then,
and the dashboards behave identically on direct and
instant-navigation entry. Site checks hook arm (e) enforces the
static half in every build; the runtime injection is the browser
lane's to check.

*Verification (planned):* every strict build runs the site checks
hook — CI's **Build site** and **Build preview site** steps
([§6.3](#63-ci-workflows)) and the local `mkdocsBuild` and
`mkdocsPreview` tasks — so a drafted path, sitemap entry, search
entry, or link in the output, in a publication build an unlisted
page's sitemap entry, search entry, or link from another page, a
media file neither allowlisted nor granted, an inexact application
subtree, or an Embedding-API tag fails the build; the strict preview
build (from the prototype deployment on, both builds) fails on a
missing generated include or a nav omission; `fetchVintage` fails
on any missing file or checksum mismatch, wired into CI by
[§6.3](#63-ci-workflows); the **Check PDD agreement** step of §6.3
compares both copy-marked blocks of `scenario.md` — the fallback
body and the disclaimer — with the sections they cite
([§5.13](#513-application-configuration) step 7). Staging drills:
`./gradlew :subprojects:mkdocs:mkdocsBuild --dry-run` lists
`fetchVintage`, `scenarioAssets`, and `mkdocsBuild` in that order;
stray files planted under `docs/assets/scenario/` and
`docs/assets/scenario/data/` are gone after the next
`scenarioAssets` run, which leaves `data/` equal to the pointer's
key set; an immediate rerun reports `fetchVintage` and
`scenarioAssets` UP-TO-DATE without network access; a byte flipped
in a staged data file is restored by the next run; a changed
`CITATION.cff` version re-stamps `scenario-head.html`; and `clean`
leaves an unrelated file under `docs/assets/` in place. Hook drills:
an unreferenced copy of a figure saved as `docs/images/zz-unlisted.png`
fails a bare `mkdocs build --strict`, naming that path; removing the
`fig-05` allowlist line after a successful `mkdocsBuild` makes the
next `mkdocsBuild` run, not report UP-TO-DATE, and fail, naming
that figure; a file under `docs/media/dev/` is absent from `site/`
yet answers under `mkdocs serve`, and a scratch page referencing it
fails the build; a scratch link from `index.md` to the drafted
`scenario.md` fails the publication build, naming `index.html`; with
`scenario.md` unlisted, the same scratch link fails the publication
build too, and without it the publication build's `sitemap.xml`,
`sitemap.xml.gz`, and `search/search_index.json` hold no
`scenario/` URL while the preview build's `sitemap.xml` holds it. The
browser lane ([§7.5](#75-browser-test-lane)), serving the preview
tree with working instant navigation (each instant step asserts that
a window probe survives), asserts that the scenario page loads no
script from `public.tableau.com` while each dashboard page — entered
directly and via instant navigation from a non-dashboard page —
upgrades its `<tableau-viz>` element on both paths, and that the
mount, fallback replacement, `#gre-disclaimer` persistence, and
instant-navigation re-entry behave as above; the published-site run
of [§7.6](#76-performance-and-compatibility-measurements) — its
header comparison and its cold and fresh-warm loads — checks the
contract on the published host after activation. Together these
cover the generated assets and retrieved data files, not only the
Markdown source
([Build and deployment checks](hldd.md#build-and-deployment-checks)).

References:

- [HLDD §4.3 — Language, toolchain, and repository
  structure (ADR-0011)](hldd.md#43-language-toolchain-and-repository-structure-adr-0011)
  ([Build outputs](hldd.md#build-outputs);
  [Page loading and navigation](hldd.md#page-loading-and-navigation)).
- [HLDD §8 — Site integration](hldd.md#8-site-integration)
  ([Navigation](hldd.md#navigation);
  [Scenario page and generated assets](hldd.md#scenario-page-and-generated-assets)).
- [HLDD §7.3 — Delivery and caching](hldd.md#73-delivery-and-caching)
  ([Existing-site integration](hldd.md#existing-site-integration)).
- [HLDD §9 — Testing and release architecture](hldd.md#9-testing-and-release-architecture)
  ([Site validation](hldd.md#site-validation);
  [Data refresh and deployment](hldd.md#data-refresh-and-deployment)).
- [Licensing and media permissions](hldd.md#licensing-and-media-permissions).
- [ADR-0011](../adr/0011-webapp-toolchain.md);
  [ADR-0014](../adr/0014-committed-content-hashed-artifacts.md);
  [ADR-0010](../adr/0010-native-client-side-scenario-app.md);
  [ADR-0009](../adr/0009-github-pages-hosting.md);
  [ADR-0017](../adr/0017-unadvertised-prototype-before-public-release.md)
  (Proposed: the publication states).
- [PDD §2.2 — Entry point (D-2, Decided
  2026-10-28)](pdd.md#22-entry-point-d-2-decided-2026-10-28);
  [PDD §5.1 — Standing disclaimer (CR-4; D-10
  Open)](pdd.md#51-standing-disclaimer-cr-4-d-10-open).
- [CR-10 — Scientific-content approval](prd.md#cr-10-scientific-content-approval).
- `subprojects/mkdocs/mkdocs.yml` (nav, `extra_javascript`,
  `exclude_docs`, `validation`, `draft_docs`, `not_in_nav`,
  `hooks`); `subprojects/mkdocs/mkdocs.preview.yml`;
  `subprojects/mkdocs/hooks/site_checks.py`;
  `subprojects/mkdocs/publication-allowlist.txt`;
  `subprojects/mkdocs/build.gradle.kts`;
  `subprojects/mkdocs/EMBEDS.md`; `.gitignore`; `.gitattributes`.

### 6.2 Software and data version stamps

The product displays two distinct versions — the software version
and the data-export version — in the page footer and in every
download
([Software and data versions](hldd.md#software-and-data-versions);
[PDD §7.2 — Version display and notice (D-15, Proposed)](pdd.md#72-version-display-and-notice-d-15-proposed);
[DR-2 — Versioned exports](prd.md#dr-2-versioned-exports)).

**Sources.** The software version is the `version` key of the root
`CITATION.cff` — the repository's committed, machine-readable
software-version record (`type: software`; `0.2.0` at drafting,
equal to the `version` of `.zenodo.json`). A product release updates
that key; the release record of
[§7.7](#77-site-validation-and-release-checklist) identifies the
software revision it belongs to, and
[PDD §9.4 — Releases](pdd.md#94-releases) is the rule that each
product release updates the displayed value. The data-export
version is the `export_version` of the committed pointer manifest
([§3.3](#33-pointer-manifest)). Neither value is ever taken from a
"latest available release": the build and the browser read only
committed sources and the files they pin
([Software and data versions](hldd.md#software-and-data-versions)).

**Passing them to the page.** The `scenarioAssets` task of
[§6.1](#61-build-outputs-asset-paths-and-page-scaffold) declares
`CITATION.cff` and `subprojects/webapp/data/pointer.json` as inputs,
reads both values at staging time, and writes them into the
generated tag block as `data-software-version` and
`data-data-version` on the `#gre-app` script element; a changed
value therefore re-runs the task and re-stamps the include. Stamping
at staging time, not at bundling time, keeps every version constant
out of the bundle, so a release that changes no application source
leaves the bundle bytes — and therefore its content-hashed address —
unchanged. The full SHA-256 of the bundle and of the stylesheet thus
identifies the application build alone; the release record compares
it across the tested, deployed, and measured builds
([§7.7](#77-site-validation-and-release-checklist), Evidence
ledger), because a version stamp labels a build but never identifies
it. The application reads both values from the `#gre-app`
dataset at every mount, never at module evaluation (the
[§6.1](#61-build-outputs-asset-paths-and-page-scaffold) identifier
contract): a data-only refresh changes `data-data-version` under an
unchanged bundle URL, so a long-lived document can meet the new
value in a bundle instance that loaded the old vintage. The vintage
cache of
[§5.11](#511-accessibility-supported-environments-and-navigation-lifecycle)
is keyed by the manifest URL and `data-data-version`, so such a
re-entry re-runs the full [§5.2](#52-artifact-loading-and-decoding)
load and its version check instead of re-mounting the old vintage
under the new stamp. A missing attribute is a startup failure under
[§5.10](#510-failure-states), never a silently unlabeled result.

A release commit that changes only the version — `CITATION.cff`,
with `.zenodo.json` — still runs both path-filtered workflows,
because both push filters name `CITATION.cff`
([§6.3](#63-ci-workflows)); on `main` the Companion site deploy it
triggers re-stamps the footer, as
[PDD §9.4 — Releases](pdd.md#94-releases) requires: "each one
updates the displayed software version".

**Runtime check.** The application compares the loaded artifact
manifest's `export_version` ([§3.2](#32-artifact-manifest)) for
strict equality with `data-data-version`. On mismatch, calculation
stops and the page enters the explicit failure state of
[§5.10](#510-failure-states): "The application must not label a
result with the expected version without verifying the data actually
loaded"
([Software and data versions](hldd.md#software-and-data-versions)).
The check runs in the loader before any decode
([§5.2](#52-artifact-loading-and-decoding)). The view layer renders
both values in the product footer `#gre-versions`
([§5.8](#58-view-layer)), and downloads carry them in the
provenance field order of
[PDD §6.1 — Download package (FR-D1)](pdd.md#61-download-package-fr-d1)
([§5.9](#59-downloads)), with the export date taken from the loaded
manifest's `export_date`. Shared links (P2) carry no version stamp
when they first ship; the stamp-difference notice is
[PDD §7.2 — Version display and notice (D-15, Proposed)](pdd.md#72-version-display-and-notice-d-15-proposed)
material, and its wiring waits for the shared-link value grammar
that [§5.6](#56-scenario-state-and-url-encoding) defers to P2.

**Cache busting.** Every product asset — bundle, stylesheet, and
data files — has a content-hashed address
([§6.1](#61-build-outputs-asset-paths-and-page-scaffold)), the
deliberate strengthening of the site's `?v=` convention
([ADR-0014](../adr/0014-committed-content-hashed-artifacts.md));
the `?v=` query remains only on the site-wide
`stylesheets/extra.css`, which keeps a stable name
(`subprojects/mkdocs/mkdocs.yml`). The page HTML keeps its stable
address and carries the new hashed references after each publish.
A hashed address never changes meaning, however hard its file is
cached, but an older cached copy of the page HTML can still name
older assets until the browser revalidates the page.
What the host actually sends, and how a warm visit within its
max-age performs there, is measured on the published site after
activation by
[§7.6](#76-performance-and-compatibility-measurements); a later
visit, which revalidates, is timed only against
`playwright/serve.mjs` with a max-age of 0, whose headers, max-age
aside, the published-site run requires to equal the host's on every
same-origin response under the site's base path, so
warm-cache performance never relies on cache settings the hosting
arrangement has not demonstrated
([Content-hashed assets](hldd.md#content-hashed-assets)).

*Verification (planned):* the browser lane
([§7.5](#75-browser-test-lane)) asserts that the rendered footer
and a download's provenance carry exactly the committed
`CITATION.cff` version and the pointer's `export_version`; it drives
the mismatch state by serving a mismatched manifest fixture, and a
re-entry whose `data-data-version` changed under the same bundle URL
shows the version-mismatch state naming both versions, never the
cached vintage's results; the staging drill of
[§6.1](#61-build-outputs-asset-paths-and-page-scaffold) re-stamps
`scenario-head.html` after a `CITATION.cff` change; cache and header
behavior is measured per
[§7.6](#76-performance-and-compatibility-measurements).

References:

- [HLDD §8 — Site integration](hldd.md#8-site-integration)
  ([Software and data versions](hldd.md#software-and-data-versions)).
- [PDD §9.4 — Releases](pdd.md#94-releases);
  [PDD §7.2 — Version display and notice (D-15,
  Proposed)](pdd.md#72-version-display-and-notice-d-15-proposed);
  [PDD §6.1 — Download package (FR-D1)](pdd.md#61-download-package-fr-d1).
- [DR-2 — Versioned exports](prd.md#dr-2-versioned-exports);
  [FR-G4 — Citation, disclaimer, and version
  information](prd.md#fr-g4-citation-disclaimer-and-version-information).
- [ADR-0014](../adr/0014-committed-content-hashed-artifacts.md).
- `CITATION.cff`; `.zenodo.json`;
  `subprojects/mkdocs/mkdocs.yml` (the `?v=` precedent).

### 6.3 CI workflows

Three workflows exist today — Tests
(`.github/workflows/tests.yml`), Companion site
(`.github/workflows/mkdocs.yml`), and Doc links
(`.github/workflows/doc-links.yml`) — and this design extends all
three without replacing anything. Workflow names, job ids, and step
names below are the stable identifiers the
[§8](#8-traceability) matrix cites. No job id in any workflow is
exactly `webapp`: GitHub identifies a required status check by job
name, so a name two workflows share makes the check ambiguous
(GitHub documentation, troubleshooting required status checks).

**Tests workflow (`tests.yml`).** Today: triggers on push to `main`
and `dev-v.*` and on pull requests, both path-filtered to
`subprojects/python/**` and `.github/workflows/tests.yml`, plus
`workflow_dispatch`; permissions `contents: read`; one job,
`pytest`, running the Python suite then the two ruff checks (the
committed workflow file). The `push` filter becomes:

```yaml
paths:
  - 'subprojects/python/**'
  - 'subprojects/webapp/**'
  - '!subprojects/webapp/perf/**'
  - 'subprojects/webapp/data/pointer.json'
  - 'subprojects/mkdocs/build.gradle.kts'
  - 'CITATION.cff'
  - 'settings.gradle.kts'
  - 'build.gradle.kts'
  - 'deploy/terraform/build.gradle.kts'
  - 'gradlew'
  - 'gradle/wrapper/**'
  - '.github/workflows/tests.yml'
```

The pointer path is already inside `subprojects/webapp/**`; it is
listed on its own line so the data-refresh trigger of the matrix
below is named in the workflow text itself. The negation line is the
`perf/` exclusion of the filter rule below. The `pull_request`
trigger drops its `paths` list and runs on every pull request
(**Required checks**, below). The new job:

- `webapp-test` — `runs-on: ubuntu-latest`; steps:
  `actions/checkout@v7` (the workflow's existing pin), then a step
  named **Webapp checks** running
  `./gradlew :subprojects:webapp:check` (`npmCi`, `tscCheck`,
  `webappTest` — the checks that need no pinned data, per the
  [§2](#2-repository-structure-naming-and-toolchain) task wiring),
  then a step named **Parity** running
  `./gradlew :subprojects:webapp:webappParity`.
  The committed Gradle wrapper (`gradlew`) runs on the runner's
  preinstalled JDK, and the hermetic download of the §2-pinned Node
  runtime is the "Node setup" the
  [ADR-0011](../adr/0011-webapp-toolchain.md) consequences name — no
  `setup-node` step exists. `webappParity` downloads the files the
  committed pointer manifest identifies by plain HTTPS with no token
  — the repository is public — and verifies every checksum before
  replay ([§7.2](#72-calculation-parity-tests) step 1), so the step
  sets no `GH_TOKEN`: "the parity harness fetches the pinned vintage
  before running" ([ADR-0011](../adr/0011-webapp-toolchain.md),
  amendment 2026-10-28). The step order meets the HLDD's "verifies
  their checksums before any test runs"
  ([Webapp tests — Node on CI](hldd.md#webapp-tests--node-on-ci))
  as this design reads it: no test reads a pinned file before the
  harness verifies its checksum. **Webapp checks** goes first
  because its type check and unit tests never touch the network
  ([§7.4](#74-application-tests)), and no pinned file exists on a
  fresh runner until the parity harness downloads one; the harness
  compares nothing until its step 1 verifies every checksum.

Path filters select workflows, not jobs, so a push matching the
filter runs both jobs; on a webapp-only change the `pytest` job
re-runs with its data-dependent tests skipped, as on any fresh clone
(the workflow header's "34 skips on a fresh clone"). The `pytest`
job itself is unchanged.

**Companion site workflow (`mkdocs.yml`).** Today: triggers on push
to `main` only and on pull requests, both path-filtered to
`subprojects/mkdocs/**`, `subprojects/python/pyproject.toml`,
`subprojects/python/poetry.lock`, and
`.github/workflows/mkdocs.yml`, plus `workflow_dispatch`; top-level
permissions `contents: read`; `concurrency` group `pages` with
`cancel-in-progress: false`; jobs `build` (checkout, Python setup,
docs-group install, strict MkDocs build, `upload-pages-artifact`)
and `deploy` (the committed workflow file). The `push` filter, its
branches still `[main]`, becomes:

```yaml
paths:
  - 'subprojects/mkdocs/**'
  - 'subprojects/python/pyproject.toml'
  - 'subprojects/python/poetry.lock'
  - 'subprojects/python/poetry.toml'
  - 'subprojects/python/build.gradle.kts'
  - 'subprojects/webapp/**'
  - '!subprojects/webapp/perf/**'
  - 'subprojects/webapp/data/pointer.json'
  - 'CITATION.cff'
  - 'settings.gradle.kts'
  - 'build.gradle.kts'
  - 'deploy/terraform/build.gradle.kts'
  - 'gradlew'
  - 'gradle/wrapper/**'
  - '.github/workflows/mkdocs.yml'
```

The `pull_request` trigger drops its `paths` list, as in Tests. The
workflow-level `concurrency` is keyed so that pull-request runs
never share the deploy queue:

```yaml
concurrency:
  group: "${{ github.event_name == 'pull_request' && format('pages-pr-{0}', github.event.pull_request.number) || 'pages' }}"
  cancel-in-progress: false
```

GitHub cancels a pending run when a newer run joins its concurrency
group, and `cancel-in-progress: false` protects only a running one;
under the committed single `pages` group, a pull-request run queued
behind a running `main` run would cancel a pending `main` deploy.
The jobs:

- `webapp-bundle` — the webapp build job
  [ADR-0011](../adr/0011-webapp-toolchain.md) prescribes, "separate
  from the MkDocs job": `runs-on: ubuntu-latest`; steps
  `actions/checkout@v7`; **Webapp checks**:
  `./gradlew :subprojects:webapp:check`; **Parity**:
  `./gradlew :subprojects:webapp:webappParity` (the plain-HTTPS
  fetch above); **Build bundle**:
  `./gradlew :subprojects:webapp:webappBundle`; then
  `actions/upload-artifact@v7` with name `webapp-dist` and path
  `subprojects/webapp/build/dist/`. The checks and parity run here
  as well as in Tests because the two workflows run independently:
  only a job this workflow's `deploy` depends on can keep a commit
  that fails them off the site.
- `build` gains `needs: webapp-bundle` and, after its
  dependency-install step: **Download webapp bundle** —
  `actions/download-artifact@v8` with name `webapp-dist` into
  `subprojects/webapp/build/dist/` — and **Stage scenario assets**,
  running

  ```sh
  ./gradlew :subprojects:mkdocs:scenarioAssets \
            -x :subprojects:webapp:webappBundle
  ```

  with `env: GH_TOKEN: ${{ github.token }}` (the `gh` CLI needs a
  token inside Actions; read access is enough to download release
  assets) — the fetch-and-verify of
  [§6.1](#61-build-outputs-asset-paths-and-page-scaffold), with
  `fetchVintage` running as the dependency of `scenarioAssets`. From
  P2 the command also names `:subprojects:mkdocs:mediaIncludes`
  ([§6.4](#64-product-pages-beyond-the-scenario-page-p2p3)). The
  bundle task is excluded because the handed-over artifact already
  populates its output. The existing **Build site** step is
  unchanged — still `../python/.venv/bin/mkdocs build --strict` run
  from `subprojects/mkdocs`, because `pymdownx.snippets` resolves
  its base path from the working directory (the committed workflow's
  own comment) — and a new step **Build preview site** follows it in
  the same working directory, running
  `../python/.venv/bin/mkdocs build --strict -f mkdocs.preview.yml`.
  Both builds run the site checks hook of §6.1, which needs no step
  of its own; in **Build site** its arm (d) checks the publication
  state that `mkdocs.yml` declares for each page — for the unlisted
  scenario page, that `sitemap.xml`, from which the hook removes it,
  and the search index omit it and that no other page links to it.
  `upload-pages-artifact` remains the job's last step,
  with `path: subprojects/mkdocs/site` — the preview tree is never
  uploaded. In the draft state of §6.1 the uploaded tree carries no
  scenario page, bundle, or data file; from the prototype deployment
  on it carries the scenario page, unlisted until activation, the
  staged assets, and the checksum-verified data.
- `deploy` is unchanged, with its three-layer main-only gating as
  committed: the `push` trigger is restricted to `branches: [main]`;
  the job runs only `if: github.event_name != 'pull_request'`, so
  pull requests get the same strict builds as validation without
  deploying; and the `github-pages` environment itself only permits
  deploys from `main`. Only this job holds `pages: write` and
  `id-token: write`; every other job keeps `contents: read`.

Each artifact action is pinned at its latest major release on
2026-10-30, read with
`gh api repos/actions/<action>/releases/latest` (`v7.0.2` and
`v8.0.2`). Every pin the committed workflows already carry stays as
it is: raising one is a separate maintenance change, outside this
design.

A failed job fails the run before anything is published: a failed
**Webapp checks**, **Parity**, or **Build bundle** step fails
`webapp-bundle` and skips `build` (`needs`); a failed stage, fetch,
verification, hook, or strict-build step stops `build` before
`upload-pages-artifact`; either way `deploy` never runs and the
working published site is not replaced — "a failed application
build or a failed data retrieval fails the site build, and a failed
run must not replace the working published site"
([Build and deployment checks](hldd.md#build-and-deployment-checks)).
Every job of a run checks out the same commit, so a deploy — from a
push to `main` or from `workflow_dispatch` — publishes only a commit
whose type check, unit tests, and parity succeeded in that run. The
concurrency key above lets an in-flight deploy finish rather than be
replaced mid-publication, and keeps pull-request runs from
cancelling a pending deploy.

**Required checks.** Blocking a merge is a repository setting, not
workflow text. The owner's ruleset on `main` — owner action OA-10 of
the [implementation plan, §4](ip.md#4-owner-and-research-group-actions),
Proposed — requires the status checks `pytest` and `webapp-test`
(Tests), `webapp-bundle` and `build` (Companion site), and `links`
(Doc links). It is not strict — a branch need not be up to date with
`main`, because the push run on `main` re-validates the merged
commit before deploying — and repository admins may bypass it,
because the `webapp-bundle` coupling still keeps a failing commit
off the site.
The bypass mode is Always allow (`bypass_mode` `always`), which covers
an admin's direct push to `main` as well as a pull-request merge, not
For pull requests only (`pull_request`).
Two consequences shape the workflows above. A workflow
skipped by path filtering leaves its required checks Pending, which
blocks merging, so the `pull_request` triggers of Tests and
Companion site run unfiltered while the `push` filters stay. A job
skipped because a job it needs failed may not block merging, so
`webapp-bundle` is required in its own right, not only through
`build`. Under that ruleset "a parity failure blocks merge in
`tests.yml`" ([ADR-0015](../adr/0015-golden-scenario-parity.md),
Consequences) for everyone but a repository admin, whose deliberate
bypass is a reading of that consequence that the owner accepts with
OA-10 (Proposed); either way, a parity failure fails the Tests run
and blocks deployment through
Companion site / `webapp-bundle` / **Parity**.
Pull requests that change the pointer manifest — the pointer commit of
[§4.2](#42-publication-of-a-data-vintage) step 11, or a revert of
[§4.3](#43-retention-rollback-recovery-and-withdrawal) — and the release
branch's pull request of
[§7.7](#77-site-validation-and-release-checklist) merge into `main` by a
merge commit, never by a squash or a rebase, which would put new commits
in place of the pull request's own and so leave the pointer commit, the
child of `S`, or the release commit out of `main`'s history; the ruleset
therefore does not require linear history, which would forbid those
merge commits.

**Trigger matrix.** The rows are the trigger obligations of
[CI triggers and validation](hldd.md#ci-triggers-and-validation),
plus the version stamp and the documents the Doc links checks read.
Every pull request runs all three workflows in full, so each row's
validation runs before merge whatever files the pull request
touches; the push filters decide what re-runs on a pushed commit,
and `workflow_dispatch` on all three workflows is the manual
backstop.

| Trigger | Reaches CI as | Validation before merge | On push |
|---|---|---|---|
| Webapp-only change (HLDD §4.3) | `subprojects/webapp/**` except `subprojects/webapp/perf/**` (filter rule below) | Application tests: `webapp-test` and `webapp-bundle` (**Webapp checks**, **Parity**); site validation: `build` (**Build site**, **Build preview site**). | Tests re-runs; on `main`, Companion site re-runs and `deploy` publishes. |
| Data refresh (HLDD §4.3) | the pointer-manifest commit, `subprojects/webapp/data/pointer.json` | Data integrity: both **Parity** steps and **Stage scenario assets** fetch and checksum-verify the newly pinned vintage; pipeline comparison: both **Parity** steps; site validation: `build`. | Tests re-runs; on `main`, `deploy` publishes the site carrying the new vintage. |
| Pipeline source change (HLDD §4.3) | `subprojects/python/**` | Fixture contracts: `pytest`; `webapp-test` re-verifies the pinned vintage. | Tests re-runs; Companion site re-runs only for the four `subprojects/python` files its filter names — published results change only when a new vintage is pinned. |
| Site pages and configuration (HLDD §4.3) | `subprojects/mkdocs/**`; the docs-toolchain pins `subprojects/python/pyproject.toml` and `subprojects/python/poetry.lock` | Site validation: `build` (both strict builds, the site checks hook). | On `main`, Companion site re-runs and `deploy` publishes; a docs-pin change also re-runs Tests. |
| Shared build configuration (HLDD §4.3) | `settings.gradle.kts`, `build.gradle.kts`, `gradlew`, `gradle/wrapper/**`, and the four modules' `build.gradle.kts` | Every job. | Both workflows re-run; on `main`, `deploy` publishes. |
| Version stamp | `CITATION.cff` | Site validation: `build` builds both trees with the re-stamped `scenario-head.html` ([§6.2](#62-software-and-data-version-stamps)). | Both workflows re-run; on `main`, `deploy` publishes the new footer stamp. |
| PDD and DDD edits | `docs/app/pdd.md`, `docs/app/ddd.md` | Doc links: `links` (**Check PDD agreement**). | Doc links re-runs (it has no path filter); neither path-filtered workflow does, since none of their jobs reads these files. |

The push filters follow one rule: each names every committed file
its workflow's build and test steps read, every build script a
`./gradlew` run in it configures — `settings.gradle.kts` includes
all four modules, so every run configures the build scripts of
`subprojects/python`, `subprojects/mkdocs`, `subprojects/webapp`,
and `deploy/terraform` — and `CITATION.cff`, so a release commit
that changes only the version has the Tests and Companion site runs
the release record cites
([§7.7](#77-site-validation-and-release-checklist)); and each
excludes `subprojects/webapp/perf/` with the negation
`!subprojects/webapp/perf/**` directly after its
`subprojects/webapp/**` include (below). Tests use only
the files the committed pointer manifest identifies —
`webappParity` and `fetchVintage` read
`subprojects/webapp/data/pointer.json` at the checked-out revision
and nothing else selects data
([CI triggers and validation](hldd.md#ci-triggers-and-validation)).
No workflow runs the browser lane: `webappBrowserTest` stays a
locally invoked release check
([§7.5](#75-browser-test-lane); [DD-3](#1-ddd-decision-register)).
Nor does any workflow run the reference-environment measurement of
[§7.6](#76-performance-and-compatibility-measurements), which the
Proposed [ADR-0016](../adr/0016-performance-reference-environment.md)
keeps "Outside CI": `webappMeasureReference` and
`webappMeasureDestroy` are
owner-invoked and never part of `check`, and `perf/run.mjs`, which
both run, checks their preconditions — the `egr.perf.awsProfile`
property (received as `TF_VAR_aws_profile`) and `terraform` on
`PATH` — when it executes, never while the build script is
configured, because every CI `./gradlew` run configures
`subprojects/webapp/build.gradle.kts` without either. The
performance environment under `subprojects/webapp/perf/` serves
only that measurement: no step of Tests or Companion site builds,
checks, or reads it, so a change there alters neither the published
application, its calculated results, nor any check a workflow runs
([CI triggers and validation](hldd.md#ci-triggers-and-validation)).
GitHub applies a filter's patterns in order — a matching negation
excludes a path that an earlier pattern included, and a later
matching pattern includes it again (GitHub documentation, workflow
syntax for `on.push.paths`) — so the negation follows the include,
and no later pattern matches under `perf/`. A push touching only
that directory therefore runs neither workflow, while a pull request
still runs both in full, because the `pull_request` triggers stay
unfiltered (**Required checks**, above).

**Doc links workflow (`doc-links.yml`).** Today: job `links` runs
`python .github/scripts/check_doc_links.py` (step **Check links and
anchors**) on every push to `main` and `dev-v.*`, every pull
request, and dispatch, deliberately unfiltered, covering the
Markdown GitHub renders outside the site tree; the site's own pages
remain the strict builds' to validate (the committed workflow
file). Its triggers stay unfiltered and it still installs nothing;
job `links` gains three steps, which follow **Check links and
anchors** in exactly this order:

- **Check PDD agreement** —
  `python .github/scripts/check_pdd_agreement.py`, the stdlib-only
  check of [§5.13](#513-application-configuration) that the
  settings and copy registries, the copy-marked blocks of
  `scenario.md` — the fallback body and the disclaimer section of
  [§6.1](#61-build-outputs-asset-paths-and-page-scaffold) — and the
  copy-marked block of `glossary.md` — the glossary additions of
  [§6.4](#64-product-pages-beyond-the-scenario-page-p2p3) — agree
  with the sections of the committed PDD and DDD they cite, so a
  PDD-only or DDD-only edit re-runs it;
- **Check traceability** —
  `python .github/scripts/check_traceability.py`, the lint of the
  [§8](#8-traceability) matrix;
- **Self-test doc scripts** —
  `python -m unittest discover -s .github/scripts -p 'test_*.py'`,
  which runs `test_check_pdd_agreement.py` and every other script
  self-test in that directory.

**Gate identifiers** for the [§8](#8-traceability) matrix:

| Gate | Workflow / job / step |
|---|---|
| Type check, unit tests | Tests / `webapp-test` / **Webapp checks**; Companion site / `webapp-bundle` / **Webapp checks** |
| Parity harness | Tests / `webapp-test` / **Parity**; Companion site / `webapp-bundle` / **Parity** |
| Fixture pipeline tests | Tests / `pytest` / **Run pytest** |
| Bundle build | Companion site / `webapp-bundle` / **Build bundle** |
| Fetch-and-verify of the pinned vintage | Companion site / `build` / **Stage scenario assets** |
| Strict publication build | Companion site / `build` / **Build site** |
| Strict preview build | Companion site / `build` / **Build preview site** |
| Development-media exclusion and publication inventory (site checks hook arms (a), (b)) | Companion site / `build` / **Build site** and **Build preview site** |
| Application-subtree exactness (hook arm (c)) | Companion site / `build` / **Build preview site**; from the prototype deployment on, also **Build site** |
| Publication boundary (hook arm (d)) | Companion site / `build` / **Build site** and **Build preview site** |
| Tableau exclusion, static half (hook arm (e)) | Companion site / `build` / **Build site** and **Build preview site** |
| Links and anchors outside the site | Doc links / `links` / **Check links and anchors** |
| PDD agreement of settings, copy, and the copy-marked blocks of `scenario.md` and `glossary.md` | Doc links / `links` / **Check PDD agreement** |
| Traceability matrix lint | Doc links / `links` / **Check traceability** |
| Doc-script self-tests | Doc links / `links` / **Self-test doc scripts** |
| Publication | Companion site / `deploy` |

*Verification (planned):* the workflows are themselves the
enforcement, and the [§8](#8-traceability) matrix maps each gate to
the identifiers above. Planned drills on scratch pull requests
exercise the failure containment: a TypeScript error or a perturbed
statistic in `src/` must fail `webapp-bundle` at **Webapp checks**
or **Parity**, with `build` and `deploy` not run; a corrupted
SHA-256 digit in the pointer must fail both **Parity** steps (rule
`fetch`, [§7.2](#72-calculation-parity-tests) step 1), so `build`
and `deploy` do not run; in a run whose `webapp-bundle` job has no
**Parity** step, it fails **Stage scenario assets** before either
build; a link from a published page to the scenario page, drafted
or unlisted, or an image under `docs/images/` that the allowlist
does not list, must fail **Build site**; no failing run may upload
anything. Once OA-10 is in place, a pull request touching only
`docs/` must report all five required checks, none Pending. A push
to a `dev-v.*` branch that changes only a file under
`subprojects/webapp/perf/` must start no Tests run, and one that
changes a file under `subprojects/webapp/src/` must start one.

References:

- [CI triggers and validation](hldd.md#ci-triggers-and-validation).
- [HLDD §8 — Site integration](hldd.md#8-site-integration)
  ([Build and deployment checks](hldd.md#build-and-deployment-checks)).
- [HLDD §9 — Testing and release architecture](hldd.md#9-testing-and-release-architecture)
  ([Webapp tests — Node on CI](hldd.md#webapp-tests--node-on-ci);
  [Site validation](hldd.md#site-validation);
  [Data refresh and deployment](hldd.md#data-refresh-and-deployment)).
- [ADR-0011](../adr/0011-webapp-toolchain.md);
  [ADR-0014](../adr/0014-committed-content-hashed-artifacts.md);
  [ADR-0015](../adr/0015-golden-scenario-parity.md);
  [ADR-0016](../adr/0016-performance-reference-environment.md)
  (Proposed);
  [ADR-0009](../adr/0009-github-pages-hosting.md).
- [NFR-7 — Build and data-quality
  gates](prd.md#nfr-7-build-and-data-quality-gates).
- [Implementation plan, §4](ip.md#4-owner-and-research-group-actions)
  (OA-10).
- `.github/workflows/tests.yml`; `.github/workflows/mkdocs.yml`;
  `.github/workflows/doc-links.yml`;
  `.github/scripts/check_doc_links.py`;
  `.github/scripts/check_pdd_agreement.py`;
  `.github/scripts/check_traceability.py`.

### 6.4 Product pages beyond the scenario page (P2/P3)

The three later surfaces are static MkDocs pages
([HLDD §4.2 — Surface map (ADR-0010)](hldd.md#42-surface-map-adr-0010)):
`subprojects/mkdocs/docs/morphology.md` and
`subprojects/mkdocs/docs/measurements.md` in the second delivery
priority, `subprojects/mkdocs/docs/contact.md` in the third
([PDD §2.1 — Page inventory](pdd.md#21-page-inventory)). Each page
passes through the three publication states of
[§6.1](#61-build-outputs-asset-paths-and-page-scaffold): drafted
while it is built — listed under both `draft_docs` and `not_in_nav`,
absent from every deploy, yet built by the preview configuration and
served by `mkdocs serve`; unlisted for review once its `draft_docs`
line is removed, with the front matter `search: exclude: true`; and
activated by one commit that removes its `not_in_nav` line and its
front matter and adds its nav line: the morphology and
measurement pages "join under the existing explanatory section of
the navigation; Contact joins last"
([PDD §2.2 — Entry point (D-2, Decided 2026-10-28)](pdd.md#22-entry-point-d-2-decided-2026-10-28)),
their nav titles following the
[PDD §2.1 — Page inventory](pdd.md#21-page-inventory) surface
names. The current nav — Home, Glossary, Dashboards, Data, The
paper, Figures (`subprojects/mkdocs/mkdocs.yml`) — has no section
that phrase identifies unambiguously, so the exact nav lines of the
two P2 pages are the owner's decision under
[D-2](pdd.md#1-decision-register), taken when the P2 lane opens (a
P2 record, listed in [§9](#9-deferred-and-out-of-scope)). Each page
ends with the full-disclaimer link
`[Full disclaimer →](scenario.md#gre-disclaimer)` — the link label
of [PDD §5.2 — Short disclaimer](pdd.md#52-short-disclaimer), so no
new copy — because the full text is "reachable from every product
surface"
([PDD §5.1 — Standing disclaimer (CR-4; D-10 Open)](pdd.md#51-standing-disclaimer-cr-4-d-10-open));
MkDocs collects the ids of raw HTML elements, so the strict build's
anchor validation covers the link. Every animation and photograph
on these surfaces arrives through the media index of
[§3.7](#37-media-index-p2): availability, attribution, caption, and
permission are data conditions the build reads, never page branches
([HLDD §6.2 — Media architecture (ADR-0012)](hldd.md#62-media-architecture-adr-0012);
[ADR-0012](../adr/0012-product-data-exports.md)).

**Media mechanics.** Media binaries are tracked site files under
`subprojects/mkdocs/docs/media/`, at the site-relative locations
the index's `file` fields name; a file is committed only when its
index entry records `permission.status` `granted`, because the
repository is public and committing distributes. Development copies
live only in the gitignored `subprojects/mkdocs/docs/media/dev/`,
which `draft_docs` lists permanently
([§6.1](#61-build-outputs-asset-paths-and-page-scaffold)): no
`mkdocs build` copies it into any output — publication or preview,
in CI or locally, the `mkdocs gh-deploy` fallback included — and
site checks hook arm (a) fails any build whose output contains a
`media/dev/` path or reference. A development copy is reachable
only by its direct URL under `mkdocs serve`; no generated slot ever
renders one, which
[PDD §8.1 — Morphology page (FR-E1)](pdd.md#81-morphology-page-fr-e1)
permits, since slots only "may hold third-party photos" during
development. Hook arm (b) covers the
committed side: a committed media file that no `granted` index
entry names fails the build, referenced or not
([R-12](prd.md#93-content-and-media-dependencies); "Development
copies of third-party photographs may be used only where
permitted",
[HLDD §6.2 — Media architecture (ADR-0012)](hldd.md#62-media-architecture-adr-0012)).
`.gitattributes` gains `subprojects/mkdocs/docs/media/** export-ignore`,
extending the committed `fig-*` precedent, whose rule covers only
that one directory (`.gitattributes`), so media under third-party
terms never enter a source archive or the Zenodo software record.

A new Gradle task in the staging lane of
[§6.1](#61-build-outputs-asset-paths-and-page-scaffold),
`mediaIncludes` (P2, `dependsOn(fetchVintage)`), reads the media
index and the artifact manifest from the `fetchVintage` cache
(`build/vintage/<data_tag>/`) and replaces the contents of
`docs/includes/media/` (gitignored and deleted by `clean`, §6.1)
with one include per slot: `morphology-<class-slug>.html` per scarp
class and `measurements.html`, where `<class-slug>` is the class
name lowercased with spaces replaced by hyphens. It fails on any
index entry whose `file` starts with `media/dev/`. A slot include
renders only entries with `permission.status` `granted` and
`available` true; `pending` and `internal_only` entries never reach
the generated output, so permission is "enforced during the site
build, not merely when rendering a page"
([HLDD §6.2 — Media architecture (ADR-0012)](hldd.md#62-media-architecture-adr-0012)).
`mkdocsBuild`, `mkdocsServe`, and `mkdocsPreview` gain
`dependsOn(mediaIncludes)`, and CI's **Stage scenario assets**
command also names `:subprojects:mkdocs:mediaIncludes`
([§6.3](#63-ci-workflows)), so `check_paths` finds every include
the P2 pages pull in. Where a class has no granted animation, the
generated slot carries the fallback line "Animation not yet
available" — the page never implies complete coverage
([PDD §8.2 — Animation library (D-8, Open)](pdd.md#82-animation-library-d-8-open);
[R-13](prd.md#93-content-and-media-dependencies)). One library
serves every surface: the morphology slots and the scenario page's
animation offers read the same index entries, so the open
[D-8](pdd.md#1-decision-register) coverage decision changes data,
never this design.

**Morphology page.** `morphology.md` is authored as six `##`
sections, one per scarp type, in the canonical class order, each
section containing, in order
([PDD §8.1 — Morphology page (FR-E1)](pdd.md#81-morphology-page-fr-e1)):

1. the class swatch and heading — the swatch is part of the
   generated `morphology-<class-slug>.html` include, colored from
   the fetched artifact manifest's `scarp_class_palette`
   ([§3.2](#32-artifact-manifest)), so no research color or order
   is hardcoded in page source (the authority rule of the
   [Verification contract](#verification-contract)); the heading
   names the class, so color never carries meaning alone;
2. the verbatim [PDD §5.12 — Morphology descriptions (FR-E1;
   research-group review required)](pdd.md#512-morphology-descriptions-fr-e1-research-group-review-required)
   description for the class — reader-facing copy the PDD owns,
   shipped only after the research group's
   [SC-7](pdd.md#101-success-criteria) (scientific sign-off) review;
3. a representative model snapshot: a project-supplied render
   committed under `docs/images/`, the convention of the four
   committed `fig-*` figures (`subprojects/mkdocs/docs/images/`),
   entered in the publication allowlist of §6.1 by the same commit.
   Snapshots are project content, outside the
   index's permission machinery, which governs "Animations and
   photographs"
   ([HLDD §6.2 — Media architecture (ADR-0012)](hldd.md#62-media-architecture-adr-0012));
4. the glossary link for the class, targeting the class's existing
   entry in the site glossary
   (`subprojects/mkdocs/docs/glossary.md`, the site's established
   `{ #kebab-id }` anchors): `#monoclinal`, `#pressure-ridge`, or
   `#simple` for a base type and `#collapse` for a collapse
   variant; a broken anchor fails the strict build (`anchors: warn`
   promoted, `subprojects/mkdocs/mkdocs.yml`), so a glossary anchor
   change and the pages that link it land in one commit;
5. the animation slot and the permission-gated photograph slot:
   the generated include, pulled with the snippets pattern inside a
   `markdown="0"` wrapper exactly as in
   [§6.1](#61-build-outputs-asset-paths-and-page-scaffold).
   "Photograph slots render only when permission is documented"
   ([PDD §8.1 — Morphology page (FR-E1)](pdd.md#81-morphology-page-fr-e1)).

**Family toggle.** The grouping control is a page-local script per
[HLDD §4.2 — Surface map (ADR-0010)](hldd.md#42-surface-map-adr-0010):
`subprojects/mkdocs/docs/javascripts/morphology-family.js`,
committed, loaded only by `morphology.md` through a classic
`<script defer>` tag in its own body (inside a `markdown="0"`
wrapper), never through `extra_javascript` — no other page, the
scenario page included, loads it. The control is the
[D-13](pdd.md#1-decision-register) display toggle, labeled
**"Group collapse variants"**, default off
([PDD §3.7 — Population, scarp filter, family view, reset](pdd.md#37-population-scarp-filter-family-view-reset)).
The script injects the control itself, so a browser without
JavaScript shows exactly the authored page — six sections in
canonical order — with no dead control. Toggled on, it groups the
page into the three base types
([PDD §8.1 — Morphology page (FR-E1)](pdd.md#81-morphology-page-fr-e1))
by folding each collapse-variant section under the section
immediately before it, demoting its heading one visual level; the
pairing uses document order alone — in the canonical order every
collapse variant directly follows its base type
(`subprojects/python/src/eps_ground_rupture/config.py`,
`SCARP_CLASSES`) — so the script carries no class list and
hardcodes no research convention.

Material 9.7.7 (locked in `subprojects/python/poetry.lock`)
re-creates every `<script>` inside its content container after an
instant-navigation swap, and a re-created classic script executes
again; the in-body script therefore runs on direct and on instant
entry, and no `extra_javascript` fallback exists
([§5.11](#511-accessibility-supported-environments-and-navigation-lifecycle)
records the theme facts). Because it runs again on every instant
visit, the script registers nothing global: its whole body is one
immediately invoked function expression — a repeated top-level
`const` or `let` would throw on the second run — whose only work is
one call of its initializer. The initializer returns unless the
toggle mount `#gre-family-toggle`, authored near the top of
`morphology.md`, exists without the marker attribute
`data-gre-bound`; its first statements are:

```js
const m = document.getElementById('gre-family-toggle');
if (!m || m.hasAttribute('data-gre-bound')) return;
m.setAttribute('data-gre-bound', '');
```

It then attaches listeners only to elements inside the page
content, which the next swap discards; it subscribes to no
`document$` and adds no document- or window-level listener, since
one subscription per run would accumulate. So no fragment-link
`guard` like that of
[§5.11](#511-accessibility-supported-environments-and-navigation-lifecycle)
runs here, and by the theme facts recorded there, after a direct
load the first same-page fragment link a reader follows — a
table-of-contents link, a heading permalink, or Material's skip
link — makes Material re-fetch the page and replace its content;
the re-run script then binds a fresh, unchecked toggle. This P2
page accepts that reset, at most once per direct load (fixed
here).

**Measurements page.** `measurements.md` carries, in order: the
verbatim
[PDD §5.13 — Measurement explanation (FR-E2)](pdd.md#513-measurement-explanation-fr-e2)
text as its body copy ([SC-7](pdd.md#101-success-criteria)); the
paper's measurement-figure reference through the site's established
figure-link pattern — a `.figure-pop` link to `figures.md#fig-5`,
whose image the site already ships as
`docs/images/fig-05-ml-model-measurements.jpg`, with the
`data-img` path at this page's root-level depth (`../images/…`,
the `figure-modal.js` pattern); and the measurement animation slot,
pulled from the generated `includes/media/measurements.html`
(index entries with `purpose` `measurement`, which need not carry a
scarp type, [§3.7](#37-media-index-p2);
[R-14](prd.md#93-content-and-media-dependencies)). From the page's
activation on, every statistics table on the scenario page carries
the "How were these measured?" link
([PDD §8.3 — How the measurements are made (FR-E2)](pdd.md#83-how-the-measurements-are-made-fr-e2)),
rendered by the view layer ([§5.8](#58-view-layer)) as a relative
link one level up (`../measurements/`); the link ships in the same
release as the page, never before, so it can never target a missing
page. How the PDD-agreement check compares the verbatim PDD §5.12
and §5.13 texts of both P2 pages once they ship is the P2 record
after step 8 of [§5.13](#513-application-configuration).

**Contact page.** `contact.md` (P3) carries the research group's
preferred channel and links to the site's existing resources, as
reader-facing copy the PDD owns
([PDD §8.4 — Contact and requests (FR-E3, P3)](pdd.md#84-contact-and-requests-fr-e3-p3);
[SC-7](pdd.md#101-success-criteria)). The repository-links block is
absent until the group supplies approved URLs
([R-15](prd.md#93-content-and-media-dependencies)); adding it then
is an ordinary content commit. No placeholder stands in for the
missing links.

**Glossary additions (MVP).** Before launch, the site glossary
(`subprojects/mkdocs/docs/glossary.md`) gains the two entries that
[PDD §5.11 — Labels, units, and glossary links (FR-G3, CR-3, CR-7)](pdd.md#511-labels-units-and-glossary-links-fr-g3-cr-3-cr-7)
requires, and its FDHI entry takes the singular spelling "Fault
Displacement Hazard Initiative" that the same subsection asks for.
The PDD lets engineer of record be "an in-context gloss" instead of
an entry; this design closes that alternative as a glossary entry,
so every surface links one definition (Proposed: the choice closes
only with the owner's acceptance of this section). The two entries
are fixed-here copy, worded from
[PRD §1.6 — Product boundary](prd.md#16-product-boundary),
[PRD §2.5 — Out of scope](prd.md#25-out-of-scope),
[PDD §5.1 — Standing disclaimer (CR-4; D-10 Open)](pdd.md#51-standing-disclaimer-cr-4-d-10-open),
and [PDD §5.5 — Statistics framing (CR-5)](pdd.md#55-statistics-framing-cr-5).
`glossary.md` carries them in its definition-list form as one block
at the end of its section "The field counterparts", after that
section's last entry: between the lines
`<!-- copy:docs/app/ddd.md#64-product-pages-beyond-the-scenario-page-p2p3 -->`
and `<!-- /copy -->` stands exactly the content of the fenced block
below, which step 7 of the
[§5.13](#513-application-configuration) check compares with it and
step 8 lists for the SC-7 review:

```markdown
**Probabilistic fault-displacement hazard analysis (PFDHA)** { #pfdha }
: A method that estimates how often fault displacement at a site
  exceeds a given size, expressed as annual probabilities, return
  periods, or probabilities of exceedance. Ground Rupture Explorer
  does not perform one: it shows conditional results from a
  published computer-simulation ensemble.

**Engineer of record** { #engineer-of-record }
: The qualified professional responsible for an engineering
  evaluation and its design decisions. The final interpretation of
  Ground Rupture Explorer's results, including any design decision,
  remains that professional's responsibility; no statistic the
  product shows is a recommended design value.
```

Both are public reader-facing texts, so they ship only after their
[SC-7](pdd.md#101-success-criteria) approval
([CR-10 — Scientific-content approval](prd.md#cr-10-scientific-content-approval)),
the research group's record under owner action OA-4 of the
[implementation plan, §4](ip.md#4-owner-and-research-group-actions).
`glossary.md` is a published page that no `draft_docs` entry holds
back, so the two entries land in the release that activates the
scenario page
([§6.1](#61-build-outputs-asset-paths-and-page-scaffold)), after
that approval and never before it.

*Verification (planned):* the site checks hook of
[§6.1](#61-build-outputs-asset-paths-and-page-scaffold) — the
media-permission check of
[Site validation](hldd.md#site-validation) — fails any build whose
output contains a media file that is neither allowlisted nor the
`file` of a `granted` index entry, referenced or not, or any
`media/dev/` path or reference (arms (a) and (b)), and any build
that breaks the publication state its configuration declares for a
page (arm (d)); `mediaIncludes` fails on an
index entry under `media/dev/`; the strict build fails on a missing
generated include or a broken glossary or disclaimer anchor; the
browser lane ([§7.5](#75-browser-test-lane)) asserts, data-driven
from the same fetched vintage, in `render.spec.ts`: the morphology
sections appear in exactly the manifest's `scarp_classes` order with
swatch colors equal to `scarp_class_palette`; the served HTML's
`#gre-family-toggle` has no child, and once the script has run it
holds one unchecked "Group collapse variants" control, whose
checking folds each collapse-variant section under the section
before it and whose unchecking restores the six sections in
`scarp_classes` order; the measurement page's `.figure-pop` link
resolves to the `#fig-5` anchor of the served figures page and its
`data-img` image loads; from the measurement page's activation on,
each statistics table's "How were these measured?" link resolves to
the served measurement page; and each page's full-disclaimer link
resolves. In `navigation-lifecycle.spec.ts`, entering the
morphology page directly, then leaving and returning through
instant navigation three times, leaves exactly one
`#gre-family-toggle[data-gre-bound]` and no duplicate control — the
regression check for a Material upgrade. Step 7 of the
[§5.13](#513-application-configuration) check compares the
copy-marked glossary block with the fenced block of the Glossary
additions above, and item 8 of the release checklist of
[§7.7](#77-site-validation-and-release-checklist) checks that the
block is present.

References:

- [PDD §8.1 — Morphology page (FR-E1)](pdd.md#81-morphology-page-fr-e1);
  [PDD §8.2 — Animation library (D-8, Open)](pdd.md#82-animation-library-d-8-open);
  [PDD §8.3 — How the measurements are made (FR-E2)](pdd.md#83-how-the-measurements-are-made-fr-e2);
  [PDD §8.4 — Contact and requests (FR-E3, P3)](pdd.md#84-contact-and-requests-fr-e3-p3).
- [PDD §5.12 — Morphology descriptions (FR-E1; research-group review
  required)](pdd.md#512-morphology-descriptions-fr-e1-research-group-review-required);
  [PDD §5.13 — Measurement explanation (FR-E2)](pdd.md#513-measurement-explanation-fr-e2);
  [PDD §3.7 — Population, scarp filter, family view, reset](pdd.md#37-population-scarp-filter-family-view-reset).
- [PDD §5.1 — Standing disclaimer (CR-4; D-10
  Open)](pdd.md#51-standing-disclaimer-cr-4-d-10-open);
  [PDD §5.2 — Short disclaimer](pdd.md#52-short-disclaimer);
  [PDD §5.5 — Statistics framing (CR-5)](pdd.md#55-statistics-framing-cr-5);
  [PDD §5.11 — Labels, units, and glossary links (FR-G3, CR-3,
  CR-7)](pdd.md#511-labels-units-and-glossary-links-fr-g3-cr-3-cr-7).
- [PRD §1.6 — Product boundary](prd.md#16-product-boundary);
  [PRD §2.5 — Out of scope](prd.md#25-out-of-scope);
  [CR-10 — Scientific-content approval](prd.md#cr-10-scientific-content-approval).
- [HLDD §4.2 — Surface map (ADR-0010)](hldd.md#42-surface-map-adr-0010);
  [HLDD §6.2 — Media architecture (ADR-0012)](hldd.md#62-media-architecture-adr-0012)
  ([Education surfaces](hldd.md#education-surfaces));
  [HLDD §9 — Testing and release architecture](hldd.md#9-testing-and-release-architecture)
  ([Site validation](hldd.md#site-validation)).
- [ADR-0010](../adr/0010-native-client-side-scenario-app.md);
  [ADR-0012](../adr/0012-product-data-exports.md).
- `subprojects/mkdocs/docs/glossary.md`;
  `subprojects/mkdocs/docs/javascripts/figure-modal.js`;
  `subprojects/mkdocs/hooks/site_checks.py`;
  `subprojects/mkdocs/publication-allowlist.txt`;
  `subprojects/python/src/eps_ground_rupture/config.py`
  (`SCARP_CLASSES`, `SCARP_CLASS_PALETTE`); `.gitattributes`.

## 7. Testing specification

### 7.1 Numerical tolerances

One rule covers every full-precision comparison
([DD-2](#1-ddd-decision-register), Proposed): a computed value agrees
with its reference when

```
|app − reference| ≤ 1e-9 · max(|reference|, 1e-3)
```

Every other comparison is exact, with no per-case overrides anywhere
in the suite: null-ness, selections with their class codes, counts,
range flags, diagnosed conditions, histogram rules, edges and counts,
and every display string. Integers (counts, selections, flags, codes)
never take a tolerance, so the rule cannot conceal "a difference in
filtering, population selection, or missing-value treatment"
([HLDD §5.6 — Reference results and verification
(ADR-0015)](hldd.md#56-reference-results-and-verification-adr-0015)).
Widening the tolerance is a change to this section, with new grounds,
never a test-side fix.

**What the tolerance establishes.** The closing note of
[PDD §10.1 — Success criteria](pdd.md#101-success-criteria) asks for
full-precision agreement "within a defined numerical tolerance
appropriate to the calculation" and for displayed values that "match
the correspondingly rounded pipeline reference values". Exact display
agreement rests on construction, not on the tolerance: bit-identical
inputs (the restore rule of
[§3.1](#31-scenario-artifact-binary-layout)), operation-identical
algorithms ([§5.4](#54-statistics)), and one deterministic rounding
rule, `displayRound` ([§5.8](#58-view-layer)). On a rounding tie any
nonzero difference changes the displayed digit, and ties are common:
10.3 % of valid scarp-height values lie exactly on a 0.01 m tie
(drafting measurement on `data/processed/dem/data.parquet`, SHA-256
`6a6e9149066f503588e09ecb6772a8392685716672e298d75aa925e7826eb303`,
reproduced on every vintage by
`test_reference_results.py::test_full_display_tie_census`, T-14). The
tolerance is the PDD §10.1 full-precision criterion plus a margin for
changes in evaluation order: NumPy's pairwise reductions move means
and standard deviations by at most 2.6e-13 relative on the shipped
columns (drafting measurement on the same file, reproduced by
`test_reference_results.py::test_full_evaluation_order_effect`,
T-14, which asserts at most 1e-11 — fixed here, about 40 times the
drafting figure and a hundredth of the tolerance). A defect whose
effect on every compared value stays below the tolerance is not
detected by the full-precision comparison; selections, counts,
flags, and display strings compare exactly and do not rely on it.

**Per quantity.** At the largest magnitude each column records, the
tolerance is 5.0e-9 m for scarp height against its 0.01 m display
step, 4.6e-8 m for deformation-zone width against 0.1 m, and 9.0e-8°
for scarp dip against 1° ([D-23](pdd.md#1-decision-register),
Reader-facing display precision per quantity) — drafting
measurements on the same file, reproduced as
`max(|physical_min|, |physical_max|)` of each column's
`columns.<column>` entry, which the export task writes
([§3.2](#32-artifact-manifest); T-11). The `1e-3` absolute floor —
one recording step of the 0.001-grid columns (slip records at
1e-4) — keeps near-zero statistics, such as means that straddle zero,
from demanding impossible relative agreement.

*Closes:* DD-2. *Verification (planned):* the parity runs of
[§7.2](#72-calculation-parity-tests) check conformance at these fixed
values — conformance only: a run never justifies the tolerance, whose
grounds are this section's — and the two named full-data tests of
[§7.3](#73-pipeline-and-export-tests) re-measure the grounds on every
vintage.

References:

- [PDD §10.1 — Success criteria](pdd.md#101-success-criteria).
- [HLDD §5.6 — Reference results and verification
  (ADR-0015)](hldd.md#56-reference-results-and-verification-adr-0015).
- [ADR-0015](../adr/0015-golden-scenario-parity.md) (Alternatives
  considered: bit-exact equality rejected as the pass criterion).

### 7.2 Calculation-parity tests

The parity harness is `test/parity.ts`, run under Node by the Gradle
task `webappParity`
([§2](#2-repository-structure-naming-and-toolchain)). In CI it is the
**Parity** step of two jobs ([§6.3](#63-ci-workflows)): Tests /
`webapp-test` and Companion site / `webapp-bundle`. A parity failure
therefore fails the Tests run, blocks deployment — `webapp-bundle`
fails, so `build` and `deploy` never run for that commit — and blocks
merge under the owner's `main` ruleset
([OA-10](ip.md#4-owner-and-research-group-actions)), which requires
the `webapp-test` and `webapp-bundle` checks. The harness
implements [Calculation parity](hldd.md#calculation-parity): it
replays the pipeline's references and never computes an expected
value — every expected number, string, bound, and selection is read
from the reference-results file of [§3.6](#36-reference-results). Its
sequence:

1. **Fetch and verify.** Read the committed pointer manifest
   `subprojects/webapp/data/pointer.json`
   ([§3.3](#33-pointer-manifest)) and download every file it names
   with a plain HTTPS GET of
   `https://github.com/HarvardRC/eps-ground-rupture/releases/download/<data_tag>/<name>`,
   following redirects, with no token (the repository is public), into
   `subprojects/webapp/build/parity/<data_tag>/`; a file already there
   whose SHA-256 matches is reused. Verify every SHA-256 against the
   pointer. A missing file, a final status other than 200, a transport
   error, or a mismatch fails the run (rule `fetch`) before any
   comparison.
2. **Load and pair.** Decode the vintage with the real
   `decodeVintage(manifestBytes, readFile, expected)`
   ([§5.2](#52-artifact-loading-and-decoding)), its `readFile`
   returning the verified bytes of the named file and `expected` being
   `{ exportVersion: <the pointer's export_version>, schemaVersions: [1] }`,
   so decompression and structural validation run exactly as in the
   browser. Load the regression export with the real `loadRegression`
   through a `fetch` the harness installs for its own process, which
   answers `file:` URLs inside the verified directory with
   `new Response(<bytes>)` and rejects every other URL. Gunzip the
   reference-results file with `node:zlib` and parse it with
   `parseReferences` ([§5.1](#51-modules-and-interfaces)). Then
   require the pairing in both directions —
   `manifest.reference_results_version === references.reference_version`
   and `references.export_version === manifest.export_version` (rule
   `pairing`) — and require `displayDecimals(m)` of `src/config.ts`
   ([§5.13](#513-application-configuration)) to equal the envelope's
   `display_decimals[m]` for m = `slip`, `scarp_height`, `dzw`, and
   `scarp_dip` (rule `D-23 transcription`), and the `value` of the
   `logScaleMinDecades` entry of `src/config.json` (§5.13) to equal
   the envelope's `log_scale_min_decades` (rule
   `PDD §4.1 transcription`).
3. **Golden scenarios.** For each `scenarios` entry, in file order —
   GS-0 to GS-7 of
   [PDD §10.2 — Golden scenarios](pdd.md#102-golden-scenarios), GS-3
   joining when [D-6](pdd.md#1-decision-register) (Kern County
   field-data group and principal-width rule) is decided — build the
   `Scenario` with `parseScenario(inputs, manifest)`
   ([§5.6](#56-scenario-state-and-url-encoding)), `manifest` being the
   decoded artifact manifest, and require
   `JSON.parse(serializeScenario(parseScenario(inputs, manifest), manifest))`
   to deep-equal `inputs` (rule `inputs-roundtrip`). Run the
   production sequence the [§5.3](#53-query-engine) scheduler runs —
   `convertWindows` in offset mode, then `query`, then per
   measurement `validValues`, `summarize`, `quantileLinear` for
   q = 0 to 100, and `histogram`, for `dzw` also `histogramLog` with
   `logScaleOfferRatio()` of `src/config.ts` as its `offerRatio`
   ([§5.12](#512-charts)), then `displayRound` for every displayed
   value — and, in offset mode, `rangeFlag(window, bounds)`
   ([§5.5](#55-offset-to-slip-conversion-assist)) for each selected
   dip's window with the manifest's `slip_window_bounds`; then
   compare:
   - **presence first** (rule `presence`): a null on one side against
     a value on the other fails before any other rule applies;
   - **exactly** (rule `exact`): `counts` — `matching_records`,
     `unclassified`, and per measurement `valid` and `excluded_null`;
     the `selection` — the `[trial, stage_index, class_code]`
     identities in artifact order when `matching_records ≤ 10,000`,
     otherwise the SHA-256 `signature` and `count` (class code 0–5, or
     255 for an unclassified record); each converted window's
     `range_flag`; `diagnosed_conditions`; per measurement the
     `histogram` — `rule`, `width_units`, `first_edge`, `bins`, and
     the K × 6 `counts`; and `histogram_log.dzw` against the
     `histogramLog` result — `first_edge`, `bins`, the K × 6
     `counts`, and the six `below_counts`;
   - **within the [§7.1](#71-numerical-tolerances) tolerance** (rule
     `tolerance`): every `statistics` value, every `percentiles`
     entry, and each converted window's `window_lo` and `window_hi`;
   - **as strings** (rule `display`): every `display` entry and each
     converted window's `window_lo_display` and `window_hi_display`,
     against the string `displayRound` ([§5.8](#58-view-layer))
     produces from the application's own value at the envelope's
     `display_decimals`. The harness never rounds a reference value:
     display agreement is checked against strings the pipeline wrote.

   On the GS-0 entry the comparison runs twice: first against a
   perturbed copy — `counts.matching_records` plus 1,
   `statistics.scarp_height.median` multiplied by 1 + 1e-6 (a
   thousand times the tolerance), and the last digit of
   `display.scarp_height.median` incremented modulo 10 — which must
   report exactly those three differences (rule `self-check`, so a
   comparator blind to differences is caught on every run), then
   against the entry itself.
4. **Boundary cases.** For every `boundary_cases` entry
   ([§3.6](#36-reference-results)), build the case's `Scenario` with
   `parseScenario(inputs, manifest)` from its full
   [DD-11](#1-ddd-decision-register) `inputs`, population included;
   the case has no other scenario member. Its `windows` and
   `expected.stored_bounds` have one key per modeled dip — every
   value of the manifest's `trial_columns.fault_dip`. For an
   offset-path case (`windows` not null), turn `windows` — {`lo`,
   `hi`} per key — into `PerDipWindows` ([§5.3](#53-query-engine)),
   require `storedBounds(lo, hi, scale)` (§5.3) of each key's entry
   to equal that key's `expected.stored_bounds` exactly, then run
   `query(vintage, scenario, windows)` with those windows; for a
   slip-path case (`windows` null), require
   `storedBoundsFromDecimal(min, max)` of `src/state/parse.ts` on the
   strings of `inputs.slip_window` to equal every key's
   `expected.stored_bounds`, then run `query` on the slip-mode
   scenario. Compare `counts` and `selection` exactly. The cases sit
   on and around recorded slips — exact, ±1 ulp, ±1e-14 m (absorbed
   by the guard), ±1e-12 m (outside it), ±1e-4 m (one
   `slip_window_bounds.recording_step`), and a coefficient round
   trip — so both sides of the shared guard formula are exercised.
5. **Synthetic cases.** For each `synthetic.ensembles` entry, build
   its artifact and manifest through `test/fixtures.ts` from the
   entry's declarative spec, its `scarp_classes` becoming the
   manifest's ([§7.4](#74-application-tests)), decode them with
   `decodeVintage` reading the built bytes, and replay its `cases` —
   each `Scenario` from
   `parseScenario(inputs, manifest)` with the built manifest, its
   `windows` turned into `PerDipWindows` as in step 4 — through
   `query`, `validValues`, and `summarize`: counts, selection
   identities, and diagnosed conditions exactly, statistics within
   the tolerance. Run the `synthetic.statistics` and
   `synthetic.display_rounding` cases directly against `summarize`
   and `quantileLinear` and against `displayRound`; each
   `synthetic.histograms` case against `histogram`, and its
   `expected.histogram_log` against `histogramLog` with
   `logScaleOfferRatio()` when its `display_decimals` is 1, while
   any other case requires `expected.histogram_log` to be null; and
   the `synthetic.conversion` cases through `convertWindows` and
   `rangeFlag(window, bounds)` with the case's `slip_window_bounds`
   as `bounds` — windows within the tolerance, range flags exactly —
   the `out_of_range` row with intercept −6 m included.

**Report.** Agreement prints nothing; each difference prints one line
naming the case (`GS-<n>`, or the boundary or synthetic case `id`),
the quantity, both values, and the rule — one of `fetch`, `pairing`,
`D-23 transcription`, `PDD §4.1 transcription`, `inputs-roundtrip`,
`self-check`, `presence`, `exact`, `tolerance`, `display`. For the
tolerance comparisons the harness also prints the largest
|app − reference| per scenario as a diagnostic (0 expected under the
operation-identical algorithms of [§5.4](#54-statistics); only the
tolerance decides). After the full pass it prints one summary line
per scenario and case group and exits non-zero if any difference was
found.

*Verification (planned):* the two **Parity** steps of
[§6.3](#63-ci-workflows) run the harness on every matching trigger;
the step-3 self-check exercises its failure path on every run.

References:

- [HLDD §9 — Testing and release architecture](hldd.md#9-testing-and-release-architecture)
  (Calculation parity).
- [HLDD §5.6 — Reference results and verification
  (ADR-0015)](hldd.md#56-reference-results-and-verification-adr-0015).
- [ADR-0015](../adr/0015-golden-scenario-parity.md).
- [PDD §10.2 — Golden scenarios](pdd.md#102-golden-scenarios).

### 7.3 Pipeline and export tests

Pipeline tests live in `subprojects/python/tests` and run through
pytest under the module's committed configuration (`testpaths =
["tests"]`, `addopts = "-ra"`, so every skip is listed with its
reason). New tests extend the existing suite and keep its
conventions exactly as the suite demonstrates them: fixtures are
module-scoped and defined per test file; no custom marker is
registered (the only mark besides `parametrize` stays the
module-level `skipif` of `test_fdhi_flatfile.py`); a test that needs
a gitignored input skips on file existence with a reason naming the
remedy, in the established wording ("processed dem Parquet missing;
run egr-build"); and pinned values follow
`test_dem_slip_bin_stats.py`'s discipline — "re-pin deliberately,
don't loosen": a changed pin is a deliberate re-pin against
regenerated data, never a widened tolerance.

Three conventions join for the full-data tests of the four contract
files below. Such a test skips only through a module-scoped
fixture's `pytest.skip` — never at import time and never through a
mark — so it is always collected, and its name begins `test_full_`.
A test that reads the staged vintage finds it through the
working-tree pointer manifest `subprojects/webapp/data/pointer.json`,
whose `data_tag` names `dist/app/<data_tag>/`; a missing directory
skips with the reason "staged vintage missing; run exportApp", and a
missing processed table keeps the established "run egr-build" reason.

**Two input lanes.**
[HLDD §9 — Testing and release architecture](hldd.md#9-testing-and-release-architecture)
(Pipeline and export tests) fixes the division this section
implements. Small committed fixtures run in "Local development and
CI" to "Exercise calculation rules, export formats, and edge cases
without the raw research datasets"; the full research datasets are
read only in "The owner's local export process" to "Verify the
actual ensemble, exported values, and reference results before
publication". CI — the `pytest` job of
`.github/workflows/tests.yml` ([§6.3](#63-ci-workflows)) — therefore
runs the fixture lane only: the full-data tests skip there under the
file-existence convention, and the change that adds full-data tests
updates the workflow header's fresh-clone skip count ("34 skips on a
fresh clone" today).

**The flag that makes "a skipped check is not a pass" executable.**
[HLDD §9 — Testing and release architecture](hldd.md#9-testing-and-release-architecture)
requires: "Required full-data checks must fail the export task if
their inputs are missing or a check fails. The task must not treat
a skipped check as successful verification." The executable form is
one environment variable:

- `EGR_REQUIRE_FULL_DATA=1` turns every skip, every xfail, and every
  required full-data test that did not run into a failure. The suite
  gains exactly one `conftest.py`
  (`subprojects/python/tests/conftest.py`), introduced for this rule
  alone; it defines no fixtures, so the per-file fixture convention
  stands. Its three hook groups are inert unless
  `os.environ.get('EGR_REQUIRE_FULL_DATA') == '1'`; PREFIX below is
  `skipped under EGR_REQUIRE_FULL_DATA=1: `.
  1. **Collection skips.**
     `@pytest.hookimpl(wrapper=True, tryfirst=True) def pytest_make_collect_report(collector)`
     takes `rep = yield`; if `rep.skipped`, it sets
     `rep.outcome = 'failed'` and
     `rep.longrepr = PREFIX + rep.longrepr[2].removeprefix('Skipped: ')`
     (a skip's `longrepr` is a `(path, lineno, message)` tuple whose
     message pytest prefixes with `Skipped: `; dropping that prefix is
     pytest's own rule for a skip reason) and returns `rep`. The session
     counts it as a collection error and the run exits with status 2.
     A module-level `pytest.skip(..., allow_module_level=True)` and a
     module-level `pytest.importorskip` take this path. The rewrite
     cannot move to `pytest_collectreport`: the session's own
     `tryfirst` implementation counts the report before it.
  2. **Test skips and xfails.**
     `@pytest.hookimpl(wrapper=True, tryfirst=True) def pytest_runtest_makereport(item, call)`
     — `tryfirst` makes it the outermost wrapper, so it sees the xfail
     mapping. If `rep.skipped`, the reason is
     `'xfail: ' + rep.wasxfail` when that attribute exists, else
     `rep.longrepr[2].removeprefix('Skipped: ')`; the hook deletes
     `rep.wasxfail` when present (a failed report that keeps it is
     not counted as failed, and the run would exit 0), then sets
     `rep.outcome = 'failed'` and `rep.longrepr = PREFIX + reason`.
     This covers fixture skips, `pytest.skip` calls, `skipif` marks,
     and xfail, in every test phase.
  3. **Required-test manifest.**
     `subprojects/python/tests/full_data_required.txt` lists one
     pytest node id per line (`#` comments allowed): every full-data
     test of the four contract files below.
     `pytest_collection_finish(session)` stores the required ids
     absent from `session.items`; `pytest_runtest_logreport(report)`
     records each node id whose call-phase report (`when == 'call'`)
     succeeded; and
     `@pytest.hookimpl(trylast=True) def pytest_sessionfinish(session, exitstatus)`
     writes `required full-data test not run: <nodeid>` through the
     terminal reporter for every required id without such a report —
     a missing file, a rename, `-k`, `-m`, `--deselect`, `--lf` — and,
     if `session.exitstatus == 0`, sets it to
     `pytest.ExitCode.TESTS_FAILED`. A missing or empty manifest fails
     the run the same way.
- Under the flag there is no legitimate skip. The release
  environment must supply every input, so a skip of any kind is
  missing evidence and fails the run — the HLDD rule above applied
  suite-wide rather than check by check. Besides the export inputs
  of [§4.1](#41-export-task-and-validation) step 1, the full-data run
  therefore also requires `data/raw/FDHI_Cleaned_Measurements.csv`,
  the pre-cleaned extract against which `test_fdhi_flatfile.py` and
  `test_prep.py` check the cleaning chain; it is not an export input
  and is not in `provenance.inputs`.
- The Gradle task `pytestFullData` (`subprojects/python`, an `Exec`
  task mirroring `pytest`) runs `poetry run pytest` with
  `EGR_REQUIRE_FULL_DATA=1` set in its environment. Like
  `webappBrowserTest` in the
  [§2](#2-repository-structure-naming-and-toolchain) task table, it is
  wired into no lifecycle task. `publishVintage`
  ([§4.2](#42-publication-of-a-data-vintage) step 4) runs its command
  in the same run as those of `egrBuild` and `exportApp`, against the
  vintage that run staged, and stores its pytest summary line in the
  publication record; a run outside `publishVintage` is a precheck,
  never publication evidence.
  CI never sets the variable.

**New contracts.** Four test files join the suite. Each carries a
fixture lane that runs everywhere and a full-data lane that skips
without the staged vintage or the processed data and may not skip
under the flag.

| File | Fixture lane (CI and local) | Full-data lane (local; gates publication) |
|---|---|---|
| `test_scenario_export.py` | Drives the [§4.1](#41-export-task-and-validation) export and validation code on synthetic frames shaped like the `dem` view (the suite's established synthetic-frame style): lossless round trip of every [§3.1](#31-scenario-artifact-binary-layout) encoding, the [DD-1](#1-ddd-decision-register) dictionary included, with every restored value equal to its source double bit for bit (`float.hex`, rule `bitwise-restore`). One single-property corruption per rule of §4.1 steps 3 and 5, each failing at that rule's `<rule>: FAILED` line — among them a stored value equal to its column's null sentinel (`sentinel-collision`); a within-trial slip tie or inversion (`slip-order`); a source value off its recording grid (`bitwise-restore`); an unclassified record carrying a valid measurement (`unclassified-has-no-valid-measurement`); a regression row with `slope` 0, a positive intercept, or `−intercept/slope` above `slip_window_bounds.max` (`coefficient-reach`); block offsets that break the §3.1 alignment rule (`block-tiling`); a field name outside the closed [§3.2](#32-artifact-manifest)–[§3.6](#36-reference-results) field lists, or an unknown manifest field (`format-spec`); and a pipeline-column name outside the [DD-10](#1-ddd-decision-register) table (`dd10-names`). A NaN or an infinity fails `finite-reference-values` in the reference file and the canonical serializer's `allow_nan=False` in any other JSON payload. | Re-verifies the shipped ensemble: the [§3.2](#32-artifact-manifest) `counts` (records 346,834, trials 3,434, stages_per_trial 101); the bitwise restore of every stored value; zero within-trial slip ties or inversions and zero ties at any trial's maximum slip (zero in the drafting measurement on `data/processed/dem/data.parquet`, SHA-256 `6a6e9149066f503588e09ecb6772a8392685716672e298d75aa925e7826eb303`, reproduced by this lane, T-14; the [DR-3 — One-state-per-trial population](prd.md#dr-3-one-state-per-trial-population) invariant [ADR-0015](../adr/0015-golden-scenario-parity.md) pins pipeline-first); no unclassified record with a valid measurement; the final-stage slip envelope, pinned at 5.0128–5.0135 m (the "slip ≈ 5.013 m" of [PDD §10.2 — Golden scenarios](pdd.md#102-golden-scenarios), GS-7). |
| `test_field_export.py` | The [§3.4](#34-field-data-export) rules on synthetic source frames: each (source, analogue) arm admits only rows whose source quantity is positive; `criterion_sub50` is `met` exactly for `dzw` rows with value below 50.0, `not_met` for `dzw` rows at 50.0 or above (50.0 itself included), and `not_applicable` for `scarp_height` rows, never conflating not-applicable with failed; `limited_comparison` is true exactly on SURE `FNC` width rows; `labeled_set` follows `config.LABELED_FIELD_EVENTS` ([§3.4](#34-field-data-export)) — true exactly on the rows of a source it maps to `None` and on the rows whose `eq_name` its source's tuple names; Kern rows carry the fixed event identity; names arrive normalized; rows sort ascending by (`source`, `analogue`, `eq_name`, `source_quantity`, `value`); the envelope carries `pipeline_version`. | Pins the per-(source, analogue) row counts on the shipped sources and checks labeled-set membership against `config.LABELED_FIELD_EVENTS`, which it imports instead of re-pinning ([§3.4](#34-field-data-export)), extending the populations `test_historic_events.py` (per-source measurement rows FDHI 2,392 / SURE 203 / Kern 21) and `test_fdhi_flatfile.py` (the fzw and vs populations; Bohol's 121 sh-only rows stay outside the [§3.4](#34-field-data-export) map) already pin; the first full-data run records the new pins, which thereafter change only by deliberate re-pin. |
| `test_reference_results.py` | The [§3.6](#36-reference-results) generator definitions on inputs from `eps_ground_rupture/reference_cases.py`, each against an independent recomputation: `quantile_linear(v, q/100).hex() == float(np.percentile(v, q, method='linear')).hex()` for q = 0 to 100 on n ∈ {1, 2, 3, 10, 1000}, duplicates and negatives on a 0.001 grid included; the null rules — valid 0 gives `statistics` null, valid 1 gives `sd` null with median, `p16`, and `p84` equal to `min` and `max` — on a GS-6-shaped and a single-valid fixture; the integer-sum mean equal to `float(Fraction(sum(s), n * 10**d))` over the integer steps `s`; per class, `histogram()` counts equal to `numpy.histogram(s, bins=edges)` over the `synthetic.histograms` cases, and for their log cases `histogram_log()` counts equal to `numpy.histogram` over the steps of at least 100 with the octave edges `first_edge · 2^j` for j = 0 to `bins`, and `below_counts` equal to the count of steps below 100, with `histogram_log()` returning None on the threshold case `maxpos_s = 100 · minpos_s` and a record on `maxpos_s = 100 · minpos_s + 1` ([PDD §4.1 — Measurement views (FR-O1)](pdd.md#41-measurement-views-fr-o1): "more than two decades"); `display_round` on the vectors below; `_stored_bounds` at 0.3, 1.0049, 4.6633, and 5.0135, each exact, ±1e-14 (bound unchanged), and ±1e-12, where only the inward shift — +1e-12 on a lower bound, −1e-12 on an upper bound — moves the bound, by one stored unit, and the outward shift leaves it; `stored_bounds_from_decimal` with lower `"0.00005"` → 1 and upper `"5.01349"` → 50134 and `"5.0135"` → 50135; the `synthetic.ensembles` cases against independent pandas recomputation; the range flags of the `synthetic.conversion` rows; the identities-versus-signature rule at the 10,000-record threshold, with class code 255 for unclassified records; a GS-4-style diagnosed-condition set; the generator's GS-1 `inputs` serializing to the [§5.6](#56-scenario-state-and-url-encoding) golden bytes; a non-finite value failing `finite-reference-values`. | Regenerates the references for GS-0–GS-7 (GS-3 once [D-6](pdd.md#1-decision-register) (Kern County field-data group and principal-width rule) is decided) and asserts what [PDD §10.2 — Golden scenarios](pdd.md#102-golden-scenarios) states: GS-0's 346,834 matching records with 3,434 `unclassified`; GS-1's `range_flag` `partly_out` at 30° — the "flagged beyond the modeled range" of PDD §10.2 read as `partly_out` ([§5.5](#55-offset-to-slip-conversion-assist)) — and `in_range` at 40°; GS-2's 18 and GS-5's 9 scarp-height `valid` — this document reads the PDD's "valid measurements" of GS-2 and GS-5 as the scarp-height panel, the one shown on load, a reading that changes no pin: a drafting measurement on `data/processed/dem/data.parquet` (SHA-256 `6a6e9149066f503588e09ecb6772a8392685716672e298d75aa925e7826eb303`) gives 18 and 9 valid in all three panels, reproduced in the regenerated `counts.per_measurement` (T-14); GS-4's `diagnosed_conditions` `["sediment", "depth"]`; GS-6's 3,434 matching records with `valid` 0 and `excluded_null` 3,434 in every panel; and GS-7's 3,434 matching records. It regenerates `boundary_cases` and asserts that for each dip at least one `out±` or `step±` case changes the selection relative to its `exact` case, so the battery stays discriminating; asserts that DuckDB `quantile_cont` and `quantile_linear` agree within one ulp at p16, p50, and p84 on every shipped column (the [§3.6](#36-reference-results) claim); and runs the two evidence tests below. |
| `test_manifests.py` | The [§3.2](#32-artifact-manifest)/[§3.3](#33-pointer-manifest) consistency rules on synthetic vintages: required fields present; the two manifests' checksum sets cross-checkable; the checksum graph acyclic; `reference_results_version` equal to the references' `reference_version`; the `provenance` object complete, `source_commit` matching `^[0-9a-f]{40}$`, `inputs` sorted and unique, and the pointer's `provenance` deep-equal to the manifest's; every vintage file name matching its role's single pattern ([§4.1](#41-export-task-and-validation)) and none ending in `.md`. One fixture per rule — a missing `provenance` key, a manifest/pointer `provenance` mismatch, unsorted or duplicate `inputs`, and so on — each rejected. | Cross-checks the staged vintage's artifact manifest and pointer manifest inside `publishVintage`, before tagging — the same rules the [§4.1](#41-export-task-and-validation) run enforces, exercised independently as a test. |

**The two evidence tests** (full-data lane of
`test_reference_results.py`):

- `test_full_display_tie_census` — for each of `slip`, `scarp_height`,
  `dzw`, and `scarp_dip`, counts the processed `dem` view's valid
  values whose shortest round-trip decimal (`repr`) has exactly one
  fraction digit more than the column's `display_decimals` and ends
  in `5` — an exact tie at the display step — prints one line
  `tie_share <column> <share>` per column (shown by `pytest -rP`),
  and asserts that `display_round` rounds every such value away from
  zero.
- `test_full_evaluation_order_effect` — for every golden scenario and
  measurement with valid ≥ 2, computes the mean and the sample
  standard deviation by the generator's operation-identical
  algorithms and by NumPy's `np.mean` and `np.std(ddof=1)`, prints the
  largest relative difference, and asserts it is at most 1e-11.

**Display-rounding vectors.** The fixture lane of
`test_reference_results.py` and `test/views-text.test.ts`
([§7.4](#74-application-tests)) hold this list identically, and the
generator publishes it as `synthetic.display_rounding`:

- decimals 2: `3.635` → `"3.64"`; `1.005` → `"1.01"`; `2.675` →
  `"2.68"`; `2.175` → `"2.18"`; `4.315` → `"4.32"`;
  `3.6350000000000002` → `"3.64"`; `3.6349999999999993` → `"3.63"`;
  `-0.055` → `"-0.06"`; `-0.004` → `"0.00"`; `-0.0` → `"0.00"`;
  `0.005` → `"0.01"`; `-0.005` → `"-0.01"`; `1e-7` → `"0.00"`;
  `0.30000000000000004` → `"0.30"`;
- decimals 1: `45.85` → `"45.9"`;
- decimals 0: `89.5` → `"90"`; `-12.5` → `"-13"`; `2.5` → `"3"`;
- decimals 3: `5.0135` → `"5.014"`.

**Gate self-tests.** `subprojects/python/tests/test_full_data_gate.py`
runs in the fixture lane, CI included. It declares
`pytest_plugins = ['pytester']` at module level, which needs no
pytest-configuration change. Each case writes the real conftest with
`pytester.makeconftest(Path(__file__).with_name('conftest.py').read_text())`
and a manifest with `pytester.makefile('.txt', full_data_required=...)`,
sets the flag with `monkeypatch.setenv` (or removes it with
`monkeypatch.delenv`), and runs `pytester.runpytest_subprocess()`:

| Case | Expected |
|---|---|
| `pytest.skip('x')` inside a test | `ret == 1`; `assert_outcomes(failed=1)`; output matches `*skipped under EGR_REQUIRE_FULL_DATA=1: x*` |
| a fixture calling `pytest.skip` | `assert_outcomes(errors=1)` |
| `pytestmark = pytest.mark.skipif(True, reason='r')` | `assert_outcomes(errors=1)` |
| module-level `pytest.skip('m', allow_module_level=True)` | `ret == 2`; the PREFIX line present |
| module-level `pytest.importorskip('egr_no_such_module')` | `ret == 2` |
| a failing `@pytest.mark.xfail` test | `ret == 1` (guards the `wasxfail` deletion) |
| a manifest naming an absent `test_a.py::test_full_gone`, beside a case file holding only a passing `test_other` | `ret == 1`; the not-run line present |
| a required test deselected with `-k 'not test_full_req'`, its case file also holding a passing `test_other`, which stays selected | `ret == 1` |
| no manifest file | `ret != 0` |
| flag unset, `'0'`, or `'true'` | `assert_outcomes(skipped=1)`; `ret == 0` |

The passing `test_other` of rows 7 and 8 keeps one test selected:
with none, pytest exits 5 (`pytest.ExitCode.NO_TESTS_COLLECTED`),
which hook group 3 leaves unchanged. A further case,
`test_manifest_matches_suite`, runs without a subprocess: it parses
the four contract files and asserts that their full-data test
functions — exactly those named `test_full_*` — equal the manifest's
node-id base names (parameter suffixes stripped), in both directions.

**Inventory.** The files of this section, which the
[§8](#8-traceability) lint accepts as `test` Check paths, are the
four contract files of the **New contracts** table —
`test_scenario_export.py`, `test_field_export.py`,
`test_reference_results.py`, and `test_manifests.py` — `conftest.py`,
and `test_full_data_gate.py`, all in `subprojects/python/tests/`;
`full_data_required.txt` is the gate's data file, not a test.

**What CI repeats.** CI independently fetches the files the
committed pointer manifest pins and verifies their checksums
([§6.3](#63-ci-workflows)), and the decoder tests of
[§7.4](#74-application-tests) re-validate structure against the
artifact manifest — the checks the published artifact alone
supports. Per the same HLDD subsection, "CI cannot independently
repeat comparisons that require the local source views": the
re-read comparison against the supplying views, the population
pins, and reference regeneration stay in the full-data lane.

*Verification (planned):* CI's `pytest` job runs every fixture lane
and the gate self-tests on every matching trigger
([§6.3](#63-ci-workflows)); `publishVintage` runs `pytestFullData`
against the staged vintage, where any skip, xfail, or required test
not run fails the publication, and the release checklist of
[§7.7](#77-site-validation-and-release-checklist) records the run as
item 2.

References:

- [HLDD §9 — Testing and release architecture](hldd.md#9-testing-and-release-architecture) (Pipeline and export tests).
- [HLDD §5.6 — Reference results and verification (ADR-0015)](hldd.md#56-reference-results-and-verification-adr-0015).
- [ADR-0015](../adr/0015-golden-scenario-parity.md).
- [DR-3 — One-state-per-trial population](prd.md#dr-3-one-state-per-trial-population).
- [PDD §10.2 — Golden scenarios](pdd.md#102-golden-scenarios).
- `subprojects/python/tests/` (the conventions cited above).
- `subprojects/python/pyproject.toml` (`[tool.pytest.ini_options]`).
- `.github/workflows/tests.yml` (the CI lane and its skip record).

### 7.4 Application tests

The unit suite is the `webappTest` task of
[§2](#2-repository-structure-naming-and-toolchain), whose npm script
`test` compiles every `test/**/*.test.ts` with its imports into
`build/test/` and runs exactly the compiled test files with
`node --test` (the build options and the file pattern are §2's).
Assertions use `node:assert/strict`; the runner is Node's own, so no
test framework joins the §2 dependency pins. Unit tests never touch
the network: the only fetching test code is the
[§7.2](#72-calculation-parity-tests) parity harness (`zip.test.ts`
starts a local `python3` process and reads only local files).

**Pure files only.** Node tests import only the pure files of
[§5.1](#51-modules-and-interfaces). No DOM global is provided or
emulated, no DOM implementation (jsdom, happy-dom, linkedom) is ever
added, and `tscCheck` rejects a DOM identifier in a pure file or in
`test/` ([§2](#2-repository-structure-naming-and-toolchain)). A
check that needs a DOM belongs to [§7.5](#75-browser-test-lane): the
DOM appliers under `src/views/dom/`, `src/overlay/field-overlay.ts`,
`src/download/deliver.ts`, `src/a11y/`, and `src/main.ts` are covered
there only.

**Pipeline-first rule.** Calculation semantics are covered the way
[HLDD §9 — Testing and release architecture](hldd.md#9-testing-and-release-architecture)
(Calculation parity) requires: application tests "do not define a
separate set of expected scientific or statistical answers", and
"When a calculation edge case needs additional coverage, its
expected behavior is established and tested in Python, then included
in the reference cases exercised by the webapp." No calculation
expectation is hand-maintained anywhere in `test/`: selection
semantics (windows, populations, sediment pairs, filters, empty
groups, the diagnostic), statistics, percentiles, histogram bins
(linear and logarithmic), and converted windows are checked only by
the [§7.2](#72-calculation-parity-tests) replays of generated
references — the golden scenarios, `boundary_cases`, and `synthetic`
cases — and a unit test that needs statistics or counts as inputs
injects them. The display-rounding vectors of
[§7.3](#73-pipeline-and-export-tests), the token and slug strings
below, and the cumulative curve's step and decimation construction of
[§5.12](#512-charts) are formatting and drawing conventions this
document fixes, not calculation answers, and are asserted directly.

**Fixtures are built in code.** `test/fixtures.ts` assembles a tiny
[§3.1](#31-scenario-artifact-binary-layout)-conformant artifact — a
16-byte header, aligned blocks, dictionaries — together with its
matching [§3.2](#32-artifact-manifest) manifest from a declarative
spec; each negative case corrupts exactly one declared property. The
same function builds the `synthetic.ensembles` the parity harness
replays ([§7.2](#72-calculation-parity-tests) step 5), whose entries
use exactly this spec; for those, the manifest's `scarp_classes` is
the entry's `scarp_classes` field ([§3.6](#36-reference-results)),
and its `scarp_class_palette` one of the function's choosing. This
mirrors the pipeline suite's synthetic-frame convention and keeps
every fixture self-documenting; no opaque binary fixture is
committed.

**Inventory.** One file per contract, each in
`subprojects/webapp/test/`; the second column names the module or
rule each exercises. Two scenario pair sets recur below:
A = {(Homogeneous, Strong), (Heterogeneous, Weak)} and
B = {(Homogeneous, Weak), (Heterogeneous, Strong)} — disjoint trial
sets with equal trial counts, which a label-only encoding would
confuse.

| File | Contract under test |
|---|---|
| `decode.test.ts` | `decodeVintage` ([§5.2](#52-artifact-loading-and-decoding)) on in-memory fixture files; structural validation precedes every read: header–manifest agreement (magic, `schema_version`, counts), exact block tiling after the header, dtype and dictionary extents, and each column's `null_sentinel` equal to its dtype's maximum. Restored values equal `(stored + offset_steps) / 1000` (`/ 10000` for slip) and dip `dictionary[i] / 1000` bit for bit ([§3.1](#31-scenario-artifact-binary-layout)). Both branches of the gzip guard of [§5.2](#52-artifact-loading-and-decoding) step 2: bytes that open with the gzip magic (`1f 8b`) inflate, and bytes without it are used as-is. A truncated buffer and a count mismatch (`kind` `'read'`), a missing required key or a wrong JSON type in any format (a `SchemaError` from `mapRecord`, which counts as `'read'`), an unsupported `schema_version` (`'schema-version'`), and a data-version mismatch against the page's pinned version (`'data-version'`, carrying `expected` and `loaded`) each make `decodeVintage` reject with the [§5.10](#510-failure-states) `LoadError` of the kind shown — never a partial decode. Unknown additional manifest fields are ignored (the unlisted-members rule of [§3](#3-data-formats)). `loadFieldExport` and `loadRegression`, through a `fetch` stub that answers the fixture's URL, and `parseReferences` are covered the same way; a stub answering a non-2xx status makes the loaders reject with `kind` `'retrieval'`. |
| `fields.test.ts` | The [DD-10](#1-ddd-decision-register) tables of `src/decode/fields.ts` — `MANIFEST_FIELDS`, `POINTER_FIELDS`, `FIELD_EXPORT_FIELDS`, `REGRESSION_FIELDS`, `REFERENCE_FIELDS`, `SCENARIO_INPUT_FIELDS` — are total and injective over the closed field lists of [§3.2](#32-artifact-manifest)–[§3.6](#36-reference-results); every camelCase name equals `snakeToCamel` of its snake_case name; decoding each format's fixture leaves no snake_case key at any depth outside the data-keyed maps of the [§3](#3-data-formats) records-and-maps rule and the verbatim `provenance` and `inputs` objects ([§5.2](#52-artifact-loading-and-decoding)); `TRIAL_TABLE_COLUMNS`, `RECORDS_CSV_COLUMNS`, and `STATISTICS_CSV_COLUMNS` equal the orders [§3.1](#31-scenario-artifact-binary-layout) and [§5.9](#59-downloads) fix. The cross-language check is the [§7.2](#72-calculation-parity-tests) run: real pipeline files pass through `mapRecord` there, so a required key the pipeline does not write fails parity with `SchemaError`. |
| `engine.test.ts` | [§5.3](#53-query-engine) implementation properties only: purity — identical output for identical input, the vintage's buffers unmodified — and binary-searched window segments equal to a linear scan for every window whose endpoints are fixture slip values or midpoints between them. Selection semantics — inclusive endpoints, the one-state rule, the no-window final state, the two-count model, the scarp-type filter, `(set, sediment_strength)` pairs, empty groups and stored-empty windows, the single-condition diagnostic — are `synthetic` reference cases replayed by [§7.2](#72-calculation-parity-tests) step 5; the dip-range filter of inverse mode joins the reference coverage of [§5.14](#514-inverse-mode-p2) with P2. |
| `state.test.ts` | The [§5.6](#56-scenario-state-and-url-encoding) scenario-state model: `defaultScenario(manifest)` equals the manifest-derived defaults of the fixture manifest; `Scenario` holds accepted values only; reducers are pure; settings outside the permitted vocabulary are rejected (the "scenario-state validation" of [HLDD §9 — Testing and release architecture](hldd.md#9-testing-and-release-architecture), Application-specific tests); Reset restores every [§5.7](#57-scenario-controls) control to its default, family view off included, and leaves the overlay switch and the width panel's `logScale` as they were (display state, [§5.6](#56-scenario-state-and-url-encoding)); deselecting any scarp type turns family view off (§5.7). |
| `parse.test.ts` | `src/state/parse.ts`, the free-entry validation of [§5.7](#57-scenario-controls): grammar G — canonical forms (`03.50` → `3.5`, `.5` → `0.5`, `3.` → `3`, `1,5` → `1.5`), BLANK, and INVALID (`-`, `-0`, `+3`, `1e3`, `3 m`, letters, inner spaces, `1,000.5`, a lone `.`, and the 17-character `1234567890.123456`, while the 16-character `1234567890.12345` is valid, each also with a leading and a trailing space); `storedBoundsFromDecimal(min, max)` by integer arithmetic — lower `0.00005` → 1, upper `5.01349` → 50134, upper `5.0135` → 50135, and 12-decimal strings; slip-window rejections — a maximum above `slip_window_bounds.max` compared as exact decimals, a lone minimum above it, a minimum above the maximum, a negative or unreadable entry; offset entries — `0` and `1000` accepted, `1000.0001` rejected (above the R2 bound, compared as exact decimals), INVALID and BLANK at commit rejected; the dip-assist grammar, `20.25° – 45.125°` (16 characters) readable and `20.125° – 45.125°` (17) unreadable; the read-off validity rule. |
| `scenario-json.test.ts` | `src/state/scenario-json.ts` ([§5.6](#56-scenario-state-and-url-encoding); [DD-11](#1-ddd-decision-register)): `serializeScenario` of [GS-1](pdd.md#102-golden-scenarios) equals the §5.6 golden bytes; round trips for the default scenario, GS-1, A, B, a lone minimum, a lone maximum, and offset mode; the canonical-decimal cases (`03.50` → `3.5`, `0.000` → `0`); A and B serialize differently; an unknown key or an out-of-vocabulary value makes `parseScenario` throw `ScenarioInputError`, whose `path` names the offending key or element ([§5.10](#510-failure-states)). |
| `summary.test.ts` | `summaryText(state, counts)` ([§5.7](#57-scenario-controls)): the PDD tokens verbatim — `Strong (uniform)`, `Strong — uniform and layered`, `slip: any` for the inactive window, `all recorded stages` for the all-stages population without a window; `any sediment` for all nine pairs; A → `Weak (layered) or Strong (uniform)` and B → `Weak (uniform) or Strong (layered)`, as the §5.7 grammar spells them; 512 distinct tokens over all 512 sediment subsets; each checkbox group's empty-group token; the offset-mode window token. |
| `histogram.test.ts` | `histogram()` and `histogramLog()` mechanics ([§5.12](#512-charts)) only. Linear: the cap loop ends with at most 60 bins; edges ascend; the counts sum to n; valid 0 returns null. Logarithmic, with `logScaleOfferRatio()` as `offerRatio`: every edge is twice the one before, the first being 100 · 2^k recording steps; each edge value from 100 to 100 · 2^20 lands in the bin that starts at it, and the value one step below it in the bin before (below 100, in `below_counts`); the counts and `below_counts` together sum to n; no positive value returns null. Both: identical inputs give identical output. Rules, edges, counts, and whether the log histogram is offered — among them the `synthetic.histograms` threshold pair, `maxpos_s = 100 · minpos_s` not offered and `maxpos_s = 100 · minpos_s + 1` offered — are checked against the references in [§7.2](#72-calculation-parity-tests) steps 3 and 5. |
| `scenario-controls.test.ts` | `controlModel(manifest, state)` and `dipRangeEcho(entry, dips)` ([§5.7](#57-scenario-controls)): every option list equals its fixture-manifest dictionary in dictionary order — the sediment pairs in `arm_strength_states` order, uniform arm first ([§3.2](#32-artifact-manifest)) — never hardcoded; defaults equal the manifest-derived values; disabled flags (family view disabled unless all six types are selected); the display label of data `Alternating Strong-Weak` is `Alternating Strong–Weak`; `dipRangeEcho` returns the modeled dips an entry includes. Rendering the echo is [§7.5](#75-browser-test-lane)'s. |
| `charts.test.ts` | `histogramSvg(spec, width)` and `ecdfSvg(spec, width)` ([§5.12](#512-charts)): two independently built specs from the same inputs serialize identically through `serializeSvg`, on a linear and on a logarithmic value axis; tick labels equal `displayRound` at the [D-23](pdd.md#1-decision-register) (Reader-facing display precision per quantity) decimals; each segment's `<title>` equals `segmentTitle`; `ecdfSteps(sorted)` drawing mechanics on injected arrays: `[1, 1, 2, 2, 2, 5]` gives x `[1, 2, 5]` and c `[2, 5, 6]`, `[3, 3, 3]` gives x `[3]` and c `[3]` (and `ecdfSvg` draws that two-vertex rise at the plot's horizontal center), and the values 0 … m − 1, one each, give all 511 points for m = 511, all 512 for m = 512, and for m = 513 the 512 with every k but 256, `ecdfSvg` drawing 2M vertices for M points; no table, list, or text alternative sits inside the `<svg>` (alternatives are its siblings, [§5.11](#511-accessibility-supported-environments-and-navigation-lifecycle)). |
| `chart-text.test.ts` | `chartLabel(state)`, `binTableSpec(binsByGroup, groups, edges)`, `fieldTableSpec(rows, order)`, and `segmentTitle` ([§5.11](#511-accessibility-supported-environments-and-navigation-lifecycle)) with injected counts: the header order is canonical; the six-to-three family fold keeps row totals; the group cells of each row sum to its Total; field rows follow the PDD §4.4 source order, ascending value, ties broken by `eq_name`; one distinct `chartLabel` per combination of chart kind and field ticks, and, for the histogram only, family view and log scale; on the logarithmic axis the bin table's first row is `below 0.1 m` exactly when the below counts are not all zero. |
| `notices.test.ts` | `selectNotices(input, cfg)` ([§5.8](#58-view-layer)): at N = 0, 9, 10, 29, and 30 and at zero matching records, exactly one result notice per panel; the caveats coexist; the empty-state explainer carries its second part exactly when the diagnosed set is non-empty; on injected `RenderInput`s ([§5.8](#58-view-layer)), the plan's `caveats` in their order — the scarp-dip notice first; the low-slip caveat for a direct window whose stored lower bound `lo_s` is `t_s − 1`, not for one at `t_s`, for a converted window of `windows` below `t_s`, and never for the inactive-window default ([PDD §4.6 — Low-slip caveat (D-4, Interim)](pdd.md#46-low-slip-caveat-d-4-interim)); and a per-dip line, its `{Y}` from `windows`, for exactly the `partly_out` entries of `flags`; the thresholds, `t_s` included, come from `config.ts`, never from literals. That the short disclaimer renders in every state that commits the skeleton is asserted in the browser lane ([§7.5](#75-browser-test-lane)). |
| `field-overlay.test.ts` | The pure overlay model `src/overlay/model.ts` ([§5.8](#58-view-layer), [§3.4](#34-field-data-export)) on injected rows: `overlayRows` default sets (scarp height: `labeled_set`; width: `labeled_set` and `criterion_sub50` `met`) and the show-all expansion; `overlayGroups` per source, never pooled, carrying the `limited_comparison` flag; `overlayNote('scarp_dip')` yields the PDD §4.4 note "Field sources provide no comparable scarp-dip measurement.", and `overlayNote` of the other two measurements yields null. |
| `downloads.test.ts` | `buildPackage(input, stamps, generatedAt)` ([§5.9](#59-downloads)) with a fixed `generatedAt`: the members are exactly `records.csv`, `statistics.csv`, `provenance.txt`, `scenario.json`, in that order; the CSV column orders equal `RECORDS_CSV_COLUMNS` and `STATISTICS_CSV_COLUMNS`; `records.csv` writes each value from its recorded integer by the §5.9 integer rule — `s = −182` at 3 decimals as `-0.182`, slip at 4 decimals, a null as an empty field, and an unclassified record's `scarp_class` empty; the `statistics.csv` display columns equal `displayRound` of the injected values; both version stamps appear; `provenance.txt` holds the nine §5.9 label lines in the PDD §6.1 order, block 5 equal to `settingsText` of the snapshot, block 8 the `generatedAt` instant, and — on an offset-mode input with a `partly_out` dip and a converted window starting below `t_s` — block 9 equal, line for line, to the `caveats` that `selectNotices(input, cfg)` returns for the same input; `scenario.json`'s `scenario` equals the object `JSON.parse(serializeScenario(snapshot, manifest))`, and its `converted_windows` is null in slip mode and in offset mode equals the selected dips' injected `windows` entries and `flags` ([§5.8](#58-view-layer)), in ascending dip order, with floats written by `Number.prototype.toString`; no field row appears in any member when `field` is set; an empty match gives a records file holding the header row only; a package built from one `RenderInput` contains nothing of another. |
| `file-name.test.ts` | The [DD-6](#1-ddd-decision-register) slug and file-name template of `src/download/file-name.ts` ([§5.9](#59-downloads); the file was `slug.test.ts`): key order `dip`, `sediment`, `depth`, `density`, `window`, `offset`, `classes`; A → `sediment-uniform-strong-layered-weak` and B → `sediment-uniform-weak-layered-strong`; `.` encoded as `p` — `window-1p5-to-3` against `window-1-to-5p3`, and a lone maximum `window-0-to-3`; an empty group's raw value `none`; the all-default slug `all`; injectivity checked per token, never by enumerating complete scenarios: for each group, the full slugs (before truncation) of the scenarios that differ from the default scenario in that group alone, over all its subsets — sediment (512), dips (128), classes (64), depth (8), and density (8) — are pairwise distinct, the default subset giving `all`; and each of those slugs other than `all` is a single token — its key, `-`, then only characters of `[a-z0-9-]` — so no token holds the `_` delimiter and a full slug splits at `_` into its groups' tokens unambiguously; a slug over 80 characters truncated to at most 80, ending in `-` and the first 8 hex digits of the FNV-1a-64 hash of the full slug (vectors: `''` → `cbf29ce484222325`, `'a'` → `af63dc4c8601ec8c`); the population token and the `YYYY-MM-DD` UTC date from `generatedAt`. |
| `zip.test.ts` (with `test/zipcheck.py`) | `zip(members, modified)` ([§5.9](#59-downloads)): `crc32('123456789')` is `0xCBF43926`; the CRC-32 equals `node:zlib` `crc32` on 1,000 buffers from a fixed-seed generator, lengths 0, 1, and 65,536 included; signatures, offsets, and the end-of-central-directory counts (4 entries) are correct; an independent reader accepts the archive — the test writes `build/test/zip/fixture.zip` and runs `python3 -I test/zipcheck.py <file> <ISO instant> <member SHA-256s>`, which exits 0 only if `ZipFile(file).testzip()` is `None`, the names are the four members in order, every `compress_type` is `ZIP_STORED`, `flag_bits` is 0, every `date_time` equals the instant floored to 2 s, and, when member SHA-256s are given, they match (a missing `python3` fails the test, never skips it); the same members and instant give identical bytes. |
| `views-text.test.ts` | `chartSummary` and `statsRows` ([§5.8](#58-view-layer); [DD-9](#1-ddd-decision-register)) with injected statistics: rows in the PDD §4.2 order; values by `displayRound` at the D-23 decimals and counts by `formatCount`; the PDD §4.3 unclassified line present exactly when unclassified records match; `displayRound` on the display-rounding vectors of [§7.3](#73-pipeline-and-export-tests), identical to the Python list — formatting only, per the pipeline-first rule above. |
| `toolchain.test.ts` | The pinned runtime ([§2](#2-repository-structure-naming-and-toolchain)): `process.version` equals `'v' + process.env.EGR_EXPECTED_NODE`, which `webappTest` sets from the plugin's `node.version`; an unset variable fails the test. |
| `compat.test.ts` | The documented-API check of [§7.6](#76-performance-and-compatibility-measurements). |

Two earlier files are gone. `config-pdd.test.ts`: the agreement of
`config.ts` and the copy registry with the PDD is checked by
`.github/scripts/check_pdd_agreement.py` and its self-tests
`.github/scripts/test_check_pdd_agreement.py`, run by the Doc links
workflow's `links` job ([§5.13](#513-application-configuration);
[§6.3](#63-ci-workflows)); that no research-derived value appears in
configuration is a closed key set plus review (§5.13), not a test.
`codec.test.ts`: the shared-link codec ships with P2 under the value
grammar the [§5.6](#56-scenario-state-and-url-encoding) revision for
shared links fixes; the MVP has no codec test.

*Verification (planned):* runs as `webappTest` in the
**Webapp checks** steps of Tests / `webapp-test` and Companion site /
`webapp-bundle` ([§6.3](#63-ci-workflows)) on every matching trigger.

References:

- [HLDD §9 — Testing and release architecture](hldd.md#9-testing-and-release-architecture) (Calculation parity; Application-specific tests).
- [ADR-0015](../adr/0015-golden-scenario-parity.md).
- [ADR-0011](../adr/0011-webapp-toolchain.md) (no framework; the
  table-first accessibility contract).
- [PDD §3.2 — Sediment strength and structure (FR-S2)](pdd.md#32-sediment-strength-and-structure-fr-s2)
  (the arm tokens); [PDD §4.4 — Field overlay (FR-O5, D-18
  Proposed)](pdd.md#44-field-overlay-fr-o5-d-18-proposed) (the
  scarp-dip note).
- [§2 — Repository structure, naming, and toolchain](#2-repository-structure-naming-and-toolchain) (the `webappTest` task; `tsconfig.node.json`).

### 7.5 Browser test lane

The lane is the [DD-3](#1-ddd-decision-register) choice, transcribed
from the register: Playwright (`@playwright/test`, pinned in
[§2](#2-repository-structure-naming-and-toolchain)) driving its
pinned bundled Chromium — one evergreen engine per the
[ADR-0015](../adr/0015-golden-scenario-parity.md) second amendment
of 2026-10-29 — wrapped in the Gradle task `webappBrowserTest`, run
locally on request and required before a release. The grounds are
the register note's. The task joins no lifecycle target and no CI
job in the MVP: CI's correctness gate remains the Node parity
harness, and promoting this lane to CI is the post-MVP option the
amendment names. The engine version changes only with a reviewed
upgrade of the pinned package (§2).

**Mechanics.**

- **Served tree.** The lane serves `subprojects/mkdocs/site-preview/`,
  the strict preview build that `mkdocsPreview` writes from
  `mkdocs.preview.yml` — the publication configuration with every
  draft except `media/dev/` included
  ([§6.1](#61-build-outputs-asset-paths-and-page-scaffold)) — in
  every publication state of §6.1 alike, so the scenario page is
  testable while it is still a draft. It is the assembly that CI's
  **Build preview site** step validates ([§6.3](#63-ci-workflows)),
  and `webappBrowserTest` depends on
  `:subprojects:mkdocs:mkdocsPreview`, so every run serves a freshly
  assembled tree. It differs from the publication output only by the
  drafts it includes, by the unlisted pages its `sitemap.xml` keeps
  (§6.1, Site checks hook), and by the sitemap rewrite below.
- **Configuration.** `playwright.config.ts` reads `SITE_URL` from the
  `site_url` line of `subprojects/mkdocs/mkdocs.yml` and sets
  `BASE_PATH = new URL(SITE_URL).pathname` (`/eps-ground-rupture/`)
  and `BASE_URL = 'http://127.0.0.1:4173' + BASE_PATH`. Its
  `webServer` is an array of two `playwright/serve.mjs` instances,
  each with `reuseExistingServer: false`:
  `<node> playwright/serve.mjs --root ../mkdocs/site-preview --site-url <SITE_URL> --port 4173`
  (url `BASE_URL`), and the same command with
  `--port 4174 --max-age 0` (url `'http://127.0.0.1:4174' + BASE_PATH`)
  for the revalidating measurements of
  [§7.6](#76-performance-and-compatibility-measurements), where
  `<node>` is `JSON.stringify(process.execPath)` — the Node.js
  running Playwright, never whichever `node` is first on `PATH`.
  `use.baseURL` is `BASE_URL`, and specs navigate by relative paths
  without a leading slash (`page.goto('scenario/')`). The
  `globalSetup` module, `playwright/global-setup.ts`, fails the run
  unless the first `<loc>` of the `sitemap.xml` served on port 4173
  starts with `BASE_URL`.
- **Static server.** `playwright/serve.mjs` uses Node.js built-in
  modules only, no package. Its flags are `--root`, `--site-url`,
  `--port`, `--max-age` (default 600), and `--host` (the bind
  address, default `127.0.0.1`). It handles a request in this order:
  a method other than GET or HEAD gets 405; a decoded path with a
  `..` segment or a NUL gets 400; `/`, or `BASE_PATH` without its
  trailing slash, gets 301 to `BASE_PATH`; a path outside `BASE_PATH`
  gets 404; a path ending in `/` serves that directory's
  `index.html`; a directory without the trailing slash gets 301 to
  the same path plus `/`, query kept; an existing file gets 200;
  anything else gets 404 with the bytes of the tree's `404.html`.
  Headers mirror the published host:
  `Content-Type` from a fixed map (`.html` `text/html; charset=utf-8`,
  `.js` `application/javascript; charset=utf-8`, `.css`
  `text/css; charset=utf-8`, `.json`
  `application/json; charset=utf-8`, `.xml` `application/xml`, `.gz`
  `application/gzip`, `.svg` `image/svg+xml`, `.txt`
  `text/plain; charset=utf-8`, `.png` `image/png`, `.jpg`
  `image/jpeg`, `.ico` `image/x-icon`, `.woff2` `font/woff2`, and
  `application/octet-stream` otherwise); `Cache-Control:
  max-age=<max-age>`; `Last-Modified` from the file's mtime; an `ETag`
  over the response body a GET returns; 304 on a matching
  `If-None-Match` or on an `If-Modified-Since` not earlier than
  `Last-Modified`; `Vary: Accept-Encoding` on every response,
  whatever its status and the request's `Accept-Encoding`; for
  `.html`, `.js`, `.css`, `.json`, `.xml`, and `.svg`, when the
  request's `Accept-Encoding` includes `gzip`, `Content-Encoding:
  gzip` (`node:zlib` `gzipSync` at its default level); and never a
  `Content-Encoding` for a `.gz` file, which is served as stored. The
  map's `.html`, `.js`, `.css`, `.json`, `.xml`, `.gz`, `.png`, and
  `.jpg` values, the encodings, and `Vary` are the published host's
  (a drafting measurement: GET requests to
  `https://harvardrc.github.io/eps-ground-rupture/` on 2026-10-30,
  reproduced by the published-site run of
  [§7.6](#76-performance-and-compatibility-measurements), T-61); the
  host serves no file of the other classes today. One transformation:
  `sitemap.xml` is served with every occurrence of `SITE_URL`
  replaced by `http://127.0.0.1:<port>` followed by `BASE_PATH`.
  Material's instant navigation intercepts a click only when the
  target URL is in the sitemap, and its sitemap resolver rewrites
  only the protocol and host name of each entry and keeps its port,
  so the production entries never match a page served on port 4173 —
  without the rewrite every "instant" step would silently be a full
  page load
  ([§5.11](#511-accessibility-supported-environments-and-navigation-lifecycle)).
  The resolver copies that protocol and host name from the page's own
  URL (`integrations/sitemap/index.ts` L63–67, its base the
  `config.base` of `bundle.ts` L157, made absolute against the page's
  location in `_/index.ts` L115), so the rewritten host is immaterial
  and only `<port>` must equal the port in the page's URL: the
  entries resolve to the page's own origin whether it was reached at
  `127.0.0.1`, at `10.0.2.2` (the Android Emulator's alias for the
  host loopback), or at the machine's LAN address, and the advertised
  origin needs no per-environment setting. Item 15 of
  [§7.7](#77-site-validation-and-release-checklist) checks this in
  each of its environments with the probe below.
- **Instant navigation is proven, never assumed.** Every instant step
  sets `window.__greProbe = 1` before the click and asserts afterwards
  that it is still `1`; a full page load would have cleared it. The
  first instant entry into the scenario page injects
  `<a id="gre-test-entry" href="scenario/">` into the home page's
  `.md-content__inner` and clicks it: before activation no page links
  to the scenario page, and Material intercepts any content click
  whose URL is in the sitemap.
- **Expected values.** The lane reads the pinned reference-results
  file from the served tree —
  `subprojects/mkdocs/site-preview/assets/scenario/data/`, the pointer
  entry whose name begins `references-` — re-verifies its SHA-256
  against the pointer manifest, gunzips it with `node:zlib`, and uses
  its counts, display strings, `histogram`, and `histogram_log`
  entries as expected values ([§3.6](#36-reference-results)). The
  lane never rounds a result: a displayed result string is compared
  with the string the pipeline wrote.
- **Projects.** Three, in `playwright.config.ts`:
  - `desktop` — `testDir: 'playwright/specs'`,
    `testMatch: '*.spec.ts'` (the eleven specs below), Chromium's
    default desktop viewport, `trace: 'on'`;
  - `mobile` — the same `testDir`,
    `testMatch: /(render|interactions|golden-scenario|keyboard-responsive)\.spec\.ts$/`,
    `use: { viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true }`
    — the 360 px floor of
    [PDD §9.2 — Browser and mobile baseline (D-16, Proposed)](pdd.md#92-browser-and-mobile-baseline-d-16-proposed)
    under Chromium mobile emulation, so labeled in the report —
    `trace: 'on'`;
  - `measure` — `testDir: 'playwright/measure'`,
    `testMatch: '*.measure.ts'` (the
    [§7.6](#76-performance-and-compatibility-measurements) suite),
    `fullyParallel: false`, `retries: 0`,
    `use: { headless: false, trace: 'off', video: 'off', screenshot: 'off' }`
    — headed, under `xvfb-run` on the reference VM. Playwright 1.47.2
    has no per-project `workers`, so every invocation of this project
    carries `--workers=1` (§7.6).
- **Invocation.** `webappBrowserTest` runs, from
  `subprojects/webapp`, the npm script `browser-test` of
  [§2](#2-repository-structure-naming-and-toolchain),
  `playwright test --project=desktop --project=mobile`: the
  functional specs, in parallel. It depends on `playwrightInstall`
  (§2), which runs the npm script `browser-install`
  (`playwright install chromium`), so the Chromium build the locked
  `@playwright/test` pins is present before the lane runs. The
  `measure` project never runs in it; `webappMeasureReference` runs
  it alone in the reference environment
  ([§7.6](#76-performance-and-compatibility-measurements)), so no
  functional spec and no tracing shares a machine with a measured
  run. A manual `npx playwright test --project=measure --workers=1`
  anywhere else — run after
  `./gradlew :subprojects:webapp:playwrightInstall`, in the form of
  Node.js outside Gradle of §2 — is a diagnostic, and no Gradle task
  runs one. `subprojects/webapp/README.md` gives both invocations,
  the lane's and the diagnostic's, as written here.
- **Routing.** Functional specs may intercept requests with
  `page.route` (the failure, lifecycle, and mid-edit drives below);
  measurement specs never call `page.route`, `context.route`, or
  `routeFromHAR` and never record HAR, because routing disables the
  HTTP cache.
- **Accessibility engine.** `@axe-core/playwright`, pinned at 4.10.0
  in [§2](#2-repository-structure-naming-and-toolchain). `a11y.spec.ts`
  runs
  `new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()`,
  asserts `violations.length === 0`, and records
  `results.testEngine.version` as the test annotation
  `axe-core-version`. Axe has no rule for the non-text contrast of
  adjacent chart segments; the visible bin table of
  [§5.11](#511-accessibility-supported-environments-and-navigation-lifecycle)
  carries that information, and the a11y spec asserts the table.
- **Report and exit status.** Reporters `list` and `json` (output
  file `build/playwright/report.json`); traces under
  `build/playwright/test-results/` (`outputDir`) — both under
  `subprojects/webapp/build/`, which the root `build/` rule of
  `.gitignore` already covers. Any failed check fails the run with a
  nonzero exit status —
  [HLDD §9 — Testing and release architecture](hldd.md#9-testing-and-release-architecture)
  (Browser tests — locally invoked release checks): "The script must
  report failed checks and return a nonzero exit status when any
  check fails."
- **Coverage.** These specs are the only coverage of the DOM
  appliers under `src/views/dom/`, of `src/overlay/field-overlay.ts`,
  `src/download/deliver.ts`, `src/a11y/`, and `src/main.ts`: `render`,
  `interactions`, `a11y`, and `consistency` for the views, overlay,
  and downloads; `mount` and `navigation-lifecycle` for the
  lifecycle.

**Inventory.** One spec per item of the HLDD §9 browser-lane list —
the quoted obligation in each of those rows is that list's,
verbatim — plus a final site-regression spec carrying the
per-release regression checks of
[§7.7](#77-site-validation-and-release-checklist) (the
site-regression obligation of
[HLDD §7.3 — Delivery and caching](hldd.md#73-delivery-and-caching),
[Existing-site integration](hldd.md#existing-site-integration)). The
eleven specs live in `subprojects/webapp/playwright/specs/`.

| Spec | HLDD §9 obligation (verbatim) | Drive and assertion |
|---|---|---|
| `render.spec.ts` | "product pages render correctly, including controls, charts, tables, notices, and fallback content" | Visits the scenario page and each shipped product page. Asserts every [§5.7](#57-scenario-controls) control present with manifest-sourced enumerations, and the "Advanced" `<details>` holding a `disabled` fieldset; the slip-window control's descriptive label "approximately 0–5 m" of [PDD §3.4 — Displacement window (FR-S5)](pdd.md#34-displacement-window-fr-s5) in `#gre-slip-range`, as its `copy.json` entry holds it, and `#gre-slip-help` equal to the §5.7 template with `{min}` and `{max}` the `String()` of the served manifest's `slip_window_bounds.min` and `.max` and `{step}` the string `displayRound(stage_spacing.mean, 2)` returns (the spec imports `displayRound` from `src/views/format.ts`); the stacked [DD-4](#1-ddd-decision-register) panels `#gre-scarp_height`, `#gre-dzw`, and `#gre-scarp_dip`, each with its chart, its collapsed `<details id="{pid}-data">`, and its statistics table; `#gre-caveats` and each panel's notice slot ([§5.8](#58-view-layer)); the prototype notice `#gre-prototype`, first in the results header, holding exactly the text of the `ddd5.8.prototypeNotice` entry while `copy.json` holds it, and absent otherwise ([§5.8](#58-view-layer)); each panel's [DD-5](#1-ddd-decision-register) info note equal to its `copy.json` entries — on the width panel, while its "Logarithmic scale" checkbox is visible, the bin-rule sentence followed by the logarithmic-scale sentence ([§5.8](#58-view-layer)); the PDD emphasis of the population explainer and of the overlay framing rendered as `<strong>` elements, with no literal `**` (§5.8); each first-use glossary link's target anchor present in the served glossary page ([PDD §5.11 — Labels, units, and glossary links (FR-G3, CR-3, CR-7)](pdd.md#511-labels-units-and-glossary-links-fr-g3-cr-3-cr-7)); with the overlay on, each overlay source link's target anchor (`fdhi-flatfile`, `sure-database`, `kern-county-1952`; [§5.8](#58-view-layer)) present in the served data page; the no-JS fallback body inside `#gre-root` in the page source, the five link targets of its [§5.10](#510-failure-states) block served; exactly one `#gre-disclaimer`, non-empty and not a descendant of `#gre-root` (its text agreement with [PDD §5.1 — Standing disclaimer (CR-4; D-10 Open)](pdd.md#51-standing-disclaimer-cr-4-d-10-open) is step 7 of `check_pdd_agreement.py` ([§5.13](#513-application-configuration))); and the footer carrying exactly the committed `CITATION.cff` version and the pointer's `export_version` ([§6.2](#62-software-and-data-version-stamps)). Resize: in the `desktop` project, the spec narrows the viewport to 600 CSS px with `page.setViewportSize` and then requires each rendered chart's `<svg>` `viewBox` width to equal its panel's new CSS width, with the status region unchanged ([§5.12](#512-charts), Resizing). From P2, data-driven from the same fetched vintage ([§6.4](#64-product-pages-beyond-the-scenario-page-p2p3)): the morphology sections appear in exactly the manifest's `scarp_classes` order with swatch colors equal to `scarp_class_palette`; the served HTML's `#gre-family-toggle` has no child, and once the script has run it holds one unchecked "Group collapse variants" control, whose checking folds each collapse-variant section under the section before it and whose unchecking restores the six sections in `scarp_classes` order; the measurement page's `.figure-pop` link resolves to the `#fig-5` anchor of the served figures page and its `data-img` image loads; from the measurement page's activation on, each statistics table's "How were these measured?" link resolves to the served measurement page; and each P2/P3 page's `[Full disclaimer →](scenario.md#gre-disclaimer)` link resolves. |
| `mount.spec.ts` | "direct visits and site navigation initialize the application correctly, and the application replaces the fallback presentation only once its interactive content is ready" | Direct entry `page.goto('scenario/')`, the artifact response held by `page.route` until the loading state is asserted: exactly one `#gre-root` and one `#gre-app`; while loading, `#gre-root:not([data-gre-mounted])` still shows the fallback text; once released, `#gre-root[data-gre-mounted]` shows no fallback text and its `data-gre-build` equals the resolved `src` of `#gre-app`, and — the URL carrying no fragment — focus is on `#gre-scarp_height` and that section is in the viewport ([DD-4](#1-ddd-decision-register); [§5.11](#511-accessibility-supported-environments-and-navigation-lifecycle) focus management). First instant entry through the injected `#gre-test-entry` link, the probe surviving: the same assertions. In a context with JavaScript disabled, the fallback body remains the page's content ([HLDD §6.1 — Failure honesty (ADR-0010)](hldd.md#61-failure-honesty-adr-0010)). Disclaimer: after a direct entry and one committed scenario change, `#gre-root #gre-disclaimer` counts 0 and `#gre-disclaimer` is present; with a handle held on `#gre-root` and `history.length` recorded, clicking the short disclaimer's link in `#gre-caveats` leaves the handle connected, `#gre-summary` showing the changed scenario, `history.length` unchanged, and the status region unchanged, and brings `#gre-disclaimer` into the viewport (`toBeInViewport`) with focus on it — the fragment-link `guard` of §5.11; each after a fresh direct entry, Material's skip link (`.md-skip`, focused, then Enter) and the `h1`'s permalink (`.headerlink`) leave `#gre-root` connected and focus their target. Fragment entry: a direct load of `scenario/#gre-disclaimer`, its artifact response held by `page.route` until after the page's `load` event so that the first commit lands late, ends with `#gre-disclaimer` in the viewport and focus not on the first panel. |
| `navigation-lifecycle.spec.ts` | "leaving and returning to the scenario page does not duplicate controls, event handlers, or result updates" | Three leave-and-return cycles — the Glossary nav link, then `page.goBack()` — with the probe asserted on each step: the counts of controls in `#gre-controls`, of panels, and of live regions equal the first visit's; one scenario change makes exactly one status-region update (a duplicated handler would double it); the bundle URL and the artifact URL are each requested once. Changed bundle URL: on re-entry, `page.route` serves the scenario HTML with `?swap=1` appended to the `#gre-app` `src`; exactly one control set results, its `data-gre-build` ending in `?swap=1`, and an unrouted re-entry restores the original. Stamp change: on re-entry, the routed scenario HTML carries `data-data-version="<v>-x"`; the version-mismatch state names both versions and no cached result shows, and an unrouted re-entry renders results again. In-flight disposal: hold the artifact response, leave, release it, return; one control set, no unavailable notice, no `pageerror`. From P2, the morphology page entered directly and by instant navigation, then through three leave-and-return cycles, carries exactly one `#gre-family-toggle[data-gre-bound]` and one injected control ([§6.4](#64-product-pages-beyond-the-scenario-page-p2p3)). |
| `interactions.spec.ts` | "the scripted interactions of the DDD's test inventory each produce the response the PDD defines for them — scenario changes, offset-mode entry and its flags, notices, and downloads" | Drives every [§5.7](#57-scenario-controls) control, the dip range-entry assist (echo before Apply) and Reset included, and asserts the PDD-defined response by citation, with the notice tiers each pinned to a golden scenario of [PDD §10.2 — Golden scenarios](pdd.md#102-golden-scenarios): GS-2 fires the small-result warning with the chart still rendered; GS-5 suppresses the chart and keeps the table; GS-4 hides `#gre-panels`, fills `#gre-state` with the empty-state explainer naming both conditions, and keeps the short disclaimer in `#gre-caveats`; GS-6 shows the no-valid-measurement notice, never the no-match diagnostic; GS-1's offset entry shows the per-dip lines of [PDD §3.6 — Multi-dip conversion rule](pdd.md#36-multi-dip-conversion-rule-d-3-proposed) (30° partly out of range, 40° in range); exactly one result notice per panel at a time, caveats coexisting ([§5.8](#58-view-layer) precedence). Mode switch: slip 0–3, then offset mode with a blank field (no error, summary unchanged), then `3` and Enter (the offset token and the per-dip flags), then slip mode again (fields `0` and `3`, summary "slip 0–3 m"); then `6` and Enter in the slip maximum (rejected), offset mode, and slip mode again, which rejects at the switch (both slip fields marked, the summary still the offset token). Overlay: switched on, marks appear on the height and width panels, and the scarp-dip panel draws no tick while its `.gre-legend` slot shows "Field sources provide no comparable scarp-dip measurement." as HTML text ([§5.8](#58-view-layer)); Reset leaves the overlay switch as it was and turns family view off. Log scale ([§5.12](#512-charts)): the spec first asserts that the reference [GS-0](pdd.md#102-golden-scenarios) (Empty scenario (no active slip window), default population) has a non-null `histogram_log.dzw` and [GS-7](pdd.md#102-golden-scenarios) (One state per simulation trial, no active slip window) a null one, so both paths below run (GS-7's positive widths span 1.177–38.324 m, at most two decades — `maxpos_s ≤ 100 · minpos_s`, so the axis is not offered: drafting measurement on `data/processed/dem/data.parquet`, SHA-256 `6a6e9149066f503588e09ecb6772a8392685716672e298d75aa925e7826eb303`, reproduced by this assertion, T-60). In GS-0, `#gre-dzw` shows the "Logarithmic scale" checkbox ([§5.8](#58-view-layer)), and the info note's logarithmic-scale sentence with it, in the histogram view and not in the cumulative view; checking it makes the open bin table start with a `below 0.1 m` row whose group cells equal `histogram_log.dzw.below_counts` (when they are not all zero), followed by rows equal to its `counts`, and the chart's accessible name contain `logarithmic value axis`; Reset leaves it checked; selecting the one-state population (GS-7) hides the checkbox and the logarithmic-scale sentence and restores the linear bin table, equal to GS-7's `histogram.dzw` counts; Reset, back to GS-0, shows the checkbox unchecked. Download: "Download this result" delivers a file named by the [§5.9](#59-downloads) template. |
| `golden-scenario.spec.ts` | "at least one golden scenario is evaluated end to end, and every displayed value equals the display-rounded reference result exactly" | Replays GS-1 through the real page. Every displayed count — matching records, each panel's valid and excluded-null counts, the unclassified line's count when shown — equals the reference `counts`; every displayed statistic and read-off pre-mark equals the reference `display` string, and every converted-window value — the assist panel's `{lo}` and `{hi}` and the `{Y}` of the 30° per-dip line — the reference `window_lo_display` or `window_hi_display`, exactly ([SC-3 (correctness)](pdd.md#101-success-criteria)); with each chart-data disclosure open, the bin table has `bins` rows whose group cells equal the reference `histogram` `counts` row by row; every applicable caveat is present in the default view of the result ([SC-5 (candor)](pdd.md#101-success-criteria), the acceptance list of HLDD §9). |
| `determinism.spec.ts` | "the same starting state and action sequence produce identical scenario settings and displayed results on every run" | Runs the GS-1 action sequence twice in fresh contexts; asserts that the scenario summary, every displayed result, and the downloaded `scenario.json` bytes are identical between runs. |
| `consistency.spec.ts` | "scenario summaries, charts, tables, and downloads describe the same active scenario" | Builds GS-1 through the controls; captures the summary, chart labels, table values, and a download (Playwright's download event); asserts one scenario describes them all: the downloaded `scenario.json`'s `scenario` deep-equals the reference GS-1 `inputs`; `python3 -I test/zipcheck.py <download> <instant of provenance block 8>` exits 0, so the archive holds the four members, stored and well formed; and the package's settings, versions, counts, and statistics match the displayed ones, the footer stamps included ([SC-2 (download reproducibility)](pdd.md#101-success-criteria)'s reviewer path). |
| `failure-states.spec.ts` | "each §6.1 state appears when its condition holds — invalid or out-of-range input, no data for the selected scenario, unavailable browser capabilities, and internal failure — without being confused with one another" (the §6.1 is [HLDD §6.1 — Failure honesty (ADR-0010)](hldd.md#61-failure-honesty-adr-0010)) | Drives each category. Invalid input: offset entries `abc`, `-1`, `1000.0001` (above the 1000 m bound of [§5.7](#57-scenario-controls) R2), and a blank commit, and slip-window entries `-1`, `abc`, minimum `3` with maximum `2`, and a maximum above `slip_window_bounds.max`, each get `aria-invalid="true"`, an accessible description that ends with its `copy.json` line verbatim (for a slip field, after the `#gre-slip-range` and `#gre-slip-help` texts), the element the appended id names holding exactly that line, the field text unchanged, and the summary and a captured download's provenance unchanged; entering offset mode with a blank field shows no error and changes nothing ([§5.7](#57-scenario-controls)). Out-of-range input: an offset entry whose 30° window runs past the recorded maximum is accepted and flagged `partly_out`, never rejected ([§5.10](#510-failure-states)), and the offset `1000`, the largest R2 accepts, is accepted with the results rendered, never the unavailable state. No data: GS-4 shows the empty state. Unavailable capabilities: deleting `DecompressionStream` with an init script yields the capability state naming it, the fallback and `#gre-disclaimer` standing and no skeleton built. Internal failure: an aborted artifact request, a truncated artifact, a manifest whose `export_version` differs from `data-data-version`, and the scenario HTML with `data-software-version=""`, each served by `page.route`, yield the unavailable state — the third its version-mismatch variant naming both versions, the fourth the reason "the page is missing information it needs to load the data" with `#gre-versions` empty — "never empty or stale results" ([ADR-0015](../adr/0015-golden-scenario-parity.md), second amendment), with focus on `#gre-state` ([§5.11](#511-accessibility-supported-environments-and-navigation-lifecycle)); with every regression-export request aborted, entering offset mode — a prefetch — shows nothing, and the offset `3`, committed by moving focus to the short disclaimer's link (the field's `change`), an accepted offset-mode Scenario, then yields the unavailable state naming the conversion coefficients and moves focus from that link to `#gre-state` ([§5.3](#53-query-engine), [§5.10](#510-failure-states)); an aborted field-export request on switching the overlay on shows the overlay legend's unavailable line and leaves the simulation results rendered, and switching the overlay off and on again with the request unrouted then draws the marks on the height and width panels and removes that line; an error thrown by an unrelated script added with `page.addScriptTag` leaves the results rendered. Asserts the presentations pairwise distinct, `#gre-disclaimer` present in every state, and the short disclaimer in `#gre-caveats` present in every state except the capability notice, which builds no skeleton ([§5.10](#510-failure-states)). |
| `a11y.spec.ts` | "the automatable accessibility checks pass" | Runs axe with the tags above, the WCAG 2.2 AA set of [PDD §9.3 — Accessibility target (D-17, Proposed)](pdd.md#93-accessibility-target-d-17-proposed), on the scenario page in the loaded state (again with the width panel's "Logarithmic scale" checked), the warning (GS-2), suppression (GS-5), and empty (GS-4) states, and the failure states — each with the chart-data disclosures closed and again open — and on each shipped product page; asserts zero violations. On GS-1 and GS-2, asserts the [DD-9](#1-ddd-decision-register) artifacts of [§5.11](#511-accessibility-supported-environments-and-navigation-lifecycle): each chart `toHaveRole('img')`, an accessible name matching the §5.11 chart-label template with N equal to the panel head's valid count, and an accessible description equal to its `<figcaption>`; `aria-details` resolving to the panel's `<details id="{pid}-data">`; with the disclosure open, the bin-table headers are the label with unit, the legend labels, and `Total`, each row's group cells sum to its Total, the Totals sum to the panel N, and the nonzero segments of bar i equal the nonzero cells of row i; the family toggle gives three group columns with unchanged Totals; with the overlay on, the field table has one row per tick drawn. In GS-5, a panel whose chart is suppressed shows no figure and no disclosure and keeps its statistics table. Read-off: `fill('95')` then Tab makes the input's accessible description match `/^Percentile 95: /`, and the status region announces exactly once. Rapid changes ([§5.3](#53-query-engine) item 2): from the loaded GS-0 state, after `performance.clearMarks()` and with a `MutationObserver` recording each non-empty text of the status region, one `page.evaluate` clicks the one-state population radio (GS-7) and then registers a `requestAnimationFrame` callback that clicks the all-stages radio — registered after the click's frame request, so it runs right after the scheduler's frame callback — so the second change is accepted after the first's frame commits and before that frame's announcement and mark tasks run; once the status region holds text, the observer has recorded exactly one text, the §5.11 "Results updated: {matching} matching records." with {matching} GS-0's reference `matching_records` by `formatCount`, and exactly one `egr:results-updated` mark exists, its `detail.seq` equal to that of the later of the two `egr:change-accepted` marks. |
| `keyboard-responsive.spec.ts` | "keyboard interaction and responsive layouts behave as PDD §9.2, PDD §9.3, and §7.2 specify" (the §7.2 is [HLDD §7.2 — Accessibility and supported environments](hldd.md#72-accessibility-and-supported-environments)) | Traverses the page by keyboard: every control reachable with visible focus, and operating a control by keyboard produces the same result update as the pointer path. Focus retention: a dip checkbox (Space), a population radio (ArrowDown), a panel view-switch radio (ArrowRight), the read-off input (`84`, Enter), the overlay switch (Space), and the slip maximum (`3`, Enter), each operated with `h = document.activeElement` stored first. After the update settles — for the dip checkbox, the population radio, the read-off, and the slip maximum, a status-region change; for the view-switch radio and the overlay switch, which are display-only and announce nothing ([§5.11](#511-accessibility-supported-environments-and-navigation-lifecycle)), the next replacement of the `.gre-chart` slot of the operated panel (for the overlay switch, of `#gre-scarp_height`), with the status region asserted unchanged — `h === document.activeElement && h.isConnected`. Mid-edit: with the field-export request held by `page.route`, switch the overlay on, focus the slip maximum, type `2.5` without Enter, release the request; marks then appear on the height and width panels with neither the Scenario nor the display state changed ([§5.3](#53-query-engine) item 3), while the value stays `2.5`, `selectionStart` is 3, focus, summary, and `aria-invalid` are unchanged; Enter then makes the summary read "slip 0–2.5 m". Empty-state focus: type `0` in the offset field and commit by clicking panel 1's Cumulative radio; `document.activeElement.id` is `gre-state`. In the `mobile` project the spec operates the view switch and the read-off with `tap()`; asserts no page-level horizontal scroll — `document.documentElement.scrollWidth` at most `window.innerWidth` — with every chart-data disclosure closed and again with every one open, each open table scrolling inside its `.gre-table-scroll` wrapper instead ([§5.11](#511-accessibility-supported-environments-and-navigation-lifecycle)); asserts `#gre-summary` in the viewport and its box clear of the focused control's, first with focus on the first fault-dip checkbox and then on Reset, each reached by Tab — the small-screen persistent summary of [§5.7](#57-scenario-controls) and WCAG 2.2 SC 2.4.11; and asserts no hover-dependent essentials. |
| `site-regression.spec.ts` | the per-release regression checks of [§7.7](#77-site-validation-and-release-checklist) on existing surfaces | Visits the existing dashboard, navigation, and citation pages: embeds and links present and loading; the scenario bundle requested only on the scenario page; the site-wide Tableau embedding module never requested there (the [§6.1](#61-build-outputs-asset-paths-and-page-scaffold) exclusion, observed from each page's requests); each dashboard page entered both directly and by instant navigation from a non-dashboard page, the probe surviving, its `<tableau-viz>` upgrading on both paths (the §6.1 loader). Host fidelity of the served tree: `request.get('data', { maxRedirects: 0 })` gets 301 to `BASE_URL` + `data/`; `request.get('no-such-page/')` gets 404 `text/html`; a `.gz` data file comes back without `Content-Encoding`. |

*Closes:* DD-3. *Verification (planned):* the exit status of
`webappBrowserTest` gates item 4 of the release checklist of
[§7.7](#77-site-validation-and-release-checklist); its JSON report
and traces are attached to the release record.

References:

- [HLDD §9 — Testing and release architecture](hldd.md#9-testing-and-release-architecture) (Browser tests — locally invoked release checks).
- [ADR-0015](../adr/0015-golden-scenario-parity.md) (second amendment of 2026-10-29).
- [HLDD §6.1 — Failure honesty (ADR-0010)](hldd.md#61-failure-honesty-adr-0010).
- [HLDD §7.3 — Delivery and caching](hldd.md#73-delivery-and-caching) (Existing-site integration).
- [PDD §9.2 — Browser and mobile baseline (D-16, Proposed)](pdd.md#92-browser-and-mobile-baseline-d-16-proposed).
- [PDD §9.3 — Accessibility target (D-17, Proposed)](pdd.md#93-accessibility-target-d-17-proposed).
- [PDD §10.2 — Golden scenarios](pdd.md#102-golden-scenarios).
- `subprojects/mkdocs/mkdocs.yml` (`site_url`).

### 7.6 Performance and compatibility measurements

The budgets are those of
[PDD §9.1 — Performance budgets (D-9, Proposed)](pdd.md#91-performance-budgets-d-9-proposed):
initial data payload ≤ 4 MB compressed; first meaningful render
≤ 2.0 s cold and repeat-visit render ≤ 1.0 s warm, each at the 95th
percentile; scenario change to updated results ≤ 200 ms at the 95th
percentile. The reference conditions are the PDD's, verbatim: "a
fixed reference environment standing in for a mid-range laptop (2020
or later) — a cloud virtual machine whose exact specification the DDD
fixes, so every measurement is reproducible — with a cold cache and
a 10 Mbps connection; and the same environment warm-cache for repeat
visits. Each time budget is judged at the 95th percentile of 30
measured runs."
[HLDD §7.1 — Performance estimates and verification](hldd.md#71-performance-estimates-and-verification)
delegates the benchmark procedure, representative scenarios,
repetition count (now the PDD's 30), and instrumentation to this
section, and its closing rule binds unchanged: if a measurement
fails a budget, the design is optimized and measured again, and a
budget is never "treated as satisfied merely because the data size
or one calculation step appears small enough".

**Reference environment.** PDD §9.1 leaves the specification to this
section, and
[HLDD §2 — Architectural constraints](hldd.md#2-architectural-constraints)
(Performance budgets) leaves it "the machine specification and the
run procedure"; this section registers both as
[DD-12](#1-ddd-decision-register) (Performance reference
environment), within the kind of environment that
[ADR-0016 — Performance reference environment — an on-demand AWS VM defined by Terraform](../adr/0016-performance-reference-environment.md)
records — an ADR still Proposed, whose acceptance, owner action
[OA-12](ip.md#4-owner-and-research-group-actions), precedes the
Terraform root of `perf/` and every reference run. The environment:
one Amazon EC2 instance in region `us-east-1`, instance type
`c6i.xlarge` (4 vCPU, 8 GiB, no CPU burst credits), running Ubuntu
Server 24.04 LTS for amd64 from a gp3 root volume of 30 GiB, under
the network conditions below. It is the project's agreed acceptance
baseline, a configuration anyone with the AWS account can recreate
from the repository; it has not been calibrated against laptops of
the class it stands in for, and its timings predict no particular
reader's machine. It is a reference configuration, not identical
processor time: a type without burst credits makes runs more
repeatable, but timings still vary from run to run, which is why
each budget is judged over 30 runs (Repetitions and judging, below).
The image is the default of the Terraform variable `ami_id`: an AMI
ID that the owner reads once, before T-59 completes
([OA-16](ip.md#4-owner-and-research-group-actions)), from Canonical's
SSM parameter
`/aws/service/canonical/ubuntu/server/24.04/stable/current/amd64/hvm/ebs-gp3/ami-id`
in `us-east-1` with the AWS profile named below, and changed only
by a deliberate commit. A run is
[SC-4 (performance)](pdd.md#101-success-criteria) evidence only when
its report (below) records `environment.kind` `aws-ec2` with
`instance_type` `c6i.xlarge`, `region` `us-east-1`, and `ami_id`
equal to that default at the run's `source_commit`, and `network`
with `latency` 40 and `downloadThroughput` and `uploadThroughput`
1250000 (Network, below); a run anywhere else, the development
workstation included, is a diagnostic and never budget evidence.

**Where the suite runs.** The measurement specs are the `measure`
project of the [§7.5](#75-browser-test-lane) lane, in the same
pinned Chromium. One Gradle task runs them in the reference
environment: `:subprojects:webapp:webappMeasureReference`, a
node-gradle `NodeTask` running `perf/run.mjs` with `args` `["run"]`
([§2](#2-repository-structure-naming-and-toolchain)), dependent on
`:subprojects:mkdocs:mkdocsPreview` and `npmCi`, owner-invoked, and
wired into no lifecycle task, no `check`, and no CI job. It is the
HLDD §7.1 feasibility measurement, taken against bytes built
locally from a clean tree — not part of the browser lane of the
second amendment of [ADR-0015](../adr/0015-golden-scenario-parity.md),
whose functional specs stay locally invoked, and no change to it.
The published-site run below is the measurement on the published
site that
[HLDD §7.3 — Delivery and caching](hldd.md#73-delivery-and-caching)
asks for, taken in this environment: it extends the lifecycle that
HLDD §2 and ADR-0016 describe for the locally built site, and
HLDD §2's "destroys it when the run succeeds" is read as ADR-0016
states it: the VM is destroyed once the measurement run has
completed — the measure run exiting 0 — and its report is
downloaded, whether the report records a budget pass or a budget
miss (step 7, below), and kept after an infrastructure, execution,
or report-retrieval failure; whether the budgets are met is a
separate release decision, taken on the report
([§7.7](#77-site-validation-and-release-checklist), item 5) —
readings that close with the owner's acceptance of this section
(DD-12).
`run.mjs` takes the one command line §2 defines,
`perf/run.mjs [run|destroy|ssh|status] [--dry-run]`, under the
runtime check §2 gives every invocation: `run` is the lifecycle
below; `destroy` is what
`:subprojects:webapp:webappMeasureDestroy` runs (`args`
`["destroy"]`); `ssh` reaches a kept VM (Access, below); and
`status` reports what the state holds (Self-termination and
cleanup, below). Both
tasks set the environment variable `TF_VAR_aws_profile` from the
Gradle property `egr.perf.awsProfile`, which Terraform reads as
`var.aws_profile`; with `-Pegr.perf.target=published`, the one value
that property accepts — any other fails the task when it executes,
with the message `egr.perf.target must be 'published' (got '<value>')`
that §2 fixes — `webappMeasureReference` also sets `EGR_BASE_URL` to
the `site_url` of `subprojects/mkdocs/mkdocs.yml`.
`run.mjs` checks the profile and `terraform` when the task executes
(step 1 below), never while Gradle configures the build script
([§6.3](#63-ci-workflows)).

The environment's Terraform root is `subprojects/webapp/perf/`
(`versions.tf`, `main.tf`, `variables.tf`, `outputs.tf`, the
committed `.terraform.lock.hcl`, `cloud-init.yaml`, `run.mjs`, and
`README.md`; the Terraform pin and the `hashicorp/aws` and
`hashicorp/tls` provider pins are §2's). It is separate from the
parked Athena/Glue/S3 data layer of `deploy/terraform/`, which stays
parked and untouched: it never references that tree and shares no
module, state, backend, or Gradle task with it. Its state is local;
the root `.gitignore` rules `**/.terraform/`, `*.tfstate`, and
`*.tfstate.*` already ignore `subprojects/webapp/perf/.terraform/`
and `subprojects/webapp/perf/terraform.tfstate*`, so no entry is
added, and the lock file stays committed. The `aws` provider uses
`region = "us-east-1"` and `profile = var.aws_profile`, the AWS profile
the owner names in `egr.perf.awsProfile` (set in
`~/.gradle/gradle.properties`, never committed); that profile must be
allowed, in `us-east-1`, the EC2 actions Terraform calls on the
resources below — `ec2:RunInstances`, `ec2:TerminateInstances`,
`ec2:ModifyInstanceAttribute`, and `ec2:ModifyInstanceMetadataOptions`
for the instance; `ec2:ImportKeyPair` and `ec2:DeleteKeyPair` for the
key pair; `ec2:CreateSecurityGroup`, `ec2:DeleteSecurityGroup`,
`ec2:AuthorizeSecurityGroupIngress`, `ec2:RevokeSecurityGroupIngress`,
`ec2:AuthorizeSecurityGroupEgress`, and `ec2:RevokeSecurityGroupEgress`
for the security group and its rules; `ec2:CreateTags` and
`ec2:DeleteTags` for the instance's tags; and the read-only
`ec2:Describe*` actions, with which Terraform reads those resources and
the images, VPCs, subnets, volumes, instance types, and account
attributes it resolves for them — and `ssm:GetParameter` on Canonical's
public parameter above, under the parameter path
`/aws/service/canonical/`, which OA-16 reads. In the account's default
VPC, `main.tf` declares:

- a `tls_private_key` with `algorithm = "ED25519"` and an
  `aws_key_pair` from its `public_key_openssh` — created once per
  VM lifetime and left unchanged by a re-apply, so an existing VM is
  reused;
- an `aws_security_group` admitting tcp/22 only from
  `var.operator_cidr` — the operator's current public IP as a /32,
  which `run.mjs` reads from `https://checkip.amazonaws.com` — with
  egress open;
- an `aws_instance` of the registered type and image with
  `key_name` from that key pair, `vpc_security_group_ids` holding
  that security group's `id`, `root_block_device` gp3 of 30 GiB
  with `delete_on_termination = true`,
  `instance_initiated_shutdown_behavior = "terminate"`,
  `metadata_options { http_tokens = "required" }`, `user_data` from
  `cloud-init.yaml` with `user_data_replace_on_change = true`, and
  the tags `Project=eps-ground-rupture`, `Purpose=perf-reference`,
  and `ManagedBy=terraform`;
- the outputs `instance_id`, `public_ip`, and the sensitive
  `ssh_private_key`, the key's `private_key_openssh`.

**Access.** No persistent SSH credential is intentionally stored
outside Terraform's own local state: no file in `~/.ssh`, no
committed key, and no `~/.ssh/known_hosts` entry. The private key
lives in `subprojects/webapp/perf/terraform.tfstate` from the apply
that creates its VM until a `terraform destroy` removes both — at
the end of a completed run (step 7), by `webappMeasureDestroy`, or,
after the VM terminated itself, at the start of the next run
(step 2) — so no key ever opens a second VM; `tls_private_key` keeps
it unencrypted there, which is acceptable for a local credential to
a VM that holds only public data and whose running time the 24-hour
shutdown below bounds on a best-effort basis. The state, its backup
`terraform.tfstate.backup`, any saved plan, and the temporary key
files are sensitive, and being gitignored is not what protects
them: `run.mjs` never prints key or state content, and the report
directory of step 6, which the release record attaches, holds none
of them.
A `terraform destroy` leaves the last private key in
`terraform.tfstate.backup`, which then holds the state as it stood
before the destroy, so after every destroy that exits 0 — those of steps
2, 3, and 7 and of the `destroy` subcommand — `run.mjs` deletes that
file when it exists, since it records only resources that are gone;
until then it is as sensitive as the state.
Each `run.mjs` invocation that connects writes the output of
`terraform output -raw ssh_private_key` to a key file of mode 0600 in
a fresh `mkdtemp` directory, calls `ssh` and `scp` as `ubuntu` on
`public_ip` with the options `-i <key>`, `-o IdentitiesOnly=yes`,
`-o UserKnownHostsFile=<dir>/known_hosts`, and
`-o StrictHostKeyChecking=accept-new`, and deletes the directory in
a `finally` block. A VM kept after a failed run is reached with
`node perf/run.mjs ssh`, run in `subprojects/webapp` in the form of
Node.js outside Gradle of
[§2](#2-repository-structure-naming-and-toolchain), which extracts
the key the same way, opens an interactive session, and deletes the
key afterwards.

At first boot `cloud-init.yaml` schedules `shutdown -h +1440`, so a
VM that a failed run kept or an interrupted run left terminates
itself after 24 hours — terminates rather than stops, because
`main.tf` sets `instance_initiated_shutdown_behavior = "terminate"`
and `delete_on_termination = true` explicitly, EC2 stopping an
EBS-backed instance on shutdown by default — a best-effort bound on
its running time, not a cleanup (Self-termination and cleanup,
below); installs the `xvfb` package; and installs Node.js 22.12.0,
the §2 runtime pin, from
`https://nodejs.org/dist/v22.12.0/node-v22.12.0-linux-x64.tar.xz`,
checked against that release's `SHASUMS256.txt`, with `node`, `npm`,
and `npx` on the default `PATH`. A change of the §2 runtime pin
changes this file in the same commit.

**Self-termination and cleanup.** The 24-hour shutdown and the
environment's removal are separate events. The shutdown removes the
instance and, through `delete_on_termination = true`, its root volume,
and nothing else: the key pair and the security group, which cost
nothing, and the local state, with the private key, remain until a
`terraform destroy` removes them — `webappMeasureDestroy` at any time,
or the next `run` (steps 2 and 7). A run interrupted before step 7,
its `run.mjs` process stopped, leaves all of them in place, its instance
running until the shutdown. No subcommand infers from a termination that
the state is empty or reconciled: `run` (step 2) and `status` refresh
first. `status` runs `terraform state list`; when that prints anything,
it refreshes without saving, with
`terraform plan -refresh-only -input=false -out=<dir>/status.tfplan` and
`terraform show -json <dir>/status.tfplan`, `<dir>` being a fresh
`mkdtemp` directory deleted in a `finally` block, since a saved plan
holds the state and its key. It prints one line per address that
`terraform state list` printed, the `aws_instance` line followed by a
space and the instance's EC2 state — its `instance_state` in the plan's
`prior_state`, the refreshed state, or `terminated` when the refreshed
state no longer holds it — and nothing else from the plan; an empty
state prints `state empty`. It changes no AWS object and no state.
Before the first apply there is no `terraform.tfstate`, and
`terraform state list` exits 1 with `No state file was found!` on its
standard error: `run.mjs` reads exactly that exit as an empty state, in
`run` and in `status` alike — step 2 then goes straight to its
create-or-reconcile apply, and `status` prints `state empty` — and any
other non-zero exit of `terraform state list` as a failure that ends the
subcommand non-zero.

**Terraform commands.** One function of `run.mjs` builds every
`terraform` command that a subcommand runs, or prints under `--dry-run`,
each in `subprojects/webapp/perf/`, and supplies the two variables of
`variables.tf` that have no default. `aws_profile` reaches every command
from the environment, as `TF_VAR_aws_profile`, which Terraform reads
itself. `operator_cidr` is one `-var` argument that the function adds to
every `terraform apply`, `terraform destroy`, and `terraform plan`, and
to no other command. On the create-or-reconcile apply of step 2, and
only there, it is `-var operator_cidr=<ip>/32`, `<ip>` being the
operator's public IP, which `run.mjs` reads from
`https://checkip.amazonaws.com` just before that apply; a failed lookup
ends the run, non-zero, before the apply, and `--dry-run`, which looks
nothing up, prints `<ip>` itself. On the refresh-only apply, on every
destroy — steps 2, 3, and 7 and the `destroy` subcommand — and on the
plan of `status`, it is the placeholder
`-var operator_cidr=192.0.2.1/32`, an address of TEST-NET-1, which
RFC 5737 reserves for documentation, and `run.mjs` looks up no IP for
them: none depends on the rule's value, because a refresh-only apply or
plan changes no AWS object and a destroy deletes the objects the state
records whatever the variables say, so `destroy` works when the lookup
would fail.

`webappMeasureReference` creates the VM if it does not exist, runs
the suite, and destroys the VM once the measurement run has
completed and its report is downloaded (step 7). `run.mjs` uses
only Node.js built-ins and the `terraform`, `ssh`, `scp`, `tar`,
and `git` commands; its `run` subcommand works in these steps:

1. **Preconditions.** It refuses unless
   `git status --porcelain=v1 --untracked-files=all`, run at the
   repository root, prints nothing — the clean-tree command of
   [§4.1](#41-export-task-and-validation) step 1 without its
   exclusion of `subprojects/webapp/data/pointer.json`, because a
   measured tree carries the committed pointer;
   `terraform version -json` reports a version within the §2
   constraint; `TF_VAR_aws_profile` is set and non-empty; and
   `subprojects/mkdocs/site-preview/` exists.
2. **Create or reconcile.** In `subprojects/webapp/perf/`:
   `terraform init -input=false`; then, when `terraform state list`
   prints anything — resources an earlier run left —
   `terraform apply -refresh-only -auto-approve -input=false` and
   `terraform state list` again, then reports the leftover it found and
   what it does with it: when the refreshed state names a
   `tls_private_key` but no `aws_instance` — a VM that terminated
   itself, or an apply stopped before the instance existed —
   `terraform destroy -auto-approve -input=false`, so every VM gets a
   new key; when it names an `aws_instance` — a VM that a failed run
   kept or an interrupted run left — no destroy, so the apply below
   reuses it unless step 3's 20-hour rule replaces it. Then
   `terraform apply -auto-approve -input=false`, the create-or-reconcile
   apply of Terraform commands (above), the one command that carries the
   operator's IP. The VM is created when it does not exist and otherwise
   reconciled in place: the key stays unchanged, so an existing VM is
   kept, and a changed operator IP updates only the security-group rule.
3. **Wait.** Over `ssh` (Access, above) it runs
   `cloud-init status --wait`, then reads the VM's seconds since boot,
   the first field of `/proc/uptime`. The retry, every 5 s for up to 5
   minutes, covers only establishing the SSH connection: an `ssh` call
   with the remote command `true`, repeated until one exits 0;
   `cloud-init status --wait` then runs once, as
   `timeout 900 cloud-init status --wait`, its own limit of 15 minutes;
   and no connection within the 5 minutes, or a non-zero exit of that
   command — a cloud-init error, or 124 when the limit is reached —
   fails step 3, which keeps the VM as every failure of steps 3–6 does
   (step 7). A VM up more than 72,000 s (20 hours) would reach the
   24-hour shutdown above within a run, so `run.mjs` destroys it with
   `terraform destroy -auto-approve -input=false` and repeats steps 2
   and 3 once, on a new VM.
4. **Upload.** A payload tarball keeping the repository-relative
   paths — `subprojects/mkdocs/site-preview/`,
   `subprojects/mkdocs/mkdocs.yml`, and the webapp files the
   `measure` project needs: `package.json`, `package-lock.json`,
   `playwright.config.ts`, `playwright/`, `tsconfig*.json`, and the
   `src/` files the measure specs import (`src/stats/quantile.ts`
   and its imports) — is copied with `scp` and unpacked into a fresh
   `~/egr/` on the VM, replacing any earlier payload.
5. **Run.** In `~/egr/subprojects/webapp` on the VM: `npm ci`; then
   `npx playwright install --with-deps chromium` (the build the
   lockfile's `@playwright/test` pins); then
   `xvfb-run -a npx playwright test --project=measure --workers=1`,
   whose `webServer` entries serve the uploaded `site-preview/` with
   `playwright/serve.mjs` ([§7.5](#75-browser-test-lane)). The run
   receives `EGR_PERF_RUN_ID`, `EGR_SOURCE_COMMIT`,
   `EGR_SOURCE_TREE_CLEAN`, and `EGR_TERRAFORM_VERSION` — the
   `terraform_version` that `terraform version -json` reported in
   step 1 (Report, below) — and `EGR_BASE_URL` when the task set it.
6. **Download.** The VM's `subprojects/webapp/build/measure/`
   directory is copied to `subprojects/webapp/build/perf/<run_id>/`,
   where `<run_id>` is `<UTC timestamp>-<short sha>`: the task's
   start time as `YYYYMMDDTHHMMSSZ`, a hyphen, and the output of
   `git rev-parse --short=12 HEAD`.
   The copy adds no `measure/` level: the report is
   `subprojects/webapp/build/perf/<run_id>/report.json`, and beside it
   the directory holds only the traces of the extra repetitions, one per
   measured workload (Repetitions and judging).
7. **Destroy or keep.** If steps 3–6 all succeeded — the measure run
   of step 5 exiting 0 among them —
   `terraform destroy -auto-approve -input=false`. If any of steps
   3–6 failed, a failed download after a passing measure run
   included, the VM is kept for diagnosis: the task prints its
   instance ID, its public IP, the `ssh` command of Access (above),
   its self-termination time 24 hours after first boot, and the
   destroy command
   `./gradlew :subprojects:webapp:webappMeasureDestroy`, with the
   note that the key pair, the security group, and the state outlast
   the self-termination until that command runs, then exits non-zero.
   If the destroy of a run whose steps 3–6 all succeeded fails,
   `run.mjs` ends as after a failure — the kept-VM lines above, from
   what the state still records, the `webappMeasureDestroy` command
   among them, and a non-zero exit — but the run has completed, its
   measure run having exited 0 and its report downloaded, and that
   report stays valid, for item 5 of the release checklist
   ([§7.7](#77-site-validation-and-release-checklist)) once that command
   has destroyed the VM.

`webappMeasureDestroy` runs `run.mjs destroy`:
`terraform destroy -auto-approve -input=false` with the placeholder
`operator_cidr` and no IP lookup (Terraform commands, above), which
removes every resource the state records, the key among them, and
succeeds as well when the instance has already terminated itself.
The published-site
run is `webappMeasureReference` with `-Pegr.perf.target=published`,
whose `EGR_BASE_URL` reaches the VM-side run of step 5; the specs
measure `EGR_BASE_URL` when it is set and the lane's `BASE_URL`
otherwise. That run follows each release's deployment, beginning
with the deployment of the release that activates the page
([§6.1](#61-build-outputs-asset-paths-and-page-scaffold)); the
deployments of the unlisted prototype are not releases. A run of the
`measure` project anywhere else — such as
`npx playwright test --project=measure --workers=1` on a
workstation, after `./gradlew :subprojects:webapp:playwrightInstall`
and in the form of Node.js outside Gradle of §2 — writes the same
report, as a diagnostic, and no Gradle task runs it.

**Network.** For every measured page the spec opens a Chrome
DevTools Protocol session before the first navigation and sends
`Network.enable`, then `Network.emulateNetworkConditions` with
`offline: false`, `latency: 40`, and `downloadThroughput` and
`uploadThroughput` of 1,250,000 bytes/s (10 Mbit/s). The throughput
is PDD §9.1's 10 Mbps; the 40 ms is the project's choice, taken from
the round-trip time of the Chrome DevTools and Lighthouse desktop
"broadband" profile `desktopDense4G` (`rttMs: 40`,
`throughputKbps: 10 * 1024` in
`front_end/models/trace/lantern/simulation/Constants.ts` of
ChromeDevTools/devtools-frontend), whose own request-latency and
throughput-emulation fields are 0, so these two values do not
reproduce that whole profile. The latency is fixed, not measured,
because the VM may sit close to the CDN, where a measured round trip
could flatter the result; the fixed emulation standardizes the
condition without removing all real network variation, and the
published-site run applies the same emulation.

**Cache.** Cold is a fresh browser context per repetition. Warm is a
repeat visit, never `page.reload()`: after the cold load the spec
closes the page and opens the URL with `page.goto` in a new page of
the same context. Warm runs in two variants, each judged against the
warm budget: *fresh*, within the host's max-age (the port-4173
server, `max-age=600`); and *revalidating*, every request answered
304 (the port-4174 server, `--max-age 0`) — the repeat visit more
than ten minutes later on this host. Each warm repetition asserts
from CDP `Network.responseReceived` that every content-hashed asset
came from the disk or memory cache or with status 304; a
re-downloaded content-hashed asset invalidates the repetition and
fails the run. The revalidating variant runs only against the
served preview tree, because the live host's max-age cannot be
shortened.

**Workloads.** Load workloads measure the state the page opens
with — the [§5.7](#57-scenario-controls) all-default scenario, whose
expected results are [GS-0](pdd.md#102-golden-scenarios)'s — cold and
warm. Interaction workloads measure three transitions, satisfying
HLDD §7.1's "Include the full-ensemble scenario and other
representative workloads". Each repetition opens a fresh page in a
warm context, performs the scripted setup, then makes the measured
change, so every sample includes first-interaction costs:

- into GS-0 — the Reset action taken from the state of
  [GS-1](pdd.md#102-golden-scenarios) (US-1: dips {30°, 40°},
  Strong (uniform and layered), offset mode 3 m), the full-ensemble
  recompute;
- into GS-1 — with the GS-1 dips and pairs selected and offset mode
  entered as setup, the offset entry `3` committed with Enter: the
  conversion path; and
- into [GS-6](pdd.md#102-golden-scenarios) (Slip window 0–0.04 m,
  all other controls default) — the slip maximum `0.04` committed
  with Enter: the stride scan and the two-count notice path.

The measured action is always the single accepted control change
that completes the scenario; the preceding changes are setup.

**Repetitions and judging.** Every workload repeats 30 times, and
each time budget is judged at the 95th percentile of its 30 measured
repetitions: at most 2.0 s for the cold load, 1.0 s for each warm
variant, and 200 ms for each interaction workload. The percentile is
the nearest-rank 95th percentile, `sorted[28]`, the 29th of the 30
ascending samples, so that a workload meets its time budget exactly
when at least 29 of its 30 runs are within it — HLDD §2's "for at
least 95% of measured interactions" — inside the sample rather than
its single maximum. It is a sample-based acceptance rule: it says
that the 30 observed runs met the budget, not that later runs will,
and it does not presume that an isolated slow run is noise. The
payload budget is not a time budget: every cold repetition's data
figure (Payload scope, below) is at most 4 MB (4,000,000 B). Every
workload reports minimum, median
(`quantileLinear(sorted, 0.5)` of `src/stats/quantile.ts`,
[§5.4](#54-statistics)), 95th percentile (`sorted[28]`), and
maximum. After its 30 measured repetitions each workload runs one
extra repetition with tracing on, excluded from the statistics,
whose trace the report
directory keeps as replayable evidence. The suite records the
judgment and never enforces it: a budget miss leaves the measure
run's exit status 0, so the VM is destroyed with the report safely
downloaded, and item 5 of the release checklist
([§7.7](#77-site-validation-and-release-checklist)) judges the
release from the report's `within_budget` values (Report, below).
The run fails — exits non-zero — only on an invalid repetition or a
failed assertion: a mark with `detail.visible === false`, a
re-downloaded content-hashed asset, a failed standing assertion of
the payload scope, or a header drift on the published-site run.

**Instrumentation.** Five named marks ship with the application and
are read by the specs through the User Timing API
(`performance.mark`, backed by `performance.now()`); the first three
carry as `detail.seq` the [§5.3](#53-query-engine) sequence number
of the Scenario whose change or result they mark:

- `egr:first-result` — recorded by `markAfterPaint` after the first
  commit, when the first-meaningful-render condition of
  [PDD §9.1 — Performance budgets (D-9, Proposed)](pdd.md#91-performance-budgets-d-9-proposed)
  holds: "the results for the scenario the page opens with are on
  screen: for the measurement shown on load, its statistics table and
  its chart in the view the panel opens with", with the PDD's
  stand-ins where the chart is suppressed or no record matches. First
  meaningful render is this mark's `startTime` from the navigation's
  time origin.
- `egr:change-accepted` —
  `performance.mark('egr:change-accepted', { startTime: event.timeStamp, detail: { seq } })`
  in the handler that accepts a scenario change, right after
  `update(next)` returns `seq` ([§5.7](#57-scenario-controls)), so
  input delay is included.
- `egr:results-updated` — recorded by `markAfterPaint` after the
  commit of the corresponding results update, so the interval ends
  when results are "visibly updated" and any scheduled or background
  execution "remains part of the measured interval"
  ([HLDD §7.1 — Performance estimates and verification](hldd.md#71-performance-estimates-and-verification),
  What the timing measurement includes). The interaction interval is
  `egr:results-updated` minus `egr:change-accepted`, paired by
  `detail.seq`: the suite reads the measured change's
  `egr:change-accepted` and waits for the `egr:results-updated` with
  the same `detail.seq`, never pairing by name or order alone.
- `egr:decode-start` and `egr:decode-end` — recorded by the loader
  ([§5.2](#52-artifact-loading-and-decoding)) immediately before the
  artifact fetch and after the typed-array views are constructed.
  Their difference is the load sample's `decodeMs`: the download and
  decompression cost of the selected gzip encoding, measured
  separately from first render
  ([HLDD §7.3 — Delivery and caching](hldd.md#73-delivery-and-caching),
  Pre-compressed simulation data).

`markAfterPaint(name, seq, check, live)` (`src/views/dom/marks.ts`,
browser only) is called inside the [§5.3](#53-query-engine)
scheduler's frame callback right after the commit, `seq` the
committed result's sequence number; it posts a `MessageChannel`
message and, in that message's task, records
`performance.mark(name, { detail: { seq, visible: check() } })` if
`live()` — §5.3 item 2's `isLatest(seq)` — is true, and nothing
otherwise. For the first commit, which `src/main.ts` makes outside
the scheduler as sequence number 0, it first requests one animation
frame and posts from there. Either way
the mark lands in the first task after the rendering update — style,
layout, paint — of the frame that contains the commit: an upper bound
on main-thread paint, never earlier; compositor presentation cannot
be observed in the page and is not claimed. `check()` returns true
when the first panel's statistics `<table>` and chart `<svg>` — or
the notice standing in for the chart, or `#gre-state` when no record
matches — are connected with a non-zero `getBoundingClientRect()`
area; for `egr:first-result` they must also intersect the viewport. A
repetition whose mark carries `detail.visible === false` fails. In a
browser without `MessageChannel` or the User Timing Level 3 options
object, `markAfterPaint` records nothing and never throws: the marks
are measurement aids, read only by these specs and by the
rapid-change drive of `a11y.spec.ts` ([§7.5](#75-browser-test-lane))
in the pinned Chromium, and never change what a reader sees.

**Payload scope.** The scope is
[HLDD §7.1 — Performance estimates and verification](hldd.md#71-performance-estimates-and-verification)
(What the payload measurement includes), transcribed: the data
budget covers "all data required to produce the initial scenario
result: the scenario artifact, artifact manifest, regression
export, and any other data loaded initially"; the end-to-end
loading measurement "also includes the page, application
JavaScript, stylesheets, and other resources needed to display that
result". The suite measures compressed bytes exactly as served —
the sum of the CDP per-request `encodedDataLength` over every request
of the load — and itemizes every file in the report. The data figure
adds the regression export's stored size although the page loads it
only on first entry into offset mode
([§5.2](#52-artifact-loading-and-decoding)), because the HLDD scope
names it. Two standing assertions ride along: the page never
requests the reference-results file ("Reference results are inputs
to tests, not normal browser operation, and must not be downloaded
by the page"), and no optional field-data or media request precedes
`egr:first-result` ("Optional field data and media should not delay
the initial simulation result").

**Bundle and host headers.** The load samples' itemized payload
gives the bundle's and the stylesheet's compressed sizes as served,
which [§3.8](#38-measured-sizes) records from the reports (its
pending item 4), never by hand. The published-site run records the
headers of every same-origin response under `BASE_PATH` —
a cross-origin response, such as the theme's Google Fonts files,
is another host's — and asserts that, per file class (`.html`,
`.js`, `.css`, `.json`, `.xml`, `.svg`, `.gz`, other), the observed
`Cache-Control`, `Content-Encoding`, `Vary`, and `Content-Type`
values and the presence of `ETag` and `Last-Modified` equal what
`serve.mjs` sends for the same request; a drift fails the run,
because the local runs are budget evidence only while `serve.mjs`
mirrors the host — "Warm-cache performance must not depend on cache
settings that the hosting arrangement cannot provide"
([HLDD §7.3 — Delivery and caching](hldd.md#73-delivery-and-caching),
Content-hashed assets). The published-site run must also meet the
cold and fresh-warm budgets, which item 5 (b) of the release
checklist judges from its report; a miss reopens the release under
the HLDD §7.1 rule to optimize and measure again.

**Browser compatibility.**
[HLDD §7.2 — Accessibility and supported environments](hldd.md#72-accessibility-and-supported-environments)
(Browser compatibility) rules that a general language-level label
"is not sufficient". Three kinds of evidence answer it, reported
separately:

1. **Build-output syntax.** esbuild emits with the ES2020 target of
   [§2](#2-repository-structure-naming-and-toolchain) and fails the
   build on any construct it cannot lower to that target, so the
   shipped bundle's syntax is checked by construction on every
   build.
2. **Documented API availability.** `test/compat.test.ts` — part of
   `webappTest`, so it runs in CI — checks every row of the
   required-API inventory below, kept in `test/compat-inventory.ts`,
   against the baseline of
   [PDD §9.2 — Browser and mobile baseline (D-16, Proposed)](pdd.md#92-browser-and-mobile-baseline-d-16-proposed),
   quoted: "Evergreen Chrome, Edge, Firefox, and Safari versions
   released within 24 months of each product release; iOS Safari
   and Android Chrome in the same window; no legacy-browser
   support." The dataset is `caniuse-lite`, a development dependency
   pinned at exactly `1.0.30001687` in `package.json` beside the §2
   pins; it is a dataset, not a toolchain, and affects neither the
   bundle nor the build, so under §2's rule it needs no ADR, and its
   missing type declarations are supplied by §2's
   `test/caniuse-lite.d.ts`. The 24-month window ends at the newest
   browser release date in the pinned dataset, so a commit's result
   never depends on the calendar date. An older dataset checks older
   browser versions than a release needs, which is conservative,
   until a release's own 24-month window starts after the dataset's
   newest browser release; before such a release the dataset is
   upgraded, under [ADR-0011](../adr/0011-webapp-toolchain.md)
   review (item 1 of the release checklist,
   [§7.7](#77-site-validation-and-release-checklist)). Android
   Chrome, for which the dataset holds only the latest version, maps
   to the desktop `chrome` versions released in the window
   (browserslist's mobile-to-desktop convention). The test fails if
   any required API is unsupported in any baseline browser's oldest
   in-window version, or if a baseline browser has no in-window
   version. Partial support (`a`) counts as unsupported unless an
   explicit row records why the surface the application uses is
   supported. Absence is never a pass: an API the dataset does not
   catalog carries an explicit support row in the inventory, its
   source recorded beside it and re-reviewed at every dataset
   upgrade, and a required API with neither dataset coverage nor an
   explicit row fails the check. Every run prints the dataset
   version, the window's end date, and the Android mapping. This
   evidence is documentary: the test executes nothing in Firefox,
   Safari, or a mobile browser.
3. **Executed compatibility.** The [§7.5](#75-browser-test-lane) lane
   executes the application in one engine, its pinned Chromium, at a
   desktop viewport and at the 360 px floor under Chromium mobile
   emulation — which is not Firefox, not Safari, and not a mobile
   browser.

Executed confirmation on the remaining baseline engines and on mobile
browsers — the
[R-19](prd.md#94-delivery-and-technical-risks) (The static-site
constraint prohibits server-side computation.) check that
[HLDD §10 — Risks and open dependencies](hldd.md#10-risks-and-open-dependencies)
(Performance and delivery risks) assigns to the owner — is the manual
pass of item 15 of the release checklist of
[§7.7](#77-site-validation-and-release-checklist); representative
assistive-technology use is its item 14, per
[HLDD §7.2 — Accessibility and supported environments](hldd.md#72-accessibility-and-supported-environments).

The required-API inventory — every runtime API the application
calls whose availability the ES2020 syntax target cannot vouch
for — is reviewed with any change to `src/`; calling a new runtime
API without adding its row is a defect. At startup the
[§5.10](#510-failure-states) capability probe feature-tests the
rows without which no result can be loaded, shown, or downloaded —
§5.10 names its tests and their order — and leaves out three
surfaces, whose rows are documented availability only:
`MessageChannel` and the User Timing Level 3 options object, which
serve measurement alone, and the `signal` option of
`addEventListener`, which has no type to test.

| API | Used by |
|---|---|
| `fetch` | The [§5.2](#52-artifact-loading-and-decoding) loader — all pinned files. |
| `ReadableStream` with `pipeThrough` | [§5.2](#52-artifact-loading-and-decoding) — the decompression pipe. |
| `DecompressionStream` (`"gzip"`) | [§5.2](#52-artifact-loading-and-decoding) — decoding the pre-compressed artifact ([HLDD §7.3 — Delivery and caching](hldd.md#73-delivery-and-caching), Pre-compressed simulation data), which requires "support for the selected compression format throughout the supported browser baseline" to be verified — the one API called out there by name. The pinned dataset does not catalog Compression Streams, so it carries an explicit row: Chrome 80, Edge 80, Firefox 113, Safari 16.4, iOS Safari 16.4, Android Chrome 80 (source: MDN browser-compat-data `api/DecompressionStream.json`, recorded beside the row). |
| `TextDecoder` | [§5.2](#52-artifact-loading-and-decoding) — text from decompressed bytes. |
| `TextEncoder` | [§5.9](#59-downloads) — the UTF-8 bytes of the download members. |
| Typed arrays and `DataView` | [§5.2](#52-artifact-loading-and-decoding) — the [§3.1](#31-scenario-artifact-binary-layout) block views (library surface rather than syntax, so listed despite predating the target). |
| `Blob`, `URL.createObjectURL`, and `URL.revokeObjectURL`, with the anchor `download` attribute | [§5.9](#59-downloads) downloads — each object URL revoked when the next is created or the mount aborts. |
| `URL` (constructor) | [§5.11](#511-accessibility-supported-environments-and-navigation-lifecycle) — resolving `data-manifest` against the bundle's URL. |
| `ResizeObserver` | [§5.12](#512-charts) — one observer per panel re-renders its chart on width change. |
| `AbortController`, and `addEventListener` with the `signal` option | [§5.11](#511-accessibility-supported-environments-and-navigation-lifecycle) — every listener registers with the per-mount controller's signal. The `signal` option is a separate surface with an explicit row from MDN browser-compat-data (`api/EventTarget.json`, `addEventListener`, `signal` option), its versions recorded beside the row; §5.10 probes `AbortController`, never the option. |
| `requestAnimationFrame` and `cancelAnimationFrame` | [§5.3](#53-query-engine) — the per-mount frame scheduler, cancelled on abort; `markAfterPaint`. |
| `Element.replaceChildren` | [§5.8](#58-view-layer) — the first render and every replaced slot commit with it. `caniuse-lite` does not catalog it, so it carries an explicit row (supported from Chrome/Edge 86, Firefox 78, Safari 14 — ahead of every baseline window; source recorded beside the row, re-reviewed at every dataset upgrade). |
| `MessageChannel` | `markAfterPaint` — the instrumentation above only; not probed (§5.10). |
| `performance.mark` | The instrumentation above, the [§5.2](#52-artifact-loading-and-decoding) decode marks included; probed (§5.10), because the loader records those marks unconditionally. |
| The User Timing Level 3 options object of `performance.mark` (`detail`, `startTime`) | The instrumentation above; a separate surface from `performance.mark` itself, with an explicit row from MDN browser-compat-data (`api/Performance.json`, `mark`, options parameter), its versions recorded beside the row; not probed (§5.10). |

The MVP ships no `<dialog>` element and no other post-baseline
element: the views use native sectioning and form elements
([DD-4](#1-ddd-decision-register); [§5.7](#57-scenario-controls),
[§5.8](#58-view-layer)), so none joins the inventory.

**Report.** Every run writes
`subprojects/webapp/build/measure/report.json` (gitignored by the
root `build/` rule), beside the traces of the extra repetitions,
with:

- `environment` — `kind`, `instance_type`, `ami_id`, `region`,
  `kernel`, `chromium_version`, `node_version`, `terraform_version`,
  and `run_id`. When the EC2 instance metadata service answers
  within 2 s — a token
  from `PUT http://169.254.169.254/latest/api/token` (IMDSv2), then
  `latest/meta-data/instance-type`, `latest/meta-data/ami-id`, and
  `latest/meta-data/placement/region` — `kind` is `aws-ec2` and
  those three fields come from it; otherwise `kind` is `other` and
  they are null. `kernel` is Node's `os.release()`,
  `chromium_version` Playwright's `browser.version()`,
  `node_version` `process.version`, `terraform_version` the value of
  `EGR_TERRAFORM_VERSION`, the CLI that created the VM, and `run_id`
  the value of `EGR_PERF_RUN_ID`, each null when unset;
- `software_version` and `data_version` — the
  `data-software-version` and `data-data-version` of the measured
  page's `#gre-app` ([§6.2](#62-software-and-data-version-stamps));
- `bundle` — `js` and `css`, each `{url, sha256}`, for the
  `app-<hash>.js` and the `app-<hash>.css` of
  [§6.1](#61-build-outputs-asset-paths-and-page-scaffold) that the
  first `load-cold` repetition requested: the request's URL and the
  full lowercase hexadecimal SHA-256 of its response body, decoded,
  as Playwright's `response.body()` returns it — the build identity
  that the evidence ledger of
  [§7.7](#77-site-validation-and-release-checklist) compares;
- `source_commit` (40 hex digits) and `source_tree_clean` — the
  values of `EGR_SOURCE_COMMIT` and `EGR_SOURCE_TREE_CLEAN`, which
  `run.mjs` sets from `git rev-parse HEAD` and its step-1 clean-tree
  check, null when unset;
- `base_url` and `network` — the emulated `latency`,
  `downloadThroughput`, and `uploadThroughput`;
- `workloads` — an array with one object per workload the run
  measures, in the order of Workloads above: `id` (`load-cold`,
  `load-warm-fresh`, `load-warm-revalidating`, `into-gs0`,
  `into-gs1`, or `into-gs6`); `budget_ms`; `samples`, its 30
  measured repetitions in run order, each an object with `ms` and,
  for a load workload, `decodeMs`, `data_bytes` (the data figure of
  Payload scope), and `files`, the itemized payload, one
  `{url, encoded_bytes}` per request; `min_ms`, `median_ms`,
  `p95_ms` (the nearest-rank `sorted[28]` of Repetitions and
  judging), and `max_ms`; and `within_budget`, true exactly when
  `p95_ms` is at most `budget_ms` and, for `load-cold`, every
  sample's `data_bytes` is at most 4,000,000;
- `headers`, on the published-site run only — the header sets per
  file class, as observed and as `serve.mjs` sends them.

These fields are the identification
[HLDD §7.1 — Performance estimates and verification](hldd.md#71-performance-estimates-and-verification)
requires ("the tested browser, device, application version, and
data vintage") plus the revision the evidence ledger of
[§7.7](#77-site-validation-and-release-checklist) records. Nothing
generated is committed: [§3.8](#38-measured-sizes) takes from the
reports the served sizes its pending items need — the artifact
manifest's (item 1), the compressed half of item 2, and the bundle,
stylesheet, and payload total of item 4 — and the release checklist
attaches the release runs' report directories to the release
record.

*Closes:* DD-12. *Verification (planned):* each report's
`environment` fields, read from the EC2 instance metadata service,
and its `network` values identify the DD-12 environment, and item 5
of the release checklist accepts only a report whose fields equal
it (T-59, T-61); T-59's drill with stand-in `terraform` and `ssh`
executables on `PATH` exercises the destroy-or-keep rule of step 7,
the `operator_cidr` each Terraform command carries, a missing state
file read as an empty state, and the read-only `status`;
the release runs' reports enter [§3.8](#38-measured-sizes) and the
release record of [§7.7](#77-site-validation-and-release-checklist)
(items 5 and 15), with browser, device, version, and vintage named;
`compat.test.ts` runs in the **Webapp checks** steps of
[§6.3](#63-ci-workflows) on every matching trigger.

References:

- [HLDD §2 — Architectural constraints](hldd.md#2-architectural-constraints) (Performance budgets, amended 2026-10-30).
- [HLDD §7.1 — Performance estimates and verification](hldd.md#71-performance-estimates-and-verification) (What the payload measurement includes; What the timing measurement includes).
- [HLDD §7.2 — Accessibility and supported environments](hldd.md#72-accessibility-and-supported-environments) (Browser compatibility).
- [HLDD §7.3 — Delivery and caching](hldd.md#73-delivery-and-caching) (Content-hashed assets; Pre-compressed simulation data).
- [PDD §9.1 — Performance budgets (D-9, Proposed)](pdd.md#91-performance-budgets-d-9-proposed).
- [PDD §9.2 — Browser and mobile baseline (D-16, Proposed)](pdd.md#92-browser-and-mobile-baseline-d-16-proposed).
- [PDD §10.2 — Golden scenarios](pdd.md#102-golden-scenarios).
- [HLDD §10 — Risks and open dependencies](hldd.md#10-risks-and-open-dependencies) (Performance and delivery risks).
- [ADR-0016](../adr/0016-performance-reference-environment.md)
  (Proposed: the reference environment and its toolchain);
  [ADR-0015](../adr/0015-golden-scenario-parity.md) (second
  amendment of 2026-10-29: the browser lane, of which this
  measurement is not part); [ADR-0011](../adr/0011-webapp-toolchain.md)
  (reviewed upgrades of pinned packages).
- [ChromeDevTools/devtools-frontend, `front_end/models/trace/lantern/simulation/Constants.ts`](https://github.com/ChromeDevTools/devtools-frontend/blob/main/front_end/models/trace/lantern/simulation/Constants.ts)
  (`desktopDense4G`).
- [RFC 5737 — IPv4 Address Blocks Reserved for Documentation](https://www.rfc-editor.org/rfc/rfc5737)
  (TEST-NET-1, `192.0.2.0/24`: the placeholder `operator_cidr`).
- `subprojects/webapp/perf/` (the reference environment);
  `deploy/terraform/` (the parked data layer it never touches).

### 7.7 Site validation and release checklist

**Site validation.** Two strict MkDocs builds validate the assembled
site — the site tree with the generated application assets and the
fetched, checksum-verified data files in place — "rather than only
the Markdown source"
([HLDD §8 — Site integration](hldd.md#8-site-integration), Build
and deployment checks): the publication build
(`mkdocs build --strict`: the `mkdocsBuild` task, CI's **Build site**
step) and the preview build
(`mkdocs build --strict -f mkdocs.preview.yml`: the `mkdocsPreview`
task, CI's **Build preview site** step), which includes every draft
except `media/dev/`
([§6.1](#61-build-outputs-asset-paths-and-page-scaffold)). Both
builds run the site checks hook
`subprojects/mkdocs/hooks/site_checks.py` of §6.1, which fails the
build listing every offending path; its arms (a), development
media, and (b), publication inventory, are the media-permission
check of
[HLDD §9 — Testing and release architecture](hldd.md#9-testing-and-release-architecture)
(Site validation): "media without publication permission is absent
from the publication output". A failed application build or a failed
data retrieval fails the site build, and a failed run never replaces
the working published site; the wiring is
[§6.3](#63-ci-workflows)'s.

**Two release shapes.**
[HLDD §9 — Testing and release architecture](hldd.md#9-testing-and-release-architecture)
(Data refresh and deployment) distinguishes them, and the checklist
below marks which checks each requires. Publishing a new vintage runs
`publishVintage` ([§4.2](#42-publication-of-a-data-vintage)), whose
one run exports the vintage, runs the full-data checks of
[§7.3](#73-pipeline-and-export-tests) against it, publishes it, and
writes the publication record `dist/app/data-vN.publication.json`;
the owner then commits the pointer manifest. A software-only release
uses the currently pinned data vintage — "It does not regenerate or
republish research data merely because application code changed" —
and instead verifies the existing vintage's recorded publication
evidence: the committed pointer manifest, CI's fetch-and-verify on
the release commit, and the vintage's publication record, which
`publishVintage` also appended to the data release's body. It
regenerates nothing.

**The checklist.** The committed template
`docs/app/release-checklist.md` instantiates the HLDD §9 release
checks; the owner fills one copy per release, and the filled copy,
pasted into the GitHub release description, is the release record.
A withdrawal that deletes a software release first saves this record
and carries it into the replacement software release
([§4.3](#43-retention-rollback-recovery-and-withdrawal), Withdrawal
steps 2 and 5 — an owner decision, Proposed). The release record
identifies the software revision (the 40-hex commit), the
pointer-manifest revision and data vintage, the test-suite and lane
versions with their results, and the approval references, and it
ends with the evidence ledger below; the implementation plan's gate
section ([`docs/app/ip.md`, §3](ip.md#3-gates-and-release-sequence))
carries this enumeration identically and schedules the checks. The
checks run on the release branch — for the release that activates
the scenario page, the branch carrying the activation commit of
[§6.1](#61-build-outputs-asset-paths-and-page-scaffold) — before the
merge that releases the change (HLDD §9, Data refresh and
deployment, step 7), except the published-site measurement of
item 5, which follows the deployment, and items 10 and 11, which run
on the software release's tag while its release is still a draft
([§4.4](#44-licensing-archival-distribution-and-release-attachments)).

**Phases.** The checklist gates public releases. The prototype
deployment of [§6.1](#61-build-outputs-asset-paths-and-page-scaffold)
— Phase 1 of
[ADR-0017 — An unadvertised prototype deployment precedes the public release](../adr/0017-unadvertised-prototype-before-public-release.md)
(Proposed), not a public release — is gated by the deployment
safeguards that stand from the first deployment: the CI gates of
[§6.3](#63-ci-workflows), which keep a commit that fails them from
`deploy`; the `site_checks` hook arms (a)–(e) in both strict builds,
arm (d) checking the unlisted state; and the media rule of item 9,
under which no third-party photograph is deployed without documented
permission. Every item of the table applies at activation and at the
first software release — one release, the one that activates the
scenario page — and at every release after it.

| # | Check | Applies to | Evidence recorded |
|---|---|---|---|
| 1 | CI green on the release commit ([§6.3](#63-ci-workflows)): Tests — `pytest`, and `webapp-test` with **Webapp checks** (the compatibility and toolchain tests included) and **Parity**; Companion site — `webapp-bundle` with **Webapp checks**, **Parity**, and **Build bundle**, and `build` with **Build site** and **Build preview site**, the `site_checks` hook included; Doc links — `links`, with **Check links and anchors**, **Check PDD agreement**, **Check traceability**, and **Self-test doc scripts**. Pull-request runs are unfiltered, and both workflows' push filters name `CITATION.cff`, which every release commit changes, so the runs exist. The window end the compatibility test prints — the newest browser release in the pinned `caniuse-lite` — is no more than 24 months before the release date; otherwise the dataset is upgraded first ([§7.6](#76-performance-and-compatibility-measurements)). | Every release | `gh run list --commit <release sha>` output, the run URLs, and the compatibility test's printed dataset version and window end. |
| 2 | Full-data run: `pytestFullData`, run by `publishVintage` against the staged vintage, exits 0 with zero skips and every `full_data_required.txt` test collected and passed ([§7.3](#73-pipeline-and-export-tests)). | Vintage release | The pytest summary line in the publication record. |
| 3 | Publication: `publishVintage` completed ([§4.2](#42-publication-of-a-data-vintage)) — the data tag peels to the source commit, the release's asset names and SHA-256s equal the pointer exactly, the release is published — which locks it, the repository's releases being immutable (§4.2 step 1 re-checks this) — and the owner's pointer commit sits directly on the source commit. | Vintage release | The publication record `dist/app/data-vN.publication.json` and its copy in the data release's body. |
| 4 | Browser lane: `webappBrowserTest` (projects `desktop` and `mobile`) exits 0 on the release branch, its `playwrightInstall` dependency first installing the pinned Chromium build ([§7.5](#75-browser-test-lane)). | Every release | `subprojects/webapp/build/playwright/report.json` and the traces, attached. |
| 5 | Measurements ([§7.6](#76-performance-and-compatibility-measurements)) against [PDD §9.1 — Performance budgets (D-9, Proposed)](pdd.md#91-performance-budgets-d-9-proposed): (a) before the merge, `webappMeasureReference` on the release branch completes — its measure run exiting 0, its report downloaded, and the VM destroyed (§7.6 step 7) — with a report recording `environment.kind` `aws-ec2`, the instance type, region, and AMI of [DD-12](#1-ddd-decision-register) (Performance reference environment), the DD-12 `network` values, its `terraform_version`, and `source_tree_clean` true; the release is then accepted on that report, a decision separate from the run's completion, only when every workload reads `within_budget` true: nearest-rank 95th percentiles of 30 runs (`sorted[28]`: at least 29 of the 30 observed runs within budget, a sample-based acceptance rule) at most 2.0 s cold, 1.0 s warm in both variants, and 200 ms for each interaction workload, with every cold run's data payload at most 4 MB compressed; (b) after the release's deployment, the published-site run (`-Pegr.perf.target=published`) completes, its measure run exiting 0, so the header sets match, with a report recording `environment.kind` `aws-ec2`, the instance type, region, and AMI of DD-12, and the DD-12 `network` values, and its cold and fresh-warm workloads read `within_budget` true — a miss reopens the release. | Every release | The report directories `subprojects/webapp/build/perf/<run_id>/`, attached, with browser, device, version, vintage, revision, and Terraform version named. |
| 6 | Success criteria: each row of the table below verified by its named artifact. | Every release | Per row. |
| 7 | [D-10](pdd.md#1-decision-register) (Liability-limitation text referenced by CR-4) gate: the standing disclaimer in `scenario.md`'s `#gre-disclaimer` is the owner-sourced text, and the item-7 search below prints nothing. Until the text is approved PDD §5.1's bracketed slot "[the project's liability limitations — text pending, D-10]" stands in `#gre-disclaimer` verbatim, as the unlisted prototype of [§6.1](#61-build-outputs-asset-paths-and-page-scaffold) shows it, and the bundle carries no PDD §5.1 text ([§5.8](#58-view-layer)). No placeholder liability text ships in a public release. | Every release | The empty search output and the sourcing record. |
| 8 | Glossary: every first-use glossary anchor of [PDD §5.11 — Labels, units, and glossary links (FR-G3, CR-3, CR-7)](pdd.md#511-labels-units-and-glossary-links-fr-g3-cr-3-cr-7) resolves in both built trees (the lane's `render` spec asserts the application's links; the strict builds check the authored pages); the pre-launch additions are present — the PFDHA and engineer-of-record glossary entries of [§6.4](#64-product-pages-beyond-the-scenario-page-p2p3), the copy-marked `glossary.md` block that step 7 of `check_pdd_agreement.py` compares with §6.4 and step 8 lists ([§5.13](#513-application-configuration)); and the FDHI entry's spelling is aligned to the singular "Fault Displacement Hazard Initiative": the item-8 search below prints nothing. | Every release | The search output and the step-8 list of item 1's **Check PDD agreement** run. |
| 9 | Media permission ([R-12](prd.md#93-content-and-media-dependencies) (Public permission for third-party earthquake photographs is unresolved.)): the `site_checks` hook ran in the release commit's **Build site** and **Build preview site** steps without raising — neither output holds a media file that is neither allowlisted nor a granted index entry, referenced or not, nor any `media/dev/` path or reference. | Every release | The hook's result in the release commit's **Build site** log. |
| 10 | Zero-`fig-*` archive: the item-10 listing below prints 0 — the `export-ignore` arrangement recorded in [`notes/Roadmap.md` — Decisions made](../../notes/Roadmap.md#decisions-made); from P2 the listing also holds no entry under `subprojects/mkdocs/docs/media/` ([§6.4](#64-product-pages-beyond-the-scenario-page-p2p3)). | Every release | The archive listing. |
| 11 | Attachment identity ([DD-8](#1-ddd-decision-register)): on the draft software release of [§4.4](#44-licensing-archival-distribution-and-release-attachments), before it is published, run the checklist's `gh release upload` block of §4.4 — the files the committed pointer manifest names, their list generated from it, and beside them the dashboards' plotting CSVs that the block regenerates in `dist/csv/`, per [`notes/Roadmap.md` — Decisions made](../../notes/Roadmap.md#decisions-made) — then re-download every data asset the pointer names and compare SHA-256 checksums. Attachments must be "the same verified files identified by that release's committed pointer manifest" ([HLDD §9 — Testing and release architecture](hldd.md#9-testing-and-release-architecture), Software-release data attachments), byte for byte. Before the draft is published, `gh api repos/HarvardRC/eps-ground-rupture/immutable-releases --jq .enabled` prints `true`, so publication locks the verified attachments. | Every release | The checksum comparison output and the immutability command's output. |
| 12 | Rollback readiness: the release's rollback target of [§4.3](#43-retention-rollback-recovery-and-withdrawal) (Rollback), which the owner approves — an earlier software tag, not necessarily the immediately preceding one, whose vintage no withdrawal excludes — and the §4.3 retention check of the vintage that the tag's pointer manifest (`git show <tag>:subprojects/webapp/data/pointer.json`) names; or, when no tag qualifies, the owner-approved absence of §4.3, which for the first software release reads `no rollback target: first release`. | Every release | The target's tag and its retention check output, or the absence line. |
| 13 | Acceptance walkthroughs: [US-1](prd.md#us-1-dam-foundation-scenario) (Dam foundation scenario), [US-2](prd.md#us-2-pipeline-crossing) (Pipeline crossing), and [US-3](prd.md#us-3-design-review) (Design review) executed against the golden scenarios ([PDD §10.3 — Acceptance walkthroughs](pdd.md#103-acceptance-walkthroughs)); [US-4](prd.md#us-4-interpreting-observed-deformation) (Interpreting observed deformation) and [US-5](prd.md#us-5-teaching-surface-rupture-morphology) (Teaching surface-rupture morphology) join when their P2 capabilities ship. | Every release | Reviewer records. |
| 14 | Representative assistive-technology pass — a human check beyond the automatable lane checks ([HLDD §7.2 — Accessibility and supported environments](hldd.md#72-accessibility-and-supported-environments)) — which reads one chart's bin table and one field table with the chart-data disclosure open. | Every release | Reviewer record. |
| 15 | Representative engines and mobile browsers (manual): the procedure below, run by the owner against the preview tree served by `playwright/serve.mjs`, started in the form of Node.js outside Gradle of [§2](#2-repository-structure-naming-and-toolchain). | Every release | The engine record. |
| 16 | Traceability: `python3 .github/scripts/check_traceability.py --release` exits 0 on the release commit — the [§8](#8-traceability) matrix lint, which under `--release` exits non-zero on any gap ([§6.3](#63-ci-workflows) runs it without the flag). | Every release | The command output, with its gap count of 0. |
| 17 | Data terms: the pinned vintage's terms file holds the confirmed record of [§4.2](#42-publication-of-a-data-vintage) step 1, never the assumed one ([§4.4](#44-licensing-archival-distribution-and-release-attachments)): the item-17 search below prints 1. | Every release | The search output. |

**Literal commands.** Items 7, 8, and 17 run in `subprojects/mkdocs`
after both strict builds; item 10 runs at the repository root:

```sh
# item 7 — prints nothing
grep -rl 'text pending, D-10' site/ site-preview/
# item 8 — prints nothing
grep -rl 'Fault Displacement Hazards Initiative' site/ site-preview/
# item 17 — prints 1
grep -cxE 'Confirmed: [0-9]{4}-[0-9]{2}-[0-9]{2}' site/assets/scenario/data/data-terms-*.txt
# item 10 — prints 0
git archive --format=tar <release tag> | tar -tf - | grep -cE '(^|/)fig-[^/]*$'
```

**Item 15 procedure.** `docs/app/release-checklist.md` carries this
procedure verbatim. The owner first runs
`./gradlew :subprojects:mkdocs:mkdocsPreview :subprojects:webapp:npmCi`
and then, in `subprojects/webapp` in the form of Node.js outside
Gradle of [§2](#2-repository-structure-naming-and-toolchain),
`node playwright/serve.mjs --root ../mkdocs/site-preview --site-url <SITE_URL> --port 4173`,
`<SITE_URL>` being the `site_url` of `subprojects/mkdocs/mkdocs.yml`.
The environments are current desktop Firefox; current Safari on
macOS; Safari on iOS, in the Xcode iOS Simulator; and Chrome on
Android, in the Android Emulator. The simulator and the emulator are
the default; a physical iPhone or Android phone may stand in for
either, reaching `serve.mjs` started with `--host 0.0.0.0` (every
interface, the loopback included). The scenario page's address is
`<origin><path>scenario/`, `<path>` being the path of `<SITE_URL>`
(`/eps-ground-rupture/`) and `<origin>` being `http://127.0.0.1:4173`
in the desktop browsers and the iOS Simulator, `http://10.0.2.2:4173`
in the Android Emulator (its alias for the host loopback), and
`http://<LAN address>:4173` on a phone, `<LAN address>` being the
machine's address on the phone's network; the served sitemap matches
every one of these origins ([§7.5](#75-browser-test-lane), Static
server). The console of step 6 is the browser's developer tools —
for the simulator, the emulator, or a phone, desktop Safari's
**Develop** menu (iOS) or desktop Chrome's `chrome://inspect`
(Android). In each environment the owner:

1. loads the scenario page directly — the controls and three panels
   replace the fallback, with no capability or unavailable notice;
2. builds [GS-1](pdd.md#102-golden-scenarios) by hand (dips 30° and
   40°, Strong in both arms, offset mode 3 m) — the matching count,
   each panel's N, and the scarp-height median equal the values the
   same release's lane run displayed;
3. switches the height panel to Cumulative and enters the read-off
   84 — the value appears beside the input and as a marker;
4. switches the overlay on — marks and legend appear on the height
   and width panels, and the scarp-dip panel shows "Field sources
   provide no comparable scarp-dip measurement.";
5. downloads — the ZIP opens with `records.csv`, `statistics.csv`,
   `provenance.txt`, and `scenario.json`, and the provenance names the
   GS-1 settings;
6. sets `window.__greProbe = 1` in the console, leaves by the
   Glossary nav link (in the navigation drawer at phone width), and
   returns with the browser's Back button, reading
   `window.__greProbe` in the console after each move — `1` both
   times; `undefined` marks a full page load and fails the step (the
   probe of the lane's `navigation-lifecycle` spec,
   [§7.5](#75-browser-test-lane)) — then one set of controls, one
   update per change;
7. in the mobile environments, at a portrait width of at least
   360 px — no horizontal scroll, every control operable by touch,
   the read-off usable without hover;
8. in the desktop environments — Tab reaches every control with
   visible focus, and a control operated by keyboard updates the
   results.

The record lists, per environment, the browser and version, the
operating system and version, the device or simulator model, the
date, the reviewer, and pass or fail per step; any failed step blocks
the release. It states that only current versions were executed and
that the oldest in-window versions rest on the documented API
evidence of [§7.6](#76-performance-and-compatibility-measurements)
alone.

**Evidence ledger.** The release record ends with a table
`| Check | Revision | Result location | Result | Date |`, one row per
item above and per separately evidenced check inside an item (each
workflow run of item 1, each report of item 5), and one row per
`test`, `measure`, or `release` Check of every [§8](#8-traceability)
row whose Status is neither `parked`, `deferred`, nor `n/a`. Revision
is the 40-hex commit the check ran on — for the data checks of
items 2 and 3, the publication record's `tag_commit` (`S`). The §7.6
reports carry `source_commit` and `source_tree_clean`; the
publication record carries `tag_commit`, equal to the staged
`provenance.source_commit`, whose `source_tree_clean`
[§4.2](#42-publication-of-a-data-vintage) step 4 requires to be
true. Result location is a CI run URL, an attached report, or a
record identifier; Result is `pass` or `fail`. The release revision
is the release commit — the release-branch head that item 1's runs
check. The release branch contains `main` when it is merged, so the
merge commit that deploys the release has the release commit's tree
(`git diff --quiet <release sha> <main sha>` exits 0), and the
software tag names that `main` commit. A release record is complete
only when every ledger row reads `pass` and names the release
revision, except the rows of items 2 and 3, which name `tag_commit`,
and the rows of items 5 (b) and 10, which name the tagged `main`
commit. The row of item 5 (b) reads `pass` only when the build
identity holds — the full SHA-256 of `app.js` and of `app.css` is the
same in the three places the release record lists: the `webapp-dist`
artifact of item 1's Companion site run; that of the Companion site
push run that deployed the `main` commit (each artifact read with
`gh run download <run id> --name webapp-dist --dir <empty temporary directory>`,
then `shasum -a 256 app.js app.css` in that directory); and its
report's `bundle` digests of the served files
([§7.6](#76-performance-and-compatibility-measurements), Report) —
and when its report's `software_version` and `data_version` equal
the release commit's `CITATION.cff` version and its pointer's
`export_version`. Version labels alone never establish which build
was tested, deployed, or measured.

**Success criteria and their verifying artifacts** (item 6; the
criteria are
[PDD §10.1 — Success criteria](pdd.md#101-success-criteria)'s):

| Criterion | Verifying artifact |
|---|---|
| [SC-1 (core workflow)](pdd.md#101-success-criteria) | The US-1 walkthrough executed by an engineer new to the product, unassisted; the lane's `golden-scenario` spec is its scripted twin, not its substitute. |
| [SC-2 (download reproducibility)](pdd.md#101-success-criteria) | The lane's `consistency` spec — the downloaded `scenario.json` equals the scenario built, and `test/zipcheck.py` accepts the archive — plus the walkthrough reviewer identifying scenario settings, data-export version, matching-record count, and every statistic from the downloaded package alone. |
| [SC-3 (correctness)](pdd.md#101-success-criteria) | The [§7.2](#72-calculation-parity-tests) parity run on the release commit (both **Parity** steps), and the lane's `golden-scenario` spec: displayed strings equal the reference display strings exactly. |
| [SC-4 (performance)](pdd.md#101-success-criteria) | The [§7.6](#76-performance-and-compatibility-measurements) reports of item 5 from the reference environment (`environment.kind` `aws-ec2`, the instance type, region, and AMI of [DD-12](#1-ddd-decision-register), and the DD-12 `network` values): nearest-rank 95th percentiles of 30 runs at most 2.0 s cold, 1.0 s warm, and 200 ms per interaction workload, with the payload at most 4 MB compressed; and the published-site run after deployment. |
| [SC-5 (candor)](pdd.md#101-success-criteria) | The lane's default-view caveat assertions plus the acceptance review: every applicable caveat present in the default view, the population name always visible with its explainer one action away. |
| [SC-6 (site integrity)](pdd.md#101-success-criteria) | The strict builds' exit status on both trees, the `site_checks` hook included, the lane's `site-regression` spec, and the acceptance confirmation that the existing dashboards, navigation, citation pages, and deployment are unaffected. |
| [SC-7 (scientific sign-off)](pdd.md#101-success-criteria) | The recorded research-group approval ([OA-4](ip.md#4-owner-and-research-group-actions)) of the reader-facing texts — the [PDD §5 — Copy deck](pdd.md#5-copy-deck) texts and every fixed-here text `check_pdd_agreement.py` lists, in `copy.json` or between copy markers ([§5.13](#513-application-configuration)), the glossary additions of [§6.4](#64-product-pages-beyond-the-scenario-page-p2p3) among them — as the SC-7 approval record below, referenced from the release record: the newest record's listing equals the step-8 listing printed at the release commit, and the record follows the activation commit of [§6.1](#61-build-outputs-asset-paths-and-page-scaffold) and precedes the release merge that makes the activated page public. |

**SC-7 approval record.** The record of owner action
[OA-4](ip.md#4-owner-and-research-group-actions) is a dated file
that the owner commits on the release branch,
`docs/app/approvals/sc7-YYYY-MM-DD.md`, holding the approver role or
roles, the approved commit as 40 hex digits, and, as its one fenced
code block, the step-8 listing of
[§5.13](#513-application-configuration) that
`python3 .github/scripts/check_pdd_agreement.py` prints at that
commit, where it exits 0. A task that checks the record takes the
newest such file by name and compares its listing, line for line,
with the step-8 listing printed at its own `HEAD`; a difference, a
missing file, or a file without its date, roles, or commit stops the
task, which reports it. The record postdates every commit of the
release branch that changes, adds, or removes a listed text — in the
release-branch order of
[IP §3 — Gates and release sequence](ip.md#3-gates-and-release-sequence),
the D-10 commit, the glossary commit, and the activation commit,
which removes the prototype notice of [§5.8](#58-view-layer),
precede it, and the release merge follows it — so one record covers
the release; a later change to a listed text needs a new OA-4
record.

*Verification (planned):* the strict builds' exit status on both
trees, the `site_checks` hook included; the checklist itself is the
release record, and a release whose record lacks a filled checklist,
or holds a ledger row not reading `pass`, is not a release.

References:

- [HLDD §8 — Site integration](hldd.md#8-site-integration) (Build and deployment checks).
- [HLDD §9 — Testing and release architecture](hldd.md#9-testing-and-release-architecture) (Site validation; Acceptance and release checks; Data refresh and deployment; Software-release data attachments).
- [HLDD §10 — Risks and open dependencies](hldd.md#10-risks-and-open-dependencies) (Performance and delivery risks: R-19).
- [NFR-7 — Build and data-quality gates](prd.md#nfr-7-build-and-data-quality-gates).
- [PDD §5.11 — Labels, units, and glossary links (FR-G3, CR-3, CR-7)](pdd.md#511-labels-units-and-glossary-links-fr-g3-cr-3-cr-7).
- [PDD §9.2 — Browser and mobile baseline (D-16, Proposed)](pdd.md#92-browser-and-mobile-baseline-d-16-proposed).
- [PDD §10.1 — Success criteria](pdd.md#101-success-criteria).
- [PDD §10.3 — Acceptance walkthroughs](pdd.md#103-acceptance-walkthroughs).
- [`notes/Roadmap.md` — Decisions made](../../notes/Roadmap.md#decisions-made).
- [ADR-0017](../adr/0017-unadvertised-prototype-before-public-release.md)
  (Proposed: the phases).
- `docs/app/ip.md` (§3 carries the release-record enumeration);
  `docs/app/release-checklist.md` (the template, including the
  item-15 procedure).

## 8. Traceability

The matrix below maps every statement the approved documents direct at
the DDD or the implementation plan — the obligations that the obligation
sweep of 2026-10-29 extracted from the PRD, PDD, HLDD, accepted ADRs,
and `notes/Roadmap.md` at commit `36abc56` — to the element that holds
it and the check planned to evidence it, with its kind and status. The
matrix shows coverage and planned evidence, never satisfaction: no cell
records that a check has run or what it found. Executed results live
only in the release records of
[§7.7](#77-site-validation-and-release-checklist), which the
withdrawal procedure of
[§4.3](#43-retention-rollback-recovery-and-withdrawal) saves before
it deletes a software release and carries into the replacement
release. The evidence ledger that ends a release record gives each
check the revision it ran on, the location of its result, and the
result, and it holds one row per `test`, `measure`, or `release`
Check of every row whose Status is neither `parked`, `deferred`, nor
`n/a` — the obligations of the MVP release. The tables are the stored
rendering of that sweep: when a source changes, the sweep runs again
against the sources at their current revisions and the tables are
re-rendered, never hand-edited. This correction pass re-rendered the
Kind, Check, and Status columns against the corrected document on
2026-10-30, with the Home of each obligation the correction moved; in
every row but one, the Source and Obligation cells are the sweep's
extraction, unchanged. The amendments of 2026-10-30 to PDD §9.1 and
to the HLDD's Performance budgets constraint postdate the sweep: the
PDD §9.1 rows cover the first, and the one row this pass added, whose
Source reads `HLDD §2 L213-224 (amended 2026-10-30)`, carries what
the second directs at this document. The rows that direct an
obligation at the implementation plan recur, identical, in
[IP §7 — Traceability](ip.md#7-traceability).

Each table has six columns. **Source** names the approved document
and the lines the sweep read, and **Obligation** summarizes what
those lines require. **Home** is the section that holds the
obligation — in this document, or, written `IP §n`, in the
[implementation plan](ip.md). **Kind** is one value of a closed set,
or several joined by `+` — the kinds of the row's checks:

- `text` — the obligation is that the DDD or the implementation plan
  states or defines something;
- `test` — an automated check;
- `measure` — a measurement of
  [§7.6](#76-performance-and-compatibility-measurements) or a figure
  of [§3.8](#38-measured-sizes);
- `release` — an item of the release checklist of
  [§7.7](#77-site-validation-and-release-checklist);
- `owner` — an owner action `OA-n` or a gate `G-n` of the
  implementation plan;
- `schedule` — a placement, never evidence: a task `T-nn`, a line of
  [IP §5 — Parked capabilities (P2/P3)](ip.md#5-parked-capabilities-p2p3),
  or a deferral that [§9](#9-deferred-and-out-of-scope) records;
- `n/a` — not an obligation of the DDD or the implementation plan;
  it stays with its source.

**Check** lists one entry per check, separated by `;`, and an entry's
form gives its kind. A `test` check is the repository path of the
test file, script, hook, or workflow — with `::` and the case, rule,
or job and step meant, or with `arm (x)` or `arms (x), (y)` for arms
of the site checks hook of
[§6.1](#61-build-outputs-asset-paths-and-page-scaffold) — followed in
parentheses by the task that creates it, `(T-nn)`, or by the tasks
that each create a part of it, `(T-nn, T-nn)`; for the existing test
`test_regression_views.py` the task is T-14, whose full-data gate
lets none of its tests skip. An export rule is written
`§4.1 step <n> rule <name> (T-nn)`, or with `rules` and several
names. A contract file of [§7.3](#73-pipeline-and-export-tests) is
cited per lane: its fixture lane by the bare path, with T-16, and its
full-data lane as `::test_full_*` or by one named `test_full_` test,
with T-14. A `measure` check is written `§7.6 report: <field> (T-nn)`
or `§3.8: <row> (T-nn)`, the row being a size-table row or a pending
item, with the same task lists as a `test` check; a `release` check
is `§7.7 item <n>`; an `owner` check is the `OA-n` or `G-n`; a
`schedule` entry is a bare `T-nn` or an `IP §5` line, and `§9` is a
`schedule` entry in a `parked` or `deferred` row, the deferral it
records; `—` is the one entry of an `n/a` row; and every other entry
is a `text` check — the section of this document or of the
implementation plan, or the record, such as an ADR, that states the
obligation.
**Status** is one value of a closed set:

- `designed` — every check of the row is a `text` or `schedule`
  entry, and each section it names is drafted and states the
  obligation;
- `planned` — the row's `test`, `measure`, and `release` checks are
  specified in this document, and none has run;
- `owner-pending` — the evidence waits on the record of an owner or
  research-group action or gate;
- `parked` — a capability of a later delivery priority, placed by an
  `IP §5` entry;
- `deferred` — a deferral that §9 records;
- `gap` — no check, a check that does not assert the obligation, or
  text contradicted elsewhere;
- `n/a` — not an obligation of the DDD or the implementation plan.

A row's Status is the first of these that applies: `n/a` for a row of
Kind `n/a`; then `gap`, `parked`, and `deferred` as defined above;
then `owner-pending` when any check is an `OA-n` or `G-n`; then
`planned` when any check is a `test`, `measure`, or `release` check;
and otherwise `designed`.

A `gap` row blocks the owner's acceptance of this document, and item
16 of the release checklist fails a release while any row reads
`gap`. `.github/scripts/check_traceability.py`, run by the
**Check traceability** step of the `links` job
([§6.3](#63-ci-workflows)), lints the tables; the Verification
paragraph that closes
[§8.4](#84-from-the-adrs-and-the-adr-process) states its rules.

In the Home and Check columns, bare `§n` coordinates refer to this
document's sections (kept unlinked so the register stays greppable — a
stated exception to the link convention for this generated table); `IP`
coordinates refer to the [implementation plan](ip.md). A row may resolve
to an implementation-plan element, an owner action, a parked line, or
"not a DDD obligation (stays with its source)" — Kind and Status `n/a`;
the two such rows are operational recipes `notes/Roadmap.md`
deliberately keeps.

### 8.1 From the HLDD

| Source | Obligation | Home | Kind | Check | Status |
|---|---|---|---|---|---|
| HLDD Intro L69-72 | DDD/IP overall scope | Introduction, §2, §3, §5, §7 | text | Introduction; §2; §3; §5; §7; IP §1; IP §2 | designed |
| HLDD Intro L72-76 | IP execution brief | IP §2 task graph | text | IP Introduction | designed |
| HLDD Intro L66-67 | where code references belong | Introduction | text | Introduction; §2; §5.1; §6.1 | designed |
| HLDD Intro L93-97 | ADRs constrain DDD/IP | Introduction | text | Introduction; IP Introduction; IP §8 | designed |
| HLDD §2 L213-224 (amended 2026-10-30) | reference environment for the budgets: a fixed-specification AWS VM from Terraform, each time budget at the 95th percentile of 30 runs; the DDD fixes machine specification and run procedure | §1 DD-12, §7.6, §2 | text+measure+owner | §1 DD-12; §7.6; §2; ADR-0016; §7.6 report: environment (T-59, T-61); §7.6 report: workloads (T-61); OA-12 | owner-pending |
| HLDD §4.3 L637-639 | state/view lifecycle responsibilities | §5.1, §5.10, §5.11 | text+test | §5.1; §5.3; §5.10; §5.11; subprojects/webapp/playwright/specs/mount.spec.ts (T-60); subprojects/webapp/playwright/specs/navigation-lifecycle.spec.ts (T-60) | planned |
| HLDD §4.3 L654-656 | chart behaviors and tests | §5.12, §5.11 | text+test | §5.11; §5.12; subprojects/webapp/test/charts.test.ts (T-41); subprojects/webapp/test/histogram.test.ts (T-32); subprojects/webapp/test/chart-text.test.ts (T-41); subprojects/webapp/playwright/specs/render.spec.ts (T-60); subprojects/webapp/playwright/specs/interactions.spec.ts (T-60); subprojects/webapp/playwright/specs/a11y.spec.ts (T-60); subprojects/webapp/playwright/specs/keyboard-responsive.spec.ts (T-60) | planned |
| HLDD §4.3 L662-663 | bundle size measurement | §7.6, §3.8 | measure | §3.8: pending item 4 (T-61); §7.6 report: workloads.samples.files (T-61) | planned |
| HLDD §4.3 L673-675 | assets directory exact path | §6.1 | text+test | §6.1; subprojects/mkdocs/hooks/site_checks.py arm (c) (T-51) | planned |
| HLDD §4.3 L692-694 | content-hashed filename injection | §6.1 | text+test | §6.1; subprojects/mkdocs/hooks/site_checks.py arm (c) (T-51); subprojects/webapp/playwright/specs/mount.spec.ts (T-60) | planned |
| HLDD §4.3 L728-730 | workflow path-filter coverage | §6.3 | text | §6.3 push-filter rule (excludes subprojects/webapp/perf/**, which no CI step reads, so it affects neither the published application, its results, nor a gating check) | designed |
| HLDD §4.3 L742-745 | CI trigger matrix | §6.3 | text | §6.3 trigger matrix | designed |
| HLDD §4.3 L747-749 | tests use pinned files only | §6.3, §7.2 | text+test | §6.3; §7.2; §7.5; subprojects/webapp/test/parity.ts::fetch (T-35) | planned |
| HLDD §4.3 L751 | CI workflow paths/dependencies | §6.3 | text | §6.3 | designed |
| HLDD §5.1 L829-832 | export filenames and schemas | §3.1-§3.7, §4.1, §3.8 | text+measure | §3.1; §3.2; §3.3; §3.4; §3.5; §3.6; §3.7; §4.1; §3.8: Selected row (T-11, T-17); §3.8: pending items 1–3 (T-11, T-61) | planned |
| HLDD §5.2 L876-880 | lossless encoding validation | §4.1 | test | §4.1 step 3 rule bitwise-restore (T-12); §4.1 step 3 rule sentinel-collision (T-12); subprojects/python/tests/test_scenario_export.py (T-16); subprojects/python/tests/test_scenario_export.py::test_full_* (T-14) | planned |
| HLDD §5.2 L881-883 | slip-order validation | §4.1 | test | §4.1 step 3 rule slip-order (T-12); subprojects/python/tests/test_scenario_export.py (T-16); subprojects/python/tests/test_scenario_export.py::test_full_* (T-14) | planned |
| HLDD §5.2 L888-895 | scarp-dip encoding selection | §1 DD-1, §3.1 | text+test+measure | §1 DD-1; §3.1; §4.1 step 3 rule bitwise-restore (T-12); §4.1 step 3 rule dictionary-order (T-12); §3.8: Selected row (T-11, T-17) | planned |
| HLDD §5.2 L895-898 | display rounding vs stored precision | §5.4, §5.8 | text+test | §5.4; §5.8; §4.1 step 3 rule bitwise-restore (T-12); subprojects/webapp/test/parity.ts::tolerance (T-35); subprojects/webapp/test/parity.ts::display (T-35) | planned |
| HLDD §5.2 L902-907 | complete-size reporting | §3.8 | text+measure | §3.8; §3.8: pending item 2 (T-11, T-61); §7.6 report: workloads.samples.files (T-61) | planned |
| HLDD §5.2 L920-925 | artifact-manifest exact fields | §3.2 | text+test | §3.2; §4.1 step 5 rule format-spec (T-12); §4.1 step 5 rule manifest-figures (T-12); §4.1 step 5 rule checksums (T-12); subprojects/python/tests/test_manifests.py (T-16) | planned |
| HLDD §5.2 L931-935 | DR-4 cited, not re-decided | §3.1, §5.4 | text+test | §3.1; §5.4; §4.1 step 3 rule bitwise-restore (T-12) | planned |
| HLDD §5.2 L935-936 | binary layout is DDD material | §3.1, §3 | text+test | §3; §3.1; §4.1 step 5 rule block-tiling (T-12); subprojects/webapp/test/decode.test.ts (T-36) | planned |
| HLDD §5.3 L999-1000 | size and interaction verification | §3.8, §7.6 | measure | §3.8: pending item 2 (T-11, T-61); §7.6 report: workloads (T-61); §7.6 report: environment (T-59, T-61) | planned |
| HLDD §5.3 L1026-1028 | complete-update 200 ms check | §7.6 | measure+release | §7.6 report: workloads (T-61); §7.6 report: environment (T-59, T-61); §7.7 item 5 | planned |
| HLDD §5.4 L1078 | pointer-manifest contents | §3.3 | text+test | §3.3; §4.1 step 6 rule pointer-exact (T-12); subprojects/python/tests/test_manifests.py (T-16) | planned |
| HLDD §5.4 L1080-1082 | single-run manifest generation | §4.1, §3.3 | text+test | §4.1; §3.3; §4.1 step 6 rule pointer-exact (T-12) | planned |
| HLDD §5.4 L1085-1087 | manifest consistency check | §4.1, §3.3 | test | §4.1 step 5 rule envelope-agreement (T-12); §4.1 step 6 rule pointer-exact (T-12); subprojects/python/tests/test_manifests.py (T-16); subprojects/python/tests/test_manifests.py::test_full_* (T-14); .github/workflows/mkdocs.yml::build / Stage scenario assets (T-21) | planned |
| HLDD §5.4 L1105-1106 | commit-after-verify gate | §4.2 | text+release+schedule | §4.2; §7.7 item 3; T-18 | planned |
| HLDD §5.4 L1108-1109 | task names, upload, manifest schemas | §4.1, §4.2, §3.2, §3.3 | text | §4.1; §4.2; §3.2; §3.3 | designed |
| HLDD §5.4 L1113-1115 | no latest-release selection | §6.1, §6.3 | text+test | §6.1; §6.3; .github/workflows/mkdocs.yml::build / Stage scenario assets (T-21); subprojects/webapp/test/parity.ts::fetch (T-35) | planned |
| HLDD §5.4 L1117-1119 | checksum build gate | §6.1, §6.3 | test | .github/workflows/mkdocs.yml::build / Stage scenario assets (T-21); subprojects/mkdocs/hooks/site_checks.py arm (c) (T-51); subprojects/webapp/test/parity.ts::fetch (T-35) | planned |
| HLDD §5.4 L1125-1128 | manifest filename pinning mechanism | §6.1 | text+test | §6.1; subprojects/webapp/playwright/specs/mount.spec.ts (T-60) | planned |
| HLDD §5.4 L1138-1139 | no filename reuse | §4.2, §6.1 | text+test | §4.1; §4.2; §6.1; §4.1 step 5 rule checksums (T-12); §4.1 step 6 rule file-names (T-12) | planned |
| HLDD §5.4 L1149-1151 | pre-compressed publication | §4.2, §1 DD-7 | text+test | §1 DD-7; §4.2; §4.1 step 6 rule pointer-exact (T-12); §4.1 step 6 rule file-names (T-12) | planned |
| HLDD §5.4 L1153-1155 | measured vintage size recorded | §3.8 | measure | §3.8: pending item 2 (T-11, T-61); §7.6 report: workloads.samples.files (T-61) | planned |
| HLDD §5.4 L1169-1170 | compatible rollback | §4.3 | text+owner+schedule | §4.3; OA-9; T-64 | owner-pending |
| HLDD §5.4 L1172-1173 | vintage retention | §4.3 | text+release | §4.3; §7.7 item 12 | planned |
| HLDD §5.4 L1175-1179 | withdrawal operational steps | §4.3 | text | §4.3 (Withdrawal, steps 1–5: steps 2 and 5 an owner decision, Proposed) | designed |
| HLDD §5.4 L1183-1184 | redistribution permission gate | §4.2, §4.4 | text+release+owner | §4.2; §4.4; ADR-0017; §7.7 item 17; OA-1; OA-13; G-1 | owner-pending |
| HLDD §5.4 L1188-1190 | vintage license metadata | §4.4 | text+test+owner | §4.4; §4.1 step 6 rule pointer-exact (T-12); OA-13 | owner-pending |
| HLDD §5.4 L1200-1205 | release data-asset arrangement | §4.4, §7.7 | text+release+schedule | §4.4; §7.7 item 11; T-65 | planned |
| HLDD §5.5 L1245-1247 | field-export view mapping | §3.4 | text+test | §3.4; §4.1 step 3 rule view-reread (T-12); subprojects/python/tests/test_field_export.py (T-16); subprojects/python/tests/test_field_export.py::test_full_* (T-14) | planned |
| HLDD §5.5 L1286-1289 | labeled-event-set membership source | §3.4 | text+test+owner | §3.4; subprojects/python/tests/test_field_export.py::test_full_* (T-14); OA-14 | owner-pending |
| HLDD §5.5 L1292-1294 | not-applicable vs failed criterion | §3.4 | text+test | §3.4; subprojects/python/tests/test_field_export.py (T-16) | planned |
| HLDD §5.5 L1302-1306 | Kern County D-6 kept open | §3.4 | text+owner | §3.4; §5.8; §9; OA-2 | owner-pending |
| HLDD §5.6 L1350-1352 | export round-trip check | §4.1 | text+test | §4.1; §4.2; §4.1 step 3 rule bitwise-restore (T-12); subprojects/python/tests/test_scenario_export.py (T-16); subprojects/python/tests/test_scenario_export.py::test_full_* (T-14) | planned |
| HLDD §5.6 L1356-1360 | checksum scope | §6.3, §7.2 | text+test | §3; §7.2; .github/workflows/mkdocs.yml::build / Stage scenario assets (T-21); subprojects/webapp/test/parity.ts::fetch (T-35); subprojects/webapp/test/parity.ts (T-35) | planned |
| HLDD §5.6 L1371-1382 | reference-results contents (GS-0–GS-7) | §3.6 | text+test | §3.6; §4.1 step 5 rule format-spec (T-12); §4.1 step 3 rule reference-invariants (T-12); subprojects/python/tests/test_reference_results.py::test_full_* (T-14) | planned |
| HLDD §5.6 L1384-1387 | artifact↔reference pairing | §3.6, §3.2 | text+test | §3.2; §3.6; §4.1 step 5 rule envelope-agreement (T-12); subprojects/python/tests/test_manifests.py (T-16); subprojects/webapp/test/parity.ts::pairing (T-35) | planned |
| HLDD §5.6 L1395-1403 | per-calculation tolerances | §7.1, §7.2 | text+test | §7.1; subprojects/webapp/test/parity.ts::exact (T-35); subprojects/webapp/test/parity.ts::tolerance (T-35); subprojects/webapp/test/parity.ts::display (T-35) | planned |
| HLDD §5.6 L1405-1406 | tolerance limits | §7.1, §7.2 | text+test | §7.1; subprojects/webapp/test/parity.ts::presence (T-35); subprojects/webapp/test/parity.ts::exact (T-35) | planned |
| HLDD §5.6 L1415-1416 | pipeline-first population rule | §7.3, §3.6 | text+test+schedule | §3.6; §7.4; subprojects/python/tests/test_reference_results.py (T-16); subprojects/python/tests/test_scenario_export.py::test_full_* (T-14); T-13 | planned |
| HLDD §5.6 L1418-1420 | 3,434 no-ties check | §7.3, §4.1 | test | subprojects/python/tests/test_scenario_export.py::test_full_* (T-14); subprojects/python/tests/test_reference_results.py::test_full_* (T-14); §4.1 step 3 rule counts (T-12); §4.1 step 3 rule slip-order (T-12) | planned |
| HLDD §5.6 L1422 | windowed-selection tests | §7.2, §3.6 | test | subprojects/webapp/test/parity.ts::boundary_cases (T-35); subprojects/webapp/test/parity.ts::synthetic.ensembles (T-35); subprojects/python/tests/test_reference_results.py (T-16) | planned |
| HLDD §5.6 L1434-1436 | selection identity, not count | §3.6, §7.2 | text+test | §3.6; subprojects/webapp/test/parity.ts::exact (T-35) | planned |
| HLDD §5.7 L1465-1474 | regression-export fields | §3.5 | text+test | §3.5; §4.1 step 5 rule format-spec (T-12); §4.1 step 3 rule view-reread (T-12) | planned |
| HLDD §5.7 L1476-1479 | offset-to-slip equation | §5.5, §3.5 | text+test | §5.5; §3.5; subprojects/webapp/test/parity.ts::tolerance (T-35); subprojects/webapp/test/parity.ts::boundary_cases (T-35); subprojects/webapp/test/parity.ts::synthetic.conversion (T-35) | planned |
| HLDD §5.7 L1500-1501 | no hand-copied pipeline values | Introduction, §5.13 | text+test | Introduction; §5.13; .github/scripts/check_pdd_agreement.py (T-47); subprojects/webapp/test/scenario-controls.test.ts (T-40) | planned |
| HLDD §5.7 L1503-1506 | product settings in app configuration | §5.13 | text+test | §5.13; .github/scripts/check_pdd_agreement.py (T-47); .github/scripts/test_check_pdd_agreement.py (T-47); subprojects/webapp/test/parity.ts::D-23 transcription (T-35); subprojects/webapp/test/parity.ts::PDD §4.1 transcription (T-35) | planned |
| HLDD §6 L1528-1530 | module interfaces and structure | §5.1, §2 | text | §5.1; §2 | designed |
| HLDD §6 L1557-1560 | URL codec (P2) | §5.6, §5.8 | text+schedule | §5.6; §9; IP §5 | parked |
| HLDD §6 L1606-1609 | engine scheduling/background execution | §5.3, §5.1 | text+test | §5.3; §5.1; subprojects/webapp/test/parity.ts (T-35); subprojects/webapp/test/engine.test.ts (T-31) | planned |
| HLDD §6 L1645-1647 | result-state presentation precedence | §5.8 | text+test | §5.8; subprojects/webapp/test/notices.test.ts (T-43); subprojects/webapp/playwright/specs/interactions.spec.ts (T-60) | planned |
| HLDD §6 L1694-1696 | Kern County example release gate | §5.8 | text+owner+schedule | §5.8; OA-2; T-48 | owner-pending |
| HLDD §6.1 L1807-1808 | failure-state checks and messages | §5.10 | text+test+owner | §5.10; §5.8; subprojects/webapp/playwright/specs/failure-states.spec.ts (T-60); subprojects/webapp/test/decode.test.ts (T-36); subprojects/webapp/test/scenario-json.test.ts (T-36); .github/scripts/check_pdd_agreement.py (T-47); G-4; OA-4 | owner-pending |
| HLDD §6.2 L1830-1837 | media-index fields (P2) | §3.7 | text+schedule | §3.7; IP §5 | parked |
| HLDD §6.2 L1847-1851 | media-permission release check | §6.1, §6.4, §7.7 | test+release | subprojects/mkdocs/hooks/site_checks.py arm (a) (T-03); subprojects/mkdocs/hooks/site_checks.py arm (b) (T-03); §7.7 item 9 | planned |
| HLDD §7.1 L1895 | payload verification | §7.6 | measure+release | §7.6 report: workloads.samples.files (T-61); §3.8: pending item 4 (T-61); §7.7 item 5 | planned |
| HLDD §7.1 L1898 | interaction verification workloads | §7.6 | text+measure | §7.6; §7.6 report: workloads (T-61) | planned |
| HLDD §7.1 L1902-1904 | payload measurement scope | §7.6 | text+measure | §7.6; §7.6 report: workloads.samples.files (T-61) | planned |
| HLDD §7.1 L1910-1911 | reference results never downloaded | §5.2, §7.6 | text+measure | §5.2; §7.6; §7.6 report: workloads.samples.files (T-61) | planned |
| HLDD §7.1 L1916-1918 | first-meaningful-render definition | §7.6 | text+measure | §7.6; §7.6 report: workloads (T-61) | planned |
| HLDD §7.1 L1920-1923 | interaction-timing definition | §7.6 | text+measure | §7.6; §5.3; §7.6 report: workloads (T-61) | planned |
| HLDD §7.1 L1925-1928 | benchmark procedure | §7.6, §2 | text+measure | §7.6; §1 DD-12; §2; §7.6 report: environment (T-59, T-61); §7.6 report: software_version (T-61); §7.6 report: data_version (T-61) | planned |
| HLDD §7.1 L1930-1932 | fail-optimize-remeasure loop | §7.6 | text | §7.6; §5.3 | designed |
| HLDD §7.2 L1966-1970 | chart text alternative | §1 DD-9, §5.11, §5.8 | text+test+release | §1 DD-9; §5.11; §5.8; subprojects/webapp/test/chart-text.test.ts (T-41); subprojects/webapp/playwright/specs/a11y.spec.ts (T-60); §7.7 item 14 | planned |
| HLDD §7.2 L1984-1985 | live announcements and focus | §5.11 | text+test | §5.11; §5.7; subprojects/webapp/playwright/specs/keyboard-responsive.spec.ts (T-60); subprojects/webapp/playwright/specs/navigation-lifecycle.spec.ts (T-60); subprojects/webapp/playwright/specs/failure-states.spec.ts (T-60); subprojects/webapp/playwright/specs/a11y.spec.ts (T-60) | planned |
| HLDD §7.2 L1992-1994 | API/build-output baseline verification | §7.6 | text+test+release | §7.6; §2; subprojects/webapp/test/compat.test.ts (T-61); §7.7 item 15 | planned |
| HLDD §7.2 L1996-1999 | rendered-app a11y checks | §7.5, §7.7 | test+release | subprojects/webapp/playwright/specs/a11y.spec.ts (T-60); subprojects/webapp/playwright/specs/keyboard-responsive.spec.ts (T-60); §7.7 item 14; §7.7 item 15 | planned |
| HLDD §7.3 L2020-2022 | cache-behavior measurement | §7.6 | measure+release | §7.6 report: headers (T-61); §7.6 report: workloads (T-61); §7.6 report: environment (T-59, T-61); §7.7 item 5 | planned |
| HLDD §7.3 L2030-2033 | compression format support and serving | §6.1, §5.2, §7.6 | text+test+measure+release | §6.1; §5.2; subprojects/webapp/test/compat.test.ts (T-61); subprojects/webapp/test/decode.test.ts (T-36); §7.6 report: headers (T-61); §7.7 item 15 | planned |
| HLDD §7.3 L2036-2038 | download/decompression measurement | §7.6, §3.8 | measure | §7.6 report: decodeMs (T-61); §7.6 report: workloads.samples.files (T-61); §3.8: pending item 4 (T-61) | planned |
| HLDD §7.3 L2059-2060 | site-regression checks | §7.5, §7.7 | test+release | subprojects/webapp/playwright/specs/site-regression.spec.ts (T-60); subprojects/mkdocs/hooks/site_checks.py arm (e) (T-51); §7.7 item 6 (SC-6) | planned |
| HLDD §8 L2123-2125 | asset paths and insertion mechanism | §6.1 | text+test | §6.1; .github/workflows/mkdocs.yml::build / Build preview site (T-21); subprojects/mkdocs/hooks/site_checks.py arm (c) (T-51) | planned |
| HLDD §8 L2150-2152 | runtime data-version verification | §6.2, §5.2 | text+test | §6.2; §5.2; subprojects/webapp/test/decode.test.ts (T-36); subprojects/webapp/playwright/specs/failure-states.spec.ts (T-60); subprojects/webapp/playwright/specs/navigation-lifecycle.spec.ts (T-60) | planned |
| HLDD §8 L2154-2157 | version source and passing | §6.2 | text+test | §6.2; subprojects/webapp/playwright/specs/render.spec.ts (T-60) | planned |
| HLDD §8 L2183-2185 | assembled-site validation | §7.7, §6.3 | test+release | .github/workflows/mkdocs.yml::build / Build site (T-21); .github/workflows/mkdocs.yml::build / Build preview site (T-21); subprojects/mkdocs/hooks/site_checks.py arm (c) (T-51); §7.7 item 1 | planned |
| HLDD §8 L2187-2188 | failed-build deployment guard | §6.3 | text+schedule | §6.3; T-22 | designed |
| HLDD §9 L2229-2234 | pipeline test coverage | §7.3 | test | subprojects/python/tests/test_scenario_export.py (T-16); subprojects/python/tests/test_field_export.py (T-16); subprojects/python/tests/test_reference_results.py (T-16); subprojects/python/tests/test_manifests.py (T-16) | planned |
| HLDD §9 L2243-2247 | full-data checks before upload | §4.2, §7.3 | text+test+release | §4.2; subprojects/python/tests/test_scenario_export.py::test_full_* (T-14); §7.7 item 2 | planned |
| HLDD §9 L2249-2251 | skipped check is not a pass | §7.3, §4.1 | test+release | subprojects/python/tests/conftest.py (T-14); subprojects/python/tests/test_full_data_gate.py (T-14); §7.7 item 2 | planned |
| HLDD §9 L2253-2256 | CI-repeatable structural checks | §7.3, §7.4 | text+test | §7.3; subprojects/webapp/test/decode.test.ts (T-36); .github/workflows/mkdocs.yml::build / Stage scenario assets (T-21); subprojects/webapp/test/parity.ts::fetch (T-35) | planned |
| HLDD §9 L2268-2271 | webapp CI job setup | §6.3, §7.2 | text+test | §6.3; .github/workflows/tests.yml::webapp-test / Parity (T-23); subprojects/webapp/test/parity.ts::fetch (T-35) | planned |
| HLDD §9 L2275-2277 | Python owns the rules | Introduction, §7.4 | text | Introduction; §7.4 | designed |
| HLDD §9 L2281-2285 | parity harness | §7.2 | text+test | §7.2; §7.4; subprojects/webapp/test/parity.ts (T-35) | planned |
| HLDD §9 L2293-2297 | parity comparison rules | §7.2, §7.1 | text+test | §7.2; §7.1; subprojects/webapp/test/parity.ts::exact (T-35); subprojects/webapp/test/parity.ts::tolerance (T-35); subprojects/webapp/test/parity.ts::display (T-35) | planned |
| HLDD §9 L2299-2301 | edge cases Python-first | §7.4, §3.6 | text+test | §7.4; §3.6; subprojects/python/tests/test_reference_results.py (T-16); subprojects/webapp/test/parity.ts::boundary_cases (T-35); subprojects/webapp/test/parity.ts::synthetic (T-35) | planned |
| HLDD §9 L2308-2316 | application-specific test coverage | §7.4 | test+schedule | subprojects/webapp/test/decode.test.ts (T-36); subprojects/webapp/test/fields.test.ts (T-36); subprojects/webapp/test/state.test.ts (T-36); subprojects/webapp/test/scenario-json.test.ts (T-36); IP §5 | planned |
| HLDD §9 L2333-2338 | browser-test lane | §7.5, §1 DD-3 | text+release | §1 DD-3; §7.5; §7.7 item 4 | planned |
| HLDD §9 L2340-2342 | scripted, not manual | §7.5 | text | §7.5 | designed |
| HLDD §9 L2354-2356 | DDD test inventory interactions | §7.5 | test | subprojects/webapp/playwright/specs/interactions.spec.ts (T-60) | planned |
| HLDD §9 L2357-2359 | end-to-end golden scenario | §7.5 | test | subprojects/webapp/playwright/specs/golden-scenario.spec.ts (T-60) | planned |
| HLDD §9 L2360-2361 | determinism check | §7.5 | test | subprojects/webapp/playwright/specs/determinism.spec.ts (T-60) | planned |
| HLDD §9 L2364-2367 | §6.1 state coverage | §7.5 | test | subprojects/webapp/playwright/specs/failure-states.spec.ts (T-60) | planned |
| HLDD §9 L2368-2372 | a11y + keyboard/responsive checks | §7.5 | test | subprojects/webapp/playwright/specs/a11y.spec.ts (T-60); subprojects/webapp/playwright/specs/keyboard-responsive.spec.ts (T-60) | planned |
| HLDD §9 L2374-2377 | browser tests reuse references | §7.5 | text+test | §7.5; subprojects/webapp/playwright/specs/golden-scenario.spec.ts (T-60) | planned |
| HLDD §9 L2379-2381 | tool, inventory, assertions | §7.5, §1 DD-3 | text | §1 DD-3; §7.5 | designed |
| HLDD §9 L2421-2427 | acceptance walkthroughs | §7.7 | release+owner+schedule | §7.7 item 13; OA-5; T-62 | owner-pending |
| HLDD §9 L2437-2439 | SC-5 candor acceptance | §7.7, §5.8 | text+test+release | §5.8; §5.7; subprojects/webapp/playwright/specs/golden-scenario.spec.ts (T-60); §7.7 item 6 (SC-5) | planned |
| HLDD §9 L2440-2442 | SC-6 site-integrity acceptance | §7.7, §7.5 | test+release | .github/workflows/mkdocs.yml::build / Build site (T-21); .github/workflows/mkdocs.yml::build / Build preview site (T-21); subprojects/webapp/playwright/specs/site-regression.spec.ts (T-60); §7.7 item 6 (SC-6) | planned |
| HLDD §9 L2445-2450 | SC-4 performance + SC-7 sign-off acceptance | §7.7, §7.6 | measure+release+owner | §7.6 report: workloads (T-61); §7.6 report: environment (T-59, T-61); §7.7 item 5; §7.7 item 6 (SC-7); OA-4; G-4 | owner-pending |
| HLDD §9 L2452 | test procedures and coverage | §7.1-§7.7 | text+release | §7; §8; §7.7 item 16 | planned |
| HLDD §9 L2452-2453 | IP schedules release checks | IP §3 sequence | text | IP §3; IP §4 | designed |
| HLDD §9 L2479-2482 | refresh step 7 | §7.7 | text+release | §7.7; §7.7 item 4; §7.7 item 5; §7.7 item 6; §7.7 item 13 | planned |
| HLDD §9 L2487-2489 | software-only change rule | §7.7 | text+schedule | §7.7; T-63 | designed |
| HLDD §9 L2491-2493 | version-change timing | §6.2 | text+test | §6.2; subprojects/webapp/playwright/specs/render.spec.ts (T-60) | planned |
| HLDD §9 L2508-2510 | attachment file identity | §4.4, §7.7 | text+release | §4.4; §7.7 item 11 | planned |
| HLDD §9 L2512-2513 | attachment manual vs automated | §1 DD-8, §4.4 | text | §1 DD-8; §4.4 | designed |
| HLDD §9 L2530-2532 | rollback verification | §4.3 | text+test+schedule | §4.3; .github/workflows/mkdocs.yml::build / Stage scenario assets (T-21); subprojects/webapp/test/parity.ts::fetch (T-35); T-64 | planned |
| HLDD §10 L2552 | R-16 feasibility measurements | §7.6, §3.8 | measure+release | §3.8: pending item 2 (T-11, T-61); §3.8: pending item 4 (T-61); §7.6 report: workloads (T-61); §7.6 report: environment (T-59, T-61); §7.7 item 5 | planned |
| HLDD §10 L2555 | R-19 remaining engines/mobile | §7.6 | test+measure+release | subprojects/webapp/test/compat.test.ts (T-61); §7.6 report: workloads (T-61); §7.7 item 15 | planned |
| HLDD §10 L2557 | recovery/withdrawal procedures | §4.3 | text+release+schedule | §4.3; §7.7 item 12; T-64 | planned |
| HLDD §10 L2559-2562 | complete-sequence feasibility | §7.6 | text+measure | §7.6; §7.6 report: workloads (T-61) | planned |
| HLDD §10 L2597-2599 | archival verification | §4.4 | text+owner | §4.4; OA-6 | owner-pending |
| HLDD §10 L2618 | D-10 liability text gate | §7.7 | release+owner | §7.7 item 7; G-5; OA-3 | owner-pending |
| HLDD §11 L2681-2684 | no silent override of ADRs | Introduction | text | Introduction; IP §8 | designed |
| HLDD §11 L2686-2690 | ADR-0007 errata (via ADR process) | §9 | schedule | §9 | deferred |
| HLDD §12 L2711 | binary layouts | §3.1 | text | §3.1 | designed |
| HLDD §12 L2712 | manifest/export schemas | §3.2-§3.7 | text | §3.2; §3.3; §3.4; §3.5; §3.6; §3.7 | designed |
| HLDD §12 L2713 | module interfaces | §5.1, §2 | text | §5.1; §2 | designed |
| HLDD §12 L2714-2716 | implementation algorithms | §5.2-§5.6, §5.12 | text+schedule | §5.2; §5.3; §5.4; §5.5; §5.6; §5.12; IP §5 | designed |
| HLDD §12 L2717 | CI workflow paths | §6.3 | text | §6.3 | designed |
| HLDD §12 L2718 | asset paths, version stamps | §6.1, §6.2 | text | §6.1; §6.2 | designed |
| HLDD §12 L2719 | tolerances and parity cases | §7.1, §7.2 | text | §7.1; §7.2; §3.6 | designed |
| HLDD §12 L2720-2724 | benchmark and size reporting | §7.6, §3.8 | text | §7.6; §1 DD-12; §2; §3.8 | designed |
| HLDD §12 L2725-2726 | browser-testing deliverables | §7.5, §1 DD-3 | text | §1 DD-3; §7.5 | designed |
| HLDD §12 L2727 | a11y and nav lifecycle | §5.11 | text | §5.11; §5.10 | designed |
| HLDD §12 L2728 | error-state presentation | §5.10 | text+owner | §5.10; §5.8; Introduction (Authority and change control: failure-state messages the PDD copy deck does not cover); G-4; OA-4 | owner-pending |
| HLDD §12 L2729 | data lifecycle procedures | §4.2, §4.3 | text | §4.2; §4.3 | designed |
| HLDD §12 L2731-2733 | no redefining science | Introduction | text | Introduction; §7.4; §5.13 | designed |
| HLDD §12 L2735-2737 | escalation before dependent work | Introduction | text | Introduction; IP Introduction | designed |
| HLDD §12 L2741-2742 | IP contents | IP §2 task graph, IP §3 sequence | text | IP §1; IP §2; IP §3 | designed |
| HLDD §12 L2744-2746 | IP self-sufficiency standard | IP §2 task graph | text | IP Introduction; IP §8 | designed |
| HLDD §12 L2750 | PRD authority | Introduction | text | Introduction | designed |
| HLDD §12 L2751-2752 | PDD authority | Introduction | text+test | Introduction; §5.8; .github/scripts/check_pdd_agreement.py (T-47) | planned |
| HLDD §12 L2753 | ADR authority | Introduction | text | Introduction | designed |
| HLDD §12 L2754-2755 | core Python authority | Introduction | text | Introduction | designed |
| HLDD §12 L2756-2757 | research-group authority | Introduction | text | Introduction; §9; IP §4 | designed |

### 8.2 From the PDD

| Source | Obligation | Home | Kind | Check | Status |
|---|---|---|---|---|---|
| PDD Part I — Requirements | PRD authority over requirements | Introduction | text | Introduction — Authority and change control | designed |
| PDD Part II — Product definition | how-built owned by HLDD | Introduction | text | Introduction — Authority and change control | designed |
| PDD preamble — decision statuses | decision-status semantics (Proposed/Open/Interim not closed) | Introduction, §9 | text | Introduction — Authority and change control; §9 | designed |
| PDD §1 D-1 | MVP scope and release target v0.3 | IP §2 T-65 | schedule+owner | T-65; IP §5; OA-9 | owner-pending |
| PDD §1 D-10 | liability-limitation text (D-10) authored before release | IP §3 G-5, IP §4 OA-3 | release+owner | §7.7 item 7; G-5; OA-3 | owner-pending |
| PDD §1 D-11 | small-result threshold and chart floor (D-11) | §5.13, §5.8, §5.3 | test | .github/scripts/check_pdd_agreement.py::step 4 (T-47); subprojects/webapp/test/notices.test.ts (T-43); subprojects/webapp/playwright/specs/interactions.spec.ts::GS-2, GS-4, GS-5, GS-6 (T-60) | planned |
| PDD §2.1 | existing site untouched; reference layer linked not duplicated | §5.1, §6.1 | text+test+release | §5.1; subprojects/webapp/playwright/specs/site-regression.spec.ts (T-60); §7.7 item 6 (SC-6 row) | planned |
| PDD §2.1 surface table | surface priorities P1/P2/P3 (release sequencing) | IP §5 parked | text+schedule | §6.4; IP §5 | parked |
| PDD §2.2 | entry point, navigation names and placement (D-2) | §6.1, §6.4 | text+schedule | §6.1; §6.4; T-55 | designed |
| PDD §2.4 | no native exploration panel in v0.3 (D-19) | §9 | text | §9 | designed |
| PDD §3 intro | scenario-page layout; immediate update, no submit step | §5.7, §5.3 | text+test+measure | §5.7; subprojects/webapp/playwright/specs/interactions.spec.ts (T-60); subprojects/webapp/playwright/specs/navigation-lifecycle.spec.ts (T-60); subprojects/webapp/playwright/specs/keyboard-responsive.spec.ts (T-60); §7.6 report: workloads (T-61) | planned |
| PDD §3 intro | scenario summary generated from state, never frozen text | §5.7 | text+test | §5.7; subprojects/webapp/test/summary.test.ts (T-40); subprojects/webapp/playwright/specs/consistency.spec.ts (T-60) | planned |
| PDD §3 intro | matching-record count vs per-panel valid N reconciliation | §5.3, §5.7 | text+test | §5.7; subprojects/webapp/test/parity.ts::GS-0, GS-6 (T-35); subprojects/webapp/test/parity.ts::synthetic.ensembles (T-35); §4.1 step 3 rule reference-invariants (T-12) | planned |
| PDD §3.1 | fault-dip control values and range assist | §5.7 | test | subprojects/webapp/test/scenario-controls.test.ts (T-40); subprojects/webapp/test/parse.test.ts (T-36); subprojects/webapp/playwright/specs/interactions.spec.ts (T-60) | planned |
| PDD §3.2 | sediment control enumerations (two arms) | §5.7, §3.2 | test | subprojects/webapp/test/scenario-controls.test.ts (T-40); §4.1 step 3 rule dictionary-order (T-12); §4.1 step 5 rule manifest-figures (T-12) | planned |
| PDD §3.2 | sediment selection state = arm + label combination | §5.3, §5.7 | text+test | §5.7; subprojects/webapp/test/parity.ts::synthetic.ensembles (T-35); subprojects/python/tests/test_reference_results.py (T-16); subprojects/webapp/test/summary.test.ts (T-40); subprojects/webapp/test/scenario-json.test.ts (T-36); subprojects/webapp/test/file-name.test.ts (T-45) | planned |
| PDD §3.2 | Advanced profile group disabled pending R-2 | §5.7 | text+test | §5.7; subprojects/webapp/playwright/specs/render.spec.ts (T-60) | planned |
| PDD §3.3 | depth and density control values | §5.7 | test | subprojects/webapp/test/scenario-controls.test.ts (T-40); subprojects/webapp/playwright/specs/render.spec.ts (T-60) | planned |
| PDD §3.4 | slip-window control: inclusive endpoints, data-derived range/step label, 0–max rule | §5.7 | text+test | §5.7; subprojects/webapp/test/parse.test.ts (T-36); subprojects/webapp/test/parity.ts::synthetic.ensembles, boundary_cases slip path (T-35); §4.1 step 5 rule manifest-figures (T-12); .github/scripts/check_pdd_agreement.py::step 6 (T-47); subprojects/webapp/playwright/specs/render.spec.ts (T-60) | planned |
| PDD §3.4 | default displacement-window state (D-22) | §5.6, §5.7 | test | subprojects/webapp/test/state.test.ts (T-36); subprojects/webapp/test/scenario-controls.test.ts (T-40); subprojects/webapp/test/summary.test.ts (T-40); subprojects/webapp/test/parity.ts::GS-0 (T-35) | planned |
| PDD §3.4 | literal window; data-version-dependent selectable maximum; no-window final-state rule | §5.3, §5.7 | test | subprojects/webapp/test/parity.ts::GS-7, boundary_cases slip path (T-35); subprojects/webapp/test/parity.ts::synthetic.ensembles (T-35); subprojects/webapp/test/parse.test.ts (T-36); subprojects/webapp/playwright/specs/failure-states.spec.ts (T-60); subprojects/python/tests/test_scenario_export.py::test_full_* (T-14) | planned |
| PDD §3.5 | offset mode: no silent conversion; assist-panel contents and per-dip flags | §5.5, §5.7 | test | subprojects/webapp/playwright/specs/interactions.spec.ts (T-60); subprojects/webapp/playwright/specs/golden-scenario.spec.ts (T-60); subprojects/webapp/test/parity.ts::GS-1 (T-35); .github/scripts/check_pdd_agreement.py::step 6 (T-47) | planned |
| PDD §3.5 | offset-to-slip conversion semantics (0 to max, per-dip endpoints) | §5.5 | test | subprojects/webapp/test/parity.ts::GS-1 (T-35); subprojects/webapp/test/parity.ts::synthetic.conversion (T-35); subprojects/webapp/test/parity.ts::boundary_cases offset path (T-35); subprojects/python/tests/test_reference_results.py (T-16); §4.1 step 3 rule coefficient-reach (T-12) | planned |
| PDD §3.5 | invalid-entry rejection rules (§5.6 message) | §5.7, §5.10 | test | subprojects/webapp/playwright/specs/failure-states.spec.ts (T-60); subprojects/webapp/test/parse.test.ts (T-36); .github/scripts/check_pdd_agreement.py::step 6 (T-47) | planned |
| PDD §3.6 | multi-dip conversion rule (D-3): per-dip windows, union of matches | §5.3, §5.5 | test | subprojects/webapp/test/parity.ts::GS-1 (T-35); subprojects/webapp/test/parity.ts::synthetic.ensembles (T-35); §4.1 step 3 rule coefficient-reach (T-12) | planned |
| PDD §3.7 Population | population switch semantics and selection order | §5.3, §5.7 | test+release | subprojects/webapp/test/parity.ts::synthetic.ensembles (T-35); subprojects/python/tests/test_reference_results.py (T-16); subprojects/webapp/test/parity.ts::GS-2, GS-5, GS-7 (T-35); subprojects/webapp/test/summary.test.ts (T-40); §7.7 item 6 (SC-5 row) | planned |
| PDD §3.7 Scarp-type filter | scarp-type filter semantics, labels, and default no-filter token | §5.3, §5.7 | test | subprojects/webapp/test/parity.ts::synthetic.ensembles (T-35); subprojects/webapp/test/parity.ts::GS-0 (T-35); subprojects/webapp/test/summary.test.ts (T-40); .github/scripts/check_pdd_agreement.py::step 6 (T-47) | planned |
| PDD §3.7 Scarp-family view | family-view toggle (D-13): label, fold rule, disable condition | §5.8, §6.4 | test | subprojects/webapp/test/scenario-controls.test.ts (T-40); subprojects/webapp/test/state.test.ts (T-36); subprojects/webapp/test/chart-text.test.ts (T-41); subprojects/webapp/playwright/specs/a11y.spec.ts (T-60); .github/scripts/check_pdd_agreement.py::step 6 (T-47) | planned |
| PDD §3.7 Scarp-family view | chart presentation details adopted by citation (ADR-0007), not redefined | §5.8 | text | §5.8 | designed |
| PDD §3.7 Reset | reset behavior over every control | §5.7, §5.6 | test | subprojects/webapp/test/state.test.ts (T-36); subprojects/webapp/playwright/specs/interactions.spec.ts (T-60) | planned |
| PDD §3.8 | inverse mode (P2): inputs, header copy, magnitude never an input | §5.14 | text+schedule | §5.14; IP §5 | parked |
| PDD §4.1 | measurement panels: views, pre-marked percentiles, N at panel head | §5.8, §5.12 | test | subprojects/webapp/playwright/specs/render.spec.ts (T-60); subprojects/webapp/playwright/specs/golden-scenario.spec.ts (T-60); subprojects/webapp/playwright/specs/a11y.spec.ts (T-60); subprojects/webapp/playwright/specs/keyboard-responsive.spec.ts (T-60); subprojects/webapp/test/parity.ts::percentiles (T-35) | planned |
| PDD §4.1 | default panel on load; width-scope note always carried | §5.8, §5.11 | text+test | §5.8; §5.11; subprojects/webapp/playwright/specs/mount.spec.ts (T-60); subprojects/webapp/playwright/specs/golden-scenario.spec.ts (T-60) | planned |
| PDD §4.1 | panel arrangement (tabs vs stacked) left open to design | §1, §5.8 | text+test | §1 DD-4; §5.8; subprojects/webapp/playwright/specs/render.spec.ts (T-60) | planned |
| PDD §4.1 | histogram bin rule (fixed and stated) and log-scale toggle | §1, §5.12, §5.8 | text+test | §1 DD-5; §5.12; subprojects/webapp/test/parity.ts::histogram, histogram_log, synthetic.histograms, PDD §4.1 transcription (T-35); subprojects/webapp/test/histogram.test.ts (T-32); subprojects/python/tests/test_reference_results.py (T-16); subprojects/webapp/playwright/specs/render.spec.ts (T-60); subprojects/webapp/playwright/specs/interactions.spec.ts (T-60); .github/scripts/check_pdd_agreement.py (T-47) | planned |
| PDD §4.1 | Us − Ud fourth measurement out of MVP; slot reserved (D-20) | §3.1, §5.8, §9 | text | §3.1; §5.8; §9 | designed |
| PDD §4.2 | statistics table: statistic set, render states, framing head | §5.8 | text+test | §5.8; subprojects/webapp/test/views-text.test.ts (T-32, T-42); subprojects/webapp/test/parity.ts::statistics, display (T-35); subprojects/webapp/playwright/specs/golden-scenario.spec.ts (T-60); subprojects/webapp/playwright/specs/a11y.spec.ts::GS-5 (T-60); .github/scripts/check_pdd_agreement.py::step 6 (T-47) | planned |
| PDD §4.2 | reader-facing display precision per quantity (D-23) | §5.13, §5.8 | test | .github/scripts/check_pdd_agreement.py::step 4 (T-47); subprojects/webapp/test/parity.ts::D-23 transcription, display (T-35); subprojects/webapp/test/views-text.test.ts (T-32, T-42); subprojects/python/tests/test_reference_results.py (T-16) | planned |
| PDD §4.3 | unclassified-record population semantics (D-12) | §5.3, §3.1 | test | subprojects/webapp/test/parity.ts::GS-0 (T-35); subprojects/webapp/test/parity.ts::synthetic.ensembles (T-35); §4.1 step 3 rule null-counts (T-12); §4.1 step 3 rule unclassified-has-no-valid-measurement (T-12); subprojects/python/tests/test_reference_results.py::test_full_* (T-14) | planned |
| PDD §4.3 | unclassified exclusions, added statistics line, neutral-gray fallback | §5.8, §5.12 | text+test | §5.12; subprojects/webapp/test/views-text.test.ts (T-32, T-42); subprojects/webapp/playwright/specs/golden-scenario.spec.ts (T-60); subprojects/webapp/test/parity.ts::GS-0, GS-6 (T-35); §4.1 step 3 rule unclassified-has-no-valid-measurement (T-12) | planned |
| PDD §4.4 | field-overlay default set, per-source analogue map, labels (D-18) | §3.4, §5.8 | owner+test+schedule | subprojects/python/tests/test_field_export.py (T-16); subprojects/python/tests/test_field_export.py::test_full_* (T-14); §4.1 step 3 rule view-reread (T-12); subprojects/webapp/test/field-overlay.test.ts (T-49); subprojects/webapp/playwright/specs/interactions.spec.ts (T-60); subprojects/webapp/playwright/specs/render.spec.ts (T-60); .github/scripts/check_pdd_agreement.py::step 6 (T-47); OA-14; T-55 | owner-pending |
| PDD §4.5 | warning and chart-suppression tiers (D-11: 30 and 10) | §5.8, §5.13 | test | subprojects/webapp/playwright/specs/interactions.spec.ts::GS-2, GS-5 (T-60); subprojects/webapp/playwright/specs/a11y.spec.ts::GS-5 (T-60); subprojects/webapp/test/notices.test.ts (T-43); .github/scripts/check_pdd_agreement.py::step 4 (T-47) | planned |
| PDD §4.5 | empty-result single-condition diagnostic; combinations out of scope | §5.3 | text+test | §5.3; subprojects/webapp/test/parity.ts::GS-4, synthetic.ensembles (T-35); subprojects/python/tests/test_reference_results.py (T-16); subprojects/webapp/playwright/specs/interactions.spec.ts::GS-4 (T-60); subprojects/webapp/test/notices.test.ts (T-43) | planned |
| PDD §4.5 | no-valid-measurement state distinct from no-match state | §5.8, §5.3 | test | subprojects/webapp/playwright/specs/interactions.spec.ts::GS-6 (T-60); subprojects/webapp/test/parity.ts::GS-6 (T-35); subprojects/webapp/test/notices.test.ts (T-43); subprojects/webapp/playwright/specs/failure-states.spec.ts (T-60) | planned |
| PDD §4.5 | partial-coverage note; notice precedence (exactly one §5.8 notice) | §5.8 | test | subprojects/webapp/playwright/specs/interactions.spec.ts (T-60); subprojects/webapp/test/notices.test.ts (T-43); subprojects/webapp/playwright/specs/failure-states.spec.ts (T-60) | planned |
| PDD §4.6 | interim low-slip caveat trigger 0.5 m; no-fire on default state (D-4) | §5.8, §5.13 | test | .github/scripts/check_pdd_agreement.py::step 4 (T-47); subprojects/webapp/playwright/specs/golden-scenario.spec.ts (T-60); subprojects/webapp/test/notices.test.ts (T-43) | planned |
| PDD §4.6 | low-slip threshold owned by research group (R-3); never a validity boundary | Introduction, §5.13 | text | Introduction — Authority and change control; §5.13; §5.4 | designed |
| PDD §4.7 | Kern County preset contents and walkthrough steps | §5.8, §3.4 | text+owner+schedule | §5.8; §3.4; OA-2; T-48 | owner-pending |
| PDD §4.7 | Kern preset ships only after D-6 (release sequencing) | IP §2 T-48, IP §3 sequence, IP §4 OA-2 | schedule+owner | T-48; OA-2 | owner-pending |
| PDD §4.8 | inverse-mode results (P2): condition panels, N semantics, accessible table | §5.14 | text+schedule | §5.14; IP §5 | parked |
| PDD §5 preamble | copy deck canonical; CR-10 approval gate | Introduction, §5.8 | text+test+owner | Introduction — Verification contract; §5.8; .github/scripts/check_pdd_agreement.py (T-47); G-4; OA-4 | owner-pending |
| PDD §5.1 | standing disclaimer text and placement (D-10 placeholder pending) | §5.8, §6.1 | test+release+owner | .github/scripts/check_pdd_agreement.py::step 7 (T-47); subprojects/webapp/playwright/specs/render.spec.ts (T-60); subprojects/webapp/playwright/specs/mount.spec.ts (T-60); subprojects/webapp/playwright/specs/failure-states.spec.ts (T-60); §7.7 item 7; G-5; OA-3 | owner-pending |
| PDD §5.2 | short disclaimer copy | §5.8 | test | .github/scripts/check_pdd_agreement.py::step 6 (T-47); subprojects/webapp/playwright/specs/failure-states.spec.ts (T-60); subprojects/webapp/playwright/specs/mount.spec.ts (T-60) | planned |
| PDD §5.3 | population explainer copy | §5.8, §5.7 | text+test+release | §5.8; .github/scripts/check_pdd_agreement.py::step 6 (T-47); §7.7 item 6 (SC-5 row) | planned |
| PDD §1 D-5 + §5.4 | scarp-dip provisional notice copy, shown everywhere scarp dip appears (D-5) | §5.8 | text+test+release | §5.8; §5.9; .github/scripts/check_pdd_agreement.py::step 6 (T-47); subprojects/webapp/playwright/specs/golden-scenario.spec.ts (T-60); §7.7 item 6 (SC-5 row) | planned |
| PDD §5.5 | statistics framing copy | §5.8 | text+test | §5.8; .github/scripts/check_pdd_agreement.py::step 6 (T-47) | planned |
| PDD §5.6 | conversion-assist copy: main text, per-dip out-of-range line, rejected-entry line | §5.8, §5.5, §5.7, §5.10 | test | .github/scripts/check_pdd_agreement.py::step 6 (T-47); subprojects/webapp/playwright/specs/interactions.spec.ts::GS-1 (T-60); subprojects/webapp/playwright/specs/failure-states.spec.ts (T-60) | planned |
| PDD §5.7 | field-overlay framing copy and width-scope note (placement rule) | §5.8 | text+test | §5.8; .github/scripts/check_pdd_agreement.py::step 6 (T-47); subprojects/webapp/playwright/specs/golden-scenario.spec.ts (T-60) | planned |
| PDD §5.8 | four small/empty-result notice texts | §5.8 | test | subprojects/webapp/test/notices.test.ts (T-43); subprojects/webapp/playwright/specs/interactions.spec.ts::GS-2, GS-4, GS-5, GS-6 (T-60); .github/scripts/check_pdd_agreement.py::step 6 (T-47) | planned |
| PDD §5.9 | low-slip caveat copy | §5.8 | test+release | .github/scripts/check_pdd_agreement.py::step 6 (T-47); subprojects/webapp/playwright/specs/golden-scenario.spec.ts (T-60); §7.7 item 6 (SC-5 row) | planned |
| PDD §5.10 | inverse-search framing copy (P2) | §5.8, §5.14 | text+schedule | §5.8; §5.14; IP §5 | parked |
| PDD §5.11 | canonical labels and units | §5.8, §5.7, §5.12 | test | .github/scripts/check_pdd_agreement.py::step 6 (T-47); subprojects/webapp/playwright/specs/a11y.spec.ts (T-60); subprojects/webapp/test/chart-text.test.ts (T-41) | planned |
| PDD §5.11 | first-use glossary-link anchor map | §5.8 | test+release | subprojects/webapp/playwright/specs/render.spec.ts (T-60); .github/scripts/check_pdd_agreement.py::step 6 (T-47); §7.7 item 8 | planned |
| PDD §5.11 | glossary additions before launch | §6.4, IP §2 T-52 | text+schedule+release+owner | §6.4 (Glossary additions); T-52; §7.7 item 8; G-4; OA-4 | owner-pending |
| PDD §5.12 | six morphology description texts (research-group review required) | §6.4, §5.8 | text+owner+schedule | §6.4; §5.13; G-4; IP §5 | parked |
| PDD §5.13 | measurement explanation copy (figure reference and R-14 slot) | §6.4 | text+schedule | §6.4; §5.13; IP §5 | parked |
| PDD §6.1 | download package contents and provenance field order; field data excluded | §5.9 | text+test | §5.9; §1 DD-11; subprojects/webapp/test/downloads.test.ts (T-45); subprojects/webapp/test/zip.test.ts (T-45); subprojects/webapp/test/scenario-json.test.ts (T-36); subprojects/webapp/playwright/specs/consistency.spec.ts (T-60) | planned |
| PDD §6.2 | download file-name template | §5.9 | test | subprojects/webapp/test/file-name.test.ts (T-45); subprojects/webapp/playwright/specs/interactions.spec.ts (T-60) | planned |
| PDD §6.2 | exact scenario-slug rules left to implementation | §1, §5.9 | text+test | §1 DD-6; §5.9; subprojects/webapp/test/file-name.test.ts (T-45) | planned |
| PDD §6.3 | chart-export caption strip and sidecar (D-14, P2) | §5.12 | text+schedule | §5.12; IP §5 | parked |
| PDD §6.4 | dominance rule (D-7): denominator, gap, floor, minimum, tie-breaks, suppression | §5.8, §5.13 | text+schedule | §5.8; §5.13; IP §5 | parked |
| PDD §6.4 | animation-offer introduction copy | §5.8 | text+schedule | §5.8; IP §5 | parked |
| PDD §7.1 | shared-link URL state inventory (P2) | §5.6 | text+schedule | §5.6; §1 DD-11; IP §5 | parked |
| PDD §7.2 | shared-link version notice rule and copy (D-15) | §5.6, §6.2 | text+schedule | §5.6; §6.2; IP §5 | parked |
| PDD §8.1 | morphology page composition | §6.4 | text+test+schedule | §6.4; subprojects/webapp/playwright/specs/render.spec.ts (T-60); subprojects/webapp/playwright/specs/navigation-lifecycle.spec.ts (T-60); IP §5 | parked |
| PDD §8.1 | third-party photos removed or cleared before public release | IP §3 G-6, IP §4 OA-8 | test+release+owner | subprojects/mkdocs/hooks/site_checks.py arms (a), (b) (T-03); §7.7 item 9; §7.7 item 10; G-6; OA-8 | owner-pending |
| PDD §8.2 | animation library entry fields and not-yet-available fallback copy | §3.7, §6.4 | text+schedule | §3.7; §6.4; IP §5 | parked |
| PDD §8.2 | animation coverage for release decided by research group (D-8) | §6.4 | text+schedule | §6.4; IP §5 | parked |
| PDD §8.3 | measurement page composition; statistics-table link copy | §6.4, §5.8 | text+schedule | §6.4; §5.8; IP §5 | parked |
| PDD §8.4 | contact page content gated on research-group-approved URLs (R-15) | §6.4 | text+schedule | §6.4; IP §5 | parked |
| PDD §9.1 | performance budgets and reference conditions (D-9) | §7.6, §1 DD-12, §2 | text+measure+owner | §7.6; §1 DD-12; ADR-0016; §7.6 report: workloads (T-61); §7.6 report: network (T-61); §7.6 report: environment (T-59, T-61); OA-12 | owner-pending |
| PDD §9.1 | first-meaningful-render benchmark end point | §7.6 | text+measure | §7.6; §7.6 report: workloads (T-61) | planned |
| PDD §9.1 | budget means owned by HLDD; heavy-runtime ban | Introduction, §2 | text | Introduction — Authority and change control; §2 | designed |
| PDD §9.2 | browser and mobile baseline (D-16) | §7.6, §5.11 | test+release | subprojects/webapp/test/compat.test.ts (T-61); subprojects/webapp/playwright/specs/keyboard-responsive.spec.ts (T-60); §7.7 item 1; §7.7 item 15 | planned |
| PDD §9.3 | accessibility target and chart text alternatives (D-17) | §5.11 | test+release | subprojects/webapp/playwright/specs/a11y.spec.ts (T-60); subprojects/webapp/playwright/specs/keyboard-responsive.spec.ts (T-60); subprojects/webapp/test/chart-text.test.ts (T-41); §7.7 item 14 | planned |
| PDD §9.4 | release versioning display and cache-busting convention | §6.2, §5.8 | test+measure | subprojects/webapp/playwright/specs/render.spec.ts (T-60); subprojects/webapp/playwright/specs/consistency.spec.ts (T-60); subprojects/mkdocs/hooks/site_checks.py arm (c) (T-51); §7.6 report: workloads (T-61) | planned |
| PDD §10.1 SC-1 | SC-1 core-workflow acceptance | §7.7 | release+owner+schedule | §7.7 item 6 (SC-1 row); §7.7 item 13; T-62; G-2; OA-5 | owner-pending |
| PDD §10.1 SC-2 | SC-2 download reproducibility | §7.7, §5.9 | test+release+owner | subprojects/webapp/playwright/specs/consistency.spec.ts (T-60); subprojects/webapp/test/downloads.test.ts (T-45); subprojects/webapp/test/scenario-json.test.ts (T-36); §7.7 item 6 (SC-2 row); G-2; OA-5 | owner-pending |
| PDD §10.1 SC-3 | SC-3 correctness parity with pipeline reference | §7.2, §7.7 | test+release | subprojects/webapp/test/parity.ts (T-35); subprojects/webapp/playwright/specs/golden-scenario.spec.ts (T-60); §7.7 item 1; §7.7 item 4; §7.7 item 6 (SC-3 row) | planned |
| PDD §10.1 SC-4 | SC-4 performance budgets benchmark | §7.6, §7.7 | measure+release | §7.6 report: workloads (T-61); §7.6 report: environment (T-59, T-61); §7.7 item 5; §7.7 item 6 (SC-4 row) | planned |
| PDD §10.1 SC-5 | SC-5 caveat presence in default view | §5.8, §7.7 | text+test+release+owner | §5.8; subprojects/webapp/playwright/specs/golden-scenario.spec.ts (T-60); §7.7 item 6 (SC-5 row); G-3 | owner-pending |
| PDD §10.1 SC-6 | SC-6 site integrity (strict build, no regressions) | §7.7, §6.3 | text+test+release+owner | §6.3; subprojects/webapp/playwright/specs/site-regression.spec.ts (T-60); §7.7 item 1; §7.7 item 6 (SC-6 row); G-3 | owner-pending |
| PDD §10.1 SC-7 | SC-7 research-group sign-off gate | IP §3 G-4, IP §4 OA-4 | test+release+owner | .github/scripts/check_pdd_agreement.py::step 8 (T-47); §7.7 item 6 (SC-7 row); G-4; OA-4 | owner-pending |
| PDD §10.1 tolerance note | pipeline statistical definitions and reference values authoritative | Introduction | text | Introduction — Authority and change control; §3.6; §7.4 | designed |
| PDD §10.1 tolerance note | numerical tolerance per calculation to be defined | §7.1 | text+test | §7.1; §1 DD-2; subprojects/webapp/test/parity.ts::tolerance (T-35); subprojects/python/tests/test_reference_results.py::test_full_display_tie_census (T-14); subprojects/python/tests/test_reference_results.py::test_full_evaluation_order_effect (T-14) | planned |
| PDD §10.1 tolerance note | displayed values equal correspondingly rounded pipeline reference | §7.2, §5.8 | test | subprojects/webapp/test/parity.ts::display, synthetic.display_rounding (T-35); subprojects/webapp/playwright/specs/golden-scenario.spec.ts (T-60); subprojects/webapp/test/views-text.test.ts (T-32, T-42); subprojects/python/tests/test_reference_results.py (T-16) | planned |
| PDD §10.2 preamble | golden-scenario numbers owned by pipeline, not redefined downstream | §3.6, Introduction | text+test | §3.6; §7.4; subprojects/python/tests/test_reference_results.py::test_full_* (T-14) | planned |
| PDD §10.2 GS-0 | GS-0 full-ensemble counts | §3.6, §7.2 | test | subprojects/webapp/test/parity.ts::GS-0 (T-35); subprojects/python/tests/test_reference_results.py::test_full_* (T-14); subprojects/python/tests/test_scenario_export.py::test_full_* (T-14) | planned |
| PDD §10.2 GS-1 | GS-1 per-dip conversion scenario | §3.6, §7.2, §7.5 | test | subprojects/webapp/test/parity.ts::GS-1, boundary_cases offset path (T-35); subprojects/webapp/playwright/specs/golden-scenario.spec.ts (T-60); subprojects/python/tests/test_reference_results.py::test_full_* (T-14) | planned |
| PDD §10.2 GS-2 | GS-2 warning tier (18 valid) | §3.6, §7.2, §7.5 | test | subprojects/webapp/playwright/specs/interactions.spec.ts::GS-2 (T-60); subprojects/webapp/test/parity.ts::GS-2 (T-35); subprojects/python/tests/test_reference_results.py::test_full_* (T-14) | planned |
| PDD §10.2 GS-3 | GS-3 Kern preset reproduction (after D-6) | §3.6, §7.2 | test+owner+schedule | subprojects/webapp/test/parity.ts::GS-3 (T-35); OA-2; T-48 | owner-pending |
| PDD §10.2 GS-4 | GS-4 empty-result diagnostic | §3.6, §7.2, §7.5 | test | subprojects/webapp/test/parity.ts::GS-4 (T-35); subprojects/webapp/playwright/specs/interactions.spec.ts::GS-4 (T-60); subprojects/python/tests/test_reference_results.py::test_full_* (T-14) | planned |
| PDD §10.2 GS-5 | GS-5 suppression tier (9 valid) | §3.6, §7.2, §7.5 | test | subprojects/webapp/playwright/specs/interactions.spec.ts::GS-5 (T-60); subprojects/webapp/test/parity.ts::GS-5 (T-35); subprojects/python/tests/test_reference_results.py::test_full_* (T-14) | planned |
| PDD §10.2 GS-6 | GS-6 count-vs-validity split | §3.6, §7.2, §7.5 | test | subprojects/webapp/test/parity.ts::GS-6 (T-35); subprojects/webapp/playwright/specs/interactions.spec.ts::GS-6 (T-60); subprojects/python/tests/test_reference_results.py::test_full_* (T-14) | planned |
| PDD §10.2 GS-7 | GS-7 no-window one-state rule | §3.6, §7.2 | test | subprojects/webapp/test/parity.ts::GS-7, boundary_cases slip path (T-35); subprojects/python/tests/test_scenario_export.py::test_full_* (T-14); subprojects/python/tests/test_reference_results.py::test_full_* (T-14) | planned |
| PDD §10.3 | scripted acceptance walkthroughs before release | IP §2 T-62 | schedule+release+owner | T-62; §7.7 item 13; G-2; OA-5 | owner-pending |
| PDD §11 | ownership boundaries: HLDD/ADRs, research group (Open rows), PRD | Introduction, §9 | text | Introduction — Authority and change control; §9 | designed |

### 8.3 From the PRD and notes/Roadmap.md

| Source | Obligation | Home | Kind | Check | Status |
|---|---|---|---|---|---|
| PRD §2.2 | MVP success criteria and acceptance walkthroughs — PDD owns; IP acceptance checks must trace to PDD, not be reinvented | §7.7 | text | §7.7 (Success criteria and their verifying artifacts, the criteria PDD §10.1's, item 13 citing PDD §10.3); IP §3 (gates are the PDD's criteria, nothing new) | designed |
| PRD §2.3 | per-surface technical choice (link/embed/native) — HLDD+ADR own; DDD elaborates, does not re-decide | Introduction, §5.1 | text | Introduction (Authority and change control); §5.1 (dashboards linked, never embedded, per HLDD §4.2) | designed |
| PRD §4 intro | PDD recorded decisions govern over story examples (e.g. US-1 per-dip conversion) | Introduction, §5.5 | text | Introduction (Authority and change control); §5.5 (the PDD §3.6 multi-dip rule, D-3, applied over US-1's example) | designed |
| PRD §5 intro | decision split: product definition → PDD, technical platform → HLDD; DDD must not independently redefine either | Introduction | text | Introduction (Authority and change control) | designed |
| PRD §5.1 FR-S5 | multi-dip converted-window behavior — PDD owns (see §9.5 row 3) | §5.5 | text+test | §5.5; §5.3 (each dip's own window); subprojects/webapp/test/parity.ts::GS-1 (T-35); subprojects/webapp/playwright/specs/interactions.spec.ts (T-60) | planned |
| PRD §5.6 FR-G5 | dashboard-surface implementation decision recorded in HLDD + ADR; not DDD's to make | Introduction, §5.1 | text | Introduction (Authority and change control); §5.1 (HLDD §4.2 surface map, ADR-0010, cited) | designed |
| PRD §6 intro | data design must preserve four-way distinction (simulation records / derived statistics / field measurements / reader-facing exports) | §3 | text | §3 (chapter introduction: the four-way distinction); §3.1; §3.4; §3.5; §3.6 | designed |
| PRD §6.1 DR-1 | no displayed number outside pipeline-derived versioned exports (never hardcoded) | Introduction | text+test | Introduction (Verification contract); .github/scripts/check_pdd_agreement.py::step 5 (T-47); subprojects/webapp/test/parity.ts (T-35); subprojects/webapp/playwright/specs/golden-scenario.spec.ts (T-60) | planned |
| PRD §6.1 DR-1 | dem.csv excluded as primary data source for the app | §3 | text | §3 (chapter introduction: dem.csv is not a product input); §4.1 step 1 (run-private views, provenance inputs) | designed |
| PRD §6.1 DR-1 | front-end scenario statistics tested against pipeline-computed reference results for defined scenarios | §7.2 | test | subprojects/webapp/test/parity.ts (T-35); .github/workflows/tests.yml::webapp-test / Parity (T-23); .github/workflows/mkdocs.yml::webapp-bundle / Parity (T-23) | planned |
| PRD §6.1 DR-1 | ban on untested front-end logic behind reader-visible numbers | §7.2, §7.5 | test+text | subprojects/webapp/test/parity.ts::exact, tolerance, display (T-35); subprojects/webapp/playwright/specs/golden-scenario.spec.ts (T-60); §7.4 (Pipeline-first rule) | planned |
| PRD §6.1 DR-1 | aggregation-vs-row-level data strategy — HLDD owns; DDD elaborates within it and must keep combined filtering | Introduction, §3.1 | text+test | Introduction (Authority and change control); §3.1 (HLDD §5.2 and ADR-0013 row-level artifact); §5.3 (combined filtering); subprojects/webapp/test/parity.ts (T-35) | planned |
| PRD §6.1 DR-2 | export format must carry identifiable version + export date, surfaced in results and downloads | §3.2, §6.2, §5.8, §5.9 | test | §4.1 step 5 rules format-spec, envelope-agreement (T-12); subprojects/webapp/playwright/specs/render.spec.ts::footer (T-60); subprojects/webapp/playwright/specs/consistency.spec.ts::download provenance (T-60); subprojects/webapp/test/downloads.test.ts (T-45) | planned |
| PRD §6.1 DR-2 | versioned app artifacts produced by data prep and pinned from the repository (CI cannot rebuild pipeline) | §4.1, §4.2, §3.3 | text+test+release | §4.1; §4.2; §3.3; §4.1 step 6 rule pointer-exact (T-12); .github/workflows/mkdocs.yml::build / Stage scenario assets (T-21); §7.7 item 3 | planned |
| PRD §6.2 DR-3 | one-state-per-trial: tested pipeline view must exist before product use (ordering constraint) | §3.6, §3.1, §7.3 | test+schedule | subprojects/python/tests/test_reference_results.py::test_full_* (T-14); subprojects/python/tests/test_scenario_export.py::test_full_* (T-14); §4.1 step 3 rule slip-order (T-12); T-10; T-13; T-18; T-35 | planned |
| PRD §6.2 DR-3 | one-state-per-trial selection rule (highest slip in window; else actual final state) | §5.3 | text+test | §5.3 (population rule); subprojects/webapp/test/parity.ts::GS-7, boundary_cases, synthetic (T-35); subprojects/python/tests/test_reference_results.py (T-16) | planned |
| PRD §6.2 DR-3 | Tableau-only calculation excluded as sole definition of the population rule | Introduction | text | Introduction (Authority and change control); §3.6 (the reference generator defines the population, pipeline-first) | designed |
| PRD §6.2 DR-3 | pipeline-view test content: 3,434 trials expected, no ties at each trial's maximum slip | §7.3 | test | subprojects/python/tests/test_scenario_export.py::test_full_* (T-14); §4.1 step 3 rules counts, slip-order (T-12) | planned |
| PRD §6.2 DR-4 | measurement-hygiene policy (nulls, small negatives, low-slip records) defined in pipeline, applied consistently everywhere | §3.1, §5.4, §5.8 | text+test | §3.1 (null sentinels, negatives carried as-is); §5.4 (never re-filters, clamps, or excludes); §5.8 (unclassified line, caveats); §5.9 (nulls written as empty fields); §4.1 step 3 rules bitwise-restore, null-counts, sentinel-collision (T-12); subprojects/webapp/test/parity.ts::presence (T-35) | planned |
| PRD §6.2 DR-4 | low-slip start-value treatment — research group owns; no document may decide it implicitly | Introduction, §5.8 | text | Introduction (Authority and change control); §5.8 (Caveats: low-slip caveat, D-4 interim, threshold from §5.13); §5.4 (no re-filtering) | designed |
| PRD §6.2 DR-5 | field-event name normalization in pipeline, with source identifiers and provenance retained | §3.4 | text+test | §3.4 (eq_name pipeline-normalized, source and source_quantity verbatim); §4.1 step 3 rule view-reread (T-12); subprojects/python/tests/test_field_export.py (T-16); subprojects/python/tests/test_field_export.py::test_full_* (T-14) | planned |
| PRD §6.3 DR-6 | payload ceiling: no 73 MB flat export (or comparably large payload) on initial load; no prolonged repeat-visit loading | §3.8, §7.6 | measure+release+text | §3.8: Selected row (T-11, T-17); §7.6 report: workloads (T-61); §7.6 report: environment (T-59, T-61); §7.7 item 5; §5.2 (Lazy exports) | planned |
| PRD §6.3 DR-6 | initial-payload budget — PDD owns the number; export format/caching/precomputation — HLDD owns; DDD works inside both | §7.6, §3.1, §6.1 | text | §7.6 (budgets quoted from PDD §9.1); §3.1 (HLDD §5.2 and ADR-0013 format); §6.1 (HLDD §7.3 delivery and caching, by citation); §5.3 (combined filtering kept) | designed |
| PRD §6.3 DR-7 | export schema carries source/model-family/case dimension; no hard-coded 2D-only assumptions | §3.1, §3.2 | text+test | §3.1 (model_family column, schema_version); §3.2 (reserved scenario_artifact_<family> keys); §4.1 step 5 rule format-spec (T-12); §9 | planned |
| PRD §8.1 NFR-2 | static-site constraint: no backend; deploy from main via existing GitHub Pages site/build/URL space | §6.1, §6.3 | text | §6.3 (deploy: three-layer main-only gating); §6.1 (Transport contract: own-origin fetch, the shared URL space and build); §5.3; §5.9 (client-side engine and downloads) | designed |
| PRD §8.2 NFR-3 | performance budgets and their test conditions come from the PDD; implementation must be benchmarked against them | §7.6 | text+measure+release | §7.6 (budgets and reference conditions quoted from PDD §9.1); §1 DD-12 (the reference environment PDD §9.1 leaves to this document); §7.6 report: workloads (T-61); §7.6 report: network (T-61); §7.6 report: environment (T-59, T-61); §7.7 item 5 | planned |
| PRD §8.3 NFR-5 | failure/version-mismatch behavior: page-vs-export expected-version check and plain failure reporting | §5.10, §6.2, §5.2 | text+test | §6.2 (Runtime check); §5.2 step 1 (kind 'data-version'); §5.10; subprojects/webapp/test/decode.test.ts (T-36); subprojects/webapp/playwright/specs/failure-states.spec.ts (T-60); subprojects/webapp/playwright/specs/navigation-lifecycle.spec.ts::stamp change (T-60) | planned |
| PRD §8.4 NFR-6 | licensing model preserved (Apache-2.0 / CC BY 4.0 / publisher terms); third-party media release-gated on permissions held elsewhere | §4.4, §7.7 | text+test+release+owner | §4.4 (Vintage terms: data-terms-<h12>.txt, a byte copy of data/REDISTRIBUTION.md); §4.2 step 1 (the OA-1 record gate); subprojects/mkdocs/hooks/site_checks.py arms (a), (b) (T-03); §7.7 item 9; §7.7 item 10; §7.7 item 17; G-6; OA-8; OA-13 | owner-pending |
| PRD §8.5 NFR-7 | strict build gate: fail on warnings or broken links per existing repo rules | §6.3, §7.7 | test+release | .github/workflows/mkdocs.yml::build / Build site (T-21); .github/workflows/mkdocs.yml::build / Build preview site (T-21); subprojects/mkdocs/hooks/site_checks.py (T-03, T-51); §7.7 item 1 | planned |
| PRD §8.5 NFR-7 | derived-value reference tests as a build/data-quality gate (restates DR-1) | §7.2 | test+owner | subprojects/webapp/test/parity.ts (T-35); .github/workflows/tests.yml::webapp-test / Parity (T-23); .github/workflows/mkdocs.yml::webapp-bundle / Parity (T-23); OA-10 | owner-pending |
| PRD §8.5 NFR-7 | cache-busting convention: asset address changes when content changes | §6.1, §6.2 | text+test+measure | §6.1 (content-hashed app-<hash> and vintage file names); §6.2 (Cache busting); §4.1 step 6 rule file-names (T-12); subprojects/mkdocs/hooks/site_checks.py arm (c) (T-51); §7.6 report: workloads (T-61) | planned |
| PRD §8.5 NFR-7 | per-release regression check on existing site surfaces | §7.5, §7.7 | test+release | subprojects/webapp/playwright/specs/site-regression.spec.ts (T-60); §7.7 item 4; §7.7 item 6 | planned |
| PRD §8.5 NFR-8 | ADR process: platform decision and any new toolchain the DDD/IP introduces must be recorded in an ADR | Introduction, §2 | owner+text | ADR-0016; OA-12 | owner-pending |
| PRD §9.2 R-11 | entry point — product owner + research group own; must be resolved before detailed design (gates the DDD) | §6.1 | text | §6.1 (Page scaffold, Activation: PDD §2.2, D-2 Decided 2026-10-28, cited) | designed |
| PRD §9.4 R-16 | payload-vs-filtering strategy — Architect/HLDD own; DDD inherits 'meet DR-6 and NFR-3 without weakening required filtering' | §3.8, §7.6 | measure+text+release | §3.8: pending items 1, 2, and 4 (T-11, T-61); §7.6 report: workloads (T-61); §7.6 report: environment (T-59, T-61); §5.3 (combined filtering over the ADR-0013 artifact); §7.7 item 5 | planned |
| PRD §9.4 R-17 | versioned app-ready artifacts pinned from the repo; owner-controlled refresh process must be documented | §4.2, §3.3, §6.2 | text+release | §4.2 (publishVintage, steps 1–11); §3.3; §7.7 (Two release shapes); IP §3 (refresh sequence); §7.7 item 3 | planned |
| PRD §9.4 R-18 | pre-release acceptance tests: navigation, dashboard links/embeds, citation material, full Pages deployment | §7.5, §7.7 | test+text+release | subprojects/webapp/playwright/specs/site-regression.spec.ts (T-60); §6.3 (a failed run never replaces the published site); §7.7 item 1; §7.7 item 4; §7.7 item 6 | planned |
| PRD §9.4 R-19 | IP sequencing: validate client-side approach against MVP performance budget early; record platform ADR | IP §2 T-17, IP §2 T-37 | schedule+text | T-17; T-37; Introduction (Authority and change control: ADR-0010 and ADR-0011 accepted) | designed |
| PRD §9.5 intro | PDD decision register owns the enumerated product-definition items; DDD must take their values from the PDD, not re-decide | Introduction, §5.13 | text+test | Introduction (Verification contract); §5.13; .github/scripts/check_pdd_agreement.py::step 4 (T-47) | planned |
| PRD §9.5 row 1 | §9.5#1 MVP = P1 — resolved (product owner decided: yes); DDD builds on it | Introduction, §9 | text | Introduction (Authority and change control); §9 (P2 and P3 scheduling belongs to the implementation plan) | designed |
| PRD §9.5 row 2 | §9.5#2 name resolved; entry point OPEN — product owner + research group own (not the DDD) | §6.1 | text | §6.1 (Page scaffold, Activation: PDD §2.2, D-2 Decided 2026-10-28, cited) | designed |
| PRD §9.5 row 3 | §9.5#3 multi-dip assist — deferred to the PDD with an interim proposal; PDD owns, not the DDD | §5.5 | text+test | §5.5 (PDD §3.6, D-3, by citation); subprojects/webapp/test/parity.ts::GS-1 (T-35) | planned |
| PRD §9.5 row 4 | §9.5#4 low-slip policy OPEN — research group owns; interim rule: document the limitation without filtering | Introduction, §5.8 | text+test | Introduction (Authority and change control); §5.8 (Caveats: low-slip caveat, D-4 interim); §5.4 (no re-filtering); subprojects/webapp/playwright/specs/golden-scenario.spec.ts (T-60) | planned |
| PRD §9.5 row 5 | §9.5#5 scarp-dip correction OPEN — research group owns; interim rule: provisional-data notice per FR-O4 | Introduction, §5.8 | text+test | Introduction (Authority and change control); §5.8 (Caveats: scarp-dip provisional notice, D-5); §5.9 (provenance block 9); subprojects/webapp/playwright/specs/golden-scenario.spec.ts (T-60) | planned |
| PRD §9.5 row 6 | §9.5#6 Kern County group OPEN — research group owns; interim: worked example not finalized until decided | Introduction, §5.8, §3.4 | text | Introduction (Authority and change control); §5.8 (Kern County preset withheld while D-6 is open); §3.4 (kern_field_group null until decided) | designed |
| PRD §9.5 row 7 | §9.5#7 dominant-scarp-type rule — deferred to the PDD with an interim proposal; PDD owns | §5.8, §5.13 | text+test | §5.8 (Animation offer (P2): PDD §6.4, D-7, by citation); §5.13 (offer.* entries, P2); .github/scripts/check_pdd_agreement.py::step 4 (T-47) | planned |
| PRD §9.5 row 8 | §9.5#8 animation coverage OPEN — research group owns (R-13) | Introduction, §6.4 | text | Introduction (Authority and change control); §6.4 (the "Animation not yet available" fallback, the open D-8 decision changing data, never the design) | designed |
| PRD §9.5 row 9 | §9.5#9 performance/payload budgets — deferred to the PDD with proposed budgets; PDD owns the numbers | §7.6 | text | §7.6 (budgets and reference conditions quoted verbatim from PDD §9.1, D-9, never redefined) | designed |
| PRD §9.5 row 10 | §9.5#10 liability-limitation text OPEN — product owner owns; release-gating (must exist before release) | §5.8, §7.7, §6.1 | release+test+text+owner | §7.7 item 7; .github/scripts/check_pdd_agreement.py::step 7 (T-47); §5.8 (use-site map: PDD §5.1 releasable only once D-10 lands); §6.1 (Publication and activation: PDD §5.1's pending D-10 slot shows only in the unlisted prototype); G-5; OA-3 | owner-pending |
| Roadmap intro | decision-recording procedure: durable decisions → ADR, chores → TODO.md | not a DDD obligation (stays with its source) | n/a | — | n/a |
| Roadmap 'Publication, citation and hosting' — DOI | first GitHub release: decide contents and version before cutting; tags v0.2.0–v0.2.2 exist, no release yet | IP §4 OA-7 | owner+schedule | OA-7; T-65 | owner-pending |
| Roadmap 'Publication, citation and hosting' — Hosting the processed tables | Zenodo dataset-record deposit step — open; decided with the first release | IP §4 OA-6 | owner+text | OA-6; §4.4 (Archival distribution) | owner-pending |
| Roadmap 'Decisions made' — DOI route | DOI route decided (Zenodo via GitHub release); IP step: enable Zenodo GitHub app (needs HarvardRC org-admin) | IP §4 OA-6 | owner | OA-6 | owner-pending |
| Roadmap 'Decisions made' — Software citation | software-citation author list fixed by author team, recorded in pyproject.toml / CITATION.cff / .zenodo.json; release metadata must keep it | §6.2 | text+schedule | §6.2 (Sources: CITATION.cff is the software record, a product release updating its version key, equal to .zenodo.json's); T-65 | designed |
| Roadmap 'Decisions made' — Paper figures | Figures 1-2 withheld from the site — author team owns the terms decision; anchors stay alive | §7.7 | test+release+owner | subprojects/mkdocs/hooks/site_checks.py arm (b) (T-03); .github/workflows/mkdocs.yml::build / Build site (T-21); §7.7 item 9; §7.7 item 10; OA-8 | owner-pending |
| Roadmap 'Decisions made' — Paper figures (export-ignore) | release-data arrangement: fig-* export-ignore keeps figures out of the git archive tarball Zenodo archives | IP §2 T-65 | release+schedule+owner | §7.7 item 10; T-65; G-6 | owner-pending |
| Roadmap 'Decisions made' — Paper figures (restore recipe) | figure-restore procedure once permissions clear (tag figures-pre-removal-v0.2.0; prefer tag over deletable branch) | not a DDD obligation (stays with its source) | n/a | — | n/a |
| Roadmap 'Decisions made' — 3D lane | IP sequencing: release lane closes first; 3D lane on hold | IP §5 parked | schedule | IP §5 (3D lane); §9 | parked |
| Roadmap 'Decisions made' — Release data | release contents: code + plotting CSVs + CITATION.cff; raw inputs stay on DesignSafe, cited by DOI | IP §2 T-65 | schedule+release+text | T-65; §7.7 item 11 (plotting CSVs beside the attachments); §5.9 (provenance block 2, DesignSafe DOIs) | planned |
| Roadmap 'Decisions made' — Release data (3D excluded) | 3D tables excluded from the release — research group (Kristen & John) owns the hold | §9 | schedule | §9; IP §5 (3D lane) | deferred |
| Roadmap 'Decisions made' — Release data (deposit mechanic) | open release mechanic: release assets do not reach Zenodo; dedicated deposit step (dataset record) to decide with first release | IP §4 OA-6 | owner+text | OA-6; §4.4 (Archival distribution: every deposited file downloaded, its SHA-256 compared with the pointer) | owner-pending |
| Roadmap 'Decisions made' — Release data (app exports) | app exports as release assets pinned by committed manifest (ADR-0014/ADR-0012, HLDD §5.4 §10); each software release attaches current exports beside plotting CSVs | IP §2 T-65 | text+release+schedule | §4.4 (Software-release attachments); §7.7 item 11; T-65 | planned |
| Roadmap 'Open questions' — 3D DEM data | 3D switch-on — Kristen/John own; DDD/IP restricted: no ingestion work, avoid 3D-hostile design choices | §9, §3.1 | text | §9; §3.1 (model_family, schema_version headroom); §3.2 (reserved scenario_artifact_<family> keys) | designed |

### 8.4 From the ADRs and the ADR process

| Source | Obligation | Home | Kind | Check | Status |
|---|---|---|---|---|---|
| ADR README intro (L7-10) | ADR immutability: DDD/IP cannot change an accepted decision in place | Introduction | text | Introduction (Authority and change control) | designed |
| ADR README §Adding a new ADR (L40-48) | process a DDD/IP-driven decision change must follow: new ADR, index row, supersede note | Introduction | text | Introduction (Authority and change control) | designed |
| ADR-0010 Context amendment (L25-30) | terminology remap: "committed data" reads "versioned data pinned from git" | §3.3, §4.2 | text | §3.3; §4.2 (only the pointer manifest is committed) | designed |
| ADR-0010 Decision (L42-51) | per-surface map: one home per surface, nothing duplicated, dashboards never embedded, D-13 toggle is page-local not app | §5.1, §6.4 | text+test | §5.1; §6.4 (Family toggle: page-local morphology-family.js); subprojects/webapp/playwright/specs/site-regression.spec.ts (T-60) | planned |
| ADR-0010 Decision (L59-63) | shared-link policy: state-only URLs, results never stored in URL, versionless first ship per PDD D-15 | §5.6, §6.2 | text | §5.6 (URL encoding (P2): state-only, results never stored, names reserved); §6.2 (no version stamp at first ship) | designed |
| ADR-0010 Decision (L64-67) | failure handling: no-JS fallback body, plain load-failure state, refuse to compute on manifest-version mismatch | §5.10, §6.1, §6.2, §5.2 | test+owner | subprojects/webapp/playwright/specs/mount.spec.ts (T-60); subprojects/webapp/playwright/specs/failure-states.spec.ts (T-60); subprojects/webapp/test/decode.test.ts (T-36); .github/scripts/check_pdd_agreement.py::step 7 (T-47); .github/scripts/check_pdd_agreement.py::step 8 (T-47); G-4; OA-4 | owner-pending |
| ADR-0010 Consequences (L93-95) | DDD names the URL query parameters (de facto public interface) | §5.6 | text | §5.6 (URL encoding (P2): fifteen snake_case names reserved, the value grammar deferred to P2) | designed |
| ADR-0010 Consequences (L93-95) | URL version handling: authority stays with PDD D-15, not the DDD | §5.6, §6.2 | text | §5.6 (Value grammar: deferred to P2); §6.2 (the notice is PDD §7.2's, D-15) | designed |
| ADR-0010 Consequences (L96-97) | failure modes are explicit page states; no-JS body doubles as search description | §5.10, §6.1 | text+test+owner | §5.10; §6.1 (Page scaffold); subprojects/webapp/playwright/specs/failure-states.spec.ts (T-60); subprojects/webapp/playwright/specs/render.spec.ts (T-60); .github/scripts/check_pdd_agreement.py::step 7 (T-47); .github/scripts/check_pdd_agreement.py::step 8 (T-47); G-4; OA-4 | owner-pending |
| ADR-0011 Context (L9-11) | toolchain upgrades/changes: any new toolchain requires an ADR (NFR-8), not a DDD/IP-only change | §2 | owner+text | ADR-0016; OA-12 | owner-pending |
| ADR-0011 Context amendment 1 (L25-30) | tests.yml path filter targets the pointer manifest; parity harness fetches pinned vintage before running | IP §2 T-20, T-35, T-23 | text+test+schedule | §6.3 (the Tests push filter names subprojects/webapp/data/pointer.json); subprojects/webapp/test/parity.ts::fetch (T-35); .github/workflows/tests.yml::webapp-test / Parity (T-23); T-20 | planned |
| ADR-0011 Context amendment 2 (L32-36) | toolchain pin locations: Node.js version in Gradle build configuration, package versions in committed lockfile | §2 | text+test | §2 (Toolchain pins: Node.js 22.12.0 by node { version } under plugin com.github.node-gradle.node 7.1.0, packages by the committed package-lock.json); subprojects/webapp/test/toolchain.test.ts (T-02) | planned |
| ADR-0011 Decision (L42-46) | toolchain pins to fix: TypeScript strict, esbuild, pinned Node and package versions, Gradle-wrapped lane | §2 | text+test | §2 (Toolchain pins, npm scripts and build.mjs, Gradle tasks, TypeScript configuration); subprojects/webapp/test/toolchain.test.ts (T-02); .github/workflows/tests.yml::webapp-test / Webapp checks (T-20) | planned |
| ADR-0011 Decision (L44-46) | webapp test job runs tsc --noEmit as a separate check from the esbuild build | §2, §6.3 | text+test+release | §2 (Gradle tasks: tscCheck, never fused with bundling, wired into check as its own task); .github/workflows/tests.yml::webapp-test / Webapp checks (T-20); .github/workflows/mkdocs.yml::webapp-bundle / Webapp checks (T-21); §7.7 item 1 | planned |
| ADR-0011 Decision (L47-49) | no application framework — DDD may not introduce one | §2, §5.1 | text | §2 (no application framework may be introduced); §5.1 (Builders and appliers); §5.8 (Region model: slot replacement on a stable skeleton) | designed |
| ADR-0011 Decision (L50-52) | charts: hand-rolled SVG only, exactly two chart kinds plus overlay marks — no charting library | §5.12 | text+test | §5.12 (ADR-0011 quoted, hand-rolled SVG with no charting library, the categorical-chart question routed through the ADR process); §2 (the package list is complete); subprojects/webapp/test/charts.test.ts (T-41) | planned |
| ADR-0011 Decision (L53-61) | CI build lane: webapp job in mkdocs.yml separate from MkDocs job; local Gradle task writes gitignored path | IP §2 T-21, T-02 | text+schedule | §6.3 (Companion site: job webapp-bundle, separate from build); §2 (webappBundle writes build/dist/, covered by the root build/ rule); T-21; T-02 | designed |
| ADR-0011 Decision (L53-54) | build output never committed | §6.1 | text | §6.1 (build products, five .gitignore entries); §2 (node_modules/ ignored before the first npm command, build/ covered by the root rule) | designed |
| ADR-0011 Decision (L60-64) | bundle loads only on scenario page; Tableau Embedding API exclusion mechanics are DDD material | §6.1 | text+test | §6.1 (Tableau exclusion: javascripts/tableau-loader.js); subprojects/mkdocs/hooks/site_checks.py arm (e) (T-51); subprojects/webapp/playwright/specs/site-regression.spec.ts (T-60) | planned |
| ADR-0011 Decision (L65-70) | CI changes: widen mkdocs.yml filters; tests.yml gains webapp test job + parity harness (filter remapped to pointer manifest) | IP §2 T-20, T-21, T-23 | text+test+schedule | §6.3 (push filters by the filter rule, pull_request triggers unfiltered, jobs webapp-test and webapp-bundle); .github/workflows/tests.yml::webapp-test / Parity (T-23); T-20; T-21 | planned |
| ADR-0011 Consequences (L97-98) | deploy workflow gains Node setup and build job; deploy gated on bundle build | IP §2 T-22 | text+schedule | §6.3 (build needs webapp-bundle, deploy needs build, the hermetic Node.js download is the Node setup); T-22 | designed |
| ADR-0012 Context amendment 2026-10-28 (L49-55) | terminology remap: "committed, versioned" reads "versioned and pinned from git"; shapes and export task unchanged | §3.3, §4.2 | text | §3.3; §4.2; §3.1–§3.6; §4.1 | designed |
| ADR-0012 Decision (L83-88) | pipeline work: five new outputs via new DuckDB views in views.py plus a new export task | IP §2 T-10, T-11, IP §5 parked | schedule+text | T-10; T-11; IP §5 (media index and export, P2); §4.1 | designed |
| ADR-0012 Decision table (L92) | scenario artifact export definition the DDD schema-tizes (binary file + JSON artifact manifest) | §3.1, §3.2 | text+test | §3.1; §3.2; §4.1 step 3 rules counts, bitwise-restore, sentinel-collision (T-12); §4.1 step 5 rules block-tiling, manifest-figures, checksums, format-spec (T-12); subprojects/webapp/test/decode.test.ts (T-36) | planned |
| ADR-0012 Decision table (L93) | field export definition the DDD schema-tizes (columns per measurement) | §3.4 | text+test | §3.4; §4.1 step 3 rule view-reread (T-12); §4.1 step 5 rule format-spec (T-12); subprojects/python/tests/test_field_export.py (T-16) | planned |
| ADR-0012 Decision table (L94) | regression export definition the DDD schema-tizes (read "slope" as "coefficients — slope and intercept") | §3.5 | text+test | §3.5; §4.1 step 3 rules view-reread, coefficient-reach (T-12); §4.1 step 5 rule format-spec (T-12) | planned |
| ADR-0012 Decision table (L95) | reference-results export definition the DDD schema-tizes (eight golden scenarios at full precision) | §3.6 | text+test | §3.6; subprojects/python/tests/test_reference_results.py (T-16); subprojects/python/tests/test_reference_results.py::test_full_* (T-14); §4.1 step 3 rule reference-invariants (T-12); subprojects/webapp/test/parity.ts (T-35) | planned |
| ADR-0012 Decision table (L96) | media index export definition the DDD schema-tizes (P2) | §3.7 | text | §3.7 (envelope and entry fields, fixed now, shipped with P2) | designed |
| ADR-0012 amendment 2026-10-29 (1) (L62-67) | regression export schema: slope and intercept, direction, units, provenance; back-projection equation and pinned intercepts | §3.5 | text+test | §3.5 (relationship record y, x, form, fit, back_projection, coefficients with slope and intercept); §4.1 step 5 rule format-spec (T-12); §4.1 step 3 rule view-reread (T-12); subprojects/python/tests/test_regression_views.py::test_dem_regression_coefficients (T-14) | planned |
| ADR-0012 amendment 2026-10-29 (2) (L68-70) | field export schema: sub-50 m criterion flag is three-state (meets / fails / not applicable) | §3.4 | text+test | §3.4 (criterion_sub50: met, not_met, not_applicable); subprojects/python/tests/test_field_export.py (T-16) | planned |
| ADR-0012 amendment 2026-10-29 (3) (L71-73) | export production split: four exports from DuckDB views, media index written by export task without a view | §4.1, §3.7 | text | §4.1 (four exports from their views, from P2 the media index from project metadata without a view); §3.7 | designed |
| ADR-0012 amendment 2026-10-29 (L74-79) | reference-results schema: per-scenario selection identities/signature with scarp-type classes; converted windows and range flags for offset mode | §3.6 | text+test | §3.6 (selection, converted_windows); subprojects/webapp/test/parity.ts::exact (T-35); subprojects/python/tests/test_reference_results.py (T-16) | planned |
| ADR-0012 Decision (L98-101) | field normalization lives in the pipeline, never in the browser (DR-5/DR-1) | §3.4 | text+test | §3.4 (eq_name arrives pipeline-normalized from a product view); subprojects/python/tests/test_field_export.py (T-16) | planned |
| ADR-0012 Decision (L101-106) | Kern County group and principal-width rule stay open with the research group — not the DDD's to close | Introduction, §3.4 | text | Introduction (Authority and change control); §3.4 (kern_field_group null in every row until the research group decides) | designed |
| ADR-0012 Decision (L101-106) | field export schema keeps a column for the open answers so a later decision changes data, not format | §3.4 | text+test | §3.4 (kern_field_group, string or null); §4.1 step 5 rule format-spec (T-12) | planned |
| ADR-0012 Decision (L107-116) | availability/permission states are data conditions read from the media index, never hardcoded page branches; owner gates release | §3.7, §6.4 | text+test+release+owner | §3.7; §6.4 (mediaIncludes renders only granted and available entries); subprojects/mkdocs/hooks/site_checks.py arms (a), (b) (T-03); §7.7 item 9; OA-8 | owner-pending |
| ADR-0012 Decision (L116-120) | release sequence: MVP (v0.3) ships four artifacts; media index and every surface reading it are P2 | IP §5 parked | schedule+text | IP §5 (media index and export, morphology page, animation library, measurement page, animation offers: P2); T-18; §4.1 step 2 (the media index only from P2) | parked |
| ADR-0012 Decision (L121-126) | refresh atomicity: export task writes artifacts, both manifests, and reference results together | §4.1 | text+test | §4.1 (one run writes one complete vintage); §4.1 step 5 rule envelope-agreement (T-12); §4.1 step 6 rule pointer-exact (T-12); §4.3 (Regeneration: the --reproduce byte-identity check) | planned |
| ADR-0012 Consequences (L149-151) | app never parses research-shaped data | §3 (Data formats scope) | text | §3 (chapter introduction: dem.csv not a product input, every format purpose-shaped); §5.2 (the loader reads only the pinned product files) | designed |
| ADR-0013 Context (L32-36) | budgets owned by PDD §9.1: ≤4 MB compressed payload, 200 ms p95 render — the DDD meets them, not redefines them | §7.6, §3.8 | text+measure | §7.6 (budgets quoted from PDD §9.1, the HLDD §7.1 optimize-and-remeasure rule); §7.6 report: workloads (T-61); §7.6 report: environment (T-59, T-61); §3.8 (a diagnostic lower bound) | planned |
| ADR-0013 amendment 2026-10-28 (L45-53) | dip-column encoding: closed candidate set (wider scaled integer OR 16-bit dictionary) and the precision-preservation rule | §1 (DD-1) | text+test | §1 (DD-1 register row and closure note 1); §4.1 step 3 rules bitwise-restore, dictionary-order (T-12) | planned |
| ADR-0013 amendment 2026-10-28 (L53-56) | DDD reports the selected representation's total size, counting dictionary tables and the artifact manifest | §3.8 | measure | §3.8: pending item 2, the complete size with the manifest counted (T-11, T-61); §3.8: pending item 1, the manifest's size as served (T-61) | planned |
| ADR-0013 amendment 2026-10-29 (1) (L58-62) | artifact layout guarantee: within-trial ascending slip order, no repeated slip values | §3.1 | text+test | §3.1 (Stage arrays); §4.1 step 3 rule slip-order (T-12); subprojects/python/tests/test_scenario_export.py::test_full_* (T-14) | planned |
| ADR-0013 amendment 2026-10-29 (1) (L58-62) | export-task validation checks within-trial slip ordering | §4.1 | test | §4.1 step 3 rule slip-order (T-12); subprojects/python/tests/test_scenario_export.py (T-16) | planned |
| ADR-0013 amendment 2026-10-29 (L62-67) | population-selection rule: FR-S6 "last stage" ≡ DR-3 highest-slip-in-window | §3.1, §5.3 | text+test | §3.1 (Stage arrays); §5.3 (one-state selects index b − 1); §4.1 step 3 rule slip-order (T-12); subprojects/webapp/test/parity.ts::exact (T-35) | planned |
| ADR-0013 amendment 2026-10-29 (2) (L68-71) | artifact manifest schema additions: stage-spacing info and content-hashed filenames of the vintage's other browser-loaded exports | §3.2 | text+test | §3.2 (stage_spacing, files); §4.1 step 5 rules manifest-figures, checksums, format-spec (T-12) | planned |
| ADR-0013 amendment 2026-10-29 (3) (L71-74) | precomputed side-values include regression intercepts, not slopes alone | §3.5 | text+test | §3.5 (coefficients: slope and intercept at full float64); §5.5 (the back-projection uses both); §4.1 step 3 rule view-reread (T-12); §4.1 step 5 rule format-spec (T-12) | planned |
| ADR-0013 amendment 2026-10-29 (4) (L74-75) | corrected dip-grid count: 102,295 values = 102,294 steps of 0.001° | §3.1 | text+test | §3.1 (scarp_dip row: −12.529…89.765° at 0.001°, a dictionary of 35,854 values); §4.1 step 3 rule bitwise-restore (T-12) | planned |
| ADR-0013 Decision (L81-86) | no precomputed aggregates: only scalar side-values precomputed; client computes everything else | §3.1, §5.4 | text+test | §3.1 (row-level: every record shipped, only manifest ranges and §3.5 coefficients precomputed); §5.4; subprojects/webapp/test/parity.ts (T-35) | planned |
| ADR-0013 Decision (L88-94) | artifact organization: row-level, trial-major contiguous runs of 101, columnar typed arrays with no parse step | §3.1 | text+test | §3.1; §5.2 (typed-array views, nothing copied); §4.1 step 3 rule counts (T-12); §4.1 step 5 rule block-tiling (T-12); subprojects/webapp/test/decode.test.ts (T-36) | planned |
| ADR-0013 Decision (L98-103) | trial-table layout: columns incl. reserved model-family dimension | §3.1 | text+test | §3.1 (Trial table: 3,434 × 7 uint8, model_family reserved); §4.1 step 3 rule site-constancy (T-12); subprojects/webapp/test/fields.test.ts::TRIAL_TABLE_COLUMNS (T-36) | planned |
| ADR-0013 Decision (L104-110) | stage-array encodings: 16-bit scaled integers restoring recorded precision exactly, explicit null sentinel | §3.1 | text+test | §3.1; §4.1 step 3 rules bitwise-restore, sentinel-collision, null-counts (T-12); subprojects/webapp/test/decode.test.ts (T-36) | planned |
| ADR-0013 Decision (L110-117) | dip-column encoding: the DDD decides under the SC-3 parity rule (candidate list per the 2026-10-28 amendment) | §1 (DD-1) | text+test+measure | §1 (DD-1 closure note 1); §4.1 step 3 rules bitwise-restore, dictionary-order (T-12); §3.8: Selected row (T-11, T-17) | planned |
| ADR-0013 Decision (L120-128) | artifact-manifest JSON required fields the DDD schema-tizes | §3.2 | text+test | §3.2; §4.1 step 5 rules format-spec, manifest-figures, provenance (T-12); subprojects/python/tests/test_manifests.py (T-16) | planned |
| ADR-0013 Decision (L129-135) | null representation: sentinels, never dropped rows; negative measurements carried as-is per DR-4 | §3.1, §5.4 | text+test | §3.1; §5.4; §4.1 step 3 rules null-counts, sentinel-collision, bitwise-restore (T-12) | planned |
| ADR-0013 Decision (L137-142) | query algorithm: trial mask then stride-101 scan; percentile sort dominates within 200 ms budget | §5.3 | text+test+measure | §5.3; subprojects/webapp/test/engine.test.ts (T-31); subprojects/webapp/test/parity.ts (T-35); §7.6 report: workloads (T-61) | planned |
| ADR-0013 Consequences (L165-167) | DDD fixes exact field encodings, scales, endianness, byte layout (under SC-3 parity rule) | §3 (Data formats scope), §3.1 | text+test | §3 (Rules every format follows: checksums, little-endian, schema versions); §3.1; §4.1 step 3 rules bitwise-restore, sentinel-collision (T-12); §4.1 step 5 rule block-tiling (T-12) | planned |
| ADR-0013 Consequences (L165-167) | dip-column encoding: the one named decision left open for the DDD | §1 (DD-1) | text | §1 (DD-1 register row, Proposed 2026-10-30, closure note 1); §3.1 (Closes: DD-1) | designed |
| ADR-0013 Consequences (L168-172) | future partition rule the schema must not preclude: one artifact per model family at 3D scale | §3.1, §3.2, §3.3 | text | §3.1 (model_family, schema_version headroom); §3.2 (reserved scenario_artifact_<family> keys, never emitted under schema_version 1); §3.3 | designed |
| ADR-0014 Context (L34-40) | owner's architecture rule: generated data stays out of git | §6.1, §4.2 | text | §6.1 (build products, gitignored); §4.2 (vintage files are release assets, step 11 commits only the pointer) | designed |
| ADR-0014 amendment 2026-10-29 (L42-46) | upload-verify-before-commit: verify uploaded files against generated checksums before committing the pointer manifest | §4.2 | text+release | §4.2 steps 7–9 (upload, read-back, publish) before step 11; §7.7 item 3 | planned |
| ADR-0014 amendment 2026-10-29 (L46-48) | retention: past vintages retained; vintages that retained repo versions depend on are never routine-deleted | §4.3 | text+release | §4.3 (Retention: the retention check); §7.7 item 12 | planned |
| ADR-0014 amendment 2026-10-29 (L48-51) | rollback-compatibility: pointer revert conditional on asset availability and format support; code+data rollback must restore a compatible pair | §4.3 | text+release+schedule | §4.3 (Rollback); §7.7 item 12; T-64 | planned |
| ADR-0014 amendment 2026-10-29 (L51-56) | withdrawal: reach release assets AND site-published copies, document reason and no-longer-reproducible builds | §4.3 | text | §4.3 (Withdrawal, steps 1–5: steps 2 and 5 an owner decision, Proposed) | designed |
| ADR-0014 amendment 2026-10-29 (L56-58) | reading rule: rollback/withdrawal statements in this ADR are read with the amendment's operating rules | §4.3 | text | §4.3 | designed |
| ADR-0014 Decision (L62-67) | pointer-manifest schema (tag, content-hashed filenames, checksums, export version/date) and data-tag naming by export version | §3.3, §4.2 | text+test | §3.3; §4.1 step 1 rule data-tag (T-12); §4.1 step 6 rules pointer-exact, file-names (T-12); subprojects/python/tests/test_manifests.py (T-16); §4.2 steps 1 and 3 | planned |
| ADR-0014 Decision (L67-73) | two manifests distinct; one export-task run writes both; pointer checksums cover every vintage file incl. artifact manifest | §3.3, §3.2 | text+test | §3.3 (The exact file set); §3 (Rules every format follows: the acyclic checksum graph); §4.1 step 6 rule pointer-exact (T-12); subprojects/python/tests/test_manifests.py (T-16); subprojects/python/tests/test_manifests.py::test_full_* (T-14) | planned |
| ADR-0014 Decision (L73-77) | CI fetch-verify-bake; page downloads nothing from a release at run time; bundle never committed | §6.3, §6.1 | test+text | .github/workflows/mkdocs.yml::build / Stage scenario assets (T-21); §6.1 (Transport contract: own-origin assets/scenario/data/, build products); subprojects/mkdocs/hooks/site_checks.py arm (c) (T-51) | planned |
| ADR-0014 Decision, Naming and caching (L79-82) | DDD fixes the exact path of the dedicated data directory beside the scenario page | §6.1 | text+test | §6.1 (layout table: assets/scenario/data/, written by scenarioAssets from the fetchVintage cache); subprojects/mkdocs/hooks/site_checks.py arm (c) (T-51) | planned |
| ADR-0014 Decision, Naming and caching (L82-89) | content-hashed filename scheme; build pins the manifest's hashed name into the page | §4.1, §4.2, §6.1 | text+test | §4.1 step 2 (one pattern per role, <h12>); §4.1 step 6 rule file-names (T-12); §6.1 (Generated tag block: data-manifest); subprojects/mkdocs/hooks/site_checks.py arm (c) (T-51); subprojects/webapp/playwright/specs/mount.spec.ts (T-60) | planned |
| ADR-0014 Decision, Fetch and verify (L90-96) | fetch-and-verify step in site build and tests.yml; checksum mismatch fails the build | §6.3 | test | .github/workflows/tests.yml::webapp-test / Parity (T-23); .github/workflows/mkdocs.yml::webapp-bundle / Parity (T-23); .github/workflows/mkdocs.yml::build / Stage scenario assets (T-21); subprojects/webapp/test/parity.ts::fetch (T-35) | planned |
| ADR-0014 Decision, How a refresh works (L97-104) | refresh procedure: one Gradle task, one run, one commit per refresh; deployed site carries exactly one vintage | §4.2 | text+test+release | §4.2 (publishVintage steps 1–11, the step-11 pointer commit); subprojects/mkdocs/hooks/site_checks.py arm (c) (T-51); §7.7 item 3 | planned |
| ADR-0014 Decision, Rollback and withdrawal (L105-108) | rollback via pointer-commit revert; withdrawal via asset deletion (read with the 2026-10-29 amendment rules) | §4.3 | text+release+schedule | §4.3 (Rollback: git revert of the pointer commit, Withdrawal: gh release delete data-vN --yes, the tag kept); §7.7 item 12; T-64 | planned |
| ADR-0014 Decision (L109-118) | scenario artifact uploaded pre-compressed, the exact file the page downloads; browser inflates via DecompressionStream | §3.1, §5.2, §6.1 | text+test+measure | §5.2 step 2 (gzip guard, DecompressionStream('gzip')); §6.1 (Transport contract); subprojects/webapp/test/decode.test.ts (T-36); subprojects/webapp/test/compat.test.ts (T-61); §7.6 report: workloads (T-61) | planned |
| ADR-0014 Decision (L119-125) | no-raw-twin rule, explicitly marked "(proposed)" — the DDD confirms or closes it | §1 (DD-7), §4.2 | text+test | §1 (DD-7 closure note 7); §4.1 step 6 rules pointer-exact, file-names (T-12) | planned |
| ADR-0014 Decision, Derived data (L126-131) | licensing authority: data exports carry source datasets' terms, not Apache-2.0 (NFR-6) | §4.4 | text+test+owner | §4.4 (Vintage terms: data-terms-<h12>.txt, a byte copy of data/REDISTRIBUTION.md, also the release body); §4.1 step 6 rule pointer-exact (T-12); OA-13 | owner-pending |
| ADR-0014 Decision, Derived data (L135-140) | software releases carry the current exports as the data asset, plus dashboards' plotting CSVs | §4.4 | text+release | §4.4 (Software-release attachments); §7.7 item 11 | planned |
| ADR-0014 Decision, Derived data (L140-145) | sequenced open items: confirm source terms before first vintage upload; Zenodo dataset deposit step; README/LICENSE-docs wording | IP §3 G-1, IP §4 OA-1, IP §4 OA-13, IP §4 OA-6, §4.4 | owner+text+release | G-1; OA-1; §4.2 step 1 (the OA-1 record gate and the README/LICENSE-docs condition); ADR-0017; §7.7 item 17; OA-13; OA-6; §4.4 (Archival distribution); §4.4 (Vintage terms: the README and LICENSE-docs wording) | owner-pending |
| ADR-0014 Decision (L146-152) | manifest must support pinning multiple per-family artifacts; default page fetches only the 2D family | §3.2, §3.3 | text | §3.2 (reserved scenario_artifact_<family> keys, the page fetching only scenario_artifact); §3.3 (a reserved file pinned the same way) | designed |
| ADR-0014 Consequences (L183-186) | site deploys and PR validation gain the fetch-and-verify step | IP §2 T-21, T-22 | test+text+schedule | .github/workflows/mkdocs.yml::build / Stage scenario assets (T-21); §6.3 (pull_request triggers unfiltered, a failed run never deploys); T-22 | planned |
| ADR-0015 Context (L22-28) | tolerance contract: display-rounded values exact; full-precision values within the per-calculation tolerance PDD §10.1 allows | §7.1, §1 (DD-2) | text+test | §7.1; §1 (DD-2 closure note 2); subprojects/webapp/test/parity.ts::tolerance, display (T-35); subprojects/python/tests/test_reference_results.py::test_full_display_tie_census (T-14); subprojects/python/tests/test_reference_results.py::test_full_evaluation_order_effect (T-14) | planned |
| ADR-0015 Context (L28-33) | reference numbers must be pinned artifacts CI fetches and verifies without running the pipeline | §3.6, §7.2 | text+test | §3.3 (the pointer pins the reference-results file); subprojects/webapp/test/parity.ts::fetch, pairing (T-35); .github/workflows/tests.yml::webapp-test / Parity (T-23) | planned |
| ADR-0015 amendment 2026-10-29 (1) (L39-43) | reference-artifact schema: per-scenario selection identities or exact signature; per-dip converted slip window and range flag for offset mode | §3.6 | text+test | §3.6 (selection, converted_windows); subprojects/python/tests/test_reference_results.py (T-16); §4.1 step 3 rule reference-invariants (T-12) | planned |
| ADR-0015 amendment 2026-10-29 (1) (L43-45) | parity job exact-match requirement: selections, scarp-type classes, counts, range flags | §7.2 | test | subprojects/webapp/test/parity.ts::exact (T-35); subprojects/webapp/test/parity.ts::self-check (T-35) | planned |
| ADR-0015 amendment 2026-10-29 (2) (L46-49) | regression export carries slope and intercept | §3.5 | text+test | §3.5 (coefficients); §4.1 step 5 rule format-spec (T-12); §4.1 step 3 rule view-reread (T-12) | planned |
| ADR-0015 amendment 2026-10-29 (3) (L50-58) | product-settings exclusion: never-hardcoded rule does not extend to PDD-decided settings; "constants" means research-derived values only | Introduction, §5.13 | text+test | Introduction (Verification contract); §5.13 (Exclusions); .github/scripts/check_pdd_agreement.py::step 5 (T-47) | planned |
| ADR-0015 amendment 2026-10-29 (3) (L50-58) | DDD defines application configuration representing PDD-decided settings (D-11 warning threshold, chart floor quoted in suppression notice, display precision) | §5.13 | text+test | §5.13 (the register and its accessors); .github/scripts/check_pdd_agreement.py::steps 3–6 (T-47); subprojects/webapp/test/parity.ts::D-23 transcription, PDD §4.1 transcription (T-35) | planned |
| ADR-0015 amendment 2 of 2026-10-29 (L60-70) | browser test lane: required coverage list (mount/fallback, golden-scenario spot check, failure states, re-navigation idempotence, accessibility checks) | §7.5 | test | subprojects/webapp/playwright/specs/mount.spec.ts (T-60); subprojects/webapp/playwright/specs/golden-scenario.spec.ts (T-60); subprojects/webapp/playwright/specs/failure-states.spec.ts (T-60); subprojects/webapp/playwright/specs/navigation-lifecycle.spec.ts (T-60); subprojects/webapp/playwright/specs/a11y.spec.ts (T-60) | planned |
| ADR-0015 amendment 2 of 2026-10-29 (L60-63) | release gate: browser test lane run against the locally built site, required before a release | IP §2 T-60, IP §3 G-2, IP §4 OA-5 | release+schedule+owner | §7.7 item 4; T-60; G-2; G-3; OA-5 | owner-pending |
| ADR-0015 amendment 2 of 2026-10-29 (L70-73) | scope restriction: CI unchanged in the MVP; browser lane in CI is post-MVP only | §7.5, §6.3 | text | §7.5 (webappBrowserTest joins no lifecycle target and no CI job); §6.3 (no workflow runs the browser lane or the §7.6 reference-environment measurement); §2 (task table) | designed |
| ADR-0015 amendment 2 of 2026-10-29 (L74) | DDD names the browser-test tool and the test inventory | §1 (DD-3), §7.5 | text | §1 (DD-3 closure note 3); §7.5 (Inventory, projects desktop and mobile) | designed |
| ADR-0015 Decision (L78-82) | never-hardcoded rule: constants arrive only through pipeline-written files (scoped by amendment 1 point 3) | Introduction, §5.13 | text+test | Introduction (Verification contract); §5.13 (Exclusions); .github/scripts/check_pdd_agreement.py::step 5 (T-47); subprojects/webapp/test/parity.ts (T-35) | planned |
| ADR-0015 Decision (L84-97) | golden scenarios GS-0–GS-7: per-scenario reference content at full precision, written as a versioned reference artifact | §3.6 | text+test | §3.6; subprojects/python/tests/test_reference_results.py::test_full_* (T-14); subprojects/python/tests/test_reference_results.py (T-16); §4.1 step 3 rule reference-invariants (T-12) | planned |
| ADR-0015 Decision (L98-106) | separate verification: export-task re-read-and-compare before writing the artifact manifest; CI checksum verification; golden scenarios verify calculations | §4.1, §6.3, §7.2 | test | §4.1 step 3 rules bitwise-restore, view-reread (T-12); .github/workflows/mkdocs.yml::build / Stage scenario assets (T-21); subprojects/webapp/test/parity.ts (T-35) | planned |
| ADR-0015 Decision (L107-116) | three parity consumers: pytest contracts, webapp parity job (Node, headless, in tests.yml), acceptance walkthroughs | §7.3, §7.2, §7.7 | test+release | subprojects/python/tests/test_reference_results.py (T-16); subprojects/python/tests/test_reference_results.py::test_full_* (T-14); .github/workflows/tests.yml::webapp-test / Parity (T-23); .github/workflows/mkdocs.yml::webapp-bundle / Parity (T-23); §7.7 item 13 | planned |
| ADR-0015 Decision (L117-124) | DR-3 one-state selection rule: highest slip in window, implemented and tested pipeline-first; client rule must have a pipeline twin | §5.3, §7.3 | text+test | §5.3; §3.6 (generator step 8: the §5.3 steps in order); subprojects/python/tests/test_reference_results.py (T-16); subprojects/python/tests/test_scenario_export.py::test_full_* (T-14); subprojects/webapp/test/parity.ts::boundary_cases (T-35) | planned |
| ADR-0015 Decision (L125-140) | constant sourcing: regression values from regression export, palette/order only via artifact manifest, ranges and steps from manifest | §5.13, §5.5, §5.7 | text+test | §5.5 (exported coefficients, the provenance line a fixed-here entry with relationship slots); §5.7 (controlModel: option lists and defaults from the manifest); §5.13 (Exclusions); subprojects/webapp/test/scenario-controls.test.ts (T-40); subprojects/webapp/playwright/specs/render.spec.ts (T-60); .github/scripts/check_pdd_agreement.py::step 5 (T-47) | planned |
| ADR-0015 Alternatives (L144-146) | tolerance authority: PDD §10.1 tolerance note is the contract — the DDD does not substitute bit-exact equality or redefine it | §7.1 | text | §7.1 (grounded on the PDD §10.1 closing note, widening a change to the section) | designed |
| ADR-0015 Alternatives (L147-149) | no hand-maintained expected values in webapp tests — expectations come from generated fixtures | §7.4 | text+test | §7.4 (Pipeline-first rule); subprojects/webapp/test/parity.ts (T-35) | planned |
| ADR-0015 Alternatives (L150-152) | query engine must be pure and synchronous so Node can drive it headlessly | §5.1, §5.3 | text+test | §5.1 (engine/ pure and synchronous); §2 (TypeScript configuration: tsconfig.node.json); subprojects/webapp/test/engine.test.ts (T-31); subprojects/webapp/test/parity.ts (T-35) | planned |
| ADR-0015 Consequences (L161-162) | pipeline-first discipline: new displayed statistics land in the reference generator before the app | §3.6, §5.4, §7.4 | text | §3.6; §5.4; §7.4 (Pipeline-first rule); §5.12 (histogram_log in the generator before the client) | designed |
| ADR-0015 Consequences (L163-164) | parity failure blocks merge in tests.yml; golden scenarios double as acceptance-walkthrough material | §7.2, §6.3, §7.7 | test+owner+release | .github/workflows/tests.yml::webapp-test / Parity (T-23); .github/workflows/mkdocs.yml::webapp-bundle / Parity (T-23); OA-10; §7.7 item 13 | owner-pending |

*Verification (planned):* `.github/scripts/check_traceability.py`,
which uses the Python standard library only, lints the matrix tables
of [§8.1](#81-from-the-hldd)–[§8.4](#84-from-the-adrs-and-the-adr-process)
and of [IP §7 — Traceability](ip.md#7-traceability); the `links` job of
`.github/workflows/doc-links.yml` runs it as the
**Check traceability** step ([§6.3](#63-ci-workflows)). It splits a
row into its six cells at each unescaped `|` and a Check cell into
entries at `;`, and it checks:

- that every table header is exactly
  `| Source | Obligation | Home | Kind | Check | Status |`;
- that every `+`-joined part of a Kind lies in the Kind set and every
  Status in the Status set;
- that each row's Kind is the set of the kinds its Check entries take
  by the forms of [§8](#8-traceability), and that its Status follows
  the §8 precedence: `n/a` exactly when the Kind is `n/a`; a row
  reading `gap`, `parked`, or `deferred` keeps that value, which the
  rendering sets; and any other row reads `owner-pending`, `planned`,
  or `designed` as its checks decide;
- that every `test` check — an entry that begins with `subprojects/`
  or `.github/`, or with `§4.1 step <n> rule` — ends with its task
  list in parentheses, `(T-nn)` or `(T-nn, T-nn)` with any number of
  tasks;
- that the path of every `test` check that begins with
  `subprojects/` or `.github/` — its text up to the first `::` or
  space — names a check this document defines: a file that the
  **Inventory.** paragraph of [§7.3](#73-pipeline-and-export-tests),
  [§7.4](#74-application-tests), or [§7.5](#75-browser-test-lane)
  lists, in its text or its table, matched by base name — a path
  under `subprojects/python/tests/` against §7.3, under
  `subprojects/webapp/test/` against §7.4, and under
  `subprojects/webapp/playwright/specs/` against §7.5; or one of the
  files no inventory lists: `.github/workflows/tests.yml`,
  `.github/workflows/mkdocs.yml`,
  `.github/scripts/check_pdd_agreement.py`,
  `.github/scripts/test_check_pdd_agreement.py`,
  `subprojects/mkdocs/hooks/site_checks.py`,
  `subprojects/webapp/test/parity.ts` (the harness of
  [§7.2](#72-calculation-parity-tests)), and
  `subprojects/python/tests/test_regression_views.py` (the existing
  test that the *Verification (planned):* line of
  [§3.5](#35-regression-export) names);
- that every name an export-rule check cites is a rule that the
  cited step of [§4.1](#41-export-task-and-validation) defines — an
  item of that step that opens with the name in backticks, alone or
  after `Rule`;
- that every `T-nn`, `OA-n`, and `G-n` in a Check cell — a whole word
  matching `T-[0-9]{2}`, `OA-[0-9]+`, or `G-[0-9]+` — is a task row of
  [IP §2 — Task graph](ip.md#2-task-graph), an owner action of
  [IP §4 — Owner and research-group actions](ip.md#4-owner-and-research-group-actions),
  or a gate of
  [IP §3 — Gates and release sequence](ip.md#3-gates-and-release-sequence);
- that no Check or Status cell carries the words `passed`,
  `verified`, `satisfied`, or `discharged`; and
- that every IP §7 row is identical to the §8 row with the same
  Source and Obligation.

It exits non-zero on any failed check, naming the row; it hardcodes
no row count and prints the number of rows whose Status is `gap`, and
with `--release` it also exits non-zero unless that number is 0 —
item 16 of the release checklist
([§7.7](#77-site-validation-and-release-checklist)). Task T-04 of the
[implementation plan](ip.md#2-task-graph) implements it.

References:

- the obligation sweep of 2026-10-29 (420 rows; sources at commit
  `36abc56`), whose stored rendering these tables are; the sweep
  itself is not in the repository, and this correction pass
  re-rendered the Kind, Check, and Status columns against the
  corrected document on 2026-10-30 and added the row of the HLDD
  amendment of that day.
- [HLDD §2 — Architectural constraints](hldd.md#2-architectural-constraints)
  (Performance budgets, amended 2026-10-30);
  [PDD §9.1 — Performance budgets (D-9, Proposed)](pdd.md#91-performance-budgets-d-9-proposed)
  (amended 2026-10-30);
  [ADR-0016 — Performance reference environment — an on-demand AWS VM defined by Terraform](../adr/0016-performance-reference-environment.md)
  (Proposed).
- `.github/scripts/check_traceability.py`;
  `.github/workflows/doc-links.yml`.

## 9. Deferred and out of scope

What this document deliberately leaves undone, each item with the
authority that owns it:

- **3D data.** No 3D design or ingestion before the dataset's owners
  decide: Cases 1–3 are supplied but held, and Case 4 is not
  supplied. The artifact reserves the `model_family` dimension and
  the per-family partition keys
  ([§3.1](#31-scenario-artifact-binary-layout),
  [§3.2](#32-artifact-manifest)), and the implementation plan parks
  the lane
  ([IP §5 — Parked capabilities (P2/P3)](ip.md#5-parked-capabilities-p2p3)).
- **When the P2 and P3 surfaces ship.** The
  [P2](prd.md#22-mvp-and-delivery-priorities) and P3 sections — the
  second and third delivery priorities, after the MVP — are
  specified: the media index ([§3.7](#37-media-index-p2)), the
  scenario-page P2 features, inverse mode
  ([§5.14](#514-inverse-mode-p2), including the key `observed` of the
  [DD-11](#1-ddd-decision-register) (Canonical scenario
  serialization) object, `scenario.json` schema version 2, and
  `conditions.csv`), chart export, and the later product pages
  ([§6.4](#64-product-pages-beyond-the-scenario-page-p2p3)). Their
  scheduling belongs to the implementation plan. Shared links are
  the exception below.
- **Shared links.** Only the parameter names are reserved; the value
  grammar is deferred
  ([§5.6](#56-scenario-state-and-url-encoding)) to the revision of
  this document that opens the P2 shared-links lane. That revision
  waits for the product owner to add to
  [PDD §7.1 — Shared links](pdd.md#71-shared-links) what a reader
  sees when a link carries an invalid or out-of-vocabulary value, on
  which PDD §7.1 is silent. The
  [D-15](pdd.md#1-decision-register) (Shared-link version notice)
  wiring waits with it
  ([§6.2](#62-software-and-data-version-stamps)).
- **Finer logarithmic bins.** The width panel's logarithmic axis
  ships with octave bins from 0.1 m ([§5.12](#512-charts),
  Logarithmic scale). Bins that subdivide each decade by mantissa
  steps are a P2 option that would need an amendment of
  [D-23](pdd.md#1-decision-register) (Reader-facing display precision
  per quantity), because their edges do not all print exactly at the
  0.1 m width precision (§5.12).
- **Owner records for the P2 lane.** Three choices wait for the P2
  lane, each recorded in its section: the exact nav lines of the
  morphology and measurement pages, the owner's decision under
  [PDD §2.2 — Entry point (D-2, Decided 2026-10-28)](pdd.md#22-entry-point-d-2-decided-2026-10-28)
  ([§6.4](#64-product-pages-beyond-the-scenario-page-p2p3)); checking
  those pages' verbatim
  [PDD §5.12 — Morphology descriptions (FR-E1; research-group review required)](pdd.md#512-morphology-descriptions-fr-e1-research-group-review-required)
  and
  [PDD §5.13 — Measurement explanation (FR-E2)](pdd.md#513-measurement-explanation-fr-e2)
  texts through copy markers, as the disclaimer section of
  `scenario.md` is checked (the record after step 8 of
  [§5.13](#513-application-configuration)); and accepting an observed
  range outside the recorded extent literally — the recommended
  reading of
  [PDD §3.8 — Inverse mode (FR-X2, P2)](pdd.md#38-inverse-mode-fr-x2-p2),
  which awaits the owner ([§5.14](#514-inverse-mode-p2)).
- **Questions for the ADR process.** Inverse mode's categorical
  condition panels need either the histogram kind over discrete
  values or an amendment of
  [ADR-0011 — Webapp toolchain — TypeScript + esbuild, no framework, SVG charts](../adr/0011-webapp-toolchain.md),
  resolved before §5.14 ships (§5.12). Settling the proposed
  no-raw-twin rule, which [§4.2](#42-publication-of-a-data-vintage)
  is designed against ([DD-7](#1-ddd-decision-register)), stays with
  [ADR-0014 — Product artifacts in release assets, pinned by a committed manifest](../adr/0014-committed-content-hashed-artifacts.md).
  Accepting
  [ADR-0016 — Performance reference environment — an on-demand AWS VM defined by Terraform](../adr/0016-performance-reference-environment.md),
  which the `perf/` root of
  [§2](#2-repository-structure-naming-and-toolchain),
  [§7.6](#76-performance-and-compatibility-measurements), and
  [DD-12](#1-ddd-decision-register) (Performance reference
  environment) are designed against, stays with the owner, owner
  action OA-12 of the
  [implementation plan](ip.md#4-owner-and-research-group-actions);
  the Terraform root and every reference run wait for it.
  The "Kern County is red" correction of
  [ADR-0007 — Dashboard design conventions](../adr/0007-dashboard-design-conventions.md)
  goes through the ADR process, not this document.
- **Not designed.** The reserved fourth measurement panel
  ([D-20](pdd.md#1-decision-register), Us − Ud as a fourth displayed
  measurement) is kept as a slot after the third panel; the `us_ud`
  column stays out of the artifact, and admitting it is a new
  encoding decision and a new vintage (§3.1). No native full-dataset
  exploration panel is designed, per
  [D-19](pdd.md#1-decision-register) (Native full-dataset exploration
  panel in v0.3). The derived-magnitude display
  ([C10](prd.md#24-capability-map), View slip and derived magnitude
  together where appropriate; P2) is not designed in this revision.
- **Open decisions.** Decisions owned by the research group or the
  product owner — the Open rows of the
  [PDD §1 — Decision register](pdd.md#1-decision-register) — are
  designed around, never closed here. So are two records the owner
  makes with the research group: which rows of each field source
  belong to the default set of
  [D-18](pdd.md#1-decision-register) (Field-overlay default set and
  per-source analogue map), which owner action OA-14 of the
  [implementation plan](ip.md#4-owner-and-research-group-actions)
  records, [§3.4](#34-field-data-export) carrying a Proposed reading
  until then; and the source terms, attributions, and licensing wording
  that `data/REDISTRIBUTION.md`, the README, and `LICENSE-docs` state
  for the distributed exports, which the owner commits with the assumed
  terms under owner action OA-1 and then replaces with the final texts
  of owner action OA-13, written with the research group — the two
  phases of
  [§4.4](#44-licensing-archival-distribution-and-release-attachments)
  (Vintage terms), which cites them, never grants them.

*Verification (planned):* the owner's review of this section checks
that every deferral sentence of
[§1](#1-ddd-decision-register)–[§7](#7-testing-specification) — in
§1, §2, §3.1, §3.4, §4.4, §5.6, §5.12, §5.13, §5.14, §6.4, and §7.6 —
has its item above, and that each item names its owning authority.

References:

- [HLDD §10 — Risks and open
  dependencies](hldd.md#10-risks-and-open-dependencies).
- [HLDD §11 — Decision records](hldd.md#11-decision-records).
- [PDD §1 — Decision register](pdd.md#1-decision-register).

## 10. Relationship to the implementation plan

The [implementation plan](ip.md) schedules the work this document
specifies and adds no design content: it orders the work, assigns
milestones, effort, and executors, and attaches acceptance checks,
each task citing a DDD anchor for every technical fact. Its release
sequence instantiates the refresh and release checks of
[HLDD §9 — Testing and release architecture](hldd.md#9-testing-and-release-architecture);
its gates are the [SC-1–SC-7](pdd.md#101-success-criteria) criteria
and the required pre-release checks, nothing new, and it holds work
that depends on a Proposed decision until the owner accepts it, as
[Authority and change control](#authority-and-change-control)
requires: the Terraform root of
[ADR-0016 — Performance reference environment — an on-demand AWS VM defined by Terraform](../adr/0016-performance-reference-environment.md)
waits for owner action OA-12. Its traceability
tables ([IP §7 — Traceability](ip.md#7-traceability)) repeat, row
for row, the [§8](#8-traceability) rows whose obligations fall on
the plan, and its task T-04 builds the lint that keeps each pair
identical (the closing *Verification (planned):* paragraph of §8).
When a task cannot be written unambiguously from the anchors it
cites, the missing fact is a defect of this document, fixed here
([IP §8 — Relationship to the DDD](ip.md#8-relationship-to-the-ddd)).

*Verification (planned):* review of the implementation plan checks
that every gate and every technical fact cites a DDD anchor; the
`check_traceability.py` lint of §8 checks that every task, owner
action, and gate the matrix cites exists in the plan, and that every
IP §7 row equals its §8 twin.

References:

- [HLDD §12 — Scope of the following
  documents](hldd.md#12-scope-of-the-following-documents).
- [HLDD §9 — Testing and release architecture](hldd.md#9-testing-and-release-architecture).
- [PDD §10.1 — Success criteria](pdd.md#101-success-criteria).
- [Implementation plan](ip.md) (§7 Traceability; §8 Relationship to
  the DDD).
