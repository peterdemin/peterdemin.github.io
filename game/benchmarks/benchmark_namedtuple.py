"""Compare Node representations using the current physics, without source edits.

Run: python -m game.benchmarks.benchmark_namedtuple
"""

import ast
from collections import namedtuple
from pathlib import Path
import sys
import types

from game import string
from .benchmark_node import coordinates, shared_tick
from .benchmark_string import measure, sample


def control_module(layout, cached):
    tree = ast.parse(Path(string.__file__).read_text())
    node = next(
        n for n in tree.body if isinstance(n, ast.ClassDef) and n.name == "Node"
    )
    if layout.startswith("namedtuple"):
        node.decorator_list = []
        node.bases = [
            ast.parse(
                'namedtuple("_NodeFields", "x y vx vy", defaults=(0, 0, 0, 0))',
                mode="eval",
            ).body
        ]
        node.body = [n for n in node.body if not isinstance(n, ast.AnnAssign)]
        if layout == "namedtuple-slots":
            node.body.insert(0, ast.parse("__slots__ = ()").body[0])
    elif layout == "dataclass-slots":
        node.decorator_list = [ast.parse("dataclass(slots=True)", mode="eval").body]
    else:
        node.decorator_list = [ast.Name(id="dataclass", ctx=ast.Load())]
    if not cached:
        for method in node.body:
            if isinstance(method, ast.FunctionDef):
                method.decorator_list = [
                    (
                        ast.Name(id="property", ctx=ast.Load())
                        if isinstance(d, ast.Name) and d.id == "cached_property"
                        else d
                    )
                    for d in method.decorator_list
                ]
    ast.fix_missing_locations(tree)
    module = types.ModuleType(f"game._node_layout_{layout}_{cached}")
    module.__package__ = "game"
    module.__dict__["namedtuple"] = namedtuple
    sys.modules[module.__name__] = module
    try:
        exec(compile(tree, str(string.__file__), "exec"), module.__dict__)
    except BaseException:
        sys.modules.pop(module.__name__, None)
        raise
    return module


def main():
    cases = (
        ("dataclass, cached (current)", "dataclass", True, False),
        ("dataclass, uncached", "dataclass", False, False),
        ("slotted dataclass, uncached", "dataclass-slots", False, False),
        ("namedtuple, slots, uncached", "namedtuple-slots", False, False),
        ("namedtuple, dict + cached properties", "namedtuple-dict", True, False),
        ("namedtuple, slots, sharing nodes", "namedtuple-slots", False, True),
    )
    modules = []
    try:
        for label, layout, cached, share in cases:
            module = control_module(layout, cached)
            modules.append((label, module, share))
        for count in (24, 134):
            initial = sample(count)
            print(
                f"\n{count} nodes; 1-ms next_tick, median microseconds/call:",
                flush=True,
            )
            for label, module, share in modules:
                state = module.String(
                    [module.Node(*values) for values in coordinates(initial)],
                    max_step=initial.max_step,
                )
                tick = shared_tick if share else module.String.next_tick
                reference, candidate = initial, state
                for h in (0.0, 0.001, 0.016, 0.05) * 5:
                    previous = candidate
                    reference = reference.next_tick(h)
                    candidate = tick(candidate, h)
                    assert coordinates(candidate) == coordinates(reference), label
                    assert candidate.nodes is not previous.nodes
                us = measure(lambda: tick(state, 0.001), 0.08, 5)
                print(f"{label}: {us:.1f}", flush=True)
    finally:
        for _, module, _ in modules:
            sys.modules.pop(module.__name__, None)


if __name__ == "__main__":
    main()
