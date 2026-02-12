"""Parse all life files and generate Atom XML"""

import datetime
import glob
import os
import posixpath
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Optional

from lxml import etree as ET
from markdown_it import MarkdownIt

BASE_URL = "https://peter.demin.dev"
SOURCE_DIR = "source"
LIFE_DIR = os.path.join(SOURCE_DIR, "16_life")
RE_LIFE_DATE = re.compile(r"^`([A-Z][a-z]{2} \d{2}, \d{4})`")
RE_STABLE_SLUG = re.compile(r"[ ,]+")
LIFE_DATE_FMT = "%b %d, %Y"
ATOM_NS = "http://www.w3.org/2005/Atom"
POSTS_DIR = Path("source") / "life"


@dataclass(frozen=True)
class AnnotatedLifeLine:
    """Information about a single line of life file."""

    text: str
    date: Optional[datetime.datetime]
    lineno: int = 0


@dataclass(frozen=True)
class MultilineLifeRecord:
    """Aggregation of one or more lines for a single life record."""

    date: datetime.datetime
    lines: list[AnnotatedLifeLine]

    @property
    def text(self) -> str:
        """Format sanitized record text as a single multiline string."""
        res: list[str] = []
        for line in self.lines:
            text = line.text
            if line.date is not None:
                text = text.replace(f"`{self.short_date}`", "").lstrip(" -·")
            if not text or text == "---":
                continue
            res.append(text)
        return "\n".join(res)

    @property
    def short_date(self) -> str:
        """Canonical short date representation for the life records"""
        return self.date.strftime(LIFE_DATE_FMT)

    @property
    def sort_key(self) -> tuple[datetime.datetime, int]:
        """Sort key for life records"""
        return (self.date, -self.lines[0].lineno)


@dataclass(frozen=True)
class FeedItem:
    """Atom Feed Item"""

    stable_id: str
    record: MultilineLifeRecord

    @property
    def url(self) -> str:
        """Generate URL suffix to locate this record"""
        return f"/life/{self._slug}.html"

    @property
    def atom_date(self) -> str:
        """Format record date for Atom Feed"""
        return self.record.date.replace(microsecond=0).isoformat() + "Z"

    @property
    def source_path(self) -> Path:
        return POSTS_DIR / (self._slug + ".md")

    @property
    def _slug(self) -> str:
        return RE_STABLE_SLUG.sub("-", self.stable_id).lower()


def aggregate_life_records(
    annotated_lines: Iterable[AnnotatedLifeLine],
) -> Iterable[MultilineLifeRecord]:
    """Combine all lines for the same record with date."""
    cur_date, cur_lines = None, []
    for line in annotated_lines:
        if line.date:
            if cur_date is not None:
                yield MultilineLifeRecord(date=cur_date, lines=cur_lines)
            cur_date, cur_lines = line.date, []
        cur_lines.append(line)
    if cur_date is not None:
        yield MultilineLifeRecord(date=cur_date, lines=cur_lines)


def wrap_feed_items(records: Iterable[MultilineLifeRecord]) -> Iterable[FeedItem]:
    """Wrap life records in FeedItems with stable IDs"""

    cur_date: datetime.datetime | None = None
    day_records: list[MultilineLifeRecord] = []

    def make_feed_items() -> list[FeedItem]:
        day_items = [
            FeedItem(stable_id=f"{rec.short_date}_{i}", record=rec)
            for i, rec in enumerate(day_records[::-1])
        ]
        return day_items[::-1]

    for record in records:
        if record.date == cur_date:
            day_records.append(record)
        else:
            yield from make_feed_items()
            day_records = [record]
        cur_date = record.date
    yield from make_feed_items()


def iter_life_lines() -> Iterable[AnnotatedLifeLine]:
    """Compose life records linking to notes created by date."""
    for file_name in iter_life_files():
        yield from parse_life_file(file_name)


def iter_life_files() -> list[str]:
    """Find all 16_life/YYYY-MM.md files."""
    return sorted(
        glob.glob(os.path.join(LIFE_DIR, "????-??.md"))
        + glob.glob(os.path.join(LIFE_DIR, "????.md"))
    )


def parse_life_file(file_path: str) -> Iterable[AnnotatedLifeLine]:
    """Parses life file at a given path and returns a list of annotated lines."""
    with open(file_path, "rt", encoding="utf-8") as fobj:
        for idx, line in enumerate(fobj):
            text = line.rstrip()
            yield AnnotatedLifeLine(
                lineno=idx,
                text=text,
                date=maybe_parse_date(line),
            )


def maybe_parse_date(text: str) -> Optional[datetime.datetime]:
    """Tries to parse date from the life record text."""
    if mobj := RE_LIFE_DATE.match(text):
        return datetime.datetime.strptime(mobj.group(1), LIFE_DATE_FMT)
    return None


def parse_title(path: str) -> str:
    source_path = os.path.join(SOURCE_DIR, path[1:])
    with open(source_path, "rt", encoding="utf-8") as fobj:
        return next(fobj).rstrip().lstrip("# ")


def render_internal_link(self, tokens, idx, options, env) -> str:
    href = path = tokens[idx].attrs["href"]
    content = ""
    if href.startswith("/"):
        root, ext = posixpath.splitext(href)
        if ext in (".rst", ".md"):
            href = root + ".html"
        tokens[idx].attrs["href"] = BASE_URL + href
        if tokens[idx].content == "":
            content = parse_title(path)
    return self.renderToken(tokens, idx, options, env) + content


def render_internal_image(self, tokens, idx, options, env) -> str:
    src = path = tokens[idx].attrs["src"]
    if src.startswith("/"):
        if "/images/" in src:
            src = posixpath.join("/_images", posixpath.basename(path))
        src = BASE_URL + src
    tokens[idx].attrs["src"] = src
    return self.renderToken(tokens, idx, options, env)


def build_atom_feed(
    *,
    items: list[FeedItem],
    title: str,
    feed_url: str,
    site_url: str,
    author_name: str,
    max_items: int,
) -> str:
    """Generate Atom Feed XML"""

    def q(x):
        return str(ET.QName(ATOM_NS, x))

    def add_top_level_element(
        name: str, text: str = "", attrib: dict | None = None
    ) -> ET.Element:
        el = ET.SubElement(feed, q(name), attrib=attrib or {})
        if text:
            el.text = text
        return el

    feed = ET.Element(q("feed"), nsmap={None: ATOM_NS})
    add_top_level_element("id", feed_url)
    add_top_level_element("title", title)
    add_top_level_element("updated", items[0].atom_date)
    add_top_level_element("link", attrib={"rel": "self", "href": feed_url})
    add_top_level_element("link", attrib={"href": site_url})
    author = add_top_level_element("author")
    ET.SubElement(author, q("name")).text = author_name

    md = MarkdownIt()
    md.add_render_rule("link_open", render_internal_link)
    md.add_render_rule("image", render_internal_image)
    for it in items[:max_items]:
        entry = ET.SubElement(feed, q("entry"))
        ET.SubElement(entry, q("id")).text = it.stable_id
        ET.SubElement(entry, q("title")).text = "Journal"
        ET.SubElement(entry, q("published")).text = it.atom_date
        ET.SubElement(entry, q("updated")).text = it.atom_date
        ET.SubElement(entry, q("link"), {"href": BASE_URL + it.url})
        ET.SubElement(entry, q("content"), {"type": "html"}).text = ET.CDATA(
            md.render(it.record.text)
        )

    xml_bytes = ET.tostring(feed, encoding="utf-8", xml_declaration=True)
    return xml_bytes.decode("utf-8")


def iter_feed_items() -> list[FeedItem]:
    return sorted(
        wrap_feed_items(aggregate_life_records(iter_life_lines())),
        key=lambda x: x.record.sort_key,
        reverse=True,
    )


def main():
    """Updates 16_life files with links to 12_articles and 17_notes files."""
    print(
        build_atom_feed(
            items=iter_feed_items(),
            title="Peter Demin",
            author_name="Peter Demin",
            feed_url="https://peter.demin.dev/life.xml",
            site_url="https://peter.demin.dev/life.html",
            max_items=100,
        )
    )


if __name__ == "__main__":
    main()
