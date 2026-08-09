import { type SolunaGameState, solunaRules } from "@/components/Games/Soluna";
import type {
  CardRank,
  CardSuit,
  PlayingCard,
} from "@/components/Cards/card-utils";

function card(
  rank: CardRank,
  suit: CardSuit = "spades",
  faceUp = false,
  id = `${rank}-${suit}-${faceUp ? "up" : "down"}`,
): PlayingCard {
  return { id, rank, suit, faceUp };
}

function state(overrides: Partial<SolunaGameState> = {}): SolunaGameState {
  return {
    stock: [card("A")],
    table: [],
    board: Array.from({ length: 8 }, () => []),
    discard: [],
    pendingFreed: [],
    pendingHardChoice: [],
    ended: false,
    won: false,
    winLoseMessage: "",
    ...overrides,
  };
}

describe("Soluna rules", () => {
  test("builds the 24-card A-through-6 deck face down", () => {
    const deck = solunaRules.createSolunaDeck();

    expect(deck).toHaveLength(24);
    expect(new Set(deck.map((entry) => entry.rank))).toEqual(
      new Set(["A", "2", "3", "4", "5", "6"]),
    );
    expect(deck.every((entry) => !entry.faceUp)).toBe(true);
  });

  test.each([
    [0, card("2", "hearts"), true],
    [0, card("2", "clubs"), false],
    [1, card("3", "diamonds"), true],
    [1, card("4", "spades"), true],
    [1, card("3", "clubs"), false],
    [2, card("6", "clubs"), true],
    [2, card("5", "clubs"), false],
    [3, card("A", "diamonds"), true],
    [3, card("A", "spades"), false],
    [4, card("A", "clubs"), true],
    [4, card("A", "hearts"), false],
    [5, card("5", "hearts"), true],
    [5, card("4", "hearts"), false],
    [6, card("3", "spades"), true],
    [6, card("4", "hearts"), true],
    [6, card("3", "hearts"), false],
    [7, card("2", "spades"), true],
    [7, card("2", "diamonds"), false],
  ])("evaluates prediction %i", (index, drawn, expected) => {
    expect(solunaRules.cardMatchesPrediction(drawn, index)).toBe(expected);
  });

  test("a miss reveals one card and places the next as a stone", () => {
    const game = state({
      stock: [
        card("2", "clubs", false, "stone"),
        card("2", "clubs", false, "miss"),
      ],
    });

    solunaRules.playPrediction(game, 0, "normal");

    expect(game.table).toEqual([
      expect.objectContaining({ id: "miss", faceUp: true }),
    ]);
    expect(game.board[0]).toEqual([
      expect.objectContaining({ id: "stone", faceUp: false }),
    ]);
    expect(game.ended).toBe(true);
    expect(game.won).toBe(false);
  });

  test("a failed replay stops counting until its exposed stone is removed", () => {
    const previousSuccess = card("2", "hearts", true, "success");
    const game = state({
      stock: [
        card("3", "clubs", false, "stone"),
        card("2", "clubs", false, "miss"),
      ],
      board: [[previousSuccess], [], [], [], [], [], [], []],
    });

    solunaRules.playPrediction(game, 0, "normal");

    expect(solunaRules.isCompleted(game.board[0])).toBe(false);
    expect(solunaRules.stoneCount(game.board[0])).toBe(1);
    expect(game.board[0][0]).toBe(previousSuccess);
  });

  test("normal frees exposed orthogonal stones but not diagonals", () => {
    const board = Array.from({ length: 8 }, () => [] as PlayingCard[]);
    board[1] = [card("2", "clubs", false, "right")];
    board[4] = [card("3", "clubs", false, "below")];
    board[5] = [card("4", "clubs", false, "diagonal")];
    const game = state({
      stock: [card("2", "hearts", false, "match")],
      board,
    });

    solunaRules.playPrediction(game, 0, "normal");

    expect(game.pendingFreed.map((entry) => entry.id).sort()).toEqual([
      "below",
      "right",
    ]);
    expect(game.board[5]).toHaveLength(1);
    expect(game.ended).toBe(false);
  });

  test("easy also frees exposed diagonal stones", () => {
    const board = Array.from({ length: 8 }, () => [] as PlayingCard[]);
    board[5] = [card("4", "clubs", false, "diagonal")];
    const game = state({
      stock: [card("2", "hearts", false, "match")],
      board,
    });

    solunaRules.playPrediction(game, 0, "easy");

    expect(game.pendingFreed).toEqual([
      expect.objectContaining({ id: "diagonal" }),
    ]);
    expect(game.board[5]).toHaveLength(0);
  });

  test("hard asks the player to choose one orthogonal exposed stone", () => {
    const board = Array.from({ length: 8 }, () => [] as PlayingCard[]);
    board[1] = [card("2", "clubs", false, "right")];
    board[4] = [card("3", "clubs", false, "below")];
    board[5] = [card("4", "clubs", false, "diagonal")];
    const game = state({
      stock: [card("2", "hearts", false, "match")],
      board,
    });

    solunaRules.playPrediction(game, 0, "hard");

    expect(game.pendingHardChoice).toEqual([1, 4]);
    expect(game.pendingFreed).toHaveLength(0);
    expect(game.board[1]).toHaveLength(1);
  });

  test("stones covered by a success are trapped", () => {
    const board = Array.from({ length: 8 }, () => [] as PlayingCard[]);
    board[1] = [
      card("2", "clubs", false, "trapped"),
      card("4", "hearts", true, "cover"),
    ];
    const game = state({
      stock: [card("2", "hearts", false, "match")],
      board,
    });

    solunaRules.playPrediction(game, 0, "normal");

    expect(game.pendingFreed).toHaveLength(0);
    expect(game.board[1].map((entry) => entry.id)).toEqual([
      "trapped",
      "cover",
    ]);
  });

  test("three stones block a prediction", () => {
    const pile = [
      card("2", "clubs", false, "one"),
      card("3", "clubs", false, "two"),
      card("4", "clubs", false, "three"),
    ];
    const game = state({ board: [pile, [], [], [], [], [], [], []] });

    solunaRules.playPrediction(game, 0, "normal");

    expect(solunaRules.isBlocked(pile)).toBe(true);
    expect(game.stock).toHaveLength(1);
  });

  test("wins when all eight prediction tops are successful cards", () => {
    const game = state({
      board: Array.from({ length: 8 }, (_, index) => [
        card("2", "hearts", true, `success-${index}`),
      ]),
    });

    solunaRules.updateOutcome(game);

    expect(game.ended).toBe(true);
    expect(game.won).toBe(true);
  });

  test("does not lose on an empty deck while freed stones await disposition", () => {
    const game = state({
      stock: [],
      pendingFreed: [card("2", "clubs", false, "freed")],
    });

    solunaRules.updateOutcome(game);

    expect(game.ended).toBe(false);
  });

  test("returns freed stones face down under the deck", () => {
    const game = state({
      stock: [card("A", "spades", false, "top")],
      pendingFreed: [card("2", "clubs", false, "freed")],
    });

    solunaRules.disposeFreed(game, true);

    expect(game.stock.map((entry) => entry.id)).toEqual(["freed", "top"]);
    expect(game.stock.every((entry) => !entry.faceUp)).toBe(true);
    expect(game.pendingFreed).toHaveLength(0);
  });

  test("reset gathers every card face down, pauses, then deals the stock", async () => {
    jest.useFakeTimers();
    const deck = solunaRules.createSolunaDeck();
    let game = state({
      stock: deck.slice(0, 4),
      table: deck.slice(4, 8).map((entry) => ({ ...entry, faceUp: true })),
      board: [deck.slice(8, 12), [], [], [], [], [], [], []],
      discard: deck.slice(12, 20),
      pendingFreed: deck.slice(20),
    });
    const originalIds = new Set(deck.map((entry) => entry.id));
    const setGame = (updater: (draft: SolunaGameState) => void) => {
      const next = structuredClone(game);
      updater(next);
      game = next;
    };

    const resetting = solunaRules.resetSoluna(setGame);

    expect(game.discard).toHaveLength(24);
    expect(game.discard.every((entry) => !entry.faceUp)).toBe(true);
    expect(game.stock).toHaveLength(0);
    expect(game.board.every((pile) => pile.length === 0)).toBe(true);

    jest.runAllTimers();
    await resetting;

    expect(game.discard).toHaveLength(0);
    expect(game.stock).toHaveLength(24);
    expect(new Set(game.stock.map((entry) => entry.id))).toEqual(originalIds);
    jest.useRealTimers();
  });
});
