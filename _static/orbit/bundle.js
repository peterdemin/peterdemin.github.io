(() => {
'use strict';
try {
const MU = 3.98600435507e14;
const EARTH_RADIUS = 6371008.4;
const MASS = 1000;
const ECCENTRICITY = 0.7;
const PERIGEE = 8000000;
const SEMIMAJOR = PERIGEE / (1 - ECCENTRICITY);
const APOGEE = SEMIMAJOR * (1 + ECCENTRICITY);
const SEMIMINOR = SEMIMAJOR * Math.sqrt(1 - ECCENTRICITY ** 2);
const PERIOD = 2 * Math.PI * Math.sqrt(SEMIMAJOR ** 3 / MU);
const PLAYBACK_PERIOD = 10;
const TIME_SCALE = PERIOD / PLAYBACK_PERIOD;
const STEP = 2;
const TRACE_INTERVAL = 20;
const MAX_FRAME_SECONDS = 0.1;
const MAX_FRAME_STEPS = 256;

function gravity(position) {
  const radius = Math.hypot(position[0], position[1]);
  if (!Number.isFinite(radius) || radius <= EARTH_RADIUS) throw new Error('The trajectory entered Earth or became invalid.');
  const factor = -MU / radius ** 3;
  return [factor * position[0], factor * position[1]];
}

function derivative(time, state) {
  const acceleration = gravity(state);
  return [state[2], state[3], ...acceleration];
}

function rk4(state, time, step, rates = derivative) {
  const first = rates(time, state);
  const second = rates(time + step / 2, state.map((value, index) => value + step * first[index] / 2));
  const third = rates(time + step / 2, state.map((value, index) => value + step * second[index] / 2));
  const fourth = rates(time + step, state.map((value, index) => value + step * third[index]));
  return state.map((value, index) => value + step * (first[index] + 2 * second[index] + 2 * third[index] + fourth[index]) / 6);
}

function initialState() {
  return [PERIGEE, 0, 0, Math.sqrt(MU * (2 / PERIGEE - 1 / SEMIMAJOR))];
}

function invariants(state) {
  const radius = Math.hypot(state[0], state[1]);
  return {
    energy: (state[2] ** 2 + state[3] ** 2) / 2 - MU / radius,
    momentum: state[0] * state[3] - state[1] * state[2]
  };
}

class Orbit {
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

const canvas = document.querySelector('#scene');
const context = canvas.getContext('2d');
if (!context) throw new Error('Canvas 2D is unavailable.');
const orbit = new Orbit();
const values = document.querySelector('#values');
const scales = document.querySelector('#scales');
const clock = document.querySelector('#clock');
const checks = document.querySelector('#checks');
const error = document.querySelector('#error');
let last = null;
let lastReadout = -Infinity;
let dark = matchMedia('(prefers-color-scheme: dark)').matches;

function draw() {
  const rectangle = canvas.getBoundingClientRect();
  const width = rectangle.width;
  const height = rectangle.height;
  if (!width || !height) return;
  const ratio = Math.min(2, devicePixelRatio || 1);
  const pixelWidth = Math.round(width * ratio);
  const pixelHeight = Math.round(height * ratio);
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.fillStyle = dark ? '#0c1725' : '#f0f4f8';
  context.fillRect(0, 0, width, height);
  const forceLength = width < 500 ? 32 : 46;
  const velocityLength = width < 500 ? 46 : 66;
  const padding = velocityLength + 16;
  const scale = Math.min((width - 2 * padding) / (PERIGEE + APOGEE), (height - 2 * padding) / (2 * SEMIMINOR));
  const centerX = width / 2 + (APOGEE - PERIGEE) * scale / 2;
  const centerY = height / 2;
  const screen = position => [centerX + position[0] * scale, centerY - position[1] * scale];
  context.lineWidth = 1.4;
  context.strokeStyle = dark ? '#7f94b7' : '#7187a8';
  context.beginPath();
  for (let index = 0; index < orbit.traceCount; index++) {
    const sample = orbit.trace[(orbit.traceStart + index) % orbit.capacity];
    const point = screen(sample.position);
    if (index === 0) context.moveTo(...point);
    else context.lineTo(...point);
  }
  const satellite = screen(orbit.state);
  context.lineTo(...satellite);
  context.stroke();
  context.fillStyle = '#b9d9ee';
  context.beginPath();
  context.arc(centerX, centerY, EARTH_RADIUS * scale, 0, 2 * Math.PI);
  context.fill();
  context.fillStyle = '#28465b';
  context.font = '12px system-ui, sans-serif';
  context.textAlign = 'center';
  context.fillText('Earth', centerX, centerY + 4);
  const acceleration = gravity(orbit.state);
  const force = acceleration.map(value => MASS * value);
  const velocity = orbit.state.slice(2);
  const forceMagnitude = Math.hypot(...force);
  const speed = Math.hypot(...velocity);
  function arrow(vector, magnitude, length, color) {
    const direction = [vector[0] / magnitude, -vector[1] / magnitude];
    const tip = [satellite[0] + length * direction[0], satellite[1] + length * direction[1]];
    context.strokeStyle = color;
    context.fillStyle = color;
    context.lineWidth = 2.5;
    context.beginPath();
    context.moveTo(...satellite);
    context.lineTo(...tip);
    context.stroke();
    context.beginPath();
    context.moveTo(...tip);
    context.lineTo(tip[0] - 8 * direction[0] + 4 * direction[1], tip[1] - 8 * direction[1] - 4 * direction[0]);
    context.lineTo(tip[0] - 8 * direction[0] - 4 * direction[1], tip[1] - 8 * direction[1] + 4 * direction[0]);
    context.closePath();
    context.fill();
  }
  arrow(force, forceMagnitude, forceLength, dark ? '#ffa366' : '#b54708');
  arrow(velocity, speed, velocityLength, dark ? '#72e7c9' : '#007c69');
  context.fillStyle = dark ? '#ffffff' : '#273747';
  context.fillRect(satellite[0] - 4, satellite[1] - 4, 8, 8);
  context.fillStyle = dark ? '#769ac5' : '#3e628b';
  context.fillRect(satellite[0] - 11, satellite[1] - 3, 5, 6);
  context.fillRect(satellite[0] + 6, satellite[1] - 3, 5, 6);
  if (orbit.time - lastReadout >= 100 || lastReadout === -Infinity) {
    lastReadout = orbit.time;
    const diagnostic = invariants(orbit.state);
    const energyError = Math.abs((diagnostic.energy - orbit.reference.energy) / orbit.reference.energy);
    const momentumError = Math.abs((diagnostic.momentum - orbit.reference.momentum) / orbit.reference.momentum);
    values.textContent = `Force: ${forceMagnitude.toFixed(1)} N · speed: ${speed.toFixed(1)} m/s · altitude: ${((Math.hypot(orbit.state[0], orbit.state[1]) - EARTH_RADIUS) / 1000).toFixed(0)} km`;
    clock.textContent = `Modeled time: ${(orbit.time / 3600).toFixed(2)} h · completed orbits: ${orbit.turns} · ${TIME_SCALE.toFixed(2)} modeled s / playback s · RK4 step: ${STEP} s`;
    checks.textContent = `Relative energy drift: ${energyError.toExponential(1)} · angular-momentum drift: ${momentumError.toExponential(1)} · period: ${orbit.measuredPeriod === null ? 'measuring first turn' : orbit.measuredPeriod.toFixed(2) + ' s'} (analytic ${PERIOD.toFixed(2)} s)`;
  }
  scales.textContent = `Current arrow scales: force ${(forceMagnitude / forceLength).toFixed(2)} N / CSS px · velocity ${(speed / velocityLength).toFixed(2)} (m/s) / CSS px`;
  canvas.dataset.time = orbit.time;
  canvas.dataset.turns = orbit.turns;
  canvas.dataset.tracePoints = orbit.traceCount;
  canvas.dataset.speed = speed;
  canvas.dataset.force = forceMagnitude;
  canvas.dataset.position = JSON.stringify(orbit.state.slice(0, 2));
}

function frame(now) {
  try {
    orbit.advanceFrame(last === null ? 0 : (now - last) / 1000, document.hidden);
    last = document.hidden ? null : now;
    draw();
    requestAnimationFrame(frame);
  } catch (failure) {
    error.textContent = 'The orbit could not continue: ' + failure.message;
    error.style.display = 'flex';
    console.error(failure);
  }
}

document.addEventListener('visibilitychange', () => {
  last = null;
  orbit.accumulator = 0;
});
window.addEventListener('message', event => {
  if (event.source !== parent || event.data?.type !== 'orbit-theme') return;
  for (const property of ['background', 'text', 'border', 'font']) {
    if (typeof event.data[property] === 'string' && event.data[property]) document.documentElement.style.setProperty('--book-' + property, event.data[property]);
  }
  dark = Boolean(event.data.dark);
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  draw();
});
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
  if (parent === window) dark = event.matches;
});
const resize = new ResizeObserver(() => {
  draw();
  parent.postMessage({type: 'orbit-size', height: Math.ceil(document.querySelector('main').getBoundingClientRect().height) + 2}, '*');
});
resize.observe(document.querySelector('main'));
parent.postMessage({type: 'orbit-ready'}, '*');
requestAnimationFrame(frame);
} catch (failure) {
  const error = document.querySelector('#error');
  error.textContent = 'The orbit could not start: ' + failure.message;
  error.style.display = 'flex';
  console.error(failure);
}
})();
