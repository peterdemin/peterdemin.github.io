# pylint: disable=too-many-arguments, too-many-positional-arguments
import pytest

from .ball import Ball
from .obstacles import StaticBox, Side, Disk
from .primitives import Point


S2 = 2**0.5 - 1
COS45 = 0.7071067812


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
    'x,y,nx,ny',
    (
        (2, 0, 1, 0),
        (-2, 0, -1, 0),
        (0, 2, 0, 1),
        (0, -2, 0, -1),
        (2, 2, COS45, COS45),
        (-2, 2, -COS45, COS45),
        (2, -2, COS45, -COS45),
        (-2, -2, -COS45, -COS45),
        (2, 1.1, 0.99503719, 0.099503719),
    )
)
def test_contact(x, y, nx, ny) -> None:
    box = StaticBox(Point(-1, 1), Point(1, -1))
    disk = Disk(Point(x, y), radius=2)
    got = box.contact(disk, False)
    assert got is not None
    assert (got[1].x, got[1].y) == (pytest.approx(nx), pytest.approx(ny))


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
def test_contact_correction(x, y, cx, cy) -> None:
    box = StaticBox(Point(-1, 1), Point(1, -1))
    disk = Disk(Point(x, y), radius=2)
    got = box.contact_correction(disk, False)
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


@pytest.mark.parametrize(
    'x,y,expect',
    (
        (3, 0, None),
        (2, 0, (Point(0, 0), Point(1, 0))),
        (1, 0, (Point(0, 0), Point(1, 0))),
    )
)
def test_side_intersection(x: float, y: float, expect: tuple[Point, Point] | None) -> None:
    s = Side(Point(0, 1), Point(0, -1), Point(1, 0))
    got = s.intersection(Disk(Point(x, y), 2))
    assert got == expect


@pytest.mark.parametrize(
    'x,y,expect',
    (
        (3, 0, None),
        (2, 0, (Point(2, 0), Point(1, 0))),
        (1, 0, (Point(2, 0), Point(1, 0))),
        (0, 1, (Point(0, 2), Point(0, 1))),
    )
)
def test_disk_intersection(x: float, y: float, expect: tuple[Point, Point] | None) -> None:
    d = Disk(Point(0, 0), 2)
    p = Point(x, y)
    got = d.intersection(p)
    assert got == expect
