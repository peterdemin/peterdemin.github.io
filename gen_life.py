import os
import glob


def gen_life():
    for idx, filename in enumerate(sorted(glob.glob(os.path.join('source', 'life', '*.md')), reverse=True)):
        relname = os.path.relpath(filename, 'source')
        if idx:
            print()
            print('-----')
            print()
        print('.. include:: {}'.format(relname))
        print('   :parser: myst_parser.sphinx_')


if __name__ == '__main__':
    gen_life()
