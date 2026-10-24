import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {TwoBalls, pairImpulse, pairGeometry, pairTime, resolveContacts, contacts, energy, RADIUS, GRAVITY, RESTITUTION, WIDTH, STEP} from './physics.mjs';
import {worldPoint, orangeHit} from './interaction.mjs';

const body = (position, velocity = [0, 0], mass = 1) => ({position: position.slice(), velocity: velocity.slice(), mass, radius: RADIUS, held: false});
const clone = bodies => bodies.map(value => ({...value, position: value.position.slice(), velocity: value.velocity.slice()}));
const close = (actual, expected, tolerance = 1e-9) => assert(Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected)), `${actual} != ${expected}`);
const momentum = bodies => [0, 1].map(axis => bodies.reduce((sum, value) => sum + value.mass * value.velocity[axis], 0));
const kinetic = bodies => bodies.reduce((sum, value) => sum + value.mass * (value.velocity[0] ** 2 + value.velocity[1] ** 2) / 2, 0);

const oblique = [body([1.8, 1.5], [0, -4]), body([2.04, 1.18])];
const initialMomentum = momentum(oblique);
const impulse = pairImpulse(...oblique);
close(impulse, 2.64);
[-1.584, -1.888, 1.584, -2.112].forEach((value, index) => close(oblique[Math.floor(index / 2)].velocity[index % 2], value));
close(kinetic(oblique), 6.5216);
momentum(oblique).forEach((value, index) => close(value, initialMomentum[index]));
const normal = pairGeometry(...oblique).normal;
close((oblique[1].velocity[0] - oblique[0].velocity[0]) * normal[0] + (oblique[1].velocity[1] - oblique[0].velocity[1]) * normal[1], 2.08);
const actual = [body([1.8, 1.5], [0, -4]), body([2.04, 1.18])];
resolveContacts(actual);
actual.forEach((value, index) => value.velocity.forEach((component, axis) => close(component, oblique[index].velocity[axis])));
const unequal = [body([1, 1], [2, 0], 2), body([1.4, 1], [-1, 0], 1)];
const unequalMomentum = momentum(unequal);
const unequalEnergy = kinetic(unequal);
pairImpulse(...unequal);
momentum(unequal).forEach((value, index) => close(value, unequalMomentum[index]));
assert(kinetic(unequal) < unequalEnergy);
close(unequal[1].velocity[0] - unequal[0].velocity[0], 3 * RESTITUTION);
const centered = [body([2, 1.4], [0, -4]), body([2, 1])];
pairImpulse(...centered);
assert(centered.every(value => value.velocity[0] === 0));
close(centered[0].velocity[1], -0.7);
close(centered[1].velocity[1], -3.3);
console.log('PASS free oblique/centered/unequal-mass impulses: shared momentum, restitution, arithmetic, kinetic loss and equivalence to actual contact solver');

const wall = [body([RADIUS, 1], [-4, 1]), body([3, 1])];
resolveContacts(wall);
close(wall[0].velocity[0], 2.6);
close(wall[0].velocity[1], 1);
const simultaneous = [body([2, 0.6], [0, -4]), body([2, RADIUS])];
const forward = clone(simultaneous);
const reverse = clone(simultaneous);
resolveContacts(forward, contacts(forward));
resolveContacts(reverse, contacts(reverse).reverse());
forward.forEach((value, index) => value.velocity.forEach((component, axis) => close(component, reverse[index].velocity[axis], 1e-8)));
assert(forward.every(value => value.velocity[0] === 0));
assert(kinetic(forward) <= kinetic(simultaneous));
const support = new TwoBalls();
support.step(1);
assert.deepEqual(support.bodies[1].position, [2, RADIUS]);
assert.deepEqual(support.bodies[1].velocity, [0, 0]);
assert.equal(support.bodies[1].held, false);
support.release();
while (!support.firstPair) support.step();
assert(support.bodies[1].velocity[0] > 0);
assert(support.firstPair[0][0] < 0 && support.firstPair[1][0] > 0);
close(support.bodies[1].mass, 1);
console.log('PASS wall restitution/tangent invariance, simultaneous contact-order agreement, floor support with finite mass and waking after oblique impact');

const fast = [body([1, 1], [100, 0]), body([3, 1], [-100, 0])];
close(pairTime(fast, [[0, -GRAVITY], [0, -GRAVITY]], 0.02), 0.008);
const crossing = new TwoBalls();
crossing.bodies = fast;
crossing.step(0.01);
assert(crossing.bodies[0].position[0] < crossing.bodies[1].position[0]);
assert(crossing.bodies[0].velocity[0] < 0 && crossing.bodies[1].velocity[0] > 0);
assert(pairGeometry(...crossing.bodies).gap >= -1e-9);
const freeFall = new TwoBalls();
freeFall.bodies = [body([1, 2.2]), body([3, 2.2])];
freeFall.step(0.1);
for (const value of freeFall.bodies) { close(value.position[1], 2.2 - GRAVITY * 0.1 ** 2 / 2); close(value.velocity[1], -GRAVITY * 0.1); }

let maximumGain = 0;
let wallTrials = 0;
for (const offset of [-0.39, -0.3, -0.18, -0.02, 0, 0.0001, 0.02, 0.18, 0.3, 0.39]) {
  for (const frameStep of [STEP, 0.1]) {
    const simulation = new TwoBalls();
    assert(simulation.move([2 + offset, 2.2]));
    simulation.release();
    let previous = energy(simulation.bodies);
    while (simulation.time < 8 - 1e-9) {
      simulation.step(frameStep);
      const current = energy(simulation.bodies);
      maximumGain = Math.max(maximumGain, current - previous);
      assert(current <= previous + 1e-8);
      previous = current;
      assert(pairGeometry(...simulation.bodies).gap >= -1e-9);
      for (const value of simulation.bodies) {
        assert([...value.position, ...value.velocity].every(Number.isFinite));
        assert(value.position[0] >= RADIUS - 1e-9 && value.position[0] <= WIDTH - RADIUS + 1e-9);
        assert(value.position[1] >= RADIUS - 1e-9);
        if (offset === 0) assert.equal(value.velocity[0], 0);
      }
    }
    assert(simulation.bodies.every(value => Math.hypot(...value.velocity) < 1e-8));
    if (offset === 0) { close(simulation.bodies[0].position[1], 3 * RADIUS); close(simulation.bodies[1].position[1], RADIUS); }
    else assert(simulation.bodies.every(value => Math.abs(value.position[1] - RADIUS) < 1e-8));
    if (simulation.wallHits) wallTrials++;
  }
}
assert(wallTrials >= 8);
console.log(`PASS continuous fast pair crossing/free fall, 20 offset/centered drops at two tick budgets: no overlap/escape/jitter, walls, eventual rest, maximum energy gain ${maximumGain.toExponential(2)} J`);

const hand = new TwoBalls();
const beforeHand = clone(hand.bodies);
assert.equal(hand.move([2, RADIUS]), false);
assert.deepEqual(hand.bodies, beforeHand);
assert(hand.move([-100, 100]));
assert.deepEqual(hand.bodies[0].position, [RADIUS, 3 - RADIUS]);
hand.release();
assert.deepEqual(hand.bodies[0].velocity, [0, 0]);
assert(!hand.bodies[0].held);
hand.reset();
assert(hand.bodies[0].held);
assert.deepEqual(hand.bodies[1].velocity, [0, 0]);
for (const rate of [30, 60, 144]) {
  const simulation = new TwoBalls();
  simulation.release();
  for (let frame = 0; frame < 8 * rate; frame++) simulation.advanceFrame(1 / rate);
  assert(simulation.bodies.every(value => Math.hypot(...value.velocity) < 1e-8));
  close(simulation.time, 8, 1e-8);
  const before = simulation.time;
  simulation.advanceFrame(3600, true);
  close(simulation.time, before);
  assert.equal(simulation.accumulator, 0);
  simulation.advanceFrame(3600);
  assert(simulation.time <= before + 0.1 + STEP);
}

const chapterDirectory = new URL('../../12_articles/87-sail-physics/', import.meta.url);
const names = readdirSync(chapterDirectory).filter(name => name.endsWith('.rst')).sort();
const position = names.indexOf('01e-two-balls.rst');
assert.equal(names[position - 1], '01d-bouncing-ball.rst');
assert.equal(names[position + 1], '02a-cloth.rst');
for (const name of names) {
  const text = readFileSync(new URL(name, chapterDirectory), 'utf8');
  for (const match of text.matchAll(/:doc:`([^`]+)`/g)) {
    const target = match[1].includes(' <') ? match[1].split(' <')[1].slice(0, -1) : match[1];
    assert(names.includes(target + '.rst'), `${name}: ${target}`);
  }
}
const chapter = readFileSync(new URL('01e-two-balls.rst', chapterDirectory), 'utf8');
assert(!/^\d/.test(chapter));
assert(!/XPBD|airflow|cloth|later chapter|will matter later/.test(chapter));
const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
assert(html.includes('src="bundle.js"'));
assert(html.includes('01e-two-balls.html'));
console.log('PASS hand bounds/nonoverlap/zero release/reset, fixed ticks vs frames/hidden tab, current filenames/glob ordering/all book doc links and new chapter scope');

for (const scale of [32, 65.25, 204.66666666666666]) {
  const camera = {rectangle: {left: 1, top: -178}, left: 32, floor: 325, scale};
  for (const phase of ['initial', 'flight', 'settled']) {
    const simulation = new TwoBalls();
    if (phase !== 'initial') simulation.release();
    if (phase === 'flight') simulation.step(0.1);
    if (phase === 'settled') simulation.step(8);
    const orange = simulation.bodies[0];
    const clientX = camera.rectangle.left + camera.left + orange.position[0] * scale;
    const clientY = camera.rectangle.top + camera.floor - orange.position[1] * scale;
    const point = worldPoint(camera, clientX, clientY);
    point.forEach((value, axis) => close(value, orange.position[axis]));
    assert(orangeHit(simulation.bodies, camera, point));
    assert(!orangeHit(simulation.bodies, camera, simulation.bodies[1].position));
    assert(!orangeHit(simulation.bodies, camera, [0, 10]));
    const blueBefore = clone(simulation.bodies)[1];
    simulation.grab();
    assert(orange.held);
    assert.deepEqual(orange.velocity, [0, 0]);
    assert.deepEqual(simulation.bodies[1], blueBefore);
    assert.equal(simulation.firstPair, null);
    assert.equal(simulation.pairHits, 0);
    assert(simulation.move([1.7, 2.4]));
    simulation.release();
    assert(!orange.held);
    assert.deepEqual(orange.velocity, [0, 0]);
    simulation.step();
    assert(orange.velocity[1] < 0);
  }
}
console.log('PASS initial/in-flight/settled direct grabbing, scrolled CSS-coordinate mapping at three scales, outside/blue rejection, fresh trial counts, unchanged blue and zero release velocity');
