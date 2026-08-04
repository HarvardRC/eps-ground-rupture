# FZW sheet rebuild — click-by-click (2026-08-02)

Target: ~5 minutes. The four calculated fields already exist in the
workbook — nothing needs to be re-created except the sheet itself.
Field names appear in Tableau's prettified form ("Fzw Central Meters"
= `fzw_central_meters`).

**The one contract: at the CHECKPOINT below, the status bar must say
463 marks, 4 rows. Anything else → stop and tell Claude the numbers.**

## Phase 0 — open and refresh (do not skip)

1. In Finder: `dashboards/tableau/` → double-click
   `per-event-box-plots-public.twb`. (Never the app start-page
   "recents" — that resurrects stale sessions.)
2. Expect: one empty "Sheet 1" tab; Data pane (left) lists DEM, FDHI
   Measurements, SURE Enriched.
3. Menu bar: **Data → FDHI Measurements → Refresh**. Repeat for
   **SURE Enriched** and **DEM** (DEM is the big one — progress bar
   for a few seconds is normal).
   - If opening instead throws a "missing extract" complaint: accept
     whatever option removes the extract, then Data Source tab
     (bottom-left) → button **Create Extract** for each source, then
     come back to the sheet tab.

## Phase 1 — the FZW sheet

4. Click the **Sheet 1** tab (bottom). Double-click the tab name →
   rename to `FZW per Event (FDHI)` → Enter.
5. In the Data pane, click **FDHI Measurements** so it's the active
   source. The field list should be SHORT (~21 entries) — the hiding
   at work.
6. Drag **Event Label** (Dimensions section) → drop on the **Rows**
   shelf. Expect: blue pill; ~25 event names listed vertically.
7. Drag **Fzw Central Meters** (Measures section) → drop on the
   **Columns** shelf. Expect: green pill reading `SUM(Fzw Central
   Meters)`; horizontal bars appear.
8. Menu bar: **Analysis → Aggregate Measures** → click to UNCHECK.
   Expect: pill loses the `SUM()`; bars turn into overlapping circles;
   a grey "nulls" indicator may appear bottom-right — normal at this
   stage.
9. Filter 1: drag **Rupture Rank** (Dimensions) → drop on the
   **Filters** shelf (left of the canvas). In the dialog's checkbox
   list tick **Principal** only → OK.
10. Filter 2: drag **FZW Positive** (Dimensions) → drop on the
    Filters shelf. Tick **True** → OK. The nulls indicator disappears.

11. **CHECKPOINT — status bar (bottom-left): `463 marks, 4 rows by 1
    column`.** Row headers: Kaikoura (M 7.8), Kashmir (M 7.6),
    Kern (M 7.36), Wenchuan (M 7.9). Different numbers → stop, report.

## Phase 2 — box plot, axis, sort

12. Left pane: switch from **Data** to the **Analytics** tab (next to
    "Data" at the top of the sidebar). Click-and-HOLD **Box Plot**
    (under Summarize) and drag toward the chart. The drop target only
    appears once the cursor is over the white canvas: a small grey
    overlay near the top-left of the chart, titled "Add a Box Plot",
    with a single tile labeled **Cell**. Still holding, move onto that
    **Cell** tile so it highlights, and release there — on the tile,
    not on the axis or a row. Expect: grey box-and-whisker per event
    row.
    - If the overlay never appears or Box Plot is greyed out:
      right-click the numbers of the bottom axis → **Add Reference
      Line** → the dialog's top row has four icon tabs (Line, Band,
      Distribution, **Box Plot**) → pick Box Plot → Scope **Per
      Cell** → OK. Same result.
13. Right-click the bottom axis (`Fzw Central Meters`) → **Edit
    Axis…**:
    - Range: **Fixed** — start `0.01`, end `2000`.
    - Scale: tick **Logarithmic**.
    - Title field: replace with `Deformation Zone Width (m)`.
    - Close the dialog (X).
    Expect: Kaikoura's points spread across the right half; Kashmir's
    two points sit together at 20; Kern spans ~11–402.
14. Right-click the **Event Label** pill on Rows → **Sort…**:
    - Sort By **Field** · Order **Descending** · Field Name
      **magnitude** · Aggregation **Maximum** → close.
    Expect top→bottom: Wenchuan, Kaikoura, Kashmir, Kern.
15. Marks card cosmetics (optional now): **Color** → pick the measure
    hue, opacity ~50 %; **Size** → small.

## Phase 3 — save and hand off

16. **File → Save** (⌘S). If any online "Save to Tableau Public"
    dialog appears instead of a silent save — cancel it and use
    File → Save As… back to the same path in `dashboards/tableau/`.
17. Tell Claude "sheet saved" — the XML gets verified from the cloud
    side, and the remaining six sheets (SH, VS, SURE FNC, SURE SH,
    two DEM class panels) get cloned into the workbook by script so
    only the dashboard assembly is left for Tableau.

## Reference — the other sheets (if building manually instead)

| Sheet | Rows | Columns | Filters | Axis |
|---|---|---|---|---|
| SH per Event (FDHI) | Event Label | Sh Central Meters | Principal + SH Positive | linear fixed −0.5…5.5 |
| VS per Event (FDHI) | Event Label | Vs Central Meters | Principal + VS Positive | linear fixed −0.5…8 |
| SURE FNC per Event | Event Label (SURE) | FNC | none | auto |
| SURE SH per Event | Event Label (SURE) | SH | none | auto |
| DEM DZW by Class | Scarp Class | DZW | DZW Positive (create: `[DZW] > 0`) | log fixed 0.01…2000 |
| DEM Scarp Height by Class | Scarp Class | Scarp Height | none | linear fixed −0.5…5.5 |

Every sheet: Aggregate Measures OFF, Box Plot per Cell.
Expected populations: SH 484/3 · VS 2,106/23 · FNC 185/9 · SURE SH
74/4 · DEM DZW 329,152 (tick "Hide underlying marks (except
outliers)" in the box-plot options on the two DEM sheets).
