import { type CardRank, type PlayingCard } from "@/components/Cards/card-utils";
import {
  triPeaksRules,
  type TriPeaksGameState,
  type TriPeaksTableauCard,
} from "@/components/Games/TriPeaks";

function card(rank: CardRank, id: string = rank, faceUp = true): PlayingCard {
  return { id, rank, suit: "spades", faceUp };
}

function tableauCard(
  rank: CardRank,
  row: number,
  col: number,
  faceUp = true,
): TriPeaksTableauCard {
  return {
    ...card(rank, `${rank}-${row}-${col}`, faceUp),
    row,
    col,
    blockers: triPeaksRules.blockersFor(row, col),
  };
}

function emptyTableau(): (TriPeaksTableauCard | null)[] {
  return Array(28).fill(null);
}

function state(
  tableau: (TriPeaksTableauCard | null)[],
  wasteRank: CardRank = "4",
): TriPeaksGameState {
  return { tableau, draw: [], waste: [card(wasteRank, "waste")] };
}

describe("TriPeaks rules", () => {
  test.each([
    ["A", "K", true],
    ["K", "A", true],
    ["5", "6", true],
    ["5", "7", false],
  ] as const)(
    "evaluates adjacency for %s and %s",
    (first, second, expected) => {
      expect(triPeaksRules.isAdjacentRank(card(first), card(second))).toBe(
        expected,
      );
    },
  );

  test("maps rows to linear indices and their blockers", () => {
    expect(triPeaksRules.tableauIndex(3, 0)).toBe(18);
    expect(triPeaksRules.blockersFor(3, 4)).toEqual([]);
    expect(triPeaksRules.blockersFor(2, 0)).toEqual([18, 19]);
    expect(triPeaksRules.blockersFor(0, 1)).toEqual([5, 6]);
  });

  test("exposes a card only after every blocker is removed", () => {
    const tableau = emptyTableau();
    const entry = tableauCard("5", 2, 0);

    expect(triPeaksRules.isExposed(entry, tableau)).toBe(true);

    tableau[18] = tableauCard("K", 3, 0);
    expect(triPeaksRules.isExposed(entry, tableau)).toBe(false);
  });

  test("reveals newly exposed cards and leaves blocked cards face down", () => {
    const tableau = emptyTableau();
    tableau[9] = tableauCard("5", 2, 0, false);
    tableau[10] = tableauCard("6", 2, 1, false);
    tableau[20] = tableauCard("K", 3, 2);

    triPeaksRules.revealExposedCards(tableau);

    expect(tableau[9]?.faceUp).toBe(true);
    expect(tableau[10]?.faceUp).toBe(false);
  });

  test("moves only face-up, exposed, adjacent cards to waste", () => {
    const tableau = emptyTableau();
    tableau[18] = tableauCard("5", 3, 0);

    expect(triPeaksRules.canMoveToWaste(18, state(tableau))).toBe(true);

    tableau[18] = tableauCard("5", 3, 0, false);
    expect(triPeaksRules.canMoveToWaste(18, state(tableau))).toBe(false);

    tableau[18] = tableauCard("8", 3, 0);
    expect(triPeaksRules.canMoveToWaste(18, state(tableau))).toBe(false);
  });

  test("detects both available moves and deadlocked tableaus", () => {
    const playable = emptyTableau();
    playable[18] = tableauCard("5", 3, 0);
    expect(triPeaksRules.hasAvailableMoves(state(playable))).toBe(true);

    const blocked = emptyTableau();
    blocked[18] = tableauCard("8", 3, 0);
    expect(triPeaksRules.hasAvailableMoves(state(blocked))).toBe(false);
  });
});
