import assert from 'node:assert/strict';
import {ElasticString, ANCHOR, STEP, SEGMENTS} from './physics.mjs';

// Close the supports gently to measure a resolved sag rather than a violent
// transient fold. The old collapse bug remains detectable by link length and
// curvature; rapid grabs and releases are covered in checks.mjs.
function sagRun(span, segments) {
  const string = new ElasticString({segments});
  // Close the supports from the ordinary straight initial state.
  for(let i=0;i<=string.p.segments;i++) {
    string.state[2*i]=ANCHOR[0]+string.p.length*i/string.p.segments;
    string.state[2*i+1]=ANCHOR[1];
  }
  string.target=string.endpoint;
  for (let k=0;k<Math.round(12/STEP);k++) {
    const t=k*STEP, blend=0.5-0.5*Math.cos(Math.PI*Math.min(t/8,1));
    string.move([ANCHOR[0]+string.p.length+(span-string.p.length)*blend,ANCHOR[1]]);
    string.step();
  }
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
  // The coarser mesh allows a larger angle per link. Require a turn below
  // 45 degrees, then independently compare the entire shape to a finer mesh.
  assert(Math.max(...turns) < Math.PI/4, 'Bending concentrated into an unresolved corner');
  assert(lowest > 3 && lowest < p.segments - 3);
  // No minimum curvature is required: a broad shallow bend is also valid. The maximum turn and minimum
  // link length above rule out the old collapsed, point-like bottom kink.
  console.log(`PASS ${segments} segments, ${span} m span: minimum link ${minimumLength.toFixed(5)} m, maximum turn ${(Math.max(...turns)*180/Math.PI).toFixed(1)}°, rounded bottom`);
  return string;
}
for (const span of [2, 0.4]) {
  const coarse=sagRun(span,SEGMENTS),fine=sagRun(span,2*SEGMENTS);
  let error=0;
  for(let i=0;i<=SEGMENTS;i++)error=Math.max(error,Math.hypot(
    coarse.state[2*i]-fine.state[4*i],coarse.state[2*i+1]-fine.state[4*i+1]));
  assert(error<0.003,`Coarse sag differs from refined shape by ${error} m`);
  console.log(`PASS spatial refinement: maximum shape difference ${(1000*error).toFixed(2)} mm`);
}
