"""Fixture tests of the export run (`egr-export-app`, docs/app/ddd.md §4.1).

The §7.3 contract file for the export and validation code. Every case that
runs the export runs it against a temporary repository root — a `tmp_path`
git repository with one commit whose `.gitignore` covers its synthetic
`data/` files and `dist/`, so its clean-tree command prints nothing — and
never reads, moves, or writes the checkout's `data/`, `dist/app/`, or
working-tree pointer, or depends on the checkout's git state (§7.3).
"""

from __future__ import annotations

import re
import subprocess

import numpy as np
import pytest

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
        written: dict[str, str] = {}
        name = pe.write_vintage_file(ctx.out_dir, "scenario_artifact", artifact, written)
        return pe.Vintage(
            pack=None,
            files={"scenario_artifact": name},
            field_rows=[],
            coefficients=[],
            written=written,
        )

    monkeypatch.setattr(pe, "export_vintage", export_vintage)
    assert pe.main(["--data-tag", pe.DEV_TAG], root=repo_root) == 0
    lines = capsys.readouterr().out.splitlines()
    assert lines[-1] == "payload diagnostic: 4000001 of 4 MB (4,000,000 B) budget"
    match = DIAGNOSTIC_LINE.fullmatch(lines[-1])
    assert match and int(match.group(1)) == ABOVE_BUDGET
    sizes = [line.split()[2] for line in lines if line.startswith("size: scenario-")]
    assert sizes == [str(ABOVE_BUDGET)]
