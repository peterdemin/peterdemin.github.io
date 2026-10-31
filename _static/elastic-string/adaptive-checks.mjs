import assert from 'node:assert/strict';
import {ElasticString, STEP, mechanicalEnergy} from './physics.mjs';

function movingString() {
  const string=new ElasticString();string.release();
  for(let i=1;i<=string.p.segments;i++)string.state[string.p.size+2*i+1]=-18*i/string.p.segments;
  return string;
}
// Count actual solve-and-retry work separately from accepted physical time.
// Including contour repair in the measured displacement checks the full update.
const fast=movingString();
let attempts=0,rejected=0;
const substep=fast.substep.bind(fast);
fast.substep=h=>{
  const before=fast.state.slice(0,fast.p.size);substep(h);attempts++;
  let movement=0;
  for(let i=0;i<fast.p.size;i+=2)movement=Math.max(movement,
    Math.hypot(fast.state[i]-before[i],fast.state[i+1]-before[i+1]));
  if(movement>.01*fast.p.spacing*(1+1e-6))rejected++;
};
for(let i=0;i<1000;i++)fast.step();
assert(Math.abs(fast.time-.1)<1e-12);
assert(rejected<.05*attempts,'Steady fast motion should not repeatedly overshoot the movement limit');
assert(attempts<6500,'Fast motion regressed to redundant solve-and-retry work');
console.log(`PASS fast adaptive stepping: ${attempts} attempts, ${rejected} rejected, 0.1 s simulated`);

// Refine enough to fall below the geometric step limit, rather than merely
// halving a nominal tick which is already being subdivided by fast motion.
const coarse=movingString(),fine=movingString();
for(let i=0;i<Math.round(.2/STEP);i++)coarse.step();
for(let i=0;i<Math.round(.2/(STEP/10));i++)fine.step(STEP/10);
let positionError=0,velocityError=0;
for(let i=0;i<coarse.p.size;i+=2) {
  positionError=Math.max(positionError,Math.hypot(coarse.state[i]-fine.state[i],coarse.state[i+1]-fine.state[i+1]));
  const j=coarse.p.size+i;
  velocityError=Math.max(velocityError,Math.hypot(coarse.state[j]-fine.state[j],coarse.state[j+1]-fine.state[j+1]));
}
assert(positionError<.0002,`Fast-motion position error: ${positionError} m`);
assert(velocityError<.003,`Fast-motion velocity error: ${velocityError} m/s`);
assert(Math.abs(mechanicalEnergy(coarse.state,coarse.p)-mechanicalEnergy(fine.state,fine.p))<.0002);
console.log(`PASS fast-motion refinement: ${(positionError*1000).toFixed(3)} mm position error`);

// A rejected trial must restore velocities as well as positions when using
// the reusable snapshot. Force one rejected trial with an identifiable change.
const retry=new ElasticString();
const start=retry.state[2];let calls=0;
retry.state[retry.p.size+2]=1;
retry.substep=h=>{
  retry.state[2]+=h;
  if(calls++===0){retry.state[2]+=.01;retry.state[retry.p.size+2]=999;}
};
retry.step();
assert(calls>=3,'Rejected trial must be retried with a smaller step');
assert(Math.abs(retry.state[2]-start-STEP)<1e-12);
assert.equal(retry.state[retry.p.size+2],1);
assert(Math.abs(retry.time-STEP)<1e-12);
console.log('PASS rejected trials restore the entire state and do not advance simulated time');
