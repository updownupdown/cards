import { describe, expect, test } from "@jest/globals";
import { STEP_MS } from "@/components/WildCards/engine/loop";
import {
  comboName,
  CuttingDeckGame,
} from "@/components/WildCards/games/cutting-deck";
import { seedRandomForEachTest } from "../../../jest/seeded-random";

seedRandomForEachTest();

/** A game with nothing spawning by itself. */
function quietGame() {
  const game = new CuttingDeckGame(400, 850, 60);
  const timers = game as unknown as { fruitTimer: number; balloonTimer: number };
  timers.fruitTimer = Infinity;
  timers.balloonTimer = Infinity;
  return game;
}

const run = (game: CuttingDeckGame, ms: number) => {
  for (let t = 0; t < ms; t += STEP_MS) game.step(STEP_MS);
};

describe("Cutting Deck", () => {
  test("fruit floats down on a parachute, swaying, and balloons rise slowly", () => {
    const game = quietGame();
    const fruit = game.spawnFruit(200, 0);
    const balloon = game.spawnBalloon(200, 850);
    let leftmost = 200;
    let rightmost = 200;
    for (let t = 0; t < 4000; t += STEP_MS) {
      game.step(STEP_MS);
      leftmost = Math.min(leftmost, fruit.body.position.x);
      rightmost = Math.max(rightmost, fruit.body.position.x);
    }
    // A steady fall of about 90 units a second, not a plunge.
    expect(fruit.body.position.y).toBeGreaterThan(300);
    expect(fruit.body.position.y).toBeLessThan(450);
    expect(rightmost - leftmost).toBeGreaterThan(20);
    expect(balloon.body.position.y).toBeLessThan(700);
    run(game, 12000);
    expect(game.targets.size).toBe(0);
  });

  test("no more than three fruit float down at once", () => {
    const game = new CuttingDeckGame(400, 850, 60);
    let most = 0;
    for (let t = 0; t < 60000; t += STEP_MS) {
      game.step(STEP_MS);
      const fruit = [...game.targets.values()].filter((t) => t.kind === "fruit");
      most = Math.max(most, fruit.length);
    }
    expect(most).toBeGreaterThan(0);
    expect(most).toBeLessThanOrEqual(3);
  });

  test("one card through a column of fruit makes a combo", () => {
    const game = quietGame();
    for (const y of [150, 300, 450]) game.spawnFruit(200, y);
    const combos: string[] = [];
    game.onEvent = (event) => {
      if (event.type === "combo") combos.push(event.name);
    };
    game.throwCard(200, 800, { x: 0, y: -14 });
    run(game, 1400);
    expect(game.targets.size).toBe(0);
    expect(game.halves.length).toBe(6);
    expect(combos).toEqual(["pair", "threeOfAKind"]);
    // 1 + 2 + 3: each hit in a combo is worth more.
    expect(game.score).toBe(6);
  });

  test("a flick from the bottom throws a card; a tap doesn't", () => {
    const game = quietGame();
    game.touchStart({ id: 1, x: 200, y: 800, t: 0 });
    game.touchEnd({ id: 1, x: 201, y: 799, t: 200 }, false);
    expect(game.cards.length).toBe(0);
    game.touchStart({ id: 2, x: 200, y: 800, t: 1000 });
    game.touchMove({ id: 2, x: 205, y: 760, t: 1030 });
    game.touchEnd({ id: 2, x: 210, y: 720, t: 1060 }, false);
    expect(game.cards.length).toBe(1);
    expect(game.cards[0].body.velocity.y).toBeLessThan(-5);
    expect(game.cards[0].body.velocity.y).toBeGreaterThanOrEqual(-15);
  });

  test("combos are named like poker hands", () => {
    expect(comboName(1)).toBeNull();
    expect(comboName(2)).toBe("pair");
    expect(comboName(9)).toBe("royalFlush");
    expect(comboName(20)).toBe("royalFlush");
  });
});
