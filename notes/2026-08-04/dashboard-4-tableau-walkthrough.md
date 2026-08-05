# Dashboard 4 — Fig. 14 build, click-by-click (2026-08-04)

Reproduces paper Fig. 14 (nb2 cell 28): the Slip × VDHW scatter colored
by fault dip, the seven per-dip fit lines, and Kern County's black stars
riding the dip-30 line. One sheet, one union'd data source, CSV-only.
Companion: `notes/dashboard-4-build-spec.md` (coefficients table).

Workbook (proposal): `dashboards/tableau/dem-slip-regression-public.twb`
— the `dem-` prefix fits here. Rename freely; tell Claude what you pick.

## Phase 0 — data source: a three-way union

1. New workbook in Tableau Public app → **Connect → Text file** →
   `dist/csv/dem.csv` (canonical path!). Rename the data source
   `DEM + Fits + Kern`.
2. On the Data Source page, the left **Files** pane lists the sibling
   CSVs. Drag **`kern_inferred_slip.csv`** and drop it **onto the
   dem.csv table chip** on the canvas — release when the drop overlay
   says **Union**. The chip becomes `dem.csv+`.
3. Drag **`dem_regression_lines.csv`** onto that same union chip —
   now three members. (Double-click the chip → the Union dialog lists
   all three, in case you need to verify.)
4. **CHECKPOINT — column merging.** In the preview grid, find how the
   union matched columns (Tableau matches by name; case handling
   varies by version):
   - If `Slip` (dem) and `slip` (lines) merged into ONE column, and
     likewise nothing else collided — good, note it.
   - If they stayed separate (`Slip` and `Slip1`-style), also fine —
     the calcs below have both variants.
   Also note the auto-generated **Table Name** field — everything
   hangs off it.
5. Hide the noise (optional, extract hygiene): from dem.csv keep
   `Slip`, `VD_HW`, `Fault_Dip`, `Scarp_Class`; keep all columns of the
   two small files; hide the rest (or ask Claude to do it in XML after
   your first save).

## Phase 1 — calculated fields (Analysis → Create Calculated Field)

With merged Slip/slip (variant A):

- `X` = `IFNULL([Slip], [Inferred Slip])`
- `Y points` = `IF [Table Name] <> "dem_regression_lines.csv" THEN IFNULL([VD_HW], [Vertical]) END`
- `Y lines` = `IF [Table Name] = "dem_regression_lines.csv" THEN [Vdhw Hat] END`

If Slip/slip stayed separate (variant B), X becomes:
`IFNULL([Slip], IFNULL([Inferred Slip], [Slip1]))` (use whatever
Tableau named the lines file's slip column).

- `Layer` = `CASE [Table Name] WHEN "dem.csv" THEN "DEM model" WHEN "kern_inferred_slip.csv" THEN "Kern County 1952" ELSE "Fit" END`
- `Keep Row` = `[Table Name] <> "kern_inferred_slip.csv" OR [Fault Dip] = 30`
  — the kern file's own `fault_dip` field; Tableau may display it as
  `Fault Dip` with a file suffix or a `1` — pick the one whose values
  are 20…70 on kern rows. This pins the stars to the dip-30 fit
  (Fig.-14 fidelity; the other dips stay available for a parameter
  later).

## Phase 2 — the sheet

6. New worksheet `Slip × VDHW Regression`. Drag **X** → Columns,
   **Y points** → Rows, **Y lines** → Rows (two pills side by side).
7. **Analysis → uncheck Aggregate Measures.**
8. Drag **Keep Row** → Filters → keep **True**.
9. Right-click the **Y lines** pill → **Dual Axis**. Right-click the
   right-hand axis → **Synchronize Axis**. Right-click it again →
   untick **Show Header**.
10. Marks card now has three tabs (All / Y points / Y lines):
    - **Y points** tab: mark type **Shape**. Drag **Layer** → Shape:
      assign DEM model = open circle, Kern County 1952 = the star
      (Shape palette dropdown → the star lives in the default or
      Filled palette; asterisk is an acceptable stand-in). Drag
      **Fault_Dip** (the dem one) → Color → make it **discrete**
      (right-click the pill → Discrete). Size small; opacity ~30 %.
    - **Y lines** tab: mark type **Line**. Drag **Point Order** →
      **Path**. Drag the union'd **fault_dip** (the lines file's) →
      Color, discrete. Size ~2nd notch.
11. **CHECKPOINT — status bar: ≈ 345,900 marks** (345,859 DEM pairs +
    16 stars + 14 line endpoints; a grey "nulls" indicator bottom-right
    is normal — dem rows lacking Slip/VD_HW). Row count 1, column
    count 1... it's one pane, dual axis.
12. Colors: for each of the two color legends → Edit Colors → palette
    **Orange** (or any warm sequential ramp — the paper used seaborn
    "flare"), assign light→dark for 20→70 **identically in both
    legends** so lines land on their point clouds. On the points
    legend, the **Null** color (that's Kern) → **black**.
13. Sanity glance against the spec table: the dip-70 line is the
    steepest (slope 0.94), dip-20 the shallowest (0.34); the 16 black
    stars sit exactly on the dip-30 line between x≈0.16 and x≈2.74.

## Phase 3 — dashboard + publish

14. Axis titles: X → `Slip (m)`, left Y → `Vertical Fault
    Displacement (m)` (right-click axis → Edit Axis → Title). Ranges:
    leave automatic (single sheet — nothing to align with).
15. New Dashboard `Slip Regression & Kern Inference` — size **Custom
    800 × 850** (web-first; Fig. 14 is square-ish). Drop the sheet,
    Fit → Entire View. Remove any stray legends you don't want shown;
    keep the dip color legend.
16. Optional annotation (nice touch): right-click a point on the
    dip-30 line → Annotate → Area: `y = 0.502·x − 0.005 (R² 0.999)` —
    values from `dist/csv/dem_regression.csv`.
17. Hide the worksheet (right-click dashboard tab → Hide All Sheets),
    save the .twb into `dashboards/tableau/`, then **File → Save to
    Tableau Public As…** when you're ready to publish. Ping Claude
    with the workbook name for the XML review + the MkDocs embed
    addition (the site gets a fourth dashboard page).

## If the union misbehaves

Column-merge surprises (step 4) or shape-palette gaps: stop and tell
Claude what the union grid / palette actually shows — the calcs adjust
in one message, and a custom star shape is a 2-minute fix later.
