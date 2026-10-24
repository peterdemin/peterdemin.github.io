import {ElasticString, ANCHOR, LENGTH} from './physics.mjs';

const canvas = document.querySelector('#scene');
const context = canvas.getContext('2d');
if (!context) throw new Error('Canvas 2D is unavailable.');
const simulation = new ElasticString();
const status = document.querySelector('#status');
const values = document.querySelector('#values');
const error = document.querySelector('#error');
const releaseButton = document.querySelector('#release');
const slowMotion = document.querySelector('#slow-motion');
let dark = matchMedia('(prefers-color-scheme: dark)').matches;
let pointer = null, offset = [0, 0], last = null, failed = false;

function view() {
  const rect = canvas.getBoundingClientRect();
  const scale = Math.min((rect.width - 48) / (2.5 * LENGTH), (rect.height - 48) / (1.5 * LENGTH));
  return {rect, scale, width: rect.width, height: rect.height,
    x: rect.width / 2 - ANCHOR[0] * scale,
    y: rect.height / 2 + (ANCHOR[1] - 0.5 * LENGTH) * scale};
}

function project(point, camera = view()) {
  return [camera.x + point[0] * camera.scale, camera.y - point[1] * camera.scale];
}

function world(event) {
  const c = view();
  return [(event.clientX - c.rect.left - c.x) / c.scale,
    (c.y - event.clientY + c.rect.top) / c.scale];
}

function draw() {
  const c = view();
  if (!c.width || !c.height) return;
  const ratio = Math.min(devicePixelRatio || 1, 2);
  if (canvas.width !== Math.round(c.width * ratio) || canvas.height !== Math.round(c.height * ratio)) {
    canvas.width = Math.round(c.width * ratio); canvas.height = Math.round(c.height * ratio);
  }
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.fillStyle = dark ? '#0c1725' : '#f1f5f7';
  context.fillRect(0, 0, c.width, c.height);
  const ink = dark ? '#a5b7c8' : '#4e657d';
  context.strokeStyle = dark ? '#1b2c3b' : '#dfe7ec';
  context.lineWidth = 1;
  const grid = LENGTH / 4;
  const left = -c.x / c.scale, right = (c.width - c.x) / c.scale;
  const bottom = (c.y - c.height) / c.scale, top = c.y / c.scale;
  for (let x = Math.ceil(left / grid) * grid; x <= right; x += grid) {
    context.beginPath(); context.moveTo(...project([x, bottom], c)); context.lineTo(...project([x, top], c)); context.stroke();
  }
  for (let y = Math.ceil(bottom / grid) * grid; y <= top; y += grid) {
    context.beginPath(); context.moveTo(...project([left, y], c)); context.lineTo(...project([right, y], c)); context.stroke();
  }
  const p = simulation.p, state = simulation.state;
  context.lineWidth = 4; context.lineJoin = 'round'; context.lineCap = 'round';
  context.strokeStyle = dark ? '#58bec3' : '#197d87';
  context.beginPath();
  for (let i = 0; i <= p.segments; i++) {
    const point = project([state[2*i], state[2*i+1]], c);
    if (i === 0) context.moveTo(...point); else context.lineTo(...point);
  }
  context.stroke();
  for (let i = 1; i < p.segments; i++) {
    const point = project([state[2*i], state[2*i+1]], c);
    context.fillStyle = dark ? '#9fdbd9' : '#479fa4';
    context.beginPath(); context.arc(...point, 2, 0, 2*Math.PI); context.fill();
  }
  const anchor = project(ANCHOR, c), end = project(simulation.endpoint, c);
  context.strokeStyle = ink; context.lineWidth = 2;
  context.beginPath(); context.moveTo(anchor[0]-20, anchor[1]-15); context.lineTo(anchor[0]+20, anchor[1]-15); context.stroke();
  for (let i = -20; i <= 20; i += 8) {
    context.beginPath(); context.moveTo(anchor[0]+i, anchor[1]-15); context.lineTo(anchor[0]+i+6, anchor[1]-23); context.stroke();
  }
  context.beginPath(); context.moveTo(anchor[0], anchor[1]-15); context.lineTo(...anchor); context.stroke();
  context.fillStyle = ink; context.beginPath(); context.arc(...anchor, 5, 0, 2*Math.PI); context.fill();
  context.fillStyle = '#e9944e'; context.beginPath(); context.arc(...end, 9, 0, 2*Math.PI); context.fill();
  context.strokeStyle = dark ? '#ffdfaa' : '#a55d27'; context.lineWidth = 1.5; context.stroke();
  context.setLineDash([4, 4]); context.beginPath(); context.arc(...end, 19, 0, 2*Math.PI); context.stroke(); context.setLineDash([]);
  context.fillStyle = ink; context.font = '12px system-ui, sans-serif'; context.textAlign = 'center';
  context.fillText('Fixed', anchor[0], anchor[1]-31);
  context.fillText(simulation.held ? 'Held · drag me' : 'Free end · grab me',
    Math.max(70, Math.min(c.width-70, end[0])), Math.max(16, Math.min(c.height-10, end[1]-28)));
  const scaleX = 20, scaleY = c.height-22;
  context.strokeStyle = ink; context.lineWidth = 1.5;
  context.beginPath(); context.moveTo(scaleX, scaleY-4); context.lineTo(scaleX, scaleY+4);
  context.moveTo(scaleX, scaleY); context.lineTo(scaleX + grid*c.scale, scaleY);
  context.moveTo(scaleX+grid*c.scale, scaleY-4); context.lineTo(scaleX+grid*c.scale, scaleY+4); context.stroke();
  context.textAlign = 'left'; context.fillText(`${grid} m`, scaleX+grid*c.scale+8, scaleY+4);
  canvas.style.cursor = pointer !== null ? 'grabbing' : 'grab';
  status.textContent = simulation.held ? 'Held — drag the orange end or press Let go.' : 'Released — gravity pulls the string down; the fixed end stays attached.';
  releaseButton.disabled = !simulation.held;
  values.textContent = `${LENGTH.toFixed(1)} m unstretched length · largest segment extension ${(100*simulation.maxStrain()).toFixed(1)}% · settling damping ${p.settlingDamping.toFixed(1)}/s · simulated time ${simulation.time.toFixed(2)} s`;
  canvas.dataset.endpoint = JSON.stringify(end);
  canvas.dataset.anchor = JSON.stringify(anchor);
  canvas.dataset.state = JSON.stringify(Array.from(state));
  canvas.dataset.held = simulation.held;
  canvas.dataset.time = simulation.time;
}

function release() {
  pointer = null;
  simulation.release();
  draw();
}
canvas.addEventListener('pointerdown', event => {
  if (pointer !== null || event.button !== 0 || failed) return;
  const c = view(), position = world(event), end = simulation.endpoint;
  if (Math.hypot(position[0]-end[0], position[1]-end[1])*c.scale > 30) return;
  pointer = event.pointerId; offset = [end[0]-position[0], end[1]-position[1]];
  simulation.grab();
  canvas.setPointerCapture(pointer); canvas.focus({preventScroll:true});
  event.preventDefault(); draw();
});
canvas.addEventListener('pointermove', event => {
  if (event.pointerId !== pointer) return;
  const point = world(event);
  simulation.move([point[0]+offset[0], point[1]+offset[1]]);
  event.preventDefault();
});
for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(name, event => {
  if (event.pointerId === pointer) release();
});
function reset() {
  pointer = null; simulation.reset(); last = null; failed = false;
  error.style.display = 'none'; draw();
}
document.querySelector('#reset').addEventListener('click', reset);
releaseButton.addEventListener('click', release);
slowMotion.addEventListener('change', () => {last = null; simulation.accumulator = 0;});
canvas.addEventListener('keydown', event => {
  if (event.code === 'Space') { if (simulation.held) release(); else simulation.grab(); }
  else if (event.code === 'Escape') release();
  else if (event.code === 'KeyR') reset();
  else if (simulation.held && ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.code)) {
    const move = {ArrowLeft:[-0.08,0],ArrowRight:[0.08,0],ArrowUp:[0,0.08],ArrowDown:[0,-0.08]}[event.code];
    simulation.move([simulation.target[0]+LENGTH*move[0],simulation.target[1]+LENGTH*move[1]]);
  } else return;
  event.preventDefault(); draw();
});

function frame(now) {
  if (!document.hidden && !failed) {
    try {
      const playback = slowMotion.checked ? 0.25 : 1;
      simulation.advanceFrame(last === null ? 0 : playback * (now-last)/1000);
      draw();
    } catch (failure) {
      failed = true; error.textContent = failure.message; error.style.display = 'flex';
      console.error(failure);
    }
  }
  last = document.hidden ? null : now;
  requestAnimationFrame(frame);
}
document.addEventListener('visibilitychange', () => {last = null; simulation.accumulator = 0;});
window.addEventListener('message', event => {
  if (event.source !== parent || event.data?.type !== 'elastic-string-theme') return;
  for (const name of ['background','text','border','font','button-hover']) {
    if (typeof event.data[name] === 'string' && event.data[name]) document.documentElement.style.setProperty('--book-'+name, event.data[name]);
  }
  dark = Boolean(event.data.dark); document.documentElement.style.colorScheme = dark ? 'dark' : 'light'; draw();
});
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {if(parent === window) {dark=event.matches;draw();}});
new ResizeObserver(() => {
  draw();
  parent.postMessage({type:'elastic-string-size',height:Math.ceil(document.querySelector('main').getBoundingClientRect().height)+2}, '*');
}).observe(document.querySelector('main'));
parent.postMessage({type:'elastic-string-ready'}, '*');
draw(); requestAnimationFrame(frame);
