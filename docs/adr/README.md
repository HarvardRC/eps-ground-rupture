# Architecture Decision Records

Each ADR captures one architecturally significant decision that is **live
today**: what we chose, what we rejected, and why. Format: lightweight MADR
(Context → Decision → Alternatives → Consequences).

ADRs are immutable going forward — a changed decision gets a new ADR and a
`Superseded by ADR-NNNN` note on the old one. An ADR may enter the index as
**Proposed** while under review and may be amended until it is accepted;
immutability starts at **Accepted**. From then on, a change to part of
an accepted decision is a dated amendment on that ADR, which stays
**Accepted**; when the change needs its own context and alternatives, a
new ADR records it as amending the old one, and the dated amendment
points to it.

**History note.** The original set (ADR-0001…0014, May–June 2026) described
a SQL-engine-first architecture that the pivot to Tableau Public made
largely obsolete. Rather than keep fourteen superseded stubs, the active
decisions were rewritten as the set below (2026-08-05) and the retired ones
became one narrative: **[Dead ends](dead-ends.md)** — which also maps every
old number to its fate. The originals remain in git history.

## Index

| #    | Title                                                | Status   |
|------|------------------------------------------------------|----------|
| [0001](0001-gradle-multi-project-build.md)            | Gradle multi-project build; code modules under `subprojects/` | Accepted |
| [0002](0002-python-pipeline-shape-and-toolchain.md)   | Python pipeline — modules + CLI, Poetry, no notebooks | Accepted |
| [0003](0003-duckdb-as-the-analytical-engine.md)       | DuckDB views as the single analytical engine | Accepted |
| [0004](0004-tableau-as-the-dashboard-platform.md)     | Tableau as the (only) dashboard platform     | Accepted |
| [0005](0005-tableau-public-as-the-publication-channel.md) | Tableau Public as the publication channel | Accepted |
| [0006](0006-csv-extracts-for-tableau-public.md)       | CSV exports feed the published workbooks     | Accepted |
| [0007](0007-dashboard-design-conventions.md)          | Dashboard design conventions (palette, web variants, interactivity) | Accepted |
| [0008](0008-mkdocs-material-companion-site.md)        | MkDocs Material for the companion site       | Accepted |
| [0009](0009-github-pages-hosting.md)                  | GitHub Pages (via Actions) as site hosting   | Accepted |
| [0010](0010-native-client-side-scenario-app.md)       | Ground Rupture Explorer: native client-side app; surface map | Accepted |
| [0011](0011-webapp-toolchain.md)                      | Webapp toolchain — TypeScript + esbuild, no framework, SVG charts | Accepted |
| [0012](0012-product-data-exports.md)                  | Purpose-built product exports feed the scenario app | Accepted |
| [0013](0013-row-level-scenario-artifact.md)           | Row-level, trial-major columnar scenario artifact | Accepted; amended by [0018](0018-manifest-defined-stage-count.md) |
| [0014](0014-committed-content-hashed-artifacts.md)    | Product artifacts in release assets, pinned by a committed manifest | Accepted; amended by [0019](0019-release-based-data-identity.md) |
| [0015](0015-golden-scenario-parity.md)                | Golden-scenario references; pipeline↔client parity harness | Accepted |
| [0016](0016-performance-reference-environment.md)     | Performance reference environment — an on-demand AWS VM defined by Terraform | Accepted |
| [0017](0017-unadvertised-prototype-before-public-release.md) | An unadvertised prototype deployment precedes the public release | Accepted |
| [0018](0018-manifest-defined-stage-count.md)          | Manifest-defined uniform stage count | Accepted; amends [0013](0013-row-level-scenario-artifact.md) |
| [0019](0019-release-based-data-identity.md)           | Release-based data identity | Accepted; amends [0014](0014-committed-content-hashed-artifacts.md) |
| [0020](0020-parallel-guided-explorer.md) | Parallel guided explorer over the shared scientific core | Decided for implementation candidate, 2026-11-04; owner review pending |
| [—](dead-ends.md)                                     | **Dead ends** — the retired 2026-05/06 architecture, as one story | Retrospective |

## Adding a new ADR

1. Pick the next number (`0021` is next).
2. Filename: `NNNN-short-kebab-title.md`.
3. Copy the structure of an existing ADR (or use MADR's template).
4. Add a row to this index.
5. If the new decision supersedes an older one, update the older ADR's
   status to `Superseded by ADR-NNNN`; if it amends part of one, add a
   dated amendment to the older ADR pointing to the new one and note
   the relation in both index rows. (Don't repeat the 2026-08-05 mass
   rewrite for a single change — that was a one-time reset after a pivot.)
