Airflow model
-------------

What are we calculating?
~~~~~~~~~~~~~~~~~~~~~~~~

Given the incoming wind and a fixed rigid wing, we want the air's velocity
and pressure around its section. The velocity beside the wing is not simply
the incoming wind everywhere: the surface redirects the flow.

This chapter develops **incompressible viscous Navier--Stokes flow**:
air keeps approximately constant density, while friction between neighboring
layers affects its motion. We then show one numerical way to solve it.
The next experiment, :doc:`03b-wind-tunnel`,
runs a two-dimensional version of this grid projection method, with a fixed
side view, deliberately increased viscosity and an approximate wing boundary.

.. note::

   Is this different from hydrodynamics? **Fluid dynamics** covers both
   gases and liquids. **Hydrodynamics** often names liquid-flow problems,
   though it is also used more broadly; **aerodynamics** names gas-flow
   applications. These are not competing equations. Navier--Stokes can
   describe either, with the appropriate material properties and boundaries.
   **Viscous** means internal friction is included, not that the fluid must
   be liquid or thick syrup; see `NASA's Navier--Stokes explanation`_.
   **Incompressible** means we treat density as constant, here uniformly
   constant. Air is generally compressible, but slow airflows can often
   use this approximation, as `NASA explains for low-speed air`_.

How slow is low-speed air?
~~~~~~~~~~~~~~~~~~~~~~~~~~

Here **low speed** means slow compared with sound, not slow compared with
a person. Let :math:`V` be the local flow speed and :math:`a` the speed
of sound, both in m/s. Their ratio is the **Mach number**, a number without
units:

.. math::

    M=\frac{V}{a}.

This is `NASA's Mach-number definition`_. Near 20°C, sound travels at about
343 m/s in air; see `OpenStax's sound-speed example`_. Therefore:

- **15 m/s**, or 54 km/h, gives :math:`M=15/343\approx0.044`.
- **30 m/s**, or 108 km/h, gives :math:`M=30/343\approx0.087`.

Both are well below the common **Mach 0.3** guideline for neglecting
compressibility, used for example in `NASA's low-speed wind-tunnel work`_.
At this temperature, Mach 0.3 corresponds to about
:math:`0.3\times343=103` m/s. It is a guideline, not a sharp cutoff.
Constant-density flow is typically appropriate at 15 or 30 m/s when local
speeds also stay low: air accelerates around a wing, and temperature changes
the sound speed. Those checks concern density changes, not whether the wind
feels strong.

Low Mach does **not** mean laminar flow or absence of separation. Those
depend on viscosity, geometry and Reynolds number as well. Nor does it
validate this book's deliberately high-viscosity, Reynolds-100 experiment
as a full-scale real-air wing simulation. The applicability of the
incompressible equations and the accuracy of our coarse implementation
are different questions.

The physical rules, in order
~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Imagine dividing the space around a rigid wing into small boxes. We treat air as
smoothly distributed material, rather than following each molecule: this is
a **continuum** approximation. Each location has an air velocity and pressure;
assigning a quantity throughout space is called a **field**.

Three rules connect the boxes:

1. **Account for mass.** Density is mass per volume. With constant density,
   air cannot accumulate in a fixed box: whatever volume enters must leave.
   Incompressible means this approximation, not that real air can never compress.
2. **Account for acceleration.** Momentum is mass times velocity. A moving
   parcel changes momentum because pressure, friction, or an external force
   acts on it. Newton's law relates those forces to acceleration.
3. **Respect the wing and the outside wind.** Air cannot pass through the
   solid wing. Viscous air touching its fixed surface has zero velocity.
   Far away, we supply the
   incoming wind. These boundary rules are part of the calculation, not
   decorations added after solving the equations.

Pressure and viscosity have different jobs. **Pressure** pushes equally in
all directions locally; a pressure difference accelerates air toward lower
pressure. **Viscosity** resists neighboring layers sliding at different
speeds. **Stress** is force per area. In our **Newtonian** approximation,
viscous stress is proportional to the rate at which those layers deform.
Pressure must adjust throughout the domain so that acceleration does not
violate the first rule.

Unknowns, inputs, and units
~~~~~~~~~~~~~~~~~~~~~~~~~~~

Let :math:`x,y,z` locate a point in metres and :math:`t` be time in seconds.
Bold symbols are vectors, quantities with size and direction. The unknown
:math:`\mathbf u(x,y,z,t)` is air velocity in m/s, and the unknown :math:`p`
is pressure in pascals, Pa = N/m². Their values generally vary across space.

Choose constant density :math:`\rho=1.225` kg/m³ and dynamic viscosity
:math:`\eta=1.8\times10^{-5}` Pa s for the examples. These are illustrative
air properties, not measurements for every weather condition. The wing
experiment uses this density but a much larger viscosity, specified below.
Let :math:`\mathbf g=(0,-9.81,0)` m/s² be near-Earth gravitational acceleration.
The incoming wind :math:`\mathbf W` is a prescribed velocity vector in m/s.
The rigid wing's geometry and angle are prescribed and held fixed during
an airflow run.

Two kinds of acceleration
~~~~~~~~~~~~~~~~~~~~~~~~~

A derivative measures a rate of change. The symbol :math:`\partial` means
other variables are held fixed. Thus :math:`\partial\mathbf u/\partial t`
measures velocity change with time at one location. It has units m/s².

But a moving parcel can also enter a region where velocity is different.
For example, suppose steady air speeds up from 5 to 6 m/s over 1 m along
its motion. A parcel moving at 5 m/s encounters an acceleration of
approximately :math:`5\times(6-5)/1=5` m/s² even though velocity at each
fixed location is not changing with time.

The spatial derivative symbol :math:`\nabla` organizes rates of change in
the three directions. The expression :math:`(\mathbf u\cdot\nabla)\mathbf u`
adds the velocity change encountered by moving through those directions.
Here the dot combines matching directional components. This **transport**,
also called advection, carries momentum from one box to its neighbors.
The two contributions give the parcel's total acceleration:

.. math::

    \frac{\partial\mathbf u}{\partial t}
    +(\mathbf u\cdot\nabla)\mathbf u.

Writing the two physical balances
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

The **divergence** :math:`\nabla\cdot\mathbf u` measures net outward
volume flow per unit volume, in 1/s. Outward contributions are positive,
inward contributions negative. Constant-density mass conservation requires

.. math::

    \nabla\cdot\mathbf u=0.

This does not require zero velocity, or equal flow through every face.
It requires their signed total to be zero in every small box.

The **gradient** :math:`\nabla p` measures pressure increase with position,
in Pa/m. Its negative points toward lower pressure. The **Laplacian**
:math:`\nabla^2\mathbf u` adds second spatial derivatives of velocity:
it compares each velocity with its neighbors, in 1/(m s). For constant
viscosity and incompressible flow, multiplying it by :math:`\eta` gives
the viscous force per volume. Multiplying acceleration by density gives
the same units, N/m³. Newton's momentum balance is therefore

.. math::

    \rho\left[\frac{\partial\mathbf u}{\partial t}
    +(\mathbf u\cdot\nabla)\mathbf u\right]
    =-\nabla p+\eta\nabla^2\mathbf u+\rho\mathbf g.

Read it as **density times acceleration = pressure force + viscous force
+ weight**, all per unit volume. These are the incompressible Navier--Stokes
equations, not a separate unexplained law. `MIT's Navier--Stokes notes`_,
equations (346)--(347), derive the momentum terms from pressure and Newtonian
stress. We write dynamic viscosity explicitly and include gravity.

Still air has a vertical pressure variation that supports its weight,
called **hydrostatic pressure**. Subtracting that known background from
pressure removes the matching fluid gravity term consistently. For the
algorithm below, :math:`p` denotes the remaining pressure and that background
has been subtracted; only the remaining pressure drives the flow update.

What the boundaries supply
~~~~~~~~~~~~~~~~~~~~~~~~~~

A **boundary condition** specifies behavior at the edge or a surface of
the calculation. Let :math:`\mathbf r` be a point on the rigid wing's surface
in metres, and :math:`\mathbf v` its velocity in m/s. The derivative
:math:`d/dt` follows that same material point, unlike a derivative at a
fixed location. At the wing surface, viscous no-slip flow requires

.. math::

    \mathbf u=\mathbf v=\frac{d\mathbf r}{dt}.

For this fixed wing, :math:`\mathbf v` is zero: air directly touching its
surface must be stationary too. The **normal** component, perpendicular
to the surface, prevents penetration. The **tangential** component, along
it, prevents slipping. Air moving tangentially at 0.10 m/s directly at a
stationary no-slip wall would violate that condition. MIT's notes state
the no-slip condition in Section 13.2.

Far away, specify incoming :math:`\mathbf W`; allow disturbed air to leave
through an appropriate downstream boundary. Also specify initial velocities
and hold the wing geometry fixed. A closed domain needs a pressure reference;
an open domain may prescribe pressure at an outlet. Boundary choices affect
the result. Tunnel walls need their own boundary rules; the experiment's
slip outer walls differ from its approximately no-slip wing.

How one numerical solution works
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Spatial discretization replaces continuous fields with finitely many
stored samples. Here is the fluid-specific **pressure-projection** method,
following the approach developed by `Chorin`_ and the grid construction in
`Bridson and Müller-Fischer's fluid notes`_, Chapters 2--4. Projection means
correcting a provisional velocity so it satisfies the volume balance.
This is the algorithm family used in the next wing experiment.
The experiment's specific two-dimensional grid,
boundaries, viscosity and stopping tolerance are stated on its page.

Use a regular grid of boxes with spacing :math:`h` in metres. Store pressure
at their centers and the perpendicular velocity component at each face.
This arrangement is called a **staggered grid**: pressure and velocity are
stored at different locations. The face velocity directly measures flow
between neighboring boxes.

Let :math:`\Delta t` be a time step in seconds; :math:`\Delta` means a
change. Let :math:`\mathbf u^n` be the stored velocity before a step;
:math:`n` counts time steps. A star labels a provisional value, not a
multiplication. Let :math:`\nu=\eta/\rho` be kinematic viscosity in m²/s;
our choices give approximately :math:`1.47\times10^{-5}` m²/s.

**First predict motion without the unknown pressure.** For a simple
first-order time update, transport momentum and apply viscosity:

.. math::

    \mathbf u^*=\mathbf u^n+\Delta t
    \left[-(\mathbf u^n\cdot\nabla)\mathbf u^n
    +\nu\nabla^2\mathbf u^n\right].

The minus transport term moves the stored velocity pattern with the air;
viscosity smooths differences between neighboring velocities. For a concrete
spatial approximation, estimate transport derivatives using values on the
upstream side of the flow, called **upwind differences**, with interpolation
to the needed faces. For each velocity component :math:`f` in m/s, let
:math:`f_L,f_0,f_R` be its values at three equally spaced locations along
one coordinate. Let :math:`w` be the transporting velocity in that coordinate,
also in m/s. Its upwind transport term is

.. math::

    w\frac{\partial f}{\partial x}\approx
    \begin{cases}
      w(f_0-f_L)/h,&w\geq0,\\
      w(f_R-f_0)/h,&w<0.
    \end{cases}

Use the analogous difference along each active coordinate and add the
terms. In the wing experiment, transporting horizontal velocity by vertical
velocity requires the latter at the horizontal face; it is obtained by
averaging the four surrounding vertical-velocity samples, and conversely
for vertical momentum. First-order upwinding introduces numerical diffusion
in addition to the selected physical viscosity.
The second derivative in that direction is approximated by

.. math::

    \frac{\partial^2 f}{\partial x^2}
    \approx\frac{f_L-2f_0+f_R}{h^2}.

Add corresponding contributions from the other two coordinates for the
Laplacian. Explicit transport and viscosity need sufficiently small time
steps; this deliberately simple scheme is not a claim of accuracy at any
chosen grid size. More accurate transport and implicit viscosity are possible.

**Next find the pressure correction.** We want a new velocity
:math:`\mathbf u^{n+1}` that has zero divergence. Pressure changes the
provisional velocity by

.. math::

    \mathbf u^{n+1}=\mathbf u^*
    -\frac{\Delta t}{\rho}\nabla p.

Take the divergence of this equation, require the result to vanish, and
rearrange. The unknown pressure must satisfy

.. math::

    \nabla^2 p=\frac{\rho}{\Delta t}\nabla\cdot\mathbf u^*.

This is a **Poisson equation**, which links each pressure to neighboring
pressures and the known local volume imbalance. It is how the computer
finds pressure, rather than choosing it independently at each location.
Use face-flow differences for divergence and center-pressure differences
for the gradient. These must be consistent: applying divergence to the
discrete pressure gradient produces the discrete pressure equation.

There is one equation per fluid cell. They form a **linear system**: many
simultaneous equations whose unknowns are the cell pressures. Solve them
together, then update the face velocities using their pressure differences.
Solid-wall normal velocities enter both the imbalance and the pressure
boundary equations; they must not be changed incompatibly afterward.
Tangential no-slip belongs to the viscous boundary treatment. A curved wing
needs additional boundary geometry handling, not just this regular-grid
recipe; the experiment approximates that surface with blocked cells.

A small calculation from imbalance to result
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

To isolate the pressure step, take two neighboring cubic cells, each
:math:`h=0.10` m wide, inside stationary closed walls. Their only shared
face has provisional rightward velocity :math:`U^*=0.10` m/s. All exterior
face velocities are zero. This is an illustrative predictor output, not
a complete wing-flow simulation or a steady incompressible starting state.
Use :math:`\rho=1.225` kg/m³ and :math:`\Delta t=0.01` s.

Each cell has volume :math:`h^3=0.001` m³, and the shared face has area
:math:`h^2=0.01` m². Its volume flow is
:math:`U^*h^2=0.001` m³/s from the left cell to the right.
The left cell loses volume; the right gains it. Dividing signed outward
flow by cell volume gives divergences

.. math::

    d_L=\frac{0.001}{0.001}=1\ \mathrm{s}^{-1},
    \qquad d_R=-1\ \mathrm{s}^{-1}.

Here :math:`d_L,d_R` label the two known divergences, and
:math:`p_L,p_R` the two unknown pressures in Pa. The walls keep their
normal velocity zero, so their pressure-gradient contributions are zero
in this example. Each cell's pressure equation has just one neighbor:

.. math::

    \frac{p_R-p_L}{h^2}=\frac{\rho}{\Delta t}d_L=122.5\ \mathrm{Pa/m}^2,
    \qquad
    \frac{p_L-p_R}{h^2}=-122.5\ \mathrm{Pa/m}^2.

Both equations give :math:`p_R-p_L=1.225` Pa. Only the difference is
determined: adding the same constant to both pressures changes no force.
Choose zero mean as the pressure reference. Then
:math:`p_L=-0.6125` Pa and :math:`p_R=0.6125` Pa, measured relative to
that reference, not negative absolute atmospheric pressure.

Pressure rises to the right by :math:`1.225/0.10=12.25` Pa/m.
It causes leftward acceleration :math:`-12.25/1.225=-10` m/s².
Over the chosen time step, the shared face becomes

.. math::

    U^{n+1}=0.10-\frac{0.01}{1.225}
    \frac{1.225}{0.10}=0\ \mathrm{m/s}.

The wall faces remain zero. Both cell divergences are now zero too.
We supplied an imbalanced provisional velocity, solved two coupled pressure
equations, and obtained a compatible velocity. In flow around a wing,
projection removes the imbalance but need not remove all
motion: air can continue circulating through many cell faces.

Seeing flow with passive tracers
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Once the velocity field is calculated, we can follow marked parcels without
letting those markers change the flow. These are **passive tracers**. They
have no mass or force in our model and no independent random drift. Their
color is a label, not a measured pressure or speed.

Let :math:`\mathbf X(t)` be one tracer's position in metres. The already
calculated velocity :math:`\mathbf u` is evaluated at that position. The
tracer follows

.. math::

    \frac{d\mathbf X}{dt}=\mathbf u(\mathbf X(t),t).

The :math:`d/dt` here follows the marker, rather than holding its location
fixed. If the local velocity stays :math:`(2,-0.5,0)` m/s for 0.20 s, a
marker moves :math:`(0.40,-0.10,0)` m. The plotted history of one moving
marker is a **pathline**. A **streamline** instead follows the directions
of the velocity field at one frozen instant; the two coincide only when
the flow is steady. The experiment draws pathline histories.

We need velocities between grid faces. **Bilinear interpolation** weights
the four closest stored values according to distance, once for each velocity
component. For example, halfway between four samples, their weights are
all one quarter. This interpolation does not make the velocity exactly
divergence-free between samples or guarantee impermeability at the mask.

For a numerical step, let :math:`\mathbf X^n` be the marker's current
position and :math:`\mathbf X_m` a provisional position halfway through
the same flow time step :math:`\Delta t`. First estimate

.. math::

    \mathbf X_m=\mathbf X^n+
    \frac{\Delta t}{2}\mathbf u^n(\mathbf X^n).

Use the average of old and new velocities at this middle position for the
full displacement:

.. math::

    \mathbf X^{n+1}=\mathbf X^n+
    \frac{\Delta t}{2}\left[
      \mathbf u^n(\mathbf X_m)+\mathbf u^{n+1}(\mathbf X_m)
    \right].

This is an explicit midpoint-style tracer update, using linear time
interpolation of the two calculated fields. It is second order for a smooth,
accurately supplied velocity, but the experiment's first-order flow solver
and coarse boundaries still limit the overall accuracy. Its code retires a
tracer that enters a blocked grid cell rather than drawing it through the
wing or bending its path by hand. New markers enter at the inlet; finite
trails remember recent positions, not a permanent steady streamline.

Real visible smoke also spreads, can settle, and can rise when heated.
For a dilute passive concentration, let :math:`c` be smoke mass per volume
in kg/m³, :math:`\kappa` a diffusivity in m²/s, and :math:`S` a source in
kg/(m³ s). A possible additional model is

.. math::

    \frac{\partial c}{\partial t}+\mathbf u\cdot\nabla c
    =\kappa\nabla^2 c+S.

The first two terms transport concentration; diffusion spreads it and
the source adds it. Neither this concentration equation nor heat, buoyancy,
settling or scattering is implemented by the wing experiment. Calling its
markers "smoke trails" describes a visual resemblance, not a smoke model.
The fluid/tracer distinction follows `Bridson and Müller-Fischer's fluid
notes`_, which treat passive marker advection separately from buoyancy.

Which version the wing experiment implements
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

The next experiment calculates a **two-dimensional** field: velocity is
:math:`\mathbf u=(u,v,0)`, where :math:`u,v` are its horizontal and vertical
components in m/s, and nothing varies along span coordinate :math:`z`.
Delete the span derivatives from the equations above. The two active
components still obey viscous Navier--Stokes and the same volume balance;
this is not a potential-flow or vortex substitute. The experiment shows this
field in a fixed two-dimensional side view;
it does not calculate span flow or tip vortices.

For feasibility on a coarse browser grid, the wing experiment uses
:math:`\nu=0.015` m²/s, about a thousand times the illustrative air value,
with speed 1 m/s and chord 1.5 m. This is a deliberately viscous model fluid,
not realistic airplane air. Its pressure is relative to the outlet reference,
and hydrostatic pressure has been removed. No gravity acts on markers.

The wing is a **solid-cell mask**: grid cells with centers inside its rotated
section are blocked. The drawing uses a smooth rendering of that underlying
section; the fluid boundary is still a stair-step approximation on the grid.
Every velocity face between fluid and solid has normal speed zero.
For viscosity near a wing wall, reflect the tangential velocity into a
**ghost sample**, a numerical value beyond the wall, rather than an extra
fluid parcel. If :math:`f_0` is the neighboring tangential fluid speed, choose

.. math::

    f_{\mathrm{ghost}}=-f_0,
    \qquad \frac{f_0+f_{\mathrm{ghost}}}{2}=0.

The zero midpoint approximates no-slip at the mask wall. This reflected
sample goes into the centered viscous difference, while transport uses the
blocked face's zero value. Normal-component wall samples are zero. This is
an approximate stair-step boundary treatment, not a resolved smooth-wing
boundary layer. Bilinear tracer sampling can still leak into a blocked cell;
retiring such a marker is a drawing safeguard, not a change to this flow law.

At the top and bottom of the tunnel, normal speed is zero, but tangential
ghost samples equal the adjacent fluid value. This gives zero tangential
derivative: **slip walls**, a different condition from the no-slip wing.
The inlet supplies horizontal speed 1 m/s and vertical speed zero.
At the outlet, the predictor copies the adjacent velocity (zero normal
derivative); pressure is set to zero at the outlet face. Projection adjusts
outgoing normal speed. The condition is too simple for substantial flow
entering backward from outside the domain.

Here is the actual discrete pressure system behind the experiment. Let
:math:`i,j` count column and row; :math:`p_{i,j}` is a cell-center pressure
and :math:`d_{i,j}` its provisional outward volume imbalance per cell volume,
in 1/s. Face differences give

.. math::

    d_{i,j}=\frac{u_{i+1,j}-u_{i,j}+v_{i,j+1}-v_{i,j}}{h}.

Let :math:`\mathcal N` be the set of neighboring fluid cells, and
:math:`q` label one member's pressure :math:`p_q`. Multiplying the discrete
Poisson equation by :math:`-h^2` gives the interior row

.. math::

    \sum_{q\in\mathcal N}(p_{i,j}-p_q)
    =-\frac{\rho h^2}{\Delta t}d_{i,j}.

Fixed-normal-speed faces add no unknown pressure difference. A zero-pressure
outlet is half a cell from the last center, so its contribution on the left
is :math:`2p_{i,j}`. The matching outlet velocity correction uses
:math:`(0-p_{i,j})/(h/2)` as its pressure gradient. Using the same half-cell
distance in both operations preserves the discrete volume balance.

These rows form a sparse symmetric positive linear system: diagonal entries
count fluid neighbors, with two added at the outlet, and neighboring
off-diagonal entries are -1. The experiment uses **conjugate gradients**, an
iterative method for such systems, with the diagonal as a preconditioner
(a scaling that helps the iterations). The pressure **residual** is the
right-hand side minus the matrix applied to the current pressure estimate.
Multiplying its magnitude by :math:`\Delta t/(\rho h^2)` gives the
remaining divergence magnitude. This is what the stopping test measures.
The structure follows `Bridson and Müller-Fischer's fluid notes`_, Chapters
4 and 5; it does not justify an arbitrary chosen pressure field.

The code targets maximum residual-equivalent divergence of :math:`10^{-5}`
1/s and permits at most 800 iterations. It checks the actual corrected
maximum cell divergence against :math:`2\times10^{-5}` 1/s and stops with
an error if the bound is missed. Prescribed/blocked normal speeds are never
overwritten after projection. The interface displays this actual residual.

Let :math:`M_u,M_v` be the largest absolute component speeds in m/s.
The explicit time step is at most 0.012 s and is shortened to obey

.. math::

    \Delta t\left[\frac{M_u+M_v}{h}+\frac{4\nu}{h^2}\right]\leq0.65.

The expression combines transport and viscous rates; the conservative factor
helps accommodate the reflected boundary stencils. It is a stability guard,
not an accuracy certificate. The display's 96 by 48 cells are too coarse
for real-air boundary layers. Three-grid comparisons expose sensitivity
rather than establish convergence. Changing the wing angle resets the mask
and projected initial flow, not a moving-boundary wing calculation.
See :doc:`03b-wind-tunnel` for the
controls, geometry, numerical checks and precisely what not to infer.

Repeat the airflow step
~~~~~~~~~~~~~~~~~~~~~~~~

Repeat prediction and projection as time advances, keeping the rigid wing
and tunnel boundaries fixed. Changing the angle starts a new run with a
new fixed geometry; it is not a moving-wing calculation.

Near a viscous surface, velocity changes through a thin **boundary layer**.
The disturbed air downstream is the **wake**. **Separation** means flow
peels away from the surface. These are consequences a sufficiently resolved
viscous calculation may represent, not extra forces specified by naming
them. A coarse calculation is not automatically accurate; high-speed or
high-Reynolds-number flow may need finer resolution and additional modeling.

Separation and turbulence: law versus resolution
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Does this model include flow detaching from the back of a wing? The viscous
Navier--Stokes equations permit **separation** without a separate detachment
switch. At a stationary wall, no-slip and viscosity create a low-speed
boundary layer. If pressure rises along the flow direction, called an
**adverse pressure gradient**, the pressure force opposes motion. Near-wall
flow can slow, reverse and leave the surface, forming a separated shear layer
and sometimes recirculation. `NASA's boundary-layer explanation`_
connects the slow near-wall layer, pressure changes and separation.

The full three-dimensional unsteady equations can also describe **turbulence**,
irregular interacting flow fluctuations across many sizes. Calculating it
directly requires resolving those sizes and sufficiently short time steps;
otherwise an additional turbulence model is needed. Merely writing
Navier--Stokes, drawing curling traces or obtaining a small pressure residual
does not establish that turbulent behavior is resolved.

The wing experiment has no turbulence model, no span motion and no resolved
real-air boundary layer. Its high model viscosity, first-order numerical
diffusion and coarse stair-step wall strongly alter the result. Local reverse
flow, if measured, would demonstrate recirculation in that numerical model,
not a validated real-wing separation point or stall angle. Its experiment
page distinguishes tested behavior from effects the continuum law permits.

From pressure to one force, then lift and drag
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Is air pushing part of this calculation? Yes: the pressure gradient already
accelerates air in the momentum update. The computed pressure also lets us
estimate the force air applies to the fixed wing. The wing does not move
under that load in this experiment.

Pressure acts perpendicular to each surface piece. In this two-dimensional
model, report force **per unit span**, in N/m, not a force on a whole finite
wing. Let :math:`p` be relative pressure in Pa, :math:`\Delta s` a small
surface length in metres, and :math:`\mathbf n` its outward unit normal,
pointing from the solid into the fluid. The normal has no units. Let
:math:`\Delta\mathbf f_p` be that piece's pressure-force contribution per
unit span. Pressure pushes opposite the outward normal:

.. math::

    \Delta\mathbf f_p=-p\mathbf n\Delta s,
    \qquad \mathbf f_p=\sum\Delta\mathbf f_p.

The sum adds vectors around the entire closed section, including leading
and trailing edges. Its units are Pa times m = N/m. This **one resultant**
is not two independent forces. Let :math:`\mathbf e_D` be the unit direction
of incoming flow, and :math:`\mathbf e_L` the perpendicular unit direction
chosen upward. The dot product takes a vector's component along a direction.
Define signed **pressure drag** :math:`d_p` and **pressure lift**
:math:`l_p`, both in N/m, by

.. math::

    d_p=\mathbf f_p\cdot\mathbf e_D,
    \qquad l_p=\mathbf f_p\cdot\mathbf e_L.

Here incoming air moves rightward, so these are simply the rightward and
upward components. A resultant (0.20, 0.60) N/m has pressure drag 0.20 N/m,
pressure lift 0.60 N/m and magnitude about 0.632 N/m. On a horizontal
0.10 m piece with upward normal, relative pressure -3 Pa contributes
0.30 N/m upward. These are illustrative calculations, not measured wing
performance. `NASA's pressure-to-force explanation`_ describes summing
surface contributions and resolving the single force along and across flow.

Negative relative pressure means below the reference, **not negative absolute
pressure**. Its outward arrow is a signed contribution relative to that
reference, not an absolute pulling force. A constant pressure shift changes
local arrows and colors but cancels from the resultant on a closed surface:
the sum of outward normals weighted by surface length is zero.
The experiment uses pressure relative to its zero-pressure outlet, with the
hydrostatic background removed, not a buoyancy calculation.

These arrows are **pressure-only**. Full viscous loading also includes
surface viscous stress, including shear, which these readouts omit even
though viscosity affects the calculated flow. The experiment sums pressure
on its stair-step numerical boundary using adjacent fluid-cell values;
its smooth drawing is not the integration surface. Arrows are scaled display
guides, not wing displacement. Neither this estimate nor a small pressure
residual certifies real-wing lift, drag or stall accuracy.

.. _`NASA's pressure-to-force explanation`: https://www.grc.nasa.gov/www/k-12/airplane/right1.html
.. _`MIT's Navier--Stokes notes`: https://ocw.mit.edu/courses/18-354j-nonlinear-dynamics-ii-continuum-systems-spring-2015/6f1477ffaa90b8c93556120294eecd64_MIT18_354JS15_Ch13.pdf
.. _`NASA's Navier--Stokes explanation`: https://www.grc.nasa.gov/www/k-12/airplane/nseqs.html
.. _`NASA explains for low-speed air`: https://www.grc.nasa.gov/www/k-12/airplane/airsim.html
.. _`NASA's Mach-number definition`: https://www.grc.nasa.gov/www/k-12/airplane/mach.html
.. _`OpenStax's sound-speed example`: https://openstax.org/books/college-physics-2e/pages/17-2-speed-of-sound-frequency-and-wavelength
.. _`NASA's low-speed wind-tunnel work`: https://ntrs.nasa.gov/api/citations/20200002389/downloads/20200002389.pdf
.. _`NASA's boundary-layer explanation`: https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/boundary-layer/
.. _`Chorin`: https://math.berkeley.edu/~chorin/chorin68.pdf
.. _`Bridson and Müller-Fischer's fluid notes`: https://www.cs.ubc.ca/~rbridson/fluidsimulation/fluids_notes.pdf
