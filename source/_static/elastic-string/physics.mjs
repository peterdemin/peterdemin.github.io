export const SEGMENTS = 80;
export const LENGTH = 4;
export const DENSITY = 0.02;
export const AXIAL = 100;
export const VISCOSITY_AREA = 0.1;
export const BENDING = 0.01;
export const BENDING_DAMPING = BENDING * VISCOSITY_AREA / AXIAL;
export const SETTLING_DAMPING = 0.8; // 1/s: gentle artificial damping of the overall swing.
export const GRAVITY = 9.81;
export const STEP = 0.000005;
export const ANCHOR = [-0.4 * LENGTH, 0.65 * LENGTH];
export const HAND_REACH = 1.15 * LENGTH;
export const HAND_SPEED = 1.5 * LENGTH;

// State: all (x,y) positions followed by all (vx,vy) velocities.
export function parameters(overrides = {}) {
  const p = {segments: SEGMENTS, length: LENGTH, density: DENSITY, axial: AXIAL,
    viscosityArea: VISCOSITY_AREA, bending: BENDING, bendingDamping: BENDING_DAMPING,
    gravity: GRAVITY,
    settlingDamping: SETTLING_DAMPING, ...overrides};
  p.spacing = p.length / p.segments;
  p.size = 2 * (p.segments + 1);
  p.mass = Float64Array.from({length: p.segments + 1}, (_, i) =>
    p.density * p.spacing * (i === 0 || i === p.segments ? 0.5 : 1));
  p.inverseMass = Float64Array.from(p.mass, mass => 1 / mass);
  return p;
}

export function internalForces(state, p, force = new Float64Array(p.size)) {
  force.fill(0);
  const velocity = p.size;
  for (let i = 0; i < p.segments; i++) {
    const j = 2 * i;
    const dx = state[j + 2] - state[j], dy = state[j + 3] - state[j + 1];
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length <= p.spacing) continue;
    const nx = dx / length, ny = dy / length;
    const rate = (state[velocity + j + 2] - state[velocity + j]) * nx
      + (state[velocity + j + 3] - state[velocity + j + 1]) * ny;
    const tension = Math.max(0,
      (p.axial * (length - p.spacing) + p.viscosityArea * rate) / p.spacing);
    force[j] += tension * nx;
    force[j + 1] += tension * ny;
    force[j + 2] -= tension * nx;
    force[j + 3] -= tension * ny;
  }
  for (let i = 1; i < p.segments; i++) {
    const j = 2 * i;
    const ax = state[j] - state[j - 2], ay = state[j + 1] - state[j - 1];
    const bx = state[j + 2] - state[j], by = state[j + 3] - state[j + 1];
    const la = Math.sqrt(ax * ax + ay * ay), lb = Math.sqrt(bx * bx + by * by);
    if (la < 1e-12 || lb < 1e-12) continue;
    // Manufactured-length constraints keep these angle gradients resolved.
    const theta = Math.atan2(ax * by - ay * bx, ax * bx + ay * by);
    const gx = -ay / (la * la), gy = ax / (la * la);
    const hx = -by / (lb * lb), hy = bx / (lb * lb);
    const rate = gx * state[velocity + j - 2] + gy * state[velocity + j - 1]
      - (gx + hx) * state[velocity + j] - (gy + hy) * state[velocity + j + 1]
      + hx * state[velocity + j + 2] + hy * state[velocity + j + 3];
    const moment = (p.bending * theta + p.bendingDamping * rate) / p.spacing;
    force[j - 2] -= moment * gx;
    force[j - 1] -= moment * gy;
    force[j] += moment * (gx + hx);
    force[j + 1] += moment * (gy + hy);
    force[j + 2] -= moment * hx;
    force[j + 3] -= moment * hy;
  }
  return force;
}

// Pure rate function. The hand prescribes endpoint velocity while held.
export function rateFunction(state, p, held = false, out = new Float64Array(state.length), force = new Float64Array(p.size)) {
  internalForces(state, p, force);
  for (let i = 0; i <= p.segments; i++) {
    const j = 2 * i;
    out[j] = state[p.size + j];
    out[j + 1] = state[p.size + j + 1];
    out[p.size + j] = force[j] / p.mass[i] - p.settlingDamping * state[p.size + j];
    out[p.size + j + 1] = force[j + 1] / p.mass[i] - p.gravity
      - p.settlingDamping * state[p.size + j + 1];
  }
  out[0] = out[1] = out[p.size] = out[p.size + 1] = 0;
  if (held) out[2 * p.size - 2] = out[2 * p.size - 1] = 0;
  return out;
}

export function mechanicalEnergy(state, p) {
  let energy = 0;
  for (let i = 0; i <= p.segments; i++) {
    const j = 2 * i;
    energy += 0.5 * p.mass[i] * (state[p.size + j] ** 2 + state[p.size + j + 1] ** 2)
      + p.mass[i] * p.gravity * state[j + 1];
    if (i === p.segments) continue;
    const dx = state[j + 2] - state[j], dy = state[j + 3] - state[j + 1];
    energy += 0.5 * p.axial / p.spacing * Math.max(Math.hypot(dx, dy) - p.spacing, 0) ** 2;
    if (i === 0) continue;
    const ax = state[j] - state[j - 2], ay = state[j + 1] - state[j - 1];
    if (Math.hypot(ax, ay) < 1e-12 || Math.hypot(dx, dy) < 1e-12) continue;
    const theta = Math.atan2(ax * dy - ay * dx, ax * dx + ay * dy);
    energy += 0.5 * p.bending / p.spacing * theta ** 2;
  }
  return energy;
}

export class ElasticString {
  constructor(overrides = {}) {
    this.p = parameters(overrides);
    this.state = new Float64Array(2 * this.p.size);
    this.rates = new Float64Array(this.state.length);
    this.forces = new Float64Array(this.p.size);
    this.reset();
  }

  reset() {
    this.state.fill(0);
    for (let i = 0; i <= this.p.segments; i++) {
      this.state[2 * i] = ANCHOR[0] + this.p.length * i / this.p.segments;
      this.state[2 * i + 1] = ANCHOR[1];
    }
    this.held = true;
    this.target = this.endpoint;
    this.time = 0;
    this.accumulator = 0;
  }

  get endpoint() { return [this.state[this.p.size - 2], this.state[this.p.size - 1]]; }

  grab() { this.held = true; this.target = this.endpoint; }

  move(point) {
    if (!this.held) return;
    const dx = point[0] - ANCHOR[0], dy = point[1] - ANCHOR[1];
    const scale = Math.min(1, HAND_REACH / Math.max(Math.hypot(dx, dy), 1e-12));
    this.target = [ANCHOR[0] + dx * scale, ANCHOR[1] + dy * scale];
  }

  release() {
    this.held = false;
    this.state[2 * this.p.size - 2] = this.state[2 * this.p.size - 1] = 0;
  }

  step(h = STEP) {
    const end = this.p.size - 2;
    if (this.held) {
      const dx = this.target[0] - this.state[end], dy = this.target[1] - this.state[end + 1];
      const factor = Math.min(1 / h, HAND_SPEED / Math.max(Math.hypot(dx, dy), 1e-12));
      this.state[this.p.size + end] = dx * factor;
      this.state[this.p.size + end + 1] = dy * factor;
    }
    rateFunction(this.state, this.p, this.held, this.rates, this.forces);
    // Forward Euler: every derivative was evaluated before any state changes.
    for (let i = 0; i < this.state.length; i++) this.state[i] += h * this.rates[i];
    this.projectContour(h);
    this.time += h;
  }

  projectContour(h) {
    const p = this.p, state = this.state;
    // Slack is a change of shape, not a loss of manufactured contour length.
    // Correct shortened links geometrically; store no compression energy.
    for (let sweep = 0; sweep < 2; sweep++) {
      for (let k = 0; k < p.segments; k++) {
        const i = sweep % 2 ? k : p.segments - 1 - k, j = 2 * i;
        const dx = state[j + 2] - state[j], dy = state[j + 3] - state[j + 1];
        const length = Math.sqrt(dx * dx + dy * dy);
        if (length >= p.spacing * (1 - 1e-6)) continue;
        const wi = i === 0 ? 0 : p.inverseMass[i];
        const wj = this.held && i + 1 === p.segments ? 0 : p.inverseMass[i + 1];
        if (wi + wj === 0) continue;
        const nx = length > 1e-12 ? dx / length : 1;
        const ny = length > 1e-12 ? dy / length : 0;
        const correction = (p.spacing - length) / (wi + wj);
        const ax = -wi * correction * nx, ay = -wi * correction * ny;
        const bx = wj * correction * nx, by = wj * correction * ny;
        state[j] += ax; state[j + 1] += ay;
        state[j + 2] += bx; state[j + 3] += by;
        // Constraint impulses must update velocities as well as positions.
        state[p.size + j] += ax / h; state[p.size + j + 1] += ay / h;
        state[p.size + j + 2] += bx / h; state[p.size + j + 3] += by / h;
      }
    }
  }

  advanceFrame(seconds) {
    this.accumulator += Math.min(Math.max(seconds, 0), 0.05);
    const ticks = Math.min(6000, Math.floor(this.accumulator / STEP));
    for (let i = 0; i < ticks; i++) this.step();
    this.accumulator -= ticks * STEP;
    if (this.accumulator >= STEP) this.accumulator %= STEP;
    if (!this.state.every(Number.isFinite)) throw new Error('The calculation became unstable. Reset the string to continue.');
  }

  maxStrain() {
    let value = 0;
    for (let i = 0; i < this.p.segments; i++) value = Math.max(value,
      Math.hypot(this.state[2*i+2] - this.state[2*i], this.state[2*i+3] - this.state[2*i+1]) / this.p.spacing - 1);
    return value;
  }
}
