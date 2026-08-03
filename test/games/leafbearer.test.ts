import type {
  CardRank,
  CardSuit,
  PlayingCard,
} from "@/components/Cards/card-utils";
import {
  leafbearerRules,
  type LeafbearerGameState,
} from "@/components/Games/Leafbearer";

function card(
  rank: CardRank,
  id: string = rank,
  suit: CardSuit = "hearts",
): PlayingCard {
  return { id, rank, suit, faceUp: true };
}

function state(
  overrides: Partial<LeafbearerGameState> = {},
): LeafbearerGameState {
  return {
    creatures: Array.from({ length: 9 }, () => null),
    stables: [],
    herbStacks: Array.from({ length: 9 }, () => []),
    eatenHerbs: Array.from({ length: 9 }, () => []),
    noble: null,
    nobleEaten: [],
    jester: null,
    jesterEaten: [],
    carriedHerbs: [],
    nextLocation: null,
    phase: "chooseSource",
    openStables: false,
    ended: false,
    won: false,
    winLoseMessage: "",
    ...overrides,
  };
}

describe("Leafbearer rules", () => {
  test("builds twelve creatures and twenty herbs", () => {
    const decks = leafbearerRules.createDecks();
    expect(decks.creatures).toHaveLength(12);
    expect(decks.herbs).toHaveLength(20);
  });

  test("requires all Jacks to heal before Queens", () => {
    const game = state({
      creatures: [
        { card: card("J", "jack", "spades"), healthy: false },
        { card: card("Q", "queen", "hearts"), healthy: false },
        null,
        null,
        null,
        null,
        null,
        null,
        null,
      ],
      herbStacks: [
        [card("5", "five", "spades"), card("4", "four"), card("2", "two")],
        [
          card("5", "queen-five", "hearts"),
          card("5", "queen-five-two"),
          card("2", "queen-two"),
        ],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
      ],
    });

    leafbearerRules.resolveCreaturePhase(game);
    expect(game.creatures[0]?.healthy).toBe(true);
    expect(game.creatures[1]?.healthy).toBe(false);

    leafbearerRules.resolveCreaturePhase(game);
    expect(game.creatures[1]?.healthy).toBe(true);
  });

  test("healthy creatures eat matching herbs", () => {
    const game = state({
      creatures: [
        { card: card("J", "healthy", "hearts"), healthy: true },
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
      ],
      herbStacks: [
        [card("4", "eat", "hearts"), card("2", "keep", "clubs")],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
      ],
    });

    leafbearerRules.resolveCreaturePhase(game);
    expect(game.herbStacks[0].map((entry) => entry.id)).toEqual(["keep"]);
    expect(game.eatenHerbs[0].map((entry) => entry.id)).toEqual(["eat"]);
  });

  test("distributes herbs to the right in chosen order and wraps", () => {
    const game = state({
      herbStacks: [
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [card("2", "first"), card("3", "second")],
      ],
    });
    expect(leafbearerRules.beginDistribution(game, 8)).toBe(true);
    expect(leafbearerRules.dropHerb(game, "second")).toBe(true);
    expect(leafbearerRules.dropHerb(game, "first")).toBe(true);
    expect(game.herbStacks[0].map((entry) => entry.id)).toEqual(["second"]);
    expect(game.herbStacks[1].map((entry) => entry.id)).toEqual(["first"]);
  });

  test("Open Stables Jester eats the final herb dropped into the Stables", () => {
    const game = state({
      openStables: true,
      jester: card("Joker", "jester"),
      herbStacks: [[], [], [], [card("4", "last")], [], [], [], [], []],
    });
    leafbearerRules.beginDistribution(game, 3);
    leafbearerRules.dropHerb(game, "last");

    expect(game.herbStacks[4]).toEqual([]);
    expect(game.jesterEaten.map((entry) => entry.id)).toEqual(["last"]);
  });

  test("wins after all eight realm creatures are healthy", () => {
    const creatures = Array.from(
      { length: 9 },
      () => null,
    ) as LeafbearerGameState["creatures"];
    for (const index of [0, 1, 2, 3, 5, 6, 7, 8]) {
      creatures[index] = {
        card: card("J", `creature-${index}`),
        healthy: true,
      };
    }
    const game = state({ creatures });

    leafbearerRules.evaluateOutcome(game);
    expect(game).toMatchObject({ ended: true, won: true });
  });
});
