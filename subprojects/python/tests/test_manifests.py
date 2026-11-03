"""Tests of the two manifests (docs/app/ddd.md §3.2 artifact manifest, §3.3 pointer).

The §7.3 contract file for the manifest consistency rules. Its full-data
lane (tests named `test_full_*`) cross-checks the staged vintage's artifact
manifest and pointer manifest, finding the vintage through the working-tree
pointer manifest `subprojects/webapp/data/pointer.json` — the rules the §4.1
export run enforces, exercised independently as a test, which
`publishVintage` runs before tagging (§4.2 step 4). The lane skips only
through the module-scoped fixture below — without the staged vintage — and
may not skip under `EGR_REQUIRE_FULL_DATA=1` (tests/conftest.py).
"""

from __future__ import annotations

import gzip
import hashlib
import json
import re
import struct

import pytest

from eps_ground_rupture import config
from eps_ground_rupture import product_export as pe

# --------------------------------------------------------------------------
# Full-data lane: the staged vintage's two manifests
# --------------------------------------------------------------------------

#: The artifact manifest's fields (§3.2).
MANIFEST_FIELDS = {
    "schema_version",
    "export_version",
    "export_date",
    "pipeline_version",
    "provenance",
    "counts",
    "blocks",
    "columns",
    "trial_columns",
    "arm_strength_states",
    "scarp_classes",
    "scarp_class_palette",
    "trials",
    "stage_spacing",
    "slip_window_bounds",
    "files",
    "reference_results_version",
    "checksums",
}

#: The pointer manifest's fields (§3.3).
POINTER_FIELDS = {
    "schema_version",
    "data_tag",
    "export_version",
    "export_date",
    "provenance",
    "files",
}

#: The `provenance` members (§3.2).
PROVENANCE_FIELDS = {"source_commit", "source_tree_clean", "inputs", "environment", "compression"}

#: The manifest `files` keys: the three browser-loaded MVP files, and from P2
#: the media index (§3.2).
MANIFEST_FILE_KEYS = {"scenario_artifact", "field_export", "regression_export"}
P2_FILE_KEYS = {"media_index"}

#: The eight fixed provenance input paths (§3.2); the ninth matches the FDHI
#: flatfile pattern.
FIXED_INPUTS = {
    "data/processed/dem/data.parquet",
    "data/processed/fdhi_cleaned/data.parquet",
    "data/processed/fdhi_measurements/data.parquet",
    "data/processed/kern_combined/data.parquet",
    "data/processed/sure/data.parquet",
    "data/raw/DEM_dataset.csv",
    "data/raw/SURE.csv",
    "data/raw/Combine_BuwaldaFDHI_KernSDC.csv",
}
FLATFILE_INPUT = re.compile(r"data/raw/02_FDHI_FLATFILE_MEASUREMENTS_.*\.csv")

#: One file-name pattern per role (§4.1 step 2).
ROLE_NAMES = {
    "scenario_artifact": re.compile(r"scenario-([0-9a-f]{12})\.bin\.gz"),
    "manifest": re.compile(r"manifest-([0-9a-f]{12})\.json"),
    "field_export": re.compile(r"field-([0-9a-f]{12})\.json\.gz"),
    "regression_export": re.compile(r"regression-([0-9a-f]{12})\.json\.gz"),
    "reference_results": re.compile(r"references-([0-9a-f]{12})\.json\.gz"),
    "data_terms": re.compile(r"data-terms-([0-9a-f]{12})\.txt"),
    "media_index": re.compile(r"media-([0-9a-f]{12})\.json"),
}

#: The bytes per item of each block dtype (§3.2 `blocks`).
ITEM_BYTES = {"uint8": 1, "uint16": 2, "int32": 4}


def _role(name: str) -> str | None:
    found = [role for role, pattern in ROLE_NAMES.items() if pattern.fullmatch(name)]
    return found[0] if len(found) == 1 else None


@pytest.fixture(scope="module")
def staged():
    """The staged vintage the working-tree pointer names: the pointer, the
    vintage directory, the artifact manifest and its name, and the reference
    results."""
    pointer_path = config.REPO_ROOT / pe.POINTER_PATH
    if not pointer_path.is_file():
        pytest.skip("staged vintage missing; run exportApp")
    pointer = json.loads(pointer_path.read_text(encoding="utf-8"))
    directory = config.REPO_ROOT / pe.DIST_APP_DIR / pointer["data_tag"]
    if not directory.is_dir():
        pytest.skip("staged vintage missing; run exportApp")
    by_role: dict[str, list[str]] = {}
    for name in pointer["files"]:
        by_role.setdefault(_role(name) or "", []).append(name)
    [manifest_name] = by_role["manifest"]
    [references_name] = by_role["reference_results"]
    references = json.loads(gzip.decompress((directory / references_name).read_bytes()))
    return {
        "pointer": pointer,
        "directory": directory,
        "by_role": by_role,
        "manifest_name": manifest_name,
        "manifest": json.loads((directory / manifest_name).read_text(encoding="utf-8")),
        "references": references,
    }


def test_full_required_fields(staged):
    """Both manifests hold exactly their required fields, and the envelope
    members agree."""
    manifest, pointer = staged["manifest"], staged["pointer"]
    assert set(manifest) == MANIFEST_FIELDS
    assert set(pointer) == POINTER_FIELDS
    assert manifest["schema_version"] == pointer["schema_version"] == 1
    assert pointer["data_tag"] == pointer["export_version"] == manifest["export_version"]
    assert pointer["export_date"] == manifest["export_date"]
    assert MANIFEST_FILE_KEYS <= set(manifest["files"]) <= MANIFEST_FILE_KEYS | P2_FILE_KEYS


def test_full_counts_agree_with_packed_geometry(staged):
    """`counts` meet the §3.2 Count contract and agree with the artifact
    header, the block lengths, and the `trials` list."""
    manifest = staged["manifest"]
    counts = manifest["counts"]
    t, n, r = counts["trials"], counts["stages_per_trial"], counts["records"]
    pe.check_counts(t, n, r)
    assert len(manifest["trials"]) == t
    raw = gzip.decompress(
        (staged["directory"] / manifest["files"]["scenario_artifact"]).read_bytes()
    )
    magic, schema, records, trials = struct.unpack("<4sIII", raw[:16])
    assert (magic, schema, records, trials) == (b"GRXA", 1, r, t)
    expected_items = {
        "trial_table": t * 7,
        "slip": r,
        "scarp_height": r,
        "dzw": r,
        "scarp_dip": r,
        "scarp_class": r,
    }
    blocks = manifest["blocks"]
    for name, items in expected_items.items():
        assert blocks[name]["length"] == items * ITEM_BYTES[blocks[name]["dtype"]], name
    last = blocks["dip_dictionary"]
    assert last["length"] % 4 == 0
    assert len(raw) == (last["offset"] + last["length"] + 3) & ~3


def test_full_checksum_sets_cross_check(staged):
    """The pointer names exactly the artifact manifest, every file the
    manifest names, one reference-results file, and one terms file; each
    pointer checksum is the SHA-256 of the staged file and equals the
    manifest's checksum wherever the manifest names the file; the directory
    holds nothing else; and the checksum graph is acyclic — the manifest
    never checksums itself, the pointer never itself."""
    manifest, pointer, by_role = staged["manifest"], staged["pointer"], staged["by_role"]
    files = pointer["files"]
    assert set(manifest["checksums"]) == set(manifest["files"].values())
    assert staged["manifest_name"] not in manifest["checksums"]
    assert "pointer.json" not in files
    assert len(by_role["data_terms"]) == 1
    assert set(files) == {
        staged["manifest_name"],
        *manifest["files"].values(),
        *by_role["reference_results"],
        *by_role["data_terms"],
    }
    for name, sha in manifest["checksums"].items():
        assert files[name] == sha, name
    on_disk = {path.name for path in staged["directory"].iterdir()}
    assert on_disk == set(files)
    for name, sha in files.items():
        assert hashlib.sha256((staged["directory"] / name).read_bytes()).hexdigest() == sha, name


def test_full_reference_results_version(staged):
    """`reference_results_version` equals the references' `reference_version`
    and the manifest's `export_version`."""
    manifest = staged["manifest"]
    assert manifest["reference_results_version"] == staged["references"]["reference_version"]
    assert manifest["reference_results_version"] == manifest["export_version"]


def test_full_provenance(staged):
    """The `provenance` object is complete, `source_commit` is 40 lowercase
    hexadecimal digits, `inputs` are sorted and unique and are the eight
    fixed paths and exactly one FDHI flatfile path, and the pointer's
    `provenance` deep-equals the manifest's in the same canonical bytes."""
    manifest, pointer = staged["manifest"], staged["pointer"]
    provenance = manifest["provenance"]
    assert set(provenance) == PROVENANCE_FIELDS
    assert re.fullmatch(r"[0-9a-f]{40}", provenance["source_commit"])
    assert isinstance(provenance["source_tree_clean"], bool)
    paths = [record["path"] for record in provenance["inputs"]]
    assert paths == sorted(set(paths))
    assert set(paths) >= FIXED_INPUTS
    others = set(paths) - FIXED_INPUTS
    assert len(others) == 1 and FLATFILE_INPUT.fullmatch(others.pop())
    for record in provenance["inputs"]:
        assert set(record) == {"path", "sha256", "bytes"}
        assert re.fullmatch(r"[0-9a-f]{64}", record["sha256"]) and record["bytes"] >= 0
    assert pointer["provenance"] == provenance
    assert pe.canonical_json(pointer["provenance"]) == pe.canonical_json(provenance)


def test_full_file_names(staged):
    """Every vintage file name matches its role's single pattern, with
    `<h12>` the first 12 digits of its SHA-256, and none ends in `.md`."""
    for name, sha in staged["pointer"]["files"].items():
        role = _role(name)
        assert role is not None, name
        assert ROLE_NAMES[role].fullmatch(name).group(1) == sha[:12], name
        assert not name.endswith(".md"), name
