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


def load_dem(path: Path | str | None = None) -> pd.DataFrame:
    """Load the main 2D DEM measurements dataset.

    Original file: `DEM_dataset.csv` (homogeneous + heterogeneous trials).
    """
    path = Path(path) if path else RAW_DIR / "DEM_dataset.csv"
    # low_memory=False: Cohesion mixes strings (R1..R10, Q, S, A..M) and NaN —
    # without this pandas raises a DtypeWarning on chunk-boundary type mismatch.
    return pd.read_csv(path, low_memory=False)


def find_fdhi_flatfile(raw_dir: Path | str | None = None) -> Path | None:
    """Locate the raw FDHI flatfile in `data/raw/`, or None if absent.

    If several vintages are present, the newest date suffix wins (the glob
    sorts lexicographically, and the suffix is YYYYMMDD).
    """
    raw_dir = Path(raw_dir) if raw_dir else RAW_DIR
    matches = sorted(raw_dir.glob(FDHI_FLATFILE_GLOB))
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
    `FDHI-SURE-DEM_SCATTER.py` script produces from the full FDHI flatfile.
    It remains as the fallback source for the `fdhi_cleaned` table when the
    raw flatfile hasn't been downloaded; with the flatfile present,
    `egr-build` derives the same subset in-pipeline via `prep.clean_fdhi`.
    """
    path = Path(path) if path else RAW_DIR / "FDHI_Cleaned_Measurements.csv"
    return pd.read_csv(path)


def load_sure(path: Path | str | None = None) -> pd.DataFrame:
    """Load the SURE (Surface Rupture Earthquake) database.

    The CSV ships with a UTF-8 BOM on the first column header — we strip it
    via ``encoding="utf-8-sig"`` so column names compare cleanly.
    """
    path = Path(path) if path else RAW_DIR / "SURE.csv"
    return pd.read_csv(path, encoding="utf-8-sig")


def load_kern_combined(path: Path | str | None = None) -> pd.DataFrame:
    """Load the combined Buwalda/FDHI/SDC Kern County dataset.

    The CSV has a UTF-8 BOM and three columns literally named "Comments";
    ``encoding="utf-8-sig"`` strips the BOM, and pandas auto-renames the
    duplicates to ``Comments``, ``Comments.1``, ``Comments.2``.
    """
    path = Path(path) if path else RAW_DIR / "Combine_BuwaldaFDHI_KernSDC.csv"
    return pd.read_csv(path, encoding="utf-8-sig")
