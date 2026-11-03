"""The full-data gate: "a skipped check is not a pass" (docs/app/ddd.md §7.3).

The suite's one conftest, introduced for this rule alone; it defines no
fixtures, so every fixture stays module-scoped in its own test file. Each of
its three hook groups is inert unless ``EGR_REQUIRE_FULL_DATA`` equals
``1``, which only the Gradle task ``pytestFullData`` sets (CI never does):

1. collection skips — a module-level ``pytest.skip(..., allow_module_level=True)``
   or ``pytest.importorskip`` — become collection errors;
2. test skips and xfails, in every test phase, become failures;
3. every node id of the required-test manifest ``full_data_required.txt``
   must have a successful call-phase report, or the run fails; a missing or
   empty manifest fails it the same way.
"""

from __future__ import annotations

import os
from pathlib import Path

import pytest

PREFIX = "skipped under EGR_REQUIRE_FULL_DATA=1: "

#: The required-test manifest: one pytest node id per line, `#` comments
#: allowed — every full-data test of the four §7.3 contract files.
MANIFEST = Path(__file__).with_name("full_data_required.txt")

#: Required ids absent from the collected items (hook group 3).
_absent: set[str] = set()
#: The manifest's ids, in file order; None when the manifest is missing.
_required: list[str] | None = None
#: Node ids whose call-phase report succeeded.
_succeeded: set[str] = set()


def _enabled() -> bool:
    return os.environ.get("EGR_REQUIRE_FULL_DATA") == "1"


def _skip_reason(rep: pytest.CollectReport | pytest.TestReport) -> str:
    """A skip's reason: the message of its ``(path, lineno, message)``
    ``longrepr``, without the ``Skipped: `` prefix pytest gives it."""
    return rep.longrepr[2].removeprefix("Skipped: ")  # type: ignore[index]


# -- 1. Collection skips ----------------------------------------------------------


@pytest.hookimpl(wrapper=True, tryfirst=True)
def pytest_make_collect_report(collector):
    rep = yield
    if _enabled() and rep.skipped:
        rep.outcome = "failed"
        rep.longrepr = PREFIX + _skip_reason(rep)
    return rep


# -- 2. Test skips and xfails -----------------------------------------------------


@pytest.hookimpl(wrapper=True, tryfirst=True)
def pytest_runtest_makereport(item, call):
    rep = yield
    if _enabled() and rep.skipped:
        if hasattr(rep, "wasxfail"):
            reason = "xfail: " + rep.wasxfail
            # A failed report that keeps `wasxfail` is not counted as failed.
            del rep.wasxfail
        else:
            reason = _skip_reason(rep)
        rep.outcome = "failed"
        rep.longrepr = PREFIX + reason
    return rep


# -- 3. The required-test manifest ---------------------------------------------------


def _read_manifest() -> list[str] | None:
    if not MANIFEST.is_file():
        return None
    ids = []
    for line in MANIFEST.read_text(encoding="utf-8").splitlines():
        text = line.split("#", 1)[0].strip()
        if text:
            ids.append(text)
    return ids


def pytest_collection_finish(session):
    global _required
    if not _enabled():
        return
    _required = _read_manifest()
    collected = {item.nodeid for item in session.items}
    _succeeded.clear()
    _absent.clear()
    _absent.update(nodeid for nodeid in _required or () if nodeid not in collected)


def pytest_runtest_logreport(report):
    if _enabled() and report.when == "call" and report.passed:
        _succeeded.add(report.nodeid)


@pytest.hookimpl(trylast=True)
def pytest_sessionfinish(session, exitstatus):
    if not _enabled():
        return
    terminal = session.config.pluginmanager.get_plugin("terminalreporter")

    def write(line: str) -> None:
        if terminal is not None:
            terminal.write_line(line)

    required = _required if _required is not None else _read_manifest()
    failed = False
    if not required:
        write(f"required full-data test manifest missing or empty: {MANIFEST}")
        failed = True
    for nodeid in required or ():
        if nodeid not in _succeeded:
            write(f"required full-data test not run: {nodeid}")
            failed = True
    if failed and session.exitstatus == 0:
        session.exitstatus = pytest.ExitCode.TESTS_FAILED
