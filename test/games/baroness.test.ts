import { type PlayingCard } from "@/components/Cards/card-utils";
import {
  type BaronessGameState,
  baronessRules,
} from "@/components/Games/Baroness";

function card(rank: PlayingCard["rank"], id: string = rank): PlayingCard {
  return { id, rank, suit: "hearts", faceUp: true };
}

function state(overrides: Partial<BaronessGameState> = {}): BaronessGameState {
  return {
    piles: Array.from({ length: 5 }, () => []),
    draw: [],
    discard: [],
    ended: false,
    won: false,
    ...overrides,
  };
}

describe("Baroness rules", () => {
  test("wins after every pile and the stock are cleared", () => {
    expect(baronessRules.evaluateEnd(state(), false)).toEqual({
      ended: true,
      won: true,
    });
  });

  test("does not resolve the empty initial state during setup", () => {
    expect(baronessRules.evaluateEnd(state(), false, true)).toEqual({
      ended: false,
      won: false,
    });
  });

  test("continues while cards remain in the stock", () => {
    expect(
      baronessRules.evaluateEnd(
        state({ draw: [card("2", "stock")], piles: [[card("4")]] }),
        false,
      ),
    ).toEqual({ ended: false, won: false });
  });

  test("continues for an exposed King or pair totaling 13", () => {
    expect(
      baronessRules.evaluateEnd(state({ piles: [[card("K")]] }), false),
    ).toEqual({ ended: false, won: false });

    expect(
      baronessRules.evaluateEnd(
        state({ piles: [[card("5")], [card("8")]] }),
        false,
      ),
    ).toEqual({ ended: false, won: false });
  });

  test("only considers the exposed top cards for pairs", () => {
    expect(
      baronessRules.evaluateEnd(
        state({
          piles: [[card("5", "covered"), card("2", "top")], [card("8")]],
        }),
        false,
      ),
    ).toEqual({ ended: true, won: false });
  });

  test("normal mode can expose a card by moving onto an empty pile", () => {
    const game = state({
      piles: [[card("4", "covered"), card("6", "top")], [], [card("9")]],
    });

    expect(baronessRules.evaluateEnd(game, true)).toEqual({
      ended: false,
      won: false,
    });
    expect(baronessRules.evaluateEnd(game, false)).toEqual({
      ended: true,
      won: false,
    });
  });

  test("loses with no stock, King, pair, or useful empty-pile move", () => {
    expect(
      baronessRules.evaluateEnd(
        state({ piles: [[card("2")], [card("4")], [card("6")]] }),
        true,
      ),
    ).toEqual({ ended: true, won: false });
  });
});
