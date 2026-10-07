import { describe, expect, test } from "@jest/globals";
import "../../../jest/game-mocks";
import { card } from "../../../jest/game-harness";
import { cabinSiegeRules } from "@/components/Games/CabinSiege";
import { cafeQueueRules } from "@/components/Games/CafeQueue";
import { dominionRules } from "@/components/Games/Dominion";
import { fortunesCallRules } from "@/components/Games/FortunesCall";
import { gremlinRules } from "@/components/Games/Gremlin";
import { invadersRules } from "@/components/Games/Invaders";
import { irisGardenRules } from "@/components/Games/IrisGarden";
import { ouroborosRules } from "@/components/Games/Ouroboros";
import { ozanamsSquareRules } from "@/components/Games/OzanamsSquare";
import { pocketPokerRules } from "@/components/Games/PocketPoker";
import { pokerSquaresRules } from "@/components/Games/PokerSquares";
import { rogueRunRules } from "@/components/Games/RogueRun";
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

// —— The second batch ——

describe("Cabin Siege hints", () => {
  test("kills a zombie it can (no note when it is the only one)", () => {
    const piles = Array.from({ length: 9 }, () => [card("2", "clubs")]);
    piles[4] = [card("5", "hearts")];
    piles[7] = [card("6", "hearts")];
    const zombie = card("J", "spades");
    const hint = cabinSiegeRules.findHint({
      draw: [card("3", "clubs")],
      piles,
      zombies: Array.from({ length: 12 }, (_, index) => ({
        id: `z-${index}`,
        card: index === 1 ? zombie : card("K", "hearts", false),
        dead: false,
      })),
      phase: "kill",
      lastPlayedPile: 1,
      ended: false,
      won: false,
    });
    expect(hint?.steps).toEqual([[{ card: zombie.id }]]);
    expect(hint?.message.note).toBeUndefined();
  });
});

describe("Pocket Poker hints", () => {
  const keep = (hand: PlayingCard[]) =>
    pocketPokerRules
      .cardsToKeep(hand)
      ?.keep.map((c) => c.id)
      .sort();

  test("keeps a pair, four to a flush, and stands on a straight", () => {
    const pair = [card("A", "spades"), card("A", "hearts")];
    expect(
      keep([
        ...pair,
        card("7", "clubs"),
        card("4", "diamonds"),
        card("2", "spades"),
      ]),
    ).toEqual(pair.map((c) => c.id).sort());

    const hearts = ["2", "6", "9", "J"].map((rank) =>
      card(rank as PlayingCard["rank"], "hearts"),
    );
    expect(keep([...hearts, card("K", "clubs")])).toEqual(
      hearts.map((c) => c.id).sort(),
    );

    expect(
      pocketPokerRules.cardsToKeep([
        card("5", "spades"),
        card("6", "hearts"),
        card("7", "clubs"),
        card("8", "diamonds"),
        card("9", "spades"),
      ]),
    ).toBeNull();
  });
});

describe("Café Queue hints", () => {
  test("turns customers away rather than lose a rank's fourth card", () => {
    const counts = cafeQueueRules.createDiscardCount();
    counts["7"] = 3;
    const decision = cafeQueueRules.bestDecision({
      deck: [card("4", "clubs", false), card("2", "spades")],
      queues: [[card("7", "hearts")], [], [], []],
      discard: [],
      discardsByRank: counts,
      decisionNeeded: true,
      selectedPos: { queueIndex: 0, cardIndex: 0 },
      ended: false,
      won: false,
    });
    expect(decision).toBe("kick");
  });
});

describe("Gremlin hints", () => {
  test("starts a column with a King", () => {
    const king = card("K", "hearts");
    const hint = gremlinRules.findHint({
      hand: [card("4", "clubs"), king],
      columns: Array.from({ length: 12 }, () => null),
      deck: [card("9", "spades", false)],
      discard: [],
      currentHelperCard: null,
      awaitingHelperPlacement: false,
      selectedHandCardId: null,
      playerTurnEnded: false,
      ended: false,
      won: false,
    });
    expect(hint?.steps[0]).toEqual([{ card: king.id }]);
    expect(hint?.message.note).toBe("Start a column with this King");
  });
});

describe("Poker Squares hints", () => {
  test("pairs a card up with one of its rank", () => {
    const grid = Array<PlayingCard | null>(25).fill(null);
    grid[12] = card("K", "spades");
    const placement = pokerSquaresRules.bestPlacement({
      deck: [card("K", "hearts")],
      grid,
      score: 0,
      scoresReady: false,
      isTransitioning: false,
      ended: false,
      won: false,
    });
    // In the King's row or column.
    expect(
      Math.floor(placement!.cell / 5) === 2 || placement!.cell % 5 === 2,
    ).toBe(true);
    expect(placement?.aim).toBe("sets");
  });
});

describe("Rogue Run hints", () => {
  test("runs from a room that would kill", () => {
    const hint = rogueRunRules.findHint({
      draw: Array.from({ length: 8 }, () => card("2", "hearts", false)),
      discard: [],
      roomCards: [
        card("A", "spades"),
        card("K", "clubs"),
        card("Q", "spades"),
        card("J", "clubs"),
      ],
      roomNum: 2,
      weaponCard: null,
      weaponUsedOn: [],
      health: 5,
      lastRoomNumRanFrom: null,
      isRunning: false,
      roomsSkipped: 0,
      ended: false,
      won: false,
    });
    expect(hint?.message.values?.label).toBe("Run");
    expect(hint?.message.note).toBe("Run: this room would kill you");
  });
});

describe("Ouroboros hints", () => {
  test("explores to a jewel, never onto a trap", () => {
    const loop = (rank: string, faceUp = false) =>
      ({ ...card(rank as PlayingCard["rank"], "clubs"), faceUp }) as never;
    // From the top: a 3 and a 2 on view; 3 ahead lies a trap, 2 a jewel.
    const deck = [
      loop("3", true),
      loop("2", true),
      loop("A", true),
      loop("K", true),
      ...Array.from({ length: 10 }, () => loop("7")),
    ];
    const { first } = ouroborosRules.bestLoopLine(
      {
        deck,
        deckPos: 0,
        // A path in hand: no dead end to fear after the jewel.
        paths: [loop("4", true), null, null],
        acesPile: [],
        trinketsPile: [],
        ended: false,
        won: false,
      },
      2,
    );
    expect(first).toEqual({ type: "explore", index: 1 });
  });
});
