#!/usr/bin/env python3
"""Validate local links and resources used by the site's static routes.

External URLs are intentionally not fetched. This check validates the local
filesystem references that the static server and GitHub Pages must serve.
"""

from __future__ import annotations

import posixpath
import re
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urljoin, urlsplit


ROOT = Path(__file__).resolve().parents[1]
ROUTES = (
    ("/", Path("index.html")),
    ("/planejamento/", Path("planejamento/index.html")),
    ("/consultoria/", Path("consultoria/index.html")),
    ("/family-office/", Path("family-office/index.html")),
    ("/rede/", Path("rede/index.html")),
    ("/educacao/", Path("educacao/index.html")),
    ("/quem-somos/", Path("quem-somos/index.html")),
)

HTML_REFERENCE_ATTRIBUTES = {
    "href",
    "src",
    "poster",
    "action",
    "data-src",
    "data-poster",
}
CSS_URL_PATTERN = re.compile(r"""url\(\s*(?P<quote>['"]?)(?P<url>.*?)(?P=quote)\s*\)""", re.I)
FETCH_URL_PATTERN = re.compile(
    r"""(?:fetch|import)\s*\(\s*['"](?P<url>[^'"]+)['"]""", re.I
)
STATIC_EXTENSIONS = {
    ".avif",
    ".css",
    ".gif",
    ".html",
    ".ico",
    ".jpeg",
    ".jpg",
    ".js",
    ".json",
    ".map",
    ".mp4",
    ".png",
    ".svg",
    ".webp",
    ".woff",
    ".woff2",
}


class HTMLReferenceParser(HTMLParser):
    """Collect resource links and anchor targets without third-party packages."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.references: list[tuple[str, str, str]] = []
        self.anchors: set[str] = set()

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attributes = dict(attrs)
        for name in HTML_REFERENCE_ATTRIBUTES:
            value = attributes.get(name)
            if value:
                self.references.append((tag, name, value))

        element_id = attributes.get("id")
        if element_id:
            self.anchors.add(element_id)
        named_anchor = attributes.get("name")
        if tag.lower() == "a" and named_anchor:
            self.anchors.add(named_anchor)


class SiteChecker:
    def __init__(self) -> None:
        self.errors: list[str] = []
        self.checked_references = 0
        self.html_anchors: dict[Path, set[str]] = {}
        self.css_owners: dict[Path, list[str]] = {}
        self.js_owners: dict[Path, list[str]] = {}

    def error(self, owner: str, raw_url: str, reason: str) -> None:
        self.errors.append(f"ERROR {owner} -> {raw_url}: {reason}")

    def source_url(self, path: Path) -> str:
        try:
            relative_path = path.resolve().relative_to(ROOT)
        except ValueError:
            relative_path = path
        return "/" + relative_path.as_posix()

    def local_target(self, url_path: str) -> Path | None:
        """Resolve a URL path to a file, including directory index pages."""
        normalized = posixpath.normpath(unquote(url_path or "/"))
        if normalized == ".":
            normalized = "/"
        if not normalized.startswith("/"):
            normalized = "/" + normalized
        if normalized == "/":
            candidate = ROOT / "index.html"
        else:
            candidate = ROOT / normalized.lstrip("/")
            if candidate.is_dir():
                candidate = candidate / "index.html"
            elif not candidate.exists() and Path(normalized).suffix == "":
                candidate = candidate / "index.html"

        try:
            candidate.relative_to(ROOT)
        except ValueError:
            return None
        return candidate

    def is_external(self, raw_url: str) -> bool:
        parsed = urlsplit(raw_url)
        return bool(parsed.scheme or parsed.netloc)

    def check_fragment(self, target: Path, fragment: str, owner: str, raw_url: str) -> None:
        if not fragment or target.suffix.lower() != ".html":
            return
        if target not in self.html_anchors:
            parser = HTMLReferenceParser()
            try:
                parser.feed(target.read_text(encoding="utf-8"))
            except OSError as exc:
                self.error(owner, raw_url, f"could not read anchor target ({exc})")
                return
            self.html_anchors[target] = parser.anchors
        if unquote(fragment) not in self.html_anchors[target]:
            self.error(owner, raw_url, f"anchor #{unquote(fragment)} was not found")

    def check_reference(
        self,
        raw_url: str,
        source_file: Path,
        owner: str,
        *,
        check_fragments: bool = True,
    ) -> None:
        raw_url = raw_url.strip()
        if not raw_url or raw_url.startswith(("data:", "javascript:", "mailto:", "tel:")):
            return
        if self.is_external(raw_url):
            return

        self.checked_references += 1
        resolved = urljoin(self.source_url(source_file), raw_url)
        parsed = urlsplit(resolved)
        target = self.local_target(parsed.path)
        if target is None or not target.is_file():
            self.error(owner, raw_url, "local file was not found")
            return
        if check_fragments:
            self.check_fragment(target, parsed.fragment, owner, raw_url)

    def check_html_page(self, route: str, page: Path) -> None:
        if not page.is_file():
            self.error(route, page.as_posix(), "route page was not found")
            return

        parser = HTMLReferenceParser()
        try:
            parser.feed(page.read_text(encoding="utf-8"))
        except OSError as exc:
            self.error(route, page.as_posix(), f"could not read route page ({exc})")
            return
        self.html_anchors[page] = parser.anchors

        for tag, attribute, value in parser.references:
            values = value.split(",") if attribute == "srcset" else [value]
            for item in values:
                reference = item.strip().split()[0]
                self.check_reference(reference, page, route)

                if attribute == "href" and reference.startswith("#"):
                    # The normal reference check resolves this against the page,
                    # so this branch only documents the intent at the call site.
                    continue

        # The standard resource attributes above do not include srcset because
        # it needs special parsing. Capture it separately for responsive images.
        for tag, attrs in self._start_tags(page):
            srcset = attrs.get("srcset")
            if srcset:
                for item in srcset.split(","):
                    reference = item.strip().split()[0]
                    self.check_reference(reference, page, route)

    def _start_tags(self, page: Path):
        parser = _AttributeParser()
        parser.feed(page.read_text(encoding="utf-8"))
        return parser.tags

    def check_stylesheet(self, stylesheet: Path, owners: list[str]) -> None:
        owner = ", ".join(owners) if owners else stylesheet.as_posix()
        try:
            css = stylesheet.read_text(encoding="utf-8")
        except OSError as exc:
            self.error(owner, stylesheet.as_posix(), f"could not read stylesheet ({exc})")
            return
        for match in CSS_URL_PATTERN.finditer(css):
            self.check_reference(match.group("url"), stylesheet, owner)

    def check_script(self, script: Path, owners: list[str]) -> None:
        owner = ", ".join(owners) if owners else script.as_posix()
        try:
            source = script.read_text(encoding="utf-8")
        except OSError as exc:
            self.error(owner, script.as_posix(), f"could not read script ({exc})")
            return
        for match in FETCH_URL_PATTERN.finditer(source):
            raw_url = match.group("url")
            path = urlsplit(raw_url).path
            if path.startswith(("assets/", "/assets/")) or Path(path).suffix.lower() in STATIC_EXTENSIONS:
                self.check_reference(raw_url, script, owner, check_fragments=False)

    def run(self) -> int:
        page_paths = {page for _, page in ROUTES}
        linked_stylesheets: dict[Path, list[str]] = {}
        linked_scripts: dict[Path, list[str]] = {}

        for route, page in ROUTES:
            self.check_html_page(route, page)
            parser = HTMLReferenceParser()
            parser.feed(page.read_text(encoding="utf-8"))
            for _, attribute, value in parser.references:
                if attribute != "href" and attribute != "src":
                    continue
                if self.is_external(value):
                    continue
                target = self.local_target(urlsplit(urljoin(self.source_url(page), value)).path)
                if target is None:
                    continue
                if target.suffix.lower() == ".css":
                    linked_stylesheets.setdefault(target, []).append(route)
                elif target.suffix.lower() == ".js":
                    linked_scripts.setdefault(target, []).append(route)

        for stylesheet, owners in linked_stylesheets.items():
            self.check_stylesheet(stylesheet, owners)
        for script, owners in linked_scripts.items():
            self.check_script(script, owners)

        # Ensure the declared route set stays explicit and complete.
        if len(page_paths) != 7:
            self.error("routes", "ROUTES", "expected exactly seven routes")

        print(
            f"Checked {len(ROUTES)} routes and {self.checked_references} local references."
        )
        if self.errors:
            for error in sorted(set(self.errors)):
                print(error)
            print(f"Found {len(set(self.errors))} broken reference(s).")
            return 1
        print("No broken local links, anchors, stylesheets, scripts, or assets found.")
        return 0


class _AttributeParser(HTMLParser):
    """Small second parser used only to read srcset attributes."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.tags: list[tuple[str, dict[str, str]]] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self.tags.append((tag, {name: value for name, value in attrs if value is not None}))


if __name__ == "__main__":
    sys.exit(SiteChecker().run())