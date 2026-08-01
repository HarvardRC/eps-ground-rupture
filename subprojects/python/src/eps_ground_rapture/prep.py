"""Cleaning and filtering routines for raw inputs.

``legacy/FDHI-SURE-DEM_SCATTER.py``, referenced below as the source of
:func:`clean_fdhi`'s chain, is **not present in this repo or in the local
gitignored ``legacy/`` directory** (which holds only the notebooks and the
paper PDF) — request it from the prior owner if you need to re-derive the
chain. What anchors the claim instead: running :func:`clean_fdhi` over the
raw flatfile reproduces the shipped ``FDHI_Cleaned_Measurements.csv``
row-for-row, which ``tests/test_prep.py`` checks when both files are
present; the rest of that module pins the behavior documented here against
synthetic frames, including the quirks that are deliberate (the duplicate
rows, the absent ``rupture_rank`` filter).

The FDHI story: the raw UCLA Dataverse flatfile
(``02_FDHI_FLATFILE_MEASUREMENTS_<date>.csv``, DOI 10.25346/S6/Y4F9LJ) is
the source of truth, and two tables are derived from it:

* :func:`clean_fdhi` — faithful reimplementation of the prior owner's
  latest filter chain (``legacy/FDHI-SURE-DEM_SCATTER.py``), producing the
  scatter-overlay subset that used to arrive pre-cleaned as
  ``FDHI_Cleaned_Measurements.csv``. Deliberately row-faithful —
  including the duplicate rows the chain's concat-of-subsets produces —
  so Dashboard 1's overlays are unchanged by the source switch. Pass
  ``deduplicate=True`` to drop the duplicates instead.
* :func:`fdhi_measurements` — the analysis base for per-event statistics
  (Dashboard 3 boxplots): reverse-style rows only, with the flatfile's
  ``-999`` missing-data sentinel normalized to null so aggregates
  (medians, quartiles) are not poisoned by sentinel values. Row-level
  filters (``0 < fzw < 50``, ``rupture_rank``, per-measure positivity)
  are left to the dashboards, mirroring the notebook's boxplot cells.

The DEM / SURE / Kern tables still need no pipeline-side cleaning.
"""

from __future__ import annotations

import pandas as pd

#: The fault styles the analysis keeps (Chiama et al. 2025 studies reverse
#: ruptures; the prior owner's script concatenates exactly these two).
FDHI_STYLES: tuple[str, ...] = ("Reverse", "Reverse-Oblique")

#: FDHI's missing-data sentinel (used across its numeric columns).
FDHI_SENTINEL: float = -999.0

#: The scatter subset keeps ``0 < fzw_central_meters < FDHI_FZW_MAX_METERS``.
FDHI_FZW_MAX_METERS: float = 50.0

#: Usage flags retained by the prior owner's chain.
FDHI_USAGE_FLAGS: tuple[str, ...] = ("Check", "Keep")

#: Columns whose positivity qualifies a row for the scatter subset — the
#: union (via concat, duplicates and all) is the prior owner's exact logic.
FDHI_POSITIVE_MEASURES: tuple[str, ...] = (
    "vs_central_meters",
    "vs_low_meters",
    "vs_high_meters",
    "sh_central_meters",
    "sh_low_meters",
    "sh_high_meters",
)


def clean_fdhi(df: pd.DataFrame, *, deduplicate: bool = False) -> pd.DataFrame:
    """The prior owner's latest FDHI filter chain, applied to the raw flatfile.

    Reproduces ``legacy/FDHI-SURE-DEM_SCATTER.py`` exactly:

    1. keep ``style`` in :data:`FDHI_STYLES`;
    2. concatenate the six subsets with a positive ``vs_*``/``sh_*``
       measurement (a row positive in N of them appears N times — that is
       the script's behavior, and the shipped
       ``FDHI_Cleaned_Measurements.csv`` contains those duplicates);
    3. keep ``0 < fzw_central_meters < 50``;
    4. keep ``recommended_net_preferred_usage_flag`` in {Check, Keep}.

    Unlike the older notebook chain there is **no**
    ``rupture_rank == 'Principal'`` filter — the prior owner dropped it.

    ``deduplicate=True`` collapses step 2's duplicates (adopt only after
    checking the dashboards that consume this table against the change).
    """
    styled = df[df["style"].isin(FDHI_STYLES)]
    out = pd.concat([styled[styled[col] > 0] for col in FDHI_POSITIVE_MEASURES])
    out = out[out["fzw_central_meters"] > 0]
    out = out[out["fzw_central_meters"] < FDHI_FZW_MAX_METERS]
    out = out[out["recommended_net_preferred_usage_flag"].isin(FDHI_USAGE_FLAGS)]
    if deduplicate:
        out = out.drop_duplicates()
    return out


def fdhi_measurements(df: pd.DataFrame) -> pd.DataFrame:
    """The per-event-statistics base table (Dashboard 3).

    Keeps every reverse-style row of the flatfile (no positivity, window,
    or flag filters — those are per-chart choices), and replaces the
    ``-999`` sentinel with nulls in every numeric column so that medians,
    quartiles and averages computed downstream are trustworthy.

    Integer columns containing the sentinel are upcast to float by the
    masking (pandas represents the resulting nulls as NaN); Parquet then
    stores them as nullable doubles, which is what Athena/DuckDB expect.
    """
    out = df[df["style"].isin(FDHI_STYLES)].copy()
    numeric = out.select_dtypes(include=["number"]).columns
    out[numeric] = out[numeric].mask(out[numeric] == FDHI_SENTINEL)
    return out
