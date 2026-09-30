import { describe, expect, test } from "@jest/globals";
import { STEP_MS } from "@/components/WildCards/engine/loop";
import type { Tilt } from "@/components/WildCards/engine/tilt";
import {
  DECK_SIZE,
  HatTrickGame,
} from "@/components/WildCards/games/hat-trick";
import { seedRandomForEachTest } from "../../../jest/seeded-random";

seedRandomForEachTest();

const still = (): { current: Tilt } => ({
  current: { live: true, x: 0, y: 0, jolt: 0 },
});

function calmGame(tilt = still()) {
  const game = new HatTrickGame(400, 850, 60, tilt);
  // No wind: each test adds what it needs.
  (game as unknown as { windTimer: number }).windTimer = Infinity;
  game.wind = { x: 0, d: 0 };
  return game;
}

/** Throws one card and follows it down: where it lands, and when. */
function flight(game: HatTrickGame, speed: number, heading = 0, spin = 20) {
  game.throwCard(speed, heading, spin);
  const card = game.cards[game.cards.length - 1];
  let time = 0;
  while (card.state === "flying" && time < 10) {
    game.step(STEP_MS);
    time += STEP_MS / 1000;
  }
  return { card, time };
}

describe("Hat Trick", () => {
  test("a card stays in the air between one and three seconds", () => {
    for (const speed of [150, 250, 400, 600]) {
      const game = calmGame();
      game.hat = { x: 0, d: 5000 };
      const { time } = flight(game, speed);
      expect(time).toBeGreaterThanOrEqual(1);
      expect(time).toBeLessThanOrEqual(3);
    }
  });

  test("the right flick straight at the hat goes in, with a little slack", () => {
    for (const d of [330, 430, 540]) {
      const speeds = [];
      for (let speed = 100; speed <= 600; speed += 2) {
        const game = calmGame();
        game.hat = { x: 0, d };
        if (flight(game, speed).card.state === "hat") speeds.push(speed);
      }
      expect(speeds.length).toBeGreaterThan(0);
      // Some margin for a finger: at least ±5% of the right speed.
      const middle = (speeds[0] + speeds[speeds.length - 1]) / 2;
      expect(speeds[speeds.length - 1] - speeds[0]).toBeGreaterThanOrEqual(middle * 0.1);
    }
  });

  test("throws far too soft or too hard miss", () => {
    const game = calmGame();
    game.hat = { x: 0, d: 430 };
    expect(flight(game, 120).card.state).toBe("floor");
    expect(flight(game, 650).card.state).toBe("floor");
  });

  test("wind drifts a flat card, and spin steadies it", () => {
    // Averaged: a flat card also flutters, either way.
    const drift = (spin: number) => {
      let total = 0;
      for (let i = 0; i < 12; i++) {
        const game = calmGame();
        game.hat = { x: 0, d: 5000 };
        game.wind = { x: 12, d: 0 };
        (game as unknown as { windTarget: object }).windTarget = { x: 12, d: 0 };
        total += flight(game, 300, 0, spin).card.x;
      }
      return total / 12;
    };
    const flat = Math.abs(drift(0));
    const spun = Math.abs(drift(24));
    expect(flat).toBeGreaterThan(15);
    expect(spun).toBeLessThan(flat);
  });

  test("tilting steers a card, but only so far", () => {
    const tilt = still();
    const game = calmGame(tilt);
    game.hat = { x: 0, d: 5000 };
    game.throwCard(300, 0, 20);
    const card = game.cards[0];
    tilt.current.x = 0.26; // about 15°
    while (card.state === "flying") game.step(STEP_MS);
    expect(card.x).toBeGreaterThan(30);
    expect(card.x).toBeLessThan(140);
  });

  test("after 52 cards the deck is done", () => {
    const game = calmGame();
    let done = false;
    game.onEvent = (event) => {
      if (event.type === "deckDone") done = true;
    };
    for (let i = 0; i < DECK_SIZE + 3; i++) {
      game.throwCard(300, 0, 20);
      for (let s = 0; s < 240; s++) game.step(STEP_MS);
    }
    expect(game.thrown).toBe(DECK_SIZE);
    expect(done).toBe(true);
    game.newDeck();
    expect(game.thrown).toBe(0);
    expect(game.score).toBe(0);
  });
});
