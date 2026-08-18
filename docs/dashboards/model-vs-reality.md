# Model vs reality — developer notes

Chart family 1; "Dashboard 1" in the Roadmap build order.

## Purpose

Plots deformation-zone width against scarp height, with the DEM simulation
cloud and a handful of well-measured real earthquakes on the same axes —
the question being whether the simulation lands where the field data does.
The site page
([`subprojects/mkdocs/docs/dashboards/model-vs-reality.md`](../../subprojects/mkdocs/docs/dashboards/model-vs-reality.md))
carries the science; what follows is the machinery.

The fault does not tear along one clean line: it churns up a band of broken,
warped soil and leaves a step behind. DZW is the width of that band, scarp
height the height of the step. The dense faint cloud is simulation; the bold
markers are Chi-Chi, Wenchuan, Kashmir and Kern County 1952 — a handful,
because ruptures measured this thoroughly are rare. Real events falling
inside the simulated cloud is the evidence that the model can be trusted
where field measurements are too sparse to stand alone.

A second dashboard, **Viable Combinations**, ships in the same workbooks: a
coverage matrix answering "which parameter pairings actually have data?"

## Artifacts

| | |
|---|---|
| Published workbook | `dashboards/tableau/dem-model-vs-reality-public.twb` |
| Desktop copy | `dashboards/tableau/dem-model-vs-reality.twb` (Athena; **not** published) |
| Worksheets | `DZW vs Scarp Height`, `Event Map`, `Combinations` |
| Dashboards | `DEM Cloud & Historic Overlays (web)` 800×1200 · `Dashboard 1 — DEM Cloud & Historic Overlays` 1200×800 · `Viable Combinations` 1000×800 |
| Slugs | `DEMCloudHistoricOverlaysweb` · `Dashboard1DEMCloudHistoricOverlays` · `ViableCombinations` |
| Embedded at | site `dashboards/model-vs-reality.md` — the `(web)` variant at 800×1200, and `ViableCombinations` directly at 1000×800 (it has no web twin) |

The landscape original is linked only as the "Open full-size on Tableau
Public" escape hatch.

## Data contract

**One CSV: `dist/csv/unified_observations.csv`** — 11 columns
(`source, dzw, scarp_height, scarp_class, eq_name, magnitude, fault_dip,
cohesion, dem_set, latitude, longitude`), 329,124 rows in the current
export (DEM 329,045 / SURE 56 / FDHI 17 / Kern 6). Only the 79 non-DEM rows
carry lat/lon.

Produced by the `unified_observations` view (`views.py`,
`build_duckdb_views`): a four-branch `UNION ALL` over `dem`, `fdhi_cleaned`,
`sure` and `kern_combined`, each branch requiring **both** axes `> 0` —
which drops nulls, zeros and FDHI's `-999` sentinel in one condition. That
`> 0` is why the field counts are so much smaller than the source tables.

Pinned by:

- `test_smoke.py::test_build_duckdb_views_creates_unified_view` — per-source
  row counts, lat/lon per source, and the magnitude semantics (DEM null,
  FDHI sentinel nulled, SURE via config lookup, Kern pinned).
- `test_smoke.py::test_build_duckdb_views_handles_apostrophe_in_path`
- `test_smoke.py::test_athena_unified_view_sql_shape` — the parked Athena twin.
- `test_sheets.py::test_real_unified_observations_load` — asserts **11
  columns**, which is the number the workbook's embedded text-scan schema
  must agree with.

Nothing pins the workbook side of that schema. If the export gains a
column, `test_real_unified_observations_load` fails and tells you; the
`.twb`'s own `<columns>` block has to be updated by hand.

## Anatomy

### Sheets

- **DZW vs Scarp Height** — the main chart. Disaggregated dual-axis
  scatter: x = `dzw`; rows = `SUM(DEM Scarp_Height) + SUM(Overlay
  Scarp_Height)` with the axes synchronised. Pane 1 is Circle marks (the
  faint cloud, size 0.2959, transparency 153 ≈ 60 % opacity) coloured by `Point
  Color`; no trend line (removed 2026-08-17). Pane 2 is Shape marks forced
  to `:filled/asterisk` in `#000000` — the black field-overlay stars.
- **Event Map** — symbol map, x = `AVG(longitude)`, y = `AVG(latitude)`,
  colour from `Source / Event`, shape from `Event`. A worksheet filter keeps
  `latitude` non-null, which is what excludes the ~329k DEM rows.
- **Combinations** — the coverage matrix. Square marks in a text table:
  rows = `Row Field`, cols = `Col Field` (both `include-empty='true'`),
  colour = `Coverage`, label = `Count`. The only sheet in the family with
  Aggregate Measures **on**.

### Calculated fields

Verbatim from the `-public` workbook.

```
DEM Scarp_Height      IIF([source] = 'DEM', [scarp_height], NULL)
Overlay Scarp_Height  IIF([source] <> 'DEM', [scarp_height], NULL)
```

Exact complements — that is what lets the two halves render as different
mark types on synchronised axes. Break the complement and points appear on
both layers at once.

```
Source / Event  IFNULL([eq_name], [source])
Event           IFNULL([eq_name], 'DEM (Simulation)')
```

Two near-duplicates with **different** null fallbacks and, worse,
different colour palettes (see quirks).

```
Point Color  CASE [Parameters].[Parameter 1]
    WHEN 'Fault_Dip'   THEN STR([fault_dip])
    WHEN 'Scarp_Class' THEN [scarp_class]
    ELSE [Calculation_1191193594212352]
  END
```

`[Calculation_1191193594212352]` is `Source / Event`. Note the third
parameter member, `Source / Event`, has no `WHEN` branch — it is reached
only through `ELSE`.

```
Row Field  CASE [Parameters].[Parameter 2]
  WHEN 'Source'      THEN [source]
  WHEN 'Event'       THEN [Calculation_1302657277816832]
  WHEN 'Scarp_Class' THEN [scarp_class]
  WHEN 'Fault_Dip'   THEN STR([fault_dip])
  WHEN 'Cohesion'    THEN [cohesion]
  WHEN 'DEM Set'     THEN [dem_set]
END
```

`Col Field` is a literal duplicate reading `[Row By (copy)_0975140305281024]`
(the `Col By` parameter) instead. Neither has an `ELSE`.

```
Count     ZN(COUNT([dzw]))
Coverage  IF ZN(COUNT([dzw]))=0 THEN '0 none'
    ELSEIF COUNT([dzw])<20 THEN 'sparse'
    ELSEIF COUNT([dzw])<200 THEN 'moderate'
ELSE 'dense' END
```

### Parameters

Three, all string lists, identical in both workbooks:

| Caption | Internal name | Members | Default |
|---------|---------------|---------|---------|
| Color By | `[Parameter 1]` | Source / Event, Fault_Dip, Scarp_Class | `Scarp_Class` |
| Row By | `[Parameter 2]` | Source, Event, Scarp_Class, Fault_Dip, Cohesion, DEM Set | `Event` |
| Col By | `[Row By (copy)_0975140305281024]` | same six | `Source` |

The Col By parameter's *caption* is "Col By" but its *name* still reads
"Row By (copy)" — grep for the caption, not the name.

### Filters and actions

**No actions at all.** Interactivity is filter cards and parameter controls
only.

Five categorical filters — Event, Eq Name, Fault Dip, Scarp Class, Source —
live in `<shared-views>`, i.e. **"apply to all worksheets using this data
source"**. All five currently exclude nothing. Because they are
data-source-scoped, a card on Dashboard 1 also filters the Viable
Combinations matrix in the same workbook; the zone's owning-sheet name does
not bound its effect.

The only worksheet-local filter is `Event Map`'s `latitude` non-null.

## How to edit safely

1. Build the data first: `egr-build`, then
   `./gradlew :subprojects:python:csvExportAll` (or at least
   `egr-csv --view unified_observations`).
2. Open `dem-model-vs-reality-public.twb` via **File → Open**.
3. **Data → GroundRaptureUnifiedObservationsCSV → Refresh** — the committed
   extract points at a `/var/folders/…/tableau-temp/` `.hyper` (stamped
   2026-08-18) that will not exist on another machine; accept the
   dangling-extract dialog, then refresh.
4. Edit. Before saving, click the **`DEM Cloud & Historic Overlays (web)`**
   tab — the active tab at publish becomes the default view, and the web
   variant is the intended default; the landscape original stays reachable
   through its own slug.
5. **File → Save to Tableau Public As…**, then **File → Save** locally.
6. Re-check the site embed if you touched any dashboard's name or size.

Do not edit the desktop copy to fix something seen on the website — it has
no `(web)` dashboard and reads Athena, not CSV.

## Known quirks

- **The two workbooks are not interchangeable.** The desktop copy connects
  to Athena (`schema=eps_ground_rapture_dev`, warehouse
  `s3://eps-ground-rapture-dev/athena-results/`) plus a `.hyper` dated
  2026-06-18, and holds only two dashboards. Opening it without AWS
  credentials silently serves the stale June extract.
- **`Event` and `Source / Event` still carry conflicting palettes.**
  `Event`: Chi-Chi `#4e79a7`, DEM `#59a14f`, Wenchuan `#76b7b2`, Kern
  `#e15759`, Kashmir `#f28e2b`. `Source / Event`: Chi-Chi `#4e79a7`,
  Wenchuan `#59a14f`, Kern `#76b7b2`, Kashmir `#e15759`, DEM `#f28e2b`.
  Since 2026-08-17 the map colours by `Source / Event` (the calc `Point
  Color` falls through to) and both sheets shape by `Event`, so map and
  scatter agree — but re-encoding either sheet by `Event` reintroduces the
  mismatch. Consolidating the two calcs is the fix; it is an open polish
  item in the Roadmap. The shape palettes disagree the same way.
- **`Point Color` is one string-keyed palette shared across all three Color
  By modes.** As of 2026-08-17 no keys collide (dips: warm ramp `#ffc685`
  → `#9e3d22`; classes: paper palette; events: Tableau 10; `%null%`
  `#b0b0b0`), but a member added to one mode with the same string as
  another mode's member silently shares its colour, and recolouring it
  recolours both.
- **`Row Field` and `Col Field` have no `ELSE`.** Add a member to either
  parameter without editing *both* duplicated formulas and the matrix goes
  blank for that member.
- **`Coverage`'s `'0 none'` bucket is dead.** An empty pairing produces no
  mark for the aggregate string calc to colour, so it renders as blank
  space, and the palette assigns hexes only to dense/moderate/sparse. Open
  polish item.
- **Aggregate Measures is OFF** on the scatter (`<aggregation
  value='false'/>`) even though the shelf pills read `sum:`. That is what
  makes a 329k-point disaggregated cloud possible; ticking it back on
  collapses the cloud to a handful of marks.
- **No trend line in the `-public` workbook.** The pooled OLS line (one
  fit across every colour, `exclude-color='true'`, DEM pane only) was
  disabled 2026-08-16 and removed 2026-08-17 — the Roadmap's "per-colour
  or remove" resolved as remove; the desktop copy still carries it.
  Per-colour fits, if ever wanted, belong in SQL (`dem_regression_lines`
  pattern), not a Tableau trendline.
- **The Event Map's extent is hard-pinned** (`range-type='fixed'`,
  EPSG:3857, spanning roughly the whole world). Pan/zoom will not persist
  and it will not auto-fit to the 79 plotted points.
- **The overlay's shape legend is decorative.** A sheet-level format forces
  `:filled/asterisk` in black regardless of what the displayed legend says.
- **No magnitude filter exists**, though `magnitude` has been in the view
  since 2026-07-31.
- **In the desktop copy the Athena relation `name` is truncated** to
  `unified_observatio`. The `table=` attribute is correct; name-keyed
  tooling will miss it.
- **`notes/chart-families.md` is stale for this family** — it still names
  `dem-overview.twb`, which was renamed. `notes/Roadmap.md` is current.
