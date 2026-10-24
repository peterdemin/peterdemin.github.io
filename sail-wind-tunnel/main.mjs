import {SailSimulation, add, sub, mul, cross, dot, unit, length} from './physics.mjs';

const canvas = document.querySelector('#scene');
const error = document.querySelector('#error');
const gl = canvas.getContext('webgl', {antialias: true, alpha: false});
if (!gl) {
  error.style.display = 'grid';
  error.textContent = 'WebGL is unavailable. Enable hardware acceleration or open this page in a WebGL-capable browser.';
  throw new Error('WebGL unavailable');
}
const vertexSource = `attribute vec3 position; attribute vec4 color; uniform mat4 camera; varying vec4 tint; void main(){gl_Position=camera*vec4(position,1.0); tint=color;}`;
const fragmentSource = `precision mediump float; varying vec4 tint; void main(){gl_FragColor=tint;}`;
function shader(type, source) {
  const result = gl.createShader(type);
  gl.shaderSource(result, source);
  gl.compileShader(result);
  if (!gl.getShaderParameter(result, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(result));
  return result;
}
const program = gl.createProgram();
gl.attachShader(program, shader(gl.VERTEX_SHADER, vertexSource));
gl.attachShader(program, shader(gl.FRAGMENT_SHADER, fragmentSource));
gl.linkProgram(program);
if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
gl.useProgram(program);
const buffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
const positionLocation = gl.getAttribLocation(program, 'position'), colorLocation = gl.getAttribLocation(program, 'color');
gl.enableVertexAttribArray(positionLocation);
gl.enableVertexAttribArray(colorLocation);
gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 28, 0);
gl.vertexAttribPointer(colorLocation, 4, gl.FLOAT, false, 28, 12);
gl.enable(gl.DEPTH_TEST);
gl.enable(gl.BLEND);
gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
gl.clearColor(0.035, 0.074, 0.118, 1);

const simulation = new SailSimulation();
const camera = {azimuth: 0.8, elevation: 0.28, distance: 11};
const target = [1.2, 2.6, 0];
let paused = false, previousTime = 0, accumulator = 0, tick = 0, smokeTime = 0, statsTime = 0;
let trails = [];
let frames = 0, lastFrameMilliseconds = 0;
const colors = {lift: [0.42, 0.86, 0.8, 1], drag: [1, 0.74, 0.44, 1], rig: [0.72, 0.8, 0.85, 1], mesh: [0.5, 0.76, 0.9, 0.48]};
function seedTrails() {
  trails = [];
  const airflow = unit(simulation.speed ? simulation.wind : [1, 0, 0]);
  const across = [-airflow[2], 0, airflow[0]];
  const center = [1.2, 0, 0];
  for (const height of [0.9, 1.8, 2.8, 3.8, 4.8, 5.2, 5.6]) for (const offset of [-1.2, -0.45, 0, 0.45, 1.2]) {
    const seed = add(add(center, mul(airflow, -5.5)), mul(across, offset));
    seed[1] = height;
    trails.push({seed, position: [...seed], points: [[...seed]], height});
  }
}
seedTrails();
function updateSmoke(timestep) {
  if (simulation.speed < 0.01) return;
  for (const trail of trails) {
    trail.position = simulation.advect(trail.position, timestep);
    if (!trail.position.every(Number.isFinite) || length(sub(trail.position, trail.seed)) > 14 || trail.position[1] < 0) {
      trail.position = [...trail.seed];
      trail.points = [[...trail.seed]];
    } else {
      trail.points.push([...trail.position]);
      if (trail.points.length > 420) trail.points.shift();
    }
  }
}
function multiplyMatrices(left, right) {
  const result = new Float32Array(16);
  for (let column = 0; column < 4; column++) for (let row = 0; row < 4; row++) for (let inner = 0; inner < 4; inner++) result[column * 4 + row] += left[inner * 4 + row] * right[column * 4 + inner];
  return result;
}
function cameraMatrix() {
  const eye = add(target, [camera.distance * Math.cos(camera.elevation) * Math.sin(camera.azimuth), camera.distance * Math.sin(camera.elevation), camera.distance * Math.cos(camera.elevation) * Math.cos(camera.azimuth)]);
  const backward = unit(sub(eye, target)), right = unit(cross([0, 1, 0], backward)), up = cross(backward, right);
  const view = new Float32Array([right[0], up[0], backward[0], 0, right[1], up[1], backward[1], 0, right[2], up[2], backward[2], 0, -dot(right, eye), -dot(up, eye), -dot(backward, eye), 1]);
  const focal = 1 / Math.tan(Math.PI / 7), near = 0.1, far = 150, aspect = canvas.width / canvas.height;
  const projection = new Float32Array([focal / aspect, 0, 0, 0, 0, focal, 0, 0, 0, 0, (far + near) / (near - far), -1, 0, 0, 2 * far * near / (near - far), 0]);
  return multiplyMatrices(projection, view);
}
function vertex(vertices, point, color) { vertices.push(...point, ...color); }
function line(vertices, start, end, color) { vertex(vertices, start, color); vertex(vertices, end, color); }
function arrow(vertices, start, vector, color) {
  if (length(vector) < 0.005) return;
  const end = add(start, vector), direction = unit(vector);
  const side = unit(cross(direction, Math.abs(direction[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]));
  const head = Math.min(0.22, length(vector) * 0.22);
  line(vertices, start, end, color);
  line(vertices, end, add(sub(end, mul(direction, head)), mul(side, head * 0.45)), color);
  line(vertices, end, sub(sub(end, mul(direction, head)), mul(side, head * 0.45)), color);
}
function draw(vertices, mode) {
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);
  gl.drawArrays(mode, 0, vertices.length / 7);
}
function render() {
  const scale = Math.min(devicePixelRatio || 1, 2);
  const width = Math.round(canvas.clientWidth * scale), height = Math.round(canvas.clientHeight * scale);
  if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
  gl.viewport(0, 0, width, height);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.uniformMatrix4fv(gl.getUniformLocation(program, 'camera'), false, cameraMatrix());
  const triangles = [], lines = [], smoke = [], forceArrows = [];
  for (let coordinate = -10; coordinate <= 10; coordinate++) {
    line(lines, [coordinate, 0, -10], [coordinate, 0, 10], [0.16, 0.25, 0.33, 0.65]);
    line(lines, [-10, 0, coordinate], [10, 0, coordinate], [0.16, 0.25, 0.33, 0.65]);
  }
  function rod(start, end, radius) {
    const axis = unit(sub(end, start)), side = unit(cross(axis, [0, 0, 1])), other = cross(axis, side);
    for (let sector = 0; sector < 8; sector++) {
      const firstAngle = sector * Math.PI / 4, secondAngle = (sector + 1) * Math.PI / 4;
      const first = add(mul(side, Math.cos(firstAngle) * radius), mul(other, Math.sin(firstAngle) * radius));
      const second = add(mul(side, Math.cos(secondAngle) * radius), mul(other, Math.sin(secondAngle) * radius));
      for (const point of [add(start, first), add(end, first), add(end, second), add(start, first), add(end, second), add(start, second)]) vertex(triangles, point, colors.rig);
    }
  }
  rod([0, 0, 0], [0, 5.3, 0], 0.045);
  rod([0, 0.6, 0], [3.4, 0.6, 0], 0.04);
  for (let span = 0; span < simulation.spanCount; span++) for (let chord = 0; chord < simulation.chordCount; chord++) {
    const corners = [simulation.index(chord, span), simulation.index(chord + 1, span), simulation.index(chord + 1, span + 1), simulation.index(chord, span + 1)];
    const panel = simulation.panels.find(candidate => candidate.corners.includes(corners[0]) && candidate.corners.includes(corners[2]));
    const pressure = panel?.pressure || 0, intensity = Math.min(1, Math.abs(pressure) / 80);
    const color = !simulation.modelSupported || !simulation.valid ? [0.35, 0.42, 0.48, 1] : pressure >= 0 ? [0.21 + intensity * 0.08, 0.48 + intensity * 0.2, 0.67 + intensity * 0.2, 1] : [0.68 + intensity * 0.2, 0.45, 0.24, 1];
    for (const corner of [corners[0], corners[1], corners[2], corners[0], corners[2], corners[3]]) vertex(triangles, simulation.positions[corner], color);
    if (document.querySelector('#mesh').checked) for (let edge = 0; edge < 4; edge++) {
      const first = add(simulation.positions[corners[edge]], [0, 0, 0.004]), second = add(simulation.positions[corners[(edge + 1) % 4]], [0, 0, 0.004]);
      line(lines, first, second, colors.mesh);
    }
  }
  if (document.querySelector('#loads').checked) for (const panel of simulation.panels) arrow(forceArrows, panel.control, mul(panel.force, 0.03), [0.98, 0.87, 0.52, 1]);
  const dragAxis = unit(simulation.speed ? simulation.wind : [1, 0, 0]);
  arrow(forceArrows, [1.1, 2.7, 0], mul(simulation.liftVector, 0.018), colors.lift);
  arrow(forceArrows, [1.1, 2.7, 0], mul(dragAxis, simulation.drag * 0.018), colors.drag);
  arrow(lines, [-0.2, 0.15, -2.5], mul(dragAxis, simulation.speed * 0.15), [0.65, 0.78, 0.89, 1]);
  for (const trail of simulation.modelSupported && simulation.valid ? trails : []) for (let index = 1; index < trail.points.length; index++) {
    const opacity = 0.22 + 0.6 * index / trail.points.length;
    const color = trail.height >= 4.8 ? [0.78, 0.64, 1, opacity] : [0.77, 0.89, 0.96, opacity];
    line(smoke, trail.points[index - 1], trail.points[index], color);
  }
  gl.enable(gl.POLYGON_OFFSET_FILL);
  gl.polygonOffset(1, 1);
  draw(triangles, gl.TRIANGLES);
  gl.disable(gl.POLYGON_OFFSET_FILL);
  draw(lines, gl.LINES);
  gl.depthMask(false);
  draw(smoke, gl.LINES);
  gl.disable(gl.DEPTH_TEST);
  draw(forceArrows, gl.LINES);
  gl.enable(gl.DEPTH_TEST);
  gl.depthMask(true);
  frames++;
  if (frames === 1) window.dispatchEvent(new Event('sail-ready'));
}
function updateStats() {
  const available = simulation.modelSupported && simulation.valid;
  document.querySelector('#lift').textContent = available ? `${simulation.lift.toFixed(1)} N` : '—';
  document.querySelector('#drag').textContent = available ? `${simulation.drag.toFixed(1)} N` : '—';
  document.querySelector('#notice').textContent = !simulation.valid ? `Numerical failure: ${simulation.failureReason}. Reset sail to restart. Loads withheld.` : !simulation.modelSupported ? 'Outside supported forward ±20° range. Forces and airflow trails withheld; cloth is held at its last shape. Broadside separation and reversed-flow behavior are not solved. Return within ±20° to resume.' : 'Attached-flow approximation. Head vortices are resolved coarsely; separation is not calculated.';
  const fluidStats = available ? `Boundary residual ${simulation.residual.toExponential(1)} m/s\nHorizontal lift ${simulation.horizontalLift.toFixed(1)} N · vertical ${simulation.totalForce[1].toFixed(1)} N\nInduced drag ${simulation.inducedDrag.toFixed(1)} N + empirical skin drag ${(simulation.drag - simulation.inducedDrag).toFixed(1)} N` : `Fluid solve: ${simulation.modelStatus}; no force or airflow result`;
  document.querySelector('#diagnostics').textContent = `t = ${simulation.time.toFixed(2)} s · 60 panels / 77 nodes\nMean free-node z ${simulation.meanBillow >= 0 ? '+' : ''}${(simulation.meanBillow * 100).toFixed(2)} cm\n${fluidStats}\nMax link strain ${(simulation.maxStrain * 100).toFixed(1)}% · frame ${lastFrameMilliseconds.toFixed(0)} ms`;
  document.querySelector('#diagnostics').style.whiteSpace = 'pre-line';
}
function changeWind() {
  simulation.speed = Number(document.querySelector('#speed').value);
  simulation.direction = Number(document.querySelector('#direction').value);
  document.querySelector('#speed-value').textContent = `${simulation.speed.toFixed(1)} m/s`;
  document.querySelector('#direction-value').textContent = `${simulation.direction}°`;
  simulation.solveAerodynamics();
  seedTrails();
  updateStats();
}
document.querySelector('#speed').addEventListener('input', changeWind);
document.querySelector('#direction').addEventListener('input', changeWind);
document.querySelector('#pause').addEventListener('click', () => {
  paused = !paused;
  document.querySelector('#pause').textContent = paused ? 'Resume' : 'Pause';
  accumulator = 0;
});
document.querySelector('#reset').addEventListener('click', () => { simulation.reset(); tick = 0; accumulator = 0; seedTrails(); updateStats(); });
document.querySelector('#view').addEventListener('click', () => Object.assign(camera, {azimuth: 0.8, elevation: 0.28, distance: 11}));
let pointer = null;
canvas.addEventListener('pointerdown', event => { pointer = [event.clientX, event.clientY]; canvas.setPointerCapture(event.pointerId); });
canvas.addEventListener('pointermove', event => {
  if (!pointer) return;
  camera.azimuth -= (event.clientX - pointer[0]) * 0.008;
  camera.elevation = Math.max(-1.45, Math.min(1.45, camera.elevation + (event.clientY - pointer[1]) * 0.008));
  pointer = [event.clientX, event.clientY];
});
canvas.addEventListener('pointerup', () => pointer = null);
canvas.addEventListener('pointercancel', () => pointer = null);
canvas.addEventListener('wheel', event => { event.preventDefault(); camera.distance = Math.max(3, Math.min(35, camera.distance * Math.exp(event.deltaY * 0.001))); }, {passive: false});
canvas.addEventListener('keydown', event => {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '-'].includes(event.key)) return;
  event.preventDefault();
  if (event.key === 'ArrowLeft') camera.azimuth -= 0.1;
  if (event.key === 'ArrowRight') camera.azimuth += 0.1;
  if (event.key === 'ArrowUp') camera.elevation = Math.min(1.45, camera.elevation + 0.1);
  if (event.key === 'ArrowDown') camera.elevation = Math.max(-1.45, camera.elevation - 0.1);
  if (event.key === '+') camera.distance = Math.max(3, camera.distance / 1.1);
  if (event.key === '-') camera.distance = Math.min(35, camera.distance * 1.1);
});
canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); paused = true; error.style.display = 'grid'; error.textContent = 'WebGL context lost. Reload this page to restore the scene.'; });
function frame(milliseconds) {
  const start = performance.now();
  const elapsed = previousTime ? Math.min(0.05, (milliseconds - previousTime) / 1000) : 0;
  previousTime = milliseconds;
  if (!paused && simulation.valid && simulation.modelSupported) {
    accumulator = Math.min(accumulator + elapsed, 1 / 30);
    let steps = 0;
    while (accumulator >= 1 / 240 && steps < 8) {
      if (tick % 4 === 0) simulation.solveAerodynamics();
      simulation.step();
      if (!simulation.valid) { accumulator = 0; break; }
      tick++;
      accumulator -= 1 / 240;
      smokeTime += 1 / 240;
      steps++;
    }
    if (smokeTime >= 1 / 60) { updateSmoke(smokeTime); smokeTime = 0; }
  }
  if (milliseconds - statsTime > 250) { updateStats(); statsTime = milliseconds; }
  render();
  lastFrameMilliseconds = performance.now() - start;
  requestAnimationFrame(frame);
}
window.sailDemo = {simulation, camera, get paused() { return paused; }, get trails() { return trails; }, get frames() { return frames; }, get glError() { return gl.getError(); }};
updateStats();
requestAnimationFrame(frame);
