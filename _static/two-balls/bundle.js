(() => {
'use strict';
try {
const GRAVITY = 9.81;
const RADIUS = 0.2;
const RESTITUTION = 0.65;
const STOP_SPEED = 0.2;
const FLOOR_DECELERATION = 0.8;
const WIDTH = 4;
const HEIGHT = 3;
const STEP = 1 / 120;
const SUBSTEP = 1 / 480;
const GAP_TOLERANCE = 1e-9;
const VELOCITY_TOLERANCE = 1e-9;

const dot = (first, second) => first[0] * second[0] + first[1] * second[1];
const weight = body => body.held ? 0 : 1 / body.mass;

function pairGeometry(first, second) {
  const difference = [second.position[0] - first.position[0], second.position[1] - first.position[1]];
  const distance = Math.hypot(...difference);
  if (distance < 1e-12) throw new Error('Coincident disk centers.');
  return {normal: difference.map(value => value / distance), distance, gap: distance - first.radius - second.radius};
}

function pairImpulse(first, second, restitution = RESTITUTION) {
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

function contacts(bodies, tolerance = GAP_TOLERANCE) {
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

function resolveContacts(bodies, active = contacts(bodies)) {
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

function pairTime(bodies, rates, duration) {
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

function energy(bodies) {
  return bodies.reduce((sum, body) => sum + body.mass * (dot(body.velocity, body.velocity) / 2 + GRAVITY * (body.position[1] - body.radius)), 0);
}

class TwoBalls {
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
function worldPoint(camera, clientX, clientY) {
  return [(clientX - camera.rectangle.left - camera.left) / camera.scale, (camera.floor - clientY + camera.rectangle.top) / camera.scale];
}

function orangeHit(bodies, camera, point) {
  const distance = body => Math.hypot(...point.map((value, axis) => value - body.position[axis])) * camera.scale;
  const orangeDistance = distance(bodies[0]);
  const blueDistance = distance(bodies[1]);
  if (blueDistance <= bodies[1].radius * camera.scale && blueDistance < orangeDistance) return false;
  return orangeDistance <= Math.max(24, bodies[0].radius * camera.scale + 8);
}

const canvas = document.querySelector('#scene');
const context = canvas.getContext('2d');
if (!context) throw new Error('Canvas 2D is unavailable.');
const simulation = new TwoBalls();
const releaseButton = document.querySelector('#release');
const resetButton = document.querySelector('#reset');
const status = document.querySelector('#status');
const velocities = document.querySelector('#velocities');
const impactText = document.querySelector('#impact');
const error = document.querySelector('#error');
let dark = matchMedia('(prefers-color-scheme: dark)').matches;
let pointer = null;
let hovering = false;
let offset = [0, 0];
let last = null;

function view() {
  const rectangle = canvas.getBoundingClientRect();
  const scale = Math.min((rectangle.width - 64) / WIDTH, (rectangle.height - 80) / HEIGHT);
  return {rectangle, scale, left: (rectangle.width - WIDTH * scale) / 2, floor: (rectangle.height + HEIGHT * scale) / 2 - 8};
}

function draw() {
  const camera = view();
  const width = camera.rectangle.width;
  const height = camera.rectangle.height;
  if (!width || !height) return;
  const ratio = Math.min(2, devicePixelRatio || 1);
  if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
  }
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.fillStyle = dark ? '#0c1725' : '#f0f4f8';
  context.fillRect(0, 0, width, height);
  context.fillStyle = dark ? '#172738' : '#dbe5ee';
  context.fillRect(0, camera.floor, width, height - camera.floor);
  const ink = dark ? '#b3c1d3' : '#4e657d';
  context.strokeStyle = ink;
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(camera.left, camera.floor - HEIGHT * camera.scale);
  context.lineTo(camera.left, camera.floor);
  context.lineTo(camera.left + WIDTH * camera.scale, camera.floor);
  context.lineTo(camera.left + WIDTH * camera.scale, camera.floor - HEIGHT * camera.scale);
  context.stroke();
  context.font = '12px system-ui,sans-serif';
  context.textAlign = 'center';
  context.fillStyle = ink;
  for (let metre = 0; metre <= WIDTH; metre++) context.fillText(metre + ' m', camera.left + metre * camera.scale, camera.floor + 23);
  const centers = simulation.bodies.map(body => [camera.left + body.position[0] * camera.scale, camera.floor - body.position[1] * camera.scale]);
  simulation.bodies.forEach((body, index) => {
    context.fillStyle = index === 0 ? '#e9914f' : '#75b9e0';
    context.beginPath();
    context.arc(...centers[index], body.radius * camera.scale, 0, 2 * Math.PI);
    context.fill();
    context.strokeStyle = dark ? '#d8e3ed' : '#46607a';
    context.lineWidth = 1;
    context.stroke();
    context.fillStyle = '#213547';
    context.fillText(index === 0 ? 'A' : 'B', centers[index][0], centers[index][1] + 4);
    if (index === 0) {
      context.setLineDash([4, 4]);
      context.beginPath();
      context.arc(...centers[index], Math.max(24, body.radius * camera.scale + 8), 0, 2 * Math.PI);
      context.stroke();
      context.setLineDash([]);
      context.fillStyle = ink;
      context.fillText(pointer !== null ? 'Held' : 'Pick me', centers[index][0], centers[index][1] - Math.max(36, body.radius * camera.scale + 18));
    }
  });
  releaseButton.disabled = !simulation.bodies[0].held;
  canvas.style.cursor = pointer !== null ? 'grabbing' : hovering ? 'grab' : 'default';
  const stopped = simulation.bodies.every(body => Math.hypot(...body.velocity) < 1e-8);
  status.textContent = simulation.bodies[0].held ? 'Orange A is held. Release it or drag to change the offset; blue B has finite mass.' : stopped ? 'Both velocities are currently zero — reset or lift orange again.' : 'Both disks are free to respond to contacts, gravity and floor resistance.';
  velocities.textContent = simulation.bodies.map((body, index) => `${index === 0 ? 'Orange A' : 'Blue B'} velocity: (${body.velocity[0].toFixed(2)}, ${body.velocity[1].toFixed(2)}) m/s`).join(' · ') + ` · energy ${energy(simulation.bodies).toFixed(3)} J`;
  impactText.textContent = `Pair impacts: ${simulation.pairHits} · wall impacts: ${simulation.wallHits}` + (simulation.firstPair ? ` · first shared-impact horizontal velocities: ${simulation.firstPair[0][0].toFixed(2)} / ${simulation.firstPair[1][0].toFixed(2)} m/s` : ' · no shared impact yet');
  canvas.dataset.bodies = JSON.stringify(simulation.bodies);
  canvas.dataset.centers = JSON.stringify(centers);
  canvas.dataset.radius = RADIUS * camera.scale;
  canvas.dataset.time = simulation.time;
  canvas.dataset.pairHits = simulation.pairHits;
  canvas.dataset.wallHits = simulation.wallHits;
  canvas.dataset.firstPair = JSON.stringify(simulation.firstPair);
  canvas.dataset.energy = energy(simulation.bodies);
  canvas.dataset.retries = simulation.retries;
  canvas.dataset.pointerActive = pointer !== null;
}

function position(event) {
  const camera = view();
  return worldPoint(camera, event.clientX, event.clientY);
}

canvas.addEventListener('pointerdown', event => {
  if (pointer !== null || event.isPrimary === false || (event.pointerType === 'mouse' && event.button !== 0)) return;
  const candidate = position(event);
  const body = simulation.bodies[0];
  if (!orangeHit(simulation.bodies, view(), candidate)) return;
  event.preventDefault();
  pointer = event.pointerId;
  hovering = true;
  offset = body.position.map((value, axis) => value - candidate[axis]);
  simulation.grab();
  canvas.setPointerCapture(pointer);
  canvas.focus({preventScroll: true});
  canvas.dataset.pointerType = event.pointerType;
  draw();
}, {passive: false});
canvas.addEventListener('pointermove', event => {
  hovering = orangeHit(simulation.bodies, view(), position(event));
  if (event.pointerId !== pointer) return;
  simulation.move(position(event).map((value, axis) => value + offset[axis]));
  draw();
});
canvas.addEventListener('pointerleave', () => { hovering = false; });
function clearPointer() {
  const captured = pointer;
  pointer = null;
  if (captured !== null && canvas.hasPointerCapture(captured)) canvas.releasePointerCapture(captured);
}
function release(event) {
  if (event.pointerId !== pointer) return;
  if (event.type === 'lostpointercapture' && canvas.hasPointerCapture(event.pointerId)) return;
  clearPointer();
  simulation.release();
  hovering = orangeHit(simulation.bodies, view(), position(event));
  draw();
}
canvas.addEventListener('pointerup', release);
canvas.addEventListener('pointercancel', release);
canvas.addEventListener('lostpointercapture', release);
canvas.addEventListener('keydown', event => {
  if (event.code === 'Space') {
    if (simulation.bodies[0].held) { clearPointer(); simulation.release(); }
    else simulation.grab();
  } else if (event.code === 'Escape') { clearPointer(); simulation.release(); }
  else if (simulation.bodies[0].held && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.code)) {
    const movement = {ArrowLeft: [-0.05, 0], ArrowRight: [0.05, 0], ArrowUp: [0, 0.1], ArrowDown: [0, -0.1]}[event.code];
    simulation.move(simulation.bodies[0].position.map((value, axis) => value + movement[axis]));
  } else return;
  event.preventDefault();
  draw();
});
releaseButton.addEventListener('click', () => { clearPointer(); simulation.release(); draw(); });
resetButton.addEventListener('click', () => {
  clearPointer();
  hovering = false;
  simulation.reset();
  last = null;
  draw();
});

function frame(now) {
  try {
    simulation.advanceFrame(last === null ? 0 : (now - last) / 1000, document.hidden);
    last = document.hidden ? null : now;
    draw();
    requestAnimationFrame(frame);
  } catch (failure) {
    error.textContent = 'The two-ball calculation stopped: ' + failure.message;
    error.style.display = 'flex';
    console.error(failure);
  }
}
document.addEventListener('visibilitychange', () => { last = null; simulation.accumulator = 0; });
window.addEventListener('message', event => {
  if (event.source !== parent || event.data?.type !== 'two-balls-theme') return;
  for (const property of ['background', 'text', 'border', 'font']) {
    if (typeof event.data[property] === 'string' && event.data[property]) document.documentElement.style.setProperty('--book-' + property, event.data[property]);
  }
  dark = Boolean(event.data.dark);
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  draw();
});
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => { if (parent === window) dark = event.matches; });
const resize = new ResizeObserver(() => {
  draw();
  parent.postMessage({type: 'two-balls-size', height: Math.ceil(document.querySelector('main').getBoundingClientRect().height) + 2}, '*');
});
resize.observe(document.querySelector('main'));
parent.postMessage({type: 'two-balls-ready'}, '*');
requestAnimationFrame(frame);
} catch (failure) {
  const error = document.querySelector('#error');
  error.textContent = 'The two-ball experiment could not start: ' + failure.message;
  error.style.display = 'flex';
  console.error(failure);
}
})();
