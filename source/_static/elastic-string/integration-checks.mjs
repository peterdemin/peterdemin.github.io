import assert from 'node:assert/strict';
import {ElasticString, ANCHOR, solveMaterialVelocity, rateFunction} from './physics.mjs';

// Check the nonlinear implicit equation against the separately implemented
// continuous rate function, including stretched links that unload to zero tension.
for(const segments of [1,2,6,32,160])for(const held of [false,true])for(const scale of [0.03,3]) {
  const string=new ElasticString({segments,length:1});
  const {p,state}=string;
  for(let i=0;i<=p.segments;i++) {
    state[2*i]=ANCHOR[0]+1.02*p.spacing*i;
    state[2*i+1]=ANCHOR[1]+0.01*Math.sin(i);
    state[p.size+2*i]=scale*Math.sin(i*1.7);
    state[p.size+2*i+1]=scale*Math.sin(i*2.3);
  }
  state[p.size]=state[p.size+1]=0;
  const before=state.slice(),h=0.0003;
  solveMaterialVelocity(state,p,held,h);
  const rates=rateFunction(state,p,held);
  let residual=0;
  for(let i=1;i<=p.segments;i++) {
    if(held&&i===p.segments)continue;
    for(let d=0;d<2;d++) {
      const j=p.size+2*i+d;
      residual=Math.max(residual,Math.abs(state[j]-before[j]-h*rates[j]));
    }
  }
  assert(residual<1e-8,`Implicit rate-function residual: ${residual}`);
  assert.deepEqual(state.slice(0,p.size),before.slice(0,p.size));
  if(held)assert.deepEqual(state.slice(-2),before.slice(-2));
}
console.log('PASS implicit velocity equation matches the rate function, including tension clamping and prescribed velocities');

// Friction removes kinetic energy at a fixed shape but leaves a rigid rotation
// about the support unchanged when there are no elastic or gravitational forces.
for(const rigid of [false,true]) {
  const string=new ElasticString({segments:8,length:1,gravity:0,axial:0,bending:0});
  const {p,state}=string;
  for(let i=0;i<=p.segments;i++) {
    state[2*i]=ANCHOR[0]+1.03*p.spacing*i;
    state[2*i+1]=ANCHOR[1]+0.02*Math.sin(i);
    state[p.size+2*i]=rigid?-(state[2*i+1]-ANCHOR[1]):0.2*Math.sin(i);
    state[p.size+2*i+1]=rigid?state[2*i]-ANCHOR[0]:0.3*Math.sin(2*i);
  }
  const before=state.slice(p.size);
  const kinetic=()=>p.mass.reduce((sum,m,i)=>sum+0.5*m*(state[p.size+2*i]**2+state[p.size+2*i+1]**2),0);
  const initial=kinetic();
  solveMaterialVelocity(state,p,false,0.01);
  if(rigid)assert(Math.max(...before.map((v,i)=>Math.abs(v-state[p.size+i])))<1e-9);
  else assert(kinetic()<initial);
}
console.log('PASS implicit material friction dissipates deformation and preserves rigid rotation');

// Reuse one workspace while geometry switches between shortened, stretched,
// and bent links. Disabled terms must not retain a previous contribution.
const reused=new ElasticString({segments:6,length:1});
for(const fraction of [1.02,0.7,1.01,0.9,1.02])for(const held of [false,true]) {
  for(let i=0;i<=reused.p.segments;i++) {
    reused.state[2*i]=ANCHOR[0]+fraction*reused.p.spacing*i;
    reused.state[2*i+1]=ANCHOR[1]+0.01*Math.sin(i);
    reused.state[reused.p.size+2*i]=0.03*Math.sin(i);
    reused.state[reused.p.size+2*i+1]=0.04*Math.cos(i);
  }
  const fresh=new ElasticString({segments:6,length:1});
  fresh.state.set(reused.state);
  solveMaterialVelocity(reused.state,reused.p,held,0.0001);
  solveMaterialVelocity(fresh.state,fresh.p,held,0.0001);
  assert.deepEqual(reused.state,fresh.state);
}
console.log('PASS workspace reuse across changing geometry and prescribed boundaries');
