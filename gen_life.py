import glob
import os

from gen_atom import iter_feed_items


ORPHAN = '---\norphan: true\n---\n'
SEP = '\n-----\n'


def gen_life():
    files = glob.glob(os.path.join("source", "16_life", "*.md"))
    for idx, filename in enumerate(sorted(files, reverse=True)):
        if idx:
            yield SEP
        yield ".. include:: {}".format(os.path.relpath(filename, "source"))
        yield "   :parser: myst_parser.sphinx_"


def write_life():
    with open("source/life_gd.rst", "wt", encoding="utf-8") as fobj:
        for line in gen_life():
            fobj.write(f"{line}\n")


def write_posts() -> None:
    for it in iter_feed_items():
        it.source_path.parent.mkdir(parents=True, exist_ok=True)
        it.source_path.write_text(
            f'{ORPHAN}\n# {it.record.short_date}\n\n{it.record.text}',
            encoding='utf-8',
        )
        print(it.source_path)


def main() -> None:
    write_life()
    write_posts()


if __name__ == "__main__":
    main()
