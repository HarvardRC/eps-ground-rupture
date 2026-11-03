"""Self-tests of check_pdd_agreement.py (docs/app/ddd.md §5.13).

Each case builds a temporary repository — the two scripts under
.github/scripts/, a fixture PDD and DDD, config.json, copy.json, and a
scenario.md with its copy-marked blocks — applies one change, runs the
script there, and asserts its exit status. Standard library only.

Run: python3 -m unittest discover -s .github/scripts -p 'test_*.py'
"""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent

PDD = """\
# Fixture PDD

<!-- toc -->

- [4.1 Measurement views](#41-measurement-views)
- [4.5 Small and empty results (D-11)](#45-small-and-empty-results-d-11)
- [5. Copy deck](#5-copy-deck)

<!-- tocstop -->

## 4. Results

### 4.1 Measurement views

Deformation-zone width may offer a log scale toggle where the matched
range spans more than two decades.

### 4.2 Statistics table

Displayed values round to the precisions — scarp
height and fault slip 0.01 m; deformation-zone width 0.1 m; scarp
dip 1°; counts exact; shares whole
percentages.

### 4.5 Small and empty results (D-11)

- **N < 30 valid** for a displayed measurement: a warning.
- **N < 10 valid:** the chart is suppressed.

### 4.6 Low-slip caveat

When an active window includes slip below
0.5 m, the results carry the caveat.

## 5. Copy deck

### 5.1 Standing disclaimer (D-10 Open)

> The tool is provided without warranty, subject to
> [the project's liability limitations — text pending, D-10]. It shows
> conditional results.

### 5.2 Short disclaimer

> Research tool: simulated results, not site predictions. [Full disclaimer →]

### 5.3 Population explainer

> **All stages** counts every recorded stage. **One state** counts the
> last stage of each simulation.

### 5.10 Inverse-search framing

> Conditions consistent with the observation.

### 5.11 Labels and glossary links

Canonical labels: Scarp height (m) · Deformation-zone width (m).
Glossary anchors: scarp height `#scarp-height` · deformation-zone
width `#dzw`.

### 5.12 Morphology descriptions

> **Monoclinal** — a smooth ramp.
> **Monoclinal Collapse** — the ramp after failure.
> **Pressure Ridge** — a mound at the scarp front.
> **Pressure Ridge Collapse** — a degraded mound.
> **Simple** — a clean, steep face.
> **Simple Collapse** — a failed face.

### 5.13 Measurement explanation

> Every simulated land surface was measured automatically.

## 6. Downloads

Nothing here.
"""

DDD_REGISTER = """\
| Entry | `value` | `decision`; `source` | `quote` | `quoted` |
|---|---|---|---|---|
| `smallResultWarnBelow` | 30 | D-11 | "N < 30 valid" | "30" |
| `chartFloorBelow` | 10 | D-11 | "N < 10 valid" | "10" |
| `lowSlipCaveatBelowMetres` | 0.5 | D-4 | "includes slip below 0.5 m" | "0.5" |
| `displayPrecision.scarp_height` | 0.01 | D-23 | "scarp height and fault slip 0.01 m" | "0.01" |
| `displayPrecision.slip` | 0.01 | D-23 | "scarp height and fault slip 0.01 m" | "0.01" |
| `displayPrecision.dzw` | 0.1 | D-23 | "deformation-zone width 0.1 m" | "0.1" |
| `displayPrecision.scarp_dip` | 1 | D-23 | "scarp dip 1°" | "1" |
| `displayPrecision.counts` | "exact" | D-23 | "counts exact" | "exact" |
| `displayPrecision.shares` | "whole percentages" | D-23 | "shares whole …" | "whole …" |
| `logScaleMinDecades` | 2 | null | "more than two decades" | "two" |
| `offer.dominanceGapPoints` (P2) | 10 | D-7 | "within 10 percentage points" | "10" |
| `offer.typeCap` (P2) | 3 | D-7 | "up to three types" | "three" |
"""

FALLBACK = """\
The interactive page needs JavaScript. Read the
[full disclaimer](#gre-disclaimer) below.

<noscript><p>The controls need JavaScript.</p></noscript>"""

GLOSSARY_BLOCK = """\
PFDHA
:   Probabilistic fault-displacement hazard analysis."""

DDD = f"""\
# Fixture DDD

## 5. Application design

### 5.8 View layer

The prototype notice reads "This page is an unlisted prototype." at the
head of the results header.

### 5.10 Failure states

```markdown
{FALLBACK}
```

### 5.13 Application configuration

{DDD_REGISTER}
## 6. Build

### 6.4 Product pages beyond the scenario page (P2/P3)

```markdown
{GLOSSARY_BLOCK}
```
"""

SCENARIO = f"""\
---
search:
  exclude: true
---

# Ground Rupture Explorer

<div id="gre-root" markdown="1">
<!-- copy:docs/app/ddd.md#510-failure-states -->
{FALLBACK}
<!-- /copy -->
</div>

<div id="gre-disclaimer" markdown="1">
<!-- copy:docs/app/pdd.md#51-standing-disclaimer-d-10-open -->
The tool is provided without warranty, subject to
[the project's liability limitations — text pending, D-10]. It shows
conditional results.
<!-- /copy -->
</div>
"""

GLOSSARY = """\
# Glossary

## Scarp height

The vertical height of the scarp.
"""

SRC_45 = "docs/app/pdd.md#45-small-and-empty-results-d-11"
SRC_42 = "docs/app/pdd.md#42-statistics-table"


def entry(value, source, quote, quoted, decision="D-23"):
    return {"value": value, "governs": "fixture", "decision": decision,
            "source": source, "quote": quote, "quoted": quoted}  # fmt: skip


def config() -> dict:
    return {
        "smallResultWarnBelow": entry(30, SRC_45, "N < 30 valid", "30", "D-11"),
        "chartFloorBelow": entry(10, SRC_45, "N < 10 valid", "10", "D-11"),
        "lowSlipCaveatBelowMetres": entry(
            0.5, "docs/app/pdd.md#46-low-slip-caveat", "includes slip below 0.5 m", "0.5", "D-4"
        ),
        "displayPrecision.scarp_height": entry(
            0.01, SRC_42, "scarp height and fault slip 0.01 m", "0.01"
        ),
        "displayPrecision.slip": entry(0.01, SRC_42, "scarp height and fault slip 0.01 m", "0.01"),
        "displayPrecision.dzw": entry(0.1, SRC_42, "deformation-zone width 0.1 m", "0.1"),
        "displayPrecision.scarp_dip": entry(1, SRC_42, "scarp dip 1°", "1"),
        "displayPrecision.counts": entry("exact", SRC_42, "counts exact", "exact"),
        "displayPrecision.shares": entry(
            "whole percentages", SRC_42, "shares whole percentages", "whole percentages"
        ),
        "logScaleMinDecades": entry(
            2, "docs/app/pdd.md#41-measurement-views", "more than two decades", "two", None
        ),
    }


def copy_entry(key, source, part, text, slots=()):
    return {"key": key, "source": source, "part": part, "text": text, "slots": list(slots)}


def copy() -> list:
    return [
        copy_entry(
            "pdd5.2.shortDisclaimer", "docs/app/pdd.md#52-short-disclaimer", 0,
            "Research tool: simulated results, not site predictions. [Full disclaimer →]",
        ),
        copy_entry(
            "pdd5.3.allStages", "docs/app/pdd.md#53-population-explainer", 0,
            "**All stages** counts every recorded stage.",
        ),
        copy_entry(
            "pdd5.3.oneState", "docs/app/pdd.md#53-population-explainer", 1,
            "**One state** counts the last stage of each simulation.",
        ),
        copy_entry(
            "pdd5.11.heightLabel", "docs/app/pdd.md#511-labels-and-glossary-links", 0,
            "Scarp height (m)",
        ),
        copy_entry(
            "ddd5.8.prototypeNotice", "docs/app/ddd.md#58-view-layer", 0,
            "This page is an unlisted prototype.",
        ),
    ]  # fmt: skip


class PddAgreementTest(unittest.TestCase):
    def setUp(self) -> None:
        self.root = Path(tempfile.mkdtemp(prefix="pdd-agreement-"))
        self.addCleanup(shutil.rmtree, self.root)
        scripts = self.root / ".github" / "scripts"
        scripts.mkdir(parents=True)
        for name in ("check_pdd_agreement.py", "check_doc_links.py"):
            shutil.copy(SCRIPTS / name, scripts / name)
        self.write("docs/app/pdd.md", PDD)
        self.write("docs/app/ddd.md", DDD)
        self.write("subprojects/mkdocs/docs/scenario.md", SCENARIO)
        self.config = config()
        self.copy = copy()

    def write(self, rel: str, text: str) -> None:
        path = self.root / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")

    def edit(self, rel: str, old: str, new: str) -> None:
        path = self.root / rel
        text = path.read_text(encoding="utf-8")
        self.assertIn(old, text, f"fixture {rel} lacks {old!r}")
        path.write_text(text.replace(old, new, 1), encoding="utf-8")

    def run_check(self) -> subprocess.CompletedProcess[str]:
        self.write(
            "subprojects/webapp/src/config.json", json.dumps(self.config, ensure_ascii=False)
        )
        self.write(
            "subprojects/webapp/src/views/copy.json", json.dumps(self.copy, ensure_ascii=False)
        )
        return subprocess.run(
            [sys.executable, str(self.root / ".github/scripts/check_pdd_agreement.py")],
            capture_output=True, text=True, cwd=self.root,
        )  # fmt: skip

    def assertExit(self, status: int, contains: str = "") -> str:
        result = self.run_check()
        self.assertEqual(result.returncode, status, result.stdout + result.stderr)
        self.assertIn(contains, result.stdout)
        return result.stdout

    # ------------------------------------------------------------- exit 0

    def test_fixture_agrees(self) -> None:
        out = self.assertExit(0)
        self.assertNotIn("FAIL", out)
        self.assertIn("fixed-here ddd5.8.prototypeNotice ", out)
        self.assertIn(
            "copy-block subprojects/mkdocs/docs/scenario.md:9 docs/app/ddd.md#510-failure-states ",
            out,
        )
        self.assertIn("copy-deck docs/app/pdd.md#51-standing-disclaimer-d-10-open ", out)

    def test_absent_webapp_src_skips(self) -> None:
        self.run_check()
        shutil.rmtree(self.root / "subprojects/webapp/src")
        result = subprocess.run(
            [sys.executable, str(self.root / ".github/scripts/check_pdd_agreement.py")],
            capture_output=True, text=True, cwd=self.root,
        )  # fmt: skip
        self.assertEqual(result.returncode, 0, result.stdout)
        self.assertIn("skip", result.stdout)

    def test_valid_heading_missing_from_toc(self) -> None:
        self.edit("docs/app/pdd.md", "- [4.1 Measurement views](#41-measurement-views)\n", "")
        self.assertExit(0)

    def test_section_5_12_split_into_six_parts(self) -> None:
        source = "docs/app/pdd.md#512-morphology-descriptions"
        texts = [
            "**Monoclinal** — a smooth ramp.",
            "**Monoclinal Collapse** — the ramp after failure.",
            "**Pressure Ridge** — a mound at the scarp front.",
            "**Pressure Ridge Collapse** — a degraded mound.",
            "**Simple** — a clean, steep face.",
            "**Simple Collapse** — a failed face.",
        ]
        self.copy += [copy_entry(f"pdd5.12.type{i}", source, i, t) for i, t in enumerate(texts)]
        self.assertExit(0)
        self.copy[-1]["text"] = "**Simple Collapse** — a crumbled face."
        self.assertExit(1, "PDD §5.12")

    def test_disclaimer_block_carries_d10_slot_verbatim(self) -> None:
        scenario = (self.root / "subprojects/mkdocs/docs/scenario.md").read_text(encoding="utf-8")
        self.assertIn("[the project's liability limitations — text pending, D-10]", scenario)
        self.assertExit(0)

    def test_missing_p2_key(self) -> None:
        self.assertNotIn("offer.typeCap", self.config)
        self.assertExit(0)

    def test_no_entry_for_p2_list_subsection(self) -> None:
        self.assertFalse([e for e in self.copy if "#510-" in e["source"] or "#513-" in e["source"]])
        self.assertExit(0)

    def test_glossary_absent(self) -> None:
        self.assertFalse((self.root / "subprojects/mkdocs/docs/glossary.md").exists())
        self.assertExit(0)

    def test_glossary_without_copy_markers(self) -> None:
        self.write("subprojects/mkdocs/docs/glossary.md", GLOSSARY)
        out = self.assertExit(0)
        self.assertNotIn("glossary.md", out)

    def test_glossary_block_citing_ddd(self) -> None:
        source = "docs/app/ddd.md#64-product-pages-beyond-the-scenario-page-p2p3"
        self.write(
            "subprojects/mkdocs/docs/glossary.md",
            f"{GLOSSARY}\n<!-- copy:{source} -->\n{GLOSSARY_BLOCK}\n<!-- /copy -->\n",
        )
        self.assertExit(0, f"copy-block subprojects/mkdocs/docs/glossary.md:7 {source} ")

    # ------------------------------------------------------------- exit 1

    def test_renamed_heading_behind_stale_toc(self) -> None:
        self.edit(
            "docs/app/pdd.md",
            "### 4.5 Small and empty results (D-11)",
            "### 4.5 Small, empty, and partial results (D-11)",
        )
        self.assertExit(1, "#45-small-and-empty-results-d-11")

    def test_fragment_only_as_text(self) -> None:
        self.config["displayPrecision.dzw"]["source"] = "docs/app/pdd.md#dzw"
        self.assertExit(1, "displayPrecision.dzw")

    def test_value_29_with_quoted_30(self) -> None:
        self.config["smallResultWarnBelow"]["value"] = 29
        self.assertExit(1, "smallResultWarnBelow")

    def test_pdd_edited_to_n_below_25(self) -> None:
        self.edit("docs/app/pdd.md", "**N < 30 valid**", "**N < 25 valid**")
        self.assertExit(1, "smallResultWarnBelow")

    def test_one_word_change_in_copy_text(self) -> None:
        self.copy[0]["text"] = self.copy[0]["text"].replace("simulated", "modeled")
        self.assertExit(1, "pdd5.2.shortDisclaimer")

    def test_one_word_change_in_ddd_marked_block(self) -> None:
        self.edit(
            "subprojects/mkdocs/docs/scenario.md", "needs JavaScript. Read", "needs JavaScript. See"
        )
        self.assertExit(1, "scenario.md:9")

    def test_unknown_key(self) -> None:
        self.config["unknownSetting"] = entry(30, SRC_45, "N < 30 valid", "30", "D-11")
        self.assertExit(1, "unknownSetting")

    def test_missing_entry_for_copy_deck_subsection(self) -> None:
        self.copy = [e for e in self.copy if not e["key"].startswith("pdd5.2.")]
        self.assertExit(1, "PDD §5.2")

    def test_one_word_change_in_pdd_marked_block(self) -> None:
        self.edit(
            "subprojects/mkdocs/docs/scenario.md",
            "conditional results.\n<!--",
            "modeled results.\n<!--",
        )
        self.assertExit(1, "docs/app/pdd.md#51-standing-disclaimer-d-10-open")


if __name__ == "__main__":
    unittest.main()
