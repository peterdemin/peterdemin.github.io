import assert from 'node:assert/strict';
import {ElasticString, ANCHOR, STEP} from './physics.mjs';

// These spans used to collapse links near the bottom into a point-like kink.
for (const span of [2, 0.4]) {
  const string = new ElasticString();
  string.move([ANCHOR[0] + span, ANCHOR[1]]);
  for (let i = 0; i < Math.round(5 / STEP); i++) string.step();
  const {state, p} = string;
  assert(state.every(Number.isFinite));
  assert.equal(state[0], ANCHOR[0]);
  assert.equal(state[1], ANCHOR[1]);
  assert(Math.abs(string.endpoint[0] - ANCHOR[0] - span) < 1e-8);
  let minimumLength = Infinity, lowest = 0;
  const turns = new Float64Array(p.segments + 1);
  for (let i = 0; i < p.segments; i++) {
    minimumLength = Math.min(minimumLength,
      Math.hypot(state[2*i+2] - state[2*i], state[2*i+3] - state[2*i+1]));
    if (state[2*i+1] < state[2*lowest+1]) lowest = i;
    if (i === 0) continue;
    const ax = state[2*i] - state[2*i-2], ay = state[2*i+1] - state[2*i-1];
    const bx = state[2*i+2] - state[2*i], by = state[2*i+3] - state[2*i+1];
    turns[i] = Math.abs(Math.atan2(ax*by - ay*bx, ax*bx + ay*by));
  }
  assert(minimumLength > 0.99*p.spacing, `Material accumulated at a collapsed link: ${minimumLength}`);
  assert(Math.max(...turns) < 0.3, 'Bending concentrated into a sharp corner');
  assert(lowest > 3 && lowest < p.segments - 3);
  assert(Array.from(turns.slice(lowest-3, lowest+4)).filter(turn => turn > 0.02).length >= 5,
    'The bottom curve should span several resolved bends');
  console.log(`PASS ${span} m span: minimum link ${minimumLength.toFixed(5)} m, maximum turn ${(Math.max(...turns)*180/Math.PI).toFixed(1)}°, rounded bottom`);
}
