import {Orbit, gravity, invariants, MASS, EARTH_RADIUS, PERIGEE, APOGEE, SEMIMINOR, PERIOD, STEP, TIME_SCALE} from './physics.mjs';

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
