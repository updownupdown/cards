import { describe, expect, test } from "@jest/globals";
import { STEP_MS } from "@/components/WildCards/engine/loop";
import {
  ShuffleboardGame,
  SURFACES,
  type SlidingCard,
} from "@/components/WildCards/games/shuffleboard";
import { seedRandomForEachTest } from "../../../jest/seeded-random";

seedRandomForEachTest();

const settle = (game: ShuffleboardGame, card: SlidingCard, each?: () => void) => {
  for (let i = 0; i < 60 * 12 && card.state === "sliding"; i++) {
    each?.();
    game.step(STEP_MS);
  }
};

function slideAt(surface: (typeof SURFACES)[number], speed: number) {
  const game = new ShuffleboardGame(400, 865, 53, 855);
  game.surface = surface;
  const card = game.slide(200, game.home.y, 0, -speed);
  settle(game, card);
  return { game, card };
}

describe("Shuffleboard", () => {
  test.each(SURFACES)("on %s, a push a finger can give reaches the zones", (surface) => {
    const scoring: number[] = [];
    for (let speed = 200; speed <= 1150; speed += 10) {
      const { game, card } = slideAt(surface, speed);
      if (game.pointsFor(card) > 0) scoring.push(speed);
    }
    expect(scoring.length).toBeGreaterThan(0);
    // A spread of pushes score, not one exact speed.
    expect(scoring[scoring.length - 1] - scoring[0]).toBeGreaterThanOrEqual(30);
  });

  test("too hard a push slides off the end", () => {
    const { card } = slideAt("slate", 1150);
    expect(card.state).toBe("off");
  });

  test("sweeping ahead of a card carries it further", () => {
    const plain = slideAt("mahogany", 400).card.body.position.y;
    const game = new ShuffleboardGame(400, 865, 53, 855);
    game.surface = "mahogany";
    const card = game.slide(200, game.home.y, 0, -400);
    let t = 0;
    let side = 1;
    game.touchStart({ id: 9, x: 200, y: card.body.position.y - 60, t });
    settle(game, card, () => {
      t += STEP_MS;
      side = -side;
      // Rubbing quickly side to side, just ahead of the card.
      game.touchMove({ id: 9, x: 200 + side * 25, y: card.body.position.y - 60, t });
    });
    expect(card.state).toBe("stopped");
    expect(card.body.position.y).toBeLessThan(plain - 40);
  });

  test("a card sliding at an angle to its length drifts round", () => {
    const game = new ShuffleboardGame(400, 865, 53, 855);
    game.surface = "felt";
    // Pointing up and to the right, pushed straight up.
    const card = game.slide(200, game.home.y, 0, -700, 0, 0.5);
    settle(game, card);
    expect(card.body.position.x).toBeGreaterThan(215);
  });

  test("four cards make a round, then the next surface", () => {
    const game = new ShuffleboardGame(400, 865, 53, 855);
    const rounds: number[] = [];
    game.onEvent = (event) => {
      if (event.type === "roundOver") rounds.push(event.round);
    };
    for (let i = 0; i < 4; i++) {
      expect(game.waiting).not.toBeNull();
      const card = game.slide(120 + i * 50, game.home.y, 0, -560);
      settle(game, card);
      game.step(STEP_MS);
    }
    expect(rounds).toEqual([1]);
    for (let i = 0; i < 200; i++) game.step(STEP_MS);
    expect(game.round).toBe(2);
    expect(game.surface).toBe("mahogany");
    expect(game.cards.length).toBe(0);
  });
});
