"""Fixture tests of the export run (`egr-export-app`, docs/app/ddd.md §4.1).

The §7.3 contract file for the export and validation code. Every case that
runs the export runs it against a temporary repository root — a `tmp_path`
git repository with one commit whose `.gitignore` covers its synthetic
`data/` files and `dist/`, so its clean-tree command prints nothing — and
never reads, moves, or writes the checkout's `data/`, `dist/app/`, or
working-tree pointer, or depends on the checkout's git state (§7.3).

The full-data lane (tests named `test_full_*`) re-verifies the shipped
ensemble in the staged vintage, which it finds through the working-tree
pointer manifest `subprojects/webapp/data/pointer.json`: the §3.2 `counts`,
the bitwise restore of every stored value against the processed `dem` view,
zero within-trial slip ties or inversions and zero ties at any trial's
maximum slip, no unclassified record with a valid measurement, and the
final-stage slip envelope. Its tests skip only through the module-scoped
fixtures below — without the staged vintage or the processed tables — and
may not skip under `EGR_REQUIRE_FULL_DATA=1` (tests/conftest.py).
"""

from __future__ import annotations

import gzip
import json
import re
import struct
import subprocess

import duckdb
import numpy as np
import pandas as pd
import pytest

from eps_ground_rupture import config, views
from eps_ground_rupture import product_export as pe

#: The diagnostic's line format (§4.1, end of section; §3.8).
DIAGNOSTIC_LINE = re.compile(r"payload diagnostic: ([0-9]+) of 4 MB \(4,000,000 B\) budget")


def _git(root, *args):
    subprocess.run(
        ["git", "-c", "user.name=fixture", "-c", "user.email=fixture@example.invalid", *args],
        cwd=root,
        check=True,
        capture_output=True,
    )


@pytest.fixture(scope="module")
def repo_root(tmp_path_factory):
    """A temporary repository root in the §7.3 form: one commit, its `.gitignore`
    covering the synthetic `data/` files and `dist/`, and the nine export
    inputs present as stub files."""
    root = tmp_path_factory.mktemp("repo")
    _git(root, "init", "-q")
    (root / ".gitignore").write_text("data/\ndist/\n")
    _git(root, "add", ".gitignore")
    _git(root, "commit", "-q", "-m", "fixture repository")
    flatfile = "data/raw/02_FDHI_FLATFILE_MEASUREMENTS_20220719.csv"
    for path in (*pe.PROCESSED_INPUTS, *pe.RAW_FIXED_INPUTS, flatfile):
        (root / path).parent.mkdir(parents=True, exist_ok=True)
        (root / path).write_bytes(f"stub {path}\n".encode())
    return root


def _gzip_of_size(target: int) -> bytes:
    """A `gzip_bytes` payload whose compressed form is exactly ``target``
    bytes: incompressible bytes, trimmed until the compressed length hits
    the target."""
    raw = np.random.default_rng(17).bytes(target)
    n = target
    for _ in range(100):
        data = pe.gzip_bytes(raw[:n])
        if len(data) == target:
            return data
        step = target - len(data)
        n += step if abs(step) > 1 else int(np.sign(step))
    raise AssertionError(f"no {target}-byte gzip payload found")


ABOVE_BUDGET = pe.PAYLOAD_BUDGET_BYTES + 1


def test_payload_diagnostic_above_the_budget_is_printed_and_the_run_succeeds(
    repo_root, monkeypatch, capsys
):
    """The diagnostic is no rule (§4.1): fed a 4,000,001 B scenario
    artifact, the run prints the line as its last line and exits 0."""
    artifact = _gzip_of_size(ABOVE_BUDGET)

    def export_vintage(ctx):
        """Steps 2-5 stubbed: the oversized artifact, with a manifest naming
        it, a reference-results file, and a terms file, so that the step-6
        rules `pointer-exact` and `file-names` hold for the run's pointer."""
        written: dict[str, str] = {}
        name = pe.write_vintage_file(ctx.out_dir, "scenario_artifact", artifact, written)
        references_name = pe.write_vintage_file(
            ctx.out_dir, "reference_results", pe.gzip_bytes(pe.canonical_json({})), written
        )
        manifest = {
            **ctx.envelope(),
            "provenance": ctx.provenance,
            "files": {"scenario_artifact": name},
            "checksums": {name: written[name]},
        }
        manifest_name = pe.write_vintage_file(
            ctx.out_dir, "manifest", pe.canonical_json(manifest), written
        )
        terms_name = pe.write_vintage_file(ctx.out_dir, "data_terms", b"", written)
        return pe.Vintage(
            pack=None,
            files={"scenario_artifact": name},
            field_rows=[],
            coefficients=[],
            references={},
            references_name=references_name,
            written=written,
            manifest=manifest,
            manifest_name=manifest_name,
            terms_name=terms_name,
        )

    monkeypatch.setattr(pe, "export_vintage", export_vintage)
    assert pe.main(["--data-tag", pe.DEV_TAG], root=repo_root) == 0
    lines = capsys.readouterr().out.splitlines()
    assert lines[-1] == "payload diagnostic: 4000001 of 4 MB (4,000,000 B) budget"
    match = DIAGNOSTIC_LINE.fullmatch(lines[-1])
    assert match and int(match.group(1)) == ABOVE_BUDGET
    sizes = [line.split()[2] for line in lines if line.startswith("size: scenario-")]
    assert sizes == [str(ABOVE_BUDGET)]


# --------------------------------------------------------------------------
# Full-data lane: the staged vintage against the processed `dem` view
# --------------------------------------------------------------------------

#: The shipped ensemble's §3.2 `counts` (drafting measurement on
#: `data/processed/dem/data.parquet`, SHA-256 6a6e9149…eb303). Dataset-
#: specific completeness checks — re-pin deliberately, don't loosen.
SHIPPED_COUNTS = {"records": 346_834, "trials": 3_434, "stages_per_trial": 101}

#: The final-stage slip envelope, metres: the smallest and the largest final
#: recorded slip over the trials (the "slip ≈ 5.013 m" of PDD §10.2, GS-7).
FINAL_STAGE_ENVELOPE = (5.0128, 5.0135)

#: The restore divisor of each `decimals` value (§3.1, Restoring values).
RESTORE_DIVISORS = {4: 10000, 3: 1000}

LITTLE_ENDIAN = {"uint8": "<u1", "uint16": "<u2", "int32": "<i4"}


@pytest.fixture(scope="module")
def staged():
    """The staged vintage the working-tree pointer names: its manifest and
    its decompressed scenario artifact, split into the manifest's blocks."""
    pointer_path = config.REPO_ROOT / pe.POINTER_PATH
    if not pointer_path.is_file():
        pytest.skip("staged vintage missing; run exportApp")
    pointer = json.loads(pointer_path.read_text(encoding="utf-8"))
    directory = config.REPO_ROOT / pe.DIST_APP_DIR / pointer["data_tag"]
    if not directory.is_dir():
        pytest.skip("staged vintage missing; run exportApp")
    [manifest_name] = [name for name in pointer["files"] if name.startswith("manifest-")]
    manifest = json.loads((directory / manifest_name).read_text(encoding="utf-8"))
    raw = gzip.decompress((directory / manifest["files"]["scenario_artifact"]).read_bytes())
    blocks = {}
    for name, block in manifest["blocks"].items():
        segment = raw[block["offset"] : block["offset"] + block["length"]]
        blocks[name] = np.frombuffer(segment, dtype=LITTLE_ENDIAN[block["dtype"]])
    return {"manifest": manifest, "raw": raw, "blocks": blocks}


@pytest.fixture(scope="module")
def dem(tmp_path_factory):
    """The processed `dem` view's rows in artifact order: trials ascending by
    code point, each trial's stages ascending by slip."""
    processed = config.PROCESSED_DIR
    missing = [t for t in views.REQUIRED_TABLES if not (processed / t / "data.parquet").is_file()]
    if missing:
        pytest.skip(f"processed Parquet missing {missing}; run egr-build")
    db = views.build_duckdb_views(
        processed_dir=processed,
        duckdb_path=tmp_path_factory.mktemp("scenario_full") / "eps.duckdb",
    )
    columns = [pe.TRIAL_SOURCE_COLUMN, *pe.TRIAL_SOURCE_COLUMNS.values()]
    columns += list(pe.STAGE_SOURCE_COLUMNS.values())
    quoted = ", ".join(f'"{c}"' for c in columns)
    with duckdb.connect(str(db), read_only=True) as con:
        frame = con.execute(f"SELECT {quoted} FROM dem").df()
    return frame.sort_values(["Trial", "Slip"], kind="stable").reset_index(drop=True)


def _per_trial_slip(staged) -> np.ndarray:
    """The decoded slip, metres, one row per trial in stage order."""
    counts = staged["manifest"]["counts"]
    stored = staged["blocks"]["slip"].astype(np.int64)
    return (stored / RESTORE_DIVISORS[4]).reshape(counts["trials"], counts["stages_per_trial"])


def test_full_counts(staged):
    """The §3.2 `counts` of the shipped ensemble, in the manifest and in the
    artifact header, and the geometry of every stage array."""
    manifest = staged["manifest"]
    assert manifest["counts"] == SHIPPED_COUNTS
    magic, schema, records, trials = struct.unpack("<4sIII", staged["raw"][: pe.HEADER_BYTES])
    assert (magic, schema) == (pe.MAGIC, 1)
    assert (records, trials) == (SHIPPED_COUNTS["records"], SHIPPED_COUNTS["trials"])
    assert len(manifest["trials"]) == SHIPPED_COUNTS["trials"]
    for name in ("slip", "scarp_height", "dzw", "scarp_dip", "scarp_class"):
        assert len(staged["blocks"][name]) == SHIPPED_COUNTS["records"], name


def test_full_bitwise_restore(staged, dem):
    """Every stored value decodes back to the `dem` view value it was packed
    from: a scaled or dictionary value restored by the §3.1 restore rule has
    the same `float.hex()`; a class code or a trial-table index maps back,
    through its manifest dictionary, to the view's value; and a stored null
    sentinel is exactly a view null."""
    manifest, blocks = staged["manifest"], staged["blocks"]
    assert len(dem) == manifest["counts"]["records"]
    trials = dem["Trial"].tolist()[:: manifest["counts"]["stages_per_trial"]]
    assert trials == manifest["trials"]

    for name in ("slip", "scarp_height", "dzw", "scarp_dip"):
        column = manifest["columns"][name]
        stored = blocks[name].astype(np.int64)
        view = dem[pe.STAGE_SOURCE_COLUMNS[name]].to_numpy(dtype=np.float64, na_value=np.nan)
        is_null = stored == column["null_sentinel"]
        assert np.array_equal(is_null, np.isnan(view)), f"{name}: nulls differ"
        if column["encoding"] == "dict":
            dictionary = blocks["dip_dictionary"].astype(np.int64)
            integers = dictionary[stored[~is_null]]
        else:
            integers = stored[~is_null] + column["offset_steps"]
        restored = integers / RESTORE_DIVISORS[column["decimals"]]
        source = view[~is_null]
        differ = np.flatnonzero(restored.view(np.uint64) != source.view(np.uint64))
        assert differ.size == 0, (
            f"{name}: {differ.size} values differ, first {float(restored[differ[0]]).hex()} "
            f"against {float(source[differ[0]]).hex()}"
        )

    codes = blocks["scarp_class"].tolist()
    sentinel = manifest["columns"]["scarp_class"]["null_sentinel"]
    decoded = [None if code == sentinel else manifest["scarp_classes"][code] for code in codes]
    view_classes = [None if pd.isna(v) else v for v in dem["Scarp_Class"].tolist()]
    assert decoded == view_classes

    t_count = manifest["counts"]["trials"]
    table = blocks["trial_table"].reshape(t_count, len(pe.TRIAL_TABLE_COLUMNS))
    first = dem.iloc[np.arange(t_count) * manifest["counts"]["stages_per_trial"]]
    for j, column in enumerate(pe.TRIAL_TABLE_COLUMNS):
        dictionary = manifest["trial_columns"][column]
        cells = [dictionary[int(cell)] for cell in table[:, j]]
        if column == "model_family":
            assert cells == ["2D"] * t_count
            continue
        values = first[pe.TRIAL_SOURCE_COLUMNS[column]].tolist()
        if column in pe.INTEGER_TRIAL_COLUMNS:
            values = [int(v) for v in values]
        assert cells == values, column


def test_full_no_slip_ties(staged, dem):
    """Zero within-trial slip ties or inversions in the artifact, and zero
    ties at any trial's maximum slip in the `dem` view (DR-3 — One-state-
    per-trial population, pipeline-first under ADR-0015)."""
    slip = _per_trial_slip(staged)
    assert int((np.diff(slip, axis=1) <= 0).sum()) == 0
    grouped = dem.groupby("Trial", sort=False)["Slip"]
    at_maximum = (dem["Slip"] == grouped.transform("max")).groupby(dem["Trial"]).sum()
    assert len(at_maximum) == staged["manifest"]["counts"]["trials"]
    assert int((at_maximum != 1).sum()) == 0


def test_full_unclassified_has_no_valid_measurement(staged):
    """Every record whose `scarp_class` is null has null `scarp_height`,
    `dzw`, and `scarp_dip`."""
    manifest, blocks = staged["manifest"], staged["blocks"]
    unclassified = blocks["scarp_class"] == manifest["columns"]["scarp_class"]["null_sentinel"]
    for name in ("scarp_height", "dzw", "scarp_dip"):
        valid = blocks[name] != manifest["columns"][name]["null_sentinel"]
        assert int((unclassified & valid).sum()) == 0, name


def test_full_final_stage_slip_envelope(staged):
    """The final-stage slip envelope: the smallest and the largest final
    recorded slip over the trials, pinned at 5.0128–5.0135 m."""
    final = _per_trial_slip(staged)[:, -1]
    assert (float(final.min()), float(final.max())) == FINAL_STAGE_ENVELOPE
