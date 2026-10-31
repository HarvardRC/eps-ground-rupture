# Ground Rupture Explorer — implementation plan

**Status:** first full draft, corrected after external review and
again after the adversarial review of the document pair (both
2026-10-30). The task graph, gates, and every task body are drafted
to the execution contract against the corrected [DDD](ddd.md). No
task has been executed and none of the Done-when commands has run; of
the owner actions, only OA-11, enabling GitHub release immutability,
is recorded as done ([§4](#4-owner-and-research-group-actions)). The
reviews' findings and their dispositions accompany this draft in the
report to the owner. Status cells reflect the drafted inputs, and the
owner's acceptance of the document pair finalizes them.

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
  * [7.1 From the HLDD](#71-from-the-hldd)
  * [7.2 From the PDD](#72-from-the-pdd)
  * [7.3 From the PRD and notes/Roadmap.md](#73-from-the-prd-and-notesroadmapmd)
  * [7.4 From the ADRs](#74-from-the-adrs)
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
   defect in this plan. An agent task's commands run without AWS
   credentials, and a command that runs `node` or `npx` outside a
   Gradle task runs in the one form of
   [DDD §2](ddd.md#2-repository-structure-naming-and-toolchain)
   (Node.js outside Gradle), never on the machine's own `node`.
   Approval acts are different in kind: an owner or research-group
   approval produces an identified, dated record, and automation
   checks that the record exists and names the current content or
   release — machine-checkable evidence of the approval, never
   machine verification of the judgment itself.
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
milestone membership alone. The tasks also fall into the two phases
of
[ADR-0017 — An unadvertised prototype deployment precedes the public release](../adr/0017-unadvertised-prototype-before-public-release.md)
(Proposed) that [§1](#1-milestones) lists: **Phase 1 — Prototype
(unlisted)**, which ends when T-54 deploys the scenario page unlisted
for the research group's review — a merge into `main`, not a
release — and **Phase 2 — Review and public release**, which ends
with T-65. Phases sequence nothing either, and no Phase-1 task
depends on a Phase-2 owner action. A task is executable when its body is
accepted, every task in its Depends-on is complete, every owner
action there has its record
([§4](#4-owner-and-research-group-actions)), and every gate named for
it in §3 is met. The release task T-65's dependency closure
reaches every task the release requires, with one deliberate
exception: T-48 joins it only through the
[D-6](pdd.md#1-decision-register) (Kern County field-data group and
principal-width rule) decision of [§3](#3-gates-and-release-sequence).
Diagnostics (T-17, T-31's timing spot check, T-37) inform the work
but gate nothing.

A Depends-on edge means the consumer cannot be **completed and
accepted** before the producer. Beginning work against an accepted
interface earlier is allowed when the task body says so and names the
later integration check that closes the gap.

### Task format

Each task carries: an ID (`T-nn`; IDs do not encode milestones); a
title; **Depends on** (the IDs of the tasks, and of the owner actions
of [§4](#4-owner-and-research-group-actions), whose completion or
record the task's own completion needs — gate prerequisites live in
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
  the task body can be written now; during the full-draft campaign a
  drafted DDD section that has completed its review round counts,
  and the owner's acceptance of the document pair finalizes it.
  Draftable is not executable: execution additionally requires the
  accepted body, completed dependencies, recorded owner actions, and
  met gates.
- **Blocked** — names the DDD sections or decisions the body waits
  for. A Blocked row still fixes the task's shape, inputs, and gate.

### How this document fills in

The graph below is complete for the MVP (P1, release v0.3 per
[D-1](pdd.md#1-decision-register)), and every task body is drafted:
steps and Done-when commands written to the execution contract
against the DDD sections as corrected after the external review and
the adversarial review of 2026-10-30, with the owner's acceptance of
the document pair finalizing them (the Status columns and
[§6](#6-blocked-by-index) track the inputs each body waited on). Two
tasks joined the graph in the first correction: T-04, the
traceability lint, and T-59, the reference measurement environment.
The second added four owner actions that tasks wait on
([§4](#4-owner-and-research-group-actions)): OA-12, the acceptance of
[ADR-0016 — Performance reference environment — an on-demand AWS VM defined by Terraform](../adr/0016-performance-reference-environment.md),
Proposed, before T-59; OA-13, the licensing texts, now the final
texts of Phase 2, before T-63; OA-14, the membership of
[D-18](pdd.md#1-decision-register) (Field-overlay default set and
per-source analogue map), before T-55, the public activation; and
OA-15, the private scratch repository of the T-15 drills. The final
review added OA-16, the `ami_id` default of the reference
environment, before T-59 completes. The split into the two phases of
[ADR-0017 — An unadvertised prototype deployment precedes the public release](../adr/0017-unadvertised-prototype-before-public-release.md)
added T-54, the prototype deployment, and OA-17, the owner's
acceptance of ADR-0017, before T-18 and T-54; it moved the T-15
drills onto a stub `gh`, which retired OA-15, and made T-18 the
end-to-end publication run. Where a body meets a
fact the corrected DDD does not yet state, it says **Escalate** and
names the gap, which is resolved in the DDD before the body is
accepted. A milestone closes when every task grouped under it is
complete and its gates are met.

## 1. Milestones

The tasks fall into the two phases of
[ADR-0017 — An unadvertised prototype deployment precedes the public release](../adr/0017-unadvertised-prototype-before-public-release.md)
(Proposed). **Phase 1 — Prototype (unlisted)** builds the
application and deploys it, with its first data vintage, as the
unlisted prototype of
[DDD §6.1](ddd.md#61-build-outputs-asset-paths-and-page-scaffold) —
no nav entry, no link from another page, out of `sitemap.xml` and
the search index, the prototype notice shown — for the research
group's review: T-01–T-03, T-10–T-18, T-20–T-23, T-30–T-37,
T-40–T-47, T-49–T-51, and T-60, closed by T-54, the prototype
deployment. **Phase 2 — Review and public release** records the
review's approvals and decisions, publishes the vintage the release
pins under the confirmed terms, activates the page, and cuts v0.3:
T-04, T-48, T-52, T-55, T-59, and T-61–T-65, closed by T-65. Phases,
like milestones, sequence nothing; no Phase-1 task depends on a
Phase-2 owner action ([§3](#3-gates-and-release-sequence),
Owner-action prerequisites). The Closes-when column summarizes the
state the task graph produces; the graph and gates are the authority
([Scheduling model](#scheduling-model)).

| Milestone | Phase | Delivers | Closes when |
|---|---|---|---|
| M0 — Toolchain and scaffolding | 1; T-04 in 2 | The webapp subproject builds and type-checks; the scenario page exists with its no-JS fallback as an unpublished draft, absent from the site tree, sitemap and search index and built only by the preview configuration; the site checks hook guards every build; the traceability lint runs in CI. | Build and check tasks exit 0 locally; both strict builds exit 0 with the hook's arms (a), (b), and (d); the **Check traceability** step runs in the `links` job (T-04, Phase 2); the webapp's CI coverage lands with M2. |
| M1 — Pipeline data lane | 1 | Export tooling, validation, references, full-data checks, publication tooling, and the first owner-published vintage. | T-18: the owner's first publication — one `publishVintage` run (export, full-data checks against the staged vintage, draft-first upload, read-back, publish) and the pointer commit, merged into `main` — with [G-1](#3-gates-and-release-sequence) (licensing terms recorded and release immutability enabled before the first vintage upload) recorded first, in its Phase-1 form: the assumed terms. [GS-3](pdd.md#102-golden-scenarios) (Kern preset (after D-6)) joins the reference set when [D-6](pdd.md#1-decision-register) (Kern County field-data group and principal-width rule) is decided. |
| M2 — CI integration | 1 | CI builds the bundle in `webapp-bundle`, fetches and verifies the pinned vintage, builds the publication and preview sites, and runs the `webapp-test` job scaffold; a failed build cannot replace the site. | All workflows green on a pull request — their pull-request triggers run unfiltered — and on the first post-merge run. The **Parity** steps land with T-23. |
| M3 — Application core | 1 | Decoder, query engine, statistics, conversion, and state, replayed against the generated references by the Node parity harness wired into CI. | The CI-wired parity harness (T-23) is green on the generated reference file — golden scenarios, boundary cases, and synthetic cases — at the [DD-2](ddd.md#1-ddd-decision-register) (Per-calculation numerical tolerances) tolerance (GS-3 joins after D-6). |
| M4 — Product surface | 1; T-48 in 2 | Controls, panels, charts, notices — the prototype notice among them — failure states, downloads, field overlay, and accessibility per the PDD. | Application tests (`webappTest`) green; rendered notice, failure, and interaction behavior is the browser lane's to check (T-60). |
| M5 — Site integration | 1; T-52 in 2 | Version stamps and assembled-site validation, with the site checks hook complete, and the prototype deployment (T-54), which deploys the page unlisted; until then it is a draft, built only by the preview configuration. | Both strict builds green on the assembled site, the site checks hook included, and T-54's checks of the unlisted state on the live site hold. |
| M6 — Release | 2; T-60 in 1 | Browser lane, the reference measurement environment and measurements, acceptance walkthroughs, rollback rehearsal, public activation, and the v0.3 release. | Every item of the release checklist of [DDD §7.7](ddd.md#77-site-validation-and-release-checklist) carries its evidence in the release record, whose evidence ledger is complete at the release revision, and the owner records approval. |

## 2. Task graph

### M0 — Toolchain and scaffolding

| ID | Task | Depends on | Inputs | Effort | Executor | Status |
|---|---|---|---|---|---|---|
| T-01 | Create the Gradle webapp subproject: the `.gitignore` entry for `node_modules/` before any npm command; the module in `settings.gradle.kts`; `build.gradle.kts` with the node-gradle plugin 7.1.0 and the Node.js 22.12.0 runtime pin, and `npmCi`; `package.json` with the six exact development pins, and its lockfile; both TypeScript configurations. | — | [DDD §2](ddd.md#2-repository-structure-naming-and-toolchain); [ADR-0011](../adr/0011-webapp-toolchain.md). | M | agent | Draftable |
| T-02 | Build and check tasks: `build.mjs` (the ESM bundle and stylesheet in the gitignored `build/dist/`; the compiled tests), the five npm scripts, the plugin tasks `tscCheck`, `webappTest`, `webappParity`, and `webappBundle`, and the runtime tripwire `test/toolchain.test.ts`. | T-01 | [DDD §2](ddd.md#2-repository-structure-naming-and-toolchain), [§6.1](ddd.md#61-build-outputs-asset-paths-and-page-scaffold), [§6.3](ddd.md#63-ci-workflows), [§7.4](ddd.md#74-application-tests); [ADR-0011](../adr/0011-webapp-toolchain.md). | M | agent | Draftable |
| T-03 | Scenario page scaffold in MkDocs — the front matter `search: exclude: true`, masthead, `#gre-root` with the copy-marked no-JS fallback body of DDD §5.10, `#gre-disclaimer` with PDD §5.1's bracketed D-10 slot verbatim — as an unpublished draft, the first of the three publication states of [DDD §6.1](ddd.md#61-build-outputs-asset-paths-and-page-scaffold): absent from the site tree, sitemap and search index, built only by the preview configuration; the site checks hook with arms (a), (b), and (d), publication boundary, its sitemap edit for unlisted pages, and the publication allowlist, so [G-6](#3-gates-and-release-sequence) (no third-party photograph in any public deploy, site tree, or release archive without documented permission) holds from the first deploy. The prototype deployment is T-54's, the activation T-55's. | T-01 | [DDD §6.1](ddd.md#61-build-outputs-asset-paths-and-page-scaffold), [§5.10](ddd.md#510-failure-states), [§5.13](ddd.md#513-application-configuration); [PDD §5.1 — Standing disclaimer (CR-4; D-10 Open)](pdd.md#51-standing-disclaimer-cr-4-d-10-open). | M | agent | Draftable |
| T-04 | Traceability lint: `.github/scripts/check_traceability.py` over the DDD §8 and IP §7 matrices, run as the **Check traceability** step of the `doc-links.yml` job `links`; its `--release` form is release-checklist item 16. | — | [DDD §8](ddd.md#8-traceability) and the *Verification* paragraph closing [§8.4](ddd.md#84-from-the-adrs-and-the-adr-process), [§4.1](ddd.md#41-export-task-and-validation), [§6.3](ddd.md#63-ci-workflows), [§7.3](ddd.md#73-pipeline-and-export-tests)–[§7.5](ddd.md#75-browser-test-lane) (the **Inventory.** paragraphs), [§7.7](ddd.md#77-site-validation-and-release-checklist). | L | agent | Draftable |

#### T-01 — Gradle webapp subproject

**Steps.** (1) Before any npm command runs, add the entry
`subprojects/webapp/node_modules/` to `.gitignore` — the one entry
[DDD §2](ddd.md#2-repository-structure-naming-and-toolchain) adds for
the module; the root `build/` and `.gradle/` rules already cover its
build output and the downloaded runtime. (2) Add
`include(":subprojects:webapp")` to `settings.gradle.kts`. (3) Create
the module's configuration files exactly per §2: `build.gradle.kts` with
the `plugins` block `base` plus
`id("com.github.node-gradle.node") version "7.1.0"`, the extension
`node { version.set("22.12.0"); download.set(true) }` with no
`npmVersion`, and the task `npmCi` of the §2 task table (`NpmTask`,
`npmCommand` `["ci"]`, inputs `package.json` and `package-lock.json`,
output `node_modules/`); `package.json` with `"private": true`, no
`"type"` field, no runtime `dependencies`, and exactly the six
development pins of §2 at exact versions — `typescript 5.5.4`,
`esbuild 0.24.0`, `@playwright/test 1.47.2`, `@types/node 22.10.2`,
`@axe-core/playwright 4.10.0`, and `caniuse-lite 1.0.30001687` — none
with `^` or `~` (the npm scripts are T-02's); and `tsconfig.json` and
`tsconfig.node.json` with exactly the options, `include`, and `exclude`
lists of §2's TypeScript configuration. Every other path of the §2 tree
is created by the task that fills it: `build.mjs`, `src/main.ts`,
`src/app.css`, and `test/toolchain.test.ts` by T-02; every other `src/`
and `test/` file by the task whose body names it — among them
`test/spot-timing.ts` (T-31), `test/parity.ts` (T-35),
`test/fixtures.ts` (T-36), `test/zipcheck.py` (T-45), and
`test/compat-inventory.ts` and `test/caniuse-lite.d.ts` (T-61);
`playwright.config.ts` and `playwright/` by T-60 and T-61, and the
module's `README.md` by T-60; `perf/` by T-59; and `data/pointer.json`
is written by the export (T-11) and committed at T-18. (4) Create
`package-lock.json` with one `npm install` under the
pinned runtime — the plugin's `npmInstall` task, never a machine-wide
npm; commit it (the owner commits).

**Done when:** `git check-ignore -q subprojects/webapp/node_modules/x`
exits 0 and `git ls-files subprojects/webapp | grep -c node_modules`
prints 0;
`grep -c 'id("com.github.node-gradle.node") version "7.1.0"' subprojects/webapp/build.gradle.kts`
and
`grep -c 'version.set("22.12.0")' subprojects/webapp/build.gradle.kts`
each print 1, and
`grep -c npmVersion subprojects/webapp/build.gradle.kts` prints 0;
`./gradlew :subprojects:webapp:npmCi` exits 0 on a clean checkout, after
which `ls subprojects/webapp/.gradle/nodejs | grep -c '^node-v22.12.0-'`
prints 1; `git ls-files subprojects/webapp` lists `package-lock.json`
and no path under `build/`; and in `subprojects/webapp/package.json`,
`grep -cE '"(typescript": "5\.5\.4|esbuild": "0\.24\.0|@playwright/test": "1\.47\.2|@types/node": "22\.10\.2|@axe-core/playwright": "4\.10\.0|caniuse-lite": "1\.0\.30001687)"'`
prints 6, `grep -cE '": "[~^]'` prints 0, and `grep -c '"type"'` prints
0.

#### T-02 — Build and check tasks

**Steps.** (1) Write `build.mjs` per the npm-scripts paragraph of
[DDD §2](ddd.md#2-repository-structure-naming-and-toolchain), its
esbuild options written as literals. Run without flags, it bundles
`src/main.ts` into `build/dist/app.js` with `bundle: true`,
`format: "esm"`, `platform: "browser"`, `target: "es2020"`,
`minify: true`, and no source map, and builds `src/app.css` into
`build/dist/app.css` — stable names; hash-naming stays with
`scenarioAssets`
([DDD §6.1](ddd.md#61-build-outputs-asset-paths-and-page-scaffold)). Run
with `--tests`, it compiles every `test/**/*.test.ts` file and, when
that file exists, `test/parity.ts` (T-35 creates it) into
`build/test/` at the same relative paths, each bundled with its
imports (`platform: "node"`, `format: "esm"`, `target: "es2020"`),
and writes `build/test/package.json` as `{"type": "module"}`; no other
file of `test/` is an entry point. Create `src/main.ts` holding only
`export {};` — the navigation lifecycle is T-46's, and
`isolatedModules` rejects a file that is not a module — and an empty
`src/app.css`. (2) Add to `package.json` exactly the five `scripts`
of §2: `typecheck`, `test`, `parity`, `browser-install`, and
`browser-test` — the `test` script passing the quoted glob
`"build/test/**/*.test.js"` to `node --test`, so that only the
compiled test files run. (3) Register in `build.gradle.kts`, as the
plugin task types of the §2 task table — never Gradle `Exec` — and
each with `dependsOn(npmCi)`: `tscCheck`, wired into `check` as its
own task; `webappTest`, wired into `check`, its environment
`EGR_EXPECTED_NODE` set from `node.version`; `webappParity`, in no
lifecycle task, which CI runs in its **Parity** steps
([DDD §6.3](ddd.md#63-ci-workflows)); and `webappBundle`, wired into
`assemble`. `playwrightInstall` and `webappBrowserTest` are registered
by T-60 — `webappBrowserTest` once T-21 has created the
`mkdocsPreview` task it depends on — and `webappMeasureReference` and
`webappMeasureDestroy` by T-59. (4) Add `test/toolchain.test.ts`, the
runtime tripwire of the §2 table and
[DDD §7.4](ddd.md#74-application-tests): it fails unless
`process.version` equals `v` followed by `EGR_EXPECTED_NODE`.

**Done when:** `./gradlew :subprojects:webapp:tscCheck` exits 0; with a
temporary `src/stats/zz-dom.ts` holding
`export const t = document.title;`, `tscCheck` exits non-zero naming
that file, and it exits 0 again once the file is deleted;
`./gradlew :subprojects:webapp:webappBundle` exits 0 and
`ls subprojects/webapp/build/dist/` prints exactly `app.css` and
`app.js`; in `subprojects/webapp/build.mjs`, `grep -c 'format: "esm"'`
prints at least 1 and `grep -cE 'format: "(iife|cjs)"'` prints 0;
`python3 -c "import json; s = json.load(open('subprojects/webapp/package.json'))['scripts']; assert list(s) == ['typecheck', 'test', 'parity', 'browser-install', 'browser-test'], s"`
exits 0; `./gradlew :subprojects:webapp:webappTest` exits 0, while — in
`subprojects/webapp`, in the form of
[DDD §2](ddd.md#2-repository-structure-naming-and-toolchain) (Node.js
outside Gradle), first
`export PATH="$(ls -d "$PWD"/.gradle/nodejs/node-v22.12.0-*)/bin:$PATH"`
— `env -u EGR_EXPECTED_NODE node --test build/test/toolchain.test.js`,
the same runtime without `EGR_EXPECTED_NODE`, exits non-zero;
`grep -c 'Exec::class' subprojects/webapp/build.gradle.kts` prints 0;
`./gradlew :subprojects:webapp:check --dry-run` lists `tscCheck` and
`webappTest` and not `webappParity`; and `./gradlew check` exits 0
repo-wide. The check that the built bundle keeps `import.meta.url`
belongs to T-46, which first uses it.

#### T-03 — Scenario page scaffold

**Steps.** (1) Create `subprojects/mkdocs/docs/scenario.md` per the page
scaffold of
[DDD §6.1](ddd.md#61-build-outputs-asset-paths-and-page-scaffold), in
this order: the front matter `search: exclude: true` — the scaffold's
four lines `---`, `search:`, `  exclude: true`, and `---` — and a
blank line; the `# Ground Rupture Explorer` masthead; then
`<div id="gre-root" markdown="1">` holding, between the lines
`<!-- copy:docs/app/ddd.md#510-failure-states -->` and
`<!-- /copy -->`, the no-JS fallback body: the content of the fenced
block of [DDD §5.10](ddd.md#510-failure-states) (Unavailable browser
capabilities), verbatim — its two paragraphs with their Markdown
links, relative to `scenario.md`, then the `<noscript>` element
holding one `<p>`; then
`<div id="gre-disclaimer" markdown="1">`, a sibling after `#gre-root`
with no heading, holding between the lines
`<!-- copy:docs/app/pdd.md#51-standing-disclaimer-cr-4-d-10-open -->`
and `<!-- /copy -->` the text of
[PDD §5.1 — Standing disclaimer (CR-4; D-10 Open)](pdd.md#51-standing-disclaimer-cr-4-d-10-open)
verbatim as plain paragraphs, as the §6.1 scaffold fixes it — the
blockquote's lines without their `> ` prefixes, one paragraph per
blockquote paragraph, which step 7 of `check_pdd_agreement.py`
compares after its normalization — its bracketed slot written as
PDD §5.1's bracketed text verbatim, "[the project's liability
limitations — text pending, D-10]", which step 7 compares directly
and which the item-7 search of
[DDD §7.7](ddd.md#77-site-validation-and-release-checklist) and T-55's
check for [G-5](#3-gates-and-release-sequence) (the D-10 liability text
authored or sourced) look for. (2)
Add no include block for `includes/scenario-head.html`: the file is
generated and gitignored, so `check_paths` would fail the strict preview
build on it (§6.1); the block lands with T-21, whose Done-when closes
the gap. (3) In `subprojects/mkdocs/mkdocs.yml`, add the §6.1
`draft_docs` (`media/dev/`, `scenario.md`, `assets/scenario/`),
`not_in_nav` (`scenario.md`), and `hooks` (`hooks/site_checks.py`)
blocks exactly; commit `subprojects/mkdocs/mkdocs.preview.yml` with
exactly its four §6.1 lines; and add to `.gitignore` the five site
entries §6.1 lists. (4) Commit `subprojects/mkdocs/hooks/site_checks.py`
per §6.1 — `on_startup` records the command, and every check and the
sitemap edit are skipped for `serve`; `on_files` records the drafts
and the unlisted pages, those listed under `not_in_nav` and not
drafted; in a publication build — every build whose
`config.config_file_path` is not `mkdocs.preview.yml` —
`on_post_template`, for the template `sitemap.xml`, removes each
`<url>` element whose `<loc>` is an unlisted page's `canonical_url`
before MkDocs writes `sitemap.xml` and `sitemap.xml.gz`; and
`on_post_build` walks
`config.site_dir` and raises `PluginError` listing every offending
site-relative path under arms (a) development media, (b) publication
inventory, and (d) publication boundary, for drafted and unlisted
pages alike, each exactly as §6.1 states it; arms
(c) and (e) join with T-51 — and commit
`subprojects/mkdocs/publication-allowlist.txt` holding §6.1's initial
allowlist: `assets/images/favicon.png` and the four `images/fig-*` paper
figures. (5) Give the Gradle task `mkdocsBuild` the two inputs
`hooks/site_checks.py` and `publication-allowlist.txt` (§6.1). The
`mkdocsPreview` task and CI's **Build preview site** step are T-21's;
until then the preview build runs from the command line.

**Done when:** `./gradlew :subprojects:mkdocs:mkdocsBuild` exits 0 and
`test ! -e subprojects/mkdocs/site/scenario` succeeds; from
`subprojects/mkdocs`, the project virtualenv's
`mkdocs build --strict -f mkdocs.preview.yml` exits 0 — its link and
anchor validation covering the fallback body's links — and in
`site-preview/scenario/index.html`, `grep -c 'id="gre-root"'`,
`grep -c 'id="gre-disclaimer"'`, and `grep -c '<noscript>'` each print
1; in `subprojects/mkdocs/docs/scenario.md`,
`grep -c '^<!-- copy:docs/app/ddd.md#510-failure-states -->$'`,
`grep -c '^<!-- copy:docs/app/pdd.md#51-standing-disclaimer-cr-4-d-10-open -->$'`,
and
`grep -cF "[the project's liability limitations — text pending, D-10]"`
each print 1,
`head -4 subprojects/mkdocs/docs/scenario.md | tr '\n' '|'` prints
`---|search:|  exclude: true|---|`,
`grep -c '^<!-- /copy -->$'` prints 2, and
`grep -oE '\]\((#gre-disclaimer|paper\.md|data\.md|index\.md|glossary\.md)\)' subprojects/mkdocs/docs/scenario.md | sort -u | grep -c .`
prints 5, one per link target of the §5.10 block;
`grep -c 'scenario.md' subprojects/mkdocs/mkdocs.yml` prints 2;
`printf 'INHERIT: mkdocs.yml\ndraft_docs: |\n  media/dev/\nsite_dir: site-preview\n' | diff - subprojects/mkdocs/mkdocs.preview.yml`
prints nothing; `git check-ignore -q` exits 0 for each of the five
§6.1 entries (for a directory entry, a path inside it); and the §6.1
hook drills for arms (a), (b), and (d) hold, each reverted afterwards —
an unreferenced copy of a figure saved as `docs/images/zz-unlisted.png`
makes a bare `mkdocs build --strict` exit non-zero naming that path;
removing the `fig-05` allowlist line after a successful `mkdocsBuild`
makes the next `mkdocsBuild` run, not report UP-TO-DATE, and fail
naming that figure; a file under `docs/media/dev/` is absent from
`site/` yet answers under `mkdocs serve`, and a scratch page
referencing it fails the build naming that page; a scratch link
from `index.md` to the drafted `scenario.md` fails the publication
build naming `index.html`; and, with `scenario.md` and
`assets/scenario/` removed from `draft_docs` in the working tree — the
page unlisted — the same scratch link fails the publication build
again, and without it a bare `mkdocs build --strict` exits 0 with
`grep -c 'eps-ground-rupture/scenario/</loc>' site/sitemap.xml`,
`gzip -dc site/sitemap.xml.gz | grep -c 'eps-ground-rupture/scenario/</loc>'`,
and `grep -c '"location":"scenario/' site/search/search_index.json`
each printing 0, while after the preview build
`grep -c 'eps-ground-rupture/scenario/</loc>' site-preview/sitemap.xml`
prints 1. The verbatim comparison of both copy-marked
blocks with the sections they cite is step 7 of
`check_pdd_agreement.py`
([DDD §5.13](ddd.md#513-application-configuration); T-47), which
T-47's Done-when and, from T-47 on, every pull request's
**Check PDD agreement** step run; its step 8 lists the fallback block
for the [SC-7](pdd.md#101-success-criteria) (scientific sign-off)
review.

#### T-04 — Traceability lint

**Steps.** (1) Create `.github/scripts/check_traceability.py`, standard
library only, implementing exactly the lint that the *Verification
(planned)* paragraph closing
[DDD §8.4](ddd.md#84-from-the-adrs-and-the-adr-process) states, over
the matrix tables of `docs/app/ddd.md` (§8.1–§8.4) and
`docs/app/ip.md` (§7.1–§7.4), with the entry forms and the Status
precedence that [DDD §8](ddd.md#8-traceability) defines. It splits a
row into its six cells at each unescaped `|` and a Check cell into
entries at `;`, and it checks, each as that paragraph words it and no
narrower: every table header is exactly
`| Source | Obligation | Home | Kind | Check | Status |`; every
`+`-joined part of a Kind lies in the Kind set and every Status in the
Status set; each row's Kind is the set of the kinds its entries take
by their §8 forms, and its Status follows the §8 precedence — `n/a`
exactly when the Kind is `n/a`; `gap`, `parked`, and `deferred` kept as
rendered; otherwise `owner-pending`, `planned`, or `designed` as its
entries decide; every `test` entry — one that begins with
`subprojects/` or `.github/`, or with `§4.1 step <n> rule` — ends with
its task list in parentheses, `(T-nn)` or `(T-nn, T-nn)` with any
number of tasks; the path of every entry beginning with `subprojects/`
or `.github/` — its text up to the first `::` or space — names a file
that the **Inventory.** paragraph of
[DDD §7.3](ddd.md#73-pipeline-and-export-tests),
[§7.4](ddd.md#74-application-tests), or
[§7.5](ddd.md#75-browser-test-lane) lists, in its text or its table,
matched by base name — a path under `subprojects/python/tests/`
against §7.3, under `subprojects/webapp/test/` against §7.4, and under
`subprojects/webapp/playwright/specs/` against §7.5 — or one of the
seven files that paragraph names as in no inventory:
`.github/workflows/tests.yml`, `.github/workflows/mkdocs.yml`,
`.github/scripts/check_pdd_agreement.py`,
`.github/scripts/test_check_pdd_agreement.py`,
`subprojects/mkdocs/hooks/site_checks.py`,
`subprojects/webapp/test/parity.ts`, and
`subprojects/python/tests/test_regression_views.py`; every name an
export-rule entry cites is a rule that the cited step of
[DDD §4.1](ddd.md#41-export-task-and-validation) defines — an item of
that step opening with the name in backticks, alone or after `Rule`;
every whole word matching `T-[0-9]{2}`, `OA-[0-9]+`, or `G-[0-9]+` in
a Check cell is a task row of [§2](#2-task-graph), an owner action of
[§4](#4-owner-and-research-group-actions), or a gate of
[§3](#3-gates-and-release-sequence); no Check or Status cell carries
the words `passed`, `verified`, `satisfied`, or `discharged`; and every
IP §7 row is identical to the DDD §8 row with the same Source and
Obligation. It exits non-zero on any failed check, naming the row; it
hardcodes no row count, prints the number of rows whose Status is
`gap`, and with `--release` also exits non-zero unless that number is
0. Where this list and the DDD paragraph differ, the paragraph
governs. (2) In `.github/workflows/doc-links.yml`, add to job `links`
the step **Check traceability**, running
`python .github/scripts/check_traceability.py`
([DDD §6.3](ddd.md#63-ci-workflows)), placed so that the job keeps
the §6.3 order — **Check links and anchors**, **Check PDD agreement**,
**Check traceability**, **Self-test doc scripts** — whichever of
T-47's two steps exist: after **Check PDD agreement** when T-47 has
added it, otherwise directly after **Check links and anchors**, and
before **Self-test doc scripts** when that step exists. The
release-time run with `--release` is item 16 of the
[DDD §7.7](ddd.md#77-site-validation-and-release-checklist) checklist
(T-65).

**Done when:** `python3 .github/scripts/check_traceability.py` exits 0
on the committed documents and prints the gap count, and
`python3 .github/scripts/check_traceability.py --release` exits 0
exactly when that count is 0; in that run the committed rows that cite
a workflow step, the existing test, the conftest of the full-data
gate, and a two-task list stand unchanged — `grep -cF` on
`docs/app/ddd.md` prints at least 1 for each of
`.github/workflows/mkdocs.yml::build / Stage scenario assets (T-21)`,
`test_regression_views.py::test_dem_regression_coefficients (T-14)`,
`subprojects/python/tests/conftest.py (T-14)`, and `(T-11, T-61)`;
with the Check cell of the first DDD §8 row whose Kind is `test`
replaced in the working tree by
`subprojects/webapp/test/config.test.ts (T-47)`, the script exits
non-zero naming that path, and `git checkout -- docs/app/ddd.md`
restores exit 0; one-cell working-tree mutations of the same kind — a
renamed header cell, a Kind or a Status outside its closed set, a
`T-99` citation, a `verified` Status, a `test` entry without its task
list, a `planned` row given an `OA-4` entry, and an IP §7 row whose
Check differs from its DDD twin — each make it exit non-zero naming
the row, each reverted afterwards with
`git checkout -- docs/app/ddd.md docs/app/ip.md`;
`grep -c 'check_traceability.py' .github/workflows/doc-links.yml`
prints 1, and
`grep -oE 'Check links and anchors|Check PDD agreement|Check traceability|Self-test doc scripts' .github/workflows/doc-links.yml`
prints the step names present in the §6.3 order; and the pull
request's Doc links run shows **Check traceability** green
(`gh run view --log`).

### M1 — Pipeline data lane

| ID | Task | Depends on | Inputs | Effort | Executor | Status |
|---|---|---|---|---|---|---|
| T-10 | The field-export product view `field_export` of DDD §3.4 in `views.py`, beside the dashboard views — the one new view the research-data exports need: the artifact and the reference results read the existing `dem` view, the regression export reads `dem_regression` — with its `labeled_set` taken from the new constant `LABELED_FIELD_EVENTS` of `config.py`, which holds the Proposed reading until [OA-14](#4-owner-and-research-group-actions) records the [D-18](pdd.md#1-decision-register) (Field-overlay default set and per-source analogue map) membership; the task completes with the Proposed reading. | — | [DDD §3.4](ddd.md#34-field-data-export), [§3.5](ddd.md#35-regression-export), [§4.1](ddd.md#41-export-task-and-validation); [ADR-0012](../adr/0012-product-data-exports.md); [PDD §4.4 — Field overlay (FR-O5, D-18 Proposed)](pdd.md#44-field-overlay-fr-o5-d-18-proposed). | M | agent | Draftable |
| T-11 | Export task `exportApp` (`egr-export-app`): one run writes `dist/app/<data-tag>/` — the artifact in the [DD-1](ddd.md#1-ddd-decision-register) (Scarp-dip column encoding) dictionary layout, the field and regression exports, the vintage-terms file, the artifact manifest with its `provenance` — and the working-tree pointer manifest; the size report and the DDD §3.8 figures it supplies; the `--reproduce` regeneration. The terms source `data/REDISTRIBUTION.md` — committed by the owner with the assumed terms under [OA-1](#4-owner-and-research-group-actions) in Phase 1, its texts replaced by OA-13's final ones in Phase 2 — is required by every run whose tag is not `data-v0-test`; development exports run without it. | T-10 | [DDD §3.1](ddd.md#31-scenario-artifact-binary-layout)–[§3.5](ddd.md#35-regression-export), [§3.8](ddd.md#38-measured-sizes), [§4.1](ddd.md#41-export-task-and-validation), [§4.3](ddd.md#43-retention-rollback-recovery-and-withdrawal), [§4.4](ddd.md#44-licensing-archival-distribution-and-release-attachments). | L | agent | Draftable |
| T-12 | Export validation: every named rule of DDD §4.1 inside the export run — the preconditions, the decode checks (bitwise restore, sentinels, slip order, dictionary orders, view re-read, coefficient reach, reference invariants), the manifest cross-checks, and the pointer checks — each printing its rule's line; a `--reproduce` run runs every rule but `retained-copy`, the pointer checks against the pointer it was given. | T-11, T-13 | [DDD §4.1](ddd.md#41-export-task-and-validation), [§3.1](ddd.md#31-scenario-artifact-binary-layout)–[§3.6](ddd.md#36-reference-results), [§4.3](ddd.md#43-retention-rollback-recovery-and-withdrawal). | M | agent | Draftable |
| T-13 | Reference-results generator, its file joining the T-11 export run: golden-scenario counts, statistics, percentiles, linear and logarithmic histograms, display strings, selections with classes, converted windows and range flags, diagnosed conditions, and the boundary and synthetic cases. [GS-3](pdd.md#102-golden-scenarios) (Kern preset (after D-6)) joins when [D-6](pdd.md#1-decision-register) (Kern County field-data group and principal-width rule) is decided ([PDD §10.2 — Golden scenarios](pdd.md#102-golden-scenarios)). | T-10, T-11 | [DDD §3.6](ddd.md#36-reference-results), [§3.8](ddd.md#38-measured-sizes), [§4.1](ddd.md#41-export-task-and-validation), [§5.3](ddd.md#53-query-engine), [§5.4](ddd.md#54-statistics), [§5.5](ddd.md#55-offset-to-slip-conversion-assist), [§5.6](ddd.md#56-scenario-state-and-url-encoding), [§5.8](ddd.md#58-view-layer), [§5.12](ddd.md#512-charts), [§7.3](ddd.md#73-pipeline-and-export-tests); [PDD §10.2 — Golden scenarios](pdd.md#102-golden-scenarios). | L | agent | Draftable |
| T-14 | Required full-data checks: the `EGR_REQUIRE_FULL_DATA` conftest, the required-test manifest, `pytestFullData`, the full-data lanes of the four §7.3 contract files, and the gate self-tests — a skipped check is never a pass. | T-12, T-13 | [DDD §7.3](ddd.md#73-pipeline-and-export-tests), [§4.1](ddd.md#41-export-task-and-validation), [§4.2](ddd.md#42-publication-of-a-data-vintage). | M | agent | Draftable |
| T-15 | Publication tooling `publishVintage`: the permission gate (exactly one [OA-1](#4-owner-and-research-group-actions) record line — the assumed record in Phase 1, the confirmed record from Phase 2 — the `README.md` and `LICENSE-docs` wording naming the terms file, and release immutability), the clean tree, resumable states, the export and full-data checks inside the run, the annotated tag, the draft prerelease, upload, read-back, publication, and the publication record; the drill override; the owner's pointer commit follows — one task, one run, one commit per vintage ([ADR-0014](../adr/0014-committed-content-hashed-artifacts.md)). Tooling only, drilled against a synthetic fixture in a local drill clone with a stub `gh` that models releases, drafts, tags, and immutability, so no drill reaches GitHub; executions are T-18, the end-to-end run, and T-63. | T-11, T-12, T-14, T-16 | [DDD §4.2](ddd.md#42-publication-of-a-data-vintage), [§4.1](ddd.md#41-export-task-and-validation), [§4.3](ddd.md#43-retention-rollback-recovery-and-withdrawal), [§4.4](ddd.md#44-licensing-archival-distribution-and-release-attachments), [§7.3](ddd.md#73-pipeline-and-export-tests). | L | agent | Draftable |
| T-16 | Pipeline fixture tests: the fixture lanes of the four DDD §7.3 contract files, CI-sized, with one corruption per rule of DDD §4.1 steps 3 and 5 and the non-finite cases. | T-11, T-12 | [DDD §7.3](ddd.md#73-pipeline-and-export-tests), [§3.1](ddd.md#31-scenario-artifact-binary-layout)–[§3.6](ddd.md#36-reference-results), [§4.1](ddd.md#41-export-task-and-validation), [§5.6](ddd.md#56-scenario-state-and-url-encoding). | M | agent | Draftable |
| T-17 | Early payload diagnostic: the generated artifact's compressed size printed against the budget of [PDD §9.1 — Performance budgets (D-9, Proposed)](pdd.md#91-performance-budgets-d-9-proposed) as soon as T-11 produces it ([R-19](prd.md#94-delivery-and-technical-risks) asks for early validation against the budget; [R-16](prd.md#94-delivery-and-technical-risks) is the payload-budget risk it tests early). A diagnostic lower bound — the full payload scope is T-61's; [DDD §3.8](ddd.md#38-measured-sizes) records the figure from the line. | T-11 | [PDD §9.1 — Performance budgets (D-9, Proposed)](pdd.md#91-performance-budgets-d-9-proposed); [DDD §3.8](ddd.md#38-measured-sizes), [§4.1](ddd.md#41-export-task-and-validation), [§7.6](ddd.md#76-performance-and-compatibility-measurements). | S | agent | Draftable |
| T-18 | First publication, the end-to-end run of the T-15 tooling: the owner runs `publishVintage` for `data-v1` — export, full-data checks (T-14) against the staged vintage, draft-first publication — and commits the pointer, merged into `main`, producing the first pinned vintage, which the unlisted prototype serves; gated by [G-1](#3-gates-and-release-sequence) in its Phase-1 form — the owner's `data/REDISTRIBUTION.md` with the assumed terms and the assumed [OA-1](#4-owner-and-research-group-actions) record, and `README.md` and `LICENSE-docs` naming it, before the first vintage upload — by release immutability (OA-11, done), and by the owner's acceptance of ADR-0017 ([OA-17](#4-owner-and-research-group-actions)). A failure that leaves a published release failing its checks is retried with the next tag number. | T-13, T-14, T-15, OA-1, OA-17 | [DDD §4.2](ddd.md#42-publication-of-a-data-vintage), [§4.1](ddd.md#41-export-task-and-validation), [§4.3](ddd.md#43-retention-rollback-recovery-and-withdrawal), [§4.4](ddd.md#44-licensing-archival-distribution-and-release-attachments), [§7.3](ddd.md#73-pipeline-and-export-tests); [HLDD §9 — Testing and release architecture](hldd.md#9-testing-and-release-architecture). | — | owner | Draftable |

#### T-10 — Product export views

**Steps.** (1) Add `LABELED_FIELD_EVENTS` to
`subprojects/python/src/eps_ground_rupture/config.py` exactly as
[DDD §3.4](ddd.md#34-field-data-export) (Labeled set) defines it — a
`dict[str, tuple[str, ...] | None]` with exactly the keys `"FDHI"`,
`"SURE"`, and `"Kern"` — holding the Proposed reading that §3.4
gives; the membership that
[OA-14](#4-owner-and-research-group-actions) records reaches the
constant later, in a commit of its own that T-55 checks. (2) Add to
`build_duckdb_views` in
`subprojects/python/src/eps_ground_rupture/views.py`, beside the
dashboard views, the field-export product view `field_export` of §3.4
— the one new view the exports need: the scenario artifact and the
reference results read the existing `dem` view, and the regression
export reads `dem_regression`
([DDD §4.1](ddd.md#41-export-task-and-validation) step 2;
[§3.5](ddd.md#35-regression-export)). The view returns the §3.4 row
records — `source`, `eq_name`, `magnitude`, `analogue`,
`source_quantity`, `value`, `limited_comparison`, `criterion_sub50`,
`labeled_set`, and `kern_field_group` — from the six (source, analogue)
arms over `fdhi_measurements`, `sure`, and `kern_combined`, each
admitting only rows whose source quantity is positive, with §3.4's
magnitude sourcing, normalized event names, `labeled_set` true exactly
when `LABELED_FIELD_EVENTS` maps the row's source to `None` or the
row's `eq_name` is in that source's tuple, for both analogues alike,
and `kern_field_group` null. The view is created under the condition
of §3.4 — only when the `fdhi_measurements` Parquet exists, alongside
`historic_events` — and the module docstring lists it as §3.4 states.
The pipeline tests import the constant and never re-pin it (T-14,
T-16). The task completes with the Proposed reading.

**Done when:** in `subprojects/python`,
`poetry run python -c "from eps_ground_rupture import views; from eps_ground_rupture.config import LABELED_FIELD_EVENTS as L; assert sorted(L) == ['FDHI', 'Kern', 'SURE']"`
exits 0; with the processed tables present, a temporary build —
`views.build_duckdb_views(duckdb_path=Path(tmp, "views.duckdb"))` —
holds the view `field_export`, which, grouped by (`source`,
`analogue`), returns six groups, each with a positive count, no row
with `value` ≤ 0, and `labeled_set` true on exactly the rows whose
source `LABELED_FIELD_EVENTS` maps to `None` or whose `eq_name` its
source's tuple names; and `poetry run pytest` exits 0, its existing
optional-table cases covering a build without `fdhi_measurements`. The
row-for-row comparison of the field export with this view is T-12's
rule `view-reread`; T-16 tests the arm rules and `labeled_set` against
the constant, and T-14 pins the per-arm counts and checks the
membership against the imported constant.

#### T-11 — Export task

**Steps.** Implement
`subprojects/python/src/eps_ground_rupture/product_export.py` with the
entry point `eps_ground_rupture.product_export:main`, the Poetry script
`egr-export-app` in `subprojects/python/pyproject.toml`, and the Gradle
task `exportApp` in `subprojects/python/build.gradle.kts` — an `Exec`
task, group `build`, with `useVenv()` and `dependsOn(poetryInstall)`,
running `poetry run egr-export-app --data-tag <tag>` for the required
property `-Pdata.tag`, wired into no lifecycle task — per
[DDD §4.1](ddd.md#41-export-task-and-validation), one run writing
`dist/app/<data-tag>/`: (1) step 1's run setup — `dist/app/<data-tag>/`
deleted and recreated; the `provenance` object of
[DDD §3.2](ddd.md#32-artifact-manifest), with the clean-tree command and
the eight `inputs` files of step 1; and the run-private views,
`views.build_duckdb_views(duckdb_path=Path(tmp, "views.duckdb"))` in a
`tempfile.TemporaryDirectory()`, never `dashboards/duckdb/eps.duckdb`;
(2) step 2's data files — the artifact packed from the `dem` view
exactly per [DDD §3.1](ddd.md#31-scenario-artifact-binary-layout)
(header, 4-byte-aligned blocks, `decimals` and `offset_steps` storage,
null sentinels, the DD-1 dictionary), the field export from T-10's view
per [DDD §3.4](ddd.md#34-field-data-export), and the regression export
from `dem_regression` per [DDD §3.5](ddd.md#35-regression-export) with
its `relationship` constants — every JSON file in the step-2 canonical
form, `allow_nan=False` included, the data files compressed only with
`gzip.compress(payload, compresslevel=9, mtime=0)`, and every file named
by its role's step-2 pattern over its exact bytes; the reference-results
file joins the run with T-13; (3) step 4's artifact manifest (§3.2,
`provenance` included) and the terms file `data-terms-<h12>.txt`, a
byte-for-byte copy of `data/REDISTRIBUTION.md`
([DDD §4.4](ddd.md#44-licensing-archival-distribution-and-release-attachments))
or, for a `data-v0-test` run without that file, an empty file, both
uncompressed; (4) step 6's pointer manifest
([DDD §3.3](ddd.md#33-pointer-manifest)), written to
`subprojects/webapp/data/pointer.json` and never committed by the run;
(5) the report frame — `source_commit` and `source_tree_clean` first;
after the rule lines (T-12), the closing size report, one line per
vintage file sorted by file name, `size: <name> <bytes>`, and for a
`.gz` file `size: <name> <bytes> <decompressed bytes>`, each count a
plain decimal integer; and, as the run's last line, T-17's payload
diagnostic; (6) the regeneration options of
[DDD §4.3](ddd.md#43-retention-rollback-recovery-and-withdrawal):
`--reproduce <pointer>`, which skips rule `retained-copy`, runs every
other rule (T-12) — step 6's `pointer-exact` and `file-names` against
the pointer it was given, writing no pointer — writes only
`dist/app/<data-tag>.reproduced/`, and prints the validation report,
the size report, and the payload diagnostic like any run, its
refusals naming the failing `provenance` member and its output
compared file by file with the pointer's SHA-256s, and
`--allow-environment-drift`; (7) update
[DDD §3.8](ddd.md#38-measured-sizes) from this run's size report, each
figure recorded as measured on the `data-v0-test` export: the selected
layout's raw and gzip −9 sizes, item 1's manifest byte count, item 2's
raw figure (the artifact's decompressed byte count plus the manifest's
byte count), and item 3's byte counts, with decompressed byte counts
for the `.gz` files, for the files this run writes. The named rules of
§4.1 are T-12's. `data/REDISTRIBUTION.md` is the owner's file of
§4.4 — committed with the assumed terms under
[OA-1](#4-owner-and-research-group-actions) in Phase 1, its texts
replaced by OA-13's final ones in Phase 2 — which rule
`inputs-present` requires of every run whose tag is not
`data-v0-test`: the `data-v0-test` runs of this Done-when work with
or without it, and the agent never writes it.

**Done when:** in a working tree where the clean-tree command of §4.1
step 1 prints nothing, with `tmp=$(mktemp -d)`,
`./gradlew :subprojects:python:exportApp -Pdata.tag=data-v0-test > "$tmp/run.txt"`
exits 0 — `data-v0-test` is the development tag that rule `data-tag`
accepts and `publishVintage` refuses;
`python3 -c "import json, os; p = json.load(open('subprojects/webapp/data/pointer.json')); assert sorted(os.listdir('dist/app/data-v0-test')) == sorted(p['files'])"`
exits 0, and each file's `shasum -a 256` equals its pointer entry;
`python3 -c "import os, sys; d = 'dist/app/data-v0-test'; t = [f for f in os.listdir(d) if f.startswith('data-terms-')]; r = 'data/REDISTRIBUTION.md'; e = open(r, 'rb').read() if os.path.exists(r) else b''; sys.exit(0 if len(t) == 1 and open(os.path.join(d, t[0]), 'rb').read() == e else 1)"`
exits 0 — the terms file is a byte copy of `data/REDISTRIBUTION.md`,
or empty while that file is absent;
`python3 -c "import json, sys; p = json.load(open('subprojects/webapp/data/pointer.json')); n = [l.split()[1] for l in open(sys.argv[1]) if l.startswith('size: ')]; assert n == sorted(p['files']), n" "$tmp/run.txt"`
exits 0 — the size report names every pointer-named file, in file-name
order; on a `dem` input with the SHA-256 that §3.8 names,
`grep -cE '^size: scenario-[0-9a-f]{12}\.bin\.gz [0-9]+ 3288980$' "$tmp/run.txt"`
prints 1 — the artifact's decompressed byte count, the length its
`blocks` declare;
`cp subprojects/webapp/data/pointer.json "$tmp/"; (cd subprojects/python && poetry run egr-export-app --reproduce "$tmp/pointer.json")`
exits 0, every file of `dist/app/data-v0-test.reproduced/` matching the
pointer's SHA-256, and exits 0 again with an empty
`dist/app/data-v0-test.publication.json` present, which rule
`retained-copy` refuses in an export run (the file deleted afterwards);
and every figure the run adds to §3.8 equals a `size:` line of
`"$tmp/run.txt"` and is labeled as measured on the `data-v0-test`
export.

#### T-12 — Export validation

**Steps.** Implement inside the export run every named rule of
[DDD §4.1](ddd.md#41-export-task-and-validation), in the §4.1 order,
each printing `<rule>: ok`; the first failure prints
`<rule>: FAILED — <detail>` and ends the run non-zero, so the pointer,
written only at step 6, is never changed by a failed run. The rules:
step 1's `data-tag`, `retained-copy`, and `inputs-present`; step 3's
`counts`, `slip-order`, `site-constancy`, `bitwise-restore`,
`sentinel-collision`, `null-counts`,
`unclassified-has-no-valid-measurement`, `dictionary-order`,
`view-reread`, `coefficient-reach`, and `reference-invariants`; step 5's
`block-tiling`, `manifest-figures`, `checksums`, `format-spec` (one
closed spec per JSON format in `product_export.py`, applied to the
pointer before step 6 writes it), `dd10-names`, `envelope-agreement`,
and `provenance`; and step 6's `pointer-exact` and `file-names`. Each
rule checks exactly what its §4.1 entry states, against the formats of
[DDD §3.1](ddd.md#31-scenario-artifact-binary-layout)–[§3.6](ddd.md#36-reference-results).
A `--reproduce` run (T-11) runs every rule but `retained-copy` (§4.1
step 1), step 6's `pointer-exact` and `file-names` against the
pointer it was given
([DDD §4.3](ddd.md#43-retention-rollback-recovery-and-withdrawal),
Recovery). The reference generator's `finite-reference-values` is no
report line: it is an assertion inside the generator (T-13;
[DDD §3.6](ddd.md#36-reference-results) step 9), which prints no `ok`
line and, on failure, `finite-reference-values: FAILED — <detail>`.

**Done when:** in a working tree where the clean-tree command of §4.1
step 1 prints nothing, with `tmp=$(mktemp -d)`,
`./gradlew :subprojects:python:exportApp -Pdata.tag=data-v0-test > "$tmp/run.txt"`
exits 0, its `source_commit` and `source_tree_clean` lines preceding
the rule lines, and
`sed -n 's/^\([a-z0-9-]*\): ok$/\1/p' "$tmp/run.txt" | paste -sd ' ' -`
prints exactly the 23 rules above in that order:
`data-tag retained-copy inputs-present counts slip-order site-constancy bitwise-restore sentinel-collision null-counts unclassified-has-no-valid-measurement dictionary-order view-reread coefficient-reach reference-invariants block-tiling manifest-figures checksums format-spec dd10-names envelope-agreement provenance pointer-exact file-names`;
`cp subprojects/webapp/data/pointer.json "$tmp/"; (cd subprojects/python && poetry run egr-export-app --reproduce "$tmp/pointer.json") > "$tmp/repro.txt"`
exits 0, the same `sed` over `"$tmp/repro.txt"` prints those rules
without `retained-copy`, and its `size:` lines follow them;
with `-Pdata.tag=data-v01` the export run exits non-zero at
`data-tag: FAILED`, and the SHA-256 of
`subprojects/webapp/data/pointer.json` is the same before and after
that run; and with an empty
`dist/app/data-v0-test.publication.json` present it exits non-zero at
`retained-copy: FAILED`, the file deleted afterwards. That each rule of
steps 3 and 5 fails on its own single-property corruption is checked in
T-16's Done-when, whose `test_manifests.py` lane also exercises the
pointer rules.

#### T-13 — Reference-results generator

**Steps.** Implement the reference-results generator in
`product_export.py`, with
`subprojects/python/src/eps_ground_rupture/reference_cases.py` building
the synthetic cases, per [DDD §3.6](ddd.md#36-reference-results); its
file `references-<h12>.json.gz` joins the T-11 export run at
[DDD §4.1](ddd.md#41-export-task-and-validation) step 2, and the pointer
names it. The generator reads the pipeline views, never the decoded
artifact, and writes: the envelope, with `display_decimals` and
`log_scale_min_decades` 2 from the constant `LOG_SCALE_MIN_DECADES = 2`;
one scenario entry per golden scenario of
[PDD §10.2 — Golden scenarios](pdd.md#102-golden-scenarios), GS-3 only
once D-6 is decided, each entry's `inputs` written by
`canonical_scenario()` ([DD-11](ddd.md#1-ddd-decision-register)
(Canonical scenario serialization);
[DDD §5.6](ddd.md#56-scenario-state-and-url-encoding)) and its `counts`
(with `unclassified`), `statistics`, `percentiles`, `histogram`,
`histogram_log`, `display`, `selection`, `converted_windows`, and
`diagnosed_conditions` computed by §3.6's generator algorithms 1–9 — the
Python twins of [DDD §5.4](ddd.md#54-statistics) (`quantile_linear`, the
exact integer-sum mean, and the explicit-loop sample standard deviation;
never builtin `sum`, a NumPy reduction, or `**`), `histogram()` and
`histogram_log(steps, classes, offer_ratio)` with `offer_ratio` 100
([DDD §5.12](ddd.md#512-charts)), `display_round`
([DDD §5.8](ddd.md#58-view-layer)), the
[DDD §5.5](ddd.md#55-offset-to-slip-conversion-assist) back-projection
and stored-space range flags, the [DDD §5.3](ddd.md#53-query-engine)
selection order with `stored_bounds_from_decimal` and `_stored_bounds`,
and `math.isfinite` asserted on every number written — rule
`finite-reference-values`, an assertion inside the generator that
prints no `ok` line and, on failure,
`finite-reference-values: FAILED — <detail>`, ending the run non-zero
(§3.6 step 9); the 86 `boundary_cases` — 80 on the offset path and 6 on
the slip path — named per §3.6; and `synthetic` with exactly
`ensembles` (each record with its `scarp_classes` and the cases §3.6
lists), `statistics`, `histograms`, `display_rounding` (the vectors of
[DDD §7.3](ddd.md#73-pipeline-and-export-tests), each record with its
`id` `round-<decimals>-<value>`), and `conversion`. Once the file
joins the run, record its byte count and decompressed byte count in
[DDD §3.8](ddd.md#38-measured-sizes) item 3 from the size report,
labeled as measured on the `data-v0-test` export, as T-11 records the
other files'.

**Done when:** with `tmp=$(mktemp -d)`, after
`./gradlew :subprojects:python:exportApp -Pdata.tag=data-v0-test > "$tmp/run.txt"`
exits 0, the pointer names one `references-<h12>.json.gz`, and that file,
gunzipped and parsed, holds the golden scenarios of PDD §10.2 as
follows: `scenarios` lists `GS-0`, `GS-1`, `GS-2`, `GS-4`, `GS-5`,
`GS-6`, and `GS-7` while D-6 is open; GS-0 has `matching_records`
346,834 and `unclassified` 3,434; GS-1's `inputs`, serialized in the
canonical JSON form of §5.6, equal its golden literal there, and its
`converted_windows` flag dip 30 `partly_out` — the "flagged beyond
the modeled range" of PDD §10.2, read as `partly_out` by §5.5 — and
dip 40 `in_range`; GS-2 and GS-5 have scarp-height `valid` 18 and 9;
GS-4's `diagnosed_conditions` is `["sediment", "depth"]`; GS-6 has
`matching_records` 3,434 with `valid` 0 and `excluded_null` 3,434 in
every measurement; GS-7 has `matching_records` 3,434. Further,
`boundary_cases` has 86 entries; `display_decimals` is {`slip` 2,
`scarp_height` 2, `dzw` 1, `scarp_dip` 0} and `log_scale_min_decades` is
2; `synthetic.display_rounding` holds the 19 vectors of §7.3 with 19
distinct `id`s, and every `synthetic.ensembles` record's
`scarp_classes` equals `list(config.SCARP_CLASSES)`; the T-11
`--reproduce` command reproduces the file's SHA-256; and the figures
§3.8 item 3 gains for the file equal its `size:` line in
`"$tmp/run.txt"`.

#### T-14 — Required full-data checks

**Steps.** Per [DDD §7.3](ddd.md#73-pipeline-and-export-tests): (1) Add
`subprojects/python/tests/conftest.py`, the one conftest §7.3
introduces, defining no fixtures, with its three hook groups —
collection skips (the `pytest_make_collect_report` wrapper), test skips
and xfails (the `pytest_runtest_makereport` wrapper), both taking a
skip's reason as `rep.longrepr[2].removeprefix('Skipped: ')`, and the
required-test manifest (`pytest_collection_finish`,
`pytest_runtest_logreport`, and the `trylast` `pytest_sessionfinish`) —
each inert unless `EGR_REQUIRE_FULL_DATA` equals `1`, with the PREFIX
`skipped under EGR_REQUIRE_FULL_DATA=1: `. (2) Add
`subprojects/python/tests/full_data_required.txt`, one node id per line
for every full-data test of the four contract files. (3) Register the
Gradle task `pytestFullData` in `subprojects/python/build.gradle.kts` —
an `Exec` task mirroring `pytest`, with `EGR_REQUIRE_FULL_DATA=1` in its
environment — in no lifecycle task; CI never sets the variable. (4) Give
each §7.3 contract file its full-data lane, creating any file T-16 has
not yet created: tests named `test_full_*` that skip only through a
module-scoped fixture's `pytest.skip`, with the §7.3 reasons, and find
the staged vintage through the working-tree pointer, each asserting its
row's full-data column — the shipped `counts` (346,834, 3,434, 101), the
bitwise restore, zero within-trial ties and zero ties at a trial's
maximum slip, no unclassified record with a valid measurement, and the
5.0128–5.0135 m final-stage envelope; the per-(source, analogue) pins of
the field export and its `labeled_set` membership, checked against
`config.LABELED_FIELD_EVENTS`, imported, never re-pinned; the GS-0–GS-7
regeneration with the PDD §10.2 assertions of the §7.3 row (GS-3 only
once D-6 is decided, so no GS-3 test exists to skip before then), the
boundary-case discrimination, the one-ulp agreement of DuckDB
`quantile_cont` with `quantile_linear` at p16, p50, and p84, and the
evidence tests `test_full_display_tie_census` and
`test_full_evaluation_order_effect`; and the staged vintage's manifest
cross-check. (5) Add `subprojects/python/tests/test_full_data_gate.py`
with the ten gate self-test cases of §7.3 — the case files of rows 7
and 8 each also holding a passing `test_other` that stays selected —
and `test_manifest_matches_suite`. (6) Update the fresh-clone skip
count in the header comment of `.github/workflows/tests.yml` (§7.3).

**Done when:** in `subprojects/python`,
`poetry run pytest tests/test_full_data_gate.py` exits 0; with the
export inputs of [DDD §4.1](ddd.md#41-export-task-and-validation)
step 1 and `data/raw/FDHI_Cleaned_Measurements.csv` present — the
full-data run needs both (§7.3) — and a staged development vintage
(`exportApp -Pdata.tag=data-v0-test`),
`./gradlew :subprojects:python:pytestFullData` exits 0 — under the flag
a skip, an xfail, or a required test without a successful call report
fails the run, so exit 0 means zero skips and every manifest test run to
success; in a checkout without the gitignored data, plain
`poetry run pytest` exits 0 while
`EGR_REQUIRE_FULL_DATA=1 poetry run pytest` exits non-zero with every
would-be skip reported under the prefix;
`./gradlew check --dry-run | grep -c pytestFullData` prints 0;
`grep -r EGR_REQUIRE_FULL_DATA .github/workflows/` prints nothing; and
the pull request's CI `pytest` job reports the skip count the
`tests.yml` header states. Such a run is a precheck; the publication
evidence is the run inside `publishVintage`
([DDD §4.2](ddd.md#42-publication-of-a-data-vintage) step 4).

#### T-15 — Publication tooling

**Steps.** (1) Implement
`subprojects/python/src/eps_ground_rupture/publish.py` with the entry
point `eps_ground_rupture.publish:main`, the Poetry script
`egr-publish-vintage`, and the Gradle task `publishVintage` in
`subprojects/python/build.gradle.kts` — an `Exec` task, group
`deployment`, with `useVenv()` and `dependsOn(poetryInstall)`, running
`poetry run egr-publish-vintage --data-tag <tag>` for the required
property `-Pdata.tag`, passing `-Ppublish.failAfterUploads=<k>` as
`--fail-after-uploads <k>` and `-Ppublish.drillRepository=<owner>/<name>`
as `--drill-repository <owner>/<name>`, wired into no lifecycle task —
that performs steps 1–10 of
[DDD §4.2](ddd.md#42-publication-of-a-data-vintage) exactly, each step
first detecting work already done: step 1, the permission gate — the
tag matches `^data-v[1-9][0-9]*$`, `data/REDISTRIBUTION.md` holds
exactly one OA-1 record line, the assumed record or the confirmed
record, each a line equal to its step-1 form with `YYYY-MM-DD`
matching `[0-9]{4}-[0-9]{2}-[0-9]{2}`
([OA-1](#4-owner-and-research-group-actions)), `README.md` and
`LICENSE-docs` each contain the path `data/REDISTRIBUTION.md` (the
§4.4 wording), and
`gh api repos/HarvardRC/eps-ground-rupture/immutable-releases --jq .enabled`
prints `true`; step 2, the clean tree; step 3, the state cases (c),
(d), (e), (b), and (a), in that order, the cleanup commands printed
only for an unfinished attempt — the pointer restored with
`git checkout -- subprojects/webapp/data/pointer.json` when
`git ls-files --error-unmatch subprojects/webapp/data/pointer.json`
succeeds, else removed with `rm`; step 4, on a fresh run, `egr-build`,
`egr-export-app --data-tag <tag>`, and `pytest` with
`EGR_REQUIRE_FULL_DATA=1`, then the provenance and clean-tree checks
and the staged record `dist/app/<tag>.publication.json`, its
`size_report` included; step 5, the annotated tag on `S`, pushed and
peel-checked; step 6, the draft prerelease, created with
`--verify-tag` and the terms file as its notes; step 7, upload,
compare, replace, and deletion of unlisted assets while a draft; step
8, the read-back; step 9, publication, the `published_at` write into
the staged record as soon as `gh release edit` succeeds, the `isDraft`
and `isPrerelease` check, and a second read-back; and step 10, the
completed publication record, appended to the release body. It then
prints the step-11 commands, `git add` before the pathspec commit, and
never commits. (2) The drill override that the §4.2 *Verification*
line names: `--drill-repository <owner>/<name>` has exactly that
line's effects — every `gh` call but the `gh repo view` check targets
that repository, each `gh release` command with
`--repo <owner>/<name>` and step 1's immutability check as
`gh api repos/<owner>/<name>/immutable-releases --jq .enabled` in
place of the literal HarvardRC path; step 4 runs no pytest and records
`pytest_full_data` as `drill: not run`; and step 1 refuses the
override while `gh repo view --json nameWithOwner --jq .nameWithOwner`
prints `HarvardRC/eps-ground-rupture`. A real publication never sets
it. (3) The drill fixture of that line, never committed to this
repository: the four raw inputs that rule
`inputs-present` names ([DDD §4.1](ddd.md#41-export-task-and-validation)
step 1), written only into the drill clone's gitignored `data/raw/`
from the synthetic frames of the T-16 fixture lanes in the column
layouts `egr-build` reads, so that after `egr-build` the clean-tree
command still prints nothing (§4.2 step 4) and every rule of the
export run holds; the files stay there, and the code that writes
them lives outside the drill clone's working tree, since an
untracked file inside it would fail step 2's clean-tree check. (4)
The drill environment of that line, which reaches no GitHub
repository: a bare repository cloned from this checkout
(`git clone --bare`) and the drill clone cloned from it, so that the
drill clone's `origin` is that local bare repository, both outside
this repository's working tree; and the stub `gh` of that line,
which logs every call and keeps its releases in a directory of its
own, lives like the fixture writer outside the drill clone's working
tree, and stands first on `PATH` only while a drill runs.

**Done when:** the publication drills of the §4.2 *Verification* line
hold, run only in the drill clone of step (4) — whose `origin` is the
local bare repository, never `HarvardRC/eps-ground-rupture` or another
GitHub repository — with `-Ppublish.drillRepository=<owner>/<name>`
on every run, `<owner>/<name>` the repository name the stub answers,
against the fixture of step (3), never the research data. Before the
first drill, in the drill clone, `git remote get-url origin` prints
the bare repository's local path and `command -v gh` prints the
stub's path. The drill copy of `data/REDISTRIBUTION.md` — and, while
the §4.4 wording has not landed, drill edits of `README.md` and
`LICENSE-docs` that name it — exists only in the drill clone and its
bare origin, committed there, the copy carrying the assumed-record
line and the comment line
`<!-- Drill fixture: no source's terms are confirmed here. -->`. The
drills: (a) a fresh run exits 0,
`git ls-remote origin 'refs/tags/data-v1^{}'` prints `S`, the release's
asset names equal the pointer's `files` keys,
`gh release view data-v1 --json isDraft,isPrerelease` reports `false`
and `true`, and the staged record holds `published_at`, `size_report`,
and `pytest_full_data` `drill: not run`; (b) a run with
`-Ppublish.failAfterUploads=1` exits non-zero after one upload, and the
rerun publishes with the pointer's `export_date` unchanged; (c) an
extra asset planted on a draft is deleted; (d) a tag at another commit
is refused, naming both commits, with the cleanup commands printed for
an unfinished attempt and not for a withdrawn vintage; (e) a dirty
tree, the tag `data-v0-test`, and a drill copy of
`data/REDISTRIBUTION.md` with no OA-1 record line, or with two, are
each refused; (f) a rerun against a
matching published release exits 0, reporting "already published";
(g) a published release whose assets differ from the staged pointer is
refused; (h) after drill (a)'s published release is deleted
(`gh release delete data-v1 --yes`), a rerun of `data-v1` at drill
(a)'s `S` is refused under state (e), naming the next tag number; and
(i) with the stub answering `gh repo view` with
`HarvardRC/eps-ground-rupture`, a run with the override exits
non-zero at step 1, naming the override, the stub's log holding no
`gh release` call and `git ls-remote --tags origin` printing what it
printed before. The end-to-end run against GitHub is T-18's.

#### T-16 — Pipeline fixture tests

**Steps.** Create the four
[DDD §7.3](ddd.md#73-pipeline-and-export-tests) contract files —
extending any file T-14 has already created — with their fixture lanes,
implementing each row's fixture column in the suite's conventions:
module-scoped fixtures defined per test file, no custom marker,
synthetic frames, and no pytest-configuration change.
`test_scenario_export.py` covers the lossless round trip of every
[DDD §3.1](ddd.md#31-scenario-artifact-binary-layout) encoding, the DD-1
dictionary included, each restored value equal to its source bit for bit
(`float.hex`); one single-property corruption per rule of
[DDD §4.1](ddd.md#41-export-task-and-validation) steps 3 and 5, each
asserting that rule's `<rule>: FAILED` line, parametrized with the id
`corrupt-<rule>`, and a rule's further corruptions with
`corrupt-<rule>-<k>`; and the non-finite cases — a NaN or an infinity
failing `finite-reference-values` in the reference file and
`allow_nan=False` in any other JSON payload — parametrized with the ids
`nonfinite-<k>`, `<k>` counting from 1. `test_field_export.py` covers
the [DDD §3.4](ddd.md#34-field-data-export) arm rules, the three
`criterion_sub50` states with 50.0 itself `not_met`,
`limited_comparison`, `labeled_set` following
`config.LABELED_FIELD_EVENTS` — true exactly on the rows of a source it
maps to `None` and on the rows whose `eq_name` its source's tuple
names, the constant imported, never re-pinned — the Kern event
identity, normalized names, the row order, and `pipeline_version`.
`test_reference_results.py` covers the
[DDD §3.6](ddd.md#36-reference-results) definitions against the
independent recomputations its §7.3 row lists, on `reference_cases.py`
inputs — `quantile_linear` bit-equal to NumPy's `linear` method, the
null rules, the integer-sum mean, `histogram()` and `histogram_log()`
against `numpy.histogram` with the offer-threshold pair, `display_round`
on the §7.3 vectors, the `_stored_bounds` and
`stored_bounds_from_decimal` probes, the synthetic ensembles against
pandas — the one-state rule under a scarp-type filter included — the
`synthetic.conversion` range flags, the 10,000-record selection
threshold with class code 255, a GS-4-style diagnosed set, GS-1's
`inputs` against the golden bytes of
[DDD §5.6](ddd.md#56-scenario-state-and-url-encoding), and a non-finite
value. `test_manifests.py` covers the
[DDD §3.2](ddd.md#32-artifact-manifest)/[§3.3](ddd.md#33-pointer-manifest)
consistency rules on synthetic vintages, one rejected fixture per rule.

**Done when:** in a checkout without the gitignored data,
`poetry run pytest tests/test_scenario_export.py tests/test_field_export.py tests/test_reference_results.py tests/test_manifests.py`
exits 0 in `subprojects/python`, every skip in its `-ra` tail giving a
§7.3 remedy, `run exportApp` or `run egr-build`;
`poetry run pytest tests/test_scenario_export.py --collect-only -q | grep -oE 'corrupt-[a-z0-9-]+' | sed -E 's/-[0-9]+$//' | sort -u | grep -c .`
prints 18, one per rule of §4.1 steps 3 and 5, no
`corrupt-finite-reference-values` among them;
`poetry run pytest tests/test_scenario_export.py --collect-only -q | grep -oE 'nonfinite-[0-9]+' | sort -u | grep -c .`
prints at least 2 — at least one case per mechanism; and CI's `pytest`
job is green on the pull request.

#### T-17 — Early payload diagnostic

**Steps.** Add to the export run (T-11), after its size report and as
the run's last line, the payload diagnostic that
[DDD §4.1](ddd.md#41-export-task-and-validation) (end of section) and
[DDD §3.8](ddd.md#38-measured-sizes) fix:
`payload diagnostic: <bytes> of 4 MB (4,000,000 B) budget`, `<bytes>`
the scenario artifact's file byte count as a plain decimal integer,
against the 4 MB compressed-payload budget of
[PDD §9.1 — Performance budgets (D-9, Proposed)](pdd.md#91-performance-budgets-d-9-proposed),
which [DDD §7.6](ddd.md#76-performance-and-compatibility-measurements)
reads as 4,000,000 B. A count above the budget changes only the printed
figure, and the run still exits 0 — a diagnostic, not a gate. §3.8 is
updated from the line, never hand-edited.

**Done when:** with `tmp=$(mktemp -d)`,
`(cd subprojects/python && poetry run egr-export-app --data-tag data-v0-test) > "$tmp/run.txt"`
exits 0, and
`python3 -c "import re, sys; L = open(sys.argv[1]).read().splitlines(); m = re.fullmatch(r'payload diagnostic: ([0-9]+) of 4 MB \(4,000,000 B\) budget', L[-1]); s = [l.split()[2] for l in L if l.startswith('size: scenario-')]; assert m and s == [m.group(1)]" "$tmp/run.txt"`
exits 0 — the last line is the diagnostic, its `<bytes>` the
artifact's file byte count in the same run's size report; and a
fixture case of `tests/test_scenario_export.py` — creating the file if
T-16 has not — that feeds the diagnostic 4,000,001 B asserts that the
line is printed and that the run does not fail.

#### T-18 — First verified publication (owner)

**Steps** (owner-run, agent-prepared): (1) Confirm the preconditions,
each recorded: [G-1](#3-gates-and-release-sequence) in its Phase-1
form — `data/REDISTRIBUTION.md`, committed by the owner with the
assumed terms of
[DDD §4.4](ddd.md#44-licensing-archival-distribution-and-release-attachments)
(Vintage terms), carries exactly one
[OA-1](#4-owner-and-research-group-actions) record line, by the check
OA-1 names, and `README.md` and `LICENSE-docs` each contain the path
`data/REDISTRIBUTION.md`
(`grep -L 'data/REDISTRIBUTION.md' README.md LICENSE-docs` prints
nothing); the [OA-17](#4-owner-and-research-group-actions) record,
the acceptance of ADR-0017, by the check OA-17 names; OA-11 done —
`gh api repos/HarvardRC/eps-ground-rupture/immutable-releases --jq .enabled`
prints `true`; the inputs of
[DDD §4.1](ddd.md#41-export-task-and-validation) step 1 present, with
`data/raw/FDHI_Cleaned_Measurements.csv`, which the full-data run also
needs ([DDD §4.2](ddd.md#42-publication-of-a-data-vintage) step 4);
and a clean tree at the commit `S` to be published. The commit `S` is
the head of `pin-data-v1`, a short-lived branch that the owner starts at
`origin/main` with `git fetch origin` and
`git switch -c pin-data-v1 origin/main` — never named like a data tag,
`data-v1` being the tag's name — on which step (3) commits the pointer
and which merges into `main` by a merge commit
([DDD §6.3](ddd.md#63-ci-workflows), Required checks). A
`./gradlew :subprojects:python:pytestFullData` run beforehand is a
precheck, never evidence
([DDD §7.3](ddd.md#73-pipeline-and-export-tests)). (2) Run
`./gradlew :subprojects:python:publishVintage -Pdata.tag=data-v1` — the
one run that exports, runs the full-data checks against the staged
vintage, tags, drafts, uploads, reads back, publishes, and writes the
publication record (§4.2 steps 1–10); after an interruption, the same
command resumes. It is the tooling's first run against GitHub — the
T-15 drills ran against a stub `gh` — and a failure follows §4.2:
while the release is a draft, the same command resumes; a published
release that fails its checks is deleted
(`gh release delete data-v1 --yes`, keeping the tag) and the
publication retried with the next tag number, `data-v2`, which then
stands for `data-v1` in step (3) and below (§4.2 steps 3 and 9).
(3) Make the step-11 pointer commit: with `HEAD` at
`S`,
`git add subprojects/webapp/data/pointer.json && git commit -m 'Data vintage data-v1' -- subprojects/webapp/data/pointer.json`
— the add is required because the first vintage's pointer is
untracked; check that `git rev-parse HEAD^` prints `S` and that
`git diff --name-only HEAD^ HEAD` prints only that path; the commit
then takes the normal pull-request path, and the vintage becomes
current when that pull request is merged into `main`.

**Done when** (recorded artifacts):
`gh release view data-v1 --json isDraft,isPrerelease` reports `false`
and `true`; `dist/app/data-v1.publication.json` holds `data_tag`,
`tag_commit`, `tag_object`, `pointer_sha256`, `files`,
`pytest_full_data`, `size_report`, `gh_version`, `git_version`, and
`published_at`, and the data release's body carries it;
`gh release download data-v1 --dir <empty temporary directory>` yields
exactly the pointer's files, each with the pointer's SHA-256 — the
retention check of
[DDD §4.3](ddd.md#43-retention-rollback-recovery-and-withdrawal); CI is
green on the pointer commit's pull request; and that commit is merged
into `main` — after `git fetch origin`,
`git show origin/main:subprojects/webapp/data/pointer.json` names
`data_tag` `data-v1` and the SHA-256s the release's assets carry.

### M2 — CI integration

| ID | Task | Depends on | Inputs | Effort | Executor | Status |
|---|---|---|---|---|---|---|
| T-20 | `tests.yml`: the push path filter of DDD §6.3 — the pointer manifest on its own line, `subprojects/webapp/perf/` excluded — unfiltered pull requests, and the `webapp-test` job with its **Webapp checks** step. The **Parity** step joins in T-23. | T-02 | [DDD §6.3](ddd.md#63-ci-workflows), [§2](ddd.md#2-repository-structure-naming-and-toolchain); [ADR-0011](../adr/0011-webapp-toolchain.md). | S | agent | Draftable |
| T-21 | Site staging and `.github/workflows/mkdocs.yml`: `fetchVintage`, the `scenarioAssets` sync, and `mkdocsPreview`; the include block of `scenario.md`; the `webapp-bundle` job, separate from the MkDocs job; fetch-and-verify of the vintage T-18 published; **Build preview site**; widened push filters, unfiltered pull requests, and the keyed concurrency group. | T-02, T-03, T-18 | [DDD §6.1](ddd.md#61-build-outputs-asset-paths-and-page-scaffold), [§6.3](ddd.md#63-ci-workflows); [ADR-0014](../adr/0014-committed-content-hashed-artifacts.md). | M | agent | Draftable |
| T-22 | The same `mkdocs.yml` workflow's deploy gating: `deploy` runs only after `webapp-bundle` and `build` succeed on the same commit; a failed check, bundle build, data retrieval, or site build fails the run and must not replace the working published site; a pull-request run never cancels a pending deploy. | T-21 | [DDD §6.3](ddd.md#63-ci-workflows); [HLDD §8 — Site integration](hldd.md#8-site-integration). | S | agent | Draftable |

#### T-20 — tests.yml webapp job scaffold

**Steps.** In `.github/workflows/tests.yml`, per
[DDD §6.3](ddd.md#63-ci-workflows): (1) replace the `push.paths` list
with exactly the list §6.3 prints, in its order —
`'subprojects/webapp/**'` directly followed by the negation
`'!subprojects/webapp/perf/**'`, then
`'subprojects/webapp/data/pointer.json'` on its own line although the
glob covers it, so the data-refresh trigger is named in the workflow
text, then the build-script and `CITATION.cff` entries of §6.3's filter
rule — with `push.branches` unchanged. (2) Delete the `paths` list of
the `pull_request` trigger, which then runs on every pull request (§6.3,
**Required checks**). (3) Add the job `webapp-test`:
`runs-on: ubuntu-latest`; steps `actions/checkout@v7` (the workflow's
existing pin), then one step named **Webapp checks** — the §6.3 gate
identifier — running `./gradlew :subprojects:webapp:check`, which runs
`npmCi`, `tscCheck`, and `webappTest`, the checks that need no pinned
data (the [DDD §2](ddd.md#2-repository-structure-naming-and-toolchain)
task table). No `setup-node` step and no `GH_TOKEN`: the plugin's
hermetic download of the §2 Node.js pin is the Node setup
([ADR-0011](../adr/0011-webapp-toolchain.md)). (4) The `pytest` job,
`workflow_dispatch`, and `permissions` stay unchanged; the **Parity**
step joins in T-23.

**Done when:** in `.github/workflows/tests.yml`,
`grep -cxF "      - 'subprojects/webapp/data/pointer.json'"`,
`grep -cx "      - '.subprojects/webapp/perf/\*\*'"` (the `.` standing
for the `!`), and `grep -cx '  webapp-test:'` each print 1 and
`grep -cx '  webapp:'` prints 0;
`awk '/^  pull_request:/{f=1;next} /^  [a-z_]+:/{f=0} f && /paths:/' .github/workflows/tests.yml`
prints nothing; on a pull request, `gh pr checks <number>` lists
`pytest` and `webapp-test` as successful, and
`gh run view <run-id> --log` shows **Webapp checks** running
`:subprojects:webapp:tscCheck` and `:subprojects:webapp:webappTest`; on
scratch branches whose names match `dev-v.*`, a push that changes only a
file under `subprojects/webapp/perf/` starts no Tests run
(`gh run list --workflow tests.yml --commit <sha>` prints nothing) and a
push that changes a file under `subprojects/webapp/src/` starts one.

#### T-21 — mkdocs.yml webapp build and vintage staging

**Steps.** (1) In `subprojects/mkdocs/build.gradle.kts`, add the two
staging tasks of
[DDD §6.1](ddd.md#61-build-outputs-asset-paths-and-page-scaffold)
(Staging tasks) in that file's own task style — Gradle's built-in task
types registered with `tasks.registering` in the group `documentation`,
neither an `Exec` task. `fetchVintage` is a plain task with its work in
`doLast`, its declared input `subprojects/webapp/data/pointer.json`, and
its declared output the cache `subprojects/mkdocs/build/vintage/`: for
each pointer `files` entry it skips a `build/vintage/<data_tag>/<name>`
whose SHA-256 matches and otherwise runs
`gh release download <data_tag> --repo HarvardRC/eps-ground-rupture --pattern <name> --dir build/vintage/<data_tag> --clobber`
and hashes again; a file still missing or mismatched fails the task with
a `GradleException` naming it; it writes nothing under `docs/`.
`scenarioAssets` is a `Sync` (`tasks.registering(Sync::class)`) into
`docs/assets/scenario/` with
`dependsOn(":subprojects:webapp:webappBundle", fetchVintage)` and the
declared inputs `subprojects/webapp/data/pointer.json` and the root
`CITATION.cff`: it copies `app.js` and `app.css` from
`subprojects/webapp/build/dist/`, each renamed
`app-<first 12 lowercase hex of its SHA-256>.<extension>`, and exactly
the pointer's `files` names from `build/vintage/<data_tag>/` into
`data/`, then writes its second declared output
`docs/includes/scenario-head.html` as the §6.1 generated tag block — the
two hashed names and the artifact manifest's filename (the pointer
`files` key matching `manifest-<h12>.json`) filled in,
`data-software-version` and `data-data-version` written with empty
values: the [DDD §6.2](ddd.md#62-software-and-data-version-stamps) stamp
sourcing and writing is T-50's. (2) In the same file, register
`mkdocsPreview`, an `Exec` task in the style of `mkdocsBuild` — group
`documentation`, `workingDir = projectDir`, `useVenv()`, running the
venv's `mkdocs build --strict -f mkdocs.preview.yml`, with
`dependsOn(poetryInstall, scenarioAssets)`, the inputs `docs/`,
`mkdocs.yml`, `mkdocs.preview.yml`, `hooks/site_checks.py`, and
`publication-allowlist.txt`, and the output `site-preview/` — wired into
`assemble` like `mkdocsBuild`; give `mkdocsBuild` the two inputs
`hooks/site_checks.py` and `publication-allowlist.txt`; make
`mkdocsBuild`, `mkdocsServe`, and `mkdocsPreview` depend on
`scenarioAssets`; and make `clean` delete exactly `site/`,
`site-preview/`, `docs/assets/scenario/`,
`docs/includes/scenario-head.html`, and `docs/includes/media/` besides
`build/`, never `docs/assets/` or `docs/includes/` as a whole. (3) Make
`.gitignore` hold each of the five §6.1 entries exactly once, adding
those not yet present — among them the three this task's staging
introduces: `subprojects/mkdocs/docs/assets/scenario/`,
`subprojects/mkdocs/docs/includes/scenario-head.html`, and
`subprojects/mkdocs/docs/includes/media/`. (4) Append the §6.1
`markdown="0"` include block to `subprojects/mkdocs/docs/scenario.md`,
after the `#gre-disclaimer` section — the integration check T-03 names.
(5) In `.github/workflows/mkdocs.yml`, per
[DDD §6.3](ddd.md#63-ci-workflows): replace the `push.paths` list with
exactly the list §6.3 prints, its branches still `[main]`; delete the
`paths` list of the `pull_request` trigger; replace the `concurrency`
block with §6.3's keyed group; add the job `webapp-bundle` —
`runs-on: ubuntu-latest`; steps `actions/checkout@v7`, **Webapp checks**
(`./gradlew :subprojects:webapp:check`), **Build bundle**
(`./gradlew :subprojects:webapp:webappBundle`), and
`actions/upload-artifact@v7` with name `webapp-dist` and path
`subprojects/webapp/build/dist/`; the **Parity** step joins between the
two named steps in T-23; give `build` `needs: webapp-bundle` and, after
**Install docs dependencies**, the steps **Download webapp bundle**
(`actions/download-artifact@v8`, name `webapp-dist`, into
`subprojects/webapp/build/dist/`) and **Stage scenario assets**
(`./gradlew :subprojects:mkdocs:scenarioAssets -x :subprojects:webapp:webappBundle`,
with `env: GH_TOKEN: ${{ github.token }}`); after the unchanged
**Build site**, add **Build preview site**, running
`../python/.venv/bin/mkdocs build --strict -f mkdocs.preview.yml` with
`working-directory: subprojects/mkdocs`; `upload-pages-artifact` stays
the last `build` step, with `path: subprojects/mkdocs/site`. Every pin
the workflow already carries stays as it is.

**Done when:** `./gradlew :subprojects:mkdocs:mkdocsBuild --dry-run`
lists `:subprojects:mkdocs:fetchVintage`,
`:subprojects:mkdocs:scenarioAssets`, and
`:subprojects:mkdocs:mkdocsBuild` in that order;
`./gradlew :subprojects:mkdocs:mkdocsBuild :subprojects:mkdocs:mkdocsPreview`
exits 0, after which `test ! -e subprojects/mkdocs/site/scenario` and
`test ! -e subprojects/mkdocs/site/assets/scenario` succeed,
`grep -c 'id="gre-app"' subprojects/mkdocs/site-preview/scenario/index.html`
prints 1, and `subprojects/mkdocs/site-preview/assets/scenario/` holds
exactly `data/`, one `app-<12 hex>.js`, and one `app-<12 hex>.css`,
every pointer-listed file in `data/` matching its pointer SHA-256
(`shasum -a 256`). Staging drills in `subprojects/mkdocs/`, each undone
afterwards: the stray files
`docs/assets/scenario/data/stray-000000000000.bin` and
`docs/assets/scenario/app-000000000000.js` are gone after the next
`./gradlew :subprojects:mkdocs:scenarioAssets`, which leaves the sorted
listing of `docs/assets/scenario/data/` equal to the pointer's sorted
`files` keys; an immediate rerun reports `fetchVintage` and
`scenarioAssets` UP-TO-DATE; a byte flipped in a staged data file is
restored by the next run; a changed `version` in `CITATION.cff` makes
the next `scenarioAssets` run execute instead of reporting UP-TO-DATE;
one changed hex digit of a pointer SHA-256 makes `fetchVintage` fail
naming that file; a scratch `docs/assets/other/keep.txt` survives
`./gradlew :subprojects:mkdocs:clean`, which removes
`docs/assets/scenario/` and `docs/includes/scenario-head.html`, and
`git check-ignore subprojects/mkdocs/docs/assets/other/keep.txt`
exits 1. `grep -cxF '<entry>' .gitignore` prints 1 for each of the five
§6.1 entries. In `.github/workflows/mkdocs.yml`,
`grep -cx '  webapp-bundle:'` prints 1, `grep -cx '  webapp:'` prints 0,
`grep -cx "      - '.subprojects/webapp/perf/\*\*'" .github/workflows/mkdocs.yml`
(the `.` standing for the `!`) and
`grep -cxF "      - 'CITATION.cff'" .github/workflows/mkdocs.yml`
each print 1, and
`awk '/^  pull_request:/{f=1;next} /^  [a-z_]+:/{f=0} f && /paths:/' .github/workflows/mkdocs.yml`
prints nothing; a pull-request run shows `webapp-bundle` and
`build` succeeded, **Build preview site** in the `build` log, and
`deploy` skipped (`gh run view <run-id>`).

#### T-22 — Deploy gating

**Steps.** (1) Confirm that `deploy` in `.github/workflows/mkdocs.yml`
stays exactly as committed — the three-layer main-only gating of
[DDD §6.3](ddd.md#63-ci-workflows): `branches: [main]` on `push`,
`if: github.event_name != 'pull_request'`, and the `github-pages`
environment — with `needs: build` and with `pages: write` and
`id-token: write` on `deploy` alone; and that T-21 left the chain
`webapp-bundle` → `build` → `deploy`, `upload-pages-artifact` the last
`build` step after **Stage scenario assets**, **Build site**, and
**Build preview site**, and the workflow-level `concurrency` keyed by
the §6.3 expression with `cancel-in-progress: false`, so a pull-request
run never cancels a pending `main` deploy
([HLDD §8 — Site integration](hldd.md#8-site-integration)). (2) Prove
§6.3's failure containment on one scratch pull request: (a) a TypeScript
type error in `subprojects/webapp/src/main.ts` — `webapp-bundle` fails
at **Webapp checks**, and `build` and `deploy` do not run; (b) revert,
then change one hex digit of a SHA-256 in
`subprojects/webapp/data/pointer.json` — in this run `webapp-bundle`
has no **Parity** step yet (T-23, which depends on this task, adds it),
so §6.3's no-Parity clause applies: `build` fails at
**Stage scenario assets**, before **Build site**, and the run uploads no
`github-pages` artifact; (c) revert; the run goes green. Record the
three run URLs in the completion report. The perturbed-statistic drill
of §6.3 and its corrupted-pointer drill with both **Parity** steps in
place need those steps and are T-23's.

**Done when:** in `.github/workflows/mkdocs.yml`,
`grep -c "cancel-in-progress: false"` and
`grep -c "github.event_name != 'pull_request'"` each print 1 and
`grep -cF "format('pages-pr-{0}', github.event.pull_request.number)"`
prints 1; `gh run view <run-id>` shows drill (a) failed at
**Webapp checks** of `webapp-bundle` with `build` and `deploy` not run,
and drill (b) failed at **Stage scenario assets** with **Build site**
not run; for both drills,
`gh api repos/HarvardRC/eps-ground-rupture/actions/runs/<run-id>/artifacts --jq '.artifacts[].name'`
prints no `github-pages`; the final run is green.

### M3 — Application core

| ID | Task | Depends on | Inputs | Effort | Executor | Status |
|---|---|---|---|---|---|---|
| T-30 | Loader and decoder: the `decode/` loaders over the transport contract, the manifest checks and structural validation before any read, typed-array views, the data-version check, the lazy-export loaders, the `LoadError` kinds, and the [DD-10](ddd.md#1-ddd-decision-register) (Field-naming convention at the pipeline-to-application boundary) mapping tables of `fields.ts`. | T-02, T-11 | [DDD §5.1](ddd.md#51-modules-and-interfaces), [§5.2](ddd.md#52-artifact-loading-and-decoding), [§5.10](ddd.md#510-failure-states), [§3.1](ddd.md#31-scenario-artifact-binary-layout), [§3.2](ddd.md#32-artifact-manifest), [§3.3](ddd.md#33-pointer-manifest), [§3.4](ddd.md#34-field-data-export), [§3.5](ddd.md#35-regression-export), [§3.6](ddd.md#36-reference-results), [§5.6](ddd.md#56-scenario-state-and-url-encoding), [§5.9](ddd.md#59-downloads). | L | agent | Draftable |
| T-31 | Query engine: `query` — the trial mask over `(set, sediment_strength)` pairs, exact stored bounds, binary-searched stride-101 segments, the one-state-per-trial rule (both branches), the class filter and two-count model, the empty-result diagnostic — and `storedBounds`, a pure synchronous core; the §5.3 scheduler is T-46's. Completion records a decode-and-query timing spot check against the interaction budget ([PDD §9.1 — Performance budgets (D-9, Proposed)](pdd.md#91-performance-budgets-d-9-proposed)) — a diagnostic, not acceptance evidence. | T-30, T-34, T-36 | [DDD §5.3](ddd.md#53-query-engine), [§5.5](ddd.md#55-offset-to-slip-conversion-assist), [§5.1](ddd.md#51-modules-and-interfaces), [§7.4](ddd.md#74-application-tests), [§2](ddd.md#2-repository-structure-naming-and-toolchain) (Node.js outside Gradle), [§4.1](ddd.md#41-export-task-and-validation). | L | agent | Draftable |
| T-32 | Statistics module: `validValues` and `summarize` — the [FR-O2 — Summary statistics](prd.md#fr-o2-summary-statistics) set by the operation-identical algorithms — `quantileLinear`, the [DD-5](ddd.md#1-ddd-decision-register) (Histogram bin rule) `histogram` and `histogramLog`, and the display formatters `displayRound` and `formatCount`; measurement hygiene stays the export's, never re-applied. | T-31, T-47 | [DDD §5.4](ddd.md#54-statistics), [§5.12](ddd.md#512-charts), [§5.8](ddd.md#58-view-layer), [§5.2](ddd.md#52-artifact-loading-and-decoding), [§5.13](ddd.md#513-application-configuration), [§3.6](ddd.md#36-reference-results), [§7.3](ddd.md#73-pipeline-and-export-tests), [§7.4](ddd.md#74-application-tests). | L | agent | Draftable |
| T-33 | Conversion assist: `convertWindows` back-projecting the single offset maximum per given dip into `PerDipWindows`, and `rangeFlag` in stored space. | T-30, T-31 | [DDD §5.5](ddd.md#55-offset-to-slip-conversion-assist), [§3.5](ddd.md#35-regression-export), [§5.3](ddd.md#53-query-engine). | S | agent | Draftable |
| T-34 | Scenario state: the `Scenario` (accepted values only) and `DisplayState` types, `defaultScenario`, pure reducers, and Reset; `parse.ts` — grammar G, the free-entry validation table, and `storedBoundsFromDecimal`; `scenario-json.ts` — the [DD-11](ddd.md#1-ddd-decision-register) (Canonical scenario serialization) functions; the reserved URL parameter names (the P2 codec stays parked). | T-30 | [DDD §5.6](ddd.md#56-scenario-state-and-url-encoding), [§5.7](ddd.md#57-scenario-controls), [§5.3](ddd.md#53-query-engine), [§5.10](ddd.md#510-failure-states). | L | agent | Draftable |
| T-35 | Node parity harness: fetch and checksum-verify the vintage T-18 published; the pairing and transcription checks; replay of the golden scenarios, the `boundary_cases`, and the `synthetic` cases through the real modules; exact, tolerance, and display comparisons per the parity rules ([GS-3](pdd.md#102-golden-scenarios) (Kern preset (after D-6)) after [D-6](pdd.md#1-decision-register) (Kern County field-data group and principal-width rule)). | T-30–T-34, T-36, T-47, T-13, T-18 | [DDD §7.2](ddd.md#72-calculation-parity-tests), [§7.1](ddd.md#71-numerical-tolerances), [§3.6](ddd.md#36-reference-results), [§5.3](ddd.md#53-query-engine), [§5.13](ddd.md#513-application-configuration), [§2](ddd.md#2-repository-structure-naming-and-toolchain). | L | agent | Draftable |
| T-36 | Application unit tests: the code-built fixture artifact `test/fixtures.ts` and the Node contracts of `decode/` and `state/` — malformed files, schema versions, data-version mismatch, structural validation, the DD-10 tables, state handling, free-entry validation, and canonical serialization. Node-level application contracts only; rendered behavior belongs to the browser lane. | T-30, T-34 | [DDD §7.4](ddd.md#74-application-tests), [§5.2](ddd.md#52-artifact-loading-and-decoding), [§5.6](ddd.md#56-scenario-state-and-url-encoding), [§5.7](ddd.md#57-scenario-controls), [§5.9](ddd.md#59-downloads), [§5.10](ddd.md#510-failure-states), [§3.1](ddd.md#31-scenario-artifact-binary-layout), [§3.2](ddd.md#32-artifact-manifest), [§3.3](ddd.md#33-pointer-manifest), [§3.4](ddd.md#34-field-data-export), [§3.5](ddd.md#35-regression-export), [§3.6](ddd.md#36-reference-results). | L | agent | Draftable |
| T-23 | Add the **Parity** step to the `webapp-test` job of `tests.yml` (T-20) and to the `webapp-bundle` job of `mkdocs.yml` (T-21), after T-22's drills ran without it. | T-20, T-21, T-22, T-35 | [DDD §6.3](ddd.md#63-ci-workflows), [§7.2](ddd.md#72-calculation-parity-tests), [§2](ddd.md#2-repository-structure-naming-and-toolchain). | S | agent | Draftable |
| T-37 | Early feasibility diagnostic: one representative scenario end-to-end through decode, selection, and statistics, timed against the interaction budget as soon as T-30–T-32 exist. A diagnostic, not acceptance evidence ([R-19](prd.md#94-delivery-and-technical-risks)); acceptance is T-61's measurement of the assembled application in the reference environment of DDD §7.6. | T-30, T-31, T-32 | [DDD §7.6](ddd.md#76-performance-and-compatibility-measurements), [§5.3](ddd.md#53-query-engine), [§5.4](ddd.md#54-statistics), [§2](ddd.md#2-repository-structure-naming-and-toolchain) (Node.js outside Gradle); [PDD §9.1 — Performance budgets (D-9, Proposed)](pdd.md#91-performance-budgets-d-9-proposed). | S | agent | Draftable |

#### T-23 — Wire unit tests and parity into tests.yml

**Steps.** Per [DDD §6.3](ddd.md#63-ci-workflows): (1) in
`.github/workflows/tests.yml`, add to the job `webapp-test`, after
**Webapp checks**, the step **Parity** running
`./gradlew :subprojects:webapp:webappParity`; (2) in
`.github/workflows/mkdocs.yml`, add to the job `webapp-bundle`, between
**Webapp checks** and **Build bundle**, the step **Parity** with the
same command. Neither step sets `GH_TOKEN`: the harness downloads the
pointer-identified files by plain HTTPS with no token and verifies every
checksum before replay ([DDD §7.2](ddd.md#72-calculation-parity-tests)
step 1). `webappParity` stays out of `check`, which needs no research
data and, once `npmCi` has downloaded the runtime and installed the
packages, no network (the
[DDD §2](ddd.md#2-repository-structure-naming-and-toolchain) task
table). The unit tests already run in **Webapp checks** (T-20, T-21),
so this task adds only the two **Parity** steps; job ids, triggers,
and path filters stay as T-20 and T-21 left them.

**Done when:** `./gradlew :subprojects:webapp:check --dry-run` lists
`:subprojects:webapp:tscCheck` and `:subprojects:webapp:webappTest` and
not `:subprojects:webapp:webappParity`;
`grep -c './gradlew :subprojects:webapp:webappParity'` prints 1 in each
of the two workflow files, and
`grep -c 'GH_TOKEN' .github/workflows/tests.yml` prints 0; on a pull
request, `webapp-test` and `webapp-bundle` are green with **Parity** in
their logs (`gh run view <run-id> --log`); the two §6.3 drills, each on
a scratch pull request and reverted afterwards: with the mean
`summarize` returns multiplied by `(1 + 1e-6)` in
`subprojects/webapp/src/stats/`, both jobs fail at **Parity** with a
line naming rule `tolerance`, and `build` and `deploy` do not run; with
one hex digit of a SHA-256 in `subprojects/webapp/data/pointer.json`
changed, both jobs fail at **Parity** with a line naming rule `fetch`
([DDD §7.2](ddd.md#72-calculation-parity-tests) step 1), and `build`
and `deploy` do not run; reverted, the run is green. Record the run
URLs in the completion report.

#### T-30 — Loader and decoder

**Steps.** Implement `src/decode/` per
[DDD §5.2](ddd.md#52-artifact-loading-and-decoding) and the `decode/`
row of [§5.1](ddd.md#51-modules-and-interfaces). (1)
`decodeVintage(manifestBytes, readFile, expected)`, four gated steps:
parse the manifest and check its `schema_version` against
`expected.schemaVersions` (exactly `[1]`) before reading any other
member, then map it through `MANIFEST_FIELDS` and check every `decimals`
(3 or 4 for a `scaled` or `dict` column), every `null_sentinel` (its
dtype's maximum), and `export_version` against `expected.exportVersion`;
record `performance.mark('egr:decode-start')`, read
`files.scenario_artifact` through `readFile`, and decompress with
`DecompressionStream('gzip')` only behind the gzip-magic guard (`1f 8b`;
bytes without it are used as-is); check the 16-byte header against the
manifest, the block alignment rule of
[§3.1](ddd.md#31-scenario-artifact-binary-layout), and every block
length before reading any offset; construct the typed-array views over
the one decompressed buffer, wrap them with the decoded dictionaries and
the mapped `manifest` in the `Vintage`, and record
`performance.mark('egr:decode-end')`. (2)
`loadVintage(manifestUrl, expected)`, the fetching wrapper whose
`readFile(name)` fetches `new URL(name, manifestUrl)` with the global
`fetch`; `loadRegression(url)` and `loadFieldExport(url)`, each behind
the same gzip guard, requiring `schema_version` 1 and mapping through
`REGRESSION_FIELDS` or `FIELD_EXPORT_FIELDS`; and
`parseReferences(bytes)` through `REFERENCE_FIELDS`, for the parity
harness only. (3) Every rejection is the `LoadError` of
[DDD §5.10](ddd.md#510-failure-states) (Internal failure) — `kind`
`'retrieval'`, `'read'`, `'schema-version'`, or `'data-version'`, the
last carrying `expected` and `loaded` — with a `SchemaError` of
`mapRecord` counting as `'read'`; no step yields a partial decode. (4)
`src/decode/fields.ts`, the single DD-10 mapping point: the tables
`MANIFEST_FIELDS`, `POINTER_FIELDS`, `FIELD_EXPORT_FIELDS`,
`REGRESSION_FIELDS`, `REFERENCE_FIELDS`, and `SCENARIO_INPUT_FIELDS`,
over the closed field lists of [§3.2](ddd.md#32-artifact-manifest),
[§3.3](ddd.md#33-pointer-manifest),
[§3.4](ddd.md#34-field-data-export),
[§3.5](ddd.md#35-regression-export), and §3.6 and the canonical
scenario object of
[§5.6](ddd.md#56-scenario-state-and-url-encoding), each camelCase
name `snakeToCamel` of its snake_case name;
`mapRecord(raw, spec, path)`, which throws `SchemaError(path, key)` on a
missing required key or a wrong JSON type and drops unknown keys; the
data-keyed maps of §5.2 kept verbatim, `provenance` opaque, and every
[§3.6](ddd.md#36-reference-results) `inputs` object verbatim; the unions
`ColumnName` and `BlockName`; and `TRIAL_TABLE_COLUMNS` in the §3.1
order and `RECORDS_CSV_COLUMNS` and `STATISTICS_CSV_COLUMNS` in the
[§5.9](ddd.md#59-downloads) orders. Restoring values is
`stats/`'s (T-32); the lazy loads' cache entry is T-46's, and their
failure handling T-44's and T-46's.

**Done when:** `./gradlew :subprojects:webapp:tscCheck` and
`./gradlew :subprojects:webapp:webappTest` exit 0, the
`tsconfig.node.json` half of `tscCheck` keeping `decode/` free of DOM
identifiers; each of `MANIFEST_FIELDS`, `POINTER_FIELDS`,
`FIELD_EXPORT_FIELDS`, `REGRESSION_FIELDS`, `REFERENCE_FIELDS`,
`SCENARIO_INPUT_FIELDS`, `TRIAL_TABLE_COLUMNS`, `RECORDS_CSV_COLUMNS`,
and `STATISTICS_CSV_COLUMNS` occurs in
`subprojects/webapp/src/decode/fields.ts` (`grep -c <name>` prints at
least 1). The decoder's behavior closes with T-36 (`decode.test.ts`,
`fields.test.ts`) and T-35 (the parity run decodes the published
vintage), the later checks the [Scheduling model](#scheduling-model)
allows.

#### T-31 — Query engine

**Steps.** (1) Implement `src/engine/` per
[DDD §5.3](ddd.md#53-query-engine): `query(vintage, scenario, windows?)`
returning the `Selection`, with `windows` given exactly in offset mode,
holding every dip the query masks in, and `query` throwing otherwise;
the `PerDipWindows` type of
[§5.5](ddd.md#55-offset-to-slip-conversion-assist) (one
`{ faultDip, lo, hi }` per dip, ascending), declared here and returned
by T-33's `convertWindows`; the trial mask, matching `sediment` as
`(set, sediment_strength)` pairs; slip-mode bounds from
`storedBoundsFromDecimal(min, max)` of `src/state/parse.ts` (T-34);
offset-mode bounds from the exported pure
`storedBounds(lo, hi, scale)` =
`[⌈lo / scale − 1e-9⌉, ⌊hi / scale + 1e-9⌋]`, `scale` being the
manifest's `columns.slip.scale` and a −0 result returned as 0; the
binary-searched segments, both one-state branches, the class filter, and
the two-count model of §5.3; and the empty-result diagnostic, relaxing
one group at a time in §5.3's order and keys (`fault_dip`, `sediment`,
`depth`, `density`, `window`, `scarp_class`), never the population. Pure
and synchronous: no DOM, clock, randomness, or I/O. (2)
`test/engine.test.ts`, the [DDD §7.4](ddd.md#74-application-tests) row:
identical output for identical input, the vintage's buffers unmodified,
and binary-searched segments equal to a linear scan for every window
whose endpoints are fixture slip values or midpoints between them, on a
fixture vintage built with `test/fixtures.ts` (T-36); selection
semantics are reference cases replayed by T-35, never hand-written here.
(3) The diagnostic `test/spot-timing.ts` — not a `*.test.ts` file, so
`webappTest` never runs it: given a local export directory as its one
argument, it reads the files there, decodes them with `decodeVintage`
(`expected` =
`{ exportVersion: <that manifest's export_version>, schemaVersions: [1] }`),
times the decode once, then times
`query(vintage, defaultScenario(vintage.manifest))` — the selection of
[GS-0](pdd.md#102-golden-scenarios) (Empty scenario (no active slip
window), default population) — 30 times, and prints `process.version`,
the decode time, and the median of the 30 query times (the mean of the
15th and 16th smallest) in milliseconds. Build and run it in the one
form of
[DDD §2](ddd.md#2-repository-structure-naming-and-toolchain) (Node.js
outside Gradle), never on the machine's own `node`: after
`./gradlew :subprojects:webapp:npmCi` from the repository root, a shell
in `subprojects/webapp` runs
`export PATH="$(ls -d "$PWD"/.gradle/nodejs/node-v22.12.0-*)/bin:$PATH"`,
then
`npx esbuild test/spot-timing.ts --bundle --platform=node --format=esm --target=es2020 --outfile=build/spot/spot-timing.mjs`.
Its input is `dist/app/data-v0-test/`, which
`./gradlew exportApp -Pdata.tag=data-v0-test` writes when run from the
repository root; that run also rewrites the working-tree pointer
([DDD §4.1](ddd.md#41-export-task-and-validation) step 6), so restore it
afterwards from the repository root: with
`git checkout -- subprojects/webapp/data/pointer.json` when
`git ls-files --error-unmatch subprojects/webapp/data/pointer.json`
succeeds, otherwise with `rm subprojects/webapp/data/pointer.json`
(no pointer committed yet). T-37 extends the script end to end.

**Done when:** `./gradlew :subprojects:webapp:tscCheck` and
`./gradlew :subprojects:webapp:webappTest` exit 0, with
`subprojects/webapp/build/test/engine.test.js` present; from
`subprojects/webapp`, in the DDD §2 form above (its `PATH` export),
`node build/spot/spot-timing.mjs ../../dist/app/data-v0-test` exits 0
and prints `v22.12.0`, the decode time, and the median query time, which
the completion report records — a diagnostic, never acceptance evidence;
from the repository root,
`git status --porcelain subprojects/webapp/data/pointer.json` prints
nothing.

#### T-32 — Statistics module

**Steps.** Implement `src/stats/` per [DDD §5.4](ddd.md#54-statistics),
the one specification for the client and the reference generator. (1)
`validValues(vintage, selection, measurement)`: the selected records in
artifact order, each value that is not the column's null sentinel kept
as an integer `s` in recording steps — `stored + offset_steps` for scarp
height and width, the dictionary entry for scarp dip — with its class
code, a kept class code 255 throwing (an internal failure,
[§5.10](ddd.md#510-failure-states)); `ValidValues` holds `steps`
(`Int32Array`), `classes` (`Uint8Array`), the divisor `D` (1000), and
`sorted`, the values `s / D` in a `Float64Array` sorted by the
typed-array numeric sort — the restore rule of
[§5.2](ddd.md#52-artifact-loading-and-decoding), with integer literals,
never `10 **` or `Math.pow`. (2) `summarize(values) → Stats | null`:
`min` and `max` the ends of `sorted`; `median`, `p16`, and `p84` by
`quantileLinear(sorted, p)` of `src/stats/quantile.ts`, the two-branch
NumPy `'linear'` algorithm §5.4 prints, at `p` = 50/100, 16/100, and
84/100; `mean = S / (n · D)` with `S` the exact integer sum;
`sd = sqrt(acc / (n − 1))` over an explicit ascending loop; null with no
valid value, `sd` null with one; no builtin float sum, reduction, or
`**` for a square; no value re-filtered, clamped, or excluded. (3)
`src/stats/histogram.ts`:
`histogram(steps, classes, sorted, displayDecimals) → Histogram | null`,
steps (a)–(g) of [DDD §5.12](ddd.md#512-charts) (Histogram), and
`histogramLog(steps, classes, offerRatio) → HistogramLog | null`, steps
(a)–(d) of §5.12 (Logarithmic scale) — the strict offer test
`maxpos_s > offerRatio · minpos_s`, the octave edges `100 · 2^k` by
integer doubling, assignment by integer comparison, and the six
`belowCounts`; each result is the camelCase of its
[§3.6](ddd.md#36-reference-results) record, every power of ten an
integer literal, and callers pass `logScaleOfferRatio()` of `config.ts`
(T-47) as `offerRatio`. (4) `src/views/format.ts`, per
[DDD §5.8](ddd.md#58-view-layer) (Statistics tables):
`displayRound(v, decimals)` — a non-finite `v` an internal failure; the
shortest round-trip digits of `|v|` (`String(Math.abs(v))`), rounded
half away from zero by string or integer arithmetic; no sign on a zero
result, otherwise the ASCII hyphen-minus `-` (U+002D) for `v < 0`;
exactly `decimals` fraction digits, no grouping — and `formatCount(n)`,
exact digits with comma thousands separators, never a locale API. Every
displayed value later rounds through `displayRound` at the
[D-23](pdd.md#1-decision-register) (Reader-facing display precision per
quantity) decimals. (5) Tests per
[DDD §7.4](ddd.md#74-application-tests): `test/histogram.test.ts`,
mechanics only, with `logScaleOfferRatio()` as `offerRatio`; and
`test/views-text.test.ts` with `displayRound` on the display-rounding
vectors of [DDD §7.3](ddd.md#73-pipeline-and-export-tests), identical to
the Python list — T-41 and T-42 add their cases to the same file.

**Done when:** `./gradlew :subprojects:webapp:tscCheck` and
`./gradlew :subprojects:webapp:webappTest` exit 0, with
`subprojects/webapp/build/test/histogram.test.js` and
`views-text.test.js` present — `histogram.test.ts`: the cap loop ends
with at most 60 bins, edges ascend, the counts sum to n, valid 0 gives
null; logarithmic edges double from `100 · 2^k`, every edge value from
100 to `100 · 2^20` lands in the bin it opens and the value one step
below it in the bin before (below 100, in `belowCounts`), the counts and
`belowCounts` sum to n, no positive value gives null; identical inputs
give identical output; `views-text.test.ts`: every vector of the §7.3
list, among them `-0.005` → `-0.01`, `-0.004` → `0.00`, `-0.0` → `0.00`,
and `5.0135` at 3 decimals → `5.014`. Statistics, percentiles, and bins
are checked against the references by T-35, never against a
hand-maintained expectation.

#### T-33 — Conversion assist

**Steps.** Implement `src/convert/` per
[DDD §5.5](ddd.md#55-offset-to-slip-conversion-assist): (1)
`convertWindows(offsetMax, dips, coefficients) → PerDipWindows` — offset
mode's one entry `o_max` (the Scenario's `offsetMax` through `Number()`
at the engine boundary), back-projected at both ends for each given dip
with the exported [§3.5](ddd.md#35-regression-export) coefficients,
never a hardcoded copy: `window_lo(d) = (0 − intercept_d) / slope_d` and
`window_hi(d) = (o_max − intercept_d) / slope_d`, each evaluated in
float64 exactly as written; one `{ faultDip, lo, hi }` per given dip,
ascending — the `PerDipWindows` type of T-31 — and a throw (an internal
failure) when a given dip has no coefficient row or a non-positive
`slope_d`, or when a computed end is not finite (unreachable on the
shipped coefficients under the 1000 m entry bound, §5.5); callers
convert every modeled dip ([§5.3](ddd.md#53-query-engine)). (2)
`rangeFlag(window, bounds) → RangeFlag` in stored space:
`[lo_s, hi_s]` =
`storedBounds(window.lo, window.hi, bounds.recordingStep)` (T-31) and
`max_s = Math.round(bounds.max / bounds.recordingStep)`, never floored;
`in_range` exactly when `lo_s ≥ 0` and `hi_s ≤ max_s`; `out_of_range`
exactly when `hi_s < 0` or `lo_s > max_s`; `partly_out` otherwise. Entry
validation is `src/state/parse.ts`'s (T-34); each selected dip's
`rangeFlag` in the frame that computes a result is the scheduler's
(T-46), and the assist panel's text is T-40's. No hand-written
conversion unit test exists: conversion is
pinned by the reference `synthetic.conversion` cases and the converted
windows of [GS-1](pdd.md#102-golden-scenarios) (US-1: dips {30°, 40°},
Strong (uniform and layered), offset mode 3 m), which T-35 replays.

**Done when:** `./gradlew :subprojects:webapp:tscCheck` and
`./gradlew :subprojects:webapp:webappTest` exit 0. The behavioral check
is T-35's parity run: GS-1's converted windows within the
[DD-2](ddd.md#1-ddd-decision-register) (Per-calculation numerical
tolerances) tolerance and its range flags exactly — on §5.5's drafting
figures, dip 30 at ≈[0.0102, 5.9854] m flagged `partly_out` (the
"flagged beyond the modeled range" of
[PDD §10.2 — Golden scenarios](pdd.md#102-golden-scenarios), which
§5.5 reads as `partly_out`, the only flag a window starting at
0.0102 m can carry), its records with slip up to the recorded maximum
still contributing, and dip 40 at
≈[0.0111, 4.6600] m flagged `in_range` — and the `synthetic.conversion`
cases with all three flags, the `out_of_range` row with intercept −6 m
and the finite windows of the `offset_max` `"1000"` case included.

#### T-34 — Scenario state

**Steps.** Implement `src/state/` per
[DDD §5.6](ddd.md#56-scenario-state-and-url-encoding). (1) The
`Scenario` type — the last accepted value of every scenario control of
the §5.6 table, the window the tagged union `{ mode: 'slip', min, max }`
or `{ mode: 'offset', offsetMax }` of canonical decimal strings, no
float anywhere; the `DisplayState` type — `measurement`, per panel
`view`, `readoff`, and `chartDataOpen`, per overlay panel `showAll`,
`logScale` on the `dzw` panel only, `overlay`, and `familyView` — with
§5.6's defaults; `defaultScenario(manifest)` from the decoded manifest's
dictionaries, never literals, its window inactive
([D-22](pdd.md#1-decision-register) (Default displacement-window
state)); pure reducers — a state and an action in, a new state out,
nothing mutated; Reset replacing the Scenario with the default and
setting `familyView` off in one update, the rest of the display state
unchanged; and a scarp-filter change that leaves fewer than six classes
setting `familyView` to false in the same update. (2)
`src/state/parse.ts`, the free-entry validation of
[DDD §5.7](ddd.md#57-scenario-controls): grammar G, its 16-character
limit after trimming, and its canonical form; row R1 (both slip fields
judged together and compared as exact decimals with `BigInt`: both
BLANK give the inactive window, a lone BLANK minimum reads as `0` and
a lone BLANK maximum as `String(slip_window_bounds.max)`, and the
rejections are those §5.7 lists), R2 (the offset maximum: `0` to
`1000` accepted, compared as exact decimals; INVALID text, a value
above `1000`, and BLANK at a commit rejected), R4 (the dip-range
grammar, with the same 16-character limit), and R6 (the read-off
classification); and
`storedBoundsFromDecimal(min, max)` — `lo_s = ⌈min · 10^4⌉` and
`hi_s = ⌊max · 10^4⌋` by integer arithmetic on the digit string
([§5.3](ddd.md#53-query-engine)). (3) `src/state/scenario-json.ts`,
DD-11: `serializeScenario(s, manifest)`, writing the canonical scenario
object of §5.6 with `canonicalJson(v)` (keys sorted by code point at
every depth, no whitespace); and `parseScenario(o, manifest)`, mapping
keys through `SCENARIO_INPUT_FIELDS` (T-30) and throwing
`ScenarioInputError(path)` — the typed invalid-input failure of
[DDD §5.10](ddd.md#510-failure-states) — on every violation §5.6 lists,
a `SchemaError` of `mapRecord` becoming a `ScenarioInputError` for the
same key. (4) The reserved URL parameter names of the §5.6 table as
exported constants; no module reads or writes URL state, and the value
grammar stays deferred to P2.

**Done when:** `./gradlew :subprojects:webapp:tscCheck` and
`./gradlew :subprojects:webapp:webappTest` exit 0;
`grep -rn 'URLSearchParams' subprojects/webapp/src/state` prints
nothing. The module's behavior closes with T-36 (`state.test.ts`,
`parse.test.ts`, `scenario-json.test.ts`) and T-35 (rule
`inputs-roundtrip` on every reference `inputs`).

#### T-35 — Node parity harness

**Steps.** Implement `test/parity.ts`, run by `webappParity` — the npm
script `parity` of
[DDD §2](ddd.md#2-repository-structure-naming-and-toolchain),
`node build.mjs --tests && node build/test/parity.js` — exactly per
[DDD §7.2](ddd.md#72-calculation-parity-tests); the harness never
computes an expected value. (1) Fetch and verify: read
`subprojects/webapp/data/pointer.json`; download every named file by a
plain HTTPS GET of
`https://github.com/HarvardRC/eps-ground-rupture/releases/download/<data_tag>/<name>`,
following redirects, with no token, into
`subprojects/webapp/build/parity/<data_tag>/`, reusing a file whose
SHA-256 already matches; verify every SHA-256 against the pointer; a
missing file, a final status other than 200, a transport error, or a
mismatch fails under rule `fetch`. (2) Load and pair: `decodeVintage` on
the verified bytes with `expected` =
`{ exportVersion: <the pointer's export_version>, schemaVersions: [1] }`;
`loadRegression` through a `fetch` the harness installs for its own
process, answering `file:` URLs inside the verified directory with
`new Response(<bytes>)` and rejecting every other URL; the reference
file gunzipped with `node:zlib` and parsed by `parseReferences`; then
rule `pairing` in both directions, rule `D-23 transcription`
(`displayDecimals(m)` of `config.ts` against `display_decimals[m]` for
`slip`, `scarp_height`, `dzw`, and `scarp_dip`), and rule
`PDD §4.1 transcription` (the `logScaleMinDecades` value against
`log_scale_min_decades`). (3) Golden scenarios, in file order: each
`Scenario` from `parseScenario(inputs, manifest)` under rule
`inputs-roundtrip`; the production sequence of the
[§5.3](ddd.md#53-query-engine) scheduler — `convertWindows` in offset
mode, `query`, per measurement `validValues`, `summarize`,
`quantileLinear` for q = 0 to 100, and `histogram`, for `dzw`
`histogramLog` with `logScaleOfferRatio()`, `displayRound` for every
displayed value, and in offset mode `rangeFlag` with the manifest's
`slip_window_bounds`; compared under rule `presence` first, then `exact`
(counts, the selection identities or signature, range flags, diagnosed
conditions, `histogram`, `histogram_log.dzw`), `tolerance` (statistics,
percentiles, and converted windows, by the
[§7.1](ddd.md#71-numerical-tolerances) rule), and `display` (the
reference `display` strings and
`window_lo_display`/`window_hi_display`); on GS-0 the comparison first
runs against the perturbed copy of rule `self-check`. (4) Boundary
cases: each `boundary_cases` entry's Scenario from
`parseScenario(inputs, manifest)`; for an offset-path case, its
`windows` turned into `PerDipWindows`, `storedBounds` of each entry
equal to `expected.stored_bounds`, then `query` with those windows; for
a slip-path case, `storedBoundsFromDecimal` of `inputs.slip_window`
equal to every key's `expected.stored_bounds`, then `query`; counts and
selection exactly. (5) Synthetic cases: each `synthetic.ensembles` entry
built through `test/fixtures.ts` (T-36) — the entry's `scarp_classes`
written as the fixture manifest's `scarp_classes`
([DDD §3.6](ddd.md#36-reference-results), §7.2 step 5) — and decoded
with `decodeVintage`, its `cases` replayed through `query`,
`validValues`, and `summarize`; the `statistics` and
`display_rounding` cases against
`summarize`, `quantileLinear`, and `displayRound`; each `histograms`
case against `histogram` and, when its `display_decimals` is 1,
`histogramLog`, any other case requiring a null
`expected.histogram_log`; and the `conversion` cases through
`convertWindows` and `rangeFlag` with the case's `slip_window_bounds`.
Report per §7.2: agreement prints nothing; each difference prints one
line naming the case (`GS-<n>`, or the boundary or synthetic case `id`,
a `display_rounding` case's being `round-<decimals>-<value>`, §3.6),
the quantity, both values, and the rule; the
largest |app − reference| per scenario prints as a diagnostic; one
summary line per scenario and case group follows the full pass; any
difference makes the exit status non-zero.

**Done when:** after T-18, `./gradlew :subprojects:webapp:webappParity`
exits 0 against the committed pointer, and every `id` of the reference
file's `scenarios` (GS-0 to GS-7, GS-3 absent until D-6 is decided)
appears in its summary lines; drills, each reverted afterwards — with
one hex digit of a pointer SHA-256 changed, it exits non-zero with a
line naming rule `fetch` and that file; with the `value` of
`logScaleMinDecades` in `subprojects/webapp/src/config.json` set to 3,
it exits non-zero naming rule `PDD §4.1 transcription`; with the `value`
of `displayPrecision.dzw` set to 0.01, it exits non-zero naming rule
`D-23 transcription`; with the cached reference file in
`subprojects/webapp/build/parity/<data_tag>/` replaced by a re-gzipped
copy whose `reference_version` differs, and the pointer's SHA-256 for
that file set to the copy's, it exits non-zero naming rule `pairing`.

#### T-36 — Application unit tests

**Steps.** Per [DDD §7.4](ddd.md#74-application-tests): (1)
`test/fixtures.ts` — the declarative builder of a
[§3.1](ddd.md#31-scenario-artifact-binary-layout)-conformant fixture
artifact (the 16-byte header, aligned blocks, dictionaries) with its
matching [§3.2](ddd.md#32-artifact-manifest) manifest, from a spec of
exactly the shape of the reference `synthetic.ensembles` entries of
[§3.6](ddd.md#36-reference-results), which T-35 builds through it —
for such an entry the manifest's `scarp_classes` is the entry's
`scarp_classes` field, and its `scarp_class_palette` one of the
builder's choosing (§7.4, Fixtures are built in code); each negative
case corrupts exactly one declared property; no binary fixture is
committed. (2) `test/decode.test.ts`, the §7.4 row in full, on
in-memory fixture files: structural validation before every read,
restored values bit for bit per §3.1, both branches of the gzip guard of
[§5.2](ddd.md#52-artifact-loading-and-decoding) step 2, and each failure
rejecting with its `LoadError` kind of
[§5.10](ddd.md#510-failure-states), never a partial decode — `'read'`
for a truncated buffer, a count mismatch, and a `SchemaError`;
`'schema-version'`; `'data-version'`, carrying `expected` and `loaded`;
and `'retrieval'` for a non-2xx `fetch` stub of `loadFieldExport` or
`loadRegression`. (3) `test/fields.test.ts`, the §7.4 row: the six DD-10
tables total and injective over the closed field lists of
[§3.2](ddd.md#32-artifact-manifest)–[§3.6](ddd.md#36-reference-results),
no snake_case key left outside the data-keyed maps and the verbatim
`provenance` and `inputs`, and the three column lists in their §3.1 and
[§5.9](ddd.md#59-downloads) orders. (4) `test/state.test.ts`, the §7.4
row for [§5.6](ddd.md#56-scenario-state-and-url-encoding), among its
cases `defaultScenario(manifest)` equal to the fixture manifest's
derived defaults and Reset restoring every
[§5.7](ddd.md#57-scenario-controls) control's default with family view
off while the overlay switch and `logScale` stay. (5)
`test/parse.test.ts`, the §7.4 row, among its cases the stored bounds
`0.00005` → 1, `5.01349` → 50134, and `5.0135` → 50135. (6) `test/scenario-json.test.ts`, the §7.4 row: GS-1's golden
bytes of §5.6, the round trips, the pair sets A and B serializing
differently, and `ScenarioInputError` for an unknown key and an
out-of-vocabulary value. Every test imports only browser-and-Node files,
touches no network, and holds no hand-maintained calculation expectation
(the §7.4 pipeline-first rule); rendered behavior belongs to the browser
lane (T-60).

**Done when:** `./gradlew :subprojects:webapp:webappTest` exits 0, and
`subprojects/webapp/build/test/` then holds `decode.test.js`,
`fields.test.js`, `state.test.js`, `parse.test.js`, and
`scenario-json.test.js`; `git ls-files subprojects/webapp/test` lists
`fixtures.ts`; `find subprojects/webapp/test -name '*.bin'` prints
nothing;
`grep -cE '"(jsdom|happy-dom|linkedom)"' subprojects/webapp/package.json`
prints 0.

#### T-37 — Early feasibility diagnostic

**Steps.** Extend T-31's `test/spot-timing.ts` into the end-to-end
diagnostic. Against the same local export (`dist/app/data-v0-test/`,
written by `./gradlew exportApp -Pdata.tag=data-v0-test`, the
working-tree pointer restored afterwards as in T-31), run GS-0 — the
all-default scenario, the opening state of the full-ensemble workloads
of [DDD §7.6](ddd.md#76-performance-and-compatibility-measurements)
(Workloads)
([PDD §10.2 — Golden scenarios](pdd.md#102-golden-scenarios)) — through
decode ([§5.2](ddd.md#52-artifact-loading-and-decoding)), selection
([§5.3](ddd.md#53-query-engine)), and statistics (`validValues` and
`summarize` per measurement, [§5.4](ddd.md#54-statistics)). Decode is
timed and reported separately; the repeated interval is selection plus
statistics, 30 repetitions — §7.6's count — reported as §7.6 reports a
workload: minimum, median (`quantileLinear(sorted, 0.5)`), 95th
percentile (the nearest rank, `sorted[28]` of the 30 ascending
samples, as §7.6 Repetitions and judging defines it), and maximum, the
95th percentile judged against the 200 ms interaction budget of
[PDD §9.1 — Performance budgets (D-9, Proposed)](pdd.md#91-performance-budgets-d-9-proposed)
and printed as `feasibility diagnostic: <p95> ms of 200 ms budget`. Over
budget prints a warning and still exits 0 — a diagnostic on the agent's
machine, not a gate ([R-19](prd.md#94-delivery-and-technical-risks));
acceptance is T-61's measurement of the assembled application in the
reference environment of §7.6. The script is bundled and run as T-31
runs it, in the one form of
[DDD §2](ddd.md#2-repository-structure-naming-and-toolchain) (Node.js
outside Gradle).

**Done when:** from `subprojects/webapp`, in that DDD §2 form (after
`./gradlew :subprojects:webapp:npmCi` from the repository root, the
`PATH` export of T-31), the esbuild command of T-31 rebuilds
`build/spot/spot-timing.mjs`, and
`node build/spot/spot-timing.mjs ../../dist/app/data-v0-test` exits 0,
printing `v22.12.0`, the decode time, the minimum, median, 95th
percentile, and maximum over 30 runs, and the diagnostic line; the
completion report records the printed figures; from the repository root,
`git status --porcelain subprojects/webapp/data/pointer.json` prints
nothing.

### M4 — Product surface

| ID | Task | Depends on | Inputs | Effort | Executor | Status |
|---|---|---|---|---|---|---|
| T-40 | Scenario controls: the control inventory from the manifest with its defaults, legends, and labels, the free-entry commit model and rejection mechanics, the entry-mode switch, the dip-range assist, the two-arm selection with the disabled Advanced group, Reset, the offset assist panel's `assistLines(input)` over T-41's `RenderInput`, the family toggle, and the one-line scenario summary, sticky below the breakpoint; the listeners take T-41's `Wiring`. | T-31, T-32, T-33, T-34, T-36, T-41, T-47 | [DDD §5.7](ddd.md#57-scenario-controls), [§5.5](ddd.md#55-offset-to-slip-conversion-assist), [§5.8](ddd.md#58-view-layer), [§5.1](ddd.md#51-modules-and-interfaces), [§5.3](ddd.md#53-query-engine), [§5.11](ddd.md#511-accessibility-supported-environments-and-navigation-lifecycle), [§7.4](ddd.md#74-application-tests). | L | agent | Draftable |
| T-41 | Measurement panels and charts: the `RenderInput` type, with the `Wiring` and `Scheduler` types and `announce` that every applier task uses; the [DD-4](ddd.md#1-ddd-decision-register) (Measurement-panel arrangement (tabs or stacked)) stacked panels and their contents, the [DD-5](ddd.md#1-ddd-decision-register) (Histogram bin rule) histogram with the width panel's logarithmic variant, the empirical cumulative curve with its pre-marks and percentile read-off, the reserved overlay band, the chart figure and its text generators with the scrollable chart-data tables, and per-panel resizing; configured floors and decimals from T-47. | T-32, T-33, T-34, T-47 | [DDD §5.8](ddd.md#58-view-layer), [§5.12](ddd.md#512-charts), [§5.11](ddd.md#511-accessibility-supported-environments-and-navigation-lifecycle), [§5.1](ddd.md#51-modules-and-interfaces), [§5.3](ddd.md#53-query-engine), [§7.4](ddd.md#74-application-tests). | L | agent | Draftable |
| T-42 | Statistics table with [D-23](pdd.md#1-decision-register) (Reader-facing display precision per quantity) display rounding from configuration. | T-32, T-47 | [DDD §5.8](ddd.md#58-view-layer), [§5.13](ddd.md#513-application-configuration), [§7.4](ddd.md#74-application-tests). | M | agent | Draftable |
| T-43 | Notices and caveats: one result notice per panel by the configured tiers, the empty-state explainer naming the diagnosed conditions, the plan's ordered caveats with the short disclaimer linking `#gre-disclaimer`, the prototype notice `#gre-prototype` while its copy entry exists, and the first-use glossary linker; thresholds and copy entries from T-47, range flags from T-33. | T-33, T-41, T-47 | [DDD §5.8](ddd.md#58-view-layer), [§5.5](ddd.md#55-offset-to-slip-conversion-assist), [§5.13](ddd.md#513-application-configuration), [§7.4](ddd.md#74-application-tests); [PDD §5 — Copy deck](pdd.md#5-copy-deck). | M | agent | Draftable |
| T-44 | Failure states: the capability probe and notice, the unavailable state with its reasons, and the presentations the internal and lazy-load failures enter — never one category shown as another. | T-30, T-36, T-40, T-43 | [DDD §5.10](ddd.md#510-failure-states), [§5.8](ddd.md#58-view-layer). | M | agent | Draftable |
| T-45 | Downloads: the four-member package and its byte-exact ZIP, the provenance order with block 9 from T-43's notice plan, the [DD-6](ddd.md#1-ddd-decision-register) (Download file-name scenario-slug rules) file name, the [DD-11](ddd.md#1-ddd-decision-register) (Canonical scenario serialization) `scenario.json`, and the no-mix invariant. | T-40, T-41, T-43, T-47 | [DDD §5.9](ddd.md#59-downloads), [§5.8](ddd.md#58-view-layer), [§5.1](ddd.md#51-modules-and-interfaces), [§5.3](ddd.md#53-query-engine), [§7.4](ddd.md#74-application-tests). | L | agent | Draftable |
| T-46 | Accessibility and navigation lifecycle: the §5.11 lifecycle algorithm in `main.ts` with `start(a, tag)`, the same-page fragment-link guard, and the per-mount §5.3 scheduler behind T-41's `Scheduler` type, handing every applier its `Wiring`; live announcements, focus rules, the [DD-9](ddd.md#1-ddd-decision-register) (Chart text-alternative mechanism) disclosure handling, and the 360 px floor — integrating the surfaces of T-40–T-45 and T-49. | T-40–T-45, T-49 | [DDD §5.11](ddd.md#511-accessibility-supported-environments-and-navigation-lifecycle), [§5.1](ddd.md#51-modules-and-interfaces), [§5.3](ddd.md#53-query-engine), [§5.7](ddd.md#57-scenario-controls), [§5.10](ddd.md#510-failure-states), [§5.8](ddd.md#58-view-layer), [§7.6](ddd.md#76-performance-and-compatibility-measurements). | L | agent | Draftable |
| T-47 | Application configuration: `config.json` with its ten MVP entries — the [D-11](pdd.md#1-decision-register) (Small-result warning threshold, chart floor, and empty-result diagnosis rule) thresholds, the [D-4](pdd.md#1-decision-register) (Low-slip measurement-reliability policy) trigger, the D-23 precisions, `logScaleMinDecades` — and the six typed accessors of `config.ts`; `copy.json` with the PDD §5 copy-deck entries; the PDD-agreement check `check_pdd_agreement.py` with its self-tests in the Doc links workflow. | T-02, T-03 | [DDD §5.13](ddd.md#513-application-configuration), [§5.8](ddd.md#58-view-layer), [§5.10](ddd.md#510-failure-states), [§6.3](ddd.md#63-ci-workflows). | L | agent | Draftable |
| T-49 | Field overlay: the export's rows, loaded lazily through `decode/` at the scheduler's request and read as `RenderInput`'s `field`; the pure overlay model; marks in the reserved band grouped per (`source`, `source_quantity`) with the PDD §4.4 labels and data-page links; the default sets and per-panel show-all; the scarp-dip note in its legend; the field table of the drawn rows; field measurements never entering simulation statistics; the listeners take T-41's `Wiring`. | T-30, T-41 | [DDD §5.8](ddd.md#58-view-layer), [§3.4](ddd.md#34-field-data-export), [§5.12](ddd.md#512-charts), [§5.11](ddd.md#511-accessibility-supported-environments-and-navigation-lifecycle), [§5.1](ddd.md#51-modules-and-interfaces), [§7.4](ddd.md#74-application-tests); [PDD §4.4 — Field overlay (FR-O5, D-18 Proposed)](pdd.md#44-field-overlay-fr-o5-d-18-proposed). | L | agent | Draftable |
| T-48 | Kern County worked-example preset ([FR-O6 — Kern County worked example](prd.md#fr-o6-kern-county-worked-example), P1): preset entry, walkthrough steps, [GS-3](pdd.md#102-golden-scenarios) (Kern preset (after D-6)) reproduction — ships only after [D-6](pdd.md#1-decision-register) (Kern County field-data group and principal-width rule). | T-40, T-41, T-49, T-13 | [DDD §5.8](ddd.md#58-view-layer); [PDD §4.7 — Kern County worked example (FR-O6, D-6 Open)](pdd.md#47-kern-county-worked-example-fr-o6-d-6-open). | M | agent | Blocked — D-6 (research group); DDD §5.8 amendment (preset mount point, module, §7.4 row) |

#### T-40 — Scenario controls

**Steps.** Per [DDD §5.7](ddd.md#57-scenario-controls): (1)
`src/views/scenario-controls.ts` — `controlModel(manifest, state)`:
every option list, bound, and default read from the decoded
[§3.2](ddd.md#32-artifact-manifest) fields in manifest order, never
hardcoded — the sediment pairs in `arm_strength_states` order, uniform
arm first — the labels through the display-label map (data
`Alternating Strong-Weak` → "Alternating Strong–Weak"), and the disabled
flags (the family toggle enabled only while all six types are selected);
and `dipRangeEcho(entry, dips)`, the R4 grammar and statuses. (2)
`src/views/summary.ts` — `summaryText(state, counts)`,
`settingsText(state)`, and `populationText(state)`: the §5.7 token table
in the PDD §3 order, joined with ` · `, the first character upper-cased,
the lossless sediment token, the empty-group tokens, the offset-mode
token `offset 0–{X} m (converted to slip per dip)`, and the count
through `formatCount` (T-32). (3) `src/views/dom/controls.ts` — builds
`#gre-controls` once from native elements only: every control of the
§5.7 inventory with the ids, labels, legends, and attributes §5.7 and
the region model of [§5.8](ddd.md#58-view-layer) give it — among them
the entry-mode radios under the legend "Enter displacement as"; the
offset fieldset under the legend "Anticipated vertical surface offset
(m)", its input labeled "Maximum (m)", the slip maximum's label entry;
the population radios under the legend "Population" and, beside them,
the explainer `<details>` whose `<summary>` reads "What do the two
populations mean?" and whose PDD §5.3 text renders each `**…**` span
as `<strong>` (§5.8, Copy registry); `<p id="gre-slip-range">`
directly after the slip legend, holding the PDD §3.4 entry
"approximately 0–5 m", both slip inputs naming `gre-slip-range` and
then `gre-slip-help` in `aria-describedby`; `#gre-dip-echo` (named by
the dip-range field's `aria-describedby`, not a live region),
`#gre-slip-help`, `#gre-slip-error`, `#gre-offset-error`,
`#gre-assist-body`, and `#gre-family-note`; the R1 and R2 fields as
`<input type="text" inputmode="decimal" autocomplete="off">` with no
`min`, `max`, or `step`; and the collapsed "Advanced" `<details>`
holding a `disabled` `<fieldset>` with no inputs. It implements the §5.7
event map once: at most one reducer call of `state/` (T-34) per checkbox
or radio `change`, Apply or Reset `click`, or slip or offset commit —
the field's `change` or an Enter `keydown`, both through the idempotent
`commitField(id)` — with
`performance.mark('egr:change-accepted', { startTime: event.timeStamp, detail: { seq } })`
recorded immediately after the call, `seq` the sequence number
`update(next)` returns; the family toggle's `change`
display-only; the dip-range field's `input` refreshing only the echo and
its Enter activating an enabled Apply; no other `input` event doing
anything. With it come the R1 and R2 rejection mechanics; the R3 mode
switch, which judges the chosen mode's retained texts through R1 or R2
directly, never through `commitField`'s last-committed records, then
sets those records to the texts it judged — a never-committed BLANK
offset field is not judged and keeps its record none — and, when R1
rejects at a switch, marks every non-BLANK slip field; Apply setting
`checked` on the dip checkboxes alone; and Reset as §5.7 (Reset)
describes it, ending in `sync(scenario)`, which skips the focused
element's `value` and never writes a `<details>` `open`. Its listeners
take the `Wiring` of [DDD §5.1](ddd.md#51-modules-and-interfaces)
(Wiring) that T-41 declares in `src/views/dom/wiring.ts`: every
`addEventListener` call gives `{ signal: wiring.signal }`; each
reducer call starts from `wiring.scheduler.current()` and hands its
result to `wiring.scheduler.update(next)`
([§5.3](ddd.md#53-query-engine), Scheduling); the entry-mode radio's
selection of offset mode calls `wiring.scheduler.prefetchRegression()`;
and each rejection line is announced once with
`announce(wiring.status, line)` of T-41's `src/a11y/announce.ts`
([§5.11](ddd.md#511-accessibility-supported-environments-and-navigation-lifecycle)).
(4) `src/views/assist.ts` — the pure `assistLines(input)` of
[DDD §5.5](ddd.md#55-offset-to-slip-conversion-assist) (Use), computed
from the `RenderInput` (T-41) alone — its Scenario snapshot and its
`windows`, `flags`, and `regression` members — as a
`readonly string[]`, null in slip mode: the first text of PDD §5.6 with
`{X}` the canonical `offsetMax`, then for each selected dip, ascending,
the fixed-here window line and provenance line — `{Dip}` the dip,
`{lo}` and `{hi}` the dip's `windows` ends by `displayRound(v, 2)`, `{flag}` the PDD §3.5
term for its `flags` entry (T-33's `RangeFlag`), `{form}` and
`{back_projection}` the `regression`'s `relationship` strings verbatim,
and `{slope}` and `{intercept}` the dip's coefficients by
`displayRound(v, 6)`; T-46's render pass commits each string as one
`<p>` of `#gre-assist-body`. (5) `copy.json` gains, verbatim from their
cited sections, the entries these controls render: the control, option,
and arm labels — the population legend "Population" among them — and
the family-view note of PDD §3.2–§3.7 with the PDD §5.11 control labels;
the PDD §3.4 descriptive label "approximately 0–5 m"; the PDD §3.5
range-flag terms; and the fixed-here entries of §5.5 (the window and
provenance lines) and §5.7 (the dip-range label, echo, and Apply; the
slip-field labels — the offset field reuses "Maximum (m)" — the helper
line, and the rejection line; the entry-mode legend; the population
explainer's summary; the dip and depth option formats; the arm helper
text; the summary tokens and joiners). (6) `src/app.css` sets the one 768 CSS px
breakpoint between the input rail and the stacked layout and, below it,
the sticky summary of §5.7 (Layout and scenario summary): `#gre-summary`
with `position: sticky`, `top: 2.4rem`, `z-index: 1`, and
`background: var(--md-default-bg-color)`, and every element inside
`#gre-root` with
`scroll-margin-top: calc(2.4rem + var(--gre-summary-block, 0px))`; the
`ResizeObserver` that writes `--gre-summary-block` is the mount's
(T-46). (7) Tests per [DDD §7.4](ddd.md#74-application-tests):
`test/scenario-controls.test.ts` and `test/summary.test.ts`. The
`Scheduler` behind the `Wiring`, the hand-over of the `Wiring`, and the
render pass, the summary's text in `#gre-summary` included, are T-46's.

**Done when:** `./gradlew :subprojects:webapp:tscCheck` and
`./gradlew :subprojects:webapp:webappTest` exit 0, with
`subprojects/webapp/build/test/scenario-controls.test.js` and
`summary.test.js` present — `scenario-controls.test.ts`: every option
list equal to its dictionary in the T-36 fixture manifest, the sediment
pairs in `arm_strength_states` order, the defaults, the disabled flags,
the display-label map, and `dipRangeEcho`'s included dips;
`summary.test.ts`: the PDD tokens verbatim, the pair set A →
`Weak (layered) or Strong (uniform)` and B →
`Weak (uniform) or Strong (layered)`, 512 distinct tokens over all 512
sediment subsets, every empty-group token, and the offset-mode token;
`test -f subprojects/webapp/src/views/assist.ts` succeeds; in
`subprojects/webapp/src/views/copy.json`,
`grep -cF 'Enter displacement as'`,
`grep -cF 'What do the two populations mean?'`, and
`grep -cF 'approximately 0–5 m'` each print 1;
`grep -c 'position: sticky' subprojects/webapp/src/app.css` prints at
least 1; `python3 .github/scripts/check_pdd_agreement.py` exits 0 with
the new entries; the rendered controls, the descriptive label and the
helper line, the explainer's `<strong>` emphasis, the rejections — an
R1 rejection at the mode switch included — the mode switch, the echo
before Apply, Reset, the disabled Advanced group, and the sticky summary
are covered by `render.spec.ts`, `interactions.spec.ts`,
`failure-states.spec.ts`, and `keyboard-responsive.spec.ts` (T-60).

#### T-41 — Measurement panels and charts

**Steps.** Per [DDD §5.8](ddd.md#58-view-layer) (Region model;
Measurement panels), [§5.12](ddd.md#512-charts), and the markup of
[§5.11](ddd.md#511-accessibility-supported-environments-and-navigation-lifecycle)
(Chart text alternatives): (1) `src/views/render-input.ts`, pure — the
immutable `RenderInput` type of §5.8: the engine result with its
statistics and histograms, the accepted Scenario snapshot with its
sequence number, and the `Vintage`, plus the four members §5.8 names —
`windows`, the `PerDipWindows` (T-31) of every modeled dip; `flags`, one
`{ faultDip, rangeFlag }` per selected dip, ascending, with T-33's
`RangeFlag`; `regression`, the loaded `Regression` (T-30) — each null in
slip mode — and `field`, the loaded `FieldRow[]` (T-30) while the
field export's state ([§5.3](ddd.md#53-query-engine) item 3) is
`ready`, `'failed'` while it is `failed`, and null otherwise. (2) The
browser-only pieces every applier task uses:
`src/views/dom/wiring.ts`, declaring the `Wiring` record
`{ signal, scheduler, status }` of
[§5.1](ddd.md#51-modules-and-interfaces) (Wiring) — `signal` an
`AbortSignal`, `scheduler` a `Scheduler`, `status` the `role="status"`
region element — and the `Scheduler` type with exactly the five
operations of [§5.3](ddd.md#53-query-engine) (Scheduling):
`current()`, returning the held `{ scenario, display }`;
`update(next)`, taking the next `{ scenario, display }` and returning
the sequence number it stamped, or null for a display-only update;
`prefetchRegression()`; `rerenderChart(measurement)`; and
`lastRenderInput()`, returning a `RenderInput` or null; and
`src/a11y/announce.ts` —
`announce(region, text, live?)`, which empties the region and writes
the text in a later task (`setTimeout(…, 0)`) — given `live`, only if
`live()` is then true — per §5.11 (Live announcements).
T-46 implements the `Scheduler`, creates the regions, and hands each
applier its `Wiring`. (3) `src/views/svg.ts` — the `SvgNode` type and
`serializeSvg` exactly as §5.12 fixes them: attributes in array order,
no self-closing form and no whitespace between nodes, `&`, `<`, `>`,
and `"` escaped in values and `&`, `<`, and `>` in text — and
`src/views/dom/svg.ts` (`toSvgElement`, through `createElementNS`,
attributes in array order, each string child a text node). (4)
`src/views/charts.ts` — `histogramSvg(spec, width)` and
`ecdfSvg(spec, width)`, each returning an `SvgNode` whose root carries
`role="img"`, `aria-label` from `chartLabel`,
`aria-describedby="{pid}-cap"`, and `aria-details="{pid}-data"`, drawn
per §5.12: its geometry, with the 12 px overlay band reserved in every
chart; the 1–2–5 ticks labeled by `displayRound`; the axis titles;
stacked per-class segments without stroke at the fill opacity of §5.8,
each carrying its `segmentTitle` `<title>`; the
[D-13](pdd.md#1-decision-register) (Scarp-family view availability and
label) family fold; the logarithmic rendering of §5.12 (Logarithmic
scale) while `logScale` is on; and the step polyline of the pure
`ecdfSteps(sorted)` in the same file (§5.12, Empirical cumulative curve:
one rise per distinct value, at most 512 points, constant data centered
on one display step) with the "Median" and "84th percentile" pre-marks
and the read-off marker at (`quantileLinear(sorted, q / 100)`, q / 100)
from the full array, which need not lie on a step. The bins are T-32's
`histogram` and `histogramLog` results: charts only draw. (5)
`src/views/chart-text.ts` — `chartLabel(state)`,
`binTableSpec(binsByGroup, groups, edges)`,
`fieldTableSpec(rows, order)`, and `segmentTitle`, per the §5.11
templates — and `chartSummary(stats, measurement, cfg)` in
`src/views/summary.ts`, the caption sentence. (6)
`src/views/dom/panels.ts` — the three DD-4 panel `<section>`s in
`#gre-panels`, ids `gre-scarp_height`, `gre-dzw`, and `gre-scarp_dip`,
each holding the eight §5.8 panel contents in order, with the element
ids §5.8, §5.11, and §5.12 fix: the view switch, a radio pair
"Histogram" / "Cumulative" in a `<fieldset>` under the legend "Chart
view"; on the width panel the "Logarithmic scale" checkbox
`#gre-dzw-log`, shown exactly while the histogram view renders a chart
and the result's `dzw` `histogramLog` is non-null, its `checked`
mirroring `logScale`; in `.gre-chart`, the `<figure>` with the chart and
`<figcaption id="{pid}-cap">`, then `<details id="{pid}-data">`, whose
`<summary>`, carrying `data-focus-key="chart-data:{measurement}"`, reads
"Chart data" and which, while open, holds the bin table — each
chart-data `<table id="{tid}">` with its `<caption id="{tid}-cap">`
inside its own scroll wrapper
`<div class="gre-table-scroll" role="region" tabindex="0" aria-labelledby="{tid}-cap" data-focus-key="{tid}">`,
`{tid}` being `{pid}-bins` from `binTableSpec` here and `{pid}-field`
for T-49's field table — below the chart floor only the notice standing
in for the chart, at chart height; the read-off
`<input type="number" id="{pid}-pct">` with `<output id="{pid}-pct-out">`,
shown only in the cumulative view of a rendered chart, its commit
classified by row R6 of [§5.7](ddd.md#57-scenario-controls) (T-34) and
drawing the `quantileLinear(sorted, q / 100)` marker; `.gre-info` with
the bin-rule sentence, followed on the width panel by the
logarithmic-scale sentence while the checkbox is shown; `.gre-table` for
T-42; and the reserved fourth slot ([D-20](pdd.md#1-decision-register)
(Us − Ud as a fourth displayed measurement)) as a fixed comment at the
measurement-order array. (7) One `ResizeObserver` per panel, whose
callback calls `wiring.scheduler.rerenderChart(measurement)` — the
re-render of that panel's `.gre-chart` slot alone (§5.12, Resizing).
The panels' listeners — the view-switch radios, the log-scale
checkbox, the read-off's commit on `change` and Enter `keydown`, and the
section's capture-phase `toggle` of §5.11 (Disclosure state) — pass
`{ signal: wiring.signal }` and hand each display-state change to
`wiring.scheduler.update(next)`, built from
`wiring.scheduler.current()`; a committed read-off's output is
announced with `announce(wiring.status, text)`; and each panel's
`ResizeObserver` disconnects on `wiring.signal`'s `abort` event. (8)
`copy.json` gains, verbatim, the fixed-here entries of §5.12 (the axis
titles, pre-mark labels, read-off strings, segment title, "below 0.1 m",
and both info-note sentences), of §5.11 (the chart label, caption, and
chart-data table templates), and of §5.8 (the N line, the view-switch
labels and legend, the log-scale toggle label, and the chart-data
label), with the PDD §5.11 panel labels. (9) Tests per
[DDD §7.4](ddd.md#74-application-tests): `test/charts.test.ts`,
`test/chart-text.test.ts`, and the `chartSummary` cases of
`test/views-text.test.ts`. The disclosure's `open` state applied on
every render pass and focus returning through its key are T-46's; the
field table is T-49's.

**Done when:** `./gradlew :subprojects:webapp:tscCheck` and
`./gradlew :subprojects:webapp:webappTest` exit 0, with
`subprojects/webapp/build/test/charts.test.js` and `chart-text.test.js`
present — `charts.test.ts`: two independently built specs serialize
identically through `serializeSvg` on a linear and on a logarithmic
value axis, tick labels equal `displayRound` at the D-23 decimals, each
segment's `<title>` equals `segmentTitle`, `ecdfSteps` gives tied values
one point and keeps 511, 512, and 512 points at 511, 512, and 513
distinct values (k = 256 dropped at 513), the constant-data rise
standing at the plot's horizontal center, and no table, list, or text
alternative sits inside the `<svg>`; `chart-text.test.ts`: the canonical
header order, the six-to-three family fold keeping row totals, group
cells summing to each Total, the field-row order, one distinct
`chartLabel` per combination of chart kind and field ticks and, for the
histogram, family view and log scale, and a `below 0.1 m` first row
exactly when the below counts are not all zero; in
`subprojects/webapp/src/views/render-input.ts`, `grep -cw` of each of
`windows`, `flags`, `regression`, and `field` prints at least 1;
`test -f subprojects/webapp/src/views/dom/wiring.ts` and
`test -f subprojects/webapp/src/a11y/announce.ts` succeed, and in
`wiring.ts` `grep -cw` of each of `current`, `update`,
`prefetchRegression`, `rerenderChart`, and `lastRenderInput` prints
at least 1;
`grep -c 'gre-table-scroll' subprojects/webapp/src/views/dom/panels.ts`
prints at least 1;
`grep -cF 'Chart view' subprojects/webapp/src/views/copy.json` prints 1;
`python3 .github/scripts/check_pdd_agreement.py` exits 0; rendered
panels, the log-scale drive, the resize drive, chart suppression, the
chart alternatives, and the chart-data tables scrolling inside their
wrappers at 360 px are covered by `render.spec.ts`,
`interactions.spec.ts`, `golden-scenario.spec.ts`, `a11y.spec.ts`, and
`keyboard-responsive.spec.ts` (T-60).

#### T-42 — Statistics table

**Steps.** Per [DDD §5.8](ddd.md#58-view-layer) (Statistics tables): (1)
`src/views/stats-table.ts` — `statsRows(stats, measurement, cfg)`: rows
in the
[PDD §4.2 — Statistics table (FR-O2)](pdd.md#42-statistics-table-fr-o2)
order, labeled "Valid count", "Excluded null count", "Median", "16th
percentile", "84th percentile", "Minimum", "Maximum", "Mean", and
"Standard deviation"; values by `displayRound(v, displayDecimals(m))`
(T-32, T-47) at render time only, counts by `formatCount`, and a null
statistic as `—` (U+2014); the engine's float64 values never mutated.
(2) `src/views/dom/table.ts` — the one real `<table>` in `.gre-table`,
built from those rows, its `<caption>` the entry of
[PDD §5.5 — Statistics framing (CR-5)](pdd.md#55-statistics-framing-cr-5),
and, while the matching population holds unclassified records, the
`<tfoot>` line of
[PDD §4.3 — Unclassified records (D-12, Proposed)](pdd.md#43-unclassified-records-d-12-proposed)
with X the `formatCount` of the matched class-code-255 count; population
semantics stay the engine's. (3) `copy.json` gains the row labels and
the null mark (§5.8 fixed-here entries) and the PDD §4.3 line. (4) The
`statsRows` cases of `test/views-text.test.ts`
([DDD §7.4](ddd.md#74-application-tests)).

**Done when:** `./gradlew :subprojects:webapp:tscCheck` and
`./gradlew :subprojects:webapp:webappTest` exit 0, `views-text.test.ts`
covering `statsRows` — rows in the PDD §4.2 order, values by
`displayRound` at the D-23 decimals (−0.005 at two decimals rendering
`-0.01` with the ASCII hyphen-minus, −0.004 rendering `0.00`), counts by
`formatCount` (1234567 → `1,234,567`), and the unclassified line exactly
when unclassified records match;
`python3 .github/scripts/check_pdd_agreement.py` exits 0; the parity of
the displayed strings is T-35's (rule `display`), and the rendered table
is covered by `golden-scenario.spec.ts` (T-60).

#### T-43 — Notices and caveats

**Steps.** Per [DDD §5.8](ddd.md#58-view-layer) (Result notices;
Caveats; Copy registry): (1) `src/views/notices.ts` —
`selectNotices(input, cfg)` over the `RenderInput` (T-41), returning
the `NoticePlan`: zero matching records give the results-level
`'empty'`; otherwise each panel gets, by valid N, the
no-valid-measurement notice (0), the suppression notice (1–9), the
warning (10–29), or none (30 and above), with `smallResultWarnBelow()`
and `chartFloorBelow()` of `config.ts` (T-47; D-11); and `caveats`, each
a registry key with its slot values, in this order: the PDD §5.4
scarp-dip notice, in every plan while [D-5](pdd.md#1-decision-register)
(Scarp-dip correction status at release) stands; the low-slip caveat,
when the stored lower bound `lo_s` of the direct window
(`storedBoundsFromDecimal`, T-34) or of any selected dip's converted
window in `windows` (`storedBounds`, T-31) is below
`lowSlipThresholdStored()` of `config.ts` (D-4), never for the inactive
window; then the per-dip line of
[PDD §5.6 — Conversion assist (FR-S5, D-3)](pdd.md#56-conversion-assist-fr-s5-d-3)
for each selected dip whose `flags` entry is `partly_out`, by ascending
dip, its `{Dip}` the dip in degrees and its `{Y}` that dip's
`window_hi(d)` — the `hi` of its `windows` entry — by
`displayRound(v, 2)`, as
[§5.5](ddd.md#55-offset-to-slip-conversion-assist) writes the window
line's `{hi}` (§5.8, Caveats). (2) `src/views/dom/notices.ts` places
them: the warning in `.gre-notice`; the suppression and
no-valid-measurement notices standing in for the chart in `.gre-chart`;
for zero matches, `hidden` on `#gre-panels` and the explainer of
[PDD §5.8 — Small and empty results (FR-O3, D-11)](pdd.md#58-small-and-empty-results-fr-o3-d-11)
in `#gre-state` — its second part only when the diagnosed set is
non-empty, `{condition(s)}` the engine's `diagnosedConditions` named and
joined as §5.8 fixes — with the summary and its count left visible; and
`#gre-caveats`: the short disclaimer first, in every state that commits
the skeleton, its `[Full disclaimer →]` as
`<a href="#gre-disclaimer" data-focus-key="disclaimer-full">`, then the
plan's `caveats` other than the scarp-dip notice, which stands at the
scarp-dip panel head (T-41) — the low-slip caveat, then the coverage
lines by ascending dip — their slots filled as step (1) fixes them.
At mount, while `copy.json` holds the fixed-here entry
`ddd5.8.prototypeNotice`, `src/views/dom/notices.ts` also builds the
prototype notice: a `<p id="gre-prototype">` holding that entry's
text, which T-46 places first in the results header and no render
replaces (§5.8, Region model); once T-55's activation commit deletes
the entry, no such element is built.
Clicks on the disclaimer link are taken by T-46's same-page link guard
([§5.11](ddd.md#511-accessibility-supported-environments-and-navigation-lifecycle)).
(3) `src/views/dom/glossary.ts` — `linkGlossary`, the first-use
glossary linker of §5.8: the PDD §5.11 anchor map as registry entries;
the first DOM-order occurrence of each mapped term, case-insensitive
and whole-word, linked to `../glossary/#{anchor}` with
`data-focus-key="glossary:{anchor}"`; the skeleton linked once at mount,
then only terms whose first occurrence lies in a replaced slot; nothing
inside a `<label>`, `<summary>`, `<button>`, or `<svg>`. (4) `copy.json`
gains the condition names and their joiner and the prototype notice
`ddd5.8.prototypeNotice`, "Prototype — shared for the research team's
review; not yet released." (§5.8 fixed-here entries), and the PDD
§5.11 glossary entries; no entry holds PDD §5.1 text. (5)
`test/notices.test.ts` ([DDD §7.4](ddd.md#74-application-tests)).

**Done when:** `./gradlew :subprojects:webapp:tscCheck` and
`./gradlew :subprojects:webapp:webappTest` exit 0, with
`subprojects/webapp/build/test/notices.test.js` present —
`selectNotices` at N = 0, 9, 10, 29, and 30 and at zero matching
records, exactly one result notice per panel, the caveats coexisting,
the explainer's second part exactly when the diagnosed set is non-empty,
and, on injected `RenderInput`s, the plan's `caveats` in their order:
the scarp-dip notice first; the low-slip caveat for a direct window
whose `lo_s` is `t_s − 1`, not for one at `t_s`, for a converted window
of `windows` below `t_s`, and never for the inactive window; and a
per-dip line, its `{Y}` from `windows`, for exactly the `partly_out`
entries of `flags` — the thresholds, `t_s` included, read from
`config.ts`; `test -f subprojects/webapp/src/views/dom/glossary.ts`
succeeds; `python3 .github/scripts/check_pdd_agreement.py` exits 0,
`grep -c 'text pending, D-10' subprojects/webapp/src/views/copy.json`
prints 0, and
`grep -c 'ddd5.8.prototypeNotice' subprojects/webapp/src/views/copy.json`
prints 1; the rendered tiers pinned to golden scenarios, the 30°
per-dip line's `{Y}`, the short disclaimer in every state that commits
the skeleton, the prototype notice, and the glossary link targets are
covered by
`interactions.spec.ts`, `golden-scenario.spec.ts`,
`failure-states.spec.ts`, and `render.spec.ts` (T-60).

#### T-44 — Failure states

**Steps.** Per [DDD §5.10](ddd.md#510-failure-states): (1)
`missingCapabilities()` in `src/main.ts` — the capability probe in
§5.10's order: `typeof` gives `'function'` for each listed API,
`new DecompressionStream('gzip')` returns without throwing (reported as
`DecompressionStream`), and `'download' in HTMLAnchorElement.prototype`
holds (reported as `HTMLAnchorElement.download`); a throwing test fails;
never the user-agent string; `MessageChannel`, the User Timing Level 3
options object, and the `signal` option are not probed. (2) In
`src/views/dom/notices.ts`: `showCapabilityNotice(root, missing)`,
inserting as the first child of `#gre-root` a `<p role="alert">` with
the fixed-here capability notice, `{apis}` the failing names in test
order joined with `, `, while the fallback stands — no skeleton is
built and no live region exists; and the unavailable state — `hidden`
on `#gre-panels`; in `#gre-state` the fixed-here notice
"Results are unavailable: {reason}. Reload the page to try again.",
`{reason}` the row of the §5.10 table for the failure (each `LoadError`
kind of T-30, the `'data-version'` row naming `{expected}` and
`{loaded}`; a missing or empty `data-*` attribute of `#gre-app`; the
regression-export request of an accepted offset-mode Scenario; any
other throw or routed `window` error); `#gre-summary` emptied;
`#gre-caveats` keeping only the short disclaimer; `disabled` on every
control in `#gre-controls`, the overlay switch `#gre-overlay`, and
the download button `#gre-download`; before
the first commit, the same skeleton — the region model of
[§5.8](ddd.md#58-view-layer), `#gre-summary` first — committed through
`#gre-root.replaceChildren(…)` with `#gre-controls` and `#gre-panels`
empty and `hidden`, reading nothing from the vintage; and the error
object written with `console.error`. The state is terminal for the
mount and never phrased as "no matching records". (3) `copy.json` gains the §5.10 fixed-here entries: the
capability notice, and the unavailable notice with its reasons. The
startup sequence's `try`/`catch`, the two `window` listeners of Error
routing, the scheduler's guarded step, the lazy-load failure routing,
the alert announcement, and the focus move to `#gre-state` are wired
by T-46 into `start(a, tag)`; the missing- or empty-attribute branch
that selects that reason is T-50's; input rejection stays the
§5.7 table's (T-34, T-40), and the no-data states stay §5.8's (T-43).

**Done when:** `./gradlew :subprojects:webapp:tscCheck` and
`./gradlew :subprojects:webapp:webappTest` exit 0, the `LoadError` kinds
pinned by `decode.test.ts` (T-36);
`grep -c 'userAgent' subprojects/webapp/src/main.ts` prints 0;
`python3 .github/scripts/check_pdd_agreement.py` exits 0; the four
presentations, pairwise distinct, the capability notice with the
fallback and `#gre-disclaimer` standing and no skeleton, and the
lazy-load failures are covered by `failure-states.spec.ts` (T-60).

#### T-45 — Downloads

**Steps.** Per [DDD §5.9](ddd.md#59-downloads): (1)
`src/download/package.ts` — `buildPackage(input, stamps, generatedAt)`,
returning `{ fileName, bytes }`, a pure function of the `RenderInput`
(T-41) — its engine result, Scenario snapshot, and `Vintage` and, in
offset mode, its `windows`, `flags`, and `regression`, never its `field`
rows — the page's version stamps, the one instant, and the
[§5.13](ddd.md#513-application-configuration) configuration: the
members `records.csv`, `statistics.csv`, `provenance.txt`, and
`scenario.json`, in that order, each UTF-8 without a byte-order mark
through `TextEncoder`; an empty match gives a `records.csv` holding the
header row only. (2) `src/download/csv.ts` — `records.csv` under
`RECORDS_CSV_COLUMNS` (T-30) and `statistics.csv` under
`STATISTICS_CSV_COLUMNS`, with the rows, value formats, null rules, line
ends, and quoting of the two §5.9 subsections: recorded values from
their integers by integer arithmetic, never through a float; the display
columns by `displayRound` exactly as rendered; the `*_full` columns by
`Number.prototype.toString`. (3) `provenance.txt` — the nine blocks in
the order of
[PDD §6.1 — Download package (FR-D1)](pdd.md#61-download-package-fr-d1),
with the §5.9 labels and contents, block 5 being `settingsText` and
block 6 `populationText` (T-40), block 8 the `generatedAt` instant, and
block 9 one line per entry of the `caveats` that
`selectNotices(input, cfg)` (T-43) returns for the package's
`RenderInput`, never re-derived in `download/` — each the registry text
with its slots filled as the page fills them and its `**` markers
dropped, a plain-text use ([§5.8](ddd.md#58-view-layer), Copy
registry) — or the line `none` for an empty list. (4) `scenario.json` —
`canonicalJson` (T-34) of
`{schema_version: 1, software_version, export_version, scenario, converted_windows}`
plus one LF, with `scenario` =
`JSON.parse(serializeScenario(snapshot, manifest))` and
`converted_windows` null in slip mode and, in offset mode, one
`{fault_dip, window_lo, window_hi, range_flag}` per selected dip in
ascending order — that dip's `lo` and `hi` in `windows` and its
`rangeFlag` in `flags`, the floats written by
`Number.prototype.toString`. (5) `src/download/zip.ts` —
`zip(members, modified)`, writing exactly the stored-method byte format
of §5.9 — each central-directory header carrying the name length and,
after the member's local-header offset, the name — with 4 entries in
the end-of-central-directory record and `RangeError` at the zip64
limits. (6) `src/download/file-name.ts` — the DD-6 slug and the
[PDD §6.2 — File naming](pdd.md#62-file-naming) template as §5.9 (File
naming) fixes them: the key order `dip`, `sediment`, `depth`, `density`,
`window`, `offset`, `classes`; `none` for an empty group and `all` for
the default scenario; `.` encoded as `p` before the sanitizer;
truncation above 80 characters with the FNV-1a-64 suffix; `.zip`
appended. (7) `src/download/deliver.ts` — the handler of the "Download
this result" button, the `<button type="button" id="gre-download">` of
the §5.8 results header, which this task builds: it reads the clock
once, takes the `RenderInput` of the last committed frame from
`wiring.scheduler.lastRenderInput()`
([§5.3](ddd.md#53-query-engine); §5.8), calls `buildPackage`, and
delivers a `Blob` of type `application/zip` through
an `<a download>` appended to `#gre-root`, clicked, and removed in the
same task, revoking the previous object URL. Its click listener is
added with `{ signal: wiring.signal }` of the `Wiring` it receives
([§5.1](ddd.md#51-modules-and-interfaces), Wiring; T-41's
`src/views/dom/wiring.ts`), and it revokes the last object URL on
`wiring.signal`'s `abort` event
([§5.10](ddd.md#510-failure-states), rules binding `start`). (8)
`copy.json` gains the §5.9 fixed-here entries (the provenance labels,
the citation and DOI texts, and the empty-caveat line) and the PDD §6.1
button label. (9) Tests per [DDD §7.4](ddd.md#74-application-tests):
`test/downloads.test.ts`, the §7.4 row in full; `test/file-name.test.ts`
(the former `slug.test.ts`); and `test/zip.test.ts` with its independent
reader `test/zipcheck.py`. The hand-over of the `Wiring` is T-46's, and
the button's `disabled` in the unavailable state T-44's.

**Done when:** `./gradlew :subprojects:webapp:tscCheck` and
`./gradlew :subprojects:webapp:webappTest` exit 0, with
`subprojects/webapp/build/test/downloads.test.js`, `file-name.test.js`,
and `zip.test.js` present — `downloads.test.ts`: the four members in
order; both CSV column orders; `records.csv` values by the integer rule
(`s = −182` at 3 decimals written `-0.182`, a slip with 4 fraction
digits, a null and an unclassified record's `scarp_class` as empty
fields); the `statistics.csv` display columns equal to `displayRound`;
both version stamps; the nine provenance label lines in the PDD §6.1
order, block 5 equal to `settingsText`; on an offset-mode input with a
`partly_out` dip and a converted window starting below `t_s`, block 9
equal, line for line, to the `caveats` of `selectNotices` for the same
input, and `converted_windows` equal to the selected dips' injected
`windows` entries and `flags`, null in slip mode; `scenario.json`'s
`scenario` equal to `JSON.parse(serializeScenario(snapshot, manifest))`;
no field row in any member when `field` is set; a header-only records
file for an empty match; nothing of one `RenderInput` in a package
built from another; `test -f subprojects/webapp/test/zipcheck.py` and
`test ! -e subprojects/webapp/test/slug.test.ts` succeed;
`python3 .github/scripts/check_pdd_agreement.py` exits 0; a download
describing the page's active scenario, its archive accepted by
`zipcheck.py`, is covered by `consistency.spec.ts` (T-60).

#### T-46 — Accessibility and navigation lifecycle

**Steps.** Per
[DDD §5.11](ddd.md#511-accessibility-supported-environments-and-navigation-lifecycle),
integrating the surfaces of T-40–T-45 and T-49: (1) `src/main.ts` — the
navigation-lifecycle algorithm exactly as §5.11 prints it:
`SELF = import.meta.url`; the document-global slot
`SLOT = Symbol.for('gre.activeMount')`; `onPageReady()`, which never
throws into `document$` and calls `missingCapabilities()` (T-44) before
claiming the slot, showing `showCapabilityNotice` on a miss; the keyed
one-entry vintage cache `vintageFor(tag)` — key
`manifestUrl + ' ' + data-data-version`, failures never cached, the
`field` and `regression` load promises kept on the entry;
`fragmentTarget(hash)`, the element a non-empty URL hash names;
`guard(ev)`, the same-page fragment-link guard, which for a click
without Ctrl or Meta on a link without a `target` whose URL differs from
`location` only by a non-empty hash calls `preventDefault()` and
`stopImmediatePropagation()`, scrolls the named element into view, and
focuses it, giving it `tabindex="-1"` when it cannot take focus
otherwise, writing no history entry; and the subscription to
`window.document$`, with the `readyState` fallback. (2) `start(a, tag)`
with the startup sequence and rules of
[DDD §5.10](ddd.md#510-failure-states): create the two live regions,
append them to `#gre-root` after the fallback body, register the guard
with
`document.addEventListener('click', guard, { capture: true, signal: a.ac.signal })`,
and announce "Loading simulation data…"; add the two `window` listeners
of Error routing, acting only on this bundle's errors; then, inside one
`try`/`catch`, the load — the three `data-*` attributes of `#gre-app`
read from `tag.dataset` at this point, the vintage from
`vintageFor(tag)` — and the first render: the §5.8 skeleton built from
the vintage in the region model's order (`#gre-summary` first; T-40's
`#gre-controls`; the results header with T-43's prototype notice
`#gre-prototype` first while its entry exists, T-43's `#gre-caveats`,
T-49's overlay switch `#gre-overlay`, and T-45's download button
`#gre-download`; T-41's `#gre-panels`; `#gre-state`; the
`#gre-versions` footer slot), each applier handed the mount's `Wiring`
of [§5.1](ddd.md#51-modules-and-interfaces) (Wiring) —
`{ signal: a.ac.signal, scheduler, status }`, `scheduler` this mount's
(step 3) and `status` the `role="status"` region; the default
Scenario's result computed as sequence 0; the commit
`#gre-root.replaceChildren(skeleton, status, alert)`; then
`#gre-summary`'s border-box height written once to
`--gre-summary-block` on `#gre-root`, before the initial focus and
scroll
([DDD §5.11](ddd.md#511-accessibility-supported-environments-and-navigation-lifecycle),
the rules binding `start`); a
`ResizeObserver` attached to `#gre-summary` that writes its border-box
height in CSS px to the custom property `--gre-summary-block` on
`#gre-root` ([§5.7](ddd.md#57-scenario-controls), Layout and scenario
summary); the initial focus and scroll; and
`markAfterPaint('egr:first-result', 0, …)`; a failure enters T-44's
unavailable state. The initial focus and scroll, after the first
commit of results or of the unavailable state and the summary-height
write that follows either commit: the at-mount focus move
of step (6) or, with a fragment in the URL, no focus move and, when
`fragmentTarget(location.hash)` names an element outside `#gre-root`,
that element's `scrollIntoView()`; only after it does `start` set
`data-gre-mounted` and `data-gre-build`. T-50, which depends on this
task, adds the missing- or empty-attribute branch of §5.10 step 2 and
fills the `#gre-versions` footer from the two stamps. The two `window`
listeners and the guard take `{ signal: a.ac.signal }`; every other
listener is the appliers', added through their `Wiring`. After every
`await`, timer, and frame the code returns when the signal is aborted;
on the signal's `abort` event the scheduler stops and the summary's
observer disconnects, while the panels' observers (T-41) and the last
download URL (T-45) follow the same signal. (3) The per-mount scheduler
of
[DDD §5.3](ddd.md#53-query-engine) (Scheduling), items 1–5,
implementing T-41's `Scheduler` type with exactly its five operations
— `current()`; `update(next)`, which returns the sequence number it
stamped or null and is an accepted Scenario change when
`next.scenario !== current().scenario`, so Reset's default Scenario
and its `familyView` off are one update, and otherwise a display-only
update, whose frame, unless a Scenario change is also pending, runs no
query, no `summarize`, and no announcement and re-renders only the
panels whose display state changed and the slots the field-export
state marks (§5.3 item 3); `prefetchRegression()`;
`rerenderChart(measurement)`, re-rendering that panel's `.gre-chart`
slot and its chart-data disclosure contents from the last committed
`RenderInput` at the panel's current width in the next frame, with no
query and no announcement; and `lastRenderInput()`, the last committed
frame's `RenderInput` or null: an accepted Scenario stamped with
an increasing sequence number and coalesced into one animation frame;
the frame computing, in offset mode, `convertWindows` and each selected
dip's `rangeFlag` against the manifest's `slip_window_bounds`, then
`query`, per measurement `validValues`, `summarize`, and `histogram`,
and for `dzw` `histogramLog` with `logScaleOfferRatio()` — setting
`logScale` to false when it is null — then rendering the `RenderInput`
(T-41) through the render pass `render` of
`src/views/dom/render.ts`, which this task writes over the appliers of
T-40–T-45 and T-49, its `windows`, `flags`, and `regression` fixed
when the result was computed and its `field` set from the field-export
state then held, calling `markAfterPaint('egr:results-updated', s, …)`
and handing the settled update to `announce`, both given
`live = () => isLatest(s)`, `s` the result's sequence number, so that
neither acts once a newer Scenario is accepted or the scheduler stops
(§5.3 item 2); lazy exports requested on events only (the
regression-export prefetch, its request for an accepted offset-mode
Scenario, the field export when `update(next)` turns `overlay` on
while its state is `absent` or `failed`),
each loaded export's `export_version` required to equal the vintage's
([§5.2](ddd.md#52-artifact-loading-and-decoding), Lazy exports),
superseded continuations dropped, failures handled per §5.10 (Lazy-load
failures), and the field export's state — `absent`, `loading`,
`ready`, or `failed` — whose settling marks the height and width
panels' `.gre-legend` and `.gre-chart` slots and requests a frame that
re-renders them with no Scenario or display change (§5.3 item 3); one
`try`/`catch` per frame routing a throw to the
internal-failure state; and the stop on abort and on the unavailable
state, cancelling the pending frame. (4) `src/views/dom/marks.ts` —
`markAfterPaint(name, seq, check, live)`, per
[DDD §7.6](ddd.md#76-performance-and-compatibility-measurements)
(Instrumentation). (5) The nine-row announcement inventory of §5.11,
through `announce` of T-41's `src/a11y/announce.ts`: the first commit,
of results or of the unavailable state, empties the status region
without announcing anything; at most one announcement per settled
update and none for a display-only update, a `rerenderChart`
re-render, or a settled update superseded before its write (§5.3
item 2); a notice or caveat that §5.11's previous render (the last
render whose settled-update announcement was written, else the first
render) showed never announced again — the same registry
entry, in the same panel for a notice and for the same dip for a
per-dip line, counts as shown whatever its slot values; a new caveat's
first sentence filled exactly as `#gre-caveats` renders it (T-43); the
field-export-unavailable line on a failed field export; the rejection
lines and the read-off output are announced by T-40's and T-41's
modules through their `Wiring`; the templates join `copy.json` as
fixed-here entries citing §5.11. (6) `src/a11y/focus.ts` — at mount,
after the first commit and only while `location.hash` is empty,
`focus({ preventScroll: true })` on the selected measurement's panel
`<section>`, or on `#gre-state` when the first render shows the empty
or a failure state, then that element's `scrollIntoView()`; afterwards,
`focus()` with `{ preventScroll: true }` only for slot replacement
(rule 1: the element with the recorded `data-focus-key`, else the
slot's focus fallback) and for hidden, disabled, or emptied focus
(rule 2), the render that enters the unavailable state moving any focus
inside `#gre-root` to `#gre-state`, the short disclaimer's link
included, overriding rule 1; besides these, only the guard moves focus;
a rejected commit never moves focus, and Reset leaves it on its button.
(7) The DD-9 chart-data disclosure of §5.11: `chartDataOpen[measurement]`
applied on every render pass to the generated `<details>`, whose
`toggle` listener is T-41's, and focus returning to the `<summary>`
through its key. (8) The stylesheet `src/app.css`: `:focus-visible`
outlines, 24 × 24 CSS px targets, the class `gre-visually-hidden`,
`.md-typeset [id]` with `scroll-margin-top: 3.6rem` so every
`scrollIntoView()` stops below Material's sticky header,
`.gre-table-scroll` with `overflow-x: auto`, and the single column below
768 CSS px, usable at 360 CSS px with no page-level horizontal
scrolling.

**Done when:** `./gradlew :subprojects:webapp:tscCheck` and
`./gradlew :subprojects:webapp:webappTest` exit 0; in
`subprojects/webapp/src/main.ts`,
`grep -cF "Symbol.for('gre.activeMount')"` prints 1,
`grep -cF "document.addEventListener('click', guard, { capture: true, signal: a.ac.signal })"`
prints 1, `grep -c 'function fragmentTarget'` and
`grep -c 'function guard'` each print 1,
`grep -c 'unhandledrejection'` prints at least 1, and
`grep -c 'window.onerror'` prints 0;
`test -f subprojects/webapp/src/views/dom/render.ts` succeeds; in
`subprojects/webapp/src/app.css`,
`grep -c 'scroll-margin-top: 3.6rem'` and `grep -c 'overflow-x: auto'`
each print at least 1; after
`./gradlew :subprojects:webapp:webappBundle`,
`grep -c 'import.meta.url' subprojects/webapp/build/dist/app.js` prints
at least 1; `python3 .github/scripts/check_pdd_agreement.py` exits 0;
the lifecycle drives — direct and first instant entry focusing the
selected panel, fragment entry with the artifact held until after the
`load` event, and the short disclaimer's link, Material's skip link,
and a heading permalink taken by the guard — focus retention across
settled and display-only updates, the announcements, the disclosures,
the axe runs, the sticky summary, and the 360 px project with every
chart-data disclosure open are covered by `mount.spec.ts`,
`navigation-lifecycle.spec.ts`, `keyboard-responsive.spec.ts`,
`failure-states.spec.ts`, and `a11y.spec.ts` (T-60).

#### T-47 — Application configuration

**Steps.** Per [DDD §5.13](ddd.md#513-application-configuration): (1)
`subprojects/webapp/src/config.json` — exactly the ten unmarked entries
of the §5.13 register (`smallResultWarnBelow`, `chartFloorBelow`,
`lowSlipCaveatBelowMetres`, the six `displayPrecision.*` entries, and
`logScaleMinDecades`), each with the six fields `value`, `governs`,
`decision`, `source`, `quote`, and `quoted` as the register gives them;
the four `offer.*` (P2) entries ship with their feature; no
research-derived value appears (the §5.13 exclusions). (2)
`src/config.ts` — imports it (`resolveJsonModule`), checks its shape
with `satisfies`, the member names typed by the §5.13 naming rule
(camelCase, a per-quantity entry ending in its quantity's name: the
DD-10 `ColumnName` for slip and the three measurements, `counts` or
`shares` for the two count quantities), deep-freezes it, and exports
exactly the six accessors §5.13 names, none holding a second literal:
`smallResultWarnBelow()` and `chartFloorBelow()`, the D-11 thresholds;
`lowSlipThresholdStored()`, the `lowSlipCaveatBelowMetres` value in
1e-4 m stored units by exact decimal arithmetic (5,000 for 0.5);
`displayDecimals(m)`, for m one of `scarp_height`, `dzw`, `scarp_dip`,
and `slip`, the number of fraction digits in the shortest decimal
string of `displayPrecision.<m>`; `logScaleMinDecades()`; and
`logScaleOfferRatio()`, through the literal table
`{1: 10, 2: 100, 3: 1000}` and throwing outside it;
`displayPrecision.counts` and `displayPrecision.shares` get no
accessor. (3) `src/views/copy.json` with `src/views/copy.ts`, per the
copy registry of [DDD §5.8](ddd.md#58-view-layer) — imported, checked
with `satisfies`, deep-frozen, and exposed through typed accessors —
holding the PDD-sourced copy-deck entries: for each PDD §5 subsection
that has a blockquote, except §5.1 and the P2 list (§5.10, §5.12,
§5.13), its texts verbatim as entries `{key, source, part, text, slots}`,
split into parts as the §5.8 use-site map gives them, each `key` of the
§5.8 pattern `{doc}{section}.{name}` (as in `pdd5.6.perDipLine`), each
`text` keeping the PDD's own placeholder spelling and its `**` markers,
which the views render as `<strong>` and a plain-text use drops (§5.8,
Copy registry); the tasks that render the other texts add their entries
under the same pattern (T-40 to T-46, T-49, and T-50 for the §5.8
footer). (4) `.github/scripts/check_pdd_agreement.py` — standard
library only, reusing `slug`, `heading_text`, `collect_refs`, `ATX`,
`FENCE`, `scan`, and `resolve` from `.github/scripts/check_doc_links.py`
— implementing steps 1–8 of §5.13 with its step-6 P2 list: step 7
reading every copy-marked block of `subprojects/mkdocs/docs/scenario.md`
and `subprojects/mkdocs/docs/glossary.md` — a file that is absent or
holds no copy markers contributing no blocks — and comparing it with
the section it cites, a block citing `docs/app/pdd.md` with that
section's blockquotes after the §5.13 normalization (the PDD §5.1
disclaimer), a block citing `docs/app/ddd.md` with one fenced code
block of that section byte for byte after the line-ending and
trailing-whitespace normalization of step 7 (the §5.10 no-JS
fallback; from T-52 on, the glossary block); and step 8 printing the
SC-7 listing exactly as §5.13 step 8 defines it — the key of each
`fixed-here` `copy.json` entry with the SHA-256 of its `text`; the
file, line, cited section, and SHA-256 of each copy-marked block
citing `docs/app/ddd.md`; then the anchor of each PDD §5 subsection
that has a blockquote, §5.1 included, with the SHA-256 of its joined
blockquotes; and
`.github/scripts/test_check_pdd_agreement.py` with the §5.13 fixture
cases (exit 1 for a renamed heading behind a stale table of contents, a
fragment occurring only as text such as `#dzw`, a value of 29 with
`quoted` "30", a PDD edited to "N < 25 valid", a one-word change in a
copy text, a one-word change in a copy-marked block citing
`docs/app/ddd.md`, and an unknown key; exit 0 for a valid heading
missing from a table of contents, PDD §5.12 split into six parts, a
§5.1 block carrying the PDD's bracketed D-10 slot verbatim, a missing
P2 key, no entry for a P2-list subsection, and a `glossary.md` that
is absent or holds no copy markers). (5) In
`.github/workflows/doc-links.yml`, job `links` gains the steps
**Check PDD agreement** (`python .github/scripts/check_pdd_agreement.py`)
and **Self-test doc scripts**
(`python -m unittest discover -s .github/scripts -p 'test_*.py'`), so
that the job reads in the [DDD §6.3](ddd.md#63-ci-workflows) order —
**Check links and anchors**, **Check PDD agreement**,
**Check traceability** (T-04's), **Self-test doc scripts**:
**Check PDD agreement** directly after **Check links and anchors**,
before **Check traceability** when T-04 has added that step, and
**Self-test doc scripts** as the job's last step; the workflow stays
unfiltered and installs nothing.

**Done when:** `python3 .github/scripts/check_pdd_agreement.py` exits 0
and `python3 -m unittest discover -s .github/scripts -p 'test_*.py'`
exits 0; before T-52,
`python3 .github/scripts/check_pdd_agreement.py | grep -c 'glossary\.md'`
prints 0 — `glossary.md` holds no copy markers yet, so step 8 lists
no block of it; drills, each reverted — the `value` of
`smallResultWarnBelow` set to 29 makes the script exit 1 naming that
key, and a renamed fragment in one `source` makes it exit 1;
`python3 -c 'import json; print(sorted(json.load(open("subprojects/webapp/src/config.json"))))'`
prints exactly the ten unmarked entry names of the §5.13 register; for
each of `smallResultWarnBelow`, `chartFloorBelow`,
`lowSlipThresholdStored`, `displayDecimals`, `logScaleMinDecades`, and
`logScaleOfferRatio`, `grep -c <name> subprojects/webapp/src/config.ts`
prints at least 1;
`awk '/^      - name: /{sub(/^      - name: /, ""); print}' .github/workflows/doc-links.yml`
prints `Check links and anchors`, `Check PDD agreement`,
`Check traceability` (once T-04 has added it), and
`Self-test doc scripts`, in that order and nothing else;
`./gradlew :subprojects:webapp:tscCheck` exits 0;
`test ! -e subprojects/webapp/test/config-pdd.test.ts` succeeds.

#### T-48 — Kern County preset

**Steps.** Gated by D-6 ([OA-2](#4-owner-and-research-group-actions)):
proceed only once the decision is recorded, by the check OA-2 names,
a published vintage carries
non-null `kern_field_group` in the field export
([DDD §3.4](ddd.md#34-field-data-export)), and GS-3 is in the reference
results (T-13/T-63). **Escalate before implementing:** neither
[DDD §5.8](ddd.md#58-view-layer) nor
[PDD §4.7 — Kern County worked example (FR-O6, D-6 Open)](pdd.md#47-kern-county-worked-example-fr-o6-d-6-open)
fixes where the preset entry renders; a DDD §5.8 amendment names the
mount point, the preset's module, and its
[DDD §7.4](ddd.md#74-application-tests) test row — the executing agent
does not choose. Then: (1) the preset entry "Worked example: Kern County
(1952)" applies, in one update, the predefined Scenario of PDD §4.7 (dip
30°, the Pressure Ridge scarp type, the filter D-6 decides) and the
display state §5.8 names — `measurement` `dzw` and the overlay on, the
decided Kern group selected through `kern_field_group`; (2) the
three-step walkthrough copy joins `copy.json`, subject to
[G-4](#3-gates-and-release-sequence) approval; (3) its browser checks
join the T-60 inventory per that task's row.

**Done when:** `./gradlew :subprojects:webapp:webappTest` exits 0
including the preset test the amendment names, asserting that
`serializeScenario` of the applied preset Scenario equals the GS-3
reference `inputs`
([PDD §10.2 — Golden scenarios](pdd.md#102-golden-scenarios));
`./gradlew :subprojects:webapp:webappParity` exits 0 with GS-3 replayed;
`python3 .github/scripts/check_pdd_agreement.py` exits 0 with the
walkthrough entries; the rendered walkthrough is covered by
`interactions.spec.ts` (T-60).

#### T-49 — Field overlay

**Steps.** Per [DDD §5.8](ddd.md#58-view-layer) (Field overlay) and
[§5.12](ddd.md#512-charts) (Overlay marks): (1) `src/overlay/model.ts`,
pure — `overlayRows(rows, measurement, showAll)` (default sets: scarp
height `labeled_set` true; width `labeled_set` true and
`criterion_sub50` `met`; show-all every row of the panel's analogue),
`overlayGroups(rows)` (one group per (`source`, `source_quantity`),
never pooled, carrying `limited_comparison`), and
`overlayNote(measurement)` ("Field sources provide no comparable
scarp-dip measurement." for `scarp_dip`, null otherwise). (2)
`src/overlay/field-overlay.ts`, browser only, over the `field` rows of
the `RenderInput` (T-41) — the `FieldRow[]` that `loadFieldExport`
(T-30) yields for the [§3.4](ddd.md#34-field-data-export) rows while
the field export's state is `ready`, `'failed'` while it is `failed`,
and null otherwise ([§5.3](ddd.md#53-query-engine) item 3) — each
mechanic as the §5.8 bullets fix it:
the one results-header switch "Compare with field measurements (past
earthquakes)", the `<input type="checkbox" id="gre-overlay">` inside its
`<label>`, off by default, display state that Reset leaves alone; while
it is on, the height and width panels' rows drawn as black ticks in the
reserved 12 px band, the value axis extending over rows outside the
bins' extent; their `.gre-legend` with "Analogous, not identical", the
framing of
[PDD §5.7 — Field-overlay framing (CR-6, FR-O5)](pdd.md#57-field-overlay-framing-cr-6-fr-o5),
each `**…**` span rendered as `<strong>` (§5.8, Copy registry), and one
entry per group in the PDD §4.4 order with the label and data-page link
of the §5.8 table; each panel's show-all toggle button with
`aria-pressed`; the scarp-dip panel drawing no tick, its `.gre-legend`
holding `overlayNote('scarp_dip')` as HTML; the chart-data disclosure
adding, after the bin table, `<table id="{pid}-field">` from
`fieldTableSpec` (T-41) over exactly the drawn rows, with its
`<caption id="{pid}-field-cap">` inside its own scroll wrapper
`<div class="gre-table-scroll" role="region" tabindex="0" aria-labelledby="{pid}-field-cap" data-focus-key="{pid}-field">`
([§5.11](ddd.md#511-accessibility-supported-environments-and-navigation-lifecycle),
Markup); and, while `field` is `'failed'` and the overlay is on, the
fixed-here field-export line in the height and width legends, gone
once switching the overlay off and on again retries the load. Field
marks never use a scarp-class color,
and field rows never reach `engine/` or `stats/`: no count, statistic,
or matching population. The switch's and the show-all buttons'
listeners take the `Wiring` of
[§5.1](ddd.md#51-modules-and-interfaces) (Wiring; T-41's
`src/views/dom/wiring.ts`): each is added with
`{ signal: wiring.signal }` and hands its display-state change to `wiring.scheduler.update(next)`,
built from `wiring.scheduler.current()`. (3) `copy.json` gains the
PDD §4.4 entries (the switch label, "Analogous, not identical", the
scarp-dip note, the six group labels) and the §5.8 fixed-here entries
(the height show-all label, the limited-comparison suffix, the
field-export line). (4) `test/field-overlay.test.ts`
([DDD §7.4](ddd.md#74-application-tests)). The field-export request
that `update(next)` makes when `overlay` turns on, the re-render of
the height and width panels' `.gre-legend` and `.gre-chart` slots when
it settles, and the failure's announcement are the scheduler's (T-46).

**Done when:** `./gradlew :subprojects:webapp:tscCheck` and
`./gradlew :subprojects:webapp:webappTest` exit 0, with
`subprojects/webapp/build/test/field-overlay.test.js` present —
`overlayRows` default sets and show-all, `overlayGroups` never pooled
and carrying `limited_comparison`, and `overlayNote` for all three
measurements, on injected rows;
`grep -rlE 'overlay/|FieldRow' subprojects/webapp/src/engine subprojects/webapp/src/stats`
prints nothing (the no-mix invariant);
`grep -c 'gre-table-scroll' subprojects/webapp/src/overlay/field-overlay.ts`
prints at least 1;
`python3 .github/scripts/check_pdd_agreement.py` exits 0; rendered
overlay behavior, the framing's `<strong>` emphasis, and the field
table in its scroll wrapper are covered by `render.spec.ts`,
`interactions.spec.ts`, `a11y.spec.ts`, and
`keyboard-responsive.spec.ts` (T-60).

### M5 — Site integration

| ID | Task | Depends on | Inputs | Effort | Executor | Status |
|---|---|---|---|---|---|---|
| T-50 | Version stamps: software and data versions sourced at staging time and stamped on `#gre-app`; in the mount T-46 builds, the branch for a missing or empty attribute of the startup's load step and the footer `#gre-versions` with its copy entry. The data stamp's check against the loaded manifest is the T-30 loader's, its failure state T-44's. | T-03, T-21, T-30, T-44, T-46 | [DDD §6.2](ddd.md#62-software-and-data-version-stamps), [§6.1](ddd.md#61-build-outputs-asset-paths-and-page-scaffold), [§5.8](ddd.md#58-view-layer), [§5.10](ddd.md#510-failure-states), [§5.2](ddd.md#52-artifact-loading-and-decoding), [§7.4](ddd.md#74-application-tests). | S | agent | Draftable |
| T-51 | Site validation additions: the site checks hook's arms (c), application subtree, and (e), Tableau exclusion, with the [DDD §6.1](ddd.md#61-build-outputs-asset-paths-and-page-scaffold) Tableau loader that arm (e) requires; the release-checklist template of [DDD §7.7](ddd.md#77-site-validation-and-release-checklist) with its item-15 procedure and evidence ledger. The runtime half of the Tableau exclusion and the regression checks on existing surfaces are the browser lane's (T-60). | T-03, T-21 | [DDD §6.1](ddd.md#61-build-outputs-asset-paths-and-page-scaffold), [§7.7](ddd.md#77-site-validation-and-release-checklist), [§4.4](ddd.md#44-licensing-archival-distribution-and-release-attachments). | M | agent | Draftable |
| T-52 | Glossary additions before launch: PFDHA; engineer of record; FDHI spelling aligned. [DDD §6.4](ddd.md#64-product-pages-beyond-the-scenario-page-p2p3) (Glossary additions (MVP)) closes the PDD's entry-or-gloss alternative as a glossary entry (Proposed, owner acceptance) and states both entries verbatim as one fenced block, which `glossary.md` holds between copy markers citing §6.4. Committed on the release branch of T-55 step (2) after OA-3's D-10 commit and before the [G-4](#3-gates-and-release-sequence) ([SC-7](pdd.md#101-success-criteria) scientific sign-off) record, in the release-branch order of [§3](#3-gates-and-release-sequence). | T-47, OA-3 | [PDD §5.11 — Labels, units, and glossary links (FR-G3, CR-3, CR-7)](pdd.md#511-labels-units-and-glossary-links-fr-g3-cr-3-cr-7); [DDD §6.4](ddd.md#64-product-pages-beyond-the-scenario-page-p2p3), [§5.13](ddd.md#513-application-configuration), [§7.7](ddd.md#77-site-validation-and-release-checklist) (item 8). | S | agent | Draftable |
| T-54 | Prototype deployment (unlisted), which closes Phase 1: the one prototype-deployment commit of [DDD §6.1](ddd.md#61-build-outputs-asset-paths-and-page-scaffold) — `scenario.md` and `assets/scenario/` out of `draft_docs`, the `not_in_nav` block and the hook kept — whose merge deploys the page as the unlisted prototype of [ADR-0017 — An unadvertised prototype deployment precedes the public release](../adr/0017-unadvertised-prototype-before-public-release.md) (Proposed): no nav entry, no link from another page, out of `sitemap.xml` and the search index, the prototype notice shown. The agent prepares the commit and runs the browser lane on it, the pre-deployment check (T-60); the owner merges it into `main` once the [OA-17](#4-owner-and-research-group-actions) and [OA-10](#4-owner-and-research-group-actions) records exist — a merge, not a release ([DDD §7.7](ddd.md#77-site-validation-and-release-checklist), Phases); the Done-when checks the live site. | T-23, T-50, T-51, T-60, OA-10, OA-17 | [DDD §6.1](ddd.md#61-build-outputs-asset-paths-and-page-scaffold), [§6.3](ddd.md#63-ci-workflows), [§7.7](ddd.md#77-site-validation-and-release-checklist) (Phases), [§5.8](ddd.md#58-view-layer) (the prototype notice), [§2](ddd.md#2-repository-structure-naming-and-toolchain) (Node.js outside Gradle). | S | agent | Draftable |

#### T-50 — Version stamps

**Steps.** Per [DDD §6.2](ddd.md#62-software-and-data-version-stamps):
(1) in `subprojects/mkdocs/build.gradle.kts`, the `scenarioAssets`
task T-21 created declares the inputs `CITATION.cff` (repository root)
and `subprojects/webapp/data/pointer.json` and, at staging time, reads
the `CITATION.cff` `version` value and the pointer's `export_version`
and writes them as `data-software-version` and `data-data-version` of
the `#gre-app` element in the generated tag block
`subprojects/mkdocs/docs/includes/scenario-head.html`
([DDD §6.1](ddd.md#61-build-outputs-asset-paths-and-page-scaffold),
Generated tag block), replacing T-21's placeholder values; no version
value enters the bundle. (2) In `src/main.ts`, step 2 of
`start(a, tag)` as T-46 wires it
([DDD §5.10](ddd.md#510-failure-states), Startup sequence) reads
`data-software-version`, `data-data-version`, and `data-manifest`
from `tag.dataset` at that point, never at module evaluation, `tag`
being the element `document.getElementById('gre-app')` returns at
every mount (the §6.1 identifier contract). Add the branch §5.10
step 2 makes an internal failure, a missing or empty attribute,
inside that step's `try`: a missing or empty `data-software-version`,
`data-data-version`, or `data-manifest` enters T-44's unavailable
state with the §5.10 reason row for a missing or empty `data-*`
attribute of `#gre-app` ("the page is missing information it needs
to load the data"). `data-data-version` is
the `expected.exportVersion` that step 1 of the
[DDD §5.2](ddd.md#52-artifact-loading-and-decoding) loader (T-30)
compares with the loaded manifest's `export_version`, a mismatch
rejecting with the `'data-version'` `LoadError` whose §5.10 reason
names both versions (T-44). (3) Fill the footer `#gre-versions` of
the [DDD §5.8](ddd.md#58-view-layer) skeleton with the §5.8
fixed-here text "Software version {software} · Data-export version
{data}", `{software}` being the `data-software-version` and `{data}`
the `data-data-version` stamp, in both commits that build the
skeleton — T-46's first render and T-44's unavailable-state commit
before it — and leave it empty when either stamp is missing or empty;
`src/views/copy.json` gains that text as the fixed-here entry citing
§5.8.

**Done when:** `./gradlew :subprojects:mkdocs:mkdocsPreview` exits 0;
`grep -rho 'data-software-version="[^"]*"' subprojects/mkdocs/site-preview/ | sort -u`
prints one line carrying exactly the value that
`sed -n 's/^version: *//p' CITATION.cff` prints, and the same check
for `data-data-version` prints one line carrying exactly the pointer's
`export_version` — the scenario page is a draft until the prototype
deployment (T-54), so these checks read the preview tree (§6.1); the
§6.1 staging drill:
with the `CITATION.cff` `version` changed in the working tree,
`./gradlew --console=plain :subprojects:mkdocs:scenarioAssets` runs
the task again (its task line carries no `UP-TO-DATE`) and
`scenario-head.html` carries the new value, and restoring the file
restores the old one;
`./gradlew :subprojects:webapp:check` exits 0, the data-version case
of `decode.test.ts` included
([DDD §7.4](ddd.md#74-application-tests));
`python3 .github/scripts/check_pdd_agreement.py` exits 0, and
`grep -cF 'Software version {software} · Data-export version {data}' subprojects/webapp/src/views/copy.json`
prints 1. The rendered form of the §6.2 verification and of steps
(2)–(3) — the footer (`render.spec.ts`, `consistency.spec.ts`), the
version-mismatch state and the missing-stamp drive with its empty
`#gre-versions` (`failure-states.spec.ts`), and the stamp-change
re-entry (`navigation-lifecycle.spec.ts`) — is the browser lane's
(T-60).

#### T-51 — Site validation additions

**Steps.** (1) Apply the
[DDD §6.1](ddd.md#61-build-outputs-asset-paths-and-page-scaffold)
Tableau exclusion: in `subprojects/mkdocs/mkdocs.yml`, replace the
first `extra_javascript` entry — the `public.tableau.com` Embedding
API `path` with its `type: module` line — by
`javascripts/tableau-loader.js`, leaving the other three entries where
they are; commit
`subprojects/mkdocs/docs/javascripts/tableau-loader.js`, the
presence-guarded injector §6.1 specifies; record the loader in
`subprojects/mkdocs/EMBEDS.md` as part of the one embed pattern. No
theme override and no page front matter is involved. (2) In the site
checks hook `subprojects/mkdocs/hooks/site_checks.py`, which T-03
created with arms (a), (b), and (d), add arm (c), application subtree,
and arm (e), Tableau exclusion, exactly per §6.1 (Site checks hook),
in the same commit as step 1, because arm (e) fails every build that
still carries the Embedding API tag. `mkdocsBuild` in
`subprojects/mkdocs/build.gradle.kts` declares the inputs
`hooks/site_checks.py` and `publication-allowlist.txt` (§6.1, the
paragraph on `mkdocsPreview`). (3) Commit the template
`docs/app/release-checklist.md` of
[DDD §7.7](ddd.md#77-site-validation-and-release-checklist): fields
for the release-record identification §7.7 lists — the software
revision (the 40-hex commit), the pointer-manifest revision and data
vintage, the test-suite and lane versions with their results, and the
approval references; the checklist table with its seventeen items and
its Applies-to and Evidence-recorded columns; the literal commands of
items 7, 8, 17, and 10; the item-15 procedure verbatim, its `serve.mjs`
command included; the success-criteria table of item 6; the
[DDD §4.4](ddd.md#44-licensing-archival-distribution-and-release-attachments)
command block verbatim — the pointer's files and the plotting CSVs
it regenerates — `<software tag>` left as its placeholder; and, last,
the §7.7 Evidence-ledger paragraph verbatim (its row scope and
revision rules) and the ledger table with the header
`| Check | Revision | Result location | Result | Date |`. Links copied
from §7.7 point into `ddd.md`, so the link check resolves them. The
runtime half of the Tableau exclusion and the regression checks on
existing surfaces are the lane's `site-regression.spec.ts` (T-60).

**Done when:** `./gradlew :subprojects:mkdocs:mkdocsBuild` and
`./gradlew :subprojects:mkdocs:mkdocsPreview` each exit 0 — both run
all five hook arms;
`grep -c 'tableau.embedding' subprojects/mkdocs/mkdocs.yml` prints 0,
`grep -c 'javascripts/tableau-loader.js' subprojects/mkdocs/mkdocs.yml`
prints 1, and `grep -q 'tableau-loader.js' subprojects/mkdocs/EMBEDS.md`
exits 0; three drills, each undone afterwards, fail the build naming
the offending path: the Embedding API entry restored as the first
`extra_javascript` entry fails
`./gradlew :subprojects:mkdocs:mkdocsBuild` (arm (e)); a file
`subprojects/mkdocs/docs/assets/scenario/data/zz-stray.bin` planted
after `./gradlew :subprojects:mkdocs:scenarioAssets` fails a bare
`mkdocs build --strict -f mkdocs.preview.yml` run in
`subprojects/mkdocs` with the project virtualenv active (arm (c)); and
the §6.1 drill that removes the `fig-05` allowlist line after a
successful `mkdocsBuild` makes the next
`./gradlew :subprojects:mkdocs:mkdocsBuild` run — not report
UP-TO-DATE — and fail, naming that figure; in
`docs/app/release-checklist.md`, `grep -c '^| 17 |'` prints 1,
`grep -cF '| Check | Revision | Result location | Result | Date |'`
prints 1, `grep -cF 'gh release upload <software tag> $files'` prints
1, `grep -cF 'gh release upload <software tag> dist/csv/*.csv'`
prints 1, `grep -c 'tag_commit'` prints at least 1 (the ledger's
revision rule), `grep -cF '10.0.2.2:4173'` prints 1,
`grep -cF 'window.__greProbe = 1'` prints 1 (item 15's probe), and
`grep -cF 'node playwright/serve.mjs --root ../mkdocs/site-preview --site-url <SITE_URL> --port 4173'`
prints 1; `python .github/scripts/check_doc_links.py` exits 0.

#### T-52 — Glossary additions

**Steps.** Per the Glossary additions (MVP) paragraph of
[DDD §6.4](ddd.md#64-product-pages-beyond-the-scenario-page-p2p3),
which closes the PDD's entry-or-gloss alternative as glossary
entries, in `subprojects/mkdocs/docs/glossary.md`: (1)–(2) after the
last entry of the section "The field counterparts" and a blank line,
add the line
`<!-- copy:docs/app/ddd.md#64-product-pages-beyond-the-scenario-page-p2p3 -->`,
then the content of the fenced block of §6.4 verbatim —
`**Probabilistic fault-displacement hazard analysis (PFDHA)** { #pfdha }`
and `**Engineer of record** { #engineer-of-record }`, each with its
`:` definition, in that order — then the line `<!-- /copy -->`,
changing no byte of the block; (3) align FDHI to the singular
"Fault Displacement Hazard Initiative" in its four current locations:
the abbreviations-table row, "The datasets" definition,
`docs/includes/abbreviations.md`, and
the measurement-flatfile paragraph in `docs/data.md` (root-level
`docs/datasets.md` also carries the plural, outside the site tree and
this Done-when's scope).
The two entries are reader-facing texts that ship only after their
[SC-7](pdd.md#101-success-criteria) (scientific sign-off) approval
(§6.4): commit them on the release branch of T-55 step (2), after
OA-3's D-10 commit, in the release-branch order of
[§3](#3-gates-and-release-sequence), never on `main` before the
release merge; the commit stays unpublished until that merge, which
the [OA-4](#4-owner-and-research-group-actions) record, printed after
T-55's activation commit, precedes. Item 8 of the release checklist of
[DDD §7.7](ddd.md#77-site-validation-and-release-checklist) re-checks
all three additions at every release.

**Done when:** `./gradlew :subprojects:mkdocs:mkdocsBuild` exits 0 (a
strict build; the site's validation block promotes anchor warnings);
`grep -ri "Hazards Initiative" subprojects/mkdocs/docs/` prints
nothing, and so does
`grep -rl 'Fault Displacement Hazards Initiative' subprojects/mkdocs/site/`,
the publication-tree half of the §7.7 item-8 search;
`grep -c "#pfdha\|#engineer-of-record" subprojects/mkdocs/docs/glossary.md`
prints 2;
`grep -c '^<!-- copy:docs/app/ddd.md#64-product-pages-beyond-the-scenario-page-p2p3 -->$' subprojects/mkdocs/docs/glossary.md`
and `grep -c '^<!-- /copy -->$' subprojects/mkdocs/docs/glossary.md`
each print 1; at the repository root,
`python3 .github/scripts/check_pdd_agreement.py` exits 0 — its step 7
compares the block with the §6.4 fenced block
([DDD §5.13](ddd.md#513-application-configuration)) — and
`python3 .github/scripts/check_pdd_agreement.py | grep -c 'glossary\.md'`
prints 1, the step-8 listing of the block for SC-7; and,
on the release branch before the release merge,
`git merge-base --is-ancestor "$(git log --format=%H -1 -- subprojects/mkdocs/docs/glossary.md)" origin/main`
exits 1 — the entries are not on `main`.

#### T-54 — Prototype deployment (unlisted)

**Steps** (agent-prepared; the owner merges). (1) Before the commit,
check the records it needs, each by the check
[§4](#4-owner-and-research-group-actions) names: the
[OA-17](#4-owner-and-research-group-actions) record, the acceptance
of
[ADR-0017 — An unadvertised prototype deployment precedes the public release](../adr/0017-unadvertised-prototype-before-public-release.md),
and the [OA-10](#4-owner-and-research-group-actions) record of the
`main` ruleset; a record missing: stop and report. (2) On a branch
off `main`, make the one prototype-deployment commit of
[DDD §6.1](ddd.md#61-build-outputs-asset-paths-and-page-scaffold)
(Publication and activation) in `subprojects/mkdocs/mkdocs.yml`:
remove `scenario.md` and `assets/scenario/` from `draft_docs`,
leaving `media/dev/`, and keep the `not_in_nav` block and the `hooks`
entry; nothing else changes — the front matter
`search: exclude: true` (T-03) and the prototype notice (T-43) are in
place already. (3) Push the branch, open its pull request, and run
the browser lane on the branch, the pre-deployment check (T-60). The
owner merges the pull request into `main`, and the Companion site
push run deploys the unlisted page with the staged bundle and the
checksum-verified data. The merge is not a release
([DDD §7.7](ddd.md#77-site-validation-and-release-checklist),
Phases): no release branch, release checklist, or approval record
applies, and the page shows its unapproved copy, PDD §5.1's pending
D-10 slot included, as drafted. It is gated by the deployment
safeguards that stand from the first deployment: the CI gates of
[DDD §6.3](ddd.md#63-ci-workflows), the site checks hook's arms
(a)–(e) in both strict builds, arm (d) checking the unlisted state,
and [G-6](#3-gates-and-release-sequence) (no third-party photograph
in any public deploy, site tree, or release archive without
documented permission).

**Done when:** on the branch, after `git fetch origin`,
`git diff --name-only origin/main HEAD` prints only
`subprojects/mkdocs/mkdocs.yml`;
`grep -A1 '^draft_docs:' subprojects/mkdocs/mkdocs.yml` prints the
`draft_docs` line and `  media/dev/`, and
`grep -cxE '  (scenario\.md|assets/scenario/)' subprojects/mkdocs/mkdocs.yml`
prints 1, the `not_in_nav` line;
`./gradlew :subprojects:mkdocs:mkdocsBuild :subprojects:mkdocs:mkdocsPreview`
exits 0, after which
`test -f subprojects/mkdocs/site/scenario/index.html` exits 0,
`grep -c 'eps-ground-rupture/scenario/</loc>'` prints 0 on
`subprojects/mkdocs/site/sitemap.xml` and 1 on
`subprojects/mkdocs/site-preview/sitemap.xml`, and
`grep -c '"location":"scenario/' subprojects/mkdocs/site/search/search_index.json`
prints 0; `./gradlew :subprojects:webapp:webappBrowserTest` exits 0;
and `gh pr checks <number>` lists every check successful. After the
merge, with `<SITE_URL>` the `site_url` of
`subprojects/mkdocs/mkdocs.yml`
(`https://harvardrc.github.io/eps-ground-rupture/`):
`gh run list --workflow mkdocs.yml --commit <merge sha>` lists a run
with conclusion `success` whose `deploy` job ran
(`gh run view <run id>`);
`curl -s -o /dev/null -w '%{http_code}' <SITE_URL>scenario/` prints
`200`; `curl -s <SITE_URL> | grep -cE 'href="(\./)?scenario/'` prints
0 — no nav link;
`curl -s <SITE_URL>sitemap.xml | grep -c 'scenario/</loc>'` and
`curl -s <SITE_URL>search/search_index.json | grep -c '"location":"scenario/'`
each print 0; and, in `subprojects/webapp` after
`./gradlew :subprojects:webapp:playwrightInstall` and the PATH export
of [DDD §2](ddd.md#2-repository-structure-naming-and-toolchain)
(Node.js outside Gradle),
`node -e 'const { chromium } = require("@playwright/test"); (async () => { const b = await chromium.launch(); const p = await b.newPage(); await p.goto(process.argv[1]); console.log(await p.locator("#gre-prototype").textContent()); await b.close(); })();' '<SITE_URL>scenario/'`
prints exactly the `text` of the `ddd5.8.prototypeNotice` entry of
`src/views/copy.json` — the prototype notice shown on the live page.

### M6 — Release

| ID | Task | Depends on | Inputs | Effort | Executor | Status |
|---|---|---|---|---|---|---|
| T-59 | Reference measurement environment: the Terraform root `subprojects/webapp/perf/` with its `run.mjs` driver and owner README, and the Gradle tasks `webappMeasureReference` and `webappMeasureDestroy` — the AWS virtual machine of [DD-12](ddd.md#1-ddd-decision-register) (Performance reference environment), which [DDD §7.6](ddd.md#76-performance-and-compatibility-measurements) specifies — the agreed acceptance baseline, recreatable from the repository, not calibrated against laptops, its timings varying from run to run — on which the T-61 suite produces budget evidence. It waits on [OA-12](#4-owner-and-research-group-actions), the owner's acceptance of [ADR-0016 — Performance reference environment — an on-demand AWS VM defined by Terraform](../adr/0016-performance-reference-environment.md), Proposed, and on [OA-16](#4-owner-and-research-group-actions), the owner's `ami_id` value ([§3](#3-gates-and-release-sequence), Owner-action prerequisites). The agent builds and checks it without AWS credentials; the first real measurement run is the owner's (OA-5), once T-61 lands the measure specs. | T-02, OA-12, OA-16 | [DDD §7.6](ddd.md#76-performance-and-compatibility-measurements), [§2](ddd.md#2-repository-structure-naming-and-toolchain); [ADR-0016](../adr/0016-performance-reference-environment.md) (Proposed). | L | agent | Blocked — ADR-0016 (Proposed; its acceptance is OA-12) |
| T-60 | Browser test lane: the [DD-3](ddd.md#1-ddd-decision-register) (Browser-testing tool and test inventory) tool and the eleven-spec inventory in the projects `desktop` and `mobile`, run by `webappBrowserTest`, after `playwrightInstall` installs the pinned Chromium, against the strict preview build (stamps, hook, and Tableau loader in place). The agent builds and runs it in development and as T-54's pre-deployment check; the owner runs it at release (§7.7 item 4). T-48's preset checks join the inventory when it ships. | T-21, T-40–T-46, T-49, T-50, T-51 | [DDD §7.5](ddd.md#75-browser-test-lane), [§2](ddd.md#2-repository-structure-naming-and-toolchain). | L | agent | Draftable |
| T-61 | Measurement suite (acceptance): the `measure` project of [DDD §7.6](ddd.md#76-performance-and-compatibility-measurements) — network emulation, cache variants, workloads, payload scope, report, over the marks the application records — and the browser-compatibility test; the agent runs it as a diagnostic and records the [DDD §3.8](ddd.md#38-measured-sizes) figures it supplies; the owner runs it in the T-59 environment at release (OA-5), and G-2 cites those reports. | T-30–T-32, T-41, T-50, T-59, T-60 | [DDD §7.6](ddd.md#76-performance-and-compatibility-measurements), [§3.8](ddd.md#38-measured-sizes), [§5.2](ddd.md#52-artifact-loading-and-decoding), [§5.3](ddd.md#53-query-engine), [§5.7](ddd.md#57-scenario-controls), [§5.10](ddd.md#510-failure-states), [§7.7](ddd.md#77-site-validation-and-release-checklist), [§2](ddd.md#2-repository-structure-naming-and-toolchain). | M | agent | Draftable |
| T-62 | Acceptance walkthrough scripts: [US-1](prd.md#us-1-dam-foundation-scenario) (Dam foundation scenario), [US-2](prd.md#us-2-pipeline-crossing) (Pipeline crossing), and [US-3](prd.md#us-3-design-review) (Design review) as scripted demos against the golden scenarios, pass conditions from the stories and SC rows. The agent writes the scripts; human reviewers execute them at release — a human acceptance session, distinct from the automated lane (T-60). | T-60 | [PDD §10.3 — Acceptance walkthroughs](pdd.md#103-acceptance-walkthroughs); [DDD §7.7](ddd.md#77-site-validation-and-release-checklist), [§5.7](ddd.md#57-scenario-controls). | M | agent | Draftable |
| T-63 | Release vintage: the owner publishes the vintage the release ships with `publishVintage` — under the confirmed terms, since a vintage with the assumed record serves only the unlisted prototype ([DDD §4.4](ddd.md#44-licensing-archival-distribution-and-release-attachments), Vintage terms) — or, if the pinned vintage is unchanged and already holds the confirmed record, verifies its recorded publication evidence (publication record, retention check, CI's fetch-and-verify) instead of regenerating. | T-18, OA-1, OA-13, OA-14 | [DDD §4.2](ddd.md#42-publication-of-a-data-vintage), [§4.3](ddd.md#43-retention-rollback-recovery-and-withdrawal), [§7.7](ddd.md#77-site-validation-and-release-checklist), [§3.4](ddd.md#34-field-data-export); [HLDD §9 — Testing and release architecture](hldd.md#9-testing-and-release-architecture). | — | owner | Draftable |
| T-64 | Rollback rehearsal: a pointer-manifest revert exercised on the published vintage, checksum-verified, with the normal validation and deployment checks applied — both **Parity** steps (T-23) among them — before T-55's activation commit, while the scenario page is drafted or unlisted, its net-zero merge redeploying the site unchanged, so it has no public effect; the agent tools it, the owner runs and authorizes it. | T-22, T-23, T-63 | [DDD §4.3](ddd.md#43-retention-rollback-recovery-and-withdrawal), [§6.3](ddd.md#63-ci-workflows), [§7.7](ddd.md#77-site-validation-and-release-checklist); [HLDD §9 — Testing and release architecture](hldd.md#9-testing-and-release-architecture). | — | owner | Draftable |
| T-55 | Public activation: the [D-2](pdd.md#1-decision-register) navigation entry ([PDD §2.2 — Entry point (D-2, Decided 2026-10-28)](pdd.md#22-entry-point-d-2-decided-2026-10-28)) as the one [DDD §6.1](ddd.md#61-build-outputs-asset-paths-and-page-scaffold) activation commit on the release branch — unlisted prototype to activated: the nav entry in, the `not_in_nav` block, the page's front matter, and the prototype notice's copy entry out — made once G-5 is recorded, T-52's glossary commit is in, the [OA-10](#4-owner-and-research-group-actions) ruleset is in place, and the [OA-14](#4-owner-and-research-group-actions) membership is recorded and carried by `LABELED_FIELD_EVENTS` ([§3](#3-gates-and-release-sequence), Owner-action prerequisites); the G-4 record follows the commit, and the page becomes public with the release merge (T-65), after G-2, G-3, and G-4 are recorded on that branch. Until that merge every deploy carries the scenario page as the unlisted prototype of T-54. | T-51, T-52, T-54, T-60, T-62, T-64, OA-3, OA-10, OA-14 | [DDD §6.1](ddd.md#61-build-outputs-asset-paths-and-page-scaffold), [§7.7](ddd.md#77-site-validation-and-release-checklist), [§5.13](ddd.md#513-application-configuration), [§6.4](ddd.md#64-product-pages-beyond-the-scenario-page-p2p3), [§3.4](ddd.md#34-field-data-export); [PDD §4.4 — Field overlay (FR-O5, D-18 Proposed)](pdd.md#44-field-overlay-fr-o5-d-18-proposed). | S | agent | Draftable |
| T-65 | v0.3 release: the version commit on the release branch that carries T-55's activation commit; the [DDD §7.7](ddd.md#77-site-validation-and-release-checklist) release checks before the merge and the published-site measurement after the deployment; then the first GitHub release — code, plotting CSVs, `CITATION.cff`, and the current app exports attached per [DD-8](ddd.md#1-ddd-decision-register) (Release data-attachment mechanism) while the release is a draft — whose record is the filled checklist with its evidence ledger, including the check that the release tag's `git archive` contains zero `fig-*` entries ([`notes/Roadmap.md` — Decisions made](../../notes/Roadmap.md#decisions-made), Paper figures). | T-04, T-16, T-17, T-23, T-37, T-52, T-55, T-60–T-64, OA-4, OA-6, OA-7 | [DDD §4.4](ddd.md#44-licensing-archival-distribution-and-release-attachments), [§7.7](ddd.md#77-site-validation-and-release-checklist), [§6.2](ddd.md#62-software-and-data-version-stamps), [§4.3](ddd.md#43-retention-rollback-recovery-and-withdrawal); [`notes/Roadmap.md` — Decisions made](../../notes/Roadmap.md#decisions-made). | — | owner | Draftable |

#### T-55 — Public activation

**Steps.** (1) Before the commit, verify the recorded gate artifacts
and owner-action records of [§3](#3-gates-and-release-sequence) that
must precede it, each dated and naming the content it covers: G-5 —
the [OA-3](#4-owner-and-research-group-actions)
record of the [D-10](pdd.md#1-decision-register) (Liability-limitation
text referenced by CR-4) text, by the checks OA-3 names; T-52's
glossary commit of
[DDD §6.4](ddd.md#64-product-pages-beyond-the-scenario-page-p2p3),
which follows OA-3's in the release-branch order of §3; the
[OA-10](#4-owner-and-research-group-actions) record of the `main`
ruleset; and the [OA-14](#4-owner-and-research-group-actions) record,
by the check OA-14 names, with `config.LABELED_FIELD_EVENTS` equal to
the membership that
[PDD §4.4 — Field overlay (FR-O5, D-18 Proposed)](pdd.md#44-field-overlay-fr-o5-d-18-proposed)
then names, both at `HEAD` and at the `tag_commit` of the pinned
vintage's publication record
([DDD §3.4](ddd.md#34-field-data-export), Labeled set). Any record
missing, undated, or naming other content, or a membership mismatch:
stop and report — this task never
substitutes its own judgment for a gate; a mismatch at `HEAD` is
closed by a change to the constant alone, in a separate commit
before activation, and one at the `tag_commit` by a vintage exported
from the corrected constant (T-63). The G-4 approval follows this
commit: the [OA-4](#4-owner-and-research-group-actions) record lists
the reader-facing texts as the activation commit leaves them, the
prototype notice removed
([DDD §7.7](ddd.md#77-site-validation-and-release-checklist), SC-7
approval record; T-65 checks it). (2) On the
release branch `dev-v.0.3.x` — the owner's development branch for
v0.3, off `main`, which carries the release
([DDD §7.7](ddd.md#77-site-validation-and-release-checklist)) and
which T-52 and T-65 use — make the one activation commit of
[DDD §6.1](ddd.md#61-build-outputs-asset-paths-and-page-scaffold),
which turns T-54's unlisted prototype into the activated page: in
`subprojects/mkdocs/mkdocs.yml`, delete the `not_in_nav` block, whose
only line is `scenario.md`; keep `draft_docs`, `media/dev/` alone
since T-54, and the `hooks` entry; and insert
`- Scenario explorer: scenario.md` immediately after the `Dashboards`
block, before `- Data: data.md` — the D-2 entry of
[PDD §2.2 — Entry point (D-2, Decided 2026-10-28)](pdd.md#22-entry-point-d-2-decided-2026-10-28);
delete the front matter of `subprojects/mkdocs/docs/scenario.md`,
whose only key is `search`, with the blank line after it; and delete
the entry
`ddd5.8.prototypeNotice` from `subprojects/webapp/src/views/copy.json`,
which removes the prototype notice ([DDD §5.8](ddd.md#58-view-layer)).
(3) Push the branch and open its pull request. It merges only as the
release (T-65), once G-2, G-3, and G-4 are recorded on this branch:
the §7.7 checks, the browser lane's release run among them (§6.1), run
on the release branch before the merge that releases the change.

**Done when:** `grep -c 'not_in_nav' subprojects/mkdocs/mkdocs.yml`
prints 0; `grep -A1 '^draft_docs:' subprojects/mkdocs/mkdocs.yml`
prints the `draft_docs` line and `  media/dev/`, and
`grep -cxE '  (scenario\.md|assets/scenario/)' subprojects/mkdocs/mkdocs.yml`
prints 0; `grep -c 'hooks/site_checks.py' subprojects/mkdocs/mkdocs.yml`
prints 1;
`grep -A1 'Scenario explorer: scenario.md' subprojects/mkdocs/mkdocs.yml`
prints the `- Data: data.md` line;
`head -1 subprojects/mkdocs/docs/scenario.md` prints
`# Ground Rupture Explorer`, and
`grep -c 'ddd5.8.prototypeNotice' subprojects/webapp/src/views/copy.json`
prints 0;
`./gradlew :subprojects:mkdocs:mkdocsBuild` and
`./gradlew :subprojects:mkdocs:mkdocsPreview` exit 0,
`test -f subprojects/mkdocs/site/scenario/index.html` exits 0,
`grep -c 'eps-ground-rupture/scenario/</loc>' subprojects/mkdocs/site/sitemap.xml`
prints 1, and
`grep -c '"location":"scenario/' subprojects/mkdocs/site/search/search_index.json`
prints 1; in `subprojects/mkdocs`, the §7.7 item-7 search
`grep -rl 'text pending, D-10' site/ site-preview/`
prints nothing — G-5's check over both trees; at the repository root,
`python3 .github/scripts/check_pdd_agreement.py` exits 0;
`gh run list --commit <activation commit>` lists Tests, Companion
site, and Doc links runs, each with conclusion `success`.

#### T-59 — Reference measurement environment

**Steps.** Only after [OA-12](#4-owner-and-research-group-actions)
has recorded the acceptance of
[ADR-0016 — Performance reference environment — an on-demand AWS VM defined by Terraform](../adr/0016-performance-reference-environment.md),
the decision whose toolchain this task introduces
([§3](#3-gates-and-release-sequence), Owner-action prerequisites),
and exactly per
[DDD §7.6](ddd.md#76-performance-and-compatibility-measurements)
(Reference environment; Where the suite runs; Access;
Self-termination and cleanup; Terraform commands; the `run` steps
1–7) and the
[DDD §2](ddd.md#2-repository-structure-naming-and-toolchain) tree, task
table, Reference environment (`perf/`) paragraph, and `run.mjs`
interface — the environment that
[DD-12](ddd.md#1-ddd-decision-register) (Performance reference
environment) registers — create in `subprojects/webapp/perf/`:
(1) `versions.tf` — `required_version = "~> 1.7"`, the providers
`hashicorp/aws` at `~> 6.0` and `hashicorp/tls` at `~> 4.0`, and no
backend: state is local; (2) `variables.tf` — `aws_profile`,
`operator_cidr`, and `ami_id`, whose default is the AMI ID that
Canonical's SSM parameter
`/aws/service/canonical/ubuntu/server/24.04/stable/current/amd64/hvm/ebs-gp3/ami-id`
names in `us-east-1`; reading it needs AWS credentials, which the
agent never holds, so the owner supplies the value
([OA-16](#4-owner-and-research-group-actions)), which stands in this
task's Depends-on, and the agent commits it as the default; (3)
`main.tf` and `outputs.tf` — the `aws` provider
(`region = "us-east-1"`, `profile = var.aws_profile`), the
`tls_private_key` (`ED25519`) with its `aws_key_pair`, the
`aws_security_group`, and the `aws_instance` of the DD-12 type
`c6i.xlarge` with every argument and tag of the §7.6 bullet list —
`vpc_security_group_ids` holding that security group's `id`, and the
root volume's `delete_on_termination = true` and
`instance_initiated_shutdown_behavior = "terminate"`, both set
explicitly, among them — and the
outputs `instance_id`, `public_ip`, and the sensitive
`ssh_private_key`; (4) `cloud-init.yaml` — the 24-hour shutdown, a
best-effort bound on the running time and not a cleanup, the
`xvfb` package, and Node.js 22.12.0 checked against its
`SHASUMS256.txt`; (5) `run.mjs` — Node.js built-ins only, the command
line `perf/run.mjs [run|destroy|ssh|status] [--dry-run]` with `run` as
the default; every `terraform` command built by the one function of §7.6
(Terraform commands), which adds `-var operator_cidr=<ip>/32` to the
create-or-reconcile apply only and `-var operator_cidr=192.0.2.1/32`,
with no IP lookup, to the refresh-only apply, every destroy, and the
`status` plan; every invocation, `--dry-run` included, first compares
`process.version` with `v22.12.0` and exits 1, printing both, when
they differ (§2); `run` as §7.6 steps 1–7 — step 1's clean-tree
command `git status --porcelain=v1 --untracked-files=all` at the
repository root, without the pointer exclusion of §4.1; step 2's
`terraform apply -refresh-only -auto-approve -input=false` when
`terraform state list` prints anything, the printed leftover, and
`terraform destroy -auto-approve -input=false` before the apply when
the refreshed state names a `tls_private_key` but no `aws_instance`;
step 5's `EGR_TERRAFORM_VERSION`, the version step 1's
`terraform version -json` reported; step 7's destroy once the
measurement run has completed and its report is downloaded — steps
3–6 all succeeded, the measure run exiting 0 among them, a budget
miss included — and otherwise the kept-VM lines and a non-zero
exit; `destroy`, `ssh`, and `status` as §2 and §7.6 define them; the
per-run key and `known_hosts` of Access, with no key or state
content printed; and `--dry-run` printing in
order the commands the subcommand would run, running none and checking
no precondition; (6) `.terraform.lock.hcl` — written by `terraform init`
and committed, pinning the providers, not the CLI, whose version
every report records; no `.gitignore` entry is added, because the
root rules `**/.terraform/`, `*.tfstate`, and `*.tfstate.*` cover the
local state; (7) `README.md` — the owner's instructions:
`egr.perf.awsProfile` in `~/.gradle/gradle.properties` naming a profile
allowed, in `us-east-1`, every action of the §7.6 permission list, each
named — the EC2 actions on the instance, the key pair, the security
group and its rules, and the instance's tags, the read-only
`ec2:Describe*` actions, and `ssm:GetParameter` under
`/aws/service/canonical/` (the owner's ready policy granting exactly
these is Phase A3 of the owner's local, uncommitted note
`notes/2026-10-30/aws-terraform-walkthrough.md`, which the README does
not cite); Terraform `~> 1.7` on
`PATH`; the two Gradle tasks and the published-site variant; for a
kept VM, `node perf/run.mjs ssh` in `subprojects/webapp`, preceded
by the PATH export of the DDD §2 form (Node.js outside Gradle); for
leftovers, `node perf/run.mjs status` in the same form, with
`TF_VAR_aws_profile` set; the 24-hour self-termination, which leaves the
key pair, the security group, and the state until `webappMeasureDestroy`
runs; that the state, its backup, any saved plan, and the temporary
key files are sensitive and stay out of commits, logs, and uploaded
evidence (§7.6, Access); and the report directory
`subprojects/webapp/build/perf/<run_id>/`. No file under `perf/` names
the parked data layer's directory or a key path under the home
directory (the greps below). (8) In
`subprojects/webapp/build.gradle.kts`, register
`webappMeasureReference` and `webappMeasureDestroy` exactly per the §2
task table — `NodeTask`s running `perf/run.mjs` with `args` `["run"]`
and `["destroy"]`, both `dependsOn(npmCi)` and setting
`TF_VAR_aws_profile` from `egr.perf.awsProfile` when it is set, the
first also `dependsOn(":subprojects:mkdocs:mkdocsPreview")` and,
under `-Pegr.perf.target=published` — the one value that property
accepts, any other value failing the task when it executes, in a
`doFirst` action before `run.mjs` starts, with the §2 message
`egr.perf.target must be 'published' (got '<value>')` — setting
`EGR_BASE_URL` to the `site_url` of
`subprojects/mkdocs/mkdocs.yml`. Nothing is checked while Gradle
configures the build script, and neither task joins `check`,
`assemble`, or any workflow. The first real measurement run is the
owner's, through `webappMeasureReference` (OA-5), once T-61 has landed
the measure specs; a run before T-61 is only a shakedown of the
environment, expected to fail at step 5, which finds no measure spec,
and so to keep its VM, which the owner then removes with
`./gradlew :subprojects:webapp:webappMeasureDestroy`.

**Done when** (no AWS credentials needed; at the repository root
unless stated):
`terraform -chdir=subprojects/webapp/perf init -backend=false -input=false`,
`terraform -chdir=subprojects/webapp/perf validate`, and
`terraform -chdir=subprojects/webapp/perf fmt -check` each exit 0;
`git ls-files subprojects/webapp/perf` prints exactly
`.terraform.lock.hcl`, `README.md`, `cloud-init.yaml`, `main.tf`,
`outputs.tf`, `run.mjs`, `variables.tf`, and `versions.tf` (with the
directory prefix), and
`git check-ignore subprojects/webapp/perf/.terraform subprojects/webapp/perf/terraform.tfstate`
prints both paths;
`grep -cE '^ *default *= *"ami-[0-9a-f]{17}"' subprojects/webapp/perf/variables.tf`
prints 1;
`grep -c 'vpc_security_group_ids' subprojects/webapp/perf/main.tf`,
`grep -cE 'delete_on_termination *= *true' subprojects/webapp/perf/main.tf`,
and
`grep -cE 'instance_initiated_shutdown_behavior *= *"terminate"' subprojects/webapp/perf/main.tf`
each print 1; `grep -c 'v22\.12\.0' subprojects/webapp/perf/run.mjs`
prints at least 1; `grep -cF 'node perf/run.mjs ssh' subprojects/webapp/perf/README.md`
prints at least 1. Then, after `./gradlew :subprojects:webapp:npmCi`,
in `subprojects/webapp` with the plugin's runtime first on `PATH` by
the one command of
[DDD §2](ddd.md#2-repository-structure-naming-and-toolchain) (Node.js
outside Gradle),
`export PATH="$(ls -d "$PWD"/.gradle/nodejs/node-v22.12.0-*)/bin:$PATH"`:
`node perf/run.mjs --dry-run` exits 0 and prints, in this order, a
`terraform init -input=false` line, a
`terraform apply -auto-approve -input=false` line, a line running
`playwright test --project=measure --workers=1`, and a
`terraform destroy -auto-approve -input=false` line — create, measure,
destroy on completion; `node perf/run.mjs destroy --dry-run` prints a
`terraform destroy -auto-approve -input=false` line carrying
`-var operator_cidr=192.0.2.1/32` and no `terraform apply` line,
`node perf/run.mjs status --dry-run` prints a `terraform state list`
line and no `terraform apply` or `terraform destroy` line, and
`node perf/run.mjs ssh --dry-run` prints
a `terraform output -raw ssh_private_key` line and an `ssh` line
carrying `-o IdentitiesOnly=yes` and
`-o StrictHostKeyChecking=accept-new`; and the decision-logic drill
shows the step-2 and step-7 rules — with `EGR_PERF_DIR` set to a
temporary copy of `perf/` (DDD §2), never the real directory, and
stub executables `terraform`, `ssh`, `scp`, `tar`, and `git` placed
before the runtime on `PATH`, each appending its arguments to one log file
(`terraform version -json` answering version 1.7.5,
`terraform state list` printing nothing unless a case says otherwise,
and `terraform output` placeholder values; `git` printing nothing for
the clean-tree command and a fixed commit for `rev-parse`; `ssh`
reporting an uptime under 72,000 s and exiting with a chosen status
for the command that runs `playwright test`; `scp` exiting with a
chosen status for the download of step 6), an empty
`../mkdocs/site-preview/` standing in when none is built, and network
access for the operator-IP lookup,
`TF_VAR_aws_profile=stub node perf/run.mjs run`: with the measure
stub and the download exiting 0, it exits 0 and logs the measure
call, carrying `EGR_TERRAFORM_VERSION=1.7.5`, and a
`terraform destroy` call after it; with the measure
stub exiting 1, and again with the measure stub exiting 0 and the
download exiting 1, it exits non-zero, logs no `terraform destroy`
call, and prints the §7.6 step-7 lines for a kept VM; with
`terraform state list` printing a `tls_private_key` and no
`aws_instance`, it logs
`terraform apply -refresh-only -auto-approve -input=false`, then a
`terraform destroy -auto-approve -input=false` call, then
`terraform apply -auto-approve -input=false`; with
`terraform state list` exiting 1 and writing `No state file was found!`
to standard error, as before the first apply, it exits 0 with the
measure stub and the download exiting 0, logging no refresh-only apply
and no `terraform destroy` call before
`terraform apply -auto-approve -input=false`, and
`TF_VAR_aws_profile=stub node perf/run.mjs status` exits 0, prints
`state empty`, and logs no `terraform plan` call; every logged
refresh-only apply and `terraform destroy` carries
`-var operator_cidr=192.0.2.1/32`,
and every other logged `terraform apply` carries a `-var operator_cidr=`
value ending in `/32` other than that placeholder; and, with
`terraform state list` printing an `aws_instance` and
`terraform show -json` printing `{}`,
`TF_VAR_aws_profile=stub node perf/run.mjs status` exits 0, prints
`terminated` on the `aws_instance` line, and logs a
`terraform plan -refresh-only` call carrying
`-var operator_cidr=192.0.2.1/32` and no `terraform apply` or
`terraform destroy` call. At the repository root again:
`git grep -n 'deploy/terraform' subprojects/webapp/perf` and
`git grep -n '\.ssh/' subprojects/webapp/perf` print nothing;
`./gradlew :subprojects:webapp:tasks --all` lists
`webappMeasureReference` and `webappMeasureDestroy` without
`egr.perf.awsProfile` set;
`./gradlew check --dry-run | grep -c webappMeasure` prints 0, and
`grep -rnE 'webappMeasure|run\.mjs' .github/workflows/` prints
nothing. The `doFirst` refusal of any other `egr.perf.target` value
runs once `mkdocsPreview` exists (T-21), in T-61's Done-when.

#### T-60 — Browser test lane

**Steps.** (1) Configure the [DD-3](ddd.md#1-ddd-decision-register)
lane exactly per [DDD §7.5](ddd.md#75-browser-test-lane), Mechanics:
`subprojects/webapp/playwright.config.ts` reads `SITE_URL` from the
`site_url` line of `subprojects/mkdocs/mkdocs.yml` and derives
`BASE_PATH` and `BASE_URL`; its `webServer` array starts the two
`playwright/serve.mjs` instances over `../mkdocs/site-preview` —
port 4173, and port 4174 with `--max-age 0` — each with
`reuseExistingServer: false` and a command whose `<node>` is
`JSON.stringify(process.execPath)`, the Node.js running Playwright;
`use.baseURL` is `BASE_URL`; its `globalSetup` module
`playwright/global-setup.ts` fails the run unless the first `<loc>`
of the `sitemap.xml` served on port 4173 starts with `BASE_URL`; the
projects `desktop`, `mobile`, and `measure` carry exactly the
settings §7.5 lists for each — the `measure` project without a
per-project `workers`, which Playwright 1.47.2 does not have, so
every invocation of it carries `--workers=1` (the `measure` specs are
T-61's); the reporters are `list` and `json`
(`build/playwright/report.json`), with `outputDir`
`build/playwright/test-results/`. (2) Write
`subprojects/webapp/playwright/serve.mjs` per §7.5 (Static server):
Node.js built-in modules only, no package; the flags `--root`,
`--site-url`, `--port`, `--max-age` (default 600), and `--host`
(default `127.0.0.1`); the request order; the headers mirroring the
published host — the `Content-Type` map of §7.5 (`.js`
`application/javascript; charset=utf-8`, `.css`
`text/css; charset=utf-8`, and `.json`
`application/json; charset=utf-8` among its entries),
`Cache-Control`, `Last-Modified`, `ETag`, the 304 rules,
`Vary: Accept-Encoding` on every response, and gzip
`Content-Encoding` for `.html`, `.js`, `.css`, `.json`, `.xml`, and
`.svg` when the request accepts it, none for `.gz`; and the one
`sitemap.xml` rewrite. (3) Write the eleven specs of the §7.5
inventory in `subprojects/webapp/playwright/specs/`, one file per row
named exactly as the table names it, each performing every drive and
assertion its row lists — among them the log-scale drive of
`interactions.spec.ts` on [GS-0](pdd.md#102-golden-scenarios) (Empty
scenario (no active slip window), default population) and GS-7 (One
state per simulation trial, no active slip window) and its rejection
at the mode switch; the fragment-free focus, same-page link guard,
skip-link and permalink, and late-commit fragment-entry drives of
`mount.spec.ts`; the missing-stamp, accessible-description,
offset-bound (`1000` accepted, `1000.0001` rejected),
regression-abort, and field-export retry drives of
`failure-states.spec.ts`; the display-only settle, the field-export
arrival during an edit, and the mobile summary and page-scroll
assertions of `keyboard-responsive.spec.ts`; the rapid-change drive
of `a11y.spec.ts`; and the descriptive-label,
helper-line, prototype-notice, emphasis, fallback-link, and resize
assertions of `render.spec.ts`. Every instant step proves itself with
the `window.__greProbe` probe, the first instant entry clicks the
injected `#gre-test-entry` link, and expected values come from the
served tree's reference-results file, re-verified against the pointer
manifest — the lane never rounds a result (§7.5, Expected values).
(4) In `subprojects/webapp/build.gradle.kts`, register the
[DDD §2](ddd.md#2-repository-structure-naming-and-toolchain)
task-table entries `playwrightInstall` — an `NpmTask` running the npm
script `browser-install` (`playwright install chromium`), with
`dependsOn(npmCi)` — and `webappBrowserTest` — an `NpmTask` running
the npm script `browser-test`
(`playwright test --project=desktop --project=mobile`), with
`dependsOn(":subprojects:mkdocs:mkdocsPreview")` and
`dependsOn(playwrightInstall)` — both in no lifecycle task and no CI
job; `subprojects/webapp/README.md` gives both invocations as §7.5
(Invocation) writes them, the lane's and the `measure` diagnostic's.
T-48's preset checks join the inventory when it ships.

**Done when:** `./gradlew :subprojects:webapp:webappBrowserTest`
exits 0 (it builds the preview tree through `mkdocsPreview` and
installs the pinned Chromium through `playwrightInstall`), and
`./gradlew :subprojects:webapp:webappBrowserTest --dry-run` lists
`:subprojects:webapp:playwrightInstall` and
`:subprojects:mkdocs:mkdocsPreview` before
`:subprojects:webapp:webappBrowserTest`;
`./gradlew :subprojects:webapp:tscCheck` exits 0, the type check of
`playwright.config.ts` included;
`ls subprojects/webapp/playwright/specs/*.spec.ts | wc -l` prints 11;
`test -f subprojects/webapp/playwright/global-setup.ts` exits 0, and
`grep -c 'process.execPath' subprojects/webapp/playwright.config.ts`
prints at least 1;
`find subprojects/webapp/build/playwright/test-results -name trace.zip | head -1`
prints a path;
`grep -q 'axe-core-version' subprojects/webapp/build/playwright/report.json`
exits 0;
`grep -c 'webappBrowserTest' subprojects/webapp/README.md` and
`grep -cF 'npx playwright test --project=measure --workers=1' subprojects/webapp/README.md`
each print at least 1;
`./gradlew check --dry-run | grep -cE 'webappBrowserTest|playwrightInstall'`
prints 0, and
`grep -rnE 'webappBrowserTest|playwrightInstall' .github/workflows/`
prints nothing.

#### T-61 — Measurement suite

**Steps.** Per
[DDD §7.6](ddd.md#76-performance-and-compatibility-measurements):
(1) instrumentation — the specs read the five marks of §7.6
(Instrumentation) through the User Timing API and add none: the
`egr:decode-start` and `egr:decode-end` pair is recorded by the
[DDD §5.2](ddd.md#52-artifact-loading-and-decoding) loader (T-30),
`egr:change-accepted` by the handler that accepts a scenario change
([DDD §5.7](ddd.md#57-scenario-controls); T-40), and
`markAfterPaint(name, seq, check, live)` of `src/views/dom/marks.ts`,
with `egr:first-result` after the first commit
([DDD §5.10](ddd.md#510-failure-states), startup step 3) and
`egr:results-updated` in the [DDD §5.3](ddd.md#53-query-engine)
scheduler's frame callback, by T-46. (2) The `measure` specs, files
matching `*.measure.ts` in `subprojects/webapp/playwright/measure/`:
the §7.6 network emulation; the cold and both warm variants with the
per-repetition cache assertion; the load workloads and the three
interaction workloads, each interval pairing the measured change's
`egr:change-accepted` with the `egr:results-updated` of the same
`detail.seq`; 30 measured repetitions per workload, judged
at the nearest-rank 95th percentile, `sorted[28]` of the 30 ascending
samples — a workload within budget exactly when at least 29 of its 30
observed runs are, a sample-based acceptance rule rather than a
guarantee for later runs — reported as `p95_ms`, with minimum, median
(`quantileLinear(sorted, 0.5)` of `src/stats/quantile.ts`), and
maximum reported, plus one extra traced repetition (§7.6 Repetitions
and judging); the payload scope with its two standing assertions; when
`EGR_BASE_URL` is set, the published-site header comparison over
every same-origin request under `BASE_PATH`, per file class; and the
report `build/measure/report.json` with every §7.6 Report field —
the `workloads` array of `id`, `budget_ms`, `samples`, `min_ms`,
`median_ms`, `p95_ms`, `max_ms`, and `within_budget`, and `headers` on
the published-site run among them. The suite records the budget
judgment in `within_budget` and never enforces it: a run fails only
on an invalid repetition or a failed assertion, as §7.6 (Repetitions
and judging) lists them. No measure spec calls `page.route`,
`context.route`, or `routeFromHAR`, or records HAR. (3)
`test/compat.test.ts`, with the required-API inventory in
`test/compat-inventory.ts`, per §7.6 Browser compatibility: the
baseline of
[PDD §9.2 — Browser and mobile baseline (D-16, Proposed)](pdd.md#92-browser-and-mobile-baseline-d-16-proposed)
over `caniuse-lite`, pinned at `1.0.30001687` among the §2 dev
dependencies; the window ending at the dataset's newest browser
release; Android Chrome mapped to the desktop `chrome` versions of the
window; the explicit rows §7.6 lists; and the printed dataset
version, window end, and Android mapping — with
`test/caniuse-lite.d.ts` holding exactly
`declare module 'caniuse-lite';`
([DDD §2](ddd.md#2-repository-structure-naming-and-toolchain),
TypeScript configuration). (4) Run the suite as the §7.6 diagnostic —
at the repository root
`./gradlew :subprojects:mkdocs:mkdocsPreview :subprojects:webapp:playwrightInstall`,
then, in `subprojects/webapp` in the DDD §2 form of Node.js outside
Gradle, `npx playwright test --project=measure --workers=1` — and
from its report record in [DDD §3.8](ddd.md#38-measured-sizes) the
figures the measurement suite supplies: item 1's compressed size as
served, item 2's compressed figure (the artifact's file byte count
plus item 1's compressed size as served), and item 4, moving items 1,
2, and 4 out of the pending list — their size-report figures (T-11)
are recorded by then — and updating the *Contributes to:* line. (5)
Budget evidence is the owner's
([OA-5](#4-owner-and-research-group-actions)), once
[OA-12](#4-owner-and-research-group-actions) is recorded:
`webappMeasureReference` in the T-59 environment on the release
branch, and with `-Pegr.perf.target=published` after the release's
deployment ([DDD §7.7](ddd.md#77-site-validation-and-release-checklist)
item 5). A reference run completes when the measure run exits 0 and
its report is downloaded, and the VM is then destroyed, a budget miss
included; whether the budgets are met is the release's separate
decision, taken on the report (§7.7 item 5). A reference-run budget
miss — a workload whose
`within_budget` is false — is optimized and measured again
([HLDD §7.1 — Performance estimates and verification](hldd.md#71-performance-estimates-and-verification));
a budget that cannot be met escalates to the owner —
[D-9](pdd.md#1-decision-register) (Numeric performance and payload
budgets) is PDD material this plan cannot relax.

**Done when:** `./gradlew :subprojects:webapp:tscCheck` exits 0;
`./gradlew :subprojects:webapp:webappTest` exits 0, its output
containing `1.0.30001687`;
`test "$(cat subprojects/webapp/test/caniuse-lite.d.ts)" = "declare module 'caniuse-lite';"`
exits 0;
`grep -rlE 'page\.route|context\.route|routeFromHAR|recordHar' subprojects/webapp/playwright/measure/`
prints nothing; after
`./gradlew :subprojects:mkdocs:mkdocsPreview :subprojects:webapp:playwrightInstall`,
`npx playwright test --project=measure --workers=1`, run in
`subprojects/webapp` after the DDD §2 PATH export, exits 0, and at the
repository root
`python3 -c "import hashlib, json; r = json.load(open('subprojects/webapp/build/measure/report.json')); e = r['environment']; assert e['kind'] == 'other' and e['instance_type'] is None and e['terraform_version'] is None; w = r['workloads']; assert [x['id'] for x in w] == ['load-cold', 'load-warm-fresh', 'load-warm-revalidating', 'into-gs0', 'into-gs1', 'into-gs6']; assert all(len(x['samples']) == 30 and {'budget_ms', 'min_ms', 'median_ms', 'p95_ms', 'max_ms', 'within_budget'} <= set(x) for x in w); assert all(x['p95_ms'] == sorted(s['ms'] for s in x['samples'])[28] for x in w); assert {'software_version', 'data_version', 'source_commit', 'source_tree_clean', 'base_url', 'network', 'bundle'} <= set(r); assert all(r['bundle'][k]['sha256'] == hashlib.sha256(open('subprojects/webapp/build/dist/app.' + k, 'rb').read()).hexdigest() for k in ('js', 'css'))"`
exits 0 — a diagnostic report, never budget evidence;
`./gradlew :subprojects:webapp:webappMeasureReference --dry-run` lists
`:subprojects:mkdocs:mkdocsPreview` and `:subprojects:webapp:npmCi`
before `:subprojects:webapp:webappMeasureReference` — T-59's wiring,
which resolves once `mkdocsPreview` exists — and executes nothing,
and `./gradlew :subprojects:webapp:webappMeasureReference -Pegr.perf.target=staging`
exits non-zero, its output carrying the message
`egr.perf.target must be 'published' (got 'staging')` of
[DDD §2](ddd.md#2-repository-structure-naming-and-toolchain) — T-59's
`doFirst` refusal;
`sed -n '/^\*\*Pending first generation\*\*/,/^\*Contributes to:\*/p' docs/app/ddd.md | grep -c 'measurement suite'`
prints 0.

#### T-62 — Acceptance walkthrough scripts

**Steps.** (1) Write `docs/app/walkthroughs.md` per
[PDD §10.3 — Acceptance walkthroughs](pdd.md#103-acceptance-walkthroughs):
one scripted demo for each of
[US-1](prd.md#us-1-dam-foundation-scenario),
[US-2](prd.md#us-2-pipeline-crossing), and
[US-3](prd.md#us-3-design-review) — control-by-control steps in the
[DDD §5.7](ddd.md#57-scenario-controls) vocabulary, the golden
scenario it drives, and a
"Pass conditions" section quoting the story's Expected-result
paragraph verbatim and naming its
[SC rows](pdd.md#101-success-criteria). US-1 drives GS-1, which
[PDD §10.2 — Golden scenarios](pdd.md#102-golden-scenarios) names
as US-1. **Escalation:** no document maps US-2 or US-3 to a golden
scenario; draft their steps from the stories, then stop for the
owner to designate the scenario(s) — a PDD-side resolution — before
this body is accepted; the script never picks one silently. The
scripts whose stories end in a download (US-1 and US-3) close with
the reviewer step of the
[SC-2 (download reproducibility)](pdd.md#101-success-criteria) row of
[DDD §7.7](ddd.md#77-site-validation-and-release-checklist): naming
the scenario settings, data-export version, matching-record count,
and every statistic from the downloaded package alone. (2) State in
the file that human reviewers execute the scripts at release (§7.7
item 13) — US-1 by an engineer new to the product, unassisted, for
[SC-1 (core workflow)](pdd.md#101-success-criteria) — that
[US-4](prd.md#us-4-interpreting-observed-deformation) (Interpreting
observed deformation) and
[US-5](prd.md#us-5-teaching-surface-rupture-morphology) (Teaching
surface-rupture morphology) join when their P2 capabilities ship,
and that the reviewer record (name, date, result per script) is the
checklist's evidence.

**Done when:** `grep -c '^## US-' docs/app/walkthroughs.md` prints
3; `grep -c 'Pass conditions' docs/app/walkthroughs.md` prints 3;
the US-1 script names GS-1 and the US-2/US-3 scripts each name the
owner-designated scenario with its decision reference;
`python .github/scripts/check_doc_links.py` exits 0.

#### T-63 — Release vintage (owner)

**Steps** (owner-run, agent-prepared). (1) Decide reuse or refresh
from the owner's record, per the two release shapes of
[DDD §7.7](ddd.md#77-site-validation-and-release-checklist): the
committed pointer manifest unchanged since T-18, no new data drop,
and `config.LABELED_FIELD_EVENTS` unchanged since the vintage's
`tag_commit` — a vintage carries the membership the constant held at
its export, and the recorded
[OA-14](#4-owner-and-research-group-actions) membership may change it
([DDD §3.4](ddd.md#34-field-data-export), Labeled set) — and a terms
file that holds the confirmed record mean the T-18 vintage is reused;
otherwise the release publishes a new vintage. A vintage exported
under the assumed record serves only the unlisted prototype, so a
T-18 vintage published in Phase 1 is replaced here
([DDD §4.4](ddd.md#44-licensing-archival-distribution-and-release-attachments),
Vintage terms; §7.7 item 17). Regeneration
(`egr-export-app --reproduce`,
[DDD §4.3](ddd.md#43-retention-rollback-recovery-and-withdrawal))
publishes nothing and plays no part in this decision. (2) Reuse path
— verify the vintage's recorded publication evidence per §7.7,
regenerating nothing: the committed pointer manifest; the publication
record `dist/app/<data_tag>.publication.json` of the retained copy and
its copy in the data release's body
(`gh release view <data_tag> --json body`); the §4.3 retention check,
`gh release download <data_tag> --dir <empty temporary directory>`
yielding exactly the files the pointer names, each with the pointer's
SHA-256; and CI's fetch-and-verify green on the current `main` head
(the release commit's own runs are checklist item 1, T-65). (3)
Refresh path — the T-18 sequence for the next tag `data-vN`, once
[OA-13](#4-owner-and-research-group-actions)'s final texts and the
confirmed [OA-1](#4-owner-and-research-group-actions) record are
committed:
`./gradlew :subprojects:python:publishVintage -Pdata.tag=data-vN`,
whose one run checks the permission gate (the OA-1 record line, the
`README.md` and `LICENSE-docs` wording, and release immutability,
OA-11), exports,
runs the full-data checks against the staged vintage, publishes the
prerelease, and writes the publication record
([DDD §4.2](ddd.md#42-publication-of-a-data-vintage) steps 1–10);
then the step-11 pointer commit `Data vintage data-vN`, with
`git add` before the path-limited commit as step 11 writes it, and
its pull request merged into `main`, which makes the vintage
current; checklist items 2 and 3 are filled from the publication
record.

**Done when** (recorded artifacts, never an agent act): either the
reuse record — the retention-check output naming every pointer file
with an equal SHA-256, the publication record, and the green
fetch-and-verify runs (`gh run list --commit <sha>`) — or the refresh
record — `gh release view data-vN --json isDraft,isPrerelease`
reporting `isDraft` false and `isPrerelease` true; the publication
record carrying `published_at`, the `pytest_full_data` summary line,
and `size_report`; `git rev-parse HEAD^` at the pointer commit
printing the record's `tag_commit`; CI green end to end on that
commit; and `git show origin/main:subprojects/webapp/data/pointer.json`
naming `data_tag` `data-vN` with the published SHA-256s. In both
shapes the release checklist names the vintage and its evidence, and
`grep -cxE 'Confirmed: [0-9]{4}-[0-9]{2}-[0-9]{2}' dist/app/<data_tag>/data-terms-*.txt`
prints 1 for the vintage the release pins — the condition of §7.7
item 17.

#### T-64 — Rollback rehearsal (owner)

**Steps** (owner-run, agent-prepared; before T-55's activation
commit, while the scenario page is drafted or unlisted
([DDD §6.1](ddd.md#61-build-outputs-asset-paths-and-page-scaffold)),
so the redeploy after the rehearsal's net-zero merge changes nothing
on the site and has no public effect).
(1) On a branch off `main`, commit a deliberate bad pin — edit
`subprojects/webapp/data/pointer.json` to a scratch `data_tag` — then
`git revert` that commit, restoring the published vintage's pointer:
the pointer-manifest revert of
[DDD §4.3](ddd.md#43-retention-rollback-recovery-and-withdrawal),
exercised on the published vintage. (2) Push both commits together
and open a pull request: the Tests and Companion site workflows
validate the reverted state — both **Parity** steps and the
**Stage scenario assets** step re-fetch and checksum-verify every
pointer-named file, and **Build site** and **Build preview site** run
both strict builds with the site checks hook
([DDD §6.3](ddd.md#63-ci-workflows);
[DDD §7.7](ddd.md#77-site-validation-and-release-checklist), Site
validation) — while `deploy` does not run. (3) The owner authorizes and
merges it by a merge commit (DDD §6.3, Required checks); the net-zero
merge changes no files, so no push filter of
§6.3 matches and no main-branch run starts — the owner starts Tests
and Companion site on `main` with `workflow_dispatch` (the §6.3 manual
backstop), which applies the validation and deployment checks and
redeploys the unchanged site. (4) Record the pair the reverted state
checked — the application commit and the vintage (§4.3, Rollback).
(5) Run the §4.3 retention check against the vintage the revert
restored:
`gh release download <data_tag> --dir <empty temporary directory>`
yields exactly the files that pointer names, each with its SHA-256
(§4.3, Retention), recording which vintage the output names. The
rehearsal exercises the revert and names no rollback target: the
first release's checklist item 12 records
`no rollback target: first release`
([DDD §7.7](ddd.md#77-site-validation-and-release-checklist)).

**Done when** (recorded artifacts): the rehearsal pull request with
the bad-pin and revert commits exists and was merged before the T-55
activation commit; its green pull-request runs and the
`workflow_dispatch` runs on `main` are referenced from it, with the
recorded application–vintage pair; the retention-check output —
every SHA-256 equal — is recorded with the rehearsal, dated and
naming the vintage.

#### T-65 — v0.3 release (owner)

**Steps** (owner-run, agent-prepared). (1) Preconditions: the
commits of the release-branch order of
[§3](#3-gates-and-release-sequence) — OA-3's D-10 commit, T-52's
glossary commit, T-55's activation commit, and the
[OA-4](#4-owner-and-research-group-actions) record — on
the release branch of T-55 step (2), with CI green; the OA-7
decision fixes version and contents; the
[OA-6](#4-owner-and-research-group-actions) record, checked before
the release is cut by the check OA-6 names: the file
`docs/app/approvals/zenodo-YYYY-MM-DD.md` exists and names one of
its two lines; the G-1, G-4, G-5, and G-6 records of §3 in hand;
T-63's vintage evidence and T-64's rehearsal records in hand.
(2) On the release branch, set the `version` key in `CITATION.cff`
and `.zenodo.json` to the decided version
([PDD §9.4 — Releases](pdd.md#94-releases)) and commit: the release
commit. (3) Before the merge, on the release
commit ([DDD §7.7](ddd.md#77-site-validation-and-release-checklist):
the checks run on the release branch before the merge that releases
the change), fill a copy of `docs/app/release-checklist.md`: item 1
(`gh run list --commit <release sha>`, with the compatibility test's
printed dataset version and window end); items 2 and 3 for a vintage
release (T-63); item 4,
`./gradlew :subprojects:webapp:webappBrowserTest`, whose
`playwrightInstall` dependency first installs the pinned Chromium;
item 5 (a), `./gradlew :subprojects:webapp:webappMeasureReference` in
the T-59 environment ([OA-5](#4-owner-and-research-group-actions)),
completed — its measure run exiting 0, its report downloaded, the VM
destroyed — with a report recording `environment.kind` `aws-ec2`, the
instance type, region, and AMI of
[DD-12](ddd.md#1-ddd-decision-register)
(Performance reference environment), the DD-12 `network` values, its
`terraform_version`, and `source_tree_clean` true, the release then
accepted on that report, a decision separate from the run's
completion, only when every workload's `within_budget` is true;
items 6–9; item 12, which for this first software release records
`no rollback target: first release`
([DDD §4.3](ddd.md#43-retention-rollback-recovery-and-withdrawal),
Rollback);
item 13, the walkthroughs with human reviewers; item 14, the
assistive-technology pass; item 15, the engine and mobile-browser
procedure, its `serve.mjs` started as the procedure states, in the
form of Node.js outside Gradle of
[DDD §2](ddd.md#2-repository-structure-naming-and-toolchain); and
item 16, `python3 .github/scripts/check_traceability.py --release`
(T-04), exiting 0; and item 17, the data-terms search printing 1 —
the pinned vintage's terms file holds the confirmed record (T-63).
G-2 and G-3 are recorded from these. (4) After
`git fetch origin`, check that
`git merge-base --is-ancestor origin/main <release sha>` exits 0 —
the release branch contains `main` — then merge the release pull request
by a merge commit ([DDD §6.3](ddd.md#63-ci-workflows), Required checks)
and, for that merge commit `<main sha>`
(`git rev-parse origin/main` after another `git fetch origin`), check
that `git diff --quiet <release sha> <main sha>` exits 0; the push
run on `main` deploys the activated page, the glossary additions, and
the new footer stamp
([DDD §6.2](ddd.md#62-software-and-data-version-stamps)). Record the
two `webapp-dist` digest pairs of the build identity of
[DDD §7.7](ddd.md#77-site-validation-and-release-checklist)
(Evidence ledger) — of item 1's Companion site run and of the
Companion site push run on `<main sha>` — each in a new empty
temporary directory with
`gh run download <run id> --name webapp-dist --dir <that directory>`,
then `shasum -a 256 app.js app.css` in it. After that deployment,
item 5 (b):
`./gradlew :subprojects:webapp:webappMeasureReference -Pegr.perf.target=published`
completes, its measure run exiting 0, so the header sets match, its
report recording the same environment and `network` values, its cold and
fresh-warm workloads reading `within_budget` true, and its `bundle`
digests equal to both recorded pairs — a miss or a differing digest
reopens the release.
(5) Create the annotated tag on `<main sha>`, push it, and create
the draft release with
`gh release create <software tag> --verify-tag --draft`
([DDD §4.4](ddd.md#44-licensing-archival-distribution-and-release-attachments));
on the draft, run item 10 — with `<release tag>` the software tag,
`git archive --format=tar <release tag> | tar -tf - | grep -cE '(^|/)fig-[^/]*$'`
prints 0, the G-6 release-time form — and item 11: the checklist's
§4.4 command block, which attaches the files the pointer names from
the retained copy (restored first with
`gh release download <data_tag> --dir dist/app/<data_tag>` on a
machine without it) and the dashboards' plotting CSVs that it
regenerates in `dist/csv/` with `egrBuildAndExport`
([`notes/Roadmap.md` — Decisions made](../../notes/Roadmap.md#decisions-made)),
then every data asset the pointer names re-downloaded and its SHA-256
compared with the pointer, and
`gh api repos/HarvardRC/eps-ground-rupture/immutable-releases --jq .enabled`
printing `true`. (6) Complete the evidence ledger of §7.7 — one row
per item and per separately evidenced check inside an item (each
workflow run of item 1, each report of item 5), and one row per
`test`, `measure`, or `release` Check of every
[DDD §8](ddd.md#8-traceability) row whose Status is neither
`parked`, `deferred`, nor `n/a`; each row names the release revision,
the release commit, except the rows of items 2 and 3, which name the
publication record's `tag_commit`, and the rows of items 5 (b) and
10, which name `<main sha>`; the row of item 5 (b) reads `pass` only
when the build identity of §7.7 holds — the two digest pairs of step
(4) and its report's `bundle` digests equal — and its report's
`software_version` and `data_version` equal the release commit's
`CITATION.cff` version and its pointer's `export_version` —
then paste the filled checklist into the draft's description, the
§7.7 release record, and publish it with
`gh release edit <software tag> --draft=false`.

**Done when** (recorded artifacts):
`gh release view <software tag> --json isDraft,body` shows `isDraft`
false and a body that is the filled checklist, every item that
applies to the release with its evidence, ending with the evidence
ledger complete — every row reading `pass` and naming the revision
§7.7 assigns it; the item-11 comparison shows every data asset
byte-identical to the pointer's and the immutability command printing
`true`; the item-10 listing prints 0 and the item-17 search 1;
`git show <software tag>:CITATION.cff | sed -n 's/^version: *//p'`
prints the released version;
`git rev-parse '<software tag>^{commit}'` prints `<main sha>` and
`git diff --quiet <release sha> <software tag>` exits 0; the G-2–G-5
approval references resolve to dated records.

## 3. Gates and release sequence

The gates are the PDD's success criteria and the HLDD's required
checks — nothing new. Each is scheduled here and assigned an
executor; the IP schedules the checks, it does not define them. In
the phases of
[ADR-0017 — An unadvertised prototype deployment precedes the public release](../adr/0017-unadvertised-prototype-before-public-release.md)
(Proposed), Phase 1 has two gates: G-1 in its Phase-1 form, before
the first vintage upload (T-18), and G-6, from the first deploy; the
prototype deployment, T-54, is gated by G-6 with the CI gates and the
site checks hook
([DDD §7.7](ddd.md#77-site-validation-and-release-checklist),
Phases). G-1's Phase-2 form and G-2–G-5 apply, with G-6, at the
release that activates the scenario page and at every release after
it.

| Gate | Content | Verified by | Assigned to |
|---|---|---|---|
| G-1 | Licensing terms recorded and release immutability enabled before the first vintage upload — assets on a public repository are public and a published vintage is never modified, so this precedes T-18 — in the two forms of ADR-0017: in Phase 1, the owner-committed `data/REDISTRIBUTION.md` stating the assumed terms with the assumed [OA-1](#4-owner-and-research-group-actions) record; from Phase 2, the final texts of [OA-13](#4-owner-and-research-group-actions) with the confirmed record, which the vintage pinned by the release that activates the page, and by every later release, carries ([DDD §4.4](ddd.md#44-licensing-archival-distribution-and-release-attachments), Vintage terms). The T-15 drills reach no GitHub repository: they run against a stub `gh`. | `data/REDISTRIBUTION.md` holding exactly one OA-1 record line — the assumed record in Phase 1, the confirmed record from Phase 2 — beside the per-source terms and attributions, and `README.md` and `LICENSE-docs` each naming that file; and [OA-11](#4-owner-and-research-group-actions), done 2026-10-30. `publishVintage` step 1 refuses to run unless all hold ([DDD §4.2](ddd.md#42-publication-of-a-data-vintage)), and release-checklist item 17 requires the confirmed record in the pinned vintage's terms file ([DDD §7.7](ddd.md#77-site-validation-and-release-checklist)). | Owner (OA-1 in Phase 1; OA-11); owner with the research group (OA-13; OA-1 in Phase 2). |
| G-2 | [SC-1](pdd.md#101-success-criteria)–SC-4: core workflow, download reproducibility, correctness parity, performance budgets. | Parity harness (T-35, run by both **Parity** steps of [DDD §6.3](ddd.md#63-ci-workflows)); browser lane (T-60; [DDD §7.7](ddd.md#77-site-validation-and-release-checklist) item 4); the reference-environment report of item 5 from a completed run, `environment.kind` `aws-ec2` on the instance type, region, and AMI of [DD-12](ddd.md#1-ddd-decision-register) (Performance reference environment) with the DD-12 `network` values, the release accepted on it — a decision separate from the run's completion — only when every workload's `within_budget` is true (T-59, T-61); walkthroughs (T-62; item 13); the manual engine and mobile-browser pass (item 15). | Agent implements and runs in development, the reference measurement excepted; at release the owner runs the lane, the reference measurement, and the engine pass ([OA-5](#4-owner-and-research-group-actions)), human reviewers run the walkthroughs (SC-1 needs a product-naive engineer), and the owner accepts. |
| G-3 | [SC-5](pdd.md#101-success-criteria) candor and [SC-6](pdd.md#101-success-criteria) site integrity. | Browser lane (T-60) and site validation: both strict builds with the site checks hook (T-03, T-51; [DDD §7.7](ddd.md#77-site-validation-and-release-checklist), Site validation). | Agent implements; the owner runs at release and accepts. |
| G-4 | [SC-7](pdd.md#101-success-criteria) scientific sign-off: the research group has approved the reader-facing texts — the [PDD §5 — Copy deck](pdd.md#5-copy-deck) texts, every fixed-here text `check_pdd_agreement.py` lists, in `copy.json` or between copy markers ([DDD §5.13](ddd.md#513-application-configuration)), and the glossary additions of [DDD §6.4](ddd.md#64-product-pages-beyond-the-scenario-page-p2p3) — after T-52's glossary commit and T-55's activation commit, which removes the prototype notice, and before the release merge, in the release-branch order below. | A recorded approval ([OA-4](#4-owner-and-research-group-actions)) in the form of the SC-7 approval record of [DDD §7.7](ddd.md#77-site-validation-and-release-checklist), whose listing the release checklist (item 6, SC-7 row; T-65) compares with the step-8 listing at the release commit. | Research group; owner records. |
| G-5 | [D-10](pdd.md#1-decision-register) liability text authored or sourced — no placeholder is ever publicly activated (T-55) or released; the unlisted prototype shows PDD §5.1's pending slot as drafted (ADR-0017). | The release checklist's D-10 check — the item-7 search over `site/` and `site-preview/` printing nothing ([DDD §7.7](ddd.md#77-site-validation-and-release-checklist)) — and the record of [OA-3](#4-owner-and-research-group-actions), the dated owner commit that lands the text, by the checks OA-3 names. | Product owner. |
| G-6 | [R-12](prd.md#93-content-and-media-dependencies): no third-party photograph in any public deploy, site tree, or release archive without documented permission — live from the first deploy, not only when a media surface ships (the zero-`fig-*` archive check in T-65 is its release-time form). | The site checks hook's arms (a) and (b) in every build, from T-03 on ([DDD §6.1](ddd.md#61-build-outputs-asset-paths-and-page-scaffold); §7.7 item 9), and the T-65 archive check (item 10); permission records from [OA-8](#4-owner-and-research-group-actions). | Research group supplies records; build enforces. |

**Owner-action prerequisites.** Beside the gates, these owner
actions precede the tasks named. Each stands in its task's Depends-on
column ([Task format](#task-format)), so the
[Scheduling model](#scheduling-model) waits for its record, and the
task's body says what work may begin before it. No Phase-1 task
waits for a Phase-2 action:

| Owner action | Phase | Precedes | Ground |
|---|---|---|---|
| [OA-17](#4-owner-and-research-group-actions) | 1 | T-18, T-54 | ADR-0017 is Proposed, and the DDD's [Authority and change control](ddd.md#authority-and-change-control) holds the first data vintage published under its assumed terms, and the prototype deployment, until the owner accepts it. |
| [OA-1](#4-owner-and-research-group-actions) | 1, then 2 | T-18 (the assumed record); T-63 (the confirmed record) | `publishVintage` step 1 requires exactly one OA-1 record line in `data/REDISTRIBUTION.md` ([DDD §4.2](ddd.md#42-publication-of-a-data-vintage)), and the first vintage upload is public (G-1); the release that activates the page pins a vintage whose terms file holds the confirmed record ([DDD §7.7](ddd.md#77-site-validation-and-release-checklist), item 17). |
| [OA-10](#4-owner-and-research-group-actions) | 1 | T-54, T-55 | The `main` ruleset of [DDD §6.3](ddd.md#63-ci-workflows) protects the prototype deployment's merge and every merge after it, the release merge among them. |
| [OA-3](#4-owner-and-research-group-actions) | 2 | T-52, T-55 | No placeholder liability text is ever publicly activated (G-5): one dated owner commit replaces PDD §5.1's bracketed slot, in the PDD and in `scenario.md`'s `#gre-disclaimer`, with the D-10 text, the first commit of the release-branch order below, before T-52's glossary commit. |
| [OA-4](#4-owner-and-research-group-actions) | 2 | T-65 | The research group's approval of the reader-facing texts, the record G-4 checks, is printed after T-52's glossary commit and T-55's activation commit, which removes the prototype notice, and precedes the release merge that makes those texts public; T-65 compares the newest record's listing with the step-8 listing at the release commit ([DDD §7.7](ddd.md#77-site-validation-and-release-checklist), SC-7 approval record). |
| [OA-6](#4-owner-and-research-group-actions) | 2 | T-65 | The Zenodo GitHub integration archives only releases published after it is enabled, and the DOI route runs through the first GitHub release; T-65 checks the record before the release is cut. |
| [OA-7](#4-owner-and-research-group-actions) | 2 | T-65 | The first release's version and contents are decided before it is cut. |
| [OA-12](#4-owner-and-research-group-actions) | 2 | T-59, and so every reference run (OA-5's runs for T-61 and T-65 item 5) | [ADR-0016 — Performance reference environment — an on-demand AWS VM defined by Terraform](../adr/0016-performance-reference-environment.md) is Proposed, and dependent work waits for its acceptance (the DDD's [Authority and change control](ddd.md#authority-and-change-control)). |
| [OA-13](#4-owner-and-research-group-actions) | 2 | T-63 | The vintage that the release activating the page pins carries the final texts with the confirmed record ([DDD §4.4](ddd.md#44-licensing-archival-distribution-and-release-attachments), Vintage terms), which `publishVintage` step 1 checks ([DDD §4.2](ddd.md#42-publication-of-a-data-vintage)); in Phase 1 the owner's file of OA-1 stands in, and rule `inputs-present` of [DDD §4.1](ddd.md#41-export-task-and-validation) lets the development exports of T-11–T-17 run without either. |
| [OA-14](#4-owner-and-research-group-actions) | 2 | T-55, T-63 | The activation makes the field overlay's default set public: `LABELED_FIELD_EVENTS`, and the pinned vintage exported from it, carry the recorded [D-18](pdd.md#1-decision-register) (Field-overlay default set and per-source analogue map) membership ([DDD §3.4](ddd.md#34-field-data-export), Labeled set); until then the constant holds the Proposed reading, which the development exports and the T-18 vintage carry. |
| [OA-16](#4-owner-and-research-group-actions) | 2 | T-59 | The `ami_id` default of `subprojects/webapp/perf/variables.tf` is read with AWS credentials, which the agent never holds ([DDD §7.6](ddd.md#76-performance-and-compatibility-measurements), Reference environment). |

The prototype deployment that closes Phase 1, T-54, is a merge into
`main`, not a release: it uses no release branch, and the release
checklist does not apply to it
([DDD §7.7](ddd.md#77-site-validation-and-release-checklist),
Phases). The data-refresh and release sequence instantiates
[HLDD §9 — Testing and release
architecture](hldd.md#9-testing-and-release-architecture) (Data
refresh and deployment) step by step, with its step 7 release checks
mapped to G-2–G-4 (G-4 as the recorded-approval check), executed
through T-60–T-62 and the reference measurement of T-59 and T-61 —
on the DD-12 environment, once OA-12 is recorded — by the owner
(OA-5) and human reviewers. The checks run on the release branch
before the merge that releases the change, except the
published-site measurement of item 5, which follows the deployment,
and items 10 and 11, which run on the software release's tag while
its release is still a draft
([DDD §7.7](ddd.md#77-site-validation-and-release-checklist);
[DDD §4.4](ddd.md#44-licensing-archival-distribution-and-release-attachments)).
On the release branch of T-55 step (2), the commits that carry or
approve reader-facing texts land in one order, the release-branch
order that T-52, T-55, and T-65 cite: OA-3's D-10 commit; T-52's
glossary commit; T-55's activation commit, which removes the
prototype notice; the OA-4 record, its step-8 listing printed at that
commit or later
([DDD §7.7](ddd.md#77-site-validation-and-release-checklist), SC-7
approval record); then T-65's release commit and the merge. These
commits stay unpublished until that merge, which the OA-4 record
precedes, so one approval covers the release.
A software-only release uses the currently pinned vintage, verifies
its recorded publication evidence, and regenerates nothing; the
full-data checks run, inside `publishVintage`, only when a new
vintage is published
([DDD §4.2](ddd.md#42-publication-of-a-data-vintage)). Until T-54's
merge every deploy carries the scenario page as a draft, absent from
the site tree, sitemap and search index; from that merge until the
release merge that carries T-55's activation commit, it carries the
unlisted prototype — deployed, out of the nav, the sitemap, and the
search index, linked from no other page, and showing the prototype
notice
([DDD §6.1](ddd.md#61-build-outputs-asset-paths-and-page-scaffold)),
so intermediate merges publish no listed product surface. If
[D-6](pdd.md#1-decision-register) is still open as the release nears,
the sources conflict — the preset ships only after D-6
([PDD §4.7 — Kern County worked example (FR-O6, D-6
Open)](pdd.md#47-kern-county-worked-example-fr-o6-d-6-open)), yet
FR-O6 is a P1 requirement — and the owner decides whether v0.3 waits
for D-6 or the P1 scope is formally amended (a PRD/PDD change this
plan cannot make); T-48 and GS-3 join when D-6 is decided
([PDD §10.2 — Golden scenarios](pdd.md#102-golden-scenarios)). The
release record identifies the software revision (the 40-hex commit),
the pointer-manifest revision and data vintage, the test-suite and
lane versions with their results, and the approval references, and it
ends with the evidence ledger
([DDD §7.7](ddd.md#77-site-validation-and-release-checklist)).

## 4. Owner and research-group actions

Acts the agent never performs. The actions themselves — what each
is, its phase, and the task it must precede — are the owner's list in
[`notes/Roadmap.md` — Ground Rupture Explorer — owner actions (opened 2026-10-30)](../../notes/Roadmap.md#ground-rupture-explorer--owner-actions-opened-2026-10-30);
[§3](#3-gates-and-release-sequence) places each in the task graph.
This section keeps, per stable ID, what the tasks and gates verify:
the identified, dated record each action produces and its check. No
ID is reused; OA-15 is retired
([How this document fills in](#how-this-document-fills-in)).

- **OA-1** — the licensing-terms record of
  [G-1](#3-gates-and-release-sequence), Phase 1, then Phase 2: exactly
  one OA-1 record line in `data/REDISTRIBUTION.md`
  ([DDD §4.2](ddd.md#42-publication-of-a-data-vintage) step 1). In
  Phase 1, before T-18, the assumed record, a line equal to
  `Assumed YYYY-MM-DD: code Apache-2.0, prose CC BY 4.0, derived data exports CC BY 4.0 with per-source attribution — pending research-group confirmation`,
  in the file the owner commits stating those terms, with the
  `README.md` and `LICENSE-docs` lines that name it
  ([DDD §4.4](ddd.md#44-licensing-archival-distribution-and-release-attachments),
  Vintage terms); in Phase 2, before T-63, the confirmed record, the
  line `Confirmed: YYYY-MM-DD`, in its place beside OA-13's final
  texts. Its check, which T-18 and T-63 run and `publishVintage`
  step 1 repeats:
  `grep -cxE 'Assumed [0-9]{4}-[0-9]{2}-[0-9]{2}: code Apache-2\.0, prose CC BY 4\.0, derived data exports CC BY 4\.0 with per-source attribution — pending research-group confirmation|Confirmed: [0-9]{4}-[0-9]{2}-[0-9]{2}' data/REDISTRIBUTION.md`
  prints 1 — in Phase 2,
  `grep -cxE 'Confirmed: [0-9]{4}-[0-9]{2}-[0-9]{2}' data/REDISTRIBUTION.md`
  prints 1 — and
  `grep -L 'data/REDISTRIBUTION.md' README.md LICENSE-docs` prints
  nothing; release-checklist item 17 checks the pinned vintage's
  terms file (T-65).
- **OA-2** — the [D-6](pdd.md#1-decision-register) (Kern County
  field-data group and principal-width rule) decision, by the research
  group, Phase 2, before T-48: the record is the PDD decision-register
  row D-6 reading `Decided (YYYY-MM-DD)`, landed in a dated owner
  commit; its check, which T-48 runs:
  `grep -cE '^\| D-6 \|.*\| Decided \([0-9]{4}-[0-9]{2}-[0-9]{2}\) \|' docs/app/pdd.md`
  prints 1. [GS-3](pdd.md#102-golden-scenarios) (Kern preset (after
  D-6)) joins the reference results with it (T-13, T-63).
- **OA-3** — the [D-10](pdd.md#1-decision-register)
  (Liability-limitation text referenced by CR-4) text (G-5), Phase 2,
  before T-52 and T-55: the record is the one dated owner commit, the
  first of the release-branch order of §3, that replaces PDD §5.1's
  bracketed slot "[the project's liability limitations — text
  pending, D-10]" with the same words in `docs/app/pdd.md` and in
  `scenario.md`'s `#gre-disclaimer` block. Its check, which T-55 runs:
  `grep -c 'text pending, D-10'` prints 0 on `docs/app/pdd.md` and on
  `subprojects/mkdocs/docs/scenario.md`, and
  `python3 .github/scripts/check_pdd_agreement.py` and
  `python3 .github/scripts/check_doc_links.py` exit 0 — the commit
  keeps the PDD heading anchors that copy markers, `source` fields,
  and links cite, `#51-standing-disclaimer-cr-4-d-10-open` among
  them, or updates every reference in the same commit
  ([DDD §5.13](ddd.md#513-application-configuration), steps 3 and 7).
- **OA-4** — the research group's approval of the reader-facing texts
  (G-4, [SC-7](pdd.md#101-success-criteria) (scientific sign-off)),
  Phase 2, after T-55's activation commit and before T-65's release
  merge, in the release-branch order of §3: the
  [PDD §5 — Copy deck](pdd.md#5-copy-deck) texts, every fixed-here
  text `check_pdd_agreement.py` lists, in `copy.json` or between copy
  markers ([DDD §5.13](ddd.md#513-application-configuration)), and the
  glossary additions of
  [DDD §6.4](ddd.md#64-product-pages-beyond-the-scenario-page-p2p3).
  The record is the SC-7 approval record of
  [DDD §7.7](ddd.md#77-site-validation-and-release-checklist), the
  dated file `docs/app/approvals/sc7-YYYY-MM-DD.md`; its check, which
  T-65 runs (item 6, SC-7 row): the newest record's listing equals,
  line for line, the step-8 listing printed at the release commit.
- **OA-5** — the release-time checks the owner runs on the release
  branch (G-2, G-3), Phase 2, for T-61's budget evidence and for
  T-65: the browser lane (item 4), the reference measurement in the
  T-59 environment (item 5), the walkthroughs with human reviewers, a
  product-naive engineer among them for
  [SC-1 (core workflow)](pdd.md#101-success-criteria) (item 13), and
  the manual engine and mobile-browser pass (item 15) of
  [DDD §7.7](ddd.md#77-site-validation-and-release-checklist). The
  record is each item's evidence in the filled release checklist —
  for item 5, the report directories
  `subprojects/webapp/build/perf/<run_id>/`: a reference run completes
  when its measure run exits 0 with its report downloaded and the VM
  destroyed — after a failed final destroy, by `webappMeasureDestroy`
  (DDD §7.6 step 7) — a budget miss included, and the release is
  accepted on the report, a separate decision, only when every
  workload's `within_budget` is true. T-61 and T-65 check them; the
  reference runs wait for OA-12.
- **OA-6** — the Zenodo GitHub integration and the dataset-record
  deposit decision
  ([`notes/Roadmap.md` — Decisions made](../../notes/Roadmap.md#decisions-made)),
  Phase 2, before T-65 cuts the first release: the record is a dated
  file the owner commits, `docs/app/approvals/zenodo-YYYY-MM-DD.md`,
  holding one of two lines:
  `Zenodo GitHub integration enabled for HarvardRC/eps-ground-rupture`
  or `deposit deferred: <reason>`. Its check, which T-65 runs before
  cutting the release:
  `grep -lE '^(Zenodo GitHub integration enabled for HarvardRC/eps-ground-rupture|deposit deferred: .+)$' docs/app/approvals/zenodo-*.md`
  prints at least one path. A repository admin may also confirm the
  first line in the repository's webhook listing,
  `gh api repos/HarvardRC/eps-ground-rupture/hooks` — an optional
  confirmation, not the check.
- **OA-7** — the first release's contents and version, Phase 2,
  before T-65 cuts it (tags v0.2.0–v0.2.2 exist; no GitHub release
  yet): the record is the version that T-65 step (2) writes to
  `CITATION.cff` and `.zenodo.json` and the contents its release
  record lists; its check is T-65's Done-when,
  `git show <software tag>:CITATION.cff | sed -n 's/^version: *//p'`
  printing the released version.
- **OA-8** — photograph permission records (G-6), in either phase,
  before any third-party media enters a deploy or archive: the record
  is each file's documented permission — from P2, the media-index
  entry whose `permission.status` is `granted` — and its check is the
  site checks hook's arm (b), which admits a media file to a build
  only when the allowlist lists it or such an entry grants it
  ([DDD §6.1](ddd.md#61-build-outputs-asset-paths-and-page-scaffold);
  T-03, T-51).
- **OA-9** — the operational executions assigned to the owner in
  [§2](#2-task-graph): in Phase 1, T-18 and the merge of T-54; in
  Phase 2, T-63, T-64, T-65, and the refresh sequence. Each record is
  its task's Done-when record.
- **OA-10** — the `main` ruleset of
  [DDD §6.3](ddd.md#63-ci-workflows) (Required checks; Proposed),
  Phase 1, after T-23 has run once, so that every check name exists,
  and before T-54: the record is the ruleset — the required status
  checks `pytest`, `webapp-test`, `webapp-bundle`, `build`, and `links`;
  not strict; repository admins may bypass it, in the bypass mode Always
  allow (`bypass_mode` `always`), not For pull requests only — the
  reading of [ADR-0015](../adr/0015-golden-scenario-parity.md)'s "a
  parity failure blocks merge" that DDD §6.3 states and the owner
  accepts with this action; and no linear-history rule, since pointer
  and release-branch merges into `main` are merge commits (DDD §6.3,
  Required checks). Its planned check, which T-54 and T-55 rely on,
  is §6.3's: a pull request touching only `docs/` reports all five
  required checks, none Pending.
- **OA-11** — GitHub release immutability on the repository (G-1),
  Phase 1: done by the owner on 2026-10-30. Its check is
  `gh api repos/HarvardRC/eps-ground-rupture/immutable-releases --jq .enabled`,
  which prints `true` while the setting holds; `publishVintage` step 1
  (T-18, T-63) and release-checklist item 11 (T-65) run it
  ([DDD §4.2](ddd.md#42-publication-of-a-data-vintage);
  [DDD §7.7](ddd.md#77-site-validation-and-release-checklist)), and
  the stub `gh` of the T-15 drills answers it.
- **OA-12** — the acceptance of
  [ADR-0016 — Performance reference environment — an on-demand AWS VM defined by Terraform](../adr/0016-performance-reference-environment.md)
  (Proposed 2026-10-30) under the repository's ADR process, Phase 2,
  before T-59 and so before every reference run
  ([Authority and change control](ddd.md#authority-and-change-control)):
  the record is the ADR's status line, and its row in
  `docs/adr/README.md`, reading Accepted in a dated commit; its check:
  `grep -cF -e '- **Status**: Accepted' docs/adr/0016-performance-reference-environment.md`
  prints 1. Accepting the ADR includes one sweep commit after that
  record, which the agent prepares on request: it updates the ADR's
  other Proposed mentions, its "(Proposed)" labels included, in the DDD,
  this plan, the HLDD, `notes/Roadmap.md`, and `docs/adr/README.md`, and
  is not part of the record.
- **OA-13** — the final licensing texts, written with the research
  group, Phase 2, before T-63 publishes the vintage that the
  activating release pins: in `data/REDISTRIBUTION.md`, the
  per-source terms and attributions for the DEM, FDHI, SURE, and Kern
  County sources, and the Licensing section of `README.md` and
  `LICENSE-docs` that distinguishes application code, raw inputs, and
  distributed derived exports, each naming `data/REDISTRIBUTION.md`
  ([DDD §4.4](ddd.md#44-licensing-archival-distribution-and-release-attachments),
  Vintage terms), replacing the Phase-1 texts of OA-1. The record is
  the dated owner commit that lands them, with or before OA-1's
  confirmed record; its check, which T-63 runs through
  `publishVintage` step 1 and T-65 through item 17: OA-1's Phase-2
  check, with
  `grep -L 'data/REDISTRIBUTION.md' README.md LICENSE-docs` printing
  nothing. Rule `inputs-present` of
  [DDD §4.1](ddd.md#41-export-task-and-validation) requires the file
  in every export run whose tag is not `data-v0-test`, so the agent's
  development exports wait for neither text.
- **OA-14** — the membership of the
  [D-18](pdd.md#1-decision-register) (Field-overlay default set and
  per-source analogue map) default set for each field source — the
  FDHI labeled events, and whether, and which, SURE and Kern County
  rows are members — with research-group review, Phase 2, before T-55
  and T-63: the record is the PDD decision-register row D-18 reading
  `Decided (YYYY-MM-DD)`, with
  [PDD §4.4 — Field overlay (FR-O5, D-18 Proposed)](pdd.md#44-field-overlay-fr-o5-d-18-proposed)
  naming, per source, the member events or "all rows", landed in a
  dated owner commit; its check:
  `grep -cE '^\| D-18 \|.*\| Decided \([0-9]{4}-[0-9]{2}-[0-9]{2}\) \|' docs/app/pdd.md`
  prints 1. `LABELED_FIELD_EVENTS`
  ([DDD §3.4](ddd.md#34-field-data-export), Labeled set) holds the
  Proposed reading until then (T-10) and takes the recorded
  membership in a separate commit, a change to the constant alone,
  which T-55 checks with the record. The PDD commit keeps the PDD
  heading anchors that copy markers, `source` fields, and links cite,
  `#44-field-overlay-fr-o5-d-18-proposed` among them, or updates every
  reference in the same commit; the doc-link check and steps 3 and 7
  of `check_pdd_agreement.py` catch a miss
  ([DDD §5.13](ddd.md#513-application-configuration)).
- **OA-16** — the `ami_id` default of
  `subprojects/webapp/perf/variables.tf`, Phase 2, before T-59
  completes: the AMI ID that Canonical's SSM parameter of
  [DDD §7.6](ddd.md#76-performance-and-compatibility-measurements)
  names in `us-east-1`, read with AWS credentials, which the agent
  never holds. The record is the value given to the agent, which T-59
  commits as the default; its check:
  `grep -cE '^ *default *= *"ami-[0-9a-f]{17}"' subprojects/webapp/perf/variables.tf`
  prints 1.
- **OA-17** — the acceptance of
  [ADR-0017 — An unadvertised prototype deployment precedes the public release](../adr/0017-unadvertised-prototype-before-public-release.md)
  (Proposed 2026-10-30) under the repository's ADR process, Phase 1,
  before T-18 publishes the first vintage under the assumed terms and
  before T-54's prototype deployment
  ([Authority and change control](ddd.md#authority-and-change-control)):
  the record is the ADR's status line, and its row in
  `docs/adr/README.md`, reading Accepted in a dated commit; its check,
  which T-18 and T-54 run:
  `grep -cF -e '- **Status**: Accepted' docs/adr/0017-unadvertised-prototype-before-public-release.md`
  prints 1. Accepting the ADR includes one sweep commit after that
  record, which the agent prepares on request: it updates the ADR's
  other Proposed mentions, its "(Proposed)" labels included, in the DDD,
  this plan, the HLDD, `notes/Roadmap.md`, and `docs/adr/README.md`, and
  is not part of the record.

## 5. Parked capabilities (P2/P3)

Parked per the PDD's surface priorities: P2 and P3 must not delay the
MVP ([PRD §2.2 — MVP and delivery
priorities](prd.md#22-mvp-and-delivery-priorities)). This plan
schedules no parked work before v0.3; starting any of it earlier in
parallel is the owner's scheduling choice, not a requirement of the
sources. Each line names what unparks it.

- Media index and export — P2
  ([ADR-0012](../adr/0012-product-data-exports.md)); unparked by the
  P2 lane opening. When it ships, `mediaIncludes` joins `mkdocsBuild`,
  `mkdocsServe`, `mkdocsPreview`, and CI's **Stage scenario assets**
  command, development media stay under the drafted `media/dev/`, and
  the site checks hook's arm (b) admits the index's granted entries
  ([DDD §6.4](ddd.md#64-product-pages-beyond-the-scenario-page-p2p3);
  [DDD §6.1](ddd.md#61-build-outputs-asset-paths-and-page-scaffold)).
- Morphology page, animation library, measurement page, animation
  offers — P2; need the media index and, for coverage,
  [D-8](pdd.md#1-decision-register). The two pages' nav lines are the
  owner's decision under [D-2](pdd.md#1-decision-register) (Site
  entry point), taken when the P2 lane opens, and each page passes
  through the three publication states of
  [DDD §6.1](ddd.md#61-build-outputs-asset-paths-and-page-scaffold) —
  drafted, unlisted for review, activated
  ([DDD §6.4](ddd.md#64-product-pages-beyond-the-scenario-page-p2p3));
  their PDD §5.12 and §5.13 texts are compared through copy markers
  once they ship
  ([DDD §5.13](ddd.md#513-application-configuration), the record
  after step 8).
- Shared links (URL codec) and the
  [D-15](pdd.md#1-decision-register) version notice — P2; unparked by
  the DDD revision that fixes the value grammar, which follows the
  product owner's rule in
  [PDD §7.1 — Shared links](pdd.md#71-shared-links) for links carrying
  an invalid or out-of-vocabulary value
  ([DDD §5.6](ddd.md#56-scenario-state-and-url-encoding)).
- Inverse mode — P2; its categorical-chart question routes through
  the ADR process first ([DDD §5.12](ddd.md#512-charts)), and its
  reading of observed ranges outside the recorded extent awaits the
  owner's decision
  ([DDD §5.14](ddd.md#514-inverse-mode-p2)).
- Chart export ([D-14](pdd.md#1-decision-register)) — P2.
- Finer logarithmic bins that subdivide each decade by mantissa steps
  — a P2 option for the width panel's log-scale toggle, which ships in
  the MVP; it needs a [D-23](pdd.md#1-decision-register)
  (Reader-facing display precision per quantity) amendment
  ([DDD §5.12](ddd.md#512-charts)).
- Contact page — P3; repository links wait for
  [R-15](prd.md#93-content-and-media-dependencies).
- 3D lane — on hold per the Roadmap's 2026-10-12 decision; Cases 1–3
  are supplied but held pending the owners' decision, Case 4 is not
  supplied; no ingestion before they decide
  ([`notes/Roadmap.md` — Decisions made](../../notes/Roadmap.md#decisions-made)).

## 6. Blocked-by index

During drafting, this index ordered DDD work by implementation
value. Every listed section is now drafted and has been through the
adversarial reviews and corrections of 2026-10-30, and every Status
cell but T-48's and T-59's reads Draftable — T-59's input
[ADR-0016](../adr/0016-performance-reference-environment.md) is
Proposed until OA-12; the index remains as the
section-to-task map. It is derived mechanically from §2: a task
stands beside a section group when its Inputs cell or its body links
a DDD section of that group, and a register row appears beside the
section that closes it. Tasks blocked on decisions, gates, owner
actions, or other tasks are tracked in their rows and in
[§3](#3-gates-and-release-sequence), not here; the index is not an
independent scheduling authority.

| DDD section | Unblocks |
|---|---|
| §2 (with DD-10) | T-01, T-02, T-20, T-23, T-31, T-35, T-37, T-54, T-59–T-61, T-65. |
| §3.1–§3.3 (with DD-1) | T-11, T-12, T-16, T-30, T-36, T-40. |
| §3.4–§3.6 | T-10–T-13, T-16, T-30, T-32, T-33, T-35, T-36, T-48, T-49, T-55, T-63. |
| §3.8 | T-11, T-13, T-17, T-61. |
| §4.1–§4.2 (with DD-7) | T-04, T-10–T-18, T-31, T-63. |
| §4.3–§4.4 (with DD-8) | T-11, T-12, T-15, T-18, T-51, T-63–T-65. |
| §5.1–§5.6 (with DD-11) | T-13, T-16, T-30–T-37, T-40, T-41, T-43, T-45, T-46, T-49, T-50, T-61. |
| §5.7–§5.13 (with DD-4, DD-5, DD-6, DD-9) | T-03, T-13, T-30, T-32, T-34–T-36, T-40–T-50, T-52, T-54, T-55, T-61, T-62. |
| §6.1–§6.3 | T-02–T-04, T-20–T-23, T-47, T-50, T-51, T-54, T-55, T-64, T-65. |
| §6.4 | T-52, T-55. |
| §7.1–§7.4 (with DD-2) | T-02, T-04, T-13–T-16, T-18, T-23, T-31, T-32, T-35, T-36, T-40–T-43, T-45, T-48–T-50. |
| §7.5–§7.7 (with DD-3, DD-12) | T-03, T-04, T-17, T-37, T-46, T-51, T-52, T-54, T-55, T-59–T-65. |
| §8 | T-04, T-65. |

## 7. Traceability

The matrix below maps every obligation the approved documents place
on the implementation plan — the thirty rows the obligation sweep of
2026-10-29 directed at this plan, of the 420 it extracted from the
PRD, PDD, HLDD, accepted ADRs, and `notes/Roadmap.md` at commit
`36abc56` ([DDD §8 — Traceability](ddd.md#8-traceability) holds the
full register) — to its home in this plan and to the check planned to
evidence it, with its kind and status. It shows coverage and planned
evidence, never satisfaction: executed results live only in the
release records, in the evidence ledger of
[DDD §7.7](ddd.md#77-site-validation-and-release-checklist). The
tables are the stored rendering of that sweep, re-rendered — never
hand-edited — when the sources change; this correction pass
re-rendered the Kind, Check, and Status columns against the corrected
documents on 2026-10-30. Each row repeats its DDD §8 twin — the row
with the same Source and Obligation — exactly, which the traceability
lint of T-04 checks. Kind and Status take the closed values DDD §8
defines: Kind is one of `text`, `test`, `measure`, `release`, `owner`,
`schedule`, and `n/a`, several joined with `+`; Status is one of
`designed`, `planned`, `owner-pending`, `parked`, `deferred`, `gap`,
and `n/a`, the first that applies in the DDD §8 precedence; a
`schedule` Check names a placement, never evidence. In the Home and
Check columns, bare `§n` coordinates refer to the
[DDD](ddd.md)'s sections (kept unlinked so the register stays
greppable — a stated exception to the link convention for this
generated table); `IP` coordinates refer to this document's sections.
A row may resolve to an owner action
([§4](#4-owner-and-research-group-actions)) or a parked line; none of
the thirty resolves to "not an IP obligation (stays with its
source)".

### 7.1 From the HLDD

| Source | Obligation | Home | Kind | Check | Status |
|---|---|---|---|---|---|
| HLDD Intro L72-76 | IP execution brief | IP §2 task graph | text | IP Introduction | designed |
| HLDD §9 L2452-2453 | IP schedules release checks | IP §3 sequence | text | IP §3; IP §4 | designed |
| HLDD §12 L2741-2742 | IP contents | IP §2 task graph, IP §3 sequence | text | IP §1; IP §2; IP §3 | designed |
| HLDD §12 L2744-2746 | IP self-sufficiency standard | IP §2 task graph | text | IP Introduction; IP §8 | designed |

### 7.2 From the PDD

| Source | Obligation | Home | Kind | Check | Status |
|---|---|---|---|---|---|
| PDD §1 D-1 | MVP scope and release target v0.3 | IP §2 T-65 | schedule+owner | T-65; IP §5; OA-9 | owner-pending |
| PDD §1 D-10 | liability-limitation text (D-10) authored before release | IP §3 G-5, IP §4 OA-3 | release+owner | §7.7 item 7; G-5; OA-3 | owner-pending |
| PDD §2.1 surface table | surface priorities P1/P2/P3 (release sequencing) | IP §5 parked | text+schedule | §6.4; IP §5 | parked |
| PDD §4.7 | Kern preset ships only after D-6 (release sequencing) | IP §2 T-48, IP §3 sequence, IP §4 OA-2 | schedule+owner | T-48; OA-2 | owner-pending |
| PDD §5.11 | glossary additions before launch | §6.4, IP §2 T-52 | text+schedule+release+owner | §6.4 (Glossary additions); T-52; §7.7 item 8; G-4; OA-4 | owner-pending |
| PDD §8.1 | third-party photos removed or cleared before public release | IP §3 G-6, IP §4 OA-8 | test+release+owner | subprojects/mkdocs/hooks/site_checks.py arms (a), (b) (T-03); §7.7 item 9; §7.7 item 10; G-6; OA-8 | owner-pending |
| PDD §10.1 SC-7 | SC-7 research-group sign-off gate | IP §3 G-4, IP §4 OA-4 | test+release+owner | .github/scripts/check_pdd_agreement.py::step 8 (T-47); §7.7 item 6 (SC-7 row); G-4; OA-4 | owner-pending |
| PDD §10.3 | scripted acceptance walkthroughs before release | IP §2 T-62 | schedule+release+owner | T-62; §7.7 item 13; G-2; OA-5 | owner-pending |

### 7.3 From the PRD and notes/Roadmap.md

| Source | Obligation | Home | Kind | Check | Status |
|---|---|---|---|---|---|
| PRD §9.4 R-19 | IP sequencing: validate client-side approach against MVP performance budget early; record platform ADR | IP §2 T-17, IP §2 T-37 | schedule+text | T-17; T-37; Introduction (Authority and change control: ADR-0010 and ADR-0011 accepted) | designed |
| Roadmap 'Publication, citation and hosting' — DOI | first GitHub release: decide contents and version before cutting; tags v0.2.0–v0.2.2 exist, no release yet | IP §4 OA-7 | owner+schedule | OA-7; T-65 | owner-pending |
| Roadmap 'Publication, citation and hosting' — Hosting the processed tables | Zenodo dataset-record deposit step — open; decided with the first release | IP §4 OA-6 | owner+text | OA-6; §4.4 (Archival distribution) | owner-pending |
| Roadmap 'Decisions made' — DOI route | DOI route decided (Zenodo via GitHub release); IP step: enable Zenodo GitHub app (needs HarvardRC org-admin) | IP §4 OA-6 | owner | OA-6 | owner-pending |
| Roadmap 'Decisions made' — Paper figures (export-ignore) | release-data arrangement: fig-* export-ignore keeps figures out of the git archive tarball Zenodo archives | IP §2 T-65 | release+schedule+owner | §7.7 item 10; T-65; G-6 | owner-pending |
| Roadmap 'Decisions made' — 3D lane | IP sequencing: release lane closes first; 3D lane on hold | IP §5 parked | schedule | IP §5 (3D lane); §9 | parked |
| Roadmap 'Decisions made' — Release data | release contents: code + plotting CSVs + CITATION.cff; raw inputs stay on DesignSafe, cited by DOI | IP §2 T-65 | schedule+release+text | T-65; §7.7 item 11 (plotting CSVs beside the attachments); §5.9 (provenance block 2, DesignSafe DOIs) | planned |
| Roadmap 'Decisions made' — Release data (deposit mechanic) | open release mechanic: release assets do not reach Zenodo; dedicated deposit step (dataset record) to decide with first release | IP §4 OA-6 | owner+text | OA-6; §4.4 (Archival distribution: every deposited file downloaded, its SHA-256 compared with the pointer) | owner-pending |
| Roadmap 'Decisions made' — Release data (app exports) | app exports as release assets pinned by committed manifest (ADR-0014/ADR-0012, HLDD §5.4 §10); each software release attaches current exports beside plotting CSVs | IP §2 T-65 | text+release+schedule | §4.4 (Software-release attachments); §7.7 item 11; T-65 | planned |

### 7.4 From the ADRs

| Source | Obligation | Home | Kind | Check | Status |
|---|---|---|---|---|---|
| ADR-0011 Context amendment 1 (L25-30) | tests.yml path filter targets the pointer manifest; parity harness fetches pinned vintage before running | IP §2 T-20, T-35, T-23 | text+test+schedule | §6.3 (the Tests push filter names subprojects/webapp/data/pointer.json); subprojects/webapp/test/parity.ts::fetch (T-35); .github/workflows/tests.yml::webapp-test / Parity (T-23); T-20 | planned |
| ADR-0011 Decision (L53-61) | CI build lane: webapp job in mkdocs.yml separate from MkDocs job; local Gradle task writes gitignored path | IP §2 T-21, T-02 | text+schedule | §6.3 (Companion site: job webapp-bundle, separate from build); §2 (webappBundle writes build/dist/, covered by the root build/ rule); T-21; T-02 | designed |
| ADR-0011 Decision (L65-70) | CI changes: widen mkdocs.yml filters; tests.yml gains webapp test job + parity harness (filter remapped to pointer manifest) | IP §2 T-20, T-21, T-23 | text+test+schedule | §6.3 (push filters by the filter rule, pull_request triggers unfiltered, jobs webapp-test and webapp-bundle); .github/workflows/tests.yml::webapp-test / Parity (T-23); T-20; T-21 | planned |
| ADR-0011 Consequences (L97-98) | deploy workflow gains Node setup and build job; deploy gated on bundle build | IP §2 T-22 | text+schedule | §6.3 (build needs webapp-bundle, deploy needs build, the hermetic Node.js download is the Node setup); T-22 | designed |
| ADR-0012 Decision (L83-88) | pipeline work: five new outputs via new DuckDB views in views.py plus a new export task | IP §2 T-10, T-11, IP §5 parked | schedule+text | T-10; T-11; IP §5 (media index and export, P2); §4.1 | designed |
| ADR-0012 Decision (L116-120) | release sequence: MVP (v0.3) ships four artifacts; media index and every surface reading it are P2 | IP §5 parked | schedule+text | IP §5 (media index and export, morphology page, animation library, measurement page, animation offers: P2); T-18; §4.1 step 2 (the media index only from P2) | parked |
| ADR-0014 Decision, Derived data (L140-145) | sequenced open items: confirm source terms before first vintage upload; Zenodo dataset deposit step; README/LICENSE-docs wording | IP §3 G-1, IP §4 OA-1, IP §4 OA-13, IP §4 OA-6, §4.4 | owner+text+release | G-1; OA-1; §4.2 step 1 (the OA-1 record gate and the README/LICENSE-docs condition); ADR-0017; §7.7 item 17; OA-13; OA-6; §4.4 (Archival distribution); §4.4 (Vintage terms: the README and LICENSE-docs wording) | owner-pending |
| ADR-0014 Consequences (L183-186) | site deploys and PR validation gain the fetch-and-verify step | IP §2 T-21, T-22 | test+text+schedule | .github/workflows/mkdocs.yml::build / Stage scenario assets (T-21); §6.3 (pull_request triggers unfiltered, a failed run never deploys); T-22 | planned |
| ADR-0015 amendment 2 of 2026-10-29 (L60-63) | release gate: browser test lane run against the locally built site, required before a release | IP §2 T-60, IP §3 G-2, IP §4 OA-5 | release+schedule+owner | §7.7 item 4; T-60; G-2; G-3; OA-5 | owner-pending |

## 8. Relationship to the DDD

Every technical fact in this plan is a citation into the
[DDD](ddd.md) or an already-accepted source; this plan never adds
design content, never closes a DDD register row, and never resolves a
conflict between documents — it schedules the work those documents
define, holding work that depends on a Proposed decision until the
owner accepts it, as T-59 waits for OA-12 and T-18 and T-54 for OA-17
([DDD §10 — Relationship to the implementation
plan](ddd.md#10-relationship-to-the-implementation-plan)). When a
task body cannot be written unambiguously from its cited anchors, the
gap is a DDD defect to fix there, not a blank for the executing agent
to fill.
