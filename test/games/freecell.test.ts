import { type PlayingCard } from "@/components/Cards/card-utils";
import { freeCellRules } from "@/components/Games/FreeCell";

function card(
  rank: PlayingCard["rank"],
  suit: PlayingCard["suit"] = "hearts",
): PlayingCard {
  return { id: `${rank}-${suit}`, rank, suit, faceUp: true };
}

describe("FreeCell rules", () => {
  test("deals all cards face up across eight cascades", () => {
    const state = freeCellRules.createInitialState();
    const cards = state.cascades.flat();

    expect(state.cascades.map((pile) => pile.length)).toEqual([
      7, 7, 7, 7, 6, 6, 6, 6,
    ]);
    expect(state.freeCells).toEqual([null, null, null, null]);
    expect(cards).toHaveLength(52);
    expect(new Set(cards.map(({ id }) => id)).size).toBe(52);
    expect(cards.every(({ faceUp }) => faceUp)).toBe(true);
  });

  test("builds cascades down in alternating colors", () => {
    expect(
      freeCellRules.canPlaceOnCascade(card("6", "clubs"), card("7", "hearts")),
    ).toBe(true);
    expect(
      freeCellRules.canPlaceOnCascade(
        card("6", "diamonds"),
        card("7", "hearts"),
      ),
    ).toBe(false);
    expect(freeCellRules.canPlaceOnCascade(card("6"), card("8", "clubs"))).toBe(
      false,
    );
    expect(freeCellRules.canPlaceOnCascade(card("4"), undefined)).toBe(true);
  });

  test("starts foundations with Aces and builds upward by suit", () => {
    expect(freeCellRules.canPlaceOnFoundation(card("A"), undefined)).toBe(true);
    expect(freeCellRules.canPlaceOnFoundation(card("2"), undefined)).toBe(
      false,
    );
    expect(
      freeCellRules.canPlaceOnFoundation(
        card("2", "hearts"),
        card("A", "hearts"),
      ),
    ).toBe(true);
    expect(
      freeCellRules.canPlaceOnFoundation(
        card("2", "clubs"),
        card("A", "hearts"),
      ),
    ).toBe(false);
  });
});
