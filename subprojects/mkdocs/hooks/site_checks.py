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
(c) application subtree: when assets/scenario/ exists in the output,
    assets/scenario/data/ holds exactly the `files` keys of the committed
    subprojects/webapp/data/pointer.json, each file's SHA-256 equal to the
    pointer's, and assets/scenario/ holds at top level exactly data/ plus
    the app-<hash>.js and app-<hash>.css that the built scenario/index.html
    names (the #gre-app src and the stylesheet href);
(d) publication boundary: for every drafted source file, its output path
    is absent from the output tree, its URL is absent from sitemap.xml
    and from search/search_index.json, and no href or src in a built page
    resolves to it; in a publication build, for every unlisted page, its
    URL is absent from sitemap.xml and from search/search_index.json, and
    no href or src in any listed built page resolves to it — links between
    unlisted pages list neither, so the guided page keeps its link to the
    existing explorer (guided-journey-ddd.md §§6, 9.4); and in a
    publication build that outputs explore/index.html, the guided page is
    one of the unlisted pages (PDD D-39);
(e) Tableau exclusion: no built page carries a <script> whose src begins
    with https://public.tableau.com/javascripts/api/, and every built page
    carries a <script> whose src ends with javascripts/tableau-loader.js.
(f) guided explorer: its page names exactly one hashed module and
    stylesheet in assets/explore/, the subtree contains exactly those
    files, and its mount and version stamps reference the shared pinned
    manifest under assets/scenario/data/.

Arm (b)'s exception for granted media-index entries joins with P2.
"""

from __future__ import annotations

import fnmatch
import hashlib
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
# The committed pointer manifest (docs/app/ddd.md §3.3), arm (c)'s reference.
POINTER = Path(__file__).resolve().parents[2] / "webapp" / "data" / "pointer.json"

DEV_MEDIA = "media/dev/"
DEV_MEDIA_SCANNED = (".html", ".js", ".css")
APP_SUBTREE = "assets/scenario/"
APP_DATA = APP_SUBTREE + "data/"
SCENARIO_PAGE = "scenario/index.html"
EXPLORE_SUBTREE = "assets/explore/"
EXPLORE_PAGE = "explore/index.html"
TABLEAU_API = "https://public.tableau.com/javascripts/api/"
TABLEAU_LOADER = "javascripts/tableau-loader.js"
TEXT_SUFFIXES = (".html", ".js", ".css", ".map", ".json", ".xml", ".txt")
SITEMAP = "sitemap.xml"
SITEMAP_GZ = "sitemap.xml.gz"
SEARCH_INDEX = "search/search_index.json"
SITEMAP_LOC = "{http://www.sitemaps.org/schemas/sitemap/0.9}loc"

ARMS = {
    "a": "development media",
    "b": "publication inventory",
    "c": "application subtree",
    "d": "publication boundary",
    "e": "Tableau exclusion",
    "f": "guided explorer",
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
        + [("c", *f) for f in _application_subtree(site, paths, config)]
        + [("d", *f) for f in _publication_boundary(site, paths, config)]
        + [("e", *f) for f in _tableau_exclusion(site, paths)]
        + [("f", *f) for f in _explore_subtree(site, paths, config)]
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


def _application_subtree(
    site: Path, paths: list[str], config: MkDocsConfig
) -> Iterator[tuple[str, str]]:
    """Arm (c)."""
    subtree = site / APP_SUBTREE
    if not subtree.is_dir():
        return
    pointer = _pointer_files()
    staged = {path[len(APP_DATA) :]: path for path in paths if path.startswith(APP_DATA)}
    for name, path in staged.items():
        if name not in pointer:
            yield path, f"not a files key of {POINTER.name}"
        elif _sha256(site / path) != pointer[name]:
            yield path, f"its SHA-256 differs from the one {POINTER.name} lists"
    for name in pointer.keys() - staged.keys():
        yield APP_DATA + name, f"a files key of {POINTER.name} that the output lacks"
    named: set[str] = set()
    page = site / SCENARIO_PAGE
    if page.is_file():
        root = _site_root(config.site_url)
        tags = _tags(page)
        scripts = {
            _top_level_name(attrs.get("src"), root)
            for tag, attrs in tags
            if tag == "script" and attrs.get("id") == "gre-app"
        } - {None}
        sheets = {
            _top_level_name(attrs.get("href"), root)
            for tag, attrs in tags
            if tag == "link" and "stylesheet" in (attrs.get("rel") or "").lower().split()
        } - {None}
        if not scripts:
            yield SCENARIO_PAGE, f"its #gre-app src names no file directly under {APP_SUBTREE}"
        if not sheets:
            yield SCENARIO_PAGE, f"no stylesheet href names a file directly under {APP_SUBTREE}"
        named = {name for name in scripts | sheets if name}
    else:
        yield SCENARIO_PAGE, "absent from the output, so no built page names the application assets"
    expected = {"data/"} | named
    actual = {entry.name + "/" if entry.is_dir() else entry.name for entry in subtree.iterdir()}
    for name in sorted(actual - expected):
        yield APP_SUBTREE + name, f"neither data/ nor an asset that {SCENARIO_PAGE} names"
    for name in sorted(expected - actual):
        yield APP_SUBTREE + name, "absent from the output"


def _explore_subtree(
    site: Path, paths: list[str], config: MkDocsConfig
) -> Iterator[tuple[str, str]]:
    """The independent guided entry, sharing the legacy data subtree."""
    subtree = site / EXPLORE_SUBTREE
    page = site / EXPLORE_PAGE
    if not subtree.exists() and not page.exists():
        return
    if not subtree.is_dir():
        yield EXPLORE_SUBTREE, "guided assets are absent"
    if not page.is_file():
        yield EXPLORE_PAGE, "guided assets exist but their page is absent"
        return

    root = _site_root(config.site_url)
    tags = _tags(page)
    if sum(attrs.get("id") == "gre-explore" for _tag, attrs in tags) != 1:
        yield EXPLORE_PAGE, "must contain exactly one #gre-explore mount"
    if any(attrs.get("id") in ("gre-root", "gre-app") for _tag, attrs in tags):
        yield EXPLORE_PAGE, "must not contain a legacy scenario mount or script"
    scripts = [attrs for tag, attrs in tags if tag == "script" and attrs.get("id") == "gre-explore-app"]
    if len(scripts) != 1:
        yield EXPLORE_PAGE, "must name exactly one #gre-explore-app module"

    expected: set[str] = set()
    for attrs in scripts:
        target = _resolve(attrs.get("src") or "", EXPLORE_PAGE, root)
        if attrs.get("type") != "module":
            yield EXPLORE_PAGE, "#gre-explore-app must be a module"
        if target is None or not re.fullmatch(r"assets/explore/explore-[0-9a-f]{12}\.js", target):
            yield EXPLORE_PAGE, "#gre-explore-app must name a hashed explore module"
            continue
        expected.add(target[len(EXPLORE_SUBTREE) :])
        if not (attrs.get("data-software-version") or "").strip():
            yield EXPLORE_PAGE, "#gre-explore-app lacks a software-version stamp"
        pointer = json.loads(POINTER.read_text(encoding="utf-8"))
        if not pointer.get("export_version") or attrs.get("data-data-version") != pointer["export_version"]:
            yield EXPLORE_PAGE, "#gre-explore-app data-version stamp differs from the pointer"
        manifests = [name for name in _pointer_files() if re.fullmatch(r"manifest-[0-9a-f]{12}\.json", name)]
        if len(manifests) != 1:
            yield EXPLORE_PAGE, "the pointer must name exactly one shared manifest"
        else:
            manifest = APP_DATA + manifests[0]
            if _resolve(attrs.get("data-manifest") or "", target, root) != manifest:
                yield EXPLORE_PAGE, "#gre-explore-app must reference the shared pinned scenario manifest"
            if manifest not in paths:
                yield manifest, "the guided page's shared manifest is absent"

    sheets = [
        target
        for tag, attrs in tags
        if tag == "link" and "stylesheet" in (attrs.get("rel") or "").lower().split()
        if (target := _resolve(attrs.get("href") or "", EXPLORE_PAGE, root)) is not None
        and target.startswith(EXPLORE_SUBTREE)
    ]
    if len(sheets) != 1:
        yield EXPLORE_PAGE, "must name exactly one stylesheet in assets/explore/"
    for target in sheets:
        if not re.fullmatch(r"assets/explore/explore-[0-9a-f]{12}\.css", target):
            yield EXPLORE_PAGE, "must name a hashed explore stylesheet"
        else:
            expected.add(target[len(EXPLORE_SUBTREE) :])
    actual = {
        entry.name + "/" if entry.is_dir() else entry.name
        for entry in subtree.iterdir()
    } if subtree.is_dir() else set()
    for name in sorted(actual - expected):
        yield EXPLORE_SUBTREE + name, "not an asset named by the guided page"
    for name in sorted(expected - actual):
        yield EXPLORE_SUBTREE + name, "absent from the output"
    for name in sorted(expected & actual):
        if _sha256(subtree / name)[:12] != name.removeprefix("explore-").split(".", 1)[0]:
            yield EXPLORE_SUBTREE + name, "content does not match its hashed filename"


def _pointer_files() -> dict[str, str]:
    """The `files` map (name -> SHA-256) of the committed pointer manifest."""
    try:
        files = json.loads(POINTER.read_text(encoding="utf-8"))["files"]
    except (FileNotFoundError, json.JSONDecodeError, KeyError, TypeError) as e:
        raise PluginError(
            f"Site checks: the pointer manifest {POINTER} has no readable files map ({e!r})"
        ) from None
    return dict(files)


def _sha256(path: Path) -> str:
    """The lowercase hexadecimal SHA-256 of a file's bytes."""
    digest = hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(1 << 16), b""):
            digest.update(block)
    return digest.hexdigest()


def _top_level_name(ref: str | None, root: tuple[str, str]) -> str | None:
    """The name of the file at the top level of assets/scenario/ that `ref`,
    read in the built scenario page, addresses; None for any other target."""
    target = _resolve(ref or "", SCENARIO_PAGE, root)
    if target is None or not target.startswith(APP_SUBTREE):
        return None
    name = target[len(APP_SUBTREE) :]
    return name if name and "/" not in name else None


def _tableau_exclusion(site: Path, paths: list[str]) -> Iterator[tuple[str, str]]:
    """Arm (e)."""
    for page in (p for p in paths if p.endswith(".html")):
        srcs = [
            (attrs.get("src") or "").strip() for tag, attrs in _tags(site / page) if tag == "script"
        ]
        if any(src.startswith(TABLEAU_API) for src in srcs):
            yield page, f"a <script> src begins with {TABLEAU_API}"
        if not any(src.endswith(TABLEAU_LOADER) for src in srcs):
            yield page, f"no <script> src ends with {TABLEAU_LOADER}"


def _publication_boundary(
    site: Path, paths: list[str], config: MkDocsConfig
) -> Iterator[tuple[str, str]]:
    """Arm (d)."""
    present = set(paths)
    checked = [(f, "drafted") for f in _drafts]
    # Built pages that are themselves unlisted; their links list nothing.
    unlisted_pages: set[str] = set()
    if _publication_build(config):
        checked += [(f, "unlisted") for f in _unlisted]
        unlisted_pages = {f.dest_uri for f in _unlisted}
        if EXPLORE_PAGE in present and EXPLORE_PAGE not in unlisted_pages:
            yield EXPLORE_PAGE, "the published guided page is not unlisted (not_in_nav, PDD D-39)"
    if not checked:
        return
    root = _site_root(config.site_url)
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
                if not (state == "unlisted" and page in unlisted_pages):
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


class _TagParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.tags: list[tuple[str, dict[str, str | None]]] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self.tags.append((tag, dict(attrs)))


def _tags(page: Path) -> list[tuple[str, dict[str, str | None]]]:
    """Every start tag of a built page, with its attributes."""
    parser = _TagParser()
    parser.feed(page.read_text(encoding="utf-8", errors="replace"))
    parser.close()
    return parser.tags


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
