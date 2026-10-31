from .world import World, GameControls


def test_world_valid() -> None:
    world = World(GameControls())
    world.adjust(640, 480, 40)
    world.tick(0.1)
