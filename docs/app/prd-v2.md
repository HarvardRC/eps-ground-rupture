# Ground Rupture Explorer — product requirements document

## Product summary

**Ground Rupture Explorer** is a free web tool for engineers evaluating
sites affected by thrust or reverse faults.

It helps engineers explore modeled scarp height, deformation-zone width,
and scarp geometry for a fault-rupture scenario.

The tool lets an engineer define a plausible site scenario using two
kinds of information:

1. **Site conditions**, estimated from mapping and site investigation:
   - **Fault dip** — the angle at which the fault plane slopes
     underground.
   - **Sediment strength** — how strongly the near-surface soil or
     sediment resists deformation.
   - **Sediment density** — whether the sediment is relatively loose,
     medium-dense, or dense.
   - **Sediment depth** — the depth of sediment above bedrock.

2. **A displacement scenario** for a possible future rupture:
   - **Fault slip or surface displacement** — either the distance the
     fault is assumed to move at depth, or the anticipated vertical
     offset at the ground surface.

The tool searches a published **simulation ensemble** — a large,
systematically varied set of numerical model runs — and shows the range
of simulated ground-rupture outcomes that match those conditions. The
main outputs are:

- **Scarp height** — the vertical ground step that a structure may need
  to accommodate.
- **Deformation-zone width** — the width of disturbed ground that a
  facility may need to avoid or cross with special design.
- **Scarp dip** — the steepness of the scarp face, indicating whether
  the simulated surface rupture is a sharp step or a broad slope.

The tool reports distributions rather than a single answer. This
reflects both uncertainty in the site description and variability within
the simulations. It provides counts, percentiles, data downloads,
citations, and warnings when selected conditions are poorly represented
or fall outside the modeled range.

**Ground Rupture Explorer** is a **screening and design-review aid**. It
is not a probabilistic fault-displacement hazard analysis, a
site-specific prediction, or a design-code tool. It does not estimate
earthquake probabilities or return periods. Engineers remain
responsible for interpreting results, selecting design values, and
following applicable regulations and professional guidance.

### Why it matters

Today, engineers can access:

- the research paper;
- the raw simulation archive; and
- several dashboards built around the researchers' original questions.

However, they cannot easily ask the practical engineering question:

> “Given the approximate conditions at my site, what range of
> surface-rupture outcomes occurred in comparable simulations?”

**Ground Rupture Explorer** provides that missing query interface.

## 1. Problem

### 1.1 The engineering decision

A geotechnical or earthquake engineer may need to evaluate a dam
foundation, pipeline, road, rail line, planned facility, or other asset
crossed by a thrust or reverse fault.

The engineer must support one or more of three decisions:

- **Avoid the rupture zone** — Can the facility, or its critical
  components, be located outside ground likely to be disturbed by
  surface rupture? If so, how much clearance may be needed?   

- **Accommodate** — If a crossing cannot be avoided, how much ground
  offset must the design tolerate? Over what distance will the ground
  deform, and will the deformation be concentrated in a sharp break or
  spread across a broad slope?

- **Investigate further** — Is the available information sufficiently
  constrained to support a design decision, or is the range of plausible
  outcomes wide enough to justify further mapping, trenching, drilling,
  or testing?

In this document, **avoidance** means keeping a facility or its
critical components outside the main rupture zone and associated
disturbed ground.

Site investigation rarely provides exact input values. An engineer may
know, for example, that the fault dip is approximately 30–40°, that the
near-surface sediments are relatively strong, and that a future rupture
could produce up to a specified amount of displacement. The product
must therefore support ranges and categories, rather than require a
single precise description of the site.

### 1.2 What engineers need to know

#### Model outcomes and their use

To support avoidance, accommodation, and further-investigation
decisions, engineers need information about three aspects of modeled
surface rupture:

| Model outcome | Decision it supports | Meaning for the engineer |
|---|---|---|
| **Scarp height** | Accommodate | The vertical size of the ground step. It indicates the vertical offset that a structure crossing the rupture may need to tolerate. |
| **Deformation-zone width (DZW)** | Avoid the rupture zone; accommodate | The width of the main modeled strip of ground disturbed by rupture. It helps indicate how much ground a facility may need to avoid, or how long a specially designed crossing section may need to be. |
| **Scarp dip** | Accommodate | The steepness of the visible slope formed by the rupture. It helps distinguish a concentrated, step-like break from deformation spread across a broader and gentler slope. |

The product reports each outcome as a **distribution**, not as a single
value. This is necessary for two reasons:

1. **The site description is uncertain.** Engineers normally work with
   plausible ranges rather than exact values. For example, a fault dip
   may be estimated as 30–40° rather than known precisely.

2. **Similar modeled conditions can produce different outcomes.** In
   particular, different arrangements of sediment layers can produce
   different surface-rupture patterns even when the broad site
   description is the same.

The distribution therefore shows the range of outcomes in the
simulation ensemble that match the selected scenario. The median
describes a typical modeled outcome; the 84th percentile provides a
commonly used higher fractile for deterministic engineering review.
The tool does not select a design value. That remains the responsibility
of the engineer of record.

#### Limits of the model outputs

The outputs describe the modeled surface expression of rupture, but they
do not describe every possible effect of a real earthquake.

- **Scarp height** represents vertical surface offset. The ensemble does
  not provide the accompanying horizontal ground shortening.

- **Deformation-zone width** is the width of the main modeled strip of
  ground disturbed by rupture. It may include the scarp itself and
  nearby bending, cracking, or uplift. In fault-displacement practice,
  this is called the **principal rupture band**. Real earthquakes can
  also produce separate cracks or deformation zones farther from the
  main rupture; the model does not represent all of those effects.

- **Scarp dip** is the steepness of the visible slope formed by the
  rupture. It is not the same as **fault dip**, which is the angle at
  which the fault plane slopes below ground.

Users must combine the model results with site-specific mapping of where
the fault reaches the ground surface, and with other geological evidence,
when evaluating the full area that may be affected.

### 1.3 What exists today

The research is already publicly available through three complementary
resources:

| Resource | What it provides | Primary audience and use |
|---|---|---|
| **Research paper** | The published scientific analysis of the simulation ensemble, its methods, and its findings. | Readers who need to understand or evaluate the research. |
| **DesignSafe data archive** | The underlying model outputs and supporting data files. | Researchers or advanced users who can download, process, and analyze the data themselves. |
| **Project website and dashboards** | Public explanations of the research and interactive Tableau dashboards showing selected views of the data. | Engineers, researchers, students, and other visitors exploring the published results. |

#### The research paper

Chiama et al. (2025) reports a two-dimensional distinct element method
(DEM) simulation ensemble of thrust and reverse fault rupture through
sediment. The ensemble contains 3,434 simulation trials, each recorded
at 101 stages as fault slip accumulates.

Across the ensemble, the simulations vary fault dip and near-surface
sediment conditions. They measure several features of the resulting
surface deformation, including scarp height, deformation-zone width, and
scarp dip.

The paper establishes the scientific basis for the product, but it is a
static publication. Its figures answer the authors' research questions
at selected parameter combinations; they do not allow a reader to define
and inspect a new site scenario.

#### The DesignSafe data archive

The simulation outputs are archived in two DesignSafe deposits:
one for homogeneous sediment and one for heterogeneous sediment.
DesignSafe provides long-term access to the research data, but it is an
archive rather than an engineering query tool.

A user who wants to answer a scenario-specific question must download
the files, understand the data structure and variable names, apply the
required filters, handle missing measurements, and calculate statistics
independently.

#### The existing project website and dashboards

The existing project website republishes and explains the research. It
also provides five Tableau Public dashboards:

- **Model vs. reality** compares the simulated measurements with field
  measurements from real earthquakes.
- **Response curves** show how surface measurements change as fault slip
  accumulates.
- **Per-event boxplots** compare field-measurement variability within
  individual earthquakes with the modeled range.
- **Slip regression** shows the fitted relationship between fault slip
  at depth and vertical surface displacement.
- **Distributions and summary statistics** shows how individual model
  parameters affect the distribution of each output.

These dashboards remain valuable and should be reused where they meet a
user need. They were designed to communicate the paper's findings,
however, rather than to answer an engineer's combined, site-specific
question.

### 1.4 The gap

The paper, data archive, and existing dashboards provide valuable access
to the research, but none answers the engineer's central question
directly:

> “Given the approximate conditions at my site, what range of
> surface-rupture outcomes occurred in comparable simulations?”

Answering that question requires the engineer to consider several site
conditions together. For example, the engineer may need results for
simulations with:

- fault dip between 30° and 40°;
- strong, dense sediment;
- sediment depth of 5–10 m; and
- a specified range of fault slip or anticipated surface offset.

The relevant result is the subset of simulations that matches all of
those conditions at once.

The current dashboards do not support that kind of combined query. For
example, the distributions dashboard can show how one input parameter
affects an output distribution, but it cannot filter simultaneously by
fault dip, sediment properties, and a displacement range, then calculate
statistics for the resulting subset.

The raw archive could support such an analysis, but only after a user
downloads the data, understands its structure and variable names,
handles missing measurements, applies the filters, and calculates the
statistics independently. The paper cannot support it because its figures
are fixed at the parameter combinations selected by the authors.

As a result, an engineer who needs a site-scenario-specific view of the
ensemble must currently perform a custom data analysis or rely on
professional judgment and precedent.

### 1.5 Product opportunity

**Ground Rupture Explorer** will provide the missing scenario-query
capability. It will allow users to define a scenario using ranges and
categories, view distributions of the matching modeled outcomes, and
download the exact data subset and summary statistics behind the view.

### 1.6 Product boundary

Ground Rupture Explorer provides conditional results from a simulation
ensemble. It helps users examine modeled surface-rupture outcomes under
a selected range of site conditions and displacement assumptions.

It does not:

- estimate how often an earthquake or surface rupture will occur;
- calculate annual probabilities, return periods, or probabilities of
  exceedance;
- perform a probabilistic fault-displacement hazard analysis (PFDHA);
- predict displacement or deformation at a specific site;
- recommend a design value, setback, or engineering solution;
- replace site investigation, fault mapping, applicable regulations, or
  the judgment of a qualified professional.

The product is intended to complement, rather than replace, other parts
of an engineering evaluation. For example, an engineer may use
fault-mapping and site-investigation evidence to define plausible input
ranges; use an external hazard or displacement analysis to develop a
future-displacement scenario; and use Ground Rupture Explorer to examine
the modeled surface expression associated with that scenario.

The final interpretation of the results, including any design decision,
remains the responsibility of the engineer of record.

## 2. Product vision and scope

### 2.1 Product vision

**Ground Rupture Explorer** will extend the existing project website into
a more useful reference tool for engineers, researchers, and students.

Its central new capability is a **scenario page**. On that page, an
engineer can describe a plausible fault-rupture scenario using ranges
and categories for site conditions and displacement, then examine the
matching modeled surface-rupture measurements.

In this document, **modeled surface-rupture measurements** means values
measured from each simulation, including scarp height,
deformation-zone width, and scarp dip.

The scenario page is the product's primary contribution. It answers the
question that the paper, archive, and existing dashboards cannot answer
directly:

> For conditions similar to my site and displacement scenario, what
> values of scarp height, deformation-zone width, and scarp dip were
> produced across the matching computer simulations?

The product will remain part of the existing project website rather than
become a separate research-data property. Existing dashboards, glossary
content, citation material, field-data context, and links to the
DesignSafe archive will be reused where they already meet a user need.

The scenario page may also show measurements from past earthquakes for
context, but it keeps those field measurements distinct from the results
produced by the computer simulations.

### 2.2 MVP and delivery priorities

The proposed **minimum viable product (MVP)** is P1, targeted as v0.3.
It must support the complete core workflow: an engineer defines a
plausible scenario, examines the matching simulated surface-rupture
measurements, understands the result's limits, and downloads the
underlying simulation subset with provenance.

P2 and P3 add useful capabilities, but they must not delay the MVP
unless scientific or usability review identifies a dependency.

- **P1 / MVP (v0.3):** scenario inputs; distributions and statistics for
  scarp height, deformation-zone width, and scarp dip; optional
  real-earthquake measurement context; downloadable simulation subsets
  and summary statistics; citations; and links to the paper and full
  data archive.

- **P2:** shareable scenario URLs, inverse search, plot exports,
  animations and morphology education, and only those additional
  exploration features that address a documented gap in the existing
  dashboards.

- **P3:** contact and request features.

                                       

