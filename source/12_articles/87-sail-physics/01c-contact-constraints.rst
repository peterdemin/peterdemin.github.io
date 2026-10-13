Keeping a rigid ball above the floor
-----------------------------------------

A rule for valid positions
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Gravity alone can move a body through a floor. Add a **constraint**: a
rule that the stored state must satisfy. A **constraint solver** finds
values satisfying that rule, instead of accepting an impossible overlap.

Consider one rigid circle in a vertical plane above a fixed horizontal
floor. **Rigid** means its shape and radius do not change. It does not
mean every collision preserves energy. Let :math:`x,y` be the circle's
center coordinates in metres, with upward-positive :math:`y` and the
floor at :math:`y=0`. Its radius :math:`R=0.20` m is constant.

The circle's bottom is :math:`y-R`. Call that signed gap :math:`d`, in
metres. Positive means separated, zero means touching, and negative means
penetrating. The sign :math:`\geq` means greater than or equal to.
The **nonpenetration constraint** is

.. math::

    d=y-R\geq0.

This is the simplest flat-floor version of the contact inequality in
`Erin Catto's constraint notes`_, sections on inequality and contact
constraints. The floor is fixed: only the ball is moved to satisfy it.
There is no need to distribute a correction between two movable bodies.

Suppose :math:`y_p` is a predicted center height. The subscript ``p``
means prediction, not an accepted state. ``max`` selects the larger of its
two arguments. Its position correction is

.. math::

    y_{\mathrm{valid}}=\max(R,y_p).

A prediction at 0.18 m with radius
0.20 m is corrected upward by 0.02 m. A prediction at 0.50 m stays there.
This operation is called **projection** onto valid positions. One correction
solves this single constraint exactly. With several interacting constraints,
correcting one can invalidate another; then repeated passes can be needed.
Those passes improve the same state and do not each advance time.

What happens to velocity at impact?
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Changing position alone does not explain a bounce. Let :math:`u` be the
vertical velocity immediately before impact, in m/s. An approaching ball
has :math:`u<0`. The floor's **normal** is its perpendicular direction,
upward here. Let :math:`v` be vertical velocity immediately after impact.

The **coefficient of restitution** :math:`e` is the ratio of outgoing to
incoming normal speed. Choose :math:`e=0.65`, between zero and one:

.. math::

    v=-e u.

The minus sign reverses direction; multiplication by :math:`e` reduces
speed. For :math:`u=-4` m/s, :math:`v=2.6` m/s. A ball already moving away
is not bounced again. The horizontal component is unchanged by this
frictionless floor. The contact and restitution rule is described in
`Catto's restitution notes`_; this example uses only its vertical case.

Let mass :math:`m=1` kg. **Momentum** is mass times velocity, in kg m/s.
**Impulse** :math:`J` is the collision's change of momentum, in N s,
equivalent to kg m/s. It is not a sustained force added every frame:

.. math::

    J=m(v-u)=-m(1+e)u.

The example gives an upward impulse of 6.6 N s. The idealized instantaneous
velocity change represents a short contact event without modeling the
force's detailed time history. `OpenStax's impulse explanation`_ distinguishes
this accumulated effect from a force in N.

For this vertical impact, incoming kinetic energy :math:`K_{\mathrm{in}}`
and outgoing kinetic energy :math:`K_{\mathrm{out}}`, both in joules (J),
are one-half mass times speed squared:

.. math::

    K_{\mathrm{in}}=\frac{1}{2}m u^2,
    \qquad K_{\mathrm{out}}=\frac{1}{2}m v^2=e^2K_{\mathrm{in}}.

Here :math:`e^2=0.4225`: 42.25% of vertical kinetic energy remains and
57.75% is lost. The 8 J incoming example leaves 3.38 J. The ideal rigid
picture never squashes, while its restitution law represents unresolved
energy loss during real contact. Perfect rigidity and perfect elasticity
are different assumptions.

Find contact before finishing the tick
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Let :math:`g=9.81` m/s² be a chosen constant near-surface downward gravity
magnitude. It is positive; vertical acceleration is :math:`-g`. Let
:math:`h` be the tick's duration in physical seconds and :math:`u` now the
starting vertical velocity. With starting height :math:`y`, free flight is

.. math::

    y_p=y+u h-\frac{1}{2}g h^2,
    \qquad v_p=u-g h.

These are the exact constant-acceleration relations from
`OpenStax's free-flight derivation`_, not a large Euler approximation.
Horizontal position advances by horizontal velocity times :math:`h`.
They also agree with RK4 for constant gravity, but require no trial slopes.

Clamping an end-of-tick prediction and reversing its end velocity can make
the bounce too energetic: the velocity may include gravity from time spent
below the floor. Instead calculate the **time of impact** :math:`\tau`,
the time from the start until the bottom first reaches the floor.
Using starting gap :math:`d=y-R`, solve

.. math::

    d+u\tau-\frac{1}{2}g\tau^2=0,
    \qquad \tau=\frac{u+\sqrt{u^2+2gd}}{g}.

For a separated ball this is the positive root. A touching ball with
downward or zero velocity has immediate contact; a touching ball moving
upward returns after :math:`2u/g`. The code uses an algebraically equivalent
root when downward motion and a tiny gap would make subtraction inaccurate.

If :math:`\tau>h`, accept ordinary free flight. Otherwise advance exactly
to :math:`\tau`, set height to :math:`R`, apply restitution to the impact
velocity :math:`u-g\tau`, then integrate the remaining :math:`h-\tau`
seconds. Apply the same rule again if another impact occurs in that remainder.
This is one tick containing contact events, not extra elapsed time per
correction. The final height is checked against the constraint.

For example, start at 2.20 m with zero velocity and radius 0.20 m. The gap
is 2 m. Contact occurs after :math:`\sqrt{4/9.81}=0.63855` s, at
approximately -6.2642 m/s. Restitution gives +4.0717 m/s. The next rise
above contact is :math:`v^2/(2g)=0.845` m: 0.4225 times the original
2 m drop. Detecting contact at the right time avoids increasing that height.

Rest is a supported state
~~~~~~~~~~~~~~~~~~~~~~~~~

Constant restitution would produce smaller and smaller bounces. To stop
the tiny ones explicitly, choose a cutoff :math:`c=0.20` m/s for incoming
impact speed. The bars in :math:`|u|` mean absolute value, or speed without
its sign. If :math:`|u|\leq c` at impact, accept :math:`y=R,v=0`
and mark the ball **resting**. At 1 kg the discarded incoming kinetic energy is at
most :math:`m c^2/2=0.02` J. This is a documented numerical resolution
choice, not an airborne damping force. Low-speed inelastic contact is
also used to avoid jitter in `Box2D's contact implementation`_.

While resting, the fixed floor's upward **reaction** balances weight:
:math:`m g=9.81` N. Position and velocity remain unchanged; gravity is not
allowed to push the ball down and then be corrected endlessly. A grabbed
ball instead has a prescribed position supplied by the hand, within the
valid domain. That input can add gravitational potential energy. Releasing
sets both velocity components to zero deliberately: no inferred throwing
speed, no extra impulse. A release at the floor starts resting immediately.

.. _`Erin Catto's constraint notes`: https://box2d.org/files/ErinCatto_ModelingAndSolvingConstraints_GDC2009.pdf#page=33
.. _`Catto's restitution notes`: https://box2d.org/files/ErinCatto_ModelingAndSolvingConstraints_GDC2009.pdf#page=39
.. _`OpenStax's impulse explanation`: https://openstax.org/books/university-physics-volume-1/pages/9-2-impulse-and-collisions
.. _`OpenStax's free-flight derivation`: https://openstax.org/books/university-physics-volume-1/pages/3-4-motion-with-constant-acceleration
.. _`Box2D's contact implementation`: https://box2d.org/documentation/md_simulation.html#restitution
