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
§5.9; or those four and report.docx, the guided layout. For the guided
layout report.docx is opened as a nested archive and must hold the §13.4
part set: [Content_Types].xml, _rels/.rels, word/document.xml,
word/_rels/document.xml.rels, then word/media/chart-1.png ... chart-n.png,
every part stored with flag_bits 0, an ASCII name, and the same date_time;
every XML part well formed; each image relationship naming a media part,
every media part named by one, and every r:embed resolving to one; each
media part a PNG. Its bytes are never digested: PNG bytes vary by browser.
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
LAYOUTS = (MEMBERS, (*MEMBERS, REPORT))
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
        if members[-1] == REPORT and REPORT in names:
            failures += check_report(archive.read(REPORT), expected_time)
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
