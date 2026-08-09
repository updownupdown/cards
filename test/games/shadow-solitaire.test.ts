import {
  type CardRank,
  type CardSuit,
  type PlayingCard,
} from "@/components/Cards/card-utils";
import {
  shadowSolitaireRules,
  type ShadowGameState,
  type ShadowThreat,
} from "@/components/Games/ShadowSolitaire";

function card(
  rank: CardRank,
  suit: CardSuit,
  id = `${rank}-${suit}`,
  faceUp = true,
): PlayingCard {
  return { id, rank, suit, faceUp };
}

function threat(
  entry: PlayingCard,
  responses: PlayingCard[] = [],
): ShadowThreat {
  return { card: entry, responses, smoked: false };
}

function state(overrides: Partial<ShadowGameState> = {}): ShadowGameState {
  return {
    encounterDeck: [],
    playDeck: [],
    discard: [],
    trackers: [],
    currentEncounter: card("J", "clubs", "encounter"),
    threats: [],
    currentResponse: null,
    responsesDrawn: 0,
    smokeUsed: false,
    grapplePair: null,
    grappleResponses: [],
    grappleAnchor: null,
    armor: 10,
    health: 10,
    encounterNumber: 1,
    difficulty: "kingpin",
    ended: false,
    won: false,
    message: "",
    ...overrides,
  };
}

describe("Shadow Solitaire rules", () => {
  test("builds a 54-card deck with two Jokers", () => {
    const deck = shadowSolitaireRules.createDeck();
    expect(deck).toHaveLength(54);
    expect(deck.filter((entry) => entry.rank === "Joker")).toHaveLength(2);
    expect(deck.every((entry) => !entry.faceUp)).toBe(true);
  });

  test("orders encounters Jacks, Queens, Kings, then the Jester King", () => {
    const encounterDeck = shadowSolitaireRules.buildEncounterDeck(
      shadowSolitaireRules.createDeck(),
    );
    const revealOrder = [...encounterDeck].reverse();

    expect(encounterDeck).toHaveLength(12);
    expect(revealOrder.slice(0, 4).every((entry) => entry.rank === "J")).toBe(
      true,
    );
    expect(revealOrder.slice(4, 8).every((entry) => entry.rank === "Q")).toBe(
      true,
    );
    expect(revealOrder.slice(8, 11).every((entry) => entry.rank === "K")).toBe(
      true,
    );
    expect(revealOrder[11]).toMatchObject({ rank: "K", suit: "diamonds" });
  });

  test("deals trackers outside a 40-card Play Deck", () => {
    const game = state({ discard: shadowSolitaireRules.createDeck() });
    shadowSolitaireRules.setupFromDiscard(game);

    expect(game.trackers).toHaveLength(2);
    expect(
      game.trackers.map((entry) => `${entry.rank}-${entry.suit}`).sort(),
    ).toEqual(["10-hearts", "10-spades"]);
    expect(game.currentEncounter?.rank).toBe("J");
    expect(game.encounterDeck).toHaveLength(11);
    expect(game.threats.length).toBeGreaterThanOrEqual(4);
    expect(
      game.playDeck.length +
        game.threats.length +
        game.trackers.length +
        game.encounterDeck.length +
        1,
    ).toBe(54);
  });

  test("uses highest Threat for Aces and Jokers, and lowest for response Aces", () => {
    const threats = [
      threat(card("3", "clubs")),
      threat(card("8", "diamonds")),
      threat(card("A", "spades")),
      threat(card("Joker", "hearts")),
    ];

    expect(shadowSolitaireRules.threatValue(threats[2], threats)).toBe(8);
    expect(shadowSolitaireRules.threatValue(threats[3], threats)).toBe(8);
    expect(
      shadowSolitaireRules.responseValue(card("A", "hearts"), threats),
    ).toBe(3);
  });

  test("clears standard stacks and Grapple Lines only within the +3 window", () => {
    const threats = [
      threat(card("3", "clubs"), [card("5", "spades")]),
      threat(card("6", "clubs")),
    ];
    expect(
      shadowSolitaireRules.standardThreatCleared(threats[0], threats),
    ).toBe(true);

    const grappleGame = state({
      threats,
      grapplePair: [0, 1],
      grappleResponses: [card("5", "spades"), card("4", "diamonds")],
    });
    expect(shadowSolitaireRules.grappleCleared(grappleGame)).toBe(true);
    grappleGame.grappleResponses.push(card("4", "hearts"));
    expect(shadowSolitaireRules.grappleCleared(grappleGame)).toBe(false);
  });

  test("applies unresolved damage, rank modifier, and healing as a net change", () => {
    const game = state({
      currentEncounter: card("Q", "diamonds"),
      threats: [
        threat(card("8", "diamonds"), [card("10", "clubs")]),
        threat(card("5", "clubs")),
      ],
      responsesDrawn: 1,
      smokeUsed: true,
      difficulty: "city",
    });

    const result = shadowSolitaireRules.calculateRound(game);
    expect(result).toMatchObject({ damage: 2, healing: 1, netDamage: 1 });
    shadowSolitaireRules.applyTrackChange(game, result.netDamage);
    expect(game).toMatchObject({ armor: 9, health: 10 });
  });

  test("a response Joker expands the Threat row without consuming a response", () => {
    const game = state({
      threats: [
        threat(card("2", "clubs")),
        threat(card("3", "clubs")),
        threat(card("4", "clubs")),
        threat(card("5", "clubs")),
      ],
      responsesDrawn: 1,
    });
    shadowSolitaireRules.addResponseJoker(
      game,
      card("Joker", "spades", "joker"),
    );

    expect(game.threats).toHaveLength(5);
    expect(game.responsesDrawn).toBe(1);
  });
});
