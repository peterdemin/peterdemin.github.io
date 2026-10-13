What would make the prediction accurate?
----------------------------------------

Suppose a calculation predicts a sideways force of 100 N. Do we need to know
it within 20 N, 2 N, or 0.2 N? There is no useful claim of “accurate” without
saying what quantity matters and what error is acceptable.

An **observable** is a quantity we can compare, such as cloth shape, total
force, local pressure, or frequency, the number of oscillations per second
(Hz = 1/s). Different observables can have different errors in the same run.

**Verification** asks whether the program solves its chosen mathematical
model correctly. **Validation** asks whether that model and calculation
predict measurements of the physical system. NASA distinguishes these in its
`verification and validation overview <https://www.grc.nasa.gov/www/wind/valid/tutorial/overview.html>`_.
Solving the wrong physical approximation more precisely is not validation.

Choose comparable physical conditions
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Airflow depends on size, speed, density, and viscosity. Before a useful
comparison, define:

- :math:`\rho`: air density (kg/m³); choose 1.225 for the example.
- :math:`U`: incoming speed (m/s); take 6 for the example.
- :math:`c`: representative chord, the width along the flow (m); choose
  1 m as a comparison length, not the whole changing outline's width.
- :math:`\eta`: dynamic viscosity (Pa s); use the illustrative
  :math:`1.8\times10^{-5}` from :doc:`Airflow model <03-airflow>`.

The **Reynolds number**, written :math:`\mathrm{Re}`, compares acceleration
effects with viscous effects on this speed and length scale:

.. math::

    \mathrm{Re}=\frac{\rho U c}{\eta}.

The units cancel. Our example gives

.. math::

    \mathrm{Re}=
    \frac{(1.225\,\text{kg/m}^3)(6\,\text{m/s})(1\,\text{m})}
    {1.8\times10^{-5}\,\text{Pa s}}
    \approx4.08\times10^5.

`NASA's Reynolds-number explanation <https://www.grc.nasa.gov/www/k-12/airplane/reynolds.html>`_
derives this ratio. It helps compare experiments, but the same Reynolds number
does not guarantee the same cloth shape or tell us precisely where separation
begins. **Separation** is air peeling away from cloth; **turbulence** is
irregular motion over many sizes of swirling region. Predicting them requires
suitable equations, resolution, and possibly additional turbulence models.

Measure rather than invent the material
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Record the manufactured cut and seams, where the cloth is attached, its mass
per area, and force versus stretching, shear, and bending. **Pretension** is
tension applied before wind loading. **Permeability** is ease of air passage
through cloth. Measure these if relevant. Warp and weft are the two crossing
thread families; testing both matters even if a teaching example chooses equal
stiffness.

**Calibration** chooses parameters to fit measured behavior. To test predictive
value, calibrate on some conditions and validate on different ones. Fitting
every experiment is not an independent prediction. Record air speed,
direction, fluctuations, and properties too. The illustrative stiffnesses in
:doc:`Elastic cloth model <01-cloth>` are not measurements of this sail.

Make the numerical calculation more precise
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**Spatial resolution** is how finely space is divided.
A **refinement study** repeats the same physical problem with smaller mesh
cells or patches. Refine cloth and air separately as well as together.
Resolve the **boundary layer**, the thin air region with rapid velocity change
near cloth, free edges, and the disturbed downstream **wake**.
Move the artificial outer boundaries farther away to check their influence.

**Temporal resolution** is the size of the time step.
Reduce it while keeping other errors small. More image frames do not
necessarily mean smaller simulation steps.

**Iterative resolution** concerns repeated attempts to satisfy equations
within a step. Tighten permitted equation mismatch and increase air/cloth
subiterations. **Convergence** means predictions approach a limiting value
under these changes, rather than merely remaining finite.

For a simple comparison, let :math:`Q_f` and :math:`Q_c` be the same scalar
observable on a finer and coarser calculation. Subscripts name “fine” and
“coarse,” not different physics. Both have the same units, for example N for
force. Let :math:`e` be their relative difference, with no units. Vertical
bars mean absolute value, ignoring sign. If :math:`Q_f` is nonzero,

.. math::

    e=\frac{|Q_f-Q_c|}{|Q_f|}.

A finer value of 100 N versus a coarser 95 N gives :math:`e=0.05`, or 5%.
This formula is just a normalized difference, not an error estimate against
nature. Near zero, compare the absolute difference against a documented
scale instead.

NASA's `spatial-convergence tutorial <https://www.grc.nasa.gov/www/wind/valid/tutorial/spatconv.html>`_
explains more rigorous refinement assessments, and its
`temporal-convergence tutorial <https://www.grc.nasa.gov/www/wind/valid/tutorial/tempconv.html>`_
treats time steps. Two grids alone do not establish a reliable convergence
rate. Refinement cannot recover viscosity, wake history, or cloth behavior
that the chosen model leaves out.

Compare with an experiment and its uncertainty
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Use a fixed mast and boom in controlled airflow. Measure three-dimensional
shape, total forces, support reactions, local pressures where feasible, and
air velocities or flow visualization. A **support reaction** is the force
needed to hold an attachment still. Repeat conditions and estimate
**measurement uncertainty**, how much the measured value could differ from
the unknown true value.

For illustration, a prediction of 100 N and a measurement of 99 N with
uncertainty ±3 N are compatible with that measurement, but do not establish
1% prediction accuracy. Agreement could also result from compensating errors.
NASA's `validation assessment <https://www.grc.nasa.gov/www/wind/valid/tutorial/valassess.html>`_
discusses comparison with experimental evidence.

Keep errors distinct: wrong material properties, missing physics, finite mesh
and time-step errors, coupling lag, and measurement uncertainty.
A **residual** is the amount by which the current numbers fail to satisfy
their chosen equations. A tiny linear-system residual shows that one algebraic
solve was accurate; it does not show the model predicts reality. This is why
accuracy must be assessed before interpreting an attractive browser scene.
