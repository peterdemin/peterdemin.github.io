// One instanced quad per disk/capsule; distances are in physical pixels.
struct Settings {
    size: vec2f,
    scale: f32,
    studio: f32,
    analytic: f32,
    srgb: f32,
    padding: vec2f,
};
struct Shape {
    a: vec2f,
    b: vec2f,
    color: vec4f,
    radius: f32,
    shaded: f32,
    padding: vec2f,
};
@group(0) @binding(0) var<uniform> settings: Settings;
@group(0) @binding(1) var<storage, read> shapes: array<Shape>;

struct Lens {
    center: vec2f,
    zoom: f32,
    margin: f32,
};
@group(0) @binding(2) var scene: texture_2d<f32>;
@group(0) @binding(3) var<uniform> lens: Lens;

// Nearest-neighbor enlargement of an already rendered edge. Zooming the
// geometry instead would redraw a smooth circle and hide the pixel coverage.
@fragment
fn inspect_fragment(@builtin(position) p: vec4f) -> @location(0) vec4f {
    let dimensions = textureDimensions(scene);
    var color = textureLoad(scene, vec2i(p.xy), 0);
    let panel_size = 32 * lens.zoom;
    let origin = vec2f(f32(dimensions.x) - panel_size - lens.margin, lens.margin);
    let local = p.xy - origin;
    let inside = all(local >= vec2f(0)) && all(local < vec2f(panel_size));
    if inside {
        let source = vec2i(floor(lens.center - 16 + local / lens.zoom));
        color = textureLoad(scene, clamp(source, vec2i(0), vec2i(dimensions) - 1), 0);
    }
    let panel_edge = min(min(local.x, local.y), min(panel_size - local.x, panel_size - local.y));
    if inside && panel_edge < 2 {
        color = vec4f(output_color(vec3f(0.8, 0.86, 0.94)), 1);
    }
    // Mark the exact source crop on the ball, excluding the enlarged panel.
    let source_box = abs(p.xy - lens.center);
    if !inside && max(source_box.x, source_box.y) >= 16 && max(source_box.x, source_box.y) < 17 {
        color = vec4f(output_color(vec3f(0.8, 0.86, 0.94)), 1);
    }
    return color;
}

// Hex palette values are sRGB. Convert for linear blending on sRGB targets.
fn output_color(rgb: vec3f) -> vec3f {
    if settings.srgb < 0.5 { return rgb; }
    return select(pow((rgb + 0.055) / 1.055, vec3f(2.4)),
                  rgb / 12.92, rgb <= vec3f(0.04045));
}

@vertex
fn background_vertex(@builtin(vertex_index) index: u32) -> @builtin(position) vec4f {
    let corners = array<vec2f, 3>(vec2f(-1, -1), vec2f(3, -1), vec2f(-1, 3));
    return vec4f(corners[index], 0, 1);
}

@fragment
fn background_fragment(@builtin(position) p: vec4f) -> @location(0) vec4f {
    var rgb = vec3f(0);
    if settings.studio > 0.5 {
        rgb = mix(vec3f(16, 26, 43), vec3f(27, 44, 64), p.y / settings.size.y) / 255;
        let spacing = settings.scale / 4;
        let cell = abs(fract((p.xy - settings.size / 2) / spacing + 0.5) - 0.5) * spacing;
        let grid = 1 - smoothstep(0.25, 1.25, min(cell.x, cell.y));
        rgb = mix(rgb, vec3f(35, 54, 75) / 255, grid * 0.65);
    }
    return vec4f(output_color(rgb), 1);
}

struct VertexOutput {
    @builtin(position) position: vec4f,
    // Sample interpolation makes hard shader contours use individual MSAA
    // samples, rather than discarding the entire pixel at the circle boundary.
    @location(0) @interpolate(perspective, sample) pixel: vec2f,
    @location(1) @interpolate(flat) shape_index: u32,
};

@vertex
fn shape_vertex(@builtin(vertex_index) vertex: u32,
                @builtin(instance_index) instance: u32) -> VertexOutput {
    let corners = array<vec2f, 6>(vec2f(0, 0), vec2f(1, 0), vec2f(0, 1),
                                vec2f(0, 1), vec2f(1, 0), vec2f(1, 1));
    let shape = shapes[instance];
    let lo = min(shape.a, shape.b) - shape.radius - 2;
    let hi = max(shape.a, shape.b) + shape.radius + 2;
    let pixel = mix(lo, hi, corners[vertex]);
    var result: VertexOutput;
    result.position = vec4f(pixel / settings.size * vec2f(2, -2) + vec2f(-1, 1), 0, 1);
    result.pixel = pixel;
    result.shape_index = instance;
    return result;
}

@fragment
fn shape_fragment(input: VertexOutput) -> @location(0) vec4f {
    let shape = shapes[input.shape_index];
    let ab = shape.b - shape.a;
    let t = clamp(dot(input.pixel - shape.a, ab) / max(dot(ab, ab), 0.00001), 0, 1);
    let distance = length(input.pixel - shape.a - t * ab) - shape.radius;
    var coverage = 1.0;
    if settings.analytic > 0.5 {
        // A one-physical-pixel coverage ramp also handles subpixel movement.
        coverage = 1 - smoothstep(-0.5, 0.5, distance);
        if coverage <= 0 { discard; }
    } else if distance > 0 {
        discard;
    }
    var rgb = shape.color.rgb;
    if shape.shaded > 0.5 {
        let q = (input.pixel - shape.a) / shape.radius;
        let light = exp(-dot(q + vec2f(0.25, 0.3), q + vec2f(0.25, 0.3)) * 3);
        rgb = mix(rgb, vec3f(1), light * 0.22);
        let rim = smoothstep(-1.5, -0.5, distance);
        rgb = mix(rgb, mix(shape.color.rgb, vec3f(1), 0.3), rim);
    }
    return vec4f(output_color(rgb), shape.color.a * coverage);
}
