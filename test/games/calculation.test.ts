import {
  type CardRank,
  type CardSuit,
  type PlayingCard,
} from "@/components/Cards/card-utils";
import { calculationRules } from "@/components/Games/Calculation";

function card(
  rank: CardRank,
  suit: CardSuit = "spades",
  id = `${rank}-${suit}`,
): PlayingCard {
  return { id, rank, suit, faceUp: true };
}

function startingFoundations(): PlayingCard[][] {
  return [[card("A")], [card("2")], [card("3")], [card("4")]];
}

describe("Calculation rules", () => {
  test.each([
    ["A", 1, 2],
    ["K", 1, 1],
    ["Q", 1, 13],
    ["9", 4, 13],
    ["Q", 4, 3],
  ] as const)(
    "advances %s by %i with rank wrapping",
    (rank, step, expected) => {
      expect(calculationRules.nextRankValue(card(rank), step)).toBe(expected);
    },
  );

  test("allows only the next rank for a foundation step", () => {
    expect(
      calculationRules.canPlayToFoundation(card("2"), [card("A")], 1),
    ).toBe(true);
    expect(
      calculationRules.canPlayToFoundation(card("A"), [card("K")], 1),
    ).toBe(true);
    expect(
      calculationRules.canPlayToFoundation(card("K"), [card("Q")], 1),
    ).toBe(true);
    expect(
      calculationRules.canPlayToFoundation(card("3"), [card("A")], 1),
    ).toBe(false);
    expect(calculationRules.canPlayToFoundation(card("2"), [], 1)).toBe(false);
  });

  test.each([
    ["Q", 1],
    ["J", 2],
    ["10", 3],
    ["9", 4],
  ] as const)(
    "allows %s with step +%i to land exactly on King",
    (rank, step) => {
      expect(
        calculationRules.canPlayToFoundation(card("K"), [card(rank)], step),
      ).toBe(true);
    },
  );

  test("checks all four foundation step sizes", () => {
    const foundations = startingFoundations();

    expect(calculationRules.anyFoundationPlayable(card("8"), foundations)).toBe(
      true,
    );
    expect(calculationRules.anyFoundationPlayable(card("5"), foundations)).toBe(
      false,
    );
    expect(calculationRules.anyFoundationPlayable(undefined, foundations)).toBe(
      false,
    );
  });

  test("keeps an empty-stock game active when a waste top is playable", () => {
    expect(
      calculationRules.evaluateEndState([], startingFoundations(), [
        [card("2")],
        [],
        [],
        [],
      ]),
    ).toEqual({ ended: false, won: false });
  });

  test("continues when only one of several waste tops is playable", () => {
    expect(
      calculationRules.evaluateEndState([], startingFoundations(), [
        [card("5")],
        [card("7")],
        [card("6")],
        [card("9")],
      ]),
    ).toEqual({ ended: false, won: false });
  });

  test("loses when stock is empty and no waste top is playable", () => {
    expect(
      calculationRules.evaluateEndState([], startingFoundations(), [
        [card("5")],
        [],
        [],
        [],
      ]),
    ).toEqual({ ended: true, won: false });
  });

  test("wins once all 52 cards are on foundations", () => {
    const foundations = Array.from({ length: 4 }, (_, pileIndex) =>
      Array.from({ length: 13 }, (_, cardIndex) =>
        card("K", "spades", `${pileIndex}-${cardIndex}`),
      ),
    );

    expect(
      calculationRules.evaluateEndState([], foundations, [[], [], [], []]),
    ).toEqual({ ended: true, won: true });
  });
});
