"""Self-tests of the full-data gate (tests/conftest.py, docs/app/ddd.md §7.3).

Fixture lane, CI included. Each case writes the real conftest and a
required-test manifest into a pytester directory, sets or removes
`EGR_REQUIRE_FULL_DATA`, and runs pytest in a subprocess: under the flag a
skip, an xfail, or a required test without a successful call report fails
the run; without it the conftest is inert. `test_manifest_matches_suite`
keeps the manifest equal to the four contract files' `test_full_*` tests.
"""

from __future__ import annotations

import ast
import re
from pathlib import Path

import pytest

pytest_plugins = ["pytester"]

CONFTEST = Path(__file__).with_name("conftest.py")
MANIFEST = Path(__file__).with_name("full_data_required.txt")

#: The four contract files of §7.3.
CONTRACT_FILES = (
    "test_scenario_export.py",
    "test_field_export.py",
    "test_reference_results.py",
    "test_manifests.py",
)


def _setup(pytester, monkeypatch, *, flag: str | None = "1", manifest: str | None = None):
    pytester.makeconftest(CONFTEST.read_text())
    if manifest is not None:
        pytester.makefile(".txt", full_data_required=manifest)
    if flag is None:
        monkeypatch.delenv("EGR_REQUIRE_FULL_DATA", raising=False)
    else:
        monkeypatch.setenv("EGR_REQUIRE_FULL_DATA", flag)


REQUIRED = "test_a.py::test_full_req\n"


def test_skip_inside_a_test_fails(pytester, monkeypatch):
    _setup(pytester, monkeypatch, manifest=REQUIRED)
    pytester.makepyfile(
        test_a="""
        import pytest

        def test_full_req():
            pytest.skip('x')
        """
    )
    result = pytester.runpytest_subprocess()
    assert result.ret == 1
    result.assert_outcomes(failed=1)
    result.stdout.fnmatch_lines(["*skipped under EGR_REQUIRE_FULL_DATA=1: x*"])


def test_fixture_skip_is_an_error(pytester, monkeypatch):
    _setup(pytester, monkeypatch, manifest=REQUIRED)
    pytester.makepyfile(
        test_a="""
        import pytest

        @pytest.fixture(scope='module')
        def data():
            pytest.skip('no data')

        def test_full_req(data):
            pass
        """
    )
    result = pytester.runpytest_subprocess()
    result.assert_outcomes(errors=1)


def test_skipif_mark_is_an_error(pytester, monkeypatch):
    _setup(pytester, monkeypatch, manifest=REQUIRED)
    pytester.makepyfile(
        test_a="""
        import pytest

        pytestmark = pytest.mark.skipif(True, reason='r')

        def test_full_req():
            pass
        """
    )
    result = pytester.runpytest_subprocess()
    result.assert_outcomes(errors=1)


def test_module_level_skip_is_a_collection_error(pytester, monkeypatch):
    _setup(pytester, monkeypatch, manifest=REQUIRED)
    pytester.makepyfile(
        test_a="""
        import pytest

        pytest.skip('m', allow_module_level=True)

        def test_full_req():
            pass
        """
    )
    result = pytester.runpytest_subprocess()
    assert result.ret == 2
    result.stdout.fnmatch_lines(["*skipped under EGR_REQUIRE_FULL_DATA=1: m*"])


def test_module_level_importorskip_is_a_collection_error(pytester, monkeypatch):
    _setup(pytester, monkeypatch, manifest=REQUIRED)
    pytester.makepyfile(
        test_a="""
        import pytest

        pytest.importorskip('egr_no_such_module')

        def test_full_req():
            pass
        """
    )
    result = pytester.runpytest_subprocess()
    assert result.ret == 2


def test_failing_xfail_fails(pytester, monkeypatch):
    _setup(pytester, monkeypatch, manifest=REQUIRED)
    pytester.makepyfile(
        test_a="""
        import pytest

        @pytest.mark.xfail
        def test_full_req():
            assert False
        """
    )
    result = pytester.runpytest_subprocess()
    assert result.ret == 1


def test_required_test_absent_from_the_suite_fails(pytester, monkeypatch):
    _setup(pytester, monkeypatch, manifest="test_a.py::test_full_gone\n")
    pytester.makepyfile(
        test_a="""
        def test_other():
            pass
        """
    )
    result = pytester.runpytest_subprocess()
    assert result.ret == 1
    result.stdout.fnmatch_lines(["*required full-data test not run: test_a.py::test_full_gone*"])


def test_deselected_required_test_fails(pytester, monkeypatch):
    _setup(pytester, monkeypatch, manifest=REQUIRED)
    pytester.makepyfile(
        test_a="""
        def test_full_req():
            pass

        def test_other():
            pass
        """
    )
    result = pytester.runpytest_subprocess("-k", "not test_full_req")
    assert result.ret == 1


def test_missing_manifest_fails(pytester, monkeypatch):
    _setup(pytester, monkeypatch, manifest=None)
    pytester.makepyfile(
        test_a="""
        def test_other():
            pass
        """
    )
    result = pytester.runpytest_subprocess()
    assert result.ret != 0


@pytest.mark.parametrize("flag", [None, "0", "true"])
def test_without_the_flag_the_conftest_is_inert(pytester, monkeypatch, flag):
    _setup(pytester, monkeypatch, flag=flag, manifest=REQUIRED)
    pytester.makepyfile(
        test_a="""
        import pytest

        def test_full_req():
            pytest.skip('x')
        """
    )
    result = pytester.runpytest_subprocess()
    result.assert_outcomes(skipped=1)
    assert result.ret == 0


def _manifest_names() -> set[str]:
    names = set()
    for line in MANIFEST.read_text(encoding="utf-8").splitlines():
        text = line.split("#", 1)[0].strip()
        if text:
            names.add(re.sub(r"\[.*\]$", "", text.rsplit("::", 1)[1]))
    return names


def _full_data_tests() -> set[str]:
    names = set()
    for file_name in CONTRACT_FILES:
        tree = ast.parse(Path(__file__).with_name(file_name).read_text(encoding="utf-8"))
        names.update(
            node.name
            for node in tree.body
            if isinstance(node, ast.FunctionDef) and node.name.startswith("test_full_")
        )
    return names


def test_manifest_matches_suite():
    """The four contract files' full-data test functions — exactly those
    named `test_full_*` — equal the manifest's node-id base names, parameter
    suffixes stripped, in both directions."""
    suite, manifest = _full_data_tests(), _manifest_names()
    assert suite - manifest == set(), "full-data tests missing from the manifest"
    assert manifest - suite == set(), "manifest names without a full-data test"
