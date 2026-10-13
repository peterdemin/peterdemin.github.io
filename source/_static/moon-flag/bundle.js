(() => {
'use strict';
try {
const GRAVITY = 1.62;
const MAX_STRETCH = 1.55;
const STEP = 1 / 120;
const EXTENSION_STIFFNESS = 35;
const COUPLING_STIFFNESS = 3.5;
const SHEAR_STIFFNESS = 0.35;
const BENDING_STIFFNESS = 0.2;
const DAMPING_RATE = 0.35;
const MODAL_STIFFNESSES = [(EXTENSION_STIFFNESS + COUPLING_STIFFNESS) / 2, (EXTENSION_STIFFNESS - COUPLING_STIFFNESS) / 2, SHEAR_STIFFNESS];
const MATERIAL_DIRECTIONS = ['warp', 'weft'];

function dot(first, second) {
  return first[0] * second[0] + first[1] * second[1] + first[2] * second[2];
}

function subtract(first, second, output = [0, 0, 0]) {
  for (let axis = 0; axis < 3; axis++) output[axis] = first[axis] - second[axis];
  return output;
}

function cross(first, second, output = [0, 0, 0]) {
  output[0] = first[1] * second[2] - first[2] * second[1];
  output[1] = first[2] * second[0] - first[0] * second[2];
  output[2] = first[0] * second[1] - first[1] * second[0];
  return output;
}

class MoonFlag {
  constructor({columns = 24, rows = 14, gravity = GRAVITY} = {}) {
    Object.assign(this, {columns, rows, gravity, width: 2.4, height: 1.4, top: 4});
    this.rest = [];
    this.triangles = [];
    this.elements = [];
    this.bends = [];
    this.pins = [];
    const node = (column, row) => row * (columns + 1) + column;
    for (let row = 0; row <= rows; row++) {
      for (let column = 0; column <= columns; column++) {
        this.rest.push([column * this.width / columns, this.top - row * this.height / rows, 0]);
        if (column === 0) this.pins.push(node(column, row));
      }
    }
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        const center = node(column, row);
        const right = node(column + 1, row);
        const below = node(column, row + 1);
        const opposite = node(column + 1, row + 1);
        this.triangles.push([center, right, below], [right, opposite, below]);
      }
    }
    this.mass = new Float64Array(this.rest.length);
    const edges = new Map();
    for (const nodes of this.triangles) {
      const first = this.rest[nodes[0]];
      const along = subtract(this.rest[nodes[1]], first);
      const across = subtract(this.rest[nodes[2]], first);
      const determinant = along[0] * across[1] - along[1] * across[0];
      const area = Math.abs(determinant) / 2;
      const warp = [-(across[1] - along[1]) / determinant, across[1] / determinant, -along[1] / determinant];
      const weft = [(across[0] - along[0]) / determinant, -across[0] / determinant, along[0] / determinant];
      this.elements.push({nodes, area, warp, weft, multipliers: [0, 0, 0], gradients: nodes.map(() => [0, 0, 0]), frame: {warp: [0, 0, 0], weft: [0, 0, 0]}});
      for (const index of nodes) this.mass[index] += 0.22 * area / 3;
      for (let side = 0; side < 3; side++) {
        const start = nodes[side];
        const end = nodes[(side + 1) % 3];
        const opposite = nodes[(side + 2) % 3];
        const key = [Math.min(start, end), Math.max(start, end)].join(':');
        const adjacent = edges.get(key);
        if (adjacent) {
          const length = Math.hypot(...subtract(this.rest[adjacent.end], this.rest[adjacent.start]));
          this.bends.push({nodes: [adjacent.start, adjacent.end, adjacent.opposite, opposite], weight: length * length / (area + adjacent.area), reference: 0, multiplier: 0, geometry: {vectors: Array.from({length: 6}, () => [0, 0, 0]), gradients: Array.from({length: 4}, () => [0, 0, 0])}});
        } else edges.set(key, {start, end, opposite, area});
      }
    }
    this.corner = node(columns, 0);
    this.reset();
  }

  reset() {
    this.positions = this.rest.map(point => [...point]);
    for (let index = 0; index < this.positions.length; index++) {
      const column = index % (this.columns + 1);
      const row = Math.floor(index / (this.columns + 1));
      this.positions[index][2] = 0.07 * Math.sin(Math.PI * column / this.columns) * Math.sin(Math.PI * row / this.rows);
    }
    this.velocities = this.rest.map(() => [0, 0, 0]);
    this.target = [...this.rest[this.corner]];
    this.held = true;
    this.limited = false;
    this.time = 0;
    this.rejectedSteps = 0;
    this.handSpeed = 2.4;
    this.weights = Float64Array.from(this.mass, mass => 1 / mass);
    this.restorePins();
  }

  restorePins() {
    for (const index of this.pins) {
      this.positions[index] = [...this.rest[index]];
      this.velocities[index] = [0, 0, 0];
      this.weights[index] = 0;
    }
    this.weights[this.corner] = this.held ? 0 : 1 / this.mass[this.corner];
  }

  grab() {
    this.held = true;
    this.target = [...this.positions[this.corner]];
    this.weights[this.corner] = 0;
  }

  pull(point) {
    if (!point.every(Number.isFinite)) return;
    const candidate = [...point];
    this.limited = false;
    for (let pass = 0; pass < 12; pass++) {
      for (const pin of this.pins) {
        const anchor = this.rest[pin];
        const radius = MAX_STRETCH * (Math.abs(this.rest[this.corner][0] - anchor[0]) + Math.abs(this.rest[this.corner][1] - anchor[1]));
        const offset = subtract(candidate, anchor);
        const distance = Math.hypot(...offset);
        if (distance > radius) {
          for (let axis = 0; axis < 3; axis++) candidate[axis] = anchor[axis] + offset[axis] * radius / distance;
          this.limited = true;
        }
      }
    }
    this.target = candidate;
  }

  release() {
    this.held = false;
    this.weights[this.corner] = 1 / this.mass[this.corner];
    this.limited = false;
  }

  materialFrame(element) {
    const frame = element.frame;
    const first = this.positions[element.nodes[0]];
    const second = this.positions[element.nodes[1]];
    const third = this.positions[element.nodes[2]];
    for (let axis = 0; axis < 3; axis++) {
      frame.warp[axis] = element.warp[0] * first[axis] + element.warp[1] * second[axis] + element.warp[2] * third[axis];
      frame.weft[axis] = element.weft[0] * first[axis] + element.weft[1] * second[axis] + element.weft[2] * third[axis];
    }
    frame.along = (dot(frame.warp, frame.warp) - 1) / 2;
    frame.across = (dot(frame.weft, frame.weft) - 1) / 2;
    frame.shear = dot(frame.warp, frame.weft);
    return frame;
  }

  membraneConstraint(element, mode) {
    const frame = this.materialFrame(element);
    const sign = mode === 1 ? -1 : 1;
    for (let local = 0; local < 3; local++) {
      for (let axis = 0; axis < 3; axis++) {
        element.gradients[local][axis] = mode === 2
          ? element.warp[local] * frame.weft[axis] + element.weft[local] * frame.warp[axis]
          : element.warp[local] * frame.warp[axis] + sign * element.weft[local] * frame.weft[axis];
      }
    }
    return mode === 2 ? frame.shear : frame.along + sign * frame.across;
  }

  projectConstraint(nodes, gradients, value, compliance, multiplier) {
    let denominator = compliance;
    for (let local = 0; local < nodes.length; local++) denominator += this.weights[nodes[local]] * dot(gradients[local], gradients[local]);
    if (denominator < 1e-15) return 0;
    const correction = (-value - compliance * multiplier) / denominator;
    for (let local = 0; local < nodes.length; local++) {
      const position = this.positions[nodes[local]];
      for (let axis = 0; axis < 3; axis++) position[axis] += this.weights[nodes[local]] * correction * gradients[local][axis];
    }
    return correction;
  }

  membraneCorrection(element, timestep) {
    for (let mode = 0; mode < 3; mode++) {
      const value = this.membraneConstraint(element, mode);
      const compliance = 1 / (element.area * MODAL_STIFFNESSES[mode] * timestep * timestep);
      element.multipliers[mode] += this.projectConstraint(element.nodes, element.gradients, value, compliance, element.multipliers[mode]);
    }
  }

  limitCorrection(element) {
    for (const direction of MATERIAL_DIRECTIONS) {
      const frame = this.materialFrame(element);
      const length = Math.hypot(...frame[direction]);
      if (length <= MAX_STRETCH) continue;
      for (let local = 0; local < 3; local++) for (let axis = 0; axis < 3; axis++) element.gradients[local][axis] = element[direction][local] * frame[direction][axis] / length;
      this.projectConstraint(element.nodes, element.gradients, length - MAX_STRETCH, 0, 0);
    }
  }

  hingeGeometry(bend) {
    const first = this.positions[bend.nodes[0]];
    const geometry = bend.geometry;
    const [edge, across, other, firstNormal, secondNormal, normalCross] = geometry.vectors;
    subtract(this.positions[bend.nodes[1]], first, edge);
    subtract(this.positions[bend.nodes[2]], first, across);
    subtract(this.positions[bend.nodes[3]], first, other);
    cross(edge, across, firstNormal);
    cross(other, edge, secondNormal);
    const squaredLength = dot(edge, edge);
    const firstArea = dot(firstNormal, firstNormal);
    const secondArea = dot(secondNormal, secondNormal);
    if (Math.min(squaredLength, firstArea, secondArea) < 1e-20) return null;
    const length = Math.sqrt(squaredLength);
    const sine = dot(edge, cross(firstNormal, secondNormal, normalCross)) / length;
    geometry.angle = Math.atan2(sine, dot(firstNormal, secondNormal));
    const thirdFraction = dot(across, edge) / squaredLength;
    const fourthFraction = dot(other, edge) / squaredLength;
    for (let axis = 0; axis < 3; axis++) {
      const third = -length * firstNormal[axis] / firstArea;
      const fourth = -length * secondNormal[axis] / secondArea;
      geometry.gradients[2][axis] = third;
      geometry.gradients[3][axis] = fourth;
      geometry.gradients[0][axis] = (thirdFraction - 1) * third + (fourthFraction - 1) * fourth;
      geometry.gradients[1][axis] = -thirdFraction * third - fourthFraction * fourth;
    }
    return geometry;
  }

  bendingCorrection(bend, timestep) {
    const geometry = this.hingeGeometry(bend);
    if (!geometry) return;
    const compliance = 1 / (BENDING_STIFFNESS * bend.weight * timestep * timestep);
    bend.multiplier += this.projectConstraint(bend.nodes, geometry.gradients, geometry.angle - bend.reference, compliance, bend.multiplier);
  }

  membraneEnergy() {
    let energy = 0;
    for (const element of this.elements) {
      const {along, across, shear} = this.materialFrame(element);
      energy += element.area * (EXTENSION_STIFFNESS * (along * along + across * across) + 2 * COUPLING_STIFFNESS * along * across + SHEAR_STIFFNESS * shear * shear) / 2;
    }
    return energy;
  }

  bendingEnergy() {
    let energy = 0;
    for (const bend of this.bends) {
      const geometry = this.hingeGeometry(bend);
      if (geometry) energy += BENDING_STIFFNESS * bend.weight * (geometry.angle - bend.reference) ** 2 / 2;
    }
    return energy;
  }

  maximumStretch() {
    let maximum = 1;
    for (const element of this.elements) {
      const frame = this.materialFrame(element);
      maximum = Math.max(maximum, Math.hypot(...frame.warp), Math.hypot(...frame.weft));
    }
    return maximum;
  }

  center() {
    const result = [0, 0, 0];
    const total = this.mass.reduce((sum, value) => sum + value, 0);
    for (let index = 0; index < this.positions.length; index++) for (let axis = 0; axis < 3; axis++) result[axis] += this.positions[index][axis] * this.mass[index] / total;
    return result;
  }

  step(timestep = STEP) {
    const previous = this.positions.map(point => [...point]);
    const velocities = this.velocities.map(velocity => [...velocity]);
    const damping = Math.exp(-DAMPING_RATE * timestep);
    for (let index = 0; index < this.positions.length; index++) {
      if (!this.weights[index]) continue;
      this.velocities[index][1] -= this.gravity * timestep;
      for (let axis = 0; axis < 3; axis++) {
        this.velocities[index][axis] *= damping;
        this.positions[index][axis] += this.velocities[index][axis] * timestep;
      }
    }
    if (this.held) {
      const corner = this.positions[this.corner];
      const offset = subtract(this.target, corner);
      const distance = Math.hypot(...offset);
      const fraction = distance > 0 ? Math.min(1, this.handSpeed * timestep / distance) : 0;
      for (let axis = 0; axis < 3; axis++) corner[axis] += offset[axis] * fraction;
    }
    for (const element of this.elements) element.multipliers.fill(0);
    for (const bend of this.bends) bend.multiplier = 0;
    for (let sweep = 0; sweep < 12; sweep++) {
      for (const element of this.elements) this.membraneCorrection(element, timestep);
      for (const bend of this.bends) this.bendingCorrection(bend, timestep);
      for (const element of this.elements) this.limitCorrection(element);
    }
    let stretch = this.maximumStretch();
    for (let sweep = 0; stretch > MAX_STRETCH + 0.0001 && sweep < 60; sweep++) {
      for (const element of this.elements) this.limitCorrection(element);
      stretch = this.maximumStretch();
    }
    const finite = this.positions.every(point => point.every(Number.isFinite));
    if (!finite || stretch > MAX_STRETCH + 0.0001) {
      this.positions = previous;
      this.velocities = velocities.map(velocity => velocity.map(value => value * 0.5));
      this.rejectedSteps++;
      this.limited = true;
      if (this.held) this.handSpeed = Math.max(0.015, this.handSpeed * 0.5);
    } else {
      for (let index = 0; index < this.positions.length; index++) for (let axis = 0; axis < 3; axis++) this.velocities[index][axis] = (this.positions[index][axis] - previous[index][axis]) / timestep;
      this.time += timestep;
      this.handSpeed = Math.min(2.4, this.handSpeed * 1.02);
    }
    this.restorePins();
  }
}

if (document.documentElement.classList.contains('embedded') && parent !== window) {
  window.addEventListener('message', event => {
    if (event.source !== parent || event.data?.type !== 'moon-flag-theme') return;
    for (const name of ['background', 'text', 'border', 'button-hover', 'font']) {
      const value = event.data[name];
      if (typeof value === 'string' && value) document.documentElement.style.setProperty('--book-' + name, value);
    }
    document.documentElement.style.colorScheme = event.data.dark ? 'dark' : 'light';
  });
  parent.postMessage({type: 'moon-flag-ready'}, '*');
  const synchronizeTheme = () => {
    try {
      const root = parent.document.documentElement;
      const theme = getComputedStyle(root);
      const variables = {
        '--book-background': '--sy-c-background',
        '--book-text': '--sy-c-text',
        '--book-border': '--sy-c-heading',
        '--book-button-hover': '--sy-c-foot-background',
      };
      for (const [target, source] of Object.entries(variables)) {
        const value = theme.getPropertyValue(source).trim();
        if (value) document.documentElement.style.setProperty(target, value);
      }
      document.documentElement.style.setProperty('--book-font', getComputedStyle(parent.document.body).fontFamily);
      document.documentElement.style.colorScheme = root.classList.contains('dark') ? 'dark' : 'light';
    } catch {
      document.documentElement.style.colorScheme = 'light dark';
    }
  };
  synchronizeTheme();
  try {
    const observer = new MutationObserver(synchronizeTheme);
    observer.observe(parent.document.documentElement, {attributes: true, attributeFilter: ['class', 'style', 'data-color-mode']});
    window.addEventListener('pagehide', () => observer.disconnect(), {once: true});
  } catch {
    document.documentElement.style.colorScheme = 'light dark';
  }
}

const canvas = document.querySelector('#scene');
const handle = document.querySelector('#handle');
const label = document.querySelector('#handle-label');
const status = document.querySelector('#status');
const stretchOutput = document.querySelector('#stretch');
const releaseButton = document.querySelector('#release');
const error = document.querySelector('#error');
const simulation = new MoonFlag();
const gl = canvas.getContext('webgl', {antialias: true, alpha: false});

function fail(message) {
  error.textContent = message;
  error.style.display = 'flex';
  handle.hidden = true;
  label.hidden = true;
}

if (!gl) {
  fail('WebGL is unavailable. Open this page in a browser with hardware acceleration enabled.');
  throw new Error('WebGL unavailable');
}

const vertexSource = `attribute vec3 position; attribute vec3 normal; attribute vec2 material; uniform mat4 camera; varying vec3 surfaceNormal; varying vec2 fabric; void main(){gl_Position=camera*vec4(position,1.0);surfaceNormal=normal;fabric=material;}`;
const fragmentSource = `precision mediump float; varying vec3 surfaceNormal; varying vec2 fabric; uniform float cloth; void main(){vec3 direction=normalize(surfaceNormal); if(!gl_FrontFacing) direction=-direction; vec3 keyDirection=normalize(vec3(-0.8,0.9,0.6)); float key=max(0.0,dot(direction,keyDirection)); float fill=max(0.0,dot(direction,normalize(vec3(0.8,-0.2,-0.7)))); float light=0.24+0.76*key+0.3*fill; float highlight=0.20*pow(max(0.0,dot(direction,normalize(keyDirection+vec3(0.0,0.0,1.0)))),18.0); vec3 pigment=vec3(0.16,0.61,0.65); if(fabric.y>0.42&&fabric.y<0.58) pigment=vec3(0.91,0.69,0.32); if(fabric.x<0.17) pigment=vec3(0.1,0.34,0.43); vec2 grid=abs(fract(fabric*vec2(24.0,14.0))-0.5); float thread=step(0.475,max(grid.x,grid.y)); pigment*=1.0-0.11*thread; if(cloth<0.5) pigment=vec3(0.5,0.6,0.66);gl_FragColor=vec4(pigment*light+vec3(highlight),1.0);}`;

function shader(type, source) {
  const result = gl.createShader(type);
  gl.shaderSource(result, source);
  gl.compileShader(result);
  if (!gl.getShaderParameter(result, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(result));
  return result;
}

const program = gl.createProgram();
try {
  gl.attachShader(program, shader(gl.VERTEX_SHADER, vertexSource));
  gl.attachShader(program, shader(gl.FRAGMENT_SHADER, fragmentSource));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
} catch (failure) {
  fail('The scene could not start: ' + failure.message);
  throw failure;
}
gl.useProgram(program);
gl.enable(gl.DEPTH_TEST);
gl.clearColor(0.032, 0.052, 0.08, 1);
const buffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
for (const [name, size, offset] of [['position', 3, 0], ['normal', 3, 12], ['material', 2, 24]]) {
  const location = gl.getAttribLocation(program, name);
  gl.enableVertexAttribArray(location);
  gl.vertexAttribPointer(location, size, gl.FLOAT, false, 32, offset);
}
const cameraUniform = gl.getUniformLocation(program, 'camera');
const clothUniform = gl.getUniformLocation(program, 'cloth');
let view = {width: 6, height: 5, center: [1.65, 2.5]};
let previousTime = 0;
let accumulator = 0;
let dragging = null;
let dragOffset = [0, 0];
let lastStatus = '';
let running = true;

function project(point) {
  const perspective = 1 - point[2] / 8;
  return [(0.5 + (point[0] - view.center[0]) / (view.width * perspective)) * canvas.clientWidth, (0.5 - (point[1] - view.center[1]) / (view.height * perspective)) * canvas.clientHeight];
}

function unproject(clientX, clientY) {
  const bounds = canvas.getBoundingClientRect();
  const depth = simulation.positions[simulation.corner][2];
  const perspective = 1 - depth / 8;
  return [view.center[0] + ((clientX - bounds.left) / bounds.width - 0.5) * view.width * perspective, view.center[1] - ((clientY - bounds.top) / bounds.height - 0.5) * view.height * perspective, depth];
}

function appendVertex(vertices, point, normal, material) {
  vertices.push(...point, ...normal, ...material);
}

function draw(vertices, cloth) {
  gl.uniform1f(clothUniform, cloth);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);
  gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 8);
}

function render() {
  const resolution = Math.min(devicePixelRatio || 1, 2);
  const width = Math.round(canvas.clientWidth * resolution);
  const height = Math.round(canvas.clientHeight * resolution);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  const aspect = canvas.clientWidth / canvas.clientHeight;
  view = {width: Math.max(4.9, 4.7 * aspect), height: Math.max(4.7, 4.9 / aspect), center: [1.65, 2.4]};
  const camera = new Float32Array([2 / view.width, 0, 0, 0, 0, 2 / view.height, 0, 0, 0, 0, -0.1, -1 / 8, -2 * view.center[0] / view.width, -2 * view.center[1] / view.height, 0, 1]);
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.uniformMatrix4fv(cameraUniform, false, camera);
  const pole = [];
  for (let segment = 0; segment < 16; segment++) {
    const angle = segment * Math.PI / 8;
    const nextAngle = (segment + 1) * Math.PI / 8;
    const normal = [Math.cos(angle), 0, Math.sin(angle)];
    const nextNormal = [Math.cos(nextAngle), 0, Math.sin(nextAngle)];
    const first = [0.035 * normal[0], 0.1, 0.035 * normal[2] - 0.045];
    const second = [0.035 * nextNormal[0], 0.1, 0.035 * nextNormal[2] - 0.045];
    const third = [second[0], 4.2, second[2]];
    const fourth = [first[0], 4.2, first[2]];
    for (const [point, faceNormal] of [[first, normal], [second, nextNormal], [third, nextNormal], [first, normal], [third, nextNormal], [fourth, normal]]) appendVertex(pole, point, faceNormal, [0, 0]);
  }
  draw(pole, 0);
  const normals = simulation.positions.map(() => [0, 0, 0]);
  for (const triangle of simulation.triangles) {
    const first = simulation.positions[triangle[0]];
    const second = simulation.positions[triangle[1]];
    const third = simulation.positions[triangle[2]];
    const across = second.map((value, axis) => value - first[axis]);
    const down = third.map((value, axis) => value - first[axis]);
    const normal = [across[1] * down[2] - across[2] * down[1], across[2] * down[0] - across[0] * down[2], across[0] * down[1] - across[1] * down[0]];
    for (const node of triangle) for (let axis = 0; axis < 3; axis++) normals[node][axis] += normal[axis];
  }
  for (const normal of normals) {
    const magnitude = Math.hypot(...normal);
    if (magnitude > 1e-10) for (let axis = 0; axis < 3; axis++) normal[axis] /= magnitude;
    else normal[2] = 1;
  }
  const cloth = [];
  for (const triangle of simulation.triangles) for (const node of triangle) {
    const column = node % (simulation.columns + 1);
    const row = Math.floor(node / (simulation.columns + 1));
    appendVertex(cloth, simulation.positions[node], normals[node], [column / simulation.columns, row / simulation.rows]);
  }
  draw(cloth, 1);
  const corner = project(simulation.positions[simulation.corner]);
  handle.style.left = corner[0] + 'px';
  handle.style.top = corner[1] + 'px';
  const labelRight = corner[0] < canvas.clientWidth - 150;
  label.style.left = (labelRight ? corner[0] + 30 : corner[0] - 30) + 'px';
  label.style.top = corner[1] + 'px';
  label.style.transform = labelRight ? 'translate(0,-50%)' : 'translate(-100%,-50%)';
  label.textContent = simulation.limited ? 'stretch limit' : dragging !== null ? 'let go to release' : simulation.held ? 'drag this corner' : 'grab again';
  const message = simulation.limited ? 'Stretch limit reached' : simulation.held ? 'Corner held, ready to pull' : 'Released · lunar gravity';
  if (message !== lastStatus) {
    status.textContent = message;
    lastStatus = message;
  }
  handle.setAttribute('aria-pressed', String(simulation.held));
  releaseButton.textContent = simulation.held ? 'Let go' : 'Hold corner';
  stretchOutput.textContent = 'Thread stretch: ' + Math.round((simulation.maximumStretch() - 1) * 100) + '% / 55% limit';
}

function finishDrag(pointerId = dragging) {
  if (dragging === null || pointerId !== dragging) return;
  const captured = dragging;
  dragging = null;
  handle.classList.remove('dragging');
  simulation.release();
  if (handle.hasPointerCapture(captured)) handle.releasePointerCapture(captured);
}

handle.addEventListener('pointerdown', event => {
  if (dragging !== null || (event.pointerType === 'mouse' && event.button !== 0)) return;
  event.preventDefault();
  simulation.grab();
  const mapped = unproject(event.clientX, event.clientY);
  dragOffset = [simulation.target[0] - mapped[0], simulation.target[1] - mapped[1]];
  dragging = event.pointerId;
  handle.setPointerCapture(event.pointerId);
  handle.classList.add('dragging');
  handle.focus({preventScroll: true});
});
handle.addEventListener('pointermove', event => {
  if (event.pointerId !== dragging) return;
  const target = unproject(event.clientX, event.clientY);
  target[0] += dragOffset[0];
  target[1] += dragOffset[1];
  simulation.pull(target);
});
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) handle.addEventListener(type, event => finishDrag(event.pointerId));
window.addEventListener('blur', () => finishDrag());
document.addEventListener('visibilitychange', () => {
  if (document.hidden) finishDrag();
  previousTime = 0;
  accumulator = 0;
});
handle.addEventListener('keydown', event => {
  if (event.code === 'Space' || event.code === 'Enter') {
    event.preventDefault();
    if (simulation.held) simulation.release();
    else simulation.grab();
  } else if (event.code === 'Escape') {
    finishDrag();
    simulation.release();
  } else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.code)) {
    event.preventDefault();
    if (!simulation.held) simulation.grab();
    const target = [...simulation.target];
    target[0] += event.code === 'ArrowRight' ? 0.12 : event.code === 'ArrowLeft' ? -0.12 : 0;
    target[1] += event.code === 'ArrowUp' ? 0.12 : event.code === 'ArrowDown' ? -0.12 : 0;
    simulation.pull(target);
  }
});
releaseButton.addEventListener('click', () => {
  const wasHeld = simulation.held;
  finishDrag();
  if (wasHeld) simulation.release();
  else simulation.grab();
});
document.querySelector('#reset').addEventListener('click', () => {
  finishDrag();
  simulation.reset();
  accumulator = 0;
});

function animate(timestamp) {
  if (!running) return;
  const elapsed = previousTime ? Math.min((timestamp - previousTime) / 1000, 0.05) : 0;
  previousTime = timestamp;
  accumulator += elapsed;
  let steps = 0;
  while (accumulator >= STEP && steps < 6) {
    simulation.step();
    accumulator -= STEP;
    steps++;
  }
  if (steps === 6) accumulator = 0;
  render();
  requestAnimationFrame(animate);
}
canvas.addEventListener('webglcontextlost', event => {
  event.preventDefault();
  running = false;
  fail('The graphics context was lost. Reload this page to restart the experiment.');
});
render();
requestAnimationFrame(animate);

} catch (failure) {
  const error = document.querySelector('#error');
  error.textContent = 'The scene could not start: ' + failure.message;
  error.style.display = 'flex';
  document.querySelector('#handle').hidden = true;
  document.querySelector('#handle-label').hidden = true;
  console.error(failure);
}
})();
