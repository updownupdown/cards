import { describe, expect, test } from "@jest/globals";
import {
  CastleGame,
  NEXT_CASTLE_DELAY,
  type RockKind,
} from "@/components/WildCards/games/castle-demolition";
import { STEP_MS } from "@/components/WildCards/engine/loop";
import { seedRandomForEachTest } from "../../../jest/seeded-random";

seedRandomForEachTest();

/** Throws `kind` at a random standing card until the castle falls. */
function throwsToDestroy(game: CastleGame, kind: RockKind, speed: number) {
  const castle = game.castleNumber;
  for (let thrown = 1; thrown <= 40; thrown++) {
    const standing = game.cards.filter((card) => !card.loose);
    const target = standing[Math.floor(Math.random() * standing.length)];
    const { x, y } = target.body.position;
    // Lobbed in from above, over the fallen cards.
    const fromX = x - 150;
    const fromY = Math.min(y, game.groundY - 60) - 110;
    const distance = Math.hypot(x - fromX, y - fromY);
    const steps = distance / speed;
    // Aimed a little high, for the drop on the way.
    const drop = 0.5 * 0.278 * steps * steps;
    game.launch(kind, fromX, fromY, {
      x: ((x - fromX) / distance) * speed,
      y: ((y - fromY - drop) / distance) * speed,
    });
    for (let i = 0; i < 100; i++) game.step(STEP_MS);
    if (game.destroyedAt !== null || game.castleNumber !== castle) {
      return thrown;
    }
  }
  return Infinity;
}

function averageThrows(layout: string, kind: RockKind, speed: number) {
  const runs = 6;
  let total = 0;
  for (let run = 0; run < runs; run++) {
    const game = new CastleGame(860, 450);
    game.buildNextCastle(layout);
    total += throwsToDestroy(game, kind, speed);
  }
  return total / runs;
}

describe("Castle Demolition", () => {
  test("a castle stands still until it's hit", () => {
    const game = new CastleGame(860, 450);
    game.buildNextCastle();
    const before = game.cards.map((card) => ({ ...card.body.position }));
    for (let i = 0; i < 300; i++) game.step(STEP_MS);
    expect(game.looseCount).toBe(0);
    game.cards.forEach((card, i) =>
      expect(card.body.position).toEqual(before[i]),
    );
  });

  // Throws are aimed by a script, lobbed at a random standing card; a player
  // aiming well does better. Averages, so a little slack either side.
  test("a house takes 3 to 12 pebbles, or 1 to 3 boulders", () => {
    const pebbles = averageThrows("house", "pebble", 21);
    const boulders = averageThrows("house", "boulder", 13);
    expect(pebbles).toBeGreaterThanOrEqual(3);
    expect(pebbles).toBeLessThanOrEqual(12);
    expect(boulders).toBeGreaterThanOrEqual(1);
    expect(boulders).toBeLessThanOrEqual(3);
  });

  test("a bigger castle takes more, but not endlessly many", () => {
    const pebbles = averageThrows("manor", "pebble", 21);
    const boulders = averageThrows("manor", "boulder", 13);
    expect(pebbles).toBeLessThanOrEqual(16);
    expect(boulders).toBeLessThanOrEqual(5);
  });

  test("the next castle goes up after a pause", () => {
    const game = new CastleGame(860, 450);
    throwsToDestroy(game, "boulder", 13);
    expect(game.destroyedAt).not.toBeNull();
    for (let t = 0; t <= NEXT_CASTLE_DELAY + 100; t += STEP_MS) game.step(STEP_MS);
    expect(game.castleNumber).toBe(2);
    expect(game.looseCount).toBe(0);
  });
});
