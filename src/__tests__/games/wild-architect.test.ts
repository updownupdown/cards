import { describe, expect, test } from "@jest/globals";
import { STEP_MS } from "@/components/WildCards/engine/loop";
import { TILT_BOOST, type Tilt } from "@/components/WildCards/engine/tilt";
import {
  ArchitectGame,
  CARD_LENGTH,
  type Difficulty,
} from "@/components/WildCards/games/architect";
import { seedRandomForEachTest } from "../../../jest/seeded-random";

seedRandomForEachTest();

let t = 0;
const touch = (id: number, x: number, y: number) => ({ id, x, y, t: (t += 16) });

function setup(difficulty: Difficulty) {
  const tilt: { current: Tilt } = { current: { live: true, x: 0, y: 0, jolt: 0 } };
  const game = new ArchitectGame(400, 865, 855, difficulty, tilt);
  return { game, tilt };
}

/** Takes a card from the tray and lets it go with its top near (x, y). */
function carry(game: ArchitectGame, x: number, y: number, id = 1) {
  game.touchStart(touch(id, 200, game.trayTop + 40));
  game.touchMove(touch(id, (x + 200) / 2, (y + game.trayTop) / 2));
  game.touchMove(touch(id, x, y));
  game.touchEnd(touch(id, x, y), false);
  return game.cards[game.cards.length - 1];
}

/** As carry, but a second finger turns the card a quarter turn first. */
function carryTurned(game: ArchitectGame, x: number, y: number) {
  game.touchStart(touch(1, 200, game.trayTop + 40));
  game.touchMove(touch(1, x, y));
  game.touchStart(touch(2, x + 60, y));
  game.touchMove(touch(2, x + 42, y + 42));
  game.touchMove(touch(2, x, y + 60));
  game.touchEnd(touch(2, x, y + 60), false);
  game.touchEnd(touch(1, x, y), false);
  return game.cards[game.cards.length - 1];
}

const run = (game: ArchitectGame, ms: number) => {
  for (let time = 0; time < ms; time += STEP_MS) game.step(STEP_MS);
};

/** A wall (two cards leaning together) with its apex near x, on the table. */
function wall(game: ArchitectGame, x: number) {
  const top = game.groundY - CARD_LENGTH + 8;
  const left = carry(game, x - 12, top);
  const right = carry(game, x + 14, top);
  return [left, right];
}

describe("Architect", () => {
  test("on Easy, cards snap into walls and floors, and stay put", () => {
    const { game } = setup("easy");
    const [a, b] = wall(game, 150);
    const [c, d] = wall(game, 200);
    expect([a, b, c, d].map((card) => card.state)).toEqual(["placed", "placed", "placed", "placed"]);
    expect(a.partner).toBe(b.id);
    expect(c.partner).toBe(d.id);
    const floor = carry(game, 175, game.groundY - CARD_LENGTH - 10);
    expect(floor.kind).toBe("floor");
    expect(floor.supports.sort()).toEqual([a.id, b.id, c.id, d.id].sort());
    run(game, 3000);
    expect(game.standing.length).toBe(5);
    expect(game.height).toBe(1);
  });

  test("on Easy, a jolted phone changes nothing", () => {
    const { game, tilt } = setup("easy");
    wall(game, 200);
    tilt.current.jolt = 2;
    run(game, 2000);
    expect(game.fallenCount).toBe(0);
    expect(game.stability).toBe(1);
  });

  test("on Medium, holding still keeps a tower up and a hard shake brings it down", () => {
    const { game, tilt } = setup("medium");
    wall(game, 150);
    wall(game, 200);
    const floor = carryTurned(game, 175, game.groundY - CARD_LENGTH - 4);
    expect(floor.kind).toBe("floor");
    // A hand's tremor, as the sensor reads it before the game's boost.
    tilt.current.jolt = 0.1 / TILT_BOOST;
    run(game, 2000);
    expect(game.cards.every((card) => card.state === "placed")).toBe(true);
    tilt.current.jolt = 1.4;
    run(game, 1500);
    tilt.current.jolt = 0;
    run(game, 2500);
    expect(game.fallenCount).toBeGreaterThanOrEqual(2);
    expect(game.standing.length).toBeLessThan(5);
  });

  test("on Hard, nothing snaps: a card let go falls over", () => {
    const { game } = setup("hard");
    const card = carry(game, 200, game.groundY - CARD_LENGTH - 30);
    run(game, 3000);
    expect(card.state).toBe("loose");
    expect(game.isFallen(card)).toBe(true);
  });

  test("on Hard, two cards leant together can stand", () => {
    const { game } = setup("hard");
    // Stood up exactly as a steady pair of hands would.
    const place = (game as unknown as {
      addCard: (x: number, y: number, angle: number, dynamic: boolean) => ReturnType<typeof carry>;
    }).addCard.bind(game);
    const lean = (14 * Math.PI) / 180;
    const offset = 8 * 0.45 + 28 * Math.sin(lean);
    const y = game.groundY - (56 * Math.cos(lean)) / 2 - 4 * Math.sin(lean);
    for (const [x, angle] of [
      [200 - offset, lean],
      [200 + offset, -lean],
    ]) {
      const card = place(x, y, angle, true);
      card.state = "loose";
      game.engine.world.bodies.push(card.body);
    }
    run(game, 4000);
    expect(game.fallenCount).toBe(0);
    expect(game.standing.length).toBe(2);
  });

  test("on Hard, a finger holds a card up where it's put", () => {
    const { game } = setup("hard");
    game.touchStart(touch(1, 200, game.trayTop + 40));
    for (let i = 0; i < 40; i++) {
      game.touchMove(touch(1, 200, game.groundY - 150));
      game.step(STEP_MS);
    }
    const card = game.cards[0];
    expect(card.body.position.y).toBeLessThan(game.groundY - 100);
    game.touchEnd(touch(1, 200, game.groundY - 150), false);
    run(game, 3000);
    expect(game.isFallen(card)).toBe(true);
  });
});
