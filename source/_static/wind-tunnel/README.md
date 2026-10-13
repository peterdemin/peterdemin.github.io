# Viscous wing tunnel

The book embeds this classic WebGL page in `03b-wind-tunnel.rst`, immediately
after `03-airflow.rst` via the existing filename-sorted glob toctree.
The fixed side view shows **one 2D calculated velocity field**, with one
smooth wing section and a single plane of passive tracer trails. There is
no finite-span fluid solve, tip flow, full viscous force calculation or
turbulence model. The pressure-only force diagnostic is described below.

## Build and check

```sh
python3 scripts/build_wind_tunnel.py
python3 scripts/build_wind_tunnel.py --check
node source/_static/wind-tunnel/checks.mjs
node source/_static/wind-tunnel/wing-checks.mjs
node source/_static/wind-tunnel/range-checks.mjs
node source/_static/wind-tunnel/load-checks.mjs
python3 -m http.server 8766 --bind 127.0.0.1
```

Standalone: `/source/_static/wind-tunnel/index.html`. The generated classic
`bundle.js` also works without module imports in local-file previews.
The RST parent sends source-checked theme messages; there is no network/CDN
dependency in the simulation. `make html` regenerates both simulator bundles.

## Equation mapping

- `flow.mjs: WindTunnel.predict`: explicit first-order upwind momentum
  transport, four-face interpolation of the transporting component, centered
  viscous differences. No added artistic or vorticity force.
- `WindTunnel.project`: matched face-divergence/pressure-gradient operator,
  conjugate-gradient pressure solve with diagonal preconditioning. The outlet
  pressure face is half a cell away, with matching factor 2 in matrix and
  velocity correction. Prescribed inlet and blocked faces stay unchanged.
- `uValue` / `vValue`: slip exterior top/bottom, prescribed inlet, zero-gradient
  predictor outlet; blocked normal faces zero, reflected tangential viscous
  ghost values. This is approximate stair-step no-slip, not smooth geometry.
- `advanceTracer`: explicit midpoint position, average of old/new field
  samples there; bilinear interpolation of staggered components. Fixed
  zero depth for display. Colors label seed height, not a flow-derived scalar.
- `main.mjs: traces`: stores actual paths; retires tracers whose four-point
  sub-cell segment check hits solid cells. It does not steer or reflect them.
- `wing.mjs: buildWingMesh`: smoothly renders the same underlying NACA-family
  section, with cosine-spaced samples and interpolated section shading.
  The solver still uses its coarse stair-step cell mask; this appearance-only
  change does not improve the fluid geometry or calculated flow.
  There are no extruded surfaces, repeated depth planes or camera controls.
- `loads.mjs: pressureLoads`: samples actual projection pressure at the fluid
  cell adjoining each exposed solid-mask face, using its outward normal and
  length `h`. Sums `-p n h` once per face, producing pressure-only force per
  unit span (N/m). Right/up components are pressure drag/lift relative to the
  rightward inlet, not full viscous or finite-wing loading. Wall-pressure
  sampling is first order; smooth drawing is not the integration geometry.
- `pressureField`: cellwise gauge-pressure colors, symmetric auto range
  around the zero-pressure outlet. Negative gauge pressure is not negative
  absolute pressure. Hydrostatic pressure was subtracted by the flow model.
- `main.mjs: updatePressure`: optional local signed face arrows, one yellow
  resultant and its pink drag/green lift projections. Components share the
  resultant's auto multiplier (length 1 m above 1e-8 N/m); local arrows use
  another multiplier (maximum 0.22 m). Legend reports Pa, N/m and both drawing
  multipliers. The center anchor is not a computed center of pressure.
  Full surface viscous stress, pitching moment and wing motion are omitted.
  Toggle overlays off to inspect trails; they never modify the solver.

Domain 6×3 m, displayed grid 96×48, chord 1.5 m, 18% symmetric closed-edge
NACA-family section, incoming speed 1 m/s, density 1.225 kg/m³, kinematic
viscosity 0.015 m²/s, Reynolds number 100. This is a deliberately viscous model
fluid, not realistic air. Angles ±45° are geometry choices, not stall bounds.
Large angles remain exploratory: the coarse solver is not a validated
separation, recirculation or stall calculation at these settings.
Changing angle resets geometry and flow; the code does not model wing motion.

Time steps ≤0.012 s and combined transport/diffusion bound 0.65; projected
maximum divergence ≤2e-5 /s, CG target 1e-5 /s and at most 800 iterations.
Failure is visible. Slow devices may run below wall-clock speed.

Tests cover analytic predictor terms, uniform flow, pressure symmetry,
projection, mass flux, blocked-face impermeability, ±angle reflection,
three resolutions, finite flow, reset and second-order tracer integration.
At six simulated seconds, the tested 0°/8° cases have no horizontal face speed
below -0.005 m/s downstream of the wing center (x>2.4 m); 15° has two weakly
reversed faces, minimum about -0.0071 m/s.
That is limited numerical reversal evidence, not resolved separation,
unsteady shedding or real-air stall. No turbulence model is implemented.
Stability/residuals do not certify physical accuracy. Grid bias, upwind
diffusion, approximate no-slip and simple outlet limit the result. No real-wing
lift/drag accuracy, stall, separation accuracy or finite-span effects are
claimed. Pressure-force diagnostics are model estimates, not calibrated
performance; reset's initial pressure projection is a start-up transient.
Load checks cover uniform-pressure cancellation on closed boundaries,
pressure-offset invariance, prescribed pressure signs and N/m units, mirrored
angles, actual-pressure sourcing, finite colors/forces and no solver mutation.
