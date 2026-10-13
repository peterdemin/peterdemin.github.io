import assert from 'node:assert/strict';
import {MoonFlag, EXTENSION_STIFFNESS, COUPLING_STIFFNESS, SHEAR_STIFFNESS, BENDING_STIFFNESS, STEP} from './physics.mjs';

function close(actual, expected, tolerance = 1e-8) {
  assert(Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected)), `${actual} != ${expected}`);
}

function homogeneous(flag, warpStretch, weftStretch, shear) {
  flag.positions = flag.rest.map(([horizontal, vertical]) => [warpStretch * horizontal + shear * vertical, weftStretch * vertical, 0]);
}

function density(warpStretch, weftStretch, shear) {
  const along = (warpStretch ** 2 - 1) / 2;
  const across = (weftStretch ** 2 + shear ** 2 - 1) / 2;
  const angle = warpStretch * shear;
  return (EXTENSION_STIFFNESS * (along ** 2 + across ** 2) + 2 * COUPLING_STIFFNESS * along * across + SHEAR_STIFFNESS * angle ** 2) / 2;
}

const material = new MoonFlag({gravity: 0});
const area = material.width * material.height;
const mass = material.mass.reduce((sum, value) => sum + value, 0);
for (const state of [[1, 1, 0], [1.01, 1, 0], [1.4, 0.94, 0], [1, 1, 0.2], [1.2, 0.93, -0.15]]) {
  homogeneous(material, ...state);
  close(material.membraneEnergy(), area * density(...state));
  close(material.mass.reduce((sum, value) => sum + value, 0), mass);
  close(material.bendingEnergy(), 0);
}
homogeneous(material, 1, 1, 0.2);
const positiveShear = material.membraneEnergy();
homogeneous(material, 1, 1, -0.2);
close(material.membraneEnergy(), positiveShear);
const increment = 1e-6;
homogeneous(material, 1.1, 1 + increment, 0);
const upper = material.membraneEnergy();
homogeneous(material, 1.1, 1 - increment, 0);
const lower = material.membraneEnergy();
close((upper - lower) / (2 * increment), area * COUPLING_STIFFNESS * (1.1 ** 2 - 1) / 2);
console.log('PASS analytic homogeneous extension, shear, coupling force response, reference-area energies and constant mass');

homogeneous(material, 1.12, 0.98, 0.15);
material.positions[material.elements[20].nodes[1]][2] += 0.02;
const element = material.elements[20];
const stiffnesses = [(EXTENSION_STIFFNESS + COUPLING_STIFFNESS) / 2, (EXTENSION_STIFFNESS - COUPLING_STIFFNESS) / 2, SHEAR_STIFFNESS];
const energyGradient = element.nodes.map(() => [0, 0, 0]);
for (let mode = 0; mode < 3; mode++) {
  const value = material.membraneConstraint(element, mode);
  const gradients = element.gradients.map(gradient => [...gradient]);
  for (let local = 0; local < 3; local++) {
    for (let axis = 0; axis < 3; axis++) {
      const node = material.positions[element.nodes[local]];
      node[axis] += increment;
      const positive = material.membraneConstraint(element, mode);
      node[axis] -= 2 * increment;
      const negative = material.membraneConstraint(element, mode);
      node[axis] += increment;
      close((positive - negative) / (2 * increment), gradients[local][axis], 2e-7);
      energyGradient[local][axis] += element.area * stiffnesses[mode] * value * gradients[local][axis];
    }
  }
}
const currentFrame = material.materialFrame(element);
const frame = {...currentFrame, warp: [...currentFrame.warp], weft: [...currentFrame.weft]};
const firstStress = EXTENSION_STIFFNESS * frame.along + COUPLING_STIFFNESS * frame.across;
const secondStress = COUPLING_STIFFNESS * frame.along + EXTENSION_STIFFNESS * frame.across;
for (let local = 0; local < 3; local++) {
  for (let axis = 0; axis < 3; axis++) {
    const expected = element.area * (element.warp[local] * (firstStress * frame.warp[axis] + SHEAR_STIFFNESS * frame.shear * frame.weft[axis]) + element.weft[local] * (secondStress * frame.weft[axis] + SHEAR_STIFFNESS * frame.shear * frame.warp[axis]));
    close(energyGradient[local][axis], expected);
    const node = material.positions[element.nodes[local]];
    const elementEnergy = () => {
      const state = material.materialFrame(element);
      return element.area * (EXTENSION_STIFFNESS * (state.along ** 2 + state.across ** 2) + 2 * COUPLING_STIFFNESS * state.along * state.across + SHEAR_STIFFNESS * state.shear ** 2) / 2;
    };
    node[axis] += increment;
    const positiveEnergy = elementEnergy();
    node[axis] -= 2 * increment;
    const negativeEnergy = elementEnergy();
    node[axis] += increment;
    close((positiveEnergy - negativeEnergy) / (2 * increment), energyGradient[local][axis], 2e-7);
  }
}
const hinge = material.bends.find(candidate => candidate.nodes.includes(element.nodes[1]));
const geometry = material.hingeGeometry(hinge);
const hingeGradients = geometry.gradients.map(gradient => [...gradient]);
for (let local = 0; local < 4; local++) {
  for (let axis = 0; axis < 3; axis++) {
    const node = material.positions[hinge.nodes[local]];
    node[axis] += increment;
    const positive = material.hingeGeometry(hinge).angle;
    node[axis] -= 2 * increment;
    const negative = material.hingeGeometry(hinge).angle;
    node[axis] += increment;
    close((positive - negative) / (2 * increment), hingeGradients[local][axis], 2e-7);
  }
}
const constraint = material.membraneConstraint(element, 0);
const gradients = element.gradients.map(gradient => [...gradient]);
const compliance = 1 / (element.area * stiffnesses[0] * STEP ** 2);
const denominator = compliance + gradients.reduce((sum, gradient, local) => sum + material.weights[element.nodes[local]] * gradient.reduce((total, value) => total + value * value, 0), 0);
close(material.projectConstraint(element.nodes, gradients, constraint, compliance, 0), -constraint / denominator);
console.log('PASS membrane and signed hinge finite-difference gradients, material force formula and energy-derived XPBD correction');

const membraneEnergy = material.membraneEnergy();
const bendingEnergy = material.bendingEnergy();
material.positions = material.positions.map(([horizontal, vertical, depth]) => [depth + 5, horizontal * Math.cos(0.7) - vertical * Math.sin(0.7) - 3, horizontal * Math.sin(0.7) + vertical * Math.cos(0.7) + 2]);
close(material.membraneEnergy(), membraneEnergy);
close(material.bendingEnergy(), bendingEnergy);
material.positions = material.rest.map(([horizontal, vertical]) => [horizontal + 0.1 * horizontal ** 2, vertical, 0]);
close(material.bendingEnergy(), 0);
console.log('PASS rigid translation/rotation invariance and zero bending for planar nonuniform strain');

for (const orientation of [0, Math.PI / 4, Math.PI / 2]) {
  let previousError = Infinity;
  let previousEnergy = 0;
  for (const columns of [12, 24, 48]) {
    const cylinder = new MoonFlag({columns, rows: columns * 14 / 24});
    const radius = 4;
    cylinder.positions = cylinder.rest.map(([horizontal, vertical]) => {
      const along = horizontal * Math.cos(orientation) + vertical * Math.sin(orientation);
      const across = -horizontal * Math.sin(orientation) + vertical * Math.cos(orientation);
      return [radius * Math.sin(along / radius), across, radius * (1 - Math.cos(along / radius))];
    });
    const energy = cylinder.bendingEnergy();
    const expected = 0.5 * BENDING_STIFFNESS * area / radius ** 2;
    if (orientation !== Math.PI / 4) {
      const error = Math.abs(energy / expected - 1);
      assert(error < previousError);
      previousError = error;
    } else if (previousEnergy) assert(Math.abs(energy / previousEnergy - 1) < 0.15);
    previousEnergy = energy;
    console.log('BENDING refinement', orientation.toFixed(3), columns, energy.toExponential(6), 'J');
  }
}
console.log('PASS fixed-rigidity bending refinement, with grid-orientation dependence tested separately');
