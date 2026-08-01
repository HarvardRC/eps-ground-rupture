"""Dataset loaders.

The legacy notebooks read CSVs from hard-coded absolute paths on the original
author's laptop. These loaders centralize that and read from `data/raw/` by
default.
"""

from __future__ import annotations

from pathlib import Path

import pandas as pd

from .config import RAW_DIR

#: The raw FDHI flatfile is versioned by a date suffix — accept any vintage.
#: Source: UCLA Dataverse, DOI 10.25346/S6/Y4F9LJ, file ABRP7B
#: (e.g. ``02_FDHI_FLATFILE_MEASUREMENTS_20220719.csv``).
FDHI_FLATFILE_GLOB = "02_FDHI_FLATFILE_MEASUREMENTS_*.csv"

#: The prior owner's pre-cleaned FDHI extract. Historical: `egr-build` used
#: to fall back to it when the flatfile was absent, but that produced a
#: `fdhi_cleaned` of a different shape (two extra columns) and no
#: `fdhi_measurements` — silently disagreeing with the committed Glue
#: schema. The build now requires the flatfile; this file is kept only as
#: the reference the cleaning chain is checked against (`tests/test_prep.py`).
FDHI_PRECLEANED_NAME = "FDHI_Cleaned_Measurements.csv"

DEM_NAME = "DEM_dataset.csv"
SURE_NAME = "SURE.csv"
KERN_NAME = "Combine_BuwaldaFDHI_KernSDC.csv"

#: Raw inputs `egr-build` needs, as ``{filename-or-glob: provenance}``. All
#: of `data/raw/` is gitignored, so these must be placed by hand — hence the
#: provenance note carried into each error message. The loaders below read
#: the same constants, so the two cannot drift apart.
REQUIRED_RAW_INPUTS: dict[str, str] = {
    DEM_NAME: "2D DEM trial measurements (from the project owner)",
    FDHI_FLATFILE_GLOB: (
        "raw FDHI flatfile — UCLA Dataverse, DOI 10.25346/S6/Y4F9LJ, file ABRP7B"
    ),
    SURE_NAME: "SURE database v2.0 (surface-rupture observations)",
    KERN_NAME: "combined Buwalda / FDHI / SDC Kern County dataset",
}


def missing_raw_inputs(raw_dir: Path | str | None = None) -> list[tuple[str, str]]:
    """Which of :data:`REQUIRED_RAW_INPUTS` are absent, as ``(pattern, why)``.

    Only presence is checked — a file that exists but is empty or malformed
    still fails later, in the loader that reads it.
    """
    raw_dir = Path(raw_dir) if raw_dir else RAW_DIR
    return [
        (pattern, why)
        for pattern, why in REQUIRED_RAW_INPUTS.items()
        if not any(p.is_file() for p in raw_dir.glob(pattern))
    ]


def require_raw_inputs(raw_dir: Path | str | None = None) -> None:
    """Fail fast if any required raw input is missing.

    Called before `egr-build` does any work, so an absent input is one clear
    message naming everything missing rather than a traceback partway
    through a run that has already rewritten half the artifacts.
    """
    missing = missing_raw_inputs(raw_dir)
    if not missing:
        return
    raw_dir = Path(raw_dir) if raw_dir else RAW_DIR
    lines = "\n".join(f"  - {pattern}  ({why})" for pattern, why in missing)
    raise FileNotFoundError(
        f"Missing required raw input(s) in {raw_dir}:\n{lines}\n"
        "data/raw/ is gitignored — see data/README.md for the expected files."
    )


def load_dem(path: Path | str | None = None) -> pd.DataFrame:
    """Load the main 2D DEM measurements dataset.

    Original file: `DEM_dataset.csv` (homogeneous + heterogeneous trials).
    """
    path = Path(path) if path else RAW_DIR / DEM_NAME
    # low_memory=False: Cohesion mixes strings (R1..R10, Q, S, A..M) and NaN —
    # without this pandas raises a DtypeWarning on chunk-boundary type mismatch.
    return pd.read_csv(path, low_memory=False)


def find_fdhi_flatfile(raw_dir: Path | str | None = None) -> Path | None:
    """Locate the raw FDHI flatfile in `data/raw/`, or None if absent.

    With several present the last by filename wins, which for the canonical
    ``..._<YYYYMMDD>.csv`` naming is the newest vintage. A stray copy that
    sorts later (``..._20220719_copy.csv``) would win instead — keep one.
    Non-files matching the glob are ignored, so this agrees with
    :func:`missing_raw_inputs`.
    """
    raw_dir = Path(raw_dir) if raw_dir else RAW_DIR
    matches = sorted(p for p in raw_dir.glob(FDHI_FLATFILE_GLOB) if p.is_file())
    return matches[-1] if matches else None


def load_fdhi_flatfile(path: Path | str | None = None) -> pd.DataFrame:
    """Load the **raw** FDHI flatfile (the pipeline's FDHI source of truth).

    The cleaning that turns this into the `fdhi_cleaned` and
    `fdhi_measurements` tables lives in :mod:`.prep`.
    """
    path = Path(path) if path else find_fdhi_flatfile()
    if path is None:
        raise FileNotFoundError(
            f"No FDHI flatfile matching {FDHI_FLATFILE_GLOB!r} in {RAW_DIR}. "
            "Download it from UCLA Dataverse (DOI 10.25346/S6/Y4F9LJ, file "
            "ABRP7B) and drop it there — see repo-root TODO.md."
        )
    # low_memory=False: ~140 mixed-type columns trip chunked dtype inference.
    return pd.read_csv(path, low_memory=False)


def load_fdhi(path: Path | str | None = None) -> pd.DataFrame:
    """Load the **pre-cleaned** FDHI measurements supplied by the prior owner.

    This is the small (~20-row) CSV that the prior owner's
    `FDHI-SURE-DEM_SCATTER.py` script produced from the full FDHI flatfile.
    `egr-build` no longer reads it — `prep.clean_fdhi` derives the same
    subset from the raw flatfile in-pipeline. It survives as the reference
    that equivalence is checked against (`tests/test_prep.py`).
    """
    path = Path(path) if path else RAW_DIR / FDHI_PRECLEANED_NAME
    return pd.read_csv(path)


def load_sure(path: Path | str | None = None) -> pd.DataFrame:
    """Load the SURE (Surface Rupture Earthquake) database.

    The CSV ships with a UTF-8 BOM on the first column header — we strip it
    via ``encoding="utf-8-sig"`` so column names compare cleanly.
    """
    path = Path(path) if path else RAW_DIR / SURE_NAME
    return pd.read_csv(path, encoding="utf-8-sig")


def load_kern_combined(path: Path | str | None = None) -> pd.DataFrame:
    """Load the combined Buwalda/FDHI/SDC Kern County dataset.

    The CSV has a UTF-8 BOM and three columns literally named "Comments";
    ``encoding="utf-8-sig"`` strips the BOM, and pandas auto-renames the
    duplicates to ``Comments``, ``Comments.1``, ``Comments.2``.
    """
    path = Path(path) if path else RAW_DIR / KERN_NAME
    return pd.read_csv(path, encoding="utf-8-sig")
