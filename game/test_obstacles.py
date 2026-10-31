# pylint: disable=too-many-arguments, too-many-positional-arguments
import pytest

from .ball import Ball
from .obstacles import StaticBox
from .primitives import Point


S2 = 2**0.5 - 1


@pytest.mark.parametrize(
    'x,y,cx,cy',
    (
        (2, 0, 1, 0),
        (-2, 0, -1, 0),
        (0, 2, 0, 1),
        (0, -2, 0, -1),
        (3, 0, 0, 0),
        (2, 2, S2, S2),
        (-2, 2, -S2, S2),
        (2, -2, S2, -S2),
        (-2, -2, -S2, -S2),
        (2, 1.1, 0.99007438, 0.099007438),
        (0, 3, 0, 0),
    )
)
def test_correction(x, y, cx, cy) -> None:
    box = StaticBox(Point(-1, 1), Point(1, -1))
    ball = Ball(x, y, radius=2)
    got = box.correction(ball, False)
    assert got == (pytest.approx(cx), pytest.approx(cy))


@pytest.mark.parametrize(
    'x,y,vx,vy,bx,by',
    (
        (2, 0, -1, 0, 1, 0),
        (-2, 0, 1, 0, -1, 0),
        (0, 2, 0, -1, 0, 1),
        (0, -2, 0, 1, 0, -1),
        (2, 2, 0, -1, 1, 0),
        (2, 2, -1, 0, 0, 1),
    )
)
def test_bounce(x, y, vx, vy, bx, by) -> None:
    box = StaticBox(Point(-1, 1), Point(1, -1))
    ball = Ball(x, y, vx, vy, radius=2, restitution=1)
    box.bounce(ball)
    got = ball.vx, ball.vy
    assert got == (pytest.approx(bx), pytest.approx(by))
