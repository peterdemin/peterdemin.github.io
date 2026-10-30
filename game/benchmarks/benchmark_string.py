"""Reproducible experiment; does not replace the production implementation.

Run from the repository root: python -m game.benchmarks.benchmark_string
Requires the game's pygame dependency and Rust (RUSTC, default: rustc).
Compiles into a temporary directory; timings include Python/Rust data conversion.
"""

import argparse
import copy
import cProfile
import ctypes
import math
import os
from pathlib import Path
import platform
import pstats
import random
import shlex
import statistics
import subprocess
import tempfile
import time

from game.string import Node, String


def python_tick(s, h, cheap_copy=False):
    """Same semi-implicit Euler method, with scalar forces instead of Nodes."""
    result = copy.copy(s) if cheap_copy else copy.deepcopy(s)
    if cheap_copy:
        result.nodes = [Node(n.x, n.y, n.vx, n.vy) for n in s.nodes]
    t = 0.0
    while t < h:
        dt = min(h - t, result.max_step)
        nodes = result.nodes
        fx = [0.0] * len(nodes)
        node_mass = result.mass / len(nodes)
        fy = [-result.G * node_mass] * len(nodes)
        for i in range(len(nodes) - 1):
            a, b = nodes[i], nodes[i + 1]
            dx, dy = b.x - a.x, b.y - a.y
            length = math.hypot(dx, dy)
            extension = length - result.segment
            if extension > 0:
                nx, ny = dx / length, dy / length
                rate = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny
                tension = max(result.spring * extension + result.viscosity * rate, 0.0)
                tx, ty = nx * tension, ny * tension
                fx[i] += tx
                fy[i] += ty
                fx[i + 1] -= tx
                fy[i + 1] -= ty
        result.nodes = []
        for i, n in enumerate(nodes):
            vx = result._settle(n.vx + (fx[i] / node_mass - n.vx * result.damping) * dt)
            vy = result._settle(n.vy + (fy[i] / node_mass - n.vy * result.damping) * dt)
            result.nodes.append(Node(n.x + vx * dt, n.y + vy * dt, vx, vy))
        if result.fix_first:
            result.nodes[0] = nodes[0]
        if result.fix_last:
            result.nodes[-1] = nodes[-1]
        t += dt
    return result


class Native:
    def __init__(self, library):
        self.library = ctypes.CDLL(str(library))
        self.kernel = self.library.string_tick
        self.kernel.argtypes = (
            [ctypes.POINTER(ctypes.c_double)] * 2
            + [ctypes.c_size_t]
            + [ctypes.c_double] * 9
            + [ctypes.c_int] * 2
        )
        self.kernel.restype = None

    @staticmethod
    def buffers(s):
        state = (ctypes.c_double * (4 * len(s.nodes)))(
            *(v for n in s.nodes for v in (n.x, n.y, n.vx, n.vy))
        )
        return state, (ctypes.c_double * (2 * len(s.nodes)))()

    def call(self, s, h, state, scratch):
        self.kernel(
            state,
            scratch,
            len(s.nodes),
            h,
            s.max_step,
            s.G,
            s.mass,
            s.segment,
            s.spring,
            s.viscosity,
            s.damping,
            s.cancel_speed,
            s.fix_first,
            s.fix_last,
        )

    def tick(self, s, h, cheap_copy=False):
        result = copy.copy(s) if cheap_copy else copy.deepcopy(s)
        state, scratch = self.buffers(result)
        self.call(result, h, state, scratch)
        result.nodes = [
            Node(*state[i : i + 4]) for i in range(0, len(state), 4)  # noqa: E203
        ]
        return result


def sample(n):
    # Taut, curved and moving; exercises springs, viscosity and damping.
    return String(
        [
            Node(
                i * 0.052,
                0.1 * math.sin(i * 0.2),
                0.02 * math.sin(i),
                0.03 * math.cos(i),
            )
            for i in range(n)
        ],
        # Keep the updated, stiffer physics stable during batched comparisons.
        max_step=0.001 if n <= 134 else 0.0002,
    )


def check(native):
    rng = random.Random(173)
    worst = 0.0
    cases = 0
    for n in (2, 24, 134):
        for fixed in ((False, False), (True, False), (False, True), (True, True)):
            for shape in ("taut", "slack", "coincident"):
                s = sample(n)
                s.fix_first, s.fix_last = fixed
                if shape != "taut":
                    s.nodes = [
                        Node(
                            i * 0.01 if shape == "slack" else 0.0,
                            0.0,
                            rng.uniform(-0.1, 0.1),
                            rng.uniform(-0.1, 0.1),
                        )
                        for i in range(n)
                    ]
                original = copy.deepcopy(s)
                variants = [copy.deepcopy(s) for _ in range(4)]
                for h in (0.0, 0.001, 0.016, 0.05) * 10:
                    s = s.next_tick(h)
                    variants = [
                        python_tick(variants[0], h),
                        python_tick(variants[1], h, True),
                        native.tick(variants[2], h),
                        native.tick(variants[3], h, True),
                    ]
                    for candidate in variants:
                        for a, b in zip(s.nodes, candidate.nodes, strict=True):
                            assert a is not b
                            for key in ("x", "y", "vx", "vy"):
                                x, y = getattr(a, key), getattr(b, key)
                                worst = max(worst, abs(x - y))
                                assert math.isclose(
                                    x, y, rel_tol=1e-10, abs_tol=1e-10
                                ), (shape, key, x, y)
                assert original == original.next_tick(0)
                # Results must not share even fixed endpoints with input.
                for candidate in (
                    python_tick(original, 0.001, True),
                    native.tick(original, 0.001, True),
                ):
                    assert all(
                        a is not b for a, b in zip(original.nodes, candidate.nodes)
                    )
                cases += 1
    print(
        f"Parity: {cases} cases x 40 ticks x 4 variants; max absolute error {worst:.3g}"
    )
    settling = String(
        [Node(), Node(y=-1.4)],
        segment=1,
        spring=10,
        viscosity=1,
        damping=0.01,
        fix_last=False,
    )
    assert settling.next_tick(100) == native.tick(settling, 100, True)
    print("Native also reproduces the existing 100-second settling case exactly.")


def measure(fn, seconds, repeats):
    for _ in range(5):
        fn()
    start = time.perf_counter()
    for _ in range(10):
        fn()
    elapsed = time.perf_counter() - start
    count = max(5, min(100000, int(seconds / (elapsed / 10))))
    samples = []
    for _ in range(repeats):
        start = time.perf_counter()
        for _ in range(count):
            fn()
        samples.append((time.perf_counter() - start) / count * 1e6)
    return statistics.median(samples)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--seconds", type=float, default=0.08)
    parser.add_argument("--repeats", type=int, default=5)
    args = parser.parse_args()
    print(platform.python_version(), platform.platform())
    compiler = shlex.split(os.environ.get("RUSTC", "rustc"))
    print(subprocess.check_output(compiler + ["--version"], text=True).splitlines()[0])
    with tempfile.TemporaryDirectory(prefix="string-benchmark-") as tmp:
        library = Path(tmp) / "string_kernel.so"
        command = compiler + [
            "--edition=2021",
            "--crate-type=cdylib",
            "-C",
            "opt-level=3",
            str(Path(__file__).with_name("string_kernel.rs")),
            "-o",
            str(library),
        ]
        subprocess.run(command, check=True)
        native = Native(library)
        check(native)
        print("\nMedian microseconds/call (speedup relative to current Python):")
        print(
            "nodes  tick     current     Python+deepcopy  Rust+deepcopy   Python+clone  Rust+clone   Rust buffer only"
        )
        for n in (24, 134, 512):
            for h in (0.001, 1 / 60):
                s = sample(n)
                state, scratch = native.buffers(s)
                initial, _ = native.buffers(s)

                def buffer_tick():
                    # Match the other variants' starting state on every call.
                    ctypes.memmove(state, initial, ctypes.sizeof(state))
                    native.call(s, h, state, scratch)

                functions = [
                    lambda: s.next_tick(h),
                    lambda: python_tick(s, h),
                    lambda: native.tick(s, h),
                    lambda: python_tick(s, h, True),
                    lambda: native.tick(s, h, True),
                    buffer_tick,
                ]
                times = [measure(f, args.seconds, args.repeats) for f in functions]
                cells = [f"{times[0]:9.1f}"] + [
                    f"{v:7.1f} ({times[0] / v:5.1f}x)" for v in times[1:]
                ]
                print(
                    f"{n:5d}  {h:.4f}  " + "  ".join(cells) + f"  max_step={s.max_step}"
                )
        # Exercise the actual 1-ms caller, including collision handling and
        # repeated crossings of the Python/Rust boundary. Rendering is excluded.
        from game.main import GameControls, World

        original_tick = String.next_tick
        print("\nWorld.tick(1/60), median milliseconds/frame; excludes rendering:")
        for sized in (True, False):
            timings = []
            try:
                for implementation in (
                    original_tick,
                    lambda s, h: python_tick(s, h, True),
                    lambda s, h: native.tick(s, h, True),
                ):
                    String.next_tick = implementation
                    world = World(GameControls())
                    if sized:
                        world.adjust(640, 480, 400)
                    initial_ball, initial_ball2 = copy.copy(world.ball), copy.copy(
                        world.ball2
                    )
                    initial_string = world.string

                    def frame():
                        # Replay an identical frame; include the small reset cost
                        # equally for all variants, and avoid trajectory bias.
                        world.ball, world.ball2 = copy.copy(initial_ball), copy.copy(
                            initial_ball2
                        )
                        world.string = initial_string
                        world.tick(1 / 60)

                    timings.append(measure(frame, args.seconds, args.repeats) / 1000)
            finally:
                String.next_tick = original_tick
            print(
                f"{len(world.string.nodes)} nodes: current={timings[0]:.3f}, "
                f"Python+clone={timings[1]:.3f} ({timings[0] / timings[1]:.1f}x), "
                f"Rust+clone={timings[2]:.3f} ({timings[0] / timings[2]:.1f}x)"
            )
        print("\nCurrent Python profile: 134 nodes, 1000 ticks of 1 ms")
        s = sample(134)
        profiler = cProfile.Profile()
        profiler.enable()
        for _ in range(1000):
            s = s.next_tick(0.001)
        profiler.disable()
        pstats.Stats(profiler).strip_dirs().sort_stats("cumulative").print_stats(18)


if __name__ == "__main__":
    main()
