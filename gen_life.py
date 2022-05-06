import os
import glob


def gen_life():
    for filename in sorted(glob.glob(os.path.join('source', 'life', '*.md'))):
        relname = os.path.relpath(filename, 'source')
        print('.. include:: {}'.format(relname))
        print('   :parser: myst_parser.sphinx_')
        print()


if __name__ == '__main__':
    gen_life()
