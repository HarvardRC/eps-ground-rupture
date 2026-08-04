# Dashboard 3 — Tableau Public build walkthrough (2026-08-01)

Companion to `notes/dashboard-3-build-spec.md`; reproduces paper Fig. 13
(nb2 cells 19/20/21/25) as an interactive workbook. Michael drives
Tableau; Claude reviews the saved `.twb` afterward. Public-first build:
the Athena desktop twin waits on the parked Terraform, so this workbook
connects straight to the CSV exports (DuckDB desktop twin can follow).

Every population number below was computed 2026-08-01 from the current
`dist/csv` exports — treat them as acceptance checks while building.

## 0. Before you start

- CSVs: `dist/csv/fdhi_measurements.csv` (4,121 × 136),
  `sure_enriched.csv` (1,402 × 76), `dem.csv` (346,834 × 26). If the
  native verification re-exported them, hashes should not have changed.
- Workbook: `dashboards/tableau/per-event-box-plots-public.twb` —
  created 2026-08-01 (naming settled by Michael's save).
- App: Tableau Desktop (publish via Server → Tableau Public →
  Save to Tableau Public As…) — the free Tableau Public app works with
  the same steps if preferred.

## 1. Data sources (three separate — no joins, no relationships)

1. Connect → Text file → `dist/csv/fdhi_measurements.csv`; rename the
   data source **FDHI Measurements**.
2. Data → New Data Source → Text file → `sure_enriched.csv` → **SURE
   Enriched**.
3. Same for `dem.csv` → **DEM**.
4. Unused fields: **done via XML 2026-08-01** (Claude's lane — no UI
   clicking needed): 210 fields hidden (119 FDHI / 70 SURE / 21 DEM).
   Visible per source — FDHI: `index`, `EQ_ID`, `eq_name`, `eq_date`,
   `region`, `magnitude`, `style`, `rupture_rank`, the
   `fzw_/sh_/vs_*_meters` triplets, + the four calcs; SURE: `IdE`,
   `eq_name`, `Date`, `FNC`, `SH`, `magnitude`; DEM: `Trial`,
   `Fault_Dip`, `DZW`, `Scarp_Height`, `Scarp_Class`. To resurface one:
   field-pane dropdown → "Show Hidden Fields" → right-click → Unhide
   (or ask Claude). Hidden fields stay out of the published extracts.
   Reminder: the view already restricts rows to Reverse/Reverse-Oblique
   styles with −999 sentinels NULLed — **row-level filters below are
   deliberately left to the workbook** (`prep.fdhi_measurements`).

## 2. Calculated fields

On **FDHI Measurements**:

- `Event Label` = `[eq_name] + IFNULL(" (M " + STR([magnitude]) + ")", "")`
- `FZW Positive` = `[fzw_central_meters] > 0`
- `SH Positive` = `[sh_central_meters] > 0`
- `VS Positive` = `[vs_central_meters] > 0`

On **DEM**:

- `DZW Positive` = `[DZW] > 0` (log axes can't place non-positive values;
  3,996 of 333,148 DZW rows drop)

On **SURE Enriched** (two event names carry a trailing NBSP; magnitude
is NULL for Coalinga (Nuñez) — see spec):

- `Event Label` = `TRIM(REPLACE([eq_name], CHAR(160), " ")) + IFNULL(" (M " + STR([magnitude]) + ")", "")`

## 3. The sheet pattern (build once, repeat)

Using **Sheet "FZW per Event (FDHI)"** as the template:

1. New worksheet on FDHI Measurements.
2. Drag `Event Label` → **Rows**, `fzw_central_meters` → **Columns**
   (horizontal boxplots, as in the notebook).
3. **Analysis → uncheck "Aggregate Measures"** — the box needs the
   row-level distribution, not one SUM per event.
4. Filters: `rupture_rank` → keep **Principal**; `FZW Positive` → keep
   **True**.
5. Analytics pane → drag **Box Plot** onto the view → **Cell**.
   Right-click the axis → Edit → box plot options: whiskers = **data
   within 1.5 × IQR** (Tableau's default — identical to seaborn's, so
   boxes match the paper figure).
6. Marks: Circle, small size, ~50 % opacity, one fixed hue for the
   measure (spec: one hue per measure, consistent FDHI↔SURE).
7. Right-click x-axis → Edit Axis → Scale **Logarithmic**, Range
   **Fixed 0.01 to 2,000** (shared with the DEM DZW panel — see §4);
   axis title "Deformation Zone Width (m)".
8. Sort events: right-click the `Event Label` pill → Sort → By field →
   `magnitude`, Maximum, Descending. (The notebook plots data order;
   magnitude-descending is our deliberate improvement.)

**Acceptance: 463 rows, 4 events** — Kaikoura n=448 (50–1,450 m,
median 250), Wenchuan n=8 (2.5–30), Kern n=5 (11–402), Kashmir n=2
(both 20 m — that box collapses to a line; expected, not an error).

**Decision 2026-08-01 (Michael): full range, log axis** — a deliberate
deviation from Fig. 13c, whose 0–50 m window kept only 13 rows and
excluded Kaikoura entirely. The log pair now shows the honest answer to
the family-5 question: DEM deformation-zone widths top out at ~46 m,
while field fzw (mostly Kaikoura's multi-fault rupture) runs to 1,450 m
— the model envelope brackets only the lower part of reality.
Optional but recommended: a constant **reference line at 45.8 m**
("DEM envelope") on this sheet to make that boundary explicit.

## 4. Remaining sheets (deltas from the pattern)

| Sheet | Source | Columns | Filters | Fixed axis | Axis title | Acceptance |
|---|---|---|---|---|---|---|
| SH per Event (FDHI) | FDHI | `sh_central_meters` | Principal + `SH Positive` | −0.5 … 5.5 | Scarp Height (m) | 484 rows, **3 events** (Bohol, Killari, Wenchuan) |
| VS per Event (FDHI) | FDHI | `vs_central_meters` | Principal + `VS Positive` | −0.5 … 8 | Vertical Separation (m) | 2,106 rows, **23 events** — the rich panel |
| DEM DZW by Class | DEM | `DZW` | `DZW Positive` | **log, fixed 0.01 … 2,000** (shared with FZW sheet) | Deformation Zone Width (m) | 329,152 rows, 6 classes |
| DEM Scarp Height by Class | DEM | `Scarp_Height` | none | −0.5 … 5.5 | Scarp Height (m) | 346,834 rows, 6 classes |
| SURE FNC per Event | SURE | `FNC` | none needed (all values > 0; NULLs drop) | auto | Fault-Normal Component (m) | 185 rows, **9 events** |
| SURE SH per Event | SURE | `SH` | none needed | auto | Scarp Height (m) | 74 rows, **4 events** |

DEM-sheet specifics:

- Rows = `Scarp_Class` (not Event Label); color by `Scarp_Class` with
  the Dashboards 1–2 palette (Monoclinal `#009ffa`, Pressure Ridge
  `#f47820`, Simple `#ed2024`, `_Collapse` = darker parent shade) —
  reuse the saved palette from `dem-model-vs-reality.twb`.
- In the box plot options **check "Hide underlying marks (except
  outliers)"** — 346 k disaggregated circles per sheet would drag
  Public's renderer; the boxes alone carry the story.
- Manual sort classes: Monoclinal, Monoclinal_Collapse, Pressure Ridge,
  Pressure Ridge_Collapse, Simple, Simple_Collapse.

## 5. Dashboards (two, one workbook — the Dashboard-1 precedent)

**"Per-Event Boxplots — Model vs Field (Fig. 13)"** — vertical
container, fixed size ≈ 1000 × 1600, top to bottom:

1. DEM DZW by Class *(b)*
2. FZW per Event (FDHI) *(c)* — shares the fixed **log 0.01–2,000**
   window with (b): DEM's envelope ends at ~46 m, the field data keeps
   going — that offset is the story of this pair.
3. DEM Scarp Height by Class *(d)* — linear −0.5…5.5, per the figure
4. SH per Event (FDHI) *(e)* — shares the 0–5.5 axis with (d)

Panel subtitles echo the paper's (b)/(c)/(d)/(e) captions; one
workbook-level title.

**"Per-Event Boxplots — VS & SURE"** — fixed ≈ 1000 × 1400: VS per
Event (tall, 23 events) on the left or top; SURE FNC and SURE SH
stacked beside/below it.

## 6. Publish

1. The workbook already lives at
   `dashboards/tableau/per-event-box-plots-public.twb` (untracked;
   Michael commits when ready).
2. Server → Tableau Public → **Save to Tableau Public As…** → sign in →
   name it consistently with the existing pubs (e.g. "EPS Ground
   Rupture — Per-Event Boxplots"). Tableau creates the extracts
   automatically on publish.
3. After publishing, **save the .twb again** — publish rewrites
   datasource metadata, and the repo copy should match what's live
   (that's how the other `-public` twins are kept).

## 7. Hand-off to review

Tell the Cowork session the build is done. Claude then runs the spec's
review checklist: per-sheet row/event counts above, quartile spot-checks
against DuckDB `PERCENTILE_CONT` on the same views, NULL/sentinel
handling, palette + label consistency, and a workbook-XML pass.
