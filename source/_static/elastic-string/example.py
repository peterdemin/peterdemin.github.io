"""The article's Python version of the interactive string's physical tick."""

import numpy as np

N = 80
L0, mu0, EA = 4.0, 0.02, 100.0  # m, kg/m, N
etaA, h = 30.0, 0.0001         # N s, s
B = 0.0001                     # N m^2
D = 0.00001                    # N m^2 s: effective bending friction
ell0 = L0 / N
g = np.array([0.0, -9.81])
anchor = np.array([-0.4 * L0, 0.65 * L0])
hand_reach, hand_speed = 1.15 * L0, 1.5 * L0
hand_response, hand_acceleration = 0.015, 100.0  # s, m/s^2
mass = np.full(N + 1, mu0 * ell0)
mass[[0, -1]] *= 0.5


def initial_state():
    r = np.column_stack((anchor[0] + L0 * np.arange(N + 1) / N,
                         np.full(N + 1, anchor[1])))
    return np.array([r, np.zeros_like(r)])


def f(state, held=True):
    r, v = state
    force = mass[:, None] * g
    for i in range(N):
        d = r[i + 1] - r[i]
        length = np.linalg.norm(d)
        if length > ell0:
            direction = d / length
            length_rate = np.dot(v[i + 1] - v[i], direction)
            tension = max((EA * (length - ell0)
                           + etaA * length_rate) / ell0, 0.0)
            q = tension * direction
            force[i] += q
            force[i + 1] -= q

    for i in range(1, N):
        a, b = r[i] - r[i - 1], r[i + 1] - r[i]
        aa, bb = np.dot(a, a), np.dot(b, b)
        if min(aa, bb) < 1e-24:
            continue  # No resolved direction at exactly zero length.
        theta = np.arctan2(a[0]*b[1] - a[1]*b[0], np.dot(a, b))
        pa = np.array([-a[1], a[0]]) / aa
        pb = np.array([-b[1], b[0]]) / bb
        gradients = np.array([pa, -pa - pb, pb])
        theta_rate = np.sum(gradients * v[i - 1:i + 2])
        moment = (B * theta + D * theta_rate) / ell0
        force[i - 1:i + 2] -= moment * gradients

    dr = v.copy()
    dv = force / mass[:, None]
    dr[0] = dv[0] = 0.0
    if held:
        dv[-1] = 0.0  # dr[-1] remains the prescribed hand velocity.
    return np.array([dr, dv])


def material_terms(r):
    """Frozen geometric gradients, elastic forces, and viscous coefficients."""
    terms = []
    for i in range(N):
        d = r[i + 1] - r[i]
        length = np.linalg.norm(d)
        if length > ell0:
            direction = d / length
            terms.append((2*i, np.concatenate((-direction, direction)),
                          EA*(length - ell0)/ell0, etaA/ell0, True))
    for i in range(1, N):
        a, b = r[i] - r[i - 1], r[i + 1] - r[i]
        aa, bb = np.dot(a, a), np.dot(b, b)
        if min(aa, bb) < 1e-24:
            continue
        theta = np.arctan2(a[0]*b[1] - a[1]*b[0], np.dot(a, b))
        pa = np.array([-a[1], a[0]]) / aa
        pb = np.array([-b[1], b[0]]) / bb
        gradients = np.concatenate((pa, -pa - pb, pb))
        terms.append((2*(i - 1), gradients, B*theta/ell0, D/ell0, False))
    return terms


def solve_band(matrix, rhs):
    """Cholesky solve; matrix[i, k] stores the entry (i, i-k)."""
    size, stride = matrix.shape
    width = stride - 1
    for i in range(size):
        for j in range(max(0, i - width), i + 1):
            value = matrix[i, i - j]
            for k in range(max(0, i - width), j):
                value -= matrix[i, i - k] * matrix[j, j - k]
            matrix[i, i - j] = (np.sqrt(value) if i == j
                                else value / matrix[j, 0])
    result = rhs.copy()
    for i in range(size):
        for j in range(max(0, i - width), i):
            result[i] -= matrix[i, i - j] * result[j]
        result[i] /= matrix[i, 0]
    for i in range(size - 1, -1, -1):
        for j in range(i + 1, min(size, i + width + 1)):
            result[i] -= matrix[j, j - i] * result[j]
        result[i] /= matrix[i, 0]
    return result


def solve_material_velocity(state, h, held):
    """Solve v1 = v0 + h*a(r0, v1), with the supports prescribed."""
    terms = material_terms(state[0])
    old = state[1].ravel().copy()
    old[:2] = 0
    size = old.size
    masses = np.repeat(mass, 2)
    known = np.zeros(size, dtype=bool)
    known[:2] = True
    if held:
        known[-2:] = True

    def rate(term, v):
        start, gradient, _, _, _ = term
        return np.dot(gradient, v[start:start + gradient.size])

    def active(term, v):
        _, _, elastic, damping, unilateral = term
        return not unilateral or damping == 0 or elastic + damping*rate(term, v) > 0

    def objective(v):
        value = np.sum(0.5*masses*(v - old)**2 - h*masses*np.tile(g, N + 1)*v)
        for term in terms:
            _, _, elastic, damping, unilateral = term
            speed = rate(term, v)
            value += h * (max(0.0, elastic + damping*speed)**2/(2*damping)
                          if unilateral and damping > 0
                          else elastic*speed + 0.5*damping*speed**2)
        return value

    current = old.copy()
    for _ in range(40):
        matrix = np.zeros((size, 6))
        matrix[:, 0] = masses
        rhs = masses * (old + h*np.tile(g, N + 1))
        flags = [active(term, current) for term in terms]
        for enabled, term in zip(flags, terms):
            if not enabled:
                continue
            start, gradient, elastic, damping, _ = term
            for a, ga in enumerate(gradient):
                i = start + a
                rhs[i] -= h*elastic*ga
                for b in range(a + 1):
                    matrix[i, a - b] += h*damping*ga*gradient[b]
        for i in range(size):
            for j in range(max(0, i - 5), i):
                if known[i]:
                    rhs[j] -= matrix[i, i - j]*old[i]
                    matrix[i, i - j] = 0
                elif known[j]:
                    rhs[i] -= matrix[i, i - j]*old[j]
                    matrix[i, i - j] = 0
        matrix[known, 0] = 1
        rhs[known] = old[known]
        candidate = solve_band(matrix, rhs)
        if all(flag == active(term, candidate) for flag, term in zip(flags, terms)):
            return candidate.reshape(N + 1, 2)
        cost, fraction = objective(current), 1.0
        for _ in range(24):
            trial = current + fraction*(candidate - current)
            if objective(trial) <= cost + 1e-15:
                break
            fraction *= 0.5
        if np.max(np.abs(trial - current)) < 1e-10:
            return trial.reshape(N + 1, 2)
        current = trial
    raise RuntimeError("Internal friction solve did not converge")


def project_contour(state, held):
    r, v = state
    inverse_mass = 1 / mass
    inverse_mass[0] = 0.0
    if held:
        inverse_mass[-1] = 0.0
    for indices in (range(N - 1, -1, -1), range(N)):
        for i in indices:
            d = r[i + 1] - r[i]
            length = np.linalg.norm(d)
            if length > ell0 * (1 + 1e-6):
                continue
            wi, wj = inverse_mass[i:i + 2]
            if wi + wj == 0:
                continue
            direction = d / length if length > 1e-12 else np.array([1.0, 0.0])
            correction = max(0.0, ell0 - length) / (wi + wj)
            left = -wi * correction * direction
            right = wj * correction * direction
            r[i] += left
            r[i + 1] += right
            # Cancel closing motion; position repair does not supply a rebound.
            closing = np.dot(v[i + 1] - v[i], direction)
            impulse = max(0.0, -closing) / (wi + wj)
            v[i] -= wi * impulse * direction
            v[i + 1] += wj * impulse * direction


def substep(state, h, held=True, target=None):
    start = state.copy()
    if held:
        point = start[0, -1].copy() if target is None else np.array(target)
        offset = point - anchor
        point = anchor + offset * min(1.0, hand_reach / max(np.linalg.norm(offset), 1e-12))
        delta = point - start[0, -1]
        omega = 1 / hand_response
        acceleration = omega**2 * delta - 2 * omega * start[1, -1]
        acceleration *= min(1.0, hand_acceleration / max(np.linalg.norm(acceleration), 1e-12))
        velocity = start[1, -1] + h * acceleration
        start[1, -1] = velocity * min(1.0, hand_speed / max(np.linalg.norm(velocity), 1e-12))
    prediction = start.copy()
    prediction[1] = solve_material_velocity(start, h, held)
    prediction[0] += h * prediction[1]
    project_contour(prediction, held)
    return prediction


def tick(state, h, held=True, target=None):
    result = state.copy()
    if held and target is None:
        target = result[0, -1].copy()
    limit, remaining = 0.01 * ell0, h
    while remaining > h * 1e-12:
        speed = np.max(np.linalg.norm(result[1], axis=1))
        # Leave room for acceleration and contour corrections before retrying.
        part = min(remaining, 0.9 * limit / max(speed, 1e-12))
        for attempt in range(21):
            prediction = substep(result, part, held, target)
            movement = np.max(np.linalg.norm(prediction[0] - result[0], axis=1))
            if movement <= limit * (1 + 1e-6):
                break
            part *= 0.5
        else:
            raise RuntimeError("Could not resolve the string motion")
        result = prediction
        remaining -= part
    return result


def release(state):
    released = state.copy()
    released[1, -1] = 0.0
    return released


if __name__ == "__main__":
    state = release(initial_state())
    for _ in range(round(0.1 / h)):  # 0.1 physical seconds after letting go.
        state = tick(state, h, held=False)
    r, v = state
    print("Free endpoint after 0.1 s:", r[-1])
