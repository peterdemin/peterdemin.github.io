# Elastic string

Canvas 2D demonstration embedded in `02a-elastic-string.rst`. One endpoint
is permanently pinned; the orange endpoint is prescribed while held and
becomes a full-mass dynamic node on release. Mouse, touch and keyboard work.

```sh
python3 scripts/build_elastic_string.py
python3 scripts/build_elastic_string.py --check
node source/_static/elastic-string/checks.mjs
node source/_static/elastic-string/sag-checks.mjs
python3 source/_static/elastic-string/check_example.py  # Requires NumPy and Node.
```

`make html` regenerates the standalone classic-script bundle. There are no
CDNs, network dependencies or runtime module imports.
The builder generates a content-hashed script filename and versions both
the article's iframe URL and its standalone demo link from the demo HTML.
Changing physics, rendering or demo HTML therefore changes the loaded
asset URLs on the next `make html` / `make lightweight`, including for
`file://` previews. `--check` verifies the entire reference chain. The
readout displays the active settling damping rate so it is easy to identify.

- `physics.mjs`: state contains all planar positions then velocities.
  `rateFunction` returns velocities and accelerations without mutating its
  input. Forward Euler predicts `state+h*f(state)` using the old state throughout;
  the browser then applies geometric contour-length corrections.
  The solver uses 80 segments along a 4 m string and 5 microsecond ticks, the article's
  EA=100 N, density=0.02 kg/m, eta*A=0.1 N s, B=0.01 N m²,
  D=0.00001 N m² s, and gravity=9.81 m/s². Endpoint masses are half the
  interior mass. Supports allow rotation.
- The tensile force law is zero below rest length. There is no compression
  spring or extension cap. To represent manufactured contour length rather
  than permit material to pile into a point load, `projectContour` corrects
  shortened links back toward rest length after each Euler prediction.
  Two alternating sweeps split corrections by inverse mass, with zero
  weight for supports, and add correction/h to velocities. The correction
  tolerance is 1e-6 of rest length; finite sweeps are approximate. These are
  constraint reactions, with no stored compression energy. Straight short
  segments still have zero material force, but the geometric solver restores
  their contour length. Nonadjacent links may cross; there is no self-contact.
- Bending uses the article's angle energy `B/(2*spacing)*theta²`, its
  analytic position gradients, and moment `(B*theta+D*thetaRate)/spacing`.
  Internal forces conserve total force and torque, and bending damping
  ignores rigid motion. Contour constraints keep the angle gradients
  resolved. `example.py`, included directly in the article, implements the
  same forces, hand boundary conditions, Euler prediction, and projection.
  `check_example.py` compares complete updates with this JavaScript solver
  and checks the inverse-mass/impulse formulas on isolated shortened pairs.
- Reset starts held. The hand follows a bounded target at up to 6 m/s,
  within 4.6 m of the fixed support. Release sets only the grabbed end's
  velocity to zero; all other motion continues. Regrabbing captures the
  current position. No prescribed animation.
- Both implementations add gentle artificial settling damping at 0.8/s to free-node
  accelerations: `dv/dt -= 0.8*v`. It damps the overall swing as well as
  deformation; internal material damping alone cannot dissipate rigid
  rotation. This is a numerical demonstration choice, not calibrated
  material friction or a model of air resistance. Prescribed hand motion
  and the permanent pin are unaffected. It is included in the Euler rate
  function, not applied by changing the rendered trajectory.
- Frames accumulate elapsed time, with at most 6000 ticks per frame. Excess
  time is discarded, so slow devices may lag wall time. Hidden tabs stop
  accumulating time. The displayed time counts accepted microticks.
  Quarter-speed playback starts enabled to make wave travel easier to see;
  its checkbox restores normal speed. Physical coefficients and step size
  stay the same. Segment rest spacing remains 0.05 m, as in the earlier 1 m
  version. The camera and metre grid scale with the longer string.
- No floor, support contact, self-contact, tearing or atmosphere. Lines can
  cross. Parameters are illustrative, not calibrated string properties.
