(function () {
'use strict';
const add = (left, right) => [left[0] + right[0], left[1] + right[1], left[2] + right[2]];
const sub = (left, right) => [left[0] - right[0], left[1] - right[1], left[2] - right[2]];
const mul = (vector, scale) => [vector[0] * scale, vector[1] * scale, vector[2] * scale];
const dot = (left, right) => left.reduce((sum, value, index) => sum + value * right[index], 0);
const cross = (left, right) => [left[1] * right[2] - left[2] * right[1], left[2] * right[0] - left[0] * right[2], left[0] * right[1] - left[1] * right[0]];
const length = vector => Math.hypot(...vector);
const unit = vector => mul(vector, 1 / Math.max(length(vector), 1e-12));
const mix = (left, right, fraction) => add(mul(left, 1 - fraction), mul(right, fraction));

function segmentVelocity(point, start, end, core = 0.035) {
  const firstX = point[0] - start[0], firstY = point[1] - start[1], firstZ = point[2] - start[2];
  const secondX = point[0] - end[0], secondY = point[1] - end[1], secondZ = point[2] - end[2];
  const segmentX = end[0] - start[0], segmentY = end[1] - start[1], segmentZ = end[2] - start[2];
  const crossX = firstY * secondZ - firstZ * secondY, crossY = firstZ * secondX - firstX * secondZ, crossZ = firstX * secondY - firstY * secondX;
  const denominator = crossX * crossX + crossY * crossY + crossZ * crossZ + core * core * (segmentX * segmentX + segmentY * segmentY + segmentZ * segmentZ);
  const firstLength = Math.hypot(firstX, firstY, firstZ), secondLength = Math.hypot(secondX, secondY, secondZ);
  if (firstLength < 1e-9 || secondLength < 1e-9 || denominator < 1e-16) return [0, 0, 0];
  const factor = (segmentX * (firstX / firstLength - secondX / secondLength) + segmentY * (firstY / firstLength - secondY / secondLength) + segmentZ * (firstZ / firstLength - secondZ / secondLength)) / (4 * Math.PI * denominator);
  return [crossX * factor, crossY * factor, crossZ * factor];
}

function horseshoeVelocity(point, panel, wakeOnly = false) {
  let velocity = add(segmentVelocity(point, panel.farStart, panel.start), segmentVelocity(point, panel.end, panel.farEnd));
  if (!wakeOnly) velocity = add(velocity, segmentVelocity(point, panel.start, panel.end));
  return velocity;
}

function solveLinear(matrix, rightHandSide) {
  const size = rightHandSide.length;
  const rows = matrix.map((row, index) => [...row, rightHandSide[index]]);
  for (let column = 0; column < size; column++) {
    let pivot = column;
    for (let row = column + 1; row < size; row++) if (Math.abs(rows[row][column]) > Math.abs(rows[pivot][column])) pivot = row;
    if (Math.abs(rows[pivot][column]) < 1e-10) throw new Error('Degenerate aerodynamic lattice');
    [rows[column], rows[pivot]] = [rows[pivot], rows[column]];
    for (let row = column + 1; row < size; row++) {
      const factor = rows[row][column] / rows[column][column];
      for (let entry = column; entry <= size; entry++) rows[row][entry] -= factor * rows[column][entry];
    }
  }
  const result = new Array(size).fill(0);
  for (let row = size - 1; row >= 0; row--) {
    let value = rows[row][size];
    for (let column = row + 1; column < size; column++) value -= rows[row][column] * result[column];
    result[row] = value / rows[row][row];
  }
  return result;
}

class SailSimulation {
  constructor(chordCount = 6, spanCount = 10) {
    this.chordCount = chordCount;
    this.spanCount = spanCount;
    this.density = 1.225;
    this.gravity = [0, -9.81, 0];
    this.speed = 6;
    this.direction = 15;
    this.time = 0;
    this.reset();
  }
  index(chord, span) { return span * (this.chordCount + 1) + chord; }
  reset() {
    this.positions = [];
    this.velocities = [];
    this.pinned = [];
    this.masses = [];
    this.constraints = [];
    this.panels = [];
    this.forces = [];
    this.totalForce = [0, 0, 0];
    this.liftVector = [0, 0, 0];
    this.horizontalLift = 0;
    this.failureReason = '';
    this.lift = this.drag = this.inducedDrag = this.residual = 0;
    this.valid = true;
    this.time = 0;
    for (let span = 0; span <= this.spanCount; span++) {
      const fraction = span / this.spanCount, width = 3.2 - 2.95 * fraction;
      for (let chord = 0; chord <= this.chordCount; chord++) {
        const chordFraction = chord / this.chordCount;
        const fullness = 1 + 0.0339 * Math.sin(Math.PI * fraction) ** 2;
        this.positions.push([width * fullness * chordFraction, 0.6 + 4.4 * fraction, 0]);
        this.velocities.push([0, 0, 0]);
        this.pinned.push(chord === 0 || span === 0);
        this.masses.push(0);
      }
    }
    this.anchors = this.positions.map(position => [...position]);
    this.restGeometry = this.positions.map(position => [...position]);
    const constraint = (first, second, stiffness) => this.constraints.push({first, second, rest: length(sub(this.restGeometry[first], this.restGeometry[second])), compliance: 1 / stiffness, lambda: 0});
    for (let span = 0; span <= this.spanCount; span++) for (let chord = 0; chord <= this.chordCount; chord++) {
      const index = this.index(chord, span);
      if (chord < this.chordCount) constraint(index, this.index(chord + 1, span), 10000000);
      if (span < this.spanCount) constraint(index, this.index(chord, span + 1), 10000000);
      if (chord < this.chordCount && span < this.spanCount) {
        constraint(index, this.index(chord + 1, span + 1), 10000000);
        const corners = [index, this.index(chord + 1, span), this.index(chord + 1, span + 1), this.index(chord, span + 1)];
        const area = this.panelArea(corners);
        for (const corner of corners) this.masses[corner] += area * 0.22 / 4;
      }
      if (chord + 2 <= this.chordCount) constraint(index, this.index(chord + 2, span), 0.5);
      if (span + 2 <= this.spanCount) constraint(index, this.index(chord, span + 2), 0.5);
    }
    this.inverseMasses = this.masses.map((mass, index) => this.pinned[index] ? 0 : 1 / mass);
    this.forces = this.positions.map(() => [0, 0, 0]);
    this.solveAerodynamics();
  }
  get wind() {
    const radians = this.direction * Math.PI / 180;
    return [this.speed * Math.cos(radians), 0, this.speed * Math.sin(radians)];
  }
  get modelSupported() {
    const direction = ((this.direction + 180) % 360 + 360) % 360 - 180;
    return this.speed < 0.01 || Math.abs(direction) <= 20;
  }
  panelArea(corners) {
    const [first, second, third, fourth] = corners.map(index => this.positions[index]);
    return (length(cross(sub(second, first), sub(third, first))) + length(cross(sub(third, first), sub(fourth, first)))) / 2;
  }
  makePanels() {
    const reverse = this.wind[0] < 0;
    const wake = mul(unit(this.wind), 70);
    const panels = [];
    for (let span = 0; span < this.spanCount; span++) for (let chord = 0; chord < this.chordCount; chord++) {
      const leading = reverse ? this.chordCount - chord : chord;
      const trailing = reverse ? leading - 1 : leading + 1;
      const corners = [this.index(leading, span), this.index(trailing, span), this.index(trailing, span + 1), this.index(leading, span + 1)];
      const [first, second, third, fourth] = corners.map(index => this.positions[index]);
      const start = mix(first, second, 0.25), end = mix(fourth, third, 0.25);
      const control = mix(mix(first, second, 0.75), mix(fourth, third, 0.75), 0.5);
      const chordVector = sub(mix(second, third, 0.5), mix(first, fourth, 0.5));
      const spanVector = sub(mix(fourth, third, 0.5), mix(first, second, 0.5));
      const normal = mul(unit(cross(chordVector, spanVector)), reverse ? -1 : 1);
      panels.push({corners, start, end, control, normal, farStart: add(start, wake), farEnd: add(end, wake), area: this.panelArea(corners), gamma: 0});
    }
    return panels;
  }
  solveAerodynamics({allowUnsupported = false} = {}) {
    this.forces = this.positions.map(() => [0, 0, 0]);
    this.totalForce = [0, 0, 0];
    this.liftVector = [0, 0, 0];
    this.horizontalLift = 0;
    this.lift = this.drag = this.inducedDrag = this.residual = 0;
    if (this.failureReason) { this.valid = false; this.modelStatus = 'numerical-failure'; this.panels = []; return; }
    this.valid = true;
    this.modelStatus = this.modelSupported ? 'attached' : 'unsupported';
    if (!this.modelSupported && !allowUnsupported) { this.panels = []; return; }
    if (this.speed < 0.01) { this.modelStatus = 'zero-wind'; this.panels = []; return; }
    this.panels = this.makePanels();
    const matrix = this.panels.map(target => this.panels.map(source => dot(horseshoeVelocity(target.control, source), target.normal)));
    const rightHandSide = this.panels.map(panel => -dot(this.wind, panel.normal));
    let circulation;
    try { circulation = solveLinear(matrix, rightHandSide); }
    catch { this.valid = false; this.modelStatus = 'numerical-failure'; this.failureReason = 'Degenerate aerodynamic lattice'; this.panels = []; return; }
    if (circulation.some(value => !Number.isFinite(value) || Math.abs(value) > this.speed * 40)) { this.valid = false; this.modelStatus = 'numerical-failure'; this.failureReason = 'Circulation outside numerical range'; this.panels = []; return; }
    for (let index = 0; index < this.panels.length; index++) this.panels[index].gamma = circulation[index];
    this.residual = Math.max(...matrix.map((row, index) => Math.abs(dot(row, circulation) - rightHandSide[index])));
    const dragAxis = unit(this.wind), liftAxis = [-dragAxis[2], 0, dragAxis[0]];
    for (const panel of this.panels) {
      const midpoint = mix(panel.start, panel.end, 0.5);
      const induced = this.panels.reduce((sum, source) => add(sum, mul(horseshoeVelocity(midpoint, source, true), source.gamma)), [0, 0, 0]);
      const aerodynamic = mul(cross(add(this.wind, induced), sub(panel.end, panel.start)), this.density * panel.gamma);
      const skinDrag = mul(dragAxis, 0.5 * this.density * this.speed ** 2 * panel.area * 0.008);
      panel.force = add(aerodynamic, skinDrag);
      panel.pressure = dot(aerodynamic, panel.normal) / panel.area;
      this.inducedDrag += dot(aerodynamic, dragAxis);
      this.totalForce = add(this.totalForce, panel.force);
      for (const corner of panel.corners) this.forces[corner] = add(this.forces[corner], mul(panel.force, 0.25));
    }
    this.drag = dot(this.totalForce, dragAxis);
    this.liftVector = sub(this.totalForce, mul(dragAxis, this.drag));
    this.lift = length(this.liftVector);
    this.horizontalLift = dot(this.totalForce, liftAxis);
  }
  velocityAt(point) {
    return this.panels.reduce((velocity, panel) => add(velocity, mul(horseshoeVelocity(point, panel), panel.gamma)), this.wind);
  }
  advect(point, timestep) {
    const midpoint = add(point, mul(this.velocityAt(point), timestep / 2));
    return add(point, mul(this.velocityAt(midpoint), timestep));
  }
  step(timestep = 1 / 240) {
    if (!this.valid || !this.modelSupported) return;
    const previous = this.positions.map(position => [...position]);
    const damping = Math.exp(-100 * timestep);
    for (let index = 0; index < this.positions.length; index++) {
      if (this.pinned[index]) continue;
      const acceleration = add(mul(this.forces[index], this.inverseMasses[index]), this.gravity);
      this.velocities[index] = mul(add(this.velocities[index], mul(acceleration, timestep)), damping);
      this.positions[index] = add(this.positions[index], mul(this.velocities[index], timestep));
    }
    for (const constraint of this.constraints) constraint.lambda = 0;
    for (let iteration = 0; iteration < 80; iteration++) for (const constraint of this.constraints) {
      const difference = sub(this.positions[constraint.first], this.positions[constraint.second]);
      const distance = length(difference), firstWeight = this.inverseMasses[constraint.first], secondWeight = this.inverseMasses[constraint.second];
      if (distance < 1e-10 || firstWeight + secondWeight === 0) continue;
      const alpha = constraint.compliance / (timestep * timestep);
      const deltaLambda = (-(distance - constraint.rest) - alpha * constraint.lambda) / (firstWeight + secondWeight + alpha);
      constraint.lambda += deltaLambda;
      const correction = mul(difference, deltaLambda / distance);
      this.positions[constraint.first] = add(this.positions[constraint.first], mul(correction, firstWeight));
      this.positions[constraint.second] = sub(this.positions[constraint.second], mul(correction, secondWeight));
    }
    for (let index = 0; index < this.positions.length; index++) {
      if (this.pinned[index]) this.positions[index] = [...this.anchors[index]];
      this.velocities[index] = mul(sub(this.positions[index], previous[index]), 1 / timestep);
    }
    if (this.positions.some(position => !position.every(Number.isFinite)) || this.maxStrain > 0.08) {
      this.positions = previous;
      this.velocities = previous.map(() => [0, 0, 0]);
      this.valid = false;
      this.failureReason = 'Fabric strain exceeded 8%; numerical run stopped';
      this.solveAerodynamics();
      return;
    }
    this.time += timestep;
  }
  get maxStrain() {
    return Math.max(...this.constraints.filter(constraint => constraint.compliance < 0.01).map(constraint => Math.abs(length(sub(this.positions[constraint.first], this.positions[constraint.second])) / constraint.rest - 1)));
  }
  get meanBillow() {
    const free = this.positions.filter((position, index) => !this.pinned[index]);
    return free.reduce((sum, position) => sum + position[2], 0) / free.length;
  }
}


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

})();
