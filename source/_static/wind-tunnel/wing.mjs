import {CHORD, thickness} from './flow.mjs';

export function buildWingMesh(flow, sections = 80) {
  const vertices = [];
  const cosine = Math.cos(flow.angle);
  const sine = Math.sin(flow.angle);
  const position = (fraction, side) => {
    const along = CHORD * (fraction - 0.5);
    const across = side * Math.max(0, thickness(fraction));
    return [flow.center[0] + along * cosine - across * sine, flow.center[1] + along * sine + across * cosine, 0];
  };
  const color = (fraction, side) => {
    const slope = fraction === 0 ? Infinity : 5 * 0.18 * (0.2969 / (2 * Math.sqrt(fraction)) - 0.126 - 0.7032 * fraction + 0.8529 * fraction ** 2 - 0.4144 * fraction ** 3);
    const length = Math.hypot(slope, 1);
    const horizontal = fraction === 0 ? -1 : -slope / length;
    const vertical = fraction === 0 ? 0 : side / length;
    const normalX = horizontal * cosine - vertical * sine;
    const normalY = horizontal * sine + vertical * cosine;
    const light = 0.30 + 0.65 * Math.max(0, -0.4 * normalX + 0.85 * normalY) + 0.18 * Math.max(0, 0.6 * normalX - 0.5 * normalY);
    return [0.72 * light, 0.83 * light, 0.89 * light, 1];
  };
  const vertex = (point, pigment) => vertices.push(...point, ...pigment);
  for (let section = 0; section < sections; section++) {
    const first = (1 - Math.cos(section * Math.PI / sections)) / 2;
    const second = (1 - Math.cos((section + 1) * Math.PI / sections)) / 2;
    for (const side of [-1, 1]) {
      vertex([...flow.center, 0], [0.60, 0.72, 0.80, 1]);
      vertex(position(first, side), color(first, side));
      vertex(position(second, side), color(second, side));
    }
  }
  return vertices;
}
