"""Isolate frozen Node construction and cached-property costs.

Run: python -m game.benchmarks.benchmark_node
Controls execute the current string.py with only Node freezing and caching varied.
Production classes are not modified.
"""

from dataclasses import replace
from functools import cached_property
from pathlib import Path
import re
import sys
import types

from game import string
from .benchmark_string import measure, sample


def coordinates(s):
    return [(n.x, n.y, n.vx, n.vy) for n in s.nodes]


def shared_tick(s, h):
    """Immutable nodes can be shared; only the list needs copying."""
    result = replace(s, nodes=list(s.nodes))
    t = 0.0
    while t < h:
        dt = min(h - t, result.max_step)
        result.advance(dt)
        t += dt
    return result


def main():
    source_path = Path(string.__file__)
    source = source_path.read_text()
    pattern = r"@dataclass(?:\(frozen=True\))?\nclass Node:"
    assert len(re.findall(pattern, source)) == 1, "Expected one Node dataclass"
    controls = {}
    try:
        for frozen in (False, True):
            control = types.ModuleType(f"game._string_node_benchmark_{frozen}")
            control.__package__ = "game"
            sys.modules[control.__name__] = control
            controls[frozen] = control
            decorator = "@dataclass(frozen=True)" if frozen else "@dataclass"
            variant_source = re.sub(
                pattern, decorator + "\nclass Node:", source, count=1
            )
            exec(compile(variant_source, str(source_path), "exec"), control.__dict__)

        for count in (24, 134):
            current = sample(count)
            reference = coordinates(current.next_tick(0.001))
            print(
                f"\n{count} nodes, 1-ms next_tick, median microseconds/call:",
                flush=True,
            )
            for label, frozen, cached_names, share in (
                ("mutable, no caches", False, (), False),
                (
                    "mutable, cached length+normal (current)",
                    False,
                    ("length", "normal"),
                    False,
                ),
                ("frozen, no caches", True, (), False),
                ("frozen, cached length+normal", True, ("length", "normal"), False),
                (
                    "frozen, cached length+normal, list copy only",
                    True,
                    ("length", "normal"),
                    True,
                ),
            ):
                module = controls[frozen]
                for name in ("length", "normal", "length_rate"):
                    original = getattr(module.Node, name)
                    getter = (
                        original.func
                        if isinstance(original, cached_property)
                        else original.fget
                    )
                    if name in cached_names:
                        descriptor = cached_property(getter)
                        descriptor.__set_name__(module.Node, name)
                    else:
                        descriptor = property(getter)
                    setattr(module.Node, name, descriptor)
                state = module.String(
                    nodes=[module.Node(*values) for values in coordinates(current)],
                    max_step=current.max_step,
                )
                tick = shared_tick if share else module.String.next_tick
                result = tick(state, 0.001)
                assert coordinates(result) == reference
                assert result.nodes is not state.nodes
                print(
                    f"{label}: {measure(lambda: tick(state, 0.001), .08, 5):.1f}",
                    flush=True,
                )
    finally:
        for module in controls.values():
            sys.modules.pop(module.__name__, None)


if __name__ == "__main__":
    main()
