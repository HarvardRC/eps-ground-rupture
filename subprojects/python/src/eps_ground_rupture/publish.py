"""Publication of a data vintage: `poetry run egr-publish-vintage` / Gradle
`publishVintage` (docs/app/ddd.md §4.2, Publication of a data vintage).

One run, by the owner, publishes one data vintage `data-vN` as a GitHub
prerelease on the annotated tag `data-vN`: the terms-record gate, the clean
tree, the state cases, the export and full-data checks, the tag, the draft
prerelease, the upload, the read-back, the publication, and the publication
record — steps 1-10 of §4.2. Every step first detects work already done, so
a rerun after any interruption resumes without re-exporting. The run ends
by printing the step-11 commands of the pointer commit; it never commits.

Every `git` and `gh` command runs at the repository root; the pipeline
commands of step 4 run in `subprojects/python`, from the project
virtualenv, as their Gradle tasks do.

`--fail-after-uploads <k>` is the test hook of step 7: the run exits
non-zero after its k-th upload. `--drill-repository <owner>/<name>` is the
drill override of the §4.2 *Verification* line: every `gh` call but the
`gh repo view` check of step 1 targets that repository instead of
HarvardRC/eps-ground-rupture, and step 4 runs no pytest, recording
`pytest_full_data` as `drill: not run`; step 1 refuses it in the working
tree of HarvardRC/eps-ground-rupture itself. This module is the only one
that reads the override. A real publication sets neither option.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import tempfile
from collections.abc import Sequence
from dataclasses import dataclass
from pathlib import Path

from .config import REPO_ROOT
from .product_export import (
    CLEAN_TREE_COMMAND,
    DIST_APP_DIR,
    POINTER_PATH,
    REDISTRIBUTION_PATH,
    canonical_json,
    hash_file,
)

#: The repository every `gh` call of a real publication targets.
REPOSITORY = "HarvardRC/eps-ground-rupture"

#: The publishable form of the §3 tag format: `data-vN`, N ≥ 1, no leading
#: zero — so the development tag `data-v0-test` is refused (step 1).
PUBLISH_TAG_PATTERN = re.compile(r"data-v([1-9][0-9]*)")

#: The two forms of the OA-1 record line (step 1): the assumed record of
#: Phase 1 and the confirmed record that replaces it from Phase 2. A record
#: line is a line of `data/REDISTRIBUTION.md` equal to one of them, with
#: `YYYY-MM-DD` matching `[0-9]{4}-[0-9]{2}-[0-9]{2}`.
ASSUMED_RECORD = re.compile(
    r"Assumed [0-9]{4}-[0-9]{2}-[0-9]{2}: code Apache-2\.0, prose CC BY 4\.0, "
    r"derived data exports CC BY 4\.0 with per-source attribution — "
    r"pending research-group confirmation"
)
CONFIRMED_RECORD = re.compile(r"Confirmed: [0-9]{4}-[0-9]{2}-[0-9]{2}")

#: The files whose §4.4 wording must name the terms file (step 1).
WORDING_FILES: tuple[str, ...] = ("README.md", "LICENSE-docs")

#: The vintage-terms file's name pattern (docs/app/ddd.md §4.1 step 2).
TERMS_NAME = re.compile(r"data-terms-[0-9a-f]{12}\.txt")

#: The pipeline subproject, where step 4's commands run.
PYTHON_SUBPROJECT = "subprojects/python"

#: What `gh release view` prints on standard error for a missing release.
RELEASE_NOT_FOUND = "release not found"

#: The form of the drill override's repository name, `<owner>/<name>`.
DRILL_REPOSITORY_PATTERN = re.compile(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+")

#: The check of step 1 that refuses the drill override in the working tree
#: of the real repository: it reads the working tree's own repository.
REPO_VIEW_COMMAND: tuple[str, ...] = (
    "gh",
    "repo",
    "view",
    "--json",
    "nameWithOwner",
    "--jq",
    ".nameWithOwner",
)

#: What step 4 records as `pytest_full_data` in a drill, which runs no
#: pytest: the full-data pins hold only for the research data.
DRILL_PYTEST_FULL_DATA = "drill: not run"


class PublishStop(Exception):
    """The run stops at ``step``: a refusal of §4.2 or a failed check. The
    run prints the message, then each of ``commands`` on its own line, and
    exits non-zero."""

    def __init__(self, step: str, message: str, commands: Sequence[str] = ()) -> None:
        super().__init__(message)
        self.step = step
        self.message = message
        self.commands = list(commands)

    def report(self) -> list[str]:
        lines = [f"step {self.step}: REFUSED — {self.message}"]
        lines += [f"    {command}" for command in self.commands]
        return lines


@dataclass
class Run:
    """One publication run."""

    root: Path
    tag: str
    number: int
    repository: str
    fail_after_uploads: int | None = None
    drill: bool = False
    """Whether the drill override `--drill-repository` is set."""
    source: str = ""
    """`S`: the commit at `HEAD` when the run starts."""
    uploads: int = 0
    """Uploads made by this run, for the step-7 test hook."""

    # -- paths ---------------------------------------------------------------

    @property
    def vintage_dir(self) -> Path:
        return self.root / DIST_APP_DIR / self.tag

    @property
    def record_rel(self) -> str:
        return f"{DIST_APP_DIR}/{self.tag}.publication.json"

    @property
    def record_path(self) -> Path:
        return self.root / self.record_rel

    @property
    def pointer_path(self) -> Path:
        return self.root / POINTER_PATH


# --------------------------------------------------------------------------
# Commands
# --------------------------------------------------------------------------


def say(line: str) -> None:
    print(line, flush=True)


def run_command(
    run: Run, args: Sequence[str], *, step: str, check: bool = True
) -> subprocess.CompletedProcess[str]:
    """Run a `git` or `gh` command at the repository root, capturing its
    output; a non-zero exit stops the run at ``step`` unless ``check`` is
    false."""
    result = subprocess.run(list(args), cwd=run.root, capture_output=True, text=True)
    if check and result.returncode != 0:
        detail = (result.stderr or result.stdout).strip()
        raise PublishStop(
            step, f"`{' '.join(args)}` exited {result.returncode}: {detail or '(no output)'}"
        )
    return result


def git(run: Run, *args: str, step: str, check: bool = True) -> subprocess.CompletedProcess[str]:
    return run_command(run, ["git", *args], step=step, check=check)


def gh(run: Run, *args: str, step: str, check: bool = True) -> subprocess.CompletedProcess[str]:
    return run_command(run, ["gh", *args], step=step, check=check)


def release_command(run: Run, verb: str, *args: str) -> list[str]:
    """A `gh release` command naming the run's repository with `--repo`,
    placed after the positional arguments as §4.2 writes its commands
    (`gh release edit data-vN --repo <repository> --prerelease`)."""
    split = next((i for i, a in enumerate(args) if a.startswith("-")), len(args))
    return ["gh", "release", verb, *args[:split], "--repo", run.repository, *args[split:]]


def stream(args: Sequence[str], *, cwd: Path, env: dict[str, str], step: str) -> list[str]:
    """Run a pipeline command of step 4, echoing its merged output line by
    line; returns the lines. A non-zero exit stops the run."""
    say(f"step {step}: running {' '.join([Path(args[0]).name, *args[1:]])}")
    proc = subprocess.Popen(
        list(args),
        cwd=cwd,
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )
    lines: list[str] = []
    assert proc.stdout is not None
    for line in proc.stdout:
        text = line.rstrip("\n")
        lines.append(text)
        say(text)
    code = proc.wait()
    if code != 0:
        raise PublishStop(step, f"`{Path(args[0]).name}` exited {code}")
    return lines


def sha256_of(path: Path) -> str:
    return hash_file(path)[0]


def read_json(path: Path) -> dict | None:
    if not path.is_file():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def write_record(run: Run, record: dict[str, object]) -> None:
    """Write the staged publication record as the canonical JSON of §4.1
    step 2."""
    run.record_path.parent.mkdir(parents=True, exist_ok=True)
    run.record_path.write_bytes(canonical_json(record))


# --------------------------------------------------------------------------
# Repository and release state
# --------------------------------------------------------------------------


def head_commit(run: Run) -> str:
    return git(run, "rev-parse", "HEAD", step="3").stdout.strip()


def tree_is_clean(run: Run, step: str) -> bool:
    """Whether the clean-tree command of §4.1 step 1 prints nothing."""
    return run_command(run, CLEAN_TREE_COMMAND, step=step).stdout == ""


def _ls_remote_ref(run: Run, ref: str, step: str) -> str:
    """The commit a `git ls-remote origin <ref>` line names for exactly
    ``ref``, or "" when there is none."""
    out = git(run, "ls-remote", "origin", ref, step=step).stdout
    for line in out.splitlines():
        sha, _, name = line.partition("\t")
        if name == ref:
            return sha
    return ""


def remote_peeled(run: Run, step: str) -> str:
    """What `git ls-remote origin 'refs/tags/data-vN^{}'` prints: the
    commit the remote annotated tag peels to, or ""."""
    return _ls_remote_ref(run, f"refs/tags/{run.tag}^{{}}", step)


def remote_tag_commit(run: Run) -> str:
    """`T`: the peeled commit of the remote tag, or, for a tag without a
    peeled line, the commit of its `refs/tags/data-vN` line; "" when no
    such tag exists."""
    return remote_peeled(run, "3") or _ls_remote_ref(run, f"refs/tags/{run.tag}", "3")


def next_tag_number(run: Run) -> int:
    """1 + the largest K among the remote tags named `data-vK` (1 when there
    is none) — tags of withdrawn vintages count (step 3, case (a))."""
    out = git(run, "ls-remote", "--tags", "origin", "refs/tags/data-v*", step="3").stdout
    numbers = []
    for line in out.splitlines():
        name = line.partition("\t")[2]
        match = PUBLISH_TAG_PATTERN.fullmatch(name.removeprefix("refs/tags/"))
        if match:
            numbers.append(int(match[1]))
    return max(numbers, default=0) + 1


def view_release(run: Run, fields: str, step: str) -> dict | None:
    """`gh release view data-vN --repo <repository> --json <fields>`, which
    also finds a draft by its tag name; None when no release exists."""
    result = run_command(
        run, release_command(run, "view", run.tag, "--json", fields), step=step, check=False
    )
    if result.returncode != 0:
        if RELEASE_NOT_FOUND in result.stderr:
            return None
        raise PublishStop(
            step,
            f"`gh release view {run.tag}` exited {result.returncode}: "
            f"{(result.stderr or result.stdout).strip()}",
        )
    return json.loads(result.stdout)


def download(run: Run, step: str, pattern: str | None = None) -> dict[str, str]:
    """Download the release's assets — all, or those matching ``pattern`` —
    into an empty temporary directory; returns name -> SHA-256."""
    with tempfile.TemporaryDirectory() as tmp:
        args = ["--pattern", pattern] if pattern is not None else []
        run_command(run, release_command(run, "download", run.tag, *args, "--dir", tmp), step=step)
        return {path.name: sha256_of(path) for path in sorted(Path(tmp).iterdir())}


def pointer_files(pointer: dict) -> dict[str, str]:
    return dict(pointer["files"])


def terms_name(pointer: dict) -> str:
    names = [name for name in pointer["files"] if TERMS_NAME.fullmatch(name)]
    if len(names) != 1:
        raise PublishStop("6", f"the pointer names {len(names)} terms files, not one")
    return names[0]


def cleanup_commands(run: Run, release: dict | None) -> list[str]:
    """The cleanup commands of an unfinished attempt (step 3, case (c))."""
    commands = []
    if release is not None and release.get("isDraft"):
        commands.append(" ".join(release_command(run, "delete", run.tag, "--yes")))
    commands.append(f"git push origin :refs/tags/{run.tag}")
    commands.append(f"git tag -d {run.tag}")
    tracked = git(run, "ls-files", "--error-unmatch", POINTER_PATH, step="3", check=False)
    if tracked.returncode == 0:
        commands.append(f"git checkout -- {POINTER_PATH}")
    else:
        commands.append(f"rm {POINTER_PATH}")
    commands.append(f"rm -r {DIST_APP_DIR}/{run.tag} {run.record_rel}")
    return commands


def is_unfinished(release: dict | None, record: dict | None) -> bool:
    """An unfinished attempt: the release is a draft, or no release exists
    and the staged record exists without `published_at`."""
    if release is not None:
        return bool(release.get("isDraft"))
    return record is not None and "published_at" not in record


# --------------------------------------------------------------------------
# Step 1: terms-record gate; step 2: clean tree
# --------------------------------------------------------------------------


def immutability_command(run: Run) -> list[str]:
    return ["gh", "api", f"repos/{run.repository}/immutable-releases", "--jq", ".enabled"]


def check_drill_override(run: Run) -> None:
    """Step 1's refusal of the drill override: while `gh repo view` reads the
    working tree's own repository as HarvardRC/eps-ground-rupture — or
    cannot read it — the override is refused, as is an override naming
    HarvardRC/eps-ground-rupture itself."""
    if run.repository.lower() == REPOSITORY.lower():
        raise PublishStop(
            "1", f"the drill override --drill-repository names {REPOSITORY} itself; refused"
        )
    view = run_command(run, REPO_VIEW_COMMAND, step="1", check=False)
    name = view.stdout.strip()
    if view.returncode != 0:
        raise PublishStop(
            "1",
            f"the drill override --drill-repository {run.repository} is refused: "
            f"`{' '.join(REPO_VIEW_COMMAND)}` exited {view.returncode} "
            f"({next(iter((view.stderr or view.stdout).strip().splitlines()), '')})",
        )
    if name.lower() == REPOSITORY.lower():
        raise PublishStop(
            "1",
            f"the drill override --drill-repository {run.repository} is refused: "
            f"`{' '.join(REPO_VIEW_COMMAND)}` prints {name}, so this working tree is the "
            "real repository's",
        )
    say(f"step 1: drill override — every gh call targets {run.repository} (repo view: {name})")


def step1_gate(run: Run) -> None:
    say("step 1: terms-record gate")
    if run.drill:
        check_drill_override(run)
    if PUBLISH_TAG_PATTERN.fullmatch(run.tag) is None:
        raise PublishStop(
            "1",
            f"--data-tag {run.tag!r} does not match ^{PUBLISH_TAG_PATTERN.pattern}$ "
            "(the development tag data-v0-test is never published)",
        )
    terms = run.root / REDISTRIBUTION_PATH
    if not terms.is_file():
        raise PublishStop("1", f"{REDISTRIBUTION_PATH} is missing")
    lines = terms.read_text(encoding="utf-8").splitlines()
    records = [
        line for line in lines if ASSUMED_RECORD.fullmatch(line) or CONFIRMED_RECORD.fullmatch(line)
    ]
    if len(records) != 1:
        raise PublishStop(
            "1",
            f"{REDISTRIBUTION_PATH} holds {len(records)} OA-1 record lines, not exactly one "
            "(the assumed record or the confirmed record)",
        )
    for name in WORDING_FILES:
        path = run.root / name
        if not path.is_file() or REDISTRIBUTION_PATH not in path.read_text(encoding="utf-8"):
            raise PublishStop("1", f"{name} does not contain the path {REDISTRIBUTION_PATH}")
    command = immutability_command(run)
    enabled = run_command(run, command, step="1", check=False)
    if enabled.returncode != 0 or enabled.stdout.strip() != "true":
        printed = (enabled.stdout or enabled.stderr).strip()
        raise PublishStop(
            "1",
            f"`{' '.join(command)}` printed {printed!r}, not 'true': "
            "release immutability is not enabled",
        )
    say(
        f"step 1: ok — {run.tag}; one OA-1 record line; README.md and LICENSE-docs name "
        f"{REDISTRIBUTION_PATH}; release immutability enabled"
    )


def step2_clean_tree(run: Run) -> None:
    say("step 2: clean tree")
    if not tree_is_clean(run, "2"):
        out = run_command(run, CLEAN_TREE_COMMAND, step="2").stdout.rstrip("\n")
        raise PublishStop(
            "2", f"the clean-tree command prints output:\n{out}\nCommit or remove these changes."
        )
    say("step 2: ok — the clean-tree command prints nothing")


# --------------------------------------------------------------------------
# Step 3: state
# --------------------------------------------------------------------------


def staged_vintage_matches(run: Run, pointer: dict | None, record: dict | None) -> str | None:
    """None when a staged vintage exists in the sense of case (b);
    otherwise what is missing."""
    if pointer is None:
        return f"{POINTER_PATH} is missing"
    if pointer.get("data_tag") != run.tag:
        return f"{POINTER_PATH} has data_tag {pointer.get('data_tag')!r}"
    for name, sha in pointer_files(pointer).items():
        path = run.vintage_dir / name
        if not path.is_file():
            return f"{DIST_APP_DIR}/{run.tag}/{name} is missing"
        if sha256_of(path) != sha:
            return f"{DIST_APP_DIR}/{run.tag}/{name} differs from the pointer's SHA-256"
    if record is None:
        return f"{run.record_rel} is missing"
    if record.get("pointer_sha256") != sha256_of(run.pointer_path):
        return f"{run.record_rel} holds another pointer_sha256"
    if record.get("tag_commit") != run.source:
        return f"{run.record_rel} holds tag_commit {record.get('tag_commit')}, not S"
    if "published_at" in record:
        return f"{run.record_rel} holds published_at"
    return None


def step3_state(run: Run) -> str:
    """Apply the first state case that holds; returns the step to continue
    at: "4" (fresh run), "5" (staged vintage), or "10" (already published)."""
    say("step 3: state")
    tag_commit = remote_tag_commit(run)
    release = view_release(run, "isDraft,isPrerelease,assets", "3")
    record = read_json(run.record_path)
    pointer = read_json(run.pointer_path)
    say(
        f"step 3: S {run.source}; T {tag_commit or '(none)'}; release "
        + ("(none)" if release is None else ("draft" if release["isDraft"] else "published"))
        + f"; staged record {'present' if record is not None else '(none)'}"
    )

    # (c) T is not empty and differs from S.
    if tag_commit and tag_commit != run.source:
        unfinished = is_unfinished(release, record)
        raise PublishStop(
            "3",
            f"(c) the remote tag {run.tag} points to {tag_commit}, not to S = {run.source}"
            + (
                "; an unfinished attempt — the cleanup commands:"
                if unfinished
                else "; the vintage is not an unfinished attempt, so its tag stays"
            ),
            cleanup_commands(run, release) if unfinished else (),
        )

    # (d) A published release exists.
    if release is not None and not release["isDraft"]:
        matches = (
            pointer is not None
            and pointer.get("data_tag") == run.tag
            and download(run, "3") == pointer_files(pointer)
        )
        if matches and release["isPrerelease"]:
            say(f"step 3: (d) {run.tag} is already published — continuing at step 10")
            return "10"
        if matches:
            raise PublishStop(
                "3",
                f"(d) the published release {run.tag} is not a prerelease; restore its flag "
                "in place, then rerun:",
                [" ".join(release_command(run, "edit", run.tag, "--prerelease"))],
            )
        raise PublishStop(
            "3",
            f"(d) the published release {run.tag} does not match the staged pointer "
            f"{POINTER_PATH}; a published release's assets are never changed, so the staged "
            f"vintage can only be published under the next tag number, "
            f"data-v{next_tag_number(run)}",
        )

    # (e) No release exists and the staged record holds `published_at`.
    if release is None and record is not None and "published_at" in record:
        raise PublishStop(
            "3",
            f"(e) {run.tag} was published (its record {run.record_rel} holds published_at) "
            "and its release deleted; a deleted release's tag name never carries another "
            f"release — publish the next tag number, data-v{next_tag_number(run)}",
        )

    # (b) A staged vintage exists, and the release is absent or a draft.
    if staged_vintage_matches(run, pointer, record) is None:
        assert pointer is not None
        commit = pointer["provenance"]["source_commit"]
        if commit != run.source:
            raise PublishStop(
                "3",
                f"(b) the staged pointer's provenance.source_commit is {commit}, not S = "
                f"{run.source}",
            )
        say(f"step 3: (b) a staged vintage of {run.tag} exists — continuing at step 5")
        return "5"

    # (a) A fresh run.
    if not tag_commit and release is None and record is None:
        expected = next_tag_number(run)
        if run.number != expected:
            raise PublishStop("3", f"(a) the next tag number is data-v{expected}, not {run.tag}")
        say(f"step 3: (a) a fresh run of {run.tag} — continuing at step 4")
        return "4"

    reason = staged_vintage_matches(run, pointer, record)
    unfinished = is_unfinished(release, record)
    raise PublishStop(
        "3",
        f"no state case holds for {run.tag} ({reason})"
        + ("; an unfinished attempt — the cleanup commands:" if unfinished else ""),
        cleanup_commands(run, release) if unfinished else (),
    )


# --------------------------------------------------------------------------
# Step 4: export and full-data checks (fresh runs only)
# --------------------------------------------------------------------------

#: A passing rule's line of the export's validation report (§4.1).
RULE_OK = re.compile(r"[a-z0-9-]+: ok")


def venv_script(name: str) -> str:
    """A console script of the project virtualenv the run executes in."""
    path = Path(sys.prefix) / "bin" / name
    if not path.is_file():
        raise PublishStop("4", f"{path} is missing: run from the project virtualenv")
    return str(path)


def last_line(lines: list[str]) -> str:
    return next((line.strip() for line in reversed(lines) if line.strip()), "")


def full_data_summary(run: Run, cwd: Path, env: dict[str, str]) -> str:
    """`pytest` with `EGR_REQUIRE_FULL_DATA=1`: its final summary line; in a
    drill, no pytest runs and the record says so."""
    if run.drill:
        say(f"step 4: the drill override runs no pytest ({DRILL_PYTEST_FULL_DATA})")
        return DRILL_PYTEST_FULL_DATA
    lines = stream(
        [venv_script("pytest")], cwd=cwd, env={**env, "EGR_REQUIRE_FULL_DATA": "1"}, step="4"
    )
    return last_line(lines)


def step4_export(run: Run) -> None:
    say("step 4: export and full-data checks")
    cwd = run.root / PYTHON_SUBPROJECT
    env = {**os.environ, "PYTHONUNBUFFERED": "1"}
    stream([venv_script("egr-build")], cwd=cwd, env=env, step="4")
    report = stream(
        [venv_script("egr-export-app"), "--data-tag", run.tag], cwd=cwd, env=env, step="4"
    )
    summary = full_data_summary(run, cwd, env)

    pointer = read_json(run.pointer_path)
    if pointer is None or pointer.get("data_tag") != run.tag:
        raise PublishStop("4", f"the export left no pointer of {run.tag} at {POINTER_PATH}")
    provenance = pointer["provenance"]
    if provenance["source_commit"] != run.source:
        raise PublishStop(
            "4",
            f"the staged pointer's provenance.source_commit is {provenance['source_commit']}, "
            f"not S = {run.source}",
        )
    if provenance["source_tree_clean"] is not True:
        raise PublishStop("4", "the staged pointer's provenance.source_tree_clean is not true")
    if not tree_is_clean(run, "4"):
        out = run_command(run, CLEAN_TREE_COMMAND, step="4").stdout.rstrip("\n")
        raise PublishStop("4", f"the clean-tree command prints output after the export:\n{out}")
    record = {
        "data_tag": run.tag,
        "tag_commit": run.source,
        "pointer_sha256": sha256_of(run.pointer_path),
        "files": pointer_files(pointer),
        "pytest_full_data": summary,
        "validation_report": [line for line in report if RULE_OK.fullmatch(line)],
        "size_report": [line for line in report if line.startswith("size: ")],
    }
    write_record(run, record)
    say(f"step 4: ok — staged {DIST_APP_DIR}/{run.tag}/ and the record {run.record_rel}")


# --------------------------------------------------------------------------
# Steps 5-10
# --------------------------------------------------------------------------


def step5_tag(run: Run) -> None:
    say("step 5: tag")
    ref = f"refs/tags/{run.tag}"
    exists = git(run, "rev-parse", "-q", "--verify", ref, step="5", check=False).stdout.strip()
    if exists and git(run, "cat-file", "-t", ref, step="5").stdout.strip() != "tag":
        raise PublishStop(
            "5",
            f"the local tag {run.tag} is not an annotated tag; delete it:",
            [f"git tag -d {run.tag}"],
        )
    local = git(
        run, "rev-parse", "-q", "--verify", f"{ref}^{{commit}}", step="5", check=False
    ).stdout.strip()
    if not local:
        git(run, "tag", "-a", run.tag, "-m", f"Data vintage {run.tag}", run.source, step="5")
        say(f"step 5: created the annotated tag {run.tag} on {run.source}")
    elif local != run.source:
        raise PublishStop(
            "5",
            f"the local tag {run.tag} points to {local}, not to S = {run.source}; delete it:",
            [f"git tag -d {run.tag}"],
        )
    else:
        say(f"step 5: the local tag {run.tag} already points to S")
    if remote_tag_commit(run) != run.source:
        git(run, "push", "origin", f"refs/tags/{run.tag}", step="5")
        say(f"step 5: pushed refs/tags/{run.tag}")
    else:
        say(f"step 5: the remote tag {run.tag} already points to S")
    peeled = remote_peeled(run, "5")
    if peeled != run.source:
        raise PublishStop(
            "5",
            f"`git ls-remote origin 'refs/tags/{run.tag}^{{}}'` prints {peeled or 'nothing'}, "
            f"not S = {run.source}",
        )
    say(f"step 5: ok — refs/tags/{run.tag}^{{}} on origin is S")


def step6_draft(run: Run, pointer: dict) -> None:
    say("step 6: draft prerelease")
    release = view_release(run, "isDraft,isPrerelease", "6")
    if release is not None and release["isDraft"] and not release["isPrerelease"]:
        raise PublishStop(
            "6",
            f"the draft {run.tag} is not a prerelease; restore its flag, then rerun:",
            [" ".join(release_command(run, "edit", run.tag, "--prerelease"))],
        )
    if release is not None and release["isDraft"]:
        say(f"step 6: a draft of {run.tag} exists")
        return
    if release is not None:
        raise PublishStop("6", f"the release {run.tag} is already published")
    notes = f"{DIST_APP_DIR}/{run.tag}/{terms_name(pointer)}"
    run_command(
        run,
        release_command(
            run,
            "create",
            run.tag,
            "--verify-tag",
            "--draft",
            "--prerelease",
            "--title",
            f"Data vintage {run.tag}",
            "--notes-file",
            notes,
        ),
        step="6",
    )
    say(f"step 6: ok — created the draft prerelease {run.tag}")


def asset_names(run: Run, step: str) -> tuple[bool, list[str]]:
    release = view_release(run, "isDraft,assets", step)
    if release is None:
        raise PublishStop(step, f"the release {run.tag} does not exist")
    return bool(release["isDraft"]), [asset["name"] for asset in release["assets"]]


def upload(run: Run, name: str) -> None:
    path = f"{DIST_APP_DIR}/{run.tag}/{name}"
    run_command(run, release_command(run, "upload", run.tag, path), step="7")
    run.uploads += 1
    say(f"step 7: uploaded {name}")
    if run.fail_after_uploads is not None and run.uploads >= run.fail_after_uploads:
        raise PublishStop(
            "7",
            f"stopping after upload {run.uploads} "
            f"(test hook --fail-after-uploads {run.fail_after_uploads})",
        )


def step7_upload(run: Run, pointer: dict) -> None:
    say("step 7: upload")
    files = pointer_files(pointer)
    _, present = asset_names(run, "7")
    for name in sorted(files):
        if name not in present:
            upload(run, name)
            continue
        got = download(run, "7", pattern=name)
        if got.get(name) == files[name]:
            say(f"step 7: {name} is already uploaded with the pointer's SHA-256")
            continue
        is_draft, _ = asset_names(run, "7")
        if not is_draft:
            raise PublishStop("7", f"the release {run.tag} is no longer a draft")
        run_command(run, release_command(run, "delete-asset", run.tag, name, "--yes"), step="7")
        say(f"step 7: deleted {name}, whose SHA-256 differs from the pointer's")
        upload(run, name)
    is_draft, present = asset_names(run, "7")
    extra = [name for name in present if name not in files]
    if extra and not is_draft:
        raise PublishStop("7", f"the release {run.tag} is no longer a draft")
    for name in extra:
        run_command(run, release_command(run, "delete-asset", run.tag, name, "--yes"), step="7")
        say(f"step 7: deleted {name}, which the pointer does not list")
    say(f"step 7: ok — the release carries the pointer's {len(files)} files")


def read_back(run: Run, pointer: dict, step: str) -> None:
    """Step 8: the downloaded names equal the pointer's `files` keys exactly,
    and every SHA-256 matches."""
    files = pointer_files(pointer)
    got = download(run, step)
    if sorted(got) != sorted(files):
        raise PublishStop(
            step,
            f"read-back: the release's assets {sorted(got)} differ from the pointer's files "
            f"{sorted(files)}",
        )
    differing = [name for name in sorted(files) if got[name] != files[name]]
    if differing:
        raise PublishStop(
            step, f"read-back: SHA-256 differs from the pointer's for {', '.join(differing)}"
        )
    say(f"step {step}: ok — read back {len(files)} files, every SHA-256 equal to the pointer's")


def published_at(run: Run, step: str) -> str:
    release = view_release(run, "publishedAt", step)
    if release is None or not release.get("publishedAt"):
        raise PublishStop(step, f"the release {run.tag} has no publishedAt")
    return str(release["publishedAt"])


def step9_publish(run: Run, pointer: dict) -> None:
    say("step 9: publish")
    run_command(run, release_command(run, "edit", run.tag, "--draft=false"), step="9")
    record = read_json(run.record_path)
    if record is None:
        raise PublishStop("9", f"{run.record_rel} is missing")
    record["published_at"] = published_at(run, "9")
    write_record(run, record)
    say(f"step 9: published {run.tag} at {record['published_at']}; recorded published_at")
    state = view_release(run, "isDraft,isPrerelease", "9")
    if state is None or state["isDraft"] is not False or state["isPrerelease"] is not True:
        raise PublishStop(
            "9", f"the release {run.tag} reports {state}, not isDraft false and isPrerelease true"
        )
    read_back(run, pointer, "9")


def first_line(run: Run, *args: str) -> str:
    out = run_command(run, list(args), step="10").stdout
    return out.splitlines()[0].strip() if out else ""


def release_body(terms: str, record_text: str) -> str:
    """The release body of step 10: the terms text, then a fenced `json`
    block holding the record."""
    if terms and not terms.endswith("\n"):
        terms += "\n"
    return f"{terms}\n```json\n{record_text}```\n"


def step10_record(run: Run, pointer: dict | None) -> None:
    say("step 10: publication record")
    record = read_json(run.record_path)
    if record is None:
        raise PublishStop("10", f"the staged record {run.record_rel} of step 4 is missing")
    if pointer is None:
        raise PublishStop("10", f"{POINTER_PATH} is missing")
    # Step 10 completes the record: a field already present is kept, so a
    # rerun never rewrites the tools that published the vintage.
    if "tag_object" not in record:
        record["tag_object"] = git(
            run, "rev-parse", f"refs/tags/{run.tag}", step="10"
        ).stdout.strip()
    if "gh_version" not in record:
        record["gh_version"] = first_line(run, "gh", "--version")
    if "git_version" not in record:
        record["git_version"] = first_line(run, "git", "--version")
    if "published_at" not in record:
        record["published_at"] = published_at(run, "10")
    write_record(run, record)
    record_text = canonical_json(record).decode("utf-8")
    say(f"step 10: completed {run.record_rel}")
    current = view_release(run, "body", "10")
    if current is not None and record_text.strip() in (current.get("body") or ""):
        say("step 10: the release body already carries the record")
    else:
        terms = (run.vintage_dir / terms_name(pointer)).read_text(encoding="utf-8")
        with tempfile.TemporaryDirectory() as tmp:
            notes = Path(tmp, "notes.md")
            notes.write_text(release_body(terms, record_text), encoding="utf-8")
            run_command(
                run, release_command(run, "edit", run.tag, "--notes-file", str(notes)), step="10"
            )
        say("step 10: set the release body to the terms text and the record")
    say("step 10: ok")


def print_step11(run: Run) -> None:
    say("")
    say(f"{run.tag} is published. Step 11, the pointer commit, is the owner's, with HEAD at S:")
    say(f"    git add {POINTER_PATH} && git commit -m 'Data vintage {run.tag}' -- {POINTER_PATH}")
    say(f"    git rev-parse HEAD^              # must print S = {run.source}")
    say(f"    git diff --name-only HEAD^ HEAD  # must print only {POINTER_PATH}")
    say("This run commits nothing.")


# --------------------------------------------------------------------------
# The run
# --------------------------------------------------------------------------


def publish(run: Run) -> None:
    step1_gate(run)
    step2_clean_tree(run)
    run.source = head_commit(run)
    resume = step3_state(run)
    if resume == "4":
        step4_export(run)
    if resume in ("4", "5"):
        pointer = read_json(run.pointer_path)
        assert pointer is not None
        step5_tag(run)
        step6_draft(run, pointer)
        step7_upload(run, pointer)
        say("step 8: read back")
        read_back(run, pointer, "8")
        step9_publish(run, pointer)
    step10_record(run, read_json(run.pointer_path))
    print_step11(run)


def main(argv: list[str] | None = None, *, root: Path | None = None) -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Publish one data vintage as a GitHub prerelease on its annotated tag "
            "(docs/app/ddd.md §4.2, steps 1-10); prints the step-11 pointer commit "
            "and never commits."
        ),
    )
    parser.add_argument("--data-tag", required=True, help="The vintage tag, data-vN (N >= 1).")
    parser.add_argument(
        "--fail-after-uploads",
        type=int,
        metavar="K",
        help="Test hook: exit non-zero after the K-th upload. A real publication never sets it.",
    )
    parser.add_argument(
        "--drill-repository",
        metavar="OWNER/NAME",
        help=(
            "The drill override: every gh call but the repo-view check targets OWNER/NAME, and "
            "step 4 runs no pytest. Refused in the real repository; a real publication never "
            "sets it."
        ),
    )
    args = parser.parse_args(argv)
    if args.fail_after_uploads is not None and args.fail_after_uploads < 1:
        parser.error("--fail-after-uploads takes a positive integer")
    drill = args.drill_repository is not None
    if drill and DRILL_REPOSITORY_PATTERN.fullmatch(args.drill_repository) is None:
        parser.error("--drill-repository takes <owner>/<name>")
    match = PUBLISH_TAG_PATTERN.fullmatch(args.data_tag)
    run = Run(
        root=root or REPO_ROOT,
        tag=args.data_tag,
        number=int(match[1]) if match else 0,
        repository=args.drill_repository if drill else REPOSITORY,
        fail_after_uploads=args.fail_after_uploads,
        drill=drill,
    )
    try:
        publish(run)
    except PublishStop as stop:
        for line in stop.report():
            say(line)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
