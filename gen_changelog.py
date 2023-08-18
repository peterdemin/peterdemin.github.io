"""Fetch git logs and ensure all reading notes are mentioned in life."""
# pylint: disable=consider-using-f-string:

import datetime
import os
from dataclasses import dataclass
import re
import glob
import subprocess
from typing import Dict, List, Optional

LIFE_DIR = os.path.join("source", "16_life")
RE_DATE = re.compile(r'^(\d{4}-\d{2}-\d{2}) .*$')
RE_ADD = re.compile(r'^A\t(.+)$')
RE_LIFE_DATE = re.compile(r'^`([A-Z][a-z]{2} \d{2}, \d{4})`')
LIFE_DATE_FMT = '%b %d, %Y'
GIT_LOG_COMMAND = (
    'git',
    'log',
    "--name-status",
    "--pretty=%ad",
    "--date=iso",
    "--",
    "source/17_notes/",
)


@dataclass
class LifeRecord:
    """Information for matching and formatting life record."""
    file_path: str
    formatted_date: str
    note_paths: List[str]


@dataclass
class AnnotatedLifeLine:
    lineno: int
    text: str
    date: Optional[datetime.datetime] = None


def parse_git_log() -> Dict[datetime.datetime, List[str]]:
    """Execute git log command and parse output related to notes."""
    by_date = {}
    day = datetime.datetime.today()
    history = subprocess.check_output(GIT_LOG_COMMAND, encoding='utf-8')
    for line in history.splitlines():
        if mobj := RE_DATE.match(line):
            day = datetime.datetime.strptime(mobj.group(1), '%Y-%m-%d')
        elif mobj := RE_ADD.match(line):
            note_path = mobj.group(1)
            by_date.setdefault(day, []).append(note_path)
    return by_date


def generate_life_records(notes_by_date: Dict[datetime.datetime, List[str]]) -> List[str]:
    """Compose life records linking to notes created by date."""
    for day in sorted(notes_by_date, reverse=True):
        paths = sorted(
            # f'[](/{})'
            os.path.relpath(path, "source")
            for path in notes_by_date[day]
            if os.path.exists(path)
        )
        file_path = find_life_file(day)
        with open(file_path, 'rt', encoding='utf-8') as fobj:
            content = fobj.read()
        missing_paths = [
            path
            for path in paths
            if path not in content
        ]
        if missing_paths == paths:
            yield LifeRecord(
                file_path=file_path,
                formatted_date=day.strftime(LIFE_DATE_FMT),
                note_paths=paths,
                # "`{}` - Notes for {}"
                # .format(
                #     ,
                #     ', '.join(links),
                # )
            )
        yield LifeRecord(file_path='', formatted_date='', note_paths=[])


def find_life_file(date: datetime.datetime) -> str:
    """Find a 16_life/??_<date>.md file that matches the passed date."""
    suffix = date.strftime("%Y-%m.md")
    matching_files = glob.glob(os.path.join(LIFE_DIR, f"??-{suffix}"))
    if matching_files:
        return matching_files[0]
    return ''


def parse_life_file(file_path: str) -> List[AnnotatedLifeLine]:
    """Parses life file at a given path and returns a list of annotated lines."""
    with open(file_path, 'rt', encoding='utf-8') as fobj:
        for idx, line in enumerate(fobj):
            yield AnnotatedLifeLine(
                lineno=idx,
                text=line,
                date=maybe_parse_date(line),
            )


def maybe_parse_date(text: str) -> Optional[datetime.datetime]:
    """Tries to parse date from the life record text."""
    if mobj := RE_LIFE_DATE.match(text):
        return datetime.datetime.strptime(mobj.group(1), LIFE_DATE_FMT)
    return None


def main():
    """Updates 16_life files with links to 17_notes files."""
    for life_record in generate_life_records(parse_git_log()):
        if not life_record.note_paths:
            continue
        print(life_record)
        print()


if __name__ == '__main__':
    main()
