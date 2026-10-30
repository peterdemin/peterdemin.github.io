# Python rendering through Metal

`main_wgpu.py` is a runnable alternative to `main_nice.py`. It uses
[wgpu-py](https://wgpu-py.readthedocs.io/en/stable/), whose native backend maps
WebGPU to Metal on macOS. No browser or OpenGL context is involved.
[RenderCanvas](https://rendercanvas.readthedocs.io/stable/) and GLFW provide
the window, events, and Retina pixel dimensions. `World` and the physics
classes are reused without changes.

## Run

Python 3.11 or newer:

```sh
python -m pip install -r game/requirements_wgpu.txt
python -m game.main_wgpu
```

Or use an isolated temporary environment with uv:

```sh
uv run --with-requirements game/requirements_wgpu.txt python -m game.main_wgpu
```

Startup prints the selected GPU and native backend. On this Mac it reports
`GPU: Apple M1 / Metal`. Other platforms can use wgpu's Vulkan or D3D12 backends;
only Metal was tested here. For an explicit backend check on macOS:

```sh
WGPU_BACKEND_TYPE=Metal python -m game.main_wgpu
```

| Key | Action |
| --- | --- |
| 1 | Hard contours, no AA |
| 2 | Analytic shader smoothing (default) |
| 3 | 4x MSAA with sample-interpolated contours |
| 4 | Analytic smoothing plus 4x MSAA |
| Tab | Studio/classic palette and shading |
| Space | Pause for comparisons |
| M | Toggle a magnified view of the red ball's rendered edge |
| WASD | Control the red ball |
| R | Original simulation's ball reset |
| Escape | Close |

The title shows the AA mode and FPS. To start in a particular mode:

```sh
python -m game.main_wgpu --aa both --style classic --size 960 720
```

### Seeing the differences

At normal size, especially on Retina displays, the AA modes can look almost
identical: only the boundary pixels change. The mode changes are shown in the
window title and printed to the terminal. To compare a frozen scene:

```sh
python -m game.main_wgpu --inspect --style classic
```

This starts paused with a magnifier in the upper right. Press 1–4 and inspect
the same edge. A small square on the red ball marks the source crop. The inset
enlarges those **already rendered physical pixels** with nearest-neighbor
sampling, so the hard steps in mode 1 and partial coverage in modes 2–4 are
visible. It does not enlarge and redraw the underlying vector geometry.
`M` toggles the inset and Space resumes the simulation. Modes 2 and 4 can still
look very similar because both use the same analytic coverage ramp.

The inspector also works with offscreen captures:

```sh
python -m game.main_wgpu --headless --frames 30 --inspect --style classic --aa off --screenshot /tmp/edge-off.png
python -m game.main_wgpu --headless --frames 30 --inspect --style classic --aa analytic --screenshot /tmp/edge-aa.png
```

## How it draws

The CPU converts `Circle`, `Line`, and `Path` primitives into disk/capsule
instances. A storage buffer holds floating-point endpoints, radius, color,
and shading flags. The GPU draws a fullscreen background and a single
instanced batch of bounding quads. `nice.wgsl` computes distance to each
disk/capsule, coverage at its boundary, and optional ball highlights.

Analytic smoothing uses a one-physical-pixel coverage ramp. Position and radius
stay fractional, including when the window is on a Retina display. This avoids
drawing an entire high-resolution CPU surface and downsampling it every frame.
MSAA uses a four-sample attachment and resolves to the display texture. Sample
interpolation is important: a fragment shader that simply discards outside a
circle at pixel frequency would not automatically gain smooth circular edges
from an MSAA framebuffer.

The studio treatment includes the grid, shadows, highlights, and anchor markers.
Classic removes those so the AA modes can be compared on plain geometry. Rope
segments use round ends; overlapping coverage ramps at joins can make some
joins slightly heavier. This prototype does not smooth or change the simulated
rope's underlying node positions.

## Reproducible GPU captures

```sh
python -m game.main_wgpu --headless --frames 30 --aa analytic --screenshot /tmp/metal.png
python -m game.main_wgpu --headless --frames 30 --aa off --style classic --screenshot /tmp/hard.png
```

`--headless` creates an offscreen GPU texture, not an SDL dummy display; it still
needs an accessible GPU driver. Finite runs use the same initial frame and fixed
1/60-second steps as `main_nice.py` captures. PNG readback occurs only when
requested; interactive drawing stays on the GPU. The original pygame dependency
remains for existing primitive definitions and PNG encoding, and pytest remains
because the original physics modules import it.

## Local findings

Verified on Apple M1 / Metal, Python 3.14.3, with the versions in
`requirements_wgpu.txt`:

- All four AA modes in both styles render offscreen.
- A flat red disk contains 2 distinct colors without AA, 187 with analytic AA,
  5 with 4x MSAA, and 223 with both. This checks actual boundary coverage,
  rather than just successful context creation.
- Rendering and switching modes leave the physics state unchanged.
- Resizing and non-256-aligned screenshot row widths work.
- Window creation, Retina-sized targets, MSAA presentation, and automatic
  closure after a finite run work.

A small frozen-scene check at 960x720 measured approximately **1.7 ms/frame**
for analytic studio rendering, including a synchronous one-pixel GPU readback
to ensure work completed. The software 4x supersampling studio renderer took
approximately **11.6 ms/frame** in the same check. These are 20-frame local
measurements, not GPU timestamp timings or end-to-end simulation benchmarks;
they exclude physics and window presentation.

Analytic AA is the default because it gives smooth curves without a multisample
attachment. Metal accelerates rendering; it does not accelerate the existing
Python spring integration. The new window uses GLFW input instead of pygame
input. The software experiment remains available for direct comparisons.
