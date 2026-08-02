import { type PlayingCard } from "@/components/Cards/card-utils";
import {
  type BeleagueredCastleGameState,
  beleagueredCastleRules,
} from "@/components/Games/BeleagueredCastle";

function card(
  rank: PlayingCard["rank"],
  suit: PlayingCard["suit"] = "hearts",
  id: string = `${rank}-${suit}`,
): PlayingCard {
  return { id, rank, suit, faceUp: true };
}

function state(
  overrides: Partial<BeleagueredCastleGameState> = {},
): BeleagueredCastleGameState {
  return {
    columns: Array.from({ length: 8 }, () => []),
    foundations: Array.from({ length: 4 }, () => []),
    ended: false,
    won: false,
    ...overrides,
  };
}

describe("Beleaguered Castle rules", () => {
  test("builds columns down by rank regardless of suit", () => {
    expect(
      beleagueredCastleRules.canStackDown(
        card("7", "clubs"),
        card("8", "hearts"),
      ),
    ).toBe(true);
    expect(
      beleagueredCastleRules.canStackDown(
        card("6", "clubs"),
        card("8", "hearts"),
      ),
    ).toBe(false);
    expect(beleagueredCastleRules.canStackDown(card("Q"), undefined)).toBe(
      true,
    );
  });

  test("starts foundations with Aces and builds upward by suit", () => {
    expect(
      beleagueredCastleRules.canPlaceFoundation(card("A"), undefined),
    ).toBe(true);
    expect(
      beleagueredCastleRules.canPlaceFoundation(card("2"), card("A")),
    ).toBe(true);
    expect(
      beleagueredCastleRules.canPlaceFoundation(
        card("2", "clubs"),
        card("A", "hearts"),
      ),
    ).toBe(false);
  });

  test("finds foundation, stacking, and useful empty-column moves", () => {
    expect(
      beleagueredCastleRules.anyLegalMove(state({ columns: [[card("A")]] })),
    ).toBe(true);

    expect(
      beleagueredCastleRules.anyLegalMove(
        state({ columns: [[card("8")], [card("7")]] }),
      ),
    ).toBe(true);

    expect(
      beleagueredCastleRules.anyLegalMove(
        state({ columns: [[card("4"), card("9")], []] }),
      ),
    ).toBe(true);
  });

  test("does not count moving a lone card between empty columns as progress", () => {
    expect(
      beleagueredCastleRules.anyLegalMove(
        state({ columns: [[card("9")], [], [], [], [], [], [], []] }),
      ),
    ).toBe(false);
  });

  test("wins with four complete foundations and loses when stuck", () => {
    const completeFoundation = Array.from({ length: 13 }, (_, index) =>
      card(
        index === 0
          ? "A"
          : index === 9
            ? "10"
            : index === 10
              ? "J"
              : index === 11
                ? "Q"
                : index === 12
                  ? "K"
                  : (String(index + 1) as PlayingCard["rank"]),
        "hearts",
        `foundation-${index}`,
      ),
    );

    expect(
      beleagueredCastleRules.evaluateEnd(
        state({
          foundations: Array.from({ length: 4 }, () => [...completeFoundation]),
        }),
      ),
    ).toEqual({ ended: true, won: true });

    expect(
      beleagueredCastleRules.evaluateEnd(state({ columns: [[card("9")]] })),
    ).toEqual({ ended: true, won: false });
  });

  test("does not resolve the empty initial state during setup", () => {
    expect(beleagueredCastleRules.evaluateEnd(state(), true)).toEqual({
      ended: false,
      won: false,
    });
  });
});
