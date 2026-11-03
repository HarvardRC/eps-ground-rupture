"""Product export: `poetry run egr-export-app` / Gradle `exportApp`.

One run writes one complete data vintage for the scenario page into
`dist/app/<data-tag>/` — the scenario artifact, the field and regression
exports, the vintage-terms file, and the artifact manifest — and the
working-tree pointer manifest `subprojects/webapp/data/pointer.json`,
which it never commits (docs/app/ddd.md §4.1, Export task and
validation; the formats are §3.1-§3.5).

The run builds its own DuckDB views in a temporary directory, never
`dashboards/duckdb/eps.duckdb`, so every export comes from the running
code. `--reproduce <pointer>` regenerates a vintage byte for byte from
its pointer into `dist/app/<data-tag>.reproduced/` (§4.3, Regeneration).
"""

from __future__ import annotations

import argparse
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
from collections.abc import Sequence
from dataclasses import dataclass
from pathlib import Path, PurePosixPath

import duckdb
import numpy as np
import pandas as pd
import pyarrow

from . import __version__, io, views
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
    """A check of the run failed; ``detail`` is what the run prints.

    ``rule`` names the §4.1 rule the check belongs to.
    """

    def __init__(self, rule: str, detail: str) -> None:
        super().__init__(detail)
        self.rule = rule
        self.detail = detail


#: The vintage tags an export accepts: `data-vN` (N ≥ 1, no leading zero)
#: or the development tag `data-v0-test`, matched in full.
DATA_TAG_PATTERN = re.compile(r"data-v(0-test|[1-9][0-9]*)")


def check_data_tag(data_tag: str) -> None:
    """Refuse a tag that does not fully match :data:`DATA_TAG_PATTERN`,
    before the run deletes or writes anything."""
    if DATA_TAG_PATTERN.fullmatch(data_tag) is None:
        raise ExportFailure("data-tag", f"{data_tag!r} does not match ^{DATA_TAG_PATTERN.pattern}$")


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

    rank = {pair: i for i, pair in enumerate(ARM_STRENGTH_STATES)}
    pairs = set(zip(site["set"], site["sediment_strength"], strict=True))
    unknown = sorted(pair for pair in pairs if pair not in rank)  # type: ignore[misc]
    if unknown:
        raise ValueError(f"set and sediment_strength pairs outside ARM_STRENGTH_STATES: {unknown}")
    arm_strength_states = [
        {"set": arm, "sediment_strength": strength}
        for arm, strength in sorted(pairs, key=rank.__getitem__)  # type: ignore[arg-type]
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
    written: dict[str, str]
    """Every file the run has written: name -> SHA-256 of its bytes."""
    manifest: dict[str, object] | None = None
    manifest_name: str | None = None
    terms_name: str | None = None


def write_data_files(ctx: RunContext) -> Vintage:
    """§4.1 step 2: the data files, from the run-private views."""
    dem_columns = [TRIAL_SOURCE_COLUMN, *TRIAL_SOURCE_COLUMNS.values()]
    dem_columns += list(STAGE_SOURCE_COLUMNS.values())
    with tempfile.TemporaryDirectory() as tmp:
        duckdb_path = views.build_duckdb_views(
            processed_dir=ctx.root / "data" / "processed",
            duckdb_path=Path(tmp, "views.duckdb"),
        )
        con = duckdb.connect(str(duckdb_path), read_only=True)
        try:
            quoted = ", ".join(f'"{c}"' for c in dem_columns)
            dem = con.execute(f"SELECT {quoted} FROM dem").df()
            pack = pack_scenario(dem)
            field_rows = field_export_rows(con)
            coefficients = regression_coefficients(con)
        finally:
            con.close()

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
    return Vintage(
        pack=pack,
        files=files,
        field_rows=field_rows,
        coefficients=coefficients,
        written=written,
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
        "scarp_classes": list(SCARP_CLASSES),
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
    run writes — the artifact manifest, every file the manifest names, and
    the terms file; the reference-results file joins with T-13."""
    return {
        "schema_version": SCHEMA_VERSION,
        "data_tag": ctx.data_tag,
        "export_version": ctx.data_tag,
        "export_date": ctx.export_date,
        "provenance": ctx.provenance,
        "files": dict(vintage.written),
    }


def write_pointer(root: Path, pointer: dict[str, object]) -> None:
    """§4.1 step 6: write the working-tree pointer; the run never commits it."""
    path = root / POINTER_PATH
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(canonical_json(pointer))


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


def export_vintage(ctx: RunContext) -> Vintage:
    """Steps 2 onward of §4.1."""
    vintage = write_data_files(ctx)
    write_manifest_and_terms(ctx, vintage)
    return vintage


def run(root: Path, data_tag: str) -> None:
    """One ordinary export run."""
    export_date = export_date_now()
    commit = source_commit(root)
    clean = tree_is_clean(root)
    print_source_lines(commit, clean)
    paths = discover_inputs(root)
    check_data_tag(data_tag)
    check_inputs_present(root, data_tag, paths)
    out_dir = root / DIST_APP_DIR / data_tag
    reset_dir(out_dir)
    provenance = build_provenance(commit, clean, hash_inputs(root, paths))
    ctx = RunContext(
        root=root,
        data_tag=data_tag,
        export_date=export_date,
        provenance=provenance,
        out_dir=out_dir,
    )
    vintage = export_vintage(ctx)
    write_pointer(root, build_pointer(ctx, vintage))
    for line in size_report(out_dir, list(vintage.written)):
        print(line)


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


def compare_with_pointer(written: dict[str, str], recorded: dict[str, str]) -> None:
    """Every output file's SHA-256 against the pointer's, naming every
    file that differs."""
    problems = [
        f"{name}: in the pointer, not reproduced"
        for name, sha in sorted(recorded.items())
        if written.get(name) != sha
    ]
    problems += [
        f"{name}: reproduced, not in the pointer"
        for name, sha in sorted(written.items())
        if recorded.get(name) != sha
    ]
    if problems:
        raise ExportFailure("pointer-exact", "\n".join(problems))


def reproduce(root: Path, pointer_path: Path, allow_drift: bool) -> None:
    """Regenerate a vintage from its pointer into
    `dist/app/<data-tag>.reproduced/`, writing no pointer (§4.3)."""
    pointer = json.loads(pointer_path.read_text(encoding="utf-8"))
    data_tag = str(pointer["data_tag"])
    commit = source_commit(root)
    clean = tree_is_clean(root)
    print_source_lines(commit, clean)
    paths, flatfile = recorded_inputs(pointer)
    check_data_tag(data_tag)
    check_inputs_present(root, data_tag, paths, flatfile=flatfile)
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
    )
    vintage = export_vintage(ctx)
    compare_with_pointer(vintage.written, pointer["files"])
    for line in size_report(out_dir, list(vintage.written)):
        print(line)


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
        print(exc.detail)
        return 1
    except Exception as exc:  # noqa: BLE001 — any other error ends the run, printed
        traceback.print_exc(file=sys.stderr)
        print(f"error: {type(exc).__name__}: {exc}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
