import assert from 'node:assert/strict';
import {ElasticString, STEP, ANCHOR, mechanicalEnergy} from './physics.mjs';

function heldRun(h, materialFriction=true) {
  const string=new ElasticString(materialFriction?{}:{viscosityArea:0,bendingDamping:0});
  const {p,state}=string, end=string.endpoint;
  for(let i=0;i<=p.segments;i++) {
    assert.equal(state[2*i+1],ANCHOR[1], 'Reset must start straight');
    assert.equal(state[p.size+2*i],0);assert.equal(state[p.size+2*i+1],0);
  }
  const center=2*Math.round(p.segments/2)+1, initialEnergy=mechanicalEnergy(state,p);
  let middleMin=Infinity,middleMax=-Infinity,lateMin=Infinity,lateMax=-Infinity,peakSpeed=0;
  for(let k=0;k<Math.round(6/h);k++) {
    string.step(h);const t=(k+1)*h;
    if(t>=3&&t<4) {middleMin=Math.min(middleMin,state[center]);middleMax=Math.max(middleMax,state[center]);}
    if(t>=5) {
      lateMin=Math.min(lateMin,state[center]);lateMax=Math.max(lateMax,state[center]);
      if(k%10===0)for(let i=1;i<p.segments;i++)peakSpeed=Math.max(peakSpeed,Math.hypot(state[p.size+2*i],state[p.size+2*i+1]));
    }
  }
  assert.deepEqual(string.endpoint,end);
  assert.equal(state[0],ANCHOR[0]);assert.equal(state[1],ANCHOR[1]);
  assert(state.every(Number.isFinite));
  const middleSwing=middleMax-middleMin, lateSwing=lateMax-lateMin;
  const energy=mechanicalEnergy(state,p);
  if(materialFriction) {
    assert(state[center]<ANCHOR[1]-0.25,'Gravity must produce the sag dynamically');
    assert(middleSwing<0.015,`Startup bounce persisted after three seconds: ${middleSwing} m`);
    assert(lateSwing<0.006,`Held string kept bouncing: ${lateSwing} m`);
    assert(peakSpeed<0.1,`Residual ripple speed ${peakSpeed} m/s`);
    assert(energy<initialEnergy-0.1,'Material friction should remove the startup energy');
  }
  console.log(`PASS straight held start, h=${h}, friction=${materialFriction}: swing at 3–4 s ${(1000*middleSwing).toFixed(2)} mm, at 5–6 s ${(1000*lateSwing).toFixed(2)} mm; peak late speed ${peakSpeed.toFixed(3)} m/s`);
  return {center:state[center],middleSwing,lateSwing,energy};
}
const coarse=heldRun(STEP), fine=heldRun(STEP/2);
assert(Math.abs(coarse.center-fine.center)<0.0002,'Held sag failed step convergence');
assert(Math.abs(coarse.middleSwing-fine.middleSwing)<0.001,'Held decay failed step convergence');
assert(Math.abs(coarse.energy-fine.energy)<0.00001,'Held energy failed step convergence');
const frictionless=heldRun(STEP,false);
assert(frictionless.middleSwing>5*coarse.middleSwing,'Fast settling must depend on material friction');
console.log('PASS material-driven settling and time-step convergence; no precomputed sag or external drag');
