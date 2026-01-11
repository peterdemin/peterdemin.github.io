#!/usr/bin/env python3

import sys
import xml.etree.ElementTree as ET


def iter_outlines_with_xmlurl(root: ET.Element):
    for el in root.iter("outline"):
        xml_url = (el.attrib.get("xmlUrl") or "").strip()
        if not xml_url:
            continue
        title = (el.attrib.get("title") or el.attrib.get("text") or "").strip()
        if not title:
            title = xml_url
        yield title, xml_url


def opml_to_markdown(fin) -> str:
    return "".join(
        f"- [{title}]({url})\n"
        for title, url in sorted(
            iter_outlines_with_xmlurl(ET.parse(fin).getroot()),
            key=lambda t: t[0].casefold(),
        )
    )


def main() -> None:
    print(opml_to_markdown(sys.stdin))


if __name__ == "__main__":
    main()
