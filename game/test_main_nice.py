import pygame
import pytest

from .main_nice import MODES, PALETTE, Renderer
from .obstacles import StaticBox
from .primitives import Point


@pytest.mark.parametrize("mode", MODES)
@pytest.mark.parametrize("studio", (False, True))
def test_static_box_rendering(monkeypatch, mode, studio):
    monkeypatch.setenv("SDL_VIDEODRIVER", "dummy")
    pygame.display.init()
    try:
        screen = pygame.display.set_mode((96, 96))
        renderer = Renderer(screen.get_size(), 50, mode, studio)
        background = pygame.transform.smoothscale(
            renderer.background, screen.get_size()
        )
        box = StaticBox(Point(-0.4, 0.3), Point(0.2, -0.1))
        renderer.canvas.blit(renderer.background, (0, 0))
        renderer.primitive(box.primitive())
        pygame.transform.smoothscale(renderer.canvas, screen.get_size(), screen)

        # The box spans x=28..58, y=33..53 in display coordinates. Check its
        # interior and untouched surroundings, independent of edge filtering.
        color = PALETTE["green"] if studio else "green"
        assert screen.get_at((43, 43)) == pygame.Color(color)
        for x, y in ((20, 43), (65, 43), (43, 25), (43, 60)):
            assert screen.get_at((x, y)) == background.get_at((x, y))
    finally:
        pygame.display.quit()
