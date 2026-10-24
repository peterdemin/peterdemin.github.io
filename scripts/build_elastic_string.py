"""Bundle the string's shared solver and renderer without browser imports."""

import argparse
import hashlib
import re
from pathlib import Path


def bundle():
    directory = Path(__file__).resolve().parents[1] / 'source/_static/elastic-string'
    physics = (directory / 'physics.mjs').read_text()
    physics = '\n'.join(line.removeprefix('export ') for line in physics.splitlines())
    main = (directory / 'main.mjs').read_text()
    main = '\n'.join(line for line in main.splitlines() if not line.startswith('import '))
    content = "(() => {\n'use strict';\ntry {\n" + physics + '\n' + main + "\n} catch (failure) {\n  const error = document.querySelector('#error');\n  error.textContent = 'The string could not start: ' + failure.message;\n  error.style.display = 'flex';\n  console.error(failure);\n}\n})();\n"
    return directory / 'bundle.js', content


def artifacts():
    destination, content = bundle()
    digest = hashlib.sha256(content.encode()).hexdigest()[:16]
    versioned = destination.with_name(f'bundle.{digest}.js')
    index = destination.with_name('index.html')
    html, count = re.subn(
        r'<script src="bundle(?:\.[0-9a-f]{16})?\.js"></script>',
        f'<script src="{versioned.name}"></script>', index.read_text(),
    )
    if count != 1:
        raise ValueError('Expected exactly one script bundle in the demo HTML')
    # Version the iframe as well: otherwise its cached HTML can still request
    # an old script, even when the outer article has been refreshed.
    page_version = hashlib.sha256(html.encode()).hexdigest()[:16]
    article = destination.parents[2] / '12_articles/87-sail-physics/02a-elastic-string.rst'
    rst, count = re.subn(
        r'elastic-string/index\.html\?embedded=1(?:&v=[0-9a-f]{16})?',
        f'elastic-string/index.html?embedded=1&v={page_version}', article.read_text(),
    )
    if count != 1:
        raise ValueError('Expected exactly one embedded string demo in the article')
    rst, count = re.subn(
        r'<../../_static/elastic-string/index\.html(?:\?v=[0-9a-f]{16})?>',
        f'<../../_static/elastic-string/index.html?v={page_version}>', rst,
    )
    if count != 1:
        raise ValueError('Expected exactly one standalone string demo link')
    return {destination: content, versioned: content, index: html, article: rst}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    arguments = parser.parse_args()
    outputs = artifacts()
    if arguments.check:
        for destination, content in outputs.items():
            if not destination.exists() or destination.read_text() != content:
                parser.error(f'{destination.name} is stale; run python3 scripts/build_elastic_string.py')
        print('PASS elastic-string bundle, versioned script and article URLs match')
    else:
        for destination, content in outputs.items():
            if not destination.exists() or destination.read_text() != content:
                destination.write_text(content)
        # Only remove old generated content hashes; retain the stable bundle
        # for direct inspection and compatibility with existing checks.
        directory = next(iter(outputs)).parent
        keep = {path.name for path in outputs}
        for previous in directory.glob('bundle.*.js'):
            if re.fullmatch(r'bundle\.[0-9a-f]{16}\.js', previous.name) and previous.name not in keep:
                previous.unlink()
