# ADR-0001: Gradle multi-project build; code modules under `subprojects/`

- **Status**: Accepted
- **Date**: 2026-05-24 (rewritten from old ADR-0013 in the 2026-08-05 reset; decision unchanged)
- **Deciders**: Michael Bouzinier (project owner)

## Context

The repo is polyglot by intent: a Python pipeline today, strongly-typed
(Java) pipeline work possible later, plus project-level assets (docs,
dashboards, data conventions) that belong to no single language. Two
problems shaped the layout: the root needs an owner for `README.md`,
`docs/`, `dashboards/`, `data/`; and language directories at top level
(or a speculative shared `src/`) don't survive real build tools' opinions.
An earlier `src/python/` layout lasted one day — see
[Dead ends](dead-ends.md#a-pre-pivot-flip-flop-for-the-record).

The owner is stronger in Java/Gradle than Python and wanted Gradle as the
single orchestrator.

## Decision

**Gradle multi-project layout**: the root is an orchestrator that owns
project-level resources and contains no application code; code modules are
Gradle subprojects under `subprojects/` (matching Gradle's own
vocabulary). `subprojects/python/` uses the modern Python **src-layout**
(`src/eps_ground_rupture/`), with a thin `build.gradle.kts` of Exec tasks
that shell out to Poetry (`poetryInstall`, `pytest`, `egrBuild`), wired
into Gradle's `check`/`assemble` lifecycle. Poetry stays authoritative for
Python dependencies ([ADR-0002](0002-python-pipeline-shape-and-toolchain.md));
Gradle only orchestrates.

## Alternatives considered

- **`src/python/` under a language-agnostic `src/`** — tried first;
  superseded within 24 hours (root-owner gap; the `src/java/` symmetry
  was speculative).
- **`pyproject.toml` at root** — makes the repo a Python project with
  guests; project-level docs read as owned by the Python module.
- **Top-level `python/`, `java/`** — language dirs alongside `docs/`;
  explicitly unwanted.
- **No orchestrator (plain Poetry + Make)** — loses the one-command
  surface (`./gradlew check`) that will span languages when Java arrives.

## Consequences

- Adding Java later is additive: `subprojects/java/` + one line in
  `settings.gradle.kts`.
- Both command surfaces are first-class: `./gradlew
  :subprojects:python:pytest` from root, or `cd subprojects/python &&
  poetry run …` directly.
- Gradle wrapper is pinned (8.10.2; supports JDK 8–23 — use **JDK 21** in
  IntelliJ, not the also-installed JDK 24).
- The Python venv lives at `/opt/python/venvs/eps-ground-rapture/`;
  `subprojects/python/poetry.toml` sets `virtualenvs.create = false`, so
  the Gradle Exec tasks inject `VIRTUAL_ENV`/`PATH` per task. Override
  with `EGR_VENV` or `-Ppython.venv=…`.
- Known IDE friction: IDEA's Gradle sync resets the Python module SDK;
  the manual re-apply is documented in `subprojects/python/README.md`
  (and tracked in `TODO.md`).

## References

- `settings.gradle.kts`, `build.gradle.kts`, `subprojects/python/build.gradle.kts`
- `docs/setup.md` — layout walkthrough and quickstart
- [Dead ends](dead-ends.md) — the superseded `src/python/` layout
