export const CHORD = 1.5;
export const VISCOSITY = 0.015;
export const DENSITY = 1.225;

export function thickness(fraction) {
  return 5 * 0.18 * CHORD * (0.2969 * Math.sqrt(fraction) - 0.126 * fraction - 0.3516 * fraction ** 2 + 0.2843 * fraction ** 3 - 0.1036 * fraction ** 4);
}

export class WindTunnel {
  constructor({columns = 96, rows = 48, angle = 8, viscosity = VISCOSITY} = {}) {
    this.columns = columns;
    this.rows = rows;
    this.width = 6;
    this.spacing = this.width / columns;
    this.height = rows * this.spacing;
    this.center = [2.4, this.height / 2];
    this.viscosity = viscosity;
    this.u = new Float64Array((columns + 1) * rows);
    this.v = new Float64Array(columns * (rows + 1));
    this.previousU = this.u.slice();
    this.previousV = this.v.slice();
    this.nextU = this.u.slice();
    this.nextV = this.v.slice();
    this.fluid = new Uint8Array(columns * rows);
    this.pressure = new Float64Array(columns * rows);
    this.rhs = this.pressure.slice();
    this.diagonal = this.pressure.slice();
    this.residual = this.pressure.slice();
    this.direction = this.pressure.slice();
    this.preconditioned = this.pressure.slice();
    this.product = this.pressure.slice();
    this.reset(angle);
  }

  inside(x, y) {
    const horizontal = x - this.center[0];
    const vertical = y - this.center[1];
    const along = horizontal * Math.cos(this.angle) + vertical * Math.sin(this.angle);
    const across = -horizontal * Math.sin(this.angle) + vertical * Math.cos(this.angle);
    const fraction = along / CHORD + 0.5;
    return fraction >= 0 && fraction <= 1 && Math.abs(across) <= thickness(fraction);
  }

  cell(column, row) {
    return column >= 0 && column < this.columns && row >= 0 && row < this.rows && this.fluid[row * this.columns + column] === 1;
  }

  openU(column, row) {
    return row >= 0 && row < this.rows && (column === 0 ? this.cell(0, row) : column === this.columns ? this.cell(column - 1, row) : this.cell(column - 1, row) && this.cell(column, row));
  }

  openV(column, row) {
    return column >= 0 && column < this.columns && row > 0 && row < this.rows && this.cell(column, row - 1) && this.cell(column, row);
  }

  reset(angle = this.degrees) {
    this.degrees = Math.max(-45, Math.min(45, angle));
    this.angle = -this.degrees * Math.PI / 180;
    this.time = 0;
    this.pressure.fill(0);
    this.v.fill(0);
    this.u.fill(1);
    for (let row = 0; row < this.rows; row++) for (let column = 0; column < this.columns; column++) {
      this.fluid[row * this.columns + column] = Number(!this.inside((column + 0.5) * this.spacing, (row + 0.5) * this.spacing));
    }
    for (let row = 0; row < this.rows; row++) for (let column = 0; column <= this.columns; column++) {
      if (!this.openU(column, row)) this.u[row * (this.columns + 1) + column] = 0;
    }
    this.buildDiagonal();
    this.project(0.01);
    this.previousU.set(this.u);
    this.previousV.set(this.v);
  }

  buildDiagonal() {
    for (let row = 0; row < this.rows; row++) for (let column = 0; column < this.columns; column++) {
      const index = row * this.columns + column;
      this.diagonal[index] = this.cell(column, row) ? Number(this.cell(column - 1, row)) + Number(this.cell(column + 1, row)) + Number(this.cell(column, row - 1)) + Number(this.cell(column, row + 1)) + (column === this.columns - 1 ? 2 : 0) : 1;
    }
  }

  multiply(input, output) {
    for (let row = 0; row < this.rows; row++) for (let column = 0; column < this.columns; column++) {
      const index = row * this.columns + column;
      if (!this.cell(column, row)) { output[index] = 0; continue; }
      let value = this.diagonal[index] * input[index];
      if (this.cell(column - 1, row)) value -= input[index - 1];
      if (this.cell(column + 1, row)) value -= input[index + 1];
      if (this.cell(column, row - 1)) value -= input[index - this.columns];
      if (this.cell(column, row + 1)) value -= input[index + this.columns];
      output[index] = value;
    }
  }

  divergence(column, row) {
    return (this.u[row * (this.columns + 1) + column + 1] - this.u[row * (this.columns + 1) + column] + this.v[(row + 1) * this.columns + column] - this.v[row * this.columns + column]) / this.spacing;
  }

  project(step) {
    const scale = DENSITY * this.spacing ** 2 / step;
    for (let row = 0; row < this.rows; row++) for (let column = 0; column < this.columns; column++) {
      const index = row * this.columns + column;
      this.rhs[index] = this.cell(column, row) ? -scale * this.divergence(column, row) : 0;
    }
    this.multiply(this.pressure, this.product);
    let paired = 0;
    for (let index = 0; index < this.pressure.length; index++) {
      this.residual[index] = this.rhs[index] - this.product[index];
      this.preconditioned[index] = this.residual[index] / this.diagonal[index];
      this.direction[index] = this.preconditioned[index];
      paired += this.residual[index] * this.preconditioned[index];
    }
    const tolerance = 1e-5 * scale;
    this.iterations = 0;
    for (; this.iterations < 800 && paired > 1e-30; this.iterations++) {
      let maximum = 0;
      for (const value of this.residual) maximum = Math.max(maximum, Math.abs(value));
      if (maximum <= tolerance) break;
      this.multiply(this.direction, this.product);
      let denominator = 0;
      for (let index = 0; index < this.pressure.length; index++) denominator += this.direction[index] * this.product[index];
      if (denominator <= 0) throw new Error('Pressure matrix lost positive definiteness');
      const correction = paired / denominator;
      let nextPair = 0;
      for (let index = 0; index < this.pressure.length; index++) {
        this.pressure[index] += correction * this.direction[index];
        this.residual[index] -= correction * this.product[index];
        this.preconditioned[index] = this.residual[index] / this.diagonal[index];
        nextPair += this.residual[index] * this.preconditioned[index];
      }
      const ratio = nextPair / paired;
      for (let index = 0; index < this.pressure.length; index++) this.direction[index] = this.preconditioned[index] + ratio * this.direction[index];
      paired = nextPair;
    }
    const factor = step / (DENSITY * this.spacing);
    for (let row = 0; row < this.rows; row++) for (let column = 1; column <= this.columns; column++) {
      if (!this.openU(column, row)) continue;
      const index = row * this.columns + column - 1;
      const difference = column === this.columns ? -2 * this.pressure[index] : this.pressure[index + 1] - this.pressure[index];
      this.u[row * (this.columns + 1) + column] -= factor * difference;
    }
    for (let row = 1; row < this.rows; row++) for (let column = 0; column < this.columns; column++) {
      if (this.openV(column, row)) this.v[row * this.columns + column] -= factor * (this.pressure[row * this.columns + column] - this.pressure[(row - 1) * this.columns + column]);
    }
    this.maximumDivergence = this.diagnostics().divergence;
    if (this.maximumDivergence > 2e-5) throw new Error('Pressure solve did not reach the volume-balance tolerance');
  }

  uValue(column, row, center, tangent = false) {
    if (row < 0 || row >= this.rows) return center;
    if (column < 0) return 1;
    if (column > this.columns) return center;
    return this.openU(column, row) ? this.u[row * (this.columns + 1) + column] : tangent ? -center : 0;
  }

  vValue(column, row, center, tangent = false) {
    if (column < 0) return -center;
    if (column >= this.columns) return center;
    if (row <= 0 || row >= this.rows) return 0;
    return this.openV(column, row) ? this.v[row * this.columns + column] : tangent ? -center : 0;
  }

  step(maximumStep = 0.012) {
    let horizontalMaximum = 1;
    let verticalMaximum = 0;
    for (const value of this.u) horizontalMaximum = Math.max(horizontalMaximum, Math.abs(value));
    for (const value of this.v) verticalMaximum = Math.max(verticalMaximum, Math.abs(value));
    const step = Math.min(maximumStep, 0.012, 0.65 / ((horizontalMaximum + verticalMaximum) / this.spacing + 4 * this.viscosity / this.spacing ** 2));
    this.predict(step);
    this.project(step);
    this.time += step;
    return step;
  }

  predict(step) {
    const inverse = 1 / this.spacing;
    this.previousU.set(this.u);
    this.previousV.set(this.v);
    this.nextU.fill(0);
    this.nextV.fill(0);
    for (let row = 0; row < this.rows; row++) for (let column = 0; column <= this.columns; column++) {
      const index = row * (this.columns + 1) + column;
      if (!this.openU(column, row)) continue;
      if (column === 0) { this.nextU[index] = 1; continue; }
      if (column === this.columns) { this.nextU[index] = this.u[index - 1]; continue; }
      const center = this.u[index];
      const left = this.uValue(column - 1, row, center);
      const right = this.uValue(column + 1, row, center);
      const bottom = this.uValue(column, row - 1, center);
      const top = this.uValue(column, row + 1, center);
      const across = (this.v[row * this.columns + column - 1] + this.v[row * this.columns + column] + this.v[(row + 1) * this.columns + column - 1] + this.v[(row + 1) * this.columns + column]) / 4;
      const transport = center * (center >= 0 ? center - left : right - center) + across * (across >= 0 ? center - bottom : top - center);
      const laplacian = left + right + this.uValue(column, row - 1, center, true) + this.uValue(column, row + 1, center, true) - 4 * center;
      this.nextU[index] = center + step * (-inverse * transport + this.viscosity * inverse ** 2 * laplacian);
    }
    for (let row = 1; row < this.rows; row++) for (let column = 0; column < this.columns; column++) {
      const index = row * this.columns + column;
      if (!this.openV(column, row)) continue;
      const center = this.v[index];
      const left = this.vValue(column - 1, row, center);
      const right = this.vValue(column + 1, row, center);
      const bottom = this.vValue(column, row - 1, center);
      const top = this.vValue(column, row + 1, center);
      const along = (this.u[(row - 1) * (this.columns + 1) + column] + this.u[(row - 1) * (this.columns + 1) + column + 1] + this.u[row * (this.columns + 1) + column] + this.u[row * (this.columns + 1) + column + 1]) / 4;
      const transport = along * (along >= 0 ? center - left : right - center) + center * (center >= 0 ? center - bottom : top - center);
      const laplacian = this.vValue(column - 1, row, center, true) + this.vValue(column + 1, row, center, true) + bottom + top - 4 * center;
      this.nextV[index] = center + step * (-inverse * transport + this.viscosity * inverse ** 2 * laplacian);
    }
    this.u.set(this.nextU);
    this.v.set(this.nextV);
  }

  sample(x, y, previous = false) {
    const interpolate = (array, columns, rows, horizontal, vertical) => {
      const boundedX = Math.max(0, Math.min(columns - 1.000001, horizontal));
      const boundedY = Math.max(0, Math.min(rows - 1.000001, vertical));
      const column = Math.floor(boundedX);
      const row = Math.floor(boundedY);
      const fractionX = boundedX - column;
      const fractionY = boundedY - row;
      return (1 - fractionY) * ((1 - fractionX) * array[row * columns + column] + fractionX * array[row * columns + column + 1]) + fractionY * ((1 - fractionX) * array[(row + 1) * columns + column] + fractionX * array[(row + 1) * columns + column + 1]);
    };
    return [interpolate(previous ? this.previousU : this.u, this.columns + 1, this.rows, x / this.spacing, y / this.spacing - 0.5), interpolate(previous ? this.previousV : this.v, this.columns, this.rows + 1, x / this.spacing - 0.5, y / this.spacing)];
  }

  diagnostics() {
    let divergence = 0;
    let blockedVelocity = 0;
    let inlet = 0;
    let outlet = 0;
    for (let row = 0; row < this.rows; row++) {
      inlet += this.u[row * (this.columns + 1)];
      outlet += this.u[row * (this.columns + 1) + this.columns];
      for (let column = 0; column < this.columns; column++) if (this.cell(column, row)) divergence = Math.max(divergence, Math.abs(this.divergence(column, row)));
      for (let column = 0; column <= this.columns; column++) if (!this.openU(column, row)) blockedVelocity = Math.max(blockedVelocity, Math.abs(this.u[row * (this.columns + 1) + column]));
    }
    for (let row = 0; row <= this.rows; row++) for (let column = 0; column < this.columns; column++) if (!this.openV(column, row)) blockedVelocity = Math.max(blockedVelocity, Math.abs(this.v[row * this.columns + column]));
    return {divergence, blockedVelocity, inlet: inlet * this.spacing, outlet: outlet * this.spacing};
  }
}

export function advanceTracer(position, step, sampleBefore, sampleAfter) {
  const before = sampleBefore(position[0], position[1]);
  const middle = [position[0] + before[0] * step / 2, position[1] + before[1] * step / 2];
  const oldMiddle = sampleBefore(...middle);
  const newMiddle = sampleAfter(...middle);
  return [position[0] + step * (oldMiddle[0] + newMiddle[0]) / 2, position[1] + step * (oldMiddle[1] + newMiddle[1]) / 2, position[2]];
}

export function tracerSegmentBlocked(flow, before, after) {
  for (let part = 1; part <= 4; part++) {
    const horizontal = before[0] + (after[0] - before[0]) * part / 4;
    const vertical = before[1] + (after[1] - before[1]) * part / 4;
    if (!flow.cell(Math.floor(horizontal / flow.spacing), Math.floor(vertical / flow.spacing))) return true;
  }
  return false;
}
