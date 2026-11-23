// Moving a run in one go where the rules move one card at a time (a
// "supermove"): allowed only when the free cells and empty columns that would
// take any card could carry it there card by card.
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
  pressCardId,
  renderGame,
  renderVariant,
} from "../../../jest/game-harness";
import type { PlayingCard } from "@/components/Cards/card-utils";
import { maxSupermove } from "@/components/Cards/supermove";
import BeleagueredCastle from "@/components/Games/BeleagueredCastle";
import EightOff from "@/components/Games/EightOff";
import FlowerGarden from "@/components/Games/FlowerGarden";
import FortyThieves from "@/components/Games/FortyThieves";
import FreeCell from "@/components/Games/FreeCell";
import GrandfathersClock from "@/components/Games/GrandfathersClock";
import KingAlbert from "@/components/Games/KingAlbert";
import SeahavenTowers from "@/components/Games/SeahavenTowers";

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

const emptyPiles = (count: number) =>
  Array.from({ length: count }, () => [] as PlayingCard[]);

function canDrop(source: unknown, target: unknown) {
  const options = harness.dragOptions;
  if (!options) throw new Error("This game has no drag and drop");
  return options.canDropOnTarget(source, target);
}

function zoneCards(id: string) {
  return harness.mapConfig?.zones.find((zone) => zone.id === id)?.cards ?? [];
}

test("each free cell adds one card, each empty column doubles", () => {
  expect(maxSupermove({ freeCells: 0, emptyColumns: 0 })).toBe(1);
  expect(maxSupermove({ freeCells: 2, emptyColumns: 0 })).toBe(3);
  expect(maxSupermove({ freeCells: 0, emptyColumns: 2 })).toBe(4);
  expect(maxSupermove({ freeCells: 3, emptyColumns: 1 })).toBe(8);
});

describe("free cell games", () => {
  // A three-card run on column 0 that fits on the top card of column 1.
  function cascadesWithRun(count: number) {
    const cascades = emptyPiles(count);
    cascades[0] = [
      card("2", "hearts"),
      card("10", "spades"),
      card("9", "spades"),
      card("8", "spades"),
    ];
    cascades[1] = [card("3", "hearts"), card("J", "spades")];
    return cascades;
  }
  const run = { zone: "cascade", pileIndex: 0, startIndex: 1 };
  const onPileOne = { zone: "cascade", pileIndex: 1 };

  test.each<[string, string, typeof SeahavenTowers, number, number]>([
    ["Seahaven Towers", "/seahaven-towers", SeahavenTowers, 10, 4],
    ["Eight Off", "/eight-off", EightOff, 8, 8],
  ])(
    "%s: empty columns take only Kings, so only free cells count",
    async (_name, path, Game, cascadeCount, cellCount) => {
      const filled = (free: number) =>
        Array.from({ length: cellCount }, (_, index) =>
          index < free ? null : card("5", "diamonds"),
        );
      // Two free cells carry a three-card run.
      await renderGame(path, Game, {
        cascades: cascadesWithRun(cascadeCount),
        freeCells: filled(2),
        foundations: emptyPiles(4),
      });
      expect(canDrop(run, onPileOne)).toBe(true);

      // One free cell doesn't, however many columns are empty.
      await renderGame(path, Game, {
        cascades: cascadesWithRun(cascadeCount),
        freeCells: filled(1),
        foundations: emptyPiles(4),
      });
      expect(canDrop(run, onPileOne)).toBe(false);
    },
  );

  test("FreeCell: an empty column (any card) still doubles the run", async () => {
    const fixture = (emptyColumn: boolean) => {
      const cascades = emptyPiles(8).map(() => [card("4", "clubs")]);
      cascades[0] = [
        card("2", "hearts"),
        card("9", "hearts"),
        card("8", "spades"),
      ];
      cascades[1] = [card("3", "hearts"), card("10", "spades")];
      if (emptyColumn) cascades[7] = [];
      return {
        cascades,
        freeCells: Array.from({ length: 4 }, () => card("5", "diamonds")),
        foundations: emptyPiles(4),
      };
    };
    const pair = { zone: "cascade", pileIndex: 0, startIndex: 1 };
    await renderVariant("/freecell", "freecell", FreeCell, fixture(true));
    expect(canDrop(pair, onPileOne)).toBe(true);

    await renderVariant("/freecell", "freecell", FreeCell, fixture(false));
    expect(canDrop(pair, onPileOne)).toBe(false);
  });

  test("King Albert: a run moves through empty columns", async () => {
    const fixture = (emptyColumn: boolean) => {
      const cascades = emptyPiles(9).map(() => [card("4", "diamonds")]);
      cascades[0] = [
        card("2", "clubs"),
        card("8", "hearts"),
        card("7", "clubs"),
      ];
      cascades[1] = [card("3", "clubs"), card("9", "spades")];
      if (emptyColumn) cascades[8] = [];
      return {
        cascades,
        freeCells: Array.from({ length: 7 }, () => card("5", "diamonds")),
        foundations: emptyPiles(4),
      };
    };
    const pair = { zone: "cascade", pileIndex: 0, startIndex: 1 };
    await renderVariant(
      "/king-albert",
      "king-albert",
      KingAlbert,
      fixture(true),
    );
    expect(canDrop(pair, onPileOne)).toBe(true);

    await renderVariant(
      "/king-albert",
      "king-albert",
      KingAlbert,
      fixture(false),
    );
    expect(canDrop(pair, onPileOne)).toBe(false);
  });
});

describe("one card at a time, with empty columns", () => {
  // An 8-7 run on pile 0 that fits on the 9 on pile 1; every other pile
  // holds a King, or is empty when `emptyPile` is given.
  function piles(count: number, sameSuit: boolean, emptyPile?: number) {
    const result = emptyPiles(count).map(() => [card("K", "clubs")]);
    const run = [card("8", "hearts"), card("7", sameSuit ? "hearts" : "clubs")];
    result[0] = [card("3", "clubs"), ...run];
    result[1] = [card("9", sameSuit ? "hearts" : "spades")];
    if (emptyPile !== undefined) result[emptyPile] = [];
    return { result, run };
  }

  function fortyThieves(tableau: PlayingCard[][]) {
    return renderVariant("/forty-thieves", "forty-thieves", FortyThieves, {
      tableau,
      stock: [card("5", "clubs", false)],
      waste: [],
      foundations: emptyPiles(8),
      redealsUsed: 0,
      ended: false,
      won: false,
    });
  }

  test("Forty Thieves: a run needs an empty column per doubling", async () => {
    const source = { zone: "tableau", pile: 0, card: 1 };
    const target = { zone: "tableau", pile: 1 };

    await fortyThieves(piles(10, true).result);
    expect(canDrop(source, target)).toBe(false);

    await fortyThieves(piles(10, true, 9).result);
    expect(canDrop(source, target)).toBe(true);
    // The empty column can't hold half the run on its way to itself.
    expect(canDrop(source, { zone: "tableau", pile: 9 })).toBe(false);
  });

  test("Beleaguered Castle: tapping into a row moves the run on it", async () => {
    const { result: columns, run } = piles(8, false, 7);
    await renderGame("/beleaguered-castle", BeleagueredCastle, {
      columns,
      foundations: emptyPiles(4),
      ended: false,
      won: false,
    });

    await pressCardId(run[0].id);
    await pressCardId(columns[1][0].id);

    expect(zoneCards("col-1").map((entry) => entry.id)).toEqual([
      columns[1][0].id,
      run[0].id,
      run[1].id,
    ]);
  });

  test("Flower Garden: a run drags through an empty bed", async () => {
    const fixture = (tableau: PlayingCard[][]) => ({
      setupPile: [],
      tableau,
      reserve: [card("Q", "diamonds")],
      foundations: emptyPiles(4),
      redealsUsed: 0,
      ended: false,
      won: false,
    });
    const source = { zone: "tableau", index: 0, start: 1 };
    const target = { zone: "tableau", index: 1 };

    await renderGame(
      "/flower-garden",
      FlowerGarden,
      fixture(piles(6, false).result),
    );
    expect(canDrop(source, target)).toBe(false);

    await renderGame(
      "/flower-garden",
      FlowerGarden,
      fixture(piles(6, false, 5).result),
    );
    expect(canDrop(source, target)).toBe(true);
  });

  test("Grandfather's Clock: a run drags through an empty pile", async () => {
    const fixture = (tableau: PlayingCard[][]) => ({
      deck: [],
      tableau,
      foundations: Array.from({ length: 12 }, () => [card("A", "spades")]),
      ended: false,
      won: false,
    });
    const source = { pile: 0, start: 1 };
    const target = { zone: "tableau", pile: 1 };

    await renderGame(
      "/grandfathers-clock",
      GrandfathersClock,
      fixture(piles(8, false).result),
    );
    expect(canDrop(source, target)).toBe(false);

    await renderGame(
      "/grandfathers-clock",
      GrandfathersClock,
      fixture(piles(8, false, 7).result),
    );
    expect(canDrop(source, target)).toBe(true);
  });
});
