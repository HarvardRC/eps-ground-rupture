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
import platform
import shutil
import subprocess
import sys
import tempfile
import traceback
import zlib
from dataclasses import dataclass
from pathlib import Path, PurePosixPath

import duckdb
import numpy as np
import pandas as pd
import pyarrow

from . import io, views
from .config import REPO_ROOT

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


@dataclass
class RunContext:
    """What every step of one run needs."""

    root: Path
    data_tag: str
    export_date: str
    provenance: dict[str, object]
    out_dir: Path


def export_vintage(ctx: RunContext) -> None:
    """Steps 2 onward of §4.1, from the run-private views."""
    with tempfile.TemporaryDirectory() as tmp:
        duckdb_path = views.build_duckdb_views(
            processed_dir=ctx.root / "data" / "processed",
            duckdb_path=Path(tmp, "views.duckdb"),
        )
        con = duckdb.connect(str(duckdb_path), read_only=True)
        try:
            pass
        finally:
            con.close()


def run(root: Path, data_tag: str) -> None:
    """One ordinary export run."""
    commit = source_commit(root)
    clean = tree_is_clean(root)
    paths = discover_inputs(root)
    check_inputs_present(root, data_tag, paths)
    out_dir = root / DIST_APP_DIR / data_tag
    reset_dir(out_dir)
    provenance = build_provenance(commit, clean, hash_inputs(root, paths))
    ctx = RunContext(
        root=root,
        data_tag=data_tag,
        export_date=export_date_now(),
        provenance=provenance,
        out_dir=out_dir,
    )
    export_vintage(ctx)


def main(argv: list[str] | None = None, *, root: Path | None = None) -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Export one data vintage for the scenario page into dist/app/<data-tag>/ "
            "and write the working-tree pointer manifest (docs/app/ddd.md §4.1)."
        ),
    )
    parser.add_argument(
        "--data-tag",
        required=True,
        help="The vintage tag: data-vN, or data-v0-test for a development export.",
    )
    args = parser.parse_args(argv)
    root = root or REPO_ROOT
    try:
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
