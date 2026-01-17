#!/usr/bin/env python3

import datetime
import json
import sys
from dataclasses import dataclass
from typing import Iterable, TextIO


@dataclass(frozen=True)
class Star:
    full_name: str
    html_url: str
    private: bool
    description: str
    login: str
    starred_at: datetime.datetime


def iter_stars(fin: TextIO) -> Iterable[Star]:
    for star in json.load(fin):
        yield Star(
            full_name=star["repo"]["full_name"],
            html_url=star["repo"]["html_url"],
            private=star["repo"]["private"],
            description=(star["repo"]["description"] or "").strip(),
            login=star["repo"]["owner"]["login"],
            starred_at=datetime.datetime.fromisoformat(star["starred_at"]),
        )


def format_star(star: Star) -> str:
    description = f' - {star.description}' if star.description else ''
    return (
        f"`{star.starred_at.strftime('%b %d, %Y')}` - "
        f"[{star.full_name}]({star.html_url}){description}\n"
    )


def main():
    for star in iter_stars(sys.stdin):
        if star.private:
            continue
        print(format_star(star))


if __name__ == "__main__":
    main()
