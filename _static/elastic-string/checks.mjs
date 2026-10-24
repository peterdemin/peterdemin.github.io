import assert from 'node:assert/strict';
import {ElasticString, parameters, internalForces, rateFunction, mechanicalEnergy, STEP, ANCHOR, LENGTH, DENSITY} from './physics.mjs';

const close = (a, b, tolerance = 1e-9) => assert(Math.abs(a-b) < tolerance, `${a} != ${b}`);
const advance = (s, duration, h = STEP) => {
  for (let i = 0; i < Math.round(duration/h); i++) s.step(h);
};
const finite = s => {
  assert(s.state.every(Number.isFinite));
  close(s.state[0], ANCHOR[0]); close(s.state[1], ANCHOR[1]);
  assert(s.maxStrain() < 0.3, `Unexpected extension: ${s.maxStrain()}`);
};

const original = new ElasticString();
close(original.p.mass.reduce((a,b) => a+b, 0), DENSITY*LENGTH);
close(original.p.spacing,0.05);
const snapshot = original.state.slice();
const heldRates = rateFunction(snapshot, original.p, true);
assert.deepEqual(original.state, snapshot);
assert.equal(heldRates[heldRates.length-1], 0);
const freeRates = rateFunction(snapshot, original.p, false);
close(freeRates[freeRates.length-1], -9.81);
original.release(); original.step();
for (let i = 0; i < snapshot.length; i++) close(original.state[i], snapshot[i] + STEP*freeRates[i]);
console.log('PASS mass, pure rate function, fixed support, held/free endpoint and forward Euler');

// Energy gradients independently check the signs and all nodal contributions.
const p = parameters({segments: 6, length: 1, gravity: 0, viscosityArea: 0, bendingDamping: 0});
const state = new Float64Array(2*p.size);
for (let i = 0; i <= p.segments; i++) {
  state[2*i] = 1.04*i/p.segments;
  state[2*i+1] = 0.03*Math.sin(i);
}
const force = internalForces(state, p);
for (let j = 0; j < p.size; j++) {
  const plus = state.slice(), minus = state.slice();
  plus[j] += 1e-7; minus[j] -= 1e-7;
  const derivative = -(mechanicalEnergy(plus,p)-mechanicalEnergy(minus,p))/2e-7;
  close(force[j], derivative, 1e-6);
}
let fx=0,fy=0,torque=0;
for (let i=0;i<=p.segments;i++) {
  fx+=force[2*i]; fy+=force[2*i+1];
  torque+=state[2*i]*force[2*i+1]-state[2*i+1]*force[2*i];
}
close(fx,0); close(fy,0); close(torque,0);
const viscous = {...p, axial:0, bending:0, viscosityArea:0.1, bendingDamping:1e-5};
for (let j=0;j<p.size;j++) state[p.size+j]=Math.sin(j*3.1);
const dampingForce=internalForces(state,viscous);
assert(dampingForce.reduce((power,f,j) => power+f*state[p.size+j],0)<0);
for (let i=0;i<=p.segments;i++) {
  state[p.size+2*i]=1-state[2*i+1];
  state[p.size+2*i+1]=2+state[2*i];
}
assert(internalForces(state,viscous).every(f=>Math.abs(f)<1e-9));
const slackParameters=parameters({segments:2,gravity:0});
for(const fraction of [0,0.01,0.1,0.7,0.99]) {
  const slack=new Float64Array(2*slackParameters.size);
  slack[2]=fraction*slackParameters.spacing;
  slack[4]=slack[2]+0.75*slackParameters.spacing;
  assert(internalForces(slack,slackParameters).every(f=>Math.abs(f)<1e-10),
    `Shortened straight segments must not repel (${fraction})`);
  close(mechanicalEnergy(slack,slackParameters),0);
}
// Bent, compressed geometry still has finite, energy-derived bending forces.
const folded=state.slice();
folded[2]=folded[0]+0.1*p.spacing; folded[3]=folded[1]+0.05*p.spacing;
const foldedForce=internalForces(folded,p);
for(let j=0;j<p.size;j++) {
  const plus=folded.slice(),minus=folded.slice();plus[j]+=1e-7;minus[j]-=1e-7;
  close(foldedForce[j],-(mechanicalEnergy(plus,p)-mechanicalEnergy(minus,p))/2e-7,1e-6);
}
console.log('PASS elastic-energy gradients, total force/torque, dissipative damping, rigid motion and no slack-segment repulsion');

const dropped = new ElasticString();
dropped.release(); advance(dropped,0.15); finite(dropped);
assert(dropped.endpoint[1]<ANCHOR[1]-0.03);
const fine = new ElasticString();
fine.release(); advance(fine,0.15,STEP/2);
const positionError=Math.max(...dropped.state.slice(0,dropped.p.size).map((value,i)=>Math.abs(value-fine.state[i])));
assert(positionError<1e-4, `Step convergence error: ${positionError}`);
const held = new ElasticString();
const initialEnd=held.endpoint;
advance(held,0.2); finite(held);
assert.deepEqual(held.endpoint,initialEnd);
held.release(); advance(held,0.3); finite(held);
assert.notDeepEqual(held.endpoint,initialEnd);
console.log('PASS falling endpoint, held support removal and time-step convergence');

// Material damping cannot remove a rigid swing; verify the separate settling term.
const moving = new ElasticString();
moving.state[moving.p.size+2] = 0.4;
moving.state[moving.p.size+3] = -0.7;
const dampedRate = rateFunction(moving.state,moving.p);
const undampedRate = rateFunction(moving.state,{...moving.p,settlingDamping:0});
close(dampedRate[moving.p.size+2]-undampedRate[moving.p.size+2],-0.8*0.4);
close(dampedRate[moving.p.size+3]-undampedRate[moving.p.size+3],0.8*0.7);
const settling = new ElasticString();
settling.release(); advance(settling,1);
let earlyPeakSpeed=0;
for(let i=0;i<Math.round(1/STEP);i++) {
  settling.step();
  earlyPeakSpeed=Math.max(earlyPeakSpeed,Math.hypot(settling.state[2*settling.p.size-2],settling.state[2*settling.p.size-1]));
}
assert(earlyPeakSpeed>1,`Initial swing suppressed: ${earlyPeakSpeed} m/s`);
advance(settling,14);
let peakSpeed=0;
for(let i=0;i<Math.round(2/STEP);i++) {
  settling.step();
  for(let j=settling.p.size;j<settling.state.length;j+=2) {
    peakSpeed=Math.max(peakSpeed,Math.hypot(settling.state[j],settling.state[j+1]));
  }
}
assert(peakSpeed<0.05,`Residual motion after sixteen seconds: ${peakSpeed} m/s`);
finite(settling);
console.log('PASS visible initial swing, gradual damping and residual speed below 0.05 m/s after sixteen seconds');

// A transverse pulse travels along the string instead of moving it as a unit.
const wave=new ElasticString({gravity:0,settlingDamping:0});
for(let i=0;i<=wave.p.segments;i++) wave.state[2*i]=ANCHOR[0]+1.01*wave.p.spacing*i;
wave.target=wave.endpoint;
const endX=wave.endpoint[0];
const probes=[0.75,0.5,0.25].map(f=>Math.round(f*wave.p.segments));
const arrivals=probes.map(()=>null);
for(let i=0;i<Math.round(0.8/STEP);i++) {
  const t=i*STEP;
  wave.move([endX,ANCHOR[1]+(t<0.08?0.05*Math.sin(Math.PI*t/0.08):0)]);
  wave.step();
  if(i%100===0) for(let j=0;j<probes.length;j++) {
    if(arrivals[j]===null&&Math.abs(wave.state[2*probes[j]+1]-ANCHOR[1])>0.005) arrivals[j]=wave.time;
  }
}
assert(arrivals.every(t=>t!==null),'Pulse must reach every probe');
assert(arrivals[0]<arrivals[1]&&arrivals[1]<arrivals[2]);
assert(arrivals[2]-arrivals[0]>0.1,'Wave travel should be observable');
console.log('PASS wave propagation with successive arrivals:',arrivals.map(t=>t.toFixed(3)).join(', '),'s');

// Repeated inward pulls include both endpoints at the same location.
for(const offset of [[0,-.45],[0,0],[1,.35],[-.6,-.55],[.9,-.85],[100,100]]) {
  const target=[ANCHOR[0]+offset[0]*LENGTH,ANCHOR[1]+offset[1]*LENGTH];
  held.grab(); held.move(target); advance(held,0.9); finite(held);
  held.release(); advance(held,0.4); finite(held);
}
advance(held,5); finite(held);
held.reset(); assert.equal(held.held,true); assert.equal(held.time,0);
assert.deepEqual(held.endpoint,[ANCHOR[0]+LENGTH,ANCHOR[1]]);
const paused = held.state.slice();
held.advanceFrame(0); assert.deepEqual(held.state,paused);
held.advanceFrame(100); assert(held.time<=0.03001);
console.log('PASS repeated grabs, tight folds, bounded reach, long release, reset and bounded per-frame work');
