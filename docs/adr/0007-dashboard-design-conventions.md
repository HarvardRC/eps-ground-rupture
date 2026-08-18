# ADR-0007: Dashboard design conventions

- **Status**: Accepted (a living convention set — extend via new ADRs only if a convention is *reversed*)
- **Date**: accumulated 2026-06…08; recorded 2026-08-05
- **Deciders**: Michael Bouzinier, following the paper's visual language (Chiama et al. 2025)

## Context

Six chart families (`notes/chart-families.md`) become dashboards built by
different people at different times — some sheets by the owner in the
Tableau UI, some by Claude in workbook XML. Without shared conventions the
set drifts apart visually, and each dashboard re-litigates the same
decisions. Several conventions also exist to keep faith with the paper:
readers should recognize the figures they came from.

## Decision

The conventions, in rough order of importance:

1. **The paper's palette is preserved.** Scarp classes keep the legacy
   figure colors — Monoclinal `#009ffa`, Pressure Ridge `#f47820`,
   Simple `#ed2024`, each `…Collapse` variant a darker shade of its
   parent (canonical values in `config.py` and the workbooks). Field-event
   overlays stay visually distinct from every DEM hue (black/white fills,
   star/shape marks); **Kern County is red** and drawn in front.
2. **Every dashboard earns its interactivity.** A published dashboard
   must offer something the printed figure cannot — filters at minimum,
   parameters and highlight actions where they carry meaning (e.g. the
   regression dashboard's `Kern Dip (measured: 30°)`, renamed from `Kern Assumed Dip` 2026-08-16). A static reproduction is
   not worth publishing.
3. **Web variants for the companion site.** Each workbook carries, besides
   its full-size dashboard, a `…web` variant laid out vertically at
   ~800 px width for embedding
   ([ADR-0008](0008-mkdocs-material-companion-site.md)); the site's
   scale-to-fit wrapper handles the rest. Fixed-size layouts, not Range.
4. **Publish hygiene.** Tabs hidden on Public; the intended default view
   is the active tab at save time; unused fields hidden before publish
   (keep-list exceptions documented); extracts present
   ([ADR-0005](0005-tableau-public-as-the-publication-channel.md)).
5. **Deviations from the paper are documented, not silent.** Where a
   dashboard departs from the source figure (e.g. the boxplots' log axis
   showing the full unrestricted field range instead of the paper's 50 m
   selection), the build spec records it and the companion site explains
   it to readers.
6. **Every dashboard gets a build spec** (`notes/dashboard-N-build-spec.md`)
   pinning populations, filters and axis decisions, plus a click-by-click
   walkthrough when a rebuild is plausible. Rebuilding from scratch has
   happened; an hour of writing has repaid itself already.

## Alternatives considered

- **Tableau default palettes** — breaks recognition between paper and
  dashboards.
- **Single responsive layout per dashboard** — Tableau's automatic
  resizing produced scrollbars and squashed panels in embeds; explicit
  fixed-size web variants won.
- **Conventions by oral tradition** — this is a multi-machine,
  human-plus-AI project with month-long gaps; unwritten conventions
  don't survive that.

## Consequences

- A new dashboard starts from a checklist instead of a blank canvas.
- The palette contract makes cross-dashboard reading effortless (same
  class = same color everywhere), at the cost of occasional wrestling
  with Tableau's color assignment UI (documented in the walkthroughs).
- Web variants double the layout work per dashboard — accepted; the
  embed experience is most readers' only experience.

## References

- `notes/Roadmap.md` — palette values and reusable parameter patterns
- `notes/chart-families.md` — the six families
- `notes/dashboard-3-build-spec.md`, `notes/dashboard-4-build-spec.md`
- `dashboards/tableau/README.md`
