#!/usr/bin/env python
from dataclasses import dataclass

import pygame
import pytest

from .ball import Ball, BallControls
from .obstacles import Floor, Wall
from .primitives import Primitive
from .string import Node, String


@dataclass
class GameControls:
    ball = BallControls()
    reset: bool = False


class World:
    def __init__(self, controls: GameControls) -> None:
        self.ball = Ball()
        self.ball2 = Ball(1, 0, color="green")
        self.string = String.from_anchors(Node(3, 3), Node(-3, 0))
        self.obstacles = [Floor(-8), Floor(8), Wall(-12), Wall(12)]
        self.controls = controls
        self.ticks_per_frame = 1
        self.step = 0.001

    def adjust(self, width: int, height: int, scale: float) -> None:
        w, h = width / scale / 2, height / scale / 2
        self.obstacles[0].y = -h - self.obstacles[0].thickness / 2
        self.obstacles[0].length = w * 2
        self.obstacles[1].y = h + self.obstacles[1].thickness / 2
        self.obstacles[1].length = w * 2
        self.obstacles[2].x = -w - self.obstacles[2].thickness / 2
        self.obstacles[2].length = h * 2
        self.obstacles[3].x = w + self.obstacles[3].thickness / 2
        self.obstacles[3].length = h * 2
        self.ball.y = h / 2
        self.ball2.x = w / 10
        self.string = String.from_anchors(
            Node(-w * 3 / 4, h * 3 / 4),
            Node(w * 3 / 4, h / 2),
        )

    def reset(self) -> None:
        self.ball = Ball()

    def primitives(self) -> list[Primitive]:
        return [
            o.primitive() for o in [self.ball, self.ball2, self.string] + self.obstacles
        ]

    def tick(self, dt_sec: float) -> None:
        stop = dt_sec * self.ticks_per_frame
        if self.controls.reset:
            self.reset()
        self.ball.control(self.controls.ball)
        t = 0
        while t < stop:
            substep = self.next_valid(stop - t, [self.ball, self.ball2])
            self.ball = self.ball.next_tick(substep)
            self.ball2 = self.ball2.next_tick(substep)
            self.string = self.string.next_tick(substep)
            self.repair([self.ball, self.ball2])
            for o in self.obstacles:
                o.bounce(self.ball)
                o.bounce(self.ball2)
            self.ball2.bounce(self.ball)
            t += substep

    def next_valid(self, stop: float, balls: list[Ball]) -> float:
        substep = min(stop, self.step)
        while True:
            if self.is_valid([ball.next_tick(substep) for ball in balls]):
                return substep
            substep /= 2
            if substep < self.step / 256:
                raise RuntimeError("Invalid world")

    def is_valid(self, balls: list[Ball]) -> bool:
        for i, ball in enumerate(balls):
            if any(o.collides(ball) for o in self.obstacles):
                return False
            for ball2 in balls[:i]:
                if ball.collides(ball2):
                    return False
        return True

    def repair(self, balls: list[Ball]) -> None:
        """Push apart colliding balls"""
        for _ in range(80):
            corrected = False
            for i, ball in enumerate(balls):
                for o in self.obstacles:
                    c = o.correction(ball)
                    if c != (0, 0):
                        corrected = True
                        ball.x -= c[0]
                        ball.y -= c[1]
                for ball2 in balls[:i]:
                    c = ball2.correction(ball)
                    if c != (0, 0):
                        corrected = True
                        ball.x -= c[0] / 2
                        ball.y -= c[1] / 2
                        ball2.x += c[0] / 2
                        ball2.y += c[1] / 2
            if not corrected:
                return


class Game:
    def __init__(self, world: World, controls: GameControls):
        pygame.init()
        # self.screen = pygame.display.set_mode((0, 0), pygame.FULLSCREEN, vsync=1)
        self.screen = pygame.display.set_mode((640, 480), vsync=1)
        self.clock = pygame.time.Clock()
        self.running = True
        self.world = world
        self.scale = 400
        self.world.adjust(self.screen.get_width(), self.screen.get_height(), self.scale)
        self.controls = controls

    def run(self) -> None:
        dt = 0.0
        while self.running:
            self.read_events()
            self.world.tick(dt)
            self.draw()
            dt = self.clock.tick(60) / 1000
        pygame.quit()

    def draw(self) -> None:
        self.screen.fill("black")
        for p in self.world.primitives():
            p.draw(self.screen, self.scale)
        pygame.display.update()

    def read_events(self) -> None:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                self.running = False
        keys = pygame.key.get_pressed()
        self.controls.reset = keys[pygame.K_r]
        self.controls.ball.up = keys[pygame.K_w]
        self.controls.ball.right = keys[pygame.K_d]
        self.controls.ball.down = keys[pygame.K_s]
        self.controls.ball.left = keys[pygame.K_a]


def main():
    controls = GameControls()
    game = Game(World(controls), controls)
    game.run()


@pytest.mark.parametrize(
    "x,cx",
    [
        (2, 0),
        (1, -1),
        (0.1, -1.9),
        (0.9, -1.1),
    ],
)
def test_obstacle_correction(x, cx):
    o, b = Wall(0, thickness=2), Ball(x, 0)
    assert o.correction(b) == (cx, 0)
    o, b = Floor(0, thickness=2), Ball(0, x)
    assert o.correction(b) == (0, cx)


if __name__ == "__main__":
    main()
