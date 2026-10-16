# Ground Rupture Explorer — high-level design document

**Status:** first draft for owner review (2026-10-15).

<!-- toc -->

- [Introduction](#introduction)
- [1. Architecture decisions](#1-architecture-decisions)
- [2. Constraints that bind the architecture](#2-constraints-that-bind-the-architecture)
- [3. System overview](#3-system-overview)
- [4. Platform and surfaces](#4-platform-and-surfaces)
  * [4.1 Native client-side application (ADR-0010)](#41-native-client-side-application-adr-0010)
  * [4.2 Surface map (ADR-0010)](#42-surface-map-adr-0010)
  * [4.3 Language, toolchain, and repository shape (ADR-0011)](#43-language-toolchain-and-repository-shape-adr-0011)
- [5. Data architecture](#5-data-architecture)
  * [5.1 Product exports, not `dem.csv` (ADR-0012)](#51-product-exports-not-demcsv-adr-0012)
  * [5.2 The scenario artifact (ADR-0013)](#52-the-scenario-artifact-adr-0013)
  * [5.3 Row-level, not precomputed aggregates (ADR-0013)](#53-row-level-not-precomputed-aggregates-adr-0013)
  * [5.4 Committed, versioned artifacts (ADR-0014)](#54-committed-versioned-artifacts-adr-0014)
  * [5.5 Field-data export (ADR-0012)](#55-field-data-export-adr-0012)
  * [5.6 Reference results and parity (ADR-0015)](#56-reference-results-and-parity-adr-0015)
  * [5.7 Conversion coefficients (ADR-0015)](#57-conversion-coefficients-adr-0015)
- [6. Application architecture](#6-application-architecture)
  * [6.1 Failure honesty (ADR-0010)](#61-failure-honesty-adr-0010)
  * [6.2 Media architecture (ADR-0012)](#62-media-architecture-adr-0012)
- [7. Meeting the quality bars](#7-meeting-the-quality-bars)
  * [7.1 Budget arithmetic](#71-budget-arithmetic)
  * [7.2 Accessibility and environments](#72-accessibility-and-environments)
  * [7.3 Delivery and caching](#73-delivery-and-caching)
- [8. Site integration](#8-site-integration)
- [9. Testing and release architecture](#9-testing-and-release-architecture)
- [10. Risks and open dependencies](#10-risks-and-open-dependencies)
- [11. Decision records](#11-decision-records)
- [12. Explicitly not in this document](#12-explicitly-not-in-this-document)

<!-- tocstop -->

## Introduction

This high-level design document (HLDD) is the third of the project's
staged documents (PRD → PDD → HLDD). The product requirements document
(`docs/app/prd.md`) and the product definition document
(`docs/app/pdd.md`) are included by reference and remain authoritative
for what the product must do and what it is. This document decides the
architecture: the platform, the shape and delivery of the data, the
application's major components, how the product joins the existing
site, and how the PDD's quality bars are met. It names code, files,
tools, and repository paths freely — that is its job, per the owner's
standing decision that code-level pointers belong here and in the
detailed design, never in the PRD or PDD.

It deliberately stops above two further documents, which follow in the
next step: the **detailed design document** (DDD: exact formats and
schemas, algorithms, module and file structure, test inventories) and
the **implementation plan** (sequencing, milestones, effort). Chapter
12 lists the boundary in full.

Architecture decisions are recorded the way this repository already
records them: as ADRs in `docs/adr`. The six decisions this document
makes are drafted as **ADR-0010–ADR-0015**, status **Proposed**,
alongside this draft; chapter 1 is the index, and accepting the ADRs
is part of this document's review. Where the text cites PDD register
rows it keeps the PDD's status vocabulary (Decided, Proposed, Open,
Interim).

---

## 1. Architecture decisions

The decisions the PRD and PDD defer to the HLDD, each recorded as a
repository ADR (`docs/adr`, following the practice of ADR-0001–0009)
and drafted with status **Proposed** — the owner's review accepts or
amends them. This table is an index, not a second record: status
lives in each ADR, and the sections named in the last column carry
the design detail.

| ADR | Decision | Sources | Design detail |
|---|---|---|---|
| [ADR-0010](../adr/0010-native-client-side-scenario-app.md) | Platform: a native client-side application inside the existing MkDocs site — no backend, no server-side computation, no browser Python; the FR-G5 surface map (dashboards linked, not embedded; education and contact static); shared-link state in URL query parameters (versionless in v0.3); explicit failure honesty. | NFR-2, NFR-3, NFR-5, FR-G5, FR-X1, R-19, PDD D-15, PDD D-19, PRD §2.3, PRD §9.5 | §4.1, §4.2, §6, §6.1 |
| [ADR-0011](../adr/0011-webapp-toolchain.md) | Language and toolchain: TypeScript, esbuild bundle, no framework, hand-rolled SVG charts; a new `subprojects/webapp` Gradle subproject. | NFR-8, PDD §9 | §4.3 |
| [ADR-0012](../adr/0012-product-data-exports.md) | Five purpose-built pipeline exports feed the product — scenario artifact, field export, regression export, reference results, media index; `dem.csv` is never fetched by the product. | DR-1, DR-5, DR-6, FR-O5, FR-O6, FR-E1, NFR-6, R-12–R-14 | §5.1, §5.5, §6.2 |
| [ADR-0013](../adr/0013-row-level-scenario-artifact.md) | The scenario artifact is row-level, trial-major, and columnar (binary plus JSON manifest); the client computes counts and statistics; no precomputed aggregate matrix. | DR-1, DR-6, DR-7, FR-O2 | §5.2, §5.3 |
| [ADR-0014](../adr/0014-committed-content-hashed-artifacts.md) | Delivery and caching: product artifacts committed to the repository, content-hashed, pre-compressed; replace-not-accumulate versioning; no raw twin. | DR-2, DR-6, NFR-7, R-17 | §5.4, §7.3 |
| [ADR-0015](../adr/0015-golden-scenario-parity.md) | The pipeline pins every displayed number: golden-scenario reference results, a pipeline↔client parity harness, exported conversion coefficients. | DR-1, DR-3, SC-3, NFR-7, FR-S5, FR-G2, PDD D-3, R-17 | §5.6, §5.7, §9 |

---

## 2. Constraints that bind the architecture

Serves: NFR-1–NFR-8, DR-1, DR-2, DR-6, R-16–R-19, PDD §9.

- **Static hosting from `main`.** The site publishes via GitHub Pages
  through `.github/workflows/mkdocs.yml`; only pushes to `main` deploy
  (ADR-0009, `subprojects/mkdocs/DEPLOY.md`). The MVP must not require
  server-side computation, a database service, or a private backend
  (NFR-2, R-19).
- **One site, one build, one deploy.** The product shares the existing
  site's URL space (`https://harvardrc.github.io/eps-ground-rupture/`),
  navigation, strict MkDocs build, and deployment (NFR-2, NFR-7); the
  strict build fails on warnings and broken links, and pull requests
  run it as a validation check without deploying.
- **Budgets.** Initial data payload ≤ 4 MB compressed; first
  meaningful render ≤ 2.0 s cold at 10 Mbps; ≤ 1.0 s warm; scenario
  change to updated results ≤ 200 ms at the 95th percentile
  (PDD §9.1). No browser-based Python runtime or comparably heavy
  environment (NFR-3).
- **Environments.** Evergreen browsers released within 24 months;
  fully usable at 360 px; WCAG 2.2 AA for the product's new pages
  (PDD §9.2–9.3).
- **CI cannot rebuild the pipeline.** The raw inputs and the DuckDB
  store are gitignored; `.github/workflows/tests.yml` runs only the
  fixture-driven contracts (34 skips on a fresh clone). Everything the
  published product needs must therefore exist as committed, versioned
  artifacts (DR-2, R-17).
- **`dist/` is a local build area, not a delivery channel.** The
  Gradle CSV exports land in gitignored `dist/csv/`
  (`subprojects/python/build.gradle.kts`), and DR-1 forbids treating
  the 73 MB `dem.csv` Tableau-compatibility export as the product's
  data source. The product needs purpose-built exports with their own
  committed home (§5.4).
- **Licensing.** Application code Apache-2.0; page prose CC BY 4.0;
  paper figures under the publisher's author-sharing terms;
  third-party media release-gated (NFR-6).

---

## 3. System overview

Serves: DR-1, DR-2, NFR-2; PDD §2.

```
research archive (DesignSafe, gitignored locally)
      │  eps_ground_rupture pipeline (Poetry, pandas, DuckDB views)
      ▼
product exports (new views; Gradle tasks)
      │  committed to the site tree, content-hashed, versioned
      ▼
MkDocs Material build (--strict)  ──  GitHub Actions  ──  Pages (main)
      ▼
browser: scenario app (TypeScript) — fetch artifact → typed arrays
      → query engine → panels, downloads, shared links
```

Four hops, each with one owner. The **pipeline**
(`subprojects/python/src/eps_ground_rupture/`: `views.py`, `export.py`,
`csvexport.py`, `config.py`) remains the single computational source of
truth (DR-1): it gains product-facing views and an export task that
writes the scenario artifact, the field export, the regression
coefficients, and the golden-scenario reference results. The
**repository** carries those outputs as committed, versioned artifacts
(DR-2), because CI cannot regenerate them. The **site build** packages
them unchanged; the strict build and PR validation gate every change
(NFR-7). The **browser application** does all scenario-time work:
filtering, population selection, statistics, rendering, downloads —
there is nothing else that could (NFR-2).

---

## 4. Platform and surfaces

### 4.1 Native client-side application (ADR-0010)

The scenario page is a native, client-side web application embedded in
the existing site. Nothing else can satisfy the requirements together:

- The central capability — combined filtering over several conditions
  at once with recomputed statistics (PRD §1.4–1.5) — is exactly what
  the published dashboards cannot do, so linking or embedding Tableau
  cannot serve the scenario page itself (FR-G5 still governs the other
  surfaces, §4.2).
- A backend is forbidden by NFR-2 and recorded as infeasible for this
  host in R-19.
- A browser-side Python runtime (Pyodide and kin) is ruled out by
  NFR-3's weight prohibition.
- Client-side computation over a compact row-level artifact fits the
  budgets with margin (§5.2, §7.1) and keeps every displayed number
  testable against the pipeline (DR-1, §5.6).

### 4.2 Surface map (ADR-0010)

The FR-G5 decision, per surface, recorded in ADR-0010:

| Surface | Implementation | Rationale |
|---|---|---|
| Scenario page | **Native application page** | The combined query is the documented gap (PRD §1.4); nothing existing serves it. |
| Five published dashboards | **Links** from product surfaces to the existing site pages (which embed Tableau Public) | Reuse-first (PRD §2.3); PDD D-19 found no gap justifying a native panel; the product must not duplicate them (FR-G5). |
| Morphology page; How the measurements are made | **Static site pages** with animation and figure slots, plus the D-13 family toggle on the morphology page as a small page-local script (PDD §3.7, PDD §8.1–8.3) | Explanatory content; its one control (the family toggle) needs no app runtime. |
| Contact and requests (P3) | **Static site page** (PDD §8.4) | A page of links and addresses. |
| Glossary, citation, data, paper pages | **Reuse**, with only the PDD §5.11 glossary additions before launch; the product deep-links to anchors | Already serve the need (PRD §2.3). |

The scenario page links to dashboards rather than embedding them: an
embedded dashboard inside the scenario page would present two
disconnected filter models side by side and double the page weight for
no decision the PDD supports.

### 4.3 Language, toolchain, and repository shape (ADR-0011)

A new Gradle subproject, `subprojects/webapp`, following the
multi-project pattern of ADR-0001:

- **TypeScript in strict mode**, compiled and bundled by **esbuild**.
  The statistics engine must agree with the pipeline to the reference
  tolerance (SC-3); a typed language materially reduces the risk in
  exactly the code that parity-tests guard. esbuild is a single fast
  binary, wrapped in Gradle like the other toolchains, with Node and
  package versions pinned by lockfile.
- **No application framework.** The page is one view hierarchy with
  modest state (PDD §3–§4); the budgets (§7.1) and the WCAG target are
  easier to meet, and to audit, without a framework's runtime. NFR-8
  asks for the new toolchain, and its relation to the existing
  architecture decisions, in an ADR; ADR-0011 records it with the
  rejected alternatives (framework; plain untyped ES modules with no
  build step) and the reasons.
- **Charts are hand-rolled SVG.** The product draws exactly two chart
  kinds — histogram and empirical cumulative curve (PDD §4.1) — plus
  overlay marks. A charting library would dominate the code payload,
  fight the canonical palette and never-color-alone rules (FR-G2), and
  complicate the table-first accessibility contract (PDD §9.3). The
  bundle target is tens of kilobytes, charts included (§7.1).
- **Build output** (one JS bundle, one stylesheet) is emitted into the
  site tree with content-hashed filenames (§7.3) and referenced by the
  scenario page; the MkDocs build treats it as ordinary static assets.
  The site keeps its existing `extra_javascript` pattern
  (`subprojects/mkdocs/mkdocs.yml`) for site-wide scripts; the app
  bundle loads only on the scenario page. One inherited cost is
  scoped away: the site loads the third-party Tableau Embedding API
  on every page, but the scenario page carries no embeds, so it does
  not load that module (mechanics in the DDD).
- The deploy workflow's path filters
  (`.github/workflows/mkdocs.yml`: `subprojects/mkdocs/**` and the
  poetry files) widen to include `subprojects/webapp/**`, and
  `tests.yml` gains the webapp's test job (§9).

---

## 5. Data architecture

Serves: DR-1–DR-7, FR-O5, FR-O6, FR-S5; PDD §3.4, PDD §4.3, PDD §10.2.

### 5.1 Product exports, not `dem.csv` (ADR-0012)

The pipeline gains product-facing DuckDB views (in `views.py`, beside
the existing dashboard views) and an export task that writes five
product artifacts. Names below are indicative; the DDD fixes them.

| Artifact | Content | Scale |
|---|---|---|
| Scenario artifact (binary + manifest) | The full ensemble, product-shaped (§5.2) | ≈ 3.1–3.8 MB raw |
| Field export | One row per field measurement, normalized (§5.5) | tens of KB |
| Regression export | Per-dip conversion coefficients (§5.7) | < 1 KB |
| Reference results | Golden-scenario numbers at full precision (§5.6) | tens of KB |
| Media index | Animation/photo inventory with provenance (§6.2) | < 10 KB |

### 5.2 The scenario artifact (ADR-0013)

The export exploits the ensemble's verified geometry: 3,434 trials ×
exactly 101 stages = 346,834 records, with every site condition
constant within a trial. The artifact is therefore **trial-major and
columnar**:

- **Trial table** (3,434 rows): fault dip, sediment arm and strength
  label (the nine arm×label states of PDD §3.2), depth, density, and a
  **model-family dimension** reserved for the on-hold 3D arm (DR-7) —
  about 6 bytes per trial, ≈ 21 KB.
- **Stage arrays** (346,834 entries, trial-major so each trial owns a
  contiguous 101-stage run): slip, scarp height, deformation-zone
  width, scarp dip, scarp class. Slip (0–5.0135 m, 1,797 distinct
  values), scarp height (−0.182–5.029 m), and width (0–45.811 m) fit
  16-bit scaled integers losslessly at the export's recorded
  precision, with explicit null sentinels. Scarp dip
  (−12.529–89.765°, recorded at 0.001°) does not — its native grid
  needs 102,295 steps, beyond 16 bits — so the dip column is float32,
  a 16-bit dictionary index over its 35,854 distinct values, or a
  coarser scale justified by the display precision (PDD D-23); the
  DDD decides under the SC-3 parity rule (PDD §10.1). The bound is
  9–11 bytes per record: ≈ 3.12–3.82 MB raw beside the ≈ 21 KB trial
  table, and ≈ 0.84–1.07 MB on the wire (measured gzip of this exact
  layout). Even all-float32 stays inside the budgets.
- **JSON manifest**: data-export version and date (DR-2); record and
  trial counts; per-column minima and maxima and the recording step (these
  drive the window control's displayed actual range and step,
  PDD §3.4); the label dictionaries
  in canonical order (FR-G2); null sentinel definitions; checksums;
  and the paired reference-results version.

Nulls are stored as sentinels, never dropped: the two-count model
(PDD §3) and the excluded-null statistics line (FR-O2) need them. The
small negative measurements (1,232 scarp heights, 30 scarp dips) are
carried as-is; their treatment is the pipeline's documented
measurement-hygiene policy (DR-4), which the DDD will cite rather than
re-decide. Exact field encodings, scales, endianness, and layout are
DDD material.

### 5.3 Row-level, not precomputed aggregates (ADR-0013)

DR-1 leaves open precomputed aggregations, compact row-level data, or
a combination. The architecture is row-level, with only scalar
side-tables precomputed (regression coefficients, manifest ranges):

- The input space cannot be pre-aggregated: multi-selects over 7 dips,
  9 strength states, 3 depths, 3 densities, 64 scarp-type subsets, two
  populations, and a continuous slip window (PDD §3) explode
  combinatorially, and FR-O2's percentiles are order statistics that
  do not compose from partial aggregates.
- The full row-level artifact already fits the payload budget raw
  (§7.1), so precomputation would buy nothing the budgets need.
- One linear pass over typed arrays answers any scenario: per-trial
  condition mask (3,434 tests), then a stride-101 scan of the stage
  arrays for the window, population, class filter, and the per-panel
  valid/null split (PDD §4.5). Sorting the matched values for
  percentiles is the dominant cost and stays well inside the 200 ms
  interaction budget at full-ensemble size (§7.1).

### 5.4 Committed, versioned artifacts (ADR-0014)

Because CI cannot rebuild the pipeline (DR-2, R-17), the five product
artifacts are **committed to the repository**, in a dedicated data
directory beside the scenario page in the site tree (exact path in the
DDD). Rules:

- Filenames carry a content hash; the page references them through the
  manifest pinned at build time. A data refresh **replaces** the
  artifacts in one commit — git history is the archive of past
  vintages; the deployed site carries exactly one.
- This is the site's existing cache-busting convention, strengthened:
  the site already busts `extra.css` with a `?v=` query
  (`mkdocs.yml`, incident of 2026-09-16) because stable-named assets
  go stale in browser caches; content-hashed names make the product's
  assets immutable-by-address (NFR-7), so they can be cached hard
  (§7.3).
- The refresh flow extends the existing Gradle lane (`egrBuild`, the
  `csvExport*` tasks): one task exports, hashes, and writes the
  manifest and reference results together, so the artifact and its
  pins can never diverge; the owner commits the result as usual.
- The committed scenario file is the pre-compressed artifact the
  page actually fetches (§7.3), so repository growth is bounded at
  ≈ 1 MB per data refresh (the four text exports add tens of KB);
  ADR-0014 proposes committing no raw copy beside it. Refreshes are
  rare, deliberate events (a new export version is a product release,
  PDD §9.4).

### 5.5 Field-data export (ADR-0012)

One normalized per-measurement table for the overlays and the Kern
worked example (FR-O5, FR-O6), prepared in the pipeline (DR-5 name
normalization; sources already exist in the export lane:
`fdhi_cleaned.csv`, `kern_combined.csv`, `sure_enriched.csv`,
`historic_events.csv`). Each row carries: source compilation, event,
the measurement with its source-specific analogue kind (the PDD §4.4
map: FDHI vertical separation / fault-zone width; Kern vertical
scarp-height values / deformation-zone width; SURE scarp height /
fault-normal component), units, the sub-50-metre criterion flag, the
labeled-event-set membership, and provenance identifiers. The Kern
data group and principal-width rule stay Open with the research group
(PDD D-6); the export carries the slot either way.

### 5.6 Reference results and parity (ADR-0015)

The pipeline computes the golden scenarios GS-0–GS-7 (PDD §10.2) —
counts, per-measurement valid and excluded-null counts, and the full
FR-O2 statistic set — at full precision, and writes them as a
versioned reference artifact paired to the scenario artifact. Three
test layers consume it (§9): pipeline tests pin the views; webapp
parity tests replay every golden scenario through the client engine
and compare within the PDD §10.1 tolerance note; and the acceptance
walkthroughs read the same numbers. DR-3's one-state view is
implemented and tested in the pipeline first (3,434 trials, no
max-slip ties — both verified against the current export), so the
client's selection rule has a pipeline twin to agree with.

### 5.7 Conversion coefficients (ADR-0015)

The offset-to-slip assist (FR-S5, PDD §3.5–3.6, D-3) uses per-dip
regression slopes exported by the pipeline — the relationship the
dashboards already publish and `test_regression_views.py` already pins
(0.5021 at 30°, 0.6453 at 40°). The app never hardcodes a
coefficient; the export carries slope, dip, and the regression's
provenance so the PDD §5.6 copy can cite it.

---

## 6. Application architecture

Serves: FR-S1–S8, FR-O1–O6, FR-D1–D4, FR-X1–X2, FR-G1–G5; PDD §3–§7.

Six components, each a short contract here and a chapter in the DDD:

- **State and URL codec (ADR-0010).** One scenario-state object is the
  single source of truth; controls write it, everything else reads
  it. The codec serializes exactly the PDD §7.1 restore list to URL
  query parameters (versionless in v0.3, D-15) and restores it on
  load; results are always recomputed, never stored in the URL
  (FR-X1).
- **Query engine.** Pure functions from (artifact, scenario state) to
  results: condition mask → window and population selection (the
  state-from-window-alone rule, no-window = final states, PDD §3.7,
  DR-3) → per-panel valid/null split → FR-O2 statistics → the
  matching-record and valid-measurement counts of the two-count model
  (PDD §3). Pure and synchronous, so the parity harness (§5.6) can
  drive it headlessly.
- **View layer.** Input rail, scenario summary, measurement panels
  (SVG histogram + cumulative curve + the always-rendered statistics
  table as a real HTML table — the accessibility backbone, PDD §9.3),
  and the notice state machine of PDD §4.5 (no-match diagnostic,
  no-valid-measurement notice, warning and suppression tiers, their
  precedence). Colors and order come from the canonical palette
  (FR-G2; the pipeline's `config.py` `SCARP_CLASS_PALETTE` is the
  recorded source, re-emitted through the manifest dictionaries so
  the app has no hand-copied hex values).
- **Downloads.** Client-side generation (Blob/File APIs) of the
  matching-records CSV, the statistics table, and the provenance text
  of PDD §6.1, including the matching-record count, per-measurement
  valid counts, versions, and active caveats; chart export (P2) pairs
  a rendered caption strip with the same provenance text (PDD §6.3).
- **Field overlay.** Renders the field export (§5.5) as per-source
  black mark series with the analogue labels and criterion toggle of
  PDD §4.4; the Kern preset (PDD §4.7) is a stored scenario state
  plus walkthrough copy, inert until D-6 resolves.
- **Education surfaces.** Static pages (morphology, measurements,
  contact) built from the PDD §8 content with media slots from the
  media index (§6.2); the morphology page carries the D-13 family
  toggle (PDD §3.7 and PDD §8.1) as a page-local script; the scenario
  page links into them and into the glossary anchors (PDD §5.11).

### 6.1 Failure honesty (ADR-0010)

Three explicit failure modes, all required by NFR-5:

- **No JavaScript:** the scenario page's Markdown body carries real
  fallback content — what the tool is, links to the paper, archive,
  dashboards, glossary, and limitations — shown whenever the app does
  not mount; never a blank page.
- **Artifact load failure:** the app states plainly that the data
  could not be loaded and links to the fallback content; it never
  renders empty results as if they were valid.
- **Version mismatch:** the page refuses to compute when the fetched
  manifest's version differs from the one pinned at build time, and
  says so; the content-hashed addressing (§5.4) makes this state
  practically unreachable, which is the point.

### 6.2 Media architecture (ADR-0012)

Animations and photographs are ordinary site assets with one
committed **media index**: per item, the scarp type it illustrates,
source attribution, permission status, and caption; the research
group supplies the items (PDD D-8). The morphology
page and the PDD §6.4 animation offers render only from the index, so
"Animation not yet available" (PDD §8.2, R-13) and the photo release
gate (NFR-6, R-12: third-party photos may sit in the working tree
during development but are excluded from release until permissions
are documented) are data conditions, not code branches.

---

## 7. Meeting the quality bars

Serves: PDD §9 (D-9, D-16, D-17), NFR-3, NFR-4, NFR-5, DR-6.

### 7.1 Budget arithmetic

| Budget (PDD §9.1) | Mechanism | Expected |
|---|---|---|
| Payload ≤ 4 MB compressed | Scenario artifact ≈ 3.1–3.8 MB raw (§5.2); measured ≈ 0.84–1.07 MB on the wire, pre-compressed (§7.3); page shell ≈ 0.15 MB; app bundle tens of KB; field + reference + regression exports tens of KB | ≈ 1.0–1.25 MB — inside the budget with 3× margin |
| Cold render ≤ 2.0 s at 10 Mbps | Measured wire: artifact ≈ 0.84–1.07 MB plus page shell ≈ 0.15 MB at 1.25 MB/s → ≈ 0.8–1.0 s transfer; inflate ≈ 10 ms; typed-array views need no parse step; first panel renders in tens of ms | ≈ 1.0–1.2 s including connection setup — met with ≥ 0.8 s margin; the §10 spike confirms on real hosting |
| Warm render ≤ 1.0 s | Content-hashed immutable assets cached hard (§7.3): repeat visits fetch nothing but the page shell | well under 1.0 s |
| Interaction ≤ 200 ms p95 | Mask 3,434 trials + stride scan 346,834 stages (single-digit ms in evergreen engines); dominant cost is sorting matched values for percentiles, bounded by the full ensemble (~330k values) at tens of ms | met with margin; pre-sorted per-measurement indices remain a DDD option if measurement says otherwise |

### 7.2 Accessibility and environments

The WCAG 2.2 AA target (PDD §9.3) shapes the architecture rather than
decorating it: statistics tables are real tables and always rendered
with matching records; charts are SVG with text alternatives pointing
at those tables; every control is a native form element or an ARIA
pattern with visible focus; notices are live regions. The 24-month
evergreen baseline and the 360 px floor (PDD §9.2) admit every
platform API this design uses (ES2020+, typed arrays, URL and Blob
APIs, SVG); anything newer must clear the same bar in the DDD.

### 7.3 Delivery and caching

Product assets (bundle, stylesheet, data artifacts) carry content
hashes in their filenames and are referenced only through the build —
the immutable strengthening of the site's `?v=` convention (§5.4,
NFR-7). The scenario artifact ships **pre-compressed** and is
inflated in the browser with the built-in DecompressionStream API
(inside the PDD §9.2 evergreen baseline): GitHub Pages does not
promise transfer compression for binary media types, so
pre-compression makes the measured ≈ 0.84–1.07 MB wire size a
property of the artifact rather than of the host. Even served raw
(≈ 3.1–3.8 MB) the artifact would stay inside the 4 MB payload
budget, but the
committed, fetched file is the compressed one (§5.4). The scenario
page itself stays a normal MkDocs page so Material's own asset
fingerprinting, navigation, and search keep working. Nothing about
the existing dashboards, navigation, citation pages, or deploy
process changes (NFR-7, SC-6); the glossary gains only the PDD §5.11
additions.

---

## 8. Site integration

Serves: PDD §2 (D-2), NFR-2, FR-G4, DR-2.

- **Navigation:** a top-level "Scenario explorer" entry after
  Dashboards in `subprojects/mkdocs/mkdocs.yml` (PDD §2.2, D-2
  Proposed); morphology and measurement pages join the explanatory
  section; Contact joins last.
- **Page and assets:** the scenario page is one Markdown page in
  `subprojects/mkdocs/docs/` carrying the no-JS fallback body and the
  app mount point; the bundle and data live in a dedicated assets
  directory beside it (final naming in the DDD).
- **Versions on display (FR-G4, DR-2, PDD §7.2):** the product footer
  and every download show the software version (the product release
  version, stamped into the bundle at build time) and the data-export
  version (read from the manifest). The version-source mechanics —
  tag, constant, or build metadata — are DDD detail; the HLDD fixes
  only that both values exist, are distinct, and are stamped at build
  time, not fetched.
- **Build gates:** the scenario page participates in the strict build
  like any page (broken internal links fail the build); the deploy
  workflow's path filters widen to `subprojects/webapp/**` so webapp
  changes build and validate the site exactly as mkdocs changes do
  today (§4.3, §9).

---

## 9. Testing and release architecture

Serves: NFR-7, DR-1, DR-3, SC-3, SC-6, R-16, R-17; PDD §10.

Four layers, three of them CI-enforced:

1. **Pipeline tests** (`subprojects/python/tests`, pytest): contracts
   for the new product views — geometry (3,434 × 101), the one-state
   view with no max-slip ties (DR-3), null policies (DR-4), field
   normalization (DR-5), and the golden-scenario reference generator.
   Fixture-driven like the existing suite, so they run on a fresh
   clone.
2. **Webapp tests** (new job in `tests.yml`): unit tests for the
   codec and engine, plus the **parity harness** — every golden
   scenario (GS-0–GS-7) replayed through the client engine against
   the committed reference results within the PDD §10.1 tolerance.
   Runs headlessly in Node against the committed artifacts; no
   browser farm in the MVP.
3. **Site validation**: the strict MkDocs build on every PR touching
   `subprojects/mkdocs/**` or `subprojects/webapp/**`; deploy from
   `main` only (ADR-0009), unchanged.
4. **Acceptance walkthroughs** (PDD §10.3): scripted US-1–US-3 demos
   against the golden scenarios before release, plus the SC-5 candor
   and SC-7 sign-off checks — human-run by design.

**Release flow** (unchanged in authority — the owner commits): refresh
exports locally through the Gradle lane → the export task writes
artifacts, manifest, and references together (§5.4, §5.6) → commit →
PR (validation builds) → merge to `main` → Pages deploy. A data
refresh and a software release both bump a displayed version
(PDD §9.4); rollback is a git revert, which the committed-artifact
model makes complete by construction. Sequencing and effort belong
to the implementation plan, not here.

---

## 10. Risks and open dependencies

Architecture-level entries only; the PRD §9 register remains the
master list.

| Risk / dependency | Position here | Mitigation / owner |
|---|---|---|
| R-19 static-site feasibility | Settled by design: §5.2–§5.3 fit the budgets with margin | Early payload-and-timing spike on real hosting validates §7.1's two flagged estimates (measured wire size and inflate cost of the pre-compressed artifact; full-ensemble percentile sort) — architect |
| R-17 CI cannot rebuild the pipeline | Absorbed: committed artifacts + fixture-driven tests (§5.4, §9) | Keep reference generation inside the export task — architect |
| R-16 single-site blast radius (SC-6) | Contained: additive pages, no changes to existing assets, strict build + PR validation | §8, §9 — owner's release lane |
| New toolchain (Node/esbuild) maintenance | Accepted, pinned, Gradle-wrapped (§4.3) | Recorded in ADR-0011 per NFR-8 — owner |
| Repository growth from committed data | Bounded ≈ 1 MB per refresh, replace-not-accumulate (§5.4) | Revisit only if refresh cadence changes — owner |
| D-6 Kern group; D-8 animation coverage; D-10 liability text; R-1/R-2/R-3 scientific inputs; R-12 photo permissions; R-15 repo URLs | Carried as data/content slots; none blocks the architecture | PDD register owners (research group / owner) |
| 3D arm (DR-7) | Model-family dimension reserved in the trial table (§5.2); at 3D scale one artifact per model family (the manifest pins multiple files; the default page fetches the 2D family alone) | Recorded in ADR-0013 and ADR-0014; nothing needed now |

---

## 11. Decision records

The six architecture decisions of chapter 1 are drafted as repository
ADRs — the project's standing decision record (`docs/adr`,
ADR-0001–0009) — with status **Proposed**, alongside this document:

- **ADR-0010** — the native client-side application and the FR-G5
  surface map, with URL-borne shared-link state and failure honesty;
- **ADR-0011** — the webapp toolchain: TypeScript, esbuild, no
  framework, hand-rolled SVG charts, `subprojects/webapp`;
- **ADR-0012** — the five purpose-built product exports;
- **ADR-0013** — the row-level, trial-major columnar scenario
  artifact and client-side computation;
- **ADR-0014** — committed, content-hashed, pre-compressed delivery;
- **ADR-0015** — golden-scenario references and the pipeline↔client
  parity harness.

NFR-8's requirement that the platform decision land in an ADR is met
by ADR-0010 and ADR-0011. Accepting the ADRs is part of this
document's review; after acceptance, a changed decision gets a new,
superseding ADR rather than an edit (`docs/adr/README.md`).

Separately, ADR-0007 still carries its stale "Kern County is red"
clause (its decision 1 contradicts the later visual-identity
convention and the built dashboards); the short superseding errata it
needs is repo housekeeping, independent of this design.

---

## 12. Explicitly not in this document

Owned by the **DDD** (next step): the artifact's exact binary layout,
scales, and sentinels; the manifest and export schemas field by field;
algorithm specifications (statistics, population selection, URL
codec, binning); the webapp's module and file structure; the assets
directory naming; version-stamp mechanics; the test-case inventory
and tolerances per calculation; accessibility implementation
specifics; error copy wiring into PDD §5.

Owned by the **implementation plan** (with the DDD): sequencing,
milestones, effort, and the release calendar.

Owned by the **PRD and PDD**: every requirement and every product
behavior — this document chooses how they are built, and adds no
obligations of its own. Owned by the **research group**: every Open
row it holds in the PDD register.
