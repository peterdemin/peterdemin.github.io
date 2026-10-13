# Stretchy lunar flag

The standalone page and RST book embed share the same model. The browser uses
`bundle.js`, generated from `physics.mjs` and `main.mjs`; this also works with
local-file previews without module-import restrictions.

## Build and preview

```sh
python3 scripts/build_moon_flag.py
python3 scripts/build_moon_flag.py --check
python3 -m http.server 8766 --bind 127.0.0.1
```

Open `http://127.0.0.1:8766/source/_static/moon-flag/index.html`. `make html`
regenerates the bundle before Sphinx copies the static assets. The book's
`02-moon-flag.rst` embeds `index.html?embedded=1`; its parent sends only theme
colors and font via source-checked messages. Embedded mode hides redundant
standalone prose, retains the dark lit scene, and matches light/dark controls.

## Exactly which equations are implemented?

The first **Elastic cloth model** chapter now defines both its introductory
small-strain law and the finite-strain/discrete-bending laws used by this flag.
The following symbols and formulas are developed there before use.

- Each reference triangle has area A; its three vertices receive mass 0.22 A/3 kg.
  Total mass is 0.7392 kg for a 2.4 × 1.4 m sheet, independent of deformation.
- Constant per-triangle material derivatives u and v are computed from linear
  triangle interpolation and the inverse reference-coordinate map, not world
  axis displacements. Dimensionless Green strains are p=(u·u−1)/2,
  q=(v·v−1)/2 and s=u·v. They ignore rigid rotation and translation.
- Reference-area energy is A[K(p²+q²)+2C pq+Ks s²]/2. K=35, C=3.5 and Ks=0.35
  N/m have continuum sheet meanings, not edge-spring meanings. These illustrative
  values make extension much softer than the chapter's introductory material.
- `membraneConstraint` splits that identical energy into p+q, p−q and s, with
  stiffnesses A(K+C)/2, A(K−C)/2 and A Ks. `membraneCorrection` uses their analytic
  position gradients and XPBD compliance 1/(stiffness × timestep²).
- For each interior edge, `hingeGeometry` computes the signed turn between the
  two face normals and its analytic gradients. The discrete bending law is
  E=B Σ[L²/(Aleft+Aright)](theta−theta0)²/2, with fixed reference lengths/areas,
  theta0=0 and chosen B=0.2 N m. `bendingCorrection` uses exactly this energy's
  stiffness and gradient. Planar nonuniform stretching has zero bending energy.

The bending law is a specified discrete material law in the geometric-hinge
family, not a claim of complete isotropic shell theory. Its weights retain
energy under regular refinement, unlike the old unscaled second-difference
proxy. The fixed triangle grid still has directional bias: the refinement
test's 45-degree cylinder approaches about three times the aligned-cylinder
energy. The chapter explicitly distinguishes this from its scalar introductory
curvature example; no hidden mesh-by-mesh fitting is performed.

The finite-strain energy is a deliberately simple Saint-Venant–Kirchhoff-like
extension. It reduces to the chapter's small-strain membrane expression but
is not measured fabric behavior at 55% extension or severe compression.
Objectivity under rotation is not evidence of material validity at large strain.

## Limits, dynamics and interaction

The additional teaching inequality is |u|≤1.55 and |v|≤1.55 in every triangle.
It bounds the two thread directions, **not every diagonal or principal stretch**.
Zero-compliance unilateral projections enforce the cap; accepted states tolerate
0.0001 excess ratio. This is separate from elastic energy, not real tearing or
measured strain stiffening. The display reports maximum positive thread strain.

Only the left edge is pinned exactly. Reset temporarily holds the top-right
corner and gives the free sheet a 7 cm smooth geometric perturbation; this is
initial deformation, not extra manufactured fullness or a prescribed animation.
Mouse/touch drag releases on up, cancel, lost capture, blur or hidden document.
Space/Enter toggle holding, arrows pull, Escape releases; buttons release/reset.
The camera remains frontal. Area-weighted vertex normals supply shape lighting.

Gravity is 1.62 m/s²; there is no wind or air drag. At 1/120 s steps, velocities
receive gravity, then numerical exponential damping at 0.35/s. Positions are
predicted, then corrected with 12 material/hinge/cap sweeps plus up to 60 extra
cap sweeps. Multipliers reset each step. Velocities are reconstructed from
accepted position changes. Nonfinite or over-limit states roll back and halve
velocity; hand speed slows adaptively from 2.4 m/s. These are solver safeguards.
The hand target is bounded by reference thread-path lengths to pinned points
(the sum of coordinate distances, not their straight-line distance), each
multiplied by 1.55. These necessary reach bounds do not replace the local cap.
They are not material laws or exact energy conservation. Frame catch-up is capped, so
simulation time may lag wall time on slow devices. Collapsed triangles have
undefined hinge normals and are skipped by the hinge solver; this is not a
validated compression or inversion treatment.

No self-contact, ground/pole contact, tearing, plasticity, calibrated settling
time or real material validation is provided. Folds can overlap.

## Correspondence tests

```sh
node source/_static/moon-flag/checks.mjs
python3 scripts/build_moon_flag.py --check
```

`material-checks.mjs` verifies analytic homogeneous extension/shear/coupling
energies, transverse coupling response, shear-sign symmetry, membrane and
hinge finite-difference gradients, the energy derivative force formula, XPBD
correction, rigid-motion invariance, zero bending for planar uneven stretch,
and bending refinement with fixed physical geometry and rigidity. Both aligned
and oblique cylinders are tested; directional bias is reported, not concealed.

`checks.mjs` also exercises total mass, exact pins, gravity on/off, useful
stretch, repeated/extreme pulls and accepted caps, finite states, reset, and
substantial release from default and stretched states within three simulated
seconds. These numerical checks establish equation correspondence and behavior,
not experimental validation.

## Sources

- [Abaqus: orthotropic Green-strain energy](https://docs.software.vt.edu/abaqusv2025/English/SIMACAESUBRefMap/simasub-c-uanisohyper_strain.htm)
- [Grinspun et al.: Discrete Shells](https://multires-1.cms.caltech.edu/pubs/ds.pdf), geometric hinge-energy family; our dual-width convention is defined in the chapter.
- [Tamstorf and Grinspun: hinge-angle derivatives](https://la.disneyresearch.com/wp-content/uploads/Discrete-Bending-Forces-and-Their-Jacobians-Paper.pdf)
- [Macklin et al.: XPBD](https://matthias-research.github.io/pages/publications/XPBD.pdf)
- [NASA: lunar gravity](https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html)
