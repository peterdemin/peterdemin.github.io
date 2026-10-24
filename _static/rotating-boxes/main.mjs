import {RotatingBoxes, SIDE, WIDTH, HEIGHT, vertices, mechanicalEnergy} from './physics.mjs';

const canvas = document.querySelector('#scene');
const context = canvas.getContext('2d');
if (!context) throw new Error('Canvas 2D is unavailable.');
const simulation = new RotatingBoxes(globalThis.planck);
const status = document.querySelector('#status');
const readout = document.querySelector('#readout');
const error = document.querySelector('#error');
let dark = matchMedia('(prefers-color-scheme: dark)').matches;
let last = null;

function view() {
  const rectangle = canvas.getBoundingClientRect();
  const scale = Math.min((rectangle.width - 40) / WIDTH, (rectangle.height - 64) / HEIGHT);
  return {rectangle, scale, left: (rectangle.width - WIDTH * scale) / 2, floor: (rectangle.height + HEIGHT * scale) / 2 - 6};
}

function draw() {
  const camera = view();
  const {width, height} = camera.rectangle;
  if (!width || !height) return;
  const ratio = Math.min(2, devicePixelRatio || 1);
  if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
  }
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.fillStyle = dark ? '#0c1725' : '#f0f4f8';
  context.fillRect(0, 0, width, height);
  const ink = dark ? '#b3c1d3' : '#4e657d';
  context.strokeStyle = ink;
  context.lineWidth = 2;
  context.strokeRect(camera.left, camera.floor - HEIGHT * camera.scale, WIDTH * camera.scale, HEIGHT * camera.scale);
  context.fillStyle = ink;
  context.font = '12px system-ui,sans-serif';
  context.textAlign = 'center';
  for (let metre = 0; metre <= WIDTH; metre++) context.fillText(metre + ' m', camera.left + metre * camera.scale, camera.floor + 22);
  const palette = ['#e9914f', '#75b9e0', '#82bf9e', '#bd96dc', '#e4bb62'];
  simulation.bodies.forEach((body, index) => {
    const corners = vertices(body).map(([horizontal, vertical]) => [camera.left + horizontal * camera.scale, camera.floor - vertical * camera.scale]);
    context.beginPath();
    context.moveTo(...corners[0]);
    corners.slice(1).forEach(point => context.lineTo(...point));
    context.closePath();
    context.fillStyle = palette[index % palette.length];
    context.fill();
    context.strokeStyle = '#31475b';
    context.lineWidth = 1.5;
    context.stroke();
    const marker = body.getWorldPoint({x: SIDE * 0.3, y: SIDE * 0.3});
    context.beginPath();
    context.arc(camera.left + marker.x * camera.scale, camera.floor - marker.y * camera.scale, 2.5, 0, Math.PI * 2);
    context.fillStyle = '#213547';
    context.fill();
  });
  if (!simulation.bodies.length) {
    context.fillStyle = ink;
    context.fillText('Click or tap to drop a box', width / 2, height / 2);
    context.fillText('Random orientation · no starting spin', width / 2, height / 2 + 24);
  }
  status.textContent = simulation.message;
  const asleep = simulation.bodies.filter(body => !body.isAwake()).length;
  const latest = simulation.bodies.at(-1);
  readout.textContent = `${simulation.bodies.length} boxes · ${asleep} sleeping · energy ${mechanicalEnergy(simulation.bodies).toFixed(2)} J` + (latest ? ` · newest angular velocity ${latest.getAngularVelocity().toFixed(2)} rad/s` : '');
  canvas.dataset.bodies = JSON.stringify(simulation.bodies.map(body => ({position: body.getPosition(), angle: body.getAngle(), velocity: body.getLinearVelocity(), angularVelocity: body.getAngularVelocity(), asleep: !body.isAwake()})));
  canvas.dataset.camera = JSON.stringify({left: camera.left, floor: camera.floor, scale: camera.scale});
  canvas.dataset.steps = simulation.lastSteps;
  canvas.dataset.dark = dark;
}

canvas.addEventListener('pointerdown', event => {
  if (event.isPrimary === false || (event.pointerType === 'mouse' && event.button !== 0)) return;
  const camera = view();
  const horizontal = (event.clientX - camera.rectangle.left - camera.left) / camera.scale;
  const vertical = (camera.floor - (event.clientY - camera.rectangle.top)) / camera.scale;
  if (horizontal < 0 || horizontal > WIDTH || vertical < 0 || vertical > HEIGHT) return;
  event.preventDefault();
  canvas.focus({preventScroll: true});
  simulation.spawn(horizontal, Math.max(2.3, vertical));
  draw();
}, {passive: false});
canvas.addEventListener('keydown', event => {
  if (event.code !== 'Space' && event.code !== 'Enter') return;
  event.preventDefault();
  simulation.spawn(WIDTH / 2);
  draw();
});
document.querySelector('#add').addEventListener('click', () => { simulation.spawn(WIDTH / 2); draw(); });
document.querySelector('#clear').addEventListener('click', () => { simulation.reset(); last = null; draw(); });
function frame(now) {
  try {
    simulation.advanceFrame(last === null ? 0 : (now - last) / 1000, document.hidden);
    last = document.hidden ? null : now;
    draw();
    requestAnimationFrame(frame);
  } catch (failure) {
    error.textContent = 'The box calculation stopped: ' + failure.message;
    error.style.display = 'flex';
    console.error(failure);
  }
}
document.addEventListener('visibilitychange', () => { last = null; simulation.accumulator = 0; });
window.addEventListener('message', event => {
  if (event.source !== parent || event.data?.type !== 'rotating-boxes-theme') return;
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
  parent.postMessage({type: 'rotating-boxes-size', height: Math.ceil(document.querySelector('main').getBoundingClientRect().height) + 2}, '*');
});
resize.observe(document.querySelector('main'));
parent.postMessage({type: 'rotating-boxes-ready'}, '*');
requestAnimationFrame(frame);
