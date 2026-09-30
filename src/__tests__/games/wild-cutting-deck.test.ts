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
  (game as unknown as { spawnTimer: number }).spawnTimer = Infinity;
  return game;
}

const run = (game: CuttingDeckGame, ms: number) => {
  for (let t = 0; t < ms; t += STEP_MS) game.step(STEP_MS);
};

describe("Cutting Deck", () => {
  test("fruit falls and balloons rise, in a few seconds", () => {
    const game = quietGame();
    const fruit = game.spawnFruit(200, 0);
    const balloon = game.spawnBalloon(200, 850);
    run(game, 1500);
    expect(fruit.body.position.y).toBeGreaterThan(250);
    expect(balloon.body.position.y).toBeLessThan(700);
    run(game, 5000);
    expect(game.targets.size).toBe(0);
  });

  test("one card through a column of fruit makes a combo", () => {
    const game = quietGame();
    for (const y of [150, 300, 450]) game.spawnFruit(200, y);
    const combos: string[] = [];
    game.onEvent = (event) => {
      if (event.type === "combo") combos.push(event.name);
    };
    game.throwCard(200, 800, { x: 0, y: -28 });
    run(game, 700);
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
    expect(game.cards[0].body.velocity.y).toBeLessThan(-10);
  });

  test("combos are named like poker hands", () => {
    expect(comboName(1)).toBeNull();
    expect(comboName(2)).toBe("pair");
    expect(comboName(9)).toBe("royalFlush");
    expect(comboName(20)).toBe("royalFlush");
  });
});
