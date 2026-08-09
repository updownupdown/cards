import { type PlayingCard } from "@/components/Cards/card-utils";
import {
  sirTommyRules,
  type SirTommyGameState,
} from "@/components/Games/SirTommy";

function card(
  rank: PlayingCard["rank"],
  suit: PlayingCard["suit"] = "spades",
  faceUp = true,
  id: string = `${rank}-${suit}`,
): PlayingCard {
  return { id, rank, suit, faceUp };
}

function state(overrides: Partial<SirTommyGameState> = {}): SirTommyGameState {
  return {
    stock: [],
    waste: Array.from({ length: sirTommyRules.wasteCount }, () => []),
    foundations: Array.from({ length: 4 }, () => []),
    ended: false,
    won: false,
    ...overrides,
  };
}

describe("Sir Tommy rules", () => {
  test("starts Aces on empty foundations", () => {
    const game = state({
      foundations: [[card("A", "clubs")], [], [], []],
    });

    expect(sirTommyRules.foundationFor(game, card("A", "hearts"))).toBe(1);
  });

  test("builds foundations by rank regardless of suit", () => {
    const game = state({
      foundations: [[card("A", "clubs")], [], [], []],
    });

    expect(sirTommyRules.foundationFor(game, card("2", "hearts"))).toBe(0);
    expect(sirTommyRules.foundationFor(game, card("3", "clubs"))).toBe(-1);
  });

  test("moves only an exposed waste card to a valid foundation", () => {
    const game = state({
      waste: [[card("3"), card("2")], [], [], []],
      foundations: [[card("A")], [], [], []],
    });

    expect(sirTommyRules.moveWasteToFoundation(game, 0)).toBe(true);
    expect(game.waste[0].map(({ rank }) => rank)).toEqual(["3"]);
    expect(game.foundations[0].map(({ rank }) => rank)).toEqual(["A", "2"]);
    expect(sirTommyRules.moveWasteToFoundation(game, 0)).toBe(true);
    expect(game.waste[0]).toEqual([]);
    expect(game.foundations[0].map(({ rank }) => rank)).toEqual([
      "A",
      "2",
      "3",
    ]);
  });

  test("does not move an invalid waste card to a foundation", () => {
    const game = state({
      waste: [[card("2"), card("K")], [], [], []],
      foundations: [[card("A")], [], [], []],
    });

    expect(sirTommyRules.moveWasteToFoundation(game, 0)).toBe(false);
    expect(game.waste[0].map(({ rank }) => rank)).toEqual(["2", "K"]);
  });

  test("moves a valid top stock card to a foundation and reveals the next card", () => {
    const game = state({
      stock: [card("3", "clubs", false), card("2", "hearts")],
      foundations: [[card("A")], [], [], []],
    });

    expect(sirTommyRules.moveStockToFoundation(game)).toBe(true);
    expect(game.foundations[0].map(({ rank }) => rank)).toEqual(["A", "2"]);
    expect(game.stock).toEqual([card("3", "clubs")]);
  });

  test("does not move an invalid top stock card to a foundation", () => {
    const game = state({ stock: [card("K")] });

    expect(sirTommyRules.moveStockToFoundation(game)).toBe(false);
    expect(game.stock).toEqual([card("K")]);
  });

  test("reveals only the top stock card", () => {
    const stock = [card("3", "clubs", false), card("2", "hearts", false)];

    sirTommyRules.revealStockTop(stock);

    expect(stock.map(({ rank, faceUp }) => ({ rank, faceUp }))).toEqual([
      { rank: "3", faceUp: false },
      { rank: "2", faceUp: true },
    ]);
  });

  test("distinguishes win, exhausted loss, and ongoing stock", () => {
    const completeFoundation = Array.from({ length: 13 }, (_, index) =>
      card("A", "spades", true, `complete-${index}`),
    );

    expect(
      sirTommyRules.evaluateEnd(
        state({
          foundations: Array.from({ length: 4 }, () => [...completeFoundation]),
        }),
      ),
    ).toEqual({ ended: true, won: true });
    expect(sirTommyRules.evaluateEnd(state())).toEqual({
      ended: true,
      won: false,
    });
    expect(
      sirTommyRules.evaluateEnd(state({ stock: [card("K", "hearts")] })),
    ).toEqual({ ended: false, won: false });
    expect(
      sirTommyRules.evaluateEnd(state({ waste: [[card("A")], [], [], []] })),
    ).toEqual({ ended: false, won: false });
  });

  test("does not resolve the empty initial state during setup", () => {
    expect(sirTommyRules.evaluateEnd(state(), true)).toEqual({
      ended: false,
      won: false,
    });
  });
});
