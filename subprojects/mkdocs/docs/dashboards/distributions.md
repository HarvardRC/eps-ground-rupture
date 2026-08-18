---
hide:
  - toc
---

# Distributions & summary statistics

**The questions:** what is the spread of each measured output across all
the simulations — and which input parameter shifts it? And what are the
typical values, class by class, at a glance?

Where [Model vs reality](model-vs-reality.md) scatters every simulated
point and [Per-event boxplots](per-event-boxplots.md) summarises the field
data, this page looks at the shape of the
[distinct element method (DEM)](../glossary.md#dem) results themselves.
The upper panel is a histogram of one measured quantity over every model
stage, split into translucent overlapping distributions — one per value of
a chosen model parameter, each rising from zero so their shapes can be
compared directly. The lower panel condenses the same data into a mean
and a one-standard-deviation band for each
[scarp class](../glossary.md#scarp-classes).

!!! tip "Unfamiliar terms?"
    [**Mean**, **standard deviation**](../glossary.md#mean-sd) and
    [**histogram**](../glossary.md#histogram) are covered under
    [statistics](../glossary.md#statistics-terms); the six
    [scarp classes](../glossary.md#scarp-classes) —
    [`Monoclinal`](../glossary.md#monoclinal),
    [`Pressure Ridge`](../glossary.md#pressure-ridge),
    [`Simple`](../glossary.md#simple) and their
    [`… Collapse`](../glossary.md#collapse) variants — and the field
    datasets are in [the glossary](../glossary.md#the-datasets) too.

## The vertical black lines

The thin black lines standing in the histogram are **field
measurements** — one line per individual measurement, not one per
earthquake, so an event's internal spread is visible: the
[1952 Kern County](../glossary.md#kern-county-1952) compilation
contributes eleven deformation-zone widths and sixteen vertical
displacements, and every FDHI-flatfile and SURE event in the export —
Kaikoura, Chi-Chi, Wenchuan, Kashmir and the rest — contributes each of
its own measurements.[^events] Where the model's histogram and the
field's needles overlap, the simulations bracket reality — the same
conversation as the paper's Figure 15, which overlays Kern County lines
on exactly this kind of distribution.[^families]

## Three controls

- **Measure** switches the histogram between scarp height, deformation
  zone width and scarp dip, re-binning as it goes (¼ m, 1 m and 5°
  bins respectively). Field needles follow where the field measured the
  same quantity; on scarp dip they disappear — the field datasets carry
  no comparable value, so nothing is drawn.
- **Hue By** re-splits the distributions by any of the model's inputs —
  scarp class, sediment density, depth,
  [fault dip](../glossary.md#fault-dip), sediment strength and more —
  which is how the paper's Figures 9–12 walk through the parameter
  study one hue at a time.[^families]
- **Population** chooses between *every model stage* (the default —
  distributions pooled over the whole run of every experiment, the
  convention of the paper's histogram figures) and *final state per
  trial* (one row per experiment, its end state: 3,434 rows). Typical
  values run higher on final states, because scarps grow as a run
  progresses — both views are legitimate answers to slightly different
  questions.[^pins]

The mean ± σ panel obeys the same controls, so the summary always
describes exactly the population and measure on display.

!!! note "Two deliberate departures from the typeset figures"
    The histograms here show **counts**, not the probability scale of
    the paper's Figure 15, so tall and short classes keep their true
    proportions. And the mean ± σ panel is a **reconstruction**: the
    paper's Figure 8 has no surviving analysis code, so this page
    computes means and sample standard deviations from the shipped
    simulation data directly — over all model stages by default, with
    the final-state alternative one parameter flip away.[^pins]

<div class="tableau-fit" data-width="800" data-height="1200" markdown="0">
  <tableau-viz src="https://public.tableau.com/views/dem-distributions-public/DistributionsSummaryweb" width="800" height="1200"
    toolbar="bottom" hide-tabs></tableau-viz>
</div>

[Open full-size on Tableau Public](https://public.tableau.com/app/profile/michael.bouzinier/viz/dem-distributions-public/DistributionsSummaryweb){ .embed-fallback }

## What the printed figures cannot do

Figures 9–12 fix one hue per panel and one binning per figure; Figure 8
shows one aggregation of one population. Here the same underlying data
answers all of those at once: flip the hue to ask *which parameter
shifts this distribution*, flip the measure to ask it of a different
quantity, flip the population to see whether the answer depends on
pooling model stages or taking end states — and the field needles stay
overlaid throughout, keeping the model-vs-reality comparison in view.

## Where this comes from

This page covers **chart families 3 and 4** in the project's
inventory — the faceted histograms of the paper's Figures 9–12 and 15,
and the per-class mean ± standard-deviation summary of Figure 8.[^families]
The field needles come from a dedicated per-measurement export described
on the [Data](../data.md) page, with its populations pinned by the
project's tests.[^pins]

## Where to go next

- **[Per-event boxplots](per-event-boxplots.md)** — the field data's own
  spread, event by event, with the model alongside.
- **[Model vs reality](model-vs-reality.md)** — every simulated point
  and every field point on one canvas.
- **[Slip regression](slip-regression.md)** — the one dashboard that
  does arithmetic on the simulations rather than displaying them.

[^families]: `notes/chart-families.md` in the source repository maps
    family 3 to Figures 9–12 (histograms of one output, hue = one model
    parameter) and Figure 15 (the same with historic-event reference
    lines), and family 4 to Figure 8 — for which no notebook code
    exists in the handoff materials.
[^events]: The reference-line export unions the FDHI flatfile, the SURE
    database and the Kern County compilation, one row per field
    measurement, keeping whichever of the two measured quantities each
    row carries: 2,392 + 203 + 21 = 2,616 rows, pinned by
    `subprojects/python/tests/test_historic_events.py` in the source
    repository.
[^pins]: Means and standard deviations for both populations — all
    model stages and final state per trial — are tabulated in
    `notes/dashboard-5-build-spec.md` in the source repository, computed
    from the shipped DEM data (346,834 stage rows; 3,434 trials).
