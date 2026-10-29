import pytest

from .string import Node, String


def test_sample_tension() -> None:
    s = String([Node(), Node(1.1)], segment=1, spring=10, viscosity=1, damping=0)
    r = s.rate()
    assert r[0].vx == pytest.approx(1)
    assert r[0].vy == -4.905
    assert r[1].vx == pytest.approx(-1)
    assert r[1].vy == -4.905


def test_tension_equalizes_gravity() -> None:
    s = String(
        [Node(), Node(y=-1.4)],
        segment=1,
        spring=10,
        viscosity=1,
        damping=0.01,
        fix_last=False,
    )
    s = s.next_tick(100)
    assert s.nodes[1].y == pytest.approx(-1 - s.G / 20)
    assert pytest.approx(s.nodes[1].vy) == 0
