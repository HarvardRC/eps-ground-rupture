# Deploying the companion site

**Activation in progress (2026-08-05).** The workflow is installed at
`.github/workflows/mkdocs.yml` and publishes from `dev-v.0.1.x` (the
draft-review period) as well as `main`. Remaining before the first
deploy: enable Pages (Source = **GitHub Actions**), commit + push, and
watch the first run — steps and contingencies in
`notes/2026-08-04/claude-code-task-deploy-pages.md`.

The repository is public, so **GitHub Pages served from this repo** is the
chosen path (ADR-0009): no extra hosting, and the site rebuilds from the
same commit as the pipeline that produced its data.

Site URL: `https://harvardrc.github.io/eps-ground-rupture/` (already set
as `site_url` in `mkdocs.yml`).

## Recommended: GitHub Actions → Pages

The workflow (formerly drafted alongside this file) now lives at
**`.github/workflows/mkdocs.yml`**. One-time setup it still needs:

1. **Settings → Pages → Source = GitHub Actions** — or
   `gh api -X POST repos/HarvardRC/eps-ground-rupture/pages -f build_type=workflow`.
2. If the deploy job is refused with an environment-protection error for
   `dev-v.0.1.x`, allow that branch on the `github-pages` environment
   (exact command in the task file referenced above).

The push branch filter includes `dev-v.0.1.x` for the draft-review
period; drop it after the merge to `main`.

The workflow builds with `--strict`, so a broken internal link or a bad
config fails the run rather than publishing a damaged site.

!!! note
    Review the draft before committing it. It grants the workflow the
    `pages: write` and `id-token: write` permissions that Pages deployment
    requires, scoped to that job only.

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

## Before publishing

Two open questions should be settled first, both the author team's call:

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
