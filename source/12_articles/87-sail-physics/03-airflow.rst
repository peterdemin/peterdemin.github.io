Airflow model
-------------

A small box of air is a useful starting point. Air enters or leaves the box,
and pressure or friction changes its motion. We need to account for all the
mass and all the forces that change motion.

**Momentum** is mass times velocity, in kg m/s. **Conservation** means not
creating or destroying a quantity in the accounting. Momentum changes when
an external force acts; its rate of change must equal that force.

Physical assumptions
~~~~~~~~~~~~~~~~~~~~

A **continuum** model treats air as smoothly distributed material, not
individual molecules. A **field** assigns a value at every location and time,
such as velocity throughout a room. **Density** is mass per volume:
kg/m³ means kilograms in each cubic metre. **Incompressible** here means taking air
density as constant: a moving parcel does not appreciably change volume.
This is a low-speed approximation, not a claim that air cannot be compressed.

**Viscosity** resists neighboring layers sliding at different speeds.
**Newtonian** means the resisting stress is proportional to the rate of
deformation. **Stress** is force per area; **pressure** is the part pushing
equally in all directions, measured in pascals (Pa = N/m²).
**Unsteady** flow changes with time at a fixed location; **steady** flow does
not. We do not assume that air stays attached: **separation** means it peels
away from the cloth.

Symbols and operations
~~~~~~~~~~~~~~~~~~~~~~

Let :math:`x,y,z` be position coordinates (m) and :math:`t` time (s).
Bold :math:`\mathbf{u}` is local air velocity, not necessarily incoming wind.

.. list-table:: Quantities before the equations
    :header-rows: 1

    * - Symbol
      - Meaning and example choice
      - SI unit
    * - :math:`\mathbf{u}`
      - Local velocity; solved, not fixed
      - m/s
    * - :math:`\rho`
      - Constant density; choose 1.225 to match the demo
      - kg/m³
    * - :math:`p`
      - Local pressure; solved, not fixed
      - Pa
    * - :math:`\eta`
      - Dynamic viscosity; illustrative choice :math:`1.8\times10^{-5}`
      - Pa s
    * - :math:`\mathbf{g}`
      - Gravity; choose (0, −9.81, 0)
      - m/s²

Actual air properties depend on conditions and should be established for the
experiment. Viscosity is absent from the demo's airflow solve, not real air.

A derivative measures a rate of change. :math:`\partial/\partial t` measures
time change at a fixed position; :math:`\partial` means other variables are
held fixed. The symbol :math:`\nabla` organizes spatial derivatives, each
introducing a factor of 1/m:

- :math:`\nabla p` is pressure's direction and rate of increase (Pa/m).
- :math:`\nabla\cdot\mathbf{u}` is divergence: net outward volume-flow rate
  per unit volume (1/s). The dot combines matching directional derivatives.
- :math:`(\mathbf{u}\cdot\nabla)\mathbf{u}` measures velocity change
  encountered by moving through spatially varying flow (m/s²).
- :math:`\nabla^2\mathbf{u}` adds second spatial derivatives of each velocity
  component, measuring variation relative to neighbors (1/(m s)).

The conservation equations
~~~~~~~~~~~~~~~~~~~~~~~~~~

Constant-density mass conservation is

.. math::

    \nabla\cdot\mathbf{u}=0.

The signed total volume outflow from an arbitrarily small fixed box is zero:
whatever leaves must be replaced. Outflow need not be equal through each face.

Momentum conservation gives the incompressible Navier–Stokes equation:

.. math::

    \rho\left[\frac{\partial\mathbf{u}}{\partial t}
    +(\mathbf{u}\cdot\nabla)\mathbf{u}\right]
    =-\nabla p+\eta\nabla^2\mathbf{u}+\rho\mathbf{g}.

Read this as density times acceleration equals pressure, viscous, and gravity
forces per volume. Every term is in N/m³.
The negative pressure gradient drives air toward lower pressure.

For an illustrative 1 Pa drop over 0.10 m, the gradient magnitude is 10 Pa/m.
Alone it would cause acceleration :math:`10/1.225\approx8.16` m/s²; other
terms generally act too. The derivation from momentum and Newtonian stress is
in `MIT's Navier–Stokes notes <https://ocw.mit.edu/courses/18-354j-nonlinear-dynamics-ii-continuum-systems-spring-2015/6f1477ffaa90b8c93556120294eecd64_MIT18_354JS15_Ch13.pdf>`_,
equations (346)–(347). Our equation writes constant density and dynamic
viscosity explicitly and adds gravity as a force per volume. It does not
choose a numerical mesh or turbulence model.

**Hydrostatic pressure** supports still air's weight. Subtracting that
background can consistently remove the corresponding fluid gravity term.
It does not remove gravity from the cloth.

Air at the moving sail
~~~~~~~~~~~~~~~~~~~~~~

A **boundary condition** specifies behavior at a surface of the calculation.
**Impermeable** means air cannot pass through the cloth. **No slip** means
adjacent air shares the cloth's velocity along the surface.
**Normal** means perpendicular to the surface; **tangential** means along it.

Let :math:`\mathbf{r}` be a particular cloth point's position (m) and
:math:`\mathbf{v}` its velocity (m/s). The derivative :math:`d/dt` follows
that same point; :math:`d\mathbf{r}/dt` is its velocity. On either face,

.. math::

    \mathbf{u}=\mathbf{v}=\frac{d\mathbf{r}}{dt}.

Cloth moving sideways at 0.10 m/s requires air touching it to share that
velocity there. The normal part prevents penetration, and the tangential
part expresses no slip. The no-slip condition is stated in the MIT notes,
Section 13.2.

Velocity changes from its surface value to the outer flow over a thin region
called the **boundary layer**. The disturbed air downstream forms the
**wake**. Viscosity affects both and whether separation occurs: omitting it
does not just omit a small friction force.

Far away, prescribe :math:`\mathbf{W}`, incoming velocity in m/s from the
introduction. **Initial conditions** specify the air and cloth state at the
starting time. Ground, mast, and boom add boundaries if their obstruction is
included. Cloth **permeability**, its ability to pass air, needs measurements
and a different interface law if that effect is wanted.
