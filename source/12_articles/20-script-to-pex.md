# Make a PEX from Python script

Python is a great language for scripting.
But there is a problem with distributing working executable.
If script uses any non built-in dependency, it can't be just copied to
the target host and executed.

One possible solution is using [PEX - Python EXecutable](https://github.com/pantsbuild/pex).
It packs the script with dependencies inside a single binary.

Install it with:

```
pip install pex
```

## Example for copy-paste

This example will show how to pack script named `tool`, that has 1 dependency: `click`.

Script lives in `tool.py`:

```
import click


@click.command()
def main():
    """Example script."""
    click.echo('Hello World!')


if __name__ == '__main__':
    main()
```

First, PEX works with Python distributions.
It means that there has to be `setup.py`.
Good news, it's relatively simple:

```python
from setuptools import setup


setup(
    name='tool',
    version='0.0.1',
    py_modules=['tool'],
    install_requires=['click'],
    entry_points={
        'console_scripts': [
            'tool=tool:main',
        ]
    },
)
```

Let's also have a Makefile so that build commands won't be forgotten:

```Makefile
build: clean
    pex -o tool.pex . -e tool:main --validate-entry-point

deploy: build
    cp tool.pex /target/destination.pex

.PHONY: clean
clean:
    rm -rf *.egg-info build dist $${PEX_ROOT}/build/tool-*.whl
```

Notice `clean` command, that deletes PEX build cache, it's extremely important,
because PEX cache built wheels and skip updating if the version is the same.

Build pex binary with command

```
make
```

Now working directory looks like this:

```
-rw-rw-r--   1 deminp deminp  202 Oct 29 20:18 Makefile
-rw-rw-r--   1 deminp deminp  230 Oct 29 20:14 setup.py
-rwxrwxr-x   1 deminp deminp 558K Oct 29 20:18 tool.pex
-rw-rw-r--   1 deminp deminp  141 Oct 29 20:17 tool.py
```

Tools can be launched in 3 ways:

In virtual environment with click installed:
```
$ python tool.py
Hello World!
```

In virtual environment with distribution installed (i.e. `pip install .`)
```
$ tool
Hello World!
```

Without virtual environment using built PEX binary:
```
$ ./tool.pex
Hello World!
```
