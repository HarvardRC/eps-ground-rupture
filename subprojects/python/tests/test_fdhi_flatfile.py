"""Integration checks that need the real FDHI raw flatfile in `data/raw/`.

These are skipped until the flatfile is downloaded (UCLA Dataverse,
DOI 10.25346/S6/Y4F9LJ, file ABRP7B) — see repo-root TODO.md. Once it is
present, they pin the in-pipeline cleaning to the prior owner's shipped
extract, so a silent divergence between the two FDHI sources fails loudly.
"""

import pytest

from eps_ground_rapture import io, prep

flatfile = io.find_fdhi_flatfile()

pytestmark = pytest.mark.skipif(
    flatfile is None,
    reason="raw FDHI flatfile not downloaded yet (see TODO.md)",
)


@pytest.fixture(scope="module")
def raw():
    return io.load_fdhi_flatfile(flatfile)


def test_clean_fdhi_reproduces_the_shipped_extract(raw):
    """`prep.clean_fdhi` must yield the same rows as the prior owner's
    `FDHI_Cleaned_Measurements.csv` (produced by the same chain from the
    20220719 flatfile vintage).

    If this fails after downloading a *newer* flatfile vintage, the data
    itself may have changed upstream — compare `eq_name` counts below and
    decide whether to adopt the new extract or pin the old vintage.
    """
    derived = prep.clean_fdhi(raw)
    shipped = io.load_fdhi()
    assert len(derived) == len(shipped), (
        f"derived {len(derived)} rows vs shipped {len(shipped)} — "
        f"flatfile vintage {flatfile.name} may differ from the one the "
        "prior owner used (20220719)"
    )
    assert (
        derived["eq_name"].value_counts().to_dict()
        == shipped["eq_name"].value_counts().to_dict()
    )
    # Same measurement values, not just the same shape.
    for col in ("fzw_central_meters", "vs_central_meters"):
        assert sorted(derived[col].tolist()) == pytest.approx(
            sorted(shipped[col].tolist())
        )


def test_fdhi_measurements_is_a_real_boxplot_population(raw):
    """The per-event base must be far richer than the 19-row scatter extract
    and cover the events the notebook's boxplot cells drew (incl. Bohol,
    which the extract lacks entirely)."""
    base = prep.fdhi_measurements(raw)
    shipped = io.load_fdhi()
    assert len(base) > len(shipped) * 5

    fzw = base[(base["fzw_central_meters"] > 0)
               & (base["fzw_central_meters"] < prep.FDHI_FZW_MAX_METERS)]
    events = set(fzw["eq_name"])
    assert {"Wenchuan", "Kashmir", "Kern"} <= events
    assert "Bohol" in events

    # Scarp-height boxplots become possible at all: the extract has zero
    # positive sh_central values, the base must have plenty.
    assert (base["sh_central_meters"] > 0).sum() > 0
    # Sentinels are nulls, so quantiles are safe.
    assert not (base["sh_central_meters"] == prep.FDHI_SENTINEL).any()
