# Dashboard 5 — distributions & mean ± σ, click-by-click (2026-08-15)

Builds the family-3 faceted histograms (paper Figs. 9–12, 15) and the
family-4 mean ± σ summary (Fig. 8 reconstruction) in one public-only
workbook. Companion spec: `notes/dashboard-5-build-spec.md` (candidate
tables, open questions O1–O5). Traps reference:
`docs/dashboards/tableau-editing-notes.md` — the usual rules apply
throughout (File→Open only, extracts required, canonical paths, STRING
calcs on Detail for green pills, hard-coded hexes, never edit the .twb
while open).

**Prerequisite:** the data lane has landed — `dist/csv/historic_events.csv`
exists and `egrBuildAndExport` has run clean. Do not start before.

Workbook (proposal): `dashboards/tableau/dem-distributions-public.twb`.
Rename freely; tell Claude what you pick.

## Phase 0 — data source: dem + historic union

1. Tableau Public app → **Connect → Text file** →
   `/Users/misha/harvard/projects/github/eps-ground-rapture/dist/csv/dem.csv`
   (the **canonical** path — navigate via `projects`, not `~/harvard/github`).
   Rename the data source `DEM + Historic`.
2. Drag **`historic_events.csv`** from the left Files pane onto the
   `dem.csv` chip — release on the **Union** overlay. Chip becomes
   `dem.csv+`.
3. **CHECKPOINT — column merge.** In the preview, confirm the
   case-variant pairs merged into single columns: `DZW`+`dzw`,
   `Scarp_Height`+`scarp_height` (union merges case-variants — the D3
   experience). Note the auto `Table Name` field. If they did NOT merge,
   stop and tell Claude which names appeared; the calcs below assume the
   merged (variant-A) shape and have IFNULL fallbacks otherwise.
4. ~~Extract hygiene~~ — **skip; Claude's lane** (agreed 2026-08-15).
   After your first Save As, Claude hides the unused dem columns in the
   XML (`Us_x`, `Us_y`, the `DZW xmin/xmax…` quartet,
   `Conversion_Factor`, `HD_HW`, `R^2 Value`, `Fault_Seed`, `VD_HW`),
   keeping `Cohesion` + `Set` (Roadmap's future hue candidates) and
   everything from historic_events — in the same pass as the path audit.

**Bridge to a worksheet (do this before Phases 1–2):** parameters and
calculated fields can only be created from a worksheet's Data pane. Click
the **`Sheet 1`** tab in the bottom tab bar (Tableau creates it
automatically; the orange "Go to Worksheet" hint points there). The Data
pane on the left now lists all fields — Phases 1–2 happen in it, and in
Phase 3 this same Sheet 1 *becomes* the Distributions sheet.

## Phase 1 — parameters

Create each one from the Data pane: click the **▾ menu at the pane's top
right** (or right-click empty space in the pane) → **Create Parameter…**

- `Measure` — String, list: `Scarp Height`, `DZW`, `Scarp Dip`.
  Default `Scarp Height`.
- `Hue By` — String, list: `Scarp Class`, `Density`, `Depth`,
  `Fault Dip`, `Sediment Strength`, `FS Depth`, `Unruptured Sed`.
  Default `Scarp Class`.
- `Population` — String, list: `All steps`, `Final state per trial`.
  Default `All steps` (spec candidate A).

(No bin parameter — bin widths are per-measure and switch automatically
with `Measure`, via the `Bin Width` calc in Phase 2. Clarified
2026-08-15; an earlier draft had a manual `Bin Size` parameter here.)

Show `Measure`, `Hue By`, `Population` on the dashboards later.

## Phase 2 — calculated fields

Create each via **Analysis → Create Calculated Field…** (or the same Data
pane ▾ menu), name it exactly as below, paste the formula:

- `Is DEM` = `[Table Name] = "dem.csv"`
- `Measure Value` =
  `CASE [Measure] WHEN "Scarp Height" THEN [Scarp_Height] WHEN "DZW" THEN [DZW] WHEN "Scarp Dip" THEN [Scarp_Dip] END`
  (post-union this covers historic rows too for SH and DZW; historic
  `Scarp_Dip` is null — event lines simply vanish on the dip measure,
  which is correct.)
- `Hue Value` (STRING — it will sit on Color/Detail; never a green pill):
  `CASE [Hue By] WHEN "Scarp Class" THEN [Scarp_Class] WHEN "Density" THEN STR([Density]) WHEN "Depth" THEN STR([Depth]) WHEN "Fault Dip" THEN STR([Fault_Dip]) WHEN "Sediment Strength" THEN STR([Sediment_Strength]) WHEN "FS Depth" THEN STR([FS_depth]) ELSE STR([UnrupturedSed]) END`
- `Is Final State` = `{ FIXED [Trial] : MAX([Slip]) } = [Slip]`
  (Trial is globally unique — spec, "B" table note)
- `Keep Row` = `NOT [Is DEM] OR [Population] = "All steps" OR [Is Final State]`
- `Bin Width` =
  `CASE [Measure] WHEN "Scarp Height" THEN 0.25 WHEN "DZW" THEN 1.0 WHEN "Scarp Dip" THEN 5.0 END`
  — widths follow nb2's own binning (DZW: 50 bins over 0–50 m → 1 m;
  SH: 20 bins over ≈0–5 m → 0.25 m; dip: 5° → 18 bins across 0–90°).
  O4 re-checks them against the typeset figures before publish polish.
- `Bin` = `FLOOR([Measure Value] / [Bin Width]) * [Bin Width]` (continuous)
- `Count DEM` = `SUM(IF [Is DEM] THEN 1 ELSE 0 END)`
- `Event X` = `IF NOT [Is DEM] THEN [Measure Value] END`
- `Event Label` = `[Eq Name] + " (M " + STR([Magnitude]) + ")"`
  — historic rows are **one per measurement** (nb2 fidelity), so expect
  *several* thin lines per event; the within-event spread is the point.
  Filter events via `Eq Name` + `Source` (default set: Kern County
  (1952) from the Kern arm, Wenchuan / Kashmir / Killari from FDHI —
  spec O5).
- `Fault_Dip Band` = `STR(FLOOR([Fault_Dip]/10)*10) + "–" + STR(FLOOR([Fault_Dip]/10)*10 + 10)` (spare; for a banded hue later)
- `Scarp_Class Family` = `REPLACE([Scarp_Class], " Collapse", "")` (spare)

## Phase 3 — sheet 1: `Distributions`

5. Use the `Sheet 1` you're already in: double-click its bottom tab and
   rename it **`Distributions`**. Filters shelf: `Keep Row` = True.
6. Drag `Bin` → Columns, then **right-click the pill → Dimension**
   (keep it Continuous/green — a bare numeric calc defaults to a
   measure, and `SUM(Bin)` is one useless mark). Drag `Count DEM` →
   Rows (it shows as `AGG(Count DEM)`). Marks card: **Automatic → Bar**.
   That is the histogram.
   **CHECKPOINT — if you see a cloud of circles at heights 0/1 and the
   status bar counts ~300k marks**, Aggregate Measures is off (Show Me
   can silently do this): Analysis menu → tick **Aggregate Measures**
   (seen live 2026-08-15). A **">14K nulls" badge** is expected — rows
   with no value on the *current* measure (e.g. dzw-only historic rows
   while Measure = Scarp Height). Right-click it → **Hide Indicator**;
   never "Filter Data" (that would drop those rows from the sheet for
   real).
7. Color: `Hue Value`. With `Hue By` = Scarp Class, apply the six
   canonical hexes — **taken verbatim from nb2's seaborn palette**
   (classes in alphabetical order, parent/darker-child pairs):
   Monoclinal `#009ffa`, Monoclinal Collapse `#3f67b1`,
   Pressure Ridge `#f47820`, Pressure Ridge Collapse `#af773e`,
   Simple `#ed2024`, Simple Collapse `#9f1d20`.
   How: right-click the `Hue Value` legend → Edit Colors… → select a
   class → **double-click its swatch** → enter the hex → repeat.
   **Never Assign Palette.** Leave the `Null` item alone (historic rows;
   zero-height, invisible). Z-order = legend order; alphabetical already
   matches the paper's grouping — don't reorder.
8. Historic verticals, plan A′ (data-driven needles; **corrected
   2026-08-15** — the original plan A put the dual axis on Columns,
   where a Gantt can only draw *horizontal* dashes, and let `Event X`
   aggregate to a meaningless SUM. Vertical needles = dual axis on
   **Rows**):
   - Calcs (**A″ correction 2026-08-15**: the first cut sized needles
     with `WINDOW_MAX([Count DEM])` — a table calc only sees its own
     markset, all historic there, so Count DEM = 0 and every needle got
     size 0/invisible. An LOD reads the data instead):
     `Needle Peak` =
     `{ FIXED : MAX({ FIXED [Bin] : SUM(IF [Is DEM] AND NOT ISNULL([Measure Value]) THEN 1 END) }) }`
     and `Needle` = `MIN(IF NOT [Is DEM] THEN [Needle Peak] END)`
     (no `Needle Height` field — the needle pill itself is full height).
   - Drag `Needle` → Rows, right of `AGG(Count DEM)` → right-click the
     pill → **Dual Axis** → right-click the new right-hand y-axis →
     **Synchronize Axis** → same menu, uncheck **Show Header**.
   - On the `Needle` marks card: mark type **Bar** (not Gantt); drag OFF
     `Measure Names` / `Hue Value` if present (Bin's card keeps
     `Hue Value` on Color — check `Measure Names` didn't sneak on
     there either); Color → black; Size slider → far left (thinnest);
     `Event Label` → Detail.
   - **Filters: right-click `Keep Row: True` → Add to Context** (gray
     pill). FIXED LODs respect only context filters — this is what makes
     needle height track the `Population` parameter.
   - **Analysis → Stack Marks → Off** (seen live 2026-08-15: with
     stacking on, same-bin needles pile into N-events × peak towers —
     650K axes). Sheet-wide switch, and that is a feature: nb2's
     histograms are seaborn-layered at `alpha=0.5`, NOT stacked, so the
     unstacked histogram is the Figs. 9–12-faithful rendering. Finish
     the match on the `AGG(Count DEM)` card: **Color → Opacity ≈ 50–60%**
     (needles' card stays 100%).
   - Recurring nuisance: `Measure Names` jumps onto the histogram card's
     Color whenever a dual axis forms (legend then reads "Hue Value,
     Measure Names"). Drag it off; only `Hue Value` colors the bars.
     Apply the step-7 hexes only after that, on the clean legend.
   - Result: thin black full-height needles at each historic
     measurement's bin (x snaps to the bin edge — ≤ half a bin width,
     visually negligible; the price of per-measurement multiplicity).
     Same-event measurements in the same bin merge into one needle.
   **CHECKPOINT:** if this still fights, fall back to plan B: no dual
   axis; static reference lines (Analytics → Reference Line, value =
   parameter), one per default event, at per-event medians Claude
   computes from `historic_events.csv`. Exact x, but one line per event.
9. Tooltip: measure name (the `Measure` parameter inserts directly),
   bin range, count, hue value.

## Phase 4 — sheet 2: `Mean ± σ by class`

**Palette reference** (same six hexes as step 7, repeated here so there
is no scrolling; NOTE this sheet colors by the raw `Scarp_Class` field,
not `Hue Value` — color assignments stick to the field, so enter the
hexes once more for `Scarp_Class` and Tableau remembers them for that
field everywhere. Full opacity here — the 50–60% was histogram-only):

| Class | Hex | Class | Hex |
|---|---|---|---|
| Monoclinal | `#009ffa` | Monoclinal Collapse | `#3f67b1` |
| Pressure Ridge | `#f47820` | Pressure Ridge Collapse | `#af773e` |
| Simple | `#ed2024` | Simple Collapse | `#9f1d20` |

10. New worksheet: click the **new-sheet icon** (single small grid with a
    `+`) just right of the `Distributions` tab, or right-click the tab →
    New Worksheet. Rename it **`Mean ± σ by class`**. Filters:
    `Keep Row` = True; `Is DEM` = True.
11. Rows: `Scarp_Class` (sort manually: Monoclinal, Monoclinal Collapse,
    Pressure Ridge, Pressure Ridge Collapse, Simple, Simple Collapse —
    Sort → Manual, not field-sorted; the paper groups parents with their
    collapse variants).
12. Columns: `AVG([Measure Value])`. Mark: Circle, sized up, colored by
    `Scarp_Class` (same hexes).
13. Whiskers (elaborated 2026-08-15):
    a. Create `Mean − σ` = `AVG([Measure Value]) - STDEV([Measure Value])`
       and `Mean + σ` = `AVG([Measure Value]) + STDEV([Measure Value])`
       — aggregate calcs, AGG badge, sample SD (matches the spec tables).
    b. Drag both onto **Detail** — nothing visibly changes; this is what
       makes them selectable in the band dialog. (Dropdown missing them
       later = this step was skipped.)
    c. Right-click the horizontal **`AVG(Measure Value)` axis** →
       **Add Reference Line** → top buttons: pick **Band**.
    d. Scope: **Per Cell** (each class row is a cell; Per Pane = one
       band across all six — wrong).
    e. Band From: Value → `AGG(Mean − σ)`, Label None.
       Band To: Value → `AGG(Mean + σ)`, Label None.
    f. Line → None; Fill → light gray. OK.
    Expected spans (Scarp Height, All steps, in m): Monoclinal
    0.49–2.56 · Mono Collapse 1.96–3.71 · Pressure Ridge 0.83–2.24 ·
    PR Collapse 1.29–2.81 · Simple 1.82–3.78 · Simple Collapse
    2.49–3.99.
14. **CHECKPOINT — values.** With `Population` = All steps and `Measure`
    = Scarp Height, the circles must land on the spec's candidate-A
    column (Monoclinal 1.527, … Simple Collapse 3.240). Flip
    `Population` → candidate-B column (3.487 … 4.142). If either
    disagrees, stop and tell Claude — that's a `Keep Row`/LOD bug, not a
    Tableau quirk.

## Phase 5 — dashboards

Create each via the **new-dashboard icon** in the bottom tab bar (the
2×2 grid with a `+`, next to the new-sheet icon), then rename its tab.
Set the size first: in the Dashboard pane (left), Size → **Fixed size**
→ enter the pixels below.

15. `Distributions & Summary (web)` — size **fixed 800 × 1200**:
    `Distributions` on top (~800×700), `Mean ± σ by class` below
    (~800×420), parameter controls (`Measure`, `Hue By`, `Population`)
    tiled between, title zones per the D3/D4 look. Precise zone geometry
    can be fixed in XML afterwards (the 1/100000 rule) — get it close.
16. ~~Landscape 1200×900 twin~~ — **DROPPED 2026-08-15** (tried;
    side-by-side stretches the six-row Mean ± σ strip into empty space —
    it is intrinsically a wide short chart). D4 precedent applies: one
    web-size dashboard, and the site's "Open full-size" link targets the
    same dashboard on Tableau Public. If a landscape variant is ever
    wanted, stack full-width bands (hist ~1200×560 over mean±σ
    ~1200×280) — never side-by-side.
17. File → Save As →
    `…/projects/github/eps-ground-rapture/dashboards/tableau/dem-distributions-public.twb`
    (canonical path), close Tableau fully before any XML surgery.

## Phase 6 — publish

18. With the **web variant as the active tab** (active tab = default
    view), Server → Tableau Public → Save to Tableau Public As… →
    workbook name = file stem. Whole-workbook publish.
19. Record: the exact published slugs of both dashboards (the URL after
    `/views/`). Send them to Claude → site page + embeds + docs table
    flips follow (spec, Publication lane).
20. The five-second content check on the published viz: histogram
    renders, event verticals present on SH/DZW, mean±σ circles match the
    checkpoint values, parameters respond.

## Cleanup

This file self-deletes when Dashboard 5 ships (task-file convention);
durable decisions get promoted into `notes/dashboard-5-build-spec.md`.
