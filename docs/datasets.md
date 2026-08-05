# Input datasets

Reference notes on the raw input files the pipeline expects in `data/raw/`.
See `data/README.md` for the bare file list; this file documents what each
dataset actually is and how the pipeline / legacy notebooks use it.

## DEM trials (`DEM_dataset.csv`)

Loader: `eps_ground_rupture.io.load_dem`.

The main 2D DEM (Discrete Element Method) measurements dataset produced by
the simulation runs underlying Chiama et al. 2025. Each row is one trial
with columns like `Slip`, `Scarp_Height`, `DZW`, `Fault_Dip`, `Scarp_Class`,
`Cohesion`, `Set` (Homogeneous / Heterogeneous), etc.

Notes:
- `Cohesion` is a categorical string column (`R1..R10`, `Q`, `S`, `A..M`)
  with NaNs, which requires `low_memory=False` on load and `object →
  string` coercion before Parquet writes (handled by `export.py`).

## FDHI (pre-cleaned) (`FDHI_Cleaned_Measurements.csv`)

Loader: `eps_ground_rupture.io.load_fdhi`.

A pre-filtered ~20-row extract from the **Fault Displacement Hazard
Initiative (FDHI) Project** flatfile, produced by the prior owner's
`legacy/FDHI-SURE-DEM_SCATTER.py` script. The filter chain that produced
it: reverse / reverse-oblique style, any positive `vs_*` / `sh_*`
measurement, `0 < fzw_central_meters < 50`, usage flag in `{Check, Keep}`.
(Note: this is the *updated* filter — the legacy notebook also required
`rupture_rank == 'Principal'`, which the prior owner dropped in the new
version.)

The pipeline currently consumes this CSV as-is — it is the source of
truth for the FDHI table in our dashboards. **This is a temporary
arrangement**; see [TODO.md](../TODO.md) for the plan to replace it with
the raw flatfile (from UCLA Dataverse DOI `10.25346/S6/Y4F9LJ`, file
`ABRP7B`) + an in-pipeline cleaning step. Until then there is no source
of truth for the cleaning logic inside this repo.

Useful columns for dashboard overlays: `eq_name`, `fzw_central_meters`
(deformation zone width), `vs_central_meters` (vertical scarp central
estimate), `sh_central_meters` (scarp height central estimate),
`magnitude`, `style`.

## SURE database (`SURE.csv`)

Loader: `eps_ground_rupture.io.load_sure`.

### What it is

The **SURE (Surface Rupture Earthquake) database** — a public compilation
of surface-rupture observations across many historical earthquakes,
released as version 2.0 by the original team. ~1,400 rows of individual
measurement records, 75 columns covering identifiers, location,
strike-slip / fault-normal / vertical displacement components and their
uncertainties, scarp height, and event metadata.

The CSV ships with a UTF-8 BOM on the first column header (`IdE`); the
loader strips it via `encoding="utf-8-sig"`.

### How the prior owner uses it

`legacy/FDHI-SURE-DEM_SCATTER.py` subsets SURE by `eq_name` to overlay
the **Wenchuan** and **Chi-Chi** earthquakes onto the DEM scatterplot,
using:

| Column | Meaning                                  |
|--------|------------------------------------------|
| `eq_name` | Earthquake name (filter key)          |
| `FNC`     | Fault-normal component of displacement (≈ DZW analogue in the script's scatterplot) |
| `SH`      | Scarp height (meters)                 |

### Pipeline status

The loader returns the full table; downstream dashboards filter by
`eq_name` to choose which event(s) to overlay. No cleaning step yet —
the data is shipped as-is from the upstream release.

## Kern County (`Combine_BuwaldaFDHI_KernSDC.csv`)

Loader: `eps_ground_rupture.io.load_kern_combined`.

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

It is **not a public dataset.** Obtained from the prior project owner.

The CSV has a UTF-8 BOM and three columns literally named "Comments";
the loader strips the BOM with `encoding="utf-8-sig"` and pandas
auto-renames the duplicates to `Comments`, `Comments.1`, `Comments.2`.

### How the legacy notebook uses it

Loaded once as `df_KernNew` and used as **reference overlay points on DEM
scatterplots and histograms** — black or red star markers showing where
the 1952 event sits in (DZW, scarp-height) space relative to the DEM
model cloud. Two columns are referenced:

| Column      | Meaning                                |
|-------------|----------------------------------------|
| `DZW`       | Deformation Zone Width (meters)        |
| `Vertical`  | Vertical scarp height (meters)         |

It is also used to compute **intersection slip values**
(`ai/inital-conversation.md:347`): projecting Kern's measured vertical
displacement onto a per-`Fault_Dip` linear regression of the DEM cloud to
back-infer what fault slip would have produced it.

### Pipeline status

The loader is a thin `pd.read_csv` wrapper. The `kern_combined` Parquet
table is emitted by `egr-build` for dashboard consumption.
