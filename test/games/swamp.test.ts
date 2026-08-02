import { type PlayingCard } from "@/components/Cards/card-utils";
import { swampRules, type SwampGameState } from "@/components/Games/Swamp";

function card(
  suit: PlayingCard["suit"],
  faceUp = true,
  id: string = `${suit}-${faceUp}`,
): PlayingCard {
  return { id, rank: "7", suit, faceUp };
}

function board(): (PlayingCard | null)[] {
  return Array.from({ length: swampRules.boardCells }, () => null);
}

function state(overrides: Partial<SwampGameState> = {}): SwampGameState {
  return {
    board: board(),
    stock: [],
    discard: [],
    round: 1,
    turn: 1,
    movesMade: 0,
    ended: false,
    won: false,
    winLoseMessage: "",
    ...overrides,
  };
}

describe("Swamp rules", () => {
  test("finds orthogonal neighbors without wrapping board edges", () => {
    expect(swampRules.orthogonalNeighbors(0)).toEqual([4, 1]);
    expect(swampRules.orthogonalNeighbors(3)).toEqual([7, 2]);
    expect(swampRules.orthogonalNeighbors(5)).toEqual([1, 9, 4, 6]);
  });

  test("Gators eat adjacent horizontal Hogs and Ducks only", () => {
    const cards = board();
    cards[5] = card("spades");
    cards[4] = card("hearts");
    cards[6] = card("diamonds", false);
    cards[1] = card("hearts", false);
    cards[9] = card("hearts");

    expect(swampRules.getLegalTargets(cards, 5)).toEqual([4, 6]);
  });

  test("Bears eat adjacent vertical Gators and Ducks only", () => {
    const cards = board();
    cards[5] = card("clubs");
    cards[1] = card("spades");
    cards[9] = card("diamonds", false);
    cards[4] = card("spades");
    cards[6] = card("spades");

    expect(swampRules.getLegalTargets(cards, 5)).toEqual([1, 9]);
  });

  test("Hogs need another adjacent Hog before eating a Bear", () => {
    const cards = board();
    cards[5] = card("hearts", true, "source");
    cards[6] = card("clubs");

    expect(swampRules.getLegalTargets(cards, 5)).toEqual([]);

    cards[1] = card("hearts", true, "support");
    expect(swampRules.getLegalTargets(cards, 5)).toEqual([6]);
  });

  test("detects only horizontal Bear and vertical Gator collapses", () => {
    const bears = board();
    bears[4] = card("clubs", true, "bear-1");
    bears[5] = card("clubs", true, "bear-2");
    bears[6] = card("clubs", true, "bear-3");
    expect(swampRules.getCollapseMessage(bears)).toBe(
      "Three Bears formed a horizontal line.",
    );

    const gators = board();
    gators[1] = card("spades", true, "gator-1");
    gators[5] = card("spades", true, "gator-2");
    gators[9] = card("spades", true, "gator-3");
    expect(swampRules.getCollapseMessage(gators)).toBe(
      "Three Gators formed a vertical line.",
    );

    const verticalBears = board();
    verticalBears[1] = card("clubs", true, "vertical-bear-1");
    verticalBears[5] = card("clubs", true, "vertical-bear-2");
    verticalBears[9] = card("clubs", true, "vertical-bear-3");
    expect(swampRules.getCollapseMessage(verticalBears)).toBeNull();
  });

  test("turns Diamonds and opening three-animal lines into Ducks", () => {
    expect(swampRules.prepareCard(card("diamonds")).faceUp).toBe(false);
    expect(swampRules.prepareCard(card("hearts", false)).faceUp).toBe(true);

    const game = state();
    game.board[0] = card("clubs", true, "bear-1");
    game.board[1] = card("clubs", true, "bear-2");
    game.stock = [card("clubs", false, "bear-3")];

    swampRules.dealOpeningCard(game, 2);

    expect(game.board[2]?.faceUp).toBe(false);
  });

  test("loses when cards remain but no animal can eat", () => {
    const game = state({
      board: Array.from({ length: swampRules.boardCells }, (_, index) =>
        card("diamonds", false, `duck-${index}`),
      ),
      stock: [card("hearts")],
    });

    expect(swampRules.checkForLoss(game)).toBe(true);
    expect(game).toMatchObject({
      ended: true,
      won: false,
      winLoseMessage: "No animal can move and eat.",
    });
  });

  test("wins when the last stock card refills the board", () => {
    const cards = board();
    cards[0] = card("spades");
    const game = state({ board: cards, stock: [card("hearts")] });

    swampRules.refillBoard(game);

    expect(game).toMatchObject({
      ended: true,
      won: true,
      winLoseMessage: "The last card entered the Swamp.",
    });
  });
});
