"""Usage: git log --name-status -100 | python gen_history.py"""

import re
import sys
from datetime import datetime
from typing import Iterable, Tuple, List


RE_STARTERS = {
    key: re.compile('^(' + key + r')\s+(.+)')
    for key in ('A', 'M', 'D', 'Date:')
}
RE_JOHNNY = re.compile(r'.*/(\d\d).*/(\d\d).*')


class GitLogParser:
    GIT_DATE_FORMAT = '%a %b %d %H:%M:%S %Y %z'
    WATCH_DIR = 'source'

    def __call__(self, output):
        by_date = {}
        cur_date = ''
        for key, value in self._iter_POIs(output):
            if key == 'Date:':
                parsed_date = datetime.strptime(value, self.GIT_DATE_FORMAT)
                # cur_date = parsed_date.strftime('%Y.%m.%d')
                cur_date = parsed_date.strftime('%b %d, %Y')
                by_date[cur_date] = {}
            else:
                if not value.startswith(self.WATCH_DIR):
                    continue
                if jobj := RE_JOHNNY.match(value):
                    value = '[{}.{}] - {}'.format(
                        jobj.group(1), jobj.group(2), jobj.group(0)
                    )
                by_date[cur_date].setdefault(key, []).append(value)
        return by_date

    def _iter_POIs(self, output) -> Iterable[Tuple[str, str]]:
        lines = output.split('\n')
        for line in lines:
            line = line.rstrip()
            # print(line)
            for key, regex in RE_STARTERS.items():
                if matchobj := regex.match(line):
                    yield (key, matchobj.group(2))
                    break


def main():
    git_log = sys.stdin.read()
    parser = GitLogParser()
    history = parser(git_log)

    for date, git_changes in history.items():
        if not git_changes:
            continue
        print(date)
        _print_section("Added", git_changes.get('A', []))
        _print_section("Modified", git_changes.get('M', []))
        _print_section("Deleted", git_changes.get('D', []))
        print()


def _print_section(title: str, items: List[str]) -> None:
    if not items:
        return
    print(f"  {title}:")
    for item in items:
        print(f'  * {item}')


if __name__ == "__main__":
    main()
