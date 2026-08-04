# Dashboard 3 build spec — per-event boxplots (family 5)

> **Reconstructed 2026-08-01.** The 2026-07-31 original was written in the
> cloud session's workspace and never reached the repo (file-sync failure);
> rebuilt from `Roadmap.md`, `chart-families.md` (family 5), the shipped
> views, and the actual exports. Treat like the Roadmap: a working doc —
> update as decisions land.

**Question** (family 5): *how variable are the field measurements within
each earthquake, and do DEM ranges bracket them?* The inverse of
Dashboard 1 — summarizing reality's spread with the model as context.

**Visual anchors**: paper Fig. 13 ("boxplots depict quartiles"); nb2
cells 19/20/21 (one boxplot per measure) and 25 (combined panels — in
the final version DEM **boxplots by scarp class**, not histograms).

**Build walkthrough**: step-by-step Tableau instructions with per-sheet
acceptance counts at `notes/2026-08-01/dashboard-3-tableau-public-build.md`
(nb2 re-read + populations computed 2026-08-01).

## Data sources

| View | Size | Role |
|------|------|------|
| `fdhi_measurements` | 4,121 rows × 136 cols, **25 events** | Boxplot backbone: `fzw_central_meters`, `sh_central_meters`, `vs_central_meters` per `eq_name`; per-measurement `magnitude` (sentinels already NULLed in the view). `*_low/_high_meters` triplets available for whisker sanity checks. Row-level filters (Principal, positivity, fzw<50) are **deliberately left to the workbook** — see the `prep.fdhi_measurements` docstring. |
| `sure_enriched` | 1,402 rows × 76 cols | SURE `FNC` and `SH` per event; event `magnitude` lookup-joined (this view supersedes the Roadmap's earlier "via `unified_observations`" wording — unified's SURE slice is only 56 rows). Two event names carry a trailing NBSP (`Coalinga (Nuñez)`, `Tennant Creek`); Coalinga's magnitude is NULL pending the `SURE_EVENT_MAGNITUDES` confirm/None review. |
| `dem` | 346,834 rows | Context distribution (histogram / reference band) alongside the event boxplots, per the Fig.-13 / nb2-cell-25 layout. |

Explicitly **not** the source: `fdhi_cleaned` (19 rows — that's the
Dashboard-1 scatter-overlay subset, not the measurement population) and
`unified_observations` (its FDHI slice is 17 rows). This is what the
raw-flatfile pipeline (`12d2be2`) was built for.

## Worksheets

Ground truth from nb2 cells 17/19/20/21/25 (re-read 2026-08-01):
**horizontal** boxplots (events on the categorical y-axis), per-sheet
row filters, linear clipped axes. Populations from the current exports:

1. **FZW per event** — `fzw_central_meters`, filters Principal ∧
   fzw > 0 → **463 rows / 4 events**: Kaikoura n=448 (50–1,450 m,
   median 250), Wenchuan n=8, Kern n=5, Kashmir n=2 (degenerate box).
   **Full-range log axis (fixed 0.01–2,000), Michael's decision
   2026-08-01** — a documented deviation from Fig. 13c, whose 0–50 m
   window kept 13 rows and excluded Kaikoura entirely.
2. **SH per event** — `sh_central_meters` > 0 ∧ Principal → 484 rows /
   **3 events** (Bohol, Killari, Wenchuan); axis −0.5…5.5.
3. **VS per event** — `vs_central_meters` > 0 ∧ Principal → 2,106 rows
   / **23 events** — the rich panel; axis −0.5…8; standalone (cell 21
   only, not part of the combined Fig. 13).
4. **SURE FNC per event** (185 rows / 9 events) and **SURE SH per
   event** (74 rows / 4 events) — separate sheets from `sure_enriched`;
   values all positive, NULLs drop on their own.
5. **DEM context panels** — **boxplots per `Scarp_Class`** (nb2's final
   version; the histogram variant is commented out) of `DZW` and
   `Scarp_Height`, each placed above its matching FDHI sheet with a
   shared axis window: DZW ↔ fzw on the **shared log 0.01–2,000**
   window (DZW > 0 filter, 329,152 rows; DEM envelope tops out at
   ~46 m — the visible offset vs field fzw is the pair's point);
   Scarp_Height ↔ sh linear 0–5.5 per the figure.

## Tableau scaffolding

- **Event label calc**: `eq_name + " (M " + STR(magnitude) + ")"` — the
  magnitude work (Roadmap data-side item 1, done 07-31) exists to power
  these labels.
- **Sort**: nb2 plots raw data order (seaborn default, unsorted);
  magnitude-descending is our proposed improvement — Michael's call.
- **Scales**: nb2 uses linear axes with fixed clipped windows; we keep
  those for sh/Scarp_Height (−0.5…5.5) and vs (−0.5…8), but the
  **fzw/DZW pair goes fixed log 0.01–2,000** (decision 2026-08-01 —
  full range instead of the figure's 0–50 clip). Whiskers: Tableau's
  default 1.5 × IQR equals seaborn's default, so boxes match the
  figure where we follow it.
- **Palettes**: one hue per measure, consistent between the FDHI and
  SURE sheets; keep event overlays' black/white + star convention out of
  this workbook (no cross-source overlay here). Legacy scarp-class
  palette does not apply (no `Scarp_Class` on the field data).

## Workbook & delivery

- **Public-first** (2026-08-01): build
  `dashboards/tableau/per-event-box-plots-public.twb` directly from
  `dist/csv/fdhi_measurements.csv`, `sure_enriched.csv`, `dem.csv`
  (export tasks in `build.gradle.kts`; commit pending native
  verification). The desktop twin follows once the parked Terraform
  puts `fdhi_measurements` in Athena — or sooner via DuckDB JDBC.
- **Desktop engine caveat**: the desktop workbooks connect to Athena,
  but `fdhi_measurements` reaches Athena only when the **parked**
  Terraform applies the regenerated `tables.json`. Until then: DuckDB
  local (`dashboards/duckdb/eps.duckdb`) or a `.hyper` extract.

## Lanes

Michael builds in Tableau Desktop; Claude does data plumbing, workbook
XML review, and verification.

**Review checklist (Claude's lane, post-build):**

- Event count on each axis = 25 (FDHI) / SURE's event set; total row
  counts 4,121 / 1,402 reachable from the workbook datasource.
- Spot-check 2–3 events' quartiles against DuckDB
  `PERCENTILE_CONT(0.25/0.5/0.75)` on the same view.
- NULL handling: sentinel rows must not appear as zero-value outliers.
- Palette + label consistency with Dashboards 1–2 conventions.

## Open questions

- [x] ~~Workbook filename~~ — settled 2026-08-01 by Michael's save:
  `per-event-box-plots-public.twb` (no `dem-` prefix).
- [ ] Event ordering: nb2 = raw data order; magnitude-desc proposed.
  (No separate subsetting question — the per-sheet filters already
  reduce the event sets to 3 / 3 / 23.)
- [x] ~~Log vs linear axes~~ — resolved: linear, fixed clipped windows
  (nb2 cells 19–21 / 25).
- [x] ~~SURE sheets~~ — separate worksheets: only two measures, and
  their event sets differ (9 vs 4), which a switch parameter would hide.
- [x] ~~Is the fzw sheet's 13-row window acceptable?~~ — resolved
  2026-08-01 (Michael): **full-range log fzw panel**; Fig.-13c fidelity
  deliberately dropped for this pair (deviation documented above and in
  the walkthrough).
- [ ] Whether Dashboard 3 shares a workbook with future #5
  (distributions) or stays standalone (current convention: standalone).
