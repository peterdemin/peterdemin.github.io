import assert from 'node:assert/strict';
import {WindTunnel, advanceTracer, tracerSegmentBlocked, VISCOSITY} from './flow.mjs';

function close(actual, expected, tolerance=1e-8) {
  assert(Math.abs(actual-expected)<=tolerance,`${actual} != ${expected}`);
}
function empty(options={}) {
  const flow=new WindTunnel({columns:64,rows:32,...options});
  flow.fluid.fill(1);
  flow.buildDiagonal();
  flow.u.fill(1);
  flow.v.fill(0);
  flow.pressure.fill(0);
  return flow;
}

const uniform=empty();
for(let iteration=0;iteration<20;iteration++)uniform.step();
for(const value of uniform.u)close(value,1);
for(const value of uniform.v)close(value,0);
console.log('PASS uniform unobstructed flow remains exactly uniform');

const interpolation=empty();
for(let row=0;row<interpolation.rows;row++)for(let column=0;column<=interpolation.columns;column++)interpolation.u[row*(interpolation.columns+1)+column]=1+0.2*column*interpolation.spacing-0.1*(row+0.5)*interpolation.spacing;
for(let row=0;row<=interpolation.rows;row++)for(let column=0;column<interpolation.columns;column++)interpolation.v[row*interpolation.columns+column]=-0.3*(column+0.5)*interpolation.spacing+0.4*row*interpolation.spacing;
const sampled=interpolation.sample(2.37,1.23);
close(sampled[0],1+0.2*2.37-0.1*1.23);
close(sampled[1],-0.3*2.37+0.4*1.23);
const masked=new WindTunnel({columns:96,rows:48,angle:0});
assert(tracerSegmentBlocked(masked,[2.4,1.35,0],[2.4,1.5,0]));
assert(!tracerSegmentBlocked(masked,[2.4,2.2,0],[2.5,2.2,0]));
console.log('PASS bilinear staggered sampling reproduces linear fields; actual tracer mask checks retire penetrating segments');

const advection=empty({viscosity:0});
for(let row=0;row<advection.rows;row++)for(let column=0;column<=advection.columns;column++)advection.u[row*(advection.columns+1)+column]=1+0.1*column*advection.spacing;
const before=advection.u[12*(advection.columns+1)+20];
advection.predict(0.01);
close(advection.u[12*(advection.columns+1)+20],before-0.01*before*0.1);
const diffusion=empty();
for(let row=0;row<diffusion.rows;row++)for(let column=0;column<=diffusion.columns;column++)diffusion.u[row*(diffusion.columns+1)+column]=1+0.1*((row+0.5)*diffusion.spacing)**2;
const initial=diffusion.u[12*(diffusion.columns+1)+20];
diffusion.predict(0.01);
close(diffusion.u[12*(diffusion.columns+1)+20],initial+0.01*VISCOSITY*0.2);
console.log('PASS predictor matches analytic upwind transport and quadratic-profile viscous acceleration');

const projected=new WindTunnel({columns:64,rows:32});
const first=projected.pressure.map((value,index)=>Math.sin(index*0.13));
const second=projected.pressure.map((value,index)=>Math.cos(index*0.23));
for(let index=0;index<first.length;index++)if(!projected.fluid[index]){first[index]=0;second[index]=0;}
const productFirst=first.slice();
const productSecond=second.slice();
projected.multiply(first,productFirst);
projected.multiply(second,productSecond);
const dot=(left,right)=>left.reduce((sum,value,index)=>sum+value*right[index],0);
close(dot(first,productSecond),dot(second,productFirst),1e-9);
assert(dot(first,productFirst)>0);
for(let row=0;row<projected.rows;row++)for(let column=1;column<projected.columns;column++)if(projected.openU(column,row))projected.u[row*(projected.columns+1)+column]+=0.2*Math.sin(column*0.8+row*0.4);
const provisional=projected.diagnostics().divergence;
projected.project(0.01);
const corrected=projected.diagnostics();
assert(provisional>1);
assert(corrected.divergence<2e-5);
close(corrected.blockedVelocity,0,0);
assert(Math.abs(corrected.inlet-corrected.outlet)<2e-5*projected.width*projected.height);
console.log(`PASS symmetric positive pressure operator; divergence ${provisional.toFixed(2)} → ${corrected.divergence.toExponential(2)} /s; blocked face flux exactly zero`);

const positive=new WindTunnel({columns:64,rows:32,angle:12});
const negative=new WindTunnel({columns:64,rows:32,angle:-12});
for(let iteration=0;iteration<160;iteration++){positive.step();negative.step();}
let reflectionError=0;
for(let row=0;row<positive.rows;row++)for(let column=0;column<=positive.columns;column++)reflectionError=Math.max(reflectionError,Math.abs(positive.u[row*(positive.columns+1)+column]-negative.u[(positive.rows-1-row)*(positive.columns+1)+column]));
for(let row=0;row<=positive.rows;row++)for(let column=0;column<positive.columns;column++)reflectionError=Math.max(reflectionError,Math.abs(positive.v[row*positive.columns+column]+negative.v[(positive.rows-row)*positive.columns+column]));
assert(reflectionError<2e-5,`angle reflection error ${reflectionError}`);
assert(Math.abs(positive.sample(3.5,1.5)[1])>0.015);
console.log(`PASS ±12° wing reflection symmetry (${reflectionError.toExponential(2)}), calculated cross-flow, finite stable viscous evolution`);

for(const [columns,rows] of [[64,32],[96,48],[128,64]]) {
  const flow=new WindTunnel({columns,rows,angle:15});
  while(flow.time<0.84-1e-10){
    const step=flow.step(0.84-flow.time);
    assert(step>0&&step<=0.012);
    for(const value of flow.u)assert(Number.isFinite(value));
    for(const value of flow.v)assert(Number.isFinite(value));
  }
  assert(flow.diagnostics().divergence<2e-5);
  close(flow.diagnostics().blockedVelocity,0,0);
  close(flow.time,0.84);
  console.log(`GRID ${columns}×${rows} at 0.84 s: h=${flow.spacing.toFixed(4)} m, cross-flow=${flow.sample(3.5,1.5)[1].toFixed(4)} m/s (resolution comparison, not convergence certification)`);
}

for(const angle of [0,8,15]){
  const flow=new WindTunnel({columns:96,rows:48,angle});
  while(flow.time<6-1e-10)flow.step(6-flow.time);
  let minimum=Infinity;
  let reversed=0;
  for(let row=0;row<flow.rows;row++)for(let column=0;column<=flow.columns;column++)if(flow.openU(column,row)&&column*flow.spacing>2.4){
    const velocity=flow.u[row*(flow.columns+1)+column];
    minimum=Math.min(minimum,velocity);
    if(velocity<-.005)reversed++;
  }
  assert(flow.diagnostics().divergence<2e-5);
  if(angle===0||angle===8)assert(reversed===0);
  if(angle===15)assert(reversed>0&&minimum<-.005&&minimum>-.02);
  console.log(`WAKE ${angle}° at 6 s, x>2.4 m: minimum horizontal speed ${minimum.toFixed(5)} m/s, ${reversed} faces below -0.005 m/s; no turbulence/stall validation`);
}

const constant=()=>[2,-0.5];
assert.deepEqual(advanceTracer([1,2,0.8],0.2,constant,constant),[1.4,1.9,0.8]);
const rotational=(x,y)=>[-y,x];
const errors=[];
for(const step of [0.1,0.05,0.025]) {
  let position=[1,0,0.3];
  for(let iteration=0;iteration<Math.round(1/step);iteration++)position=advanceTracer(position,step,rotational,rotational);
  errors.push(Math.hypot(position[0]-Math.cos(1),position[1]-Math.sin(1)));
  close(position[2],0.3,0);
}
assert(errors[0]/errors[1]>3.8&&errors[1]/errors[2]>3.8);
const timedBefore=()=>[1,0];
const timedAfter=()=>[1.2,0];
close(advanceTracer([0,0,0],0.2,timedBefore,timedAfter)[0],0.22);
console.log('PASS passive midpoint tracer: exact constant/time-linear flow, second-order rotational-path convergence, unchanged span coordinate');

positive.reset(-100);
close(positive.degrees,-45,0);
close(positive.time,0,0);
assert(positive.diagnostics().divergence<2e-5);
console.log('PASS reset and enforced angle range; no lift/stall or real-air accuracy claim');
