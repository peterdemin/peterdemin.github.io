Boxes can rotate
----------------------------------------

Another degree of freedom
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

The circles in :doc:`01e-two-balls` only translate: their centers move.
Now replace them with **rigid square cross-sections**. A square also has an
orientation, and an impact away from its center can change its rotation.
This is a two-dimensional side view, not a simulation of three-dimensional
cubes. Nothing deforms, and there are no scripted spins or sideways kicks.

Click or tap inside the scene to create one square above that horizontal
position. Its starting angle is random, but its linear and angular velocities
are **zero**. The square falls under gravity, then contacts can make it turn.
A dot near one corner makes rotation easier to see. New squares start at least
2.3 m above the floor, or higher if needed to avoid an occupied spawn space.
Near a wall, their horizontal centers move inward just enough to fit.
If no clear position exists above that spot, the request is visibly refused.
There is no box-count cap and no silent deletion; available space and device
performance are the practical limits. **Clear all boxes** starts over.
Focus the scene and press Space or Enter, or use **Drop in the
middle**, for keyboard access.

.. raw:: html

    <iframe
      src="../../_static/rotating-boxes/index.html?embedded=1&v=uncapped-1"
      title="Rigid square cross-sections fall, collide, rotate and form a pile"
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
            type: 'rotating-boxes-theme',
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
          if (event.data?.type === 'rotating-boxes-ready') sendTheme();
          if (event.data?.type === 'rotating-boxes-size' && Number.isFinite(event.data.height)) {
            frame.style.height = Math.max(200, Math.min(1600, event.data.height)) + 'px';
          }
        });
        const observer = new MutationObserver(sendTheme);
        observer.observe(document.documentElement, {attributes: true, attributeFilter: ['class', 'style']});
        window.addEventListener('pagehide', () => observer.disconnect(), {once: true});
      })();
    </script>

If the embed cannot start, `open the boxes on their own
<../../_static/rotating-boxes/index.html>`_. JavaScript and Canvas 2D are
required, not WebGL. Both classic scripts are local; opening the standalone
HTML from a file does not require fetching a module or a remote library.

Position, angle and inertia
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Let :math:`\mathbf p=(p_x,p_y)` be a square's center in metres, with positive
:math:`y` upward. Let :math:`\mathbf v=(v_x,v_y)` be its velocity in m/s.
The orientation :math:`\theta` is an angle in radians, positive
counterclockwise; angular velocity :math:`\omega` measures its change in rad/s.
The mass :math:`m` is 1 kg. The width :math:`a` and height :math:`b` are both
0.35 m. The **moment of inertia** :math:`I` measures resistance to angular
acceleration about the center, perpendicular to this plane. For a uniform
rectangle, applying the mass-integration method in
`OpenStax's moment-of-inertia examples`_ separately to the two coordinate
directions gives

.. math::

    I=\frac{m(a^2+b^2)}{12}
     =0.0204167\ \mathrm{kg\,m^2}.

The rectangle's four local corners are :math:`(\pm a/2,\pm b/2)`.
For a local corner :math:`(u_x,u_y)`, rotate and then translate to find its
world position :math:`(q_x,q_y)`:

.. math::

    q_x=p_x+u_x\cos\theta-u_y\sin\theta,
    \qquad q_y=p_y+u_x\sin\theta+u_y\cos\theta.

The renderer and collision geometry use the same orientation. There is no
circle proxy or axis-aligned bounding box pretending to be the square.
Axis-aligned bounds only help search for candidate pairs; contact uses the
oriented polygon faces.

Let :math:`\mathbf F` be total force in newtons and :math:`\tau` total torque
about the center in N m. A force acting at a displacement
:math:`\mathbf r=(r_x,r_y)` from the center has torque
:math:`\tau=r_xF_y-r_yF_x`. This signed scalar is the two-dimensional
version of a cross product. Our continuous equations are

.. math::

    \dot{\mathbf p}=\mathbf v,\qquad
    \dot{\mathbf v}=\mathbf F/m,\qquad
    \dot\theta=\omega,\qquad \dot\omega=\tau/I.

A dot means time derivative, not multiplication. Gravity acts through the
center: :math:`\mathbf F=(0,-m g)` with :math:`g=9.81\ \mathrm{m/s^2}`.
It therefore causes no torque here. Between contacts a newly spawned square
falls without turning, even though its initial orientation may be tilted.

Contact velocity is not center velocity
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Consider a touching point :math:`\mathbf q` on bodies A and B. Define the
lever arms :math:`\mathbf r_A=\mathbf q-\mathbf p_A` and
:math:`\mathbf r_B=\mathbf q-\mathbf p_B`, in metres. The velocity of a
point combines translation and rotation. For either body,

.. math::

    \mathbf v_{\mathrm{point}}=
      (v_x-\omega r_y,\ v_y+\omega r_x).

Let :math:`\mathbf n` be the unit normal from A toward B. Define their
relative normal contact velocity :math:`u_n` by taking the dot product of
the point-velocity difference with that normal:

.. math::

    u_n=(\mathbf v_{B,\mathrm{point}}-
         \mathbf v_{A,\mathrm{point}})\cdot\mathbf n.

Negative means approaching. A dot product multiplies matching components
and adds them. Define :math:`c_A=r_{Ax}n_y-r_{Ay}n_x` and similarly
:math:`c_B`; these are signed lever arms in metres. An impulse of magnitude
:math:`J_n` in N s acts along the normal on B and oppositely on A.
For one isolated approaching contact, the effective inverse mass
:math:`k_n` (in 1/kg) and restitution rule are

.. math::

    k_n=\frac1{m_A}+\frac1{m_B}+\frac{c_A^2}{I_A}+\frac{c_B^2}{I_B},
    \qquad J_n=-\frac{(1+e)u_n}{k_n}.

The dimensionless coefficient :math:`e` is 0.25 here; impacts below 1 m/s
use zero restitution to avoid tiny repeated rebounds. A fixed wall or floor
has zero inverse mass and inverse inertia. The impulse changes the states by

.. math::

    \Delta\mathbf v_A=-J_n\mathbf n/m_A,\quad
    \Delta\mathbf v_B= J_n\mathbf n/m_B,\quad
    \Delta\omega_A=-J_n c_A/I_A,\quad
    \Delta\omega_B= J_n c_B/I_B.

This is how a collision creates rotation. If the normal passes through the
center, its signed lever arm is zero and its normal impulse causes no spin.
See `Baraff's rigid-body notes`_ for the underlying impulse derivation.

A worked off-center impact
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Take a 1 kg square with the inertia above, downward center velocity 2 m/s,
and no spin, hitting a fixed floor at a point 0.10 m to the right of its
center. For this calculation only, omit tangential friction. Choose A as
the floor and B as the square, so :math:`\mathbf n=(0,1)` and
:math:`c_B=0.10\ \mathrm m`. Then :math:`u_n=-2\ \mathrm{m/s}` and

.. math::

    k_n=1+\frac{0.10^2}{0.0204167}
       \simeq1.48980\ \mathrm{kg^{-1}},\qquad
    J_n=\frac{2.5}{1.48980}\simeq1.67808\ \mathrm{N\,s}.

The outgoing center velocity is about -0.32192 m/s vertically, still
downward, while the angular velocity becomes +8.21918 rad/s. The contact
point's vertical velocity is :math:`-0.32192+0.10(8.21918)=0.50` m/s
upward, exactly the expected restitution speed :math:`e(2)`.
Do not apply the restitution rule to the center alone. Translational plus
rotational kinetic energy falls from 2 J to about 0.74144 J. The floor
supplies an external impulse, so this square's momentum alone is not
conserved. This isolated example is not a promise about a multi-contact pile.

Friction, a pile, and the actual solver
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

The demo uses `Planck 1.5.1`_, a locally vendored MIT-licensed Box2D-derived
engine. Contact generation uses separating face axes and clipped polygon
edges to create a **manifold**: up to two touching points for each pair.
The velocity constraints include the rotational terms above. Two face
contacts can balance torque rather than pretending all load acts at a
single corner. Several contacting squares must be solved together through
repeated sweeps, not independent one-shot collisions.

Let :math:`\mu=0.6` be the dimensionless friction coefficient and
:math:`J_t` the tangential impulse in N s. Coulomb friction bounds its
magnitude by :math:`|J_t|\leq\mu J_n`. Within this bound, the solver tries
to stop sliding contact; otherwise sliding remains. Tangential impulses can
also cause torque. This is contact friction, not airborne damping, and
the same material is used on boxes and container faces.

The model wrapper uses fixed **1/240 s** steps with **12 velocity iterations**
and **8 position iterations** per step. Gravity updates velocity before
position, a semi-implicit Euler scheme, not Runge--Kutta. Planck warm-starts
persistent contacts with previously computed impulses and uses its two-point
normal block solver where appropriate. Position correction reduces remaining
penetration separately; it is not an extra restitution impulse. All boxes
enable bullet continuous collision detection, including fast box-box pairs.
See `Planck's simulation documentation`_ and `the pinned solver source`_.

Numerical contact is not exact geometry. The library uses a 0.005 m linear
slop and 0.010 m polygon skin. Drawn faces can therefore show small gaps;
the engine tolerates small contact errors rather than chasing roundoff.
Tests allow up to 0.015 m negative manifold separation, not arbitrary overlap.
The outer container has a floor, two walls and a ceiling, all fixed.
Spawn checks use oriented polygon overlap with an extra 0.025 m local margin.
Each added body starts with new zero velocities, and existing bodies are
never relocated to make room.

A supported island can **sleep** after motion remains below the library's
thresholds (0.01 m/s and 2 degrees/s) for 0.5 s. Sleeping bodies retain mass
and inertia. An awake body hitting a supported pile wakes the contacting
island; sleep is a numerical rest approximation, not gluing boxes in place.
Gravity, friction, impact loss and contact impulses supply the behavior,
with no artificial global velocity damping or energy rescaling. Spawning
adds potential energy externally; energy need not decrease when you add a box.

At most 0.1 wall seconds and 24 physics steps are processed per animation
frame. Hidden tabs discard time budgets. A slow device can slow playback
instead of taking one large unstable step. Clear rebuilds the world.
The energy readout sums center kinetic energy, spin energy and gravitational
potential :math:`m g p_y` relative to the floor. Numerical integration and
position correction can introduce small energy errors; this is a stable
teaching approximation, not exact energy conservation or a full 3D model.

Focused tests exercise rectangular inertia, rotated vertices, actual polygon
contacts, centered versus off-center rotation, free-pair momentum and energy,
restitution, fast confinement, sleeping stacks and waking, overlap-free
spawning beyond 20 boxes, occupied-space refusal and bounded frame work.
The preceding one-ball and two-ball simulations remain separate examples.

.. _`OpenStax's moment-of-inertia examples`: https://openstax.org/books/university-physics-volume-1/pages/10-5-calculating-moments-of-inertia
.. _`Baraff's rigid-body notes`: https://www.cs.cmu.edu/~baraff/sigcourse/notesd2.pdf
.. _`Planck 1.5.1`: https://www.npmjs.com/package/planck/v/1.5.1
.. _`Planck's simulation documentation`: https://piqnt.com/planck.js/docs/world/simulation.html
.. _`the pinned solver source`: https://github.com/piqnt/planck.js/tree/54d2bdaef50fb72ea3421e6267014b3e51be0c23/src
