#!/usr/bin/env python
"""Rendering experiments for the simulation in main.py (same physics).

Run from the repository root: python -m game.main_nice

1: original pygame drawing; useful as an unmodified baseline.
2: gfxdraw antialiased circles and round, thick strokes at display resolution.
3: 2x supersampling; smooth edges with a modest surface/memory cost.
4: 4x supersampling; best subpixel motion, but 16x as many pixels to draw.

Supersampling renders geometry at higher resolution and smoothscales once at
the end. Unlike native gfxdraw AA, it also reduces position/radius rounding.
Neither method needs OpenGL or additional dependencies beyond pygame.
Tab toggles an optional studio treatment independently of the AA mode.
Vsync is requested by default; --no-vsync uses a software 60 FPS cap instead.

For reproducible captures (including on machines without a display):
    python -m game.main_nice --headless --frames 30 --screenshot /tmp/nice.png
    python -m game.main_nice --mode raw --style classic
"""

import argparse
import math
import os
import warnings
from pathlib import Path as FilePath

import pygame
import pygame.gfxdraw

from .main import GameControls, World
from .primitives import Circle, Line, Path

MODES = ("raw", "native", "ssaa2", "ssaa4")
LABELS = {
    "raw": "1 · Original",
    "native": "2 · Native AA",
    "ssaa2": "3 · Supersampling 2x",
    "ssaa4": "4 · Supersampling 4x",
}
PALETTE = {"red": "#ff786e", "green": "#6de3b1", "white": "#cbd9eb", "blue": "#426182"}


class Renderer:
    """Keep all rendering choices out of the physics and primitive classes."""

    def __init__(self, size: tuple[int, int], scale: float, mode: str, studio: bool):
        self.size = size
        self.scale = scale
        self.configure(mode, studio)

    def configure(self, mode: str, studio: bool) -> None:
        self.mode = mode
        self.studio = studio
        self.factor = {"ssaa2": 2, "ssaa4": 4}.get(mode, 1)
        self.aa = mode == "native"
        self.canvas = pygame.Surface(
            tuple(n * self.factor for n in self.size)
        ).convert()
        self.background = self.canvas.copy()
        self._background()

    def _background(self) -> None:
        if not self.studio:
            self.background.fill("black")
            return
        width, height = self.background.get_size()
        # Cache the gradient/grid, so only moving geometry is redrawn per frame.
        top, bottom = pygame.Color("#101a2b"), pygame.Color("#1b2c40")
        for y in range(height):
            color = top.lerp(bottom, y / max(1, height - 1))
            pygame.draw.line(self.background, color, (0, y), (width, y))
        spacing = max(1, round(self.scale * self.factor / 4))
        for x in range(width // 2 % spacing, width, spacing):
            pygame.draw.line(self.background, "#23364b", (x, 0), (x, height))
        for y in range(height // 2 % spacing, height, spacing):
            pygame.draw.line(self.background, "#23364b", (0, y), (width, y))

    def point(self, x: float, y: float) -> tuple[float, float]:
        width, height = self.canvas.get_size()
        scale = self.scale * self.factor
        return width / 2 + x * scale, height / 2 - y * scale

    def disk(self, center: tuple[float, float], radius: float, color) -> None:
        x, y = (round(v) for v in center)
        radius = max(1, round(radius))
        if self.aa:
            pygame.gfxdraw.filled_circle(self.canvas, x, y, radius, color)
            pygame.gfxdraw.aacircle(self.canvas, x, y, radius, color)
        else:
            pygame.draw.circle(self.canvas, color, (x, y), radius)

    def stroke(self, points: list[tuple[float, float]], width: float, color) -> None:
        # aaline is only one pixel wide. Use filled quads with AA outlines plus
        # round joins/caps for a genuinely thick, continuous antialiased rope.
        radius = max(0.5, width / 2)
        for a, b in zip(points, points[1:]):
            dx, dy = b[0] - a[0], b[1] - a[1]
            length = math.hypot(dx, dy)
            if not length:
                continue
            nx, ny = -dy / length * radius, dx / length * radius
            corners = [
                (round(x), round(y))
                for x, y in (
                    (a[0] + nx, a[1] + ny),
                    (b[0] + nx, b[1] + ny),
                    (b[0] - nx, b[1] - ny),
                    (a[0] - nx, a[1] - ny),
                )
            ]
            if self.aa:
                pygame.gfxdraw.filled_polygon(self.canvas, corners, color)
                pygame.gfxdraw.aapolygon(self.canvas, corners, color)
            else:
                pygame.draw.polygon(self.canvas, color, corners)
        for point in points:
            self.disk(point, radius, color)

    def primitive(self, primitive) -> None:
        # This path deliberately retains the old pixel snapping and square
        # segment joins, making raw/classic a faithful baseline.
        if self.mode == "raw" and not self.studio:
            primitive.draw(self.canvas, self.scale)
            return
        color = pygame.Color(
            PALETTE.get(primitive.color, primitive.color)
            if self.studio
            else primitive.color
        )
        scale = self.scale * self.factor
        if isinstance(primitive, Circle):
            center = self.point(primitive.x, primitive.y)
            radius = primitive.radius * scale
            if self.studio:
                self.disk(
                    (center[0], center[1] + 4 * self.factor),
                    radius + 2 * self.factor,
                    pygame.Color("#0c1523"),
                )
                self.disk(center, radius + self.factor, color.lerp("white", 0.3))
            self.disk(center, radius, color)
            if self.studio:
                # Nested off-center disks suggest lighting without assets or
                # expensive per-frame blurs. All share the selected AA method.
                for i in range(12):
                    fraction = (i + 1) / 12
                    self.disk(
                        (
                            center[0] - radius * 0.20 * fraction,
                            center[1] - radius * 0.25 * fraction,
                        ),
                        radius * (0.88 - 0.45 * fraction),
                        color.lerp("white", 0.22 * fraction),
                    )
        elif isinstance(primitive, Line):
            self.stroke(
                [
                    self.point(primitive.ax, primitive.ay),
                    self.point(primitive.bx, primitive.by),
                ],
                primitive.width * scale,
                color,
            )
        elif isinstance(primitive, Path):
            points = [self.point(p.x, p.y) for p in primitive.points]
            if self.studio:
                self.stroke(
                    [(x, y + 3 * self.factor) for x, y in points],
                    primitive.width * scale + 2 * self.factor,
                    pygame.Color("#0c1523"),
                )
            self.stroke(points, primitive.width * scale, color)
            if self.studio and points:
                for point in (points[0], points[-1]):
                    self.disk(point, 5 * self.factor, pygame.Color("#7992ad"))
                    self.disk(point, 2 * self.factor, pygame.Color("#dbe7f5"))
        else:
            raise TypeError(f"Unsupported primitive: {type(primitive).__name__}")

    def draw(self, screen: pygame.Surface, world: World) -> None:
        self.canvas.blit(self.background, (0, 0))
        for primitive in world.primitives():
            self.primitive(primitive)
        if self.factor == 1:
            screen.blit(self.canvas, (0, 0))
        else:
            pygame.transform.smoothscale(self.canvas, self.size, screen)


class NiceGame:
    def __init__(
        self, size: tuple[int, int], mode: str, studio: bool, vsync: bool = True
    ):
        pygame.init()
        pygame.display.set_caption("Pygame rendering lab")
        # pygame-ce >= 2.2 supports vsync on software display surfaces, without
        # SCALED (which would also change the window's scaling behavior).
        try:
            self.screen = pygame.display.set_mode(size, vsync=int(vsync))
        except pygame.error:
            if not vsync:
                raise
            warnings.warn(
                "Vsync is unavailable; using the 60 FPS software limit.",
                RuntimeWarning,
                stacklevel=2,
            )
            self.screen = pygame.display.set_mode(size, vsync=0)
        self.vsync = pygame.display.is_vsync()
        self.clock = pygame.time.Clock()
        self.controls = GameControls()
        self.world = World(self.controls)
        self.scale = size[1] / 1.2  # Same world framing as main.py's 640 x 480.
        self.world.adjust(*size, self.scale)
        self.renderer = Renderer(size, self.scale, mode, studio)
        self.font = pygame.font.Font(None, 22)
        self.paused = False
        self.help = True
        self.running = True

    def read_events(self) -> None:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                self.running = False
            elif event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    self.running = False
                elif event.key in (pygame.K_1, pygame.K_2, pygame.K_3, pygame.K_4):
                    mode = MODES[event.key - pygame.K_1]
                    self.renderer.configure(mode, self.renderer.studio)
                elif event.key == pygame.K_TAB:
                    self.renderer.configure(
                        self.renderer.mode, not self.renderer.studio
                    )
                elif event.key == pygame.K_SPACE:
                    self.paused = not self.paused
                elif event.key == pygame.K_h:
                    self.help = not self.help
        keys = pygame.key.get_pressed()
        self.controls.reset = keys[pygame.K_r]
        self.controls.ball.up = keys[pygame.K_w]
        self.controls.ball.right = keys[pygame.K_d]
        self.controls.ball.down = keys[pygame.K_s]
        self.controls.ball.left = keys[pygame.K_a]

    def draw(self) -> None:
        self.renderer.draw(self.screen, self.world)
        if self.help:
            style = "Studio" if self.renderer.studio else "Classic"
            lines = [
                f"{LABELS[self.renderer.mode]}   |   {style}   |   {self.clock.get_fps():.0f} FPS"
                + f"   |   VSync {'on' if self.vsync else 'off'}"
                + ("   |   Paused" if self.paused else ""),
                "1–4 rendering   Tab style   Space pause   H hide help",
                "WASD move   R reset ball   Esc quit",
            ]
            # Render text at final resolution: supersampling UI wastes work
            # and makes small text softer. Font.render already antialiases.
            for i, line in enumerate(lines):
                text = self.font.render(line, True, "#dbe7f5")
                rect = text.get_rect(topleft=(16, 14 + i * 23))
                pygame.draw.rect(
                    self.screen, "#101a2b", rect.inflate(10, 4), border_radius=4
                )
                self.screen.blit(text, rect)
        pygame.display.flip()

    def run(
        self, frames: int | None = None, screenshot: FilePath | None = None
    ) -> None:
        frame = 0
        dt = 0.0
        try:
            while self.running and (frames is None or frame < frames):
                self.read_events()
                if not self.running:
                    break
                if not self.paused:
                    self.world.tick(dt)
                self.draw()
                frame += 1
                # flip() already waits for refresh when vsync is active. Avoid
                # a second limiter that can cause missed refresh intervals.
                elapsed = (
                    self.clock.tick(0 if self.vsync and frames is None else 60) / 1000
                )
                # Captures advance deterministically; interactive runs avoid a
                # huge catch-up step after dragging the window or a breakpoint.
                dt = 1 / 60 if frames is not None else min(elapsed, 1 / 30)
            if screenshot:
                pygame.image.save(self.screen, str(screenshot))
        finally:
            pygame.quit()


def main() -> None:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--mode", choices=MODES, default="ssaa4")
    parser.add_argument("--style", choices=("studio", "classic"), default="studio")
    parser.add_argument(
        "--size", type=int, nargs=2, default=(960, 720), metavar=("WIDTH", "HEIGHT")
    )
    parser.add_argument(
        "--frames",
        type=int,
        help="stop after this many frames (fixed 60 Hz simulation)",
    )
    parser.add_argument(
        "--screenshot", type=FilePath, help="save the final frame as an image"
    )
    parser.add_argument(
        "--headless", action="store_true", help="use SDL's dummy video/audio drivers"
    )
    parser.add_argument(
        "--no-vsync",
        action="store_true",
        help="disable the default vsync request (60 FPS cap remains)",
    )
    args = parser.parse_args()
    if min(args.size) < 240:
        parser.error("window dimensions must be at least 240 pixels")
    if args.frames is not None and args.frames < 1:
        parser.error("--frames must be positive")
    if args.headless:
        if args.frames is None:
            parser.error("--headless requires --frames")
        os.environ["SDL_VIDEODRIVER"] = "dummy"
        os.environ["SDL_AUDIODRIVER"] = "dummy"
    game = NiceGame(
        tuple(args.size),
        args.mode,
        args.style == "studio",
        vsync=not (args.no_vsync or args.headless),
    )
    game.run(args.frames, args.screenshot)


if __name__ == "__main__":
    main()
