import { afterEach, beforeEach, describe, expect, jest, test } from "@jest/globals";
import "../../../jest/game-mocks";
import {
  card,
  dropMove,
  outcome,
  pressButton,
  pressCardId,
  renderGame,
  run,
} from "../../../jest/game-harness";
import type { PlayingCard } from "@/components/Cards/card-utils";
import type { ComponentType } from "react";
import Invaders from "@/components/Games/Invaders";
import MonteCarlo from "@/components/Games/MonteCarlo";
import SimpleSimon from "@/components/Games/SimpleSimon";
import Spiderette from "@/components/Games/Spiderette";
import Stalker from "@/components/Games/Stalker";

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("Monte Carlo", () => {
  async function removePairAndConsolidate(grid: (PlayingCard | null)[]) {
    const renderer = await renderGame("/monte-carlo", MonteCarlo, {
      grid,
      draw: [],
      trash: [],
      ended: false,
      won: false,
    });
    expect(outcome()).toBe("playing");

    await pressCardId(grid[0]!.id);
    await pressCardId(grid[1]!.id);
    await pressButton(renderer, "Consolidate");
  }

  test("clearing every card wins", async () => {
    const grid: (PlayingCard | null)[] = Array(25).fill(null);
    grid[0] = card("5", "spades");
    grid[1] = card("5", "hearts");

    await removePairAndConsolidate(grid);

    expect(outcome()).toBe("won");
  });

  test("no adjacent pair left loses", async () => {
    const grid: (PlayingCard | null)[] = Array(25).fill(null);
    grid[0] = card("5", "spades");
    grid[1] = card("5", "hearts");
    grid[2] = card("9", "clubs");

    await removePairAndConsolidate(grid);

    expect(outcome()).toBe("lost");
  });
});

describe.each<[string, string, ComponentType, number]>([
  ["Spiderette", "/spiderette", Spiderette, 7],
  ["Simple Simon", "/simple-simon", SimpleSimon, 10],
])("%s (no lose condition)", (_name, path, Game, pileCount) => {
  test("completing the fourth suit wins", async () => {
    const tableau = Array.from({ length: pileCount }, () => [] as PlayingCard[]);
    tableau[0] = run("spades", "K", "2");
    tableau[1] = [card("A", "spades")];
    await renderGame(path, Game, {
      tableau,
      stock: [],
      completed: [run("hearts", "K", "A"), run("clubs", "K", "A"), run("diamonds", "K", "A")],
      ended: false,
      won: false,
    });
    expect(outcome()).toBe("playing");

    await dropMove({ pile: 1, card: 0 }, { pile: 0 });

    expect(outcome()).toBe("won");
  });
});

describe("Invaders", () => {
  const defenders = (cards: PlayingCard[]) => [
    ...cards,
    ...Array(6 - cards.length).fill(null),
  ];

  test("beating the last attacker of wave two wins", async () => {
    const defender = card("9", "spades");
    const renderer = await renderGame("/invaders", Invaders, {
      defenderDeck: [],
      currentDefenders: defenders([defender]),
      attackerDeck: [],
      discardDeck: [],
      currentAttackers: [card("4", "hearts")],
      wave: 2,
      ended: false,
      won: false,
      winLoseMessage: "",
    });
    expect(outcome()).toBe("playing");

    await pressCardId(defender.id);
    await pressButton(renderer, "Attack");

    expect(outcome()).toBe("won");
  });

  test("losing the last defender loses", async () => {
    const defender = card("2", "spades");
    const renderer = await renderGame("/invaders", Invaders, {
      defenderDeck: [],
      currentDefenders: defenders([defender]),
      attackerDeck: [],
      discardDeck: [],
      currentAttackers: [card("9", "hearts"), card("K", "diamonds")],
      wave: 1,
      ended: false,
      won: false,
      winLoseMessage: "",
    });
    expect(outcome()).toBe("playing");

    await pressCardId(defender.id);
    await pressButton(renderer, "Sacrifice");

    expect(outcome()).toBe("lost");
  });
});

describe("Stalker", () => {
  test("drawing the last card (reaching dawn) wins", async () => {
    const eight = card("8", "hearts");
    const renderer = await renderGame("/stalker", Stalker, {
      deck: [card("6", "diamonds", false)],
      hand: [card("3", "spades"), eight],
      discard: [],
      ended: false,
      won: false,
    });
    expect(outcome()).toBe("playing");

    await pressCardId(eight.id);
    await pressButton(renderer, "Search");

    expect(outcome()).toBe("won");
  });

  test("an empty hand (caught) loses", async () => {
    const eight = card("8", "hearts");
    const renderer = await renderGame("/stalker", Stalker, {
      deck: [card("6", "diamonds", false), card("2", "clubs", false)],
      hand: [eight],
      discard: [],
      ended: false,
      won: false,
    });
    expect(outcome()).toBe("playing");

    await pressCardId(eight.id);
    await pressButton(renderer, "Search");

    expect(outcome()).toBe("lost");
  });
});
