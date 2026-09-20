import { describe, expect, test } from "@jest/globals";
import { createDeck } from "@/components/Cards/card-utils";
import { GAMES_DATA } from "@/data/games-registry";
import { getGameComponentByPath } from "@/data/games-router";
import { beehiveRules, BeehiveGameState } from "@/components/Games/Beehive";

describe("Beehive", () => {
  test("is registered and mounts", () => {
    expect(GAMES_DATA["/beehive"]).toBeDefined();
    expect(getGameComponentByPath("/beehive")).not.toBeNull();
  });

  test("deals the specified initial state", () => {
    const state = beehiveRules.createInitialState();

    expect(state.beehive).toHaveLength(10);
    expect(state.tableau).toHaveLength(6);
    expect(state.tableau.every((pile) => pile.length === 1)).toBe(true);
    expect(state.draw).toHaveLength(36);
    expect(state.waste).toHaveLength(0);
    expect(state.beehive.at(-1)?.faceUp).toBe(true);
  });

  test("deals three cards from stock to waste", () => {
    const state = beehiveRules.createInitialState();
    beehiveRules.dealDraw(state);

    expect(state.draw).toHaveLength(33);
    expect(state.waste).toHaveLength(3);
    expect(state.waste.every((card) => card.faceUp)).toBe(true);
  });

  test("matches by rank and clears a complete set before refilling", () => {
    const cards = createDeck({ faceUp: true });
    const aces = cards.filter((card) => card.rank === "A");
    const state: BeehiveGameState = {
      beehive: [cards.find((card) => card.rank === "K")!],
      tableau: [
        aces,
        [cards[4]],
        [cards[5]],
        [cards[6]],
        [cards[7]],
        [cards[8]],
      ],
      draw: [],
      waste: [],
      discard: [],
    };

    beehiveRules.normalizeState(state);

    expect(state.tableau[0]).toHaveLength(0);
    expect(state.discard).toHaveLength(4);
    expect(state.discard.every((card) => !card.faceUp)).toBe(true);
  });

  test("does not exceed a four-card tableau slot", () => {
    const cards = createDeck({ faceUp: true });
    const fives = cards.filter((card) => card.rank === "5");
    const state: BeehiveGameState = {
      beehive: [],
      tableau: [fives.slice(0, 2), fives.slice(2, 4), [], [], [], []],
      draw: [],
      waste: [],
      discard: [],
    };

    expect(beehiveRules.canMoveTableauToTableau(state, 0, 1)).toBe(true);
    state.tableau[1].push(cards.find((card) => card.rank === "6")!);
    expect(beehiveRules.canMoveTableauToTableau(state, 0, 1)).toBe(false);
  });

  test("prefers a matching pile over an empty slot", () => {
    const cards = createDeck({ faceUp: true });
    const state: BeehiveGameState = {
      beehive: [cards.find((card) => card.rank === "5")!],
      tableau: [[], [cards.find((card) => card.rank === "5")!], [], [], [], []],
      draw: [],
      waste: [],
      discard: [],
    };

    expect(beehiveRules.moveSourceToTableau(state, "beehive")).toBe(true);
    expect(state.tableau[0]).toHaveLength(0);
    expect(state.tableau[1]).toHaveLength(2);
  });

  test("does not lose while the beehive can fill an empty slot", () => {
    const cards = createDeck({ faceUp: true });
    const state: BeehiveGameState = {
      beehive: [cards[0]],
      tableau: [
        [],
        [cards[4]],
        [cards[8]],
        [cards[12]],
        [cards[16]],
        [cards[20]],
      ],
      draw: [],
      waste: [],
      discard: [],
    };

    expect(beehiveRules.hasValidMove(state)).toBe(true);
    expect(beehiveRules.isLost(state)).toBe(false);
  });

  test("loses only when no cards remain to draw and no move exists", () => {
    const cards = createDeck({ faceUp: true });
    const state: BeehiveGameState = {
      beehive: [],
      tableau: [
        cards.slice(0, 4),
        cards.slice(4, 8),
        cards.slice(8, 12),
        cards.slice(12, 16),
        cards.slice(16, 20),
        cards.slice(20, 24),
      ],
      draw: [],
      waste: [],
      discard: [],
    };

    expect(beehiveRules.hasValidMove(state)).toBe(false);
    expect(beehiveRules.isLost(state)).toBe(true);
  });

  test("finds a legal move in a future three-card draw", () => {
    const cards = createDeck({ faceUp: true });
    const tableauCards = cards.slice(0, 6);
    const matchingCard = cards.find(
      (card) =>
        card.rank === tableauCards[0].rank && card.id !== tableauCards[0].id,
    )!;
    const state: BeehiveGameState = {
      beehive: [],
      tableau: tableauCards.map((card) => [card]),
      draw: [cards[12], cards[13], matchingCard],
      waste: [],
      discard: [],
    };

    expect(beehiveRules.hasValidMove(state)).toBe(false);
    expect(beehiveRules.hasFutureDrawMove(state)).toBe(true);
    expect(beehiveRules.isLost(state)).toBe(false);
  });

  test("loses when a complete draw and waste cycle has no legal move", () => {
    const cards = createDeck({ faceUp: true });
    const tableauCards = cards.slice(0, 6);
    const state: BeehiveGameState = {
      beehive: [],
      tableau: tableauCards.map((card) => [card]),
      draw: cards.slice(19, 22),
      waste: [cards[22]],
      discard: [],
    };

    expect(beehiveRules.hasValidMove(state)).toBe(false);
    expect(beehiveRules.hasFutureDrawMove(state)).toBe(false);
    expect(beehiveRules.isLost(state)).toBe(true);
  });

  test("wins only when all 52 cards are in the discard pile", () => {
    const cards = createDeck({ faceUp: false });
    const state: BeehiveGameState = {
      beehive: [],
      tableau: [[], [], [], [], [], []],
      draw: [],
      waste: [],
      discard: cards,
    };

    expect(beehiveRules.isWon(state)).toBe(true);
  });
});
