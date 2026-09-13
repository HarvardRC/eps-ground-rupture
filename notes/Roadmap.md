# Dashboard roadmap

A plan for reproducing the legacy notebook figures and the prior owner's
scatter script from the handoff materials (not in the repo) as interactive
Tableau dashboards, now embedded in the MkDocs companion site
(`subprojects/mkdocs/`, ADR-0008/0009).

Treat this as a working document — update as decisions are made and
scope shifts. For longer-lived design decisions, promote items to an
ADR under `docs/adr/`. For point-in-time chores, use `TODO.md`.

## Chart inventory

The canonical inventory of chart types in the paper and notebooks lives
in [`chart-families.md`](chart-families.md) — six conceptually distinct
families plus non-chart illustrations. Summary:

| Family | Question it answers | Status |
|--------|---------------------|--------|
| 1. Model vs reality scatter | Does the simulation behave like real earthquakes? | ✅ built |
| 2. Driver→response curves | How does the model respond to slip/magnitude per condition? | ✅ built |
| 3. Faceted distributions | What's the spread of each output; which parameter shifts it? | ✅ built (Dashboard 5) |
| 4. Mean ± σ summary | Typical values and spreads per scarp class at a glance? | ✅ built (Dashboard 5) |
| 5. Per-event boxplots | How variable are field measurements within each event? | ✅ built (Dashboard 3) |
| 6. Regression + inference | What slip would produce an observed displacement? | ✅ built (Dashboard 4) |
| Illustrations (static images) | Context: photos, schematics, model snapshots | ✅ on the site 2026-08-26 (Figs. 1–5, 7; build order #6) |

(The earlier A–E "theme" taxonomy is superseded by the families; the
mapping is at the bottom of `chart-families.md`.)

## Build order (priorities set 2026-06-10; statuses updated 2026-08-20)

1. ~~**Dashboard 1 — Model vs reality** (family 1)~~ — **built &
   published**: dual-axis DZW × Scarp_Height scatter, Event Map,
   Combinations coverage matrix; two dashboards ("Dashboard 1 — DEM
   Cloud & Historic Overlays", "Viable Combinations") in
   `dashboards/tableau/dem-model-vs-reality.twb` (renamed from
   `dem-overview.twb`), plus a `-public` twin
   (`dem-model-vs-reality-public.twb`, plus an 800×1200 `…web` variant
   for the site) on Tableau Public fed from a
   CSV export of `unified_observations`.
   Remaining polish (from the workbook review; not re-audited since the
   cosmetic-edit / palette commits — re-check which are still open):
   - Unify event color/shape encodings between the scatter and the map.
   - ~~Trend line: per-color or remove~~ — removed from the `-public`
     twin (2026-08-17); the desktop `.twb` still has the pooled OLS line.
   - ~~Map-only non-null `latitude` filter~~ — already a worksheet filter
     on the Event Map sheet in both workbooks (since 2026-06-09); promote
     to a datasource/context filter only if the query cost is measured.
   - Title zone width; exhaustive `Point Color` CASE; `'0 none'` coverage bucket.
2. ~~**Dashboard 2 — DEM response curves** (family 2)~~ — **built &
   published** (built 2026-06-17, on Tableau Public 2026-06-25):
   "DEM Response Curves" dashboard in
   `dashboards/tableau/dem-response-curve.twb` — `Driver` / `Response` /
   `Condition By` parameters switch the x-axis (`Slip` / `Magnitude`),
   y-axis (`Scarp_Height`, `DZW`, `Scarp_Dip` or `Us - Ud`) and hue
   (`Driver Value` / `Response Value` / `Condition` calcs); `-public`
   twin (`dem-response-curve-public.twb`, plus an 800×1000 `…web`
   variant) fed from the **local** CSV export of the `dem` view
   (`dist/csv/dem.csv` — the early Drive-CSV handoff is retired).
   - ~~Dropped from the original spec: the `VDHW` response — add it here
     or fold it into Dashboard 4~~ — resolved: folded into Dashboard 4,
     whose regressions plot `VD_HW` against slip.
3. ~~**Dashboard 3 — Per-event field statistics** (family 5)~~ — **built
   & published** (2026-08-01/02): two dashboards in
   `per-event-box-plots-public.twb` (a **public-only** workbook, no
   desktop twin): "Per-Event Boxplots — Model vs Field" (DEM
   distribution above the comparable field measure, shared axes,
   800×1200) and "VS & SURE" (1200×1200, plus an 800×2000 `…web`
   variant) with an event map and a per-panel event filter. Notable
   calls: fixed **log** width axis showing the full unrestricted field
   range — a documented deviation from the paper's 50 m selection
   criterion — principal-rupture + positive-value filters, magnitude
   labels via `unified_observations`. Populations, filters and axis
   decisions pinned in `notes/dashboard-3-build-spec.md`.
   - ~~Switch the width panel to the paper's 50 m criterion by default,
     with a toggle for the values beyond it~~ — **DONE 2026-08-26,
     rev 1.7** (decided 2026-08-20 in the author review: "we can safely switch it
     to 50 m and give a toggle on/off for the additional values outside
     that range that are likely due to distributed deformation").
     Boolean parameter `Show widths > 50 m` (default False, shown as
     *Paper's criterion (< 50 m)* / *All field widths*), `Keep FZW Row`
     filter on the FZW sheet only, control card on the Model-vs-Field
     dashboard (title off), axes untouched — shared fixed log 0.01–2,000.
     Restricted = the Fig.-13c window (13 rows, Kaikoura absent);
     toggled = 463 rows / 4 events. Site prose, dev twin and build spec
     were rewritten in the same pass (2026-08-25). The workbook's
     **default view on Tableau Public moved to
     `Per-EventBoxplotsModelvsField`** (was `…VSSUREweb`) — kept
     deliberately, since the toggle lives there; embeds unaffected.
     Deployed with PR #11 (merged 2026-08-27).
4. ~~**Dashboard 4 — Regression & inference** (family 6)~~ — **built &
   published** (2026-08-04): "Slip Regression & Kern Inference"
   (800×850) in `dem-slip-regression-public.twb` (**public-only**
   workbook). Dual axis over a 3-way CSV union: DEM cloud + seven
   per-dip black OLS fit lines (slopes ≈ sin dip) + Kern County stars
   that **slide between fit lines** via the `Kern Dip (measured: 30°)` parameter (renamed 2026-08-16)
   (20–70°, default 30°); dip checkbox filter and hover highlight. Fits
   computed in the pipeline, not the workbook (data-side work #2). Spec:
   `notes/dashboard-4-build-spec.md` (the click-by-click walkthrough
   in `notes/2026-08-04/` was retired 2026-08-15).
5. ~~**Dashboard 5 — Distributions & summary stats** (families 3 + 4)~~ —
   **built & published** (2026-08-15): "Distributions & Summary (web)"
   (800×1200, the only dashboard — a landscape twin was tried and
   dropped) in `dashboards/tableau/dem-distributions-public.twb`
   (**public-only**), fed from `dem.csv` + `historic_events.csv` in one
   union. Parameter-driven layered histogram (`Measure` × `Hue By` ×
   `Population`, per-measure bin widths) with per-measurement historic
   needles (LOD-sized, data-driven), plus the Fig-8 mean ± σ
   reconstruction (candidate populations pinned in
   `notes/dashboard-5-build-spec.md`). Spec: `dashboard-5-build-spec.md`.
   - **Fig-8 validation — code read 2026-09-10; sheet rebuild pending.**
     Kristen's two notebooks (sent 2026-08-26, now in `legacy/` as
     `DEM_slip_averages_figure - part {1,2}.ipynb`, with her rendered
     `Homogeneous_Heterogeneous_Averages_ScarpClass_FDHI.pdf`) settle O2:
     Figure 8 is **mean ± sample σ per 0.05 m slip increment** per scarp
     class — `s < Slip <= s + 0.05` on a 0.05 grid, `statistics.stdev`,
     NaNs dropped per measure — with a per-class polynomial fit over the
     bin means (degree 2 for scarp height and Us − Ud, 3–5 for DZW and
     scarp dip). **Neither candidate A nor B**: the pooled per-class
     summary the published sheet shows is a different statistic. The
     `dem_slip_bin_stats` view (13th view; `dist/csv/dem_slip_bin_stats.csv`,
     555 rows) reproduces the notebook to 1e-9 (`tests/test_dem_slip_bin_stats.py`).
     **Shipped 2026-09-13** (rev 1.2): the `Mean ± σ vs slip` sheet joins
     the pooled panel on an 800×1400 dashboard, both retitled to name what
     they summarise. Two departures, both flagged for the author team: the notebook trims
     each class to a hand-picked starting `s`, and reads
     `Convert_Scarp_Dip` from an older table vintage
     (`4_05_24_homogeneous_heterogeneous.csv`) that `DEM_dataset.csv`
     lacks — we use `Scarp_Dip`. Remaining: Michael rebuilds the sheet
     as mean-vs-slip with ±σ envelopes (`internal/PLAN.md`), then the
     site caveat changes from "reconstruction" to "per the original
     code". The earlier text below is kept for the record. She wrote:
     the two parts "make the required dataframes, process the averages and stdev
     per increment of slip, and then group the data into additional
     subgroups", with Figure 8 itself in the final subsection of part 2.
     Her phrase *per increment of slip* pointed at the all-stages
     population (candidate A, the shipped default) rather than final-state
     per trial, but that was an inference from the description and the code
     decided it. Read it, match the population and binning, then either
     drop or sharpen the "this is a reconstruction" caveat on the
     Distributions page. Figure 8 itself (and Fig. 15, whose Kern needles
     D5 follows) sit in the local `legacy/` folder as the visual check.
6. ~~**Static-image embedding**~~ — **done 2026-08-26**: the six
   illustrations are on `figures.md` with the Sage-form citation and a
   figures-specific reuse notice, linked from the crosswalk on `paper.md`;
   the site's open-access framing was narrowed to the typeset article.
   Open remainder: confirm the third-party photographs inside Figs. 1–2
   with Kristen (`DEPLOY.md`); Andreas's light-adaptation idea stays
   deferred. The plan as it stood on 2026-08-20 is kept below.
   (Was lowest priority while rights were unknown.)
   - **Rights: granted, with conditions.** Kristen established from Sage's
     Green Open Access policy that figures from the **Accepted Manuscript**
     may be posted on any website; Andreas confirmed the reading. She sent
     all fifteen pre-typeset figures. The conditions — Accepted Manuscript
     only (never the typeset PDF), free access, non-commercial /
     no-derivatives terms for site users, and a full citation with every
     figure in Sage's stated form — are written out in
     `subprojects/mkdocs/DEPLOY.md` → Figure reuse. Read that before
     building anything here.
   - **Scope: the six non-chart illustrations — Figs. 1, 2, 3, 4, 5, 7.**
     The rule is the clean one `chart-families.md` already implies: every
     *data chart* in the paper is a dashboard, every *illustration* belongs
     on the paper page. The nine data charts stay unpublished — the five
     dashboards are their replacement, and reproducing them would both make
     the site a copy of the paper and pull against the citation notice
     asking readers to cite the paper rather than the site.
     Note this **adds Figs. 3 and 4**, which the crosswalk already lists as
     context illustrations but which never got a placeholder — an
     inconsistency this pass fixes.
   - **Value order** (if the work is split): Fig. 5 (defines the measured
     quantities every dashboard plots — the glossary does this in prose
     today) → Fig. 2 (the six scarp classes are the colour encoding
     site-wide) → Fig. 3 (what a DEM experiment physically is) → Fig. 7
     (illustrates the `Set` control D2 and D5 expose) → Fig. 1
     (motivation: why surface rupture matters) → Fig. 4 (weakest; closest
     to what the dashboards already do).
   - **The work**:
     1. Get the files off Kristen's Drive onto the laptop. All six are
        `.eps` vector; `gs` and `convert` are already installed there.
        Fig. 1 is photographs, so it carries embedded raster and needs
        sensible downsampling; Fig. 5 is a 9 MB source.
     2. Decide the committed format and where it lives — the old plan of
        PNGs in `dashboards/tableau/images/` is **dropped**; these are site
        assets, so `subprojects/mkdocs/docs/` is the home. Watch page
        weight: the site already carries five Tableau embeds.
     3. Replace the four `!!! warning "*Image pending rights
        confirmation*"` blocks in `docs/paper.md`, and add blocks for
        Figs. 3 and 4.
     4. **Attribution and licence plumbing** — the part that is easy to
        under-do. Every figure needs the Sage-form citation beside it, and
        the site needs a figures-specific licence notice: the `copyright`
        line in `mkdocs.yml` currently reads "Dashboards and pipeline
        released under Apache-2.0; the underlying paper is not open
        access", which will be both incomplete and misleading once figures
        appear under NC/ND terms.
     5. Revisit the site's "not open access" framing. It is still true of
        the *typeset* article and must stay accurate, but the blanket
        "reproduces no figures and no extended text" on `index.md` and
        `paper.md` becomes wrong. The distinction to carry: accepted
        manuscript shareable, final published version not.
   - **Deferred**: Andreas's suggestion to lightly adapt the figures for
     site context. Weigh against the fact that an adapted figure is no
     longer the Accepted Manuscript figure whose reuse the policy covers.

Rough estimate: 1–2 sessions per dashboard; the regression dashboard
(#4) carries the data-side lift.

## Data-side work

Additions to `subprojects/python/src/eps_ground_rupture/views.py`,
re-ordered to match the build order:

1. *(for #3)* ~~**`magnitude` in `unified_observations`**~~ — **done**
   (2026-07-31): FDHI per-measurement Mw (−999 sentinel nulled), Kern
   pinned to 7.36, SURE looked up from `config.SURE_EVENT_MAGNITUDES`
   (NBSP-normalized names), DEM NULL. Dashboard 3 gets event labels;
   Dashboard 1 can now gain a magnitude filter.
2. *(for #4)* ~~**`dem_regression` view**~~ — **done** (2026-08-02…04),
   and grew into three views: `dem_regression` (per-dip
   `regr_slope/intercept/r2`; slopes land on sin dip),
   `dem_regression_lines` (two endpoints per dip, for drawable fit
   lines) and `kern_inferred_slip` (the 16 Kern verticals
   back-projected through every dip's fit). SQL-only as planned; Athena
   twins alongside; coefficients pinned by
   `tests/test_regression_views.py`. The optional `Scarp_Height ~ DZW`
   fit was never needed.
3. *(for #5)* ~~**`historic_events` view**~~ — **done** (2026-08-15),
   with a grain revision against nb2 ground truth: **one row per field
   measurement**, not per event (`for x in df_KernNew["DZW"]:
   axvline(x)` — the notebook draws every measurement). Three arms
   (fdhi_measurements / sure / kern_combined), per-column sentinel
   filters, row kept when either measure survives; 2,616 rows pinned by
   `tests/test_historic_events.py`. Optional-table semantics (needs the
   raw-flatfile lane), Athena twin alongside.
4. ~~*(optional)* **`dem_with_bands` view**~~ — skipped (2026-08-15):
   the `fault_dip_band` column (`20–30`, `30–40`, …) is the `Fault_Dip
   Band` calculated field in `dem-distributions-public.twb` instead
   (defined, not yet on a shelf); no view needed.

## Tableau-side scaffolding

- **Calculated fields**:
  - `Source / Event` and `Event` — exist; **consolidate to one** (they
    currently carry conflicting color/shape palettes; see workbook review).
  - `Fault_Dip Band` — exists (Dashboard 5, unused so far); buckets the
    integer dip into ranges for facets.
  - `Scarp_Class Family` — exists (Dashboard 5, unused so far); strips
    the ` Collapse` suffix to collapse `Monoclinal` / `Monoclinal
    Collapse` into one group when desired — not yet offered in `Hue By`
    (see design-review 2026-08-16).
- **Parameters**:
  - `Color By` — exists; make its CASE exhaustive and consider adding
    `Cohesion` / `DEM Set` members.
  - `Row By` / `Col By` — exist (drive the Combinations matrix); reuse
    the same pattern for Dashboard 2's response-curve grid.
  - ~~New for Dashboard 2: an `X Driver` parameter~~ — built as the
    `Driver` parameter (+ the `Driver Value` calc) in
    `dem-response-curve.twb`.
- **Color palettes**: align to the legacy figure where readable:
  - Monoclinal: `#009ffa`; Pressure Ridge: `#f47820`; Simple: `#ed2024`;
    each `_Collapse` variant a darker shade of its parent.
  - Event overlays: distinct from any DEM hue (black/white fills, star
    shapes).

## Publication, citation and hosting (opened 2026-08-20)

Not dashboard work, but it now gates how this project is referenced, so it
belongs in the same plan.

- ~~**Citation notice**~~ — **done** (2026-08-18/20). Every site page
  carries a "How to cite" button opening a modal: "Please cite as:" with
  the *Earthquake Spectra* reference, a pointer to the DesignSafe deposits
  and the field compilations, and an explicit line that a DOI for the site
  or its code identifies the *software* and does not replace those
  citations. Wording single-sourced in
  `subprojects/mkdocs/docs/includes/cite.md`; markup pattern in
  `subprojects/mkdocs/EMBEDS.md`. This is what turned the DOI question from
  a "no" into a "yes" — Kristen's hesitation was precisely that people would cite the
  dashboards instead of the papers.
- ~~**Add the SRL paper to the citation list**~~ — **done 2026-09-10**:
  Chiama, Plesch & Shaw (2025), *SRL* 96(6), 3473–3489, DOI
  10.1785/0220250173 (verified against the PDF and Crossref), in
  `cite.md`, the Data page and README, marked as related work — not a
  source for anything currently on the site. Kristen, 2026-08-20: "maybe
  also list the SRL paper as additional information for now until we decide
  whether or not to post the 3D Case 1–3 models."
- **DOI for the code and site — approved in principle, route not final.**
  Kristen: "I think it would be valuable to add a doi to cite this code so
  users have full access for reproducibility and to set up their own
  interpretations." Two routes on the table:
  - **Zenodo** — Andreas's stated preference ("if RC can manage the
    setup"), and Michael's; mints a DOI from a GitHub release, which suits
    a repo that already builds the site and the data. Gives a concept DOI
    that always resolves to the latest version plus per-version DOIs.
  - **DesignSafe** — keeps everything beside the raw modelling data, but
    Kristen flags it is "really slow to push an update or new version now
    due to the large volumes of data we posted previously". She offered to
    follow up on either route.
  Practical prerequisites either way: **there are no releases and no tags
  yet**, so the first release is the trigger — decide its contents and
  version before cutting it. Worth adding a `CITATION.cff` at the repo root
  (GitHub renders it, Zenodo reads it) so the citation metadata is
  machine-readable and matches the site's modal.
- **Hosting the processed tables** (Andreas's answer) — he agrees "the
  plotting data should be hosted in a more addressable space in addition to
  Tableau", all options acceptable, **Zenodo preferred**. Raw modelling data
  stays on DesignSafe. This dovetails with the standing `TODO.md` item about
  automating raw-input fetching ("mirror the inputs on Zenodo, or script the
  UCLA Dataverse download") — one decision could close both.

## Decisions made

- **Engine (2026-06, historical)**: DuckDB via JDBC for the first pass.
  Superseded in practice — see "Engines in practice" below; DuckDB's
  live role is pipeline-side (views → CSV exports; ADR-0003, ADR-0006).
- **Layout source**: `unified_observations` view for cross-source plots;
  per-source views (`dem`, `fdhi_cleaned`, `sure`, `kern_combined`) for
  single-source plots.
- **Reference figure**: `legacy/FDHI-SURE-DEM-2D-3D-Scatter_ONLY.pdf`
  is the canonical visual target for Dashboard 1; paper Figs. 6, 8,
  13–15 anchor Dashboards 2–5.
- **Priorities (2026-06-10)**: after the response-curve dashboard (#2),
  build per-event boxplots (#3) and regression/inference (#4) ahead of
  the distribution/summary dashboards (#5). Static images last.
- **Tableau Public delivery (2026-07)**: Public can't connect to DuckDB
  or Athena, so each workbook has a `-public` twin fed from CSV exports
  of the views (`egr-csv`); the Google Sheets push (`egr-push-sheets`)
  also exists for `unified_observations` (the full `dem` view exceeds
  the Sheets cell cap). See `dashboards/sheets/README.md`.
- **Engines in practice (2026-07)**: the desktop workbooks connect to
  Athena (AwsDataCatalog, URC Dev; Terraform-provisioned)
  with local `.hyper` extracts; DuckDB remains the local fallback.
  Further AWS/Terraform work is parked, low priority — status and
  revisit triggers in `TODO.md` → Deployment.
- **Author-team review round two (2026-08-20)**: Kristen and Andreas
  answered the open questions from the 08-06 review. Settled: the byline
  is Kristen Chiama, Andreas Plesch, John H. Shaw; figure reuse from the
  Accepted Manuscript is granted under Sage's Green OA terms (see #6 and
  `DEPLOY.md`); Dashboard 3's width axis moves to the paper's 50 m
  criterion with a toggle (see #3); a DOI for the code is wanted, route
  still open; the 40.76 vs 45.8 m DZW discrepancy is left unresolved
  ("might have been cleaned from the dataset… could also just be a typo,
  let's leave it for now"). Still pending: the 3D decision (with John, by
  ~08-28) and a Zoom pass over the plots (she is free next week).
- **Companion site (2026-08)**: MkDocs Material on GitHub Pages
  (ADR-0008, ADR-0009) embeds the published dashboards, so each
  workbook carries (or simply is) a vertically-laid ~800 px-wide
  dashboard for the embed — a `…web` variant where a landscape original
  exists (ADR-0007). Site source: `subprojects/mkdocs/`.

## Open questions

- [x] **Workbook structure**: resolved in practice (2026-06; amended
  2026-08) — one workbook per dashboard family. The June families keep
  desktop + `-public` twins (`dem-model-vs-reality`,
  `dem-response-curve`); the August families are **public-only**
  workbooks authored against the CSV exports directly
  (`per-event-box-plots-public`, `dem-slip-regression-public`,
  `dem-distributions-public`).
  Cross-dashboard filter actions would need tabs merged back into one
  workbook; revisit only if that need materializes.
- [ ] **3D DEM data**: `combinedCases123_v2.csv` (in `data/raw/` since
  2026-08-05, not yet ingested) and `combinedCase4_v2.csv` (still
  missing), both referenced by the prior owner's script. Until they're
  ingested, Dashboard 1 covers the 2D-DEM slice only. Tracked in
  `TODO.md`.
  **2026-08-20 — keep it out for now, but build for a later switch-on.**
  Kristen: "I think this is the right call for now, maybe make it easily
  accessible to turn on if needed later but let me discuss with John
  first. I'll let you know by the end of next week." So: no ingestion
  work yet, and avoid choices that would make adding the 3D arm expensive
  later. Her answer is expected ~2026-08-28 and also governs whether the
  SRL paper becomes a source rather than related work.
- [x] **Magnitude in `unified_observations`**: done (2026-07-31) — the
  view carries event `magnitude` (FDHI per measurement, Kern pinned,
  SURE via `config.SURE_EVENT_MAGNITUDES`), enabling magnitude filters
  on Dashboard 1 and labels on Dashboard 3.

## Related

- `notes/chart-families.md` — canonical chart-type inventory (this
  roadmap's build order references its family numbers).
- `dashboards/tableau/dem-model-vs-reality.twb` — Dashboard 1 + Viable
  Combinations (public twin: `dem-model-vs-reality-public.twb`).
- `dashboards/tableau/dem-response-curve.twb` — Dashboard 2 (public
  twin: `dem-response-curve-public.twb`).
- `dashboards/tableau/per-event-box-plots-public.twb` — Dashboard 3
  (public-only; spec: `dashboard-3-build-spec.md`).
- `dashboards/tableau/dem-slip-regression-public.twb` — Dashboard 4
  (public-only; spec: `dashboard-4-build-spec.md`).
- `dashboards/tableau/dem-distributions-public.twb` — Dashboard 5
  (public-only; spec: `dashboard-5-build-spec.md`).
- `subprojects/mkdocs/` — the companion site the dashboards embed into.
- `dashboards/duckdb/eps.duckdb` — DuckDB views file (pipeline-side;
  desktop Tableau can still connect to it directly).
- `subprojects/python/src/eps_ground_rupture/views.py` — view definitions.
- `TODO.md` — point-in-time chores (raw-FDHI cleaning, 3D DEM data).
- `docs/adr/` — locked architectural decisions backing this work.
