# EPS Ground Rupture — interactive companion

This site is a companion to a 2025 *Earthquake Spectra* paper on thrust and
reverse-fault surface rupture. The paper's figures are static; the same
underlying data is republished here as **live dashboards** you can filter
and interrogate. It is built and maintained by the same research group.

The study pairs two kinds of evidence. On one side are **two-dimensional
distinct element method (DEM) simulations** — numerical experiments in which
a modelled fault slips through a sediment layer and the resulting surface
deformation is measured automatically. The paper reports 3,434 such
experiments, sampled at 346,834 model stages taken every 0.05 m of
slip.[^abstract] On the other side are field observations of real
earthquakes, drawn from published compilations of surface-rupture
measurements. Setting the two side by side is what the paper is for: it
finds that the simulations "comprehensively describe the range of historic
surface rupture observations" in the field compilation.[^abstract]

Each dashboard answers a different form of that comparison.
**[Model vs reality](dashboards/model-vs-reality.md)** overlays field
measurements on the simulated cloud.
**[Response curves](dashboards/response-curves.md)** stay inside the model,
showing how each measured output changes as slip accumulates under different
conditions. **[Per-event boxplots](dashboards/per-event-boxplots.md)** invert
the first view — summarising the spread of real measurements within each
earthquake, with the model's own distribution alongside.
**[Slip regression](dashboards/slip-regression.md)** does arithmetic on the
model — a fitted slip-to-uplift law per fault dip, run backwards to infer
the slip behind Kern County's 1952 field measurements. And
**[Distributions](dashboards/distributions.md)** looks at the shape of the
model's results as a whole — the spread of each output, split by any input,
with the field's measurements standing in the histograms as reference
lines. The
[figure → dashboard crosswalk](paper.md#figure-dashboard-crosswalk) maps each
one back to the figure it derives from.

<div class="grid cards" markdown>

-   **[Model vs reality](dashboards/model-vs-reality.md)**

    ---

    Every simulated point and every field point on one canvas.

-   **[Response curves](dashboards/response-curves.md)**

    ---

    How each measured output grows as slip accumulates, condition by
    condition.

-   **[Per-event boxplots](dashboards/per-event-boxplots.md)**

    ---

    The field data's own spread, event by event, with the model
    alongside.

-   **[Slip regression](dashboards/slip-regression.md)**

    ---

    A slip-to-uplift law fitted per fault dip — run backwards on Kern
    County 1952.

-   **[Distributions](dashboards/distributions.md)**

    ---

    The spread of each output across all simulations, and which input
    shifts it.

</div>

!!! tip "New to this? Start with the glossary"
    Faults, scarps, DZW, FDHI, SURE — the field has a lot of vocabulary, and
    the paper assumes you already have it. **[The glossary](glossary.md)**
    assumes you have none of it: it defines every term and abbreviation used
    here in plain language, and explains
    [how the measured quantities relate to each other](glossary.md#how-the-quantities-relate).
    Nothing else on the site depends on reading it first.

!!! note "Reading this without the paper"
    The pages assume no prior reading. Every claim about the science is
    sourced to the paper; claims about how the data was prepared are sourced
    to the project's own build notes. The datasets are described on the
    [Data](data.md) page.

## The paper

> Chiama, K., Bednarz, W., Moss, R., Plesch, A., and Shaw, J. H. (2025).
> "Quantifying relationships between fault parameters and rupture
> characteristics associated with thrust and reverse fault earthquakes."
> *Earthquake Spectra*, 41(5), 3977–4014.
> DOI: [10.1177/87552930251346434](https://doi.org/10.1177/87552930251346434)

!!! warning "Not open access"
    The article carries a "© The Author(s) 2025" line with no Creative
    Commons licence, so this site reproduces **no figures and no extended
    text** from the typeset PDF. Where a paper figure would illustrate a
    point, you will find a placeholder and a citation instead — see
    [The paper](paper.md#figures-not-reproduced-here). Requesting reuse
    rights is an open question for the author team.

## Site authors

Kristen Chiama, Andreas Plesch, John H. Shaw.

*Additional contributors may be added before publication; the candidates are
recorded in `subprojects/mkdocs/DEPLOY.md` in the source repository.*

## Source code

The pipeline that produces the data behind every dashboard — and this site
itself — lives in
[HarvardRC/eps-ground-rupture](https://github.com/HarvardRC/eps-ground-rupture)
under the Apache-2.0 licence.

[^abstract]: Chiama et al. (2025), abstract.
