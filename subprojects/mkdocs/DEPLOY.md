# Deploying the companion site

**Active since 2026-08-04.** The site publishes to
<https://harvardrc.github.io/eps-ground-rapture/> from
`.github/workflows/mkdocs.yml`, with the repository's Pages **Source** set
to *GitHub Actions*.

The repository is public, so Pages served from this repo needs no extra
hosting, and the site rebuilds from the same commit as the pipeline that
produced its data. The published URL is set as `site_url` in `mkdocs.yml`.

## How it is set up

- **Pages Source = GitHub Actions**, set on the repository (via the REST
  API; the equivalent control is **Settings → Pages → Build and deployment
  → Source**). This is what lets `actions/deploy-pages` publish at all.
- **The workflow** lives at `.github/workflows/mkdocs.yml`. It runs on
  pushes to `main` that touch `subprojects/mkdocs/**`, the python
  subproject's `pyproject.toml` / `poetry.lock`, or the workflow itself —
  and can also be triggered by hand from any branch via
  `workflow_dispatch`.
- **Publishing from `main` only.** Development happens on a branch and
  reaches the site by being merged, so the published site always matches
  the default branch. To preview before merging, run `mkdocs serve` locally
  (see below) or dispatch the workflow by hand.
- **Build is `--strict`**, so a broken internal link or a bad config fails
  the run rather than publishing a damaged site.
- **Dependencies** come from the `docs` group of
  `subprojects/python/pyproject.toml` via `poetry install --only docs
  --no-root`, so CI installs mkdocs-material without pandas, pyarrow or
  duckdb.

!!! note "Permissions"
    The build job runs with `contents: read` only. `pages: write` and
    `id-token: write` are granted to the deploy job alone, which is also
    where `actions/configure-pages` runs — it calls the Pages API and would
    fail without them.

!!! warning "If you ever publish from another branch"
    The `github-pages` environment restricts deployments to the default
    branch unless told otherwise, so a run from any other branch fails with
    *"Branch … is not allowed to deploy to github-pages due to environment
    protection rules"* — including a hand-dispatched one. Fix by adding a
    deployment branch policy under **Settings → Environments →
    github-pages → Deployment branches and tags**, then re-run the job.

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
