# ADR-0014: Product artifacts are committed, content-hashed, pre-compressed

- **Status**: Proposed
- **Date**: 2026-10-15 (drafted with the HLDD, `docs/app/hldd.md`)
- **Deciders**: Michael Bouzinier (project owner)

## Context

CI cannot rebuild the pipeline: the raw inputs and the DuckDB store
are deliberately not in the repository, and
`.github/workflows/tests.yml` runs fixture-driven contracts only — 34
skips on a fresh clone (DR-2, R-17). The existing export lane lands in
gitignored `dist/csv/` by design
([ADR-0006](0006-csv-extracts-for-tableau-public.md)). GitHub Pages
([ADR-0009](0009-github-pages-hosting.md)) does not promise transfer
compression for binary media types. And the site has already been
bitten by stale caches on stable-named assets: `extra.css` carries a
`?v=` cache-busting query since the 2026-09-16 incident
(`subprojects/mkdocs/mkdocs.yml`).

## Decision

Everything the published product needs exists as **committed,
versioned artifacts** in the site tree (NFR-7):

- The five product exports ([ADR-0012](0012-product-data-exports.md))
  live in a dedicated data directory beside the scenario page (exact
  path in the DDD), with **content hashes in their filenames**; the
  page references them through the manifest pinned at build time —
  immutable-by-address and safe to cache hard, the strengthening of
  the site's `?v=` convention.
- A data refresh **replaces** the artifacts in one commit; git history
  is the archive of past vintages, and the deployed site carries
  exactly one. Rollback is a git revert, complete by construction.
- The scenario artifact is committed **pre-compressed** — the file the
  page actually fetches — and inflated in the browser with the
  built-in DecompressionStream API (supported by every evergreen
  browser inside the PDD §9.2 24-month window). The wire size is a
  property of the artifact, not of the host.
- **No raw copy is committed beside it** (proposed): the compressed
  file is checksummed in the manifest and parity-tested in CI
  ([ADR-0015](0015-golden-scenario-parity.md)), and the Gradle lane
  regenerates it locally from the archive; a raw twin would roughly
  quadruple per-refresh growth and can drift from the file readers
  actually get.
- One Gradle task exports, hashes, and writes artifact, manifest, and
  reference results together, so the artifact and its pins cannot
  diverge; the owner commits the result as usual. Repository growth is
  ≈ 1 MB per refresh, and refreshes are rare, deliberate product
  releases (PDD §9.4).
- At 3D scale, one artifact **per model family**: the manifest pins
  multiple files, and the default page fetches only the 2D family
  ([ADR-0013](0013-row-level-scenario-artifact.md), DR-7).

## Alternatives considered

- **Regenerate in CI** — impossible by construction: the raw archive
  is not in the repository (DR-2, R-17).
- **External storage (Git LFS, a bucket, a release asset)** — new
  infrastructure, quotas, and failure modes to serve ≈ 1 MB per
  refresh that plain git handles; Pages + Actions would need extra
  checkout and fetch configuration for no gain at this size.
- **Serve raw and rely on host compression** — Pages does not promise
  it for binary types; 3–4× the measured wire size whenever the host
  declines.
- **Stable names with `?v=` queries** — the convention that already
  failed once (2026-09-16); content hashes make staleness impossible
  rather than mitigated.

## Consequences

- The repository carries binary data (≈ 1 MB per refresh,
  replace-not-accumulate) — the price of a host that cannot compute
  and a CI that cannot rebuild.
- Every deployed vintage is a commit: data provenance and site
  rollback inherit git's guarantees.
- The browser performs one extra step (a DecompressionStream inflate,
  ≈ 10 ms) and then reads typed-array views directly — no parse stage.

## References

- `docs/app/hldd.md` §5.4, §7.3 — the design detail
- `.github/workflows/tests.yml`, `.github/workflows/mkdocs.yml`
- `subprojects/mkdocs/mkdocs.yml` (the `?v=` precedent);
  `subprojects/mkdocs/DEPLOY.md`
