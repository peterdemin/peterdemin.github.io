Elastic cloth model
-------------------

Material weight
~~~~~~~~~~~~~~~

Let's start with a piece of cloth laid flat without stretching it.
Let :math:`A` be its area in square metres and :math:`\mu` its density (kg/m²).
For uniform cloth, meaning the same mass per area throughout, its total mass :math:`M` is:

.. math::

    M=\mu A.

Folding or bending this piece, making its surface turn rather than stay flat, does not change its mass.
Nor does its mass change if it stretches: the same material is still present.

Gravity gives this mass a downward force:

.. math::

    \vec{F}_g = M\vec{g}.

Where:

- :math:`\vec{F}_g` is the gravitational force in Newtons (N).
- :math:`\vec{g}` is gravitational acceleration near sea level (9.81 m/s²), the change of velocity per second caused by gravity.

Threads, extension, and shear
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

A *membrane* is an ideal thin sheet that resists changes of length and changes
of angle within its surface, but has no bending resistance.
These two changes are called stretching and shearing; we explain each below.
Real cloth has some bending resistance, which we model separately.
This distinction explains how a sheet can be difficult to stretch but easy to fold.

*Stiffness* describes how much load, or applied force, is needed for a given
deformation, meaning a change of shape or size.
More stiffness means more load for the same deformation.
In this chapter, *elastic energy* means energy stored in an ideal reversible deformation:
it can be returned as the load is removed and the cloth returns toward its original shape.

Woven cloth is made by crossing two sets of threads over and under each other.
These crossing thread families are called *warp* and *weft*.
Call the warp direction 1 and the weft direction 2.
They initially cross at right angles in undeformed patch.

For modelling sail cloth, we can assume equal extension stiffness along both thread directions.
These directions belong to the cloth and rotate with it;
they are not necessarily the world's horizontal and vertical axes.
To understand extension, mark a short line along either thread direction.
Let its original, unstretched length be :math:`\ell_0` and its current length
be :math:`\ell`, both in metres.

*Engineering strain*, written :math:`\epsilon`, is the fractional change in length, with no units,
(see `MIT: The Concept of Strain`_ Section 2.1, equation 2.2a):

.. math::

    \epsilon=\frac{\ell-\ell_0}{\ell_0}.

A 0.50 m warp line becoming 0.505 m long has :math:`\epsilon=0.01`, or 1% extension.
Negative strain means shortening.

Equal stiffness does not mean equal extension.
Pull a patch along one thread direction while holding its length fixed in the other:
the pulled direction can lengthen while the held direction does not.
Different loads or constraints can therefore produce different strains
even when the threads have equal extension stiffness.

*Shear* is an angle change.
Imagine a rectangular patch becoming a slanted parallelogram, with opposite sides still parallel,
while its sides barely change length.

Let :math:`\phi` be the current angle between its thread directions, in radians.
A right angle is :math:`\pi/2` radians, or 90 degrees.

Let :math:`\gamma` name dimensionless engineering shear,
choosing its positive sign to mean that the initially right angle closes.
For small angle changes,

.. math::

    \gamma\approx\frac{\pi}{2}-\phi.

Closing the angle by 0.10 rad, approximately 5.73 degrees, corresponds to :math:`\gamma\approx0.10`.
This angle interpretation is suitable for small changes, not an exact law for large deformations.

The angle-change interpretation is developed in `MIT: Shear as an Angle Change`_, Section 2.3.
Those notes use a shear quantity equal to half the small angle change;
our engineering shear :math:`\gamma` uses the whole change,
so the convention must be accounted for when comparing formulas.

Different parts of a sail can stretch or shear by different amounts.
To find the whole sheet's energy, we therefore need to add the local energy of all its small patches.
This is where an area integral becomes useful.

Let :math:`S_0` be the original, unstretched sheet over which we add those contributions.
Let :math:`dA_0` be an infinitesimal area: an arbitrarily tiny patch of that original sheet, in m².
The symbol :math:`\int_{S_0}` means to sum across it.
For the earlier example patch,
its whole original area is :math:`A_0=0.10` m², the area previously called
:math:`A`; :math:`dA_0` is a tiny part of it.

The energy must account for both thread directions.
Write :math:`\epsilon_1` for the value of the same strain definition measured along warp, and
:math:`\epsilon_2` for its value along weft.

Before writing the energy, let's define three kinds of material-dependent stiffnesses each using N/m unit:

- :math:`K`: *extension stiffness*, resistance to length change in thread direction.
- :math:`C`: *coupling stiffness*. Coupling means extension in one thread
  direction affects the force needed in the other.
- :math:`K_s`: *Membrane shear stiffness*, resistance to changing
  the angle between threads per width of sheet.

Let :math:`E_m` be elastic energy stored by stretching and shearing the cloth, measured in joules (J):

.. math::

    E_m = \frac12\int_{S_0}
    \left[K(\epsilon_1^2+\epsilon_2^2)
    +2C\epsilon_1\epsilon_2+K_s\gamma^2\right]dA_0.

This is a specialization of the thin-sheet extension law in `Roylance:
Laminated Composite Plates`_, equations (4) and (20)–(21), combined with the
linear elastic work-to-energy principle in `Alberta: Linear Elastic Strain
Energy`_, equation (2).
We choose equal directional extension stiffness and
no direct extension-to-shear coupling; bending is treated separately.

Why one half? If a pulling force increases in direct proportion to extension,
the force rises from zero to its final value.
Its average over that extension is half its final value, and work is average force times extension.
The same principle gives the quadratic energy above, with the coupling term accounting
for the interaction of the two extensions.

An illustrative material, with units attached
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

The table collects our illustrative stiffnesses alongside the chosen density,
gravity, and bending parameters. The extension stiffness is equal in the two
thread directions.

Two additional quantities describe bending.
*Curvature* is how much a surface turns per unit distance along it, measured in 1/m;
flat cloth has zero curvature.
We use :math:`\kappa` for its current curvature and :math:`\kappa_0` for its original curvature.
*Bending rigidity* :math:`B` is the stiffness resisting a change of curvature.
Its energy calculation comes later, separately from the stretching and shearing energy.

.. list-table:: Chosen constants and reference condition
    :header-rows: 1
    :widths: 20 35 45

    * - Quantity
      - Example value in SI units
      - Meaning
    * - :math:`\mu_0`
      - 0.22 kg/m²
      - Mass per manufactured area; matches the demo
    * - :math:`\mathbf{g}`
      - (0, −9.81, 0) m/s²
      - Chosen near-Earth gravity for the sail example
    * - :math:`K`
      - 20,000 N/m
      - Extension stiffness in both thread directions
    * - :math:`C`
      - 2,000 N/m
      - Coupling between warp and weft extension
    * - :math:`K_s`
      - 500 N/m
      - Engineering-shear coefficient
    * - :math:`B`
      - :math:`2\times10^{-4}` N m
      - Illustrative bending rigidity, introduced below

Before writing the results, let :math:`N_1,N_2,N_{12}` name these forces per width, in N/m:

- :math:`N_1`: the pulling force along warp,
- :math:`N_2`: the pulling force along weft,
- :math:`N{12}`: the sliding force associated with shear between the two thread directions.

They are often called membrane force resultants because the forces
through the sheet's thickness have been combined into a force per width.
For our energy expression, the results are

.. math::

    N_1=K\epsilon_1+C\epsilon_2,
    \qquad N_2=C\epsilon_1+K\epsilon_2,
    \qquad N_{12}=K_s\gamma.

These are derived from our displayed energy, not independently assumed formulas.
For example, the rate of change of
:math:`K\epsilon_1^2/2+C\epsilon_1\epsilon_2` with respect to
:math:`\epsilon_1` is :math:`K\epsilon_1+C\epsilon_2`.
`Alberta: Linear Elastic Strain Energy`_ explains the underlying energy
derivative principle; here the energy is per sheet area rather than per volume.

With positive :math:`C`, stretching warp while holding weft at its original
length requires *tension*, or pulling force, along weft too.
If there is instead no pulling force along weft (:math:`N_2=0`),

.. math::

    \epsilon_2=-\frac{C}{K}\epsilon_1=-0.10\epsilon_1.

Thus 1% warp extension would accompany 0.1% weft contraction under that particular loading condition.
Which edges are held or pulled, not the material stiffnesses alone, determines the two strains.

Bending resistance
~~~~~~~~~~~~~~~~~~

Bending changes curvature without necessarily changing in-plane lengths.
An ideal membrane has none of this resistance, but a cloth model can add a
similarly simplified bending energy :math:`E_b`, measured in joules:

.. math::

    E_b = \frac12\int_{S_0}B(\kappa-\kappa_0)^2\,dA_0.

`MIT: Bending Energy`_, Section 2.2.2, equations (45)–(46), derives the
single-direction energy per area :math:`B\kappa^2/2` for a flat reference.
We rename its bending rigidity and express curvature relative to the chosen
stress-free value :math:`\kappa_0`. This scalar, single-curvature example is
not the full two-direction plate or shell energy; the source derives that
more general energy separately in equations (47)–(53).

Here :math:`B` is bending rigidity (N m), :math:`\kappa` is curvature (1/m),
and :math:`\kappa_0` is reference curvature. Use the illustrative
:math:`B=2\times10^{-4}` N m and flat reference :math:`\kappa_0=0` 1/m from
the table. A current cylindrical bend of radius 0.50 m has curvature magnitude
:math:`\kappa=2` 1/m. For our uniform patch, this example state stores

.. math::

    E_b=\frac12(2\times10^{-4}\,\text{N m})
    (2\,\text{m}^{-1})^2(0.10\,\text{m}^2)
    =4\times10^{-5}\,\text{J}.

Bending rigidity times curvature squared times area has units
N m × 1/m² × m² = N m = J.
This small example bending energy explains why the chosen sheet can bend more easily than it stretches.
A more complete thin-sheet model accounts for bending in
different directions and twisting rather than using just one curvature value.
Both energies have units of joules, but they penalize different deformations.

The constants in the table characterize our chosen material and environment;
:math:`\kappa_0` specifies its reference condition. Position (m), time (s), local strains
:math:`\epsilon_1,\epsilon_2,\gamma` (dimensionless), and current curvature
:math:`\kappa` (1/m) are evolving variables, not fixed constants.
The original sheet and patch lengths specify its chosen size and shape.
In particular, the example strains and bend above are not imposed everywhere on a sail.

Triangles and finite strain on the Moon
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

The earlier small-strain examples remain useful near the original shape.
The lunar flag needs an explicit rule for larger changes.
Its *mesh* divides the sheet into triangles, each with fixed reference area :math:`A` in m².
Give the flat reference sheet coordinates :math:`a,b` in metres along its
initially perpendicular thread directions.
These are distances in the material, not fractions of the flag's width or height.
Let :math:`\mathbf r(a,b)` be the current three-dimensional position of that material point, in metres.

The symbol :math:`\partial` describes a rate of change while the other
coordinate is held fixed.
Define two *deformation directions* :math:`\mathbf u,\mathbf v`: the changes in current position per meter of
reference distance along each thread direction.
Thus

.. math::

    \mathbf u=\frac{\partial\mathbf r}{\partial a},
    \qquad \mathbf v=\frac{\partial\mathbf r}{\partial b}.

Both are dimensionless vectors: metres divided by metres.
Their lengths are the current-to-reference length ratios along the two thread directions.
The dot product :math:`\mathbf u\cdot\mathbf v` multiplies their lengths
by the cosine of their angle; :math:`\mathbf u\cdot\mathbf u` is the
squared length of :math:`\mathbf u`. Define dimensionless strains
:math:`p,q,s` before using them in the energy:

.. math::

    p=\frac{\mathbf u\cdot\mathbf u-1}{2},
    \qquad q=\frac{\mathbf v\cdot\mathbf v-1}{2},
    \qquad s=\mathbf u\cdot\mathbf v.

These are **Green strains**, based on changes of squared lengths and their
angle. In the usual notation for the Green strain array, :math:`E_{12}` is
its off-diagonal shear entry, and :math:`s=2E_{12}`. Turning or moving the
whole triangle without deforming it leaves all its dot products unchanged.
This property is called **objectivity**: rigid motion stores no extra elastic
energy. It holds even for a large rotation.

For small changes, :math:`p\approx\epsilon_1`,
:math:`q\approx\epsilon_2`, and :math:`s\approx\gamma`, with the
engineering strains defined earlier. At larger changes they differ. A length
ratio of 1.55 means 55% engineering extension, but gives
:math:`p=(1.55^2-1)/2=0.70125` along that direction.

For the lunar sheet choose :math:`K=35` N/m, :math:`C=3.5` N/m, and
:math:`K_s=0.35` N/m. They are sheet stiffnesses, not edge spring constants.
Let :math:`w` be stored membrane energy per reference area (J/m²), and
:math:`E_\triangle` the membrane energy of one triangle (J). The chosen
finite-strain material law is

.. math::

    w=\frac12\left[K(p^2+q^2)+2Cpq+K_s s^2\right],
    \qquad E_\triangle=A w.

N/m equals J/m², so multiplying by reference area gives joules. This is a
**Saint-Venant--Kirchhoff-like sheet law**: energy is quadratic in Green
strain, although it is not quadratic in extension or vertex positions.
`Abaqus: Orthotropic Saint-Venant Kirchhoff Model`_ gives the corresponding
quadratic-in-Green-strain construction for a three-dimensional material.
Our two-direction sheet law and numerical values are choices here, not
values supplied by that example.

The lunar extension coefficient 35 N/m makes it much more compliant than the
earlier 20,000 N/m example. These are illustrative choices with no actual
material calibration. Objectivity and an explicit finite-strain rule do not
establish physical accuracy at 55% extension. In particular, we are not
extending the validity of the linear engineering-strain law to that range.

From triangle energy to forces
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

To find a force, ask how energy changes when a vertex moves. First let
:math:`\mathbf P_u,\mathbf P_v` be the vector derivatives of :math:`w`
with respect to :math:`\mathbf u,\mathbf v`. Each has units N/m. Applying
the energy derivative principle to the displayed Green-strain law gives

.. math::

    \mathbf P_u=(Kp+Cq)\mathbf u+K_s s\mathbf v,
    \qquad
    \mathbf P_v=(Cp+Kq)\mathbf v+K_s s\mathbf u.

The scalar derivatives with respect to :math:`p,q,s` are
:math:`Kp+Cq`, :math:`Cp+Kq`, and :math:`K_s s`. These are material or
reference force resultants, tied to reference area and reference directions.
They are not automatically forces per current width of stretched cloth.
The direction vectors in :math:`\mathbf P_u,\mathbf P_v` account for the
additional change from Green strain to position. Thus the earlier
small-strain force formulas cannot simply be used unchanged for large pulls.

Each triangle has three **vertices**, the simulated corner points, with
positions :math:`\mathbf r_i` in metres. The index :math:`i` labels a
vertex. Its **interpolation weight** :math:`N_i(a,b)` is dimensionless,
equals one at that vertex and zero at the other two, and changes linearly
across the triangle. The weights add to one. The summation symbol
:math:`\sum_i` means add the three contributions. Linear triangle
interpolation means

.. math::

    \mathbf r(a,b)=\sum_i N_i(a,b)\mathbf r_i.

Define :math:`b_i=\partial N_i/\partial a` and
:math:`c_i=\partial N_i/\partial b`, both in 1/m. They are constant within
a triangle and determined by its reference geometry. Let :math:`\mathbf f_i`
be that triangle's elastic force on vertex :math:`i`, in newtons. The negative
energy derivative points toward decreasing energy:

.. math::

    \mathbf f_i=-\frac{\partial E_\triangle}{\partial\mathbf r_i}
    =-A\left[b_i\mathbf P_u+c_i\mathbf P_v\right].

The units are m² × 1/m × N/m = N. A shared vertex receives contributions
from every incident triangle, meaning every triangle meeting there.

The lunar solver's elastic corrections use scalar strain modes derived from
this energy. Define three dimensionless
**modes**, or combinations of strain:
:math:`\chi_+=p+q` for extension together,
:math:`\chi_-=p-q` for extension in opposition, and
:math:`\chi_s=s` for shear. Let :math:`k_+,k_-,k_s` be their energy
coefficients in joules. Expanding the squares gives exactly the same
triangle energy:

.. math::

    E_\triangle=\frac12 k_+\chi_+^2
    +\frac12 k_-\chi_-^2+\frac12 k_s\chi_s^2,
    \qquad
    k_+=\frac{A(K+C)}{2},\quad
    k_-=\frac{A(K-C)}{2},\quad k_s=A K_s.

These coefficients multiply dimensionless squared strains, so they have
units J, not the N/m of a spring acting on extension in metres.
The symbol :math:`\nabla_{\mathbf r_i}` means a vector of rates of change
with respect to the vertex's three position components. The exact gradients
of these modes, in 1/m, are

.. math::

    \nabla_{\mathbf r_i}\chi_+=b_i\mathbf u+c_i\mathbf v,
    \qquad
    \nabla_{\mathbf r_i}\chi_-=b_i\mathbf u-c_i\mathbf v,
    \qquad
    \nabla_{\mathbf r_i}\chi_s=b_i\mathbf v+c_i\mathbf u.

This decomposition is algebra applied to our stated law, not a new measured
material law. :doc:`02b-moon-flag`
explains how the solver turns these energy-derived rules into iterative
position corrections while advancing time.

A directional extension limit
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Let :math:`u_\mathrm{len},v_\mathrm{len}` name the lengths of
:math:`\mathbf u,\mathbf v`, respectively. In every triangle, the lunar
model imposes the inequalities

.. math::

    u_\mathrm{len}\leq1.55,\qquad v_\mathrm{len}\leq1.55.

The symbol :math:`\leq` means less than or equal to. This is an upper limit
along each of the two material directions, not a limit on every diagonal or
every possible direction. Shear can change diagonal lengths even when both
listed ratios obey their limits. There is no lower length bound in these
inequalities.

As an ideal energy rule, the limit adds zero energy inside the permitted
region and infinite energy outside it: a forbidden state cannot be accepted.
Numerical corrections enforce this hard constraint only to the solver's
finite accuracy. The Green-strain energy still acts inside the region.
The cap is a teaching constraint, not evidence that the cloth is physically
validated up to 55% extension or that real fabric cannot tear.

Bending across triangle hinges
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Two triangles sharing an interior edge form a **hinge**. Their signed
**dihedral angle** :math:`\theta` measures their relative turn about that
edge; the sign distinguishes the two bending directions using a consistent
edge orientation. Let :math:`\theta_0` be its reference angle, zero for
this flat sheet. Both angles are in radians and dimensionless. The current
angle comes from the actual triangle geometry, not the distance between a
pair of vertices used as a substitute for bending.

Let :math:`L` be the shared edge's reference length in metres, and
:math:`A_\mathrm{left},A_\mathrm{right}` the two reference triangle areas in m².
They stay fixed as the cloth moves. We use :math:`D` for the **discrete hinge
rigidity**, in N m, to distinguish it from the earlier scalar bending rigidity
:math:`B`. The current illustrative choice is :math:`D=0.2` N m, tuned
to keep bending visible and spread over neighboring triangles. Its numerical
magnitude is 1,000 times the example
:math:`B=2\times10^{-4}` N m; this comparison does not establish identical
continuum bending behavior.

Let :math:`E_\mathrm{hinge}` be the total hinge bending energy in joules.
Here :math:`\sum_\mathrm{hinges}` adds contributions from all interior edges.
Our chosen discrete bending material law is

.. math::

    E_\mathrm{hinge}=\frac12\sum_\mathrm{hinges}
    D\frac{L^2}{A_\mathrm{left}+A_\mathrm{right}}
    (\theta-\theta_0)^2.

The area ratio is dimensionless, so each term has units N m = J.
`Grinspun et al.: Discrete Shells`_, equation (2), motivates this family of
geometry-weighted hinge energies. Our weights and coefficient are chosen
explicitly here; they are not the paper's literal normalization constants.
`Tamstorf and Grinspun: Discrete Bending Forces and Their Jacobians`_,
Section 2, explains forces obtained by differentiating geometric hinge-angle
energies. The full angle derivatives are beyond what we need here.

To interpret the geometric scale, define the **dual width** :math:`h` in
metres as the combined reference area divided by edge length:

.. math::

    h=\frac{A_\mathrm{left}+A_\mathrm{right}}{L}.

A triangle's area is half its base times its altitude, the perpendicular
distance from the opposite vertex to the base. Thus :math:`h` is the average
of the two opposite-vertex altitudes. For one hinge, let :math:`E_e` be its
energy in joules. The same term can be rewritten as

.. math::

    E_e=\frac12 D(Lh)
    \left(\frac{\theta-\theta_0}{h}\right)^2.

Here :math:`Lh` is a reference area and angle change divided by :math:`h`
has units 1/m, resembling the scalar curvature calculation above. This
interpretation explains the geometry scaling; it does not prove a complete
isotropic shell continuum law for arbitrary curvatures.

Cylinder energy tests make the limitation concrete. For grid orientations
of 0° and 90°, refinement approaches the scalar cylindrical bending target
with its coefficient set to :math:`D`. At 45°, the measured energies instead
approach approximately three times that target. Refinement at a fixed
orientation approaches stable energies rather than making them collapse
toward zero, but the orientation dependence remains. This specific reference
hinge sum therefore has a fixed grid directional bias. We assert agreement
with scalar cylindrical bending only for the grid-aligned cylinder tests,
not a common isotropic continuum rigidity for every orientation.

Lunar loads and mass
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

The current lunar choices are collected here separately from the original
small-strain sail example. The stiffnesses are illustrative, not measured;
the hinge coefficient is a chosen numerical material, not a measured property.

.. list-table:: Current lunar model choices
    :header-rows: 1
    :widths: 20 25 55

    * - Quantity
      - Value
      - Meaning
    * - :math:`K`
      - 35 N/m
      - Green-strain extension coefficient in both material directions
    * - :math:`C`
      - 3.5 N/m
      - Coupling between the two Green extension strains
    * - :math:`K_s`
      - 0.35 N/m
      - Green shear coefficient
    * - :math:`D`
      - 0.2 N m
      - Discrete hinge rigidity; chosen for smoothness, with grid directional bias
    * - :math:`\mu_0`
      - 0.22 kg/m²
      - Mass per reference area
    * - :math:`\mathbf g`
      - (0, −1.62, 0) m/s²
      - Lunar gravitational acceleration

The lunar flag keeps the reference mass density :math:`\mu_0=0.22` kg/m².
Let :math:`m_{i,\triangle}` be one triangle's mass contribution to one of
its three vertices, in kilograms. Each receives an equal share:

.. math::

    m_{i,\triangle}=\frac{\mu_0 A}{3}.

Add these contributions over incident triangles to get a vertex's mass.
This uses manufactured area, so stretching does not create mass.
The lunar acceleration is :math:`\mathbf g=(0,-1.62,0)` m/s². The earlier
0.022 kg patch therefore weighs 0.03564 N on the Moon, compared with
0.21582 N in our near-Earth example.

Only the flag's left edge is pinned. While dragging, the hand also prescribes
the selected point's position; releasing it removes that temporary support.
These conditions differ from the sail's luff-and-foot attachments below.
There is no self-collision treatment: separate parts of the flag can pass
through one another.

Time steps, solver sweeps and artificial velocity damping are software
choices, not membrane or bending material constants. The flag's actual
values and prediction/correction procedure are collected in
:doc:`02b-moon-flag`.
They affect motion and numerical accuracy; none supplies physical calibration.

Attachments and fullness
~~~~~~~~~~~~~~~~~~~~~~~~

To describe which points are attached, label a material point by two
coordinates :math:`\mathbf{a}`, two numbers locating it on the original
sheet. Its current position at time :math:`t` is
:math:`\mathbf{r}(\mathbf{a},t)`, in metres. The labels identify the same
piece of material as it moves; they do not prescribe its current position.
The **luff** is the edge beside the mast; the **foot** is the bottom edge along
the boom. In this model both are fixed in position. The other two edges, the
**leech** away from the mast and the **head** at the top, are free.
Let :math:`\mathbf{r}_{\text{rig}}` be the specified position of an attachment
on the fixed mast or boom, in metres. At the attachments, position is prescribed for all
time:

.. math::

    \mathbf{r}(\mathbf{a},t)=\mathbf{r}_{\text{rig}}(\mathbf{a})
    \quad\text{on the luff and foot}.

An ideal fixed attachment supplies a **support reaction**, the force needed to
hold the attached cloth in place. These prescribed positions are **boundary
conditions**: instructions for what happens at the sheet's edges. A free edge
has no attachment force or attachment bending moment, the turning effect of
a support force, although air can still load the cloth there. A real attachment
may also fix the direction the cloth leaves the support. Fixing position alone
does not impose that extra restriction on rotation.

**Fullness** means extra manufactured cloth that can form a curved bag without
requiring the threads to stretch. It comes from the cut shape and seams, the
joins between pieces of cloth, or more generally from the original lengths and
angles built into the material. It must not be confused with elastic stretch
under wind. Specifying a curved shape every frame would
remove the very question we want to solve: which shape follows from the loads?

Sources and our choices
~~~~~~~~~~~~~~~~~~~~~~~~

Try :doc:`02b-moon-flag`: pull its top-right corner, then release it under lunar gravity.
It uses the Green-strain triangle law, directional extension limits, and
geometric hinge bending described above. Its extension is much more compliant
than the small-strain sail example; its chosen hinge rigidity has a larger
numerical magnitude than the example bending rigidity. These teaching choices
are not measurements of this sailcloth or claims that real fabric cannot tear.

The linked university notes establish the mechanics principles, not measured
properties of this sail. The three membrane stiffnesses and bending rigidity
are illustrative choices. The mass per area is shared with the lunar demo;
the near-Earth gravity in the original examples is not. Matching a chosen
input does not experimentally validate it. Our examples, positivity
check, force formulas, and strip-stiffness conversion are calculated here from
the stated definitions and energy law.

The source texts use more advanced notation than this chapter. The section and
equation pointers above identify the relevant definitions or derivations;
their letter names need not match ours.

.. _`OpenStax: Mass and Weight`: https://openstax.org/books/university-physics-volume-1/pages/5-4-mass-and-weight
.. _`MIT: The Concept of Strain`: https://ocw.mit.edu/courses/2-080j-structural-mechanics-fall-2013/71034688fba0ff26d25653a4bd236a4a_MIT2_080JF13_Lecture2.pdf#page=1
.. _`MIT: Shear as an Angle Change`: https://ocw.mit.edu/courses/2-080j-structural-mechanics-fall-2013/71034688fba0ff26d25653a4bd236a4a_MIT2_080JF13_Lecture2.pdf#page=9
.. _`Roylance: Laminated Composite Plates`: https://ocw.mit.edu/courses/3-11-mechanics-of-materials-fall-1999/f193c908ec10d95c0bc67c904b65397a_MIT3_11F99_laminates.pdf#page=8
.. _`Alberta: Linear Elastic Strain Energy`: https://engcourses-uofa.ca/books/introduction-to-solid-mechanics/energy/expressions-for-the-strain-energy-in-linear-elastic-materials/
.. _`MIT: Membrane Energy`: https://ocw.mit.edu/courses/2-081j-plates-and-shells-spring-2007/1bd32d641a2b41ca518591d981405393_lecturenote.pdf#page=16
.. _`MIT: Bending Energy`: https://ocw.mit.edu/courses/2-081j-plates-and-shells-spring-2007/1bd32d641a2b41ca518591d981405393_lecturenote.pdf#page=13
.. _`Abaqus: Orthotropic Saint-Venant Kirchhoff Model`: https://docs.software.vt.edu/abaqusv2025/English/SIMACAESUBRefMap/simasub-c-uanisohyper_strain.htm
.. _`Grinspun et al.: Discrete Shells`: https://multires-1.cms.caltech.edu/pubs/ds.pdf
.. _`Tamstorf and Grinspun: Discrete Bending Forces and Their Jacobians`: https://la.disneyresearch.com/wp-content/uploads/Discrete-Bending-Forces-and-Their-Jacobians-Paper.pdf
