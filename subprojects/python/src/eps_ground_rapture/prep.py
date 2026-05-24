"""Cleaning and filtering routines extracted from the legacy notebooks.

Each function is pure: takes a DataFrame, returns a new DataFrame. Notebook
code that mutated globals and built ad-hoc subset variables (df_R1, df_FDHI_sh,
etc.) is intentionally not ported as-is — downstream Tableau/Superset
dashboards do their own slicing.
"""

from __future__ import annotations

import pandas as pd


def clean_fdhi(df: pd.DataFrame) -> pd.DataFrame:
    """Filter the FDHI flatfile to the rows the legacy notebook keeps.

    Matches the pipeline in `2D DEM - Figures for 2024 DEM Paper.ipynb`:
      - reverse / reverse-oblique style only
      - principal rupture rank
      - positive scarp-height measurements
      - 0 < fzw_central_meters < 50
      - usage flag in {Check, Keep}
    """
    keep_style = df["style"].isin(["Reverse", "Reverse-Oblique"])
    keep_rank = df["rupture_rank"].eq("Principal")
    df = df.loc[keep_style & keep_rank].copy()

    sh_cols = [
        "vs_central_meters",
        "vs_low_meters",
        "vs_high_meters",
        "sh_central_meters",
        "sh_low_meters",
        "sh_high_meters",
    ]
    has_positive_sh = (df[sh_cols] > 0).any(axis=1)
    df = df.loc[has_positive_sh]

    df = df.loc[df["fzw_central_meters"].between(0, 50, inclusive="neither")]
    df = df.loc[df["recommended_net_preferred_usage_flag"].isin(["Check", "Keep"])]
    return df.reset_index(drop=True)
