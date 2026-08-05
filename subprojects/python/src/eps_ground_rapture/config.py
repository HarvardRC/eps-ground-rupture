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

# Event magnitudes (Mw) for the SURE database, keyed by `eq_name` — SURE.csv
# carries no magnitude column, so `unified_observations` joins these in.
# Keys are the eq_name values *after* stripping the stray trailing NBSPs
# (U+00A0) some of them carry in the CSV.
#
# Sources: SURE 2.0 paper (Nurminen et al. 2022, Sci Data,
# doi:10.1038/s41597-022-01835-z) where stated; entries marked "confirm"
# are common literature values awaiting the owner's verification; None =
# not yet established (view emits NULL).
SURE_EVENT_MAGNITUDES: dict[str, float | None] = {
    "Wenchuan": 7.9,  # 2008, China (matches FDHI per-row magnitude)
    "Chi-Chi": 7.6,  # 1999, Taiwan
    "Kashmir": 7.6,  # 2005, Pakistan (matches FDHI per-row magnitude)
    "San Fernando": 6.7,  # 1971, USA (SURE 2.0 lists 6.7; USGS: 6.6)
    "El Asnam": 7.1,  # 1980, Algeria
    "Spitak": 6.8,  # 1988, Armenia
    "Killari": 6.2,  # 1993 Latur, India — confirm
    "Nagano": 6.2,  # assumed 2014 Nagano-ken Hokubu (Kamishiro fault,
    #   reverse-oblique); the 1984 western-Nagano event is also ~6.2 — confirm
    "Tennant Creek": 6.6,  # 1988, Australia (largest of the triplet) — confirm
    "Calingiri": 5.0,  # 1970, Australia
    "Marryat Creek": 5.8,  # 1986, Australia — confirm
    "Petermann": 6.1,  # 2016, Australia — confirm
    "Pukatja": 5.2,  # 2012, Australia — confirm
    "LeTeil": 4.9,  # 2019, France
    "Parina": None,  # event identity unclear — fill in when established
    "Coalinga (Nuñez)": None,  # 1983 Nuñez ruptures span an aftershock
    #   sequence; no single Mw is obviously right — owner's call
}
