# Ground Rupture Explorer — detailed design document

**Status:** skeleton for owner approval (2026-10-29). Each section
below is a stub — a scope statement, its governing sources, and how
its content will be verified. Section bodies are drafted one at a
time after the owner approves this structure.

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
decision register, and product-facing statements — rather than every
technical detail, and accepts each drafted section on evidence rather
than on careful reading. The evidence is layered, and none of it is a
proof: each drafted section states its design rationale; an
adversarial review round examines it against the sources; the
executable checks of the verification contract below verify exactly
the properties they test; and the traceability matrix of
[§8](#8-traceability) shows coverage, not satisfaction. Approval
remains the owner's accountable act, taken on that evidence.

### Authority and change control

This document inherits the boundary set by
[HLDD §12 — Scope of the following
documents](hldd.md#12-scope-of-the-following-documents): the DDD
specifies implementation under rules already established by the
product documents and the core Python implementation, and it must not
independently redefine scientific or statistical behavior.

- Product behavior, reader-facing text, and user-visible states are
  the PDD's; this document cites them and never rewrites them.
- Architecture is the accepted ADRs'
  ([ADR-0010–ADR-0015](../adr/README.md)); a change goes through the
  repository's ADR process before dependent work proceeds.
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
   check named beside the value.
3. **Registered** — recorded as a row of
   [§1](#1-ddd-decision-register), the register of decisions this
   document itself closes, each with its own verification.

A number with none of these origins is a defect. Reader-visible
content splits by authority
([ADR-0015 — Golden-scenario references and a pipeline↔client parity
harness](../adr/0015-golden-scenario-parity.md)): research-derived
values and research-group conventions — coefficients, the scarp-class
palette and its canonical order, physical ranges, storage metadata,
stage spacing — are never hardcoded and arrive only through
pipeline-written files; product settings decided in the PDD reach the
application only
through the configuration of
[§5.13](#513-application-configuration); reader-facing copy is the
PDD's, carried as maintained application resources that cite their
copy-deck source; and state-derived text is generated from the active
state, never frozen.

### Document conventions

The mechanical conventions of the earlier documents bind here: link
text is the verbatim heading or row title (a bare linked ID carries
any paraphrase outside the link); every requirement, decision, and
risk ID is linked at first use in a section; prose wraps at 72
columns; the word "outcomes" is not used; the PRD and PDD are never
called design documents. In this skeleton each section stub states
*Scope*, *Sources* (the obligations it discharges; §1 carries its
sources in the register table), *Closes* (register rows, where any),
and *Verification*; a drafted section replaces its stub and ends with
a conventional References list.

## 1. DDD decision register

*Scope.* The decisions this document closes itself: choices the
approved documents explicitly left to the DDD, plus conventions this
document must fix that have no governing source. A row is **Open**
while its choice is unresolved, **Proposed** when a drafted section
proposes a resolution, and **Accepted** when the owner accepts that
section; the register
records the chosen option, the grounds, and the check that verifies
the choice.

| ID | Decision to close | Constraints and candidates | Sources | Status |
|---|---|---|---|---|
| DD-1 | Scarp-dip column encoding. | Closed set: wider scaled integer, or a dictionary of the 35,854 distinct values with a 16-bit per-record index. Must restore the recorded 0.001° precision exactly for filtering, statistics, and downloads. | [HLDD §5.2 — Simulation data organization (ADR-0013)](hldd.md#52-simulation-data-organization-adr-0013); [ADR-0013](../adr/0013-row-level-scenario-artifact.md). | Open |
| DD-2 | Per-calculation numerical tolerances. | Display-rounded values compare exactly; full-precision values compare within a small per-calculation tolerance the DDD fixes and justifies. | [PDD §10.1 — Success criteria](pdd.md#101-success-criteria) (closing note); [HLDD §5.6 — Reference results and verification (ADR-0015)](hldd.md#56-reference-results-and-verification-adr-0015). | Open |
| DD-3 | Browser-testing tool and test inventory. | One evergreen browser engine; runs locally on request; required before a release; covers the checks named in the ADR-0015 second amendment of 2026-10-29 and the HLDD §9 browser-lane list. | [HLDD §9 — Testing and release architecture](hldd.md#9-testing-and-release-architecture); [ADR-0015](../adr/0015-golden-scenario-parity.md). | Open |
| DD-4 | Measurement-panel arrangement (tabs or stacked). | Both named by the PDD, which delegates the final arrangement as visual design; the walkthroughs and the default-panel rule must hold under the chosen arrangement, and the arrangement must accommodate the reserved fourth panel slot ([D-20](pdd.md#1-decision-register), Open). Because the choice is user-visible, the row closes only with the owner's acceptance of the drafted section. | [PDD §4.1 — Measurement views (FR-O1)](pdd.md#41-measurement-views-fr-o1). | Open |
| DD-5 | Histogram bin rule. | Automatic bin width scaled to the matching range and count; the rule stated in the panel's info note; behavior defined for the width panel's log-scale toggle (which the PDD permits — “may offer” — where the matched range spans more than two decades). | [PDD §4.1 — Measurement views (FR-O1)](pdd.md#41-measurement-views-fr-o1). | Open |
| DD-6 | Download file-name scenario-slug rules. | Must instantiate the PDD's file-name template deterministically from scenario state. | [PDD §6.2 — File naming](pdd.md#62-file-naming). | Open |
| DD-7 | Design §4.2 against the proposed no-raw-twin rule and record the dependency. | ADR-0014 marks the rule proposed: the compressed file is the artifact, with no uncompressed twin uploaded. The DDD designs against it and records the dependency; settling or changing the rule itself belongs to the ADR process, not to this document. | [ADR-0014](../adr/0014-committed-content-hashed-artifacts.md). | Open |
| DD-8 | Release data-attachment mechanism. | Attaching the current exports to a software release: manual checklist step or automated job. | [HLDD §9 — Testing and release architecture](hldd.md#9-testing-and-release-architecture) (Software-release data attachments). | Open |
| DD-9 | Chart text-alternative mechanism. | Every chart needs a text alternative equivalent to its content; the PDD sets the target, the DDD the mechanism. | [PDD §9.3 — Accessibility target](pdd.md#93-accessibility-target-d-17-proposed); [HLDD §7.2 — Accessibility and supported environments](hldd.md#72-accessibility-and-supported-environments). | Open |
| DD-10 | Field-naming convention at the pipeline-to-application boundary. | Export field names cross from the Python pipeline into TypeScript; fix one convention and the single mapping point. No approved document governs this; the row exists so the choice is registered rather than implicit. | [HLDD §12 — Scope of the following documents](hldd.md#12-scope-of-the-following-documents) (module interfaces; schemas). | Open |

*Verification.* Each closed row names its check: DD-1 the export
round-trip and size report of [§3.8](#38-measured-sizes); DD-2 the
parity runs of [§7.2](#72-calculation-parity-tests); DD-3 the lane of
[§7.5](#75-browser-test-lane); the rest the tests of the sections
that implement them.

## 2. Repository structure, naming, and toolchain

*Scope.* The webapp subproject's directory layout and module files;
naming rules, including the [DD-10](#1-ddd-decision-register)
field-naming convention at the pipeline-to-application boundary; the
toolchain pins (Node.js version in the Gradle build configuration,
TypeScript strict mode, esbuild, pinned dependencies) and the rule
that `tsc --noEmit` runs as a separate check from bundling; the
constraints that no application framework and no new toolchain may be
introduced without an ADR.

*Sources:*
[HLDD §4.3 — Language, toolchain, and repository
structure (ADR-0011)](hldd.md#43-language-toolchain-and-repository-structure-adr-0011);
[ADR-0011](../adr/0011-webapp-toolchain.md).

*Closes:* DD-10. *Verification:* the pins are machine-read from the
committed build configuration; CI runs the separate type check.

## 3. Data formats

*Scope.* The exact schema of every file a data vintage contains and
every file the repository commits to pin one. The subsections
preserve the PRD's four-way distinction — simulation records, derived
statistics, field measurements, reader-facing exports — and the
Tableau-oriented `dem.csv` file is not a product input
([DR-1 — Controlled data source](prd.md#dr-1-controlled-data-source)).
Each subsection fixes fields, types, encodings, and invariants;
nothing here re-decides what a value means — meanings stay with the
pipeline views and the PDD. Every format carries a schema version,
distinct from the data vintage, with required and optional fields
stated and a supported-version check before any field is interpreted;
structural validation precedes any read of binary offsets; and the
checksum dependency graph is acyclic — the artifact manifest
checksums the data files, the pointer manifest checksums every
vintage file including the artifact manifest, and no file checksums
itself.

### 3.1 Scenario artifact binary layout

*Scope.* Trial table (3,434 rows: fault dip, sediment arm and
strength, depth, density, reserved model-family dimension) and stage
arrays (346,834 entries: slip, scarp height, deformation-zone width,
scarp dip, scarp class); 16-bit scaled-integer encodings with their
scales and null sentinels; negative measurements are valid values
carried as-is, represented losslessly
([DR-4 — Measurement hygiene](prd.md#dr-4-measurement-hygiene), cited
rather than re-decided); the scarp-dip column per
[DD-1](#1-ddd-decision-register); endianness and byte layout; the
within-trial ascending-slip invariant; and a decoding boundary that
does not make the current layout a permanent requirement — the 3D
format stays undecided
([HLDD §10 — Risks and open
dependencies](hldd.md#10-risks-and-open-dependencies)), and the
layout must not preclude the per-family partition ADR-0013 names as
the contingency if the grown ensemble stops fitting the budgets in a
single artifact.

*Sources:*
[HLDD §5.2 — Simulation data organization
(ADR-0013)](hldd.md#52-simulation-data-organization-adr-0013);
[ADR-0013](../adr/0013-row-level-scenario-artifact.md);
[DR-7 — Future 3D compatibility](prd.md#dr-7-future-3d-compatibility).

*Closes:* DD-1. *Verification:* export round-trip restores every
value losslessly; no valid value collides with a sentinel; ordering
validated at export ([§4.1](#41-export-task-and-validation)).

### 3.2 Artifact manifest

*Scope.* Every field of the JSON manifest that travels with the
vintage and is read by the page: the manifest's schema version
(distinct from the export version and date); export version and date;
record and trial counts; per-column physical minimum, maximum,
recording step, and storage scale; simulation-stage spacing; label
dictionaries in canonical order, including the scarp-class palette
re-emitted from
`config.py`; null-sentinel definitions; checksums; the content-hashed
filenames of the vintage's other browser-loaded exports; the paired
reference-results version; support for naming more than one artifact
file, which keeps the per-family contingency open without prescribing
the undecided 3D format
([DR-7 — Future 3D compatibility](prd.md#dr-7-future-3d-compatibility));
the page fetches only the default 2D family.

*Sources:*
[HLDD §5.2 — Simulation data organization
(ADR-0013)](hldd.md#52-simulation-data-organization-adr-0013);
[HLDD §5.4 — Pinned, versioned artifacts
(ADR-0014)](hldd.md#54-pinned-versioned-artifacts-adr-0014);
[FR-G2 — Scarp-type colors and
identification](prd.md#fr-g2-scarp-type-colors-and-identification).

*Verification:* manifest generated and cross-checked against the
artifact in the same export run; schema validated by the export task.

### 3.3 Pointer manifest

*Scope.* The committed file that pins a vintage: data tag,
content-hashed filenames, checksums covering every file in the
vintage, the artifact manifest included, the schema version, export
version and date; support for pinning more than one artifact file
(the same per-family contingency). Read by CI, never by the page.

*Sources:*
[HLDD §5.4 — Pinned, versioned artifacts
(ADR-0014)](hldd.md#54-pinned-versioned-artifacts-adr-0014);
[ADR-0014](../adr/0014-committed-content-hashed-artifacts.md);
[DR-2 — Versioned exports](prd.md#dr-2-versioned-exports).

*Verification:* CI fetch-and-verify fails the build on any missing
file or checksum mismatch.

### 3.4 Field-data export

*Scope.* Columns and types; the pipeline views that supply the
records and the overlapping-record rule (the views are not simply
combined); normalized event names carried with source identity; each
measurement value with its source-specific analogue kind — which
simulated quantity it stands in for — and units; the three-state
sub-50 m criterion flag; not-applicable distinguished from failed;
labeled-event-set membership; the column slot reserved for the open
[D-6](pdd.md#1-decision-register) Kern County answers.

*Sources:*
[HLDD §5.5 — Field-data export (ADR-0012)](hldd.md#55-field-data-export-adr-0012);
[ADR-0012](../adr/0012-product-data-exports.md);
[DR-5 — Field-data preparation](prd.md#dr-5-field-data-preparation).

*Verification:* export compared against its pipeline views in the
export run; membership counts pinned by pipeline tests.

### 3.5 Regression export

*Scope.* Per-dip regression coefficients — slope and intercept — with
direction, the quantities and units used, whether the relationship
includes an intercept or is constrained through zero, provenance, and
version; the pinned values the dashboards already publish (slopes
0.5021 at 30°, 0.6453 at 40°; intercepts −0.0051 and −0.0071).

*Sources:*
[HLDD §5.7 — Conversion coefficients (ADR-0015)](hldd.md#57-conversion-coefficients-adr-0015);
[ADR-0012](../adr/0012-product-data-exports.md) (amendment of
2026-10-29).

*Verification:* `test_regression_views.py` pins the coefficients;
the export is compared against the view.

### 3.6 Reference results

*Scope.* Per golden scenario GS-0–GS-7: matching-record count,
per-measurement valid and excluded-null counts, the full
[FR-O2 — Summary statistics](prd.md#fr-o2-summary-statistics) set at
full precision; the selection identities with scarp-type classes, or
an exact signature covering both; for offset-mode scenarios, each
dip's converted slip window and range flag; for empty scenarios, the
expected diagnosed-condition set (GS-4); pairing to the artifact
version. When the P2 animation offer ships, per-class counts over
classified matching records join the reference set — a new displayed
statistic lands in the reference generator first
([ADR-0015](../adr/0015-golden-scenario-parity.md)).

*Sources:*
[HLDD §5.6 — Reference results and verification
(ADR-0015)](hldd.md#56-reference-results-and-verification-adr-0015);
[PDD §10.2 — Golden scenarios](pdd.md#102-golden-scenarios);
[ADR-0015](../adr/0015-golden-scenario-parity.md).

*Verification:* generated by the pipeline; consumed unchanged by the
parity tests of [§7.2](#72-calculation-parity-tests).

### 3.7 Media index (P2)

*Scope.* Entry fields for animations and photographs — file location
and purpose, scarp type where applicable, attribution, captions,
permission status — with availability as a data condition, not an
assumption. Ships with the second delivery priority; the schema is
fixed now so the artifact layout does not change later.

*Sources:*
[HLDD §6.2 — Media architecture (ADR-0012)](hldd.md#62-media-architecture-adr-0012);
[ADR-0012](../adr/0012-product-data-exports.md).

*Verification:* permission-status values gate the release check of
[§7.7](#77-site-validation-and-release-checklist).

### 3.8 Measured sizes

*Scope.* The measured, not estimated, sizes: which encoding each
published measurement represents; the complete size of the selected
representation (stage arrays, trial table, dictionaries, and artifact
manifest together), raw and compressed; the JavaScript bundle size.
This section discharges the HLDD's duty to replace planning estimates
with measurements of a generated export.

*Sources:*
[HLDD §5.2 — Simulation data organization
(ADR-0013)](hldd.md#52-simulation-data-organization-adr-0013);
[HLDD §7.1 — Performance estimates and
verification](hldd.md#71-performance-estimates-and-verification);
[HLDD §10 — Risks and open
dependencies](hldd.md#10-risks-and-open-dependencies).

*Discharges:* the size half of the
[R-16](prd.md#94-delivery-and-technical-risks) feasibility
measurements (the gate itself is confirmed by the owner per HLDD
§10). *Verification:* every figure generated by the measurement
procedure of
[§7.6](#76-performance-and-compatibility-measurements), with the
artifact version recorded.

## 4. Export task and data lifecycle

### 4.1 Export task and validation

*Scope.* The Gradle task names and steps: build the four
research-data exports from their DuckDB views and the media index
from project-maintained metadata, without a view
([ADR-0012](../adr/0012-product-data-exports.md), amendment of
2026-10-29); write both manifests in the same run; validation before
anything is published — lossless round-trip of every encoded value,
no sentinel collision, within-trial ascending-slip order with no
ties, re-read comparison of every record and value against the source
views, and consistency between the artifact manifest and the pointer
manifest, where disagreement fails the export; the required full-data
checks, local-only, where a skipped check is not a pass.

*Sources:*
[HLDD §5.6 — Reference results and verification
(ADR-0015)](hldd.md#56-reference-results-and-verification-adr-0015);
[HLDD §9 — Testing and release architecture](hldd.md#9-testing-and-release-architecture);
[HLDD §5.4 — Pinned, versioned artifacts
(ADR-0014)](hldd.md#54-pinned-versioned-artifacts-adr-0014);
[ADR-0014](../adr/0014-committed-content-hashed-artifacts.md).

*Verification:* the validation is itself exercised by pipeline tests
on fixtures ([§7.3](#73-pipeline-and-export-tests)).

### 4.2 Publication of a data vintage

*Scope.* The operational sequence: create the data tag and
prerelease, upload the content-hashed, pre-compressed files, verify
the uploaded bytes against local checksums, and only then commit the
pointer manifest; one task, one run, one commit per vintage; a
filename is never reused for different bytes.

*Sources:*
[HLDD §5.4 — Pinned, versioned artifacts
(ADR-0014)](hldd.md#54-pinned-versioned-artifacts-adr-0014);
[ADR-0014](../adr/0014-committed-content-hashed-artifacts.md)
(amendment of 2026-10-29);
[`notes/Roadmap.md` — Decisions made](../../notes/Roadmap.md#decisions-made).

*Closes:* DD-7. *Verification:* CI's independent fetch-and-verify of
the committed pointer confirms the published state.

### 4.3 Retention, rollback, recovery, and withdrawal

*Scope.* Retention of earlier vintages needed for historical builds
and rollback; rollback as a pointer-manifest revert, conditional on
asset availability and application format support; recovery when a
retained vintage's assets become unavailable — retained verified
copies are the primary mechanism, and regeneration by re-running the
pinned export is a fallback whose prerequisites the section must
state (exact input versions, code, dependencies, and serialization
and compression settings); a regenerated file either reproduces the
pointer's checksums or is published as a new vintage, never silently
replacing the files behind an existing pointer; withdrawal steps that
reach both the release assets and the site-published copies.

*Sources:*
[HLDD §5.4 — Pinned, versioned artifacts
(ADR-0014)](hldd.md#54-pinned-versioned-artifacts-adr-0014)
(Retention, rollback, and withdrawal);
[HLDD §10 — Risks and open
dependencies](hldd.md#10-risks-and-open-dependencies);
[ADR-0014](../adr/0014-committed-content-hashed-artifacts.md).

*Verification:* rollback rehearsed per the
[HLDD §9 — Testing and release
architecture](hldd.md#9-testing-and-release-architecture) rollback
check; recovery verified by checksum identity.

### 4.4 Licensing, archival distribution, and release attachments

*Scope.* The license and attribution metadata each vintage carries;
the software-release arrangement that attaches the current exports
beside the plotting CSVs, with the mechanism per
[DD-8](#1-ddd-decision-register); the archival-distribution
arrangement — the Zenodo dataset-record deposit step, the rule that
the archival procedure verifies what files are actually preserved,
and the matching README and `LICENSE-docs` wording. Redistribution
permission itself is an owner-and-research-group gate this document
cites, never grants.

*Sources:*
[Licensing and archival distribution](hldd.md#licensing-and-archival-distribution);
[`notes/Roadmap.md` — Decisions made](../../notes/Roadmap.md#decisions-made);
[NFR-6 — Licensing](prd.md#nfr-6-licensing).

*Closes:* DD-8. *Verification:* the release checklist of
[§7.7](#77-site-validation-and-release-checklist) checks attachment
identity (the files named by the pointer manifest, byte for byte).

## 5. Application design

### 5.1 Modules and interfaces

*Scope.* The module map and each module's interface: artifact loader,
decoder, query engine (pure and synchronous per
[ADR-0015](../adr/0015-golden-scenario-parity.md), so Node can drive
it; its execution scheduling is designed in [§5.3](#53-query-engine)),
statistics, scenario state, view layer, downloads, field overlay,
configuration. State-to-view update, event handling, initialization,
cleanup on leaving the page, and browser-history handling are
application responsibilities — no framework. The scenario application
is the product's only application surface: dashboards are linked,
never embedded, and the P2 morphology-page family-grouping control is
a page-local script outside this module map.

*Sources:*
[HLDD §6 — Application architecture](hldd.md#6-application-architecture);
[HLDD §4.2 — Surface map (ADR-0010)](hldd.md#42-surface-map-adr-0010);
[HLDD §4.3 — Language, toolchain, and repository
structure (ADR-0011)](hldd.md#43-language-toolchain-and-repository-structure-adr-0011);
[ADR-0011](../adr/0011-webapp-toolchain.md).

*Verification:* interfaces exercised by the application tests of
[§7.4](#74-application-tests); the parity harness drives the same
engine code headlessly, which requires it to stay free of browser
dependencies and side effects.

### 5.2 Artifact loading and decoding

*Scope.* Fetch of the pinned, pre-compressed files; explicit
decompression under the transport contract of
[§6.1](#61-build-outputs-asset-paths-and-page-scaffold); typed-array
views over the byte layout of
[§3.1](#31-scenario-artifact-binary-layout); structural and
schema-version validation before any binary offset is interpreted;
runtime verification that the loaded data version matches the page's
expected version; the mismatch path into
[§5.10](#510-failure-states). The reference
results are test inputs only: the page never fetches them, and they
are excluded from the payload measurement of
[§7.6](#76-performance-and-compatibility-measurements).

*Sources:*
[HLDD §7.3 — Delivery and caching](hldd.md#73-delivery-and-caching);
[HLDD §7.1 — Performance estimates and
verification](hldd.md#71-performance-estimates-and-verification);
[HLDD §8 — Site integration](hldd.md#8-site-integration) (Software
and data versions).

*Verification:* decode results compared record-for-record against
reference selections in the parity tests.

### 5.3 Query engine

*Scope.* The one scan pattern: trial mask over site conditions, then
stride-101 scan for the slip window, population rule, scarp-type
filter, and valid/null split; the one-state-per-trial rule — with a
window active, the record at the highest slip within the window;
with no active window, the trial's actual final recorded state, never
an intersection with any implicit window
([DR-3 — One-state-per-trial
population](prd.md#dr-3-one-state-per-trial-population), GS-7); the
two-count model (records matched; valid values per measurement);
unclassified-record semantics per
[PDD §4.3 — Unclassified records](pdd.md#43-unclassified-records-d-12-proposed);
the single-condition empty-result diagnostic of
[PDD §4.5 — Small, empty, and partial
results](pdd.md#45-small-empty-and-partial-results-fr-o3-d-11-proposed)
(re-run the match with each selected condition relaxed alone);
execution scheduling — any debouncing or background execution needed
to meet the 200 ms interaction budget, wrapped around the pure,
synchronous engine so the same calculation code remains drivable by
the Node parity tests.

*Sources:*
[HLDD §6 — Application architecture](hldd.md#6-application-architecture)
(Query engine);
[ADR-0013](../adr/0013-row-level-scenario-artifact.md).

*Verification:* selection identities, classes, counts, range flags,
and the GS-4 diagnosed-condition set must equal the references
exactly ([§7.2](#72-calculation-parity-tests)).

### 5.4 Statistics

*Scope.* The exact algorithms behind the
[FR-O2 — Summary statistics](prd.md#fr-o2-summary-statistics) set,
including the percentile definition, which must reproduce the
pipeline's definition, and null exclusion per the two-count model.
Measurement hygiene — nulls, small negative values, low-slip
reliability — is the pipeline's policy
([DR-4 — Measurement hygiene](prd.md#dr-4-measurement-hygiene)),
carried by the export's validity semantics: the application never
re-filters, clamps, or excludes values on its own, in displays,
statistics, or downloads. New displayed statistics land in the
pipeline's reference generator first.

*Sources:*
[HLDD §5.6 — Reference results and verification
(ADR-0015)](hldd.md#56-reference-results-and-verification-adr-0015);
[ADR-0015](../adr/0015-golden-scenario-parity.md);
[PDD §4.2 — Statistics table (FR-O2)](pdd.md#42-statistics-table-fr-o2).

*Verification:* full-precision parity within
[DD-2](#1-ddd-decision-register) tolerances; display-rounded parity
exact.

### 5.5 Offset-to-slip conversion assist

*Scope.* The back-projection `slip = (vertical − intercept) / slope`
applied per selected dip with the exported coefficients; per-dip
converted windows, their union, and range flags; assist-panel values
and provenance line; invalid and out-of-range entry handling per the
PDD.

*Sources:*
[HLDD §5.7 — Conversion coefficients (ADR-0015)](hldd.md#57-conversion-coefficients-adr-0015);
[ADR-0012](../adr/0012-product-data-exports.md) (amendment of
2026-10-29, the approved back-projection);
[PDD §3.5 — Offset-entry mode and conversion assist
(FR-S5)](pdd.md#35-offset-entry-mode-and-conversion-assist-fr-s5);
[PDD §3.6 — Multi-dip conversion rule](pdd.md#36-multi-dip-conversion-rule-d-3-proposed).

*Verification:* GS-1's range flags and the resulting selections match
the references exactly; the converted windows agree within the
[DD-2](#1-ddd-decision-register) tolerances, and the filtering
decision may not differ even when an endpoint sits at a recorded-slip
or window boundary.

### 5.6 Scenario state and URL encoding

*Scope.* The scenario-state model; the shared-link URL codec (P2) —
the named query parameters are a de facto public interface, and the
inverse-mode state of [§5.14](#514-inverse-mode-p2) joins the encoded
inventory — and the version notice per
[PDD §7.2 — Version display and notice](pdd.md#72-version-display-and-notice-d-15-proposed).
State-only URLs: results are never stored in links.

*Sources:*
[HLDD §6 — Application architecture](hldd.md#6-application-architecture)
(Scenario state and shared-link encoding);
[ADR-0010](../adr/0010-native-client-side-scenario-app.md);
[PDD §7.1 — Shared links](pdd.md#71-shared-links).

*Verification:* codec round-trip tests; deterministic replay in the
browser lane.

### 5.7 Scenario controls

*Scope.* Each input control of
[PDD §3 — Scenario page: inputs](pdd.md#3-scenario-page-inputs):
enumerations, ranges, and recording steps sourced from the
[§3.2](#32-artifact-manifest) manifest, never hardcoded; defaults
(all values selected; the displacement window inactive per
[D-22](pdd.md#1-decision-register)); the dip range-entry assist that
echoes which modeled values an entry includes; the two-arm sediment
multi-select — the selection is the combination of arm and label —
with its helper text and the disabled Advanced group pending
[R-2](prd.md#91-scientific-and-data-dependencies); depth and density
values; the slip-window entry with inclusive endpoints, only-a-maximum
read as 0-to-maximum, and the export's recorded range and step stated
beside the control; reset over every control; immediate update with
no submit step; the layout with the persistent scenario summary
generated from state.

*Sources:*
[PDD §3.1 — Fault dip (FR-S1)](pdd.md#31-fault-dip-fr-s1);
[PDD §3.2 — Sediment strength and structure
(FR-S2)](pdd.md#32-sediment-strength-and-structure-fr-s2);
[PDD §3.3 — Sediment depth (FR-S3) and density
(FR-S4)](pdd.md#33-sediment-depth-fr-s3-and-density-fr-s4);
[PDD §3.4 — Displacement window (FR-S5)](pdd.md#34-displacement-window-fr-s5);
[PDD §3.7 — Population, scarp filter, family view,
reset](pdd.md#37-population-scarp-filter-family-view-reset).

*Verification:* control enumerations asserted equal to the manifest
dictionaries; control behavior exercised in the browser lane.

### 5.8 View layer

*Scope.* Panels and rendering: measurement views with the
[DD-4](#1-ddd-decision-register) arrangement and
[DD-5](#1-ddd-decision-register) histogram rule; statistics table
with display rounding per
[PDD §4.2 — Statistics table (FR-O2)](pdd.md#42-statistics-table-fr-o2)
([D-23](pdd.md#1-decision-register)), never reducing stored
precision; notice precedence — exactly one of the four
[PDD §5.8 — Small and empty results (FR-O3,
D-11)](pdd.md#58-small-and-empty-results-fr-o3-d-11) result notices
at a time, while the independent caveats coexist with it —
provisional data and width scope per
[SC-5](pdd.md#101-success-criteria), low slip per
[PDD §4.6 — Low-slip caveat (D-4,
Interim)](pdd.md#46-low-slip-caveat-d-4-interim); the
use site and trigger of every reader-facing text of
[PDD §5 — Copy deck](pdd.md#5-copy-deck): the standing and short
disclaimers, the [D-5](pdd.md#1-decision-register) provisional-data
notice everywhere scarp dip appears, the
[D-4](pdd.md#1-decision-register) low-slip caveat with its
window-based trigger
([PDD §4.6 — Low-slip caveat (D-4, Interim)](pdd.md#46-low-slip-caveat-d-4-interim)),
canonical labels and units with first-use glossary links
([PDD §5.11 — Labels, units, and glossary links (FR-G3, CR-3,
CR-7)](pdd.md#511-labels-units-and-glossary-links-fr-g3-cr-3-cr-7));
the P2 animation offer with the
[D-7](pdd.md#1-decision-register) dominance rule — computed over
classified matching records, 10-point gap, three-type cap with
canonical-order tie-break, 30 % floor, 20-record minimum, suppressed
at zero classified, ignoring the family toggle
([PDD §6.4 — Animation offer and dominance (FR-D4, P2; D-7
Proposed)](pdd.md#64-animation-offer-and-dominance-fr-d4-p2-d-7-proposed));
family view, field overlay, and the withheld Kern County preset;
result-state presentation precedence.

*Sources:*
[HLDD §6 — Application architecture](hldd.md#6-application-architecture)
(View layer);
[PDD §4.1 — Measurement views (FR-O1)](pdd.md#41-measurement-views-fr-o1);
[PDD §4.4 — Field overlay](pdd.md#44-field-overlay-fr-o5-d-18-proposed);
[PDD §4.5 — Small, empty, and partial
results](pdd.md#45-small-empty-and-partial-results-fr-o3-d-11-proposed).

*Closes:* DD-4, DD-5. *Verification:* golden-scenario spot checks in
the browser lane compare displayed values to display-rounded
references exactly; offer shares recomputable from the per-class
reference counts that join [§3.6](#36-reference-results) with P2.

### 5.9 Downloads

*Scope.* Download package contents and provenance field order; file
naming from the PDD template with
[DD-6](#1-ddd-decision-register) slug rules; the invariant that a
download never combines current settings with previous results.

*Sources:*
[PDD §6.1 — Download package (FR-D1)](pdd.md#61-download-package-fr-d1);
[PDD §6.2 — File naming](pdd.md#62-file-naming);
[HLDD §6.1 — Failure honesty (ADR-0010)](hldd.md#61-failure-honesty-adr-0010).

*Closes:* DD-6. *Verification:*
[SC-2](pdd.md#101-success-criteria) reproducibility — a downloaded
package reproduces the displayed scenario and numbers.

### 5.10 Failure states

*Scope.* Implementation of the four failure categories — invalid or
out-of-range input; no data for the selected scenario; unavailable
browser capabilities; internal failure, including startup,
calculation, and rendering — using the PDD's copy; retained results
visibly belong to the last valid scenario; out-of-range entries are
accepted and flagged, never rejected; the no-JS fallback body (which
also serves as the page's search-indexable description,
[ADR-0010](../adr/0010-native-client-side-scenario-app.md)), while
disabled JavaScript, startup failure, and data or calculation
failures keep their distinct messages per the four categories;
version-mismatch handling.

*Sources:*
[HLDD §6.1 — Failure honesty (ADR-0010)](hldd.md#61-failure-honesty-adr-0010);
[PDD §3.5 — Offset-entry mode and conversion assist
(FR-S5)](pdd.md#35-offset-entry-mode-and-conversion-assist-fr-s5);
[PDD §5 — Copy deck](pdd.md#5-copy-deck);
[ADR-0010](../adr/0010-native-client-side-scenario-app.md).

*Verification:* each state driven and asserted in the browser lane
(an unavailable artifact produces the unavailable-results state,
never empty or stale results).

### 5.11 Accessibility, supported environments, and navigation lifecycle

*Scope.* Keyboard operability, focus management, and live
announcements for loading, successful updates, invalid inputs, empty
results, and failures; chart text alternatives per
[DD-9](#1-ddd-decision-register); the
[D-16](pdd.md#1-decision-register) supported-environments baseline
and the 360 px mobile floor with no hover-dependent essentials
([PDD §9.2 — Browser and mobile
baseline](pdd.md#92-browser-and-mobile-baseline-d-16-proposed)) as
design constraints; initialization and cleanup across MkDocs page
navigation so repeated visits create no duplicate controls, handlers,
or results.

*Sources:*
[HLDD §7.2 — Accessibility and supported
environments](hldd.md#72-accessibility-and-supported-environments);
[PDD §9.3 — Accessibility target](pdd.md#93-accessibility-target-d-17-proposed);
[HLDD §4.3 — Language, toolchain, and repository
structure (ADR-0011)](hldd.md#43-language-toolchain-and-repository-structure-adr-0011).

*Closes:* DD-9. *Verification:* automatable accessibility checks, the
repeated-navigation check, and the responsive-layout pass in the
browser lane.

### 5.12 Charts

*Scope.* The hand-rolled SVG charts — exactly two chart kinds,
histogram and empirical cumulative curve, plus overlay marks
([ADR-0011](../adr/0011-webapp-toolchain.md)), for the MVP's
continuous measurement panels — layout, scales, labels, interaction,
resizing; chart export with caption strip and sidecar (P2). The
inverse mode of [§5.14](#514-inverse-mode-p2) draws the
[PDD §4.8 — Inverse-mode results (FR-X2,
P2)](pdd.md#48-inverse-mode-results-fr-x2-p2) condition panels in the
same chart grammar; because four of its distributions are
categorical, shipping them requires either the histogram kind over
discrete condition values or an ADR-0011 amendment — resolved through
the ADR process before §5.14 ships — with the per-value
count-and-share table as their accessible alternative.

*Sources:*
[HLDD §4.3 — Language, toolchain, and repository
structure (ADR-0011)](hldd.md#43-language-toolchain-and-repository-structure-adr-0011)
(Chart implementation);
[PDD §6.3 — Chart export](pdd.md#63-chart-export-fr-d2-p2-d-14-proposed).

*Verification:* rendering assertions in the browser lane; chart data
values covered by parity tests.

### 5.13 Application configuration

*Scope.* The configuration that represents PDD-decided product
settings — the small-result warning threshold and chart floor
([D-11](pdd.md#1-decision-register)), the
[D-4](pdd.md#1-decision-register) low-slip caveat trigger value,
display precision per quantity
([D-23](pdd.md#1-decision-register)), copy-deck text references —
distinct from pipeline-supplied constants, which arrive only through
the exports.

*Sources:*
[ADR-0015](../adr/0015-golden-scenario-parity.md) (amendment of
2026-10-29, product-settings exclusion);
[HLDD §5.7 — Conversion coefficients (ADR-0015)](hldd.md#57-conversion-coefficients-adr-0015)
(Other pipeline-supplied values).

*Verification:* a test asserts each configured value equals its PDD
source; no research-derived value appears in configuration.

### 5.14 Inverse mode (P2)

*Scope.* The mode switch and observed-measurement range inputs; the
inverse query — distributions of the modeled input conditions among
matching simulations; each condition panel's N is the matching-record
count itself, with excluded-null always zero; the
[PDD §4.5 — Small, empty, and partial
results](pdd.md#45-small-empty-and-partial-results-fr-o3-d-11-proposed)
tiers applied with that N; the condition panels in the same chart
grammar as the measurement views, with the per-value count-and-share
table as their accessible alternative (the categorical-chart question
routes through [§5.12](#512-charts)); the framing copy of
[PDD §5.10 — Inverse-search framing
(FR-X2)](pdd.md#510-inverse-search-framing-fr-x2); magnitude is never
an input; inverse state joins the [§5.6](#56-scenario-state-and-url-encoding)
URL inventory.

*Sources:*
[PDD §3.8 — Inverse mode (FR-X2, P2)](pdd.md#38-inverse-mode-fr-x2-p2);
[PDD §4.8 — Inverse-mode results (FR-X2,
P2)](pdd.md#48-inverse-mode-results-fr-x2-p2).

*Verification:* reference coverage is extended pipeline-first before
the mode ships; its checks join [§7.2](#72-calculation-parity-tests)
and the browser lane.

## 6. Build, site, and CI integration

### 6.1 Build outputs, asset paths, and page scaffold

*Scope.* The exact assets directory beside the scenario page; the
dedicated data directory; content-hashed output names and the
mechanism that supplies them to the page without manual edits;
pre-compressed data under an explicit transport contract — whether
the browser receives the compressed bytes for the application to
decompress, or bytes the host has already decoded — validated on the
target host, with double decompression prevented and no header
capability assumed that the hosting arrangement has not established;
the bundle
loads only on the scenario page, and the mechanism that keeps the
site-wide Tableau Embedding API module off that page (the exclusion
mechanics [ADR-0011](../adr/0011-webapp-toolchain.md) assigns here);
the scenario page's MkDocs scaffold — mount point and masthead — and
the [D-2](pdd.md#1-decision-register) navigation entries per
[PDD §2.2 — Entry point (D-2, Decided
2026-10-28)](pdd.md#22-entry-point-d-2-decided-2026-10-28), for each
surface as it ships.

*Sources:*
[HLDD §4.3 — Language, toolchain, and repository
structure (ADR-0011)](hldd.md#43-language-toolchain-and-repository-structure-adr-0011)
(Build outputs);
[HLDD §8 — Site integration](hldd.md#8-site-integration);
[HLDD §7.3 — Delivery and caching](hldd.md#73-delivery-and-caching).

*Verification:* assembled-site validation covers the generated assets
and retrieved data files, not only the Markdown source.

### 6.2 Software and data version stamps

*Scope.* Where the software version and data vintage come from, how
they are passed to the page, where they are displayed, and the
runtime check that the loaded data matches the pinned version;
cache-busting via content-hashed addresses.

*Sources:*
[HLDD §8 — Site integration](hldd.md#8-site-integration) (Software
and data versions);
[PDD §9.4 — Releases](pdd.md#94-releases);
[DR-2 — Versioned exports](prd.md#dr-2-versioned-exports).

*Verification:* version values asserted in the browser lane; cache
behavior measured per
[§7.6](#76-performance-and-compatibility-measurements).

### 6.3 CI workflows

*Scope.* The exact workflow files, jobs, and dependencies: the webapp
test job (type check, unit tests, parity harness) in `tests.yml`; the
site build with fetch-and-verify in the MkDocs and deploy workflows;
path filters covering every input that can affect the published
application, including the pointer manifest; the trigger matrix
(webapp change, data refresh, merge to `main`); the rule that tests
use only the files the committed pointer manifest identifies; a
failed build or retrieval must not replace the working published
site.

*Sources:*
[CI triggers and validation](hldd.md#ci-triggers-and-validation);
[HLDD §8 — Site integration](hldd.md#8-site-integration);
[ADR-0011](../adr/0011-webapp-toolchain.md);
[ADR-0014](../adr/0014-committed-content-hashed-artifacts.md).

*Verification:* the workflows are themselves the enforcement; the
[§8](#8-traceability) matrix maps each gate to its named workflow,
job, and check — stable identifiers, not line numbers.

### 6.4 Product pages beyond the scenario page (P2/P3)

*Scope.* The MkDocs composition of the later surfaces: the morphology
page — one section per scarp type in canonical order and colors, each
with its PDD §5.12 description, representative model snapshot,
glossary link, animation slot, and permission-gated photograph slot,
grouped by the page-local family toggle
([ADR-0010](../adr/0010-native-client-side-scenario-app.md)); the
animation library with its not-yet-available fallback
([PDD §8.2 — Animation library (D-8,
Open)](pdd.md#82-animation-library-d-8-open)); the measurements page
and the "How were these measured?" link from every statistics table
([PDD §8.3 — How the measurements are made
(FR-E2)](pdd.md#83-how-the-measurements-are-made-fr-e2)); the contact
page, with its repository links added only when the group supplies
approved URLs ([R-15](prd.md#93-content-and-media-dependencies);
[PDD §8.4 — Contact and requests (FR-E3,
P3)](pdd.md#84-contact-and-requests-fr-e3-p3)). All media arrive
through the [§3.7](#37-media-index-p2) index.

*Sources:*
[PDD §8.1 — Morphology page (FR-E1)](pdd.md#81-morphology-page-fr-e1);
[HLDD §6.2 — Media architecture (ADR-0012)](hldd.md#62-media-architecture-adr-0012);
[HLDD §4.2 — Surface map (ADR-0010)](hldd.md#42-surface-map-adr-0010).

*Verification:* site validation and the media-permission release
check of [§7.7](#77-site-validation-and-release-checklist).

## 7. Testing specification

### 7.1 Numerical tolerances

*Scope.* The [DD-2](#1-ddd-decision-register) values:
per-calculation tolerances for full-precision comparisons, with the
floating-point grounds for each; the rule that display-rounded
comparisons are exact and that tolerances never widen to hide a
defect.

*Sources:*
[PDD §10.1 — Success criteria](pdd.md#101-success-criteria);
[HLDD §5.6 — Reference results and verification
(ADR-0015)](hldd.md#56-reference-results-and-verification-adr-0015).

*Closes:* DD-2. *Verification:* the drafted section justifies each
tolerance; the parity runs of [§7.2](#72-calculation-parity-tests)
then demonstrate conformance at the fixed values — a passing run does
not itself justify a tolerance.

### 7.2 Calculation-parity tests

*Scope.* The Node parity harness in CI: fetch and checksum-verify the
pinned artifacts first; replay GS-0–GS-7 through the real query
engine; compare selection identities, scarp-type classes, counts,
range flags, and the GS-4 diagnosed-condition set exactly;
statistics and converted slip windows at full precision within
[DD-2](#1-ddd-decision-register) tolerances; display-rounded values
exactly; and conversion cases near recorded-slip and window
boundaries, where a small numeric difference could change selection —
the selection must still match exactly.

*Sources:*
[HLDD §9 — Testing and release architecture](hldd.md#9-testing-and-release-architecture)
(Calculation parity);
[ADR-0015](../adr/0015-golden-scenario-parity.md);
[PDD §10.2 — Golden scenarios](pdd.md#102-golden-scenarios).

*Verification:* a parity failure blocks merge, wired in
[§6.3](#63-ci-workflows).

### 7.3 Pipeline and export tests

*Scope.* Pytest contracts that pin the product views; fixture-sized
checks that run in CI; the required full-data checks that run locally
and gate every publication, where a skipped check is not a pass;
structural checks CI can repeat on fetched artifacts.

*Sources:*
[HLDD §9 — Testing and release architecture](hldd.md#9-testing-and-release-architecture)
(Pipeline and export tests);
[DR-3 — One-state-per-trial
population](prd.md#dr-3-one-state-per-trial-population).

*Verification:* CI runs the fixture tests on every matching trigger;
the release checklist of
[§7.7](#77-site-validation-and-release-checklist) requires the local
full-data run.

### 7.4 Application tests

*Scope.* Unit tests for decoder, state, codec, and engine behavior.
Calculation semantics follow the pipeline-first rule — each
calculation edge case is implemented and pinned pipeline-first, and
no statistical expectation is hand-maintained; those expectations
come from generated references. Application contracts the pipeline
cannot express — malformed or truncated binary files, unsupported
schema versions, data-version mismatches against the page's pinned
version, structural validation against the manifest's declared
dimensions, dictionaries, and null sentinels, invalid URL parameters,
codec round trips, state handling — use application-defined fixtures
and assertions.

*Sources:*
[HLDD §9 — Testing and release architecture](hldd.md#9-testing-and-release-architecture)
(Application-specific tests);
[ADR-0015](../adr/0015-golden-scenario-parity.md).

*Verification:* runs in the [§6.3](#63-ci-workflows) webapp job.

### 7.5 Browser test lane

*Scope.* The [DD-3](#1-ddd-decision-register) tool and inventory, run
locally on request and required before a release, against the locally
built site, in one evergreen engine: the application mounts and
replaces the no-JS fallback; an end-to-end golden-scenario check in
which displayed values equal display-rounded references exactly; the
failure states of HLDD §6.1; the scripted interactions of the test
inventory, each producing the response the PDD defines — scenario
changes, offset-mode entry and its flags, notices, and downloads;
scenario summaries, charts, tables, and downloads describing the same
active scenario; product pages rendering correctly; repeated
navigation creating no duplicates; the automatable accessibility
checks and the keyboard and responsive-layout checks per
[PDD §9.2 — Browser and mobile
baseline](pdd.md#92-browser-and-mobile-baseline-d-16-proposed) and
[PDD §9.3 — Accessibility
target](pdd.md#93-accessibility-target-d-17-proposed); deterministic
replay — the full checklist of
[HLDD §9 — Testing and release
architecture](hldd.md#9-testing-and-release-architecture) (Browser
tests — locally invoked release checks).

*Sources:*
[HLDD §9 — Testing and release architecture](hldd.md#9-testing-and-release-architecture);
[ADR-0015](../adr/0015-golden-scenario-parity.md) (second amendment
of 2026-10-29).

*Closes:* DD-3. *Verification:* the lane's own pass/fail status gates
the release checklist of
[§7.7](#77-site-validation-and-release-checklist).

### 7.6 Performance and compatibility measurements

*Scope.* The benchmark procedure: representative scenarios,
repetition count, measurement instrumentation, and the
[PDD §9.1 — Performance
budgets](pdd.md#91-performance-budgets-d-9-proposed) reference
conditions; what the payload measurement includes and what the timing
measurement includes (first meaningful render; scenario change to
updated results); bundle-size, cache-behavior, and
download-plus-decompression measurements; the browser-compatibility
verification of
[HLDD §7.2 — Accessibility and supported
environments](hldd.md#72-accessibility-and-supported-environments) —
the required APIs, decompression support among them, confirmed
throughout the
[PDD §9.2 — Browser and mobile
baseline](pdd.md#92-browser-and-mobile-baseline-d-16-proposed), and
the build output verified against that baseline, where a
language-level label is not sufficient — including the
[R-19](prd.md#94-delivery-and-technical-risks) confirmation of the
remaining engines and the mobile floor; results identify the tested
browser, device, application version, and data vintage; the
fail-optimize-remeasure loop.

*Sources:*
[HLDD §7.1 — Performance estimates and
verification](hldd.md#71-performance-estimates-and-verification);
[HLDD §7.3 — Delivery and caching](hldd.md#73-delivery-and-caching);
[HLDD §10 — Risks and open
dependencies](hldd.md#10-risks-and-open-dependencies).

*Verification:* results recorded in [§3.8](#38-measured-sizes) and
the release checklist, with browser, device, version, and vintage
named.

### 7.7 Site validation and release checklist

*Scope.* The strict site build over the assembled publication;
per-release regression checks on existing surfaces (navigation,
dashboard links and embeds, citation pages); the media-permission
release check; glossary-anchor resolution and the pre-launch glossary
additions of
[PDD §5.11 — Labels, units, and glossary links (FR-G3, CR-3,
CR-7)](pdd.md#511-labels-units-and-glossary-links-fr-g3-cr-3-cr-7);
the [D-10](pdd.md#1-decision-register) gate — no placeholder
liability text ships; the release checklist that ties
[SC-1–SC-7](pdd.md#101-success-criteria) acceptance, the browser
lane, the local full-data run, and the attachments check together.
The release record identifies the software revision, the
pointer-manifest revision and data vintage, the test-suite and lane
versions with their results, and the approval references. Checks
required for every software release are distinguished from the
full-data checks required when publishing a new vintage: a
software-only release verifies the existing vintage's recorded
publication evidence and regenerates nothing.

*Sources:*
[HLDD §8 — Site integration](hldd.md#8-site-integration);
[HLDD §9 — Testing and release architecture](hldd.md#9-testing-and-release-architecture)
(Site validation; Acceptance and release checks);
[NFR-7 — Build and data-quality
gates](prd.md#nfr-7-build-and-data-quality-gates).

*Verification:* the strict build's exit status; the checklist itself
is the release record.

## 8. Traceability

*Scope.* The obligation-coverage matrix: every statement in the PRD,
PDD, HLDD, accepted ADRs, and `notes/Roadmap.md` that assigns
something to the DDD, mapped to the section that discharges it and to
the satisfaction evidence — the check, test, job, or approval that
shows the section meets it, named by a stable identifier — with the
authority exclusions listed beside it. The matrix names its
extraction procedure and the source revisions it was swept from; it
is a working inventory, not a completeness guarantee, which is why it
is regenerated rather than maintained by hand. A matrix row may also
resolve to "implementation-plan or release-operations item
([§10](#10-relationship-to-the-implementation-plan))" or to "not a
DDD obligation (stays with its source)", so operational recipes in
`notes/Roadmap.md` close without inventing sections. The matrix is
the owner's structural review surface and the agents' audit backbone;
a sweep of the sources regenerates it, and a drafted DDD is complete
only when the matrix has no unassigned row.

*Sources:* the obligation sweep of 2026-10-29 (420 extracted
obligations across the five sources), regenerated on demand.

*Verification:* re-run the sweep against the drafted document; every
obligation names a section, every section names its obligations.

## 9. Deferred and out of scope

*Scope.* What this document deliberately does not do: no 3D data
design or ingestion before the research group supplies the dataset
and its owners decide (the artifact reserves the model-family
dimension and keeps the per-family partition contingency open); P2
and P3 sections (media index,
scenario-page P2 features, shared links, inverse mode, chart export,
the later product pages) are specified, but their scheduling belongs
to the implementation plan; the reserved fourth measurement panel
([D-20](pdd.md#1-decision-register), Us − Ud) is kept as a slot, not
designed; no native full-dataset exploration panel is designed, per
[D-19](pdd.md#1-decision-register); the derived-magnitude display
([C10](prd.md#24-capability-map), P2) is not designed in this
revision; the ADR-0007 "Kern County is red" correction goes through
the ADR process, not this document; decisions owned by the research
group or the product owner (the Open register rows) are designed
around, never closed here.

*Sources:*
[HLDD §10 — Risks and open
dependencies](hldd.md#10-risks-and-open-dependencies);
[HLDD §11 — Decision records](hldd.md#11-decision-records);
[PDD §1 — Decision register](pdd.md#1-decision-register).

*Verification:* the [§8](#8-traceability) matrix lists every deferred
item with its owning authority.

## 10. Relationship to the implementation plan

*Scope.* The implementation plan (`docs/app/ip.md`) is drafted after
this document settles. It adds no design content: it orders the work,
assigns milestones and effort, and attaches acceptance checks, each
citing a DDD anchor for every technical fact. Its release sequence
instantiates the HLDD §9 refresh and release checks; its gates are
the [SC-1–SC-7](pdd.md#101-success-criteria) criteria and the
required pre-release checks, nothing new.

*Sources:*
[HLDD §12 — Scope of the following
documents](hldd.md#12-scope-of-the-following-documents);
[HLDD §9 — Testing and release architecture](hldd.md#9-testing-and-release-architecture);
[PDD §10.1 — Success criteria](pdd.md#101-success-criteria).

*Verification:* review of the implementation plan checks that every
gate and every technical fact cites a DDD anchor.
