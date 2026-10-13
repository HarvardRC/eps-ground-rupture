# Scenario Explorer — product requirements document

- **Status**: Draft for review
- **Date**: 2026-10-13
- **Author**: Michael Bouzinier, with Claude
- **Stage**: 1 of 3 — this PRD → the **product definition document
  (PDD)** → the **high-level design document (HLDD)**, each reviewed
  before the next is drafted. This document says *what* and *why*;
  platform and architecture choices are deliberately absent (they belong
  to the HLDD and an ADR — an architecture decision record, the repo's
  numbered log of technology choices).
- **Working title**: "Scenario Explorer." A name is an open question
  ([OQ-1](#11-open-questions)); whatever wins must not promise a hazard
  analysis the data cannot deliver (see [Language](#language)).

## How to read this document

Requirements and decisions carry short identifiers. Each family is
defined in one section and cited everywhere else; a citation that
precedes its section (FR-S5 in §1, for example) is a forward reference,
not an undefined term.

| Id | Meaning | Defined in |
|---|---|---|
| C1–C11 | Capabilities: what the product does, each mapped to a mockup surface and an existing asset | [§2, Capability map](#capability-map) |
| P1 / P2 / P3 | Build-order priority tiers; P1 is the proposed v0.3 slice | [§2, under the map](#capability-map) |
| FR-S/O/D/X/E/G + n | Functional requirements, grouped by letter: **S**cenario inputs, **O**utputs, **D**ownloads, sharing/inverse search (**X**), **E**ducation, **G**eneral display rules | [§5](#5-functional-requirements) |
| DR-1…7 | Data requirements | [§6](#6-data-requirements) |
| NFR-1…8 | Non-functional requirements | [§8](#8-non-functional-requirements) |
| SC-1…7 | Success criteria | [§10](#10-success-criteria) |
| OQ-1…9 | Open questions, each with a named decider | [§11](#11-open-questions) |

Domain terms (fault, scarp, slip…) link to the site's
[glossary](https://harvardrc.github.io/eps-ground-rupture/glossary/) at
first use. Project-infrastructure terms (the pipeline, pinned exports,
the strict build…) are glossed inline where they first appear; ids are
hyperlinked where linking helps and plain elsewhere. A **bracket**
throughout is a user-chosen min–max range on one input. The **mockup**
cited throughout is the author team's GUI mockup, described with its
five numbered goals in [§12](#12-source-material).

## 1. Problem

### What exists today

Three public artifacts carry this research, and this document refers to
them throughout:

- **The paper** — Chiama et al. (2025), *Earthquake Spectra* 41(5),
  3977–4014 (DOI
  [10.1177/87552930251346434](https://doi.org/10.1177/87552930251346434)):
  a 2D [distinct element method (DEM)](https://harvardrc.github.io/eps-ground-rupture/glossary/#dem) ensemble simulating a
  [thrust or reverse fault](https://harvardrc.github.io/eps-ground-rupture/glossary/#thrust-reverse) — one where the ground
  on one side is pushed up and over the other — rupturing through
  sediment, driven by [*slip*](https://harvardrc.github.io/eps-ground-rupture/glossary/#slip): how far the two sides of the
  fault slide past each other at depth. 3,434 experiments recorded at
  101 [slip stages](https://harvardrc.github.io/eps-ground-rupture/glossary/#model-stage) each give 346,834 model states,
  with each surface output successfully measured on roughly
  330,000–333,000 of them ([open full
  text](https://par.nsf.gov/servlets/purl/10644518) for readers
  without journal access).
- **The data deposits** — on DesignSafe, the natural-hazards
  engineering data repository funded by the NSF (the US National
  Science Foundation): project PRJ-4680 (DOIs
  [10.17603/ds2-xpq0-gw80](https://doi.org/10.17603/ds2-xpq0-gw80)
  [homogeneous](https://harvardrc.github.io/eps-ground-rupture/glossary/#set) — uniform sediment,
  [10.17603/ds2-gfsj-pp60](https://doi.org/10.17603/ds2-gfsj-pp60)
  heterogeneous — internally varied sediment): the archived model
  outputs. DesignSafe hosts the files but offers no exploration GUI,
  and the author team wants an external site to carry that function
  and reference the deposit.
- **The site** — <https://harvardrc.github.io/eps-ground-rupture/>, the
  website maintained in this repository (built with MkDocs, a Python
  static-site generator), which republishes the dataset as five
  interactive dashboards on Tableau Public, Tableau's free
  dashboard-hosting service:
    - [Model vs reality][] — every simulated measurement as a cloud,
      with measurements from real earthquakes scattered over it: does
      the model cover reality?
    - [Response curves][] — how each surface measurement grows as slip
      accumulates, and which conditions change that relationship; home
      of the optional axis that relabels slip as an equivalent
      [earthquake magnitude](https://harvardrc.github.io/eps-ground-rupture/glossary/#magnitude), with its warning that the
      relabeling is not a measurement.
    - [Per-event boxplots][] — the variability of field measurements
      within each real earthquake, against the model's range (the
      [boxplot vocabulary](https://harvardrc.github.io/eps-ground-rupture/glossary/#iqr) is in the glossary).
    - [Slip regression][] — the fitted law linking slip on the fault
      to vertical displacement at the surface; run backwards, it
      estimates the slip behind a measured offset.
    - [Distributions & summary statistics][] — the spread of each
      output across all simulations, which input shifts it, and
      typical values for each [scarp](https://harvardrc.github.io/eps-ground-rupture/glossary/#scarp) type (the model sorts
      surface breaks into [six classes](https://harvardrc.github.io/eps-ground-rupture/glossary/#scarp-classes)).

Below, "the site" and "the dashboards" are names for these.

### Who arrives, and what they are deciding

A geotechnical engineer — the specialist in soil, rock, and
foundations — is handed a site that a thrust or reverse fault crosses
(a dam foundation, a pipeline or road alignment, a planned facility)
and must put a defensible answer into a siting or design report. The
report turns on three decisions:

- **Avoid** — can the footprint (or its critical components) be
  placed clear of the ground that will break, and how much clearance
  does that take?
- **Accommodate** — where crossing is unavoidable, how much ground
  offset, spread over what distance and arriving in what shape, must
  the design survive?
- **Investigate further** — is current knowledge of the ground enough
  to commit a design, or do the plausible outcomes vary so widely that
  more drilling or trenching (exploratory excavation across the fault)
  must come first?

A site investigation gives the engineer three inputs, each
approximate: how steeply the [fault dips](https://harvardrc.github.io/eps-ground-rupture/glossary/#fault-dip), what the
near-surface sediments are (their strength, their density, and how
deep they run before bedrock), and how much displacement the fault
could produce — estimated as slip on the fault at depth or as offset
at the surface, two related but different numbers. These are the same
kinds of parameters the ensemble varies, over its modeled ranges (dips
20–70°, sediment 3–10 m deep, slip to ~5 m); when a site's bracket
falls partly outside those ranges, the product must say so rather than
silently clip — a rule the
functional requirements enforce
([FR-S5](#scenario-inputs-c1--p1), the displacement-window requirement
whose assist converts a surface offset to slip and flags out-of-range
values).

### What they need, and how they will use it

To feed those three decisions, the engineer needs the ensemble's three
headline surface-outcome measurements under their site's conditions —
each for a specific use:

- **[Scarp height](https://harvardrc.github.io/eps-ground-rupture/glossary/#scarp-height)** — the *accommodate* number. Where rupture reaches
  the surface, one side of the ground rides up over the other and
  leaves a step: the scarp. Scarp height is that step's size — the
  vertical component of the offset anything crossing the rupture must
  survive (at these fault dips the accompanying horizontal shortening
  is comparable, and it is not an ensemble output, so the product
  delivers the vertical piece only). It is the differential crest
  movement a dam must ride out where a fault crosses it — the number
  behind defensive allowances such as extra freeboard (spare crest
  height above the water line) against crest disruption, and wide
  filter zones (graded sand-and-gravel layers that keep seepage from
  washing out a cracked core) against offset-induced cracking —
  the step that breaks a road or rail grade, the rise of one end of a
  foundation relative to the other.
- **[Deformation zone width (DZW)](https://harvardrc.github.io/eps-ground-rupture/glossary/#dzw)** — the *avoid* number. The break is
  not a knife line: around the step lies a band of warped, cracked,
  bulged ground, and DZW is that band's full width — the stretch of
  ground a footprint must clear to stand beyond the disturbance. It
  spans the disturbed ground from its first sign on the uplifted side
  across to the scarp's base on the other — a width, not a setback (a
  required building-free distance measured out from the fault trace —
  the line where the fault meets the surface). Setback practice is
  built on widths of this kind: New Zealand's
  [Fault Avoidance Zones](https://gis.gns.cri.nz/server/rest/services/Active_Faults/NZActiveFaultDatasets/MapServer/7/iteminfo)
  wrap the mapped deformation zone plus a buffer, California's
  [Alquist-Priolo zones](https://www.conservation.ca.gov/cgs/alquist-priolo)
  trigger the fault investigation from which a setback is then set,
  and for a lifeline — a pipeline, road, or utility line — that
  cannot avoid crossing, DZW sets the length over which the special
  crossing design must run (longer for an oblique crossing). One
  scope line belongs here: the ensemble's DZW is the width of the
  [principal rupture](https://harvardrc.github.io/eps-ground-rupture/glossary/#principal-rupture) band. Real events can also
  break on scattered strands (separate, roughly parallel breaks of the
  same fault) far outside it — [field compilations](https://harvardrc.github.io/eps-ground-rupture/glossary/#the-field-counterparts)
  record widths to 1,450 m where the model tops out near 46 m — so
  the avoid decision pairs this number with fault-trace mapping; the
  product supplies the principal band only.
- **[Scarp dip](https://harvardrc.github.io/eps-ground-rupture/glossary/#scarp-dip)** — the steepness of the scarp face itself (not the
  fault's dip at depth); the shape qualifier on both numbers above.
  The same offset can arrive at the surface as a near-vertical step
  or as a long, gentle ramp, and the demand on a structure differs in
  kind: a steep scarp delivers the offset as a discrete break through
  whatever crosses it, while a gentle one delivers the same offset as
  tilt and curvature spread over distance — which a structure may be
  able to tolerate or
  regrade. Scarp dip says which kind of demand to design for, and
  whether the field expression will be an obvious step or subtle
  warping.

And they need each **as a distribution, not a single number**, for two
reasons the ensemble was built to expose:

1. *The inputs are ranges.* "Dip about 30–40°, strong sediments, up
   to 3 m of offset at the surface" is what an investigation yields.
   The honest question is: across every modeled condition consistent
   with that bracket, what outcomes occurred? — with the displacement
   window bounding which model stages count. Whether that means every
   stage inside the window or only each trial's last stage inside it —
   and where the window's lower bound sits, not just its cap — changes
   the percentiles (scarps grow as slip accumulates, so pooling every
   early stage pulls them down). The product must label that
   population choice; [FR-S6](#scenario-inputs-c1--p1) defines the two
   populations.
2. *Identical descriptions do not produce identical scarps.* Within
   the ensemble's heterogeneous arm (its layered-sediment branch,
   [`Set`](https://harvardrc.github.io/eps-ground-rupture/glossary/#set)), ten random layer realizations of
   one nominal profile — same depth, same density, metre-scale layer
   strengths drawn from the same range — produced different surface
   outcomes: sites identical in every descriptor a site report would
   quote, differing only in a layer sequence no investigation pins
   down along the full length of a crossing. A site characterized to
   class level still carries a spread.

Practice consumes distributions through percentiles — the median as
the typical case, the 84th as the conventional conservative fractile
(a percentile written as a fraction) in deterministic practice (design
to fixed scenario values rather than to occurrence probabilities;
cited in [Source material](#12-source-material)). The product reports
these as fractiles of the filtered ensemble, quotable with provenance;
choosing a design value from them stays with the engineer of record —
the licensed engineer who signs and is legally responsible for the
design ([Non-goals](#non-goals)). The spread itself is also a decision
input: outcomes running from negligible to severe under one bracket
argue for narrowing the inputs (more investigation) before committing
a design; a tight spread lets the design proceed.

### The gap

None of the three artifacts delivers that today:

- the **paper** is static — its figures answer the authors' questions
  at the authors' chosen cuts;
- the **deposits** are raw archives — answering "given my site…" means
  downloading them and writing one's own filtering and statistics;
- the **dashboards** answer the *paper's* questions (which parameter
  shifts which distribution; how the model compares to field
  compilations). None answers the *engineer's* — "given my site, what
  did the ensemble do?" — because none lets an engineer set a
  conjunctive (all filters applied together, AND-combined),
  engineering-vocabulary bracket and then read percentiles of — or
  download — exactly that bracketed subset.
  [Distributions & summary statistics][] comes closest and shows the
  shape of what is missing: it colors by one parameter at a time and
  cannot hold dip, sediment strength, and a displacement window fixed
  together.

### How the engineer answers this today

The as-is workflow, compressed from the governing guidance (each
artifact linked; US practice, with New Zealand as the notable
alternative regime):

1. **Screening.** Does a mapped active fault touch the project? In
   California, the state's
   [EQ Zapp](https://www.conservation.ca.gov/cgs/geohazards/eq-zapp)
   zone map answers it — inside an
   [Alquist-Priolo zone](https://www.conservation.ca.gov/cgs/alquist-priolo)
   a fault investigation is mandatory before a permit. Elsewhere, the
   [Quaternary Fault and Fold Database](https://www.usgs.gov/programs/earthquake-hazards/faults)
   of the USGS, the US Geological Survey.
2. **Desk study.** The fault's public record: that database entry
   (slip rate as one of four bins, a dip *direction* but no dip
   angle), geologic maps, lidar, prior consultant reports. For thrust
   and reverse faults the record is thinner than for strike-slip
   faults (the sideways-sliding kind, like the San Andreas) — the
   trace often hides as a fold or warp rather than a clean break.
3. **Site investigation.** A licensed geologist maps the ground, digs
   trenches across the suspected trace, and logs the sediments with
   borings and cone soundings (probes pushed into the ground to profile
   its strength); the California Geological Survey's
   [Special Publication 42](https://www.conservation.ca.gov/cgs/publications/sp42)
   is the practice guide. A trench shows what *past*
   ruptures did at that exact spot; extrapolating to the next event is
   judgment.
4. **Scenario definition.** Fault dimensions become a design magnitude
   and displacement through empirical scaling relations —
   [Wells & Coppersmith (1994)](https://central.scec.org/node/3035),
   and for reverse faults
   [Moss & Ross (2011)](https://authors.library.caltech.edu/94907).
   Here the slip-at-depth vs. offset-at-the-surface distinction first
   bites, and practice has no standard conversion between the two —
   the gap FR-S5's assist fills with the ensemble's own regression.
5. **Hazard quantification.** Routine projects stop at a judged
   deterministic number. Critical facilities run a **PFDHA** —
   probabilistic fault displacement hazard analysis
   ([Youngs et al. 2003](https://pubs.usgs.gov/publication/70025970)),
   today via the free
   [FDHI (Fault Displacement Hazard Initiative) model suite](https://www.risksciences.ucla.edu/nhr3/fdhi/models)
   and its [fdhpy web tool](https://asarmy.github.io/fdhpy-webtool).
   These return displacement *amplitude* against occurrence — never
   what the rupture looks like, and conditioned on nothing
   geotechnical.
6. **Deformation-zone geometry — the central judgment.** How wide is
   the disturbed band, how high the step, sharp break or broad warp,
   split how across the fault? Today's sources: thrust case-history
   tables ([Boncio et al. 2018](https://nhess.copernicus.org/articles/18/241/2018/),
   eleven earthquakes, proposing 840 m as a precautionary zone width
   for basic studies), the
   [FDHI field database](https://www.risksciences.ucla.edu/girs-reports/2021/08),
   New Zealand's mapped
   [Fault Avoidance Zones](https://gis.gns.cri.nz/server/rest/services/Active_Faults/NZActiveFaultDatasets/MapServer/7/iteminfo),
   figures read out of journal papers — prominently
   [Chiama et al. (2023)](https://par.nsf.gov/biblio/10514401) and the
   2025 ensemble paper itself — or a senior colleague's judgment.
   **This is the step the product serves.** No queryable reference
   exists, and two competent engineers can defend materially different
   widths from the same thin evidence.
7. **Engineering response.** Occupied buildings: avoid (the setback).
   Pipelines that must cross: strain-based design per the US guideline
   lineage of ASCE (the American Society of Civil Engineers), ALA (the
   American Lifelines Alliance), and PRCI (the Pipeline Research
   Council International). Dams: the seismic-hazard guideline of FERC,
   the US federal hydropower regulator (its Engineering Guidelines
   Chapter 13), frames the hazard, and the defensive design itself
   follows ICOLD, the international large-dams commission. Each
   response needs the offset's *shape and width*, not just its size —
   the three quantities above.
8. **Report and review.** A licensed professional signs the numbers;
   a reviewer tests them against the same scarce evidence base the
   author used. A citable, queryable reference changes both sides of
   that exchange.

**Notable alternative workflows.** (a) *Prescriptive avoidance only* —
zoning plus setback, no displacement number at all; the cheap default
for ordinary buildings, where ensemble-type evidence would enter
upstream, when the zones are drawn. (b) *Full PFDHA* — for critical
facilities; it consumes rather than competes with this dataset
(amplitude from the empirical models, morphology from the ensemble).
(c) *Bespoke numerical modeling* — commission a one-off simulation of
the site (engines and costs below); the ensemble is this workflow
industrialized — thousands of such models, pre-computed and queryable.
(d) *Judgment and precedent* — the fallback layer inside all of the
above, and the workflow the scenario page most directly upgrades.

### Adjacent products, and why the gap persists

A landscape scan (2026-10-13, extended web search) found **no direct
competitor**: no tool, free or commercial, conditions surface-rupture
outcomes on geotechnical variables or outputs scarp height,
deformation-zone width, or scarp class.

- **Free, adjacent, different question.** The
  [fdhpy web tool](https://asarmy.github.io/fdhpy-webtool) and
  [package](https://github.com/asarmy/fdhpy) (MIT-licensed) and the
  [FDHI reference implementations](https://www.risksciences.ucla.edu/nhr3/products/fdhi)
  (Python, Excel) return displacement amplitude from magnitude, style,
  and position along the rupture — no sediment, no dip, no morphology.
  The fdhpy web tool — free, static, client-side, republishing
  published models — is also the delivery-pattern precedent this
  product follows.
- **Hazard portals ship shaking, not rupture.** The
  [USGS Earthquake Hazard Toolbox](https://earthquake.usgs.gov/nshmp/),
  the applications of [OpenSHA](https://opensha.org/Applications) (the
  open-source seismic-hazard platform), and the
  [web app of New Zealand's National Seismic Hazard Model (NSHM)](https://nshm.gns.cri.nz/)
  — by GNS Science, NZ's geoscience agency — carry no
  fault-displacement product at all.
- **Raw data without a tool.** The
  [FDHI field database](https://www.risksciences.ucla.edu/girs-reports/2021/08)
  (75 earthquakes, >40,000 measurements — none with recorded
  subsurface sediment properties) and the
  [SURE (SUrface Ruptures due to Earthquakes) database](https://zenodo.org/records/6326856):
  the empirical feedstock, analysis left to the reader.
- **Adjacent consumer, not rival.**
  [OpenSRA](https://peer.berkeley.edu/opensra-home1) (free; built by
  PEER, the Pacific Earthquake Engineering Research center, for the
  California Energy Commission) assesses gas-network seismic risk by
  *consuming* fault-displacement models — a potential consumer of this
  product's outputs.
- **The bespoke tier** — today's only route to a geotechnically
  conditioned answer — prices as a consulting engagement. The posted
  software alone:
  [PLAXIS](https://www.bentley.com/en/products/plaxis-3d/) $4,450 (2D)
  to $22,000 (3D suite) per seat-year (Bentley's posted prices,
  checked 2026-10-13); Abaqus ≈ $17,200/year lease
  ([reseller-posted](https://www.goengineer.com/guide-to-buying-abaqus-fea);
  the vendor itself quotes only); and Itasca's
  [PFC](https://itascasoftware.com/products/pfc/) — the very code the
  ensemble ran on (the paper names PFC2D v7) — posts no public price
  at all. Add specialist weeks per site. The paper reports roughly
  20,000 CPU-hours and ~27 TB of model output
  ([open full text](https://par.nsf.gov/servlets/purl/10644518)); the
  barrier is less the compute than the 3,434 calibrated experiments
  and the measurement pipeline behind them — specialist effort no
  single siting project buys.

So "are competitors too expensive?" splits cleanly: the free tools are
free but answer a different question; the only route that answers
*this* question is a bespoke study, and its cost is precisely the
problem the product removes at screening level.

**Why has no one built it?** The evidenced reasons, strongest first:

1. *The enabling data is new.* A physics ensemble dense enough to
   condition on geotechnical variables reached a public archive only
   in 2024–2025 — the suite grew from 45 experiments
   ([the 2023 study](https://par.nsf.gov/biblio/10514401)) to 3,434.
   Until months before this project, there was nothing to serve.
2. *Codified practice structurally cannot get there from field data.*
   The FDHI compilation records remote-sensing terrain metrics and a
   mapped surficial-unit class (bedrock vs. alluvium) — not measured
   sediment strength, density, or depth — so the empirical models
   built on it take magnitude and position, never ground conditions. The research
   community itself lists integrating physics models with geotechnical
   properties as an open challenge
   ([QuakeCoRE white paper, 2024](https://www.naturalhazards.govt.nz/assets/Publications-Resources/QuakeCoRE-FDHA.pdf)).
3. *The paying demand is a buyers' club that funds open tools.* The
   FDHI program was sponsored by PG&E, Caltrans, California
   High-Speed Rail, SoCalGas, LADWP, and the California Energy
   Commission; the same pattern produced OpenSRA. Demand exists, but
   it routes through research sponsorship rather than product
   purchases — which suggests no commercial opening, and is why this
   lane suits a free academic site.
4. *The compliance workflow runs through licensed professionals*, with
   avoidance the default remedy. A tool that looked like it recommends
   design values would fight the standard of care instead of serving
   it — the [Non-goals](#non-goals) and [§7's language rules](#language)
   exist for exactly this reason.
5. *Academic incentives end at the dataset DOI.* Archives fund
   deposits, not interfaces; the fdhpy web tool, this product's
   nearest neighbor in form, is itself a volunteer-scale static page.

One honest caveat cuts the other way: physics-based
fault-displacement tooling is where the field says it is heading
([Eos' 25-year retrospective](https://eos.org/editors-vox/when-the-earth-moves-25-years-of-probabilistic-fault-displacement-hazards));
the IAEA has already published a PFDHA benchmark
([TECDOC-2092](https://www.iaea.org/node/224310)), and integrations
into OpenQuake, the open-source hazard engine, are underway — so the
first-mover window is real but perishable.

**Positioning.** The reference point practitioners will reach for is
that same [FDHI](https://harvardrc.github.io/eps-ground-rupture/glossary/#the-datasets)
model suite and web tool. As the scan above shows, the two condition
on disjoint variables — FDHI on the earthquake (style, magnitude,
position along the rupture), this ensemble on the ground. That
complementarity is the product's reason to exist, and the product
should say so in FDHI's own vocabulary (principal vs. distributed
displacement).

## 2. Product vision and scope strategy

The author team's GUI mockup (see [Source material](#12-source-material))
draws a four-tab site: a full-dataset explorer, an "Advanced Search," an
educational [morphologies](https://harvardrc.github.io/eps-ground-rupture/glossary/#scarp-classes) (scarp-shape classes) page,
and a contact page. The owner's direction
(2026-10-13): overlap with the existing dashboards is intended — **reuse
the dashboards, or evolve the current site into a fully functional
app**, rather than building a second, parallel property.

So the product is the existing site, grown until it serves the mockup's
vision. The one genuinely new capability — and the core of this PRD — is
the **scenario page**: the single-page destination of the author team's
request, realizing the mockup's Advanced Search. Everything else maps
onto existing assets, gets reused, or follows later.

One reframing is stated here rather than buried: the request's own
shorthand for the deliverable is *hazard assessment*. The dataset
carries no earthquake occurrence rates, so nothing built on it can be a
hazard analysis in the practice sense; the product delivers what
engineers reach for under that shorthand — conditional distributions of
surface outcomes under a bracketed scenario — and labels itself
accordingly ([Language](#language)). Throughout this document, **"the
app"** means this new interactive scenario capability, wherever
[OQ-2](#11-open-questions) places its entry point.

### Non-goals

- No probabilistic fault displacement hazard analysis: no occurrence
  rates, return periods (average years between events of a given
  size), or exceedance statements (the chance a value is surpassed).
- No design-value recommendations; percentile selection stays with the
  engineer of record.
- No user-data upload or overlay; researchers compare offline via the
  subset download ([FR-D1](#downloads-and-citation-c4-c5--p1)).
- No accounts, no tracking, no re-hosting of the raw archives.
- No 3D-arm ingestion while that lane is on hold
  ([DR-7](#6-data-requirements) keeps the door open).
- No native re-implementation of the published dashboards without a
  named gap ([FR-G5](#displays-shared-across-capabilities)).

### Capability map

| # | Capability | Mockup surface | Existing asset | New build | Priority |
|---|---|---|---|---|---|
| C1 | Scenario inputs: bracket fault dip, sediment properties, displacement; filter in engineering vocabulary | Tab 2 "Search by DEM Model Parameters" | None ([Distributions][] hues by one parameter at a time; no parameter filters, no ranges, no conjunctive bracketing) | The scenario page | P1 |
| C2 | Distribution outputs with counts and percentiles for SH (scarp height), DZW, scarp dip | Tab 2 results panel | [Distributions][] histograms (no percentiles, no conjunctive filter) | Yes | P1 |
| C3 | Field-measurement context on the filtered view ("your scenario vs. real events") | Slides 6–7 worked example (arrows pointing at [Kern County 1952](https://harvardrc.github.io/eps-ground-rupture/glossary/#kern-county-1952) values) | [Distributions][] needles (thin reference lines marking individual field measurements); [Per-event boxplots][]; `historic_events` (a field-measurement table from the repo's data pipeline, §6) | Reuse pattern | P1 |
| C4 | Download the filtered subset, its summary statistics, and plot images, with citation attached; the download flow offers a representative scarp-type animation (mockup goal 5, FR-D4) | Tab 2 "Download Selected Data"; mockup goals 2 and 5 | None | Yes | P1 (plot images and animation P2) |
| C5 | Link out to the full dataset (DesignSafe PRJ-4680) and the paper | Tab 1 "Download the full DEM dataset" | Site cite apparatus (the standard How-to-cite buttons and citation includes) | Link, not re-hosting | P1 |
| C6 | Shareable scenario state (URL that reproduces the view) | — (precedent: the [GNS NZ NSHM app](https://nshm.gns.cri.nz/)'s shareable state) | None | Yes | P2 |
| C7 | Inverse search: given observed surface deformation, find matching scenarios | Tab 2 "Search by Surface Deformation Characteristics" | The [back-projection](https://harvardrc.github.io/eps-ground-rupture/glossary/#back-projection) on [Slip regression][] is the method precedent | Yes | P2 |
| C8 | Full-dataset exploration: scatter/histogram/PDF (probability-density curve), color-by, zoom-select for mean/σ of a region | Tab 1 | [Model vs reality][], [Response curves][], and [Distributions][] cover most modes | Reuse the dashboards' coverage first; native build only for a named gap (FR-G5). The link/embed/native split per surface is the HLDD's platform decision | P2 |
| C9 | Morphology education with model/photo pairs and per-class animations | Tab 3 | Glossary scarp-class entries; the site's figures page (Figs 3–7, the scarp classes); author-supplied animations (3 mp4 + 1 gif in the mockup file) | Yes — photos release-gated (usable in development, shipped only once permissions clear); its animation library also serves C4's goal-5 affordance | P2 |
| C10 | Slip ↔ magnitude duality on displays | Tab 1/2 axis toggles; mockup goal 4 | The derived axis on [Response curves][] (`6.94 + 1.14·log₁₀(slip)`) with its warning | Reuse formula + warning | P2 |
| C11 | Contact / request-a-format page | Tab 4 | Repo links in site footer | Small | P3 |

"Priority" means build order within this product lane, not importance to
the author team; P1 is the **proposed** v0.3 slice, pending OQ-3.

## 3. Users

- **Primary — practicing geotechnical and earthquake engineers** doing
  siting, crossing design, or design review near mapped thrust/reverse
  faults. They know fault dip, sediment class, and displacement estimates;
  they do not know this dataset's column names. They quote medians and
  84th percentiles, and they put numbers into reports — so they need
  counts, percentiles, downloads, and something citable.
- **Secondary — reviewers and regulators** (e.g., checking a consultant's
  bracketing against the same ensemble) and **researchers** comparing
  their own models or compilations — served by the subset download
  (FR-D1) and the existing dashboards; an own-data overlay is a
  non-goal.
- **Tertiary — students and the interested public**, served by the
  educational capability (C9) and the existing glossary; and the **author
  team**, for whom the product is outreach and a reproducibility surface
  for the DesignSafe deposit.

## 4. User stories

1. *The dam vignette (the author team's own).* An engineer developing a
   dam that crosses a fault has investigated it: dip roughly 30–40°,
   strong sediments, up to ~3 m of displacement **at the surface**. They
   bracket dip to {30°, 40°}, set strength to Strong (uniform and
   layered — both `Set` arms — labeled), and enter 3 m as an
   anticipated vertical
   surface offset through the FR-S5 assist — which converts it per dip
   and tells them plainly that at 30° the converted slip (≈ 6 m) exceeds
   the modeled range, so that arm of the bracket is only partially
   covered. They read the resulting SH, DZW, and scarp-dip
   distributions — count, median, 84th percentile — then download the
   subset for the design report.
2. *Pipeline crossing.* An engineer sizing a fault-crossing segment needs
   the plausible width of the deformed zone to set the special-design
   length, under loose shallow sediments and a steep fault. DZW's
   distribution, not its mean, drives the decision.
3. *Design review.* A reviewer re-enters a consultant's stated bracket
   and checks whether the reported "expected scarp height" sits at the
   median, the 84th, or outside the ensemble entirely.
4. *Paleoseismic reading — reconstructing past earthquakes from
   geologic evidence (inverse, P2).* A geologist measured a 2 m scarp
   over a fault of unknown dip and asks which modeled combinations of
   dip, sediment, and slip produce scarps near 2 m.
5. *Teaching.* An instructor sets a steep 70° fault and flips strength
   from Strong to Weak: [Simple](https://harvardrc.github.io/eps-ground-rupture/glossary/#simple) scarps holding steep faces
   give way to gentle [monoclinal](https://harvardrc.github.io/eps-ground-rupture/glossary/#monoclinal) slopes, because weak
   sediment slumps to its angle of repose (the steepest slope loose
   material can hold) instead of holding a face — with an animation per
   class. (At 20–30°, the same control shows
   [pressure ridges](https://harvardrc.github.io/eps-ground-rupture/glossary/#pressure-ridge) dominating and the
   [collapse variants](https://harvardrc.github.io/eps-ground-rupture/glossary/#collapse) receding as the sediment
   column — the soil stack above bedrock — weakens.)

## 5. Functional requirements

### Scenario inputs (C1) — P1

- **FR-S1.** Fault dip: range control over the seven modeled dips
  {20, 30, 40, 45, 50, 60, 70}°, selecting the modeled values inside the
  user's bracket and showing which values were caught (a 30–40° bracket
  catches exactly {30°, 40°}). Continuous-looking sliders that imply
  unmodeled dips exist are not acceptable.
- **FR-S2.** [Sediment strength](https://harvardrc.github.io/eps-ground-rupture/glossary/#sediment-strength): the primary
  control uses the dataset's own engineer-facing bands — Weak /
  Moderate / Strong — plus the three heterogeneous structures (Random
  Heterogeneous, Cohesive Top Unit, Alternating Strong–Weak). The
  control must respect the documented trap that Weak/Moderate/Strong
  mean different things for homogeneous vs. heterogeneous columns, and
  must expose the uniform-vs-layered choice ([`Set`](https://harvardrc.github.io/eps-ground-rupture/glossary/#set)) rather
  than silently pooling it. Fine-grained [cohesion](https://harvardrc.github.io/eps-ground-rupture/glossary/#cohesion)
  configurations (26 values: five uniform strengths 0.1–2.0 MPa —
  megapascals, the strength unit — plus the twenty-one lettered layer
  profiles) are an advanced refinement, not the primary control.
- **FR-S3.** Sediment depth above bedrock: {3, 5, 10} m, multi-select or
  bracket.
- **FR-S4.** Sediment density: {Dense, Medium, Loose}, multi-select.
- **FR-S5.** Displacement window: a min/max bracket on **slip at depth**
  (the ensemble's driven variable, 0–~5 m in ~0.05 m stages), labeled as
  such. Because engineers often hold a *surface* number instead, the
  control must offer an assist that converts an anticipated vertical
  surface offset to slip through the ensemble's own per-dip regression
  (test-pinned — locked by automated tests so values cannot drift —
  slopes 0.3436 at 20° to 0.9445 at 70°, [r²](https://harvardrc.github.io/eps-ground-rupture/glossary/#r2) > 0.997; the
  published back-projection method), stating the conversion and its
  assumption (scarp height ≈ vertical displacement; closest for simple
  and monoclinal scarps, biased for pressure ridges). The assist shows
  the conversion per selected dip — one regression per dip — and
  prominently flags any conversion that exceeds the modeled 0–~5 m slip
  range rather than silently clipping it: partial coverage of a bracket
  is stated, never hidden. (The author team's own dam vignette exercises
  this: 3 m of surface offset at 30° converts past the modeled range.)
  Exact multi-dip window semantics (per-dip windows vs. a common
  envelope) is specified in the PDD, not improvised. The two entry modes
  must never be conflated in labeling ([Language](#language)).
- **FR-S6.** Population: an explicit, always-visible choice between
  **all model stages in the slip window** (the paper's histogram
  convention; answers "anywhere along the way to my displacement") and
  **final state per [trial](https://harvardrc.github.io/eps-ground-rupture/glossary/#model-stage)** (one row per experiment —
  a trial is one complete simulation run; answers "end states of full
  runs"), with one-line explanations. Default: all stages in
  window, matching the "up to X m" phrasing of the primary user story.
  Mixing populations silently is prohibited. Under an active slip
  window, the per-trial population means *the last stage inside the
  window, per trial* ("one state per trial, at the top of your
  window"); true final states (each trial's ~5 m end) are the no-window
  case. The UI never intersects final states with a lower slip cap —
  that set is empty by construction, since every trial runs to ~5 m.
- **FR-S7.** Scarp class: optional filter over the six classes, default
  all, presented as "filter by resulting scarp type" — it is an outcome
  of the model, not a site input, and the UI must say so.
- **FR-S8.** Every control defaults to "everything": the empty scenario
  shows the full ensemble, and a "reset" returns to it.

### Outputs (C2, C3) — P1

- **FR-O1.** For each of scarp height, deformation zone width, and scarp
  dip: a distribution view — histogram, plus a cumulative view for
  percentile reading — of the filtered population, with **N always
  visible**. These two are the P1 result modes; the
  mockup's density (pdf), color-by, and scatter modes are deliberately
  deferred to C8 and the PDD. [Us − Ud (additional uplift)](https://harvardrc.github.io/eps-ground-rupture/glossary/#us-ud)
  is a worthwhile fourth panel for the expert audience (P2 default,
  pending OQ-6).
- **FR-O2.** Summary statistics per panel: median and 84th percentile
  named explicitly (deterministic-practice convention), plus 16th,
  min/max of the filtered set, mean and standard deviation (the mockup's
  readouts), and the count of excluded null measurements (model states
  where the automated measuring failed, left empty in the data). Design-value
  language is prohibited — selecting a design percentile is the
  engineer-of-record's call, and the product must say so where statistics
  are shown.
- **FR-O3.** Small-population honesty: when a bracket yields few
  measurements (threshold set in the PDD), the UI must warn prominently
  rather than draw a confident-looking distribution; zero-result states
  must explain which constraint emptied the set.
- **FR-O4.** Scarp-dip outputs carry the provisional-data caveat (the
  authoritative `Convert_Scarp_Dip` correction has not reached the
  dataset; error concentrated in the Simple classes) until the upstream
  fix lands. The caveat placement is load-bearing, not a footnote.
- **FR-O5.** Field context: on request (and in the worked example), the
  filtered model distribution can be overlaid with the field
  compilations' measurements (the 2,616-row per-measurement export —
  one row per individual field measurement: FDHI, [SURE](https://harvardrc.github.io/eps-ground-rupture/glossary/#sure),
  Kern County 1952), drawn in the site's established "field data
  is black" convention, labeled "analogous, not identical" (field
  [vertical separation](https://harvardrc.github.io/eps-ground-rupture/glossary/#vertical-separation) ≈ scarp height; the
  width analogue differs per arm — FDHI's [FZW](https://harvardrc.github.io/eps-ground-rupture/glossary/#fzw), Kern's DZW,
  and SURE's [fault-normal displacement component](https://harvardrc.github.io/eps-ground-rupture/glossary/#fnc)), and never
  assigned scarp classes. Field widths default to the paper's < 50 m
  criterion with the established toggle for the full range — framed, as
  the site frames it, as distributed multi-strand deformation the model
  deliberately does not represent.
- **FR-O6.** A worked example reproducing the author team's own: 1952
  M 7.36 Kern County, pressure ridge on a fault with a measured 30° dip,
  field widths drawn from the pinned per-measurement export against the
  matching bracket's model distribution — never hand-typed. The export
  carries Kern widths in two arms: rows from the FDHI flatfile (the
  compilation's single flat data table) — 11, 15, and 30.5 m
  under the 50 m criterion, the trio the author team's mockup quotes —
  and the hand-compiled Buwalda digitization (widths read off John
  Buwalda's 1950s field maps; eleven values, 0.30–30.48 m, no
  "principal" marker). Which arm the example features,
  and the pinned definition of a principal-width subset, is OQ-9.

### Downloads and citation (C4, C5) — P1

- **FR-D1.** Download the filtered subset (rows with the scenario's
  parameters and the displayed measures) and the summary-statistics
  table, in a format a report can ingest (CSV at minimum). Every
  download embeds provenance: paper citation, DesignSafe DOIs, software
  version, data-export version, scenario parameters, and retrieval date.
- **FR-D2.** Plot export (image) with the same provenance stamped on or
  alongside it (P2).
- **FR-D3.** The full raw dataset is **linked, never re-hosted**: the
  "full dataset" affordance points at DesignSafe PRJ-4680, and the page
  carries the site's standard How-to-cite apparatus with the
  cite-the-paper-not-the-site framing.
- **FR-D4.** The download flow offers a representative animation of the
  scenario's dominant scarp class(es) — the mockup's goal 5, a
  results-coupled affordance — drawing on the same per-class animation
  assets as FR-E1 (P2).

### Sharing and inverse search — P2

- **FR-X1.** (C6) The complete scenario state round-trips through the
  URL, so a link reproduces the view — the mechanism engineers use to
  put a reproducible state in a report or an email.
- **FR-X2.** (C7) Inverse search: bracket an *observed* quantity (scarp
  height, DZW, scarp dip) and see the distribution of model parameters
  (dip, strength, depth, slip) among matching states, presented as
  "scenarios consistent with the observation," never as an inference of
  the real site's parameters. The mockup's inverse column also lists
  anticipated magnitude and offset; those enter through the forward
  controls (and OQ-5 for magnitude) — a recorded narrowing, not an
  omission.

### Education, animations, contact (C9, C11) — P2/P3

- **FR-E1.** (P2) A morphologies surface pairing each of the six scarp
  classes with its model snapshot, description (reusing glossary
  content), and a representative animation (the author team supplied
  three animations and one gif with the mockup; per-class coverage is a
  dependency). Real-event photographs may be used **in development**;
  shipping them publicly is gated on the standing third-party-permission
  question, exactly as Figures 1–2 are handled today.
- **FR-E2.** (P2) "How the measurements are made" explainer
  (computer-vision measurement of each simulated scarp), reusing the
  site's existing framing and the paper's Figure 5 reference; the
  mockup also plans animated measurement-process media — an
  author-supplied asset (§9).
- **FR-E3.** (P3) A contact/request affordance naming the author team's
  channel for data-format and animation requests (mockup tab 4), with
  links to the author team's DEM and ML model-code repositories (URLs
  pending — a §9 dependency) alongside the links to this repository
  that the site already carries.

### Displays shared across capabilities

- **FR-G1.** (C10) Anywhere slip is an axis, the derived
  moment-magnitude relabeling (`6.94 + 1.14·log₁₀(slip)`) may be offered
  as a secondary axis or toggle **with the site's existing warning**
  (prefer slip; the mapping is a monotone relabeling, not an independent
  variable). An "anticipated magnitude" *input* is out of scope until the
  author team blesses a conversion (OQ-5).
- **FR-G2.** Scarp classes use the six canonical colors with
  parents-before-collapse legend order (each parent class listed just
  before its collapse variant), never color as the only identity
  (known color-vision-deficiency collisions; legend + tooltip identity
  required; the "class family" fold-in — merging each collapse variant
  into its parent — is the sanctioned mitigation).
- **FR-G3.** Axis and control labels are physical quantities with units
  ("Scarp Height (m)"), never column names; all labels and annotations
  derive from data or parameters — frozen text that a control can
  contradict is a defect.
- **FR-G4.** The page carries the site's citation apparatus (How-to-cite
  buttons and includes), the disclaimer block
  ([§7](#7-content-requirements)), and a visible version stamp (software
  version, data-export date).
- **FR-G5.** (C8) Full-dataset exploration reuses the published
  dashboards; a native panel requires a named gap recorded in the PDD.
  The reuse mechanism per surface — link, embed, or native — is the
  HLDD's platform decision.

## 6. Data requirements

- **DR-1.** Every number the app displays derives from **the
  pipeline** — the repo's local data build (raw deposit →
  Parquet/DuckDB layer → purpose-built, versioned exports); any
  statistic derived at interaction time (filtered counts, percentiles of
  a user's bracket) is computed from those pinned inputs by code that is
  itself tested against pipeline-computed golden-scenario values
  (trusted reference outputs the front end must reproduce) — the
  established discipline (derived numbers live in `views.py`, the
  pipeline module defining every derived view, and its tests — never in
  untested front-end code alone). Whether a given number ships
  precomputed or derives from row-level data, and in what format, is the
  HLDD's call. The 73 MB `dem.csv` (the full flat export feeding
  Tableau) is a Tableau concession and explicitly not the foundation
  for a new front end; the 97 KB `dem_slip_bin_stats` export
  (pre-aggregated statistics) is the size-precedent for
  pre-aggregation.
- **DR-2.** The **final-state-per-trial rule exists only inside a
  Tableau workbook today** (the formula
  `{FIXED [Trial]: MAX([Slip])} = [Slip]` — keep each trial's
  maximum-slip row),
  with no pipeline view and no test. Before the app ships anything
  population-labeled, that rule becomes a view with a pinned test
  (3,434 rows, zero ties — verified against the shipped export
  2026-10-13).
- **DR-3.** Measurement hygiene is decided once, in the pipeline, and
  documented on the page: the policy for null measures (13,675–16,647
  rows depending on measure), for the small negative populations
  (1,232 negative scarp-height rows, none below −0.182 m; 30 negative
  scarp-dip rows, none below −12.53°), and for low-slip stages whose
  measurement reliability the authors have flagged (per-class
  minimum-slip crops — cutoffs dropping unreliable low-slip rows —
  exist in their recovered analysis code, held
  privately with the other author materials; scope of that gate is
  OQ-4).
- **DR-4.** Field-event names are normalized before any event-labeled
  display (the per-measurement export carries spelling twins such as
  Chi-Chi/ChiChi — the 1999 Taiwan earthquake — and trailing
  non-breaking spaces).
- **DR-5.** Payload budget: the scenario page's initial data load stays
  small enough for a fast first paint on an ordinary connection — the
  PDD sets the number; the PRD's bar is "no 73 MB downloads, no visible
  loading phase on repeat visits."
- **DR-6.** Every export the app consumes is versioned and stamped, so a
  downloaded result names the data vintage it came from (the FDHI
  project's own update history is the cautionary precedent).
- **DR-7.** Nothing in the app's data model may hard-bake 2D-only
  assumptions in ways that make the on-hold 3D arm expensive later
  (standing guidance from the lead author, 2026-08-20) — carrying a
  source/case dimension in new exports is the cheap insurance.

## 7. Content requirements

### Language

The product speaks the practitioner's language without overclaiming:

- **Use**: "conditional distributions, given surface rupture under the
  scenario you specified"; "range of model outcomes from a distinct
  element method (DEM) simulation ensemble" (spell out DEM — engineers
  read it as *digital elevation model*); "median and 84th percentile";
  "screening-level information to inform site investigation and design
  review"; "principal (primary) displacement" when relating the model's
  scarp measurements to FDHI vocabulary; "bracketing your uncertainty"
  for input ranges vs. the distribution's spread for the ensemble's
  variability.
- **Avoid**: "hazard assessment" / "fault displacement hazard" as the
  product's claim (a hazard result ties displacement to earthquake
  occurrence rates; this dataset has none — §2 states how the request's
  framing is honored without the claim); "forecast" / "quantitative
  forecasts" (the mockup's own intro copy uses it; flagged for the
  vocabulary sign-off, [SC-5](#10-success-criteria)); "annual
  probability," "return period";
  "design displacement"; "predicted displacement at your site"; any
  regulatory-compliance implication ("complies with Alquist-Priolo");
  "safe."

### Disclaimers

A standing block, assembled per the research-tool norms (USGS wording
as the pattern; the FDHI web tool's zero-disclaimer gap is the
anti-pattern): (1) research-grade, subject to revision; (2) no warranty,
no liability; (3) the scope sentence — no earthquake rates, no return
periods, not a site-specific prediction, not a PFDHA, results are
ensemble outcomes for analogous modeled conditions; (4) direction to
qualified professionals and governing guidance (site-specific geologic
investigation where regulation requires it, e.g. Alquist-Priolo zoning;
FERC Chapter 13 for dams).

### Register and apparatus

Reader-facing prose follows the site's conventions: plain language with
glossary links on first use (the glossary's anchors for scarp-height,
dzw, scarp-dip, fault-dip, slip, cohesion, sediment-strength, set,
back-projection, and the scarp classes already exist), honest caveats
in admonitions (the site's styled note/warning boxes), sourcing
discipline (claims about the science cite the paper; claims about
preparation cite the project's own documents), and
the cite-the-paper-not-the-site framing that secured the author team's
DOI consent. The scarp-dip provisional notice and the
populations-are-a-choice explanation are reader-facing content, not
developer trivia.

## 8. Non-functional requirements

- **NFR-1.** Free to view, no login, no user accounts, no tracking
  beyond what the host already provides.
- **NFR-2.** Deliverable within the project's hosting reality: a public
  static site deployed from `main` (GitHub Pages; no server-side
  compute). Anything needing a backend is out of scope for this lane.
- **NFR-3.** Interaction latency: bracket changes repaint without
  perceptible wait. The PDD sets the numeric budgets (p95
  filter-to-repaint; initial payload, with DR-5) that
  [SC-7](#10-success-criteria) verifies; the anti-pattern to avoid is
  the nearest-neighbor tool's first load — tens of seconds while an
  in-browser Python runtime downloads (§1's landscape scan).
- **NFR-4.** Accessibility: keyboard-operable controls, visible focus,
  text alternatives for charts (at minimum the statistics table carries
  the same information), and the palette rules of FR-G2. JS-off
  visitors get honest fallback content (the site's existing convention),
  not a blank panel.
- **NFR-5.** Responsive down to the site's existing mobile behavior; the
  scenario page remains usable on a laptop in the field office
  (no hover-only affordances for essential information). Supported
  environments: evergreen browsers, roughly the last two years; no
  legacy-browser support. The PDD fixes the exact baseline.
- **NFR-6.** Licensing stays three-way and explicit: app code
  Apache-2.0, page prose CC BY 4.0, any paper figures under the
  publisher's author-sharing terms (non-commercial, no derivatives,
  full citation, accepted-manuscript originals only) — with the
  development-vs-release gate for third-party photographs.
- **NFR-7.** Quality gates match the repo's: the strict site build
  (the build that fails on any warning, broken link included) stays
  green; derived numbers are pinned by tests; reader-visible asset
  changes respect the cache-busting convention (renaming an asset
  reference on change so stale browser caches cannot serve the old
  one).
- **NFR-8.** The platform decision itself (native page vs. embedded
  dashboards vs. hybrid; any new toolchain) is recorded as an ADR,
  because it extends or supersedes the standing "Tableau is the
  dashboard platform" and "no Python UI frameworks" decisions.

## 9. Dependencies and risks

| Dependency / risk | Holder | Bears on |
|---|---|---|
| `Convert_Scarp_Dip` correction (rule or column) | Lead author | FR-O4; scarp-dip credibility app-wide |
| Cohesion letter-code answers — FR-S2's lettered layer profiles (per-layer values for R2–R10; whether `S` is the authors' label; its geometry; the letter gaps) | Lead author | FR-S2's advanced refinement and its documentation |
| Low-slip measurement-reliability gate: scope and thresholds | Lead author | DR-3; any bracket that includes small displacements |
| Third-party photo permissions (Figures 1–2 and the morphology montage) | Author team | FR-E1 release gate |
| Slip→magnitude input conversion blessing | Author team | FR-G1 / [OQ-5](#11-open-questions) |
| Per-class animation assets beyond the three supplied; animated measurement-process media | Author team | FR-E1, FR-E2, FR-D4 completeness |
| Author-team model-code repository URLs (DEM and ML) for the contact surface | Author team | FR-E3 |
| Reconciling the mockup's Kern widths with the shipped compilation's two arms | Lead author | FR-O6, SC-2, OQ-9 |
| Payload-size vs. filter-freedom tension (pre-aggregation cannot serve arbitrary conjunctive brackets; row-level data must be shipped compactly) | HLDD | DR-1, DR-5, NFR-3 |
| CI cannot run the data pipeline (raw inputs are local-only), so app data must be committed artifacts refreshed by the owner | Build design | DR-1, DR-6 |
| Single Pages site per repo: the app shares the site's URL space and deploy gate (the one GitHub Pages job that publishes everything) | Build design | NFR-2 |
| Scope creep toward re-implementing the five dashboards natively | Product owner | FR-G5's reuse-first rule |
| The site glossary lacks entries for PFDHA, Alquist-Priolo, and Fault Avoidance Zones — terms §1 now leans on (external links carry the definitions meanwhile) — and spells FDHI "…Hazards Initiative" where UCLA's own usage is "…Hazard Initiative" | Site content | §1 readability; [Register and apparatus](#register-and-apparatus) |

## 10. Success criteria

1. **SC-1.** The dam vignette runs end-to-end in under two minutes, unaided, by
   each of three first-time engineer testers: bracket {30°, 40°},
   strength Strong (uniform and layered `Set` arms, labeled), 3 m
   entered as
   an **anticipated surface offset** through the FR-S5 assist — which
   visibly flags that the 30° arm's converted slip exceeds the modeled
   range — then read N, median, and 84th percentile for all three
   quantities and download the subset.
2. **SC-2.** The Kern worked example reproduces: the 30°/pressure-ridge bracket
   shows the export's Kern field widths — e.g. the FDHI arm's 11, 15,
   and 30.5 m — inside the model distribution's span, drawn from the
   pinned export rather than hand-typed (OQ-9 settles which arm the
   example features).
3. **SC-3.** Every number the page shows derives from pinned pipeline data, and
   any statistic computed in the front end is covered by tests against
   pipeline-computed golden-scenario values — no number rests on
   untested front-end code alone.
4. **SC-4.** The page carries the citation apparatus, the four-ingredient
   disclaimer, the scarp-dip caveat, and the population label — verified
   by the site's strict build and by review.
5. **SC-5.** The author team recognizes the mockup's intent in the shipped page
   (their five goals each map to a shipped or explicitly deferred
   capability) and signs off on the vocabulary.
6. **SC-6.** No regression to the existing site: dashboards, cite apparatus, and
   deploy stay intact — verified by the strict site build (links, nav,
   apparatus), the Pages deploy job staying green, and an embed
   smoke-check of the five dashboards.
7. **SC-7.** The PDD's performance budgets are met (initial payload, p95
   filter-to-repaint), and the dam vignette is completable keyboard-only
   with the statistics table carrying the charts' information.

## 11. Open questions

- **OQ-1.** Product name. "Scenario Explorer" is the working title;
  the mockup's own header ("Thrust & Reverse Fault Ground Rupture
  Characteristics") is a candidate source. Decision: owner + author team.
- **OQ-2.** Does the scenario page live at a site URL (evolving the
  site's nav) or present as a distinct "app" entry point that
  the site links? (The request's single-page framing vs. the
  one-Pages-site reality; purely a presentation decision — hosting is
  shared either way.)
- **OQ-3.** v0.3 slice: is C1–C5 (the P1 column) the agreed build target
  for `dev-v.0.3.x`, with C6–C11 following? Decision: owner.
- **OQ-4.** Low-slip gate: apply the authors' per-class reliability
  crops to the scenario page's populations, expose them as a visible
  toggle, or document-only? Needs the lead author's scope answer; the
  PDD must not pick silently.
- **OQ-5.** Magnitude as an *input* ("anticipated earthquake
  magnitude," per the mockup): which conversion, whose blessing, and
  with what stated uncertainty? Until answered, magnitude appears only
  as the derived display relabeling with its warning (FR-G1).
- **OQ-6.** Us − Ud as a fourth output panel: include at P1 for the
  expert audience, or defer? FR-O1 carries P2 as the default pending
  this decision. (Field data has no comparable quantity, so it is
  model-only either way.)
- **OQ-7.** Does the inverse search (C7) belong in the first public
  release at all, or after the forward page has author-team sign-off?
- **OQ-8.** Animations: are the three supplied files (plus gif) the
  intended per-class set, or does the team want all six classes covered
  before FR-E1 ships?
- **OQ-9.** Kern worked-example widths: the mockup slide quotes 11, 15,
  and 30.5 m as principal deformation-zone widths. The FDHI arm of the
  per-measurement export carries exactly that trio under the 50 m
  criterion; the hand-compiled Buwalda arm holds eleven widths
  0.30–30.48 m (9.14, 15.24 and 30.48 among them) with no principal
  marker. Which arm the worked example features — and the pinned
  definition of a principal-width subset — needs the lead author.

## 12. Source material

- **The author team's request** (2026-10-13, via the owner): paraphrased
  throughout; the dam vignette in [user story 1](#4-user-stories) keeps
  its substance. The verbatim text is retained privately (gitignored
  `internal/`), per the project's correspondence rule.
- **The author team's GUI mockup** — `DEM website GUI.pptx`, 9 slides,
  48 MB, local gitignored artifact (`legacy/mockup/`; it exists in no
  clone, which is why this PRD distills rather than cites it). Contents:
  a DesignSafe-styled four-tab site (full-dataset explorer with
  scatter/histogram/PDF modes and slip↔magnitude toggles; an Advanced
  Search with forward and inverse directions, mean/σ readouts, subset
  download, and per-class animations; a morphologies explainer with
  model/photo pairs; contact). Five stated goals: real-time
  visualization; subset search + download; scatter↔distribution
  flipping; slip-and-magnitude comparison; a scarp-type animation with
  downloads (served by FR-D4; the C9 education surface carries the
  animation library). Worked example: Kern County 1952 against a
  filtered DZW distribution.
- **Verified dataset facts** (shipped exports, checked 2026-10-13
  against `dist/csv/`, the pipeline's local CSV output folder —
  gitignored, regenerated locally via `egr-build`, the repo's
  export-rebuild command — and the pipeline's tests): all counts,
  ranges, and domain values quoted in this document.
- **External practice**, cited for the conventions this PRD adopts:
  PFDHA's definition (Youngs et al. 2003,
  [USGS pub 70025970](https://pubs.usgs.gov/publication/70025970));
  84th-percentile deterministic practice for fault crossings
  ([Melissianos & Vamvatsikos, EURODYN 2020](https://www.lambdalab.ntua.gr/docs/conferences/Melissianos-Vamvatsikos_prEURODYN2020_SimplifiedEstimationOfDesignFaultDisplacementForBuriedPipelinesAtFaultCrossin.pdf);
  the same group's journal treatment is
  [Melissianos et al. 2023, *Bull. Earthq. Eng.*](https://doi.org/10.1007/s10518-023-01813-9));
  FERC Engineering Guidelines Chapter 13 (2018); Bulletins 72/112 of
  ICOLD, the International Commission on Large Dams,
  via [Water Power Magazine's review](https://www.waterpowermagazine.com/analysis/dam-design-the-effects-of-active-faults/);
  [California Alquist-Priolo zoning](https://www.conservation.ca.gov/cgs/alquist-priolo);
  the [active-fault guideline of NZ's Ministry for the Environment (MfE)](https://environment.govt.nz/publications/planning-for-development-of-land-on-or-close-to-active-faults-a-guideline-to-assist-resource-management-planners-in-new-zealand/)
  and the [GNS Fault Avoidance Zones dataset](https://gis.gns.cri.nz/server/rest/services/Active_Faults/NZActiveFaultDatasets/MapServer/7/iteminfo);
  the [FDHI model suite](https://risksciences.ucla.edu/nhr3/fdhi/models)
  and [its web tool](https://asarmy.github.io/fdhpy-webtool);
  the [USGS Earthquake Hazard Toolbox](https://earthquake.usgs.gov/nshmp/);
  the [GNS NZ NSHM web app](https://www.gns.cri.nz/data-and-resources/national-seismic-hazard-model/);
  [OpenSHA applications](https://opensha.org/Applications);
  USGS research-software disclaimer wording
  ([GHSC legal page](https://ghsc.code-pages.usgs.gov/lhp/ocelote/resources/legal.html)).
- **As-is practice and the product landscape**, behind §1's workflow
  and scan (all links checked 2026-10-13):
  [CGS EQ Zapp](https://www.conservation.ca.gov/cgs/geohazards/eq-zapp)
  and [CGS Special Publication 42](https://www.conservation.ca.gov/cgs/publications/sp42);
  the [USGS Quaternary Fault and Fold Database](https://www.usgs.gov/programs/earthquake-hazards/faults);
  scaling relations ([Wells & Coppersmith 1994](https://central.scec.org/node/3035),
  [Moss & Ross 2011](https://authors.library.caltech.edu/94907));
  [Boncio et al. 2018](https://nhess.copernicus.org/articles/18/241/2018/);
  the [FDHI database report](https://www.risksciences.ucla.edu/girs-reports/2021/08)
  and [reference implementations](https://www.risksciences.ucla.edu/nhr3/products/fdhi)
  with the [fdhpy package](https://github.com/asarmy/fdhpy);
  the [SURE database](https://zenodo.org/records/6326856);
  [OpenSRA](https://peer.berkeley.edu/opensra-home1);
  the [open full text of Chiama et al. (2025)](https://par.nsf.gov/servlets/purl/10644518)
  and [the 2023 companion study](https://par.nsf.gov/biblio/10514401);
  the [QuakeCoRE fault-displacement white paper](https://www.naturalhazards.govt.nz/assets/Publications-Resources/QuakeCoRE-FDHA.pdf);
  [Eos' 25-year PFDHA retrospective](https://eos.org/editors-vox/when-the-earth-moves-25-years-of-probabilistic-fault-displacement-hazards);
  the [IAEA PFDHA benchmark (TECDOC-2092)](https://www.iaea.org/node/224310);
  vendor pricing as posted —
  [PLAXIS](https://www.bentley.com/en/products/plaxis-3d/),
  [Abaqus via reseller](https://www.goengineer.com/guide-to-buying-abaqus-fea),
  [Itasca PFC, no public price](https://itascasoftware.com/products/pfc/).

## 13. What happens next

On approval of this PRD: the **product definition document** (same
directory), deriving exact control domains, defaults, states, copy, and
acceptance criteria from the requirements above — still platform-silent.
After its review: the **high-level design document** plus ADR-0010 for
the platform decision. Only then detailed design and an implementation
plan.

<!-- Live dashboard pages, in the site's nav order. -->
[Model vs reality]: https://harvardrc.github.io/eps-ground-rupture/dashboards/model-vs-reality/
[Response curves]: https://harvardrc.github.io/eps-ground-rupture/dashboards/response-curves/
[Per-event boxplots]: https://harvardrc.github.io/eps-ground-rupture/dashboards/per-event-boxplots/
[Slip regression]: https://harvardrc.github.io/eps-ground-rupture/dashboards/slip-regression/
[Distributions & summary statistics]: https://harvardrc.github.io/eps-ground-rupture/dashboards/distributions/
[Distributions]: https://harvardrc.github.io/eps-ground-rupture/dashboards/distributions/
