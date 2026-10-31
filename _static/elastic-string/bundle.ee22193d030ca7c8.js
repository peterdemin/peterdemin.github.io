(() => {
'use strict';
try {
const SEGMENTS = 80;
const LENGTH = 4;
const DENSITY = 0.02;
const AXIAL = 100;
const VISCOSITY_AREA = 30;
const BENDING = 0.0001;
const BENDING_DAMPING = 0.00001; // N m² s: independent effective bending friction.
const GRAVITY = 9.81;
const STEP = 0.0001;
const FRAME_BUDGET_MS = 8;
const ANCHOR = [-0.4 * LENGTH, 0.65 * LENGTH];
const HAND_REACH = 1.15 * LENGTH;
const HAND_SPEED = 1.5 * LENGTH;
const HAND_RESPONSE = 0.015; // s: smooth discrete pointer samples.
const HAND_ACCELERATION = 100; // m/s²: bounded hand motion.

// State: all (x,y) positions followed by all (vx,vy) velocities.
function parameters(overrides = {}) {
  const p = {segments: SEGMENTS, length: LENGTH, density: DENSITY, axial: AXIAL,
    viscosityArea: VISCOSITY_AREA, bending: BENDING, bendingDamping: BENDING_DAMPING,
    gravity: GRAVITY, ...overrides};
  p.spacing = p.length / p.segments;
  p.size = 2 * (p.segments + 1);
  p.mass = Float64Array.from({length: p.segments + 1}, (_, i) =>
    p.density * p.spacing * (i === 0 || i === p.segments ? 0.5 : 1));
  p.inverseMass = Float64Array.from(p.mass, mass => 1 / mass);
  return p;
}

function internalForces(state, p, force = new Float64Array(p.size)) {
  force.fill(0);
  const velocity = p.size;
  for (let i = 0; i < p.segments; i++) {
    const j = 2 * i;
    const dx = state[j + 2] - state[j], dy = state[j + 3] - state[j + 1];
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length <= p.spacing) continue;
    const nx = dx / length, ny = dy / length;
    const rate = (state[velocity + j + 2] - state[velocity + j]) * nx
      + (state[velocity + j + 3] - state[velocity + j + 1]) * ny;
    const tension = Math.max(0,
      (p.axial * (length - p.spacing) + p.viscosityArea * rate) / p.spacing);
    force[j] += tension * nx;
    force[j + 1] += tension * ny;
    force[j + 2] -= tension * nx;
    force[j + 3] -= tension * ny;
  }
  for (let i = 1; i < p.segments; i++) {
    const j = 2 * i;
    const ax = state[j] - state[j - 2], ay = state[j + 1] - state[j - 1];
    const bx = state[j + 2] - state[j], by = state[j + 3] - state[j + 1];
    const la = Math.sqrt(ax * ax + ay * ay), lb = Math.sqrt(bx * bx + by * by);
    if (la < 1e-12 || lb < 1e-12) continue;
    // Manufactured-length constraints keep these angle gradients resolved.
    const theta = Math.atan2(ax * by - ay * bx, ax * bx + ay * by);
    const gx = -ay / (la * la), gy = ax / (la * la);
    const hx = -by / (lb * lb), hy = bx / (lb * lb);
    const rate = gx * state[velocity + j - 2] + gy * state[velocity + j - 1]
      - (gx + hx) * state[velocity + j] - (gy + hy) * state[velocity + j + 1]
      + hx * state[velocity + j + 2] + hy * state[velocity + j + 3];
    const moment = (p.bending * theta + p.bendingDamping * rate) / p.spacing;
    force[j - 2] -= moment * gx;
    force[j - 1] -= moment * gy;
    force[j] += moment * (gx + hx);
    force[j + 1] += moment * (gy + hy);
    force[j + 2] -= moment * hx;
    force[j + 3] -= moment * hy;
  }
  return force;
}

// Pure rate function. The hand prescribes endpoint velocity while held.
function rateFunction(state, p, held = false, out = new Float64Array(state.length), force = new Float64Array(p.size)) {
  internalForces(state, p, force);
  for (let i = 0; i <= p.segments; i++) {
    const j = 2 * i;
    out[j] = state[p.size + j];
    out[j + 1] = state[p.size + j + 1];
    out[p.size + j] = force[j] / p.mass[i];
    out[p.size + j + 1] = force[j + 1] / p.mass[i] - p.gravity;
  }
  out[0] = out[1] = out[p.size] = out[p.size + 1] = 0;
  if (held) out[2 * p.size - 2] = out[2 * p.size - 1] = 0;
  return out;
}

function mechanicalEnergy(state, p) {
  let energy = 0;
  for (let i = 0; i <= p.segments; i++) {
    const j = 2 * i;
    energy += 0.5 * p.mass[i] * (state[p.size + j] ** 2 + state[p.size + j + 1] ** 2)
      + p.mass[i] * p.gravity * state[j + 1];
    if (i === p.segments) continue;
    const dx = state[j + 2] - state[j], dy = state[j + 3] - state[j + 1];
    energy += 0.5 * p.axial / p.spacing * Math.max(Math.hypot(dx, dy) - p.spacing, 0) ** 2;
    if (i === 0) continue;
    const ax = state[j] - state[j - 2], ay = state[j + 1] - state[j - 1];
    if (Math.hypot(ax, ay) < 1e-12 || Math.hypot(dx, dy) < 1e-12) continue;
    const theta = Math.atan2(ax * dy - ay * dx, ax * dx + ay * dy);
    energy += 0.5 * p.bending / p.spacing * theta ** 2;
  }
  return energy;
}

class ElasticString {
  constructor(overrides = {}) {
    this.p = parameters(overrides);
    this.state = new Float64Array(2 * this.p.size);
    this.stepSnapshot = new Float64Array(this.state.length);
    this.reset();
  }

  reset() {
    this.state.fill(0);
    for(let i=0;i<=this.p.segments;i++) {
      this.state[2*i]=ANCHOR[0]+this.p.length*i/this.p.segments;
      this.state[2*i+1]=ANCHOR[1];
    }
    this.held = true;
    this.target = this.endpoint;
    this.time = 0;
    this.accumulator = 0;
  }

  get endpoint() { return [this.state[this.p.size - 2], this.state[this.p.size - 1]]; }

  grab() { this.held = true; this.target = this.endpoint; }

  move(point) {
    if (!this.held) return;
    const dx = point[0] - ANCHOR[0], dy = point[1] - ANCHOR[1];
    const scale = Math.min(1, HAND_REACH / Math.max(Math.hypot(dx, dy), 1e-12));
    this.target = [ANCHOR[0] + dx * scale, ANCHOR[1] + dy * scale];
  }

  release() {
    this.held = false;
    this.state[2 * this.p.size - 2] = this.state[2 * this.p.size - 1] = 0;
  }

  step(h = STEP, shouldYield = () => false) {
    // Resolve motion geometrically as well as solving stiff friction. A fast
    // drag must not move a node across a substantial fraction of one link.
    const limit=0.01*this.p.spacing;
    let remaining=h;
    while(remaining>h*1e-12) {
      let speedSquared=0;
      for(let i=0;i<this.p.size;i+=2) {
        const vx=this.state[this.p.size+i],vy=this.state[this.p.size+i+1];
        speedSquared=Math.max(speedSquared,vx*vx+vy*vy);
      }
      // Leave room for acceleration and contour corrections. A proposal
      // exactly at the limit otherwise causes a predictable solve-and-retry.
      let part=Math.min(remaining,0.9*limit/Math.max(Math.sqrt(speedSquared),1e-12));
      const before=this.stepSnapshot;
      before.set(this.state);
      for(let attempt=0;;attempt++) {
        this.substep(part);
        let movementSquared=0;
        for(let i=0;i<this.p.size;i+=2) {
          const dx=this.state[i]-before[i],dy=this.state[i+1]-before[i+1];
          movementSquared=Math.max(movementSquared,dx*dx+dy*dy);
        }
        if(movementSquared<=(limit*(1+1e-6))**2)break;
        this.state.set(before);
        if(attempt>=20)throw new Error('Could not resolve the string motion.');
        part*=0.5;
      }
      this.time+=part;
      remaining-=part;
      // A frame may stop after an accepted adaptive substep. Never interrupt
      // a solve or leave a rejected trial in the state.
      if (shouldYield()) break;
    }
    return h-remaining;
  }

  substep(h) {
    const end = this.p.size - 2;
    if (this.held) {
      const dx = this.target[0] - this.state[end], dy = this.target[1] - this.state[end + 1];
      const vx = this.state[this.p.size + end], vy = this.state[this.p.size + end + 1];
      // A critically damped hand follows pointer samples without turning each
      // small pointer jump into a full-speed start and stop.
      const omega = 1 / HAND_RESPONSE;
      const ax = omega * omega * dx - 2 * omega * vx;
      const ay = omega * omega * dy - 2 * omega * vy;
      const accelerationScale = Math.min(1, HAND_ACCELERATION / Math.max(Math.hypot(ax, ay), 1e-12));
      const nextVx = vx + h * accelerationScale * ax, nextVy = vy + h * accelerationScale * ay;
      const speedScale = Math.min(1, HAND_SPEED / Math.max(Math.hypot(nextVx, nextVy), 1e-12));
      this.state[this.p.size + end] = nextVx * speedScale;
      this.state[this.p.size + end + 1] = nextVy * speedScale;
    }
    // First-order Euler: implicit material friction at the old geometry,
    // then positions advance with the solved velocities.
    solveMaterialVelocity(this.state,this.p,this.held,h);
    for(let i=0;i<this.p.size;i++)this.state[i]+=h*this.state[this.p.size+i];
    this.projectContour();
  }

  projectContour() {
    const p = this.p, state = this.state;
    // Slack is a change of shape, not a loss of manufactured contour length.
    // Correct shortened links geometrically; store no compression energy.
    for (let sweep = 0; sweep < 2; sweep++) {
      for (let k = 0; k < p.segments; k++) {
        const i = sweep % 2 ? k : p.segments - 1 - k, j = 2 * i;
        const dx = state[j + 2] - state[j], dy = state[j + 3] - state[j + 1];
        const length = Math.sqrt(dx * dx + dy * dy);
        if (length > p.spacing * (1 + 1e-6)) continue;
        const wi = i === 0 ? 0 : p.inverseMass[i];
        const wj = this.held && i + 1 === p.segments ? 0 : p.inverseMass[i + 1];
        if (wi + wj === 0) continue;
        const nx = length > 1e-12 ? dx / length : 1;
        const ny = length > 1e-12 ? dy / length : 0;
        const correction = Math.max(0, p.spacing - length) / (wi + wj);
        const ax = -wi * correction * nx, ay = -wi * correction * ny;
        const bx = wj * correction * nx, by = wj * correction * ny;
        state[j] += ax; state[j + 1] += ay;
        state[j + 2] += bx; state[j + 3] += by;
        // Remove closing velocity with an inelastic impulse. Position repair
        // alone must not be converted into a rebound velocity.
        const closing = (state[p.size+j+2]-state[p.size+j])*nx
          +(state[p.size+j+3]-state[p.size+j+1])*ny;
        const impulse = Math.max(0,-closing)/(wi+wj);
        state[p.size+j] -= wi*impulse*nx; state[p.size+j+1] -= wi*impulse*ny;
        state[p.size+j+2] += wj*impulse*nx; state[p.size+j+3] += wj*impulse*ny;
      }
    }
  }

  advanceFrame(seconds, now = () => performance.now()) {
    this.accumulator += Math.min(Math.max(seconds, 0), 0.05);
    const deadline = now() + FRAME_BUDGET_MS;
    const shouldYield = () => now() >= deadline;
    while (this.accumulator >= STEP && !shouldYield()) {
      this.accumulator -= this.step(STEP, shouldYield);
    }
    // Discard overdue wall time instead of creating a catch-up feedback loop.
    // Numerical step sizes and material coefficients do not depend on the budget.
    if (this.accumulator >= STEP) this.accumulator %= STEP;
    if (!this.state.every(Number.isFinite)) throw new Error('The calculation became unstable. Reset the string to continue.');
  }

  maxStrain() {
    let value = 0;
    for (let i = 0; i < this.p.segments; i++) value = Math.max(value,
      Math.hypot(this.state[2*i+2] - this.state[2*i], this.state[2*i+3] - this.state[2*i+1]) / this.p.spacing - 1);
    return value;
  }
}

// Lower symmetric band, five coordinates below the diagonal. The first five
// rows handle the edge; interior rows use the fixed bandwidth without loops.
function solveBand(matrix, rhs, size) {
  for (let i=0;i<Math.min(5,size);i++) {
    for (let j=0;j<=i;j++) {
      let value=matrix[i*6+i-j];
      for(let k=0;k<j;k++)value-=matrix[i*6+i-k]*matrix[j*6+j-k];
      matrix[i*6+i-j]=i===j?Math.sqrt(value):value/matrix[j*6];
    }
  }
  for(let i=5;i<size;i++) {
    const r=i*6;
    const a=matrix[r+5]/matrix[r-30];
    const b=(matrix[r+4]-a*matrix[r-23])/matrix[r-24];
    const c=(matrix[r+3]-a*matrix[r-16]-b*matrix[r-17])/matrix[r-18];
    const d=(matrix[r+2]-a*matrix[r-9]-b*matrix[r-10]-c*matrix[r-11])/matrix[r-12];
    const e=(matrix[r+1]-a*matrix[r-2]-b*matrix[r-3]-c*matrix[r-4]-d*matrix[r-5])/matrix[r-6];
    matrix[r+5]=a;matrix[r+4]=b;matrix[r+3]=c;matrix[r+2]=d;matrix[r+1]=e;
    matrix[r]=Math.sqrt(matrix[r]-a*a-b*b-c*c-d*d-e*e);
  }
  // Solve in place; rhs is scratch storage rather than a new result array.
  for(let i=0;i<size;i++) {
    const r=i*6;
    let value=rhs[i];
    if(i>=5) {
      value-=matrix[r+5]*rhs[i-5];value-=matrix[r+4]*rhs[i-4];
      value-=matrix[r+3]*rhs[i-3];value-=matrix[r+2]*rhs[i-2];value-=matrix[r+1]*rhs[i-1];
    } else for(let j=0;j<i;j++)value-=matrix[r+i-j]*rhs[j];
    rhs[i]=value/matrix[r];
  }
  for(let i=size-1;i>=0;i--) {
    const r=i*6;
    let value=rhs[i];
    if(i+5<size) {
      value-=matrix[r+7]*rhs[i+1];value-=matrix[r+14]*rhs[i+2];
      value-=matrix[r+21]*rhs[i+3];value-=matrix[r+28]*rhs[i+4];value-=matrix[r+35]*rhs[i+5];
    } else for(let j=i+1;j<size;j++)value-=matrix[j*6+j-i]*rhs[j];
    rhs[i]=value/matrix[r];
  }
  return rhs;
}

// Geometry changes every substep, but its storage can be reused. Keeping a
// workspace per parameter object also supports independent string instances.
const materialWorkspaces = new WeakMap();
function materialWorkspace(p) {
  let w=materialWorkspaces.get(p);
  if(w)return w;
  const vector=()=>new Float64Array(p.size);
  w={matrix:new Float64Array(p.size*6),baseMatrix:new Float64Array(p.size*6),
    rhs:vector(),baseRhs:vector(),old:vector(),current:vector(),trial:vector(),
    flags:new Uint8Array(2*p.segments-1),terms:[]};
  for(let t=0;t<2*p.segments-1;t++) {
    const axial=t<p.segments;
    w.terms.push({start:axial?2*t:2*(t-p.segments),g:new Array(axial?4:6).fill(0),
      enabled:false,elastic:0,damping:0,unilateral:axial});
  }
  materialWorkspaces.set(p,w);
  return w;
}
function materialRate(term,v) {
  const {start,g}=term;
  let rate=g[0]*v[start]+g[1]*v[start+1]+g[2]*v[start+2]+g[3]*v[start+3];
  if(g.length===6){rate+=g[4]*v[start+4];rate+=g[5]*v[start+5];}
  return rate;
}
function materialActive(term,v) {
  return term.enabled&&(!term.unilateral||term.damping===0||term.elastic+term.damping*materialRate(term,v)>0);
}
function addMaterialTerm(matrix,rhs,term,h) {
  const {start,g,elastic,damping}=term;
  for(let a=0;a<g.length;a++) {
    const i=start+a, row=i*6+a, scale=h*damping*g[a];
    rhs[i]-=h*elastic*g[a];
    for(let b=0;b<=a;b++)matrix[row-b]+=scale*g[b];
  }
}
function prescribeVelocity(matrix,rhs,old,size,i) {
  // Only the five neighboring coordinates can couple to this support.
  for(let j=Math.max(0,i-5);j<i;j++) {
    const index=i*6+i-j;rhs[j]-=matrix[index]*old[i];matrix[index]=0;
  }
  for(let j=i+1;j<Math.min(size,i+6);j++) {
    const index=j*6+j-i;rhs[j]-=matrix[index]*old[i];matrix[index]=0;
  }
  matrix[i*6]=1;rhs[i]=old[i];
}

function solveMaterialVelocity(state,p,held,h) {
  const size=p.size,w=materialWorkspace(p);
  const {terms,old,matrix,rhs,baseMatrix,baseRhs,flags}=w;
  // Each material term has force -(elastic + damping * g·v) * g.
  // Tensile terms are clamped to zero; bends act in either direction.
  for(let i=0;i<p.segments;i++) {
    const term=terms[i],j=2*i,dx=state[j+2]-state[j],dy=state[j+3]-state[j+1],length=Math.hypot(dx,dy);
    term.enabled=length>p.spacing;
    if(!term.enabled)continue;
    const nx=dx/length,ny=dy/length,g=term.g;
    g[0]=-nx;g[1]=-ny;g[2]=nx;g[3]=ny;
    term.elastic=p.axial*(length-p.spacing)/p.spacing;
    term.damping=p.viscosityArea/p.spacing;
  }
  for(let i=1;i<p.segments;i++) {
    const term=terms[p.segments+i-1],j=2*i;
    const ax=state[j]-state[j-2],ay=state[j+1]-state[j-1],bx=state[j+2]-state[j],by=state[j+3]-state[j+1];
    const aa=ax*ax+ay*ay,bb=bx*bx+by*by;
    term.enabled=Math.min(aa,bb)>=1e-24;
    if(!term.enabled)continue;
    const gx=-ay/aa,gy=ax/aa,hx=-by/bb,hy=bx/bb,g=term.g;
    g[0]=gx;g[1]=gy;g[2]=-gx-hx;g[3]=-gy-hy;g[4]=hx;g[5]=hy;
    term.elastic=p.bending*Math.atan2(ax*by-ay*bx,ax*bx+ay*by)/p.spacing;
    term.damping=p.bendingDamping/p.spacing;
  }
  old.set(state.subarray(size));old[0]=old[1]=0;
  function objective(v) {
    let result=0;
    for(let i=0;i<size;i++)result+=.5*p.mass[i>>1]*(v[i]-old[i])**2+(i%2?h*p.mass[i>>1]*p.gravity*v[i]:0);
    for(const term of terms) {
      if(!term.enabled)continue;
      const rate=materialRate(term,v),{elastic,damping}=term;
      result+=h*(term.unilateral&&damping>0?Math.max(0,elastic+damping*rate)**2/(2*damping):elastic*rate+.5*damping*rate*rate);
    }
    return result;
  }
  // Bending is always active. Assemble it once per substep; only tensile
  // contributions need rebuilding when Newton changes the taut/slack choice.
  baseMatrix.fill(0);
  for(let i=0;i<size;i++) {
    const mass=p.mass[i>>1];baseMatrix[i*6]=mass;baseRhs[i]=mass*(old[i]-(i%2?h*p.gravity:0));
  }
  for(let t=p.segments;t<terms.length;t++)if(terms[t].enabled)addMaterialTerm(baseMatrix,baseRhs,terms[t],h);
  let current=w.current,trial=w.trial;
  current.set(old);
  for(let iteration=0;iteration<40;iteration++) {
    matrix.set(baseMatrix);rhs.set(baseRhs);
    for(let t=0;t<p.segments;t++) {
      flags[t]=materialActive(terms[t],current)?1:0;
      if(flags[t])addMaterialTerm(matrix,rhs,terms[t],h);
    }
    prescribeVelocity(matrix,rhs,old,size,0);prescribeVelocity(matrix,rhs,old,size,1);
    if(held){prescribeVelocity(matrix,rhs,old,size,size-2);prescribeVelocity(matrix,rhs,old,size,size-1);}
    const candidate=solveBand(matrix,rhs,size);
    let consistent=true;
    for(let t=0;t<p.segments;t++)if(Boolean(flags[t])!==materialActive(terms[t],candidate)){consistent=false;break;}
    if(consistent){state.set(candidate,size);return iteration+1;}
    const cost=objective(current);
    let fraction=1;
    for(let backtrack=0;backtrack<24;backtrack++) {
      for(let i=0;i<size;i++)trial[i]=current[i]+fraction*(candidate[i]-current[i]);
      if(objective(trial)<=cost+1e-15)break;
      fraction*=.5;
    }
    let change=0;for(let i=0;i<size;i++)change=Math.max(change,Math.abs(trial[i]-current[i]));
    const swap=current;current=trial;trial=swap;
    if(change<1e-10){state.set(current,size);return iteration+1;}
  }
  throw new Error('Internal friction solve did not converge');
}

const canvas = document.querySelector('#scene');
const context = canvas.getContext('2d');
if (!context) throw new Error('Canvas 2D is unavailable.');
const simulation = new ElasticString();
const status = document.querySelector('#status');
const values = document.querySelector('#values');
const error = document.querySelector('#error');
const releaseButton = document.querySelector('#release');
const slowMotion = document.querySelector('#slow-motion');
let dark = matchMedia('(prefers-color-scheme: dark)').matches;
let pointer = null, offset = [0, 0], last = null, failed = false;

function view() {
  const rect = canvas.getBoundingClientRect();
  const scale = Math.min((rect.width - 48) / (2.5 * LENGTH), (rect.height - 48) / (1.5 * LENGTH));
  return {rect, scale, width: rect.width, height: rect.height,
    x: rect.width / 2 - ANCHOR[0] * scale,
    y: rect.height / 2 + (ANCHOR[1] - 0.5 * LENGTH) * scale};
}

function project(point, camera = view()) {
  return [camera.x + point[0] * camera.scale, camera.y - point[1] * camera.scale];
}

function world(event) {
  const c = view();
  return [(event.clientX - c.rect.left - c.x) / c.scale,
    (c.y - event.clientY + c.rect.top) / c.scale];
}

function draw() {
  const c = view();
  if (!c.width || !c.height) return;
  const ratio = Math.min(devicePixelRatio || 1, 2);
  if (canvas.width !== Math.round(c.width * ratio) || canvas.height !== Math.round(c.height * ratio)) {
    canvas.width = Math.round(c.width * ratio); canvas.height = Math.round(c.height * ratio);
  }
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.fillStyle = dark ? '#0c1725' : '#f1f5f7';
  context.fillRect(0, 0, c.width, c.height);
  const ink = dark ? '#a5b7c8' : '#4e657d';
  context.strokeStyle = dark ? '#1b2c3b' : '#dfe7ec';
  context.lineWidth = 1;
  const grid = LENGTH / 4;
  const left = -c.x / c.scale, right = (c.width - c.x) / c.scale;
  const bottom = (c.y - c.height) / c.scale, top = c.y / c.scale;
  for (let x = Math.ceil(left / grid) * grid; x <= right; x += grid) {
    context.beginPath(); context.moveTo(...project([x, bottom], c)); context.lineTo(...project([x, top], c)); context.stroke();
  }
  for (let y = Math.ceil(bottom / grid) * grid; y <= top; y += grid) {
    context.beginPath(); context.moveTo(...project([left, y], c)); context.lineTo(...project([right, y], c)); context.stroke();
  }
  const p = simulation.p, state = simulation.state;
  context.lineWidth = 4; context.lineJoin = 'round'; context.lineCap = 'round';
  context.strokeStyle = dark ? '#58bec3' : '#197d87';
  context.beginPath();
  for (let i = 0; i <= p.segments; i++) {
    const point = project([state[2*i], state[2*i+1]], c);
    if (i === 0) context.moveTo(...point); else context.lineTo(...point);
  }
  context.stroke();
  for (let i = 1; i < p.segments; i++) {
    const point = project([state[2*i], state[2*i+1]], c);
    context.fillStyle = dark ? '#9fdbd9' : '#479fa4';
    context.beginPath(); context.arc(...point, 2, 0, 2*Math.PI); context.fill();
  }
  const anchor = project(ANCHOR, c), end = project(simulation.endpoint, c);
  context.strokeStyle = ink; context.lineWidth = 2;
  context.beginPath(); context.moveTo(anchor[0]-20, anchor[1]-15); context.lineTo(anchor[0]+20, anchor[1]-15); context.stroke();
  for (let i = -20; i <= 20; i += 8) {
    context.beginPath(); context.moveTo(anchor[0]+i, anchor[1]-15); context.lineTo(anchor[0]+i+6, anchor[1]-23); context.stroke();
  }
  context.beginPath(); context.moveTo(anchor[0], anchor[1]-15); context.lineTo(...anchor); context.stroke();
  context.fillStyle = ink; context.beginPath(); context.arc(...anchor, 5, 0, 2*Math.PI); context.fill();
  context.strokeStyle = dark ? '#ffdfaa' : '#a55d27'; context.lineWidth = 1.5;
  context.setLineDash([4, 4]); context.beginPath(); context.arc(...end, 19, 0, 2*Math.PI); context.stroke(); context.setLineDash([]);
  context.fillStyle = ink; context.font = '12px system-ui, sans-serif'; context.textAlign = 'center';
  context.fillText('Fixed', anchor[0], anchor[1]-31);
  context.fillText(simulation.held ? 'Held · drag me' : 'Free end · grab me',
    Math.max(70, Math.min(c.width-70, end[0])), Math.max(16, Math.min(c.height-10, end[1]-28)));
  const scaleX = 20, scaleY = c.height-22;
  context.strokeStyle = ink; context.lineWidth = 1.5;
  context.beginPath(); context.moveTo(scaleX, scaleY-4); context.lineTo(scaleX, scaleY+4);
  context.moveTo(scaleX, scaleY); context.lineTo(scaleX + grid*c.scale, scaleY);
  context.moveTo(scaleX+grid*c.scale, scaleY-4); context.lineTo(scaleX+grid*c.scale, scaleY+4); context.stroke();
  context.textAlign = 'left'; context.fillText(`${grid} m`, scaleX+grid*c.scale+8, scaleY+4);
  canvas.style.cursor = pointer !== null ? 'grabbing' : 'grab';
  status.textContent = simulation.held ? 'Held — drag the orange end or press Let go.' : 'Released — gravity pulls the string down; the fixed end stays attached.';
  releaseButton.disabled = !simulation.held;
  values.textContent = `${LENGTH.toFixed(1)} m unstretched length · largest segment extension ${(100*simulation.maxStrain()).toFixed(1)}% · simulated time ${simulation.time.toFixed(2)} s`;
  canvas.dataset.endpoint = JSON.stringify(end);
  canvas.dataset.anchor = JSON.stringify(anchor);
  canvas.dataset.state = JSON.stringify(Array.from(state));
  canvas.dataset.held = simulation.held;
  canvas.dataset.time = simulation.time;
}

function release() {
  pointer = null;
  simulation.release();
  draw();
}
canvas.addEventListener('pointerdown', event => {
  if (pointer !== null || event.button !== 0 || failed) return;
  const c = view(), position = world(event), end = simulation.endpoint;
  if (Math.hypot(position[0]-end[0], position[1]-end[1])*c.scale > 30) return;
  pointer = event.pointerId; offset = [end[0]-position[0], end[1]-position[1]];
  simulation.grab();
  canvas.setPointerCapture(pointer); canvas.focus({preventScroll:true});
  event.preventDefault(); draw();
});
canvas.addEventListener('pointermove', event => {
  if (event.pointerId !== pointer) return;
  const point = world(event);
  simulation.move([point[0]+offset[0], point[1]+offset[1]]);
  event.preventDefault();
});
for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(name, event => {
  if (event.pointerId === pointer) release();
});
function reset() {
  pointer = null; simulation.reset(); last = null; failed = false;
  error.style.display = 'none'; draw();
}
document.querySelector('#reset').addEventListener('click', reset);
releaseButton.addEventListener('click', release);
slowMotion.addEventListener('change', () => {last = null; simulation.accumulator = 0;});
canvas.addEventListener('keydown', event => {
  if (event.code === 'Space') { if (simulation.held) release(); else simulation.grab(); }
  else if (event.code === 'Escape') release();
  else if (event.code === 'KeyR') reset();
  else if (simulation.held && ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.code)) {
    const move = {ArrowLeft:[-0.08,0],ArrowRight:[0.08,0],ArrowUp:[0,0.08],ArrowDown:[0,-0.08]}[event.code];
    simulation.move([simulation.target[0]+LENGTH*move[0],simulation.target[1]+LENGTH*move[1]]);
  } else return;
  event.preventDefault(); draw();
});

function frame(now) {
  if (!document.hidden && !failed) {
    try {
      const playback = slowMotion.checked ? 0.25 : 1;
      simulation.advanceFrame(last === null ? 0 : playback * (now-last)/1000);
      draw();
    } catch (failure) {
      failed = true; error.textContent = failure.message; error.style.display = 'flex';
      console.error(failure);
    }
  }
  last = document.hidden ? null : now;
  requestAnimationFrame(frame);
}
document.addEventListener('visibilitychange', () => {last = null; simulation.accumulator = 0;});
window.addEventListener('message', event => {
  if (event.source !== parent || event.data?.type !== 'elastic-string-theme') return;
  for (const name of ['background','text','border','font','button-hover']) {
    if (typeof event.data[name] === 'string' && event.data[name]) document.documentElement.style.setProperty('--book-'+name, event.data[name]);
  }
  dark = Boolean(event.data.dark); document.documentElement.style.colorScheme = dark ? 'dark' : 'light'; draw();
});
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {if(parent === window) {dark=event.matches;draw();}});
new ResizeObserver(() => {
  draw();
  parent.postMessage({type:'elastic-string-size',height:Math.ceil(document.querySelector('main').getBoundingClientRect().height)+2}, '*');
}).observe(document.querySelector('main'));
parent.postMessage({type:'elastic-string-ready'}, '*');
draw(); requestAnimationFrame(frame);
} catch (failure) {
  const error = document.querySelector('#error');
  error.textContent = 'The string could not start: ' + failure.message;
  error.style.display = 'flex';
  console.error(failure);
}
})();
