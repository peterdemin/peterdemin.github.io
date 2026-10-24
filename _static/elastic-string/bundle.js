(() => {
'use strict';
try {
const SEGMENTS = 80;
const LENGTH = 4;
const DENSITY = 0.02;
const AXIAL = 100;
const VISCOSITY_AREA = 0.1;
const BENDING = 0.01;
const BENDING_DAMPING = BENDING * VISCOSITY_AREA / AXIAL;
const SETTLING_DAMPING = 0.8; // 1/s: gentle artificial damping of the overall swing.
const GRAVITY = 9.81;
const STEP = 0.000005;
const ANCHOR = [-0.4 * LENGTH, 0.65 * LENGTH];
const HAND_REACH = 1.15 * LENGTH;
const HAND_SPEED = 1.5 * LENGTH;

// State: all (x,y) positions followed by all (vx,vy) velocities.
function parameters(overrides = {}) {
  const p = {segments: SEGMENTS, length: LENGTH, density: DENSITY, axial: AXIAL,
    viscosityArea: VISCOSITY_AREA, bending: BENDING, bendingDamping: BENDING_DAMPING,
    gravity: GRAVITY,
    settlingDamping: SETTLING_DAMPING, ...overrides};
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
    out[p.size + j] = force[j] / p.mass[i] - p.settlingDamping * state[p.size + j];
    out[p.size + j + 1] = force[j + 1] / p.mass[i] - p.gravity
      - p.settlingDamping * state[p.size + j + 1];
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
    this.rates = new Float64Array(this.state.length);
    this.forces = new Float64Array(this.p.size);
    this.reset();
  }

  reset() {
    this.state.fill(0);
    for (let i = 0; i <= this.p.segments; i++) {
      this.state[2 * i] = ANCHOR[0] + this.p.length * i / this.p.segments;
      this.state[2 * i + 1] = ANCHOR[1];
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

  step(h = STEP) {
    const end = this.p.size - 2;
    if (this.held) {
      const dx = this.target[0] - this.state[end], dy = this.target[1] - this.state[end + 1];
      const factor = Math.min(1 / h, HAND_SPEED / Math.max(Math.hypot(dx, dy), 1e-12));
      this.state[this.p.size + end] = dx * factor;
      this.state[this.p.size + end + 1] = dy * factor;
    }
    rateFunction(this.state, this.p, this.held, this.rates, this.forces);
    // Forward Euler: every derivative was evaluated before any state changes.
    for (let i = 0; i < this.state.length; i++) this.state[i] += h * this.rates[i];
    this.projectContour(h);
    this.time += h;
  }

  projectContour(h) {
    const p = this.p, state = this.state;
    // Slack is a change of shape, not a loss of manufactured contour length.
    // Correct shortened links geometrically; store no compression energy.
    for (let sweep = 0; sweep < 2; sweep++) {
      for (let k = 0; k < p.segments; k++) {
        const i = sweep % 2 ? k : p.segments - 1 - k, j = 2 * i;
        const dx = state[j + 2] - state[j], dy = state[j + 3] - state[j + 1];
        const length = Math.sqrt(dx * dx + dy * dy);
        if (length >= p.spacing * (1 - 1e-6)) continue;
        const wi = i === 0 ? 0 : p.inverseMass[i];
        const wj = this.held && i + 1 === p.segments ? 0 : p.inverseMass[i + 1];
        if (wi + wj === 0) continue;
        const nx = length > 1e-12 ? dx / length : 1;
        const ny = length > 1e-12 ? dy / length : 0;
        const correction = (p.spacing - length) / (wi + wj);
        const ax = -wi * correction * nx, ay = -wi * correction * ny;
        const bx = wj * correction * nx, by = wj * correction * ny;
        state[j] += ax; state[j + 1] += ay;
        state[j + 2] += bx; state[j + 3] += by;
        // Constraint impulses must update velocities as well as positions.
        state[p.size + j] += ax / h; state[p.size + j + 1] += ay / h;
        state[p.size + j + 2] += bx / h; state[p.size + j + 3] += by / h;
      }
    }
  }

  advanceFrame(seconds) {
    this.accumulator += Math.min(Math.max(seconds, 0), 0.05);
    const ticks = Math.min(6000, Math.floor(this.accumulator / STEP));
    for (let i = 0; i < ticks; i++) this.step();
    this.accumulator -= ticks * STEP;
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
  context.fillStyle = '#e9944e'; context.beginPath(); context.arc(...end, 9, 0, 2*Math.PI); context.fill();
  context.strokeStyle = dark ? '#ffdfaa' : '#a55d27'; context.lineWidth = 1.5; context.stroke();
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
  values.textContent = `${LENGTH.toFixed(1)} m unstretched length · largest segment extension ${(100*simulation.maxStrain()).toFixed(1)}% · settling damping ${p.settlingDamping.toFixed(1)}/s · simulated time ${simulation.time.toFixed(2)} s`;
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
