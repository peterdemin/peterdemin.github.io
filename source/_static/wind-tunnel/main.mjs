import {WindTunnel, advanceTracer, tracerSegmentBlocked} from './flow.mjs';
import {buildWingMesh} from './wing.mjs';
import {pressureLoads, pressureColor, pressureField} from './loads.mjs';

const canvas = document.querySelector('#scene');
const angle = document.querySelector('#angle');
const angleValue = document.querySelector('#angle-value');
const pause = document.querySelector('#pause');
const status = document.querySelector('#status');
const error = document.querySelector('#error');
const showPressure = document.querySelector('#show-pressure');
const showForces = document.querySelector('#show-forces');
const showSurface = document.querySelector('#show-surface');
const pressureLegend = document.querySelector('#pressure-legend');
const forceValues = document.querySelector('#force-values');
const scaleValues = document.querySelector('#scale-values');
const flow = new WindTunnel({columns: 96, rows: 48});
const gl = canvas.getContext('webgl', {antialias: true, alpha: false});
if (!gl) throw new Error('WebGL is unavailable. Try a browser with hardware acceleration enabled.');

if (parent !== window) {
  window.addEventListener('message', event => {
    if (event.source !== parent || event.data?.type !== 'wind-tunnel-theme') return;
    for (const name of ['background', 'text', 'border', 'button-hover', 'font']) {
      if (typeof event.data[name] === 'string') document.documentElement.style.setProperty('--book-' + name, event.data[name]);
    }
    document.documentElement.style.colorScheme = event.data.dark ? 'dark' : 'light';
  });
  parent.postMessage({type: 'wind-tunnel-ready'}, '*');
  const resize = new ResizeObserver(() => {
    parent.postMessage({type: 'wind-tunnel-size', height: Math.ceil(document.querySelector('main').getBoundingClientRect().height) + 2}, '*');
  });
  resize.observe(document.querySelector('main'));
}

function shader(type, source) {
  const result = gl.createShader(type);
  gl.shaderSource(result, source);
  gl.compileShader(result);
  if (!gl.getShaderParameter(result, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(result));
  return result;
}
const program = gl.createProgram();
gl.attachShader(program, shader(gl.VERTEX_SHADER, 'attribute vec3 position; attribute vec4 color; uniform mat4 camera; varying vec4 pigment; void main(){gl_Position=camera*vec4(position,1.0);pigment=color;gl_PointSize=3.0;}'));
gl.attachShader(program, shader(gl.FRAGMENT_SHADER, 'precision mediump float; varying vec4 pigment; void main(){gl_FragColor=pigment;}'));
gl.linkProgram(program);
if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
gl.useProgram(program);
const buffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
for (const [name, size, offset] of [['position', 3, 0], ['color', 4, 12]]) {
  const location = gl.getAttribLocation(program, name);
  gl.enableVertexAttribArray(location);
  gl.vertexAttribPointer(location, size, gl.FLOAT, false, 28, offset);
}
const cameraUniform = gl.getUniformLocation(program, 'camera');
gl.enable(gl.BLEND);
gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
gl.clearColor(0.032, 0.052, 0.08, 1);

let running = true;
let lastTime = 0;
let accumulator = 0;
let particles = [];
let wing = [];
let loads;
let field;
let forceArrows = [];
let surfaceArrows = [];

function vertex(output, position, color) { output.push(...position, ...color); }
function line(output, first, second, color) { vertex(output, first, color); vertex(output, second, color); }
function geometry() {
  wing = buildWingMesh(flow);
  updatePressure();
}

function arrow(output, origin, displacement, color) {
  const length = Math.hypot(...displacement);
  if (length < 1e-8) return;
  const end = [origin[0] + displacement[0], origin[1] + displacement[1], 0];
  const head = Math.min(0.10, length * 0.35);
  const along = displacement.map(value => value / length);
  line(output, origin, end, color);
  for (const side of [-1, 1]) line(output, end, [end[0] - head * along[0] - side * head * 0.5 * along[1], end[1] - head * along[1] + side * head * 0.5 * along[0], 0], color);
}

function number(value) { return value === 0 ? '0' : value.toPrecision(4); }

function updatePressure() {
  loads = pressureLoads(flow);
  field = pressureField(flow);
  forceArrows = [];
  surfaceArrows = [];
  const magnitude = Math.hypot(...loads.force);
  const forceScale = magnitude > 1e-8 ? 1 / magnitude : 0;
  const origin = [...flow.center, 0];
  arrow(forceArrows, origin, [loads.drag * forceScale, 0], [1, 0.48, 0.75, 1]);
  arrow(forceArrows, origin, [0, loads.lift * forceScale], [0.48, 1, 0.58, 1]);
  arrow(forceArrows, origin, loads.force.map(value => value * forceScale), [1, 0.94, 0.45, 1]);
  let maximumFaceForce = 1e-9;
  for (const face of loads.faces) maximumFaceForce = Math.max(maximumFaceForce, Math.hypot(...face.force));
  const surfaceScale = 0.22 / maximumFaceForce;
  for (const face of loads.faces) {
    const [normalX, normalY] = face.normal;
    const tangent = [-normalY * flow.spacing / 2, normalX * flow.spacing / 2];
    line(surfaceArrows, [face.position[0] - tangent[0], face.position[1] - tangent[1], 0], [face.position[0] + tangent[0], face.position[1] + tangent[1], 0], [0.70, 0.78, 0.83, 0.85]);
    arrow(surfaceArrows, face.position, face.force.map(value => value * surfaceScale), [...pressureColor(face.pressure, field.range), 1]);
  }
  pressureLegend.textContent = `Relative pressure: blue −${number(field.range)} Pa · neutral 0 · orange +${number(field.range)} Pa (auto range; outlet = 0)`;
  forceValues.textContent = `Pressure force (right, up): (${number(loads.drag)}, ${number(loads.lift)}) N/m · magnitude ${number(magnitude)} N/m · pressure drag ${number(loads.drag)} N/m · pressure lift ${number(loads.lift)} N/m`;
  scaleValues.textContent = `Auto arrow scales: resultant/components 1 N/m → ${number(forceScale)} m; surface contributions 1 N/m → ${number(surfaceScale)} m. Lengths are display guides, not displacement.`;
}

function seedParticles() {
  particles = [];
  for (let row = 0; row < 18; row++) for (let segment = 0; segment < 4; segment++) {
    const position = [0.12 + segment * 1.5, 0.18 + row * (flow.height - 0.36) / 17, 0];
    particles.push({position, history: [], alive: !flow.inside(position[0], position[1]), inletY: position[1]});
  }
}

function traces(step) {
  for (const particle of particles) {
    if (!particle.alive || particle.position[0] > flow.width - 0.08 || particle.position[1] < 0.04 || particle.position[1] > flow.height - 0.04) {
      particle.position = [0.04, particle.inletY, 0];
      particle.history = [];
      particle.alive = true;
    }
    const next = advanceTracer(particle.position, step, (x,y)=>flow.sample(x,y,true), (x,y)=>flow.sample(x,y));
    if (tracerSegmentBlocked(flow, particle.position, next)) { particle.alive = false; particle.history = []; continue; }
    particle.position = next;
    particle.history.push([...next]);
    if (particle.history.length > 90) particle.history.shift();
  }
}

function camera(aspect) {
  const viewHeight = Math.max(flow.height + 0.8, (flow.width + 0.4) / aspect);
  const viewWidth = viewHeight * aspect;
  return new Float32Array([2/viewWidth,0,0,0,0,2/viewHeight,0,0,0,0,1,0,-flow.width/viewWidth,-flow.height/viewHeight,0,1]);
}

function draw(vertices, mode) {
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.DYNAMIC_DRAW);
  gl.drawArrays(mode,0,vertices.length/7);
}

function render() {
  const resolution = Math.min(devicePixelRatio || 1,2);
  const width = Math.round(canvas.clientWidth*resolution);
  const height = Math.round(canvas.clientHeight*resolution);
  if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
  gl.viewport(0,0,canvas.width,canvas.height);
  gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  gl.uniformMatrix4fv(cameraUniform,false,camera(canvas.clientWidth/canvas.clientHeight));
  if (showPressure.checked) draw(field.vertices,gl.TRIANGLES);
  const tunnel = [];
  for (const vertical of [0,flow.height]) line(tunnel,[0,vertical,0],[flow.width,vertical,0],[0.35,0.49,0.60,0.6]);
  for (const horizontal of [0,flow.width]) line(tunnel,[horizontal,0,0],[horizontal,flow.height,0],[0.35,0.49,0.60,0.6]);
  draw(tunnel,gl.LINES);
  const trails = [];
  const heads = [];
  for (const particle of particles) {
    const color = particle.inletY > flow.height / 2 ? [0.48,0.85,0.88] : [0.95,0.72,0.40];
    for (let index=1;index<particle.history.length;index++) line(trails,particle.history[index-1],particle.history[index],[...color,0.08+0.72*index/particle.history.length]);
    if (particle.history.length) vertex(heads,particle.position,[...color,0.95]);
  }
  draw(trails,gl.LINES);
  draw(heads,gl.POINTS);
  draw(wing,gl.TRIANGLES);
  if (showSurface.checked) draw(surfaceArrows,gl.LINES);
  if (showForces.checked) draw(forceArrows,gl.LINES);
  status.textContent = `${running ? 'Running' : 'Paused'} · ${flow.time.toFixed(2)} simulated s · volume-balance error ${flow.maximumDivergence.toExponential(1)} /s · 2D, no tip flow`;
}

function fail(failure) {
  running=false;
  error.textContent='The experiment stopped: '+failure.message;
  error.style.display='flex';
}

function animate(time) {
  try {
    if (lastTime && running && !document.hidden) accumulator+=Math.min(0.05,(time-lastTime)/1000);
    lastTime=time;
    const started=performance.now();
    let count=0;
    while(running && accumulator>=0.012 && count<3 && performance.now()-started<22) {
      const step=flow.step();
      traces(step);
      accumulator=Math.max(0,accumulator-step);
      count++;
    }
    accumulator=Math.min(accumulator,0.04);
    if (count) updatePressure();
    render();
    requestAnimationFrame(animate);
  } catch(failure) { fail(failure); }
}

angle.addEventListener('input',()=>{angleValue.textContent=angle.value+'°';});
angle.addEventListener('change',()=>{
  try { flow.reset(Number(angle.value)); geometry(); seedParticles(); accumulator=0; } catch(failure) { fail(failure); }
});
pause.addEventListener('click',()=>{
  running=!running;
  pause.textContent=running?'Pause':'Resume';
  pause.setAttribute('aria-pressed',String(!running));
  accumulator=0;
});
document.querySelector('#reset').addEventListener('click',()=>{
  try { flow.reset(Number(angle.value)); geometry(); seedParticles(); accumulator=0; } catch(failure) { fail(failure); }
});
canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();fail(new Error('WebGL context lost; reload to restart.'));});
geometry();
seedParticles();
requestAnimationFrame(animate);
