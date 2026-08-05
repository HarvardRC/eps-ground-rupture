# ADR-0005: Tableau Public as the publication channel

- **Status**: Accepted
- **Date**: 2026-06-24 (first publish); recorded 2026-08-05
- **Deciders**: Michael Bouzinier (project owner)

## Context

The dashboards accompany a published paper (Chiama et al. 2025,
*Earthquake Spectra*). Their audience is **anyone reading the paper or the
companion site**: no Tableau accounts, no lab affiliation, no budget. Per
the author team, everything about this project is public anyway — the repo
itself is public.

Tableau offers three delivery channels: **Cloud** (per-seat licensing,
viewers need accounts), **Server** (self-hosted infrastructure plus
licensing), and **Public** (free, anonymous viewing, embeddable — with
hard technical constraints).

## Decision

**Tableau Public**, on the owner's profile
(`public.tableau.com/app/profile/michael.bouzinier`). Each dashboard
family ships as a `-public` workbook twin built for Public's constraints.
Embeds on the companion site use the Tableau Embedding API v3 against the
published views.

## Alternatives considered

- **Tableau Cloud** — a login wall for exactly the readers we want to
  reach, plus recurring per-seat cost. Rejected on audience fit, not
  capability.
- **Tableau Server** — all of Cloud's wall plus infrastructure to run.
  Nothing about this project needs governed access.
- **Desktop-only + static images on the site** — abandons interactivity,
  which is the product's reason to exist.
- (Within Public, Google Sheets vs CSV for data is its own decision —
  [ADR-0006](0006-csv-extracts-for-tableau-public.md).)

## Consequences

Public's constraints are accepted and drive several designs:

- **Extract-based sources are mandatory** (error 3C242D89 otherwise);
  no live connections of any kind. Data format falls out of this —
  [ADR-0006](0006-csv-extracts-for-tableau-public.md).
- **Whole-workbook publish**: every save re-publishes all of a workbook's
  dashboards; the active tab at save time becomes the default view.
  Multi-dashboard workbooks are managed accordingly (tabs hidden,
  deliberate active tab — [ADR-0007](0007-dashboard-design-conventions.md)).
- **Everything is public by definition** — acceptable here by policy; no
  sensitive fields may enter a published extract (unused fields are
  hidden before publish).
- **No scheduled refresh from files**: updating data means re-exporting
  CSVs, refreshing extracts, re-saving to Public. Fine at this project's
  cadence; the dormant Sheets lane exists if that ever changes
  ([Dead ends](dead-ends.md#the-google-sheets-almost)).
- Anyone can download the workbooks from Public — consistent with the
  repo being public.

## References

- `dashboards/tableau/*-public.twb` — the published twins
- `subprojects/mkdocs/EMBEDS.md` — embed markup pattern
- [ADR-0009](0009-github-pages-hosting.md) — where the embeds live
