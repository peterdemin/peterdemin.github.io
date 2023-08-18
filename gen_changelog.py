"""Fetch git logs and ensure all reading notes are mentioned in life."""
# pylint: disable=consider-using-f-string:

import datetime
import os
from dataclasses import dataclass
import re
import glob
import subprocess
from typing import Dict, List, Optional

SOURCE_DIR = "source"
LIFE_DIR = os.path.join(SOURCE_DIR, "16_life")
NOTES_DIR = os.path.join(SOURCE_DIR, "17_notes")
NOTES_PTRN = os.path.join(NOTES_DIR, "*.*")
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
    NOTES_PTRN,
)


@dataclass
class LifeRecord:
    """Information for matching and formatting life record."""
    file_path: str
    date: datetime.datetime
    note_paths: List[str]

    @property
    def text(self) -> str:
        """Serialize life record as a string."""
        links = [
            f'[](/{note_path})'
            for note_path in self.note_paths
        ]
        formatted_date = self.date.strftime(LIFE_DATE_FMT)
        return f"`{formatted_date}` - Notes for {', '.join(links)}"


@dataclass
class AnnotatedLifeLine:
    """Information about a single line of life file."""
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
            if os.path.dirname(note_path) == NOTES_DIR:
                by_date.setdefault(day, []).append(note_path)
    return by_date


def generate_life_records(notes_by_date: Dict[datetime.datetime, List[str]]) -> List[LifeRecord]:
    """Compose life records linking to notes created by date."""
    for day in sorted(notes_by_date, reverse=True):
        paths = sorted(
            os.path.relpath(path, SOURCE_DIR)
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
                date=day,
                note_paths=paths,
            )


def find_life_file(date: datetime.datetime) -> str:
    """Find a 16_life/??_<date>.md file that matches the passed date."""
    suffix = date.strftime("%Y-%m.md")
    matching_files = glob.glob(os.path.join(LIFE_DIR, f"??-{suffix}"))
    if matching_files:
        return matching_files[0]
    return ''


def parse_life_file(file_path: str) -> List[AnnotatedLifeLine]:
    """Parses life file at a given path and returns a list of annotated lines."""
    annotated_lines = []
    with open(file_path, 'rt', encoding='utf-8') as fobj:
        for idx, line in enumerate(fobj):
            text = line.rstrip()
            annotated_lines.append(
                AnnotatedLifeLine(
                    lineno=idx,
                    text=text,
                    date=maybe_parse_date(line),
                )
            )
    return annotated_lines


def maybe_parse_date(text: str) -> Optional[datetime.datetime]:
    """Tries to parse date from the life record text."""
    if mobj := RE_LIFE_DATE.match(text):
        return datetime.datetime.strptime(mobj.group(1), LIFE_DATE_FMT)
    return None


def insert_life_record(annotated_lines: List[AnnotatedLifeLine], new_record: LifeRecord) -> None:
    for idx, line in enumerate(annotated_lines):
        if line.date and line.date <= new_record.date:
            pos = idx
            break
    else:
        pos = len(annotated_lines) - 1
    annotated_lines.insert(
        pos,
        AnnotatedLifeLine(
            lineno=0,
            text=f'{new_record.text}\n',
            date=new_record.date
        )
    )


def write_annotated_lines(annotated_lines: List[AnnotatedLifeLine], file_path: str) -> None:
    with open(file_path, 'wt', encoding='utf-8') as fobj:
        fobj.writelines(
            f'{line.text}\n'
            for line in annotated_lines
        )


def main():
    """Updates 16_life files with links to 17_notes files."""
    by_life_file = {}
    for life_record in generate_life_records(parse_git_log()):
        if not life_record.note_paths:
            continue
        by_life_file.setdefault(life_record.file_path, []).append(life_record)
    for file_path, life_records in by_life_file.items():
        annotated_lines = parse_life_file(file_path)
        for life_record in life_records:
            insert_life_record(annotated_lines, life_record)
        write_annotated_lines(annotated_lines, file_path)


if __name__ == '__main__':
    main()
