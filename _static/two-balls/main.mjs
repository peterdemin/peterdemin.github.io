import {TwoBalls, RADIUS, WIDTH, HEIGHT, energy} from './physics.mjs';
import {worldPoint, orangeHit} from './interaction.mjs';

const canvas = document.querySelector('#scene');
const context = canvas.getContext('2d');
if (!context) throw new Error('Canvas 2D is unavailable.');
const simulation = new TwoBalls();
const releaseButton = document.querySelector('#release');
const resetButton = document.querySelector('#reset');
const status = document.querySelector('#status');
const velocities = document.querySelector('#velocities');
const impactText = document.querySelector('#impact');
const error = document.querySelector('#error');
let dark = matchMedia('(prefers-color-scheme: dark)').matches;
let pointer = null;
let hovering = false;
let offset = [0, 0];
let last = null;

function view() {
  const rectangle = canvas.getBoundingClientRect();
  const scale = Math.min((rectangle.width - 64) / WIDTH, (rectangle.height - 80) / HEIGHT);
  return {rectangle, scale, left: (rectangle.width - WIDTH * scale) / 2, floor: (rectangle.height + HEIGHT * scale) / 2 - 8};
}

function draw() {
  const camera = view();
  const width = camera.rectangle.width;
  const height = camera.rectangle.height;
  if (!width || !height) return;
  const ratio = Math.min(2, devicePixelRatio || 1);
  if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
  }
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.fillStyle = dark ? '#0c1725' : '#f0f4f8';
  context.fillRect(0, 0, width, height);
  context.fillStyle = dark ? '#172738' : '#dbe5ee';
  context.fillRect(0, camera.floor, width, height - camera.floor);
  const ink = dark ? '#b3c1d3' : '#4e657d';
  context.strokeStyle = ink;
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(camera.left, camera.floor - HEIGHT * camera.scale);
  context.lineTo(camera.left, camera.floor);
  context.lineTo(camera.left + WIDTH * camera.scale, camera.floor);
  context.lineTo(camera.left + WIDTH * camera.scale, camera.floor - HEIGHT * camera.scale);
  context.stroke();
  context.font = '12px system-ui,sans-serif';
  context.textAlign = 'center';
  context.fillStyle = ink;
  for (let metre = 0; metre <= WIDTH; metre++) context.fillText(metre + ' m', camera.left + metre * camera.scale, camera.floor + 23);
  const centers = simulation.bodies.map(body => [camera.left + body.position[0] * camera.scale, camera.floor - body.position[1] * camera.scale]);
  simulation.bodies.forEach((body, index) => {
    context.fillStyle = index === 0 ? '#e9914f' : '#75b9e0';
    context.beginPath();
    context.arc(...centers[index], body.radius * camera.scale, 0, 2 * Math.PI);
    context.fill();
    context.strokeStyle = dark ? '#d8e3ed' : '#46607a';
    context.lineWidth = 1;
    context.stroke();
    context.fillStyle = '#213547';
    context.fillText(index === 0 ? 'A' : 'B', centers[index][0], centers[index][1] + 4);
    if (index === 0) {
      context.setLineDash([4, 4]);
      context.beginPath();
      context.arc(...centers[index], Math.max(24, body.radius * camera.scale + 8), 0, 2 * Math.PI);
      context.stroke();
      context.setLineDash([]);
      context.fillStyle = ink;
      context.fillText(pointer !== null ? 'Held' : 'Pick me', centers[index][0], centers[index][1] - Math.max(36, body.radius * camera.scale + 18));
    }
  });
  releaseButton.disabled = !simulation.bodies[0].held;
  canvas.style.cursor = pointer !== null ? 'grabbing' : hovering ? 'grab' : 'default';
  const stopped = simulation.bodies.every(body => Math.hypot(...body.velocity) < 1e-8);
  status.textContent = simulation.bodies[0].held ? 'Orange A is held. Release it or drag to change the offset; blue B has finite mass.' : stopped ? 'Both velocities are currently zero — reset or lift orange again.' : 'Both disks are free to respond to contacts, gravity and floor resistance.';
  velocities.textContent = simulation.bodies.map((body, index) => `${index === 0 ? 'Orange A' : 'Blue B'} velocity: (${body.velocity[0].toFixed(2)}, ${body.velocity[1].toFixed(2)}) m/s`).join(' · ') + ` · energy ${energy(simulation.bodies).toFixed(3)} J`;
  impactText.textContent = `Pair impacts: ${simulation.pairHits} · wall impacts: ${simulation.wallHits}` + (simulation.firstPair ? ` · first shared-impact horizontal velocities: ${simulation.firstPair[0][0].toFixed(2)} / ${simulation.firstPair[1][0].toFixed(2)} m/s` : ' · no shared impact yet');
  canvas.dataset.bodies = JSON.stringify(simulation.bodies);
  canvas.dataset.centers = JSON.stringify(centers);
  canvas.dataset.radius = RADIUS * camera.scale;
  canvas.dataset.time = simulation.time;
  canvas.dataset.pairHits = simulation.pairHits;
  canvas.dataset.wallHits = simulation.wallHits;
  canvas.dataset.firstPair = JSON.stringify(simulation.firstPair);
  canvas.dataset.energy = energy(simulation.bodies);
  canvas.dataset.retries = simulation.retries;
  canvas.dataset.pointerActive = pointer !== null;
}

function position(event) {
  const camera = view();
  return worldPoint(camera, event.clientX, event.clientY);
}

canvas.addEventListener('pointerdown', event => {
  if (pointer !== null || event.isPrimary === false || (event.pointerType === 'mouse' && event.button !== 0)) return;
  const candidate = position(event);
  const body = simulation.bodies[0];
  if (!orangeHit(simulation.bodies, view(), candidate)) return;
  event.preventDefault();
  pointer = event.pointerId;
  hovering = true;
  offset = body.position.map((value, axis) => value - candidate[axis]);
  simulation.grab();
  canvas.setPointerCapture(pointer);
  canvas.focus({preventScroll: true});
  canvas.dataset.pointerType = event.pointerType;
  draw();
}, {passive: false});
canvas.addEventListener('pointermove', event => {
  hovering = orangeHit(simulation.bodies, view(), position(event));
  if (event.pointerId !== pointer) return;
  simulation.move(position(event).map((value, axis) => value + offset[axis]));
  draw();
});
canvas.addEventListener('pointerleave', () => { hovering = false; });
function clearPointer() {
  const captured = pointer;
  pointer = null;
  if (captured !== null && canvas.hasPointerCapture(captured)) canvas.releasePointerCapture(captured);
}
function release(event) {
  if (event.pointerId !== pointer) return;
  if (event.type === 'lostpointercapture' && canvas.hasPointerCapture(event.pointerId)) return;
  clearPointer();
  simulation.release();
  hovering = orangeHit(simulation.bodies, view(), position(event));
  draw();
}
canvas.addEventListener('pointerup', release);
canvas.addEventListener('pointercancel', release);
canvas.addEventListener('lostpointercapture', release);
canvas.addEventListener('keydown', event => {
  if (event.code === 'Space') {
    if (simulation.bodies[0].held) { clearPointer(); simulation.release(); }
    else simulation.grab();
  } else if (event.code === 'Escape') { clearPointer(); simulation.release(); }
  else if (simulation.bodies[0].held && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.code)) {
    const movement = {ArrowLeft: [-0.05, 0], ArrowRight: [0.05, 0], ArrowUp: [0, 0.1], ArrowDown: [0, -0.1]}[event.code];
    simulation.move(simulation.bodies[0].position.map((value, axis) => value + movement[axis]));
  } else return;
  event.preventDefault();
  draw();
});
releaseButton.addEventListener('click', () => { clearPointer(); simulation.release(); draw(); });
resetButton.addEventListener('click', () => {
  clearPointer();
  hovering = false;
  simulation.reset();
  last = null;
  draw();
});

function frame(now) {
  try {
    simulation.advanceFrame(last === null ? 0 : (now - last) / 1000, document.hidden);
    last = document.hidden ? null : now;
    draw();
    requestAnimationFrame(frame);
  } catch (failure) {
    error.textContent = 'The two-ball calculation stopped: ' + failure.message;
    error.style.display = 'flex';
    console.error(failure);
  }
}
document.addEventListener('visibilitychange', () => { last = null; simulation.accumulator = 0; });
window.addEventListener('message', event => {
  if (event.source !== parent || event.data?.type !== 'two-balls-theme') return;
  for (const property of ['background', 'text', 'border', 'font']) {
    if (typeof event.data[property] === 'string' && event.data[property]) document.documentElement.style.setProperty('--book-' + property, event.data[property]);
  }
  dark = Boolean(event.data.dark);
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  draw();
});
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => { if (parent === window) dark = event.matches; });
const resize = new ResizeObserver(() => {
  draw();
  parent.postMessage({type: 'two-balls-size', height: Math.ceil(document.querySelector('main').getBoundingClientRect().height) + 2}, '*');
});
resize.observe(document.querySelector('main'));
parent.postMessage({type: 'two-balls-ready'}, '*');
requestAnimationFrame(frame);
