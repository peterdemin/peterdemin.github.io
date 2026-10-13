export const GRAVITY = 1.62;
export const MAX_STRETCH = 1.55;
export const STEP = 1 / 120;
export const EXTENSION_STIFFNESS = 35;
export const COUPLING_STIFFNESS = 3.5;
export const SHEAR_STIFFNESS = 0.35;
export const BENDING_STIFFNESS = 0.2;
export const DAMPING_RATE = 0.35;
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

export class MoonFlag {
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
