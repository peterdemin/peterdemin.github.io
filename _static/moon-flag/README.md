# Stretchy lunar flag

A dependency-free, fixed-front WebGL experiment embedded in chapter two of *The Physics of a Fixed Sail*, following chapter one's cloth mechanics. Sphinx copies this directory through its existing `html_static_path`; no build configuration changes are needed. The RST chapter embeds `_static/moon-flag/index.html?embedded=1` and offers the standalone page as a fallback.

## Local preview

From the repository root:

```sh
python3 -m http.server 8766 --bind 127.0.0.1
```

Open `http://127.0.0.1:8766/source/_static/moon-flag/index.html`. The return-to-chapter link assumes the generated Sphinx HTML; source-only preview does not generate the book.

The browser loads a classic-script `bundle.js`, so the standalone page and
generated chapter also work when opened directly through `file://`. Browsers
block module imports from local files. The bundle is generated, not a second
physics implementation: edit `physics.mjs` and `main.mjs`, then run
`python3 scripts/build_moon_flag.py`. `make html` regenerates it automatically.
Use `python3 scripts/build_moon_flag.py --check` to check for stale output.
The chapter also sends its theme through source-checked `postMessage` events,
so local-file origin restrictions do not leave the controls in the wrong theme.

Embedded mode suppresses the standalone heading, prose and model notes because
the RST chapter supplies those using the book theme. The scene remains dark
for readable shape lighting; surrounding buttons and labels inherit the
parent chapter's font and Solarized theme colors, including theme changes.
The same module and physical state update both modes: there is no second copy
of the simulation. The RST iframe has a descriptive accessible title and a
standalone fallback link. The camera is fixed in both modes.

## Interaction

- The left edge is fixed exactly. There is no top rod.
- Reset supplies a temporary hand at the top-right corner so the flag is ready to grab.
- Drag that corner with mouse or touch. Pointer capture keeps the grab active outside the handle. Releasing, cancellation, lost capture, blur, or hiding the document releases an active drag.
- Focus the corner for keyboard control: Space/Enter toggles the hand, arrows move its target, Escape releases. The separate button also toggles the hand.
- The camera has a fixed frontal position and orientation, with responsive framing. There are no orbit controls. Updated, area-weighted normals feed a directional key light, fill light, ambient term, and broad specular highlight on both faces.

## Mechanical model

The 2.4 × 1.4 m reference sheet has 24 × 14 cells, 375 mass points, 672 triangles, and total mass 0.7392 kg at a chosen 0.22 kg/m². Each cell assigns a quarter of its reference mass to each corner. All 15 left-edge nodes are fixed, retaining their mass in the accounting.

Compliant distance constraints supply extension resistance (35 N/m) along horizontal and vertical links and shear resistance through one diagonal per cell (0.35 N/m). These mesh-link values are deliberately soft and are **not** the continuum membrane coefficients of chapter one. Neighboring triple-point constraints penalize the three-dimensional second difference of positions with coefficient 2 N/m. This is an actual quadratic energy minimized by compliant corrections, preserving rigid-rotation invariance for a flat reference. It favors smoothly varying tangents but also resists nonuniform extension, so it is a bending regularizer rather than a pure calibrated shell energy. Both shear and bending affect the computed motion.

The solver follows [XPBD](https://matthias-research.github.io/pages/publications/XPBD.pdf), using 120 steps per simulated second and 16 elastic/bending sweeps per step. Multipliers reset between steps. Gravity is 1.62 m/s², from [NASA's Moon Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html). An exponential velocity reduction at 0.35/s is explicitly numerical/material-like damping, **not air drag**. The Moon's tenuous atmosphere is not simulated. A 7 cm smooth initial geometric perturbation seeds out-of-plane motion; it is not a time-varying shape prescription. There is no wind or prescribed falling path.

### Intentionally nonlinear limit

Chapter one's linear elastic energy has no finite maximum extension. This experiment adds a separate unilateral constraint: no extension or shear link may exceed **1.55 times its reference length**. Below the cap, it follows the soft compliant rules; at the cap, extension is constrained. This is a deliberately nonlinear teaching addition, not an assertion that real fabric becomes unbreakable.

The hand target is projected into the intersection of bounding spheres about the fixed edge. These are necessary reach bounds, not proof that every mesh constraint is feasible. The hand then advances by at most 2.4 m/s in simulated time, slowing adaptively if a limit solve needs a smaller movement. A rejected hand movement no longer discards the requested target: it retries more gradually, retaining useful stretch with the softer material. Extra hard-limit sweeps check feasibility, and any nonfinite or insufficiently converged step rolls back to the previous accepted state. Accepted maximum link ratios are at most 1.5501, including a 0.0001 relative solver tolerance. The display rounds this to a 55% limit. At the bound, further pull can change direction but cannot keep stretching the mesh.

No tearing, plasticity, self-contact, pole/ground collision, measured constitutive behavior, or calibrated physical settling time is provided. Overlaps are possible. Frame pacing caps catch-up work on slow devices; simulated time may lag wall time. Numerical stability, smooth appearance, and the internal checks do not validate real fabric behavior.

## Checks

```sh
node source/_static/moon-flag/checks.mjs
node --check source/_static/moon-flag/main.mjs
```

Checks cover reference mass and geometry, exact left pins, 33% visible corner reach, extreme target bounding and every sampled local extension limit, release, positive versus zero lunar gravity, substantial release from both default and stretched states (more than 1.5 m free-corner drop and 0.5 m mass-center drop within three simulated seconds), nonplanar smooth bending, repeated grabs and releases, finite positions, reset, and invalid-target rejection. Browser QA additionally exercises mouse drag/release, keyboard stretch to the cap, button release, reset, rendering and lighting. These are implementation checks, not experimental validation.

## Why the release tuning changed

The original 8 N/m shear links and 80 N/m tangent-change regularizer
provided enough in-plane resistance to keep the flag extended like a soft
cantilevered plate. Damping at 1.4/s also suppressed the falling motion.
The release correctly freed the corner, and gravity was already lunar;
neither was the reason it appeared suspended.

The revised values keep extension stiffness at 35 N/m, reduce shear to
0.35 N/m and the regularizer to 2 N/m, and reduce artificial damping to
0.35/s. The cloth can drape and swing instead of staying spread out.
The 55% link limit and exact left pins are unchanged. Hot-loop allocation
reductions help the real solver keep up without speeding up simulated
time or adding a prescribed falling path. Constants are named exports at
the top of `physics.mjs` for straightforward future tuning.
