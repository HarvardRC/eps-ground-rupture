---
hide:
  - toc
---

# Per-event boxplots

**The question:** how variable are the field measurements *within* each
earthquake — and does the model's range cover them?

This is the inverse of [Model vs reality](model-vs-reality.md). Instead of
scattering individual field points over the simulated cloud, it summarises
the spread of measurements event by event, with the distribution from the
[distinct element method (DEM)](../glossary.md#dem) simulations alongside
for comparison.

!!! tip "Unfamiliar terms?"
    **Median**, **interquartile range**, **whiskers** and **log scale** are
    defined under [statistics](../glossary.md#statistics-terms);
    **FDHI**, **SURE**, **vertical separation** and **principal rupture**
    under [the field counterparts](../glossary.md#the-field-counterparts)
    and [the datasets](../glossary.md#the-datasets).

Every data panel is a box-and-whisker plot. The box spans the
[interquartile range](../glossary.md#iqr), the line inside is the median,
and the [whiskers](../glossary.md#whiskers) reach the most extreme
measurement still within 1.5 × IQR of the box. That is the default in both
Tableau and the plotting library used in the original analysis, which is
what lets these boxes be compared with the paper's.[^spec]

On the field panels each box is one earthquake. On the DEM panels each box
is one [scarp class](../glossary.md#scarp-classes) instead — that is how the
model's range is broken down.[^spec] The six are
[`Monoclinal`](../glossary.md#monoclinal),
[`Pressure Ridge`](../glossary.md#pressure-ridge),
[`Simple`](../glossary.md#simple) and a
[`… Collapse`](../glossary.md#collapse) variant of each.

Two dashboards divide the material.

## Model vs field

This dashboard stacks each DEM distribution above the comparable field
measure, on a shared axis, for the two quantities the paper compares:
[deformation zone width](../glossary.md#dzw) (in the field data,
[fault zone width](../glossary.md#fzw)) and
[scarp height](../glossary.md#scarp-height).

<div class="tableau-fit" data-width="800" data-height="1200" markdown="0">
  <tableau-viz src="https://public.tableau.com/views/per-event-box-plots-public/Per-EventBoxplotsModelvsField" width="800" height="1200"
    toolbar="bottom" hide-tabs></tableau-viz>
</div>

[Open full-size on Tableau Public](https://public.tableau.com/app/profile/michael.bouzinier/viz/per-event-box-plots-public/Per-EventBoxplotsModelvsField){ .embed-fallback }

### Why the width axis is logarithmic

The width panels use a fixed
[logarithmic axis](../glossary.md#log-scale) spanning **0.01–2,000 m**, and
this is the most consequential presentation choice on the site — because it
is a deliberate departure from how the paper treats the same comparison.

The paper applies a **50 m upper limit** when selecting field measurements
for this comparison. That limit is not a plotting choice: it "reflects the
maximum of our DEM model bounds and seeks to exclude distributed deformation
in natural events that may have occurred across multiple, widely spaced
fault strands."[^limit] In other words, the paper restricts the comparison
to the regime the model was built to represent.

This site shows the unrestricted field range instead. Keeping every
measurement in view means spanning from the model's envelope — the paper
reports a DZW range of 0–40.76 m across the experiments[^dzwrange] — out to
field measurements reaching 1,450 m. The Kaikoura event alone contributes
448 measurements from 50 m to 1,450 m, with a median near 250 m.[^spec] No
linear axis holds both, hence the log scale.

!!! warning "This view answers a different question than the paper's"
    Because the 50 m criterion is excluded here, most of what you see beyond
    that mark is exactly the distributed, multi-strand deformation the paper
    deliberately set aside — not evidence that the model under-predicts. For
    the comparison as the paper frames it, read the region below 50 m. The
    wider view is useful for a different purpose: seeing how much of the
    observed record lies outside the modelled regime.

## Vertical separation and SURE

The second dashboard carries measures that have no DEM counterpart on the
same axis, so they stand alone:
[vertical separation](../glossary.md#vertical-separation) (the vertical
offset across the rupture, which the field compilation treats as comparable
to scarp height[^assumption]) and two measures from the SURE
compilation — [fault-normal component](../glossary.md#fnc) (the horizontal
displacement measured perpendicular to the fault) and its own scarp height.

Coverage differs sharply between them. After the per-sheet filters described
below, vertical separation is the richest panel at 2,106 measurements across
23 events, while SURE's fault-normal component covers 9 events (185
measurements) and its scarp height 4 events (74 measurements).[^spec]

An **event map** sits alongside the boxplots on this dashboard, locating the
FDHI events, and the vertical-separation panel carries its own event filter
so you can narrow the 23 events to a comparable subset.

<div class="tableau-fit" data-width="800" data-height="2000" markdown="0">
  <tableau-viz src="https://public.tableau.com/views/per-event-box-plots-public/Per-EventBoxplotsVSSUREweb" width="800" height="2000"
    toolbar="bottom" hide-tabs></tableau-viz>
</div>

[Open full-size on Tableau Public](https://public.tableau.com/app/profile/michael.bouzinier/viz/per-event-box-plots-public/Per-EventBoxplotsVSSURE){ .embed-fallback }

!!! info "How each panel is filtered, and where the magnitudes come from"
    The FDHI panels keep only measurements the compilation marks as
    [**principal** ruptures](../glossary.md#principal-rupture) — the main
    fault trace, as opposed to distributed or secondary rupture — and only
    those with a positive value for the measure in question. The counts above are after those filters.[^spec]
    The SURE panels apply no row filter.

    Event labels carry a [moment magnitude](../glossary.md#magnitude). For
    the FDHI measurements that value travels with the data; **for SURE it
    does not** — the SURE release records no magnitude column, so those
    values come from a small lookup table curated inside this project,
    every entry of which is sourced from the SURE 2.0 data
    descriptor.[^magnitudes]

## Where this comes from

This is **chart family 5** in the project's inventory, which maps it to the
boxplot panels of the paper's Figure 13.[^families] The measurements come
from the FDHI flatfile and the SURE database, and the model context from the
DEM experiment set — all described on the [Data](../data.md) page.

## Where to go next

- **[Model vs reality](model-vs-reality.md)** — the same comparison as a
  scatter of individual measurements rather than summaries.
- **[Response curves](response-curves.md)** — what drives the model's own
  range in the first place.
- **[Slip regression](slip-regression.md)** — inferring the slip behind a
  measured displacement.
- **[Data](../data.md)** — where the FDHI and SURE measurements come from.

[^families]: `notes/chart-families.md` in the source repository.
[^spec]: `notes/dashboard-3-build-spec.md` in the source repository, which
    records the per-sheet filters and populations, the axis decisions, and
    the documented deviation from the paper's selection criterion.
[^limit]: Chiama et al. (2025), section comparing DEM results with the FDHI
    dataset.
[^dzwrange]: Chiama et al. (2025): "The DZW has a wide range across all the
    experiments (0–40.76 m)." The committed export reaches ~45.8 m, from a
    handful of heterogeneous rows at very low slip — the regime the paper
    excludes as high-uncertainty.
[^assumption]: Chiama et al. (2025), which assumes measured vertical
    separation is "similar enough to the scarp heights to foster these
    comparisons", citing the FDHI report in support.
[^magnitudes]: `SURE_EVENT_MAGNITUDES` in
    `subprojects/python/src/eps_ground_rupture/config.py`, with every value
    confirmed against the SURE 2.0 data descriptor — Nurminen, F., *et al.*
    (2022), "SURE 2.0 — new release of the worldwide database of surface
    ruptures for fault displacement hazard analyses," *Scientific Data* 9,
    DOI [10.1038/s41597-022-01835-z](https://doi.org/10.1038/s41597-022-01835-z).
