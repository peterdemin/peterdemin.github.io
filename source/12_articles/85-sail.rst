Boom and Sail Physics
=====================

This note derives a compact sail-and-boom model from standard aerodynamic force
formulas.

The presentation uses three coordinate systems:

1. **Sail frame**: the boom and sail chord lie on the positive :math:`x` axis.
2. **Boat frame**: the boat centerline forward lies on the positive :math:`x` axis.
3. **World frame**: east lies on the positive :math:`x` axis.

The order matters:

1. Write lift and drag in the sail frame.
2. Express apparent wind in that frame.
3. Rotate force into the boat frame.
4. Project to forward drive.
5. Convert force to acceleration and velocity.
6. Use the sheet only to constrain the boom angle.

Canonical lift and drag
-----------------------

The standard aerodynamic force formulas are:

.. math::

    L = \frac{1}{2}\rho v_a^2 S C_L

.. math::

    D = \frac{1}{2}\rho v_a^2 S C_D

Where:

1. :math:`\rho` is air density,
2. :math:`v_a` is apparent wind speed,
3. :math:`S` is sail area,
4. :math:`C_L` is lift coefficient,
5. :math:`C_D` is drag coefficient.

The essential point is that force scales with :math:`v_a^2`, not :math:`v_a`.

Piecewise lift coefficient
--------------------------

Let :math:`\alpha` be the angle of attack and :math:`\alpha_s` the stall angle.

Use a piecewise lift model:

.. math::

    C_L(\alpha) =
    \begin{cases}
    c_1 \alpha, & 0 \le \alpha \le \alpha_s \\
    C_{L,\max}\left(1 - k_s(\alpha - \alpha_s)\right), & \alpha > \alpha_s
    \end{cases}

with:

.. math::

    C_{L,\max} = c_1 \alpha_s

This says:

1. lift grows roughly linearly before stall,
2. lift peaks at stall,
3. lift decreases after stall.

For drag, one may use any monotone increasing function of :math:`\alpha`.
A simple choice is:

.. math::

    C_D(\alpha) = C_{D,0} + c_2 \alpha^2

where :math:`C_{D,0}` is parasitic drag at zero angle of attack.

World frame
-----------

In the world frame:

1. positive :math:`x` points east,
2. positive :math:`y` points south on the screen.

Let the boat heading be :math:`\theta_b`.
Let the true wind direction be :math:`\theta_w`.

Boat velocity is:

.. math::

    \vec{v}_b^{(3)} =
    v_b
    \begin{bmatrix}
    \cos \theta_b \\
    \sin \theta_b
    \end{bmatrix}

True wind velocity is:

.. math::

    \vec{v}_w^{(3)} =
    v_w
    \begin{bmatrix}
    \cos \theta_w \\
    \sin \theta_w
    \end{bmatrix}

The apparent wind in the world frame is:

.. math::

    \vec{v}_a^{(3)} = \vec{v}_w^{(3)} - \vec{v}_b^{(3)}

Boat frame
----------

The boat frame rotates with the hull.

Its positive :math:`x` axis points forward.
Its positive :math:`y` axis points to one side of the hull.

To express a world-frame vector in the boat frame, rotate by :math:`-\theta_b`:

.. math::

    R_b =
    \begin{bmatrix}
    \cos(-\theta_b) & -\sin(-\theta_b) \\
    \sin(-\theta_b) & \cos(-\theta_b)
    \end{bmatrix}

Then:

.. math::

    \vec{v}_a^{(2)} = R_b \vec{v}_a^{(3)}

The apparent wind angle in the boat frame is:

.. math::

    \phi = \operatorname{atan2}(v_{a,y}^{(2)}, v_{a,x}^{(2)})

Boom angle
----------

Let the boom angle in the boat frame be :math:`\beta`.

By convention:

1. :math:`\beta = \pi` would place the boom on the centerline aft,
2. for convenience one may instead measure boom angle from the aft direction,
3. in that convention :math:`\beta = 0` means centered aft.

It is cleaner to use the second convention for sailing geometry, so this note
measures :math:`\beta` from the aft centerline.

Let :math:`\beta_{\text{free}}` be the angle the boom would take with no sheet
restriction.
Let :math:`\beta_{\max}` be the maximum magnitude allowed by the mainsheet.

Then:

.. math::

    \beta =
    \begin{cases}
    -\beta_{\max}, & \beta_{\text{free}} < -\beta_{\max} \\
    \beta_{\text{free}}, & -\beta_{\max} \le \beta_{\text{free}} \le \beta_{\max} \\
    \beta_{\max}, & \beta_{\text{free}} > \beta_{\max}
    \end{cases}

The mainsheet therefore acts only as a constraint on boom angle.

Sail frame
----------

The sail frame rotates with the boom.

Its positive :math:`x` axis lies along the boom and sail chord.

To transform from the boat frame to the sail frame, rotate by :math:`-\beta`:

.. math::

    R_s =
    \begin{bmatrix}
    \cos(-\beta) & -\sin(-\beta) \\
    \sin(-\beta) & \cos(-\beta)
    \end{bmatrix}

Then:

.. math::

    \vec{v}_a^{(1)} = R_s \vec{v}_a^{(2)}

Angle of attack
---------------

In the sail frame, the chord is aligned with the :math:`x` axis.
So the angle of attack is read directly from the apparent wind:

.. math::

    \alpha = \operatorname{atan2}(v_{a,y}^{(1)}, v_{a,x}^{(1)})

Only the acute angle is needed for the coefficient model:

.. math::

    \alpha_{\text{eff}} = \min(|\alpha|, \pi - |\alpha|)

with:

.. math::

    0 \le \alpha_{\text{eff}} \le \frac{\pi}{2}

Lift and drag vectors in sail frame
-----------------------------------

Let:

.. math::

    \hat{a}^{(1)} = \frac{\vec{v}_a^{(1)}}{\lVert \vec{v}_a^{(1)} \rVert}

be the apparent wind direction in the sail frame.

Let a perpendicular direction be:

.. math::

    \hat{n}^{(1)} =
    \begin{bmatrix}
    -a_y^{(1)} \\
    a_x^{(1)}
    \end{bmatrix}

Then drag is:

.. math::

    \vec{D}^{(1)} = D \hat{a}^{(1)}

and lift is:

.. math::

    \vec{L}^{(1)} = L \hat{n}^{(1)}

The total sail force in the sail frame is:

.. math::

    \vec{F}^{(1)} = \vec{L}^{(1)} + \vec{D}^{(1)}

If the chosen :math:`\hat{n}^{(1)}` produces force on the wrong side, replace
:math:`\hat{n}^{(1)}` with :math:`-\hat{n}^{(1)}`.

Force in the boat frame
-----------------------

Rotate the sail-frame force back into the boat frame:

.. math::

    \vec{F}^{(2)} = R_s^{-1} \vec{F}^{(1)}

Now the boat-frame :math:`x` component is the forward drive direction.

So the forward propulsive force is:

.. math::

    F_{\text{drive}} = \max(0, F_x^{(2)})

The :math:`y` component in the boat frame is the sideways force.
That term can later be used for heel or leeway if desired.

Trim efficiency
---------------

If the boom is too tight or too loose relative to the apparent-wind demand,
the sail should lose efficiency.

Define:

.. math::

    e_{\text{over}} = \max(0, |\beta_{\text{free}}| - \beta_{\max})

.. math::

    e_{\text{under}} = \max(0, \beta_{\max} - |\beta_{\text{free}}|)

Then:

.. math::

    \eta_{\text{trim}} =
    \eta_{\text{over}} \eta_{\text{under}}

where each factor lies in :math:`[0, 1]`.

This efficiency factor multiplies the canonical lift and drag formulas:

.. math::

    L = \frac{1}{2}\rho v_a^2 S C_L \eta_{\text{trim}}

.. math::

    D = \frac{1}{2}\rho v_a^2 S C_D \eta_{\text{trim}}

Force, acceleration, and velocity
---------------------------------

Force should produce acceleration, not speed directly.

Let the boat mass be :math:`m`.

Then:

.. math::

    a_{\text{forward}} = \frac{F_{\text{drive}}}{m}

If :math:`v_b` is the scalar boat speed along its centerline, then:

.. math::

    v_b(t + \Delta t) = v_b(t) + a_{\text{forward}} \Delta t

In vector form, the world-frame boat velocity is then:

.. math::

    \vec{v}_b^{(3)} =
    v_b
    \begin{bmatrix}
    \cos \theta_b \\
    \sin \theta_b
    \end{bmatrix}

In a fuller model, one would add hull drag and integrate position as well:

.. math::

    \vec{x}(t + \Delta t) = \vec{x}(t) + \vec{v}_b^{(3)} \Delta t

Physics chain
-------------

The structure is:

1. canonical lift and drag depend on :math:`v_a^2`,
2. :math:`C_L` and :math:`C_D` depend on angle of attack,
3. angle of attack is measured in the sail frame,
4. the sail frame comes from the boom angle,
5. the boom angle is clamped by the mainsheet,
6. the forward component of total force produces acceleration,
7. acceleration updates boat velocity.

This is the smallest consistent path from sail aerodynamics to boat speed.
