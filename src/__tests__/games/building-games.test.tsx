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
  outcome,
  pressCardId,
  renderGame,
  run,
} from "../../../jest/game-harness";
import type { PlayingCard } from "@/components/Cards/card-utils";
import BlackberryPie from "@/components/Games/BlackberryPie";
import ThreePeaks from "@/components/Games/ThreePeaks";
import TowerOfHanoi from "@/components/Games/TowerOfHanoi";

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("Three Peaks", () => {
  // Bottom-row cards (indices 18-27) have no blockers.
  const exposed = (
    rank: PlayingCard["rank"],
    suit: PlayingCard["suit"],
    col: number,
  ) => ({
    ...card(rank, suit),
    row: 3,
    col,
    blockers: [],
  });

  test("clearing the last peak card wins", async () => {
    const two = exposed("2", "spades", 0);
    const tableau = Array(28).fill(null);
    tableau[18] = two;
    await renderGame("/three-peaks", ThreePeaks, {
      tableau,
      draw: [],
      waste: [card("A", "hearts")],
    });
    expect(outcome()).toBe("playing");

    await pressCardId(two.id);

    expect(outcome()).toBe("won");
  });

  test("no playable card with an empty stock loses", async () => {
    const two = exposed("2", "spades", 0);
    const tableau = Array(28).fill(null);
    tableau[18] = two;
    tableau[19] = exposed("9", "hearts", 1);
    await renderGame("/three-peaks", ThreePeaks, {
      tableau,
      draw: [],
      waste: [card("A", "clubs")],
    });
    expect(outcome()).toBe("playing");

    await pressCardId(two.id);

    expect(outcome()).toBe("lost");
  });
});

describe("Blackberry Pie", () => {
  const baseState = () => ({
    queen: [card("Q", "hearts")],
    piles: Array.from({ length: 10 }, () => [] as PlayingCard[]),
    retainers: [null, null],
    lastColumn: null,
    canPlayAnywhere: true,
    ended: false,
    won: false,
  });

  test("collecting the last berry wins", async () => {
    const berry = card("2", "clubs");
    const four = card("4", "hearts");
    const berries = Array(10).fill(null);
    berries[0] = berry;
    const state = baseState();
    state.piles[0] = [card("2", "hearts"), card("3", "hearts")];
    await renderGame("/blackberry-pie", BlackberryPie, {
      ...state,
      berries,
      hand: [four],
      stock: [card("9", "spades", false)],
    });
    expect(outcome()).toBe("playing");

    await pressCardId(four.id);
    await pressCardId(berry.id);

    expect(outcome()).toBe("won");
  });

  test("running out of cards loses", async () => {
    const berry = card("2", "clubs");
    const nine = card("9", "spades");
    const berries = Array(10).fill(null);
    berries[0] = berry;
    await renderGame("/blackberry-pie", BlackberryPie, {
      ...baseState(),
      berries,
      hand: [nine],
      stock: [],
    });
    expect(outcome()).toBe("playing");

    await pressCardId(nine.id);
    await pressCardId(berry.id);

    expect(outcome()).toBe("lost");
  });
});

describe("Tower of Hanoi (no lose condition)", () => {
  test("completing the tower wins", async () => {
    await renderGame("/tower-of-hanoi", TowerOfHanoi, {
      deal: [],
      piles: [run("clubs", "9", "2"), [card("A", "clubs")], []],
    });
    expect(outcome()).toBe("playing");

    await dropMove({ pileIndex: 1 }, { pileIndex: 0 });

    expect(outcome()).toBe("won");
  });
});
