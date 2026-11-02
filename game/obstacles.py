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
            return self.center + d.normal() * self.radius, d.normal()
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
    penetration: float = 0.05
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
        cx, cy = self.correction(ball, False)
        if cx == 0 and cy == 0:
            return
        if cx != 0 and cy == 0 and cx * ball.vx < 0:
            ball.vx *= -ball.restitution
            return
        if cx == 0 and cy != 0 and cy * ball.vy < 0:
            if ball.vy > -0.1:  # sliding
                ball.vx *= self.friction
            ball.vy *= -ball.restitution
            return
        corners = (
            Point(self.a.x, self.a.y),
            Point(self.b.x, self.a.y),
            Point(self.b.x, self.b.y),
            Point(self.a.x, self.b.y),
        )
        for corner in corners:
            # should pick closest corner
            d = (ball.x - corner.x, ball.y - corner.y)
            if math.hypot(*d) < ball.radius:
                nx, ny = normal(*d)
                vn = ball.vx * nx + ball.vy * ny
                if vn < 0:
                    k = -(1 + ball.restitution) * vn
                    ball.vx += k * nx
                    ball.vy += k * ny

    def correction(self, ball: Ball, penetration: bool = True) -> tuple[float, float]:
        # pylint: disable=too-many-locals
        p = self.penetration if penetration else 0
        r = ball.radius - p
        ao = Point(self.a.x - r, self.a.y + r)
        bo = Point(self.b.x + r, self.b.y - r)
        c = Point(
            self.a.x + (self.b.x - self.a.x) / 2, self.b.y + (self.a.y - self.b.y) / 2
        )
        cx, cy = 0, 0
        # edges:
        if self.a.x < ball.x < self.b.x:
            if c.y <= ball.y < ao.y:
                return 0, ao.y - ball.y
            if bo.y < ball.y <= c.y:
                return 0, bo.y - ball.y
        if self.b.y < ball.y < self.a.y:
            if ao.x < ball.x <= c.x:
                return ao.x - ball.x, 0
            if c.x < ball.x < bo.x:
                return bo.x - ball.x, 0
        for corner in self.corners(p):
            d = (corner.x - ball.x, corner.y - ball.y)
            dist = math.hypot(*d)
            if dist < ball.radius:
                p = dist - ball.radius
                nx, ny = normal(*d)
                return nx * p, ny * p
        return cx, cy

    def contact_correction(self, disk: Disk, penetration: bool = True) -> tuple[float, float]:
        contact = self.contact(disk, penetration)
        if contact is None:
            return 0, 0
        c = contact[0]
        return disk.center.x - c.x, disk.center.y - c.y

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
