# Guided explorer: implementation plan and execution record

**Status: authorized implementation candidate, 2026-11-04.** This
additive plan implements the owner's approved journey at `/explore/`
and preserves `/scenario/`. The historical [IP](ip.md) task bodies
and completion records remain unchanged. Its existing core tests and
scientific contracts still apply.

**Second increment, 2026-11-04.** The owner restored sample inputs
(D-37), accepted the delegated same-tab continuity rule (D-38), set
the publication path and paused `/scenario/` (D-39), kept the §5
copy baseline, and requested width log-scale parity.
[Guided DDD §9](guided-journey-ddd.md#9-second-increment-d-37d-39-2026-11-04)
specifies the increment; tasks G-08–G-12 below execute it. G-01–G-07
and their evidence stand unchanged. The owner accepted this
increment's documents in `adf8fed` (2026-11-04) and granted
autonomous execution — commit, push, pull requests, and merges —
recorded under [Commands](#commands).

Execute the following tasks in order. Parallel work is allowed only
after the preceding contract exists and file ownership is disjoint.
All design comes from the [guided DDD](guided-journey-ddd.md), which
supersedes legacy interaction design only for the new page.

| Task | Prerequisite | Exact work and authority | Completion |
| --- | --- | --- | --- |
| G-01 | Owner approval/delegation | Save the approved refinement source and standalone HTML; update PDD and prototype record; record candidate scope; add ADR-0020 and HLD reference. | Product authority, scope and separate route are explicit; links resolve. |
| G-02 | G-01 | Implement `explore/state.ts` and `compute.ts` exactly to DDD §§2–4; add state and computation tests. | Required selections, decimal limits, mode preservation, snapshots, stage filtering and real calculations pass tests. |
| G-03 | G-02 interfaces fixed | Implement `app.ts`, `main.ts`, `explore.css` to DDD §§3–7 and saved prototypes. | Complete five-step journey, actual charts/statistics/downloads, draft/confirmed separation, notices, supporting links and errors. |
| G-04 | G-01 and DDD §1 | Add isolated build outputs, generated include and `/explore/` page; reuse pinned data URLs; extend preview staging checks. | Both pages build with correct scoped assets, versions and data URLs. |
| G-05 | G-02–G-04 | Run DDD §8 checks, inspect UI through CUA, fix observed defects, and update execution evidence below. | Working candidate plus truthful verification and remaining limitations. |
| G-06 | G-05; owner walkthrough, 2026-11-04 | Apply readable typography in DDD §5 and floating glossary help in §6; preserve existing disclosures and scientific behavior. | Typecheck and strict builds pass; mouse, keyboard, dismissal, viewport fit and unchanged draft are verified; record evidence. |
| G-07 | G-06; PDD D-36 | Implement the prominent refinement disclosure, selected Choice cards, and optional results walkthrough exactly to guided DDD §§5.1–5.2 in `app.ts` and `explore.css`. | Verify five-stop navigation, measurement cards, chart choices, exit/focus, draft isolation, empty-type review, discard, confirmation, empty results, and 320/1024 px layouts. Typecheck and strict builds pass; record actual evidence. |
| G-08 | G-01; PDD D-39 | Move `explore.md` and `assets/explore/` out of `draft_docs`, keep `not_in_nav` and the search exclusion, and extend `site_checks.py` and its tests to hold the unlisted invariants in the publication tree, exactly to guided DDD §9.4. No deployment. | Both strict builds pass with the page published unlisted — no nav, sitemap, or search entry — and hook tests cover it; `/scenario/` bundles stay byte-identical; evidence recorded. |
| G-09 | G-02 interfaces; PDD D-37 | Implement `sampleDraft` and the introduction's sample action, inline replacement confirmation, and site-conditions status line exactly to guided DDD §9.1, with state tests. | Fresh fill, both ask-before-replace outcomes, sample labeling, the deliberate 30° coverage warning, and untouched confirmed results verified; typecheck, tests, and builds pass; evidence recorded. |
| G-10 | G-09 (shared files); PDD D-38 | Implement `session.ts` and the restore flow, the copy updates in `app.ts` and `explore.md`, and the §7 `pageshow` amendment exactly to guided DDD §9.2, with session tests. | Same-tab reload and back/forward restore the draft, confirmed settings, step, and display with the visible notice; invalid or mismatched records require the explicit fresh start; storage failure keeps the fresh behavior and wording; results recompute and are never stored; tests and builds pass; evidence recorded. |
| G-11 | G-10 (shared files) | Implement the width log-scale offer exactly to guided DDD §9.3, reusing the registry texts and shared chart builders. | The toggle appears exactly when the log histogram exists, switches bins, caption, and note, reports the off-adjustment, never dirties the draft, and persists with display choices; tests and builds pass; evidence recorded. |
| G-12 | Main-plan T-60 lane (implemented); G-08–G-11 | Implement the guided browser specs of guided DDD §9.5 inside the T-60 lane, running against the strict preview build; extend the mobile project's spec filter to the guided spec files. | All eleven guided specs pass in the lane's desktop and mobile projects, the race and continuity specs included; physical-touch and cross-engine coverage recorded as outstanding; evidence recorded. |

G-08 is independent of the application tasks. G-09–G-11 share
`app.ts` and `state.ts` and run in order. The main plan's T-60
browser lane is already implemented on `dev-v.0.4.x`, so G-12 has
no missing prerequisite beyond G-08–G-11; its specs join the
lane's desktop and mobile projects. The owner reruns the T-54
unlisted deployment after G-08 lands. Nothing from the
[next phase](#next-phase-owner-instruction-2026-11-04) joins this
kickoff.

### G-07 browser verification

Use the current pinned data and a confirmed scenario with 30° fault
dip, 5 m depth, Dense sediment, Uniform Strong material, and 0–5 m
slip. Keep its matching-record count as the comparison baseline.

1. In normal results, verify that the full-width refinement entry
   opens both existing editors and reports expanded state. Close it.
   Begin the walkthrough: height is first and Back is disabled.
2. Advance to width, choose Cumulative, and Browse freely. Width and
   its chart choice remain selected; no pending scenario is created.
   Restart the guide; it starts at height. Visit all five stops and
   check labels, progress, focus, and only one set of editor inputs.
3. At Simulation stages, select Last stage. At Scarp types, clear
   every type. The confirmed count remains the baseline. Review
   changes ends the guide, blocks review, opens normal refinements,
   and focuses scarp Select all with its validation message.
4. Select all types, review, and verify the last-stage draft summary.
   Show results applies it and returns to normal browsing. Restart
   the guide without edits; the last action is Finish walkthrough.
   Finishing retains the current measurement and opens refinements.
5. Make an unapplied editor change, Browse freely, and verify both
   the draft and pending notice remain. Discard restores confirmed
   choices. Repeat Discard while inside an editor stop; the guide
   ends and normal refinements stay open. A main-step edit followed
   by Back to results returns to normal browsing too.
6. Confirm a no-match scenario (the checked `data-v1` gap is
   0.01–0.02 m slip with the same site). Walk through all stops;
   measurement stops retain no-match messaging without fabricated
   charts, and both refinement editors remain usable.
7. Check normal controls, guide navigation, and both editor stops
   at 320 px and 1,024 px. Check keyboard focus after Next, Back,
   Browse freely, and failed review. Start a new scenario and reload
   to verify that guide state does not survive either reset.

## Commands

Use Gradle from the repository root so Node and the test environment
match the repository's pinned toolchain:

```sh
python3 .github/scripts/check_doc_links.py
python3 .github/scripts/check_pdd_agreement.py
python3 .github/scripts/check_traceability.py
./gradlew :subprojects:webapp:check :subprojects:webapp:webappBundle
./gradlew :subprojects:mkdocs:mkdocsBuild \
  :subprojects:mkdocs:mkdocsPreview
```

The preview includes both unadvertised routes; the publication
build retains the draft boundary until G-08 lands. Do not deploy;
deployments stay the owner's manual workflow runs.

**Owner grant, 2026-11-04.** For this increment the implementing
agent works autonomously: it stages, commits, pushes, opens, and
merges its own pull requests into `dev-v.0.4.x` without per-task
owner approval. The grant covers tasks G-08–G-12 and the
doc-bearing evidence and ledger updates those tasks carry. The
owner merges `dev-v.0.4.1-redesign` into `dev-v.0.4.x` and pushes
it before the kickoff, so task branches start from the accepted
candidate beside the implemented T-54 deployment and T-60 lane.
The main contract's merge conditions still hold — CI green,
independent review passed, no open owner question, branch current
with `dev-v.0.4.x` — and everything outside this grant keeps the
main plan's rules.

**Renewal, 2026-11-04.** The owner renewed the grant on the same
terms for the released next-phase tasks G-14–G-17
([Next phase](#next-phase-owner-instruction-2026-11-04)).

**Renewal extension, 2026-11-04.** The owner extended the same
terms to the rework tasks G-18 and G-19
([Next phase](#next-phase-owner-instruction-2026-11-04)).

**Renewal extension, 2026-11-05.** The same terms cover the audit
tasks G-20 and G-21
([Next phase](#next-phase-owner-instruction-2026-11-04)).

**Renewal extension, 2026-11-05 (deployed-build review).** The
same terms cover G-22 and G-23
([Next phase](#next-phase-owner-instruction-2026-11-04)).

**Renewal extension, 2026-11-05 (result report).** The same terms
cover G-13
([Next phase](#next-phase-owner-instruction-2026-11-04)).

## Next phase (owner instruction, 2026-11-04)

The owner queued every deliberate deferral as the phase after this
increment ([PDD D-41](pdd.md#1-decision-register)). Team
availability schedules it; it may run before the team
demonstration. Advertising still follows D-39. Nothing below
joined the second increment's kickoff: each item first needs its
guided DDD section and, where named, a product decision, accepted
the ordinary way.
G-14 and G-15 arrive with guided DDD §10 and PDD D-42 drafted
2026-11-04; the commit that carries them is their acceptance.
G-16 and G-17 record the external review's defects of 2026-11-04
against §§9.2–9.3 behavior; the owner schedules any earlier run.

**Owner release, 2026-11-04.** The owner released G-14–G-17 for
execution ahead of the rest of the phase and handed the run to the
implementing session. This instruction is the ask to create task
branches, push them, and open pull requests against `dev-v.0.4.x`,
and the [Commands](#commands) renewal covers their merges. Story
texts under CR-10 (G-15) go to the owner for approval before that
merge. The queue's other items stay queued; advertising still
follows D-39.

**Owner release, 2026-11-04 (rework).** Reviewing the built
samples, the owner decided D-43 and released G-18 and G-19 on the
first release's terms; the [Commands](#commands) renewal extension
covers their merges. Exact chooser, notice, trigger, and
annotation strings go to the owner for approval before the
affected merges.

**Owner revision, 2026-11-05 (external review).** Before the G-18
merge the owner adopted a relayed external review: PDD D-44 and
guided DDD §10.5 revise the presentation, and the G-18 and G-19
rows above are rewritten to match. The release terms are
unchanged.

**Owner release, 2026-11-05 (audit).** The owner adopted the
second external audit as PDD D-45 and released G-20 and G-21 on
the standing terms, sequenced after G-19; the
[Commands](#commands) extension covers their merges. D-46 stays
proposed with the research group; nothing in this release changes
the §10.5 rework.

**Owner release, 2026-11-05 (deployed-build review).** Reviewing
the morning deployment with a third external review, the owner
adopted PDD D-47 and released G-22 and G-23 on the standing
terms, sequenced after G-21; the [Commands](#commands) extension
covers their merges. The Back to top control leaves the guided
page, the step list stays a sequence indicator, and audit entry
16 is adopted. Nothing else leaves the queue.

**Owner release, 2026-11-05 (result report).** After accepting
PDD D-48 and guided DDD §13 in `b2ef316`, the owner released
G-13 for execution, first in the P1.5 band and ahead of the rest
of the queue; the [Commands](#commands) renewal extension covers
its merge. The §13.7 strings go to the owner for approval before
the merge, and the owner's Word-open check joins the completion
evidence. Nothing else leaves the queue.

**Owner release, 2026-11-06 (range controls; decided caveat
text).** On the sponsor's ask relayed 2026-11-06 and the research
group's matching request in Kristen Chiama's review of the same
date, the owner adopted PDD D-50 and guided DDD §14 and released
G-24 on the standing terms, sequenced after the P1.5 band. The
same review's question-4 answer decided D-4, and G-25 adopts the
decided §5.9 text through the guided overlay; it is file-disjoint
from the band and may run beside it. The [Commands](#commands)
renewal extension covers their merges. Exact §14 strings go to
the owner for approval before the G-24 merge. Nothing else leaves
the queue; the owner's commit of this paragraph is the release.

**Owner directive, 2026-11-06 (SME wording).** Reviewing the
recorded answers, the owner directed that reader-facing wording
follow the research group's supplied texts — they are the
subject-matter experts. PDD D-51 and guided DDD §15 record the
adopted strings; G-26 implements them on the standing terms,
sequenced after G-25 and before G-24 (shared files). PRD CR-3's
spelling is amended the same day. Strings §15 marks assembled go
to the research group for sight with the next briefing round;
the owner's commit of this paragraph is the release.

**Owner decision, 2026-11-06 (D-14; the band completes its
plan).** The owner decided D-14 — the chart-export provenance
format — by adopting PDD §6.3's proposed strip-and-sidecar
format; PDD §6.3 carries the dated record and guided DDD §16 the
design. G-27 implements it, released on the standing terms,
second in the D-48 band: after G-26 and before G-24, whose row
already yields to a band row. The strip carries the displayed
panel's active caveats under §5.4's everywhere-rule and CR-8;
the sidecar follows the G-25 overlay rule. Exact strings go to
the owner before the merge; the owner's commit of this paragraph
is the release.

**Owner decision, 2026-11-08 (export licences).** The owner set
the DEM-derived data exports to ODC-By 1.0, as that licence's
section 4.2(a) requires, keeping CC BY 4.0 with the ODC-By notice
for charts, images, reports, and pages (ADR-0017 amendment of the
same date). G-28 adds the notices, released on the standing terms
and due before the release vintage (T-63); its change to the shared
download texts and the `/scenario/` bundle is the one D-39
byte-identity exception. Exact strings go to the owner before the
merge; the owner's commit of this paragraph is the release.

**Owner decision, 2026-11-08 (the explorer in the sidebar).** The
owner directed that `/explore/` — not `/scenario/` — be linked from
the site navigation ahead of the release (PDD D-52; ADR-0017
amendment of the same date). G-29 implements it on the standing
terms, after T-59 and ahead of G-28. Its merge may land on
`dev-v.0.4.x`; by G-5, no deploy carries the listed page until the
D-10 text replaces the placeholder in its disclaimer. Exact strings
go to the owner before the merge; the owner's commit of this
paragraph is the release.

**Owner decisions, 2026-11-09 (licence lines; a README).** The
owner accepted G-28's placement: the licence lines close
`provenance.txt` as a tenth block (PDD §6.1, DDD §5.9), which
replaces "the ZIP's readme" in G-28's row below, and
`statistics.csv` carries ODC-By 1.0 with `records.csv`. The owner
also asked for a README in the download, saying what each file is
and what its columns mean. G-30 adds it on the guided page only, on
the standing terms, after G-28 and before the release's text
approval (OA-4). Its column meanings are assembled text for the
research group's sight (D-51). Exact strings go to the owner before
the merge; the owner's commit of this paragraph is the release.

**Owner decision, 2026-11-11 (JDK 21 in CI).** GitHub's move of
`ubuntu-latest` to Ubuntu 26.04 brought JDK 25, on which the Gradle
8.10.2 wrapper does not start, so every job that runs Gradle failed —
pull requests and the owner's manual deploy alike; G-30's pull
request was the first to show it. The owner chose to install JDK 21
in those jobs now, before moving to another development machine,
over upgrading Gradle (DDD §6.3, JDK for the Gradle jobs). G-31
implements it on the standing terms, begun on the owner's words of
the same day ("Yes, fix it here now"); G-30 merges after it. The
owner's commit of this paragraph is the release.

**Owner decision, 2026-11-12 (the explorer on the home page).** The home
page describes only the dashboards, and the first try-out of
`docs/testing/acceptance-try-outs.md` expects a tester to find the
explorer from it. The owner decided to add one sentence and a link
introducing the explorer to the home page's body text (PDD D-54). The
sentence is assembled from the citation description's explorer paragraph
(`CITATION.cff`, owner-approved) and is marked assembled under D-51
and routed for the research group's sight with the OA-4 sign-off
package. Exact strings go to the owner before the merge; the owner's
commit of this paragraph is the release.

| Task | Prerequisite | Exact work and authority | Completion |
| --- | --- | --- | --- |
| G-13 | Released 2026-11-05; guided DDD §13; PDD D-40 (P1.5 by D-48, release-blocking in v0.4, first in the band) and D-14 | Implement the result report exactly to guided DDD §13: `report.docx` composed beside the shared `packageTexts` and written by the shared `zip` writer into the FR-D1 download ZIP, the hint updated, no new control; document content, fixed chart set, `.docx` assembly, failure fallback, checker amendment, and strings per §§13.1–13.7 and [PDD §6.5](pdd.md#65-result-report-d-40-p2). | `report.docx` verified in the lane (outer members, nested parts, one image per non-suppressed chart, captions asserted); zipcheck covers the guided layout; Node tests cover the assembly and the failure fallback; the `/scenario/` bundles stay byte-identical; the owner's Word-open check is recorded in the evidence; the §6.1 content rules and D-14 caption fields apply unchanged. |
| G-14 | Next phase; PDD D-42; guided DDD §10.1 | Replace the introduction's single sample action with the chooser; add the Kern builder — fault angles 60° and 70°, offset 1.3 m, completion values delegated and named in the evidence — validated against the manifest like §9.1's; name the chosen sample in the status line; parameterize the §9.5 sample spec over both samples, each option keeping its identity through the ask-before-replace flow; verify the 60–70° offset coverage and record the observed state. | Guided DDD §10.1 holds for both samples; D-37's confirm-replace flow is unchanged; the specs pass in the lane's desktop and mobile projects. |
| G-15 | Next phase; G-14; PDD D-42; guided DDD §10.2 | Add the **About this sample** disclosures: the illustrative story anchored to Chi-Chi scale as the figures page frames it; the Kern story at the site's M 7.36 with the Buwalda & St. Amand digitisation and the future field-overlay tie-in; up to two images each, published as project images per guided DDD §10.2, with alt text and visible credits; per-file license verification (public domain or CC BY / CC BY-SA) with source URL, author, license, and date recorded in the evidence. | Disclosures render per guided DDD §10.2 after either fill; CR-10 approval of the story texts is recorded; the licensing evidence is complete; a spec covers the disclosure. |
| G-16 | Next phase; guided DDD §9.2 | Release the restoration's busy state as soon as navigation or a superseding action invalidates a pending restore, instead of only after its conversion fetch settles — today a stalled restore disables Show results even for a slip-mode draft that needs no conversion data (`src/explore/app.ts`, `restoreResults`); the late continuation still leaves every shared flag alone. Extend the §9.5 continuity spec with the stalled-restore cancellation. | Show results enables as soon as the reader supersedes a pending restore; §9.2 restore outcomes unchanged; specs pass in the lane's desktop and mobile projects. |
| G-17 | Next phase; guided DDD §9.3 | Clear the width log-scale-off notice consistently around downloads: after a zero-slip confirmation turns the log scale off, a successful download leaves the dismissed notice's element visible (`src/explore/app.ts`, `download`). Align the flag and the element, and cover log-on, zero-slip confirmation, then download in the §9.5 width spec. | The notice clears wherever its flag does; download contents unchanged; specs pass in the lane's desktop and mobile projects. |
| G-18 | Released 2026-11-04; PDD D-43, D-44; guided DDD §§10.3, 10.5 | Rework the sample interaction: the **Try a prefilled sample** card-preview dialog (preview without draft change; Use this sample; the modal replacement question as the dialog's next step); the prefill notice with its Started from · Modified form; the sequential footer after a fill; both-mode prefills (Kern 1.6–1.9 m as Bawden 2001's two patch estimates used as an example band; illustrative 3–5 m delegated, named in the evidence) with the mode-switch note; extend the §9.5 specs accordingly. Final strings to the owner before merge. | Guided DDD §§10.3 and 10.5 behaviors hold; D-27/D-30 draft boundaries unchanged; specs pass in the lane's desktop and mobile projects. |
| G-19 | Released 2026-11-04; G-18; PDD D-43, D-44; guided DDD §§10.4, 10.5 | The **Why these sample values?** trigger (helper: Background, photos and sources) following the notice's lifetime; per-field annotations updating or clearing with their values; the CR-10 story edit to the shared sentence; the card previews share the §10.2 story material. Annotation, trigger, and revised story strings to the owner for approval before merge. | Guided DDD §§10.4 and 10.5 hold; the §10.2 licensing evidence stays valid; specs cover preview content, trigger, and annotations in both lane projects. |
| G-20 | Released 2026-11-05; after G-19; PDD D-45; guided DDD §§11.1–11.2 | Apply the audit's wording table across the guided page and shared components (D-39 boundary: no `/scenario/`-only file); the results-screen rework with **View full scenario**; the walkthrough label; help disclosures that add information; the Scarp dip provisional mark; physical density ordering; update the specs asserting old strings. The normalization explanation and the ZIP contents description go to the owner before merge. | Guided DDD §§11.1–11.2 hold; audit entries addressed or recorded as declined in the evidence; specs pass in the lane's desktop and mobile projects. |
| G-21 | Released 2026-11-05; after G-19; PDD D-45; guided DDD §11.3 | Fix the disclosure icon overlap everywhere the pattern appears; make the first-calculation failure message claim only what exists; reconcile the version-mismatch message with its control; resolve the recurring `.md-top` axe contrast report per §11.3 (owner addition, 2026-11-05); extend the §9.5 specs. | Guided DDD §11.3 holds; the defects verified fixed or determined in both lane projects; the evidence records the before and after. |
| G-22 | Released 2026-11-05; after G-21; PDD D-47; guided DDD §§12.1–12.2 | Keep progression enabled with the Still-needed line near each forward button; on an unsuccessful click render the visible focused summary linking each unfinished group, replacing the Select-all focus jump; emphasize the group boundary, ending per-checkbox outlines and invalid marks; render unreached steps, and Results before results exist, as non-interactive entries rather than disabled buttons; return Start a new scenario to the opening step; extend the §9.5 specs. Final strings to the owner before merge. | Guided DDD §§12.1–12.2 hold; specs pass in the lane's desktop and mobile projects; the evidence records the strings' approval. |
| G-23 | Released 2026-11-05; after G-22; PDD D-47; guided DDD §§12.3–12.7 | Remove the theme's Back to top control from the guided page only; keep the sample dialog's actions in a persistent footer while the preview scrolls; mark both slip endpoints Required; give sample explanations the neutral treatment, keeping caution styling for coverage and interpretation warnings; reword the mode-switch note per §12.7; extend the §9.5 specs. | Guided DDD §§12.3–12.7 hold; specs pass in the lane's desktop and mobile projects; the evidence records each fix's before and after. |
| G-24 | Released 2026-11-06; after the P1.5 band (G-13 done; a band row the owner adds later precedes it); PDD D-50; guided DDD §14 | Replace the Fault angle and Sediment depth checkbox groups with §14's paired-thumb range controls: modeled-stop-only thumbs over the manifest values, the labeled scale row, the selection echo with count, clamping, per-stop keyboard movement; sets stay the state — thumbs render the extremes, a move materializes the contiguous modeled range, restored gapped sets stay verbatim until a move, samples render at their extremes; Select all leaves the two groups for the **Full range** action and its "If unknown, keep the full range." hint; explore-only files (`app.ts`, `state.ts`, `explore.css`), state tests, and §9.5 spec updates per §14.5. Final strings to the owner before merge. | Guided DDD §14 holds; no position between modeled stops is selectable and the echo lists modeled values (FR-S1, FR-S3); specs pass in the lane's desktop and mobile projects; `/scenario/` bundles stay byte-identical; the evidence records the strings' approval. |
| G-25 | Released 2026-11-06; file-disjoint from the band, may run beside it; PDD D-4 (Decided 2026-11-06); PDD §5.9 | Adopt the decided low-slip caveat text in the guided copy overlay (`pdd5.9.lowSlipCaveat`), replacing the D-45 variant; the report's Provenance lines render through the guided overlay so the report carries it too (interpretation (l) narrowed — the G-13 evidence note of 2026-11-06); update the specs asserting the old wording. The registry baseline keeps its bytes per PDD §3.7's supersession pattern — no `/scenario/`-served file changes. | The guided page and `report.docx` show §5.9's decided text; specs pass in the lane's desktop and mobile projects; `/scenario/` bundles stay byte-identical. |
| G-26 | Released 2026-11-06; after G-25, before G-24 (shared explore files); PDD D-51; guided DDD §15 | Implement the SME wording adoption exactly to §15: the step renames (Geological site conditions; Fault slip) across the stepper, headings, buttons, and review blocks; the amended introduction and the static landing text; the site-condition hints with the if-unknown lines; the fault-slip help with the dip-slip and 0.3 m/s sentences; the small-count reframe through the overlay; pressure ridge and additional uplift in place of raised ridge; the unhyphenated Deformation zone width on guided surfaces and the overlay label; the D-46 negative-height note on the scarp-height panel and in the report; the MkDocs glossary definition updates (anchors unchanged) and the dashboard page's term fix; update the §9.5 specs asserting old strings. The assembled strings are listed in the pull request for the group's sight. | Guided DDD §15 holds; specs pass in the lane's desktop and mobile projects; `/scenario/` bundles stay byte-identical; the evidence lists the assembled strings sent for the group's sight. |
| G-27 | Released 2026-11-06; second in the D-48 band — after G-26, before G-24 (shared explore files); PDD D-14 (Decided 2026-11-06), PDD §6.3, D-48; guided DDD §16 | Implement the chart-image export exactly to §16: the per-card **Download this chart (PNG)** action for confirmed results; the displayed chart rendered by the §13.4 rasterizer with the D-14 caption strip beneath — product and page name, measurement with unit and chart kind, the §13.2 scenario summary line, the count line in the page's wording, the §6.2 version stamps, the citation line, the §4.1 accuracy statement on cumulative images, and the displayed panel's active caveats as single lines; the sidecar provenance file rendered through the guided overlay (the G-25 rule), shared `packageTexts` untouched; the §13.1-style busy flag; naming per §16.4; Node tests and §9.5 specs per §16.5. Final strings to the owner before merge. | Guided DDD §16 holds; FR-D2's identification fields verified on the strip; specs pass in the lane's desktop and mobile projects; `/scenario/` bundles stay byte-identical; the evidence records the strings' approval. |
| G-28 | Released 2026-11-08 (ADR-0017, amendment of the same date); runs before the release vintage (T-63) | Add the notices the licences ask for (ADR-0017 amendment of 2026-11-08; the notice text in `data/REDISTRIBUTION.md`): on the guided page, the `/scenario/` page, and the dashboard pages, the ODC-By 1.0 notice associated with the charts, with the licence link; in the scenario download ZIP's readme (both pages), the ODC-By 1.0 URL and notice for `records.csv` and CC BY 4.0 for the charts and the report; in `report.docx`'s Provenance section and the G-27 chart strip, the same notice. Licence compliance is product-wide, so this task's changes to the shared download texts and the `/scenario/` bundle are expected — the one D-39 byte-identity exception, recorded here. Final strings to the owner before merge. | Every DEM-derived database leaves with the ODC-By 1.0 URL and notice; every produced work carries the notice; specs and the zip checker cover the readme, the report, and the chart strip; the evidence lists each surface and its notice. |
| G-29 | Released 2026-11-08 (PDD D-52); after T-59, ahead of G-28 | List `/explore/` in the site navigation (PDD D-52): in `mkdocs.yml`, the nav entry `Ground Rupture Explorer: explore.md` after Dashboards and before Data, and `explore.md` out of `not_in_nav` (`scenario.md` stays); `explore.md`'s search exclusion removed (`hide: toc` stays); site-checks arm (d) and its tests updated — `/explore/` listed and in the sitemap and search index, `/scenario/` still unlisted with no listed page linking it — so `/explore/`'s links into `/scenario/` change: the results footer's Full disclaimer link points to the page's own `#gre-explore-disclaimer` block, and the links to the existing explorer are removed or reworded without a link; update the specs asserting them. Final strings to the owner before merge. | The strict builds and the hook pass with `/explore/` listed and `/scenario/` unlisted; no listed page links `/scenario/`; specs pass in the lane's desktop and mobile projects; the `/scenario/` bundles stay byte-identical; the evidence records that the listed page's deploy waits on G-5 (the D-10 text). |
| G-30 | Released 2026-11-09 (the owner's decision of that date); after G-28, before the OA-4 text record | Add a `README.txt` member to the guided page's download ZIP, composed beside the shared `packageTexts` as `report.docx` is (G-13), so the shared download code and the `/scenario/` package do not change: what the package is, one line per member saying what it holds, the meaning and unit of each `records.csv` and `statistics.csv` column in the glossary's and the page's own wording (D-51; assembled lines marked for the research group's sight), and a pointer to `provenance.txt` for the citation, the caveats, and the licences. Plain UTF-8 text with LF line ends, first in the archive; the zip checker's guided layout, the download hint if it names the members, and the specs updated. Final strings to the owner before merge. | The guided ZIP opens with `README.txt` naming every member and every CSV column; zipcheck covers the guided layout; specs pass in the lane's desktop and mobile projects; `/scenario/` bundles stay byte-identical; the evidence lists the assembled lines sent for the group's sight and records the strings' approval. |
| G-31 | Released 2026-11-11 (the owner's decision of that date); before G-30's merge | Install JDK 21 for the Gradle jobs (DDD §6.3, JDK for the Gradle jobs): in `.github/workflows/tests.yml` (`webapp-test`) and `.github/workflows/mkdocs.yml` (`webapp-bundle`, `build`), add an `actions/setup-java` step — distribution Temurin, Java 21 — before each job's first Gradle step. Nothing else changes: `runs-on: ubuntu-latest`, the 8.10.2 wrapper, and every other step stay; `docs/setup.md` may note that CI installs JDK 21. | A green run's log shows each of the three jobs starting Gradle on Java 21 on the current `ubuntu-latest` image; CI is green on the pull request and on `dev-v.0.4.x` after the merge; G-30's pull request (#96) then passes CI and merges; the `/scenario/` bundles stay byte-identical; the evidence quotes the Java and image lines. |
| G-32 | Released 2026-11-12 (PDD D-54); after G-31 | Introduce the explorer on the home page: in `subprojects/mkdocs/docs/index.md`, one sentence with the `explore.md` link as its own paragraph directly after the dashboard cards `</div>`, assembled from the `CITATION.cff` explorer paragraph (D-51; the assembled line marked for the research group's sight): "And the **Ground Rupture Explorer** lets you choose modeled geological conditions and a range of fault slip, then examine the corresponding results from the same simulations." — "Ground Rupture Explorer" carrying the `explore.md` link. Nothing else on the page changes; final strings to the owner before merge. | The home page introduces the explorer and links `explore.md`; the strict builds and the site checks hook pass; the `/scenario/` bundles stay byte-identical; the evidence records the assembled wording routed for the group's sight. |

Queued definitions and decisions, with their authorities:

- the field-overlay decision for the guided page
  ([PDD §4.4](pdd.md#44-field-overlay-fr-o5-d-18-proposed));
- the family-view offer on the guided page (D-13,
  [PDD §3.7](pdd.md#37-population-scarp-filter-family-view-reset));
- shared links restoring a guided scenario
  ([PDD §7.1](pdd.md#71-shared-links));
- recovery between visits beyond D-38
  ([PDD §7.3](pdd.md#73-reload-recovery-mvp));
- scenario import, excluded by the first-version scope
  ([PDD §2.3](pdd.md#23-user-journeys));
- the entry-point re-pointing
  ([PDD §2.2](pdd.md#22-entry-point-d-2-decided-2026-10-28));
- budgets and measurement marks for the guided bundle and the
  quality bars ([PDD §9](pdd.md#9-product-quality-bars));
- acceptance walkthroughs re-pointed to the guided page
  ([PDD §10.3](pdd.md#103-acceptance-walkthroughs));
- touch and cross-engine browser coverage beyond G-12's lane;
- the paused `/scenario/` engineer-sandbox rework decision
  (D-39).

## Execution evidence

**Verification record, 2026-11-04.** G-01–G-05 were completed for the
bounded candidate in the working tree. This is a local implementation
candidate; it has not been deployed, committed, or accepted as the
public release.

The candidate added the isolated
[guided application](../../subprojects/webapp/src/explore/app.ts),
[state](../../subprojects/webapp/src/explore/state.ts),
[calculation orchestration](../../subprojects/webapp/src/explore/compute.ts),
[entry lifecycle](../../subprojects/webapp/src/explore/main.ts), and
[stylesheet](../../subprojects/webapp/src/explore/explore.css).
The [page](../../subprojects/mkdocs/docs/explore.md), build outputs,
generated include, and staging checks preserve the separate routes.
The saved refinement example, PDD supplement, ADR-0020, and HLD
reference record their product and architectural authority.

At this verification:

- The pinned Node suite passed all 401 tests, including 25 new guided
  state and computation tests. Typechecking and both bundles passed.
- All 16 MkDocs hook fixtures passed.
- Strict publication and preview builds passed. The publication
  build preserved the draft boundary; the preview included both
  unadvertised routes.
- Real-data numerical parity produced zero differences against
  the existing scientific calculation pipeline.
- The existing scenario JavaScript and CSS bundles were identical
  to the baseline bundles.
- All 5,440 relative links across 57 Markdown files resolved. PDD
  agreement passed; traceability accepted 491 rows with zero gaps.
  Whitespace and new-document prose-width checks passed.
  A separate scan including the new, untracked design files resolved
  all 5,390 relative links across 34 Markdown files.

Manual browser checks at this verification covered the fresh journey,
required site selections, decimal and movement-mode validation, and
real-data calculation. With a 30° fault, 5 m depth, Dense sediment,
Uniform Strong material, all stages and all scarp types, the checked
scenario returned 1,200 records over 0–5 m slip. Its median scarp
height was 1.74 m and its 84th percentile was 2.67 m.
A separate 3 m offset scenario
with 30° and 40° faults, 5 m depth, Dense sediment, and Uniform Strong
material returned 2,304 records and a 2.76 m read-off at the 84th
percentile. These are observed checks, not recommended scenario
inputs or permanent data-release reference values.

The browser checks also confirmed that draft edits left the confirmed
result and downloaded ZIP unchanged, an empty scarp selection blocked
review, and last-stage selection returned 12 records in the checked
scenario. Zero-valid-height and no-match results, per-angle offset
coverage warnings, and distinct loading, unsupported-browser, and
data-version errors were exercised. Disposable page fixtures verified
explicit errors for missing gzip decompression and `replaceChildren`.
The latter check caught and verified a repair to the error renderer;
all disposable fixture pages were removed after verification.

All journey screens, results, and refinements fit a 320 px viewport
without horizontal overflow. At 1,024 px, the root measured 992 px
without overflow. ArrowRight retained focus on the newly selected
last-stage radio; Back to results preserved the draft; Edit refinements
focused the selected radio. Start a new scenario reset every site
selection and removed results. The existing `/scenario/` mounted and
displayed 346,834 records in a final browser smoke check.

Inspection of the built preview HTML verified all 13 linked glossary
anchors, six supporting pages, and the existing scenario's
`gre-disclaimer` anchor. This checked the destinations' existence;
it was not a separate browser-navigation test of each link.

**Remaining acceptance limits.** Cross-browser coverage, performance
acceptance, and a full accessibility audit were not completed. The
candidate has no cross-browser, performance, accessibility, or
research-group certification; the existing scientific-review gates
remain in force.

### Walkthrough refinements, 2026-11-04

G-06 was completed after the owner reported small text and missing
floating explanations. Guided body text now renders at 18 px in the
default site context, with 16 px controls, main explanations and
statistics, and 14 px compact captions. Sizes use `rem`; narrow
screens retain the same text sizes. The guided chart uses larger
labels and a shorter cumulative axis title that fits its geometry.

Thirteen glossary-derived definitions now support dotted-underlined
terms. One floating panel handles hover, focus, and click/tap pinning;
existing expandable explanations and glossary links remain available.
Browser checks verified click opening, second activation, outside-click
and Escape dismissal, keyboard focus after automatic scrolling, scroll
and resize dismissal, and unchanged scenario selections/results.
At 320 px the checked panel stayed within x=12–308 px; the larger
forms, results and refinements had no horizontal overflow. The 1,024 px
layout also fit. A real scenario still returned 1,200 records; result
and stage explanations left it unchanged. The enlarged cumulative-axis
title fit wholly within its chart.

Typechecking and both strict builds passed. The old scenario bundles
remained byte-identical. All thirteen definition source anchors exist
in the built glossary. Link, agreement, traceability and whitespace
checks passed. The scientific test suite was not rerun for these
presentation changes. Pointer-hover handlers were reviewed in source;
physical touch-device and cross-browser verification remain outstanding.

### Results controls and walkthrough, 2026-11-04

G-07 was completed after the owner selected Choice cards. The normal
results now show three named measurement cards with explanatory
questions and a visible Viewing marker. The full-width refinement
entry identifies its stage and scarp-type options. The optional
walkthrough visits the three measurements and then each refinement
editor, preserving the existing review and confirmation boundary.

At this verification, browser checks covered all five stops, disabled
Back at the start, keyboard activation, focus, and exit to the current
measurement. Width's Cumulative choice survived leaving the guide;
view changes alone did not create pending scenario edits. Stage edits
and an empty scarp draft retained the confirmed 1,200-record result.
Review blocked the empty selection, exited the guide, opened normal
refinements, and focused Select all. After restoring the types, Review
showed the pending last-stage choice; Show results applied it and
returned 12 records for the checked scenario. A clean walkthrough
offered Finish walkthrough and returned to normal refinements.

Browse freely retained pending refinements. Discard restored confirmed
choices both outside and inside an editor stop. Main-step navigation
ended the guide. Reload and Start a new scenario cleared it; the latter
also restored unanswered site choices and disabled Results. The
checked no-match slip range, 0.01–0.02 m, allowed all five stops without
fabricated charts. Empty width and dip views retained their scientific
notices after a review finding was repaired.

Normal cards, guide navigation, and both editors fit 320 px without
horizontal overflow; card questions remained 16 px. The 1,024 px
layout fit three equal-width cards. A final layout check at the
preview's 706 px width showed all three cards in one row, each about
166 px tall. The guide heading remained 80 px below the viewport top
after navigation, clear of the fixed site header. Temporary viewport
overrides were removed after checking.

Pinned typechecking and both strict site builds passed. The final
assets were `explore-2d90789ca249.js` and
`explore-b86e68537c5b.css`. The legacy bundles remained byte-identical;
the preview/publication draft boundary remained intact. Agreement,
traceability, relative-link, and whitespace checks passed. The
scientific suite was not rerun for these presentation changes.
Pending offset-review cancellation was checked in source; a delayed
network race was not forced in the browser. The broader acceptance
limits above remain in force. Changes remained uncommitted at that
verification; the owner then committed the candidate to
`dev-v.0.4.1-redesign` as `a570fbe` (2026-11-04).

### Unlisted publication, 2026-11-04 (G-08)

G-08 removed `explore.md` and `assets/explore/` from `draft_docs`
in `mkdocs.yml`, leaving `media/dev/`. Both `not_in_nav` lines and
the page's `search: exclude: true` front matter remain. Nothing was
deployed; the owner's manual Companion-site run deploys the page.

The first strict publication build after that change failed arm
(d): the guided page links to the unlisted `scenario.md`, and the
hook rejected a link to an unlisted page from any other built page.
Guided DDD §6 keeps that existing-explorer link, and D-39 defines
unlisted as no navigation, sitemap, or search entry. Review found
that this departed from the legacy DDD §6.1 wording, so G-08 put the
question to the owner rather than merging.

**Owner ruling, 2026-11-05.** The owner chose to amend legacy
[DDD §6.1](ddd.md#61-build-outputs-asset-paths-and-page-scaffold)
arm (d) and its phase-2 paragraph with a dated, narrow exemption:
links to an unlisted page are permitted only from pages that are
themselves published unlisted — today exactly `explore.md` →
`scenario.md`, per D-39 (comparison and field-overlay access) and
guided DDD §6. Arm (d) must still fail any link from an advertised
page to an unlisted one, and the hook tests must cover both sides.
The rule stays deliberately strict: when the D-39 reconciliation
advertises `/explore/`, arm (d) trips and forces the field-overlay
and linking decision, queued in the next phase. A legacy-DDD
amendment lies outside the standing grant's letter; this ruling
authorizes it for G-08 only. The owner then authorized the
autonomous merge.

The hook and the legacy DDD now carry that rule. In a publication
build that outputs `explore/index.html`, a new arm (d) finding also
requires the guided page to stay unlisted.

Fifteen new hook tests cover the guided page in the publication
tree: the allowed `explore` → `scenario` link; rejected links from
a listed page, including rendered navigation, to either unlisted
page; sitemap and search entries; the not-unlisted guard; the trip
on the existing-explorer link once `/explore/` is advertised;
sitemap removal; arm (f) under `on_post_build`; the preview's
unchanged coverage, drafts included; and the committed
configurations. All 31 hook tests passed. The allowed link and the
guard each fail against the base hook.

At this verification:

- Strict publication and preview builds passed. The publication
  tree contained `explore/index.html`, `explore-2d90789ca249.js`,
  and `explore-b86e68537c5b.css`. Neither `sitemap.xml` (10
  entries), `sitemap.xml.gz`, nor the search index named
  `explore/`, and no built page other than `explore/` itself
  linked to it. The preview kept its sitemap entry, as before.
- The `/scenario/` bundles `app-26490347afd0.js` and
  `app-08bebc049c15.css` matched the pre-change baseline SHA-256s.
- The pinned Node suite passed all 401 tests; typechecking and the
  bundle passed. 5,498 relative links in 61 Markdown files
  resolved; PDD agreement passed; traceability linted 491 rows
  with no gaps.

Apart from `sitemap.xml` and `sitemap.xml.gz`, every file of the
publication tree was byte-identical to the preview's. No browser
visit to the publication build was made. The deployed page
and its unlisted state are verified only when the owner reruns T-54.

The T-60 lane, run as T-54's pre-deployment check, gave 151 passed,
5 skipped, and 1 failed: `axe: the failure states` reported a
serious `color-contrast` violation on `.md-top` in the existing
explorer's incompatible-settings decision. It failed identically on
the unchanged base `7581b80`, where T-54 had recorded 152 passes,
so G-08 did not cause it. It is a legacy-page spec outside this
increment, reported to the owner as a T-54 rerun item rather than a
G-08 question.

### Sample inputs, 2026-11-04 (G-09)

G-09 added `sampleDraft` to the guided state. It fills 30° and 40°
fault angles, 5 m depth, Dense density, and the Uniform: Strong and
Layered: Strong pairs, all taken from the manifest dictionaries,
with offset mode and a 3 m maximum. Slip entries, population, and
scarp types keep their fresh defaults. A missing member throws
rather than shrinking the sample. The existing sediment-group
labeling moved from `app.ts` into `state.ts` unchanged, so the
sample and the page name sediment the same way.

The introduction offers **Try sample inputs** beside **Build your
scenario**, with `Sample inputs, not recommended site values.` A
fresh, unconfirmed draft fills silently and opens Site conditions.
Otherwise the introduction actions give way to an inline question,
`Replace your current choices with the sample inputs?`, focused,
with **Use the sample** and **Keep my choices**. The status line
`These are sample inputs, not recommended site values. Change
anything.` (`role="status"`) appears on Site conditions after a fill
and clears when the reader leaves that step.

Three new state tests cover completeness, validity against the
fixture manifest, canonical ordering, independent copies, the fresh
slip entries and refinements, and each missing member.

At this verification, after rebasing onto the merged G-08:

- The pinned Node suite passed all 404 tests; typechecking and the
  bundles passed. Strict publication and preview builds passed
  with `explore-57b0e14797fe.js` and `explore-ea4ea319bbbd.css`.
  The `/scenario/` bundles `app-26490347afd0.js` and
  `app-08bebc049c15.css` were unchanged. All 31 hook tests passed.
- 5,498 relative links in 61 Markdown files resolved; PDD
  agreement passed; traceability linted 491 rows with no gaps.

A disposable Playwright script drove the strict preview build with
the pinned data at 1,024 px and 320 px; 35 checks passed and the
script was not committed. They covered:

- the fresh fill, its six site selections, offset mode with 3 m,
  and the status line, cleared on leaving Site;
- the deliberate coverage warning at 30° only on the movement step
  and review (coverage up to about 2.51 m). The confirmed sample
  returned 2,880 matching records;
- with a confirmed scenario, the focused inline question; Keep my
  choices restoring the actions and focusing the trigger;
- Use the sample after slip-mode and last-stage edits, which
  restored offset mode, 3 m, fresh slip entries, and all stages,
  leaving the confirmed count unchanged;
- a confirmed 30-record last-stage scenario, unchanged after a fill
  that raised the pending banner, with the walkthrough off on
  return;
- an edited, unconfirmed draft asking first, with Keep my choices
  leaving it;
- no browser dialog, no page error, and no horizontal overflow at
  320 px, where the status line renders at 16 px.

Screen-reader announcement of the inserted status line, touch, and
other engines were not checked; G-12 adds the committed spec.

### Same-tab continuity, 2026-11-04 (G-10)

G-10 added `session.ts`: the version-1 record of the draft, the
confirmed settings, the step, and the display choices, stored under
`gre-explore-session` in the tab's session storage. Every storage
access is guarded. Results, `RenderInput`, counts, stamps other than
`dataVersion`, and the walkthrough index are never stored.
`classifySession` checks a loaded record against the served data
version and validates the confirmed draft with `validateDraft`.
A working draft only needs the §2 structure.

The page saves from its single render path. Typing, percentile, and
disclosure changes, which update without a full render, call the same
save directly. On mount, including the `pageshow` remount, a
restorable record restores the draft, display choices, refinement and
example disclosures, and step. Earlier steps count as reached, and
all steps do when a confirmation exists. A confirmation recomputes
through the ordinary pipeline, with the regression in offset mode.
`navigationVersion` cancellation applies, and a failure or
interruption offers **Retry restoring results** while Results stays
unavailable. `Restored the work in this tab.` (`role="status"`)
appears only after a restore completes, never for an untouched
introduction, and clears on the next navigation or edit. An unreadable or version-mismatched record
leaves the introduction with its explanation and only **Start a new
scenario**. The record stays untouched until that choice clears it.
Implementation choices where the DDD names no wording or control:

- the unreadable-case text `The work saved in this tab could not be
  read.`, with `Your earlier choices have not been restored.` added in
  both cases;
- the **Retry restoring results** control as the §7 retry affordance
  for a restore. A restore cancelled by navigation stays recoverable
  and reports `Restoring the results was interrupted.`;
- `Recalculating the results of your confirmed scenario…` while busy.

Unavailable storage, or a failed save, keeps the first-version
behavior and wording. A failed save also clears any older record, so
a reload starts fresh as that wording says. A reload on Review in
offset mode loads the conversion, as on Movement. The
introduction, supporting aside, and static fallback in `explore.md`
carry the new continuity sentence. No `beforeunload` prompt was
added.

Thirteen new session tests cover:

- round trips under the documented key, including an invalid working
  draft and an unconfirmed record;
- the serialized field set, with no result fields;
- tampered JSON, wrong record versions, and ten structural tamperings;
- the data-version mismatch and an invalid confirmed draft;
- a results step without a confirmation;
- absence, clearing, and throwing storage.

At this verification:

- The pinned Node suite passed all 417 tests; typechecking and the
  bundles passed. Strict publication and preview builds passed
  with `explore-61092bd8467a.js` and `explore-2c551385ec3a.css`. The
  `/scenario/` bundles were unchanged. All 31 hook tests passed.
- 5,498 relative links in 61 Markdown files resolved; PDD
  agreement passed; traceability linted 491 rows with no gaps.

A disposable Playwright script drove the strict preview build with
the pinned data. All 47 checks passed; the script was not committed.
An independent review found the untouched-introduction claim, the
stale record after a late save failure, and the missing Review
conversion; their repairs are included and checked.
They covered:

- the new intro and aside wording, with no notice on a first visit;
- a Site-step reload restoring selections with the notice, which
  the next edit cleared;
- a confirmed sample scenario (2,880 records) reloaded from the
  walkthrough's Width stop. The same count was recomputed in about
  50–65 ms, with Width, Cumulative, the 90th-percentile read-off,
  the chart-data and stage-example disclosures, the pending
  last-stage edit, and the confirmed all-stages population
  restored. The walkthrough restarted off, and the stored record
  held only its six fields;
- Back from the glossary in the same tab restoring the results
  with the notice;
- a new tab starting fresh;
- corrupt and version-mismatched records explained, offering only
  Start a new scenario, kept until that choice, and then replaced
  by the fresh Site state;
- a failed regression response leaving Results unavailable without
  a restore claim, and Retry restoring the count;
- a held regression response during navigation to Site: the stale
  restore applied nothing, and Retry kept the current step;
- a throwing `setItem` and an unavailable `sessionStorage`, each
  keeping the earlier wording, starting fresh after reload, and
  raising no page error;
- a save failing after three successful ones, which cleared the
  older record; the reload started fresh without a claim;
- a reload of an untouched introduction claiming nothing, and a
  Review-step reload in offset mode showing the conversion and its
  30° coverage warning;
- the blocked introduction at 320 px without horizontal overflow.

The Back navigation reported navigation type `back_forward`, a
reload rather than a Back/Forward-cache restoration. The
`persisted` `pageshow` remount was therefore reviewed in source but
not exercised. Touch and other engines were not checked; G-12 adds
the committed spec.

As the DDD designs it, the restore runs on any mount in the tab. A
return to `/explore/` in the same tab through a site link therefore
also restores, and the copy says the work stays in the tab. This is
recorded for the owner's awareness against the PDD's "later visit"
wording; no product decision was changed.

### Width log scale, 2026-11-04 (G-11)

G-11 offers the native checkbox `gx-dzw-log`, labeled by
`ddd5.8.logScaleLabel`, after the chart choices. It appears exactly
when the confirmed result's `histogramLog` is non-null and width's
Distribution view is shown, which requires a drawn chart. Turned on, the chart comes from the shared
`histogramLogSpec`/`histogramSvg` path. That spec's chart label
appends `ddd5.11.logAxisClause` through the existing `chartLabel`
option. The bin-rule hint becomes `ddd5.12.logScaleNote`, and the bin
table is built from the displayed log bins. A confirmation, or a
same-tab restore, whose result has no log histogram turns the scale off
and shows `ddd5.10.recoveryLogScaleOff` once, as a `role="status"`
line cleared by the next step change, entry edit, or button press.
The persistent live region announces the same sentence. The toggle is presentation
only. It does not change `navigationVersion` or the draft, and it is
saved with the display choices. The Cumulative view and the other
measurements are unchanged. The walkthrough's width stop shows the
same control. No unit test was added: the behavior is DOM
presentation over shared, already tested builders. G-12's browser
spec covers it.

At this verification, after rebasing onto the merged G-10:

- The pinned Node suite passed all 417 tests; typechecking and the
  bundles passed. Strict publication and preview builds passed
  with `explore-b81440e55cb3.js` and `explore-abe9a2aa7049.css`. The
  `/scenario/` bundles were unchanged. All 31 hook tests passed.
- 5,498 relative links in 61 Markdown files resolved; PDD
  agreement passed; traceability linted 491 rows with no gaps.

A disposable Playwright script drove the strict preview build with
the pinned data. All 24 checks passed; the script was not committed.
It used the 30°, 5 m, Dense, Uniform: Strong scenario over 0–5 m slip,
which returned 1,200 records. Width had 1,142 valid measurements, 23
linear bin rows, and 9 log rows, including a `below 0.1 m` bar. The
checks covered:

- the offer's presence, label, and initial state;
- the chart label's log clause, the note, and the log bin table;
- no pending banner, the saved display choice, and focus kept on the
  checkbox;
- an unchanged Cumulative view and other measurements;
- restoration after reload, and the walkthrough's width stop;
- the off-adjustment after confirming the no-match 0.01–0.02 m slip
  range, shown once and saved off;
- a later offering confirmation that stayed unchecked;
- the off-adjustment reported by a restore;
- 320 px without horizontal overflow.

### Guided browser specs, 2026-11-04 (G-12)

G-12 added one spec per guided DDD §9.5 item to the T-60 lane's
`playwright/specs/`, with shared helpers in
`playwright/explore-support.ts`. The specs run in the lane's existing
desktop and mobile projects, reporters, and strict-preview server. The
mobile project's spec filter now also matches `explore-*.spec.ts`:

1. `explore-journey`: the five steps to the GS-1 result with its
   reference count (25,920) and valid height count; `/scenario/`
   still mounts.
2. `explore-validation`: site, movement, and scarp-type routing,
   messages, `aria-invalid`, and focus. Review attempts from Results
   route back to an emptied site group on Site and to a blank slip
   maximum on Movement, keeping the confirmed count.
3. `explore-draft-boundary`: the pending banner, Discard changes,
   Return to review, Start a new scenario, and the GS-6 result
   (3,434 records) unchanged during edits.
4. `explore-modes`: each mode's entries kept across switches and
   restored by Discard.
5. `explore-sample`: the silent fill, both ask-before-replace
   outcomes, the 30°-only coverage warning, no browser dialog, and
   confirmed results untouched.
6. `explore-continuity`: reload restores with the notice; corrupt and
   other-release records require the explicit fresh start; a new tab
   and a new context start fresh. It also covers the G-10 review
   repairs: a Review reload in offset mode, and a save failing
   mid-session, which clears the record.
7. `explore-race`: a held regression response during navigation away
   from an offset review, and from a restore, applies nothing stale;
   Retry then recovers.
8. `explore-walkthrough`: the five stops, progress, prompts, single
   editors, Back/Next labels, Browse freely and Finish focus targets,
   and the empty-type review block.
9. `explore-log-scale`: the offer, label, chart-label clause, note,
   and log bin rows (equal to GS-1's reference bins and its below-bar);
   Cumulative and other measurements untouched; the walkthrough width
   stop; the off-adjustment confirming GS-6, which has no log histogram.
10. `explore-download`: the package delivered during a draft edit,
    holding the four package members, GS-6's record count, and the
    confirmed slip window rather than the draft's.
11. `explore-layout`: no horizontal overflow at 320 and 1,024 px
    across the steps, validation, results, charts, refinements, and
    all five walkthrough stops.

Expected values come from the served reference results (GS-1 and
GS-6), the served manifest and pointer, and the copy registry. GS-6's
records are all zero-slip stages with no valid measurement, so the
specs that need charts use GS-1. A first run had five failing tests
from three wrong spec assumptions: charts under GS-6 (three tests),
a click on a not-yet-reached, disabled step button, and the race
assertion's direction. All were spec errors and were corrected; no
application defect appeared. Besides DDD and registry texts, some
assertions pin the page's own validation, loading, download, and
unreadable-record copy; a copy change there fails those specs
loudly.

An independent review mutation-tested the race, continuity, and
sample specs: each failed when its guarded behavior was broken.
Following that review, G-12 added a cross-step routing test, made the
race spec wait until the held response was processed, and made new
contexts keep the project's device emulation. On the reviewer's machine the full lane
passed 206 with the legacy a11y spec passing, so that failure
appears environment-dependent.

At this verification, on the branch rebased onto the merged G-11:

- `webappBrowserTest` (desktop and mobile) gave 207 passed, 5
  skipped, and 1 failed. All 28 guided tests passed in each project.
  The failure is the existing `axe: the failure states` legacy spec
  recorded under G-08, failing identically on base; the 151 legacy
  passes are unchanged.
- The final guided specs passed 168 of 168 runs with
  `--repeat-each 3` in both projects.
- The pinned Node suite passed all 417 tests; typechecking, which
  includes the specs, and both strict builds passed. The `/scenario/`
  bundles were unchanged. All 31 hook tests passed. 5,498 relative
  links in 61 Markdown files resolved; PDD agreement passed;
  traceability linted 491 rows with no gaps.

Outstanding beyond this lane, as §9.5 records:

- physical touch devices; the mobile project only emulates a 360 px
  touch viewport in Chromium;
- other browser engines;
- an actual Back/Forward-cache (`persisted`) restoration;
- screen-reader announcement of the inserted status lines.

The lane is not part of CI; it runs through
`./gradlew :subprojects:webapp:webappBrowserTest`.

**Documentation follow-up for the owner.** The legacy
[DDD §7.5](ddd.md#75-browser-test-lane) still quotes the earlier
mobile `testMatch` and calls the lane "the eleven specs". The G-12
row and guided DDD §9.5 authorize the filter change, but the owner
authorized legacy-DDD amendments for G-08 only, so §7.5 was left
unchanged. It now describes the legacy specs only; the guided specs
are §9.5's.

### Sample chooser, 2026-11-04 (G-14)

G-14 ran under the owner's release and grant renewal of 2026-11-04
([Commands](#commands)). `sampleDraft(manifest, sample)` now takes
a `SampleId`, `'illustrative' | 'kern'`, and reads each sample's
values from one table typed `Record<SampleId, …>`. The illustrative
sample keeps §9.1's values unchanged. The Kern sample fills fault
angles 60° and 70°, offset mode, and a 1.3 m maximum (PDD D-42).
Both builders take every member from the manifest and throw on a
missing one. `isSampleId` narrows the clicked button's
`data-sample` attribute to a known sample.

Agent selections under the PDD §2.3 delegation (guided DDD §10.1),
named here as the row requires:

- Kern completion values: 10 m sediment depth, Medium density, and
  the Uniform: Moderate and Layered: Moderate pairs. These are sample
  values for a demonstration, chosen from the manifest; they are not
  a characterization of the White Wolf fault site. All four are
  present in data release `data-v1`.
- The chooser is two buttons, not a disclosure. A `role="group"`
  labeled `Try a sample:` holds **Illustrative sample** and
  **Kern County 1952 sample**, beside **Build your scenario**. Each
  button is described by the hint `Sample values, not recommended
  site values.`; **Try sample inputs** is gone.
- The question reads `Replace your current choices with the
  illustrative sample?` (or `the Kern County 1952 sample?`). The
  status line reads `Filled with the illustrative sample: sample
  values, not recommended site values. Change anything.` (or the
  Kern name), still `role="status"` and cleared when the reader
  leaves Site conditions. **Use the sample** and **Keep my
  choices** are unchanged. Keep my choices returns focus to the
  button that asked.

D-37's flow is otherwise unchanged for both samples. It still
fills silently from a fresh draft with nothing confirmed and
otherwise asks inline. It still replaces the whole draft only on
Use the sample, never opens a browser dialog, and never changes
confirmed results. The sample state is presentation state; the
session record stores neither the question nor the status line.

Observed 60–70° coverage. On the strict preview with the pinned
data release `data-v1`, the Kern sample's 1.3 m offset converts to
about 0.01–1.51 m of slip at 60° and 0.01–1.39 m at 70°, both
**Within range** of the modeled 0–5.0135 m, so no coverage warning
appears. This agrees with the external live check on the deployed
page. The confirmed Kern sample returned 1,011 matching records
with all charts rendered. The spec asserts the Within-range state
at both angles, so a change in data or conversion fails the lane
rather than silently changing the demonstration.

Tests and specs:

- State tests now run over both samples: completeness, validity,
  canonical order, offset mode, fresh slip entries and
  refinements, independent copies, and each missing member. One
  test removes a member only one sample uses, to show the builders
  are independent; another checks `isSampleId`.
- The §9.5 sample spec (item 5) is parameterized over both samples:
  - the chooser's names, group, and hint;
  - each sample's silent fill, with its site values and offset;
  - its coverage: the 30° warning for the illustrative sample, and
    no warning, with both rows Within range, for Kern;
  - Keep and Use with a confirmed scenario, which leave the
    confirmed count unchanged and focus the asking button;
  - each option keeping its identity when the reader asks about one
    and then the other, from an edited draft and from a filled
    Kern draft;
  - keyboard operation: Tab order through the chooser, Enter and
    Space, and Keep and Use by keyboard.
- The continuity and layout specs now use the illustrative button.

At this verification:

- The pinned Node suite passed all 422 tests; typechecking and the
  bundles passed. Strict publication and preview builds passed
  with `explore-faeb1b0a595d.js` and `explore-cbf963b397ab.css`.
  The `/scenario/` bundles `app-26490347afd0.js` and
  `app-08bebc049c15.css` were unchanged. All 31 hook tests passed.
- 5,504 relative links in 61 Markdown files resolved; PDD agreement
  passed; traceability linted 491 rows with no gaps.
- The guided specs passed 64 of 64 (32 each in `desktop` and
  `mobile`), and the sample spec passed 42 of 42 over three repeats.
- The full lane, run before the review clean-ups (`isSampleId`, the
  value table, and the singular error prefix), passed 215, skipped
  5, and failed 1: the legacy `/scenario/` `axe: the failure states`
  spec, the same environment-dependent `.md-top` contrast failure
  recorded under G-12 at its base. The guided specs alone were
  rerun after the clean-ups.

Independent review passed with no blocking finding. The three
clean-ups above came from its nits. Its one should-fix was this
evidence.

Not verified: screen-reader announcement of the renamed status
line, touch, and engines other than Chromium.
### Restore busy release, 2026-11-04 (G-16)

G-16 ran under the owner's release and grant renewal of 2026-11-04
([Commands](#commands)). It fixes the external review's defect
against §9.2. A restore in offset mode waits for the conversion
data. Until now, a navigation during that wait marked the restore
interrupted only when the fetch settled, so a stalled fetch kept
**Show results** disabled even for a slip-mode draft that needs no
conversion data.

- Every former `navigationVersion` increment in
  `src/explore/app.ts` now calls `invalidate()`. Version semantics
  are unchanged.
- While a restore owns `busy` (the new `restoring` flag),
  `invalidate()` releases it immediately and records `Restoring the
  results was interrupted.`, so the retry panel and **Show results**
  are available at once.
- Typing in an entry field does not re-render the page, so the
  release replaces a visible progress line in place.
- The restore's late continuation now returns on any version change
  as well as on supersession, leaving every shared flag alone. It
  can therefore never clear the `busy` state of a confirmation the
  reader started after the release.
- A successful confirmation also clears `restoring`. After the
  review, a restore superseded by a confirmation can no longer leave
  the flag stale.
- Restore outcomes are otherwise unchanged: success, a validation
  failure, a conversion-load failure, the interruption message, and
  Retry.

The §9.5 continuity spec (item 6) gains two tests. Each holds the
regression response for its whole run:

- **Navigation.** After a reload on Results, a navigation clears
  the progress line and shows the interruption at once. A slip-mode
  draft then reviews and confirms while the fetch is still held. The
  released fetch, processed before the checks run (proved by the
  offset conversion table rendering), changes neither the confirmed
  count nor the movement, and adds no restore notice.
- **Typing.** After a reload on Movement, typing in the offset field
  cancels the restore in place. After the release, the interruption
  stays until Retry succeeds.

Both tests failed against the unfixed code at the progress-line
check. The hold helpers moved from the race spec into
`playwright/explore-support.ts`, shared by both specs.

One limit is accepted under the row's wording. Suppose a reload
lands on Review with a slip-mode draft over an offset confirmation
while the fetch stalls. **Show results** stays disabled until the
reader navigates or edits, because a disabled button cannot itself
supersede the restore.

At this verification:

- The pinned Node suite passed all 417 tests; typechecking and the
  bundles passed. Strict publication and preview builds passed
  with `explore-b97a505fb764.js` and `explore-abe9a2aa7049.css`.
  After rebasing onto the merged G-14, the suite passed all 422
  tests and the builds passed with `explore-18adc509ae2e.js` and
  `explore-cbf963b397ab.css`.
  The `/scenario/` bundles `app-26490347afd0.js` and
  `app-08bebc049c15.css` were unchanged. All 31 hook tests passed.
- The doc checks below passed: relative links resolved, PDD
  agreement held, and traceability linted 491 rows with no gaps.
- The guided specs passed 60 of 60 in `desktop` and `mobile`, and
  68 of 68 after the rebase onto G-14. The
  continuity and race specs passed 60 of 60 over three repeats.
- The full lane passed 211, skipped 5, and failed 1: the legacy
  `/scenario/` `axe: the failure states` spec, the same failure
  recorded under G-12.

Independent review passed with no blocking finding. Its
should-fix, a deterministic proof that the held response was
processed, and its nits (the stale `restoring` flag, the shared
helpers, a test title) are applied. The accepted limit above is its
third nit.

Not verified: a real network stall, as opposed to a held route;
touch; and engines other than Chromium.

### Log-off notice around downloads, 2026-11-04 (G-17)

G-17 ran under the owner's release and grant renewal of 2026-11-04
([Commands](#commands)). It fixes the external review's defect
against §9.3.

The click handler clears `logOffNotice` on every button press, as
G-11 recorded. A successful download does not re-render, so after a
zero-slip confirmation had turned the log scale off, the dismissed
notice's line stayed on screen. The handler now removes
`.gx-log-off` where it clears the flag. That covers the download
and any other press that does not re-render.

The independent review found one more place where the flag and the
line could disagree. The read-off slider's closing `change` event
cleared the flag, without removing the line, and also bumped
`navigationVersion`. The slider is display state handled on
`input`, and its `change` is neither an edit nor a navigation, so
the `change` handler now returns for `#gx-percentile` before
clearing anything. Neither change touches `download()` or the
package code.

The §9.5 width spec (item 9) gains one test:

- turn the log scale on at GS-1;
- reconfirm GS-6, a zero-slip result, so the notice appears;
- download: the line clears at once, the ready status appears, and
  the package keeps its member names and GS-6's reference record
  count;
- a later render does not bring the line back, and the log scale
  stays off in the stored display.

The test failed against the unfixed code at the cleared-line
check. The slider path has no committed spec, because no golden
scenario yields a chartable result without a log histogram; it was
checked by reading the code.

At this verification:

- The pinned Node suite passed all 417 tests; typechecking and the
  bundles passed. Strict publication and preview builds passed with
  `explore-5f2a0c708a9a.js` and `explore-abe9a2aa7049.css`. The
  `/scenario/` bundles `app-26490347afd0.js` and
  `app-08bebc049c15.css` were unchanged. All 31 hook tests passed.
  After rebasing onto the merged G-14 and G-16, the suite passed
  all 422 tests, the builds passed with `explore-38b2b0ac6af5.js`
  and `explore-cbf963b397ab.css`, and the guided specs passed 70 of
  70 in `desktop` and `mobile`.
- Relative links resolved, PDD agreement passed, and traceability
  linted 491 rows with no gaps.
- The full lane passed 210 and skipped 5, with no failure. The
  legacy `/scenario/` `axe: the failure states` spec, which failed
  in the G-12, G-14, and G-16 runs on this machine, passed in this
  run. That is further evidence that its failure depends on the
  environment, not on these changes. The log-scale and walkthrough
  specs passed 30 of 30 over three repeats.

Independent review passed. Its should-fix, the slider path, is
applied. It also noted that the click handler clears
`restoredNotice` while a successful download leaves `Restored the
work in this tab.` on screen. §9.2 keeps that notice until the next
navigation or edit, and a download is neither, so the visible line
is arguably correct and was left unchanged. The out-of-step flag is
recorded here for a later decision.

Not verified: touch, engines other than Chromium, and
screen-reader behaviour when the status line is removed.

### Sample stories, 2026-11-04 (G-15)

G-15 ran under the owner's release and grant renewal of 2026-11-04
([Commands](#commands)). After either sample fill, Site conditions
shows a closed **About this sample** disclosure under the status
line (guided DDD §10.2).

- The disclosure is presentation state: its open state lives in
  `storyOpen`, survives the re-renders of Site conditions, resets on
  every fill, and leaves with the status line. Neither the draft nor
  the session record holds it.
- The texts live in `src/explore/stories.ts`. Both stories carry the
  same sentence: `These are sample values anchored to that
  earthquake's scale; they reproduce no event and model no
  particular site.`
- Each story has one image, with alt text, a caption, and a visible
  credit naming author, licence, and title. Links use the page's
  new-tab helper.
- The images are project images, not application assets. They live
  at `subprojects/mkdocs/docs/images/sample-chichi-kuangfu-track.jpg`
  and `…/sample-kern-bealville-tracks.jpg`, each resized to 960 px
  wide. They publish at `images/`, each with one line in
  `publication-allowlist.txt`, and the page references them as
  `../images/…`. Nothing enters `assets/explore/`.

**Licence verification, per file, 2026-11-04.**

| File | Source | Author | Licence | Verification |
| --- | --- | --- | --- | --- |
| `sample-chichi-kuangfu-track.jpg` | Wikimedia Commons, [Ruin of the destructed running tracks at the 921 Earthquake Museum of Taiwan 2024-09-21.jpg](https://commons.wikimedia.org/wiki/File:Ruin_of_the_destructed_running_tracks_at_the_921_Earthquake_Museum_of_Taiwan_2024-09-21.jpg), from [Flickr 54010394084](https://www.flickr.com/photos/presidentialoffice/54010394084/) | Liu Shu fu / Office of the President, Taiwan | CC BY 2.0 | Commons page licence and FlickreviewR pass (cc-by-2.0, reviewed 2024-09-22); Flickr page licence id 4, CC BY 2.0; SHA-1 of the downloaded original `3d3919eed2eb9ccfee6b7e38a5ae17b859b3f552` matched Commons |
| `sample-kern-bealville-tracks.jpg` | USGS ScienceBase item [51dd6f2be4b0f72b4471a1d7](https://www.sciencebase.gov/catalog/item/51dd6f2be4b0f72b4471a1d7), file `kdh00001.jpg` | Donald H. Kupfer (photographer), 1952; U.S. Geological Survey (data owner) | U.S. public domain | The item's `rights` field: "This USGS product is considered to be in the U.S. public domain." Read through the item's JSON API because the HTML page refuses automated requests |

The ScienceBase item also records that the photograph was published
in California Division of Mines Bulletin 171 (1955). The
public-domain statement is USGS's own, on its source page.

A second CC BY 2.0 file was verified the same way and left out to
keep the disclosure short: the Chelungpu fault trench exhibit, from
the same photographer (Flickr 54010493650).

Story sources. The illustrative story follows
`subprojects/mkdocs/docs/figures.md`, Figure 1: the M 7.6 Chi-Chi
earthquake, the bridge, and the Shih-Kang Dam's roughly 8 m of
uplift. The 2.5 m playground lift comes from the
[Tri-Mountain NSA page](https://www.trimt-nsa.gov.tw/en/attraction/857/),
checked 2026-11-04.

No scholarly companion was verified. Angelier et al. (2003,
*Journal of Structural Geology* 25(3): 351–370) studies the
Kuangfu stadium scarp, but its figure could not be read. Lee et al.
report 2.2 ± 0.1 m average and 2.5 m maximum at the nearby Wufeng
trench, which is a different site. The Tri-Mountain page gives the
earthquake as "magnitude 7.3"; the story uses M 7.6, as the figures
page frames it.

The Kern story uses PDD D-42's anchors: the dip near 75° from Stein
& Thatcher (1981) and Bawden (2001), and SCEDC's "rise of about 1.3
meters". M 7.36 is the site's constant. The Buwalda & St. Amand
sentence follows `docs/datasets.md`, under which the lead author
digitised part of the 1955 report.

Tests and specs:

- New state tests check:
  - one story per sample;
  - the shared sentence in both stories;
  - each story's §10.2 anchors;
  - that the figures citation's anchor still exists;
  - that each image is a committed, allowlisted JPEG whose
    `width` and `height` match the file, with alt text, a caption,
    and a credit naming a CC BY licence or public domain.
- The §9.5 sample spec covers, for both samples:
  - the closed disclosure and its summary;
  - the sample's own text and not the other's;
  - the image loading from `../images/`;
  - the credit;
  - four new-tab links, each with its screen-reader hint;
  - the open state kept across a re-render, gone after leaving
    Site, and closed again on a new fill.
- The layout spec checks 320 px and 1,024 px with the disclosure
  open.

At this verification, on `dev-v.0.4.x` after G-17:

- The pinned Node suite passed all 429 tests; typechecking and the
  bundles passed. Strict publication and preview builds passed with
  `explore-4a5711e9c99a.js` and `explore-daf816cb719a.css`, and both
  images published under `images/` through the allowlist. The
  `/scenario/` bundles `app-26490347afd0.js` and
  `app-08bebc049c15.css` were unchanged. All 31 hook tests passed.
- Relative links resolved, PDD agreement passed, and traceability
  linted 491 rows with no gaps.
- The guided specs passed 74 of 74 in `desktop` and `mobile`. The
  sample and layout specs passed 66 of 66 over three repeats.
- The full lane, run on the first text revision, passed 224 and
  skipped 5, with no failure. Only the story strings, the alt text,
  and the tests changed after that run.

The independent review passed the code. Its findings on the texts
were applied before the owner's review. It asked for one shared
anchored-not-modeled sentence and for the fault angles to stay out
of the Chi-Chi claim. It asked to say "part of" the 1955 survey,
digitised by the lead author, and to stop attaching "geodetic" to
the 1.3 m. It asked for alt text that matches the photograph, for
the CC work title in the credit, and for pinned anchors and
non-vacuous link checks in the tests.

**Owner approval, 2026-11-04 (CR-10, relayed through the planning
session).** The owner approved the revised story texts exactly as
they stand in `src/explore/stories.ts`, with both images and one
image per story. The trench photograph stays out by the owner's
choice after viewing it. On the open points:

- the Kern wording "the scale of that elevation change" stands;
- the field-overlay sentence is confirmed as written;
- the Tri-Mountain citation alone supports the 2.5 m lift, with
  nothing further to verify now, as §10.2 allows;
- a README line for third-party photographs is approved, but stays
  outside G-15 for the owner's own commit.

Not verified: screen-reader reading of the disclosure, touch, and
engines other than Chromium. The README licensing table does not
yet mention third-party photographs; that is outside G-15 and left
to the owner.

### Sample presentation rework, 2026-11-05 (G-18)

G-18 ran under the renewal extension of 2026-11-04. It was first
built to PDD D-43, then held and reworked when the owner adopted
D-44 and guided DDD §10.5 before the merge (the owner revision
above). The branch was rebased onto the owner's docs commits
`8f809b8` and `c5e121d`; neither changed G-18's scope.

**The dialog (§10.5).** **Try a prefilled sample** on the
introduction opens a native modal `<dialog>` titled "Try a
prefilled sample".

- It holds two selectable cards, titled by their inputs: "Lower
  fault angles" (30° and 40°; surface offset up to 3 m) and "Steeper
  fault angles" (60° and 70°; surface offset up to 1.3 m). The
  descriptors name the offset only.
- The cards form a radio group labelled "Samples", with one tab
  stop. The arrow keys move the selection and wrap; Home and End
  reach the ends. The dialog opens with the first card selected.
- The selected card's preview shows its values under the review
  page's labels, the offset and slip ranges, and the slip framing
  note. Selecting a card never changes the draft; the specs compare
  the stored record before and after.
- **Use this sample** applies the selection on a fresh draft. On any
  other draft, including a confirmed scenario or a pending restore,
  the replacement question becomes the dialog's next step: "Replace
  your current choices with the {sample} sample?", with focus on
  **Keep my choices**.
- Escape at either step, Cancel, and Keep my choices close the
  dialog with nothing changed, and return focus to the trigger. Tab
  is held inside the dialog and reaches every focusable item in
  document order.

**Notice and footer.** After a fill, Site conditions and Fault
movement both show "Prefilled with the {sample} sample. You can
change any value." The first draft edit, checked by comparing the
draft with the fill's values, turns it into "Started from the
{sample} sample · Modified". Once Modified, it stays Modified. The
notice stays until another fill replaces it or Start a new scenario
clears it.

- A mode switch is not an edit. While a sample is active, the first
  switch shows and announces the note "The two modes are separate
  assumptions. Each selects a different set of simulations, so
  results can differ." The note stays on Fault movement.
- Discard changes returns to the notice of the fill the confirmed
  scenario started from. The Modified flag of that fill carries over
  while it is still the working fill, so Discard never shows it as
  Prefilled again. A confirmation made without a sample discards
  the notice with the draft.
- After a fill, Site conditions offers only **Continue to fault
  movement** as its primary action, with **Return to review** as a
  secondary one when review was reached. The ordinary footer
  returns once the reader moves past Site conditions.
- Until G-19, the G-15 **About this sample** disclosure stays under
  the notice on Site conditions, with the notice's lifetime.

**Both-mode prefills.** Each sample fills both movement modes;
offset mode stays active.

- Kern: 0–1.3 m offset, and 1.6–1.9 m slip. The preview frames the
  slip as "The slip range spans Bawden (2001)'s two patch estimates,
  1.6 m and 1.9 m, used as an example band." It is never presented
  as an uncertainty interval.
- Illustrative: 0–3 m offset, and 3–5 m slip, an agent selection
  under the PDD §2.3 delegation. The band lies inside the release's
  modeled slip coverage (0–5.0135 m in the manifest), ends near its
  top at the value the page's own **Set maximum to 5 m** shortcut
  uses, and starts at the sample's 3 m offset scale. It is not a
  conversion of the offset. The preview says "The slip range is an
  example band within the simulations' coverage."
- `sampleDraft` throws, rather than shrinking the sample, if a
  release does not accept a sample's slip window. In slip mode both
  windows are accepted with no coverage warning; offset mode keeps
  G-14's observed coverage states.

**Owner approval, 2026-11-05 (relayed through the planning
session).** The owner approved:

- strings 1–8 exactly as sent: the trigger and its hint, the dialog
  title, the card titles and descriptors, the preview labels and
  both slip notes, the dialog buttons, the replacement question and
  its buttons, both notice forms, and the mode-switch note;
- choices a–d: {sample} in sentences is the card title in lower
  case; the dialog opens with the first card selected; Escape,
  Cancel, and Keep my choices close the whole dialog unchanged; the
  mode-switch note appears on the first switch, is announced once,
  and stays until replacement or a new scenario;
- the review-driven Discard rule above, in place of choice (e), as
  the §10.5-compliant rule;
- the screen-reader group label "Samples";
- the consequence of interpretation (a): after a fill, a mode
  switch, and Show results, the notice still says "Prefilled…",
  and the mode-switch note flags the switch.

**Owner decision R, 2026-11-05: the notice survives a reload.**
Before this decision, a reload restored the draft and the
confirmation (§9.2) but dropped the notice. The owner chose to keep
it, as a small §9.2 extension within D-38's display-choices scope.

- The record's display choices now hold `sample` (the working
  fill's `{id, modified}`) and `confirmedSample` (the confirmed
  scenario's fill, with `current` saying whether it is still the
  working fill). Without the second, Discard after a reload could
  not return to the right notice.
- Both keys are validated like the rest of the record: a known
  sample id, boolean flags, no extra keys, and no confirmed fill
  without a confirmed scenario and a working fill. A record written
  before the keys existed restores without a notice rather than
  being refused.
- A restored fill rebuilds its values from the served release; a
  sample the release no longer supports drops only the notice (and
  with it the confirmed scenario's fill).
- Three things are derived or reset on reload rather than stored,
  so a reload can differ slightly from the moment before it:
  - the mode-switch note returns only while the draft is in the
    mode the sample did not set, so it is gone after a switch back
    to offset mode;
  - the story disclosure restores closed;
  - the sequential footer does not return: Site conditions shows
    the ordinary footer, which offers **Return to review** first
    when a confirmed scenario exists.

**Reviews.** The independent review of the D-43 build found five
issues: the chooser lost across an asynchronous re-render, opening
and closing clearing the restore notice, focus moving twice into
the question, a pending restore treated as a fresh draft for the
silent fill, and vacuous spec assertions. All were fixed; the D-44
rework replaced most of that code, keeping the pending-restore rule
and the dialog's initial focus. The re-review of the D-44 rework
found nothing blocking. Its fixes: Discard never un-Modifies a fill,
the Tab trap covers every focusable item, the card group has its
own label, and new specs cover discard, the in-place Modified
update, and previewing over a confirmed scenario. The review of the
decision-R change found nothing blocking. Its two fixes, applied: a
confirmed fill is dropped with a working fill that cannot be
rebuilt, so the next save never writes a record the validator
refuses; and records from before the sample keys are normalised in
`loadSession` instead of inside the validator. It also noted the
three reload differences listed above, now recorded here.

Tests and specs:

- State tests: both-mode prefills validate in slip mode; a release
  that does not cover a sample's slip window throws; `holdsSample`
  treats a mode switch and set order as no edit and every field
  edit as one.
- Session tests: the sample keys round-trip; a record without them
  loads with nulls; nine kinds of tampering are refused.
- The §9.5 sample spec, for both samples: the cards and preview;
  keyboard operation; the fresh fill in both modes with the mode
  note; the notice's Modified form and lifetime; the confirmed
  scenario and the question; Discard; the notice, story, and mode
  note across reloads; Discard after a reload; the dialog across a
  settling restore; and the story disclosure. The layout spec fits
  the open dialog, a preview, and the open story at 320 px and
  1,024 px.

At this verification, on `task/g-18-sample-rework` rebased onto
`c5e121d`:

- The pinned Node suite passed all 435 tests; typechecking and the
  bundles passed. Strict publication and preview builds passed with
  `explore-4d7bf5d8a62d.js` and `explore-35adcbc6a1cb.css`. The
  `/scenario/` bundles `app-26490347afd0.js` and
  `app-08bebc049c15.css` were unchanged. All 31 hook tests passed.
- Relative links resolved (5,511 in 61 files), PDD agreement passed,
  and traceability reported no gap rows.
- The guided specs passed 96 of 96 in `desktop` and `mobile`. The
  sample, layout, and continuity specs passed 180 of 180 over three
  repeats.
- The full lane passed 247 and skipped 5, with one failure outside
  G-18: `a11y.spec.ts`, "axe: the failure states", on `/scenario/`,
  reports `color-contrast (serious): .md-top` — the theme's Back to
  top button — in the unavailable and incompatible-settings states.
  The same spec failed the same way 3 of 3 on the base commit
  `c5e121d`, built and run in the same worktree. This branch changes
  none of the spec, its support module, the `/scenario/` page, or
  its bundles. The spec passed in the lane on 2026-11-05 earlier in
  this task and has failed intermittently once before, so it is
  recorded as a pre-existing, environment-dependent failure (the
  machine's load average was about 12 throughout) and reported to
  the planning session rather than fixed under G-18. CI does not run
  the browser lane.

Not verified: screen-reader reading of the dialog, the radio group,
and the notice; touch operation of the cards; and engines other
than Chromium.

### Sample background and annotations, 2026-11-05 (G-19)

G-19 ran under the renewal extension of 2026-11-04, after G-18, to
guided DDD §§10.4 and 10.5 (PDD D-43, D-44).

**The trigger.** The G-15 **About this sample** disclosure becomes
the closed **Why these sample values?** trigger, with the helper
"Background, photos and sources" in its summary.

- It stands directly under the prefill notice on both Site
  conditions and Fault movement and follows the notice's lifetime:
  it stays through edits and the Modified form, and leaves only on
  replacement or Start a new scenario. Since G-18's decision R, it
  also survives a reload.
- Its open state carries between the two steps, closes on every new
  fill, and restores closed after a reload (choice h).
- Inside it is the §10.2 story material, unchanged except for the
  shared sentence below.

**The card preview.** Under the selected card's values and slip
note, the preview carries the same story material: the paragraphs,
the photograph with caption and credit, and the sources, under the
heading "Why these sample values?". Its links are in the dialog's
Tab order between the cards and **Use this sample**. Licensing is
unchanged: the same two images and credits, so the G-15 licence
evidence stays valid.

**The shared sentence (CR-10).** In both stories, "These are sample
values anchored to that earthquake's scale; they reproduce no event
and model no particular site." becomes "These examples help you try
the tool. They do not reconstruct either earthquake." The rest of
each paragraph stands.

**Annotations.** While a sample is active, each prefilled control
carries a short annotation at the end of its group or below its
entry, so it never moves the control being used.

- An annotation shows only while its own control holds the sample's
  value (`fieldHoldsSample`): sets compare without order, entries as
  typed text, like `holdsSample`. Any change clears it, including
  "3" → "3.0" or a third fault angle, and the sample's value again
  brings it back (choice g). Checkboxes, Select all, the steppers,
  and the shortcuts re-render; typing updates the movement
  annotation in place, redrawing only when it comes or goes.
- Movement annotations follow the active mode: offset in offset
  mode, slip in slip mode (choice i).
- They are plain text in reading order, outside every live region
  and every `aria-describedby`, so they are never announced on
  their own.
- The trigger's summary and the annotations' source links carry
  ids, so focus on them survives the re-render when the conversion
  data arrives.

Final annotation strings:

| Control | Lower fault angles | Steeper fault angles |
| --- | --- | --- |
| Fault angle | "These angles are sample choices, not taken from the 1999 Chi-Chi earthquake." | "Geodetic studies put the White Wolf fault's dip near 75°; the sample uses the two steepest modeled angles." — Stein and Thatcher (1981); Bawden (2001) |
| Sediment depth, density, strength and structure | "A sample choice, not a description of any real site." | the same |
| Surface-offset maximum | "Of the scale of the surface offsets in the sample's background: meters of uplift, including about 2.5 m at a school playground in the 1999 Chi-Chi earthquake." — Chiama et al. (2025), Figure 1; Tri-Mountain National Scenic Area, 921 Earthquake Museum of Taiwan | "The scale of the largest surface elevation change in the 1952 Kern County earthquake, about 1.3 m." — SCEDC, 1952 Kern County earthquake |
| Slip range | "An example band within the simulations' coverage. It is not converted from the surface offset." | "Bawden (2001)'s two patch estimates, 1.6 m and 1.9 m, used as an example band, not an uncertainty range." — Bawden (2001) |

In the Lower offset annotation, the Figure 1 link supports the
meters of uplift and the Tri-Mountain page supports the 2.5 m, as
recorded in G-15; the links follow the sentence's order.

**Approvals, 2026-11-05 (relayed through the planning session).**

- The owner approved the trigger and helper, the card preview's
  story material and heading, and the revised shared sentence
  (CR-10) exactly as sent, and confirmed choices g, h, and i.
- The owner approved the annotations with choice (f) overturned:
  §10.5's "previews and stories only" governs the card titles, not
  the annotations, which name the events and the White Wolf fault
  as the stories do, with the stories' full link labels. The owner
  covered these insertions without a further round; the planning
  session is amending the §10.5 sentence to match.
- The illustrative fault-angle sentence was then revised, approved
  under the owner's overnight delegation of 2026-11-05, relayed by
  the planning session. The approved form, "A sample choice; the
  1999 Chi-Chi earthquake does not set these angles.", could be
  read as a claim about the Chelungpu fault's own dip; the
  independent review raised this, and the sentence above replaces
  it, matching the story's "sample choices".
- The info-icon overlap on the trigger's summary is the shared
  disclosure pattern that G-21 (§11.3) covers; G-19 leaves it.

**Review.** The independent review found no blocking defect. Its
findings, applied:

- focus could fall to the page body when the conversion data
  re-rendered Fault movement with focus on the trigger or a source
  link; both now carry ids, and a spec checks it;
- the fault-angle wording above;
- specs for Select all, the steppers, the coverage shortcut, and
  replacement by the other sample;
- stale comments, and the in-place refresh comparing escaped HTML.

Tests and specs:

- Story tests: the shared sentence appears once in each story and
  the old one is gone; every sample annotates every control in one
  or two sentences; annotations link only their own story's sources
  under the stories' labels; each names its own sample's event and
  never the other's; the Kern anchors stand.
- State tests: `fieldHoldsSample` holds for the fill, a mode switch,
  and set order, and fails for each control's own edits only.
- The §9.5 sample spec, for both samples:
  - the preview's story material, image, credit, and sources, and
    not the other sample's;
  - the Tab order through the preview's links;
  - the trigger under the notice on both steps, its summary and
    helper, its open state across steps and through Modified, and
    closed on a new fill;
  - the annotations on both steps: their texts and links, outside
    live regions and descriptions, clearing with their own value
    and returning, in place while typing, through Select all, the
    steppers, the shortcut, the mode switch, a reload, replacement,
    and Start a new scenario;
  - focus kept across the conversion re-render.

At this verification, on `task/g-19-sample-background` rebased
onto `5385b93`:

- The pinned Node suite passed all 441 tests; typechecking and the
  bundles passed. Strict publication and preview builds passed with
  `explore-c74f3a5830d5.js` and `explore-8c72500af305.css`. The
  `/scenario/` bundles `app-26490347afd0.js` and
  `app-08bebc049c15.css` were unchanged. All 31 hook tests passed.
- Relative links resolved (5,511 in 61 files), PDD agreement passed,
  and traceability reported no gap rows.
- On the final tree, the full lane passed 256 and skipped 5, with no
  failure. One commit earlier, which differed only in the
  illustrative fault-angle string, the lane passed 255 with one
  failure, the pre-existing `a11y.spec.ts` `.md-top` contrast check
  recorded under G-18 and now assigned to G-21. In that same run,
  the sample and layout specs passed 156 of 156 over three repeats
  in `desktop` and `mobile`.

Not verified: screen-reader reading of the trigger, the preview's
story, and the annotations; touch; and engines other than Chromium.

### Wording and presentation polish, 2026-11-05 (G-20)

G-20 ran under the renewal extension and the D-45 release, after G-19,
to guided DDD §§11.1–11.2. The audit is the owner's local file
`notes/2026-11-05/explorer-wording-ux-audit.html` (reviewed at
`635e59b`, 75 entries).

**Ruling (A), 2026-11-05.** Four of §11.1's swaps live in shared code
that `/scenario/` also bundles (`views/copy.json`, `views/stats-table.ts`),
and `copy.json` is the PDD copy deck. Applying them there would have
changed the `/scenario/` bundles, which must stay byte-identical, and
amended the copy deck. The planning session ruled, under the owner's
overnight delegation of 2026-11-05: the guided page gets the full
adopted wording through a guided-only copy layer; `copy.json`, the PDD
copy deck and `/scenario/` stay unchanged. Adopting the wording for
`/scenario/` too (option B) is on the owner's morning list, with the
slip Minimum "Required" mark (audit entry 16).

**The copy overlay.** `src/explore/copy-overlay.ts` maps copy.json keys
to their adopted texts with the same slots. `guided()` turns each
registry template, slots captured, into the adopted one, and
`guidedSvg()` does the same through a chart's tree. The guided page
applies them to the shared builders' output only: notices and caveats,
statistics row labels, chart accessible names and axis titles, the
histogram-table caption, and the cumulative caption. A registry edit
that changes a key's slots fails loudly. Adopting option B later means
moving these texts into copy.json and deleting the calls.

**Wording (§11.1).** On the guided page:

- "matching records" → "matching simulation stages" (singular "stage"),
  with the same term in the statistics hint, the empty-result heading,
  the status lines, the introduction, and the no-measurement notice;
- "valid measurements" → "measurements used" (singular "measurement
  used"), in the panel count, the small-result and suppression notices,
  the chart names and axis, the table caption, and the cumulative note;
- "Valid count" → "Measurements used"; "Excluded null count" →
  "Missing values (excluded)";
- "Corresponding fault slip at depth" → "Estimated fault slip at depth";
- "Your window includes" → "Your selected range includes";
- "Histogram bin data" → "Histogram counts by value range";
- "Browse freely" → "Exit walkthrough";
- "Download results" → "Download data (ZIP)", described by "Matching
  simulation stages, statistics, scenario settings and sources.";
- the normalization phrase → the audit's two messages, chosen by the
  rule the entry broke: "Enter 0 or a positive number, such as 0.5."
  for malformed text, and "Use at most 16 characters, counting the
  decimal point and the 0 before it." over either length limit. The
  limits themselves are unchanged.

The ZIP's contents are unchanged, including provenance.txt's "matching
records: {count}", as the audit asks for export contents.

**Presentation (§11.2).**

- Results: "Your confirmed scenario" opens with its count, a compact
  two-line summary in the review's own labels, and the partial-coverage
  warning. The caveats and the unapplied-changes bar stay where they
  were. Measurement choices, the chart and the statistics follow; **View
  full scenario** comes after them, holding the full summary, the stage
  explanation and the conversion table. It starts closed, keeps its open
  state across re-renders, and is not persisted.
- Walkthrough: "Results walkthrough · n of 5"; Back and Next repeat after
  the stop's content.
- Help: the four site-condition disclosures repeated their visible
  sentence word for word, so each gives way to the existing "Read the
  glossary" link at the end of that sentence. The two movement
  disclosures add information and stay.
- The Scarp dip card carries "Provisional data", the opening words of the
  §5.4 notice, before selection.
- Density reads Dense, Medium, Loose in the choices and every summary;
  each choice keeps its own value.

**Audit dispositions (all 75 entries).**

- Addressed in G-20: 8, 11, 17, 33, 34, 35, 40, 55, 56 (the repeated
  Back and Next; not sticky), 61.
- Addressed in part (the parts §11.1 names): 19 ("Estimated fault slip at
  depth"; "Simulation coverage / Fully covered / Not covered" not
  adopted), 37 (the range wording; the rest of the sentence unchanged),
  45 (the summary, and "measurements used" in the caption; "bin" stays),
  59 ("measurements used" in the notices; thresholds and behaviour
  unchanged), 75 (singular and plural for the new guided counts only).
- Done in G-18 and G-19 (D-43, D-44): 25, 26, 27, 28, 32; 29 in part (the
  shared sentence under CR-10).
- For G-21 (§11.3): 12, 64, 67.
- Keep, no change needed: 1, 5, 13, 15, 22, 23, 31, 42, 48, 50, 51, 52,
  54, 60, 62, 63, 74.
- Research, held for the research group: 9, 10, 29 (the rest), 38 (D-46,
  proposed), 39.
- Not adopted by D-45: 2, 3, 4, 6, 7, 14, 16, 18, 20, 21, 24, 30, 36, 41,
  43, 44, 46, 47, 49, 53, 57, 58, 65, 66, 68, 69, 70, 71, 72.
- Existing open item: 73 (D-10, the liability text).

**Approvals, 2026-11-05.** Approved under the owner's overnight
delegation of 2026-11-05, relayed by the planning session:

- ruling (A), and the scope reading above (dispositions, entry 16 left
  out);
- the two refused-number messages and the download description, exactly
  as listed above;
- the overlay texts, with one substitution: the cumulative note ends
  "Statistics and percentile read-offs rely on all measurements used for
  this scenario.", avoiding a use/used echo;
- the guided count wording, the compact summary, the "Provisional data"
  mark, the help change, the walkthrough label and repeated navigation,
  and the density order;
- keeping "bin" in the table caption, and leaving the ZIP's contents
  unchanged.

**Review.** The independent review found nothing blocking and
confirmed that nothing under `src/views/` or in any `/scenario/`-only
file changed. Its findings, applied:

- the chart overlay scanned every attribute, a full cumulative polyline
  included, on each slider move (about 0.2 s a call in its timing); it
  now rewrites only accessible names and text, and skips a template
  whose literal text is absent;
- an empty or multi-line slot, or one ending a template, could fail to
  match silently; the patterns now cover them;
- with both slip entries refused, the alert repeated the same message;
  it now says each distinct message once, and each field keeps its own
  error and description.

Left as they are: the stage explanation's "record" wording next to the
new terms, which §11.1 does not list.

Tests and specs:

- Overlay tests: every key exists and the registry keeps its own text;
  filled registry texts become the adopted ones with their slots,
  inside markup too; a chart tree is rewritten in attributes and text;
  no adopted text keeps the replaced wording.
- State tests: each refused entry gets the message for the rule it broke,
  in both modes.
- The new `explore-polish` spec, in both lane projects: the results
  order and the compact summary, the warning visible and the table
  behind the disclosure, its open state across a re-render; the adopted
  wording on the page, the shared builders' output included, and none of
  the replaced wording; the download's description; the Scarp dip mark;
  density order; the help change; the two messages in the browser; Exit
  walkthrough. The walkthrough spec checks the label and the repeated
  navigation at every stop, and uses the lower Next once. Specs asserting
  the old strings were updated.

At this verification, on `task/g-20-wording-polish` rebased onto
`5e863e1`:

- The pinned Node suite passed all 447 tests; typechecking and the
  bundles passed. Strict publication and preview builds passed with
  `explore-504bd1c8f6a1.js` and `explore-2957d9d013fd.css`. The
  `/scenario/` bundles `app-26490347afd0.js` and `app-08bebc049c15.css`
  were unchanged, as ruling (A) requires. All 31 hook tests passed.
- Relative links resolved (5,511 in 61 files), PDD agreement passed with
  the copy deck untouched, and traceability reported no gap rows.
- The guided specs passed 118 of 118 in `desktop` and `mobile` before
  the review fixes. The polish, walkthrough, and layout specs passed 72
  of 72 over three repeats after them.
- The full lane passed 269 and skipped 5, with one failure outside G-20:
  the pre-existing `a11y.spec.ts` `.md-top` contrast check on
  `/scenario/` (load average about 15), recorded under G-18 and assigned
  to G-21.

Not verified: screen-reader reading of the new layout and labels,
touch, and engines other than Chromium.

### Defects and the `.md-top` determination, 2026-11-05 (G-21)

G-21 ran under the D-45 release and the owner's addition of
2026-11-05, after G-20, to guided DDD §11.3. The strings below are the
audit's own, which D-45 approves verbatim.

**Disclosure icon overlap.**

- Before: every guided summary had `padding-left: 0` from the explorer's
  stylesheet, while the theme draws its info icon absolutely at 12–32 px
  and its chevron at the right. Measured on the sample trigger and the
  help disclosures, the label started at 0 px, under the icon (audit
  entry 12).
- After: guided summaries keep the theme's own clearances, 2rem on the
  left and 1.8rem on the right, in rem so they scale with the icon
  (the theme sizes `html` at 125–150%, and readers may raise the
  default font). Measured on every visible guided disclosure, on Site
  conditions, Fault movement and Results, closed and open, and again
  with the page font at 170%, each label clears the icon and the
  chevron.
- `/scenario/`'s disclosures were already clear (its own styles reserve
  the space; measured on Advanced, the population help, and the chart
  data), so it needed no change and its bundles are unchanged.

**A first failed calculation.**

- Before: any calculation failure said "Your previous confirmed scenario
  and results have been kept", even when there were none.
- After: "We couldn’t calculate results. Your entries are still here.
  Select Show results to try again." On a recalculation with results
  standing, "Your previous results are unchanged." comes before the last
  sentence. The generic action error says "Your confirmed results have
  not changed." only when results exist.

**Version mismatch.**

- Before: the message said to reload the page, but its only control was
  **Try loading again**, which reran the same load.
- After: a data or schema version mismatch says "This page and its
  simulation data use incompatible versions. Reload the page to try
  again. No results have been calculated." and offers **Reload page**,
  which reloads. A loading failure keeps its message and **Try loading
  again**.

**The `.md-top` determination: a measurement artifact.** The recurring
axe report (`color-contrast (serious): .md-top` in `/scenario/`'s
unavailable and incompatible-settings states, G-18 to G-20) was measured
directly:

- In both states the page has scrolled when it mounts (by 84 px and
  261 px), so the theme reveals its Back to top button with a 125 ms
  opacity fade. Sampled 150 ms apart from the mount, its opacity read
  0.15, then 1.
- Settled at opacity 1, axe's contrast rule passes on the button
  (`rgba(0, 0, 0, 0.54)` on white).
- Mid-fade, the same rule fails at 1.67:1 (`#c8c8c8` on white): the text
  blends toward the background. A loaded machine (load average 11–15)
  let axe run inside the fade; an idle one did not, which is why the
  report came and went.

The contrast does not genuinely fail, so no style changes. The spec is
stabilized instead: the a11y suite's axe helper waits two frames (the
scroll handler that starts the fade runs a frame after the mount), then
until no finite animation or transition is left running, before
measuring. Infinite ones, such as spinners, and paused ones are not
waited for. No exclusion was
needed. A new test holds the button's fade-in partway with the Web
Animations API and shows both sides: mid-fade the rule reports the
violation, settled it passes, and the suite's helper then measures the
whole state clean.

**Review.** The independent review found nothing blocking and
confirmed that only `src/explore/` and specs changed. Its findings,
applied:

- the first padding was in pixels while the theme sizes its icon in rem,
  so a larger default font would have brought the overlap back; the
  padding is now the theme's rem clearances, and the spec checks a
  larger font;
- the settled wait took one snapshot without waiting a frame, so it
  could miss a fade starting a frame later, and a paused animation would
  have hung it; it now waits two frames, loops, and skips paused ones;
- the calculation message decided on earlier results after the attempt;
  it now records whether they stood before it.

Noted, not changed (outside §11.3's three defects; for the owner):
- a missing page attribute or an error while setting up the explorer
  lands in the loading-failure branch, whose retry cannot fix it;
- mid-session, a version mismatch in the offset-conversion data still
  shows the conversion's retry message and control.

Tests and specs:

- The new `explore-defects` spec, in both lane projects:
  - every visible guided disclosure clears the icon and chevron, on
    three steps and with disclosures open;
  - a first failed calculation (conversion data served without the 20°
    coefficients, so the calculation fails while the steps before it
    render) says the new message and nothing about earlier results;
  - a failed recalculation with results standing says they are
    unchanged, and they are;
  - a version mismatch offers only **Reload page**, which reloads into
    a working explorer; a loading failure keeps **Try loading again**,
    which loads again.
- `a11y.spec.ts`: the settled helper, and the deterministic fade test.

At this verification, on `task/g-21-defects` over `5134164`:

- The pinned Node suite passed all 447 tests; typechecking and the
  bundles passed. Strict publication and preview builds passed with
  `explore-f5518d58970e.js` and `explore-1430b85a9dd0.css`. The
  `/scenario/` bundles `app-26490347afd0.js` and `app-08bebc049c15.css`
  were unchanged. All 31 hook tests passed.
- Relative links resolved, PDD agreement passed, and traceability
  reported no gap rows.
- The full lane passed 281 and skipped 5, with no failure, twice in a
  row, at load averages of 14 to 16: the conditions in which the
  `.md-top` report used to appear. The a11y and defects specs passed 108
  of 108 over three repeats in `desktop` and `mobile`, at load averages
  of 15 to 19. Before the review fixes, two full lanes had also passed
  281 with no failure.

Not verified: screen-reader reading of the new messages, touch, and
engines other than Chromium; the fade test uses the Web Animations API
as Chromium implements it.

### Readiness guidance and a new scenario, 2026-11-05 (G-22)

G-22 ran under the D-47 release, after G-21, to guided DDD §§12.1–12.2.

**Strings: the owner's approval.** The owner approved these verbatim on
2026-11-05, in person, through the planning session, having seen the
screenshots. This was the owner's own approval, not a delegated one.

- Still-needed line: "Still needed: {names joined by ' · '}.", for
  example "Still needed: Sediment depth · Sediment density."
- Summary after an unsuccessful click: "Choose values for {n} conditions
  before continuing.", and for one condition "Choose a value for 1
  condition before continuing."
- Condition names, used as the links: Fault angle, Sediment depth,
  Sediment density, Sediment strength and structure, Minimum fault slip,
  Maximum fault slip, Maximum surface offset, Scarp types, Simulation
  stages.
- New-scenario announcement: "New scenario. Build your scenario or try a
  prefilled sample." It replaces "New scenario. Choose one or more values
  for each site condition."
- The step list changes no strings.

The owner also approved the seven interpretations below, which §12.1
leaves open:

- **Placement.** The line and the summary share one slot directly above
  the forward footer. The summary replaces the line after an unsuccessful
  click and shrinks as each condition is corrected. Once it is empty, the
  line resumes.
- **Where.** The guidance appears on Site conditions, Fault movement, the
  Results refinements and the walkthrough's two editing stops. It covers
  the current step's conditions only. A block found on another step keeps
  its routing to that step, which then shows its own summary.
- **Links.** A group's link focuses its fieldset, and a numeric field's
  link focuses the input. Neither is a navigation: the fragment never
  reaches the theme's instant navigation.
- **Announcements.** The summary takes the focus and is read from there.
  An unsuccessful click no longer also writes the alert region. The one
  exception is a block landing on the review step, which has no slot:
  there the alert still says the messages.
- **Movement.** The summary takes the focus on this step too. Numeric
  fields keep their own `aria-invalid` and outline.
- **Group emphasis.** An empty site group shows a red boundary with a
  heavier left edge, plus its message. The scarp-types group shows a red
  left edge. The checkboxes carry no invalid mark.
- **Start a new scenario.** It lands on the opening step with focus on
  its heading, and only step 1 is open in the list. The blocked-record
  fresh start lands there too, offering both entry points.

Considered and left unchanged (owner choice, 2026-11-05): the
walkthrough's Back stays disabled at its first stop. It is bounded tour
navigation, not a progression refusal, and outside D-47's scope.

**Before and after.**

- Before: an unsuccessful Continue focused the first group's Select all.
  Every checkbox of an empty group, Select all included, carried
  `aria-invalid` and a red outline. The alert repeated each message, and
  nothing near the button said what was missing before the attempt.
- After: the neutral line names what is missing before any attempt, with
  no red marking on arrival. An unsuccessful click shows the summary and
  focuses it, and the per-group messages stay. The group boundary carries
  the error. A corrected condition clears its message and its summary
  entry at once. A movement edit also clears another field's message
  once it no longer holds, for example lowering the minimum below the
  maximum. Leaving a step ends its attempt.
- Before: unreached steps, and Results before results existed, were
  disabled buttons in the step list.
- After: they are plain non-interactive entries with a dashed number.
  The step list's click behavior is unchanged.
- Before: Start a new scenario landed on Site conditions, past the only
  sample entry point.
- After: it lands on the opening step.
- The forward actions stay enabled. Show results still disables only
  while it calculates.

**Review.** The independent review found nothing blocking. It confirmed
that only `src/explore/` and the specs changed, and that Material's
instant navigation listens on the body in the bubble phase, so stopping
the link click at the explorer keeps the theme from handling it. Its
findings, applied:

- **Walkthrough stops.** The Scarp-types stop's line also showed at the
  Stages stop, where its link had no target. Each stop now names only
  the field it shows.
- **Review-step fallback.** A block falling back to the review step
  announced nothing. It now says the messages.
- **Focus.** Readiness links had no ids, so an asynchronous re-render
  could drop their focus. They now carry ids.
- **Cross-field correction.** A movement correction to the other end left
  the corrected message standing. It now clears.
- **Smaller fixes:**
  - the summary's title is a heading;
  - the fieldset no longer repeats its checkboxes' description;
  - leaving a step ends its attempt;
  - a current step shown as an entry keeps its highlight;
  - the invalid boundary no longer shifts the layout;
  - the link handler finds its target from the field, not from the href.

The re-review of those fixes found no blocking or should-fix issue. Of
its nits:

- Applied: selecting the current step's own entry in the step list no
  longer ends its attempt.
- Applied: under forced colors, which draw no box-shadow, the invalid
  site-group boundary thickens instead.
- Noted, not changed: the scarp-types emphasis still widens its left
  edge, which moves its contents by a few pixels.
- Noted, not changed: a repeated identical block on the review step
  rewrites the alert with the same text, which some screen readers may
  not repeat. The behavior predates this task.

**Implementation note.** In the first build the readiness links' fragment
reached the theme's instant navigation, which remounted the explorer and
lost the focus and the summary. The explorer now handles the click
itself, and a spec checks that the URL is unchanged.

Tests and specs, in both lane projects:

- `explore-validation`:
  - the line before an attempt and its updates;
  - no red marking on arrival on either step;
  - links that focus their group or field without changing the URL;
  - the summary's group role, name, heading, links, focus and shrinking;
  - group boundaries without checkbox invalid marks;
  - numeric fields keeping theirs;
  - the cross-field correction;
  - the attempt ending when the step is left;
  - closed step entries;
  - a new axe pass over the line, the site summary and the movement
    summary, scoped to the explorer's region.
- `explore-validation` also checks that the step's own list entry keeps
  the attempt.
- `explore-walkthrough`: each editing stop's own line, and the empty
  scarp-types attempt focusing the summary.
- `explore-draft-boundary`, `explore-continuity`, `explore-sample` and
  `explore-layout`: Start a new scenario at the opening step, with its
  announcement, both entry points and closed steps. The layout pass adds
  the opening step after a reset, the line and the summary.
- `explore-journey` and `explore-race`: closed steps are asserted as
  entries, not disabled buttons.

At this verification, on `task/g-22-guidance` at `468d6b1`, over
`2821ac0`:

- **Build and unit tests.** The pinned Node suite passed all 447 tests,
  and typechecking and the bundles passed. The strict publication and
  preview builds passed, with `explore-072b6d043fa4.js` and
  `explore-78aa7a0b997c.css`. The `/scenario/` bundles
  `app-26490347afd0.js` and `app-08bebc049c15.css` were unchanged. All
  31 hook tests passed.
- **Document checks.** Relative links resolved, PDD agreement passed,
  and traceability reported no gap rows.
- **Lane.** The full lane passed 283 and skipped 5, with no failure,
  twice in a row, at load averages of 15 to 16.
- **Guided specs.** All 130 passed in `desktop` and `mobile`.
- **Earlier runs.** Before the re-review nits, the same commands had
  passed at `2278970` (283 twice, 130) and at `444a2e0` (283 twice,
  130).

Not verified: screen-reader reading of the line, the summary and the
step entries; touch; engines other than Chromium.

### Review-round fixes, 2026-11-05 (G-23)

G-23 ran under the D-47 release, after G-22's merge, to guided DDD
§§12.3–12.7.

**Strings.** The only changed string is the mode-switch note, approved
verbatim in §12.7: "The sample has separate example values for each
mode; one is not converted from the other. Switching modes can change
the results." No other string was added or changed, so nothing else
passed through the gate. copy.json and the copy deck are untouched: the
note is the guided-only `MODE_NOTE`. The historical row quoting the
earlier note (G-18) stays as written. §12.7 supersedes that row's text.

Measured in Chromium. "Desktop" is the lane's desktop project at
1280 × 720.

**The floating Back to top control (§12.3).**

- Before: on the movement step, the theme's control was rendered
  (`display: block`) and revealed on scrolling up, floating over the
  content, as the owner's screenshot showed.
- After: on the guided page the control is not rendered
  (`display: none`). It is gone from view, from the tab order and from
  the accessibility tree.
- How:
  - The rule sits in the guided stylesheet, which only the guided page
    loads, inside its content. A `body:has(#gre-explore)` scope keeps it
    to a page that holds the explorer.
  - The glossary, reached from the guided page by the theme's instant
    navigation, and the existing explorer still render and reveal it.
  - G-21's settled-wait axe helper is unchanged for the pages that keep
    the control.

**Sample dialog actions (§12.4).**

- Before: at 1280 × 720 the dialog scrolled as a whole. **Use this
  sample** and **Cancel** sat at 1,449 px (lower fault angles) and
  1,458 px (steeper fault angles) from the viewport's top, below the
  preview.
- After: the dialog's body scrolls under a persistent footer. The
  actions sit at 638–685 px for both samples, inside the 720 px viewport
  and uncovered, at the top of the preview and at its end. The body
  scrolls about 1,430 px of preview in 606 px. The photograph, the
  background and the sources stay in the preview, per §10.2.
- The replacement question uses the same footer.
- Below 280 px of viewport height (for example 1280 × 720 at 400% zoom)
  a fixed footer would leave the preview almost no room. There the whole
  dialog scrolls instead, so the actions are never clipped. A 568 × 320
  landscape phone keeps the footer.

**Required marks (§12.5).**

- Before: "Minimum (m)" carried no mark and "Maximum (m)" carried
  Required, although clearing the minimum blocked review.
- After: both read "Required". The initial minimum stays 0. A cleared
  minimum still blocks review with "Enter the minimum fault slip in
  metres."

**Explanation styling (§12.6).**

- Before: the sample notice, the per-field annotations and the mode note
  used the warning-family wash: background `#fff5df` with a `#bc966b`
  edge.
- After: they use the neutral wash: background `--gx-wash` (`#f5f1eb`)
  with a `--gx-muted` (`#605b58`) edge.
- Text contrast on that wash:

  | Text | Contrast |
  | --- | --- |
  | Ink | 13.2:1 |
  | Muted | 5.95:1 |
  | Links | 7.8:1 |

- Coverage and interpretation warnings keep `.gx-warning` (`#fff2ed`
  with a `#ad4b33` edge).
- Other tan-edged elements stay as they are, because §12.6 names only
  the three explanations: the dialog frame, the pending-changes banner,
  the log-scale notice and the provisional flag.
- Axe passes over the explorer with the notice, the annotations and the
  note shown, in both lane projects.

**Mode-switch note (§12.7).** Before: "The two modes are separate
assumptions. Each selects a different set of simulations, so results can
differ." After: the approved text above.

**Review.** The independent review found nothing blocking and confirmed
that only `src/explore/` and the specs changed. Its findings, applied:

- **Back to top spec.** It could not fail, because the theme hides the
  control by opacity, which Playwright counts as visible. It now asserts
  the computed display on each page, and the theme's reveal where the
  control stays, scrolling up in steps as the theme needs.
- **Short viewports.** At very low heights the footer could crowd out
  the preview or be clipped. The fallback above handles this.
- **Smaller fixes:**
  - the spec reaches the movement step it describes;
  - it uses the suite's `setChecked`;
  - redundant assertions are gone;
  - the dialog body gets scroll padding and no trailing margin;
  - the note's two comments are merged into one.

Two re-reviews followed, and the second found nothing further. The
first re-review confirmed those fixes and the 280 px threshold. It added
two items, both applied:

- the existing-explorer leg now waits for that app's mount, whose scroll
  to its panel could otherwise race the reveal;
- the 320 × 180 spec asserts the fallback itself: the dialog is the only
  scroller, the title shows at the top and Cancel once scrolled to.
  Before, it would have passed without the fallback.

Also applied from the first re-review: scroll padding on the dialog
inside the fallback, and wording that no longer claims "never clipped".

Not applied, the second re-review's optional suggestion: resetting the
dialog's scroll before the title check. That check is deterministic in
the pinned Chromium.

Tests and specs, in both lane projects:

- The new `explore-review-round` spec covers:
  - Back to top: hidden on the guided page, rendered and revealed on the
    glossary (after instant navigation) and on the existing explorer;
  - each sample's dialog: actions in view and uncovered at both ends of
    the scrolling preview, and the dialog itself not scrolling;
  - the short-viewport fallback at 320 × 180;
  - both Required marks, the initial minimum, and the cleared minimum's
    block;
  - the neutral wash on the three explanations, with `.gx-warning`
    keeping caution on a coverage warning;
  - the §12.7 text;
  - axe over the explanations and over the dialog with its footer.
- `explore-sample`: the mode-note constant is the §12.7 text.

At this verification, on `task/g-23-review-fixes` at `2012f3a`, over
`a906a18` (G-22's merge):

- **Build and unit tests.** The pinned Node suite passed all 447 tests,
  and typechecking and the bundles passed.
- **Site builds.** The strict publication and preview builds passed,
  with `explore-4aad44a22392.js` and `explore-b60ac1064581.css`.
- **Unchanged.** The `/scenario/` bundles `app-26490347afd0.js` and
  `app-08bebc049c15.css` did not change.
- **Hooks and document checks.** All 31 hook tests passed. Relative
  links resolved, PDD agreement passed, and traceability reported no
  gap rows.
- **Lane.** The full lane passed 297 and skipped 5, with no failure,
  twice in a row, at load averages of 14 to 15.
- **Guided specs.** All 144 passed in `desktop` and `mobile`. The new
  spec also passed 70 of 70 over five repeats in both projects.
- **Earlier runs.** The same commands had passed at `f771352` (295
  twice, 142) and at `84b07e2` (297 twice, 144).

Not verified: screen-reader reading, touch scrolling inside the dialog,
real zoom (the short-viewport case was set by viewport size), and
engines other than Chromium.

### Result report, 2026-11-05 (G-13)

G-13 ran under the D-48 release, after G-23's merge, to guided DDD §13.
The guided download (FR-D1) now carries `report.docx` as a fifth
member, after the four DDD §5.9 members. The shared `packageTexts` and
`zip.ts` are unchanged. The report is guided-only.

**What was built.**

- `src/explore/report.ts` assembles the report as a stored ZIP with the
  §13.4 part set: `[Content_Types].xml`, `_rels/.rels`,
  `word/document.xml`, `word/_rels/document.xml.rels`, and one
  `word/media/chart-n.png` per chart. It uses direct formatting only,
  with no styles part.
- The fixed chart set is a distribution histogram (linear) and a
  cumulative curve (no read-off marker) for each measurement the page
  charts.
- Rasterizing is injected. In the browser, `src/explore/rasterize.ts`
  draws each chart's SVG on a canvas at twice its 600 × 300 CSS px, on
  white, and encodes it as PNG. A chart that has not finished after
  10 s counts as a failure.
- The page and the report draw charts through one guided builder,
  `src/explore/charts.ts`. The axis-title tweaks moved from DOM edits
  into that builder, with the same output.
- Guided wording that the page and the report share sits in
  `src/explore/wording.ts`, so the report says nothing in a second
  wording (§13.7).
- **Fallback (§13.5).** If the report cannot be built, including a
  non-PNG raster or a failure while writing the outer archive, the
  download is the four-member archive and the status line is the
  §13.7 failure line. A failure before the four members exist still
  fails the whole download with the existing error message.
- **Busy and stale results (§13.1).** A second activation while the
  archive is assembled is ignored. If the result changes during
  assembly, nothing is delivered and the newer status stays.
- `test/zipcheck.py` gains `--members=`, accepting only the four-member
  layout or the four plus `report.docx`. For the nested report it checks
  stored entries, the part order, well-formed XML, PNG signatures, the
  content types, and that every image relationship is used exactly
  once. It runs under Python 3.9.

**Strings and interpretations: the owner's own approval (2026-11-05,
relayed by the planning session).**

- The four §13.7 strings, as drafted:
  - the hint under **Download data (ZIP)**: "Matching simulation stages,
    statistics, scenario settings and sources, with a Word report of
    this result (report.docx).";
  - the failure line: "Your data download is ready. The Word report
    could not be built this time, so the archive holds the data files
    without it.";
  - the title: "Ground Rupture Explorer — result report";
  - the heading: "Provenance".
- Interpretations (a)–(m), where §13 leaves wording or layout open:
  - (a) The count line uses the §11.1 count wording, e.g. "N = 2,770
    measurements used of 2,880 matching simulation stages (110 missing
    values excluded)", with singulars where they apply.
  - (b) The scenario summary is `summaryText` without its trailing
    matching-records token.
  - (c) Each caption opens with "{label with unit} · {view name}".
  - (d) The versions line uses the provenance labels' words: "Software
    version: X · Data-export version and date: Y (date)". The title
    block's line is "Generated (UTC): {instant} · {versions line}".
  - (e) "Cite: Chiama et al. (2025)" has no pointer phrase. The full
    citation is in the Provenance section.
  - (f) The cumulative chart has no read-off marker. The shared median
    and 84th-percentile marks stay.
  - (g) A legend line under each histogram: each scarp type after a ■
    in its palette colour.
  - (h) The width section carries the width-scope note and the dip
    section the provisional notice, then the small-result warning, in
    the page's order.
  - (i) Below the chart floor, the page's suppression or no-valid
    notice prints once, after the statistics table, in place of both
    charts.
  - (j) The empty state prints "No matching simulation stages" and the
    explainer paragraphs, without the page's instruction to change a
    condition.
  - (k) The unclassified line (PDD §4.3) appears under each table,
    without the page's missing-values hint.
  - (l) The Provenance section reproduces `provenance.txt` verbatim, in
    registry wording, so its caveats can differ from the page's guided
    overlay.
  - (m) US Letter with 1-inch margins; charts at 6.25 in, rasterized
    at 2× on white; Word's default font; each image's alt text is the
    chart's accessible name.

**Word check: passed on both samples (the owner's own, 2026-11-05).**
Both samples were built by the lane's Chromium from real downloads:

| Sample | sha256 |
| --- | --- |
| Lower fault angles (`report-illustrative.docx`) | `375415ef0b8bf52e42f77c2a2cf84a133923e42b4e668a78eef65293e30ae833` |
| Steeper fault angles (`report-kern.docx`) | `bafb9f4fa3f565f30ded262e665f146788ceab1496c08e58855a7406ff2135ad` |

The one change asked for: the title block's summary line becomes a
scenario table (the §13.2 item 1 amendment). The table has one row per
summary condition in the summary's order, the label column bold and
shaded light gray (`E7E6E6`) by direct formatting, and each value in
its summary token's own words. The captions keep the one-line summary.
The owner looked at the updated sample, `report-kern-table.docx`
(`527e8f43fbdfe286d96f729e96014de56629eeea4221ef3b06e5e51338a1a264`),
and answered "Looks right" (the owner's own, 2026-11-05). An earlier
relay of the Kern hash carried a transcription slip. The value above
was re-verified from the file.

**Table labels: decided by the planning session, amendable by the
owner.** The amendment first named "the §6.1 setting names", but §6.1
has no such list, and the sample used the PDD §3 input names. The
owner's answer did not pick a set. The planning session decided, under
§13.7's no-second-wording rule, on the guided page's own condition
names (the compact summary's wording): Fault angle, Sediment strength
and structure, Sediment depth, Sediment density, Maximum surface offset
or Fault slip (by the scenario's mode), Simulation stages, and Scarp
types. The amended §13.2 line reads accordingly. This was not the
owner's own pick, and the owner may amend it. The swap changed labels
only. No sample was regenerated for a further gate, per the planning
session.

**Stamps: routed to the owner, outside G-13.** The owner noticed
"Software version: 0.2.0". It comes from `CITATION.cff`'s
`version: 0.2.0`, which the MkDocs build injects into both pages. The
data stamp `data-v1` is the published vintage tag. Both are site-wide
and pre-existing, and the report mirrors them as §6.2 requires, so
G-13 changes nothing there. A version bump, if any, is the owner's own
edit.

**Review.** The independent review found nothing blocking. Its
findings, applied in `042b402`:

- **Stale delivery.** A result replaced during assembly could still
  deliver the older archive and overwrite the newer status. Both paths
  now check that the result is unchanged.
- **Hung rasterizer.** A canvas that never answered left the button
  busy forever. The 10 s timeout now falls back to the four files.
- **Outer archive.** Writing the outer archive sat outside the
  fallback. It is now inside it.
- **Test gaps.** The tests now assert the main-document content
  override, unique drawing ids, the no-valid branch, determinism
  across a recomputed result, and the curve without a read-off.
  `zipcheck.py` checks `[Content_Types].xml`.

Not changed, the review's note that the Provenance section prints
every caveat in registry wording rather than the page's filtered,
guided set. That is approved interpretation (l).

**Interpretation (l) narrowed (2026-11-06, G-25).** The owner's
G-25 release requires the report to show the decided §5.9 text,
and §13.7's rule — the report introduces no second wording for
anything the page already says — points the same way: the
report's Provenance lines now render through the guided overlay,
so every overlaid string (today the low-slip caveat and the
small-result warning) reads as the page says it, while
`provenance.txt` in the same archive keeps the registry wording
untouched. The rest of (l) stands. Decided by the planning
session from the released row; amendable by the owner on sight.

Tests and specs:

- `test/explore-report.test.ts` (18 tests) covers:
  - the part set, content types, relationships and drawing ids;
  - determinism and the rasterizer calls;
  - the document's order;
  - the scenario table's labels in both modes, its values and its
    shading;
  - provenance, captions, statistics labels and notes;
  - the chart set, the suppression and warning mix, the no-valid case
    and the empty state;
  - a snapshot of `word/document.xml`;
  - the archive's members and the fallback for a throwing and a
    non-PNG rasterizer;
  - a failure before the four members;
  - `zipcheck.py` on both layouts, wrong digests and a broken nested
    report.
- The new `explore-report` spec covers, in both lane projects:
  - each sample's archive: `zipcheck.py` under the guided layout, one
    1200 × 600 PNG per drawn chart, the table's labels, captions and
    accuracy statements, the count lines and the generated line;
  - a failing canvas: the four files and the failure line;
  - a second click while assembling: one download;
  - a new scenario while assembling: nothing delivered, the newer
    status kept;
  - a canvas that never settles: the four files after the timeout,
    and the button free again.
- `explore-download`, `explore-log-scale` and `explore-polish` now
  expect the five-member archive and the new hint.

At this verification, on `task/g-13-result-report` at `5d0122a`,
rebased over `f93cede` (the owner's §13.2 amendment):

- **Build and unit tests.** The pinned Node suite passed all 465 tests,
  and typechecking and the bundles passed.
- **Site builds.** The strict publication and preview builds passed,
  with `explore-868e5ed51aa8.js` and `explore-b60ac1064581.css`.
- **Unchanged.** The `/scenario/` bundles `app-26490347afd0.js` and
  `app-08bebc049c15.css` did not change.
- **Hooks and document checks.** All 31 hook tests passed. Relative
  links resolved, PDD agreement passed, and traceability reported no
  gap rows.
- **Lane.** The full lane passed 309 and skipped 5, with no failure,
  twice in a row, at load averages of 12 to 17.
- **Guided specs.** All 156 passed in `desktop` and `mobile`.
- **Earlier run.** The same commands had passed at `5921a30`, before
  the review fixes and the table (463 Node tests; lane 305 twice;
  guided 152).

Not verified:

- Word itself, by me. The Word check is the owner's, on the two
  original samples. The table sample had the owner's look, and the
  final labels had no sample gate.
- Other word processors (LibreOffice, Pages, Google Docs).
- Screen-reader reading of the document.
- Browsers other than Chromium, including Safari's canvas encoding.

### Decided low-slip caveat, 2026-11-06 (G-25)

G-25 ran under the owner's release of 2026-11-06 (`059efdb`), after
G-13's merge, to PDD §5.9's decided replacement (D-4, Decided
2026-11-06).

**String.** The guided overlay's `pdd5.9.lowSlipCaveat` entry now
holds the research group's own text, verbatim from PDD §5.9: "Low-slip
measurements may be less reliable. Below 0.5 m of fault slip, surface
deformation can be difficult to distinguish from model roughness.
These values are shown, but interpret them with caution." It replaces
the D-45 variant ("Your selected range includes very small slip
values, …"). The text is the group's, decided under D-4, so no string
went through a gate. `copy.json` and the copy deck keep their bytes,
per PDD §3.7's supersession pattern.

**The report (interpretation (l) narrowed).** Before: the report's
Provenance section printed `provenance.txt` verbatim in registry
wording (G-13's interpretation (l)), so an overlay-only change would
have left `report.docx` showing the registry caveat while the page
showed the decided one. After: each Provenance line passes through
the guided overlay, so the report shows the decided caveat, as the
released row requires and §13.7's no-second-wording rule asks. Any
other overlaid line there now reads in the guided wording too: today
the small-result warning. `provenance.txt` in the same archive still
carries the registry wording, untouched, from the shared
`packageTexts`. The planning session relayed this reading of the row
(2026-11-06). Its dated note narrowing (l), in the G-13 evidence, and
the G-25 row amended to name the mechanism landed in the owner's commit
`deb154d`, before this merge.

**Review.** The independent review found nothing blocking.

- It compared the overlay text with PDD §5.9 byte for byte.
- It checked every overlay literal against what `provenanceText` can
  emit, and found the low-slip caveat is the only Provenance line the
  overlay can change.
- It confirmed the fixtures fire the caveat where the tests say they do.
- A mutation that removed the overlay pass failed both new report tests.
- Its one note is about the owner's guided DDD, which this task does not
  edit: §11.1's wording table still lists "Your window includes →
  Your selected range includes" with no note that D-4 supersedes it
  for the low-slip caveat. That note was routed to the planning
  session.

Tests and specs:

- `explore-copy-overlay`: the overlay maps the registry caveat to the
  decided text exactly.
- `explore-report` (19 tests):
  - the Provenance lines are `provenance.txt`'s lines through the
    overlay, for a result with and without the caveat;
  - a low-slip window puts the decided text in the report once and
    the registry text nowhere in it, while `provenance.txt` keeps the
    registry text;
  - a result without a low-slip window carries no caveat.
- `explore-polish` (both lane projects): the page's warning shows the
  decided text.
- `explore-report` spec (both lane projects): each sample's report
  shows the decided text and not the registry one, and its
  `provenance.txt` keeps the registry text.

At this verification, on `task/g-25-low-slip-caveat` at `08e3e48`,
over `059efdb` (the owner's release). The branch was then rebased onto
`deb154d`, which changes documents only; the document checks passed
again there:

- **Build and unit tests.** The pinned Node suite passed all 466 tests,
  and typechecking and the bundles passed.
- **Site builds.** The strict publication and preview builds passed,
  with `explore-1c2030edc2e9.js` and `explore-b60ac1064581.css`.
- **Unchanged.** The `/scenario/` bundles `app-26490347afd0.js` and
  `app-08bebc049c15.css` did not change.
- **Hooks and document checks.** All 31 hook tests passed. Relative
  links resolved, PDD agreement passed, and traceability reported no
  gap rows.
- **Lane.** The full lane passed 309 and skipped 5, with no failure,
  twice in a row, at load averages of 12 to 17.
- **Guided specs.** All 156 passed in `desktop` and `mobile`.
- **Earlier run.** The same commands had passed at `5693df9`, the
  overlay change alone (465 Node tests; lane 309 twice; guided 156).

Not verified: screen-reader reading of the new warning, Word's
rendering of the changed Provenance line (the structure is unchanged
from G-13's checked samples), and browsers other than Chromium.

### Research group's wording, 2026-11-06 (G-26)

G-26 ran under the owner's release of 2026-11-06 (`059efdb`), after
G-25's merge, to guided DDD §15 (PDD D-51) and the planning session's
§15.11 fitting decisions.

**What changed on the guided page.**

- **Steps (§15.1).** The step list, headings, buttons and review blocks
  name the two steps **Geological site conditions** and **Fault slip**:
  - headings "Describe the geological site conditions" and "Choose the
    assumed fault slip";
  - Continue to fault slip;
  - Edit and Change geological site conditions;
  - Edit and Change fault slip.
- **Introduction (§15.2).** The heading's line and the forecast
  sentence, the first two cards ("…geological site conditions and fault
  slip…", "…cover your slip range."), and the static `/explore/`
  paragraph are the amended block's sentences.
- **Hints (§15.3).**
  - Fault angle: "How steeply the fault is dipping, measured from the
    horizontal. Also called fault dip."
  - Sediment depth: "Thickness of the sediment above bedrock."
  - Density and strength end "If unknown, select all." The two range
    groups get theirs with §14 (G-24).
  - The depth explanation takes the review's definition (§15.11 item
    4). The other explanations stand until question 1's read-through.
- **Fault-slip help (§15.4).** The disclosure keeps its title and
  glossary link and holds §15.4's five sentences.
- **Small-count notices (§15.5).** The 10–29 and 1–9 texts, through the
  overlay.
- **Pressure ridge (§§15.6, 15.11 item 2).** It replaces raised ridge in
  five places: the scarp-type overview, the diagram caption, the
  scarp-height explanation's second sentence, the offset help, and the
  conversion hint.
- **Width spelling (§§15.7, 15.11 item 1).** "Deformation zone width" on
  the measurement cards, headings and walkthrough. It also reaches the
  chart label and its data table's header, the width-scope note and the
  no-valid notice's measurement name, through the overlay and a
  guided-side spelling pass.
- **Summaries (§15.11 item 3).** "Fault slip: 3–5 m" in slip mode and
  "Fault slip: 0–1.3 m surface offset" in offset mode, in the compact
  and full summaries. The review hint reads "as fault slip increases".
- **Negative-height note (§15.8; D-46).** It joins the scarp-height
  panel and the report's scarp-height section when the matched minimum
  is below zero. The steeper-fault-angles sample shows it (minimum
  −0.02 m). It uses §12.6's neutral explanation wash.
- **Report (§15.7).** Its measurement headings, captions and Provenance
  read in the guided wording. `provenance.txt` keeps the registry
  spelling.

`copy.json`, the copy deck and every `/scenario/` file keep their
bytes (PDD §3.7).

**Glossary and site pages (§15.9; §15.11 item 7).**

- The MkDocs glossary adopts the research group's definitions, quoted
  verbatim in the review record, for:
  - fault slip;
  - fault dip (fault angle);
  - fault scarp;
  - the SDC row;
  - scarp height;
  - additional uplift;
  - deformation zone width;
  - scarp dip;
  - simulation stage;
  - sediment depth.
- 24 of the review's 26 sentences are verbatim; the two fitted ones are
  in the assembled list below.
- A new **Surface offset** `{ #surface-offset }` entry follows Fault
  slip, with the review's text verbatim. Vertical separation stays as
  it was, and so does the guided offset help's link to it.
- Every existing anchor id is unchanged: 39 before, the same 39 plus
  `#surface-offset` after.
- Kept sentences sit beside the review's text: the dip coverage, "This
  is what the simulations drive…", "The thing all of this ultimately
  measures.", "A wide DZW means…", "It is near zero for simple
  scarps…".
- Term headings now read Fault slip, Fault scarp, Fault dip (fault
  angle), and Experiment vs simulation stage.
- The scarp-class table says pressure ridge. The Pressure ridge entry
  and the model-vs-reality page say "pop-up structure", the group's own
  alternative term (question 9), where "raised ridge" stood.
- The briefing's `[offset]` link now points to `#surface-offset`.

**Assembled strings, listed for the research group's sight:**

1. The amended introduction (§15.2).
2. The slip-rate sentence (§15.4).
3. Both small-count notices (§15.5).
4. The negative-height note (§15.8).
5. The two "pressure ridges" sentences (§15.11 item 2).
6. The trimmed slip-mode summary value, "Fault slip: 3–5 m" (§15.11
   item 3).
7. The fitted glossary sentences:
   - "Additional uplift is the uplift of the scarp above the undeformed
     hanging-wall surface." (review: "Uplift of the scarp above…");
   - "A simulation stage (the paper's model stage) is one saved point in
     a simulation as fault slip accumulates, taken every 0.05 m."
     (review: "One saved point in a simulation as fault slip
     accumulates.").
8. The two "pop-up structure" sentences: the glossary's Pressure ridge
   entry and the model-vs-reality page.
9. The empty state: "Change a condition or slip range, then review the
   scenario again." (§15.11 item 8).
10. The results footer: §15.2's forecast sentence in place of "This is a
    research tool; it does not predict what will happen at a particular
    site.", its Full disclaimer link kept (§15.11 item 8).

**Approval: the owner's own (2026-11-06, relayed by the planning
session).**

- **Approved:** the final strings as implemented. This covers §15's
  strings, the §15.11 fittings, the glossary's fitted sentences and the
  assembled list.
- **Two further lines, both applied:**
  - the empty state's "movement range" becomes "slip range";
  - the results footer takes §15.2's forecast sentence.
- **Record:** the decision is §15.11 item 8. Item 7 (the Surface offset
  entry) and item 8 landed in the owner's commit `6ffc247`, before this
  merge.

**Review.** The independent review found nothing blocking. It compared
§15's strings byte for byte and the glossary sentence by sentence
against the verbatim block, and checked the anchors and the scope (no
`copy.json` or `/scenario/` change).

Applied:

- **Slip-mode tail.** No spec checked that slip mode drops its tail.
  The continuity spec and the new spec now assert it.
- **Explanation texts.** No spec checked the scarp-height and depth
  explanations. The new spec opens both and asserts their texts.
- **Glossary tidying.** The two adopted sentences use the page's
  straight apostrophe, and one pasted line is reflowed.

Not applied:

- **Spelling pass.** It is a substring pass over all guided text rather
  than a pass scoped to the slot. Today it reaches only the intended
  slot; the report test pins that `provenance.txt` keeps the hyphen.
- **Two "movement" sentences.** The empty state's "Change a condition
  or movement range…" and the results footer's "This is a research
  tool; it does not predict…" are outside §15. They were not changed in
  review: they went to the owner with the final strings, and the
  owner's answer (above) changed both.

Tests and specs:

- Node:
  - `explore-copy-overlay`: the two notices, the width label, the
    width-scope note and the no-valid slot.
  - `explore-report`: guided labels in the order, caption and notes
    tests; the width spelling throughout the report while
    `provenance.txt` keeps the registry's; the negative-height note
    under scarp height only, below zero only, before the table; and a
    regenerated snapshot.
- New `explore-sme-wording` spec, in both lane projects:
  - the introduction and the step list;
  - the hints, the offset help, the conversion hint and the fault-slip
    help;
  - the review blocks and buttons;
  - the results summaries, actions, width spelling and negative-height
    note;
  - the pressure-ridge overview;
  - the two explanations;
  - the slip-mode summary;
  - the results footer and its disclaimer link;
  - the empty state, built from a profile modeled only for dense 10 m
    sediment chosen at 5 m;
  - the JS-off landing text;
  - the glossary's definitions under their anchors.
- The renamed strings are updated across 14 existing guided specs and
  the shared support module. The `explore-report` spec also asserts no
  hyphenated width term in each sample's report.

At this verification, on `task/g-26-sme-wording` at `0618a21`, over
`d158b73` (the owner's 0.4.0 push, which carries §15.11 items 1–6).
The branch was then rebased onto `6ffc247`, which adds §15.11 items 7–8
to the guided DDD and changes nothing else; the document checks passed
again there:

- **Build and unit tests.** The pinned Node suite passed all 468 tests,
  and typechecking and the bundles passed.
- **Site builds.** The strict publication and preview builds passed,
  with `explore-f93000bf36b8.js` and `explore-de946ea6defe.css`.
- **Unchanged.** The `/scenario/` bundles `app-26490347afd0.js` and
  `app-08bebc049c15.css` did not change.
- **Hooks and document checks.** All 31 hook tests passed. Relative
  links resolved, PDD agreement passed, and traceability reported no
  gap rows.
- **Lane.** The full lane passed 327 and skipped 5, with no failure,
  twice in a row, at load averages of 12 to 14.
- **Guided specs.** All 174 passed in `desktop` and `mobile`.
- **Earlier runs.** The same commands had passed at `f9d8a82` (468;
  lane 321 twice; guided 168) and at `37db5cb` (468; lane 325 twice;
  guided 172).

Not verified:

- the research group's sight of the assembled strings, which goes with
  the next briefing round;
- screen-reader reading of the renamed steps and the note;
- Word's rendering of the new report note;
- browsers other than Chromium.

### Chart-image export, 2026-11-06 (G-27)

G-27 ran under the owner's release of 2026-11-06, after G-26's merge, to
guided DDD §16 (PDD D-14, §6.3) and its §16.6 fitting decisions
(`c4d56a5`). The planning session decided items 1–4 under the §13.7
precedent, amendable by the owner on sight. The owner approved the
strings and sample images that carry them. Items 5 and 6 are the
owner's own.

**What changed on the guided page.**

- **The action (§16.1).** Each drawn chart of a confirmed result gains
  **Download this chart (PNG)**. It sits after the percentile control,
  just above the chart's data table. It appears only when the panel
  draws a chart: no button before confirmation, and none on a panel
  suppressed to table-only.
- **The image (§16.2).**
  - It shows the displayed chart: the histogram, the logarithmic width
    histogram, or the cumulative curve with the reader's read-off
    (84th percentile by default).
  - The chart uses the report's 600 × 300 geometry, through the same
    shared renderer.
  - Histograms get a scarp-type legend row (§16.6 item 5, on the
    report's interpretation (g)).
  - Beneath sits the D-14 strip, wrapped at 92 characters:
    - the product line;
    - the measurement and kind in the page's words (Distribution;
      Distribution, logarithmic scale; Cumulative);
    - the §13.2 scenario summary;
    - the count line and the versions;
    - the citation pointer;
    - the accuracy statement on cumulative images;
    - every caveat and note the page shows with that chart. This
      includes the per-dip exceedance line and the negative-height
      note, but not the coverage block (§16.6 items 2–3).
  - The image is rasterized at 2× by the §13.4 rasterizer, so it is
    1200 px wide.
- **The provenance file (§16.3).** A `-provenance.txt` sidecar in the
  page's wording (the G-25 rule) follows the image.
- **Names (§16.4; §16.6 item 1).** The files are named
  `{base}-{slug}-{kind}.png` and `-provenance.txt`, with the slugs
  `scarp-height`, `dzw`, `scarp-dip` and the kinds `histogram`,
  `histogram-log`, `cumulative`.
- **Failure and concurrency (§16.5).**
  - A rasterizer failure, or output that isn't a PNG, saves nothing and
    says so in the card.
  - A failed sidecar save is reported but doesn't undo the image.
  - A busy flag keyed by result and measurement ignores a second
    activation.
  - A result replaced mid-export saves nothing.
  - The card's outcome stays with its card when the reader switches
    measurement.
- **Caveat box.** The page's caveat box now comes from the same shared
  list as the strip (`caveatTexts`), so the two cannot drift.

`copy.json`, the copy deck and every `/scenario/` file keep their bytes.

**Strings.**

1. Button: "Download this chart (PNG)".
2. Ready: "Your chart image and its provenance file are downloading. If
   your browser asks to allow multiple downloads, allow it to get the
   provenance file." (§16.6 item 6).
3. Failed: "The chart image could not be created. Your results are
   unchanged; select Download this chart (PNG) to retry."
4. Sidecar blocked: "The chart image is ready, but its provenance file
   could not be saved."
5. Strip: "Ground Rupture Explorer — guided journey", and "Cite: Chiama
   et al. (2025). Full citation in the provenance file and on the
   site's How to cite page."

**Approval: the owner's own (2026-11-06, relayed by the planning
session).** All three parts were approved:

- **Strings and samples.** The planning session checked the three
  sample PNGs against the hashes below and every string before showing
  them.
- **Legend row on histogram images.** Kept; recorded as §16.6 item 5.
- **Ready line.** The proposed rewording was adopted, with no manual
  fallback button (§16.6 item 6). The error line stays for failures
  the page can detect.

**Samples.** These were made at `5459fb3` (`9077a5e` after the rebase)
with the scenario "Dip 60° or 70° · Moderate — uniform and layered ·
depth 10 m · density Medium · offset 0–1.3 m", saved under the
file-name base `kern`:

- `kern-scarp-height-histogram.png`, SHA-256 `467ae22b…bcc1b5a`;
- `kern-dzw-histogram-log.png`, SHA-256 `13855875…6117a`;
- `kern-scarp-dip-cumulative.png`, SHA-256 `a7e9f6b2…584aa`.

Each has its sidecar. The sidecars differ only in their Generated
timestamp. The ready line changed after these samples were made; the
images and sidecars do not carry it.

**Review.** The independent review found nothing blocking. Applied
(`9077a5e`):

- **Placement.** The action moved after the percentile control, gated
  by the same check as the export.
- **Outcome.** A new export clears the card's earlier outcome.
- **Busy flag.** It is keyed by result and measurement, so a stale
  flight never blocks a new result's card.
- **Live region.** The status line stays rendered while empty, so
  screen readers announce its update.
- **Tests.** New tests cover:
  - the per-dip exceedance line;
  - the log chart;
  - determinism with the legend;
  - a suppressed panel proven on screen;
  - a scenario replaced mid-export;
  - the outcome staying with its card across a switch.

The review also read Chrome's multiple-downloads prompt as a way the
sidecar could be blocked without the page knowing. That led to the
owner's ready line (§16.6 item 6).

An earlier browser run found that the composed SVG carried duplicate
`width`/`height` attributes on the nested chart, which failed the
export. It was fixed before review, and a Node test now rejects
duplicate attributes.

**Known cosmetic item, not changed.** On cumulative images, the
"84th percentile" and "Median" labels start at the point where their
guide meets the curve, so the curve crosses the label's first letter.
The planning session noted it. The label geometry comes from `ecdfSvg`
in the shared `src/views/charts.ts`, which also draws the page's and
the report's cumulative charts and is part of the frozen `/scenario/`
bundle. The export draws it exactly as the page does, and moving it
would change `/scenario/` bytes. It is left for a later guided-only
override, if the owner wants one.

Tests and specs:

- Node: the new `explore-chart-export` suite (15 tests) covers:
  - the strip fields in slip and offset modes;
  - the kind words;
  - caveats and notes, and the per-dip exceedance line (with none
    inside range);
  - log versus linear;
  - a well-formed composition with no duplicate attributes and every
    line within the wrap width;
  - the legend and the read-off marker;
  - determinism;
  - the sidecar and the names;
  - `buildChartExport` on success, on a failing rasterizer and on
    non-PNG output.
- New `explore-chart-export` spec, in both lane projects (8 tests):
  - export on each chart kind, checking names, 1200 px width and the
    sidecar;
  - no button before confirmation or on a suppressed panel;
  - the busy flag;
  - a failing canvas;
  - a scenario replaced mid-export;
  - the outcome staying with its card;
  - 320 px and 1024 px layouts.

At this verification, on `task/g-27-chart-export` at `4b2f1a0`, over
`c4d56a5` (the owner's push, which carries §16.6):

- **Build and unit tests.** The pinned Node suite passed all 483 tests,
  and typechecking and the bundles passed.
- **Site builds.** The strict publication and preview builds passed,
  with `explore-3ad0d41cd412.js` and `explore-4ccb39408ad8.css`.
- **Unchanged.** The `/scenario/` bundles `app-26490347afd0.js` and
  `app-08bebc049c15.css` did not change.
- **Hooks and document checks.** All 31 hook tests passed. Relative
  links resolved, PDD agreement passed, and traceability reported no
  gap rows.
- **Lane.** The full lane passed 343 and skipped 5, with no failure,
  twice in a row, at load averages of 15 to 31.
- **Guided specs.** All 190 passed in `desktop` and `mobile`.
- **Earlier runs.** The same commands had passed at `5459fb3`, after
  the review's fixes and before the ready line (483 Node tests; lane
  343 twice; guided 190), and at `3f38394`, before the review (480
  Node tests; lane 339 twice; guided 186).

Not verified:

- Chrome's real multiple-downloads prompt, which the test browser
  never shows, and so whether the sidecar arrives when a reader denies
  it;
- screen-reader announcement of the status line;
- browsers other than Chromium;
- the PNG's appearance when pasted into Word or slides.

### Range controls on the site conditions, 2026-11-08 (G-24)

G-24 ran under the owner's release of 2026-11-06 (`059efdb`), once the
P1.5 band was complete (G-13, PR #87; G-27, PR #90). It follows guided
DDD §14 (PDD D-50) and §14.6's six fitting decisions (owner push
`77e1689`), which the planning session made on 2026-11-08 and which
are amendable by the owner on sight. Item 1 follows PRD §5.1 and D-26,
reconciled in the same push.

**What changed on the guided page.**

- **Control (§14.1).** Fault angle and Sediment depth each render one
  track with two native range inputs.
  - Their steps are the indices of the modeled stops: 20, 30, 40, 45,
    50, 60, 70°, and 3, 5, 10 m.
  - The stops are evenly spaced, as ordinal stops (§14.6 item 5).
  - A scale row under the track names every stop. It is not clickable
    and is hidden from assistive technology; the thumbs and the echo
    speak the values.
  - The thumbs clamp against each other. Arrow keys move one stop,
    and Home and End reach the ends.
  - Each thumb is named "Minimum fault angle", "Maximum sediment
    depth", and so on. It speaks "40 degrees" or "5 metres" (§14.6
    item 4).
- **The set stays the state (§14.2).** The draft keeps its `number[]`
  sets, so `scenario.json`, the session record, the engine, the
  report and the summaries are untouched.
  - The thumbs render the set's extremes.
  - A move answers the group with the contiguous modeled range between
    the thumbs.
  - A polite live echo lists every selected value and the count.
  - A restored set with gaps is listed verbatim, marked "(with gaps)",
    until a thumb moves. Nothing changes on restore.
- **Unanswered (§14.6 items 1–2).** A fresh scenario stays unanswered.
  PRD §5.1 says "A fresh scenario must not silently include every
  value for an unanswered condition", and D-26 agrees. So §14.3's
  "never empty" holds only once a group is answered.
  - A fresh, or restored empty, range group parks its thumbs at the
    ends, muted, with no fill.
  - Each thumb's spoken value adds ", not chosen".
  - The echo reads "Selected: none — 0 of 7 modeled angles." (or "0 of 3
    modeled depths"), above the hint "Move a thumb or choose Full range
    to continue."
  - The readiness line, `validateDraft` and the sample's
    touched-check are unchanged.
- **Full range (§14.3; §14.6 item 6).** A tertiary action in Select
  all's place. It answers or widens a group and is a no-op at full
  range.
- **Required mark (§14.6 item 3).** All four legends keep it.
- **Hints.** The range groups keep §15.3's hints, which close with
  "If unknown, select the full range." (§14.3 as amended by §14.6).
- **Presentation (§14.4).** `explore.css` only:
  - the track, fill, stops and 24 px thumbs;
  - the page's focus ring, drawn as a shadow because Chromium paints no
    outline on a range thumb;
  - a scale row that fits 320 px without horizontal scroll. In a
    narrow group, the seven angle labels stagger onto two rows (a size
    container on the scale row's own wrapper), so they stay apart under
    WCAG 1.4.12 text spacing. The three depth labels stay on one row;
  - system colors for the track, fill, stops, thumbs and focus ring in
    forced-colors mode;
  - the echo line;
  - Full range styled as an underlined text action. Its accessible name
    names its condition ("Full range of fault angles").
- **Pointer drags.** Edits apply in place, without a re-render, so a
  drag and the live echo survive.
  - Chromium ends a range drag when anything in the group changes size
    mid-drag (found while testing: hiding the unanswered hint did it).
    So while a thumb is held, the hint, any message, and the sample
    annotation keep their space. The hint and message only turn
    invisible, and the annotation stays. The group collapses them and
    redraws the annotation on release: `change`, or `pointerup` and
    `pointercancel` for a drag that ends where it began. The fill and
    the answered thumbs follow the drag live. This is why the switch
    from unanswered to answered finishes on release.
  - A size container around the thumbs also stopped Chromium from
    laying them out after an attribute change. The container wraps the
    scale row only.
  - On stacked thumbs (one value), only the top thumb can be grabbed. A
    drag that starts there moves whichever bound lies the way the
    pointer goes, so a sample's single 5 m depth widens to 3 m by
    pointer. The keyboard moves each thumb as itself.

Density and strength keep their checkboxes, Select all, and "If
unknown, select all." `copy.json`, the copy deck and every `/scenario/`
file keep their bytes.

**Strings.**

1. Thumb names: "Minimum fault angle", "Maximum fault angle",
   "Minimum sediment depth", "Maximum sediment depth".
2. Spoken values: "40 degrees", "5 metres". While the group is
   unanswered, ", not chosen" is added.
3. Echo: "Selected: 30°, 40°, 45° — 3 of 7 modeled angles."; with gaps,
   "Selected: 30°, 50° — 2 of 7 modeled angles (with gaps)."; unanswered,
   "Selected: none — 0 of 7 modeled angles." / "Selected: none — 0 of 3
   modeled depths."
4. Unanswered hint: "Move a thumb or choose Full range to continue."
5. Action: "Full range". Its accessible names are "Full range of fault
   angles" and "Full range of sediment depths".
6. Hints: "How steeply the fault is dipping, measured from the
   horizontal. Also called fault dip. If unknown, select the full
   range." and "Thickness of the sediment above bedrock. If unknown,
   select the full range."

**Approval: the owner's own (2026-11-08, relayed by the planning
session).**

- **Approved:** the strings and the screenshots at 1024 and 320 px,
  light and dark, of the unanswered, answered and restored-with-gaps
  states, together with the Full range accessible names.
- **Only real moves answer (§14.6 item 7).** A gesture answers an
  unanswered group only if a thumb's value changed during it, even if
  the thumb ends where it began. A tap or click that changes no value
  leaves the group unanswered. Full range stays the one-click way to
  choose every value. As built, a stray press already fired no `input`
  and so changed nothing. The release now settles a range only after a
  real move (`764fe8e`), and new specs click and tap each parked thumb
  at and off its center.
- **Echo per stop (§14.6 item 8).** The echo updates at every stop
  during a drag, with no debounce. Accepted as built.
- **Accepted limitation.** A restored set with gaps draws its fill
  across the stops it does not select; "(with gaps)" in the echo shows
  the true selection.
- **Record:** §14.6 items 7–8 and the limitation are staged in the
  main checkout for the owner's next push. The owner cleared the merge
  on green without waiting for that push.

**Review.** The independent review found nothing blocking. It traced
the clamp, move and gapped-set logic, event order, re-renders, sample
and session flows, and the /scenario/ import graph, and drove the built
site with probe scripts. Applied (`adf9e96`, `97022af`):

- **Forced colors.** The ring vanished with the box-shadow, and the
  track and fill were backgrounds. They now use system colors.
- **Stacked thumbs mid-scale.** Only the top thumb could be grabbed, so
  a single value could not widen downward by pointer. A drag that
  starts on stacked thumbs now moves the bound on the pointer's side.
- **Fill during the first drag.** It now follows live. The review found
  that showing the fill and restyling the thumbs did not end a drag;
  only size changes do, and only those wait for release.
- **Text spacing.** Scale labels overlapped under WCAG 1.4.12 at 320
  px. They now stagger in a narrow group.
- **Test gaps.** The 24 px check measured the input rather than the
  thumb, and the alignment, touch, Page Up/Down, persistence, gapped
  Full range and focus-ring checks were missing. All are added, with
  measurements taken from pixels.
- **Nits applied.** `pointercancel` now settles a drag; Full range
  gets a distinct accessible name; an unused export is removed.

Not applied:

- **Echo noise.** About 11 polite updates during one sweep. §14.2 asks
  for a polite live echo, and debouncing it would also delay the
  visible text.
- **Silent presses at the parked ends.** These are native range
  behavior; the hint guides the reader.
- **A restored set holding an unmodeled value.** It is listed without
  that value. A data-version change already blocks such a restore.

Raised to the owner with the strings: a drag on an unanswered group
that returns to its start answers it with every value. The owner's
answer is §14.6 item 7 (above).

Tests and specs:

- Node: a new `explore-range` suite (8 tests) covers:
  - the owner-gated strings;
  - stop labels and spoken values, with ", not chosen";
  - the contiguous materialization, including crossed and out-of-scale
    indices;
  - the extremes, with an empty set parked at the ends;
  - the echo's list and count;
  - the unanswered echo;
  - "(with gaps)";
  - which fields are ranges.
- New `explore-range-controls` spec, in both lane projects:
  - the unanswered state (parked, no fill, "not chosen", Required, the
    hint, the hints, the readiness line, nothing stored);
  - per-stop keyboard movement with spoken values, clamping both ways,
    Home and End, and Page Up and Page Down;
  - the echo's list and count;
  - Full range answering, widening, doing nothing at full range, and
    clearing a restored gap, with its accessible name;
  - a sample at its extremes;
  - a restored gapped set kept verbatim, with a restored empty set
    unanswered, until a move materializes the range;
  - mouse drags (desktop project):
    - the fill drawn mid-drag while the hint keeps its space;
    - a drag back to its start;
    - the minimum reachable when the thumbs meet at the right end;
    - stacked thumbs mid-scale dragged both ways;
    - a sample's single depth widened downward, its annotation kept
      until release;
  - a touch drag through the DevTools protocol (mobile project);
  - stray presses that move no thumb leave the group unanswered: a
    click (desktop) and a tap (mobile) at and off each parked thumb's
    center, and a click on a sample's stacked thumbs (§14.6 item 7);
  - an answered range surviving a reload and leaving the step;
  - 320 and 1024 px layouts: no horizontal scroll; labels inside the
    group, never overlapping, and centered under their stops; the
    thumbs' 24 px measured from pixels;
  - WCAG 1.4.12 text spacing at 320 px;
  - the focus ring found in pixels on the keyboard-focused thumb, gone
    from the unfocused one, and distinct in forced colors;
  - axe on unanswered, answered, and after an unsuccessful attempt.
- The existing guided specs now drive the ranges through shared helpers
  (`chooseRange`, `answerEverySite`, `nudgeRange`) where they ticked
  angle or depth boxes. Their assertions are unchanged except where the
  old ones described checkboxes that no longer exist:
  - The emptied-group route from Results now uses density, since a
    range cannot be emptied once answered.
  - The readiness-follows-edits check uses density.
  - The sample-fill check reads the ranges' echoes.

At this verification, on `task/g-24-range-controls` at `764fe8e`, over
`77e1689` (the owner's push, which carries §14.6 items 1–6 and the
D-26/D-51 reconciliation):

- **Build and unit tests.** The pinned Node suite passed all 491 tests,
  and typechecking and the bundles passed.
- **Site builds.** The strict publication and preview builds passed,
  with `explore-e34a1ee2a740.js` and `explore-4e8eb68fcf59.css`.
- **Unchanged.** The `/scenario/` bundles `app-26490347afd0.js` and
  `app-08bebc049c15.css` did not change.
- **Hooks and document checks.** All 31 hook tests passed. Relative
  links resolved, PDD agreement passed, and traceability reported no
  gap rows.
- **Lane.** The full lane passed 370 and skipped 10, with no failure,
  twice in a row, at load averages of 12 to 18. The five new skips are
  pointer tests that each run in one project: mouse on desktop, touch
  on mobile.
- **Guided specs.** 217 passed and 5 were skipped, in `desktop` and
  `mobile`.
- **Earlier run.** The same commands had passed at `97022af`, after
  the review's fixes and before item 7's change (491 Node tests; lane
  368 passed and 8 skipped, twice; guided 215 and 3).

Not verified:

- screen-reader announcement of the thumbs' values, ", not chosen",
  and the echo;
- touch dragging on a real phone (the mobile project's touch drag is
  emulated through the DevTools protocol);
- Firefox and Safari: the `-moz-` thumb styles are untested, and the
  lane is Chromium only;
- the resize-ends-drag behavior in other engines;
- TalkBack speaking `aria-valuetext` rather than a percentage on a
  native range;
- forced colors on a real Windows high-contrast theme (emulated
  only).

### The explorer in the sidebar, 2026-11-09 (G-29)

G-29 ran under the owner's decision of 2026-11-08 (PDD D-52; ADR-0017
amendment of the same date; owner push `5de3f10`), after T-59 and
ahead of G-28.

**What changed.**

- **Navigation.** `mkdocs.yml` lists `Ground Rupture Explorer:
  explore.md` after Dashboards and before Data. `explore.md` leaves
  `not_in_nav`, and `scenario.md` stays there (D-39). The preview
  configuration inherits both.
- **Search.** `explore.md` drops its search exclusion and keeps
  `hide: toc`.
- **Site checks, arm (d)** (`hooks/site_checks.py`). In a publication
  build:
  - the guided page must not be unlisted, and must be in `sitemap.xml`
    and `search/search_index.json`;
  - `scenario/` must stay unlisted;
  - no listed page may link `scenario/`, so the exemption covers only
    pages that are themselves unlisted.

  Preview builds still check drafts only.
- **The guided page's links into `/scenario/`.** There were four, one
  more than the row named. All four are removed:
  1. the supporting links' "Existing explorer";
  2. the startup and failure messages' "Existing explorer";
  3. the results hint's sentence "The existing explorer also offers
     field comparisons and additional chart controls.";
  4. the static landing sentence "The existing explorer remains
     available separately.", which the hook found once the page was
     listed.

  In place of the third, the hint carries the owner's sentence (below).
- **Full disclaimer.** It points to the page's own
  `#gre-explore-disclaimer` and moves there in place, as the readiness
  links do. The theme's instant navigation treated the fragment as a
  page change and remounted the explorer, which scrolled the page back
  (found while testing). Focus moves to the disclaimer, which clears
  the sticky header on narrow screens.
- **Unchanged.** `copy.json`, the copy deck, and every `/scenario/`
  file keep their bytes. The `/scenario/` bundles are byte-identical.

**Results hint, as approved.** "The Distributions and Model vs reality
dashboards show broader datasets rather than this confirmed scenario.
Model vs reality also overlays measurements from real surface ruptures
on the full simulation set." The links go to
`../dashboards/distributions/` and to `../dashboards/model-vs-reality/`
(twice), in the page's new-tab link style.

**Approval: the owner's own (2026-11-09, relayed by the planning
session).**

- **Approved as built:** the four removals of the existing explorer,
  and Full disclaimer moving in place to the page's own disclaimer.
- **One addition, the owner's choice:** the results hint's sentence
  linking Model vs reality (above), after the dashboards sentence. It
  is added in `b273e35`, and a spec asserts the hint's text and its
  three links.

**Built site.** `sitemap.xml` and the search index list `explore/` and
not `scenario/`. No built page links `scenario/` except `scenario/`
itself. The explorer's footer reads "Previous: Distributions" and
"Next: Data".

**Deploy (G-5), resolved.** G-5 bars a deploy that lists a page whose
disclaimer still carries the D-10 placeholder. The owner decided D-10
on 2026-11-09 (`ee80547`, "Disclaimer of Warranty"): the placeholder in
PDD §5.1 and in both pages' disclaimer blocks became a sentence derived
from Apache-2.0. G-29 is rebased onto that commit, and the built
`explore/index.html` carries no placeholder. So G-5 no longer holds a
deploy that lists `/explore/`. Deploys stay the owner's; nothing
deploys from this task.

**Review.** The independent review found nothing blocking. Applied:

- **Disclaimer under the header.** On a narrow screen the disclaimer
  landed under the theme's sticky header, because the in-place move
  never makes it `:target`. It now has its own `scroll-margin-top`,
  and the spec checks its top against the header.
- **Bundle guard.** A spec checks that the built explorer module
  contains no `/scenario/` page link and no "existing explorer". Those
  are links the hook's static scan cannot see.
- **Hook message.** It now says the guided page must be listed.

Reported to the owner, not changed (the owner's text):

- the guided DDD's "retain access to the existing explorer" (line 228)
  and §9.4;
- the DDD's arm (d) text requiring the guided page to be unlisted;
- PDD D-39's unlisted deployment, and its line that field comparisons
  remain available in the existing explorer;
- ADR-0020's "unadvertised implementation candidate";
- the G-08 row.

Tests and specs:

- **Hook** (`test_site_checks.py`). A new `GuidedListedTest` covers:
  - the listed page passing;
  - the guided page linking `scenario/` (its disclaimer included)
    failing;
  - the guided page unlisted, or missing from the sitemap or search,
    failing;
  - `scenario/` not unlisted, linked from a listed page, or in the
    sitemap or search, failing;
  - the preview keeping its coverage;
  - the sitemap pruning keeping `explore/`.

  `PublicationConfigTest` checks the nav position and inclusion in
  both configurations, and the front matter.
- **New `explore-nav` spec**, in both lane projects:
  - the sidebar order and link (desktop; the theme folds the sidebar
    into a drawer on narrow screens);
  - no `/scenario/` link on the intro, site and results steps or in
    the supporting links;
  - the results hint's text, the owner's sentence included, with its
    three new-tab links;
  - Full disclaimer moving in place, focused and clear of the header,
    without remounting the explorer;
  - the bundle guard;
  - the startup failure's links.
- **`explore-sme-wording`** now asserts the in-page disclaimer link.

At this verification, on `task/g-29-explorer-nav` at `b273e35`, over
`ee80547` (the owner's D-10 text):

- **Build and unit tests.** The pinned Node suite passed all 491 tests,
  and typechecking and the bundles passed.
- **Site builds.** The strict publication and preview builds passed,
  with `explore-550907cfffd2.js` and `explore-2eabbd6235db.css`. The
  built sitemap lists `explore/` and not `scenario/`, and the built
  guided page carries no D-10 placeholder.
- **Unchanged.** The `/scenario/` bundles `app-26490347afd0.js` and
  `app-08bebc049c15.css` did not change.
- **Hooks and document checks.** All 34 hook tests passed. Relative
  links resolved, PDD agreement passed, and traceability reported no
  gap rows.
- **Lane.** The full lane passed 381 and skipped 11, with no failure,
  twice in a row, at load averages of 12 to 22.
- **Guided specs.** 228 passed and 6 were skipped, in `desktop` and
  `mobile`.
- **Rebase.** The branch was then rebased over `555383d` and `f1c3295`,
  the owner's documentation-only commits that defer the field overlay.
  At the merged head the document checks and the strict build were run
  again.
- **Earlier run.** The same commands had passed at `267db77`, before
  the review and the owner's sentence (lane 377 passed and 11 skipped,
  twice; guided 224 and 6).

Not verified:

- the sidebar entry in the theme's mobile drawer (asserted on desktop
  only);
- search finding the page in the published site (the hook checks the
  index in publication builds; the lane serves the preview);
- screen-reader reading of the in-place disclaimer move;
- browsers other than Chromium.

### Licence notices, 2026-11-09 (G-28)

G-28 ran under the owner's release of 2026-11-08 (ADR-0017 amendment of
that date; the notice in `data/REDISTRIBUTION.md`; owner push
`fce5945`), after G-29 and before the release vintage (T-63).

ODC-By 1.0 section 4.2(a) keeps publicly conveyed derivative databases
under ODC-By, so the DEM-derived data is ODC-By 1.0. Produced works —
charts, chart images, reports, pages — stay under CC BY 4.0 with the
section 4.3 notice.

**Owner decisions, 2026-11-09 (relayed by the planning session).**

1. **No readme member.** The ZIP gains no readme. `provenance.txt`
   gains a tenth block, Licences, after Caveats.
2. **Licences by file.** `records.csv` and `statistics.csv` are under
   ODC-By 1.0. Charts, chart images, and reports are under CC BY 4.0
   with the notice. `scenario.json` and `provenance.txt` carry no
   licence line.
3. **Where the strings live.** DDD §5.9 holds them as registry entries
   `ddd5.9.labelLicences`, `licenceData`, `licenceWorks`, and
   `licenceNotice` (parts 16–19). The owner's commit `efc696f` records
   them, with PDD §6.1's paragraph on the tenth block and guided DDD §17
   on the placements.
4. **Placement:**
   - on the guided page, directly under the displayed chart;
   - on a result too small to chart, under its statistics table (the
     owner's later answer);
   - on the hidden `/scenario/` page, a static paragraph after the
     application;
   - under each embedded dashboard.

   In every case the licence's name links to its text.
5. **Text.** The notice is the `data/REDISTRIBUTION.md` sentence
   verbatim. The works line takes its neutral form: "Charts, chart
   images, and reports built from these results", which the owner
   accepted with `efc696f`. The owner saw the placements, the samples,
   and the four strings, and raised no change.

The owner confirmed in this session that the change to the hidden
`/scenario/` page, its shared download text and so its bundle, is
intended. It is this task's one byte-identity exception, and
`/scenario/` stays unlisted.

**Surfaces and their notices.**

| Surface | What it carries |
| --- | --- |
| `provenance.txt` (both pages' downloads) | Last block, Licences: `records.csv and statistics.csv: Open Data Commons Attribution License (ODC-By 1.0), https://opendatacommons.org/licenses/by/1-0/`; `Charts, chart images, and reports built from these results: Creative Commons Attribution 4.0 International (CC BY 4.0), https://creativecommons.org/licenses/by/4.0/`; the notice |
| `report.docx` (guided download) | The same Licences block, ending its Provenance section |
| Chart image (guided, PNG) | The notice in the strip, after the citation |
| Chart image's provenance file | The same Licences block |
| Guided results page | The notice directly under the displayed chart; on a table-only result, under the statistics table; none on an empty result |
| `/scenario/` page | The notice in a paragraph after the application, before the disclaimer |
| Dashboard pages | The notice under each of the seven embedded dashboards on the five pages |

The notice reads: "Contains information from the Homogeneous and
Heterogeneous 2D DEM Experiments (Chiama et al. 2024a, 2024b;
DesignSafe-CI), which is made available here under the Open Data
Commons Attribution License (ODC-By 1.0)."

**Styling.** On the site pages the notice is small and muted (the
site's fallback-link style), and `extra.css`'s cache-buster is bumped.
The tighter top margin applies only under dashboards: on the
`/scenario/` page it overlapped the application and blocked clicks,
which the existing lane caught before review.

**Bundles.** The `/scenario/` module changes, from
`app-26490347afd0.js` to `app-066e39f81672.js`, by the shared download
text. Its stylesheet `app-08bebc049c15.css` and the data are
unchanged.

**Review.** The independent review found nothing blocking. It overlaid
the planning session's staged documents and found the PDD-agreement
check passing. Applied:

- **Zip checker.** It requires the three lines exactly and the file's
  closing empty line. Tests reject an unclosed block, another licence
  on the data line, and a guided report whose document lost the
  notice.
- **Chart sidecar.** The spec checks its closing Licences block.
- **Site test.** It compares the registry notice exactly with
  `data/REDISTRIBUTION.md`'s blockquote.
- **Table-only results.** The review asked about them, the owner
  decided, and the notice is under the table (`1d5a240`).

Tests and specs:

- **Node:**
  - provenance: ten labels, and block 10's exact lines;
  - strip: the notice after the citation;
  - report: the Provenance section ends with the Licences lines;
  - the regenerated `document.xml` snapshot;
  - zip reader: the fixture with its Licences block, and the
    rejections above.
- **Site** (`test_licence_notice.py`):
  - the registry notice equals `data/REDISTRIBUTION.md`;
  - every embedded dashboard and the `/scenario/` page carry it,
    linked, the `/scenario/` one between the mount and the disclaimer.
- **New `explore-licence` spec**, in both lane projects:
  - the guided notice under the chart, and under the table on a
    table-only result;
  - none on an empty result;
  - the guided download's `provenance.txt` and `report.docx`;
  - the `/scenario/` notice below its application, and its download;
  - every dashboard's notices.
- **Existing specs.** `render.spec` counts the fallback body's links up
  to the notice, and `explore-chart-export.spec` checks the sidecar.

At this verification, on `task/g-28-licence-notices` at `5344177`, over
`efc696f` (the owner's commit of the strings and §17):

- **Build and unit tests.** The pinned Node suite passed all 494 tests,
  and typechecking and the bundles passed.
- **Site builds.** The strict publication and preview builds passed,
  with `explore-00e1827422a1.js` and `explore-2eabbd6235db.css`, and
  the `/scenario/` module `app-066e39f81672.js` (its stylesheet
  `app-08bebc049c15.css` unchanged).
- **Hooks and document checks.** All 37 hook and site tests passed.
  Relative links resolved, PDD agreement passed with the four new
  registry entries, and traceability reported no gap rows.
- **Lane.** The full lane passed 391 and skipped 11, with no failure,
  twice in a row, at load averages of 12 to 26.
- **Guided specs.** 238 passed and 6 were skipped, in `desktop` and
  `mobile`.
- **Earlier run.** The same commands had passed at `74fbd0b`, before
  the review and the table-only notice (lane 389 passed and 11 skipped,
  twice; guided 236 and 6). PDD agreement failed there only on the four
  entries, as expected before the owner's commit.

Not verified:

- the notice in Word's rendering of `report.docx` and in image viewers;
- screen-reader reading of the guided notice (the link adds "opens in
  a new tab");
- axe on the dashboard pages' small muted text (the same colour as the
  existing fallback links);
- browsers other than Chromium.

### README in the download, 2026-11-11 (G-30)

G-30 ran under the owner's release of 2026-11-09 (the dated paragraph
and the G-30 row; owner push `efc696f`), after G-28. The approved text
is recorded in guided DDD §18 (owner push `6989e55`).

**What changed.**

- **The archive.** The guided page's download ZIP opens with
  `README.txt`, composed beside the shared `packageTexts` in
  `src/explore/readme.ts`, as `report.docx` is (G-13). The shared
  download code and the `/scenario/` package are unchanged.
  - The guided layout is `README.txt`, the four DDD §5.9 members, then
    `report.docx`.
  - When the report cannot be built (§13.5), it is `README.txt` and the
    four members, and the README names only what the archive carries.
- **What the README holds.**
  - The title, with the explorer's address beneath it. The address is
    read at download time from the page's canonical link, which the site
    writes from its configured URL.
  - What the archive contains, what a stage is and how the Simulation
    stages choice decides the rows, and that these are simulation
    results, not site predictions.
  - One entry per member.
  - The meaning and unit of every `records.csv` and `statistics.csv`
    column, with the blank-field notes and the statistics' method
    (linear interpolation; the n − 1 denominator).
  - The pointer to `provenance.txt` for the citation, the caveats, and
    the licences.
  - Plain UTF-8, LF line ends.
- **The download hint and the report-failure line** now say "a report
  … in Microsoft Word format", and the hint names the README.
- **The zip checker** (`test/zipcheck.py`) gains both guided layouts with
  `README.txt` first. It checks that the README is UTF-8 with LF line
  ends, that its Files section names every member present, and that each
  CSV section names every column of that file's header. Description
  lines never count as naming anything. It also checks that the README
  never mentions an absent report.

**Approval: the owner's own (relayed by the planning session).**

- **2026-11-10, revisions.** The owner asked for "Report in Microsoft
  Word format", and for the explorer's address under the title. Their
  combined revision, built on an outside review, set:
  - the three-paragraph opening, with no "confirmed";
  - the trial, fault-angle, sediment-strength, cohesion, `valid`,
    `excluded_null`, `sd`, and `_full` wording;
  - the blank-field notes and the methods line.

  The planning session checked the review's claims against DDD §5.4,
  and this task checked them against the code: `quantileLinear`,
  `sampleSd`'s n − 1, `sd` null below two measurements, and the `_full`
  columns written before `displayRound`.
- **2026-11-10, approval.** "Yes, approve with these two changes":
  - the scarp-type entry's "Blank for the zero-slip initial stages, which
    carry no scarp type.";
  - the status line "Your data download is ready. The report in
    Microsoft Word format could not be built this time, so the archive
    holds the data files without it."

  The download hint is approved as built: "Matching simulation stages,
  statistics, scenario settings and sources, with a report of this
  result in Microsoft Word format (report.docx) and a README.txt that
  describes each file."
- **The record.** Guided DDD §18 (`6989e55`) holds the approved README
  in a fenced block, with the hint and the status line. At this task's
  head, the README the code produces with the report present, under the
  site's configured address, is byte-identical to §18's fenced text. The
  hint and the status line in `src/explore/wording.ts` equal §18's
  quoted strings.

**Lines sent for the research group's sight.**

- **Reused from the page's own wording** (the guided tooltips; verbatim
  unless marked):
  - "The thickness of the sediment above bedrock."
  - "How tightly packed the sediment is."
  - "How far the two blocks of rock move past each other along the
    fault. The simulations increase this movement step by step."
  - the first sentences of scarp height and deformation zone width;
  - both scarp-dip sentences;
  - "Strength describes how well sediment resists being pulled apart.";
  - the median sentence;
  - "They bound the middle 68% of the distribution." (fitted);
  - the scarp-type sentence (fitted);
  - the approved negative-height note.
- **Fitted from the site glossary:** `set` and `mean`.
- **Assembled:** everything else. That includes the new fault-angle line
  ("Smaller angles describe more gently inclined faults."), which
  replaces the page tooltip's "A smaller angle describes a shallower
  fault" here; the page itself is unchanged and the wording goes to the
  group.
- **Open with the group** (§18): what the trial identifiers (such as
  `D10_K_dip20_FS0.25`) encode, and whether the page's own fault-dip
  tooltip should change.

**Review.** The independent review found one blocking error, fixed
before approval.

- **The blocking error.** The first text called Weak, Moderate, and
  Strong uniform sediment only. The data holds them in layered sediment
  too (567 layered trials, the page's "Layered: Weak/Moderate/Strong"),
  so a reader filtering on "Strong" would have mixed the two.
- **Also applied:**
  - cohesion's unit, pascals, as the response-curves page shows it;
  - the `label` line no longer claims the page's spelling;
    `statistics.csv` writes the registry's "Deformation-zone width (m)";
  - the negative-height note;
  - the zip checker reads each section's entries only, after a
    description mentioning `dzw` had masked a missing entry (a test now
    covers it);
  - the import-time column check is removed, since the Node test holds
    it.

Tests and specs:

- **Node** (`test/explore-readme.test.ts`):
  - the README first, naming every member, with the report only when
    carried;
  - every column of both files, `records.csv` in order;
  - the explorer's address under the title, and no "confirmed";
  - LF-only plain text and the closing pointer;
  - the reused page wording;
  - the checker accepting the fallback layout, and rejecting a missing
    column, a masked one, an absent report mentioned, and CR line ends.

  `explore-report.test.ts` checks both layouts with the checker.
- **Specs.**
  - `explore-download` compares the real download's README with the
    approved text, the canonical address equal to the site's URL plus
    `explore/`.
  - `explore-report` does the same for the report-less archive and
    checks it with the checker's fallback layout.
  - `explore-report` and `explore-polish` assert the hint.

At this verification, on `task/g-30-download-readme` at `854b9a5`, over
`6989e55` (the owner's commit of guided DDD §18):

- **Build and unit tests.** The pinned Node suite passed all 501 tests,
  and typechecking and the bundles passed.
- **Site builds.** The strict publication and preview builds passed,
  with `explore-c3681e3fecd0.js` and `explore-2eabbd6235db.css`.
- **Unchanged.** The `/scenario/` bundles `app-066e39f81672.js` and
  `app-08bebc049c15.css` did not change.
- **Hooks and document checks.** All 37 hook and site tests passed.
  Relative links resolved, PDD agreement passed, and traceability
  reported no gap rows.
- **Lane.** The full lane passed 391 and skipped 11, with no failure,
  twice in a row, at load averages of 10 to 18.
- **Guided specs.** 238 passed and 6 were skipped, in `desktop` and
  `mobile`.
- **Earlier run.** The same commands had passed at `285a558`, the first
  text, before the review and the owner's revisions (Node 500; lane 391
  passed and 11 skipped, twice; guided 238 and 6).

(A later force-push replaced `854b9a5` on the task branch; the merged
commit of pull request #96, `bb1b0ab`, carries the same change — note of
2026-11-12.)

Not verified:

- how mail clients and spreadsheet tools on Windows show the README's
  UTF-8 punctuation (the em dashes and curly apostrophes) without a
  byte-order mark;
- screen-reader reading of the updated hint;
- browsers other than Chromium.

### JDK 21 for the Gradle jobs, 2026-11-11 (G-31)

G-31 ran under the owner's decision of 2026-11-11 ("Yes, fix it here
now", relayed by the planning session; the record is DDD §6.3, JDK for
the Gradle jobs, and the G-31 row, owner push `59a1a69`), before G-30's
merge.

**Why.** GitHub's `ubuntu-latest` runner moved to ubuntu-26.04, whose
default JDK is 25. The Gradle 8.10.2 wrapper runs on JDK 8–23
(ADR-0001), so every job that runs it stopped at start-up with "What
went wrong: 25.0.5". That is how PR #96 (G-30) failed, in run
43151790440 on ubuntu-26.04. The last green run before it, 42758276907
on 2026-11-10, was on ubuntu-24.04. No workflow had pinned a JDK.

**What changed** (PR #97, merge `47f2b3b`).

- **The fix.** The three jobs that run the wrapper install Temurin JDK
  21 with `actions/setup-java@v6`, right after checkout and before their
  first Gradle step:
  - `tests.yml`'s `webapp-test`;
  - `mkdocs.yml`'s `webapp-bundle`;
  - `mkdocs.yml`'s `build`.

  `@v6` is the action's current major tag, pinned bare-major as every
  other action in these files is.
- **Unchanged.** `pytest`, `links`, and `deploy` run no Gradle and are
  untouched. `runs-on` stays `ubuntu-latest`, the wrapper stays 8.10.2,
  and every other step stays.
- **Docs.** `docs/setup.md` notes that CI installs JDK 21.

**Evidence from the logs.**

- **PR #97's green run.** All three Gradle jobs (webapp-test
  130971516194, webapp-bundle 130971516689, build 130971913364) report
  "Image: ubuntu-26.04". Each logs the `actions/setup-java@v6` step with
  "Distribution: temurin" and "Version: 21.0.13+9". The Gradle steps
  run with `JAVA_HOME=/opt/hostedtoolcache/Java_Temurin-Hotspot_jdk/21.0.13-9/x64`,
  and no job reports "What went wrong".
- **PR #96 (G-30), rebased onto `47f2b3b`.** Its CI passed on the same
  image, for example webapp-test 130972955242 with "Image:
  ubuntu-26.04" and "Version: 21.0.13+9", and it merged as `2bae382`.

**Review.** An independent review passed. It covered:

- every wrapper job, each with the step before its first Gradle call;
- the diff scope (two workflow files and one line of `docs/setup.md`);
- valid YAML;
- the pin style and the action's current major;
- the image, the Java version, and `JAVA_HOME` in each Gradle job's log.

Not verified: the owner's manual deploy run (`workflow_dispatch`),
which uses the same `build` job and so the same step; it has not run
since this change.

## Separate CI investigation

The reported job `126383105016` belongs to historical run
`41771840814`, commit `51bed5a`, which lacked saved prototype files.
A later failure at `a718559` similarly lacked the results files.
At this investigation, HEAD `ad5d4c0` had a
[successful documentation job](https://github.com/HarvardRC/eps-ground-rupture/actions/runs/41789213295/job/126438413697).
Local checks at that commit resolved 5,421 links across 57 Markdown
files, passed PDD agreement, accepted 491 traceability rows without
gaps, and passed 19 documentation-script tests. Old failed runs retain
their historical status; no rerun or workflow modification was needed.
