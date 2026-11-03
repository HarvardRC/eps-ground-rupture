"""Fixture tests of the export run (`egr-export-app`, docs/app/ddd.md §4.1).

The §7.3 contract file for the export and validation code. Every case that
runs the export runs it against a temporary repository root — a `tmp_path`
git repository with one commit whose `.gitignore` covers its synthetic
`data/` files and `dist/`, so its clean-tree command prints nothing — and
never reads, moves, or writes the checkout's `data/`, `dist/app/`, or
working-tree pointer, or depends on the checkout's git state (§7.3).

The fixture lane drives the export run on synthetic frames shaped like the
`dem` view, beside small synthetic field-source tables: the lossless round
trip of every §3.1 encoding, the DD-1 dictionary included; multi-trial
frames of uniform N = 2, 100, 101, and 102 (`stages-<N>`); one
single-property corruption per rule of §4.1 steps 3 and 5
(`corrupt-<rule>`, a rule's further corruptions `corrupt-<rule>-<k>`), each
failing at that rule's `<rule>: FAILED` line; the §7.3 arithmetic-boundary
cases of `check_counts`; the non-finite cases (`nonfinite-<k>`); and the six
prerequisite and provenance cases of §7.3. It reads no research data.

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

import contextlib
import copy
import gzip
import hashlib
import json
import math
import re
import shutil
import struct
import subprocess
from decimal import Decimal
from io import StringIO

import duckdb
import numpy as np
import pandas as pd
import pytest

from eps_ground_rupture import config, views
from eps_ground_rupture import product_export as pe
from eps_ground_rupture.config import SCARP_CLASSES

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
# Fixture lane: the export run on synthetic frames
# --------------------------------------------------------------------------

#: The rules of the validation report in the order §4.1 lists them: steps 1,
#: 3, 5, and 6.
REPORT_RULES: tuple[str, ...] = (
    "data-tag",
    "retained-copy",
    "inputs-present",
    "counts",
    "slip-order",
    "site-constancy",
    "bitwise-restore",
    "sentinel-collision",
    "null-counts",
    "unclassified-has-no-valid-measurement",
    "dictionary-order",
    "view-reread",
    "coefficient-reach",
    "reference-invariants",
    "block-tiling",
    "manifest-figures",
    "checksums",
    "format-spec",
    "dd10-names",
    "envelope-agreement",
    "provenance",
    "pointer-exact",
    "file-names",
)

#: A rule line of the report: `<rule>: ok` or `<rule>: FAILED — <detail>`.
RULE_LINE = re.compile(r"([a-z0-9-]+): (ok|FAILED — .*)")

FDHI_CLEANED = "data/processed/fdhi_cleaned/data.parquet"
FLATFILE = "data/raw/02_FDHI_FLATFILE_MEASUREMENTS_20220719.csv"
NEWER_FLATFILE = "data/raw/02_FDHI_FLATFILE_MEASUREMENTS_20261101.csv"

#: The nine data paths of §4.1 step 1 in a fixture repository: the five
#: processed tables, the three fixed raw inputs, and the FDHI flatfile.
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

#: The rebuild commands `inputs-present` names (§4.1 step 1).
REBUILD = (
    "Run poetry run egr-build from subprojects/python with the project virtualenv active, "
    "then retry."
)
REBUILD_REPRODUCE = (
    f"Run poetry run egr-build --fdhi-flatfile {FLATFILE} from subprojects/python with the "
    "project virtualenv active, then retry."
)

#: The fixture trials as (set, sediment_strength, fault_dip): every pair of
#: the nine-pair constant (§3.2) at dips 30 and 40, the dips GS-1 selects,
#: and one trial at dip 50, outside GS-1, whose regression row a corruption
#: may change without moving GS-1's converted windows.
FIXTURE_TRIALS: tuple[tuple[str, str, int], ...] = (
    *((arm, strength, dip) for dip in (30, 40) for arm, strength in pe.ARM_STRENGTH_STATES),
    ("Homogeneous", "Weak", 50),
)

#: The stage count of the frames of the corruption and provenance cases.
FIXTURE_STAGES = 8

#: The float columns of the synthetic `dem` table.
DEM_FLOAT_COLUMNS = ("Slip", "Scarp_Height", "DZW", "Scarp_Dip", "VD_HW", "Us - Ud")


def _dem_frame(stages: int) -> pd.DataFrame:
    """A synthetic `dem` table: the fixture trials, ``stages`` stages each, in
    trial-major order. Slip lies on its 1e-4 m grid and strictly ascends
    within a trial; each trial's first stage is unclassified with every
    measurement null; the other stages carry a class and values on their
    1e-3 grids — scarp heights down to -0.182 m (the offset encoding), some
    widths null; `VD_HW` lies on the line 0.5 * slip - 0.001 m, so every
    regression row has a positive slope and a reach of 0.002 m."""
    rows = []
    for t, (arm, strength, dip) in enumerate(FIXTURE_TRIALS):
        for k in range(stages):
            slip = (100 * (k + 1) + t) / 10000
            classified = k > 0
            rows.append(
                {
                    "Trial": f"T{t:02d}",
                    "Fault_Dip": dip,
                    "Sediment_Strength": strength,
                    "Cohesion": f"C{t % 3}",
                    "Set": arm,
                    "Depth": (3, 5)[t % 2],
                    "Density": ("Dense", "Loose", "Medium")[t % 3],
                    "Slip": slip,
                    "Scarp_Height": ((7 * k + 5 * t) % 900 - 182) / 1000 if classified else None,
                    "DZW": (
                        ((37 * k + 11 * t) % 5000 + 1) / 1000 if classified and k % 5 != 3 else None
                    ),
                    "Scarp_Dip": (20000 + (911 * k + 97 * t) % 70000) / 1000
                    if classified
                    else None,
                    "Scarp_Class": SCARP_CLASSES[(t + k) % len(SCARP_CLASSES)]
                    if classified
                    else None,
                    "VD_HW": 0.5 * slip - 0.001,
                    "Us - Ud": 0.1,
                }
            )
    return pd.DataFrame(rows).astype({column: "float64" for column in DEM_FLOAT_COLUMNS})


def _source_frames(stages: int = FIXTURE_STAGES) -> dict[str, pd.DataFrame]:
    """The five processed tables of §4.1 step 1, synthetic: the `dem` table
    of :func:`_dem_frame` and small field-source tables in the suite's
    synthetic-frame style, each with the columns the views read."""
    return {
        "dem": _dem_frame(stages),
        "fdhi_cleaned": pd.DataFrame(
            {
                "fzw_central_meters": [10.0, 4.0],
                "vs_central_meters": [2.0, 1.5],
                "eq_name": ["Wenchuan", "Landers"],
                "magnitude": [7.9, -999.0],
                "latitude_degrees": [31.0, 34.2],
                "longitude_degrees": [103.0, -116.4],
            }
        ),
        "fdhi_measurements": pd.DataFrame(
            {
                "eq_name": ["Wenchuan", "Landers", "Killari"],
                "magnitude": [7.9, -999.0, 6.2],
                "vs_central_meters": [2.0, -999.0, 0.4],
                "fzw_central_meters": [10.0, 60.0, -999.0],
            }
        ),
        "sure": pd.DataFrame(
            {
                "FNC": [5.0, 6.0],
                "SH": [1.0, 1.2],
                "eq_name": ["Chi-Chi", "Tennant Creek\xa0"],
                "Latitude": [23.8, -19.8],
                "Longitude": [120.8, 134.0],
            }
        ),
        "kern_combined": pd.DataFrame({"DZW": [3.0], "Vertical": [0.3], "Location ID": ["K-1"]}),
    }


def _make_repo(root, frames: dict[str, pd.DataFrame]):
    """A temporary repository root in the §7.3 form — one commit whose
    `.gitignore` covers `data/` and `dist/` — holding the five processed
    tables as Parquet, under which the run's view builder reads them, and
    the four raw inputs as stub files, which the run only hashes."""
    root.mkdir(parents=True)
    _git(root, "init", "-q")
    (root / ".gitignore").write_text("data/\ndist/\n")
    _git(root, "add", ".gitignore")
    _git(root, "commit", "-q", "-m", "fixture repository")
    for table, frame in frames.items():
        path = root / "data" / "processed" / table / "data.parquet"
        path.parent.mkdir(parents=True)
        frame.to_parquet(path, index=False)
    for path in NINE_INPUTS:
        if path.startswith("data/raw/"):
            (root / path).parent.mkdir(parents=True, exist_ok=True)
            (root / path).write_bytes(f"stub {path}\n".encode())
    return root


def _run(root, *argv: str) -> tuple[int, list[str]]:
    """One `egr-export-app` run against ``root``: its exit code and its
    standard-output lines."""
    out = StringIO()
    with contextlib.redirect_stdout(out):
        code = pe.main(list(argv), root=root)
    return code, out.getvalue().splitlines()


def _export(root) -> tuple[int, list[str]]:
    return _run(root, "--data-tag", pe.DEV_TAG)


def _statuses(lines: list[str]) -> list[tuple[str, str]]:
    """The report's rule lines as (rule, `ok` or `FAILED — <detail>`)."""
    return [(m[1], m[2]) for line in lines if (m := RULE_LINE.fullmatch(line))]


def _all_ok(rules=REPORT_RULES) -> list[tuple[str, str]]:
    return [(rule, "ok") for rule in rules]


def _vintage(root) -> tuple[object, dict]:
    """The vintage directory the working-tree pointer names, and its
    artifact manifest."""
    pointer = json.loads((root / pe.POINTER_PATH).read_text(encoding="utf-8"))
    directory = root / pe.DIST_APP_DIR / pointer["data_tag"]
    [name] = [name for name in pointer["files"] if name.startswith("manifest-")]
    return directory, json.loads((directory / name).read_text(encoding="utf-8"))


def _decoded(directory, manifest) -> tuple[bytes, dict[str, np.ndarray]]:
    """The decompressed scenario artifact and its blocks, by the manifest."""
    raw = gzip.decompress((directory / manifest["files"]["scenario_artifact"]).read_bytes())
    blocks = {}
    for name, block in manifest["blocks"].items():
        segment = raw[block["offset"] : block["offset"] + block["length"]]
        blocks[name] = np.frombuffer(segment, dtype=LITTLE_ENDIAN[block["dtype"]])
    return raw, blocks


def _hex(value: float | None) -> str | None:
    return None if value is None else float(value).hex()


def _assert_round_trip(directory, manifest, frame: pd.DataFrame) -> dict[str, np.ndarray]:
    """Decode the written artifact by the written manifest alone and require
    every value back from the source frame: the header counts, the trial
    list, each scaled and dictionary value bit for bit (`float.hex`) by the
    §3.1 restore rule, each null as its sentinel, each class code and
    trial-table index through its dictionary."""
    raw, blocks = _decoded(directory, manifest)
    counts = manifest["counts"]
    header = struct.unpack("<4sIII", raw[: pe.HEADER_BYTES])
    assert header == (pe.MAGIC, 1, counts["records"], counts["trials"])
    source = frame.sort_values(["Trial", "Slip"], kind="stable").reset_index(drop=True)
    assert manifest["trials"] == sorted(set(source["Trial"]))

    for name in ("slip", "scarp_height", "dzw", "scarp_dip"):
        record = manifest["columns"][name]
        divisor = RESTORE_DIVISORS[record["decimals"]]
        sentinel = record["null_sentinel"]
        stored = blocks[name].tolist()
        if record["encoding"] == "dict":
            dictionary = blocks["dip_dictionary"].tolist()
            restored = [None if s == sentinel else dictionary[s] / divisor for s in stored]
        else:
            offset = record["offset_steps"]
            restored = [None if s == sentinel else (s + offset) / divisor for s in stored]
        values = source[pe.STAGE_SOURCE_COLUMNS[name]].tolist()
        expected = [None if math.isnan(v) else v for v in values]
        assert [_hex(v) for v in restored] == [_hex(v) for v in expected], name

    classes = manifest["scarp_classes"]
    sentinel = manifest["columns"]["scarp_class"]["null_sentinel"]
    decoded = [None if c == sentinel else classes[c] for c in blocks["scarp_class"].tolist()]
    assert decoded == [None if pd.isna(v) else v for v in source["Scarp_Class"].tolist()]

    t_count, n = counts["trials"], counts["stages_per_trial"]
    table = blocks["trial_table"].reshape(t_count, len(pe.TRIAL_TABLE_COLUMNS))
    first = source.iloc[::n]
    for j, column in enumerate(pe.TRIAL_TABLE_COLUMNS):
        cells = [manifest["trial_columns"][column][int(c)] for c in table[:, j]]
        if column == "model_family":
            assert cells == ["2D"] * t_count
            continue
        values = first[pe.TRIAL_SOURCE_COLUMNS[column]].tolist()
        if column in pe.INTEGER_TRIAL_COLUMNS:
            values = [int(v) for v in values]
        assert cells == values, column
    return blocks


@pytest.fixture(scope="module")
def synthetic_export(tmp_path_factory):
    """One export run on the fixture frames, in a temporary repository root."""
    frames = _source_frames()
    root = _make_repo(tmp_path_factory.mktemp("synthetic_export") / "repo", frames)
    code, lines = _export(root)
    return {"root": root, "code": code, "lines": lines, "dem": frames["dem"]}


def test_round_trip_restores_every_encoding_bit_for_bit(synthetic_export):
    """Every §3.1 encoding round-trips losslessly: the scaled columns — slip,
    scarp height with its negative offset, width — the DD-1 dip dictionary,
    the class codes with 255 for unclassified records, and the trial-table
    indices; every restored value equals its source double bit for bit."""
    assert synthetic_export["code"] == 0, synthetic_export["lines"]
    assert _statuses(synthetic_export["lines"]) == _all_ok()
    dem = synthetic_export["dem"]
    assert (dem["Scarp_Height"] < 0).any()
    assert (dem["DZW"].isna() & dem["Scarp_Class"].notna()).any()
    directory, manifest = _vintage(synthetic_export["root"])
    encodings = {name: record["encoding"] for name, record in manifest["columns"].items()}
    assert encodings == {
        "slip": "scaled",
        "scarp_height": "scaled",
        "dzw": "scaled",
        "scarp_dip": "dict",
        "scarp_class": "code",
    }
    blocks = _assert_round_trip(directory, manifest, dem)
    # DD-1: the dictionary holds every distinct recorded dip, in thousandths
    # of a degree, ascending.
    dips = sorted({int(Decimal(repr(v)) * 1000) for v in dem["Scarp_Dip"].dropna()})
    assert blocks["dip_dictionary"].tolist() == dips


@pytest.mark.parametrize("stages", [pytest.param(n, id=f"stages-{n}") for n in (2, 100, 101, 102)])
def test_uniform_stage_counts_round_trip(stages, tmp_path):
    """A multi-trial frame of uniform N stages per trial exports with every
    rule passing and round-trips unchanged, with `counts` T, N, and T * N."""
    frames = _source_frames(stages)
    root = _make_repo(tmp_path / "repo", frames)
    code, lines = _export(root)
    assert code == 0, lines
    assert _statuses(lines) == _all_ok()
    directory, manifest = _vintage(root)
    trials = len(FIXTURE_TRIALS)
    assert manifest["counts"] == {
        "records": trials * stages,
        "trials": trials,
        "stages_per_trial": stages,
    }
    _assert_round_trip(directory, manifest, frames["dem"])


# -- One single-property corruption per rule of §4.1 steps 3 and 5 -------------


def _row(trial: int, stage: int) -> int:
    """The index of a stage of a fixture trial in the `dem` table."""
    return trial * FIXTURE_STAGES + stage


def _patch_packed(monkeypatch, name: str, change) -> None:
    """Corrupt one scaled stage array as the packer encodes it (§3.1)."""
    encode = pe._encode_scaled

    def corrupted(column, values, valid, decimals, offset_steps):
        stored = encode(column, values, valid, decimals, offset_steps)
        if column == name:
            change(stored, valid)
        return stored

    monkeypatch.setattr(pe, "_encode_scaled", corrupted)


def _patch_file(monkeypatch, role: str, change) -> None:
    """Corrupt one compressed JSON file of the vintage as step 2 writes it:
    parsed, changed, and serialized and compressed again as the export does."""
    write = pe.write_vintage_file

    def corrupted(out_dir, written_role, data, written):
        if written_role == role:
            document = json.loads(gzip.decompress(data))
            change(document)
            data = pe.gzip_bytes(pe.canonical_json(document))
        return write(out_dir, written_role, data, written)

    monkeypatch.setattr(pe, "write_vintage_file", corrupted)


def _patch_references(monkeypatch, change) -> None:
    """Change the reference-results object as the generator returns it, so
    the written file and the run's in-memory object agree."""
    build = pe.build_reference_results

    def corrupted(envelope, vintage):
        references = build(envelope, vintage)
        change(references)
        return references

    monkeypatch.setattr(pe, "build_reference_results", corrupted)


def _patch_manifest(monkeypatch, change) -> None:
    """Corrupt the artifact manifest as step 4 builds and writes it."""
    build = pe.build_manifest

    def corrupted(ctx, vintage):
        manifest = copy.deepcopy(build(ctx, vintage))
        change(manifest)
        return manifest

    monkeypatch.setattr(pe, "build_manifest", corrupted)


def _empty_frame(frames, monkeypatch):
    frames["dem"] = frames["dem"].iloc[0:0]


def _one_stage_trial(frames, monkeypatch):
    dem = frames["dem"]
    last = dem.index[dem["Trial"] == dem["Trial"].iloc[-1]]
    frames["dem"] = dem.drop(index=last[1:])


def _unequal_trials(frames, monkeypatch):
    frames["dem"] = frames["dem"].drop(index=_row(3, FIXTURE_STAGES - 1))


def _slip_tie(frames, monkeypatch):
    dem = frames["dem"]
    dem.loc[_row(1, 3), "Slip"] = dem.loc[_row(1, 2), "Slip"]


def _site_varies(frames, monkeypatch):
    frames["dem"].loc[_row(1, 5), "Depth"] = 10


def _off_grid(frames, monkeypatch):
    frames["dem"].loc[_row(2, 1), "DZW"] = 1.0005


def _restore_differs(frames, monkeypatch):
    def change(stored, valid):
        stored[np.flatnonzero(valid)[0]] += 1

    _patch_packed(monkeypatch, "dzw", change)


def _sentinel_value(frames, monkeypatch):
    # 65.353 m stores as 65353 + 182 = 65535, the uint16 null sentinel.
    frames["dem"].loc[_row(3, 2), "Scarp_Height"] = 65.353


def _null_stored_as_value(frames, monkeypatch):
    def change(stored, valid):
        stored[np.flatnonzero(~valid)[0]] = 0

    _patch_packed(monkeypatch, "dzw", change)


def _unclassified_valid(frames, monkeypatch):
    frames["dem"].loc[_row(4, 2), "Scarp_Class"] = None


def _pair_missing(frames, monkeypatch):
    dem = frames["dem"]
    frames["dem"] = dem[dem["Sediment_Strength"] != "Cohesive Top Unit"]


def _field_row_differs(frames, monkeypatch):
    def change(document):
        row = document["rows"][0]
        row["value"] = math.nextafter(row["value"], math.inf)

    _patch_file(monkeypatch, "field_export", change)


def _dip_50_line(intercept: float):
    """Put the dip-50 trial's `VD_HW` on the line 0.5 * slip + intercept."""

    def corrupt(frames, monkeypatch):
        dem = frames["dem"]
        at = dem["Fault_Dip"] == 50
        dem.loc[at, "VD_HW"] = 0.5 * dem.loc[at, "Slip"] + intercept

    return corrupt


def _reference_counts_off(frames, monkeypatch):
    def change(references):
        references["scenarios"][0]["counts"]["per_measurement"]["dzw"]["excluded_null"] += 1

    _patch_references(monkeypatch, change)


def _reference_file_differs(frames, monkeypatch):
    _patch_file(monkeypatch, "reference_results", lambda d: d.update(log_scale_min_decades=3))


def _block_moved(frames, monkeypatch):
    def change(manifest):
        manifest["blocks"]["slip"]["offset"] += 4

    _patch_manifest(monkeypatch, change)


def _spacing_off_by_one_ulp(frames, monkeypatch):
    def change(manifest):
        spacing = manifest["stage_spacing"]
        spacing["mean"] = math.nextafter(spacing["mean"], math.inf)

    _patch_manifest(monkeypatch, change)


def _checksum_wrong(frames, monkeypatch):
    def change(manifest):
        manifest["checksums"][manifest["files"]["scenario_artifact"]] = "0" * 64

    _patch_manifest(monkeypatch, change)


def _unknown_manifest_field(frames, monkeypatch):
    _patch_manifest(monkeypatch, lambda manifest: manifest.update(notes="unlisted"))


def _column_renamed_consistently(frames, monkeypatch):
    """Rename the `dzw` column to `width` both where the reference writer
    names it in `display_decimals` and in that member's closed spec, so the
    renamed file still matches its spec and only `dd10-names` can fail."""

    def rename(name: str) -> str:
        return "width" if name == "dzw" else name

    def change(references):
        decimals = references["display_decimals"]
        references["display_decimals"] = {rename(k): v for k, v in decimals.items()}

    _patch_references(monkeypatch, change)
    spec = pe.REFERENCE_RESULTS_SPEC
    keys = tuple(rename(k) for k in spec.fields["display_decimals"].keys)
    renamed = pe.RecordSpec(
        {**spec.fields, "display_decimals": pe.MapSpec(pe.IntSpec(), keys=keys, columns=True)}
    )
    monkeypatch.setitem(pe.FORMAT_SPECS, "reference_results", renamed)


def _envelope_differs(frames, monkeypatch):
    _patch_file(monkeypatch, "field_export", lambda d: d.update(pipeline_version="0.0.0+other"))


def _inputs_unsorted(frames, monkeypatch):
    _patch_manifest(monkeypatch, lambda manifest: manifest["provenance"]["inputs"].reverse())


#: (rule, the rule whose line the failure replaces, a fragment of the
#: detail, the corruption). A corruption of a source value that the
#: reference generator meets in step 2 fails its rule there, before any
#: step-3 line: `after` is then `counts`.
CORRUPTIONS = [
    pytest.param("counts", "counts", "trials 0 breaks", _empty_frame, id="corrupt-counts"),
    pytest.param(
        "counts", "counts", "T18 has 1 stage, fewer than 2", _one_stage_trial, id="corrupt-counts-1"
    ),
    pytest.param(
        "counts",
        "counts",
        "T03 has 7 stages, not the first trial's N = 8",
        _unequal_trials,
        id="corrupt-counts-2",
    ),
    pytest.param("slip-order", "slip-order", "Trial T01: slip", _slip_tie, id="corrupt-slip-order"),
    pytest.param(
        "site-constancy",
        "site-constancy",
        "Trial T01 has 2 distinct Depth values",
        _site_varies,
        id="corrupt-site-constancy",
    ),
    pytest.param(
        "bitwise-restore",
        "counts",
        "DZW: 1.0005 is not an exact multiple of 1/1000",
        _off_grid,
        id="corrupt-bitwise-restore",
    ),
    pytest.param(
        "bitwise-restore",
        "bitwise-restore",
        "dzw at Trial T00 stage 1: restores to",
        _restore_differs,
        id="corrupt-bitwise-restore-1",
    ),
    pytest.param(
        "sentinel-collision",
        "sentinel-collision",
        "scarp_height at Trial T03 stage 2: a valid value is stored as the null sentinel 65535",
        _sentinel_value,
        id="corrupt-sentinel-collision",
    ),
    pytest.param(
        "null-counts",
        "null-counts",
        "nulls decoded",
        _null_stored_as_value,
        id="corrupt-null-counts",
    ),
    pytest.param(
        "unclassified-has-no-valid-measurement",
        "counts",
        "class code 255",
        _unclassified_valid,
        id="corrupt-unclassified-has-no-valid-measurement",
    ),
    pytest.param(
        "dictionary-order",
        "dictionary-order",
        "missing [('Heterogeneous', 'Cohesive Top Unit')]",
        _pair_missing,
        id="corrupt-dictionary-order",
    ),
    pytest.param(
        "view-reread",
        "view-reread",
        "field export rows[0].value",
        _field_row_differs,
        id="corrupt-view-reread",
    ),
    pytest.param(
        "coefficient-reach",
        "coefficient-reach",
        "fault_dip 50: intercept",
        _dip_50_line(0.001),
        id="corrupt-coefficient-reach",
    ),
    pytest.param(
        "coefficient-reach",
        "coefficient-reach",
        "fault_dip 50: -intercept / slope",
        _dip_50_line(-10.0),
        id="corrupt-coefficient-reach-1",
    ),
    pytest.param(
        "reference-invariants",
        "reference-invariants",
        "GS-0 dzw: valid",
        _reference_counts_off,
        id="corrupt-reference-invariants",
    ),
    pytest.param(
        "reference-invariants",
        "reference-invariants",
        "log_scale_min_decades",
        _reference_file_differs,
        id="corrupt-reference-invariants-1",
    ),
    pytest.param(
        "block-tiling", "block-tiling", "slip starts at", _block_moved, id="corrupt-block-tiling"
    ),
    pytest.param(
        "manifest-figures",
        "manifest-figures",
        "stage_spacing.mean",
        _spacing_off_by_one_ulp,
        id="corrupt-manifest-figures",
    ),
    pytest.param(
        "checksums",
        "checksums",
        "the manifest records 000",
        _checksum_wrong,
        id="corrupt-checksums",
    ),
    pytest.param(
        "format-spec",
        "format-spec",
        "unknown member 'notes'",
        _unknown_manifest_field,
        id="corrupt-format-spec",
    ),
    pytest.param(
        "dd10-names",
        "dd10-names",
        "display_decimals key 'width'",
        _column_renamed_consistently,
        id="corrupt-dd10-names",
    ),
    pytest.param(
        "envelope-agreement",
        "envelope-agreement",
        "field export pipeline_version '0.0.0+other'",
        _envelope_differs,
        id="corrupt-envelope-agreement",
    ),
    pytest.param(
        "provenance",
        "provenance",
        "inputs are not sorted",
        _inputs_unsorted,
        id="corrupt-provenance",
    ),
]


def _assert_fails_at(root, code, lines, rule: str, after: str, detail: str) -> None:
    """The run exits 1 at ``rule``'s `FAILED` line, every rule line before
    it `ok` — those of §4.1 before ``after`` — its detail naming ``detail``,
    and writes no pointer."""
    assert code == 1, lines
    statuses = _statuses(lines)
    assert statuses[:-1] == _all_ok(REPORT_RULES[: REPORT_RULES.index(after)]), lines
    failed, status = statuses[-1]
    assert failed == rule and status.startswith("FAILED — "), lines
    report = "\n".join(lines[lines.index(f"{failed}: {status}") :])
    assert detail in report, report
    assert not (root / pe.POINTER_PATH).exists()


@pytest.mark.parametrize(("rule", "after", "detail", "corrupt"), CORRUPTIONS)
def test_a_single_property_corruption_fails_its_rule(
    rule, after, detail, corrupt, tmp_path, monkeypatch
):
    """One corruption of one property fails the export at its rule's
    `<rule>: FAILED` line. An empty frame, a one-stage trial, and unequal
    trial lengths fail `counts` before packing: its line is the run's first
    failing line and no `scenario-<h12>.bin.gz` is written. The `dd10-names`
    case renames a column consistently in the writer and its closed spec, so
    the run prints `format-spec: ok` before `dd10-names: FAILED`."""
    frames = _source_frames()
    corrupt(frames, monkeypatch)
    root = _make_repo(tmp_path / "repo", frames)
    code, lines = _export(root)
    _assert_fails_at(root, code, lines, rule, after, detail)
    if rule == "counts":
        written = root / pe.DIST_APP_DIR / pe.DEV_TAG
        assert not list(written.glob("scenario-*.bin.gz"))


@pytest.mark.parametrize(
    ("trials", "stages_per_trial", "records", "detail"),
    [
        pytest.param(
            1,
            4_294_967_296,
            4_294_967_296,
            "stages_per_trial 4294967296 breaks the bound 2 <= stages_per_trial <= 4294967295",
            id="count-above-u32",
        ),
        pytest.param(
            65_536,
            65_536,
            4_294_967_295,
            "trials 65536 breaks the bound trials <= floor(4294967295 / stages_per_trial) = 65535",
            id="product-above-u32",
        ),
        pytest.param(
            3_434,
            101,
            346_833,
            "records 346833 breaks the identity records = trials * stages_per_trial = 346834",
            id="records-not-product",
        ),
    ],
)
def test_check_counts_rejects_the_arithmetic_boundary_cases(
    trials, stages_per_trial, records, detail
):
    """The §7.3 arithmetic-boundary cases, on integers alone — no frame is
    allocated: a count above 4,294,967,295, `trials * N` above it with every
    count within it, and `records` other than `trials * N`."""
    with pytest.raises(ValueError) as failure:
        pe.check_counts(trials, stages_per_trial, records)
    assert str(failure.value) == detail


def test_check_counts_accepts_the_bounds():
    """The boundary values themselves pass: N = 4,294,967,295 on one trial,
    and `trials * N` exactly 4,294,967,295."""
    pe.check_counts(1, 4_294_967_295, 4_294_967_295)
    pe.check_counts(65_535, 65_537, 4_294_967_295)
    pe.check_counts(3_434, 101, 346_834)


# -- The non-finite cases ---------------------------------------------------------


def _nan_in_references(frames, monkeypatch):
    synthetic = pe.synthetic_cases

    def with_nan():
        cases = synthetic()
        cases["display_rounding"][0]["value"] = math.nan
        return cases

    monkeypatch.setattr(pe, "synthetic_cases", with_nan)


def _infinity_in_references(frames, monkeypatch):
    battery = pe.boundary_cases

    def with_infinity(vintage):
        cases = battery(vintage)
        cases[0]["windows"]["30"]["lo"] = math.inf
        return cases

    monkeypatch.setattr(pe, "boundary_cases", with_infinity)


def _nan_in_manifest(frames, monkeypatch):
    _patch_manifest(monkeypatch, lambda manifest: manifest["stage_spacing"].update(mean=math.nan))


def _infinity_in_field_export(frames, monkeypatch):
    frames["sure"].loc[0, "SH"] = math.inf


@pytest.mark.parametrize(
    ("last_line", "corrupt"),
    [
        pytest.param(
            "finite-reference-values: FAILED — references.synthetic.display_rounding[0].value "
            "is nan",
            _nan_in_references,
            id="nonfinite-1",
        ),
        pytest.param(
            "finite-reference-values: FAILED — references.boundary_cases[0].windows.30.lo is inf",
            _infinity_in_references,
            id="nonfinite-2",
        ),
        pytest.param(
            "error: ValueError: Out of range float values are not JSON compliant: nan",
            _nan_in_manifest,
            id="nonfinite-3",
        ),
        pytest.param(
            "error: ValueError: Out of range float values are not JSON compliant: inf",
            _infinity_in_field_export,
            id="nonfinite-4",
        ),
    ],
)
def test_a_non_finite_value_fails_the_run(last_line, corrupt, tmp_path, monkeypatch):
    """A NaN or an infinity in the reference results fails
    `finite-reference-values` (§3.6), which prints no `ok` line; in any
    other JSON payload — the artifact manifest, the field export — the
    canonical serializer's `allow_nan=False` fails the run (§4.1 step 2).
    Either way the run exits 1 and writes no pointer."""
    frames = _source_frames()
    corrupt(frames, monkeypatch)
    root = _make_repo(tmp_path / "repo", frames)
    code, lines = _export(root)
    assert code == 1
    assert lines[-1] == last_line
    assert ("finite-reference-values", "ok") not in _statuses(lines)
    assert not (root / pe.POINTER_PATH).exists()


# -- Prerequisites and provenance (§7.3) ---------------------------------------------


def _snapshot(path) -> dict[str, bytes | None]:
    """Every path under ``path`` with its bytes (None for a directory)."""
    if not path.exists():
        return {}
    return {
        p.relative_to(path).as_posix(): p.read_bytes() if p.is_file() else None
        for p in sorted(path.rglob("*"))
    }


def _forbid_view_builder(monkeypatch) -> list[dict]:
    """Record every call of the view builder, failing it."""
    calls: list[dict] = []

    def build(**kwargs):
        calls.append(kwargs)
        raise AssertionError("the view builder was called")

    monkeypatch.setattr(views, "build_duckdb_views", build)
    return calls


def _exported_repo(tmp_path):
    """A fixture repository after one successful export, and a copy of its
    pointer outside the repository: the pointer a `--reproduce` run is
    given."""
    root = _make_repo(tmp_path / "repo", _source_frames())
    code, lines = _export(root)
    assert code == 0, lines
    given = tmp_path / "given" / "pointer.json"
    given.parent.mkdir()
    shutil.copyfile(root / pe.POINTER_PATH, given)
    return root, given


def _change_fdhi_cleaned(root) -> None:
    """Rewrite `fdhi_cleaned` with one more row: a changed input."""
    path = root / FDHI_CLEANED
    frame = pd.read_parquet(path)
    pd.concat([frame, frame.iloc[:1]], ignore_index=True).to_parquet(path, index=False)


def _inputs_missing(tmp_path, monkeypatch):
    """With every other input present, a missing `fdhi_cleaned` fails
    `inputs-present`, naming its path and the rebuild command, before the
    view builder is called; the pointer and the existing
    `dist/app/<data_tag>/` stay unchanged."""
    root = _make_repo(tmp_path / "repo", _source_frames())
    (root / FDHI_CLEANED).unlink()
    pointer = root / pe.POINTER_PATH
    pointer.parent.mkdir(parents=True)
    pointer.write_bytes(b'{"kept": "pointer"}\n')
    kept = root / pe.DIST_APP_DIR / pe.DEV_TAG / "kept.txt"
    kept.parent.mkdir(parents=True)
    kept.write_bytes(b"kept\n")
    before = (pointer.read_bytes(), _snapshot(root / "dist"))
    calls = _forbid_view_builder(monkeypatch)
    code, lines = _export(root)
    assert code == 1
    assert _statuses(lines)[:-1] == _all_ok(("data-tag", "retained-copy"))
    assert lines[-1] == f"inputs-present: FAILED — {FDHI_CLEANED} is missing. {REBUILD}"
    assert calls == []
    assert (pointer.read_bytes(), _snapshot(root / "dist")) == before


def _inputs_missing_reproduce(tmp_path, monkeypatch):
    """The same in a `--reproduce` run, whose rebuild command names
    `--fdhi-flatfile` and the recorded flatfile path."""
    root, given = _exported_repo(tmp_path)
    (root / FDHI_CLEANED).unlink()
    pointer = root / pe.POINTER_PATH
    before = (pointer.read_bytes(), _snapshot(root / "dist"))
    calls = _forbid_view_builder(monkeypatch)
    code, lines = _run(root, "--reproduce", str(given))
    assert code == 1
    assert _statuses(lines)[:-1] == _all_ok(("data-tag",))
    assert lines[-1] == f"inputs-present: FAILED — {FDHI_CLEANED} is missing. {REBUILD_REPRODUCE}"
    assert calls == []
    assert (pointer.read_bytes(), _snapshot(root / "dist")) == before


def _provenance_exact(tmp_path, monkeypatch):
    """A successful fixture export records exactly the nine expected paths,
    each with its independently measured SHA-256 and byte count, in the
    pointer and the artifact manifest alike."""
    root, _ = _exported_repo(tmp_path)
    expected = []
    for path in sorted(NINE_INPUTS):
        data = (root / path).read_bytes()
        expected.append(
            {"path": path, "sha256": hashlib.sha256(data).hexdigest(), "bytes": len(data)}
        )
    pointer = json.loads((root / pe.POINTER_PATH).read_text(encoding="utf-8"))
    _, manifest = _vintage(root)
    assert pointer["provenance"]["inputs"] == expected
    assert manifest["provenance"]["inputs"] == expected


def _provenance_changed(tmp_path, monkeypatch):
    """`fdhi_cleaned` changed after the initial hashes fails `provenance`,
    naming it, and the pointer is not written."""
    root = _make_repo(tmp_path / "repo", _source_frames())
    step4 = pe.write_manifest_and_terms

    def change_then_step4(ctx, vintage):
        _change_fdhi_cleaned(root)
        step4(ctx, vintage)

    monkeypatch.setattr(pe, "write_manifest_and_terms", change_then_step4)
    code, lines = _export(root)
    _assert_fails_at(root, code, lines, "provenance", "provenance", f"{FDHI_CLEANED} now has")


def _reproduce_changed(tmp_path, monkeypatch):
    """`--reproduce` refuses a changed `fdhi_cleaned` checksum, naming that
    input and no other, before it writes anything."""
    root, given = _exported_repo(tmp_path)
    _change_fdhi_cleaned(root)
    code, lines = _run(root, "--reproduce", str(given))
    assert code == 1
    statuses = _statuses(lines)
    assert statuses[:-1] == _all_ok(("data-tag", "inputs-present"))
    failed, status = statuses[-1]
    assert failed == "provenance"
    assert status.startswith(f"FAILED — provenance.inputs: {FDHI_CLEANED} has SHA-256 ")
    assert sum("provenance.inputs:" in line for line in lines) == 1
    assert not (root / pe.DIST_APP_DIR / f"{pe.DEV_TAG}.reproduced").exists()


def _reproduce_two_flatfiles(tmp_path, monkeypatch):
    """With the recorded flatfile present and unchanged and a newer one added
    after the export — the one discovery would now select — `--reproduce`
    exits 0, selecting the recorded flatfile, every output matching the
    pointer."""
    root, given = _exported_repo(tmp_path)
    (root / NEWER_FLATFILE).write_bytes(f"stub {NEWER_FLATFILE}\n".encode())
    assert NEWER_FLATFILE in pe.discover_inputs(root)
    code, lines = _run(root, "--reproduce", str(given))
    assert code == 0, lines
    assert _statuses(lines) == _all_ok(r for r in REPORT_RULES if r != "retained-copy")
    pointer = json.loads(given.read_text(encoding="utf-8"))
    reproduced = root / pe.DIST_APP_DIR / f"{pe.DEV_TAG}.reproduced"
    files = {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in reproduced.iterdir()}
    assert files == pointer["files"]
    [name] = [name for name in files if name.startswith("manifest-")]
    manifest = json.loads((reproduced / name).read_text(encoding="utf-8"))
    paths = [record["path"] for record in manifest["provenance"]["inputs"]]
    assert FLATFILE in paths and NEWER_FLATFILE not in paths


PREREQUISITE_CASES = {
    "inputs-missing": _inputs_missing,
    "inputs-missing-reproduce": _inputs_missing_reproduce,
    "provenance-exact": _provenance_exact,
    "provenance-changed": _provenance_changed,
    "reproduce-changed": _reproduce_changed,
    "reproduce-two-flatfiles": _reproduce_two_flatfiles,
}


@pytest.mark.parametrize("case", list(PREREQUISITE_CASES))
def test_prerequisite_and_provenance_cases(case, tmp_path, monkeypatch):
    """The §7.3 declared-dependency and reproduction cases, each against a
    temporary repository root, outside the step-3 and step-5 corruptions."""
    PREREQUISITE_CASES[case](tmp_path, monkeypatch)


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
