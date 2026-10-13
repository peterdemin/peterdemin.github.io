import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {Orbit, gravity, derivative, rk4, initialState, invariants, MU, MASS, EARTH_RADIUS, ECCENTRICITY, PERIGEE, APOGEE, SEMIMAJOR, SEMIMINOR, PERIOD, STEP, TIME_SCALE, TRACE_INTERVAL, MAX_FRAME_STEPS} from './physics.mjs';

const close = (actual, expected, tolerance = 1e-12) => assert(Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected)), `${actual} != ${expected}`);
const initial = initialState();
const original = initial.slice();
const acceleration = gravity([PERIGEE, 0]);
close(acceleration[0], -MU / PERIGEE ** 2);
close(acceleration[1], 0);
close(gravity([PERIGEE * 2, 0])[0], acceleration[0] / 4);
const diagonal = gravity([PERIGEE, PERIGEE]);
close(diagonal[0], diagonal[1]);
assert(diagonal[0] < 0);
close(Math.hypot(...diagonal), MU / (2 * PERIGEE ** 2));
assert.throws(() => gravity([EARTH_RADIUS, 0]));
assert.throws(() => gravity([Infinity, 0]));
assert.deepEqual(derivative(0, initial), [initial[2], initial[3], ...acceleration]);
close(MASS * Math.hypot(...acceleration), 6228.131804796875);
close(MASS * Math.hypot(...gravity([APOGEE, 0])), 193.95566174107918);
close(PERIOD, 43337.52271847807);
close(initial[3], 9203.401140080634);
assert(PERIGEE > EARTH_RADIUS);

const trialStates = [];
const trialTimes = [];
const result = rk4([1, 2, 3, 4], 2, 0.25, (time, state) => {
  trialStates.push(state.slice());
  trialTimes.push(time);
  return [state[2], state[3], -state[0], -state[1]];
});
assert.deepEqual(trialTimes, [2, 2.125, 2.125, 2.25]);
assert.deepEqual(trialStates[0], [1, 2, 3, 4]);
assert.deepEqual(trialStates[1], [1.375, 2.5, 2.875, 3.75]);
assert.deepEqual(trialStates[2], [1.359375, 2.46875, 2.828125, 3.6875]);
assert.deepEqual(trialStates[3], [1.70703125, 2.921875, 2.66015625, 3.3828125]);
const expected = [1, 2, 3, 4].map((value, index) => {
  const rates = trialStates.map(state => [state[2], state[3], -state[0], -state[1]][index]);
  return value + 0.25 * (rates[0] + 2 * rates[1] + 2 * rates[2] + rates[3]) / 6;
});
assert.deepEqual(result, expected);
const timed = rk4([0, 0, 0, 0], 1, 1, time => [time ** 3, time ** 3, time ** 3, time ** 3]);
for (const value of timed) close(value, (2 ** 4 - 1) / 4);
rk4(initial, 0, STEP);
assert.deepEqual(initial, original);

function analytic(time) {
  const mean = 2 * Math.PI * time / PERIOD;
  let eccentric = mean;
  for (let iteration = 0; iteration < 20; iteration++) {
    const correction = (eccentric - ECCENTRICITY * Math.sin(eccentric) - mean) / (1 - ECCENTRICITY * Math.cos(eccentric));
    eccentric -= correction;
    if (Math.abs(correction) < 1e-14) break;
  }
  const rate = 2 * Math.PI / PERIOD / (1 - ECCENTRICITY * Math.cos(eccentric));
  return [SEMIMAJOR * (Math.cos(eccentric) - ECCENTRICITY), SEMIMINOR * Math.sin(eccentric), -SEMIMAJOR * Math.sin(eccentric) * rate, SEMIMINOR * Math.cos(eccentric) * rate];
}

function integrated(time, step) {
  let state = initialState();
  const ticks = Math.floor(time / step);
  for (let tick = 0; tick < ticks; tick++) state = rk4(state, tick * step, step);
  const remaining = time - ticks * step;
  if (remaining > 0) state = rk4(state, ticks * step, remaining);
  return state;
}

const comparisonTime = 0.37 * PERIOD;
const reference = analytic(comparisonTime);
const positionError = state => Math.hypot(state[0] - reference[0], state[1] - reference[1]);
const refinement = [40, 20, 10].map(step => positionError(integrated(comparisonTime, step)));
for (let index = 0; index < 2; index++) assert(refinement[index] / refinement[index + 1] > 14 && refinement[index] / refinement[index + 1] < 19, refinement);
const production = integrated(comparisonTime, STEP);
assert(positionError(production) < 0.01);
assert(Math.hypot(production[2] - reference[2], production[3] - reference[3]) < 1e-5);
console.log(`PASS inverse-square force, RK4 coupled trial states/times, analytic reference; refinement position errors: ${refinement.map(value => value.toExponential(3)).join(', ')} m; 2 s error ${positionError(production).toExponential(3)} m`);

const orbit = new Orbit();
let minimum = Infinity;
let maximum = 0;
let minimumSpeed = Infinity;
let maximumSpeed = 0;
let energyDrift = 0;
let momentumDrift = 0;
while (orbit.time < 100 * PERIOD + STEP) {
  orbit.step();
  const radius = Math.hypot(orbit.state[0], orbit.state[1]);
  const speed = Math.hypot(orbit.state[2], orbit.state[3]);
  minimum = Math.min(minimum, radius);
  maximum = Math.max(maximum, radius);
  minimumSpeed = Math.min(minimumSpeed, speed);
  maximumSpeed = Math.max(maximumSpeed, speed);
  const diagnostic = invariants(orbit.state);
  energyDrift = Math.max(energyDrift, Math.abs((diagnostic.energy - orbit.reference.energy) / orbit.reference.energy));
  momentumDrift = Math.max(momentumDrift, Math.abs((diagnostic.momentum - orbit.reference.momentum) / orbit.reference.momentum));
  assert(orbit.state.every(Number.isFinite));
}
assert(orbit.turns === 100);
assert(Math.abs(minimum - PERIGEE) < 1);
assert(Math.abs(maximum - APOGEE) < 1);
assert(Math.abs(maximumSpeed - initial[3]) < 0.01);
assert(Math.abs(minimumSpeed - initial[3] * PERIGEE / APOGEE) < 0.01);
assert(energyDrift < 1e-7, energyDrift);
assert(momentumDrift < 1e-8, momentumDrift);
assert(Math.abs(orbit.measuredPeriod - PERIOD) < 0.01);
assert(orbit.traceCount <= orbit.capacity);
let previousTime = -Infinity;
for (let index = 0; index < orbit.traceCount; index++) {
  const sample = orbit.trace[(orbit.traceStart + index) % orbit.capacity];
  assert(sample.time >= orbit.time - PERIOD - TRACE_INTERVAL);
  assert(sample.time > previousTime);
  previousTime = sample.time;
  assert(sample.position.every(Number.isFinite));
}
console.log(`PASS 100 continuous orbits: energy drift ${energyDrift.toExponential(3)}, angular momentum ${momentumDrift.toExponential(3)}; period error ${(orbit.measuredPeriod - PERIOD).toExponential(3)} s; radii ${minimum.toFixed(3)} / ${maximum.toFixed(3)} m, rolling trace ${orbit.traceCount} points`);

const playback = [];
for (const rate of [30, 60, 120]) {
  const simulation = new Orbit();
  let frames = 0;
  while (simulation.turns < 1) {
    simulation.advanceFrame(1 / rate);
    frames++;
  }
  assert(Math.abs(frames / rate - 10) <= 1 / rate + STEP / TIME_SCALE);
  playback.push(frames / rate);
  const saved = simulation.state.slice();
  const savedTime = simulation.time;
  assert.equal(simulation.advanceFrame(3600, true), 0);
  assert.equal(simulation.accumulator, 0);
  assert.equal(simulation.time, savedTime);
  assert.deepEqual(simulation.state, saved);
  const count = simulation.advanceFrame(3600);
  assert(count <= MAX_FRAME_STEPS);
  assert(simulation.time - savedTime <= 0.1 * TIME_SCALE + STEP);
}
const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
assert(!/<(?:button|input|select)\b/.test(html));
assert(html.includes('src="bundle.js"'));
const directory = new URL('../../12_articles/87-sail-physics/', import.meta.url);
const names = readdirSync(directory).filter(name => name.endsWith('.rst')).sort();
const index = readFileSync(new URL('../87-sail-physics.rst', directory), 'utf8');
const order = [...index.matchAll(/^   87-sail-physics\/([^\s]+)$/gm)].map(match => match[1] + '.rst');
const position = order.indexOf('satellite-orbit.rst');
assert.equal(order[position - 1], 'simulation-basics.rst');
assert.equal(order[position + 1], 'contact-constraints.rst');
const chapter = readFileSync(new URL('satellite-orbit.rst', directory), 'utf8');
const software = readFileSync(new URL('simulation-basics.rst', directory), 'utf8');
assert(chapter.includes(':doc:`Gravity and time integration with RK4 <simulation-basics>`'));
assert(chapter.includes('source') || chapter.includes('physics.mjs'));
assert(!/^\d/.test(chapter));
for (const source of [chapter, software]) {
  for (const match of source.matchAll(/:doc:`[^`]+ <([^>]+)>`/g)) assert(names.includes(match[1] + '.rst'));
}
console.log(`PASS frame/tick separation, 30/60/120 Hz first-turn playback ${playback.join('/')} s, hidden/stalled frame bounds, no controls, chapter order and links`);
