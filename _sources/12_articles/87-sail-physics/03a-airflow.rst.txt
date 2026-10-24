Airflow model
-------------

What are we calculating?
~~~~~~~~~~~~~~~~~~~~~~~~

Given the incoming wind and a fixed rigid wing, we want the air's velocity
and pressure around its section. The velocity beside the wing is not simply
the incoming wind everywhere: the surface redirects the flow.

This chapter develops **two-dimensional incompressible viscous
Navier--Stokes flow**:
air keeps approximately constant density, while friction between neighboring
layers affects its motion. We then show one numerical way to solve it.
The next experiment, :doc:`03b-wind-tunnel`,
uses this grid projection method in a fixed side view, with deliberately
increased viscosity and an approximate wing boundary.

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

Imagine dividing a side view of the air around a rigid wing into small
square cells. Each square represents air extending uniformly along the
wing span; we calculate no motion in that third direction. We treat air as
smoothly distributed material, rather than following each molecule: this is
a **continuum** approximation. Each location has an air velocity and pressure;
assigning a quantity throughout space is called a **field**.

Three rules connect the cells:

1. **Account for mass.** Density is mass per volume. With constant density,
   air cannot accumulate in a fixed cell: total inflow must equal total outflow.
   Incompressible means this approximation, not that real air can never compress.
2. **Account for acceleration.** Acceleration is a change in velocity:
   speed, direction, or both. Pressure differences, viscous friction, and
   external forces can cause that change. Newton's second law says that
   the net force on a parcel equals its mass times its acceleration.
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

Let :math:`x,y` locate a point in metres: rightward and upward, respectively.
Let :math:`t` be time in seconds.
Symbols with an arrow above them are vectors, quantities with size and
direction. The unknown :math:`\vec{u}(x,y,t)=(u_x,u_y)` is air velocity
in m/s, with horizontal and vertical components. The unknown :math:`p`
is pressure in pascals, Pa = N/m². Their values generally vary across the plane.

Choose constant density :math:`\rho=1.225` kg/m³ and dynamic viscosity
:math:`\eta=1.8\times10^{-5}` Pa s for the examples. These are illustrative
air properties, not measurements for every weather condition. The wing
experiment uses this density but a much larger viscosity, specified below.
Let :math:`\vec{g}=(0,-9.81)` m/s² be near-Earth gravitational acceleration.
The incoming wind :math:`\vec{W}` is a prescribed velocity vector in m/s.
The rigid wing's geometry and angle are prescribed and held fixed during
an airflow run.

Follow one moving parcel
~~~~~~~~~~~~~~~~~~~~~~~~

A small **parcel** is a portion of air that we follow as it moves, not a
fixed grid cell that air passes through. Let its position, velocity, and
acceleration be vectors :math:`\vec{r}_p(t)`, :math:`\vec{v}_p(t)`, and
:math:`\vec{a}_p(t)`. A derivative measures a rate of change:

.. math::

    \vec{v}_p=\frac{d\vec{r}_p}{dt},
    \qquad
    \vec{a}_p=\frac{d\vec{v}_p}{dt}.

Velocity measures how position changes, in m/s. Acceleration measures how
velocity changes, in m/s². With fixed parcel mass :math:`m` in kg,
Newton's second law is

.. math::

    m\vec{a}_p
    =\vec{F}_{\mathrm{pressure}}
    +\vec{F}_{\mathrm{viscous}}+m\vec{g}.

The pressure-force vector sums the pressure pushes on all sides of the
parcel. The viscous-force vector sums friction forces from neighboring air.
Each force is measured in newtons. Dividing the net force by mass gives
acceleration; acting for a short time :math:`\Delta t`, it changes velocity
by approximately :math:`\vec{a}_p\Delta t`.

Momentum is :math:`m\vec{v}_p`; force is its rate of change. For fixed
mass, this is the same law as mass times acceleration, not an additional
step that converts incoming velocity into force. Air can keep moving at
constant velocity with zero net force.

This vector description needs no spatial-derivative shorthand. But the
forces depend on the surrounding air, so we cannot solve each parcel
independently. Pressure and velocity must also respect mass conservation
and the wing boundary.

From a moving parcel to a fixed grid
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

The parcel above explains the physical law; the airflow solver does not
store or track individual parcels. It stores samples of a **velocity
field**: a rule giving the air's velocity at a chosen position and time.
Write this field as :math:`\vec{u}(\vec{r},t)`, where :math:`\vec{r}` is
the position we ask about and :math:`t` is the time. The grid stores
horizontal velocity at left and right cell edges, vertical velocity at
top and bottom edges, and pressure at cell centers.

In contrast, :math:`\vec{v}_p(t)` means the velocity of the particular
parcel we are following. Its position is :math:`\vec{r}_p(t)`. To find
that parcel's velocity, evaluate the field at its current position:

.. math::

    \vec{v}_p(t)=\vec{u}(\vec{r}_p(t),t).

Read this as: **the parcel moves with the air velocity at its current
position and time**. The parentheses on the right mean evaluating a
function, not multiplication. The field describes air velocity throughout
space; the parcel samples it along one path.

That velocity can change for two reasons. The field can change with time
at a fixed location, or the parcel can move into a location with a different
velocity. The symbol :math:`\partial` means a derivative with the other
coordinates held fixed. Thus :math:`\partial\vec{u}/\partial t` measures
only the first contribution.

For example, suppose steady air speeds up from 5 to 6 m/s over 1 m along
its motion. A parcel moving at 5 m/s encounters an acceleration of
approximately :math:`5\times(6-5)/1=5` m/s² even though velocity at each
fixed location is not changing with time.

Write the field's velocity components as :math:`u_x,u_y`. Following the
parcel gives the vector acceleration

.. math::

    \vec{a}_p=
    \frac{\partial\vec{u}}{\partial t}
    +u_x\frac{\partial\vec{u}}{\partial x}
    +u_y\frac{\partial\vec{u}}{\partial y},

evaluated at the parcel's position and time. Each spatial derivative is a
velocity change per metre; multiplying by the corresponding travel speed
gives a velocity change per second. For example,
:math:`u_y\partial\vec{u}/\partial y` accounts for the velocity change
encountered while moving vertically.

The last two terms describe **transport**, also called advection.
They express, at fixed grid locations, the changes already included in
the moving parcel's derivative :math:`d\vec{v}_p/dt`.

Writing the two physical balances
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

The **divergence** of velocity measures net outward
volume flow per unit volume, in 1/s. Outward contributions are positive,
inward contributions negative. Constant-density mass conservation requires

.. math::

    \frac{\partial u_x}{\partial x}
    +\frac{\partial u_y}{\partial y}=0.

This does not require zero velocity, or equal flow through every edge.
It requires their signed total to be zero in every cell.

Pressure differences give a force per volume with two components:

.. math::

    \vec{f}_{\mathrm{pressure}}=-\left(
    \frac{\partial p}{\partial x},
    \frac{\partial p}{\partial y}\right).

The vector in parentheses is the pressure **gradient**, measuring pressure
increase in each direction, in Pa/m. The minus sign makes the force point
toward lower pressure.

For constant viscosity and incompressible flow, let :math:`\eta`
(Greek **eta**) be the **dynamic viscosity**, measuring internal friction,
in Pa s. Our illustrative air value is :math:`\eta=1.8\times10^{-5}` Pa s.
The viscous force per volume is

.. math::

    \vec{f}_{\mathrm{viscous}}=\eta\left(
    \frac{\partial^2\vec{u}}{\partial x^2}
    +\frac{\partial^2\vec{u}}{\partial y^2}\right).

The sum of second derivatives is called the **Laplacian**. It compares
velocity with neighboring velocities and has units 1/(m s). Both
:math:`\vec{f}_{\mathrm{pressure}}` and
:math:`\vec{f}_{\mathrm{viscous}}` have units N/m³: they are forces per
volume, unlike the total parcel forces :math:`\vec{F}` above. Multiplying
acceleration by density gives the same units. Newton's balance becomes

.. math::

    \rho\left[\frac{\partial\vec{u}}{\partial t}
    +u_x\frac{\partial\vec{u}}{\partial x}
    +u_y\frac{\partial\vec{u}}{\partial y}\right]
    =\vec{f}_{\mathrm{pressure}}
    +\vec{f}_{\mathrm{viscous}}+\rho\vec{g}.

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
the calculation. Let :math:`\vec{r}` be a point on the rigid wing's surface
in metres, and :math:`\vec{v}` its velocity in m/s. The derivative
:math:`d/dt` follows that same material point, unlike a derivative at a
fixed location. At the wing surface, viscous no-slip flow requires

.. math::

    \vec{u}=\vec{v}=\frac{d\vec{r}}{dt}.

For this fixed wing, :math:`\vec{v}` is zero: air directly touching its
surface must be stationary too. The **normal** component, perpendicular
to the surface, prevents penetration. The **tangential** component, along
it, prevents slipping. Air moving tangentially at 0.10 m/s directly at a
stationary no-slip wall would violate that condition. MIT's notes state
the no-slip condition in Section 13.2.

Far away, specify incoming :math:`\vec{W}`; allow disturbed air to leave
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

Use a regular grid of square cells with spacing :math:`h` in metres.
Store pressure at their centers and the perpendicular velocity component
at each edge.
This arrangement is called a **staggered grid**: pressure and velocity are
stored at different locations. The edge velocity directly measures flow
between neighboring cells.

Let :math:`\Delta t` be a time step in seconds; :math:`\Delta` means a
change. Let :math:`\vec{u}^n` be the stored velocity before a step;
:math:`n` counts time steps. A star labels a provisional value, not a
multiplication. Let :math:`\nu=\eta/\rho` be kinematic viscosity in m²/s;
our choices give approximately :math:`1.47\times10^{-5}` m²/s.

**First predict motion without the unknown pressure.** For a simple
first-order time update, transport momentum and apply viscosity:

.. math::

    \vec{u}^*=\vec{u}^n+\Delta t
    \left[\begin{aligned}
    &-u_x^n\frac{\partial\vec{u}^n}{\partial x}
     -u_y^n\frac{\partial\vec{u}^n}{\partial y}\\
    &+\nu\left(
    \frac{\partial^2\vec{u}^n}{\partial x^2}
    +\frac{\partial^2\vec{u}^n}{\partial y^2}\right)
    \end{aligned}\right].

The minus transport term moves the stored velocity pattern with the air;
viscosity smooths differences between neighboring velocities. For a concrete
spatial approximation, estimate transport derivatives using values on the
upstream side of the flow, called **upwind differences**, with interpolation
to the needed edges. For each velocity component :math:`f` in m/s, let
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
velocity requires the latter at the edge storing horizontal velocity;
it is obtained by
averaging the four surrounding vertical-velocity samples, and conversely
for vertical momentum. First-order upwinding introduces numerical diffusion
in addition to the selected physical viscosity.
The second derivative in that direction is approximated by

.. math::

    \frac{\partial^2 f}{\partial x^2}
    \approx\frac{f_L-2f_0+f_R}{h^2}.

Add the corresponding contribution from the other coordinate for the
Laplacian. Explicit transport and viscosity need sufficiently small time
steps; this deliberately simple scheme is not a claim of accuracy at any
chosen grid size. More accurate transport and implicit viscosity are possible.

**Next find the pressure correction.** We want a new velocity
:math:`\vec{u}^{n+1}` that has zero divergence. Pressure changes the
provisional velocity by

.. math::

    \vec{u}^{n+1}=\vec{u}^*
    -\frac{\Delta t}{\rho}\left(
    \frac{\partial p}{\partial x},
    \frac{\partial p}{\partial y}\right).

Take the divergence of this equation, require the result to vanish, and
rearrange. The unknown pressure must satisfy

.. math::

    \frac{\partial^2 p}{\partial x^2}
    +\frac{\partial^2 p}{\partial y^2}
    =\frac{\rho}{\Delta t}\left(
    \frac{\partial u_x^*}{\partial x}
    +\frac{\partial u_y^*}{\partial y}\right).

This is a **Poisson equation**, which links each pressure to neighboring
pressures and the known local volume imbalance. It is how the computer
finds pressure, rather than choosing it independently at each location.
Use edge-flow differences for divergence and center-pressure differences
for the gradient. These must be consistent: applying divergence to the
discrete pressure gradient produces the discrete pressure equation.

There is one equation per fluid cell. They form a **linear system**: many
simultaneous equations whose unknowns are the cell pressures. Solve them
together, then update the edge velocities using their pressure differences.
Solid-wall normal velocities enter both the imbalance and the pressure
boundary equations; they must not be changed incompatibly afterward.
Tangential no-slip belongs to the viscous boundary treatment. A curved wing
needs additional boundary geometry handling, not just this regular-grid
recipe; the experiment approximates that surface with blocked cells.

A small calculation from imbalance to result
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

To isolate the pressure step, take two neighboring square cells, each
:math:`h=0.10` m wide, inside stationary closed walls. Their only shared
edge has provisional rightward velocity :math:`U^*=0.10` m/s. All exterior
edge velocities are zero. This is an illustrative predictor output, not
a complete wing-flow simulation or a steady incompressible starting state.
Use :math:`\rho=1.225` kg/m³ and :math:`\Delta t=0.01` s.

Each cell has area :math:`h^2=0.01` m², and the shared edge has length
:math:`h=0.10` m. Flow across that edge per unit wing span is
:math:`U^*h=0.01` m²/s from the left cell to the right. Equivalently,
a 1 m span would have 0.01 m³/s passing between cells of volume 0.01 m³.
The left cell loses air; the right gains it. Dividing signed outward flow
per unit span by cell area gives divergences

.. math::

    d_L=\frac{0.01}{0.01}=1\ \mathrm{s}^{-1},
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
Over the chosen time step, the shared edge becomes

.. math::

    U^{n+1}=0.10-\frac{0.01}{1.225}
    \frac{1.225}{0.10}=0\ \mathrm{m/s}.

The wall edges remain zero. Both cell divergences are now zero too.
We supplied an imbalanced provisional velocity, solved two coupled pressure
equations, and obtained a compatible velocity. In flow around a wing,
projection removes the imbalance but need not remove all
motion: air can continue circulating through many cell edges.

Seeing flow with passive tracers
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Once the velocity field is calculated, we can follow marked parcels without
letting those markers change the flow. These are **passive tracers**. They
have no mass or force in our model and no independent random drift. Their
color is a label, not a measured pressure or speed.

Let :math:`\vec{X}(t)` be one tracer's position in metres. The already
calculated velocity :math:`\vec{u}` is evaluated at that position. The
tracer follows

.. math::

    \frac{d\vec{X}}{dt}=\vec{u}(\vec{X}(t),t).

The :math:`d/dt` here follows the marker, rather than holding its location
fixed. If the local velocity stays :math:`(2,-0.5)` m/s for 0.20 s, a
marker moves :math:`(0.40,-0.10)` m. The plotted history of one moving
marker is a **pathline**. A **streamline** instead follows the directions
of the velocity field at one frozen instant; the two coincide only when
the flow is steady. The experiment draws pathline histories.

We need velocities between grid edges. **Bilinear interpolation** weights
the four closest stored values according to distance, once for each velocity
component. For example, halfway between four samples, their weights are
all one quarter. This interpolation does not make the velocity exactly
divergence-free between samples or guarantee impermeability at the mask.

For a numerical step, let :math:`\vec{X}^n` be the marker's current
position and :math:`\vec{X}_m` a provisional position halfway through
the same flow time step :math:`\Delta t`. First estimate

.. math::

    \vec{X}_m=\vec{X}^n+
    \frac{\Delta t}{2}\vec{u}^n(\vec{X}^n).

Use the average of old and new velocities at this middle position for the
full displacement:

.. math::

    \vec{X}^{n+1}=\vec{X}^n+
    \frac{\Delta t}{2}\left[
      \vec{u}^n(\vec{X}_m)+\vec{u}^{n+1}(\vec{X}_m)
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

    \begin{aligned}
    \frac{\partial c}{\partial t}
    +u_x\frac{\partial c}{\partial x}
    +u_y\frac{\partial c}{\partial y}
    ={}&\kappa\left(
    \frac{\partial^2 c}{\partial x^2}
    +\frac{\partial^2 c}{\partial y^2}\right)+S.
    \end{aligned}

The time derivative and velocity-weighted spatial derivatives describe
transport of concentration; diffusion spreads it and
the source adds it. Neither this concentration equation nor heat, buoyancy,
settling or scattering is implemented by the wing experiment. Calling its
markers "smoke trails" describes a visual resemblance, not a smoke model.
The fluid/tracer distinction follows `Bridson and Müller-Fischer's fluid
notes`_, which treat passive marker advection separately from buoyancy.

Which version the wing experiment implements
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

The next experiment implements the two-dimensional equations above.
Its code names the horizontal and vertical velocity components :math:`u,v`,
corresponding to :math:`u_x,u_y` here, so :math:`\vec{u}=(u,v)`.
It calculates no span flow or tip vortices.

In three dimensions, the same balances gain a third position coordinate,
a third velocity component, and derivatives in that direction. The
two-dimensional model assumes those span variations and span motion are absent.

For feasibility on a coarse browser grid, the wing experiment uses
:math:`\nu=0.015` m²/s, about a thousand times the illustrative air value,
with speed 1 m/s and chord 1.5 m. This is a deliberately viscous model fluid,
not realistic airplane air. Its pressure is relative to the outlet reference,
and hydrostatic pressure has been removed. No gravity acts on markers.

The wing is a **solid-cell mask**: grid cells with centers inside its rotated
section are blocked. The drawing uses a smooth rendering of that underlying
section; the fluid boundary is still a stair-step approximation on the grid.
Every velocity edge between fluid and solid has normal speed zero.
For viscosity near a wing wall, reflect the tangential velocity into a
**ghost sample**, a numerical value beyond the wall, rather than an extra
fluid parcel. If :math:`f_0` is the neighboring tangential fluid speed, choose

.. math::

    f_{\mathrm{ghost}}=-f_0,
    \qquad \frac{f_0+f_{\mathrm{ghost}}}{2}=0.

The zero midpoint approximates no-slip at the mask wall. This reflected
sample goes into the centered viscous difference, while transport uses the
blocked edge's zero value. Normal-component wall samples are zero. This is
an approximate stair-step boundary treatment, not a resolved smooth-wing
boundary layer. Bilinear tracer sampling can still leak into a blocked cell;
retiring such a marker is a drawing safeguard, not a change to this flow law.

At the top and bottom of the tunnel, normal speed is zero, but tangential
ghost samples equal the adjacent fluid value. This gives zero tangential
derivative: **slip walls**, a different condition from the no-slip wing.
The inlet supplies horizontal speed 1 m/s and vertical speed zero.
At the outlet, the predictor copies the adjacent velocity (zero normal
derivative); pressure is set to zero at the outlet edge. Projection adjusts
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

Fixed-normal-speed edges add no unknown pressure difference. A zero-pressure
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
surface length in metres, and :math:`\vec{n}` its outward unit normal,
pointing from the solid into the fluid. The normal has no units. Let
:math:`\Delta\vec{f}_p` be that piece's pressure-force contribution per
unit span. Pressure pushes opposite the outward normal:

.. math::

    \Delta\vec{f}_p=-p\vec{n}\Delta s,
    \qquad \vec{f}_p=\sum\Delta\vec{f}_p.

The sum adds vectors around the entire closed section, including leading
and trailing edges. Its units are Pa times m = N/m. This **one resultant**
is not two independent forces. Let :math:`\vec{e}_D` be the unit direction
of incoming flow, and :math:`\vec{e}_L` the perpendicular unit direction
chosen upward. The dot product takes a vector's component along a direction.
Define signed **pressure drag** :math:`d_p` and **pressure lift**
:math:`l_p`, both in N/m, by

.. math::

    d_p=\vec{f}_p\cdot\vec{e}_D,
    \qquad l_p=\vec{f}_p\cdot\vec{e}_L.

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
