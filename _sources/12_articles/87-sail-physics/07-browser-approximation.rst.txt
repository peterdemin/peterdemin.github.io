Deriving the browser approximation
----------------------------------

The physical calculation developed in the cloth, airflow and coupling
chapters follows viscous air and moving cloth together. That is too expensive
for this small browser
demonstration.
Here we replace parts of it one at a time, explaining what each replacement
can and cannot show. The only controls remain incoming horizontal wind speed
and direction; the mast and boom do not move.

The implementation is in ``sail-wind-tunnel/physics.mjs`` and
``sail-wind-tunnel/main.mjs`` in this repository. Its constants below are
demonstration choices, not experimentally calibrated sail properties.

Step 1: Replace the sheet with points and links
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

A **node** is a point whose position the computer stores. A **link** joins two
nodes and resists a change of their separation. A **panel** is a small
four-sided piece of sail used for the air calculation. The mesh has 6 cells
across the width and 10 up the height: 77 nodes and 60 panels.

First describe the cloth before loading. Let :math:`a` be the fraction across
its width and :math:`b` the fraction up its height, both dimensionless numbers
from zero to one. These label cloth points, not air velocity or time.
Let :math:`c` be nominal width (m), :math:`c_{\text{cut}}` be actual cut width
(m), and :math:`\mathbf r_0` be the original position vector (m).
The subscript 0 means original, before deformation.
The sine function makes a smooth extra-width profile; its dimensionless
argument uses :math:`\pi\approx3.14159` and :math:`\sin^2` means squaring
the sine's value. The chosen geometry is

.. math::

    c(b)=(3.2-2.95b)\,\text{m},
    \qquad c_{\text{cut}}(b)
    =c(b)\left[1+0.0339\sin^2(\pi b)\right],

.. math::

    \mathbf r_0(a,b)
    =\left(c_{\text{cut}}(b)a,\ (0.6+4.4b)\,\text{m},\ 0\,\text{m}\right).

Thus the cloth is 4.4 m tall, begins 0.6 m above the ground, and narrows from
3.2 m at the foot to 0.25 m at the head. At mid-height, the nominal width
is 1.725 m and the cut width is about 1.7835 m: 3.39% extra cloth.
This extra width is **fullness**, not an initial out-of-plane bulge.
All original points lie in the same flat plane.

The luff and foot nodes are **pinned**: their positions cannot change.
The upper edge is not separately held. Every link initially has its
**rest length**, meaning its unloaded original length, so the starting
sheet has no prescribed bulge or link extension.

Each cell has its boundary links and one diagonal. These make two triangles
that can turn relative to one another along their shared diagonal, like a
hinge. Adding both diagonals can artificially lock the bending of a warped
four-sided cell. Weak links spanning two neighboring edges approximate
bending resistance. They are not the curvature-energy law in
:doc:`02b-cloth`,
and the network does not independently match measured warp, weft, shear,
or wrinkling behavior.

Assigning mass is a separate calculation. Use original mass per area
:math:`\mu_0=0.22` kg/m². For node :math:`i`, let :math:`m_i` be its mass
(kg). For panel :math:`p` touching that node, let :math:`A_{p,0}` be its
original area (m²). The sum sign adds contributions from just those panels:

.. math::

    m_i=\frac{\mu_0}{4}\sum_{p\text{ touching }i}A_{p,0}.

Each four-cornered panel gives one quarter of its mass to each corner.
Consequently all node masses sum to the whole cloth mass, about 1.698 kg.
Pinned nodes still count toward this total, even though the update never
moves them.

For these links, stiffness :math:`k` means force divided by extension,
in N/m.
The chosen stretching and diagonal links use :math:`k=10^7` N/m; the weak
bending links use 0.5 N/m. These values are not the sheet's continuum
coefficients, even though both kinds of coefficient happen to use N/m.

The perfectly flat no-wind start has no sideways disturbance. A three-second
implementation check gives only about 0.124 micrometres of mass-center drop:
the very stiff links support weight with tiny extension. This checks gravity
accounting, not realistic draping or spontaneous folding under gravity.

Step 2: Replace viscous air with a lifting-surface model
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Now freeze the current cloth shape during each air solve. Assume the sail is
infinitely thin, the air keeps constant density, viscosity is neglected,
and flow stays attached rather than peeling away from the surface.
Unlike the viscous flow in :doc:`03a-airflow`, air may slide
along the cloth. We keep only the condition
that its velocity through the surface is zero, and impose it at selected
points rather than everywhere.

A **vortex** describes circulation of air around a line or region.
To define **circulation**, imagine walking once around a closed loop and
adding velocity along the direction of every little step. Let
:math:`\mathbf u` be air velocity (m/s), :math:`d\boldsymbol\ell` a directed
tiny step around that loop (m), and :math:`\Gamma` the resulting circulation
(m²/s). The dot product takes velocity along the step; the closed-loop
integral adds all such contributions:

.. math::

    \Gamma=\oint\mathbf u\cdot d\boldsymbol\ell.

A **vortex lattice** replaces the lifting surface with a collection of
idealized vortex lines. Each panel receives a horseshoe-shaped line: one
segment across the sail and two trailing legs extending downstream.
The across-sail segment is called **bound** because it stays on the surface;
the trailing legs represent the disturbed air behind it, or **wake**.
Here the segment sits at one quarter of the panel's width and the point
where we enforce zero normal velocity sits at three quarters.
The downstream legs are 70 m long.

Index :math:`j` identifies a horseshoe. Its unknown strength
:math:`\Gamma_j` is circulation in m²/s. Let :math:`\mathbf v_j(\mathbf x)`
be its induced velocity *per circulation* at position :math:`\mathbf x` (m).
Thus :math:`\mathbf v_j` has units 1/m, and
:math:`\Gamma_j\mathbf v_j` has units m/s.
"Induced" means the change in velocity supplied by that modeled vortex.

Index :math:`i` identifies a control point :math:`\mathbf x_i` (m), where
:math:`\mathbf n_i` is the dimensionless unit normal.
Recall that :math:`\mathbf W` is incoming wind velocity (m/s).
The normal component of incoming plus induced velocity must vanish, giving

.. math::

    \sum_j\Gamma_j
    \left[\mathbf v_j(\mathbf x_i)\cdot\mathbf n_i\right]
    =-\mathbf W\cdot\mathbf n_i.

Both sides are in m/s. The right side is the incoming through-surface
velocity that the vortices must cancel. For this mesh there are 60 equations
and 60 strengths. At fixed geometry, the bracketed coefficients are known:
this is a **linear system**, a set of equations whose unknowns are only
multiplied by known coefficients and added together.

The circulation field and surface-flow condition follow the method described
in `Drela's JVL formulation`_, Sections 4.2 and 5.2–5.3.
Our sail demonstration is a much simpler implementation, not JVL itself.
The computer solves its coefficient table using elimination, choosing large
available coefficients as divisors to avoid dividing by nearly zero values.
That is what a **pivoted** solve means.

The induced field uses the **Biot–Savart** relation: an ideal vortex segment's
strength and geometry determine its velocity contribution. Section 4.2 and
Appendix 9.1 of `Drela's JVL formulation`_ give that relation and its
horseshoe evaluation. The demo softens the near-line velocity over a
0.035 m **core radius** to avoid an infinite value on the ideal line.
This is a numerical modification, not a resolved physical vortex core.

Straight trailing legs supply a conventional lifting-surface approximation
to smooth flow leaving the rear edge. This demo does not independently solve
the viscous trailing-edge behavior. It also does not let the wake curve up,
retain previously shed vortices, or resolve separation. Finite sail height
does allow three-dimensional induced velocity above the head, but that alone
does not establish real separated flow spilling over the top.

Step 3: Turn circulation into approximate forces
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

For one panel, let :math:`\mathbf F_v` be vortex-derived force (N),
:math:`\rho=1.225` kg/m³ the chosen air density, and :math:`\Gamma` that
panel's circulation (m²/s). Let :math:`\mathbf v_w` be velocity from all
trailing wake legs at the bound segment's midpoint (m/s), and
:math:`\Delta\boldsymbol\ell` the directed bound segment (m).
The delta here means a finite segment, not a derivative.

The cross product :math:`\times` produces a vector perpendicular to its
two input vectors. Its magnitude is the product of their lengths times the
sine of their angle, with direction fixed by the right-hand rule.
The demo applies a discrete Kutta–Joukowski force:

.. math::

    \mathbf F_v
    =\rho\Gamma(\mathbf W+\mathbf v_w)\times\Delta\boldsymbol\ell.

The vector force relation is described in `Drela's JVL formulation`_,
Section 6.1, equation (108). Using only wake-induced velocity in this evaluation
is a demo simplification; bound-segment contributions are omitted.
Its units give a useful check:

.. math::

    \frac{\text{kg}}{\text{m}^3}
    \frac{\text{m}^2}{\text{s}}
    \frac{\text{m}}{\text{s}}\text{m}
    =\frac{\text{kg m}}{\text{s}^2}=\text{N}.

For a teaching example, circulation 1 m²/s, perpendicular speed 6 m/s,
and segment length 0.20 m give force magnitude 1.47 N at this density.
This is an integrated load approximation, not the two viscous face
tractions from
:doc:`Loads change shape, and supports close the load path <04-forces-and-shape>`.

The demo adds a second, empirical force along the incoming wind.
Let :math:`\mathbf F_f` be that force (N), :math:`U` wind speed (m/s),
:math:`A` current panel area (m²), and :math:`\mathbf e=\mathbf W/U`
the dimensionless wind direction for nonzero speed.
Choose dimensionless coefficient :math:`C_f=0.008`. Then

.. math::

    \mathbf F_f=\frac12\rho U^2 A C_f\mathbf e.

This uses the force scaling of `NASA's drag equation`_.
The coefficient and the choice of current sail area are our assumptions,
not a measured cloth-friction law. No viscous stress is actually solved.
For :math:`U=6` m/s and :math:`A=0.10` m² this term is about 0.0176 N.
At zero wind speed the implementation applies zero wind load, rather than
dividing by zero to find a direction.

Each panel's combined load is shared equally among its four corners,
including pinned corners. This preserves total applied force; it does not
guarantee exact turning effect, or moment, about every possible point.

For coloring, let :math:`p_{\text{load}}` be the signed average normal-load
proxy (Pa) and :math:`\mathbf n` the panel's dimensionless unit normal.
The normal follows a consistent side of the material, not whichever way
the wind happens to blow:

.. math::

    p_{\text{load}}=\frac{\mathbf F_v\cdot\mathbf n}{A}.

This is normal force divided by area, not separately measured pressure on
both faces. Changing a coloring convention must never change the actual force.

Step 4: Alternate air solves and cloth updates
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

The cloth takes four steps of 1/240 s between air solves, giving a nominal
60 Hz refresh in simulated time. Hz means refreshes per second.
The new shape changes the next vortex lattice and hence the next load.
However, each air solve still treats the surface as stationary.
It omits acceleration of surrounding air by moving cloth, called added mass
in :doc:`Turning the coupled problem into a numerical calculation <05-coupled-numerics>`,
and changes in the wake's history.
This is **quasi-steady feedback**: a succession of frozen-shape flow solves,
not the converged moving-surface calculation.

Smoke dots are **passive tracers**, points moved by the computed velocity
without pushing back on it. Let :math:`\mathbf q` be one tracer's position
(m) and :math:`t` simulated time (s). Its derivative is its velocity.
Using the same horseshoes and strengths as above, the implemented rule is

.. math::

    \frac{d\mathbf q}{dt}
    =\mathbf W+\sum_j\Gamma_j\mathbf v_j(\mathbf q).

The midpoint update first estimates a half-step position, samples velocity
there, and uses that velocity for the full step. This is the second-order
Runge–Kutta method, commonly shortened to RK2; it improves on using only
velocity at the step's starting position for a sufficiently smooth field.
`MIT's numerical-modeling notes <https://fab.cba.mit.edu/classes/864.20/text/ode_diff.pdf#page=7>`_,
Section 7.1, equation (7.9), derive this midpoint rule.

A dot's recorded history is a **pathline**, the path one particle has taken.
A **streamline** instead follows velocity directions throughout one
instantaneous snapshot. They need not agree while the sail changes shape.
The plotted histories are pathlines. Smoke has no volume, buoyancy, diffusion,
or influence on air motion in this model. Zero through-surface velocity at
isolated control points does not guarantee the same between them: a tracer
crossing the coarse sail is not evidence of physical fabric permeability.

Calculation flaws and the useful range
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**Incidence** is the angle between incoming wind and the sail's nominal
surface direction. Modest forward incidence, roughly within ±20 degrees,
is the intended qualitative range, not an experimentally established limit
for attached flow. A bent panel may still have a much larger local angle.
The interactive demo withholds predictions outside its chosen forward range;
that means "unsupported," not a physical zero force.

A diagnostic can deliberately bypass this guard to inspect the raw method.
For a frozen manufactured cut at 6 m/s, changing direction from 89.9 to
90.1 degrees changed the largest foot-panel force from about 1239 N to 123 N.
The algorithm switches which edge it treats as the front when the wind's
boom-axis component changes sign. That changes bound-segment and control-point
locations, not merely colors. A small equation residual did not prevent a
large, physically unsupported result. Smoothing the jump would hide the
missing separation physics rather than supply it.

Other omitted effects include irregular turbulent air motion, vortices
formed by separated front-edge flow, blockage by the mast and boom,
the ground's influence on air motion, cloth touching itself or the rig,
and measured fabric behavior. Stable numbers and attractive smoke paths
do not validate these missing mechanisms.

.. _Drela's JVL formulation: https://web.mit.edu/drela/Public/web/jvl/jvl.pdf
.. _NASA's drag equation: https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/drag-equation/
