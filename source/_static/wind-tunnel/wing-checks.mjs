import assert from 'node:assert/strict';
import {WindTunnel, CHORD, thickness} from './flow.mjs';
import {buildWingMesh} from './wing.mjs';

for (const angle of [-45, -15, 0, 15, 45]) {
  const flow = new WindTunnel({angle});
  const before = {u: flow.u.slice(), v: flow.v.slice(), pressure: flow.pressure.slice(), fluid: flow.fluid.slice(), time: flow.time};
  const mesh = buildWingMesh(flow);
  assert.equal(mesh.length, 80 * 6 * 7);
  const stations = new Set();
  for (let index = 0; index < mesh.length; index += 7) {
    const horizontal = mesh[index] - flow.center[0];
    const vertical = mesh[index + 1] - flow.center[1];
    const along = horizontal * Math.cos(flow.angle) + vertical * Math.sin(flow.angle);
    const across = -horizontal * Math.sin(flow.angle) + vertical * Math.cos(flow.angle);
    const fraction = along / CHORD + 0.5;
    assert(fraction >= -1e-12 && fraction <= 1 + 1e-12);
    const halfThickness = Math.max(0, thickness(Math.max(0, Math.min(1, fraction))));
    assert(Math.abs(across) <= halfThickness + 1e-12);
    assert.equal(mesh[index + 2], 0);
    for (const value of mesh.slice(index, index + 7)) assert(Number.isFinite(value));
    if (Math.abs(across) > 1e-12) stations.add(fraction.toFixed(12));
  }
  assert(stations.size >= 79);
  assert.deepEqual(flow.u, before.u);
  assert.deepEqual(flow.v, before.v);
  assert.deepEqual(flow.pressure, before.pressure);
  assert.deepEqual(flow.fluid, before.fluid);
  assert.equal(flow.time, before.time);
}
console.log('PASS smooth 2D profile mesh: 80 cosine-spaced sections, finite lighting, exact profile/angle, zero depth, no flow-state changes');
