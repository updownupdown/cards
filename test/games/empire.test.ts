import { type PlayingCard } from "@/components/Cards/card-utils";
import { empireRules } from "@/components/Games/Empire";

jest.mock("@/components/common/GameWrapper", () => ({
  GameWrapper: () => null,
}));

function card(
  id: string,
  rank: PlayingCard["rank"] = "7",
  suit: PlayingCard["suit"] = "spades",
): PlayingCard {
  return { id, rank, suit, faceUp: true };
}

function board(entries: [number, PlayingCard][]) {
  const result: PlayingCard[][] = Array.from({ length: 15 }, () => []);
  entries.forEach(([index, entry]) => {
    result[index] = [entry];
  });
  return result;
}

describe("Empire rules", () => {
  test("keeps both complete empires and leaves the conquerer on top", () => {
    const board: PlayingCard[][] = Array.from({ length: 15 }, () => []);
    board[0] = [card("source-subject"), card("conquerer")];
    board[1] = [card("target-subject"), card("conquered")];

    empireRules.conquerPile(board, 0, 1);

    expect(board[0]).toEqual([]);
    expect(board[1].map(({ id }) => id)).toEqual([
      "target-subject",
      "conquered",
      "source-subject",
      "conquerer",
    ]);
    expect(empireRules.topCard(board[1])?.id).toBe("conquerer");
  });

  test("collects only existing card identities for the next setup", () => {
    const board: PlayingCard[][] = Array.from({ length: 15 }, () => []);
    board[0] = [card("under"), card("top")];

    const cards = empireRules.collectCards({
      board,
      stock: [card("stock")],
      reserve: card("reserve"),
      discard: [card("discard")],
      ended: false,
      won: false,
    });

    expect(cards.map(({ id }) => id)).toEqual([
      "under",
      "top",
      "stock",
      "reserve",
      "discard",
    ]);
  });

  test("allows adjacent conquest by matching rank or suit", () => {
    expect(
      empireRules.canConquer(
        board([
          [0, card("source", "7", "clubs")],
          [6, card("target", "7", "hearts")],
        ]),
        0,
        6,
      ),
    ).toBe(true);
    expect(
      empireRules.canConquer(
        board([
          [0, card("source", "7", "clubs")],
          [1, card("target", "K", "clubs")],
        ]),
        0,
        1,
      ),
    ).toBe(true);
  });

  test("requires both occupied piles and a matching top card", () => {
    const gameBoard = board([
      [0, card("source", "7", "clubs")],
      [1, card("target", "8", "hearts")],
    ]);

    expect(empireRules.canConquer(gameBoard, 0, 0)).toBe(false);
    expect(empireRules.canConquer(gameBoard, 0, 2)).toBe(false);
    expect(empireRules.canConquer(gameBoard, 2, 1)).toBe(false);
    expect(empireRules.canConquer(gameBoard, 0, 1)).toBe(false);
  });

  test("allows clear row and column jumps but rejects blockers", () => {
    const clearRow = board([
      [0, card("row-source", "7", "clubs")],
      [4, card("row-target", "7", "hearts")],
    ]);
    expect(empireRules.canConquer(clearRow, 0, 4)).toBe(true);
    clearRow[2] = [card("row-blocker")];
    expect(empireRules.canConquer(clearRow, 0, 4)).toBe(false);

    const clearColumn = board([
      [0, card("column-source", "7", "clubs")],
      [10, card("column-target", "K", "clubs")],
    ]);
    expect(empireRules.canConquer(clearColumn, 0, 10)).toBe(true);
    clearColumn[5] = [card("column-blocker")];
    expect(empireRules.canConquer(clearColumn, 0, 10)).toBe(false);
  });

  test("rejects distant cards outside a shared row or column", () => {
    expect(
      empireRules.canConquer(
        board([
          [0, card("source", "7", "clubs")],
          [7, card("target", "7", "hearts")],
        ]),
        0,
        7,
      ),
    ).toBe(false);
  });
});
