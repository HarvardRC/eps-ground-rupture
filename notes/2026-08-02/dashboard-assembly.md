# Dashboard assembly — click-by-click (2026-08-02)

Two dashboards, per the walkthrough §5 / paper Fig. 13 layout. All seven
sheets exist and are verified. Target: ~10 minutes.

## Dashboard A — "Per-Event Boxplots — Model vs Field"

1. Bottom tab strip: click the **New Dashboard** icon (the middle of the
   three small icons right of the sheet tabs — a window grid with a +).
2. Double-click the new "Dashboard 1" tab → rename to
   `Per-Event Boxplots — Model vs Field` → Enter.
3. Left pane, **Size** section: click the size dropdown (reads "Desktop
   Browser (1000 × 800)") → set the dropdown at the top of that popup to
   **Custom** → Width `1000`, Height `1600`.
4. Drag sheets from the **Sheets** list (left pane) into the canvas, one
   at a time, in this order — each new one drops on the **bottom half**
   of the canvas (while dragging, grey shading shows which region you'll
   fill; release when the bottom strip is shaded):
   1. `DEM DZW by Class` — first drop fills the whole canvas.
   2. `FZW per Event (FDHI)` — drop on the bottom half.
   3. `DEM Scarp Height by Class` — drop on the bottom third.
   4. `SH per Event (FDHI)` — drop on the bottom strip.
   Top→bottom result: DEM DZW · FZW · DEM SH · SH — the paper's
   (b)/(c)/(d)/(e) order, with each DEM context panel sharing its axis
   window with the field panel below it.
5. If any legend or filter card appeared in a right-hand column: click
   it → **X** (remove). The dashboard should be just the four panels.
6. Fit each panel: click a panel to select it → in its top toolbar the
   **Fit** dropdown (reads "Standard") → **Entire View**. Repeat for all
   four. Rows now fill the panel width.
7. Optional titles polish (can wait): double-click a panel's title to
   edit — e.g. prefix `(b) `, `(c) `, `(d) `, `(e) ` to echo Fig. 13.
8. Bottom-left of the left pane: tick **Show dashboard title**;
   double-click the title that appears → e.g.
   `Distribution of 2D DEM Models and Historic Earthquakes`.

## Dashboard B — "Per-Event Boxplots — VS & SURE"

9. New Dashboard again → rename tab to `Per-Event Boxplots — VS & SURE`.
10. Size: Custom, `1000` × `1400`.
11. Drop in order (same bottom-half technique):
    1. `VS per Event (FDHI)` — fills canvas; this is the tall one
       (23 events), let it keep roughly half the height.
    2. `SURE FNC per Event` — bottom half.
    3. `SURE SH per Event` — bottom strip.
12. Remove stray legend/filter cards; set every panel's Fit to
    **Entire View**.
13. To rebalance heights: hover the border between panels until the
    resize cursor appears, then drag. Give VS the most room.
14. Show dashboard title as before if desired.

## Save, review, publish

15. **File → Save** (⌘S — the silent local save).
16. Tell the Cowork session "dashboards saved" — a final XML review runs
    from there (quartile spot-checks vs DuckDB, structure, axes) before
    anything goes public.
17. After the review comes back clean: **File → Save to Tableau Public
    As…** → sign in → name it consistently with the existing pubs
    (e.g. `EPS Ground Rupture — Per-Event Boxplots`). Publishing embeds
    the extracts; the browser opens the live viz when done.
18. **File → Save once more after publishing** — publish rewrites
    datasource metadata, and the repo copy should match what's live
    (the Dashboards 1–2 convention). Then commit the .twb (your lane).
