import os
import glob


def gen_life():
    for idx, filename in enumerate(sorted(glob.glob(os.path.join('source', '16_life', '*.md')), reverse=True)):
        if idx:
            print()
            print('-----')
            print()
        print('.. include:: {}'.format(os.path.relpath(filename, 'source')))
        print('   :parser: myst_parser.sphinx_')


if __name__ == '__main__':
    gen_life()
