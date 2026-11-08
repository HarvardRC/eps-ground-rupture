"""Adversarial output fixtures for the guided entry's staging boundary
and its unlisted publication (guided-journey-ddd.md §9.4)."""

from __future__ import annotations

import hashlib
import importlib.util
import json
import os
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from mkdocs.structure.files import InclusionLevel


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

    def test_absent_page_and_assets_pass(self) -> None:
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


SITE_URL = "https://example.test/eps-ground-rupture/"
SITEMAP_NS = "http://www.sitemaps.org/schemas/sitemap/0.9"
MKDOCS_ROOT = Path(__file__).resolve().parents[1]


def page_file(name: str) -> SimpleNamespace:
    """A stand-in for the mkdocs File of the top-level page `name`.md."""
    return SimpleNamespace(
        src_uri=f"{name}.md",
        url=f"{name}/",
        dest_uri=f"{name}/index.html",
        page=SimpleNamespace(canonical_url=f"{SITE_URL}{name}/"),
    )


class GuidedListedTest(unittest.TestCase):
    """PDD D-52: the publication tree lists explore/; scenario/ stays unlisted (D-39)."""

    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.site = Path(self.temporary.name)
        self.explore = page_file("explore")
        self.scenario = page_file("scenario")
        self.addCleanup(patch.stopall)
        patch.object(checks, "_drafts", []).start()
        patch.object(checks, "_unlisted", [self.scenario]).start()
        patch.object(checks, "_command", "build").start()
        self.publication = SimpleNamespace(site_url=SITE_URL, config_file_path="/x/mkdocs.yml")
        self.preview = SimpleNamespace(site_url=SITE_URL, config_file_path="/x/mkdocs.preview.yml")
        # The listed guided page links to itself and its own disclaimer; the
        # unlisted existing explorer links to itself; the nav links the
        # guided page from every listed page.
        self.write("explore/index.html", '<a href="./#gre-explore-disclaimer">x</a><a href="../glossary/">x</a>')
        self.write("scenario/index.html", '<a href="./#gre-disclaimer">x</a>')
        self.write("index.html", '<nav><a href="explore/">E</a></nav><a href="glossary/">x</a>')
        self.write("glossary/index.html", '<nav><a href="../explore/">E</a></nav><a href="../">x</a>')
        self.sitemap(["", "glossary/", "explore/"])
        self.search(["", "glossary/", "glossary/#slip", "explore/", "explore/#gre-explore-disclaimer"])

    def write(self, path: str, text: str) -> None:
        target = self.site / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(text, encoding="utf-8")

    def sitemap(self, paths: list[str]) -> None:
        urls = "".join(f"<url><loc>{SITE_URL}{p}</loc></url>" for p in paths)
        self.write("sitemap.xml", f'<urlset xmlns="{SITEMAP_NS}">{urls}</urlset>')

    def search(self, locations: list[str]) -> None:
        docs = [{"location": loc} for loc in locations]
        self.write("search/search_index.json", json.dumps({"docs": docs}))

    def findings(self, config: SimpleNamespace) -> list[tuple[str, str]]:
        return list(checks._publication_boundary(self.site, checks._walk(self.site), config))

    def reject(self, config: SimpleNamespace, fragment: str) -> None:
        found = self.findings(config)
        self.assertTrue(any(fragment in why for _path, why in found), found)

    def test_listed_guided_page_passes(self) -> None:
        self.assertEqual(self.findings(self.publication), [])

    def test_guided_page_linking_to_existing_explorer_fails(self) -> None:
        # Listed, the guided page may no longer link the unlisted /scenario/.
        self.write("explore/index.html", '<a href="../scenario/">x</a>')
        self.reject(self.publication, "resolves to the unlisted scenario.md")

    def test_guided_page_disclaimer_link_to_existing_explorer_fails(self) -> None:
        self.write("explore/index.html", '<a href="../scenario/#gre-disclaimer">x</a>')
        self.reject(self.publication, "resolves to the unlisted scenario.md")

    def test_unlisted_guided_page_fails(self) -> None:
        patch.object(checks, "_unlisted", [self.explore, self.scenario]).start()
        self.reject(self.publication, "guided page is unlisted")

    def test_guided_page_missing_from_sitemap_fails(self) -> None:
        self.sitemap(["", "glossary/"])
        self.reject(self.publication, "does not list the guided explore/ page")

    def test_guided_page_missing_from_search_fails(self) -> None:
        self.search(["", "glossary/"])
        self.reject(self.publication, "does not index the guided explore/ page")

    def test_existing_explorer_not_unlisted_fails(self) -> None:
        patch.object(checks, "_unlisted", []).start()
        self.reject(self.publication, "existing explorer is not unlisted")

    def test_existing_explorer_link_from_listed_page_still_fails(self) -> None:
        self.write("glossary/index.html", '<a href="../scenario/">x</a>')
        self.reject(self.publication, "resolves to the unlisted scenario.md")

    def test_sitemap_entry_for_existing_explorer_fails(self) -> None:
        self.sitemap(["", "glossary/", "explore/", "scenario/"])
        self.reject(self.publication, "lists the unlisted scenario.md")

    def test_search_entry_for_existing_explorer_fails(self) -> None:
        self.search(["", "explore/", "scenario/#gre-disclaimer"])
        self.reject(self.publication, "indexes the unlisted scenario.md")

    def test_preview_keeps_its_coverage(self) -> None:
        # The preview keeps the unlisted page in its sitemap for instant
        # navigation (docs/app/ddd.md §6.1) and checks only its drafts.
        self.sitemap(["", "explore/", "scenario/"])
        self.write("index.html", '<a href="scenario/">x</a>')
        self.assertEqual(self.findings(self.preview), [])

    def test_preview_still_rejects_drafts(self) -> None:
        drafted = SimpleNamespace(src_uri="media/dev/clip.mp4", url="media/dev/clip.mp4",
                                  dest_uri="media/dev/clip.mp4", page=None)
        patch.object(checks, "_drafts", [drafted]).start()
        self.write("media/dev/clip.mp4", "x")
        self.write("explore/index.html", '<a href="../media/dev/clip.mp4">x</a>')
        found = self.findings(self.preview)
        self.assertIn(("media/dev/clip.mp4", "the output of the drafted media/dev/clip.mp4"), found)
        self.assertIn(("explore/index.html", "an href or src resolves to the drafted media/dev/clip.mp4"), found)

    def test_publication_sitemap_keeps_guided_page_and_drops_existing_explorer(self) -> None:
        rendered = (
            f'<urlset xmlns="{SITEMAP_NS}">\n'
            f"    <url>\n         <loc>{SITE_URL}</loc>\n    </url>\n"
            f"    <url>\n         <loc>{SITE_URL}explore/</loc>\n    </url>\n"
            f"    <url>\n         <loc>{SITE_URL}scenario/</loc>\n    </url>\n"
            "</urlset>\n"
        )
        out = checks.on_post_template(rendered, template_name="sitemap.xml", config=self.publication)
        self.assertNotIn("scenario/", out)
        self.assertIn(f"<loc>{SITE_URL}explore/</loc>", out)
        self.assertIn(f"<loc>{SITE_URL}</loc>", out)
        kept = checks.on_post_template(rendered, template_name="sitemap.xml", config=self.preview)
        self.assertEqual(kept, rendered)

    def test_guided_arm_applies_in_publication_build(self) -> None:
        self.write("explore/index.html", '<div id="gre-explore"></div>')
        for arm in ("_application_subtree", "_tableau_exclusion", "_publication_inventory"):
            patch.object(checks, arm, lambda *a, **k: iter(())).start()
        config = SimpleNamespace(site_dir=str(self.site), **vars(self.publication))
        with self.assertRaises(checks.PluginError) as raised:
            checks.on_post_build(config=config)
        self.assertIn("(f) guided explorer: assets/explore/", str(raised.exception))


class PublicationConfigTest(unittest.TestCase):
    """The committed configurations list explore/ in the nav (PDD D-52) and
    keep scenario/ unlisted (PDD D-39)."""

    def setUp(self) -> None:
        cwd = os.getcwd()
        os.chdir(MKDOCS_ROOT)
        self.addCleanup(os.chdir, cwd)

    def test_guided_page_listed_and_existing_explorer_unlisted(self) -> None:
        from mkdocs.config import load_config
        from mkdocs.structure.files import get_files

        for name in ("mkdocs.yml", "mkdocs.preview.yml"):
            levels = {f.src_uri: f.inclusion for f in get_files(load_config(name))}
            self.assertIs(levels["scenario.md"], InclusionLevel.NOT_IN_NAV, name)
            self.assertIs(levels["explore.md"], InclusionLevel.INCLUDED, name)

    def test_guided_page_sits_after_dashboards_before_data(self) -> None:
        from mkdocs.config import load_config

        for name in ("mkdocs.yml", "mkdocs.preview.yml"):
            titles = [next(iter(item)) for item in load_config(name)["nav"]]
            at = titles.index("Ground Rupture Explorer")
            self.assertEqual(titles[at - 1 : at + 2], ["Dashboards", "Ground Rupture Explorer", "Data"], name)
            self.assertEqual(load_config(name)["nav"][at], {"Ground Rupture Explorer": "explore.md"}, name)

    def test_guided_page_and_assets_are_not_drafted(self) -> None:
        from mkdocs.config import load_config
        from mkdocs.structure.files import get_files

        for name in ("mkdocs.yml", "mkdocs.preview.yml"):
            files = get_files(load_config(name))
            drafted = [f.src_uri for f in files if f.inclusion is InclusionLevel.DRAFT]
            self.assertTrue(all(uri.startswith("media/dev/") for uri in drafted), (name, drafted))
            self.assertTrue(
                any(f.src_uri.startswith("assets/explore/") for f in files),
                f"{name}: stage the guided assets (exploreAssets) before these tests",
            )

    def test_guided_page_is_searchable_and_keeps_its_toc_hidden(self) -> None:
        text = (MKDOCS_ROOT / "docs" / "explore.md").read_text(encoding="utf-8")
        front = text.split("---", 2)[1]
        self.assertNotRegex(front, r"search:")
        self.assertRegex(front, r"hide:\s*\n\s+-\s*toc")


if __name__ == "__main__":
    unittest.main()
