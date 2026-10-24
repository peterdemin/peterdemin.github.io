from pathlib import Path
import argparse


def bundle():
    directory = Path(__file__).resolve().parents[1] / 'source/_static/rotating-boxes'
    physics = '\n'.join(line.removeprefix('export ') for line in (directory / 'physics.mjs').read_text().splitlines())
    main = '\n'.join(line for line in (directory / 'main.mjs').read_text().splitlines() if not line.startswith('import '))
    content = "(() => {\n'use strict';\ntry {\n" + physics + '\n' + main + "\n} catch (failure) {\n  const error = document.querySelector('#error');\n  error.textContent = 'The box experiment could not start: ' + failure.message;\n  error.style.display = 'flex';\n  console.error(failure);\n}\n})();\n"
    return directory / 'bundle.js', content


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    arguments = parser.parse_args()
    destination, content = bundle()
    if arguments.check:
        if not destination.exists() or destination.read_text() != content:
            parser.error('bundle.js is stale; run python3 scripts/build_rotating_boxes.py')
        print('PASS rotating-boxes bundle matches its solver wrapper and renderer')
    else:
        destination.write_text(content)
