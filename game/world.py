from dataclasses import dataclass

from .ball import Ball, BallControls
from .obstacles import StaticBox
from .primitives import Point, Primitive
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
        self.obstacles = [
            StaticBox(Point(-12, -8), Point(12, -9)),
            StaticBox(Point(-12, 9), Point(12, 8)),
            StaticBox(Point(-14, 12), Point(-12, -12)),
            StaticBox(Point(12, 12), Point(14, -12)),
            StaticBox(Point(-1, 1), Point(1, -1)),
            StaticBox(Point(-1, 1), Point(1, -1)),
        ]
        self.controls = controls
        self.ticks_per_frame = 1
        self.step = 0.001

    def adjust(self, width: int, height: int, scale: float) -> None:
        w, h = width / scale / 2, height / scale / 2
        self.obstacles[0].move(-w, w, -h, -h * 2)
        self.obstacles[1].move(-w, w, h * 2, h)
        self.obstacles[2].move(-w * 2, -w, h, -h)
        self.obstacles[3].move(w, w * 2, h, -h)
        self.obstacles[4].move(w * 3 / 10, w * 4 / 10, 0, -h)
        self.obstacles[5].move(-w * 3 / 10, 0, -h * 8 / 10, -h)
        self.ball.y = h / 2
        self.ball2.x = w * 9 / 10
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
            if substep == 0:
                self.repair([self.ball, self.ball2], penetration=False)
                continue
            self.ball = self.ball.next_tick(substep)
            self.ball2 = self.ball2.next_tick(substep)
            self.string = self.string.next_tick(substep)
            for o in self.obstacles:
                o.bounce(self.ball)
                o.bounce(self.ball2)
            self.ball2.bounce(self.ball)
            self.repair([self.ball, self.ball2])
            t += substep

    def next_valid(self, stop: float, balls: list[Ball]) -> float:
        substep = min(stop, self.step)
        while substep >= self.step / 1024:
            if self.is_valid([ball.next_tick(substep) for ball in balls]):
                return substep
            substep /= 2
        return 0

    def is_valid(self, balls: list[Ball]) -> bool:
        for i, ball in enumerate(balls):
            if any(o.collides(ball) for o in self.obstacles):
                return False
            for ball2 in balls[:i]:
                if ball.collides(ball2):
                    return False
        return True

    def repair(self, balls: list[Ball], penetration: bool = True) -> None:
        """Push apart colliding balls"""
        for _ in range(80):
            corrected = False
            for i, ball in enumerate(balls):
                for o in self.obstacles:
                    corrected |= self._correct(ball, *o.correction(ball, penetration))
                for ball2 in balls[:i]:
                    cx, cy = ball2.correction(ball)
                    corrected |= any(
                        (
                            self._correct(ball, cx / 2, cy / 2),
                            self._correct(ball2, -cx / 2, -cy / 2),
                        )
                    )
            if not corrected:
                return

    def _correct(self, ball, cx, cy) -> bool:
        if (cx, cy) == (0, 0):
            return False
        while ball.x + cx == ball.x and ball.y + cy == ball.y:
            # floating point rounds off too small correction
            cx *= 2
            cy *= 2
        ball.x += cx
        ball.y += cy
        return True
