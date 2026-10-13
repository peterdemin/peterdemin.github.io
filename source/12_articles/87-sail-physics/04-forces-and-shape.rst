Loads change shape, and supports close the load path
----------------------------------------------------

Imagine pressure on one face exceeding the other by 10 Pa. On a small
0.10 m² patch, a uniform difference would push with 1 N perpendicular to
the cloth. This is an illustrative load, not measured sail pressure.
Air friction can also exert force along the patch.

From air motion to surface force
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

A **normal** points perpendicular to a surface; a **tangent** runs along it.
Let :math:`\mathbf{n}` be a unit normal, a dimensionless vector of length
one. Label the face it points toward “plus” and the other “minus.”
These labels are not automatically high- and low-pressure faces.

Use :math:`p` for air pressure (Pa), :math:`\mathbf{u}` for air velocity
(m/s), and :math:`\eta` for dynamic viscosity (Pa s), as in
:doc:`Airflow model <03-airflow>`.
Choose :math:`\eta=1.8\times10^{-5}` Pa s only for illustrative calculations.

A **stress tensor**, written :math:`\boldsymbol{\sigma}`, is a table of
nine numbers organizing force per area in different directions on differently
oriented surfaces. It has units Pa. The table times a unit
normal gives a force-per-area vector.

Before its equation, :math:`\mathbf{I}` is the identity table, which leaves
a vector unchanged when multiplied by it. :math:`\nabla\mathbf{u}` is the
table of spatial rates of velocity change (1/s).
A superscript :math:`T` means transpose, swapping rows and columns.
Adding the table to its transpose selects deformation, rather than a simple
turning of the whole air parcel. For incompressible Newtonian air,

.. math::

    \boldsymbol{\sigma}
    =-p\mathbf{I}+\eta\left[\nabla\mathbf{u}
    +(\nabla\mathbf{u})^T\right].

The first term is compressive pressure; the second is viscous stress.
Their derivation and the force-per-area rule are in
`MIT's stress and viscosity notes <https://ocw.mit.edu/courses/18-354j-nonlinear-dynamics-ii-continuum-systems-spring-2015/6f1477ffaa90b8c93556120294eecd64_MIT18_354JS15_Ch13.pdf#page=1>`_,
equations (338)–(345). Our formula includes pressure as well as viscosity.

Write :math:`\boldsymbol{\sigma}^{+},\boldsymbol{\sigma}^{-}` for stress
on the two faces and :math:`p^{+},p^{-}` for their pressures. Superscripts
here label faces, not powers. Let :math:`\mathbf{q}` be the net air force
per current cloth area (N/m²).
The air on the plus face acts through the direction :math:`\mathbf{n}`;
the minus-face direction is its negative. Summing these forces gives

.. math::

    \mathbf{q}=(\boldsymbol{\sigma}^{+}
    -\boldsymbol{\sigma}^{-})\mathbf{n}.

Without viscous stress, this reduces to pressure alone:

.. math::

    \mathbf{q}=(p^{-}-p^{+})\mathbf{n}.

Higher minus-face pressure pushes toward the plus face, as in our example.
Reversing the labels reverses the normal too, leaving the physical force
unchanged. This sign follows from the two face forces; it is not an extra
empirical law.

Summing loads over the cloth
~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Let :math:`S` be the current cloth surface and :math:`dA` an arbitrarily
small patch of its current area (m²). Unlike the original area element
:math:`dA_0` in :doc:`Elastic cloth model <01-cloth>`, this area can change
when cloth stretches.
Let :math:`\mathbf{F}` be the whole sail's air force (N). An integral adds patch forces:

.. math::

    \mathbf{F}=\int_S\mathbf{q}\,dA.

For a uniform flat patch this is just force per area times area. For a curved
sail the force direction varies, so the vector contributions must be added,
not just their positive magnitudes.

What accelerates a cloth patch?
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**Inertia** is the resistance of mass to acceleration. Newton's law is force
equals mass times acceleration, not force equals velocity.
To account for cloth mass, use original area as in
:doc:`Elastic cloth model <01-cloth>`.

Before the next equation, define:

- :math:`\mu_0`: mass per original area, 0.22 kg/m² in our example.
- :math:`\mathbf{r}`: a cloth point's current position (m).
  :math:`d^2\mathbf{r}/dt^2` is its acceleration (m/s²), following the
  same point; it means take its time derivative twice.
- :math:`J=dA/dA_0`: dimensionless local area ratio. A patch changing from
  0.10 to 0.11 m² has :math:`J=1.10`.
- :math:`\mathbf{f}`: internal elastic force per original area (N/m²),
  transmitted by neighboring cloth.
- :math:`\mathbf{f}_d`: force per original area associated with physical
  energy loss (N/m²); the subscript names dissipation, conversion of
  mechanical energy to heat or other untracked forms.
- :math:`\mathbf{g}`: gravity, choose (0, −9.81, 0) m/s².

Then the patch balance is

.. math::

    \mu_0\frac{d^2\mathbf{r}}{dt^2}
    =\mathbf{f}+J\mathbf{q}+\mu_0\mathbf{g}+\mathbf{f}_d.

Every term is force per original area, in N/m².
The factor :math:`J` converts air force per current area to original-area
accounting; it does not create a new force. Dissipation requires measured
material behavior, not a convenient arbitrary damping value.

The relation is Newton's law applied to a material patch; see
`OpenStax's discussion of Newton's second law <https://openstax.org/books/university-physics-volume-1/pages/5-3-newtons-second-law>`_.
The area conversion follows from equality of the force on the same patch.

Where does the internal elastic force come from?
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Let :math:`E=E_m+E_b` be the sum of stretching/shearing and bending energy
from :doc:`Elastic cloth model <01-cloth>` (J). An elastic force acts in the
direction of decreasing
energy. In a one-direction example, let :math:`s` be displacement (m) and
:math:`f` the corresponding elastic force (N). Then

.. math::

    f=-\frac{dE}{ds}.

The minus sign means that extending a spring pulls back toward smaller
extension. For a whole sheet this same principle uses a small displacement
:math:`\delta\mathbf{r}` at each point and the resulting energy change
:math:`\delta E`, measured in joules; the trial displacement is in metres.
Here :math:`\delta` means an infinitesimal trial change, not a new time step.
As in :doc:`Elastic cloth model <01-cloth>`, :math:`S_0` is the original
sheet and :math:`dA_0` is
a tiny original-area patch (m²). With attachments fixed,

.. math::

    \delta E=-\int_{S_0}\mathbf{f}\cdot\delta\mathbf{r}\,dA_0.

The dot selects force along the trial displacement. Force per area times
displacement times area has units J. This is the continuous counterpart of
the spring rule, expressing work and stored energy; it is the principle used
in `MIT's variational plate derivation <https://ocw.mit.edu/courses/2-081j-plates-and-shells-spring-2007/1bd32d641a2b41ca518591d981405393_lecturenote.pdf#page=22>`_,
Section 3.1.2. Here “variational” means testing arbitrarily small shape changes.
One still needs the chosen material energy and attachment conditions.

Why the supports matter
~~~~~~~~~~~~~~~~~~~~~~~

**Static equilibrium** means a time-independent shape with no acceleration.
Let :math:`M` be total cloth mass (kg), and :math:`\mathbf{R}` the total
mast/boom support reaction on it (N). Internal forces transmit load to the
supports but do not hold up the whole sheet without an external reaction.
At equilibrium,

.. math::

    \mathbf{F}+M\mathbf{g}+\mathbf{R}=\mathbf{0}.

For example, an illustrative 100 N sideways air load requires an opposite
sideways support reaction as well as support for weight. Loads travel through
cloth into mast and boom, then into the ground.

A **moment**, or torque, is a force's turning effect about a point (N m).
Moments must also balance; force balance alone cannot fix where a force acts.
See `OpenStax on equilibrium conditions <https://openstax.org/books/university-physics-volume-1/pages/12-1-conditions-for-static-equilibrium>`_.
Fixed supports transmit force without doing work because they do not move.
During cloth motion, external forces change total momentum rather than
necessarily adding to zero. Slow motion under artificial damping is not
proof of physical equilibrium.

Lift and drag are a way of describing the same force
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Let :math:`\mathbf{W}` be incoming velocity (m/s) and :math:`U` its
nonzero speed. Define the unit wind direction :math:`\mathbf{e}`,
drag :math:`D` (N), and remaining transverse air force :math:`\mathbf{L}`
(N). “Transverse” means perpendicular to incoming wind, not necessarily
horizontal. The dot product projects onto a direction:

.. math::

    \mathbf{e}=\frac{\mathbf{W}}{U},\qquad
    D=\mathbf{F}\cdot\mathbf{e},\qquad
    \mathbf{L}=\mathbf{F}-D\mathbf{e}.

This is geometric decomposition, not two additional force mechanisms.
With wind along the boom and an illustrative air force (10, 3, 40) N,
drag is 10 N and transverse force is (0, 3, 40) N.
The norm :math:`\|\mathbf{L}\|` means its magnitude:
approximately 40.11 N, without a sign. A signed horizontal component is
different. Weight and reactions are not included in aerodynamic force
:math:`\mathbf{F}`. At zero wind there is no unique wind direction for this
decomposition.
