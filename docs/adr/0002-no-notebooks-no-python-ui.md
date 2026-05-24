# ADR-0002: No notebooks, no Python UI — modules + CLI only

- **Status**: Accepted
- **Date**: 2026-05-24
- **Deciders**: Michael Bouzinier (project owner)

## Context

The starting point is two Jupyter notebooks. A naive port would keep us in
Jupyter forever — hidden state, untestable code, opaque diffs. The project
owner stated explicitly: no notebooks in this repo, no Python UI
framework (Dash, Streamlit, Voila) at all.

## Decision

The Python codebase consists of **importable modules** and a **single CLI
entry point** (`egr-build`). All visualization happens in Tableau or
Superset. Legacy `.ipynb` files remain under `legacy/` as read-only
reference artifacts; they are not part of the runtime pipeline.

## Alternatives considered

- **Voila** — present a notebook as a web app; still requires maintaining
  the notebook.
- **Streamlit / Dash** — explicitly ruled out by the owner; niche outside
  data-science teams.
- **JupyterLab as dev surface** with `.py` modules — risks the notebook
  habit creeping back in.

## Consequences

- Forces testable module structure from day one. Smoke tests exercise the
  same code paths the CLI does.
- Adds friction for exploratory analysis — devs must use scripts, the
  REPL, or a temporary `python -c`.
- `matplotlib` and `seaborn` are retained as dev-only dependencies
  (ADR-0012) for the rare moment when a Python script needs to render
  something for a human; they are not a production code path.
- All `*.ipynb` files outside `legacy/` should fail review.

## References

- `legacy/*.ipynb` — original reference notebooks (read-only).
- `subprojects/python/src/eps_ground_rapture/cli.py` — the single entry point.
