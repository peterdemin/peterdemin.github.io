Turning the coupled problem into a numerical calculation
--------------------------------------------------------

Imagine splitting the air into small boxes and the cloth into small patches.
A computer can store a finite list of velocities, pressures, positions, and
forces, not values at infinitely many points. **Discretization** replaces
continuous equations by equations for that finite list. It introduces
approximation error even if the physical equations are appropriate.

A **mesh** is the collection of boxes or patches and their connections.
A **node** is a mesh point. A **time step** advances the calculation by a
chosen interval, such as an illustrative 0.001 s. Smaller steps give more
updates but do not automatically correct missing physics.

From conservation to finite-volume equations
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

A **finite-volume method** integrates a conservation law over each air cell.
A **flux** is an amount crossing a surface per time. For mass, a whole-face
flux is in kg/s. A positive outward flux loses mass from the cell; a negative
one gains it. Adjacent cells share the same face: mass leaving one enters
the other.

Let :math:`m` be mass in a fixed cell (kg), :math:`t` time (s), and
:math:`\Phi_j` the signed outward mass flux across its face numbered
:math:`j` (kg/s). The index is necessary to distinguish the different faces.
The finite sum :math:`\sum_j` adds all face contributions.
Mass conservation with no internal source becomes

.. math::

    \frac{dm}{dt}+\sum_j\Phi_j=0.

Both terms have units kg/s.
In a fixed incompressible cell, its volume and density stay fixed, so
:math:`dm/dt=0` and total outward flux must be zero. If 0.002 kg/s enters,
0.002 kg/s must leave. A prediction of 0.003 kg/s leaving would violate
that condition; a plausible-looking velocity picture would not excuse it.

This cell equation is the integral mass law approximated by face fluxes.
`MIT's finite-volume lecture <https://ocw.mit.edu/courses/2-29-numerical-fluid-mechanics-spring-2015/07fd2c48de5c22978e055e01a18a50de_MIT2_29S15_Lecture15.pdf#page=6>`_,
slides 6 and 21–23, develops this construction. Momentum uses related cell
balances plus surface pressure and viscous forces.

A **finite-element method** instead describes variation within connected
patches using simple functions and solves weighted force or conservation
balances. For cloth it approximates displacement, the change of position, and
strain. It can also be used for fluids. The physics does not choose one of
these numerical methods automatically.

Moving surfaces require special care
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

The **interface** is the shared air/cloth surface. As cloth moves, the fluid
method must still obey the no-penetration and no-slip conditions from Chapter 3.

One option is a **moving mesh**, in which fluid cells change with the cloth.
Flux then depends on air velocity relative to moving cell faces; even a still
air field must not gain or lose fictitious mass just because a cell changes
volume. A second option is an **immersed interface**, placing the moving
cloth inside a mesh that does not follow it. Special force or boundary
treatment imposes the cloth condition inside those cells.

Making only the cloth patches smaller does not resolve the thin air
**boundary layer**, the region where velocity changes rapidly near cloth.
Both representations and their interaction need resolution tests.

A physical fluid/cloth step
~~~~~~~~~~~~~~~~~~~~~~~~~~~

A **partitioned** solver calculates air and cloth in separate solves.
A **solve** determines the values satisfying the current discrete equations.
A **subiteration** repeats those solves within the same time step, rather
than advancing to a later physical time.

A typical strongly coupled step is:

1. Predict the cloth's next position and velocity.
2. Solve airflow with that moving cloth boundary.
3. Add surface air forces and transfer them to cloth nodes.
4. Solve cloth motion with air, gravity, elasticity, and fixed attachments.
5. Repeat within the step until interface positions, velocities, and forces
   agree to a chosen tolerance, then accept the step.

A **tolerance** is the allowed mismatch before stopping iteration.
For illustration one might test a position mismatch below 0.0001 m and a
force mismatch below 0.01 N, but suitable values depend on the desired error,
mesh, and loading. These are not universal settings.

**Strong coupling** means enforcing that mutual agreement sufficiently well
within the step. **Weak coupling** typically uses just one pass or stale
interface data, creating a lag in feedback. A **monolithic** solver instead
solves air and cloth unknowns as one combined system.

Transferred force must be equal and opposite: air pushes cloth and cloth
pushes air. The transfer should also preserve work, force along displacement,
rather than merely preserve a vector sum. For example, copying the correct
force to the wrong point can change its turning effect and the energy
exchanged.

Why added mass can make this hard
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

To accelerate cloth, some surrounding air must accelerate too. This extra
fluid contribution to the needed force is called **added mass**; it is not
extra cloth sewn onto the sail. A very light sheet can consequently be
difficult to couple to incompressible air.

The separate fluid and cloth calculations may remain stable while their
weakly coupled combination becomes unstable, producing growing spurious
motion. `Causin, Gerbeau, and Nobile (2005) <https://air.unimi.it/handle/2434/17371>`_
analyze this effect for incompressible fluid and thin elastic structures.
Their analysis is not a measured flutter prediction for our sail.

Smaller steps, more interface subiterations, or a stronger coupling method
address numerical coupling error. **Damping**, reduction of motion, may also
suppress instability, but arbitrary extra damping can hide or alter physical
oscillations. Chapters 7 and 8 explain why the browser's frozen-flow,
strongly damped relaxation is not this full moving-interface calculation.
