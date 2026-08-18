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

## The "How to cite" button

Every page carries the citation notice as one modal, opened from as many
buttons as that page wants. Two pieces, and both are needed:

1. **The text**, included exactly once per page — conventionally at the
   foot, after "Where to go next" and before the footnote definitions.
   Which include depends on where the page sits:

    ```markdown
    --8<-- "includes/cite-root.md"   ← pages at the docs root
    --8<-- "includes/cite-sub.md"    ← pages one directory down (dashboards/)
    ```

2. **A button**, written inline wherever one is wanted, any number of times:

    ```html
    <button class="cite-open" type="button">How to cite</button>
    ```

`docs/javascripts/cite-modal.js` moves the included block into a `<dialog>`
appended to `<body>` and points every button on the page at it, so the
wording lives in one file however many buttons a page carries.

Current placement: every page puts one button under its H1 and one at the
foot; dashboard pages add one on the escape-hatch line beneath each embed.

### Why two includes

All the wording lives in `includes/cite.md`, which no page includes
directly. The one thing that cannot be shared is the link to the Data page,
because a relative path differs by depth — `data.md` from the root,
`../data.md` from `dashboards/`. So that link is written in the shared file
as a **reference**, `[How to cite this data][cite-data-page]`, and each
wrapper supplies nothing but the matching definition:

```markdown
--8<-- "includes/cite.md"

[cite-data-page]: data.md#how-to-cite-this-data
```

Reference definitions are collected document-wide, and snippets are textual
inclusion, so the definition from the wrapper resolves the usage inside the
shared file. Adding a page at a third depth means one more two-line wrapper,
never a second copy of the wording.

Notes:

- **A button on an escape-hatch line goes inside that line**, after the link
  and its `{ .embed-fallback }` attribute list, so the two share a paragraph
  and sit side by side. Standalone buttons are wrapped in
  `<p class="cite-open-row">…</p>` for spacing.
- **Include the text once.** A second include on the same page is dead
  markup — the script wires the first block it finds that is not already
  inside a dialog.
- **A button without the include does nothing.** The script leaves it
  unbound rather than opening an empty dialog.
- **Use the wrapper that matches the page's depth.** The wrong one leaves
  the Data-page link unresolved, which `mkdocs build --strict` reports.
- **JavaScript off is a supported state.** `extra.css` hides the buttons
  until the script adds `cite-js` to `<html>`, and a `<noscript>` rule in
  the shared file reveals the citation in place — a reader sees the text
  inline and no buttons, never a button that does nothing.
- **Do not write the snippet directive inside an HTML comment.** The
  snippets extension matches it there too, and it expands silently.

## View ↔ page ↔ size mapping

What each page embeds, and where its escape hatch points. Sizes are the
dashboards' true fixed sizes, read from `<dashboard>/<size>` in the
committed workbooks (last re-checked 2026-08-18) — never guessed.

| Page | Embedded view | `data-width` × `data-height` | Escape hatch links to |
|---|---|---|---|
| `model-vs-reality.md` | `dem-model-vs-reality-public/DEMCloudHistoricOverlaysweb` | 800 × 1200 | `Dashboard1DEMCloudHistoricOverlays` (landscape original) |
| `model-vs-reality.md` | `dem-model-vs-reality-public/ViableCombinations` | 1000 × 800 | itself (no web variant; the fit wrapper scales it) |
| `response-curves.md` | `dem-response-curve-public/DEMResponseCurvesweb` | 800 × 1000 | `DEMResponseCurves` (landscape original) |
| `per-event-boxplots.md` | `per-event-box-plots-public/Per-EventBoxplotsModelvsField` | 800 × 1200 | itself (resized in place — it *is* the web layout) |
| `per-event-boxplots.md` | `per-event-box-plots-public/Per-EventBoxplotsVSSUREweb` | 800 × 2000 | `Per-EventBoxplotsVSSURE` (1200 × 1200 original) |
| `slip-regression.md` | `dem-slip-regression-public/SlipRegressionKernInference` | 800 × 850 | itself (single dashboard, already portrait) |
| `distributions.md` | `dem-distributions-public/DistributionsSummaryweb` | 800 × 1200 | itself (single dashboard, already portrait) |

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
leaves either a dead band below the viz or a clipped bottom edge. Six of
the seven embedded dashboards carry `sizing-mode='fixed'`; `Viable
Combinations` has no `sizing-mode` attribute at all, but its `<size>` pins
min and max to 1000 × 800, so it is fixed in effect.

Then re-verify each slug per the section above — a renamed dashboard silently
changes its slug.
