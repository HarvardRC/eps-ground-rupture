---
hide:
  - toc
---

# Distributions & summary statistics

<p class="cite-open-row"><button class="cite-open" type="button">How to cite</button></p>

**The questions:** what is the spread of each measured output across all
the simulations — and which input parameter shifts it? And what are the
typical values, class by class, at a glance?

Where [Model vs reality](model-vs-reality.md) scatters every simulated
point and [Per-event boxplots](per-event-boxplots.md) summarises the field
data, this page looks at the shape of the
[distinct element method (DEM)](../glossary.md#dem) results themselves.
The top panel is a histogram of one measured quantity over every model
stage, split into translucent overlapping distributions — one per value of
a chosen model parameter, each rising from zero so their shapes can be
compared directly. Beneath it sit two summaries of the same data, both
as a mean and a one-standard-deviation band for each
[scarp class](../glossary.md#scarp-classes) — the six shapes shown in
[Figure 2](../figures.md#fig-2){ .figure-pop data-img="../../images/fig-02-scarp-classification.jpg" data-title="Figure 2 — the six scarp classes" }: one pooling every model stage into a single
value per class, one tracking how those values move as slip accumulates —
the paper's Figure 8. What the three measures
are, and where on a scarp each is taken, is
[Figure 5](../figures.md#fig-5){ .figure-pop data-img="../../images/fig-05-ml-model-measurements.jpg" data-title="Figure 5 — the quantities every dashboard plots" }.

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

Both summary panels obey the `Measure` control, so they always describe
the quantity on display. `Population` applies to the histogram and the
pooled panel; the Figure-8 panel is computed across every model stage by
definition, so it does not move with that control.

On the Figure-8 panel, hovering a class brightens its three lines and
clicking one isolates it — the y-axis rescales, which is how you can tell the
other classes are filtered out rather than dimmed. **Click the same line a
second time to bring all six back.**

### Two ways of summarising, and why both are here

The lower two panels answer different questions, and the paper's
Figure 8 is the second of them.

**Typical values per class** pools every model stage into one mean and
one standard deviation per scarp class. It answers *what does a
monoclinal scarp typically look like?* — useful, and what this page
showed on its own until September 2026.

**Mean ± σ as slip accumulates** is Figure 8. For each 0.05 m increment
of slip it takes the mean and sample standard deviation across the model
stages that fall in that increment, per class — so each class becomes a
curve rather than a point. That is what lets the paper report a
*near-linear relationship of mean scarp height and the amount of slip at
depth*, deformation zone width growing as slip accumulates, and scarp dip
showing only a *limited relationship with the slip at depth* — the paper's
own phrase, and a weaker claim than the other two: for the collapse
variants dip does move appreciably. None of those are readable from a single
pooled number: a monoclinal scarp averages 1.53 m across its whole life,
but grows from close to zero to about 3.5 m as slip runs from 0 to 5 m.

The recipe is the authors' own. Their Figure-8 analysis code was
recovered in September 2026, and the pipeline reproduces its bins,
its means and its sample standard deviations exactly.[^pins]

!!! note "Deliberate departures from the typeset figures"
    The histograms show **counts**, not the probability scale of the
    paper's Figure 15, so tall and short classes keep their true
    proportions.

    On the Figure-8 panel, three smaller differences. The paper begins
    each class at a hand-chosen amount of slip; this panel shows every
    increment for which a standard deviation can be computed, so some
    curves start earlier. Where the paper draws a fitted polynomial
    through the means, this draws the binned means themselves — dense
    enough, at up to a hundred points per class, to carry the same shape.
    And for scarp dip the authors' code reads a `Convert_Scarp_Dip`
    column that the published dataset does not carry, so that one series
    applies the same method to the dataset's `Scarp_Dip` instead — the
    other three measures come from the same columns the authors used.

<div class="tableau-fit" data-width="800" data-height="1400" markdown="0">
  <tableau-viz src="https://public.tableau.com/views/dem-distributions-public/DistributionsSummaryweb" width="800" height="1400"
    toolbar="bottom" hide-tabs></tableau-viz>
</div>

[Open full-size on Tableau Public](https://public.tableau.com/app/profile/michael.bouzinier/viz/dem-distributions-public/DistributionsSummaryweb){ .embed-fallback } <button class="cite-open" type="button">How to cite</button>

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

<p class="cite-open-row"><button class="cite-open" type="button">How to cite</button></p>

--8<-- "includes/cite-sub.md"

[^families]: `notes/chart-families.md` in the source repository maps
    family 3 to Figures 9–12 (histograms of one output, hue = one model
    parameter) and Figure 15 (the same with historic-event reference
    lines), and family 4 to Figure 8. Figure 8's analysis code sits
    outside the two legacy notebooks; the authors supplied it separately
    in September 2026, and the pipeline reproduces it.
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
