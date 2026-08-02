import { type PlayingCard } from "@/components/Cards/card-utils";
import { yukonRules } from "@/components/Games/Yukon";

function card(
  rank: PlayingCard["rank"],
  suit: PlayingCard["suit"] = "hearts",
  id: string = `${rank}-${suit}`,
): PlayingCard {
  return { id, rank, suit, faceUp: true };
}

describe("Yukon rules", () => {
  test("deals all 52 cards into the expected cascade shape", () => {
    const game = yukonRules.createYukonState();

    expect(game.columns.map((column) => column.length)).toEqual([
      1, 6, 7, 8, 9, 10, 11,
    ]);
    expect(game.columns.flat()).toHaveLength(52);
    expect(game.foundations).toHaveLength(4);
    expect(game.foundations.every((pile) => pile.length === 0)).toBe(true);
  });

  test("deals one face-up card first, then five face-up cards per column", () => {
    const game = yukonRules.createYukonState();

    expect(game.columns[0].map(({ faceUp }) => faceUp)).toEqual([true]);
    for (
      let columnIndex = 1;
      columnIndex < game.columns.length;
      columnIndex += 1
    ) {
      expect(
        game.columns[columnIndex].filter(({ faceUp }) => faceUp),
      ).toHaveLength(5);
      expect(
        game.columns[columnIndex]
          .slice(0, columnIndex)
          .every(({ faceUp }) => !faceUp),
      ).toBe(true);
    }
  });

  test("builds cascades down in alternating color", () => {
    expect(
      yukonRules.yukonCanStack(card("6", "hearts"), card("7", "spades")),
    ).toBe(true);
    expect(
      yukonRules.yukonCanStack(card("6", "diamonds"), card("7", "hearts")),
    ).toBe(false);
    expect(
      yukonRules.yukonCanStack(card("7", "clubs"), card("7", "hearts")),
    ).toBe(false);
  });

  test("only allows Kings into empty cascade columns", () => {
    expect(yukonRules.yukonCanStack(card("K"), undefined)).toBe(true);
    expect(yukonRules.yukonCanStack(card("Q"), undefined)).toBe(false);
  });

  test("starts foundations with Aces and builds upward by suit", () => {
    expect(yukonRules.canPlaceOnFoundation(card("A", "clubs"), undefined)).toBe(
      true,
    );
    expect(
      yukonRules.canPlaceOnFoundation(card("2", "clubs"), card("A", "clubs")),
    ).toBe(true);
    expect(
      yukonRules.canPlaceOnFoundation(card("2", "spades"), card("A", "clubs")),
    ).toBe(false);
  });
});
