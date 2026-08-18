# Response curves — developer notes

Chart family 2; "Dashboard 2" in the Roadmap build order.

## Purpose

A driver→response scatter over the DEM trials: pick what drives the model
(slip, or a magnitude derived from it), pick what responds (scarp height,
DZW, scarp dip, `Us - Ud`), pick what to colour by, and read off one OLS
trend line per colour. Three parameters, one worksheet, ~333k marks. The
science is on the site page
([`subprojects/mkdocs/docs/dashboards/response-curves.md`](../../subprojects/mkdocs/docs/dashboards/response-curves.md)).

## Artifacts

| | |
|---|---|
| Published workbook | `dashboards/tableau/dem-response-curve-public.twb` |
| Desktop copy | `dashboards/tableau/dem-response-curve.twb` (Athena; **not** published) |
| Worksheet | `Response Curves` — the only one, in both files |
| Dashboards | `DEM Response Curves (web)` 800×1000 · `DEM Response Curves` 1200×800 |
| Slugs | `DEMResponseCurvesweb` · `DEMResponseCurves` |
| Embedded at | site `dashboards/response-curves.md` — the `(web)` variant at 800×1000; the landscape original is the escape-hatch link only |

The `(web)` variant differs in **layout only** — same worksheet, same
calcs, same parameters, same caption. Landscape docks the legend and three
parameter controls in a 160 px right rail; `(web)` floats them along the
bottom. Do not treat them as two analyses.

## Data contract

**One CSV: `dist/csv/dem.csv`** — 346,834 rows × 26 columns, ~73 MB.
Header: `Trial, Depth, Density, Cohesion, Sediment_Strength, Set,
Fault_Dip, Fault_Seed, FS_depth, UnrupturedSed, Conversion_Factor, Slip,
VD_HW, HD_HW, Scarp_Height, Us - Ud, Us_x, Us_y, DZW, DZW xmin,
DZW xmin_y, DZW xmax, DZW xmax_y, Scarp_Dip, Scarp_Class, R^2 Value`.

Produced by the `dem` view — a plain passthrough,
`SELECT * FROM read_parquet(.../dem/data.parquet)`. This family touches
**none** of the other eleven views.

Pinned by:

- `test_smoke.py::test_build_duckdb_views_creates_unified_view` and
  `::test_build_duckdb_views_optional_fdhi_measurements` — that the `dem`
  view gets created at all.
- `test_csvexport.py` (whole module) — the `egr-csv` contract: header + rows,
  the default `dist/csv/<view>.csv` path the workbook hard-codes, the
  identifier guard, case-insensitivity.
- `test_smoke.py::test_sanitize_column_real_world_names` — pins
  `Us - Ud` → `us_ud` and `R^2 Value` → `r_2_value`, which is exactly the
  rename that makes the desktop formulas differ from the public ones.

**Gap worth knowing:** no test asserts anything about `dem.csv`'s own
column set, and none pins the `dem` view's schema. The CSV↔workbook
contract is unpinned in both directions.

## Anatomy

### The sheet

`Response Curves` — Circle marks; x = `SUM(Driver Value)`,
y = `SUM(Response Value)`, colour = `Condition`. `<aggregation
value='false'/>` (Aggregate Measures OFF), so those `sum:` pills draw one
disaggregated circle per model stage. `<trendline enabled='true'
fit='linear' exclude-color='false' enable-confidence-bands='false'/>` —
one OLS line per colour, no bands. `mark-transparency` is 90 — on
Tableau's 0-255 scale, so roughly 35 % opacity, not 90 %.

The two workbooks' `<table>` blocks are structurally the same chart, but
they are not textually interchangeable: besides the datasource name, the
desktop copy binds lowercase Glue identifiers where the public copy binds
the CSV headers, and the two `<datasource-dependencies>` blocks appear in
opposite order.

### Calculated fields

**Public (CSV) copy** — verbatim:

```
Magnitude       6.94 + 1.14*LOG([Slip])

Driver Value    CASE [Parameters].[Parameter 1]
                  WHEN 'Slip'      THEN [Slip]
                  WHEN 'Magnitude' THEN [Calculation_5561481032470528]
                END

Response Value  CASE [Parameters].[Parameter 2]
                  WHEN 'Scarp_Height' THEN [Scarp_Height]
                  WHEN 'DZW'          THEN [DZW]
                  WHEN 'Scarp_Dip'    THEN [Scarp_Dip]
                  WHEN 'Us - Ud'      THEN [Us - Ud]
                END

Condition       CASE [Parameters].[Parameter 3]
                  WHEN 'Scarp_Class'       THEN [Scarp_Class]
                  WHEN 'Fault_Dip'         THEN STR([Fault_Dip])
                  WHEN 'Cohesion'          THEN [Cohesion]
                  WHEN 'Set'               THEN [Set]
                  WHEN 'Density'           THEN STR([Density])
                  WHEN 'Sediment_Strength' THEN STR([Sediment_Strength])
                END
```

**Desktop (Athena) copy** — same formulas against sanitized Glue
identifiers: `[slip]`, `[scarp_height]`, `[dzw]`, `[scarp_dip]`, `[us_ud]`,
`[scarp_class]`, `[fault_dip]`, `[cohesion]`, `[set]`, `[density]`,
`[sediment_strength]`. The `WHEN 'Us - Ud'` literal stays as-is in both:
it matches the parameter *member*, not the field name.

`Driver Value` references Magnitude by its internal id, not its caption.
In `Condition`, only `STR([Fault_Dip])` is doing real work — Density and
Sediment_Strength are already strings; those `STR()` calls are no-ops kept
for symmetry.

### Parameters

All three are string lists.

| Caption | Name | Members | Default |
|---------|------|---------|---------|
| Driver | `[Parameter 1]` | Slip, Magnitude | `Slip` |
| Response | `[Parameter 2]` | Scarp_Height, DZW, Scarp_Dip, `Us - Ud` | `Scarp_Height` |
| Condition By | `[Parameter 3]` | Scarp_Class, Fault_Dip, Cohesion, Set, Density, Sediment_Strength | `Scarp_Class` |

Each is duplicated in **five** places in the public workbook (four in the
desktop copy, which has no `(web)` dashboard): the inline `Parameters`
datasource, the CSV datasource's `<datasource-dependencies>`, the
worksheet's, and one per dashboard. `grep -c param-domain-type` returns 15
= 3 parameters x 5. Edit through the UI, not by hand — a hand edit that
misses a copy leaves the stale value live somewhere.

### Filters and actions

**Neither, anywhere.** Zero `<filter>` and zero `<action>` elements in both
workbooks. Every interaction is a parameter control plus one colour legend.
Consequence: nothing subsets the data — not even the 3,434 rows with
`Slip = 0`. The mark count is still below `dem.csv`'s 346,834 rows,
because a null Response draws nothing: 333,159 marks at the default
Scarp_Height (and for `Us - Ud`), 333,148 for DZW, 330,187 for Scarp_Dip.

## How to edit safely

1. `egr-build`, then `egr-csv --view dem` (or `csvExportAll`).
2. Open `dem-response-curve-public.twb` via **File → Open**.
3. **Data → GroundRaptureDEM-CSV → Refresh.** The committed extract is
   stamped 2026-06-25 and predates every export since. Until you
   refresh, nothing you changed upstream is visible.
4. Edit. Click the **`DEM Response Curves (web)`** tab before saving —
   whatever is active at publish time becomes the default view, and the
   web variant is the intended default; the landscape original stays
   reachable via its own slug.
5. **File → Save to Tableau Public As…**, then **File → Save** locally.

Never copy a calculation between the desktop and public copies: the
identifiers differ.

## Known quirks

- **Switching Driver to Magnitude silently drops 3,434 rows.** Tableau's
  `LOG()` is base-10 and returns null for non-positive input; `dem.csv` has
  exactly 3,434 rows at `Slip = 0` — one initial stage per trial, and there
  are exactly 3,434 trials. Those points vanish from the plot and from
  every trend fit, with no filter card or null indicator to explain it.
- **Magnitude is not an independent variable.** It is computed from slip
  (`6.94 + 1.14*LOG([Slip])`), so any "effect of magnitude" read off this
  dashboard is the effect of slip. The site page carries an explicit
  warning admonition — keep it.
- **Aggregate Measures is OFF** while both pills read `sum:`. The XML looks
  like an aggregate chart and is not one. Turning it on collapses 346k
  circles to one point per Condition and destroys the trend lines.
- **Six within-Cohesion colour collisions.** One shared discrete palette
  serves all six Condition domains, and Cohesion has 26 distinct values
  against a ~20-colour palette: `1.00E+05`/`R7` both `#a0cbe8`,
  `5.00E+05`/`C` both `#f1ce63`, `1.00E+06`/`R9` both `#ffbe7d`,
  `1.50E+06`/`S` both `#8cd17d`, `2.00E+06`/`B` both `#b6992d`, `A`/`F`
  both `#499894`. Two different cohesion groups draw the same colour *and*
  the same-coloured trend line.
- **Condition By = Sediment_Strength has no saved colours at all** — zero
  hits in either workbook's colour map. Tableau auto-assigns, so that one
  setting's colours are unstable across re-opens and republishes.
- **`Scarp_Class` contains nulls**, and the palette maps `%null%` to
  `#b0b0b0` (neutral grey) — "Null" is a legend member, not an absence.
- **The axis titles are static.** Overridden (2026-08-17) to "Driver (Slip
  m / Magnitude)" and "Response (m; ° for Scarp Dip)", so the switch
  between metres (Scarp_Height, DZW, `Us - Ud`) and degrees (Scarp_Dip) is
  at least named on screen; they still do not change with the parameter.
- **The desktop copy reads nothing from `dist/csv/`.** Two Athena
  connections, zero text-scan. Chasing a bug seen on the website means the
  `-public` file.
- **Both extracts live in `~/Documents/My Tableau Repository/Datasources/`**
  — machine-private paths that never sync. `notes/multi-machine.md` records
  this as the cause of the 2026-08-03 breakage.
- **The datasource is referenced by an opaque generated id**
  (`federated.1or8g8o1xpy8wd1a368cu1icvhuo`, caption `GroundRaptureDEM-CSV`)
  throughout the pills, the colour encoding and both dashboards' legend
  zones. Deleting and re-creating the connection mints a new id and orphans
  every reference — on a schema break (SQLSTATE 42703), re-pick the *same*
  file via Data Source → Connections → Edit Connection.
- **`notes/chart-families.md` drifted**: it lists `Convert_Scarp_Dip` and
  `VDHW` as responses here. Neither exists in either workbook — `VD_HW` was
  deliberately folded into Dashboard 4. Don't add them back without
  checking there first.
- **There is no build spec for this family.** It predates them (built
  2026-06-17, published 2026-06-25).
- **The caption zone contains a stray `Æ` run** between its two paragraphs
  — a Tableau paragraph-break artefact. Preserve it when hand-editing, or
  the paragraphs merge.
