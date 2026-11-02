#!/usr/bin/env python
import math
from dataclasses import dataclass, replace

import pytest

from .primitives import GameObject, Circle


@dataclass
class BallControls:
    up: bool = False
    right: bool = False
    down: bool = False
    left: bool = False


@dataclass
class Ball(GameObject):
    x: float = 0
    y: float = 4
    vx: float = 0
    vy: float = 0

    color: str = "red"
    radius: float = 0.1
    G = 9.81
    control_impulse = 0.5
    restitution: float = 0.85
    penetration: float = 0.95

    def primitive(self) -> Circle:
        return Circle(self.x, self.y, self.radius, self.color)

    def control(self, controls: BallControls) -> None:
        self.vx += self.control_impulse * controls.right
        self.vx -= self.control_impulse * controls.left
        self.vy += self.control_impulse * controls.up
        self.vy -= self.control_impulse * controls.down

    def next_tick(self, h: float) -> "Ball":
        r = self.rate()
        return replace(
            self,
            x=self.x + r[0] * h,
            y=self.y + r[1] * h,
            vx=self.vx + r[2] * h,
            vy=self.vy + r[3] * h,
        )

    def rate(self) -> tuple[float, ...]:
        return (self.vx, self.vy, 0, -self.G)

    def collides(self, ball: "Ball") -> bool:
        sd = (self.x - ball.x) ** 2 + (self.y - ball.y) ** 2
        return sd < ((self.radius + ball.radius) * self.penetration) ** 2

    def bounce(self, ball: "Ball") -> None:
        impulse = self.impulse(ball)
        self.vx += impulse[0]
        self.vy += impulse[1]
        ball.vx -= impulse[0]
        ball.vy -= impulse[1]

    def impulse(self, ball: "Ball") -> tuple[float, float]:
        rel_pos = (ball.x - self.x, ball.y - self.y)
        dist = math.hypot(*rel_pos)
        if dist > self.radius + ball.radius:
            return 0, 0
        normal = rel_pos[0] / dist, rel_pos[1] / dist
        dv = ball.vx - self.vx, ball.vy - self.vy
        approach = dv[0] * normal[0] + dv[1] * normal[1]
        if approach >= 0:
            return 0, 0
        impulse = approach * self.restitution
        return impulse * normal[0], impulse * normal[1]

    def correction(self, ball: "Ball") -> tuple[float, float]:
        dr = (self.x - ball.x, self.y - ball.y)
        dist = math.hypot(*dr)
        penetration = dist - (self.radius + ball.radius)
        if penetration >= 0:
            return 0, 0
        normal = dr[0] / dist, dr[1] / dist
        return penetration * normal[0], penetration * normal[1]

    @property
    def state(self) -> tuple[float, ...]:
        return self.x, self.y, self.vx, self.vy


@pytest.mark.parametrize(
    'a,b,impulse',
    [
        ((0, 0, 2, 0), (2, 0, 0, 0), (-2, 0)),
        ((0, 0, 1, 0), (2, 0, -1, 0), (-2, 0)),
        ((0, 0, 0, 0), (2, 0, -2, 0), (-2, 0)),
        ((0, 0, 0, 0), (2, 0, 1, 0), (0, 0)),
        ((0, 0, 0, 0), (3, 0, -2, 0), (0, 0)),
        ((0, 0, 0, 0), (1, 1, -1, 0), (-0.5, -0.5)),
    ]
)
def test_ball_bounce(a, b, impulse):
    ba, bb = Ball(*a, restitution=1), Ball(*b)
    assert ba.impulse(bb) == pytest.approx(impulse)


@pytest.mark.parametrize(
    'x,y,cx,cy',
    [
        (2, 0, 0, 0),
        (1, 0, -1, 0),
        (1.9, 0, -0.1, 0),
        (1, 1, 1 - 2**0.5, 1 - 2**0.5),
    ]
)
def test_ball_correction(x, y, cx, cy):
    ba, bb = Ball(0, 0), Ball(x, y)
    assert ba.correction(bb) == pytest.approx((cx, cy))
