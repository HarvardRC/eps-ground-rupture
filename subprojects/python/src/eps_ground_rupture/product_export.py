"""Product export: `poetry run egr-export-app` / Gradle `exportApp`.

One run writes one complete data vintage for the scenario page into
`dist/app/<data-tag>/` — the scenario artifact, the field and regression
exports, the reference results, the vintage-terms file, and the artifact
manifest — and the working-tree pointer manifest
`subprojects/webapp/data/pointer.json`, which it never commits
(docs/app/ddd.md §4.1, Export task and validation; the formats are
§3.1-§3.6). The reference generator computes the reference results from
the view rows, never from the decoded artifact (§3.6); its synthetic
cases' inputs come from `reference_cases.py`.

Every named rule of §4.1 runs inside the run, in the §4.1 order: the
preconditions of step 1, the decode checks of step 3, the manifest
cross-checks of step 5, and the pointer checks of step 6. Each prints
`<rule>: ok`; the first failure prints `<rule>: FAILED — <detail>` and ends
the run non-zero, before step 6 writes the pointer.

The run builds its own DuckDB views in a temporary directory, never
`dashboards/duckdb/eps.duckdb`, so every export comes from the running
code. `--reproduce <pointer>` regenerates a vintage byte for byte from
its pointer into `dist/app/<data-tag>.reproduced/` (§4.3, Regeneration).
"""

from __future__ import annotations

import argparse
import bisect
import contextlib
import datetime
import fnmatch
import gzip
import hashlib
import json
import math
import platform
import re
import shutil
import struct
import subprocess
import sys
import tempfile
import traceback
import zlib
from collections.abc import Iterator, Sequence
from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal
from fractions import Fraction
from pathlib import Path, PurePosixPath

import duckdb
import numpy as np
import pandas as pd
import pyarrow

from . import __version__, io, reference_cases, views
from .config import REPO_ROOT, SCARP_CLASS_PALETTE, SCARP_CLASSES

# --------------------------------------------------------------------------
# Run inputs and repository paths (§4.1 step 1; §3.2 `provenance`)
# --------------------------------------------------------------------------

#: The single development tag: exported locally, never published (§3).
DEV_TAG = "data-v0-test"

#: The five processed tables the export and its shared view builder need.
PROCESSED_INPUTS: tuple[str, ...] = tuple(
    f"data/processed/{table}/data.parquet"
    for table in ("dem", "fdhi_cleaned", "fdhi_measurements", "kern_combined", "sure")
)

#: The raw inputs `egr-build` reads, but the FDHI flatfile, whose name
#: carries its vintage date and is discovered (or, on reproduction, read
#: from the pointer).
RAW_FIXED_INPUTS: tuple[str, ...] = tuple(
    f"data/raw/{name}" for name in (io.DEM_NAME, io.SURE_NAME, io.KERN_NAME)
)

#: The FDHI flatfile's repository-relative pattern.
FLATFILE_PATTERN = f"data/raw/{io.FDHI_FLATFILE_GLOB}"

#: The owner's vintage-terms source (§4.4, Vintage terms), required by every
#: run whose tag is not :data:`DEV_TAG`.
REDISTRIBUTION_PATH = "data/REDISTRIBUTION.md"

#: The working-tree pointer manifest (§3.3).
POINTER_PATH = "subprojects/webapp/data/pointer.json"

#: Where vintages are written: `dist/app/<data-tag>/`.
DIST_APP_DIR = "dist/app"

#: The clean-tree command of §4.1 step 1, run at the repository root.
CLEAN_TREE_COMMAND: tuple[str, ...] = (
    "git",
    "status",
    "--porcelain=v1",
    "--untracked-files=all",
    "--",
    ".",
    f":(exclude){POINTER_PATH}",
)

REBUILD_COMMAND = (
    "Run poetry run egr-build from subprojects/python with the project "
    "virtualenv active, then retry."
)
REBUILD_COMMAND_REPRODUCE = (
    "Run poetry run egr-build --fdhi-flatfile {path} from subprojects/python "
    "with the project virtualenv active, then retry."
)

#: The `compression` member of `provenance` (§3.2).
COMPRESSION: dict[str, object] = {
    "format": "gzip",
    "call": "gzip.compress",
    "compresslevel": 9,
    "mtime": 0,
}


class ExportFailure(Exception):
    """A named rule of the run failed (docs/app/ddd.md §4.1): ``rule`` names
    it and ``detail`` says what failed. The run prints
    `<rule>: FAILED — <detail>` and ends non-zero — the validation report's
    rules and the reference generator's assertion `finite-reference-values`
    (§3.6 step 9) alike."""

    def __init__(self, rule: str, detail: str) -> None:
        super().__init__(detail)
        self.rule = rule
        self.detail = detail

    def report(self) -> str:
        """What the run prints for this failure."""
        return f"{self.rule}: FAILED — {self.detail}"


def report_ok(rule: str) -> None:
    """A passing rule's line of the validation report (§4.1)."""
    print(f"{rule}: ok")


#: The vintage tags an export accepts: `data-vN` (N ≥ 1, no leading zero)
#: or the development tag `data-v0-test`, matched in full.
DATA_TAG_PATTERN = re.compile(r"data-v(0-test|[1-9][0-9]*)")


def check_data_tag(data_tag: str) -> None:
    """Refuse a tag that does not fully match :data:`DATA_TAG_PATTERN`,
    before the run deletes or writes anything."""
    if DATA_TAG_PATTERN.fullmatch(data_tag) is None:
        raise ExportFailure("data-tag", f"{data_tag!r} does not match ^{DATA_TAG_PATTERN.pattern}$")


def check_retained_copy(root: Path, data_tag: str) -> None:
    """Rule `retained-copy` (§4.1 step 1): refuse while
    `dist/app/<data-tag>.publication.json` exists, because
    `dist/app/<data-tag>/` then holds a staged or published vintage — the
    retained copy of §4.3."""
    record = f"{DIST_APP_DIR}/{data_tag}.publication.json"
    if (root / record).exists():
        raise ExportFailure(
            "retained-copy",
            f"{record} exists, so {DIST_APP_DIR}/{data_tag}/ holds a staged or published "
            "vintage (its retained copy); the run changes nothing",
        )


# --------------------------------------------------------------------------
# Small helpers
# --------------------------------------------------------------------------


def canonical_json(obj: object) -> bytes:
    """The canonical JSON form of §4.1 step 2, as UTF-8 bytes."""
    text = json.dumps(
        obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False, allow_nan=False
    )
    return (text + "\n").encode("utf-8")


def gzip_bytes(payload: bytes) -> bytes:
    """The one compression call §4.1 step 2 allows."""
    return gzip.compress(payload, compresslevel=9, mtime=0)


def sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def hash_file(path: Path) -> tuple[str, int]:
    """SHA-256 and byte count of a file's contents."""
    digest = hashlib.sha256()
    size = 0
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            digest.update(chunk)
            size += len(chunk)
    return digest.hexdigest(), size


def _git(root: Path, *args: str) -> str:
    result = subprocess.run(["git", *args], cwd=root, check=True, capture_output=True, text=True)
    return result.stdout


def source_commit(root: Path) -> str:
    """`git rev-parse HEAD` at the repository root."""
    return _git(root, "rev-parse", "HEAD").strip()


def tree_is_clean(root: Path) -> bool:
    """True when the clean-tree command of §4.1 step 1 prints nothing."""
    result = subprocess.run(
        list(CLEAN_TREE_COMMAND), cwd=root, check=True, capture_output=True, text=True
    )
    return result.stdout == ""


def environment() -> dict[str, str]:
    """The `environment` member of `provenance` (§3.2)."""
    return {
        "python": platform.python_version(),
        "duckdb": duckdb.__version__,
        "numpy": np.__version__,
        "pandas": pd.__version__,
        "pyarrow": pyarrow.__version__,
        "zlib": zlib.ZLIB_RUNTIME_VERSION,
        "platform": f"{sys.platform}-{platform.machine()}",
    }


def matches_flatfile_pattern(path: str) -> bool:
    """Whether a repository-relative POSIX path matches :data:`FLATFILE_PATTERN`
    with glob semantics (the `*` never crosses a `/`)."""
    p = PurePosixPath(path)
    return str(p.parent) == "data/raw" and fnmatch.fnmatchcase(p.name, io.FDHI_FLATFILE_GLOB)


# --------------------------------------------------------------------------
# Step 1: run setup — inputs, provenance, views
# --------------------------------------------------------------------------


def discover_inputs(root: Path) -> list[str]:
    """The nine data paths of an ordinary run, the flatfile discovered by
    `io.find_fdhi_flatfile()`; a missing flatfile stays its pattern."""
    flatfile = io.find_fdhi_flatfile(root / "data" / "raw")
    flat = flatfile.relative_to(root).as_posix() if flatfile else FLATFILE_PATTERN
    return sorted([*PROCESSED_INPUTS, *RAW_FIXED_INPUTS, flat])


def check_inputs_present(
    root: Path, data_tag: str, paths: list[str], *, flatfile: str | None = None
) -> None:
    """The existence check of §4.1 step 1, before any deletion, hashing, or
    view building. ``flatfile`` is the recorded flatfile path of a
    `--reproduce` run, which the rebuild command then names."""
    problems: list[str] = []
    for path in paths:
        if (root / path).is_file():
            continue
        if path in PROCESSED_INPUTS:
            hint = REBUILD_COMMAND_REPRODUCE.format(path=flatfile) if flatfile else REBUILD_COMMAND
            problems.append(f"{path} is missing. {hint}")
        else:
            problems.append(
                f"{path} is missing; egr-build cannot recreate a raw input — " "see data/README.md."
            )
    if data_tag != DEV_TAG and not (root / REDISTRIBUTION_PATH).is_file():
        problems.append(
            f"{REDISTRIBUTION_PATH} is missing; every export whose tag is not "
            f"{DEV_TAG} copies it as the vintage-terms file."
        )
    if problems:
        raise ExportFailure("inputs-present", "\n".join(problems))


def hash_inputs(root: Path, paths: list[str]) -> list[dict[str, object]]:
    """The `inputs` member of `provenance`: sorted by path."""
    records = []
    for path in sorted(paths):
        sha, size = hash_file(root / path)
        records.append({"path": path, "sha256": sha, "bytes": size})
    return records


def build_provenance(
    commit: str, clean: bool, inputs: list[dict[str, object]]
) -> dict[str, object]:
    """The `provenance` object of §3.2."""
    return {
        "source_commit": commit,
        "source_tree_clean": clean,
        "inputs": inputs,
        "environment": environment(),
        "compression": dict(COMPRESSION),
    }


def reset_dir(path: Path) -> None:
    """Delete and recreate an output directory."""
    if path.exists():
        shutil.rmtree(path)
    path.mkdir(parents=True)


def export_date_now() -> str:
    """UTC timestamp of the run, `YYYY-MM-DDTHH:MM:SSZ` (§3)."""
    return datetime.datetime.now(datetime.UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


# --------------------------------------------------------------------------
# Step 2: the scenario artifact (§3.1) and its manifest figures (§3.2)
# --------------------------------------------------------------------------

SCHEMA_VERSION = 1

#: The maximum unsigned 32-bit header count, U of the §3.2 Count contract.
U32_MAX = 4_294_967_295

MAGIC = b"GRXA"
HEADER_BYTES = 16

#: The pipeline column naming a trial.
TRIAL_SOURCE_COLUMN = "Trial"

#: The trial table's column order under schema version 1 (§3.1).
TRIAL_TABLE_COLUMNS: tuple[str, ...] = (
    "fault_dip",
    "sediment_strength",
    "cohesion",
    "set",
    "depth",
    "density",
    "model_family",
)

#: The `dem` view column behind each trial-table column but `model_family`.
TRIAL_SOURCE_COLUMNS: dict[str, str] = {
    "fault_dip": "Fault_Dip",
    "sediment_strength": "Sediment_Strength",
    "cohesion": "Cohesion",
    "set": "Set",
    "depth": "Depth",
    "density": "Density",
}

#: Trial-table columns whose dictionaries hold integers (ascending); the
#: others hold strings in Python `sorted()` code-point order (§3.2).
INTEGER_TRIAL_COLUMNS: tuple[str, ...] = ("fault_dip", "depth")

#: The `model_family` dictionary: 0 is the published 2D ensemble (§3.1).
MODEL_FAMILIES: tuple[str, ...] = ("2D",)

#: The `dem` view column behind each stage array.
STAGE_SOURCE_COLUMNS: dict[str, str] = {
    "slip": "Slip",
    "scarp_height": "Scarp_Height",
    "dzw": "DZW",
    "scarp_dip": "Scarp_Dip",
    "scarp_class": "Scarp_Class",
}

#: The scaled columns' `decimals` and `offset_steps` (§3.1, Restoring values).
SCALED_COLUMNS: dict[str, tuple[int, int]] = {
    "slip": (4, 0),
    "scarp_height": (3, -182),
    "dzw": (3, 0),
}

#: The dip dictionary holds thousandths of a degree (DD-1).
DIP_DECIMALS = 3

UINT16_NULL = 65535
UINT8_NULL = 255
INT32_MIN = -(2**31)
INT32_MAX = 2**31 - 1

#: The blocks in physical order, with their dtypes (§3.1, §3.2 `blocks`).
BLOCK_DTYPES: dict[str, str] = {
    "trial_table": "uint8",
    "slip": "uint16",
    "scarp_height": "uint16",
    "dzw": "uint16",
    "scarp_dip": "uint16",
    "scarp_class": "uint8",
    "dip_dictionary": "int32",
}
BLOCK_ORDER: tuple[str, ...] = tuple(BLOCK_DTYPES)

#: The nine selectable arm-and-strength states, in display order: the
#: uniform arm (`Homogeneous`) first, then the layered arm
#: (`Heterogeneous`); within an arm the order of PDD §3.2 — Sediment
#: strength and structure (FR-S2): Weak, Moderate, Strong, Random
#: Heterogeneous, Cohesive Top Unit, Alternating Strong-Weak — in data
#: spellings (docs/app/ddd.md §3.2, `arm_strength_states`).
ARM_STRENGTH_STATES: tuple[tuple[str, str], ...] = (
    ("Homogeneous", "Weak"),
    ("Homogeneous", "Moderate"),
    ("Homogeneous", "Strong"),
    ("Heterogeneous", "Weak"),
    ("Heterogeneous", "Moderate"),
    ("Heterogeneous", "Strong"),
    ("Heterogeneous", "Random Heterogeneous"),
    ("Heterogeneous", "Cohesive Top Unit"),
    ("Heterogeneous", "Alternating Strong-Weak"),
)

#: The storage grid of recorded slip, metres (§3.2 `slip_window_bounds`).
SLIP_RECORDING_STEP = 0.0001

#: The §3.1 restore rule for `slip` (`decimals` 4, `offset_steps` 0):
#: ``x = stored / SLIP_DECODE_DIVISOR``, a division of two ints.
SLIP_DECODE_DIVISOR = 10**4


def align4(n: int) -> int:
    return (n + 3) & ~3


def check_counts(trials: object, stages_per_trial: object, records: object) -> None:
    """The Count contract of §3.2: returns None or raises ``ValueError``
    naming the count and the violated bound or identity.

    T, N, and R are integers with 1 <= T <= U, 2 <= N <= U, and 2 <= R <= U;
    T <= floor(U / N) is checked before multiplying, then R = T * N.
    """
    named = (
        ("trials", trials, 1),
        ("stages_per_trial", stages_per_trial, 2),
        ("records", records, 2),
    )
    for name, value, _ in named:
        if isinstance(value, bool) or not isinstance(value, int | np.integer):
            raise ValueError(f"{name} {value!r} is not an integer")
    for name, value, low in named:
        if not low <= value <= U32_MAX:
            raise ValueError(f"{name} {value} breaks the bound {low} <= {name} <= {U32_MAX}")
    t, n, r = int(trials), int(stages_per_trial), int(records)  # type: ignore[call-overload]
    if t > U32_MAX // n:
        raise ValueError(
            f"trials {t} breaks the bound trials <= floor({U32_MAX} / stages_per_trial) "
            f"= {U32_MAX // n}"
        )
    if r != t * n:
        raise ValueError(
            f"records {r} breaks the identity records = trials * stages_per_trial = {t * n}"
        )


def check_source_counts(trial_ids: list[str]) -> tuple[list[str], int]:
    """The source checks of rule `counts`, in the order of §4.1 step 2, run
    before any buffer is allocated, `stage_spacing` computed, or header
    packed: at least one trial; every trial with at least two stages; every
    trial with the first trial's stage count N; then :func:`check_counts`.

    Returns the trials in artifact order (ascending code point) and N.
    """
    per_trial: dict[str, int] = {}
    for trial in trial_ids:
        per_trial[trial] = per_trial.get(trial, 0) + 1
    trials = sorted(per_trial)
    if not trials:
        raise ExportFailure("counts", f"trials 0 breaks the bound 1 <= trials <= {U32_MAX}")
    for trial in trials:
        if per_trial[trial] < 2:
            raise ExportFailure(
                "counts", f"Trial {trial} has {per_trial[trial]} stage, fewer than 2"
            )
    n = per_trial[trials[0]]
    for trial in trials:
        if per_trial[trial] != n:
            raise ExportFailure(
                "counts",
                f"Trial {trial} has {per_trial[trial]} stages, not the first trial's N = {n}",
            )
    try:
        check_counts(len(trials), n, len(trial_ids))
    except ValueError as exc:
        raise ExportFailure("counts", str(exc)) from exc
    return trials, n


def _float_values(frame: pd.DataFrame, column: str) -> tuple[np.ndarray, np.ndarray]:
    """A float column's values and validity mask (a null reads as invalid)."""
    values = frame[column].to_numpy(dtype=np.float64, na_value=np.nan)
    valid = ~np.isnan(values)
    if not np.isfinite(values[valid]).all():
        raise ValueError(f"the dem view's {column} holds an infinite value")
    return values, valid


def _encode_scaled(
    name: str, values: np.ndarray, valid: np.ndarray, decimals: int, offset_steps: int
) -> np.ndarray:
    """`stored = round(v * 10^d) - offset_steps` as uint16, nulls on the sentinel."""
    stored = np.full(values.shape, UINT16_NULL, dtype=np.uint16)
    steps = np.rint(values[valid] * 10**decimals).astype(np.int64) - offset_steps
    if steps.size and (steps.min() < 0 or steps.max() > UINT16_NULL):
        raise ValueError(
            f"{name}: stored values {steps.min()}..{steps.max()} do not fit uint16 "
            f"with decimals {decimals} and offset_steps {offset_steps}"
        )
    stored[valid] = steps
    return stored


def _encode_dip(values: np.ndarray, valid: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """The DD-1 encoding: a uint16 index into the ascending int32 dictionary
    of every distinct recorded dip in thousandths of a degree."""
    thousandths = np.rint(values[valid] * 10**DIP_DECIMALS).astype(np.int64)
    dictionary = np.unique(thousandths)
    if dictionary.size and (dictionary[0] < INT32_MIN or dictionary[-1] > INT32_MAX):
        raise ValueError("scarp_dip: a dictionary entry does not fit int32")
    if dictionary.size > UINT16_NULL + 1:
        raise ValueError(f"scarp_dip: {dictionary.size} distinct dips do not fit a uint16 index")
    stored = np.full(values.shape, UINT16_NULL, dtype=np.uint16)
    stored[valid] = np.searchsorted(dictionary, thousandths)
    return stored, dictionary.astype(np.int32)


def _encode_classes(series: pd.Series) -> tuple[np.ndarray, int]:
    """Class codes indexing `config.SCARP_CLASSES`, null as 255."""
    codes = np.full(len(series), UINT8_NULL, dtype=np.uint8)
    for code, name in enumerate(SCARP_CLASSES):
        codes[(series == name).to_numpy(dtype=bool, na_value=False)] = code
    present = series.notna().to_numpy()
    unknown = present & (codes == UINT8_NULL)
    if unknown.any():
        names = sorted({str(v) for v in series[unknown]})
        raise ValueError(f"Scarp_Class holds values outside config.SCARP_CLASSES: {names}")
    return codes, int((~present).sum())


def _trial_value(column: str, value: object) -> object:
    """A trial-table source value, typed as its dictionary holds it."""
    if column in INTEGER_TRIAL_COLUMNS:
        if isinstance(value, bool) or not isinstance(value, int | float | np.number):
            raise ValueError(f"{TRIAL_SOURCE_COLUMNS[column]} holds a non-integer value {value!r}")
        if not float(value).is_integer():
            raise ValueError(f"{TRIAL_SOURCE_COLUMNS[column]} holds a non-integer value {value!r}")
        return int(value)
    if not isinstance(value, str):
        raise ValueError(f"{TRIAL_SOURCE_COLUMNS[column]} holds a non-string value {value!r}")
    return value


def _scaled_column(
    decimals: int, offset_steps: int, values: np.ndarray, valid: np.ndarray, encoding: str
) -> dict[str, object]:
    """A `columns` record (§3.2) of a scaled or dictionary column."""
    scale = 1 / 10**decimals
    has_values = bool(valid.any())
    return {
        "encoding": encoding,
        "decimals": decimals,
        "offset_steps": offset_steps,
        "scale": scale,
        "offset": offset_steps / 10**decimals,
        "physical_min": float(values[valid].min()) if has_values else None,
        "physical_max": float(values[valid].max()) if has_values else None,
        "recording_step": scale,
        "null_sentinel": UINT16_NULL,
        "null_count": int((~valid).sum()),
    }


def stage_spacing(
    slip_stored: Sequence[int] | np.ndarray, trials: int, stages_per_trial: int
) -> dict[str, float]:
    """`stage_spacing` (docs/app/ddd.md §3.2): {`min`, `max`, `mean`} of the
    consecutive within-trial slip differences, in metres, from the stored
    integers of a trial-major `slip` block — the export's packed column, or
    the block that rule `manifest-figures` (§4.1) decodes from the written
    artifact.

    The arithmetic of §3.2, in IEEE 754 binary64 throughout: each stage's
    slip is the value the §3.1 restore rule decodes, ``x = stored / 10000``
    (Python division of two ints; `slip`'s `offset_steps` is 0); within each
    trial, in stage order, each difference is the binary64 subtraction
    ``x[k + 1] - x[k]``, giving T·(N − 1) differences; `min` and `max` are the
    smallest and largest difference; `mean` is ``math.fsum`` of all
    differences divided in binary64 by the integer T·(N − 1). No other
    rounding applies.
    """
    stored = [int(value) for value in slip_stored]
    if len(stored) != trials * stages_per_trial:
        raise ValueError(
            f"slip block holds {len(stored)} values, not trials * stages_per_trial = "
            f"{trials * stages_per_trial}"
        )
    x = [value / SLIP_DECODE_DIVISOR for value in stored]
    diffs = [
        x[base + k + 1] - x[base + k]
        for base in range(0, trials * stages_per_trial, stages_per_trial)
        for k in range(stages_per_trial - 1)
    ]
    return {
        "min": min(diffs),
        "max": max(diffs),
        "mean": math.fsum(diffs) / (trials * (stages_per_trial - 1)),
    }


@dataclass
class ScenarioPack:
    """The packed scenario artifact and the decode information the run
    holds in memory for the manifest and the step-3 checks."""

    artifact: bytes
    """The decompressed artifact: header and aligned blocks."""
    frame: pd.DataFrame
    """The `dem` rows in artifact order (trial-major, ascending slip)."""
    trials: list[str]
    stages_per_trial: int
    trial_table: np.ndarray
    stored: dict[str, np.ndarray]
    dip_dictionary: np.ndarray
    counts: dict[str, int]
    blocks: dict[str, dict[str, object]]
    columns: dict[str, dict[str, object]]
    trial_columns: dict[str, list[object]]
    arm_strength_states: list[dict[str, str]]
    scarp_classes: list[str]
    """The class names the class codes index, as the manifest carries them."""
    stage_spacing: dict[str, float]
    slip_window_bounds: dict[str, float]


def pack_scenario(dem: pd.DataFrame) -> ScenarioPack:
    """Pack the `dem` view's rows exactly per §3.1 (DD-1 dictionary layout)."""
    trial_ids = dem[TRIAL_SOURCE_COLUMN].tolist()
    if not all(isinstance(t, str) for t in trial_ids):
        raise ValueError("the dem view's Trial column holds a null or non-string value")
    trials, n = check_source_counts(trial_ids)
    t_count, r_count = len(trials), len(trial_ids)

    # Trial-major, each trial's stages in ascending slip.
    position = {trial: i for i, trial in enumerate(trials)}
    trial_index = np.fromiter((position[t] for t in trial_ids), dtype=np.int64, count=r_count)
    slip_source = dem[STAGE_SOURCE_COLUMNS["slip"]].to_numpy(dtype=np.float64, na_value=np.nan)
    frame = dem.iloc[np.lexsort((slip_source, trial_index))].reset_index(drop=True)

    stored: dict[str, np.ndarray] = {}
    columns: dict[str, dict[str, object]] = {}
    float_values: dict[str, tuple[np.ndarray, np.ndarray]] = {}
    for name, (decimals, offset_steps) in SCALED_COLUMNS.items():
        values, valid = _float_values(frame, STAGE_SOURCE_COLUMNS[name])
        float_values[name] = (values, valid)
        stored[name] = _encode_scaled(name, values, valid, decimals, offset_steps)
        columns[name] = _scaled_column(decimals, offset_steps, values, valid, "scaled")
    dip_values, dip_valid = _float_values(frame, STAGE_SOURCE_COLUMNS["scarp_dip"])
    stored["scarp_dip"], dip_dictionary = _encode_dip(dip_values, dip_valid)
    columns["scarp_dip"] = _scaled_column(DIP_DECIMALS, 0, dip_values, dip_valid, "dict")
    stored["scarp_class"], class_nulls = _encode_classes(frame[STAGE_SOURCE_COLUMNS["scarp_class"]])
    columns["scarp_class"] = {
        "encoding": "code",
        "decimals": None,
        "offset_steps": None,
        "scale": None,
        "offset": None,
        "physical_min": None,
        "physical_max": None,
        "recording_step": None,
        "null_sentinel": UINT8_NULL,
        "null_count": class_nulls,
    }

    # The trial table: one row per trial, each cell an index into its
    # column's dictionary; a trial's site conditions are read from its
    # first record.
    first = frame.iloc[np.arange(t_count) * n]
    trial_table = np.zeros((t_count, len(TRIAL_TABLE_COLUMNS)), dtype=np.uint8)
    trial_columns: dict[str, list[object]] = {}
    site: dict[str, list[object]] = {}
    for j, column in enumerate(TRIAL_TABLE_COLUMNS):
        if column == "model_family":
            dictionary: list[object] = list(MODEL_FAMILIES)
            cells = [0] * t_count
        else:
            site[column] = [
                _trial_value(column, v) for v in first[TRIAL_SOURCE_COLUMNS[column]].tolist()
            ]
            dictionary = sorted(set(site[column]))  # type: ignore[type-var]
            if len(dictionary) > UINT8_NULL + 1:
                raise ValueError(f"{column}: {len(dictionary)} values do not fit a uint8 cell")
            index = {value: i for i, value in enumerate(dictionary)}
            cells = [index[value] for value in site[column]]
        trial_table[:, j] = cells
        trial_columns[column] = dictionary

    # The measured pairs in display order; a pair outside
    # ARM_STRENGTH_STATES sorts last, and rule `dictionary-order` (step 3)
    # fails the run on it before any manifest is written.
    rank = {pair: i for i, pair in enumerate(ARM_STRENGTH_STATES)}
    pairs = set(zip(site["set"], site["sediment_strength"], strict=True))
    arm_strength_states = [
        {"set": arm, "sediment_strength": strength}
        for arm, strength in sorted(
            pairs,
            key=lambda pair: (rank.get(pair, len(rank)), pair),  # type: ignore[arg-type]
        )
    ]

    payloads = {
        "trial_table": trial_table.tobytes(),
        "slip": stored["slip"].astype("<u2").tobytes(),
        "scarp_height": stored["scarp_height"].astype("<u2").tobytes(),
        "dzw": stored["dzw"].astype("<u2").tobytes(),
        "scarp_dip": stored["scarp_dip"].astype("<u2").tobytes(),
        "scarp_class": stored["scarp_class"].tobytes(),
        "dip_dictionary": dip_dictionary.astype("<i4").tobytes(),
    }
    buffer = bytearray(MAGIC + struct.pack("<III", SCHEMA_VERSION, r_count, t_count))
    blocks: dict[str, dict[str, object]] = {}
    for name in BLOCK_ORDER:
        offset = align4(len(buffer))
        buffer.extend(bytes(offset - len(buffer)))
        blocks[name] = {
            "offset": offset,
            "length": len(payloads[name]),
            "dtype": BLOCK_DTYPES[name],
        }
        buffer.extend(payloads[name])
    buffer.extend(bytes(align4(len(buffer)) - len(buffer)))

    slip_values, slip_valid = float_values["slip"]
    return ScenarioPack(
        artifact=bytes(buffer),
        frame=frame,
        trials=trials,
        stages_per_trial=n,
        trial_table=trial_table,
        stored=stored,
        dip_dictionary=dip_dictionary,
        counts={"records": r_count, "trials": t_count, "stages_per_trial": n},
        blocks=blocks,
        columns=columns,
        trial_columns=trial_columns,
        arm_strength_states=arm_strength_states,
        scarp_classes=list(SCARP_CLASSES),
        stage_spacing=stage_spacing(stored["slip"], t_count, n),
        slip_window_bounds={
            "min": 0.0,
            "max": float(slip_values[slip_valid].max()),
            "recording_step": SLIP_RECORDING_STEP,
        },
    )


# --------------------------------------------------------------------------
# Step 2: the field export (§3.4) and the regression export (§3.5)
# --------------------------------------------------------------------------

#: The row record of the field export, in the `field_export` view's names.
FIELD_ROW_FIELDS: tuple[str, ...] = (
    "source",
    "eq_name",
    "magnitude",
    "analogue",
    "source_quantity",
    "value",
    "limited_comparison",
    "criterion_sub50",
    "labeled_set",
    "kern_field_group",
)

#: The approved offset-to-slip relationship in words (§3.5), ASCII only.
REGRESSION_RELATIONSHIP: dict[str, object] = {
    "y": {
        "name": "vd_hw",
        "description": "vertical displacement on the hanging wall",
        "unit": "m",
    },
    "x": {"name": "slip", "description": "fault slip at depth", "unit": "m"},
    "form": "vd_hw = slope * slip + intercept",
    "fit": (
        "ordinary least squares of vd_hw on slip per fault_dip over all dem records with "
        "both vd_hw and slip present; intercept fitted, not constrained through zero; "
        "DuckDB regr_slope, regr_intercept, and regr_r2 in the view dem_regression"
    ),
    "back_projection": "slip = (vd_hw - intercept) / slope",
}


def field_export_rows(con: duckdb.DuckDBPyConnection) -> list[dict[str, object]]:
    """The `field_export` view's rows in the §3.4 order: ascending by
    (source, analogue, eq_name, source_quantity, value), rows equal on all
    five ordered by their canonical serialization."""
    result = con.execute(f"SELECT {', '.join(FIELD_ROW_FIELDS)} FROM field_export").fetchall()
    rows = [dict(zip(FIELD_ROW_FIELDS, record, strict=True)) for record in result]
    for row in rows:
        if row["magnitude"] is not None:
            row["magnitude"] = float(row["magnitude"])  # type: ignore[arg-type]
        row["value"] = float(row["value"])  # type: ignore[arg-type]
    rows.sort(
        key=lambda row: (
            row["source"],
            row["analogue"],
            row["eq_name"],
            row["source_quantity"],
            row["value"],
            canonical_json(row),
        )
    )
    return rows


def regression_coefficients(con: duckdb.DuckDBPyConnection) -> list[dict[str, object]]:
    """`dem_regression`'s rows ascending by `fault_dip`, at full precision."""
    result = con.execute(
        "SELECT fault_dip, n, slope, intercept, r2 FROM dem_regression ORDER BY fault_dip"
    ).fetchall()
    return [
        {
            "fault_dip": int(fault_dip),
            "n": int(n),
            "slope": float(slope),
            "intercept": float(intercept),
            "r2": float(r2),
        }
        for fault_dip, n, slope, intercept, r2 in result
    ]


# --------------------------------------------------------------------------
# Step 2: the reference results (§3.6)
# --------------------------------------------------------------------------

#: The number of decades in the logarithmic-scale offer rule (§5.12): the
#: "more than two decades" of PDD §4.1 — Measurement views (FR-O1). The
#: envelope records it as `log_scale_min_decades` (§3.6).
LOG_SCALE_MIN_DECADES = 2

#: The offer ratio R of each decade count, as integer literals — the
#: literal table of `logScaleOfferRatio()` (§5.13), never ``10 **``.
LOG_SCALE_OFFER_RATIOS: dict[int, int] = {1: 10, 2: 100, 3: 1000}

#: The D-23 display decimals per quantity (§3.6 envelope `display_decimals`).
DISPLAY_DECIMALS: dict[str, int] = {"slip": 2, "scarp_height": 2, "dzw": 1, "scarp_dip": 0}

#: The measurements of a scenario entry's maps, in panel order.
MEASUREMENTS: tuple[str, ...] = ("scarp_height", "dzw", "scarp_dip")

#: The recording-step divisor D of every measurement (§5.4) and of slip.
MEASUREMENT_DIVISOR = 1000

#: One display step u in recording steps, and 10^dd, per display decimals
#: dd (§5.12, Histogram): integer literals, never computed.
DISPLAY_STEP_UNITS: dict[int, int] = {2: 10, 1: 100, 0: 1000}
DISPLAY_SCALE: dict[int, int] = {2: 100, 1: 10, 0: 1}

#: The most bins a linear histogram may have (§5.12 step (c)).
MAX_BINS = 60

#: The lowest logarithmic edge, 0.1 m in recording steps (§5.12).
LOG_FIRST_EDGE = 100

#: The selection bound of §3.6: identities up to it, a signature above.
IDENTITY_LIMIT = 10_000

#: The class code of an unclassified record (§3.1).
UNCLASSIFIED = UINT8_NULL

#: The stored-bounds guard of §5.3, in stored units.
STORED_BOUNDS_GUARD = 1e-9

#: The diagnosed-condition groups of §5.3, in their fixed order, each with
#: the DD-11 keys it resets.
CONDITION_GROUPS: tuple[tuple[str, tuple[str, ...]], ...] = (
    ("fault_dip", ("fault_dip",)),
    ("sediment", ("sediment",)),
    ("depth", ("depth",)),
    ("density", ("density",)),
    ("window", ("entry_mode", "slip_window", "offset_max")),
    ("scarp_class", ("scarp_class",)),
)

#: The view column of each scaled measurement read by the generator.
MEASUREMENT_SOURCE_COLUMNS: dict[str, str] = {
    "scarp_height": "Scarp_Height",
    "dzw": "DZW",
    "scarp_dip": "Scarp_Dip",
}

#: The golden scenarios of PDD §10.2 — Golden scenarios, ascending, each
#: as its changes to the vintage's default scenario (§5.6); GS-3, the Kern
#: preset, joins once D-6 is decided.
GOLDEN_SCENARIOS: tuple[tuple[str, dict[str, object]], ...] = (
    # Empty scenario (no active slip window), default population.
    ("GS-0", {}),
    # US-1: dips {30°, 40°}, Strong (uniform and layered), offset mode 3 m.
    (
        "GS-1",
        {
            "fault_dip": [30, 40],
            "sediment": [("Homogeneous", "Strong"), ("Heterogeneous", "Strong")],
            "entry_mode": "offset",
            "slip_window": None,
            "offset_max": "3",
        },
    ),
    # Moderate strength (both arms), dip 20°, depth 3 m, Dense, one state
    # per trial.
    (
        "GS-2",
        {
            "fault_dip": [20],
            "sediment": [("Homogeneous", "Moderate"), ("Heterogeneous", "Moderate")],
            "depth": [3],
            "density": ["Dense"],
            "population": "one_state_per_trial",
        },
    ),
    # Alternating Strong–Weak + depth 3 m.
    (
        "GS-4",
        {"sediment": [("Heterogeneous", "Alternating Strong-Weak")], "depth": [3]},
    ),
    # Alternating Strong–Weak, one state per trial.
    (
        "GS-5",
        {
            "sediment": [("Heterogeneous", "Alternating Strong-Weak")],
            "population": "one_state_per_trial",
        },
    ),
    # Slip window 0–0.04 m, all other controls default.
    ("GS-6", {"slip_window": {"min": "0", "max": "0.04"}}),
    # One state per simulation trial, no active slip window.
    ("GS-7", {"population": "one_state_per_trial"}),
)

#: The boundary battery's perturbations (§3.6, Boundary cases), in order.
BOUNDARY_PERTURBATIONS: tuple[str, ...] = (
    "exact",
    "ulp-",
    "ulp+",
    "in-",
    "in+",
    "out-",
    "out+",
    "step-",
    "step+",
    "roundtrip",
)

#: The offset-path populations and their case-name spellings.
BOUNDARY_POPULATIONS: tuple[tuple[str, str], ...] = (
    ("all_stages", "allstages"),
    ("one_state_per_trial", "onestate"),
)

_GRAMMAR_G = re.compile(r"(\d+(\.\d*)?|\.\d+)")


def canonical_decimal(text: str) -> str:
    """Grammar G's canonical form (§5.7) of a decimal text: leading zeros of
    the integer digits dropped (``0`` when none remain), trailing zeros of
    the fraction dropped, and the point kept only before remaining digits."""
    if _GRAMMAR_G.fullmatch(text) is None:
        raise ValueError(f"{text!r} is not a grammar-G decimal")
    whole, _, frac = text.partition(".")
    whole = whole.lstrip("0") or "0"
    frac = frac.rstrip("0")
    return f"{whole}.{frac}" if frac else whole


def float_decimal(value: float) -> str:
    """The canonical decimal of a float: Python ``repr`` with grammar G's
    canonical form applied, so ``5.0`` gives ``5`` (§3.2
    `slip_window_bounds`)."""
    return canonical_decimal(repr(value))


def canonical_scenario(
    *,
    fault_dip: Sequence[int],
    sediment: Sequence[tuple[str, str]],
    depth: Sequence[int],
    density: Sequence[str],
    entry_mode: str,
    slip_window: dict[str, str] | None,
    offset_max: str | None,
    population: str,
    scarp_class: Sequence[str],
    density_order: Sequence[str],
) -> dict[str, object]:
    """The canonical scenario object of DD-11 (§5.6): `fault_dip` and
    `depth` ascending; `sediment` as {`set`, `sediment_strength`} objects
    sorted by `set`, then `sediment_strength`, in code-point order;
    `density` in ``density_order``, the `trial_columns.density` dictionary
    order; `slip_window` null or the canonical endpoints, null in offset
    mode; `offset_max` the canonical offset entry, non-null exactly in
    offset mode; `scarp_class` in `config.SCARP_CLASSES` order."""
    if entry_mode not in ("slip", "offset"):
        raise ValueError(f"entry_mode {entry_mode!r}")
    if population not in ("all_stages", "one_state_per_trial"):
        raise ValueError(f"population {population!r}")
    if (offset_max is not None) != (entry_mode == "offset"):
        raise ValueError("offset_max must be non-null exactly in offset mode")
    if entry_mode == "offset" and slip_window is not None:
        raise ValueError("slip_window must be null in offset mode")
    unknown = [c for c in scarp_class if c not in SCARP_CLASSES]
    if unknown:
        raise ValueError(f"scarp_class outside config.SCARP_CLASSES: {unknown}")
    rank = {value: i for i, value in enumerate(density_order)}
    return {
        "fault_dip": sorted({int(d) for d in fault_dip}),
        "sediment": [
            {"set": arm, "sediment_strength": strength} for arm, strength in sorted(set(sediment))
        ],
        "depth": sorted({int(d) for d in depth}),
        "density": sorted(set(density), key=rank.__getitem__),
        "entry_mode": entry_mode,
        "slip_window": (
            None
            if slip_window is None
            else {
                "min": canonical_decimal(slip_window["min"]),
                "max": canonical_decimal(slip_window["max"]),
            }
        ),
        "offset_max": None if offset_max is None else canonical_decimal(offset_max),
        "population": population,
        "scarp_class": [c for c in SCARP_CLASSES if c in set(scarp_class)],
    }


def _canonical_inputs(spec: dict[str, object], density_order: Sequence[str]) -> dict[str, object]:
    return canonical_scenario(**spec, density_order=density_order)  # type: ignore[arg-type]


# -- §5.4 statistics: the Python twins ------------------------------------


def quantile_linear(v: Sequence[float], p: float) -> float:
    """NumPy's ``'linear'`` method with its endpoint branch (§5.4), the twin
    of `quantileLinear`; ``v`` ascending, ``len(v) >= 1``."""
    n = len(v)
    h = (n - 1) * p
    if h >= n - 1:
        return v[n - 1]
    i = math.floor(h)
    t = h - i
    a = v[i]
    b = v[i + 1]
    d = b - a
    return a + d * t if t < 0.5 else b - d * (1 - t)


def mean_from_steps(steps: Sequence[int], divisor: int) -> float:
    """The Mean step of §5.4: the exact integer sum S of the recording steps,
    then one correctly rounded division ``S / (n · D)``."""
    total = 0
    for s in steps:
        total += int(s)
    return total / (len(steps) * divisor)


def sample_sd(sorted_values: Sequence[float], mean: float) -> float:
    """The Standard deviation step of §5.4: an explicit loop over the
    ascending values accumulating ``(x − mean) · (x − mean)``, then
    ``sqrt(acc / (n − 1))`` — no builtin ``sum``, NumPy reduction, or ``**``."""
    acc = 0.0
    for x in sorted_values:
        acc += (x - mean) * (x - mean)
    return math.sqrt(acc / (len(sorted_values) - 1))


def summarize(
    steps: Sequence[int], divisor: int
) -> tuple[dict[str, float | None] | None, list[float]]:
    """The FR-O2 statistics of one measurement's valid values (§3.6 steps
    2–5) and the ascending restored values ``x = s / D``. With no value the
    statistics are None; with one, `sd` is None."""
    x = sorted(int(s) / divisor for s in steps)
    n = len(x)
    if n == 0:
        return None, x
    mean = mean_from_steps(steps, divisor)
    stats: dict[str, float | None] = {
        "median": quantile_linear(x, 50 / 100),
        "p16": quantile_linear(x, 16 / 100),
        "p84": quantile_linear(x, 84 / 100),
        "min": x[0],
        "max": x[n - 1],
        "mean": mean,
        "sd": sample_sd(x, mean) if n >= 2 else None,
    }
    return stats, x


def percentiles(x: Sequence[float]) -> list[float]:
    """`quantile_linear(v, q/100)` for q = 0 … 100 (§3.6 step 2)."""
    return [quantile_linear(x, q / 100) for q in range(101)]


# -- §5.12 histograms -------------------------------------------------------


def _check_classes(classes: Sequence[int]) -> None:
    if any(int(c) == UNCLASSIFIED for c in classes):
        raise ExportFailure(
            "unclassified-has-no-valid-measurement",
            "a valid value has class code 255 (an unclassified record)",
        )


def histogram(
    steps: Sequence[int], classes: Sequence[int], sorted_x: Sequence[float], display_decimals: int
) -> dict[str, object] | None:
    """The DD-5 bin rule of §5.12 over integer recording steps, their class
    codes, the same values ascending as float64, and the panel's display
    decimals; None with no value."""
    n = len(steps)
    if n == 0:
        return None
    _check_classes(classes)
    s_min, s_max = min(steps), max(steps)
    u = DISPLAY_STEP_UNITS[display_decimals]
    if s_min == s_max:
        rule, k = "single", 1
    else:
        iqr = quantile_linear(sorted_x, 0.75) - quantile_linear(sorted_x, 0.25)
        if iqr > 0:
            rule = "fd"
            x_width = 2 * iqr * DISPLAY_SCALE[display_decimals]
        else:
            rule = "scott"
            mean = mean_from_steps(steps, MEASUREMENT_DIVISOR)
            x_width = 3.49 * sample_sd(sorted_x, mean) * DISPLAY_SCALE[display_decimals]
        x_cubed = x_width * x_width * x_width

        def cube_n(k: int) -> float:
            kf = float(k)
            return kf * kf * kf * n

        k = max(1, math.ceil(x_width / math.cbrt(n)))
        while k > 1 and cube_n(k - 1) >= x_cubed:
            k -= 1
        while cube_n(k) < x_cubed:
            k += 1
    while True:
        width = k * u
        e0 = width * (s_min // width)
        bins = (s_max - e0) // width + 1
        if bins <= MAX_BINS:
            break
        k += 1
    counts = [[0] * len(SCARP_CLASSES) for _ in range(bins)]
    for s, c in zip(steps, classes, strict=True):
        counts[(int(s) - e0) // width][int(c)] += 1
    return {"rule": rule, "width_units": k, "first_edge": e0, "bins": bins, "counts": counts}


def histogram_log(
    steps: Sequence[int], classes: Sequence[int], offer_ratio: int
) -> dict[str, object] | None:
    """The width panel's logarithmic histogram (§5.12, Logarithmic scale),
    its offer rule included: None exactly when the axis is not offered."""
    positive = [int(s) for s in steps if s > 0]
    if not positive:
        return None
    min_pos, max_pos = min(positive), max(positive)
    if not max_pos > offer_ratio * min_pos:
        return None
    _check_classes(classes)
    first = LOG_FIRST_EDGE
    if min_pos >= LOG_FIRST_EDGE:
        while first * 2 <= min_pos:
            first *= 2
    edges = [first]
    while edges[-1] <= max_pos:
        edges.append(edges[-1] * 2)
    bins = len(edges) - 1
    counts = [[0] * len(SCARP_CLASSES) for _ in range(bins)]
    below = [0] * len(SCARP_CLASSES)
    for s, c in zip(steps, classes, strict=True):
        if s < LOG_FIRST_EDGE:
            below[int(c)] += 1
        else:
            counts[bisect.bisect_right(edges, int(s)) - 1][int(c)] += 1
    return {"first_edge": first, "bins": bins, "counts": counts, "below_counts": below}


# -- §5.8 display rounding ----------------------------------------------------


def display_round(value: float, decimals: int) -> str:
    """The display rounding of §5.8: half away from zero on the shortest
    round-trip decimal of |v|, no sign on a zero result, exactly
    ``decimals`` fraction digits, no grouping."""
    if not math.isfinite(value):
        raise ValueError(f"display_round of a non-finite value {value!r}")
    rounded = Decimal(repr(abs(value))).quantize(
        Decimal(1).scaleb(-decimals), rounding=ROUND_HALF_UP
    )
    text = format(rounded, "f")
    return f"-{text}" if rounded != 0 and value < 0 else text


def _display_record(stats: dict[str, float | None], decimals: int) -> dict[str, str | None]:
    return {
        key: None if value is None else display_round(value, decimals)
        for key, value in stats.items()
    }


# -- §5.3 stored bounds and §5.5 conversion ------------------------------------


def stored_bounds_from_decimal(minimum: str, maximum: str) -> tuple[int, int]:
    """Slip-mode stored bounds (§5.3), exactly from the canonical decimal
    strings: ``lo_s = ⌈min · 10^4⌉``, ``hi_s = ⌊max · 10^4⌋`` — the twin of
    `storedBoundsFromDecimal`, integer arithmetic, never a float."""
    lo = Fraction(canonical_decimal(minimum)) * SLIP_DECODE_DIVISOR
    hi = Fraction(canonical_decimal(maximum)) * SLIP_DECODE_DIVISOR
    return math.ceil(lo), math.floor(hi)


def _stored_bounds(lo: float, hi: float, scale: float = SLIP_RECORDING_STEP) -> tuple[int, int]:
    """Offset-mode stored bounds (§5.3), the twin of `storedBounds`:
    ``[⌈lo / scale − 1e-9⌉, ⌊hi / scale + 1e-9⌋]``, a −0 result as 0."""
    return (
        int(math.ceil(lo / scale - STORED_BOUNDS_GUARD)),
        int(math.floor(hi / scale + STORED_BOUNDS_GUARD)),
    )


def js_round(value: float) -> int:
    """ECMAScript ``Math.round``: the nearest integer, a tie toward +∞."""
    floor = math.floor(value)
    return int(floor + 1 if value - floor >= 0.5 else floor)


def range_flag(lo: float, hi: float, bounds_max: float, recording_step: float) -> str:
    """The stored-space range flag of §5.5."""
    lo_s, hi_s = _stored_bounds(lo, hi, recording_step)
    max_s = js_round(bounds_max / recording_step)
    if lo_s >= 0 and hi_s <= max_s:
        return "in_range"
    if hi_s < 0 or lo_s > max_s:
        return "out_of_range"
    return "partly_out"


def convert_windows(
    o_max: float, dips: Sequence[int], coefficients: Sequence[dict[str, object]]
) -> dict[int, tuple[float, float]]:
    """The back-projection of §5.5 for every given dip:
    ``window_lo = (0 − intercept) / slope`` and
    ``window_hi = (o_max − intercept) / slope`` in float64, as written."""
    rows = {int(row["fault_dip"]): row for row in coefficients}  # type: ignore[call-overload]
    windows: dict[int, tuple[float, float]] = {}
    for dip in dips:
        row = rows.get(int(dip))
        if row is None:
            raise ValueError(f"no coefficient row for fault_dip {dip}")
        slope = float(row["slope"])  # type: ignore[arg-type]
        intercept = float(row["intercept"])  # type: ignore[arg-type]
        if not slope > 0:
            raise ValueError(f"fault_dip {dip}: slope {slope!r} is not positive")
        lo = (0.0 - intercept) / slope
        hi = (o_max - intercept) / slope
        if not (math.isfinite(lo) and math.isfinite(hi)):
            raise ValueError(f"fault_dip {dip}: a converted window end is not finite")
        windows[int(dip)] = (lo, hi)
    return windows


def converted_window_records(
    windows: dict[int, tuple[float, float]], dips: Sequence[int], bounds: dict[str, float]
) -> list[dict[str, object]]:
    """A scenario entry's `converted_windows`: one record per selected dip,
    ascending, with its range flag and display strings."""
    records = []
    for dip in sorted(dips):
        lo, hi = windows[dip]
        records.append(
            {
                "fault_dip": int(dip),
                "window_lo": lo,
                "window_hi": hi,
                "range_flag": range_flag(lo, hi, bounds["max"], bounds["recording_step"]),
                "window_lo_display": display_round(lo, DISPLAY_DECIMALS["slip"]),
                "window_hi_display": display_round(hi, DISPLAY_DECIMALS["slip"]),
            }
        )
    return records


# -- The record table and the §5.3 selection ------------------------------------


@dataclass
class RecordTable:
    """A vintage's records as the generator reads them from the rows: in
    artifact order (trials ascending by code point, each trial's stages
    ascending by slip), with each record's `stage_index` its position in
    its trial's ascending-slip run, taken from the rows grouped by `Trial`."""

    trials: list[str]
    trial_dip: np.ndarray
    trial_pair: list[tuple[str, str]]
    trial_depth: np.ndarray
    trial_density: list[str]
    trial_index: np.ndarray
    stage_index: np.ndarray
    slip: np.ndarray
    slip_step: np.ndarray
    class_code: np.ndarray
    steps: dict[str, np.ndarray]
    valid: dict[str, np.ndarray]


def _recording_steps(name: str, values: np.ndarray, valid: np.ndarray, divisor: int) -> np.ndarray:
    """``s = round(v · D)`` with ``s / D == v`` asserted for every valid value
    (§3.6 step 1; rule `bitwise-restore`); 0 where the value is null."""
    steps = np.zeros(values.shape, dtype=np.int64)
    steps[valid] = np.rint(values[valid] * divisor).astype(np.int64)
    restored = steps[valid] / divisor
    if not np.array_equal(restored, values[valid]):
        bad = int(np.flatnonzero(restored != values[valid])[0])
        raise ExportFailure(
            "bitwise-restore",
            f"{name}: {float(values[valid][bad])!r} is not an exact multiple of 1/{divisor}",
        )
    return steps


def build_record_table(rows: pd.DataFrame) -> RecordTable:
    """The record table of a frame with the `dem` view's columns `Trial`,
    the site columns, and the stage columns (`STAGE_SOURCE_COLUMNS`)."""
    trial_ids = rows[TRIAL_SOURCE_COLUMN].tolist()
    if not all(isinstance(t, str) for t in trial_ids):
        raise ValueError("Trial holds a null or non-string value")
    trials = sorted(set(trial_ids))
    rank = {trial: i for i, trial in enumerate(trials)}
    trial_rank = np.fromiter((rank[t] for t in trial_ids), dtype=np.int64, count=len(trial_ids))
    slip_source = rows[STAGE_SOURCE_COLUMNS["slip"]].to_numpy(dtype=np.float64, na_value=np.nan)
    if np.isnan(slip_source).any():
        raise ValueError("Slip holds a null value")
    frame = rows.iloc[np.lexsort((slip_source, trial_rank))].reset_index(drop=True)
    stage_index = frame.groupby(TRIAL_SOURCE_COLUMN, sort=False).cumcount().to_numpy(np.int64)
    trial_index = np.fromiter(
        (rank[t] for t in frame[TRIAL_SOURCE_COLUMN].tolist()), dtype=np.int64, count=len(frame)
    )

    first = frame.groupby(TRIAL_SOURCE_COLUMN, sort=False).head(1).reset_index(drop=True)
    columns = TRIAL_SOURCE_COLUMNS
    slip = frame[STAGE_SOURCE_COLUMNS["slip"]].to_numpy(dtype=np.float64)
    codes, _ = _encode_classes(frame[STAGE_SOURCE_COLUMNS["scarp_class"]])
    steps: dict[str, np.ndarray] = {}
    valid: dict[str, np.ndarray] = {}
    for m in MEASUREMENTS:
        values = frame[MEASUREMENT_SOURCE_COLUMNS[m]].to_numpy(dtype=np.float64, na_value=np.nan)
        valid[m] = ~np.isnan(values)
        if not np.isfinite(values[valid[m]]).all():
            raise ValueError(f"{MEASUREMENT_SOURCE_COLUMNS[m]} holds an infinite value")
        steps[m] = _recording_steps(
            MEASUREMENT_SOURCE_COLUMNS[m], values, valid[m], MEASUREMENT_DIVISOR
        )
    return RecordTable(
        trials=trials,
        trial_dip=np.array(
            [_trial_value("fault_dip", v) for v in first[columns["fault_dip"]].tolist()],
            dtype=np.int64,
        ),
        trial_pair=list(
            zip(
                [_trial_value("set", v) for v in first[columns["set"]].tolist()],
                [
                    _trial_value("sediment_strength", v)
                    for v in first[columns["sediment_strength"]].tolist()
                ],
                strict=True,
            )
        ),  # type: ignore[arg-type]
        trial_depth=np.array(
            [_trial_value("depth", v) for v in first[columns["depth"]].tolist()], dtype=np.int64
        ),
        trial_density=[_trial_value("density", v) for v in first[columns["density"]].tolist()],  # type: ignore[misc]
        trial_index=trial_index,
        stage_index=stage_index,
        slip=slip,
        slip_step=_recording_steps(
            "Slip", slip, np.ones(slip.shape, dtype=bool), SLIP_DECODE_DIVISOR
        ),
        class_code=codes.astype(np.int64),
        steps=steps,
        valid=valid,
    )


def select(
    table: RecordTable,
    inputs: dict[str, object],
    windows: dict[int, tuple[float, float]] | None,
) -> np.ndarray:
    """The §5.3 selection, in its order (§3.6 step 8): the trial conditions;
    the window, comparing each record's slip step with the inclusive stored
    bounds; the DR-3 one-state rule; only then the scarp-type filter.
    Returns the selected records' positions in artifact order.

    ``windows`` holds every dip's converted window in offset mode — every
    dip the selection masks in must have one — and is None otherwise."""
    dips = set(inputs["fault_dip"])  # type: ignore[call-overload]
    pairs = {(s["set"], s["sediment_strength"]) for s in inputs["sediment"]}  # type: ignore[attr-defined, index]
    depths = set(inputs["depth"])  # type: ignore[call-overload]
    densities = set(inputs["density"])  # type: ignore[call-overload]
    trial_in = np.array(
        [
            int(table.trial_dip[t]) in dips
            and table.trial_pair[t] in pairs
            and int(table.trial_depth[t]) in depths
            and table.trial_density[t] in densities
            for t in range(len(table.trials))
        ],
        dtype=bool,
    )
    candidate = trial_in[table.trial_index]
    window_active = False
    if inputs["entry_mode"] == "offset":
        if windows is None:
            raise ValueError("offset mode needs per-dip windows")
        window_active = True
        lo_t = np.zeros(len(table.trials), dtype=np.int64)
        hi_t = np.full(len(table.trials), -1, dtype=np.int64)
        for t in np.flatnonzero(trial_in):
            dip = int(table.trial_dip[t])
            if dip not in windows:
                raise ValueError(f"no window for masked-in fault_dip {dip}")
            lo_t[t], hi_t[t] = _stored_bounds(*windows[dip])
        lo_r, hi_r = lo_t[table.trial_index], hi_t[table.trial_index]
        candidate &= (table.slip_step >= lo_r) & (table.slip_step <= hi_r)
    elif inputs["slip_window"] is not None:
        if windows is not None:
            raise ValueError("slip mode takes no per-dip windows")
        window_active = True
        bounds: dict = inputs["slip_window"]  # type: ignore[assignment]
        lo_s, hi_s = stored_bounds_from_decimal(bounds["min"], bounds["max"])
        candidate &= (table.slip_step >= lo_s) & (table.slip_step <= hi_s)
    chosen = np.flatnonzero(candidate)
    if inputs["population"] == "one_state_per_trial" and chosen.size:
        # Per trial, the last candidate: the highest slip within the window,
        # or with no active window the trial's final recorded state.
        trial_of = table.trial_index[chosen]
        last = np.append(trial_of[1:] != trial_of[:-1], True)
        chosen = chosen[last]
        if not window_active:
            final = np.append(table.trial_index[1:] != table.trial_index[:-1], True)
            if not final[chosen].all():
                raise AssertionError("one-state without a window picked a non-final stage")
    if list(inputs["scarp_class"]) != list(SCARP_CLASSES):  # type: ignore[call-overload]
        allowed = [SCARP_CLASSES.index(c) for c in inputs["scarp_class"]]  # type: ignore[attr-defined]
        chosen = chosen[np.isin(table.class_code[chosen], allowed)]
    return chosen


def selection_counts(table: RecordTable, chosen: np.ndarray) -> dict[str, object]:
    """`counts` of §3.6: matching, unclassified, and the two-count model."""
    matching = int(chosen.size)
    per_measurement = {}
    for m in MEASUREMENTS:
        valid = int(table.valid[m][chosen].sum())
        per_measurement[m] = {"valid": valid, "excluded_null": matching - valid}
    return {
        "matching_records": matching,
        "unclassified": int((table.class_code[chosen] == UNCLASSIFIED).sum()),
        "per_measurement": per_measurement,
    }


def selection_identities(table: RecordTable, chosen: np.ndarray) -> list[list[object]]:
    """`[trial, stage_index, class_code]` per selected record, artifact order."""
    return [
        [
            table.trials[int(table.trial_index[i])],
            int(table.stage_index[i]),
            int(table.class_code[i]),
        ]
        for i in chosen
    ]


def selection_record(table: RecordTable, chosen: np.ndarray) -> dict[str, object]:
    """`selection` of §3.6: identities up to 10,000 records, otherwise the
    SHA-256 signature of the `trial;stage_index;class_code` lines."""
    identities = selection_identities(table, chosen)
    if len(identities) <= IDENTITY_LIMIT:
        return {"identities": identities}
    text = "\n".join(f"{trial};{stage};{code}" for trial, stage, code in identities)
    return {"signature": sha256_hex(text.encode("utf-8")), "count": len(identities)}


def measurement_values(
    table: RecordTable, chosen: np.ndarray, m: str
) -> tuple[list[int], list[int]]:
    """The valid recording steps and class codes of measurement m among the
    selected records, artifact order."""
    kept = chosen[table.valid[m][chosen]]
    return [int(s) for s in table.steps[m][kept]], [int(c) for c in table.class_code[kept]]


def _window_key(inputs: dict[str, object]) -> tuple[object, ...]:
    return (inputs["entry_mode"], canonical_json(inputs["slip_window"]), inputs["offset_max"])


def diagnosed_conditions(
    table: RecordTable,
    inputs: dict[str, object],
    windows: dict[int, tuple[float, float]] | None,
    default: dict[str, object],
) -> list[str]:
    """The empty-result diagnostic of §5.3: each condition group whose value
    differs from its default, reset alone to its default; the groups whose
    relaxation yields matches, in the fixed order. The population is never
    relaxed; the window relaxes to the inactive slip-mode window."""
    found = []
    for key, members in CONDITION_GROUPS:
        if key == "window":
            differs = _window_key(inputs) != _window_key(default)
        else:
            differs = inputs[key] != default[key]
        if not differs:
            continue
        relaxed = dict(inputs)
        for member in members:
            relaxed[member] = default[member]
        relaxed_windows = None if key == "window" else windows
        if select(table, relaxed, relaxed_windows).size:
            found.append(key)
    return found


def _measurement_statistics(
    table: RecordTable, chosen: np.ndarray
) -> dict[str, tuple[dict[str, float | None] | None, list[float], list[int], list[int]]]:
    out = {}
    for m in MEASUREMENTS:
        steps, classes = measurement_values(table, chosen, m)
        stats, x = summarize(steps, MEASUREMENT_DIVISOR)
        out[m] = (stats, x, steps, classes)
    return out


# -- The envelope's parts ----------------------------------------------------------


@dataclass
class ReferenceVintage:
    """What the generator reads of the vintage: the record table from the
    `dem` view's rows and the view-derived dictionaries, bounds, and
    regression coefficients."""

    table: RecordTable
    trial_columns: dict[str, list[object]]
    arm_strength_states: list[dict[str, str]]
    slip_window_bounds: dict[str, float]
    coefficients: list[dict[str, object]]

    @property
    def modeled_dips(self) -> list[int]:
        return [int(d) for d in self.trial_columns["fault_dip"]]  # type: ignore[call-overload]

    @property
    def density_order(self) -> list[str]:
        return [str(d) for d in self.trial_columns["density"]]

    def default_spec(self) -> dict[str, object]:
        """The default scenario of §5.6 from the vintage's dictionaries."""
        return {
            "fault_dip": self.modeled_dips,
            "sediment": [(p["set"], p["sediment_strength"]) for p in self.arm_strength_states],
            "depth": [int(d) for d in self.trial_columns["depth"]],  # type: ignore[call-overload]
            "density": self.density_order,
            "entry_mode": "slip",
            "slip_window": None,
            "offset_max": None,
            "population": "all_stages",
            "scarp_class": list(SCARP_CLASSES),
        }

    def canonical(self, spec: dict[str, object]) -> dict[str, object]:
        return _canonical_inputs(spec, self.density_order)

    def windows_for(self, inputs: dict[str, object]) -> dict[int, tuple[float, float]] | None:
        """Every modeled dip's converted window in offset mode (§5.3)."""
        if inputs["entry_mode"] != "offset":
            return None
        return convert_windows(float(inputs["offset_max"]), self.modeled_dips, self.coefficients)  # type: ignore[arg-type]


def scenario_entry(
    vintage: ReferenceVintage, gs_id: str, changes: dict[str, object]
) -> dict[str, object]:
    """One golden scenario's entry (§3.6, Scenario entry)."""
    default = vintage.canonical(vintage.default_spec())
    inputs = vintage.canonical({**vintage.default_spec(), **changes})
    windows = vintage.windows_for(inputs)
    table = vintage.table
    chosen = select(table, inputs, windows)
    counts = selection_counts(table, chosen)
    per_m = _measurement_statistics(table, chosen)
    statistics: dict[str, object] = {}
    percentile_map: dict[str, object] = {}
    histograms: dict[str, object] = {}
    display: dict[str, object] = {}
    for m in MEASUREMENTS:
        stats, x, steps, classes = per_m[m]
        statistics[m] = stats
        percentile_map[m] = percentiles(x) if stats is not None else None
        histograms[m] = histogram(steps, classes, x, DISPLAY_DECIMALS[m])
        display[m] = None if stats is None else _display_record(stats, DISPLAY_DECIMALS[m])
    _, _, dzw_steps, dzw_classes = per_m["dzw"]
    matching = counts["matching_records"]
    return {
        "id": gs_id,
        "inputs": inputs,
        "counts": counts,
        "statistics": statistics,
        "percentiles": percentile_map,
        "histogram": histograms,
        "histogram_log": {
            "dzw": histogram_log(
                dzw_steps, dzw_classes, LOG_SCALE_OFFER_RATIOS[LOG_SCALE_MIN_DECADES]
            )
        },
        "display": display,
        "selection": selection_record(table, chosen),
        "converted_windows": (
            None
            if windows is None
            else converted_window_records(
                windows,
                inputs["fault_dip"],  # type: ignore[arg-type]
                vintage.slip_window_bounds,
            )
        ),
        "diagnosed_conditions": (
            diagnosed_conditions(table, inputs, windows, default) if matching == 0 else None
        ),
    }


def _perturb(r: float, perturbation: str, slope: float, intercept: float) -> float:
    """The boundary-case endpoint of §3.6 for recorded slip r."""
    if perturbation == "exact":
        return r
    if perturbation == "ulp-":
        return math.nextafter(r, -math.inf)
    if perturbation == "ulp+":
        return math.nextafter(r, math.inf)
    if perturbation == "in-":
        return r - 1e-14
    if perturbation == "in+":
        return r + 1e-14
    if perturbation == "out-":
        return r - 1e-12
    if perturbation == "out+":
        return r + 1e-12
    if perturbation == "step-":
        return r - SLIP_RECORDING_STEP
    if perturbation == "step+":
        return r + SLIP_RECORDING_STEP
    if perturbation == "roundtrip":
        return ((r * slope + intercept) - intercept) / slope
    raise ValueError(perturbation)


def _boundary_record(
    case_id: str,
    base: str,
    inputs: dict[str, object],
    windows: dict[int, tuple[float, float]] | None,
    stored_bounds: dict[str, list[int]],
    table: RecordTable,
) -> dict[str, object]:
    chosen = select(table, inputs, windows)
    return {
        "id": case_id,
        "base": base,
        "inputs": inputs,
        "windows": (
            None
            if windows is None
            else {str(dip): {"lo": lo, "hi": hi} for dip, (lo, hi) in sorted(windows.items())}
        ),
        "expected": {
            "stored_bounds": stored_bounds,
            "counts": selection_counts(table, chosen),
            "selection": selection_record(table, chosen),
        },
    }


def boundary_cases(vintage: ReferenceVintage) -> list[dict[str, object]]:
    """The selection-boundary battery of §3.6: 80 offset-path cases on base
    GS-1 and 6 slip-path cases on bases GS-7 and GS-0."""
    golden = dict(GOLDEN_SCENARIOS)
    table = vintage.table
    rows = {int(row["fault_dip"]): row for row in vintage.coefficients}  # type: ignore[call-overload]
    cases: list[dict[str, object]] = []

    # Offset path: base GS-1, either population.
    for population, spelled in BOUNDARY_POPULATIONS:
        inputs = vintage.canonical(
            {**vintage.default_spec(), **golden["GS-1"], "population": population}
        )
        converted = vintage.windows_for(inputs)
        assert converted is not None
        chosen = select(table, inputs, converted)
        for dip in inputs["fault_dip"]:  # type: ignore[attr-defined]
            slips = table.slip[chosen[table.trial_dip[table.trial_index[chosen]] == dip]]
            lo, hi = converted[dip]
            slope = float(rows[dip]["slope"])  # type: ignore[arg-type]
            intercept = float(rows[dip]["intercept"])  # type: ignore[arg-type]
            for side in ("lo", "hi"):
                inside = slips[slips >= lo] if side == "lo" else slips[slips <= hi]
                if inside.size == 0:
                    raise ValueError(f"GS-1 selects no dip-{dip} slip inside its {side} end")
                r = float(inside.min() if side == "lo" else inside.max())
                for perturbation in BOUNDARY_PERTURBATIONS:
                    endpoint = _perturb(r, perturbation, slope, intercept)
                    windows = dict(converted)
                    windows[dip] = (endpoint, hi) if side == "lo" else (lo, endpoint)
                    stored = {str(d): list(_stored_bounds(*windows[d])) for d in sorted(windows)}
                    cases.append(
                        _boundary_record(
                            f"B-GS1-{spelled}-d{dip}-{side}-{perturbation}",
                            "GS-1",
                            inputs,
                            windows,
                            stored,
                            table,
                        )
                    )

    # Slip path: M the canonical decimal of slip_window_bounds.max; exact
    # decimal arithmetic on the endpoints.
    m_text = float_decimal(vintage.slip_window_bounds["max"])
    m = Decimal(m_text)

    def dec(value: Decimal) -> str:
        return canonical_decimal(format(value, "f"))

    slip_cases = (
        ("GS-7", "0", m_text),
        ("GS-7", "0", dec(m - Decimal("0.0001"))),
        ("GS-0", "0", m_text),
        ("GS-0", "0.0001", m_text),
        ("GS-7", "0.00005", dec(m - Decimal("0.00001"))),
        ("GS-0", "0.00005", dec(m - Decimal("0.00001"))),
    )
    for base, low, high in slip_cases:
        inputs = vintage.canonical(
            {**vintage.default_spec(), **golden[base], "slip_window": {"min": low, "max": high}}
        )
        bounds = list(stored_bounds_from_decimal(low, high))
        stored = {str(d): bounds for d in vintage.modeled_dips}
        cases.append(
            _boundary_record(
                f"B-{base.replace('-', '')}-slip-{low}-{high}", base, inputs, None, stored, table
            )
        )
    return cases


# -- Synthetic cases ------------------------------------------------------------


def _ensemble_frame(ensemble: dict[str, object]) -> pd.DataFrame:
    """The ensemble's declarative spec as rows in the `dem` view's columns:
    slip restored from 1e-4 m steps, the measurements from 1e-3 steps."""
    n = int(ensemble["stages_per_trial"])  # type: ignore[call-overload]
    trials: list[list[object]] = ensemble["trials"]  # type: ignore[assignment]
    stages: dict[str, list[object]] = ensemble["stages"]  # type: ignore[assignment]
    if any(len(values) != len(trials) * n for values in stages.values()):
        raise ValueError(f"{ensemble['id']}: a stage array is not len(trials) * N long")
    site = ("fault_dip", "sediment_strength", "cohesion", "set", "depth", "density")
    data: dict[str, list[object]] = {TRIAL_SOURCE_COLUMN: []}
    for column in site:
        data[TRIAL_SOURCE_COLUMNS[column]] = []
    for row in trials:
        for _ in range(n):
            data[TRIAL_SOURCE_COLUMN].append(row[0])
            for j, column in enumerate(site, start=1):
                data[TRIAL_SOURCE_COLUMNS[column]].append(row[j])
    data[STAGE_SOURCE_COLUMNS["slip"]] = [int(s) / SLIP_DECODE_DIVISOR for s in stages["slip"]]  # type: ignore[call-overload]
    for m in MEASUREMENTS:
        data[MEASUREMENT_SOURCE_COLUMNS[m]] = [
            np.nan if s is None else int(s) / MEASUREMENT_DIVISOR  # type: ignore[call-overload]
            for s in stages[m]
        ]
    data[STAGE_SOURCE_COLUMNS["scarp_class"]] = list(stages["scarp_class"])
    frame = pd.DataFrame(data)
    frame[STAGE_SOURCE_COLUMNS["scarp_class"]] = frame[STAGE_SOURCE_COLUMNS["scarp_class"]].astype(
        "object"
    )
    return frame


def synthetic_ensemble(ensemble: dict[str, object]) -> dict[str, object]:
    """One `synthetic.ensembles` record: the spec with each case's
    `expected` {`counts`, `selection`, `statistics`, `diagnosed_conditions`}
    and its `inputs` written by `canonical_scenario()`."""
    trials: list[list[object]] = ensemble["trials"]  # type: ignore[assignment]
    table = build_record_table(_ensemble_frame(ensemble))
    density_order = sorted({str(row[6]) for row in trials})
    default_spec = {
        "fault_dip": sorted({int(row[1]) for row in trials}),  # type: ignore[call-overload]
        "sediment": sorted({(str(row[4]), str(row[2])) for row in trials}),
        "depth": sorted({int(row[5]) for row in trials}),  # type: ignore[call-overload]
        "density": density_order,
        "entry_mode": "slip",
        "slip_window": None,
        "offset_max": None,
        "population": "all_stages",
        "scarp_class": list(SCARP_CLASSES),
    }
    default = _canonical_inputs(default_spec, density_order)
    cases = []
    for case in ensemble["cases"]:  # type: ignore[attr-defined]
        if not str(case["id"]).startswith(f"{ensemble['id']}-"):
            raise ValueError(f"case {case['id']} does not begin with {ensemble['id']}-")
        inputs = _canonical_inputs(case["inputs"], density_order)
        given = case["windows"]
        windows = (
            None
            if given is None
            else {int(dip): (float(w["lo"]), float(w["hi"])) for dip, w in given.items()}
        )
        chosen = select(table, inputs, windows)
        counts = selection_counts(table, chosen)
        stats = {
            m: summarize(measurement_values(table, chosen, m)[0], MEASUREMENT_DIVISOR)[0]
            for m in MEASUREMENTS
        }
        cases.append(
            {
                "id": case["id"],
                "inputs": inputs,
                "windows": given,
                "expected": {
                    "counts": counts,
                    "selection": {"identities": selection_identities(table, chosen)},
                    "statistics": stats,
                    "diagnosed_conditions": (
                        diagnosed_conditions(table, inputs, windows, default)
                        if counts["matching_records"] == 0
                        else None
                    ),
                },
            }
        )
    return {**ensemble, "cases": cases}


def synthetic_cases() -> dict[str, object]:
    """The `synthetic` record of §3.6 from `reference_cases.py`'s inputs."""
    offer_ratio = LOG_SCALE_OFFER_RATIOS[LOG_SCALE_MIN_DECADES]
    statistics = []
    for case in reference_cases.STATISTICS_CASES:
        divisor = {3: MEASUREMENT_DIVISOR, 4: SLIP_DECODE_DIVISOR}[int(case["decimals"])]  # type: ignore[call-overload]
        stats, x = summarize(case["steps"], divisor)  # type: ignore[arg-type]
        statistics.append(
            {
                **case,
                "expected": {
                    "statistics": stats,
                    "percentiles": percentiles(x) if stats is not None else None,
                },
            }
        )
    histograms = []
    for case in reference_cases.HISTOGRAM_CASES:
        steps: list[int] = case["steps"]  # type: ignore[assignment]
        codes: list[int] = case["class_codes"]  # type: ignore[assignment]
        dd = int(case["display_decimals"])  # type: ignore[call-overload]
        x = sorted(s / MEASUREMENT_DIVISOR for s in steps)
        histograms.append(
            {
                **case,
                "expected": {
                    "histogram": histogram(steps, codes, x, dd),
                    "histogram_log": histogram_log(steps, codes, offer_ratio) if dd == 1 else None,
                },
            }
        )
    rounding = [
        {
            "id": f"round-{decimals}-{value!r}",
            "value": value,
            "decimals": decimals,
            "expected": display_round(value, decimals),
        }
        for value, decimals in reference_cases.DISPLAY_ROUNDING_VECTORS
    ]
    conversion = []
    for case in reference_cases.CONVERSION_CASES:
        bounds: dict[str, float] = case["slip_window_bounds"]  # type: ignore[assignment]
        rows: list[dict[str, object]] = case["coefficients"]  # type: ignore[assignment]
        dips = [int(row["fault_dip"]) for row in rows]  # type: ignore[call-overload]
        windows = convert_windows(float(case["offset_max"]), dips, rows)  # type: ignore[arg-type]
        conversion.append(
            {
                **case,
                "expected": {"converted_windows": converted_window_records(windows, dips, bounds)},
            }
        )
    return {
        "ensembles": [synthetic_ensemble(e) for e in reference_cases.ensembles()],
        "statistics": statistics,
        "histograms": histograms,
        "display_rounding": rounding,
        "conversion": conversion,
    }


def assert_finite_reference_values(obj: object, path: str = "references") -> None:
    """Rule `finite-reference-values` (§3.6 step 9): `math.isfinite` on every
    number the generator writes. An assertion inside the generator: no `ok`
    line; on failure `finite-reference-values: FAILED — <detail>`."""
    if isinstance(obj, bool) or obj is None or isinstance(obj, str):
        return
    if isinstance(obj, int | float):
        if not math.isfinite(obj):
            raise ExportFailure("finite-reference-values", f"{path} is {obj!r}")
        return
    if isinstance(obj, dict):
        for key, value in obj.items():
            assert_finite_reference_values(value, f"{path}.{key}")
        return
    if isinstance(obj, list | tuple):
        for i, value in enumerate(obj):
            assert_finite_reference_values(value, f"{path}[{i}]")
        return
    raise ExportFailure(
        "finite-reference-values",
        f"{path} holds a {type(obj).__name__}, not a JSON value",
    )


def build_reference_results(
    envelope: dict[str, object], vintage: ReferenceVintage
) -> dict[str, object]:
    """The reference-results object of §3.6, computed from the pipeline
    views, never from the decoded artifact, with every number asserted
    finite."""
    references = {
        **envelope,
        "reference_version": envelope["export_version"],
        "display_decimals": dict(DISPLAY_DECIMALS),
        "log_scale_min_decades": LOG_SCALE_MIN_DECADES,
        "scenarios": [
            scenario_entry(vintage, gs_id, changes) for gs_id, changes in GOLDEN_SCENARIOS
        ],
        "boundary_cases": boundary_cases(vintage),
        "synthetic": synthetic_cases(),
    }
    assert_finite_reference_values(references)
    return references


# --------------------------------------------------------------------------
# Vintage file names (§4.1 step 2)
# --------------------------------------------------------------------------

#: One name pattern per role: `<prefix><h12><suffix>`.
ROLE_PATTERNS: dict[str, tuple[str, str]] = {
    "scenario_artifact": ("scenario-", ".bin.gz"),
    "manifest": ("manifest-", ".json"),
    "field_export": ("field-", ".json.gz"),
    "regression_export": ("regression-", ".json.gz"),
    "reference_results": ("references-", ".json.gz"),
    "data_terms": ("data-terms-", ".txt"),
    "media_index": ("media-", ".json"),
}


def vintage_name(role: str, data: bytes) -> str:
    """The content-hashed name of a vintage file over its exact bytes."""
    prefix, suffix = ROLE_PATTERNS[role]
    return f"{prefix}{sha256_hex(data)[:12]}{suffix}"


def write_vintage_file(out_dir: Path, role: str, data: bytes, written: dict[str, str]) -> str:
    """Write one vintage file under its content-hashed name, recording its
    SHA-256 in ``written`` (name -> SHA-256)."""
    name = vintage_name(role, data)
    (out_dir / name).write_bytes(data)
    written[name] = sha256_hex(data)
    return name


# --------------------------------------------------------------------------
# Closed format specs (§3 "Closed specs"; rules `format-spec` and
# `dd10-names` of §4.1 step 5)
# --------------------------------------------------------------------------

#: The thirteen pipeline-column names of the DD-10 closure note: every name
#: that denotes a pipeline column is one of them (rule `dd10-names`).
DD10_COLUMN_NAMES: frozenset[str] = frozenset(
    {
        "trial",
        "fault_dip",
        "sediment_strength",
        "cohesion",
        "set",
        "depth",
        "density",
        "slip",
        "scarp_height",
        "dzw",
        "scarp_dip",
        "scarp_class",
        "us_ud",
    }
)


class SpecError(Exception):
    """A JSON value breaks its closed spec: ``path`` locates it."""

    def __init__(self, path: str, message: str) -> None:
        super().__init__(f"{path}: {message}")


def _json_type(value: object) -> str:
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "bool"
    if isinstance(value, int):
        return "int"
    if isinstance(value, float):
        return "number"
    if isinstance(value, str):
        return "string"
    if isinstance(value, list):
        return "array"
    if isinstance(value, dict):
        return "object"
    return type(value).__name__


class Spec:
    """One node of a closed format spec. ``check`` raises :class:`SpecError`
    on the first member that breaks it; ``column_names`` yields every name
    the node marks as denoting a pipeline column, with its path, from a
    value that passed ``check``."""

    def check(self, value: object, path: str) -> None:
        raise NotImplementedError

    def column_names(self, value: object, path: str) -> Iterator[tuple[str, str]]:
        return iter(())


class IntSpec(Spec):
    """A JSON integer (no fraction, no exponent), optionally one value."""

    def __init__(self, const: int | None = None) -> None:
        self.const = const

    def check(self, value: object, path: str) -> None:
        if isinstance(value, bool) or not isinstance(value, int):
            raise SpecError(path, f"expected an integer, found {_json_type(value)}")
        if self.const is not None and value != self.const:
            raise SpecError(path, f"expected {self.const}, found {value}")


class NumSpec(Spec):
    """A finite number."""

    def check(self, value: object, path: str) -> None:
        if isinstance(value, bool) or not isinstance(value, int | float):
            raise SpecError(path, f"expected a number, found {_json_type(value)}")
        if not math.isfinite(value):
            raise SpecError(path, f"{value!r} is not finite")


class BoolSpec(Spec):
    def check(self, value: object, path: str) -> None:
        if not isinstance(value, bool):
            raise SpecError(path, f"expected a bool, found {_json_type(value)}")


class StrSpec(Spec):
    """A string, optionally of a format (``pattern``, matched in full) or
    one of ``values``; ``column`` marks a value that denotes a pipeline
    column."""

    def __init__(
        self,
        pattern: str | None = None,
        values: Sequence[str] | None = None,
        *,
        column: bool = False,
    ) -> None:
        self.pattern = re.compile(pattern) if pattern is not None else None
        self.values = tuple(values) if values is not None else None
        self.column = column

    def check(self, value: object, path: str) -> None:
        if not isinstance(value, str):
            raise SpecError(path, f"expected a string, found {_json_type(value)}")
        if self.pattern is not None and self.pattern.fullmatch(value) is None:
            raise SpecError(path, f"{value!r} does not match ^{self.pattern.pattern}$")
        if self.values is not None and value not in self.values:
            raise SpecError(path, f"{value!r} is not one of {list(self.values)}")

    def column_names(self, value: object, path: str) -> Iterator[tuple[str, str]]:
        if self.column:
            yield path, str(value)


class NullableSpec(Spec):
    """Its inner spec's type "or null"."""

    def __init__(self, inner: Spec) -> None:
        self.inner = inner

    def check(self, value: object, path: str) -> None:
        if value is not None:
            self.inner.check(value, path)

    def column_names(self, value: object, path: str) -> Iterator[tuple[str, str]]:
        if value is not None:
            yield from self.inner.column_names(value, path)


class ArraySpec(Spec):
    """An array of one item spec, optionally of a fixed length."""

    def __init__(self, item: Spec, length: int | None = None) -> None:
        self.item = item
        self.length = length

    def check(self, value: object, path: str) -> None:
        if not isinstance(value, list):
            raise SpecError(path, f"expected an array, found {_json_type(value)}")
        if self.length is not None and len(value) != self.length:
            raise SpecError(path, f"expected {self.length} items, found {len(value)}")
        for i, item in enumerate(value):
            self.item.check(item, f"{path}[{i}]")

    def column_names(self, value: object, path: str) -> Iterator[tuple[str, str]]:
        for i, item in enumerate(value):  # type: ignore[arg-type]
            yield from self.item.column_names(item, f"{path}[{i}]")


class TupleSpec(Spec):
    """An array with one spec per position."""

    def __init__(self, *items: Spec) -> None:
        self.items = items

    def check(self, value: object, path: str) -> None:
        if not isinstance(value, list):
            raise SpecError(path, f"expected an array, found {_json_type(value)}")
        if len(value) != len(self.items):
            raise SpecError(path, f"expected {len(self.items)} items, found {len(value)}")
        for i, (item, spec) in enumerate(zip(value, self.items, strict=True)):
            spec.check(item, f"{path}[{i}]")

    def column_names(self, value: object, path: str) -> Iterator[tuple[str, str]]:
        for i, (item, spec) in enumerate(zip(value, self.items, strict=True)):  # type: ignore[call-overload]
            yield from spec.column_names(item, f"{path}[{i}]")


class RecordSpec(Spec):
    """A record whose keys are exactly ``fields`` — no required member
    missing, no unknown member — plus any of ``optional`` and any key
    matching ``extra`` (a pattern with its value spec). ``column_fields``
    are the member names that denote pipeline columns."""

    def __init__(
        self,
        fields: dict[str, Spec],
        *,
        optional: dict[str, Spec] | None = None,
        extra: tuple[str, Spec] | None = None,
        column_fields: Sequence[str] = (),
    ) -> None:
        self.fields = fields
        self.optional = optional or {}
        self.extra = (re.compile(extra[0]), extra[1]) if extra is not None else None
        self.column_fields = tuple(column_fields)

    def _spec_of(self, key: str) -> Spec | None:
        if key in self.fields:
            return self.fields[key]
        if key in self.optional:
            return self.optional[key]
        if self.extra is not None and self.extra[0].fullmatch(key):
            return self.extra[1]
        return None

    def check(self, value: object, path: str) -> None:
        if not isinstance(value, dict):
            raise SpecError(path, f"expected an object, found {_json_type(value)}")
        missing = [key for key in self.fields if key not in value]
        if missing:
            raise SpecError(path, f"required member {missing[0]!r} is missing")
        for key, item in value.items():
            spec = self._spec_of(key)
            if spec is None:
                raise SpecError(path, f"unknown member {key!r}")
            spec.check(item, f"{path}.{key}")

    def column_names(self, value: object, path: str) -> Iterator[tuple[str, str]]:
        for name in self.column_fields:
            yield f"{path} member", name
        for key, item in value.items():  # type: ignore[attr-defined]
            yield from self._spec_of(key).column_names(item, f"{path}.{key}")  # type: ignore[union-attr]


class MapSpec(Spec):
    """A map keyed by data values: exactly ``keys`` when given, else any key
    matching ``key_pattern`` (any string when None), each value of
    ``value`` — or, with ``values``, of its key's own spec. ``columns``
    marks keys that denote pipeline columns, but those in ``not_columns``."""

    def __init__(
        self,
        value: Spec | None = None,
        *,
        keys: Sequence[str] | None = None,
        values: dict[str, Spec] | None = None,
        key_pattern: str | None = None,
        columns: bool = False,
        not_columns: Sequence[str] = (),
    ) -> None:
        if values is not None:
            keys = tuple(values)
        self.value = value
        self.values = values
        self.keys = tuple(keys) if keys is not None else None
        self.key_pattern = re.compile(key_pattern) if key_pattern is not None else None
        self.columns = columns
        self.not_columns = tuple(not_columns)

    def _spec_of(self, key: str) -> Spec:
        return self.values[key] if self.values is not None else self.value  # type: ignore[return-value]

    def check(self, value: object, path: str) -> None:
        if not isinstance(value, dict):
            raise SpecError(path, f"expected an object, found {_json_type(value)}")
        if self.keys is not None and set(value) != set(self.keys):
            raise SpecError(path, f"keys {sorted(value)} are not exactly {sorted(self.keys)}")
        for key, item in value.items():
            if self.key_pattern is not None and self.key_pattern.fullmatch(key) is None:
                raise SpecError(path, f"key {key!r} does not match ^{self.key_pattern.pattern}$")
            self._spec_of(key).check(item, f"{path}.{key}")

    def column_names(self, value: object, path: str) -> Iterator[tuple[str, str]]:
        for key, item in value.items():  # type: ignore[attr-defined]
            if self.columns and key not in self.not_columns:
                yield f"{path} key", key
            yield from self._spec_of(key).column_names(item, f"{path}.{key}")


class OneOfSpec(Spec):
    """Exactly one of several record shapes."""

    def __init__(self, *options: Spec) -> None:
        self.options = options

    def _matching(self, value: object, path: str) -> list[Spec]:
        matching = []
        for option in self.options:
            try:
                option.check(value, path)
            except SpecError:
                continue
            matching.append(option)
        return matching

    def check(self, value: object, path: str) -> None:
        matching = self._matching(value, path)
        if len(matching) != 1:
            raise SpecError(
                path, f"matches {len(matching)} of its {len(self.options)} shapes, not 1"
            )

    def column_names(self, value: object, path: str) -> Iterator[tuple[str, str]]:
        yield from self._matching(value, path)[0].column_names(value, path)


def _name_pattern(role: str) -> str:
    prefix, suffix = ROLE_PATTERNS[role]
    return re.escape(prefix) + "[0-9a-f]{12}" + re.escape(suffix)


_TAG = StrSpec(DATA_TAG_PATTERN.pattern)
_DATE = StrSpec(r"[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z")
_SHA256 = StrSpec(r"[0-9a-f]{64}")
_INT = IntSpec()
_NUM = NumSpec()
_STR = StrSpec()
#: A canonical decimal of grammar G (§5.7): no leading zero but a lone 0,
#: no trailing fraction zero, a point only before digits.
_DECIMAL = StrSpec(r"(0|[1-9][0-9]*)(\.[0-9]*[1-9])?")
#: A dip written as a decimal string, as a map key.
_DIP_KEY = r"0|[1-9][0-9]*"

#: The envelope members every JSON export shares (§3.2, §3.4, §3.5, §3.7).
_ENVELOPE: dict[str, Spec] = {
    "schema_version": IntSpec(SCHEMA_VERSION),
    "export_version": _TAG,
    "export_date": _DATE,
    "pipeline_version": _STR,
}

PROVENANCE_SPEC = RecordSpec(
    {
        "source_commit": StrSpec(r"[0-9a-f]{40}"),
        "source_tree_clean": BoolSpec(),
        "inputs": ArraySpec(RecordSpec({"path": _STR, "sha256": _SHA256, "bytes": _INT})),
        "environment": RecordSpec(
            {
                key: _STR
                for key in ("python", "duckdb", "numpy", "pandas", "pyarrow", "zlib", "platform")
            }
        ),
        "compression": RecordSpec(
            {
                "format": StrSpec(values=("gzip",)),
                "call": StrSpec(values=("gzip.compress",)),
                "compresslevel": IntSpec(9),
                "mtime": IntSpec(0),
            }
        ),
    }
)

_COLUMN_RECORD = RecordSpec(
    {
        "encoding": StrSpec(values=("scaled", "dict", "code")),
        "decimals": NullableSpec(_INT),
        "offset_steps": NullableSpec(_INT),
        "scale": NullableSpec(_NUM),
        "offset": NullableSpec(_NUM),
        "physical_min": NullableSpec(_NUM),
        "physical_max": NullableSpec(_NUM),
        "recording_step": NullableSpec(_NUM),
        "null_sentinel": _INT,
        "null_count": _INT,
    }
)

#: The artifact manifest (§3.2).
MANIFEST_SPEC = RecordSpec(
    {
        **_ENVELOPE,
        "provenance": PROVENANCE_SPEC,
        "counts": RecordSpec({"records": _INT, "trials": _INT, "stages_per_trial": _INT}),
        "blocks": MapSpec(
            values={
                name: RecordSpec(
                    {"offset": _INT, "length": _INT, "dtype": StrSpec(values=(dtype,))}
                )
                for name, dtype in BLOCK_DTYPES.items()
            }
        ),
        "columns": MapSpec(_COLUMN_RECORD, keys=tuple(STAGE_SOURCE_COLUMNS), columns=True),
        "trial_columns": MapSpec(
            values={
                column: ArraySpec(_INT if column in INTEGER_TRIAL_COLUMNS else _STR)
                for column in TRIAL_TABLE_COLUMNS
            },
            columns=True,
            # The reserved trial-table column (§3.1) has no pipeline column.
            not_columns=("model_family",),
        ),
        "arm_strength_states": ArraySpec(
            RecordSpec(
                {"set": _STR, "sediment_strength": _STR},
                column_fields=("set", "sediment_strength"),
            )
        ),
        "scarp_classes": ArraySpec(_STR),
        "scarp_class_palette": MapSpec(StrSpec(r"#[0-9a-f]{6}"), keys=SCARP_CLASSES),
        "trials": ArraySpec(_STR),
        "stage_spacing": RecordSpec({"min": _NUM, "max": _NUM, "mean": _NUM}),
        "slip_window_bounds": RecordSpec({"min": _NUM, "max": _NUM, "recording_step": _NUM}),
        "files": RecordSpec(
            {
                "scenario_artifact": StrSpec(_name_pattern("scenario_artifact")),
                "field_export": StrSpec(_name_pattern("field_export")),
                "regression_export": StrSpec(_name_pattern("regression_export")),
            },
            optional={"media_index": StrSpec(_name_pattern("media_index"))},
            extra=(r"scenario_artifact_[a-z0-9]+", StrSpec(_name_pattern("scenario_artifact"))),
        ),
        "reference_results_version": _TAG,
        "checksums": MapSpec(_SHA256),
    }
)

#: The pointer manifest (§3.3).
POINTER_SPEC = RecordSpec(
    {
        "schema_version": IntSpec(SCHEMA_VERSION),
        "data_tag": _TAG,
        "export_version": _TAG,
        "export_date": _DATE,
        "provenance": PROVENANCE_SPEC,
        "files": MapSpec(_SHA256),
    }
)

#: The field-data export (§3.4).
FIELD_EXPORT_SPEC = RecordSpec(
    {
        **_ENVELOPE,
        "rows": ArraySpec(
            RecordSpec(
                {
                    "source": StrSpec(values=("FDHI", "SURE", "Kern")),
                    "eq_name": _STR,
                    "magnitude": NullableSpec(_NUM),
                    "analogue": StrSpec(values=("scarp_height", "dzw"), column=True),
                    "source_quantity": StrSpec(
                        values=(
                            "vs_central_meters",
                            "SH",
                            "Vertical",
                            "fzw_central_meters",
                            "FNC",
                            "DZW",
                        )
                    ),
                    "value": _NUM,
                    "limited_comparison": BoolSpec(),
                    "criterion_sub50": StrSpec(values=("met", "not_met", "not_applicable")),
                    "labeled_set": BoolSpec(),
                    "kern_field_group": NullableSpec(_STR),
                }
            )
        ),
    }
)

_TEXT_VARIABLE = RecordSpec({"name": _STR, "description": _STR, "unit": _STR})

#: The regression export (§3.5).
REGRESSION_EXPORT_SPEC = RecordSpec(
    {
        **_ENVELOPE,
        "relationship": RecordSpec(
            {
                "y": _TEXT_VARIABLE,
                "x": _TEXT_VARIABLE,
                "form": _STR,
                "fit": _STR,
                "back_projection": _STR,
            }
        ),
        "coefficients": ArraySpec(
            RecordSpec(
                {"fault_dip": _INT, "n": _INT, "slope": _NUM, "intercept": _NUM, "r2": _NUM},
                column_fields=("fault_dip",),
            )
        ),
    }
)

#: The canonical scenario object of DD-11 (§5.6), a §3.6 `inputs` record.
_SCENARIO_INPUTS = RecordSpec(
    {
        "fault_dip": ArraySpec(_INT),
        "sediment": ArraySpec(
            RecordSpec(
                {"set": _STR, "sediment_strength": _STR},
                column_fields=("set", "sediment_strength"),
            )
        ),
        "depth": ArraySpec(_INT),
        "density": ArraySpec(_STR),
        "entry_mode": StrSpec(values=("slip", "offset")),
        "slip_window": NullableSpec(RecordSpec({"min": _DECIMAL, "max": _DECIMAL})),
        "offset_max": NullableSpec(_DECIMAL),
        "population": StrSpec(values=("all_stages", "one_state_per_trial")),
        "scarp_class": ArraySpec(StrSpec(values=SCARP_CLASSES)),
    },
    column_fields=("fault_dip", "depth", "density", "scarp_class"),
)

_COUNTS = RecordSpec(
    {
        "matching_records": _INT,
        "unclassified": _INT,
        "per_measurement": MapSpec(
            RecordSpec({"valid": _INT, "excluded_null": _INT}), keys=MEASUREMENTS, columns=True
        ),
    }
)
_STATISTICS = RecordSpec(
    {
        **{key: _NUM for key in ("median", "p16", "p84", "min", "max", "mean")},
        "sd": NullableSpec(_NUM),
    }
)
_PERCENTILES = ArraySpec(_NUM, 101)
_CLASS_COUNTS = ArraySpec(_INT, len(SCARP_CLASSES))
_HISTOGRAM = RecordSpec(
    {
        "rule": StrSpec(values=("fd", "scott", "single")),
        "width_units": _INT,
        "first_edge": _INT,
        "bins": _INT,
        "counts": ArraySpec(_CLASS_COUNTS),
    }
)
_HISTOGRAM_LOG = RecordSpec(
    {
        "first_edge": _INT,
        "bins": _INT,
        "counts": ArraySpec(_CLASS_COUNTS),
        "below_counts": _CLASS_COUNTS,
    }
)
_DISPLAY = RecordSpec(
    {
        **{key: _STR for key in ("median", "p16", "p84", "min", "max", "mean")},
        "sd": NullableSpec(_STR),
    }
)
_IDENTITIES = RecordSpec({"identities": ArraySpec(TupleSpec(_STR, _INT, _INT))})
_SELECTION = OneOfSpec(_IDENTITIES, RecordSpec({"signature": _SHA256, "count": _INT}))
_CONVERTED_WINDOW = RecordSpec(
    {
        "fault_dip": _INT,
        "window_lo": _NUM,
        "window_hi": _NUM,
        "range_flag": StrSpec(values=("in_range", "partly_out", "out_of_range")),
        "window_lo_display": _STR,
        "window_hi_display": _STR,
    },
    column_fields=("fault_dip",),
)
_DIAGNOSED = NullableSpec(ArraySpec(StrSpec(values=tuple(key for key, _ in CONDITION_GROUPS))))
_STATISTICS_MAP = MapSpec(NullableSpec(_STATISTICS), keys=MEASUREMENTS, columns=True)
_WINDOWS = NullableSpec(MapSpec(RecordSpec({"lo": _NUM, "hi": _NUM}), key_pattern=_DIP_KEY))

_SCENARIO_ENTRY = RecordSpec(
    {
        "id": StrSpec(r"GS-[0-9]+"),
        "inputs": _SCENARIO_INPUTS,
        "counts": _COUNTS,
        "statistics": _STATISTICS_MAP,
        "percentiles": MapSpec(NullableSpec(_PERCENTILES), keys=MEASUREMENTS, columns=True),
        "histogram": MapSpec(NullableSpec(_HISTOGRAM), keys=MEASUREMENTS, columns=True),
        "histogram_log": MapSpec(NullableSpec(_HISTOGRAM_LOG), keys=("dzw",), columns=True),
        "display": MapSpec(NullableSpec(_DISPLAY), keys=MEASUREMENTS, columns=True),
        "selection": _SELECTION,
        "converted_windows": NullableSpec(ArraySpec(_CONVERTED_WINDOW)),
        "diagnosed_conditions": _DIAGNOSED,
    }
)

_BOUNDARY_CASE = RecordSpec(
    {
        "id": _STR,
        "base": StrSpec(values=("GS-0", "GS-1", "GS-7")),
        "inputs": _SCENARIO_INPUTS,
        "windows": _WINDOWS,
        "expected": RecordSpec(
            {
                "stored_bounds": MapSpec(TupleSpec(_INT, _INT), key_pattern=_DIP_KEY),
                "counts": _COUNTS,
                "selection": _SELECTION,
            }
        ),
    }
)

_ENSEMBLE = RecordSpec(
    {
        "id": _STR,
        "purpose": _STR,
        "stages_per_trial": _INT,
        "scarp_classes": ArraySpec(_STR),
        "trials": ArraySpec(TupleSpec(_STR, _INT, _STR, _STR, _STR, _INT, _STR)),
        "stages": MapSpec(
            values={
                "slip": ArraySpec(_INT),
                "scarp_height": ArraySpec(NullableSpec(_INT)),
                "dzw": ArraySpec(NullableSpec(_INT)),
                "scarp_dip": ArraySpec(NullableSpec(_INT)),
                "scarp_class": ArraySpec(NullableSpec(_STR)),
            },
            columns=True,
        ),
        "cases": ArraySpec(
            RecordSpec(
                {
                    "id": _STR,
                    "inputs": _SCENARIO_INPUTS,
                    "windows": _WINDOWS,
                    "expected": RecordSpec(
                        {
                            "counts": _COUNTS,
                            "selection": _IDENTITIES,
                            "statistics": _STATISTICS_MAP,
                            "diagnosed_conditions": _DIAGNOSED,
                        }
                    ),
                }
            )
        ),
    }
)

#: The reference results (§3.6).
REFERENCE_RESULTS_SPEC = RecordSpec(
    {
        **_ENVELOPE,
        "reference_version": _TAG,
        "display_decimals": MapSpec(
            _INT, keys=("slip", "scarp_height", "dzw", "scarp_dip"), columns=True
        ),
        "log_scale_min_decades": _INT,
        "scenarios": ArraySpec(_SCENARIO_ENTRY),
        "boundary_cases": ArraySpec(_BOUNDARY_CASE),
        "synthetic": RecordSpec(
            {
                "ensembles": ArraySpec(_ENSEMBLE),
                "statistics": ArraySpec(
                    RecordSpec(
                        {
                            "id": _STR,
                            "decimals": _INT,
                            "steps": ArraySpec(_INT),
                            "expected": RecordSpec(
                                {
                                    "statistics": NullableSpec(_STATISTICS),
                                    "percentiles": NullableSpec(_PERCENTILES),
                                }
                            ),
                        }
                    )
                ),
                "histograms": ArraySpec(
                    RecordSpec(
                        {
                            "id": _STR,
                            "display_decimals": _INT,
                            "steps": ArraySpec(_INT),
                            "class_codes": ArraySpec(_INT),
                            "expected": RecordSpec(
                                {
                                    "histogram": NullableSpec(_HISTOGRAM),
                                    "histogram_log": NullableSpec(_HISTOGRAM_LOG),
                                }
                            ),
                        }
                    )
                ),
                "display_rounding": ArraySpec(
                    RecordSpec({"id": _STR, "value": _NUM, "decimals": _INT, "expected": _STR})
                ),
                "conversion": ArraySpec(
                    RecordSpec(
                        {
                            "id": _STR,
                            "slip_window_bounds": RecordSpec({"max": _NUM, "recording_step": _NUM}),
                            "coefficients": ArraySpec(
                                RecordSpec(
                                    {"fault_dip": _INT, "slope": _NUM, "intercept": _NUM},
                                    column_fields=("fault_dip",),
                                )
                            ),
                            "offset_max": _DECIMAL,
                            "expected": RecordSpec(
                                {"converted_windows": ArraySpec(_CONVERTED_WINDOW)}
                            ),
                        }
                    )
                ),
            }
        ),
    }
)

#: The media index (§3.7), from P2; no MVP run writes one.
MEDIA_INDEX_SPEC = RecordSpec(
    {
        **_ENVELOPE,
        "entries": ArraySpec(
            RecordSpec(
                {
                    "id": _STR,
                    "kind": StrSpec(values=("animation", "photograph")),
                    "file": _STR,
                    "purpose": StrSpec(values=("morphology", "measurement", "offer")),
                    "scarp_class": NullableSpec(StrSpec(values=SCARP_CLASSES)),
                    "caption": _STR,
                    "attribution": _STR,
                    "permission": RecordSpec(
                        {
                            "status": StrSpec(values=("granted", "pending", "internal_only")),
                            "record": _STR,
                        }
                    ),
                    "available": BoolSpec(),
                },
                column_fields=("scarp_class",),
            )
        ),
    }
)

#: The closed spec of each JSON role.
FORMAT_SPECS: dict[str, Spec] = {
    "manifest": MANIFEST_SPEC,
    "field_export": FIELD_EXPORT_SPEC,
    "regression_export": REGRESSION_EXPORT_SPEC,
    "reference_results": REFERENCE_RESULTS_SPEC,
    "media_index": MEDIA_INDEX_SPEC,
    "pointer": POINTER_SPEC,
}


# --------------------------------------------------------------------------
# The run
# --------------------------------------------------------------------------


@dataclass
class RunContext:
    """What every step of one run needs."""

    root: Path
    data_tag: str
    export_date: str
    provenance: dict[str, object]
    out_dir: Path
    input_paths: list[str]
    """The nine data paths of step 1: discovered, or in a `--reproduce` run
    the pointer's recorded paths (rules `inputs-present` and `provenance`)."""
    given_pointer: dict[str, object] | None = None
    """The pointer a `--reproduce` run was given, against which steps 5 and
    6 apply the pointer rules (§4.3); None in an ordinary run."""

    def envelope(self) -> dict[str, object]:
        """The envelope members every JSON export shares (§3.2, §3.4, §3.5)."""
        return {
            "schema_version": SCHEMA_VERSION,
            "export_version": self.data_tag,
            "export_date": self.export_date,
            "pipeline_version": __version__,
        }


@dataclass
class Vintage:
    """What one run has written, by role."""

    pack: ScenarioPack
    files: dict[str, str]
    """Manifest `files` key -> written file name."""
    field_rows: list[dict[str, object]]
    coefficients: list[dict[str, object]]
    references: dict[str, object]
    """The reference-results object as the generator built it (§3.6)."""
    references_name: str
    """The reference-results file's name; the pointer names it, the
    artifact manifest does not (§3.3)."""
    written: dict[str, str]
    """Every file the run has written: name -> SHA-256 of its bytes."""
    manifest: dict[str, object] | None = None
    manifest_name: str | None = None
    terms_name: str | None = None
    reference_vintage: ReferenceVintage | None = None
    """What the reference generator read of the vintage (§3.6)."""


@contextlib.contextmanager
def run_private_views(root: Path) -> Iterator[duckdb.DuckDBPyConnection]:
    """The run's own DuckDB views (§4.1 step 1, Views), built in a temporary
    directory — never `dashboards/duckdb/eps.duckdb` — and open read-only
    for steps 2 and 3."""
    with tempfile.TemporaryDirectory() as tmp:
        duckdb_path = views.build_duckdb_views(
            processed_dir=root / "data" / "processed",
            duckdb_path=Path(tmp, "views.duckdb"),
        )
        con = duckdb.connect(str(duckdb_path), read_only=True)
        try:
            yield con
        finally:
            con.close()


def write_data_files(ctx: RunContext, con: duckdb.DuckDBPyConnection) -> Vintage:
    """§4.1 step 2: the data files, from the run-private views."""
    dem_columns = [TRIAL_SOURCE_COLUMN, *TRIAL_SOURCE_COLUMNS.values()]
    dem_columns += list(STAGE_SOURCE_COLUMNS.values())
    quoted = ", ".join(f'"{c}"' for c in dem_columns)
    dem = con.execute(f"SELECT {quoted} FROM dem").df()
    pack = pack_scenario(dem)
    field_rows = field_export_rows(con)
    coefficients = regression_coefficients(con)

    # The reference generator reads the view rows, never the decoded artifact.
    reference_vintage = ReferenceVintage(
        table=build_record_table(dem),
        trial_columns=pack.trial_columns,
        arm_strength_states=pack.arm_strength_states,
        slip_window_bounds=pack.slip_window_bounds,
        coefficients=coefficients,
    )
    references = build_reference_results(ctx.envelope(), reference_vintage)

    written: dict[str, str] = {}
    files = {
        "scenario_artifact": write_vintage_file(
            ctx.out_dir, "scenario_artifact", gzip_bytes(pack.artifact), written
        ),
        "field_export": write_vintage_file(
            ctx.out_dir,
            "field_export",
            gzip_bytes(canonical_json({**ctx.envelope(), "rows": field_rows})),
            written,
        ),
        "regression_export": write_vintage_file(
            ctx.out_dir,
            "regression_export",
            gzip_bytes(
                canonical_json(
                    {
                        **ctx.envelope(),
                        "relationship": REGRESSION_RELATIONSHIP,
                        "coefficients": coefficients,
                    }
                )
            ),
            written,
        ),
    }
    references_name = write_vintage_file(
        ctx.out_dir, "reference_results", gzip_bytes(canonical_json(references)), written
    )
    return Vintage(
        pack=pack,
        files=files,
        field_rows=field_rows,
        coefficients=coefficients,
        references=references,
        references_name=references_name,
        written=written,
        reference_vintage=reference_vintage,
    )


def build_manifest(ctx: RunContext, vintage: Vintage) -> dict[str, object]:
    """The artifact manifest of §3.2, from the run's measured decode
    information, carrying step 1's `provenance`."""
    pack = vintage.pack
    return {
        **ctx.envelope(),
        "provenance": ctx.provenance,
        "counts": pack.counts,
        "blocks": pack.blocks,
        "columns": pack.columns,
        "trial_columns": pack.trial_columns,
        "arm_strength_states": pack.arm_strength_states,
        "scarp_classes": pack.scarp_classes,
        "scarp_class_palette": {name: SCARP_CLASS_PALETTE[name] for name in SCARP_CLASSES},
        "trials": pack.trials,
        "stage_spacing": pack.stage_spacing,
        "slip_window_bounds": pack.slip_window_bounds,
        "files": dict(vintage.files),
        "reference_results_version": ctx.data_tag,
        "checksums": {name: vintage.written[name] for name in vintage.files.values()},
    }


def write_manifest_and_terms(ctx: RunContext, vintage: Vintage) -> None:
    """§4.1 step 4: the artifact manifest and the vintage-terms file, both
    uncompressed. The terms file is a byte-for-byte copy of
    `data/REDISTRIBUTION.md` or, for a `data-v0-test` run without that
    file, an empty file (§4.4, Vintage terms)."""
    vintage.manifest = build_manifest(ctx, vintage)
    vintage.manifest_name = write_vintage_file(
        ctx.out_dir, "manifest", canonical_json(vintage.manifest), vintage.written
    )
    terms_source = ctx.root / REDISTRIBUTION_PATH
    terms = terms_source.read_bytes() if terms_source.is_file() else b""
    vintage.terms_name = write_vintage_file(ctx.out_dir, "data_terms", terms, vintage.written)


def build_pointer(ctx: RunContext, vintage: Vintage) -> dict[str, object]:
    """The pointer manifest of §3.3: its `files` name exactly the files this
    run writes — the artifact manifest, every file the manifest names, the
    reference-results file, and the terms file."""
    return {
        "schema_version": SCHEMA_VERSION,
        "data_tag": ctx.data_tag,
        "export_version": ctx.data_tag,
        "export_date": ctx.export_date,
        "provenance": ctx.provenance,
        "files": dict(vintage.written),
    }


def checked_pointer(ctx: RunContext, vintage: Vintage) -> dict[str, object]:
    """The pointer that rules `format-spec` (step 5) and `pointer-exact` and
    `file-names` (step 6) check: the one the run builds in memory, or in a
    `--reproduce` run the one it was given (§4.3)."""
    if ctx.given_pointer is not None:
        return ctx.given_pointer
    return build_pointer(ctx, vintage)


def write_pointer(root: Path, pointer: dict[str, object]) -> None:
    """§4.1 step 6: write the working-tree pointer; the run never commits it."""
    path = root / POINTER_PATH
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(canonical_json(pointer))


# --------------------------------------------------------------------------
# Validation helpers
# --------------------------------------------------------------------------

#: The NumPy dtype of each manifest `dtype` (little-endian, §3).
NUMPY_DTYPES: dict[str, str] = {"uint8": "<u1", "uint16": "<u2", "int32": "<i4"}

#: The restore divisor of each `decimals` value, as integer literals — the
#: §3.1 restore rule's `10000` and `1000`, never ``10 **``.
RESTORE_DIVISORS: dict[int, int] = {4: 10000, 3: 1000}

#: The stage arrays, in physical block order (§3.1).
STAGE_BLOCKS: tuple[str, ...] = ("slip", "scarp_height", "dzw", "scarp_dip", "scarp_class")

#: The largest dip-dictionary magnitude, 180° in thousandths (§3.1).
DIP_DICTIONARY_LIMIT = 180_000

#: The stage arrays a null `scarp_class` requires null (§3.1, Unclassified
#: records).
UNCLASSIFIED_NULL_COLUMNS: tuple[str, ...] = ("scarp_height", "dzw", "scarp_dip")

#: File-name endings that MkDocs would render as a page (§4.1 step 6).
MARKDOWN_SUFFIXES: tuple[str, ...] = (".md", ".markdown", ".mdown", ".mkdn", ".mkd")


def decode_block(artifact: bytes, block: dict[str, object]) -> np.ndarray:
    """One block of a decompressed artifact as its little-endian dtype: the
    whole items within its declared `offset` and `length`."""
    dtype = np.dtype(NUMPY_DTYPES[str(block["dtype"])])
    start = int(block["offset"])  # type: ignore[call-overload]
    segment = artifact[start : start + int(block["length"])]  # type: ignore[call-overload]
    usable = len(segment) - len(segment) % dtype.itemsize
    return np.frombuffer(segment[:usable], dtype=dtype)


def read_json_file(path: Path) -> object:
    """A written JSON file, gunzipped first when it is a `.gz` file."""
    data = path.read_bytes()
    if path.name.endswith(".gz"):
        data = gzip.decompress(data)
    return json.loads(data.decode("utf-8"))


def first_difference(a: object, b: object, path: str) -> str | None:
    """Where two JSON values first differ, floats compared by
    `float.hex()` and every other leaf by type and value; None when equal."""
    if isinstance(a, float) or isinstance(b, float):
        if type(a) is float and type(b) is float and a.hex() == b.hex():
            return None
        shown = [x.hex() if isinstance(x, float) else repr(x) for x in (a, b)]
        return f"{path}: {shown[0]} against {shown[1]}"
    if isinstance(a, dict) and isinstance(b, dict):
        if list(a) != list(b) and set(a) != set(b):
            return f"{path}: members {sorted(a)} against {sorted(b)}"
        for key in a:
            found = first_difference(a[key], b[key], f"{path}.{key}")
            if found:
                return found
        return None
    if isinstance(a, list | tuple) and isinstance(b, list | tuple):
        if len(a) != len(b):
            return f"{path}: {len(a)} items against {len(b)}"
        for i, (x, y) in enumerate(zip(a, b, strict=True)):
            found = first_difference(x, y, f"{path}[{i}]")
            if found:
                return found
        return None
    if type(a) is type(b) and a == b:
        return None
    return f"{path}: {a!r} against {b!r}"


def _float_bits(values: np.ndarray) -> np.ndarray:
    """The IEEE 754 bit patterns of float64 values: equal bits are equal
    `float.hex()` strings."""
    return np.ascontiguousarray(values, dtype=np.float64).view(np.uint64)


@dataclass
class DecodedArtifact:
    """The written scenario artifact, gunzipped from disk and split into its
    blocks by a block map — the run's in-memory one (step 3) or the written
    manifest's (step 5)."""

    raw: bytes
    blocks: dict[str, np.ndarray]


def decode_written_artifact(path: Path, blocks: dict[str, dict[str, object]]) -> DecodedArtifact:
    raw = gzip.decompress(path.read_bytes())
    return DecodedArtifact(
        raw=raw, blocks={name: decode_block(raw, blocks[name]) for name in BLOCK_ORDER}
    )


# --------------------------------------------------------------------------
# Step 3: validate from in-memory decode information
# --------------------------------------------------------------------------


@dataclass
class StepThree:
    """What the step-3 rules read: the `dem` rows in artifact order, the
    measured counts, and the artifact decoded with the in-memory block map."""

    frame: pd.DataFrame
    trials: list[str]
    stages_per_trial: int
    records: int
    decoded: DecodedArtifact

    def where(self, record: int) -> str:
        n = self.stages_per_trial
        return f"Trial {self.trials[record // n]} stage {record % n}"


def rule_counts(vintage: Vintage, decoded: DecodedArtifact) -> StepThree:
    """Rule `counts`, step 3: measure the records, the trials, and every
    trial's count from the `dem` view; require the source checks of step 2
    and agreement with the written header and stage-array lengths."""
    frame = vintage.pack.frame
    trial_ids = frame[TRIAL_SOURCE_COLUMN].tolist()
    trials, n = check_source_counts(trial_ids)
    t_count, r_count = len(trials), len(trial_ids)
    header = decoded.raw[:HEADER_BYTES]
    if len(header) < HEADER_BYTES or header[:4] != MAGIC:
        raise ExportFailure("counts", f"the written artifact does not start with {MAGIC!r}")
    schema, header_records, header_trials = struct.unpack("<III", header[4:])
    if schema != SCHEMA_VERSION:
        raise ExportFailure("counts", f"the written header's schema version is {schema}")
    if header_records != r_count:
        raise ExportFailure(
            "counts", f"the written header counts {header_records} records, the view {r_count}"
        )
    if header_trials != t_count:
        raise ExportFailure(
            "counts", f"the written header counts {header_trials} trials, the view {t_count}"
        )
    for name in STAGE_BLOCKS:
        length = len(decoded.blocks[name])
        if length != r_count:
            raise ExportFailure(
                "counts", f"the written {name} array holds {length} entries, not {r_count} records"
            )
    return StepThree(
        frame=frame, trials=trials, stages_per_trial=n, records=r_count, decoded=decoded
    )


def rule_slip_order(s3: StepThree) -> None:
    """Rule `slip-order`: slip strictly ascends within every trial, with no
    ties."""
    x = s3.decoded.blocks["slip"].astype(np.int64) / RESTORE_DIVISORS[SCALED_COLUMNS["slip"][0]]
    per_trial = x.reshape(len(s3.trials), s3.stages_per_trial)
    bad = np.argwhere(~(np.diff(per_trial, axis=1) > 0))
    if bad.size:
        t, k = (int(v) for v in bad[0])
        raise ExportFailure(
            "slip-order",
            f"Trial {s3.trials[t]}: slip {float(per_trial[t, k + 1])!r} at stage {k + 1} "
            f"does not exceed {float(per_trial[t, k])!r} at stage {k}",
        )


def rule_site_constancy(s3: StepThree) -> None:
    """Rule `site-constancy`: the site conditions are constant within every
    trial."""
    grouped = s3.frame.groupby(TRIAL_SOURCE_COLUMN, sort=False)
    for column, source in TRIAL_SOURCE_COLUMNS.items():
        distinct = grouped[source].nunique(dropna=False)
        varying = [trial for trial in s3.trials if distinct[trial] != 1]
        if varying:
            raise ExportFailure(
                "site-constancy",
                f"Trial {varying[0]} has {distinct[varying[0]]} distinct {source} values "
                f"({column})",
            )


def rule_bitwise_restore(s3: StepThree, vintage: Vintage) -> None:
    """Rule `bitwise-restore`: every value decodes back to its source — a
    scaled or dictionary value, restored by the §3.1 restore rule, has the
    `float.hex()` of the view value it was packed from; a class code or a
    trial-table index maps back, through its dictionary, to the view's value
    (class code 255 to null).

    It compares every record where both the view and the artifact hold a
    value; where only one of them does, rule `sentinel-collision` (a view
    value stored as the null sentinel) or rule `null-counts` (a view null
    stored as a value) fails."""
    pack, frame, blocks = vintage.pack, s3.frame, s3.decoded.blocks
    for name, (decimals, offset_steps) in SCALED_COLUMNS.items():
        values, valid = _float_values(frame, STAGE_SOURCE_COLUMNS[name])
        stored = blocks[name].astype(np.int64)
        both = valid & (stored != UINT16_NULL)
        restored = (stored[both] + offset_steps) / RESTORE_DIVISORS[decimals]
        _require_restored(s3, name, values, both, restored)
    dip_values, dip_valid = _float_values(frame, STAGE_SOURCE_COLUMNS["scarp_dip"])
    dictionary = blocks["dip_dictionary"].astype(np.int64)
    indices = blocks["scarp_dip"].astype(np.int64)
    both = dip_valid & (indices != UINT16_NULL)
    beyond = np.flatnonzero(both & (indices >= len(dictionary)))
    if beyond.size:
        i = int(beyond[0])
        raise ExportFailure(
            "bitwise-restore",
            f"scarp_dip at {s3.where(i)}: index {indices[i]} is beyond the "
            f"{len(dictionary)}-entry dip dictionary",
        )
    restored = dictionary[indices[both]] / RESTORE_DIVISORS[DIP_DECIMALS]
    _require_restored(s3, "scarp_dip", dip_values, both, restored)

    codes = blocks["scarp_class"].tolist()
    view_classes = frame[STAGE_SOURCE_COLUMNS["scarp_class"]].tolist()
    for i, (code, value) in enumerate(zip(codes, view_classes, strict=True)):
        if code == UINT8_NULL or pd.isna(value):
            continue
        decoded = pack.scarp_classes[code] if code < len(pack.scarp_classes) else None
        if decoded != value:
            raise ExportFailure(
                "bitwise-restore",
                f"scarp_class at {s3.where(i)}: code {code} maps to {decoded!r}, "
                f"the view holds {value!r}",
            )

    t_count, n = len(s3.trials), s3.stages_per_trial
    cells = blocks["trial_table"]
    if len(cells) != t_count * len(TRIAL_TABLE_COLUMNS):
        raise ExportFailure(
            "bitwise-restore",
            f"the trial table holds {len(cells)} cells, not {t_count} trials x "
            f"{len(TRIAL_TABLE_COLUMNS)} columns",
        )
    table = cells.reshape(t_count, len(TRIAL_TABLE_COLUMNS))
    for j, column in enumerate(TRIAL_TABLE_COLUMNS):
        dictionary_values = pack.trial_columns[column]
        if column == "model_family":
            sources: list[object] = [None] * t_count
        else:
            first = frame[TRIAL_SOURCE_COLUMNS[column]].iloc[np.arange(t_count) * n].tolist()
            sources = [_trial_value(column, value) for value in first]
        for t in range(t_count):
            cell = int(table[t, j])
            if cell >= len(dictionary_values):
                raise ExportFailure(
                    "bitwise-restore",
                    f"trial table, Trial {s3.trials[t]}, {column}: index {cell} is beyond its "
                    f"{len(dictionary_values)}-entry dictionary",
                )
            if column != "model_family" and dictionary_values[cell] != sources[t]:
                raise ExportFailure(
                    "bitwise-restore",
                    f"trial table, Trial {s3.trials[t]}, {column}: index {cell} maps to "
                    f"{dictionary_values[cell]!r}, the view holds {sources[t]!r}",
                )


def _require_restored(
    s3: StepThree, name: str, values: np.ndarray, valid: np.ndarray, restored: np.ndarray
) -> None:
    source = values[valid]
    differ = np.flatnonzero(_float_bits(restored) != _float_bits(source))
    if differ.size:
        k = int(differ[0])
        i = int(np.flatnonzero(valid)[k])
        raise ExportFailure(
            "bitwise-restore",
            f"{name} at {s3.where(i)}: restores to {float(restored[k]).hex()}, packed from "
            f"{float(source[k]).hex()}",
        )


def _view_valid(frame: pd.DataFrame, name: str) -> np.ndarray:
    """Where the `dem` view holds a value of a stage column."""
    source = STAGE_SOURCE_COLUMNS[name]
    if name == "scarp_class":
        return frame[source].notna().to_numpy()
    return _float_values(frame, source)[1]


def _sentinel(name: str) -> int:
    return UINT8_NULL if BLOCK_DTYPES[name] == "uint8" else UINT16_NULL


def rule_sentinel_collision(s3: StepThree) -> None:
    """Rule `sentinel-collision`: no valid stored value — a `scarp_dip`
    dictionary index included — equals its column's null sentinel."""
    for name in STAGE_BLOCKS:
        valid = _view_valid(s3.frame, name)
        hit = np.flatnonzero(valid & (s3.decoded.blocks[name] == _sentinel(name)))
        if hit.size:
            i = int(hit[0])
            raise ExportFailure(
                "sentinel-collision",
                f"{name} at {s3.where(i)}: a valid value is stored as the null sentinel "
                f"{_sentinel(name)}",
            )


def rule_null_counts(s3: StepThree) -> None:
    """Rule `null-counts`: every column's null count equals the view's."""
    for name in STAGE_BLOCKS:
        decoded = int((s3.decoded.blocks[name] == _sentinel(name)).sum())
        view = int((~_view_valid(s3.frame, name)).sum())
        if decoded != view:
            raise ExportFailure(
                "null-counts", f"{name}: {decoded} nulls decoded, {view} in the view"
            )


def rule_unclassified(s3: StepThree) -> None:
    """Rule `unclassified-has-no-valid-measurement`: every record whose
    `scarp_class` is null has null `scarp_height`, `dzw`, and `scarp_dip`."""
    unclassified = s3.decoded.blocks["scarp_class"] == UINT8_NULL
    for name in UNCLASSIFIED_NULL_COLUMNS:
        hit = np.flatnonzero(unclassified & (s3.decoded.blocks[name] != UINT16_NULL))
        if hit.size:
            i = int(hit[0])
            raise ExportFailure(
                "unclassified-has-no-valid-measurement",
                f"{s3.where(i)} has a null scarp_class and a valid {name}",
            )


def rule_dictionary_order(s3: StepThree, vintage: Vintage) -> None:
    """Rule `dictionary-order`: `scarp_classes`, each `trial_columns`
    dictionary, and `arm_strength_states`, as the run holds them for the
    manifest, are in their §3.2 orders; the `dip_dictionary` block decoded
    from the written artifact is strictly ascending with every magnitude at
    most 180,000; and the measured (`set`, `sediment_strength`) pair set
    equals the nine-pair constant."""
    pack = vintage.pack
    if list(pack.scarp_classes) != list(SCARP_CLASSES):
        raise ExportFailure(
            "dictionary-order",
            f"scarp_classes {pack.scarp_classes} are not config.SCARP_CLASSES "
            f"{list(SCARP_CLASSES)}",
        )
    if list(pack.trial_columns) != list(TRIAL_TABLE_COLUMNS):
        raise ExportFailure(
            "dictionary-order",
            f"trial_columns holds {list(pack.trial_columns)}, not {list(TRIAL_TABLE_COLUMNS)}",
        )
    for column, dictionary in pack.trial_columns.items():
        if column == "model_family":
            ordered = list(MODEL_FAMILIES)
        elif column in INTEGER_TRIAL_COLUMNS:
            if not all(isinstance(v, int) and not isinstance(v, bool) for v in dictionary):
                raise ExportFailure(
                    "dictionary-order", f"trial_columns.{column} holds a non-integer"
                )
            ordered = sorted(set(dictionary))  # type: ignore[type-var]
        else:
            if not all(isinstance(v, str) for v in dictionary):
                raise ExportFailure(
                    "dictionary-order", f"trial_columns.{column} holds a non-string"
                )
            ordered = sorted(set(dictionary))  # type: ignore[type-var]
        if list(dictionary) != ordered:
            raise ExportFailure(
                "dictionary-order", f"trial_columns.{column} {dictionary} is not in order {ordered}"
            )
    rank = {pair: i for i, pair in enumerate(ARM_STRENGTH_STATES)}
    states = [(s["set"], s["sediment_strength"]) for s in pack.arm_strength_states]
    known = [p for p in states if p in rank]  # unknown pairs: the pair-set check below
    if [rank[p] for p in known] != sorted({rank[p] for p in known}):
        raise ExportFailure(
            "dictionary-order",
            f"arm_strength_states {states} are not in the display order of ARM_STRENGTH_STATES",
        )
    dips = s3.decoded.blocks["dip_dictionary"].astype(np.int64)
    if dips.size and not (np.diff(dips) > 0).all():
        k = int(np.flatnonzero(~(np.diff(dips) > 0))[0])
        raise ExportFailure(
            "dictionary-order",
            f"dip_dictionary entry {k + 1} ({dips[k + 1]}) does not exceed entry {k} ({dips[k]})",
        )
    too_large = np.flatnonzero(np.abs(dips) > DIP_DICTIONARY_LIMIT)
    if too_large.size:
        k = int(too_large[0])
        raise ExportFailure(
            "dictionary-order",
            f"dip_dictionary entry {k} ({dips[k]}) has a magnitude above {DIP_DICTIONARY_LIMIT}",
        )
    n = s3.stages_per_trial
    first = s3.frame.iloc[np.arange(len(s3.trials)) * n]
    measured = set(
        zip(
            first[TRIAL_SOURCE_COLUMNS["set"]].tolist(),
            first[TRIAL_SOURCE_COLUMNS["sediment_strength"]].tolist(),
            strict=True,
        )
    )
    if measured != set(ARM_STRENGTH_STATES):
        missing = sorted(set(ARM_STRENGTH_STATES) - measured)
        extra = sorted(measured - set(ARM_STRENGTH_STATES))  # type: ignore[type-var]
        raise ExportFailure(
            "dictionary-order",
            f"the measured set x sediment_strength pairs differ from ARM_STRENGTH_STATES: "
            f"missing {missing}, unexpected {extra}",
        )


def rule_view_reread(ctx: RunContext, vintage: Vintage, con: duckdb.DuckDBPyConnection) -> None:
    """Rule `view-reread`: the field and regression exports, re-read from
    the written files, equal the rows the run-private views return — row for
    row in the §3.4 and §3.5 orders, floats compared by `float.hex()`."""
    field = read_json_file(ctx.out_dir / vintage.files["field_export"])
    found = first_difference(field["rows"], field_export_rows(con), "field export rows")  # type: ignore[index]
    if found:
        raise ExportFailure("view-reread", f"{found} (file against the field_export view)")
    regression = read_json_file(ctx.out_dir / vintage.files["regression_export"])
    found = first_difference(
        regression["coefficients"],  # type: ignore[index]
        regression_coefficients(con),
        "regression coefficients",
    )
    if found:
        raise ExportFailure("view-reread", f"{found} (file against the dem_regression view)")


def rule_coefficient_reach(ctx: RunContext, vintage: Vintage) -> None:
    """Rule `coefficient-reach`: every regression row has `slope > 0`,
    `intercept <= 0`, and `-intercept / slope <= slip_window_bounds.max` in
    float64."""
    regression = read_json_file(ctx.out_dir / vintage.files["regression_export"])
    bound = float(vintage.pack.slip_window_bounds["max"])
    for row in regression["coefficients"]:  # type: ignore[index]
        dip, slope, intercept = row["fault_dip"], float(row["slope"]), float(row["intercept"])
        if not slope > 0:
            raise ExportFailure("coefficient-reach", f"fault_dip {dip}: slope {slope!r} is not > 0")
        if not intercept <= 0:
            raise ExportFailure(
                "coefficient-reach", f"fault_dip {dip}: intercept {intercept!r} is not <= 0"
            )
        reach = -intercept / slope
        if not reach <= bound:
            raise ExportFailure(
                "coefficient-reach",
                f"fault_dip {dip}: -intercept / slope = {reach!r} exceeds "
                f"slip_window_bounds.max {bound!r}",
            )


def _is_log_first_edge(value: int) -> bool:
    """Whether a value is 100 · 2^i recording steps for an integer i >= 0."""
    if value < LOG_FIRST_EDGE or value % LOG_FIRST_EDGE:
        return False
    octave = value // LOG_FIRST_EDGE
    return octave & (octave - 1) == 0


def rule_reference_invariants(ctx: RunContext, vintage: Vintage) -> None:
    """Rule `reference-invariants` (§4.1 step 3) over the reference file,
    gunzipped and parsed."""
    rule = "reference-invariants"
    references = read_json_file(ctx.out_dir / vintage.references_name)
    if canonical_json(references) != canonical_json(vintage.references):
        found = first_difference(references, json.loads(canonical_json(vintage.references)), "")
        raise ExportFailure(
            rule, f"the reference file differs from the generator's object at {found}"
        )
    offer_ratio = LOG_SCALE_OFFER_RATIOS[LOG_SCALE_MIN_DECADES]
    reference_vintage = vintage.reference_vintage
    for entry in references["scenarios"]:  # type: ignore[index]
        sid = entry["id"]
        matching = entry["counts"]["matching_records"]
        valid_of: dict[str, int] = {}
        for m in MEASUREMENTS:
            counts = entry["counts"]["per_measurement"][m]
            valid = counts["valid"]
            valid_of[m] = valid
            if valid + counts["excluded_null"] != matching:
                raise ExportFailure(
                    rule,
                    f"{sid} {m}: valid {valid} + excluded_null {counts['excluded_null']} is not "
                    f"matching_records {matching}",
                )
            for key in ("statistics", "percentiles", "histogram", "display"):
                if (entry[key][m] is None) != (valid == 0):
                    raise ExportFailure(
                        rule,
                        f"{sid} {key}.{m} is {'null' if entry[key][m] is None else 'not null'} "
                        f"with valid {valid}",
                    )
            for key in ("statistics", "display"):
                record = entry[key][m]
                if record is not None and (record["sd"] is None) != (valid == 1):
                    raise ExportFailure(
                        rule,
                        f"{sid} {key}.{m}.sd is {'null' if record['sd'] is None else 'not null'} "
                        f"with valid {valid}",
                    )
            table = entry["histogram"][m]
            if table is not None:
                total = sum(sum(row) for row in table["counts"])
                if total != valid:
                    raise ExportFailure(
                        rule, f"{sid} histogram.{m} counts sum to {total}, not valid {valid}"
                    )
        log = entry["histogram_log"]["dzw"]
        offered = False
        if valid_of["dzw"] and reference_vintage is not None:
            table_ = reference_vintage.table
            chosen = select(table_, entry["inputs"], reference_vintage.windows_for(entry["inputs"]))
            positive = [s for s in measurement_values(table_, chosen, "dzw")[0] if s > 0]
            offered = bool(positive) and max(positive) > offer_ratio * min(positive)
        if (log is not None) != offered:
            raise ExportFailure(
                rule,
                f"{sid} histogram_log.dzw is {'null' if log is None else 'not null'}, but the "
                f"width panel {'offers' if offered else 'does not offer'} the logarithmic axis",
            )
        if log is not None:
            total = sum(sum(row) for row in log["counts"]) + sum(log["below_counts"])
            if total != valid_of["dzw"]:
                raise ExportFailure(
                    rule,
                    f"{sid} histogram_log.dzw counts and below_counts sum to {total}, not valid "
                    f"{valid_of['dzw']}",
                )
            if not _is_log_first_edge(log["first_edge"]):
                raise ExportFailure(
                    rule,
                    f"{sid} histogram_log.dzw first_edge {log['first_edge']} is not 100 * 2^i",
                )
        selection = entry["selection"]
        if matching <= IDENTITY_LIMIT:
            if "identities" not in selection or len(selection["identities"]) != matching:
                raise ExportFailure(
                    rule,
                    f"{sid} selection does not hold {matching} identities "
                    f"(matching_records <= {IDENTITY_LIMIT})",
                )
        elif "count" not in selection or selection["count"] != matching:
            raise ExportFailure(
                rule,
                f"{sid} selection does not hold a count of {matching} "
                f"(matching_records > {IDENTITY_LIMIT})",
            )


def validate_step3(ctx: RunContext, vintage: Vintage, con: duckdb.DuckDBPyConnection) -> None:
    """§4.1 step 3: decode the files just written with the in-memory decode
    information, before any manifest exists, each rule printing its line."""
    decoded = decode_written_artifact(
        ctx.out_dir / vintage.files["scenario_artifact"], vintage.pack.blocks
    )
    s3 = rule_counts(vintage, decoded)
    report_ok("counts")
    rule_slip_order(s3)
    report_ok("slip-order")
    rule_site_constancy(s3)
    report_ok("site-constancy")
    rule_bitwise_restore(s3, vintage)
    report_ok("bitwise-restore")
    rule_sentinel_collision(s3)
    report_ok("sentinel-collision")
    rule_null_counts(s3)
    report_ok("null-counts")
    rule_unclassified(s3)
    report_ok("unclassified-has-no-valid-measurement")
    rule_dictionary_order(s3, vintage)
    report_ok("dictionary-order")
    rule_view_reread(ctx, vintage, con)
    report_ok("view-reread")
    rule_coefficient_reach(ctx, vintage)
    report_ok("coefficient-reach")
    rule_reference_invariants(ctx, vintage)
    report_ok("reference-invariants")


# --------------------------------------------------------------------------
# Step 5: cross-check the manifest against the written files
# --------------------------------------------------------------------------


def _block_data_length(name: str, counts: dict[str, object], length: int) -> int | None:
    """The data length §3.2 gives a block from the manifest's counts; None
    for `dip_dictionary`, whose entry count no other figure fixes."""
    records, trials = int(counts["records"]), int(counts["trials"])  # type: ignore[call-overload]
    if name == "trial_table":
        return trials * len(TRIAL_TABLE_COLUMNS)
    if name == "dip_dictionary":
        return None
    return records * np.dtype(NUMPY_DTYPES[BLOCK_DTYPES[name]]).itemsize


def rule_block_tiling(manifest: dict[str, object], raw: bytes) -> None:
    """Rule `block-tiling`: the block offsets and lengths satisfy the §3.1
    alignment rule against the artifact actually written — each block at
    the next 4-byte boundary after its predecessor from offset 16, its
    length the data length, the gap bytes zero, and the decompressed length
    `align4(last offset + last length)`."""
    blocks: dict = manifest["blocks"]  # type: ignore[assignment]
    if set(blocks) != set(BLOCK_ORDER):
        raise ExportFailure(
            "block-tiling", f"blocks {sorted(blocks)} are not exactly {list(BLOCK_ORDER)}"
        )
    expected_offset = HEADER_BYTES
    end = HEADER_BYTES
    for name in BLOCK_ORDER:
        offset, length = int(blocks[name]["offset"]), int(blocks[name]["length"])
        if offset != expected_offset:
            raise ExportFailure(
                "block-tiling", f"{name} starts at {offset}, not at {expected_offset}"
            )
        if any(raw[end:offset]):
            raise ExportFailure("block-tiling", f"a gap byte before {name} is not zero")
        data_length = _block_data_length(name, manifest["counts"], length)  # type: ignore[arg-type]
        itemsize = np.dtype(NUMPY_DTYPES[BLOCK_DTYPES[name]]).itemsize
        if (data_length is not None and length != data_length) or length % itemsize:
            raise ExportFailure(
                "block-tiling",
                f"{name} declares {length} bytes, not its data length "
                f"{data_length if data_length is not None else f'(a multiple of {itemsize})'}",
            )
        if offset + length > len(raw):
            raise ExportFailure(
                "block-tiling",
                f"{name} ends at {offset + length}, beyond the artifact's {len(raw)} bytes",
            )
        end = offset + length
        expected_offset = align4(end)
    if len(raw) != align4(end):
        raise ExportFailure(
            "block-tiling",
            f"the decompressed artifact is {len(raw)} bytes, not align4({end}) = {align4(end)}",
        )


def _figure_difference(name: str, manifest_value: object, measured: object) -> None:
    found = first_difference(manifest_value, measured, name)
    if found:
        raise ExportFailure("manifest-figures", f"{found} (manifest against the packed artifact)")


def rule_manifest_figures(manifest: dict[str, object], raw: bytes, view_trials: list[str]) -> None:
    """Rule `manifest-figures`: every data-derived manifest figure equals its
    value re-measured from the packed artifact; `counts` passes
    `check_counts`; and `trials` equals the `dem` view's distinct `Trial`
    strings in ascending code-point order, exactly `counts.trials` of them."""
    rule = "manifest-figures"
    counts: dict = manifest["counts"]  # type: ignore[assignment]
    try:
        check_counts(counts["trials"], counts["stages_per_trial"], counts["records"])
    except ValueError as exc:
        raise ExportFailure(rule, f"counts: {exc}") from exc
    blocks = {name: decode_block(raw, manifest["blocks"][name]) for name in BLOCK_ORDER}  # type: ignore[index]

    # counts: the header's record and trial counts and the trial-major stride.
    _, header_records, header_trials = struct.unpack("<III", raw[4:HEADER_BYTES])
    measured_counts = {
        "records": header_records,
        "trials": header_trials,
        "stages_per_trial": header_records // header_trials if header_trials else 0,
    }
    if header_trials and header_records % header_trials:
        raise ExportFailure(
            rule,
            f"the header's {header_records} records are no whole number of stages for its "
            f"{header_trials} trials",
        )
    _figure_difference("counts", counts, measured_counts)
    t_count, n = int(counts["trials"]), int(counts["stages_per_trial"])

    # columns: restored from the stored values by the §3.1 restore rule.
    columns: dict[str, object] = {}
    for name, (decimals, offset_steps) in SCALED_COLUMNS.items():
        stored = blocks[name].astype(np.int64)
        valid = stored != UINT16_NULL
        values = np.full(stored.shape, np.nan)
        values[valid] = (stored[valid] + offset_steps) / RESTORE_DIVISORS[decimals]
        columns[name] = _scaled_column(decimals, offset_steps, values, valid, "scaled")
    indices = blocks["scarp_dip"].astype(np.int64)
    dictionary = blocks["dip_dictionary"].astype(np.int64)
    dip_valid = indices != UINT16_NULL
    if dip_valid.any() and int(indices[dip_valid].max()) >= len(dictionary):
        raise ExportFailure(rule, "a scarp_dip index is beyond the dip dictionary")
    dip_values = np.full(indices.shape, np.nan)
    dip_values[dip_valid] = dictionary[indices[dip_valid]] / RESTORE_DIVISORS[DIP_DECIMALS]
    columns["scarp_dip"] = _scaled_column(DIP_DECIMALS, 0, dip_values, dip_valid, "dict")
    columns["scarp_class"] = {
        "encoding": "code",
        "decimals": None,
        "offset_steps": None,
        "scale": None,
        "offset": None,
        "physical_min": None,
        "physical_max": None,
        "recording_step": None,
        "null_sentinel": UINT8_NULL,
        "null_count": int((blocks["scarp_class"] == UINT8_NULL).sum()),
    }
    _figure_difference("columns", manifest["columns"], columns)

    # trial_columns and arm_strength_states: the trial table's cells mapped
    # through the manifest's dictionaries.
    dictionaries: dict = manifest["trial_columns"]  # type: ignore[assignment]
    cells = blocks["trial_table"]
    if len(cells) != t_count * len(TRIAL_TABLE_COLUMNS):
        raise ExportFailure(rule, f"the trial table holds {len(cells)} cells, not {t_count} x 7")
    table = cells.reshape(t_count, len(TRIAL_TABLE_COLUMNS))
    decoded_values: dict[str, list[object]] = {}
    for j, column in enumerate(TRIAL_TABLE_COLUMNS):
        dictionary_values = dictionaries.get(column, [])
        used = [int(c) for c in table[:, j]]
        if used and max(used) >= len(dictionary_values):
            raise ExportFailure(
                rule, f"a trial-table {column} index is beyond its manifest dictionary"
            )
        decoded_values[column] = [dictionary_values[c] for c in used]
    trial_columns = {
        column: sorted(set(values))  # type: ignore[type-var]
        for column, values in decoded_values.items()
    }
    _figure_difference("trial_columns", dictionaries, trial_columns)
    rank = {pair: i for i, pair in enumerate(ARM_STRENGTH_STATES)}
    pairs = set(zip(decoded_values["set"], decoded_values["sediment_strength"], strict=True))
    unknown = [pair for pair in pairs if pair not in rank]
    if unknown:
        raise ExportFailure(rule, f"arm_strength_states: {unknown} are outside ARM_STRENGTH_STATES")
    states = [
        {"set": arm, "sediment_strength": strength}
        for arm, strength in sorted(pairs, key=rank.__getitem__)  # type: ignore[arg-type]
    ]
    _figure_difference("arm_strength_states", manifest["arm_strength_states"], states)

    # stage_spacing: the §3.2 arithmetic over the decoded slip block.
    slip = blocks["slip"]
    try:
        spacing = stage_spacing(slip, t_count, n)
    except ValueError as exc:
        raise ExportFailure(rule, f"stage_spacing: {exc}") from exc
    _figure_difference("stage_spacing", manifest["stage_spacing"], spacing)

    slip_steps = slip.astype(np.int64)
    bounds = {
        "min": 0.0,
        "max": int(slip_steps.max()) / RESTORE_DIVISORS[SCALED_COLUMNS["slip"][0]],
        "recording_step": SLIP_RECORDING_STEP,
    }
    _figure_difference("slip_window_bounds", manifest["slip_window_bounds"], bounds)

    trials = manifest["trials"]
    if trials != view_trials or len(trials) != t_count:  # type: ignore[arg-type]
        raise ExportFailure(
            rule,
            f"trials ({len(trials)}) are not the dem view's {len(view_trials)} distinct Trial "  # type: ignore[arg-type]
            f"strings in ascending code-point order, counts.trials {t_count} of them",
        )


def rule_checksums(manifest: dict[str, object], out_dir: Path) -> None:
    """Rule `checksums`: every manifest checksum, one per file `files`
    names, equals the SHA-256 recomputed from the written file."""
    checksums: dict = manifest["checksums"]  # type: ignore[assignment]
    named = set(manifest["files"].values())  # type: ignore[attr-defined]
    if set(checksums) != named:
        raise ExportFailure(
            "checksums",
            f"checksums names {sorted(checksums)}, not exactly the files {sorted(named)}",
        )
    for name, sha in sorted(checksums.items()):
        path = out_dir / name
        actual = sha256_hex(path.read_bytes()) if path.is_file() else "no written file"
        if actual != sha:
            raise ExportFailure(
                "checksums", f"{name}: the manifest records {sha}, written {actual}"
            )


def rule_format_spec(documents: dict[str, tuple[str, object]]) -> None:
    """Rule `format-spec`: every JSON file of the vintage, and the pointer
    manifest, matches its closed spec. ``documents`` maps a label to its
    role and parsed content."""
    for label, (role, document) in documents.items():
        try:
            FORMAT_SPECS[role].check(document, label)
        except SpecError as exc:
            raise ExportFailure("format-spec", str(exc)) from exc


def rule_dd10_names(documents: dict[str, tuple[str, object]]) -> None:
    """Rule `dd10-names`: every name denoting a pipeline column is one of
    the thirteen names of the DD-10 closure note."""
    for label, (role, document) in documents.items():
        for where, name in FORMAT_SPECS[role].column_names(document, label):
            if name not in DD10_COLUMN_NAMES:
                raise ExportFailure(
                    "dd10-names",
                    f"{where} {name!r} denotes a pipeline column but is not one of the DD-10 names",
                )


def rule_envelope_agreement(manifest: dict[str, object], envelopes: dict[str, object]) -> None:
    """Rule `envelope-agreement`: every JSON envelope's `export_version`,
    `export_date`, and `pipeline_version` equal the artifact manifest's, and
    the manifest's `reference_results_version` and the reference file's
    `reference_version` both equal `export_version`."""
    for label, document in envelopes.items():
        for key in ("export_version", "export_date", "pipeline_version"):
            if document[key] != manifest[key]:  # type: ignore[index]
                raise ExportFailure(
                    "envelope-agreement",
                    f"{label} {key} {document[key]!r} is not the manifest's {manifest[key]!r}",  # type: ignore[index]
                )
    version = manifest["export_version"]
    if manifest["reference_results_version"] != version:
        raise ExportFailure(
            "envelope-agreement",
            f"reference_results_version {manifest['reference_results_version']!r} is not "
            f"export_version {version!r}",
        )
    references = envelopes["reference results"]
    if references["reference_version"] != version:  # type: ignore[index]
        raise ExportFailure(
            "envelope-agreement",
            f"reference_version {references['reference_version']!r} is not export_version "  # type: ignore[index]
            f"{version!r}",
        )


#: The members of `provenance` (§3.2).
PROVENANCE_MEMBERS: tuple[str, ...] = (
    "source_commit",
    "source_tree_clean",
    "inputs",
    "environment",
    "compression",
)


def rule_provenance(ctx: RunContext, manifest: dict[str, object]) -> None:
    """Rule `provenance`: the object has exactly the §3.2 members;
    `source_commit` is 40 lowercase hex digits and still `git rev-parse
    HEAD`; a recorded clean tree is still clean; `inputs` is sorted by path
    with no path repeated, holds exactly the nine data paths of step 1, and
    every input re-hashes to its recorded `sha256` and `bytes`."""
    rule = "provenance"
    provenance = manifest["provenance"]
    if not isinstance(provenance, dict) or set(provenance) != set(PROVENANCE_MEMBERS):
        members = sorted(provenance) if isinstance(provenance, dict) else provenance
        raise ExportFailure(rule, f"members {members} are not {sorted(PROVENANCE_MEMBERS)}")
    commit = provenance["source_commit"]
    if not isinstance(commit, str) or re.fullmatch(r"[0-9a-f]{40}", commit) is None:
        raise ExportFailure(rule, f"source_commit {commit!r} is not 40 lowercase hex digits")
    head = source_commit(ctx.root)
    if commit != head:
        raise ExportFailure(rule, f"source_commit {commit} is not HEAD {head}")
    if provenance["source_tree_clean"] is True and not tree_is_clean(ctx.root):
        raise ExportFailure(
            rule, "source_tree_clean is true, but the clean-tree command now prints output"
        )
    paths = [str(record["path"]) for record in provenance["inputs"]]
    if paths != sorted(paths) or len(set(paths)) != len(paths):
        raise ExportFailure(rule, f"inputs are not sorted by path without repeats: {paths}")
    expected = set(ctx.input_paths)
    if set(paths) != expected:
        raise ExportFailure(
            rule,
            f"inputs miss {sorted(expected - set(paths))} and add {sorted(set(paths) - expected)}",
        )
    for record in provenance["inputs"]:
        sha, size = hash_file(ctx.root / record["path"])
        if sha != record["sha256"] or size != record["bytes"]:
            raise ExportFailure(
                rule,
                f"{record['path']} now has SHA-256 {sha} and {size} bytes, recorded "
                f"{record['sha256']} and {record['bytes']} bytes",
            )


def validate_step5(ctx: RunContext, vintage: Vintage) -> None:
    """§4.1 step 5: cross-check the manifest, as written, against the
    written files, each rule printing its line."""
    out_dir = ctx.out_dir
    manifest: dict = read_json_file(out_dir / str(vintage.manifest_name))  # type: ignore[assignment]
    raw = gzip.decompress((out_dir / vintage.files["scenario_artifact"]).read_bytes())
    rule_block_tiling(manifest, raw)
    report_ok("block-tiling")
    view_trials = sorted(set(vintage.pack.frame[TRIAL_SOURCE_COLUMN].tolist()))
    rule_manifest_figures(manifest, raw, view_trials)
    report_ok("manifest-figures")
    rule_checksums(manifest, out_dir)
    report_ok("checksums")
    documents: dict[str, tuple[str, object]] = {"artifact manifest": ("manifest", manifest)}
    labels = {
        "field_export": "field export",
        "regression_export": "regression export",
        "media_index": "media index",
    }
    for key, label in labels.items():
        if key in manifest["files"]:
            documents[label] = (key, read_json_file(out_dir / manifest["files"][key]))
    documents["reference results"] = (
        "reference_results",
        read_json_file(out_dir / vintage.references_name),
    )
    rule_format_spec({**documents, "pointer manifest": ("pointer", checked_pointer(ctx, vintage))})
    report_ok("format-spec")
    rule_dd10_names(documents)
    report_ok("dd10-names")
    rule_envelope_agreement(
        manifest, {label: doc for label, (role, doc) in documents.items() if role != "manifest"}
    )
    report_ok("envelope-agreement")
    rule_provenance(ctx, manifest)
    report_ok("provenance")


# --------------------------------------------------------------------------
# Step 6: the pointer rules
# --------------------------------------------------------------------------


def rule_pointer_exact(pointer: dict[str, object], vintage: Vintage, out_dir: Path) -> None:
    """Rule `pointer-exact`: the pointer lists precisely the artifact
    manifest, every file it names, the reference-results file, and the terms
    file — each with the SHA-256 of the written file, equal to the manifest's
    checksum wherever the manifest names the file; its `data_tag` and
    `export_version` equal the manifest's `export_version`, its
    `export_date` the manifest's, and its `provenance` deep-equals the
    manifest's. Every file that differs is named."""
    manifest: dict = vintage.manifest  # type: ignore[assignment]
    expected = {
        str(vintage.manifest_name),
        *manifest["files"].values(),
        vintage.references_name,
        str(vintage.terms_name),
    }
    listed: dict = pointer["files"]  # type: ignore[assignment]
    problems: list[str] = []
    for name in sorted(set(listed) | expected):
        if name not in expected:
            problems.append(f"{name}: in the pointer, not written by this run")
            continue
        path = out_dir / name
        written = sha256_hex(path.read_bytes()) if path.is_file() else None
        if name not in listed:
            problems.append(f"{name}: written by this run, not in the pointer")
        elif listed[name] != written:
            problems.append(f"{name}: the pointer records {listed[name]}, written {written}")
        elif name in manifest["checksums"] and listed[name] != manifest["checksums"][name]:
            problems.append(f"{name}: the pointer's SHA-256 is not the manifest's checksum")
    for key in ("data_tag", "export_version"):
        if pointer[key] != manifest["export_version"]:
            problems.append(f"{key} {pointer[key]!r} is not the manifest's export_version")
    if pointer["export_date"] != manifest["export_date"]:
        problems.append(f"export_date {pointer['export_date']!r} is not the manifest's")
    if canonical_json(pointer["provenance"]) != canonical_json(manifest["provenance"]):
        found = first_difference(pointer["provenance"], manifest["provenance"], "provenance")
        problems.append(f"provenance differs from the manifest's: {found}")
    if problems:
        raise ExportFailure("pointer-exact", "\n".join(problems))


#: The full-name pattern of each role (§4.1 step 2).
ROLE_NAME_PATTERNS: dict[str, re.Pattern[str]] = {
    role: re.compile(re.escape(prefix) + "([0-9a-f]{12})" + re.escape(suffix))
    for role, (prefix, suffix) in ROLE_PATTERNS.items()
}


def rule_file_names(pointer: dict[str, object]) -> None:
    """Rule `file-names`: every pointer name matches its role's step-2
    pattern with `<h12>` the first 12 digits of its SHA-256, and no name
    ends in a Markdown suffix."""
    for name, sha in sorted(pointer["files"].items()):  # type: ignore[attr-defined]
        if name.endswith(MARKDOWN_SUFFIXES):
            raise ExportFailure("file-names", f"{name} ends in a Markdown suffix")
        matches = [p.fullmatch(name) for p in ROLE_NAME_PATTERNS.values()]
        match = next((m for m in matches if m is not None), None)
        if match is None:
            raise ExportFailure("file-names", f"{name} matches no vintage file pattern")
        if not isinstance(sha, str) or match.group(1) != sha[:12]:
            raise ExportFailure(
                "file-names", f"{name}: <h12> {match.group(1)} is not the start of {sha}"
            )


def check_pointer(ctx: RunContext, vintage: Vintage, pointer: dict[str, object]) -> None:
    """§4.1 step 6's rules, before a pointer is written — or, in a
    `--reproduce` run, against the pointer it was given."""
    rule_pointer_exact(pointer, vintage, ctx.out_dir)
    report_ok("pointer-exact")
    rule_file_names(pointer)
    report_ok("file-names")


# --------------------------------------------------------------------------
# The report and the run
# --------------------------------------------------------------------------


def print_source_lines(commit: str, clean: bool) -> None:
    """The report's first two lines (§4.1, step 1)."""
    print(f"source_commit: {commit}")
    print(f"source_tree_clean: {'true' if clean else 'false'}")


def size_report(out_dir: Path, names: list[str]) -> list[str]:
    """The closing size report (§4.1): one line per vintage file sorted by
    file name, `size: <name> <bytes>`, and for a `.gz` file
    `size: <name> <bytes> <decompressed bytes>`, re-measured from disk."""
    lines = []
    for name in sorted(names):
        data = (out_dir / name).read_bytes()
        if name.endswith(".gz"):
            lines.append(f"size: {name} {len(data)} {len(gzip.decompress(data))}")
        else:
            lines.append(f"size: {name} {len(data)}")
    return lines


#: The compressed-payload budget of PDD §9.1 (D-9, Proposed), 4 MB read as
#: 4,000,000 B as docs/app/ddd.md §7.6 reads it.
PAYLOAD_BUDGET_BYTES = 4_000_000


def payload_diagnostic(artifact_bytes: int) -> str:
    """The payload diagnostic line (docs/app/ddd.md §4.1, end of section;
    §3.8): the scenario artifact's file byte count against the 4 MB
    compressed-payload budget. A diagnostic, never a gate: a count above
    the budget changes only the printed figure."""
    return f"payload diagnostic: {artifact_bytes} of 4 MB ({PAYLOAD_BUDGET_BYTES:,} B) budget"


def print_closing_report(out_dir: Path, vintage: Vintage) -> None:
    """The run's closing lines: the size report, then, as the run's last
    line, the payload diagnostic over the scenario artifact's file byte
    count, re-measured from disk."""
    for line in size_report(out_dir, list(vintage.written)):
        print(line)
    artifact = out_dir / vintage.files["scenario_artifact"]
    print(payload_diagnostic(artifact.stat().st_size))


def export_vintage(ctx: RunContext) -> Vintage:
    """Steps 2 to 5 of §4.1: the data files, the step-3 rules, the artifact
    manifest and the terms file, and the step-5 rules."""
    with run_private_views(ctx.root) as con:
        vintage = write_data_files(ctx, con)
        validate_step3(ctx, vintage, con)
    write_manifest_and_terms(ctx, vintage)
    validate_step5(ctx, vintage)
    return vintage


def run(root: Path, data_tag: str) -> None:
    """One ordinary export run."""
    export_date = export_date_now()
    commit = source_commit(root)
    clean = tree_is_clean(root)
    print_source_lines(commit, clean)
    check_data_tag(data_tag)
    report_ok("data-tag")
    check_retained_copy(root, data_tag)
    report_ok("retained-copy")
    paths = discover_inputs(root)
    check_inputs_present(root, data_tag, paths)
    report_ok("inputs-present")
    out_dir = root / DIST_APP_DIR / data_tag
    reset_dir(out_dir)
    provenance = build_provenance(commit, clean, hash_inputs(root, paths))
    ctx = RunContext(
        root=root,
        data_tag=data_tag,
        export_date=export_date,
        provenance=provenance,
        out_dir=out_dir,
        input_paths=paths,
    )
    vintage = export_vintage(ctx)
    pointer = build_pointer(ctx, vintage)
    check_pointer(ctx, vintage, pointer)
    write_pointer(root, pointer)
    print_closing_report(out_dir, vintage)


# --------------------------------------------------------------------------
# Regeneration: `--reproduce <pointer>` (§4.3)
# --------------------------------------------------------------------------


def recorded_inputs(pointer: dict[str, object]) -> tuple[list[str], str]:
    """The nine data paths of a `--reproduce` run: those the pointer's
    `provenance.inputs` records, which must be the eight fixed paths and
    exactly one path matching :data:`FLATFILE_PATTERN`. Returns the paths
    and the recorded flatfile path; never discovers an input."""
    records = pointer["provenance"]["inputs"]  # type: ignore[index]
    paths = [str(record["path"]) for record in records]
    fixed = [*PROCESSED_INPUTS, *RAW_FIXED_INPUTS]
    problems = [
        f"{path} is missing from the pointer's provenance.inputs"
        for path in sorted(fixed)
        if path not in paths
    ]
    flatfiles = [path for path in paths if matches_flatfile_pattern(path)]
    if not flatfiles:
        problems.append(f"no path matching {FLATFILE_PATTERN} in the pointer's provenance.inputs")
    seen: set[str] = set()
    for path in paths:
        if path in seen:
            problems.append(f"{path} is recorded more than once in the pointer's provenance.inputs")
        elif path not in fixed and not matches_flatfile_pattern(path):
            problems.append(f"{path} in the pointer's provenance.inputs is not an export input")
        seen.add(path)
    if len(set(flatfiles)) > 1:
        problems.append(
            f"more than one path matching {FLATFILE_PATTERN} in the pointer's "
            f"provenance.inputs: {', '.join(sorted(set(flatfiles)))}"
        )
    if problems:
        raise ExportFailure("inputs-present", "\n".join(problems))
    return paths, flatfiles[0]


def check_reproducible(
    root: Path, pointer: dict[str, object], commit: str, clean: bool, allow_drift: bool
) -> None:
    """The refusals of §4.3, each naming the failing `provenance` member:
    HEAD must equal `source_commit`; `source_tree_clean` must be true and
    the clean-tree command print nothing; every input must match its
    recorded SHA-256 and byte count; and, unless ``allow_drift``, the
    running environment must equal `environment` member by member."""
    provenance: dict = pointer["provenance"]  # type: ignore[assignment]
    problems: list[str] = []
    if commit != provenance["source_commit"]:
        problems.append(
            f"provenance.source_commit: HEAD is {commit}, the pointer records "
            f"{provenance['source_commit']}"
        )
    if provenance["source_tree_clean"] is not True:
        problems.append("provenance.source_tree_clean: the pointer records a dirty tree")
    if not clean:
        problems.append(
            "provenance.source_tree_clean: the clean-tree command prints output; "
            "the working tree is not clean"
        )
    mismatched: list[str] = []
    for record in provenance["inputs"]:
        sha, size = hash_file(root / record["path"])
        if sha != record["sha256"] or size != record["bytes"]:
            mismatched.append(record["path"])
            problems.append(
                f"provenance.inputs: {record['path']} has SHA-256 {sha} and {size} bytes, "
                f"the pointer records {record['sha256']} and {record['bytes']} bytes"
            )
    if mismatched and all(path in PROCESSED_INPUTS for path in mismatched):
        flatfile = next(
            r["path"] for r in provenance["inputs"] if matches_flatfile_pattern(r["path"])
        )
        problems.append(
            "Only processed tables differ; the recorded raw files match. "
            + REBUILD_COMMAND_REPRODUCE.format(path=flatfile)
        )
    if not allow_drift:
        running = environment()
        recorded: dict = provenance["environment"]
        for member in sorted(set(running) | set(recorded)):
            if running.get(member) != recorded.get(member):
                problems.append(
                    f"provenance.environment.{member}: running {running.get(member)!r}, "
                    f"the pointer records {recorded.get(member)!r}"
                )
    if problems:
        raise ExportFailure("provenance", "\n".join(problems))


def reproduce(root: Path, pointer_path: Path, allow_drift: bool) -> None:
    """Regenerate a vintage from its pointer into
    `dist/app/<data-tag>.reproduced/`, writing no pointer (§4.3): every rule
    of §4.1 but `retained-copy`, step 6's rules against the given pointer."""
    pointer = json.loads(pointer_path.read_text(encoding="utf-8"))
    data_tag = str(pointer["data_tag"])
    commit = source_commit(root)
    clean = tree_is_clean(root)
    print_source_lines(commit, clean)
    check_data_tag(data_tag)
    report_ok("data-tag")
    paths, flatfile = recorded_inputs(pointer)
    check_inputs_present(root, data_tag, paths, flatfile=flatfile)
    report_ok("inputs-present")
    check_reproducible(root, pointer, commit, clean, allow_drift)
    provenance = dict(pointer["provenance"])
    if allow_drift:
        provenance["environment"] = environment()
    out_dir = root / DIST_APP_DIR / f"{data_tag}.reproduced"
    reset_dir(out_dir)
    ctx = RunContext(
        root=root,
        data_tag=data_tag,
        export_date=str(pointer["export_date"]),
        provenance=provenance,
        out_dir=out_dir,
        input_paths=paths,
        given_pointer=pointer,
    )
    vintage = export_vintage(ctx)
    check_pointer(ctx, vintage, pointer)
    print_closing_report(out_dir, vintage)


def main(argv: list[str] | None = None, *, root: Path | None = None) -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Export one data vintage for the scenario page into dist/app/<data-tag>/ "
            "and write the working-tree pointer manifest (docs/app/ddd.md §4.1); or, "
            "with --reproduce, regenerate a vintage from its pointer (§4.3)."
        ),
    )
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument(
        "--data-tag",
        help="The vintage tag: data-vN, or data-v0-test for a development export.",
    )
    mode.add_argument(
        "--reproduce",
        metavar="POINTER",
        help=(
            "Regenerate the vintage a pointer manifest pins, byte for byte, into "
            "dist/app/<data-tag>.reproduced/; the tag and every input path come from "
            "the pointer, and no pointer is written."
        ),
    )
    parser.add_argument(
        "--allow-environment-drift",
        action="store_true",
        help=(
            "With --reproduce: waive the environment match and record the running "
            "environment instead."
        ),
    )
    args = parser.parse_args(argv)
    if args.allow_environment_drift and not args.reproduce:
        parser.error("--allow-environment-drift applies only with --reproduce")
    root = root or REPO_ROOT
    try:
        if args.reproduce:
            reproduce(root, Path(args.reproduce), args.allow_environment_drift)
        else:
            run(root, args.data_tag)
    except ExportFailure as exc:
        print(exc.report())
        return 1
    except Exception as exc:  # noqa: BLE001 — any other error ends the run, printed
        traceback.print_exc(file=sys.stderr)
        print(f"error: {type(exc).__name__}: {exc}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
