# ADR-0001: BI platforms — Tableau and Apache Superset

- **Status**: Accepted
- **Date**: 2026-05-23
- **Deciders**: Michael Bouzinier (project owner)

## Context

The legacy material is two Jupyter notebooks producing publication figures
of DEM model results overlaid on historic earthquake measurements. We need
to deliver this as an interactive product — filtering, slicing, sharing —
to scientific and managerial audiences.

A custom Python UI (Dash, Streamlit, Voila) was explicitly ruled out as
niche and out of scope. The project owner has prior experience with both
Tableau Desktop and Apache Superset; Power BI was ruled out on cost
grounds for shared/published dashboards.

## Decision

Build dashboards on **Tableau** (Desktop for authoring, Cloud or Public
for sharing) **and Apache Superset** (self-hosted, open source). Both are
first-class targets.

## Alternatives considered

- **Power BI** — Pro tier required for cloud sharing; cost prohibitive.
- **Google Looker Studio** — free and capable, but less feature-rich and
  ties dashboards to Google identity. Reasonable future fallback.
- **Observable** — excellent for custom interactive viz, but JS-based;
  team has limited JS bandwidth.
- **Dash / Streamlit / Voila** — Python UI, niche for productization;
  user explicitly ruled this out.
- **Metabase** — capable but less polished than Tableau for presentations.

## Consequences

- Two platforms to maintain. We mitigate divergence by targeting them
  through SQL (see ADR-0003, ADR-0004) rather than file imports.
- Covers two audiences: Tableau for polished/shareable artifacts, Superset
  for open-source/self-hosted deployments.
- Workbook artifacts (`.twb`/`.twbx`) and Superset YAML exports both live
  under `dashboards/` and are version-controlled.

## References

- Initial scoping conversation: `ai/inital-conversation.md`
- Implementation: `dashboards/tableau/`, `dashboards/superset/`
