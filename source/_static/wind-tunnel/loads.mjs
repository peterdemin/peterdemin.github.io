export function pressureLoads(flow) {
  const faces = [];
  const force = [0, 0];
  const spacing = flow.spacing;
  for (let row = 0; row < flow.rows; row++) for (let column = 0; column < flow.columns; column++) {
    if (flow.cell(column, row)) continue;
    for (const [normalX, normalY] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const fluidColumn = column + normalX;
      const fluidRow = row + normalY;
      if (!flow.cell(fluidColumn, fluidRow)) continue;
      const fluidIndex = fluidRow * flow.columns + fluidColumn;
      const pressure = flow.pressure[fluidIndex];
      const contribution = [-pressure * spacing * normalX, -pressure * spacing * normalY];
      force[0] += contribution[0];
      force[1] += contribution[1];
      faces.push({position: [(column + 0.5 + normalX / 2) * spacing, (row + 0.5 + normalY / 2) * spacing, 0], normal: [normalX, normalY], pressure, force: contribution, fluidIndex});
    }
  }
  return {faces, force, drag: force[0], lift: force[1]};
}

export function pressureColor(pressure, range) {
  const fraction = Math.min(1, Math.abs(pressure) / range);
  const neutral = [0.13, 0.19, 0.24];
  const extreme = pressure < 0 ? [0.20, 0.59, 0.94] : [0.94, 0.39, 0.18];
  return neutral.map((value, index) => value + fraction * (extreme[index] - value));
}

export function pressureField(flow) {
  let range = 1e-9;
  for (let index = 0; index < flow.pressure.length; index++) {
    if (flow.fluid[index]) range = Math.max(range, Math.abs(flow.pressure[index]));
  }
  const vertices = [];
  for (let row = 0; row < flow.rows; row++) for (let column = 0; column < flow.columns; column++) {
    const index = row * flow.columns + column;
    if (!flow.fluid[index]) continue;
    const color = [...pressureColor(flow.pressure[index], range), 0.68];
    for (const [offsetX, offsetY] of [[0, 0], [1, 0], [1, 1], [0, 0], [1, 1], [0, 1]]) {
      vertices.push((column + offsetX) * flow.spacing, (row + offsetY) * flow.spacing, 0, ...color);
    }
  }
  return {vertices, range};
}
