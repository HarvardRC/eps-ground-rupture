# Dashboard roadmap

A plan for reproducing the legacy notebook figures and the prior owner's
scatter script from the handoff materials (not in the repo) as interactive
Tableau dashboards, now embedded in the MkDocs companion site
(`subprojects/mkdocs/`, ADR-0008/0009).

Treat this as a working document — update as decisions are made and
scope shifts. For longer-lived design decisions, promote items to an
ADR under `docs/adr/`. For point-in-time chores, use `TODO.md`.

## Chart inventory

The canonical inventory of chart types in the paper and notebooks lives
in [`chart-families.md`](chart-families.md) — six conceptually distinct
families plus non-chart illustrations. Summary:

| Family | Question it answers | Status |
|--------|---------------------|--------|
| 1. Model vs reality scatter | Does the simulation behave like real earthquakes? | ✅ built |
| 2. Driver→response curves | How does the model respond to slip/magnitude per condition? | ✅ built |
| 3. Faceted distributions | What's the spread of each output; which parameter shifts it? | ✅ built (Dashboard 5) |
| 4. Mean ± σ summary | Typical values and spreads per scarp class at a glance? | ✅ built (Dashboard 5) |
| 5. Per-event boxplots | How variable are field measurements within each event? | ✅ built (Dashboard 3) |
| 6. Regression + inference | What slip would produce an observed displacement? | ✅ built (Dashboard 4) |
| Illustrations (static images) | Context: photos, schematics, model snapshots | lowest — now a site/rights question (see build order #6) |

(The earlier A–E "theme" taxonomy is superseded by the families; the
mapping is at the bottom of `chart-families.md`.)

## Build order (priorities set 2026-06-10; statuses updated 2026-08-05)

1. ~~**Dashboard 1 — Model vs reality** (family 1)~~ — **built &
   published**: dual-axis DZW × Scarp_Height scatter, Event Map,
   Combinations coverage matrix; two dashboards ("Dashboard 1 — DEM
   Cloud & Historic Overlays", "Viable Combinations") in
   `dashboards/tableau/dem-model-vs-reality.twb` (renamed from
   `dem-overview.twb`), plus a `-public` twin
   (`dem-model-vs-reality-public.twb`) on Tableau Public fed from a
   CSV export of `unified_observations`.
   Remaining polish (from the workbook review; not re-audited since the
   cosmetic-edit / palette commits — re-check which are still open):
   - Unify event color/shape encodings between the scatter and the map.
   - Trend line: per-color or remove (currently one pooled OLS line).
   - Map-only non-null `latitude` filter (perf: stop querying 333k rows for 79 points).
   - Title zone width; exhaustive `Point Color` CASE; `'0 none'` coverage bucket.
2. ~~**Dashboard 2 — DEM response curves** (family 2)~~ — **built &
   published** (built 2026-06-17, on Tableau Public 2026-06-25):
   "DEM Response Curves" dashboard in
   `dashboards/tableau/dem-response-curve.twb` — `Driver` /
   `Driver Value` parameters switch the x-axis (`Slip` / `Magnitude`)
   against `Scarp_Height`, `DZW`, `Scarp_Dip` or `Us - Ud`; `-public`
   twin (`dem-response-curve-public.twb`, plus an 800×1000 `…web`
   variant) fed from the **local** CSV export of the `dem` view
   (`dist/csv/dem.csv` — the early Drive-CSV handoff is retired).
   - ~~Dropped from the original spec: the `VDHW` response — add it here
     or fold it into Dashboard 4~~ — resolved: folded into Dashboard 4,
     whose regressions plot `VD_HW` against slip.
3. ~~**Dashboard 3 — Per-event field statistics** (family 5)~~ — **built
   & published** (2026-08-01/02): two dashboards in
   `per-event-box-plots-public.twb` (a **public-only** workbook, no
   desktop twin): "Per-Event Boxplots — Model vs Field" (DEM
   distribution above the comparable field measure, shared axes,
   800×1200) and "VS & SURE" (1200×1200, plus an 800×2000 `…web`
   variant) with an event map and a per-panel event filter. Notable
   calls: fixed **log** width axis showing the full unrestricted field
   range — a documented deviation from the paper's 50 m selection
   criterion — principal-rupture + positive-value filters, magnitude
   labels via `unified_observations`. Populations, filters and axis
   decisions pinned in `notes/dashboard-3-build-spec.md`.
4. ~~**Dashboard 4 — Regression & inference** (family 6)~~ — **built &
   published** (2026-08-04): "Slip Regression & Kern Inference"
   (800×850) in `dem-slip-regression-public.twb` (**public-only**
   workbook). Dual axis over a 3-way CSV union: DEM cloud + seven
   per-dip black OLS fit lines (slopes ≈ sin dip) + Kern County stars
   that **slide between fit lines** via the `Kern Dip (measured: 30°)` parameter (renamed 2026-08-16)
   (20–70°, default 30°); dip checkbox filter and hover highlight. Fits
   computed in the pipeline, not the workbook (data-side work #2). Spec:
   `notes/dashboard-4-build-spec.md` (click-by-click walkthrough
   alongside in `notes/2026-08-04/`).
5. ~~**Dashboard 5 — Distributions & summary stats** (families 3 + 4)~~ —
   **built & published** (2026-08-15): "Distributions & Summary (web)"
   (800×1200, the only dashboard — a landscape twin was tried and
   dropped) in `dashboards/tableau/dem-distributions-public.twb`
   (**public-only**), fed from `dem.csv` + `historic_events.csv` in one
   union. Parameter-driven layered histogram (`Measure` × `Hue By` ×
   `Population`, per-measure bin widths) with per-measurement historic
   needles (LOD-sized, data-driven), plus the Fig-8 mean ± σ
   reconstruction (candidate populations pinned in
   `notes/dashboard-5-build-spec.md`; which one Fig. 8 used stays open
   until q8 resolves). Spec: `dashboard-5-build-spec.md`.
6. **Static-image embedding** (lowest priority — reframed 2026-08-05).
   - The companion site, not the dashboards, is now the natural home for
     the paper illustrations (Figs. 1, 2, 5, 7) — and the paper is **not
     open access**, so no typeset imagery may be reproduced until rights
     are confirmed with the author team. Four placeholders naming those
     figures already sit in the site's `paper.md`; the rights question
     is tracked in `subprojects/mkdocs/DEPLOY.md` → Open questions for
     the author team.
   - The old plan — extract PNGs into `dashboards/tableau/images/` — is
     dropped.

Rough estimate: 1–2 sessions per dashboard; the regression dashboard
(#4) carries the data-side lift.

## Data-side work

Additions to `subprojects/python/src/eps_ground_rupture/views.py`,
re-ordered to match the build order:

1. *(for #3)* ~~**`magnitude` in `unified_observations`**~~ — **done**
   (2026-07-31): FDHI per-measurement Mw (−999 sentinel nulled), Kern
   pinned to 7.36, SURE looked up from `config.SURE_EVENT_MAGNITUDES`
   (NBSP-normalized names), DEM NULL. Dashboard 3 gets event labels;
   Dashboard 1 can now gain a magnitude filter.
2. *(for #4)* ~~**`dem_regression` view**~~ — **done** (2026-08-02…04),
   and grew into three views: `dem_regression` (per-dip
   `regr_slope/intercept/r2`; slopes land on sin dip),
   `dem_regression_lines` (two endpoints per dip, for drawable fit
   lines) and `kern_inferred_slip` (the 16 Kern verticals
   back-projected through every dip's fit). SQL-only as planned; Athena
   twins alongside; coefficients pinned by
   `tests/test_regression_views.py`. The optional `Scarp_Height ~ DZW`
   fit was never needed.
3. *(for #5)* ~~**`historic_events` view**~~ — **done** (2026-08-15),
   with a grain revision against nb2 ground truth: **one row per field
   measurement**, not per event (`for x in df_KernNew["DZW"]:
   axvline(x)` — the notebook draws every measurement). Three arms
   (fdhi_measurements / sure / kern_combined), per-column sentinel
   filters, row kept when either measure survives; 2,616 rows pinned by
   `tests/test_historic_events.py`. Optional-table semantics (needs the
   raw-flatfile lane), Athena twin alongside.
4. *(optional)* **`dem_with_bands` view** — adds a `fault_dip_band`
   column (`20–30`, `30–40`, …) for cleaner small-multiples. Or do this
   as a calculated field in Tableau and skip the view.

## Tableau-side scaffolding

- **Calculated fields**:
  - `Source / Event` and `Event` — exist; **consolidate to one** (they
    currently carry conflicting color/shape palettes; see workbook review).
  - `Fault_Dip Band` — buckets the integer dip into ranges for facets.
  - `Scarp_Class Family` — strips the `_Collapse` suffix to collapse
    `Monoclinal` / `Monoclinal Collapse` into one group when desired.
- **Parameters**:
  - `Color By` — exists; make its CASE exhaustive and consider adding
    `Cohesion` / `DEM Set` members.
  - `Row By` / `Col By` — exist (drive the Combinations matrix); reuse
    the same pattern for Dashboard 2's response-curve grid.
  - ~~New for Dashboard 2: an `X Driver` parameter~~ — built as the
    `Driver` / `Driver Value` parameters in `dem-response-curve.twb`.
- **Color palettes**: align to the legacy figure where readable:
  - Monoclinal: `#009ffa`; Pressure Ridge: `#f47820`; Simple: `#ed2024`;
    each `_Collapse` variant a darker shade of its parent.
  - Event overlays: distinct from any DEM hue (black/white fills, star
    shapes).

## Decisions made

- **Engine (2026-06, historical)**: DuckDB via JDBC for the first pass.
  Superseded in practice — see "Engines in practice" below; DuckDB's
  live role is pipeline-side (views → CSV exports; ADR-0003, ADR-0006).
- **Layout source**: `unified_observations` view for cross-source plots;
  per-source views (`dem`, `fdhi_cleaned`, `sure`, `kern_combined`) for
  single-source plots.
- **Reference figure**: `legacy/FDHI-SURE-DEM-2D-3D-Scatter_ONLY.pdf`
  is the canonical visual target for Dashboard 1; paper Figs. 6, 8,
  13–15 anchor Dashboards 2–5.
- **Priorities (2026-06-10)**: after the response-curve dashboard (#2),
  build per-event boxplots (#3) and regression/inference (#4) ahead of
  the distribution/summary dashboards (#5). Static images last.
- **Tableau Public delivery (2026-07)**: Public can't connect to DuckDB
  or Athena, so each workbook has a `-public` twin fed from CSV exports
  of the views (`egr-csv`); the Google Sheets push (`egr-push-sheets`)
  also exists for `unified_observations` (the full `dem` view exceeds
  the Sheets cell cap). See `dashboards/sheets/README.md`.
- **Engines in practice (2026-07)**: the desktop workbooks connect to
  Athena (AwsDataCatalog, URC Dev; Terraform-provisioned)
  with local `.hyper` extracts; DuckDB remains the local fallback.
  Further AWS/Terraform work is parked, low priority — status and
  revisit triggers in `TODO.md` → Deployment.
- **Companion site (2026-08)**: MkDocs Material on GitHub Pages
  (ADR-0008, ADR-0009) embeds the published dashboards, so each
  workbook carries a vertically-laid `…web` dashboard variant at
  ~800 px width (ADR-0007). Site source: `subprojects/mkdocs/`.

## Open questions

- [x] **Workbook structure**: resolved in practice (2026-06; amended
  2026-08) — one workbook per dashboard family. The June families keep
  desktop + `-public` twins (`dem-model-vs-reality`,
  `dem-response-curve`); the August families are **public-only**
  workbooks authored against the CSV exports directly
  (`per-event-box-plots-public`, `dem-slip-regression-public`).
  Cross-dashboard filter actions would need tabs merged back into one
  workbook; revisit only if that need materializes.
- [ ] **3D DEM data**: `combinedCases123_v2.csv` and `combinedCase4_v2.csv`
  referenced by the prior owner's script aren't in `data/raw/` yet.
  Without them, Dashboard 1 covers the 2D-DEM slice only. Tracked in
  `TODO.md`.
- [x] **Magnitude in `unified_observations`**: done (2026-07-31) — the
  view carries event `magnitude` (FDHI per measurement, Kern pinned,
  SURE via `config.SURE_EVENT_MAGNITUDES`), enabling magnitude filters
  on Dashboard 1 and labels on Dashboard 3.

## Related

- `notes/chart-families.md` — canonical chart-type inventory (this
  roadmap's build order references its family numbers).
- `dashboards/tableau/dem-model-vs-reality.twb` — Dashboard 1 + Viable
  Combinations (public twin: `dem-model-vs-reality-public.twb`).
- `dashboards/tableau/dem-response-curve.twb` — Dashboard 2 (public
  twin: `dem-response-curve-public.twb`).
- `dashboards/tableau/per-event-box-plots-public.twb` — Dashboard 3
  (public-only; spec: `dashboard-3-build-spec.md`).
- `dashboards/tableau/dem-slip-regression-public.twb` — Dashboard 4
  (public-only; spec: `dashboard-4-build-spec.md`).
- `subprojects/mkdocs/` — the companion site the dashboards embed into.
- `dashboards/duckdb/eps.duckdb` — DuckDB views file (pipeline-side;
  desktop Tableau can still connect to it directly).
- `subprojects/python/src/eps_ground_rupture/views.py` — view definitions.
- `TODO.md` — point-in-time chores (raw-FDHI cleaning, 3D DEM data).
- `docs/adr/` — locked architectural decisions backing this work.
