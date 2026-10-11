Elastic cloth model
-------------------

Start with a piece of cloth laid flat without stretching it. Let :math:`A` be
its area in square metres, :math:`\mu` its mass per square metre (kg/m²), and
:math:`M` its total mass in kilograms. For
uniform cloth, meaning the same mass per area throughout, its mass is simply

.. math::

    M=\mu A.

This follows directly from what mass per square metre means: multiply it by
the number of square metres. It is a definition-based calculation, not a
separate material law.

For example, a piece 0.50 m long by 0.20 m wide has area :math:`A=0.10` m².
With :math:`\mu=0.22` kg/m², meaning 0.22 kg for each square metre, its mass is
:math:`M=0.22\times0.10=0.022` kg. This mass per area matches the
demonstration's chosen cloth density; the patch dimensions are example
geometry, not material constants.

Folding or bending this piece, making its surface turn rather than stay flat,
does not change its mass. Nor does its mass
change if it stretches: the same material is still present. The area of its
shadow or its deformed surface must not be used to assign it a new mass.

A newton (N) measures force; a joule (J) measures energy.
Kilograms per square metre means mass for each square metre of cloth.

Gravity gives this mass a downward force:

Bold symbols describe quantities with both a size and a direction. Here
:math:`\mathbf{F}_g` is the gravitational force and :math:`\mathbf{g}` is
gravitational acceleration, the change of velocity per second caused by gravity.
Force :math:`\mathbf F_g` is in newtons; choose
:math:`\mathbf g=(0,-9.81,0)` m/s² before evaluating the equation.

.. math::

    \mathbf{F}_g = M\mathbf{g}.

Here the chosen gravity matches the demonstration.
Acceleration is in m/s²: velocity changes by that many metres per second
each second. Our patch's
three acceleration components are along the boom, upward, and sideways: only
the upward component is nonzero, and its negative sign means downward. Its
weight magnitude is :math:`0.022\times9.81=0.21582` N. Gravity is a real
load even when the wind is zero.

The force formula is the weight relation explained in `OpenStax: Mass and
Weight`_. The chosen 9.81 m/s² is an approximate near-Earth value, not a
universal gravitational acceleration.

Threads, extension, and shear
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

A **membrane** is an ideal thin sheet that resists changes of length and changes
of angle within its surface, but has no bending resistance. These two changes
are called stretching and shearing; we explain each below. Real cloth has some
bending resistance, which we model separately. This distinction explains how a
sheet can be difficult to stretch but easy to fold.

**Stiffness** describes how much load, or applied force, is needed for a given
deformation, meaning a change of shape or size. More stiffness means more load
for the same deformation. In this chapter, **elastic energy** means energy
stored in an ideal reversible deformation: it can be returned as the load is
removed and the cloth returns toward its original shape.

Woven cloth is made by crossing two sets of threads over and under each other.
These crossing thread families are called **warp** and **weft**. Call the
warp direction 1 and the weft direction 2. They initially cross at right angles
in the patch used here. Begin with the simpler case of equal extension
stiffness along both thread directions. These directions belong to the cloth
and rotate with it; they are not
necessarily the world's horizontal and vertical axes.

To understand extension, mark a short line along either thread direction.
Let its original, unstretched length be :math:`\ell_0` and its current length
be :math:`\ell`, both in metres. The zero means the original or **reference** value, not a
counter or a zero length. The **reference state** is the original unstretched
cloth against which changes are measured. **Strain**, written :math:`\epsilon`,
is the fractional change in length, with no units. For the definition using
original length, called engineering strain,

.. math::

    \epsilon=\frac{\ell-\ell_0}{\ell_0}.

This is the engineering-strain definition in `MIT: The Concept of Strain`_,
Section 2.1, equation (2.2a).

The length units cancel in this fraction: strain is **dimensionless**, meaning
it has no physical unit. A 0.50 m warp
line becoming 0.505 m long has :math:`\epsilon=0.01`, or 1% extension.
Negative strain means shortening, not a negative length. This definition
describes local material patches; strain may differ from patch to patch.

Equal stiffness does not mean equal extension. Pull a patch along one thread
direction while holding its length fixed in the other: the pulled direction
can lengthen while the held direction does not. Different loads or constraints
can therefore produce different strains even when the threads have equal
extension stiffness.

**Shear** is an angle change. Imagine a rectangular patch becoming a
slanted parallelogram, with opposite sides still parallel, while its sides
barely change length. Let :math:`\phi` be the current angle between its thread
directions, in radians. A right angle is :math:`\pi/2` radians, or 90 degrees,
where :math:`\pi` is approximately 3.14159. Let :math:`\gamma` name
dimensionless engineering shear, choosing its positive sign to mean that
the initially right angle closes. The symbol :math:`\approx` means
approximately equal. For small angle changes,

.. math::

    \gamma\approx\frac{\pi}{2}-\phi.

Radians are dimensionless.
Closing the angle by
0.10 rad, approximately 5.73 degrees, corresponds to
:math:`\gamma\approx0.10`. This angle interpretation is suitable for small
changes, not an exact
law for large deformations. Turning the whole patch without deforming it
changes neither its lengths nor the angle between its
threads, and must not create elastic strain energy.

The angle-change interpretation is developed in `MIT: Shear as an Angle
Change`_, Section 2.3. Those notes use a shear quantity equal to half the
small angle change; our engineering shear :math:`\gamma` uses the whole
change, so the convention must be accounted for when comparing formulas.

Different parts of a sail can stretch or shear by different amounts. To find
the whole sheet's energy, we therefore need to add the local energy of all its
small patches. This is where an area integral becomes useful.

Let :math:`S_0` be the original, unstretched sheet over which we add those
contributions. Let :math:`dA_0` be an infinitesimal area: an arbitrarily tiny
patch of that original sheet, in m². The symbol :math:`\int_{S_0}` means to
sum across it.
The zero again labels the original state. For the earlier example patch,
its whole original area is :math:`A_0=0.10` m², the area previously called
:math:`A`; :math:`dA_0` is a tiny part of it, not another name for the whole
area. In the same notation, :math:`\mu_0=0.22` kg/m² is the mass per original
area previously called :math:`\mu`.

The energy must account for both thread directions. Write :math:`\epsilon_1`
for the value of the same strain definition measured along warp, and
:math:`\epsilon_2` for its value along weft. They are two measurements, not
two different definitions, and need not be equal.

Before writing the energy, choose three named stiffnesses for our equal-thread
example:

- **Extension stiffness** :math:`K=20{,}000` N/m, the same along warp and weft:
  resistance to length change in either thread direction.
- **Coupling stiffness** :math:`C=2{,}000` N/m: coupling means extension in one thread
  direction affects the force needed in the other. It is not shear stiffness.
- **Membrane shear stiffness** :math:`K_s=500` N/m: resistance to changing
  the angle between threads. Here N/m means force per width of sheet, not
  force per area of a solid material.

These are material-dependent quantities. Their values here are an internally consistent
teaching example, **not universal constants, typical sailcloth values, or
measured properties of the actual sail**. Nor are they the stiffnesses of the
demonstration's numerical links, which join pairs of simulated cloth points.

Let :math:`E_m` be elastic energy stored by stretching and shearing the
cloth, measured in joules. The subscript names membrane energy, excluding
the separate bending energy introduced later. Our chosen expression is

.. math::

    E_m = \frac12\int_{S_0}
    \left[K(\epsilon_1^2+\epsilon_2^2)
    +2C\epsilon_1\epsilon_2+K_s\gamma^2\right]dA_0.

Where:

- :math:`\epsilon_1,\epsilon_2` are dimensionless strains along warp and weft.
- :math:`\gamma` is dimensionless engineering shear strain.
- :math:`K,C,K_s` are the three stiffnesses defined above (N/m).
- :math:`E_m` is the elastic energy stored by stretching and shearing the
  cloth (J). It does not include the separate bending energy introduced later.

This is a specialization of the thin-sheet extension law in `Roylance:
Laminated Composite Plates`_, equations (4) and (20)–(21), combined with the
linear elastic work-to-energy principle in `Alberta: Linear Elastic Strain
Energy`_, equation (2). We choose equal directional extension stiffness and
no direct extension-to-shear coupling; bending is treated separately. Neither
source supplies our illustrative numerical stiffness values.

Why one half? If a pulling force increases in direct proportion to extension,
the force rises from zero to its final value. Its average over that extension
is half its final value, and work is average force times extension. The same
principle gives the quadratic energy above, with the coupling term accounting
for the interaction of the two extensions. We use an unloaded original
state: no initial elastic pulling force is stored in this example sheet.

An illustrative material, with units attached
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

The table collects our illustrative stiffnesses alongside the chosen density,
gravity, and bending parameters. The extension stiffness is equal in the two
thread directions; coupling and shear remain separate material properties.

Two additional quantities describe bending. **Curvature** is how much a surface
turns per unit distance along it, measured in 1/m; flat cloth has zero curvature.
We use :math:`\kappa` for its current curvature and :math:`\kappa_0` for its
original curvature. **Bending rigidity** :math:`B` is the stiffness resisting a
change of curvature. Its energy calculation comes later, separately from the
stretching and shearing energy.

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
      - Chosen near-Earth gravity; matches the demo
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
    * - :math:`\kappa_0`
      - 0 1/m
      - Chosen flat reference curvature, not a stiffness

The coupling stiffness :math:`C` is not another shear stiffness. It expresses
how extension in one thread direction affects the force in the other. A force
per width is obtained from how quickly elastic energy per area increases as
strain increases. Calculus calls this differentiating the energy with respect
to strain.

Before writing the results, let :math:`N_1,N_2,N_{12}` name these forces per width, in N/m:

- :math:`N_1`: the pulling force along warp,
- :math:`N_2`: the pulling force along weft,
- :math:`N{12}`: the sliding force associated with shear between the two thread directions.

They are often called membrane force resultants because the forces
through the sheet's thickness have been combined into a force per width.
They are not stress, meaning force per area, measured in pascals (Pa = N/m²).
For our energy expression, the results are

.. math::

    N_1=K\epsilon_1+C\epsilon_2,
    \qquad N_2=C\epsilon_1+K\epsilon_2,
    \qquad N_{12}=K_s\gamma.

These are derived from our displayed energy, not independently assumed
formulas. For example, the rate of change of
:math:`K\epsilon_1^2/2+C\epsilon_1\epsilon_2` with respect to
:math:`\epsilon_1` is :math:`K\epsilon_1+C\epsilon_2`.
`Alberta: Linear Elastic Strain Energy`_ explains the underlying energy
derivative principle; here the energy is per sheet area rather than per volume.

With positive :math:`C`, stretching warp while holding weft at its original
length requires **tension**, or pulling force, along weft too.
If there is instead no pulling force along weft (:math:`N_2=0`),

.. math::

    \epsilon_2=-\frac{C}{K}\epsilon_1=-0.10\epsilon_1.

Thus 1% warp extension would accompany 0.1% weft contraction under that
particular loading condition. Which edges are held or pulled, not the material
stiffnesses alone, determines the two strains.

For positive elastic energy away from the zero-strain state, the equal-thread
example requires the following conditions. The bars in :math:`|C|` mean its
magnitude, ignoring its sign:

.. math::

    K>|C|,\qquad K_s>0.

Our values give :math:`20{,}000>2{,}000` N/m and :math:`500>0` N/m.
The coupling term therefore cannot make the total elastic energy negative.

This can be checked directly, without importing another material law. The
local elastic energy per original area, denoted :math:`w_m` (J/m²), can be
rewritten by expanding the squares:

.. math::

    w_m=\frac{K+C}{4}(\epsilon_1+\epsilon_2)^2
    +\frac{K-C}{4}(\epsilon_1-\epsilon_2)^2
    +\frac{K_s}{2}\gamma^2.

Both extension coefficients in this rewritten expression are positive when
:math:`K>|C|`, and a square cannot be negative. Positive :math:`K_s` does
the same for shear.

Worked example: extension and shear cost different amounts
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Take the uniform 0.10 m² reference patch above, stretch warp by 1%, hold weft
at its original length, and apply no shear. These are example *states*, not
new constants. The energy per reference area :math:`w_m` is

.. math::

    w_m=\frac12K\epsilon_1^2
    =\frac12(20{,}000\,\text{N/m})(0.01)^2
    =1.0\,\text{J/m}^2,
    \qquad E_m=w_m A_0=0.10\,\text{J}.

Since N/m equals J/m², the units agree. The warp force per width is
:math:`N_1=200` N/m. Across the patch's 0.20 m width this is 40 N of warp
force. Holding the weft length also requires :math:`N_2=20` N/m, because of
the mixed coefficient. Releasing that constraint would change the strain and
energy; the 40 N calculation specifically assumes zero weft extension.

Now return both lengths to their reference values and apply pure shear
:math:`\gamma=0.10`. This separate state gives

.. math::

    w_m=\frac12K_s\gamma^2
    =\frac12(500\,\text{N/m})(0.10)^2
    =2.5\,\text{J/m}^2,
    \qquad E_m=0.25\,\text{J},
    \qquad N_{12}=50\,\text{N/m}.

The shear coefficient is much smaller than the extension coefficients, but
this example's shear strain is ten times its extension strain. The energies
depend on both the stiffness and the square of the deformation.

Do not equate :math:`K` with a numerical edge spring constant merely
because both can be written in N/m. Here :math:`K` relates force *per
width* to dimensionless strain. A spring constant relates force to extension
in metres. For this uniform rectangular patch with weft extension constrained,
strain is extension divided by original length, and force is force per width
times patch width. Substituting those two relations gives an effective warp
spring constant of
:math:`k_{\text{strip}}=K(0.20\,\text{m})/(0.50\,\text{m})=8{,}000`
N/m. Geometry and transverse constraints are essential to that conversion.
The demo's mesh links are not a calibrated discretization of this example.

Generalizing to unequal thread stiffness
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

So far one extension stiffness :math:`K` serves both thread directions. If
the thread families or their weave respond differently, give the warp and weft
squared-strain terms separate extension stiffnesses, each in N/m, rather than
using the same :math:`K` for both. The coupling and shear terms still apply.
A membrane with two perpendicular material symmetry directions is called
**orthotropic**: reflecting its loading about either direction leaves its
elastic response correspondingly reflected, rather than introducing a new
material behavior. The thread directions are those special directions here.
This permits unequal stiffness along them but does not require it.

Equal extension coefficients along the threads do not mean that the material
responds equally to loading at every angle. That stronger property is called
**isotropy**. For the linear membrane expression used here, isotropy would also
require :math:`K_s=(K-C)/2`, which would be 9,000 N/m for our
extension and coupling values. We instead chose 500 N/m: our example is equally
stiff in extension along the two thread directions but much easier to shear.
Its shear stiffness remains an independent choice, not a consequence of making
the two extension coefficients equal.

The isotropic relation follows from the membrane force and energy laws in
`MIT: Membrane Energy`_, Section 2.3: the shear coefficient is half the
difference between the extension and coupling coefficients when engineering
shear is used. Our independently chosen shear stiffness deliberately does not
make that isotropic specialization.

This energy expression is a **material law**: a rule relating deformation to
stored elastic energy and force. It is a simplified rule, not a claim that real
cloth's force always increases in direct proportion to strain. Actual threads
may straighten before stretching; loading and unloading may follow different
paths and lose energy. Thin cloth also forms wrinkles when pushed along its
surface instead of carrying large sustained pushing forces. For large shape
changes, a better law must still distinguish actual deformation from simply
turning the patch without changing its lengths or thread angles.

Bending is a separate resistance
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

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
N m × 1/m² × m² = N m = J. This small
example bending energy explains why the chosen sheet can bend more easily
than it stretches. A more complete thin-sheet model accounts for bending in
different directions and twisting rather than using just one curvature value.
Both energies have units of joules, but they penalize different deformations.

The constants in the table characterize our chosen material and environment;
:math:`\kappa_0` specifies its reference condition. Position (m), time (s), local strains
:math:`\epsilon_1,\epsilon_2,\gamma` (dimensionless), and current curvature
:math:`\kappa` (1/m) are evolving variables, not fixed constants.
The original sheet and patch lengths specify its chosen size and shape. In particular,
the example strains and bend above are not imposed everywhere on a sail.

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

Try :doc:`the stretchy flag on the Moon <02-moon-flag>` in Chapter 2:
pull its top-right corner, then release it under lunar gravity.
It deliberately uses much softer cloth and a finite-extension limit added
to the linear law above. Its model notes explain that nonlinear teaching
choice; it is not a measurement of this sailcloth or a claim that real
fabric cannot tear.

The linked university notes establish the mechanics principles, not measured
properties of this sail. The three membrane stiffnesses and bending rigidity
are illustrative choices. The mass per area and gravity match the demo's
inputs; that does not experimentally validate them. Our examples, positivity
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
