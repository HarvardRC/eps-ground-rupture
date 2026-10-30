# Ground Rupture Explorer — implementation plan

**Status:** skeleton for owner approval (2026-10-30). The task graph,
gates, and sequencing below are complete for scheduling; each task's
body (exact steps and commands) is drafted to the execution contract
as its DDD inputs are accepted.

This implementation plan (IP) is the last of the project's staged
documents (PRD → PDD → HLDD → DDD → IP). It adds no design content:
it orders the work, assigns milestones, effort, and executors, and
attaches acceptance checks — citing a
[DDD](ddd.md) anchor for every technical fact.

<!-- toc -->

- [Introduction](#introduction)
  * [Execution contract](#execution-contract)
  * [Scheduling model](#scheduling-model)
  * [Task format](#task-format)
  * [How this document fills in](#how-this-document-fills-in)
- [1. Milestones](#1-milestones)
- [2. Task graph](#2-task-graph)
  * [M0 — Toolchain and scaffolding](#m0--toolchain-and-scaffolding)
  * [M1 — Pipeline data lane](#m1--pipeline-data-lane)
  * [M2 — CI integration](#m2--ci-integration)
  * [M3 — Application core](#m3--application-core)
  * [M4 — Product surface](#m4--product-surface)
  * [M5 — Site integration](#m5--site-integration)
  * [M6 — Release](#m6--release)
- [3. Gates and release sequence](#3-gates-and-release-sequence)
- [4. Owner and research-group actions](#4-owner-and-research-group-actions)
- [5. Parked capabilities (P2/P3)](#5-parked-capabilities-p2p3)
- [6. Blocked-by index](#6-blocked-by-index)
- [7. Traceability](#7-traceability)
- [8. Relationship to the DDD](#8-relationship-to-the-ddd)

<!-- tocstop -->

## Introduction

### Execution contract

This plan is the coding agent's execution brief
([HLDD §12 — Scope of the following
documents](hldd.md#12-scope-of-the-following-documents)). The
executing agent is assumed competent but literal: it follows a task
exactly, verifies with the named commands, and is never asked to
infer an unstated intention. Accordingly, every task in this plan
must satisfy four rules:

1. **One interpretation.** A task is written so that two readers
   cannot implement it differently. Where a source left a choice, the
   task cites the decision that closed it (a DDD register row, a PDD
   decision, an ADR); a task never asks the executing agent to
   choose.
2. **Self-contained inputs.** Every technical fact in a task is a
   link to a DDD or source anchor, and the task lists the exact files
   and paths it touches. The agent needs the task and its cited
   anchors, nothing else.
3. **Machine-checked completion.** Every implementation task ends
   with a **Done when** block: named commands with expected results;
   a subjective completion criterion in an implementation task is a
   defect in this plan. Approval acts are different in kind: an
   owner or research-group approval produces an identified, dated
   record, and automation checks that the record exists and names the
   current content or release — machine-checkable evidence of the
   approval, never machine verification of the judgment itself.
4. **Escalate, never decide.** If a task meets an unresolved product,
   scientific, architectural, or design question, the agent stops and
   reports it; the question is resolved in the owning document before
   dependent work proceeds
   ([HLDD §12 — Scope of the following
   documents](hldd.md#12-scope-of-the-following-documents)).

### Scheduling model

One model is authoritative: **the Depends-on columns plus the gate
prerequisites of [§3](#3-gates-and-release-sequence) determine when a
task may run.** Milestones group deliverables and summarize
completion; they are not barriers, and nothing is sequenced by
milestone membership alone. A task is executable when its body is
accepted, every task in its Depends-on is complete, and every gate
named for it in §3 is met. The release task T-65's dependency closure
reaches every task the release requires, with one deliberate
exception: T-48 joins it only through the D-6 decision of
[§3](#3-gates-and-release-sequence). Diagnostics (T-17, T-31's timing
spot check, T-37) inform the work but gate nothing.

A Depends-on edge means the consumer cannot be **completed and
accepted** before the producer. Beginning work against an accepted
interface earlier is allowed when the task body says so and names the
later integration check that closes the gap.

### Task format

Each task carries: an ID (`T-nn`; IDs do not encode milestones); a
title; **Depends on** (task IDs only — gate prerequisites live in
[§3](#3-gates-and-release-sequence)); **Inputs** (the DDD and source
anchors that fix its content — only those the task consumes);
**Effort** (agent implementation effort only: S under half a day, M
up to two days, L up to a week; an L task is decomposed into
execution units when its body is drafted; owner and research-group
executions are not effort-rated and carry "—"); **Executor** (agent,
owner, or research group — the agent implements tooling, code, and
scripts; the owner runs operational steps such as full-data checks,
publications, and release-time executions, per
[HLDD §9 — Testing and release
architecture](hldd.md#9-testing-and-release-architecture); the agent
never performs an owner or research-group act); and **Status**:

- **Draftable** — every input is an accepted document or section, so
  the task body can be written now. Draftable is not executable:
  execution additionally requires the accepted body, completed
  dependencies, and met gates.
- **Blocked** — names the DDD sections or decisions the body waits
  for. A Blocked row still fixes the task's shape, inputs, and gate.

### How this document fills in

The graph below is complete for the MVP (P1, release v0.3 per
[D-1](pdd.md#1-decision-register)); what it does not yet contain is
most task bodies. As each DDD section is drafted and accepted, the
tasks it unblocks ([§6](#6-blocked-by-index)) get their bodies —
steps and Done-when commands — written to the execution contract,
adversarially verified, and accepted by the owner. A milestone closes
when every task grouped under it is complete and its gates are met.

## 1. Milestones

The Closes-when column summarizes the state the task graph produces;
the graph and gates are the authority
([Scheduling model](#scheduling-model)).

| Milestone | Delivers | Closes when |
|---|---|---|
| M0 — Toolchain and scaffolding | The webapp subproject builds and type-checks; an unlinked scenario page exists with its no-JS fallback. | Build and check tasks pass locally; CI coverage lands with M2. |
| M1 — Pipeline data lane | Export tooling, validation, references, and the first owner-published vintage. | T-18: the owner's first end-to-end publication (export, full-data checks, publish, pointer commit) with [G-1](#3-gates-and-release-sequence) confirmed first. GS-3 joins the reference set when [D-6](pdd.md#1-decision-register) is decided. |
| M2 — CI integration | CI builds the bundle, fetches and verifies the pinned vintage, and runs the webapp job scaffold; a failed build cannot replace the site. | All workflows green on pull requests exercising the PR trigger paths, and the first post-merge run green. The job's parity and unit steps land with T-23. |
| M3 — Application core | Decoder, query engine, statistics, conversion, and state pass the Node parity harness, wired into CI. | The CI-wired parity harness (T-23) is green for the generated golden-scenario set at the DD-2 tolerances (GS-3 joins after D-6). |
| M4 — Product surface | Controls, panels, charts, notices, failure states, downloads, field overlay, and accessibility per the PDD. | Application tests green; rendered notice, failure, and interaction behavior is verified by the browser lane (T-60). |
| M5 — Site integration | Version stamps and assembled-site validation (the page is not yet in public navigation). | Strict build green on the assembled site; regression checks pass. |
| M6 — Release | Browser lane, measurements, acceptance walkthroughs, rollback rehearsal, public activation, and the v0.3 release. | The release checklist of [DDD §7.7](ddd.md#77-site-validation-and-release-checklist) is satisfied and the owner records approval. |

## 2. Task graph

### M0 — Toolchain and scaffolding

| ID | Task | Depends on | Inputs | Effort | Executor | Status |
|---|---|---|---|---|---|---|
| T-01 | Create the Gradle webapp subproject: directory layout, module files, Node.js version pinned in the Gradle build configuration. | — | [DDD §2](ddd.md#2-repository-structure-naming-and-toolchain); [ADR-0011](../adr/0011-webapp-toolchain.md). | M | agent | Blocked — DDD §2, DD-10 |
| T-02 | Build tasks: esbuild bundle and stylesheet to a gitignored output path; `tsc --noEmit` as a separate Gradle check; pinned dependencies. | T-01 | [DDD §2](ddd.md#2-repository-structure-naming-and-toolchain); [ADR-0011](../adr/0011-webapp-toolchain.md). | M | agent | Blocked — DDD §2 |
| T-03 | Scenario page scaffold in MkDocs: mount point, masthead, no-JS fallback body — **without** the public navigation entry, which lands with T-55 at release ([DDD §6.1](ddd.md#61-build-outputs-asset-paths-and-page-scaffold) covers navigation "for each surface as it ships"). | T-01 | [DDD §6.1](ddd.md#61-build-outputs-asset-paths-and-page-scaffold); [PDD §5 — Copy deck](pdd.md#5-copy-deck). | S | agent | Blocked — DDD §6.1 |

### M1 — Pipeline data lane

| ID | Task | Depends on | Inputs | Effort | Executor | Status |
|---|---|---|---|---|---|---|
| T-10 | DuckDB views for the four research-data exports, in `views.py` beside the dashboard views. | — | [DDD §3.1](ddd.md#31-scenario-artifact-binary-layout), [§3.4](ddd.md#34-field-data-export)–[§3.6](ddd.md#36-reference-results); [ADR-0012](../adr/0012-product-data-exports.md). | L | agent | Blocked — DDD §3.1, §3.4, §3.5, §3.6 |
| T-11 | Export task: binary packing per the selected encoding, artifact manifest and pointer manifest written in the same run. | T-10 | [DDD §3.1](ddd.md#31-scenario-artifact-binary-layout)–[§3.3](ddd.md#33-pointer-manifest), [§4.1](ddd.md#41-export-task-and-validation); [DD-1](ddd.md#1-ddd-decision-register). | L | agent | Blocked — DDD §3.1–§3.3, §4.1, DD-1 |
| T-12 | Export validation: lossless round-trip, sentinel collision, within-trial ascending-slip order, re-read comparison against the views, manifest consistency. | T-11 | [DDD §4.1](ddd.md#41-export-task-and-validation). | M | agent | Blocked — DDD §4.1 |
| T-13 | Reference-results generator: golden-scenario counts, statistics, selections with classes, converted windows and range flags, GS-4 diagnosed-condition set. GS-3 joins when [D-6](pdd.md#1-decision-register) is decided ([PDD §10.2 — Golden scenarios](pdd.md#102-golden-scenarios)). | T-10 | [DDD §3.6](ddd.md#36-reference-results); [PDD §10.2 — Golden scenarios](pdd.md#102-golden-scenarios). | L | agent | Blocked — DDD §3.6 |
| T-14 | Required full-data checks, local-only, where a skipped check is not a pass. | T-12, T-13 | [DDD §7.3](ddd.md#73-pipeline-and-export-tests). | M | agent | Blocked — DDD §7.3 |
| T-15 | Publication tooling: data tag, prerelease, upload, verify-before-commit, pointer commit — one task, one run, one commit per vintage ([ADR-0014](../adr/0014-committed-content-hashed-artifacts.md)). Tooling only; executions are T-18 and T-63. | T-11, T-12 | [DDD §4.2](ddd.md#42-publication-of-a-data-vintage). | M | agent | Blocked — DDD §4.2, DD-7 |
| T-16 | Pipeline fixture tests for the export lane, CI-sized. | T-11, T-12 | [DDD §7.3](ddd.md#73-pipeline-and-export-tests). | M | agent | Blocked — DDD §7.3 |
| T-17 | Early payload diagnostic: the generated artifact's compressed size asserted against the budget of [PDD §9.1 — Performance budgets (D-9, Proposed)](pdd.md#91-performance-budgets-d-9-proposed) as soon as T-11 produces it ([R-19](prd.md#94-delivery-and-technical-risks) asks for early validation against the budget; [R-16](prd.md#94-delivery-and-technical-risks) is the payload-budget risk it tests early). A diagnostic lower bound — the full payload scope is T-61's; the figure is recorded in [DDD §3.8](ddd.md#38-measured-sizes). | T-11 | [PDD §9.1 — Performance budgets (D-9, Proposed)](pdd.md#91-performance-budgets-d-9-proposed). | S | agent | Draftable |
| T-18 | First verified publication: the owner runs export, full-data checks (T-14), and the publication tooling (T-15) end-to-end, producing the first pinned vintage — gated by [G-1](#3-gates-and-release-sequence) ([OA-1](#4-owner-and-research-group-actions)). | T-13, T-14, T-15 | [DDD §4.2](ddd.md#42-publication-of-a-data-vintage); [HLDD §9 — Testing and release architecture](hldd.md#9-testing-and-release-architecture). | — | owner | Blocked — DDD §4.2, G-1 |

### M2 — CI integration

| ID | Task | Depends on | Inputs | Effort | Executor | Status |
|---|---|---|---|---|---|---|
| T-20 | `tests.yml`: webapp job scaffold — the type-check step and path filters including the pointer manifest. Unit and parity steps join in T-23. | T-02 | [DDD §6.3](ddd.md#63-ci-workflows); [ADR-0011](../adr/0011-webapp-toolchain.md). | S | agent | Blocked — DDD §6.3 |
| T-21 | `.github/workflows/mkdocs.yml`: webapp build job separate from the MkDocs job; fetch-and-verify of the vintage T-18 published; assets placed beside the scenario page; widened path filters. | T-02, T-18 | [DDD §6.3](ddd.md#63-ci-workflows), [§6.1](ddd.md#61-build-outputs-asset-paths-and-page-scaffold); [ADR-0014](../adr/0014-committed-content-hashed-artifacts.md). | M | agent | Blocked — DDD §6.3, §6.1 |
| T-22 | The same `mkdocs.yml` workflow's deploy gating: Node setup and build before deploy; a failed application build or data retrieval fails the site build and must not replace the working published site. | T-21 | [DDD §6.3](ddd.md#63-ci-workflows); [HLDD §8 — Site integration](hldd.md#8-site-integration). | S | agent | Blocked — DDD §6.3 |

### M3 — Application core

| ID | Task | Depends on | Inputs | Effort | Executor | Status |
|---|---|---|---|---|---|---|
| T-30 | Loader and decoder: fetch under the transport contract, structural and schema-version validation, typed-array views, data-version check. | T-02, T-11 | [DDD §5.1](ddd.md#51-modules-and-interfaces), [§5.2](ddd.md#52-artifact-loading-and-decoding), [§3.1](ddd.md#31-scenario-artifact-binary-layout), [§3.2](ddd.md#32-artifact-manifest). | L | agent | Blocked — DDD §3.1, §3.2, §5.1, §5.2 |
| T-31 | Query engine: trial mask, stride-101 scan, one-state-per-trial rule (both branches), two-count model, unclassified semantics, empty-result diagnostic; pure synchronous core with its scheduling wrapper. Completion records a decode-and-scan timing spot check against the interaction budget ([PDD §9.1 — Performance budgets (D-9, Proposed)](pdd.md#91-performance-budgets-d-9-proposed)) — a diagnostic, not acceptance evidence. | T-30 | [DDD §5.3](ddd.md#53-query-engine). | L | agent | Blocked — DDD §5.3 |
| T-32 | Statistics module: the FR-O2 set with the pipeline's percentile definition; hygiene passed through, never re-applied. | T-31 | [DDD §5.4](ddd.md#54-statistics). | M | agent | Blocked — DDD §5.4 |
| T-33 | Conversion assist: back-projection per dip, converted windows, union, range flags. | T-30 | [DDD §5.5](ddd.md#55-offset-to-slip-conversion-assist), [§3.5](ddd.md#35-regression-export). | M | agent | Blocked — DDD §5.5, §3.5 |
| T-34 | Scenario state model (MVP state; the P2 URL codec stays parked). | T-30 | [DDD §5.6](ddd.md#56-scenario-state-and-url-encoding). | M | agent | Blocked — DDD §5.6 |
| T-35 | Node parity harness: fetch and checksum-verify the vintage T-18 published, replay the golden scenarios, exact and tolerance comparisons per the parity rules (GS-3 after [D-6](pdd.md#1-decision-register)). | T-30–T-34, T-13, T-18 | [DDD §7.2](ddd.md#72-calculation-parity-tests), [§7.1](ddd.md#71-numerical-tolerances). | M | agent | Blocked — DDD §7.1, §7.2, DD-2 |
| T-36 | Application unit tests: fixtures for malformed files, schema versions, data-version mismatch, structural validation, state handling (URL-parameter fixtures join with the P2 codec). Node-level application contracts only; rendered behavior belongs to the browser lane. | T-30, T-34 | [DDD §7.4](ddd.md#74-application-tests). | M | agent | Blocked — DDD §7.4 |
| T-23 | Wire the unit tests and parity harness into the `tests.yml` webapp job (the T-20 scaffold). | T-20, T-35, T-36 | [DDD §6.3](ddd.md#63-ci-workflows). | S | agent | Blocked — DDD §6.3 |
| T-37 | Early feasibility diagnostic: one representative scenario end-to-end through decode, selection, and statistics, timed against the interaction budget as soon as T-30–T-32 exist. A diagnostic, not acceptance evidence ([R-19](prd.md#94-delivery-and-technical-risks)); acceptance is T-61 on the assembled application. | T-30, T-31, T-32 | [DDD §7.6](ddd.md#76-performance-and-compatibility-measurements); [PDD §9.1 — Performance budgets (D-9, Proposed)](pdd.md#91-performance-budgets-d-9-proposed). | S | agent | Blocked — DDD §7.6 |

### M4 — Product surface

| ID | Task | Depends on | Inputs | Effort | Executor | Status |
|---|---|---|---|---|---|---|
| T-40 | Scenario controls: enumerations from the manifest, defaults, entry assists (including offset mode via T-33), disabled Advanced group, reset, immediate update. | T-31, T-33, T-34, T-47 | [DDD §5.7](ddd.md#57-scenario-controls). | L | agent | Blocked — DDD §5.7 |
| T-41 | Measurement panels and charts: DD-4 arrangement, DD-5 histogram rule, empirical cumulative curve, overlay marks; configured floors and thresholds from T-47. | T-32, T-47 | [DDD §5.8](ddd.md#58-view-layer), [§5.12](ddd.md#512-charts). | L | agent | Blocked — DDD §5.8, §5.12, DD-4, DD-5 |
| T-42 | Statistics table with [D-23](pdd.md#1-decision-register) display rounding from configuration. | T-32, T-47 | [DDD §5.8](ddd.md#58-view-layer), [§5.13](ddd.md#513-application-configuration). | M | agent | Blocked — DDD §5.8, §5.13 |
| T-43 | Notices and caveats: the four result notices with precedence; coexisting caveats; copy-deck use sites; configured thresholds and copy references from T-47. | T-41, T-47 | [DDD §5.8](ddd.md#58-view-layer); [PDD §5 — Copy deck](pdd.md#5-copy-deck). | M | agent | Blocked — DDD §5.8 |
| T-44 | Failure states: the four categories, retained-results rule, fallback, version mismatch. | T-30, T-40 | [DDD §5.10](ddd.md#510-failure-states). | M | agent | Blocked — DDD §5.10 |
| T-45 | Downloads: package contents, provenance order, DD-6 file naming, no-mix invariant. | T-32, T-34, T-47 | [DDD §5.9](ddd.md#59-downloads). | M | agent | Blocked — DDD §5.9, DD-6 |
| T-46 | Accessibility and navigation lifecycle: announcements and focus for the five states, DD-9 chart alternatives, 360 px floor, repeated-navigation cleanup — integrated across the surfaces of T-40–T-45 and T-49. | T-40–T-45, T-49 | [DDD §5.11](ddd.md#511-accessibility-supported-environments-and-navigation-lifecycle). | L | agent | Blocked — DDD §5.11, DD-9 |
| T-47 | Application configuration: [D-11](pdd.md#1-decision-register) thresholds, [D-4](pdd.md#1-decision-register) trigger, D-23 precision table, copy references; the config-equals-PDD test. | T-02 | [DDD §5.13](ddd.md#513-application-configuration). | S | agent | Blocked — DDD §5.13 |
| T-49 | Field overlay: load and validate the field export; source-specific analogue mapping; overlay controls and default selections; the width criterion and full-range toggle; source labels and unavailable-scarp-dip behavior; field measurements never enter simulation statistics. | T-30, T-41 | [DDD §5.8](ddd.md#58-view-layer), [§3.4](ddd.md#34-field-data-export); [PDD §4.4 — Field overlay (FR-O5, D-18 Proposed)](pdd.md#44-field-overlay-fr-o5-d-18-proposed). | L | agent | Blocked — DDD §5.8, §3.4 |
| T-48 | Kern County worked-example preset (FR-O6, P1): preset entry, walkthrough steps, GS-3 reproduction — ships only after [D-6](pdd.md#1-decision-register). | T-40, T-41, T-49, T-13 | [DDD §5.8](ddd.md#58-view-layer); [PDD §4.7 — Kern County worked example (FR-O6, D-6 Open)](pdd.md#47-kern-county-worked-example-fr-o6-d-6-open). | M | agent | Blocked — DDD §5.8, D-6 (research group) |

### M5 — Site integration

| ID | Task | Depends on | Inputs | Effort | Executor | Status |
|---|---|---|---|---|---|---|
| T-50 | Version stamps: software and data versions sourced, passed to the page, displayed; runtime check wired to the failure path. | T-03, T-30 | [DDD §6.2](ddd.md#62-software-and-data-version-stamps). | S | agent | Blocked — DDD §6.2 |
| T-51 | Site validation additions: assembled-site coverage (generated assets and retrieved data), regression checks on existing surfaces. | T-21 | [DDD §7.7](ddd.md#77-site-validation-and-release-checklist). | M | agent | Blocked — DDD §7.7 |
| T-52 | Glossary additions before launch: PFDHA; engineer of record; FDHI spelling aligned. The PDD states an alternative for the second item (glossary entry or in-context gloss); the task body fixes one, and the owner's acceptance of the body closes that choice — the executing agent does not choose. | — | [PDD §5.11 — Labels, units, and glossary links (FR-G3, CR-3, CR-7)](pdd.md#511-labels-units-and-glossary-links-fr-g3-cr-3-cr-7). | S | agent | Draftable |

### M6 — Release

| ID | Task | Depends on | Inputs | Effort | Executor | Status |
|---|---|---|---|---|---|---|
| T-60 | Browser test lane: the DD-3 tool, the full inventory, local invocation documented — run against the locally built, assembled site (stamps and validation in place). The agent builds and runs it in development; the owner runs it at release. T-48's preset checks join the inventory when it ships. | T-21, T-40–T-46, T-49, T-50 | [DDD §7.5](ddd.md#75-browser-test-lane). | L | agent | Blocked — DDD §7.5, DD-3 |
| T-61 | Measurement suite (acceptance): benchmark procedure on the assembled application — payload and timing scopes in full, bundle size, cache and decompression behavior, browser-compatibility verification; results recorded in [DDD §3.8](ddd.md#38-measured-sizes) and cited by G-2. | T-30–T-32, T-41, T-50 | [DDD §7.6](ddd.md#76-performance-and-compatibility-measurements). | M | agent | Blocked — DDD §7.6 |
| T-62 | Acceptance walkthrough scripts: US-1–US-3 as scripted demos against the golden scenarios, pass conditions from the stories and SC rows. The agent writes the scripts; human reviewers execute them at release — a human acceptance session, distinct from the automated lane (T-60). | T-60 | [PDD §10.3 — Acceptance walkthroughs](pdd.md#103-acceptance-walkthroughs); [DDD §7.7](ddd.md#77-site-validation-and-release-checklist). | M | agent | Blocked — DDD §7.7 |
| T-63 | Release vintage: the owner publishes the vintage the release ships, or — if the T-18 vintage is unchanged — verifies its recorded publication evidence instead of regenerating. | T-18 | [DDD §4.2](ddd.md#42-publication-of-a-data-vintage); [HLDD §9 — Testing and release architecture](hldd.md#9-testing-and-release-architecture). | — | owner | Blocked — DDD §4.2 |
| T-64 | Rollback rehearsal: a pointer-manifest revert exercised on the published vintage, checksum-verified, with the normal validation and deployment checks applied — before public activation (T-55), so it has no public effect; the agent tools it, the owner runs and authorizes it. | T-22, T-63 | [DDD §4.3](ddd.md#43-retention-rollback-recovery-and-withdrawal); [HLDD §9 — Testing and release architecture](hldd.md#9-testing-and-release-architecture). | S | owner | Blocked — DDD §4.3 |
| T-55 | Public activation: add the [D-2](pdd.md#1-decision-register) navigation entry ([PDD §2.2 — Entry point (D-2, Decided 2026-10-28)](pdd.md#22-entry-point-d-2-decided-2026-10-28)) once the §3 gates for public content (G-2–G-5) are recorded; until then every deploy carries the page unlinked. | T-51, T-60, T-62 | [DDD §6.1](ddd.md#61-build-outputs-asset-paths-and-page-scaffold). | S | agent | Blocked — DDD §6.1 |
| T-65 | v0.3 release: first GitHub release — code, plotting CSVs, `CITATION.cff`, and the current app exports attached per DD-8; the release record completed, including the check that the release tag's `git archive` contains zero `fig-*` entries ([`notes/Roadmap.md` — Decisions made](../../notes/Roadmap.md#decisions-made), Paper figures). | T-16, T-17, T-23, T-37, T-52, T-55, T-60–T-64 | [DDD §4.4](ddd.md#44-licensing-archival-distribution-and-release-attachments), [§7.7](ddd.md#77-site-validation-and-release-checklist); [`notes/Roadmap.md` — Decisions made](../../notes/Roadmap.md#decisions-made). | — | owner | Blocked — DDD §4.4, §7.7, DD-8, G-1–G-6 |

## 3. Gates and release sequence

The gates are the PDD's success criteria and the HLDD's required
checks — nothing new. Each is scheduled here and assigned an
executor; the IP schedules the checks, it does not define them.

| Gate | Content | Verified by | Assigned to |
|---|---|---|---|
| G-1 | Source terms confirmed before the first vintage upload — assets on a public repository are public, so this precedes T-18. | A recorded confirmation ([OA-1](#4-owner-and-research-group-actions)); its enforcement point is DDD §4.2/§4.4 material. | Owner with the research group. |
| G-2 | [SC-1](pdd.md#101-success-criteria)–SC-4: core workflow, download reproducibility, correctness parity, performance budgets. | Parity harness (T-35/T-23), browser lane (T-60), measurement suite (T-61), walkthroughs (T-62). | Agent implements and runs in development; at release the owner and human reviewers run them (SC-1 needs a product-naive engineer) and the owner accepts. |
| G-3 | [SC-5](pdd.md#101-success-criteria) candor and [SC-6](pdd.md#101-success-criteria) site integrity. | Browser lane (T-60) and site validation (T-51). | Agent implements; the owner runs at release and accepts. |
| G-4 | [SC-7](pdd.md#101-success-criteria) scientific sign-off: the research group has approved the reader-facing texts — before those texts are publicly activated (T-55). | A recorded approval ([OA-4](#4-owner-and-research-group-actions)) the release checklist checks against the activated content. | Research group; owner records. |
| G-5 | [D-10](pdd.md#1-decision-register) liability text authored or sourced — no placeholder is ever publicly activated (T-55) or released. | The release checklist's D-10 check ([OA-3](#4-owner-and-research-group-actions)). | Product owner. |
| G-6 | [R-12](prd.md#93-content-and-media-dependencies): no third-party photograph in any public deploy, site tree, or release archive without documented permission — live from the first deploy, not only when a media surface ships (the zero-`fig-*` archive check in T-65 is its release-time form). | The media-permission release check and the T-65 archive check ([OA-8](#4-owner-and-research-group-actions)). | Research group supplies records; build enforces. |

The data-refresh and release sequence instantiates
[HLDD §9 — Testing and release
architecture](hldd.md#9-testing-and-release-architecture) (Data
refresh and deployment) step by step, with its step 7 release checks
mapped to G-2–G-4 (G-4 as the recorded-approval check), executed
through T-60–T-62 by the owner and human reviewers. A software-only
release uses the currently pinned vintage, verifies its recorded
publication evidence, and regenerates nothing; the full-data checks
are required only when a new vintage is published. Until T-55, every
deploy carries the scenario page unlinked from navigation, so
intermediate merges publish no unfinished product surface. If
[D-6](pdd.md#1-decision-register) is still open as the release nears,
the sources conflict — the preset ships only after D-6
([PDD §4.7 — Kern County worked example (FR-O6, D-6
Open)](pdd.md#47-kern-county-worked-example-fr-o6-d-6-open)), yet
FR-O6 is a P1 requirement — and the owner decides whether v0.3 waits
for D-6 or the P1 scope is formally amended (a PRD/PDD change this
plan cannot make); T-48 and GS-3 join when D-6 is decided
([PDD §10.2 — Golden scenarios](pdd.md#102-golden-scenarios)). The
release record identifies the software revision, the pointer-manifest
revision and data vintage, the test-suite and lane versions with
their results, and the approval references
([DDD §7.7](ddd.md#77-site-validation-and-release-checklist)).

## 4. Owner and research-group actions

Acts the agent never performs; each produces an identified, dated
record the tasks and gates verify. Stable IDs so tasks and gates can
cite them:

- **OA-1** — confirm source terms for redistribution (G-1), before
  T-18, the first vintage upload.
- **OA-2** — decide [D-6](pdd.md#1-decision-register) — Kern County
  field-data group and principal-width rule (research group) — which
  unblocks T-48 and GS-3; if still open as the release nears, the
  ship-or-wait question escalates to the owner
  ([§3](#3-gates-and-release-sequence)).
- **OA-3** — author or source the [D-10](pdd.md#1-decision-register)
  liability-limitation text (G-5), before public activation (T-55).
- **OA-4** — approve the reader-facing texts (G-4,
  [SC-7](pdd.md#101-success-criteria)), before public activation
  (T-55).
- **OA-5** — run the release-time checks of HLDD §9 step 7 — browser
  lane, measurements, and the walkthroughs with human reviewers,
  including a product-naive engineer for SC-1 (G-2, G-3).
- **OA-6** — enable the Zenodo GitHub app (needs HarvardRC org-admin)
  and decide the dataset-record deposit with the first release
  ([`notes/Roadmap.md` — Decisions made](../../notes/Roadmap.md#decisions-made)).
- **OA-7** — decide the first release's contents and version before
  cutting it (tags v0.2.0–v0.2.2 exist; no GitHub release yet).
- **OA-8** — supply photograph permission records (G-6) for any
  third-party media before it enters a deploy or archive.
- **OA-9** — run the operational executions assigned to the owner in
  [§2](#2-task-graph): T-18, T-63, T-64, T-65, and the refresh
  sequence.

## 5. Parked capabilities (P2/P3)

Parked per the PDD's surface priorities: P2 and P3 must not delay the
MVP ([PRD §2.2 — MVP and delivery
priorities](prd.md#22-mvp-and-delivery-priorities)). This plan
schedules no parked work before v0.3; starting any of it earlier in
parallel is the owner's scheduling choice, not a requirement of the
sources. Each line names what unparks it.

- Media index and export — P2
  ([ADR-0012](../adr/0012-product-data-exports.md)); unparked by the
  P2 lane opening.
- Morphology page, animation library, measurement page, animation
  offers — P2; need the media index and, for coverage,
  [D-8](pdd.md#1-decision-register).
- Shared links (URL codec) and the
  [D-15](pdd.md#1-decision-register) version notice — P2.
- Inverse mode — P2; its categorical-chart question routes through
  the ADR process first ([DDD §5.12](ddd.md#512-charts)).
- Chart export ([D-14](pdd.md#1-decision-register)) — P2.
- Contact page — P3; repository links wait for
  [R-15](prd.md#93-content-and-media-dependencies).
- 3D lane — on hold per the Roadmap's 2026-10-12 decision; Cases 1–3
  are supplied but held pending the owners' decision, Case 4 is not
  supplied; no ingestion before they decide
  ([`notes/Roadmap.md` — Decisions made](../../notes/Roadmap.md#decisions-made)).

## 6. Blocked-by index

What each pending DDD section unblocks, so DDD drafting order follows
implementation value. Tasks blocked on decisions, gates, or other
tasks are tracked in their rows, not here. This index is derived from
the Status columns and is regenerated from them whenever they change;
it is not an independent scheduling authority.

| DDD section | Unblocks |
|---|---|
| §2 (with DD-10) | T-01, T-02 — all of M0's build lane. |
| §3.1–§3.3 (with DD-1) | T-10, T-11, T-30 — the data lane and decoder. |
| §3.4–§3.6 | T-10, T-13, T-33, T-49. |
| §4.1–§4.2 (with DD-7) | T-11, T-12, T-15, T-18, T-63. |
| §4.3–§4.4 (with DD-8) | T-64, T-65. |
| §5.1–§5.6 | T-30–T-34. |
| §5.7–§5.13 (with DD-4, DD-5, DD-6, DD-9) | T-40–T-49. |
| §6.1–§6.3 | T-03, T-20–T-23, T-50, T-55. |
| §7.1–§7.4 (with DD-2) | T-14, T-16, T-35, T-36. |
| §7.5–§7.7 (with DD-3) | T-37, T-51, T-60–T-62, T-65. |

## 7. Traceability

Every obligation the approved documents place on the implementation
plan — thirty were extracted in the obligation sweep of 2026-10-29,
regenerated on demand against named source revisions, with the sweep
procedure and report stored beside the matrix — maps to a milestone,
task, gate, OA row, or parked line above, with its satisfaction
evidence named by a stable identifier. The matrix lands here when the
task bodies are drafted; a row may also resolve to "owner action
([§4](#4-owner-and-research-group-actions))" or "not an IP
obligation (stays with its source)".

## 8. Relationship to the DDD

Every technical fact in this plan is a citation into the
[DDD](ddd.md) or an already-accepted source; this plan never adds
design content, never closes a DDD register row, and never resolves a
conflict between documents — it schedules the work those documents
define ([DDD §10 — Relationship to the implementation
plan](ddd.md#10-relationship-to-the-implementation-plan)). When a
task body cannot be written unambiguously from its cited anchors, the
gap is a DDD defect to fix there, not a blank for the executing agent
to fill.
