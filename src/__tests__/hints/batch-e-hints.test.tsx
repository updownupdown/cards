import { describe, expect, test } from "@jest/globals";
import "../../../jest/game-mocks";
import { card } from "../../../jest/game-harness";
import {
  boilingOverRules,
  type BoilingOverGameState,
} from "@/components/Games/BoilingOver";
import {
  infiltratorRules,
  type InfiltratorGameState,
} from "@/components/Games/Infiltrator";
import { somnusRules, type SomnusGameState } from "@/components/Games/Somnus";
import type { PlayingCard } from "@/components/Cards/card-utils";
import type { Hint } from "@/hints/hint";
import { i18n } from "@/i18n";

// The hint finders of Somnus, Infiltrator and Boiling Over, on positions a
// few deals may never reach. Their hints play out in game-hints.test.tsx.

function tappedCards(hint: Hint | null) {
  return (hint?.steps ?? []).flatMap((step) =>
    step.flatMap((target) => ("card" in target ? [target.card] : [])),
  );
}

describe("Boiling Over hints", () => {
  const brewing = (
    deck: PlayingCard[],
    cauldron: PlayingCard[] = [],
    round = 1,
  ): BoilingOverGameState => ({
    ...boilingOverRules.createInitialState(),
    deck,
    cauldron,
    round,
  });

  test("starts a potion by adding a card", () => {
    const hint = boilingOverRules.findHint(
      brewing([card("2", "clubs", false), card("5", "hearts", false)]),
    );
    expect(hint?.message.key).toBe("draw");
  });

  test("stops when the next card would surely boil over", () => {
    const state = brewing(
      [card("3", "spades", false), card("2", "clubs", false)],
      [card("3", "clubs"), card("2", "spades"), card("9", "hearts")],
    );
    const hint = boilingOverRules.findHint(state);
    expect(hint?.message).toMatchObject({
      key: "press",
      values: { label: i18n.t("games:boilingOver.stop") },
    });
  });

  test("adds a card that shows face up and can't hurt", () => {
    const state = brewing(
      [card("3", "spades", false), card("8", "hearts", true)],
      [card("3", "clubs"), card("2", "spades"), card("9", "hearts")],
    );
    expect(boilingOverRules.findHint(state)?.message.key).toBe("draw");
  });

  test("keeps the points of a boiled-over potion late in the game", () => {
    const state: BoilingOverGameState = {
      ...brewing([], [card("K", "hearts"), card("3", "clubs")], 8),
      phase: "boiledOver",
    };
    expect(boilingOverRules.findHint(state)?.message.values?.label).toBe(
      i18n.t("games:boilingOver.keepPoints", { value: 13 }),
    );
  });

  test("buys the best card the coins allow, then moves on", () => {
    const state: BoilingOverGameState = {
      ...brewing([]),
      phase: "market",
      coins: 9,
    };
    // Nine coins buy no two cards: the best one, a 9♥.
    expect(boilingOverRules.bestBuy(state)).toMatchObject({
      rank: "9",
      suit: "hearts",
    });

    state.coins = 20;
    const buy = boilingOverRules.bestBuy(state)!;
    const row = boilingOverRules.MARKET_SUITS.indexOf(buy.suit);
    boilingOverRules.buyCard(state, row, state.market[row].indexOf(buy));
    // The second card, of another suit, spends what's left.
    const second = boilingOverRules.bestBuy(state)!;
    expect(second.suit).not.toBe(buy.suit);
    expect(boilingOverRules.costOf(buy) + boilingOverRules.costOf(second)).toBe(
      20,
    );
    const row2 = boilingOverRules.MARKET_SUITS.indexOf(second.suit);
    boilingOverRules.buyCard(state, row2, state.market[row2].indexOf(second));
    expect(boilingOverRules.findHint(state)?.message.values?.label).toBe(
      i18n.t("games:boilingOver.continueToRound", { round: 2 }),
    );
  });
});

describe("Infiltrator hints", () => {
  const game = (
    spy: PlayingCard,
    hand: PlayingCard[],
    extra: Partial<InfiltratorGameState> = {},
  ): InfiltratorGameState => ({
    spyDeck: [card("6", "clubs"), card("7", "diamonds"), spy],
    spyDiscard: [],
    neutralizedSpies: [],
    recruitedSpies: [],
    drawDeck: [card("2", "hearts", false), card("4", "spades", false)],
    drawDiscard: [card("A", "clubs")],
    hand,
    selectedCards: [],
    phase: "action",
    ended: false,
    won: false,
    winLoseMessage: null,
    ...extra,
  });

  test("recruits with cards of the spy's suit", () => {
    const [h3, h4, s2, c4] = [
      card("3", "hearts"),
      card("4", "hearts"),
      card("2", "spades"),
      card("4", "clubs"),
    ];
    const hint = infiltratorRules.findHint(
      game(card("6", "hearts"), [h3, h4, s2, c4]),
    );
    expect(hint?.message.values?.label).toBe(
      i18n.t("games:infiltrator.recruit"),
    );
    expect(tappedCards(hint).sort()).toEqual([h3.id, h4.id].sort());
  });

  test("a Double Agent recruits with any suit", () => {
    const [ace, s3, c4] = [
      card("A", "hearts"),
      card("3", "spades"),
      card("4", "clubs"),
    ];
    const hint = infiltratorRules.findHint(
      game(card("7", "hearts"), [ace, s3, c4]),
    );
    expect(hint?.message.values?.label).toBe(
      i18n.t("games:infiltrator.recruit"),
    );
    expect(hint?.message.note).toBe(
      i18n.t("games:infiltrator.hint.doubleAgent"),
    );
  });

  test("counters what it can't recruit, unpicking cards it doesn't need", () => {
    const [s4, c3, d2] = [
      card("4", "spades"),
      card("3", "clubs"),
      card("2", "diamonds"),
    ];
    const state = game(card("7", "hearts"), [s4, c3, d2], {
      selectedCards: [d2],
    });
    const hint = infiltratorRules.findHint(state);
    expect(hint?.message.values?.label).toBe(
      i18n.t("games:infiltrator.counter"),
    );
    // 4 + 3 is a minimal counter: the 2 picked comes off.
    expect(tappedCards(hint).sort()).toEqual([s4.id, c3.id, d2.id].sort());
  });

  test("assassinates when the hand can't reach the spy", () => {
    const hint = infiltratorRules.findHint(
      game(card("K", "spades"), [card("2", "hearts"), card("3", "clubs")]),
    );
    expect(hint?.message.values?.label).toBe(
      i18n.t("games:infiltrator.assassinate"),
    );
  });

  test("retires a low pair, keeps Aces and Key Spies", () => {
    const pair = [card("2", "hearts"), card("2", "clubs")];
    const deck = Array.from({ length: 12 }, () => card("8", "spades", false));
    const state = game(
      card("6", "hearts"),
      [...pair, card("A", "hearts"), card("A", "spades")],
      { phase: "retire", drawDeck: deck },
    );
    const hint = infiltratorRules.findHint(state);
    expect(hint?.message.key).toBe("removeCards");
    expect(tappedCards(hint).sort()).toEqual(pair.map((c) => c.id).sort());

    const keep = game(
      card("6", "hearts"),
      [card("Q", "hearts"), card("Q", "spades"), card("A", "hearts")],
      { phase: "retire", drawDeck: deck },
    );
    expect(infiltratorRules.findHint(keep)?.message.values?.label).toBe(
      i18n.t("games:infiltrator.skip"),
    );
  });
});

describe("Somnus hints", () => {
  const game = (
    board: (PlayingCard | null)[],
    hand: PlayingCard[],
    extra: Partial<SomnusGameState> = {},
  ): SomnusGameState => ({
    dreamDeck: [card("9", "spades", false)],
    dreamDiscard: [],
    board,
    assignments: [[], [], []],
    guardianDeck: [card("6", "hearts", false)],
    guardianDiscard: [],
    hand,
    removedGuardians: [],
    removedNightmares: [],
    life: 40,
    playedThisTurn: false,
    exileUsedThisTurn: false,
    remSleepUsed: false,
    turn: 1,
    ended: false,
    won: false,
    winLoseMessage: "",
    ...extra,
  });

  test("eliminates a Nightmare it can beat", () => {
    const [h4, d3] = [card("4", "hearts"), card("3", "diamonds")];
    const nightmare = card("6", "spades");
    const hint = somnusRules.findHint(
      game([null, null, nightmare], [h4, d3]),
      [],
      null,
    );
    expect(hint?.message).toMatchObject({
      values: { label: i18n.t("games:somnus.assign") },
      note: i18n.t("games:somnus.hint.eliminate"),
    });
    expect(tappedCards(hint).sort()).toEqual(
      [h4.id, d3.id, nightmare.id].sort(),
    );
  });

  test("taps only what isn't picked yet", () => {
    const [h4, d3] = [card("4", "hearts"), card("3", "diamonds")];
    const nightmare = card("6", "spades");
    const hint = somnusRules.findHint(
      game([null, null, nightmare], [h4, d3]),
      [h4.id],
      2,
    );
    expect(tappedCards(hint)).toEqual([d3.id]);
  });

  test("resolves once the hand is spent", () => {
    const hint = somnusRules.findHint(
      game([null, null, card("6", "spades")], [], { playedThisTurn: true }),
      [],
      null,
    );
    expect(hint?.message.values?.label).toBe(i18n.t("cards:resolve"));
  });

  test("REM Sleep when the board would end Alice", () => {
    const hint = somnusRules.findHint(
      game([card("K", "clubs"), card("Q", "spades"), card("J", "clubs")], [], {
        life: 9,
      }),
      [],
      null,
    );
    expect(hint?.message.values?.label).toBe(i18n.t("games:somnus.remSleep"));
  });

  test("no hint once the game is over", () => {
    expect(
      somnusRules.findHint(
        game([null, null, null], [], { ended: true }),
        [],
        null,
      ),
    ).toBeNull();
  });
});
