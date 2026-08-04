---
hide:
  - toc
---

# Response curves

**The question:** how do the measured surface characteristics change as
slip accumulates, and which conditions change that relationship?

This dashboard stays inside the simulations — no field measurements are
plotted. Each point is one model stage; the trend line through them is the
relationship you are reading.

Three controls define the view:

- **Driver** (the x-axis): `Slip` or `Magnitude`.
- **Response** (the y-axis): `Scarp_Height`, `DZW` (deformation zone width —
  the span of disturbed ground, defined on the
  [model vs reality](model-vs-reality.md) page), `Scarp_Dip`, or `Us - Ud`
  (the scarp height minus the downthrown-side displacement, which separates
  folding and uplift from the fault's own vertical offset).[^abstract]
- **Condition By** (the colouring): `Scarp_Class`, `Fault_Dip`, `Cohesion`,
  `Set`, `Density` or `Sediment_Strength`.

Holding the driver fixed and re-colouring by each condition in turn is the
fastest way to see which inputs separate the curves and which leave them
overlapping. The paper reports that the parameters with most influence on
surface rupture patterns are **fault displacement, fault dip, sediment
depth and sediment strength**.[^abstract]

!!! warning "`Magnitude` is a derived axis, not a model input"
    The experiments are driven by slip, not by magnitude — the paper focuses
    on near-surface slip rather than magnitude, noting that earthquakes of a
    given magnitude produce a range of surface displacements.[^magnitude]
    The `Magnitude` option on this dashboard is computed from slip through
    an empirical scaling relation applied in the workbook, so it is a
    monotone re-labelling of the same axis rather than an independent
    variable. Read it as a convenience scale, and prefer `Slip` when the
    distinction matters.

<div class="tableau-fit" data-width="800" data-height="1000" markdown="0">
  <tableau-viz src="https://public.tableau.com/views/dem-response-curve-public/DEMResponseCurvesweb" width="800" height="1000"
    toolbar="bottom" hide-tabs></tableau-viz>
</div>

[Open full-size on Tableau Public](https://public.tableau.com/app/profile/michael.bouzinier/viz/dem-response-curve-public/DEMResponseCurves){ .embed-fallback }

## Where this comes from

This is **chart family 2** in the project's inventory, which maps it to the
paper's Figure 6 (homogeneous and heterogeneous cases side by side).[^families]
It is the interactive replacement for what the legacy analysis notebooks
produced as large static small-multiple grids — in one case 96 separate
scatter panels in a single figure, one per material case.[^families]

The underlying data is the DEM experiment set described on the
[Data](../data.md) page.

[^abstract]: Chiama et al. (2025), abstract — the measured characteristics
    are scarp height, uplift, deformation zone width and scarp dip.
[^magnitude]: Chiama et al. (2025): the study "focuses on considering the
    near-surface values of slip on a fault, rather than coseismic slip
    values at depth", and notes that while it is useful to compare results
    broadly to event magnitude, they are most appropriately used to estimate
    deformation for a given local displacement. The derived-axis formula
    lives in `dashboards/tableau/dem-response-curve-public.twb`.
[^families]: `notes/chart-families.md` in the source repository.
