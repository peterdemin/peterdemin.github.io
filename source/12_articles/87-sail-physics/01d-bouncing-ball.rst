A rigid ball that drops, bounces and rests
----------------------------------------------

Lift and release
~~~~~~~~~~~~~~~~

Drag the outlined orange ball upward or sideways, then release it.
Mouse and touch work. The ball starts falling with zero velocity: dragging
is lifting, not throwing. Each bounce is lower until the ball rests on the
fixed floor. The circle stays perfectly round with a constant radius; its
dash-marked grab guide is not deformation. The view never rotates or zooms.

For keyboard input, focus the scene. Space grabs or releases, the arrow keys
move the held ball, and Escape releases it. There is no reset button: lifting
the ball again begins another drop.

.. raw:: html

    <iframe
      src="../../_static/bouncing-ball/index.html?embedded=1"
      title="Drag and release a rigid ball above a fixed floor"
      width="100%" height="740"
      style="display:block;width:100%;height:740px;border:0;"
      loading="lazy">
    </iframe>
    <script>
      (() => {
        const frame = document.currentScript.previousElementSibling;
        const sendTheme = () => {
          const root = document.documentElement;
          const theme = getComputedStyle(root);
          frame.contentWindow.postMessage({
            type: 'bouncing-ball-theme',
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
          if (event.data?.type === 'bouncing-ball-ready') sendTheme();
          if (event.data?.type === 'bouncing-ball-size' && Number.isFinite(event.data.height)) {
            frame.style.height = Math.max(200, Math.min(1600, event.data.height)) + 'px';
          }
        });
        const observer = new MutationObserver(sendTheme);
        observer.observe(document.documentElement, {attributes: true, attributeFilter: ['class', 'style']});
        window.addEventListener('pagehide', () => observer.disconnect(), {once: true});
      })();
    </script>

If the embed cannot start, `open the ball on its own
<../../_static/bouncing-ball/index.html>`_. JavaScript and Canvas 2D are
required, not WebGL. The classic script bundle has no network dependencies.

The chosen physical model
~~~~~~~~~~~~~~~~~~~~~~~~~~

This is the one-circle, one-floor calculation from :doc:`01c-contact-constraints`.
The center coordinates :math:`x,y` are in metres, with upward-positive
:math:`y` and floor height zero. The circular cross-section has constant
radius :math:`R=0.20` m and mass :math:`m=1` kg. The visible distance scale
matches those numbers, with metre marks along the floor; it is not a tiny
physical ball enlarged for drawing.

Downward gravity magnitude is :math:`g=9.81` m/s², an illustrative
constant near Earth's surface, rather than the satellite's distance-varying
field. `NASA's near-surface gravity explanation`_ discusses this approximate
value. No air resistance or other airborne damping is applied. The rigid
floor does not move. The collision restitution is :math:`e=0.65`, so an
ordinary bounce retains :math:`e^2=0.4225` of vertical kinetic energy.
This is chosen behavior, not a measurement of a particular ball material.

While grabbed, center position is prescribed by mouse, touch or keyboard,
clamped to :math:`0.20\leq x\leq3.80` m and
:math:`0.20\leq y\leq2.80` m in a 4 by 3 m view. The hand can supply
energy by lifting. The code stores zero velocity while held and on release;
horizontal position therefore stays fixed during the drop. There is no
inferred fling, side-wall collision, rolling or spin. The sphere/circle is
rigid, but its collisions are deliberately not perfectly elastic.

Exactly what advances each tick
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

``bouncing-ball/physics.mjs`` stores center position, velocity, physical
time and a flag identifying held, flying or resting state. A fixed tick is
**1/120 s**. Free flight uses the exact constant-acceleration update from
the constraint chapter, which agrees with RK4 for this constant force.
The floor constraint is checked by computing the continuous time of impact,
not by allowing the ball to pass through and bouncing it later.

When contact falls inside a tick, the code advances to that event, sets
center height to :math:`R`, and changes vertical velocity using restitution.
It then integrates the tick's remaining physical time, handling another
contact if necessary. The position projection enforces nonpenetration;
the velocity impulse supplies the rebound. They are different operations.
No extra time is added for either correction, and no deformation is drawn.

For incoming impact speed at or below **0.20 m/s**, the ball instead accepts
zero velocity and enters resting contact. At most 0.02 J of incoming kinetic
energy is discarded by this cutoff. The floor's upward reaction then balances
weight, 9.81 N, so subsequent ticks leave the resting ball fixed. No perpetual
microbounces and no repeated gravity/penetration repair are needed.

The readout uses vertical velocity :math:`v_y` in m/s and energy
:math:`E` in joules relative to resting contact. For this zero-horizontal-
velocity drop, kinetic energy is one-half mass times vertical speed squared.
Gravitational potential energy is mass times gravity magnitude times height
above contact. Their sum is the measured mechanical energy:

.. math::

    E=\frac{1}{2}m v_y^2+m g(y-R).

These two energy terms are defined in
`OpenStax's mechanical-energy discussion`_. It stays constant during free
flight up to rounding error and decreases at impacts, not gradually in the
air. The contact readout shows actual incoming/outgoing velocities, upward
impulse in N s and cumulative collision energy loss since the latest grab.
That last total excludes energy supplied or removed by the hand.

Frames and checks
~~~~~~~~~~~~~~~~~

The playback budget is wall-clock time with no acceleration multiplier.
Several 1/120 s physical ticks may precede one rendered frame. At most
0.1 elapsed seconds and 16 ticks are processed per frame; excess whole-tick
budget is discarded. Hidden tabs clear the budget and previous-frame time.
Slow frames can slow playback but do not cause giant integration steps.

The tests in ``bouncing-ball/checks.mjs`` compare free fall with its exact
position and velocity, test projection and impact timing, and check the
restitution impulse and energy fraction. They follow drops from several
heights through actual settlement, with no penetration or energy increase,
including ticks much larger than the displayed fixed step. Frame-rate tests
separate ticking from drawing. Grab/release tests check valid prescribed
positions, zero release velocity and floor releases that start resting.

This is one ideal circle and a frictionless horizontal floor, not a general
stack of rigid bodies or a material deformation model. The small-speed stop
rule is explicit. The demonstration combines gravity, contact geometry and
collision loss without hiding additional forces behind the illustration.

.. _`NASA's near-surface gravity explanation`: https://cdaweb.gsfc.nasa.gov/pub/documents/archived_websites/pwg.gsfc.nasa.gov/stargaze/Lgravity.htm
.. _`OpenStax's mechanical-energy discussion`: https://openstax.org/books/university-physics-volume-1/pages/8-3-conservation-of-energy
