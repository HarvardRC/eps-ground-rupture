# ADR-0009: GitHub Pages (via Actions) as site hosting

- **Status**: Accepted
- **Date**: 2026-08-02 (workflow drafted); activation 2026-08-04/05
- **Deciders**: Michael Bouzinier (project owner)

## Context

The companion site ([ADR-0008](0008-mkdocs-material-companion-site.md)) is
a static build (`mkdocs build` → HTML). It needs zero-cost, zero-ops
hosting at a stable public URL, ideally rebuilt from the same commit as
the pipeline that produced the numbers it cites. The repo is already
public on GitHub.

## Decision

**GitHub Pages, deployed by GitHub Actions** from this repo:

- Workflow `.github/workflows/mkdocs.yml`: Poetry `--only docs` install,
  `mkdocs build --strict`, `actions/upload-pages-artifact` →
  `actions/deploy-pages`; Pages source set to "GitHub Actions".
- The `--strict` build is the deployment gate — a broken link or bad
  config fails the run rather than publishing a damaged site.
- Site URL: `https://harvardrc.github.io/eps-ground-rapture/`
  (`site_url` in `mkdocs.yml`).
- During the draft-review period the workflow also publishes from
  `dev-v.0.1.x`; after merge, `main` is the publishing branch.

## Alternatives considered

- **Netlify / Vercel** — equally easy, adds an external account, build
  minutes and another dashboard to a project that already lives on
  GitHub.
- **S3 + CloudFront** — couples the site to the AWS lane that was just
  parked ([Dead ends](dead-ends.md)); real (if small) cost and IaC to
  maintain.
- **Read the Docs** — docs-branded frame and ads on the free tier; wrong
  register for a paper companion.
- **Institutional (Harvard) hosting** — process and gatekeeping for no
  benefit at this scale; can front the Pages URL with a custom domain
  later if the team wants one.
- **`mkdocs gh-deploy` (push `gh-pages` branch)** — kept as the
  documented one-off fallback (`DEPLOY.md`), not the primary: it
  publishes an unreviewed working tree with no record of the producing
  commit.

## Consequences

- Hosting is free, and deployment is a push — no credentials outside
  GitHub, no servers.
- The site rebuilds only from committed state: an uncommitted docs tree
  cannot ship, which is exactly the review discipline a multi-author
  byline needs.
- One Pages site per repo: the draft and the final site are the same
  URL; per-branch preview URLs are not native (acceptable — the draft
  period is short and reviewers are internal).
- The repo must stay public for free Pages (it is public by policy
  anyway).

## References

- `.github/workflows/mkdocs.yml` — the workflow
- `subprojects/mkdocs/DEPLOY.md` — activation record and fallback
- [ADR-0008](0008-mkdocs-material-companion-site.md) — what gets deployed
