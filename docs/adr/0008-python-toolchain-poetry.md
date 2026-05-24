# ADR-0008: Python toolchain — Poetry

- **Status**: Accepted
- **Date**: 2026-05-23
- **Deciders**: Michael Bouzinier (project owner)

## Context

The Python pipeline needs a dependency manager with a lockfile, support
for dependency groups (e.g. dev-only), reproducible installs, and broad
familiarity for collaborators.

## Decision

Use **Poetry** with `pyproject.toml` and `poetry.lock`. Dev tooling
(pytest, ruff, black, mypy, plus the plotting libs of ADR-0012) lives in
the `dev` group.

## Alternatives considered

- **uv** — newer, faster resolver. Strong contender; rejected for now in
  favour of Poetry's broader institutional familiarity. Revisit if
  resolver speed becomes painful.
- **pip-tools / `requirements.txt`** — no first-class lockfile, no group
  support.
- **PDM** — capable; less common.
- **pipenv** — declining maintenance.
- **conda** — heavyweight; not warranted given pure-Python deps.

## Consequences

- Lockfile (`subprojects/python/poetry.lock`) is committed → reproducible installs
  across machines.
- `poetry sync` cleans environments when groups change (used after
  removing the notebooks group; see ADR-0002).
- Slower resolution than uv, but acceptable for this project's dependency
  count.

## References

- `subprojects/python/pyproject.toml`
- `subprojects/python/poetry.lock`
