import { type PlayingCard } from "@/components/Cards/card-utils";
import {
  type BlackHoleGameState,
  blackHoleRules,
} from "@/components/Games/BlackHole";

function card(rank: PlayingCard["rank"], id: string = rank): PlayingCard {
  return { id, rank, suit: "spades", faceUp: true };
}

function state(
  overrides: Partial<BlackHoleGameState> = {},
): BlackHoleGameState {
  return {
    piles: Array.from({ length: 17 }, () => []),
    hole: [card("7", "hole")],
    ended: false,
    won: false,
    ...overrides,
  };
}

describe("Black Hole rules", () => {
  test.each([
    ["6", "7", true],
    ["8", "7", true],
    ["A", "K", true],
    ["K", "A", true],
    ["7", "7", false],
    ["5", "7", false],
  ] as const)("allows %s beside %s: %s", (rank, holeRank, expected) => {
    expect(blackHoleRules.adjacentWrap(card(rank), card(holeRank))).toBe(
      expected,
    );
  });

  test("wins after every surrounding pile is cleared", () => {
    expect(blackHoleRules.evaluateEnd(state())).toEqual({
      ended: true,
      won: true,
    });
  });

  test("does not resolve the empty initial state during setup", () => {
    expect(blackHoleRules.evaluateEnd(state(), true)).toEqual({
      ended: false,
      won: false,
    });
  });

  test("continues when an exposed pile card is adjacent", () => {
    expect(
      blackHoleRules.evaluateEnd(state({ piles: [[card("6", "playable")]] })),
    ).toEqual({ ended: false, won: false });
  });

  test("only considers the exposed top card of each pile", () => {
    expect(
      blackHoleRules.evaluateEnd(
        state({ piles: [[card("6", "covered"), card("10", "exposed")]] }),
      ),
    ).toEqual({ ended: true, won: false });
  });

  test("loses when no exposed card is adjacent to the hole", () => {
    expect(
      blackHoleRules.evaluateEnd(
        state({ piles: [[card("2")], [card("Q")], [card("9")]] }),
      ),
    ).toEqual({ ended: true, won: false });
  });
});
