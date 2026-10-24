export function worldPoint(camera, clientX, clientY) {
  return [(clientX - camera.rectangle.left - camera.left) / camera.scale, (camera.floor - clientY + camera.rectangle.top) / camera.scale];
}

export function orangeHit(bodies, camera, point) {
  const distance = body => Math.hypot(...point.map((value, axis) => value - body.position[axis])) * camera.scale;
  const orangeDistance = distance(bodies[0]);
  const blueDistance = distance(bodies[1]);
  if (blueDistance <= bodies[1].radius * camera.scale && blueDistance < orangeDistance) return false;
  return orangeDistance <= Math.max(24, bodies[0].radius * camera.scale + 8);
}
