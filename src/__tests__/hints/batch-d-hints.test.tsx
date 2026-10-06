import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from "@jest/globals";
import "../../../jest/game-mocks";
import {
  card,
  harness,
  mappedCards,
  outcome,
  pressButton,
  renderGame,
  setGameSettings,
  settle,
} from "../../../jest/game-harness";
import {
  fieldCommandRules,
  type FieldCommandGameState,
} from "@/components/Games/FieldCommand";
import {
  nightVigilRules,
  type NightVigilGameState,
  type NightVigilThreat,
} from "@/components/Games/NightVigil";
import {
  twelveTrialsRules,
  type TwelveTrialsGameState,
  type TwelveTrialsHintOptions,
  type TwelveTrialsSlot,
} from "@/components/Games/TwelveTrials";
import type { PlayingCard } from "@/components/Cards/card-utils";
import { getGameComponentByPath } from "@/data/games-router";
import { requestHint } from "@/hints/hint-store";
import type { Hint, HintTarget } from "@/hints/hint";
import { act } from "react-test-renderer";

// The hint finders of Twelve Trials, Night Vigil and Field Command, on
// positions a deal may never reach, and played through with the rules
// game-hints.test.tsx doesn't try (Twelve Trials' reserve, Kings and
// boomer Aces; Night Vigil's hardest city).

function cardIds(hint: Hint | null) {
  return (hint?.steps ?? []).flatMap((step) =>
    step.flatMap((target) => ("card" in target ? [target.card] : [])),
  );
}

function zoneIds(hint: Hint | null) {
  return (hint?.steps ?? []).flatMap((step) =>
    step.flatMap((target) => ("zone" in target ? [target.zone] : [])),
  );
}

// —— Field Command ——

function fieldCommand(
  overrides: Partial<FieldCommandGameState>,
): FieldCommandGameState {
  return {
    personalDeck: [],
    personalDiscard: [],
    enemyDeck: [card("9", "spades", false)],
    enemyRow: [null, null, null, null],
    enemyCapturePile: [],
    hand: [],
    phase: "capturePhase",
    selectedHandIds: [],
    selectedEnemyIdx: null,
    ended: false,
    won: false,
    ...overrides,
  };
}

describe("Field Command hints", () => {
  test("captures with as few cards as it takes", () => {
    const two = card("2", "hearts");
    const three = card("3", "hearts");
    const four = card("4", "hearts");
    const joker: PlayingCard = {
      id: "joker-a",
      suit: "spades",
      rank: "Joker",
      faceUp: true,
    };
    const five = card("5", "hearts");
    const state = fieldCommand({
      hand: [two, three, four, joker],
      enemyRow: [null, card("7", "clubs"), five, card("6", "spades")],
    });
    const hint = fieldCommandRules.findHint(state);
    expect(hint?.message.values?.label).toBe("Capture");
    // 4 + 2 or 3 + 2 would do; never the joker.
    expect(cardIds(hint)).toHaveLength(3);
    expect(cardIds(hint)).toContain(five.id);
    expect(cardIds(hint)).not.toContain(joker.id);
    expect(zoneIds(hint)).toEqual(["actions"]);
  });

  test("undoes picks the capture doesn't want", () => {
    const two = card("2", "hearts");
    const three = card("3", "hearts");
    const stray = card("4", "clubs");
    const target = card("5", "hearts");
    const state = fieldCommand({
      hand: [two, three, stray],
      enemyRow: [null, null, card("8", "spades"), target],
      selectedHandIds: [stray.id, two.id],
      selectedEnemyIdx: 3,
    });
    expect(cardIds(fieldCommandRules.findHint(state))).toEqual([
      stray.id,
      three.id,
    ]);
  });

  test("lets the enemy take the cheapest card when nothing captures", () => {
    const two = card("2", "clubs");
    const four = card("4", "hearts");
    const state = fieldCommand({
      hand: [four, two],
      enemyRow: [null, null, card("K", "spades"), card("9", "spades")],
    });
    const hint = fieldCommandRules.findHint(state);
    expect(hint?.message.values?.label).toBe("Let Capture");
    expect(cardIds(hint)).toEqual([two.id]);
    expect(hint?.message.note).toBeTruthy();
  });

  test("sends a combatant up front back rather than lose to it", () => {
    const king = card("K", "spades");
    const two = card("2", "clubs");
    const three = card("3", "diamonds");
    const four = card("4", "hearts");
    const state = fieldCommand({
      hand: [four, two, three],
      enemyRow: [null, null, card("9", "spades"), king],
    });
    const hint = fieldCommandRules.findHint(state);
    expect(hint?.message.values?.label).toBe("Sacrifice");
    expect(cardIds(hint).sort()).toEqual([two.id, three.id, king.id].sort());
  });

  test("keeps a hand that captures, and throws back one that can't", () => {
    const fiveHearts = card("5", "hearts");
    const keep = fieldCommand({
      phase: "discardPhase",
      hand: [card("2", "hearts"), card("3", "hearts"), card("4", "hearts")],
      enemyRow: [null, null, card("9", "clubs"), fiveHearts],
      personalDeck: [card("2", "clubs", false), card("3", "clubs", false)],
    });
    expect(fieldCommandRules.findHint(keep)?.message.values?.label).toBe(
      "Done Discarding",
    );

    // Lone spades against an all-hearts line: draw for hearts instead.
    const spade = card("2", "spades");
    const swap = fieldCommand({
      phase: "discardPhase",
      hand: [spade, card("4", "hearts")],
      enemyRow: [null, null, card("6", "hearts"), card("6", "diamonds")],
      personalDeck: [
        card("2", "hearts", false),
        card("3", "diamonds", false),
        card("4", "diamonds", false),
        card("2", "diamonds", false),
      ],
    });
    const hint = fieldCommandRules.findHint(swap);
    expect(hint?.message.key).toBe("moveCard");
    expect(cardIds(hint)).toEqual([spade.id]);
    expect(zoneIds(hint)).toEqual(["personal-discard"]);
  });
});

// —— Twelve Trials ——

const NO_UI: TwelveTrialsHintOptions = {
  boomer: false,
  abilitiesOn: false,
  selected: null,
  reservePick: [],
  selectedKing: null,
  kingMode: null,
};

function slot(
  monster: PlayingCard,
  x: number,
  placed: PlayingCard[] = [],
): TwelveTrialsSlot {
  return {
    monster,
    row: 0,
    x,
    defeated: false,
    placed: placed.map((attacker) => ({ card: attacker, role: "attack" })),
  };
}

function twelveTrials(
  overrides: Partial<TwelveTrialsGameState>,
): TwelveTrialsGameState {
  // A deck of every power card not in play, face down.
  const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10"] as const;
  const suits = ["hearts", "diamonds", "clubs", "spades"] as const;
  const used = new Set(
    [
      ...(overrides.hand ?? []),
      ...(overrides.slots ?? []).flatMap((s) => s.placed.map((p) => p.card)),
    ].map((c) => `${c.rank}${c.suit}`),
  );
  const deck = suits.flatMap((suit) =>
    ranks
      .filter((rank) => !used.has(`${rank}${suit}`))
      .map((rank) => card(rank, suit, false)),
  );
  return {
    slots: [],
    deck,
    hand: [],
    reserve: [],
    damage: 0,
    discard: [],
    kings: [],
    reserveSetup: false,
    ended: false,
    won: false,
    ...overrides,
  };
}

describe("Twelve Trials hints", () => {
  test("finishes a monster with a trigger of its suit", () => {
    const queen = card("Q", "hearts");
    const trigger = card("2", "hearts");
    const state = twelveTrials({
      slots: [
        slot(queen, 0, [card("10", "clubs"), card("5", "spades")]),
        slot(card("J", "clubs"), 1),
      ],
      hand: [trigger],
    });
    const hint = twelveTrialsRules.findHint(state, NO_UI);
    expect(hint?.message.key).toBe("moveCard");
    expect(cardIds(hint)).toEqual([trigger.id, queen.id]);
  });

  test("doesn't start an attack no card to come can finish", () => {
    const king = card("K", "spades");
    const two = card("2", "clubs");
    const state = twelveTrials({ slots: [slot(king, 0)], hand: [two] });
    // Nothing left is worth 11: a 2 on the King would leave it unbeatable.
    state.deck = state.deck.filter((c) => !["10", "9"].includes(c.rank));
    const hint = twelveTrialsRules.findHint(state, NO_UI);
    expect(hint?.message.values?.label).toBe("Discard");
    expect(cardIds(hint)).toEqual([two.id]);
  });

  test("skips tapping the card already picked", () => {
    const queen = card("Q", "hearts");
    const trigger = card("2", "hearts");
    const state = twelveTrials({
      slots: [slot(queen, 0, [card("10", "clubs"), card("5", "spades")])],
      hand: [trigger],
    });
    const hint = twelveTrialsRules.findHint(state, {
      ...NO_UI,
      selected: { zone: "hand", index: 0 },
    });
    expect(cardIds(hint)).toEqual([queen.id]);
  });

  test("picks two cards for the reserve, then sets it", () => {
    const hand = [
      card("10", "spades"),
      card("2", "hearts"),
      card("3", "clubs"),
      card("9", "diamonds"),
      card("4", "spades"),
    ];
    const state = twelveTrials({
      slots: [
        slot(card("J", "hearts"), 0),
        slot(card("Q", "clubs"), 1),
        slot(card("K", "diamonds"), 2),
      ],
      hand,
      reserveSetup: true,
    });
    const hint = twelveTrialsRules.findHint(state, NO_UI);
    expect(hint?.message.values?.label).toBe("Set Reserve (2/2)");
    expect(cardIds(hint)).toHaveLength(2);
    expect(zoneIds(hint)).toEqual(["controls"]);
  });
});

// —— Night Vigil ——

function threat(
  threatCard: PlayingCard,
  responses: PlayingCard[] = [],
): NightVigilThreat {
  return { card: threatCard, responses, smoked: false };
}

function nightVigil(
  overrides: Partial<NightVigilGameState>,
): NightVigilGameState {
  const ranks = ["2", "3", "4", "5", "6", "7", "8", "9"] as const;
  return {
    encounterDeck: [card("Q", "clubs", false)],
    playDeck: (["clubs", "diamonds"] as const).flatMap((suit) =>
      ranks.map((rank) => card(rank, suit, false)),
    ),
    discard: [],
    trackers: [],
    currentEncounter: card("J", "spades"),
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
    ...overrides,
  };
}

describe("Night Vigil hints", () => {
  test("a response goes on the Threat it clears", () => {
    const state = nightVigil({
      threats: [
        threat(card("9", "hearts")),
        threat(card("7", "hearts"), [card("2", "spades")]),
        threat(card("8", "hearts"), [card("3", "spades")]),
        threat(card("5", "hearts"), [card("2", "hearts")]),
      ],
      currentResponse: card("9", "spades"),
      responsesDrawn: 4,
    });
    expect(zoneIds(nightVigilRules.findHint(state))).toEqual(["threat-0"]);
  });

  test("resolves once every Threat is cleared", () => {
    const state = nightVigil({
      threats: [
        threat(card("5", "hearts"), [card("5", "spades")]),
        threat(card("3", "hearts"), [card("4", "spades")]),
        threat(card("6", "hearts"), [card("6", "spades")]),
        threat(card("2", "hearts"), [card("2", "spades")]),
      ],
      responsesDrawn: 4,
    });
    expect(nightVigilRules.findHint(state)?.message.values?.label).toBe(
      "Resolve",
    );
  });

  test("draws while Threats are open", () => {
    const state = nightVigil({
      threats: [
        threat(card("5", "hearts")),
        threat(card("3", "hearts")),
        threat(card("6", "hearts")),
        threat(card("2", "hearts")),
      ],
    });
    expect(nightVigilRules.findHint(state)?.message.key).toBe("draw");
  });

  test("smokes a Threat only a card that's gone would fit", () => {
    // Every 10 is gone: nothing will clear the 10 but the Smoke Bomb, and
    // the Queen would add a damage to it.
    const ten = card("10", "hearts");
    const state = nightVigil({
      difficulty: "city",
      currentEncounter: card("Q", "spades"),
      threats: [
        threat(ten),
        threat(card("4", "hearts"), [card("4", "spades")]),
        threat(card("5", "hearts"), [card("5", "spades")]),
        threat(card("6", "hearts"), [card("6", "spades")]),
      ],
      currentResponse: card("2", "spades"),
      responsesDrawn: 4,
    });
    const hint = nightVigilRules.findHint(state);
    expect(hint?.message.values?.label).toBe("Smoke Bomb on 10♥");
    expect(zoneIds(hint)).toEqual(["smoke-0"]);
  });
});

// —— Playing through ——

beforeEach(() => {
  jest.useFakeTimers();
});

/** Deals are seeded, so a failure replays. */
function seedDeals(seed: number) {
  let state = seed;
  jest.spyOn(Math, "random").mockImplementation(() => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  });
}

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

/** Taps a target as Autopilot does (see CardMap's tapHint). */
async function tap(target: HintTarget, hint: Hint) {
  const press = async (onPress: (() => void) | undefined) => {
    if (!onPress) return false;
    await act(async () => onPress());
    await settle(8);
    return true;
  };
  const config = harness.mapConfig!;
  const cards = mappedCards();
  if ("card" in target) {
    const mapped = cards.find((c) => c.card.id === target.card);
    expect(mapped).toBeDefined();
    await press(config.cardMapper(mapped!)?.onPress);
    return;
  }
  const top = cards.filter((c) => c.zoneId === target.zone).at(-1);
  if (top && (await press(config.cardMapper(top)?.onPress))) return;
  const zone = config.zones.find((z) => z.id === target.zone);
  expect(zone).toBeDefined();
  if (await press(config.zoneMapper?.(zone!)?.onPress)) return;
  await pressButton(harness.renderer!, String(hint.message.values?.label));
}

/** Follows hints to the end of the game; returns how many it took. */
async function playOut(limit: number) {
  let moves = 0;
  while (outcome() === "playing" && moves < limit) {
    let hint: Hint | null = null;
    await act(async () => {
      hint = requestHint();
    });
    expect({ moves, hint: hint !== null }).toEqual({ moves, hint: true });
    for (const step of hint!.steps) {
      for (const target of step) await tap(target, hint!);
    }
    moves += 1;
  }
  return moves;
}

describe("Hints play a game through", () => {
  test.each([1, 2])(
    "Twelve Trials with a reserve, Kings and boomer Aces (deal %i)",
    async (deal) => {
      seedDeals(deal);
      await setGameSettings("/twelve-trials", {
        powerReserve: true,
        specialAbilities: true,
        boomerAce: true,
      });
      await renderGame(
        "/twelve-trials",
        getGameComponentByPath("/twelve-trials")!,
      );
      await playOut(150);
      expect(outcome()).not.toBe("playing");
      await setGameSettings("/twelve-trials", {
        powerReserve: false,
        specialAbilities: false,
        boomerAce: false,
      });
    },
  );

  test("Night Vigil in the city", async () => {
    seedDeals(3);
    await setGameSettings("/night-vigil", { nightVigilDifficulty: "city" });
    await renderGame("/night-vigil", getGameComponentByPath("/night-vigil")!);
    await playOut(200);
    expect(outcome()).not.toBe("playing");
    await setGameSettings("/night-vigil", { nightVigilDifficulty: "kingpin" });
  });
});
