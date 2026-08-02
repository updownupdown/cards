import { type PlayingCard } from "@/components/Cards/card-utils";
import {
  optritaLinesRules,
  type OptritaCell,
  type OptritaGameState,
} from "@/components/Games/OptritaLines";
import { exploreGame, type GameModel } from "../framework/game-model";

function card(
  rank: PlayingCard["rank"],
  suit: PlayingCard["suit"] = "hearts",
  id: string = `${rank}-${suit}`,
): PlayingCard {
  return { id, rank, suit, faceUp: true };
}

function grid(filled: number[] = []): OptritaCell[] {
  const filledCells = new Set(filled);
  return Array.from({ length: 36 }, (_, index) => ({
    card: filledCells.has(index) ? card("2") : null,
    faceUp: false,
  }));
}

function state(overrides: Partial<OptritaGameState> = {}): OptritaGameState {
  return {
    grid: grid(),
    hand: [],
    playerWon: [],
    gridWon: [],
    discard: [],
    trump: null,
    trumpPhase: false,
    youScore: 0,
    gridScore: 0,
    round: 1,
    ended: false,
    won: false,
    ...overrides,
  };
}

describe("Optrita: Lines rules", () => {
  test("ranks Aces high", () => {
    expect(optritaLinesRules.rankHigh(card("A"))).toBe(14);
    expect(optritaLinesRules.rankHigh(card("K"))).toBe(13);
    expect(optritaLinesRules.rankHigh(card("2"))).toBe(2);
  });

  test("orders rows from either end", () => {
    expect(optritaLinesRules.orderedCells("row", 2, "fwd")).toEqual([
      12, 13, 14, 15, 16, 17,
    ]);
    expect(optritaLinesRules.orderedCells("row", 2, "rev")).toEqual([
      17, 16, 15, 14, 13, 12,
    ]);
  });

  test("orders columns from either end", () => {
    expect(optritaLinesRules.orderedCells("col", 3, "fwd")).toEqual([
      3, 9, 15, 21, 27, 33,
    ]);
    expect(optritaLinesRules.orderedCells("col", 3, "rev")).toEqual([
      33, 27, 21, 15, 9, 3,
    ]);
  });

  test("requires every cell in a challenged line to be occupied", () => {
    expect(
      optritaLinesRules.lineFull(grid([12, 13, 14, 15, 16, 17]), "row", 2),
    ).toBe(true);
    expect(
      optritaLinesRules.lineFull(grid([12, 13, 14, 15, 16]), "row", 2),
    ).toBe(false);
  });

  test("stops at the first suit match and compares ranks Ace-high", () => {
    const cells = [0, 1, 2, 3, 4, 5];
    const challengeGrid = grid(cells);
    challengeGrid[0].card = card("K", "clubs", "first");
    challengeGrid[1].card = card("Q", "hearts", "match");
    challengeGrid[2].card = card("2", "hearts", "later-match");

    expect(
      optritaLinesRules.resolveLineChallenge(
        challengeGrid,
        cells,
        card("A", "hearts", "hand"),
        "spades",
      ),
    ).toEqual({
      type: "matched",
      cellIndex: 1,
      youWin: true,
      revealCells: [0, 1],
    });
  });

  test("uses the lowest trump only when no topic suit matches", () => {
    const cells = [0, 1, 2, 3, 4, 5];
    const challengeGrid = grid(cells);
    cells.forEach((cellIndex) => {
      challengeGrid[cellIndex].card = card(
        "5",
        "diamonds",
        `other-${cellIndex}`,
      );
    });
    challengeGrid[0].card = card("9", "spades", "high-trump");
    challengeGrid[3].card = card("3", "spades", "low-trump");

    expect(
      optritaLinesRules.resolveLineChallenge(
        challengeGrid,
        cells,
        card("K", "hearts", "hand"),
        "spades",
      ),
    ).toEqual({
      type: "trump",
      cellIndex: 3,
      youWin: false,
      revealCells: cells,
    });
  });

  test("offers a free pick when the line has neither matching suit nor trump", () => {
    const cells = [0, 1, 2, 3, 4, 5];
    const challengeGrid = grid(cells);

    expect(
      optritaLinesRules.resolveLineChallenge(
        challengeGrid,
        cells,
        card("K", "clubs", "hand"),
        "spades",
      ),
    ).toEqual({ type: "free", cells, revealCells: cells });
  });

  test("applies trick cards and terminal score thresholds atomically", () => {
    const won = state({
      grid: grid([0]),
      hand: [card("A", "hearts", "hand")],
      youScore: 20,
    });
    won.grid[0].card = card("K", "hearts", "grid");

    expect(optritaLinesRules.applyTrickResultAction(won, 0, 0, true, 21)).toBe(
      true,
    );
    expect(won).toMatchObject({ youScore: 21, ended: true, won: true });
    expect(won.playerWon).toHaveLength(2);
    expect(won.playerWon.every(({ faceUp }) => !faceUp)).toBe(true);

    const lost = state({
      grid: grid([0]),
      hand: [card("2", "clubs", "lost-hand")],
      gridScore: 14,
    });
    lost.grid[0].card = card("3", "clubs", "lost-grid");
    optritaLinesRules.applyTrickResultAction(lost, 0, 0, false, 15);
    expect(lost).toMatchObject({ gridScore: 15, ended: true, won: false });
  });

  test("exhaustively reaches both hard-mode outcomes or the next round", () => {
    type Action = { youWin: boolean };
    type Outcome = "won" | "lost" | "next-round";
    const model: GameModel<OptritaGameState, Action, Outcome> = {
      getActions: (current) =>
        current.hand.length > 0 ? [{ youWin: true }, { youWin: false }] : [],
      applyAction: (current, action) => {
        const next = structuredClone(current);
        const cellIndex = next.grid.findIndex(({ card: gridCard }) => gridCard);
        optritaLinesRules.applyTrickResultAction(
          next,
          0,
          cellIndex,
          action.youWin,
          15,
        );
        return next;
      },
      getOutcome: (current) => {
        if (current.ended) return current.won ? "won" : "lost";
        return current.hand.length === 0 ? "next-round" : null;
      },
      getStateKey: (current) => JSON.stringify(current),
      assertInvariants: (current) => {
        const cards = [
          ...current.hand,
          ...current.playerWon,
          ...current.gridWon,
          ...current.grid.flatMap(({ card: gridCard }) =>
            gridCard ? [gridCard] : [],
          ),
        ];
        expect(cards).toHaveLength(4);
        expect(new Set(cards.map(({ id }) => id)).size).toBe(4);
        expect(
          [...current.playerWon, ...current.gridWon].every(
            ({ faceUp }) => !faceUp,
          ),
        ).toBe(true);
      },
    };
    const initial = state({
      grid: grid([0, 1]),
      hand: [card("A", "hearts", "hand-1"), card("K", "clubs", "hand-2")],
      youScore: 19,
      gridScore: 13,
    });
    initial.grid[0].card = card("2", "hearts", "grid-1");
    initial.grid[1].card = card("3", "clubs", "grid-2");

    const result = exploreGame(model, initial, {
      maxDepth: 2,
      checkMutations: true,
    });

    expect(result.deadEnds).toHaveLength(0);
    expect(result.truncatedPaths).toHaveLength(0);
    expect([...result.outcomes.keys()].sort()).toEqual([
      "lost",
      "next-round",
      "won",
    ]);
  });
});
