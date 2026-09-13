# Distributions & summary stats — developer notes

Chart families 3 + 4 (paper Figs. 9–12, 15 and 8); "Dashboard 5" in the
Roadmap build order. Built public-first 2026-08-15; no desktop twin.

## Purpose

One parameter-driven histogram of a chosen DEM output, split into
**layered translucent** per-hue distributions (not stacked — nb2 draws
these seaborn-layered at `alpha=0.5`), with historic field measurements
overlaid as full-height needles; plus **two** summary panels — the
pooled per-class mean ± σ, and the per-slip-increment curves that are
the paper's Figure 8 (shipped 2026-09-13, rev 1.2). The science is on
the site page
([`subprojects/mkdocs/docs/dashboards/distributions.md`](../../subprojects/mkdocs/docs/dashboards/distributions.md)).

## Artifacts

| | |
|---|---|
| Workbook | `dashboards/tableau/dem-distributions-public.twb` — public-first, **no desktop twin** |
| Worksheets | `Distributions` (histogram + needles), `Mean ± σ by class` (pooled, titled *Typical values per class (all stages pooled)*), `Mean ± σ vs slip` (Fig. 8, titled *Mean ± σ as slip accumulates (paper Fig. 8)*) |
| Dashboard | `Distributions & Summary (web)`, fixed 800×1400 — three panels: histogram 33 %, pooled summary 20 %, Fig-8 46 % — the only one (a landscape twin was tried and dropped; the six-row summary strip cannot fill a 900-px column). Grew from 1200 on 2026-09-13 when the Fig-8 panel was added as a third sheet. |
| Slug | `DistributionsSummaryweb` |
| Embedded at | site `dashboards/distributions.md` at 800×1400; escape hatch points at itself |
| Specs | `notes/dashboard-5-build-spec.md` (populations, palette, open questions) |

## Data contract

**One union of two CSVs** through a single text-scan connection at the
canonical path:

| CSV | Shape | View |
|-----|-------|------|
| `dist/csv/dem.csv` | 346,834 × 26 | `dem` — passthrough |
| `dist/csv/historic_events.csv` | 2,616 × 5 | `historic_events` — one row per FIELD MEASUREMENT (not per event) |

…plus a **separate data source** (not a union member — different grain):

| CSV | Shape | View |
|-----|-------|------|
| `dist/csv/dem_slip_bin_stats.csv` | 555 × 11 | `dem_slip_bin_stats` — one row per scarp class per 0.05 m slip bin |

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

### Fig. 8 — the statistic, now known (2026-09-10)

Kristen's original code (`legacy/DEM_slip_averages_figure - part
{1,2}.ipynb`) settles spec O2: Figure 8 is **mean ± sample σ per 0.05 m
slip increment** per scarp class — rows with `s < Slip <= s + 0.05`,
`statistics.stdev`, NaNs dropped per measure — drawn as mean vs slip
with ±σ envelopes and a polynomial fit per class. The published sheet's
pooled per-class mean ± σ (candidate A) is a different summary.

The view for the real thing is **`dem_slip_bin_stats`** →
`dist/csv/dem_slip_bin_stats.csv` (555 rows × 11: `scarp_class`,
`slip_bin` = the bin's lower edge, `n`, and `mean_`/`sd_` for
`scarp_height`, `us_ud`, `dzw`, `scarp_dip`). Bins per class: Monoclinal
100, Monoclinal Collapse 96, Pressure Ridge 100, Pressure Ridge Collapse
100, Simple 88, Simple Collapse 71. Pinned by
`tests/test_dem_slip_bin_stats.py`, which re-runs the notebook cell in
pandas and matches every bin to 1e-9.

Two departures from the notebook, both for the author team: it trims
each class to a hand-picked first `s` (0.25 / 0.40 / 0.25 / 0.25 /
0.65 / 1.85) — the view emits every bin with n ≥ 2 and leaves trimming
to the workbook — and it reads `Convert_Scarp_Dip` from an older table
vintage (`4_05_24_homogeneous_heterogeneous.csv`); `DEM_dataset.csv` has
only `Scarp_Dip`, which the view uses.

**Shipped 2026-09-13** (rev 1.2) as the `Mean ± σ vs slip` worksheet. Its
anatomy is under *Anatomy* below; the click-by-click that built it has been retired.

Two departures from the notebook, both recorded for the author team: it
trims each class to a hand-picked first `s` (0.25 / 0.40 / 0.25 / 0.25 /
0.65 / 1.85) where the view emits every bin with n ≥ 2 — note `Simple`'s
0.65 coincides exactly with where a sample SD first becomes computable,
while the other four sit above our floor, so those look like deliberate
crops; and it reads `Convert_Scarp_Dip` from an older table vintage, where
`DEM_dataset.csv` has only `Scarp_Dip`.

The notebook also fits a polynomial through the means, **degree varying by
measure and by series** (2 for scarp height and `Us − Ud`; 3 for DZW
parents; 4–5 for the DZW and scarp-dip collapse series). Tableau applies
one degree per trend line across a colour encoding, so the shipped panel
draws the binned means themselves and no fit — dense enough, at up to 100
points per class, to carry the same shape.

## Anatomy

### Parameters

`Measure` (Scarp Height | `Us - Ud` | DZW | Scarp Dip), `Hue By` (Scarp
Class | Density | Depth | Fault Dip | Sediment Strength | FS Depth |
Unruptured Sed), `Population` (All steps | Final state per trial). No bin
parameter — widths are baked per measure.

`Measure` is **workbook-global**, so the calcs on `Fig8_Slip_Bins` read it
even though it was created on the `dem` source. `Population` reaches the
histogram and the pooled panel only — the Fig-8 statistic is defined over
all stages.

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

### `Mean ± σ vs slip` sheet (paper Fig. 8)

On the `Fig8_Slip_Bins` source. Columns `slip_bin` as a **continuous
DIMENSION** — it arrives as `SUM(slip_bin)`, one useless mark, and only a
dimension partitions along x. Rows is a **dual axis**: `Measure Values`
(`AVG(Fig8 Lo)`, `AVG(Fig8 Hi)`) and `AVG(Fig8 Mean)`, synchronized,
secondary header hidden. Mean card: Line, size 3.88, full opacity.
Envelope card: Line, size 0.85, transparency 129/255 (≈ 50 %),
`Measure Names` on **Detail** (on Color it would take the palette away
from the classes). `scarp_class` on Color on both. 1,665 marks.

Calculated fields (verbatim):

```text
Fig8 Mean   CASE [Measure] WHEN "Scarp Height" THEN [mean_scarp_height]
            WHEN "Us - Ud" THEN [mean_us_ud] WHEN "DZW" THEN [mean_dzw]
            WHEN "Scarp Dip" THEN [mean_scarp_dip] END
Fig8 SD     same shape over the sd_* columns
Fig8 Lo     [Fig8 Mean] - [Fig8 SD]
Fig8 Hi     [Fig8 Mean] + [Fig8 SD]
```

**Interactivity.** `[Scarp Class Set]` (all six members) sits on the
Filters shelf as *In*; a dashboard **Change Set Values** action on select
rewrites its membership, so clicking a line isolates that class and
clicking the background restores all six (*Removing all values from set
will: Add all values to set*). A second action highlights on hover.
Isolating rescales the y-axis, which is how you can tell the filter is
real rather than a dim.

> Set actions serialize as **`<edit-group-action>`**, not `<action>`, with
> `add-or-remove-marks value='assign'` and
> `selection-clear-set-option='show-all'`. Enumerating `<action>` elements
> finds only the two `tsc:brush` highlights and misses this one entirely.

### Palette (hard-coded hexes — never Assign Palette)

Verbatim from nb2's seaborn palette, alphabetical class order:
Monoclinal `#009ffa`, Monoclinal Collapse `#3f67b1`, Pressure Ridge
`#f47820`, Pressure Ridge Collapse `#af773e`, Simple `#ed2024`, Simple
Collapse `#9f1d20`. Event needles black, per the event-overlay
convention. Entered separately for `Hue Value` (histogram), `Scarp_Class`
on the `dem` source (pooled panel) and `scarp_class` on `Fig8_Slip_Bins`
(Fig-8 panel) — color maps stick to the field, so a new field means
re-entering all six.

The dashboard carries **no colour legend for the Fig-8 panel**; the
pooled panel's legend serves both because the hexes match. Remove the
pooled panel and the Fig-8 one loses its legend with it.

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
