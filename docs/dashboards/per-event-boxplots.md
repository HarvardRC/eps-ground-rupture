# Per-event boxplots — developer notes

Chart family 5 (paper Fig. 13); "Dashboard 3" in the Roadmap build order.

## Purpose

How variable are field measurements *within* a single earthquake, and does
the DEM spread look like the field spread? Seven boxplot panels — three
FDHI measures per event, two SURE measures per event, two DEM measures per
scarp class — plus a map of where the FDHI events are. The science is on
the site page
([`subprojects/mkdocs/docs/dashboards/per-event-boxplots.md`](../../subprojects/mkdocs/docs/dashboards/per-event-boxplots.md)).

## Artifacts

| | |
|---|---|
| Workbook | `dashboards/tableau/per-event-box-plots-public.twb` — the only one; **no desktop twin** |
| Worksheets | `FZW per Event (FDHI)`, `SH per Event (FDHI)`, `VS per Event (FDHI)`, `SURE FNC per Event`, `SURE SH per Event`, `DEM DZW by Class`, `DEM Scarp Height by Class`, `Event Map (FDHI)` |
| Dashboards | `Per-Event Boxplots — Model vs Field` 800×1200 · `Per-Event Boxplots — VS & SURE` 1200×1200 · `Per-Event Boxplots — VS & SURE (web)` 800×2000 |
| Slugs | `Per-EventBoxplotsModelvsField` · `Per-EventBoxplotsVSSURE` · `Per-EventBoxplotsVSSUREweb` |
| Embedded at | site `dashboards/per-event-boxplots.md` — Model vs Field at 800×1200 (resized in place; it *is* the web layout, so its escape hatch points at itself), and the VS & SURE `(web)` variant at 800×2000 |
| Specs | `notes/dashboard-3-build-spec.md`, `notes/2026-08-01/dashboard-3-tableau-public-build.md`, `notes/2026-08-02/dashboard-assembly.md`, `notes/2026-08-02/fzw-sheet-rebuild.md` |

Built public-first because `fdhi_measurements` never reached Athena — it
only would once the parked Terraform applied the regenerated `tables.json`.

## Data contract

**Three independent CSVs**, three separate datasources, no joins and no
relationships:

| CSV | Shape | View |
|-----|-------|------|
| `dist/csv/fdhi_measurements.csv` | 4,121 × 136 | `fdhi_measurements` — optional passthrough; exists only when the raw FDHI flatfile has been built |
| `dist/csv/sure_enriched.csv` | 1,402 × 76 | `sure_enriched` — `SELECT *, <magnitude CASE> FROM sure`; the CASE keys on `trim(replace(eq_name, chr(160), ' '))` |
| `dist/csv/dem.csv` | 346,834 × 26 | `dem` — plain passthrough |

`prep.fdhi_measurements` keeps the Reverse / Reverse-Oblique rows and masks
the `-999` sentinel — and applies **no row filters beyond that**.
Positivity and rupture rank are the workbook's job. That split is
deliberate and pinned:
`test_prep.py::test_fdhi_measurements_applies_no_row_filters_beyond_style`
exists so that adding a filter to the view can't silently change every
published count.

Also pinned:

- `test_smoke.py::test_build_duckdb_views_optional_fdhi_measurements` — the
  view exists exactly when its Parquet does.
- `test_prep.py` — `::test_fdhi_measurements_keeps_only_reverse_styles`,
  `::test_fdhi_measurements_nulls_the_sentinel_in_numeric_columns`,
  `::test_fdhi_measurements_leaves_string_sentinels_alone`,
  `::test_fdhi_measurements_upcasts_int_columns_carrying_the_sentinel`.
- `test_smoke.py::test_sure_enriched_view` — every SURE row survives and the
  magnitude join tolerates trailing-NBSP event names.
- `test_smoke.py::test_sure_magnitude_case_escapes_apostrophes`,
  `::test_sure_magnitude_case_skips_unknowns`.

**Gap:** no test pins `dem`'s `DZW` / `Scarp_Height` / `Scarp_Class` for
this family.

## Anatomy

### Sheets

All seven boxplot sheets share one flat colour, `#75a1c7` at transparency
129, and all have Aggregate Measures **off**.

| Sheet | Rows | Axis | Population |
|-------|------|------|------------|
| `FZW per Event (FDHI)` | Event Label | `fzw_central_meters`, **log**, fixed 0.01–2,000 | 463 rows / 4 events |
| `SH per Event (FDHI)` | Event Label | `sh_central_meters`, linear, fixed −0.5–5.5 | 484 rows / 3 events |
| `VS per Event (FDHI)` | Event Label | `vs_central_meters`, linear, fixed −0.5–8 | 2,106 rows / 23 events |
| `SURE FNC per Event` | Event Label | `FNC`, auto | 185 rows / 9 events |
| `SURE SH per Event` | Event Label | `SH`, auto | 74 rows / 4 events |
| `DEM DZW by Class` | Scarp_Class | `DZW`, **log**, fixed 0.01–2,000 | 329,152 marks / 6 classes |
| `DEM Scarp Height by Class` | Scarp_Class | `Scarp_Height`, linear, fixed −0.5–5.5 | 333,159 marks / 6 classes |

The two log axes are deliberately paired (FZW and DEM DZW share the window)
so the field and model spreads are visually comparable.

`Event Map (FDHI)` is the eighth sheet: `AVG(hypocenter_latitude_degrees)`
/ `AVG(hypocenter_longitude_degrees)` over a Tableau map background, Event
Label on Detail and Text. It is the **only** sheet with Aggregate Measures
on, which is correct — it needs the averages.

### The box plot itself

Not a mark type. It is a reference line:

```xml
<reference-line id='refline0' scope='per-cell' boxplot-whisker-type='standard'
                boxplot-mark-exclusion='false' formula='average' probability='95'/>
```

`formula` and `probability` are inert boilerplate for the boxplot flavour.
The attribute that matters is `boxplot-whisker-type='standard'` — data
within 1.5 × IQR, which matches seaborn's default and is what licenses
comparison with the paper's Fig. 13.

### Calculated fields

```
Event Label (FDHI)  [eq_name] + IFNULL(" (M " + STR([magnitude]) + ")", "")

Event Label (SURE)  TRIM(REPLACE([eq_name], CHAR(160), " ")) + IFNULL(" (M " + STR([magnitude]) + ")", "")

FZW Positive  [fzw_central_meters] > 0
SH Positive   [sh_central_meters]  > 0
VS Positive   [vs_central_meters]  > 0
DZW Positive  [DZW] > 0
```

The two Event Labels share a caption but are different fields in different
datasources. The SURE one scrubs a trailing NBSP that two event names
carry; the FDHI one doesn't need it. Don't copy one over the other.

The `IFNULL(" (M " + STR([magnitude]) + ")", "")` idiom relies on null
propagating through concatenation: `STR(NULL)` is null, so the whole
parenthesised expression is null and `IFNULL` substitutes `""`. Refactoring
to `" (M " + IFNULL(STR([magnitude]), "") + ")"` would leave a bare `" (M )"`
on any null-magnitude SURE event. (Since the 2026-08-06 magnitude
confirmation all sixteen SURE events carry a value, so the idiom now guards
only a future unknown event.)

The `*Positive` booleans exist because a log axis cannot place values ≤ 0.
`DZW Positive` drops 3,996 rows (333,148 non-null DZW → 329,152 positive).

### Parameters

**None.** Zero `param-domain-type` occurrences in the whole workbook. The
only viewer-facing control is one quick filter.

### Filters and actions

- `FZW per Event`: `FZW Positive = true` **and** `rupture_rank = "Principal"`.
- `SH per Event`: `SH Positive = true` **and** `rupture_rank = "Principal"`.
- `VS per Event`: `VS Positive = true`, `rupture_rank = "Principal"`, plus an
  Event Label filter set to all members — that third one is the dashboard card.
- `DEM DZW by Class`: `DZW Positive = true`.
- `DEM Scarp Height by Class`, both SURE sheets, `Event Map`: **no filters**.

Two actions, both hover-highlight on `Event Label` (`tsc:brush`) — one for
the landscape VS & SURE dashboard, a duplicate for its `(web)` twin. No
filter or URL actions anywhere.

## How to edit safely

1. `egr-build` (needs the raw FDHI flatfile, or `fdhi_measurements` won't
   exist), then `csvExportAll`.
2. Open via **File → Open**. All three extracts point at `/var/folders/.../
   tableau-temp/#TableauTemp_*.hyper` — OS temp files that will be gone.
   Expect a missing-extract complaint.
3. Per `notes/2026-08-02/fzw-sheet-rebuild.md` Phase 0: accept whatever
   option removes the extract, then **Data Source tab → Create Extract**
   for each of the three sources, then **Data → \<source\> → Refresh**.
4. Edit. Remember the `(web)` dashboard is a hand-duplicated tab, not a
   device layout — every change to the landscape original must be repeated
   there by hand, including its copy of the highlight action.
5. Publish with the tab you want as default active; save locally after.

## Known quirks

- **No desktop twin exists** — don't go looking. Correspondingly, the usual
  "the desktop copy carries a legacy Athena connection" caveat does not
  apply here: zero Athena hits in this file.
- **`boxplot-mark-exclusion='false'` on both DEM sheets** means "hide
  underlying marks" is *unchecked*, against the walkthrough's explicit
  request. As committed, `DEM DZW by Class` renders 329,152 disaggregated
  marks and `DEM Scarp Height by Class` 333,159. This is the workbook's
  dominant render cost on Tableau Public and the first thing to try if the
  published page feels slow.
- **Colour never landed as specified.** No colour encoding on any boxplot
  sheet, no palette element anywhere, zero occurrences of the Dashboards
  1–2 scarp-class hexes. Both the spec's "one hue per measure" and the
  walkthrough's "colour by Scarp_Class" are unimplemented.
- **Sort is inconsistent, and one sheet sorts by the wrong thing.** FZW,
  VS, `SURE FNC` and `SURE SH` each carry a `<computed-sort>` on
  `MAX(magnitude)` descending. `SH per Event (FDHI)` instead carries a
  `<shelf-sort-v2>` on `SUM(sh_central_meters)` descending — a different
  mechanism *and* a different key, so its three events are ordered by total
  scarp height while the FZW panel beside it on the same dashboard is
  ordered by magnitude. Summing a per-measurement quantity is also the
  Sort dialog's default trap (it should be Maximum). The two DEM sheets
  have no sort at all — their six classes come out in the requested order
  only because it happens to coincide with alphabetical.
- **The 45.8 m "DEM envelope" reference line was never added.** Max DZW in
  the export is 45.811 m, so the boundary the paired log axes exist to
  dramatise is currently unmarked.
- **`Event Map (FDHI)` appears in no spec** — it was added after the
  assembly notes. It plots 23 of 25 FDHI events: Pukatja (27 rows) and
  MarryatCreek (79 rows) have null hypocenter coordinates on every row, so
  they are silently absent from the map while still appearing on the
  boxplots.
- **The Event Label quick filter is bound to `VS per Event (FDHI)` alone.**
  It is inert until touched, and when touched it does *not* apply to the
  SURE panels beside it — desynchronising the dashboard's event sets.
- **`Per-Event Boxplots — Model vs Field` has no title zone** and no
  worksheet titles, so the paper's (b)/(c)/(d)/(e) panel captions are
  absent; the four panels are labelled with bare sheet names.
- **Tableau writes no `<column>` element for a field it has never
  customised.** `FNC`, `SH`, `Date` (SURE) and `DZW`, `Trial` (DEM) are
  visible *by absence* and won't show up in a naive scan of visible
  columns. Derive the visible set by subtraction: 136−117 = 19 FDHI,
  76−70 = 6 SURE, 26−21 = 5 DEM. (The hidden FDHI count is 117, not the 119
  the walkthrough records — two hypocenter columns were unhidden to build
  the map.)
- **`fzw_high_meters` is typed as a string.** Only 11 of 4,121 rows carry a
  value, so type inference fell back to text and it lands in Dimensions.
  Any whisker check against the `*_high_meters` triplet needs a manual
  Change Data Type → Number first. `fzw_low_meters`, `sh_high_meters` and
  `vs_high_meters` are correctly real.
- **SURE's `IdE` is typed as a date** with Year aggregation and left
  visible as "Id E". It is really a YYYYMMDD integer event id. Don't use it
  as a join key or an axis.
- **3,434 `dem.csv` rows have a null `Scarp_Class`** and would produce a
  stray "Null" row header on `DEM Scarp Height by Class`, which has no
  filter. They don't, because every one of them also has null
  `Scarp_Height` and `DZW`, so they contribute no marks. An export that
  filled `Scarp_Height` on class-less rows would make the header appear.
- **Committed dashboard sizes differ from the spec's targets** (800×1200
  vs "~1000×1600"; 1200×1200 vs "~1000×1400"). `EMBEDS.md` derives its
  `data-width`/`data-height` from the actual `<size>` values — re-check
  after any republish.
