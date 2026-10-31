#!/usr/bin/env python
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Iterable

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

    def project(self, w: int, h: int, scale: float) -> "Point":
        return Point(int(w // 2 + self.x * scale), int(h // 2 - self.y * scale))


@dataclass
class Circle(Primitive):
    color: str
    x: float
    y: float
    radius: float

    def draw(self, screen, scale: float) -> None:
        cx, cy = screen.get_width() // 2, screen.get_height() // 2
        pygame.draw.circle(
            screen,
            self.color,
            (int(cx + self.x * scale), int(cy - self.y * scale)),
            int(self.radius * scale),
        )


@dataclass
class Rect(Primitive):
    color: str
    a: Point
    b: Point

    def draw(self, screen, scale: float) -> None:
        screen.fill(
            self.color, self._rect(screen.get_width(), screen.get_height(), scale)
        )

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
