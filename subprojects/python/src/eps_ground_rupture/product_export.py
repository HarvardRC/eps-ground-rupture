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

The run builds its own DuckDB views in a temporary directory, never
`dashboards/duckdb/eps.duckdb`, so every export comes from the running
code. `--reproduce <pointer>` regenerates a vintage byte for byte from
its pointer into `dist/app/<data-tag>.reproduced/` (§4.3, Regeneration).
"""

from __future__ import annotations

import argparse
import bisect
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
    """A check of the run failed; ``detail`` is what the run prints.

    ``rule`` names the §4.1 rule the check belongs to.
    """

    def __init__(self, rule: str, detail: str, *, prints_rule_line: bool = False) -> None:
        super().__init__(detail)
        self.rule = rule
        self.detail = detail
        self.prints_rule_line = prints_rule_line
        """Whether the run prints `<rule>: FAILED — <detail>` rather than the
        detail alone: true for the reference generator's assertion
        `finite-reference-values` (§3.6 step 9)."""

    def report(self) -> str:
        """What the run prints for this failure."""
        if self.prints_rule_line:
            return f"{self.rule}: FAILED — {self.detail}"
        return self.detail


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
        raise ValueError("a valid value has class code 255 (unclassified-has-no-valid-measurement)")


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
            raise ExportFailure(
                "finite-reference-values", f"{path} is {obj!r}", prints_rule_line=True
            )
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
        prints_rule_line=True,
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

    # The reference generator reads the view rows, never the decoded artifact.
    references = build_reference_results(
        ctx.envelope(),
        ReferenceVintage(
            table=build_record_table(dem),
            trial_columns=pack.trial_columns,
            arm_strength_states=pack.arm_strength_states,
            slip_window_bounds=pack.slip_window_bounds,
            coefficients=coefficients,
        ),
    )

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
        print(exc.report())
        return 1
    except Exception as exc:  # noqa: BLE001 — any other error ends the run, printed
        traceback.print_exc(file=sys.stderr)
        print(f"error: {type(exc).__name__}: {exc}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
