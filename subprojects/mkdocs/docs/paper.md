# The paper

## Citation

> Chiama, K., Bednarz, W., Moss, R., Plesch, A., and Shaw, J. H. (2025).
> "Quantifying relationships between fault parameters and rupture
> characteristics associated with thrust and reverse fault earthquakes."
> *Earthquake Spectra*, 41(5), 3977–4014.
> DOI: [10.1177/87552930251346434](https://doi.org/10.1177/87552930251346434)

The article carries a "© The Author(s) 2025" line with no Creative Commons
licence, so it is treated here as **not open access**. This site therefore
reproduces no figures and no extended text from the typeset article; it
cites and links instead.

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
| Fig. 8 | What are typical values and spreads per scarp class? | — | Planned |
| Figs. 9–12, 15 | What is the spread of each output, and which input shifts it? | — | Planned |
| Figs. 1–5, 7 | Context illustrations (not data charts) | — | See below |

Two notes. Figure 8 is the only *data chart* in the paper with no
corresponding code in either legacy notebook — it was produced
elsewhere.[^families] Figure 14 is the one family that needed an analytical
pre-compute step (per-dip linear fits, then inverting them to back-project
the Kern County measurements) — which is why it stands as its own dashboard,
with the fits computed and tested in the data pipeline rather than
recomputed in the browser.[^families]

!!! note "Where the dashboards deliberately differ from the figures"
    The dashboards are not reproductions. The clearest departure is the
    deformation-zone-width comparison in the per-event boxplots: the paper
    restricts that comparison to measurements below 50 m — a criterion tied
    to the model's own bounds — while this site shows the unrestricted field
    range on a log axis. The reasoning, and why the two views answer
    different questions, is set out
    [on that page](dashboards/per-event-boxplots.md#why-the-width-axis-is-logarithmic).

## Figures not reproduced here

Several figures in the paper are photographs, schematics and simulation
snapshots rather than data charts.[^families] They would be useful context
on these pages, but reusing them requires rights the project has not
confirmed. The descriptions below paraphrase each figure's published caption
so a reader knows what is missing.

!!! warning "Figure 1 — surface rupture damage, Chi-Chi 1999"
    *Image pending rights confirmation.* Images of surface ruptures from
    coseismic thrust-fault displacement during the 1999 M 7.6 Chi-Chi,
    Taiwan earthquake: an offset river along the Chelungpu fault that left a
    bridge collapsed, and the Shih-Kang Dam damaged by roughly 8 m of uplift
    on the same fault. See Chiama et al. (2025), Figure 1.

!!! warning "Figure 2 — scarp type morphologies"
    *Image pending rights confirmation.* A summary of the scarp
    morphologies, comparing 2D DEM models of homogeneous sediment strengths
    across six panels: monoclinal, monoclinal collapse, pressure ridge,
    pressure ridge collapse, simple and simple collapse scarps. These are
    the classes used to colour and group data throughout this site. See
    Chiama et al. (2025), Figure 2.

!!! warning "Figure 5 — the measured quantities"
    *Image pending rights confirmation.* Scarp classes together with the
    measurements the computer-vision model obtains — the top of the scarp,
    the beginning and end points of the deformation zone, and the scarp dip.
    This is the figure that defines the quantities plotted on every
    dashboard here, and the most useful one for a reader new to the
    material. See Chiama et al. (2025), Figure 5.

!!! warning "Figure 7 — homogeneous vs cohesive top unit"
    *Image pending rights confirmation.* A side-by-side comparison of model
    results for homogeneous moderate sediment strengths against a
    heterogeneous case with a cohesive top unit above moderate-strength
    sediment, at 5 m of slip on 30° and 40° faults. See Chiama et al.
    (2025), Figure 7.

Figure-reuse rights are the author team's call; the options and their
consequences are set out in
the project's deployment notes (`subprojects/mkdocs/DEPLOY.md` in the repository).

## Where to go next

- **[Glossary](glossary.md)** — the vocabulary the paper assumes.
- **[Model vs reality](dashboards/model-vs-reality.md)** — the interactive
  form of Figure 13's scatter panels.
- **[Data](data.md)** — the datasets behind every figure.

[^families]: `notes/chart-families.md` in the source repository — the
    figure-by-figure inventory this table is derived from.
