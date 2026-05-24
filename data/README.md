# Data

All subdirectories here are gitignored except for this README and `.gitkeep`
markers — drop raw inputs in locally and let the pipeline produce outputs.

## Expected raw inputs (`data/raw/`)

Sourced from the original author's machine; obtain from the project owner.
For background on what each file is and how the legacy notebooks use it,
see `docs/datasets.md`.

- `DEM_dataset.csv` — main 2D DEM trial measurements (Homogeneous + Heterogeneous sets)
- `02_FDHI_FLATFILE_MEASUREMENTS_20220719.csv` — FDHI flatfile (raw)
- `Combine_BuwaldaFDHI_KernSDC.csv` — combined Buwalda/FDHI Kern County dataset
- `4_05_24_homogeneous_heterogeneous.csv` — alternative DEM measurement file used in notebook 2

## Generated outputs

- `data/interim/` — partial cleaning artifacts (rarely committed)
- `data/processed/<table>/data.parquet` — one Parquet file per logical
  table, in the dir-per-table layout Athena and Spark Thrift expect.
  Currently produced: `dem/`, `fdhi_cleaned/` (when not skipped).
