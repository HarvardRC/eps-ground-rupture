# ADR-0013: Gradle multi-project layout, code modules under `subprojects/`

- **Status**: Accepted (supersedes [ADR-0009](0009-repository-layout-src-python.md))
- **Date**: 2026-05-24
- **Deciders**: Michael Bouzinier (project owner)

## Context

ADR-0009 placed the Python module at `src/python/` and reserved `src/` for
future language directories. Two problems surfaced:

1. **Root had no owner.** `README.md`, `LICENSE`, `docs/`, the ADRs themselves,
   and project-level resources (`ai/`, `legacy/`, `data/`, `dashboards/`) sat
   at the root with no module declaring "I own these." This is the awkward
   gap that multi-module Maven/Gradle conventions normally fill via a parent
   POM/build file.
2. **The `src/` symmetry was speculative.** When Java actually arrives, its
   build tool (Gradle, possibly Maven) will want its own build file with its
   own opinions about `src/main/java`. The hypothetical `src/python/` +
   `src/java/` parallel doesn't hold up.

Additionally: the project owner is more comfortable in Java/Gradle than
Python, considers Gradle a strong build orchestrator, and explicitly does
not want language directories at the top level alongside `docs/`.

## Decision

Adopt a **Gradle multi-project layout** with the root as orchestrator and
code modules grouped under a single parent directory:

```
eps-ground-rapture/
  # Project-level (root owns these)
  README.md, LICENSE, .gitignore
  docs/, dashboards/, data/  (plus untracked ai/, legacy/)

  # Gradle root — orchestrator only, no application code
  settings.gradle.kts          (lists subprojects)
  build.gradle.kts             (cross-cutting config / aggregate tasks)
  gradle.properties, gradlew, gradle/wrapper/  (to be added later)

  # Code modules — Gradle subprojects
  subprojects/
    python/                    (formerly src/python/)
      build.gradle.kts         (thin Exec wrapper around Poetry)
      pyproject.toml
      poetry.lock
      src/eps_ground_rapture/  (Python package — modern "src-layout")
      tests/
    java/                      (later, when Java actually arrives)
      build.gradle.kts
      src/main/java/...
```

The Python module's `build.gradle.kts` declares Exec tasks that shell out
to Poetry — `poetry install`, `poetry run pytest`, `poetry run egr-build`
— wired into Gradle's `check` and `assemble` lifecycle tasks. Poetry
remains the authoritative Python dep manager (ADR-0008); Gradle is only
the orchestrator.

Inside the Python module we use the **modern Python "src-layout"**: the
package lives at `src/eps_ground_rapture/`, not at the module root.
PyPA's packaging guide recommends this layout — it forces tests to import
the *installed* package rather than the local source tree, which catches
packaging mistakes (e.g., a file not declared in `packages`). The
configuration is one line in `pyproject.toml`:
`packages = [{ include = "eps_ground_rapture", from = "src" }]`.

The parent directory is `subprojects/` rather than `pipelines/`,
`modules/`, or similar — it matches Gradle's own vocabulary and makes the
multi-project intent self-documenting.

## Alternatives considered

- **Keep ADR-0009 (`src/python/`)** — leaves the root-has-no-owner gap and
  the speculative-future-proofing problem.
- **`pyproject.toml` at root; Python is the project; Java in a sibling
  `java/` later** (the "Option A" of the discussion) — works but treats the
  root as a Python-first module rather than a polyglot umbrella, and
  project-level docs feel implicitly owned by the Python module rather than
  the project itself. Rejected by the owner.
- **All build files at root, code in conventional subdirs** (the "Option
  C") — adds significant clutter when Gradle wrapper files (`gradlew`,
  `gradle/wrapper/...`) arrive, and the `src/` directory gets shared
  between Python's src-layout and Java's `src/main/java/`. Workable but
  conceptually muddled.
- **Code modules at top level (`python/`, `java/`)** (the earlier "Option
  B") — clean separation, but places language directories alongside `docs/`
  and `ai/`, which the owner explicitly does not want.

## Consequences

- Root is a stable umbrella owning project-level resources; no implicit
  "main module" at root.
- Adding Java later is purely additive — `subprojects/java/` plus one line
  in `settings.gradle.kts`. No restructuring.
- One unified command surface — `./gradlew check` runs Python tests today,
  Java tests tomorrow.
- Python developers run `cd subprojects/python && poetry run ...` for
  direct work, or `./gradlew :subprojects:python:pytest` from root. Both
  paths are first-class.
- Gradle wrapper is at **8.10.2** (`gradle/wrapper/gradle-wrapper.properties`).
  Gradle 8.10.x supports JDK 8–23 at runtime; pick a JDK in IntelliJ
  accordingly.
- **Recommended JDK for IntelliJ's Gradle JVM: 21 (LTS)**. The project
  owner has JDK 21 installed at `/Library/Java/JavaVirtualMachines/jdk-21.jdk/`.
  JDK 24 is also installed but Gradle 8.10.2 does not support it
  ("Unsupported class file major version 68" error).
- **Virtualenv lives at `/opt/python/venvs/eps-ground-rapture/`** (manually
  created with `python3.13 -m venv ...`), not in Poetry's cache. The local
  `subprojects/python/poetry.toml` sets `virtualenvs.create = false` so
  Poetry installs into the active venv rather than creating its own. The
  Gradle Exec tasks set `VIRTUAL_ENV` and prepend the venv's `bin/` to
  `PATH` automatically. Override via `EGR_VENV` env var or `-Ppython.venv=...`.
  IntelliJ should point its Python interpreter at
  `/opt/python/venvs/eps-ground-rapture/bin/python` — a stable path that
  survives Gradle re-syncs.
- **IDEA Module SDK doesn't survive Gradle sync.** IDEA's Gradle
  integration honors `idea.module.{sourceDirs,testSources,excludeDirs}`
  from `build.gradle.kts` but does not preserve the Python Module SDK
  assignment. After every "Sync Project with Gradle Files", the
  `:subprojects:python` module's Module SDK reverts to the project JDK
  and must be re-selected manually (Project Structure → Modules →
  :subprojects:python → Dependencies → Module SDK). We investigated
  Gradle-side workarounds (`iml.withXml` injection; snapshot/restore of
  IDEA's per-module cache XML under
  `~/Library/Caches/JetBrains/.../external_build_system/modules/`); none
  survive sync without a full IDE restart, which is heavier than the
  manual click. Documented as steady state in
  `subprojects/python/README.md`.

## References

- `settings.gradle.kts`, `build.gradle.kts` at repo root
- `subprojects/python/build.gradle.kts`
- ADR-0008 (Poetry) — still authoritative for Python dependency management
- Supersedes ADR-0009
