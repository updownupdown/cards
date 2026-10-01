import { describe, expect, test } from "@jest/globals";
import type { PlayingCard, Suit } from "@/components/WildCards/engine/cards";
import { STEP_MS } from "@/components/WildCards/engine/loop";
import {
  bestHand,
  canStillScore,
  landsOn,
  MAX_PULL,
  PLATE_WIDTH,
  RoyalFlushGame,
  stretchNotch,
} from "@/components/WildCards/games/royal-flush";
import { seedRandomForEachTest } from "../../../jest/seeded-random";

seedRandomForEachTest();

/** "10H 9H 8H" style hands. */
const hand = (text: string): PlayingCard[] =>
  text.split(" ").map((card) => {
    const suit = card.slice(-1) as Suit;
    const rank = { A: 1, J: 11, Q: 12, K: 13 }[card.slice(0, -1)] ?? Number(card.slice(0, -1));
    return { rank, suit };
  });

describe("Royal Flush hands", () => {
  test("flushes, straights and full houses are found among the cards", () => {
    expect(bestHand(hand("2H 7H 9H JH KH"))).toBe("flush");
    expect(bestHand(hand("5S 6H 7D 8C 9S"))).toBe("straight");
    expect(bestHand(hand("AS 2H 3D 4C 5S"))).toBe("straight");
    expect(bestHand(hand("10S JH QD KC AS"))).toBe("straight");
    expect(bestHand(hand("QS QH QD 4C 4S"))).toBe("fullHouse");
    expect(bestHand(hand("5H 6H 7H 8H 9H"))).toBe("straightFlush");
    expect(bestHand(hand("10D JD QD KD AD 2C"))).toBe("royalFlush");
    expect(bestHand(hand("2S 2H 5D 9C KS"))).toBeNull();
    expect(bestHand(hand("JS QH KD AC 2S"))).toBeNull();
  });

  test("a plate of five keeps its cards only while a hand is still possible", () => {
    expect(canStillScore(hand("2H 9H"))).toBe(true); // three more hearts
    expect(canStillScore(hand("5S 6H 8D"))).toBe(true); // 4 and 7, or 7 and 9
    expect(canStillScore(hand("2S 2H 7D"))).toBe(true); // 2 and 7: a full house
    // Two slots can't turn three odd cards into a full house.
    expect(canStillScore(hand("2S 7H KD"))).toBe(false);
    expect(canStillScore(hand("2S 2H 7D 9C"))).toBe(false);
    // Five cards and no hand: rejected at the fifth.
    expect(canStillScore(hand("2S 3H 4D 9C KS"))).toBe(false);
  });

  test("a card is only caught with at least half of it over the plate", () => {
    expect(landsOn(100, 100)).toBe(true);
    expect(landsOn(100 + PLATE_WIDTH / 2, 100)).toBe(true);
    expect(landsOn(100 + PLATE_WIDTH / 2 + 1, 100)).toBe(false);
  });

  test("a pull's notches come closer as the band stretches", () => {
    const at = [1, 2, 3, 4, 5, 6].map((notch) => {
      let length = 0;
      while (stretchNotch(length) < notch) length += 1;
      return length;
    });
    const gaps = at.slice(1).map((length, i) => length - at[i]);
    for (let i = 1; i < gaps.length; i++) expect(gaps[i]).toBeLessThanOrEqual(gaps[i - 1]);
    expect(stretchNotch(MAX_PULL)).toBeGreaterThan(5);
  });
});

describe("Royal Flush stall", () => {
  test("one plate runs edge to edge; two belts", () => {
    const game = new RoyalFlushGame(400, 850, 60, 820);
    expect(game.plates).toHaveLength(1);
    expect(new Set(game.cards.map((c) => c.belt))).toEqual(new Set([0, 1]));
    let left = Infinity;
    let right = -Infinity;
    for (let t = 0; t < 30000; t += STEP_MS) {
      game.step(STEP_MS);
      left = Math.min(left, game.plates[0].x);
      right = Math.max(right, game.plates[0].x);
    }
    expect(left - PLATE_WIDTH / 2).toBeLessThan(20);
    expect(right + PLATE_WIDTH / 2).toBeGreaterThan(380);
  });

  test("a marble knocks a belt card off, and it lands on the plate below", () => {
    const game = new RoyalFlushGame(400, 850, 60, 820);
    // Park the plate and aim at the belt card nearest above it.
    const plate = game.plates[0];
    plate.speed = 0;
    const lowestBelt = game.cards.filter((c) => c.belt === 1);
    const target = lowestBelt.reduce((a, b) =>
      Math.abs(a.body.position.x - plate.x) < Math.abs(b.body.position.x - plate.x) ? a : b,
    );
    plate.x = target.body.position.x;
    // Straight up from under it; the belt barely moves in the flight time.
    game.shoot(target.body.position.x + 2, 700, { x: 0, y: -22 });
    let caught = false;
    game.onEvent = (event) => {
      if (event.type === "caught") caught = true;
    };
    for (let i = 0; i < 240 && !caught; i++) {
      plate.x = target.body.position.x;
      game.step(STEP_MS);
    }
    expect(target.falling).toBe(true);
    expect(caught).toBe(true);
    expect(plate.cards.length).toBe(1);
  });
});
