"""Generate a static Atom feed for Rippling's Engineering blog hub.

The hub at https://www.rippling.com/blog/hub/engineering uses client-side
pagination: clicking page buttons updates the article grid in place while the
URL stays fixed. This script uses Selenium only for the hub crawl, then fetches
individual article pages over plain HTTP and extracts metadata from each page's
embedded ``__NEXT_DATA__`` payload.
"""

from __future__ import annotations

import argparse
import datetime as dt
import html
import json
import logging
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from html.parser import HTMLParser
from typing import Iterable


HUB_URL = "https://www.rippling.com/blog/hub/engineering"
SITE_URL = "https://www.rippling.com"
ATOM_NS = "http://www.w3.org/2005/Atom"
DEFAULT_OUTPUT = "rippling-engineering.atom.xml"
DEFAULT_TIMEOUT = 30.0
DEFAULT_PAGINATION_TIMEOUT = 90.0
DEFAULT_WINDOW_WIDTH = 1800
DEFAULT_WINDOW_HEIGHT = 3200
USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/128.0.0.0 Safari/537.36"
)
NEXT_DATA_RE = re.compile(
    r'<script[^>]+id="__NEXT_DATA__"[^>]*>(?P<json>.*?)</script>',
    re.DOTALL,
)
LOGGER = logging.getLogger("rippling_feed")


class MetaParser(HTMLParser):
    """Collect meta tags from a document."""

    def __init__(self) -> None:
        super().__init__()
        self.meta: dict[str, str] = {}

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() != "meta":
            return
        data = dict(attrs)
        key = data.get("property") or data.get("name")
        value = data.get("content")
        if key and value:
            self.meta[key] = value


@dataclass(frozen=True)
class Article:
    url: str
    title: str
    summary: str
    published_at: dt.datetime
    updated_at: dt.datetime
    author: str | None


def fetch_html(url: str, timeout: float) -> str:
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "text/html,application/xhtml+xml",
        },
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        charset = response.headers.get_content_charset() or "utf-8"
        return response.read().decode(charset, errors="replace")


def extract_next_data(html_text: str) -> dict:
    match = NEXT_DATA_RE.search(html_text)
    if not match:
        raise ValueError("Could not find __NEXT_DATA__ payload")
    return json.loads(match.group("json"))


def parse_iso_datetime(value: str | None) -> dt.datetime:
    if not value:
        raise ValueError("Missing datetime value")
    parsed = dt.datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=dt.timezone.utc)
    return parsed


def parse_updated_datetime(hero_data: dict) -> dt.datetime:
    modified = hero_data.get("modifiedDate")
    if modified:
        if "T" in modified:
            return parse_iso_datetime(modified)
        return parse_iso_datetime(f"{modified}T00:00:00+00:00")
    return parse_iso_datetime(hero_data.get("publishedAt") or hero_data.get("firstPublishedAt"))


def article_path_from_url(url: str) -> str | None:
    parsed = urllib.parse.urlparse(url)
    parts = parsed.path.strip("/").split("/")
    if len(parts) == 2 and parts[0] == "blog":
        return parsed.path
    return None


def collect_article_urls_with_selenium(
    hub_url: str,
    *,
    browser_name: str,
    driver_path: str | None,
    headful: bool,
    timeout: float,
    pagination_timeout: float,
    window_width: int,
    window_height: int,
) -> list[str]:
    try:
        from selenium import webdriver
        from selenium.common.exceptions import TimeoutException
        from selenium.webdriver.chrome.options import Options as ChromeOptions
        from selenium.webdriver.chrome.service import Service as ChromeService
        from selenium.webdriver.common.by import By
        from selenium.webdriver.safari.options import Options as SafariOptions
        from selenium.webdriver.safari.service import Service as SafariService
        from selenium.webdriver.support import expected_conditions as EC
        from selenium.webdriver.support.ui import WebDriverWait
    except ModuleNotFoundError as exc:
        raise SystemExit(
            "This script requires Selenium. Install it with "
            "`python3 -m pip install selenium`."
        ) from exc

    if browser_name == "chrome":
        options = ChromeOptions()
        if not headful:
            options.add_argument("--headless=new")
        options.add_argument("--disable-gpu")
        options.add_argument(f"--window-size={window_width},{window_height}")
        options.add_argument(f"--user-agent={USER_AGENT}")
        service = ChromeService(executable_path=driver_path) if driver_path else None
        driver = webdriver.Chrome(service=service, options=options)
    elif browser_name == "safari":
        if not headful:
            raise SystemExit("Safari WebDriver does not support headless mode. Re-run with --headful.")
        options = SafariOptions()
        service = SafariService(executable_path=driver_path) if driver_path else None
        driver = webdriver.Safari(service=service, options=options)
    else:
        raise SystemExit(f"Unsupported browser: {browser_name}")

    try:
        driver.set_window_size(window_width, window_height)
    except Exception:
        pass

    LOGGER.info(
        "Starting hub crawl with %s at %sx%s",
        browser_name,
        window_width,
        window_height,
    )
    wait = WebDriverWait(driver, timeout)
    pagination_wait = WebDriverWait(driver, pagination_timeout)
    article_urls: set[str] = set()
    try:
        driver.get(hub_url)
        wait.until(EC.presence_of_element_located((By.XPATH, "//button[normalize-space()='01']")))

        page_numbers = sorted(
            {
                int(text)
                for text in driver.execute_script(
                    """
                    return Array.from(document.querySelectorAll('button'))
                      .map((button) => button.textContent.trim())
                      .filter((text) => /^\\d+$/.test(text));
                    """
                )
            }
        )
        if not page_numbers:
            raise SystemExit("Could not discover pagination buttons on the hub page.")
        LOGGER.info("Discovered %d pagination pages: %s", len(page_numbers), page_numbers)

        for page_number in page_numbers:
            label = f"Go to page {page_number}"
            LOGGER.info("Collecting hub page %d", page_number)
            page_before = driver.execute_script(
                """
                const root = document.querySelector('section#view-all-posts');
                if (!root) {
                  return null;
                }
                return Array.from(root.querySelectorAll('a[href^="/blog/"]'))
                  .map((anchor) => anchor.getAttribute('href'))
                  .filter(Boolean)
                  .join('|');
                """
            )
            if page_number != 1:
                pagination_succeeded = False
                for attempt in range(1, 4):
                    LOGGER.info("Attempt %d to paginate to page %d", attempt, page_number)
                    button = wait.until(
                        EC.element_to_be_clickable(
                            (By.XPATH, f"//button[normalize-space()='{page_number:02d}']")
                        )
                    )
                    driver.execute_script(
                        """
                        const section = document.querySelector('section#view-all-posts');
                        if (section) {
                          section.scrollIntoView({block: 'start'});
                        }
                        arguments[0].scrollIntoView({block: 'center'});
                        """,
                        button,
                    )
                    time.sleep(0.5)
                    try:
                        button.click()
                    except Exception:
                        driver.execute_script("arguments[0].click();", button)

                    active_confirmed = False
                    try:
                        pagination_wait.until(
                            lambda drv: drv.execute_script(
                                """
                                const active = Array.from(document.querySelectorAll('button'))
                                  .find((button) => button.disabled
                                    && (button.getAttribute('aria-label') || '').startsWith('Go to page'));
                                return active ? active.getAttribute('aria-label') : null;
                                """
                            )
                            == label
                        )
                        active_confirmed = True
                    except TimeoutException:
                        LOGGER.warning(
                            "Timed out waiting for active-page label %s on attempt %d",
                            label,
                            attempt,
                        )

                    try:
                        pagination_wait.until(
                            lambda drv: drv.execute_script(
                                """
                                const root = document.querySelector('section#view-all-posts');
                                if (!root) {
                                  return null;
                                }
                                return Array.from(root.querySelectorAll('a[href^="/blog/"]'))
                                  .map((anchor) => anchor.getAttribute('href'))
                                  .filter(Boolean)
                                  .join('|');
                                """
                            )
                            != page_before
                        )
                        LOGGER.info(
                            "Pagination to page %d confirmed on attempt %d%s",
                            page_number,
                            attempt,
                            " after label update" if active_confirmed else "",
                        )
                        pagination_succeeded = True
                        break
                    except TimeoutException:
                        LOGGER.warning(
                            "Article list did not change for page %d on attempt %d",
                            page_number,
                            attempt,
                        )
                        time.sleep(2)

                if not pagination_succeeded:
                    raise SystemExit(
                        f"Pagination click for page {page_number} did not update the article list."
                    )
            else:
                time.sleep(1)

            hrefs = driver.execute_script(
                """
                const root = document.querySelector('section#view-all-posts');
                if (!root) {
                  return [];
                }
                return Array.from(root.querySelectorAll('a[href^="/blog/"]'))
                  .map((anchor) => anchor.getAttribute('href'))
                  .filter(Boolean);
                """
            )
            LOGGER.info("Found %d raw links on hub page %d", len(hrefs), page_number)
            for href in hrefs:
                path = article_path_from_url(href)
                if path:
                    article_urls.add(urllib.parse.urljoin(SITE_URL, path))
            LOGGER.info("Unique article URLs collected so far: %d", len(article_urls))
    finally:
        driver.quit()
        LOGGER.info("Browser session closed")

    return sorted(article_urls)


def parse_article(url: str, *, timeout: float) -> Article:
    LOGGER.info("Fetching article metadata: %s", url)
    html_text = fetch_html(url, timeout)
    next_data = extract_next_data(html_text)
    parser = MetaParser()
    parser.feed(html_text)

    hero_data = next_data["props"]["pageProps"]["data"]["heroData"]
    title = hero_data["title"].strip()
    summary = parser.meta.get("description", "").strip()
    author_data = hero_data.get("author") or {}
    author = author_data.get("fields", {}).get("fullName")

    published_at = parse_iso_datetime(hero_data.get("publishedAt") or hero_data.get("firstPublishedAt"))
    updated_at = parse_updated_datetime(hero_data)

    return Article(
        url=url,
        title=title,
        summary=summary,
        published_at=published_at,
        updated_at=max(updated_at, published_at),
        author=author,
    )


def xml_tag(name: str) -> str:
    return str(ET.QName(ATOM_NS, name))


def append_text(parent: ET.Element, name: str, text: str, **attrib: str) -> ET.Element:
    element = ET.SubElement(parent, xml_tag(name), attrib=attrib)
    element.text = text
    return element


def build_atom(articles: Iterable[Article], feed_url: str, hub_url: str) -> str:
    items = sorted(articles, key=lambda item: item.published_at, reverse=True)
    if not items:
        raise SystemExit("No articles found.")

    ET.register_namespace("", ATOM_NS)
    feed = ET.Element(xml_tag("feed"))
    append_text(feed, "id", hub_url)
    append_text(feed, "title", "Rippling Engineering Blog")
    append_text(feed, "updated", items[0].updated_at.isoformat().replace("+00:00", "Z"))
    ET.SubElement(feed, xml_tag("link"), {"rel": "self", "href": feed_url})
    ET.SubElement(feed, xml_tag("link"), {"href": hub_url})
    author = ET.SubElement(feed, xml_tag("author"))
    append_text(author, "name", "Rippling")

    for item in items:
        entry = ET.SubElement(feed, xml_tag("entry"))
        append_text(entry, "id", item.url)
        append_text(entry, "title", item.title)
        ET.SubElement(entry, xml_tag("link"), {"href": item.url})
        append_text(entry, "published", item.published_at.isoformat().replace("+00:00", "Z"))
        append_text(entry, "updated", item.updated_at.isoformat().replace("+00:00", "Z"))
        if item.author:
            author_el = ET.SubElement(entry, xml_tag("author"))
            append_text(author_el, "name", item.author)
        if item.summary:
            summary_el = ET.SubElement(entry, xml_tag("summary"), {"type": "html"})
            summary_el.text = html.escape(item.summary)

    tree = ET.ElementTree(feed)
    ET.indent(tree, space="  ")
    return ET.tostring(feed, encoding="unicode", xml_declaration=True)


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--hub-url", default=HUB_URL, help="Rippling hub URL to crawl.")
    parser.add_argument(
        "--feed-url",
        default="https://example.invalid/rippling-engineering.atom.xml",
        help="Public URL where the generated Atom file will live.",
    )
    parser.add_argument(
        "--output",
        default=DEFAULT_OUTPUT,
        help=f"Path to the generated Atom file. Default: {DEFAULT_OUTPUT}",
    )
    parser.add_argument(
        "--browser",
        default="chrome",
        choices=["chrome", "safari"],
        help="Browser WebDriver to use for paginating the hub. Default: chrome",
    )
    parser.add_argument(
        "--driver-path",
        help="Optional path to the browser driver binary.",
    )
    parser.add_argument(
        "--headful",
        action="store_true",
        help="Show the browser window instead of running headless.",
    )
    parser.add_argument(
        "--timeout",
        type=float,
        default=DEFAULT_TIMEOUT,
        help=f"Network and browser wait timeout in seconds. Default: {DEFAULT_TIMEOUT}",
    )
    parser.add_argument(
        "--pagination-timeout",
        type=float,
        default=DEFAULT_PAGINATION_TIMEOUT,
        help=f"Pagination wait timeout in seconds. Default: {DEFAULT_PAGINATION_TIMEOUT}",
    )
    parser.add_argument(
        "--window-width",
        type=int,
        default=DEFAULT_WINDOW_WIDTH,
        help=f"Browser window width. Default: {DEFAULT_WINDOW_WIDTH}",
    )
    parser.add_argument(
        "--window-height",
        type=int,
        default=DEFAULT_WINDOW_HEIGHT,
        help=f"Browser window height. Default: {DEFAULT_WINDOW_HEIGHT}",
    )
    return parser.parse_args(argv)


def main(argv: list[str]) -> int:
    args = parse_args(argv)
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
    )
    article_urls = collect_article_urls_with_selenium(
        args.hub_url,
        browser_name=args.browser,
        driver_path=args.driver_path,
        headful=args.headful,
        timeout=args.timeout,
        pagination_timeout=args.pagination_timeout,
        window_width=args.window_width,
        window_height=args.window_height,
    )
    LOGGER.info("Total article URLs discovered: %d", len(article_urls))
    articles: list[Article] = []
    failures: list[tuple[str, str]] = []
    for idx, url in enumerate(article_urls, start=1):
        try:
            LOGGER.info("Parsing article %d/%d", idx, len(article_urls))
            articles.append(parse_article(url, timeout=args.timeout))
        except (KeyError, ValueError, urllib.error.URLError) as exc:
            failures.append((url, str(exc)))
            LOGGER.warning("Skipping article due to parse/fetch error: %s (%s)", url, exc)

    feed_xml = build_atom(articles, args.feed_url, args.hub_url)
    with open(args.output, "w", encoding="utf-8") as fobj:
        fobj.write(feed_xml)
        fobj.write("\n")

    LOGGER.info("Finished writing feed to %s with %d entries", args.output, len(articles))
    print(f"Wrote {len(articles)} entries to {args.output}")
    if failures:
        print(f"Skipped {len(failures)} articles:", file=sys.stderr)
        for url, error in failures:
            print(f"  - {url}: {error}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
