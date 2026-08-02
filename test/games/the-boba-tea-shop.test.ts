import { type PlayingCard } from "@/components/Cards/card-utils";
import {
  bobaTeaShopRules,
  type BobaTeaGameState,
} from "@/components/Games/TheBobaTeaShop";

function card(rank: PlayingCard["rank"], id: string = rank): PlayingCard {
  return { id, rank, suit: "spades", faceUp: true };
}

function state(overrides: Partial<BobaTeaGameState> = {}): BobaTeaGameState {
  return {
    deck: [],
    queues: [[], [], [], []],
    discard: [],
    discardsByRank: bobaTeaShopRules.createDiscardCount(),
    decisionNeeded: false,
    ended: false,
    won: false,
    ...overrides,
  };
}

describe("The Boba Tea Shop rules", () => {
  test.each([
    [0, "K", true],
    [0, "9", false],
    [1, "10", true],
    [1, "8", false],
    [2, "5", true],
    [2, "J", false],
  ] as const)(
    "checks insertion position %s for rank %s",
    (cardIndex, rank, expected) => {
      const queue = [card("Q", "queen"), card("10", "ten"), card("5", "five")];
      expect(
        bobaTeaShopRules.checkNextCustomerFits(
          { queueIndex: 0, cardIndex },
          card(rank, "next"),
          queue,
        ),
      ).toBe(expected);
    },
  );

  test("allows equal-ranked customers next to each other", () => {
    const queue = [card("Q"), card("10", "first-ten"), card("5")];
    expect(
      bobaTeaShopRules.checkNextCustomerFits(
        { queueIndex: 0, cardIndex: 2 },
        card("10", "second-ten"),
        queue,
      ),
    ).toBe(true);
  });

  test("counts customers across all queues", () => {
    expect(
      bobaTeaShopRules.totalInQueues([
        [card("A")],
        [card("2"), card("3")],
        [],
        [card("4"), card("5"), card("6")],
      ]),
    ).toBe(6);
  });

  test("updates discard counts for every discarded card", () => {
    const counts = bobaTeaShopRules.createDiscardCount();
    const result = bobaTeaShopRules.updatedDiscardsByRank(counts, [
      card("7", "first-seven"),
      card("7", "second-seven"),
      card("K"),
    ]);

    expect(result["7"]).toBe(2);
    expect(result.K).toBe(1);
    expect(result.A).toBe(0);
  });

  test("loses on the fourth discarded card of a rank", () => {
    const discardsByRank = bobaTeaShopRules.createDiscardCount();
    discardsByRank["8"] = 4;

    expect(
      bobaTeaShopRules.evaluateEnd(
        state({ deck: [card("2")], discardsByRank }),
      ),
    ).toEqual({ ended: true, won: false });
  });

  test("the fourth duplicate discard takes precedence over an empty-deck win", () => {
    const discardsByRank = bobaTeaShopRules.createDiscardCount();
    discardsByRank.Q = 4;

    expect(bobaTeaShopRules.evaluateEnd(state({ discardsByRank }))).toEqual({
      ended: true,
      won: false,
    });
  });

  test("wins with an empty deck and otherwise continues", () => {
    expect(bobaTeaShopRules.evaluateEnd(state())).toEqual({
      ended: true,
      won: true,
    });
    expect(bobaTeaShopRules.evaluateEnd(state({ deck: [card("2")] }))).toEqual({
      ended: false,
      won: false,
    });
  });
});
