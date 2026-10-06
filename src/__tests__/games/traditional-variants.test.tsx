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
  dropMove,
  harness,
  outcome,
  pressCardId,
  pressZone,
  renderGame,
  renderVariant,
  run,
  setGameSettings,
} from "../../../jest/game-harness";
import type { PlayingCard } from "@/components/Cards/card-utils";
import Bristol from "@/components/Games/Bristol";
import LittleWindmill from "@/components/Games/LittleWindmill";
import KingAlbert, { kingAlbertRules } from "@/components/Games/KingAlbert";
import Scorpion from "@/components/Games/Scorpion";
import { spiderRules } from "@/components/Games/SpiderSolitaire";
import Terrace from "@/components/Games/Terrace";
import { singleCardRules } from "@/components/Games/SingleCardSolitaire";

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

const emptyPiles = (count: number) =>
  Array.from({ length: count }, () => [] as PlayingCard[]);

function zoneCardIds(id: string) {
  const zone = harness.mapConfig?.zones.find((entry) => entry.id === id);
  return (zone?.cards ?? []).map((entry) => entry.id);
}

function canDrop(source: unknown, target: unknown) {
  return harness.dragOptions?.canDropOnTarget(source, target);
}

describe("King Albert", () => {
  test("deals nine columns of one to nine and a seven-card reserve", () => {
    const state = kingAlbertRules.createInitialState("king-albert");
    expect(state.cascades.map((pile) => pile.length)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9,
    ]);
    expect(state.freeCells).toHaveLength(7);
    expect(state.foundations.every((pile) => pile.length === 0)).toBe(true);
  });

  test("Raglan starts the Aces on the foundations, with a six-card reserve", () => {
    const state = kingAlbertRules.createInitialState("raglan");
    expect(state.foundations.map((pile) => pile[0]?.rank)).toEqual([
      "A",
      "A",
      "A",
      "A",
    ]);
    expect(state.cascades.flat()).toHaveLength(42);
    expect(state.freeCells).toHaveLength(6);
  });

  test("moves one card at a time, and nothing goes back to the reserve", async () => {
    const cascades = emptyPiles(9);
    cascades[0] = [card("9", "spades"), card("8", "hearts")];
    cascades[1] = [card("10", "hearts")];
    cascades[2] = [card("9", "clubs")];
    await renderVariant("/king-albert", "king-albert", KingAlbert, {
      cascades,
      freeCells: [card("5", "clubs"), null],
      foundations: emptyPiles(4),
    });

    // A built run doesn't move as a unit...
    expect(
      canDrop(
        { zone: "cascade", pileIndex: 0, startIndex: 0 },
        { zone: "cascade", pileIndex: 1 },
      ),
    ).toBe(false);
    // ...but its top card does, and a reserve card can't go back in.
    expect(
      canDrop(
        { zone: "cascade", pileIndex: 0, startIndex: 1 },
        { zone: "cascade", pileIndex: 2 },
      ),
    ).toBe(true);
    expect(
      canDrop(
        { zone: "cascade", pileIndex: 0, startIndex: 1 },
        { zone: "free", slotIndex: 1 },
      ),
    ).toBe(false);
  });
});

describe("Terrace", () => {
  test("the chosen card sets the base rank, then the columns are dealt", async () => {
    const tableau = emptyPiles(9);
    const seven = card("7", "hearts");
    tableau[0] = [card("2", "clubs")];
    tableau[1] = [seven];
    tableau[2] = [card("J", "spades")];
    tableau[3] = [card("4", "diamonds")];
    await renderVariant("/terrace", "terrace", Terrace, {
      tableau,
      reserves: [[card("9", "hearts")]],
      stock: Array.from({ length: 12 }, () => card("K", "clubs", false)),
      waste: [],
      foundations: emptyPiles(8),
      baseRank: null,
      ended: false,
      won: false,
    });

    await pressCardId(seven.id);

    expect(zoneCardIds("foundation-0")).toEqual([seven.id]);
    const columns = harness.mapConfig!.zones.filter(
      (zone) => zone.name === "tableau",
    );
    expect(columns.every((zone) => zone.cards?.length === 1)).toBe(true);
  });

  test("the terrace card only goes to a foundation, and gaps take the stock", async () => {
    const tableau = emptyPiles(9).map((_, index) =>
      index === 0 ? [] : [card("2", "clubs")],
    );
    const eight = card("8", "spades");
    const stockCard = card("3", "hearts", false);
    await renderVariant("/terrace", "terrace", Terrace, {
      tableau,
      reserves: [[eight]],
      stock: [stockCard],
      waste: [],
      foundations: [[card("7", "hearts")], ...emptyPiles(7)],
      baseRank: "7",
      ended: false,
      won: false,
    });

    expect(
      canDrop({ zone: "reserve", pile: 0 }, { zone: "tableau", pile: 0 }),
    ).toBe(false);
    expect(
      canDrop({ zone: "reserve", pile: 0 }, { zone: "foundation", pile: 0 }),
    ).toBe(true);

    await pressZone((zone) => zone.name === "stock");
    expect(zoneCardIds("tableau-0")).toEqual([stockCard.id]);
  });
});

describe("Little Windmill", () => {
  const { canBuildFoundation, canBuildTableau, configs, deal } =
    singleCardRules;
  const config = configs["little-windmill"];

  test("an Ace comes out of the stock to start the first foundation", () => {
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const state = deal(
        singleCardRules.createInitialState("little-windmill").stock,
        config,
      );
      expect(state.baseRank).toBe("A");
      expect(state.foundations.map((pile) => pile.length)).toEqual([
        1, 0, 0, 0,
      ]);
      expect(state.foundations[0][0]).toMatchObject({
        rank: "A",
        faceUp: true,
      });
      expect(state.tableau.map((pile) => pile.length)).toEqual([1, 1, 1, 1, 1]);
      expect(state.stock).toHaveLength(46);
    }
  });

  test("foundations build up by suit from Ace to King", () => {
    const build = (next: PlayingCard, onto?: PlayingCard) =>
      canBuildFoundation(next, onto, "A", config);
    expect(build(card("A", "clubs"))).toBe(true);
    expect(build(card("5", "clubs"))).toBe(false);
    expect(build(card("2", "clubs"), card("A", "clubs"))).toBe(true);
    expect(build(card("2", "hearts"), card("A", "clubs"))).toBe(false);
    expect(build(card("A", "clubs"), card("K", "clubs"))).toBe(false);
  });

  test("the cross builds down in any suit, and nothing goes on an Ace", () => {
    const state = { baseRank: "A" } as never;
    const source = { zone: "waste" } as const;
    const build = (next: PlayingCard, onto: PlayingCard) =>
      canBuildTableau(next, source, onto, state, config);
    expect(build(card("4", "hearts"), card("5", "clubs"))).toBe(true);
    expect(build(card("4", "hearts"), card("5", "hearts"))).toBe(true);
    expect(build(card("K", "hearts"), card("A", "clubs"))).toBe(false);
  });

  const spentStock = () => ({
    tableau: [[card("9", "hearts")], ...emptyPiles(4)],
    reserves: [],
    stock: [],
    waste: [card("3", "clubs"), card("J", "spades")],
    foundations: [[card("A", "spades")], ...emptyPiles(3)],
    baseRank: "A",
    redealsUsed: 0,
    ended: false,
    won: false,
  });

  test("Normal has no redeal", async () => {
    await renderGame("/little-windmill", LittleWindmill, spentStock());

    await pressZone((zone) => zone.name === "stock");

    expect(zoneCardIds("stock")).toHaveLength(0);
    expect(zoneCardIds("waste")).toHaveLength(2);
  });

  test("Easy turns the waste over once", async () => {
    await setGameSettings("/little-windmill", {
      littleWindmillDifficulty: "easy",
    });
    const fixture = spentStock();
    await renderGame("/little-windmill", LittleWindmill, fixture);

    await pressZone((zone) => zone.name === "stock");

    // The waste becomes the stock, its first card back on top.
    expect(zoneCardIds("waste")).toHaveLength(0);
    expect(zoneCardIds("stock")).toEqual(
      [...fixture.waste].reverse().map((entry) => entry.id),
    );

    await pressZone((zone) => zone.name === "stock");
    await pressZone((zone) => zone.name === "stock");
    expect(zoneCardIds("waste")).toHaveLength(2);

    // The one redeal is spent.
    await pressZone((zone) => zone.name === "stock");
    expect(zoneCardIds("stock")).toHaveLength(0);
    expect(zoneCardIds("waste")).toHaveLength(2);
    await setGameSettings("/little-windmill", {
      littleWindmillDifficulty: "normal",
    });
  });

  test("playing the last card wins", async () => {
    const tableau = emptyPiles(5);
    tableau[0] = [card("K", "spades")];
    await renderGame("/little-windmill", LittleWindmill, {
      tableau,
      reserves: [],
      stock: [],
      waste: [],
      foundations: [
        run("hearts", "A", "K"),
        run("clubs", "A", "K"),
        run("diamonds", "A", "K"),
        run("spades", "A", "Q"),
      ],
      baseRank: "A",
      ended: false,
      won: false,
    });
    expect(outcome()).toBe("playing");

    await dropMove(
      { zone: "tableau", pile: 0 },
      { zone: "foundation", pile: 3 },
    );

    expect(outcome()).toBe("won");
  });
});

describe("Bristol", () => {
  test("Kings go to the bottom of their fans", () => {
    const { configs, deal } = singleCardRules;
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const state = deal(
        singleCardRules.createInitialState("bristol").stock,
        configs.bristol,
      );
      state.tableau.forEach((fan) => {
        const firstOther = fan.findIndex((entry) => entry.rank !== "K");
        if (firstOther < 0) return;
        expect(fan.slice(firstOther).some((entry) => entry.rank === "K")).toBe(
          false,
        );
      });
      expect(state.reserves.map((pile) => pile.length)).toEqual([1, 1, 1]);
    }
  });

  test("the stock deals one card onto each reserve pile", async () => {
    await renderGame("/bristol", Bristol, {
      tableau: [[card("9", "hearts")], ...emptyPiles(7)],
      reserves: [[card("3", "clubs")], [card("5", "clubs")], []],
      stock: [
        card("J", "spades", false),
        card("J", "hearts", false),
        card("J", "clubs", false),
        card("Q", "clubs", false),
      ],
      waste: [],
      foundations: emptyPiles(4),
      baseRank: "A",
      ended: false,
      won: false,
    });

    await pressZone((zone) => zone.name === "stock");

    expect(zoneCardIds("reserve-0")).toHaveLength(2);
    expect(zoneCardIds("reserve-1")).toHaveLength(2);
    expect(zoneCardIds("reserve-2")).toHaveLength(1);
    expect(zoneCardIds("stock")).toHaveLength(1);
    // Nothing builds onto a reserve pile, and empty fans stay empty.
    expect(
      canDrop({ zone: "reserve", pile: 0 }, { zone: "tableau", pile: 1 }),
    ).toBe(false);
  });
});

describe("Spider suits", () => {
  test.each<[1 | 2 | 4, string[]]>([
    [1, ["spades"]],
    [2, ["hearts", "spades"]],
    [4, ["clubs", "diamonds", "hearts", "spades"]],
  ])("%i suit(s)", (suits, expected) => {
    const state = spiderRules.createInitialState(suits);
    const cards = [...state.tableau.flat(), ...state.stock];
    expect(cards).toHaveLength(104);
    expect([...new Set(cards.map((entry) => entry.suit))].sort()).toEqual(
      expected,
    );
  });
});

describe("Wasp (Scorpion variant)", () => {
  test.each<[string, boolean]>([
    ["scorpion", false],
    ["wasp", true],
  ])("%s: any card to an empty column is %s", async (variant, ok) => {
    const tableau = emptyPiles(7);
    tableau[0] = [card("9", "spades"), card("5", "hearts")];
    tableau[1] = [card("K", "clubs")];
    await renderVariant("/scorpion", variant, Scorpion, {
      tableau,
      stock: [],
      foundations: emptyPiles(4),
      stockDealt: true,
    });

    const target = harness.mapConfig!.zones.find(
      (zone) => zone.name === "tableau" && zone.cards?.length === 0,
    );
    expect(
      canDrop(
        { zone: "tableau", pileIndex: 0, cardIndex: 1 },
        { zone: "tableau", pileIndex: target?.pileIndex },
      ),
    ).toBe(ok);
  });
});
