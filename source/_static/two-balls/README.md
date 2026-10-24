# Two rigid disks, floor and side walls

New `01e-two-balls.rst` follows the user's current `01d-bouncing-ball.rst`
through the existing filename-sorted glob. All original lessons and the
one-ball implementation remain untouched. This deliberately separate solver
adds interacting finite masses without changing the original example.

```sh
python3 scripts/build_two_balls.py
python3 scripts/build_two_balls.py --check
node source/_static/two-balls/checks.mjs
```

`make html` regenerates this classic bundle. Standalone built URL:
`/_static/two-balls/index.html`. No CDN/module imports at runtime.

## Model / implementation correspondence

- Two equal 1 kg, .2 m radius absolutely rigid disks in a fixed 4×3 m side
  view. g=9.81 m/s². A starts held at (1.82,2.2), B supported at (2,.2).
  Only A can be dragged; valid nonoverlapping hand positions are prescribed,
  no physical throwing speed inferred; zero-velocity release. Reset restores
  both. While held A has zero inverse mass; B always has finite inverse mass.
- `interaction.mjs`: client-to-world mapping and an always-visible orange grab
  guide, including in flight and after settling. Blue/distant clicks cannot
  pick orange. Primary mouse/touch pointer capture ends on release/cancel;
  no reset or release button is required to grab. Grab starts new diagnostics,
  never resets blue. Hover uses grab cursor; active pointer uses grabbing.
- `pairGeometry`: center-distance gap and normalized A→B direction.
  `pairImpulse`: isolated pair `J=-(1+e)*u/(wA+wB)`, equal/opposite changes.
  `resolveContacts`: accumulated compression impulses, restitution on the
  removed velocity, final inelastic projection. Isolated contacts agree with
  `pairImpulse`; simultaneous contacts approximate coupled dissipative impact,
  not separate forced e=.65 ratios at every contacting face.
- `projectRates`: inverse-mass-weighted unilateral solves, up to160 sweeps,
  residual check. Same machinery solves supported accelerations, including
  curvature `aRelative·normal >= -tangentSpeed²/distance` for touching disks.
  Fixed geometry has zero inverse mass; floor support never pins a disk.
- Floor/left/right normals (0,1),(1,0),(-1,0). Restitution .65, no spin,
  wall/pair tangential friction. Low-speed shared contact sets use e=0 if the
  largest approach speed is ≤.2 m/s. Stacks can rest under support forces.
- Explicit floor resistance: supported sliding acceleration -.8*sign(vx)
  m/s², event at vx=0; static resistance capped at mass*.8 N. This is a
  phenomenological constant force-limit, not full load-based rolling/Coulomb
  friction. No airborne damping. Necessary for eventual horizontal rest.
- Tick1/120 s, intervals≤1/480 s. Constant-acceleration trajectories; earliest
  plane/pair impact via bracketed polynomial roots, interval split at events
  and friction stopping. The squared pair-distance equation is quartic when
  relative acceleration differs (e.g. one body is floor-supported).
- Inverse-mass position repairs below1e-11 m penetration; gaps≤1e-9 m contact.
  Supported curved contact is approximate over each small interval. Reject
  and halve an interval if kinetic+potential energy rises beyond1e-10 times
  max(1,previous energy's numeric J value). No velocity normalization or
  scripted kick. Explicit failure on invalid state/failed solve.
- Frames separate from physics, cap .1 wall seconds and16 ticks; discard
  excess whole-tick budget. Visibility changes clear accumulation.

Theory and sources are next to equations in the RST. Free oblique impulse
example: n=(.6,-.8), vA=(0,-4), vB=0 gives J=2.64 N s, outgoing
(-1.584,-1.888)/(1.584,-2.112) m/s, K8→6.5216 J. With B on floor,
simultaneous support changes this response. Centered drops have no lateral
split; default offset, real impulses and explicit friction/walls produce the
demonstrated scattering and rest. No material calibration is claimed.
