# ADR-0008: MkDocs Material for the companion site

- **Status**: Accepted
- **Date**: 2026-08-02
- **Deciders**: Michael Bouzinier (project owner)

## Context

The dashboards needed a home that reads as an **interactive companion to
the paper**: pages that embed the published dashboards, explain how each
maps to the paper's figures, define the domain vocabulary for
non-specialists, and document the data. Authorship is credited to the
paper's team (byline finalization pending with the lead author).

Constraints: the repo is public with an existing Python toolchain
([ADR-0002](0002-python-pipeline-shape-and-toolchain.md)); the paper
itself is **not open access**, so the site must quote sparingly with
citation and reproduce no typeset figures unless rights are granted
(placeholders mark where Figures 1, 2, 5 and 7 would sit); content must be
verifiable — quotes checked against the paper, numbers pinned by pipeline
tests ([ADR-0003](0003-duckdb-as-the-analytical-engine.md)).

## Decision

**MkDocs with the Material theme**, in `subprojects/mkdocs/`:

- The docs toolchain is a **`docs` Poetry group** of the python
  subproject — one lockfile for pipeline and site; CI installs
  `--only docs`.
- Builds run `--strict` with link/anchor validation promoted to warnings
  that fail the build — a glossary of ~40 anchored definitions is
  load-bearing, so a broken deep link is a build failure, not a shrug.
- Dashboards embed via the Tableau Embedding API v3 (`<tableau-viz>`),
  wrapped in a scale-to-fit shim (`tableau-fit.js`) sized for the
  ~800 px web variants ([ADR-0007](0007-dashboard-design-conventions.md));
  every embed carries a full-size fallback link.
- Material's `abbr`/snippets machinery auto-appends acronym tooltips
  site-wide from one include file.

## Alternatives considered

- **Sphinx (+ MyST)** — the scientific-Python standard; heavier
  authoring, and Material's reader UX (tooltips, admonitions, instant
  nav) fit a general-reader companion better.
- **Quarto** — excellent for computational documents, but its center of
  gravity is notebook-flavored publishing — the world this repo
  deliberately exiled ([ADR-0002](0002-python-pipeline-shape-and-toolchain.md)).
- **Jekyll / Hugo** — GitHub-native / fast, but no tie-in to the Python
  toolchain and weaker technical-docs ergonomics.
- **Hand-rolled HTML** — full control of embeds, unbounded maintenance.

## Consequences

- Site content is markdown in the repo, reviewed like code and versioned
  with the pipeline that produces its numbers.
- `mkdocs build --strict` is the site's test suite; it gates deployment
  ([ADR-0009](0009-github-pages-hosting.md)).
- The not-open-access constraint is a **content policy**, inherited by
  every future page: quote minimally with footnoted citations, link the
  DOI (`10.1177/87552930251346434`), no paper imagery without permission.
  The code and site text remain Apache-2.0/public per the repo's license.
- Embeds live or die with Tableau Public availability — the fallback
  links and the reproducible workbooks are the mitigation.

## References

- `subprojects/mkdocs/mkdocs.yml`, `EMBEDS.md`, `DEPLOY.md`
- `docs/` pages under `subprojects/mkdocs/docs/`
- Adversarial content review: 2026-08-04 (quotes, DOI, anchors, repo
  facts all verified)
