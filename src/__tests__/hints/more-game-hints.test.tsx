import { describe, expect, test } from "@jest/globals";
import "../../../jest/game-mocks";
import { card } from "../../../jest/game-harness";
import { dominionRules } from "@/components/Games/Dominion";
import { fortunesCallRules } from "@/components/Games/FortunesCall";
import { invadersRules } from "@/components/Games/Invaders";
import { irisGardenRules } from "@/components/Games/IrisGarden";
import { ozanamsSquareRules } from "@/components/Games/OzanamsSquare";
import type { PlayingCard } from "@/components/Cards/card-utils";
import type { Hint } from "@/hints/hint";

// The hint finders of games whose hints play out in game-hints.test.tsx,
// on positions a few deals may never reach.

function targetCard(hint: Hint | null, step: number) {
  const target = hint?.steps[step]?.[0];
  return target && "card" in target ? target.card : undefined;
}

describe("Iris Garden hints", () => {
  test("following the hints clears a deal", () => {
    for (let deal = 0; deal < 3; deal++) {
      const state = irisGardenRules.createInitialState();
      for (let pair = 0; pair < irisGardenRules.CELLS / 2; pair++) {
        const hint = irisGardenRules.findHint(state);
        const ids = hint?.steps.map(
          (step) => (step[0] as { card: string }).card,
        );
        expect(ids).toHaveLength(2);
        const [a, b] = ids!.map((id) =>
          state.grid.findIndex((placed) => placed?.id === id),
        );
        expect(irisGardenRules.canMatch(state.grid, a, b)).toBe(true);
        state.grid[a] = null;
        state.grid[b] = null;
      }
      expect(irisGardenRules.isCleared(state.grid)).toBe(true);
    }
  });
});

describe("Ozanam's Square hints", () => {
  test("a card in the wrong space goes to its own first", () => {
    const state = ozanamsSquareRules.createInitialState("easy");
    const fromTray = ozanamsSquareRules.findHint(state)!;
    const placing = targetCard(fromTray, 0)!;
    const home = Number(
      (fromTray.steps[1][0] as { zone: string }).zone.replace("cell-", ""),
    );
    expect(state.tray.flat().some((placed) => placed.id === placing)).toBe(
      true,
    );

    // Put that card in some other empty space instead.
    const wrong = state.grid.findIndex(
      (placed, cell) => !placed && cell !== home,
    );
    const suit = state.tray.findIndex((pile) =>
      pile.some((placed) => placed.id === placing),
    );
    const index = state.tray[suit].findIndex((placed) => placed.id === placing);
    ozanamsSquareRules.moveCard(
      state,
      { zone: "tray", suit, index },
      { zone: "cell", cell: wrong },
    );
    const hint = ozanamsSquareRules.findHint(state);
    expect(hint?.steps).toEqual([
      [{ card: placing }],
      [{ zone: `cell-${home}` }],
    ]);
  });
});

describe("Fortune's Call hints", () => {
  const state = (anchor: PlayingCard, score = 0, misses = 0) => ({
    deck: [],
    anchor,
    next: card("5", "clubs", false),
    discard: [],
    score,
    misses,
    revealed: false,
    lastCorrect: null,
    ended: false,
    won: false,
  });

  test("calls lower on a King and higher on a two", () => {
    expect(fortunesCallRules.bestPrediction(state(card("K", "hearts")))).toBe(
      "lower",
    );
    expect(fortunesCallRules.bestPrediction(state(card("2", "hearts")))).toBe(
      "higher",
    );
  });

  test("a colour call when a point wins and higher or lower is a gamble", () => {
    expect(
      fortunesCallRules.bestPrediction(state(card("7", "hearts"), 11, 2)),
    ).toMatch(/red|black/);
  });

  test("no call while the card is face up", () => {
    expect(
      fortunesCallRules.bestPrediction({
        ...state(card("7", "hearts")),
        revealed: true,
      }),
    ).toBeNull();
  });
});

describe("Dominion hints", () => {
  const empty = () => Array.from({ length: 15 }, () => [] as PlayingCard[]);
  const game = (board: PlayingCard[][], reserve: PlayingCard[] = []) => ({
    board,
    reserve,
    reserveActive: null,
    discard: [],
    ended: false,
    won: false,
  });

  test("plays to the last card", () => {
    const board = empty();
    const [a, b, c] = [
      card("3", "hearts"),
      card("3", "clubs"),
      card("9", "clubs"),
    ];
    board[0] = [a];
    board[1] = [b];
    board[2] = [c];
    // Taking 3♣ with 3♥ first would strand 9♣.
    const hint = dominionRules.findHint(game(board));
    expect(hint?.steps.flat()).not.toEqual([{ card: a.id }, { card: b.id }]);
  });

  test("still shows a move once every line loses", () => {
    const board = empty();
    board[0] = [card("8", "diamonds")];
    board[4] = [card("3", "diamonds")];
    board[5] = [card("Q", "clubs")];
    board[11] = [card("7", "clubs")];
    expect(dominionRules.findHint(game(board))?.message.key).toBe("moveCard");
  });

  test("draws the reserve once a space is open and the board is small", () => {
    const board = empty();
    board[0] = [card("3", "hearts")];
    board[1] = [card("3", "clubs")];
    const reserve = [card("5", "spades", false)];
    expect(dominionRules.findHint(game(board, reserve))).toEqual({
      message: { key: "draw" },
      steps: [[{ card: reserve[0].id }]],
    });
  });

  test("a drawn reserve card goes to a space, lit alone", () => {
    const board = empty();
    board[0] = [card("3", "hearts")];
    board[14] = [card("3", "clubs")];
    for (const cell of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) {
      board[cell] = [card("A", "spades")];
    }
    board[6] = [];
    const state = {
      ...game(board),
      reserveActive: card("9", "hearts"),
    };
    // The drawn card takes no tap: the hint lights its space alone.
    expect(dominionRules.findHint(state)?.steps).toEqual([
      [{ zone: "board-6" }],
    ]);
  });
});

describe("Invaders hints", () => {
  const game = (
    attacker: PlayingCard,
    defenders: PlayingCard[],
    wave: 1 | 2 = 1,
  ) => ({
    defenderDeck: [],
    currentDefenders: defenders,
    attackerDeck: [],
    discardDeck: [],
    currentAttackers: [attacker],
    wave,
    ended: false,
    won: false,
    winLoseMessage: "",
  });

  test("a dual attack that costs nothing comes first", () => {
    const action = invadersRules.bestAction(
      game(card("9", "hearts"), [
        card("4", "clubs"),
        card("10", "spades"),
        card("5", "clubs"),
      ]),
    );
    expect(action).toEqual({ kind: "dual", defenders: [0, 2], cost: 0 });
  });

  test("else the weakest defender that beats the attacker", () => {
    const action = invadersRules.bestAction(
      game(card("6", "hearts"), [
        card("K", "clubs"),
        card("8", "spades"),
        card("2", "clubs"),
      ]),
    );
    expect(action?.kind).toBe("single");
    expect(action?.defenders).toEqual([1]);
  });

  test("in the second wave, a swap before a dual attack that loses a defender", () => {
    const action = invadersRules.bestAction(
      game(
        card("9", "hearts"),
        [card("4", "hearts"), card("5", "clubs"), card("10", "spades")],
        2,
      ),
    );
    expect(action?.kind).toBe("single");
  });

  test("a sacrifice gives up the weakest defender", () => {
    const action = invadersRules.bestAction(
      game(card("K", "hearts"), [card("Q", "clubs"), card("2", "spades")]),
    );
    expect(action).toMatchObject({ kind: "sacrifice", defenders: [1] });
  });
});
