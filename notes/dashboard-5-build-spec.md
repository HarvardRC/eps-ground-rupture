# Dashboard 5 build spec — distributions & summary stats (families 3 + 4)

> Drafted 2026-08-15 (session 5, laptop) from `notes/chart-families.md`,
> `notes/Roadmap.md` → Build order #5 / Data-side #3, the paper's figure
> captions, and candidate statistics computed from the shipped `dem` data
> (2026-08-15 rebuild). Working doc — update as decisions land.
> Click-by-click companion: `notes/2026-08-15/dashboard-5-tableau-walkthrough.md`.

**Questions.** Family 3: *what is the spread of each output, and which
input parameter shifts it?* Family 4: *what are the typical values and
spreads per scarp class, at a glance?* One public-only workbook covers
both (the 2026-08 convention: authored directly against the CSV exports).

**Visual anchors.** Figs. 9–12 (histograms of one output, hue = one model
parameter; nb1 cells 11–20, nb2 14–16), Fig. 15 (the same as probability,
with historic-event reference lines; nb2 cell 25), Fig. 8 (mean ± σ per
scarp class — **no notebook code exists**; Kristen is searching, q8. The
reconstruction candidates below fill in until then).

## Populations and variables (ground truth)

- Histogram variables: `Scarp_Height`, `DZW`, `Scarp_Dip` (dem view).
- Hues (one per paper panel): `Scarp_Class`, `Density`, `Depth`,
  `Fault_Dip`, `Sediment_Strength`, `FS_depth`/`UnrupturedSed`.
- Mean ± σ measures (Fig. 8): scarp height, `Us - Ud`, DZW, scarp dip,
  per scarp class incl. `_Collapse` variants (six classes).
- Historic reference lines (Fig. 15 flavor): one thin vertical line per
  field **measurement** (Kern County, Wenchuan, Kashmir, Killari by
  default — see O5) → needs `historic_events`.

## Data-side work (Claude's lane)

1. **`historic_events` view** (Roadmap Data-side #3, grain revised
   2026-08-15 — see O1, resolved): **one row per field measurement**,
   `(source, eq_name, dzw, scarp_height, magnitude)`. nb2 draws one
   `axvline` per measurement value (`for x in df_KernNew["DZW"]`), so
   within-event spread is part of the figure — per-event aggregates were
   the Roadmap's sketch, rejected against that ground truth. Arms: the
   **FDHI flatfile** (`fdhi_measurements`, not the 19-row `fdhi_cleaned`
   — the labelled events only exist in the full flatfile), SURE, Kern.
   Per-column sentinel filter (`CASE WHEN x > 0`), row kept when *either*
   measure survives — unlike `unified_observations`, which needs both.
   View exists only alongside `fdhi_measurements` (optional-table
   semantics). Pinned populations (computed 2026-08-15): FDHI 2,392 +
   SURE 203 + Kern 21 = **2,616 rows**; FDHI Wenchuan 250 / Kashmir 140 /
   Killari 3; Kern 11 dzw + 16 scarp_height. Athena twin alongside per
   the established pattern (lane stays parked).
2. **CSV export**: add `historic_events` to `csvViews` in
   `build.gradle.kts` (the per-view task auto-registers) — tiny file,
   feeds the workbook union.
3. **Tests**: `tests/test_historic_events.py` in the
   `test_regression_views.py` style — pin row count and the Fig-15 trio
   (Kern / Wenchuan / Kashmir) values exactly once the view first builds.
   Add a Fig-8 pin only after O2 resolves.
4. **Skipped**: `dem_with_bands` view — `Fault_Dip Band` is a Tableau
   calculated field instead (Roadmap's own alternative).

## Fig-8 reconstruction candidates (computed 2026-08-15, shipped dem.csv)

Two defensible populations; the paper's method is unknown until q8.
Sample SD; `n` varies slightly where cells are empty (`Scarp_Dip`).

**A — all rows pooled** (matches how Figs. 9–12 pool steps):

| Class | SH mean±σ | DZW mean±σ | Dip mean±σ | Us−Ud mean±σ | n |
|---|---|---|---|---|---|
| Monoclinal | 1.527±1.036 | 6.988±4.872 | 16.98±9.43 | −0.036±0.118 | 178,036 |
| Monoclinal Collapse | 2.834±0.875 | 7.835±3.351 | 22.34±9.44 | −0.027±0.072 | 42,752 |
| Pressure Ridge | 1.538±0.706 | 14.752±8.043 | 17.68±9.26 | 0.456±0.250 | 56,150 |
| Pressure Ridge Collapse | 2.052±0.759 | 15.897±7.688 | 17.95±8.86 | 0.562±0.302 | 25,873 |
| Simple | 2.801±0.982 | 2.867±1.675 | 63.62±13.86 | −0.006±0.064 | 18,058 |
| Simple Collapse | 3.240±0.750 | 3.776±1.976 | 74.85±12.22 | −0.007±0.068 | 12,290 |

**B — final state per trial** (row at max `Slip` per `Trial`; `Trial` is
globally unique — 3,434 trials, verified against the composite key):

| Class | SH mean±σ | DZW mean±σ | Dip mean±σ | Us−Ud mean±σ | n |
|---|---|---|---|---|---|
| Monoclinal | 3.487±0.629 | 12.021±4.087 | 18.54±4.88 | −0.027±0.113 | 1,127 |
| Monoclinal Collapse | 3.959±0.561 | 9.601±3.202 | 24.39±8.73 | −0.024±0.080 | 836 |
| Pressure Ridge | 2.710±0.419 | 19.010±8.786 | 18.37±6.22 | 0.664±0.309 | 447 |
| Pressure Ridge Collapse | 3.004±0.517 | 18.174±6.868 | 20.78±7.10 | 0.743±0.363 | 396 |
| Simple | 4.277±0.498 | 3.637±1.764 | 64.65±13.29 | 0.011±0.080 | 279 |
| Simple Collapse | 4.142±0.520 | 4.610±2.264 | 77.13±10.97 | 0.004±0.080 | 349 |

Sanity: pressure ridges alone carry positive Us−Ud (~0.5–0.7) — the
hanging-wall material piles up; monoclinal/simple sit at ≈0. B's means
run higher than A's (scarps grow over a run) — both are "right", they
answer different questions. **Default the sheet to A** (consistency with
the pooled histograms), expose B via a `Population` parameter, and pin
whichever variant Fig. 8 turns out to be once Kristen's code surfaces.

## Tableau side (Michael's lane — see the walkthrough)

Public-only workbook, proposal: `dashboards/tableau/dem-distributions-public.twb`
(rename freely; tell Claude what you pick). Data source: **union** of
`dist/csv/dem.csv` + `dist/csv/historic_events.csv` (canonical path!),
the D4 pattern — `Table Name` discriminates layers; the union should
merge the case-variant column pairs (`DZW`/`dzw`, `Scarp_Height`/
`scarp_height`) into single fields, which is exactly what the event
overlay wants. Two sheets: parameter-driven faceted histogram
(`Measure` × `Hue By`, historic verticals overlaid) and the mean ± σ
summary (AVG circle + `AVG±STDEV` band per class). Palette — the six
canonical hexes, verbatim from nb2's seaborn palette (alphabetical class
order; pinned 2026-08-15): Monoclinal `#009ffa`, Monoclinal Collapse
`#3f67b1`, Pressure Ridge `#f47820`, Pressure Ridge Collapse `#af773e`,
Simple `#ed2024`, Simple Collapse `#9f1d20`; event overlays black
(existing convention, hard-coded hexes — never Assign Palette). Web
variant ~800×1200 + full-size landscape, per ADR-0007.

## Publication lane (Claude drafts, Michael reviews/commits)

Site page `subprojects/mkdocs/docs/dashboards/distributions.md` + dev
twin `docs/dashboards/distributions.md` (matching filenames, per
`docs/dashboards/README.md`); nav entry after Slip regression in
`mkdocs.yml`; embed per `subprojects/mkdocs/EMBEDS.md` (one pattern,
verbatim, `data-width`/`data-height` = the true fixed size); flip the
README status table row; Roadmap/TODO strike-throughs. Strict mkdocs
build → PR → merge (deploy queues behind PR builds by design; verify by
published content).

## Order of execution

1. ~~Michael greenlights this spec~~ (2026-08-15, by starting the build).
2. ~~Claude: `historic_events` view + export wiring + pinned test~~ done.
3. ~~Michael: build + export; Claude verifies~~ done — pins exact.
4. ~~Michael: Tableau walkthrough → publish~~ done — published
   2026-08-15 19:27 EDT, rev 1.0, slug `DistributionsSummaryweb`.
   (Default view landed on the `Distributions` worksheet — republish
   with the dashboard tab active when convenient.)
5. ~~Claude: site pages + embeds + docs table flips~~ done — awaiting
   Michael's strict build + review.
6. Michael: review, commit (`MAB` + four spaces), PR → main; verify the
   live pages by content.
7. Status doc + Roadmap updates; A6/Kristen follow-ups fold in q8/q10.

## Open questions

- [x] **O1** — RESOLVED 2026-08-15 against nb2 ground truth: reference
  lines are **per-measurement**, not per-event statistics (`for x in
  df_KernNew["DZW"]: axvline(x)`), so the view ships raw measurement
  rows and the dashboard draws one thin line per value. No statistic to
  choose; nothing to escalate. Caveat recorded: nb2 also labels
  **Bohol**, whose flatfile rows carry neither `fzw` nor `vs` central
  values — its notebook lines used a measure outside our two, so Bohol
  is deliberately absent here.
- [ ] **O2** — Fig-8 population: candidate A vs B above (or something
  else entirely). Await q8; until then A is the shown default.
- [ ] **O3** — DZW histogram x-axis: linear vs log. D3 precedent: full
  unrestricted range on a fixed log axis, documented deviation from the
  paper's 50 m criterion — and Kristen's q3 answer (leaning 50 m default
  with full-range opt-in) may flip both D3 and this. Build with the D3
  convention; revisit together with A4.
- [ ] **O4** — bin widths: parameterized `Bin Size` with per-measure
  defaults (SH 0.25 m, DZW 1 m, dip 5°) until checked against the
  typeset figures.
- [ ] **O5** — events shown by default: nb2 cell 25's labelled set that
  our measures support — Kern County (Kern arm, = `df_KernNew`),
  Wenchuan, Kashmir, Killari (FDHI arm) — with the full event list one
  filter away. Note Wenchuan/Kashmir also exist in the SURE arm; default
  to the FDHI rows (nb2's source) and let `source` disambiguate.
