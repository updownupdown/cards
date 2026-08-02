import { type PlayingCard } from "@/components/Cards/card-utils";
import {
  type BakersGameState,
  bakersGameRules,
} from "@/components/Games/BakersGame";

function card(
  rank: PlayingCard["rank"],
  suit: PlayingCard["suit"] = "spades",
  id: string = `${rank}-${suit}`,
): PlayingCard {
  return { id, rank, suit, faceUp: true };
}

function state(overrides: Partial<BakersGameState> = {}): BakersGameState {
  return {
    cascades: Array.from({ length: 8 }, () => []),
    freeCells: [null, null, null, null],
    foundations: Array.from({ length: 4 }, () => []),
    ...overrides,
  };
}

describe("Baker's Game rules", () => {
  test("deals all 52 cards face up across eight cascades", () => {
    const game = bakersGameRules.createInitialState();

    expect(game.cascades.map((pile) => pile.length)).toEqual([
      7, 7, 7, 7, 6, 6, 6, 6,
    ]);
    expect(game.cascades.flat()).toHaveLength(52);
    expect(game.cascades.flat().every(({ faceUp }) => faceUp)).toBe(true);
    expect(new Set(game.cascades.flat().map(({ id }) => id)).size).toBe(52);
    expect(game.freeCells).toEqual([null, null, null, null]);
  });

  test("builds cascades down in the same suit", () => {
    expect(
      bakersGameRules.canPlaceOnCascade(
        card("9", "spades"),
        card("10", "spades"),
      ),
    ).toBe(true);
    expect(
      bakersGameRules.canPlaceOnCascade(
        card("9", "hearts"),
        card("10", "spades"),
      ),
    ).toBe(false);
    expect(bakersGameRules.canPlaceOnCascade(card("4"), undefined)).toBe(true);
  });

  test("starts foundations with Aces and builds upward by suit", () => {
    expect(
      bakersGameRules.canPlaceOnFoundation(card("A", "clubs"), undefined),
    ).toBe(true);
    expect(
      bakersGameRules.canPlaceOnFoundation(
        card("2", "clubs"),
        card("A", "clubs"),
      ),
    ).toBe(true);
    expect(
      bakersGameRules.canPlaceOnFoundation(
        card("2", "hearts"),
        card("A", "clubs"),
      ),
    ).toBe(false);
  });

  test("validates movable same-suit descending runs", () => {
    expect(
      bakersGameRules.isDescendingSameSuitStack([
        card("K", "diamonds"),
        card("Q", "diamonds"),
        card("J", "diamonds"),
      ]),
    ).toBe(true);
    expect(
      bakersGameRules.isDescendingSameSuitStack([
        card("K", "diamonds"),
        card("Q", "hearts"),
      ]),
    ).toBe(false);
    expect(
      bakersGameRules.isDescendingSameSuitStack([
        card("K", "diamonds"),
        card("J", "diamonds"),
      ]),
    ).toBe(false);
  });

  test("limits shortcut stack moves by available free cells", () => {
    expect(bakersGameRules.getMaxMovableStackSize(state())).toBe(5);
    expect(
      bakersGameRules.getMaxMovableStackSize(
        state({ freeCells: [card("2"), null, card("4"), null] }),
      ),
    ).toBe(3);
  });

  test("wins only after all four foundations are complete", () => {
    expect(
      bakersGameRules.isWon(
        state({
          foundations: Array.from({ length: 4 }, () =>
            Array.from({ length: 13 }, (_, index) =>
              card("A", "clubs", `card-${index}`),
            ),
          ),
        }),
      ),
    ).toBe(true);
    expect(
      bakersGameRules.isWon(state({ foundations: [[card("A")], [], [], []] })),
    ).toBe(false);
  });
});
