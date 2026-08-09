import { type PlayingCard } from "@/components/Cards/card-utils";
import {
  type CanfieldGameState,
  canfieldRules,
} from "@/components/Games/Canfield";

function card(
  rank: PlayingCard["rank"],
  suit: PlayingCard["suit"] = "hearts",
  id: string = `${rank}-${suit}`,
  faceUp = true,
): PlayingCard {
  return { id, rank, suit, faceUp };
}

function state(overrides: Partial<CanfieldGameState> = {}): CanfieldGameState {
  return {
    foundations: Array.from({ length: 4 }, () => []),
    baseRank: "7",
    reserve: [],
    tableau: Array.from({ length: 4 }, () => []),
    stock: [],
    waste: [],
    drawCount: 1,
    ...overrides,
  };
}

describe("Canfield rules", () => {
  test("wraps rank sequences from King to Ace", () => {
    expect(canfieldRules.nextRankWrap("Q")).toBe("K");
    expect(canfieldRules.nextRankWrap("K")).toBe("A");
    expect(canfieldRules.rankFromValue(1)).toBe("A");
    expect(canfieldRules.rankFromValue(13)).toBe("K");
  });

  test("locks each foundation to its first base-rank card suit", () => {
    expect(
      canfieldRules.canPlaceOnFoundation(card("7", "spades"), [], "7"),
    ).toBe(true);
    expect(canfieldRules.canPlaceOnFoundation(card("A"), [], "7")).toBe(false);
    expect(
      canfieldRules.canPlaceOnFoundation(card("A"), [card("K")], "7"),
    ).toBe(true);
    expect(
      canfieldRules.canPlaceOnFoundation(card("8", "spades"), [card("7")], "7"),
    ).toBe(false);
  });

  test("builds tableau down in alternating color, including Ace to King", () => {
    expect(
      canfieldRules.canPlaceOnTableau(card("6", "spades"), card("7")),
    ).toBe(true);
    expect(
      canfieldRules.canPlaceOnTableau(card("6", "diamonds"), card("7")),
    ).toBe(false);
    expect(
      canfieldRules.canPlaceOnTableau(card("K", "spades"), card("A")),
    ).toBe(true);
    expect(
      canfieldRules.isValidTableauRun([
        card("A", "hearts"),
        card("K", "spades"),
        card("Q", "diamonds"),
      ]),
    ).toBe(true);
  });

  test("reveals the next reserve card when popping the top", () => {
    const reserve = [
      card("4", "clubs", "next", false),
      card("5", "hearts", "top"),
    ];

    expect(canfieldRules.popReserveTop(reserve)?.id).toBe("top");
    expect(reserve).toHaveLength(1);
    expect(reserve[0].faceUp).toBe(true);
  });

  test("fills empty tableau columns from the reserve", () => {
    const game = state({
      reserve: [
        card("4", "clubs", "first", false),
        card("5", "hearts", "second"),
      ],
      tableau: [[], [card("9")], [], [card("J")]],
    });

    canfieldRules.fillEmptyTableauFromReserve(game);

    expect(game.tableau[0][0].id).toBe("second");
    expect(game.tableau[2][0].id).toBe("first");
    expect(game.tableau[2][0].faceUp).toBe(true);
    expect(game.reserve).toEqual([]);
  });

  test.each([1, 3] as const)(
    "deals a complete initial layout with draw count %s",
    (drawCount) => {
      const game = canfieldRules.createInitialState(drawCount);
      const cardCount =
        game.reserve.length +
        game.tableau.flat().length +
        game.foundations.flat().length +
        game.stock.length +
        game.waste.length;

      expect(cardCount).toBe(52);
      expect(game.reserve).toHaveLength(13);
      expect(game.reserve.filter(({ faceUp }) => faceUp)).toHaveLength(1);
      expect(game.tableau.map((pile) => pile.length)).toEqual([1, 1, 1, 1]);
      expect(game.foundations.flat()).toHaveLength(1);
      expect(game.stock).toHaveLength(34);
      expect(game.drawCount).toBe(drawCount);
      expect(game.foundations.flat()[0].rank).toBe(game.baseRank);
      expect(game.foundations[0]).toHaveLength(1);
      expect(game.foundations.slice(1).every((pile) => pile.length === 0)).toBe(
        true,
      );
    },
  );
});
