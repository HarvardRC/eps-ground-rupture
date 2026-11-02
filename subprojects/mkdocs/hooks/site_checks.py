"""Site checks hook of the companion site (docs/app/ddd.md §6.1, Site checks hook).

MkDocs loads this file through the `hooks` entry of mkdocs.yml, which
mkdocs.preview.yml inherits, so it checks every build that writes a site
tree: CI's, the local Gradle tasks', a bare `mkdocs build`, and the
`mkdocs gh-deploy` fallback, which calls the same build. `on_startup`
records the command; under `mkdocs serve` the hook checks nothing and
leaves the sitemap as rendered.

`on_files` records the source files the running configuration drafts
(`draft_docs`) and its unlisted pages: those it lists under `not_in_nav`
without drafting them. Every build whose configuration file is not
mkdocs.preview.yml is a publication build; in one, `on_post_template`
removes each unlisted page's `<url>` element from the rendered
sitemap.xml, before MkDocs writes sitemap.xml and sitemap.xml.gz from it.
`on_post_build` then walks the output tree and raises PluginError, which
aborts the build, listing every offending site-relative path under the
arms of §6.1:

(a) development media: any path under media/dev/, and any built .html,
    .js, or .css file containing the substring media/dev/;
(b) publication inventory: any file outside assets/scenario/ whose
    suffix is not .html, .js, .css, .map, .json, .xml, or .txt
    (sitemap.xml.gz excepted), referenced or not, unless its path matches
    a line of publication-allowlist.txt (fnmatch patterns, # comments);
(d) publication boundary: for every drafted source file, its output path
    is absent from the output tree, its URL is absent from sitemap.xml
    and from search/search_index.json, and no href or src in a built page
    resolves to it; in a publication build, for every unlisted page, its
    URL is absent from sitemap.xml and from search/search_index.json, and
    no href or src in any other built page resolves to it.

§6.1's arms (c), application subtree, and (e), Tableau exclusion, join
with T-51 — Site validation additions (docs/app/ip.md), and arm (b)'s
exception for granted media-index entries with P2.
"""

from __future__ import annotations

import fnmatch
import html
import json
import os
import posixpath
import re
from collections.abc import Iterator
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urljoin, urlsplit
from xml.etree import ElementTree

from mkdocs.config.defaults import MkDocsConfig
from mkdocs.exceptions import PluginError
from mkdocs.plugins import event_priority
from mkdocs.structure.files import File, Files, InclusionLevel

PREVIEW_CONFIG = "mkdocs.preview.yml"
ALLOWLIST = Path(__file__).resolve().parent.parent / "publication-allowlist.txt"

DEV_MEDIA = "media/dev/"
DEV_MEDIA_SCANNED = (".html", ".js", ".css")
APP_SUBTREE = "assets/scenario/"
TEXT_SUFFIXES = (".html", ".js", ".css", ".map", ".json", ".xml", ".txt")
SITEMAP = "sitemap.xml"
SITEMAP_GZ = "sitemap.xml.gz"
SEARCH_INDEX = "search/search_index.json"
SITEMAP_LOC = "{http://www.sitemaps.org/schemas/sitemap/0.9}loc"

ARMS = {
    "a": "development media",
    "b": "publication inventory",
    "d": "publication boundary",
}

# One <url> element of the rendered sitemap, with its indentation and line
# break, as the template of mkdocs 1.6.1 (mkdocs/templates/sitemap.xml) writes it.
URL_ELEMENT = re.compile(r"[ \t]*<url>\s*<loc>(?P<loc>[^<]*)</loc>.*?</url>\n?", re.S)

_command: str | None = None  # the mkdocs command, recorded by on_startup
_drafts: list[File] = []  # source files the running configuration drafts
_unlisted: list[File] = []  # pages under not_in_nav that are not drafted


def on_startup(*, command: str, dirty: bool) -> None:
    global _command
    _command = command


def on_files(files: Files, *, config: MkDocsConfig) -> Files:
    _drafts[:] = [f for f in files if f.inclusion is InclusionLevel.DRAFT]
    _unlisted[:] = [
        f for f in files if f.is_documentation_page() and f.inclusion is InclusionLevel.NOT_IN_NAV
    ]
    return files


def on_post_template(output_content: str, *, template_name: str, config: MkDocsConfig) -> str:
    if template_name != SITEMAP or _serving() or not _publication_build(config):
        return output_content
    unlisted = {f.page.canonical_url for f in _unlisted if f.page is not None}
    return URL_ELEMENT.sub(
        lambda m: "" if html.unescape(m["loc"].strip()) in unlisted else m[0],
        output_content,
    )


# Last among the post-build handlers, so the walk sees the finished tree.
@event_priority(-100)
def on_post_build(*, config: MkDocsConfig) -> None:
    if _serving():
        return
    site = Path(config.site_dir)
    paths = _walk(site)
    findings = sorted(
        [("a", *f) for f in _development_media(site, paths)]
        + [("b", *f) for f in _publication_inventory(paths)]
        + [("d", *f) for f in _publication_boundary(site, paths, config)]
    )
    if findings:
        lines = [f"  ({arm}) {ARMS[arm]}: {path} — {why}" for arm, path, why in findings]
        raise PluginError(
            "Site checks (hooks/site_checks.py, docs/app/ddd.md §6.1) failed; "
            "offending site paths:\n" + "\n".join(lines)
        )


def _serving() -> bool:
    return _command == "serve"


def _publication_build(config: MkDocsConfig) -> bool:
    return os.path.basename(config.config_file_path or "") != PREVIEW_CONFIG


def _walk(site: Path) -> list[str]:
    """Every file of the output tree, as sorted site-relative POSIX paths."""
    return sorted(
        Path(root, name).relative_to(site).as_posix()
        for root, _dirs, names in os.walk(site)
        for name in names
    )


def _development_media(site: Path, paths: list[str]) -> Iterator[tuple[str, str]]:
    """Arm (a)."""
    for path in paths:
        if path.startswith(DEV_MEDIA):
            yield path, f"a path under {DEV_MEDIA}"
        elif path.endswith(DEV_MEDIA_SCANNED) and DEV_MEDIA.encode() in (site / path).read_bytes():
            yield path, f"contains the substring {DEV_MEDIA}"


def _publication_inventory(paths: list[str]) -> Iterator[tuple[str, str]]:
    """Arm (b)."""
    patterns = _allowlist()
    for path in paths:
        if path.startswith(APP_SUBTREE) or path == SITEMAP_GZ:
            continue
        if posixpath.splitext(path)[1] in TEXT_SUFFIXES:
            continue
        if not any(fnmatch.fnmatchcase(path, pattern) for pattern in patterns):
            yield path, f"a non-text file that {ALLOWLIST.name} does not list"


def _allowlist() -> list[str]:
    try:
        lines = ALLOWLIST.read_text(encoding="utf-8").splitlines()
    except FileNotFoundError:
        raise PluginError(
            f"Site checks: the publication allowlist {ALLOWLIST} is missing"
        ) from None
    return [s for s in (line.strip() for line in lines) if s and not s.startswith("#")]


def _publication_boundary(
    site: Path, paths: list[str], config: MkDocsConfig
) -> Iterator[tuple[str, str]]:
    """Arm (d)."""
    checked = [(f, "drafted") for f in _drafts]
    if _publication_build(config):
        checked += [(f, "unlisted") for f in _unlisted]
    if not checked:
        return
    root = _site_root(config.site_url)
    present = set(paths)
    in_sitemap = _sitemap_paths(site, root)
    in_search = _search_paths(site)
    # Each site-relative URL path that addresses a checked file, mapped to it.
    targets: dict[str, list[tuple[File, str]]] = {}
    for f, state in checked:
        forms = _forms(f)
        for form in forms:
            targets.setdefault(form, []).append((f, state))
        if state == "drafted" and f.dest_uri in present:
            yield f.dest_uri, f"the output of the drafted {f.src_uri}"
        if forms & in_sitemap:
            yield SITEMAP, f"lists the {state} {f.src_uri}"
        if forms & in_search:
            yield SEARCH_INDEX, f"indexes the {state} {f.src_uri}"
    for page in (p for p in paths if p.endswith(".html")):
        hits: dict[str, str] = {}
        for ref in _refs(site / page):
            for f, state in targets.get(_resolve(ref, page, root) or "", []):
                if not (state == "unlisted" and page == f.dest_uri):
                    hits.setdefault(f.src_uri, state)
        for src_uri, state in hits.items():
            yield page, f"an href or src resolves to the {state} {src_uri}"


def _norm(path: str) -> str:
    """A site-relative URL path, unquoted, with the site root as ''."""
    path = unquote(path)
    return "" if path in (".", "./") else path.removeprefix("./")


def _forms(f: File) -> set[str]:
    """The site-relative URL paths that address `f`: its URL, its output path,
    and for a directory URL the same without the trailing slash."""
    url = _norm(f.url)
    forms = {url, _norm(f.dest_uri)}
    if url.endswith("/"):
        forms.add(url.rstrip("/"))
    return forms


def _site_root(site_url: str | None) -> tuple[str, str]:
    """The host and base path that `site_url` publishes the site under."""
    parts = urlsplit(site_url or "https://site.invalid/")
    base = parts.path if parts.path.endswith("/") else parts.path + "/"
    return parts.netloc.lower(), base


def _resolve(ref: str, page: str, root: tuple[str, str]) -> str | None:
    """The site-relative URL path that `ref`, read in the built page `page`
    (site-relative; '' for the site root), addresses; None outside the site."""
    host, base = root
    target = urlsplit(urljoin(f"https://{host}{base}{page}", ref.strip()))
    if target.scheme not in ("http", "https") or target.netloc.lower() != host:
        return None
    if not target.path.startswith(base):
        return None
    return _norm(target.path[len(base) :])


class _RefParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.refs: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self.refs.extend(v for k, v in attrs if k in ("href", "src") and v)


def _refs(page: Path) -> list[str]:
    """Every href and src attribute value of a built page."""
    parser = _RefParser()
    parser.feed(page.read_text(encoding="utf-8", errors="replace"))
    parser.close()
    return parser.refs


def _sitemap_paths(site: Path, root: tuple[str, str]) -> set[str]:
    """The site-relative URL paths that sitemap.xml lists."""
    sitemap = site / SITEMAP
    if not sitemap.is_file():
        return set()
    locs = ((loc.text or "").strip() for loc in ElementTree.parse(sitemap).iter(SITEMAP_LOC))
    return {path for path in (_resolve(loc, "", root) for loc in locs) if path is not None}


def _search_paths(site: Path) -> set[str]:
    """The site-relative URL paths that the search index holds."""
    index = site / SEARCH_INDEX
    if not index.is_file():
        return set()
    docs = json.loads(index.read_text(encoding="utf-8")).get("docs", [])
    return {_norm(doc.get("location", "").split("#", 1)[0]) for doc in docs}
