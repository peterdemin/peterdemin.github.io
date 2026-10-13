export const GRAVITY = 9.81;
export const MASS = 1;
export const RADIUS = 0.2;
export const RESTITUTION = 0.65;
export const STOP_SPEED = 0.2;
export const WIDTH = 4;
export const HEIGHT = 3;
export const STEP = 1 / 120;

export function projectFloor(position) {
  return [position[0], Math.max(RADIUS, position[1])];
}

export function freeFlight(state, duration) {
  return [state[0] + state[2] * duration, state[1] + state[3] * duration - GRAVITY * duration ** 2 / 2, state[2], state[3] - GRAVITY * duration];
}

export function timeOfImpact(state) {
  const gap = Math.max(0, state[1] - RADIUS);
  const velocity = state[3];
  if (gap === 0) return velocity > 0 ? 2 * velocity / GRAVITY : 0;
  const root = Math.sqrt(velocity ** 2 + 2 * GRAVITY * gap);
  return velocity <= 0 ? 2 * gap / (root - velocity) : (velocity + root) / GRAVITY;
}

export function impact(velocity) {
  if (velocity >= 0) return {velocity, resting: velocity === 0, impulse: 0, lostEnergy: 0};
  const resting = -velocity <= STOP_SPEED;
  const outgoing = resting ? 0 : -RESTITUTION * velocity;
  return {velocity: outgoing, resting, impulse: MASS * (outgoing - velocity), lostEnergy: MASS * (velocity ** 2 - outgoing ** 2) / 2};
}

export class Ball {
  constructor() {
    this.state = [WIDTH / 2, RADIUS, 0, 0];
    this.resting = true;
    this.grabbed = false;
    this.time = 0;
    this.accumulator = 0;
    this.bounces = 0;
    this.lostEnergy = 0;
    this.lastImpact = null;
  }

  grab() {
    this.grabbed = true;
    this.resting = false;
    this.state[2] = 0;
    this.state[3] = 0;
    this.bounces = 0;
    this.lostEnergy = 0;
    this.lastImpact = null;
  }

  move(position) {
    if (!this.grabbed) return;
    if (!position.every(Number.isFinite)) throw new Error('Invalid hand position.');
    this.state = [Math.max(RADIUS, Math.min(WIDTH - RADIUS, position[0])), Math.max(RADIUS, Math.min(HEIGHT - RADIUS, position[1])), 0, 0];
  }

  release() {
    this.grabbed = false;
    this.state[2] = 0;
    this.state[3] = 0;
    this.resting = this.state[1] === RADIUS;
  }

  step(duration = STEP) {
    if (!Number.isFinite(duration) || duration < 0) throw new Error('Invalid tick duration.');
    let remaining = duration;
    let contacts = 0;
    while (remaining > 0 && !this.grabbed && !this.resting) {
      const collisionTime = timeOfImpact(this.state);
      if (collisionTime > remaining) {
        this.state = freeFlight(this.state, remaining);
        remaining = 0;
      } else {
        this.state = freeFlight(this.state, collisionTime);
        const incoming = this.state[3];
        const response = impact(incoming);
        const position = projectFloor([this.state[0], RADIUS]);
        this.state = [...position, this.state[2], response.velocity];
        this.resting = response.resting;
        this.lostEnergy += response.lostEnergy;
        this.lastImpact = {incoming, outgoing: response.velocity, impulse: response.impulse, time: this.time + duration - remaining + collisionTime};
        if (!this.resting) this.bounces++;
        remaining = Math.max(0, remaining - collisionTime);
        if (++contacts > 32) throw new Error('Too many contact events in one tick.');
      }
    }
    if (this.resting && !this.grabbed && remaining > 0) this.state[0] += this.state[2] * remaining;
    if (!this.state.every(Number.isFinite) || this.state[1] < RADIUS - 1e-10) throw new Error('Invalid contact state.');
    this.time += duration;
  }

  advanceFrame(elapsed, hidden = false) {
    if (hidden) {
      this.accumulator = 0;
      return 0;
    }
    this.accumulator += Math.max(0, Math.min(0.1, elapsed));
    let ticks = 0;
    while (this.accumulator + 1e-12 >= STEP && ticks < 16) {
      this.step();
      this.accumulator = Math.max(0, this.accumulator - STEP);
      ticks++;
    }
    if (this.accumulator >= STEP) this.accumulator %= STEP;
    return ticks;
  }
}
