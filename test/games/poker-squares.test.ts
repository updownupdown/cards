import { type PlayingCard } from "@/components/Cards/card-utils";
import {
  type PokerSquaresGameState,
  pokerSquaresRules,
} from "@/components/Games/PokerSquares";

function card(
  rank: PlayingCard["rank"],
  suit: PlayingCard["suit"] = "spades",
  id: string = `${rank}-${suit}`,
  faceUp = true,
): PlayingCard {
  return { id, rank, suit, faceUp };
}

function state(
  overrides: Partial<PokerSquaresGameState> = {},
): PokerSquaresGameState {
  return {
    deck: [],
    grid: Array.from({ length: 25 }, () => null),
    score: 0,
    ended: false,
    won: false,
    ...overrides,
  };
}

describe("Poker Squares rules", () => {
  test.each([
    [9, [card("A"), card("K"), card("Q"), card("J"), card("10")]],
    [8, [card("9"), card("8"), card("7"), card("6"), card("5")]],
    [
      7,
      [
        card("7", "spades"),
        card("7", "hearts"),
        card("7", "clubs"),
        card("7", "diamonds"),
        card("2"),
      ],
    ],
    [
      6,
      [
        card("Q", "spades"),
        card("Q", "hearts"),
        card("Q", "clubs"),
        card("4", "spades"),
        card("4", "hearts"),
      ],
    ],
    [5, [card("A"), card("J"), card("8"), card("5"), card("2")]],
    [
      4,
      [
        card("A", "spades"),
        card("5", "hearts"),
        card("4", "clubs"),
        card("3", "diamonds"),
        card("2", "spades"),
      ],
    ],
    [
      3,
      [
        card("9", "spades"),
        card("9", "hearts"),
        card("9", "clubs"),
        card("5"),
        card("2"),
      ],
    ],
    [
      2,
      [
        card("9", "spades"),
        card("9", "hearts"),
        card("5", "clubs"),
        card("5", "diamonds"),
        card("2"),
      ],
    ],
    [
      1,
      [
        card("9", "spades"),
        card("9", "hearts"),
        card("6", "clubs"),
        card("4", "diamonds"),
        card("2"),
      ],
    ],
    [
      0,
      [
        card("A", "spades"),
        card("J", "hearts"),
        card("8", "clubs"),
        card("5", "diamonds"),
        card("2", "spades"),
      ],
    ],
  ] as const)("classifies category %s", (category, hand) => {
    expect(pokerSquaresRules.handCategory([...hand])).toBe(category);
  });

  test("does not score incomplete rows or columns as poker hands", () => {
    const grid = Array.from<PlayingCard | null>({ length: 25 }).fill(null);
    grid.splice(0, 5, card("A"), card("K"), card("Q"), card("J"), card("10"));

    expect(pokerSquaresRules.handCategory([])).toBe(0);
    expect(pokerSquaresRules.handCategory([card("2")])).toBe(0);
    expect(pokerSquaresRules.scoreGrid(grid)).toBe(100);
  });

  test("reveals only the top card of the deck", () => {
    const deck = [
      card("2", "clubs", "bottom", false),
      card("3", "clubs", "top", false),
    ];

    pokerSquaresRules.revealDeckTop(deck);

    expect(deck[0].faceUp).toBe(false);
    expect(deck[1].faceUp).toBe(true);
  });

  test("places the deck top once and rejects occupied cells", () => {
    const game = state({ deck: [card("4", "clubs", "dealt", false)] });

    expect(pokerSquaresRules.placeCard(game, 12)).toBe(true);
    expect(game.grid[12]?.id).toBe("dealt");
    expect(game.grid[12]?.faceUp).toBe(true);
    expect(pokerSquaresRules.placeCard(game, 12)).toBe(false);
  });

  test("scores and ends the game after the 25th placement", () => {
    const grid = Array.from({ length: 25 }, (_, index): PlayingCard | null =>
      index === 24 ? null : card("2", "clubs", `grid-${index}`),
    );
    const game = state({
      deck: [card("2", "clubs", "final", false)],
      grid,
    });

    pokerSquaresRules.placeCard(game, 24);

    expect(game.ended).toBe(true);
    expect(game.score).toBe(pokerSquaresRules.scoreGrid(game.grid));
    expect(game.won).toBe(game.score >= pokerSquaresRules.targetScore);
  });
});
