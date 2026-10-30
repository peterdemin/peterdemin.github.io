# Elastic string

Canvas 2D demonstration embedded in `02a-elastic-string.rst`. One endpoint
is permanently pinned; the orange endpoint is prescribed while held and
becomes a full-mass dynamic node on release. Mouse, touch and keyboard work.

```sh
python3 scripts/build_elastic_string.py
python3 scripts/build_elastic_string.py --check
node source/_static/elastic-string/checks.mjs
node source/_static/elastic-string/sag-checks.mjs
node source/_static/elastic-string/lift-checks.mjs
node source/_static/elastic-string/drag-checks.mjs
node source/_static/elastic-string/held-checks.mjs
node source/_static/elastic-string/integration-checks.mjs
node source/_static/elastic-string/frame-checks.mjs
node source/_static/elastic-string/adaptive-checks.mjs
node source/_static/elastic-string/benchmark.mjs  # Offline timings; excludes the frame budget.
python3 source/_static/elastic-string/check_example.py  # Requires NumPy and Node.
```

`make html` regenerates the standalone classic-script bundle. There are no
CDNs, network dependencies or runtime module imports.
The builder generates a content-hashed script filename and versions both
the article's iframe URL and its standalone demo link from the demo HTML.
Changing physics, rendering or demo HTML therefore changes the loaded
asset URLs on the next `make html` / `make lightweight`, including for
`file://` previews. `--check` verifies the entire reference chain.

- `physics.mjs`: state contains all planar positions then velocities.
  `rateFunction` returns velocities and accelerations without mutating its
  input. A first-order semi-implicit Euler step solves material friction at the new
  velocities and old geometry, advances positions with those velocities, and
  then applies geometric contour-length corrections. Fast motion subdivides
  a tick until no node travels more than 1% of a link length. Proposals use
  90% of the speed-based movement allowance, leaving room for acceleration and
  contour repair instead of routinely solving and rejecting an oversized step.
  Rejected trials still halve the step. A reusable snapshot restores the full
  state, and squared-distance comparisons avoid per-node square roots.
  `adaptive-checks.mjs` measures rejected trials and compares fast motion with
  a tenfold smaller nominal step. The mass-plus-damping
  system is symmetric banded; active-set iterations enforce nonnegative tension.
  JavaScript reuses solver buffers and material terms, assembles bending once
  per substep across active-set iterations, and specializes Cholesky for the
  fixed bandwidth. Only coordinates neighboring a support need boundary
  elimination. These optimizations preserve the same implicit equations.
  The solver uses 80 segments (81 nodes) along a 4 m string and 100 microsecond ticks, the article's
  EA=100 N, density=0.02 kg/m, eta*A=30 N s, B=0.0001 N m²,
  D=0.00001 N m² s, and gravity=9.81 m/s². Endpoint masses are half the
  interior mass. Supports allow rotation.
- The tensile force law is zero below rest length. There is no compression
  spring or extension cap. To represent manufactured contour length rather
  than permit material to pile into a point load, `projectContour` corrects
  shortened links back toward rest length after each Euler prediction.
  Two alternating sweeps split corrections by inverse mass, with zero
  weight for supports. For touching links, a separate inelastic impulse cancels
  closing velocity without introducing a rebound. Position repairs are never
  converted into velocities. The contact tolerance is 1e-6 of rest length;
  finite sweeps are approximate. These are
  constraint reactions, with no stored compression energy. Straight short
  segments still have zero material force, but the geometric solver restores
  their contour length. Nonadjacent links may cross; there is no self-contact.
- Bending uses the article's angle energy `B/(2*spacing)*theta²`, its
  analytic position gradients, and moment `(B*theta+D*thetaRate)/spacing`.
  Internal forces conserve total force and torque, and bending damping
  ignores rigid motion. Effective bending friction is chosen independently
  of axial viscosity: its relaxation time D/B is 0.1 s. This damps small
  bending ripples without increasing the static bending stiffness. Contour
  constraints keep the angle gradients resolved. `example.py`, included directly in the article, implements the
  same forces, hand boundary conditions, Euler prediction, and projection.
  `check_example.py` compares complete updates with this JavaScript solver
  and checks the inverse-mass/impulse formulas on isolated shortened pairs.
  `lift-checks.mjs` checks mirrored hanging lifts, local bottom folds, upper
  motion, and that contour repair cannot inject kinetic energy into free nodes.
- Reset starts straight and held with zero velocities. Gravity and the ordinary
  material forces produce the sag; no resting shape is precomputed.
  `held-checks.mjs` measures decay from that straight state, compares time steps,
  and checks that removing material friction restores the bounce. The hand follows a bounded target through a critically damped controller
  (response time 0.015 s, acceleration limit 100 m/s², speed limit 6 m/s),
  within 4.6 m of the fixed support. Release sets only the grabbed end's
  velocity to zero; all other motion continues. Regrabbing captures the
  current position. Discrete pointer samples no longer cause repeated full-speed
  starts and stops; the smoothing acts on the hand, not the rendered string.
  No prescribed animation.
- Extension and bending friction dissipate deformation energy. There is no
  additional velocity-proportional external drag. A released string can keep
  swinging while internal deformation dissipates its energy; no fixed settling
  time is imposed. The inelastic contour impulses also dissipate closing motion,
  and Euler/projection errors must be assessed separately from material losses.
- Frames accumulate elapsed time, with an 8 ms physics budget per frame,
  checked after each accepted adaptive substep. A solve and any retries already
  in progress finish before yielding, so this is a soft budget. Excess
  wall time is discarded, so heavy motion or slow devices reduce playback speed
  instead of creating an ever more expensive catch-up loop. Step sizes and
  material coefficients remain unchanged. Hidden tabs stop
  accumulating time. The displayed time counts accepted microticks.
  Normal-speed playback starts enabled; the slow-motion checkbox selects
  quarter speed to make wave travel easier to see. Physical coefficients and step size
  stay the same. Segment rest spacing is 0.05 m. Tight folds have less geometric detail than at 160 segments; `sag-checks.mjs` compares both resolutions. The camera and metre grid scale with the longer string.
- No floor, support contact, self-contact, tearing or atmosphere. Lines can
  cross. Parameters are illustrative, not calibrated string properties.
