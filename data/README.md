# Data

All subdirectories here are gitignored except for this README and `.gitkeep`
markers — drop raw inputs in locally and let the pipeline produce outputs.

## Expected raw inputs (`data/raw/`)

Sourced from the prior project owner. For background on what each file is
and how the pipeline / legacy notebooks use it, see `docs/datasets.md`.

- `DEM_dataset.csv` — main 2D DEM trial measurements (Homogeneous + Heterogeneous sets)
- `02_FDHI_FLATFILE_MEASUREMENTS_<date>.csv` — the raw FDHI flatfile from
  UCLA Dataverse (DOI `10.25346/S6/Y4F9LJ`, file `ABRP7B`). **Preferred
  FDHI source**: the pipeline cleans it in-process, producing both
  `fdhi_cleaned` and `fdhi_measurements`.
- `FDHI_Cleaned_Measurements.csv` — the prior owner's pre-cleaned FDHI
  extract (~20 rows). **Not** a pipeline input any more: `egr-build`
  derives the same subset from the flatfile above and fails fast if that
  is missing, rather than falling back to a differently-shaped table. Kept
  as the reference `tests/test_prep.py` checks the cleaning chain against.
- `SURE.csv` — SURE database v2.0 (surface-rupture observations)
- `Combine_BuwaldaFDHI_KernSDC.csv` — combined Buwalda / FDHI / SDC Kern County dataset

## Generated outputs

- `data/interim/` — partial cleaning artifacts (rarely committed)
- `data/processed/<table>/data.parquet` — one Parquet file per logical
  table, in the dir-per-table layout Athena and Spark Thrift expect.
  Currently produced: `dem/`, `fdhi_cleaned/`, `sure/`, `kern_combined/`,
  plus `fdhi_measurements/` when the raw FDHI flatfile is present.
- `dashboards/duckdb/eps.duckdb` — DuckDB views over the Parquet above;
  `dashboards/sql/*.sql` and `deploy/terraform/tables.json` — schemas.
