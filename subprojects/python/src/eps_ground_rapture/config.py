"""Project paths and shared constants.

Resolves repo-relative paths from this file's location so the pipeline runs
the same whether invoked from a script, `poetry run`, or a Gradle task.
"""

from __future__ import annotations

from pathlib import Path

REPO_ROOT: Path = Path(__file__).resolve().parents[4]

DATA_DIR: Path = REPO_ROOT / "data"
RAW_DIR: Path = DATA_DIR / "raw"
INTERIM_DIR: Path = DATA_DIR / "interim"
PROCESSED_DIR: Path = DATA_DIR / "processed"

LEGACY_DIR: Path = REPO_ROOT / "legacy"

# Categorical vocabularies used across the DEM dataset.
SCARP_CLASSES: tuple[str, ...] = (
    "Monoclinal",
    "Monoclinal Collapse",
    "Pressure Ridge",
    "Pressure Ridge Collapse",
    "Simple",
    "Simple Collapse",
)

SCARP_CLASS_PALETTE: dict[str, str] = {
    "Monoclinal": "#009ffa",
    "Monoclinal Collapse": "#3f67b1",
    "Pressure Ridge": "#f47820",
    "Pressure Ridge Collapse": "#af773e",
    "Simple": "#ed2024",
    "Simple Collapse": "#9f1d20",
}
