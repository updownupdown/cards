import { describe, expect, test } from "@jest/globals";
import "../../../jest/game-mocks";
import { card } from "../../../jest/game-harness";
import { stalactitesRules } from "@/components/Games/Stalactites";
import { crosswordRules } from "@/components/Games/Crossword";
import { ozanamsSquareRules } from "@/components/Games/OzanamsSquare";
import { irisGardenRules } from "@/components/Games/IrisGarden";
import { auguryRules, LAWS } from "@/components/Games/Augury";
import {
  createDeck,
  type CardRank,
  type PlayingCard,
} from "@/components/Cards/card-utils";

describe("Stalactites", () => {
  const { canBuildFoundation, canMove, evaluateEnd } = stalactitesRules;

  test("deals four foundation cards and eight columns of six", () => {
    const state = stalactitesRules.createInitialState();
    expect(state.foundations.map((pile) => pile.length)).toEqual([1, 1, 1, 1]);
    expect(state.tableau.map((pile) => pile.length)).toEqual(Array(8).fill(6));
    expect(state.step).toBeNull();
  });

  test("foundations build by ones or twos, any suit, wrapping", () => {
    const king = [card("K", "clubs")];
    expect(canBuildFoundation(card("A", "hearts"), king, 1)).toBe(true);
    expect(canBuildFoundation(card("2", "hearts"), king, 2)).toBe(true);
    expect(canBuildFoundation(card("A", "hearts"), king, 2)).toBe(false);
    expect(canBuildFoundation(card("2", "hearts"), king, null)).toBe(true);
    expect(canBuildFoundation(card("3", "hearts"), king, null)).toBe(false);
    const full = Array.from({ length: 13 }, () => card("K", "clubs"));
    expect(canBuildFoundation(card("A", "hearts"), full, 1)).toBe(false);
  });

  test("cells take one column card; the first foundation play sets the step", () => {
    const state = stalactitesRules.createInitialState();
    const toCell = { zone: "cell" as const, pile: 0 };
    const fromColumn = { zone: "tableau" as const, pile: 0 };
    expect(canMove(state, fromColumn, toCell)).toBe(true);
    stalactitesRules.applyMove(state, fromColumn, toCell);
    expect(canMove(state, { zone: "tableau", pile: 1 }, toCell)).toBe(false);
    expect(
      canMove(state, { zone: "cell", pile: 0 }, { zone: "cell", pile: 1 }),
    ).toBe(false);

    state.foundations[0] = [card("7", "clubs")];
    state.tableau[1] = [card("9", "hearts")];
    stalactitesRules.applyMove(
      state,
      { zone: "tableau", pile: 1 },
      { zone: "foundation", pile: 0 },
    );
    expect(state.step).toBe(2);
  });

  test("the game is lost with both cells full and no foundation play", () => {
    const state = stalactitesRules.createInitialState();
    state.step = 1;
    state.foundations = [
      [card("K", "clubs")],
      [card("K", "hearts")],
      [card("K", "spades")],
      [card("K", "diamonds")],
    ];
    state.cells = [[card("5", "clubs")], [card("6", "clubs")]];
    state.tableau = [
      [card("9", "clubs")],
      ...Array.from({ length: 7 }, () => []),
    ];
    expect(evaluateEnd(state)).toEqual({ ended: true, won: false });
    state.tableau[0] = [card("A", "clubs")];
    expect(evaluateEnd(state)).toEqual({ ended: false, won: false });
  });
});

describe("Crossword", () => {
  const {
    SIZE,
    CELLS,
    CENTRE,
    canPlace,
    lineIsEven,
    placeCard,
    numberRunIsEvenAt,
    numberCellParityColor,
  } = crosswordRules;
  const empty = () => Array<PlayingCard | null>(CELLS).fill(null);

  test("odd number runs are tinted even when incomplete", () => {
    const grid = empty();
    grid[0] = card("3", "clubs");
    grid[1] = card("4", "clubs");
    grid[2] = card("5", "clubs");
    grid[3] = card("K", "clubs");

    expect(numberRunIsEvenAt(grid, 0, "row")).toBe(true);
    expect(numberRunIsEvenAt(grid, 0, "col")).toBe(false);
    expect(numberCellParityColor(grid, 0)).toBe("orange");
    expect(numberCellParityColor(grid, 1)).toBeUndefined();
    expect(numberCellParityColor(grid, 2)).toBe("orange");

    grid[CENTRE] = card("3", "clubs");
    expect(numberRunIsEvenAt(grid, CENTRE, "row")).toBe(false);
    expect(numberRunIsEvenAt(grid, CENTRE, "col")).toBe(false);
    expect(numberCellParityColor(grid, CENTRE)).toBe("red");

    grid[CENTRE] = card("2", "clubs");
    expect(numberRunIsEvenAt(grid, CENTRE, "row")).toBe(true);
    expect(numberRunIsEvenAt(grid, CENTRE, "col")).toBe(true);
    expect(numberCellParityColor(grid, CENTRE)).toBeUndefined();

    grid[CENTRE - 1] = card("K", "clubs");
    grid[CENTRE + 1] = card("Q", "hearts");
    grid[CENTRE - SIZE] = card("J", "spades");
    grid[CENTRE + SIZE] = card("K", "diamonds");
    expect(numberCellParityColor(grid, CENTRE)).toBe("green");
  });

  test("only complete runs between court cards must be even", () => {
    const grid = empty();
    const row = Array.from({ length: SIZE }, (_, i) => i);
    grid[0] = card("3", "clubs");
    grid[1] = card("K", "clubs");
    // 3 alone against the edge and a court card is an odd, complete run.
    expect(lineIsEven(grid, row)).toBe(false);
    grid[0] = card("4", "clubs");
    expect(lineIsEven(grid, row)).toBe(true);
    // The run after the King has gaps, so it isn't checked yet.
    grid[2] = card("5", "clubs");
    expect(lineIsEven(grid, row)).toBe(true);
  });

  test("completing an odd-sum run loses immediately", () => {
    const state = crosswordRules.createInitialState();
    state.grid = empty();
    state.grid[0] = card("3", "clubs");
    state.grid[1] = card("4", "clubs");
    state.grid[3] = card("K", "clubs");
    state.hand = [card("2", "hearts")];
    state.stock = [card("5", "spades")];

    expect(canPlace(state.grid, 2, state.hand[0])).toBe(true);
    expect(placeCard(state, 0, 2)).toBe(true);
    expect(state.ended).toBe(true);
    expect(state.won).toBe(false);
    expect(state.lossReason).toBe("oddRun");
    expect(state.hand).toHaveLength(0);
    expect(state.stock).toHaveLength(1);
    expect(crosswordRules.placedCount(state.grid)).toBe(4);
  });

  test("cards go next to a card already down, and courts never touch side by side", () => {
    const grid = empty();
    grid[CENTRE] = card("Q", "hearts");
    expect(canPlace(grid, 0, card("2", "clubs"))).toBe(false);
    // Diagonally beside the Queen is fine for a King, side by side is not.
    expect(canPlace(grid, CENTRE - SIZE - 1, card("K", "clubs"))).toBe(true);
    expect(canPlace(grid, CENTRE - 1, card("K", "clubs"))).toBe(false);
  });

  test("the last space offers the last four cards", () => {
    const state = crosswordRules.createInitialState();
    // Fill all but two spaces with Twos (every run stays even).
    state.grid = state.grid.map((cardHere, cell) =>
      cell < CELLS - 2 ? (cardHere ?? card("2", "clubs")) : null,
    );
    state.hand = [card("2", "hearts")];
    state.stock = [
      card("4", "clubs"),
      card("6", "clubs"),
      card("8", "clubs"),
      card("10", "clubs"),
    ];
    expect(placeCard(state, 0, CELLS - 2)).toBe(true);
    expect(state.hand).toHaveLength(4);
    expect(state.stock).toHaveLength(0);
    expect(placeCard(state, 1, CELLS - 1)).toBe(true);
    expect(state.won).toBe(true);
  });

  test("loses when the revealed card has no legal space, before the grid is full", () => {
    const state = crosswordRules.createInitialState();
    state.grid = Array.from({ length: CELLS }, (_, cell) => {
      const row = Math.floor(cell / SIZE);
      const col = cell % SIZE;
      if (row === 0 && [1, 3, 5].includes(col)) return null;
      if (row === 0 && col % 2 === 0) return card("K", "clubs");
      if ([0, 2, 4].includes(row) && col === 0) return card("Q", "hearts");
      return card("2", "diamonds");
    });
    state.hand = [card("2", "clubs")];
    state.stock = [card("J", "spades")];

    expect(placeCard(state, 0, 1)).toBe(true);
    expect(state.ended).toBe(true);
    expect(state.won).toBe(false);
    expect(crosswordRules.placedCount(state.grid)).toBeLessThan(CELLS);
  });
});

describe("Ozanam's Square", () => {
  const { CELLS, createPuzzle, isUnique, conflictCells, isSolved, moveCard } =
    ozanamsSquareRules;

  test.each(["easy", "difficult"] as const)(
    "%s deals have exactly one solution",
    (difficulty) => {
      for (let i = 0; i < 10; i++) {
        const { puzzle, solution } = createPuzzle(difficulty);
        expect(isUnique(puzzle)).toBe(true);
        const givens = puzzle.filter(Boolean).length;
        if (difficulty === "easy") {
          expect(givens).toBe(ozanamsSquareRules.EASY_GIVENS);
        }
        const solved = solution.map((key, cell) =>
          key ? card(key.rank, key.suit) : null,
        );
        expect(isSolved(solved)).toBe(true);
      }
    },
  );

  test("repeated ranks or suits in a line are conflicts", () => {
    const grid = Array<PlayingCard | null>(CELLS).fill(null);
    grid[0] = card("A", "hearts");
    grid[3] = card("A", "spades");
    grid[5] = card("K", "clubs");
    expect([...conflictCells(grid)].sort()).toEqual([0, 3]);
  });

  test("placing on a filled space sends its card back to the tray", () => {
    const state = ozanamsSquareRules.createInitialState("easy");
    const empties = state.grid.flatMap((c, i) => (c ? [] : [i]));
    const suit = state.tray.findIndex((pile) => pile.length >= 2);
    const trayBefore = state.tray.flat().length;
    moveCard(
      state,
      { zone: "tray", suit, index: 0 },
      { zone: "cell", cell: empties[0] },
    );
    moveCard(
      state,
      { zone: "tray", suit, index: 0 },
      { zone: "cell", cell: empties[0] },
    );
    expect(state.tray.flat()).toHaveLength(trayBefore - 1);
    expect(
      moveCard(state, { zone: "cell", cell: empties[0] }, { zone: "tray" }),
    ).toBe(true);
    expect(state.tray.flat()).toHaveLength(trayBefore);
    const given = state.given.indexOf(true);
    expect(
      moveCard(state, { zone: "cell", cell: given }, { zone: "tray" }),
    ).toBe(false);
  });
});

describe("Iris Garden", () => {
  const { COLS, CELLS, findPath, clearingOrder, dealGrid, availableMatches } =
    irisGardenRules;

  test("paths take at most two turns through empty spaces", () => {
    const grid: (number | null)[] = Array(CELLS).fill(1);
    // Side by side.
    expect(findPath(grid, 0, 1)).not.toBeNull();
    // Walled in: the corner cell can't reach the far corner.
    expect(findPath(grid, 0, CELLS - 1)).toBeNull();
    // Clear the top row: the corners of the top row join in a line.
    for (let x = 1; x < COLS - 1; x++) grid[x] = null;
    expect(findPath(grid, 0, COLS - 1)).toHaveLength(2);
    // Down the second column, then across the top: one turn.
    grid[COLS + 1] = null;
    expect(findPath(grid, 2 * COLS + 1, COLS - 1)).toHaveLength(3);
  });

  test("the clearing order always has a path for the next pair", () => {
    for (let i = 0; i < 10; i++) {
      const order = clearingOrder()!;
      const grid: (true | null)[] = Array(CELLS).fill(true);
      for (const [a, b] of order) {
        expect(findPath(grid, a, b)).not.toBeNull();
        grid[a] = null;
        grid[b] = null;
      }
    }
  });

  test("deals use four cards of each rank and open with at least two pairs", () => {
    for (let i = 0; i < 10; i++) {
      const grid = dealGrid();
      const counts = new Map<CardRank, number>();
      grid.forEach(
        (c) => c && counts.set(c.rank, (counts.get(c.rank) ?? 0) + 1),
      );
      expect([...counts.values()].every((n) => n === 4)).toBe(true);
      expect(availableMatches(grid).length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe("Augury", () => {
  const { playCard, declareNone, TARGET } = auguryRules;
  const deck = createDeck({ faceUp: true });

  test("every law lets some card follow any path", () => {
    for (const law of LAWS) {
      for (const before of deck) {
        for (const lastCard of deck) {
          const fits = deck.some((next) => law.test([before, lastCard], next));
          expect(fits).toBe(true);
        }
      }
    }
  });

  function stateWith(hand: PlayingCard[]) {
    const state = auguryRules.createInitialState("easy");
    state.lawId = "alternateColours";
    state.path = [{ card: card("5", "hearts"), rejected: [] }];
    state.hand = hand;
    state.deck = [card("2", "spades"), card("3", "spades")];
    return state;
  }

  test("a fitting card joins the path; one that breaks the law is turned away", () => {
    const state = stateWith([card("7", "clubs"), card("8", "spades")]);
    playCard(state, 0);
    expect(state.path).toHaveLength(2);
    expect(state.streak).toBe(1);
    playCard(state, 0);
    expect(state.path).toHaveLength(2);
    expect(state.path[1].rejected).toHaveLength(1);
    expect(state.streak).toBe(0);
  });

  test("declaring none fit is right only when nothing in hand fits", () => {
    const wrong = stateWith([card("7", "clubs"), card("8", "diamonds")]);
    const fitting = wrong.hand[0].id;
    declareNone(wrong);
    expect(wrong.verdict).toBe("noneWrong");
    expect(wrong.missedId).toBe(fitting);
    expect(wrong.path[wrong.path.length - 1].card.id).toBe(wrong.missedId);
    expect(wrong.hand).toHaveLength(3);

    const right = stateWith([card("8", "diamonds"), card("9", "hearts")]);
    right.streak = TARGET - 1;
    declareNone(right);
    expect(right.verdict).toBe("noneRight");
    expect(right.won).toBe(true);
  });
});
