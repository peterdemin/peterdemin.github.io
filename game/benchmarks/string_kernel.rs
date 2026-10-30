//! Experimental equivalent of String.next_tick, using semi-implicit Euler.

/// Advance interleaved x/y/vx/vy state, with two force scratch values per node.
///
/// # Safety
/// The caller must provide aligned, valid, nonoverlapping buffers containing
/// 4*n and 2*n doubles respectively. Both must remain exclusively borrowed for
/// this call. Parameters must satisfy the original simulation's preconditions.
#[no_mangle]
pub unsafe extern "C" fn string_tick(
    state: *mut f64,
    force: *mut f64,
    n: usize,
    h: f64,
    max_step: f64,
    gravity: f64,
    mass: f64,
    segment: f64,
    spring: f64,
    viscosity: f64,
    damping: f64,
    cancel_speed: f64,
    fix_first: i32,
    fix_last: i32,
) {
    if n == 0 {
        return;
    }
    // Only the FFI boundary needs unsafe code; all simulation accesses below
    // use checked slices. Python owns and allocates the buffers.
    let state = unsafe { std::slice::from_raw_parts_mut(state, 4 * n) };
    let force = unsafe { std::slice::from_raw_parts_mut(force, 2 * n) };
    let node_mass = mass / n as f64;
    let mut t = 0.0;
    while t < h {
        let dt = (h - t).min(max_step);
        for f in force.chunks_exact_mut(2) {
            f[0] = 0.0;
            f[1] = -gravity * node_mass;
        }
        for i in 0..n - 1 {
            let a = &state[4 * i..4 * i + 4];
            let b = &state[4 * i + 4..4 * i + 8];
            let dx = b[0] - a[0];
            let dy = b[1] - a[1];
            let length = dx.hypot(dy);
            let extension = length - segment;
            if extension > 0.0 {
                let nx = dx / length;
                let ny = dy / length;
                let rate = (b[2] - a[2]) * nx + (b[3] - a[3]) * ny;
                let tension = (spring * extension + viscosity * rate).max(0.0);
                let fx = nx * tension;
                let fy = ny * tension;
                force[2 * i] += fx;
                force[2 * i + 1] += fy;
                force[2 * i + 2] -= fx;
                force[2 * i + 3] -= fy;
            }
        }
        for (i, a) in state.chunks_exact_mut(4).enumerate() {
            if (i == 0 && fix_first != 0) || (i == n - 1 && fix_last != 0) {
                continue;
            }
            a[2] += (force[2 * i] / node_mass - a[2] * damping) * dt;
            a[3] += (force[2 * i + 1] / node_mass - a[3] * damping) * dt;
            if a[2].abs() <= cancel_speed {
                a[2] = 0.0;
            }
            if a[3].abs() <= cancel_speed {
                a[3] = 0.0;
            }
            a[0] += a[2] * dt;
            a[1] += a[3] * dt;
        }
        t += dt;
    }
}
