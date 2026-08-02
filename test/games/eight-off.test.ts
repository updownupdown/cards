import { type PlayingCard } from "@/components/Cards/card-utils";
import { eightOffRules } from "@/components/Games/EightOff";

function card(
  rank: PlayingCard["rank"],
  suit: PlayingCard["suit"] = "spades",
  id: string = `${rank}-${suit}`,
): PlayingCard {
  return { id, rank, suit, faceUp: true };
}

describe("Eight Off rules", () => {
  test("deals six cards per cascade and seeds four of eight free cells", () => {
    const state = eightOffRules.createInitialState();
    const cards = [
      ...state.cascades.flat(),
      ...state.freeCells.filter(
        (entry): entry is PlayingCard => entry !== null,
      ),
    ];

    expect(state.cascades.map((pile) => pile.length)).toEqual(Array(8).fill(6));
    expect(state.freeCells.filter(Boolean)).toHaveLength(4);
    expect(state.freeCells).toHaveLength(8);
    expect(cards).toHaveLength(52);
    expect(new Set(cards.map(({ id }) => id)).size).toBe(52);
  });

  test("builds cascades down in suit and allows only Kings on empty columns", () => {
    expect(
      eightOffRules.canPlaceOnCascade(card("6", "clubs"), card("7", "clubs")),
    ).toBe(true);
    expect(
      eightOffRules.canPlaceOnCascade(card("6", "spades"), card("7", "clubs")),
    ).toBe(false);
    expect(eightOffRules.canPlaceOnCascade(card("K"), undefined)).toBe(true);
    expect(eightOffRules.canPlaceOnCascade(card("Q"), undefined)).toBe(false);
  });

  test("recognizes only descending same-suit runs", () => {
    expect(
      eightOffRules.isDescendingSameSuitStack([
        card("8", "hearts", "eight"),
        card("7", "hearts", "seven"),
        card("6", "hearts", "six"),
      ]),
    ).toBe(true);
    expect(
      eightOffRules.isDescendingSameSuitStack([
        card("8", "hearts"),
        card("7", "diamonds"),
      ]),
    ).toBe(false);
  });

  test("starts foundations with Aces and builds upward by suit", () => {
    expect(eightOffRules.canPlaceOnFoundation(card("A"), undefined)).toBe(true);
    expect(eightOffRules.canPlaceOnFoundation(card("2"), card("A"))).toBe(true);
    expect(
      eightOffRules.canPlaceOnFoundation(card("2", "clubs"), card("A")),
    ).toBe(false);
  });
});
