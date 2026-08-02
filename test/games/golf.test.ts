import { type PlayingCard } from "@/components/Cards/card-utils";
import { type GolfGameState, golfRules } from "@/components/Games/Golf";

function card(rank: PlayingCard["rank"], id: string = rank): PlayingCard {
  return { id, rank, suit: "hearts", faceUp: true };
}

function state(overrides: Partial<GolfGameState> = {}): GolfGameState {
  return {
    draw: [],
    discard: [card("7", "discard")],
    piles: Array.from({ length: 7 }, () => []),
    ended: false,
    won: false,
    ...overrides,
  };
}

describe("Golf rules", () => {
  test.each([
    ["6", "7", true],
    ["8", "7", true],
    ["7", "7", false],
    ["A", "K", false],
    ["K", "A", false],
  ] as const)("allows %s on %s: %s", (rank, discardRank, expected) => {
    expect(golfRules.canDiscard(card(rank), card(discardRank))).toBe(expected);
  });

  test("only considers the exposed card at the end of each pile", () => {
    const game = state({
      piles: [[card("6", "covered"), card("Q", "exposed")]],
    });

    expect(golfRules.hasAnyMove(game)).toBe(false);

    game.piles[0].push(card("8", "new-exposed"));
    expect(golfRules.hasAnyMove(game)).toBe(true);
  });

  test("wins when every tableau pile is empty", () => {
    expect(golfRules.evaluateEnd(state())).toEqual({
      ended: true,
      won: true,
    });
  });

  test("does not win from the transient empty tableau during setup", () => {
    expect(golfRules.evaluateEnd(state(), true)).toEqual({
      ended: false,
      won: false,
    });
  });

  test("continues while stock or a tableau move remains", () => {
    expect(
      golfRules.evaluateEnd(
        state({ draw: [card("2", "stock")], piles: [[card("Q")]] }),
      ),
    ).toEqual({ ended: false, won: false });

    expect(
      golfRules.evaluateEnd(state({ piles: [[card("6", "playable")]] })),
    ).toEqual({ ended: false, won: false });
  });

  test("loses with an empty stock and no exposed play", () => {
    expect(
      golfRules.evaluateEnd(state({ piles: [[card("Q", "blocked")]] })),
    ).toEqual({ ended: true, won: false });
  });
});
