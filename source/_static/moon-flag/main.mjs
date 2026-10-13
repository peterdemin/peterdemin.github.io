import {MoonFlag, STEP} from './physics.mjs';

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
