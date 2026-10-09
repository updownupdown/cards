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
  pressCardId,
  renderGame,
} from "../../../jest/game-harness";
import { act } from "react-test-renderer";
import { createDeck } from "@/components/Cards/card-utils";
import Carousel, {
  carouselRules,
  type CarouselGameState,
} from "@/components/Games/Carousel";
import { seededRandom } from "@/hints/random";

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

const {
  HAND_LIMIT,
  MELD_SLOTS,
  isSet,
  isRun,
  isTableValid,
  sortMeld,
  largestMeld,
  findPlay,
  bestTake,
  startingMelds,
  gather,
  deal,
  moveCards,
  takeCard,
  isWon,
  isLost,
} = carouselRules;

function emptyMelds() {
  return Array.from({ length: MELD_SLOTS }, () => []);
}

function baseState(overrides: Partial<CarouselGameState>): CarouselGameState {
  return {
    stock: [],
    carousel: [null, null, null],
    hand: [],
    melds: emptyMelds(),
    gaveUp: false,
    ...overrides,
  };
}

/** Plays a whole game the way the hints would, without rearranging more. */
function autoPlay(state: CarouselGameState) {
  for (let step = 0; step < 300; step += 1) {
    if (isWon(state) || isLost(state)) return;
    const play = findPlay(state);
    const slot = state.melds.findIndex((meld) => meld.length === 0);
    // A new meld needs a free slot; without one the hint would say to take a
    // card instead, and so does this.
    if (play && (play.kind === "layOff" || slot >= 0)) {
      if (play.kind === "meld") {
        moveCards(
          state,
          play.cards.map((c) => c.id),
          slot,
        );
      } else if (play.kind === "layOff") {
        moveCards(state, [play.card.id], play.meld);
      } else {
        moveCards(
          state,
          [play.card, ...play.cards].map((c) => c.id),
          slot,
        );
      }
      continue;
    }
    const take = bestTake(state);
    if (!take) {
      state.gaveUp = true;
      return;
    }
    takeCard(state, state.carousel.indexOf(take));
  }
}

describe("Carousel rules", () => {
  test("sets are three or four of a rank, in different suits", () => {
    expect(
      isSet([card("7", "spades"), card("7", "hearts"), card("7", "clubs")]),
    ).toBe(true);
    expect(
      isSet([card("7", "spades"), card("7", "spades"), card("7", "clubs")]),
    ).toBe(false);
    expect(isSet([card("7", "spades"), card("7", "hearts")])).toBe(false);
  });

  test("runs are in one suit, with the Ace low or high but not both", () => {
    expect(
      isRun([card("9", "clubs"), card("10", "clubs"), card("J", "clubs")]),
    ).toBe(true);
    expect(
      isRun([card("A", "hearts"), card("2", "hearts"), card("3", "hearts")]),
    ).toBe(true);
    expect(
      isRun([card("Q", "hearts"), card("K", "hearts"), card("A", "hearts")]),
    ).toBe(true);
    expect(
      isRun([card("K", "hearts"), card("A", "hearts"), card("2", "hearts")]),
    ).toBe(false);
    expect(
      isRun([card("9", "clubs"), card("10", "hearts"), card("J", "clubs")]),
    ).toBe(false);
    expect(
      isRun([card("9", "clubs"), card("J", "clubs"), card("Q", "clubs")]),
    ).toBe(false);
  });

  test("melds lie in order, an Ace after a King", () => {
    const sorted = sortMeld([
      card("A", "hearts"),
      card("Q", "hearts"),
      card("K", "hearts"),
    ]);
    expect(sorted.map((c) => c.rank)).toEqual(["Q", "K", "A"]);
    const low = sortMeld([
      card("3", "hearts"),
      card("A", "hearts"),
      card("2", "hearts"),
    ]);
    expect(low.map((c) => c.rank)).toEqual(["A", "2", "3"]);
  });

  test("finds the largest meld in a hand", () => {
    const hand = [
      card("5", "spades"),
      card("6", "spades"),
      card("7", "spades"),
      card("8", "spades"),
      card("8", "hearts"),
      card("8", "clubs"),
    ];
    expect(largestMeld(hand)?.map((c) => c.rank)).toEqual(["5", "6", "7", "8"]);
    expect(largestMeld([card("2", "spades"), card("9", "hearts")])).toBeNull();
  });

  test("starts with three whole melds and deals every card once", () => {
    const random = seededRandom("carousel-start");
    for (let index = 0; index < 20; index += 1) {
      const { melds, rest } = startingMelds(createDeck(), random);
      expect(melds).toHaveLength(3);
      expect(isTableValid(melds)).toBe(true);
      expect(melds.flat().length + rest.length).toBe(52);
    }
    const state = baseState({ stock: createDeck() });
    gather(state);
    deal(state, random);
    expect(state.hand).toHaveLength(7);
    expect(state.carousel.every(Boolean)).toBe(true);
    expect(state.melds.filter((m) => m.length > 0)).toHaveLength(3);
    expect(state.stock).toHaveLength(52 - 9 - 7 - 3);
    expect(
      new Set(
        [...state.stock, ...state.hand, ...state.melds.flat()].map((c) => c.id),
      ).size,
    ).toBe(49);
  });

  test("moves cards between the hand and melds, splitting and merging", () => {
    const run = [
      card("4", "spades"),
      card("5", "spades"),
      card("6", "spades"),
      card("7", "spades"),
      card("8", "spades"),
      card("9", "spades"),
    ];
    const extra = card("6", "spades");
    const state = baseState({
      hand: [extra],
      melds: [run, ...emptyMelds().slice(1)],
    });
    // Split 4-5-6-7-8-9 and lay the second 6 in: 4-5-6 and 6-7-8-9.
    moveCards(state, [run[3].id, run[4].id, run[5].id, extra.id], 1);
    expect(state.hand).toHaveLength(0);
    expect(state.melds[0].map((c) => c.rank)).toEqual(["4", "5", "6"]);
    expect(state.melds[1].map((c) => c.rank)).toEqual(["6", "7", "8", "9"]);
    expect(isWon(state)).toBe(true);
  });

  test("a card can only be taken while the table is whole", () => {
    const state = baseState({
      hand: [card("2", "clubs")],
      carousel: [card("K", "clubs"), null, null],
      stock: [card("3", "diamonds", false)],
      melds: [
        [card("9", "hearts"), card("10", "hearts")],
        ...emptyMelds().slice(1),
      ],
    });
    takeCard(state, 0);
    expect(state.hand).toHaveLength(1);
    state.melds[0].push(card("J", "hearts"));
    takeCard(state, 0);
    expect(state.hand).toHaveLength(2);
    expect(state.carousel[0]?.rank).toBe("3");
    expect(state.carousel[0]?.faceUp).toBe(true);
  });

  test(`a hand of ${HAND_LIMIT} cards loses`, () => {
    const hand = Array.from({ length: HAND_LIMIT }, () => card("2", "clubs"));
    expect(isLost(baseState({ hand }))).toBe(true);
    expect(isLost(baseState({ hand: hand.slice(1) }))).toBe(false);
  });

  test("plain play without rearranging wins a fair share of deals", () => {
    const random = seededRandom("carousel-auto");
    let wins = 0;
    const games = 120;
    for (let index = 0; index < games; index += 1) {
      const state = baseState({ stock: createDeck() });
      gather(state);
      deal(state, random);
      autoPlay(state);
      expect(
        state.stock.length +
          state.carousel.filter(Boolean).length +
          state.hand.length +
          state.melds.flat().length,
      ).toBe(52);
      if (isWon(state)) wins += 1;
    }
    if (process.env.CAROUSEL_DEBUG) console.log(`won ${wins} of ${games}`);
    expect(wins).toBeGreaterThan(games * 0.25);
    expect(wins).toBeLessThan(games * 0.95);
  });
});

describe("Carousel screen", () => {
  test("lays off a card by tapping it and then a meld", async () => {
    await renderGame("/carousel", Carousel);
    const game = () =>
      (harness.mapConfig as unknown as { game: CarouselGameState }).game;
    expect(game().hand).toHaveLength(7);
    expect(mappedCards()).toHaveLength(52);

    // Put a known card in hand that fits the first meld.
    const first = game().melds[0];
    expect(isTableValid(game().melds)).toBe(true);
    const fits = [...game().hand, ...game().carousel.filter(Boolean)].find(
      (c) => c && carouselRules.isMeld([...first, c]),
    );
    if (fits && game().hand.includes(fits)) {
      await pressCardId(fits.id);
      await pressCardId(first[0].id);
      expect(game().melds[0]).toHaveLength(first.length + 1);
      expect(game().hand).toHaveLength(6);
    }
    expect(outcome()).toBe("playing");
  });

  test("a broken meld holds the carousel back until it's whole", async () => {
    await renderGame("/carousel", Carousel);
    const game = () =>
      (harness.mapConfig as unknown as { game: CarouselGameState }).game;
    const meld = game().melds[0];
    // Move one card of the first meld to an empty place: both are broken.
    await pressCardId(meld[0].id);
    const empty = harness.mapConfig!.zones.find((z) => z.id === `meld-5`)!;
    await act(async () => harness.mapConfig!.zoneMapper!(empty)!.onPress!());
    expect(game().melds[5]).toHaveLength(1);
    expect(isTableValid(game().melds)).toBe(false);
    const take = game().carousel[0]!;
    await pressCardId(take.id).catch(() => undefined);
    expect(game().hand).toHaveLength(7);
    // Put it back and the carousel opens again.
    await pressCardId(game().melds[5][0].id);
    await pressCardId(game().melds[0][0].id);
    expect(isTableValid(game().melds)).toBe(true);
    await pressCardId(take.id);
    expect(game().hand).toHaveLength(8);
  });
});
