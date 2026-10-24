import assert from 'node:assert/strict';
import {SailSimulation, add, sub, mul, dot, length, unit, segmentVelocity, solveLinear} from './physics.mjs';

const close = (actual, expected, tolerance = 1e-8) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} differs from ${expected}`);
const checks = [];
function check(name, execute) { execute(); checks.push(name); console.log(`PASS ${name}`); }
function flat(speed, direction, chordCount = 6, spanCount = 10) {
  const simulation = new SailSimulation(chordCount, spanCount);
  simulation.speed = speed;
  simulation.direction = direction;
  simulation.positions = simulation.positions.map((position, index) => {
    const span = Math.floor(index / (chordCount + 1)), chord = index % (chordCount + 1);
    return [(3.2 - 2.95 * span / spanCount) * chord / chordCount, position[1], 0];
  });
  simulation.solveAerodynamics();
  return simulation;
}
function bagged(speed, direction) {
  const simulation = new SailSimulation();
  simulation.speed = speed;
  simulation.direction = direction;
  simulation.solveAerodynamics();
  return simulation;
}
function relax(simulation, seconds) {
  for (let tick = 0; tick < seconds * 240; tick++) {
    if (tick % 4 === 0) simulation.solveAerodynamics();
    simulation.step();
    if (!simulation.valid) return;
  }
  simulation.solveAerodynamics();
}

check('finite vortex segment agrees with analytic Biot–Savart result', () => {
  const velocity = segmentVelocity([1, 0, 0], [0, -1, 0], [0, 1, 0], 0);
  close(velocity[0], 0); close(velocity[1], 0); close(velocity[2], -Math.SQRT2 / (4 * Math.PI));
  assert.ok(segmentVelocity([0, 0, 0], [0, -1, 0], [0, 1, 0]).every(Number.isFinite));
});
check('linear solve handles a zero diagonal using pivoting', () => {
  const solution = solveLinear([[0, 2], [1, 3]], [4, 7]);
  close(solution[0], 1); close(solution[1], 2);
});
check('zero wind has zero circulation, aerodynamic forces and tracer motion', () => {
  const simulation = flat(0, 15);
  close(length(simulation.totalForce), 0);
  assert.deepEqual(simulation.advect([1, 5.2, 0.2], 0.1), [1, 5.2, 0.2]);
});
check('wind is horizontal over the entire direction control', () => {
  for (let angle = -180; angle <= 180; angle += 5) {
    const simulation = flat(6, angle);
    close(simulation.wind[1], 0);
    close(length(simulation.wind), 6);
  }
});
check('flat-sail lift reverses with incidence and induced drag is symmetric', () => {
  const positive = flat(6, 15), negative = flat(6, -15), edgeOn = flat(6, 0);
  close(positive.horizontalLift, -negative.horizontalLift);
  close(positive.inducedDrag, negative.inducedDrag);
  assert.ok(positive.inducedDrag > 0);
  close(edgeOn.lift, 0);
  close(edgeOn.inducedDrag, 0);
});
check('flat-sail forces scale with wind speed squared', () => {
  const slow = flat(3, 10), fast = flat(6, 10);
  close(fast.lift, 4 * slow.lift);
  close(fast.drag, 4 * slow.drag);
});
check('no-penetration holds at every frozen-shape control point', () => {
  const simulation = flat(6, 15);
  for (const panel of simulation.panels) close(dot(simulation.velocityAt(panel.control), panel.normal), 0, 1e-10);
  assert.ok(simulation.residual < 1e-10);
});
check('lift and drag reconstruct the complete force and distributed loads conserve it', () => {
  const simulation = flat(6, 15), dragAxis = unit(simulation.wind);
  const reconstructed = add(simulation.liftVector, mul(dragAxis, simulation.drag));
  close(length(sub(reconstructed, simulation.totalForce)), 0);
  close(dot(simulation.liftVector, dragAxis), 0);
  close(length(sub(simulation.forces.reduce(add, [0, 0, 0]), simulation.totalForce)), 0);
  const area = simulation.panels.reduce((sum, panel) => sum + panel.area, 0);
  close(simulation.drag - simulation.inducedDrag, 0.5 * 1.225 * 36 * area * 0.008);
});
check('wake legs follow wind and carry each bound vortex circulation', () => {
  const simulation = flat(6, 15);
  for (const panel of simulation.panels) {
    close(length(sub(sub(panel.farEnd, panel.end), mul(unit(simulation.wind), 70))), 0);
    close(length(sub(sub(panel.farStart, panel.start), mul(unit(simulation.wind), 70))), 0);
    assert.ok(Number.isFinite(panel.gamma));
  }
});
check('finite-span field contains above-head vertical flow; tracer integration converges', () => {
  const simulation = flat(6, 15), point = [0.7, 5.2, 0.25];
  assert.ok(Math.abs(simulation.velocityAt(point)[1]) > 0.1);
  const whole = simulation.advect(point, 0.02), halves = simulation.advect(simulation.advect(point, 0.01), 0.01);
  const quarters = Array.from({length: 4}).reduce(position => simulation.advect(position, 0.005), point);
  assert.ok(length(sub(halves, quarters)) < length(sub(whole, halves)));
  assert.ok(length(sub(whole, point)) > 0.01);
});
check('flat-sail lattice refinement changes lift and induced drag by less than 5%', () => {
  const coarse = flat(6, 10, 4, 8), standard = flat(6, 10), fine = flat(6, 10, 8, 14);
  assert.ok(Math.abs(coarse.lift / fine.lift - 1) < 0.05);
  assert.ok(Math.abs(standard.inducedDrag / fine.inducedDrag - 1) < 0.05);
  console.log(`  32/60/112 panels: lift ${coarse.lift.toFixed(2)}/${standard.lift.toFixed(2)}/${fine.lift.toFixed(2)} N; induced drag ${coarse.inducedDrag.toFixed(2)}/${standard.inducedDrag.toFixed(2)}/${fine.inducedDrag.toFixed(2)} N`);
});
check('fluid loads redistribute built-in fullness while every rig anchor stays fixed', () => {
  const unloaded = bagged(0, 15), loaded = bagged(6, 15);
  relax(unloaded, 3); relax(loaded, 3);
  assert.ok(loaded.valid && unloaded.valid);
  assert.ok(Math.max(...unloaded.positions.map((position, index) => length(sub(position, loaded.positions[index])))) > 0.05);
  assert.ok(loaded.maxStrain < 0.01);
  for (let index = 0; index < loaded.positions.length; index++) if (loaded.pinned[index]) assert.deepEqual(loaded.positions[index], loaded.anchors[index]);
  for (const panel of loaded.panels) close(dot(loaded.velocityAt(panel.control), panel.normal), 0, 1e-8);
});
check('coupled runs stay finite and bounded at modest incidence up to maximum wind', () => {
  for (const [speed, direction] of [[6, 15], [6, -15], [12, 20], [12, -20]]) {
    const simulation = bagged(speed, direction);
    relax(simulation, 6);
    assert.ok(simulation.valid, simulation.failureReason);
    assert.ok(simulation.positions.every(position => position.every(Number.isFinite)));
    assert.ok(simulation.maxStrain < 0.06);
    assert.ok(Math.max(...simulation.positions.map(length)) < 6);
    assert.ok(simulation.drag > 0);
    console.log(`  ${speed} m/s, ${direction}°: lift ${simulation.lift.toFixed(1)} N, drag ${simulation.drag.toFixed(1)} N, strain ${(100 * simulation.maxStrain).toFixed(1)}%`);
  }
});
check('built-in fullness is encoded in rest metrics, not elastic extension', () => {
  const simulation = bagged(0, 15), span = Math.floor(simulation.spanCount / 2);
  let materialChord = 0;
  for (let chord = 0; chord < simulation.chordCount; chord++) materialChord += length(sub(simulation.restGeometry[simulation.index(chord + 1, span)], simulation.restGeometry[simulation.index(chord, span)]));
  const attachmentChord = 3.2 - 2.95 * span / simulation.spanCount;
  assert.ok(materialChord / attachmentChord > 1.03);
  close(simulation.maxStrain, 0);
  assert.ok(simulation.restGeometry.every(position => position[2] === 0));
  assert.ok(simulation.constraints.filter(constraint => constraint.compliance < 0.01).every(constraint => constraint.compliance <= 1e-7));
  console.log(`  flat cut has ${(100 * (materialChord / attachmentChord - 1)).toFixed(2)}% excess mid-height width relative to nominal rig chord`);
});
check('settled cloth fills both sides on repeated wind reversal without reset', () => {
  const simulation = bagged(6, 15);
  const restGeometry = simulation.restGeometry.map(position => [...position]);
  let peakStrain = 0;
  for (const direction of [15, -15, 15, -15]) {
    simulation.direction = direction;
    for (let tick = 0; tick < 6 * 240; tick++) {
      if (tick % 4 === 0) {
        simulation.solveAerodynamics();
        assert.ok(simulation.forces.every(force => force.every(Number.isFinite)));
        for (let index = 0; index < simulation.positions.length; index++) if (simulation.pinned[index]) assert.deepEqual(simulation.positions[index], simulation.anchors[index]);
      }
      simulation.step();
      assert.ok(simulation.valid, simulation.failureReason);
      peakStrain = Math.max(peakStrain, simulation.maxStrain);
    }
    const free = simulation.positions.filter((position, index) => !simulation.pinned[index]);
    const mean = free.reduce((sum, position) => sum + position[2], 0) / free.length;
    assert.ok(mean * Math.sign(direction) > 0.04, `sail remains on the wrong side at ${direction}°: mean z = ${mean}`);
    assert.ok(free.every(position => position[2] * Math.sign(direction) > 0));
    assert.ok(simulation.horizontalLift * Math.sign(direction) > 0);
    assert.ok(simulation.drag > 0 && simulation.residual < 1e-8);
    assert.deepEqual(simulation.restGeometry, restGeometry);
    console.log(`  ${direction}° after 6 s: mean z ${mean.toFixed(4)} m, horizontal lift ${simulation.horizontalLift.toFixed(1)} N`);
  }
  assert.ok(peakStrain < 0.03, `reversal strain ${peakStrain}`);
  console.log(`  peak strain across four fills ${(100 * peakStrain).toFixed(2)}%; no reset, rest-length change or prescribed camber`);
});
check('rest-area mass is consistent and gravity causes no-wind sag with exact anchors', () => {
  const gravity = bagged(0, 15), weightless = bagged(0, 15);
  weightless.gravity = [0, 0, 0];
  const area = gravity.makePanels().reduce((sum, panel) => sum + panel.area, 0);
  close(gravity.masses.reduce((sum, mass) => sum + mass, 0), area * 0.22);
  const centerHeight = simulation => simulation.positions.reduce((sum, position, index) => sum + position[1] * simulation.masses[index], 0) / simulation.masses.reduce((sum, mass) => sum + mass, 0);
  const initialHeight = centerHeight(gravity);
  relax(gravity, 3); relax(weightless, 3);
  assert.ok(centerHeight(gravity) < initialHeight - 1e-8);
  close(centerHeight(weightless), initialHeight);
  assert.ok(gravity.maxStrain < 0.001);
  for (let index = 0; index < gravity.positions.length; index++) if (gravity.pinned[index]) assert.deepEqual(gravity.positions[index], gravity.anchors[index]);
  console.log(`  cloth mass ${gravity.masses.reduce((sum, mass) => sum + mass, 0).toFixed(3)} kg; gravity lowers mass-center by ${(1e6 * (initialHeight - centerHeight(gravity))).toFixed(3)} µm in the stiff flat no-wind state`);
});
check('material normal and signed load stay consistent in raw reversed-flow diagnostics', () => {
  const simulation = bagged(6, 15);
  for (const direction of [15, 165, -15, -165]) {
    simulation.direction = direction;
    simulation.solveAerodynamics({allowUnsupported: true});
    assert.ok(simulation.valid);
    assert.ok(simulation.panels.every(panel => panel.normal[2] > 0.999));
    assert.ok(simulation.panels.every(panel => panel.pressure * Math.sign(direction) > 0));
  }
});
check('unsupported angles hold cloth and withhold loads without a numerical failure', () => {
  const simulation = bagged(6, 15);
  const positions = simulation.positions.map(position => [...position]);
  const time = simulation.time;
  for (const direction of [20.1, 89.9, 90, 90.1, 165, -89.9, -90, -90.1, -165]) {
    simulation.direction = direction;
    simulation.solveAerodynamics();
    simulation.step();
    assert.equal(simulation.valid, true);
    assert.equal(simulation.modelStatus, 'unsupported');
    assert.equal(simulation.failureReason, '');
    assert.equal(simulation.panels.length, 0);
    close(length(simulation.totalForce), 0);
    assert.ok(simulation.forces.every(force => length(force) === 0));
    assert.deepEqual(simulation.positions, positions);
    close(simulation.time, time);
  }
  simulation.direction = -15;
  simulation.solveAerodynamics();
  assert.equal(simulation.modelStatus, 'attached');
  assert.ok(simulation.horizontalLift < 0);
  assert.deepEqual(simulation.positions, positions);
  simulation.step();
  assert.ok(simulation.time > time);
  simulation.speed = 0; simulation.direction = 105;
  simulation.solveAerodynamics();
  assert.equal(simulation.modelStatus, 'zero-wind');
  assert.equal(simulation.modelSupported, true);
});
check('injected excessive load stops numerically and reset recovers', () => {
  const simulation = bagged(6, 15);
  simulation.forces = simulation.positions.map((position, index) => simulation.pinned[index] ? [0, 0, 0] : [0, 0, 1e8]);
  simulation.step();
  assert.equal(simulation.valid, false);
  assert.equal(simulation.modelStatus, 'numerical-failure');
  assert.ok(simulation.failureReason.length > 0);
  close(length(simulation.totalForce), 0);
  assert.ok(simulation.positions.every(position => position.every(Number.isFinite)));
  simulation.speed = 6; simulation.direction = 15; simulation.reset();
  assert.equal(simulation.valid, true);
  assert.equal(simulation.failureReason, '');
});
console.log(`${checks.length} numerical checks passed. These checks do not validate stall, turbulence, real sail performance, or transient aeroelasticity.`);
