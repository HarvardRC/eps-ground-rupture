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

### 5.4 Sharing and inverse search (C6, C7, P2)

These capabilities improve reproducibility and support users who begin
with an observed surface feature rather than a fully defined site
scenario. They are not required for the P1 MVP.

#### FR-X1. Shareable scenario links

The product must support a shareable URL that opens Ground Rupture
Explorer with a user's scenario settings and selected view restored.

A shareable URL is not a link to a static saved report or a read-only
view. It is a reproducible starting point for an interactive Scenario
Explorer session. A person who opens the link may change any available
scenario setting, result view, or field-data display and continue
exploring without restriction.

The URL must preserve all settings needed to restore the shared starting
state, including:

- selected fault-dip values;
- selected sediment conditions;
- the displacement window and its entry mode;
- the selected simulation population;
- any scarp-type filter;
- selected measurement or result view; and
- field-data display settings, where applicable.

The product must calculate results using the software version and
data-export version currently published when the link is opened. It does
not need to preserve a static historical copy of the results.

Because a later software or data update may change the result associated
with the same settings, the page and all downloads must display the
current software version and data-export version. The PDD must define
how the product notifies users when a shared link was created under an
older version, if creation-version information is included in the URL.

#### FR-X2. Inverse search

The product must allow users to begin with an observed range of one or
more surface-rupture measurements and identify simulation records that
produced similar measurements.

Users may specify a range for:

- scarp height;
- deformation-zone width; and/or
- scarp dip.

For the matching simulations, the product must show the distribution of
the modeled input conditions, including fault dip, sediment strength,
sediment density, sediment depth, and fault slip.

The product must describe these results as:

> **Simulation conditions consistent with the selected observation**

It must not describe them as inferred, estimated, or predicted
properties of the user's actual site. Similar surface measurements can
be produced by different combinations of modeled conditions, and the
simulation ensemble does not contain enough information to uniquely
identify real site conditions.

Users may apply the forward scenario controls to narrow an inverse
search. For example, a user may begin with an observed scarp-height
range, then restrict the matching simulations to a known sediment depth
or fault-dip range.

Magnitude is not an inverse-search input. If the product displays a
derived magnitude scale, it remains a labeled display aid subject to the
rules in FR-G1.

### 5.5 Education, animations, and contact (C9, C11, P2/P3)

These capabilities support learning, outreach, and requests for related
research materials. They are not required for the P1 MVP.

#### FR-E1. Morphology education

The product must provide a morphology-education page describing the six
modeled scarp types:

- Monoclinal;
- Monoclinal Collapse;
- Pressure Ridge;
- Pressure Ridge Collapse;
- Simple; and
- Simple Collapse.

For each type, the page must provide:

- a plain-language description;
- a representative model snapshot;
- glossary links or equivalent explanations; and
- a representative animation, where an appropriate asset is available.

The page may also use photographs from real earthquakes to provide field
context. However, third-party photographs may be used in public releases
only after the required permissions have been confirmed. They may be
used during internal development and review where permitted.

The same animation library must support the representative-animation
feature in FR-D4.

#### FR-E2. Explain how the measurements are made

The product must explain how the research group measured surface-rupture
features in the computer simulations.

The explanation must describe, in reader-facing language, that an
automated image-analysis or computer-vision process measured features
such as scarp height, deformation-zone width, and scarp dip from the
simulated ground surface.

The explanation must reuse existing project content and reference the
relevant figure in the research paper where appropriate. It may include
author-supplied animated media showing the measurement process.

The explanation must make clear that these measurements are derived from
computer simulations. They are not direct measurements from a user's
site or predictions for a future earthquake.

#### FR-E3. Contact and request page

The product should provide a contact or request page where users can ask
the research group about:

- data formats;
- animation materials;
- related research resources; or
- other appropriate project questions.

This is a P3 capability.

The page must include:

- the research group's preferred contact channel;
- links to the project's existing website and repository resources; and
- links to the research group's DEM and machine-learning model-code
  repositories, once the research group provides the approved URLs.

### 5.6 Shared display rules

The following requirements apply across Ground Rupture Explorer wherever
the relevant information or controls appear.

#### FR-G1. Slip and derived magnitude displays

Where fault slip is displayed on an axis, the product may also show the
project's derived moment-magnitude scale as a secondary axis or optional
toggle.

The product must make clear that:

- fault slip is the primary modeled quantity;
- the magnitude scale is a monotonic relabeling derived from fault slip;
  and
- the magnitude scale is not an independently modeled variable or a
  direct estimate of the magnitude of a future earthquake at the user's
  site.

The product must retain the project's existing warning to prefer slip
when interpreting results.

Users must not enter anticipated earthquake magnitude as a scenario
input unless the research group approves a conversion method, its
uncertainty statement, and its intended use.

#### FR-G2. Scarp-type colors and identification

Where scarp types are shown, the product must use the project's canonical
scarp-class palette and ordering, defined below. The palette preserves
the colors used in the research paper's figures so that readers can
recognize the same scarp class in the paper, the published dashboards,
and this product.

These colors are a research-group decision, recorded in the project's
dashboard-design conventions (ADR-0007). The product must reproduce
them exactly. Any proposal to change a color belongs to the research
group, not to product design or implementation.

The canonical palette and order are:

| Order | Scarp type | Color |
|---:|---|---|
| 1 | Monoclinal | `#009ffa` |
| 2 | Monoclinal Collapse | `#3f67b1` |
| 3 | Pressure Ridge | `#f47820` |
| 4 | Pressure Ridge Collapse | `#af773e` |
| 5 | Simple | `#ed2024` |
| 6 | Simple Collapse | `#9f1d20` |

Each collapse variant uses a darker shade of its corresponding base
type. This order — each base type immediately followed by its collapse
variant — is required wherever scarp types appear, including legends,
stacked charts, tables, and lists.

Records without a scarp classification must never use a scarp-class
color. The PDD must define whether they are excluded from a given display
or shown in neutral gray after the six classified scarp types.

Field measurements must retain the black convention required by FR-O5.
They must never use a scarp-class color.

Color must not be the only way to identify a scarp type. Every
color-coded display must also provide text identification through a
legend, label, tooltip, table, or equivalent accessible mechanism.

This is a required accessibility safeguard, not merely good practice.
The palette is retained for fidelity to the research figures despite
known color-vision limitations. For example, Simple (`#ed2024`) and
Pressure Ridge Collapse (`#af773e`) are not reliably distinguishable
under some forms of red-green color-vision deficiency, and the two
Pressure Ridge shades can be difficult to distinguish even for viewers
with typical color vision.

Where a simpler presentation is needed, the product may offer a
**scarp-family** view that combines each collapse variant with its base
type. This view uses the three base-type colors. It still must not rely
on color alone for identification.

The PDD must define where the scarp-family view is available, how it is
labeled, and the presentation details already established in the
published dashboards, such as fill opacity and overlay conventions.

#### FR-G3. Reader-facing labels and data-driven text

The product must use reader-facing labels for physical quantities and
controls. Labels must include units where applicable.

For example:

- **Scarp height (m)**, not an internal column name;
- **Fault slip at depth (m)**, not a dataset field name; and
- **Deformation-zone width (m)**, not an abbreviated internal code
  without explanation.

Labels, annotations, selected-value summaries, and explanatory text that
depends on user settings must be generated from the current data and
scenario state. The interface must not contain fixed text that can
contradict the user's selections.

#### FR-G4. Citation, disclaimer, and version information

The product must display:

- the project's standard citation material;
- the research-tool disclaimer;
- the current software version; and
- the version and date of the data export used for the displayed result.

The disclaimer must state clearly that the product:

- is research-grade and may be revised;
- is provided without warranty and subject to the project's stated
  liability limitations;
- does not provide earthquake occurrence rates, return periods,
  probability-based hazard results, or site-specific predictions; and
- should be used with qualified professional judgment and applicable
  site-investigation and regulatory guidance.

The product must present the scarp-dip provisional-data notice and the
selected-population explanation wherever relevant. These are
reader-facing requirements, not hidden technical notes.

#### FR-G5. Reuse of existing full-dataset dashboards

The product must reuse the existing published dashboards for
full-dataset exploration unless a documented user need cannot be met by
those dashboards.

A native replacement or additional native exploration panel requires a
named gap and rationale in the PDD.

For each dashboard or related product surface, the high-level design
must decide whether the appropriate implementation is:

- a link to the existing dashboard;
- an embedded dashboard;
- a native display; or
- a hybrid approach.

That implementation decision must be recorded in the high-level design
and associated architecture decision record. This PRD defines the user
need and reuse-first rule, not the technical platform choice.

## 6. Data requirements

The product must use controlled, versioned data exports derived from the
project's established data pipeline. It must preserve the distinction
between:

- **simulation records** produced by the computer-model ensemble;
- **derived statistics** calculated from those records;
- **field measurements** recorded after past earthquakes; and
- **reader-facing exports** prepared for the product.

### 6.1 Data provenance and calculation integrity

#### DR-1. Controlled data source

Every number displayed by Ground Rupture Explorer must derive from the
project's data pipeline or from a versioned export produced by that
pipeline.

The pipeline transforms the archived research data into controlled,
purpose-built exports for publication and product use. The app must not
treat the existing flat `dem.csv` export as its primary data source
merely because it was prepared for Tableau. That file is a Tableau
compatibility export, not the intended foundation for a new interactive
product.

Statistics calculated when a user changes a scenario — including
filtered counts, percentiles, means, and standard deviations — must be
tested against pipeline-computed reference results for defined
scenarios.

No reader-visible number may depend solely on untested front-end logic.

The HLDD must determine whether the product uses precomputed
aggregations, compact row-level data, or a combination of both. That
decision must preserve the ability to filter by several scenario
conditions together.

#### DR-2. Versioned exports

Every export consumed by the product must have an identifiable version
and export date.

Downloads and displayed results must identify the data-export version
from which they were produced. This allows users to determine the data
vintage behind a result and supports reproducibility when exports are
updated.

The product's data-preparation process must support committed,
versioned app artifacts because continuous integration cannot rebuild the
full local data pipeline from its raw inputs.

### 6.2 Population and measurement rules

#### DR-3. One-state-per-trial population

The one-state-per-trial population required by FR-S6 must be implemented
as a tested pipeline view before the product uses it.

When a slip window is active, the view must retain one record per
simulation trial: the record at the highest slip value within the
selected window.

When no slip window is active, the view must retain the actual final
state of each trial.

The current Tableau-only calculation for this rule must not be the sole
definition used by the product. The pipeline implementation must be
tested against the published data export, including the expected count
of 3,434 trials and the absence of ties at each trial's maximum slip.

#### DR-4. Measurement hygiene

The data pipeline must define and document a consistent policy for:

- null measurements, where the automated measurement process did not
  produce a value;
- small negative values of scarp height or scarp dip; and
- low-slip records for which the research group has identified possible
  measurement-reliability limitations.

The product must apply this policy consistently in displays, statistics,
and downloads. It must explain any exclusions or caveats in reader-facing
language where they affect interpretation.

The research group must decide whether the recovered per-scarp-type
low-slip reliability cutoffs are:

- applied automatically;
- offered as a visible user control; or
- documented without filtering the displayed population.

The PDD must not make this decision implicitly.

#### DR-5. Field-data preparation

Field-event names must be normalized in the data pipeline before they
appear in event-labeled displays or downloads.

Normalization must correct known variations such as spelling variants,
inconsistent punctuation, and invisible trailing characters. The
pipeline must retain source-specific identifiers and provenance so that
field measurements remain traceable to their original datasets.

### 6.3 Product-data delivery constraints

#### DR-6. Payload and interaction support

The scenario page must use data exports small enough to support the
performance requirements in NFR-3.

The initial page load must not require downloading the existing 73 MB
flat simulation export or another comparably large payload. The product
must avoid a visible, prolonged loading phase on repeat visits.

The PDD must define the numeric initial-payload budget. The HLDD must
define the export format, caching approach, and any precomputation needed
to meet that budget without preventing the combined scenario filtering
required by the MVP.

#### DR-7. Future 3D compatibility

The first release uses the published 2D simulation ensemble only.
However, new product data models and exports must not hard-code
assumptions that would make later inclusion of the research group's
on-hold 3D simulation arm unnecessarily difficult.

Where practical, new exports must carry a source, model-family, or case
dimension that can distinguish 2D and future 3D records without changing
the meaning of existing fields.

## 7. Content requirements

Ground Rupture Explorer must use language that is useful to engineers
without claiming more certainty, applicability, or authority than the
research supports.

### 7.1 Product language

#### CR-1. Describe the product accurately

The product must describe its results as conditional results from a
computer-simulation ensemble.

Preferred wording includes:

- “conditional distributions of simulated surface-rupture measurements”;
- “results from computer simulations matching the selected scenario”;
- “modeled scarp height, deformation-zone width, and scarp dip”;
- “screening-level information for site investigation and design review”;
- “bracketing uncertainty in the site conditions”; and
- “the range of results produced by matching simulations.”

The product must distinguish clearly between:

- **site-condition uncertainty** — uncertainty or variation in the
  inputs selected by the user; and
- **variation in the simulations** — the spread of measurements among
  simulations that match those inputs.

#### CR-2. Avoid unsupported claims

The product must not describe itself or its results using language that
implies probability-based hazard analysis, site-specific prediction,
regulatory approval, or a design recommendation.

Avoid terms such as:

- “hazard assessment” or “fault-displacement hazard,” when describing
  the product itself;
- “forecast” or “quantitative forecast”;
- “annual probability”;
- “return period”;
- “design displacement”;
- “predicted displacement at your site”;
- “safe”; or
- language implying compliance with a regulation or standard.

The product may explain these concepts when needed to distinguish its
scope from other methods, such as probabilistic fault-displacement
hazard analysis (PFDHA).

#### CR-3. Use terms consistently

The product must use the following distinctions consistently:

| Use this term | Meaning |
|---|---|
| **Fault slip at depth** | The displacement applied to the fault in the computer simulations. |
| **Anticipated vertical surface offset** | A user-provided scenario value that may be converted to fault slip at depth for the purpose of querying the simulations. |
| **Simulated surface-rupture measurement** | A value measured from a computer simulation, such as scarp height, deformation-zone width, or scarp dip. |
| **Field measurement** | A measurement recorded after a real, past earthquake. |
| **Modeled scarp type** | A classification assigned to a simulation result; it is an outcome of the simulation, not a site input. |
| **Principal rupture band** | The main modeled strip of ground disturbed by rupture. |
| **Deformation-zone width** | The width of the main modeled strip of disturbed ground. It does not represent every separate deformation strand that may occur in a real earthquake. |

The product must spell out **distinct element method (DEM)** at first use
in reader-facing content. It must not assume that readers interpret DEM
correctly, because many engineers use the abbreviation for “digital
elevation model.”

### 7.2 Disclaimers and professional-use boundaries

#### CR-4. Standing disclaimer

The scenario page and other relevant product surfaces must display a
reader-visible disclaimer. The disclaimer must state that:

1. the product is a research tool and may be revised;
2. the product is provided without warranty, subject to the project's
   stated liability limitations;
3. the product does not provide earthquake occurrence rates, annual
   probabilities, return periods, probability-of-exceedance results,
   site-specific predictions, or a probabilistic fault-displacement
   hazard analysis; and
4. results must be interpreted by qualified professionals using
   appropriate site investigation, applicable regulations, and relevant
   engineering guidance.

The disclaimer must be easy to find from the scenario page. A short
version may appear near the results, provided that it links or expands
to the complete statement.

#### CR-5. Statistics and design-value language

Where the product displays percentiles or other summary statistics, it
must state that they describe the matching simulation records.

The product may explain that the median is a typical result in the
matching simulations and that the 84th percentile is a commonly used
higher fractile in deterministic engineering practice.

The product must not state or imply that any statistic is the correct,
required, or recommended design value. Selection of a design value
remains the responsibility of the engineer of record.

#### CR-6. Field-data comparison language

Where field measurements from past earthquakes are displayed alongside
simulation results, the product must label them as:

> **Analogous, not identical**

The product must explain that field measurements and simulated
measurements can represent related but non-identical quantities. It must
also identify the relevant field-data source and preserve the distinction
between field measurements and computer-simulation results.

### 7.3 Reader guidance and supporting material

#### CR-7. Glossary and plain-language support

Reader-facing content must use plain language where possible and link
specialist terms to the project glossary when they first appear.

Priority glossary terms include:

- scarp height;
- deformation-zone width;
- scarp dip;
- fault dip;
- fault slip;
- sediment strength;
- cohesion;
- scarp type;
- back-projection; and
- distinct element method.

Where the glossary does not yet define a necessary term, the product must
either provide a short in-context explanation or add a glossary entry
before relying on the term.

#### CR-8. Reader-visible caveats

Important scientific limitations must appear where they affect
interpretation. They must not be relegated only to technical
documentation or a general disclaimer.

At a minimum, the product must present:

- the provisional-data notice for scarp dip;
- the explanation of the selected simulation population;
- warnings for small, empty, or partly out-of-range result sets;
- the limitation that deformation-zone width represents the main modeled
  rupture zone rather than every possible distributed rupture strand;
  and
- the warning that a slip-to-magnitude display is a derived relabeling,
  not an independently modeled magnitude or a site-specific estimate.

#### CR-9. Citation and sourcing language

Scientific claims about the simulation ensemble must cite the research
paper. Claims about the data archive must cite the relevant DesignSafe
deposit. Claims about the product's data preparation or software
behavior must cite the project's own versioned documentation where
appropriate.

The product must retain the established instruction to cite the research
paper, rather than the website alone, when users cite the scientific
work.

## 8. Non-functional requirements

### 8.1 Access, hosting, and privacy

#### NFR-1. Free public access

Ground Rupture Explorer must be free to use. It must not require a login,
user account, subscription, or payment.

The product must not add product-specific visitor tracking. It may remain
subject to the analytics or logging already provided by its public host.

#### NFR-2. Static-site hosting

The product must be deployable as part of the project's public static
website, published from the repository's `main` branch through GitHub
Pages.

The MVP must not require server-side computation, a database service, or
a private backend. Scenario filtering and statistics must therefore be
implemented using published client-side data and code, within the
performance requirements below.

The product shares the existing site's URL space, navigation, build, and
deployment process.

### 8.2 Performance and supported environments

#### NFR-3. Responsive interaction

Changes to scenario controls must update the displayed results without a
perceptible delay during normal use.

The product must avoid large initial downloads and prolonged visible
loading phases, especially on repeat visits. It must not require users
to download a browser-based Python runtime or a comparably heavy
execution environment before they can use the scenario page.

The PDD must define numeric performance budgets for:

- initial data payload;
- first meaningful render; and
- 95th-percentile time from a scenario change to updated results.

The product must meet those budgets under the test conditions defined in
the PDD.

#### NFR-4. Supported environments

The scenario page must work in current evergreen browsers, using a
defined baseline of approximately the most recent two years of browser
versions.

The product is not required to support legacy browsers.

It must remain usable on the project's supported mobile layouts and on a
laptop in a field-office setting. Essential information and controls must
not rely on hover alone.

The PDD must define the exact supported-browser baseline.

### 8.3 Accessibility and resilience

#### NFR-5. Accessibility

The product must provide:

- keyboard-operable controls;
- visible keyboard focus;
- text alternatives for charts;
- an accessible statistics table containing the information needed to
  interpret each chart;
- text identification in addition to color, as required by FR-G2; and
- labels, units, and warnings that can be understood without relying
  solely on visual layout.

Visitors who use the site without JavaScript must receive honest fallback
content. The page must explain that the interactive scenario explorer
requires JavaScript and provide access to relevant non-interactive
content, such as the paper, data archive, dashboards, glossary, and
limitations. It must not present a blank or misleading page.

### 8.4 Licensing and publication rights

#### NFR-6. Licensing

The product must preserve the project's existing licensing model:

- application code under Apache-2.0;
- page prose under CC BY 4.0; and
- research-paper figures used under the publisher's applicable
  author-sharing terms, including any restrictions on commercial use,
  modification, and required attribution.

Third-party photographs and other externally owned media must not be
included in a public release until the required permissions are
confirmed.

### 8.5 Quality and release process

#### NFR-7. Build and data-quality gates

The project's strict site build must remain green. The build must fail on
warnings or broken links according to the repository's existing quality
rules.

Reader-visible derived values must be tested against controlled
reference results from the data pipeline, as required by DR-1.

Changes to reader-visible assets must follow the project's cache-busting
convention so that users do not receive stale files from browser or CDN
caches after a release.

The existing dashboards, citation material, navigation, and deployment
process must remain functional after each release.

#### NFR-8. Architecture decision record

The technical platform decision for Ground Rupture Explorer must be
recorded in an architecture decision record (ADR).

The ADR must document whether the scenario page and related surfaces use
a native implementation, embedded dashboards, links to existing
dashboards, or a hybrid approach. It must also record any new toolchain
introduced into the repository and how that decision relates to the
project's existing architecture decisions.

## 9. Dependencies and risks

The following dependencies and risks could affect scope, scientific
credibility, delivery, or release timing.

### 9.1 Scientific and data dependencies

| ID | Dependency or risk | Impact | Owner / decision-maker | Planned response |
|---|---|---|---|---|
| **R-1** | Authoritative `Convert_Scarp_Dip` correction is not yet available. | Scarp-dip results remain provisional; this affects a primary MVP output. | Harvard Structural Geology & Earth Resources Group | Show the reader-visible caveat required by FR-O4 until the corrected rule or data column is available. |
| **R-2** | The meaning and values of the letter-coded cohesion profiles are not fully documented. | Limits the advanced sediment-strength refinement described in FR-S2. | Harvard Structural Geology & Earth Resources Group | Do not make letter-coded profiles a primary MVP control. Add them only after the group provides definitions, geometry, and approved labels. |
| **R-3** | The appropriate treatment of unreliable low-slip measurements is unresolved. | Could affect scenario results at small displacement values. | Harvard Structural Geology & Earth Resources Group | Record the decision in the PDD: apply the per-scarp-type cutoffs automatically, expose them as a control, or document the limitation without filtering. |
| **R-4** | The Kern County worked example has two possible field-data groups with different meanings. | The example could be misleading if it mixes or mislabels field-width data. | Harvard Structural Geology & Earth Resources Group | Before release, select the source group for the example and define any rule used to identify principal-rupture widths. |
| **R-5** | The field measurements shown for context are analogous to, but not always identical with, the simulation measurements. | Users may overinterpret an overlay as a direct like-for-like comparison. | Product owner, with research-group review | Preserve source-specific labels, use the required “Analogous, not identical” language, and keep field measurements visually distinct from simulations. |
| **R-6** | The simulation ensemble represents 2D models only; a 3D research arm is on hold. | A 2D-only data design could make later 3D support expensive. | Product owner and architect, with research-group guidance | Meet DR-7 by carrying a model-family or source dimension in new data exports where practical. |

### 9.2 Scope and product dependencies

| ID | Dependency or risk | Impact | Owner / decision-maker | Planned response |
|---|---|---|---|---|
| **R-7** | The proposed P1 scope may expand toward rebuilding the five existing dashboards. | MVP delivery could be delayed by work that does not address the core scenario-query gap. | Product owner | Apply the reuse-first principle in §2.3 and FR-G5. A native replacement requires a documented unmet user need. |
| **R-8** | The research group has not approved a magnitude-to-slip conversion for use as an input. | “Anticipated earthquake magnitude” cannot be offered as a scenario input. | Harvard Structural Geology & Earth Resources Group | Limit magnitude to the existing derived display aid and warning until an approved conversion and uncertainty statement are available. |
| **R-9** | Inverse search may be scientifically useful but could be misunderstood as site-parameter inference. | Could create an unsupported product claim or distract from the MVP. | Product owner, with research-group review | Keep inverse search as P2. If implemented, use the safeguards in FR-X2 and describe results only as simulation conditions consistent with an observation. |
| **R-10** | The fourth output, additional uplift (Us − Ud), has not been prioritized. | Scope uncertainty in the results page. | Product owner, with research-group input | Treat it as P2 unless a decision promotes it to the MVP. |
| **R-11** | The name and public entry point for the product are not fully settled. | May affect navigation, documentation, and user expectations. | Product owner and research group | Resolve the product name and whether the scenario page is a primary site page or a distinct app entry point before detailed design. |

### 9.3 Content and media dependencies

| ID | Dependency or risk | Impact | Owner / decision-maker | Planned response |
|---|---|---|---|---|
| **R-12** | Public permission for third-party earthquake photographs is unresolved. | The morphology page cannot publicly include those photographs until rights are confirmed. | Harvard Structural Geology & Earth Resources Group | Keep photographs out of public releases until permission is documented. Model snapshots and approved media can ship independently. |
| **R-13** | The supplied animations do not necessarily cover all six scarp types. | The morphology page and scenario-linked animation feature may be incomplete. | Harvard Structural Geology & Earth Resources Group | Decide whether all six types are required before FR-E1 and FR-D4 ship. Do not imply complete coverage when only some animations exist. |
| **R-14** | Animated media explaining the measurement process may not be available. | Limits the richness of FR-E2 but not the core explanation. | Harvard Structural Geology & Earth Resources Group | Ship a text-and-figure explanation first; add approved animation later if supplied. |
| **R-15** | Approved URLs for the research group's DEM and machine-learning code repositories are pending. | The P3 contact page cannot include complete repository links. | Harvard Structural Geology & Earth Resources Group | Treat the links as optional until approved URLs are supplied. |

### 9.4 Delivery and technical risks

| ID | Dependency or risk | Impact | Owner / decision-maker | Planned response |
|---|---|---|---|---|
| **R-16** | Combined scenario filtering requires enough detail to support arbitrary filters, but the static site has a strict payload budget. | A large client-side data payload could make the product slow or unusable. | Architect / HLDD | Evaluate compact row-level exports, precomputation, caching, and hybrid data structures. Meet DR-6 and NFR-3 without weakening required filtering. |
| **R-17** | Continuous integration cannot rebuild the full pipeline because raw inputs are local-only. | App data could become stale or untraceable if refreshes are informal. | Product owner and build-design owner | Commit versioned app-ready data artifacts and document the owner-controlled refresh process. Show export versions in the product and downloads. |
| **R-18** | The scenario page shares a single GitHub Pages site, URL space, build, and deploy job with the existing website. | A failure in the new product could disrupt the published site or dashboards. | Product owner and architect | Preserve strict build and deployment gates; test navigation, dashboard links or embeds, citation material, and the full Pages deployment before release. |
| **R-19** | The static-site constraint prohibits server-side computation. | Some implementation approaches may be infeasible or perform poorly. | Architect / HLDD | Record the platform decision in an ADR and validate the proposed client-side approach against the MVP performance budget early. |

### 9.5 Decisions required before detailed design

The following decisions must be resolved, or explicitly deferred with a
documented interim rule, before the PDD is complete:

1. Whether P1 is the agreed MVP and release target.  (Yes)
2. The product name and site entry point.  (Name is defined, URL is 
   deferred)
3. The multi-dip behavior of the surface-offset-to-slip assist.
4. The low-slip measurement-reliability policy.
5. The scarp-dip correction status and release treatment.
6. The Kern County field-data group and principal-width definition.
7. The definition of dominant scarp type for animation recommendations.
8. The scope of animation coverage required for public release.
9. The numeric performance and payload budgets.

I would defer 3-9.