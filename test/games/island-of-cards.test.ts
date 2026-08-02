import { type PlayingCard } from "@/components/Cards/card-utils";
import {
  islandOfCardsRules,
  type IslandOfCardsGameState,
} from "@/components/Games/IslandOfCards";

function card(rank: PlayingCard["rank"], id: string = rank): PlayingCard {
  return { id, rank, suit: "spades", faceUp: true };
}

function grid(): (PlayingCard | null)[] {
  return Array.from({ length: islandOfCardsRules.cells }, () => null);
}

function state(
  overrides: Partial<IslandOfCardsGameState> = {},
): IslandOfCardsGameState {
  return {
    grid: grid(),
    draw: [],
    discard: [],
    ended: false,
    won: false,
    usingJokers: false,
    ...overrides,
  };
}

describe("Island of Cards rules", () => {
  test("finds neighbors without wrapping grid edges", () => {
    expect(islandOfCardsRules.orthNeighbours(0)).toEqual([7, 1]);
    expect(islandOfCardsRules.orthNeighbours(6)).toEqual([13, 5]);
    expect(islandOfCardsRules.allNeighbours(0)).toEqual([1, 7, 8]);
  });

  test("builds a thirteen-cell opening X", () => {
    const opening = islandOfCardsRules.xCells();

    expect(opening).toHaveLength(13);
    expect(new Set(opening).size).toBe(13);
    expect(opening).toEqual([0, 6, 8, 12, 16, 18, 24, 30, 32, 36, 40, 42, 48]);
  });

  test("requires a connected orthogonal rank neighbor", () => {
    const cells = grid();
    cells[24] = card("7");

    expect(islandOfCardsRules.isLegalPlacement(cells, card("8"), 25)).toBe(
      true,
    );
    expect(islandOfCardsRules.isLegalPlacement(cells, card("9"), 25)).toBe(
      false,
    );
    expect(islandOfCardsRules.isLegalPlacement(cells, card("8"), 0)).toBe(
      false,
    );
  });

  test("wraps rank adjacency between Ace and King", () => {
    expect(islandOfCardsRules.adjacentByOne(1, 13)).toBe(true);
    expect(islandOfCardsRules.adjacentByOne(1, 12)).toBe(false);

    const cells = grid();
    cells[24] = card("K");
    expect(islandOfCardsRules.isLegalPlacement(cells, card("A"), 25)).toBe(
      true,
    );
  });

  test("rejects an equal rank in any surrounding cell", () => {
    const cells = grid();
    cells[24] = card("7");
    cells[17] = card("8", "diagonal-8");

    expect(islandOfCardsRules.isLegalPlacement(cells, card("8"), 25)).toBe(
      false,
    );
  });

  test("allows Jokers on any connected cell and treats them as wild neighbors", () => {
    const cells = grid();
    cells[24] = card("5");
    expect(islandOfCardsRules.isLegalPlacement(cells, card("Joker"), 25)).toBe(
      true,
    );

    cells[24] = card("Joker");
    expect(islandOfCardsRules.isLegalPlacement(cells, card("Q"), 25)).toBe(
      true,
    );
  });

  test("enumerates legal cells and handles a missing draw card", () => {
    const cells = grid();
    cells[24] = card("7");

    expect(islandOfCardsRules.legalCells(cells, card("8"))).toEqual([
      17, 23, 25, 31,
    ]);
    expect(islandOfCardsRules.legalCells(cells, null)).toEqual([]);
  });

  test("wins on a full island and loses when an incomplete draw is exhausted", () => {
    const complete = state({
      grid: Array.from({ length: islandOfCardsRules.cells }, (_, index) =>
        card("A", `complete-${index}`),
      ),
    });
    islandOfCardsRules.afterResolve(complete);
    expect(complete).toMatchObject({ ended: true, won: true });

    const exhausted = state();
    islandOfCardsRules.afterResolve(exhausted);
    expect(exhausted).toMatchObject({ ended: true, won: false });
  });
});
