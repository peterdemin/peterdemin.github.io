export const add = (left, right) => [left[0] + right[0], left[1] + right[1], left[2] + right[2]];
export const sub = (left, right) => [left[0] - right[0], left[1] - right[1], left[2] - right[2]];
export const mul = (vector, scale) => [vector[0] * scale, vector[1] * scale, vector[2] * scale];
export const dot = (left, right) => left.reduce((sum, value, index) => sum + value * right[index], 0);
export const cross = (left, right) => [left[1] * right[2] - left[2] * right[1], left[2] * right[0] - left[0] * right[2], left[0] * right[1] - left[1] * right[0]];
export const length = vector => Math.hypot(...vector);
export const unit = vector => mul(vector, 1 / Math.max(length(vector), 1e-12));
const mix = (left, right, fraction) => add(mul(left, 1 - fraction), mul(right, fraction));

export function segmentVelocity(point, start, end, core = 0.035) {
  const firstX = point[0] - start[0], firstY = point[1] - start[1], firstZ = point[2] - start[2];
  const secondX = point[0] - end[0], secondY = point[1] - end[1], secondZ = point[2] - end[2];
  const segmentX = end[0] - start[0], segmentY = end[1] - start[1], segmentZ = end[2] - start[2];
  const crossX = firstY * secondZ - firstZ * secondY, crossY = firstZ * secondX - firstX * secondZ, crossZ = firstX * secondY - firstY * secondX;
  const denominator = crossX * crossX + crossY * crossY + crossZ * crossZ + core * core * (segmentX * segmentX + segmentY * segmentY + segmentZ * segmentZ);
  const firstLength = Math.hypot(firstX, firstY, firstZ), secondLength = Math.hypot(secondX, secondY, secondZ);
  if (firstLength < 1e-9 || secondLength < 1e-9 || denominator < 1e-16) return [0, 0, 0];
  const factor = (segmentX * (firstX / firstLength - secondX / secondLength) + segmentY * (firstY / firstLength - secondY / secondLength) + segmentZ * (firstZ / firstLength - secondZ / secondLength)) / (4 * Math.PI * denominator);
  return [crossX * factor, crossY * factor, crossZ * factor];
}

export function horseshoeVelocity(point, panel, wakeOnly = false) {
  let velocity = add(segmentVelocity(point, panel.farStart, panel.start), segmentVelocity(point, panel.end, panel.farEnd));
  if (!wakeOnly) velocity = add(velocity, segmentVelocity(point, panel.start, panel.end));
  return velocity;
}

export function solveLinear(matrix, rightHandSide) {
  const size = rightHandSide.length;
  const rows = matrix.map((row, index) => [...row, rightHandSide[index]]);
  for (let column = 0; column < size; column++) {
    let pivot = column;
    for (let row = column + 1; row < size; row++) if (Math.abs(rows[row][column]) > Math.abs(rows[pivot][column])) pivot = row;
    if (Math.abs(rows[pivot][column]) < 1e-10) throw new Error('Degenerate aerodynamic lattice');
    [rows[column], rows[pivot]] = [rows[pivot], rows[column]];
    for (let row = column + 1; row < size; row++) {
      const factor = rows[row][column] / rows[column][column];
      for (let entry = column; entry <= size; entry++) rows[row][entry] -= factor * rows[column][entry];
    }
  }
  const result = new Array(size).fill(0);
  for (let row = size - 1; row >= 0; row--) {
    let value = rows[row][size];
    for (let column = row + 1; column < size; column++) value -= rows[row][column] * result[column];
    result[row] = value / rows[row][row];
  }
  return result;
}

export class SailSimulation {
  constructor(chordCount = 6, spanCount = 10) {
    this.chordCount = chordCount;
    this.spanCount = spanCount;
    this.density = 1.225;
    this.gravity = [0, -9.81, 0];
    this.speed = 6;
    this.direction = 15;
    this.time = 0;
    this.reset();
  }
  index(chord, span) { return span * (this.chordCount + 1) + chord; }
  reset() {
    this.positions = [];
    this.velocities = [];
    this.pinned = [];
    this.masses = [];
    this.constraints = [];
    this.panels = [];
    this.forces = [];
    this.totalForce = [0, 0, 0];
    this.liftVector = [0, 0, 0];
    this.horizontalLift = 0;
    this.failureReason = '';
    this.lift = this.drag = this.inducedDrag = this.residual = 0;
    this.valid = true;
    this.time = 0;
    for (let span = 0; span <= this.spanCount; span++) {
      const fraction = span / this.spanCount, width = 3.2 - 2.95 * fraction;
      for (let chord = 0; chord <= this.chordCount; chord++) {
        const chordFraction = chord / this.chordCount;
        const fullness = 1 + 0.0339 * Math.sin(Math.PI * fraction) ** 2;
        this.positions.push([width * fullness * chordFraction, 0.6 + 4.4 * fraction, 0]);
        this.velocities.push([0, 0, 0]);
        this.pinned.push(chord === 0 || span === 0);
        this.masses.push(0);
      }
    }
    this.anchors = this.positions.map(position => [...position]);
    this.restGeometry = this.positions.map(position => [...position]);
    const constraint = (first, second, stiffness) => this.constraints.push({first, second, rest: length(sub(this.restGeometry[first], this.restGeometry[second])), compliance: 1 / stiffness, lambda: 0});
    for (let span = 0; span <= this.spanCount; span++) for (let chord = 0; chord <= this.chordCount; chord++) {
      const index = this.index(chord, span);
      if (chord < this.chordCount) constraint(index, this.index(chord + 1, span), 10000000);
      if (span < this.spanCount) constraint(index, this.index(chord, span + 1), 10000000);
      if (chord < this.chordCount && span < this.spanCount) {
        constraint(index, this.index(chord + 1, span + 1), 10000000);
        const corners = [index, this.index(chord + 1, span), this.index(chord + 1, span + 1), this.index(chord, span + 1)];
        const area = this.panelArea(corners);
        for (const corner of corners) this.masses[corner] += area * 0.22 / 4;
      }
      if (chord + 2 <= this.chordCount) constraint(index, this.index(chord + 2, span), 0.5);
      if (span + 2 <= this.spanCount) constraint(index, this.index(chord, span + 2), 0.5);
    }
    this.inverseMasses = this.masses.map((mass, index) => this.pinned[index] ? 0 : 1 / mass);
    this.forces = this.positions.map(() => [0, 0, 0]);
    this.solveAerodynamics();
  }
  get wind() {
    const radians = this.direction * Math.PI / 180;
    return [this.speed * Math.cos(radians), 0, this.speed * Math.sin(radians)];
  }
  get modelSupported() {
    const direction = ((this.direction + 180) % 360 + 360) % 360 - 180;
    return this.speed < 0.01 || Math.abs(direction) <= 20;
  }
  panelArea(corners) {
    const [first, second, third, fourth] = corners.map(index => this.positions[index]);
    return (length(cross(sub(second, first), sub(third, first))) + length(cross(sub(third, first), sub(fourth, first)))) / 2;
  }
  makePanels() {
    const reverse = this.wind[0] < 0;
    const wake = mul(unit(this.wind), 70);
    const panels = [];
    for (let span = 0; span < this.spanCount; span++) for (let chord = 0; chord < this.chordCount; chord++) {
      const leading = reverse ? this.chordCount - chord : chord;
      const trailing = reverse ? leading - 1 : leading + 1;
      const corners = [this.index(leading, span), this.index(trailing, span), this.index(trailing, span + 1), this.index(leading, span + 1)];
      const [first, second, third, fourth] = corners.map(index => this.positions[index]);
      const start = mix(first, second, 0.25), end = mix(fourth, third, 0.25);
      const control = mix(mix(first, second, 0.75), mix(fourth, third, 0.75), 0.5);
      const chordVector = sub(mix(second, third, 0.5), mix(first, fourth, 0.5));
      const spanVector = sub(mix(fourth, third, 0.5), mix(first, second, 0.5));
      const normal = mul(unit(cross(chordVector, spanVector)), reverse ? -1 : 1);
      panels.push({corners, start, end, control, normal, farStart: add(start, wake), farEnd: add(end, wake), area: this.panelArea(corners), gamma: 0});
    }
    return panels;
  }
  solveAerodynamics({allowUnsupported = false} = {}) {
    this.forces = this.positions.map(() => [0, 0, 0]);
    this.totalForce = [0, 0, 0];
    this.liftVector = [0, 0, 0];
    this.horizontalLift = 0;
    this.lift = this.drag = this.inducedDrag = this.residual = 0;
    if (this.failureReason) { this.valid = false; this.modelStatus = 'numerical-failure'; this.panels = []; return; }
    this.valid = true;
    this.modelStatus = this.modelSupported ? 'attached' : 'unsupported';
    if (!this.modelSupported && !allowUnsupported) { this.panels = []; return; }
    if (this.speed < 0.01) { this.modelStatus = 'zero-wind'; this.panels = []; return; }
    this.panels = this.makePanels();
    const matrix = this.panels.map(target => this.panels.map(source => dot(horseshoeVelocity(target.control, source), target.normal)));
    const rightHandSide = this.panels.map(panel => -dot(this.wind, panel.normal));
    let circulation;
    try { circulation = solveLinear(matrix, rightHandSide); }
    catch { this.valid = false; this.modelStatus = 'numerical-failure'; this.failureReason = 'Degenerate aerodynamic lattice'; this.panels = []; return; }
    if (circulation.some(value => !Number.isFinite(value) || Math.abs(value) > this.speed * 40)) { this.valid = false; this.modelStatus = 'numerical-failure'; this.failureReason = 'Circulation outside numerical range'; this.panels = []; return; }
    for (let index = 0; index < this.panels.length; index++) this.panels[index].gamma = circulation[index];
    this.residual = Math.max(...matrix.map((row, index) => Math.abs(dot(row, circulation) - rightHandSide[index])));
    const dragAxis = unit(this.wind), liftAxis = [-dragAxis[2], 0, dragAxis[0]];
    for (const panel of this.panels) {
      const midpoint = mix(panel.start, panel.end, 0.5);
      const induced = this.panels.reduce((sum, source) => add(sum, mul(horseshoeVelocity(midpoint, source, true), source.gamma)), [0, 0, 0]);
      const aerodynamic = mul(cross(add(this.wind, induced), sub(panel.end, panel.start)), this.density * panel.gamma);
      const skinDrag = mul(dragAxis, 0.5 * this.density * this.speed ** 2 * panel.area * 0.008);
      panel.force = add(aerodynamic, skinDrag);
      panel.pressure = dot(aerodynamic, panel.normal) / panel.area;
      this.inducedDrag += dot(aerodynamic, dragAxis);
      this.totalForce = add(this.totalForce, panel.force);
      for (const corner of panel.corners) this.forces[corner] = add(this.forces[corner], mul(panel.force, 0.25));
    }
    this.drag = dot(this.totalForce, dragAxis);
    this.liftVector = sub(this.totalForce, mul(dragAxis, this.drag));
    this.lift = length(this.liftVector);
    this.horizontalLift = dot(this.totalForce, liftAxis);
  }
  velocityAt(point) {
    return this.panels.reduce((velocity, panel) => add(velocity, mul(horseshoeVelocity(point, panel), panel.gamma)), this.wind);
  }
  advect(point, timestep) {
    const midpoint = add(point, mul(this.velocityAt(point), timestep / 2));
    return add(point, mul(this.velocityAt(midpoint), timestep));
  }
  step(timestep = 1 / 240) {
    if (!this.valid || !this.modelSupported) return;
    const previous = this.positions.map(position => [...position]);
    const damping = Math.exp(-100 * timestep);
    for (let index = 0; index < this.positions.length; index++) {
      if (this.pinned[index]) continue;
      const acceleration = add(mul(this.forces[index], this.inverseMasses[index]), this.gravity);
      this.velocities[index] = mul(add(this.velocities[index], mul(acceleration, timestep)), damping);
      this.positions[index] = add(this.positions[index], mul(this.velocities[index], timestep));
    }
    for (const constraint of this.constraints) constraint.lambda = 0;
    for (let iteration = 0; iteration < 80; iteration++) for (const constraint of this.constraints) {
      const difference = sub(this.positions[constraint.first], this.positions[constraint.second]);
      const distance = length(difference), firstWeight = this.inverseMasses[constraint.first], secondWeight = this.inverseMasses[constraint.second];
      if (distance < 1e-10 || firstWeight + secondWeight === 0) continue;
      const alpha = constraint.compliance / (timestep * timestep);
      const deltaLambda = (-(distance - constraint.rest) - alpha * constraint.lambda) / (firstWeight + secondWeight + alpha);
      constraint.lambda += deltaLambda;
      const correction = mul(difference, deltaLambda / distance);
      this.positions[constraint.first] = add(this.positions[constraint.first], mul(correction, firstWeight));
      this.positions[constraint.second] = sub(this.positions[constraint.second], mul(correction, secondWeight));
    }
    for (let index = 0; index < this.positions.length; index++) {
      if (this.pinned[index]) this.positions[index] = [...this.anchors[index]];
      this.velocities[index] = mul(sub(this.positions[index], previous[index]), 1 / timestep);
    }
    if (this.positions.some(position => !position.every(Number.isFinite)) || this.maxStrain > 0.08) {
      this.positions = previous;
      this.velocities = previous.map(() => [0, 0, 0]);
      this.valid = false;
      this.failureReason = 'Fabric strain exceeded 8%; numerical run stopped';
      this.solveAerodynamics();
      return;
    }
    this.time += timestep;
  }
  get maxStrain() {
    return Math.max(...this.constraints.filter(constraint => constraint.compliance < 0.01).map(constraint => Math.abs(length(sub(this.positions[constraint.first], this.positions[constraint.second])) / constraint.rest - 1)));
  }
  get meanBillow() {
    const free = this.positions.filter((position, index) => !this.pinned[index]);
    return free.reduce((sum, position) => sum + position[2], 0) / free.length;
  }
}
