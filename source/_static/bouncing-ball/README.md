# Rigid bouncing ball

`bouncing-ball.rst` follows the contact-constraint lesson, before elastic
cloth. The book toctree explicitly orders all pages. Canvas 2D, fixed 4×3 m
side view, one rigid circle, one fixed floor. No squash/stretch or camera
controls. Mouse/touch dragging and keyboard Space/arrows/Escape.

```sh
python3 scripts/build_bouncing_ball.py
python3 scripts/build_bouncing_ball.py --check
node source/_static/bouncing-ball/checks.mjs
```

`make html` regenerates the classic bundle. Standalone built URL:
`/_static/bouncing-ball/index.html`. No CDN or module imports at runtime.

## Code-to-model correspondence

- `physics.mjs`: state `[x,y,vx,vy]` in m and m/s. Radius .2 m, mass 1 kg,
  fixed floor y=0, gravity 9.81 m/s², restitution .65, impact-speed sleep
  threshold .2 m/s. Cutoff removes at most .02 J incoming kinetic energy.
- `freeFlight`: exact constant-gravity motion, equivalent to RK4 for this
  constant acceleration. No airborne damping. Fixed step 1/120 s.
- `timeOfImpact`: positive root of `gap + vy*t - g*t²/2 = 0`, stable rational
  form for tiny gaps on downward approaches. At an event integrate up to
  impact, project center to radius, apply `impact`, then integrate remainder.
- `impact`: upward impulse `mass*(outgoing-incoming)`, with outgoing
  `-restitution*incoming`, or zero under the explicit stop cutoff. Normal
  kinetic energy fraction .4225; horizontal velocity unchanged. The demo's
  release velocities are both zero, so no horizontal flight or rolling.
- Resting contact keeps vertical state fixed: floor reaction balances weight,
  not repeated gravitational penetration/correction. No gravity is disabled
  in free flight. No hidden renormalization or bounce-height correction.
- `grab/move/release`: hand prescribes valid center inside [.2,3.8]×[.2,2.8] m,
  both velocities zero, input can add/remove energy. Release is not a throw.
  Dash-marked circle is a grab affordance only, never the physical radius.
- `advanceFrame`: wall time without acceleration, capped .1 s/frame and 16
  fixed ticks. Fraction retained; excess whole ticks dropped. Hidden tabs and
  visibility changes clear elapsed accumulation.
- `main.mjs`: one uniform position/radius drawing scale, meter floor marks,
  actual velocity/energy/contact diagnostics. Energy = kinetic + `m*g*gap`;
  cumulative collision loss resets on grab and excludes hand work.

Contact concepts/restitution: [Erin Catto's constraint notes](https://box2d.org/files/ErinCatto_ModelingAndSolvingConstraints_GDC2009.pdf).
The low-speed rest choice follows the rationale of
[Box2D's restitution threshold](https://box2d.org/documentation/md_simulation.html#restitution),
not its full solver implementation. Parameters are illustrative, not
calibrated material measurements. No side walls, atmosphere, spin, friction,
deformation or multi-body solver is included.
