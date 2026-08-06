# Input datasets and derived views

What each raw input actually is, and what the pipeline builds from it.
`data/README.md` has the bare file list; this is the reference behind it.
The reader-facing version of the same ground is
`subprojects/mkdocs/docs/data.md`.

All of `data/raw/` is gitignored and populated by hand. `egr-build`
requires **all four** inputs and exits 2 naming any that are missing —
there is no partial build and no fallback.

| File | What | Required |
|------|------|----------|
| `DEM_dataset.csv` | 2D DEM trial measurements | yes |
| `02_FDHI_FLATFILE_MEASUREMENTS_<date>.csv` | raw FDHI flatfile | yes |
| `SURE.csv` | SURE database v2.0 | yes |
| `Combine_BuwaldaFDHI_KernSDC.csv` | Kern County compilation | yes |
| `FDHI_Cleaned_Measurements.csv` | pre-cleaned FDHI extract | **no** — test reference only |

## DEM trials (`DEM_dataset.csv`)

Loader: `eps_ground_rupture.io.load_dem`.

The main 2D **Distinct Element Method** measurements dataset produced by
the simulation runs underlying Chiama et al. 2025. ("Distinct", not
"discrete", and not "digital elevation model" — a different thing
entirely.) The method models sediment as many interacting particles, so a
fault zone emerges from the physics rather than being prescribed.

**346,834 rows across 3,434 trials.** A row is one *model stage*, not one
experiment: each trial is measured every 0.05 m of slip, so a single trial
contributes dozens of rows as the rupture develops. Counting rows counts
stages; `COUNT(DISTINCT Trial)` counts experiments. 2,459 trials are
Homogeneous, 975 Heterogeneous.

26 columns. The ones the dashboards use: `Slip`, `VD_HW` (vertical
displacement, hanging wall), `Scarp_Height`, `DZW` (deformation zone
width), `Scarp_Dip`, `Scarp_Class`, `Fault_Dip`, `Cohesion`, `Set`,
`Density`, `Sediment_Strength`, `Us - Ud`.

Notes:

- `Cohesion` is a categorical **string** column mixing letter codes
  (`R1`–`R10`, `Q`, `S`, and `A`, `B`, `C`, `F`, `G`, `H`, `K`, `L`, `M` —
  note the letters are not contiguous) with five scientific-notation
  strings (`1.00E+05`, `5.00E+05`, `1.00E+06`, `1.50E+06`, `2.00E+06`).
  26 distinct values, no nulls. That mix of numeric-looking and
  letter-coded values across a large file is why `io.load_dem` passes
  `low_memory=False` — chunk-boundary type inference would otherwise warn —
  and why `export.py` coerces every `object` column to pandas' nullable
  `string` dtype before writing Parquet.
- 3,434 rows have a null `Scarp_Class` — exactly one per trial, the initial
  stage. Those same rows also have null `Scarp_Height` and `DZW`, so they
  contribute no marks to any chart.
- 3,434 rows have `Slip = 0`, which matters wherever a log is taken.

## FDHI raw flatfile (`02_FDHI_FLATFILE_MEASUREMENTS_<date>.csv`)

Loaders: `io.find_fdhi_flatfile` → `io.load_fdhi_flatfile`.
Cleaning: `prep.clean_fdhi`, `prep.fdhi_measurements`.

The **Fault Displacement Hazards Initiative** project flatfile — a
published compilation of field measurements across many surface-rupturing
earthquakes. Source: **UCLA Dataverse, DOI `10.25346/S6/Y4F9LJ`, file
`ABRP7B`**. The date suffix is a version stamp; `io.py` globs for any
vintage.

This is the pipeline's FDHI source of truth, and has been since
2026-08-01. Two tables come out of it:

**`fdhi_cleaned`** — `prep.clean_fdhi`. The prior owner's filter chain,
reproducing the ~19-row scatter-overlay subset that used to be shipped as a
pre-cleaned CSV: reverse / reverse-oblique style, positive `vs_*` / `sh_*`
measurement, `0 < fzw_central_meters < 50`, usage flag in `{Check, Keep}`.
This is the *updated* filter — the legacy notebook also required
`rupture_rank == 'Principal'`, which the prior owner dropped.
`tests/test_prep.py` asserts it reproduces the shipped
`FDHI_Cleaned_Measurements.csv` row for row.

**`fdhi_measurements`** — `prep.fdhi_measurements`. 4,121 rows × 136
columns across 25 events; the per-event statistics base behind Dashboard 3.
It keeps every Reverse (1,987) and Reverse-Oblique (2,134) row and masks
the `-999` sentinel in numeric columns — and applies **no other row
filter**. Positivity and rupture rank are per-chart choices and live in the
workbook, not here;
`test_prep.py::test_fdhi_measurements_applies_no_row_filters_beyond_style`
exists so that contract can't drift silently. (For reference: 3,617 of
those rows are Principal, 504 Distributed.)

Useful columns: `eq_name`, `magnitude`, `style`, `rupture_rank`,
`fzw_central_meters` (deformation zone width), `vs_central_meters`
(vertical separation), `sh_central_meters` (scarp height),
`hypocenter_latitude_degrees` / `hypocenter_longitude_degrees`.

### `FDHI_Cleaned_Measurements.csv` — not an input

The prior owner's pre-cleaned ~19-row extract. `egr-build` no longer reads
it: falling back to it produced an `fdhi_cleaned` two columns wider and no
`fdhi_measurements` at all, so the Parquet, the DDL and the committed Glue
schema ended up describing different things. It is kept in `data/raw/` only
as the reference `tests/test_prep.py` checks the cleaning chain against.

`io.load_fdhi` still exists to read it, and **nothing in `src/` calls it** —
it is reachable only from the tests. Worth a decision on whether to fold it
into the test module or drop it; not done here.

## SURE (`SURE.csv`)

Loader: `io.load_sure`.

A worldwide, unified database of surface ruptures for fault-displacement
hazard analysis — a public compilation of surface-rupture observations
across many historical earthquakes, used here at version 2.0. **1,402 rows
× 75 columns**, covering identifiers, location, strike-slip /
fault-normal / vertical displacement components and their uncertainties,
scarp height, and event metadata.

The acronym is the database's name rather than a strict initialism; the
site glossary deliberately renders it as "the name of a database of
**s**urface **ru**ptur**e**s" instead of inventing a word-per-letter
expansion. Cite it as Baize et al. (2019), *A worldwide and unified
database of surface ruptures (SURE) for fault displacement hazard
analyses*.

Notes:

- The CSV ships with a UTF-8 BOM on the first column header (`IdE`); the
  loader strips it via `encoding="utf-8-sig"`.
- Some `eq_name` values carry a trailing non-breaking space (U+00A0).
  Anything joining on event name must strip it — the pipeline does, and so
  does the Tableau `Event Label` calc.
- **SURE records no earthquake magnitude of its own.**
  `config.SURE_EVENT_MAGNITUDES` supplies one per event, sourced from the
  SURE 2.0 paper (Nurminen et al. 2022) where stated. Several entries are
  marked "confirm" — common literature values awaiting verification — and
  unknown events emit NULL.
- `IdE` is a YYYYMMDD integer event id, not a date, despite what type
  inference does with it.

Columns the dashboards use: `eq_name`, `FNC` (fault-normal component),
`SH` (scarp height), `Latitude`, `Longitude`.

## Kern County (`Combine_BuwaldaFDHI_KernSDC.csv`)

Loader: `io.load_kern_combined`.

A hand-compiled merge of three sources of surface-rupture measurements from
the **1952 M 7.36 Kern County (Bakersfield, CA) earthquake** on the White
Wolf fault. **28 rows × 6 columns.** The filename encodes the merge:

- **Buwalda** — Buwalda & St. Amand (1955), the classic field survey.
- **FDHI** — the Kern entries from the FDHI flatfile (`eq_name == 'Kern'`).
- **SDC** — expansion unconfirmed; most likely a "Surface Displacement
  Catalog" component added by the original notebook author. Worth asking
  the author team.

It is **not a public dataset.** Obtained from the prior project owner.

Notes:

- UTF-8 BOM, stripped by `encoding="utf-8-sig"`.
- Three columns are literally named "Comments"; pandas renames the
  duplicates to `Comments`, `Comments.1`, `Comments.2`.
- Columns: `Location ID`, `Vertical` (vertical scarp height, m), `DZW`
  (deformation zone width, m), and the three Comments. 12 of the 28 rows
  have a null `Vertical`.
- The CSV carries **no per-row location**. The 1952 epicenter is attached
  downstream, as constants, by the `kern_combined_geo` view.

Used as reference overlay points on the DEM scatter — where the 1952 event
sits in (DZW, scarp-height) space relative to the model cloud — and, since
Dashboard 4, as the input to the slip back-projection.

## The tidy Parquet layer

`export.export_tidy` writes one directory per logical table under
`data/processed/<table>/data.parquet`: `dem`, `fdhi_cleaned`,
`fdhi_measurements`, `sure`, `kern_combined`.

This layer is the project's durable analytical store, not a staging area on
the way to something else. DuckDB queries it directly; every view and every
pinned coefficient is defined over it. The CSVs under `dist/csv/` are a
concession to what Tableau Public accepts today — flat, static, duplicated
per workbook — and would be the first thing to change if the delivery lane
does. Anything faster (pre-aggregated views, a live query endpoint, a
different front end) builds on the Parquet, not on the CSVs.

## Derived views

`views.build_duckdb_views` creates **11 views** in
`dashboards/duckdb/eps.duckdb`. Five are passthroughs over the Parquet
above; the other six are where the analysis lives.

| View | Rows | What it adds |
|------|------|--------------|
| `dem` | 346,834 | passthrough |
| `fdhi_cleaned` | 19 | passthrough |
| `fdhi_measurements` | 4,121 | passthrough (exists only when the flatfile was built) |
| `sure` | 1,402 | passthrough |
| `kern_combined` | 28 | passthrough |
| `sure_enriched` | 1,402 | event `magnitude` from `config.SURE_EVENT_MAGNITUDES`, matched on an NBSP-scrubbed `eq_name` |
| `kern_combined_geo` | 28 | `latitude` / `longitude` — the 1952 epicenter as constants |
| `unified_observations` | 329,124 | `UNION ALL` of `dem`, `fdhi_cleaned`, `sure`, `kern_combined` onto one `(source, dzw, scarp_height, …)` shape; every arm requires **both** axes `> 0`, which drops nulls, zeros and FDHI's `-999` sentinel at once. By source: DEM 329,045 / SURE 56 / FDHI 17 / Kern 6 |
| `dem_regression` | 7 | one OLS fit of `VD_HW` on `Slip` per `Fault_Dip`: `n`, `slope`, `intercept`, `r2` |
| `dem_regression_lines` | 14 | two endpoint rows per dip, spanning that dip's own `Slip` range |
| `kern_inferred_slip` | 112 | each fit inverted — what slip would produce Kern's measured verticals — for all 7 dips × 16 non-null verticals |

Row counts are as of 2026-08-05 with the current `data/raw/`; the
authoritative definitions are in
`subprojects/python/src/eps_ground_rupture/views.py`.

**Only three of these counts are pinned by tests** — `dem_regression` (7),
`dem_regression_lines` (14) and `kern_inferred_slip` (112), in
`tests/test_regression_views.py`, because they are derived and a silent
change would mean the arithmetic broke. The other eight follow from
whatever is in `data/raw/`, and the view tests build from synthetic
fixtures rather than the real inputs, so nothing catches a drift here.
Re-run the counts rather than trusting this table.

`egr-csv` exports any of these to `dist/csv/<view>.csv`;
`./gradlew :subprojects:python:csvExportAll` does all eleven. Which
dashboard reads which file is documented per family in
[`docs/dashboards/`](dashboards/).

Athena/Trino twins exist for five views (`unified_observations`,
`sure_enriched`, and the three regression views) and are written to
`dashboards/sql/athena-views.sql`. Nothing consumes them today — that lane
is parked ([`adr/dead-ends.md`](adr/dead-ends.md)).
