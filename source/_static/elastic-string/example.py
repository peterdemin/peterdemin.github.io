"""The article's Python version of the interactive string's physical tick."""

import numpy as np

N = 80
L0, mu0, EA = 4.0, 0.02, 100.0  # m, kg/m, N
etaA, h = 0.1, 0.000005         # N s, s
B = 0.01                       # N m^2
D = B * etaA / EA               # N m^2 s
beta = 0.8                      # 1/s: artificial settling damping
ell0 = L0 / N
g = np.array([0.0, -9.81])
anchor = np.array([-0.4 * L0, 0.65 * L0])
hand_reach, hand_speed = 1.15 * L0, 1.5 * L0
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
    dv = force / mass[:, None] - beta * v
    dr[0] = dv[0] = 0.0
    if held:
        dv[-1] = 0.0  # dr[-1] remains the prescribed hand velocity.
    return np.array([dr, dv])


def project_contour(state, h, held):
    r, v = state
    inverse_mass = 1 / mass
    inverse_mass[0] = 0.0
    if held:
        inverse_mass[-1] = 0.0
    for indices in (range(N - 1, -1, -1), range(N)):
        for i in indices:
            d = r[i + 1] - r[i]
            length = np.linalg.norm(d)
            if length >= ell0 * (1 - 1e-6):
                continue
            wi, wj = inverse_mass[i:i + 2]
            if wi + wj == 0:
                continue
            direction = d / length if length > 1e-12 else np.array([1.0, 0.0])
            correction = (ell0 - length) / (wi + wj)
            left = -wi * correction * direction
            right = wj * correction * direction
            r[i] += left
            r[i + 1] += right
            v[i] += left / h
            v[i + 1] += right / h


def tick(state, h, held=True, target=None):
    start = state.copy()
    if held:
        point = start[0, -1].copy() if target is None else np.array(target)
        offset = point - anchor
        point = anchor + offset * min(1.0, hand_reach / max(np.linalg.norm(offset), 1e-12))
        delta = point - start[0, -1]
        start[1, -1] = delta * min(1 / h, hand_speed / max(np.linalg.norm(delta), 1e-12))
    prediction = start + h * f(start, held)
    project_contour(prediction, h, held)
    return prediction


def release(state):
    released = state.copy()
    released[1, -1] = 0.0
    return released


if __name__ == "__main__":
    state = release(initial_state())
    for _ in range(20000):  # 0.1 physical seconds after letting go.
        state = tick(state, h, held=False)
    r, v = state
    print("Free endpoint after 0.1 s:", r[-1])
