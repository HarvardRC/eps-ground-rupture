# Glossary

The paper this site accompanies is written for specialists. This page is the
opposite: it assumes you know nothing about faults, and defines the terms and
abbreviations used across this site in plain language. Nothing here is needed
to *look* at the dashboards — but it should make them mean something.

!!! tip "Two shortcuts"
    Acronyms across the site carry a **tooltip** — DZW, FDHI, DEM and the
    rest appear dotted-underlined, and hovering or focusing one shows its
    expansion without leaving the page. And the search box (top right)
    covers every term defined below.

## The short version

When an earthquake happens on certain kinds of fault, the ground doesn't just
shake — it can break and step, leaving a visible ridge or slope at the surface
called a **[scarp](#scarp)**. That matters for anything built across it:
roads, pipelines, power lines. Almost everything on this site is a
measurement of a scarp, or a comparison between scarps.

The study behind this site asks which conditions control what that scarp looks
like — how deep the sediment is, how strong it is, how steeply the fault is
tilted, how far it slips. It answers that with **simulations**: 3,434
computer experiments in which a modelled fault is pushed until the ground
above it deforms, measured automatically at 346,834 separate moments as the
slip accumulates.[^abstract] It then checks those simulations against
**field measurements** made by geologists who walked real ruptures after real
earthquakes, and suggests the resulting dataset can help forecast ground
deformation in future earthquakes.[^abstract]

Everything below is the vocabulary needed to read that.

## Abbreviations at a glance

| Short | Full | What it is |
|---|---|---|
| **DEM** | Distinct Element Method | The simulation technique — [explained below](#the-simulations). *Not* "digital elevation model", a different thing entirely. |
| **CV** | Computer Vision | The machine-learning model that measures each simulated scarp automatically. |
| **DZW** | Deformation Zone Width | How wide the disturbed ground is, in the simulations. |
| **FZW** | Fault Zone Width | The field record's width measurement. |
| **VS** | Vertical Separation | The field record's vertical-offset measurement. |
| **FNC** | Fault-Normal Component | Displacement measured perpendicular to the fault trace. |
| **SH** | Scarp Height | Height of the step at the surface. |
| **Us** | — | Scarp height, in the paper's notation. |
| **Ud** | — | Vertical uplift on the fault at depth. The dataset column `VD_HW` holds the same quantity. |
| **Us − Ud** | — | "Additional uplift" — [see below](#what-gets-measured). |
| **FDHI** | Fault Displacement Hazards Initiative | A published compilation of field measurements. |
| **SURE** | the name of a database of **s**urface **ru**ptur**e**s | A second published field compilation — [see below](#sure). |
| **IQR** | Interquartile Range | A spread measure — see [statistics](#statistics-terms). |
| **OLS** | Ordinary Least Squares | The standard way of fitting a straight line to data. |
| **SDC** | Surface Deformation Characteristics | The authors' umbrella term for the measured surface quantities: scarp height, DZW and scarp dip. |

## The simulations

**Distinct element method (DEM)** { #dem }
: A way of simulating rock and sediment as a large collection of individual
  particles that can press against each other, stick together and break
  apart, rather than as one continuous solid. Deformation is not
  prescribed — faults, folds and collapses *emerge* from the particles'
  interactions. That is what makes the technique suited to this question:
  you can watch a rupture find its own way to the surface instead of telling
  it where to go.

**Experiment vs model stage** { #model-stage }
: An **experiment** is one complete simulation run with a fixed set of
  conditions — a given sediment depth, density, strength, fault dip. A
  **model stage** is a single snapshot within that run, taken every 0.05 m
  as the slip accumulates. Hence 3,434 experiments but 346,834
  stages.[^abstract] A row in the data is a stage, not an experiment.

**Fault seed** { #fault-seed }
: A modelling device, not a real-world feature: a built-in plane of weakness
  at the intended fault dip, *at the base of the model*. It makes the
  simulated fault start where the experiment intends and avoids
  edge-of-model artefacts. Crucially it does **not** dictate what happens
  near the surface — the paper is explicit that there is no preferred slip
  surface up there, which is exactly what leaves the surface rupture free to
  emerge.[^seed]

## Faults, in plain terms

**Fault** { #fault }
: A crack in the Earth's crust where two blocks of rock can slide past each
  other. An earthquake is that slip happening suddenly.

**Thrust and reverse faults** { #thrust-reverse }
: Faults where the crust is being *squeezed*, so one block is pushed up and
  over the other. The two words describe the same motion at different
  steepnesses — thrust faults are the shallower-dipping ones (conventionally
  under about 45°), reverse faults the steeper. This study covers only these;
  sideways-sliding faults like the San Andreas are out of scope. The
  motivation is practical: this kind of rupture damages infrastructure, and
  field measurements of it are comparatively scarce.[^scope]

**Hanging wall / footwall** { #hanging-wall }
: The two sides of a tilted fault. The **hanging wall** sits *above* the
  fault plane — the block pushed upward here. The **footwall** is below it,
  and stays put. The names come from mining: a miner in a tunnel along the
  fault would hang a lamp on one wall and stand on the other.

**Fault dip** { #fault-dip }
: How steeply the fault plane is tilted, in degrees from horizontal. 20° is
  gently inclined; 70° is close to vertical. The simulations cover 20, 30,
  40, 45, 50, 60 and 70 degrees.

**Slip** { #slip }
: How far the two blocks moved past each other *along* the fault. This is
  what the simulations drive: slip is increased step by step, and the ground
  surface re-measured at every 0.05 m.[^abstract]

**Coseismic** { #coseismic }
: "During the earthquake" — as opposed to movement that accumulates slowly
  between earthquakes.

**Scarp** { #scarp }
: The step, slope or ridge left at the ground surface once slip reaches it.
  The thing all of this ultimately measures.

## What gets measured

The simulations measure five things about each scarp: scarp height (Us),
vertical uplift on the fault at depth (Ud), additional uplift (Us − Ud),
deformation zone width, and scarp dip.[^measured] (The paper's abstract lists
four, counting Us and Ud together as "uplift".)

```text
   hanging wall                                  footwall
   (lifted by the fault)                         (stays put)

   ‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾\                         ─┬─
                             \                        │
                              \___                    │  scarp height
                                  \____                │
                                       \______________─┴─

   ├────── deformation zone width (DZW) ──────┤
   ↑                                          ↑
   first ground disturbance          base of the scarp
   (on the hanging wall)              (on the footwall)
```

*Rough schematic only, and only one of the three scarp shapes. The paper's
Figure 5 is the real thing — see [The paper](paper.md).*

**Scarp height (Us)** { #scarp-height }
: The total height of the scarp, measured from the top of the undeformed
  footwall.[^measured] Where a pressure ridge forms it can exceed the
  undeformed hanging-wall surface, because folding and secondary faults add
  height on top of the fault's own movement.[^measured]

**Deformation zone width (DZW)** { #dzw }
: Measured from the *first* sign of vertical movement on the hanging wall —
  uplift, cracking, or collapse — across to the base of the scarp on the
  footwall side.[^dzw] It is a width spanning the disturbed ground, not a
  distance out from the fault line. A wide DZW means the deformation was
  spread out; a narrow one means it was concentrated.

**Scarp dip** { #scarp-dip }
: The steepness of the scarp face itself, from the top of the scarp to its
  toe, as an angle from horizontal.[^dzw] Not the same as the *fault* dip
  underground.

**Vertical displacement of the hanging wall (VD_HW)** { #vd-hw }
: How far the upthrown side of the fault actually rose. It is the same
  quantity the paper calls Ud, and it is what the
  [slip regression](dashboards/slip-regression.md) plots against slip.
  `VD_HW` is the column name it carries in the project's data.

**Vertical uplift at depth (Ud)** and **additional uplift (Us − Ud)** { #us-ud }
: Ud is how far the fault itself lifted the hanging wall. Us − Ud is
  everything *else* that added height at the surface — folding, secondary
  faulting — beyond the fault's own throw.[^measured] It is near zero for
  simple scarps and positive for pressure ridges, which is what makes it
  diagnostic of scarp shape.

## The sediment conditions

These are the experiment settings, and they appear as dashboard controls.

**Sediment depth** { #sediment-depth }
: How thick the layer of loose material above the fault is.

**Density** and **sediment strength** { #sediment-strength }
: How tightly packed the sediment is, and how well it resists being pulled
  apart. Strength is the parameter that most changes which scarp shape
  forms — weak sediment slumps, strong sediment holds a steep face.

**Set — homogeneous or heterogeneous** { #set }
: Whether the sediment is one uniform material top to bottom
  (*homogeneous*), or layered with different strengths (*heterogeneous*, for
  example a cohesive crust over weaker material).

**Cohesion** { #cohesion }
: How strongly the simulated particles are bonded to one another — the
  model's handle on sediment strength.

**Unruptured sediment above the fault tip** { #unruptured-sediment }
: How much undisturbed material sits between the top of the fault and the
  ground surface before slip begins. More of it means the rupture has
  further to travel before it shows.

## The field counterparts

Field geologists measured real ruptures with their own conventions, which do
not map one-to-one onto the simulations'.

**Fault zone width (FZW)** { #fzw }
: The width of the zone of surface rupture recorded in the field
  compilation, measured across the disturbed ground much as DZW is. The
  paper treats the principal, central FZW as its DZW equivalent.

**Vertical separation (VS)** { #vertical-separation }
: The vertical offset across a rupture measured in the field — how much
  higher one side ended up than the other.

**Fault-normal component (FNC)** { #fnc }
: The horizontal part of the displacement, measured perpendicular to the
  line of the fault at the surface — how much the two sides moved *apart or
  together* rather than *up*. Recorded by the SURE compilation, and the
  subject of one panel on the
  [per-event boxplots](dashboards/per-event-boxplots.md).

| Simulation | Field record | Relationship |
|---|---|---|
| Deformation zone width (DZW) | Fault zone width (FZW) | Treated as equivalent. |
| Scarp height (Us) | Vertical separation (VS) | **Assumed** comparable, not identical. |

That second row deserves emphasis, because the paper is explicit about it:
the field compilation contains **no** measurements of both scarp height and
fault zone width for individual thrust and reverse events, so the study
assumes measured vertical separation is "similar enough to the scarp heights
to foster these comparisons", citing the compilation's own report in
support.[^assumption] The overlay on
[Model vs reality](dashboards/model-vs-reality.md) rests on that assumption.

**Principal rupture** { #principal-rupture }
: The field compilation's label for movement on the main fault trace, as
  opposed to distributed or secondary breaks nearby. Several panels here
  keep only principal measurements.

## Scarp classes

The simulations produce three basic shapes, each of which can additionally be
modified by **hanging wall collapse**.[^classes] That gives the six labels
you will see in the dashboards' colour legends and axes:

| Dashboard label | Shape |
|---|---|
| `Monoclinal` | [inclined slope](#monoclinal) |
| `Monoclinal Collapse` | the same, after [collapse](#collapse) |
| `Pressure Ridge` | [raised ridge](#pressure-ridge) |
| `Pressure Ridge Collapse` | the same, after [collapse](#collapse) |
| `Simple` | [direct offset](#simple) |
| `Simple Collapse` | the same, after [collapse](#collapse) |

Field measurements carry no scarp class — it is a classification of the
simulated shapes — so on plots that mix the two, the field points fall
outside these categories.

**Monoclinal** { #monoclinal }
: An inclined slope rather than a sharp step, formed by shearing spread
  through the sediment. Its steepness is limited by the *angle of repose* —
  the steepest angle loose material can hold before sliding.[^monoclinal]

**Pressure ridge** { #pressure-ridge }
: A raised ridge, formed by folding and uplift where two fault strands dip
  towards each other — a forethrust and a backthrust — squeezing the material
  between them upward. Tends to form above shallowly-dipping faults.[^ridge]

**Simple** { #simple }
: The ground surface directly offset by the fault plane. The sediment is
  strong enough to resist collapsing, so the scarp keeps an overhang and its
  face matches the fault's dip at depth.[^simple]

**…Collapse variants** { #collapse }
: Any of the three where the sediment could not hold the shape: the
  oversteepened face fails, both by slumping and by tensile cracking that
  detaches blocks of material into the base of the scarp.[^collapse]

## The datasets

**DEM model outputs**
: The 3,434 simulation experiments described above. Detail on the
  [Data](data.md) page.

**FDHI**
: The Fault Displacement Hazards Initiative compilation — field measurements
  from many earthquakes, with location and displacement for each.

**SURE** { #sure }
: "A worldwide and unified database of surface ruptures … for fault
  displacement hazard analyses" — a public compilation of surface-rupture
  observations across many historical earthquakes.[^sure] It is the source
  of the fault-normal-component and scarp-height panels on the
  [per-event boxplots](dashboards/per-event-boxplots.md). Note the database
  records no earthquake magnitude of its own; the magnitudes on those panels
  come from a lookup curated inside this project, sourced from the SURE 2.0
  data descriptor (Nurminen et al. 2022).

**Kern County (1952)** { #kern-county-1952 }
: A magnitude 7.36 earthquake on the White Wolf fault in California, and one
  of the best-documented thrust ruptures on record — first surveyed in the
  field in the 1950s. Sixteen of its vertical-displacement measurements are
  the project's worked example for running the model backwards, on the
  [slip regression](dashboards/slip-regression.md) dashboard.

## How the quantities relate

This is the part that makes the dashboards click.

**Vertical displacement = slip × sin(fault dip)**
: The key relationship. If a fault slips one metre along a plane tilted at
  angle *d*, the *vertical* part of that movement is `1 × sin(d)`. A shallow
  20° fault turns only about a third of its slip into uplift; a steep 70°
  fault turns almost all of it into uplift. Fitting each dip's simulations
  separately recovers exactly this — fitted slopes of 0.34, 0.50, 0.65,
  0.71, 0.77, 0.87 and 0.94 for dips of 20° to 70°, against sines of 0.34,
  0.50, 0.64, 0.71, 0.77, 0.87 and 0.94.[^fits] That is a consistency check
  rather than a discovery: the simulations drive the hanging wall along a
  plane at that dip, so the geometry is built in. The paper uses the
  relationship because it lets model and field be compared directly.[^eq2]

**Running it backwards (back-projection)** { #back-projection }
: Because the relationship is so tight, it can be inverted: given a vertical
  displacement measured in the field, estimate the slip that must have
  produced it — `slip = (vertical − intercept) / slope` for the fit at the
  chosen fault dip. The [slip regression](dashboards/slip-regression.md)
  dashboard does exactly this, and lets you vary the dip. The paper does this for Kern County and arrives at up to about
  3 m of near-surface slip, consistent with independent published
  estimates.[^kern] One assumption rides along — what is measured in the
  field is scarp height, and the inversion treats that as equal to vertical
  displacement.[^kern] For simple and monoclinal scarps that holds closely;
  for pressure ridges scarp height runs higher, which is what Us − Ud
  measures.

**Magnitude** { #magnitude }
: A measure of an earthquake's total energy, on a logarithmic scale — each
  whole number up is roughly 32× more energy. It appears on this site in two
  unrelated ways. As an **event label** on the per-event boxplots, it is the
  real magnitude of a real earthquake. As an **x-axis option** on the
  response curves, it is *derived* from slip by an empirical formula, not
  something the experiments controlled — the paper works in near-surface
  slip precisely because earthquakes of a given magnitude produce a whole
  range of surface displacements.[^magnitude] Treat that axis as a
  relabelling of the slip axis.

## Statistics terms

**Median, quartile, interquartile range (IQR)** { #iqr }
: Sort the measurements. The **median** is the middle one. The **quartiles**
  are the values a quarter and three-quarters of the way along, and the
  **IQR** is the gap between them — the range the middle half of the data
  occupies. A box plot draws exactly this: the box is the IQR, the line
  inside is the median.

**Whiskers and outliers** { #whiskers }
: The lines out from the box reach the most extreme measurement still within
  1.5 × IQR of it; anything beyond is drawn separately as an outlier. A long
  whisker means a scattered tail.

**Ordinary least squares (OLS), slope, intercept** { #ols }
: Fitting the straight line through a scatter of points that makes the total
  squared vertical error as small as possible. The **slope** is how much y
  rises per unit of x; the **intercept** is where the line crosses x = 0.

**r² (goodness of fit)** { #r2 }
: How much of the variation a fitted line explains, from 0 to 1. The per-dip
  fits here land above 0.997 — an unusually tight fit, as you would expect
  from simulations obeying a clean geometric relationship. Careful: the DEM
  dataset also carries a column called `R^2 Value` which is something else
  entirely — a measure of ground-surface roughness from fitting the scarp
  dip.[^r2col]

**Log scale** { #log-scale }
: An axis where each step is a *multiplication* rather than an addition
  (1, 10, 100, 1000…). Used on the width panels of the
  [per-event boxplots](dashboards/per-event-boxplots.md) because the values
  there span from centimetres to over a kilometre, which no ordinary axis can
  show at once.

## Where to go next

- **[Model vs reality](dashboards/model-vs-reality.md)** — the simulations
  and the field measurements on one plot.
- **[Response curves](dashboards/response-curves.md)** — how each measured
  quantity grows as slip accumulates.
- **[Per-event boxplots](dashboards/per-event-boxplots.md)** — how much real
  measurements vary within a single earthquake.
- **[Data](data.md)** — where all four datasets come from.

[^abstract]: Chiama et al. (2025), abstract — see [The paper](paper.md).
[^scope]: Chiama et al. (2025), introduction: the motivation is the impact of
    thrust and reverse rupture on the built environment, and the comparative
    scarcity of measured ground-surface ruptures for these fault types.
[^seed]: Chiama et al. (2025): the fault seed "localizes deformation to the
    defined slip plane at the base of the model and prevents undesirable
    boundary condition issues", allowing examination of "how the fault will
    propagate from a well-defined, weaker fault at depth through overlying
    sedimentary materials without a preferred slip surface near the surface".
[^measured]: Chiama et al. (2025): the measured characteristics are "scarp
    height (Us), vertical uplift on the fault at depth (Ud), additional
    uplift (Us−Ud), DZW, and scarp dip", with Us "measured as the total scarp
    height from the top of the undeformed footwall block".
[^dzw]: Chiama et al. (2025), measurement definitions.
[^assumption]: Chiama et al. (2025), citing Sarmiento et al. (2021, 2024).
[^classes]: Chiama et al. (2025): monoclinal, pressure ridge and simple
    scarps, "each of which can be modified by hanging wall collapse".
[^monoclinal]: Chiama et al. (2025): monoclinal scarps "form inclined dip
    slopes that are limited by the angle of repose of the sediment" and "form
    through distributed shear of the sediment".
[^ridge]: Chiama et al. (2025): pressure ridge scarps "feature folding and
    uplift due to the presence of both forethrusts and backthrusts" and
    "generally form above shallowly dipping faults".
[^simple]: Chiama et al. (2025): simple scarps "represent cases in which the
    ground surface is directly offset by the fault plane", where "the
    sediment is strong enough to resist gravitational collapse".
[^collapse]: Chiama et al. (2025), on collapse-modified scarps — gravitational
    collapse together with tensile fracturing that detaches colluvium into
    the base of the scarp.
[^fits]: Computed from the shipped DEM data by the project's own
    `dem_regression` view; the coefficients are pinned by
    `subprojects/python/tests/test_regression_views.py` in the source
    repository.
[^eq2]: Chiama et al. (2025): Equation 2 "effectively describes the
    relationship between vertical displacement, slip, and fault dip across
    all of our DEM models", which "allows us to directly compare the Kern
    County data and DEM model results".
[^kern]: Chiama et al. (2025): Kern County displacements "yield a
    near-surface slip of up to 3 m", consistent with independent estimates of
    1–3 m and 1–4 m from earlier studies; the relationship uses scarp height
    "which we assume to equal vertical displacement".
[^magnitude]: Chiama et al. (2025), which focuses on near-surface slip rather
    than magnitude for this reason.
[^r2col]: Chiama et al. (2025): the dataset "reports an R2 value to
    characterize the ground surface roughness related to the fit of the scarp
    dip to the rupture".
[^sure]: Baize, S., Nurminen, F., Sarmiento, A., *et al.* (2019). "A worldwide
    and unified database of surface ruptures (SURE) for fault displacement
    hazard analyses." *Seismological Research Letters* 91: 499–520 — the
    reference Chiama et al. (2025) cites for this dataset.
