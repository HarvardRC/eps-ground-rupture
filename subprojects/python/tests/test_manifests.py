"""Tests of the two manifests (docs/app/ddd.md §3.2 artifact manifest, §3.3 pointer).

The §7.3 contract file for the manifest consistency rules. Its full-data
lane (tests named `test_full_*`) cross-checks the staged vintage's artifact
manifest and pointer manifest, finding the vintage through the working-tree
pointer manifest `subprojects/webapp/data/pointer.json` — the rules the §4.1
export run enforces, exercised independently as a test, which
`publishVintage` runs before tagging (§4.2 step 4). The lane skips only
through the module-scoped fixture below — without the staged vintage — and
may not skip under `EGR_REQUIRE_FULL_DATA=1` (tests/conftest.py).

Its fixture lane applies the same rules — the export's own step-5 and
step-6 rules and the input-path check of a manifest read outside its run —
to a synthetic vintage that the export's steps write from a small packed
buffer in a temporary repository root: the unchanged vintage passes every
rule, and one changed fixture per rule — a missing field, counts that
disagree with the packed geometry, a checksum the other manifest does not
share, a manifest that checksums itself, a reference version that differs, a
missing `provenance` key, a manifest/pointer `provenance` mismatch, unsorted
or duplicate `inputs`, a missing or extra input path, `fdhi_cleaned`'s
included, a misnamed file — is rejected; the §3.2 Count contract rejects
each case of its §7.3 row. It reads no research data.
"""

from __future__ import annotations

import copy
import dataclasses
import gzip
import hashlib
import json
import re
import struct
import subprocess

import pandas as pd
import pytest

from eps_ground_rupture import config
from eps_ground_rupture import product_export as pe

# --------------------------------------------------------------------------
# Fixture lane: the §3.2/§3.3 rules on a synthetic vintage
# --------------------------------------------------------------------------

FDHI_CLEANED = "data/processed/fdhi_cleaned/data.parquet"
FLATFILE = "data/raw/02_FDHI_FLATFILE_MEASUREMENTS_20220719.csv"

#: The nine export inputs of a fixture repository (§4.1 step 1).
NINE_INPUTS: tuple[str, ...] = (
    "data/processed/dem/data.parquet",
    FDHI_CLEANED,
    "data/processed/fdhi_measurements/data.parquet",
    "data/processed/kern_combined/data.parquet",
    "data/processed/sure/data.parquet",
    "data/raw/Combine_BuwaldaFDHI_KernSDC.csv",
    "data/raw/DEM_dataset.csv",
    FLATFILE,
    "data/raw/SURE.csv",
)

#: The rules a synthetic vintage is checked by: the export's own §4.1
#: step-5 and step-6 rules over the two manifests, and `inputs-present`'s
#: input-path check for a manifest read outside its export run, whose
#: expected set is the eight fixed paths and exactly one FDHI flatfile path.
MANIFEST_RULES: tuple[str, ...] = (
    "format-spec",
    "block-tiling",
    "manifest-figures",
    "checksums",
    "envelope-agreement",
    "provenance",
    "pointer-exact",
    "file-names",
    "inputs-present",
)


def _git(root, *args):
    subprocess.run(
        ["git", "-c", "user.name=fixture", "-c", "user.email=fixture@example.invalid", *args],
        cwd=root,
        check=True,
        capture_output=True,
    )


def _small_frame() -> pd.DataFrame:
    """Two trials of three stages each in the `dem` view's columns: a small
    buffer to pack."""
    rows = []
    for t, (arm, strength, dip) in enumerate(
        (("Homogeneous", "Weak", 30), ("Heterogeneous", "Strong", 40))
    ):
        for k in range(3):
            classified = k > 0
            rows.append(
                {
                    "Trial": f"T{t}",
                    "Fault_Dip": dip,
                    "Sediment_Strength": strength,
                    "Cohesion": "A",
                    "Set": arm,
                    "Depth": 3,
                    "Density": "Dense",
                    "Slip": (100 * (k + 1) + t) / 10000,
                    "Scarp_Height": (40 * k - 30) / 1000 if classified else None,
                    "DZW": (250 * k + t) / 1000 if classified else None,
                    "Scarp_Dip": (30000 + 500 * k + t) / 1000 if classified else None,
                    "Scarp_Class": "Simple" if classified else None,
                }
            )
    floats = ("Slip", "Scarp_Height", "DZW", "Scarp_Dip")
    return pd.DataFrame(rows).astype({column: "float64" for column in floats})


@pytest.fixture(scope="module")
def synthetic_vintage(tmp_path_factory):
    """A synthetic vintage written by the export's own steps 2 and 4 in a
    temporary repository root (one commit, `data/` and `dist/` ignored, the
    nine inputs as stub files): a small packed scenario artifact, empty field
    and regression exports, an envelope-only reference record, the artifact
    manifest and terms file, and the pointer the run would write."""
    root = tmp_path_factory.mktemp("manifests") / "repo"
    root.mkdir()
    _git(root, "init", "-q")
    (root / ".gitignore").write_text("data/\ndist/\n")
    _git(root, "add", ".gitignore")
    _git(root, "commit", "-q", "-m", "fixture repository")
    for path in NINE_INPUTS:
        (root / path).parent.mkdir(parents=True, exist_ok=True)
        (root / path).write_bytes(f"stub {path}\n".encode())
    out_dir = root / pe.DIST_APP_DIR / pe.DEV_TAG
    out_dir.mkdir(parents=True)
    paths = pe.discover_inputs(root)
    provenance = pe.build_provenance(
        pe.source_commit(root), pe.tree_is_clean(root), pe.hash_inputs(root, paths)
    )
    ctx = pe.RunContext(
        root=root,
        data_tag=pe.DEV_TAG,
        export_date="2026-11-03T00:00:00Z",
        provenance=provenance,
        out_dir=out_dir,
        input_paths=paths,
    )
    frame = _small_frame()
    pack = pe.pack_scenario(frame)
    envelope = ctx.envelope()
    written: dict[str, str] = {}

    def write(role: str, document: object) -> str:
        data = pe.gzip_bytes(pe.canonical_json(document))
        return pe.write_vintage_file(out_dir, role, data, written)

    files = {
        "scenario_artifact": pe.write_vintage_file(
            out_dir, "scenario_artifact", pe.gzip_bytes(pack.artifact), written
        ),
        "field_export": write("field_export", {**envelope, "rows": []}),
        "regression_export": write(
            "regression_export",
            {**envelope, "relationship": pe.REGRESSION_RELATIONSHIP, "coefficients": []},
        ),
    }
    references = {**envelope, "reference_version": pe.DEV_TAG}
    vintage = pe.Vintage(
        pack=pack,
        files=files,
        field_rows=[],
        coefficients=[],
        references=references,
        references_name=write("reference_results", references),
        written=written,
    )
    pe.write_manifest_and_terms(ctx, vintage)
    return {
        "ctx": ctx,
        "vintage": vintage,
        "raw": pack.artifact,
        "trials": sorted(set(frame["Trial"])),
        "documents": {
            "manifest": vintage.manifest,
            "pointer": pe.build_pointer(ctx, vintage),
            "references": references,
        },
    }


def _documents(synthetic_vintage) -> dict[str, dict]:
    """A deep copy of each of the vintage's manifest, pointer, and reference
    record, for one fixture to change: copied one by one, so the manifest and
    the pointer never share their `provenance` object."""
    return {name: copy.deepcopy(doc) for name, doc in synthetic_vintage["documents"].items()}


def _check(rule: str, synthetic_vintage, documents: dict[str, dict]) -> None:
    """Apply one rule to the documents, raising `ExportFailure` on a
    violation."""
    manifest, pointer = documents["manifest"], documents["pointer"]
    out_dir = synthetic_vintage["ctx"].out_dir
    raw = synthetic_vintage["raw"]
    if rule == "format-spec":
        pe.rule_format_spec(
            {"artifact manifest": ("manifest", manifest), "pointer manifest": ("pointer", pointer)}
        )
    elif rule == "block-tiling":
        pe.rule_block_tiling(manifest, raw)
    elif rule == "manifest-figures":
        pe.rule_manifest_figures(manifest, raw, synthetic_vintage["trials"])
    elif rule == "checksums":
        pe.rule_checksums(manifest, out_dir)
    elif rule == "envelope-agreement":
        pe.rule_envelope_agreement(manifest, {"reference results": documents["references"]})
    elif rule == "provenance":
        pe.rule_provenance(synthetic_vintage["ctx"], manifest)
    elif rule == "pointer-exact":
        vintage = dataclasses.replace(synthetic_vintage["vintage"], manifest=manifest)
        pe.rule_pointer_exact(pointer, vintage, out_dir)
    elif rule == "file-names":
        pe.rule_file_names(pointer)
    elif rule == "inputs-present":
        pe.recorded_inputs(manifest)
    else:
        raise AssertionError(rule)


def test_synthetic_vintage_passes_every_rule(synthetic_vintage):
    """The unchanged synthetic vintage passes every rule, so each rejection
    below is its one change's doing; outside its run its manifest's inputs
    are the eight fixed paths and one FDHI flatfile path."""
    for rule in MANIFEST_RULES:
        _check(rule, synthetic_vintage, _documents(synthetic_vintage))
    manifest = synthetic_vintage["documents"]["manifest"]
    assert pe.recorded_inputs(manifest) == (sorted(NINE_INPUTS), FLATFILE)


def _input_records(documents) -> list[dict]:
    return documents["manifest"]["provenance"]["inputs"]


def _drop_input(path: str):
    def change(documents):
        records = _input_records(documents)
        records[:] = [record for record in records if record["path"] != path]

    return change


def _add_input(path: str):
    def change(documents):
        records = _input_records(documents)
        records.append({"path": path, "sha256": "0" * 64, "bytes": 0})
        records.sort(key=lambda record: record["path"])

    return change


def _rename_pointer_file(old_role: str, new_name: str):
    def change(documents):
        files = documents["pointer"]["files"]
        [old] = [name for name in files if name == documents["manifest"]["files"].get(old_role)]
        files[new_name] = files.pop(old)

    return change


def _set(document: str, *path_and_value):
    """Set one member: ``path_and_value`` is the member's path, then the
    value."""
    *path, key, value = path_and_value

    def change(documents):
        target = documents[document]
        for step in path:
            target = target[step]
        target[key] = value

    return change


def _delete(document: str, *path):
    *steps, key = path

    def change(documents):
        target = documents[document]
        for step in steps:
            target = target[step]
        del target[key]

    return change


def _scenario_name(documents) -> str:
    return documents["manifest"]["files"]["scenario_artifact"]


def _pointer_checksum_differs(documents):
    documents["pointer"]["files"][_scenario_name(documents)] = "f" * 64


def _manifest_checksum_differs(documents):
    documents["manifest"]["checksums"][_scenario_name(documents)] = "f" * 64


def _pointer_file_missing(documents):
    del documents["pointer"]["files"][documents["manifest"]["files"]["field_export"]]


def _manifest_checksums_itself(documents):
    [name] = [n for n in documents["pointer"]["files"] if n.startswith("manifest-")]
    documents["manifest"]["checksums"][name] = documents["pointer"]["files"][name]


def _counts_disagree_with_header(documents):
    counts = documents["manifest"]["counts"]
    counts["trials"] += 1
    counts["records"] = counts["trials"] * counts["stages_per_trial"]


def _block_length_off(documents):
    documents["manifest"]["blocks"]["slip"]["length"] += 2


def _source_commit_upper_case(documents):
    provenance = documents["manifest"]["provenance"]
    provenance["source_commit"] = provenance["source_commit"].upper()


def _inputs_unsorted(documents):
    _input_records(documents).reverse()


def _inputs_duplicate(documents):
    records = _input_records(documents)
    records.insert(1, dict(records[0]))


def _input_size_differs(documents):
    _input_records(documents)[0]["bytes"] += 1


def _provenance_mismatch(documents):
    provenance = documents["pointer"]["provenance"]
    provenance["source_tree_clean"] = not provenance["source_tree_clean"]


#: One rejected fixture per rule: (rule, a fragment of the detail, the
#: change).
REJECTIONS = [
    pytest.param(
        "format-spec",
        "required member 'stage_spacing' is missing",
        _delete("manifest", "stage_spacing"),
        id="manifest-field-missing",
    ),
    pytest.param(
        "format-spec",
        "required member 'export_date' is missing",
        _delete("pointer", "export_date"),
        id="pointer-field-missing",
    ),
    pytest.param(
        "format-spec",
        "unknown member 'notes'",
        _set("manifest", "notes", "unlisted"),
        id="manifest-field-unknown",
    ),
    pytest.param(
        "manifest-figures",
        "counts.records: 9 against 6",
        _counts_disagree_with_header,
        id="counts-disagree-with-header",
    ),
    pytest.param("block-tiling", "slip declares", _block_length_off, id="block-length-disagrees"),
    pytest.param(
        "checksums", "the manifest records fff", _manifest_checksum_differs, id="checksum-differs"
    ),
    pytest.param(
        "pointer-exact",
        "the pointer records fff",
        _pointer_checksum_differs,
        id="pointer-checksum-differs",
    ),
    pytest.param(
        "pointer-exact",
        "written by this run, not in the pointer",
        _pointer_file_missing,
        id="pointer-file-missing",
    ),
    pytest.param(
        "pointer-exact",
        "in the pointer, not written by this run",
        _set("pointer", "files", "media-000000000000.json", "0" * 64),
        id="pointer-file-extra",
    ),
    pytest.param(
        "checksums",
        "not exactly the files",
        _manifest_checksums_itself,
        id="manifest-checksums-itself",
    ),
    pytest.param(
        "pointer-exact",
        "pointer.json: in the pointer, not written by this run",
        _set("pointer", "files", "pointer.json", "0" * 64),
        id="pointer-lists-itself",
    ),
    pytest.param(
        "envelope-agreement",
        "reference_version 'data-v1' is not export_version",
        _set("references", "reference_version", "data-v1"),
        id="reference-version-differs",
    ),
    pytest.param(
        "envelope-agreement",
        "reference_results_version 'data-v1' is not export_version",
        _set("manifest", "reference_results_version", "data-v1"),
        id="reference-results-version-differs",
    ),
    pytest.param(
        "provenance",
        "members ['compression', 'inputs', 'source_commit', 'source_tree_clean']",
        _delete("manifest", "provenance", "environment"),
        id="provenance-key-missing",
    ),
    pytest.param(
        "provenance",
        "is not 40 lowercase hex digits",
        _source_commit_upper_case,
        id="source-commit-not-lowercase-hex",
    ),
    pytest.param(
        "provenance",
        "is not HEAD",
        _set("manifest", "provenance", "source_commit", "0" * 40),
        id="source-commit-not-head",
    ),
    pytest.param("provenance", "inputs are not sorted", _inputs_unsorted, id="inputs-unsorted"),
    pytest.param("provenance", "inputs are not sorted", _inputs_duplicate, id="inputs-duplicate"),
    pytest.param(
        "provenance",
        "recorded",
        _input_size_differs,
        id="input-size-differs",
    ),
    pytest.param(
        "provenance",
        f"inputs miss ['{FDHI_CLEANED}']",
        _drop_input(FDHI_CLEANED),
        id="input-path-missing",
    ),
    pytest.param(
        "provenance",
        "add ['data/raw/extra.csv']",
        _add_input("data/raw/extra.csv"),
        id="input-path-extra",
    ),
    pytest.param(
        "pointer-exact",
        "provenance differs from the manifest's",
        _provenance_mismatch,
        id="provenance-mismatch",
    ),
    pytest.param(
        "inputs-present",
        f"{FDHI_CLEANED} is missing from the pointer's provenance.inputs",
        _drop_input(FDHI_CLEANED),
        id="outside-run-input-path-missing",
    ),
    pytest.param(
        "inputs-present",
        "data/raw/extra.csv in the pointer's provenance.inputs is not an export input",
        _add_input("data/raw/extra.csv"),
        id="outside-run-input-path-extra",
    ),
    pytest.param(
        "inputs-present",
        "more than one path matching",
        _add_input("data/raw/02_FDHI_FLATFILE_MEASUREMENTS_20261101.csv"),
        id="outside-run-two-flatfiles",
    ),
    pytest.param(
        "file-names",
        "is not the start of",
        _rename_pointer_file("scenario_artifact", "scenario-000000000000.bin.gz"),
        id="name-hash-differs",
    ),
    pytest.param(
        "file-names",
        "matches no vintage file pattern",
        _rename_pointer_file("scenario_artifact", "scenario.bin.gz"),
        id="name-matches-no-pattern",
    ),
    pytest.param(
        "file-names",
        "ends in a Markdown suffix",
        _rename_pointer_file("field_export", "field-notes.md"),
        id="name-ends-in-md",
    ),
]


@pytest.mark.parametrize(("rule", "detail", "change"), REJECTIONS)
def test_each_rule_rejects_its_fixture(synthetic_vintage, rule, detail, change):
    """One change to the synthetic vintage's manifest, pointer, or reference
    record breaks one rule, which rejects it."""
    documents = _documents(synthetic_vintage)
    change(documents)
    with pytest.raises(pe.ExportFailure) as failure:
        _check(rule, synthetic_vintage, documents)
    assert failure.value.rule == rule
    assert detail in failure.value.detail, failure.value.detail


@pytest.mark.parametrize(
    ("trials", "stages_per_trial", "records", "detail"),
    [
        pytest.param(3, 0, 0, "stages_per_trial 0 breaks the bound", id="zero-stage-count"),
        pytest.param(3, 1, 3, "stages_per_trial 1 breaks the bound", id="one-stage-count"),
        pytest.param(
            2, 2.5, 5, "stages_per_trial 2.5 is not an integer", id="fractional-stage-count"
        ),
        pytest.param(0, 101, 0, "trials 0 breaks the bound", id="zero-trials"),
        pytest.param(
            1, 2, 4_294_967_296, "records 4294967296 breaks the bound", id="count-out-of-range"
        ),
        pytest.param(
            65_536,
            65_536,
            4_294_967_295,
            "trials 65536 breaks the bound trials <= floor(4294967295 / stages_per_trial)",
            id="product-overflow",
        ),
        pytest.param(2, 3, 7, "records 7 breaks the identity", id="incorrect-product"),
    ],
)
def test_count_contract_rejects(synthetic_vintage, trials, stages_per_trial, records, detail):
    """The §3.2 Count contract rejects each case of its §7.3 row, as
    metadata-only `check_counts` inputs and as a manifest's `counts` beside
    the small packed buffer, which `manifest-figures` checks first."""
    with pytest.raises(ValueError) as failure:
        pe.check_counts(trials, stages_per_trial, records)
    assert detail in str(failure.value)
    documents = _documents(synthetic_vintage)
    documents["manifest"]["counts"] = {
        "records": records,
        "trials": trials,
        "stages_per_trial": stages_per_trial,
    }
    with pytest.raises(pe.ExportFailure) as rejected:
        _check("manifest-figures", synthetic_vintage, documents)
    assert rejected.value.rule == "manifest-figures"
    assert detail in rejected.value.detail


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
