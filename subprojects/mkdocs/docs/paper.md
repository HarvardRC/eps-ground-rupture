# The paper

<p class="cite-open-row"><button class="cite-open" type="button">How to cite</button></p>

## Citation

> Chiama, K., Bednarz, W., Moss, R., Plesch, A., and Shaw, J. H. (2025).
> "Quantifying relationships between fault parameters and rupture
> characteristics associated with thrust and reverse fault earthquakes."
> *Earthquake Spectra*, 41(5), 3977–4014.
> DOI: [10.1177/87552930251346434](https://doi.org/10.1177/87552930251346434)

The article carries a "© The Author(s) 2025" line with no Creative Commons
licence, so it is treated here as **not open access**: nothing is
reproduced from the typeset article and its wording is quoted only
sparingly. Six of its illustrations *are* shown here, as the authors' own
pre-typeset originals which they are free to share — see
[Figures from the paper](figures.md), which also carries their reuse terms.

!!! info "Using the data? Cite the papers and the archives"
    If you reuse numbers you found through these dashboards, cite the paper
    above and the DesignSafe data deposits rather than this site — the
    dashboards only repackage them. The full list, with DOIs, is under
    [How to cite this data](data.md#how-to-cite-this-data).

!!! tip "Reading the paper itself"
    It is written for specialists. If you want to follow it, the
    [glossary](glossary.md) defines the vocabulary it assumes — including
    **distinct element method (DEM)**, the simulation technique the whole
    study is built on, and the measured quantities its figures plot.

## Figure → dashboard crosswalk

The project maintains a taxonomy of every figure in the paper and the legacy
analysis notebooks, grouped by the *question* each chart answers rather than
by its mark type.[^families] That taxonomy is what the dashboards are built
against — each one replaces a family of static figures.

| Paper figure | Question it answers | Dashboard | Status |
|---|---|---|---|
| Fig. 6 | How do the measured characteristics change with slip, under each condition? | [Response curves](dashboards/response-curves.md) | Published |
| Fig. 13 (scatter panels) | Does the simulation cover the range of real observations? | [Model vs reality](dashboards/model-vs-reality.md) | Published |
| Fig. 13 (boxplot panels) | How variable are field measurements within each event? | [Per-event boxplots](dashboards/per-event-boxplots.md) | Published |
| — (no figure) | Which parameter pairings are well covered by the data? | [Viable Combinations](dashboards/model-vs-reality.md#viable-combinations) | Published |
| Fig. 14 | What links slip to vertical displacement, and what slip would produce an observed displacement? | [Slip regression](dashboards/slip-regression.md) | Published |
| Fig. 8 | What are typical values and spreads per scarp class? | [Distributions](dashboards/distributions.md) | Published |
| Figs. 9–12, 15 | What is the spread of each output, and which input shifts it? | [Distributions](dashboards/distributions.md) | Published |
| [Fig. 1](figures.md#fig-1) | What does surface rupture do to the built environment? | — (photographs) | [View figure](figures.md#fig-1){ .figure-pop data-img="../images/fig-01-chi-chi.jpg" data-title="Figure 1 — what surface rupture does" } |
| [Fig. 2](figures.md#fig-2) | What do the six scarp classes look like, in the model and in the field? | — (illustration) | [View figure](figures.md#fig-2){ .figure-pop data-img="../images/fig-02-scarp-classification.jpg" data-title="Figure 2 — the six scarp classes" } |
| [Fig. 3](figures.md#fig-3) | What is a distinct element simulation, mechanically? | — (schematic) | [View figure](figures.md#fig-3){ .figure-pop data-img="../images/fig-03-dem-model-schematic.png" data-title="Figure 3 — what a simulation actually is" } |
| [Fig. 4](figures.md#fig-4) | What do the six sediment configurations look like? | — (illustration) | [View figure](figures.md#fig-4){ .figure-pop data-img="../images/fig-04-compare-dem-models.png" data-title="Figure 4 — the sediment configurations" } |
| [Fig. 5](figures.md#fig-5) | What exactly is measured on each modelled scarp? | — (schematic) | [View figure](figures.md#fig-5){ .figure-pop data-img="../images/fig-05-ml-model-measurements.jpg" data-title="Figure 5 — the quantities every dashboard plots" } |
| [Fig. 7](figures.md#fig-7) | How much does the sediment layering change the result? | — (illustration) | [View figure](figures.md#fig-7){ .figure-pop data-img="../images/fig-07-homogeneous-vs-ctu.png" data-title="Figure 7 — why the layering matters" } |

Two notes. Figure 8 is the only *data chart* in the paper whose analysis
code sits outside the two legacy notebooks; the authors supplied it
separately in September 2026, so the
[Distributions](dashboards/distributions.md) page now reproduces its
statistic rather than approximating it.[^families] Figure 14 is the one family that needed an analytical
pre-compute step (per-dip linear fits, then inverting them to back-project
the Kern County measurements) — which is why it stands as its own dashboard,
with the fits computed and tested in the data pipeline rather than
recomputed in the browser.[^families]

!!! note "Where the dashboards deliberately differ from the figures"
    The dashboards are not reproductions, and two differences are worth
    knowing about. The deformation-zone-width comparison in the per-event
    boxplots follows the paper's own 50 m selection criterion by default,
    with the full field range a toggle away —
    [that page](dashboards/per-event-boxplots.md#why-the-width-axis-is-logarithmic)
    sets out what each view answers. And the
    [Distributions](dashboards/distributions.md) page plots counts rather
    than Figure 15's probability scale, and its mean ± σ panel is a
    rendering of Figure 8 rather than a copy of it; both are explained
    on that page.

## Where to go next

- **[Glossary](glossary.md)** — the vocabulary the paper assumes.
- **[Model vs reality](dashboards/model-vs-reality.md)** — the interactive
  form of Figure 13's scatter panels.
- **[Data](data.md)** — the datasets behind every figure.

<p class="cite-open-row"><button class="cite-open" type="button">How to cite</button></p>

--8<-- "includes/cite-root.md"

[^families]: `notes/chart-families.md` in the source repository — the
    figure-by-figure inventory this table is derived from.
