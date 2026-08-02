import { type PlayingCard } from "@/components/Cards/card-utils";
import { skywayRules, type SkywayGameState } from "@/components/Games/Skyway";

function card(
  rank: PlayingCard["rank"],
  suit: PlayingCard["suit"] = "hearts",
  id: string = `${rank}-${suit}`,
): PlayingCard {
  return { id, rank, suit, faceUp: false };
}

function grid(): PlayingCard[][] {
  return Array.from({ length: 9 }, () => []);
}

function state(overrides: Partial<SkywayGameState> = {}): SkywayGameState {
  return {
    draw: [],
    discard: [],
    market: [[], [], []],
    grid: grid(),
    round: 1,
    finalTurnAfterPlacement: false,
    ended: false,
    ...overrides,
  };
}

describe("Skyway rules", () => {
  test("finds a rising five-cell path through orthogonal neighbors", () => {
    const cells = grid();
    [0, 1, 2, 5, 8].forEach((cell, index) => {
      cells[cell] = [card(String(index + 2) as PlayingCard["rank"])];
    });

    expect(skywayRules.findLongestSuitPath(cells, "hearts")).toEqual([
      0, 1, 2, 5, 8,
    ]);
  });

  test("does not connect cells across a row boundary", () => {
    const cells = grid();
    cells[2] = [card("2")];
    cells[3] = [card("3")];

    expect(skywayRules.findLongestSuitPath(cells, "hearts")).toHaveLength(1);
  });

  test("requires increasing values and matching suits", () => {
    const cells = grid();
    cells[0] = [card("2", "hearts")];
    cells[1] = [card("2", "hearts", "duplicate-heart")];
    cells[3] = [card("3", "clubs")];

    expect(skywayRules.computeScore(cells)).toEqual({
      clubs: 1,
      diamonds: 0,
      hearts: 1,
      spades: 0,
    });
  });

  test("deals markets in two, two, one shape", () => {
    const next = skywayRules.prepareMarket(
      state({
        draw: [card("2"), card("3"), card("4"), card("5"), card("6")],
      }),
    );

    expect(next.market.map((pile) => pile.length)).toEqual([2, 2, 1]);
    expect(next.market.flat().every(({ faceUp }) => faceUp)).toBe(true);
    expect(next.draw).toEqual([]);
    expect(next.ended).toBe(false);
  });

  test("rolls discarded cards into the next round", () => {
    const next = skywayRules.prepareMarket(
      state({
        discard: [card("2"), card("3"), card("4"), card("5"), card("6")],
      }),
    );

    expect(next.round).toBe(2);
    expect(next.market.flat()).toHaveLength(5);
    expect(next.discard).toEqual([]);
  });

  test("marks the recycled third-round market as the final turn", () => {
    const next = skywayRules.prepareMarket(
      state({
        round: 3,
        discard: [card("2"), card("3"), card("4"), card("5"), card("6")],
      }),
    );

    expect(next.round).toBe(3);
    expect(next.finalTurnAfterPlacement).toBe(true);
    expect(next.market.flat()).toHaveLength(5);
  });

  test("ends when fewer than five cards remain for a market", () => {
    const next = skywayRules.prepareMarket(
      state({ draw: [card("2"), card("3"), card("4"), card("5")] }),
    );

    expect(next.ended).toBe(true);
    expect(next.market.map((pile) => pile.length)).toEqual([2, 2, 0]);
  });
});
