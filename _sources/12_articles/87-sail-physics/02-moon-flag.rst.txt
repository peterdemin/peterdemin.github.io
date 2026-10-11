Interactive example: Stretchy flag on the Moon
----------------------------------------------

Before adding air, let us try the cloth mechanics from Chapter 1.
This experiment has a soft, stretchy flag, a fixed vertical support, and
gravity. There is no wind, no air drag, and no horizontal rod supporting
the top edge.

The **fixed** left edge cannot move. The rest of the cloth is **free** to
move unless our temporary hand holds its top-right corner. Reset puts that
hand back so the flag is ready to grab. Releasing it removes the hand's
support; it does not turn off gravity or detach the left edge.

We use lunar gravitational acceleration of 1.62 m/s², from
`NASA's Moon Fact Sheet <https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html>`_.
This means gravity changes downward velocity by 1.62 m/s each second when
no other force opposes it. It is weaker than Earth's gravity, not zero.

Try the flag
~~~~~~~~~~~~

Grab the glowing corner, pull it away from the support, and let go.
Pull up or down as well as sideways. The camera stays in front; the lighting
changes across the surface as the cloth bends, not because the camera moves.
Use **Reset flag** to begin again, or **Let go** to release the held corner.
Touch works too. For keyboard control, focus the corner: Space grabs or
releases it, arrow keys pull, and Escape lets go.

.. raw:: html

    <iframe
      src="../../_static/moon-flag/index.html?embedded=1"
      title="Interactive stretchy lunar flag: grab the top-right corner, pull, and release"
      width="100%" height="580"
      style="display:block;width:100%;height:580px;border:0;"
      loading="lazy">
    </iframe>
    <script>
      (() => {
        const frame = document.currentScript.previousElementSibling;
        const sendTheme = () => {
          const root = document.documentElement;
          const theme = getComputedStyle(root);
          frame.contentWindow.postMessage({
            type: 'moon-flag-theme',
            background: theme.getPropertyValue('--sy-c-background').trim(),
            text: theme.getPropertyValue('--sy-c-text').trim(),
            border: theme.getPropertyValue('--sy-c-heading').trim(),
            'button-hover': theme.getPropertyValue('--sy-c-foot-background').trim(),
            font: getComputedStyle(document.body).fontFamily,
            dark: root.classList.contains('dark')
          }, '*');
        };
        frame.addEventListener('load', sendTheme);
        window.addEventListener('message', event => {
          if (event.source === frame.contentWindow && event.data?.type === 'moon-flag-ready') sendTheme();
        });
        const observer = new MutationObserver(sendTheme);
        observer.observe(document.documentElement, {attributes: true, attributeFilter: ['class', 'style']});
        window.addEventListener('pagehide', () => observer.disconnect(), {once: true});
      })();
    </script>

If the embedded view does not load, `open the flag experiment on its own
<../../_static/moon-flag/index.html>`_. JavaScript and WebGL, the browser's
three-dimensional graphics system, are required.

What to look for
~~~~~~~~~~~~~~~~

**Stretch.** Pull outward and watch the small grid squares lengthen.
The cloth is deliberately much more compliant, meaning easier to deform,
than the sail demonstration's nearly unstretchable links. Which part stretches
most: near your hand, near the support, or across the middle?

**Shear.** Pull the corner upward or downward. Squares can become slanted
four-sided shapes: their thread directions change angle. That is the shear
introduced in Chapter 1, not just a change in their edge lengths.

**Bending.** Watch the smooth changes of surface direction and the highlights
across them. Bending can change the shape without requiring the same amount
of extension everywhere. Here neighboring patches resist abruptly different
turns, so the flag drapes rather than forming a prescribed sharp crease.

**Gravity and support.** Release the corner after a substantial pull.
The free cloth falls, swings, and drapes downward while the left edge stays
fixed. Immediately after release, stored elastic energy can first pull it
back or even briefly upward. Gravity still acts throughout that recoil.
The final flag is not in free fall: the support continues to carry its weight.

A soft material and an intentional limit
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

The moving points are connected by elastic links. The choices here are
35 N/m for length-change links, 0.35 N/m for diagonal links that resist shear,
and 2 N/m for the neighboring-bend smoothing rule. These are numerical-link
parameters, not the continuum sheet coefficients from Chapter 1 and not
measured properties of a real flag. Low shear and bending resistance let
the cloth drape instead of holding it out like a stiff plate.

The displayed **local stretch** is the largest fractional length increase
among these links. A separate limiting rule stops any link at approximately
1.55 times its original length, or 55% extension. Once the limit is reached,
pulling farther cannot keep extending it, although the cloth can still
change direction and shape.

This limit is an intentionally **nonlinear** addition: resistance does not
continue with the same linear rule at every extension. Chapter 1's linear
energy alone has no maximum extension. The cap makes the teaching experiment
usable; it does not mean that real fabric becomes unbreakable instead of
tearing.

What this experiment leaves out
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

The model uses small artificial damping, reducing velocity at a chosen rate
of 0.35 per second, to remove energy and make settling usable. This is not
air resistance in a lunar vacuum, and the settling time is not a measured
prediction for real cloth.

The bend-smoothing rule also resists some uneven stretching; it is not a
complete fabric bending law. Tearing and contact with the ground or support
are not calculated. Cloth touching itself is not calculated either, so folds
may overlap or pass through each other. We deliberately leave that contact
problem out of this experiment.

The computer updates positions using the compliant constraints described in
`the XPBD paper <https://matthias-research.github.io/pages/publications/XPBD.pdf>`_.
Its paths are calculated from the current cloth state, gravity, and your
hand, not drawn from a preselected falling animation. This isolates the
cloth questions; Chapter 3 introduces the air that the sail must interact
with.
