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
  pressZone,
  renderGame,
  run,
  setGameSettings,
  settle,
} from "../../../jest/game-harness";
import type { PlayingCard } from "@/components/Cards/card-utils";
import Machination, {
  machinationRules,
  type MachinationGameState,
} from "@/components/Games/Machination";
import { act } from "react-test-renderer";

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

const emptyPiles = (count = 8): PlayingCard[][] =>
  Array.from({ length: count }, () => []);

/** Hearts, diamonds and clubs built to the King; spades up to `spadesTo`. */
function nearlyBuilt(spadesTo: PlayingCard["rank"]): PlayingCard[][] {
  return [
    run("hearts", "A", "K"),
    run("diamonds", "A", "K"),
    run("clubs", "A", "K"),
    run("spades", "A", spadesTo),
  ];
}

function pileZones() {
  return (harness.mapConfig?.zones ?? []).filter(
    (zone) => zone.name === "pile",
  );
}

const pressPile = (index: number) =>
  pressZone((zone) => zone.id === `pile-${index}`);

describe("Machination rules", () => {
  test("an Ace goes straight to a foundation as it is turned", () => {
    const ace = card("A", "hearts", false);
    const state: MachinationGameState = {
      stock: [card("9", "clubs", false), ace],
      piles: emptyPiles(),
      foundations: [[], [], [], []],
    };

    expect(machinationRules.turnStockCard(state)).toBe(true);

    expect(state.foundations[0].map((c) => c.id)).toEqual([ace.id]);
    expect(state.stock).toHaveLength(1);
    expect(machinationRules.turnedCard(state)).toBeUndefined();
  });

  test("a turned card is placed on the pile chosen", () => {
    const nine = card("9", "clubs", false);
    const state: MachinationGameState = {
      stock: [nine],
      piles: emptyPiles(),
      foundations: [[], [], [], []],
    };
    machinationRules.turnStockCard(state);
    expect(machinationRules.turnedCard(state)?.id).toBe(nine.id);

    expect(machinationRules.placeCard(state, 3)).toBe(true);

    expect(state.piles[3].map((c) => c.id)).toEqual([nine.id]);
    expect(machinationRules.isPlacing(state)).toBe(false);
  });

  test("piles build only once the stock is empty", () => {
    const two = card("2", "spades");
    const state: MachinationGameState = {
      stock: [card("K", "hearts", false)],
      piles: [[two], ...emptyPiles(7)],
      foundations: [[card("A", "spades")], [], [], []],
    };

    expect(machinationRules.buildCard(state, 0)).toBe(false);
    state.stock = [];
    expect(machinationRules.buildCard(state, 0)).toBe(true);
    expect(state.foundations[0].map((c) => c.rank)).toEqual(["A", "2"]);
  });

  test("a suit builds on the foundation its Ace started", () => {
    const state: MachinationGameState = {
      stock: [],
      piles: emptyPiles(),
      foundations: [[card("A", "clubs")], [card("A", "hearts")], [], []],
    };
    expect(machinationRules.foundationFor(state, card("2", "hearts"))).toBe(1);
    // A suit without its Ace yet takes the first empty foundation.
    expect(machinationRules.foundationFor(state, card("A", "spades"))).toBe(2);
  });

  test("the game is lost when no pile top builds", () => {
    const state: MachinationGameState = {
      stock: [],
      piles: [[card("4", "spades"), card("5", "spades")], ...emptyPiles(7)],
      foundations: nearlyBuilt("3"),
    };
    expect(machinationRules.isLost(state)).toBe(true);
    expect(machinationRules.isWon(state)).toBe(false);
  });

  test("each difficulty deals its number of piles", () => {
    const { PILES_BY_DIFFICULTY, createInitialState } = machinationRules;
    expect(PILES_BY_DIFFICULTY).toEqual({ easy: 9, medium: 8, hard: 7 });
    expect(createInitialState().piles).toHaveLength(8);
    expect(createInitialState(9).piles).toHaveLength(9);
    expect(createInitialState(7).piles).toHaveLength(7);
    expect(createInitialState().stock).toHaveLength(52);
  });
});

describe("Machination", () => {
  /** Spades 6 to King on pile 1, top card lowest; the 4 alone on pile 0. */
  function endgame(): MachinationGameState {
    const piles = emptyPiles();
    piles[0] = [card("4", "spades")];
    piles[1] = run("spades", "K", "6");
    return {
      stock: [card("5", "spades")],
      piles,
      foundations: nearlyBuilt("3"),
    };
  }

  test("placing the last card builds every pile and wins", async () => {
    await renderGame("/machination", Machination, endgame());
    expect(outcome()).toBe("playing");

    // On the 6: the 4 comes off, then the 5, then the 6 to the King.
    await pressPile(1);

    expect(outcome()).toBe("won");
    expect(pileZones().every((zone) => zone.cards?.length === 0)).toBe(true);
  });

  test("a card on a lower card of its own suit loses", async () => {
    await renderGame("/machination", Machination, endgame());

    // The 5 on the 4: the 4 can't come off under it, nor the 5 without it.
    await pressPile(0);

    expect(outcome()).toBe("lost");
    expect(harness.wrapperProps?.winLoseMessage).toBe(
      "10 cards could not come off the piles.",
    );
  });

  test("a placement can be undone", async () => {
    const state: MachinationGameState = {
      stock: [card("9", "clubs", false), card("7", "hearts")],
      piles: emptyPiles(),
      foundations: [[], [], [], []],
    };
    await renderGame("/machination", Machination, state);

    await pressPile(2);
    expect(pileZones()[2].cards?.map((c) => c.rank)).toEqual(["7"]);
    expect(harness.wrapperProps?.canUndo).toBe(true);

    const undo = harness.wrapperProps?.undo as () => void;
    await act(async () => undo());
    await settle();

    expect(pileZones()[2].cards).toEqual([]);
  });

  test.each(Object.entries(machinationRules.PILES_BY_DIFFICULTY))(
    "%s deals %i piles",
    async (difficulty, piles) => {
      await setGameSettings("/machination", {
        machinationDifficulty: difficulty as "easy" | "medium" | "hard",
      });
      await renderGame("/machination", Machination);

      expect(pileZones()).toHaveLength(piles);
      // Nine piles widen the board by a column; fewer keep the cards' size.
      const { fixedCols } = harness.mapConfig as { fixedCols?: number };
      expect(fixedCols).toBe(Math.max(8, piles));
    },
  );
});
