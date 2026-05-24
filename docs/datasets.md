# Input datasets

Reference notes on the raw input files the pipeline expects in `data/raw/`.
See `data/README.md` for the bare file list; this file documents what each
dataset actually is and how the legacy notebooks use it.

## Kern County (`Combine_BuwaldaFDHI_KernSDC.csv`)

Loader: `eps_ground_rapture.io.load_kern_combined`
(`subprojects/python/src/eps_ground_rapture/io.py:34`).

### What it is

A hand-compiled merge of three sources of surface-rupture measurements from
the **1952 M 7.36 Kern County (Bakersfield, CA) earthquake** on the White
Wolf fault. The filename encodes the merge:

- **Buwalda** — Buwalda & St. Amand (1955), the classic field survey of the
  Kern County surface rupture. Plot labels in the legacy notebook cite it as
  `"Kern County (Buwalda & St. Amand, 1955)"`.
- **FDHI** — the Kern entries from the FDHI flatfile
  (`df_FDHI.eq_name == 'Kern'`).
- **SDC** — most likely a "Surface Displacement Catalog" component added by
  the original notebook author.

It is **not a public dataset.** The paper author (Chiama) compiled it
locally at
`/Users/kchiama/Documents/PFC DEM/2025 Earthquake Spectra DEM paper/Combine_BuwaldaFDHI_KernSDC.csv`.
To obtain a copy, ask the paper authors.

### How the legacy notebook uses it

Loaded once as `df_KernNew` (see `ai/inital-conversation.md:139`) and used
as **reference overlay points on DEM scatterplots and histograms** — black
or red star markers showing where the 1952 event sits in (DZW,
scarp-height) space relative to the DEM model cloud. Two columns are
referenced:

| Column      | Meaning                                |
|-------------|----------------------------------------|
| `DZW`       | Deformation Zone Width (meters)        |
| `Vertical`  | Vertical scarp height (meters)         |

It is also used to compute **intersection slip values**
(`ai/inital-conversation.md:347`): projecting Kern's measured vertical
displacement onto a per-`Fault_Dip` linear regression of the DEM cloud to
back-infer what fault slip would have produced it.

### Pipeline status

The loader is a thin `pd.read_csv` wrapper. There is no companion cleaner
in `prep.py` because the notebook treats this CSV as already-clean
reference data. Until the file lands in `data/raw/`, calling
`load_kern_combined()` will raise `FileNotFoundError`. There is no
`--skip-kern` CLI flag yet because the Kern overlay is currently only
referenced from notebook plotting code, not from `egr-build`.

## DEM trials (`DEM_dataset.csv`)

Loader: `eps_ground_rapture.io.load_dem`.

The main 2D DEM (Discrete Element Method) measurements dataset produced by
the simulation runs underlying Chiama et al. 2025. Each row is one trial
with columns like `Slip`, `Scarp_Height`, `DZW`, `Fault_Dip`, `Scarp_Class`,
`Cohesion`, `Set` (Homogeneous / Heterogeneous), etc. This is the only raw
file currently checked into a working setup.

Notes:
- `Cohesion` is a categorical string column (`R1..R10`, `Q`, `S`, `A..M`)
  with NaNs, which requires `low_memory=False` on load and `object →
  string` coercion before Parquet writes (handled by `export.py`).

## FDHI flatfile (`02_FDHI_FLATFILE_MEASUREMENTS_20220719.csv`)

Loader: `eps_ground_rapture.io.load_fdhi`; cleaner:
`eps_ground_rapture.prep.clean_fdhi`.

A release of the **Fault Displacement Hazard Initiative (FDHI) Project**
flatfile, dated 2022-07-19. Public dataset; the canonical source is the
FDHI Project's data release (typically on DesignSafe-CI). Not yet sourced
for this repo — `egr-build` must be invoked with `--skip-fdhi` until it
lands in `data/raw/`. See `docs/setup.md` for the known-gaps list.
