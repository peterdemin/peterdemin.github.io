import assert from 'node:assert/strict';
import {ElasticString, FRAME_BUDGET_MS, STEP} from './physics.mjs';

// Use a deterministic clock: each solver attempt costs 2 ms. Fast motion
// subdivides nominal ticks, so the budget must also be checked inside a tick.
const string = new ElasticString();
string.release();
for (let i=1;i<=string.p.segments;i++) string.state[string.p.size+2*i+1]=-18*i/string.p.segments;
const reference = new ElasticString();
reference.release(); reference.state.set(string.state);
let clock=0, calls=0;
const accepted=[];
const substep=string.substep.bind(string);
string.substep=h=>{
  const before=string.state.slice(0,string.p.size);
  substep(h); calls++; clock+=2;
  let movement=0;
  for(let i=0;i<string.p.size;i+=2)movement=Math.max(movement,
    Math.hypot(string.state[i]-before[i],string.state[i+1]-before[i+1]));
  if(movement<=.01*string.p.spacing*(1+1e-6))accepted.push(h);
};
string.advanceFrame(1/60,()=>clock);
assert(clock>=FRAME_BUDGET_MS && clock<=FRAME_BUDGET_MS+4);
assert(calls<10,'Fast motion must yield within an adaptive tick');
assert(string.time>0 && string.time<STEP);
for(const h of accepted)reference.substep(h);
assert.deepEqual(string.state,reference.state,'Budgeting must preserve accepted physical updates');
assert(Math.abs(string.time-accepted.reduce((a,b)=>a+b,0))<1e-15);
assert(string.accumulator>=0 && string.accumulator<STEP,'Overdue wall time must be discarded');
const snapshot=string.state.slice();
string.advanceFrame(0,()=>clock);
assert.deepEqual(string.state,snapshot,'No catch-up work on the next frame');
const previousCalls=calls;
string.advanceFrame(.05,()=>clock);
assert(calls-previousCalls<10,'A long frame must not create a catch-up feedback loop');
assert(string.state.every(Number.isFinite));
console.log('PASS frame budget includes adaptive substeps, preserves physical updates and discards backlog');
