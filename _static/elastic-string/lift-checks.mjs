import assert from 'node:assert/strict';
import {ElasticString, ANCHOR, STEP} from './physics.mjs';

// A nearly straight, gravity-stretched hanging string. Mirror the tiny initial
// imperfection: an exactly straight planar chain has no preferred buckling side.
for (const side of [-1, 1]) {
  const string = new ElasticString();
  const {state, p} = string;
  for (let i = 0; i <= p.segments; i++) {
    const s = i * p.spacing;
    state[2*i] = ANCHOR[0] + side * 0.0001 * (s / p.length) ** 8;
    state[2*i+1] = ANCHOR[1] - s * (1 + p.density*p.gravity/p.axial*(p.length-s/2));
  }
  string.grab();
  const end = string.endpoint;
  let upperDisplacement = 0, upperSpeed = 0;
  for (let k = 0; k < Math.round(1 / STEP); k++) {
    string.move([end[0], end[1] + 0.25 * Math.min(k * STEP / 0.5, 1)]);
    string.step();
    for (let i = 1; i <= p.segments / 2; i++) {
      upperDisplacement = Math.max(upperDisplacement, Math.abs(state[2*i]-ANCHOR[0]));
      upperSpeed = Math.max(upperSpeed, Math.hypot(state[p.size+2*i], state[p.size+2*i+1]));
    }
  }
  const bottom = Math.min(...Array.from({length:p.segments+1}, (_,i)=>state[2*i+1]));
  assert(state.every(Number.isFinite));
  // Bound upper motion relative to the 25 cm lift; no external drag imposes
  // a decay rate on the waves that reach this part of the string.
  assert(upperDisplacement < 0.25 * 0.25, `Upper half displaced ${upperDisplacement} m`);
  assert(upperSpeed < 0.8, `Upper half whipped at ${upperSpeed} m/s`);
  assert(bottom < string.endpoint[1] - 0.05, 'The lifted endpoint should turn upward from a bottom fold');
  console.log(`PASS lift (${side}): fold ${(string.endpoint[1]-bottom).toFixed(3)} m below hand; upper motion ${upperDisplacement.toFixed(3)} m, ${upperSpeed.toFixed(3)} m/s`);
}

// Repairing overlap at rest must not manufacture kinetic energy, even if the
// geometric deficit is large. Closing impulses dissipate rather than rebound.
for (const speed of [0, -0.2, 0.2]) {
  const string = new ElasticString({segments:2, length:0.1, gravity:0});
  const {state,p} = string;
  string.release();
  state[2] = ANCHOR[0]+0.045;
  state[4] = ANCHOR[0]+0.1;
  state[p.size+2] = speed;
  const energy = () => p.mass.reduce((sum,m,i)=>sum+0.5*m*(state[p.size+2*i]**2+state[p.size+2*i+1]**2),0);
  const before=energy();
  string.projectContour();
  assert(energy() <= before+1e-14, 'Contour repair injected kinetic energy');
  if (speed===0) assert.equal(energy(),0);
}
console.log('PASS contour repair at rest and passive impulses for free nodes');
