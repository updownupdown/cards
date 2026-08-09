import { createDeck, type PlayingCard } from "@/components/Cards/card-utils";
import { cribbageSquaresRules } from "@/components/Games/CribbageSquares";

function card(
  rank: PlayingCard["rank"],
  suit: PlayingCard["suit"] = "spades",
  id: string = `${rank}-${suit}`,
): PlayingCard {
  return { id, rank, suit, faceUp: true };
}

describe("Cribbage Squares rules", () => {
  test("scores the canonical 29 hand", () => {
    const line = [
      card("5", "hearts"),
      card("5", "diamonds"),
      card("5", "clubs"),
      card("J", "spades"),
    ];

    expect(cribbageSquaresRules.scoreHand(line, card("5", "spades"))).toBe(29);
  });

  test("scores duplicate runs by their multiplicity", () => {
    expect(
      cribbageSquaresRules.countRuns([
        card("3"),
        card("3", "hearts"),
        card("4"),
        card("5"),
        card("5", "hearts"),
      ]),
    ).toBe(12);
  });

  test("adds two points when the starter is a Jack", () => {
    const ranks: PlayingCard["rank"][] = [
      "2",
      "4",
      "6",
      "8",
      "10",
      "Q",
      "A",
      "3",
      "5",
      "7",
      "9",
      "K",
      "2",
      "4",
      "6",
      "8",
    ];
    const suits: PlayingCard["suit"][] = [
      "spades",
      "hearts",
      "clubs",
      "diamonds",
    ];
    const grid = ranks.map((rank, index) =>
      card(rank, suits[index % suits.length], `grid-${index}`),
    );
    const starter = card("J", "diamonds", "starter-j");
    const lineScores = cribbageSquaresRules.getLineScores(grid, starter);
    const lineTotal = [...lineScores.rows, ...lineScores.columns].reduce(
      (sum, score) => sum + score,
      0,
    );

    expect(cribbageSquaresRules.scoreDeal(grid, starter)).toBe(lineTotal + 2);
  });

  test("allows the first card anywhere", () => {
    expect(
      cribbageSquaresRules.getLegalCells(
        Array.from({ length: 16 }, () => null),
      ),
    ).toEqual(Array.from({ length: 16 }, (_, index) => index));
  });

  test("limits later cards to adjacent cells without wrapping rows", () => {
    const grid: (PlayingCard | null)[] = Array.from({ length: 16 }, () => null);
    grid[3] = card("A");

    expect(cribbageSquaresRules.getLegalCells(grid)).toEqual([2, 6, 7]);
  });

  test("gathers every card face down when the game has used only a subset", () => {
    const deck = createDeck();
    const gathered = cribbageSquaresRules.gatherCards({
      grid: [deck[0], ...Array.from({ length: 15 }, () => null)],
      stock: [deck[1]],
      current: deck[2],
      starter: deck[3],
      score: 0,
      scoresReady: false,
      isTransitioning: false,
      ended: false,
      won: false,
    });

    expect(gathered).toHaveLength(52);
    expect(gathered.every((playingCard) => !playingCard.faceUp)).toBe(true);
    expect(new Set(gathered.map((playingCard) => playingCard.id)).size).toBe(
      52,
    );
  });
});
