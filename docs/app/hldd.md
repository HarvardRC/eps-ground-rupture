# Ground Rupture Explorer — high-level design document

**Status:** first draft for owner review (2026-10-15).

<!-- toc -->

- [Introduction](#introduction)
- [1. Architecture decisions](#1-architecture-decisions)
- [2. Architectural constraints](#2-architectural-constraints)
  * [Source requirements and constraints](#source-requirements-and-constraints)
  * [Static hosting](#static-hosting)
  * [Shared site, build, and deployment](#shared-site-build-and-deployment)
  * [Performance budgets](#performance-budgets)
  * [Supported browsers, screen sizes, and accessibility](#supported-browsers-screen-sizes-and-accessibility)
  * [Locally generated data](#locally-generated-data)
  * [Separate application data exports](#separate-application-data-exports)
  * [Licensing and media permissions](#licensing-and-media-permissions)
- [3. System overview](#3-system-overview)
  * [Source requirements](#source-requirements)
  * [Data preparation and publication](#data-preparation-and-publication)
  * [Interactive use in the browser](#interactive-use-in-the-browser)
- [4. Platform and surfaces](#4-platform-and-surfaces)
  * [4.1 Native client-side application (ADR-0010)](#41-native-client-side-application-adr-0010)
  * [4.2 Surface map (ADR-0010)](#42-surface-map-adr-0010)
  * [4.3 Language, toolchain, and repository shape (ADR-0011)](#43-language-toolchain-and-repository-shape-adr-0011)
- [5. Data architecture](#5-data-architecture)
  * [5.1 Application data exports, not `dem.csv` (ADR-0012)](#51-application-data-exports-not-demcsv-adr-0012)
  * [5.2 Simulation data organization (ADR-0013)](#52-simulation-data-organization-adr-0013)
  * [5.3 Records rather than precomputed summaries (ADR-0013)](#53-records-rather-than-precomputed-summaries-adr-0013)
  * [5.4 Committed, versioned artifacts (ADR-0014)](#54-committed-versioned-artifacts-adr-0014)
  * [5.5 Field-data export (ADR-0012)](#55-field-data-export-adr-0012)
  * [5.6 Reference results and verification (ADR-0015)](#56-reference-results-and-verification-adr-0015)
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

This high-level design document (HLDD) is the third document in the
project's staged development process:

PRD → PDD → HLDD → DDD → IP

The [product requirements document](prd.md) defines what the product
must do. The [product definition document](pdd.md) defines its pages,
controls, states, and user-visible behavior. Both are included by
reference and remain authoritative within their respective scopes.

This document defines the architecture: the technical platform, data
organization and delivery, major application components, integration
with the existing site, and the approach to meeting the PDD's
[quality requirements](pdd.md#9-product-quality-bars). It may reference
code, files, tools, and repository paths where they clarify an
architectural decision. Such implementation references belong here and
in the detailed design, not in the PRD or PDD.

The HLDD is followed by the **detailed design document** (DDD: exact 
formats and schemas, algorithms, module and file structure, test 
inventories) and the **implementation plan** (sequencing, milestones,
effort). The implementation plan serves as an execution brief for a 
coding agent: it defines ordered tasks, constraints, and acceptance 
checks in enough detail that the agent can implement them without 
making unresolved product, architecture, or design decisions.

[Chapter 12](#12-explicitly-not-in-this-document) lists the boundary in full.

Architectural decisions are recorded in the [architecture decision
record (ADR) directory](../adr). This HLDD explains how those decisions
fit together into a coherent design; it does not replace the ADRs as
the authoritative decision records.

The six architecture decisions supporting this draft are recorded in
[ADR-0010–ADR-0015](../adr/README.md), each with status **Proposed**.
[Chapter 1](#1-architecture-decisions) provides their index. Approval of
this HLDD includes accepting or amending those proposals.

The DDD and IP take accepted architectural decisions as constraints
rather than reopening them. If detailed design or implementation reveals
a need to change an architectural decision, the change must follow the
project's [ADR process](../adr/README.md) before dependent work
proceeds.

---

## 1. Architecture decisions

This design is based on six proposed architecture decisions, recorded in
[ADR-0010–ADR-0015](../adr/README.md). The table below summarizes what
each decision covers and points to the corresponding explanation in this
document.

The ADRs are the authoritative decision records. Their status remains
**Proposed** during review of this HLDD. At the end of the review,
approved decisions are marked **Accepted**, incorporating any amendments
agreed during review.

| ADR | Decision | Explanation in this document |
|---|---|---|
| [ADR-0010](../adr/0010-native-client-side-scenario-app.md) | **Application platform and site integration.** Build the scenario page as a client-side application within the existing MkDocs site. Filtering and calculations run in the browser, without a backend or browser-based Python runtime. Reuse existing dashboards through links and use static pages for educational and contact content. | [§4.1 Native client-side application](#41-native-client-side-application-adr-0010), [§4.2 Surface map](#42-surface-map-adr-0010), [§6 Application architecture](#6-application-architecture), [§6.1 Failure honesty](#61-failure-honesty-adr-0010) |
| [ADR-0011](../adr/0011-webapp-toolchain.md) | **Language and build tools.** Use TypeScript and esbuild, without an application framework. Draw charts using SVG. Add a Gradle subproject to build and test the application. CI builds the application bundle; it is never committed. | [§4.3 Language, toolchain, and repository shape](#43-language-toolchain-and-repository-shape-adr-0011), [§9 Testing and release architecture](#9-testing-and-release-architecture) |
| [ADR-0012](../adr/0012-product-data-exports.md) | **Data supplied by the pipeline.** Export simulation records, field measurements, conversion coefficients, reference results for testing, and a media index for the later education pages and animation offers. The application does not load the existing Tableau-oriented `dem.csv` file. | [§5.1 Application data exports, not `dem.csv`](#51-application-data-exports-not-demcsv-adr-0012), [§5.5 Field-data export](#55-field-data-export-adr-0012), [§6.2 Media architecture](#62-media-architecture-adr-0012) |
| [ADR-0013](../adr/0013-row-level-scenario-artifact.md) | **Simulation-data organization and calculation.** The browser receives the individual recorded stages of the simulations, not just precomputed counts or summary statistics. Site conditions are stored once per simulation trial; measurements are stored for each recorded stage, grouped by measurement rather than by record. When a user changes the scenario, the browser selects the matching records and calculates their counts, percentiles, and other statistics. | [§5.2 Simulation data organization](#52-simulation-data-organization-adr-0013), [§5.3 Records rather than precomputed summaries](#53-records-rather-than-precomputed-summaries-adr-0013), [§7.1 Budget arithmetic](#71-budget-arithmetic) |
| [ADR-0014](../adr/0014-committed-content-hashed-artifacts.md) | **Data publication and versioning.** Commit the application data files to the repository. Publish compressed simulation data and use filenames that change when file content changes. Deploy only the current data version; retain earlier versions in Git history. Derived data keeps its source terms: it stays out of the release source archive and is attached to each release as a data asset. | [§5.4 Committed, versioned artifacts](#54-committed-versioned-artifacts-adr-0014), [§7.3 Delivery and caching](#73-delivery-and-caching) |
| [ADR-0015](../adr/0015-golden-scenario-parity.md) | **Data and calculation verification.** Verify two things separately: that the exported application data preserves the pipeline's approved records and values, and that the application's filtering and statistics reproduce independently calculated pipeline results for predefined test scenarios. The pipeline also supplies the surface-offset-to-slip conversion coefficients, so the application does not maintain a separate copy of those numbers. | [§5.6 Reference results and verification](#56-reference-results-and-verification-adr-0015), [§5.7 Conversion coefficients](#57-conversion-coefficients-adr-0015), [§9 Testing and release architecture](#9-testing-and-release-architecture) |

---

## 2. Architectural constraints

The architecture must satisfy the following requirements and operate
within the existing project's hosting, build, and data-management
arrangements.

### Source requirements and constraints

| Reference | Subject |
|---|---|
| [NFR-1–NFR-8](prd.md#8-non-functional-requirements) | Non-functional requirements: public access, hosting, performance, supported environments, accessibility, licensing, quality gates, and architecture decision records. |
| [DR-1](prd.md#dr-1-controlled-data-source) | Controlled data sources and verification of calculated statistics. |
| [DR-2](prd.md#dr-2-versioned-exports) | Versioned, dated data exports committed for use by the application and named in displayed results and downloads. |
| [DR-6](prd.md#dr-6-payload-and-interaction-support) | Data-download size, and support for responsive, combined scenario filtering. |
| [R-16–R-19](prd.md#94-delivery-and-technical-risks) | Delivery and technical risks: payload size versus combined filtering, locally generated data, shared-site deployment, and the prohibition on server-side computation. |
| [PDD §9](pdd.md#9-product-quality-bars) | Performance budgets, browser and mobile support, accessibility target, and release-version rules. |

### Static hosting

The site is published on GitHub Pages by
[`.github/workflows/mkdocs.yml`](../../.github/workflows/mkdocs.yml).
Only the repository's `main` branch is deployed, either by a push that
changes the files the workflow watches or by a manual run of the
workflow.

The minimum viable product (MVP) must not require server-side
computation, a database service, or a private backend.

The product must be free to use: it must not require a login, user
account, subscription, or payment, and it must not add product-specific
visitor tracking.

References:

- [ADR-0009 — GitHub Pages (via Actions) as site hosting](../adr/0009-github-pages-hosting.md).
- [Deployment documentation](../../subprojects/mkdocs/DEPLOY.md).
- [NFR-1 — Free public access](prd.md#nfr-1-free-public-access).
- [NFR-2 — Static-site hosting](prd.md#nfr-2-static-site-hosting).
- [R-19 — The static-site constraint prohibits server-side computation](prd.md#94-delivery-and-technical-risks).

### Shared site, build, and deployment

Ground Rupture Explorer must remain part of the existing project site.
It shares the site's URL space, navigation, MkDocs build, and deployment
process.

The strict MkDocs build must remain green: it fails on warnings and
broken links according to the repository's existing rules. Pull requests
that touch the site run the build for validation without publishing the
site.

The existing dashboards, citation material, navigation, and deployment
process must remain functional after each release.

Changes to reader-visible assets must follow the site's cache-busting
convention: an asset's address changes when its content changes. Each
product release updates the displayed software version, and each data
refresh updates the displayed data-export version; both always appear in
the footer and in downloads.

References:

- [ADR-0009 — GitHub Pages (via Actions) as site hosting](../adr/0009-github-pages-hosting.md).
- [NFR-2 — Static-site hosting](prd.md#nfr-2-static-site-hosting).
- [NFR-7 — Build and data-quality gates](prd.md#nfr-7-build-and-data-quality-gates).
- [R-18 — The scenario page shares a single GitHub Pages site, URL space, build, and deploy job with the existing website](prd.md#94-delivery-and-technical-risks).
- [PDD §9.4 — Releases](pdd.md#94-releases).

### Performance budgets

The PDD specifies the following budgets:

| Measure | Budget |
|---|---|
| Initial data downloaded by the scenario page | No more than 4 MB, compressed. |
| First meaningful render with an empty browser cache, on a 10 Mbps connection | No more than 2.0 seconds. |
| Repeat-visit render with previously downloaded assets available in the browser cache | No more than 1.0 second. |
| Time from a scenario change to updated results | No more than 200 milliseconds for at least 95% of measured interactions. |

Both render budgets end at the **first meaningful render** that PDD §9.1
defines.

The data design must meet the payload budget without preventing the
combined scenario filtering that the MVP requires.

The application must not require downloading a browser-based Python
runtime or a comparably heavy execution environment.

These budgets are acceptance targets, not claims that the proposed
architecture has already met them. Measurements must establish
compliance under the PDD's reference conditions: a mid-range laptop
(2020 or later) on a 10 Mbps connection, with a cold cache for first
visits and a warm cache for repeat visits.

References:

- [PDD §9.1 — Performance budgets](pdd.md#91-performance-budgets-d-9-proposed).
- [NFR-3 — Responsive interaction](prd.md#nfr-3-responsive-interaction).
- [DR-1 — Controlled data source](prd.md#dr-1-controlled-data-source).
- [DR-6 — Payload and interaction support](prd.md#dr-6-payload-and-interaction-support).
- [R-16 — Combined scenario filtering requires enough detail to support arbitrary filters, but the static site has a strict payload budget](prd.md#94-delivery-and-technical-risks).

### Supported browsers, screen sizes, and accessibility

The application must support the browser baseline defined in the PDD:
evergreen Chrome, Edge, Firefox, and Safari versions released within
24 months of each product release, and iOS Safari and Android Chrome in
the same window.

It must remain fully usable at a viewport width of 360 CSS pixels.
Essential controls and information must not depend on hover.

The accessibility target for new product pages is Web Content
Accessibility Guidelines (WCAG) 2.2 Level AA. The PRD's own
accessibility list is a project-specific floor on top of it, and the
statistics table is the canonical text alternative for every
measurement chart.

If the data fails to load, or does not match the version the page
expects, the page must say so plainly; it must not render empty or
stale results as if they were valid. Visitors without JavaScript must
receive honest fallback content that explains that the interactive page
requires JavaScript, never a blank or misleading page.

References:

- [PDD §9.2 — Browser and mobile baseline](pdd.md#92-browser-and-mobile-baseline-d-16-proposed).
- [PDD §9.3 — Accessibility target](pdd.md#93-accessibility-target-d-17-proposed).
- [NFR-4 — Supported environments](prd.md#nfr-4-supported-environments).
- [NFR-5 — Accessibility](prd.md#nfr-5-accessibility).

### Locally generated data

The pipeline's simulation and field-measurement inputs, stored in
`data/raw/`, are not committed to the repository.

Continuous integration (CI) runs the tests, builds the application and
the site, and deploys them, using only the committed repository
contents. It cannot run the pipeline, so it cannot regenerate the
application data. Its test workflow, `.github/workflows/tests.yml`,
skips every test that needs those inputs or the uncommitted files built
from them (`data/processed/` and the DuckDB file); those tests run only
locally.

The project owner must therefore run the pipeline locally and commit
the application data files, the exports listed in §5.1, each with its
export version and export date. The site build copies those files
unchanged; it does not run the pipeline.

References:

- [DR-2 — Versioned exports](prd.md#dr-2-versioned-exports).
- [R-17 — Continuous integration cannot rebuild the full pipeline because raw inputs are local-only](prd.md#94-delivery-and-technical-risks).
- [§5.1 — Application data exports, not `dem.csv`](#51-application-data-exports-not-demcsv-adr-0012).

### Separate application data exports

The pipeline's existing CSV exports supply the Tableau Public
dashboards. They are written to `dist/csv/`, a gitignored local
directory, and reach Tableau Public when the owner refreshes and
republishes the workbooks. They are not inputs to the site build, and
committing them would not be enough: they carry no export version or
date.

The application must use separate exports prepared by the same pipeline
for browser filtering, statistics, and downloads. Those exports must be
committed; §5.4 places them beside the scenario page. Statistics
calculated in the browser must be tested against pipeline-computed
reference results for defined scenarios, and no reader-visible number
may depend solely on untested front-end logic.

In particular, the application must not use the 73 MB `dem.csv` as its
primary data source or require users to download it, or another
comparably large payload, during initial loading.

References:

- [ADR-0006 — CSV exports feed the published workbooks](../adr/0006-csv-extracts-for-tableau-public.md).
- [DR-1 — Controlled data source](prd.md#dr-1-controlled-data-source).
- [DR-2 — Versioned exports](prd.md#dr-2-versioned-exports).
- [DR-6 — Payload and interaction support](prd.md#dr-6-payload-and-interaction-support).
- [NFR-7 — Build and data-quality gates](prd.md#nfr-7-build-and-data-quality-gates).
- [§5.1 — Application data exports, not `dem.csv`](#51-application-data-exports-not-demcsv-adr-0012).
- [§5.4 — Committed, versioned artifacts](#54-committed-versioned-artifacts-adr-0014).

### Licensing and media permissions

The product must preserve the project's licensing requirements:

- application code: Apache-2.0;
- page prose: CC BY 4.0; and
- paper figures: the publisher's applicable author-sharing terms,
  including any restrictions on commercial use, modification, and
  required attribution.

Third-party photographs and other externally owned media must not be
included in a public release until the required permissions have been
confirmed. A public release is the deployed site or a tagged GitHub
release, whose source archive feeds the project's planned Zenodo record.

The application data files derived from the input datasets keep those
datasets' terms rather than the code's Apache-2.0. All application data
files stay out of the Apache-2.0 source archive of every release, as
the paper figures already do. How they are distributed is set in §5.4;
confirming each source's terms is an open dependency (§10).

References:

- [NFR-6 — Licensing](prd.md#nfr-6-licensing).
- [README — Licensing](../../README.md#licensing).
- [§5.4 — Committed, versioned artifacts](#54-committed-versioned-artifacts-adr-0014).
- [§10 — Risks and open dependencies](#10-risks-and-open-dependencies).

---

## 3. System overview

Ground Rupture Explorer has two separate operating flows:

1. **Data preparation and publication:** the project owner runs the
   pipeline locally, commits the exported application data, and publishes
   the site through the existing build and deployment process.
2. **Interactive use:** a visitor's browser loads the published
   application and data, then filters records, calculates statistics,
   and displays results without contacting a computation service.

The interactive flow runs on the scenario page; the product's other
pages are static site pages
([§4.2](#42-surface-map-adr-0010)).

### Source requirements

| Reference | Subject |
|---|---|
| [DR-1](prd.md#dr-1-controlled-data-source) | Controlled data sources and verification of calculated statistics. |
| [DR-2](prd.md#dr-2-versioned-exports) | Versioned application data committed to the repository. |
| [NFR-2](prd.md#nfr-2-static-site-hosting) | Static-site hosting without server-side computation. |
| [NFR-7](prd.md#nfr-7-build-and-data-quality-gates) | Build validation, numerical tests, and release safeguards. |
| [PDD §2](pdd.md#2-product-structure-and-navigation) | Product pages and integration with the existing site. |
| [PRD §1.3](prd.md#the-designsafe-data-archive) | The DesignSafe archive that holds the simulation outputs. |
| [FR-S5–FR-S7](prd.md#51-scenario-inputs-c1-p1) | Displacement window, population selection, and scarp-type filter. |
| [FR-O2](prd.md#fr-o2-summary-statistics) | Summary statistics for each measurement. |
| [FR-X1](prd.md#fr-x1-shareable-scenario-links) | Shareable scenario links. |

### Data preparation and publication

```text
Simulation datasets archived on DesignSafe, and field
measurements from past earthquakes (FDHI, SURE, Kern County)
      │
      │ Local copies, excluded from Git
      ▼
Local Python data pipeline
      │
      │ Prepare application data, including reference results
      ▼
Versioned exports committed to the repository
      │
      │ Pull request: tests, application build,
      │ and strict site-build validation
      │ Merge to main: application build, site build, deployment
      ▼
Existing MkDocs site published on GitHub Pages
```

The **data pipeline**, in
`subprojects/python/src/eps_ground_rupture/`, prepares the data that the
application consumes. Its inputs are the simulation outputs archived on
DesignSafe and the field-measurement compilations described in
[`docs/datasets.md`](../datasets.md). The relevant existing modules are
`views.py` (the DuckDB views, where the product views are added),
`export.py` (writes the Parquet tables that the views read),
`csvexport.py` (writes the dashboards' CSV exports), and `config.py`
(paths and shared constants, including the scarp-type palette).

The pipeline is extended to produce the exports listed in
[§5.1](#51-application-data-exports-not-demcsv-adr-0012):

- simulation records, one for each recorded stage of each simulation
  trial, organized for browser filtering and calculation;
- field measurements for comparison with simulation results;
- coefficients for converting an anticipated vertical surface offset
  into fault slip at depth;
- full-precision reference counts and statistics for predefined test
  scenarios, the golden scenarios of the PDD; and
- a media index identifying available animations and photographs, their
  attribution, and their permission status. It arrives in
  [P2](prd.md#22-mvp-and-delivery-priorities) (the second delivery
  priority, after the MVP), together with the pages and animation
  offers that use it.

The project owner generates these exports locally and commits them to
the repository. Each export has an identifiable version and export
date, and filenames change when their contents change. Before the files
are committed, the export task decodes the simulation records it has
just written and compares them with the pipeline's data; CI later
checks the committed files against the checksums that the export task
records. CI cannot run the pipeline, so it cannot regenerate these
exports.

The **site build** includes the committed data files without
recalculating their contents. A separate CI job compiles the TypeScript
application and hands the result to the MkDocs build; the compiled
application is never committed
([§4.3](#43-language-toolchain-and-repository-shape-adr-0011)).
Pull-request (PR) checks run the tests and the strict MkDocs build, and
§4.3 widens both workflows' path filters so that application and data
changes trigger them. After changes are merged to `main`, the deployment
workflow builds and publishes the site through GitHub Pages.

### Interactive use in the browser

```text
Published application and data files
      │
      │ Loaded by the visitor's browser
      ▼
Scenario controls
      │
      │ Current scenario settings
      ▼
Filtering and statistical calculations
      │
      ▼
Charts, tables, notices, and downloadable results
```

The **browser application**, written in TypeScript, loads the simulation
data into arrays suitable for filtering and calculation. When the page
loads, and whenever a visitor changes the scenario, the application:

1. selects records matching the site conditions (fault dip and the
   sediment properties) and the displacement window (a range of fault
   slip at depth);
2. applies the selected population (all model stages in the slip
   window, or one state per simulation trial, chosen from the window
   alone), then the scarp-type filter;
3. counts the matching records and, for each measurement (scarp height,
   deformation-zone width, and scarp dip), the records with a valid,
   non-null value;
4. calculates the summary statistics for each measurement; and
5. updates charts, tables, notices, and downloadable results.

The pipeline defines the authoritative data transformations and
reference calculations. The browser application implements the
interactive calculations, and tests verify that its results agree with
the pipeline's reference results.

No scenario settings are sent to a backend for filtering or calculation.
Downloads are generated in the browser from the selected records and
results.

In [P2](prd.md#22-mvp-and-delivery-priorities) (the second delivery
priority, after the MVP), shareable links restore the scenario settings
and the selected view in the browser. The application then recalculates
the results using the currently published software and data; the link
does not retrieve a saved report.

---

## 4. Platform and surfaces

### 4.1 Native client-side application (ADR-0010)

The scenario page is a native, client-side web application embedded in
the existing site. Nothing else can satisfy the requirements together:

- The central capability — combined filtering over several conditions at
  once with recomputed statistics ([PRD §1.4–1.5](prd.md#14-the-gap) The
  gap and the product opportunity) — is exactly what the published
  dashboards cannot do, so linking or embedding Tableau cannot serve the
  scenario page itself (the other surfaces are still governed by
  [FR-G5](prd.md#fr-g5-reuse-of-existing-full-dataset-dashboards-c8)
  Reuse of existing full-dataset dashboards; see
  [§4.2](#42-surface-map-adr-0010)).
- A backend is forbidden by [NFR-2](prd.md#nfr-2-static-site-hosting)
  (Static-site hosting) and recorded as infeasible for this host in
  [R-19](prd.md#94-delivery-and-technical-risks) (Risk: the static-site
  constraint prohibits server-side computation).
- A browser-side Python runtime (Pyodide and kin) is ruled out by the
  weight prohibition of [NFR-3](prd.md#nfr-3-responsive-interaction)
  (Responsive interaction).
- Client-side computation over a compact row-level artifact is expected
  to fit the budgets with margin
  ([§5.2](#52-simulation-data-organization-adr-0013);
  [§7.1](#71-budget-arithmetic)) and keeps every displayed number
  testable against the pipeline
  ([DR-1](prd.md#dr-1-controlled-data-source) Controlled data source;
  [§5.6](#56-reference-results-and-verification-adr-0015)).

### 4.2 Surface map (ADR-0010)

The decision under
[FR-G5](prd.md#fr-g5-reuse-of-existing-full-dataset-dashboards-c8)
(Reuse of existing full-dataset dashboards), per surface, recorded in
[ADR-0010](../adr/0010-native-client-side-scenario-app.md) as
[NFR-8](prd.md#nfr-8-architecture-decision-record) (Architecture
decision record) requires:

| Surface | Implementation | Rationale |
|---|---|---|
| Scenario page | **Native application page** | The combined query is the documented gap ([PRD §1.4](prd.md#14-the-gap)); nothing existing serves it. |
| Five published dashboards | **Links** from product surfaces to the existing site pages (which embed Tableau Public) | Reuse-first ([PRD §2.3](prd.md#23-reuse-first-principle)); [PDD D-19](pdd.md#1-decision-register) (Native full-dataset exploration panel in v0.3) found no gap justifying a native panel; the product must not duplicate them ([FR-G5](prd.md#fr-g5-reuse-of-existing-full-dataset-dashboards-c8)). |
| Morphology page; How the measurements are made ([P2](prd.md#22-mvp-and-delivery-priorities) Second delivery priority, after the MVP) | **Static site pages** with animation and figure slots, plus the family toggle of [PDD D-13](pdd.md#1-decision-register) (Scarp-family view availability and label) on the morphology page as a small page-local script ([PDD §3.7](pdd.md#37-population-scarp-filter-family-view-reset) Population, scarp filter, family view, reset; [PDD §8.1–8.3](pdd.md#81-morphology-page-fr-e1) Morphology page, animation library, and how the measurements are made) | Explanatory content; its one control (the family toggle) needs no app runtime. |
| Contact and requests ([P3](prd.md#22-mvp-and-delivery-priorities) Third delivery priority, after the MVP) | **Static site page** ([PDD §8.4](pdd.md#84-contact-and-requests-fr-e3-p3)) | A page of links and addresses. |
| Glossary, citation, data, paper pages | **Reuse**, with only the glossary additions of [PDD §5.11](pdd.md#511-labels-units-and-glossary-links-fr-g3-cr-3-cr-7) (Labels, units, and glossary links) before launch; the product deep-links to anchors | Already serve the need ([PRD §2.3](prd.md#23-reuse-first-principle)). |

The scenario page links to dashboards rather than embedding them: an
embedded dashboard inside the scenario page would present two
disconnected filter models side by side and double the page weight for
no decision the PDD supports.

### 4.3 Language, toolchain, and repository shape (ADR-0011)

A new Gradle subproject, `subprojects/webapp`, following the
multi-project pattern of
[ADR-0001](../adr/0001-gradle-multi-project-build.md) (Gradle
multi-project build, code modules under `subprojects/`):

- **TypeScript in strict mode**, compiled and bundled by **esbuild**.
  The statistics engine must agree with the pipeline to the reference
  tolerance at full precision and match it exactly at display precision
  ([PDD SC-3](pdd.md#101-success-criteria) Correctness; the closing note
  of [PDD §10.1](pdd.md#101-success-criteria) Success criteria requires
  a per-calculation tolerance, which the DDD sets); a typed language
  materially reduces the risk in exactly the code that parity-tests
  guard. esbuild is a single fast binary, wrapped in Gradle like the
  other toolchains, with Node and package versions pinned by lockfile.
- **No application framework.** The page is one view hierarchy with
  modest state ([PDD §3–§4](pdd.md#3-scenario-page-inputs) Scenario
  page: inputs and results); the budgets ([§7.1](#71-budget-arithmetic))
  and the WCAG target are easier to meet, and to audit, without a
  framework's runtime.
  [NFR-8](prd.md#nfr-8-architecture-decision-record) (Architecture
  decision record) asks for the new toolchain, and its relation to the
  existing architecture decisions, in an ADR;
  [ADR-0011](../adr/0011-webapp-toolchain.md) records it with the
  rejected alternatives (framework; plain untyped ES modules with no
  build step) and the reasons.
- **Charts are hand-rolled SVG.** The product draws exactly two chart
  kinds — histogram and empirical cumulative curve
  ([PDD §4.1](pdd.md#41-measurement-views-fr-o1) Measurement views) —
  plus overlay marks. A charting library would dominate the code
  payload, fight the canonical palette and never-color-alone rules
  ([FR-G2](prd.md#fr-g2-scarp-type-colors-and-identification) Scarp-type
  colors and identification), and complicate the table-first
  accessibility contract
  ([PDD §9.3](pdd.md#93-accessibility-target-d-17-proposed)
  Accessibility target). The bundle target is tens of kilobytes, charts
  included ([§7.1](#71-budget-arithmetic)).
- **Build output** (one JS bundle, one stylesheet) is built in CI, never
  committed: a webapp job in the deploy workflow, separate from the
  MkDocs job, runs the Gradle-wrapped esbuild build and hands the result
  to the MkDocs job, which places it in the site tree with
  content-hashed filenames ([§7.3](#73-delivery-and-caching)) before
  the strict build. Locally, the same Gradle task writes it there for
  `mkdocs serve`, into a gitignored path. The scenario page references
  the bundle, and the MkDocs build treats it as ordinary static assets.
  The site keeps its existing `extra_javascript` pattern
  (`subprojects/mkdocs/mkdocs.yml`) for site-wide scripts; the app
  bundle loads only on the scenario page. One inherited cost is scoped
  away: the site loads the third-party Tableau Embedding API on every
  page, but the scenario page carries no embeds, so it does not load
  that module (mechanics in the DDD).
- Path filters widen so that application and data changes run every
  check. The deploy workflow's filters (`.github/workflows/mkdocs.yml`:
  `subprojects/mkdocs/**` and the Poetry files) gain
  `subprojects/webapp/**`. `tests.yml`, which gains the webapp's test
  job ([§9](#9-testing-and-release-architecture)), keeps
  `subprojects/python/**` and adds `subprojects/webapp/**` and the
  committed data directory, so that a data refresh or a webapp-only
  change runs the checksum check and the parity harness.

---

## 5. Data architecture

Serves: [DR-1–DR-7](prd.md#6-data-requirements) Data requirements;
[FR-O5](prd.md#fr-o5-field-data-context) Field-data context;
[FR-O6](prd.md#fr-o6-kern-county-worked-example) Kern County worked
example; [FR-S5](prd.md#fr-s5-displacement-window) Displacement window;
[PDD §3.4](pdd.md#34-displacement-window-fr-s5) Displacement window;
[PDD §4.3](pdd.md#43-unclassified-records-d-12-proposed) Unclassified
records; [PDD §10.2](pdd.md#102-golden-scenarios) Golden scenarios.

### 5.1 Application data exports, not `dem.csv` (ADR-0012)

The pipeline gains product-facing DuckDB views (in `views.py`, beside
the existing dashboard views) and an export task that writes the
application data: five product artifacts, four of them for the MVP and
the media index from [P2](prd.md#22-mvp-and-delivery-priorities) (the
second delivery priority, after the MVP), when the pages and animation
offers that use it ship. The product never fetches `dem.csv`, the
existing 73 MB
Tableau-compatibility export:
[DR-1](prd.md#dr-1-controlled-data-source) (Controlled data source)
rules it out as the product's primary data source, and
[DR-6](prd.md#dr-6-payload-and-interaction-support) (Payload and
interaction support) rules out an initial page load that requires
downloading it or any comparably large payload. Names below are
indicative; the DDD fixes them.

| Artifact | Content | Scale |
|---|---|---|
| Scenario artifact (binary + manifest) | The full ensemble, product-shaped ([§5.2](#52-simulation-data-organization-adr-0013)) | ≈ 3.1–3.8 MB raw |
| Field export | One row per field measurement, normalized ([§5.5](#55-field-data-export-adr-0012)) | tens of KB |
| Regression export | Per-dip coefficients for converting an anticipated vertical surface offset into fault slip at depth ([§5.7](#57-conversion-coefficients-adr-0015)) | < 1 KB |
| Reference results | Numbers for the eight golden scenarios ([PDD GS-0–GS-7](pdd.md#102-golden-scenarios)) at full precision ([§5.6](#56-reference-results-and-verification-adr-0015)) | tens of KB |
| Media index (P2) | Animation/photo inventory with provenance ([§6.2](#62-media-architecture-adr-0012)) | < 10 KB |

### 5.2 Simulation data organization (ADR-0013)

The export exploits the ensemble's verified geometry: 3,434 trials ×
exactly 101 stages = 346,834 records, with every site condition
constant within a trial. The artifact is therefore **trial-major and
columnar**:

- **Trial table** (3,434 rows): fault dip, sediment arm and strength
  label (the nine arm×label states of
  [PDD §3.2](pdd.md#32-sediment-strength-and-structure-fr-s2) Sediment
  strength and structure), depth, density, and a **model-family
  dimension** reserved for the on-hold 3D arm
  ([DR-7](prd.md#dr-7-future-3d-compatibility) Future 3D compatibility)
  — about 6 bytes per trial, ≈ 21 KB.
- **Stage arrays** (346,834 entries, trial-major so each trial owns a
  contiguous 101-stage run): slip, scarp height, deformation-zone width,
  scarp dip, scarp class. Slip (0–5.0135 m, 1,797 distinct values),
  scarp height (−0.182–5.029 m), and width (0–45.811 m) fit 16-bit
  scaled integers losslessly at the export's recorded precision, with
  explicit null sentinels. Scarp dip (−12.529–89.765°, recorded at
  0.001°) does not — its native grid needs 102,295 steps, beyond 16 bits
  — so the dip column is float32, a 16-bit dictionary index over its
  35,854 distinct values, or a coarser scale justified by the display
  precision ([PDD D-23](pdd.md#1-decision-register) Reader-facing
  display precision per quantity); the DDD decides under
  [PDD SC-3](pdd.md#101-success-criteria) (Correctness) and the closing
  note of [PDD §10.1](pdd.md#101-success-criteria) (Success criteria).
  The bound is 9–11 bytes per record: ≈ 3.12–3.82 MB raw beside the ≈ 21
  KB trial table, and ≈ 0.84–1.07 MB on the wire (measured gzip of this
  exact layout). Even all-float32 stays inside the budgets.
- **JSON manifest**: data-export version and date
  ([DR-2](prd.md#dr-2-versioned-exports)); record and trial counts;
  per-column minima and maxima and the recording step (these drive the
  actual range and step shown by the window control of
  [PDD §3.4](pdd.md#34-displacement-window-fr-s5) Displacement window);
  the label dictionaries in canonical order
  ([FR-G2](prd.md#fr-g2-scarp-type-colors-and-identification) Scarp-type
  colors and identification); null sentinel definitions; checksums; and
  the paired reference-results version.

Nulls are stored as sentinels, never dropped: the two-count model
([PDD §3](pdd.md#3-scenario-page-inputs) Scenario page: inputs) and the
excluded-null statistics line ([FR-O2](prd.md#fr-o2-summary-statistics)
Summary statistics) need them. The small negative measurements (1,232
scarp heights, 30 scarp dips) are carried as-is; their treatment is the
pipeline's documented measurement-hygiene policy
([DR-4](prd.md#dr-4-measurement-hygiene)), which the DDD will cite
rather than re-decide. Exact field encodings, scales, endianness, and
layout are DDD material.

### 5.3 Records rather than precomputed summaries (ADR-0013)

[DR-1](prd.md#dr-1-controlled-data-source) (Controlled data source)
leaves open precomputed aggregations, compact row-level data, or a
combination, and [R-16](prd.md#94-delivery-and-technical-risks) (Risk:
combined scenario filtering requires enough detail to support arbitrary
filters, but the static site has a strict payload budget) asks that the
choice meet the payload budget without weakening the required filtering.
The architecture is row-level, with only scalar side-tables precomputed
(regression coefficients, manifest ranges):

- The input space cannot be pre-aggregated: multi-selects over 7 dips, 9
  strength states, 3 depths, 3 densities, 64 scarp-type subsets, two
  populations, and a continuous slip window
  ([PDD §3](pdd.md#3-scenario-page-inputs) Scenario page: inputs)
  explode combinatorially, and the percentiles of
  [FR-O2](prd.md#fr-o2-summary-statistics) (Summary statistics) are
  order statistics that do not compose from partial aggregates.
- The full row-level artifact already fits the payload budget raw
  ([§7.1](#71-budget-arithmetic);
  [DR-6](prd.md#dr-6-payload-and-interaction-support) Payload and
  interaction support), so precomputation would buy nothing the budgets
  need.
- One linear pass over typed arrays answers any scenario: per-trial
  condition mask (3,434 tests), then a stride-101 scan of the stage
  arrays for the window, population, class filter, and the per-panel
  valid/null split
  ([PDD §4.5](pdd.md#45-small-empty-and-partial-results-fr-o3-d-11-proposed)
  Small, empty, and partial results). Sorting the matched values for
  percentiles is the dominant cost and stays well inside the 200 ms
  interaction budget at full-ensemble size
  ([§7.1](#71-budget-arithmetic)).

### 5.4 Committed, versioned artifacts (ADR-0014)

Because CI cannot rebuild the pipeline
([DR-2](prd.md#dr-2-versioned-exports) Versioned exports;
[R-17](prd.md#94-delivery-and-technical-risks)), the five product
artifacts are **committed to the repository**, in a dedicated data
directory beside the scenario page in the site tree (exact path in the
DDD). Rules:

- Filenames carry a content hash; the page references them through the
  manifest pinned at build time. A data refresh **replaces** the
  artifacts in one commit — git history is the archive of past
  vintages; the deployed site carries exactly one.
- This is the site's existing cache-busting convention, strengthened:
  the site already busts `extra.css` with a `?v=` query (`mkdocs.yml`,
  incident of 2026-09-16) because stable-named assets go stale in
  browser caches; content-hashed names make the product's assets
  immutable-by-address
  ([NFR-7](prd.md#nfr-7-build-and-data-quality-gates) Build and
  data-quality gates), so they can be cached hard
  ([§7.3](#73-delivery-and-caching)).
- The refresh flow extends the existing Gradle lane (`egrBuild`, the
  `csvExport*` tasks): one task exports, hashes, and writes the
  manifest and reference results together, so the artifact and its
  pins can never diverge; the owner commits the result as usual.
- The committed scenario file is the pre-compressed artifact the page
  actually fetches ([§7.3](#73-delivery-and-caching)), so repository
  growth is bounded at ≈ 1 MB per data refresh (the four text exports
  add tens of KB);
  [ADR-0014](../adr/0014-committed-content-hashed-artifacts.md) proposes
  committing no raw copy beside it. Refreshes are rare, deliberate
  events (a new export version is a product release,
  [PDD §9.4](pdd.md#94-releases)).
- **Licensing and distribution.** The four data exports are derived
  data under their source datasets' terms (the README's Licensing
  section; [NFR-6](prd.md#nfr-6-licensing) Licensing limits Apache-2.0
  to application code). The P2 media index is the project's own
  metadata, not derived data; its terms are set when it ships. The
  data directory is marked `export-ignore` in `.gitattributes`, as the
  paper figures already are, so a GitHub release's source archive, and
  the Zenodo software record built from it, never carries the data;
  running the parity tests or the page from such an archive needs the
  release's data asset. When the owner tags a GitHub release, the
  release carries the exports as that separate data asset, under their
  terms — the distribution route the author review set for the
  pipeline's data on 2026-08-20, which also ships the dashboards'
  plotting CSVs with each release (`notes/Roadmap.md`, Decisions
  made). Open ([§10](#10-risks-and-open-dependencies)): confirming
  each source's terms, and the deposit step that gets the released
  data into Zenodo itself — the Zenodo GitHub integration archives
  only the source archive, which omits the data, so the Zenodo dataset
  record that `notes/Roadmap.md` prefers for hosting the processed
  tables needs a deposit of its own. The README and `LICENSE-docs`,
  which say today that the input datasets are not redistributed here,
  must then distinguish the raw inputs (still not redistributed) from
  the derived exports.

### 5.5 Field-data export (ADR-0012)

One normalized per-measurement table for the overlays and the Kern
worked example ([FR-O5](prd.md#fr-o5-field-data-context) Field-data
context; [FR-O6](prd.md#fr-o6-kern-county-worked-example)), prepared in
the pipeline (by the name normalization of
[DR-5](prd.md#dr-5-field-data-preparation) Field-data preparation, from
views already in the dashboard lane: `fdhi_cleaned`, `kern_combined`,
`sure_enriched`, `historic_events`). Each
row carries: source compilation, event, the measurement with its
source-specific analogue kind (as mapped in
[PDD §4.4](pdd.md#44-field-overlay-fr-o5-d-18-proposed) Field overlay —
FDHI vertical separation / fault-zone width; Kern vertical scarp-height
values / deformation-zone width; SURE scarp height / fault-normal
component), units, the sub-50-metre criterion flag, the
labeled-event-set membership, and provenance identifiers. The Kern data
group and principal-width rule stay Open with the research group
([PDD D-6](pdd.md#1-decision-register)); the export carries the slot
either way.

### 5.6 Reference results and verification (ADR-0015)

The pipeline is the authority for every number the reader sees
([DR-1](prd.md#dr-1-controlled-data-source) Controlled data source), and
two things are verified separately, so that a failure points to its
cause. First, the exported data: the export task decodes the scenario
artifact it has just written and compares every record and value with
the pipeline view it came from before writing the manifest, whose
checksums then let CI confirm that the committed files are the ones it
verified. Second, the calculations: the pipeline computes the golden
scenarios [PDD GS-0–GS-7](pdd.md#102-golden-scenarios) — counts,
per-measurement valid and excluded-null counts, and the full statistic
set of [FR-O2](prd.md#fr-o2-summary-statistics) (Summary statistics) —
at full precision, and writes them as a versioned reference artifact
paired to the scenario artifact. Three test layers consume it
([§9](#9-testing-and-release-architecture)): pipeline tests pin the
views; webapp parity tests replay every golden scenario through the
client engine, compare full-precision values within the per-calculation
tolerance that the closing note of
[PDD §10.1](pdd.md#101-success-criteria) (Success criteria) requires and
the DDD sets, and require values rounded to the display precision of
[PDD D-23](pdd.md#1-decision-register) (Reader-facing display precision
per quantity) to equal the rounded references exactly
([PDD SC-3](pdd.md#101-success-criteria) Correctness); and the
acceptance walkthroughs read the same numbers. The one-state view of
[DR-3](prd.md#dr-3-one-state-per-trial-population) (One-state-per-trial
population) is implemented and tested in the pipeline first (3,434
trials, no max-slip ties — both verified against the current export), so
the client's selection rule has a pipeline twin to agree with.

### 5.7 Conversion coefficients (ADR-0015)

The offset-to-slip assist uses per-dip regression slopes exported by the
pipeline ([FR-S5](prd.md#fr-s5-displacement-window) Displacement window;
[PDD §3.5–3.6](pdd.md#35-offset-entry-mode-and-conversion-assist-fr-s5)
Offset-entry mode and conversion assist, and multi-dip conversion rule;
[PDD D-3](pdd.md#1-decision-register) Multi-dip behavior of the
offset-to-slip assist) — the relationship the dashboards already publish
and `test_regression_views.py` already pins (0.5021 at 30°, 0.6453 at
40°). The app never hardcodes a coefficient; the export carries slope,
dip, and the regression's provenance so the copy in
[PDD §5.6](pdd.md#56-conversion-assist-fr-s5-d-3) (Conversion assist)
can cite it. The same holds for every other displayed constant: the
scarp-type colors and their canonical order
([FR-G2](prd.md#fr-g2-scarp-type-colors-and-identification) Scarp-type
colors and identification) and the controls' ranges and steps reach the
app through the manifest
([§5.2](#52-simulation-data-organization-adr-0013),
[§6](#6-application-architecture)), never as hand-copied values.

---

## 6. Application architecture

Serves: [FR-S1–S8](prd.md#51-scenario-inputs-c1-p1) Scenario inputs;
[FR-O1–O6](prd.md#52-results-and-field-data-context-c2-c3-p1) Results
and field-data context;
[FR-D1–D4](prd.md#53-downloads-and-citation-c4-c5-p1) Downloads and
citation; [FR-X1–X2](prd.md#54-sharing-and-inverse-search-c6-c7-p2)
Sharing and inverse search;
[FR-G1–G5](prd.md#56-shared-display-rules-c10-and-cross-capability-rules)
Shared display rules; [PDD §3–§7](pdd.md#3-scenario-page-inputs)
Scenario page inputs and results, copy deck, downloads, and sharing.

Six components, each a short contract here and a chapter in the DDD:

- **State and URL codec
  ([ADR-0010](../adr/0010-native-client-side-scenario-app.md)).** One
  scenario-state object is the single source of truth; controls write
  it, everything else reads it. The URL codec arrives with shareable
  links in [P2](prd.md#22-mvp-and-delivery-priorities) (the second
  delivery priority, after the MVP). It serializes exactly the restore
  list of
  [PDD §7.1](pdd.md#71-shared-links) (Shared links) — every scenario
  setting, the selected measurement and view, and the field-overlay
  state — to URL query parameters (versionless when links first ship,
  under [PDD D-15](pdd.md#1-decision-register) Shared-link version
  notice) and restores it on load; results are always recomputed with
  the currently published software and data, never stored in the URL
  ([FR-X1](prd.md#fr-x1-shareable-scenario-links) Shareable scenario
  links).
- **Query engine.** Pure functions from (artifact, scenario state) to
  results: condition mask → window and population selection (the
  state-from-window-alone rule and no-window = final states, as set by
  [PDD §3.7](pdd.md#37-population-scarp-filter-family-view-reset)
  Population, scarp filter, family view, reset;
  [DR-3](prd.md#dr-3-one-state-per-trial-population) One-state-per-trial
  population) → the scarp-type filter, applied to the selected states
  ([FR-S7](prd.md#fr-s7-scarp-type-filter) Scarp-type filter) →
  per-panel valid/null split →
  [FR-O2](prd.md#fr-o2-summary-statistics) statistics → the
  matching-record and valid-measurement counts of the two-count model
  ([PDD §3](pdd.md#3-scenario-page-inputs) Scenario page: inputs). Pure
  and synchronous, so the parity harness
  ([§5.6](#56-reference-results-and-verification-adr-0015)) can drive it
  headlessly.
- **View layer.** Input rail, scenario summary, measurement panels (SVG
  histogram + cumulative curve + the always-rendered statistics table as
  a real HTML table — the accessibility backbone of
  [PDD §9.3](pdd.md#93-accessibility-target-d-17-proposed) Accessibility
  target), and the notice state machine of
  [PDD §4.5](pdd.md#45-small-empty-and-partial-results-fr-o3-d-11-proposed)
  (Small, empty, and partial results), with its no-match diagnostic,
  no-valid-measurement notice, warning and suppression tiers, and their
  precedence. Colors and order come from the canonical palette
  ([FR-G2](prd.md#fr-g2-scarp-type-colors-and-identification) Scarp-type
  colors and identification; the pipeline's `config.py`
  `SCARP_CLASS_PALETTE` is the recorded source, re-emitted through the
  manifest dictionaries so the app has no hand-copied hex values).
- **Downloads.** Client-side generation (Blob/File APIs) of the
  matching-records CSV, the statistics table, and the provenance text of
  [PDD §6.1](pdd.md#61-download-package-fr-d1) (Download package),
  including the matching-record count, per-measurement valid counts,
  versions, and active caveats; chart export
  (P2) pairs a rendered caption strip with the same provenance text
  ([PDD §6.3](pdd.md#63-chart-export-fr-d2-p2-d-14-proposed)).
- **Field overlay.** Renders the field export
  ([§5.5](#55-field-data-export-adr-0012)) as per-source black mark
  series with the analogue labels and criterion toggle of
  [PDD §4.4](pdd.md#44-field-overlay-fr-o5-d-18-proposed); the Kern
  preset
  ([PDD §4.7](pdd.md#47-kern-county-worked-example-fr-o6-d-6-open) Kern
  County worked example) is a stored scenario state plus walkthrough
  copy, inert until [PDD D-6](pdd.md#1-decision-register) (Kern County
  field-data group and principal-width rule) resolves.
- **Education surfaces.** Static pages (morphology and measurements in
  P2; contact in [P3](prd.md#22-mvp-and-delivery-priorities), the third
  delivery priority) built from the content of
  [PDD §8](pdd.md#8-education-and-media-surfaces) (Education and media
  surfaces) with media slots from the media index
  ([§6.2](#62-media-architecture-adr-0012)); the morphology page
  carries, as a page-local script, the family toggle of
  [PDD D-13](pdd.md#1-decision-register) (Scarp-family view availability
  and label), specified in
  [PDD §3.7](pdd.md#37-population-scarp-filter-family-view-reset) and
  [PDD §8.1](pdd.md#81-morphology-page-fr-e1); the scenario page links
  into them and into the glossary anchors
  ([PDD §5.11](pdd.md#511-labels-units-and-glossary-links-fr-g3-cr-3-cr-7)
  Labels, units, and glossary links).

### 6.1 Failure honesty (ADR-0010)

Three explicit failure modes, all required by the resilience clauses of
[NFR-5](prd.md#nfr-5-accessibility) (Accessibility):

- **No JavaScript:** the scenario page's Markdown body carries real
  fallback content — that the interactive page requires JavaScript,
  what the tool is, links to the paper, archive, dashboards, glossary,
  and limitations — shown whenever the app does not mount; never a
  blank or misleading page.
- **Artifact load failure:** the app states plainly that the data
  could not be loaded and links to the fallback content; it never
  renders empty results as if they were valid.
- **Version mismatch:** the page refuses to compute when the fetched
  manifest's version differs from the one pinned at build time, and says
  so; the content-hashed addressing
  ([§5.4](#54-committed-versioned-artifacts-adr-0014)) makes this state
  practically unreachable, which is the point.

### 6.2 Media architecture (ADR-0012)

Animations and photographs are ordinary site assets with one committed
**media index**, which arrives in
[P2](prd.md#22-mvp-and-delivery-priorities) (the second delivery
priority, after the MVP) with the pages and animation offers that use
it: per item, the scarp type it
illustrates, source attribution, permission status, and caption; the
research group supplies the items
([PDD D-8](pdd.md#1-decision-register) Animation coverage required for
public release). The morphology page
([FR-E1](prd.md#fr-e1-morphology-education) Morphology education) and
the
[PDD §6.4](pdd.md#64-animation-offer-and-dominance-fr-d4-p2-d-7-proposed)
animation offers render only from the index. The "Animation not yet
available" state ([PDD §8.2](pdd.md#82-animation-library-d-8-open)
Animation library; [R-13](prd.md#93-content-and-media-dependencies)
Dependency: the supplied animations do not necessarily cover all six
scarp types; [R-14](prd.md#93-content-and-media-dependencies)
Dependency: animated media explaining the measurement process may not be
available) and the photo release gate ([NFR-6](prd.md#nfr-6-licensing)
Licensing; [R-12](prd.md#93-content-and-media-dependencies) Dependency:
public permission for third-party earthquake photographs is unresolved)
are therefore data conditions, not code branches. Under the photo gate,
third-party photos may sit in the working tree during development but
are excluded from release until permissions are documented.

---

## 7. Meeting the quality bars

Serves: [PDD §9](pdd.md#9-product-quality-bars) Product quality bars;
[PDD D-9](pdd.md#1-decision-register) Numeric performance and payload
budgets; [PDD D-16](pdd.md#1-decision-register) Browser and mobile
baseline; [PDD D-17](pdd.md#1-decision-register) Accessibility
conformance target; [NFR-3](prd.md#nfr-3-responsive-interaction)
Responsive interaction; [NFR-4](prd.md#nfr-4-supported-environments)
Supported environments; [NFR-5](prd.md#nfr-5-accessibility)
Accessibility; [DR-6](prd.md#dr-6-payload-and-interaction-support)
Payload and interaction support.

### 7.1 Budget arithmetic

| Budget ([PDD §9.1](pdd.md#91-performance-budgets-d-9-proposed)) | Mechanism | Expected |
|---|---|---|
| Payload ≤ 4 MB compressed | Scenario artifact ≈ 3.1–3.8 MB raw ([§5.2](#52-simulation-data-organization-adr-0013)); measured ≈ 0.84–1.07 MB on the wire, pre-compressed ([§7.3](#73-delivery-and-caching)); page shell ≈ 0.15 MB; app bundle tens of KB; field + reference + regression exports tens of KB | ≈ 1.0–1.25 MB — inside the budget with 3× margin |
| Cold render ≤ 2.0 s at 10 Mbps | Measured wire: artifact ≈ 0.84–1.07 MB plus page shell ≈ 0.15 MB at 1.25 MB/s → ≈ 0.8–1.0 s transfer; inflate ≈ 10 ms; typed-array views need no parse step; first panel renders in tens of ms | ≈ 1.0–1.2 s including connection setup — met with ≥ 0.8 s margin; the [§10](#10-risks-and-open-dependencies) spike confirms on real hosting |
| Warm render ≤ 1.0 s | Content-hashed immutable assets cached hard ([§7.3](#73-delivery-and-caching)): repeat visits fetch nothing but the page shell | well under 1.0 s |
| Interaction ≤ 200 ms p95 | Mask 3,434 trials + stride scan 346,834 stages (single-digit ms in evergreen engines); dominant cost is sorting matched values for percentiles, bounded by the full ensemble (~330k values) at tens of ms | met with margin; pre-sorted per-measurement indices remain a DDD option if measurement says otherwise |

### 7.2 Accessibility and environments

The WCAG 2.2 AA target
([PDD §9.3](pdd.md#93-accessibility-target-d-17-proposed)) shapes the
architecture rather than decorating it: statistics tables are real
tables and always rendered with matching records; charts are SVG with
text alternatives pointing at those tables; every control is a native
form element or an ARIA pattern with visible focus; notices are live
regions. The 24-month evergreen baseline and the 360 px floor
([PDD §9.2](pdd.md#92-browser-and-mobile-baseline-d-16-proposed)) admit
every platform API this design uses (ES2020+, typed arrays, URL and Blob
APIs, SVG); anything newer must clear the same bar in the DDD.

### 7.3 Delivery and caching

Product assets (bundle, stylesheet, data artifacts) carry content hashes
in their filenames and are referenced only through the build — the
immutable strengthening of the site's `?v=` convention
([§5.4](#54-committed-versioned-artifacts-adr-0014);
[NFR-7](prd.md#nfr-7-build-and-data-quality-gates) Build and
data-quality gates). Because a changed file gets a new name, browsers
can keep these assets cached, so repeat visits fetch only the page shell
and avoid a prolonged loading phase
([DR-6](prd.md#dr-6-payload-and-interaction-support) Payload and
interaction support; [§7.1](#71-budget-arithmetic)). The scenario
artifact ships **pre-compressed** and is inflated in the browser with
the built-in DecompressionStream API (inside the
[PDD §9.2](pdd.md#92-browser-and-mobile-baseline-d-16-proposed)
evergreen baseline): GitHub Pages does not promise transfer compression
for binary media types, so pre-compression makes the measured ≈
0.84–1.07 MB wire size a property of the artifact rather than of the
host. Even served raw (≈ 3.1–3.8 MB) the artifact would stay inside the
4 MB payload budget, but the committed, fetched file is the compressed
one ([§5.4](#54-committed-versioned-artifacts-adr-0014)). The scenario
page itself stays a normal MkDocs page so Material's own asset
fingerprinting, navigation, and search keep working. The existing
dashboards, navigation, citation pages, and deploy process remain
functional ([NFR-7](prd.md#nfr-7-build-and-data-quality-gates);
[PDD SC-6](pdd.md#101-success-criteria) Site integrity): navigation
gains only the product's entries ([§8](#8-site-integration)); the
deploy workflow changes only by the webapp build job and the wider path
filters of [§4.3](#43-language-toolchain-and-repository-shape-adr-0011);
and the glossary gains only the additions of
[PDD §5.11](pdd.md#511-labels-units-and-glossary-links-fr-g3-cr-3-cr-7)
(Labels, units, and glossary links).

---

## 8. Site integration

Serves: [PDD §2](pdd.md#2-product-structure-and-navigation) Product
structure and navigation ([PDD D-2](pdd.md#1-decision-register) Site
entry point); [NFR-2](prd.md#nfr-2-static-site-hosting) Static-site
hosting;
[FR-G4](prd.md#fr-g4-citation-disclaimer-and-version-information)
Citation, disclaimer, and version information;
[DR-2](prd.md#dr-2-versioned-exports) Versioned exports.

- **Navigation:** a top-level "Scenario explorer" entry after Dashboards
  in `subprojects/mkdocs/mkdocs.yml`
  ([PDD §2.2](pdd.md#22-entry-point-d-2-proposed) Entry point;
  [PDD D-2](pdd.md#1-decision-register), status Proposed); morphology
  and measurement pages join the explanatory section; Contact joins
  last.
- **Page and assets:** the scenario page is one Markdown page in
  `subprojects/mkdocs/docs/` carrying the no-JS fallback body and the
  app mount point; a dedicated assets directory beside it holds the
  committed, export-ignored data directory
  ([§5.4](#54-committed-versioned-artifacts-adr-0014)) and the bundle,
  which CI builds and local builds write to a gitignored path
  ([§4.3](#43-language-toolchain-and-repository-shape-adr-0011)); final
  naming is in the DDD.
- **Versions on display
  ([FR-G4](prd.md#fr-g4-citation-disclaimer-and-version-information);
  [DR-2](prd.md#dr-2-versioned-exports);
  [PDD §7.2](pdd.md#72-version-display-and-notice-d-15-proposed) Version
  display and notice):** the product footer and every download show the
  software version (the product release version, stamped into the bundle
  at build time) and the data-export version (read from the manifest).
  The version-source mechanics — tag, constant, or build metadata — are
  DDD detail; the HLDD fixes only that both values exist, are distinct,
  and are stamped at build time, not fetched.
- **Build gates:** the scenario page participates in the strict build
  like any page (broken internal links fail the build); the deploy
  workflow's path filters widen to `subprojects/webapp/**` so webapp
  changes build and validate the site exactly as mkdocs changes do
  today, and `tests.yml`'s widen to the webapp and the committed data
  ([§4.3](#43-language-toolchain-and-repository-shape-adr-0011),
  [§9](#9-testing-and-release-architecture)).

---

## 9. Testing and release architecture

Serves: [NFR-7](prd.md#nfr-7-build-and-data-quality-gates) Build and
data-quality gates; [DR-1](prd.md#dr-1-controlled-data-source)
Controlled data source;
[DR-3](prd.md#dr-3-one-state-per-trial-population) One-state-per-trial
population; [PDD SC-3](pdd.md#101-success-criteria) Correctness;
[PDD SC-6](pdd.md#101-success-criteria) Site integrity;
[R-17](prd.md#94-delivery-and-technical-risks) Risk: continuous
integration cannot rebuild the full pipeline because raw inputs are
local-only; [R-18](prd.md#94-delivery-and-technical-risks) Risk: the
scenario page shares a single GitHub Pages site, URL space, build, and
deploy job with the existing website;
[PDD §10](pdd.md#10-acceptance-and-success) Acceptance and success.

Four layers, three of them CI-enforced:

1. **Pipeline tests** (`subprojects/python/tests`, pytest): contracts
   for the new product views — geometry (3,434 × 101), the one-state
   view with no max-slip ties
   ([DR-3](prd.md#dr-3-one-state-per-trial-population)), null policies
   ([DR-4](prd.md#dr-4-measurement-hygiene) Measurement hygiene), field
   normalization ([DR-5](prd.md#dr-5-field-data-preparation) Field-data
   preparation), the export round trip (decoding a written artifact
   reproduces the view's records and values), and the golden-scenario
   reference generator. The contracts that run on fixtures, like the
   existing suite's, run on a fresh clone and in CI. The checks that
   need the real ensemble (the geometry, the tie check, the round trip
   on the real export) skip in CI, as today's data-dependent tests do,
   and run locally in the export task at every refresh.
2. **Webapp tests** (new job in `tests.yml`, whose path filters widen
   with it,
   [§4.3](#43-language-toolchain-and-repository-shape-adr-0011)): unit
   tests for the engine (and, from P2, the URL codec), a check that the
   committed artifacts match the manifest's
   checksums and declared counts, plus the **parity harness** — every
   golden scenario ([PDD GS-0–GS-7](pdd.md#102-golden-scenarios))
   replayed through the client engine against the committed reference
   results: full-precision values within the per-calculation tolerance
   required by the closing note of
   [PDD §10.1](pdd.md#101-success-criteria) (Success criteria), and
   values rounded to display precision equal to the rounded references
   exactly ([PDD SC-3](pdd.md#101-success-criteria)). Runs headlessly in
   Node against the committed artifacts; no browser farm in the MVP.
3. **Site validation**: the strict MkDocs build on every PR touching
   `subprojects/mkdocs/**` or `subprojects/webapp/**`; deploy from
   `main` only, unchanged
   ([ADR-0009](../adr/0009-github-pages-hosting.md) GitHub Pages (via
   Actions) as site hosting).
4. **Acceptance walkthroughs**
   ([PDD §10.3](pdd.md#103-acceptance-walkthroughs)): scripted demos of
   [US-1–US-3](prd.md#4-user-stories) (User stories: Dam foundation
   scenario, Pipeline crossing, Design review) against the golden
   scenarios before release, plus the candor and scientific sign-off
   checks of [PDD SC-5](pdd.md#101-success-criteria) and
   [PDD SC-7](pdd.md#101-success-criteria) — human-run by design.

**Release flow** (unchanged in authority — the owner commits): refresh
exports locally through the Gradle lane, which also runs the
data-dependent checks → the export task writes artifacts, manifest, and
references together
([§5.4](#54-committed-versioned-artifacts-adr-0014),
[§5.6](#56-reference-results-and-verification-adr-0015)) → commit → PR
(validation builds, the application bundle included) → merge to `main`
→ CI builds the application bundle, then the site → Pages deploy. When
the owner tags a GitHub release, the release carries the current
exports as its data asset, beside the dashboards' plotting CSVs the
2026-08-20 author review ships with each release
([§5.4](#54-committed-versioned-artifacts-adr-0014);
`notes/Roadmap.md`, Decisions made); whether attaching them is manual
or a release workflow is DDD detail. A data refresh and
a software release both bump a displayed version
([PDD §9.4](pdd.md#94-releases) Releases); rollback is a git revert,
which the committed-artifact model makes complete by construction.
Sequencing and effort belong to the implementation plan, not here.

---

## 10. Risks and open dependencies

Architecture-level entries only; the register of
[PRD §9](prd.md#9-dependencies-and-risks) (Dependencies and risks)
remains the master list.

| Risk / dependency | Position here | Mitigation / owner |
|---|---|---|
| [R-16](prd.md#94-delivery-and-technical-risks) combined filtering vs. payload budget | Settled by design: the row-level artifact keeps every filter combination available at a measured ≈ 0.84–1.07 MB on the wire, inside the 4 MB budget ([§5.2–§5.3](#52-simulation-data-organization-adr-0013), [§7.1](#71-budget-arithmetic)) | Early payload-and-timing spike on real hosting validates [§7.1](#71-budget-arithmetic)'s two flagged estimates (measured wire size and inflate cost of the pre-compressed artifact; full-ensemble percentile sort) — architect |
| [R-17](prd.md#94-delivery-and-technical-risks) CI cannot rebuild the pipeline | Absorbed: committed artifacts; fixture-driven tests in CI; the data-dependent checks run locally in the export task ([§5.4](#54-committed-versioned-artifacts-adr-0014), [§9](#9-testing-and-release-architecture)) | Keep reference generation inside the export task — architect |
| [R-18](prd.md#94-delivery-and-technical-risks) single-site blast radius ([PDD SC-6](pdd.md#101-success-criteria) Site integrity) | Contained: additive pages, no changes to existing assets, strict build + PR validation. One new coupling: every site deploy now needs a successful bundle build ([§4.3](#43-language-toolchain-and-repository-shape-adr-0011)), which PR validation exercises first | [§8](#8-site-integration), [§9](#9-testing-and-release-architecture) — owner's release lane |
| [R-19](prd.md#94-delivery-and-technical-risks) static-site feasibility | Settled by design: all scenario-time computation runs client-side, with no backend ([§4.1](#41-native-client-side-application-adr-0010)); the budgets are expected to hold with margin ([§7.1](#71-budget-arithmetic)) | The same spike as for [R-16](prd.md#94-delivery-and-technical-risks) — architect |
| New toolchain (Node/esbuild) maintenance | Accepted, pinned, Gradle-wrapped, and run in CI, which builds the bundle ([§4.3](#43-language-toolchain-and-repository-shape-adr-0011)) | Recorded in [ADR-0011](../adr/0011-webapp-toolchain.md) per [NFR-8](prd.md#nfr-8-architecture-decision-record) (Architecture decision record) — owner |
| Repository growth from committed data | Bounded ≈ 1 MB per refresh, replace-not-accumulate ([§5.4](#54-committed-versioned-artifacts-adr-0014)) | Revisit only if refresh cadence changes — owner |
| Terms and distribution of the derived data ([NFR-6](prd.md#nfr-6-licensing) Licensing) | Open: the committed exports redistribute data derived from the input datasets, which the README and `LICENSE-docs` say today are not redistributed here; the design keeps that data out of the Apache-2.0 source archive and attaches it to each GitHub release as a separate asset ([§5.4](#54-committed-versioned-artifacts-adr-0014)) | Confirm each source's terms: the DesignSafe simulation deposits, the FDHI flatfile, and SURE 2.0; for the Kern County compilation, redistribution is already cleared ([`docs/datasets.md`](../datasets.md)) and only the licence wording is open. Distribution is decided — the 2026-08-20 author review ships the pipeline's data with each GitHub release (`notes/Roadmap.md`, Decisions made) — but the Zenodo GitHub integration archives only the source archive, so decide the deposit step that gets the data into Zenodo (the dataset record the Roadmap prefers), with the first release. Then word the data asset's licence, the README (which also calls the unpublished Kern compilation published), `LICENSE-docs`, the site footer, and `.zenodo.json` before the exports are first pushed, since the repository is public — owner, with the research group |
| [PDD D-6](pdd.md#1-decision-register) Kern group; [PDD D-8](pdd.md#1-decision-register) animation coverage; [PDD D-10](pdd.md#1-decision-register) liability text; [R-1/R-2/R-3](prd.md#91-scientific-and-data-dependencies) scientific inputs; [R-12](prd.md#93-content-and-media-dependencies) photo permissions; [R-15](prd.md#93-content-and-media-dependencies) repo URLs | Carried as data/content slots; none blocks the architecture | [PDD register](pdd.md#1-decision-register) owners (research group / owner) |
| 3D arm ([DR-7](prd.md#dr-7-future-3d-compatibility) Future 3D compatibility) | Model-family dimension reserved in the trial table ([§5.2](#52-simulation-data-organization-adr-0013)); at 3D scale one artifact per model family (the manifest pins multiple files; the default page fetches the 2D family alone) | Recorded in [ADR-0013](../adr/0013-row-level-scenario-artifact.md) and [ADR-0014](../adr/0014-committed-content-hashed-artifacts.md); nothing needed now |

---

## 11. Decision records

The six architecture decisions of [chapter 1](#1-architecture-decisions)
are drafted as repository ADRs — the project's standing decision record
(`docs/adr`, whose accepted records are
[ADR-0001–0009](../adr/README.md)) — with status **Proposed**, alongside
this document:

- **[ADR-0010](../adr/0010-native-client-side-scenario-app.md)** — the
  native client-side application and the surface map of
  [FR-G5](prd.md#fr-g5-reuse-of-existing-full-dataset-dashboards-c8)
  (Reuse of existing full-dataset dashboards), with URL-borne
  shared-link state and failure honesty;
- **[ADR-0011](../adr/0011-webapp-toolchain.md)** — the webapp
  toolchain: TypeScript, esbuild, no framework, hand-rolled SVG charts,
  `subprojects/webapp`;
- **[ADR-0012](../adr/0012-product-data-exports.md)** — the five
  purpose-built product exports;
- **[ADR-0013](../adr/0013-row-level-scenario-artifact.md)** — the
  row-level, trial-major columnar scenario artifact and client-side
  computation;
- **[ADR-0014](../adr/0014-committed-content-hashed-artifacts.md)** —
  committed, content-hashed, pre-compressed delivery;
- **[ADR-0015](../adr/0015-golden-scenario-parity.md)** —
  golden-scenario references and the pipeline↔client parity harness.

[NFR-8](prd.md#nfr-8-architecture-decision-record)'s requirement that
the platform decision land in an ADR is met by
[ADR-0010](../adr/0010-native-client-side-scenario-app.md) and
[ADR-0011](../adr/0011-webapp-toolchain.md). Accepting the ADRs is part
of this document's review; after acceptance, a changed decision gets a
new, superseding ADR rather than an edit
([`docs/adr/README.md`](../adr/README.md)).

Separately, [ADR-0007](../adr/0007-dashboard-design-conventions.md)
(Dashboard design conventions) still carries its stale "Kern County is
red" clause (its decision 1 contradicts the later
[visual-identity convention](../dashboards/visual-identity.md) and the
built dashboards); the short superseding errata it needs is repo
housekeeping, independent of this design.

---

## 12. Explicitly not in this document

Owned by the **DDD** (next step): the artifact's exact binary layout,
scales, and sentinels; the manifest and export schemas field by field;
algorithm specifications (statistics, population selection, URL codec,
binning); the webapp's module and file structure; the assets directory
naming; version-stamp mechanics; the test-case inventory and tolerances
per calculation; accessibility implementation specifics; error copy
wiring into [PDD §5](pdd.md#5-copy-deck) (Copy deck).

Owned by the **implementation plan** (with the DDD): sequencing,
milestones, effort, and the release calendar.

Owned by the **PRD and PDD**: every requirement and every product
behavior — this document chooses how they are built, and adds no
obligations of its own. Owned by the **research group**: every Open row
it holds in the [PDD register](pdd.md#1-decision-register).
