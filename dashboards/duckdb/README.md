# DuckDB views

This directory holds `eps.duckdb` — a thin DuckDB database file containing
**view definitions only**. The actual row data lives in
`data/processed/<table>/data.parquet`; the views project those Parquet
files through DuckDB's `read_parquet()` and layer the derived analytics on
top. DuckDB is the single analytical engine (ADR-0003): anything a
dashboard needs computed lives here, in SQL, where tests can pin it —
rather than in Tableau calculated fields, which cannot be tested.

The `.duckdb` file is gitignored — regenerate it with
`poetry run egr-build` (or `./gradlew :subprojects:python:egrBuild`).
Regeneration is fast because the views don't copy data.

## Views exposed

**Currently 12** (10 when the optional FDHI flatfile is absent —
`fdhi_measurements` and `historic_events` are skipped together). The
authoritative list is
`subprojects/python/src/eps_ground_rupture/views.py` — `build_duckdb_views`
creates them in one pass, so read that function rather than trusting a
count here. They fall into three layers:

**Passthrough** — one per Parquet table, `SELECT *`:
`dem`, `fdhi_cleaned`, `fdhi_measurements`, `sure`, `kern_combined`.

**Enriched** — a source table plus columns it doesn't carry itself:

| Name | Adds |
|------|------|
| `sure_enriched` | Event `magnitude`, joined from `config.SURE_EVENT_MAGNITUDES`; `SURE.csv` has no magnitude column of its own. |
| `kern_combined_geo` | `latitude` / `longitude` — the 1952 epicenter, constant per row, since Kern's CSV has no per-row location. |
| `unified_observations` | UNION ALL of `dem`, `fdhi_cleaned`, `sure` and `kern_combined` onto one `(source, dzw, scarp_height, scarp_class, eq_name, magnitude, fault_dip, cohesion, dem_set, latitude, longitude)` shape. Each arm filters on **both axes `> 0`**, which drops nulls, zeros and FDHI's `-999` sentinel in a single condition. |

**Derived analytics** — Dashboard 4's regression layer (paper Fig. 14 /
Equation 2) and Dashboard 5's reference lines (Fig. 15):

| Name | What |
|------|------|
| `dem_regression` | One OLS fit of `VD_HW` on `Slip` per `Fault_Dip`: `n`, `slope`, `intercept`, `r2`. Note DuckDB's `regr_*` take **(y, x)** — y first. |
| `dem_regression_lines` | Two endpoint rows per dip spanning that dip's own `Slip` range, so Tableau draws the fit fan from data instead of a native trend line. |
| `kern_inferred_slip` | Each fit inverted — what slip would have produced Kern's measured verticals — for every dip, not just the notebook's 30°. |
| `historic_events` | One row per **field measurement** (FDHI flatfile via `fdhi_measurements`, SURE, Kern): `source, eq_name, dzw, scarp_height, magnitude`. Each measure is nullable on its own — a row survives if *either* axis clears the `> 0` sentinel filter, unlike `unified_observations`, which demands both. Feeds the Distributions dashboard's reference lines; created only when the optional FDHI flatfile Parquet is present. |

Source labels in `unified_observations.source`: `DEM`, `FDHI`, `SURE`, `Kern`.

## Connecting Tableau

The published workbooks read `dist/csv/` instead (ADR-0006) — Tableau
Public cannot hold a live connection. This JDBC path is for **desktop
exploration**: poking at the views directly, or authoring against the full
row counts before extracting.

One-time driver setup:

1. Download the **DuckDB JDBC driver** from
   <https://duckdb.org/docs/api/java>. Single `.jar` file (~85 MB — it
   bundles natives for every platform).
2. Drop it under Tableau's drivers folder:
   - macOS: `~/Library/Tableau/Drivers/`
   - Linux: `/opt/tableau/tableau_driver/jdbc/` (or `~/.tableau/Drivers/`)
   - Windows: `C:\Program Files\Tableau\Drivers\`
   Create the folder if it doesn't exist.
3. Restart Tableau.

Then per workbook:

1. `Connect → To a Server → More → Other Databases (JDBC)`.
2. **URL**: `egr-build` prints the exact value on each run (it embeds an
   absolute path, so don't copy one from another machine) — it looks like
   ```
   jdbc:duckdb:/Users/<you>/harvard/projects/github/eps-ground-rapture/dashboards/duckdb/eps.duckdb
   ```
3. **Dialect**: `Generic JDBC` (or `SQL92`).
4. **Username / Password**: blank.
5. Click Connect; Tableau lists every view above as a table.

## Quick CLI poke

To verify what the dashboard will see:

```bash
duckdb dashboards/duckdb/eps.duckdb -c \
  "SELECT source, COUNT(*) AS n FROM unified_observations GROUP BY source ORDER BY source"
```

With the current `data/raw/` inputs (as of 2026-08-05):

| source | n       |
|--------|---------|
| DEM    | 329,045 |
| SURE   | 56      |
| FDHI   | 17      |
| Kern   | 6       |

The non-DEM counts are small because the `> 0` filter on both axes is
strict: most SURE and FDHI records are missing one of the two measurements.
`unified_observations` totals 329,124 rows against `dem`'s 346,834.
