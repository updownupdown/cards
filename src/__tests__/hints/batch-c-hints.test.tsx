import { describe, expect, test } from "@jest/globals";
import "../../../jest/game-mocks";
import { card } from "../../../jest/game-harness";
import { seedRandomForEachTest } from "../../../jest/seeded-random";
import {
  chapterAndVerseRules,
  type ChapterAndVerseGameState,
  type ChapterAndVerseSettings,
} from "@/components/Games/ChapterAndVerse";
import {
  glazierRules,
  type GlazierGameState,
} from "@/components/Games/Glazier";
import {
  createInitialLoneJokerState,
  loneJokerRules,
  type LoneJokerGameState,
} from "@/components/Games/LoneJoker";
import {
  createDeck,
  shuffle,
  top,
  type PlayingCard,
} from "@/components/Cards/card-utils";
import type { Hint, HintTarget } from "@/hints/hint";
import { i18n } from "@/i18n";
import { produce } from "immer";

// Hint finders of Lone Joker, Chapter and Verse and Glazier, played out on
// their rules alone, many deals at a time: game-hints.test.tsx plays one
// deal of each through the screen.

seedRandomForEachTest(2024);

const STATS = process.env.HINT_STATS === "1";

function ids(step: HintTarget[] | undefined) {
  return (step ?? []).flatMap((target) =>
    "card" in target ? [target.card] : [],
  );
}

/** The cards a hint taps, in order (each step is one tap). */
function tappedCards(hint: Hint) {
  return hint.steps.flatMap((step) => ids(step));
}

function lastZone(hint: Hint) {
  const target = hint.steps.at(-1)?.[0];
  return target && "zone" in target ? target.zone : undefined;
}

// —— Glazier ——

function newGlazierGame(): GlazierGameState {
  let state: GlazierGameState = {
    deck: shuffle(createDeck()),
    kilns: [[], [], []],
    bench: [],
    frames: [[], [], [], []],
    window: glazierRules.emptyWindow(),
    shards: [],
    discard: [],
    round: 0,
    score: 0,
    ended: false,
    won: false,
  };
  state = produce(state, glazierRules.dealRound);
  return state;
}

/** Plays a Glazier deal by its hints; returns the final state. */
function playGlazier() {
  let state = newGlazierGame();
  for (let move = 0; move < 200 && !state.ended; move++) {
    const steps = glazierRules.buildAutoSteps(state);
    if (steps.length > 0) {
      state = steps[steps.length - 1].state;
      continue;
    }
    const hint = glazierRules.findHint(state, null);
    expect(hint).not.toBeNull();
    const zone = lastZone(hint!)!;
    const cell = /^cell-(\d)-(\d)$/.exec(zone);
    if (cell) {
      state = produce(state, (draft) => {
        glazierRules.setPane(draft, Number(cell[1]), Number(cell[2]));
      });
      continue;
    }
    const [cardId] = ids(hint!.steps[0]);
    const source = state.bench.some((pane) => pane.id === cardId)
      ? ("bench" as const)
      : state.kilns.findIndex((kiln) => kiln.some((p) => p.id === cardId));
    const pane = [...state.bench, ...state.kilns.flat()].find(
      (p) => p.id === cardId,
    )!;
    const target =
      zone === "shards" ? ("shards" as const) : Number(zone.split("-")[1]);
    if (target !== "shards") {
      expect(glazierRules.canFrameTake(state, target, pane.suit)).toBe(true);
    }
    state = produce(state, (draft) => {
      glazierRules.takeGroup(draft, source, pane.suit, target);
    });
  }
  expect(state.ended).toBe(true);
  return state;
}

describe("Glazier hints", () => {
  test("following the hints wins most deals", () => {
    const scores = Array.from({ length: 12 }, () => playGlazier().score);
    const wins = scores.filter((score) => score >= glazierRules.winScore);
    if (STATS) console.log("Glazier scores", scores.join(" "));
    expect(wins.length).toBeGreaterThanOrEqual(9);
  });

  test("a pane goes where it joins most of the window", () => {
    const state = structuredClone(newGlazierGame());
    const pane = card("5", "hearts");
    state.kilns = [[], [], []];
    state.bench = [];
    state.round = 2;
    state.window[1][0] = card("2", "spades");
    state.window[1][1] = card("3", "clubs");
    state.frames[1] = [card("4", "hearts"), pane];
    const hint = glazierRules.findHint(state, null)!;
    expect(hint.steps).toEqual([[{ card: pane.id }], [{ zone: "cell-1-2" }]]);
    expect(hint.message.note).toBe(
      i18n.t("games:glazier.hint.cell", { count: 3 }),
    );
  });

  test("a group already picked only needs its frame", () => {
    const state = structuredClone(newGlazierGame());
    const first = glazierRules.findHint(state, null)!;
    const [cardId] = ids(first.steps[0]);
    const pane = [...state.bench, ...state.kilns.flat()].find(
      (p) => p.id === cardId,
    )!;
    const source = state.kilns.findIndex((kiln) => kiln.includes(pane));
    const picked = glazierRules.findHint(state, {
      source: source === -1 ? "bench" : source,
      suit: pane.suit,
    })!;
    expect(picked.steps).toEqual(first.steps.slice(1));
  });
});

// —— Chapter and Verse ——

const BASE_SETTINGS: ChapterAndVerseSettings = {
  loyalPatrons: false,
  checkBack: false,
  superExclusive: false,
  vandals: 0,
};

function newChapterAndVerseGame() {
  return produce(
    chapterAndVerseRules.createInitialState(),
    chapterAndVerseRules.dealFromDiscard,
  );
}

/** Trades or passes as the game does, for the picks a hint taps. */
function playChapterAndVerseHint(
  state: ChapterAndVerseGameState,
  hint: Hint,
  settings: ChapterAndVerseSettings,
) {
  const taps = tappedCards(hint);
  const customer = top(state.line)!;
  const usedBook = top(state.usedBooks)!;
  const picked = [...new Set(taps)];
  const low = new Set(taps.filter((id, i) => taps.indexOf(id) !== i));
  const books = [...state.shelves, top(state.inventory)].filter(
    (book): book is PlayingCard => !!book && picked.includes(book.id),
  );
  const trading =
    hint.message.values?.label !== i18n.t("games:chapterAndVerse.pass");
  if (trading) {
    const value = chapterAndVerseRules.selectedOfferValue(
      books,
      usedBook,
      low,
      settings.superExclusive,
    );
    expect(value).toBe(
      chapterAndVerseRules.customerMoney(customer) +
        chapterAndVerseRules.bookValue(usedBook),
    );
  }
  return produce(state, (draft) => {
    draft.line.pop();
    draft.usedBooks.pop();
    if (trading) {
      for (const book of books) {
        if (book.suit === customer.suit) draft.guildScore += 1;
      }
      if (settings.loyalPatrons && books.length > 3) draft.guildScore += 1;
      draft.shelves = draft.shelves.map((book) =>
        book && picked.includes(book.id) ? null : book,
      );
      if (picked.includes(top(draft.inventory)?.id ?? "")) {
        draft.inventory.pop();
      }
      draft.inventory.unshift(usedBook);
    } else {
      const penalty = chapterAndVerseRules.customerPenalty(customer);
      if (draft.guildScore < penalty) {
        draft.ended = true;
        return;
      }
      draft.guildScore -= penalty;
    }
    draft.shelves = draft.shelves.map(
      (book) => book ?? draft.inventory.pop() ?? null,
    );
    draft.interactions += 1;
    if (draft.interactions === 12) {
      draft.ended = true;
      draft.won = true;
    }
  });
}

function playChapterAndVerse(settings: ChapterAndVerseSettings) {
  let state = newChapterAndVerseGame();
  while (!state.ended) {
    const hint = chapterAndVerseRules.findHint(state, settings, {
      selectedIds: [],
      aceAtOneIds: [],
    });
    expect(hint).not.toBeNull();
    state = playChapterAndVerseHint(state, hint!, settings);
  }
  return state;
}

describe("Chapter and Verse hints", () => {
  test.each([
    ["the basic rules", BASE_SETTINGS],
    [
      "every option",
      {
        ...BASE_SETTINGS,
        loyalPatrons: true,
        checkBack: true,
        superExclusive: true,
      },
    ],
  ])("following the hints keeps the job, with %s", (_, settings) => {
    const games = Array.from({ length: 30 }, () =>
      playChapterAndVerse(settings),
    );
    const wins = games.filter((game) => game.won);
    if (STATS) {
      console.log(
        "Chapter and Verse",
        wins.length,
        games.map((game) => game.guildScore).join(" "),
      );
    }
    expect(wins.length).toBeGreaterThanOrEqual(27);
  });

  test("an Ace sold for $1 is tapped twice, and picks are undone", () => {
    const state = structuredClone(newChapterAndVerseGame());
    const customer = card("J", "spades");
    const usedBook = card("2", "hearts");
    const ace = card("A", "clubs");
    const nine = card("9", "diamonds");
    const three = card("3", "diamonds");
    const eight = card("8", "spades");
    state.line = [customer];
    state.usedBooks = [usedBook];
    // $13 is 9 + 3 + the Ace at $1; the 8 is no part of it.
    state.shelves = [ace, nine, three, eight, null, null, null, null];
    const hint = chapterAndVerseRules.findHint(state, BASE_SETTINGS, {
      selectedIds: [eight.id, ace.id],
      aceAtOneIds: [],
    })!;
    expect(hint.message.values?.label).toBe(
      i18n.t("games:chapterAndVerse.trade"),
    );
    // In shelf order: the Ace from $11 to $1, the 9 and 3 on, the 8 off.
    expect(tappedCards(hint)).toEqual([ace.id, nine.id, three.id, eight.id]);
    expect(lastZone(hint)).toBe("buttons");
  });

  test("books in the customer's suit are sold first", () => {
    const state = structuredClone(newChapterAndVerseGame());
    state.line = [card("Q", "hearts")];
    state.usedBooks = [card("3", "clubs")];
    const hearts = [card("10", "hearts"), card("5", "hearts")];
    state.shelves = [
      card("10", "spades"),
      card("5", "diamonds"),
      ...hearts,
      null,
      null,
      null,
      null,
    ];
    const hint = chapterAndVerseRules.findHint(state, BASE_SETTINGS, {
      selectedIds: [],
      aceAtOneIds: [],
    })!;
    expect(tappedCards(hint).sort()).toEqual(hearts.map((b) => b.id).sort());
  });

  test("with no trade to make, pass", () => {
    const state = structuredClone(newChapterAndVerseGame());
    state.line = [card("K", "hearts")];
    state.usedBooks = [card("10", "clubs")];
    state.shelves = [
      card("2", "spades"),
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    ];
    const hint = chapterAndVerseRules.findHint(state, BASE_SETTINGS, {
      selectedIds: [],
      aceAtOneIds: [],
    })!;
    expect(hint.message.values?.label).toBe(
      i18n.t("games:chapterAndVerse.pass"),
    );
  });
});

// —— Lone Joker ——

function newLoneJokerGame() {
  const state = createInitialLoneJokerState();
  state.deck = shuffle(state.deck);
  loneJokerRules.dealFromDiscard(state);
  return state;
}

/** Plays a hint as the screen would; false when the game is over. */
function playLoneJokerHint(state: LoneJokerGameState, hint: Hint) {
  const label = hint.message.values?.label;
  const bonus = (
    Object.keys(
      loneJokerRules.bonusDetails,
    ) as (keyof typeof loneJokerRules.bonusDetails)[]
  ).find((name) => i18n.t(`games:loneJoker.bonuses.${name}`) === label);
  if (bonus && state.phase === "shop") {
    expect(loneJokerRules.buyBonus(state, bonus)).toBe(true);
  } else if (bonus) {
    expect(loneJokerRules.activateBonus(state, bonus)).toBe(true);
  } else if (state.phase === "shop") {
    loneJokerRules.prepareNextRound(state);
    loneJokerRules.dealFromDiscard(state);
  } else {
    const taps = new Set(tappedCards(hint));
    const picked = state.hand.filter((c) => taps.has(c.id));
    const joker = !!state.bankedJokerCard && taps.has(state.bankedJokerCard.id);
    expect(picked.length + (joker ? 1 : 0)).toBeLessThanOrEqual(5);
    state.hand = state.hand.filter((c) => !taps.has(c.id));
    state.discard.push(...picked);
    if (label === i18n.t("cards:discardAction")) {
      expect(state.discardsRemaining).toBeGreaterThan(0);
      state.discardsRemaining -= 1;
      loneJokerRules.drawToLimit(state);
    } else {
      expect(label).toBe(i18n.t("cards:play"));
      let { points } = loneJokerRules.scorePokerHand([
        ...picked,
        ...(joker ? [state.bankedJokerCard!] : []),
      ]);
      if (state.doubleNextPlay) points *= 2;
      state.doubleNextPlay = false;
      if (joker) {
        state.discard.push(state.bankedJokerCard!);
        state.bankedJoker = false;
        state.bankedJokerCard = null;
      }
      state.roundScore += points;
      state.playsRemaining -= 1;
      if (state.playsRemaining === 0) loneJokerRules.finishRound(state);
      else loneJokerRules.drawToLimit(state);
    }
  }
  return !state.ended;
}

function playLoneJoker() {
  const state = newLoneJokerGame();
  for (let move = 0; move < 2000; move++) {
    const hint = loneJokerRules.findHint(state, [], false);
    expect(hint).not.toBeNull();
    if (!playLoneJokerHint(state, hint!)) break;
  }
  expect(state.ended).toBe(true);
  return state;
}

describe("Lone Joker hints", () => {
  test("hands score as the game scores them", () => {
    for (let deal = 0; deal < 300; deal++) {
      const cards = shuffle(createDeck()).slice(0, 1 + (deal % 5));
      const wilds = deal % 3 === 0 && cards.length < 5 ? 1 : 0;
      const joker = { ...card("Joker", "spades"), rank: "Joker" as const };
      expect(loneJokerRules.bestHandPoints(cards, wilds)).toBe(
        loneJokerRules.scorePokerHand(wilds ? [...cards, joker] : cards).points,
      );
    }
  });

  test("following the hints survives rounds and often wins", () => {
    const games = Array.from({ length: 8 }, playLoneJoker);
    const wins = games.filter((game) => game.won);
    if (STATS) {
      console.log(
        "Lone Joker",
        wins.length,
        games.map((game) => `${game.round - 1}:${game.totalExcess}`).join(" "),
      );
    }
    expect(games.every((game) => game.round > 4)).toBe(true);
    expect(wins.length).toBeGreaterThanOrEqual(3);
  });

  test("a made flush is played, topped up to five cards", () => {
    const state = newLoneJokerGame();
    const flush = ["2", "5", "9", "J", "K"].map((rank) =>
      card(rank as PlayingCard["rank"], "hearts"),
    );
    state.hand = [
      ...flush,
      card("3", "clubs"),
      card("7", "spades"),
      card("8", "diamonds"),
    ];
    state.discardsRemaining = 0;
    const hint = loneJokerRules.findHint(state, [], false)!;
    expect(hint.message.values?.label).toBe(i18n.t("cards:play"));
    expect(tappedCards(hint).sort()).toEqual(flush.map((c) => c.id).sort());
  });

  test("the Joker is kept for a hand it improves", () => {
    const state = newLoneJokerGame();
    state.discardsRemaining = 0;
    state.hand = [
      card("K", "hearts"),
      card("K", "clubs"),
      card("2", "spades"),
      card("5", "diamonds"),
      card("9", "clubs"),
      card("J", "hearts"),
    ];
    const joker = { ...card("Joker", "spades"), rank: "Joker" as const };
    state.bankedJoker = true;
    state.bankedJokerCard = joker;
    // A Joker makes these Kings three of a kind: worth playing it.
    expect(loneJokerRules.bestPlay(state)).toMatchObject({
      joker: true,
      points: loneJokerRules.handPoints["Three of a Kind"],
    });
    // A flush is no better for a Joker standing in for a fifth heart.
    state.hand = ["2", "5", "9", "J", "K"].map((rank) =>
      card(rank as PlayingCard["rank"], "hearts"),
    );
    expect(loneJokerRules.bestPlay(state)).toMatchObject({
      joker: false,
      points: loneJokerRules.handPoints.Flush,
    });
  });

  test("picks not in the hand to play are undone first", () => {
    const state = newLoneJokerGame();
    state.discardsRemaining = 0;
    const play = loneJokerRules.bestPlay(state)!;
    const stray = state.hand.find((c) => !play.cards.includes(c))!;
    const hint = loneJokerRules.findHint(state, [stray.id], false)!;
    expect(tappedCards(hint)[0]).toBe(stray.id);
  });

  test("the shop sells one bonus a visit, then starts the round", () => {
    const state = newLoneJokerGame();
    state.phase = "shop";
    state.roundScore = targetPlus(state, 120);
    state.shopPoints = 120;
    const hint = loneJokerRules.findHint(state, [], false)!;
    expect(hint.message.values?.label).toBe(
      i18n.t("games:loneJoker.bonuses.doubleScore"),
    );
    loneJokerRules.buyBonus(state, "doubleScore");
    expect(
      loneJokerRules.findHint(state, [], false)!.message.values?.label,
    ).toBe(i18n.t("games:loneJoker.startRound", { value: state.round + 1 }));
  });
});

function targetPlus(state: LoneJokerGameState, excess: number) {
  return loneJokerRules.targetForRound(state.round) + excess;
}
