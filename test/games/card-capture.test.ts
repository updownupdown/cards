import {
  type CardRank,
  type CardSuit,
  type PlayingCard,
} from "@/components/Cards/card-utils";
import {
  cardCaptureRules,
  type CardCaptureGameState,
} from "@/components/Games/CardCapture";

function card(
  rank: CardRank,
  suit: CardSuit = "spades",
  id: string = `${rank}-${suit}`,
  faceUp = true,
): PlayingCard {
  return { id, rank, suit, faceUp };
}

function state(
  overrides: Partial<CardCaptureGameState> = {},
): CardCaptureGameState {
  return {
    personalDeck: [],
    personalDiscard: [],
    enemyDeck: [],
    enemyRow: [null, null, null, null],
    enemyCapturePile: [],
    hand: [],
    phase: "capturePhase",
    selectedHandIds: [],
    selectedEnemyIdx: null,
    ended: false,
    won: false,
    winLoseMessage: "",
    ...overrides,
  };
}

function allCardIds(game: CardCaptureGameState) {
  return [
    ...game.personalDeck,
    ...game.personalDiscard,
    ...game.enemyDeck,
    ...game.enemyRow.filter((entry): entry is PlayingCard => entry !== null),
    ...game.enemyCapturePile,
    ...game.hand,
  ]
    .map((entry) => entry.id)
    .sort();
}

describe("Card Capture rules", () => {
  test.each([
    ["A", true],
    ["J", true],
    ["Q", true],
    ["K", true],
    ["10", false],
    ["Joker", false],
  ] as const)("classifies %s combatant status", (rank, expected) => {
    expect(cardCaptureRules.isEnemyCombatant(card(rank))).toBe(expected);
  });

  test("uses high aces and zero-value jokers", () => {
    expect(cardCaptureRules.getCardValue(card("A"))).toBe(14);
    expect(cardCaptureRules.getCardValue(card("K"))).toBe(13);
    expect(cardCaptureRules.getCardValue(card("Joker"))).toBe(0);
  });

  test("requires non-jokers to match suit and meet the target value", () => {
    const target = card("9", "hearts", "target");

    expect(
      cardCaptureRules.canCaptureWithCards(
        [card("4", "hearts", "four"), card("5", "hearts", "five")],
        target,
      ),
    ).toBe(true);
    expect(
      cardCaptureRules.canCaptureWithCards(
        [card("4", "hearts", "four"), card("5", "spades", "five")],
        target,
      ),
    ).toBe(false);
    expect(
      cardCaptureRules.canCaptureWithCards(
        [card("4", "hearts", "four")],
        target,
      ),
    ).toBe(false);
  });

  test("allows jokers to copy an already selected non-joker value", () => {
    const target = card("8", "hearts", "target");

    expect(
      cardCaptureRules.canCaptureWithCards(
        [card("4", "hearts", "four"), card("Joker", "spades", "joker")],
        target,
      ),
    ).toBe(true);
    expect(
      cardCaptureRules.canCaptureWithCards(
        [card("Joker", "spades", "joker")],
        target,
      ),
    ).toBe(false);
  });

  test("compacts enemy cards to the right without cloning them", () => {
    const first = card("5", "clubs", "first");
    const second = card("6", "diamonds", "second");

    const compacted = cardCaptureRules.compactEnemyRowRight([
      first,
      null,
      second,
      null,
    ]);

    expect(compacted).toEqual([null, null, first, second]);
    expect(compacted[2]).toBe(first);
    expect(compacted[3]).toBe(second);
  });

  test("recycles the personal discard and draws to four cards", () => {
    const original = state({
      personalDiscard: [
        card("2", "hearts", "two", true),
        card("3", "hearts", "three", true),
        card("4", "hearts", "four", true),
        card("Joker", "hearts", "joker", true),
      ],
      phase: "drawPhase",
    });
    const idsBefore = allCardIds(original);

    cardCaptureRules.drawToHand(original);

    expect(original.hand).toHaveLength(4);
    expect(original.hand.every((entry) => entry.faceUp)).toBe(true);
    expect(original.personalDeck).toEqual([]);
    expect(original.personalDiscard).toEqual([]);
    expect(allCardIds(original)).toEqual(idsBefore);
  });

  test("does not draw beyond the four-card hand limit", () => {
    const game = state({
      personalDeck: [
        card("2", "hearts", "two", false),
        card("3", "hearts", "three", false),
      ],
      hand: [
        card("4", "hearts", "one"),
        card("4", "clubs", "two-in-hand"),
        card("4", "diamonds", "three-in-hand"),
      ],
    });

    cardCaptureRules.drawToHand(game);

    expect(game.hand).toHaveLength(4);
    expect(game.personalDeck).toHaveLength(1);
  });

  test("starts another enemy phase while enemy cards remain", () => {
    const game = state({
      enemyDeck: [card("6", "clubs", "enemy")],
      selectedHandIds: ["selected"],
      selectedEnemyIdx: 2,
    });

    cardCaptureRules.finalizeRoundOrWin(game);

    expect(game.phase).toBe("enemyPhase");
    expect(game.ended).toBe(false);
    expect(game.selectedHandIds).toEqual([]);
    expect(game.selectedEnemyIdx).toBeNull();
  });

  test("wins an empty enemy board unless a combatant was captured", () => {
    const won = state();
    cardCaptureRules.finalizeRoundOrWin(won);
    expect(won).toMatchObject({ ended: true, phase: "gameOver", won: true });

    const lost = state({
      enemyCapturePile: [card("A", "clubs", "captured-ace", false)],
    });
    cardCaptureRules.finalizeRoundOrWin(lost);
    expect(lost).toMatchObject({ ended: true, phase: "gameOver", won: false });
  });

  test("captures an enemy with selected matching cards and conserves cards", () => {
    const target = card("7", "hearts", "target");
    const selected = [
      card("3", "hearts", "three"),
      card("4", "hearts", "four"),
    ];
    const game = state({
      enemyDeck: [card("8", "clubs", "remaining")],
      enemyRow: [null, target, null, null],
      hand: [...selected, card("2", "clubs", "kept")],
      selectedHandIds: selected.map(({ id }) => id),
      selectedEnemyIdx: 1,
    });
    const idsBefore = allCardIds(game);

    expect(
      cardCaptureRules.executeCaptureAction(game, 1, game.selectedHandIds),
    ).toBe("applied");

    expect(game.hand.map(({ id }) => id)).toEqual(["kept"]);
    expect(game.personalDiscard).toHaveLength(3);
    expect(game.personalDiscard.every(({ faceUp }) => !faceUp)).toBe(true);
    expect(game.enemyRow[1]).toBeNull();
    expect(game.phase).toBe("enemyPhase");
    expect(allCardIds(game)).toEqual(idsBefore);
  });

  test("rejects an invalid capture without mutating state", () => {
    const game = state({
      enemyRow: [card("9", "hearts", "target"), null, null, null],
      hand: [card("4", "hearts", "four")],
    });
    const before = structuredClone(game);

    expect(cardCaptureRules.executeCaptureAction(game, 0, ["four"])).toBe(
      "invalid-capture",
    );
    expect(game).toEqual(before);
  });

  test("enemy capture loses immediately when either card is a combatant", () => {
    const game = state({
      enemyRow: [null, null, null, card("K", "clubs", "enemy-king")],
      hand: [card("2", "hearts", "player")],
      selectedHandIds: ["player"],
    });

    expect(cardCaptureRules.executeEnemyCaptureAction(game, "player")).toBe(
      "applied",
    );
    expect(game).toMatchObject({ ended: true, won: false, phase: "gameOver" });
    expect(game.enemyCapturePile).toHaveLength(2);
    expect(game.selectedHandIds).toEqual([]);
  });

  test("sacrifice returns the enemy to the deck and captures two player cards", () => {
    const target = card("9", "diamonds", "target");
    const sacrificed = [
      card("2", "hearts", "first"),
      card("3", "clubs", "second"),
    ];
    const game = state({
      enemyRow: [null, target, null, null],
      hand: sacrificed,
      selectedHandIds: sacrificed.map(({ id }) => id),
      selectedEnemyIdx: 1,
    });
    const idsBefore = allCardIds(game);

    expect(
      cardCaptureRules.executeSacrificeAction(game, 1, game.selectedHandIds),
    ).toBe("applied");
    expect(game.enemyDeck.map(({ id }) => id)).toEqual(["target"]);
    expect(game.enemyCapturePile).toHaveLength(2);
    expect(game.hand).toEqual([]);
    expect(game.phase).toBe("enemyPhase");
    expect(allCardIds(game)).toEqual(idsBefore);
  });

  test("rejects sacrificing a combatant and clears stale selections", () => {
    const game = state({
      enemyRow: [card("8", "diamonds", "target"), null, null, null],
      hand: [card("A", "hearts", "ace"), card("2", "clubs", "two")],
      selectedHandIds: ["ace", "two"],
      selectedEnemyIdx: 0,
    });

    expect(
      cardCaptureRules.executeSacrificeAction(game, 0, game.selectedHandIds),
    ).toBe("combatant-sacrifice");
    expect(game.hand).toHaveLength(2);
    expect(game.enemyRow[0]?.id).toBe("target");
    expect(game.selectedHandIds).toEqual([]);
    expect(game.selectedEnemyIdx).toBeNull();
  });
});
