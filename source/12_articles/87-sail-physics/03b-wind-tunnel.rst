A wing in a viscous wind tunnel
--------------------------------

Try the tunnel
~~~~~~~~~~~~~~

Change the **wing angle**, then watch markers carried around its section.
Positive angle raises the leading edge, facing the fixed left-to-right inlet.
Changing the angle restarts the flow; it does not simulate a moving wing
sweeping through the air. **Reset flow** repeats that start at the current
angle. **Pause** freezes the fluid and trails; **Resume** continues them.

The fixed side view shows one wing section and one field of tracer trails,
with the full tunnel visible and inlet flow directed from left to right.
The two trail colors distinguish inlet height, not speed or pressure.
These are calculated parcel paths, not pre-drawn curves.

**Pressure colors** show the computed pressure relative to the outlet:
blue is negative, neutral is zero and orange is positive. **Pressure force
and components** shows one yellow resultant, pink pressure drag along the
inlet flow and green pressure lift perpendicular to it. **Surface pressure
arrows** optionally shows local signed pressure contributions and the
stair-step boundary used for their sum. Turn overlays off to inspect trails.
The legend gives Pa and pressure-only force per unit span in N/m; viscous
shear is omitted from these arrows. All arrow lengths and the color range
auto-scale, so compare numeric values rather than sizes between times.

.. raw:: html

    <iframe
      src="../../_static/wind-tunnel/index.html?embedded=1"
      title="Interactive wing wind tunnel with adjustable angle and a fixed 2D side view"
      width="100%" height="600"
      style="display:block;width:100%;height:600px;border:0;"
      loading="lazy">
    </iframe>
    <script>
      (() => {
        const frame = document.currentScript.previousElementSibling;
        const sendTheme = () => {
          const root = document.documentElement;
          const theme = getComputedStyle(root);
          frame.contentWindow.postMessage({
            type: 'wind-tunnel-theme',
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
          if (event.source !== frame.contentWindow) return;
          if (event.data?.type === 'wind-tunnel-ready') sendTheme();
          if (event.data?.type === 'wind-tunnel-size' && Number.isFinite(event.data.height)) {
            frame.style.height = Math.max(200, Math.min(1000, event.data.height)) + 'px';
          }
        });
        const observer = new MutationObserver(sendTheme);
        observer.observe(document.documentElement, {attributes: true, attributeFilter: ['class', 'style']});
        window.addEventListener('pagehide', () => observer.disconnect(), {once: true});
      })();
    </script>

If the embed cannot start, `open the tunnel on its own
<../../_static/wind-tunnel/index.html>`_. JavaScript and WebGL are required.
The classic script bundle also avoids module-import restrictions in local
``file://`` previews; it does not weaken browser security.

What is really calculated?
~~~~~~~~~~~~~~~~~~~~~~~~~~

This is **two-dimensional incompressible viscous flow**, solved by the
pressure-projection method from :doc:`03a-airflow`.
It is not a vortex-lattice solver, not a particle-force solver, and not a
prescribed animation. Each face velocity changes through transported
momentum, viscous diffusion and a pressure solve.

The view and the calculated flow are both two-dimensional. A single smooth
wing section and its tracer field are shown without repeated depth planes.
There is no spanwise flow, tip vortex, induced drag or finite-span effect.

The fluid is deliberately more viscous than air, so we can explore a
resolved-looking laminar obstruction without pretending to simulate a
real high-speed airplane. The domain is 6 m long and 3 m high; the inlet
speed is 1 m/s. The wing's chord, the leading-to-trailing-edge distance,
is 1.5 m. Its symmetric thickness is approximately 18% of chord.
Density is 1.225 kg/m³, but kinematic viscosity is **0.015 m²/s**, about
a thousand times the illustrative air value in the theory chapter.

For a speed :math:`U`, chord :math:`c_w` and kinematic viscosity
:math:`\nu`, the **Reynolds number** compares momentum transport with
viscous diffusion:

.. math::

    \mathrm{Re}=\frac{U c_w}{\nu}
    =\frac{1\times1.5}{0.015}=100.

All three units cancel. This is a low-Reynolds-number model fluid, not a
matching real-air experiment. Pressure is relative to the outlet reference;
the model subtracts hydrostatic pressure and does not apply gravity to the
flow. The angle range is -45° to +45° for exploration, not a stall threshold.
The larger angles do not make this coarse model a validated separation,
recirculation or stall calculation. Pressure lift and drag describe only
this numerical model, not full viscous loading or real-wing performance.

From the laws to stored numbers
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Write :math:`\mathbf u=(u,v,0)` for the velocity: :math:`u` is the
horizontal component and :math:`v` the vertical component, both in m/s.
Nothing depends on span coordinate :math:`z`. With the pressure and
viscosity already defined in the previous chapter, the actual equations are

.. math::

    \frac{\partial u}{\partial x}+\frac{\partial v}{\partial y}=0,
    \qquad
    \frac{\partial\mathbf u}{\partial t}
    =-(u\partial_x+v\partial_y)\mathbf u
      -\frac{1}{\rho}\nabla p+\nu\nabla^2\mathbf u.

Here :math:`\partial_x,\partial_y` mean differentiation with respect to
the two coordinates. The gradient and Laplacian use only these coordinates.
This is the previous chapter's Navier--Stokes law with its span derivatives,
span velocity and hydrostatic load removed, not a different flow law.

The actual browser grid has **96 by 48 cells**, with spacing 0.0625 m.
Pressure lives at cell centers; :math:`u` lives at vertical faces and
:math:`v` at horizontal faces. A cell whose center falls inside the rotated
wing profile is solid. The visible wing smoothly renders the underlying
section, while the solver still approximates it with a stair-step cell mask.
Smoother drawing does not improve the fluid boundary or its accuracy.
Its thickness spans only about four cells, an important geometric error.

The section uses the standard NACA four-digit symmetric thickness family,
with a closed trailing edge. For a chord fraction :math:`\xi` between
zero and one, its half-thickness :math:`b` in metres is

.. math::

    b(\xi)=5(0.18)c_w[
      0.2969\sqrt{\xi}-0.126\xi-0.3516\xi^2
      +0.2843\xi^3-0.1036\xi^4].

The usual finite trailing-edge coefficient is 0.1015; 0.1036 closes the
profile because the bracket then vanishes at :math:`\xi=1`.
This geometric convention modifies the standard thickness law in
`NASA's airfoil report`_; it is not a calibrated aerodynamic result.

The predictor is exactly the first-order explicit upwind transport and
centered viscous difference described in the theory chapter. To evaluate
transport of one velocity component by the other, the other component is
averaged from the four surrounding staggered faces. There is no added
vorticity force, noise or particle attraction. First-order upwinding also
introduces numerical diffusion, beyond the chosen physical viscosity.

Boundary conditions and pressure
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

- At the left inlet, horizontal speed is prescribed as 1 m/s and vertical
  speed as zero. The inlet is not an accelerating fan model.
- At the top and bottom, normal velocity is zero and the tangential
  derivative is zero: **slip tunnel walls**, not no-slip real walls.
- At the right outlet, the predictor copies the adjacent face velocity
  (zero normal derivative). Pressure is zero at the outlet face; projection
  may adjust outgoing velocity. Vertical predictor values have zero normal
  derivative there. This simple open boundary is unsuitable for major
  recirculation entering from outside the domain.
- At the stair-step wing, every face adjoining a solid cell has exactly
  zero normal flow. The viscous stencil uses reflected tangential ghost
  values across the mask, so their midpoint velocity is zero. This is an
  approximate no-slip treatment of the voxelized wing, not a resolved smooth
  curved-surface boundary layer. Normal-component wall samples are zero.

The predictor's transport stencil uses the blocked face's zero value;
the tangential reflection is used specifically for viscous differences.
These choices are part of the method, not hidden corrections to trails.

For cell indices :math:`i,j`, meaning column and row, the measured volume
imbalance :math:`d_{i,j}` in 1/s is

.. math::

    d_{i,j}=\frac{u_{i+1,j}-u_{i,j}+v_{i,j+1}-v_{i,j}}{h}.

Multiply the pressure Poisson equation by :math:`-h^2`. Its matrix has
a negative entry -1 for each neighboring fluid cell, and a diagonal equal
to the number of such neighbors. The right-hand side is
:math:`-\rho h^2d_{i,j}/\Delta t`. Faces with prescribed normal velocity
contribute no unknown pressure difference. The outlet is half a cell from
the last pressure center, so its zero-pressure boundary adds **2** to that
cell's diagonal and uses the matching factor **2** in the outlet velocity
correction. Thus the pressure matrix and the velocity correction use the
same divergence and gradient. This consistency is essential.

The code solves this sparse symmetric positive system with **conjugate
gradients**, an iterative linear-system method, using diagonal scaling as
a preconditioner. It stops when the maximum residual corresponds to at
most :math:`10^{-5}` 1/s remaining divergence, or after 800 iterations.
An accepted step must have maximum cell divergence below
:math:`2\times10^{-5}` 1/s; failure stops the experiment visibly, rather
than silently showing unconserved flow. No blocked-face velocity is changed
after projection. The displayed volume-balance error is this actual maximum
cell divergence, not a cosmetic quality score.

The step is at most 0.012 s. If :math:`M_u,M_v` denote maximum absolute
face speeds in m/s, it is reduced so that

.. math::

    \Delta t\left[\frac{M_u+M_v}{h}+\frac{4\nu}{h^2}\right]\leq0.65.

This guards the explicit transport/diffusion update. It is not proof of
accuracy. Each reset projects an initially uniform but obstructed field
before time advances. Slow devices may advance simulated time more slowly
than wall time, which is why the display labels **simulated seconds**.

Pressure colors and pressure-only forces
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

The pressure overlay reads the same cell-center pressures used by projection,
not a Bernoulli estimate from marker speeds. Each fluid cell receives its
own color; solid cells are not colored. The symmetric color range extends
from minus to plus the largest absolute fluid-cell pressure, with a tiny
floor of :math:`10^{-9}` Pa for an all-zero field. Its auto range is shown
in Pa. Negative relative values are not negative absolute air pressure.

The force sum follows the final section of :doc:`03-airflow`.
Enumerate every face separating a solid wing cell from a fluid cell, once.
There are no contributions from solid/solid faces or the outer tunnel walls.
Each face has length :math:`h` and an outward solid-to-fluid normal equal
to one of the coordinate unit directions. Use the adjacent fluid-cell
pressure as the face pressure, and add minus pressure times normal times
:math:`h`. This is a first-order wall-pressure sampling approximation, not
a resolved surface-pressure measurement. The sum includes all sides of
the closed stair-step section, not just upper and lower surfaces.

Small optional surface arrows start at those numerical face centers. Their
blue/orange colors use the pressure legend, and a thin outline shows the
integration boundary. Positive pressure contributes inward; negative gauge
pressure contributes outward relative to the reference. A uniform pressure
offset cancels from the summed force because the closed mask has balanced
outward normals. It does not cancel from local arrows or colors.

One yellow resultant starts at the wing center as a display convention,
**not a computed center of pressure**. Pink and green arrows show its signed
rightward pressure-drag and upward pressure-lift components, using the same
scale. These components are projections of one vector, not extra forces.
All force readouts are N/m of span; no finite-wing span is assumed.
Neither viscous surface stress nor a pitching moment is integrated.
The fixed wing does not respond to this diagnostic force.

The resultant arrow is auto-scaled to 1 m of drawing length when its
magnitude exceeds :math:`10^{-8}` N/m, otherwise hidden; the components use
that same multiplier. Surface contributions separately auto-scale the
largest arrow to at most 0.22 m. The legend gives both multipliers as drawing
metres per N/m. Pressure range and arrow lengths are display guides, not
comparable physical magnitudes across time; the numeric values remain
unscaled. Reset's initial pressure projection is a start-up transient, not
a steady force measurement. Smooth wing shading is only a geometric guide;
the pressure colors and local arrows refer to the coarse numerical grid.

Markers, not a second airflow model
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Markers use the previous chapter's bilinear velocity interpolation and
midpoint tracer update. Their old/new velocity samples come from the actual
pre-step and post-projection fields. They are displayed in a single plane in the fixed side view.

Each marker keeps up to 90 recent calculated positions. If its short motion
segment enters a blocked cell, it is retired and restarted at the inlet,
not reflected, pushed off the wing, or steered onto a chosen curve. The code
checks four points along that sub-cell segment. This is a visualization
safeguard for imperfect interpolation, not physical particle collision or
a claim that interpolation itself obeys the impermeability equation.
Exiting markers also restart; markers initially seeded across the tunnel
have no artificial history. They never alter velocity or pressure.

What to trust, and what not to infer
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Try opposite angles. The symmetric section and equations give reflected
flow: corresponding horizontal velocities agree and vertical velocities
reverse sign. This is tested numerically, not imposed on the pictures.
Watch how parcels deflect, slow near the obstruction and develop histories
through the evolving downstream flow. Pausing lets you inspect those histories in the fixed side view.

Tests check analytic transport and viscous updates, unobstructed uniform
flow, pressure-matrix symmetry, projection residuals, total inlet/outlet
flux, exact blocked-face non-penetration, angle reflection, finite evolution,
and tracer integration against known constant and rotating fields.
Three grid sizes are compared at the same simulated time; their differing deflections expose resolution
sensitivity, not a certified mesh-converged result.

What about separation? At six simulated seconds on this grid, tests at
0° and the default 8° find no horizontal fluid-face speed below -0.005 m/s
downstream of the wing's center (horizontal position above 2.4 m).
At 15°, two such faces are weakly reversed, with minimum speed
about -0.0071 m/s. This is evidence of a **small local reversal in this
numerical model**, not evidence of an accurately resolved detached wing
boundary layer. The test does not establish an unsteady shedding frequency
or turbulent wake. Absence of this particular reversal test is not proof
that a physical wing would remain attached. See the theory chapter's
separation/turbulence distinction before interpreting the trails.

This coarse solver does not resolve real airplane boundary layers or
turbulence. Any visible wake or recirculation belongs to this particular
low-Reynolds-number, numerically diffusive, stair-step model. It is not a
validated separation or stall prediction. No claim about real-wing lift, drag or
flight safety follows from the picture. The next chapter,
:doc:`Loads change shape, and supports close the load path <04-forces-and-shape>`,
returns to how fluid stresses load flexible cloth.

The projection construction follows `Chorin's original paper`_ and
`Bridson and Müller-Fischer's grid notes`_. The specific differences,
boundary approximations and tolerances above describe this implementation,
not promises made by those sources.

.. _`NASA's airfoil report`: https://ntrs.nasa.gov/api/citations/19770017113/downloads/19770017113.pdf
.. _`Chorin's original paper`: https://math.berkeley.edu/~chorin/chorin68.pdf
.. _`Bridson and Müller-Fischer's grid notes`: https://www.cs.ubc.ca/~rbridson/fluidsimulation/fluids_notes.pdf
