#!/usr/bin/env python
import math
from dataclasses import dataclass

from .ball import Ball
from .primitives import GameObject, Point, Rect


@dataclass(slots=True)
class Disk:
    center: Point
    radius: float

    def intersection(self, p: Point) -> tuple[Point, Point] | None:
        d = p - self.center
        if d.length() <= self.radius:
            return p, d.normal()
        return None


@dataclass(slots=True)
class Side:
    a: Point
    b: Point
    n: Point

    def intersection(self, d: Disk) -> tuple[Point, Point] | None:
        bounding_box = Rect.orient(self.a + self.n * d.radius, self.b)
        if bounding_box.within(d.center):
            distance = (d.center - self.a) * self.n
            return (d.center - self.n * distance, self.n)
        return None


@dataclass
class StaticBox(GameObject):
    a: Point
    b: Point
    penetration: float = 0.001
    friction: float = 0.9

    def primitive(self) -> Rect:
        return Rect(self.a, self.b, "green")

    def move(self, ax: float, bx: float, ay: float, by: float) -> None:
        self.a.x = ax
        self.b.x = bx
        self.a.y = ay
        self.b.y = by

    def collides(self, ball: Ball) -> bool:
        return self.correction(ball, True) != (0, 0)

    def bounce(self, ball: Ball) -> None:
        disk = Disk(Point(ball.x, ball.y), ball.radius)
        contact = self.contact(disk, False)
        if contact is None:
            return
        correction = self._correction(disk, contact)
        ball.x += correction.x
        ball.y += correction.y
        n = contact[1]
        v = Point(ball.vx, ball.vy)
        if v * n > 0:
            return
        normal_speed = v * n
        bounce = n * (normal_speed * (1 + ball.restitution))
        ball.vx -= bounce.x
        ball.vy -= bounce.y
        if n.y > 0:
            t = n.tangent()
            tangent_speed = v * t
            friction = t * (tangent_speed * (1 - self.friction))
            ball.vx -= friction.x
            ball.vy -= friction.y

    def correction(self, ball: Ball, penetration: bool = True) -> tuple[float, float]:
        disk = Disk(Point(ball.x, ball.y), ball.radius)
        contact = self.contact(disk, penetration)
        if contact is None:
            return 0, 0
        c = self._correction(disk, contact)
        return c.x, c.y

    def _correction(self, disk: Disk, contact: tuple[Point, Point]) -> Point:
        return contact[0] - disk.center + contact[1] * disk.radius

    def contact(
        self, disk: Disk, penetration: bool = True
    ) -> tuple[Point, Point] | None:
        p = self.penetration if penetration else 0
        for s in self.sides(p):
            if i := s.intersection(disk):
                return i
        for c in self.corners(p):
            if i := disk.intersection(c):
                return (i[0], i[1] * -1)
        return None

    def corners(self, p: float) -> tuple[Point, ...]:
        return (
            Point(self.a.x + p, self.a.y - p),
            Point(self.b.x - p, self.a.y - p),
            Point(self.b.x - p, self.b.y + p),
            Point(self.a.x + p, self.b.y + p),
        )

    def sides(self, penetration: float) -> tuple[Side, ...]:
        cs = self.corners(penetration)
        return (
            Side(cs[0], cs[1], Point(0, 1)),
            Side(cs[1], cs[2], Point(1, 0)),
            Side(cs[3], cs[2], Point(0, -1)),
            Side(cs[0], cs[3], Point(-1, 0)),
        )


def normal(x: float, y: float) -> tuple[float, float]:
    length = math.hypot(x, y)
    return (x / length, y / length)
