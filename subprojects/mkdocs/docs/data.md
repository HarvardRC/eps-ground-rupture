# Data

Four datasets sit behind the dashboards: one produced by simulation, three
compiled from field observations of real earthquakes.

## DEM model outputs

The paper reports **3,434 distinct element method experiments**, each a
distinct combination of geological and fault conditions. Within an
experiment the modelled fault slips progressively, and the ground surface is
measured at every 0.05 m of slip — **346,834 model stages** in
total.[^abstract] So a row is a stage, not an experiment: the fixed
parameters repeat down the rows of one experiment while slip advances.

The experiments sweep sediment depth, density, homogeneous and heterogeneous
sediment strengths, fault dip, and the thickness of unruptured sediment
above the fault tip. From each stage a computer-vision model measures four
surface characteristics: scarp height, uplift, deformation zone width and
scarp dip.[^abstract] The simulations are two-dimensional; a set of 3D cases
exists in the wider project but is not part of these dashboards.[^roadmap]

*Provenance:* the model dataset is published open-access on DesignSafe —
DOIs [10.17603/ds2-gfsj-pp60](https://doi.org/10.17603/ds2-gfsj-pp60) and
[10.17603/ds2-xpq0-gw80](https://doi.org/10.17603/ds2-xpq0-gw80).[^abstract]

This is the cloud in [Model vs reality](dashboards/model-vs-reality.md), the
whole subject of [Response curves](dashboards/response-curves.md), and the
context distribution in
[Per-event boxplots](dashboards/per-event-boxplots.md).

## FDHI flatfile

The **Fault Displacement Hazards Initiative** measurement flatfile — a
published compilation of surface-rupture measurements across many
earthquakes, with per-measurement location, displacement components and
event metadata. It is the field dataset the paper compares its models
against.[^abstract]

*Provenance:* UCLA Dataverse, DOI
[10.25346/S6/Y4F9LJ](https://doi.org/10.25346/S6/Y4F9LJ).

The project cleans this flatfile in-pipeline rather than relying on a
pre-filtered extract. That yields two tables for two different jobs: a
4,121-row measurement population across 25 events, which backs the per-event
boxplots, and a much smaller scatter-overlay subset that backs the
model-vs-reality view.[^spec]

## SURE database

The **SUrface Ruptures due to Earthquakes (SURE) database**, version 2.0 — a public
compilation of surface-rupture observations across many historical
earthquakes. Roughly 1,400 measurement records covering identifiers,
location, strike-slip / fault-normal / vertical displacement components and
their uncertainties, scarp height, and event metadata.[^datasets]

It supplies the fault-normal-component and scarp-height panels in the
per-event boxplots. Note that the release carries no event magnitude; the
magnitudes shown on those panels come from a lookup curated inside this
project.[^datasets]

## Kern County (1952)

A hand-compiled merge of three sources of surface-rupture measurements from
the **1952 M 7.36 Kern County earthquake** on the White Wolf fault in
California: the classic Buwalda & St. Amand (1955) field survey, the Kern
entries from the FDHI flatfile, and an "SDC" contribution — most likely a
surface-displacement catalogue added by the original analyst, though the
project's own notes record that expansion as unconfirmed.[^datasets]

Kern is the project's worked example for inverting the model — placing a
measured vertical displacement on a fitted relationship to infer the slip
that produced it.[^datasets] That inversion is not yet a dashboard; see the
[crosswalk](paper.md#figure-dashboard-crosswalk).

## How the data reaches the dashboards

The pipeline is linear. Raw CSVs land in a local, untracked `data/raw/`
directory and are read by typed loaders; the FDHI flatfile is cleaned
in-process into the analysis tables. Each table is written as **Parquet** in
a directory-per-table layout, and a **DuckDB** file of view definitions is
generated over that Parquet — this is where cross-source normalisation and
the event-magnitude lookup happen, and it is the local SQL layer for
desktop analysis.[^roadmap] Because Tableau *Public* cannot connect to
either DuckDB or a cloud warehouse, a final step exports each view to
**CSV**, and those CSVs are what the published dashboards on this site are
built from.[^spec]

Every step is reproducible from the repository — one command builds the
tables, views and schemas, a second exports the CSVs — and the pipeline
fails fast if any raw input is missing rather than producing a partial set
of artifacts.

!!! info "Raw data is not redistributed here"
    The raw inputs are not committed to the repository — they come from the
    sources cited above, or from the project owner. The repository documents
    the expected filenames and their provenance.

[^abstract]: Chiama et al. (2025), abstract — see [The paper](paper.md).
[^spec]: `notes/dashboard-3-build-spec.md` in the source repository.
[^datasets]: `docs/datasets.md` in the source repository — reference notes
    on each input dataset and how the legacy analyses used it.
[^roadmap]: `notes/Roadmap.md` in the source repository.
