# ADR-0010: Ground Rupture Explorer is a native client-side application

- **Status**: Proposed
- **Date**: 2026-10-15 (drafted with the HLDD, `docs/app/hldd.md`)
- **Deciders**: Michael Bouzinier (project owner)

## Context

The PRD's central capability — combined filtering over several site
conditions at once, with statistics recomputed per scenario (PRD
§1.4–1.5) — is exactly what the five published dashboards cannot do,
so the scenario page cannot be served by linking to or embedding
Tableau. At the same time the host is a static site: GitHub Pages via
Actions ([ADR-0009](0009-github-pages-hosting.md)), deploy from `main`
only, and the PRD records a backend as infeasible for this host
(NFR-2, R-19). NFR-3 rules out a browser-side Python runtime or any
comparably heavy environment. FR-G5 requires a per-surface
implementation decision — link, embed, native, or hybrid — recorded
in the HLD and an ADR, with the published dashboards reused unless a
documented gap names what they cannot do. NFR-8 requires this platform
decision, including the per-surface choice, to be recorded in an ADR:
this is that record, and [ADR-0011](0011-webapp-toolchain.md) records
the new toolchain.

## Decision

The scenario page is a **native, client-side web application** inside
the existing MkDocs site
([ADR-0008](0008-mkdocs-material-companion-site.md)): the browser does
all scenario-time work — filtering, population selection, statistics,
rendering, downloads — against a compact committed data artifact
([ADR-0013](0013-row-level-scenario-artifact.md)). No backend, no
server-side computation, no browser Python.

The FR-G5 per-surface decision, in full — this ADR gives each
product surface exactly one home, with nothing duplicated:

- **Scenario page** — the native application page.
- **Five published dashboards** — links from product surfaces to the
  existing site pages (which embed Tableau Public); never embedded in
  the scenario page.
- **Morphology and measurement pages** — static site pages with media
  slots; the morphology page's one control (the PDD D-13 family
  toggle) is a small page-local script, not an app surface.
- **Contact and requests** — a static page of links and addresses.
- **Glossary, citation, data, paper pages** — reused; the product
  deep-links to their anchors; only the PDD §5.11 glossary additions
  are new.

Two policies ride with the platform choice:

- **Shared-link state lives in URL query parameters** (the PDD §7.1
  restore list; versionless in v0.3 per PDD D-15). With no server
  there is nowhere else durable; results are always recomputed from
  state, never stored in the URL (FR-X1).
- **Failure honesty (NFR-5):** the page's Markdown body carries real
  no-JS fallback content; artifact load failure states itself plainly
  instead of rendering empty results; the app refuses to compute when
  the fetched manifest version differs from the build-time pin.

## Alternatives considered

- **A backend or query service** — forbidden by NFR-2 and recorded as
  infeasible for this host (R-19); would also break the one-site,
  one-deploy model (ADR-0009).
- **Embedding a dashboard in the scenario page** — cannot express the
  combined query (the documented gap); puts two disconnected filter
  models side by side; doubles the page weight.
- **Browser-side Python (Pyodide and kin) or DuckDB-wasm** — ruled
  out by NFR-3's weight prohibition; a SQL engine is also far more
  machinery than the one scan pattern the product needs (ADR-0013).
- **A separate app site or subdomain** — splits the URL space,
  navigation, and deploy lane the product is required to share
  (NFR-2, SC-6).
- **Server-stored share links** — need the backend this decision
  rejects.

## Consequences

- Everything the product can show must ship to the client as
  committed data ([ADR-0012](0012-product-data-exports.md),
  [ADR-0014](0014-committed-content-hashed-artifacts.md)).
- Client-side statistics need their own correctness story — the
  parity harness ([ADR-0015](0015-golden-scenario-parity.md)).
- Shared-link URLs circulate in readers' documents, so parameter
  names become a de facto public interface; the DDD should name them
  with that in mind (version handling stays per PDD D-15).
- The failure modes are explicit page states, not accidents; the
  no-JS body doubles as the page's search-indexable description.

## References

- `docs/app/hldd.md` §4.1–§4.2, §6, §6.1 — the design detail
- `docs/app/prd.md` §1.4–1.5, §8.5 (NFR-8), §9.4 (R-19);
  `docs/app/pdd.md` §7.1
- [ADR-0004](0004-tableau-as-the-dashboard-platform.md),
  [ADR-0005](0005-tableau-public-as-the-publication-channel.md) — the
  dashboards this product links to rather than replaces
