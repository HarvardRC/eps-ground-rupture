# Tableau editing notes

Traps this project has actually hit, with the reason each one bites. They
apply to every workbook; family-specific ones live on the per-dashboard
pages. Read this before your first `.twb` edit — most of these fail
*silently*, which is what makes them expensive.

## Opening and saving

**Open via File → Open or Finder — never the start-page recents.** A recent
entry can resurrect a stale pre-edit session pointing at dead temp
extracts, and then silently overwrite newer on-disk state when you save.

**Never edit a `.twb` while Tableau has it open.** Tableau writes the whole
file on save; your hand edits vanish without a diff.

## Extracts

**Tableau Public requires extract-based sources.** Publishing a live
connection fails with error `3C242D89`.

**Dangling extract paths in a fresh clone are normal.** The `.twb` files
reference `.hyper` files under `~/Documents/My Tableau Repository/` or
`/var/folders/.../tableau-temp/` — machine-private paths that never sync
and, for the temp ones, don't survive a reboot. Accept whatever dialog
option removes the extract, recreate it from the Data Source tab, and
refresh.

**Re-running `egr-csv` changes nothing on screen.** The extract sits
between the CSV and the view. After any pipeline change: open the workbook,
**Data → \<source\> → Refresh**, then republish. Several committed extracts
are months older than the data they shadow.

## Connections

**Connections store absolute paths.** Every text-scan connection hard-codes
`/Users/misha/harvard/projects/github/eps-ground-rapture/dist/csv`. This is
why the local checkout keeps the pre-rename `rapture` spelling even though
the GitHub repo is now `eps-ground-rupture` — renaming the folder would
force a connection repair across four workbooks. Use the canonical path on
every machine (`notes/multi-machine.md`).

**Repair a broken connection by re-picking the same file**, via Data Source
tab → Connections → Edit Connection. Deleting and re-creating the
connection mints a new generated datasource id (`federated.1or8g8o1xpy…`)
and orphans every reference to it — pills, colour encodings, legend zones.

**The relation-embedded `<columns>` block is the authoritative schema** for
a text-scan connection, not the CSV header. A stale one gives SQLSTATE
42703 ("unknown column") or an endless "Preparing data". Update it in
**both** `_.fcp` dual-encoded copies.

**A union of CSVs merges case-variant column names at the field layer** —
one `Slip` even when the files disagree on case. The calculation editor
resolves case-insensitively; trust it. Dashboard 4 depends on this
outright.

## Marks and partitioning

**A green (continuous) pill never partitions marks.** If you need separate
lines, the field must be discrete.

**A discrete *numeric* on Detail may still fail to partition line marks**
in a disaggregated dual-axis pane. The proven fix is a **string**
calculated field on Detail (this is why Dashboard 4's `Point Color` wraps
the dip in `STR()`).

**Aggregate Measures off is invisible in the XML.** Pills are always
serialised with a `sum:` prefix; the workbook-level `<aggregation
value='false'/>` is what makes them row-level. Every scatter and boxplot
in this repo relies on it. Re-ticking Analysis → Aggregate Measures
collapses a 346k-point cloud to a handful of marks.

**Fresh drags serialize `sum:`-flavored field references.** That's normal,
not a bug.

**Box plots are reference lines, not a mark type** — `<reference-line
scope='per-cell' boxplot-whisker-type='standard'>`. `formula` and
`probability` on that element are inert boilerplate.

**Tableau writes no `<column>` element for a field it has never
customised.** Fields can therefore be visible *by absence*, and a naive
scan of `<column>` elements will miss them. Derive visible sets by
subtracting the hidden count from the CSV width.

## Layout and z-order

**Z-order of overlapping mark layers follows the colour-legend order** —
top of the legend draws in front. **Pane stacking order follows the Rows
pill order.**

**Dashboard zone geometry is XML-editable** (`x`/`y`/`w`/`h` in 1/100000
units) — but patch every duplicate-encoded copy.

**Datasource XML is an ordered content model.** Inserting an element in the
wrong position gives `D2E8DA72` ("element not allowed for content model").

## Sorting

**The Sort dialog defaults to Sum aggregation.** For per-measurement
quantities like magnitude, that is wrong — use Maximum. A sheet with no
sort element at all silently falls back to alphabetical.

## Publishing

**Publishing uploads the whole workbook**, every tab, not just the one
you're looking at.

**The active tab at save time becomes the default view.** Click the tab you
want as default before **File → Save to Tableau Public As…**.

**Tabs on/off is a per-workbook publish setting**, and embeds are
unaffected by it — the site passes `hide-tabs`.

**Slugs come from dashboard names**, keeping only alphanumerics and
hyphens: `DEM Response Curves (web)` → `DEMResponseCurvesweb`; `Slip
Regression & Kern Inference` → `SlipRegressionKernInference`. Renaming a
dashboard silently changes the slug and breaks the site embed.

**HTTP status cannot verify a slug** — a nonsense view name also returns
200. Use `https://public.tableau.com/profile/api/single_workbook/<workbook>`.
The thumbnail endpoint works too but lags a republish and is flaky; fetch
it at least three times before concluding anything.

**Save locally after publishing**, so the committed `.twb` matches what is
live.

## Embeds

The site's `data-width`/`data-height` must equal the dashboard's `<size>`
exactly. `tableau-fit.js` scales by `min(cap, wrapper width / data-width)`
and clips the wrapper to `data-height × scale` — a stale number leaves a
dead band or a cut-off bottom edge. `subprojects/mkdocs/EMBEDS.md` is the
authoritative map.

**`(web)` variants are hand-duplicated dashboards, not device layouts.**
Every edit to a landscape original must be repeated in its `(web)` twin by
hand, including copies of any actions.
