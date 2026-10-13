export const MU = 3.98600435507e14;
export const EARTH_RADIUS = 6371008.4;
export const MASS = 1000;
export const ECCENTRICITY = 0.7;
export const PERIGEE = 8000000;
export const SEMIMAJOR = PERIGEE / (1 - ECCENTRICITY);
export const APOGEE = SEMIMAJOR * (1 + ECCENTRICITY);
export const SEMIMINOR = SEMIMAJOR * Math.sqrt(1 - ECCENTRICITY ** 2);
export const PERIOD = 2 * Math.PI * Math.sqrt(SEMIMAJOR ** 3 / MU);
export const PLAYBACK_PERIOD = 10;
export const TIME_SCALE = PERIOD / PLAYBACK_PERIOD;
export const STEP = 2;
export const TRACE_INTERVAL = 20;
export const MAX_FRAME_SECONDS = 0.1;
export const MAX_FRAME_STEPS = 256;

export function gravity(position) {
  const radius = Math.hypot(position[0], position[1]);
  if (!Number.isFinite(radius) || radius <= EARTH_RADIUS) throw new Error('The trajectory entered Earth or became invalid.');
  const factor = -MU / radius ** 3;
  return [factor * position[0], factor * position[1]];
}

export function derivative(time, state) {
  const acceleration = gravity(state);
  return [state[2], state[3], ...acceleration];
}

export function rk4(state, time, step, rates = derivative) {
  const first = rates(time, state);
  const second = rates(time + step / 2, state.map((value, index) => value + step * first[index] / 2));
  const third = rates(time + step / 2, state.map((value, index) => value + step * second[index] / 2));
  const fourth = rates(time + step, state.map((value, index) => value + step * third[index]));
  return state.map((value, index) => value + step * (first[index] + 2 * second[index] + 2 * third[index] + fourth[index]) / 6);
}

export function initialState() {
  return [PERIGEE, 0, 0, Math.sqrt(MU * (2 / PERIGEE - 1 / SEMIMAJOR))];
}

export function invariants(state) {
  const radius = Math.hypot(state[0], state[1]);
  return {
    energy: (state[2] ** 2 + state[3] ** 2) / 2 - MU / radius,
    momentum: state[0] * state[3] - state[1] * state[2]
  };
}

export class Orbit {
  constructor() {
    this.state = initialState();
    this.time = 0;
    this.ticks = 0;
    this.accumulator = 0;
    this.turns = 0;
    this.lastCrossing = 0;
    this.measuredPeriod = null;
    this.reference = invariants(this.state);
    this.capacity = Math.ceil(PERIOD / TRACE_INTERVAL) + 2;
    this.trace = new Array(this.capacity);
    this.traceStart = 0;
    this.traceCount = 0;
    this.record();
  }

  record() {
    while (this.traceCount && this.trace[this.traceStart].time < this.time - PERIOD) {
      this.traceStart = (this.traceStart + 1) % this.capacity;
      this.traceCount--;
    }
    if (this.traceCount === this.capacity) {
      this.traceStart = (this.traceStart + 1) % this.capacity;
      this.traceCount--;
    }
    this.trace[(this.traceStart + this.traceCount) % this.capacity] = {time: this.time, position: this.state.slice(0, 2)};
    this.traceCount++;
  }

  step() {
    const previous = this.state;
    const next = rk4(previous, this.time, STEP);
    if (!next.every(Number.isFinite)) throw new Error('The integrator produced a non-finite state.');
    gravity(next);
    if (previous[1] < 0 && next[1] >= 0 && next[0] > 0) {
      const crossing = this.time + STEP * -previous[1] / (next[1] - previous[1]);
      this.measuredPeriod = crossing - this.lastCrossing;
      this.lastCrossing = crossing;
      this.turns++;
    }
    this.state = next;
    this.ticks++;
    this.time = this.ticks * STEP;
    if (this.ticks % (TRACE_INTERVAL / STEP) === 0) this.record();
  }

  advanceFrame(elapsed, hidden = false) {
    if (hidden) {
      this.accumulator = 0;
      return 0;
    }
    this.accumulator += Math.max(0, Math.min(MAX_FRAME_SECONDS, elapsed)) * TIME_SCALE;
    let count = 0;
    while (this.accumulator >= STEP && count < MAX_FRAME_STEPS) {
      this.step();
      this.accumulator -= STEP;
      count++;
    }
    if (this.accumulator >= STEP) this.accumulator %= STEP;
    return count;
  }
}
