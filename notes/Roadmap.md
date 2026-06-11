# Dashboard roadmap

A plan for reproducing the legacy notebook figures and the prior owner's
`legacy/FDHI-SURE-DEM_SCATTER.py` script as interactive Tableau dashboards.

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
| 2. Driver→response curves | How does the model respond to slip/magnitude per condition? | **next** |
| 3. Faceted distributions | What's the spread of each output; which parameter shifts it? | later |
| 4. Mean ± σ summary | Typical values and spreads per scarp class at a glance? | later |
| 5. Per-event boxplots | How variable are field measurements within each event? | priority 3 |
| 6. Regression + inference | What slip would produce an observed displacement? | priority 4 |
| Illustrations (static images) | Context: photos, schematics, model snapshots | lowest |

(The earlier A–E "theme" taxonomy is superseded by the families; the
mapping is at the bottom of `chart-families.md`.)

## Build order (priorities set 2026-06-10)

1. ~~**Dashboard 1 — Model vs reality** (family 1)~~ — **built**:
   dual-axis DZW × Scarp_Height scatter, Event Map, Combinations
   coverage matrix, two dashboards in `dashboards/tableau/dem-overview.twb`.
   Remaining polish (from the workbook review):
   - Unify event color/shape encodings between the scatter and the map.
   - Trend line: per-color or remove (currently one pooled OLS line).
   - Map-only non-null `latitude` filter (perf: stop querying 333k rows for 79 points).
   - Title zone width; exhaustive `Point Color` CASE; `'0 none'` coverage bucket.
2. **Dashboard 2 — DEM response curves** (family 2).
   - Driver→response grid: `Slip` / `Magnitude` (parameter-switchable x)
     vs `Scarp_Height`, `DZW`, `Scarp_Dip`, `VDHW`.
   - Color/facet by `Scarp_Class`, `Fault_Dip`, `Cohesion`, `Set` —
     reuse the `Row By` / `Col By` parameter pattern from the
     Combinations sheet.
   - Pure DEM data; needs the `dem` view only (already exists).
3. **Dashboard 3 — Per-event field statistics** (family 5).
   - Boxplots of FDHI `fzw` / `sh` / `vs` per `eq_name`; SURE FNC/SH
     similarly via `unified_observations`.
   - DEM distribution alongside as context (paper Fig. 13 layout).
   - Mostly served by existing views; FDHI's three measures need the
     `fdhi_cleaned` view directly.
4. **Dashboard 4 — Regression & inference** (family 6).
   - Per-Fault_Dip linear fits of Slip × VDHW + Kern back-projection
     (paper Fig. 14 / Equation 2).
   - Requires the `dem_regression` DuckDB view (see data-side work).
5. **Dashboard 5 — Distributions & summary stats** (families 3 + 4).
   - Faceted histograms (hue = class / density / depth / dip / strength)
     with historic-event reference lines.
   - Mean ± σ per scarp class (paper Fig. 8 — no notebook code exists;
     reconstruct from the `dem` view with AVG + stdev whiskers).
   - Needs the `historic_events` view for the reference lines.
6. **Static-image embedding** (lowest priority).
   - Embed selected paper illustrations (rupture photos Fig. 1, scarp
     morphology schematic Fig. 2, DEM snapshots Fig. 7) as dashboard
     context images — extract from the PDF as PNGs into
     `dashboards/tableau/images/` (gitignore question: small PNGs are
     fine to commit).
   - Pure Tableau layout work; no data plumbing.

Rough estimate: 1–2 sessions per dashboard; the regression dashboard
(#4) carries the data-side lift.

## Data-side work

Additions to `subprojects/python/src/eps_ground_rapture/views.py`,
re-ordered to match the build order:

1. *(for #4)* **`dem_regression` view** — per Fault_Dip, fit
   `VDHW ~ Slip` (and optionally `Scarp_Height ~ DZW`) using DuckDB's
   `regr_slope()` / `regr_intercept()` / `regr_r2()`; emit
   `(fault_dip, slope, intercept, r2)`. SQL-only — no Python regression
   import needed.
2. *(for #5)* **`historic_events` view** — small UNION over FDHI / SURE
   / Kern with `(event_label, dzw, scarp_height, magnitude)` per event.
   Powers marker-line overlays on histograms.
3. *(optional)* **`dem_with_bands` view** — adds a `fault_dip_band`
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
  - New for Dashboard 2: an `X Driver` parameter (`Slip` vs `Magnitude`).
- **Color palettes**: align to the legacy figure where readable:
  - Monoclinal: `#009ffa`; Pressure Ridge: `#f47820`; Simple: `#ed2024`;
    each `_Collapse` variant a darker shade of its parent.
  - Event overlays: distinct from any DEM hue (black/white fills, star
    shapes).

## Decisions made

- **Engine**: DuckDB via JDBC for first pass (ADR-0005). Same Parquet
  data, same UNION view powering every dashboard.
- **Layout source**: `unified_observations` view for cross-source plots;
  per-source views (`dem`, `fdhi_cleaned`, `sure`, `kern_combined`) for
  single-source plots.
- **Reference figure**: `legacy/FDHI-SURE-DEM-2D-3D-Scatter_ONLY.pdf`
  is the canonical visual target for Dashboard 1; paper Figs. 6, 8,
  13–15 anchor Dashboards 2–5.
- **Priorities (2026-06-10)**: after the response-curve dashboard (#2),
  build per-event boxplots (#3) and regression/inference (#4) ahead of
  the distribution/summary dashboards (#5). Static images last.

## Open questions

- [ ] **Workbook structure**: single `.twb` with all dashboard tabs
  (current de-facto state — `dem-overview.twb` already has two) vs
  splitting per audience. Single favors cross-dashboard filter actions.
  **Pending; default is single until it hurts.**
- [ ] **3D DEM data**: `combinedCases123_v2.csv` and `combinedCase4_v2.csv`
  referenced by the prior owner's script aren't in `data/raw/` yet.
  Without them, Dashboard 1 covers the 2D-DEM slice only. Tracked in
  `TODO.md`.
- [ ] **Magnitude in `unified_observations`**: FDHI/SURE carry event
  magnitudes; surfacing them would enable magnitude filters on
  Dashboard 1 and labels on Dashboard 3. Small `views.py` change —
  fold into the #3 data work.

## Related

- `notes/chart-families.md` — canonical chart-type inventory (this
  roadmap's build order references its family numbers).
- `dashboards/tableau/dem-overview.twb` — the workbook (Dashboard 1 +
  Viable Combinations live here).
- `dashboards/duckdb/eps.duckdb` — DuckDB views file Tableau connects to.
- `subprojects/python/src/eps_ground_rapture/views.py` — view definitions.
- `TODO.md` — point-in-time chores (raw-FDHI cleaning, 3D DEM data).
- `docs/adr/` — locked architectural decisions backing this work.
