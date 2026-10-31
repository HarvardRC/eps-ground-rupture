# DDD review ledger

The record of the external reviews of the detailed design document
([`docs/app/ddd.md`](ddd.md)) and of the implementation plan that
accompanies it ([`docs/app/ip.md`](ip.md)), and of what was done with
each finding. Review 2 asked for it: "Review records need a durable
evidence location". The DDD's status line cites this file.

**Scope.** Three reviews, all of 2026-10-30: review 1 of the full DDD
draft, review 2 of the corrected DDD, and a review of
[ADR-0016 — Performance reference environment — an on-demand AWS VM defined by Terraform](../adr/0016-performance-reference-environment.md).
The review texts are model output from the owner's review agent, not
statements of the research group or of any other person. Reviews 1
and 2 state that they read the supplied text and did not
independently check the repository contents, the reported
measurements, the revised PDD decisions, or the amended ADRs. This
ledger restates each finding in one line under its review's own
identifier — review 2's observations are lettered here, and the
ADR-0016 points numbered — and does not reproduce the review texts.
It also records the correction pass's own verification rounds and
the owner's rulings made during the pass.

**Evidence.** Nothing the DDD specifies has been built, and none of
the checks it specifies has run. A disposition is a change to the
documents: the Where column names the sections that now carry it and
the IP tasks that will implement it, not evidence that it holds.

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
| **7** The ECDF remains underspecified relative to the execution contract | Confirmed | The curve is exact: a step at each distinct value to F = (count ≤ x) / n, drawn as a right-continuous path; above 512 distinct values, 512 points at `Math.round(j * (m - 1) / 511)`, with the maximum vertical error stated; a one-step domain for constant data; the read-off marker at (`quantileLinear(sorted, p)`, p), which may lie between steps. Planned tests run the pure `ecdfSteps` on duplicates, constant data, and m = 511, 512, and 513. | [DDD §5.12](ddd.md#512-charts), [§7.4](ddd.md#74-application-tests); [IP T-41](ip.md#t-41--measurement-panels-and-charts) |
| **8** The immutable-release withdrawal procedure conflicts with mandatory rollback readiness | Confirmed | Release checklist item 12 checks each release's owner-approved rollback target — an earlier software tag whose retained vintage passes the retention check, not necessarily the previous one, and never a withdrawn or affected vintage — or a recorded absence, `no rollback target: first release` for the first release. | [DDD §4.3](ddd.md#43-retention-rollback-recovery-and-withdrawal), [§7.7](ddd.md#77-site-validation-and-release-checklist); [IP T-64](ip.md#t-64--rollback-rehearsal-owner), [T-65](ip.md#t-65--v03-release-owner) |
| **9** Release evidence needs exact correspondence between the tested, tagged, and deployed code | Confirmed | The bundle's full SHA-256 is the build identity: equal in the CI artifact of the tested release-branch head, in the artifact of the run that deployed the `main` commit, and in the served bundle that the published-site run hashes. The `main` commit's tree equals the tested head's (`git diff --quiet`), and the software tag names that commit; version labels alone never establish identity. | [DDD §7.7](ddd.md#77-site-validation-and-release-checklist), [§6.2](ddd.md#62-software-and-data-version-stamps), [§7.6](ddd.md#76-performance-and-compatibility-measurements); [IP T-65](ip.md#t-65--v03-release-owner) |
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
  deployed unlisted, with a prototype notice, under assumed licensing
  terms, for the research group's review. The rules attached to a
  public release — among them approval of the texts under
  [SC-7](pdd.md#101-success-criteria) (scientific sign-off), the
  [D-10](pdd.md#1-decision-register) (Liability-limitation text
  referenced by CR-4) text, confirmed data terms, and the release
  checklist — apply at activation and at the first software release;
  the CI gates, the publication-inventory and media checks, and the
  rule that no third-party photograph deploys without documented
  permission apply from the first deployment
  ([DDD §6.1](ddd.md#61-build-outputs-asset-paths-and-page-scaffold),
  [§4.2](ddd.md#42-publication-of-a-data-vintage),
  [§7.7](ddd.md#77-site-validation-and-release-checklist)).

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
- **The two Proposed ADRs.** Owner action
  [OA-12](ip.md#4-owner-and-research-group-actions) accepts
  [ADR-0016 — Performance reference environment — an on-demand AWS VM defined by Terraform](../adr/0016-performance-reference-environment.md)
  before the reference environment is built, and
  [OA-16](ip.md#4-owner-and-research-group-actions) supplies its
  pinned image ID;
  [ADR-0017 — An unadvertised prototype deployment precedes the public release](../adr/0017-unadvertised-prototype-before-public-release.md)
  is accepted before the first data vintage is published and before
  the prototype deployment.
- **[OA-10](ip.md#4-owner-and-research-group-actions)**, the `main`
  ruleset of review 1's B-9, with its reading of
  [ADR-0015 — Golden-scenario references and a pipeline↔client parity harness](../adr/0015-golden-scenario-parity.md)'s
  "a parity failure blocks merge" under the admin bypass.
- **[OA-4](ip.md#4-owner-and-research-group-actions)**, the approval
  of the reader-facing texts under
  [SC-7](pdd.md#101-success-criteria) (scientific sign-off) — among
  them the fixed-here texts these corrections added, such as the
  slip-entry rejection line (B-2), the chart-data disclosure label
  (C-1), and the prototype notice — recorded with each text's
  SHA-256, so that a later change to a listed text needs a new
  approval.
- **[OA-5](ip.md#4-owner-and-research-group-actions)**, the
  release-time reference measurement (C-3) and the manual pass over
  the other baseline engines and mobile browsers (C-2; review 2,
  item 3).
- **Release steps** of [T-65](ip.md#t-65--v03-release-owner), the
  v0.3 release, which the owner runs under
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
  [OA-13](ip.md#4-owner-and-research-group-actions) and
  [OA-1](ip.md#4-owner-and-research-group-actions) write and then
  confirm the data terms; until then, Phase 1 publishes under the
  assumed terms that
  [DDD §4.2](ddd.md#42-publication-of-a-data-vintage) step 1
  records.

## References

- [`docs/app/ddd.md` — Ground Rupture Explorer — detailed design document](ddd.md).
- [`docs/app/ip.md` — Ground Rupture Explorer — implementation plan](ip.md).
- [ADR-0016 — Performance reference environment — an on-demand AWS VM defined by Terraform](../adr/0016-performance-reference-environment.md).
- [ADR-0017 — An unadvertised prototype deployment precedes the public release](../adr/0017-unadvertised-prototype-before-public-release.md).
- [`notes/Roadmap.md` — Ground Rupture Explorer — owner actions (opened 2026-10-30)](../../notes/Roadmap.md#ground-rupture-explorer--owner-actions-opened-2026-10-30).
- Precedent for this ledger:
  [PRD v2 review — first complete draft (2026-10-15)](prd-v2-review.md).
