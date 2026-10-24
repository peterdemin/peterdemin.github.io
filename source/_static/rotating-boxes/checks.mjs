import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {RotatingBoxes, SIDE, MASS, WIDTH, HEIGHT, STEP, vertices, mechanicalEnergy} from './physics.mjs';

const planck = createRequire(import.meta.url)('./vendor/planck-1.5.1.min.js');
const close = (actual, expected, tolerance = 1e-9) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
const run = (simulation, seconds) => { for (let tick = 0; tick < seconds / STEP; tick++) simulation.step(); };
const momentum = bodies => bodies.reduce((total, body) => {
  const position = body.getPosition();
  const velocity = body.getLinearVelocity();
  return [total[0] + body.getMass() * velocity.x, total[1] + body.getMass() * velocity.y, total[2] + body.getMass() * (position.x * velocity.y - position.y * velocity.x) + body.getInertia() * body.getAngularVelocity()];
}, [0, 0, 0]);

const geometry = new RotatingBoxes(planck, () => 0, 0);
const square = geometry.createBox(2, 1.5, Math.PI / 4);
close(square.getMass(), MASS);
close(square.getInertia(), MASS * SIDE ** 2 / 6);
const corners = vertices(square);
close(corners[0][0], 2);
close(corners[0][1], 1.5 - SIDE / Math.sqrt(2));
close(Math.hypot(corners[1][0] - corners[0][0], corners[1][1] - corners[0][1]), SIDE);
square.applyLinearImpulse(planck.Vec2(0, 1), square.getPosition(), true);
close(square.getAngularVelocity(), 0);
square.setLinearVelocity(planck.Vec2(0, 0));
square.applyLinearImpulse(planck.Vec2(0, 1), planck.Vec2(2.1, 1.5), true);
close(square.getAngularVelocity(), 0.1 / square.getInertia());
console.log('PASS mass, rectangular inertia, rotated vertices, centered/off-center torque');

const worked = new RotatingBoxes(planck, () => 0, 0);
const example = worked.createBox(2, 1.5);
example.setLinearVelocity(planck.Vec2(0, -2));
const normalImpulse = 2.5 / (1 / MASS + 0.1 ** 2 / example.getInertia());
example.applyLinearImpulse(planck.Vec2(0, normalImpulse), planck.Vec2(2.1, 1.3), true);
close(normalImpulse, 1.6780821917808217);
close(example.getLinearVelocity().y, -0.32191780821917826);
close(example.getAngularVelocity(), 8.219178082191783);
close(example.getLinearVelocity().y + 0.1 * example.getAngularVelocity(), 0.5);
close(mechanicalEnergy(worked.bodies, 0), 0.7414383561643839);
console.log('PASS chapter off-center impulse, contact restitution and rotational energy example');

const centered = new RotatingBoxes(planck);
const falling = centered.createBox(2, 2, 0);
let maximumSpin = 0;
for (let tick = 0; tick < 2400; tick++) { centered.step(); maximumSpin = Math.max(maximumSpin, Math.abs(falling.getAngularVelocity())); }
assert.ok(maximumSpin < 1e-8);
assert.equal(falling.isAwake(), false);
const oblique = new RotatingBoxes(planck);
const tilted = oblique.createBox(2, 2, 0.3);
let obliqueSpin = 0;
let manifoldSeen = false;
oblique.world.on('post-solve', contact => { if (contact.getManifold().pointCount > 0) manifoldSeen = true; });
for (let tick = 0; tick < 2400; tick++) { oblique.step(); obliqueSpin = Math.max(obliqueSpin, Math.abs(tilted.getAngularVelocity())); }
assert.ok(obliqueSpin > 1);
assert.ok(manifoldSeen);
assert.equal(tilted.isAwake(), false);
console.log('PASS genuine polygon-floor manifold, no centered spin, contact-generated oblique spin, sleep');

const pair = new RotatingBoxes(planck, () => 0, 0);
const first = pair.createBox(1.6, 1.5, 0.2);
const second = pair.createBox(2.1, 1.63, -0.3);
for (const body of pair.bodies) body.getFixtureList().setFriction(0);
first.setLinearVelocity(planck.Vec2(4, 0));
const beforeMomentum = momentum(pair.bodies);
const beforeEnergy = mechanicalEnergy(pair.bodies, 0);
let pairContact = false;
pair.world.on('post-solve', contact => {
  if (contact.getFixtureA().getBody().isDynamic() && contact.getFixtureB().getBody().isDynamic()) pairContact = true;
});
run(pair, 0.15);
assert.ok(pairContact);
momentum(pair.bodies).forEach((value, axis) => close(value, beforeMomentum[axis], axis === 2 ? 0.01 : 1e-9));
assert.ok(mechanicalEnergy(pair.bodies, 0) <= beforeEnergy + 1e-8);
assert.ok(pair.bodies.some(body => Math.abs(body.getAngularVelocity()) > 0.5));
console.log('PASS oriented free-pair contact, linear/angular momentum and energy loss');

const rebound = new RotatingBoxes(planck, () => 0, 0);
const left = rebound.createBox(1.6, 1.5);
const right = rebound.createBox(2.1, 1.5);
left.setLinearVelocity(planck.Vec2(4, 0));
run(rebound, 0.15);
close(right.getLinearVelocity().x - left.getLinearVelocity().x, 1, 1e-8);
close(left.getAngularVelocity(), 0, 1e-8);
close(right.getAngularVelocity(), 0, 1e-8);
close(mechanicalEnergy(rebound.bodies, 0), 4.25, 1e-8);
console.log('PASS centered pair restitution 0.25 and kinetic energy 8 -> 4.25 J');

const pile = new RotatingBoxes(planck);
for (let layer = 0; layer < 6; layer++) pile.createBox(2, 0.2 + layer * 0.38);
run(pile, 12);
assert.ok(pile.bodies.every(body => !body.isAwake()));
const settledEnergy = mechanicalEnergy(pile.bodies);
run(pile, 5);
close(mechanicalEnergy(pile.bodies), settledEnergy, 1e-10);
const target = pile.bodies[3];
target.applyLinearImpulse(planck.Vec2(0.1, 0), target.getPosition(), true);
pile.step();
assert.ok(pile.bodies.some(body => body.isAwake()));
run(pile, 15);
assert.ok(pile.bodies.every(body => !body.isAwake()));
pile.createBox(2.1, 2.65, 0.15);
let impactWokeSupport = false;
for (let tick = 0; tick < 2400; tick++) {
  pile.step();
  if (pile.bodies.slice(0, -1).some(body => body.isAwake())) impactWokeSupport = true;
}
assert.ok(impactWokeSupport);
assert.ok(pile.bodies.every(body => !body.isAwake()));
for (const body of pile.bodies) for (const [horizontal, vertical] of vertices(body)) {
  assert.ok(horizontal >= -0.015 && horizontal <= WIDTH + 0.015);
  assert.ok(vertical >= -0.015 && vertical <= HEIGHT + 0.015);
}
console.log('PASS six-box stack, stable sleep energy, impulse/impact wake and resettlement, confinement');

const fast = new RotatingBoxes(planck, () => 0, 0);
const projectile = fast.createBox(2, 1.5, 0.3);
projectile.setLinearVelocity(planck.Vec2(100, 0));
run(fast, 0.3);
assert.ok(vertices(projectile).every(([horizontal]) => horizontal >= -0.015 && horizontal <= WIDTH + 0.015));
console.log('PASS bullet continuous collision at 100 m/s');

let seed = 37;
const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32; };
const spawning = new RotatingBoxes(planck, random);
for (let index = 0; index < 30; index++) {
  assert.ok(spawning.spawn(0.35 + (index % 6) * 0.65));
  const body = spawning.bodies.at(-1);
  close(body.getAngularVelocity(), 0);
  close(body.getLinearVelocity().length(), 0);
  for (const previous of spawning.bodies.slice(0, -1)) assert.ok(!planck.testOverlap(body.getFixtureList().getShape(), 0, previous.getFixtureList().getShape(), 0, body.getTransform(), previous.getTransform()));
  run(spawning, 0.7);
}
assert.equal(spawning.bodies.length, 30);
run(spawning, 20);
assert.ok(spawning.bodies.every(body => !body.isAwake()));
for (let contact = spawning.world.getContactList(); contact; contact = contact.getNext()) {
  const manifold = contact.getWorldManifold(null);
  if (manifold) assert.ok(manifold.separations.slice(0, contact.getManifold().pointCount).every(gap => gap >= -0.015));
}
spawning.advanceFrame(100);
assert.ok(spawning.lastSteps <= 24);
spawning.advanceFrame(100, true);
assert.equal(spawning.lastSteps, 0);
spawning.reset();
assert.equal(spawning.bodies.length, 0);
const blocked = new RotatingBoxes(planck, () => 0);
blocked.createBox(2, 2.65);
assert.equal(blocked.spawn(2, 2.5), false);
assert.match(blocked.message, /No clear space/);
console.log('PASS 30 nonoverlap spawns without a count cap, finite settled pile, refused occupied spot, clear, bounded frame work');

const coarseFrames = new RotatingBoxes(planck, () => 0.17);
const fineFrames = new RotatingBoxes(planck, () => 0.17);
coarseFrames.spawn(2);
fineFrames.spawn(2);
for (let frame = 0; frame < 120; frame++) coarseFrames.advanceFrame(1 / 30);
for (let frame = 0; frame < 480; frame++) fineFrames.advanceFrame(1 / 120);
vertices(coarseFrames.bodies[0]).forEach((point, index) => point.forEach((value, axis) => close(value, vertices(fineFrames.bodies[0])[index][axis])));
console.log('PASS identical physical result at 30 and 120 animation frames per second');
