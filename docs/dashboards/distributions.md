# Distributions & summary stats — developer notes

Chart families 3 + 4 (paper Figs. 9–12, 15 and 8); "Dashboard 5" in the
Roadmap build order. Built public-first 2026-08-15; no desktop twin.

## Purpose

One parameter-driven histogram of a chosen DEM output, split into
**layered translucent** per-hue distributions (not stacked — nb2 draws
these seaborn-layered at `alpha=0.5`), with historic field measurements
overlaid as full-height needles; plus a mean ± σ summary per scarp
class reconstructing Fig. 8, for which no notebook code exists. The
science is on the site page
([`subprojects/mkdocs/docs/dashboards/distributions.md`](../../subprojects/mkdocs/docs/dashboards/distributions.md)).

## Artifacts

| | |
|---|---|
| Workbook | `dashboards/tableau/dem-distributions-public.twb` — public-first, **no desktop twin** |
| Worksheets | `Distributions` (histogram + needles), `Mean ± σ by class` |
| Dashboard | `Distributions & Summary (web)`, fixed 800×1200 — the only one (a landscape twin was tried and dropped; the six-row summary strip cannot fill a 900-px column) |
| Slug | `DistributionsSummaryweb` |
| Embedded at | site `dashboards/distributions.md` at 800×1200; escape hatch points at itself |
| Specs | `notes/dashboard-5-build-spec.md` (populations, palette, open questions), `notes/2026-08-15/dashboard-5-tableau-walkthrough.md` (click-by-click, while it lives) |

## Data contract

**One union of two CSVs** through a single text-scan connection at the
canonical path:

| CSV | Shape | View |
|-----|-------|------|
| `dist/csv/dem.csv` | 346,834 × 26 | `dem` — passthrough |
| `dist/csv/historic_events.csv` | 2,616 × 5 | `historic_events` — one row per FIELD MEASUREMENT (not per event) |

The union **merges the case-variant column pairs** — historic `dzw` /
`scarp_height` land inside dem's `DZW` / `Scarp_Height` — which is what
lets one `Measure Value` calc serve both layers. `Table Name`
discriminates them.

`historic_events` (in `views.py`): three arms — `fdhi_measurements`
(the raw-flatfile lane; the labelled events only exist there), `sure`,
`kern_combined` — with per-column sentinel filtering (`CASE WHEN x > 0`)
and a row kept when *either* measure survives. Unlike
`unified_observations`, which demands both (a scatter needs x and y; a
reference line needs only its own axis). The view exists only alongside
`fdhi_measurements`, mirroring that table's optionality.

Pinned by `test_historic_events.py`:

- `::test_historic_events_total_and_per_source_rows` — 2,616 =
  FDHI 2,392 + SURE 203 + Kern 21.
- `::test_fdhi_arm_carries_the_nb2_labelled_events` — Wenchuan 250 @
  M 7.9, Kashmir 140 @ 7.6, Killari 3 @ 6.2. (nb2 also labels
  **Bohol**, whose flatfile rows carry neither central measure —
  deliberately absent.)
- `::test_kern_arm_matches_the_hand_compiled_dataset` — 21 rows,
  11 dzw + 16 scarp_height, single label `Kern County (1952)`, M 7.36.
- `::test_view_is_skipped_without_the_flatfile_lane`,
  `::test_sure_arm_magnitudes_are_fully_sourced`, Athena-twin checks.

Fig-8 reconstruction candidates (mean ± sample σ, both populations) are
tabulated in the build spec; the sheet defaults to candidate A (all
stages) with candidate B (final state per trial, 3,434 trials) on the
`Population` parameter. Which one Fig. 8 actually used is open (spec O2)
until the original code surfaces.

## Anatomy

### Parameters

`Measure` (Scarp Height | DZW | Scarp Dip), `Hue By` (Scarp Class |
Density | Depth | Fault Dip | Sediment Strength | FS Depth | Unruptured
Sed), `Population` (All steps | Final state per trial). No bin
parameter — widths are baked per measure.

### Calculated fields (verbatim)

```text
Is DEM          [Table Name] = "dem.csv"
Measure Value   CASE [Measure] WHEN "Scarp Height" THEN [Scarp_Height]
                WHEN "DZW" THEN [DZW] WHEN "Scarp Dip" THEN [Scarp_Dip] END
Hue Value       CASE [Hue By] ... END        -- STRING; lives on Color
Bin Width       CASE [Measure] WHEN "Scarp Height" THEN 0.25
                WHEN "DZW" THEN 1.0 WHEN "Scarp Dip" THEN 5.0 END
Bin             FLOOR([Measure Value] / [Bin Width]) * [Bin Width]
Count DEM       SUM(IF [Is DEM] THEN 1 ELSE 0 END)
Is Final State  { FIXED [Trial] : MAX([Slip]) } = [Slip]
Keep Row        NOT [Is DEM] OR [Population] = "All steps" OR [Is Final State]
Needle Peak     { FIXED : MAX({ FIXED [Bin] :
                  SUM(IF [Is DEM] AND NOT ISNULL([Measure Value]) THEN 1 END) }) }
Needle          MIN(IF NOT [Is DEM] THEN [Needle Peak] END)
Event Label     [eq_name] + " (M " + STR([magnitude]) + ")"
Mean − σ        AVG([Measure Value]) - STDEV([Measure Value])
Mean + σ        AVG([Measure Value]) + STDEV([Measure Value])
```

Spares (defined, unused): `Fault_Dip Band`, `Scarp_Class Family`.

### `Distributions` sheet

Columns `Bin` (**continuous DIMENSION** — a bare numeric calc defaults
to measure; `SUM(Bin)` is one useless mark). Rows `AGG(Count DEM)` +
`AGG(Needle)` as a **Rows dual axis**, synchronized, secondary header
hidden. Histogram card: Bar, `Hue Value` on Color, opacity ≈ 55 %.
Needle card: Bar, black, thinnest Size, `Event Label` on Detail.
**Analysis → Stack Marks → Off** — load-bearing twice over: same-bin
needles would stack into N-events × peak towers, and the layered
histogram is the Figs.-9–12-faithful rendering. `Keep Row = True` filter
**in context** — `Needle Peak` is a FIXED LOD and only context filters
reach it; demote the filter and needle heights stop tracking
`Population`.

### `Mean ± σ by class` sheet

`Scarp_Class` on Rows (manual sort, parents before their collapse
variants), `AVG(Measure Value)` circles colored by `Scarp_Class`,
`Mean ± σ` on Detail feeding a **per-cell reference band** (label none,
light-gray fill). Filters: `Keep Row`, `Is DEM = True`, and
`Scarp_Class` **excludes Null** (~13.7k early-stage rows carry neither
class nor measures).

### Palette (hard-coded hexes — never Assign Palette)

Verbatim from nb2's seaborn palette, alphabetical class order:
Monoclinal `#009ffa`, Monoclinal Collapse `#3f67b1`, Pressure Ridge
`#f47820`, Pressure Ridge Collapse `#af773e`, Simple `#ed2024`, Simple
Collapse `#9f1d20`. Event needles black, per the event-overlay
convention. Entered separately for `Hue Value` (sheet 1) and
`Scarp_Class` (sheet 2) — color maps stick to the field.

## How to edit safely

Everything in
[tableau-editing-notes.md](tableau-editing-notes.md) applies, plus:

- **Do not re-enable Stack Marks** (see above — it breaks both layers
  at once, spectacularly).
- **`Measure Names` jumps onto a Color shelf every time a dual axis is
  created.** Symptom: the legend title grows a ", Measure Names"
  suffix. Drag it off.
- **Keep `Keep Row` a context filter** (gray pill) on `Distributions`.
- Eleven dem columns are hidden in the XML (`Us_x`, `Us_y`, the
  `DZW xmin/xmax` quartet, `Conversion_Factor`, `HD_HW`, `R^2 Value`,
  `Fault_Seed`, `VD_HW`). `Cohesion` and `Set` stay visible as future
  hue candidates; `Us - Ud` stays for a future Fig-8 measure switch.
- The text connection stores the **canonical absolute path**
  (`…/harvard/projects/github/…`). macOS resolves the symlink in the
  file dialog, so any reconnect made on the laptop will silently record
  the real path — re-fix with the string replacement in
  `notes/multi-machine.md`, workbook closed.
- Renaming the dashboard changes its slug and kills the embed
  (`EMBEDS.md`).

## Known quirks

- **Needle x snaps to its bin's edge** (shared Columns pill), an error
  of at most half a bin width — the price of per-measurement
  multiplicity from a single union. Exact-x alternatives (per-event
  reference lines) lose the within-event spread.
- On `Measure = Scarp Dip` the needles vanish: the field arms carry no
  comparable quantity. Correct, not a bug.
- The histogram shows **counts**, where the paper's Fig. 15 uses
  probability — a documented deviation, kept so class proportions stay
  visible.
- Same-event measurements landing in the same bin merge into one
  needle.
- The `>14K nulls` indicator on `Distributions` (hidden) is the
  early-stage DEM population with empty measures — the same rows the
  Null class exclude removes from sheet 2.
