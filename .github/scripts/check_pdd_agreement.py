#!/usr/bin/env python3
"""Check the application's settings and copy against the PDD and DDD they cite.

The PDD-agreement check of DDD §5.13 (docs/app/ddd.md, Application
configuration): the settings registry subprojects/webapp/src/config.json,
the copy registry subprojects/webapp/src/views/copy.json, and the
copy-marked blocks of subprojects/mkdocs/docs/scenario.md and
subprojects/mkdocs/docs/glossary.md must agree with the sections of
docs/app/pdd.md and docs/app/ddd.md they cite. It implements steps 1-8
of §5.13 and nothing wider: where a cited text's format defeats these
readings, the remedy is a structured source or a narrow exception listed
here (as P2_SUBSECTIONS is), never a wider parser. Standard library only;
anchors follow the GitHub slug rule of check_doc_links.py, whose helpers
it reuses.

Usage: python3 .github/scripts/check_pdd_agreement.py

It prints one line per failure, then the SC-7 listing of step 8, and exits
1 on any failure.
"""

from __future__ import annotations

import hashlib
import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

from check_doc_links import ATX, FENCE, REPO, collect_refs, heading_text, resolve, scan, slug

PDD = "docs/app/pdd.md"
DDD = "docs/app/ddd.md"
WEBAPP_SRC = "subprojects/webapp/src"
CONFIG = "subprojects/webapp/src/config.json"
COPY = "subprojects/webapp/src/views/copy.json"
MARKED_FILES = ("subprojects/mkdocs/docs/scenario.md", "subprojects/mkdocs/docs/glossary.md")
REGISTER_ANCHOR = "513-application-configuration"  # DDD §5.13, the register table
CONFIG_FIELDS = ("value", "governs", "decision", "source", "quote", "quoted")
COPY_FIELDS = ("key", "source", "part", "text", "slots")

# Step 6's P2 list: PDD §5 subsections whose product surfaces ship with P2,
# exempt from the one-entry rule and compared only when they have entries —
# §5.10, used by inverse mode (DDD §5.14), and §5.12 and §5.13, used by the
# P2 pages. §5.1 lives between copy markers in scenario.md (step 7).
P2_SUBSECTIONS = frozenset({"5.10", "5.12", "5.13"})
EXCLUDED_SUBSECTION = "5.1"

QUOTE_PREFIX = re.compile(r"^ {0,3}> ?")
COPY_OPEN = re.compile(r"^<!-- copy:(\S+) -->$")
COPY_CLOSE = "<!-- /copy -->"
REGISTER_ROW = re.compile(r"^`([^`]+)`(\s*\(P2\))?$")
NUMERAL = re.compile(r"^[0-9]+(?:\.[0-9]+)?$")
WORDS = {w: n for n, w in enumerate("one two three four five six seven eight nine ten".split(), 1)}


def normalize(text: str) -> str:
    """§5.13 normalization: strip '> ' prefixes and '**', then collapse whitespace."""
    lines = []
    for line in text.split("\n"):
        while m := QUOTE_PREFIX.match(line):
            line = line[m.end() :]
        lines.append(line)
    return " ".join("\n".join(lines).replace("**", "").split())


def parse(quoted: str) -> object:
    """Step 4's parse: a decimal numeral as its number, one to ten as theirs."""
    if NUMERAL.match(quoted):
        return float(quoted) if "." in quoted else int(quoted)
    return WORDS.get(quoted, quoted)


def sha256(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def strict_text(text: str) -> str:
    """Step 7's comparison form for a block citing the DDD: LF line endings,
    trailing whitespace stripped from every line and from the end."""
    lines = text.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    return "\n".join(line.rstrip() for line in lines).rstrip()


# ------------------------------------------------------------- the walk


@dataclass
class Heading:
    anchor: str
    level: int
    text: str
    line: int  # 0-based index into Doc.lines


@dataclass
class Doc:
    """One Markdown file as step 2 walks it: its lines, which of them are
    fenced code, its ATX headings, and its fenced code blocks."""

    path: Path
    lines: list[str]
    fenced: list[bool]
    headings: list[Heading]
    blocks: list[tuple[int, str]] = field(default_factory=list)  # (opener line, content)

    def heading(self, anchor: str) -> Heading | None:
        return next((h for h in self.headings if h.anchor == anchor), None)

    def section_end(self, h: Heading) -> int:
        later = (k.line for k in self.headings if k.line > h.line and k.level <= h.level)
        return next(later, len(self.lines))

    def body(self, h: Heading) -> str:
        """The section's text outside fenced code, from its heading to the
        next heading of the same or a higher level."""
        end = self.section_end(h)
        return "\n".join(
            ln for i, ln in enumerate(self.lines[h.line : end], h.line) if not self.fenced[i]
        )

    def blockquotes(self, h: Heading) -> list[str]:
        """The section's blockquotes, each its consecutive '>' lines."""
        quotes: list[list[str]] = []
        previous = False
        for i in range(h.line + 1, self.section_end(h)):
            is_quote = not self.fenced[i] and QUOTE_PREFIX.match(self.lines[i]) is not None
            if is_quote:
                if not previous:
                    quotes.append([])
                quotes[-1].append(self.lines[i])
            previous = is_quote
        return ["\n".join(q) for q in quotes]

    def code_blocks(self, h: Heading) -> list[str]:
        end = self.section_end(h)
        return [content for line, content in self.blocks if h.line < line < end]


def walk(path: Path) -> Doc:
    """Step 2's walk: every ATX heading outside fenced code, its anchor by
    `slug` and the link checker's -N duplicate rule."""
    lines = [ln.expandtabs(4) for ln in path.read_text(encoding="utf-8-sig").split("\n")]
    refs = collect_refs(lines)
    fenced = [False] * len(lines)
    headings: list[Heading] = []
    blocks: list[tuple[int, str]] = []
    seen: dict[str, int] = {}
    fence: tuple[str, int, int, int] | None = None  # (char, length, indent, opener line)
    content: list[str] = []
    for i, line in enumerate(lines):
        rest = line
        while m := QUOTE_PREFIX.match(rest):
            rest = rest[m.end() :]
        m = FENCE.match(rest)
        if fence is not None:
            fenced[i] = True
            char, length, indent, opener = fence
            if m and m.group(2)[0] == char and len(m.group(2)) >= length and not m.group(3).strip():
                blocks.append((opener, "\n".join(content)))
                fence, content = None, []
            else:
                cut = min(indent, len(rest) - len(rest.lstrip(" ")))
                content.append(rest[cut:])
            continue
        if m and not (m.group(2)[0] == "`" and "`" in m.group(3)):
            fenced[i] = True
            fence, content = (m.group(2)[0], len(m.group(2)), len(m.group(1)), i), []
            continue
        if h := ATX.match(line):
            raw = h.group(1) or ""
            base = slug(heading_text(raw, refs))
            anchor = base
            while anchor in seen:
                seen[base] += 1
                anchor = f"{base}-{seen[base]}"
            seen[anchor] = 0
            level = len(line.lstrip(" ")) - len(line.lstrip(" ").lstrip("#"))
            headings.append(Heading(anchor, level, heading_text(raw, refs).strip(), i))
    if fence is not None:
        blocks.append((fence[3], "\n".join(content)))
    return Doc(path, lines, fenced, headings, blocks)


# ------------------------------------------------------------- the check


class Checker:
    def __init__(self, root: Path) -> None:
        self.root = root
        self.failures: list[str] = []
        self.docs: dict[Path, Doc] = {}
        self.scans: dict[Path, set[str]] = {}
        self.subsections: list[tuple[str, Doc, Heading]] | None = None

    def fail(self, message: str) -> None:
        self.failures.append(message)

    def rel(self, path: Path) -> str:
        try:
            return path.relative_to(self.root).as_posix()
        except ValueError:
            return str(path)

    def doc(self, path: Path) -> Doc:
        """Read a Markdown file once, with step 2's anchor check."""
        key = path.resolve()
        if key not in self.docs:
            self.docs[key] = walk(path)
            anchors = self.anchors(path)
            for h in self.docs[key].headings:
                if h.anchor not in anchors:
                    self.fail(
                        f"{self.rel(path)}:{h.line + 1}: heading anchor #{h.anchor}"
                        " is not among scan()'s anchors"
                    )
        return self.docs[key]

    def anchors(self, path: Path) -> set[str]:
        key = path.resolve()
        if key not in self.scans:
            self.scans[key] = scan(path).anchors
        return self.scans[key]

    def section(self, source: str, where: str) -> tuple[Doc, Heading] | None:
        """Step 3: resolve `source` like a link in a file at the repository
        root, require its fragment among scan()'s anchors, and return the
        heading it names."""
        dest, fragment, _query, problem = resolve(self.root / "README.md", source)
        if problem or dest is None:
            self.fail(f"{where}: source {source} — {problem or 'unresolved'}")
            return None
        if not fragment:
            self.fail(f"{where}: source {source} has no fragment")
            return None
        if dest.suffix.lower() != ".md" or not dest.is_file():
            self.fail(f"{where}: source {source} is not a Markdown file")
            return None
        if fragment not in self.anchors(dest):
            self.fail(
                f"{where}: source {source} — no heading or anchor #{fragment} in {self.rel(dest)}"
            )
            return None
        doc = self.doc(dest)
        heading = doc.heading(fragment)
        if heading is None:
            self.fail(
                f"{where}: source {source} — #{fragment} is not a heading of {self.rel(dest)}"
            )
            return None
        return doc, heading

    def is_file(self, source: str, rel: str) -> bool:
        return source.split("#", 1)[0] == rel

    # step 1
    def load_json(self, rel: str) -> object | None:
        path = self.root / rel
        if not path.is_file():
            self.fail(f"{rel}: required file is missing")
            return None
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            self.fail(f"{rel}: not valid JSON ({exc})")
            return None

    # step 4
    def check_config(self, config: object) -> dict[str, dict]:
        if not isinstance(config, dict):
            self.fail(f"{CONFIG}: not a JSON object")
            return {}
        for key, entry in config.items():
            where = f"{CONFIG}: {key}"
            if not isinstance(entry, dict) or set(entry) != set(CONFIG_FIELDS):
                self.fail(f"{where}: an entry has exactly the fields {', '.join(CONFIG_FIELDS)}")
                continue
            if not all(isinstance(entry[f], str) for f in ("governs", "source", "quote", "quoted")):
                self.fail(f"{where}: governs, source, quote, and quoted are strings")
                continue
            found = self.section(entry["source"], where)
            if found is None:
                continue
            doc, heading = found
            quote, quoted = normalize(entry["quote"]), normalize(entry["quoted"])
            if quote not in normalize(doc.body(heading)):
                self.fail(f"{where}: quote {entry['quote']!r} does not occur in {entry['source']}")
            elif quoted not in quote:
                self.fail(f"{where}: quoted {entry['quoted']!r} does not occur in its quote")
            elif parse(quoted) != entry["value"] or isinstance(entry["value"], bool):
                self.fail(
                    f"{where}: value {entry['value']!r} differs from quoted {entry['quoted']!r}"
                )
        return config

    # step 5
    def check_keys(self, config: dict) -> None:
        ddd = self.root / DDD
        if not ddd.is_file():
            self.fail(f"{DDD}: required file is missing")
            return
        doc = self.doc(ddd)
        heading = doc.heading(REGISTER_ANCHOR)
        if heading is None:
            self.fail(f"{DDD}: no heading #{REGISTER_ANCHOR} holding the register table")
            return
        rows, p2, in_table = set(), set(), False
        for i in range(heading.line + 1, doc.section_end(heading)):
            line = doc.lines[i].strip()
            if doc.fenced[i] or not line.startswith("|"):
                if in_table:
                    break
                continue
            first = re.split(r"(?<!\\)\|", line)[1].strip()
            if not in_table:
                in_table = first == "Entry"
                continue
            if m := REGISTER_ROW.match(first):
                rows.add(m.group(1))
                if m.group(2):
                    p2.add(m.group(1))
        if not rows:
            self.fail(f"{DDD}#{REGISTER_ANCHOR}: no register table")
            return
        for name in sorted(rows - p2 - set(config)):
            self.fail(f"{CONFIG}: missing entry {name} of the register table")
        for name in sorted(set(config) - rows):
            self.fail(f"{CONFIG}: unknown key {name}, not in the register table")

    # step 6
    def pdd_subsections(self) -> list[tuple[str, Doc, Heading]]:
        """The PDD §5 subsections that have a blockquote, as (number, doc, heading)."""
        if self.subsections is None:
            self.subsections = self.find_subsections()
        return self.subsections

    def find_subsections(self) -> list[tuple[str, Doc, Heading]]:
        pdd = self.root / PDD
        if not pdd.is_file():
            self.fail(f"{PDD}: required file is missing")
            return []
        doc = self.doc(pdd)
        top = next((h for h in doc.headings if h.level == 2 and re.match(r"^5\.?\s", h.text)), None)
        if top is None:
            self.fail(f"{PDD}: no §5 heading")
            return []
        end = doc.section_end(top)
        found = []
        for h in doc.headings:
            if top.line < h.line < end and h.level == top.level + 1:
                number = h.text.split(" ", 1)[0]
                if doc.blockquotes(h):
                    found.append((number, doc, h))
        return found

    def check_copy(self, copy: object) -> list[dict]:
        if not isinstance(copy, list):
            self.fail(f"{COPY}: not a JSON array")
            return []
        entries, keys = [], set()
        for index, entry in enumerate(copy):
            where = f"{COPY}: entry {index}"
            if not isinstance(entry, dict) or set(entry) != set(COPY_FIELDS):
                self.fail(f"{where}: an entry has exactly the fields {', '.join(COPY_FIELDS)}")
                continue
            if not (isinstance(entry["key"], str) and isinstance(entry["source"], str)
                    and isinstance(entry["text"], str) and type(entry["part"]) is int):  # fmt: skip
                self.fail(f"{where}: key, source, and text are strings and part an integer")
                continue
            if entry["key"] in keys:
                self.fail(f"{COPY}: duplicate key {entry['key']}")
            keys.add(entry["key"])
            entries.append(entry)

        subsections = self.pdd_subsections()
        compared: set[int] = set()
        for number, doc, heading in subsections:
            if number == EXCLUDED_SUBSECTION:
                continue
            mine = [e for e in entries if self.cites(e["source"], doc, heading)]
            compared.update(id(e) for e in mine)
            if not mine:
                if number not in P2_SUBSECTIONS:
                    self.fail(f"{COPY}: no entry for PDD §{number} (#{heading.anchor})")
                continue
            mine.sort(key=lambda e: e["part"])
            parts = [e["part"] for e in mine]
            if len(set(parts)) != len(parts):
                self.fail(f"{COPY}: PDD §{number} entries repeat a part number")
                continue
            joined = normalize("\n".join(e["text"] for e in mine))
            expected = normalize("\n".join(doc.blockquotes(heading)))
            if joined != expected:
                keys_here = ", ".join(e["key"] for e in mine)
                self.fail(
                    f"{COPY}: {keys_here} — joined texts differ"
                    f" from the blockquotes of PDD §{number}"
                )
        for entry in entries:
            if id(entry) in compared:
                continue
            where = f"{COPY}: {entry['key']}"
            found = self.section(entry["source"], where)
            if found is None:
                continue
            doc, heading = found
            if normalize(entry["text"]) not in normalize(doc.body(heading)):
                self.fail(f"{where}: text does not occur verbatim in {entry['source']}")
        return entries

    def cites(self, source: str, doc: Doc, heading: Heading) -> bool:
        dest, fragment, _query, problem = resolve(self.root / "README.md", source)
        return (
            not problem
            and dest is not None
            and dest.resolve() == doc.path.resolve()
            and fragment == heading.anchor
        )

    # step 7
    def check_marked(self) -> list[tuple[str, int, str, str]]:
        """Compare every copy-marked block; return the DDD-citing ones as
        (file, line, source, compared text) for the step-8 listing."""
        listed = []
        for rel in MARKED_FILES:
            path = self.root / rel
            if not path.is_file():
                continue
            self.doc(path)
            lines = path.read_text(encoding="utf-8-sig").split("\n")
            i = 0
            while i < len(lines):
                opener = COPY_OPEN.match(lines[i].strip())
                if not opener:
                    if lines[i].strip() == COPY_CLOSE:
                        self.fail(f"{rel}:{i + 1}: copy end marker without a start marker")
                    i += 1
                    continue
                source, start = opener.group(1), i
                end = next(
                    (k for k in range(i + 1, len(lines)) if lines[k].strip() == COPY_CLOSE), None
                )
                if end is None:
                    self.fail(f"{rel}:{start + 1}: copy marker without its end marker")
                    break
                block = "\n".join(lines[start + 1 : end])
                i = end + 1
                where = f"{rel}:{start + 1}"
                if (
                    not (self.is_file(source, PDD) or self.is_file(source, DDD))
                    or "#" not in source
                ):
                    self.fail(f"{where}: copy marker cites {source}, not a {PDD} or {DDD} fragment")
                    continue
                found = self.section(source, where)
                if found is None:
                    continue
                doc, heading = found
                if self.is_file(source, PDD):
                    quotes = doc.blockquotes(heading)
                    if not quotes or normalize(block) != normalize("\n".join(quotes)):
                        self.fail(f"{where}: block differs from the blockquotes of {source}")
                else:
                    text = strict_text(block)
                    if not any(strict_text(code) == text for code in doc.code_blocks(heading)):
                        self.fail(f"{where}: block equals no fenced code block of {source}")
                    listed.append((rel, start + 1, source, text))
        return listed

    def run(self) -> int:
        if not (self.root / WEBAPP_SRC).is_dir():
            print(f"skip: {WEBAPP_SRC} is absent; nothing to check")
            return 0
        config = self.load_json(CONFIG)
        copy = self.load_json(COPY)
        config = self.check_config(config) if config is not None else {}
        self.check_keys(config)
        entries = self.check_copy(copy) if copy is not None else []
        marked = self.check_marked()
        subsections = self.pdd_subsections()

        for message in self.failures:
            print(f"FAIL {message}")
        print("SC-7 listing (SHA-256 of the UTF-8 text, lowercase hex):")
        for entry in sorted(
            (e for e in entries if self.is_file(e["source"], DDD)), key=lambda e: e["key"]
        ):
            print(f"fixed-here {entry['key']} {sha256(entry['text'])}")
        for rel, line, source, text in marked:
            print(f"copy-block {rel}:{line} {source} {sha256(text)}")
        for _number, doc, heading in subsections:
            joined = normalize("\n".join(doc.blockquotes(heading)))
            print(f"copy-deck {self.rel(doc.path)}#{heading.anchor} {sha256(joined)}")
        return 1 if self.failures else 0


def main() -> int:
    return Checker(REPO).run()


if __name__ == "__main__":
    sys.exit(main())
