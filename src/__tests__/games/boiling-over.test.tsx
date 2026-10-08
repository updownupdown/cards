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
  outcome,
  pressButton,
  pressCardId,
  renderGame,
} from "../../../jest/game-harness";
import BoilingOver, {
  boilingOverRules,
  type BoilingOverGameState,
} from "@/components/Games/BoilingOver";
import type { PlayingCard } from "@/components/Cards/card-utils";

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

const { DUD_LIMIT, MARKET_SUITS, ROUNDS, WIN_SCORE } = boilingOverRules;

/** A position mid-brew. `deck` is listed top card first. */
function brewing(
  overrides: Partial<BoilingOverGameState> & { deckTopFirst?: PlayingCard[] },
): BoilingOverGameState {
  const { deckTopFirst = [], ...rest } = overrides;
  return {
    deck: [...deckTopFirst].reverse(),
    cauldron: [],
    market: MARKET_SUITS.map(() => []),
    round: 1,
    score: 0,
    coins: 0,
    bought: [],
    phase: "brewing",
    ...rest,
  };
}

describe("Boiling Over rules", () => {
  test("the deal gives six duds and five ingredients; the rest is for sale", () => {
    const state = boilingOverRules.createInitialState();

    expect(state.deck).toHaveLength(11);
    expect(state.deck.every((c) => !c.faceUp)).toBe(true);
    const duds = state.deck.filter(boilingOverRules.isDud);
    expect(duds).toHaveLength(6);
    expect(boilingOverRules.dudTotal(duds)).toBe(12);

    const forSale = state.market.flat();
    expect(forSale).toHaveLength(41);
    expect(forSale.some(boilingOverRules.isDud)).toBe(false);
    state.market.forEach((row, i) => {
      expect(row.every((c) => c.suit === MARKET_SUITS[i])).toBe(true);
    });
  });

  test("the potion boils over when the duds pass the limit", () => {
    const state = brewing({
      cauldron: [card("3", "spades"), card("3", "clubs"), card("9", "hearts")],
      deckTopFirst: [card("A", "spades"), card("2", "spades")],
    });

    expect(boilingOverRules.drawCard(state)).toBe("dud");
    expect(boilingOverRules.dudTotal(state.cauldron)).toBe(DUD_LIMIT);
    expect(boilingOverRules.drawCard(state)).toBe("boiledOver");
    expect(state.phase).toBe("boiledOver");
  });

  test("bust risk counts the duds that would boil the potion over", () => {
    const state = brewing({
      cauldron: [card("3", "spades"), card("3", "clubs")],
      deckTopFirst: [
        card("A", "spades", false),
        card("2", "spades", false),
        card("5", "hearts", false),
        card("2", "clubs", false),
      ],
    });
    expect(boilingOverRules.bustChance(state)).toBe(0.5);
  });

  test("a spade shows the next card, and the risk follows it", () => {
    const next = card("9", "hearts", false);
    const state = brewing({
      cauldron: [card("3", "spades"), card("3", "clubs")],
      deckTopFirst: [card("7", "spades", false), next, card("A", "spades")],
    });

    expect(boilingOverRules.drawCard(state)).toBe("ingredient");
    expect(state.deck[state.deck.length - 1]).toMatchObject({
      id: next.id,
      faceUp: true,
    });
    expect(boilingOverRules.bustChance(state)).toBe(0);
  });

  test("a dud a spade turns up goes to the bottom of the deck", () => {
    const dud = card("2", "clubs", false);
    const after = card("5", "hearts", false);
    const state = brewing({
      cauldron: [card("3", "spades")],
      deckTopFirst: [card("7", "spades", false), dud, after],
    });

    expect(boilingOverRules.drawCard(state)).toBe("dudSkipped");
    expect(state.deck.map((c) => c.id)).toEqual([dud.id, after.id]);
    expect(state.deck[0].faceUp).toBe(false);
    expect(state.deck[1].faceUp).toBe(false);
  });

  test("the board can show the dud before it is skipped", () => {
    const dud = card("2", "clubs", false);
    const state = brewing({
      deckTopFirst: [card("7", "spades", false), dud, card("5", "hearts")],
    });

    expect(boilingOverRules.drawCard(state, false)).toBe("dudSkipped");
    expect(state.deck[state.deck.length - 1]).toMatchObject({
      id: dud.id,
      faceUp: true,
    });
    expect(boilingOverRules.skipShownDud(state)).toBe(true);
    expect(state.deck[0]).toMatchObject({ id: dud.id, faceUp: false });
  });

  test("each club lets the cauldron hold one more dud", () => {
    const state = brewing({
      cauldron: [card("3", "spades"), card("3", "clubs"), card("6", "clubs")],
      deckTopFirst: [card("2", "spades", false), card("A", "spades", false)],
    });

    expect(boilingOverRules.dudLimit(state.cauldron)).toBe(DUD_LIMIT + 1);
    expect(boilingOverRules.drawCard(state)).toBe("dud");
    expect(boilingOverRules.dudTotal(state.cauldron)).toBe(8);
    expect(boilingOverRules.drawCard(state)).toBe("boiledOver");
  });

  test("diamonds count double towards coins, and the potion is poured back", () => {
    const state = brewing({
      cauldron: [
        card("5", "hearts"),
        card("A", "spades"),
        card("6", "diamonds"),
      ],
      deckTopFirst: [card("2", "clubs", false)],
    });

    expect(boilingOverRules.stopBrewing(state)).toBe(true);
    expect(state.score).toBe(11);
    expect(state.coins).toBe(9);
    expect(state.phase).toBe("market");
    expect(state.cauldron).toHaveLength(0);
    expect(state.deck).toHaveLength(4);
    expect(state.deck.every((c) => !c.faceUp)).toBe(true);
  });

  test("after boiling over, only the points or the coins are kept", () => {
    const cauldron = [card("8", "hearts"), card("3", "spades")];
    const forPoints = brewing({ cauldron, phase: "boiledOver" });
    const forCoins = brewing({ cauldron, phase: "boiledOver" });

    boilingOverRules.keepAfterBoilOver(forPoints, "points");
    boilingOverRules.keepAfterBoilOver(forCoins, "coins");

    expect([forPoints.score, forPoints.coins]).toEqual([8, 0]);
    expect([forCoins.score, forCoins.coins]).toEqual([0, 4]);
  });

  test("the market sells two cards at most, of different suits", () => {
    const state = brewing({
      phase: "market",
      coins: 30,
      market: [
        [card("5", "hearts"), card("6", "hearts")],
        [card("4", "diamonds")],
        [],
        [card("9", "spades")],
      ],
    });

    expect(boilingOverRules.costOf(state.market[0][0])).toBe(5);
    expect(boilingOverRules.costOf(state.market[1][0])).toBe(5);
    expect(boilingOverRules.costOf(state.market[3][0])).toBe(11);
    expect(boilingOverRules.costOf(card("9", "clubs"))).toBe(12);
    expect(boilingOverRules.buyCard(state, 0, 0)).toBe(true);
    expect(boilingOverRules.buyCard(state, 0, 0)).toBe(false);
    expect(boilingOverRules.buyCard(state, 3, 0)).toBe(true);
    expect(boilingOverRules.buyCard(state, 1, 0)).toBe(false);
    expect(state.coins).toBe(14);
    expect(state.deck).toHaveLength(2);
  });

  test("a new round shuffles the cauldron back into the deck", () => {
    const state = brewing({
      phase: "market",
      coins: 4,
      cauldron: [card("5", "hearts"), card("A", "spades")],
      deckTopFirst: [card("2", "clubs", false)],
    });

    boilingOverRules.startNextRound(state);
    expect(state.round).toBe(2);
    expect(state.deck).toHaveLength(3);
    expect(state.deck.every((c) => !c.faceUp)).toBe(true);
    expect(state.cauldron).toHaveLength(0);
    expect(state.coins).toBe(0);
  });
});

describe("Boiling Over game", () => {
  test("a fresh deal can be brewed", async () => {
    await renderGame("/boiling-over", BoilingOver);
    expect(outcome()).toBe("playing");
  });

  test("stopping in the last round ends the game", async () => {
    const top = card("K", "hearts", false);
    const renderer = await renderGame(
      "/boiling-over",
      BoilingOver,
      brewing({
        round: ROUNDS,
        score: WIN_SCORE - 13,
        deckTopFirst: [top, card("2", "spades", false)],
      }),
    );

    await pressCardId(top.id);
    await pressButton(renderer, "Stop");

    expect(outcome()).toBe("won");
    expect(harness.wrapperProps?.score).toBe(WIN_SCORE);
  });

  test("boiling over in the last round keeps the points", async () => {
    const dud = card("3", "clubs", false);
    await renderGame(
      "/boiling-over",
      BoilingOver,
      brewing({
        round: ROUNDS,
        score: 20,
        cauldron: [
          card("3", "spades"),
          card("2", "clubs"),
          card("9", "hearts"),
        ],
        deckTopFirst: [dud],
      }),
    );

    await pressCardId(dud.id);
    expect(outcome()).toBe("lost");
    expect(harness.wrapperProps?.score).toBe(29);
  });
});
