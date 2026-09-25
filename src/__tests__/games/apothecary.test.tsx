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
  pressZone,
  renderGame,
} from "../../../jest/game-harness";
import type {
  CardRank,
  CardSuit,
  PlayingCard,
} from "@/components/Cards/card-utils";
import Apothecary, {
  apothecaryRules,
  type ApothecaryGameState,
} from "@/components/Games/Apothecary";
import { i18n } from "@/i18n";

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

const {
  capacityOf,
  isSealed,
  topRunLength,
  canSelect,
  canPour,
  pour,
  hasPour,
  isWon,
  isLost,
  isSolvable,
  toRacks,
  createInitialState,
} = apothecaryRules;

// Jars 0-14, then dishes 15 and 16.
const JARS = 15;
const DISH = 15;
const RANKS: CardRank[] = [
  "A",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
];
const SUITS: CardSuit[] = ["hearts", "clubs", "diamonds", "spades"];

function cards(...ranks: CardRank[]) {
  return ranks.map((rank, i) => card(rank, SUITS[i % 4]));
}

function sealedJar(rank: CardRank) {
  return SUITS.map((suit) => card(rank, suit, false));
}

function baseState(vessels: Record<number, PlayingCard[]> = {}) {
  return {
    vessels: Array.from({ length: JARS + 2 }, (_, i) => vessels[i] ?? []),
    pours: 0,
    deal: [],
  } as ApothecaryGameState;
}

describe("Apothecary rules", () => {
  test("jars hold four cards and dishes one", () => {
    expect(capacityOf(0)).toBe(4);
    expect(capacityOf(JARS - 1)).toBe(4);
    expect(capacityOf(DISH)).toBe(1);
    expect(capacityOf(DISH + 1)).toBe(1);
  });

  test("the matching cards at the top pour together", () => {
    const state = baseState({ 0: cards("3", "7", "7"), 1: cards("7") });
    expect(topRunLength(state.vessels[0])).toBe(2);

    expect(pour(state, 0, 1)).toBe(true);
    expect(state.vessels[0].map((c) => c.rank)).toEqual(["3"]);
    expect(state.vessels[1].map((c) => c.rank)).toEqual(["7", "7", "7"]);
    expect(state.pours).toBe(1);
  });

  test("cards that don't fit stay behind", () => {
    const state = baseState({ 0: cards("9", "9", "9"), 1: cards("2", "9") });
    expect(pour(state, 0, 1)).toBe(true);
    expect(state.vessels[0]).toHaveLength(1);
    expect(state.vessels[1].map((c) => c.rank)).toEqual(["2", "9", "9", "9"]);

    // A dish takes a single card.
    const toDish = baseState({ 0: cards("5", "5") });
    expect(pour(toDish, 0, DISH)).toBe(true);
    expect(toDish.vessels[0]).toHaveLength(1);
    expect(toDish.vessels[DISH]).toHaveLength(1);
  });

  test("cards only pour onto the same rank or into an empty vessel", () => {
    const state = baseState({
      0: cards("4"),
      1: cards("6"),
      2: cards("4", "4", "8", "4"),
      [DISH]: cards("4"),
    });
    expect(canPour(state, 0, 1)).toBe(false);
    expect(canPour(state, 0, 3)).toBe(true);
    // Full jars and dishes take nothing more.
    expect(canPour(state, 0, 2)).toBe(false);
    expect(canPour(state, 0, DISH)).toBe(false);
    expect(canPour(state, 0, 0)).toBe(false);
    expect(canPour(state, 3, 0)).toBe(false);

    const refused = structuredClone(state);
    expect(pour(refused, 0, 1)).toBe(false);
    expect(refused).toEqual(state);
  });

  test("four of a kind in a jar is sealed and out of play", () => {
    const state = baseState({ 0: cards("Q", "Q", "Q"), 1: cards("Q") });
    pour(state, 1, 0);
    expect(isSealed(state.vessels[0])).toBe(true);
    expect(state.vessels[0].every((c) => !c.faceUp)).toBe(true);
    expect(canSelect(state, 0)).toBe(false);
    expect(canPour(state, 0, 2)).toBe(false);
    expect(canPour(state, 1, 0)).toBe(false);

    // A mixed full jar stays open.
    const mixed = baseState({ 0: cards("Q", "Q", "J"), 1: cards("J") });
    pour(mixed, 1, 0);
    expect(isSealed(mixed.vessels[0])).toBe(false);
    expect(canSelect(mixed, 0)).toBe(true);
  });

  test("the game is won with 13 sealed jars and lost with no pour left", () => {
    const won = baseState(
      Object.fromEntries(RANKS.map((rank, i) => [i, sealedJar(rank)])),
    );
    expect(isWon(won)).toBe(true);
    expect(isLost(won)).toBe(false);

    // Every vessel full, and no jar sealed.
    const stuck = baseState(
      Object.fromEntries(
        Array.from({ length: JARS + 2 }, (_, i) => [
          i,
          i < JARS
            ? cards(RANKS[i % 13], RANKS[(i + 1) % 13], "A", RANKS[i % 13])
            : cards("K"),
        ]),
      ),
    );
    expect(hasPour(stuck)).toBe(false);
    expect(isLost(stuck)).toBe(true);
    expect(isWon(stuck)).toBe(false);

    // Cards still waiting to be dealt never count as a loss.
    expect(isLost({ ...stuck, deal: cards("A") })).toBe(false);
  });

  test("the solver tells winnable positions from stuck ones", () => {
    // Eleven ranks already grouped; Aces and 2s mixed in two jars.
    const easy = baseState({
      ...Object.fromEntries(
        RANKS.slice(2).map((rank, i) => [i, cards(rank, rank, rank, rank)]),
      ),
      11: cards("A", "2", "A", "2"),
      12: cards("2", "A", "2", "A"),
    });
    expect(isSolvable(toRacks(easy.vessels))).toBe(true);

    // Full jars and dishes leave nowhere to pour.
    const stuck = baseState(
      Object.fromEntries(
        Array.from({ length: JARS + 2 }, (_, i) => [
          i,
          i < JARS ? cards("A", "2", "A", "2") : cards("3"),
        ]),
      ),
    );
    expect(isSolvable(toRacks(stuck.vessels))).toBe(false);
  });

  test("every deal is complete, has no sealed jar and can be won", () => {
    for (let i = 0; i < 10; i++) {
      const { vessels, pours, deal } = createInitialState();
      expect(pours).toBe(0);
      expect(deal).toEqual([]);
      expect(vessels).toHaveLength(JARS + 2);
      expect(vessels.slice(0, 13).every((v) => v.length === 4)).toBe(true);
      expect(vessels.slice(13).every((v) => v.length === 0)).toBe(true);

      const all = vessels.flat();
      expect(all.every((c) => c.faceUp)).toBe(true);
      expect(new Set(all.map((c) => c.id)).size).toBe(52);
      expect(
        vessels.some(
          (v) => v.length === 4 && v.every((c) => c.rank === v[0].rank),
        ),
      ).toBe(false);
      expect(hasPour({ vessels, pours, deal })).toBe(true);
      expect(isSolvable(toRacks(vessels))).toBe(true);
    }
  });
});

describe("Apothecary games", () => {
  test("tapping a jar, then another, pours and counts the pour", async () => {
    const [bottom, low, high] = cards("3", "7", "7");
    const [target] = cards("7");
    await renderGame(
      "/apothecary",
      Apothecary,
      baseState({ 0: [bottom, low, high], 1: [target] }),
    );

    await pressCardId(high.id);
    const selected = mappedCards().filter(
      (m) =>
        (harness.mapConfig!.cardMapper(m) as { isSelected?: boolean })
          ?.isSelected,
    );
    expect(selected.map((m) => m.card.id).sort()).toEqual(
      [low.id, high.id].sort(),
    );

    await pressCardId(target.id);
    const jar1 = harness.mapConfig!.zones.find((z) => z.id === "jar-1")!;
    expect(jar1.cards!.map((c) => c.id)).toEqual([target.id, high.id, low.id]);
    expect(harness.wrapperProps?.score).toBe(1);
    expect(outcome()).toBe("playing");
  });

  test("an empty dish takes a single card when tapped", async () => {
    const [bottom, top] = cards("5", "5");
    await renderGame(
      "/apothecary",
      Apothecary,
      baseState({ 0: [bottom, top], 1: cards("9") }),
    );

    await pressCardId(top.id);
    await pressZone((zone) => zone.id === "dish-0");
    const dish = harness.mapConfig!.zones.find((z) => z.id === "dish-0")!;
    expect(dish.cards!.map((c) => c.id)).toEqual([top.id]);
    expect(harness.wrapperProps?.score).toBe(1);
  });

  test("sealing the last jar wins the game", async () => {
    const last = card("K", "spades");
    await renderGame(
      "/apothecary",
      Apothecary,
      baseState({
        ...Object.fromEntries(
          RANKS.slice(0, 12).map((rank, i) => [i, sealedJar(rank)]),
        ),
        12: cards("K", "K", "K"),
        [DISH]: [last],
      }),
    );

    await pressCardId(last.id);
    await pressZone((zone) => zone.id === "jar-12");
    expect(outcome()).toBe("won");
    expect(harness.wrapperProps?.winLoseMessage).toBe(
      i18n.t("games:apothecary.allSealed", { count: 1 }),
    );
  });

  test("a position with no pour left is lost", async () => {
    // Every vessel is full except dish 1, and no other top card is a Queen.
    const tops = RANKS.filter((rank) => rank !== "A" && rank !== "Q");
    const vessels: Record<number, PlayingCard[]> = Object.fromEntries(
      Array.from({ length: JARS - 1 }, (_, i) => [
        i + 1,
        cards("A", "A", "A", tops[i % tops.length]),
      ]),
    );
    const moved = card("3", "spades");
    vessels[0] = [...cards("K", "K", "Q"), moved];
    vessels[DISH] = cards("K");
    await renderGame("/apothecary", Apothecary, baseState(vessels));
    expect(outcome()).toBe("playing");

    // Jar 0 is left with a Queen on top, which nothing can pour onto.
    await pressCardId(moved.id);
    await pressZone((zone) => zone.id === "dish-1");
    expect(outcome()).toBe("lost");
    expect(harness.wrapperProps?.winLoseMessage).toBe(
      i18n.t("games:apothecary.noPoursLeft"),
    );
  });
});
