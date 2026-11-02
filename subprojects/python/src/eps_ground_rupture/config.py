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

# The field overlay's default set — D-18 (Field-overlay default set and
# per-source analogue map) — per field source: the normalized `eq_name`
# values whose rows are members, or None when every row of the source is a
# member. The `field_export` product view sets its `labeled_set` column from
# this, for both analogues alike (docs/app/ddd.md §3.4, Labeled set).
#
# This is the Proposed reading. FDHI: the events labeled in cell 25 of the
# notebook `legacy/2Ddem 2025 Paper Revisions - FDHI Scarp Height & DZW.ipynb`
# that carry an FDHI central measure (`vs_central_meters` or
# `fzw_central_meters`) — PINNED_FDHI_EVENTS of tests/test_historic_events.py;
# Bohol, also labeled there, carries neither. SURE and Kern County: every
# row. The membership that owner action OA-14 records (docs/app/ip.md §4)
# replaces it in a commit that changes this constant alone. Tests import
# the constant wherever they need the membership; they never re-pin it.
LABELED_FIELD_EVENTS: dict[str, tuple[str, ...] | None] = {
    "FDHI": ("Wenchuan", "Kashmir", "Killari"),
    "SURE": None,
    "Kern": None,
}
