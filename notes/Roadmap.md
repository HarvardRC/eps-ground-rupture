# Dashboard roadmap

A plan for reproducing the legacy notebook figures and the prior owner's
`legacy/FDHI-SURE-DEM_SCATTER.py` script as interactive Tableau dashboards.

Treat this as a working document — update as decisions are made and
scope shifts. For longer-lived design decisions, promote items to an
ADR under `docs/adr/`. For point-in-time chores, use `TODO.md`.

## Legacy-figure inventory

Themes underlying the legacy notebooks and the 2025 revisions script:

| Theme | What the legacy figures show |
|-------|------------------------------|
| **A. DEM cloud vs historic earthquakes** | DZW × Scarp_Height scatter colored by Scarp_Class; same colored by Fault_Dip (gradient palette); FDHI / SURE / Kern stars overlaid; multi-panel with 2D + 3D DEM + field observations (the prior owner's most recent figure). |
| **B. Slip-vs-displacement relationships** | Slip × VDHW, Slip × Scarp_Height, Slip × DZW, Slip × HD_HW; multi-panel grids; color by Fault_Dip. |
| **C. Distributions** | DZW histograms with vertical lines marking historic event values; Scarp_Height histograms; boxplots by Scarp_Class and by event. |
| **D. DEM-internal material analysis** (notebook 2) | Homogeneous vs Heterogeneous; Cohesion effects; Sediment_Strength; Density. Distributions and scatters faceted by material properties. |
| **E. Regression / intersections** | Per-Fault_Dip linear fits on the DEM cloud; back-projecting Kern's measured vertical displacement onto fits to infer slip. |

## Dashboard structure

**Recommendation: one workbook with three dashboard tabs**, plus B/E as
optional follow-ons. One workbook lets shared filters and parameters
cross-propagate via Tableau Actions (a Scarp_Class click on Dashboard 1
narrows Dashboard 2 automatically). Trade-off: bigger `.twb` file,
slightly bigger diffs. Open for review — see "Open questions" below.

### Dashboard 1 — DEM Cloud and Historic Overlays *(theme A)*
Extends the existing `dashboards/tableau/dem-overview.twb`.

- Main scatter: DZW × Scarp_Height, DEM cloud + FDHI / SURE / Kern overlay markers.
- Color toggle via a `Color By` parameter (Source / Event, Fault_Dip, Scarp_Class).
- Dual-axis treatment so DEM dots stay small + faded while overlay stars are large.
- Optional trend lines per Fault_Dip via `Analytics → Trend Line`.
- Filters: `Source / Event`, `Scarp_Class`, `Fault_Dip`, magnitude (when surfaced).

### Dashboard 2 — Distributions *(theme C)*
- DZW histogram with marker lines / shaded bands at FDHI / SURE / Kern event values.
- Scarp_Height histogram similarly.
- Boxplot grid: each metric broken out by `Scarp_Class`.
- Action filters from Dashboard 1.

### Dashboard 3 — DEM Material Analysis *(theme D)*
- DEM scatter colored / faceted by `Set` (Homogeneous vs Heterogeneous).
- Per-`Cohesion` small multiples.
- `Density` and `Sediment_Strength` as additional axes or color encodings.
- Action filters from Dashboards 1 / 2.

### Optional — Slip-vs-displacement *(theme B)*
2×2 grid: Slip × VDHW, Slip × HD_HW, Slip × DZW, Slip × Scarp_Height.
Color by Fault_Dip. Pure DEM data; trivial to add — only worth doing if
audience asks.

### Optional — Regression intersections *(theme E)*
Needs Python-side work (see "Data-side work" below). Highest analytical
value but biggest lift; defer until B and C are settled.

## Data-side work

Additions to `subprojects/python/src/eps_ground_rapture/views.py`:

1. **`historic_events` view** — small UNION over FDHI / SURE / Kern with
   `(event_label, dzw, scarp_height, magnitude)` per event. Powers
   marker-line overlays on histograms in Dashboard 2.
2. **`dem_with_bands` view** *(optional)* — adds a `fault_dip_band`
   column (`20–30`, `30–40`, …) for cleaner small-multiples. Or do this
   as a calculated field in Tableau and skip the view.
3. **`dem_regression` view** *(theme E only)* — per Fault_Dip, fit
   `Scarp_Height ~ DZW` using DuckDB's `regr_slope()` / `regr_intercept()`;
   emit `(fault_dip, slope, intercept, r2)`. SQL-only — no Python
   regression import needed.

## Tableau-side scaffolding

- **Calculated fields**:
  - `Source / Event` — `IFNULL([eq_name], [source])`. Treats DEM and each
    field event as peers in legends and filters.
  - `Fault_Dip Band` — buckets the integer dip into ranges for facets.
  - `Scarp_Class Family` — strips the `_Collapse` suffix to collapse
    `Monoclinal` / `Monoclinal Collapse` into one group when desired.
- **Parameters**:
  - `Color By` — discrete: `Source / Event`, `Fault_Dip`, `Scarp_Class`.
    Drives a `CASE` calc that the Color mark uses.
- **Color palettes**: align to the legacy figure where readable:
  - Monoclinal: `#009ffa`
  - Pressure Ridge: `#f47820`
  - Simple: `#ed2024`
  - Each `_Collapse` variant: a darker shade of its parent
  - Event overlays: distinct from any DEM hue (whites, blacks, stars).

## Suggested build order

1. **Polish Dashboard 1** (1–2 sessions).
   - Add the `Color By` parameter and the Fault_Dip color variant.
   - Dual-axis the overlays so they don't drown in the DEM cloud.
   - Save canonical `.twb` after each session so diffs are reviewable.
2. **Build Dashboard 2** (1–2 sessions).
   - Add the `historic_events` view to `views.py` first.
   - Build histograms and boxplots; wire Action filters from Dashboard 1.
3. **Build Dashboard 3** (1–2 sessions).
   - Material-property exploration. Same filter wiring.
4. **Compose into one workbook with three dashboard tabs**; add a small
   navigation strip if you want a polished feel.
5. **Re-decide on B/E** based on audience feedback.

Rough estimate: ~6–10 hours of Tableau work for Dashboards 1–3 if
nothing surprises us; more if matching the published palette exactly
turns out to be fiddly.

## Decisions made

- **Engine**: DuckDB via JDBC for first pass (ADR-0005). Same Parquet
  data, same UNION view powering every dashboard.
- **Layout source**: `unified_observations` view (already exists).
  Tableau workbook uses it everywhere a cross-source plot is needed;
  per-source plots use the individual views (`dem`, `fdhi_cleaned`,
  `sure`, `kern_combined`).
- **Reference figure**: `legacy/FDHI-SURE-DEM-2D-3D-Scatter_ONLY.pdf`
  (the prior owner's most recent figure) is the canonical visual target
  for Dashboard 1. The 2024 notebook figures and 2025 revisions figure
  are supplementary references.

## Open questions

- [ ] **Workbook structure**: single `.twb` with three dashboard tabs
  (recommended) vs three separate `.twb` files. Single is better for
  cross-dashboard filter actions; separate is better for delivering
  distinct files to distinct audiences. **Pending decision.**
- [ ] **3D DEM data**: `combinedCases123_v2.csv` and `combinedCase4_v2.csv`
  referenced by the prior owner's script aren't in `data/raw/` yet.
  Without them, Dashboard 1 reproduces the 2D-DEM slice of the legacy
  multi-DEM figure. With them, it reproduces the full thing.
  Tracked in `TODO.md`.
- [ ] **Regression analysis (theme E)**: build it or defer? Highest
  insight per chart; biggest implementation cost. **Pending decision.**

## Related

- `dashboards/tableau/dem-overview.twb` — starter workbook for Dashboard 1.
- `dashboards/duckdb/eps.duckdb` — DuckDB views file Tableau connects to.
- `subprojects/python/src/eps_ground_rapture/views.py` — view definitions.
- `TODO.md` — point-in-time chores (raw-FDHI cleaning, 3D DEM data).
- `docs/adr/` — locked architectural decisions backing this work.
