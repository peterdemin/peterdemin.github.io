#!/usr/bin/env python
from dataclasses import dataclass

from .primitives import Line, GameObject
from .ball import Ball


@dataclass
class Floor(GameObject):
    y: float
    length: float = 50
    thickness: float = 0.5
    penetration = 0.45
    friction = 0.999

    def primitive(self) -> Line:
        return Line(
            "blue",
            -self.length / 2,
            self.y,
            self.length / 2,
            self.y,
            self.thickness,
        )

    def collides(self, ball: Ball) -> bool:
        boundaries = [
            self.y + self.thickness * self.penetration + ball.radius,
            self.y - self.thickness * self.penetration - ball.radius,
        ]
        return any(
            (
                self.y < ball.y < boundaries[0],
                self.y > ball.y > boundaries[1],
            )
        )

    def bounce(self, ball: Ball) -> None:
        boundaries = [
            self.y + self.thickness / 2 + ball.radius,
            self.y - self.thickness / 2 - ball.radius,
        ]
        if self.y < ball.y <= boundaries[0]:
            ball.y = boundaries[0]
            if ball.vy > -0.1:  # Rolling
                ball.vy = 0
                ball.vx *= self.friction
            if ball.vy < 0:
                ball.vy = abs(ball.vy) * ball.restitution
            if abs(ball.vx) < 0.05:
                ball.vx = 0
        if self.y > ball.y >= boundaries[1]:
            ball.y = boundaries[1]
            if ball.vy > 0:
                ball.vy = -abs(ball.vy) * ball.restitution

    def correction(self, ball: "Ball") -> tuple[float, float]:
        boundaries = [
            self.y + self.thickness / 2 + ball.radius,
            self.y - self.thickness / 2 - ball.radius,
        ]
        if self.y < ball.y < boundaries[0]:
            return 0, ball.y - boundaries[0]
        if self.y > ball.y > boundaries[1]:
            return 0, ball.y - boundaries[1]
        return 0, 0


@dataclass
class Wall(GameObject):
    x: float
    length: float = 20
    thickness: float = 1
    penetration: float = 0.45

    def primitive(self) -> Line:
        return Line(
            "blue",
            self.x,
            -self.length / 2,
            self.x,
            self.length / 2,
            self.thickness,
        )

    def collides(self, ball: Ball) -> bool:
        boundaries = [
            self.x + self.thickness * self.penetration + ball.radius,
            self.x - self.thickness * self.penetration - ball.radius,
        ]
        return any(
            (
                self.x < ball.x < boundaries[0],
                self.x > ball.x > boundaries[1],
            )
        )

    def bounce(self, ball: Ball) -> None:
        boundaries = [
            self.x + self.thickness / 2 + ball.radius,
            self.x - self.thickness / 2 - ball.radius,
        ]
        if self.x < ball.x <= boundaries[0]:
            ball.x = boundaries[0]
            if ball.vx < 0:
                ball.vx = abs(ball.vx) * ball.restitution
        if self.x > ball.x >= boundaries[1]:
            ball.x = boundaries[1]
            if ball.vx > 0:
                ball.vx = -abs(ball.vx) * ball.restitution

    def correction(self, ball: "Ball") -> tuple[float, float]:
        boundaries = [
            self.x + self.thickness / 2 + ball.radius,
            self.x - self.thickness / 2 - ball.radius,
        ]
        if self.x < ball.x < boundaries[0]:
            return ball.x - boundaries[0], 0
        if self.x > ball.x > boundaries[1]:
            return ball.x - boundaries[1], 0
        return 0, 0
