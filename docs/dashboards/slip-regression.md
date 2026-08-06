# Slip regression & Kern inference — developer notes

Chart family 6 (paper Fig. 14 / Equation 2); "Dashboard 4" in the Roadmap
build order.

## Purpose

Regress vertical fault displacement on slip, one OLS fit per fault dip,
then invert the fits to ask what slip would have produced Kern County's
measured verticals. One chart carries three layers: the DEM point cloud,
seven pre-computed fit lines, and sixteen back-projected Kern stars. The
science is on the site page
([`subprojects/mkdocs/docs/dashboards/slip-regression.md`](../../subprojects/mkdocs/docs/dashboards/slip-regression.md)).

The regression itself lives in **SQL, not Tableau** — deliberately. Native
per-colour trend lines recompute client-side and cannot be pinned by tests
(ADR-0003).

## Artifacts

| | |
|---|---|
| Workbook | `dashboards/tableau/dem-slip-regression-public.twb` — the only one; **no desktop twin** |
| Worksheet | `Slip × VDHW Regression` (note the U+00D7 `×`) |
| Dashboard | `Slip Regression & Kern Inference`, fixed 800×850 |
| Slug | `SlipRegressionKernInference` |
| Embedded at | site `dashboards/slip-regression.md` at 800×850. **No `(web)` variant** — the single dashboard is already portrait, so its escape hatch points at itself |
| Specs | `notes/dashboard-4-build-spec.md`, `notes/2026-08-04/dashboard-4-tableau-walkthrough.md` |

## Data contract

**One union of three CSVs**, all through a single text-scan connection
(they share a directory, so Tableau reuses the connection and distinguishes
members by `table=`):

| CSV | Shape | View |
|-----|-------|------|
| `dist/csv/dem.csv` | 346,834 × 26 | `dem` — passthrough; supplies `Slip`, `VD_HW`, `Fault_Dip` |
| `dist/csv/dem_regression_lines.csv` | 14 × 4 | `dem_regression_lines` — two endpoint rows per dip |
| `dist/csv/kern_inferred_slip.csv` | 112 × 4 | `kern_inferred_slip` — 16 verticals × 7 dips |

`dist/csv/dem_regression.csv` (7 × 5) is exported and heavily tested but
**not connected** — zero references in the XML. Only its endpoints matter
to Tableau, and those are pre-materialised into `dem_regression_lines`. Its
numbers reach the dashboard through the frozen annotation string and the
site prose only.

The views, from `views.py`:

```sql
dem_regression        regr_slope("VD_HW","Slip"), regr_intercept(...), regr_r2(...)
                      GROUP BY "Fault_Dip"          -- DuckDB regr_* take (y, x)
dem_regression_lines  bounds CTE (MIN/MAX Slip per dip) × point_order 0|1,
                      vdhw_hat = slope*slip + intercept
kern_inferred_slip    kern_combined CROSS JOIN dem_regression,
                      inferred_slip = (vertical - intercept) / slope
```

Pinned by `test_regression_views.py` — the most thoroughly tested part of
the pipeline:

- `::test_dem_regression_has_exactly_the_seven_modelled_dips`
- `::test_dem_regression_coefficients` — parametrized over a pinned table:
  dip 20 → slope 0.3436, 30 → 0.5021, 40 → 0.6453, 45 → 0.7103,
  50 → 0.7695, 60 → 0.8703, 70 → 0.9445.
- `::test_dem_regression_lines_has_two_endpoints_per_dip` (14 rows),
  `::test_dem_regression_lines_endpoints_lie_on_the_fit`,
  `::test_dem_regression_lines_span_each_dips_own_slip_range`
- `::test_kern_inferred_slip_is_every_vertical_by_every_dip` (112 rows,
  7 dips), `::test_kern_inferred_slip_range_at_dip_30`,
  `::test_kern_inferred_slip_inverts_the_fit`
- `::test_athena_twins_exist_for_each_regression_view` and friends.

The fixture rebuilds the views from Parquet into a temp DuckDB — it does
**not** query the committed `eps.duckdb`, so the tests genuinely exercise
`views.py`.

The slopes come out ≈ sin(dip), which is Equation 2's physical content.
That is left as a comment in `views.py` rather than an assertion: it is a
property of the data, not a constraint the pipeline should impose.

## Anatomy

### The sheet

One dual-axis pane. Columns = `SUM([X])` titled "Slip (m)"; Rows =
`SUM([Y points])` + `SUM([Y lines])` titled "Vertical Fault Displacement
(m)", the second axis synchronised with its header hidden. Aggregate
Measures is **off**, so the `SUM(...)` pill names are row-level.

- **Pane 1 (Y points)** — Automatic marks; Colour = `Point Color`,
  Shape = `Layer`, Size = `Layer`; size 2.2585, transparency 180 (~70 %).
- **Pane 2 (Y lines)** — Line marks; Path = `SUM([point_order])`,
  Detail = `Point Color`, and a flat `mark-color = #000000`. The seven fit
  lines are **black**, not ramp-coloured.

Colour palette on `Point Color`, hard-coded hexes: Kern County 1952
`#000000`, 70 `#9e3d22`, 60 `#ba4c23`, 50 `#d55b21`, 45 `#ed6f20`,
40 `#f48e32`, 30 `#f6ad51`, 20 `#ffc685`. Shapes on `Layer`: Kern →
`:filled/asterisk`, Fit → `:filled/square`, DEM model → circle. Size is a
catsize encoding, min 0.0886 (the cloud) to max 1 (the stars).

One area annotation, hand-typed: `y = 0.502·x − 0.005 (R² 0.999)`.

### Calculated fields

Verbatim:

```
X         IFNULL([Slip], [inferred_slip])

Y points  IF [Table Name] <> "dem_regression_lines.csv" THEN IFNULL([VD_HW], [vertical]) END

Y lines   IF [Table Name] = "dem_regression_lines.csv" THEN [vdhw_hat] END

Keep Row  [Table Name] <> "kern_inferred_slip.csv" OR [Fault_Dip] = [Parameters].[Parameter 6111666072276998]

Point Color  IF [Table Name] = "kern_inferred_slip.csv" THEN "Kern County 1952"
             ELSE STR([Fault_Dip])
             END

Layer     CASE [Table Name]
            WHEN "dem.csv" THEN "DEM model"
            WHEN "kern_inferred_slip.csv" THEN "Kern County 1952"
            ELSE "Fit"
          END
```

`X` works because Tableau's union merged the lines file's `slip` into
`dem`'s `Slip` case-insensitively, so both DEM and fit-line rows populate
`[Slip]` and only Kern rows fall through to `[inferred_slip]`. This is the
walkthrough's "variant A"; the `[Slip1]` fallback of variant B is **not**
present and must not be reintroduced.

`Keep Row` thins `kern_inferred_slip`'s 112 rows to the 16 belonging to the
chosen dip; DEM and fit rows always pass.

### Parameters

One: **Kern Assumed Dip**, `[Parameter 6111666072276998]`, integer list,
allowable values 20/30/40/45/50/60/70 (exactly the modelled dips), default
30. Consumed only by `Keep Row`. Surfaced as a compact parameter control in
the 160 px right strip.

### Filters and actions

- `Keep Row = True` — row-level, not exposed.
- `Fault_Dip` — all members by default, exposed as a dashboard card. Because
  `Fault_Dip` is the merged union column, this one control filters cloud,
  fit lines and stars together.
- A manual sort on `Point Color` forces "Kern County 1952" to the top of
  the legend, then 20…70.
- One action, `Highlight Dip`: hover-brush on `Point Color`, source and
  target both this dashboard. No filter, URL or parameter actions.

Right-strip zones top to bottom: Fault Dip filter, Shape legend, Colour
legend, Kern Assumed Dip control. The Size legend exists on the worksheet
but is not placed on the dashboard.

## How to edit safely

1. `egr-build`, then export at least `dem`, `dem_regression_lines` and
   `kern_inferred_slip` (`csvExportAll` does all of them).
2. Open via **File → Open**. The extract points at a macOS temp `.hyper`
   that will be gone; Tableau rebuilds it from the CSVs — which is why they
   must exist first.
3. Sanity-check the mark count: ≈ 345,889 (345,859 cloud + 16 stars + 14
   line endpoints). `dem.csv` has 346,834 rows but only 345,859 have both
   `Slip` and `VD_HW` — that figure is the sum of `n` across
   `dem_regression`. A materially different count means the union or a calc
   regressed.
4. Publish and save locally, then commit the `.twb` — it is XML, so the
   diff shows exactly what your edit changed.

Never rename a CSV export. Every calculated field keys on Tableau's
`[Table Name]` discriminator using the literal filenames.

## Known quirks

- **Everything keys on `[Table Name]`** with literal filenames
  (`"dem.csv"`, `"kern_inferred_slip.csv"`, `"dem_regression_lines.csv"`).
  Renaming an export silently breaks `Layer`, `Y points`, `Y lines` and
  `Keep Row` with no Tableau error — you just get blank or mixed-up marks.
- **The union merged columns case-insensitively**: `slip` → `Slip`,
  `fault_dip` → `Fault_Dip`. `X`, `Keep Row` and the Fault Dip quick filter
  all depend on that. If a future Tableau stops merging (producing `Slip1`
  / `Fault Dip1`), all three break at once.
- **Consequence: the Fault Dip filter cannot be scoped to one layer.**
  Unchecking a dip removes its cloud band, its fit line, and — if it is the
  parameter's dip — its Kern stars, simultaneously. Intentional, but it
  means you cannot show all fits over a single dip's cloud.
- **It is one connection, not three.** `grep`ping for three
  `<connection class='textscan'>` elements will mislead you.
- **The fit lines are black**, because `Point Color` sits on Detail rather
  than Colour and the pane sets a flat `#000000`. This contradicts the
  build spec and the walkthrough, which both asked for ramp-matched
  colours; the shipped workbook and the site page ("seven black lines") are
  the truth.
- **All eight colours are hard-coded hexes**, not a named palette. Clicking
  "Assign Palette" in Edit Colors destroys them with nothing to restore
  from.
- **The legend order is a manual-sort dictionary.** An eighth dip appends
  at the end unless you edit it. The current dips sort correctly by luck —
  `"20"`…`"70"` happen to be lexicographically ordered; a dip of 5 or 100
  would not be.
- **The annotation is frozen text.** `y = 0.502·x − 0.005 (R² 0.999)` is
  hand-typed and pinned to axis coordinates. It does not follow the Kern
  Assumed Dip parameter and does not read `dem_regression.csv` — move the
  parameter to 45 and the label still shows the dip-30 equation. It uses
  U+2212 and U+00B7, not ASCII.
- **The Kern dip is a live parameter**, not pinned to 30 as the build spec's
  default assumed. That open question was resolved in favour of exposing it.
- **The Kern marker is `:filled/asterisk`, not a true star** — the
  walkthrough permitted the substitution. `"Fit"` maps to `:filled/square`
  but never renders, since fit rows draw only on the Line pane.
- **Mark sizing is deliberately extreme** (catsize 0.0886 → 1) and
  transparency is 180/255, not the ~30 % the walkthrough suggested.
  Resetting the Size legend re-inflates the cloud and hides everything.
- **Aggregate Measures is off** despite `sum:`-flavoured pill names.
  Turning it on collapses the cloud to one point and one line.
- **The worksheet is not hidden**, despite walkthrough step 17. The site is
  unaffected only because the embed passes `hide-tabs`.
- **The sheet name contains U+00D7** (`Slip × VDHW Regression`). Any script
  matching sheet names needs a UTF-8 locale.
- **`kern_inferred_slip.csv` holds 112 rows but only 16 ever draw.** The 16
  come from 28 rows in `kern_combined` — 12 have a null `Vertical`.
