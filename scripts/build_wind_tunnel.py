from pathlib import Path
import argparse


def bundle():
    directory = Path(__file__).resolve().parents[1] / 'source/_static/wind-tunnel'
    flow = (directory / 'flow.mjs').read_text()
    wing = (directory / 'wing.mjs').read_text()
    loads = (directory / 'loads.mjs').read_text()
    main = (directory / 'main.mjs').read_text()
    flow = '\n'.join(line.removeprefix('export ') for line in flow.splitlines())
    wing = wing.removeprefix("import {CHORD, thickness} from './flow.mjs';\n")
    wing = '\n'.join(line.removeprefix('export ') for line in wing.splitlines())
    loads = '\n'.join(line.removeprefix('export ') for line in loads.splitlines())
    main = main.removeprefix("import {WindTunnel, advanceTracer, tracerSegmentBlocked} from './flow.mjs';\n")
    main = main.removeprefix("import {buildWingMesh} from './wing.mjs';\n")
    main = main.removeprefix("import {pressureLoads, pressureColor, pressureField} from './loads.mjs';\n")
    content = "(() => {\n'use strict';\ntry {\n" + flow + '\n' + wing + '\n' + loads + '\n' + main + "\n} catch (failure) {\n  const error = document.querySelector('#error');\n  error.textContent = 'The experiment could not start: ' + failure.message;\n  error.style.display = 'flex';\n  console.error(failure);\n}\n})();\n"
    return directory / 'bundle.js', content


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    arguments = parser.parse_args()
    destination, content = bundle()
    if arguments.check:
        if not destination.exists() or destination.read_text() != content:
            parser.error('bundle.js is stale; run python3 scripts/build_wind_tunnel.py')
        print('PASS wind-tunnel bundle matches the shared solver and renderer')
    else:
        destination.write_text(content)
