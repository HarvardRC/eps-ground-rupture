# ADR-0002: Python pipeline — importable modules + CLI, Poetry-managed, no notebooks

- **Status**: Accepted
- **Date**: 2026-05-23/24 (consolidates old ADR-0002, -0008, -0010, -0012 in the 2026-08-05 reset; decisions unchanged)
- **Deciders**: Michael Bouzinier (project owner)

## Context

The project started from two Jupyter notebooks. A naive port would keep
the notebook pathology — hidden state, untestable code, opaque diffs —
forever. The owner's rule from day one: **no notebooks in this repo, no
Python UI framework at all**. Visualization belongs to the dashboard
platform ([ADR-0004](0004-tableau-as-the-dashboard-platform.md)), not to
Python.

## Decision

The Python codebase is **importable modules plus CLI entry points**, and
nothing else:

- Entry points: `egr-build` (Parquet + views + schema artifacts),
  `egr-csv` (view → `dist/csv/` exports,
  [ADR-0006](0006-csv-extracts-for-tableau-public.md)), `egr-push-sheets`
  (dormant fallback — see [Dead ends](dead-ends.md#the-google-sheets-almost)).
- Legacy `.ipynb` stay under `legacy/` (gitignored) as read-only
  reference; any `.ipynb` elsewhere fails review.
- **Poetry** manages dependencies (`pyproject.toml` + committed
  `poetry.lock`), with groups: `dev` (pytest, ruff, mypy, plus
  `matplotlib`/`seaborn` for ad-hoc human-facing checks only — never a
  production code path) and `docs` (the MkDocs toolchain,
  [ADR-0008](0008-mkdocs-material-companion-site.md)) — one lockfile
  serving pipeline, plotting convenience and site builds.
- Python range **`>=3.11,<3.14`**, pinned dev envs on 3.13 (3.14 had no
  pyarrow wheel when set; raise the cap when wheels exist).
- Tests are first-class: cleaning chains, exports and analytical views
  are pinned by pytest (see
  [ADR-0003](0003-duckdb-as-the-analytical-engine.md) for why pinned
  expectations matter here).

## Alternatives considered

- **Keep notebooks** (or Voila/JupyterLab-as-dev-surface) — the habit
  creeps back; untestable.
- **Streamlit / Dash / Voila as UI** — explicitly ruled out by the owner;
  niche to productize.
- **uv** — faster resolver, strong contender; Poetry won on institutional
  familiarity. Revisit if resolution speed ever hurts.
- **pip-tools / pipenv / PDM / conda** — weaker lockfile-plus-groups
  story, declining maintenance, or heavyweight for pure-Python deps.

## Consequences

- Testable module structure; the CLI exercises the same code paths the
  tests pin.
- Exploratory analysis costs slightly more friction (scripts/REPL) — the
  accepted price of no notebooks.
- Reproducible installs across machines; the `docs` group means the
  companion site builds from the same lockfile in CI.
- `poetry.toml` sets `virtualenvs.create = false` — activate the project
  venv (or go through Gradle, which injects it;
  [ADR-0001](0001-gradle-multi-project-build.md)).

## References

- `subprojects/python/pyproject.toml`, `poetry.lock`
- `subprojects/python/src/eps_ground_rapture/cli.py`
- `docs/setup.md` — pipeline overview, what runs today
