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
# Source: the SURE 2.0 data descriptor — Nurminen et al. (2022), Sci Data,
# doi:10.1038/s41597-022-01835-z. Every value below was confirmed against
# that paper by the project owner (K. Chiama), 2026-08-06; no entry is
# awaiting verification. (A value of None is still allowed by the views —
# an event absent from the CASE emits NULL — but none is needed today.)
SURE_EVENT_MAGNITUDES: dict[str, float | None] = {
    "Wenchuan": 7.9,  # 2008, China (matches FDHI per-row magnitude)
    "Chi-Chi": 7.6,  # 1999, Taiwan
    "Kashmir": 7.6,  # 2005, Pakistan (matches FDHI per-row magnitude)
    "San Fernando": 6.7,  # 1971, USA (SURE 2.0 lists 6.7; USGS: 6.6)
    "El Asnam": 7.1,  # 1980, Algeria
    "Spitak": 6.8,  # 1988, Armenia
    "Killari": 6.2,  # 1993 Latur, India
    "Nagano": 6.2,  # 2014 Nagano-ken Hokubu (Kamishiro fault,
    #   reverse-oblique) — the 2014 identity confirmed by the owner
    "Tennant Creek": 6.6,  # 1988, Australia — the largest shock of the
    #   triplet; SURE includes measurements from all three ruptures
    "Calingiri": 5.0,  # 1970, Australia
    "Marryat Creek": 5.7,  # 1986, Australia
    "Petermann": 6.1,  # 2016, Australia
    "Pukatja": 5.4,  # 2012, Australia
    "LeTeil": 4.9,  # 2019, France
    "Parina": 6.2,  # 2016, Peru
    "Coalinga (Nuñez)": 5.4,  # 1983, USA — the Nuñez ruptures of the
    #   Coalinga aftershock sequence
}
