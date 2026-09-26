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
import type { MapZone } from "@/components/Cards/CardMap";
import type { CardRank, CardSuit } from "@/components/Cards/card-utils";
import PicketFence, {
  picketFenceRules,
  type PicketFenceGameState,
} from "@/components/Games/PicketFence";

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

const {
  emptyStreets,
  canBuild,
  isDeadLot,
  estates,
  estateStatus,
  parkScore,
  scoreOf,
  isOver,
  getTier,
  WIN_SCORE,
  buildHouse,
  applyEffect,
} = picketFenceRules;

function house(rank: CardRank, suit: CardSuit = "spades") {
  return card(rank, suit);
}

function baseState(
  overrides: Partial<PicketFenceGameState>,
): PicketFenceGameState {
  return {
    deck: [],
    hand: [],
    streets: emptyStreets(),
    discard: [],
    pending: null,
    ...overrides,
  };
}

describe("Picket Fence rules", () => {
  test("every score has a tier, and winning starts at 60", () => {
    expect(WIN_SCORE).toBe(60);
    expect(getTier(-3).key).toBe("games:picketFence.tierVacantLots");
    expect(getTier(59).key).toBe("games:picketFence.tierQuietStreet");
    expect(getTier(60).key).toBe("games:picketFence.tierGoodNeighbours");
    expect(getTier(80).key).toBe("games:picketFence.tierPicturePerfect");
  });

  test("house numbers rise along a street, skipping empty lots", () => {
    const [street] = emptyStreets();
    street.houses[1] = house("4");
    street.houses[4] = house("9");

    expect(canBuild(street, 0, 3)).toBe(true);
    expect(canBuild(street, 0, 4)).toBe(false);
    expect(canBuild(street, 2, 5)).toBe(true);
    expect(canBuild(street, 3, 9)).toBe(false);
    expect(canBuild(street, 5, 13)).toBe(true);
    expect(canBuild(street, 1, 5)).toBe(false);
  });

  test("a lot between consecutive numbers is dead", () => {
    const [street] = emptyStreets();
    street.houses[0] = house("5");
    street.houses[2] = house("6");

    expect(isDeadLot(street, 1)).toBe(true);
    expect(isDeadLot(street, 3)).toBe(false);
  });

  test("fences split a street into estates", () => {
    const street = emptyStreets()[2];
    expect(estates(street)).toEqual([[0, 7]]);

    street.fences[1] = true;
    street.fences[4] = true;
    expect(estates(street)).toEqual([
      [0, 1],
      [2, 4],
      [5, 7],
    ]);
  });

  test("an estate is blocked when too long or when its gap can't be filled", () => {
    const street = emptyStreets()[2];
    // Eight lots with no fence: too long to score.
    expect(estateStatus(street, [0, 7])).toBe("blocked");

    street.fences[2] = true;
    street.houses[0] = house("7");
    // Lots 1 and 2 need two numbers between 7 and 14.
    expect(estateStatus(street, [0, 2])).toBe("open");

    street.houses[3] = house("9");
    // Only 8 is left for lots 1 and 2.
    expect(estateStatus(street, [0, 2])).toBe("blocked");
  });

  test("completed estates, parks and pools score", () => {
    const streets = emptyStreets();
    const [first] = streets;
    first.fences[1] = true;
    first.houses[0] = house("2");
    first.houses[1] = house("5");
    first.tucked[1] = card("9", "diamonds");
    first.tucked[0] = card("3", "hearts");

    expect(parkScore(first, 0)).toBe(2);
    expect(scoreOf(streets)).toEqual({
      parks: 2,
      pools: 3,
      estates: 3,
      total: 8,
    });
  });

  test("a full row of parks scores the street's bonus", () => {
    const [first] = emptyStreets();
    first.tucked[0] = card("2", "hearts");
    first.tucked[2] = card("4", "hearts");
    first.tucked[3] = card("5", "hearts");
    expect(parkScore(first, 0)).toBe(10);
  });

  test("a turn builds a house, then applies the effect card", () => {
    const heart = card("K", "hearts");
    const state = baseState({
      hand: [house("7", "clubs"), heart, house("2", "diamonds")],
      deck: [house("A"), house("3")],
    });

    expect(buildHouse(state, 0, { street: 0, lot: 3 })).toBe(true);
    expect(state.pending).toEqual({ street: 0, lot: 3 });
    expect(isOver(state)).toBe(false);

    expect(applyEffect(state, 0)).toBe("park");
    expect(state.streets[0].tucked[3]?.id).toBe(heart.id);
    expect(state.pending).toBeNull();
    expect(state.hand).toHaveLength(3);
    expect(state.deck).toHaveLength(0);
  });

  test("a diamond off a pool lot is discarded", () => {
    const diamond = card("5", "diamonds");
    const state = baseState({ hand: [house("7"), diamond] });
    buildHouse(state, 0, { street: 0, lot: 0 });

    expect(applyEffect(state, 0)).toBe("wasted");
    expect(state.discard.map((c) => c.id)).toEqual([diamond.id]);
  });

  test("spades put up a fence and clubs build a second house", () => {
    const state = baseState({
      hand: [house("7"), card("2", "spades"), card("9", "clubs"), house("4")],
    });

    buildHouse(state, 0, { street: 1, lot: 3 });
    expect(applyEffect(state, 0, { street: 2, gap: 5 })).toBe("fence");
    expect(state.streets[2].fences[5]).toBe(true);

    buildHouse(state, 1, { street: 0, lot: 0 });
    // The club can't go left of the 7 on street 1.
    expect(applyEffect(state, 0, { street: 1, lot: 1 })).toBeNull();
    expect(applyEffect(state, 0, { street: 1, lot: 5 })).toBe("house");
    expect(state.streets[1].houses[5]?.rank).toBe("9");
  });

  test("the game ends when no card in hand fits", () => {
    const streets = emptyStreets();
    streets.forEach((street) => {
      street.houses[0] = house("Q");
    });
    // Only a King fits to the right of the Queens.
    const state = baseState({ streets, hand: [house("Q"), house("J")] });
    expect(isOver(state)).toBe(true);

    state.hand.push(house("K"));
    expect(isOver(state)).toBe(false);
  });
});

// ── Playing through the component ──────────────────────────────────────────

function zones() {
  return harness.mapConfig!.zones;
}

function zoneEnabled(zone: MapZone) {
  const mapping = harness.mapConfig!.zoneMapper?.(zone) as
    { onPress?: () => void; isDisabled?: boolean } | undefined;
  return !!mapping?.onPress && !mapping.isDisabled;
}

function handCards() {
  return mappedCards().filter((mapped) => mapped.zoneName === "hand");
}

describe("Picket Fence games", () => {
  test("a full game can be played to the end with every card accounted for", async () => {
    await renderGame("/picket-fence", PicketFence);
    expect(outcome()).toBe("playing");

    for (let step = 0; step < 200 && outcome() === "playing"; step++) {
      // Build: the first hand card that fits somewhere.
      let built = false;
      for (const mapped of handCards()) {
        await pressCardId(mapped.card.id);
        const lot = zones().find(
          (zone) => zone.name === "lot" && zoneEnabled(zone),
        );
        if (lot) {
          await pressZone((zone) => zone.id === lot.id);
          built = true;
          break;
        }
        await pressCardId(mapped.card.id);
      }
      expect(built).toBe(true);
      if (outcome() !== "playing" || handCards().length === 0) continue;

      // Effect: the first hand card, then its target if it needs one.
      const effect = handCards()[0];
      if (!effect) continue;
      await pressCardId(effect.card.id);
      const target = zones().find(
        (zone) =>
          (zone.name === "post" || zone.name === "lot") && zoneEnabled(zone),
      );
      if (target) await pressZone((zone) => zone.id === target.id);
    }

    expect(["won", "lost"]).toContain(outcome());
    const ids = mappedCards().map((mapped) => mapped.card.id);
    expect(ids).toHaveLength(52);
    expect(new Set(ids).size).toBe(52);
    expect(typeof harness.wrapperProps?.score).toBe("number");
  });

  test("a heart effect adds a park to the new house's street", async () => {
    const seven = house("7", "clubs");
    const heart = card("2", "hearts");
    await renderGame(
      "/picket-fence",
      PicketFence,
      baseState({
        hand: [seven, heart, house("3", "spades")],
        deck: [house("A"), house("5")],
      }),
    );

    await pressCardId(seven.id);
    await pressZone((zone) => zone.id === "lot-1-3");
    await pressCardId(heart.id);

    const tucked = mappedCards().find((mapped) => mapped.card.id === heart.id);
    expect(tucked?.zoneId).toBe("tuck-1-3");
    expect(harness.wrapperProps?.score).toBe(2);
    expect(handCards()).toHaveLength(3);
  });
});
