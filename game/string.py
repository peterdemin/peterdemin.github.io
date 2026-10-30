import math
from dataclasses import dataclass, replace
from typing import Self, overload

from .primitives import GameObject, Path, Point


@dataclass(slots=True)
class Node:
    x: float = 0
    y: float = 0
    vx: float = 0
    vy: float = 0

    def __sub__(self, n: Self) -> "Node":
        assert isinstance(n, Node)
        return Node(
            self.x - n.x,
            self.y - n.y,
            self.vx - n.vx,
            self.vy - n.vy,
        )

    @overload
    def __mul__(self, n: Self) -> "Node":
        """Dot product"""

    @overload
    def __mul__(self, n: float) -> "Node":
        """Scalar product"""

    def __mul__(self, n: Self | float) -> "Node":
        if isinstance(n, Node):
            return Node(
                self.x * n.x,
                self.y * n.y,
                self.vx * n.vx,
                self.vy * n.vy,
            )
        return Node(
            self.x * n,
            self.y * n,
            self.vx * n,
            self.vy * n,
        )

    @property
    def normal(self) -> "Node":
        return Node(self.x / self.length, self.y / self.length)

    @property
    def length(self) -> float:
        return math.hypot(self.x, self.y)

    @property
    def length_rate(self) -> float:
        n = self.normal
        return self.vx * n.x + self.vy * n.y


@dataclass
class String(GameObject):
    nodes: list[Node]
    width: float = 0.01
    color: str = "white"
    segment: float = 0.05
    G = 9.81
    spring: float = 10 / segment
    viscosity: float = 0.1 / segment
    damping: float = 0.2
    fix_first: bool = True
    fix_last: bool = True
    max_step: float = 0.01
    cancel_speed: float = 0.00001
    mass: float = 1

    @classmethod
    def from_anchors(cls, a: Node, b: Node) -> Self:
        dx, dy = b.x - a.x, b.y - a.y
        dist = math.hypot(dx, dy)
        steps = int(dist / cls.segment) + 1
        dx0, dy0 = dx / steps, dy / steps
        return cls(
            nodes=[Node(a.x + step * dx0, a.y + step * dy0) for step in range(steps)]
        )

    def primitive(self) -> Path:
        return Path([Point(n.x, n.y) for n in self.nodes], self.color, self.width)

    def next_tick(self, h: float) -> "String":
        t = 0
        result = replace(
            self,
            nodes=[Node(n.x, n.y, n.vx, n.vy) for n in self.nodes],
        )
        while t < h:
            dt = min(h - t, self.max_step)
            result.advance(dt)
            t += dt
        return result

    def advance(self, h: float) -> None:
        result = [self._euler(h, n, r) for n, r in zip(self.nodes, self.rate())]
        if self.fix_first:
            result[0] = self.nodes[0]
        if self.fix_last:
            result[-1] = self.nodes[-1]
        self.nodes = result

    def _euler(self, h: float, node: Node, rate: Node) -> Node:
        vx = self._settle(node.vx + rate.vx * h)
        vy = self._settle(node.vy + rate.vy * h)
        return Node(
            x=node.x + vx * h,
            y=node.y + vy * h,
            vx=vx,
            vy=vy,
        )

    def _settle(self, x: float) -> float:
        return 0 if abs(x) <= self.cancel_speed else x

    def rate(self) -> list[Node]:
        m0 = self.mass / len(self.nodes)
        g0 = -self.G * m0
        fs = [[0, g0] for _ in self.nodes]
        for i in range(len(self.nodes) - 1):
            d = self.nodes[i + 1] - self.nodes[i]
            extension = d.length - self.segment
            if extension > 0:
                tension = d.normal * max(
                    self.spring * extension + self.viscosity * d.length_rate, 0.0
                )
                fs[i][0] += tension.x
                fs[i][1] += tension.y
                fs[i + 1][0] -= tension.x
                fs[i + 1][1] -= tension.y
        return [
            Node(
                n.vx,
                n.vy,
                f[0] / m0 - n.vx * self.damping,
                f[1] / m0 - n.vy * self.damping,
            )
            for f, n in zip(fs, self.nodes, strict=True)
        ]
