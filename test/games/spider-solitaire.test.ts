import { RANKS, type PlayingCard } from "@/components/Cards/card-utils";
import {
  type SpiderGameState,
  spiderRules,
} from "@/components/Games/SpiderSolitaire";

function card(
  rank: PlayingCard["rank"],
  suit: PlayingCard["suit"] = "spades",
  id: string = `${rank}-${suit}`,
  faceUp = true,
): PlayingCard {
  return { id, rank, suit, faceUp };
}

function state(overrides: Partial<SpiderGameState> = {}): SpiderGameState {
  return {
    tableau: Array.from({ length: 10 }, () => [card("5")]),
    stock: [],
    foundations: Array.from({ length: 8 }, () => []),
    ...overrides,
  };
}

function completeRun(suit: PlayingCard["suit"] = "spades") {
  return [...RANKS]
    .reverse()
    .map((rank, index) => card(rank, suit, `run-${suit}-${index}`));
}

describe("Spider Solitaire rules", () => {
  test("deals 54 prepared cards into the standard tableau shape", () => {
    const deck = Array.from({ length: 104 }, (_, index) =>
      card("A", "spades", `card-${index}`, false),
    );
    const game = spiderRules.dealSpider(deck);

    expect(game.tableau.map((pile) => pile.length)).toEqual([
      6, 6, 6, 6, 5, 5, 5, 5, 5, 5,
    ]);
    expect(game.stock).toHaveLength(50);
    expect(game.tableau.flat().filter(({ faceUp }) => faceUp)).toHaveLength(10);
    expect(game.tableau[0].map(({ id }) => id)).toEqual([
      "card-0",
      "card-1",
      "card-2",
      "card-3",
      "card-4",
      "card-5",
    ]);
  });

  test("builds tableau down by rank but moves only valid face-up runs", () => {
    expect(
      spiderRules.canPlaceOnTableau(card("9", "clubs"), card("10", "hearts")),
    ).toBe(true);
    expect(
      spiderRules.isValidDescendingRun([
        card("10", "clubs"),
        card("9", "hearts"),
      ]),
    ).toBe(true);
    expect(
      spiderRules.isValidDescendingRun([
        card("10", "clubs"),
        card("9", "clubs", "hidden", false),
      ]),
    ).toBe(false);
  });

  test("recognizes only complete same-suit King-to-Ace runs", () => {
    expect(spiderRules.isCompleteRun(completeRun())).toBe(true);

    const mixedSuit = completeRun();
    mixedSuit[5] = { ...mixedSuit[5], suit: "hearts" };
    expect(spiderRules.isCompleteRun(mixedSuit)).toBe(false);
    expect(spiderRules.isCompleteRun(completeRun().slice(1))).toBe(false);
  });

  test("moves complete runs to foundations and reveals the exposed card", () => {
    const hidden = card("7", "hearts", "hidden", false);
    const game = state({
      tableau: [
        [hidden, ...completeRun()],
        ...Array.from({ length: 9 }, () => []),
      ],
    });

    spiderRules.moveCompletedRunsToFoundations(game.tableau, game.foundations);

    expect(game.foundations[0]).toHaveLength(13);
    expect(game.tableau[0]).toEqual([{ ...hidden, faceUp: true }]);
  });

  test("requires ten stock cards and no empty tableau columns to deal", () => {
    const stock = Array.from({ length: 10 }, (_, index) =>
      card("2", "clubs", `stock-${index}`, false),
    );

    expect(spiderRules.canDealStock(state({ stock }))).toBe(true);
    expect(spiderRules.canDealStock(state({ stock: stock.slice(1) }))).toBe(
      false,
    );
    expect(
      spiderRules.canDealStock(
        state({
          stock,
          tableau: [[], ...Array.from({ length: 9 }, () => [card("5")])],
        }),
      ),
    ).toBe(false);
  });

  test("deals one face-up stock card to each tableau column", () => {
    const stock = Array.from({ length: 10 }, (_, index) =>
      card("2", "clubs", `stock-${index}`, false),
    );
    const firstDealt = stock[9];
    const lastDealt = stock[0];
    const game = state({ stock });

    expect(spiderRules.dealFromStock(game)).toBe(true);
    expect(game.stock).toEqual([]);
    expect(game.tableau.map((pile) => pile.length)).toEqual(
      Array.from({ length: 10 }, () => 2),
    );
    expect(game.tableau[0][1]).toEqual({ ...firstDealt, faceUp: true });
    expect(game.tableau[9][1]).toEqual({ ...lastDealt, faceUp: true });
  });

  test("wins only after all eight complete runs are removed", () => {
    expect(
      spiderRules.isWon(
        state({
          foundations: Array.from({ length: 8 }, () => completeRun()),
        }),
      ),
    ).toBe(true);
    expect(
      spiderRules.isWon(
        state({
          foundations: [completeRun(), ...Array.from({ length: 7 }, () => [])],
        }),
      ),
    ).toBe(false);
  });
});
