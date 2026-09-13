import { afterEach, beforeEach, describe, expect, jest, test } from "@jest/globals";
import "../../../jest/game-mocks";
import {
  card,
  outcome,
  pressCardId,
  renderGame,
} from "../../../jest/game-harness";
import type { PlayingCard } from "@/components/Cards/card-utils";
import AcesUp from "@/components/Games/AcesUp";
import Golf from "@/components/Games/Golf";
import Memory from "@/components/Games/Memory";
import Nestor from "@/components/Games/Nestor";

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

const emptyPiles = (count: number) =>
  Array.from({ length: count }, () => [] as PlayingCard[]);

describe("Golf", () => {
  test("clearing the last card wins", async () => {
    const two = card("2", "spades");
    const piles = emptyPiles(7);
    piles[0] = [two];
    await renderGame("/golf", Golf, {
      draw: [],
      discard: [card("A", "hearts")],
      piles,
      ended: false,
      won: false,
    });
    expect(outcome()).toBe("playing");

    await pressCardId(two.id);

    expect(outcome()).toBe("won");
  });

  test("no playable card with an empty stock loses", async () => {
    const two = card("2", "spades");
    const piles = emptyPiles(7);
    piles[0] = [two];
    piles[1] = [card("9", "hearts")];
    await renderGame("/golf", Golf, {
      draw: [],
      discard: [card("A", "clubs")],
      piles,
      ended: false,
      won: false,
    });
    expect(outcome()).toBe("playing");

    await pressCardId(two.id);

    expect(outcome()).toBe("lost");
  });
});

describe("Nestor", () => {
  test("removing the last pair wins", async () => {
    const columnFive = card("5", "spades");
    const reserveFive = card("5", "hearts");
    const columns = emptyPiles(8);
    columns[0] = [columnFive];
    await renderGame("/nestor", Nestor, {
      columns,
      reserve: [reserveFive],
      discard: [],
      ended: false,
      won: false,
    });
    expect(outcome()).toBe("playing");

    await pressCardId(columnFive.id);
    await pressCardId(reserveFive.id);

    expect(outcome()).toBe("won");
  });

  test("no matching pair left loses", async () => {
    const columnFive = card("5", "spades");
    const reserveFive = card("5", "hearts");
    const columns = emptyPiles(8);
    columns[0] = [columnFive];
    columns[1] = [card("9", "hearts")];
    await renderGame("/nestor", Nestor, {
      columns,
      reserve: [reserveFive],
      discard: [],
      ended: false,
      won: false,
    });
    expect(outcome()).toBe("playing");

    await pressCardId(columnFive.id);
    await pressCardId(reserveFive.id);

    expect(outcome()).toBe("lost");
  });
});

describe("Memory (no lose condition)", () => {
  test("matching the last pair wins", async () => {
    const first: PlayingCard = { ...card("7", "clubs", false), id: "pair-a" };
    const second: PlayingCard = { ...card("7", "clubs", false), id: "pair-b" };
    await renderGame("/memory", Memory, {
      grid: [first, second],
      discard: [],
      ended: false,
      won: false,
    });
    expect(outcome()).toBe("playing");

    await pressCardId(first.id);
    await pressCardId(second.id);

    expect(outcome()).toBe("won");
  });
});

describe("Aces Up", () => {
  test("discarding down to the four aces wins", async () => {
    const two = card("2", "hearts");
    await renderGame("/aces-up", AcesUp, {
      draw: [],
      piles: [
        [card("A", "spades"), two],
        [card("A", "hearts")],
        [card("A", "diamonds")],
        [card("A", "clubs")],
      ],
      discard: [],
      ended: false,
      won: false,
    });
    expect(outcome()).toBe("playing");

    await pressCardId(two.id);

    expect(outcome()).toBe("won");
  });

  test("getting stuck with other cards loses", async () => {
    const two = card("2", "hearts");
    await renderGame("/aces-up", AcesUp, {
      draw: [],
      piles: [
        [card("5", "spades"), two],
        [card("A", "hearts")],
        [card("K", "diamonds")],
        [card("Q", "clubs")],
      ],
      discard: [],
      ended: false,
      won: false,
    });
    expect(outcome()).toBe("playing");

    await pressCardId(two.id);

    expect(outcome()).toBe("lost");
  });
});
