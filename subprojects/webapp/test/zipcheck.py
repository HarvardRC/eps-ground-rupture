"""The independent ZIP reader of docs/app/ddd.md §5.9 and §7.4 (zip.test.ts).

Usage: python3 -I test/zipcheck.py [--members=<name>,...] <file> <ISO instant> [<member SHA-256> ...]

Exits 0 only if Python's own zipfile module accepts the archive written by
src/download/zip.ts: ZipFile(file).testzip() is None; the member names are
exactly the expected list, in that order; every member is ZIP_STORED with
flag_bits 0; every date_time equals the instant's UTC fields floored to 2
seconds; and, when SHA-256 digests are given (lowercase hexadecimal, one per
text member in order), each text member's bytes match its digest.

The expected list (guided DDD §13.6) is records.csv, statistics.csv,
provenance.txt, and scenario.json by default, the /scenario/ layout of DDD
§5.9; or README.txt, those four, and report.docx, the guided layout; or
README.txt and those four, the guided layout whose report could not be
built (§13.5). README.txt (G-30) must be plain UTF-8 with LF line ends and
name every member present and every column of both CSV headers. For the guided
layout report.docx is opened as a nested archive and must hold the §13.4
part set: [Content_Types].xml, _rels/.rels, word/document.xml,
word/_rels/document.xml.rels, then word/media/chart-1.png ... chart-n.png,
every part stored with flag_bits 0, an ASCII name, and the same date_time;
every XML part well formed; each image relationship naming a media part,
every media part named by one, and every r:embed resolving to one; each
media part a PNG; [Content_Types].xml declaring the main document and PNG. Its bytes are never digested: PNG bytes vary by browser.
In both layouts provenance.txt must end with the Licences block of G-28
(data/REDISTRIBUTION.md): records.csv and statistics.csv under ODC-By 1.0
with its URL, the produced works under CC BY 4.0 with its URL, then the
notice ODC-By 1.0 asks for; in the guided layout report.docx's document
must carry that notice too.
Standard library only. Prints one line per failure and exits 1 on any.
"""

from __future__ import annotations

import hashlib
import io
import re
import sys
import zipfile
from datetime import datetime, timezone
from xml.etree import ElementTree

MEMBERS = ("records.csv", "statistics.csv", "provenance.txt", "scenario.json")
REPORT = "report.docx"
README = "README.txt"
LAYOUTS = (MEMBERS, (README, *MEMBERS), (README, *MEMBERS, REPORT))
REPORT_PARTS = (
    "[Content_Types].xml",
    "_rels/.rels",
    "word/document.xml",
    "word/_rels/document.xml.rels",
)
MEDIA = re.compile(r"word/media/chart-([1-9][0-9]*)\.png")
PNG = b"\x89PNG\r\n\x1a\n"
REL_NS = "{http://schemas.openxmlformats.org/package/2006/relationships}"
R_EMBED = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}embed"
IMAGE_TYPE = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image"
CT_NS = "{http://schemas.openxmlformats.org/package/2006/content-types}"
ODC_BY_URL = "https://opendatacommons.org/licenses/by/1-0/"
CC_BY_URL = "https://creativecommons.org/licenses/by/4.0/"
NOTICE = (
    "Contains information from the Homogeneous and Heterogeneous 2D DEM Experiments "
    "(Chiama et al. 2024a, 2024b; DesignSafe-CI), which is made available here under the "
    "Open Data Commons Attribution License (ODC-By 1.0)."
)
DATA_LINE = f"records.csv and statistics.csv: Open Data Commons Attribution License (ODC-By 1.0), {ODC_BY_URL}"
WORKS_LINE = (
    "Charts, chart images, and reports built from these results: "
    f"Creative Commons Attribution 4.0 International (CC BY 4.0), {CC_BY_URL}"
)
MAIN_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"


def instant(text: str) -> tuple[int, int, int, int, int, int]:
    """The UTC fields of an ISO 8601 instant, seconds floored to 2 s."""
    if text.endswith("Z"):
        text = text[:-1] + "+00:00"
    moment = datetime.fromisoformat(text)
    if moment.tzinfo is None:
        raise ValueError(f"{text!r} names no time zone")
    utc = moment.astimezone(timezone.utc)  # noqa: UP017 - any python3 on PATH, 3.9 included
    return (utc.year, utc.month, utc.day, utc.hour, utc.minute, utc.second - utc.second % 2)


def check_entries(infos: list[zipfile.ZipInfo], expected_time: tuple, where: str) -> list[str]:
    """Stored, flags 0, ASCII names, and the one instant, for every entry."""
    failures: list[str] = []
    for info in infos:
        name = f"{where}{info.filename}"
        if info.compress_type != zipfile.ZIP_STORED:
            failures.append(f"{name}: compress_type {info.compress_type}, not ZIP_STORED")
        if info.flag_bits != 0:
            failures.append(f"{name}: flag_bits {info.flag_bits}, not 0")
        if not info.filename.isascii():
            failures.append(f"{name}: the name is not ASCII")
        if tuple(info.date_time) != expected_time:
            failures.append(f"{name}: date_time {info.date_time}, expected {expected_time}")
    return failures


def check_report(data: bytes, expected_time: tuple) -> list[str]:
    """The nested report.docx of guided DDD §13.4 and §13.6."""
    where = f"{REPORT}/"
    failures: list[str] = []
    with zipfile.ZipFile(io.BytesIO(data)) as docx:
        bad = docx.testzip()
        if bad is not None:
            failures.append(f"{where}: testzip() reports a bad part: {bad}")
        infos = docx.infolist()
        names = tuple(info.filename for info in infos)
        media = names[len(REPORT_PARTS):]
        expected_media = tuple(f"word/media/chart-{n}.png" for n in range(1, len(media) + 1))
        if names[: len(REPORT_PARTS)] != REPORT_PARTS or media != expected_media:
            failures.append(f"{where}: parts {names!r}, expected {REPORT_PARTS!r} then {expected_media!r}")
        failures += check_entries(infos, expected_time, where)
        parsed: dict[str, ElementTree.Element] = {}
        for name in names:
            if name.endswith(".xml") or name.endswith(".rels"):
                try:
                    parsed[name] = ElementTree.fromstring(docx.read(name))
                except ElementTree.ParseError as exc:
                    failures.append(f"{where}{name}: not well formed: {exc}")
            elif MEDIA.fullmatch(name) and not docx.read(name).startswith(PNG):
                failures.append(f"{where}{name}: not a PNG")
        types = parsed.get("[Content_Types].xml")
        if types is not None:
            defaults = {node.get("Extension"): node.get("ContentType") for node in types.iter(f"{CT_NS}Default")}
            overrides = {node.get("PartName"): node.get("ContentType") for node in types.iter(f"{CT_NS}Override")}
            if overrides.get("/word/document.xml") != MAIN_TYPE:
                failures.append(f"{where}[Content_Types].xml: no main-document Override for /word/document.xml")
            if media and defaults.get("png") != "image/png":
                failures.append(f"{where}[Content_Types].xml: no image/png Default for the media parts")
        rels = parsed.get("word/_rels/document.xml.rels")
        document = parsed.get("word/document.xml")
        if rels is None or document is None:
            return failures
        images = {
            rel.get("Id"): rel.get("Target")
            for rel in rels.iter(f"{REL_NS}Relationship")
            if rel.get("Type") == IMAGE_TYPE
        }
        targets = sorted(f"word/{target}" for target in images.values())
        if targets != sorted(media):
            failures.append(f"{where}: image relationships {targets!r}, media parts {sorted(media)!r}")
        embeds = [node.get(R_EMBED) for node in document.iter() if node.get(R_EMBED) is not None]
        for embed in embeds:
            if embed not in images:
                failures.append(f"{where}word/document.xml: r:embed {embed} names no image relationship")
        if sorted(embeds) != sorted(images):
            failures.append(f"{where}: embeds {embeds!r} do not use each image relationship once")
    return failures


def check_licences(provenance: str) -> list[str]:
    """G-28: provenance.txt's last block is Licences — data, works, notice —
    closed, like every block, by one empty line."""
    if not provenance.endswith("\n\n"):
        return ["provenance.txt: the last block is not closed by an empty line"]
    last = provenance[:-2].split("\n\n")[-1].split("\n")
    if len(last) != 4 or last[0] != "Licences":
        return [f"provenance.txt: the last block is {last[:1]!r} with {len(last) - 1} lines, expected Licences and 3"]
    failures: list[str] = []
    for got, want, what in zip(last[1:], (DATA_LINE, WORKS_LINE, NOTICE), ("data licence line", "works licence line", "notice")):  # noqa: B905 - both 3
        if got != want:
            failures.append(f"provenance.txt: the {what} {got!r} is not {want!r}")
    return failures


def check_readme(archive: zipfile.ZipFile, names: tuple[str, ...]) -> list[str]:
    """G-30: README.txt opens the guided archive, plain UTF-8 with LF line ends,
    naming every member present and every column of both CSV headers."""
    try:
        text = archive.read(README).decode("utf-8")
    except UnicodeDecodeError as exc:
        return [f"{README}: not UTF-8: {exc}"]
    failures: list[str] = []
    if "\r" in text or not text.endswith("\n"):
        failures.append(f"{README}: not LF-ended text")
    lines = text.split("\n")
    named = {part for line in lines for part in line.split(", ")}
    for name in names:
        if name not in named:
            failures.append(f"{README}: does not name the member {name}")
    if REPORT not in names and REPORT in named:
        failures.append(f"{README}: names {REPORT}, which the archive does not carry")
    for csv in ("records.csv", "statistics.csv"):
        if csv in names:
            header = archive.read(csv).decode("utf-8").split("\n", 1)[0].split(",")
            missing = [column for column in header if column not in named]
            if missing:
                failures.append(f"{README}: does not describe the {csv} columns {missing!r}")
    return failures


def check(path: str, when: str, digests: list[str], members: tuple[str, ...] = MEMBERS) -> list[str]:
    failures: list[str] = []
    expected_time = instant(when)
    if members not in LAYOUTS:
        return [f"expected members {members!r} are neither layout {LAYOUTS!r}"]
    with zipfile.ZipFile(path) as archive:
        bad = archive.testzip()
        if bad is not None:
            failures.append(f"testzip() reports a bad member: {bad}")
        infos = archive.infolist()
        names = tuple(info.filename for info in infos)
        if names != members:
            failures.append(f"members {names!r}, expected {members!r}")
        failures += check_entries(infos, expected_time, "")
        texts = [info for info in infos if info.filename in MEMBERS]
        if digests:
            if len(digests) != len(texts):
                failures.append(f"{len(digests)} digests given for {len(texts)} text members")
            for info, digest in zip(texts, digests):  # noqa: B905 - lengths compared above
                actual = hashlib.sha256(archive.read(info)).hexdigest()
                if actual != digest.lower():
                    failures.append(f"{info.filename}: SHA-256 {actual}, expected {digest}")
        if "provenance.txt" in names:
            failures += check_licences(archive.read("provenance.txt").decode("utf-8"))
        if members[0] == README and names[:1] == (README,):
            failures += check_readme(archive, names)
        if members[-1] == REPORT and REPORT in names:
            report = archive.read(REPORT)
            failures += check_report(report, expected_time)
            try:
                with zipfile.ZipFile(io.BytesIO(report)) as docx:
                    if NOTICE not in docx.read("word/document.xml").decode("utf-8"):
                        failures.append("report.docx: word/document.xml lacks the ODC-By 1.0 notice")
            except (KeyError, zipfile.BadZipFile) as exc:
                failures.append(f"report.docx: the notice could not be read: {exc}")
    return failures


def main(argv: list[str]) -> int:
    members = MEMBERS
    if argv and argv[0].startswith("--members="):
        members = tuple(argv[0][len("--members=") :].split(","))
        argv = argv[1:]
    if len(argv) < 2:
        print(__doc__.strip().splitlines()[2], file=sys.stderr)
        return 2
    try:
        failures = check(argv[0], argv[1], argv[2:], members)
    except (OSError, ValueError, zipfile.BadZipFile) as exc:
        failures = [f"unreadable: {exc}"]
    for failure in failures:
        print(f"FAIL {failure}")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
