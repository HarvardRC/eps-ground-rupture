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
source /opt/venv/eps-ground-rapture/bin/activate   # or your venv
cd subprojects/mkdocs
mkdocs gh-deploy --strict
```

This force-pushes the built site to `gh-pages` and requires
**Settings → Pages → Source** to be set to *Deploy from a branch →
`gh-pages`*, which is mutually exclusive with the Actions path above. Use it
for a one-off preview; prefer Actions for anything ongoing, because
`gh-deploy` publishes whatever is in your working tree with no review step
and no record of which commit produced it.

## Open questions for the author team

Both are the author team's call, and both are in the review email:

- **The byline.** The site currently credits Kristen Chiama, Andreas Plesch
  and John H. Shaw. Whether to add William Bednarz and Robb Moss (the
  paper's other two authors) and Michael Bouzinier is marked `TODO(michael)`
  in `mkdocs.yml` and `docs/index.md`.
- **Figure reuse.** The paper is not open access, so no figures from it are
  reproduced; four placeholders in `docs/paper.md` mark where Figures 1, 2,
  5 and 7 would sit. Publishing with the placeholders is fine — they name
  what is missing and cite the source — but the pages read best with
  **Figure 5** (it defines the measured quantities every dashboard plots —
  the first one to ask for) and the Figure 2 scarp-morphology schematic,
  if reuse is granted.
