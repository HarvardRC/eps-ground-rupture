"""Adversarial output fixtures for the guided entry's staging boundary."""

from __future__ import annotations

import hashlib
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch


HOOK = Path(__file__).resolve().parents[1] / "hooks" / "site_checks.py"
SPEC = importlib.util.spec_from_file_location("guided_site_checks", HOOK)
assert SPEC is not None and SPEC.loader is not None
checks = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(checks)


class GuidedAssetsTest(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.base = Path(self.temporary.name)
        self.site = self.base / "site"
        self.assets = self.site / "assets" / "explore"
        self.assets.mkdir(parents=True)
        self.page = self.site / "explore" / "index.html"
        self.page.parent.mkdir()
        self.js = self.asset("js", b"export const ready = true;")
        self.css = self.asset("css", b"#gre-explore { color: red; }")
        self.manifest = "manifest-0123456789ab.json"
        data = self.site / "assets" / "scenario" / "data"
        data.mkdir(parents=True)
        (data / self.manifest).write_text("{}", encoding="utf-8")
        self.pointer = self.base / "pointer.json"
        self.pointer.write_text(
            json.dumps(
                {
                    "export_version": "data-v1",
                    "files": {self.manifest: hashlib.sha256(b"{}").hexdigest()},
                }
            ),
            encoding="utf-8",
        )
        self.addCleanup(patch.stopall)
        patch.object(checks, "POINTER", self.pointer).start()
        self.config = SimpleNamespace(
            site_url="https://example.test/eps-ground-rupture/"
        )
        self.html = (
            '<div id="gre-explore"></div>\n'
            f'<link rel="stylesheet" href="../assets/explore/{self.css}">\n'
            '<script id="gre-explore-app" type="module" '
            f'src="../assets/explore/{self.js}" '
            'data-software-version="0.4.0" data-data-version="data-v1" '
            f'data-manifest="../scenario/data/{self.manifest}"></script>\n'
        )
        self.page.write_text(self.html, encoding="utf-8")

    def asset(self, extension: str, content: bytes) -> str:
        name = f"explore-{hashlib.sha256(content).hexdigest()[:12]}.{extension}"
        (self.assets / name).write_bytes(content)
        return name

    def findings(self) -> list[tuple[str, str]]:
        return list(
            checks._explore_subtree(self.site, checks._walk(self.site), self.config)
        )

    def reject(self, fragment: str) -> None:
        found = self.findings()
        self.assertTrue(any(fragment in why for _path, why in found), found)

    def replace(self, old: str, new: str) -> None:
        self.assertIn(old, self.html)
        self.page.write_text(self.html.replace(old, new), encoding="utf-8")

    def test_valid_shared_data_and_isolated_assets(self) -> None:
        self.assertEqual(self.findings(), [])

    def test_publication_omits_both_page_and_assets(self) -> None:
        self.page.unlink()
        for path in self.assets.iterdir():
            path.unlink()
        self.assets.rmdir()
        self.assertEqual(self.findings(), [])

    def test_orphan_assets_fail(self) -> None:
        self.page.unlink()
        self.reject("page is absent")

    def test_missing_named_asset_fails(self) -> None:
        (self.assets / self.js).unlink()
        self.reject("absent from the output")

    def test_stray_asset_fails(self) -> None:
        (self.assets / "stale.js").write_text("stale", encoding="utf-8")
        self.reject("not an asset named")

    def test_duplicate_data_subtree_fails(self) -> None:
        (self.assets / "data").mkdir()
        self.reject("not an asset named")

    def test_corrupt_bundle_fails(self) -> None:
        (self.assets / self.js).write_text("changed bytes", encoding="utf-8")
        self.reject("content does not match")

    def test_unhashed_module_fails(self) -> None:
        self.replace(self.js, "explore.js")
        self.reject("hashed explore module")

    def test_duplicate_script_fails(self) -> None:
        self.page.write_text(self.html + self.html, encoding="utf-8")
        self.reject("exactly one #gre-explore-app")

    def test_missing_mount_fails(self) -> None:
        self.replace('id="gre-explore"', 'id="other"')
        self.reject("exactly one #gre-explore mount")

    def test_legacy_mount_on_guided_page_fails(self) -> None:
        self.page.write_text(self.html + '<div id="gre-root"></div>', encoding="utf-8")
        self.reject("legacy scenario mount")

    def test_wrong_data_version_fails(self) -> None:
        self.replace('data-data-version="data-v1"', 'data-data-version="data-v2"')
        self.reject("data-version stamp")

    def test_missing_software_version_fails(self) -> None:
        self.replace('data-software-version="0.4.0"', 'data-software-version=""')
        self.reject("software-version stamp")

    def test_local_duplicate_manifest_reference_fails(self) -> None:
        self.replace("../scenario/data/", "data/")
        self.reject("shared pinned scenario manifest")

    def test_missing_shared_manifest_fails(self) -> None:
        (self.site / "assets" / "scenario" / "data" / self.manifest).unlink()
        self.reject("shared manifest is absent")

    def test_missing_stylesheet_fails(self) -> None:
        self.replace(f'<link rel="stylesheet" href="../assets/explore/{self.css}">', "")
        self.reject("exactly one stylesheet")


if __name__ == "__main__":
    unittest.main()
