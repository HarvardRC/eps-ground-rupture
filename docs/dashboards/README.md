# Dashboards — developer documentation

One page per dashboard family, written for whoever has to **change** a
workbook: what feeds it, what its calculated fields actually say, and what
will silently break.

The reader-facing explanations — what the science means, why the chart
answers a real question — live on the companion site under
`subprojects/mkdocs/docs/dashboards/`. The filenames match deliberately, so
`model-vs-reality.md` here is the developer twin of `model-vs-reality.md`
there. Neither replaces the other: same objects, different audiences.

| Family | Page | Workbook(s) | Status |
|--------|------|-------------|--------|
| 1 — Model vs reality | [model-vs-reality.md](model-vs-reality.md) | `dem-model-vs-reality{,-public}.twb` | published |
| 2 — Driver→response curves | [response-curves.md](response-curves.md) | `dem-response-curve{,-public}.twb` | published |
| 5 — Per-event boxplots | [per-event-boxplots.md](per-event-boxplots.md) | `per-event-box-plots-public.twb` | published |
| 6 — Regression + inference | [slip-regression.md](slip-regression.md) | `dem-slip-regression-public.twb` | published |
| 3 + 4 — Faceted distributions, mean ± σ | *not yet built* | — | next (Dashboard 5) |

Family numbers are the chart taxonomy in `notes/chart-families.md`;
"Dashboard N" is the build order in `notes/Roadmap.md`. They do not line up
— Dashboard 3 is chart family 5 — so this table gives both.

Also here:

- [tableau-editing-notes.md](tableau-editing-notes.md) — traps that apply
  to every workbook. Read it before your first `.twb` edit.

Workbook-level index (files, published slugs, publish procedure):
[`dashboards/tableau/README.md`](../../dashboards/tableau/README.md).

## The shape every page follows

**Purpose** → **Artifacts** (files, dashboards, slugs, where the site
embeds it) → **Data contract** (which CSVs, from which views, pinned by
which tests) → **Anatomy** (sheets, calculated fields verbatim, parameters,
filters, actions) → **How to edit safely** → **Known quirks**.

The data contract matters most. Every published workbook reads
`dist/csv/*.csv`, which `egr-csv` writes from DuckDB views, which
`egr-build` writes from Parquet. A change anywhere upstream reaches the
dashboards only after `egr-build` → `csvExportAll` → open the workbook →
**Data → \<source\> → Refresh** → republish. Nothing about that chain is
automatic.

## A caveat about "verbatim"

Calculated-field formulas on these pages are copied out of the `.twb` XML
and un-escaped. Where the desktop and `-public` copies of a family differ,
both are given — they bind **different identifiers** for the same field
(`[Slip]` in the CSV twin, `[slip]` in the Athena copy), so a formula
cannot be pasted from one into the other.
