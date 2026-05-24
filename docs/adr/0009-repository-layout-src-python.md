# ADR-0009: Repository layout — `src/python/` under language-agnostic `src/`

- **Status**: Superseded by [ADR-0013](0013-gradle-multi-project-subprojects-layout.md). The "language-agnostic `src/`" framing was speculative future-proofing that didn't survive contact with reality — Java/Gradle wants its own build file at root, and the root needed an owner for `README.md` and `docs/` anyway. The replacement layout puts code modules under `subprojects/` with Gradle as the master orchestrator at root.
- **Date**: 2026-05-23 (superseded 2026-05-24)
- **Deciders**: Michael Bouzinier (project owner)

## Context

The pipeline is Python-first, but the project owner anticipates that
strongly-typed languages (Java) may be added for pieces of pipeline work
later. The layout should accommodate that without rename churn.

## Decision

Pipeline code lives at **`src/python/`**. The `src/` parent is a reserved
namespace for future language directories (e.g. `src/java/`).
`pyproject.toml`, `poetry.lock`, tests, and the package itself all sit
under `src/python/`. All Python commands run from that directory.

## Alternatives considered

- **Flat `src/<package>/` Python layout** — standard for single-language
  Python; would need restructuring to add other languages.
- **Top-level `python/` and `java/`** — less standard; clutters repo root.
- **Monorepo `services/<name>/`** — over-engineered for a project with
  one component.

## Consequences

- One extra `cd src/python` before Poetry commands. Trivial.
- Python imports and tooling are unaffected — they see a normal package
  at `src/python/eps_ground_rapture/`.
- Adding `src/java/` later is purely additive; nothing about the Python
  package moves.

## References

- `src/python/` — current Python pipeline
- ADR-0008 — Poetry is the tool used inside this directory
