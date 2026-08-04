# Deploying the companion site

**Nothing here is active yet.** No workflow is installed and no site has been
published — activating deployment is a deliberate step, taken by the repo
owner.

The repository is public, so **GitHub Pages served from this repo** is the
recommended path: no extra hosting, and the site rebuilds from the same
commit as the pipeline that produced its data.

Published site URL would be
`https://harvardrc.github.io/eps-ground-rapture/`, which is already set as
`site_url` in `mkdocs.yml`.

## Recommended: GitHub Actions → Pages

A ready-to-commit workflow is drafted alongside this file as
**`github-workflow-mkdocs.yml.draft`**. To activate it:

1. In the repo settings, set **Settings → Pages → Source** to
   **GitHub Actions**.
2. Copy the draft into place and commit it:

   ```bash
   mkdir -p .github/workflows
   cp subprojects/mkdocs/github-workflow-mkdocs.yml.draft .github/workflows/mkdocs.yml
   ```

3. Check the branch filter in the workflow matches the branch you want to
   publish from. The draft targets `main`; this work is currently on
   `dev-v.0.1.x`, so nothing publishes until it merges — which is the safer
   default.

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
  reproduced; three placeholders in `docs/paper.md` mark where Figures 1, 2
  and 7 would sit. Publishing with the placeholders is fine — they name what
  is missing and cite the source — but the pages read better with the
  schematic in Figure 2, if reuse is granted.
