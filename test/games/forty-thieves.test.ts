import { type PlayingCard } from "@/components/Cards/card-utils";
import {
  type FortyThievesGameState,
  fortyThievesRules,
} from "@/components/Games/FortyThieves";

function card(
  rank: PlayingCard["rank"],
  suit: PlayingCard["suit"] = "spades",
  id: string = `${rank}-${suit}`,
): PlayingCard {
  return { id, rank, suit, faceUp: true };
}

function state(
  overrides: Partial<FortyThievesGameState> = {},
): FortyThievesGameState {
  return {
    foundations: Array.from({ length: 8 }, () => []),
    tableau: Array.from({ length: 10 }, () => []),
    stock: [],
    waste: [],
    redealsUsed: 0,
    ...overrides,
  };
}

describe("Forty Thieves rules", () => {
  test("deals all 104 cards into ten tableau piles and stock", () => {
    const game = fortyThievesRules.createInitialState();

    expect(game.tableau.map((pile) => pile.length)).toEqual(
      Array.from({ length: 10 }, () => 4),
    );
    expect(game.stock).toHaveLength(64);
    expect(game.foundations).toHaveLength(8);
    expect(
      game.tableau.flat().length + game.stock.length + game.waste.length,
    ).toBe(104);
    expect(game.tableau.flat().every(({ faceUp }) => faceUp)).toBe(true);
    expect(game.stock.every(({ faceUp }) => !faceUp)).toBe(true);
  });

  test("allows two Ace foundations per suit and rejects a third", () => {
    const started = [
      card("A", "hearts", "first"),
      card("A", "hearts", "second"),
    ];

    expect(
      fortyThievesRules.canPlaceOnFoundation(
        card("A", "hearts", "candidate"),
        [],
        started.slice(0, 1),
      ),
    ).toBe(true);
    expect(
      fortyThievesRules.canPlaceOnFoundation(
        card("A", "hearts", "candidate"),
        [],
        started,
      ),
    ).toBe(false);
  });

  test("builds foundations upward and tableau downward in the same suit", () => {
    expect(
      fortyThievesRules.canPlaceOnFoundation(
        card("2", "clubs"),
        [card("A", "clubs")],
        [card("A", "clubs")],
      ),
    ).toBe(true);
    expect(
      fortyThievesRules.canPlaceOnTableau(
        card("9", "spades"),
        card("10", "spades"),
      ),
    ).toBe(true);
    expect(
      fortyThievesRules.canPlaceOnTableau(
        card("9", "hearts"),
        card("10", "spades"),
      ),
    ).toBe(false);
    expect(fortyThievesRules.canPlaceOnTableau(card("5"))).toBe(true);
  });

  test("allows recycling waste only when the difficulty permits it", () => {
    const game = state({ waste: [card("7")] });

    expect(fortyThievesRules.canDrawFromStock(game, true)).toBe(true);
    expect(fortyThievesRules.canDrawFromStock(game, false)).toBe(false);
    expect(
      fortyThievesRules.canDrawFromStock(state({ stock: [card("2")] }), false),
    ).toBe(true);
  });

  test("distinguishes terminal positions from legal foundation moves", () => {
    expect(fortyThievesRules.hasAnyLegalMove(state(), false)).toBe(false);

    expect(
      fortyThievesRules.hasAnyLegalMove(
        state({ tableau: [[card("A", "diamonds")]] }),
        false,
      ),
    ).toBe(true);
  });
});
