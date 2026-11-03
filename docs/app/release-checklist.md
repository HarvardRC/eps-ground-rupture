# Release checklist

The template of the release record that
[DDD §7.7 — Site validation and release checklist](ddd.md#77-site-validation-and-release-checklist)
specifies. The owner fills one copy per release; the filled copy,
pasted into the GitHub release description, is the release record.
The checks run on the release branch before the merge that releases
the change, except the published-site measurement of item 5, which
follows the deployment, and items 10 and 11, which run on the
software release's tag while its release is still a draft.

## Release record

| Field | Value |
|---|---|
| Software revision (the 40-hex commit) | |
| Pointer-manifest revision, as selection history | |
| Published data release URL | |
| Exact filename/SHA-256 map | |
| Test-suite and lane versions, with their results | |
| Approval references | |

## Checklist

| # | Check | Applies to | Evidence recorded |
|---|---|---|---|
| 1 | CI green on the release commit ([§6.3](ddd.md#63-ci-workflows)): Tests — `pytest`, and `webapp-test` with **Webapp checks** (the compatibility and toolchain tests included) and **Parity**; Companion site — `webapp-bundle` with **Webapp checks**, **Parity**, and **Build bundle**, and `build` with **Build site** and **Build preview site**, the `site_checks` hook included; Doc links — `links`, with **Check links and anchors**, **Check PDD agreement**, **Check traceability**, and **Self-test doc scripts**. Pull-request runs are unfiltered, and both workflows' push filters name `CITATION.cff`, which every release commit changes, so the runs exist. The window end the compatibility test prints — the newest browser release in the pinned `caniuse-lite` — is on or before the release date and no more than 30 days earlier; otherwise the exact dataset pin and lockfile are upgraded, explicit support rows are re-reviewed, and the compatibility test is rerun first ([§7.6](ddd.md#76-performance-and-compatibility-measurements)). | Every release | `gh run list --commit <release sha>` output, the run URLs, and the compatibility test's printed dataset version and window end. |
| 2 | Full-data run: `pytestFullData`, run by `publishVintage` against the staged vintage, exits 0 with zero skips and every `full_data_required.txt` test collected and passed ([§7.3](ddd.md#73-pipeline-and-export-tests)). | Vintage release | The pytest summary line in the publication record. |
| 3 | Publication: `publishVintage` completed ([§4.2](ddd.md#42-publication-of-a-data-vintage)) — the data tag peels to the source commit, the release's asset names and SHA-256s equal the pointer exactly, the release is published — which locks it, the repository's releases being immutable (§4.2 step 1 re-checks this) — and the owner's pointer commit sits directly on the source commit. | Vintage release | The publication record `dist/app/data-vN.publication.json` and its copy in the data release's body. |
| 4 | Browser lane: `webappBrowserTest` (projects `desktop` and `mobile`) exits 0 on the release branch, its `playwrightInstall` dependency first installing the pinned Chromium build ([§7.5](ddd.md#75-browser-test-lane)). | Every release | `subprojects/webapp/build/playwright/report.json` and the traces, attached. |
| 5 | Measurements ([§7.6](ddd.md#76-performance-and-compatibility-measurements)) against [PDD §9.1 — Performance budgets (D-9, Proposed)](pdd.md#91-performance-budgets-d-9-proposed): (a) before the merge, `webappMeasureReference` on the release branch completes — its measure run exiting 0, its report downloaded, and the VM destroyed (§7.6 step 7) — with a report recording `environment.kind` `aws-ec2`, the instance type, region, and AMI of [DD-12](ddd.md#1-ddd-decision-register) (Performance reference environment), the DD-12 `network` values, its `terraform_version`, and `source_tree_clean` true; the release is then accepted on that report, a decision separate from the run's completion, only when every workload reads `within_budget` true: nearest-rank 95th percentiles of 30 runs (`sorted[28]`: at least 29 of the 30 observed runs within budget, a sample-based acceptance rule) at most 2.0 s cold, 1.0 s warm in both variants, and 200 ms for each interaction workload, with every cold run's data payload at most 4 MB compressed; (b) after the release's deployment, fast-forward the clean local release branch to `<main sha>`, the merge commit that deploys the release (Evidence ledger, below), and require `HEAD` to equal it ([IP T-65 — v0.4 release (owner)](ip.md#t-65--v04-release-owner), step (4)); from the repository root, the published-site run (`-Pegr.perf.target=published`) completes, its measure run exiting 0, so the header sets match, with a report recording `environment.kind` `aws-ec2`, the instance type, region, and AMI of DD-12, the DD-12 `network` values, `source_commit` equal to `<main sha>`, and `source_tree_clean` true, and its cold and fresh-warm workloads read `within_budget` true — a miss reopens the release. | Every release | The report directories `subprojects/webapp/build/perf/<run_id>/`, attached, with browser, device, version, vintage, revision, and Terraform version named. |
| 6 | Success criteria: each row of the table below verified by its named artifact. | Every release | Per row. |
| 7 | [D-10](pdd.md#1-decision-register) (Liability-limitation text referenced by CR-4) gate: the standing disclaimer in `scenario.md`'s `#gre-disclaimer` is the owner-sourced text, and the item-7 search below prints nothing. Until the text is approved PDD §5.1's bracketed slot "[the project's liability limitations — text pending, D-10]" stands in `#gre-disclaimer` verbatim, as the unlisted prototype of [§6.1](ddd.md#61-build-outputs-asset-paths-and-page-scaffold) shows it, and the bundle carries no PDD §5.1 text ([§5.8](ddd.md#58-view-layer)). No placeholder liability text ships in a public release. | Every release | The empty search output and the sourcing record. |
| 8 | Glossary: every first-use glossary anchor of [PDD §5.11 — Labels, units, and glossary links (FR-G3, CR-3, CR-7)](pdd.md#511-labels-units-and-glossary-links-fr-g3-cr-3-cr-7) resolves in both built trees (the lane's `render` spec asserts the application's links; the strict builds check the authored pages); the pre-launch additions are present — the PFDHA and engineer-of-record glossary entries of [§6.4](ddd.md#64-product-pages-beyond-the-scenario-page-p2p3), the copy-marked `glossary.md` block that step 7 of `check_pdd_agreement.py` compares with §6.4 and step 8 lists ([§5.13](ddd.md#513-application-configuration)); and the FDHI entry's spelling is aligned to the singular "Fault Displacement Hazard Initiative": the item-8 search below prints nothing. | Every release | The search output and the step-8 list of item 1's **Check PDD agreement** run. |
| 9 | Media permission ([R-12](prd.md#93-content-and-media-dependencies) (Public permission for third-party earthquake photographs is unresolved.)): the `site_checks` hook ran in the release commit's **Build site** and **Build preview site** steps without raising — neither output holds a media file that is neither allowlisted nor a granted index entry, referenced or not, nor any `media/dev/` path or reference. | Every release | The hook's result in the release commit's **Build site** log. |
| 10 | Zero-`fig-*` archive: the item-10 listing below prints 0 — the `export-ignore` arrangement recorded in [`notes/Roadmap.md` — Decisions made](../../notes/Roadmap.md#decisions-made); from P2 the listing also holds no entry under `subprojects/mkdocs/docs/media/` ([§6.4](ddd.md#64-product-pages-beyond-the-scenario-page-p2p3)). | Every release | The archive listing. |
| 11 | Attachment identity ([DD-8](ddd.md#1-ddd-decision-register)): on the draft software release of [§4.4](ddd.md#44-licensing-archival-distribution-and-release-attachments), before it is published, run the checklist's `gh release upload` block of §4.4 — the files the committed pointer manifest names, their list generated from it, and beside them the dashboards' plotting CSVs that the block regenerates in `dist/csv/`, per [`notes/Roadmap.md` — Decisions made](../../notes/Roadmap.md#decisions-made) — then re-download every data asset the pointer names and compare SHA-256 checksums. Attachments must be "the same verified files identified by that release's committed pointer manifest" ([HLDD §9 — Testing and release architecture](hldd.md#9-testing-and-release-architecture), Software-release data attachments), byte for byte. Before the draft is published, `gh api repos/HarvardRC/eps-ground-rupture/immutable-releases --jq .enabled` prints `true`, so publication locks the verified attachments. | Every release | The checksum comparison output and the immutability command's output. |
| 12 | Rollback readiness: the release's rollback target of [§4.3](ddd.md#43-retention-rollback-recovery-and-withdrawal) (Rollback), which the owner approves — an earlier software tag, not necessarily the immediately preceding one, whose vintage no withdrawal excludes — and the §4.3 retention check of the vintage that the tag's pointer manifest (`git show <tag>:subprojects/webapp/data/pointer.json`) names; or, when no tag qualifies, the owner-approved absence of §4.3, which for the first software release reads `no rollback target: first release`. | Every release | The target's tag and its retention check output, or the absence line. |
| 13 | Acceptance walkthroughs: [US-1](prd.md#us-1-dam-foundation-scenario) (Dam foundation scenario), [US-2](prd.md#us-2-pipeline-crossing) (Pipeline crossing), and [US-3](prd.md#us-3-design-review) (Design review) executed against the golden scenarios ([PDD §10.3 — Acceptance walkthroughs](pdd.md#103-acceptance-walkthroughs)); [US-4](prd.md#us-4-interpreting-observed-deformation) (Interpreting observed deformation) and [US-5](prd.md#us-5-teaching-surface-rupture-morphology) (Teaching surface-rupture morphology) join when their P2 capabilities ship. | Every release | Reviewer records. |
| 14 | Representative assistive-technology pass — a human check beyond the automatable lane checks ([HLDD §7.2 — Accessibility and supported environments](hldd.md#72-accessibility-and-supported-environments)) — which reads one chart's bin table and one field table with the chart-data disclosure open. | Every release | Reviewer record. |
| 15 | Representative engines and mobile browsers (manual): the procedure below, run by the owner against the preview tree served by `playwright/serve.mjs`, started in the form of Node.js outside Gradle of [§2](ddd.md#2-repository-structure-naming-and-toolchain). | Every release | The engine record. |
| 16 | Traceability: `python3 .github/scripts/check_traceability.py --release` exits 0 on the release commit — the [§8](ddd.md#8-traceability) matrix lint, which under `--release` exits non-zero on any gap ([§6.3](ddd.md#63-ci-workflows) runs it without the flag). | Every release | The command output, with its gap count of 0. |
| 17 | Data terms: the pinned vintage's terms file holds the confirmed record of [§4.2](ddd.md#42-publication-of-a-data-vintage) step 1, never the assumed one ([§4.4](ddd.md#44-licensing-archival-distribution-and-release-attachments)): the item-17 search below prints 1. | Every release | The search output. |

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

## Item 15 procedure

The owner first runs
`./gradlew :subprojects:mkdocs:mkdocsPreview :subprojects:webapp:npmCi`
and then, in `subprojects/webapp` in the form of Node.js outside
Gradle of [§2](ddd.md#2-repository-structure-naming-and-toolchain),
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
every one of these origins ([§7.5](ddd.md#75-browser-test-lane), Static
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
   [§7.5](ddd.md#75-browser-test-lane)) — then one set of controls, one
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
evidence of [§7.6](ddd.md#76-performance-and-compatibility-measurements)
alone.

## Item 6 — success criteria

**Success criteria and their verifying artifacts** (item 6; the
criteria are
[PDD §10.1 — Success criteria](pdd.md#101-success-criteria)'s):

| Criterion | Verifying artifact |
|---|---|
| [SC-1 (core workflow)](pdd.md#101-success-criteria) | The US-1 walkthrough executed by an engineer new to the product, unassisted; the lane's `golden-scenario` spec is its scripted twin, not its substitute. |
| [SC-2 (download reproducibility)](pdd.md#101-success-criteria) | The lane's `consistency` spec — the downloaded `scenario.json` equals the scenario built, and `test/zipcheck.py` accepts the archive — plus the walkthrough reviewer identifying scenario settings, data-export version, matching-record count, and every statistic from the downloaded package alone. |
| [SC-3 (correctness)](pdd.md#101-success-criteria) | The [§7.2](ddd.md#72-calculation-parity-tests) parity run on the release commit (both **Parity** steps), and the lane's `golden-scenario` spec: displayed strings equal the reference display strings exactly. |
| [SC-4 (performance)](pdd.md#101-success-criteria) | The [§7.6](ddd.md#76-performance-and-compatibility-measurements) reports of item 5 from the reference environment (`environment.kind` `aws-ec2`, the instance type, region, and AMI of [DD-12](ddd.md#1-ddd-decision-register), and the DD-12 `network` values): nearest-rank 95th percentiles of 30 runs at most 2.0 s cold, 1.0 s warm, and 200 ms per interaction workload, with the payload at most 4 MB compressed; and the published-site run after deployment. |
| [SC-5 (candor)](pdd.md#101-success-criteria) | The lane's default-view caveat assertions plus the acceptance review: every applicable caveat present in the default view, the population name always visible with its explainer one action away. |
| [SC-6 (site integrity)](pdd.md#101-success-criteria) | The strict builds' exit status on both trees, the `site_checks` hook included, the lane's `site-regression` spec, and the acceptance confirmation that the existing dashboards, navigation, citation pages, and deployment are unaffected. |
| [SC-7 (scientific sign-off)](pdd.md#101-success-criteria) | The recorded research-group approval ([OA-4](ip.md#4-owner-and-research-group-actions)) of the reader-facing texts — the [PDD §5 — Copy deck](pdd.md#5-copy-deck) texts and every fixed-here text `check_pdd_agreement.py` lists, in `copy.json` or between copy markers ([§5.13](ddd.md#513-application-configuration)), the glossary additions of [§6.4](ddd.md#64-product-pages-beyond-the-scenario-page-p2p3) among them — as the SC-7 approval record below, referenced from the release record: the newest record's listing, `data_tag`, and bundle digests equal the step-8 listing printed at the release commit, its pointer's `data_tag`, and its build's digests, and the record follows the activation commit of [§6.1](ddd.md#61-build-outputs-asset-paths-and-page-scaffold) and precedes the release merge that deploys the activated page. |

## Software-release attachments

Item 11 runs this command block of
[DDD §4.4 — Licensing, archival distribution, and release attachments](ddd.md#44-licensing-archival-distribution-and-release-attachments)
at the repository root on the release commit: it attaches the files
the committed pointer manifest names, its file list generated from
that manifest when it runs, and the dashboards' plotting CSVs that
it regenerates in `dist/csv/`.

```sh
files=$(python3 -c '
import json
p = json.load(open("subprojects/webapp/data/pointer.json"))
print(" ".join("dist/app/%s/%s" % (p["data_tag"], f) for f in sorted(p["files"])))
')
gh release upload <software tag> $files --repo HarvardRC/eps-ground-rupture
rm -rf dist/csv && ./gradlew :subprojects:python:egrBuildAndExport
gh release upload <software tag> dist/csv/*.csv --repo HarvardRC/eps-ground-rupture
```

## Evidence ledger

**Evidence ledger.** The release record ends with a table
`| Check | Software revision | Data release | Result location | Result | Date |`,
one row per item above and per separately evidenced check (each
workflow run of item 1, each report of item 5), and one row per
`test`, `measure`, or `release` Check of every [§8](ddd.md#8-traceability)
row whose Status is neither `parked`, `deferred`, nor `n/a`. The
columns distinguish the subject of the check from the code that
produced its evidence:

- **Software revision** is the 40-hex checked software commit for a
  software check, and `n/a` for a data-only check. An exporter commit
  never occupies this cell merely because it produced the data.
- **Data release** is the full release URL of
  [§3.3](ddd.md#33-pointer-manifest), the path of the matching publication
  record, and the SHA-256 of the pinned pointer file, which equals
  that record's `pointer_sha256` and so fixes the exact
  filename/SHA-256 map. It is `n/a` for a check using only synthetic
  fixtures or no data. A check using a real vintage names that
  release even when Software revision is also present. A rollback
  retention check names its target release and the SHA-256 of the
  target's pointer file
  (`git show <tag>:subprojects/webapp/data/pointer.json`); all other
  real-data checks use the current pin. A tag alone, a draft, or a
  commit hash cannot fill this cell.
- **Result location** resolves to a CI run, attached report, or
  record identifying the concrete check and requirement it covers.
  Result is `pass` or `fail`; Date is the date that check ran, not
  the date its evidence was copied into a later release record.

Assign these subjects by the concrete check, including traceability
checks, under this exhaustive mapping:

| Check or lane | Software revision | Data release and evidence |
|---|---|---|
| Publication full-data checks (item 2 and the full-data lane of §7.3), export-validation rules evidenced by that publication run, its export-only byte-size report, and completed publication (item 3) | `n/a` | Published data release and exact asset map; the publication record and its covered checks. |
| Release-state and retention checks: the fresh check of the current pin, in both release shapes, and the retention check of item 12's target | `n/a` | The checked release and exact asset map; a fresh online result for this release acceptance, never merely a historical publication result or cache hit. |
| Published-site measurement, item 5 (b), and tagged software archive, item 10 | Tagged `main` commit | Current pin for the measurement; `n/a` for the archive check, which excludes the data assets. |
| Every other check, including fixture tests, CI, fetch-and-verify, parity, browser checks, pre-merge measurements, and software-release attachment checks | Release commit | Current pin when used by the check; otherwise `n/a`. |

A check with both publication-data and current-software lanes has
separate rows for those lanes, and item 12 with a target has two:
the target's retention check and the owner's approval of that
target, a Release-commit row with Data release `n/a`. Neither a
Python filename nor the word "size" makes all checks in that file
or report data-only. In particular, export byte sizes may be
inherited; application bundle and browser payload/timing
measurements require current software evidence.

Publication evidence may be inherited only for the same published
release, identical filename/SHA-256 map, and a passing recorded
check covering the same current requirement. The completed
publication record is that evidence: `publishVintage` writes it, in
§4.2 step 4, only after the export printed `ok` for every rule of
[§4.1](ddd.md#41-export-task-and-validation), which its `validation_report`
holds, and after the full-data run passed every node id that
`subprojects/python/tests/full_data_required.txt` listed. An
inherited row names its rule or node id in its Check cell, and
its Result location names that record, whose `tag_commit` fixes the
check's definition. The row covers the current requirement when
`git diff --quiet <tag_commit> <release sha> -- <defining files>`
exits 0, the defining files being, for a full-data test, its test
file, `subprojects/python/tests/conftest.py`, and
`subprojects/python/tests/full_data_required.txt`; for the full-data
run of item 2, every file under `subprojects/python/tests/`; for an
export rule or the size report, the exporter package
`subprojects/python/src/eps_ground_rupture/`; and for completed
publication (item 3),
`subprojects/python/src/eps_ground_rupture/publish.py`. Any other
exit status may mean a new or strengthened requirement that the
prior run did not cover: the row then cannot inherit a pass unless
it cites the owner's recorded review of that diff stating that it
adds or strengthens no requirement the row covers, and without that
review the reuse path of
[IP T-63 — Release vintage (owner)](ip.md#t-63--release-vintage-owner)
fails and the owner takes its refresh path. A different software
commit alone does not invalidate data evidence. Exporter
`provenance.source_commit` and publication `tag_commit` remain code
provenance for the run and its check definitions, never the data
identity. The publication run must still have `source_tree_clean`
true under §4.2 step 4.

The release revision is the release commit — the release-branch
head that item 1's runs check. Each release branch starts at `main`
— `dev-v.0.4.x` at its design state, `dev-v.0.5.x` after v0.4.0 —
and, while it is the release branch, `main` takes nothing but its
merges ([§6.3](ddd.md#63-ci-workflows), Branches), so the merge commit that
deploys the release has the release commit's tree
(`git diff --quiet <release sha> <main sha>` exits 0), and the
software tag names that `main` commit. A release record is complete
only when every ledger row reads `pass` and its subjects and
evidence satisfy the mapping and inheritance rules above. The row
of item 5 (b) reads `pass` only when its report's
`source_commit` equals that tagged `main` commit and
`source_tree_clean` is true, and the build identity holds — the full
SHA-256 of `app.js` and of `app.css` is the
same in the three places the release record lists: the `webapp-dist`
artifact of item 1's Companion site run; that of the Companion site
push run that deployed the `main` commit (each artifact read with
`gh run download <run id> --name webapp-dist --dir <empty temporary directory>`,
then `shasum -a 256 app.js app.css` in that directory); and its
report's `bundle` digests of the served files
([§7.6](ddd.md#76-performance-and-compatibility-measurements), Report) —
and when its report's `software_version` and `data_version` equal
the release commit's `CITATION.cff` version and its pointer's
`export_version`. Version labels alone never establish which build
was tested, deployed, or measured.

| Check | Software revision | Data release | Result location | Result | Date |
|---|---|---|---|---|---|
