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
  * [4.3 Language, toolchain, and repository structure (ADR-0011)](#43-language-toolchain-and-repository-structure-adr-0011)
- [5. Data architecture](#5-data-architecture)
  * [5.1 Application data exports (ADR-0012)](#51-application-data-exports-adr-0012)
  * [5.2 Simulation data organization (ADR-0013)](#52-simulation-data-organization-adr-0013)
  * [5.3 Records rather than precomputed summaries (ADR-0013)](#53-records-rather-than-precomputed-summaries-adr-0013)
  * [5.4 Pinned, versioned artifacts (ADR-0014)](#54-pinned-versioned-artifacts-adr-0014)
  * [5.5 Field-data export (ADR-0012)](#55-field-data-export-adr-0012)
  * [5.6 Reference results and verification (ADR-0015)](#56-reference-results-and-verification-adr-0015)
  * [5.7 Conversion coefficients (ADR-0015)](#57-conversion-coefficients-adr-0015)
- [6. Application architecture](#6-application-architecture)
  * [6.1 Failure honesty (ADR-0010)](#61-failure-honesty-adr-0010)
  * [6.2 Media architecture (ADR-0012)](#62-media-architecture-adr-0012)
- [7. Meeting the quality requirements](#7-meeting-the-quality-requirements)
  * [7.1 Performance estimates and verification](#71-performance-estimates-and-verification)
  * [7.2 Accessibility and supported environments](#72-accessibility-and-supported-environments)
  * [7.3 Delivery and caching](#73-delivery-and-caching)
- [8. Site integration](#8-site-integration)
- [9. Testing and release architecture](#9-testing-and-release-architecture)
- [10. Risks and open dependencies](#10-risks-and-open-dependencies)
- [11. Decision records](#11-decision-records)
- [12. Scope of the following documents](#12-scope-of-the-following-documents)

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
making unresolved product, scientific, architectural, or design
decisions.

[Chapter 12](#12-scope-of-the-following-documents) lists the boundary
in full.

Architectural decisions are recorded in the [architecture decision
record (ADR) directory](../adr). This HLDD explains how those decisions
fit together into a coherent design; it does not replace the ADRs as
the authoritative decision records.

The six architecture decisions supporting this draft are recorded in
[ADR-0010–ADR-0015](../adr/README.md); each entered review as
**Proposed** and is now **Accepted** (2026-10-28), incorporating the
amendments agreed during review. [Chapter 1](#1-architecture-decisions)
provides their index; the [ADR index](../adr/README.md) tracks each
acceptance.

The DDD and IP take accepted architectural decisions as constraints
rather than reopening them. If detailed design or implementation reveals
a need to change an architectural decision, the change must follow the
project's [ADR process](../adr/README.md) before dependent work
proceeds.

---

## 1. Architecture decisions

This design is based on six accepted architecture decisions,
recorded in [ADR-0010–ADR-0015](../adr/README.md). The table below
summarizes what each decision covers and points to the corresponding
explanation in this document.

The ADRs are the authoritative decision records. Each enters review
with status **Proposed** and is marked **Accepted** as the owner
approves it, incorporating any amendments agreed during review.

| ADR | Decision | Explanation in this document |
|---|---|---|
| [ADR-0010](../adr/0010-native-client-side-scenario-app.md) | **Application platform and site integration.** Build the scenario page as a client-side application within the existing MkDocs site. Filtering and calculations run in the browser, without a backend or browser-based Python runtime. Reuse existing dashboards through links and use static pages for educational and contact content. | [§4.1 Native client-side application](#41-native-client-side-application-adr-0010), [§4.2 Surface map](#42-surface-map-adr-0010), [§6 Application architecture](#6-application-architecture), [§6.1 Failure honesty](#61-failure-honesty-adr-0010) |
| [ADR-0011](../adr/0011-webapp-toolchain.md) | **Language and build tools.** Use TypeScript and esbuild, without an application framework. Draw charts using SVG. Add a Gradle subproject to build and test the application. CI builds the application bundle; it is never committed. | [§4.3 Language, toolchain, and repository structure](#43-language-toolchain-and-repository-structure-adr-0011), [§9 Testing and release architecture](#9-testing-and-release-architecture) |
| [ADR-0012](../adr/0012-product-data-exports.md) | **Data supplied by the pipeline.** Export simulation records, field measurements, conversion coefficients, reference results for testing, and a media index for the later education pages and animation offers. The application does not load the existing Tableau-oriented `dem.csv` file. | [§5.1 Application data exports](#51-application-data-exports-adr-0012), [§5.5 Field-data export](#55-field-data-export-adr-0012), [§6.2 Media architecture](#62-media-architecture-adr-0012) |
| [ADR-0013](../adr/0013-row-level-scenario-artifact.md) | **Simulation-data organization and calculation.** The browser receives the individual recorded stages of the simulations, not just precomputed counts or summary statistics. Site conditions are stored once per simulation trial; measurements are stored for each recorded stage, grouped by measurement rather than by record. When a user changes the scenario, the browser selects the matching records and calculates their counts, percentiles, and other statistics. | [§5.2 Simulation data organization](#52-simulation-data-organization-adr-0013), [§5.3 Records rather than precomputed summaries](#53-records-rather-than-precomputed-summaries-adr-0013), [§7.1 Performance estimates and verification](#71-performance-estimates-and-verification) |
| [ADR-0014](../adr/0014-committed-content-hashed-artifacts.md) | **Data publication and versioning.** Store the application data files as GitHub release assets; commit only a pointer manifest that pins them by checksum. Publish compressed simulation data and use filenames that change when file content changes. Deploy only the pinned data vintage; retain earlier vintages as release assets. Derived data keeps its source terms: it never enters the repository, and each release carries it as a data asset. | [§5.4 Pinned, versioned artifacts](#54-pinned-versioned-artifacts-adr-0014), [§7.3 Delivery and caching](#73-delivery-and-caching) |
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
| [DR-2](prd.md#dr-2-versioned-exports) | Versioned, dated data exports published for the application's use and named in displayed results and downloads. |
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
expects, or the application fails during startup, calculation, or
rendering, the page must say so plainly; it must not render empty or
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
the site, and deploys them, using the committed repository contents
and the release-asset data they pin
([§5.4](#54-pinned-versioned-artifacts-adr-0014)). It cannot run the
pipeline, so it cannot regenerate the application data. Its test
workflow, `.github/workflows/tests.yml`, skips every test that needs
those inputs or the uncommitted files built from them
(`data/processed/` and the DuckDB file); those tests run only locally.

The project owner must therefore run the pipeline locally and publish
the application data files, the exports listed in §5.1, each with its
export version and export date: a data vintage is uploaded as release
assets and pinned by a committed pointer manifest
([§5.4](#54-pinned-versioned-artifacts-adr-0014)). The site
build fetches those files, verifies them against the pointer
manifest's checksums, and copies them unchanged; it does not run the
pipeline.

References:

- [DR-2 — Versioned exports](prd.md#dr-2-versioned-exports).
- [R-17 — Continuous integration cannot rebuild the full pipeline because raw inputs are local-only](prd.md#94-delivery-and-technical-risks).
- [§5.1 — Application data exports](#51-application-data-exports-adr-0012).
- [§5.4 — Pinned, versioned artifacts](#54-pinned-versioned-artifacts-adr-0014).

### Separate application data exports

The pipeline's existing CSV exports supply the Tableau Public
dashboards. They are written to `dist/csv/`, a gitignored local
directory, and reach Tableau Public when the owner refreshes and
republishes the workbooks. They are not inputs to the site build, and
publishing them as a pinned data vintage
([§5.4](#54-pinned-versioned-artifacts-adr-0014)) would not be enough:
they carry no export version or date.

The application must use separate exports prepared by the same pipeline
for browser filtering, statistics, and downloads. Those exports must be
versioned and pinned from the repository; §5.4 stores them as release
assets and places them beside the scenario page at build time. Statistics
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
- [§5.1 — Application data exports](#51-application-data-exports-adr-0012).
- [§5.4 — Pinned, versioned artifacts](#54-pinned-versioned-artifacts-adr-0014).

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
datasets' terms rather than the code's Apache-2.0. They never enter
the repository, so the Apache-2.0 source archive of a release cannot
carry them; the paper figures, committed but marked `export-ignore`,
are kept out of that archive on the same licensing grounds. How the
data is stored and distributed is set in §5.4;
confirming each source's terms is an open dependency (§10).

References:

- [NFR-6 — Licensing](prd.md#nfr-6-licensing).
- [README — Licensing](../../README.md#licensing).
- [§5.4 — Pinned, versioned artifacts](#54-pinned-versioned-artifacts-adr-0014).
- [§10 — Risks and open dependencies](#10-risks-and-open-dependencies).

---

## 3. System overview

Ground Rupture Explorer has two separate operating flows:

1. **Data preparation and publication:** the project owner runs the
   pipeline locally, publishes the exported application data as a
   pinned release-asset data vintage
   ([§5.4](#54-pinned-versioned-artifacts-adr-0014)), and publishes
   the site through the
   existing build and deployment process.
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
| [DR-2](prd.md#dr-2-versioned-exports) | Versioned application data pinned from the repository. |
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
Versioned exports in release assets, pinned from the repository
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
[§5.1](#51-application-data-exports-adr-0012):

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

The project owner generates these exports locally and publishes them
as the assets of a data release, pinned from the repository by a
committed pointer manifest
([§5.4](#54-pinned-versioned-artifacts-adr-0014)). Each export has an
identifiable version and export date, and filenames change when their
contents change. Before a
vintage is published, the export task decodes the simulation records
it has just written and compares them with the pipeline's data; CI
later fetches the pinned files and checks them against the checksums
that the export task records. CI cannot run the pipeline, so it cannot
regenerate these exports.

The **site build** fetches the pinned data files, verifies their
checksums, and includes them without recalculating their contents. A
separate CI job compiles the TypeScript application and hands the
result to the MkDocs build; the compiled
application is never committed
([§4.3](#43-language-toolchain-and-repository-structure-adr-0011)).
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

This section defines which parts of the product are interactive
application code, which remain ordinary site pages, and which reuse
existing dashboards. It also defines the application's language, build
tools, and integration with the repository.

### 4.1 Native client-side application (ADR-0010)

The scenario page is an application implemented directly within the
existing site. Its controls, filtering, statistical calculations, and
result displays run in the visitor's browser.

Here, **native** means implemented as part of the website rather than
provided through an embedded Tableau dashboard. It does not mean an
installed desktop or mobile application.

This architecture is chosen for the following reasons:

- **The scenario query requires new functionality.** The published
  dashboards do not support the combined filtering and recalculated
  statistics defined for the scenario page. Linking to or embedding
  those dashboards would not supply the missing capability.

- **The product cannot depend on a backend.** The static-site constraint
  excludes server-side filtering, calculation services, and database
  services.

- **The product cannot require a browser-based Python runtime or a
  comparably heavy execution environment.** Both are excluded by the
  performance requirements.

- **The browser can receive the individual simulation records needed
  for interactive calculation.** The proposed compact data format is
  expected to fit the download budget. Loading, filtering, calculation,
  and rendering performance must still be verified under the PDD's
  reference conditions.

The browser's calculation code is tested against independently
calculated pipeline reference results — the pipeline comparison tests,
known in [§9](#9-testing-and-release-architecture) as the parity
harness. Running calculations in
the browser does not change the pipeline's role as the authoritative
source of data transformations and statistical definitions.

References:

- [ADR-0010 — Ground Rupture Explorer is a native client-side
  application](../adr/0010-native-client-side-scenario-app.md).
- [PRD §1.4 — The gap](prd.md#14-the-gap).
- [PRD §1.5 — Product opportunity](prd.md#15-product-opportunity).
- [NFR-2 — Static-site hosting](prd.md#nfr-2-static-site-hosting).
- [NFR-3 — Responsive interaction](prd.md#nfr-3-responsive-interaction).
- [DR-1 — Controlled data source](prd.md#dr-1-controlled-data-source).
- [PDD §9.1 — Performance budgets (D-9,
  Proposed)](pdd.md#91-performance-budgets-d-9-proposed).
- [§5.2 — Simulation data organization](#52-simulation-data-organization-adr-0013).
- [§5.6 — Reference results and verification](#56-reference-results-and-verification-adr-0015).
- [§7.1 — Performance estimates and verification](#71-performance-estimates-and-verification).

### 4.2 Surface map (ADR-0010)

A **surface** is a page or other user-facing part of the product. The
following table records how each surface is implemented.

| Surface | Implementation | Rationale |
|---|---|---|
| Scenario page | **Native client-side application** within the existing site. | The combined scenario query is the documented gap. The existing dashboards do not provide it. |
| Five published dashboards | **Links to the existing site pages**, which already embed Tableau Public. | These dashboards continue to serve their existing uses. No additional native full-dataset panel is justified for v0.3, the MVP release target ([PRD §2.2](prd.md#22-mvp-and-delivery-priorities)). |
| Morphology page (P2) | **Static site page with a small page-local script** for grouping collapse variants with their base types. | The content is explanatory. Its family-grouping control does not require the scenario application's data or calculation code. |
| How the measurements are made (P2) | **Static site page** with approved figures and optional animation. | The page explains the measurement process; it does not perform scenario calculations. |
| Contact and requests (P3, the third delivery priority — [PRD §2.2](prd.md#22-mvp-and-delivery-priorities)) | **Static site page** containing approved contact details and links. | No application calculation or persistent user state is needed. |
| Glossary, citation, data, and paper pages | **Existing pages**, with the glossary additions required by the PDD; product pages link directly to the relevant pages or sections. | These pages already provide the required reference material. |

The scenario page links to the existing dashboard pages rather than
embedding dashboards within its results area. An embedded dashboard
would introduce a separate set of filters that is not connected to the
scenario settings. It would also add loading and interaction costs
without serving a user task defined in the PDD.

References:

- [ADR-0010 — Ground Rupture Explorer is a native client-side
  application](../adr/0010-native-client-side-scenario-app.md).
- [PRD §2.3 — Reuse-first principle](prd.md#23-reuse-first-principle).
- [FR-G5 — Reuse of existing full-dataset dashboards](prd.md#fr-g5-reuse-of-existing-full-dataset-dashboards-c8).
- [NFR-8 — Architecture decision record](prd.md#nfr-8-architecture-decision-record).
- [PDD §1 — Decision register](pdd.md#1-decision-register): D-13
  (Scarp-family view availability and label) and D-19 (Native
  full-dataset exploration panel in v0.3).
- [PDD §2.1 — Page inventory](pdd.md#21-page-inventory).
- [PDD §8 — Education and media surfaces](pdd.md#8-education-and-media-surfaces).
- [PDD §5.11 — Labels, units, and glossary links](pdd.md#511-labels-units-and-glossary-links-fr-g3-cr-3-cr-7).

### 4.3 Language, toolchain, and repository structure (ADR-0011)

The application is developed in a new Gradle subproject,
`subprojects/webapp`, following the repository's existing multi-project
build arrangement.

#### Language and build tools

Application source code uses **TypeScript with strict type
checking**.

The build has two separate responsibilities:

- **Type checking:** the TypeScript compiler checks the source with
  `tsc --noEmit`. Type errors fail validation.
- **JavaScript generation and bundling:** esbuild translates and
  bundles the application for delivery to browsers.

Type checking helps detect incompatible values and incorrect component
interfaces. It does not establish numerical correctness; the pipeline
comparison tests
([§4.1](#41-native-client-side-application-adr-0010),
[§9](#9-testing-and-release-architecture)) remain responsible for
verifying filtering and statistical calculations.

Gradle provides the commands used to build and test the application.
The Node.js version (the JavaScript build runtime) is pinned explicitly
in the build configuration, and package dependencies are pinned through
a committed lockfile — the file that records the exact version of every
dependency. Local development and CI use the same declared tool
versions.

#### No application framework

The application does not use an application framework (such as React
or Vue).

The current product consists of one scenario page with a defined set
of controls, result panels, and notices. The implementation uses a
central scenario-state model and explicit updates to the page.

This avoids adding a framework dependency, but it makes the application
responsible for state-to-view updates, event handling, and cleanup.
The DDD defines these responsibilities, together with initialization,
cleanup when leaving the scenario page, and browser-history handling.

Framework-free implementation is a design choice, not a guarantee of
performance or accessibility. Both remain subject to testing.

#### Chart implementation

The application draws charts directly using **Scalable Vector
Graphics (SVG)** rather than adopting a charting library.

The MVP requires histograms, empirical cumulative distribution curves,
and field-measurement overlays. This limited set of displays makes a
small application-owned chart implementation a reasonable starting
point.

The application is therefore responsible for chart layout, scales,
labels, interaction, resizing, and accessibility. The DDD defines
those behaviors and their tests.

Charts must preserve the canonical colors and ordering where scarp types
are shown. The corresponding HTML statistics tables remain available
regardless of chart implementation.

The expected JavaScript bundle size is tens of kilobytes, but its actual
size must be measured. Later features, including inverse-search
displays, must be assessed against the same performance and
accessibility requirements.

#### Build outputs

Application source and dependency configuration are committed to the
repository. Generated JavaScript and CSS are not.

In CI, a webapp build job produces the application bundle and stylesheet.
The MkDocs job receives those files and places them in the assets
directory beside the scenario page
([§8 — Site integration](#8-site-integration); exact path in the DDD)
before running the strict site build. The site build also fetches the
pointer-pinned data vintage, verifies every checksum against the
committed pointer manifest, and places those files in the same assets
directory ([§8](#8-site-integration)); the fetch-and-verify rules are
[§5.4 — Pinned, versioned
artifacts](#54-pinned-versioned-artifacts-adr-0014), and a mismatch
fails the build.

Release assets are an input to the site build, not the browser's data
source. The build publishes the verified files with the site, and the
browser loads them from the site's own asset URLs.

Locally, the corresponding Gradle build prepares the same files for
`mkdocs serve`. Generated files are written to a gitignored directory.

The bundle and stylesheet have content-hashed filenames: their addresses
change when their contents change. The site build supplies those
filenames to the scenario page rather than requiring a developer to
edit them manually; the mechanism is DDD detail.

Application data and generated application code therefore follow
different rules, though neither enters git:

- application data is generated locally by the owner, uploaded as
  release assets on a data tag, and pinned by the committed pointer
  manifest that CI fetches and checksum-verifies
  ([§5.4](#54-pinned-versioned-artifacts-adr-0014));
- application JavaScript and CSS are built from committed source during
  validation and deployment.

#### Page loading and navigation

The application bundle and stylesheet are loaded only for the scenario
page. Existing site-wide scripts continue to use the site's established
configuration.

The scenario page must not load the Tableau Embedding API, because it
does not contain a Tableau dashboard. Existing dashboard pages must
retain the scripts they need.

Application initialization must work both on a direct page visit and
when entering the scenario page through site navigation. Leaving and
returning to the page must not create duplicate controls, event
handlers, or result updates.

The site enables its theme's instant navigation (Material's
`navigation.instant` feature, set in `subprojects/mkdocs/mkdocs.yml`),
so the integration must use the theme's navigation lifecycle rather
than assume that every page visit reloads the document.

#### CI triggers and validation

Workflow path filters must cover every input whose change can affect
the published application, its calculated results, or the tests that
gate them. These include:

- `subprojects/webapp/**`;
- the committed pointer manifest — the exports themselves are release
  assets outside the repository, so a data refresh reaches CI as a
  pointer-manifest change
  ([§5.4](#54-pinned-versioned-artifacts-adr-0014));
- pipeline source (it triggers the pipeline tests; published results
  change only when a new vintage is pinned);
- site pages and configuration; and
- shared build and dependency configuration.

A webapp-only change must trigger application tests and site validation.
A data refresh must trigger data-integrity checks, the pipeline
comparison tests, and site validation. Both must trigger deployment when
merged to `main`.

Tests must use the exact data files identified by the committed
pointer manifest, not an independently selected or latest available
data version.

The DDD defines the exact workflow paths and job dependencies.

References:

- [ADR-0001 — Gradle multi-project build; code modules under
  `subprojects/`](../adr/0001-gradle-multi-project-build.md).
- [ADR-0011 — Webapp toolchain — TypeScript + esbuild, no framework,
  SVG charts](../adr/0011-webapp-toolchain.md).
- [ADR-0014 — Product artifacts in release assets, pinned by a
  committed manifest](../adr/0014-committed-content-hashed-artifacts.md).
- [PDD §3 — Scenario page: inputs](pdd.md#3-scenario-page-inputs).
- [PDD §4 — Scenario page: results](pdd.md#4-scenario-page-results).
- [PDD §9.3 — Accessibility target (D-17,
  Proposed)](pdd.md#93-accessibility-target-d-17-proposed).
- [PDD §10.1 — Success criteria](pdd.md#101-success-criteria).
- [FR-G2 — Scarp-type colors and identification](prd.md#fr-g2-scarp-type-colors-and-identification).
- [NFR-8 — Architecture decision record](prd.md#nfr-8-architecture-decision-record).
- [§5.4 — Pinned, versioned artifacts](#54-pinned-versioned-artifacts-adr-0014).
- [§7.1 — Performance estimates and verification](#71-performance-estimates-and-verification).
- [§7.3 — Delivery and caching](#73-delivery-and-caching).
- [§8 — Site integration](#8-site-integration).
- [§9 — Testing and release architecture](#9-testing-and-release-architecture).

---

## 5. Data architecture

This section defines how the application data is prepared, organized,
published, and verified.

The existing Python pipeline remains the authoritative source of
research-data transformations and reference calculations. The browser
receives exported simulation records and calculates results for the
user's selected scenario.

### Source requirements

| Reference | Subject |
|---|---|
| [DR-1–DR-7](prd.md#6-data-requirements) | Data provenance, versioning, population rules, measurement handling, field-data preparation, payload limits, and future 3D compatibility. |
| [FR-O5](prd.md#fr-o5-field-data-context) | Measurements from past earthquakes used for comparison with simulation results. |
| [FR-O6](prd.md#fr-o6-kern-county-worked-example) | Data and provenance required by the Kern County worked example. |
| [FR-S5](prd.md#fr-s5-displacement-window) | Fault-slip windows and conversion from anticipated vertical surface offset. |
| [PDD §3.4](pdd.md#34-displacement-window-fr-s5) | The displacement control, including its displayed range and recording step. |
| [PDD §4.3](pdd.md#43-unclassified-records-d-12-proposed) | Treatment of simulation records without a scarp-type classification. |
| [PDD §10.2](pdd.md#102-golden-scenarios) | Predefined scenarios used to verify calculations, referred to as golden scenarios. |

### 5.1 Application data exports (ADR-0012)

The export process produces four outputs for the MVP:

1. the scenario artifact;
2. the field export;
3. the regression export; and
4. the reference results.

A fifth output, the media index, is introduced in
[P2](prd.md#22-mvp-and-delivery-priorities) (the second delivery
priority, after the MVP) when the educational pages and animation
offers are delivered.

The pipeline prepares the research-data outputs using DuckDB views:
named queries that define which records and fields an export contains.
New application views are added in `views.py`, alongside the existing
dashboard views. An export task writes their results into the files
described below.

The media index records supplied media and their publication
permissions; it does not require a research-data query.

| Output | Content | Consumer | Estimated size |
|---|---|---|---|
| **Scenario artifact** | Individual simulation records, organized to avoid repeating trial-level site conditions, together with its artifact manifest — the metadata describing how to read them ([§5.2](#52-simulation-data-organization-adr-0013)). | Browser application. | Approximately 3.1–3.8 MB before compression for the stage arrays alone; the trial table, dictionaries, and artifact manifest add to the total (size accounting: §5.2). |
| **Field export** | Measurements from past earthquakes, with normalized event names, source-specific measurement definitions, and provenance. | Browser field overlays and the Kern County worked example. | Tens of kilobytes. |
| **Regression export** | Per-dip coefficients for converting anticipated vertical surface offset into fault slip at depth. | Browser conversion assist. | Less than 1 KB. |
| **Reference results** | Expected selections (record identities with their scarp-type classes, or an exact comparison signature covering both, such as a checksum of them; [§5.6](#56-reference-results-and-verification-adr-0015)), offset-mode converted windows and range flags, counts, and statistics for the eight golden scenarios, GS-0–GS-7, at full calculation precision. | Automated comparison tests and acceptance checks; not required by the browser during normal use. | Tens of kilobytes. |
| **Media index (P2)** | Available animations and photographs, including scarp type, attribution, captions, and permission status. The index does not contain the media files themselves. | Educational pages and scenario-linked animation offers. | Less than 10 KB. |

The size figures are planning estimates unless supported by measurements
of a generated export. The DDD defines the exact filenames and schemas;
the feasibility measurements of
[§10](#10-risks-and-open-dependencies) establish their actual sizes.

The application does not fetch `dem.csv`, the existing 73 MB export
prepared for Tableau. Instead, it uses the separate application exports
described above. These reuse the existing pipeline without inheriting
the Tableau file's size and repeated data.

References:

- [ADR-0012 — Purpose-built product exports feed the scenario
  app](../adr/0012-product-data-exports.md).
- [DR-1 — Controlled data source](prd.md#dr-1-controlled-data-source).
- [DR-6 — Payload and interaction support](prd.md#dr-6-payload-and-interaction-support).
- [§5.2 — Simulation data organization](#52-simulation-data-organization-adr-0013).
- [§5.5 — Field-data export](#55-field-data-export-adr-0012).
- [§5.6 — Reference results and verification](#56-reference-results-and-verification-adr-0015).
- [§5.7 — Conversion coefficients](#57-conversion-coefficients-adr-0015).
- [§6.2 — Media architecture](#62-media-architecture-adr-0012).

### 5.2 Simulation data organization (ADR-0013)

The export exploits the ensemble's verified geometry: 3,434 trials ×
exactly 101 recorded stages = 346,834 records, with every site
condition constant within a trial. The artifact is **trial-major** —
records are grouped by trial, each trial's 101 stages in one
contiguous run — and **columnar**: values are stored column by column,
each column a typed array, a fixed-type numeric array the browser
reads directly with no parsing step.

- **Trial table** (3,434 rows): fault dip, sediment arm and strength
  label (the nine arm×label states of
  [PDD §3.2](pdd.md#32-sediment-strength-and-structure-fr-s2) Sediment
  strength and structure), depth, density, and a **model-family
  dimension** reserved for the on-hold 3D arm
  ([DR-7](prd.md#dr-7-future-3d-compatibility) Future 3D compatibility)
  — about 6 bytes per trial, ≈ 21 KB in all.
- **Stage arrays** (346,834 entries): slip, scarp height,
  deformation-zone width, scarp dip, scarp class. Slip (0–5.0135 m,
  1,797 distinct values), scarp height (−0.182–5.029 m), and
  deformation-zone width (0–45.811 m) are encoded as **16-bit scaled
  integers** where the pipeline's recorded precision permits this: a
  scale factor converts each recorded value to an integer for storage,
  and decoding restores the original recorded value. A reserved
  integer value — the **null sentinel** — represents a missing
  measurement. The export task's validation
  ([§5.6](#56-reference-results-and-verification-adr-0015)) must
  verify that every encoded value can be restored without loss and
  that no valid value conflicts with the null sentinel. The storage
  scale is distinct from the slip interval between recorded simulation
  stages. Within each trial's contiguous run, stages are stored in
  ascending slip order, and no slip value repeats within a trial;
  export validation verifies this ordering.

  Scarp dip (−12.529–89.765°, recorded at 0.001°, 35,854 distinct
  values) requires a wider representation than a directly scaled
  16-bit integer: its grid holds 102,295 distinct values (102,294
  steps of 0.001°), more than 16 bits can hold. The candidate
  encodings are a wider scaled integer, or a dictionary containing
  each distinct recorded value once with a 16-bit index per record.
  The DDD selects the encoding, under
  [PDD SC-3](pdd.md#101-success-criteria) (correctness) and the
  closing note of [PDD §10.1](pdd.md#101-success-criteria) (Success
  criteria); it must preserve the pipeline-approved recorded precision
  for filtering, statistics, and downloads. Rounding for display
  ([PDD D-23](pdd.md#1-decision-register) Reader-facing display
  precision per quantity) is a separate operation and must not reduce
  the precision of the underlying data.

  The candidate stage-array layouts require approximately 9–11 bytes
  per record — ≈ 3.12–3.82 MB raw beside the ≈ 21 KB trial table —
  excluding any dictionary tables and other metadata; the trial table,
  dictionaries, and artifact manifest must be included in the total
  size calculation. Compression measurements for the candidate
  layouts are ≈ 0.84–1.07 MB. The DDD must identify which encoding
  each measurement represents and report the complete size of the
  selected representation.
- **Artifact manifest** (a JSON file) — the artifact's table of
  contents: data-export
  version and date ([DR-2](prd.md#dr-2-versioned-exports) Versioned
  exports); record and
  trial counts; per-column storage scales and offsets needed to decode
  the values; physical minima and maxima; simulation-stage spacing
  information that explains the slip control's range and step
  ([PDD §3.4](pdd.md#34-displacement-window-fr-s5) Displacement
  window); the label dictionaries in canonical order, including the
  scarp-type palette re-emitted from `config.py`'s
  `SCARP_CLASS_PALETTE`
  ([FR-G2](prd.md#fr-g2-scarp-type-colors-and-identification)
  Scarp-type colors and identification); the null-sentinel
  definitions; checksums (short fingerprints of each file's bytes,
  recomputed later to confirm the file is unchanged); the
  content-hashed filenames of the vintage's other browser-loaded
  exports; and the version of the paired reference results. The DDD
  specifies the exact fields.

Nulls are stored as sentinels, never dropped rows: the two-count model
([PDD §3](pdd.md#3-scenario-page-inputs) Scenario page: inputs) and
the excluded-null statistics line
([FR-O2](prd.md#fr-o2-summary-statistics) Summary statistics) both
need to count what is missing. The small negative measurements (1,232
scarp heights, 30 scarp dips) are carried as-is; their treatment is
the pipeline's documented measurement-hygiene policy
([DR-4](prd.md#dr-4-measurement-hygiene) Measurement hygiene), which
the DDD cites rather than re-decides. Exact field encodings, scales,
endianness, and byte layout are DDD material.

The fixed 101-stage layout is a property of the current 2D export, not
a permanent assumption for every model family. A future model family
may use a different layout, identified through the artifact manifest
and handled at the decoding boundary
([DR-7](prd.md#dr-7-future-3d-compatibility) Future 3D compatibility).

References:

- [ADR-0013 — Row-level, trial-major columnar scenario
  artifact](../adr/0013-row-level-scenario-artifact.md).
- [DR-2 — Versioned exports](prd.md#dr-2-versioned-exports).
- [DR-4 — Measurement hygiene](prd.md#dr-4-measurement-hygiene).
- [DR-7 — Future 3D compatibility](prd.md#dr-7-future-3d-compatibility).
- [FR-G2 — Scarp-type colors and identification](prd.md#fr-g2-scarp-type-colors-and-identification).
- [FR-O2 — Summary statistics](prd.md#fr-o2-summary-statistics).
- [PDD §1 — Decision register](pdd.md#1-decision-register): D-23
  (Reader-facing display precision per quantity).
- [PDD §3 — Scenario page: inputs](pdd.md#3-scenario-page-inputs).
- [PDD §3.2 — Sediment strength and structure](pdd.md#32-sediment-strength-and-structure-fr-s2).
- [PDD §3.4 — Displacement window](pdd.md#34-displacement-window-fr-s5).
- [PDD §10.1 — Success criteria](pdd.md#101-success-criteria).
- [§5.6 — Reference results and verification](#56-reference-results-and-verification-adr-0015).
- [§7.1 — Performance estimates and verification](#71-performance-estimates-and-verification).

### 5.3 Records rather than precomputed summaries (ADR-0013)

The application receives individual simulation records and calculates
results for the selected scenario in the browser. It does not rely on
a table of precomputed answers for every possible scenario.

The pipeline supplies conversion coefficients and descriptive metadata,
such as column ranges, alongside the simulation records. These do not
replace the records needed for filtering, statistics, and downloads.

This approach is chosen for three reasons.

#### The supported filters create too many combinations

Users can combine selections across seven fault dips, nine sediment
arm-and-label combinations, three depths, three density categories,
six scarp types, two populations, and a displacement window.

Precomputing and storing answers for every supported combination would
be impractical. Maintaining those answers would also add complexity
whenever the data or filtering rules changed.

Some statistics, such as counts and sums, can be combined from smaller
groups. Exact percentiles, however, cannot generally be reconstructed
from those groups' counts, means, and percentiles alone. Summary tables
would therefore not supply all the statistics required for arbitrary
scenario selections.

Individual records are also required for the filtered-data download.

#### The record-level export fits the payload budget

The candidate encodings described in §5.2 indicate that the simulation
records can fit within the 4 MB compressed payload budget
([§7.1](#71-performance-estimates-and-verification)).

This removes the main reason to replace the records with precomputed
summaries. The selected encoding's complete size must still be verified,
and interaction performance must be measured separately.

#### The required calculations stay fast enough in the browser

For each scenario, the query engine:

1. checks which trials match the selected site conditions;
2. selects stages using the displacement window and population rule;
3. applies the resulting-scarp-type filter;
4. counts matching records and separates valid from missing
   measurements for each output; and
5. calculates the required statistics and chart data.

For the current 2D export, each trial's 101 stages are stored together,
so the engine can scan the stages belonging to matching trials without
repeatedly checking their site conditions.

Filtering requires a scan of the relevant records. Exact percentile
calculation additionally requires sorting the selected values, or an
equivalent selection algorithm. Empty-result explanations may require
additional filtering passes to test the effect of relaxing individual
conditions.

The expected costs — a scan of a few milliseconds and a percentile
sort of tens of milliseconds — put the calculation well inside the
PDD's 200 ms interaction target at the 95th percentile. The
feasibility measurements must verify that the
complete update — filtering, statistics, diagnostics where applicable,
and rendering — meets that target. Record-level delivery does not
prevent later optimizations, provided they preserve the defined
results.

References:

- [ADR-0013 — Row-level, trial-major columnar scenario
  artifact](../adr/0013-row-level-scenario-artifact.md).
- [DR-1 — Controlled data source](prd.md#dr-1-controlled-data-source).
- [DR-6 — Payload and interaction support](prd.md#dr-6-payload-and-interaction-support).
- [FR-O2 — Summary statistics](prd.md#fr-o2-summary-statistics).
- [FR-D1 — Download matching simulation records and statistics](prd.md#fr-d1-download-matching-simulation-records-and-statistics).
- [R-16 — Combined scenario filtering requires enough detail to support
  arbitrary filters, but the static site has a strict payload
  budget](prd.md#94-delivery-and-technical-risks).
- [PDD §3 — Scenario page: inputs](pdd.md#3-scenario-page-inputs).
- [PDD §9.1 — Performance budgets](pdd.md#91-performance-budgets-d-9-proposed).
- [PDD §4.5 — Small, empty, and partial results](pdd.md#45-small-empty-and-partial-results-fr-o3-d-11-proposed).
- [§5.2 — Simulation data organization](#52-simulation-data-organization-adr-0013).
- [§7.1 — Performance estimates and verification](#71-performance-estimates-and-verification).

### 5.4 Pinned, versioned artifacts (ADR-0014)

The project owner generates application data locally because CI cannot
rebuild the pipeline from the raw research inputs.

Generated data files are not committed to Git. Instead, each versioned
set of exports — a **data vintage** — is uploaded as the assets of a
GitHub prerelease (a release marked as not a regular software release,
so it never shows as the repository's latest) on a dedicated **data
tag**; together, the tag and its prerelease are the vintage's **data
release**. A vintage contains the outputs of
[§5.1](#51-application-data-exports-adr-0012): the scenario artifact
with its artifact manifest, the field export, the regression export,
the reference results, and, from
[P2](prd.md#22-mvp-and-delivery-priorities) (the second delivery
priority, after the MVP), the media index. A small committed
pointer manifest identifies the exact files that tests and site builds
must retrieve.

This storage arrangement follows the owner's rule recorded in
[ADR-0014](../adr/0014-committed-content-hashed-artifacts.md) (review
of 2026-10-28): generated data stays out of git, separated from the
code that produces it.

#### Two manifests with different responsibilities

| Manifest | Location | Contents and purpose | Consumer |
|---|---|---|---|
| **Artifact manifest** | A file in the data vintage. | Describes the simulation data and names the other browser-loaded export files: versions and export date, counts, ranges, storage information, stage spacing, label dictionaries, null sentinels, checksums, and filenames (full field list: [§5.2](#52-simulation-data-organization-adr-0013); defined by [ADR-0013](../adr/0013-row-level-scenario-artifact.md)). | Browser application. |
| **Pointer manifest** | Committed to the repository. | Identifies the data tag, content-hashed filenames, checksums, export version, and export date. | CI and local build tasks. |

One export-task run prepares the data files, reference results, and both
manifests. The pointer manifest includes checksums for every file in the
vintage, including the artifact manifest.

Generating them together reduces the risk of inconsistent versions.
Validation must still check their consistency; disagreement fails the
export or build rather than being accepted silently.

#### Generating and publishing a data vintage

The refresh process extends the existing Gradle commands, including
`egrBuild` and the `csvExport*` tasks:

1. Generate the application exports and reference results locally.
2. Run export-integrity and reference-result checks. The task decodes
   the files it has just written using the decoding information it
   holds in memory (storage scales and offsets, dictionaries, null
   sentinels); the manifests are written only after these checks pass
   ([§5.6](#56-reference-results-and-verification-adr-0015)).
3. Produce the artifact manifest, content-hashed filenames, and pointer
   manifest.
4. Upload the vintage's files to its data release.
5. Verify that the uploaded files match the generated checksums.
6. Commit the updated pointer manifest and submit it for review.

The updated pointer manifest must not be committed (step 6) until the
vintage's upload and verification are complete.

The DDD defines the task names, upload mechanism, and exact manifest
schemas.

#### Retrieving and publishing the pinned files

CI retrieves only the vintage identified by the committed pointer
manifest. It must not select the newest available data release or
substitute another vintage.

Before using a file, the build verifies its checksum against the pointer
manifest. A missing file or checksum mismatch fails the build.

The site build places the verified files in the application's data
directory and publishes them with the site. Release assets are therefore
an input to the build, not the browser's runtime data source. The browser
loads the published copies from the site's asset URLs.

The page identifies the artifact manifest by its content-hashed
filename, which the site build pins into the page, as it does the
bundle's ([§4.3](#43-language-toolchain-and-repository-structure-adr-0011));
the mechanism is DDD detail. That manifest describes the simulation
data and names the other export files the application loads.

#### Content-hashed filenames and caching

Like the bundle and stylesheet
([§4.3](#43-language-toolchain-and-repository-structure-adr-0011)),
every published application data file has a filename containing an
identifier derived from its contents — the same kind of fingerprint as
a checksum, used here as part of the file's address. Changed contents
require a changed filename; the publication process must not reuse an
existing filename for different bytes.

This extends the site's existing cache-busting convention. It prevents
a browser from confusing a previously cached file with a new version
published at the same address.

Content-hashed filenames support safe reuse of cached files. Actual
cache behavior remains subject to the hosting platform; delivery and
caching are discussed in [§7.3](#73-delivery-and-caching).

The scenario file is published in the pre-compressed form fetched by the
browser. No uncompressed duplicate is uploaded unless a later decision
establishes a need for one.

The current size estimate is approximately 1 MB per vintage, plus small
metadata and reference files. The selected encoding's measured total
size is recorded with the feasibility results.

#### Retention, rollback, and withdrawal

A normal data refresh publishes a new vintage and changes the committed
pointer manifest. Earlier vintages remain available for historical
builds and rollback; the deployed application uses one selected vintage.

Reverting the pointer-manifest change restores the previous data
selection, provided that:

- the earlier release assets remain available; and
- the selected application version supports their format.

Rollback of a release that changes both application code and data must
restore a compatible combination of both.

A data vintage must not be deleted as routine cleanup while retained
repository versions depend on it.

Withdrawal is an exceptional operation. It must address both the release
assets and any copies published with the site. The withdrawal procedure
must document the reason, replace or disable affected published data,
and identify the historical builds that can no longer be reproduced.
The DDD defines the operational steps.

#### Licensing and archival distribution

Permission to redistribute each export must be confirmed before its
first public upload. This applies to the simulation data, field data,
and any derived tables or reference results.

Application code is licensed under Apache-2.0. That license must not be
presented as automatically covering the data exports. Each data vintage
must include or reference the applicable source terms, attribution, and
redistribution conditions.

The media index is project-maintained metadata. Its applicable terms
must be recorded when it is introduced in P2.

Because generated data is stored outside Git, a repository source
archive is not a self-contained copy of the application's data.
Rebuilding or testing from that archive requires access to the vintage
identified by its pointer manifest.

The release process must preserve the distribution arrangement recorded
in [`notes/Roadmap.md`](../../notes/Roadmap.md#decisions-made): each
tagged software release ships the
dashboards' plotting CSVs, and the current application exports ride
beside them as the release's data asset
([§9](#9-testing-and-release-architecture)).

The following remain open and are tracked in §10:

- confirmation of redistribution terms for each source;
- the procedure for depositing and preserving processed data in Zenodo;
- the relationship between the software archive and any separate dataset
  record; and
- updates to the README and `LICENSE-docs` distinguishing raw inputs,
  which remain undistributed, from publicly distributed derived exports.

References:

- [ADR-0014 — Product artifacts in release assets, pinned by a committed manifest](../adr/0014-committed-content-hashed-artifacts.md).
- [ADR-0013 — Row-level, trial-major columnar scenario
  artifact](../adr/0013-row-level-scenario-artifact.md).
- [DR-2 — Versioned exports](prd.md#dr-2-versioned-exports).
- [R-17 — Continuous integration cannot rebuild the full pipeline
  because raw inputs are local-only](prd.md#94-delivery-and-technical-risks).
- [NFR-6 — Licensing](prd.md#nfr-6-licensing).
- [NFR-7 — Build and data-quality gates](prd.md#nfr-7-build-and-data-quality-gates).
- [PDD §9.4 — Releases](pdd.md#94-releases).
- [§4.3 — Language, toolchain, and repository
  structure](#43-language-toolchain-and-repository-structure-adr-0011).
- [§5.1 — Application data exports](#51-application-data-exports-adr-0012).
- [§5.2 — Simulation data organization](#52-simulation-data-organization-adr-0013).
- [§5.6 — Reference results and verification](#56-reference-results-and-verification-adr-0015).
- [§7.3 — Delivery and caching](#73-delivery-and-caching).
- [§9 — Testing and release architecture](#9-testing-and-release-architecture).
- [§10 — Risks and open dependencies](#10-risks-and-open-dependencies).

### 5.5 Field-data export (ADR-0012)

The field export supplies measurements from past earthquakes for the
comparison overlays and the Kern County worked example. It contains one
row per individual field measurement, with its source, measurement type,
units, and provenance.

The pipeline prepares the export from the existing field-data views,
including `fdhi_cleaned`, `kern_combined`, `sure_enriched`, and
`historic_events`. The DDD identifies which views supply which records
and how overlapping records are handled; listing these views does not
mean that their contents are simply combined.

#### Consistent names without losing source meaning

The pipeline standardizes event names and export fields as required by
[DR-5](prd.md#dr-5-field-data-preparation) (Field-data preparation).
This corrects spelling variants and other naming inconsistencies
without treating different source measurements as identical quantities.

Each record preserves the source's measurement name and identifies the
simulated measurement with which it may be compared. This relationship
is comparison metadata, not a conversion or a claim of equivalence.

The comparison map follows
[PDD §4.4](pdd.md#44-field-overlay-fr-o5-d-18-proposed) (Field
overlay):

| Source | Field measurement | Simulation display |
|---|---|---|
| FDHI | Vertical separation | Scarp height. |
| FDHI | Fault-zone width | Deformation-zone width. |
| Kern County compilation | Vertical scarp-height values | Scarp height. |
| Kern County compilation | Deformation-zone width | Deformation-zone width. |
| SURE | Scarp height | Scarp height. |
| SURE | Fault-normal displacement component | Limited comparison in the deformation-zone-width display; this is a displacement quantity, not a width. |

The application retains these source-specific labels and the required
“Analogous, not identical” explanation.

#### Record contents

Each exported record includes:

- the source compilation and event name;
- the source measurement identifier, where available;
- the measurement type, value, and units;
- the simulated measurement with which it may be compared;
- whether the relevant field-width measurement meets the paper's
  less-than-50-metre criterion;
- membership in the project's established labeled event set, which
  [PDD §4.4](pdd.md#44-field-overlay-fr-o5-d-18-proposed) makes the
  overlay's default (the DDD names the pipeline source of its
  membership); and
- available provenance and source references.

A criterion that does not apply to a measurement must be distinguishable
from a criterion that the measurement fails.

#### Kern County selection

The research group has not yet decided which Kern County data group
and principal-width selection rule the worked example will use
([PDD D-6](pdd.md#1-decision-register) Kern County field-data group
and principal-width rule).

The export must retain enough information to distinguish the candidate
groups and apply the approved rule once it is available. It must not
invent a principal-rupture classification or source attribution that
the underlying records do not provide.

References:

- [ADR-0012 — Purpose-built product exports feed the scenario
  app](../adr/0012-product-data-exports.md).
- [FR-O5 — Field-data context](prd.md#fr-o5-field-data-context).
- [FR-O6 — Kern County worked example](prd.md#fr-o6-kern-county-worked-example).
- [DR-5 — Field-data preparation](prd.md#dr-5-field-data-preparation).
- [PDD §4.4 — Field overlay](pdd.md#44-field-overlay-fr-o5-d-18-proposed).
- [PDD §1 — Decision register](pdd.md#1-decision-register): D-6 (Kern
  County field-data group and principal-width rule).

### 5.6 Reference results and verification (ADR-0015)

The pipeline defines the authoritative research-data transformations
and reference calculations. Verification checks three separate things:

1. the scenario artifact preserves the approved pipeline records;
2. retrieved files match the published export; and
3. the application's filtering and calculations reproduce the pipeline
   reference results.

The first subsection below covers checks 1 and 2; the next two cover
check 3; the last verifies the population-selection rule that both
sides must share.

#### Verify the exported records

After writing the scenario artifact's data files, and before either
manifest is written ([§5.4](#54-pinned-versioned-artifacts-adr-0014),
step 2), the export task decodes them using the decoding information
it holds in memory (storage scales and offsets, dictionaries, null
sentinels) and compares every record with the pipeline view from
which it was generated.

The comparison checks:

- trial and stage identifiers;
- site conditions and scarp-type labels;
- recorded measurement values;
- missing measurements; and
- ascending, non-repeating slip order within each trial's run
  ([§5.2](#52-simulation-data-organization-adr-0013)).

The check must confirm that encoding and decoding preserve the
pipeline-approved recorded precision. An export that fails this check
must not be published.

The pointer manifest records checksums for every vintage file,
including the artifact manifest written after the checks. CI uses
these checksums to confirm that it retrieves exactly
the files the export task produced. Checksums establish file
integrity; they do not independently establish scientific or
computational correctness.

#### Generate independent reference results

The pipeline calculates expected results for the golden scenarios
GS-0–GS-7 defined in [PDD §10.2](pdd.md#102-golden-scenarios) (Golden
scenarios).

These calculations use the authoritative pipeline views, not the
decoded scenario artifact. This keeps reference calculation separate
from verification of the export format.

For each scenario, the reference results include:

- the identities of the selected simulation records with their
  scarp-type classes, or an exact comparison signature covering both
  (for example, a checksum computed from the selected record
  identifiers and classes);
- the matching-record count;
- each measurement's valid and excluded-null counts;
- for offset-mode scenarios such as GS-1, each selected dip's
  converted slip window and its range flag; and
- the complete summary-statistics set required by
  [FR-O2](prd.md#fr-o2-summary-statistics) (Summary statistics).

The pipeline writes these results at full calculation precision into
the versioned reference-results export. The manifests identify the
scenario artifact and reference results that belong together.

#### Compare the application with the references

Automated application tests load the published scenario artifact and
evaluate every golden scenario through the application's query engine.

The comparison rules are:

- selected records, their scarp-type classes, counts, and range flags
  must match exactly;
- calculated statistics and converted slip windows must agree with the
  pipeline references within the per-calculation numerical tolerances
  specified in the DDD; and
- reader-facing values must match exactly after both results are
  rounded using the PDD's display-precision rules
  ([PDD D-23](pdd.md#1-decision-register) Reader-facing display
  precision per quantity).

A numerical tolerance must not conceal a difference in filtering,
population selection, or missing-value treatment.

Pipeline tests verify the underlying views and reference calculations.
Application tests verify agreement with those references. Acceptance
walkthroughs then check that the page presents the corresponding
results, counts, and caveats correctly.

#### Verify population selection

The pipeline must implement and test the one-state-per-trial rule before
the application uses it.

For the full ensemble without a restricted slip window, the final-state
selection must produce 3,434 records: one per trial, with no ties at each
trial's maximum slip.

Windowed and filtered selections must be tested separately. For each
trial matching the site conditions, the selected state is the record
at the highest slip value within the selected window
([DR-3](prd.md#dr-3-one-state-per-trial-population)
One-state-per-trial population) — in offset mode, the window converted
for the trial's own dip
([PDD §3.6](pdd.md#36-multi-dip-conversion-rule-d-3-proposed)); with
stages stored in ascending slip order
([§5.2](#52-simulation-data-organization-adr-0013)), that is the last
stored stage inside the window. A trial with no stage inside that
window contributes no record.

The application's population selection must agree with the pipeline's
selection, not merely produce the same total count.

References:

- [ADR-0015 — Golden-scenario references and a pipeline↔client parity
  harness](../adr/0015-golden-scenario-parity.md).
- [DR-1 — Controlled data source](prd.md#dr-1-controlled-data-source).
- [DR-3 — One-state-per-trial population](prd.md#dr-3-one-state-per-trial-population).
- [FR-S6 — Population selection](prd.md#fr-s6-population-selection).
- [FR-O2 — Summary statistics](prd.md#fr-o2-summary-statistics).
- [PDD §10.1 — Success criteria](pdd.md#101-success-criteria).
- [PDD §10.2 — Golden scenarios](pdd.md#102-golden-scenarios).
- [PDD §1 — Decision register](pdd.md#1-decision-register): D-23
  (Reader-facing display precision per quantity).
- [§5.2 — Simulation data organization](#52-simulation-data-organization-adr-0013).
- [§5.4 — Pinned, versioned artifacts](#54-pinned-versioned-artifacts-adr-0014).
- [§9 — Testing and release architecture](#9-testing-and-release-architecture).

### 5.7 Conversion coefficients (ADR-0015)

The offset-to-slip assist uses the pipeline's exported regression
relationship for each selected fault dip. The application does not
maintain a separate, manually copied set of coefficients.

This is the relationship already presented by the project's dashboards
and tested in `test_regression_views.py`. For example, the currently
tested slopes are 0.5021 at 30° and 0.6453 at 40°.

#### Regression export

For each modeled fault dip, the regression export identifies:

- the fault dip;
- the coefficients required by the approved relationship;
- the equation's direction: which quantity is expressed as a function
  of which;
- the quantities and units used;
- whether the relationship includes an intercept or is constrained
  through zero; and
- the relationship's source and version.

The DDD specifies the equation and how the application uses it to
convert anticipated vertical surface offset into fault slip at depth.
It must reproduce the pipeline's approved relationship rather than
derive a new conversion.

The application applies the relationship according to the PDD's
multi-dip conversion rule
([PDD §3.6](pdd.md#36-multi-dip-conversion-rule-d-3-proposed)).
Conversion results and out-of-range behavior are covered by the
reference comparisons described in
[§5.6](#56-reference-results-and-verification-adr-0015).

#### Other pipeline-supplied values

The same principle applies to other research-derived values and
research-group conventions:

- scarp-type colors and canonical ordering come through the artifact
  manifest;
- physical ranges and measurement-storage metadata come from the
  exported data descriptions; and
- simulation-stage spacing information comes from the pipeline rather
  than being inferred from the storage scale.

The application must not maintain hand-copied duplicates of these
values.

Product settings, such as small-result warning thresholds and display
precision, are different: they follow the decisions recorded in the
PDD. The DDD defines how those settings are represented in application
configuration.

References:

- [ADR-0015 — Golden-scenario references and a pipeline↔client parity
  harness](../adr/0015-golden-scenario-parity.md).
- [ADR-0012 — Purpose-built product exports feed the scenario
  app](../adr/0012-product-data-exports.md).
- [FR-S5 — Displacement window](prd.md#fr-s5-displacement-window).
- [FR-G2 — Scarp-type colors and identification](prd.md#fr-g2-scarp-type-colors-and-identification).
- [PDD §3.5 — Offset-entry mode and conversion assist](pdd.md#35-offset-entry-mode-and-conversion-assist-fr-s5).
- [PDD §3.6 — Multi-dip conversion rule](pdd.md#36-multi-dip-conversion-rule-d-3-proposed).
- [PDD §5.6 — Conversion assist](pdd.md#56-conversion-assist-fr-s5-d-3).
- [§5.1 — Application data exports](#51-application-data-exports-adr-0012).
- [§5.2 — Simulation data organization](#52-simulation-data-organization-adr-0013).
- [§5.6 — Reference results and verification](#56-reference-results-and-verification-adr-0015).
- [§6 — Application architecture](#6-application-architecture).

---

## 6. Application architecture

This section defines the application's major components, their
responsibilities, and how they exchange information. The DDD specifies
their interfaces and module structure.

### Source requirements

| Reference | Subject |
|---|---|
| [FR-S1–S8](prd.md#51-scenario-inputs-c1-p1) | Scenario inputs and population selection. |
| [FR-O1–O6](prd.md#52-results-and-field-data-context-c2-c3-p1) | Results, warnings, field comparisons, and the worked example. |
| [FR-D1–D4](prd.md#53-downloads-and-citation-c4-c5-p1) | Downloads, citation, and provenance. |
| [FR-X1–X2](prd.md#54-sharing-and-inverse-search-c6-c7-p2) | Sharing and inverse search. |
| [FR-G1–G5](prd.md#56-shared-display-rules-c10-and-cross-capability-rules) | Shared display rules. |
| [PDD §3–§7](pdd.md#3-scenario-page-inputs) | Scenario controls, results, reader-facing text, downloads, and sharing. |

The design has six components. They are logical responsibilities, not
necessarily six code modules.

#### Scenario state and shared-link encoding

A single scenario-state object records the user's current settings.
Controls update this state; calculations and displays use it. Components
must not maintain conflicting copies of the same scenario setting.

The state includes both calculation settings, such as sediment
selections, and display settings, such as the active measurement panel.
Changing a display-only setting need not repeat unrelated calculations.

In P2, a **URL codec** encodes these settings into a link's query
parameters and restores them when the link is opened. It preserves the
complete restore list defined in PDD §7.1, including the selected
measurement, view, and field-overlay settings.

When shared links first ship, they carry no creation-version stamp,
following PDD D-15. Opening a link restores settings and recalculates
results using the currently published application and data. The URL
does not contain calculated results or identify a saved report.

References:

- [ADR-0010 — Native client-side scenario application](../adr/0010-native-client-side-scenario-app.md).
- [FR-X1 — Shareable scenario links](prd.md#fr-x1-shareable-scenario-links).
- [PDD §7.1 — Shared links](pdd.md#71-shared-links).
- [PDD decision register — D-15, shared-link version notice](pdd.md#1-decision-register).

#### Query engine

The query engine receives decoded simulation data and scenario settings.
It returns selected-record information, counts, statistics, chart data,
and diagnostic results without reading or changing the page.

Its calculations are pure: the same data and settings produce the same
results, without changing the input data or relying on hidden page
state. This allows tests to exercise the engine without a browser
interface.

The calculation sequence is:

1. Select trials matching the site conditions.
2. Apply the displacement window and population-selection rule.
3. Apply the resulting-scarp-type filter to the selected stages.
4. Count matching records.
5. Separate valid and missing measurements for each output.
6. Calculate the required statistics and chart data.
7. Produce any small-result or empty-result diagnostic information.

Population selection precedes the scarp-type filter. In the
one-state-per-trial population, the engine selects the last stage
inside the applicable slip window, then tests its scarp type. It must
not search backward for an earlier stage merely because that stage
matches the scarp-type filter.

When no slip window is active:

- the all-stages population includes all eligible recorded stages; and
- the one-state-per-trial population includes each eligible trial's
  actual final stage.

The engine remains independent of its execution location. The DDD
defines scheduling and any background execution needed to meet the
interaction budget. The same calculation code must be usable by the
pipeline comparison tests.

References:

- [FR-S6 — Population selection](prd.md#fr-s6-population-selection).
- [FR-S7 — Scarp-type filter](prd.md#fr-s7-scarp-type-filter).
- [FR-O2 — Summary statistics](prd.md#fr-o2-summary-statistics).
- [DR-3 — One-state-per-trial population](prd.md#dr-3-one-state-per-trial-population).
- [§5.3 — Records rather than precomputed summaries](#53-records-rather-than-precomputed-summaries-adr-0013).
- [§5.6 — Reference results and verification](#56-reference-results-and-verification-adr-0015).

#### View layer

The view layer presents:

- scenario controls;
- the active-scenario summary;
- measurement charts and statistics tables;
- conversion information; and
- warnings, explanations, and error states.

It renders the query engine's results rather than maintaining a separate
implementation of filtering or statistics.

Each measurement panel provides its statistics as a real HTML table.
Charts supplement that table and follow the PDD's chart-suppression
rules for small result sets.

The view layer distinguishes:

- no matching simulation records;
- matching records but no valid measurement for the displayed quantity;
- a small valid-measurement population;
- insufficient measurements to draw a chart; and
- partial coverage of the requested displacement range.

These conditions are not all mutually exclusive. The DDD specifies their
presentation and precedence according to the PDD, without suppressing
applicable scientific caveats.

Scarp-type colors and ordering come from the artifact manifest, which
carries the canonical values maintained by the pipeline. The application
does not keep a manually copied palette.

References:

- [PDD §4.5 — Small, empty, and partial results](pdd.md#45-small-empty-and-partial-results-fr-o3-d-11-proposed).
- [PDD §9.3 — Accessibility target](pdd.md#93-accessibility-target-d-17-proposed).
- [FR-G2 — Scarp-type colors and identification](prd.md#fr-g2-scarp-type-colors-and-identification).
- [§5.7 — Pipeline-supplied values](#57-conversion-coefficients-adr-0015).

#### Downloads

The download component generates files in the browser from the current
scenario and its calculated results. It does not send records to a
server for file generation.

The download package includes the matching-records CSV, summary
statistics, and provenance defined by the PDD. The package records the
matching-record count, per-measurement valid counts, software and data
versions, and applicable caveats.

Downloads must describe one consistent scenario state. If the user
changes settings during preparation, the package must not mix the old
scenario's records with the new scenario's labels or statistics.

In P2, chart export combines the chart with its provenance caption and
the accompanying provenance text.

References:

- [PDD §6.1 — Download package](pdd.md#61-download-package-fr-d1).
- [PDD §6.3 — Chart export](pdd.md#63-chart-export-fr-d2-p2-d-14-proposed).

#### Field overlay

The field-overlay component displays the field export as separate,
source-labeled series of black marks. It preserves the source-specific
measurement names, comparison limitations, and width-selection controls
defined in the PDD.

Field measurements do not enter the simulation statistics or alter the
matching simulation population.

The Kern County worked example consists of a predefined scenario state,
a selected field-data group, and walkthrough text. It is enabled for
public use only after the research group resolves D-6 and approves the
example.

References:

- [§5.5 — Field-data export](#55-field-data-export-adr-0012).
- [PDD §4.4 — Field overlay](pdd.md#44-field-overlay-fr-o5-d-18-proposed).
- [PDD §4.7 — Kern County worked example](pdd.md#47-kern-county-worked-example-fr-o6-d-6-open).
- [PDD decision register — D-6, Kern County selection](pdd.md#1-decision-register).

#### Education surfaces

The morphology and measurement-explanation pages arrive in P2; the
contact page arrives in P3. They are ordinary site pages rather than
parts of the scenario calculation engine.

The morphology page uses a small page-local script for the
“Group collapse variants” control. Media availability, attribution,
captions, and permission status come from the media index.

The scenario page links to these pages and the relevant glossary
entries. They do not need to load the simulation data or query engine.

References:

- [PDD §8 — Education and media surfaces](pdd.md#8-education-and-media-surfaces).
- [PDD §3.7 — Scarp-family grouping control](pdd.md#37-population-scarp-filter-family-view-reset).
- [PDD §5.11 — Labels, units, and glossary links](pdd.md#511-labels-units-and-glossary-links-fr-g3-cr-3-cr-7).
- [§6.2 — Media architecture](#62-media-architecture-adr-0012).

### 6.1 Failure honesty (ADR-0010)

A visitor can meet four kinds of trouble. The application answers each
honestly — never a blank page, never a silently wrong result — and
never presents one kind as another: unavailable results are not "no
matching records" ([NFR-5](prd.md#nfr-5-accessibility) Accessibility),
and a startup failure is not the user having disabled JavaScript. The
first two kinds are expected product states: the application is
working and explains the result. The last two mean the browser lacks
what the application needs, or the application itself fails.

#### Invalid or out-of-range input

The constrained controls — multi-selects, predefined categories, a
bounded window control — make most invalid actions impossible. The
free entry is offset mode
([PDD §3.5](pdd.md#35-offset-entry-mode-and-conversion-assist-fr-s5)
Offset-entry mode and conversion assist): switching modes never
silently converts a typed value, and for each selected dip the assist
shows the converted slip window and an in-range, partly-out-of-range,
or out-of-range flag. Invalid entries are rejected; valid entries that
convert partly or entirely outside the modeled range are accepted and
flagged, not rejected — the flags report the coverage limitation. On a
rejection the previous results stay visible but belong, visibly, to
the last valid scenario: the rejected value never reaches the
active-scenario summary or download provenance
([PDD §3.5](pdd.md#35-offset-entry-mode-and-conversion-assist-fr-s5)).

#### No data for the selected scenario

A valid scenario can match no records, or match records that hold no
valid values for a measurement. These are results, not failures. The
notice rules of
[PDD §4.5](pdd.md#45-small-empty-and-partial-results-fr-o3-d-11-proposed)
(Small, empty, and partial results) present them with their counts —
the no-match diagnostic, the no-valid-measurement notice, and the
warning and suppression tiers
([FR-O3](prd.md#fr-o3-small-or-empty-result-sets) Small or empty
result sets); the view layer ([§6](#6-application-architecture))
carries the machinery. An empty result is explained, never rendered as
a blank chart, and never conflated with a loading failure.

#### Unavailable browser capabilities

The scenario page contains explanatory content in its Markdown source:
what the tool does, its limitations, and links to the paper, archive,
dashboards, and glossary.

This content remains available wherever the application does not
start. With JavaScript disabled, the page explains that the
interactive controls require it; a browser lacking a capability the
application requires leaves the same content standing. The supported
set is the
[PDD §9.2](pdd.md#92-browser-and-mobile-baseline-d-16-proposed)
baseline; a browser being outside it is not by itself treated as proof
that the application cannot run.

The application replaces or hides its fallback presentation only after
the corresponding interactive content is ready.

#### Internal failure

If required files cannot be retrieved, decoded, or validated, the
application states that results are unavailable. It must not present an
empty distribution or stale statistics as a valid result.

The application verifies that the loaded artifact manifest identifies
the data version pinned into the site build and a format supported by
the application. A mismatch or unsupported format stops calculation
and produces an explicit error. Content-hashed filenames reduce the
likelihood of loading the wrong files, but do not replace validation.

Unexpected failures during application startup, calculation, or
rendering also produce an explicit unavailable-results state
([NFR-5](prd.md#nfr-5-accessibility) Accessibility: results are never
rendered empty or stale as if they were valid). A startup failure must
not be misrepresented as the user having disabled JavaScript. If
previously displayed results remain visible, they are identified as
belonging to the last successfully calculated scenario, and downloads
must not combine current settings with previous results
([PDD §6.1](pdd.md#61-download-package-fr-d1) Download package).

The DDD defines the checks for every category above and connects each
state to the approved reader-facing messages.

References:

- [ADR-0010 — Ground Rupture Explorer is a native client-side
  application](../adr/0010-native-client-side-scenario-app.md).
- [NFR-5 — Accessibility](prd.md#nfr-5-accessibility).
- [FR-O3 — Small or empty result sets](prd.md#fr-o3-small-or-empty-result-sets).
- [FR-S5 — Displacement window](prd.md#fr-s5-displacement-window).
- [PDD §3.5 — Offset-entry mode and conversion assist](pdd.md#35-offset-entry-mode-and-conversion-assist-fr-s5).
- [PDD §4.5 — Small, empty, and partial results](pdd.md#45-small-empty-and-partial-results-fr-o3-d-11-proposed).
- [PDD §6.1 — Download package](pdd.md#61-download-package-fr-d1).
- [PDD §9.2 — Browser and mobile baseline](pdd.md#92-browser-and-mobile-baseline-d-16-proposed).
- [§5.4 — Pinned, versioned artifacts](#54-pinned-versioned-artifacts-adr-0014).
- [§6 — Application architecture](#6-application-architecture).

### 6.2 Media architecture (ADR-0012)

Animations and photographs are site assets described by one media index,
introduced in P2. The index is generated and pinned through the export
and publication process described in §5.4.

For each item, it records:

- the media file's location;
- its purpose and, where applicable, scarp type;
- source attribution;
- permission status; and
- caption.

The index supports both scarp-type illustrations and media explaining
the measurement process. A measurement-process animation need not be
assigned a scarp type.

The morphology page and scenario-linked animation offers use the same
index. Where no approved animation exists for a scarp type, the page
shows “Animation not yet available” rather than implying complete
coverage.

Publication permissions are enforced during the site build, not merely
when rendering a page. Unapproved media must be kept outside the
published site source or explicitly excluded from the publication
output. The release check verifies that such files are absent from the
published site.

Development copies of third-party photographs may be used only where
permitted. Their presence in the working tree does not authorize public
distribution.

References:

- [ADR-0012 — Application data exports](../adr/0012-product-data-exports.md).
- [FR-E1 — Morphology education](prd.md#fr-e1-morphology-education).
- [NFR-6 — Licensing](prd.md#nfr-6-licensing).
- [PDD §6.4 — Animation offers](pdd.md#64-animation-offer-and-dominance-fr-d4-p2-d-7-proposed).
- [PDD §8.2 — Animation library](pdd.md#82-animation-library-d-8-open).
- [PDD decision register — D-8, animation coverage](pdd.md#1-decision-register).
- [R-12–R-14 — Media permissions and availability](prd.md#93-content-and-media-dependencies).
- [§5.4 — Pinned, versioned artifacts](#54-pinned-versioned-artifacts-adr-0014).

## 7. Meeting the quality requirements

This section explains how the architecture is intended to meet the PDD's
performance, accessibility, and environment requirements. Estimates
support the design choice; measurements and acceptance checks establish
whether the implementation meets the requirements.

### Source requirements

| Reference | Subject |
|---|---|
| [PDD §9](pdd.md#9-product-quality-bars) | Product quality requirements and reference test conditions. |
| [PDD D-9](pdd.md#1-decision-register) | Numeric performance and payload budgets. |
| [PDD D-16](pdd.md#1-decision-register) | Browser and mobile baseline. |
| [PDD D-17](pdd.md#1-decision-register) | Accessibility conformance target. |
| [NFR-3](prd.md#nfr-3-responsive-interaction) | Responsive interaction. |
| [NFR-4](prd.md#nfr-4-supported-environments) | Supported environments. |
| [NFR-5](prd.md#nfr-5-accessibility) | Accessibility and resilience. |
| [DR-6](prd.md#dr-6-payload-and-interaction-support) | Payload and interaction support. |

### 7.1 Performance estimates and verification

The following table identifies each budget, the architectural approach
intended to meet it, and the evidence still required.

| Budget | Architectural approach | Estimate and required verification |
|---|---|---|
| Initial application data ≤ 4 MB compressed | Compact simulation records, pre-compressed before publication, with small metadata and coefficient files. | Candidate scenario encodings have measured compressed sizes of approximately 0.84–1.07 MB. Measure the complete selected export, including its metadata and supporting runtime data. |
| First meaningful render ≤ 2.0 seconds with an empty cache at 10 Mbps | Load a small application bundle and compressed data; decode the data; calculate the initial scenario; render its first measurement panel and statistics. | Approximately 1.0–1.25 MB of total initial resources would require roughly 0.8–1.0 seconds of transfer at the nominal connection rate, excluding latency and processing. End-to-end compliance is not yet established. |
| Repeat-visit render ≤ 1.0 second with a warm cache | Reuse previously downloaded application and data files where the browser cache permits. | Measure loading, decompression, initialization, calculation, and rendering on a repeat visit. Cached downloads do not eliminate these processing costs. |
| Scenario change → updated results ≤ 200 ms at the 95th percentile | Filter compact arrays, calculate the selected statistics, and update only the affected displays. | Measure the complete update, including percentile calculation, diagnostics where applicable, and rendering. Include the full-ensemble scenario and other representative workloads. |

#### What the payload measurement includes

The data budget includes all data required to produce the initial
scenario result: the scenario artifact, artifact manifest, regression
export, and any other data loaded initially.

The end-to-end loading measurement also includes the page, application
JavaScript, stylesheets, and other resources needed to display that
result.

Reference results are inputs to tests, not normal browser operation, and
must not be downloaded by the page. Optional field data and media should
not delay the initial simulation result.

#### What the timing measurement includes

First meaningful render means the initial scenario's first measurement
chart and statistics are available for interpretation. A heading,
loading indicator, or empty application shell does not satisfy it.

Interaction timing starts with an accepted scenario change and ends
when the corresponding results are visibly updated. If calculation is
scheduled or moved to background execution, that delay remains part of
the measured interval.

The DDD defines the benchmark procedure, representative scenarios,
repetition count, and measurement instrumentation under the PDD's
reference conditions. The results must identify the tested browser,
device, application version, and data vintage.

If measurements fail a budget, the design must be optimized and measured
again. The budget must not be treated as satisfied merely because the
data size or one calculation step appears small enough.

References:

- [PDD §9.1 — Performance budgets](pdd.md#91-performance-budgets-d-9-proposed).
- [§5.2 — Simulation data organization](#52-simulation-data-organization-adr-0013).
- [§5.3 — Records rather than precomputed summaries](#53-records-rather-than-precomputed-summaries-adr-0013).
- [§10 — Risks and open dependencies](#10-risks-and-open-dependencies).

### 7.2 Accessibility and supported environments

The accessibility target is WCAG 2.2 Level AA for the product's new
pages. The following architectural provisions support that target;
they do not replace accessibility testing.

#### Controls and navigation

Controls use native HTML elements where suitable. Custom controls must
implement the relevant keyboard and accessibility behavior, not merely
add ARIA roles or attributes.

Focus must remain visible and predictable as controls, panels, and
notices update. Essential information must not depend on hover or color
alone.

The layout must remain usable at the PDD's 360 CSS-pixel viewport
baseline and under the resizing and reflow conditions required by the
accessibility target.

#### Charts and text alternatives

Each measurement panel provides a real HTML statistics table, regardless
of whether its chart is displayed.

Charts also need a meaningful text alternative. The DDD must define how
users obtain the distribution information needed to interpret the
chart, including information not captured by summary statistics alone.
This may use a concise description, an accessible distribution table,
or another equivalent presentation.

Scarp-type displays retain text identification alongside the canonical
colors.

#### Notices and result updates

Important status changes must be available to assistive technology
without requiring users to discover them visually.

Live-region announcements must be selective. The application should
announce a concise result status or important error rather than read
every changing table cell or repeatedly announce unchanged caveats.

The DDD defines announcement behavior and focus management for loading,
successful updates, invalid inputs, empty results, and failures.

#### Browser compatibility

The implementation must support the browser and mobile versions defined
in PDD §9.2.

The DDD verifies the required APIs and build output against that
baseline. A general language-level label such as “ES2020 or later” is
not sufficient evidence that every API or generated script is supported.

Accessibility and compatibility checks must exercise the rendered
application, including keyboard interaction and representative
assistive-technology use. Calculation tests alone do not establish
compliance.

References:

- [PDD §9.2 — Browser and mobile baseline](pdd.md#92-browser-and-mobile-baseline-d-16-proposed).
- [PDD §9.3 — Accessibility target](pdd.md#93-accessibility-target-d-17-proposed).
- [NFR-5 — Accessibility](prd.md#nfr-5-accessibility).
- [FR-G2 — Scarp-type colors and identification](prd.md#fr-g2-scarp-type-colors-and-identification).

### 7.3 Delivery and caching

#### Content-hashed assets

The application bundle, stylesheet, and data files have content-hashed
filenames. A changed file receives a new address; an existing address
must not be reused for different contents.

This allows cached files to remain associated with a specific version.
It does not guarantee that the browser will retain them or avoid
revalidation requests.

The implementation must measure the response headers and actual cache
behavior on the published site. Warm-cache performance must not depend
on cache settings that the hosting arrangement cannot provide.

#### Pre-compressed simulation data

The scenario artifact is compressed before upload and publication. The
browser retrieves that compressed file from the published site and
decompresses it using the built-in DecompressionStream API.

The DDD verifies support for the selected compression format throughout
the supported browser baseline. It also specifies the file-serving and
decoding arrangement so that HTTP content decoding and application
decompression do not conflict.

Pre-compression makes the stored download compact without relying on
the host to compress the binary data during transfer. The final
download size and decompression cost must be measured for the selected
encoding.

A repeat visit may still need to decompress and initialize cached data.
Those costs remain part of the repeat-visit render budget.

#### Existing-site integration

The scenario page remains a MkDocs page and participates in the site's
navigation, search, and strict build.

The existing dashboards, citation material, and deployment must remain
functional. The intended changes are:

- new product pages and navigation entries;
- the application build job;
- retrieval and verification of the pinned data vintage;
- workflow triggers covering application and manifest changes;
- page-specific script loading and navigation-lifecycle integration;
  and
- the glossary additions required by the PDD.

Site-regression checks must verify that these additions do not disrupt
existing functionality.

References:

- [§4.3 — Language, toolchain, and repository structure](#43-language-toolchain-and-repository-structure-adr-0011).
- [§5.4 — Pinned, versioned artifacts](#54-pinned-versioned-artifacts-adr-0014).
- [§8 — Site integration](#8-site-integration).
- [NFR-7 — Build and data-quality gates](prd.md#nfr-7-build-and-data-quality-gates).
- [PDD §5.11 — Labels, units, and glossary links](pdd.md#511-labels-units-and-glossary-links-fr-g3-cr-3-cr-7).

## 8. Site integration

Ground Rupture Explorer joins the existing site's navigation, page
structure, build, and deployment process. It does not introduce a
separate website or deployment channel.

### Source requirements

| Reference | Subject |
|---|---|
| [PDD §2](pdd.md#2-product-structure-and-navigation) | Product structure and navigation. The site entry point is recorded in D-2, decided 2026-10-28. |
| [NFR-2](prd.md#nfr-2-static-site-hosting) | Static-site hosting within the existing project website. |
| [FR-G4](prd.md#fr-g4-citation-disclaimer-and-version-information) | Citation, disclaimer, and version information. |
| [DR-2](prd.md#dr-2-versioned-exports) | Identifiable versions for application data exports. |
| [NFR-7](prd.md#nfr-7-build-and-data-quality-gates) | Build validation and preservation of existing site functionality. |

### Navigation

A top-level **Scenario explorer** entry appears after Dashboards in
`subprojects/mkdocs/mkdocs.yml`, following the entry-point decision
recorded in PDD D-2.

When their delivery priorities are reached:

- the morphology and measurement-explanation pages join the site's
  explanatory section in P2; and
- Contact joins last in P3.

References:

- [PDD §2.2 — Entry point, decided 2026-10-28](pdd.md#22-entry-point-d-2-decided-2026-10-28).
- [PDD decision register — D-2, site entry point](pdd.md#1-decision-register).

### Scenario page and generated assets

The scenario page is a Markdown page under
`subprojects/mkdocs/docs/`. Its source contains:

- explanatory and fallback content that remains available when the
  application cannot run; and
- an application mount point: the page element into which the
  application renders its interactive interface.

The build prepares a dedicated assets directory containing:

- the generated application bundle and stylesheet; and
- the data files retrieved and verified using the committed pointer
  manifest.

These generated and retrieved files are not committed to Git. Local
builds prepare the same files in gitignored locations for
`mkdocs serve`.

The build supplies the page with the content-hashed asset references.
The DDD defines the exact paths and the mechanism for inserting those
references.

Page-specific loading and integration with Material's instant navigation
follow the lifecycle contract in §4.3.

References:

- [§4.3 — Language, toolchain, and repository structure](#43-language-toolchain-and-repository-structure-adr-0011).
- [§5.4 — Pinned, versioned artifacts](#54-pinned-versioned-artifacts-adr-0014).
- [§6.1 — Failure honesty](#61-failure-honesty-adr-0010).

### Software and data versions

The product footer and every download identify two distinct versions:

- **Software version:** the product release version, recorded in the
  application at build time.
- **Data-export version:** the version of the data used to calculate
  the displayed or downloaded result.

The build records the expected data-export version from the committed
pointer manifest. At runtime, the application reads the loaded
data-export version from the artifact manifest and verifies that it
matches the expected version.

A mismatch stops calculation and produces the explicit failure state
defined in §6.1. The application must not label a result with the
expected version without verifying the data actually loaded.

The build and browser must not select a software or data version by
looking up the latest available release. The DDD defines the software
version source and the mechanics for passing the expected data version
into the application.

References:

- [FR-G4 — Citation, disclaimer, and version information](prd.md#fr-g4-citation-disclaimer-and-version-information).
- [DR-2 — Versioned exports](prd.md#dr-2-versioned-exports).
- [PDD §7.2 — Version display and notice](pdd.md#72-version-display-and-notice-d-15-proposed).
- [§5.4 — Artifact and pointer manifests](#54-pinned-versioned-artifacts-adr-0014).
- [§6.1 — Failure honesty](#61-failure-honesty-adr-0010).

### Build and deployment checks

The scenario page participates in the existing strict MkDocs build.
Internal links and other site content remain subject to the repository's
existing validation rules.

Workflow triggers must cover application source, the pointer manifest,
and the other build inputs identified in §4.3. In particular:

- application changes trigger application tests and site validation;
- pointer-manifest changes trigger retrieval and verification of the
  selected data vintage, calculation-comparison tests, and site
  validation; and
- accepted changes deploy through the existing workflow after merging
  to `main`.

Validation must cover the assembled site, including the generated
application assets and retrieved data files, rather than only the
Markdown source.

A failed application build or a failed data retrieval fails the site
build, and a failed run must not replace the working published site.

References:

- [NFR-7 — Build and data-quality gates](prd.md#nfr-7-build-and-data-quality-gates).
- [CI triggers and validation](#ci-triggers-and-validation).
- [§9 — Testing and release architecture](#9-testing-and-release-architecture).

## 9. Testing and release architecture

Verification covers the pipeline, exported files, application
calculations, browser integration, and assembled site. Automated checks
and human acceptance reviews have different responsibilities; neither
replaces the other. The closing subsections give the release process:
the data-refresh and deployment sequence, software-release data
attachments, and rollback.

### Source requirements

| Reference | Subject |
|---|---|
| [NFR-7](prd.md#nfr-7-build-and-data-quality-gates) | Build and data-quality gates. |
| [DR-1](prd.md#dr-1-controlled-data-source) | Controlled data sources and reference calculations. |
| [DR-3](prd.md#dr-3-one-state-per-trial-population) | One-state-per-trial population selection. |
| [DR-4](prd.md#dr-4-measurement-hygiene) | Missing, negative, and low-slip measurement policies. |
| [DR-5](prd.md#dr-5-field-data-preparation) | Field-data normalization and provenance. |
| [PDD SC-3](pdd.md#101-success-criteria) | Numerical correctness. |
| [PDD SC-4](pdd.md#101-success-criteria) | Performance within the budgets under the reference conditions. |
| [PDD SC-5](pdd.md#101-success-criteria) | Candor: caveats present in the default view of any result they apply to. |
| [PDD SC-6](pdd.md#101-success-criteria) | Preservation of existing site functionality and deployment. |
| [PDD SC-7](pdd.md#101-success-criteria) | Research-group approval of the reader-facing texts. |
| [R-17](prd.md#94-delivery-and-technical-risks) | CI cannot regenerate the research data from local-only inputs. |
| [R-18](prd.md#94-delivery-and-technical-risks) | The application shares the existing site's build and deployment. |
| [PDD §10](pdd.md#10-acceptance-and-success) | Acceptance scenarios and success criteria. |

### Pipeline and export tests

Pipeline tests reside in `subprojects/python/tests` and run through
pytest.

They verify:

- product views and population-selection rules;
- missing-value and other approved measurement policies;
- field-name normalization and source preservation;
- export encoding and decoding; and
- generation of the golden-scenario reference results.

Tests use two kinds of input:

| Input | Where checks run | Purpose |
|---|---|---|
| Small committed fixtures | Local development and CI. | Exercise calculation rules, export formats, and edge cases without the raw research datasets. |
| Full research datasets | The owner's local export process. | Verify the actual ensemble, exported values, and reference results before publication. |

Every data refresh must pass the full-data checks before its files can
be uploaded. These include the expected ensemble dimensions, absence
of ties at each trial's maximum slip, and the complete export round
trip described in
[§5.6](#56-reference-results-and-verification-adr-0015).

Required full-data checks must fail the export task if their inputs are
missing or a check fails. The task must not treat a skipped check as
successful verification.

Checks that the published artifact alone supports — the structural
validation defined under the webapp tests below — are repeated in CI.
CI cannot independently repeat comparisons that require the local
source views.

References:

- [§5.6 — Reference results and verification](#56-reference-results-and-verification-adr-0015).
- [DR-3 — One-state-per-trial population](prd.md#dr-3-one-state-per-trial-population).
- [DR-4 — Measurement hygiene](prd.md#dr-4-measurement-hygiene).
- [DR-5 — Field-data preparation](prd.md#dr-5-field-data-preparation).
- [PDD §10.2 — Golden scenarios](pdd.md#102-golden-scenarios).

### Webapp tests — Node on CI

A dedicated webapp job in `tests.yml` runs automated tests in Node,
without a browser. The job fetches the files pinned by the committed
pointer manifest and verifies their checksums before any test runs
([§5.4](#54-pinned-versioned-artifacts-adr-0014)).

#### Calculation parity

The core Python implementation owns the scientific and statistical
rules, including filtering semantics, population selection,
measurement handling, conversion, and summary statistics. Python tests
verify those rules.

Webapp calculation tests — the **parity harness** of
[ADR-0015](../adr/0015-golden-scenario-parity.md) — establish parity:
the application must
reproduce the independently calculated pipeline reference results.
They do not define a separate set of expected scientific or statistical
answers.

The tests evaluate every golden scenario
([PDD §10.2](pdd.md#102-golden-scenarios) Golden scenarios) using the
pinned scenario artifact and reference-results export. Following the
comparison rules of
[§5.6](#56-reference-results-and-verification-adr-0015), they compare:

- selected records, their scarp-type classes, counts, and range flags
  exactly;
- calculated statistics and converted slip windows within the defined
  per-calculation tolerances; and
- reader-facing values exactly after the prescribed display rounding.

When a calculation edge case needs additional coverage, its expected
behavior is established and tested in Python, then included in the
reference cases exercised by the webapp.

#### Application-specific tests

Separate tests verify responsibilities that belong to the webapp rather
than the scientific calculation code:

- artifact decoding and **structural validation** — the decoded
  artifact matches the artifact manifest's declared dimensions,
  dictionaries, and null sentinels;
- handling of mismatched versions or malformed data;
- scenario-state validation — rejecting settings outside the permitted
  values of the [§6](#6-application-architecture) scenario-state
  model; and
- URL encoding and restoration when sharing ships in
  [P2](prd.md#22-mvp-and-delivery-priorities).

These tests do not establish browser rendering, navigation, or
accessibility correctness. Those are checked by the locally invoked
browser tests and during release acceptance.

References:

- [ADR-0015 — Golden-scenario references and a pipeline↔client parity
  harness](../adr/0015-golden-scenario-parity.md).
- [§5.4 — Pinned, versioned artifacts](#54-pinned-versioned-artifacts-adr-0014).
- [§5.6 — Reference results and verification](#56-reference-results-and-verification-adr-0015).
- [PDD §10.1 — Success criteria](pdd.md#101-success-criteria).
- [PDD §10.2 — Golden scenarios](pdd.md#102-golden-scenarios).

### Browser tests — locally invoked release checks

An explicitly invoked script runs automated browser tests against the
locally assembled site. The tests execute on a developer machine, not
in CI, and are required before release. The lane runs in one evergreen
browser engine
([ADR-0015](../adr/0015-golden-scenario-parity.md), second amendment
of 2026-10-29).

The script drives the browser, performs user actions, and checks the
results. It must not depend on a person manually following a list of
clicks.

The tests verify that:

- product pages render correctly, including controls, charts, tables,
  notices, and fallback content;
- direct visits and site navigation initialize the application
  correctly, and the application replaces the fallback presentation
  only once its interactive content is ready
  ([§6.1](#61-failure-honesty-adr-0010));
- leaving and returning to the scenario page does not duplicate
  controls, event handlers, or result updates;
- the scripted interactions of the DDD's test inventory each produce
  the response the PDD defines for them — scenario changes,
  offset-mode entry and its flags, notices, and downloads;
- at least one golden scenario is evaluated end to end, and every
  displayed value equals the display-rounded reference result exactly
  ([PDD SC-3](pdd.md#101-success-criteria));
- the same starting state and action sequence produce identical
  scenario settings and displayed results on every run;
- scenario summaries, charts, tables, and downloads describe the same
  active scenario;
- each [§6.1](#61-failure-honesty-adr-0010) state appears when its
  condition holds — invalid or out-of-range input, no data for the
  selected scenario, unavailable browser capabilities, and internal
  failure — without being confused with one another;
- the automatable accessibility checks pass; and
- keyboard interaction and responsive layouts behave as
  [PDD §9.2](pdd.md#92-browser-and-mobile-baseline-d-16-proposed),
  [PDD §9.3](pdd.md#93-accessibility-target-d-17-proposed), and
  [§7.2](#72-accessibility-and-supported-environments) specify.

These tests verify browser integration and user-visible behavior.
Calculation correctness is established by the Python tests and the
parity harness; browser tests use those reference results for their
numerical assertions.

The script must report failed checks and return a nonzero exit status
when any check fails. The DDD names the browser-testing tool, the test
inventory, and the rendering assertions.

References:

- [ADR-0015 — Golden-scenario references and a pipeline↔client parity
  harness](../adr/0015-golden-scenario-parity.md).
- [§4.3 — Language, toolchain, and repository
  structure](#43-language-toolchain-and-repository-structure-adr-0011).
- [§6.1 — Failure honesty](#61-failure-honesty-adr-0010).
- [§7.2 — Accessibility and supported
  environments](#72-accessibility-and-supported-environments).
- [PDD §10.2 — Golden scenarios](pdd.md#102-golden-scenarios).

### Site validation

The strict MkDocs build validates the assembled site, including generated
application assets and retrieved data files.

Workflow triggers cover all relevant inputs identified in
[§4.3](#43-language-toolchain-and-repository-structure-adr-0011), not
only Markdown changes. Application changes and pointer-manifest changes
must run the applicable tests and site validation before merge.

Site validation performs §6.2's media-permission release check: media
without publication permission is absent from the publication output
([§6.2](#62-media-architecture-adr-0012)).

Deployment remains restricted to `main`, following
[ADR-0009](../adr/0009-github-pages-hosting.md).

References:

- [ADR-0009 — GitHub Pages (via Actions) as site
  hosting](../adr/0009-github-pages-hosting.md).
- [§4.3 — Language, toolchain, and repository
  structure](#43-language-toolchain-and-repository-structure-adr-0011).
- [§6.2 — Media architecture](#62-media-architecture-adr-0012).
- [§8 — Site integration](#8-site-integration).

### Acceptance and release checks

Before release, human reviewers execute the PDD's walkthroughs for
[US-1](prd.md#us-1-dam-foundation-scenario) (Dam foundation scenario),
[US-2](prd.md#us-2-pipeline-crossing) (Pipeline crossing), and
[US-3](prd.md#us-3-design-review) (Design review) against the golden
scenarios ([PDD §10.3](pdd.md#103-acceptance-walkthroughs) Acceptance
walkthroughs).
[US-4](prd.md#us-4-interpreting-observed-deformation) (Interpreting
observed deformation) and
[US-5](prd.md#us-5-teaching-surface-rupture-morphology) (Teaching
surface-rupture morphology) join acceptance when their P2 capabilities
ship.

Acceptance also verifies:

- every applicable caveat is present in the default view of any result
  it applies to, never relegated to footnotes, and the population name
  is always visible in the scenario summary with its explainer one
  action away ([PDD SC-5](pdd.md#101-success-criteria) candor);
- the existing dashboards, navigation, citation pages, and deployment
  process are unaffected by the release
  ([PDD SC-6](pdd.md#101-success-criteria) site integrity);
- keyboard and accessibility behavior meet the defined target
  ([PDD §9.3](pdd.md#93-accessibility-target-d-17-proposed));
- performance meets the budgets under the defined reference conditions
  ([PDD SC-4](pdd.md#101-success-criteria);
  [§7.1](#71-performance-estimates-and-verification)); and
- the research group has approved the reader-facing texts
  ([PDD SC-7](pdd.md#101-success-criteria) scientific sign-off;
  [PDD §5](pdd.md#5-copy-deck) Copy deck).

The DDD defines test procedures and coverage. The implementation plan
schedules the checks and assigns their execution.

References:

- [PDD §10.1 — Success criteria](pdd.md#101-success-criteria).
- [PDD §10.3 — Acceptance walkthroughs](pdd.md#103-acceptance-walkthroughs).
- [PRD §4 — User stories](prd.md#4-user-stories).
- [§7 — Meeting the quality requirements](#7-meeting-the-quality-requirements).

### Data refresh and deployment

A data refresh follows this sequence:

1. The owner runs the local export task and its required full-data checks.
2. The task produces the data files, reference results, artifact
   manifest, and pointer manifest.
3. The owner uploads the verified files to the vintage's data release.
4. The export task verifies that the uploaded files match the
   generated checksums
   ([§5.4](#54-pinned-versioned-artifacts-adr-0014)).
5. The owner commits the updated pointer manifest and opens a pull
   request.
6. CI retrieves the pinned files, verifies their checksums, runs the
   fixture-based pipeline tests, the parity harness, and the
   application-specific tests, and validates the assembled site.
7. Before the merge that releases the change, the owner runs the
   browser tests against the locally assembled site and the acceptance
   checks of this section — a data refresh changes the product, so
   these release checks apply
   ([PDD §9.4](pdd.md#94-releases) Releases).
8. After approval and merge to `main`, CI builds the application,
   retrieves and verifies the pinned data, builds the site, and deploys
   it to GitHub Pages.

A software-only change uses the currently pinned data vintage unless
the change explicitly requires a new one. It does not regenerate or
republish research data merely because application code changed.

The displayed software version changes with a software release. The
displayed data-export version changes with a data refresh, following
[PDD §9.4](pdd.md#94-releases).

References:

- [§5.4 — Pinned, versioned artifacts](#54-pinned-versioned-artifacts-adr-0014).
- [PDD §9.4 — Releases](pdd.md#94-releases).

### Software-release data attachments

When the owner publishes a software release, its data attachments must
follow the distribution arrangement described in
[§5.4](#54-pinned-versioned-artifacts-adr-0014) and
[`notes/Roadmap.md`](../../notes/Roadmap.md#decisions-made), including
the current application exports and the dashboard plotting CSVs.

Attached application exports must be the same verified files identified
by that release's committed pointer manifest, not newly generated or
independently selected files.

The DDD defines whether attachment is manual or automated. Permission
and archival requirements remain governed by
[§5.4](#54-pinned-versioned-artifacts-adr-0014).

References:

- [§5.4 — Pinned, versioned artifacts](#54-pinned-versioned-artifacts-adr-0014).
- [`notes/Roadmap.md` — Decisions made](../../notes/Roadmap.md#decisions-made).

### Rollback

Rollback restores a known compatible combination of application code,
pointer manifest, and retained data files.

A data-only rollback may revert the pointer-manifest change if the
application supports the earlier data format. A release that changes
both application code and data may require reverting both.

The normal verification and deployment checks also apply to rollback.
It must not bypass checksum validation or silently substitute another
vintage.

References:

- [§5.4 — Pinned, versioned artifacts](#54-pinned-versioned-artifacts-adr-0014).

## 10. Risks and open dependencies

This section records the architectural response to the risks identified
in the PRD. It does not replace
[PRD §9 — Dependencies and risks](prd.md#9-dependencies-and-risks).

A mitigation described here is not evidence that a risk has been
eliminated. Performance claims require measurements; release
dependencies require completion or a documented interim rule.

### Performance and delivery risks

| Risk / dependency | Architectural response | Remaining action / owner |
|---|---|---|
| [R-16](prd.md#94-delivery-and-technical-risks) — filtering freedom versus payload size | Deliver individual records in a compact representation rather than restrict the supported scenario combinations. Candidate encodings have measured compressed sizes of approximately 0.84–1.07 MB. | Measure the complete selected export and end-to-end loading and interaction performance under the PDD's reference conditions. Architectural feasibility remains provisional until these checks pass — owner. |
| [R-17](prd.md#94-delivery-and-technical-risks) — CI cannot rebuild the research data | Generate and verify data locally. Store versioned exports as release assets, selected by a committed pointer manifest. CI retrieves and verifies those exact files. | Ensure every publication runs the required full-data checks and generates the reference results. CI cannot independently repeat source-data comparisons — owner. |
| [R-18](prd.md#94-delivery-and-technical-risks) — changes can affect the existing site | Add product pages within the existing site and validate the assembled publication before deployment. Application builds and pinned-data retrieval become dependencies of the site build. | Run site-regression checks and locally invoked browser tests before release. A failed application build or data retrieval must fail deployment without replacing the working published site ([§8](#8-site-integration)) — owner. |
| [R-19](prd.md#94-delivery-and-technical-risks) — static-site feasibility | Perform scenario filtering and calculations in the browser without a backend. | Confirm that this implementation meets the performance and browser requirements. The automated browser lane exercises one evergreen engine ([§9](#9-testing-and-release-architecture)); confirming the remaining engines and the mobile floor of the [PDD §9.2 — Browser and mobile baseline](pdd.md#92-browser-and-mobile-baseline-d-16-proposed) is part of this check. Backend independence is established by the design; acceptable performance is not yet established — owner. |
| Node.js, TypeScript, and esbuild maintenance | Pin tool versions and dependencies, expose commands through Gradle, and run validation in CI. | Maintain the toolchain and review upgrades under [ADR-0011](../adr/0011-webapp-toolchain.md) — owner. |
| Builds depend on retained release assets | Retrieve only the files identified by the committed pointer manifest and verify their checksums before use. | Retain the earlier vintages needed for historical builds and rollback. Define recovery and withdrawal procedures; restore compatible code and data together when necessary — owner. |

The feasibility measurements must cover the complete sequence of
operations defined in
[§7.1](#71-performance-estimates-and-verification), not only
decompression or percentile sorting in isolation.

References:

- [PRD §9 — Dependencies and risks](prd.md#9-dependencies-and-risks).
- [§5.4 — Pinned, versioned artifacts](#54-pinned-versioned-artifacts-adr-0014).
- [§7.1 — Performance estimates and verification](#71-performance-estimates-and-verification).
- [§8 — Site integration](#8-site-integration).
- [§9 — Testing and release architecture](#9-testing-and-release-architecture).

### Data rights and archival distribution

Permission to distribute the derived exports must be confirmed before
their first public upload. Storing them outside Git, or attaching them
separately from Apache-2.0 application code, does not itself establish
permission to redistribute them.

The owner, with the research group, must:

- confirm the applicable terms for the DesignSafe simulation deposits,
  FDHI, and SURE;
- record the cleared redistribution position and final license wording
  for the Kern County compilation;
- define the notices and attribution accompanying each data vintage;
- preserve the release-distribution arrangement recorded in
  [`notes/Roadmap.md` — Decisions made](../../notes/Roadmap.md#decisions-made);
- decide how the processed data will be deposited and preserved in
  Zenodo, including its relationship to the software record; and
- update the README, `LICENSE-docs`, site footer, and archival metadata
  so they distinguish application code, raw inputs, and distributed
  derived data accurately.

As recorded in
[`notes/Roadmap.md` — Decisions made](../../notes/Roadmap.md#decisions-made),
the Zenodo GitHub integration archives only the tag's source archive;
release assets are not picked up. Until a dataset record exists,
published data vintages have no archival copy. The archival
procedure must verify what files are actually preserved.

References:

- [NFR-6 — Licensing](prd.md#nfr-6-licensing).
- [`docs/datasets.md` — Input datasets and derived views](../datasets.md).
- [`notes/Roadmap.md` — Decisions made](../../notes/Roadmap.md#decisions-made).
- [Licensing and archival distribution](#licensing-and-archival-distribution).

### Scientific and content dependencies

The following dependencies do not currently prevent selection of the
architecture. They may nevertheless block a capability or public
release until resolved or covered by a documented interim rule.

| Dependency | Architectural response | Decision owner |
|---|---|---|
| [D-6](pdd.md#1-decision-register) — Kern County field-data group and principal-width rule | Preserve source distinctions and withhold the Kern County worked-example preset until the research group supplies its field-data group and principal-width rule; the walkthrough itself is already specified ([PDD §4.7 — Kern County worked example](pdd.md#47-kern-county-worked-example-fr-o6-d-6-open)). | Research group. |
| [D-8](pdd.md#1-decision-register) — animation coverage required for public release | Represent availability explicitly in the media index; do not imply complete coverage. | Research group. |
| [D-10](pdd.md#1-decision-register) — liability-limitation text referenced by [CR-4 — Standing disclaimer](prd.md#cr-4-standing-disclaimer) | Keep the release dependency explicit; no placeholder liability text may ship. | Product owner. |
| [D-20](pdd.md#1-decision-register) — Us − Ud as a fourth displayed measurement | The stage arrays carry no uplift fields ([§5.2](#52-simulation-data-organization-adr-0013)); enabling the reserved fourth panel requires a pipeline export change and a new data vintage. The current artifact does not block the MVP. | Owner + research group. |
| [R-1](prd.md#91-scientific-and-data-dependencies) — scarp-dip correction | Keep showing the recorded provisional-data notice ([FR-O4 — Scarp-dip data caveat](prd.md#fr-o4-scarp-dip-data-caveat)) until corrected data or rules are supplied. | Research group. |
| [R-2](prd.md#91-scientific-and-data-dependencies) — detailed cohesion-profile definitions | Do not enable the affected advanced controls before definitions are approved. | Research group. |
| [R-3](prd.md#91-scientific-and-data-dependencies) — low-slip measurement treatment | Apply the recorded interim policy without inventing a validity boundary. | Research group. |
| [R-12](prd.md#93-content-and-media-dependencies) — photograph permissions | Exclude unapproved files from the published site, not merely from page rendering. | Research group supplies permission records; build enforces exclusion. |
| [R-15](prd.md#93-content-and-media-dependencies) — repository URLs | Publish links only after approved URLs are supplied. | Research group. |

References:

- [PDD §1 — Decision register](pdd.md#1-decision-register).
- [PRD §9.1 — Scientific and data dependencies](prd.md#91-scientific-and-data-dependencies).
- [PRD §9.3 — Content and media dependencies](prd.md#93-content-and-media-dependencies).

### Future 3D data

The current artifact represents the published 2D ensemble. It carries a
model-family identifier, and the decoding boundary must not make the
current 101-stage layout a permanent requirement for all future data.

The design does not yet prescribe the 3D format, loading strategy, or
number of files. Those decisions require the future dataset's actual
structure and size.

References:

- [DR-7 — Future 3D compatibility](prd.md#dr-7-future-3d-compatibility).
- [§5.2 — Simulation data organization](#52-simulation-data-organization-adr-0013).

---

## 11. Decision records

The ADRs are the authoritative architecture decision records.
[Chapter 1](#1-architecture-decisions) provides their index; this HLDD
explains how the decisions fit together.

The six decisions supporting this design are:

- **[ADR-0010](../adr/0010-native-client-side-scenario-app.md):**
  the client-side application, implementation choices for product
  surfaces, shared-link state in P2, and failure handling.
- **[ADR-0011](../adr/0011-webapp-toolchain.md):**
  TypeScript type checking, esbuild, framework-free implementation,
  direct SVG chart rendering, and the Gradle webapp subproject.
- **[ADR-0012](../adr/0012-product-data-exports.md):**
  the scenario artifact, field export, regression export, reference
  results, and P2 media index.
- **[ADR-0013](../adr/0013-row-level-scenario-artifact.md):**
  row-level, trial-major, columnar simulation data and browser-side
  scenario calculations.
- **[ADR-0014](../adr/0014-committed-content-hashed-artifacts.md):**
  release-asset storage, the committed pointer manifest, verified
  retrieval, and content-hashed, pre-compressed publication.
- **[ADR-0015](../adr/0015-golden-scenario-parity.md):**
  export-integrity checks, independently calculated Python reference
  results, application calculation-parity tests, and the
  pipeline-supplied offset-to-slip conversion coefficients.

The six ADRs entered review as Proposed and are Accepted
(2026-10-28), incorporating the amendments agreed during review. The
status recorded in each ADR is authoritative.

The ADRs and this HLDD must agree before approval is complete. After
acceptance, architectural changes follow the repository's ADR process;
the DDD and implementation plan do not silently override an accepted
decision.

The conflicting “Kern County is red” statement in
[ADR-0007](../adr/0007-dashboard-design-conventions.md) must also be
resolved through that process. Its correction must align the decision
record with the accepted field-data color convention without reopening
the palette decision.

References:

- [§1 — Architecture decisions](#1-architecture-decisions).
- [Architecture Decision Records](../adr/README.md).
- [NFR-8 — Architecture decision record](prd.md#nfr-8-architecture-decision-record).
- [ADR-0007 — Dashboard design conventions](../adr/0007-dashboard-design-conventions.md).
- [Visual identity — the one system all dashboards follow](../dashboards/visual-identity.md).

---

## 12. Scope of the following documents

This HLDD establishes architectural decisions and responsibilities. It
does not specify every implementation detail or schedule the work.

### Detailed design document

The DDD specifies:

- exact binary layouts, scales, dictionaries, and null representations;
- artifact-manifest, pointer-manifest, and export schemas;
- module interfaces and repository structure;
- implementation algorithms for decoding, filtering, population
  selection, statistics, offset-to-slip conversion, chart preparation,
  and URL encoding;
- the exact CI workflow paths and job dependencies;
- asset paths and version-stamp mechanisms;
- calculation tolerances and application parity-test cases;
- the performance-benchmark procedure, representative scenarios,
  repetition count, and measurement instrumentation of
  [§7.1](#71-performance-estimates-and-verification), and the
  measured-size reporting of
  [§5.2](#52-simulation-data-organization-adr-0013);
- the browser-testing tool, test inventory, scripts, coverage, and
  rendering assertions;
- accessibility and navigation-lifecycle implementation;
- error-state presentation using the messages specified in the PDD; and
- publication, retention, recovery, and withdrawal procedures.

These specifications implement the rules already established by the
product documents and core Python implementation. The DDD must not
independently redefine scientific or statistical behavior.

If detailed design reveals a missing product decision or a necessary
architectural change, that decision must be resolved in the appropriate
document or ADR before dependent work proceeds.

### Implementation plan

The implementation plan defines ordered tasks, dependencies,
milestones, effort, acceptance checks, and the release sequence.

It serves as the coding agent's execution brief. It must contain enough
direction to implement the approved design without requiring the agent
to resolve product, scientific, architectural, or design questions.

### Authority retained elsewhere

- **PRD:** product requirements and scope.
- **PDD:** pages, controls, states, reader-facing text, and user-visible
  behavior.
- **ADRs:** accepted architectural decisions.
- **Core Python implementation and its tests:** implementation and
  verification of the approved scientific and statistical rules.
- **Research group:** scientific approvals and unresolved decisions
  assigned to it in the PDD register.

The HLDD introduces architectural constraints needed to implement the
product. It does not silently add user-facing capabilities or alter
approved scientific behavior.

References:

- [Product requirements document](prd.md).
- [Product definition document](pdd.md).
- [PDD §1 — Decision register](pdd.md#1-decision-register).
- [Architecture Decision Records](../adr/README.md).
