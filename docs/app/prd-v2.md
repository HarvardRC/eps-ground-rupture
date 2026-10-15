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

### 2.3 Reuse-first principle

The project already provides five public Tableau dashboards. They remain
the default way to present questions that they already answer well.

**Ground Rupture Explorer** will add a native capability only where the
existing site does not meet a defined user need. Its central new
capability is the combined scenario query: selecting several site
conditions together and viewing the corresponding simulated
surface-rupture measurements.

The product will reuse existing project assets where appropriate,
including:

- the project website and its navigation;
- the glossary and explanatory content;
- the citation and disclaimer material;
- links to the DesignSafe data archive;
- the published dashboards; and
- field measurements from past earthquakes, where they provide useful
  context and can be shown with their source-specific limitations.

The product will not reimplement an existing dashboard merely to create
a visually consistent interface. A new native display must address a
documented user need that the existing dashboards cannot meet.

The technical choice for each existing dashboard or new product surface
— for example, linking to it, embedding it, or building a native
replacement — belongs to the high-level design document and the
associated architecture decision record. This PRD defines the user
capabilities and scope, not their technical implementation.                                       

### 2.4 Capability map

The following map connects each planned capability to the provided 
PowerPoint mockup, relevant existing assets, proposed new work, and 
delivery priority. P1 is the proposed MVP; P2 and P3 are later 
priorities. 

| ID | Capability | Mockup area | Existing assets to reuse | New work | Priority |
|---|---|---|---|---|---|
| **C1** | **Define a scenario** using fault dip, sediment properties, and a displacement range. | Advanced Search: “Search by DEM Model Parameters” | None. The current distributions dashboard can show one parameter at a time but cannot apply several scenario conditions together. | Scenario-input controls and combined filtering. | P1 |
| **C2** | **View simulated surface-rupture measurements** for the selected scenario: scarp height, deformation-zone width, and scarp dip. | Advanced Search results panel | Existing distributions dashboard provides histogram patterns. | Filtered distributions, cumulative views, counts, and summary statistics. | P1 |
| **C3** | **Compare the selected simulation results with measurements from past earthquakes.** | Worked example in mockup slides 6–7 | Existing field-data displays and the project's field-measurement export. | Optional field-data overlay on scenario results, with clear source and comparability caveats. | P1 |
| **C4** | **Download the matching simulation records and their summary statistics**, with citations and scenario provenance. | “Download Selected Data” | None. | Download flow and provenance package. Plot-image export and scenario-linked animations follow in P2. | P1 |
| **C5** | **Link to the complete research dataset and paper.** | “Download the full DEM dataset” | Existing citation material and How-to-cite components. | Links to the DesignSafe archive and paper; no re-hosting of the raw archive. | P1 |
| **C6** | **Share a scenario** through a link that reproduces the selected settings and results. | Not explicitly shown; comparable to the NZ NSHM app. | None. | Scenario state encoded in the URL. | P2 |
| **C7** | **Search in reverse:** start with observed surface deformation and find simulation conditions that produced similar measurements. | Advanced Search: “Search by Surface Deformation Characteristics” | The existing slip-regression dashboard provides a method precedent. | Inverse-query interface and explanatory safeguards. | P2 |
| **C8** | **Explore the full dataset** through scatterplots, histograms, density views, color-by controls, and selection tools. | Full-dataset explorer | The existing Tableau dashboards already cover most of these uses. | Reuse existing dashboards first. Build a native display only for a documented unmet need. | P2 |
| **C9** | **Learn about scarp morphologies** through descriptions, model snapshots, photographs where permitted, and animations. | Morphologies tab | Existing glossary, figures, and author-supplied media. | Morphology page and animation library; public use of third-party photographs remains permission-dependent. | P2 |
| **C10** | **View slip and derived magnitude together** where appropriate. | Full-dataset and Advanced Search views | Existing response-curves dashboard formula and warning. | Reuse the derived display and its warning; magnitude remains a display aid, not an input, unless separately approved. | P2 |
| **C11** | **Contact or request materials** such as data formats or animations. | Contact tab | Existing project and repository links. | Small contact/request page. | P3 |


### 2.5 Out of scope

Ground Rupture Explorer is intentionally limited to exploring results from
the published simulation ensemble. The following are outside the scope of
this product:

- **Earthquake occurrence and probability analysis.** The product will
  not estimate earthquake rates, annual probabilities, return periods,
  or probabilities that a displacement value will be exceeded. It is not
  a probabilistic fault-displacement hazard analysis (PFDHA).

- **Site-specific prediction.** The product will not predict the
  displacement, deformation-zone width, or scarp shape that will occur
  at a particular site in a future earthquake.

- **Design recommendations.** The product will not recommend a design
  displacement, setback, clearance distance, or engineering solution.
  Selecting and defending such values remains the responsibility of the
  engineer of record.

- **Replacement of site investigation.** The product will not replace
  geological mapping, trenching, drilling, geophysical investigation, or
  other site-specific work needed to locate and characterize a fault.

- **User data upload or overlay.** Users will not upload their own
  measurements or project data to the site. Researchers and other users
  can compare their data offline using the downloaded simulation subset.

- **Accounts, tracking, or private workspaces.** The product will be
  free to use without login, user accounts, or product-specific visitor
  tracking.

- **Re-hosting the full raw archive.** The product will link to the
  DesignSafe deposits and the research paper, but it will not duplicate
  the complete raw simulation archive.

- **Immediate support for the on-hold 3D simulation arm.** The first
  release covers the published 2D simulation ensemble. However, new data
  exports and product concepts must not make future 3D support
  unnecessarily difficult.

- **Rebuilding all existing dashboards.** The product will reuse the
  existing dashboards unless a specific, documented user need requires a
  new native display.

## 3. Users and personas

### 3.1 Primary persona: the practicing engineer

A geotechnical or earthquake engineer is evaluating a dam, pipeline, road,
rail line, foundation, planned facility, or other asset affected by a
thrust or reverse fault.

**What they are trying to do**

Support an avoidance, accommodation, or further-investigation decision
for a specific project site.

**What they know**

They may have approximate site information from mapping and
investigation, such as fault dip, sediment conditions, sediment depth,
and a plausible future-displacement scenario. They understand
engineering concepts such as percentiles and deterministic design
scenarios.

**What they do not have**

They do not have exact values for all site conditions. They may not know
the simulation dataset's internal variable names, data structure, or
measurement methods. They may have an anticipated surface offset rather
than the fault-slip input used by the simulations.

**What they need from the product**

- A way to define a scenario using engineering terms, ranges, and
  categories.
- Simulated values of scarp height, deformation-zone width, and scarp
  dip for matching computer simulations.
- Counts, distributions, and percentiles, with prominent warnings for
  sparse results, missing measurements, or conditions outside the
  modeled range.
- A downloadable, citable subset for use in a report or design review.

**What the product must not imply**

The results are not a site-specific prediction, a probability-based
hazard result, or a recommended design value.

### 3.2 Secondary persona: the independent reviewer

A reviewer, regulator, owner’s engineer, or peer reviewer is evaluating
an analysis prepared by another engineer.

**What they are trying to do**

Reproduce the stated scenario, test whether the selected inputs are
reasonable, and determine how a reported value relates to the matching
simulation results.

**What they need from the product**

- Clear display of the selected scenario and resulting sample size.
- Reproducible scenario settings, eventually through a shareable URL.
- Transparent statistics, data versions, citations, and downloads.
- Clear explanations of what the model represents and does not
  represent.

### 3.3 Secondary persona: the researcher

A researcher is comparing the published ensemble with another model,
field compilation, or analysis.

**What they are trying to do**

Identify and download a well-defined subset of simulation records for
offline analysis.

**What they need from the product**

- Precise filtering by modeled parameters and measurements.
- Complete scenario and data provenance in downloads.
- Links to the paper and original DesignSafe archive.
- Clear distinction between simulation results and field measurements.

The product does not support uploading or overlaying the researcher's own
data. Such comparisons take place offline.

### 3.4 Tertiary persona: the learner

A student or interested non-specialist is trying to understand how
thrust and reverse fault rupture appears at the ground surface.

**What they need from the product**

- Plain-language explanations and glossary links.
- Visual examples of scarp types and surface deformation.
- Accessible charts and educational animations.

The scenario page is not primarily designed for this persona; the
planned morphology and glossary content serve this need.

### 3.5 Stakeholder: Harvard Structural Geology & Earth Resources Group

The **Structural Geology & Earth Resources Group** in Harvard
University's Department of Earth and Planetary Sciences is the research
group behind the published simulation ensemble and associated data
deposits. In this document, it is referred to as the **Harvard Structural
Geology & Earth Resources Group** or, where no ambiguity is possible,
the **research group**.

The research group is not a typical end user, but it is a key
stakeholder.

It needs the product to present the published work accurately, preserve
its scientific limitations and provenance, increase access to the
DesignSafe data deposits, and avoid claims that the research cannot
support.

## 4. User stories

### US-1: Dam foundation scenario

**Persona:** Practicing engineer

**Situation:** An engineer is evaluating a dam whose foundation crosses a
thrust or reverse fault. Site investigation suggests a fault dip of
approximately 30–40°, strong sediment conditions, and a possible vertical
surface offset of up to 3 m.

**Need:** The engineer needs to define those conditions as a scenario,
including both homogeneous and heterogeneous strong-sediment cases. The
engineer has an anticipated surface offset rather than fault slip at
depth.

**Expected result:** The product converts the anticipated surface offset
to the corresponding fault-slip range for each selected fault dip. It
clearly warns that the conversion for a 30° dip exceeds the modeled
slip range, so that part of the scenario is only partly represented by
the simulations.

The engineer can then view the number of matching simulations and the
distributions, median, and 84th percentile for scarp height,
deformation-zone width, and scarp dip. The engineer can download the
matching simulation records and summary statistics for use in a design
report.

### US-2: Pipeline crossing

**Persona:** Practicing engineer

**Situation:** An engineer is designing a pipeline crossing where the
pipeline cannot avoid a thrust or reverse fault. The site has relatively
loose, shallow sediment and a steeply dipping fault.

**Need:** The engineer needs to understand the plausible width of the
main disturbed ground zone in order to determine the length of pipeline
that may require special crossing design.

**Expected result:** The engineer can define the site conditions and
view the distribution of deformation-zone width, including the sample
size, median, 84th percentile, and full modeled range. The result makes
clear that the width represents the main modeled rupture zone, not every
possible separate deformation strand in a real earthquake.

### US-3: Design review

**Persona:** Independent reviewer

**Situation:** A reviewer is assessing a consultant's report. The report
states a fault-rupture scenario and gives an “expected” scarp height.

**Need:** The reviewer needs to reproduce the stated scenario and
determine how the consultant's reported value relates to the matching
simulation results.

**Expected result:** The reviewer can enter the stated scenario,
inspect the number and distribution of matching simulations, and
determine whether the reported value is near the median, near the 84th
percentile, elsewhere within the simulated range, or outside it.

The reviewer can download the matching subset and statistics with the
scenario settings, data version, and citations recorded in the download.

### US-4: Interpreting observed deformation

**Persona:** Researcher or engineering geologist

**Priority:** P2

**Situation:** A geologist has measured an approximately 2 m scarp at a
site, but the fault dip and near-surface sediment conditions are not well
known.

**Need:** The geologist wants to identify simulation conditions that
produced surface deformation similar to the observation.

**Expected result:** The product allows the user to specify an observed
range of scarp height, deformation-zone width, or scarp dip and view the
distribution of fault dip, sediment conditions, and fault slip among
matching simulations.

The product describes the result as **simulation conditions consistent
with the observation**. It does not present the result as an inference
or estimate of the actual site's subsurface conditions.

### US-5: Teaching surface-rupture morphology

**Persona:** Instructor or learner

**Priority:** P2

**Situation:** An instructor is explaining how fault dip and sediment
strength affect the shape of surface rupture.

**Need:** The instructor wants to compare representative scarp types and
show how their form changes under different modeled conditions.

**Expected result:** The product provides plain-language descriptions,
model snapshots, and representative animations for the scarp classes.
For example, the instructor can show that strong sediment on a steep
fault can produce a steep, simple scarp, while weaker sediment may
produce a broader monoclinal slope as material deforms and slumps.

## 5. Functional requirements

This section defines what Ground Rupture Explorer must do. Requirements
are grouped by user task:

- **FR-S** — scenario inputs;
- **FR-O** — results and field-data context;
- **FR-D** — downloads and citation;
- **FR-X** — sharing and inverse search;
- **FR-E** — education, animations, and contact; and
- **FR-G** — display rules shared across capabilities.

P1 requirements define the proposed MVP. P2 and P3 requirements are
later priorities unless they are required to make the MVP scientifically
credible, understandable, or usable.

Unless otherwise stated, a requirement applies to the scenario page.

### 5.1 Scenario inputs (C1, P1)

#### Scenario-input controls

| Input | User selects | Key rule |
|---|---|---|
| Fault dip | One or more of the seven modeled dip values: 20°, 30°, 40°, 45°, 50°, 60°, and 70°. | The interface must not imply that unmodeled intermediate dip values are available. |
| Sediment strength and structure | Engineer-facing strength categories and the choice between uniform and layered sediment cases. | The interface must make the distinction between uniform and layered cases visible; it must not pool them silently. |
| Sediment depth | One or more modeled depths: 3 m, 5 m, and 10 m. | Select only modeled values. |
| Sediment density | Dense, medium, or loose. | Select only modeled values. |
| Displacement window | Minimum and maximum fault slip at depth. | The product may assist users who instead have an anticipated vertical surface offset, but it must label the two quantities distinctly. |
| Population | All model stages within the slip window, or one state per simulation trial. | The selected population must always be visible and must never be mixed silently. |
| Scarp class | Optional filter by resulting modeled scarp type. | Present it as an outcome-based filter, not a site condition. |
| Reset | Return all controls to their full-ensemble state. | An empty scenario represents the full ensemble. |

The scenario page must let users define a plausible site scenario using
the modeled input values and ranges described below.

#### FR-S1. Fault dip

The product must let users select one or more of the seven fault-dip
values represented in the simulation ensemble:

> 20°, 30°, 40°, 45°, 50°, 60°, and 70°.

Users may select values individually or enter a range. When a range is
entered, the product must show which modeled values it includes. For
example, a range of 30–40° includes 30° and 40° only.

The interface must not use a continuous slider or other control that
implies simulations exist for unmodeled intermediate values.

#### FR-S2. Sediment strength and structure

The product must let users select sediment conditions using
engineer-facing categories rather than internal dataset codes.

The primary control must offer:

- **Weak**, **Moderate**, and **Strong** sediment categories; and
- the three modeled layered-sediment structures:
    - Random Heterogeneous;
    - Cohesive Top Unit; and
    - Alternating Strong–Weak.

The interface must make the distinction between **uniform** and
**layered** sediment cases visible. It must not silently combine them.

The meaning of Weak, Moderate, and Strong differs between the uniform
and layered simulation cases. The product must present and document
these categories in a way that does not imply they are directly
interchangeable.

The dataset's detailed cohesion configurations, including five uniform
strength values and letter-coded layered profiles, are an advanced
refinement. They are not required as the primary P1 control.

#### FR-S3. Sediment depth

The product must let users select one or more modeled sediment depths
above bedrock:

> 3 m, 5 m, and 10 m.

The interface may provide individual selection or a range-style control,
but it must select only these modeled values.

#### FR-S4. Sediment density

The product must let users select one or more modeled sediment-density
categories:

> Dense, Medium, and Loose.

#### FR-S5. Displacement window

The primary displacement input must be a minimum-to-maximum range of
**fault slip at depth**, because fault slip is the variable controlled in
the simulations.

The product must label this input clearly as fault slip at depth and
show its modeled range: approximately 0–5 m, recorded in approximately
0.05 m stages.

Because engineers may instead have an anticipated **vertical surface
offset**, the product must provide an optional conversion assist. The
assist must:

- convert the anticipated surface offset to fault slip using the
  ensemble's tested, dip-specific regression;
- show the conversion separately for each selected fault dip;
- state that the conversion assumes scarp height is approximately equal
  to vertical surface displacement;
- state that this approximation is closest for Simple and Monoclinal
  scarps and may be biased for Pressure Ridges; and
- prominently warn when a converted slip value lies outside the modeled
  slip range.

The product must never silently clip an out-of-range conversion. If part
of a selected scenario falls outside the modeled range, the product must
state that coverage is partial.

The interface must keep the two entry modes distinct:

- **fault slip at depth** is the simulation input; and
- **anticipated vertical surface offset** is a user-provided value that
  the assist converts for the purpose of querying the simulations.

The exact behavior when multiple fault dips are selected—for example,
whether the product applies a separate slip window for each dip or uses
one common window—must be defined in the PDD.

#### FR-S6. Population selection

The product must always display which simulation population it uses for
the results. The user must choose between:

- **All model stages in the slip window** — includes every recorded
  simulation stage within the selected slip range. This answers:
  “What outcomes occurred anywhere along the way to this amount of
  slip?”

- **One state per simulation trial** — includes one record from each
  simulation trial. When a slip window is active, this is the last stage
  within that window for each trial. This answers:
  “What outcomes occurred at the upper end of my selected slip range?”

The default must be **All model stages in the slip window**, because it
matches the common engineering phrasing “up to X m of displacement.”

The product must not silently combine or switch between these
populations.

If no slip window is active, the one-state-per-trial option must use the
actual final state of each trial. The product must not attempt to
intersect final states with a capped slip window, because the final state
of each trial occurs at approximately 5 m of slip.

#### FR-S7. Scarp-type filter

The product must provide an optional filter for the six modeled scarp
types. The default is all scarp types.

The interface must label this control as a filter on the **resulting
modeled scarp type**, not as a site condition or input known before
rupture occurs.

The six modeled scarp types are Monoclinal, Pressure Ridge, and Simple,
together with a collapse variant of each. A collapse variant represents a
case in which the steep scarp face has slumped or crumbled.

#### FR-S8. Default and reset state

All scenario controls must default to the full ensemble. An empty
scenario therefore shows results for all available simulation records,
subject to the selected population and measurement-availability rules.

The product must provide a reset action that returns every scenario
control to this default state.

### 5.2 Results and field-data context (C2, C3, P1)

The scenario page must show the simulated surface-rupture measurements
that match the selected scenario and population.

#### FR-O1. Distribution views

For each of the following measurements, the product must provide a
distribution view of the matching simulation records:

- scarp height;
- deformation-zone width; and
- scarp dip.

Each measurement must include:

- a histogram;
- a cumulative distribution view that supports percentile reading; and
- the number of matching records (**N**), displayed prominently.

For P1, these are the required result views. Probability-density curves,
scatterplots, color-by controls, and other exploratory views belong to
the later full-dataset exploration capability (C8).

A fourth measurement, additional uplift (Us − Ud), may be added in P2.
It is not part of the proposed MVP unless the relevant open question is
resolved otherwise.

#### FR-O2. Summary statistics

For each measurement, the product must display:

- count of valid measurements;
- median;
- 84th percentile;
- 16th percentile;
- minimum and maximum;
- mean; and
- standard deviation.

The product must also display the number of excluded null measurements:
simulation records for which the automated measurement was unavailable.

The statistics must be described as statistics of the matching
simulation records. The product must not describe any percentile as a
recommended design value. Selection of a design value remains the
responsibility of the engineer of record.

#### FR-O3. Small or empty result sets

The product must warn users prominently when a scenario produces too few
valid measurements to support a meaningful distribution display. The
minimum count that triggers this warning must be defined in the PDD.

If a scenario produces no matching records, the product must explain why.
Where possible, it must identify the condition or combination of
conditions that removed all records from the result set.

The product must not show an empty, incomplete, or very small result set
in a way that appears more certain than the data supports.

#### FR-O4. Scarp-dip data caveat

Scarp-dip results must carry a prominent provisional-data notice until
the research group provides the authoritative `Convert_Scarp_Dip`
correction.

The notice must explain that the current scarp-dip values are subject to
a known correction, with the largest error concentrated in the Simple
scarp types.

This caveat is required wherever scarp-dip results are displayed or
downloaded. It must be visible to users, not hidden in technical
documentation or a footnote.

#### FR-O5. Field-data context

The product must allow users to overlay selected measurements from past
earthquakes on the distribution of matching simulation results.

Field measurements are optional context, not part of the filtered
simulation population. The interface must keep them visually and
conceptually distinct from the computer-simulation results.

The field-data display must:

- use the site's established convention that field data is shown in
  black;
- label the comparison **“analogous, not identical”**;
- identify the source of each field measurement; and
- explain that the field and simulated measurements are comparable
  approximations, not always identical quantities.

For scarp height, field vertical separation is the relevant analogue.
For width, the field comparison differs by source:

- FDHI provides fault-zone width (FZW);
- the Kern County data provides deformation-zone width; and
- SURE provides a fault-normal displacement component.

The product must not assign modeled scarp types to field measurements.

Field-width displays must default to the paper's less-than-50-metre
criterion. Users may switch to the full field-width range, with an
explanation that larger widths may include distributed, multi-strand
deformation that the model does not represent.

#### FR-O6. Kern County worked example

The product must include a worked example based on the 1952 Kern County
earthquake.

The example must show:

- a 30° fault dip;
- the Pressure Ridge scarp type;
- the relevant filtered simulation distribution for deformation-zone
  width; and
- field-width measurements drawn from the project's pinned
  per-measurement export.

The example must not use manually entered field values. Its displayed
measurements must be traceable to the versioned export.

The current field-data export contains two possible Kern County data
groups:

- an FDHI group containing widths of 11 m, 15 m, and 30.5 m under the
  less-than-50-metre criterion; and
- a hand-compiled Buwalda group containing eleven widths from 0.30 m to
  30.48 m, without a principal-rupture marker.

The research group must decide which group the example uses and, if
needed, define the rule for identifying a principal-width subset before
the example is finalized.

### 5.3 Downloads and citation (C4, C5, P1)

Downloads must allow engineers, reviewers, and researchers to reproduce
the displayed result, cite the underlying research, and use the selected
simulation records in reports or offline analysis.

#### FR-D1. Download matching simulation records and statistics

The product must let users download:

- the simulation records that match the selected scenario and population;
  and
- a summary-statistics table for the displayed measurements.

CSV is the minimum required download format.

Each download must include sufficient provenance to reproduce and cite
the result. At a minimum, it must record:

- the citation for the research paper;
- the DesignSafe DOI or DOIs for the source data;
- the software version;
- the version and date of the data export used by the product;
- the selected scenario settings;
- the selected population;
- the date on which the download was generated; and
- any applicable data caveats, including the provisional scarp-dip
  notice.

The download must contain the matching **simulation records** and their
derived statistics. It must not silently include field measurements shown
as chart context. Field measurements remain separately sourced and cited.

#### FR-D2. Export chart images

The product should allow users to export chart images for use in reports
or review material. This is a P2 capability.

An exported image must include, or be accompanied by, enough information
to identify:

- the selected scenario;
- the displayed measurement;
- the selected population;
- the number of matching records;
- the software and data-export versions; and
- the citation or a clear reference to the accompanying citation
  information.

The final format and presentation of chart provenance are defined in the
PDD.

#### FR-D3. Link to the complete data archive and paper

The product must link users to:

- the full raw dataset in the DesignSafe archive; and
- the research paper.

The product must not re-host the complete raw simulation archive.

The page must include the project's standard citation material,
including the established instruction to cite the research paper rather
than the website when citing the scientific work.

#### FR-D4. Offer representative scarp-type animations

The download flow should offer representative animations for the dominant
modeled scarp type or types in the selected scenario. This is a P2
capability.

Every simulation record has a scarp-type label. The dominant type is the
most frequent scarp-type label among the simulation records that match
the selected scenario and population.

The purpose is to offer an animation that illustrates the most typical
modeled surface-rupture form under the selected conditions. For example,
if most matching records are classified as Pressure Ridge, the download
flow should offer the Pressure Ridge animation rather than an undifferentiated
menu of all scarp-type animations.

When no single type is sufficiently more frequent than the others, the
product may offer animations for more than one dominant type. The rule
for how many types qualify as dominant, and any minimum frequency
threshold, must be defined in the PDD.

The animations must use the same scarp-type media library planned for
the morphology education surface. The product must present an animation
as an illustrative example of a scarp type, not as a visualization of
the user's specific site or of an individual matching simulation record.
