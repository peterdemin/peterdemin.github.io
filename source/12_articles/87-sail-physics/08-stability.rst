Stability is necessary, but different from accuracy
---------------------------------------------------

A calculation is **numerically stable** when small errors do not grow into
uncontrolled motion or unusable numbers. This is different from predicting
the physical sail accurately. A heavily damped, overly stiff sheet can be
stable and still give the wrong shape or settling time.

The flag's prediction/correction workflow is described in
:doc:`the lunar flag experiment <02-moon-flag>`.
Here the detailed example is the stiff-link sail approximation from
:doc:`Deriving the browser approximation <07-browser-approximation>`, not the
lunar flag's triangle-strain and hinge constraints. Its **extended
position-based dynamics**, XPBD, uses compliant distance links: rules allowing
some length change under force instead of demanding perfectly rigid links.

One link, with all symbols defined
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Consider endpoints with current position vectors :math:`\mathbf r_1` and
:math:`\mathbf r_2`, both in metres. The subscripts merely identify the two
points. Let :math:`d` be their current separation (m),
:math:`\ell_0` their original separation (m), and :math:`e` their signed
length error (m). Double bars mean vector length, so

.. math::

    d=\lVert\mathbf r_1-\mathbf r_2\rVert,
    \qquad e=d-\ell_0.

Positive error means a stretched link; negative error means a shortened one.
For example, an original 0.20 m link stretched to 0.201 m has error 0.001 m.
This is a length error, not dimensionless strain: its strain is 0.001/0.20,
or 0.5%, using the definition in :doc:`Elastic cloth model <01-cloth>`.

Let :math:`k` be link stiffness (N/m), :math:`\alpha` its compliance (m/N),
and :math:`h` the time-step duration (s).
Compliance means extension per applied force, the reciprocal of stiffness.
For the update we also need a scaled compliance :math:`a`, in 1/kg:

.. math::

    \alpha=\frac1k,
    \qquad a=\frac{\alpha}{h^2}.

Because N = kg m/s², m/N = s²/kg, and dividing by :math:`h^2` gives 1/kg.
For the chosen :math:`k=10^7` N/m and :math:`h=1/240` s,
:math:`\alpha=10^{-7}` m/N and :math:`a=0.00576` per kilogram.
These are numerical link parameters, not measured sail-cloth properties.

For free endpoints, let :math:`w_1,w_2` be their inverse masses (1/kg);
thus a 0.02 kg point has inverse mass 50 per kilogram.
For a pinned endpoint set its update weight to zero instead.
That does not erase its physical mass; it prevents position correction.

Let :math:`\lambda` be an accumulated scalar correction quantity, initially
zero for each link at each time step, and :math:`\Delta\lambda` its next
increment. Both have units kg m. Despite its name, this **constraint multiplier**
is not itself a force in newtons. The XPBD correction for one distance link is

.. math::

    \Delta\lambda=\frac{-e-a\lambda}{w_1+w_2+a}.

This specializes equation (18) of
`Macklin, Müller, and Chentanez's XPBD paper`_ to a distance link:
moving an endpoint along the link changes length by the same amount,
so the corresponding direction vectors have length one.
The numerator is in metres and the denominator in 1/kg, giving kg m.

Let :math:`\mathbf n` be the dimensionless unit vector from endpoint 2
toward endpoint 1. It is the separation vector divided by :math:`d`.
Let :math:`\Delta\mathbf r_1,\Delta\mathbf r_2` be the position
corrections (m). Then

.. math::

    \mathbf n=\frac{\mathbf r_1-\mathbf r_2}{d},
    \qquad
    \Delta\mathbf r_1=w_1\mathbf n\,\Delta\lambda,
    \qquad
    \Delta\mathbf r_2=-w_2\mathbf n\,\Delta\lambda.

Add each correction to its endpoint position and add
:math:`\Delta\lambda` to :math:`\lambda`.
Equation (17) of `Macklin, Müller, and Chentanez's XPBD paper`_ supplies the
position-update principle. Here we have written out both endpoint directions
rather than leaving a derivative of the constraint unexplained.
When :math:`d=0` the direction is undefined; the implementation must guard
against that division.

For a stretched link starting with :math:`\lambda=0`, the multiplier
increment is negative. Endpoint 1 moves opposite :math:`\mathbf n` and
endpoint 2 along it: they move closer together. A lighter free endpoint moves
farther because its inverse mass is larger; a pin does not move.

A small numerical example
~~~~~~~~~~~~~~~~~~~~~~~~~

Take two free endpoints of 0.02 kg each, initial error 0.001 m, and the
stiffness and time step above. With initial multiplier zero, one correction is

.. math::

    \Delta\lambda
    =\frac{-0.001\,\text{m}}
    {(50+50+0.00576)\,\text{kg}^{-1}}
    \approx-9.9994\times10^{-6}\,\text{kg m}.

Each endpoint moves about 0.00049997 m toward the other.
The remaining extension is about :math:`5.76\times10^{-8}` m.
The finite compliance leaves a tiny nonzero extension rather than imposing
a perfectly rigid length. This is an isolated two-point example; the whole
cloth has many links whose corrections affect one another.

The implementation visits links one after another, immediately using each
updated position for the next link. This is called **Gauss–Seidel iteration**.
A complete pass is one **sweep**; the chosen update performs 80 sweeps.
Enough repetitions are needed for neighboring link requirements to agree.
Finite compliance and unfinished iteration are distinct sources of remaining
extension. Neither the method's name nor a fixed sweep count proves that
the actual solve has converged.

Predicting motion and deliberately damping it
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Before link corrections, the demo predicts each free node's motion from
incoming load and gravity. For one node, let :math:`\mathbf v` be its current
velocity (m/s), :math:`m` its mass (kg), :math:`\mathbf F` its applied
aerodynamic force (N), and :math:`\mathbf g=(0,-9.81,0)` m/s² gravity.
Internal elastic forces are handled by link corrections, not added again
to :math:`\mathbf F` here.

Choose damping rate :math:`\beta=100` per second.
**Damping** here means deliberately reducing predicted velocity.
Let :math:`\mathbf v^*` be the predicted velocity (m/s); the star labels a
temporary prediction, not multiplication.
The exponential function :math:`\exp` converts the dimensionless number
:math:`-\beta h` to a positive reduction factor:

.. math::

    \mathbf v^*
    =\exp(-\beta h)
    \left[\mathbf v+h\left(\frac{\mathbf F}{m}+\mathbf g\right)\right].

Force divided by mass and gravity are both accelerations in m/s².
Multiplying their sum by :math:`h` gives a velocity change.
At :math:`h=1/240` s the reduction factor is about 0.6592:
only about 66% of the bracketed velocity remains after this damping operation.

This exponential factor is a choice in our implementation, not the
constraint-damping formulation in Section 5 of the XPBD paper.
It helps the sheet relax numerically but is neither measured fabric damping
nor computed aerodynamic dissipation.

Let :math:`\mathbf r` be the position at the start of the step and
:math:`\mathbf r^*` its predicted position, both in metres:

.. math::

    \mathbf r^*=\mathbf r+h\mathbf v^*.

Starting from that prediction, apply the link corrections above.
Call the accepted corrected position :math:`\mathbf r_{\text{new}}` and
the reconstructed velocity :math:`\mathbf v_{\text{new}}` (m/s).
The word "new" labels a time-step state:

.. math::

    \mathbf v_{\text{new}}=\frac{\mathbf r_{\text{new}}-\mathbf r}{h}.

This follows Algorithm 1's displacement-based velocity reconstruction in
`Macklin, Müller, and Chentanez's XPBD paper`_.
The displayed simulated time does not establish physical settling time
or **flutter**, an oscillation sustained by feedback between moving cloth
and air forces. Heavy artificial damping can hide such motion.

Failure checks are not material laws
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

A **singular** linear system does not uniquely determine the required
unknowns. **Nonfinite** values, such as infinity or an undefined division,
cannot represent the intended calculation. These conditions, excessive
circulation, and excessive link strain trigger numerical failure checks.

A step above 8% stretching/diagonal-link strain is rolled back and the run
stopped. The rollback restores the last accepted state rather than displaying
the failed one. This 8% threshold is a safeguard, not a measured tear limit
or an aerodynamic stall criterion. **Stall** means a loss of lifting
performance associated with substantial flow separation; an extension limit
does not calculate it.

An unsupported wind angle is different again: the chosen fluid model is not
trusted there, even if its equations could be solved. The interface must
report that limitation, not silently present withheld loads as physical zero.

What the internal checks establish
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Checks exercise summed-force conservation, fixed anchors, mirror symmetry,
speed-squared force scaling, and residuals at control points.
A **residual** is the mismatch left in an equation after inserting a computed
solution. A small residual says that equation was nearly satisfied, not that
the equation is the right physical model.

For a flat nominal outline at 6 m/s and 10 degrees, lattice refinement gives:

.. list-table:: Flat-sail numerical refinement
    :header-rows: 1

    * - Panels
      - Lift magnitude (N)
      - Induced drag (N)
    * - 32
      - 93.77
      - 6.22
    * - 60
      - 94.41
      - 6.36
    * - 112
      - 94.86
      - 6.48

Induced drag is the along-wind part of the vortex-derived force, excluding
the added empirical friction term. Relative to 112 panels, the 60-panel
lift differs by about 0.47% and induced drag by about 1.85%.
These use the relative-difference formula in
:doc:`What would make the prediction accurate? <06-accuracy>`. Three meshes do not by
themselves bound the remaining error.

This check uses the nominal flat outline, not a converged coupled shape of
the manufactured cut. It tests consistency under that particular lattice
refinement, not agreement with measured sail forces.
Repeated fills at ±15 degrees also check that free cloth can move to either
side without a reset or a prescribed sign of bulge.
They do not validate its transient motion.

The next step toward trustworthy prediction is therefore not merely more
frames per second. It is measured material properties, a justified fluid
model, separate space/time/coupling convergence, and validation against
measurements of the quantities we actually want to know.

.. _Macklin, Müller, and Chentanez's XPBD paper: https://matthias-research.github.io/pages/publications/XPBD.pdf
