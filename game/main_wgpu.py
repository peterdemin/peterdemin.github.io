#!/usr/bin/env python
"""Python GPU rendering lab: wgpu uses Metal on macOS, Vulkan/D3D elsewhere.

Install: python -m pip install -r game/requirements_wgpu.txt
Run:     python -m game.main_wgpu
Capture: python -m game.main_wgpu --headless --frames 30 --screenshot /tmp/metal.png

WASD move, R reset ball, Space pause, Tab style, 1-4 AA mode, M magnifier.
Use --inspect to start paused with a pixel magnifier on the red ball's edge.
The window title shows the AA mode and frame rate. Physics stays in main.World.
"""

import argparse
import time
from array import array
from pathlib import Path as FilePath

import pygame
import wgpu

from .main import GameControls, World
from .primitives import Circle, Line, Path

AA_MODES = ("off", "analytic", "msaa", "both")
PALETTE = {"red": "#ff786e", "green": "#6de3b1", "white": "#cbd9eb", "blue": "#426182"}


class GPURenderer:
    def __init__(self, adapter, format: str, aa: str = "analytic", studio: bool = True):
        self.device = adapter.request_device_sync()
        self.format = format
        self.studio = studio
        self.shader = self.device.create_shader_module(
            code=FilePath(__file__).with_name("nice.wgsl").read_text()
        )
        self.settings = self.device.create_buffer(
            size=32, usage=wgpu.BufferUsage.UNIFORM | wgpu.BufferUsage.COPY_DST
        )
        self.capacity = 0
        self.shapes = None
        self.msaa_texture = None
        self.scene_texture = None
        self.lens_settings = self.device.create_buffer(
            size=16, usage=wgpu.BufferUsage.UNIFORM | wgpu.BufferUsage.COPY_DST
        )
        self.target_size = None
        self.configure(aa)

    def configure(self, aa: str) -> None:
        self.aa = aa
        self.samples = 4 if aa in ("msaa", "both") else 1
        self.target_size = None
        self.pipelines = []
        for prefix in ("background", "shape"):
            self.pipelines.append(
                self.device.create_render_pipeline(
                    layout="auto",
                    vertex={"module": self.shader, "entry_point": prefix + "_vertex"},
                    fragment={
                        "module": self.shader,
                        "entry_point": prefix + "_fragment",
                        "targets": [
                            {
                                "format": self.format,
                                "blend": {
                                    "color": {
                                        "src_factor": "src-alpha",
                                        "dst_factor": "one-minus-src-alpha",
                                        "operation": "add",
                                    },
                                    "alpha": {
                                        "src_factor": "one",
                                        "dst_factor": "one-minus-src-alpha",
                                        "operation": "add",
                                    },
                                },
                            }
                        ],
                    },
                    primitive={"topology": "triangle-list"},
                    multisample={"count": self.samples},
                )
            )
        self._bind_groups()
        self.inspect_pipeline = self.device.create_render_pipeline(
            layout="auto",
            vertex={"module": self.shader, "entry_point": "background_vertex"},
            fragment={
                "module": self.shader,
                "entry_point": "inspect_fragment",
                "targets": [{"format": self.format}],
            },
            primitive={"topology": "triangle-list"},
        )

    def _bind_groups(self) -> None:
        self.background_group = self.device.create_bind_group(
            layout=self.pipelines[0].get_bind_group_layout(0),
            entries=[{"binding": 0, "resource": {"buffer": self.settings}}],
        )
        if self.shapes is not None:
            self.shape_group = self.device.create_bind_group(
                layout=self.pipelines[1].get_bind_group_layout(0),
                entries=[
                    {"binding": 0, "resource": {"buffer": self.settings}},
                    {"binding": 1, "resource": {"buffer": self.shapes}},
                ],
            )

    def geometry(self, world: World, size: tuple[int, int], scale: float) -> array:
        data = array("f")
        pixel_ratio = size[1] / 720

        def point(x, y):
            return size[0] / 2 + x * scale, size[1] / 2 - y * scale

        def shape(a, b, radius, color, shaded=0):
            c = pygame.Color(color)
            # WGSL Shape: two vec2s, vec4, two scalars, vec2 padding = 48 bytes.
            data.extend(
                (*a, *b, c.r / 255, c.g / 255, c.b / 255, 1, radius, shaded, 0, 0)
            )

        for p in world.primitives():
            color = PALETTE.get(p.color, p.color) if self.studio else p.color
            if isinstance(p, Circle):
                a = point(p.x, p.y)
                if self.studio:
                    shadow = (a[0], a[1] + 4 * pixel_ratio)
                    shape(shadow, shadow, p.radius * scale + 2 * pixel_ratio, "#0c1523")
                shape(a, a, p.radius * scale, color, int(self.studio))
            elif isinstance(p, (Line, Path)):
                points = (
                    [point(p.ax, p.ay), point(p.bx, p.by)]
                    if isinstance(p, Line)
                    else [point(n.x, n.y) for n in p.points]
                )
                if self.studio and isinstance(p, Path):
                    for a, b in zip(points, points[1:]):
                        shape(
                            (a[0], a[1] + 3 * pixel_ratio),
                            (b[0], b[1] + 3 * pixel_ratio),
                            p.width * scale / 2 + pixel_ratio,
                            "#0c1523",
                        )
                for a, b in zip(points, points[1:]):
                    shape(a, b, p.width * scale / 2, color)
                if self.studio and isinstance(p, Path) and points:
                    for a in (points[0], points[-1]):
                        shape(a, a, 5 * pixel_ratio, "#7992ad")
                        shape(a, a, 2 * pixel_ratio, "#dbe7f5")
            else:
                raise TypeError(f"Unsupported primitive: {type(p).__name__}")
        return data

    def draw(self, texture, world: World, scale: float, inspect: bool = False) -> None:
        size = (texture.width, texture.height)
        data = self.geometry(world, size, scale)
        nbytes = len(data) * data.itemsize
        if nbytes > self.capacity:
            if self.shapes is not None:
                self.shapes.destroy()
            self.capacity = max(48, nbytes * 2)
            self.shapes = self.device.create_buffer(
                size=self.capacity,
                usage=wgpu.BufferUsage.STORAGE | wgpu.BufferUsage.COPY_DST,
            )
            self._bind_groups()
        self.device.queue.write_buffer(self.shapes, 0, data)
        self.device.queue.write_buffer(
            self.settings,
            0,
            array(
                "f",
                [
                    *size,
                    scale,
                    int(self.studio),
                    int(self.aa in ("analytic", "both")),
                    int(self.format.endswith("srgb")),
                    0,
                    0,
                ],
            ),
        )
        if self.target_size != size:
            if self.scene_texture is not None:
                self.scene_texture.destroy()
                self.scene_texture = None
            if self.msaa_texture is not None:
                self.msaa_texture.destroy()
                self.msaa_texture = None
            if self.samples > 1:
                self.msaa_texture = self.device.create_texture(
                    size=(*size, 1),
                    format=self.format,
                    sample_count=self.samples,
                    usage=wgpu.TextureUsage.RENDER_ATTACHMENT,
                )
            self.target_size = size
        if inspect and self.scene_texture is None:
            self.scene_texture = self.device.create_texture(
                size=(*size, 1),
                format=self.format,
                usage=wgpu.TextureUsage.RENDER_ATTACHMENT
                | wgpu.TextureUsage.TEXTURE_BINDING,
            )
        target = (self.scene_texture if inspect else texture).create_view()
        encoder = self.device.create_command_encoder()
        render = encoder.begin_render_pass(
            color_attachments=[
                {
                    "view": (
                        self.msaa_texture.create_view() if self.msaa_texture else target
                    ),
                    "resolve_target": target if self.msaa_texture else None,
                    "clear_value": (0, 0, 0, 1),
                    "load_op": "clear",
                    "store_op": "store",
                }
            ]
        )
        render.set_pipeline(self.pipelines[0])
        render.set_bind_group(0, self.background_group)
        render.draw(3)
        render.set_pipeline(self.pipelines[1])
        render.set_bind_group(0, self.shape_group)
        render.draw(6, len(data) // 12)
        render.end()
        if inspect:
            # Follow a diagonal contour, where staircase edges are most visible.
            ball = world.ball
            offset = ball.radius * scale * 2**-0.5
            center = (
                size[0] / 2 + ball.x * scale + offset,
                size[1] / 2 - ball.y * scale - offset,
            )
            panel = min(256 * size[1] / 720, size[0] * 0.45, size[1] * 0.45)
            self.device.queue.write_buffer(
                self.lens_settings,
                0,
                array(
                    "f",
                    [
                        *center,
                        panel / 32,
                        12 * size[1] / 720,
                    ],
                ),
            )
            group = self.device.create_bind_group(
                layout=self.inspect_pipeline.get_bind_group_layout(0),
                entries=[
                    {"binding": 0, "resource": {"buffer": self.settings}},
                    {"binding": 2, "resource": self.scene_texture.create_view()},
                    {"binding": 3, "resource": {"buffer": self.lens_settings}},
                ],
            )
            present = encoder.begin_render_pass(
                color_attachments=[
                    {
                        "view": texture.create_view(),
                        "load_op": "clear",
                        "clear_value": (0, 0, 0, 1),
                        "store_op": "store",
                    }
                ]
            )
            present.set_pipeline(self.inspect_pipeline)
            present.set_bind_group(0, group)
            present.draw(3)
            present.end()
        self.device.queue.submit([encoder.finish()])

    def save(self, texture, path: FilePath) -> None:
        stride = (texture.width * 4 + 255) // 256 * 256
        pixels = bytes(
            self.device.queue.read_texture(
                {"texture": texture},
                {
                    "offset": 0,
                    "bytes_per_row": stride,
                    "rows_per_image": texture.height,
                },
                (texture.width, texture.height, 1),
            )
        )
        packed = b"".join(
            pixels[y * stride : y * stride + texture.width * 4]
            for y in range(texture.height)
        )
        # pygame is only an image encoder here; no SDL window or CPU drawing.
        image = pygame.image.frombytes(packed, (texture.width, texture.height), "RGBA")
        pygame.image.save(image, str(path))

    def wait(self, texture) -> None:
        # Readback waits for prior GPU work. This also works with wgpu 0.32.0,
        # whose queue.on_submitted_work_done_sync has a native callback bug.
        self.device.queue.read_texture(
            {"texture": texture},
            {"offset": 0, "bytes_per_row": 256, "rows_per_image": 1},
            (1, 1, 1),
        )


def make_world(size):
    controls = GameControls()
    world = World(controls)
    world.adjust(*size, size[1] / 1.2)
    return controls, world


def interactive(args, adapter) -> None:
    from rendercanvas.glfw import RenderCanvas, loop

    canvas = RenderCanvas(size=tuple(args.size), update_mode="continuous", max_fps=60)
    context = canvas.get_wgpu_context()
    format = context.get_preferred_format(adapter)
    renderer = GPURenderer(adapter, format, args.aa, args.style == "studio")
    context.configure(device=renderer.device, format=format)
    controls, world = make_world(args.size)
    keys = set()
    paused = args.inspect
    inspect = args.inspect
    last_time = time.perf_counter()
    frames = 0

    @canvas.add_event_handler("key_down", "key_up", "pointer_leave")
    def on_event(event):
        nonlocal paused, inspect
        if event["event_type"] == "pointer_leave":
            keys.clear()  # Avoid stuck movement when switching apps.
            return
        key = event["key"].lower()
        if event["event_type"] == "key_up":
            keys.discard(key)
            return
        if key in keys:
            return
        keys.add(key)
        if key == "escape":
            canvas.close()
        elif key == " ":
            paused = not paused
        elif key == "tab":
            renderer.studio = not renderer.studio
        elif key == "m":
            inspect = not inspect
        elif key in ("1", "2", "3", "4"):
            renderer.configure(AA_MODES[int(key) - 1])
            print(f"AA mode {key}: {renderer.aa} ({renderer.samples} sample(s))")

    def draw():
        nonlocal last_time, frames
        now = time.perf_counter()
        dt, last_time = min(now - last_time, 1 / 30), now
        size = canvas.get_physical_size()
        if min(size) == 0:
            return
        controls.reset = "r" in keys
        for name, key in (("up", "w"), ("left", "a"), ("down", "s"), ("right", "d")):
            setattr(controls.ball, name, key in keys)
        if not paused:
            world.tick((0 if frames == 0 else 1 / 60) if args.frames else dt)
        # Keep world bounds fixed when resizing, and respect Retina pixel ratio.
        scale = min(size[0] / args.size[0], size[1] / args.size[1]) * args.size[1] / 1.2
        renderer.draw(context.get_current_texture(), world, scale, inspect=inspect)
        canvas.set_title(
            f"{adapter.info['backend_type']} · {AA_MODES.index(renderer.aa) + 1}: {renderer.aa} · {'paused' if paused else '$fps FPS'} | 1–4 AA · M magnifier · Space pause"
        )
        frames += 1
        if args.frames and frames >= args.frames:
            # Run after presentation, so the last frame actually reaches screen.
            loop.call_later(0, canvas.close)

    canvas.request_draw(draw)
    try:
        loop.run()
    finally:
        context.unconfigure()
        canvas.close()
        renderer.device.destroy()


def main() -> None:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--aa", choices=AA_MODES, default="analytic")
    parser.add_argument(
        "--inspect",
        action="store_true",
        help="show a pixel magnifier; start paused in a window",
    )
    parser.add_argument("--style", choices=("classic", "studio"), default="studio")
    parser.add_argument(
        "--size", type=int, nargs=2, default=(960, 720), metavar=("WIDTH", "HEIGHT")
    )
    parser.add_argument(
        "--headless", action="store_true", help="render offscreen on the GPU"
    )
    parser.add_argument(
        "--frames", type=int, help="stop after N frames; use fixed 60 Hz simulation"
    )
    parser.add_argument(
        "--screenshot",
        type=FilePath,
        help="save an offscreen RGBA PNG (requires --headless)",
    )
    args = parser.parse_args()
    if min(args.size) < 240 or (args.frames is not None and args.frames < 1):
        parser.error("size must be at least 240 x 240 and --frames must be positive")
    if args.headless and not args.frames:
        parser.error("--headless requires --frames")
    if args.screenshot and not args.headless:
        parser.error("--screenshot requires --headless")
    adapter = wgpu.gpu.request_adapter_sync(power_preference="high-performance")
    print(f"GPU: {adapter.info['device']} / {adapter.info['backend_type']}")
    if not args.headless:
        interactive(args, adapter)
        return
    renderer = GPURenderer(adapter, "rgba8unorm-srgb", args.aa, args.style == "studio")
    controls, world = make_world(args.size)
    texture = renderer.device.create_texture(
        size=(*args.size, 1),
        format=renderer.format,
        usage=wgpu.TextureUsage.RENDER_ATTACHMENT | wgpu.TextureUsage.COPY_SRC,
    )
    try:
        for frame in range(args.frames):
            if frame:
                world.tick(1 / 60)
            renderer.draw(texture, world, args.size[1] / 1.2, inspect=args.inspect)
        if args.screenshot:
            renderer.save(texture, args.screenshot)
        else:
            # Wait for submitted work before reporting a successful smoke run.
            renderer.wait(texture)
    finally:
        texture.destroy()
        renderer.device.destroy()


if __name__ == "__main__":
    main()
