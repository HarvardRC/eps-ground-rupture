---
hide:
  - toc
---

# Model vs reality

**The question:** does the simulation reproduce the range of deformation we
measure after real earthquakes?

The dense cloud is the simulation set — 3,434 two-dimensional
[distinct element method (DEM)](../glossary.md#dem) experiments, in which a
modelled fault is pushed until the ground above it deforms.
[Scarp height](../glossary.md#scarp-height) is on the vertical axis,
[deformation zone width](../glossary.md#dzw) on the horizontal. Overlaid on
it are measurements from real surface ruptures.

The paper's finding is that the simulations "comprehensively describe the
range of historic surface rupture observations" in the field
compilation.[^abstract]

!!! tip "Unfamiliar terms?"
    Hover any acronym for its expansion. For fuller definitions:
    [scarp](../glossary.md#scarp),
    [deformation zone width](../glossary.md#dzw),
    [hanging wall and footwall](../glossary.md#hanging-wall),
    [scarp classes](../glossary.md#scarp-classes), and the field
    compilations [FDHI and SURE](../glossary.md#the-datasets).

Two quantities carry the comparison, both produced by the paper's
computer-vision measurement model:[^paper-methods]

- **[Scarp height](../glossary.md#scarp-height)** — the total height of the
  [scarp](../glossary.md#scarp), measured from the top of the undeformed
  [footwall](../glossary.md#hanging-wall). For
  [pressure ridges](../glossary.md#pressure-ridge) it exceeds the undeformed
  hanging-wall surface, because folding and uplift from secondary faults add
  to it.
- **[Deformation zone width (DZW)](../glossary.md#dzw)** — measured from the
  first vertical displacement seen in the
  [hanging wall](../glossary.md#hanging-wall) (uplift, tensile fractures or
  collapse) across to the base of the scarp in the footwall. It is a span
  across the disturbed zone, not a one-sided distance from the fault trace.

!!! note "The model and field quantities are analogous, not identical"
    This is the paper's own caveat, and it matters for reading the overlay.
    The field compilation records
    [fault zone width](../glossary.md#fzw) and
    [vertical separation](../glossary.md#vertical-separation), measured in
    the field by different means than the model's DZW and scarp height. The paper states that because the compilation has
    no measurements of both scarp height and FZW for individual thrust and
    reverse events, it *assumes* "the measured vertical separation is
    similar enough to the scarp heights to foster these comparisons",
    citing the compilation's own report in support.[^assumption] The overlay
    rests on that assumption rather than on identical measurement.

The dashboard pairs the scatter with an **event map**, so you can see which
earthquake each overlaid point came from and where it happened.

The model and field points are drawn as two separate layers. The DEM cloud
carries the colour encoding, and a `Color By` control switches it between
source/event, [fault dip](../glossary.md#fault-dip) and
[scarp class](../glossary.md#scarp-classes); the field overlay is drawn as
distinct shapes keyed to the event, and keeps that encoding whatever
`Color By` is set to. Scarp class is a model classification in any case —
the field measurements do not carry one.[^spec]

Colouring by scarp class splits the cloud into the six shapes the
simulations produce: [`Monoclinal`](../glossary.md#monoclinal) and
[`Pressure Ridge`](../glossary.md#pressure-ridge) — an inclined slope and a
raised ridge respectively — [`Simple`](../glossary.md#simple), where the
fault offsets the surface directly, and a
[`… Collapse`](../glossary.md#collapse) variant of each, where the
oversteepened face gave way.

<div class="tableau-fit" data-width="800" data-height="1200" markdown="0">
  <tableau-viz src="https://public.tableau.com/views/dem-model-vs-reality-public/DEMCloudHistoricOverlaysweb" width="800" height="1200"
    toolbar="bottom" hide-tabs></tableau-viz>
</div>

[Open full-size on Tableau Public](https://public.tableau.com/app/profile/michael.bouzinier/viz/dem-model-vs-reality-public/Dashboard1DEMCloudHistoricOverlays){ .embed-fallback }

## Viable combinations

The same workbook carries a second view: a **coverage matrix**. Pick any two
of source, event, [scarp class](../glossary.md#scarp-classes),
[fault dip](../glossary.md#fault-dip), [cohesion](../glossary.md#cohesion)
or [DEM set](../glossary.md#set) for the rows and columns, and each cell is
shaded by how many measurements fall into that pairing — from none, through
sparse, to dense.

It is worth a look before drawing conclusions from any slice of the cloud
above, because a sparse or empty cell tells you the comparison in that
region rests on very little data. What it does *not* tell you is why: an
empty cell may be a combination the experiment set never covered, or simply
one no observed earthquake happens to occupy.

<div class="tableau-fit" data-width="1000" data-height="800" markdown="0">
  <tableau-viz src="https://public.tableau.com/views/dem-model-vs-reality-public/ViableCombinations" width="1000" height="800"
    toolbar="bottom" hide-tabs></tableau-viz>
</div>

[Open full-size on Tableau Public](https://public.tableau.com/app/profile/michael.bouzinier/viz/dem-model-vs-reality-public/ViableCombinations){ .embed-fallback }

## Where this comes from

This dashboard is the interactive form of **chart family 1** in the
project's own inventory, which maps it to the scatter panels of the paper's
Figure 13.[^families]

!!! info "What feeds this dashboard"
    Both views read the `unified_observations` export — the cross-source
    table that normalises DEM, FDHI, SURE and Kern measurements onto shared
    columns. Its field slice is deliberately small: this is the
    scatter-overlay subset, not the full measurement population used by the
    [per-event boxplots](per-event-boxplots.md).[^spec] The datasets
    themselves are described on the [Data](../data.md) page.

## Where to go next

- **[Response curves](response-curves.md)** — stay inside the simulations
  and watch each measurement grow as slip accumulates.
- **[Per-event boxplots](per-event-boxplots.md)** — the same model-versus-field
  comparison, but summarising each earthquake's spread rather than plotting
  every point.
- **[Slip regression](slip-regression.md)** — the law linking slip to
  uplift, and what slip explains Kern County's measured displacement.
- **[Glossary](../glossary.md)** — what scarp height, DZW and scarp class
  actually mean.

[^abstract]: Chiama et al. (2025), abstract.
[^paper-methods]: Chiama et al. (2025), measurement methods; the paper's
    Figure 5 defines these quantities on the model geometry.
[^assumption]: Chiama et al. (2025), section comparing DEM results with the
    FDHI dataset.
[^families]: `notes/chart-families.md` in the source repository — a
    taxonomy of every figure in the paper and the legacy analysis notebooks,
    grouped by the question each chart answers.
[^spec]: `notes/dashboard-3-build-spec.md` in the source repository.
