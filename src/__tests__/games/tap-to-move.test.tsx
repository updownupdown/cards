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
  renderGame,
  renderVariant,
  run,
  pressZone,
  selectedCardIds,
  setGameSettings,
  tapSource,
  tapZone,
} from "../../../jest/game-harness";
import type { PlayingCard } from "@/components/Cards/card-utils";
import type { ComponentType } from "react";
import Canfield from "@/components/Games/Canfield";
import EightOff from "@/components/Games/EightOff";
import FortyThieves from "@/components/Games/FortyThieves";
import FreeCell from "@/components/Games/FreeCell";
import Klondike from "@/components/Games/Klondike";
import Yukon from "@/components/Games/Yukon";

// Drag-and-drop games also play by tapping: tap a card to select it, then tap
// where it should go. Taps on drag handles go through the game's tap handler;
// taps on zones land where a finger would (see tapZone).

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

function zone(id: string) {
  const found = harness.mapConfig?.zones.find((entry) => entry.id === id);
  if (!found) throw new Error(`No zone ${id}`);
  return found;
}

function zoneCardIds(id: string) {
  return (zone(id).cards ?? []).map((entry) => entry.id);
}

const ids = (cards: PlayingCard[]) => cards.map((entry) => entry.id);

function emptyPiles(count: number) {
  return Array.from({ length: count }, () => [] as PlayingCard[]);
}

describe("Klondike taps", () => {
  // The stock keeps auto-complete from finishing the game by itself.
  async function klondike(state: {
    tableau?: PlayingCard[][];
    stock?: PlayingCard[];
    waste?: PlayingCard[];
    foundations?: PlayingCard[][];
    drawCount?: 1 | 3;
  }) {
    await setGameSettings("/klondike", { drawCount: state.drawCount ?? 1 });
    const tableau = emptyPiles(7);
    state.tableau?.forEach((pile, index) => (tableau[index] = pile));
    return renderGame("/klondike", Klondike, {
      tableau,
      stock: state.stock ?? [card("9", "hearts", false)],
      waste: state.waste ?? [],
      foundations: state.foundations ?? emptyPiles(4),
    });
  }

  test("a waste card taps onto a foundation", async () => {
    const two = card("2", "hearts");
    const foundations = emptyPiles(4);
    foundations[1] = [card("A", "hearts")];
    await klondike({ waste: [card("5", "clubs"), two], foundations });

    await tapSource({ zone: "waste" });
    expect(selectedCardIds()).toEqual([two.id]);

    await tapZone((entry) => entry.id === "foundation-1");
    expect(zoneCardIds("foundation-1")).toContain(two.id);
    expect(zoneCardIds("waste")).not.toContain(two.id);
    expect(selectedCardIds()).toEqual([]);
  });

  test("a waste ace taps onto an empty foundation", async () => {
    const ace = card("A", "spades");
    await klondike({ waste: [ace] });

    await tapSource({ zone: "waste" });
    await tapZone((entry) => entry.id === "foundation-2");

    expect(zoneCardIds("foundation-2")).toEqual([ace.id]);
  });

  test("a tableau card taps onto a foundation", async () => {
    const three = card("3", "clubs");
    const foundations = emptyPiles(4);
    foundations[0] = run("clubs", "A", "2");
    await klondike({
      tableau: [[card("8", "hearts", false), three]],
      foundations,
    });

    await tapSource({ zone: "tableau", pileIndex: 0, cardIndex: 1 });
    await tapZone((entry) => entry.id === "foundation-0");

    expect(zoneCardIds("foundation-0")).toContain(three.id);
    expect(zone("tableau-0").cards?.[0].faceUp).toBe(true);
  });

  test("a king taps onto its queen on a foundation", async () => {
    const king = card("K", "spades");
    const foundations = emptyPiles(4);
    foundations[3] = run("spades", "A", "Q");
    await klondike({ tableau: [[king]], foundations });

    await tapSource({ zone: "tableau", pileIndex: 0, cardIndex: 0 });
    expect(selectedCardIds()).toEqual([king.id]);

    await tapZone((entry) => entry.id === "foundation-3");
    expect(zoneCardIds("foundation-3").at(-1)).toBe(king.id);
    expect(zoneCardIds("tableau-0")).toEqual([]);
  });

  test("a card that can't go up leaves the foundation alone", async () => {
    const five = card("5", "hearts");
    const foundations = emptyPiles(4);
    foundations[0] = [card("A", "hearts")];
    await klondike({ waste: [five], foundations });

    await tapSource({ zone: "waste" });
    await tapZone((entry) => entry.id === "foundation-0");

    expect(zoneCardIds("foundation-0")).toHaveLength(1);
    expect(zoneCardIds("waste")).toEqual([five.id]);
    expect(selectedCardIds()).toEqual([]);
  });

  test("tapping into a run selects the card and the cards on it", async () => {
    const nine = card("9", "spades");
    const stack = [
      card("8", "hearts"),
      card("7", "clubs"),
      card("6", "diamonds"),
    ];
    await klondike({
      tableau: [
        [card("2", "clubs", false), nine, ...stack],
        [card("9", "clubs")],
      ],
    });

    await tapSource({ zone: "tableau", pileIndex: 0, cardIndex: 2 });
    expect(selectedCardIds().sort()).toEqual(ids(stack).sort());

    // The whole run moves with the tap on another pile.
    await tapSource({ zone: "tableau", pileIndex: 1, cardIndex: 0 });
    expect(zoneCardIds("tableau-1").slice(1)).toEqual(ids(stack));
    expect(zoneCardIds("tableau-0").at(-1)).toBe(nine.id);
  });

  test("a card under cards out of sequence is not selected", async () => {
    const top = card("7", "clubs");
    await klondike({
      tableau: [[card("9", "spades"), card("5", "hearts"), top]],
    });

    await tapSource({ zone: "tableau", pileIndex: 0, cardIndex: 1 });
    expect(selectedCardIds()).toEqual([]);

    await tapSource({ zone: "tableau", pileIndex: 0, cardIndex: 2 });
    expect(selectedCardIds()).toEqual([top.id]);
  });

  test("drawing three fans the waste so the cards under the top show", async () => {
    const waste = [
      card("4", "clubs"),
      card("J", "hearts"),
      card("2", "spades"),
    ];
    await klondike({ waste, drawCount: 3 });

    const fan = zone("waste").fan;
    expect(fan?.maxVisible).toBe(3);
    expect(["right", "down"]).toContain(fan?.direction);
    expect(fan?.offset).toBeGreaterThanOrEqual(0.3);
    // Cards pushed out of the top three keep their shadows as they slide.
    expect(fan?.shadowVisibleCount).toBe(6);

    // Only the playable top card is selected.
    await tapSource({ zone: "waste" });
    expect(selectedCardIds()).toEqual([waste[2].id]);
  });

  test("drawing one keeps the waste stacked", async () => {
    await klondike({ waste: [card("4", "clubs"), card("J", "hearts")] });

    expect(zone("waste").fan?.direction).toBeUndefined();
  });

  test("changing the draw count applies to the game in progress", async () => {
    const stock = Array.from({ length: 8 }, () => card("9", "hearts", false));
    await klondike({ stock });
    const drawFromStock = () => pressZone((entry) => entry.id === "stock");

    await drawFromStock();
    expect(zoneCardIds("waste")).toHaveLength(1);

    await setGameSettings("/klondike", { drawCount: 3 });
    expect(zone("waste").fan?.direction).toBeDefined();
    await drawFromStock();
    expect(zoneCardIds("waste")).toHaveLength(4);

    await setGameSettings("/klondike", { drawCount: 1 });
    expect(zone("waste").fan?.direction).toBeUndefined();
    await drawFromStock();
    expect(zoneCardIds("waste")).toHaveLength(5);
  });
});

describe("Canfield taps", () => {
  function canfield(state: {
    tableau?: PlayingCard[][];
    waste?: PlayingCard[];
    foundations?: PlayingCard[][];
    drawCount?: 1 | 3;
  }) {
    const tableau = emptyPiles(4);
    state.tableau?.forEach((pile, index) => (tableau[index] = pile));
    return renderGame("/canfield", Canfield, {
      foundations: state.foundations ?? emptyPiles(4),
      baseRank: "A",
      reserve: [card("Q", "diamonds")],
      tableau,
      stock: [card("7", "hearts", false)],
      waste: state.waste ?? [],
      drawCount: state.drawCount ?? 1,
    });
  }

  test("a waste card taps onto a foundation", async () => {
    const two = card("2", "hearts");
    const foundations = emptyPiles(4);
    foundations[1] = [card("A", "hearts")];
    await canfield({ waste: [two], foundations });

    await tapSource({ zone: "waste" });
    await tapZone((entry) => entry.id === "foundation-1");

    expect(zoneCardIds("foundation-1")).toContain(two.id);
    expect(zoneCardIds("waste")).toEqual([]);
  });

  test("tapping into a run selects the card and the cards on it", async () => {
    const stack = [card("8", "hearts"), card("7", "clubs")];
    await canfield({ tableau: [[card("K", "spades"), ...stack]] });

    await tapSource({ zone: "tableau", pileIndex: 0, cardIndex: 1 });
    expect(selectedCardIds().sort()).toEqual(ids(stack).sort());
  });

  test("a card under cards out of sequence is not selected", async () => {
    await canfield({
      tableau: [[card("9", "spades"), card("5", "hearts"), card("7", "clubs")]],
    });

    await tapSource({ zone: "tableau", pileIndex: 0, cardIndex: 1 });
    expect(selectedCardIds()).toEqual([]);
  });

  test("drawing three fans the waste sideways", async () => {
    const waste = [
      card("4", "clubs"),
      card("J", "hearts"),
      card("2", "spades"),
    ];
    await canfield({ waste, drawCount: 3 });

    expect(zone("waste").fan?.direction).toBe("right");
    expect(zone("waste").placeholder?.infoPos).toBe("above");

    await tapSource({ zone: "waste" });
    expect(selectedCardIds()).toEqual([waste[2].id]);
  });
});

// Games whose foundations were tappable only while empty: a card on the
// foundation swallowed the tap.
describe("tapping onto a foundation that holds cards", () => {
  test("Forty Thieves", async () => {
    const two = card("2", "spades");
    const foundations = emptyPiles(8);
    foundations[0] = [card("A", "spades")];
    const tableau = emptyPiles(10);
    tableau[0] = [card("9", "hearts")];
    await renderVariant("/forty-thieves", "forty-thieves", FortyThieves, {
      foundations,
      tableau,
      stock: [card("5", "clubs", false)],
      waste: [two],
      redealsUsed: 0,
      ended: false,
      won: false,
    });

    await tapSource({ zone: "waste" });
    await tapZone((entry) => entry.id === "foundation-0");

    expect(zoneCardIds("foundation-0")).toContain(two.id);
  });

  test("Yukon", async () => {
    const two = card("2", "spades");
    const columns = emptyPiles(7);
    columns[0] = [two];
    columns[1] = [card("9", "hearts", false)];
    await renderGame("/yukon", Yukon, {
      setupPile: [],
      columns,
      foundations: [[card("A", "spades")], [], [], []],
    });

    await tapSource({ pileIndex: 0, cardIndex: 0 });
    const foundation = harness.mapConfig?.zones.find(
      (entry) =>
        entry.name === "foundation" && entry.cards?.[0]?.suit === "spades",
    );
    await tapZone((entry) => entry === foundation);

    expect(foundation && zoneCardIds(foundation.id)).toContain(two.id);
  });

  test.each<[string, string, string, ComponentType, number, number]>([
    ["Baker's Game", "/freecell", "bakers-game", FreeCell, 8, 4],
    ["Eight Off", "/eight-off", "", EightOff, 8, 8],
  ])("%s", async (_name, path, variant, Game, cascadeCount, cellCount) => {
    const two = card("2", "spades");
    const cascades = emptyPiles(cascadeCount);
    // An unplayable card keeps auto-complete from moving the two first.
    cascades[0] = [card("9", "hearts")];
    const freeCells: (PlayingCard | null)[] = Array(cellCount).fill(null);
    freeCells[0] = two;
    await renderVariant(path, variant, Game, {
      cascades,
      freeCells,
      foundations: [[card("A", "spades")], [], [], []],
    });

    await tapSource({ zone: "free", slotIndex: 0 });
    await tapZone((entry) => entry.id === "foundation-0");

    expect(zoneCardIds("foundation-0")).toContain(two.id);
  });
});

describe("stock-and-tableau games (Forty Thieves: Josephine)", () => {
  function josephine(tableau: PlayingCard[][], foundations = emptyPiles(8)) {
    const piles = emptyPiles(10);
    tableau.forEach((pile, index) => (piles[index] = pile));
    return renderVariant("/forty-thieves", "josephine", FortyThieves, {
      tableau: piles,
      stock: [card("5", "clubs", false)],
      waste: [],
      foundations,
      redealsUsed: 0,
      ended: false,
      won: false,
    });
  }

  test("tapping into a run selects the card and the cards on it", async () => {
    const stack = [card("8", "hearts"), card("7", "hearts")];
    await josephine([[card("K", "spades"), ...stack]]);

    await tapSource({ zone: "tableau", pile: 0, card: 1 });
    expect(selectedCardIds().sort()).toEqual(ids(stack).sort());
  });

  test("a card under cards out of sequence is not selected", async () => {
    await josephine([
      [card("9", "spades"), card("5", "hearts"), card("7", "clubs")],
    ]);

    await tapSource({ zone: "tableau", pile: 0, card: 1 });
    expect(selectedCardIds()).toEqual([]);
  });

  test("a tableau card taps onto a foundation that holds cards", async () => {
    const two = card("2", "spades");
    const foundations = emptyPiles(8);
    foundations[0] = [card("A", "spades")];
    await josephine([[card("9", "hearts"), two]], foundations);

    await tapSource({ zone: "tableau", pile: 0, card: 1 });
    await tapZone((entry) => entry.id === "foundation-0");

    expect(zoneCardIds("foundation-0")).toContain(two.id);
  });
});
