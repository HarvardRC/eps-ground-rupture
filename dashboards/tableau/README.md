# Tableau workbooks

Seven `.twb` files: five **published** to Tableau Public and fed by
`dist/csv/*.csv`, and two **desktop authoring copies** kept from the
pre-pivot AWS lane. Published workbooks read CSV because Tableau Public
cannot hold a live connection to DuckDB or Athena — that is the whole
reason the CSV export exists (ADR-0005, ADR-0006).

Per-dashboard developer docs — data contract, calculated fields, how to
edit safely — live in [`docs/dashboards/`](../../docs/dashboards/). This
file is the workbook-level index and the publish procedure.

Check in `.twb` (XML, diffable). Avoid `.twbx`: it bundles a `.hyper`
extract, which is large, binary and immediately stale.

## The workbooks

| File | Dashboards inside (size) | Published slug | Reads | Developer doc |
|------|--------------------------|----------------|-------|---------------|
| `dem-model-vs-reality-public.twb` | `DEM Cloud & Historic Overlays (web)` (800×1200)<br>`Dashboard 1 — DEM Cloud & Historic Overlays` (1200×800)<br>`Viable Combinations` (1000×800) | `DEMCloudHistoricOverlaysweb`<br>`Dashboard1DEMCloudHistoricOverlays`<br>`ViableCombinations` | `unified_observations.csv` | [model-vs-reality](../../docs/dashboards/model-vs-reality.md) |
| `dem-model-vs-reality.twb` | `Dashboard 1 — DEM Cloud & Historic Overlays`<br>`Viable Combinations` | — (not published) | Athena `unified_observations` + a June `.hyper` | same |
| `dem-response-curve-public.twb` | `DEM Response Curves (web)` (800×1000)<br>`DEM Response Curves` (1200×800) | `DEMResponseCurvesweb`<br>`DEMResponseCurves` | `dem.csv` | [response-curves](../../docs/dashboards/response-curves.md) |
| `dem-response-curve.twb` | `DEM Response Curves` | — (not published) | Athena `dem` + a June `.hyper` | same |
| `per-event-box-plots-public.twb` | `Per-Event Boxplots — Model vs Field` (800×1200)<br>`Per-Event Boxplots — VS & SURE` (1200×1200)<br>`Per-Event Boxplots — VS & SURE (web)` (800×2000) | `Per-EventBoxplotsModelvsField`<br>`Per-EventBoxplotsVSSURE`<br>`Per-EventBoxplotsVSSUREweb` | `fdhi_measurements.csv`, `sure_enriched.csv`, `dem.csv` | [per-event-boxplots](../../docs/dashboards/per-event-boxplots.md) |
| `dem-slip-regression-public.twb` | `Slip Regression & Kern Inference` (800×850) | `SlipRegressionKernInference` | `dem.csv` + `kern_inferred_slip.csv` + `dem_regression_lines.csv` (one union) | [slip-regression](../../docs/dashboards/slip-regression.md) |
| `dem-distributions-public.twb` | `Distributions & Summary (web)` (800×1200) | `DistributionsSummaryweb` | `dem.csv` + `historic_events.csv` (one union) | [distributions](../../docs/dashboards/distributions.md) |

Published URLs are
`https://public.tableau.com/views/<workbook>/<slug>` for embeds and
`https://public.tableau.com/app/profile/michael.bouzinier/viz/<workbook>/<slug>`
for the human-facing link. `subprojects/mkdocs/EMBEDS.md` is the
authoritative embed map.

**The two `-public`-less files are not backups.** They connect to Athena
(`schema=eps_ground_rapture_dev`), carry `.hyper` extracts dated June, and
lack the `(web)` dashboards entirely. Copying one over its twin would
delete the site's embed target. Dashboards 3 and 4 were built public-first
and have no desktop copy at all.

## Feeding the workbooks

`dist/csv/` is gitignored — a fresh clone has nothing there, and `dem.csv`
alone is ~73 MB. Before opening any published workbook:

```bash
poetry run egr-build                        # raw → Parquet → DuckDB views
./gradlew :subprojects:python:csvExportAll  # every view → dist/csv/*.csv
```

Text-scan connections store an **absolute** directory, so the repo must sit
at the canonical path (`~/harvard/projects/github/eps-ground-rapture` — note
this local folder keeps the pre-rename spelling deliberately; see
`notes/multi-machine.md`).

Regenerating a CSV does not change what a workbook shows. Every data source
sits behind a `.hyper` extract, so after the export you must open the
workbook and do **Data → \<source\> → Refresh**, then republish.

## Publishing / republishing

1. Open the `.twb` via **File → Open** or Finder — never the start-page
   recents, which can resurrect a stale session and overwrite newer
   on-disk state.
2. **Data → \<each source\> → Refresh.** Tableau Public requires
   extract-based sources (error `3C242D89` otherwise); a dangling extract
   path in a fresh clone is normal and the refresh rebuilds it.
3. Click the tab you want as the **default view** — Tableau Public takes
   the active sheet at save time. For the two families with a landscape
   original plus a `(web)` twin, that means clicking the *original* tab,
   so the escape-hatch link keeps working.
4. **File → Save to Tableau Public As…** Publishing uploads the whole
   workbook, every tab, not just the active one.
5. **File → Save** locally afterwards, so the committed `.twb` matches
   what is live.
6. Verify against
   `https://public.tableau.com/profile/api/single_workbook/<workbook>`.
   HTTP status proves nothing — a nonsense view name also returns 200.

Tabs on/off is a per-workbook publish setting and does not affect embeds
(the site passes `hide-tabs`).

**Slugs are derived from dashboard names** by keeping only alphanumerics
and hyphens: `DEM Response Curves (web)` → `DEMResponseCurvesweb`.
Renaming a dashboard silently changes the slug and breaks the site embed.
Likewise the embed's `data-width`/`data-height` must equal the dashboard's
`<size>` exactly, or `tableau-fit.js` scales and clips wrongly.

More traps — XML content models, union column merging, mark partitioning,
z-order — are collected in
[`docs/dashboards/tableau-editing-notes.md`](../../docs/dashboards/tableau-editing-notes.md).

## Decisions behind this layout

- [ADR-0004](../../docs/adr/0004-tableau-as-the-dashboard-platform.md) — Tableau as the only dashboard platform (Superset retired).
- [ADR-0005](../../docs/adr/0005-tableau-public-as-the-publication-channel.md) — Tableau Public as the publication channel.
- [ADR-0006](../../docs/adr/0006-csv-extracts-for-tableau-public.md) — CSV exports as the published data format.
- [ADR-0007](../../docs/adr/0007-dashboard-design-conventions.md) — palette, web variants, interactivity baseline.
- [`dead-ends.md`](../../docs/adr/dead-ends.md) — why the Athena and Spark
  Thrift lanes are parked/retired, and what the two desktop copies are left
  over from. For desktop exploration against the full row counts, DuckDB is
  still live: [`../duckdb/README.md`](../duckdb/README.md).
