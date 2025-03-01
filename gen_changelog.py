"""Fetch git logs and ensure all reading notes are mentioned in life."""

# pylint: disable=consider-using-f-string:

import datetime
import glob
import os
import re
import subprocess
from dataclasses import dataclass
from typing import Dict, Iterable, List, Optional

SOURCE_DIR = "source"
LIFE_DIR = os.path.join(SOURCE_DIR, "16_life")
NOTES_DIR = os.path.join(SOURCE_DIR, "17_notes")
ARTICLES_DIR = os.path.join(SOURCE_DIR, "12_articles")
RE_DATE = re.compile(r"^(\d{4}-\d{2}-\d{2}) .*$")
RE_ADD = re.compile(r"^A\t(.+)$")
RE_LIFE_DATE = re.compile(r"^`([A-Z][a-z]{2} \d{2}, \d{4})`")
LIFE_DATE_FMT = "%b %d, %Y"
GIT_LOG_COMMAND = [
    "git",
    "log",
    "--name-status",
    "--pretty=%ad",
    "--date=iso",
    "--",
]
LOOKBACK_LIMIT = 20
ALLOWED_EXTS = {".md", ".rst"}


@dataclass
class LifeRecord:
    """Information for matching and formatting life record."""

    life_path: str
    date: datetime.datetime
    file_paths: List[str]

    @property
    def text(self) -> str:
        """Serialize life record as a string."""
        links = [f"[](/{f})" for f in self.file_paths]
        formatted_date = self.date.strftime(LIFE_DATE_FMT)
        return f"`{formatted_date}` - Added {', '.join(links)}"


@dataclass
class AnnotatedLifeLine:
    """Information about a single line of life file."""

    text: str
    date: Optional[datetime.datetime]
    lineno: int = 0


def parse_git_log(*dirs: str) -> Dict[datetime.datetime, List[str]]:
    """Execute git log command and parse output related to files in selected dirs."""
    by_date: Dict[datetime.datetime, List[str]] = {}
    day = datetime.datetime.today()
    cmd = GIT_LOG_COMMAND + [os.path.join(d, "*.*") for d in dirs]
    history = subprocess.check_output(cmd, encoding="utf-8")
    for line in history.splitlines():
        if mobj := RE_DATE.match(line):
            day = datetime.datetime.strptime(mobj.group(1), "%Y-%m-%d")
        elif mobj := RE_ADD.match(line):
            file_path = mobj.group(1)
            if os.path.dirname(file_path) in (NOTES_DIR, ARTICLES_DIR):
                by_date.setdefault(day, []).append(file_path)
                if len(by_date) > LOOKBACK_LIMIT:
                    break
    return by_date


def generate_life_records(
    files_by_date: Dict[datetime.datetime, List[str]]
) -> Iterable[LifeRecord]:
    """Compose life records linking to notes created by date."""
    life_lines = []
    for file_name in iter_life_files():
        with open(file_name, "rt", encoding="utf-8") as fobj:
            life_lines.extend(fobj)
    all_life_content = "\n".join(life_lines)
    for day in sorted(files_by_date, reverse=True):
        file_paths = sorted(
            os.path.relpath(path, SOURCE_DIR)
            for path in files_by_date[day]
            if os.path.exists(path)
            and os.path.splitext(path)[1].lower() in ALLOWED_EXTS
        )
        life_path = find_life_file(day)
        for path in file_paths:
            if path in all_life_content:
                # At least one record from that day is already present, skip whole day.
                break
        else:
            yield LifeRecord(
                life_path=life_path,
                date=day,
                file_paths=file_paths,
            )


def iter_life_files() -> list[str]:
    """Find all 16_life/NN-YYYY-MM.md files."""
    return glob.glob(os.path.join(LIFE_DIR, "??-????-??.md"))


def find_life_file(date: datetime.datetime) -> str:
    """Find a 16_life/??_<date>.md file that matches the passed date."""
    suffix = date.strftime("%Y-%m.md")
    matching_files = glob.glob(os.path.join(LIFE_DIR, f"??-{suffix}"))
    if matching_files:
        return matching_files[0]
    return ""


def parse_life_file(file_path: str) -> List[AnnotatedLifeLine]:
    """Parses life file at a given path and returns a list of annotated lines."""
    annotated_lines = []
    with open(file_path, "rt", encoding="utf-8") as fobj:
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


def insert_life_record(
    annotated_lines: List[AnnotatedLifeLine], new_record: LifeRecord
) -> None:
    """Inserts life record into annotated lines list at the appropriate position."""
    inserted_text = new_record.text
    for idx, line in enumerate(annotated_lines):
        if line.date and line.date <= new_record.date:
            pos = idx
            inserted_text += "\n"
            break
    else:
        pos = len(annotated_lines)
        if pos > 0:
            inserted_text = "\n" + inserted_text
    annotated_lines.insert(
        pos,
        AnnotatedLifeLine(text=inserted_text, date=new_record.date),
    )


def write_annotated_lines(
    annotated_lines: List[AnnotatedLifeLine], file_path: str
) -> None:
    """Writes lines to a file."""
    with open(file_path, "wt", encoding="utf-8") as fobj:
        fobj.writelines(f"{line.text}\n" for line in annotated_lines)


def main():
    """Updates 16_life files with links to 12_articles and 17_notes files."""
    by_life_file = {}
    for life_record in generate_life_records(parse_git_log(ARTICLES_DIR, NOTES_DIR)):
        if life_record.file_paths:
            by_life_file.setdefault(life_record.life_path, []).append(life_record)
    for life_path, life_records in by_life_file.items():
        annotated_lines = parse_life_file(life_path)
        for life_record in life_records:
            insert_life_record(annotated_lines, life_record)
        write_annotated_lines(annotated_lines, life_path)


if __name__ == "__main__":
    main()
