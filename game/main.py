#!/usr/bin/env python
import pygame

from .world import World, GameControls


class Game:
    def __init__(self, world: World, controls: GameControls):
        pygame.init()
        # self.screen = pygame.display.set_mode((0, 0), pygame.FULLSCREEN, vsync=1)
        self.screen = pygame.display.set_mode((640, 480), vsync=1)
        self.clock = pygame.time.Clock()
        self.running = True
        self.world = world
        self.scale = 400
        self.world.adjust(self.screen.get_width(), self.screen.get_height(), self.scale)
        self.controls = controls

    def run(self) -> None:
        dt = 0.0
        while self.running:
            self.read_events()
            self.world.tick(dt)
            self.draw()
            dt = self.clock.tick(60) / 1000
        pygame.quit()

    def draw(self) -> None:
        self.screen.fill("black")
        for p in self.world.primitives():
            p.draw(self.screen, self.scale)
        pygame.display.update()

    def read_events(self) -> None:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                self.running = False
        keys = pygame.key.get_pressed()
        self.controls.reset = keys[pygame.K_r]
        self.controls.ball.up = keys[pygame.K_w]
        self.controls.ball.right = keys[pygame.K_d]
        self.controls.ball.down = keys[pygame.K_s]
        self.controls.ball.left = keys[pygame.K_a]


def main():
    controls = GameControls()
    game = Game(World(controls), controls)
    game.run()


if __name__ == "__main__":
    main()
