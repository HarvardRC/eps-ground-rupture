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
    """Load the FDHI (Fault Displacement Hazard Initiative) flatfile measurements."""
    path = Path(path) if path else RAW_DIR / "02_FDHI_FLATFILE_MEASUREMENTS_20220719.csv"
    return pd.read_csv(path)


def load_kern_combined(path: Path | str | None = None) -> pd.DataFrame:
    """Load the combined Buwalda/FDHI Kern County dataset."""
    path = Path(path) if path else RAW_DIR / "Combine_BuwaldaFDHI_KernSDC.csv"
    return pd.read_csv(path)
