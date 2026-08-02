import { type PlayingCard } from "@/components/Cards/card-utils";
import {
  osmosisRules,
  type OsmosisGameState,
} from "@/components/Games/Osmosis";

function card(
  rank: PlayingCard["rank"],
  suit: PlayingCard["suit"],
  id: string = `${rank}-${suit}`,
): PlayingCard {
  return { id, rank, suit, faceUp: true };
}

function state(overrides: Partial<OsmosisGameState> = {}): OsmosisGameState {
  const baseCard = card("7", "spades", "base");
  return {
    baseCard,
    reserves: [[], [], [], []],
    foundations: [[baseCard], [], [], []],
    stock: [],
    waste: [],
    ended: false,
    won: false,
    ...overrides,
  };
}

describe("Osmosis rules", () => {
  test("accepts any rank of the first foundation suit", () => {
    expect(osmosisRules.foundationTarget(state(), card("K", "spades"))).toBe(0);
  });

  test("starts each lower suit row with the key rank", () => {
    expect(osmosisRules.foundationTarget(state(), card("7", "hearts"))).toBe(1);
    expect(osmosisRules.foundationTarget(state(), card("8", "hearts"))).toBe(
      -1,
    );
  });

  test("requires the same rank in the row immediately above", () => {
    const game = state({
      foundations: [
        [card("7", "spades"), card("9", "spades")],
        [card("7", "hearts")],
        [],
        [],
      ],
    });

    expect(osmosisRules.foundationTarget(game, card("9", "hearts"))).toBe(1);
    expect(osmosisRules.foundationTarget(game, card("10", "hearts"))).toBe(-1);
  });

  test("continues while stock remains", () => {
    expect(
      osmosisRules.evaluateEnd(state({ stock: [card("2", "clubs")] })),
    ).toEqual({ ended: false, won: false });
  });

  test("does not resolve transient setup state", () => {
    expect(osmosisRules.evaluateEnd(state(), true)).toEqual({
      ended: false,
      won: false,
    });
  });

  test("looks through the waste because it can be redealt", () => {
    const game = state({
      waste: [card("K", "spades"), card("2", "hearts")],
    });

    expect(osmosisRules.evaluateEnd(game)).toEqual({
      ended: false,
      won: false,
    });
  });

  test("loses when no exposed reserve or future waste card is playable", () => {
    const game = state({
      reserves: [[card("K", "spades"), card("2", "hearts")], [], [], []],
      waste: [card("3", "hearts")],
    });

    expect(osmosisRules.evaluateEnd(game)).toEqual({ ended: true, won: false });
  });

  test("wins when all 52 cards reach the foundations", () => {
    const placed = Array.from({ length: 52 }, (_, index) =>
      card("A", "spades", `placed-${index}`),
    );

    expect(
      osmosisRules.evaluateEnd(state({ foundations: [placed, [], [], []] })),
    ).toEqual({ ended: true, won: true });
  });
});
