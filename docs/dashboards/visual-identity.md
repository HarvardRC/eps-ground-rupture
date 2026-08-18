# Visual identity — the one system all dashboards follow

Codified 2026-08-16 (extends ADR-0007's "paper palette, web variants,
interactivity baseline"). Every workbook and site page conforms to this
note; deviations get a documented reason next to them. Companion review:
`notes/design-review-2026-08-16.md`.

## Scarp-class palette (canonical, from the paper's own figures)

Verbatim from nb2's seaborn palette; alphabetical class order = paper's
parent-then-collapse grouping = legend and stacking order everywhere.

| Class | Hex | Class | Hex |
|---|---|---|---|
| Monoclinal | `#009ffa` | Monoclinal Collapse | `#3f67b1` |
| Pressure Ridge | `#f47820` | Pressure Ridge Collapse | `#af773e` |
| Simple | `#ed2024` | Simple Collapse | `#9f1d20` |

Rules: hard-coded hexes entered per field (color maps stick to fields);
**never Assign Palette**; Null/unclassified → neutral gray, listed last
or excluded; class fills at 55–65 % opacity when layered over white,
100 % for point/circle marks.

**Known accessibility caveat (computed 2026-08-16):** `#ed2024↔#af773e`
fails color-vision-deficiency separation (deutan ΔE 2.9) and the
Pressure Ridge parent/child pair sits below the normal-vision
distinguishability floor (ΔE 12.2). Accepted for figure fidelity.
Mitigations that MUST ride along wherever classes overlap: legend +
tooltip identity (never color alone), and where offered, a
"Scarp Class Family" hue option folding collapse variants into parents
(three well-separated hues). Repainting the collapse steps is a
Kristen-level decision (q10), not a workbook-level one.

## Event / field overlays

Field data is always **black on the model's color**: black stars /
filled shapes for event markers (D1, D4), thin black full-height
needles (D5), grey-blue restrained boxes (D3). Event labels compose
"Name (M x.x)" from data — never hand-typed magnitudes.

## Ordered variables

Fault dip (and any ordered driver) uses a single-hue ordered ramp
(D4's warm flare: 20° light → 70° dark), never categorical hues. Fit
lines drawn from data (`dem_regression_lines` pattern), black.

## Axes, titles, annotations

Axis titles are physical quantities with units — "Scarp Height (m)",
"Deformation Zone Width (m)" — never column names ("Dzw",
"Response Value"). One printed axis per scale (dual-axis constructions
hide the secondary header). Annotations must be data- or
parameter-driven; frozen text that a control can contradict is a defect
(the D4 lesson).

## Dashboards (web variants)

Fixed ~800-wide portrait, title zone → chart(s) → parameter controls in
the right rail or between charts; filter rails carry only
non-overlapping controls (drop subset-duplicates like Event ⊂ Source);
whole-workbook publish with the web dashboard as active tab. Legend
aliases short enough to survive the 800-px rail without truncation.

## Site

Light Material theme; embeds are the page's single visual — prose
before, provenance after, escape-hatch link below (EMBEDS.md pattern is
authoritative for markup). Embeds render light-mode regardless of site
theme. Loading skeleton text on `.tableau-fit` while Tableau paints.
