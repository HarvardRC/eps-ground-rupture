"""Tests of the field-data export (`field-<h12>.json.gz`, docs/app/ddd.md §3.4).

The §7.3 contract file for the field export. Its full-data lane (tests named
`test_full_*`) reads the staged vintage, which it finds through the
working-tree pointer manifest `subprojects/webapp/data/pointer.json`: it
pins the per-(source, analogue) row counts on the shipped sources and checks
`labeled_set` membership against `config.LABELED_FIELD_EVENTS`, which it
imports instead of re-pinning. The lane skips only through the module-scoped
fixture below — without the staged vintage — and may not skip under
`EGR_REQUIRE_FULL_DATA=1` (tests/conftest.py).

Its fixture lane checks the §3.4 rules on the field export one export run
writes from synthetic source frames, in a temporary repository root: the
arm rules, the three `criterion_sub50` states with 50.0 itself `not_met`,
`limited_comparison`, `labeled_set` against the imported constant, the Kern
event identity, normalized names, the row order, and `pipeline_version`. It
reads no research data.
"""

from __future__ import annotations

import contextlib
import gzip
import json
import subprocess
from collections import Counter
from io import StringIO

import pandas as pd
import pytest

from eps_ground_rupture import __version__, config, views
from eps_ground_rupture import product_export as pe
from eps_ground_rupture.config import LABELED_FIELD_EVENTS, SCARP_CLASSES

# --------------------------------------------------------------------------
# Fixture lane: the §3.4 rules on synthetic source frames
# --------------------------------------------------------------------------

#: Each (source, analogue) arm's source table and column (§3.4).
ARMS: dict[tuple[str, str], tuple[str, str]] = {
    ("FDHI", "scarp_height"): ("fdhi_measurements", "vs_central_meters"),
    ("FDHI", "dzw"): ("fdhi_measurements", "fzw_central_meters"),
    ("SURE", "scarp_height"): ("sure", "SH"),
    ("SURE", "dzw"): ("sure", "FNC"),
    ("Kern", "scarp_height"): ("kern_combined", "Vertical"),
    ("Kern", "dzw"): ("kern_combined", "DZW"),
}

#: Kern's fixed event identity (§3.4).
KERN_EVENT = "Kern County (1952)"

#: The synthetic field sources: positive values beside zeros, negatives,
#: the -999 sentinel, and nulls in every arm; widths below, at, and above
#: 50.0 m; names padded with spaces and NBSPs; FDHI events in and out of the
#: labeled set, among them every name the constant lists for FDHI; and two
#: FDHI rows equal on the five ordering keys, ordered by their canonical
#: serialization.
FIELD_SOURCES: dict[str, dict[str, list]] = {
    "fdhi_measurements": {
        "eq_name": [
            " Wenchuan\xa0",
            "Landers",
            "Killari",
            "Kashmir",
            "Bohol",
            "Napa",
            "Napa",
            "Hector Mine",
        ],
        "magnitude": [7.9, -999.0, 6.2, 7.6, 7.2, 6.0, -999.0, 7.1],
        "vs_central_meters": [2.0, -999.0, 0.0, 3.5, None, 0.4, 0.4, 1.25],
        "fzw_central_meters": [49.999, 50.0, 120.5, None, None, -1.0, None, 0.75],
    },
    "sure": {
        "FNC": [5.0, 60.0, -999.0, 50.0],
        "SH": [1.0, 0.0, 0.7, None],
        "eq_name": ["Chi-Chi", "Tennant Creek\xa0", "Landers", "\xa0Denali "],
        "Latitude": [23.8, -19.8, 34.2, 63.5],
        "Longitude": [120.8, 134.0, -116.4, -147.5],
    },
    "kern_combined": {
        "DZW": [3.0, 0.0, 55.0, None],
        "Vertical": [0.3, 0.5, -0.1, None],
        "Location ID": ["K-1", "K-2", "K-3", "K-4"],
    },
}


def _git(root, *args):
    subprocess.run(
        ["git", "-c", "user.name=fixture", "-c", "user.email=fixture@example.invalid", *args],
        cwd=root,
        check=True,
        capture_output=True,
    )


def _dem_frame() -> pd.DataFrame:
    """A small synthetic `dem` table the export accepts: every pair of the
    nine-pair constant at dips 30 and 40, two stages each, the first
    unclassified with null measurements, values on their recording grids."""
    rows = []
    trials = [(a, s, d) for d in (30, 40) for a, s in pe.ARM_STRENGTH_STATES]
    for t, (arm, strength, dip) in enumerate(trials):
        for k in range(2):
            slip = (100 * (k + 1) + t) / 10000
            rows.append(
                {
                    "Trial": f"T{t:02d}",
                    "Fault_Dip": dip,
                    "Sediment_Strength": strength,
                    "Cohesion": "A",
                    "Set": arm,
                    "Depth": 3,
                    "Density": "Dense",
                    "Slip": slip,
                    "Scarp_Height": (100 + t) / 1000 if k else None,
                    "DZW": (200 + t) / 1000 if k else None,
                    "Scarp_Dip": (40000 + t) / 1000 if k else None,
                    "Scarp_Class": SCARP_CLASSES[t % len(SCARP_CLASSES)] if k else None,
                    "VD_HW": 0.5 * slip - 0.001,
                    "Us - Ud": 0.1,
                }
            )
    floats = ("Slip", "Scarp_Height", "DZW", "Scarp_Dip", "VD_HW", "Us - Ud")
    return pd.DataFrame(rows).astype({column: "float64" for column in floats})


@pytest.fixture(scope="module")
def exported_field(tmp_path_factory):
    """The field export one export run writes from the synthetic sources, in
    a temporary repository root (one commit, `data/` and `dist/` ignored):
    the parsed file."""
    root = tmp_path_factory.mktemp("field_export") / "repo"
    root.mkdir()
    _git(root, "init", "-q")
    (root / ".gitignore").write_text("data/\ndist/\n")
    _git(root, "add", ".gitignore")
    _git(root, "commit", "-q", "-m", "fixture repository")
    tables = {
        "dem": _dem_frame(),
        "fdhi_cleaned": pd.DataFrame(
            {
                "fzw_central_meters": [10.0],
                "vs_central_meters": [2.0],
                "eq_name": ["Wenchuan"],
                "magnitude": [7.9],
                "latitude_degrees": [31.0],
                "longitude_degrees": [103.0],
            }
        ),
        **{table: pd.DataFrame(columns) for table, columns in FIELD_SOURCES.items()},
    }
    for table, frame in tables.items():
        path = root / "data" / "processed" / table / "data.parquet"
        path.parent.mkdir(parents=True)
        frame.to_parquet(path, index=False)
    (root / "data" / "raw").mkdir()
    for name in (
        "DEM_dataset.csv",
        "SURE.csv",
        "Combine_BuwaldaFDHI_KernSDC.csv",
        "02_FDHI_FLATFILE_MEASUREMENTS_20220719.csv",
    ):
        (root / "data" / "raw" / name).write_bytes(b"stub\n")
    out = StringIO()
    with contextlib.redirect_stdout(out):
        code = pe.main(["--data-tag", pe.DEV_TAG], root=root)
    assert code == 0, out.getvalue()
    pointer = json.loads((root / pe.POINTER_PATH).read_text(encoding="utf-8"))
    directory = root / pe.DIST_APP_DIR / pointer["data_tag"]
    [name] = [name for name in pointer["files"] if name.startswith("field-")]
    return json.loads(gzip.decompress((directory / name).read_bytes()).decode("utf-8"))


def _normalized(name: str) -> str:
    """The pipeline's name normalization: NBSPs to spaces, spaces trimmed."""
    return name.replace("\xa0", " ").strip(" ")


def test_each_arm_admits_only_positive_source_values(exported_field):
    """Each (source, analogue) arm holds exactly the rows whose own source
    quantity is positive — no zero, negative, -999 sentinel, or null — with
    the source column named verbatim."""
    expected = Counter()
    for (source, analogue), (table, column) in ARMS.items():
        columns = FIELD_SOURCES[table]
        names = columns.get("eq_name", [KERN_EVENT] * len(columns[column]))
        for name, value in zip(names, columns[column], strict=True):
            if value is not None and value > 0:
                expected[(source, analogue, _normalized(name), column, value)] += 1
    got = Counter(
        (r["source"], r["analogue"], r["eq_name"], r["source_quantity"], r["value"])
        for r in exported_field["rows"]
    )
    assert got == expected
    assert all(row["value"] > 0 for row in exported_field["rows"])


def test_criterion_sub50_has_three_states(exported_field):
    """`criterion_sub50` is `met` exactly for width rows below 50.0,
    `not_met` for width rows at 50.0 or above — 50.0 itself included — and
    `not_applicable` for scarp-height rows."""
    rows = exported_field["rows"]
    for row in rows:
        if row["analogue"] == "scarp_height":
            expected = "not_applicable"
        else:
            expected = "met" if row["value"] < 50.0 else "not_met"
        assert row["criterion_sub50"] == expected, row
    at_50 = [r for r in rows if r["analogue"] == "dzw" and r["value"] == 50.0]
    assert at_50 and {r["criterion_sub50"] for r in at_50} == {"not_met"}
    assert {r["criterion_sub50"] for r in rows} == {"met", "not_met", "not_applicable"}


def test_limited_comparison_marks_exactly_the_sure_fnc_rows(exported_field):
    """`limited_comparison` is true exactly on SURE `FNC` width rows."""
    for row in exported_field["rows"]:
        expected = row["source"] == "SURE" and row["source_quantity"] == "FNC"
        assert row["limited_comparison"] is expected, row


def test_labeled_set_follows_the_constant(exported_field):
    """`labeled_set` follows the imported `config.LABELED_FIELD_EVENTS`: true
    exactly on the rows of a source it maps to None and on the rows whose
    `eq_name` its source's tuple names, for both analogues alike."""
    for row in exported_field["rows"]:
        events = LABELED_FIELD_EVENTS[row["source"]]
        assert row["labeled_set"] is (events is None or row["eq_name"] in events), row


def test_kern_rows_carry_the_fixed_event_identity(exported_field):
    """Every Kern row carries the event `Kern County (1952)` and its
    magnitude `views.KERN_MAGNITUDE`."""
    kern = [row for row in exported_field["rows"] if row["source"] == "Kern"]
    assert kern
    assert {(row["eq_name"], row["magnitude"]) for row in kern} == {
        (KERN_EVENT, views.KERN_MAGNITUDE)
    }


def test_event_names_arrive_normalized(exported_field):
    """Every event name arrives NBSP-free and trimmed, the padded source
    names among them."""
    names = {row["eq_name"] for row in exported_field["rows"]}
    assert all(name == _normalized(name) and "\xa0" not in name for name in names)
    assert {"Wenchuan", "Tennant Creek", "Denali"} <= names


def test_rows_follow_the_section_3_4_order(exported_field):
    """Rows ascend by (`source`, `analogue`, `eq_name`, `source_quantity`,
    `value`) — strings by code point, `value` numerically — and rows equal on
    all five by their canonical serialization."""
    rows = exported_field["rows"]

    def key(row):
        canonical = json.dumps(row, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
        return (
            row["source"],
            row["analogue"],
            row["eq_name"],
            row["source_quantity"],
            row["value"],
            canonical,
        )

    assert rows == sorted(rows, key=key)
    napa = [row["magnitude"] for row in rows if row["eq_name"] == "Napa"]
    assert napa == [6.0, None]


def test_envelope_carries_pipeline_version(exported_field):
    """The envelope holds `schema_version` 1, `export_version`,
    `export_date`, and the running pipeline's `pipeline_version`, beside
    `rows`."""
    assert set(exported_field) == {
        "schema_version",
        "export_version",
        "export_date",
        "pipeline_version",
        "rows",
    }
    assert exported_field["schema_version"] == 1
    assert exported_field["export_version"] == pe.DEV_TAG
    assert exported_field["pipeline_version"] == __version__


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
