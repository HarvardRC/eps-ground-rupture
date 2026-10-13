# Figures from the paper

<p class="cite-open-row"><button class="cite-open" type="button">How to cite</button></p>

Six of the paper's fifteen figures are photographs, schematics and
simulation snapshots rather than data charts.[^families] The dashboards
stand in for the data charts — but these six explain what the dashboards
are *of*: what the model is, what it measures, and what the measurements
look like in a real earthquake. Each one below notes where it turns up in
the interactive views.

**Four of the six are shown.** Figures 1 and 2 are described but not
reproduced while the research team confirms the terms for the third-party
photographs they contain.

!!! info "How these figures may be reused"
    They are reproduced from the accepted manuscript of:

    > Chiama, K., Bednarz, W., Moss, R., Plesch, A., and Shaw, J. H.,
    > "Quantifying relationships between fault parameters and rupture
    > characteristics associated with thrust and reverse fault
    > earthquakes", *Earthquake Spectra* (41:5), pp. 3977–4014.
    > Copyright © 2025 (The Author(s)).
    > DOI: [10.1177/87552930251346434](https://doi.org/10.1177/87552930251346434)

    You may reuse them for **non-commercial purposes, without
    modification**, keeping that citation with them. These terms are
    narrower than the rest of the site, where the text is CC BY 4.0 and the
    code Apache-2.0 — see the
    [repository](https://github.com/HarvardRC/eps-ground-rupture#licensing).
    Photographs inside Figures 1 and 2 are credited on the figures to the
    publications they came from, and belong to those authors — which is why
    those two are not reproduced here at present.

## Figure 1 — what surface rupture does { #fig-1 }

!!! note "Figure withheld for now"
    This figure is not reproduced here at present. It contains photographs
    belonging to other authors, credited on the figure to the publications
    they came from, and the research team is confirming the terms on which
    they may be shown. The description below stands, and the figure itself
    is in the paper —
    [DOI 10.1177/87552930251346434](https://doi.org/10.1177/87552930251346434).

Coseismic thrust-fault displacement during the 1999 M 7.6 Chi-Chi
earthquake in Taiwan: an offset river along the Chelungpu fault that
brought down a bridge, and the Shih-Kang Dam broken by roughly 8 m of
uplift on the same fault.

This is the thing the dashboards measure. Every scarp height plotted on
this site is the height of a step like the one under that bridge, and every
deformation zone width is how far the ground was disturbed either side of
it. The reason the study asks how large those get is that pipelines, roads
and dams have to be built across them.

## Figure 2 — the six scarp classes { #fig-2 }

!!! note "Figure withheld for now"
    This figure is not reproduced here at present. It contains photographs
    belonging to other authors, credited on the figure to the publications
    they came from, and the research team is confirming the terms on which
    they may be shown. The description below stands, and the figure itself
    is in the paper —
    [DOI 10.1177/87552930251346434](https://doi.org/10.1177/87552930251346434).

Each panel pairs the model's own output — as particles, and as the contact
bonds between them — with a photograph of the same morphology after a real
earthquake: [monoclinal](glossary.md#monoclinal),
[pressure ridge](glossary.md#pressure-ridge),
[simple](glossary.md#simple), and a [collapse](glossary.md#collapse)
variant of each.

That pairing is the argument the whole site rests on: the shapes the
simulation produces are shapes that occur in the field. It is also the
practical key to the dashboards, because these six classes are the colour
legend on **[Model vs reality](dashboards/model-vs-reality.md)**,
**[Distributions](dashboards/distributions.md)** and the model panels of
**[Per-event boxplots](dashboards/per-event-boxplots.md)**. When a legend
entry means nothing to you, this is the figure to look at.

## Figure 3 — what a simulation actually is { #fig-3 }

![Four panels: bonded particle contact mechanics, a biaxial test coloured
by contact state, Mohr-Coulomb failure envelopes for a range of bond
strengths and sediment densities, and the model geometry with driving wall,
fault seed, fault dip and sediment depth
labelled.](images/fig-03-dem-model-schematic.png){ .paper-figure loading=lazy }

The [distinct element method](glossary.md#dem) treats sediment as many
discrete particles bonded where they touch. Those bonds act as springs in
compression and break under tension or shear (a); their collective strength
is calibrated against biaxial tests (b) onto a Mohr-Coulomb failure
criterion (c). Panel (d) is one experiment: a 50 m box of sediment, a fault
seeded at a chosen dip, and a driving wall pushed until the surface above
deforms.

Panel (d) is worth a second look, because its labels are the dashboard
controls. The angle θ is the [fault dip](glossary.md#fault-dip) you filter
by everywhere, and the slip along that plane is the x-axis of
**[Response curves](dashboards/response-curves.md)** and the quantity
**[Slip regression](dashboards/slip-regression.md)** works backwards to.

## Figure 4 — the sediment configurations { #fig-4 }

![Twelve panels in two columns, sedimentary strata beside contact bonds,
for six sediment configurations: homogeneous moderate, and heterogeneous
weak, moderate, strong, random strengths and cohesive top
unit.](images/fig-04-compare-dem-models.png){ .paper-figure loading=lazy }

The same experiment through six sediment set-ups, each shown as strata
(left) and as contact bonds (right): homogeneous moderate strength, then
heterogeneous weak, moderate, strong, randomly assigned strengths, and a
cohesive unit over weaker material.

The lettered codes — K, L, M, R1, Q — are the [DEM sets](glossary.md#set)
in the data. So when you change `Condition By` to `Set` or
`Sediment_Strength` on **[Response curves](dashboards/response-curves.md)**,
or colour the cloud by set on
**[Model vs reality](dashboards/model-vs-reality.md)**, this figure is what
the categories mean.

## Figure 5 — the quantities every dashboard plots { #fig-5 }

![Three model cross-sections — monoclinal, pressure ridge and simple scarp,
each at 3 m of slip — annotated with the top of the scarp, the beginning
and end of the deformation zone, and the scarp
dip.](images/fig-05-ml-model-measurements.jpg){ .paper-figure loading=lazy }

For each scarp type, the computer-vision model locates four things: the top
of the scarp, where the deformation zone begins, where it ends, and the
angle of the scarp face.

Those four picks are the entire measurement vocabulary of this site.
[Scarp height](glossary.md#scarp-height) is the first,
[deformation zone width](glossary.md#dzw) is the span between the second and
third, and [scarp dip](glossary.md#scarp-dip) is the fourth. Every axis on
every dashboard traces back to this figure — which makes it the one to read
first if the terminology is new.

## Figure 7 — why the layering matters { #fig-7 }

![Model results for homogeneous moderate sediment beside a heterogeneous
case with a cohesive top unit, at 5 m of slip on 30° and 40°
faults.](images/fig-07-homogeneous-vs-ctu.png){ .paper-figure loading=lazy }

Homogeneous moderate-strength sediment beside a heterogeneous case with a
cohesive unit above weaker material, at 5 m of slip on 30° and 40° faults.

The comparison makes a point that is easy to miss in a scatter plot: the
same slip on the same dip does not produce the same surface. What the
rupture travels through matters as much as how far it moves — which is why
sediment strength and layering are controls on
**[Response curves](dashboards/response-curves.md)** and
**[Distributions](dashboards/distributions.md)** rather than fixed
assumptions.

## Where to go next

- **[The paper](paper.md)** — the figure-by-figure crosswalk, and which
  dashboard replaces each data chart.
- **[Glossary](glossary.md)** — the vocabulary these figures use.
- **[Model vs reality](dashboards/model-vs-reality.md)** — the simulations
  and the field measurements on one canvas.

--8<-- "includes/cite-root.md"

[^families]: `notes/chart-families.md` in the source repository — the
    figure-by-figure inventory separating the paper's data charts from its
    illustrations.
