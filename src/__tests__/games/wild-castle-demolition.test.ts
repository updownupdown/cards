import Matter from "matter-js";
import { describe, expect, test } from "@jest/globals";
import {
  CastleGame,
  NEXT_CASTLE_DELAY,
} from "@/components/WildCards/games/castle-demolition";
import { STEP_MS } from "@/components/WildCards/engine/loop";
import { seedRandomForEachTest } from "../../../jest/seeded-random";

seedRandomForEachTest();

/** Throws stones at a random standing card until the castle falls. */
function throwsToDestroy(game: CastleGame, speed: number) {
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
    game.launch(fromX, fromY, {
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

function averageThrows(layout: string, speed: number) {
  const runs = 6;
  let total = 0;
  for (let run = 0; run < runs; run++) {
    const game = new CastleGame(860, 450);
    game.buildNextCastle(layout);
    total += throwsToDestroy(game, speed);
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
  test("a house takes 1 to 6 stones, a manor more but not endlessly many", () => {
    const house = averageThrows("house", 12);
    const manor = averageThrows("manor", 12);
    expect(house).toBeGreaterThanOrEqual(1);
    expect(house).toBeLessThanOrEqual(6);
    expect(manor).toBeGreaterThanOrEqual(house);
    expect(manor).toBeLessThanOrEqual(10);
  });

  /** Where a stone fired wound back `pull` first lands. */
  function landingX(pull: number) {
    const game = new CastleGame(860, 450);
    // No castle in the way.
    for (const card of game.cards) card.gone = true;
    game.engine.world.bodies
      .filter((body) => body.label === "card")
      .forEach((body) => Matter.Composite.remove(game.engine.world, body));
    let landed: number | null = null;
    game.onEvent = (event) => {
      if (event.type === "landed" && landed === null) {
        landed = game.rocks[0].body.position.x;
      }
    };
    game.fire(pull);
    for (let i = 0; i < 400 && landed === null; i++) game.step(STEP_MS);
    return landed ?? Infinity;
  }

  test("the further the arm is wound, the further it throws", () => {
    const short = landingX(0.3);
    const middle = landingX(0.6);
    const long = landingX(1);
    expect(short).toBeLessThan(middle);
    expect(middle).toBeLessThan(long);
    // Fully wound clears where castles stand; barely wound falls short.
    expect(long).toBeGreaterThan(860 * 0.85);
    expect(landingX(0.1)).toBeLessThan(860 * 0.46);
  });

  test("winding and letting go fires one stone; a touch alone fires none", () => {
    const game = new CastleGame(860, 450);
    game.touchStart({ id: 1, x: 100, y: 300, t: 0 });
    game.touchEnd({ id: 1, x: 102, y: 300, t: 100 });
    for (let i = 0; i < 20; i++) game.step(STEP_MS);
    expect(game.rocks).toHaveLength(0);
    game.touchStart({ id: 2, x: 100, y: 300, t: 1000 });
    game.touchMove({ id: 2, x: 20, y: 380, t: 1200 });
    expect(game.winding?.pull).toBeGreaterThan(0.5);
    game.touchEnd({ id: 2, x: 20, y: 380, t: 1300 });
    for (let i = 0; i < 20; i++) game.step(STEP_MS);
    expect(game.rocks).toHaveLength(1);
    expect(game.lastPull).toBeGreaterThan(0.5);
  });

  test("the next castle goes up after a pause", () => {
    const game = new CastleGame(860, 450);
    throwsToDestroy(game, 12);
    expect(game.destroyedAt).not.toBeNull();
    for (let t = 0; t <= NEXT_CASTLE_DELAY + 100; t += STEP_MS) game.step(STEP_MS);
    expect(game.castleNumber).toBe(2);
    expect(game.looseCount).toBe(0);
  });
});
