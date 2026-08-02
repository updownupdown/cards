import { type CardSuit, type PlayingCard } from "@/components/Cards/card-utils";
import {
  penguinRules,
  type PenguinGameState,
} from "@/components/Games/Penguin";

function card(
  rank: PlayingCard["rank"],
  suit: PlayingCard["suit"] = "hearts",
  id: string = `${rank}-${suit}`,
): PlayingCard {
  return { id, rank, suit, faceUp: true };
}

function foundations(
  cards: Partial<Record<CardSuit, PlayingCard[]>> = {},
): Record<CardSuit, PlayingCard[]> {
  return { clubs: [], diamonds: [], hearts: [], spades: [], ...cards };
}

describe("Penguin rules", () => {
  test("deals 49 tableau cards and seeds three foundations at the beak rank", () => {
    const state = penguinRules.createInitialState();
    const foundationCards = Object.values(state.foundations).flat();

    expect(state.tableau.map((pile) => pile.length)).toEqual(Array(7).fill(7));
    expect(foundationCards).toHaveLength(3);
    expect(foundationCards.every(({ rank }) => rank === state.beakRank)).toBe(
      true,
    );
    expect(state.reserves).toEqual(Array(7).fill(null));
  });

  test("starts foundations at the beak and builds upward by suit with wrapping", () => {
    expect(penguinRules.canStartFoundation(card("7"), [], "7")).toBe(true);
    expect(penguinRules.canStartFoundation(card("8"), [], "7")).toBe(false);
    expect(penguinRules.canPlaceOnFoundation(card("A"), [card("K")])).toBe(
      true,
    );
    expect(
      penguinRules.canPlaceOnFoundation(card("A", "clubs"), [card("K")]),
    ).toBe(false);
  });

  test("builds tableau down by suit with wrapping", () => {
    expect(penguinRules.canPlaceOnTableau(card("K"), card("A"), "7")).toBe(
      true,
    );
    expect(
      penguinRules.canPlaceOnTableau(card("K", "clubs"), card("A"), "7"),
    ).toBe(false);
    expect(penguinRules.canPlaceOnTableau(card("6"), null, "7")).toBe(true);
    expect(penguinRules.canPlaceOnTableau(card("5"), null, "7")).toBe(false);
  });

  test("recognizes wrapped same-suit tableau runs", () => {
    expect(
      penguinRules.isValidRun([
        card("2", "spades", "two"),
        card("A", "spades", "ace"),
        card("K", "spades", "king"),
      ]),
    ).toBe(true);
    expect(
      penguinRules.isValidRun([card("2", "spades"), card("A", "clubs")]),
    ).toBe(false);
  });

  test("marks complete foundations as won and a move-less state as lost", () => {
    const complete = foundations(
      Object.fromEntries(
        (["clubs", "diamonds", "hearts", "spades"] as CardSuit[]).map(
          (suit) => [
            suit,
            Array.from({ length: 13 }, (_, index) =>
              card("A", suit, `${suit}-${index}`),
            ),
          ],
        ),
      ),
    );
    const base: PenguinGameState = {
      foundations: complete,
      beakRank: "7",
      tableau: Array.from({ length: 7 }, () => []),
      reserves: Array(7).fill(null),
      ended: false,
      won: false,
    };

    expect(penguinRules.evaluate(base)).toMatchObject({
      ended: true,
      won: true,
    });
    expect(
      penguinRules.evaluate({ ...base, foundations: foundations() }),
    ).toMatchObject({ ended: true, won: false });
  });
});
