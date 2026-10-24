export const GRAVITY = 9.81;
export const RADIUS = 0.2;
export const RESTITUTION = 0.65;
export const STOP_SPEED = 0.2;
export const FLOOR_DECELERATION = 0.8;
export const WIDTH = 4;
export const HEIGHT = 3;
export const STEP = 1 / 120;
export const SUBSTEP = 1 / 480;
export const GAP_TOLERANCE = 1e-9;
const VELOCITY_TOLERANCE = 1e-9;

const dot = (first, second) => first[0] * second[0] + first[1] * second[1];
const weight = body => body.held ? 0 : 1 / body.mass;

export function pairGeometry(first, second) {
  const difference = [second.position[0] - first.position[0], second.position[1] - first.position[1]];
  const distance = Math.hypot(...difference);
  if (distance < 1e-12) throw new Error('Coincident disk centers.');
  return {normal: difference.map(value => value / distance), distance, gap: distance - first.radius - second.radius};
}

export function pairImpulse(first, second, restitution = RESTITUTION) {
  const normal = pairGeometry(first, second).normal;
  const approach = dot(second.velocity.map((value, index) => value - first.velocity[index]), normal);
  if (approach >= 0) return 0;
  const impulse = -(1 + restitution) * approach / (weight(first) + weight(second));
  for (let axis = 0; axis < 2; axis++) {
    first.velocity[axis] -= weight(first) * impulse * normal[axis];
    second.velocity[axis] += weight(second) * impulse * normal[axis];
  }
  return impulse;
}

export function contacts(bodies, tolerance = GAP_TOLERANCE) {
  const result = [];
  bodies.forEach((body, index) => {
    for (const [gap, normal, kind] of [
      [body.position[1] - body.radius, [0, 1], 'floor'],
      [body.position[0] - body.radius, [1, 0], 'left wall'],
      [WIDTH - body.radius - body.position[0], [-1, 0], 'right wall']
    ]) if (gap <= tolerance) result.push({first: -1, second: index, normal, gap, kind});
  });
  const pair = pairGeometry(...bodies);
  if (pair.gap <= tolerance) result.push({first: 0, second: 1, ...pair, kind: 'pair'});
  return result;
}

function relative(values, contact) {
  const first = contact.first < 0 ? [0, 0] : values[contact.first];
  return values[contact.second].map((value, axis) => value - first[axis]);
}

function projectRates(bodies, values, active, targets) {
  const impulses = active.map(() => 0);
  for (let sweep = 0; sweep < 160; sweep++) {
    let largest = 0;
    active.forEach((contact, index) => {
      const firstWeight = contact.first < 0 ? 0 : weight(bodies[contact.first]);
      const secondWeight = weight(bodies[contact.second]);
      const total = firstWeight + secondWeight;
      if (total === 0) return;
      const normalRate = dot(relative(values, contact), contact.normal);
      const proposed = impulses[index] + (targets[index] - normalRate) / total;
      const next = contact.limit === undefined ? Math.max(0, proposed) : Math.max(-contact.limit, Math.min(contact.limit, proposed));
      const change = next - impulses[index];
      impulses[index] = next;
      largest = Math.max(largest, Math.abs(change));
      for (let axis = 0; axis < 2; axis++) {
        if (contact.first >= 0) values[contact.first][axis] -= firstWeight * change * contact.normal[axis];
        values[contact.second][axis] += secondWeight * change * contact.normal[axis];
      }
    });
    if (largest < 1e-12) break;
  }
  const residual = active.reduce((largest, contact, index) => contact.limit === undefined ? Math.max(largest, targets[index] - dot(relative(values, contact), contact.normal)) : largest, 0);
  if (residual > 1e-8) throw new Error('Contact-rate solve did not converge.');
  return impulses;
}

export function resolveContacts(bodies, active = contacts(bodies)) {
  const before = bodies.map(body => body.velocity.slice());
  const approach = active.map(contact => dot(relative(before, contact), contact.normal));
  const compressed = before.map(value => value.slice());
  projectRates(bodies, compressed, active, active.map(() => 0));
  const fastest = Math.max(0, ...approach.map(value => -value));
  const restitution = fastest <= STOP_SPEED ? 0 : RESTITUTION;
  const after = before.map((velocity, index) => velocity.map((value, axis) => compressed[index][axis] + restitution * (compressed[index][axis] - value)));
  projectRates(bodies, after, active, active.map(() => 0));
  bodies.forEach((body, index) => { body.velocity = after[index]; });
  return {approach, restitution, changed: after.some((velocity, index) => velocity.some((value, axis) => Math.abs(value - before[index][axis]) > VELOCITY_TOLERANCE))};
}

function accelerations(bodies) {
  const velocities = bodies.map(body => body.velocity);
  const active = contacts(bodies).filter(contact => dot(relative(velocities, contact), contact.normal) <= VELOCITY_TOLERANCE);
  const rates = bodies.map(body => {
    if (body.held) return [0, 0];
    const supported = body.position[1] <= body.radius + GAP_TOLERANCE && Math.abs(body.velocity[1]) < VELOCITY_TOLERANCE;
    return [supported ? -FLOOR_DECELERATION * Math.sign(body.velocity[0]) : 0, -GRAVITY];
  });
  const targets = active.map(contact => {
    if (contact.first < 0) return 0;
    const velocity = relative(velocities, contact);
    const normalSpeed = dot(velocity, contact.normal);
    return -(dot(velocity, velocity) - normalSpeed ** 2) / contact.distance;
  });
  bodies.forEach((body, index) => {
    if (!body.held && body.position[1] <= body.radius + GAP_TOLERANCE && Math.abs(body.velocity[1]) < VELOCITY_TOLERANCE && Math.abs(body.velocity[0]) < VELOCITY_TOLERANCE) {
      active.push({first: -1, second: index, normal: [1, 0], limit: body.mass * FLOOR_DECELERATION});
      targets.push(0);
    }
  });
  projectRates(bodies, rates, active, targets);
  return rates;
}

const evaluate = (coefficients, value) => coefficients.reduceRight((sum, coefficient) => sum * value + coefficient, 0);

function roots(coefficients) {
  while (coefficients.length > 1 && Math.abs(coefficients.at(-1)) < 1e-18) coefficients.pop();
  if (coefficients.length === 1) return [];
  if (coefficients.length === 2) {
    const root = -coefficients[0] / coefficients[1];
    return root >= 0 && root <= 1 ? [root] : [];
  }
  const derivative = coefficients.slice(1).map((value, index) => value * (index + 1));
  const boundaries = [0, ...roots(derivative).filter(value => value > 0 && value < 1), 1];
  const result = [];
  for (let index = 0; index < boundaries.length - 1; index++) {
    let lower = boundaries[index];
    let upper = boundaries[index + 1];
    const lowerValue = evaluate(coefficients, lower);
    const upperValue = evaluate(coefficients, upper);
    if (Math.abs(lowerValue) < 1e-18) result.push(lower);
    if (lowerValue * upperValue < 0) {
      for (let iteration = 0; iteration < 55; iteration++) {
        const midpoint = (lower + upper) / 2;
        if (evaluate(coefficients, lower) * evaluate(coefficients, midpoint) <= 0) upper = midpoint;
        else lower = midpoint;
      }
      result.push((lower + upper) / 2);
    }
    if (index === boundaries.length - 2 && Math.abs(upperValue) < 1e-18) result.push(upper);
  }
  return [...new Set(result)].sort((first, second) => first - second);
}

function planeTime(gap, speed, acceleration, duration) {
  const candidates = roots([gap, speed * duration, acceleration * duration ** 2 / 2]);
  return candidates.map(value => value * duration).find(time => time > 1e-12 && speed + acceleration * time < -VELOCITY_TOLERANCE) ?? Infinity;
}

export function pairTime(bodies, rates, duration) {
  const distance = bodies[1].position.map((value, axis) => value - bodies[0].position[axis]);
  const velocity = bodies[1].velocity.map((value, axis) => value - bodies[0].velocity[axis]);
  const acceleration = rates[1].map((value, axis) => value - rates[0][axis]);
  const diameter = bodies[0].radius + bodies[1].radius;
  const coefficients = [dot(distance, distance) - diameter ** 2, 2 * dot(distance, velocity), dot(velocity, velocity) + dot(distance, acceleration), dot(velocity, acceleration), dot(acceleration, acceleration) / 4];
  const candidates = roots(coefficients.map((value, index) => value * duration ** index));
  for (const fraction of candidates) {
    const time = fraction * duration;
    const position = distance.map((value, axis) => value + velocity[axis] * time + acceleration[axis] * time ** 2 / 2);
    const rate = velocity.map((value, axis) => value + acceleration[axis] * time);
    if (time > 1e-12 && dot(position, rate) < -VELOCITY_TOLERANCE) return time;
  }
  return Infinity;
}

function repairPositions(bodies) {
  for (let sweep = 0; sweep < 80; sweep++) {
    const active = contacts(bodies, 0);
    const worst = Math.max(0, ...active.map(contact => -contact.gap));
    if (worst < 1e-11) return;
    for (const contact of active) {
      const firstWeight = contact.first < 0 ? 0 : weight(bodies[contact.first]);
      const secondWeight = weight(bodies[contact.second]);
      const total = firstWeight + secondWeight;
      if (total === 0) continue;
      const correction = Math.max(0, -contact.gap) / total;
      for (let axis = 0; axis < 2; axis++) {
        if (contact.first >= 0) bodies[contact.first].position[axis] -= firstWeight * correction * contact.normal[axis];
        bodies[contact.second].position[axis] += secondWeight * correction * contact.normal[axis];
      }
    }
  }
  throw new Error('Position constraints did not converge.');
}

export function energy(bodies) {
  return bodies.reduce((sum, body) => sum + body.mass * (dot(body.velocity, body.velocity) / 2 + GRAVITY * (body.position[1] - body.radius)), 0);
}

export class TwoBalls {
  constructor() { this.reset(); }

  reset() {
    this.bodies = [
      {position: [1.82, 2.2], velocity: [0, 0], mass: 1, radius: RADIUS, held: true},
      {position: [2, RADIUS], velocity: [0, 0], mass: 1, radius: RADIUS, held: false}
    ];
    this.time = 0;
    this.accumulator = 0;
    this.pairHits = 0;
    this.wallHits = 0;
    this.firstPair = null;
    this.retries = 0;
  }

  grab() {
    this.bodies[0].held = true;
    this.bodies[0].velocity = [0, 0];
    this.pairHits = 0;
    this.wallHits = 0;
    this.firstPair = null;
  }

  move(position) {
    if (!this.bodies[0].held || !position.every(Number.isFinite)) return false;
    const candidate = [Math.max(RADIUS, Math.min(WIDTH - RADIUS, position[0])), Math.max(RADIUS, Math.min(HEIGHT - RADIUS, position[1]))];
    if (Math.hypot(...candidate.map((value, axis) => value - this.bodies[1].position[axis])) < 2 * RADIUS + GAP_TOLERANCE) return false;
    this.bodies[0].position = candidate;
    this.bodies[0].velocity = [0, 0];
    return true;
  }

  release() {
    this.bodies[0].held = false;
    this.bodies[0].velocity = [0, 0];
  }

  resolve() {
    const active = contacts(this.bodies);
    const response = resolveContacts(this.bodies, active);
    if (response.changed) {
      if (active.some((contact, index) => contact.kind === 'pair' && response.approach[index] < -STOP_SPEED)) {
        this.pairHits++;
        if (this.firstPair === null) this.firstPair = this.bodies.map(body => body.velocity.slice());
      }
      this.wallHits += active.filter((contact, index) => contact.kind.includes('wall') && response.approach[index] < -STOP_SPEED).length;
    }
  }

  slice(duration) {
    let remaining = duration;
    let events = 0;
    while (remaining > 1e-12) {
      this.resolve();
      const rates = accelerations(this.bodies);
      let next = Math.min(remaining, pairTime(this.bodies, rates, remaining));
      this.bodies.forEach((body, index) => {
        for (const [gap, normal] of [[body.position[1] - body.radius, [0, 1]], [body.position[0] - body.radius, [1, 0]], [WIDTH - body.radius - body.position[0], [-1, 0]]]) {
          next = Math.min(next, planeTime(gap, dot(body.velocity, normal), dot(rates[index], normal), remaining));
        }
        if (body.position[1] <= body.radius + GAP_TOLERANCE && body.velocity[0] * rates[index][0] < 0) next = Math.min(next, -body.velocity[0] / rates[index][0]);
      });
      this.bodies.forEach((body, index) => {
        for (let axis = 0; axis < 2; axis++) {
          body.position[axis] += body.velocity[axis] * next + rates[index][axis] * next ** 2 / 2;
          body.velocity[axis] += rates[index][axis] * next;
          if (Math.abs(body.velocity[axis]) < 1e-12) body.velocity[axis] = 0;
        }
      });
      repairPositions(this.bodies);
      remaining -= next;
      if (++events > 32) throw new Error('Too many events in a substep.');
    }
    this.resolve();
  }

  step(duration = STEP) {
    if (!Number.isFinite(duration) || duration < 0) throw new Error('Invalid tick duration.');
    let remaining = duration;
    while (remaining > 1e-12) {
      let trial = Math.min(remaining, SUBSTEP);
      for (let attempt = 0; ; attempt++) {
        const saved = this.bodies.map(body => ({...body, position: body.position.slice(), velocity: body.velocity.slice()}));
        const diagnostics = [this.pairHits, this.wallHits, this.firstPair];
        const before = energy(saved);
        this.slice(trial);
        const after = energy(this.bodies);
        if (after <= before + 1e-10 * Math.max(1, before)) break;
        this.bodies = saved;
        [this.pairHits, this.wallHits, this.firstPair] = diagnostics;
        trial /= 2;
        this.retries++;
        if (attempt === 16) throw new Error('Energy/step-size check failed.');
      }
      if (!this.bodies.every(body => [...body.position, ...body.velocity].every(Number.isFinite))) throw new Error('Non-finite disk state.');
      remaining -= trial;
      this.time += trial;
    }
  }

  advanceFrame(elapsed, hidden = false) {
    if (hidden) { this.accumulator = 0; return; }
    this.accumulator += Math.max(0, Math.min(0.1, elapsed));
    let ticks = 0;
    while (this.accumulator + 1e-12 >= STEP && ticks++ < 16) {
      this.step();
      this.accumulator = Math.max(0, this.accumulator - STEP);
    }
    if (this.accumulator >= STEP) this.accumulator %= STEP;
  }
}
