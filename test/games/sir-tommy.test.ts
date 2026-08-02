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

  test("promotes a chain from the stock until its top is blocked", () => {
    const game = state({
      stock: [
        card("4", "clubs", false),
        card("3", "hearts", false),
        card("2", "diamonds", false),
      ],
      foundations: [[card("A")], [], [], []],
    });

    sirTommyRules.advance(game);

    expect(game.foundations[0].map(({ rank }) => rank)).toEqual([
      "A",
      "2",
      "3",
      "4",
    ]);
    expect(game.stock).toEqual([]);
  });

  test("promotes exposed waste cards but not cards buried below a blocker", () => {
    const blocked = state({
      waste: [[card("2"), card("K")], [], [], []],
      foundations: [[card("A")], [], [], []],
    });
    sirTommyRules.advance(blocked);
    expect(blocked.waste[0].map(({ rank }) => rank)).toEqual(["2", "K"]);

    const chain = state({
      waste: [[card("3"), card("2")], [], [], []],
      foundations: [[card("A")], [], [], []],
    });
    sirTommyRules.advance(chain);
    expect(chain.waste[0]).toEqual([]);
    expect(chain.foundations[0].map(({ rank }) => rank)).toEqual([
      "A",
      "2",
      "3",
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
  });

  test("does not resolve the empty initial state during setup", () => {
    expect(sirTommyRules.evaluateEnd(state(), true)).toEqual({
      ended: false,
      won: false,
    });
  });
});
