# ADR-0014: Product artifacts in release assets, pinned by a committed manifest

- **Status**: Accepted
- **Date**: 2026-10-15 (drafted with the HLDD, `docs/app/hldd.md`); rewritten in plain language 2026-10-28; reworked at owner review 2026-10-28 — the data moved from committed files to release assets; accepted 2026-10-28
- **Deciders**: Michael Bouzinier (project owner)

## Context

Two constraints and one rule shape this decision.

First, continuous integration cannot produce the product's data. The
pipeline runs only locally: its inputs — the simulation and
field-measurement datasets — are placed by hand in the gitignored
`data/raw/` folder and never committed
([DR-2 — Versioned exports](../app/prd.md#dr-2-versioned-exports),
[R-17](../app/prd.md#94-delivery-and-technical-risks)). CI sees only
the repository, so `.github/workflows/tests.yml` skips every test
that needs the raw inputs or the gitignored files built from them. The
existing exports, which feed the Tableau Public dashboards, are
written by design to `dist/csv/`, a gitignored local folder
([ADR-0006 — CSV exports feed the published
workbooks](0006-csv-extracts-for-tableau-public.md)) that the site
build never sees. The site itself is built in CI and served by GitHub
Pages
([ADR-0009 — GitHub Pages (via Actions) as site
hosting](0009-github-pages-hosting.md)).

Second, the hosting has two known weaknesses. GitHub Pages does not
promise to compress binary files on the wire. And the site has already
been bitten by a stale cache on a stable-named asset: `extra.css` has
carried a `?v=` cache-busting query since the 2026-09-16 incident
(`subprojects/mkdocs/mkdocs.yml`).

Third, the owner's architecture rule (review of 2026-10-28):
**generated data stays out of git**, separated from the code that
produces it — the practice the repository already follows everywhere
else: `data/raw/` and `dist/csv/` are gitignored, and the application
bundle is built in CI and never committed
([ADR-0011 — Webapp toolchain — TypeScript + esbuild, no framework,
SVG charts](0011-webapp-toolchain.md)).

> **Amendment 2026-10-29 (owner review of HLDD §5).**
> [HLDD §5.4](../app/hldd.md#54-pinned-versioned-artifacts-adr-0014)
> adds operating rules this record did not state: the uploaded files
> are verified against the generated checksums before the updated
> pointer manifest is committed; past vintages are retained, and a
> vintage that retained repository versions depend on is never
> deleted as routine cleanup; a pointer revert restores a previous
> vintage only while its assets remain available and the application
> version supports its format, and a rollback that changes both code
> and data must restore a compatible combination of both; and
> withdrawal is an exceptional procedure that reaches both the
> release assets and the copies already published with the site —
> deleting assets alone does not withdraw data the site serves — and
> documents the reason and the historical builds that can no longer
> be reproduced. Read the "Rollback and withdrawal" bullet, the
> rollback line under Consequences, and the withdrawal comparison
> under Alternatives with these rules.

## Decision

**The product's data lives in GitHub release assets; the repository
commits only a pointer to it.** Each data vintage is uploaded once, as
the assets of a lightweight prerelease **data tag** named by the
export version, and a small committed **pointer manifest** pins it: the
tag, each artifact's content-hashed filename, its checksum, and the
export version and date. The pointer manifest is distinct from the
**artifact manifest** of
[ADR-0013 — Row-level, trial-major columnar scenario
artifact](0013-row-level-scenario-artifact.md), which travels with the
vintage as the artifact's table of contents and is read by the page;
one export-task run writes both, and the pointer manifest's checksums
cover every vintage file, the artifact manifest included. CI fetches
the pinned vintage, verifies every checksum against the committed
pointer manifest, and bakes the files into the site, which serves them as its own static files — the page downloads
nothing from a release at run time. The application bundle is likewise
never committed: CI builds it from committed source (ADR-0011).

- **Naming and caching.** The five product exports
  ([ADR-0012 — Purpose-built product exports feed the scenario
  app](0012-product-data-exports.md)) are placed in a dedicated data
  directory beside the scenario page (exact path in the DDD). Each
  filename contains a **content hash** — a short fingerprint of the
  file's bytes — so a changed file always gets a new name; the page
  finds the current files through the artifact manifest, whose
  content-hashed name the build pins into the page.
  A file whose name changes with its content can never be served
  stale, and may be cached as hard as the browser likes. This is the
  strengthening of the site's `?v=` convention.
- **Fetch and verify.** The site build and the `tests.yml` jobs
  download the pinned vintage and verify every checksum against the
  committed pointer manifest before using it
  ([NFR-7 — Build and data-quality
  gates](../app/prd.md#nfr-7-build-and-data-quality-gates)). A
  mismatch fails the build, so a replaced or tampered asset cannot
  deploy.
- **How a refresh works.** One Gradle task exports, hashes, and writes
  the artifact, both manifests, and the reference results in one run,
  so the artifact and the values that pin it cannot diverge; the same
  lane uploads the vintage's assets to its data tag, and the owner
  commits the updated pointer manifest — one commit per refresh. Past vintages
  remain available as the assets of their tags; the deployed site
  carries exactly one. Refreshes are rare, deliberate product releases
  ([PDD §9.4 — Releases](../app/pdd.md#94-releases)).
- **Rollback and withdrawal.** Reverting the pointer commit redeploys
  the previous vintage, complete while past vintages' assets are
  retained. Withdrawing a vintage — over a licensing problem, say — is
  deleting its assets, not rewriting public history.
- **The big file is a compressed binary, not text.** The scenario
  artifact is uploaded **pre-compressed — the exact file the page
  downloads** (the four text exports beside it add only tens of
  kilobytes). The browser inflates it with the built-in
  DecompressionStream API, supported by every evergreen browser inside
  the 24-month window of
  [PDD §9.2 — Browser and mobile baseline (D-16,
  Proposed)](../app/pdd.md#92-browser-and-mobile-baseline-d-16-proposed).
  Shipping the compressed file makes the download size a property of
  the artifact itself, not of the host.
- **No raw (uncompressed) twin is uploaded beside it** (proposed):
  the compressed file is checksummed in both manifests and parity-tested
  in CI ([ADR-0015 — Golden-scenario references and a pipeline↔client
  parity harness](0015-golden-scenario-parity.md)), and the Gradle
  lane regenerates it locally from the archive; a raw twin would
  roughly quadruple each vintage's bulk for a file nothing downloads,
  and can drift from the file readers actually get.
- **Derived data keeps its own terms.** The four data exports carry
  their source datasets' terms (the README's Licensing section), not
  the code's Apache-2.0, to which
  [NFR-6 — Licensing](../app/prd.md#nfr-6-licensing) limits
  application code. The P2 media index is the project's own metadata,
  not derived data; its terms are set when it ships. Generated data is
  not in the repository, so a GitHub release's source archive, and the
  Zenodo software record built from it, never carries it; running the
  parity tests or the page from such an archive needs the pinned
  vintage's assets. When the owner tags a software release, the
  release carries the current exports as its data asset under those
  terms — the distribution route the author review set for the
  pipeline's data on 2026-08-20, which also ships the dashboards'
  plotting CSVs with each release (`notes/Roadmap.md`, Decisions
  made). Open (HLDD §10): confirming each source's terms, now
  **before the first data vintage is uploaded**, since assets on a
  public repository are public; the deposit step that gets the
  released data into Zenodo itself (the GitHub integration archives
  only the source archive — a Zenodo dataset record is the Roadmap's
  preference); and the matching README and `LICENSE-docs` wording.
- **At 3D scale, one artifact per model family**: the artifact
  manifest pins multiple files, and the default page fetches only the
  2D family
  ([ADR-0013 — Row-level, trial-major columnar scenario
  artifact](0013-row-level-scenario-artifact.md),
  [DR-7 — Future 3D
  compatibility](../app/prd.md#dr-7-future-3d-compatibility)).

## Alternatives considered

- **Commit the data files to the repository** — the decision as first
  drafted, reversed at the owner's review (2026-10-28). It buys
  atomicity — one commit holds code and data together, and git history
  archives every vintage — with no fetch step, at ≈ 1 MB per refresh
  that git handles easily. Rejected on the architecture rule above:
  generated data stays out of git, separated from the code that
  produces it; and withdrawing committed data would mean rewriting
  public history rather than deleting an asset.
- **Regenerate the data in CI** — impossible by construction: the raw
  archive is not in the repository (DR-2, R-17).
- **Git LFS or an external bucket** — LFS keeps the data bound to git,
  with quotas and Pages/Actions plumbing of its own; a bucket adds
  infrastructure, credentials, and failure modes outside the platform
  that already hosts the repository, CI, and the site. Release assets
  stay on that platform.
- **Serve the raw file and rely on the host to compress it** — Pages
  does not promise compression for binary types; 3–4× the measured
  download size whenever the host declines.
- **Stable filenames with `?v=` queries** — the convention that
  already failed once (2026-09-16); content hashes make staleness
  impossible rather than mitigated.

## Consequences

- The repository carries no generated data: a vintage is ≈ 1 MB of
  release assets, pinned by a few hundred bytes of committed pointer
  manifest.
- Site deploys and PR validation gain a fetch-and-verify step. A
  checksum mismatch stops the deploy; availability rides on GitHub
  releases — the platform that already hosts the repository, Actions,
  and Pages.
- Every deployed vintage is pinned by a commit: provenance follows
  from the pointer manifest's checksums, and rollback is a git revert
  while
  past vintages' assets are retained.
- The browser performs one extra step — a DecompressionStream inflate,
  ≈ 10 ms — and then reads the typed arrays directly, with no parse
  stage.
- A release's source archive never contains the data; the site and the
  release's data asset carry it, under its own terms.

## References

- [HLDD §5.4 — Pinned, versioned artifacts
  (ADR-0014)](../app/hldd.md#54-pinned-versioned-artifacts-adr-0014),
  [HLDD §7.3 — Delivery and
  caching](../app/hldd.md#73-delivery-and-caching), and
  [HLDD §10 — Risks and open
  dependencies](../app/hldd.md#10-risks-and-open-dependencies) — the
  design detail
- `.github/workflows/tests.yml`, `.github/workflows/mkdocs.yml`
- `README.md` (Licensing); `notes/Roadmap.md` ("Decisions made":
  Release data, 2026-08-20)
- `subprojects/mkdocs/mkdocs.yml` (the `?v=` precedent);
  `subprojects/mkdocs/DEPLOY.md`
