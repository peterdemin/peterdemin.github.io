# Development environment setup script

## Background

Over the years I found that the best teams scale their development environment setup through a shell script.
Interestingly, the script is always at the same path: `tools/setup.sh`.
As you can imagine, we're targeting operating systems that support bash.
In fact, these days I see that companies converge on MacOS for all employees for security and uniformity.

We won't need no Virtual Machines or Docker. Just bare-metal laptop and shell script (mostly).

## Boilerplate

```bash
#!/usr/bin/env bash

set -e -o pipefail

PYTHON_VERSION="3.12"
PYTHON="python${PYTHON_VERSION}"
VENV_DIR=~/.virtualenvs/P

brew install "python@${PYTHON_VERSION}"

# Ensure virtualenv is created and active
if [ -z "$VIRTUAL_ENV" ]; then
    mkdir -p ~/.virtualenvs/
    if [ ! -f "${VENV_DIR}/bin/activate" ]; then
        $PYTHON -m venv ${VENV_DIR}
    fi
    . ${VENV_DIR}/bin/activate
fi

$PYTHON -m pip install -r requirements/prereq.txt
$PYTHON -m piptools sync requirements/dev.txt

pre-commit install
pre-commit autoupdate
```

Few highlights:

1. We put Python version into a constant, because it's bound to change.
2. If it was Ubuntu, we'd replace `brew` with `apt`, though.
   So, no big deal, maybe companies will migrate to Linux some day.
3. Having Python virtual environment outside of repo is good for grep and such.
4. Having it under `~/.virtualenvs/` specifically is compatible with my beloved [virtualenvwrapper](https://virtualenvwrapper.readthedocs.io/en/latest/index.html).
   I don't want to enforce virtualenvwrapper on all team members, though.
   The way I use it with is to run `mkvirtualenv -a $PWD -p (which python3.12) P && tools/setup.sh`.
5. Virtualenv's name is a single letter, preferrably the first letter of the project's name.
   This way, I can navigate to the project by running `workon P`.
5. The nested logic allows running the script with and without virtualenv A) created and B) activated.
6. Requirements installation is split into two phases:
    1. Install the blessed pip version and pip-tools.
    2. Run pip-sync to ensure the environment is healthy no repeated runs.
7. Force installation of pre-commit hooks, so ground rules can be enforced reliably.
