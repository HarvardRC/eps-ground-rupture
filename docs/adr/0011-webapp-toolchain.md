# ADR-0011: Webapp toolchain — TypeScript + esbuild, no framework, SVG charts

- **Status**: Accepted
- **Date**: 2026-10-15 (drafted with the HLDD, `docs/app/hldd.md`); accepted 2026-10-28 on the owner's delegation of the toolchain choice
- **Deciders**: Michael Bouzinier (project owner)

## Context

NFR-8 requires the platform decision, any new toolchain, and its
relation to the existing architecture decisions recorded in an ADR;
the ADR format itself carries what was rejected and why. The
application's hardest code is the statistics engine, which must
agree with the pipeline within the reference tolerance (SC-3; the
parity harness of
[ADR-0015](0015-golden-scenario-parity.md)). The budgets are tight in
one direction only: inside the PDD §9.1 payload budget, the app
bundle should stay in the tens of kilobytes beside a ~1 MB data
artifact (the HLDD §7.1 arithmetic), and the product's
new pages carry a WCAG 2.2 AA target with a table-first accessibility
contract (PDD §9.3). The repository is a Gradle multi-project build
([ADR-0001](0001-gradle-multi-project-build.md)) with every toolchain
wrapped (Poetry via
[ADR-0002](0002-python-pipeline-shape-and-toolchain.md)).

> **Amendment 2026-10-28.** ADR-0014 was reworked at the owner's
> review: product data is no longer committed — release assets hold
> it, pinned by a committed manifest. In the decision below, the
> `tests.yml` path filter on "the committed data directory" becomes
> the pointer manifest, and the parity harness fetches the pinned
> vintage before running. The toolchain decision is unchanged.

> **Amendment 2026-10-28 (2).** The decision below says "Node and
> package versions pinned by lockfile"; precisely, the Node.js version
> is pinned in the Gradle build configuration and package versions by
> the committed lockfile — a lockfile does not pin the runtime. HLDD
> §4.3 states it correctly.

## Decision

A new Gradle subproject, **`subprojects/webapp`**:

- **TypeScript in strict mode**, compiled and bundled by **esbuild**;
  Node and package versions pinned by lockfile; the whole lane wrapped
  in Gradle tasks like the other toolchains. esbuild strips types
  without checking them, so the webapp test job runs the TypeScript
  compiler as its own check (`tsc --noEmit`).
- **No application framework.** The page is one view hierarchy with
  modest state (PDD §3–§4); the budgets and the WCAG target are easier
  to meet, and to audit, without a framework's runtime.
- **Charts are hand-rolled SVG.** Exactly two chart kinds exist —
  histogram and empirical cumulative curve (PDD §4.1) — plus overlay
  marks.
- **Build output** (one JS bundle, one stylesheet) is **built in CI,
  never committed**: a webapp job in `.github/workflows/mkdocs.yml`,
  separate from the MkDocs job, runs the Gradle-wrapped esbuild build
  and hands the result to the MkDocs job, which places it in the site
  tree with content-hashed filenames
  ([ADR-0014](0014-committed-content-hashed-artifacts.md)) before the
  strict build. Locally the same Gradle task writes it there for
  `mkdocs serve`, into a gitignored path. It loads only on the
  scenario page; the site's `extra_javascript` pattern for site-wide
  scripts is untouched, and the scenario page does not load the
  site-wide Tableau Embedding API module it has no use for (the
  exclusion mechanics are DDD material).
- `.github/workflows/mkdocs.yml` path filters widen to
  `subprojects/webapp/**`. `tests.yml` gains the webapp test job,
  including the parity harness (ADR-0015); its path filters keep
  `subprojects/python/**` and add `subprojects/webapp/**` and the
  committed data directory, so a data refresh or a webapp-only change
  runs the checksum check and the parity harness.

## Alternatives considered

- **A framework (React, Vue, Svelte, …)** — runtime weight against a
  tens-of-KB bundle target; a second rendering model to audit for
  WCAG; dependency churn in a repository that pins everything. The
  page is not interactive enough to repay it.
- **Plain untyped ES modules, no build step** — no types exactly where
  the parity risk lives (the statistics engine); no minification and
  no content-hashing lane.
- **A charting library** — would dominate the code payload for two
  chart kinds, fight the canonical palette and never-color-alone rules
  (FR-G2), and complicate the table-first accessibility contract.
- **A separate repository** — rejected with the platform choice
  ([ADR-0010](0010-native-client-side-scenario-app.md)); the
  multi-project build exists for exactly this case (ADR-0001).
- **Committing the built bundle, kept current by a pre-commit hook** —
  the fallback if a CI build proved impractical. It puts generated code
  into review diffs and history, and a bundle built on a contributor's
  machine can drift from its source; building in CI from committed
  source keeps one source of truth.

## Consequences

- One more pinned toolchain (Node + esbuild) to maintain,
  Gradle-wrapped like the others — the new-toolchain record NFR-8
  asks for. The deploy workflow gains a Node setup and a build job, so
  no site deploy can happen without a successful bundle build. That job
  extends the deploy workflow of
  [ADR-0009](0009-github-pages-hosting.md), and the site build gains a
  second toolchain (Node) beside the Poetry docs group of
  [ADR-0008](0008-mkdocs-material-companion-site.md).
- Contributors to the webapp need TypeScript; the pipeline remains
  Python-only.
- Hand-rolled SVG keeps the bundle small and the accessibility
  contract direct, at the price of owning the chart code; two fixed
  chart kinds keep that price small.

## References

- `docs/app/hldd.md` §4.3, §9 — the design detail
- `subprojects/mkdocs/mkdocs.yml` (`extra_javascript`);
  `.github/workflows/mkdocs.yml`, `.github/workflows/tests.yml`
