---
hide:
  - toc
---

# Response curves

<p class="cite-open-row"><button class="cite-open" type="button">How to cite</button></p>

**The question:** how do the measured surface characteristics change as
slip accumulates, and which conditions change that relationship?

This dashboard stays inside the simulations — the two-dimensional
[distinct element method (DEM)](../glossary.md#dem) experiments — with no
field measurements plotted. Each point is one
[model stage](../glossary.md#model-stage): a snapshot of the modelled ground
surface after another 0.05 m of [slip](../glossary.md#slip). The trend line
through them is the relationship you are reading.

!!! tip "Unfamiliar terms?"
    **Slip**, **fault dip**, **DZW**, **Us − Ud**,
    [**r²**](../glossary.md#r2), and the sediment settings — all defined in
    the [glossary](../glossary.md), which also explains
    [why each curve's slope lands near sin(fault dip)](../glossary.md#how-the-quantities-relate).

Three controls define the view:

- **Driver** (the x-axis): [`Slip`](../glossary.md#slip) or
  [`Magnitude`](../glossary.md#magnitude).
- **Response** (the y-axis): [`Scarp_Height`](../glossary.md#scarp-height),
  [`DZW`](../glossary.md#dzw), [`Scarp_Dip`](../glossary.md#scarp-dip), or
  [`Us - Ud`](../glossary.md#us-ud) — the height added at the surface by
  folding and secondary faulting, over and above what the fault itself
  lifted.[^abstract]
- **Condition By** (the colouring):
  [`Scarp_Class`](../glossary.md#scarp-classes) (the six shapes —
  [monoclinal](../glossary.md#monoclinal),
  [pressure ridge](../glossary.md#pressure-ridge),
  [simple](../glossary.md#simple), and each after
  [collapse](../glossary.md#collapse)),
  [`Fault_Dip`](../glossary.md#fault-dip),
  [`Cohesion`](../glossary.md#cohesion), [`Set`](../glossary.md#set)
  (homogeneous or layered sediment), [`Density`](../glossary.md#sediment-strength)
  or [`Sediment_Strength`](../glossary.md#sediment-strength).

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

[Open full-size on Tableau Public](https://public.tableau.com/app/profile/michael.bouzinier/viz/dem-response-curve-public/DEMResponseCurves){ .embed-fallback } <button class="cite-open" type="button">How to cite</button>

## Where this comes from

This is **chart family 2** in the project's inventory, which maps it to the
paper's Figure 6 (homogeneous and heterogeneous cases side by side).[^families]
It is the interactive replacement for what the legacy analysis notebooks
produced as large static small-multiple grids — in one case 96 separate
scatter panels in a single figure, one per material case.[^families]

The underlying data is the DEM experiment set described on the
[Data](../data.md) page.

## Where to go next

- **[Model vs reality](model-vs-reality.md)** — put the simulations side by
  side with measurements from real earthquakes.
- **[Per-event boxplots](per-event-boxplots.md)** — how much the field
  measurements vary within a single earthquake.
- **[Slip regression](slip-regression.md)** — that same sin(dip) relationship
  fitted per dip, then inverted to infer slip from a field measurement.
- **[Glossary](../glossary.md#how-the-quantities-relate)** — why each curve's
  slope lands so close to sin(fault dip).

<p class="cite-open-row"><button class="cite-open" type="button">How to cite</button></p>

--8<-- "includes/cite-sub.md"

[^abstract]: Chiama et al. (2025), abstract — the measured characteristics
    are scarp height, uplift, deformation zone width and scarp dip.
[^magnitude]: Chiama et al. (2025): the study "focuses on considering the
    near-surface values of slip on a fault, rather than coseismic slip
    values at depth", and notes that while it is useful to compare results
    broadly to event magnitude, they are most appropriately used to estimate
    deformation for a given local displacement. The derived-axis formula
    lives in `dashboards/tableau/dem-response-curve-public.twb`.
[^families]: `notes/chart-families.md` in the source repository.
