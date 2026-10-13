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

??? note "What each `Cohesion` value means"

    `Cohesion` is the one control whose values are codes rather than
    quantities, and the codes are the paper's own — Table 3 names them.

    **The key, if you read nothing else:** the three letters in each strength
    band are the *same* gradient built at the three sediment depths. A, F and K
    are all "weak"; B, G and L all "moderate"; C, H and M all "strong". What
    separates them is 3 m, 5 m or 10 m of sediment, and so how many 1 m layers
    the gradient is spread over.

    **Homogeneous** — one uniform material, top to bottom. The dashboard shows
    cohesion in pascals:

    | Shown as | Cohesion | Banded as |
    |---|---|---|
    | `1.00E+05` | 0.1 MPa | Weak |
    | `5.00E+05` | 0.5 MPa | Weak |
    | `1.00E+06` | 1.0 MPa | Moderate |
    | `1.50E+06` | 1.5 MPa | Strong |
    | `2.00E+06` | 2.0 MPa | Strong |

    **Heterogeneous** — 1 m layers, strongest at the base, weakening upward.
    Values run surface → base, in MPa:

    | Code | Depth | Band | Layers, surface → base |
    |---|---|---|---|
    | `A` | 3 m | Weak | 0.1, 0.5, 1.0 |
    | `B` | 3 m | Moderate | 0.5, 1.0, 1.5 |
    | `C` | 3 m | Strong | 1.0, 1.5, 2.0 |
    | `F` | 5 m | Weak | 0.1, 0.25, 0.5, 0.75, 1.0 |
    | `G` | 5 m | Moderate | 0.5, 0.75, 1.0, 1.25, 1.5 |
    | `H` | 5 m | Strong | 1.0, 1.25, 1.5, 1.75, 2.0 |
    | `K` | 10 m | Weak | 0.1 … 1.0, in 0.1 steps |
    | `L` | 10 m | Moderate | 0.6 … 1.5, in 0.1 steps |
    | `M` | 10 m | Strong | 1.1 … 2.0, in 0.1 steps |

    **Three special configurations**, each a suite of its own:

    | Code | What it is |
    |---|---|
    | `Q` | **Cohesive top unit** — a 1 m crust bonded at 2.0 MPa over uniform 1.0 MPa sediment. The only code run at all three depths, which is why it carries three times the rows. [Figure 7](../figures.md#fig-7) shows what it does to a scarp. |
    | `S` | **Alternating strong–weak** — layers alternating between 2.0 and 0.1 MPa, the extremes used anywhere in the study. A dense 10 m profile only, at fault dips 20°, 40° and 60°: nine experiments, the smallest suite here. |
    | `R1`–`R10` | **Random** — ten realisations of a dense 10 m profile, each of the ten 1 m layers drawn from 0.1–2.0 MPa. `R1` is the one the paper draws, in [Figure 4](../figures.md#fig-4): 0.4, 0.7, 1.8, 1.7, 1.1, 0.3, 1.3, 1.5, 1.2, 1.9 MPa, surface → base. |

    !!! warning "Still being confirmed with the authors"
        Four details are not settled from the paper alone, and we would rather
        say so than guess: the per-layer values for `R2`–`R10` (the paper defers
        them to a supplement we do not hold); whether `S` is the authors' own
        label, since that letter appears nowhere in the paper; how thick `S`'s
        bands are and whether the column starts strong or weak at the surface;
        and why the sequence skips D, E, I, J, N, O and P.

    One thing worth knowing about the legend: **"Weak", "Moderate" and
    "Strong" mean different things on either side of `Set`.** For homogeneous
    runs they band a single cohesion value; for heterogeneous runs they name a
    gradient that spans into the next band up — a heterogeneous "weak" column
    reaches 1.0 MPa at its base, which is a homogeneous "moderate".


Holding the driver fixed and re-colouring by each condition in turn is the
fastest way to see which inputs separate the curves and which leave them
overlapping. The paper reports that the parameters with most influence on
surface rupture patterns are **fault displacement, fault dip, sediment
depth and sediment strength**.[^abstract]

The sediment conditions are easier to read as pictures than as labels:
[Figure 4](../figures.md#fig-4){ .figure-pop data-img="../../images/fig-04-compare-dem-models.png" data-title="Figure 4 — the sediment configurations" } shows the six set-ups
side by side, and
[Figure 7](../figures.md#fig-7){ .figure-pop data-img="../../images/fig-07-homogeneous-vs-ctu.png" data-title="Figure 7 — why the layering matters" } shows how much
difference a cohesive top unit makes at the same slip and dip.

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
