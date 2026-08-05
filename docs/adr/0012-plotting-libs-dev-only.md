# ADR-0012: Plotting libraries as dev-only optional dependencies

- **Status**: Accepted
- **Date**: 2026-05-24
- **Deciders**: Michael Bouzinier (project owner)

## Context

The legacy notebooks use `matplotlib` and `seaborn` extensively. The
initial scaffold included both in base dependencies on the assumption that
some plotting would be ported into the Python pipeline. With the
no-notebooks / no-UI direction (ADR-0002) and Tableau/Superset owning all
visualization, those libraries are not part of any production code path.

## Decision

Move `matplotlib` and `seaborn` into `[tool.poetry.group.dev.dependencies]`.
They install by default with `poetry install` (which includes the dev
group) but are absent from a production-only install
(`poetry install --without dev`).

## Alternatives considered

- **Remove entirely** — loses occasional value for ad-hoc inspection from
  a Python script (e.g. sanity-checking the shape of a Parquet output).
- **Keep in base dependencies** — adds non-trivial install size to
  production deployments for no production benefit.
- **Separate `plotting` optional group** — extra ceremony for what is
  really "dev convenience."

## Consequences

- Lean production install.
- Devs still get the libraries by default; nothing to remember.
- If we ever ship a server-side rendering path (e.g. PDF report
  generation), revisit and promote these to base or a dedicated group.

## References

- `subprojects/python/pyproject.toml` — `[tool.poetry.group.dev.dependencies]`
- ADR-0002 — the broader no-Python-UI / no-notebooks decision
