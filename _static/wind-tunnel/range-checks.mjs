import assert from 'node:assert/strict';
import {WindTunnel} from './flow.mjs';

const negative = new WindTunnel({angle: -45});
const positive = new WindTunnel({angle: 45});
for (const flow of [negative, positive]) {
  assert.equal(Math.abs(flow.degrees), 45);
  while (flow.time < 2 - 1e-10) {
    flow.step(2 - flow.time);
    const diagnostic = flow.diagnostics();
    assert(diagnostic.divergence < 2e-5);
    assert.equal(diagnostic.blockedVelocity, 0);
    assert(Math.abs(diagnostic.inlet - diagnostic.outlet) < 2e-5 * flow.width * flow.height);
    for (const value of [...flow.u, ...flow.v]) assert(Number.isFinite(value));
  }
}
let reflectionError = 0;
for (let row = 0; row < positive.rows; row++) for (let column = 0; column <= positive.columns; column++) {
  reflectionError = Math.max(reflectionError, Math.abs(positive.u[row * (positive.columns + 1) + column] - negative.u[(negative.rows - 1 - row) * (negative.columns + 1) + column]));
}
for (let row = 0; row <= positive.rows; row++) for (let column = 0; column < positive.columns; column++) {
  reflectionError = Math.max(reflectionError, Math.abs(positive.v[row * positive.columns + column] + negative.v[(negative.rows - row) * negative.columns + column]));
}
assert(reflectionError < 2e-5);
positive.reset(100);
negative.reset(-100);
assert.equal(positive.degrees, 45);
assert.equal(negative.degrees, -45);
assert.equal(positive.time, 0);
assert.equal(negative.time, 0);
console.log(`PASS ±45°: finite two-second evolution, divergence/flux bounds, impermeability, reflection error ${reflectionError.toExponential(2)}, reset/clamping`);
