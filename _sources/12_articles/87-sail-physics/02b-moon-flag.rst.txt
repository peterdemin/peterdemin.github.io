Interactive example: Stretchy flag on the Moon
----------------------------------------------

Before adding air, let us try the mechanics in :doc:`02a-cloth`.
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
introduced in the cloth chapter, not just a change in their edge lengths.

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

The cloth chapter now includes the finite-strain energy used here. Each
triangle measures the lengths and angle of its material directions, rather
than substituting a diagonal spring for shear. Its energy includes both
directional extension, their coupling, and shear, multiplied by the
triangle's original area. The choices are extension stiffness 35 N/m,
coupling stiffness 3.5 N/m, and shear stiffness 0.35 N/m. These have the same
material meanings as the chapter's coefficients, with much softer extension.
They are illustrative, not measured flag properties.

Bending uses the chapter's discrete hinge energy: adjacent triangle normals
turn through an angle, weighted using original edge lengths and triangle
areas. Its chosen discrete rigidity is 0.2 N m. Flat uneven stretching no
longer creates false bending energy. The hinge law still has a directional
bias from the triangle grid; it is not a complete isotropic shell model.

The displayed **local stretch** is the largest fractional length increase
along either material direction in any triangle. A separate limiting rule
stops these lengths at approximately 1.55 times their original values, or
55% extension. It does not bound every possible diagonal direction.
Once the limit is reached,
pulling farther cannot keep extending it, although the cloth can still
change direction and shape.

Both the finite-strain material law and this inequality are now defined in
the cloth chapter. The inequality is an intentional teaching addition, not
an inherent maximum of the energy law. Neither the finite-strain extension
nor the cap is a measured prediction for real fabric at 55% stretch. Real
cloth may stiffen, lose energy, or tear instead.

What this experiment leaves out
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

The model uses small artificial damping, reducing velocity at a chosen rate
of 0.35 per second, to remove energy and make settling usable. This is not
air resistance in a lunar vacuum, and the settling time is not a measured
prediction for real cloth.

Tearing and contact with the ground or support
are not calculated. Cloth touching itself is not calculated either, so folds
may overlap or pass through each other. We deliberately leave that contact
problem out of this experiment.

The numerical update
~~~~~~~~~~~~~~~~~~~~

The computer retains each vertex's position and velocity, its mass from
reference triangle area, and the triangle/hinge connections. Its ordinary
physical tick is 1/120 s. Unlike the free satellite's RK4 integration, this
update uses **extended position-based dynamics**, XPBD: it predicts positions,
then adjusts them with compliant constraints derived from the cloth energies.
Compliant means allowing deformation according to energy cost instead of
demanding perfectly rigid geometry. Algorithm 1 in
`the XPBD paper <https://matthias-research.github.io/pages/publications/XPBD.pdf>`_
describes this prediction/correction pattern.

For one free vertex's vertical component, let :math:`y` be starting height
in metres, :math:`v` starting velocity in m/s, :math:`a=-1.62` m/s²,
and :math:`h=1/120` s the tick duration. Let :math:`\beta=0.35` per second
be the artificial damping rate. Subscript ``pred`` labels a temporary
prediction. The exponential :math:`\exp` supplies a positive reduction
factor from the dimensionless product :math:`-\beta h`:

.. math::

    v_{\mathrm{pred}}=\exp(-\beta h)(v+a h),
    \qquad y_{\mathrm{pred}}=y+h v_{\mathrm{pred}}.

Gravity first changes velocity, then damping reduces all velocity components
by the same factor, about 0.99709 per tick. This is neither lunar air
resistance nor calibrated material loss.

One **sweep** visits all of the tick's constraints without advancing time
again. The solver makes 12 sweeps of membrane-energy and hinge-energy
corrections plus directional extension limits. It can add up to 60
limit-only sweeps when needed. These are the triangle-strain and geometric
hinge laws in the cloth chapter, not independent diagonal springs. Pins and
the held corner have prescribed positions. Correction bookkeeping starts
at zero for each tick and accumulates only while solving that tick.

Let :math:`y_{\mathrm{new}}` be accepted corrected height and
:math:`v_{\mathrm{new}}` its reconstructed velocity. The code uses

.. math::

    v_{\mathrm{new}}=\frac{y_{\mathrm{new}}-y}{h}.

The same rule applies to all three components. Elastic effects already
included in the position correction are not added again as explicit forces.
If finite-value or extension checks fail, the code restores old positions,
halves old velocities, and does not advance physical time. The display
still consumes that attempted tick's budget. Rendering is separate from
physics; capped work can make slow devices lag wall-clock time.
Its paths are calculated from the current cloth state, gravity, and your
hand, not drawn from a preselected falling animation. This isolates the
cloth questions; :doc:`Airflow model <03a-airflow>`
introduces the air that the sail must interact with. The solver makes a finite
number of energy-derived corrections each step, not an exact minimization
or an energy-conserving calculation. Slow devices may advance simulated
time more slowly than wall-clock time.
