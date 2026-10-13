import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {Ball, freeFlight, projectFloor, impact, timeOfImpact, GRAVITY, RADIUS, RESTITUTION, MASS, STOP_SPEED, WIDTH, HEIGHT, STEP} from './physics.mjs';
import {rk4} from '../orbit/physics.mjs';

const close = (actual, expected, tolerance = 1e-10) => assert(Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected)), `${actual} != ${expected}`);
const energy = state => MASS * (state[2] ** 2 + state[3] ** 2) / 2 + MASS * GRAVITY * (state[1] - RADIUS);
assert.deepEqual(projectFloor([2, 0.18]), [2, RADIUS]);
assert.deepEqual(projectFloor([2, 0.5]), [2, 0.5]);
const initial = [2, 2.2, 0, 0];
const flight = freeFlight(initial, 0.1);
close(flight[1], 2.15095);
close(flight[3], -0.981);
assert.deepEqual(initial, [2, 2.2, 0, 0]);
const constant = rk4(initial, 0, 0.1, (time, state) => [state[2], state[3], 0, -GRAVITY]);
constant.forEach((value, index) => close(value, flight[index]));
const bounce = impact(-4);
close(bounce.velocity, 2.6);
close(bounce.impulse, 6.6);
close(bounce.lostEnergy, 4.62);
close((8 - bounce.lostEnergy) / 8, RESTITUTION ** 2);
assert.equal(impact(-STOP_SPEED).resting, true);
assert.equal(impact(-STOP_SPEED - 1e-6).resting, false);
assert.equal(impact(4).velocity, 4);
assert.equal(impact(4).impulse, 0);
close(MASS * STOP_SPEED ** 2 / 2, 0.02);

const contactTime = Math.sqrt(4 / GRAVITY);
close(timeOfImpact(initial), contactTime);
close(timeOfImpact([2, RADIUS, 0, 4]), 8 / GRAVITY);
close(timeOfImpact([2, RADIUS, 0, -4]), 0);
const tiny = timeOfImpact([2, RADIUS + 1e-12, 0, -1000]);
assert(tiny > 0 && tiny < 2e-15);
const incoming = -GRAVITY * contactTime;
close(incoming, -6.26418390534633);
close((-RESTITUTION * incoming) ** 2 / (2 * GRAVITY), 0.845);
const eventBall = new Ball();
eventBall.grab();
eventBall.move(initial.slice(0, 2));
eventBall.release();
eventBall.step(contactTime + 0.1);
const outgoing = -RESTITUTION * incoming;
close(eventBall.state[1], RADIUS + outgoing * 0.1 - GRAVITY * 0.1 ** 2 / 2);
close(eventBall.state[3], outgoing - GRAVITY * 0.1);
close(energy(eventBall.state), energy(initial) * RESTITUTION ** 2);
close(eventBall.lastImpact.time, contactTime);
console.log('PASS analytic free fall/RK4 equivalence, projection, stable impact root, restitution, impulse, energy fraction and within-tick event/remainder');

const results = [];
for (const gap of [0.001, 0.05, 0.5, 2, HEIGHT - 2 * RADIUS]) {
  for (const duration of [STEP, 1 / 30, 0.25, 1, 5]) {
    const ball = new Ball();
    ball.grab();
    ball.move([WIDTH / 2, RADIUS + gap]);
    ball.release();
    const originalEnergy = energy(ball.state);
    let previousEnergy = originalEnergy;
    while (!ball.resting && ball.time < 10) {
      ball.step(duration);
      assert(ball.state.every(Number.isFinite));
      assert(ball.state[1] >= RADIUS);
      assert(energy(ball.state) <= previousEnergy + 1e-9);
      assert(ball.state[1] <= RADIUS + gap + 1e-9);
      previousEnergy = energy(ball.state);
    }
    assert(ball.resting);
    assert(ball.time <= 10);
    assert.deepEqual(ball.state, [WIDTH / 2, RADIUS, 0, 0]);
    close(ball.lostEnergy, originalEnergy);
    const saved = ball.state.slice();
    ball.step(100);
    assert.deepEqual(ball.state, saved);
    results.push(`${gap.toFixed(3)}m/${duration.toFixed(4)}s:${ball.bounces}`);
  }
}

const hand = new Ball();
hand.grab();
hand.move([-100, 100]);
assert.deepEqual(hand.state, [RADIUS, HEIGHT - RADIUS, 0, 0]);
hand.step(1);
assert.deepEqual(hand.state, [RADIUS, HEIGHT - RADIUS, 0, 0]);
hand.release();
assert.equal(hand.grabbed, false);
assert.deepEqual(hand.state.slice(2), [0, 0]);
hand.step();
assert(hand.state[1] < HEIGHT - RADIUS);
hand.grab();
hand.move([100, -100]);
hand.release();
assert(hand.resting);
assert.deepEqual(hand.state, [WIDTH - RADIUS, RADIUS, 0, 0]);
hand.move([2, 2]);
assert.deepEqual(hand.state, [WIDTH - RADIUS, RADIUS, 0, 0]);
console.log(`PASS 25 drops: no penetration/energy gain/tunneling, finite eventual rest and collision-energy accounting; held/clamped/zero-velocity release and floor reaction`);

const frameResults = [];
for (const rate of [30, 60, 144]) {
  const ball = new Ball();
  ball.grab();
  ball.move([2, 2.2]);
  ball.release();
  for (let frame = 0; frame < rate * 4; frame++) ball.advanceFrame(1 / rate);
  close(ball.time, 4);
  assert(ball.resting);
  frameResults.push(ball.state);
  const time = ball.time;
  ball.advanceFrame(3600, true);
  close(ball.time, time);
  assert.equal(ball.accumulator, 0);
  assert(ball.advanceFrame(3600) <= 16);
  assert(ball.time - time <= 0.1 + STEP);
}
assert.deepEqual(frameResults[0], frameResults[1]);
assert.deepEqual(frameResults[1], frameResults[2]);
const highSpeed = new Ball();
highSpeed.state = [2, 2.2, 0, -100];
highSpeed.resting = false;
highSpeed.step(0.1);
assert(highSpeed.state[1] >= RADIUS);
assert(energy(highSpeed.state) <= energy([2, 2.2, 0, -100]));

const directory = new URL('../../12_articles/87-sail-physics/', import.meta.url);
const index = readFileSync(new URL('../87-sail-physics.rst', directory), 'utf8');
const order = [...index.matchAll(/^   87-sail-physics\/([^\s]+)$/gm)].map(match => match[1] + '.rst');
assert.deepEqual(order.slice(0, 6), ['simulation-basics.rst', 'satellite-orbit.rst', 'contact-constraints.rst', 'bouncing-ball.rst', '01-cloth.rst', '02-moon-flag.rst']);
assert.equal(order.length, 13);
assert(!index.includes(':glob:'));
const names = readdirSync(directory).filter(name => name.endsWith('.rst'));
assert.deepEqual(names.sort(), [...order].sort());
for (const name of names) {
  const source = readFileSync(new URL(name, directory), 'utf8');
  assert(!/01b-simulation-software|01c-orbit/.test(source));
  for (const match of source.matchAll(/:doc:`[^`]+ <([^>]+)>`/g)) assert(names.includes(match[1] + '.rst'), `${name}: ${match[1]}`);
}
for (const name of order.slice(0, 4)) {
  const source = readFileSync(new URL(name, directory), 'utf8');
  assert(!/^\d/.test(source));
  assert(!/XPBD|cloth|airflow|wind tunnel|later chapter|will matter later/i.test(source), name);
}
const rounded = rk4([1e7, 0, 0, 3000], 0, 0.1, (time, state) => {
  const radius = Math.hypot(state[0], state[1]);
  return [state[2], state[3], -4e14 * state[0] / radius ** 3, -4e14 * state[1] / radius ** 3];
});
close(rounded[0], 9999999.98);
close(rounded[1], 300, 1e-8);
close(rounded[2], -0.4, 1e-8);
close(rounded[3], 2999.999994, 1e-12);
for (const [filename, expected] of [
  ['moon-flag/physics.mjs', '475666e587f617c62337d7966733d17d86a15800'],
  ['wind-tunnel/flow.mjs', '312315ce1745dca02bd1c85be95069c23f18f570'],
  ['orbit/physics.mjs', '61f4e158fe6abe19001be5b1475c39f20e8a5de7'],
  ['orbit/main.mjs', '4611e015a77dafc061ce365a85edf32c243d14df']
]) assert.equal(createHash('sha1').update(readFileSync(new URL('../' + filename, import.meta.url))).digest('hex'), expected);
console.log('PASS frame-rate/hidden/stalled-frame checks, high-speed contact, exact book order/all links/no orphan or overloaded old chapter/no foreshadowing, worked RK4 arithmetic and unchanged flag/wing physics');
