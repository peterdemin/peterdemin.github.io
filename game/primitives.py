#!/usr/bin/env python
import math
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Iterable, Self, overload

import pygame


class Primitive(ABC):

    @abstractmethod
    def draw(self, screen, scale: float) -> None:
        """Draws primitive in pygame at given scale"""


class GameObject(ABC):
    @abstractmethod
    def primitive(self) -> Primitive:
        """Returns drawing primitive"""


@dataclass(slots=True)
class Point:
    x: float
    y: float

    def __add__(self, p: "Point") -> "Point":
        return Point(self.x + p.x, self.y + p.y)

    def __sub__(self, p: "Point") -> "Point":
        return Point(self.x - p.x, self.y - p.y)

    @overload
    def __mul__(self, p: Self) -> float:
        """Dot product"""

    @overload
    def __mul__(self, p: float) -> "Point":
        """Scalar product"""

    def __mul__(self, p: Self | float) -> "Point | float":
        if isinstance(p, Point):
            return self.x * p.x + self.y * p.y
        return Point(self.x * p, self.y * p)

    def normal(self) -> "Point":
        length = self.length()
        return Point(self.x / length, self.y / length)

    def length(self) -> float:
        return math.hypot(self.x, self.y)

    def project(self, w: int, h: int, scale: float) -> "Point":
        return Point(int(w // 2 + self.x * scale), int(h // 2 - self.y * scale))

    def tangent(self) -> "Point":
        return Point(-self.y, self.x)


@dataclass(slots=True)
class Circle(Primitive):
    x: float
    y: float
    radius: float
    color: str = "black"

    def draw(self, screen, scale: float) -> None:
        cx, cy = screen.get_width() // 2, screen.get_height() // 2
        pygame.draw.circle(
            screen,
            self.color,
            (int(cx + self.x * scale), int(cy - self.y * scale)),
            int(self.radius * scale),
        )


@dataclass(slots=True)
class Rect(Primitive):
    a: Point
    b: Point
    color: str = "black"

    def draw(self, screen, scale: float) -> None:
        screen.fill(
            self.color, self._rect(screen.get_width(), screen.get_height(), scale)
        )

    @classmethod
    def orient(cls, a: Point, b: Point) -> "Rect":
        return Rect(
            a=Point(min(a.x, b.x), max(a.y, b.y)),
            b=Point(max(a.x, b.x), min(a.y, b.y)),
        )

    def within(self, p: Point) -> bool:
        return self.a.x <= p.x <= self.b.x and self.b.y <= p.y <= self.a.y

    def _rect(self, w: int, h: int, s: float) -> pygame.Rect:
        a = self.a.project(w, h, s)
        b = self.b.project(w, h, s)
        return pygame.Rect(a.x, a.y, b.x - a.x, b.y - a.y)


@dataclass
class Line(Primitive):
    color: str
    ax: float
    ay: float
    bx: float
    by: float
    width: float

    def draw(self, screen, scale: float) -> None:
        cx, cy = screen.get_width() // 2 - 1, screen.get_height() // 2 - 1
        pygame.draw.line(
            screen,
            self.color,
            (cx + int(self.ax * scale), cy - int(self.ay * scale)),
            (cx + int(self.bx * scale), cy - int(self.by * scale)),
            int(self.width * scale),
        )


@dataclass
class Path(Primitive):
    points: list[Point]
    color: str
    width: float

    def draw(self, screen, scale: float) -> None:
        for line in self._translate():
            line.draw(screen, scale)

    def _translate(self) -> Iterable[Line]:
        for a, b in zip(self.points[:-1], self.points[1:], strict=True):
            yield Line(
                ax=a.x,
                ay=a.y,
                bx=b.x,
                by=b.y,
                color=self.color,
                width=self.width,
            )
