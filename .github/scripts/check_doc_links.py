#!/usr/bin/env python3
"""Check relative links and heading anchors in the repository's Markdown.

GitHub, not the MkDocs site, renders most of the repository's Markdown —
docs/, the READMEs, notes/ — so the strict site build never sees it: a
renamed heading or a moved file breaks those links silently. This check
parses each file the way GitHub's CommonMark renderer does, then resolves
every relative link and image (Markdown syntax and HTML <a>/<img> tags) and
every #anchor into a Markdown file. Standard library only.

Usage: python3 .github/scripts/check_doc_links.py [PATH ...]

Each PATH is a Markdown file or a directory searched recursively. The
default is every tracked Markdown file outside subprojects/mkdocs/docs/,
whose pages MkDocs renders and its strict build checks.

Known simplifications: blockquotes nested inside list items, and
reference-style links whose definitions sit in a different block, are
followed only approximately; neither occurs in the repository today.
"""

from __future__ import annotations

import argparse
import functools
import html
import os
import re
import subprocess
import sys
import unicodedata
from dataclasses import dataclass, field
from pathlib import Path
from urllib.parse import unquote

REPO = Path(__file__).resolve().parents[2]
MKDOCS_DOCS = "subprojects/mkdocs/docs/"

QUOTE = re.compile(r"^ {0,3}> ?")
FENCE = re.compile(r"^( {0,3})(`{3,}|~{3,})(.*)$")
ATX = re.compile(r"^ {0,3}#{1,6}(?:[ \t]+(.*?))?(?:[ \t]+#+)?[ \t]*$")
SETEXT = re.compile(r"^ {0,3}(?:=+|-+)[ \t]*$")
THEMATIC = re.compile(r"^ {0,3}(?:(?:\*[ \t]*){3,}|(?:-[ \t]*){3,}|(?:_[ \t]*){3,})$")
LIST_MARKER = re.compile(r"^( {0,3})([-+*]|\d{1,9}[.)])(?=[ \t]|$)")
FOOTNOTE_DEF = re.compile(r"^ {0,3}\[\^[^\]\s]+\]:")
TABLE_DELIM = re.compile(r"^\s*\|?\s*:?-+:?\s*(?:\|\s*:?-+:?\s*)*\|?\s*$")
HTML_START_1 = re.compile(r"^ {0,3}<(script|pre|style|textarea)(?:\s|>|$)", re.I)
HTML_START_2 = re.compile(r"^ {0,3}<!--")
HTML_START_6 = re.compile(
    r"^ {0,3}</?(?:address|article|aside|base|basefont|blockquote|body|caption|center|col"
    r"|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame"
    r"|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|nav"
    r"|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th"
    r"|thead|title|tr|track|ul)(?:\s|/?>|$)",
    re.I,
)
HTML_START_7 = re.compile(
    r"^ {0,3}(?:<[A-Za-z][A-Za-z0-9-]*(?:\s+[A-Za-z_:][-A-Za-z0-9_.:]*"
    r"(?:\s*=\s*(?:[^\s\"'=<>`]+|'[^']*'|\"[^\"]*\"))?)*\s*/?>|</[A-Za-z][A-Za-z0-9-]*\s*>)\s*$"
)
TAG = re.compile(r"<(/?)([A-Za-z][A-Za-z0-9-]*)((?:\s[^<>]*)?)/?>")
ATTR = re.compile(
    r"""\s([A-Za-z_:][-A-Za-z0-9_.:]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?"""
)
ID_ELEMENTS = {
    "a", "span", "div", "p", "h1", "h2", "h3", "h4", "h5", "h6", "sup", "sub", "section",
    "details", "summary", "li", "td", "th", "table", "tr", "img",
}  # fmt: skip
AUTOLINK = re.compile(r"<([A-Za-z][A-Za-z0-9+.-]{1,31}:[^\s<>]*|[\w.!#$%&'*+/=?^`{|}~-]+@[\w.-]+)>")
ESCAPE = re.compile(r"\\([!-/:-@\[-`{-~])")
SCHEME = re.compile(r"^[A-Za-z][A-Za-z0-9+.-]*:")


def slug(text: str) -> str:
    """GitHub's heading-anchor rule (github-slugger).

    Lowercase; drop every character that is not a letter, mark, decimal or
    letter number, connector punctuation, space, or hyphen; then turn each
    space into a hyphen without collapsing runs, so "A & B" becomes "a--b".
    """

    def keep(c: str) -> bool:
        cat = unicodedata.category(c)
        return c in " -" or cat[0] in "LM" or cat in ("Nd", "Nl", "Pc")

    return "".join(c for c in text.lower() if keep(c)).replace(" ", "-")


# ------------------------------------------------------------------ inlines


def mask_inline(text: str) -> tuple[str, list[tuple[int, int, str]]]:
    """Blank out code spans and HTML comments, keeping offsets and newlines.

    Returns the masked text and the code spans as (start, end, content).
    Scanning left to right gives code spans and comments CommonMark's
    precedence: whichever starts first wins. A link destination is read
    whole once its ']' is reached, so a backtick inside it opens no span.
    """
    out, spans, i, n = list(text), [], 0, len(text)

    def blank(a: int, b: int) -> None:
        for p in range(a, b):
            if out[p] != "\n":
                out[p] = " "

    while i < n:
        c = text[i]
        if c == "\\" and i + 1 < n:
            i += 2
        elif c == "`":
            run = len(text[i:]) - len(text[i:].lstrip("`"))
            j, closed = i + run, False
            while (k := text.find("`" * run, j)) >= 0:
                end = k + run
                if end < n and text[end] == "`":
                    j = end + len(text[end:]) - len(text[end:].lstrip("`"))
                    continue
                content = text[i + run : k].replace("\n", " ")
                if content.startswith(" ") and content.endswith(" ") and content.strip():
                    content = content[1:-1]
                spans.append((i, end, content))
                blank(i, end)
                i, closed = end, True
                break
            if not closed:
                i += run
        elif text.startswith("<!--", i) and (k := text.find("-->", i + 4)) >= 0:
            blank(i, k + 3)
            i = k + 3
        elif c == "]" and text[i + 1 : i + 2] == "(" and (parsed := parse_destination(text, i + 1)):
            i = parsed[1]
        else:
            i += 1
    return "".join(out), spans


def _skip_space(text: str, k: int) -> int:
    newline = False
    while k < len(text) and text[k] in " \t\n":
        if text[k] == "\n":
            if newline:
                break
            newline = True
        k += 1
    return k


def parse_destination(text: str, j: int) -> tuple[str, int] | None:
    """Parse '(destination "title")' starting at text[j] == '('."""
    n, k = len(text), _skip_space(text, j + 1)
    if k < n and text[k] == "<":
        end = k + 1
        while end < n and text[end] not in ">\n":
            end += 2 if text[end] == "\\" else 1
        if end >= n or text[end] != ">":
            return None
        dest, k = text[k + 1 : end], end + 1
    else:
        start, depth = k, 0
        while k < n:
            ch = text[k]
            if ch == "\\" and k + 1 < n:
                k += 2
                continue
            if ch == "(":
                depth += 1
            elif ch == ")":
                if depth == 0:
                    break
                depth -= 1
            elif ch.isspace() or ord(ch) < 0x20:
                break
            k += 1
        if depth:
            return None
        dest = text[start:k]
    after = _skip_space(text, k)
    if after > k and after < n and text[after] in "\"'(":
        close = ")" if text[after] == "(" else text[after]
        m = after + 1
        while m < n and text[m] != close:
            m += 2 if text[m] == "\\" else 1
        if m >= n:
            return None
        after = _skip_space(text, m + 1)
    if after < n and text[after] == ")":
        return dest, after + 1
    return None


@dataclass
class Link:
    start: int  # offset of '[' or '!['
    text_start: int
    text_end: int  # offset of the closing ']'
    end: int  # offset just past the destination or reference label
    dest: str
    image: bool
    reference: bool  # its destination is checked where the definition stands


def find_links(masked: str, refs: dict[str, str]) -> list[Link]:
    """CommonMark link and image recognition over masked inline text.

    Brackets nest to any depth, a link may not contain another link (its
    outer brackets become literal), and an image may contain links.
    """
    found: list[Link] = []
    stack: list[tuple[int, bool, bool]] = []  # (offset of '[', image, active)
    i, n = 0, len(masked)
    while i < n:
        c = masked[i]
        if c == "\\" and i + 1 < n:
            i += 2
            continue
        if c == "[":
            image = i > 0 and masked[i - 1] == "!" and (i < 2 or masked[i - 2] != "\\")
            stack.append((i, image, True))
        elif c == "]" and stack:
            opener, image, active = stack.pop()
            if not active:
                i += 1
                continue
            reference = False
            if i + 1 < n and masked[i + 1] == "(" and (parsed := parse_destination(masked, i + 1)):
                dest, end = parsed
            else:
                label = masked[opener + 1 : i]
                ref = re.match(r"\[((?:\\.|[^\[\]\\])*)\]", masked[i + 1 :])
                key = _label(ref.group(1) if ref and ref.group(1) else label)
                if key not in refs:
                    i += 1
                    continue
                dest, end, reference = refs[key], i + 1 + (ref.end() if ref else 0), True
            found.append(Link(opener - image, opener + 1, i, end, dest, image, reference))
            if not image:
                stack = [(o, img, img and a) for o, img, a in stack]
            i = end
            continue
        i += 1
    return found


def _label(label: str) -> str:
    return " ".join(label.split()).casefold()


def heading_text(raw: str, refs: dict[str, str]) -> str:
    """The visible text of a heading, as GitHub derives its anchor from it.

    Code keeps its content verbatim; a link contributes its text, an image
    nothing, an autolink its address; tags, emphasis markers, and escapes
    drop out and entities are decoded.
    """
    masked, spans = mask_inline(raw)
    pieces = list(spans)
    for link in find_links(masked, refs):
        inner = "" if link.image else heading_text(raw[link.text_start : link.text_end], refs)
        pieces.append((link.start, link.end, inner))
    pieces.sort(key=lambda p: (p[0], -p[1]))
    out, pos = [], 0
    for start, end, replacement in pieces:
        if start < pos:  # nested inside a piece already rendered
            continue
        out.append(_plain(raw[pos:start]))
        out.append(replacement)
        pos = end
    out.append(_plain(raw[pos:]))
    return "".join(out)


def _plain(segment: str) -> str:
    segment = AUTOLINK.sub(r"\1", segment)
    segment = TAG.sub("", segment)
    segment = re.sub(r"\*+|~~", "", segment)
    segment = re.sub(r"(?<![A-Za-z0-9])_+|_+(?![A-Za-z0-9])", "", segment)
    return html.unescape(ESCAPE.sub(r"\1", segment))


def html_refs(masked: str) -> tuple[list[tuple[int, str]], set[str]]:
    """Targets of <a href>/<img src> tags and the ids/names GitHub keeps."""
    targets, ids = [], set()
    for tag in TAG.finditer(masked):
        if tag.group(1):
            continue
        name = tag.group(2).lower()
        for attr in ATTR.finditer(tag.group(3) or ""):
            key = attr.group(1).lower()
            value = html.unescape(next((g for g in attr.groups()[1:] if g is not None), ""))
            if (name, key) in (("a", "href"), ("img", "src")):
                targets.append((tag.start() + (attr.start(2) if attr.group(2) else 0), value))
            elif key in ("id", "name") and name in ID_ELEMENTS and value:
                ids.add(value)
    return targets, ids


# ------------------------------------------------------------------- blocks


@dataclass
class Fence:
    char: str
    length: int
    container: int  # content column of the enclosing list item
    quote: int  # blockquote depth at the opener


@dataclass
class Parsed:
    anchors: set[str] = field(default_factory=set)
    links: list[tuple[int, str]] = field(default_factory=list)


def collect_refs(lines: list[str]) -> dict[str, str]:
    """Link reference definitions, for reference links and heading text."""
    refs: dict[str, str] = {}
    fence = ""
    for i, line in enumerate(lines):
        opener = FENCE.match(line.lstrip(" >"))
        if opener and (not fence or opener.group(2).startswith(fence)):
            fence = "" if fence else opener.group(2)
        if fence:
            continue
        m = re.match(r"^(?:\s{0,3}> ?)*\s{0,3}\[((?:\\.|[^\[\]\\])+)\]:[ \t]*(\S*)", line)
        if m and not m.group(1).startswith("^"):
            dest = m.group(2) or (lines[i + 1].strip().split(" ")[0] if i + 1 < len(lines) else "")
            refs.setdefault(_label(m.group(1)), dest.strip("<>"))
    return refs


def scan(path: Path) -> Parsed:
    """Parse one Markdown file into its anchors and (line, target) links."""
    lines = path.read_text(encoding="utf-8-sig").split("\n")
    lines = [ln.expandtabs(4) for ln in lines]
    refs = collect_refs(lines)
    result = Parsed()
    seen: dict[str, int] = {}

    def add_heading(raw: str) -> None:
        base = slug(heading_text(raw, refs))
        anchor = base
        while anchor in seen:
            seen[base] += 1
            anchor = f"{base}-{seen[base]}"
        seen[anchor] = 0
        result.anchors.add(anchor)

    def inline(text: str, first_line: int) -> None:
        masked, _ = mask_inline(text)
        targets, ids = html_refs(masked)
        result.anchors.update(ids)
        targets += [(k.start, k.dest) for k in find_links(masked, refs) if not k.reference]
        for at, target in targets:
            result.links.append((first_line + text.count("\n", 0, at), target))

    def paragraph_done() -> None:
        nonlocal para
        if not para:
            return
        texts = [t for _, t in para]
        start = para[0][0]
        k = 0
        while k < len(texts):  # reference definitions open a paragraph
            joined = "\n".join(texts[k:])
            m = re.match(r"\s{0,3}\[((?:\\.|[^\[\]\\])+)\]:[ \t]*\n?[ \t]*(<[^>\n]*>|\S+)", joined)
            if not m or m.group(1).startswith("^"):
                break
            rest = joined[m.end() :].split("\n", 1)[0].strip()
            if rest and rest[0] not in "\"'(":
                break
            result.links.append((start + k, m.group(2)))
            k += joined[: m.end()].count("\n") + 1
        texts, start = texts[k:], start + k
        if len(texts) >= 2 and "|" in texts[0] and TABLE_DELIM.match(texts[1]):
            for offset, row in enumerate(texts):
                if offset == 1:
                    continue
                for cell in re.split(r"(?<!\\)\|", row):
                    inline(cell, start + offset)
        elif texts:
            inline("\n".join(texts), start)
        para = []

    para: list[tuple[int, str]] = []
    para_quote = 0
    items: list[int] = []  # content columns of the open list items and footnotes
    fence: Fence | None = None
    html_end: re.Pattern[str] | str | None = None
    in_comment = False
    in_code = False

    for lineno, line in enumerate(lines, 1):
        rest, quote = line, 0
        while m := QUOTE.match(rest):
            rest, quote = rest[m.end() :], quote + 1
        blank = not rest.strip()
        indent = len(rest) - len(rest.lstrip(" "))

        if fence:
            ended = (not blank and quote < fence.quote) or (
                not blank and fence.container and indent < fence.container
            )
            if not ended:
                inner = rest[min(indent, fence.container) :]
                closer = FENCE.match(inner)
                if (
                    closer
                    and closer.group(2)[0] == fence.char
                    and len(closer.group(2)) >= fence.length
                    and not closer.group(3).strip()
                ):
                    fence = None
                continue
            fence = None

        if html_end is not None:
            if html_end == "blank":
                if blank:
                    html_end = None
                    continue
            elif isinstance(html_end, re.Pattern) and html_end.search(line):
                html_end = None
            if in_comment:
                in_comment = html_end is not None
                continue
            targets, ids = html_refs(mask_inline(line)[0])
            result.anchors.update(ids)
            result.links.extend((lineno, t) for _, t in targets)
            continue

        if blank:
            paragraph_done()
            continue

        base = items[-1] if items else 0
        if in_code and indent >= base + 4:
            continue
        in_code = False

        lazy = bool(para) and not _block_start(rest[min(indent, base) :])
        if lazy and quote == para_quote or (lazy and quote < para_quote):
            para.append((lineno, rest.strip() if indent < base else rest[base:]))
            continue
        if para and quote != para_quote:
            paragraph_done()

        while items and indent < items[-1]:
            paragraph_done()
            items.pop()
        base = items[-1] if items else 0
        rel = rest[base:]
        rel_indent = indent - base

        while True:  # a list marker opens an item whose content is parsed in turn
            if rel_indent >= 4 and not para:
                in_code = True
                break
            if (opener := FENCE.match(rel)) and not (
                opener.group(2)[0] == "`" and "`" in opener.group(3)
            ):
                paragraph_done()
                fence = Fence(opener.group(2)[0], len(opener.group(2)), base, quote)
                break
            if heading := ATX.match(rel):
                paragraph_done()
                add_heading(heading.group(1) or "")
                inline(heading.group(1) or "", lineno)
                break
            if para and SETEXT.match(rel) and not _is_table(para):
                texts = [t for _, t in para]
                add_heading("\n".join(t.strip() for t in texts))
                inline("\n".join(texts), para[0][0])
                para.clear()
                break
            if THEMATIC.match(rel):
                paragraph_done()
                break
            start1, start2 = HTML_START_1.match(rel), HTML_START_2.match(rel)
            if (
                start1
                or start2
                or HTML_START_6.match(rel)
                or (not para and HTML_START_7.match(rel))
            ):
                paragraph_done()
                if start1:
                    html_end = re.compile(rf"</{start1.group(1)}>", re.I)
                elif start2:
                    html_end = re.compile("-->")
                else:
                    html_end = "blank"
                if isinstance(html_end, re.Pattern) and html_end.search(rel[4:] if start2 else rel):
                    html_end = None
                in_comment = bool(start2) and html_end is not None
                targets, ids = html_refs(mask_inline(rel)[0])
                result.anchors.update(ids)
                result.links.extend((lineno, t) for _, t in targets)
                break
            marker = LIST_MARKER.match(rel)
            footnote = FOOTNOTE_DEF.match(rel)
            # only an ordered list starting at 1 may interrupt a paragraph
            ordered_mid = marker and marker.group(2)[0].isdigit() and marker.group(2)[:-1] != "1"
            if marker and not (para and ordered_mid):
                paragraph_done()
                after = rel[marker.end() :]
                spaces = len(after) - len(after.lstrip(" "))
                width = marker.end() + (1 if not after.strip() or spaces > 4 else spaces)
                items.append(base + width)
                base, rel = base + width, rel[width:] if len(rel) >= width else ""
                rel_indent = len(rel) - len(rel.lstrip(" "))
                if not rel.strip():
                    break
                continue
            if footnote and not para:
                items.append(base + 4)
            if not para:
                para_quote = quote
            para.append((lineno, rel))
            break
    paragraph_done()
    return result


def _block_start(text: str) -> bool:
    """Whether a line would interrupt a paragraph (so it is not lazy text)."""
    return bool(
        FENCE.match(text)
        or ATX.match(text)
        or THEMATIC.match(text)
        or SETEXT.match(text)
        or QUOTE.match(text)
        or HTML_START_1.match(text)
        or HTML_START_2.match(text)
        or HTML_START_6.match(text)
        or (LIST_MARKER.match(text) and text[LIST_MARKER.match(text).end() :].strip())
    )


def _is_table(para: list[tuple[int, str]]) -> bool:
    return len(para) >= 2 and "|" in para[0][1] and bool(TABLE_DELIM.match(para[1][1]))


# ------------------------------------------------------------------- checks


@functools.cache
def _names(directory: str) -> frozenset[str]:
    try:
        return frozenset(os.listdir(directory))
    except OSError:
        return frozenset()


def exists_exact(path: Path) -> bool:
    """Whether path exists with exactly this capitalization. macOS and Windows
    file systems ignore case, but GitHub and the Linux CI runner do not."""
    if not path.exists():
        return False
    current = Path(path.anchor)
    for part in path.parts[1:]:
        if part not in _names(str(current)):
            return False
        current = current / part
    return True


def readme_of(directory: Path) -> Path | None:
    """The README GitHub shows on a directory page, if any."""
    for name in sorted(_names(str(directory)), key=lambda s: (s.lower() != "readme.md", s)):
        if name.lower() in ("readme.md", "readme.markdown") and (directory / name).is_file():
            return directory / name
    return None


def markdown_files(paths: list[Path]) -> list[Path]:
    files: list[Path] = []
    for p in paths:
        if p.is_dir():
            files.extend(sorted(p.rglob("*.md")))
        elif p.suffix.lower() == ".md":
            files.append(p)
        else:
            raise SystemExit(f"not a Markdown file or directory: {p}")
    return files


def default_files() -> list[Path]:
    try:
        listed = subprocess.run(
            ["git", "-C", str(REPO), "ls-files", "-z", "--", "*.md"],
            capture_output=True,
            check=True,
            text=True,
        ).stdout.split("\0")
    except (OSError, subprocess.CalledProcessError) as exc:
        print(f"warning: git ls-files failed ({exc}); checking docs/ and README.md only",
              file=sys.stderr)  # fmt: skip
        if os.environ.get("GITHUB_ACTIONS") == "true":
            raise SystemExit(2) from exc
        return markdown_files([REPO / "docs", REPO / "README.md"])
    files = [REPO / f for f in sorted(listed) if f and not f.startswith(MKDOCS_DOCS)]
    return [f for f in files if f.is_file()]


def resolve(source: Path, raw: str) -> tuple[Path | None, str, str, str]:
    """Split a link target into (file, fragment, query, problem)."""
    target = raw[1:-1] if raw.startswith("<") and raw.endswith(">") else raw
    target = html.unescape(ESCAPE.sub(r"\1", target))
    path_part, _, fragment = target.partition("#")
    path_part, _, query = path_part.partition("?")
    path_part = unquote(path_part)
    if path_part.startswith("/"):
        dest = REPO / path_part.lstrip("/")
    else:
        dest = source.parent / path_part if path_part else source
    dest = Path(os.path.normpath(dest))
    if path_part and not dest.is_relative_to(REPO) and source.is_relative_to(REPO):
        return None, fragment, query, "outside the repository"
    if not exists_exact(dest):
        problem = "differs in capitalization" if dest.exists() else "no such file"
        return None, fragment, query, problem
    return dest, unquote(fragment), query, ""


def check(files: list[Path]) -> tuple[int, list[str]]:
    """Return the number of links checked and a message per broken link."""
    parsed: dict[Path, Parsed] = {}
    errors: list[str] = []
    checked = 0

    def rel(p: Path) -> str:
        try:
            return str(p.relative_to(REPO))
        except ValueError:
            return str(p)

    def anchors_of(p: Path) -> set[str]:
        key = p.resolve()
        if key not in parsed:
            parsed[key] = scan(p)
        return parsed[key].anchors

    for f in files:
        parsed[f.resolve()] = scan(f)
        for lineno, raw in parsed[f.resolve()].links:
            target = raw[1:-1] if raw.startswith("<") and raw.endswith(">") else raw
            if not target or SCHEME.match(target) or target.startswith("//"):
                continue
            checked += 1
            where = f"{rel(f)}:{lineno}: {target}"
            dest, fragment, query, problem = resolve(f, raw)
            if problem:
                errors.append(f"{where} — {problem}")
                continue
            if not fragment or "plain=1" in query.split("&"):
                continue
            if dest.is_dir():
                readme = readme_of(dest)
                if readme is None:
                    errors.append(f"{where} — {rel(dest)} has no README to hold #{fragment}")
                    continue
                dest = readme
            if dest.suffix.lower() != ".md":
                continue
            if fragment not in anchors_of(dest):
                errors.append(f"{where} — no heading or anchor #{fragment} in {rel(dest)}")
    return checked, errors


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n", 1)[0])
    parser.add_argument("paths", nargs="*", type=Path, help="files or directories")
    args = parser.parse_args(argv)
    files = markdown_files([p.resolve() for p in args.paths]) if args.paths else default_files()
    checked, errors = check(files)
    for message in errors:
        print(message)
    status = f"{len(errors)} broken" if errors else "all resolve"
    noun = "file" if len(files) == 1 else "files"
    print(f"Checked {checked} relative links in {len(files)} Markdown {noun}: {status}.")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
