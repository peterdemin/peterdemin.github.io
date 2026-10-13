Basics of simulation software
-----------------------------

Model and discretization
~~~~~~~~~~~~~~~~~~~~~~~~

Physical laws describe continuous motion: an object exists at every instant.
A computer can process only a finite number of states and advances between them at discrete intervals.
This is called *time discretization*.

Let's start with a simple example of an absolutely rigid body moving in a vacuum in a two-dimensional space.
Since the body is completely alone, we don't care about its shape, and can represent it as a point at its center.
Let :math:`\vec{r} = (x,y)` be its position in metres,
and :math:`\vec{v} = (v_x,v_y)` its velocity in m/s.
The *distance* to the center of coordinates is magnitued of the position vector, :math:`\left| \vec{r} \right|=\sqrt{x^2 + y^2}`.
The magnitude of velocity, :math:`\left| \vec{v} \right|` is *speed*.
Velocity changes according to acceleration :math:`\vec{a} = (a_x,a_y)` measured in m/s².

Let the force be with you
~~~~~~~~~~~~~~~~~~~~~~~~~

Let's say there's an abstract force pushing the body,
:math:`\vec{F}=(F_x,F_y)` measured in newtons (N, or kg m/s²).
By definition:

.. math::

    \vec{F}=m \vec{a}
    \qquad\text{or}\qquad
    \vec{a}=\frac{\vec{F}}{m}.

Where :math:`m` is the body's mass in kg.

According to the Newton law, a moving body does not need force to keep moving, force changes its velocity.

Example
~~~~~~~

To illustrate how to apply this knowledge to simulations, let's add another body.
The first body will be called Earth, it would have very big mass, but remain motionless.
The second body would be a satellite. Satellite rotates around the Earth driven solely by its *gravity*.
Its own mass is so much smaller than mass of Earth, that it can be omitted entirely.
For this experiment, the shape of Earth doesn't matter either.
We can draw it as a circle, but computationally it's a point with a mass.
Let's also say that the Earth's center is at center of the coordinate, system, :math:`(0,0)`.

We are used to think about gravity as 9.81 m/s², but that's the convenient constant for the sea level.
In space we need to compute it properly.

`Newton's law of universal gravitation`_ describes gravity as a force: any particle attracts any other particle with a force proportional to the product of their masses and inversely proportional to the square of the distance between their centers of mass.

We'll also need a special coefficient, that allows transitioning from distance in meters to the gravitational pull.
It's unimaginatively called `gravitational constant`_, and the value is:

.. math::

   G \approx 6.674 \times 10^{−11},
   \qquad \frac{\text{m}^3}{\text{kg} \cdot \text{s}^2}.

When multiplied by Earth's mass :math:`M🜨 = 5.9722 \times 10^{24}, \text{kg}`, we get `Earth's gravitational parameter`_:

.. math::

   \mu=G M🜨 \approx 3.98600435507 \times 10^{14},\qquad \frac{\text{m}^3}{\text{s}^2}.

The beauty of :math:`\mu`, is that it's all we need to get from position to acceleration:

.. math::

    \vec{a}=-\vec{r} \frac{\mu}{\left| \vec{r} \right| ^3},\qquad\frac{\text{m}}{\text{s}^2}.

The minus sign points toward the origin.
Acceleration's magnitude is :math:`\left| \vec{a} \right|=\mu/\left| \vec{r} \right| ^2`, so doubling distance divides it by four.

Recursive model
~~~~~~~~~~~~~~~

To put this all together, we have three variables that circularly depend on each other.

- Position changes at the current velocity.
- Velocity changes at the current acceleraticn.
- Acceleration if defined by the gravity.
- Gravitational force changes depending on distance.

In a simplified single-dimensional notation:

.. math::

    x=vt,\qquad
    v=at,\qquad
    a=\frac{\mu}{x^2}.

So, how can we compute any of the values, if they all depend on each other?

The answer is simple: it's impossible. But if we don't need perfect, there's a trick.

Iterative approximation
~~~~~~~~~~~~~~~~~~~~~~~

We divide time in tiny increments, compute right side of the equations at the moment of time :math:`t_0`,
and feed it into the left side for next moment :math:`t_1`.
And because the time increments are so tiny, we can say that this is approximately fine.

Such explanation wouldn't cut it, of course. Everyone would see the trick through, and start calling us names.
That's why we put a few more tricks on top.
The simplest approach is called "`Euler method`_", after Leonhard Euler, who published it in 1768.

Let's introduce the derivatives. They uses few notations, including ``'`` (prime) and :math:`d/dt`, and mean value change over time.
Look how smart this looks now:

.. math::

    \vec{v}=\vec{r}', \qquad
    \vec{a}=\vec{v}'.

Or, in scalar form we can watch the letter jump dislexically:

.. math::

    v_x=\frac{dx}{dt},\qquad v_y=\frac{dy}{dt},
    \qquad a_x=\frac{dv_x}{dt},\qquad a_y=\frac{dv_y}{dt}.

Next, let's define a magic box, and call it *rate function* :math:`f`.
It takes state :math:`s`, which is the combination of :math:`\vec{r}` and :math:`\vec{v}` at `t_0`,
and returns the derivatives to be used at :math:`t_1`: :math:`vec{r}'`, :math:`vec{v}'`.

Gravity is evaluated from the supplied position; the position rates are the supplied velocities.

.. math::

    f(\vec{r},\vec{v})=(\vec{r}',\vec{v}').

*Time integration* approximates the accumulated changes over a duration :math:`h` in seconds.
One accepted integration update is a *tick*.
Multiplying a velocity by :math:`h` gives a displacement in metres;
multiplying acceleration by :math:`h` gives a velocity change in m/s.

And that's how we compute the motion over time using tiny increments.

Step 1: compute derivatives using :math:`\vec{r}_0` and :math:`\vec{v}_0` (this is :math:`f`, the rate function):

.. math::

   \vec{r}_0' &= \vec{v}_0, \\
   \vec{v}_0' &= \vec{a} = - \vec{r}_0 \frac{\mu}{\left| \vec{r}_0 \right| ^3}.

Step 2: *integrate* (add derivatives multiplied by time increment to the values):

.. math::

   \vec{r}_1 = \vec{r}_0 + \vec{r}_0' h, \qquad
   \vec{v}_1 = \vec{v}_0 + \vec{v}_0' h.

The second step is pretty generic, and we can rewrite it using concise cryptic notation:

.. math::

   \vec{s}_1 = \vec{s}_0 + f(\vec{s}_0) h.

In this approach the derivatives are always lagging one step behind, and the model is not very trustworthy.
But it's good we established the building blocks, so we can go to the next level.

Higher order integration methods
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

An obvious improvement over the Euler method is to use derivatives at the midpoint instead of the left side:

.. math::

   \vec{s}_1 = \vec{s}_0 + h f(\vec{s}_0 + \frac{h}{2} f(\vec{s}_0)).

This is called second-order integration method.
Around 1900 two German mathematicians Carl Runge and Wilhelm Kutta figured they can go deeper
and published `Fourth-order Runge--Kutta`_ method, or commonly referred as *RK4*, which evaluates the rate function four times at fractional step increments.
Here's how it works:

.. math::

    \vec{k}_1 &= f(\vec{s}_0), \\
    \vec{k}_2 &= f(\vec{s}_0 + \frac{h}{2} \vec{k}_1), \\
    \vec{k}_3 &= f(\vec{s}_0 + \frac{h}{2} \vec{k}_2), \\
    \vec{k}_4 &= f(\vec{s}_0 + h \vec{k}_3).

The called the :math:`k` values slopes.

The second slope uses a halfway trial predicted with the first slope.
The third uses a new halfway trial predicted with the second.
The fourth uses an end-of-tick trial predicted with the third.
Each trial updates both position and velocity before evaluating gravity again.
And instead of just picking the last one, average them with weights:

.. math::

    \vec{s}_1=\vec{s}_0+\frac{h}{6}(\vec{k}_1+2\vec{k}_2+2\vec{k}_3+\vec{k}_4)

The trials do not overwrite the starting state and are not four sequential ticks.
RK4 is not exact, and there are even better methods.
But for our purpose, this is good enough.

Physical ticks and display frames
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

The software computation in modern multithreaded operating systems is inherently unstable.
Some ticks are computed faster than others, but when watching animation we want it to be smooth.
The screen refresh rate is not the same as the modeling time.
To overcome this, we can introduce playback multiplier :math:`q`.

A *rendered frame* draws state; a tick advances physical time.
A fixed physical step uses the same :math:`h` regardless of screen refresh rate.
For example, :math:`q=100` means one playback second supplies 100 physical seconds.
The goal is to compute the all the ticks before we need to draw it on screen, and just wait for the drawing time to come.

.. _`gravitational constant`: https://en.wikipedia.org/wiki/Gravitational_constant
.. _`Newton's law of universal gravitation`: https://en.wikipedia.org/wiki/Newton's_law_of_universal_gravitation
.. _`OpenStax's gravitational law`: https://openstax.org/books/university-physics-volume-1/pages/13-3-gravitational-potential-energy-and-total-energy
.. _`Earth's gravitational parameter`: https://ssd.jpl.nasa.gov/astro_par.html
.. _`Euler method`: https://en.wikipedia.org/wiki/Euler_method
.. _`The RK4 notes from the University of British Columbia`: https://personal.math.ubc.ca/~israel/applet/dfplotter/docs/decal43.htm
.. _`Fourth-order Runge--Kutta`: https://en.wikipedia.org/wiki/Runge–Kutta_methods
