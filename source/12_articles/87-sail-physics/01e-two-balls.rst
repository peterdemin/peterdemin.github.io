Two rigid balls share an impact
----------------------------------------

An offset drop, not a scripted split
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Keep the floor from :doc:`01d-bouncing-ball`, but add a second ball and
two vertical walls. Both circles have mass **1 kg** and radius **0.20 m**.
They are absolutely rigid: their drawn shapes do not squash or stretch.
Gravity has downward magnitude **9.81 m/s²**. The view is fixed in the
two-dimensional plane, with one uniform distance scale and metre marks.

Blue B initially rests on the floor. Orange A starts held at center position
(1.82, 2.20) m, a little to the left of B at (2.00, 0.20) m. Release A,
or drag it to choose a different offset. **Pick up orange directly** by
clicking or touching its dashed grab guide, then dragging. It can be picked
while falling or after either trial settles; no release button or reset is
required first. Mouse and touch drag only orange;
releasing deliberately starts it with zero velocity, not an inferred throw.
**Reset both balls** restores these initial positions. Keyboard: focus the
scene, Space grabs/releases orange, arrows move it while held, Escape releases.
Each grab starts fresh impact counts without resetting blue's position or
velocity. The release button is an optional shortcut for the initially held ball.
The hand refuses positions that would overlap blue, and stays inside the view.
The hand can supply energy by lifting; its motion is prescribed, not calculated
as another free body. While held, orange acts as an immovable contact object.

A perfectly centered vertical drop cannot create sideways motion in this
symmetric model. Its contact normal is vertical. An **oblique** impact,
one whose normal is slanted, can give opposite horizontal velocities because
the same impulse acts in opposite directions on the two finite masses.
There is no artificial sideways kick. They need not travel with equal speeds
afterward: gravity, floor support, floor resistance and wall impacts also act.
This is not a full billiards model with rolling and spin.

.. raw:: html

    <iframe
      src="../../_static/two-balls/index.html?embedded=1"
      title="An offset falling rigid ball hits a second ball inside vertical walls"
      width="100%" height="850"
      style="display:block;width:100%;height:850px;border:0;"
      loading="lazy">
    </iframe>
    <script>
      (() => {
        const frame = document.currentScript.previousElementSibling;
        const sendTheme = () => {
          const root = document.documentElement;
          const theme = getComputedStyle(root);
          frame.contentWindow.postMessage({
            type: 'two-balls-theme',
            background: theme.getPropertyValue('--sy-c-background').trim(),
            text: theme.getPropertyValue('--sy-c-text').trim(),
            border: theme.getPropertyValue('--sy-c-heading').trim(),
            font: getComputedStyle(document.body).fontFamily,
            dark: root.classList.contains('dark')
          }, '*');
        };
        frame.addEventListener('load', sendTheme);
        window.addEventListener('message', event => {
          if (event.source !== frame.contentWindow) return;
          if (event.data?.type === 'two-balls-ready') sendTheme();
          if (event.data?.type === 'two-balls-size' && Number.isFinite(event.data.height)) {
            frame.style.height = Math.max(200, Math.min(1600, event.data.height)) + 'px';
          }
        });
        const observer = new MutationObserver(sendTheme);
        observer.observe(document.documentElement, {attributes: true, attributeFilter: ['class', 'style']});
        window.addEventListener('pagehide', () => observer.disconnect(), {once: true});
      })();
    </script>

If the embed cannot start, `open the two balls on their own
<../../_static/two-balls/index.html>`_. JavaScript and Canvas 2D are required,
not WebGL. The classic bundle has no network dependencies.

A constraint between two circles
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Let :math:`\mathbf p_A,\mathbf p_B` be the two center positions, each a
pair of coordinates in metres. Bold symbols denote pairs. Let
:math:`R_A,R_B` be their radii in metres; the letters identify the balls,
not different units. Subtract matching coordinate entries to get the vector
from A to B, :math:`\mathbf d=\mathbf p_B-\mathbf p_A`.
Its length :math:`L=\sqrt{d_x^2+d_y^2}` is found by squaring its horizontal
and vertical components, adding them and taking the positive square root.
The signed **gap** :math:`C` is the center distance minus the sum of radii.
The sign :math:`\geq` means greater than or equal to:

.. math::

    C=L-(R_A+R_B)\geq0.

Positive gap means separated; zero means touching; negative means overlapping.
The **contact normal** :math:`\mathbf n=\mathbf d/L` is a unit-length
direction from A to B. Divide both vector entries by :math:`L`.
Coincident centers would have no defined normal; the input rules prevent that
case and the solver reports it as an error rather than inventing a direction.

Let :math:`m_A,m_B` be positive masses in kg and define **inverse masses**
:math:`w_A=1/m_A,w_B=1/m_B`, in 1/kg. Larger mass means smaller inverse
mass and a smaller response to the same impulse. Both demo values are 1/kg.
For an overlap, define the positive penetration depth :math:`\delta=-C`
in metres. A superscript ``new`` labels corrected position. The shared
geometric correction is

.. math::

    \mathbf p_A^{\mathrm{new}}=\mathbf p_A-
      \frac{w_A}{w_A+w_B}\delta\mathbf n,
    \qquad
    \mathbf p_B^{\mathrm{new}}=\mathbf p_B+
      \frac{w_B}{w_A+w_B}\delta\mathbf n.

Equal masses each move half the depth. A 0.02 m overlap moves each 0.01 m
along opposite normal directions. This restores valid geometry, not a bounce.
Fixed floor and wall objects have zero inverse mass in the equations; a
floor-supported ball does **not**. Its real mass remains 1 kg.
The fixed-body inverse-mass convention and collision response are described
in `Baraff's rigid-body course notes`_.

Relative velocity and a shared impulse
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Let :math:`\mathbf v_A,\mathbf v_B` be the pre-impact velocities, in m/s.
The relative velocity is :math:`\mathbf v_B-\mathbf v_A`. A dot product
multiplies matching coordinate entries and adds them. Its signed normal
component :math:`u` is

.. math::

    u=(\mathbf v_B-\mathbf v_A)\cdot\mathbf n.

Negative :math:`u` means approaching. Nonnegative means stationary relative
to the normal or separating, so no isolated collision impulse is needed.
For an approaching isolated pair choose restitution :math:`e=0.65`, the
ratio of outgoing to incoming relative normal speed. The scalar impulse
magnitude :math:`J` is in N s and acts positively on B, negatively on A.
It follows from demanding outgoing normal speed :math:`-e u`:

.. math::

    J=-\frac{(1+e)u}{w_A+w_B},
    \qquad
    \mathbf v_A^{\mathrm{new}}=\mathbf v_A-w_AJ\mathbf n,
    \qquad
    \mathbf v_B^{\mathrm{new}}=\mathbf v_B+w_BJ\mathbf n.

These are the translational, frictionless circle-contact case of
`Catto's contact and restitution notes`_. The impulse is along the line
of centers and supplies no turning moment. We do not model spin.
Multiplying inverse mass by impulse gives a velocity change in m/s.
The equal and opposite impulses preserve the free pair's total momentum,
mass times velocity, in kg m/s. Motion perpendicular to the normal is not
changed by this frictionless collision.

As a controlled example **away from the floor**, take both masses 1 kg,
:math:`\mathbf n=(0.6,-0.8)`, :math:`\mathbf v_A=(0,-4)` m/s and
:math:`\mathbf v_B=(0,0)` m/s. Then :math:`u=-3.2` m/s and
:math:`J=2.64` N s. The resulting velocities are

.. math::

    \mathbf v_A^{\mathrm{new}}=(-1.584,-1.888)\ \mathrm{m/s},
    \qquad
    \mathbf v_B^{\mathrm{new}}=(1.584,-2.112)\ \mathrm{m/s}.

Their horizontal components have opposite signs; both vertical components
still point down. Total vertical momentum remains -4 kg m/s. Kinetic energy,
one-half mass times speed squared, falls from 8 J to 6.5216 J. The
relative **normal** motion loses energy; the entire pair's kinetic energy
is not simply multiplied by :math:`e^2`, because shared center motion and
motion perpendicular to the normal remain. A centered free collision instead
has :math:`\mathbf n=(0,-1)` and produces no horizontal velocity at all.

Floor, walls and simultaneous contacts
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

For a circle with center :math:`(x,y)` and radius :math:`R=0.20` m,
the floor at zero and walls at :math:`x=0` and :math:`x=W=4` m require

.. math::

    y-R\geq0,\qquad x-R\geq0,\qquad W-R-x\geq0.

Their inward normals are (0,1), (1,0) and (-1,0), respectively. The same
impulse rule with a fixed object's inverse mass zero reverses/reduces only
normal velocity. The demo uses restitution 0.65 for walls as well as ball
and floor impacts. There is no ceiling; permitted initial heights and the
passive energy losses keep these trials inside the displayed height.

When orange hits blue while blue touches the floor, two constraints share
one body's velocity. Correcting the pair can make blue move into the floor;
correcting the floor changes the pair's relative velocity. Repeated contact
passes resolve them together. Blue can move sideways or lift off when the
resulting impulse allows it. It is supported, not pinned or given infinite
mass. The fixed floor can exchange vertical momentum with the pair, so the
free-pair arithmetic above is **not** the complete answer for this shared
contact. Nor should we force the outgoing speeds to look symmetric.

The actual implementation first finds a non-approaching velocity by
accumulating nonnegative normal impulses. It then restores 0.65 of the
velocity change removed in that compression pass, and performs an inelastic
cleanup if this makes another touching contact approach. For an isolated
collision this is exactly the displayed restitution formula. For simultaneous
contacts it is a coupled, dissipative approximation: a local rebound ratio
need not equal 0.65 after the other contacts are resolved. There are at most
160 passes, with an explicit residual check; these passes do not advance time.
Changing the order is tested for agreement within numerical tolerance.

Supported contact has force as well as geometry. At zero normal velocity,
the code solves normal acceleration constraints to oppose gravity. One
stationary ball on the floor needs an upward 9.81 N reaction. A perfectly
centered resting stack needs the floor to carry both weights, 19.62 N.
Neither support rule prevents a subsequent collision from changing velocity.
For touching circles sliding past each other, the acceleration check also
includes the changing normal: normal relative acceleration plus tangential
relative speed squared divided by center distance must not close the gap.

Why the horizontal motion eventually stops
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

A frictionless floor would not stop a ball's sideways motion. Therefore this
extension adds an explicit, illustrative **floor sliding resistance**.
For a supported ball let :math:`v_x` be horizontal velocity in m/s and
:math:`a_f=0.8` m/s² the chosen deceleration magnitude. ``sign`` returns
1 for a positive value, -1 for a negative one and 0 at zero. Time
:math:`t` is in physical seconds; :math:`d/dt` measures change per second.
While sliding,
horizontal acceleration is

.. math::

    \frac{dv_x}{dt}=-a_f\,\mathrm{sign}(v_x).

The corresponding resisting force is mass times that acceleration, up to
0.8 N for a 1 kg ball. The code stops precisely when horizontal velocity
reaches zero; it does not reverse it through an oversized friction step.
At rest, resistance can oppose lateral pushes up to that same force limit.
This is a constant force-limit model, not a calibrated rolling law or a
full load-dependent Coulomb law. Airborne balls have no such resistance;
walls and pair contacts have no tangential friction.

Normal impacts at most 0.20 m/s use no restitution, preventing endless
microbounces. Shared contact uses the largest approaching normal speed in
that contact set for this cutoff. Normal support then balances gravity;
floor resistance removes remaining horizontal energy. See
`Box2D's low-speed restitution and friction discussion`_ for the rationale
of separating bounce, friction and supported contact. The values here are
our teaching choices. No invisible airborne damping or velocity reset is
used after a free release.

What the numerical update actually does
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

``two-balls/physics.mjs`` stores both positions, velocities, masses and held
state. A 1/120 s physical tick is divided into intervals no larger than
1/480 s. Free-flight position/velocity use constant-acceleration integration.
For each interval, the code finds the earliest pair/floor/wall contact time
or floor-friction stopping time, advances to it, resolves contacts and then
uses the remaining physical time. Pair contact is found from the distance
of the two computed trajectories, not from a prescribed split or a visual
overlap after a large step. A held or supported ball can have different
acceleration from the other one, which is included in that calculation.

Support accelerations are held constant over each small interval, so curved
sliding contact is approximate. Small position corrections share penetration
according to inverse masses; the solver stops below :math:`10^{-11}` m
penetration and treats gaps within :math:`10^{-9}` m as contact. A proposed
interval that increases mechanical energy beyond rounding tolerance is
retried with half its duration, not repaired by rescaling energy or adding a
kick. Persistent failure stops visibly. The tolerance is
:math:`10^{-10}` J times the larger of 1 and the previous energy's numeric
value in J. Energy here is kinetic energy plus gravitational potential
energy above each disk's floor-contact height. Hand repositioning is external
work and is not included in a claim of energy conservation.

Rendering is separate: wall-clock budget advances fixed ticks, with at most
0.1 wall seconds and 16 ticks processed per frame. Hidden tabs clear the
budget. Slow machines can slow playback without using giant physical steps.
The readout displays actual velocities, first pair-impact horizontal
velocities, wall/pair counts and current energy, not intended outcomes.

Tests cover free pair momentum, restitution and energy; an oblique example
and a centered example; wall confinement and reflection; supported-state
waking; centered stacks; contact-order agreement; continuous high-speed
crossings; and offset drops through actual settlement. The original one-ball
calculation is a separate unchanged example. This is a two-disk translational
model, not a general rigid-body engine or a claim about real billiard balls.

.. _`Baraff's rigid-body course notes`: https://www.cs.cmu.edu/~baraff/sigcourse/notesd2.pdf
.. _`Catto's contact and restitution notes`: https://box2d.org/files/ErinCatto_ModelingAndSolvingConstraints_GDC2009.pdf#page=39
.. _`Box2D's low-speed restitution and friction discussion`: https://box2d.org/documentation/md_simulation.html#restitution
