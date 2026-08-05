# ADR-0004: Tableau as the (only) dashboard platform

- **Status**: Accepted
- **Date**: 2026-05-23 (Tableau chosen); narrowed from "Tableau **and** Superset" in practice over June–July; recorded 2026-08-05
- **Deciders**: Michael Bouzinier (project owner)

## Context

The legacy material is publication figures from two notebooks; the product
is those figures as interactive dashboards — filtering, parameters,
sharing — for scientific readers. The owner has prior Tableau experience.
The original decision (old ADR-0001) named two first-class platforms,
Tableau and Apache Superset; Superset never received a single dashboard
and was retired (see
[Dead ends](dead-ends.md#superset-the-platform-that-never-was)).

## Decision

**Tableau, alone.** Tableau Desktop (public-app edition where applicable)
for authoring; Tableau Public for delivery
([ADR-0005](0005-tableau-public-as-the-publication-channel.md)). Workbooks
(`.twb`) are version-controlled under `dashboards/tableau/`, one desktop
workbook and/or one `-public` twin per dashboard family.

## Alternatives considered

- **Apache Superset** — open-source, self-hostable; carried as co-equal
  for a month. Retired: a second platform doubles every dashboard's build
  cost, needs a hosted SQL endpoint that no longer exists on the delivery
  path, and the requirement it served (free sharing) is met by Tableau
  Public.
- **Power BI** — Pro licensing required for shared dashboards; cost.
- **Google Looker Studio** — free and capable; weaker viz depth, ties
  artifacts to Google identity. Named fallback if Tableau ever becomes
  unavailable.
- **Observable / D3** — the team's JS bandwidth doesn't support it.
- **Dash / Streamlit / Voila** — Python UI, ruled out at project start
  ([ADR-0002](0002-python-pipeline-shape-and-toolchain.md)).

## Consequences

- One platform to master deeply — and the project has: workbook XML is
  hand-maintained when the UI can't express something (schema repairs,
  zone geometry, mark ordering), which a two-platform strategy would have
  made twice as expensive.
- Vendor coupling is accepted and mitigated: the data layer is
  platform-neutral (Parquet + SQL views +
  CSV, [ADR-0003](0003-duckdb-as-the-analytical-engine.md)/[0006](0006-csv-extracts-for-tableau-public.md)),
  so re-platforming the viz layer would lose workbooks, not data or
  analytics.
- Authoring know-how is written down as it's learned: build specs and
  click-by-click walkthroughs in `notes/`, traps in the session status
  doc, conventions in
  [ADR-0007](0007-dashboard-design-conventions.md).

## References

- `dashboards/tableau/` — the workbooks and their README
- `notes/dashboard-3-build-spec.md`, `notes/dashboard-4-build-spec.md`
- [Dead ends](dead-ends.md) — the Superset half of the original decision
