"""Check the displayed Python equations/update against the actual demo solver."""

import json
from pathlib import Path
import subprocess
import sys

sys.dont_write_bytecode = True
import numpy as np
import example as model

physics_uri = Path(__file__).with_name('physics.mjs').resolve().as_uri()
javascript = r"""
const {ElasticString,rateFunction,ANCHOR,LENGTH,STEP}=await import(process.argv[1]);
const held=new ElasticString();
for(let i=0;i<400;i++)held.step();
const dropped=new ElasticString();dropped.release();
for(let i=0;i<600;i++)dropped.step();
const moving=new ElasticString();
const target=[ANCHOR[0]+LENGTH-.03,ANCHOR[1]-.01];moving.move(target);
for(let i=0;i<400;i++)moving.step();
moving.release();
for(let i=0;i<200;i++)moving.step();
const curve=new ElasticString();
for(let i=0;i<=curve.p.segments;i++){
  curve.state[2*i]=ANCHOR[0]+1.01*LENGTH*i/curve.p.segments;
  curve.state[2*i+1]+=.05*Math.sin(4*Math.PI*i/curve.p.segments);
  curve.state[curve.p.size+2*i]=.03*Math.sin(i);
  curve.state[curve.p.size+2*i+1]=.02*Math.cos(i);
}
console.log(JSON.stringify({held:Array.from(held.state),dropped:Array.from(dropped.state),
  moving:Array.from(moving.state),target,input:Array.from(curve.state),
  rates:Array.from(rateFunction(curve.state,curve.p,false))}));
"""
reference = json.loads(subprocess.check_output(
    ['node', '--input-type=module', '-e', javascript, physics_uri], text=True))


def unpack(values):
    return np.asarray(values).reshape(2, model.N + 1, 2)


def compare(name, state):
    expected = unpack(reference[name])
    np.testing.assert_allclose(state[0], expected[0], rtol=1e-8, atol=1e-8)
    np.testing.assert_allclose(state[1], expected[1], rtol=1e-6, atol=3e-6)


sample = unpack(reference['input'])
original = sample.copy()
np.testing.assert_allclose(model.f(sample, held=False), unpack(reference['rates']), rtol=1e-8, atol=1e-8)
np.testing.assert_array_equal(sample, original)

held = model.initial_state()
for _ in range(400):
    held = model.tick(held, model.h)
compare('held', held)

dropped = model.release(model.initial_state())
for _ in range(600):
    dropped = model.tick(dropped, model.h, held=False)
compare('dropped', dropped)

moving = model.initial_state()
for _ in range(400):
    moving = model.tick(moving, model.h, target=reference['target'])
moving = model.release(moving)
for _ in range(200):
    moving = model.tick(moving, model.h, held=False)
compare('moving', moving)
print('PASS Python/JavaScript parity: rate function, held endpoint, release, dragging and contour corrections')

# Isolate one shortened pair, with all other links safely extended.
# Check the inverse-mass formula and its velocity/impulse update analytically.
for i, held_flag in [(model.N // 2, False), (0, False), (model.N - 1, False), (model.N - 1, True)]:
    state = model.initial_state()
    state[0, :, 0] = model.anchor[0] + 1.05 * model.L0 * np.arange(model.N + 1) / model.N
    if held_flag:
        state[0, i, 0] = state[0, i + 1, 0] - 0.99 * model.ell0
    else:
        state[0, i + 1, 0] = state[0, i, 0] + 0.99 * model.ell0
    start = state.copy()
    inverse = 1 / model.mass
    inverse[0] = 0
    if held_flag:
        inverse[-1] = 0
    deficit = model.ell0 - np.linalg.norm(state[0, i + 1] - state[0, i])
    expected = np.array([-inverse[i], inverse[i + 1]]) * deficit / (inverse[i] + inverse[i + 1])
    model.project_contour(state, model.h, held_flag)
    np.testing.assert_allclose(state[0, i:i+2, 0] - start[0, i:i+2, 0], expected, atol=1e-12)
    np.testing.assert_allclose(state[1, i:i+2, 0], expected / model.h, atol=1e-9)
print('PASS mathematical correction and impulse formulas for equal masses, half-mass endpoint and prescribed nodes')
