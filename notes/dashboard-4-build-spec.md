# Dashboard 4 build spec — regression & inference (family 6)

> Drafted 2026-08-02 from nb2 ground truth (cells 12/13/27/28, read
> directly) and coefficients computed from the shipped `dem` data.
> Working doc — update as decisions land.

**Question** (family 6): *what law links slip to vertical displacement,
and what slip would produce an observed displacement?* The only family
needing analytical pre-compute.

**Visual anchor**: paper Fig. 14 / Equation 2; nb2 cells 12/13 (single
dip-30 fit + Kern stars), 27/28 (all-dip fit fan, final versions).

## Ground truth (nb2, verified 2026-08-02)

- Scatter: ALL DEM rows, `Slip` × `VDHW` (our column: **`VD_HW`**),
  hue = `Fault_Dip`, "flare" palette (warm ramp, light→dark with dip).
- Per dip ∈ **{20, 30, 40, 45, 50, 60, 70}** (exactly the data's
  uniques): ordinary least squares `VD_HW ~ Slip` **with intercept**,
  fit on that dip's full subset, **no filters**. Line drawn over the
  dip's own Slip range. Equation + r² displayed per dip.
- **Kern back-projection uses the dip-30 fit only**: black stars at
  `((Vertical − b₃₀)/m₃₀, Vertical)` for `kern_combined.Vertical`
  (16 non-null values of 28 rows).

## Computed coefficients (pinned expectations)

| dip | n | slope | intercept | r² |
|----:|-----:|-------:|----------:|------:|
| 20 | 49,551 | 0.3436 | −0.0040 | 0.9979 |
| 30 | 49,453 | 0.5021 | −0.0051 | 0.9987 |
| 40 | 49,551 | 0.6453 | −0.0071 | 0.9990 |
| 45 | 49,251 | 0.7103 | −0.0103 | 0.9993 |
| 50 | 49,251 | 0.7695 | −0.0107 | 0.9993 |
| 60 | 49,551 | 0.8703 | −0.0125 | 0.9993 |
| 70 | 49,251 | 0.9445 | −0.0133 | 0.9993 |

Sanity: slope ≈ **sin(dip)** at every dip (Equation 2's physical
content — vertical displacement = slip × sin(dip)); intercepts ≈ 0.
Kern inferred slip (dip 30): **0.162 … 2.742 m** from Vertical
0.076 … 1.372 m. Good interpretive hook for the MkDocs page later.

## Data-side work (Claude's lane — task file was in notes/2026-08-02/, retired 2026-08-15)

Three DuckDB views in `views.py` (+ Athena twins per existing pattern;
Athena stays parked):

1. **`dem_regression`** — `GROUP BY Fault_Dip` over the dem parquet,
   `regr_slope/regr_intercept/regr_r2("VD_HW", "Slip")` + `COUNT(*)`
   → 7 rows `(fault_dip, n, slope, intercept, r2)`. SQL-only, as the
   Roadmap prescribed.
2. **`dem_regression_lines`** — two endpoint rows per dip
   `(fault_dip, slip, vdhw_hat, point_order)` spanning that dip's
   min/max Slip → 14 rows. Lets Tableau draw the fit fan as line
   marks from data (deterministic, labeled with the exact printed
   equations — chosen over Tableau's native per-color trend lines,
   which recompute client-side and can't be pinned by tests).
3. **`kern_inferred_slip`** — non-null Kern `Vertical` × dem_regression
   cross join → 112 rows (16 × 7 dips)
   `(location_id, vertical, fault_dip, inferred_slip)`. The dashboard
   defaults to dip 30 (nb2/Fig. 14) with the dip as an explorable
   filter/parameter — the other dips come free.

Tests pin the table above (±0.001 on slope/intercept, r² > 0.997,
row counts exact). CSV export tasks for all three (tiny files) for the
Tableau Public twin; `kern_combined.csv` is already exported.

## Tableau side (Michael's lane — walkthrough to follow after the
data lands)

**Public-first, CSV-only** (Tableau Public cannot connect to DuckDB or
Athena): the workbook's data sources are exactly four text files —
`dist/csv/dem.csv` plus the three new exports `dem_regression.csv`,
`dem_regression_lines.csv`, `kern_inferred_slip.csv`. The DuckDB views
exist purely as the pipeline's computation + testing layer feeding
those exports.

- **Scatter sheet**: `Slip` × `VD_HW`, color by `Fault_Dip` (discrete,
  warm ramp echoing "flare"), all 346,834 rows — the Dashboard-3 DEM
  perf lessons apply (hide underlying marks is N/A here; consider
  density/opacity ~20%).
- **Fit-fan overlay**: line marks from `dem_regression_lines`
  (fault_dip on color matching the scatter, path by point_order);
  tooltip/labels carry `y = {slope}x {intercept}` + r² from
  `dem_regression`.
- **Kern stars**: `kern_inferred_slip` filtered to fault_dip = 30
  (parameter-ready), star shapes, black — the existing event-overlay
  convention (black/white + stars).
- Likely one dashboard (Fig. 14 is a single panel); public twin fed by
  `dist/csv/dem.csv` + the three new small CSVs.

## Open questions

- [ ] Combine scatter + lines + stars in one sheet (multi-source
  layering via dual axis) vs a layered dashboard of transparent
  sheets — decide during the build; spec assumes one sheet with
  blended secondary sources or a lines-over-scatter dual axis.
- [ ] Expose the dip choice for Kern stars as a viewer parameter, or
  pin to 30 for figure fidelity (default: pin 30, parameter later).
- [ ] Axis ranges: auto vs fixed to the paper's framing — check the
  typeset Fig. 14 before publish polish.
- [ ] Optional secondary fit `Scarp_Height ~ DZW` (Roadmap mentions
  it as optional) — defer unless Dashboard 5 wants it.
