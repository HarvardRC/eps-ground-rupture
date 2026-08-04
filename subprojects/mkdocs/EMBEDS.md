# The Tableau embed pattern

One pattern, used verbatim by every dashboard page. Changing only `src`,
the sizes and the escape-hatch target. Don't introduce a second one.

The site embeds the **narrow "(web)" dashboard variants** (~800 wide) built
for this purpose, not the landscape originals — see the mapping table below.
Under each embed sits a one-line link to the full-size dashboard on Tableau
Public, so the richer original stays one click away.

The shared parts are single-sourced:

- **The Embedding API v3 module script** is declared once in `mkdocs.yml`
  under `extra_javascript`, so it loads site-wide and every page gets the
  `<tableau-viz>` custom element. No page carries a `<script>` tag.
- **The scale-to-fit behaviour** lives once in
  `docs/javascripts/tableau-fit.js`.
- **The container styling** lives once in `docs/stylesheets/extra.css` as
  `.tableau-fit` / `.embed-fallback`, alongside the widened `.md-grid`.

Only the per-view markup is per-page, because `src` and the published pixel
size genuinely differ:

```html
<div class="tableau-fit" data-width="800" data-height="1200" markdown="0">
  <tableau-viz src="https://public.tableau.com/views/<workbook>/<view>"
    width="800" height="1200"
    toolbar="bottom" hide-tabs></tableau-viz>
</div>
```

followed by a plain Markdown line (not raw HTML, so it works with
JavaScript off):

```markdown
[Open full-size on Tableau Public](https://public.tableau.com/app/profile/michael.bouzinier/viz/<workbook>/<original-slug>){ .embed-fallback }
```

Notes:

- **`data-width` / `data-height` must be the dashboard's true fixed size**
  (see the table below). The script scales by
  `min(cap, wrapper width / data-width)` and sets the wrapper height to
  `data-height × scale`, so a wrong value scales or clips wrongly. The same
  numbers are repeated as the viz's own `width`/`height` so the component
  renders at its native size before the transform is applied.
- **The embeds scale up as well as down.** The web variants are ~800 wide
  and the content column is wider than that, so without upscaling they sat
  in a pool of whitespace. The trade-off: the viz lives in an iframe, so an
  upscale resamples its output and text softens slightly. Add
  `data-max-scale="1.2"` to a wrapper to cap it — worth doing for a
  dashboard that looks fuzzy, or for a very tall one where filling the
  width also multiplies the height (the 800 × 2000 VS & SURE variant
  becomes ~2750px tall at a 1100px column). Default cap is 1.6.
- **The escape-hatch link sits outside the wrapper.** The script clips the
  wrapper to the scaled viz height, so anything else inside it would be
  hidden.
- `markdown="0"` keeps the Markdown parser out of the raw HTML block
  (`md_in_html` is enabled for other reasons).
- `hide-tabs` matches how the workbooks were published — tabs are off, so
  each view is addressed by its own direct URL rather than through a tab
  strip.
- Each dashboard page also sets `hide: [toc]` in its front matter, so the
  embed gets the full content column.

## View ↔ page ↔ size mapping

What each page embeds, and where its escape hatch points. Sizes are the
dashboards' true fixed sizes, read from `<dashboard>/<size>` in the
committed workbooks (2026-08-04) — never guessed.

| Page | Embedded view | `data-width` × `data-height` | Escape hatch links to |
|---|---|---|---|
| `model-vs-reality.md` | `dem-model-vs-reality-public/DEMCloudHistoricOverlaysweb` | 800 × 1200 | `Dashboard1DEMCloudHistoricOverlays` (landscape original) |
| `model-vs-reality.md` | `dem-model-vs-reality-public/ViableCombinations` | 1000 × 800 | itself (no web variant; the fit wrapper scales it) |
| `response-curves.md` | `dem-response-curve-public/DEMResponseCurvesweb` | 800 × 1000 | `DEMResponseCurves` (landscape original) |
| `per-event-boxplots.md` | `per-event-box-plots-public/Per-EventBoxplotsModelvsField` | 800 × 1200 | itself (resized in place — it *is* the web layout) |
| `per-event-boxplots.md` | `per-event-box-plots-public/Per-EventBoxplotsVSSUREweb` | 800 × 2000 | `Per-EventBoxplotsVSSURE` (1200 × 1200 original) |

Tableau derives a view slug from the dashboard name by keeping
alphanumerics and hyphens and dropping everything else — spaces, `&`, em
dashes, parentheses. Hence `DEM Cloud & Historic Overlays (web)` →
`DEMCloudHistoricOverlaysweb`. **Rename a dashboard and its slug changes,
breaking the embed**, so re-verify after any rename or re-publish.

## Verifying a slug is live

Two endpoints, in order of reliability:

1. `https://public.tableau.com/profile/api/single_workbook/<workbook>`
   returns the workbook's `defaultViewRepoUrl` — authoritative, but only for
   the workbook and its *default* view.
2. `https://public.tableau.com/thumb/views/<workbook>/<view>` returns a
   ~1,163-byte placeholder PNG for a view that does not exist and a large
   rendered PNG for one that does.

Caveats learned the hard way, both of which will mislead you:

- **The thumbnail endpoint is flaky and lags a re-publish.** It has returned
  the placeholder for views that demonstrably exist, sometimes for several
  minutes after a workbook is republished while Tableau regenerates
  thumbnails. Fetch at least three times before concluding anything, and
  cross-check against the workbook API.
- **HTTP status proves nothing.** `…/views/<workbook>/<anything>` and
  `…/app/profile/<user>/viz/<workbook>/<anything>` both return 200 and both
  resolve for a nonsense view name, so neither status nor the redirect
  target discriminates. So does `…/static/images/…`, which serves a 70-byte
  stub for everything.

## After a re-publish

Re-check the sizes in the mapping table above against
`<dashboard>/<size>` in the committed workbook and update the `data-*`
attributes to match. The scale factor derives from them, so a stale value
leaves either a dead band below the viz or a clipped bottom edge. All five
dashboards are `sizing-mode='fixed'`.

Then re-verify each slug per the section above — a renamed dashboard silently
changes its slug.
