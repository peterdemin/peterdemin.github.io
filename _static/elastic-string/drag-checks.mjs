import assert from 'node:assert/strict';
import {ElasticString, ANCHOR, STEP, HAND_ACCELERATION} from './physics.mjs';

// Feed separate pointer samples, as at 60 Hz normally or at 240 samples per
// physical second with quarter-speed playback. The intended peak speed is
// 2*pi*0.08 = 0.503 m/s. The old follower reached 6 m/s at every tiny jump.
for (const samplesPerSecond of [60, 240]) {
  const string = new ElasticString({gravity:0});
  const {p,state} = string;
  for (let i=0;i<=p.segments;i++) state[2*i]=ANCHOR[0]+1.01*p.spacing*i;
  string.target=string.endpoint;
  const end=string.endpoint;
  let sample=0, peakSpeed=0, peakTurn=0, peakMiddle=0, previousVelocity=[0,0];
  for (let k=0;k<Math.round(0.8/STEP);k++) {
    const t=k*STEP;
    if (t>=sample/samplesPerSecond) {
      string.move([end[0],end[1]+0.08*Math.sin(2*Math.PI*t)]);
      sample++;
    }
    string.step();
    const velocity=[state[2*p.size-2],state[2*p.size-1]];
    const acceleration=Math.hypot(velocity[0]-previousVelocity[0],velocity[1]-previousVelocity[1])/STEP;
    assert(acceleration<=HAND_ACCELERATION+1e-8, 'Pointer update caused an impulsive start or stop');
    previousVelocity=velocity;
    peakSpeed=Math.max(peakSpeed,Math.hypot(...velocity));
    peakMiddle=Math.max(peakMiddle,Math.abs(state[2*Math.round(p.segments/2)+1]-ANCHOR[1]));
    if(k%100===0) for(let i=1;i<p.segments;i++) {
      const ax=state[2*i]-state[2*i-2], ay=state[2*i+1]-state[2*i-1];
      const bx=state[2*i+2]-state[2*i], by=state[2*i+3]-state[2*i+1];
      peakTurn=Math.max(peakTurn,Math.abs(Math.atan2(ax*by-ay*bx,ax*bx+ay*by)));
    }
  }
  assert(peakSpeed<0.8, `Gentle drag accelerated to ${peakSpeed} m/s`);
  assert(peakSpeed>0.4, 'Hand smoothing suppressed the intended motion');
  assert(peakTurn<0.012, `Sampled drag produced sharp ripples: ${peakTurn} rad`);
  assert(peakMiddle>0.01,
    'The intended broad wave must still travel into the string');
  console.log(`PASS ${samplesPerSecond} samples/s: peak hand speed ${peakSpeed.toFixed(3)} m/s, maximum turn ${peakTurn.toFixed(4)} rad; acceleration bounded and wave retained`);
}
