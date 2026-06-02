"""Dataset loaders.

The legacy notebooks read CSVs from hard-coded absolute paths on the original
author's laptop. These loaders centralize that and read from `data/raw/` by
default.
"""

from __future__ import annotations

from pathlib import Path

import pandas as pd

from .config import RAW_DIR


def load_dem(path: Path | str | None = None) -> pd.DataFrame:
    """Load the main 2D DEM measurements dataset.

    Original file: `DEM_dataset.csv` (homogeneous + heterogeneous trials).
    """
    path = Path(path) if path else RAW_DIR / "DEM_dataset.csv"
    # low_memory=False: Cohesion mixes strings (R1..R10, Q, S, A..M) and NaN —
    # without this pandas raises a DtypeWarning on chunk-boundary type mismatch.
    return pd.read_csv(path, low_memory=False)


def load_fdhi(path: Path | str | None = None) -> pd.DataFrame:
    """Load the **pre-cleaned** FDHI measurements supplied by the prior owner.

    This is the small (~20-row) CSV that the prior owner's
    `FDHI-SURE-DEM_SCATTER.py` script produces from the full FDHI flatfile.
    We consume it as-is for now; replacing it with raw-flatfile + in-pipeline
    cleaning is on the TODO list (see repo-root TODO.md).
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
