# Data

All subdirectories here are gitignored except for this README and `.gitkeep`
markers — drop raw inputs in locally and let the pipeline produce outputs.

## Expected raw inputs (`data/raw/`)

Sourced from the prior project owner. For background on what each file is
and how the pipeline / legacy notebooks use it, see `docs/datasets.md`.

- `DEM_dataset.csv` — main 2D DEM trial measurements (Homogeneous + Heterogeneous sets)
- `FDHI_Cleaned_Measurements.csv` — pre-cleaned FDHI extract (~20 rows).
  Temporary; see [TODO.md](../TODO.md) for the plan to switch to the raw
  flatfile + in-pipeline cleaning.
- `SURE.csv` — SURE database v2.0 (surface-rupture observations)
- `Combine_BuwaldaFDHI_KernSDC.csv` — combined Buwalda / FDHI / SDC Kern County dataset

## Generated outputs

- `data/interim/` — partial cleaning artifacts (rarely committed)
- `data/processed/<table>/data.parquet` — one Parquet file per logical
  table, in the dir-per-table layout Athena and Spark Thrift expect.
  Currently produced: `dem/`, `fdhi_cleaned/`, `sure/`, `kern_combined/`.
