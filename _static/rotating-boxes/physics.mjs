export const SIDE = 0.35;
export const MASS = 1;
export const WIDTH = 4;
export const HEIGHT = 3;
export const STEP = 1 / 240;
export const RESTITUTION = 0.25;
export const FRICTION = 0.6;

export function vertices(body) {
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([horizontal, vertical]) => {
    const point = body.getWorldPoint({x: horizontal * SIDE / 2, y: vertical * SIDE / 2});
    return [point.x, point.y];
  });
}

export function mechanicalEnergy(bodies, gravity = 9.81) {
  return bodies.reduce((total, body) => {
    const velocity = body.getLinearVelocity();
    return total + body.getMass() * (0.5 * (velocity.x ** 2 + velocity.y ** 2) + gravity * body.getPosition().y) + 0.5 * body.getInertia() * body.getAngularVelocity() ** 2;
  }, 0);
}

export class RotatingBoxes {
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
