#!/usr/bin/env python3
"""Lint the traceability matrices of the DDD and the implementation plan.

The matrix tables of docs/app/ddd.md §8.1–§8.4 and of docs/app/ip.md
§7.1–§7.4 map each obligation of the approved documents to the element that
holds it and the checks planned to evidence it. This lint applies the rules
of the *Verification (planned):* paragraph that closes DDD §8.4, with the
entry forms and the Status precedence that DDD §8 defines; where this file
and that paragraph differ, the paragraph governs. It checks each row's form
and citations and each IP §7 row's DDD §8 twin, never that the matrix is
complete. Standard library only.

Usage: python3 .github/scripts/check_traceability.py [--release]

It prints one line per failed check, naming the document, line, and row,
then `gap rows: <n>`, the number of DDD §8 rows whose Status is `gap` (the
IP §7 mirrors do not add to it). It exits 1 on any failed check. With
--release, item 16 of the release checklist (DDD §7.7), it also exits 1
unless n is 0.

The files of the DDD §7.3, §7.4, and §7.5 **Inventory.** paragraphs, the
§4.1 export rules, and the tasks, gates, and owner actions of IP §2–§4 are
read from the committed documents, never copied here. A file an Inventory
paragraph lists is a Python or TypeScript file named in a code span of the
paragraph's text or of its table's first column; the data file that the
§7.3 paragraph names, `full_data_required.txt`, is "not a test" there.
"""

from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
DDD = "docs/app/ddd.md"
IP = "docs/app/ip.md"

HEADER = "| Source | Obligation | Home | Kind | Check | Status |"
COLUMNS = ("Source", "Obligation", "Home", "Kind", "Check", "Status")
SOURCE, OBLIGATION, HOME, KIND, CHECK, STATUS = range(6)
KINDS = ("text", "test", "measure", "release", "owner", "schedule", "n/a")
STATUSES = ("designed", "planned", "owner-pending", "parked", "deferred", "gap", "n/a")
KEPT = ("gap", "parked", "deferred")  # the §8 precedence keeps these as rendered

# The files that the DDD §8.4 paragraph names as in no inventory.
NO_INVENTORY = frozenset({
    ".github/workflows/tests.yml",
    ".github/workflows/mkdocs.yml",
    ".github/scripts/check_pdd_agreement.py",
    ".github/scripts/test_check_pdd_agreement.py",
    "subprojects/mkdocs/hooks/site_checks.py",
    "subprojects/webapp/test/parity.ts",
    "subprojects/python/tests/test_regression_views.py",
})  # fmt: skip
# Any other test path is matched by base name against its directory's inventory.
INVENTORY_DIRS = (
    ("subprojects/python/tests/", "7.3"),
    ("subprojects/webapp/test/", "7.4"),
    ("subprojects/webapp/playwright/specs/", "7.5"),
)
CHECK_FILE_SUFFIXES = (".py", ".ts")

# The entry forms of DDD §8, by kind; every other entry is a text check.
TASK_LIST = r"\(T-[0-9]{2}(?:, T-[0-9]{2})*\)"
TEST_START = re.compile(r"subprojects/|\.github/|§4\.1 step [0-9]+ rule")
ENDS_WITH_TASK_LIST = re.compile(rf"{TASK_LIST}$")
MEASURE = re.compile(rf"(?:§7\.6 report: |§3\.8: ).+ {TASK_LIST}")
RELEASE = re.compile(r"§7\.7 item [0-9]+(?: \(.*\))?")
OWNER = re.compile(r"(?:OA|G)-[0-9]+")
SCHEDULE = re.compile(r"T-[0-9]{2}|IP §5(?: \(.*\))?")
DEFERRAL = re.compile(r"§9")  # a schedule entry in a parked or deferred row
NOT_APPLICABLE = "—"
EXPORT_RULE = re.compile(rf"§4\.1 step ([0-9]+) (rules?)\b(.*?)(?: ?{TASK_LIST})?")
CITATION = re.compile(r"\b(T-[0-9]{2}|OA-[0-9]+|G-[0-9]+)\b")
OUTCOME_WORD = re.compile(r"\b(passed|verified|satisfied|discharged)\b", re.IGNORECASE)

FENCE = re.compile(r"^ {0,3}(`{3,}|~{3,})(.*)$")
HEADING = re.compile(r"^ {0,3}(#{1,6})(?:[ \t]+(.*?))?[ \t]*$")
TABLE_LINE = re.compile(r"^ {0,3}\|")
TABLE_DELIM = re.compile(r"^\s*\|?\s*:?-+:?\s*(?:\|\s*:?-+:?\s*)*\|?\s*$")
LIST_ITEM = re.compile(r"^ {0,3}[-*+][ \t]+(.*)$")
STEP = re.compile(r"([0-9]+)\. ")
STEP_ITEM = re.compile(r"^[ \t]+[-*+][ \t]+(.*)$")
RULE_ITEM = re.compile(r"(?:Rule )?`([^`]+)`")
CODE_SPAN = re.compile(r"`([^`]+)`")


class StructureError(Exception):
    """A document lacks a structure the lint reads."""


@dataclass
class Doc:
    """A Markdown document as lines, with its headings and fenced-code lines."""

    path: str
    lines: list[str]
    fenced: list[bool] = field(default_factory=list)
    headings: list[tuple[int, int, str]] = field(default_factory=list)

    @classmethod
    def read(cls, path: str) -> Doc:
        text = (REPO / path).read_text(encoding="utf-8")
        doc = cls(path, [line.removesuffix("\r") for line in text.split("\n")])
        fence = ""
        for i, line in enumerate(doc.lines):
            m = FENCE.match(line)
            if fence:
                doc.fenced.append(True)
                closes = m and m.group(1)[0] == fence[0] and len(m.group(1)) >= len(fence)
                if closes and not m.group(2).strip():
                    fence = ""
                continue
            if m and not (m.group(1)[0] == "`" and "`" in m.group(2)):
                fence = m.group(1)
                doc.fenced.append(True)
                continue
            doc.fenced.append(False)
            if h := HEADING.match(line):
                doc.headings.append((i, len(h.group(1)), h.group(2) or ""))
        return doc

    def section(
        self, number: str, level: int, within: tuple[int, int] | None = None
    ) -> tuple[int, int]:
        """The line range of the body of the heading numbered `number` ("8" or "8.1")."""
        lo, hi = within or (0, len(self.lines))
        prefix = number + (" " if "." in number else ". ")
        for k, (i, lev, text) in enumerate(self.headings):
            if lo <= i < hi and lev == level and text.startswith(prefix):
                later = (j for j, lv, _ in self.headings[k + 1 :] if lv <= level)
                return i + 1, min(next(later, len(self.lines)), hi)
        raise StructureError(f"{self.path}: no heading '{'#' * level} {prefix}…'")

    def tables(self, span: tuple[int, int]) -> list[list[int]]:
        """The tables in a line range, each as the indices of its lines.

        A table opens at a line that begins with '|' and, as GitHub renders it
        (GFM), runs to the first blank line, heading, or fenced line; a line
        without a leading '|' before that end is a row of the table.
        """
        blocks: list[list[int]] = []
        inside = False
        for i in range(*span):
            line = self.lines[i]
            if self.fenced[i] or not line.strip() or HEADING.match(line):
                inside = False
            elif inside:
                blocks[-1].append(i)
            elif TABLE_LINE.match(line):
                blocks.append([i])
                inside = True
        return blocks


def split_cells(line: str) -> list[str]:
    """Split a table row into its cells at each unescaped '|', trimming each cell."""
    s = line.strip()
    cells, current, backslashes, ends_with_pipe = [], [], 0, False
    for c in s:
        ends_with_pipe = c == "|" and backslashes % 2 == 0
        if ends_with_pipe:
            cells.append("".join(current))
            current = []
        else:
            current.append(c)
        backslashes = backslashes + 1 if c == "\\" else 0
    cells.append("".join(current))
    if s.startswith("|"):
        cells = cells[1:]
    if ends_with_pipe:
        cells = cells[:-1]
    return [c.strip() for c in cells]


def first_cell(line: str) -> str:
    """The first cell of a table row, or "" for a row without cells."""
    cells = split_cells(line)
    return cells[0] if cells else ""


def entries(check: str) -> list[str]:
    """The entries of a Check cell: split at ';', each trimmed."""
    return [e.strip() for e in check.split(";")]


def kind_of(entry: str, status: str) -> str:
    """The kind an entry takes by its DDD §8 form, in a row of the given Status."""
    if TEST_START.match(entry):
        return "test"
    if MEASURE.fullmatch(entry):
        return "measure"
    if RELEASE.fullmatch(entry):
        return "release"
    if OWNER.fullmatch(entry):
        return "owner"
    if SCHEDULE.fullmatch(entry):
        return "schedule"
    if status in ("parked", "deferred") and DEFERRAL.fullmatch(entry):
        return "schedule"
    if entry == NOT_APPLICABLE:
        return "n/a"
    return "text"


def precedence(kinds: set[str]) -> str:
    """The §8 Status of a row whose Kind is not n/a and whose Status is not kept."""
    if "owner" in kinds:
        return "owner-pending"
    if kinds & {"test", "measure", "release"}:
        return "planned"
    return "designed"


@dataclass
class Row:
    doc: str
    line: int
    cells: list[str]

    @property
    def key(self) -> tuple[str, str]:
        return self.cells[SOURCE], self.cells[OBLIGATION]


@dataclass
class References:
    """What a Check cell may cite, read from the committed documents."""

    inventories: dict[str, frozenset[str]]
    rules: dict[int, frozenset[str]]
    tasks: frozenset[str]
    gates: frozenset[str]
    owner_actions: frozenset[str]


def inventory(ddd: Doc, number: str) -> frozenset[str]:
    """The base names of the files that the **Inventory.** paragraph of DDD §number lists."""
    lo, hi = ddd.section(number, 3, ddd.section(number.split(".")[0], 2))
    for start in range(lo, hi):
        if not ddd.fenced[start] and ddd.lines[start].startswith("**Inventory.**"):
            break
    else:
        raise StructureError(f"{ddd.path}: no **Inventory.** paragraph in §{number}")
    end = start
    while end < hi and ddd.lines[end].strip() and not ddd.fenced[end]:
        end += 1
    spans = CODE_SPAN.findall(" ".join(ddd.lines[start:end]))
    following = next((i for i in range(end, hi) if ddd.lines[i].strip()), hi)
    table = next((t for t in ddd.tables((following, hi)) if t[0] == following), [])
    for i in table[1:]:  # the first column below the header
        if not TABLE_DELIM.match(ddd.lines[i]):
            spans += CODE_SPAN.findall(first_cell(ddd.lines[i]))
    names = {span.rsplit("/", 1)[-1] for span in spans}
    return frozenset(name for name in names if name.endswith(CHECK_FILE_SUFFIXES))


def export_rules(ddd: Doc) -> dict[int, frozenset[str]]:
    """Per step of DDD §4.1, the names its items open with, alone or after 'Rule'."""
    lo, hi = ddd.section("4.1", 3, ddd.section("4", 2))
    steps: dict[int, set[str]] = {}
    step = None
    for i in range(lo, hi):
        line = ddd.lines[i]
        if ddd.fenced[i] or not line.strip():
            continue
        if m := STEP.match(line):
            step = int(m.group(1))
            steps.setdefault(step, set())
        elif not line[0].isspace():
            step = None  # a paragraph at the margin ends the list of steps
        elif step is not None and (item := STEP_ITEM.match(line)):
            if rule := RULE_ITEM.match(item.group(1)):
                steps[step].add(rule.group(1))
    if not steps:
        raise StructureError(f"{ddd.path}: no numbered steps in §4.1")
    return {n: frozenset(names) for n, names in steps.items()}


def first_cells(doc: Doc, span: tuple[int, int], pattern: str) -> frozenset[str]:
    """The first cells, matching `pattern`, of the table rows in a line range."""
    cells = (first_cell(doc.lines[i]) for table in doc.tables(span) for i in table)
    return frozenset(cell for cell in cells if re.fullmatch(pattern, cell))


def references(ddd: Doc, ip: Doc) -> References:
    lo, hi = ip.section("4", 2)
    owner_actions = set()
    for i in range(lo, hi):
        item = None if ip.fenced[i] else LIST_ITEM.match(ip.lines[i])
        if item and (m := re.match(r"\*\*(OA-[0-9]+)\*\*", item.group(1))):
            owner_actions.add(m.group(1))
    return References(
        inventories={number: inventory(ddd, number) for _, number in INVENTORY_DIRS},
        rules=export_rules(ddd),
        tasks=first_cells(ip, ip.section("2", 2), r"T-[0-9]{2}"),
        gates=first_cells(ip, ip.section("3", 2), r"G-[0-9]+"),
        owner_actions=frozenset(owner_actions),
    )


class Lint:
    def __init__(self, refs: References) -> None:
        self.refs = refs
        self.failures: list[tuple[str, int, str]] = []

    def fail(self, doc: str, line: int, message: str) -> None:
        self.failures.append((doc, line, message))

    def fail_row(self, row: Row, message: str) -> None:
        name = f"{row.cells[SOURCE]} | {row.cells[OBLIGATION]}"
        self.fail(row.doc, row.line, f"row '{name}': {message}")

    def matrix(self, doc: Doc, part: str, subsections: tuple[str, ...]) -> list[Row]:
        """Lint every table of the given subsections; return their rows."""
        rows: list[Row] = []
        for number in subsections:
            span = doc.section(number, 3, doc.section(part, 2))
            tables = doc.tables(span)
            if not tables:
                self.fail(doc.path, span[0], f"§{number} holds no matrix table")
            for table in tables:
                rows += self.table(doc, table)
        return rows

    def table(self, doc: Doc, table: list[int]) -> list[Row]:
        head, *body = table
        if doc.lines[head] != HEADER:
            message = f"table header '{doc.lines[head]}' is not exactly '{HEADER}'"
            self.fail(doc.path, head + 1, message)
        if body and TABLE_DELIM.match(doc.lines[body[0]]):
            body = body[1:]
        else:
            self.fail(doc.path, head + 1, "table header is not followed by a delimiter row")
        rows = []
        for i in body:
            cells = split_cells(doc.lines[i])
            if len(cells) != 6:
                self.fail(doc.path, i + 1, f"table row has {len(cells)} cells, not six")
                continue
            row = Row(doc.path, i + 1, cells)
            self.row(row)
            rows.append(row)
        return rows

    def row(self, row: Row) -> None:
        kind, check, status = row.cells[KIND], row.cells[CHECK], row.cells[STATUS]
        parts = kind.split("+")
        for part in parts:
            if part not in KINDS:
                self.fail_row(row, f"Kind part '{part}' is not one of {', '.join(KINDS)}")
        if status not in STATUSES:
            self.fail_row(row, f"Status '{status}' is not one of {', '.join(STATUSES)}")

        items = entries(check)
        kinds = {kind_of(entry, status) for entry in items}
        if all(part in KINDS for part in parts) and set(parts) != kinds:
            found = "+".join(k for k in KINDS if k in kinds)
            self.fail_row(row, f"Kind '{kind}' is not the set of its entries' kinds, '{found}'")
        if kind == "n/a":
            if status != "n/a":
                self.fail_row(row, f"Status '{status}' must be 'n/a' for a row of Kind 'n/a'")
        elif status == "n/a":
            self.fail_row(row, f"Status 'n/a' requires Kind 'n/a', not '{kind}'")
        elif status in STATUSES and status not in KEPT and status != precedence(kinds):
            expected = precedence(kinds)
            self.fail_row(row, f"Status '{status}' should read '{expected}' by the §8 precedence")

        for entry in items:
            if kind_of(entry, status) == "test":
                self.test_entry(row, entry)

        for m in CITATION.finditer(check):
            cited = m.group(1)
            if cited.startswith("T-") and cited not in self.refs.tasks:
                self.fail_row(row, f"Check cites {cited}, not a task row of IP §2")
            elif cited.startswith("OA-") and cited not in self.refs.owner_actions:
                self.fail_row(row, f"Check cites {cited}, not an owner action of IP §4")
            elif cited.startswith("G-") and cited not in self.refs.gates:
                self.fail_row(row, f"Check cites {cited}, not a gate of IP §3")

        for column in (CHECK, STATUS):
            for m in OUTCOME_WORD.finditer(row.cells[column]):
                self.fail_row(row, f"{COLUMNS[column]} cell carries the word '{m.group(1)}'")

    def test_entry(self, row: Row, entry: str) -> None:
        if not ENDS_WITH_TASK_LIST.search(entry):
            self.fail_row(row, f"test entry '{entry}' does not end with its task list (T-nn)")
        if entry.startswith(("subprojects/", ".github/")):
            self.test_path(row, re.split(r"::| ", entry, maxsplit=1)[0])
            return
        m = EXPORT_RULE.fullmatch(entry)
        if m is None:
            self.fail_row(row, f"export-rule entry '{entry}' names no rule")
            return
        step, plural, cited = int(m.group(1)), m.group(2) == "rules", m.group(3).strip()
        names = [name.strip() for name in cited.split(",")] if plural else [cited]
        defined = self.refs.rules.get(step, frozenset())
        for name in names:
            if name not in defined:
                message = f"export-rule entry '{entry}' cites '{name}', not a rule of DDD §4.1"
                self.fail_row(row, f"{message} step {step}")

    def test_path(self, row: Row, path: str) -> None:
        if path in NO_INVENTORY:
            return
        for directory, number in INVENTORY_DIRS:
            if path.startswith(directory):
                if path.rsplit("/", 1)[-1] not in self.refs.inventories[number]:
                    paragraph = f"the **Inventory.** paragraph of DDD §{number}"
                    self.fail_row(row, f"test entry path '{path}' names no file {paragraph} lists")
                return
        where = "under no inventory's directory and not one of the files no inventory lists"
        self.fail_row(row, f"test entry path '{path}' names no check the DDD defines: {where}")

    def unique(self, rows: list[Row], where: str) -> dict[tuple[str, str], Row]:
        """Fail every repeated (Source, Obligation) key; return the first row of each key."""
        first: dict[tuple[str, str], Row] = {}
        for row in rows:
            if row.key in first:
                line = first[row.key].line
                self.fail_row(row, f"(Source, Obligation) repeats in {where}; first at line {line}")
            else:
                first[row.key] = row
        return first

    def twins(self, ip_rows: list[Row], ddd_keys: dict[tuple[str, str], Row]) -> None:
        """Fail every IP §7 row that differs from the DDD §8 row with its key."""
        for row in ip_rows:
            twin = ddd_keys.get(row.key)
            if twin is None:
                self.fail_row(row, "no DDD §8 row has this (Source, Obligation)")
                continue
            differing = ", ".join(COLUMNS[c] for c in range(6) if row.cells[c] != twin.cells[c])
            if differing:
                where = f"{twin.doc}:{twin.line}"
                self.fail_row(row, f"differs from its DDD §8 twin ({where}) in {differing}")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n", 1)[0])
    parser.add_argument(
        "--release",
        action="store_true",
        help="also exit non-zero unless no DDD §8 row reads gap (release-checklist item 16)",
    )
    args = parser.parse_args(argv)

    try:
        ddd, ip = Doc.read(DDD), Doc.read(IP)
        lint = Lint(references(ddd, ip))
        ddd_rows = lint.matrix(ddd, "8", ("8.1", "8.2", "8.3", "8.4"))
        ip_rows = lint.matrix(ip, "7", ("7.1", "7.2", "7.3", "7.4"))
    except (StructureError, OSError) as exc:
        print(f"error: {exc}")
        return 1
    lint.twins(ip_rows, lint.unique(ddd_rows, "DDD §8"))
    lint.unique(ip_rows, "IP §7")

    gaps = [row for row in ddd_rows if row.cells[STATUS] == "gap"]
    if args.release:
        for row in gaps:
            lint.fail_row(row, "Status 'gap' fails a release (--release)")

    order = {DDD: 0, IP: 1}
    for doc, line, message in sorted(lint.failures, key=lambda f: (order[f[0]], f[1])):
        print(f"{doc}:{line}: {message}")
    n = len(lint.failures)
    status = f"{n} failed check{'s' if n != 1 else ''}" if n else "no failed check"
    linted = f"{len(ddd_rows)} rows of {DDD} §8.1–§8.4 and {len(ip_rows)} rows of {IP} §7.1–§7.4"
    print(f"Linted {linted}: {status}.")
    print(f"gap rows: {len(gaps)}")
    return 1 if lint.failures else 0


if __name__ == "__main__":
    sys.exit(main())
