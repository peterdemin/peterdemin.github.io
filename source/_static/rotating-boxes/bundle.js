(() => {
'use strict';
try {
const SIDE = 0.35;
const MASS = 1;
const WIDTH = 4;
const HEIGHT = 3;
const STEP = 1 / 240;
const RESTITUTION = 0.25;
const FRICTION = 0.6;

function vertices(body) {
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([horizontal, vertical]) => {
    const point = body.getWorldPoint({x: horizontal * SIDE / 2, y: vertical * SIDE / 2});
    return [point.x, point.y];
  });
}

function mechanicalEnergy(bodies, gravity = 9.81) {
  return bodies.reduce((total, body) => {
    const velocity = body.getLinearVelocity();
    return total + body.getMass() * (0.5 * (velocity.x ** 2 + velocity.y ** 2) + gravity * body.getPosition().y) + 0.5 * body.getInertia() * body.getAngularVelocity() ** 2;
  }, 0);
}

class RotatingBoxes {
  constructor(engine, random = Math.random, gravity = 9.81) {
    this.engine = engine;
    this.random = random;
    this.gravity = gravity;
    this.reset();
  }

  reset() {
    const {World, Vec2, Box} = this.engine;
    this.world = new World({gravity: Vec2(0, -this.gravity), allowSleep: true, warmStarting: true, continuousPhysics: true});
    this.bodies = [];
    this.time = 0;
    this.accumulator = 0;
    this.lastSteps = 0;
    this.message = 'Click or tap inside the scene to drop a box.';
    const boundary = this.world.createBody();
    const material = {friction: FRICTION, restitution: RESTITUTION};
    boundary.createFixture(Box(WIDTH / 2, 0.1, Vec2(WIDTH / 2, -0.1)), material);
    boundary.createFixture(Box(0.1, HEIGHT / 2, Vec2(-0.1, HEIGHT / 2)), material);
    boundary.createFixture(Box(0.1, HEIGHT / 2, Vec2(WIDTH + 0.1, HEIGHT / 2)), material);
    boundary.createFixture(Box(WIDTH / 2, 0.1, Vec2(WIDTH / 2, HEIGHT + 0.1)), material);
  }

  createBox(horizontal, vertical, angle = 0) {
    const {Vec2, Box} = this.engine;
    const body = this.world.createDynamicBody({position: Vec2(horizontal, vertical), angle, linearVelocity: Vec2(0, 0), angularVelocity: 0, bullet: true, linearDamping: 0, angularDamping: 0});
    body.createFixture(Box(SIDE / 2, SIDE / 2), {density: MASS / SIDE ** 2, friction: FRICTION, restitution: RESTITUTION});
    this.bodies.push(body);
    return body;
  }

  spawn(horizontal, requestedHeight = 2.5) {
    if (!Number.isFinite(horizontal) || !Number.isFinite(requestedHeight)) return false;
    const angle = this.random() * Math.PI * 2;
    const extent = SIDE / 2 * (Math.abs(Math.cos(angle)) + Math.abs(Math.sin(angle)));
    const margin = extent + 0.035;
    const positionX = Math.max(margin, Math.min(WIDTH - margin, horizontal));
    const initialHeight = Math.max(margin, Math.min(HEIGHT - margin, requestedHeight));
    const shape = this.engine.Box(SIDE / 2 + 0.025, SIDE / 2 + 0.025);
    let selected = null;
    for (let positionY = initialHeight; positionY <= HEIGHT - margin + 1e-9; positionY += 0.025) {
      const transform = this.engine.Transform({x: positionX, y: positionY}, angle);
      const overlaps = this.bodies.some(body => this.engine.testOverlap(shape, 0, body.getFixtureList().getShape(), 0, transform, body.getTransform()));
      if (!overlaps) { selected = positionY; break; }
    }
    if (selected === null) {
      this.message = 'No clear space above that spot. Try another horizontal position or clear the scene.';
      return false;
    }
    this.createBox(positionX, selected, angle);
    this.message = `Box ${this.bodies.length} starts at rest. Contact can make it rotate.`;
    return true;
  }

  step() {
    this.world.step(STEP, 12, 8);
    this.time += STEP;
    if (this.bodies.some(body => ![body.getPosition().x, body.getPosition().y, body.getAngle(), body.getAngularVelocity(), body.getLinearVelocity().x, body.getLinearVelocity().y].every(Number.isFinite))) throw new Error('A non-finite rigid-body state was detected.');
  }

  advanceFrame(seconds, hidden = false) {
    this.lastSteps = 0;
    if (hidden) { this.accumulator = 0; return; }
    this.accumulator = Math.min(0.1, this.accumulator + Math.max(0, Math.min(0.1, seconds)));
    while (this.accumulator >= STEP && this.lastSteps < 24) {
      this.step();
      this.accumulator -= STEP;
      this.lastSteps++;
    }
  }
}

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
} catch (failure) {
  const error = document.querySelector('#error');
  error.textContent = 'The box experiment could not start: ' + failure.message;
  error.style.display = 'flex';
  console.error(failure);
}
})();
