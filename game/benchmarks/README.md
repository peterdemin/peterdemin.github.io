# String performance experiment

Measured October 28, 2026 on macOS arm64, CPython 3.13.13 and rustc 1.93.0,
using `--edition=2021 --crate-type=cdylib -C opt-level=3` without fast-math.
These results supersede the frozen-Node experiment. Current production Node is
mutable again, with cached length and normal, and uncached length_rate. String
uses numeric force lists, explicit node copying, equal node masses and
semi-implicit Euler. Both prototypes match its physics. Production source was
not changed for this comparison.

## Controlled freezing and caching comparison

Controls execute the current string.py in isolated modules, varying only the
Node dataclass decorator and property caching. Inputs and remaining source are
identical. Production classes are not modified. Median microseconds per 1-ms tick:

| Variant | 24 nodes | 134 nodes |
| --- | ---: | ---: |
| Mutable, no caches | 68.5 | 377.8 |
| Mutable, cached length + normal (current design) | 63.8 | 351.8 |
| Frozen, no caches | 101.6 | 565.1 |
| Frozen, cached length + normal | 92.4 | 514.6 |
| Frozen, cached length + normal, sharing nodes between snapshots | 82.2 | 460.7 |

The current design takes about 37-38% less time than frozen, uncached Nodes.
Caching saves roughly 7% compared with mutable, uncached Nodes. Frozen
construction remains more expensive; even the frozen variant that shares nodes
between snapshots is slower here. All control outputs match current coordinates
exactly. The shared-node variant is tested only with frozen Nodes, with an
independent output list.

## Actual game caller

Median World.tick(1/60) time in milliseconds, including collision handling and
Python/Rust data conversion, excluding drawing and the frame limiter. The game
calls the string 17 times per measured frame, with steps no larger than 1 ms.
Each invocation replays the same initial frame, including equal ball-reset cost.
The current default window has 25 nodes; the pre-adjustment world has 135.

| Implementation | 25 nodes | 135 nodes |
| --- | ---: | ---: |
| Current production Python | 0.998 | 4.091 |
| Optimized scalar Python | 0.622 | 2.158 |
| Rust with conversion to/from Python nodes | 0.655 | 2.248 |
| Rust speedup over current Python | 1.5x | 1.8x |

The optimized Python and Rust wrappers are close in this initial-frame workload;
Python was slightly faster in this run. It avoids conversion to native buffers,
while the initially slack geometry requires relatively little spring work.
These are initial-frame physics measurements, not a distribution of gameplay
states or a measurement of rendered FPS. Node counts and starting stretch differ
from the older 24/134-node frame reports following the from_anchors change.

## String-only measurements

Median microseconds per call, using a curved, stretched, moving string and an
identical starting state per invocation. Rust includes packing Python nodes,
calling Rust, and constructing independent Python result nodes.

| Nodes | Requested tick | Max substep | Current Python | Optimized Python | Rust | Rust speedup over current |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 24 | 1 ms | 1 ms | 68.6 | 26.9 | 22.8 | 3.0x |
| 24 | 16.67 ms | 1 ms | 998.4 | 361.6 | 25.1 | 39.8x |
| 134 | 1 ms | 1 ms | 358.7 | 144.2 | 116.1 | 3.1x |
| 134 | 16.67 ms | 1 ms | 5617.3 | 2019.0 | 145.1 | 38.7x |
| 512 | 1 ms | 0.2 ms | 6430.6 | 2412.1 | 465.0 | 13.8x |
| 512 | 16.67 ms | 0.2 ms | 106587.0 | 38336.8 | 707.9 | 150.6x |

Both Python and Rust use the same substeps. The benchmark sets max_step to
1 ms up to 134 nodes and 0.2 ms for 512 nodes to keep the stiffer physics stable.
Production defaults are unchanged. Batching runs substeps inside one native
call without creating Python nodes between steps. The game instead converts
once per 1-ms string call, explaining its smaller frame-level gains.

With preallocated native buffers, a 134-node/1-ms Rust call took 3.5 microseconds,
including ctypes overhead and resetting the input, versus 116.1 microseconds
for the complete wrapper. Native state could reduce conversion overhead, but
this experiment does not implement it in the game. Drawing, node access,
independent snapshots, and packaging would need consideration.

## Namedtuple and slots comparison

A further controlled run replaces only the Node representation in isolated
modules. Operators and physics are retained. Slotted variants use ordinary
properties because functools.cached_property requires an instance dictionary.
A namedtuple subclass with a dictionary is also tested to retain caching.
Median microseconds per 1-ms tick:

| Representation | 24 nodes | 134 nodes |
| --- | ---: | ---: |
| Current mutable dataclass, cached | 65.5 | 353.0 |
| Mutable dataclass, uncached | 72.8 | 381.6 |
| Slotted mutable dataclass, uncached | 50.3 | 273.9 |
| Slotted namedtuple, uncached | 69.3 | 376.0 |
| Namedtuple subclass with dictionary and caching | 64.2 | 356.7 |
| Slotted namedtuple, sharing nodes between snapshots | 62.9 | 350.1 |

Namedtuple provides no meaningful improvement over the current cached dataclass
on this workload. The slotted dataclass with ordinary properties is about 22-23%
faster in elapsed time, despite recomputing lengths/normals. This is a measured
result for the current single-step physics, not a general ranking of Python
containers. It suggests testing dataclass(slots=True) with length and normal
changed back to property before considering namedtuple.

Each representation matches current coordinates exactly over 20 successive
mixed-duration ticks at each node count. Input and output node lists remain
independent. Source is not modified. The benchmark preserves current Node's
numeric methods; a namedtuple would additionally expose normal tuple behavior
outside these simulation operations.

## Validation and reproduction

```sh
python -m game.benchmarks.benchmark_string
python -m game.benchmarks.benchmark_node
python -m game.benchmarks.benchmark_namedtuple
python -m pytest game/test_string.py -q
```

Requires pygame, pytest (imported by game.main), and Rust. RUSTC can select the
compiler. Rust uses only the standard library, with safe slices in the numerical
loop and unsafe borrowing confined to the foreign-function boundary. Shared
libraries are built in a temporary directory and removed afterward.

Measurements use five warmup calls, calibrated iteration counts, and the median
of five samples targeting 80 ms each, with at least five iterations per sample.
The full benchmark additionally measures legacy deepcopy variants, a native
buffer call, and profiles the current production implementation.

Equivalence checks cover 36 configurations: 2, 24 and 134 nodes; taut, slack and
coincident positions; all endpoint pinning combinations; and 40 successive ticks
per configuration. The four prototypes match the current implementation within
1e-10 relative/absolute tolerance; the largest observed absolute difference was
7.69e-13. The 100-second hanging-node case matches exactly. Output independence
is checked. Both current game/test_string.py tests pass.

The prototypes assume current scalar String/Node fields, not arbitrary subclass
overrides or added mutable metadata. This compares implementations; it does not
certify the physical model or stability for arbitrary inputs.
