---
hide:
  - toc
---

# Slip regression

**The question:** what law links slip on the fault to the vertical
displacement it produces at the surface — and, run backwards, what slip
would explain a displacement measured in the field?

This is the one dashboard that does arithmetic on the simulations rather
than just displaying them. The cloud is every
[model stage](../glossary.md#model-stage) from the
[distinct element method (DEM)](../glossary.md#dem) experiments, plotting
[slip](../glossary.md#slip) against the
[vertical displacement of the hanging wall](../glossary.md#vd-hw) — how far
the upthrown side actually rose. Colour is
[fault dip](../glossary.md#fault-dip).

!!! tip "Unfamiliar terms?"
    **Slip**, **fault dip**, **hanging wall**,
    [**r²**](../glossary.md#r2) and
    [**back-projection**](../glossary.md#back-projection) are all defined in
    the [glossary](../glossary.md), which also sets out
    [why each slope lands on sin(fault dip)](../glossary.md#how-the-quantities-relate).

## The fits

Seven black lines cross the cloud — one
[ordinary least squares](../glossary.md#ols) fit per fault dip, each
computed over that dip's own experiments. Their slopes run from **0.3436**
at 20° to **0.9445** at 70°, with r² between 0.998 and 0.999.[^fits]

Those slopes are not arbitrary. Each one lands on **sin(fault dip)**: a
fault tilted at 20° converts about a third of its slip into uplift
(sin 20° = 0.342), one at 70° converts almost all of it (sin 70° = 0.940).
That is the physical content of the paper's Equation 2, and the paper uses
the relationship precisely because it lets model results and field
measurements be compared directly.[^eq2] The near-perfect fit is a
consistency check rather than a discovery — the simulations drive the
hanging wall along a plane at that dip, so the geometry is built in.

## The Kern inference

The useful part is running that law backwards. Given a vertical
displacement someone measured in the field, the fit says what slip must
have produced it — [back-projection](../glossary.md#back-projection),
`slip = (vertical − intercept) / slope`.

The stars are sixteen vertical-displacement measurements from the
[1952 Kern County earthquake](../glossary.md#kern-county-1952) compilation,
placed on the chosen dip's fit line. Kern is the worked example rather than
a special case: a California event with well-documented surface-rupture
measurements *and* a known fault geometry — its 30° dip is a direct field
measurement, reported in the classic Buwalda & St. Amand (1955)
survey.[^kerndip] On the fit for that measured dip, the sixteen
displacements imply slips spanning **0.16 to 2.74 m**.[^fits] The paper's
own figure reaches the same conclusion — up to about 3 m of near-surface
slip, consistent with independent published estimates.[^kern]

!!! note "One assumption rides along"
    What field geologists measured at Kern is scarp height, and the
    inversion treats that as equal to vertical displacement.[^kern] For
    [simple](../glossary.md#simple) and
    [monoclinal](../glossary.md#monoclinal) scarps that holds closely; for
    [pressure ridges](../glossary.md#pressure-ridge) the scarp stands higher
    than the fault alone lifted it, which is exactly what
    [Us − Ud](../glossary.md#us-ud) measures.

<div class="tableau-fit" data-width="800" data-height="850" markdown="0">
  <tableau-viz src="https://public.tableau.com/views/dem-slip-regression-public/SlipRegressionKernInference" width="800" height="850"
    toolbar="bottom" hide-tabs></tableau-viz>
</div>

[Open full-size on Tableau Public](https://public.tableau.com/app/profile/michael.bouzinier/viz/dem-slip-regression-public/SlipRegressionKernInference){ .embed-fallback }

## What the printed figure cannot do

The paper's Figure 14 shows this analysis once, at one fault geometry.
Here the geometry is yours to move.

- **The fault-dip checkboxes** filter the cloud, the fit line and the stars
  together, so you can isolate one dip and see its band cleanly, or compare
  two.
- **The `Kern Assumed Dip` parameter** slides the stars from one fit line to
  another — re-reading the same sixteen field measurements under a different
  fault geometry. For Kern itself the measured 30° dip is the right setting;
  the other positions show how the same measurements would read at a site
  whose fault dips differently.
- **Hovering** picks out a single dip's band and its line.

That second control is worth playing with, because it makes the fits'
generality visible. The linear slip–displacement relationships are not
specific to Kern County — they are properties of the simulations, and they
extrapolate to any rupture site with those fault dips. That is exactly why
a well-measured event makes the right demonstration.[^kerndip] Move the
parameter from the measured 30° to 45° and the implied slips shrink from
0.16–2.74 m to **0.12–1.95 m**.[^fits] A steeper fault converts more of
each metre of slip into uplift, so less slip is needed to explain the same
step at the surface. The static figure has to show one geometry; this one
lets you read any site's geometry off the same fits.

## Where this comes from

This is **chart family 6** in the project's inventory, which maps it to the
paper's Figure 14 and Equation 2.[^families] It is the only family that
needed an analytical pre-compute step: the per-dip fits and the
back-projected slips are calculated in the data pipeline and exported as
their own small tables, rather than being recomputed in the browser, so the
numbers on this page are the numbers the project's tests
pin.[^fits] Those exports are listed on the [Data](../data.md) page.

## Where to go next

- **[Response curves](response-curves.md)** — the same simulations, asking
  how every other measured quantity grows with slip.
- **[Model vs reality](model-vs-reality.md)** — how the modelled range
  compares with field measurements overall.
- **[Glossary](../glossary.md#how-the-quantities-relate)** — the
  slip-to-uplift relationship in plain language.

[^fits]: Coefficients, counts and ranges computed from the shipped DEM and
    Kern data by the project's own `dem_regression`,
    `dem_regression_lines` and `kern_inferred_slip` views, and pinned by
    `subprojects/python/tests/test_regression_views.py` in the source
    repository. See also `notes/dashboard-4-build-spec.md`.
[^eq2]: Chiama et al. (2025): Equation 2 "effectively describes the
    relationship between vertical displacement, slip, and fault dip across
    all of our DEM models", which "allows us to directly compare the Kern
    County data and DEM model results".
[^kern]: Chiama et al. (2025): Kern County displacements "yield a
    near-surface slip of up to 3 m", consistent with independent estimates
    of 1–3 m and 1–4 m from earlier studies; the relationship uses scarp
    height "which we assume to equal vertical displacement".
[^families]: `notes/chart-families.md` in the source repository.
[^kerndip]: Buwalda & St. Amand (1955), the classic field survey of the
    1952 rupture, reports the 30° fault dip directly. The per-dip fits
    themselves are properties of the simulations, not of Kern — they apply
    to any rupture site with the modelled dips.
