import assert from 'node:assert/strict';
import {WindTunnel} from './flow.mjs';
import {pressureLoads, pressureColor, pressureField} from './loads.mjs';

function close(actual, expected, tolerance = 1e-10) {
  assert(Math.abs(actual - expected) < tolerance, `${actual} differs from ${expected}`);
}

const rectangle = new WindTunnel({columns: 24, rows: 12});
rectangle.fluid.fill(1);
for (let row = 4; row < 8; row++) for (let column = 8; column < 14; column++) rectangle.fluid[row * rectangle.columns + column] = 0;
rectangle.pressure.fill(11);
const uniform = pressureLoads(rectangle);
assert.equal(uniform.faces.length, 20);
close(uniform.force[0], 0);
close(uniform.force[1], 0);
for (let row = 4; row < 8; row++) {
  rectangle.pressure[row * rectangle.columns + 7] = 12;
  rectangle.pressure[row * rectangle.columns + 14] = 10;
}
for (let column = 8; column < 14; column++) {
  rectangle.pressure[3 * rectangle.columns + column] = 8;
  rectangle.pressure[8 * rectangle.columns + column] = 5;
}
const prescribed = pressureLoads(rectangle);
close(prescribed.drag, (12 - 10) * 4 * rectangle.spacing);
close(prescribed.lift, (8 - 5) * 6 * rectangle.spacing);
for (let index = 0; index < rectangle.pressure.length; index++) rectangle.pressure[index] += 37;
const offset = pressureLoads(rectangle);
close(offset.drag, prescribed.drag);
close(offset.lift, prescribed.lift);
close(Math.hypot(prescribed.drag, prescribed.lift), Math.hypot(2, 4.5));
close(-(-3) * 0.1, 0.30);
close(Math.hypot(0.20, 0.60), 0.6324555320336759);
rectangle.pressure.fill(0);
const zeroField = pressureField(rectangle);
assert.equal(zeroField.range, 1e-9);
for (const value of zeroField.vertices) assert(Number.isFinite(value));

for (const degrees of [0, 15, 45]) {
  const positive = new WindTunnel({angle: degrees, columns: 64, rows: 32});
  const negative = new WindTunnel({angle: -degrees, columns: 64, rows: 32});
  for (const flow of [positive, negative]) while (flow.time < 0.5 - 1e-10) flow.step(0.5 - flow.time);
  const positiveLoads = pressureLoads(positive);
  const negativeLoads = pressureLoads(negative);
  close(positiveLoads.drag, negativeLoads.drag, 2e-5);
  close(positiveLoads.lift, -negativeLoads.lift, 2e-5);
  for (const flow of [positive, negative]) {
    const before = {pressure: flow.pressure.slice(), u: flow.u.slice(), v: flow.v.slice(), fluid: flow.fluid.slice(), time: flow.time};
    const loads = pressureLoads(flow);
    let normalX = 0;
    let normalY = 0;
    for (const face of loads.faces) {
      assert.equal(face.pressure, flow.pressure[face.fluidIndex]);
      assert.equal(flow.fluid[face.fluidIndex], 1);
      normalX += face.normal[0];
      normalY += face.normal[1];
      for (const value of [...face.force, ...face.position, face.pressure]) assert(Number.isFinite(value));
    }
    assert.equal(normalX, 0);
    assert.equal(normalY, 0);
    const field = pressureField(flow);
    assert(field.range > 0 && Number.isFinite(field.range));
    const fluidCount = flow.fluid.reduce((sum, value) => sum + value, 0);
    assert.equal(field.vertices.length, fluidCount * 6 * 7);
    for (const value of field.vertices) assert(Number.isFinite(value));
    assert.deepEqual(flow.pressure, before.pressure);
    assert.deepEqual(flow.u, before.u);
    assert.deepEqual(flow.v, before.v);
    assert.deepEqual(flow.fluid, before.fluid);
    assert.equal(flow.time, before.time);
    const saved = flow.pressure.slice();
    for (let index = 0; index < flow.pressure.length; index++) flow.pressure[index] += 17;
    const shifted = pressureLoads(flow);
    close(shifted.drag, loads.drag);
    close(shifted.lift, loads.lift);
    flow.pressure.set(saved);
  }
}
assert.deepEqual(pressureColor(0, 1), [0.13, 0.19, 0.24]);
assert(pressureColor(-1, 1)[2] > pressureColor(-1, 1)[0]);
assert(pressureColor(1, 1)[0] > pressureColor(1, 1)[2]);
console.log('PASS pressure loads: uniform cancellation, offset invariance, prescribed signs/units, angle reflection, finite actual-pressure overlays, no solver mutation');
