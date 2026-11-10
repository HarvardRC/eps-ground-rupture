"""The ODC-By 1.0 notice on the site's pages (G-28; data/REDISTRIBUTION.md).

Every embedded dashboard, and the existing explorer's page, carries the
notice the DEM experiments' licence asks for, in exactly the words of the
registry entry `ddd5.9.licenceNotice` that the downloads and the guided
page read, with the licence's name linked to its text.
"""

from __future__ import annotations

import json
import re
import unittest
from pathlib import Path

MKDOCS_ROOT = Path(__file__).resolve().parents[1]
DOCS = MKDOCS_ROOT / "docs"
COPY = MKDOCS_ROOT.parent / "webapp" / "src" / "views" / "copy.json"
REDISTRIBUTION = MKDOCS_ROOT.parents[1] / "data" / "REDISTRIBUTION.md"

ODC_BY_NAME = "Open Data Commons Attribution License (ODC-By 1.0)"
ODC_BY_URL = "https://opendatacommons.org/licenses/by/1-0/"
DASHBOARDS = ["distributions", "model-vs-reality", "per-event-boxplots", "response-curves", "slip-regression"]
NOTICE_LINE = re.compile(r"^(Contains information from .*)\n\{ \.licence-notice \}$", re.M)
LINK = re.compile(r"\[([^\]]+)\]\(([^)]+)\)")


def registry_notice() -> str:
    entries = json.loads(COPY.read_text(encoding="utf-8"))
    return next(e["text"] for e in entries if e["key"] == "ddd5.9.licenceNotice")


def notices(page: Path) -> list[str]:
    return NOTICE_LINE.findall(page.read_text(encoding="utf-8"))


class LicenceNoticeTest(unittest.TestCase):
    def assert_notice(self, markdown: str, where: str) -> None:
        links = LINK.findall(markdown)
        self.assertEqual(links, [(ODC_BY_NAME, ODC_BY_URL)], where)
        self.assertEqual(LINK.sub(r"\1", markdown), registry_notice(), where)

    def test_registry_notice_is_the_redistribution_sentence(self) -> None:
        # The quoted notice of data/REDISTRIBUTION.md, its lines joined.
        quoted = " ".join(
            line[2:].strip() for line in REDISTRIBUTION.read_text(encoding="utf-8").splitlines() if line.startswith("> ")
        )
        self.assertIn(registry_notice(), quoted)

    def test_every_embedded_dashboard_carries_the_notice(self) -> None:
        for name in DASHBOARDS:
            page = DOCS / "dashboards" / f"{name}.md"
            text = page.read_text(encoding="utf-8")
            embeds = text.count("<tableau-viz ")
            found = notices(page)
            self.assertGreaterEqual(embeds, 1, name)
            self.assertEqual(len(found), embeds, f"{name}: one notice per embedded dashboard")
            for notice in found:
                self.assert_notice(notice, name)

    def test_existing_explorer_page_carries_the_notice_after_its_mount(self) -> None:
        page = DOCS / "scenario.md"
        text = page.read_text(encoding="utf-8")
        found = notices(page)
        self.assertEqual(len(found), 1)
        self.assert_notice(found[0], "scenario.md")
        # Directly after the application's mount, before the disclaimer.
        self.assertLess(text.index('<div id="gre-root"'), text.index(found[0]))
        self.assertLess(text.index(found[0]), text.index('<div id="gre-disclaimer"'))


if __name__ == "__main__":
    unittest.main()
