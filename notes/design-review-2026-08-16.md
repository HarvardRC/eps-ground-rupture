# Design review — five dashboards + companion site (2026-08-16)

> Method: the dataviz design procedure (form → color-by-job → validated
> palette → mark specs → interaction → accessibility), applied against
> ADR-0007's paper-fidelity constraint. Rendered inspection via browser
> (all seven embeds render — the standing click-test PASSED today; D3's
> first embed lazy-paints ~10 s after scroll-into-view). Palette checks
> are computed, not eyeballed (validator output at bottom).

> Outcome (2026-08-18): Priority A 1–7 and 9 shipped, 8 partly (annotation
> relabeled "Dip-30 fit: …", still frozen; parameter retitled); all of
> Priority C shipped (d5d46f7, d5e97fe, a62db9c, 04da4e0, 8770835). Open:
> the `Hue By` family option; Priority B's filter wall, `Point Color` CASE
> and legend aliases (the map's latitude filter already exists).

## The one systemic finding

**The site's dashboards do not share one visual system.** D3/D5 (August
builds) speak the paper's language — the six nb2 class hexes, black
event overlays, restrained grids. D1/D2 (June builds) predate that
identity: D1 colors classes in washed-out defaults with a separate
`Point Color` legend (Null listed first), D2 is a single undifferentiated
pale-blue mass. The single highest-leverage change is adopting the
canonical palette and conventions in D1/D2 — after which all five read
as one publication. `docs/dashboards/visual-identity.md` (new, alongside
this review) is the codified target.

## Priority A — XML quick wins (Claude's lane, closed workbooks)

1. **D1 scatter: adopt the six canonical class hexes** for `Point Color`
   (at ~55–65 % opacity over white), Null → neutral gray, legend order =
   paper order. Kills the washed-out stripes and matches D3/D5.
2. **D1: remove the pooled gray trend line** (Roadmap's own call:
   "per-color or remove" — one OLS through a class-striped cloud implies
   a relationship the page never defends; D4 owns regression).
3. **D1: hide the duplicate right axis header** ("Overlay Scarp_Height"
   — same scale as the left; two printed axes for one scale is noise).
4. **D1: axis title case** — "Dzw" → "Deformation Zone Width (m)";
   left axis "DEM Scarp_Height" → "Scarp Height (m)".
5. **D2: adopt class hexes + drop cloud opacity** (~30–40 % — 333k marks
   at near-solid blue is a silhouette, not a distribution); fit-line
   overlays to full-strength class color or black per identity note.
6. **D2: axis titles** — "Driver Value"/"Response Value" are generic;
   bind titles to the Driver parameter (calc-driven caption) or at
   least "Driver (Slip m / Magnitude)".
7. **D3: tick `boxplot-mark-exclusion`** ("hide underlying marks except
   outliers") on both DEM boxplot sheets — ~330k marks × 2 today; the
   single largest known performance cost (TODO's promoted item).
8. **D4: replace the frozen annotation** `y = 0.502·x − 0.005 (R² 0.999)`
   with a parameter-aware caption (it currently shows the dip-30
   equation at every parameter position — quietly wrong at 45°), and
   retitle the parameter "Kern Dip (measured: 30°)" — q9's framing;
   "Assumed" contradicts the site's own text.
9. **D5: drop `Null` from the sheet-2 color legend** (black chip in the
   published legend; the excluded row's legend entry survived) and
   thin the needle mark if the SH view still reads as a forest after
   review (matter of taste — flag, don't force).

## Priority B — Tableau-hand work (Michael, one sitting with republish)

- D1 **map**: latitude non-null filter (79 points queried from 333k
  rows — perf; a datasource/context filter is safer clicked than
  XML-injected).
- D1 **filter wall**: collapse the right rail — Event + Source overlap
  (Source ⊃ Event); keep Source, Fault Dip, Scarp Class; drop the
  duplicated stack on the Combinations sheet (Col By/Row By + six
  filters repeat there).
- D1 `Point Color` CASE: make it exhaustive ('0 none' coverage bucket
  included) per Roadmap.
- Spot-check each republished dashboard at embed width (800) — legend
  truncation ("Monoclinal …", "Pressure Ri…") argues for shorter alias
  labels ("Mono. Collapse", "PR Collapse") — rename via legend aliases,
  not data.

## Priority C — site (small, optional)

- The site itself is strong: prose-first pages, glossary tooltips,
  restrained Material theme. Keep.
- **Embed loading skeleton**: D3's first embed sits as a large white
  void for ~10 s before painting. Add a lightweight
  "Loading dashboard …" placeholder (CSS on `.tableau-fit`:
  centered muted text + min-height already reserved).
- **Home page**: text-only above the fold. Optional: a compact
  "five dashboards" card row (title + one-line question each) linking
  onward — the crosswalk table already exists lower down; this is
  taste, not correctness.
- **Dark mode**: Material toggle exists but Tableau embeds stay
  white — either pin the site to light mode or add a one-line note
  near embeds ("dashboards render in light mode"). Cheap honesty.

## The palette verdict (computed, 2026-08-16)

`validate_palette.js` on the six paper hexes over the site surface:

- PASS lightness band; PASS chroma floor.
- **FAIL CVD separation**: `#ed2024` (Simple) ↔ `#af773e` (PR Collapse)
  ΔE 2.9 under deuteranopia — near-identical for red-green-blind
  readers, and these classes genuinely overlap in the layered
  histograms.
- **FAIL normal-vision floor**: `#f47820` ↔ `#af773e` (the Pressure
  Ridge parent/child pair) ΔE 12.2 — hard to separate even with full
  color vision. (The pairing is *deliberate* shading; the price is
  real.)
- WARN contrast: `#009ffa`, `#f47820` below 3:1 on white — tooltips and
  labeled axes are the required relief (present on all five).

**Recommendation — fidelity first, with an accessible off-ramp:** keep
the paper hexes as the canonical identity (ADR-0007's fidelity mandate;
these are the published figures' colors), and mitigate rather than
repaint: (a) D5's `Hue By` gains a **"Scarp Class Family"** option
(collapse variants folded into parents — three well-separated hues) as
the accessible view, one dropdown away; (b) legend aliases + tooltips
carry identity redundantly (never color alone); (c) the caveat is
recorded in the identity note. Repainting the collapse steps to pass
CVD outright is possible (snap-to-passing within each hue) but breaks
figure fidelity — **Kristen's call if wanted, fold into q10.**

## Not touched (deliberate)

D4's warm dip ramp (ordered hues for an ordered variable — correct as
is); D3's log axis (documented deviation, pending q3); D5's
counts-vs-probability (documented deviation, pending q8); the paper
palette itself (above).
