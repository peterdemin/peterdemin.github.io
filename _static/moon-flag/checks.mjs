import assert from 'node:assert/strict';
import {MoonFlag, GRAVITY, MAX_STRETCH, STEP} from './physics.mjs';

function advance(flag, seconds) {
  for (let step = 0; step < Math.round(seconds / STEP); step++) {
    flag.step();
    if (step % 30 === 0) {
      assert(flag.positions.every(point => point.every(Number.isFinite)));
      assert(flag.maximumStretch() <= MAX_STRETCH + 0.000101);
      for (const pin of flag.pins) assert.deepEqual(flag.positions[pin], flag.rest[pin]);
    }
  }
}

const flag = new MoonFlag();
assert.equal(GRAVITY, 1.62);
assert.equal(flag.positions.length, 375);
assert.equal(flag.triangles.length, 672);
assert(Math.abs(flag.mass.reduce((sum, mass) => sum + mass, 0) - 0.7392) < 1e-12);
assert.equal(flag.pins.length, 15);
assert(flag.pins.every(index => flag.rest[index][0] === 0));
assert(flag.links.some(link => link.kind === 'shear'));
assert(flag.bends.length > 600);
console.log('PASS geometry, mass, lunar gravity, left-edge-only attachments, shear and bending rules');

const patch = new MoonFlag({gravity: 0});
patch.release();
patch.positions = patch.rest.map(point => [...point]);
const bend = patch.bends.find(candidate => candidate.nodes.every(index => patch.weights[index] > 0));
patch.positions[bend.nodes[1]][2] = 0.15;
const initialBending = patch.bendingMeasure();
patch.bendingCorrection(bend, STEP);
assert(patch.bendingMeasure() < initialBending);
const shear = patch.links.find(link => link.kind === 'shear' && patch.weights[link.first] > 0 && patch.weights[link.second] > 0);
patch.positions[shear.first][0] += 0.06;
const distance = () => Math.hypot(...patch.positions[shear.first].map((value, axis) => value - patch.positions[shear.second][axis]));
const initialShearError = Math.abs(distance() - shear.rest);
patch.distanceCorrection(shear, STEP);
assert(Math.abs(distance() - shear.rest) < initialShearError);
console.log('PASS bending-energy and shear-error reductions under their actual correction rules');

for (const mode of ['default', 'stretched']) {
  const falling = new MoonFlag();
  advance(falling, 1);
  if (mode === 'stretched') {
    falling.pull([3.2, 4.25, 0.1]);
    advance(falling, 2);
    assert(falling.positions[falling.corner][0] > 2.9);
  }
  const cornerHeight = falling.positions[falling.corner][1];
  const centerHeight = falling.center()[1];
  const releasedAt = falling.time;
  falling.release();
  assert.equal(falling.held, false);
  assert.equal(falling.weights[falling.corner], 1 / falling.mass[falling.corner]);
  advance(falling, 3);
  const cornerDrop = cornerHeight - falling.positions[falling.corner][1];
  const centerDrop = centerHeight - falling.center()[1];
  assert(cornerDrop > 1.5, mode + ' corner drop: ' + cornerDrop);
  assert(centerDrop > 0.5, mode + ' center-of-mass drop: ' + centerDrop);
  assert(falling.time - releasedAt > 2.8, mode + ' release stalled');
  console.log('PASS substantial ' + mode + ' release in 3 seconds:', cornerDrop.toFixed(2) + ' m corner drop,', centerDrop.toFixed(2) + ' m mass-center drop');
}

advance(flag, 1);
assert.deepEqual(flag.positions[flag.corner], flag.rest[flag.corner]);
const restingCenter = flag.center();
flag.pull([3.2, 4.25, 0.1]);
advance(flag, 2);
const pulledCorner = [...flag.positions[flag.corner]];
assert(pulledCorner[0] > 2.9, pulledCorner);
assert(flag.maximumStretch() > 1.25);
console.log('PASS visibly compliant stretch:', ((pulledCorner[0] / flag.width - 1) * 100).toFixed(1) + '% corner reach');

flag.pull([100, 100, 100]);
advance(flag, 2);
assert(flag.positions[flag.corner].every(value => Math.abs(value) < 8));
assert(flag.maximumStretch() <= MAX_STRETCH + 0.000101);
console.log('PASS extreme pull bounded at:', flag.maximumStretch().toFixed(6), '× rest length');

flag.release();
assert.equal(flag.weights[flag.corner], 1 / flag.mass[flag.corner]);
advance(flag, 7);
assert(flag.center()[1] < restingCenter[1] - 0.1);
const depths = flag.positions.map(point => point[2]);
assert(Math.max(...depths) - Math.min(...depths) > 0.03);
assert(flag.bendingMeasure() > 0);
let maximumTurn = 0;
for (const bend of flag.bends) {
  const first = flag.positions[bend.nodes[0]];
  const middle = flag.positions[bend.nodes[1]];
  const last = flag.positions[bend.nodes[2]];
  const incoming = middle.map((value, axis) => value - first[axis]);
  const outgoing = last.map((value, axis) => value - middle[axis]);
  const cosine = incoming.reduce((sum, value, axis) => sum + value * outgoing[axis], 0) / (Math.hypot(...incoming) * Math.hypot(...outgoing));
  maximumTurn = Math.max(maximumTurn, Math.acos(Math.max(-1, Math.min(1, cosine))));
}
assert(maximumTurn < 1.2, maximumTurn);
console.log('PASS release, gravity-driven sag and smooth three-dimensional bending; max neighbor turn:', (maximumTurn * 180 / Math.PI).toFixed(1) + '°');

const lunar = new MoonFlag();
const weightless = new MoonFlag({gravity: 0});
lunar.release();
weightless.release();
advance(lunar, 1);
advance(weightless, 1);
assert(lunar.center()[1] < weightless.center()[1] - 0.08);
console.log('PASS gravity-on versus gravity-off comparison');

for (const point of [[3.4, 3.8, 0.2], [2, 4.6, -0.2], [-10, -10, -10]]) {
  flag.grab();
  flag.pull(point);
  advance(flag, 0.6);
  flag.release();
  advance(flag, 0.6);
}
console.log('PASS repeated grabs, opposing/extreme pulls, releases, finite positions and exact pins');

flag.reset();
assert(flag.held);
assert.equal(flag.time, 0);
assert.equal(flag.rejectedSteps, 0);
assert.deepEqual(flag.positions[flag.corner], flag.rest[flag.corner]);
assert(flag.velocities.every(velocity => velocity.every(value => value === 0)));
flag.pull([NaN, 0, 0]);
assert(flag.target.every(Number.isFinite));
console.log('PASS reset and invalid-target protection');
