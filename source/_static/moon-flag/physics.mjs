export const GRAVITY = 1.62;
export const MAX_STRETCH = 1.55;
export const STEP = 1 / 120;
export const EXTENSION_STIFFNESS = 35;
export const SHEAR_STIFFNESS = 0.35;
export const BENDING_STIFFNESS = 2;
export const DAMPING_RATE = 0.35;

export class MoonFlag {
  constructor({columns = 24, rows = 14, gravity = GRAVITY} = {}) {
    this.columns = columns;
    this.rows = rows;
    this.gravity = gravity;
    this.width = 2.4;
    this.height = 1.4;
    this.top = 4;
    this.links = [];
    this.bends = [];
    this.rest = [];
    this.triangles = [];
    this.pins = [];
    const node = (column, row) => row * (columns + 1) + column;
    for (let row = 0; row <= rows; row++) {
      for (let column = 0; column <= columns; column++) {
        this.rest.push([column * this.width / columns, this.top - row * this.height / rows, 0]);
        if (column === 0) this.pins.push(node(column, row));
      }
    }
    this.mass = new Float64Array(this.rest.length);
    const cellMass = 0.22 * this.width * this.height / (columns * rows);
    const link = (first, second, stiffness, kind) => {
      const rest = Math.hypot(...this.rest[first].map((value, axis) => value - this.rest[second][axis]));
      this.links.push({first, second, rest, stiffness, kind, multiplier: 0});
    };
    for (let row = 0; row <= rows; row++) {
      for (let column = 0; column <= columns; column++) {
        const center = node(column, row);
        if (column < columns) link(center, node(column + 1, row), EXTENSION_STIFFNESS, 'extension');
        if (row < rows) link(center, node(column, row + 1), EXTENSION_STIFFNESS, 'extension');
        if (column < columns && row < rows) {
          const right = node(column + 1, row);
          const below = node(column, row + 1);
          const opposite = node(column + 1, row + 1);
          link(right, below, SHEAR_STIFFNESS, 'shear');
          this.triangles.push([center, right, below], [right, opposite, below]);
          for (const corner of [center, right, below, opposite]) this.mass[corner] += cellMass / 4;
        }
        if (column > 0 && column < columns) this.bends.push({nodes: [node(column - 1, row), center, node(column + 1, row)], multipliers: [0, 0, 0]});
        if (row > 0 && row < rows) this.bends.push({nodes: [node(column, row - 1), center, node(column, row + 1)], multipliers: [0, 0, 0]});
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
        const radius = MAX_STRETCH * Math.hypot(...this.rest[this.corner].map((value, axis) => value - anchor[axis]));
        const offset = candidate.map((value, axis) => value - anchor[axis]);
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

  distanceCorrection(link, timestep, hard = false) {
    const first = this.positions[link.first];
    const second = this.positions[link.second];
    const firstWeight = this.weights[link.first];
    const secondWeight = this.weights[link.second];
    const totalWeight = firstWeight + secondWeight;
    if (totalWeight === 0) return;
    const offsetX = first[0] - second[0];
    const offsetY = first[1] - second[1];
    const offsetZ = first[2] - second[2];
    const distance = Math.hypot(offsetX, offsetY, offsetZ);
    if (distance < 1e-10) return;
    const error = distance - link.rest * (hard ? MAX_STRETCH : 1);
    if (hard && error <= 0) return;
    const compliance = hard ? 0 : 1 / (link.stiffness * timestep * timestep);
    const correction = (-error - compliance * link.multiplier) / (totalWeight + compliance);
    if (!hard) link.multiplier += correction;
    const scale = correction / distance;
    first[0] += firstWeight * offsetX * scale;
    first[1] += firstWeight * offsetY * scale;
    first[2] += firstWeight * offsetZ * scale;
    second[0] -= secondWeight * offsetX * scale;
    second[1] -= secondWeight * offsetY * scale;
    second[2] -= secondWeight * offsetZ * scale;
  }

  bendingCorrection(bend, timestep) {
    const compliance = 1 / (BENDING_STIFFNESS * timestep * timestep);
    const first = this.positions[bend.nodes[0]];
    const middle = this.positions[bend.nodes[1]];
    const last = this.positions[bend.nodes[2]];
    const firstWeight = this.weights[bend.nodes[0]];
    const middleWeight = this.weights[bend.nodes[1]];
    const lastWeight = this.weights[bend.nodes[2]];
    const denominator = compliance + firstWeight + 4 * middleWeight + lastWeight;
    for (let axis = 0; axis < 3; axis++) {
      const error = first[axis] - 2 * middle[axis] + last[axis];
      const correction = (-error - compliance * bend.multipliers[axis]) / denominator;
      bend.multipliers[axis] += correction;
      first[axis] += firstWeight * correction;
      middle[axis] -= 2 * middleWeight * correction;
      last[axis] += lastWeight * correction;
    }
  }

  maximumStretch() {
    let maximum = 1;
    for (const link of this.links) {
      const first = this.positions[link.first];
      const second = this.positions[link.second];
      maximum = Math.max(maximum, Math.hypot(first[0] - second[0], first[1] - second[1], first[2] - second[2]) / link.rest);
    }
    return maximum;
  }

  center() {
    const result = [0, 0, 0];
    const total = this.mass.reduce((sum, value) => sum + value, 0);
    for (let index = 0; index < this.positions.length; index++) for (let axis = 0; axis < 3; axis++) result[axis] += this.positions[index][axis] * this.mass[index] / total;
    return result;
  }

  bendingMeasure() {
    let measure = 0;
    for (const bend of this.bends) {
      for (let axis = 0; axis < 3; axis++) {
        const difference = this.positions[bend.nodes[0]][axis] - 2 * this.positions[bend.nodes[1]][axis] + this.positions[bend.nodes[2]][axis];
        measure += difference * difference;
      }
    }
    return measure;
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
      const offset = this.target.map((value, axis) => value - corner[axis]);
      const distance = Math.hypot(...offset);
      const fraction = distance > 0 ? Math.min(1, this.handSpeed * timestep / distance) : 0;
      for (let axis = 0; axis < 3; axis++) corner[axis] += offset[axis] * fraction;
    }
    for (const link of this.links) link.multiplier = 0;
    for (const bend of this.bends) bend.multipliers.fill(0);
    for (let sweep = 0; sweep < 16; sweep++) {
      for (const link of this.links) this.distanceCorrection(link, timestep);
      for (const bend of this.bends) this.bendingCorrection(bend, timestep);
      for (const link of this.links) this.distanceCorrection(link, timestep, true);
    }
    let stretch = this.maximumStretch();
    for (let sweep = 0; stretch > MAX_STRETCH + 0.0001 && sweep < 60; sweep++) {
      for (const link of this.links) this.distanceCorrection(link, timestep, true);
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
