"""Tests of the field-data export (`field-<h12>.json.gz`, docs/app/ddd.md §3.4).

The §7.3 contract file for the field export. Its full-data lane (tests named
`test_full_*`) reads the staged vintage, which it finds through the
working-tree pointer manifest `subprojects/webapp/data/pointer.json`: it
pins the per-(source, analogue) row counts on the shipped sources and checks
`labeled_set` membership against `config.LABELED_FIELD_EVENTS`, which it
imports instead of re-pinning. The lane skips only through the module-scoped
fixture below — without the staged vintage — and may not skip under
`EGR_REQUIRE_FULL_DATA=1` (tests/conftest.py).
"""

from __future__ import annotations

import gzip
import json
from collections import Counter

import pytest

from eps_ground_rupture import config
from eps_ground_rupture import product_export as pe
from eps_ground_rupture.config import LABELED_FIELD_EVENTS

# --------------------------------------------------------------------------
# Full-data lane: the staged vintage's field export
# --------------------------------------------------------------------------

#: Rows per (source, analogue) arm on the shipped sources, recorded by the
#: first full-data run (data-v0-test export of 2026-11-02). They extend the
#: per-source populations `test_historic_events.py` pins (SURE FNC > 0: 185,
#: SH > 0: 74; Kern DZW > 0: 11, Vertical > 0: 16). Re-pin deliberately,
#: don't loosen.
PINNED_ARM_ROWS = {
    ("FDHI", "dzw"): 472,
    ("FDHI", "scarp_height"): 2376,
    ("Kern", "dzw"): 11,
    ("Kern", "scarp_height"): 16,
    ("SURE", "dzw"): 185,
    ("SURE", "scarp_height"): 74,
}


@pytest.fixture(scope="module")
def field_rows():
    """The rows of the field export the working-tree pointer's vintage
    holds."""
    pointer_path = config.REPO_ROOT / pe.POINTER_PATH
    if not pointer_path.is_file():
        pytest.skip("staged vintage missing; run exportApp")
    pointer = json.loads(pointer_path.read_text(encoding="utf-8"))
    directory = config.REPO_ROOT / pe.DIST_APP_DIR / pointer["data_tag"]
    if not directory.is_dir():
        pytest.skip("staged vintage missing; run exportApp")
    [manifest_name] = [name for name in pointer["files"] if name.startswith("manifest-")]
    manifest = json.loads((directory / manifest_name).read_text(encoding="utf-8"))
    payload = gzip.decompress((directory / manifest["files"]["field_export"]).read_bytes())
    return json.loads(payload.decode("utf-8"))["rows"]


def test_full_per_arm_row_counts(field_rows):
    """The per-(source, analogue) row counts of the shipped sources."""
    got = Counter((row["source"], row["analogue"]) for row in field_rows)
    assert dict(got) == PINNED_ARM_ROWS


def test_full_labeled_set_membership(field_rows):
    """`labeled_set` is true exactly on the rows of a source the imported
    constant maps to None and on the rows whose `eq_name` its source's tuple
    names, for both analogues alike."""
    wrong = [
        row
        for row in field_rows
        if row["labeled_set"]
        != (
            LABELED_FIELD_EVENTS[row["source"]] is None
            or row["eq_name"] in LABELED_FIELD_EVENTS[row["source"]]
        )
    ]
    assert wrong == []
