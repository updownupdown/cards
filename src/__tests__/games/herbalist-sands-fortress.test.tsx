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
  doubleTapCardId,
  outcome,
  pressButton,
  pressCardId,
  renderGame,
  run,
} from "../../../jest/game-harness";
import type { PlayingCard } from "@/components/Cards/card-utils";
import Fortress from "@/components/Games/Fortress";
import Herbalist from "@/components/Games/Herbalist";
import ShiftingSands from "@/components/Games/ShiftingSands";

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("Herbalist", () => {
  // Location 4 is the stables; the realm creatures sit at 0-3 and 5-8.
  const healthy = (rank: PlayingCard["rank"], suit: PlayingCard["suit"]) => ({
    card: card(rank, suit),
    healthy: true,
  });

  function baseState() {
    return {
      creatures: [
        healthy("Q", "hearts"),
        healthy("K", "diamonds"),
        healthy("Q", "diamonds"),
        healthy("K", "hearts"),
        null,
        healthy("Q", "hearts"),
        healthy("K", "diamonds"),
        healthy("Q", "diamonds"),
        healthy("K", "hearts"),
      ] as ({ card: PlayingCard; healthy: boolean } | null)[],
      stables: [],
      herbStacks: Array.from({ length: 9 }, () => [] as PlayingCard[]),
      eatenHerbs: Array.from({ length: 9 }, () => [] as PlayingCard[]),
      noble: null,
      nobleEaten: [],
      jester: null,
      jesterEaten: [],
      carriedHerbs: [],
      nextLocation: null,
      phase: "chooseSource",
      openStables: false,
      ended: false,
      won: false,
      winLoseMessage: "",
    };
  }

  async function carryHerb(herb: PlayingCard) {
    await pressCardId(herb.id);
    await pressCardId(herb.id);
  }

  test("healing the last creature wins", async () => {
    const state = baseState();
    // The sick jack needs 11 in herbs including a spade: 5 + 4 + 2.
    state.creatures[1] = { card: card("J", "spades"), healthy: false };
    state.herbStacks[1] = [card("5", "spades"), card("4", "hearts")];
    const two = card("2", "clubs");
    state.herbStacks[0] = [two];
    await renderGame("/herbalist", Herbalist, state);
    expect(outcome()).toBe("playing");

    await carryHerb(two);

    expect(outcome()).toBe("won");
  });

  test("running out of herbs loses", async () => {
    const state = baseState();
    state.creatures[1] = healthy("K", "clubs");
    state.creatures[2] = { card: card("J", "spades"), healthy: false };
    const two = card("2", "clubs");
    state.herbStacks[0] = [two];
    await renderGame("/herbalist", Herbalist, state);
    expect(outcome()).toBe("playing");

    // The healthy club king eats the only herb.
    await carryHerb(two);

    expect(outcome()).toBe("lost");
  });
});

describe("Shifting Sands", () => {
  const baseState = {
    hand: [],
    discard: [],
    phase: "gather",
    lastColumn: null,
    direction: null,
    previewStart: 0,
    reversed: false,
    ended: false,
    won: false,
  };

  async function drawOneAndPlace(
    renderer: Awaited<ReturnType<typeof renderGame>>,
  ) {
    await pressButton(renderer, "1");
    await pressButton(renderer, "Place");
  }

  test("a castle bigger than the eroded pile when the stock runs out wins", async () => {
    const renderer = await renderGame("/shifting-sands", ShiftingSands, {
      ...baseState,
      deck: [card("2", "clubs", false), card("9", "spades", false)],
      columns: [
        [card("3", "spades"), card("4", "spades"), card("5", "spades")],
      ],
    });
    expect(outcome()).toBe("playing");

    await drawOneAndPlace(renderer);

    expect(outcome()).toBe("won");
  });

  test("a castle no bigger than the eroded pile loses", async () => {
    const renderer = await renderGame("/shifting-sands", ShiftingSands, {
      ...baseState,
      deck: [card("2", "clubs", false), card("9", "spades", false)],
      columns: [[]],
    });
    expect(outcome()).toBe("playing");

    await drawOneAndPlace(renderer);

    expect(outcome()).toBe("lost");
  });
});

describe("Fortress", () => {
  const emptyColumns = () =>
    Array.from({ length: 10 }, () => [] as PlayingCard[]);

  test("automatically plays the last king home", async () => {
    const king = card("K", "spades");
    const columns = emptyColumns();
    columns[0] = [king];
    await renderGame("/fortress", Fortress, {
      columns,
      foundations: [
        run("hearts"),
        run("clubs"),
        run("diamonds"),
        run("spades", "A", "Q"),
      ],
      ended: false,
      won: false,
    });

    expect(outcome()).toBe("won");
  });

  test("no legal move loses", async () => {
    const two = card("2", "spades");
    const columns = emptyColumns();
    columns[0] = [two];
    columns[1] = [card("9", "hearts")];
    columns[2] = [card("5", "diamonds")];
    await renderGame("/fortress", Fortress, {
      columns,
      foundations: [[card("A", "spades")], [], [], []],
      ended: false,
      won: false,
    });
    expect(outcome()).toBe("playing");

    await doubleTapCardId(two.id);

    expect(outcome()).toBe("lost");
  });
});
