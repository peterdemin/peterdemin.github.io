(() => {
'use strict';
try {
const CHORD = 1.5;
const VISCOSITY = 0.015;
const DENSITY = 1.225;

function thickness(fraction) {
  return 5 * 0.18 * CHORD * (0.2969 * Math.sqrt(fraction) - 0.126 * fraction - 0.3516 * fraction ** 2 + 0.2843 * fraction ** 3 - 0.1036 * fraction ** 4);
}

class WindTunnel {
  constructor({columns = 96, rows = 48, angle = 8, viscosity = VISCOSITY} = {}) {
    this.columns = columns;
    this.rows = rows;
    this.width = 6;
    this.spacing = this.width / columns;
    this.height = rows * this.spacing;
    this.center = [2.4, this.height / 2];
    this.viscosity = viscosity;
    this.u = new Float64Array((columns + 1) * rows);
    this.v = new Float64Array(columns * (rows + 1));
    this.previousU = this.u.slice();
    this.previousV = this.v.slice();
    this.nextU = this.u.slice();
    this.nextV = this.v.slice();
    this.fluid = new Uint8Array(columns * rows);
    this.pressure = new Float64Array(columns * rows);
    this.rhs = this.pressure.slice();
    this.diagonal = this.pressure.slice();
    this.residual = this.pressure.slice();
    this.direction = this.pressure.slice();
    this.preconditioned = this.pressure.slice();
    this.product = this.pressure.slice();
    this.reset(angle);
  }

  inside(x, y) {
    const horizontal = x - this.center[0];
    const vertical = y - this.center[1];
    const along = horizontal * Math.cos(this.angle) + vertical * Math.sin(this.angle);
    const across = -horizontal * Math.sin(this.angle) + vertical * Math.cos(this.angle);
    const fraction = along / CHORD + 0.5;
    return fraction >= 0 && fraction <= 1 && Math.abs(across) <= thickness(fraction);
  }

  cell(column, row) {
    return column >= 0 && column < this.columns && row >= 0 && row < this.rows && this.fluid[row * this.columns + column] === 1;
  }

  openU(column, row) {
    return row >= 0 && row < this.rows && (column === 0 ? this.cell(0, row) : column === this.columns ? this.cell(column - 1, row) : this.cell(column - 1, row) && this.cell(column, row));
  }

  openV(column, row) {
    return column >= 0 && column < this.columns && row > 0 && row < this.rows && this.cell(column, row - 1) && this.cell(column, row);
  }

  reset(angle = this.degrees) {
    this.degrees = Math.max(-45, Math.min(45, angle));
    this.angle = -this.degrees * Math.PI / 180;
    this.time = 0;
    this.pressure.fill(0);
    this.v.fill(0);
    this.u.fill(1);
    for (let row = 0; row < this.rows; row++) for (let column = 0; column < this.columns; column++) {
      this.fluid[row * this.columns + column] = Number(!this.inside((column + 0.5) * this.spacing, (row + 0.5) * this.spacing));
    }
    for (let row = 0; row < this.rows; row++) for (let column = 0; column <= this.columns; column++) {
      if (!this.openU(column, row)) this.u[row * (this.columns + 1) + column] = 0;
    }
    this.buildDiagonal();
    this.project(0.01);
    this.previousU.set(this.u);
    this.previousV.set(this.v);
  }

  buildDiagonal() {
    for (let row = 0; row < this.rows; row++) for (let column = 0; column < this.columns; column++) {
      const index = row * this.columns + column;
      this.diagonal[index] = this.cell(column, row) ? Number(this.cell(column - 1, row)) + Number(this.cell(column + 1, row)) + Number(this.cell(column, row - 1)) + Number(this.cell(column, row + 1)) + (column === this.columns - 1 ? 2 : 0) : 1;
    }
  }

  multiply(input, output) {
    for (let row = 0; row < this.rows; row++) for (let column = 0; column < this.columns; column++) {
      const index = row * this.columns + column;
      if (!this.cell(column, row)) { output[index] = 0; continue; }
      let value = this.diagonal[index] * input[index];
      if (this.cell(column - 1, row)) value -= input[index - 1];
      if (this.cell(column + 1, row)) value -= input[index + 1];
      if (this.cell(column, row - 1)) value -= input[index - this.columns];
      if (this.cell(column, row + 1)) value -= input[index + this.columns];
      output[index] = value;
    }
  }

  divergence(column, row) {
    return (this.u[row * (this.columns + 1) + column + 1] - this.u[row * (this.columns + 1) + column] + this.v[(row + 1) * this.columns + column] - this.v[row * this.columns + column]) / this.spacing;
  }

  project(step) {
    const scale = DENSITY * this.spacing ** 2 / step;
    for (let row = 0; row < this.rows; row++) for (let column = 0; column < this.columns; column++) {
      const index = row * this.columns + column;
      this.rhs[index] = this.cell(column, row) ? -scale * this.divergence(column, row) : 0;
    }
    this.multiply(this.pressure, this.product);
    let paired = 0;
    for (let index = 0; index < this.pressure.length; index++) {
      this.residual[index] = this.rhs[index] - this.product[index];
      this.preconditioned[index] = this.residual[index] / this.diagonal[index];
      this.direction[index] = this.preconditioned[index];
      paired += this.residual[index] * this.preconditioned[index];
    }
    const tolerance = 1e-5 * scale;
    this.iterations = 0;
    for (; this.iterations < 800 && paired > 1e-30; this.iterations++) {
      let maximum = 0;
      for (const value of this.residual) maximum = Math.max(maximum, Math.abs(value));
      if (maximum <= tolerance) break;
      this.multiply(this.direction, this.product);
      let denominator = 0;
      for (let index = 0; index < this.pressure.length; index++) denominator += this.direction[index] * this.product[index];
      if (denominator <= 0) throw new Error('Pressure matrix lost positive definiteness');
      const correction = paired / denominator;
      let nextPair = 0;
      for (let index = 0; index < this.pressure.length; index++) {
        this.pressure[index] += correction * this.direction[index];
        this.residual[index] -= correction * this.product[index];
        this.preconditioned[index] = this.residual[index] / this.diagonal[index];
        nextPair += this.residual[index] * this.preconditioned[index];
      }
      const ratio = nextPair / paired;
      for (let index = 0; index < this.pressure.length; index++) this.direction[index] = this.preconditioned[index] + ratio * this.direction[index];
      paired = nextPair;
    }
    const factor = step / (DENSITY * this.spacing);
    for (let row = 0; row < this.rows; row++) for (let column = 1; column <= this.columns; column++) {
      if (!this.openU(column, row)) continue;
      const index = row * this.columns + column - 1;
      const difference = column === this.columns ? -2 * this.pressure[index] : this.pressure[index + 1] - this.pressure[index];
      this.u[row * (this.columns + 1) + column] -= factor * difference;
    }
    for (let row = 1; row < this.rows; row++) for (let column = 0; column < this.columns; column++) {
      if (this.openV(column, row)) this.v[row * this.columns + column] -= factor * (this.pressure[row * this.columns + column] - this.pressure[(row - 1) * this.columns + column]);
    }
    this.maximumDivergence = this.diagnostics().divergence;
    if (this.maximumDivergence > 2e-5) throw new Error('Pressure solve did not reach the volume-balance tolerance');
  }

  uValue(column, row, center, tangent = false) {
    if (row < 0 || row >= this.rows) return center;
    if (column < 0) return 1;
    if (column > this.columns) return center;
    return this.openU(column, row) ? this.u[row * (this.columns + 1) + column] : tangent ? -center : 0;
  }

  vValue(column, row, center, tangent = false) {
    if (column < 0) return -center;
    if (column >= this.columns) return center;
    if (row <= 0 || row >= this.rows) return 0;
    return this.openV(column, row) ? this.v[row * this.columns + column] : tangent ? -center : 0;
  }

  step(maximumStep = 0.012) {
    let horizontalMaximum = 1;
    let verticalMaximum = 0;
    for (const value of this.u) horizontalMaximum = Math.max(horizontalMaximum, Math.abs(value));
    for (const value of this.v) verticalMaximum = Math.max(verticalMaximum, Math.abs(value));
    const step = Math.min(maximumStep, 0.012, 0.65 / ((horizontalMaximum + verticalMaximum) / this.spacing + 4 * this.viscosity / this.spacing ** 2));
    this.predict(step);
    this.project(step);
    this.time += step;
    return step;
  }

  predict(step) {
    const inverse = 1 / this.spacing;
    this.previousU.set(this.u);
    this.previousV.set(this.v);
    this.nextU.fill(0);
    this.nextV.fill(0);
    for (let row = 0; row < this.rows; row++) for (let column = 0; column <= this.columns; column++) {
      const index = row * (this.columns + 1) + column;
      if (!this.openU(column, row)) continue;
      if (column === 0) { this.nextU[index] = 1; continue; }
      if (column === this.columns) { this.nextU[index] = this.u[index - 1]; continue; }
      const center = this.u[index];
      const left = this.uValue(column - 1, row, center);
      const right = this.uValue(column + 1, row, center);
      const bottom = this.uValue(column, row - 1, center);
      const top = this.uValue(column, row + 1, center);
      const across = (this.v[row * this.columns + column - 1] + this.v[row * this.columns + column] + this.v[(row + 1) * this.columns + column - 1] + this.v[(row + 1) * this.columns + column]) / 4;
      const transport = center * (center >= 0 ? center - left : right - center) + across * (across >= 0 ? center - bottom : top - center);
      const laplacian = left + right + this.uValue(column, row - 1, center, true) + this.uValue(column, row + 1, center, true) - 4 * center;
      this.nextU[index] = center + step * (-inverse * transport + this.viscosity * inverse ** 2 * laplacian);
    }
    for (let row = 1; row < this.rows; row++) for (let column = 0; column < this.columns; column++) {
      const index = row * this.columns + column;
      if (!this.openV(column, row)) continue;
      const center = this.v[index];
      const left = this.vValue(column - 1, row, center);
      const right = this.vValue(column + 1, row, center);
      const bottom = this.vValue(column, row - 1, center);
      const top = this.vValue(column, row + 1, center);
      const along = (this.u[(row - 1) * (this.columns + 1) + column] + this.u[(row - 1) * (this.columns + 1) + column + 1] + this.u[row * (this.columns + 1) + column] + this.u[row * (this.columns + 1) + column + 1]) / 4;
      const transport = along * (along >= 0 ? center - left : right - center) + center * (center >= 0 ? center - bottom : top - center);
      const laplacian = this.vValue(column - 1, row, center, true) + this.vValue(column + 1, row, center, true) + bottom + top - 4 * center;
      this.nextV[index] = center + step * (-inverse * transport + this.viscosity * inverse ** 2 * laplacian);
    }
    this.u.set(this.nextU);
    this.v.set(this.nextV);
  }

  sample(x, y, previous = false) {
    const interpolate = (array, columns, rows, horizontal, vertical) => {
      const boundedX = Math.max(0, Math.min(columns - 1.000001, horizontal));
      const boundedY = Math.max(0, Math.min(rows - 1.000001, vertical));
      const column = Math.floor(boundedX);
      const row = Math.floor(boundedY);
      const fractionX = boundedX - column;
      const fractionY = boundedY - row;
      return (1 - fractionY) * ((1 - fractionX) * array[row * columns + column] + fractionX * array[row * columns + column + 1]) + fractionY * ((1 - fractionX) * array[(row + 1) * columns + column] + fractionX * array[(row + 1) * columns + column + 1]);
    };
    return [interpolate(previous ? this.previousU : this.u, this.columns + 1, this.rows, x / this.spacing, y / this.spacing - 0.5), interpolate(previous ? this.previousV : this.v, this.columns, this.rows + 1, x / this.spacing - 0.5, y / this.spacing)];
  }

  diagnostics() {
    let divergence = 0;
    let blockedVelocity = 0;
    let inlet = 0;
    let outlet = 0;
    for (let row = 0; row < this.rows; row++) {
      inlet += this.u[row * (this.columns + 1)];
      outlet += this.u[row * (this.columns + 1) + this.columns];
      for (let column = 0; column < this.columns; column++) if (this.cell(column, row)) divergence = Math.max(divergence, Math.abs(this.divergence(column, row)));
      for (let column = 0; column <= this.columns; column++) if (!this.openU(column, row)) blockedVelocity = Math.max(blockedVelocity, Math.abs(this.u[row * (this.columns + 1) + column]));
    }
    for (let row = 0; row <= this.rows; row++) for (let column = 0; column < this.columns; column++) if (!this.openV(column, row)) blockedVelocity = Math.max(blockedVelocity, Math.abs(this.v[row * this.columns + column]));
    return {divergence, blockedVelocity, inlet: inlet * this.spacing, outlet: outlet * this.spacing};
  }
}

function advanceTracer(position, step, sampleBefore, sampleAfter) {
  const before = sampleBefore(position[0], position[1]);
  const middle = [position[0] + before[0] * step / 2, position[1] + before[1] * step / 2];
  const oldMiddle = sampleBefore(...middle);
  const newMiddle = sampleAfter(...middle);
  return [position[0] + step * (oldMiddle[0] + newMiddle[0]) / 2, position[1] + step * (oldMiddle[1] + newMiddle[1]) / 2, position[2]];
}

function tracerSegmentBlocked(flow, before, after) {
  for (let part = 1; part <= 4; part++) {
    const horizontal = before[0] + (after[0] - before[0]) * part / 4;
    const vertical = before[1] + (after[1] - before[1]) * part / 4;
    if (!flow.cell(Math.floor(horizontal / flow.spacing), Math.floor(vertical / flow.spacing))) return true;
  }
  return false;
}

function buildWingMesh(flow, sections = 80) {
  const vertices = [];
  const cosine = Math.cos(flow.angle);
  const sine = Math.sin(flow.angle);
  const position = (fraction, side) => {
    const along = CHORD * (fraction - 0.5);
    const across = side * Math.max(0, thickness(fraction));
    return [flow.center[0] + along * cosine - across * sine, flow.center[1] + along * sine + across * cosine, 0];
  };
  const color = (fraction, side) => {
    const slope = fraction === 0 ? Infinity : 5 * 0.18 * (0.2969 / (2 * Math.sqrt(fraction)) - 0.126 - 0.7032 * fraction + 0.8529 * fraction ** 2 - 0.4144 * fraction ** 3);
    const length = Math.hypot(slope, 1);
    const horizontal = fraction === 0 ? -1 : -slope / length;
    const vertical = fraction === 0 ? 0 : side / length;
    const normalX = horizontal * cosine - vertical * sine;
    const normalY = horizontal * sine + vertical * cosine;
    const light = 0.30 + 0.65 * Math.max(0, -0.4 * normalX + 0.85 * normalY) + 0.18 * Math.max(0, 0.6 * normalX - 0.5 * normalY);
    return [0.72 * light, 0.83 * light, 0.89 * light, 1];
  };
  const vertex = (point, pigment) => vertices.push(...point, ...pigment);
  for (let section = 0; section < sections; section++) {
    const first = (1 - Math.cos(section * Math.PI / sections)) / 2;
    const second = (1 - Math.cos((section + 1) * Math.PI / sections)) / 2;
    for (const side of [-1, 1]) {
      vertex([...flow.center, 0], [0.60, 0.72, 0.80, 1]);
      vertex(position(first, side), color(first, side));
      vertex(position(second, side), color(second, side));
    }
  }
  return vertices;
}
function pressureLoads(flow) {
  const faces = [];
  const force = [0, 0];
  const spacing = flow.spacing;
  for (let row = 0; row < flow.rows; row++) for (let column = 0; column < flow.columns; column++) {
    if (flow.cell(column, row)) continue;
    for (const [normalX, normalY] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const fluidColumn = column + normalX;
      const fluidRow = row + normalY;
      if (!flow.cell(fluidColumn, fluidRow)) continue;
      const fluidIndex = fluidRow * flow.columns + fluidColumn;
      const pressure = flow.pressure[fluidIndex];
      const contribution = [-pressure * spacing * normalX, -pressure * spacing * normalY];
      force[0] += contribution[0];
      force[1] += contribution[1];
      faces.push({position: [(column + 0.5 + normalX / 2) * spacing, (row + 0.5 + normalY / 2) * spacing, 0], normal: [normalX, normalY], pressure, force: contribution, fluidIndex});
    }
  }
  return {faces, force, drag: force[0], lift: force[1]};
}

function pressureColor(pressure, range) {
  const fraction = Math.min(1, Math.abs(pressure) / range);
  const neutral = [0.13, 0.19, 0.24];
  const extreme = pressure < 0 ? [0.20, 0.59, 0.94] : [0.94, 0.39, 0.18];
  return neutral.map((value, index) => value + fraction * (extreme[index] - value));
}

function pressureField(flow) {
  let range = 1e-9;
  for (let index = 0; index < flow.pressure.length; index++) {
    if (flow.fluid[index]) range = Math.max(range, Math.abs(flow.pressure[index]));
  }
  const vertices = [];
  for (let row = 0; row < flow.rows; row++) for (let column = 0; column < flow.columns; column++) {
    const index = row * flow.columns + column;
    if (!flow.fluid[index]) continue;
    const color = [...pressureColor(flow.pressure[index], range), 0.68];
    for (const [offsetX, offsetY] of [[0, 0], [1, 0], [1, 1], [0, 0], [1, 1], [0, 1]]) {
      vertices.push((column + offsetX) * flow.spacing, (row + offsetY) * flow.spacing, 0, ...color);
    }
  }
  return {vertices, range};
}

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

} catch (failure) {
  const error = document.querySelector('#error');
  error.textContent = 'The experiment could not start: ' + failure.message;
  error.style.display = 'flex';
  console.error(failure);
}
})();
