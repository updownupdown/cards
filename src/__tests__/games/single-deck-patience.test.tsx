import { afterEach, beforeEach, describe, expect, jest, test } from "@jest/globals";
import "../../../jest/game-mocks";
import {
  card,
  doubleTapCardId,
  outcome,
  pressButton,
  pressCardId,
  pressZone,
  renderGame,
  run,
} from "../../../jest/game-harness";
import { SUITS, type PlayingCard } from "@/components/Cards/card-utils";
import BakersDozen from "@/components/Games/BakersDozen";
import Bisley from "@/components/Games/Bisley";
import FortunesCall from "@/components/Games/FortunesCall";
import Singularity from "@/components/Games/Singularity";

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

const emptyPiles = (count: number) =>
  Array.from({ length: count }, () => [] as PlayingCard[]);

describe("Singularity", () => {
  test("absorbing the last card wins", async () => {
    const two = card("2", "spades");
    const piles = emptyPiles(17);
    piles[4] = [two];
    await renderGame("/singularity", Singularity, {
      piles,
      hole: [card("A", "spades")],
      ended: false,
      won: false,
    });
    expect(outcome()).toBe("playing");

    await pressCardId(two.id);

    expect(outcome()).toBe("won");
  });

  test("no card able to reach the hole loses", async () => {
    const two = card("2", "spades");
    const piles = emptyPiles(17);
    piles[0] = [card("9", "hearts")];
    piles[1] = [two];
    await renderGame("/singularity", Singularity, {
      piles,
      hole: [card("A", "clubs")],
      ended: false,
      won: false,
    });
    expect(outcome()).toBe("playing");

    await pressCardId(two.id);

    expect(outcome()).toBe("lost");
  });
});

describe("Bisley", () => {
  const spades = SUITS.indexOf("spades");
  const foundations = () => emptyPiles(4);

  test("moving the last card to a foundation wins", async () => {
    const king = card("K", "spades");
    const columns = emptyPiles(13);
    columns[0] = [king];
    await renderGame("/bisley", Bisley, {
      columns,
      ascending: foundations(),
      descending: foundations(),
      ended: false,
      won: false,
    });
    expect(outcome()).toBe("playing");

    await pressCardId(king.id);
    await pressZone(
      (zone) => zone.name === "descending" && zone.pileIndex === spades,
    );

    expect(outcome()).toBe("won");
  });

  test("running out of moves loses", async () => {
    const king = card("K", "spades");
    const columns = emptyPiles(13);
    columns[0] = [king];
    columns[1] = [card("5", "hearts")];
    await renderGame("/bisley", Bisley, {
      columns,
      ascending: foundations(),
      descending: foundations(),
      ended: false,
      won: false,
    });
    expect(outcome()).toBe("playing");

    await pressCardId(king.id);
    await pressZone(
      (zone) => zone.name === "descending" && zone.pileIndex === spades,
    );

    expect(outcome()).toBe("lost");
  });
});

describe("Fortune's Call", () => {
  const baseState = {
    discard: [],
    revealed: false,
    lastCorrect: null,
    ended: false,
    won: false,
  };

  test("reaching the target score wins", async () => {
    const renderer = await renderGame("/fortunes-call", FortunesCall, {
      ...baseState,
      deck: [card("3", "clubs", false)],
      anchor: card("5", "hearts"),
      next: card("9", "spades", false),
      score: 11,
      misses: 0,
    });
    expect(outcome()).toBe("playing");

    await pressButton(renderer, "Higher");

    expect(outcome()).toBe("won");
  });

  test("a third miss loses", async () => {
    const renderer = await renderGame("/fortunes-call", FortunesCall, {
      ...baseState,
      deck: [card("3", "clubs", false)],
      anchor: card("5", "hearts"),
      next: card("2", "spades", false),
      score: 4,
      misses: 2,
    });
    expect(outcome()).toBe("playing");

    await pressButton(renderer, "Higher");

    expect(outcome()).toBe("lost");
  });
});

describe("Baker's Dozen (no lose condition)", () => {
  test("playing the last king to its foundation wins", async () => {
    const king = card("K", "spades");
    await renderGame("/bakers-dozen", BakersDozen, {
      shuffleZone: [],
      tableau: [[king]],
      foundations: [
        run("hearts"),
        run("clubs"),
        run("diamonds"),
        run("spades", "A", "Q"),
      ],
    });
    expect(outcome()).toBe("playing");

    await doubleTapCardId(king.id);

    expect(outcome()).toBe("won");
  });
});
