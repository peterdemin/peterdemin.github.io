import {Ball, GRAVITY, MASS, RADIUS, WIDTH, HEIGHT} from './physics.mjs';

const canvas = document.querySelector('#scene');
const context = canvas.getContext('2d');
if (!context) throw new Error('Canvas 2D is unavailable.');
const ball = new Ball();
const status = document.querySelector('#status');
const values = document.querySelector('#values');
const contact = document.querySelector('#contact');
const error = document.querySelector('#error');
let dark = matchMedia('(prefers-color-scheme: dark)').matches;
let last = null;
let pointer = null;
let offset = [0, 0];

function view() {
  const rectangle = canvas.getBoundingClientRect();
  const width = rectangle.width;
  const height = rectangle.height;
  const scale = Math.min((width - 64) / WIDTH, (height - 80) / HEIGHT);
  return {rectangle, width, height, scale, left: (width - WIDTH * scale) / 2, floor: (height + HEIGHT * scale) / 2 - 8};
}

function world(event) {
  const camera = view();
  return [(event.clientX - camera.rectangle.left - camera.left) / camera.scale, (camera.floor - event.clientY + camera.rectangle.top) / camera.scale];
}

function draw() {
  const camera = view();
  if (!camera.width || !camera.height) return;
  const ratio = Math.min(2, devicePixelRatio || 1);
  const width = Math.round(camera.width * ratio);
  const height = Math.round(camera.height * ratio);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.fillStyle = dark ? '#0c1725' : '#f0f4f8';
  context.fillRect(0, 0, camera.width, camera.height);
  const ink = dark ? '#b3c1d3' : '#4e657d';
  context.fillStyle = dark ? '#172738' : '#dbe5ee';
  context.fillRect(0, camera.floor, camera.width, camera.height - camera.floor);
  context.strokeStyle = ink;
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(camera.left, camera.floor);
  context.lineTo(camera.left + WIDTH * camera.scale, camera.floor);
  context.stroke();
  context.fillStyle = ink;
  context.font = '12px system-ui, sans-serif';
  context.textAlign = 'center';
  for (let metre = 0; metre <= WIDTH; metre++) {
    const horizontal = camera.left + metre * camera.scale;
    context.beginPath();
    context.moveTo(horizontal, camera.floor);
    context.lineTo(horizontal, camera.floor + 6);
    context.stroke();
    context.fillText(metre + ' m', horizontal, camera.floor + 23);
  }
  const center = [camera.left + ball.state[0] * camera.scale, camera.floor - ball.state[1] * camera.scale];
  const radius = RADIUS * camera.scale;
  context.fillStyle = ball.grabbed ? '#f6b66b' : '#e9914f';
  context.beginPath();
  context.arc(...center, radius, 0, 2 * Math.PI);
  context.fill();
  context.strokeStyle = dark ? '#ffdfaa' : '#9b5c27';
  context.lineWidth = 1.5;
  context.stroke();
  if (ball.grabbed || ball.resting) {
    context.setLineDash([4, 4]);
    context.beginPath();
    context.arc(...center, Math.max(radius + 7, 23), 0, 2 * Math.PI);
    context.stroke();
    context.setLineDash([]);
    context.fillStyle = ink;
    context.fillText(ball.grabbed ? 'Held' : 'Lift me', center[0], center[1] - Math.max(radius + 18, 36));
  }
  canvas.style.cursor = ball.grabbed ? 'grabbing' : 'grab';
  status.textContent = ball.grabbed ? 'Held — release to drop from rest.' : ball.resting ? 'Resting — floor reaction balances gravity. Drag to lift again.' : ball.state[3] > 0 ? 'Rising after impact.' : 'Falling under gravity.';
  const gap = Math.max(0, ball.state[1] - RADIUS);
  const energy = MASS * (ball.state[2] ** 2 + ball.state[3] ** 2) / 2 + MASS * GRAVITY * gap;
  values.textContent = `Center height: ${ball.state[1].toFixed(2)} m · vertical velocity: ${ball.state[3].toFixed(2)} m/s · energy above contact: ${energy.toFixed(3)} J · bounces: ${ball.bounces}`;
  contact.textContent = ball.lastImpact ? `Last contact: ${ball.lastImpact.incoming.toFixed(2)} → ${ball.lastImpact.outgoing.toFixed(2)} m/s · upward impulse ${ball.lastImpact.impulse.toFixed(3)} N s · cumulative collision loss ${ball.lostEnergy.toFixed(3)} J` : 'No impact since the last grab. Circle radius is constant; the dashed ring is only a grab guide.';
  canvas.dataset.state = JSON.stringify(ball.state);
  canvas.dataset.resting = ball.resting;
  canvas.dataset.grabbed = ball.grabbed;
  canvas.dataset.bounces = ball.bounces;
  canvas.dataset.time = ball.time;
  canvas.dataset.center = JSON.stringify(center);
  canvas.dataset.radius = radius;
  canvas.dataset.scale = camera.scale;
  canvas.dataset.floor = camera.floor;
  canvas.dataset.lostEnergy = ball.lostEnergy;
  canvas.dataset.pointerType = canvas.dataset.pointerType || 'none';
}

canvas.addEventListener('pointerdown', event => {
  if (pointer !== null || event.button !== 0) return;
  const position = world(event);
  const camera = view();
  if (Math.hypot(position[0] - ball.state[0], position[1] - ball.state[1]) * camera.scale > Math.max(RADIUS * camera.scale + 8, 24)) return;
  pointer = event.pointerId;
  offset = [ball.state[0] - position[0], ball.state[1] - position[1]];
  canvas.dataset.pointerType = event.pointerType;
  ball.grab();
  canvas.setPointerCapture(pointer);
  canvas.focus({preventScroll: true});
  draw();
  event.preventDefault();
});
canvas.addEventListener('pointermove', event => {
  if (event.pointerId !== pointer) return;
  const position = world(event);
  ball.move(position.map((value, index) => value + offset[index]));
  draw();
});
function release(event) {
  if (event.pointerId !== pointer) return;
  pointer = null;
  ball.release();
  draw();
}
canvas.addEventListener('pointerup', release);
canvas.addEventListener('pointercancel', release);
canvas.addEventListener('lostpointercapture', release);
canvas.addEventListener('keydown', event => {
  if (event.code === 'Space') {
    if (ball.grabbed) ball.release();
    else ball.grab();
  } else if (event.code === 'Escape') ball.release();
  else if (ball.grabbed && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.code)) {
    const movement = {ArrowLeft: [-0.15, 0], ArrowRight: [0.15, 0], ArrowUp: [0, 0.15], ArrowDown: [0, -0.15]}[event.code];
    ball.move([ball.state[0] + movement[0], ball.state[1] + movement[1]]);
  } else return;
  draw();
  event.preventDefault();
});

function frame(now) {
  try {
    ball.advanceFrame(last === null ? 0 : (now - last) / 1000, document.hidden);
    last = document.hidden ? null : now;
    draw();
    requestAnimationFrame(frame);
  } catch (failure) {
    error.textContent = 'The ball could not continue: ' + failure.message;
    error.style.display = 'flex';
    console.error(failure);
  }
}
document.addEventListener('visibilitychange', () => {
  last = null;
  ball.accumulator = 0;
});
window.addEventListener('message', event => {
  if (event.source !== parent || event.data?.type !== 'bouncing-ball-theme') return;
  for (const property of ['background', 'text', 'border', 'font']) {
    if (typeof event.data[property] === 'string' && event.data[property]) document.documentElement.style.setProperty('--book-' + property, event.data[property]);
  }
  dark = Boolean(event.data.dark);
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  draw();
});
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
  if (parent === window) dark = event.matches;
});
const resize = new ResizeObserver(() => {
  draw();
  parent.postMessage({type: 'bouncing-ball-size', height: Math.ceil(document.querySelector('main').getBoundingClientRect().height) + 2}, '*');
});
resize.observe(document.querySelector('main'));
parent.postMessage({type: 'bouncing-ball-ready'}, '*');
requestAnimationFrame(frame);
