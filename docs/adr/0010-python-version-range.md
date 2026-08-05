# ADR-0010: Python version range — `>=3.11,<3.14`

- **Status**: Proposed — Claude imposed the cap to unblock the install when Poetry resolved to Python 3.14 and pyarrow 18 had no wheel. The project owner has not explicitly ratified the range; alternatives (install cmake + Arrow C++ deps, or wait for pyarrow 3.14 wheels) remain viable.
- **Date**: 2026-05-23
- **Deciders**: Claude (proposed)

## Context

The initial `pyproject.toml` specified `python = "^3.11"`, which permits
3.11 through 3.x including 3.14. Poetry resolved against Python 3.14 on
the project owner's machine. `pyarrow` 18 has no 3.14 wheel; Poetry then
attempted a from-source build that failed at `cmake` (not installed
system-wide, plus heavyweight Arrow C++ build deps required).

## Decision

Cap the supported range at **`python = ">=3.11,<3.14"`** in
`pyproject.toml`. Use `poetry env use python3.13` to pin developer envs.

## Alternatives considered

- **Install cmake + Arrow C++ deps system-wide** — heavyweight,
  contaminates developer machines, slow source builds.
- **Bump `pyarrow` to a version with 3.14 wheels** — no major release of
  pyarrow ships 3.14 wheels as of writing.
- **Require Python 3.13 exactly** — needlessly narrow; 3.11 and 3.12 are
  fine for now.

## Consequences

- Reproducible installs on user's Python 3.13.7.
- Revisit when pyarrow ships official 3.14 wheels; raising the cap is a
  one-line `pyproject.toml` change.
- New contributors get a clear error from Poetry if they try a
  too-new/too-old interpreter.

## References

- `subprojects/python/pyproject.toml`
- Issue: pyarrow 3.14 wheel availability (track upstream)
