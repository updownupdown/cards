import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from "@jest/globals";
import type React from "react";
import "../../../jest/game-mocks";
import { ProgressBar } from "@/components/Home/ProgressBar";
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
  estateValue,
  scoreOf,
  isOver,
  getTier,
  WIN_SCORE,
  buildHouse,
  canRenovate,
  skipBuild,
  applyEffect,
  findHint,
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

  test("only a finished estate scores, for its houses, parks and pools", () => {
    const streets = emptyStreets();
    const [first] = streets;
    first.houses[0] = house("2");
    first.houses[1] = house("5");
    first.tucked[0] = card("3", "hearts");
    first.tucked[1] = card("9", "diamonds");
    // Six lots with no fence: too long to score, parks and pools included.
    expect(scoreOf(streets).total).toBe(0);

    first.fences[1] = true;
    expect(estateValue(first, [0, 1])).toEqual({
      houses: 3,
      parks: 2,
      pools: 4,
      total: 9,
    });
    expect(scoreOf(streets)).toEqual({
      parks: 2,
      pools: 4,
      estates: 3,
      total: 9,
    });

    // The four lots to its right are fenced off, but not built: nothing more.
    first.houses[2] = house("8");
    first.tucked[2] = card("4", "hearts");
    expect(scoreOf(streets).total).toBe(9);
  });

  test("bigger estates score more, up to four houses", () => {
    const score = (sizes: number[]) => {
      const streets = emptyStreets();
      const street = streets[2];
      const ranks = ["A", "2", "3", "4", "5", "6", "7", "8"] as const;
      let lot = 0;
      for (const size of sizes) {
        for (let i = 0; i < size; i++, lot++) {
          street.houses[lot] = house(ranks[lot]);
        }
        if (lot < street.fences.length) street.fences[lot - 1] = true;
      }
      return scoreOf(streets).total;
    };
    expect(score([1])).toBe(1);
    expect(score([2])).toBe(3);
    expect(score([3])).toBe(6);
    expect(score([4])).toBe(10);
    expect(score([4, 4])).toBe(20);
    expect(score([2, 2, 2, 2])).toBe(12);
    // Five in a row scores nothing until a fence splits it.
    expect(score([5])).toBe(0);
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

  test("renovating replaces a house if the street still rises, and keeps its park", () => {
    const streets = emptyStreets();
    const [first] = streets;
    const five = house("5");
    const park = card("J", "hearts");
    first.houses[0] = five;
    first.tucked[0] = park;
    first.houses[2] = house("6");
    // Nothing fits between the 5 and the 6.
    expect(isDeadLot(first, 1)).toBe(true);
    expect(canRenovate(first, 0, 6)).toBe(false);
    expect(canRenovate(first, 0, 3)).toBe(true);
    expect(canRenovate(first, 1, 3)).toBe(false);

    const three = house("3");
    const heart = card("2", "hearts");
    const state = baseState({ streets, hand: [three, heart, house("9")] });
    expect(buildHouse(state, 0, { street: 0, lot: 0 })).toBe(true);

    expect(first.houses[0]?.id).toBe(three.id);
    expect(first.tucked[0]?.id).toBe(park.id);
    expect(state.discard.map((c) => c.id)).toEqual([five.id]);
    expect(isDeadLot(first, 1)).toBe(false);
    // The house already has a park: a second one is wasted.
    expect(applyEffect(state, 0)).toBe("wasted");
    expect(state.discard.map((c) => c.id)).toEqual([five.id, heart.id]);
  });

  test("a house card may be discarded instead of built; only a fence or a second house can follow", () => {
    const king = house("K");
    const state = baseState({
      hand: [king, card("2", "hearts"), card("4", "spades"), house("9")],
    });

    expect(skipBuild(state, 0)).toBe(true);
    expect(state.discard.map((c) => c.id)).toEqual([king.id]);
    expect(state.pending).toBeNull();
    expect(isOver(state)).toBe(false);
    // No second card for the house half of the turn.
    expect(skipBuild(state, 0)).toBe(false);
    expect(buildHouse(state, 2, { street: 0, lot: 0 })).toBe(false);

    // With no new house, a heart has nowhere to go.
    const wasted = structuredClone(state);
    expect(applyEffect(wasted, 0)).toBe("wasted");
    expect(applyEffect(state, 1, { street: 0, gap: 3 })).toBe("fence");
    expect(state.skippedBuild).toBe(false);
  });

  test("the game runs until the deck and hand are used up", () => {
    const streets = emptyStreets();
    streets.forEach((street) => {
      street.houses[0] = house("Q");
    });
    // Nothing fits, but there are cards to play: the game goes on.
    const state = baseState({
      streets,
      hand: [house("2"), house("3"), card("4", "hearts")],
      deck: [house("5")],
    });
    expect(isOver(state)).toBe(false);

    skipBuild(state, 0);
    applyEffect(state, 0);
    expect(state.hand).toHaveLength(2);
    expect(isOver(state)).toBe(false);

    skipBuild(state, 0);
    expect(isOver(state)).toBe(false);
    applyEffect(state, 0);
    expect(state.hand).toHaveLength(0);
    expect(isOver(state)).toBe(true);
  });

  test("the last card of the deck is played alone", () => {
    const state = baseState({ hand: [house("7")] });
    expect(buildHouse(state, 0, { street: 0, lot: 2 })).toBe(true);
    expect(state.pending).toBeNull();
    expect(isOver(state)).toBe(true);
  });

  test("the hint fences off a finished estate rather than leave it unscored", () => {
    const streets = emptyStreets();
    const [first] = streets;
    (["2", "4", "6", "8"] as const).forEach((rank, lot) => {
      first.houses[lot] = house(rank);
    });
    const spade = card("K", "spades");
    const state = baseState({
      streets,
      hand: [spade, card("Q", "clubs")],
      deck: [house("A"), house("3")],
      skippedBuild: true,
    });

    const before = structuredClone(state);
    expect(findHint(state)?.steps).toEqual([
      [{ card: spade.id }],
      [{ zone: "post-0-3" }],
    ]);
    // Looking ahead leaves the game, and its deck, as they were.
    expect(state).toEqual(before);
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
      // Build: the first hand card that fits somewhere; with none, the first
      // card is discarded instead.
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
      if (!built) {
        await pressCardId(handCards()[0].card.id);
        await pressZone((zone) => zone.id === "discard");
      }
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

    // The whole deck was played.
    expect(handCards()).toHaveLength(0);
    expect(
      mappedCards().filter((mapped) => mapped.zoneName === "deck"),
    ).toHaveLength(0);
    expect(["won", "lost"]).toContain(outcome());
    const ids = mappedCards().map((mapped) => mapped.card.id);
    expect(ids).toHaveLength(52);
    expect(new Set(ids).size).toBe(52);
    expect(typeof harness.wrapperProps?.score).toBe("number");
  });

  test("a heart effect adds a park under the new house", async () => {
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
    // Nothing scores until the estate is fenced and finished.
    expect(harness.wrapperProps?.score).toBe(0);
    expect(handCards()).toHaveLength(3);
  });

  test("tucked cards are tinted and stock and discard show pile information", async () => {
    const streets = emptyStreets();
    streets[0].houses[0] = house("2");
    streets[0].tucked[0] = card("4", "hearts");
    streets[0].houses[1] = house("8");
    streets[0].tucked[1] = card("5", "diamonds");
    streets[0].fences[1] = true;
    streets[1].tucked[0] = card("2", "hearts");
    streets[1].tucked[1] = card("3", "hearts");
    streets[1].tucked[2] = card("4", "hearts");
    streets[1].tucked[3] = card("5", "hearts");
    streets[2].tucked[0] = card("6", "hearts");
    streets[2].tucked[1] = card("7", "diamonds");
    streets[2].tucked[2] = card("8", "hearts");
    streets[2].tucked[4] = card("9", "diamonds");
    const discard = house("9", "clubs");
    const effectHand = [
      card("6", "hearts"),
      card("7", "spades"),
      card("8", "clubs"),
    ];

    const renderer = await renderGame(
      "/picket-fence",
      PicketFence,
      baseState({
        deck: [house("A")],
        hand: effectHand,
        streets,
        discard: [discard],
        pending: { street: 0, lot: 0 },
      }),
    );

    const progressBars = renderer.root.findAllByType(
      ProgressBar as React.ComponentType,
    );
    // Three pools and seven parks are down; only the fenced, finished pair
    // on the first street scores: 3 for its houses, a park and a pool.
    expect(progressBars.map((bar) => bar.props.progressValue)).toEqual([
      3, 7, 9,
    ]);
    expect(progressBars.map((bar) => bar.props.totalValue)).toEqual([
      7, 14, 60,
    ]);
    expect(progressBars.map((bar) => bar.props.tallyText)).toEqual([
      "3 / 7",
      "7",
      "9 / 60",
    ]);
    expect(progressBars.map((bar) => bar.props.color)).toEqual([
      "#1E88E5",
      "#2E8B57",
      "#9E9E9E",
    ]);
    expect(progressBars.map((bar) => bar.props.style)).toEqual([
      { flex: 1 },
      { flex: 1 },
      { flex: 1 },
    ]);

    const tuckedCards = mappedCards().filter(
      (mapped) => mapped.zoneName === "tuck",
    );
    const park = tuckedCards.find((mapped) => mapped.card.suit === "hearts");
    const pool = tuckedCards.find((mapped) => mapped.card.suit === "diamonds");
    expect(
      harness.mapConfig!.cardMapper(park!) as {
        selectColor?: string;
        forceOverlayColor?: boolean;
      },
    ).toMatchObject({ selectColor: "#2E8B57", forceOverlayColor: true });
    expect(
      harness.mapConfig!.cardMapper(pool!) as {
        selectColor?: string;
        forceOverlayColor?: boolean;
      },
    ).toMatchObject({ selectColor: "#1E88E5", forceOverlayColor: true });

    const mappedHand = handCards();
    const suitColors = [
      ["hearts", "#2E8B57"],
      ["spades", "#808080"],
      ["clubs", "#8B5A2B"],
    ] as const;
    suitColors.forEach(([suit, color]) => {
      const mapped = mappedHand.find((entry) => entry.card.suit === suit);
      expect(
        harness.mapConfig!.cardMapper(mapped!) as {
          selectColor?: string;
          forceOverlayColor?: boolean;
        },
      ).toMatchObject({ selectColor: color, forceOverlayColor: true });
    });

    const stock = zones().find((zone) => zone.id === "deck");
    const discardZone = zones().find((zone) => zone.id === "discard");
    expect(stock?.placeholder).toMatchObject({
      text: expect.any(String),
      infoPos: "right",
    });
    expect(stock?.placeholder?.showCount).not.toBe(false);
    expect(discardZone?.placeholder).toMatchObject({
      text: expect.any(String),
      infoPos: "left",
    });
    expect(discardZone?.placeholder?.showCount).not.toBe(false);
    expect(
      mappedCards()
        .filter((mapped) => mapped.zoneId === "discard")
        .every((mapped) => !mapped.card.faceUp),
    ).toBe(true);
  });
});
