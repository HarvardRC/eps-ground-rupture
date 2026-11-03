"""The independent ZIP reader of docs/app/ddd.md §5.9 and §7.4 (zip.test.ts).

Usage: python3 -I test/zipcheck.py <file> <ISO instant> [<member SHA-256> ...]

Exits 0 only if Python's own zipfile module accepts the archive written by
src/download/zip.ts: ZipFile(file).testzip() is None; the member names are
exactly records.csv, statistics.csv, provenance.txt, and scenario.json, in
that order; every member is ZIP_STORED with flag_bits 0; every date_time
equals the instant's UTC fields floored to 2 seconds; and, when member
SHA-256 digests are given (lowercase hexadecimal, one per member in order),
each member's bytes match its digest. Standard library only. Prints one line
per failure and exits 1 on any.
"""

from __future__ import annotations

import hashlib
import sys
import zipfile
from datetime import datetime, timezone

MEMBERS = ("records.csv", "statistics.csv", "provenance.txt", "scenario.json")


def instant(text: str) -> tuple[int, int, int, int, int, int]:
    """The UTC fields of an ISO 8601 instant, seconds floored to 2 s."""
    if text.endswith("Z"):
        text = text[:-1] + "+00:00"
    moment = datetime.fromisoformat(text)
    if moment.tzinfo is None:
        raise ValueError(f"{text!r} names no time zone")
    utc = moment.astimezone(timezone.utc)  # noqa: UP017 - any python3 on PATH, 3.9 included
    return (utc.year, utc.month, utc.day, utc.hour, utc.minute, utc.second - utc.second % 2)


def check(path: str, when: str, digests: list[str]) -> list[str]:
    failures: list[str] = []
    expected_time = instant(when)
    with zipfile.ZipFile(path) as archive:
        bad = archive.testzip()
        if bad is not None:
            failures.append(f"testzip() reports a bad member: {bad}")
        infos = archive.infolist()
        names = tuple(info.filename for info in infos)
        if names != MEMBERS:
            failures.append(f"members {names!r}, expected {MEMBERS!r}")
        for info in infos:
            if info.compress_type != zipfile.ZIP_STORED:
                failures.append(
                    f"{info.filename}: compress_type {info.compress_type}, not ZIP_STORED"
                )
            if info.flag_bits != 0:
                failures.append(f"{info.filename}: flag_bits {info.flag_bits}, not 0")
            if tuple(info.date_time) != expected_time:
                failures.append(
                    f"{info.filename}: date_time {info.date_time}, expected {expected_time}"
                )
        if digests:
            if len(digests) != len(infos):
                failures.append(f"{len(digests)} digests given for {len(infos)} members")
            for info, digest in zip(infos, digests):  # noqa: B905 - lengths compared above
                actual = hashlib.sha256(archive.read(info)).hexdigest()
                if actual != digest.lower():
                    failures.append(f"{info.filename}: SHA-256 {actual}, expected {digest}")
    return failures


def main(argv: list[str]) -> int:
    if len(argv) < 2:
        print(__doc__.strip().splitlines()[2], file=sys.stderr)
        return 2
    try:
        failures = check(argv[0], argv[1], argv[2:])
    except (OSError, ValueError, zipfile.BadZipFile) as exc:
        failures = [f"unreadable: {exc}"]
    for failure in failures:
        print(f"FAIL {failure}")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
