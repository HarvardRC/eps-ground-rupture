# Republish sitting — five workbooks, click-by-click (2026-08-16)

Task file for the design-refresh republish. Everything XML-side is
already done (see `notes/design-review-2026-08-16.md`); this is the
manual remainder. Order: D3 → D4 → D2 → D1 → D5 (easy → fiddly).

**The ritual per workbook** (same every time):

1. **File → Open** (never the start-page recents) →
   `…/projects/github/eps-ground-rapture/dashboards/tableau/<file>.twb`.
2. **Data menu → each data source → Refresh** (extracts are per-machine
   caches; they rebuild from `dist/csv/`, all regenerated 08-15).
   A "dangling extract" complaint before the refresh is normal.
3. Eyeball the checks listed below for that workbook.
4. **Publish**: make the **web dashboard tab active** (active tab
   becomes the default view) → Server → Tableau Public →
   **Save to Tableau Public As…** → keep the exact same workbook name.
5. Close before opening the next one.

---

## D3 — `per-event-box-plots-public.twb` (check only, no hand edits)

- Boxplots now draw **outliers only** (the 330k in-whisker circles are
  gone). Check the field panels still read well — boxes, whiskers, and
  genuine outlier circles remain; the dense mid-box dot rows vanish.
- Active tab for publish: `Per-Event Boxplots — VS & SURE (web)`
  (the current default — keep it).

## D4 — `dem-slip-regression-public.twb` (check only)

- The area annotation now reads **"Dip-30 fit: …"**.
- The parameter control now shows **"Kern Dip (measured: 30°)"**.
- Slide the parameter to 45° once: stars move, annotation stays
  correct (it names its own line now).
- Active tab: `Slip Regression & Kern Inference`.

## D2 — `dem-response-curve-public.twb` (check only)

- With the hue on Scarp_Class: the six canonical class colors.
- Flip the hue/condition to Fault_Dip: the warm D4-style dip ramp
  (20° light → 70° dark).
- Other hue modes (Cohesion, Set, Density, Strength) keep Tableau
  defaults for now — fine.
- Active tab: `DEM Response Curves (web)`.

## D1 — `dem-model-vs-reality-public.twb` (three hand edits)

**Check first**: scatter in canonical class colors; pooled gray trend
line gone; x-axis reads "Deformation Zone Width (m)".

### 1. Hide the duplicate right axis header

- On the main dashboard, click the scatter, open its ▾ caret →
  **Go to Sheet** (`DZW vs Scarp Height` — worksheets are hidden from
  the tab bar, this is the way in).
- **Right-click directly on the right-hand vertical axis** (the
  "Overlay Scarp_Height" numbers on the right edge) → **uncheck
  "Show Header"**. The duplicate scale disappears; marks unchanged.
- Right-click the sheet tab → Hide (returns it to hidden), or just
  click back to the dashboard tab.

### 2. Filter-rail cleanup (drop the redundant control)

`Event` and `Source` overlap (every Source is reachable by picking its
events; "DEM (Simulation)" is Event's own entry). **Keep `Event`** —
the page's prose sells per-earthquake isolation — **remove `Source`**:

- On the main dashboard: click the **Source** filter card → its ▾
  caret → **Remove from Dashboard** (or the ✕ on the card).
- On the **Viable Combinations** dashboard: remove the **Event** and
  **Source** filter cards there (the `Col By` / `Row By` parameters
  drive that matrix; the filter stack is duplicated noise). Keep
  Fault Dip + Scarp Class + the Coverage legend.
- (The filters stay on the worksheets — nothing is deleted, only
  removed from the dashboard rails.)

### 3. Map performance filter

- Scatter dashboard → click the **Event Map** → ▾ caret →
  **Go to Sheet**.
- Drag **`latitude`** from the Data pane onto the **Filters** shelf →
  dialog → **Special** tab → **Non-null values** → OK.
  (333k DEM rows have no coordinates; the map was querying them for
  79 drawable points.)
- Back to the dashboard.

**Optional polish while there**: legend items truncate at 800 px
("Pressure Ri…"). Right-click a legend item → **Edit Alias…** →
"Monoclinal Collapse" → `Mono. Collapse`, "Pressure Ridge Collapse" →
`PR Collapse`. (If Edit Alias is grayed on the calculated field, skip —
we'll widen the legend zone in XML next pass.)

Active tab for publish: `DEM Cloud & Historic Overlays (web)`.

## D5 — `dem-distributions-public.twb` (two hand edits)

1. Bottom tab bar → **`Mean ± σ by class`** sheet → **right-click the
   `Null` row header** (bottom row) → **Exclude**. The row and the
   black legend chip both go.
2. Optional, same sheet's legend aliases as D1 if truncation bothers
   you.
3. Publish with the **`Distributions & Summary (web)` dashboard tab
   active** — this also fixes the wrong default view from the first
   publish (currently the bare worksheet).

---

## After the sitting

- Tell Claude — verification happens against Tableau Public metadata
  (revision bumps on all five) plus a fresh embed look.
- Commit everything in one go (workbooks + doc edits + review +
  identity note); the site-page edit (slip-regression parameter name)
  deploys with the next PR to main.
- This file self-deletes when the sitting is verified.
