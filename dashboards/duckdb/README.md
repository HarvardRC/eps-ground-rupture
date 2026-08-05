# DuckDB views

This directory holds `eps.duckdb` — a thin DuckDB database file containing
**view definitions only**. The actual row data lives in
`data/processed/<table>/data.parquet`; the views simply project Parquet
files through DuckDB's `read_parquet()` and add a `unified_observations`
UNION view that normalizes column names across the four source tables.

The `.duckdb` file is gitignored — regenerate it with
`poetry run egr-build` (or `./gradlew :subprojects:python:egrBuild`).
Regeneration is fast because the views don't copy data.

## Views exposed

| Name                    | What                                                                 |
|-------------------------|----------------------------------------------------------------------|
| `dem`                   | 2D DEM trial measurements (`data/processed/dem/data.parquet`)        |
| `fdhi_cleaned`          | Pre-cleaned FDHI extract                                             |
| `sure`                  | SURE database v2.0                                                   |
| `kern_combined`         | Buwalda / FDHI / SDC Kern County                                     |
| `unified_observations`  | UNION of the four above with normalized `(source, dzw, scarp_height, scarp_class, eq_name, fault_dip, cohesion, dem_set)` columns. Rows where the (dzw, scarp_height) pair is null are filtered out. |

Source labels in `unified_observations.source`: `DEM`, `FDHI`, `SURE`, `Kern`.

## Connecting Tableau

One-time driver setup:

1. Download the **DuckDB JDBC driver** from
   <https://duckdb.org/docs/api/java>. Single `.jar` file (~30 MB).
2. Drop it under Tableau's drivers folder:
   - macOS: `~/Library/Tableau/Drivers/`
   - Linux: `/opt/tableau/tableau_driver/jdbc/` (or `~/.tableau/Drivers/`)
   - Windows: `C:\Program Files\Tableau\Drivers\`
   Create the folder if it doesn't exist.
3. Restart Tableau.

Then per workbook:

1. `Connect → To a Server → More → Other Databases (JDBC)`.
2. **URL**: the `egr-build` run prints the exact value; it looks like
   ```
   jdbc:duckdb:/Users/<you>/harvard/github/eps-ground-rapture/dashboards/duckdb/eps.duckdb
   ```
3. **Dialect**: `Generic JDBC` (or `SQL92`).
4. **Username / Password**: blank.
5. Click Connect; Tableau will show the five views as tables.

## Quick CLI poke

To verify what the dashboard will see:

```bash
duckdb dashboards/duckdb/eps.duckdb -c \
  "SELECT source, COUNT(*) AS n FROM unified_observations GROUP BY source ORDER BY source"
```

Expected (with the current `data/raw/` inputs):

| source | n        |
|--------|----------|
| DEM    | ~346 000 |
| FDHI   | ~19      |
| Kern   | a few    |
| SURE   | ~1 400   |
