# Chart families in the paper and legacy notebooks

A conceptual taxonomy of every figure in Chiama et al. 2025 (*Earthquake
Spectra*, 38 pp., `legacy/Chiama et al 2025 EarthquakeSpectra PDFA.pdf`)
and the two legacy notebooks. "Conceptually different" means the chart
answers a different *question*, not merely uses a different mark type.

Sources scanned:
- **Paper**: Figures 1–15 (captions extracted from the PDF).
- **nb1** = `2D DEM - Figures for 2024 DEM Paper.ipynb` (31 code cells,
  ~17 figure cells).
- **nb2** = `2Ddem 2025 Paper Revisions - FDHI Scarp Height & DZW.ipynb`
  (30 code cells, ~20 figure cells).
- The prior owner's latest script `legacy/FDHI-SURE-DEM_SCATTER.py`.

## Family 1 — Model vs. reality: overlay scatter

**Question**: *does the simulation behave like real earthquakes?*

DZW × Scarp_Height; dense 2D-DEM cloud (colored by Scarp_Class or
Fault_Dip) with FDHI / SURE / Kern field measurements overlaid as star
markers.

- Paper: Fig. 13 (scatter panels).
- nb2: cells 3, 7, 8, 10, 11, 23, 24.
- `FDHI-SURE-DEM_SCATTER.py` (adds 3D-DEM cases; the most recent version).

**Status: built** — Dashboard 1 in `dashboards/tableau/dem-overview.twb`
(scatter + event map + coverage matrix).

## Family 2 — DEM response curves: driver → response scatter

**Question**: *how does the model respond as slip / magnitude
accumulates, under each condition?*

X is always an **input driver** (`Slip` or `Magnitude`); y is a
**response** (`Scarp_Height`, `DZW`, `Scarp_Dip`/`Convert_Scarp_Dip`,
`VDHW`); paneled/colored by `Scarp_Class`, `Fault_Dip`, `Cohesion`,
`Set`. Both axes are model-internal — no field data involved. This is
the bulk of nb1, including very large small-multiple sweeps (up to 96
scatter calls in one figure, one panel per material case).

- Paper: Fig. 6 (homogeneous vs heterogeneous side-by-side).
- nb1: cells 5–9 (8-panel grids), 21 (per-Cohesion sweep, 44 panels),
  23–29 (per-material sweeps, 8–96 panels each).
- nb2: cell 9.

## Family 3 — Distributions: histograms faceted by model parameter

**Question**: *what is the spread of each output, and which input
parameter shifts it?*

Six-panel histograms of one variable (`Scarp_Height`, `DZW`,
`Scarp_Dip`) with hue = `Scarp_Class`, `Density`, `Depth`, `Fault_Dip`,
`Sediment_Strength`, `FS_depth`/`UnrupturedSed`.

Hybrid sub-flavor: the same histograms with **historic-event reference
lines** (`axvline` at Kern / Wenchuan / Kashmir values) — a
distribution-shaped member of the model-vs-reality conversation.

- Paper: Figs. 9–12 (pure parameter study), Fig. 15 (with Kern lines,
  plotted as probability).
- nb1: cells 11–20.
- nb2: cells 14–16, 25.

## Family 4 — Summary statistics: mean ± standard deviation per class

**Question**: *what are the typical values and spreads per scarp class,
at a glance?*

Averages with standard-deviation whiskers for each surface-deformation
characteristic (scarp height, Us-Ud, DZW, scarp dip), organized by scarp
class incl. collapse-modified variants.

- Paper: **Fig. 8 only** — notably, *no code for it exists in either
  notebook* (produced elsewhere).

Trivially expressible in Tableau (AVG marks + stdev whiskers /
reference bands); a natural companion sheet to Family 3.

## Family 5 — Per-event boxplots of the field data

**Question**: *how variable are the field measurements within each
earthquake, and do DEM ranges bracket them?*

Boxplots of FDHI measurements (`fzw_central_meters`,
`sh_central_meters`, `vs_central_meters`) with **`eq_name` as the
categorical axis**; sometimes alongside the DEM distribution for the
same quantity. The inverse perspective of Family 1: summarizing
*reality's* spread with the model as context.

- Paper: Fig. 13 (boxplot panels — "boxplots depict quartiles").
- nb2: cells 19, 20, 21 (one per measure), 25 (combined panels with
  DEM histogram + event boxplots).

## Family 6 — Regression / calibration with back-projection

**Question**: *what law links slip to vertical displacement, and what
slip would produce an observed displacement?*

Per-Fault_Dip linear fits of Slip × VDHW ("robust linear relationship…
described by Equation 2"), then **inverting the fit**: placing Kern
County's measured vertical displacement on the regression line to infer
the causative slip (intersection stars).

- Paper: Fig. 14.
- nb2: cells 12, 13, 27, 28 (scatter + `ax.plot` fit lines +
  intersection markers).

The only family that needs analytical pre-compute — see the
`dem_regression` view in `notes/Roadmap.md` (DuckDB `regr_slope()` /
`regr_intercept()`; no Python regression needed).

## Non-chart figures (illustrations)

Paper Figs. 1–5, 7: photographs of surface ruptures, scarp-morphology
schematics, particle-mechanics diagrams, DEM simulation snapshots.
Not data charts — candidates for **static-image embedding** on
dashboards as explanatory context (see Roadmap).

## Cross-reference: families ↔ legacy roadmap themes

The Roadmap originally used themes A–E; this taxonomy refines them:

| Family | Old theme | Roadmap status |
|--------|-----------|----------------|
| 1. Model vs reality scatter | A | ✅ Dashboard 1 built |
| 2. Driver→response curves | B (+D facets) | priority 2 |
| 3. Faceted distributions | C/D | lower priority |
| 4. Mean ± σ summary | — (new) | lower priority |
| 5. Per-event boxplots | C (implicit) | priority 3 |
| 6. Regression + inference | E | priority 4 |
| Illustrations | — (new) | lowest priority |
