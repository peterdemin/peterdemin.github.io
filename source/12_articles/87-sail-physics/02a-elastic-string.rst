Elastic string model
--------------------

Forces on a string
~~~~~~~~~~~~~~~~~~

Imagine a thin cord stretched between a fixed support and your hand.
Move the held end and let go: it moves, changes shape, and eventually settles.
Which forces make that happen?

- *Gravity* pulls every small piece downward.
- *Tension* is the pulling force transmitted along the string.
  A stretched piece tries to shorten, pulling on the pieces beside it.
  It cannot push along its length.
- *Bending rigidity* is the stiffness resisting a change of curvature.
- *Internal friction* dissipates energy.
- *Supports* exert reaction forces that hold the attached ends in place.
- *Length constraints* keep the represented pieces of material from collapsing into points.

If a piece has more material than the distance it spans, it becomes slack rather than acting like a compressed metal spring.
Its material length remains present in bends and folds.
We leave out contact, knots, and breaking.

Tension
~~~~~~~

It's helpful to think of elastic string as a spring.
In 1676 Robert Hooke found through experimentation,
that the force needed to extend a spring by some distance scales linearly
with respect to that distance and called it `Hooke's law`_.
Let's define tension :math:`T` as the force that needs to be applied to a string to extend it to length :math:`\ell`.
Conversly, this the force with which string pulls its sides to restore original length:

.. math::

   T=k\Delta\ell=k(\ell - \ell_0)\qquad(\ell\geq\ell_0).

Where:

- :math:`\ell_0` is original string length;
- :math:`\ell` is its current length;
- :math:`\Delta\ell` is string extension;
- :math:`k` is a material's property, called *spring constant* with units N/m.

We can expand :math:`k` as a property of string's cross-sectional area, multiplied by `Youngs' modulus`_:

.. math::

   k=\frac{EA_0}{\ell_0}.

Where:

- :math:`E` is Young's modulus, a material's resistance to axial strain, in N/m²;
- :math:`A_0` is string's cross-sectional area, in m².

The product :math:`EA_0` is the *axial rigidity*, in newtons.

The expanded equation for tension:

.. math::

    T=k\max(\Delta\ell,0)=EA_0\max(\frac{\ell-\ell_0}{\ell_0},0).

The function :math:`\max` chooses the larger argument, so negative strain produces zero tension.

Real material becomes thinner when pulled, but in this equation :math:`A_0` is constant,
which suitable only for small extension.
And that's what allows us to think about it as a spring.

Contour length and slack
~~~~~~~~~~~~~~~~~~~~~~~~

A 1 m piece can have its ends 10 cm apart without losing 90 cm of material.
Its *contour length* is the distance along the string, following its bends,
rather than the straight distance between its ends.

Our discrete model represents that contour by many short links.
Each link may stretch, but we impose a lower bound at its manufactured length:

.. math::

    \ell\geq\ell_0.

Bringing the supports closer must therefore bend the chain instead of shortening its links to nothing.
This is an additional modelling assumption, not a consequence of Hooke's law.
It treats each resolved link as unable to buckle internally; folds must be represented by several links.

The tensile spring only pulls. The length constraint can also supply a separating reaction
when a link would become too short.
That reaction is not an elastic compression spring: no compression energy is stored and returned.
Both its mathematical rule and the numerical corrections that approximate it are given below.

Internal friction
~~~~~~~~~~~~~~~~~

As a string deforms, some of its mechanical energy becomes heat.
This internal friction makes oscillations gradually die down.
Elastic tension and bending rigidity alone would return the energy they store.

We can model resistance to changing length by adding a force proportional to
how fast the length changes.
For a taut piece, the pulling force needed to stretch it becomes

.. math::

    T=k(\ell-\ell_0)+c\frac{d\ell}{dt}.

Here :math:`c\geq0` is a damping coefficient in N s/m,
and :math:`d\ell/dt` is the rate of length change in m/s.
For a uniform piece, :math:`c=\eta A_0/\ell_0`, where :math:`\eta` is the material's viscosity in N s/m².
Stretching increases the required pull; shortening reduces it.
For a tension-only string, clamp the total to zero if this formula gives a negative value.
The spring and damping terms acting together are called the
`Kelvin--Voigt model`_.

This friction depends on deformation: moving the whole string without changing
its shape or keeping it at a fixed stretch produces no internal damping.

Bending rigidity
~~~~~~~~~~~~~~~~

Bend a string without stretching it: the material on the outside of the bend
extends, while the material on the inside shortens.
Their resistance creates a turning effect, called a *bending moment*, that tries to straighten the string.
A thin thread bends easily; a thick cord made of the same material is harder to bend.

For a string that is straight when unloaded, a simple model is

.. math::

    M_b=B\kappa,\qquad B=EI.

Where:

- :math:`M_b` is the bending moment needed to hold the bend, in N m;
- :math:`\kappa` is curvature, in 1/m: a circular bend of radius :math:`R` has curvature :math:`1/R`;
- :math:`B` is bending rigidity, in N m²; bending rigidity stores elastic energy, just as stretching does;
- :math:`E` is Young's modulus, the same material stiffness used for tension, in N/m²;
- :math:`I` describes how the cross-sectional area is distributed around the bending axis, in m⁴.

For a solid circular string of radius :math:`R`, :math:`I=\pi R^4/4`.
Doubling its radius therefore multiplies bending rigidity by sixteen.
This assumes a solid elastic material; fibers sliding inside a braided cord can make it bend more easily.

Friction can also resist changes of bending, even when the string's length barely changes.
For bending in a plane, add a term proportional to the rate of curvature change:

.. math::

    M_b=B\kappa+D\frac{d\kappa}{dt}.

Here :math:`\kappa` is signed curvature, distinguishing the two bending directions,
and its time derivative follows the same piece of material.
The coefficient :math:`D\geq0` has units N m² s.
For the same uniform Kelvin--Voigt material used above, :math:`D=\eta I`.
The extra moment opposes changing the bend; holding a fixed bend produces no damping.
`Trubat and Molins: Rheological Damping of Slender Rods`_ derives both the extension and bending forms.

Extension damping and bending damping describe different changes of shape.
Either can be used on its own as a simplified model, or both can act together.
The point-chain simulation below includes both elastic effects and both kinds of damping.

Try the string
~~~~~~~~~~~~~~

One end is fixed. Grab the orange end, pull it sideways, up, or down, then release it.
The hand stops supporting that end, and the string falls and swings under gravity.
The fixed end remains attached. Use **Reset string** to start again or **Let go** to release without dragging.
Mouse and touch both work. With the scene focused, Space grabs or releases,
arrow keys move the held end, and Escape releases it.
The demonstration string is 4 m long. Keep holding the orange end and move it up and down
to send a disturbance toward the fixed end.
**Slow motion** starts enabled at quarter speed so the motion along the string is easier to follow.
Switch it off for normal-speed playback; this changes playback speed, not the physical forces.

.. raw:: html

    <iframe
      src="../../_static/elastic-string/index.html?embedded=1&v=cc70c35053e6ff9e"
      title="Interactive elastic string: drag the free end and release it under gravity"
      width="100%" height="650"
      style="display:block;width:100%;height:650px;border:0;"
      loading="lazy">
    </iframe>
    <script>
      (() => {
        const frame = document.currentScript.previousElementSibling;
        const sendTheme = () => {
          const root = document.documentElement;
          const theme = getComputedStyle(root);
          frame.contentWindow.postMessage({
            type: 'elastic-string-theme',
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
          if (event.data?.type === 'elastic-string-ready') sendTheme();
          if (event.data?.type === 'elastic-string-size' && Number.isFinite(event.data.height)) {
            frame.style.height = Math.max(200, Math.min(1400, event.data.height)) + 'px';
          }
        });
        const observer = new MutationObserver(sendTheme);
        observer.observe(document.documentElement, {attributes: true, attributeFilter: ['class', 'style']});
        window.addEventListener('pagehide', () => observer.disconnect(), {once: true});
      })();
    </script>

You can also `open the string experiment on its own <../../_static/elastic-string/index.html?v=cc70c35053e6ff9e>`_.

The demo and Python example below use the same 80-link, 4 m model and the same update:
an Euler prediction followed by contour-length corrections, with a step of 0.000005 s.
The left end is fixed; the other is prescribed only while held.
Release sets that endpoint's velocity to zero; the rest of the string keeps its current motion.
The hand approaches the pointer at up to 6 m/s of physical time and reaches at most 4.6 m from the fixed end.
Rendering is separate from physical ticks; slow devices may run behind real time.

The forces, constraint reactions, and artificial settling damping are specified below and included in both implementations.
There is no air resistance, ground contact, or self-contact.

A continuous mathematical model
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Label each material point by its distance :math:`s` along the original string,
with :math:`0\leq s\leq L_0`.
Here :math:`L_0` is the total manufactured length in metres.
This label stays with the material as it moves.
Let :math:`\vec{r}(s,t)` be its current position in metres at time :math:`t` in seconds.
The string can move in two or three dimensions.

The derivative :math:`\partial\vec{r}/\partial s` describes how position changes
between neighboring material labels.
Its length is the local ratio of current length to original length.
Define that ratio as :math:`\lambda`, and the unit vector along the string as :math:`\vec{\tau}`:

.. math::

    \lambda=\left|\frac{\partial\vec{r}}{\partial s}\right|,
    \qquad
    \vec{\tau}=\frac{\partial\vec{r}/\partial s}{\lambda},
    \qquad
    T=\begin{cases}
    \max\left(EA_0(\lambda-1)+\eta A_0\dfrac{\partial\lambda}{\partial t},0\right),
    &\lambda>1,\\
    0,&\lambda\leq1.
    \end{cases}

Both :math:`\lambda` and :math:`\vec{\tau}` are dimensionless.
The direction requires :math:`\lambda>0`; a collapsed piece has no defined tangent.
The tension includes extension damping, with zero force in slack material.
The time derivative of :math:`\lambda` is taken at a fixed material label :math:`s`.
Let :math:`\mu` be mass per original length in kg/m, so total mass is :math:`\mu L_0`.

The contour-length assumption has an ideal continuous form too.
Let :math:`R` be the magnitude of its separating axial reaction, in newtons:

.. math::

    \lambda\geq1,\qquad R\geq0,\qquad R(\lambda-1)=0.

A stretched piece has :math:`R=0`. At its minimum length, a reaction can prevent further shortening.
Since :math:`T` pulls neighboring pieces together and :math:`R` separates them,
the signed axial force is :math:`T-R`.

Consider a short piece between labels :math:`s` and :math:`s+\Delta s`.
Its right neighbor exerts :math:`((T-R)\vec{\tau})(s+\Delta s,t)`;
its left neighbor exerts :math:`-((T-R)\vec{\tau})(s,t)`.
Subtract these forces, add gravity and the force from bending, and apply Newton's law.
Dividing by :math:`\Delta s` and taking the limit gives

.. math::

    \mu\frac{\partial^2\vec{r}}{\partial t^2}
    =\frac{\partial}{\partial s}((T-R)\vec{\tau})
    +\vec{f}_b+\mu\vec{g}-\mu\beta\frac{\partial\vec{r}}{\partial t}.

Here :math:`\vec{g}` is gravitational acceleration in m/s².
The vector :math:`\vec{f}_b` is force per original length from bending rigidity and bending damping, in N/m.
We compute its discrete counterpart from changes of angle below.
The last term is an artificial settling force, with :math:`\beta=0.8` 1/s.
Internal friction cannot dissipate rigid motion of the whole string, so we choose this extra damping
to make the overall swing decay gradually. It is not material viscosity or a calculation of air resistance.
Every term has units N/m.
The second time derivative is acceleration.
The spatial derivative is the difference of neighboring tension vectors per original length.
Even equal tension magnitudes can give a net force when their directions differ.

Boundary and initial conditions
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

The equation alone does not specify an experiment.
Let :math:`\vec{a},\vec{b}` be the fixed support positions in metres.
While the hand holds the right end, our *boundary conditions* are

.. math::

    \vec{r}(0,t)=\vec{a},\qquad
    \vec{r}(L_0,t)=\vec{b}(t).

The support reactions supply whatever forces are necessary to keep those positions fixed.
Our supports fix position but allow the string to rotate, so they impose no bending moment.
A free end would instead have zero total internal force and zero bending moment,
unless an external end force or moment is applied.
Releasing the hand switches the right end to this free condition.
The demo sets that endpoint's velocity to zero at release, so release does not throw it;
all other nodes retain their velocities. Gravity continues to act.

We must also prescribe an initial shape :math:`\vec{r}(s,0)` and
initial velocity :math:`\partial\vec{r}(s,0)/\partial t` consistent with the supports.
Putting supports farther apart than :math:`L_0` creates initial stretch, or *pretension*.
Putting them closer together allows a sagging shape without initially stretching every piece.
Gravity then changes the shape and the local tensions together.

Replacing the string with points
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

The computer cannot store a position for every real value of :math:`s`.
Instead, split the original string into :math:`N` equal segments with rest length
:math:`\ell_0=L_0/N`, joined by :math:`N+1` points called *nodes*.
Node :math:`i` has position :math:`\vec{r}_i`, velocity :math:`\vec{v}_i`, and mass :math:`m_i`.

Give half of each segment's mass to each of its endpoints.
Interior nodes receive two halves, and the end nodes receive one:

.. math::

    m_i=\mu\ell_0\quad(1\leq i\leq N-1),
    \qquad m_0=m_N=\frac{\mu\ell_0}{2}.

These masses add to :math:`\mu L_0`.
For segment :math:`i`, joining nodes :math:`i` and :math:`i+1`, compute

.. math::

    \vec{d}_i=\vec{r}_{i+1}-\vec{r}_i,\qquad
    \ell_i=|\vec{d}_i|,\qquad
    \dot\ell_i=(\vec{v}_{i+1}-\vec{v}_i)\cdot\frac{\vec{d}_i}{\ell_i}.

The dot product measures the relative velocity along the segment;
:math:`\dot\ell_i` is its rate of length change in m/s.
For a stretched segment, its elastic and damping contributions combine into

.. math::

    \vec{q}_i=\max\left(
    \frac{EA_0}{\ell_0}(\ell_i-\ell_0)
    +\frac{\eta A_0}{\ell_0}\dot\ell_i,0\right)
    \frac{\vec{d}_i}{\ell_i}.

The vector :math:`\vec{q}_i`, in newtons, is the segment's force on its left node.
Add :math:`+\vec{q}_i` to node :math:`i` and :math:`-\vec{q}_i` to node :math:`i+1`.
Each internal interaction is equal and opposite, so internal forces cannot accelerate the whole string's center of mass.
Slack segments exert zero force. At exactly zero length, set their force to zero without dividing by length.

The force evaluated before constraint reactions is, for an interior node,

.. math::

    \vec{F}_i
    =\vec{q}_i-\vec{q}_{i-1}
    +\vec{F}_{b,i}+m_i\vec{g}-m_i\beta\vec{v}_i.

Here :math:`\vec{F}_{b,i}` is the total bending force on that node, calculated next.
The length-constraint reactions are applied separately as impulses after the Euler prediction,
so they must not be counted again in :math:`\vec{F}_i`.

This chain is a spatial approximation of our single string, not a collection of unrelated strings.
When doubling the segment count, halve segment masses and double segment spring constants.
Double the segment damping coefficients too, since :math:`c=\eta A_0/\ell_0`.
Keeping the old spring constants would make a different, softer string.

Bending between segments
~~~~~~~~~~~~~~~~~~~~~~~~

In two dimensions, three neighboring nodes form a bend.
Let :math:`\theta_i` be the signed turn from segment :math:`\vec{d}_{i-1}` to segment :math:`\vec{d}_i`, in radians.
It is zero when the segments continue in a straight line.
For small extension and well-resolved bends, approximate curvature by :math:`\theta_i/\ell_0`.
For a string whose original shape is straight, choose the bending energy

.. math::

    U_b=\frac12\sum_{i=1}^{N-1}\frac{B}{\ell_0}\theta_i^2.

Each term represents one bend; :math:`B/\ell_0` has units N m, so the energy is in joules.
The matching elastic and damping moment at that bend is

.. math::

    m_{b,i}=\frac{B\theta_i+D\dot\theta_i}{\ell_0}.

To turn this moment into forces, determine how the angle changes when each of its three nodes moves.
Write :math:`\vec{G}_{i,j}=\nabla_{\vec{r}_j}\theta_i` for that angle gradient, in 1/m.
The index :math:`j` runs over :math:`i-1,i,i+1`.
Then the bend's contribution to node :math:`j` is

.. math::

    \vec{F}_{i,j}=-m_{b,i}\vec{G}_{i,j},\qquad
    \dot\theta_i=\sum_{j=i-1}^{i+1}\vec{G}_{i,j}\cdot\vec{v}_j.

The elastic force points toward decreasing bending energy.
The damping contribution removes mechanical energy at rate :math:`D\dot\theta_i^2/\ell_0`.
Add contributions from every bend touching a node to obtain :math:`\vec{F}_{b,j}`.

The gradients have a short formula.
For a planar vector :math:`\vec{d}=(d_x,d_y)`, define
:math:`\vec{p}(\vec{d})=(-d_y,d_x)/|\vec{d}|^2`.
This is the gradient of its direction angle with respect to its components.
Since the turning angle is the outgoing direction minus the incoming direction,

.. math::

    \vec{G}_{i,i-1}&=\vec{p}(\vec{d}_{i-1}),\\
    \vec{G}_{i,i}&=-\vec{p}(\vec{d}_{i-1})-\vec{p}(\vec{d}_i),\\
    \vec{G}_{i,i+1}&=\vec{p}(\vec{d}_i).

These three gradients add to zero, so each bend's forces sum to zero.
Rigid translation or rotation changes neither the turning angles nor their rates.
Bending therefore acts on shape changes, including in slack material.
When refining the chain, keep :math:`B` and :math:`D` fixed and recompute the coefficients :math:`B/\ell_0` and :math:`D/\ell_0`.
The formulas require nonzero segment lengths and a resolved bend rather than an exact 180-degree reversal.

State and rate function
~~~~~~~~~~~~~~~~~~~~~~~

In :doc:`01a-simulation-basics`, the state combined one body's position and velocity.
For the string, collect the positions and velocities of all nodes:

.. math::

    \vec{s}=(\vec{r}_0,\ldots,\vec{r}_N,
             \vec{v}_0,\ldots,\vec{v}_N).

The vector :math:`\vec{s}` is the simulation state; the scalar :math:`s` used earlier labels material along the string.
Masses, rest lengths, and material constants are fixed parameters, so they do not need to be part of the evolving state.

The rate function :math:`f(\vec{s})` computes the derivatives from the supplied state.
For each free node,

.. math::

    \vec{r}_i'=\vec{v}_i,\qquad
    \vec{v}_i'=\frac{\vec{F}_i}{m_i},\qquad
    f(\vec{s})=(\vec{r}_0',\ldots,\vec{r}_N',
                \vec{v}_0',\ldots,\vec{v}_N').

Compute tension, bending, and damping forces from the supplied positions and velocities,
add gravity, then divide each node's total force by its mass.
For the permanently fixed left end, return zero position and velocity derivatives.
While the right end is held, its position derivative is the prescribed hand velocity and its acceleration is zero for that tick.
Once released, it uses the same free-node rates as the interior nodes.
The held/free flag and hand target are boundary data supplied to the rate function and tick.

Evaluating :math:`f` does not advance time or change its input.
It only answers: how fast would this state change?

Advancing the simulation
~~~~~~~~~~~~~~~~~~~~~~~~

Use the first-order Euler integration introduced in the basics chapter to predict a state.
For a time step :math:`h`, evaluate the rate function once at the current state:

.. math::

    \widetilde{\vec{s}}=\vec{s}_0+h f(\vec{s}_0).

For each free node, this means

.. math::

    \widetilde{\vec{r}}_i=\vec{r}_{i,0}+h\vec{v}_{i,0},\qquad
    \widetilde{\vec{v}}_i=\vec{v}_{i,0}+h\frac{\vec{F}_i(\vec{s}_0)}{m_i}.

Both updates use the starting state.
Compute all lengths, angles, deformation rates, and forces before changing any positions or velocities.
The tilde marks a prediction: it is not yet the accepted state.
Write :math:`\mathcal P_h` for the position and velocity corrections defined next.
The complete tick is

.. math::

    \vec{s}_1=\mathcal P_h\!\left(\vec{s}_0+h f(\vec{s}_0)\right).

It is an Euler prediction followed by constraint corrections, rather than unconstrained Euler alone.

Correcting shortened links
~~~~~~~~~~~~~~~~~~~~~~~~~~

For a predicted link, compute its current length :math:`\ell_i` and direction
:math:`\vec{n}_i=(\vec{r}_{i+1}-\vec{r}_i)/\ell_i`.
The required separation increase is

.. math::

    c_i=\max(\ell_0-\ell_i,0).

Let :math:`\omega_i=1/m_i` be inverse mass for a free node, in 1/kg.
Set :math:`\omega_i=0` at a fixed or held node, so a constraint cannot move a prescribed point.
If :math:`c_i>0` and the two inverse masses do not both vanish, apply

.. math::

    \Delta\vec{r}_i=-\frac{\omega_i}{\omega_i+\omega_{i+1}}c_i\vec{n}_i,
    \qquad
    \Delta\vec{r}_{i+1}=\frac{\omega_{i+1}}{\omega_i+\omega_{i+1}}c_i\vec{n}_i.

These corrections increase the pair's distance by :math:`c_i`.
Equal masses move equally; a lighter node moves farther; a prescribed node does not move.
For two free nodes, the mass-weighted corrections sum to zero.

Apply the same corrections to velocities, divided by the time step:

.. math::

    \Delta\vec{v}_j=\frac{\Delta\vec{r}_j}{h},
    \qquad \vec{J}_j=m_j\Delta\vec{v}_j
    \quad(j=i,i+1).

Here :math:`\vec{J}_j` is the constraint impulse in N s.
This is the separating reaction missing from a force-only Euler update.
It can push nodes apart, but stores no elastic compression energy.

A correction can shorten a neighboring link, so visit all links twice:
first from the hand toward the fixed end, then in the opposite direction.
Recompute lengths and directions after each correction.
The code ignores shortages smaller than :math:`10^{-6}\ell_0`.
Two sweeps leave a finite residual; this is an approximate constraint solve, not an exact projection of the whole chain.
The correction can also introduce numerical energy error, which must be checked by reducing the time step.

Moving and releasing the hand
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

While the right end is held, limit the target to 4.6 m from the fixed support.
Let :math:`\vec{b}_{\mathrm{target}}` be that bounded target, and
:math:`\vec{d}_H=\vec{b}_{\mathrm{target}}-\vec{r}_N` its displacement from the held endpoint.
Before evaluating :math:`f`, prescribe

.. math::

    \vec{v}_N=\vec{d}_H\min\left(\frac1h,\frac{v_{\max}}{|\vec{d}_H|}\right),
    \qquad v_{\max}=6\ \text{m/s}.

For a zero displacement, set this velocity to zero.
This reaches a nearby target in one tick and approaches a distant one at a bounded speed.
The Euler prediction moves the held point at that prescribed velocity; constraint corrections leave it alone.

On release, set only :math:`\vec{v}_N` to zero and remove its prescribed status.
It then has its ordinary endpoint mass and responds to gravity, internal forces, damping, and constraint impulses.
The permanent support remains fixed.

Python implementation
~~~~~~~~~~~~~~~~~~~~~

This is the same 4 m, 80-link model used by the demo: tension, extension damping,
angle-based bending and bending damping, artificial settling damping, and the contour-length constraint.
The coefficients are illustrative. The chosen :math:`D/B=\eta A_0/(EA_0)` gives
extension and bending the same material viscosity-to-elasticity ratio.

.. literalinclude:: ../../_static/elastic-string/example.py
    :language: python

Here ``state[0]`` holds all positions and ``state[1]`` all velocities.
The rate function returns an array of the same shape containing velocities and accelerations.
``tick`` copies its input, prescribes hand velocity if held, predicts with Euler, and corrects the contour.
``release`` changes only the endpoint velocity; pass ``held=False`` on subsequent ticks.
The runnable example releases the initially horizontal string immediately.

To hold or move the endpoint, call ``tick(state, h, held=True, target=point)``;
``point`` is a two-component position in metres. Omitting the target holds its current position.
The accepted ``r`` values are the points to draw as a connected line.
Rendering and quarter-speed playback do not change the physical tick,
as discussed in :doc:`01a-simulation-basics`.

Choosing a time step and checking the result
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

A stiff string has fast vibrations, including lengthwise motion that may be almost invisible.
For the uniform, taut chain with small extension, its longitudinal wave speed in original-length coordinates is approximately

.. math::

    c_{\mathrm{axial}}=\sqrt{\frac{EA_0}{\mu}}.

The travel time across one segment, :math:`\ell_0/c_{\mathrm{axial}}`,
gives a useful scale for choosing the time step.
Forward Euler can add numerical energy to vibrations, so resolving their period is not enough to guarantee stability.
An undamped linear vibration gains energy at every nonzero Euler step.
Internal friction can counter this growth, but the permitted step depends on the damping as well as the stiffness.
For our numbers, :math:`c_{\mathrm{axial}}\approx70.7` m/s and
:math:`\ell_0/c_{\mathrm{axial}}\approx0.000707` s.
The example uses :math:`h=0.000005` s and runs for 0.1 s.
Check convergence over the intended duration by reducing the time step;
this short example does not establish stability for arbitrarily long playback.
Refining the chain also requires checking the time step again.

Bending introduces another time scale, roughly :math:`\ell_0^2\sqrt{\mu/B}`.
Shorter bends can vibrate faster, so halving segment lengths reduces this scale by a factor of four.
Strong bending damping also restricts an explicit time step;
its short-wavelength scale is roughly :math:`\mu\ell_0^4/D`.
These are scales rather than universal stability bounds.

This speed differs from the small transverse-wave speed
:math:`c_{\mathrm{transverse}}=\sqrt{T/\mu}` in
`OpenStax: Wave Speed on a Stretched String`_.
That formula uses tension and mass per *current* length, and describes small sideways motion about a taut state.
Our extensible model also permits axial vibrations; their faster speed can control the software time step.
For nearly inextensible strings, an implicit integrator or a length-constraint solver can be more practical.

Several simple experiments help check the implementation:

- With gravity disabled and zero initial velocity, a straight, uniformly stretched string between fixed supports stays at rest.
  Neighboring tensions cancel at every interior node.
- With free endpoints and no external forces, total momentum stays constant up to numerical roundoff.
- With fixed supports and internal friction, a displaced string should lose mechanical energy overall.
  Extension damping dissipates energy only while segment lengths change.
  Bending damping dissipates energy while turning angles change.
  The discrete integrator can introduce energy error, so compare runs with smaller time steps.
- Bring the supports closer and check that the contour does not disappear into shortened links.
  Compare the shortest link and the distribution of turning angles as the bottom rounds out.
- With gravity disabled, a bent string has restoring forces even if all segments are at their rest lengths.
  Set :math:`B=D=0` to remove those bending forces and compare the motion.
- Halve the time step, then refine the segments with their masses and stiffnesses rescaled.
  Compare sag and oscillation timing at matching physical times.

From one string to cloth
~~~~~~~~~~~~~~~~~~~~~~~~

A string stores energy when it stretches; a flexible sheet also resists changes
of angle between material directions.
Crossing many strings suggests warp and weft, but their intersections need a rule
for shear, and real cloth needs some bending resistance too.
The next chapter, :doc:`02b-cloth`, adds these ingredients.
The software pattern remains familiar: represent material with finitely many points,
compute forces from deformation, apply supports, and advance time.

.. _`Hooke's law`: https://en.wikipedia.org/wiki/Hooke%27s_law
.. _`Youngs' modulus`: https://en.wikipedia.org/wiki/Young%27s_modulus
.. _`MIT: Moment--Curvature Relation`: https://ocw.mit.edu/courses/1-050-solid-mechanics-fall-2004/resources/emech10_04/
.. _`Kelvin--Voigt model`: https://sites.miamioh.edu/polymodmw/kelvin-voigt-model/
.. _`Trubat and Molins: Rheological Damping of Slender Rods`: https://upcommons.upc.edu/bitstream/handle/2117/166616/RHEOLOGICAL%20DAMPING%20OF%20SLENDER%20RODS_BWvPostPrint.pdf
.. _`OpenStax: Wave Speed on a Stretched String`: https://openstax.org/books/university-physics-volume-1/pages/16-3-wave-speed-on-a-stretched-string
