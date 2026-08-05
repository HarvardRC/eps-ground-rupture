# Architecture Decision Records

Each ADR captures one architecturally significant decision that is **live
today**: what we chose, what we rejected, and why. Format: lightweight MADR
(Context → Decision → Alternatives → Consequences).

ADRs are immutable going forward — a changed decision gets a new ADR and a
`Superseded by ADR-NNNN` note on the old one.

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
| [—](dead-ends.md)                                     | **Dead ends** — the retired 2026-05/06 architecture, as one story | Retrospective |

## Adding a new ADR

1. Pick the next number (`0010` is next).
2. Filename: `NNNN-short-kebab-title.md`.
3. Copy the structure of an existing ADR (or use MADR's template).
4. Add a row to this index.
5. If the new decision supersedes an older one, update the older ADR's
   status to `Superseded by ADR-NNNN`. (Don't repeat the 2026-08-05 mass
   rewrite for a single change — that was a one-time reset after a pivot.)
