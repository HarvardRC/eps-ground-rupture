# Deploying the companion site

**Live.** The site publishes at
`https://harvardrc.github.io/eps-ground-rupture/` via
`.github/workflows/mkdocs.yml` (GitHub Actions → Pages; Pages Source =
"GitHub Actions"; first successful deploy 2026-08-05).

The repository is public, so **GitHub Pages served from this repo** is the
chosen path (ADR-0009): no extra hosting, and the site rebuilds from the
same commit as the pipeline that produced its data.

## Publishing model

- **Push or merge to `main`** touching `subprojects/mkdocs/**`, the
  poetry files, or the workflow itself → strict build → deploy.
- **Pull requests** touching the same paths run the same `--strict`
  build as a validation check — **no deploy**.
- **Manual**: `workflow_dispatch` (Actions → "Companion site" → Run
  workflow). The `github-pages` environment only permits deploys from
  `main`, so a dispatch from another branch builds without deploying.
- Pushes to other branches trigger nothing.

The `--strict` build is the gate: a broken internal link or a bad config
fails the run rather than publishing a damaged site. The workflow grants
`pages: write` / `id-token: write` to the deploy job only.

## Fallback: manual `gh-deploy`

MkDocs can push a built site straight to the `gh-pages` branch:

```bash
source /opt/python/venvs/eps-ground-rapture/bin/activate   # or your venv
cd subprojects/mkdocs
mkdocs gh-deploy --strict
```

This force-pushes the built site to `gh-pages` and requires
**Settings → Pages → Source** to be set to *Deploy from a branch →
`gh-pages`*, which is mutually exclusive with the Actions path above. Use it
for a one-off preview; prefer Actions for anything ongoing, because
`gh-deploy` publishes whatever is in your working tree with no review step
and no record of which commit produced it.

## Author-team decisions

Both questions that stood here were answered on 2026-08-20.

### The byline — settled

**Kristen Chiama, Andreas Plesch, John H. Shaw**, confirmed by Kristen:
"let's go with this author list as these are the primary contributors to the
data, resources, and figures." The earlier candidates — William Bednarz and
Robb Moss (the paper's other two authors) and Michael Bouzinier (pipeline
and dashboards) — were considered and not added. The names live in
`mkdocs.yml` (`copyright`) and `docs/index.md` ("Site authors"); keep the
two in step.

### Figure reuse — granted, with conditions

Figures from the **Accepted Manuscript** may be reproduced on this site.
Kristen established this from Sage's Green Open Access policy for authors
(*Earthquake Spectra*; Sage's terms are taken to still hold under Wiley,
which took over hosting in 2026), and Andreas independently confirmed the
reading. She supplied all fifteen pre-typeset figures.

What the policy permits: an author may share the Original Submission or
Accepted Manuscript "at any time after your paper is accepted and in any
format", explicitly including "posting a downloadable copy on any website".

The conditions it attaches, all of which this site must honour:

- **Accepted Manuscript only.** The Final Published PDF may not be posted on
  any unrestricted website without Sage's permission — so the typeset
  figures stay off the site. What we publish are Kristen's pre-typeset
  originals.
- **Free access.** No paywall, no registration. (Satisfied — GitHub Pages.)
- **Non-commercial, no derivatives** re-use terms bind *users of the site*.
  The figures therefore cannot ride on the site's Apache-2.0 licence, which
  covers the dashboards and pipeline only; they need their own notice.
- **Full citation with every figure**, in Sage's stated form: *Author(s),
  Contribution Title, Journal Title (Volume and Issue) pp. xx–xx. Copyright
  © [year] (Copyright Holder). DOI: [DOI].*

Scope decided 2026-08-20: **the six non-chart illustrations — Figures 1, 2,
3, 4, 5 and 7.** The other nine are data charts, and the five dashboards are
their replacement; reproducing them would make the site a copy of the paper
and pull against the citation notice that asks readers to cite the paper
rather than this site. Figures 8 and 15 are kept locally as reference
material for validating Dashboard 5 — checking our work against a figure is
not publishing it.

Andreas noted the figures could be lightly adapted to fit their site context
and put distance between the site and the sharing terms. Deferred, and worth
weighing against the fact that an adapted figure is no longer the Accepted
Manuscript figure whose reuse the policy covers.

### Third-party photographs inside Figures 1 and 2

All six figures went live on 2026-08-26. This point is recorded so it stays
visible rather than being rediscovered later.

**Figures 1 and 2 are not purely the authors' own work.** Figure 2 credits
its field photographs on the panels — Fu et al. (2011), Chen et al. (2001),
Lee et al. (2001), Li et al. (2010), Nicol et al. (2018), and the Institute
of Geological Sciences of Armenia — and Figure 1's two Chi-Chi photographs
date from 1999 and are very unlikely to be the authors' own. Figures 3, 4,
5 and 7 are entirely model output and schematics, with no third-party
content. The colour statistics corroborate the split: Figures 1 and 2 carry
218k and 68k distinct colours, the others between 489 and 36k.

Sage's Green Open Access policy, quoted above, governs an author sharing
*their* accepted manuscript. It says nothing about third-party material
embedded in that manuscript: photographs reproduced from other publications
are normally cleared by the publisher for the article alone, and reuse
elsewhere needs permission from whoever holds the original copyright.
Kristen's reading of the policy was sound; this is a different question that
the policy does not reach.

**Decision (Michael, 2026-08-26): publish all six.** Posting an accepted
manuscript complete with its figures is ordinary academic practice, the lead
author is content for the pre-typeset figures to be shown, and the risk sits
with the author team rather than with this project. The mitigation is
attribution: each photograph's source credit is legible in the figure
itself, the reuse notice on the page names the photographs as belonging to
their original authors, and the terms offered are non-commercial and
no-derivatives.

**Worth confirming with Kristen** at the next opportunity, since she checked
the policy for her own material rather than for the photographs inside it.
If a source objects, Figures 1 and 2 can be removed without touching
anything else — the other four carry the explanatory weight, and Figure 5 is
the one the site genuinely depends on.

**Superseded (2026-10-12): Figures 1 and 2 are withheld.** While the
research team confirms the terms for the third-party photographs, the
figures page (`docs/figures.md`) describes both figures but no longer
reproduces them; their `#fig-1` and `#fig-2` anchors stay live, so
cross-links still resolve. Figures 3, 4, 5 and 7 are unaffected. How to
restore the two figures is recorded in `notes/Roadmap.md` under
*Decisions made*.
