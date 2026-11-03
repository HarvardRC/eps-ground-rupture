# DDD review ledger

The record of the external reviews of the detailed design document
([`docs/app/ddd.md`](ddd.md)) and of the implementation plan that
accompanies it ([`docs/app/ip.md`](ip.md)), and of what was done with
each finding. Review 2 asked for it: "Review records need a durable
evidence location". The status lines of the DDD and of the
implementation plan cite this file.

**Scope.** Eight reviews: three of 2026-10-30 — review 1 of the full
DDD draft, review 2 of the corrected DDD, and a review of
[ADR-0016 — Performance reference environment — an on-demand AWS VM defined by Terraform](../adr/0016-performance-reference-environment.md)
— two reviews of the implementation plan, both of 2026-10-31, the
repository-backed design review of 2026-10-31 with its correction
pass of 2026-11-01, the IP consistency review of 2026-11-01 with its
correction pass, and the consistency, ambiguity, and feasibility
review of 2026-11-01 with its correction pass of 2026-11-02.
The review texts are model output from the owner's review agent, not
statements of the research group or of any other person. Reviews 1
and 2 state that they read the supplied text and did not
independently check the repository contents, the reported
measurements, the revised PDD decisions, or the amended ADRs; the
first review of the implementation plan states that it read the plan
against an earlier DDD and did not inspect
[ADR-0017 — An unadvertised prototype deployment precedes the public release](../adr/0017-unadvertised-prototype-before-public-release.md),
the later DDD amendments, the repository, or any workflow run, and
the second that it did not inspect the current DDD, ADR-0017, this
ledger, or the repository, and executed no commands. This ledger
restates each finding under its review's own identifier, in one line
or, for the consistency, ambiguity, and feasibility review, in one
numbered item — review 2's observations are lettered here, the
ADR-0016 points numbered, the first implementation-plan review's
observations lettered, and the second's publication-governance item
named — and does not reproduce the review texts. It also records the
correction passes' own verification rounds and the owner's rulings
made during them, the owner's decisions of 2026-11-01 on versions and
branches, and those of 2026-11-02 on the first implementation wave.

**Evidence.** Whether what the DDD specifies has been built and its
checks have run is recorded by the tasks' Status cells in
[IP §2 — Task graph](ip.md#2-task-graph)
([Task format](ip.md#task-format)), never by this ledger, whose dated
sections state what held at their dates. The
diagnostics that the sections below record — among them the isolated
trials of [T-04](ip.md#t-04--traceability-lint) (Traceability lint) —
ran outside the project: they test the specification, and none is an
execution of a planned task or check. A disposition is a change to
the documents: the Where column names the sections that now carry it
and the IP tasks that will implement it, not evidence that it holds.

## Review 1 — full DDD draft (2026-10-30)

The review found the draft "substantially more complete than the
skeleton" but would "not yet approve it as an execution-ready DDD":
"The architecture does not need replacing. The document needs a
focused correction pass before task bodies are finalized." Its 24
findings fall into three groups — A, findings that block
execution-ready approval; B, correctness, reproducibility, and
integration; C, release, accessibility, and evidence — and it asked
for "a focused adversarial review of the actual interfaces and
operational sequence" after the correction — round 2 under
[Verification rounds](#verification-rounds). The verdicts are
round 1's.

| Finding | Verdict | Disposition | Where |
|---|---|---|---|
| **A-1** Mount-element identifiers disagree | Confirmed | One identifier contract: `#gre-root` is the mount element, and the application writes nowhere outside it; `#gre-app` is the generated module tag, read at every mount and never a mount point; every product id and class carries the `gre-` prefix. | [DDD §6.1](ddd.md#61-build-outputs-asset-paths-and-page-scaffold), [§5.1](ddd.md#51-modules-and-interfaces), [§5.11](ddd.md#511-accessibility-supported-environments-and-navigation-lifecycle); [IP T-03](ip.md#t-03--scenario-page-scaffold), [T-46](ip.md#t-46--accessibility-and-navigation-lifecycle) |
| **A-2** The instant-navigation bootstrap is not fully specified | Confirmed | One boot algorithm, with no loading alternative left open: the bundle starts at module scope, keyed by its own URL; a `document$` subscription and a `readyState` fallback cover instant and direct entry; at most one live mount per document, whose abort disposes of its pending work; a one-entry data cache keyed by manifest URL and data version. The morphology page's loading fallback is deleted. Planned browser-lane drives cover first, direct, repeated, and changed-bundle entry. | [DDD §5.11](ddd.md#511-accessibility-supported-environments-and-navigation-lifecycle), [§5.10](ddd.md#510-failure-states), [§6.4](ddd.md#64-product-pages-beyond-the-scenario-page-p2p3), [§7.5](ddd.md#75-browser-test-lane); [IP T-46](ip.md#t-46--accessibility-and-navigation-lifecycle), [T-60](ip.md#t-60--browser-test-lane) |
| **A-3** `not_in_nav` does not prevent public publication | Confirmed | The publication boundary is MkDocs `draft_docs`, which leaves a page out of the build output, `sitemap.xml`, and the search index; a separate preview configuration builds the drafted page for the browser lane, and the `site_checks.py` build hook fails any build that leaks it. Under the owner's two-phase ruling (below) the page passes through three states — draft, unlisted prototype, activated — and the hook checks the state the publication configuration declares. | [DDD §6.1](ddd.md#61-build-outputs-asset-paths-and-page-scaffold), [§6.4](ddd.md#64-product-pages-beyond-the-scenario-page-p2p3), [§7.5](ddd.md#75-browser-test-lane), [§7.7](ddd.md#77-site-validation-and-release-checklist); [IP T-03](ip.md#t-03--scenario-page-scaffold), [T-21](ip.md#t-21--mkdocsyml-webapp-build-and-vintage-staging), [T-55](ip.md#t-55--public-activation) |
| **A-4** The standing disclaimer may disappear after successful mounting | Confirmed | The full disclaimer is `#gre-disclaimer`, a sibling after `#gre-root` that no render replaces, holding [PDD §5.1 — Standing disclaimer (CR-4; D-10 Open)](pdd.md#51-standing-disclaimer-cr-4-d-10-open) between copy markers, so the full text stands in every state; the short disclaimer links to it. Round 2 found that the link's first click after a direct load made Material re-fetch the page; a capture-phase guard now keeps same-page links from re-mounting. A planned browser-lane drive follows the link after mounting. | [DDD §6.1](ddd.md#61-build-outputs-asset-paths-and-page-scaffold), [§5.8](ddd.md#58-view-layer), [§5.11](ddd.md#511-accessibility-supported-environments-and-navigation-lifecycle), [§7.5](ddd.md#75-browser-test-lane); [IP T-03](ip.md#t-03--scenario-page-scaffold), [T-43](ip.md#t-43--notices-and-caveats), [T-46](ip.md#t-46--accessibility-and-navigation-lifecycle) |
| **A-5** Region replacement conflicts with focus and input preservation | Confirmed | A region model: a skeleton of stable controls built once at mount, and named slots that renders replace. The accepted Scenario is kept apart from each field's draft text and from display state; commit, rejection, and mid-edit rules are stated per control, and focus survives a replacement through `data-focus-key`. | [DDD §5.6](ddd.md#56-scenario-state-and-url-encoding), [§5.7](ddd.md#57-scenario-controls), [§5.8](ddd.md#58-view-layer), [§5.11](ddd.md#511-accessibility-supported-environments-and-navigation-lifecycle); [IP T-34](ip.md#t-34--scenario-state), [T-40](ip.md#t-40--scenario-controls), [T-46](ip.md#t-46--accessibility-and-navigation-lifecycle) |
| **A-6** Several Node tests require a DOM that the design does not supply | Confirmed | The review's first option: pure builders, which return strings and `SvgNode` trees and compile against `tsconfig.node.json`, to be tested in Node; thin DOM appliers, to be tested only in the browser lane. No DOM emulator joins the dependencies. | [DDD §5.1](ddd.md#51-modules-and-interfaces), [§2](ddd.md#2-repository-structure-naming-and-toolchain), [§7.4](ddd.md#74-application-tests); [IP T-01](ip.md#t-01--gradle-webapp-subproject), [T-36](ip.md#t-36--application-unit-tests), [T-41](ip.md#t-41--measurement-panels-and-charts) |
| **A-7** The boundary parity battery cannot currently run independently in CI | Confirmed | The Python reference generator also writes `boundary_cases` and `synthetic` cases (engine, statistics, histograms, rounding, conversion) into the reference results; the Node harness replays them and never computes an expected value. | [DDD §3.6](ddd.md#36-reference-results), [§7.2](ddd.md#72-calculation-parity-tests), [§7.3](ddd.md#73-pipeline-and-export-tests); [IP T-13](ip.md#t-13--reference-results-generator), [T-35](ip.md#t-35--node-parity-harness) |
| **A-8** The percentile formula has an out-of-bounds case | Confirmed | `quantileLinear` is NumPy's 'linear' method with an explicit endpoint branch for n = 1 and p = 1. Statistics over no valid values, and an undefined sample standard deviation, are null; reference JSON is written with `allow_nan=False` after a finiteness assertion. | [DDD §5.4](ddd.md#54-statistics), [§3.6](ddd.md#36-reference-results), [§4.1](ddd.md#41-export-task-and-validation); [IP T-13](ip.md#t-13--reference-results-generator), [T-32](ip.md#t-32--statistics-module) |
| **A-9** The histogram algorithm is not yet exact enough to implement | Confirmed | One rule over integer recording steps: Freedman–Diaconis width (Scott's rule at zero interquartile range, one bin for constant data), rounded up to display steps and widened to at most 60 bins; half-open bins whose per-class counts sum to the valid count; bins and class counts generated in Python for every reference scenario. The logarithmic bins follow the owner's ruling (below). | [DD-5](ddd.md#1-ddd-decision-register) (Histogram bin rule); [DDD §5.12](ddd.md#512-charts), [§3.6](ddd.md#36-reference-results); [IP T-13](ip.md#t-13--reference-results-generator), [T-32](ip.md#t-32--statistics-module) |
| **B-1** Download provenance can lose sediment-pair selections | Confirmed | A lossless canonical scenario serialization, new register row [DD-11](ddd.md#1-ddd-decision-register) (Canonical scenario serialization), shared by the reference results and a fourth package member, `scenario.json`. The slug of [DD-6](ddd.md#1-ddd-decision-register) (Download file-name scenario-slug rules) is injective before truncation and no longer described as collision-safe: the file name is a label, `scenario.json` the scenario's identity. | [DDD §5.6](ddd.md#56-scenario-state-and-url-encoding), [§5.9](ddd.md#59-downloads), [§3.6](ddd.md#36-reference-results); [IP T-34](ip.md#t-34--scenario-state), [T-45](ip.md#t-45--downloads) |
| **B-2** Input validation remains incomplete | Confirmed | A closed validation table, R1–R6: one decimal grammar; negative, unreadable, and minimum-above-maximum entries rejected with the last accepted results kept; an entry above the recorded slip maximum rejected, since [PDD §3.4 — Displacement window (FR-S5)](pdd.md#34-displacement-window-fr-s5) makes that maximum the control's highest selectable value (accepting it, which round 1 preferred, would need a PDD change); an empty checkbox group giving zero matches; explicit mode-switch and blank-offset rules. The rejection line is fixed-here copy, listed for [SC-7](pdd.md#101-success-criteria) (scientific sign-off). | [DDD §5.7](ddd.md#57-scenario-controls), [§5.3](ddd.md#53-query-engine), [§5.10](ddd.md#510-failure-states); [IP T-34](ip.md#t-34--scenario-state), [T-40](ip.md#t-40--scenario-controls) |
| **B-3** Offset mode has conflicting input descriptions | Confirmed | The PDD's maximum-only offset entry, lower endpoint 0, is stated once, in the conversion section; the controls, summary, references, slug, and package follow it, and no second endpoint exists. | [DDD §5.5](ddd.md#55-offset-to-slip-conversion-assist), [§5.7](ddd.md#57-scenario-controls), [§3.6](ddd.md#36-reference-results); [IP T-33](ip.md#t-33--conversion-assist) |
| **B-4** The configuration validation does not establish PDD agreement | Confirmed | `check_pdd_agreement.py`, specified for the `links` job, checks four mechanical properties against the PDD itself: every cited anchor is a rendered heading, each setting equals the value its quote states inside the cited section, every registry text and copy-marked block is verbatim, and the configuration keys match the DDD's settings table. Whether a quote is the governing statement, whether the table is complete, and the fixed-here texts remain human review. | [DDD §5.13](ddd.md#513-application-configuration), [Verification contract](ddd.md#verification-contract), [§6.3](ddd.md#63-ci-workflows); [IP T-47](ip.md#t-47--application-configuration) |
| **B-5** Staging can publish stale vintages and has a missing task dependency | Partly confirmed: `scenarioAssets` reads the committed pointer, not a fetched file, so the missing order was harmless while both tasks only added files; stale files reach local builds and the documented `mkdocs gh-deploy` fallback, never CI's fresh checkouts. The stale-file and `clean` claims hold. | `fetchVintage` caches the vintage's files, each checked against its SHA-256, under `subprojects/mkdocs/build/vintage/<data_tag>/` and writes nothing under `docs/`; `scenarioAssets` is a Gradle `Sync` of exactly the selected vintage into `docs/assets/scenario/`, after `webappBundle` and `fetchVintage`; `clean` deletes only the application's generated paths. | [DDD §6.1](ddd.md#61-build-outputs-asset-paths-and-page-scaffold), [§4.3](ddd.md#43-retention-rollback-recovery-and-withdrawal); [IP T-21](ip.md#t-21--mkdocsyml-webapp-build-and-vintage-staging) |
| **B-6** Numerical claims exceed the evidence | Confirmed; round 1 also found rounding ties at the display step common in the data, so an error below the tolerance can change a rounded value | "Measured end-to-end" and "cannot mask a defect" are gone; [DD-2](ddd.md#1-ddd-decision-register) (Per-calculation numerical tolerances) states its grounds per quantity. Display strings compare exactly with Python-generated ones under one cross-language `displayRound` (shortest round-trip decimal, half away from zero, no negative zero, ASCII minus); both sides restore stored values by one integer rule; two planned full-data tests cover the tie census and the evaluation-order effect. | [DDD §7.1](ddd.md#71-numerical-tolerances), [§5.8](ddd.md#58-view-layer), [§3.1](ddd.md#31-scenario-artifact-binary-layout), [§7.3](ddd.md#73-pipeline-and-export-tests); [IP T-14](ip.md#t-14--required-full-data-checks), [T-32](ip.md#t-32--statistics-module) |
| **B-7** Publication and recovery provenance do not identify the generating source | Confirmed | Both manifests carry a `provenance` object (source commit, clean-tree flag, input files with SHA-256, environment versions); exports read run-private DuckDB views; `publishVintage` publishes draft-first and idempotently, with defined cases for interrupted runs and existing tags, an annotated tag, and a publication record; recovery has its own sequence. Releases are immutable (owner ruling, below). | [DDD §3.2](ddd.md#32-artifact-manifest), [§4.1](ddd.md#41-export-task-and-validation), [§4.2](ddd.md#42-publication-of-a-data-vintage), [§4.3](ddd.md#43-retention-rollback-recovery-and-withdrawal); [IP T-11](ip.md#t-11--export-task), [T-15](ip.md#t-15--publication-tooling), [T-18](ip.md#t-18--first-verified-publication-owner) |
| **B-8** The no-skips implementation does not cover collection skips | Confirmed | The pytest gate, inert unless `EGR_REQUIRE_FULL_DATA=1`, covers collection-time and run-time skips with three hook groups, requires every test in the committed `tests/full_data_required.txt` to be collected and to pass; planned self-tests cover missing inputs and collection-time skips. | [DDD §7.3](ddd.md#73-pipeline-and-export-tests), [§4.1](ddd.md#41-export-task-and-validation); [IP T-14](ip.md#t-14--required-full-data-checks) |
| **B-9** CI checks and deployment are not fully coupled | Confirmed; owner decision needed | Deployment waits for parity on the same revision: `deploy` needs `build`, which needs `webapp-bundle` with its **Parity** step. Pull-request runs are unfiltered, and push filters gain `CITATION.cff`. "A parity failure blocks merge" holds under a `main` ruleset with five required checks — owner action [OA-10](ip.md#4-owner-and-research-group-actions) (Proposed), whose admin bypass the DDD states as its reading of [ADR-0015 — Golden-scenario references and a pipeline↔client parity harness](../adr/0015-golden-scenario-parity.md). | [DDD §6.3](ddd.md#63-ci-workflows), [§7.2](ddd.md#72-calculation-parity-tests); [IP T-21](ip.md#t-21--mkdocsyml-webapp-build-and-vintage-staging), [T-22](ip.md#t-22--deploy-gating), [T-23](ip.md#t-23--wire-unit-tests-and-parity-into-testsyml) |
| **C-1** Accessible chart alternatives omit information actually drawn | Confirmed | Each chart is followed by a collapsed "Chart data" disclosure holding its bin table, with per-class counts, and, while the overlay is on, its field table; each histogram segment carries its own title; the statistics table stays the canonical alternative. | [DD-9](ddd.md#1-ddd-decision-register) (Chart text-alternative mechanism); [DDD §5.8](ddd.md#58-view-layer), [§5.11](ddd.md#511-accessibility-supported-environments-and-navigation-lifecycle), [§5.12](ddd.md#512-charts); [IP T-41](ip.md#t-41--measurement-panels-and-charts) |
| **C-2** Browser compatibility evidence is overstated | Confirmed | Documented API availability, a planned Node test over `caniuse-lite`, is kept apart from executed confirmation: the automated lane executes one engine, its pinned Chromium, at desktop and 360 px widths; the other baseline engines and mobile browsers get a manual pass with its own procedure and release record (release checklist item 15). | [DDD §7.6](ddd.md#76-performance-and-compatibility-measurements), [§5.11](ddd.md#511-accessibility-supported-environments-and-navigation-lifecycle), [§7.7](ddd.md#77-site-validation-and-release-checklist); [IP T-51](ip.md#t-51--site-validation-additions), [T-60](ip.md#t-60--browser-test-lane) |
| **C-3** Performance measurements need tighter controls | Confirmed; owner decision needed (the reference machine, and whether load budgets may use a summary statistic) | A separate `measure` project runs alone, with one worker and no routing, HAR recording, tracing, video, or screenshots; marks are taken after paint; cache state is set per workload. By the owner's rulings (below), the reference is the AWS environment of [DD-12](ddd.md#1-ddd-decision-register) (Performance reference environment), with emulated 10 Mbps and 40 ms, each budget judged at the nearest-rank 95th percentile of 30 runs; a published-site run follows deployment. | [DDD §7.6](ddd.md#76-performance-and-compatibility-measurements), [§2](ddd.md#2-repository-structure-naming-and-toolchain); [IP T-59](ip.md#t-59--reference-measurement-environment), [T-61](ip.md#t-61--measurement-suite) |
| **C-4** Media checks inspect references rather than all published files | Confirmed | The `site_checks.py` hook inspects the built file inventory: any development-media path fails the build, and any non-text file outside the application subtree must match `publication-allowlist.txt`, referenced or not. Development media stay under `draft_docs` permanently. | [DDD §6.1](ddd.md#61-build-outputs-asset-paths-and-page-scaffold), [§6.4](ddd.md#64-product-pages-beyond-the-scenario-page-p2p3), [§7.7](ddd.md#77-site-validation-and-release-checklist); [IP T-03](ip.md#t-03--scenario-page-scaffold), [T-51](ip.md#t-51--site-validation-additions) |
| **C-5** Several “exact specifications” remain unresolved | Confirmed | Each contract is completed or deferred with an owning decision: plugin `com.github.node-gradle.node` 7.1.0 configures Node.js 22.12.0; every format states its types and nullability; the URL value grammar is deferred to P2 with its owning decision; the field mapping covers every structural key; the ZIP layout is fixed and checked by an independent `zipcheck.py`; the lane's server base path and sitemap rewrite are fixed; `@axe-core/playwright` is pinned at 4.10.0; the morphology script has no fallback. | [DDD §2](ddd.md#2-repository-structure-naming-and-toolchain), [§3](ddd.md#3-data-formats), [§5.6](ddd.md#56-scenario-state-and-url-encoding), [§5.9](ddd.md#59-downloads), [§6.4](ddd.md#64-product-pages-beyond-the-scenario-page-p2p3), [§7.5](ddd.md#75-browser-test-lane); [IP T-01](ip.md#t-01--gradle-webapp-subproject), [T-30](ip.md#t-30--loader-and-decoder), [T-45](ip.md#t-45--downloads) |
| **C-6** Traceability currently contains unsupported satisfaction claims | Confirmed | Evidence wording is "planned" throughout; each row of the §8 matrix records its obligation's kind and status (planned, designed, owner-pending, …) instead of claiming satisfaction; executed results are to live only in the release record's evidence ledger (revision, check, result location, result); a planned lint, `check_traceability.py`, checks the matrix. | [DDD §8](ddd.md#8-traceability), [§7.7](ddd.md#77-site-validation-and-release-checklist), [§3.8](ddd.md#38-measured-sizes); [IP T-04](ip.md#t-04--traceability-lint), [§7](ip.md#7-traceability) |

## Review 2 — corrected DDD (2026-10-30)

The review found that the revision "resolves most of the previous
review's major findings" and said "I would not reopen the overall
architecture". It raised ten items — nine resolutions it asked for and
a tenth of four wording adjustments — and three observations on
documentation and scope, and recommended: "approve the relevant
sections and begin implementation with early executable checks." The
verdicts are those of the proposers who drafted the edits, each
checking the item against the text; one editor applied the edits.

| Finding | Verdict | Disposition | Where |
|---|---|---|---|
| **1** The performance driver does not pass `operator_cidr` to every Terraform operation that requires it | Confirmed | One function in `run.mjs` builds every Terraform command, and the AWS profile reaches each one through the environment. Only the create-or-reconcile `apply` passes the operator's current address as `/32`; the refresh-only `apply`, every destroy (the `destroy` subcommand included), and the plan of `status` pass the documentation address `192.0.2.1/32` and look up no IP. | [DDD §2](ddd.md#2-repository-structure-naming-and-toolchain), [§7.6](ddd.md#76-performance-and-compatibility-measurements); [IP T-59](ip.md#t-59--reference-measurement-environment) |
| **2** The 24-hour VM cost guard does not bound all retained costs | Confirmed | Self-termination ends the instance and, through `delete_on_termination = true`, its root volume; the security group, key pair, and Terraform state remain until `terraform destroy`. `run` begins with a refresh-only apply and reports what an interrupted run left, and a read-only `status` subcommand lists it. The 24-hour shutdown is a runtime cap, not a cleanup. | [DDD §2](ddd.md#2-repository-structure-naming-and-toolchain), [§7.6](ddd.md#76-performance-and-compatibility-measurements); [IP T-59](ip.md#t-59--reference-measurement-environment) |
| **3** The mobile manual-test server has an origin mismatch | Partly confirmed: Material 9.7.7's sitemap resolver takes the protocol and host from the page's own URL, so only the port must match and the sitemap entries resolve on the emulator and LAN hosts too; the manual procedure did lack per-environment origins and a survival check | No server flag: the browser-lane section states why the advertised origin needs no per-environment setting. Release checklist item 15 gives the origin each environment opens — `127.0.0.1`, the Android Emulator's `10.0.2.2`, a phone's LAN address with `--host 0.0.0.0` — and adds the lane's instant-navigation survival check, `window.__greProbe` across a site-link round trip. | [DDD §7.5](ddd.md#75-browser-test-lane), [§7.7](ddd.md#77-site-validation-and-release-checklist); [IP T-51](ip.md#t-51--site-validation-additions) |
| **4** Finite offset input can produce nonfinite converted windows | Confirmed | Free-entry text is capped at 16 characters after trimming, and an offset maximum is accepted only up to 1000 m (fixed here), so with the smallest exported slope every converted window and stored bound is finite; `convertWindows` asserts finiteness, and `parseScenario` applies the same bound. Planned tests take 16 and 17 characters, 1000 and 1000.0001, a 1000 m conversion case, and a rejected entry in the browser lane. | [DDD §5.7](ddd.md#57-scenario-controls), [§5.5](ddd.md#55-offset-to-slip-conversion-assist), [§5.10](ddd.md#510-failure-states), [§7.4](ddd.md#74-application-tests); [IP T-33](ip.md#t-33--conversion-assist), [T-34](ip.md#t-34--scenario-state), [T-60](ip.md#t-60--browser-test-lane) |
| **5** The scheduler's lazy-load completion does not clearly trigger a display-only render | Confirmed | The scheduler holds the field export's state (`absent`, `loading`, `ready`, `failed`). A change marks the height and width panels' legend and chart slots and requests a frame that re-renders them with Scenario and display state unchanged; a failed load is retried when the overlay is next switched on, and a successful retry removes the error line. The regression export reaches no slot except through a computed result. | [DDD §5.3](ddd.md#53-query-engine), [§5.8](ddd.md#58-view-layer), [§5.10](ddd.md#510-failure-states), [§7.5](ddd.md#75-browser-test-lane); [IP T-46](ip.md#t-46--accessibility-and-navigation-lifecycle), [T-49](ip.md#t-49--field-overlay) |
| **6** Some frame callbacks are not bound to the result revision they measure or announce | Confirmed | Each delayed callback of a committed result — the post-paint mark and the announcement — carries its Scenario sequence number and does nothing once a newer Scenario is accepted; `egr:*` marks carry `detail.seq`, and the measurement suite pairs the two interaction marks by it. A planned rapid-change drive (two accepted changes before the first announcement give one announcement and one paired mark, for the second) and a planned unit test of the discard rule cover it. | [DDD §5.3](ddd.md#53-query-engine), [§5.11](ddd.md#511-accessibility-supported-environments-and-navigation-lifecycle), [§7.6](ddd.md#76-performance-and-compatibility-measurements); [IP T-46](ip.md#t-46--accessibility-and-navigation-lifecycle), [T-61](ip.md#t-61--measurement-suite) |
| **7** The ECDF remains underspecified relative to the execution contract | Confirmed | This review specified a step at each distinct value to F = (count ≤ x) / n, drawn as a right-continuous path; above 512 distinct values, 512 points at `Math.round(j * (m - 1) / 511)`, with the maximum vertical error stated; a one-step domain for constant data; the read-off marker at (`quantileLinear(sorted, p)`, p), which may lie between steps. Planned tests covered duplicates, constant data, and m = 511, 512, and 513. The thinning rule and marker-error statement were superseded by the accepted DF-1 correction of 2026-11-01. | [DDD §5.12](ddd.md#512-charts), [§7.4](ddd.md#74-application-tests); [IP T-41](ip.md#t-41--measurement-panels-and-charts) |
| **8** The immutable-release withdrawal procedure conflicts with mandatory rollback readiness | Confirmed | Release checklist item 12 checks each release's owner-approved rollback target — an earlier software tag whose retained vintage passes the retention check, not necessarily the previous one, and never a withdrawn or affected vintage — or a recorded absence, `no rollback target: first release` for the first release. | [DDD §4.3](ddd.md#43-retention-rollback-recovery-and-withdrawal), [§7.7](ddd.md#77-site-validation-and-release-checklist); [IP T-64](ip.md#t-64--rollback-rehearsal-owner), [T-65](ip.md#t-65--v04-release-owner) |
| **9** Release evidence needs exact correspondence between the tested, tagged, and deployed code | Confirmed | The bundle's full SHA-256 is the build identity: equal in the CI artifact of the tested release-branch head, in the artifact of the run that deployed the `main` commit, and in the served bundle that the published-site run hashes. The `main` commit's tree equals the tested head's (`git diff --quiet`), and the software tag names that commit; version labels alone never establish identity. | [DDD §7.7](ddd.md#77-site-validation-and-release-checklist), [§6.2](ddd.md#62-software-and-data-version-stamps), [§7.6](ddd.md#76-performance-and-compatibility-measurements); [IP T-65](ip.md#t-65--v04-release-owner) |
| **10** A few specification claims still overstate their guarantees | Confirmed | Reworded: a hashed address never changes meaning, but an older cached page can name older assets until it revalidates; the reference VM is a configuration without burst credits, not identical processor time; `check` needs no research data, and no network once `npmCi` has installed the dependencies; slug injectivity is checked per token over its own vocabulary plus the delimiter rule, not by enumerating complete scenarios. | [DDD §6.2](ddd.md#62-software-and-data-version-stamps), [§7.6](ddd.md#76-performance-and-compatibility-measurements), [§2](ddd.md#2-repository-structure-naming-and-toolchain), [§5.9](ddd.md#59-downloads); [IP T-23](ip.md#t-23--wire-unit-tests-and-parity-into-testsyml) |
| **a** The supporting machinery should have its effort reflected in the IP, and not become a prerequisite for the core query engine's feasibility | Accepted | The IP splits its tasks into Phase 1 — Prototype (unlisted) and Phase 2 — Review and public release, per the owner's two-phase ruling (below): no Phase-1 task depends on a Phase-2 owner action; the traceability lint and the AWS environment and its measurements fall in Phase 2; the effort cells rate the added machinery — the publication tooling, the configuration and copy-agreement checker, the traceability lint, the AWS environment — on the IP's own scale; and the early feasibility diagnostic, T-37, depends only on the decoder, engine, and statistics tasks. | [IP §1](ip.md#1-milestones), [§3](ip.md#3-gates-and-release-sequence), [T-37](ip.md#t-37--early-feasibility-diagnostic) |
| **b** The PDD-agreement checker should not become a general Markdown interpreter | Accepted | Where a source format defeats the checker's reading, the remedy is an explicit structured source or a narrow exception listed in the script and accepted by the owner, never a wider parser. | [DDD §5.13](ddd.md#513-application-configuration) |
| **c** Review records need a durable evidence location | Accepted | This ledger, cited by the DDD's status line. | [DDD](ddd.md) (status line) |

## Review of ADR-0016 (2026-10-30)

The owner's review agent also reviewed
[ADR-0016 — Performance reference environment — an on-demand AWS VM defined by Terraform](../adr/0016-performance-reference-environment.md)
(Proposed). Its eight clarifications were applied to the ADR the same
day, as the ADR's date line records, and the DDD says the same in its
own words in register row [DD-12](ddd.md#1-ddd-decision-register)
(Performance reference environment) with its closure note, in
[§2](ddd.md#2-repository-structure-naming-and-toolchain) (Reference
environment), and in
[§7.6](ddd.md#76-performance-and-compatibility-measurements). The
points are numbered here in the order the correction pass recorded
them.

| Point | Verdict | Disposition | Where |
|---|---|---|---|
| **1** What the environment establishes | Accepted | It is the agreed acceptance baseline, a configuration anyone with the AWS account can recreate from the repository, not calibrated against laptops; recreating it does not make timings identical. | [ADR-0016 Decision](../adr/0016-performance-reference-environment.md#decision); [DD-12](ddd.md#1-ddd-decision-register) |
| **2** When the VM is destroyed | Accepted | Once a measurement run has completed and its report is downloaded, whether the report records a budget pass or a budget miss; it is kept after an infrastructure, execution, or report-retrieval failure. Whether the budgets are met is a separate release decision. | [ADR-0016 Decision](../adr/0016-performance-reference-environment.md#decision); [DDD §2](ddd.md#2-repository-structure-naming-and-toolchain), [§7.6](ddd.md#76-performance-and-compatibility-measurements) |
| **3** The 24-hour shutdown | Accepted | A best-effort runtime safeguard, with terminate-on-shutdown and root-volume deletion on termination set explicitly; the security group, key pair, and state remain until the destroy task runs (review 2, item 2). | [ADR-0016 Decision](../adr/0016-performance-reference-environment.md#decision); [DDD §7.6](ddd.md#76-performance-and-compatibility-measurements) |
| **4** SSH credentials | Accepted | No persistent SSH credential is intentionally stored outside the Terraform state; each connection writes the key to a temporary file with owner-only permissions and removes it; the state, its backups, saved plans, and the temporary keys are sensitive and stay out of commits, logs, and uploaded evidence. | [ADR-0016 Decision](../adr/0016-performance-reference-environment.md#decision); [DDD §2](ddd.md#2-repository-structure-naming-and-toolchain), [§7.6](ddd.md#76-performance-and-compatibility-measurements) |
| **5** Toolchain pinning | Accepted | Terraform CLI `~> 1.7`, the version used recorded in every report; the lock file pins the providers, not the CLI; what the instance installs at boot is pinned only as far as each installer allows. | [ADR-0016 Decision](../adr/0016-performance-reference-environment.md#decision); [DDD §2](ddd.md#2-repository-structure-naming-and-toolchain) |
| **6** No GPU | Accepted | Software rasterization is a limitation of the reference environment, not a proven safety margin. | [ADR-0016 Consequences](../adr/0016-performance-reference-environment.md#consequences); [DD-12](ddd.md#1-ddd-decision-register) |
| **7** Network emulation | Accepted | The 40 ms latency is the project's choice, taken from the round-trip time of the `desktopDense4G` profile, whose own request-latency and throughput-emulation fields are 0, with the PDD's 10 Mbps; the VM "may sit close to" the CDN, so the round trip is emulated rather than measured. | [ADR-0016 Decision](../adr/0016-performance-reference-environment.md#decision); [DD-12](ddd.md#1-ddd-decision-register); [DDD §7.6](ddd.md#76-performance-and-compatibility-measurements) |
| **8** The 95th-percentile rule | Accepted | The nearest-rank 95th percentile of 30 runs (at least 29 within budget) is a sample-based acceptance rule: it says the observed runs met the budget, not that later runs will. | [ADR-0016 Decision](../adr/0016-performance-reference-environment.md#decision); [DD-12](ddd.md#1-ddd-decision-register); [DDD §7.6](ddd.md#76-performance-and-compatibility-measurements) |

## Verification rounds

The correction pass checked its own work in three rounds of agent
review. Each round read the DDD and the IP against the PRD, PDD,
HLDD, and ADRs, the repository, and the installed toolchain
(mkdocs 1.6.1, mkdocs-material 9.7.7 with its bundle source, pytest
8.4.2). Where a claim needed it, a reviewer ran a throwaway script
or a scratch build — a simulation of the parity tolerance on the
processed data, a headless-browser run of Material's instant
navigation, a pytest run of the full-data gate's hooks. None of that
is kept in the repository, and none of it checks the product, which
does not exist yet.

1. **Verification of review 1.** Eight verifiers, one per topic —
   lifecycle and publication; controls, input, and state; test lanes
   and measurement; numerics and parity; provenance and evidence;
   build, CI, and media; unresolved specifications; accessibility and
   configuration — checked every sub-claim of the 24 findings and
   drafted a resolution for each: 23 confirmed, 1 partly confirmed
   (B-5). They raised 62 further issues, which went into the same
   correction pass.
2. **Adversarial review of the corrected documents**, as review 1
   recommended. Eight lenses simulated concrete sequences against the
   text — page lifecycle and publication; the data lane's operations;
   numerics and parity; the product surface; CI, the test lanes, and
   the AWS environment; a literal implementer of the IP; mechanical
   cross-document consistency; authority and owner-facing decisions —
   and reported 79 findings, 31 major and 48 minor. A fix pass
   addressed each one.
3. **Final verification.** One lens judged each of the 31 major
   findings against the revised text: 30 fixed, 1 partly fixed
   (L8-9: the default-set membership of
   [D-18](pdd.md#1-decision-register) (Field-overlay default set and
   per-source analogue map) was routed to owner action
   [OA-14](ip.md#4-owner-and-research-group-actions), but as
   a dependency of [T-10](ip.md#t-10--product-export-views) (Product
   export views), where it held 38 of the 46 tasks). That lens and
   three more — a second literal-implementer sample, a mechanical
   consistency sweep, and the governance wiring — reported 32 new
   findings, 10 major and 22 minor. The last pass addressed all of
   them, the partly fixed one by moving the OA-14 dependency to
   [T-55](ip.md#t-55--public-activation) (Public activation).

Review 2 followed. Seven proposer groups drafted 121 edits for its
items, and the editor applied 120 as written. The remaining one, the
list of new drives in [T-60](ip.md#t-60--browser-test-lane) (Browser
test lane), collided with another group's edit to the same sentence;
the final text carries both.

## Owner rulings (2026-10-30)

The owner made five rulings during the pass, all on 2026-10-30. Each
overrides the earlier proposal or rule named with it.

- **Log-scale toggle kept.** The pass had proposed leaving the
  optional log scale that
  [PDD §4.1 — Measurement views (FR-O1)](pdd.md#41-measurement-views-fr-o1)
  permits ("may offer") out of the MVP. The owner kept it: the width
  panel's histogram view offers octave bins from 0.1 m, with a
  "below 0.1 m" bar, when the matched positive widths span more than
  two decades. Recorded in [DD-5](ddd.md#1-ddd-decision-register)
  (Histogram bin rule) and [DDD §5.12](ddd.md#512-charts).
- **Releases are immutable.** A requirement, not the pass's
  recommendation: the owner enabled GitHub release immutability the
  same day (owner action
  [OA-11](ip.md#4-owner-and-research-group-actions), done).
  `publishVintage` re-checks it before publishing; a published
  vintage is never modified; a withdrawal deletes the whole data
  release, its tag name is never reused, and the replacement is the
  next tag
  ([DDD §4.2](ddd.md#42-publication-of-a-data-vintage),
  [§4.3](ddd.md#43-retention-rollback-recovery-and-withdrawal)).
- **An AWS reference environment.** On the owner's ruling,
  [PDD §9.1 — Performance budgets (D-9, Proposed)](pdd.md#91-performance-budgets-d-9-proposed)
  and [HLDD §2 — Performance budgets](hldd.md#performance-budgets)
  were amended: the reference is "a fixed reference environment
  standing in for a mid-range laptop (2020 or later) — a cloud
  virtual machine whose exact specification the DDD fixes", in place
  of the device class alone and of the pass's proposal, one
  owner-named laptop with every load-time run within budget.
  [ADR-0016 — Performance reference environment — an on-demand AWS VM defined by Terraform](../adr/0016-performance-reference-environment.md)
  (Proposed) records it: a Terraform root of its own, separate from
  the parked `deploy/terraform/` data layer; created if absent, run,
  destroyed on completion; an SSH key that Terraform generates.
  [DD-12](ddd.md#1-ddd-decision-register) (Performance reference
  environment) fixes the values.
- **Nearest-rank 95th percentile.** A time budget passes when the
  29th of the 30 ascending samples is within it — the "for at least
  95% of measured interactions" of
  [HLDD §2](hldd.md#performance-budgets). It replaced the
  interpolated percentile the pass had first adopted, which could
  pass a set with only 28 runs within budget
  ([DD-12](ddd.md#1-ddd-decision-register);
  [DDD §7.6](ddd.md#76-performance-and-compatibility-measurements)).
- **Two phases.**
  [ADR-0017 — An unadvertised prototype deployment precedes the public release](../adr/0017-unadvertised-prototype-before-public-release.md)
  (Proposed) overrides the documents' earlier rule that nothing could
  deploy before the research group's approvals. The application is
  deployed unlisted, with a prototype notice, under the current
  licensing stated as an assumption, for the research group's review.
  The rules attached to a public release — among them approval of the
  texts under [SC-7](pdd.md#101-success-criteria) (scientific
  sign-off), the [D-10](pdd.md#1-decision-register)
  (Liability-limitation text referenced by CR-4) text, and the release
  checklist — apply at activation and at the first software release,
  which the licensing decision, deferred to Phase 2, also precedes;
  the CI gates, the publication-inventory and media checks, and the
  rule that no third-party photograph deploys without documented
  permission apply from the first deployment
  ([DDD §6.1](ddd.md#61-build-outputs-asset-paths-and-page-scaffold),
  [§4.2](ddd.md#42-publication-of-a-data-vintage),
  [§7.7](ddd.md#77-site-validation-and-release-checklist)).

## Implementation plan review (2026-10-31)

The owner's review agent reviewed the implementation plan against an
earlier DDD, from before the amendments of review 2 and of
[ADR-0017 — An unadvertised prototype deployment precedes the public release](../adr/0017-unadvertised-prototype-before-public-release.md);
where the plan relies on the current DDD, a finding is a baseline
mismatch. It raised 14 findings and five observations, lettered here,
and recommended: "do not rewrite the plan." Seven proposer groups
drafted 111 edits for them, and one editor applied 110 as written and
the last by hand, then made seven consistency fixes, among them
setting aside the exclusion proposal of finding 2. Three verifiers
then read the result against the owner's rulings below, the review,
and the documents' consistency; their 60 edits went in the same way,
and edits that repeated or overlapped another verifier's edit of the
same text were merged into it by hand. The verdicts are the
proposers', as the verifiers judged them.

| Finding | Verdict | Disposition | Where |
|---|---|---|---|
| **1** One reviewed document baseline before execution | Partly confirmed: every absence it lists is in the current DDD (baseline mismatch); the plan named no source revision, and no task body had an acceptance record | The plan's status line ties it to the sources at its own revision, which rule 2 reads; the status `Accepted (YYYY-MM-DD)` records the owner's acceptance of a body; the status lines of both documents name this review and cite this ledger. | [IP](ip.md) (status line), [Execution contract](ip.md#execution-contract) (rule 2), [Task format](ip.md#task-format); [DDD](ddd.md) (status line) |
| **2** The prototype phase changes the approval and distribution boundaries | Partly confirmed: nothing recorded each source's own terms, and the authorizations were not stated apart. Refuted: that the prototype is a governance change from the PRD — the PRD and the PDD hold no implementation sequencing (owner ruling below); a restricted review deployment was weighed and rejected in ADR-0017 (Alternatives considered), and ADR-0017 deploys the prototype with its first data vintage | ADR-0017, amended 2026-10-31, defers the licensing decision to Phase 2 and keeps four authorizations apart: sharing the prototype (OA-17), the texts' sign-off (G-4), the [D-10](pdd.md#1-decision-register) (Liability-limitation text referenced by CR-4) text (G-5), and the licensing decision, source by source (OA-13, with the confirmed OA-1 record). `data/REDISTRIBUTION.md` holds one terms line per source that records only what is known, `not established` where nothing was found; no source is excluded, and T-18 stops on a missing line. A first proposal to exclude any source without evidence of permission was set aside, since ADR-0017 defers that question. | [ADR-0017 Decision](../adr/0017-unadvertised-prototype-before-public-release.md#decision); [DDD §4.4](ddd.md#44-licensing-archival-distribution-and-release-attachments) (Vintage terms), [§4.2](ddd.md#42-publication-of-a-data-vintage), [§6.1](ddd.md#61-build-outputs-asset-paths-and-page-scaffold); [IP §3](ip.md#3-gates-and-release-sequence) (G-1), [§4](ip.md#4-owner-and-research-group-actions) (OA-1, OA-13, OA-17), [T-18](ip.md#t-18--first-verified-publication-owner), [T-54](ip.md#t-54--prototype-deployment-unlisted) |
| **3** The first publication can be blocked by the CI changes it enables | Partly confirmed: the graph already put every check that reads the pointer, and every required check, after the first pointer pull request, but the plan never stated the bootstrap order | T-18 names what `main` carries before it — T-10–T-16, the OA-1 and OA-17 commits, and T-20 with T-01 and T-02, first as a merge order and, since [Implementation plan review 2 (2026-10-31)](#implementation-plan-review-2-2026-10-31), in T-18's Depends-on — and the checks its pointer pull request meets; CI first fetches and verifies the vintage after that merge, and the DDD states the first-vintage case. | [IP T-18](ip.md#t-18--first-verified-publication-owner); [DDD §4.2](ddd.md#42-publication-of-a-data-vintage) (step 11), [§7.3](ddd.md#73-pipeline-and-export-tests) |
| **4** T-11's completion depends on functionality assigned to its successors | Partly confirmed: T-11's Done-when never required the complete vintage, but its pointer step cited the full file set, one clause tested T-12's rule, and no integration check was named | T-11 states the intermediate pointer; the retained-copy clause moved to T-12, whose Done-when, after T-13, is named as the integration check. | [IP T-11](ip.md#t-11--export-task), [T-12](ip.md#t-12--export-validation) |
| **5** Incremental type-checking and copy checks need a construction strategy | Partly confirmed: the copy checker cannot bind before its resources exist, since T-47 creates them together; but T-47 imported a type that T-30 declares without depending on T-30, four tasks lacked the type-check, and nothing said when the checks bind | T-02 states the rule: `tscCheck` binds from T-02 for every task that adds or changes TypeScript, and a task imports only what its Depends-on closure created — no stubs, suppressed errors, or weakened checks. T-47 depends on T-30, and the copy-registry completeness rule binds from T-47; `tscCheck` joins the Done-whens of T-35, T-36, T-37, and T-48. | [IP T-02](ip.md#t-02--build-and-check-tasks), [T-47](ip.md#t-47--application-configuration), [T-35](ip.md#t-35--node-parity-harness), [T-36](ip.md#t-36--application-unit-tests), [T-37](ip.md#t-37--early-feasibility-diagnostic), [T-48](ip.md#t-48--kern-county-preset) |
| **6** "Agent task" completion includes owner-only executions | Confirmed: agent Done-whens ran research-data exports and full-data tests, while the plan reserved full-data operations to the owner | Rule 3 lets the agent run, on the owner's machine, local research-data operations that publish nothing — prechecks and diagnostics, never the publication or release evidence of T-18, T-63, or T-65; the owner runs publications, with the full-data checks inside them. The DDD points to the rule. | [IP Execution contract](ip.md#execution-contract) (rule 3), [Task format](ip.md#task-format); [DDD §7.3](ddd.md#73-pipeline-and-export-tests) |
| **7** Several verification drills are impossible as written | Partly confirmed. T-35: confirmed, its re-gzipped copy kept a content-derived name over new bytes. T-51: refuted (baseline), its check is already a bare MkDocs build after staging. Grep assertions on configuration: confirmed | T-35 builds a coherent modified vintage and names each drill's expected first failure. Configuration is checked by parsing its YAML or JSON, and by tests; greps stay for literal text and absences, and as guards beside the type-check and tests. | [IP Execution contract](ip.md#execution-contract) (rule 3), [T-35](ip.md#t-35--node-parity-harness), [T-51](ip.md#t-51--site-validation-additions) |
| **8** Destructive verification commands | Confirmed: `git checkout` restores and pointer rewrites could discard uncommitted work | Rule 5: a drill runs in the working tree only when it is clean, saves the exact bytes of every file it touches, and writes them back from an `EXIT` trap, confirmed with `cmp` — never through `git checkout`, `git restore`, `git stash`, or `git reset`; drills that commit or push run in a linked worktree; development exports save and restore the pointer. The agent reaches the clean tree by committing on its local task branch, which the owner allowed on 2026-10-31 (Owner rulings, below). | [IP Execution contract](ip.md#execution-contract) (rule 5); [T-03](ip.md#t-03--scenario-page-scaffold), [T-04](ip.md#t-04--traceability-lint), [T-21](ip.md#t-21--mkdocsyml-webapp-build-and-vintage-staging), [T-31](ip.md#t-31--query-engine), [T-35](ip.md#t-35--node-parity-harness), [T-37](ip.md#t-37--early-feasibility-diagnostic), [T-47](ip.md#t-47--application-configuration), [T-51](ip.md#t-51--site-validation-additions) |
| **9** Scheduling rules disagree about when work may begin | Confirmed: the start, completion, and gate conditions disagreed, and nothing recorded accepted bodies or completed tasks | One scheduling model separates starting a task, completing it, and taking a step with a public or external effect. The statuses Accepted and Done carry durable records: the owner's commit accepting the document pair sets Accepted; a task's Done rides in its last pull request, recorded by the owner's merge; on the release branch, T-52 and T-55 become Done with the release merge. | [IP Scheduling model](ip.md#scheduling-model), [Task format](ip.md#task-format) |
| **10** T-48 remains a release dependency outside the graph | Confirmed: T-48 joined the release only through an owner decision outside the graph | The chain is in the graph: T-48 depends on OA-2 and on the vintage T-63 publishes with [GS-3](pdd.md#102-golden-scenarios) (Kern preset (after D-6)), T-63 on OA-2, and T-65 on T-48, so the one release vintage follows [D-6](pdd.md#1-decision-register) (Kern County field-data group and principal-width rule). Revised after [Implementation plan review 2 (2026-10-31)](#implementation-plan-review-2-2026-10-31), finding 5: taking the preset out of this release is not a D-6 decision but a release-scope amendment of the PRD and the PDD, approved and committed by the product owner, for which the D-6 decision may give the reason; only a plan commit citing that dated record, after its check, drops T-48 from T-65's Depends-on, and T-63 still follows OA-2. | [IP §3](ip.md#3-gates-and-release-sequence), [§4](ip.md#4-owner-and-research-group-actions) (OA-2), [T-48](ip.md#t-48--kern-county-preset), [T-63](ip.md#t-63--release-vintage-owner), [T-65](ip.md#t-65--v04-release-owner) |
| **11** The rollback rehearsal does not rehearse rollback between working releases | Confirmed: an invalid pointer and its revert restore no earlier working state, and the redeploy has a public effect | T-64 is a revert-path rehearsal that restores no earlier vintage or release — the first release has no rollback target — and its redeploy, from an unchanged tree, is a public deployment the owner authorizes by starting it. | [IP T-64](ip.md#t-64--rollback-rehearsal-owner); [DDD §4.3](ddd.md#43-retention-rollback-recovery-and-withdrawal) |
| **12** Release approval timing needs one authoritative revision rule | Partly confirmed. Refuted: the timing complaint (baseline — the current DDD places the approval record after the activation commit and before the release merge) and the request to align the PDD — the PDD requires approval before public release, after [CR-10 — Scientific-content approval](prd.md#cr-10-scientific-content-approval), and which commit the approval precedes is the plan's. Confirmed: the record named no data vintage or build | The [SC-7](pdd.md#101-success-criteria) (scientific sign-off) approval record names the approved texts, the `data_tag`, and the `app.js` and `app.css` SHA-256s; T-65 compares them with the release commit before the merge; the record follows the merge of `main` into the release branch, and the version commit after it changes none of them. | [DDD §7.7](ddd.md#77-site-validation-and-release-checklist) (SC-7 approval record), [§6.1](ddd.md#61-build-outputs-asset-paths-and-page-scaffold), [§6.4](ddd.md#64-product-pages-beyond-the-scenario-page-p2p3); [IP §3](ip.md#3-gates-and-release-sequence), [§4](ip.md#4-owner-and-research-group-actions) (OA-4), [T-65](ip.md#t-65--v04-release-owner) |
| **13** The performance task has late dependencies not all needed | Confirmed: T-61's local specs and diagnostic run waited, through T-59, on Phase-2 owner actions | T-61 completes without T-59, run locally as a diagnostic; T-59 runs on the owner's machine with the operator's Terraform and names every network access its credential-free checks make; the reference runs belong to the release (OA-5, T-65), and accepting their report is a separate decision. | [IP T-59](ip.md#t-59--reference-measurement-environment), [T-61](ip.md#t-61--measurement-suite), [§4](ip.md#4-owner-and-research-group-actions) (OA-5) |
| **14** The traceability baseline omits the decisions that changed the plan | Confirmed: the rows date from the obligation sweep at `36abc56`, before [ADR-0016 — Performance reference environment — an on-demand AWS VM defined by Terraform](../adr/0016-performance-reference-environment.md) and ADR-0017 | Hand-added rows carry what ADR-0016 and ADR-0017 direct at the DDD and the plan, with their IP twins; the introductions say the sweep has not run since `36abc56`, which rows were added by hand, and which two ADR-0017 passages have none; the lint's claim stays limited to each row's form, citations, and twin. The sweep is not re-run now. | [DDD §8](ddd.md#8-traceability); [IP §7](ip.md#7-traceability) |
| **a** OA-7's record is produced by T-65, which depends on OA-7 | Confirmed | A dated record, `docs/app/approvals/release-YYYY-MM-DD.md` with the line `Version: X.Y.Z`, is committed before T-65, whose first step checks it; if GitHub will not reuse the software tag after its draft release is deleted, a new record names the next patch version. | [IP §4](ip.md#4-owner-and-research-group-actions) (OA-7), [T-65](ip.md#t-65--v04-release-owner) |
| **b** OA-6 combines software archiving with the data-deposit decision | Confirmed | One record line per decision — software archiving enabled or deferred with a reason, and the data deposit a Zenodo dataset record or deferred with a reason — each checked by T-65. | [IP §3](ip.md#3-gates-and-release-sequence), [§4](ip.md#4-owner-and-research-group-actions) (OA-6), [T-65](ip.md#t-65--v04-release-owner) |
| **c** T-59's credential-free validation needs an exact policy for tools and network | Confirmed | T-59 names the machine, the operator's Terraform installation, and each network access. | [IP T-59](ip.md#t-59--reference-measurement-environment) |
| **d** The release needs failure handling between public deployment and publication | Confirmed | From the release merge until publication, a failure stops T-65 and the owner records the deployed state; the first release has no rollback target, so the fix goes forward through a new release pull request, once the release branch is fast-forwarded to `main`, with the OA-4 check run again. | [IP T-65](ip.md#t-65--v04-release-owner) |
| **e** Retries must respect locked assets and tags | Partly confirmed: T-18 already respected the locks; T-65 had no retry rule | T-65 retries only on the unpublished draft; once published, a release's assets and tag never change, and a later defect goes to the next patch release. | [IP T-65](ip.md#t-65--v04-release-owner) |

**Owner rulings (2026-10-31).** Each overrides any earlier proposal
or rule it touches.

- **The licensing decision is deferred to Phase 2, and the documents
  say so.** ADR-0017, amended the same day, states it in its
  paragraphs "The licensing decision is deferred to Phase 2" and
  "Four authorizations, kept apart"; Phase 1 runs on the current
  licensing, stated as an assumption. Phase 1 adds no licensing rule
  beyond recording facts: no source is excluded, and each source's
  terms line records what is known — the license or a written
  permission found, with the `https://` URL of the page that states
  it, or `not established (checked YYYY-MM-DD)` with the source's DOI
  URL. Establishing the terms not yet known belongs to the deferred
  decision (OA-13). A missing line stops the upload; a
  `not established` line does not.
- **The PRD and the PDD hold no implementation sequencing.** Phases,
  the prototype, gate timing, and deferrals are not theirs: they are
  not amended for them and are never cited as the authority for a
  sequencing or data-terms rule. The OA-1 record line in
  [DDD §4.4](ddd.md#44-licensing-archival-distribution-and-release-attachments)
  therefore cites
  [Licensing and archival distribution](hldd.md#licensing-and-archival-distribution),
  not [NFR-6 — Licensing](prd.md#nfr-6-licensing), which covers code,
  prose, paper figures, and third-party media. Citations of the PRD
  and the PDD for product content stay: the copy-deck texts, SC-7 as a
  success criterion, CR-10's approval before a public release, and the
  D-10 text.
- **Releases stay immutable, with no test repository.** T-18 is the
  end-to-end publication run; if GitHub will not reuse a software tag
  after its draft release is deleted, the release takes the next
  patch version.
- **Commits and pushes.** The agent may create local throw-away
  branches, its task branch among them, and commit there — never on
  `main` or the branch the owner works on; it pushes a branch or
  opens a pull request only when the owner asks. Rule 5's clean tree
  is reached by committing on the task branch.
- **The reference environment's AWS setup.** It uses the account of
  the parked Athena work, which is shared and had no VPC, a default
  one included; the VM runs in a dedicated network that the owner
  keeps (a VPC, one public subnet, an internet gateway, a route
  table), never a default VPC. That network and every resource
  Terraform creates, the instance's network interface excepted, carry
  the tags `Purpose=perf-reference`, `School=EPS`,
  `Project=eps-ground-rupture`, and `Stakeholder=John Shaw`; beyond
  the read-only `ec2:Describe*` actions and Canonical's public SSM
  parameters, the measurement profile may create, change, or delete
  only tagged instances, security groups inside that network, and
  tagged key pairs, and no network
  ([DDD §7.6](ddd.md#76-performance-and-compatibility-measurements);
  [IP §4](ip.md#4-owner-and-research-group-actions): OA-16, recorded
  2026-10-31, and the setup that OA-5's reference runs need, in place
  since that date).

**Answers applied to the first correction pass's questions.** The
owner merges every task pull request; the owner's commit accepting
the document pair sets each accepted body's status to Accepted, and
a task's Done rides in its last pull request, recorded by the
owner's merge (finding 9). A withdrawal over a source's terms applies
to each vintage carrying data derived from that source, as
ADR-0017's Consequences now say; DDD §4.3 already works vintage by
vintage. The Kern County chain stays in the graph, with one release
vintage (finding 10); the approval record names the vintage and the
build (finding 12); the OA-6 and OA-7 records stand (observations a
and b); the agent's local research-data operations are allowed
(finding 6); T-20 merges before T-18 (finding 3); T-47 depends on
T-30 (finding 5); the code greps stay as guards (finding 7); T-59 runs
on the owner's machine, and its drill may look up the operator's
address at `https://checkip.amazonaws.com` (observation c); and the
obligation sweep is not re-run now (finding 14).

**Per-source terms as found on 2026-10-31.** What each source's
Phase-1 terms line can record:

- **SURE 2.0** (Nurminen et al., 2022): CC BY 4.0, as its Zenodo
  record states,
  [10.5281/zenodo.7020265](https://doi.org/10.5281/zenodo.7020265).
- **DEM experiments** (Chiama et al., 2024a and 2024b,
  DesignSafe-CI): the Open Data Commons Attribution License (ODC-By),
  which DesignSafe states for project PRJ-4680 and both its
  publications in the metadata of the page both DOIs open,
  <https://www.designsafe-ci.org/data/browser/public/designsafe.storage.published/PRJ-4680>,
  and for the project in its publications API, as a second search
  found the same day
  ([Implementation plan review 2 (2026-10-31)](#implementation-plan-review-2-2026-10-31));
  the DataCite records of
  [10.17603/ds2-xpq0-gw80](https://doi.org/10.17603/ds2-xpq0-gw80) and
  [10.17603/ds2-gfsj-pp60](https://doi.org/10.17603/ds2-gfsj-pp60)
  list no rights.
- **FDHI flatfile** (Sarmiento et al., 2021, UCLA Dataverse): CC0
  1.0, which the UCLA Dataverse dataset page,
  <https://dataverse.ucla.edu/dataset.xhtml?persistentId=doi:10.25346/S6/Y4F9LJ>,
  and its API state for version 1.4 of the dataset (2024-05-29), as
  a later look found the same day
  ([Implementation plan review 2 (2026-10-31)](#implementation-plan-review-2-2026-10-31));
  the DataCite record of
  [10.25346/S6/Y4F9LJ](https://doi.org/10.25346/S6/Y4F9LJ) lists no
  rights.
- **Kern County compilation**: the written permission of 2026-09-18
  from the lead author, who compiled the rows, that they may be
  redistributed with the code and data, as
  [`docs/datasets.md` — Kern County (`Combine_BuwaldaFDHI_KernSDC.csv`)](../datasets.md#kern-county-combine_buwaldafdhi_kernsdccsv)
  records; its terms line cites that file on `main`,
  <https://github.com/HarvardRC/eps-ground-rupture/blob/main/docs/datasets.md>.
  Whether the permission covers the compilation's FDHI entries
  belongs to the deferred decision.

**Open owner questions.**

- **Commits on task branches — answered 2026-10-31.** Yes: local
  throw-away branches with commits (Owner rulings, above).
- **The DEM terms line's URL.** The URL slot takes the first
  publication's DOI; the attribution cites both publications with
  both DOIs, and the line format keeps one URL. Applied as drafted;
  the owner may revise it.
- **Done after a task's own merge.** T-18, T-54, T-63, T-64, and T-65
  carry their Done in the next pull request merged; on the release
  branch, T-52 and T-55 become Done with the release merge, their
  commits standing in until then. Applied as written; the owner may
  revise it.
- **Approval after `main` joins the release branch.** Because the
  approval record names the vintage and the build, it is made once
  the release branch contains `main` with every task T-65 depends on,
  so the research group approves T-48's copy and preset with the
  rest. Applied as written; the owner may revise it.
- **Rows for two ADR-0017 passages.** Its paragraph Implementation
  sequencing only and its withdrawal consequence have no traceability
  rows until the sweep runs again; not added by hand, and the DDD §8
  introduction names them.

## Implementation plan review 2 (2026-10-31)

The owner's review agent reviewed the revised implementation plan a
second time the same day, without the current DDD,
[ADR-0017 — An unadvertised prototype deployment precedes the public release](../adr/0017-unadvertised-prototype-before-public-release.md),
or this ledger; a finding that only those settle is a baseline
mismatch. It found that the revision "resolves most of the previous
review's execution-planning findings", requested no broad rewrite,
raised seven findings and an item on publication governance, and
recommended: "accept the general structure and stop expanding
supporting process." It named as ready to proceed, subject
to the owner's acceptance of their source sections, the toolchain and
build scaffolding, the draft-only page scaffolding, the pipeline
views, the export and reference-generation implementation, the
fixture tests, the decoder and state contracts, and the early
nonpublishing calculation diagnostics. Seven proposer groups drafted
42 edits, each judging its finding against the current documents,
and one editor applied all 42 as written, then made five consistency
fixes: the status lines of both documents; this review's name where
the plan cites it; what G-1 says `publishVintage` step 1 checks; the
plan's Blocked-by index, which the new links of T-15, T-54, and T-65
extend; and the scope of the DesignSafe evidence below. The verdicts
are the proposers'. A final review of the result found that the FDHI
terms could be established (below), four minor defects, and a
cosmetic one; one editor fixed them and applied the owner's decisions
of the same day (rulings below).

| Finding | Verdict | Disposition | Where |
|---|---|---|---|
| **1** T-62 is still Draftable despite an explicitly unresolved input | Confirmed: the body stopped for an owner designation that no document records — the PDD's golden-scenario table maps only US-1 to a scenario — and the pass condition of [US-3](prd.md#us-3-design-review) (Design review) also needs the consultant's reported scarp height, which no source gives | T-62 is Blocked until the product owner records, under [D-21](pdd.md#1-decision-register) (Success criteria and acceptance walkthroughs) in [PDD §10.3 — Acceptance walkthroughs](pdd.md#103-acceptance-walkthroughs), the scenario each of the [US-2](prd.md#us-2-pipeline-crossing) (Pipeline crossing) and US-3 walkthroughs drives, with US-3's reported scarp height; candidate steps drafted meanwhile are preparatory work, neither starting the task nor accepting its body. Only T-55 and T-65, both of Phase 2, depend on T-62. | [IP §2](ip.md#2-task-graph) (T-62 row), [T-62](ip.md#t-62--acceptance-walkthrough-scripts), [§6](ip.md#6-blocked-by-index); [`notes/Roadmap.md` — Ground Rupture Explorer — owner actions (opened 2026-10-30)](../../notes/Roadmap.md#ground-rupture-explorer--owner-actions-opened-2026-10-30) (OA-5) |
| **2** First-publication ordering still has a prerequisite outside the graph | Confirmed: T-18 asked for T-20, with T-01 and T-02, as "a merge order, not a Depends-on edge", outside the Depends-on columns that the scheduling model makes authoritative, and a Done record did not say whether the task's implementation had reached `main` | T-20 joins T-18's Depends-on, whose closure then holds T-01, T-02, T-10–T-16, and T-20, with no cycle; T-18 step (1) names them as Done and on `main` through that closure. The Task format states once that a Done record means the task's implementation is on `main`, the commits of T-52 and T-55 reaching it with the release merge. T-20's whole Done-when, its scratch-branch push checks included, now precedes T-18. | [IP T-18](ip.md#t-18--first-verified-publication-owner), [Task format](ip.md#task-format) |
| **3** "Diagnostics gate nothing" contradicts T-65's dependency list | Confirmed: T-65 depends directly on T-17 and T-37 | The Scheduling model separates a diagnostic's completion and record, which bind as any task's do — T-65 depends on T-17 and T-37 for theirs — from its numerical result, which is never an acceptance gate; the reference measurement of release-checklist item 5 remains the performance acceptance gate. | [IP Scheduling model](ip.md#scheduling-model); [DDD §7.7](ddd.md#77-site-validation-and-release-checklist) (item 5) |
| **4** T-61 leaves an early type-checking prerequisite late | Partly confirmed. Refuted: the `caniuse-lite` ordering, which the review itself calls workable — no file before T-61 imports the package, and T-61 creates `test/caniuse-lite.d.ts` with its one importer. Confirmed: the DDD put `SCENARIO_INPUT_FIELDS` and `mapRecord` in `decode/` and the scenario's interpretation in `parseScenario` in `state/`, but stated no import direction, and no Done-when checked one | DDD §5.6 states that `src/state/scenario-json.ts` imports `SCENARIO_INPUT_FIELDS` and `mapRecord` from `src/decode/fields.ts` and that no file of `src/decode/` imports a file of `src/state/`; T-30's Done-when guards the boundary with a grep beside `tscCheck`, and T-34 runs the same guard once `src/state/` exists. An interface check, not a new task. | [DDD §5.6](ddd.md#56-scenario-state-and-url-encoding); [IP T-30](ip.md#t-30--loader-and-decoder), [T-34](ip.md#t-34--scenario-state) |
| **5** The Kern-example scope-change path needs product-scope authority | Confirmed: the plan let a [D-6](pdd.md#1-decision-register) (Kern County field-data group and principal-width rule) decision that the preset is not in this release drop T-48 from T-65's Depends-on, but D-6 decides only the preset's family and slip-cap filter and its field-data group, and [FR-O6 — Kern County worked example](prd.md#fr-o6-kern-county-worked-example) is a P1 requirement of the v0.3 release | Only a release-scope amendment of the PRD and the PDD by the product owner takes the preset out of this release; the D-6 decision may give the reason, never the authority. IP §3 states the amendment's record — one dated product-owner commit that moves FR-O6 out of P1 in the PRD, its Appendix A row included, and adds a PDD decision-register row — and its check, run before the plan commit that cites the record; only that commit drops T-48 from T-65's Depends-on, and T-63 still follows OA-2. Without the amendment, the default chain holds. Finding 10 of the first review of the plan is revised to match. | [IP §3](ip.md#3-gates-and-release-sequence), [§4](ip.md#4-owner-and-research-group-actions) (OA-2), [T-63](ip.md#t-63--release-vintage-owner); [`notes/Roadmap.md` — Ground Rupture Explorer — owner actions (opened 2026-10-30)](../../notes/Roadmap.md#ground-rupture-explorer--owner-actions-opened-2026-10-30) (OA-2) |
| **6** T-65's failure handling does not cover all post-merge failures | Confirmed: step (7) named no failed main-branch deployment, and its cleanup assumed a draft or a tag, which a failure in step (4) precedes | T-65 step (7) reads the publication state — the push run's conclusion, the release, and the tag on `origin` — and a four-row table gives each state's response: a failed push run leaves the site of the newest successful Companion site run published, recorded by that run's `headSha` and URL, and is rerun or fixed forward; with neither a draft nor a tag, nothing is deleted; a tag alone is deleted from `origin` and locally; a draft is deleted, its tag kept only for an item-11 retry. | [IP T-65](ip.md#t-65--v04-release-owner); [DDD §6.3](ddd.md#63-ci-workflows), [§4.2](ddd.md#42-publication-of-a-data-vintage) |
| **7** The publication drill fixture needs an explicit synthetic-mode contract | Confirmed: the fixture DDD §4.2 specified, the frames of the §7.3 fixture lanes, met neither the layouts of the committed `deploy/terraform/tables.json` that step 4's clean-tree check needs nor the nine-pair `dictionary-order` constant, the 101-stage stride, rule `coefficient-reach`, or the GS-1 dips that the boundary cases read | DDD §4.2 states the fixture contract — raw files with the layouts and types the committed `deploy/terraform/tables.json` records, and `DEM_dataset.csv` trials over the nine pairs and the §3.1 values — under which `egr-build`, the export, and the reference generator run unchanged; only `publish.py` reads the drill override, and no rule is relaxed. T-15 follows the contract and escalates a rule the fixture cannot meet; its drill (a) is the fixture-backed demonstration — the staged reference file lists the scenarios of T-13's Done-when and 86 boundary cases — with a grep confining the override to `publish.py`. The contract was drafted against the repository's pipeline code with a throwaway script, not kept; the evidence is drill (a), planned. | [DDD §4.2](ddd.md#42-publication-of-a-data-vintage); [IP T-15](ip.md#t-15--publication-tooling) |
| **Publication governance** The plan still publishes before establishing whether each source permits it | Partly confirmed: the plan already said that the assumed record is no evidence of permission, but recorded the deferral without the distribution risk the owner accepts with it, and still labelled `publishVintage` step 1 a permission gate. Not adopted: the required authorization before T-18 or T-54, or a review under restricted access or already-authorized data — the owner keeps the deferral (ruling below), which the review allows when the risk is recorded explicitly | G-1, T-18 step (1), and T-54 each state the unresolved distribution risk — the vintage fetchable by anyone who finds it, fetched copies beyond recall, and the withdrawal of DDD §4.3 the remedy for a source whose terms forbid the redistribution — which the owner accepts in ADR-0017 (Consequences), and that this acceptance, not evidence of permission, answers the hold, which the owner overrode on 2026-10-31 (ruling below). Step 1 is the terms-record gate, named for what it checks — the record line, the wording, and immutability — and G-1 says that it never checks whether a source permits the redistribution. A second search found the DEM terms, and a later look the same day the FDHI terms (below). | [IP §3](ip.md#3-gates-and-release-sequence) (G-1), [T-15](ip.md#t-15--publication-tooling), [T-18](ip.md#t-18--first-verified-publication-owner), [T-54](ip.md#t-54--prototype-deployment-unlisted), [T-63](ip.md#t-63--release-vintage-owner); [DDD §4.2](ddd.md#42-publication-of-a-data-vintage) (step 1); [ADR-0017 Consequences](../adr/0017-unadvertised-prototype-before-public-release.md#consequences) |

**Owner rulings (2026-10-31).** The rulings of the first review of
the plan stand; six are made for this one.

- **The licensing decision stays deferred.** The owner keeps
  ADR-0017's deferral against the review's hold on the external
  publication steps, as the review allows when the unresolved
  distribution risk is recorded explicitly and G-1's assumed form is
  not described as a verified permission gate. Phase 1 adds no
  licensing rule beyond recording facts.
- **Product decisions are the PRD's and the PDD's.** They hold no
  implementation sequencing, but taking a P1 requirement such as
  FR-O6 out of a release is a product decision, which the product
  owner records there; the plan then cites that record. The
  correction pass edits neither document: the plan states what the
  product owner records.
- **ADR-0016 and ADR-0017 are accepted.** The owner approved both on
  2026-10-31, owner actions OA-12 and OA-17. Their status lines and
  their rows in `docs/adr/README.md` read Accepted in the working
  tree, where the HLDD's "(Proposed)" labels are swept as well; the
  record is the owner's dated commit of that status. The final pass
  removed the labels from the DDD, the plan, and `notes/Roadmap.md`,
  and states the two acceptances where those documents, the owner's
  local walkthrough note, and this ledger's open items still had them
  pending; the earlier sections of this ledger keep the labels they
  recorded at the time.
- **The review's hold is overridden.** The owner overrode the hold
  that the review placed on T-18 and T-54. G-1, T-18 step (1), and
  T-54 say so beside the risk the owner accepts in ADR-0017
  (Consequences); neither the acceptance nor the override is evidence
  that a source permits the redistribution.
- **Claude carries out the reference environment's AWS operations.**
  OA-5's reference runs and their cleanup are run by Claude at the
  owner's request with the owner's `egr-perf` profile; an agent
  task's commands still run without AWS credentials, and the records
  and checks are unchanged
  ([IP Execution contract](ip.md#execution-contract), rule 3;
  [T-59](ip.md#t-59--reference-measurement-environment); OA-5).
- **A budget miss is a failure, and obvious improvements come
  first.** A reference run that misses a budget is recorded as a
  failure — release-checklist item 5 fails in the run's record — and
  reported to the owner at once. An obvious improvement that
  sacrifices no functionality — every specified behavior kept, every
  test, parity check, and browser-lane check unchanged — is made by
  default, before any other remedy, and also when every budget is
  met; one that would change specified behavior or a DDD decision goes
  to the owner as a proposal
  ([IP Execution contract](ip.md#execution-contract), rule 4;
  [T-61](ip.md#t-61--measurement-suite); OA-5).

**Per-source terms, second search (2026-10-31).** The DEM
experiments are under the Open Data Commons Attribution License
(ODC-By): the metadata of the DesignSafe page that both DOIs open
states it for project PRJ-4680 and both its publications, and
DesignSafe's publications API states it for the project. The FDHI
flatfile is under CC0 1.0: the search met a bot check at the UCLA
Dataverse and did not bypass it, and the DataCite and OpenAIRE
records, the FDHI database report (GIRS-2021-08, Rev. 3.2), and the
FDHI databases page of UCLA's NHR3 center state no license, but the
Dataverse dataset page and its API, which answered plain requests
the same day, state CC0 1.0 for version 1.4 of the dataset
(2024-05-29), its flatfile unrestricted. The DEM and FDHI bullets of
the first review's list and OA-1 in `notes/Roadmap.md` now record
them. Two facts for the licensing
decision of Phase 2 (OA-13): ODC-By 1.0 asks that a publicly conveyed
Derivative Database be conveyed "only under the terms of this
License" (§4.2 a), and that a publicly used Produced Work carry a
notice that its content was obtained from the database and is
available under that license (§4.3); and the DEM experiments'
creators in their DataCite records are the five authors of the study
the exports serve.

**Open owner questions.**

- **The walkthrough scenarios of US-2 and US-3** (finding 1): which
  scenario each walkthrough drives, and the reported scarp height the
  US-3 script gives the reviewer, recorded under D-21 in PDD §10.3.
  Recommended: US-3 on the settings of US-1's golden scenario, with
  one stated reported value; US-2 on stated settings that fit its
  story — loose, shallow sediment on a steeply dipping fault — since
  none of the eight golden scenarios does; and §10.3 saying that a
  walkthrough scenario need not be a golden scenario,
  [SC-3](pdd.md#101-success-criteria) (correctness) resting on the
  golden scenarios through the parity run. A new golden scenario
  would also change PDD §10.2,
  [ADR-0015 — Golden-scenario references and a pipeline↔client parity harness](../adr/0015-golden-scenario-parity.md),
  DDD §3.6, and T-13; on the recommended path, the commit that
  unblocks T-62 aligns "against the golden scenarios" in DDD §7.7
  item 13 and in T-62's row and step (1) with the new §10.3 wording.
  Recorded before or with the acceptance of the document pair, the
  decision lets T-62 be accepted with the rest.
- **The release-scope amendment's form** (finding 5). Recommended: the
  form IP §3 states — one dated product-owner commit that moves FR-O6
  out of P1 in the PRD, its Appendix A row included, and adds a PDD
  decision-register row whose Decision cell reads
  `FR-O6 (Kern County worked example) is out of the v0.3 release.`,
  with Owner `Product owner`, Status `Decided (YYYY-MM-DD)`, and the
  reason in its last cell. Amending the row of
  [D-1](pdd.md#1-decision-register) (P1 is the MVP and release target
  (v0.3)) instead would need another check.
- **D-6 after such an amendment** (finding 5): should a release
  without FR-O6 still wait for D-6? Recommended: yes — T-63 keeps
  OA-2, since ADR-0017 lists D-6 among the decisions recorded before
  activation; a release free of D-6 needs that list amended first,
  and the same plan commit then removes OA-2 from T-63.
- **The DEM terms line's URL** (publication governance). Recommended:
  keep the first publication's DOI in the URL slot: it opens the
  DesignSafe page that states the license, as the SURE line's DOI
  opens the Zenodo record that states its own.
- **ODC-By and the assumed CC BY 4.0 — answered 2026-10-31**
  (publication governance): its §4.2 and §4.3 bear on the assumed
  terms of the three DEM-derived exports. As recommended, no Phase-1
  change: the licensing decision of Phase 2 (OA-13) takes them up
  with the DEM experiments' authors, §4.2(a) of ODC-By 1.0 among its
  named inputs.

## Open items routed to owner actions

The owner's actions, with their phase, timing, and status, are listed
in
[`notes/Roadmap.md` — Ground Rupture Explorer — owner actions (opened 2026-10-30)](../../notes/Roadmap.md#ground-rupture-explorer--owner-actions-opened-2026-10-30);
[IP §4 — Owner and research-group actions](ip.md#4-owner-and-research-group-actions)
defines each action's record and check. The open items that the
reviews and the verification rounds leave with the owner:

- **Section acceptance.** Review 2 recommends approving the relevant
  sections and beginning implementation with early executable
  checks. Acceptance is the owner's act, section by section
  ([Readers and review contract](ddd.md#readers-and-review-contract)).
  The user-visible register rows close only with it:
  [DD-4](ddd.md#1-ddd-decision-register) Measurement-panel
  arrangement (tabs or stacked);
  [DD-5](ddd.md#1-ddd-decision-register) Histogram bin rule;
  [DD-6](ddd.md#1-ddd-decision-register) Download file-name
  scenario-slug rules;
  [DD-9](ddd.md#1-ddd-decision-register) Chart text-alternative
  mechanism;
  [DD-11](ddd.md#1-ddd-decision-register) Canonical scenario
  serialization. So do row
  [DD-12](ddd.md#1-ddd-decision-register) (Performance reference
  environment), on which every [SC-4](pdd.md#101-success-criteria)
  (performance) verdict rests, and the three readings listed in
  [Authority and change control](ddd.md#authority-and-change-control).
- **The two ADRs approved on 2026-10-31.** The owner approved
  [ADR-0016 — Performance reference environment — an on-demand AWS VM defined by Terraform](../adr/0016-performance-reference-environment.md),
  owner action [OA-12](ip.md#4-owner-and-research-group-actions),
  which precedes the building of the reference environment — its
  pinned image ID, [OA-16](ip.md#4-owner-and-research-group-actions),
  is recorded (2026-10-31) — and
  [ADR-0017 — An unadvertised prototype deployment precedes the public release](../adr/0017-unadvertised-prototype-before-public-release.md),
  owner action OA-17, which precedes the publication of the first
  data vintage and the prototype deployment. Left is the record, the
  owner's dated commit of their Accepted status, which the working
  tree holds
  ([Implementation plan review 2 (2026-10-31)](#implementation-plan-review-2-2026-10-31)).
- **[OA-10](ip.md#4-owner-and-research-group-actions)**, the ruleset
  of review 1's B-9, on `main` and on `dev-v.0.4.x`
  ([Owner decisions on versions and branches (2026-11-01)](#owner-decisions-on-versions-and-branches-2026-11-01)),
  with its reading of
  [ADR-0015 — Golden-scenario references and a pipeline↔client parity harness](../adr/0015-golden-scenario-parity.md)'s
  "a parity failure blocks merge" under the admin bypass.
- **[OA-4](ip.md#4-owner-and-research-group-actions)**, the approval
  of the reader-facing texts under
  [SC-7](pdd.md#101-success-criteria) (scientific sign-off) — among
  them the fixed-here texts these corrections added, such as the
  slip-entry rejection line (B-2), the chart-data disclosure label
  (C-1), and the prototype notice — recorded with each text's
  SHA-256, the `data_tag`, and the `app.js` and `app.css` SHA-256s,
  so that a later change to a listed text, the vintage, or the bundle
  needs a new approval.
- **[OA-5](ip.md#4-owner-and-research-group-actions)**, the
  release-time reference measurement (C-3) and the manual pass over
  the other baseline engines and mobile browsers (C-2; review 2,
  item 3).
- **The walkthrough scenarios of
  [US-2](prd.md#us-2-pipeline-crossing) (Pipeline crossing) and
  [US-3](prd.md#us-3-design-review) (Design review)**, with US-3's
  reported scarp height — a product acceptance decision under
  [D-21](pdd.md#1-decision-register) (Success criteria and acceptance
  walkthroughs) that the product owner records in
  [PDD §10.3 — Acceptance walkthroughs](pdd.md#103-acceptance-walkthroughs);
  [T-62](ip.md#t-62--acceptance-walkthrough-scripts), the walkthrough
  scripts, is Blocked until then
  ([Implementation plan review 2 (2026-10-31)](#implementation-plan-review-2-2026-10-31),
  finding 1).
- **Release steps** of [T-65](ip.md#t-65--v04-release-owner), the
  v0.4 release, which the owner runs under
  [OA-9](ip.md#4-owner-and-research-group-actions): approving the
  release's rollback target or recording its absence (review 2,
  item 8), and comparing the three bundle digests (item 9).
- **Routed by the verification rounds:**
  [OA-14](ip.md#4-owner-and-research-group-actions) records the
  default-set membership of [D-18](pdd.md#1-decision-register)
  (Field-overlay default set and per-source analogue map) before
  activation; [OA-3](ip.md#4-owner-and-research-group-actions) lands
  the [D-10](pdd.md#1-decision-register) (Liability-limitation text
  referenced by CR-4) text; and
  [OA-13](ip.md#4-owner-and-research-group-actions) records the
  licensing decision that ADR-0017 defers to Phase 2, and the
  confirmed record of [OA-1](ip.md#4-owner-and-research-group-actions)
  lands with it or after it; until then, Phase 1 publishes under the
  assumed terms that
  [DDD §4.2](ddd.md#42-publication-of-a-data-vintage) step 1 records,
  beside each source's terms line.

## Repository-backed design review (2026-10-31; disposition 2026-11-01)

This review read the product, architecture, detailed-design, and
implementation-plan documents against relevant pipeline code,
checked the documentation links and task dependencies, and ran
targeted diagnostics against the raw simulation data and the exact
browser-support package. These diagnostics are not execution of the
planned application or its test suite.

The owner directed that the P1 finding be fixed, allowed a fresher
browser requirement, and required explicit error messages. The owner
initially deferred the P2 and P3 findings below; those labels are
review priorities, not the product's delivery phases. The later
DF-1–DF-6 decisions below accept a bounded ECDF correction, explicit
reload recovery, release-based data identity and evidence, guarded
startup announcements, a manifest-defined uniform stage count, and
complete exporter prerequisites and provenance. All six are corrected
in design.

| Finding | Disposition | Correction or deferred work | Where |
|---|---|---|---|
| **P1 — Compatibility gate cannot pass** | Corrected in design | The old dataset and 24-month window select Firefox 108 and Safari/iOS 16.2, below the required `DecompressionStream` minima. The support policy now uses 12 months, the dataset pin is `1.0.30001820`, and the release gate requires its newest browser release to be at most 30 days old. The inventory records a scoped Safari Streams partial-support exception backed by MDN's used-API evidence. Failure diagnostics name the API and tested browser. Runtime and ordinary static fallback copy state the browser policy and explicit update/reload steps, including iOS/iPadOS updates for Safari. | [PDD §9.2](pdd.md#92-browser-and-mobile-baseline-d-16-proposed); [HLDD §2](hldd.md#2-architectural-constraints), [§6.1](hldd.md#61-failure-honesty-adr-0010); [DDD §2](ddd.md#2-repository-structure-naming-and-toolchain), [§5.10](ddd.md#510-failure-states), [§7.5](ddd.md#75-browser-test-lane), [§7.6](ddd.md#76-performance-and-compatibility-measurements), [§7.7](ddd.md#77-site-validation-and-release-checklist); [IP T-01](ip.md#t-01--gradle-webapp-subproject), [T-03](ip.md#t-03--scenario-page-scaffold), [T-44](ip.md#t-44--failure-states), [T-61](ip.md#t-61--measurement-suite), [T-65](ip.md#t-65--v04-release-owner); [ADR-0014](../adr/0014-committed-content-hashed-artifacts.md) |
| **P2 — ECDF thinning loses large tied jumps** | Corrected in design after owner decision (2026-11-01) | The superseded rule understates the scarp-dip cumulative share by about 8 percentage points at slip 0–0.5 m. DF-1 replaces it with count-based thinning guaranteeing at most 100/511 ≈ 0.195695 percentage points of vertical simplification error, with a visible and accessible accuracy statement; statistics and percentile read-offs still use the full data. Reader-selected accuracy is a P3 consideration. | [PDD §4.1](pdd.md#41-measurement-views-fr-o1), [§6.3](pdd.md#63-chart-export-fr-d2-p2-d-14-proposed); [DDD §5.12](ddd.md#512-charts), [§7.4](ddd.md#74-application-tests); [IP T-41](ip.md#t-41--measurement-panels-and-charts), [§5](ip.md#5-parked-capabilities-p2p3) |
| **P2 — Deployment removes assets needed by open pages** | Corrected in design after owner decision (2026-11-01) | DF-2 keeps the single-vintage deployment and adds **Reload and restore settings** after a failed lazy load. Preserve the latest accepted Scenario and DisplayState, validate against the newly loaded manifest before any result, recompute, and report changed versions, incompatible settings, and storage failures explicitly. | [PDD §7.3](pdd.md#73-reload-recovery-mvp); [DDD §5.1](ddd.md#51-modules-and-interfaces), [§5.3](ddd.md#53-query-engine), [§5.6](ddd.md#56-scenario-state-and-url-encoding), [§5.7](ddd.md#57-scenario-controls), [§5.8](ddd.md#58-view-layer), [§5.10](ddd.md#510-failure-states), [§5.11](ddd.md#511-accessibility-supported-environments-and-navigation-lifecycle), [§7.4](ddd.md#74-application-tests), [§7.5](ddd.md#75-browser-test-lane), [§7.6](ddd.md#76-performance-and-compatibility-measurements); [IP T-34](ip.md#t-34--scenario-state), [T-36](ip.md#t-36--application-unit-tests), [T-40](ip.md#t-40--scenario-controls), [T-44](ip.md#t-44--failure-states), [T-46](ip.md#t-46--accessibility-and-navigation-lifecycle), [T-49](ip.md#t-49--field-overlay), [T-60](ip.md#t-60--browser-test-lane), [T-61](ip.md#t-61--measurement-suite) |
| **P2 — Evidence-ledger revision exceptions omit traceability checks** | Corrected in design after owner decision (2026-11-01) | DF-3 identifies data by its published release and exact asset map. The release record's evidence ledger separates data subjects from software revisions; unchanged publication evidence may be inherited only for matching data and covered requirements. Exporter commits remain code provenance only. | [ADR-0019](../adr/0019-release-based-data-identity.md), [ADR-0014](../adr/0014-committed-content-hashed-artifacts.md) (amendment of 2026-11-01); [HLDD §1](hldd.md#1-architecture-decisions), [§4.3](hldd.md#43-language-toolchain-and-repository-structure-adr-0011), [§5.4](hldd.md#54-pinned-versioned-artifacts-adr-0014), [§8](hldd.md#8-site-integration), [§9](hldd.md#9-testing-and-release-architecture), [§11](hldd.md#11-decision-records); [DDD Authority and change control](ddd.md#authority-and-change-control), [§3.2](ddd.md#32-artifact-manifest), [§3.3](ddd.md#33-pointer-manifest), [§3.4](ddd.md#34-field-data-export), [§4.2](ddd.md#42-publication-of-a-data-vintage), [§4.3](ddd.md#43-retention-rollback-recovery-and-withdrawal), [§6.1](ddd.md#61-build-outputs-asset-paths-and-page-scaffold), [§7.3](ddd.md#73-pipeline-and-export-tests), [§7.7](ddd.md#77-site-validation-and-release-checklist), [§8](ddd.md#8-traceability); [IP T-15](ip.md#t-15--publication-tooling), [T-18](ip.md#t-18--first-verified-publication-owner), [T-21](ip.md#t-21--mkdocsyml-webapp-build-and-vintage-staging), [T-51](ip.md#t-51--site-validation-additions), [T-55](ip.md#t-55--public-activation), [T-63](ip.md#t-63--release-vintage-owner), [T-64](ip.md#t-64--rollback-rehearsal-owner), [T-65](ip.md#t-65--v04-release-owner), [§3](ip.md#3-gates-and-release-sequence), [§7](ip.md#7-traceability) |
| **P2 — Deferred loading announcement can outlive a cached load** | Corrected in design after owner decision (2026-11-01) | DF-4 guards the startup write with mount-local `initialPending` and the abort signal. Clear pending before the first result, unavailable state, or recovery decision; never reset it within that mount. | [DDD §5.10](ddd.md#510-failure-states), [§5.11](ddd.md#511-accessibility-supported-environments-and-navigation-lifecycle), [§7.5](ddd.md#75-browser-test-lane); [IP T-46](ip.md#t-46--accessibility-and-navigation-lifecycle), [T-60](ip.md#t-60--browser-test-lane) |
| **P3 — Stage-count validation and stride disagree** | Corrected in design after owner decision (2026-11-01) | DF-5 uses the measured uniform count N from the manifest for schema 1, validates N ≥ 2 and the count identity before packing/decoding, and queries each trial with stride N. The current ensemble's full-data completeness checks remain. | [ADR-0018](../adr/0018-manifest-defined-stage-count.md), [ADR-0013](../adr/0013-row-level-scenario-artifact.md) (amendment of 2026-11-01); [HLDD §1](hldd.md#1-architecture-decisions), [§5.2](hldd.md#52-simulation-data-organization-adr-0013), [§5.3](hldd.md#53-records-rather-than-precomputed-summaries-adr-0013), [Future 3D data](hldd.md#future-3d-data), [§11](hldd.md#11-decision-records); [DDD Authority and change control](ddd.md#authority-and-change-control), [§3.1](ddd.md#31-scenario-artifact-binary-layout), [§3.2](ddd.md#32-artifact-manifest), [§3.6](ddd.md#36-reference-results), [§4.1](ddd.md#41-export-task-and-validation), [§4.2](ddd.md#42-publication-of-a-data-vintage), [§5.2](ddd.md#52-artifact-loading-and-decoding), [§5.3](ddd.md#53-query-engine), [§5.4](ddd.md#54-statistics), [§5.9](ddd.md#59-downloads), [§5.10](ddd.md#510-failure-states), [§7.2](ddd.md#72-calculation-parity-tests), [§7.3](ddd.md#73-pipeline-and-export-tests), [§7.4](ddd.md#74-application-tests), [§8](ddd.md#8-traceability); [IP T-11](ip.md#t-11--export-task), [T-12](ip.md#t-12--export-validation), [T-13](ip.md#t-13--reference-results-generator), [T-16](ip.md#t-16--pipeline-fixture-tests), [T-30](ip.md#t-30--loader-and-decoder), [T-31](ip.md#t-31--query-engine), [T-35](ip.md#t-35--node-parity-harness), [T-36](ip.md#t-36--application-unit-tests), [T-45](ip.md#t-45--downloads), [§7](ip.md#7-traceability) |
| **P3 — Export prerequisites omit a builder input** | Corrected in design after owner decision (2026-11-01) | DF-6 declares `fdhi_cleaned` as a dependency of the shared view builder. Preconditions and provenance cover nine data inputs; a missing processed file fails early with its path and rebuild command, including during reproduction. | [DDD §3.2](ddd.md#32-artifact-manifest), [§4.1](ddd.md#41-export-task-and-validation), [§4.3](ddd.md#43-retention-rollback-recovery-and-withdrawal), [§7.3](ddd.md#73-pipeline-and-export-tests); [IP T-11](ip.md#t-11--export-task), [T-12](ip.md#t-12--export-validation), [T-16](ip.md#t-16--pipeline-fixture-tests) |

The correction's dataset diagnostic used the exact
[`caniuse-lite@1.0.30001820` package](https://registry.npmjs.org/caniuse-lite/1.0.30001820).
It selected 2025-10-27–2026-10-27, with oldest versions Chrome 142,
Edge 142, Firefox 145, Safari 26.2, and iOS Safari 26.1; Android
Chrome uses the desktop mapping. Required dataset-backed surfaces
pass, with only the documented Safari Streams exception, and the
explicit API minima are below those versions. Planned checks now
also cover the historical failing versions, rejected missing or
partial evidence, and browser-update guidance when the application
bundle cannot start. The application remains unbuilt.

## IP consistency review and correction (2026-11-01)

The owner requested a consistency and ambiguity check, followed by
independent implementation trials outside the project. The review used
commit `78e2d352d888366a51d124b592085c2108f91625` as its baseline. It
found five inconsistencies in task contracts; the trials of
[T-04](ip.md#t-04--traceability-lint) (Traceability lint) exposed one
additional counting ambiguity. The owner reviewed these corrections
through an independent review on 2026-11-01, recorded at the end of
this section, and ruled on findings 3, 4, 5, and 6. That IP
correction left the findings that the owner deferred in
[Repository-backed design review (2026-10-31; disposition 2026-11-01)](#repository-backed-design-review-2026-10-31-disposition-2026-11-01)
deferred, among them
**P2 — Evidence-ledger revision exceptions omit traceability checks**,
which finding 5 below does not change. The later DF-1–DF-6
acceptances are recorded below; DF-3 resolves that finding.

| Finding | Disposition | Correction | Where |
|---|---|---|---|
| **1 — Lazy field loader loses the version that its caller must validate** | Corrected in design | Both lazy loaders require `expectedExportVersion: string`, compare it with the mapped envelope before resolving, and reject a mismatch with `data-version`, `expected`, and `loaded`. Field rows retain their documented array shape. Browser callers pass the loaded manifest version; parity passes the pointer version. Both loaders have matching/mismatching-version acceptance cases. | [DDD §5.1](ddd.md#51-modules-and-interfaces), [§5.2](ddd.md#52-artifact-loading-and-decoding), [§5.8](ddd.md#58-view-layer), [§7.2](ddd.md#72-calculation-parity-tests), [§7.4](ddd.md#74-application-tests); [IP T-30](ip.md#t-30--loader-and-decoder), [T-35](ip.md#t-35--node-parity-harness), [T-36](ip.md#t-36--application-unit-tests), [T-46](ip.md#t-46--accessibility-and-navigation-lifecycle), [T-49](ip.md#t-49--field-overlay) |
| **2 — Statistics builder has no input for counts** | Corrected in design | The engine exports `MeasurementCounts`; `statsRows` and `chartSummary` receive it explicitly from the same result as their statistics. Caption N is the valid count; the table footer's line comes from the pure `unclassifiedLine`, which receives `Selection.unclassified` separately. Acceptance cases keep statistics fixed while changing counts, including null statistics, and pin N to the valid count. | [DDD §5.1](ddd.md#51-modules-and-interfaces), [§5.3](ddd.md#53-query-engine), [§5.8](ddd.md#58-view-layer), [§5.11](ddd.md#511-accessibility-supported-environments-and-navigation-lifecycle), [§7.4](ddd.md#74-application-tests); [IP T-31](ip.md#t-31--query-engine), [T-41](ip.md#t-41--measurement-panels-and-charts), [T-42](ip.md#t-42--statistics-table) |
| **3 — Accepted decimals can fail after serialization or re-edit** | Corrected in design; limit by the owner's ruling of 2026-11-01 | Grammar G requires at most 16 characters both after trimming and in canonical form. `.12345678901234` becomes the accepted `0.12345678901234`; `.123456789012345` is INVALID because its canonical form has 17 characters. The signed grammar of inverse mode (DDD §5.14) applies both limits to the text after its `-`. Planned parser and round-trip cases cover both boundaries. | [DDD §5.6](ddd.md#56-scenario-state-and-url-encoding), [§5.7](ddd.md#57-scenario-controls), [§5.8](ddd.md#58-view-layer), [§5.14](ddd.md#514-inverse-mode-p2), [§7.4](ddd.md#74-application-tests); [IP T-34](ip.md#t-34--scenario-state), [T-36](ip.md#t-36--application-unit-tests) |
| **4 — Acceptance commands mix repository and subproject working directories** | Corrected in plan | The Done-when blocks of T-02, T-03, T-14, T-21, T-31, T-37, and T-54 run from the repository root, each subproject command in a subshell — the DDD §2 form of Node.js outside Gradle included — and name files by repository-relative paths. T-14 runs the development export and `pytestFullData` as one rule-5 script that writes the pointer back only after the full-data run. T-14 and T-16 run their no-data checks in a linked worktree of `HEAD` with `PYTHONPATH=src`, which imports that worktree's own package instead of the shared virtualenv's editable install of the main working tree. | [IP T-02](ip.md#t-02--build-and-check-tasks), [T-03](ip.md#t-03--scenario-page-scaffold), [T-14](ip.md#t-14--required-full-data-checks), [T-16](ip.md#t-16--pipeline-fixture-tests), [T-21](ip.md#t-21--mkdocsyml-webapp-build-and-vintage-staging), [T-31](ip.md#t-31--query-engine), [T-37](ip.md#t-37--early-feasibility-diagnostic), [T-54](ip.md#t-54--prototype-deployment-unlisted) |
| **5 — Published measurement runs from the pre-merge HEAD** | Corrected in design and plan; procedure by the owner's ruling of 2026-11-01 | Before item 5 (b), Claude, at the owner's request and outside any agent task, fast-forwards the clean local release branch to the deployed `main` merge commit — the one git operation on the owner's branch that Claude may perform — requires HEAD to equal it, and keeps the original release SHA separately; that merge commit must also descend from the release commit. The report is accepted only when its source commit is that merge commit and its source tree is clean. An operational failure — a refused fast-forward, an unclean tree, a report naming another commit or a dirty tree without a budget miss or a differing digest, or an infrastructure or report-retrieval failure — is retried clean: any kept VM removed, the clean checkout restored at the merge commit, and item 5 (b) run again from its first step, unless restoring would discard the owner's work or change the checkout by a git command other than the fast-forward, when the owner is asked instead. A budget miss or a differing bundle digest is never retried away: item 5 fails, is reported to the owner at once, and stops the release for a fix-forward, whose next attempt takes the new release-branch head as its release SHA. | [DDD §7.7](ddd.md#77-site-validation-and-release-checklist); [IP Execution contract](ip.md#execution-contract), [§4](ip.md#4-owner-and-research-group-actions), [T-65](ip.md#t-65--v04-release-owner) |
| **6 — Mirrored gaps have two plausible counts** | Clarified in design and plan | The lint prints `gap rows: <n>`, n counting only DDD §8 rows whose Status is `gap`; IP §7 mirrors add nothing. Keys `(Source, Obligation)` must be unique within each document; row equality compares the six trimmed cells, and Check entries are trimmed too. Plural export-rule names are comma-separated, and a `release` entry is `§7.7 item <n>`, alone or followed by a parenthetical. The acceptance drill turns one mirrored row to `gap` and requires the count to rise by 1 (`gap rows: 1` on gap-free documents), exit 0 without `--release`, and a non-zero exit with it. | [DDD §8](ddd.md#8-traceability), [§8.4](ddd.md#84-from-the-adrs-and-the-adr-process); [IP T-04](ip.md#t-04--traceability-lint), [§7](ip.md#7-traceability) |

**Owner ruling (2026-11-01).** Grammar G caps both the trimmed text and
its canonical form at 16 characters (finding 3), so that every accepted
decimal survives serialization and re-entry;
[DDD §5.7](ddd.md#57-scenario-controls) records it.

**Owner ruling (2026-11-01), finding 5.** Before item 5 (b), Claude,
at the owner's request, fast-forwards the owner's local release
branch to the deployed `main` merge commit — the one git operation on
the owner's branch that Claude may perform — so that the
published-site report names the deployed commit; implementation
agents still never commit on or move that branch. An operational
failure of that fast-forward or of the run is retried from a clean
checkout unless restoring it would discard the owner's work, while a
budget miss or a differing bundle digest is never retried away, by
rules already in force: the owner's performance rule of 2026-10-31
(IP rule 4) and the build identity of DDD §7.7.
[IP T-65 — v0.4 release (owner)](ip.md#t-65--v04-release-owner),
step (4), records it, with two safeguards added in this correction: a
report left on a kept VM is retrieved and judged before the VM is
removed, and a second consecutive failure of the same kind is reported
to the owner, the VM kept for investigation.

The first independent T-04 trials ran two implementing agents in
separate scratch copies. Both returned the expected exit status, pass
or fail, in all 32 shared cases, but reported a mirrored gap as 1 and
2 respectively; their source code differed. This was evidence of a
specification ambiguity, not a requirement that independent
implementations have identical source. No trial implementation was
copied into the project.

Verification of the corrections: two independent readers found no
remaining contradiction within these six fixes. The revised sandbox
checker passed all 10 focused cases, including duplicate keys, trimmed
cell equality, and the mirrored-gap count; at that verification the
matrices had 436 DDD rows, 36 matching IP mirrors, and no gaps or
duplicate keys, all 4,760 repository-relative documentation links
resolved, and all 20 inline Python commands, every one in the IP,
parsed. A throwaway Git repository
confirmed the release-branch fast-forward and its retry after a
fix-forward. A scratch
model of grammar G passed 11 boundary cases and preserved canonical
values through JSON and re-entry for all 8,586 accepted inputs among
10,000 generated decimal strings. These are specification diagnostics;
the production loaders, views, parser, and release tooling remain
planned work.

**Independent review of the corrections (2026-11-01).** Seven
read-only review agents, one for each of the six findings and one
across all of them, each recommended accepting the corrections it
reviewed with changes. The changes the owner accepted were applied
the same day, those for finding 5 after the owner's ruling on it.

## Deferred-finding discussion (2026-11-01)

The owner reopened discussion of the six deferred findings above and
requested that they be recorded. The owner subsequently accepted DF-1
with a clear reader-facing statement and asked that reader-selected
accuracy be considered in P3. The owner then accepted DF-2's explicit
reload-and-restore proposal, then selected DF-5 option 2: a uniform
manifest-defined stage count. For DF-3 the owner clarified that data
is pinned to published releases, retaining exporter commits solely
as code provenance. The owner also accepted DF-4's guard against
stale startup announcements, then chose to declare the shared view
builder's dependencies for DF-6. All six findings are corrected in
the normative documents. The IDs
refer to the six initially deferred rows of the repository-backed
review, in their order.

| ID and finding | Resolution or proposal | Decision and acceptance check |
|---|---|---|
| **DF-1 — ECDF thinning** | Keep the 512-point cap, but select by cumulative count. For m ≤ 512 keep all distinct-value points. Otherwise keep index 0; scan interior indices k in ascending order and retain k exactly when `511 * (c[k] - c[lastKept]) > n`; then retain m − 1. The drawn curve stays at or below the exact ECDF with a vertical shortfall at most 1/511, about 0.196 percentage points. Statistics and percentile read-offs continue to use the full data. The marker explanation now accounts for ties: a percentile can lie on a vertical jump, without the invalid unconditional claim of less than 1/n difference from F(x). | Accepted by owner and corrected in design (2026-11-01), including a visible and accessible cumulative-caption statement and the same disclosure in P2 chart exports. Reader-selected accuracy is recorded as a P3 consideration, with options and limits undecided. Assert monotonicity, endpoints, ≤512 retained points, the error bound over every original step, large tied jumps, and the existing 511/512/513 and constant-data boundaries. Homes: [DDD §5.12](ddd.md#512-charts), [§7.4](ddd.md#74-application-tests); [IP T-41](ip.md#t-41--measurement-panels-and-charts). |
| **DF-2 — Open tabs across data updates** | Keep the single-vintage deployment and add **Reload and restore settings**, preserving the click-time accepted Scenario and all DisplayState members in a versioned, one-shot same-tab record. This includes accepted offset input waiting for coefficients. Validate unchanged selections and effective endpoints against the new manifest before any result; recompute and announce the restored/current version. Incompatible settings require an explicit new-scenario choice. Storage failures have distinct visible messages and never silently claim restoration. | Accepted by owner and corrected in design (2026-11-01). Pure envelope/parser checks and browser cases cover both lazy exports across a vintage replacement, same-version retries, all display settings, pending offset input, incompatible settings, each storage failure, repeated load failures, one-shot instant navigation, aborts, and focus/announcements. The existing one-vintage staging and withdrawal policy remains; this choice needs no ADR-0014 retention amendment. Homes: [PDD §7.3](pdd.md#73-reload-recovery-mvp); [DDD §5.1](ddd.md#51-modules-and-interfaces), [§5.3](ddd.md#53-query-engine), [§5.6](ddd.md#56-scenario-state-and-url-encoding), [§5.7](ddd.md#57-scenario-controls), [§5.8](ddd.md#58-view-layer), [§5.10](ddd.md#510-failure-states), [§5.11](ddd.md#511-accessibility-supported-environments-and-navigation-lifecycle), [§7.4](ddd.md#74-application-tests), [§7.5](ddd.md#75-browser-test-lane), [§7.6](ddd.md#76-performance-and-compatibility-measurements); [IP T-34](ip.md#t-34--scenario-state), [T-36](ip.md#t-36--application-unit-tests), [T-40](ip.md#t-40--scenario-controls), [T-44](ip.md#t-44--failure-states), [T-46](ip.md#t-46--accessibility-and-navigation-lifecycle), [T-49](ip.md#t-49--field-overlay), [T-60](ip.md#t-60--browser-test-lane), [T-61](ip.md#t-61--measurement-suite). |
| **DF-3 — Inherited publication evidence** | Pin data to the published data release and exact filename/SHA-256 map. A bare tag or draft does not qualify. Separate Software revision and Data release columns; exporter commits are code provenance only. Inherit publication full-data, evidenced export-validation, export-only size, and completed-publication results only for the same release/assets and covered requirement. Current application checks remain current; retention acceptance is fresh. | Accepted by owner and corrected in design (2026-11-01). ADR-0019 amends ADR-0014, replacing only its commit-identity wording. Accept unchanged-release evidence across software revisions; reject other/missing/draft releases, asset mismatches, uncovered requirements, historical retention, and data evidence substituted for current software checks. Verified caches remain usable offline; `fetchVintage` cache misses check published-release state, while the parity harness's plain HTTPS download does not. Homes: [ADR-0019](../adr/0019-release-based-data-identity.md), [ADR-0014](../adr/0014-committed-content-hashed-artifacts.md) (amendment of 2026-11-01); [HLDD §1](hldd.md#1-architecture-decisions), [§4.3](hldd.md#43-language-toolchain-and-repository-structure-adr-0011), [§5.4](hldd.md#54-pinned-versioned-artifacts-adr-0014), [§8](hldd.md#8-site-integration), [§9](hldd.md#9-testing-and-release-architecture), [§11](hldd.md#11-decision-records); [DDD Authority and change control](ddd.md#authority-and-change-control), [§3.2](ddd.md#32-artifact-manifest), [§3.3](ddd.md#33-pointer-manifest), [§3.4](ddd.md#34-field-data-export), [§4.2](ddd.md#42-publication-of-a-data-vintage), [§4.3](ddd.md#43-retention-rollback-recovery-and-withdrawal), [§6.1](ddd.md#61-build-outputs-asset-paths-and-page-scaffold), [§7.3](ddd.md#73-pipeline-and-export-tests), [§7.7](ddd.md#77-site-validation-and-release-checklist), [§8](ddd.md#8-traceability); [IP T-15](ip.md#t-15--publication-tooling), [T-18](ip.md#t-18--first-verified-publication-owner), [T-21](ip.md#t-21--mkdocsyml-webapp-build-and-vintage-staging), [T-51](ip.md#t-51--site-validation-additions), [T-55](ip.md#t-55--public-activation), [T-63](ip.md#t-63--release-vintage-owner), [T-64](ip.md#t-64--rollback-rehearsal-owner), [T-65](ip.md#t-65--v04-release-owner), [§3](ip.md#3-gates-and-release-sequence), [§7](ip.md#7-traceability). |
| **DF-4 — Stale loading announcement** | Guard the deferred startup announcement with mount-local `initialPending`, initially true and set false before the first result, unavailable-state, or recovery-decision commit. Its `live` callback requires both an unaborted mount and `initialPending`. Same-mount recovery never resets it. | Accepted by owner and corrected in design (2026-11-01). Deterministic browser cases hold the queued write until after cached success, immediate failure, a recovery decision, or navigation disposal, and release it during a genuinely slow load. Required restored-offset coefficients keep startup pending; a later overlay load does not. Other announcements retain their guards. Homes: [DDD §5.10](ddd.md#510-failure-states), [§5.11](ddd.md#511-accessibility-supported-environments-and-navigation-lifecycle), [§7.5](ddd.md#75-browser-test-lane); [IP T-46](ip.md#t-46--accessibility-and-navigation-lifecycle), [T-60](ip.md#t-60--browser-test-lane). |
| **DF-5 — Stage count and stride** | Use one measured N = `counts.stages_per_trial` per vintage, common to every trial. Schema 1 requires integer N ≥ 2, a nonempty trial set, uint32 count bounds, and records = trials × N. Export and decode validate before packing or constructing views; query segments and selection identities use N. Unequal lengths fail explicitly, with no padding, dropping, interpolation, or resampling. | Accepted by owner and corrected in design (2026-11-01), choosing option 2 over the earlier fixed-101 recommendation. ADR-0018 amends ADR-0013, replacing only its fixed 101-stage stride. Test valid N = 2, 100, 101, 102, adjacent-trial boundaries, final stages, each population under each window mode, empty selections, invalid counts, a `trials` array of the wrong length, unequal lengths, and overflow. Current-data completeness pins stay 3,434 × 101 = 346,834. Homes: [ADR-0018](../adr/0018-manifest-defined-stage-count.md), [ADR-0013](../adr/0013-row-level-scenario-artifact.md) (amendment of 2026-11-01); [HLDD §1](hldd.md#1-architecture-decisions), [§5.2](hldd.md#52-simulation-data-organization-adr-0013), [§5.3](hldd.md#53-records-rather-than-precomputed-summaries-adr-0013), [Future 3D data](hldd.md#future-3d-data), [§11](hldd.md#11-decision-records); [DDD Authority and change control](ddd.md#authority-and-change-control), [§3.1](ddd.md#31-scenario-artifact-binary-layout), [§3.2](ddd.md#32-artifact-manifest), [§3.6](ddd.md#36-reference-results), [§4.1](ddd.md#41-export-task-and-validation), [§4.2](ddd.md#42-publication-of-a-data-vintage), [§5.2](ddd.md#52-artifact-loading-and-decoding), [§5.3](ddd.md#53-query-engine), [§5.4](ddd.md#54-statistics), [§5.9](ddd.md#59-downloads), [§5.10](ddd.md#510-failure-states), [§7.2](ddd.md#72-calculation-parity-tests), [§7.3](ddd.md#73-pipeline-and-export-tests), [§7.4](ddd.md#74-application-tests), [§8](ddd.md#8-traceability); [IP T-11](ip.md#t-11--export-task), [T-12](ip.md#t-12--export-validation), [T-13](ip.md#t-13--reference-results-generator), [T-16](ip.md#t-16--pipeline-fixture-tests), [T-30](ip.md#t-30--loader-and-decoder), [T-31](ip.md#t-31--query-engine), [T-35](ip.md#t-35--node-parity-harness), [T-36](ip.md#t-36--application-unit-tests), [T-45](ip.md#t-45--downloads), [§7](ip.md#7-traceability). |
| **DF-6 — Missing exporter prerequisite** | Add `data/processed/fdhi_cleaned/data.parquet` to `inputs-present` and provenance: nine inputs, five processed plus four raw. Keep the shared view builder, which already requires this processed file; the ordinary build already produces it. | Accepted by owner and corrected in design (2026-11-01). Missing input fails before hashing or view construction and leaves the pointer unchanged; a missing processed file names its path and the rebuild command. Verify exact provenance paths, checksums and sizes, changed-input rejection, and the same preflight for reproduction. The raw `FDHI_Cleaned_Measurements.csv` remains a separate full-data test input. Homes: [DDD §3.2](ddd.md#32-artifact-manifest), [§4.1](ddd.md#41-export-task-and-validation), [§4.3](ddd.md#43-retention-rollback-recovery-and-withdrawal), [§7.3](ddd.md#73-pipeline-and-export-tests); [IP T-11](ip.md#t-11--export-task), [T-12](ip.md#t-12--export-validation), [T-16](ip.md#t-16--pipeline-fixture-tests). |

A read-only calculation against the current raw DEM data reproduced
DF-1: for scarp dip at slip 0–0.5 m, the superseded index-based rule's
maximum vertical error is 7.99753 percentage points; the accepted
count-based rule gives
0.19082 points with 345 retained points. Across the full dataset, scarp
dip has 35,854 distinct values, width 15,822, and height 3,095, so drawing
every exact step would require 71,708, 31,644, and 6,190 vertices
respectively. These are data and algorithm diagnostics, not browser
performance measurements; the exact-curve option's rendering cost has
not been measured.

The owner explicitly rejected the old roughly 8-percentage-point
error. The accepted limit is less than 0.2 percentage points of
absolute vertical simplification error at every measurement value;
it is not 0.2 percent relative error, a statistical uncertainty, or
an allowance to approximate summary statistics. The exact algorithm
has the tighter upper bound 100/511 percentage points. PDD §4.1
owns the verbatim disclosure; DDD §5.11 places it in every drawn
cumulative figure's caption and accessible description, and §5.12
carries it into the P2 image-export caption strip.

The correction's scratch verification used
`data/raw/DEM_dataset.csv`, SHA-256
`262f303b3498785eb1c67fa6e1ada90ee21487826683f76a057bd347e6e7b5fc`.
Seven deterministic fixtures, 5,000 seeded weighted fixtures, and six
actual-data cases checked the bound at every original distinct value,
retained endpoints, exact cumulative counts, and the 512-point cap.
All passed. The heavy-tie regression fixture makes the old rule miss
45/557 (8.07899 percentage points), while the accepted rule misses
at most 1/557 (0.179533 points). A threshold-equality case attains
1/511 and a separate case reaches exactly 512 retained points.
These diagnostics validate the specified algorithm; application and
browser implementation remain planned work. An independent consistency
read found no remaining contradiction in the algorithm, disclosure,
export, configuration exclusion, or P3 record. At that verification, all
4,769 relative documentation links resolved; scratch traceability lint
accepted all 475 rows (438 DDD obligations and 37 IP mirrors), with no
gaps.

The accepted DF-2 contract preserves accepted settings, including all
display settings, rather than uncommitted editing text or previously
computed results. A restored offset waits for the current coefficients
before its first result; a restored overlay loads after that result.
An incompatible record blocks results and shows the saved scenario
summary until the reader explicitly starts a new scenario. The existing
logarithmic-display availability rule may turn that setting off, with
a specific notice; no Scenario value is silently changed.

A failed recovery save keeps the page in place. If the initial storage
read is impossible, startup may use defaults only with a persistent
warning that saved settings could not be checked; it says the page
started with defaults only after a default result actually commits.
Once a record is read, failure to remove it or verify removal blocks
restoration until an explicit retry or discard succeeds. A consumed
record stays in mount memory across a subsequent load failure for an
explicit retry, but is never replayed by instant navigation. The design
adds no automatic reload loop.

The DF-2 implementation and browser tests remain planned work. The
review checked the pure/browser module boundary, startup and resumed
startup, state preservation, exact messages, and acceptance coverage;
it did not run a built application. Two final independent reads found
no remaining material contradiction in DF-2. At that verification, all
4,779 repository-relative documentation links resolved; the scratch
traceability checker accepted 477 rows (439 DDD obligations and 38 IP
mirrors), with no errors or gaps, and `git diff --check` passed. The
other four deferred findings, including DF-4's ordinary
loading-announcement race, remained open at that verification; DF-3,
DF-4, DF-5, and DF-6 were subsequently resolved as recorded below.

The owner selected DF-5 option 2 after comparing fixed 101, a uniform
manifest-defined N, and per-trial variable lengths. The accepted
contract uses the existing manifest field and binary blocks, with
N ≥ 2 so that stage-spacing statistics remain defined. Schema 1 is
settled before the first application publication. ADR-0018 records
the decision and its alternatives; ADR-0013 stays Accepted, with a
dated amendment of 2026-11-01 that points to ADR-0018.

The correction updates the format, export precheck, decoder, query,
reference identities, four synthetic ensembles, task instructions,
and planned checks together. General format validity does not replace
current-data completeness: the known ensemble still must have 101
stages per trial, and larger future datasets still need the required
performance and scientific checks. Application implementation remains
planned. DF-3, DF-4, and DF-6 remained deferred at that point; DF-3
was subsequently resolved as recorded below.

Four independent read-only reviews of the DF-5 correction followed on
2026-11-01, each recommending acceptance with changes, and the owner
answered their questions the same day. ADR-0018 amends ADR-0013, which
stays Accepted with a dated amendment that points to ADR-0018; the ADR
index gains the rule that a partial change to an accepted decision is a
dated amendment. ADR-0018 is accepted on 2026-11-01, and the owner's
dated commit of this change set is its acceptance record. The decoder
and rule `manifest-figures` also require `trials` to hold exactly
`counts.trials` strings. For every stage count, the synthetic cases
cover each population under each of the three window kinds, with both a
first-trial and a last-trial mask. The pipeline's count check is
`check_counts` in `product_export.py`. The publication drill fixture
keeps 101 stages per trial. ADR-0018's traceability rows carry line
numbers, and a separate DDD row traces its completeness consequence.
The correction applied these answers and the reviews' other findings
to ADR-0013, ADR-0018, the ADR index, the HLDD, the DDD, the IP, and
this ledger.

The DF-5 consistency checks covered the count bounds, rule ordering,
reference and download indexing, and task construction dependencies. At
that verification, after this correction, all 4,960 relative links in 53
Markdown files resolved, including the new ADR; the DDD §8 matrices held
441 rows and the IP §7 matrix 39, each IP row identical to its DDD twin
and none with Status `gap`; `git diff --check` passed; and ADR-0013's
lines 1–173 were identical to its accepted version except the Date line,
its amendment following the Consequences. These are document checks; the
specified pipeline and application tests have not yet been implemented.

The owner clarified DF-3's data identity: a published data release,
located by its associated tag in this repository, plus its exact
filename/SHA-256 map. A tag alone is insufficient. The owner retained
the exporter's source commit solely as code provenance. ADR-0019
records that decision and amends ADR-0014, which stays Accepted with
a dated amendment that points to ADR-0019; ADR-0014's storage and
publication architecture stands.

The corrected evidence ledger names software revisions and data
releases in separate columns. An unchanged published release can
carry its covered, passing publication evidence into later software
releases. New or strengthened data requirements need corresponding
evidence; the reuse path fails when that evidence is absent.
Fixture, parity, browser, and performance checks still run against
the current software, and release-state and retention checks are
fresh at acceptance. A checksum-valid cache remains usable offline;
`fetchVintage` verifies published-release state before any
cache-miss download, while the parity harness's plain HTTPS download
does not. DF-4 and DF-6 remained deferred at that point; DF-4 was
subsequently resolved as recorded below. These are design changes;
application implementation remains planned.

The DF-3 consistency review also aligned rollback-target evidence,
the release-record fields in the IP, and refusal of a published
non-prerelease during publication resumption. At that verification,
all 4,881 relative links in 54 Markdown files resolved, including
the two new ADRs; scratch traceability lint accepted 483 rows
(442 DDD obligations and 41 IP mirrors), with no errors or gaps.
Added prose stayed within 72 columns and `git diff --check`
passed. ADR-0014's body from Context onward remained byte-identical
to its accepted version. The publication, retrieval, and ledger
acceptance cases are specified checks, not executed application
tests.

When the DF-3 and DF-5 changes were merged on 2026-11-01, the DF-5
corrections' amend rule was applied to ADR-0019 and ADR-0014 as well:
ADR-0019 amends ADR-0014 and is accepted on 2026-11-01, recorded like
ADR-0018's acceptance, and its list of the ADR-0014 decisions that stand
no longer names recovery, which ADR-0014 does not decide; ADR-0014 stays
Accepted, its supersession note replaced by a dated amendment that
precedes its References and points to ADR-0019. The ADR index, the HLDD,
the DDD, and this ledger use amend wording, and ADR-0019's two
traceability rows carry line numbers and follow the ADR-0014 rows. At
that verification, all 4,992 relative links in 54 Markdown files
resolved; the DDD §8 matrices held 443 rows and the IP §7 matrix 41,
each IP row identical to its DDD twin and none with Status `gap`;
`git diff --check` passed; and ADR-0013 and ADR-0014 were identical to
their accepted versions through the end of their Consequences, except
their Date lines. These are document checks.

The owner accepted DF-4's startup-announcement guard on 2026-11-01.
The first result, unavailable state, or recovery decision invalidates
the queued loading write before committing. Navigation disposal also
blocks it through the existing abort signal. Recovery resumption in
the same mount never re-enables startup loading; restored offset mode
waits for its required coefficients, while a later overlay load does
not prolong startup. The browser specification forces each ordering
with a test-only timer wrapper, without changing production APIs or
other announcement guards. These are planned application checks;
DF-6 remained deferred at that point and was resolved next.

The owner accepted DF-6 on 2026-11-01, choosing to declare the shared
view builder's dependency instead of refactoring it. The five
processed inputs include `fdhi_cleaned`; the same four raw inputs
produce them. Prerequisites and provenance therefore cover nine
files, with exact path, SHA-256, and byte-count checks. Missing
processed inputs fail before hashing or view construction with their
path and the rebuild command. Reproduction uses the same preflight
before comparing recorded inputs, with each rule reported once.
The similarly named raw `FDHI_Cleaned_Measurements.csv` stays a
full-data test input, outside export provenance.

This keeps one indirect dependency: changing or losing
`fdhi_cleaned` can prevent reproduction even when product values
would be unchanged. A fresh export records its new checksum, so
provenance bytes and manifest hashes can change without a numerical
change. The ordinary build already creates the file; the added work
is hashing and recording one more input, with no new raw dataset.
Planned fixture checks cover missing inputs, exact provenance,
changes during export, and reproduction mismatches. All six deferred
findings are now resolved in design; application implementation and
its acceptance checks remain planned.

At the DF-4/DF-6 verification, made before the DF-5 corrections
were merged, all 4,879 relative links in 54 Markdown files resolved,
including the new ADRs. Scratch
traceability lint accepted 483 rows (442 DDD obligations and 41 IP
mirrors), with no errors or gaps. Added prose met the 72-column
convention and `git diff --check` passed. A read-only pipeline check
confirmed the shared builder requires `fdhi_cleaned` and the normal
build produces it. These checks validate the design documents;
the planned browser and exporter tests have not been implemented.

Independent read-only reviews of the DF-3, DF-4, and DF-6 corrections
followed on 2026-11-01 — four of DF-3 and three of DF-4 and DF-6 —
each recommending acceptance with changes, and the owner answered
their questions the same day. A data vintage's prerelease state is
part of its identity: a cleared prerelease flag is repaired in place
with
`gh release edit <data_tag> --repo HarvardRC/eps-ground-rupture --prerelease`,
which the refusals that detect it print. An inherited ledger row
covers the current requirement only when `git diff --quiet` between
its publication `tag_commit` and the release commit, over the files
that the DDD names as defining its check, exits 0, or when it cites
the owner's recorded review of that diff stating that it adds or
strengthens no requirement the row covers; otherwise the release
publishes a new vintage, the only remedy for a new or strengthened
data requirement. The publication record also stores the export's
validation report; completed publication may be inherited, while
release state and retention are checked fresh before the release
merge in both release shapes; and every `gh release` command names
this repository. A resumed startup that must wait for a network load
announces loading once, through its own flag, and the export deletes
its staging directory only after `inputs-present` passes. The
corrections applied these answers, the owner's defaults for the
remaining questions, and the reviews' other findings to ADR-0019, the
HLDD, the DDD, the IP, and this ledger, merged with the DF-3 and DF-5
changes.
[HLDD §5.5 — Field-data export (ADR-0012)](hldd.md#55-field-data-export-adr-0012)
and
[ADR-0012 — Purpose-built product exports feed the scenario app](../adr/0012-product-data-exports.md)
still list `fdhi_cleaned` among the field export's source views, a
known difference from
[DDD §3.4 — Field-data export](ddd.md#34-field-data-export) left for
their next revision. After these corrections, all 5,098 relative links
in 54 Markdown files resolved; the DDD §8 matrices held 443 rows and
the IP §7 matrix 41, each IP row identical to its DDD twin and none
with Status `gap`; `git diff --check` passed; and ADR-0013 and
ADR-0014 were identical to their accepted versions through the end
of their Consequences, except their Date lines. These are document
checks; the specified pipeline, browser, and application tests have
not yet been implemented.

## Consistency, ambiguity, and feasibility review (2026-11-01)

The owner requested another review after the deferred-finding
corrections. This round read the clean baseline
`23931151e7616c7ff2dc89486675b8fe4016ecc7`, including the later
corrections recorded above. Three independent read-only reviews
covered the data lifecycle, browser contracts, and implementation
sequence; the coordinating review checked the findings, chart and
configuration contracts, and documentation diagnostics. Line numbers
below refer to that baseline. These findings are open; recording
them does not change the normative design or task instructions.

1. **CF-1 — P2: reproduction discovers a different FDHI input.**
   [DDD §4.1](ddd.md#41-export-task-and-validation), L2483–2489,
   uses `io.find_fdhi_flatfile()` for the raw FDHI input, and its
   `provenance` rule, L2700–2707, requires exactly that discovered
   input set. [DDD §4.3](ddd.md#43-retention-rollback-recovery-and-withdrawal),
   L3264–3286, applies that same preflight and validation to
   reproduction while preserving the supplied pointer's provenance.
   The actual helper selects the last matching filename. With the
   recorded 20220719 file still present and unchanged, adding a
   20261101 file changes the selected path and makes the old
   provenance fail the exact-set check. The prescribed `egr-build`
   retry also selects the newer input. Reproduction must select
   recorded inputs from its supplied pointer, including when
   rebuilding processed files, or prescribe an isolated environment
   containing exactly those inputs. Fresh exports may keep discovery.
   Add a two-flatfile reproduction case. **Evidence:** the actual
   helper, extracted unchanged from its AST, was executed on
   temporary synthetic files; the selected path changed while the
   older file's checksum did not. Confidence: high.

2. **CF-2 — P2: the warm-cache assertion lacks required CDP events.**
   [DDD §7.6](ddd.md#76-performance-and-compatibility-measurements),
   L11479–11482, requires recognizing disk/memory hits and HTTP 304
   from `Network.responseReceived` alone;
   [IP T-61](ip.md#t-61--measurement-suite), L4141–4143, inherits it.
   The protocol places the wire 304 status in
   `responseReceivedExtraInfo.statusCode`, while the corresponding
   response event can report 200. Cache-served requests also have
   `requestServedFromCache`, and extra response information can
   arrive before or after the response event. A literal assertion
   lacks the specified evidence for distinguishing these cases from
   a downloaded response and can reject a valid warm repetition.
   Specify correlation by `requestId`, both event orders, and
   `hasExtraInfo`; accept verified cache hits or wire status 304,
   and reject a downloaded 200 body. Cached responses must not wait
   indefinitely for extra information that will not arrive; the
   pinned Playwright network manager handles this case separately.
   Add focused classification cases. **Evidence:** the
   [official Network protocol definition](https://raw.githubusercontent.com/ChromeDevTools/devtools-protocol/master/pdl/domains/Network.pdl)
   and the matching protocol declarations in pinned Playwright
   1.47.2. Confidence: high for the event-contract mismatch. No
   pinned Chromium installation was available for a runtime trace;
   this is not a claim that every revalidated request fails.

3. **CF-3 — P2: parity's self-check has no failure-accounting rule.**
   [DDD §7.2](ddd.md#72-calculation-parity-tests), L10208–10215,
   deliberately injects three differences and requires reporting
   them on every run. Its Report paragraph, L10266–10277, and
   [IP T-35](ip.md#t-35--node-parity-harness), L2169–2177, make any
   difference produce a nonzero exit, while T-35's Done-when
   requires a correct ordinary run to exit zero. The intended
   self-test is clear, but its exception and output accounting are
   unstated. Collect injected differences separately, assert their
   exact expected identities and rules, and fail only if that
   assertion or the real comparison fails. Specify whether expected
   injections print as diagnostics or stay silent. Add correct-run,
   missing-injection, and extra-difference cases. Confidence: medium;
   this is an ambiguity in the specification, not an observed
   application failure.

4. **CF-4 — P2: two deferred announcements omit lifetime guards.**
   [IP T-40](ip.md#t-40--scenario-controls), L2403–2405, requires
   `announce(wiring.status, line)` for rejected input;
   [IP T-41](ip.md#t-41--measurement-panels-and-charts), L2572–2574,
   prescribes the same two-argument form for a percentile read-off.
   The helper writes later without a predicate when `live` is
   omitted (T-41, L2494–2496), contrary to
   [DDD §5.11](ddd.md#511-accessibility-supported-environments-and-navigation-lifecycle),
   L7432–7434, which requires timers to return after mount abort.
   Hold either callback, navigate away, then release it: the
   specified call still writes to the disposed status element.
   Require the mount-lifetime predicate at both call sites and
   define invalidation when a transient message is superseded, such
   as a rejected entry cleared by Reset. Cover disposal and
   correction/Reset with held-callback tests. Confidence: high.

5. **CF-5 — P2: terminal failure does not guard pending startup.**
   [DDD §5.10](ddd.md#510-failure-states), L6454–6466, installs the
   global error handlers before awaiting the vintage; a routed
   error enters unavailable state (L6516–6520). That state is
   terminal (L6690–6695), but the specified startup continuation
   tests only navigation abort (L6486–6488), and the described
   terminal stop belongs to the scheduler, created after the first
   result. Hold the artifact response, route a bundle error, then
   release the response: the startup recipe can continue to a result
   that replaces the terminal notice. Define a mount-level terminal
   state checked after awaits and before commits, separate from
   navigation abort so recovery controls remain usable. Cover first
   startup, restored-offset loading, and resumed startup with held
   responses and a routed error. Confidence: medium-high; terminal
   behavior is stated, but the prescribed mechanism omits this path.

No new P1 or architectural blocker was found. The five findings
should be closed before accepting the affected task bodies; they do
not require revisiting the accepted product choices. The already
recorded difference between HLDD §5.5/ADR-0012's field-source list
and DDD §3.4 remains a separate documentation-alignment item, not a
new finding in this round. Explicit owner and research-group gates
remain gates, not undiscovered design gaps.

At this review, all 5,098 relative links in 54 Markdown files
resolved. Scratch traceability lint accepted 484 rows (443 DDD
obligations and 41 IP mirrors), with no errors or gaps. The task
graph's 47 tasks and 151 task-dependency edges had no cycle or
undefined task reference. All 14 configuration-register quotes
occurred in their cited PDD sections. These are documentation and
targeted specification diagnostics; they do not establish browser
performance or constitute execution of the planned application,
publication, or release test suite.

After this record was added, the link check covered 5,108 relative
links in the same 54 Markdown files with no broken links, and
`git diff --check` passed. Only this review ledger changed.

On 2026-11-02 the five findings were corrected, the DDD first and
then each IP restatement, by choices the owner delegated, and the
owner adopted those choices the same day, with the recommendations on
the questions they had left open.
CF-1: reproduction takes every input path from its pointer's
`provenance.inputs`, never from `io.find_fdhi_flatfile()`, and a
rebuild passes the recorded flatfile to a new
`egr-build --fdhi-flatfile` option, the owner rebuilding without it
once back on the working branch; T-16 adds the two-flatfile case.
CF-2: the warm-cache check correlates each request's CDP events by
`requestId` in either order, counts a response served from cache
(`fromDiskCache` or `Network.requestServedFromCache`; the protocol
has no memory-cache member) as warm without waiting for extra
information, otherwise reads the wire status, and waits at most
5,000 ms; T-61 adds the focused cases. CF-3: the parity self-check
checks its three injected differences apart from the real ones and
reports them in one diagnostic line, never as difference lines, so a
correct run exits 0; T-35 adds the correct-run, missing-injection,
and extra-difference cases. CF-4: the rejection and read-off
announcements pass `live`, whose supersession test requires the
message to be still shown when it is written. CF-5: each mount's
`terminal` flag, set on entering the unavailable state and checked
after every startup `await` and before each startup commit, stops a
pending startup without aborting the mount. The browser cases of
CF-4 and CF-5 join the DDD §7.5 rows of `a11y.spec.ts` and
`failure-states.spec.ts`, which T-60's body performs by reference,
and by the owner's decision one sentence of that body now names
them. The owner also decided that entering the unavailable state
while a recovery-decision state is shown removes that state's
**Retry recovery** and **Start a new scenario** instead of leaving
them enabled with nothing to resume (DDD §5.10, and a fourth case of
§7.5's Terminal state during startup; T-44 (Failure states), T-46
(Accessibility and navigation lifecycle), and T-60); that
T-16 tests `egr-build --fdhi-flatfile`, a wrong path exiting 2
(DDD §4.1 and [§7.3](ddd.md#73-pipeline-and-export-tests)); that the
parity exit rule keeps its meaning in plainer words (DDD §7.2,
T-35); that restoring the processed tables after a reproduction
(DDD §4.3) stays a manual owner step, with no machine check; and
that this ledger's Scope counts this review. T-60's body, changed
after its acceptance, returns to Draftable, and the bodies of T-11,
T-12, T-16, T-35, T-40, T-41, T-44, T-46, T-60, and T-61 stay
Draftable until the owner accepts them. After these corrections, all
5,259 relative links in 54 Markdown files resolved; the DDD §8
matrices held 444 rows and the IP §7 matrix 42, each IP row identical
to its DDD twin; the traceability lint, `check_traceability.py`,
reported no failed check and `gap rows: 0`; and `git diff --check`
passed. These are document checks, not runs of the tests that the
corrections specify.

## Owner decisions on versions and branches (2026-11-01)

The owner decided on 2026-11-01 how versions and branches carry the
implementation. These decisions are not review findings.
[DDD §6.3 — CI workflows](ddd.md#63-ci-workflows) and
[IP §3 — Gates and release sequence](ip.md#3-gates-and-release-sequence)
(Branches) state the model, and
[IP §4 — Owner and research-group actions](ip.md#4-owner-and-research-group-actions)
defines the four owner actions it adds, OA-18 to OA-21, each with its
record and check.

- **v0.3.x holds the design only.** Once the owner's commit accepting
  the DDD and the IP is on `dev-v.0.3.x`, that branch merges into
  `main` as the design state (OA-18), which changes no page of the
  site — its push run republishes the same pages. The merge takes the
  plain git tag `v0.3.0`, with no GitHub release, which ADR-0017 would
  count as a public release. `CITATION.cff` and `.zenodo.json` keep
  version 0.2.0 until v0.4.0, so the unlisted prototype's footer shows
  software version 0.2.0.
- **The implementation runs on `dev-v.0.4.x`**, created from `main`
  after that merge (OA-19). Every task branch starts at
  `origin/dev-v.0.4.x`, every task pull request targets it, and the
  owner merges each, so that Done means merged into `dev-v.0.4.x`;
  `main` receives the implementation once, as v0.4.0, by the release
  merge of
  [IP T-65 — v0.4 release (owner)](ip.md#t-65--v04-release-owner).
- **The prototype deploys by manual runs.** The owner admits
  `dev-v.0.4.x` to the `github-pages` environment (OA-20) before
  [IP T-54 — Prototype deployment (unlisted)](ip.md#t-54--prototype-deployment-unlisted),
  whose deployment and every later prototype update are manual runs
  of the Companion site workflow on that branch. No such run precedes
  T-54's, so `main`'s design state stays live until then, and the
  rollback rehearsal, T-64, now waits for T-54.
- **The release target is v0.4.**
  [PRD §2.2 — MVP and delivery priorities](prd.md#22-mvp-and-delivery-priorities)
  and [D-1](pdd.md#1-decision-register) (P1 is the MVP and release
  target (v0.4)) name v0.4, D-1 with a dated note, and the documents
  that cite them follow. ADR-0012's "the MVP (v0.3)" and the earlier
  sections of this ledger keep their wording, written before the
  decision, except that their links to T-65 follow its renamed
  heading.
- **The manual runs end when the release sequence begins.** Just
  before OA-3's D-10 commit, the first of the release-branch order,
  the owner removes `dev-v.0.4.x` from the environment (OA-21), so
  that no run deploys the D-10 text, the glossary additions, the
  activation, or the release commit before the release merge. T-64,
  whose redeploy is a manual run, completes before it.
- **One ruleset covers `main` and `dev-v.0.4.x`**: OA-10's, with the
  same five required checks, not strict, and the Always-allow admin
  bypass.
- **Pushes to `dev-v.*` branches validate without deploying.**
  [IP T-22 — Deploy gating](ip.md#t-22--deploy-gating) extends the
  Companion site push trigger to the `dev-v.*` branches and gates
  `deploy` on
  `github.event_name == 'workflow_dispatch' || (github.event_name == 'push' && github.ref == 'refs/heads/main')`:
  pull requests and pushes to `dev-v.*` build and check, a push to
  `main` deploys, and a manual run deploys from a branch the
  environment admits — `main` always, `dev-v.0.4.x` from OA-20 until
  OA-21 — and fails at the environment on any other. Only the runs
  that can deploy share the `pages` concurrency group. These push runs
  give the SC-7 approval record and the release checklist their
  Companion site runs on `dev-v.0.4.x`.
- **After v0.4.0, `dev-v.0.5.x`**, as the owner changed the proposal.
  The owner creates it from `main` and adds it to the ruleset; every
  later change — a patch, a data refresh, a rollback, a withdrawal —
  is a pull request into it and reaches `main` by its merges. It never
  joins the environment, so only `main` deploys after the release, and
  `dev-v.0.4.x` takes no further pull request and is never
  fast-forwarded again. Within the release, before its tag exists, a
  fix-forward still lands on `dev-v.0.4.x` and reaches `main` by a
  second release pull request; T-65's Done record rides in the first
  pull request merged into `dev-v.0.5.x`.
- **ADR housekeeping.**
  [ADR-0017 — An unadvertised prototype deployment precedes the public release](../adr/0017-unadvertised-prototype-before-public-release.md)
  and
  [ADR-0009 — GitHub Pages (via Actions) as site hosting](../adr/0009-github-pages-hosting.md)
  each take a dated amendment of 2026-11-01; the ADR index already
  states that an accepted ADR takes dated amendments.

The pass that applied these decisions chose defaults, of which the
owner is told. An emergency data withdrawal while `dev-v.0.4.x` is out
of the environment never re-admits it, since a run from it would
publish the release-order commits early: a manual run on `main`
deploys the design-state site, which takes the scenario page and its
data off the live site until the release merge
([DDD §4.3 — Retention, rollback, recovery, and withdrawal](ddd.md#43-retention-rollback-recovery-and-withdrawal)).
ADR-0017's amendment precedes its References, so that no cited line
range moves, and a row added by hand traces it in
[DDD §8.4 — From the ADRs and the ADR process](ddd.md#84-from-the-adrs-and-the-adr-process)
and [IP §7.4 — From the ADRs](ip.md#74-from-the-adrs). The owner's
record commits may land directly on `dev-v.0.4.x`, under the ruleset's
bypass, and `main` stays the default branch, so every pull request
into `dev-v.0.4.x` names its base.

The same pass applied the fixes of an implementation-readiness audit
of 2026-11-01: `playwright-core` 1.47.2 joins DDD §2's exact
development pins, which T-01 checks in its lockfile; an implementation
agent works in a linked worktree of its own with a virtualenv of its
own, linking the research data read-only
([IP Execution contract](ip.md#execution-contract), rule 3); T-01
defines its clean checkout; and a fresh clone skips 39 tests, not the
34 that the `tests.yml` header states, which T-14 corrects. The
audit's four remaining questions were settled by defaults, of which
the owner is also told: T-04's gap drill uses a row whose Kind is not
`n/a`; DDD §2 and T-02 state the stylesheet's build options; T-03's
serve check names its URL, status, and stop, and its scratch page is
listed under `not_in_nav`; and only T-17 prints the payload
diagnostic line, as DDD §3.8 and §4.1 state. After these changes, all
5,220 relative links in 54 Markdown files resolved; the DDD §8
matrices held 444 rows and the IP §7 matrix 42, each IP row identical
to its DDD twin and none with Status `gap`; `git diff --check`
passed; and ADR-0017 was identical to its accepted version through
the end of its Consequences, except its Date line. These are
document checks: none of the tasks, workflow edits, or owner actions
that these changes describe has been carried out.

## Owner decisions on the first implementation wave (2026-11-02)

The owner decided on 2026-11-02, adopting the agent's
recommendations, four questions that the first task pull requests
raised. These decisions are not review findings. The owner's
decisions of the same day on the CF corrections and their follow-ups
are recorded at the end of
[Consistency, ambiguity, and feasibility review (2026-11-01)](#consistency-ambiguity-and-feasibility-review-2026-11-01).

- **Task state is read from the Status column.** On 2026-11-02 the
  Done record of [T-04](ip.md#t-04--traceability-lint) (Traceability
  lint) made untrue the IP's opening statement that no task had been
  executed and none was Done, and
  [T-01](ip.md#t-01--gradle-webapp-subproject) (Gradle webapp
  subproject) and [T-10](ip.md#t-10--product-export-views) (Product
  export views) were to follow. The passages that stated the state of
  tasks or checks — the status paragraphs of the DDD and the IP, the
  introduction of
  [IP §6 — Blocked-by index](ip.md#6-blocked-by-index), the DDD's
  [Document conventions](ddd.md#document-conventions) and
  [Closure notes (Proposed 2026-10-30)](ddd.md#closure-notes-proposed-2026-10-30),
  and this ledger's Evidence paragraph — now point instead to the
  Status column of [IP §2 — Task graph](ip.md#2-task-graph), the
  record of each task's state, or to the Done record of the task that
  runs a check ([Task format](ip.md#task-format)), so that none goes
  stale as tasks complete. One passage of that kind is unchanged: the
  definition of Status `planned` in
  [DDD §8 — Traceability](ddd.md#8-traceability), "specified in this
  document, and none has run".
- **The npm audit of T-01's pins.** With npm 10.9.0, `npm audit` of
  the exact development pins of
  [DDD §2 — Repository structure, naming, and toolchain](ddd.md#2-repository-structure-naming-and-toolchain),
  which T-01 installs, reports two advisories.
  [GHSA-7mvr-c777-76hp](https://github.com/advisories/GHSA-7mvr-c777-76hp),
  high, affects `playwright` before 1.55.1, which `@playwright/test`
  1.47.2 installs: "Playwright downloads and installs browsers without
  verifying the authenticity of the SSL certificate". It matters only
  where `playwright install` runs — the reference VM's install of
  [T-59](ip.md#t-59--reference-measurement-environment) (Reference
  measurement environment) and `playwrightInstall` of
  [T-60](ip.md#t-60--browser-test-lane) (Browser test lane) — not in
  T-01.
  [GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99),
  moderate, affects `esbuild` up to 0.24.2: "esbuild enables any
  website to send any requests to the development server and read the
  response"; `build.mjs` does not use that server. T-01 merges with
  the DDD §2 pins as specified, and the esbuild advisory is accepted
  as is. Open: before T-59 or T-60 starts, the `@playwright/test` pin,
  and with it the `playwright-core` pin, is to be raised in DDD §2 to
  1.55.1 or later, reviewed under
  [ADR-0011 — Webapp toolchain — TypeScript + esbuild, no framework, SVG charts](../adr/0011-webapp-toolchain.md),
  because it also changes the browser builds that the measurements
  use.
- **Derived-view counts.** T-10 adds the view `field_export`, so
  `build_duckdb_views` creates 14 views, or 11 when the
  `fdhi_measurements` table is absent. By the owner's decision, T-10's
  pull request also updates the four documents that count these
  views — `README.md`, `docs/setup.md`, `docs/datasets.md` with its
  Derived views table, and `dashboards/duckdb/README.md` — although
  they are outside T-10's listed files.
- **T-04 follow-ups.** The header comment of
  `.github/workflows/doc-links.yml` now describes both check steps of
  its job, **Check links and anchors** and **Check traceability**. Two
  notes from the review of T-04's pull request are recorded for later,
  with no change to the lint now: (b) as step 2 of
  [DDD §4.1 — Export task and validation](ddd.md#41-export-task-and-validation)
  is worded, its file-name items count as rules, so the entry
  `§4.1 step 2 rule scenario-<h12>.bin.gz` passes; and (c) an empty
  Check cell or an empty entry passes as `text`/`designed`.
- **T-11 review.** On the independent review of T-11's pull request,
  the owner decided four more questions the same day. The export
  checks its tag against `^data-v(0-test|[1-9][0-9]*)$` before it
  deletes or writes anything, a plain diagnostic until T-12's rule
  `data-tag` takes it over, so that no tag reaches the reset of
  `dist/app/`. The report's first two lines read
  `source_commit: <sha>` and `source_tree_clean: true|false`, which
  [DDD §4.1 — Export task and validation](ddd.md#41-export-task-and-validation)
  left open. The `stage_spacing` arithmetic was a numerical
  specification gap: rule `manifest-figures` requires exact equality,
  so [DDD §3.2 — Artifact manifest](ddd.md#32-artifact-manifest) now
  fixes it — binary64 differences of the decoded slips, `min`, `max`,
  and a `math.fsum` mean — and T-12 applies it to the decoded
  artifact; T-12's body, changed for it, returned to Draftable. Float64
  subtraction is acceptable; that readers see the mean rounded to
  0.05 does not settle the stored figures. T-11's Done-when now states
  that §3.8 item 2's raw figure is the sum of two `size:` figures, as
  its step (7) defines it — an erratum that adds no requirement.
- **T-13 review.** With the reference-results file's figures recorded,
  item 3 of the pending list of
  [DDD §3.8 — Measured sizes](ddd.md#38-measured-sizes) named no
  unrecorded figure, so by §3.8's completion rule the owner had it
  moved into the text above; items 4 and 5 became items 3 and 4, and
  every citation of the old item 4 — §7.6, four §8 Check cells, and
  T-61's body — and T-13's two references to item 3 were renumbered
  with it, a change of numbering only. §3.8 now also states that sizes
  describe the measured export run: a fresh export's new
  `export_date` may change compressed JSON sizes with unchanged
  research data, the scenario binary stays unchanged for the same data
  and compression environment, and a strict `--reproduce` run must
  reproduce every file byte for byte.
- **T-12, T-30, and T-36 reviews.** Rule `dd10-names` cannot fail in a
  run through a bad name alone, because `format-spec`'s closed lists
  reject that name first; what it alone catches is a column renamed
  consistently in the writer and in its closed spec. By the owner's
  decision, T-16's `dd10-names` corruption is that consistent rename,
  in a full run printing `format-spec: ok` before
  `dd10-names: FAILED`, rather than a direct call of the rule; T-16's
  body, changed for it, returned to Draftable. The owner also had
  [DDD §5.2 — Artifact loading and decoding](ddd.md#52-artifact-loading-and-decoding)
  key `trial_columns` by the seven trial-table names, the reserved
  `model_family` among them, instead of the 13 DD-10 names, and
  [DDD §3.5 — Regression export](ddd.md#35-regression-export) state that
  its `relationship` texts are copy, outside `dd10-names`. The
  `decode.test.ts` row's "dictionary extents" now reads as T-30 and
  T-36 implement it — the `dip_dictionary` length a whole number of
  int32 entries within the file — and the
  [DDD §7.6](ddd.md#76-performance-and-compatibility-measurements)
  `ReadableStream` row names the loader's three Streams surfaces.
- **Merging task pull requests.** On 2026-11-03 the owner gave the
  agent standing permission to merge task pull requests into
  `dev-v.0.4.x` once CI is green, the independent review has passed,
  no owner question is open, and the branch is current; pull requests
  that change the design documents beyond a task's Status cell, the
  owner's acceptances and actions, and every merge into `main` stay
  the owner's. The
  [Task format](ip.md#task-format) of the implementation plan records
  the rule.
- **Errata from the T-40 and T-43 reviews.** T-40's Done-when counted
  "approximately 0–5 m" in `copy.json` once, but T-47's verbatim PDD
  §5.6 entry already contains it, and T-40 adds the separate PDD §3.4
  entry; the check now matches that entry's JSON string. DDD §5.6
  names `settingsText(state)`, as §5.1, §5.7, and §5.9 do. DDD §5.8's
  glossary linker also skips text inside an `<a>`, where a link would
  nest one link in another, so the field-source terms inside the
  overlay legend's source links stay unlinked there.
- **T-32 follow-up: the sort of `validValues`.** On 2026-11-03 the
  owner adopted a speedup that preserves the function: `validValues`
  of [T-32](ip.md#t-32--statistics-module) (Statistics module) builds
  `sorted` by a counting sort of the integer steps, each then divided
  by `D`, instead of the typed-array numeric sort of the restored
  values, as
  [DDD §5.4 — Statistics](ddd.md#54-statistics) (Gather) now states.
  The output is bit-identical. In the spot timing of
  [T-37](ip.md#t-37--early-feasibility-diagnostic) (Early feasibility
  diagnostic) on [GS-0](pdd.md#102-golden-scenarios) (Empty scenario
  (no active slip window), default population), a diagnostic and never
  acceptance evidence, four runs of each build alternated on one
  heavily loaded machine, where decode and query took about twice
  their lighter-load times; the median selection-and-statistics
  interval was 76–83 ms after the change against 185–200 ms before,
  2.4–2.5 times shorter in each pair. At the lighter load, earlier,
  the build before the change had a median of 92–94 ms.

## References

- [`docs/app/ddd.md` — Ground Rupture Explorer — detailed design document](ddd.md).
- [`docs/app/ip.md` — Ground Rupture Explorer — implementation plan](ip.md).
- [ADR-0016 — Performance reference environment — an on-demand AWS VM defined by Terraform](../adr/0016-performance-reference-environment.md).
- [ADR-0017 — An unadvertised prototype deployment precedes the public release](../adr/0017-unadvertised-prototype-before-public-release.md).
- [`notes/Roadmap.md` — Ground Rupture Explorer — owner actions (opened 2026-10-30)](../../notes/Roadmap.md#ground-rupture-explorer--owner-actions-opened-2026-10-30).
- Precedent for this ledger:
  [PRD v2 review — first complete draft (2026-10-15)](prd-v2-review.md).
