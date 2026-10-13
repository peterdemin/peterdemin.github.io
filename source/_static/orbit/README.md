# RK4 satellite orbit

`satellite-orbit.rst` follows `simulation-basics.rst` in the explicitly
ordered book toctree. Canvas 2D, fixed orbital-plane view, no
controls, no CDN. The classic bundle avoids file-preview module imports.

```sh
python3 scripts/build_orbit.py
python3 scripts/build_orbit.py --check
node source/_static/orbit/checks.mjs
```

`make html` rebuilds this bundle along with the other demos. Standalone URL:
`/_static/orbit/index.html` under the built site's server.

## Model and computation

- Earth `mu = 3.98600435507e14 m³/s²`, from the Earth DE440 value in
  [JPL astrodynamic parameters](https://ssd.jpl.nasa.gov/astro_par.html).
- Spherical Earth radius `6371008.4 m`, from
  [JPL physical parameters](https://ssd.jpl.nasa.gov/planets/phys_par.html).
- Test mass 1000 kg; fixed Earth; no atmosphere, thrust, J2 or other bodies.
- Eccentricity 0.7, perigee center distance 8000000 m, semimajor axis
  26666666.67 m, apogee 45333333.33 m. Initial perigee speed 9203.40 m/s
  from vis-viva; apogee 1624.13 m/s. Earth disk uses the actual distance
  scale; satellite symbol enlarged, not physical size.
- Stored state `[x,y,vx,vy]`, derivatives `[vx,vy,-mu*x/r³,-mu*y/r³]`.
  `rk4` takes four trial-state/time slopes and the 1:2:2:1 weighted update
  of the entire state, fixed 2 s ticks. No orbit interpolation drives it.
- Analytic period 43337.52 s (12.04 h). Playback multiplier `period/10`,
  nominal 10 visible wall seconds per turn. At most 0.1 wall seconds/frame
  and 256 physical ticks; excess whole-tick budget dropped. Visibility
  changes clear elapsed accumulation. Slow frames slow the display.
- No reset at a turn, energy renormalization, or trajectory correction.
  Trace records accepted positions every 20 s; bounded ring retains latest
  analytic period to within one sample interval. Straight trace segments.
- Orange force `mass*gravity(state)` in N, mint velocity in m/s. Attached
  direction arrows separately auto-scale to 46/66 CSS px desktop, 32/46
  narrow view; live N/px and (m/s)/px conversions. Lengths are not comparable
  physical magnitudes. Numeric values are never playback-multiplied.
- `invariants`: energy per mass and signed angular momentum per mass.
  Positive-axis crossings interpolate period without affecting state.

`checks.mjs` covers gravity, exact RK4 stages, analytic eccentric orbit,
fourth-order step refinement, perigee/apogee/speeds, 100-orbit conservation
drift, finite state, numerical period, trace bounds, frame-rate independence,
hidden/stalled frames and no-controls HTML. RK4 is not symplectic; tests
bound drift for this illustrative display, not unlimited-time conservation
or mission accuracy. Other simulators are unchanged.
