import { describe, expect, test } from "@jest/globals";
import { blackHoleRules } from "@/components/Games/BlackHole";
import { top } from "@/components/Cards/card-utils";

const { dealPiles, playableRun, MINIMUM_OPENING_MOVES } = blackHoleRules;

describe("Black Hole", () => {
  test("never deals a game that is already lost", () => {
    // A plain shuffle strands the Ace of Spades in roughly one deal in 35, so
    // enough deals to catch that if the redeal ever stops working.
    for (let deal = 0; deal < 500; deal += 1) {
      const { piles, hole } = dealPiles();
      const holeTop = top(hole);
      expect(holeTop).toBeDefined();
      expect(playableRun(piles, holeTop!, MINIMUM_OPENING_MOVES)).toBe(
        MINIMUM_OPENING_MOVES,
      );
    }
  });

  test("deals all 52 cards, with the Ace of Spades in the hole", () => {
    const { piles, hole } = dealPiles();
    expect(hole).toHaveLength(1);
    expect(hole[0].rank).toBe("A");
    expect(hole[0].suit).toBe("spades");
    expect(piles).toHaveLength(17);
    expect(piles.every((pile) => pile.length === 3)).toBe(true);

    const ids = new Set(
      [...piles.flat(), ...hole].map((card) => `${card.rank}${card.suit}`),
    );
    expect(ids.size).toBe(52);
  });

  test("playableRun leaves the piles as it found them", () => {
    const { piles, hole } = dealPiles();
    const before = JSON.stringify(piles);
    playableRun(piles, top(hole)!, 3);
    expect(JSON.stringify(piles)).toBe(before);
  });
});

describe("All in a Row (Black Hole variant)", () => {
  test("deals thirteen columns of four into an empty hole", () => {
    const { piles, hole } = dealPiles(undefined, "all-in-a-row");
    expect(hole).toHaveLength(0);
    expect(piles).toHaveLength(13);
    expect(piles.every((pile) => pile.length === 4)).toBe(true);
    expect(playableRun(piles, undefined, MINIMUM_OPENING_MOVES)).toBe(
      MINIMUM_OPENING_MOVES,
    );
  });
});
