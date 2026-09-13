import { afterEach, beforeEach, describe, expect, jest, test } from "@jest/globals";
import "../../../jest/game-mocks";
import {
  card,
  dropMove,
  outcome,
  renderGame,
  run,
} from "../../../jest/game-harness";
import type { PlayingCard } from "@/components/Cards/card-utils";
import type { ComponentType } from "react";
import FlowerGarden from "@/components/Games/FlowerGarden";
import LaBelleLucie from "@/components/Games/LaBelleLucie";
import Shamrocks from "@/components/Games/Shamrocks";
import AustralianPatience from "@/components/Games/AustralianPatience";
import Congress from "@/components/Games/Congress";
import Diplomat from "@/components/Games/Diplomat";
import Easthaven from "@/components/Games/Easthaven";
import Gargantua from "@/components/Games/Gargantua";
import Harp from "@/components/Games/Harp";
import Indian from "@/components/Games/Indian";
import Josephine from "@/components/Games/Josephine";
import Lucas from "@/components/Games/Lucas";
import Maria from "@/components/Games/Maria";
import NumberTen from "@/components/Games/NumberTen";
import Raglan from "@/components/Games/Raglan";
import RankAndFile from "@/components/Games/RankAndFile";
import ThumbAndPouch from "@/components/Games/ThumbAndPouch";
import Westcliff from "@/components/Games/Westcliff";
import Whitehead from "@/components/Games/Whitehead";

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

const SUITS = ["hearts", "clubs", "diamonds", "spades"] as const;

/** Every foundation complete except the last, which is missing its king. */
function lastKingFoundations(count: number) {
  return Array.from({ length: count }, (_, index) =>
    index === count - 1
      ? run("spades", "A", "Q")
      : run(SUITS[index % SUITS.length]),
  );
}

/**
 * One card per column from ranks that are never one apart, so nothing builds
 * on anything and no column is empty. No aces or twos for the foundations.
 */
function stuckColumns(count: number) {
  const ranks: PlayingCard["rank"][] = ["3", "5", "7", "9", "J", "K"];
  return Array.from({ length: count }, (_, index) => [
    card(ranks[index % ranks.length], SUITS[index % SUITS.length]),
  ]);
}

type VariantCase = [string, string, ComponentType, number, number];

describe.each<VariantCase>([
  ["La Belle Lucie", "/la-belle-lucie", LaBelleLucie, 18, 2],
  ["Shamrocks", "/shamrocks", Shamrocks, 18, 0],
  ["Flower Garden", "/flower-garden", FlowerGarden, 6, 0],
])("%s", (_name, path, Game, tableauCount, redeals) => {
  // A reserve card keeps auto-complete from finishing before the test moves.
  test("playing the last king to the foundations wins", async () => {
    const tableau = Array.from(
      { length: tableauCount },
      () => [] as PlayingCard[],
    );
    tableau[0] = [card("K", "spades")];
    await renderGame(path, Game, {
      setupPile: [],
      tableau,
      reserve: [card("7", "clubs")],
      foundations: lastKingFoundations(4),
      redealsUsed: redeals,
      ended: false,
      won: false,
    });
    expect(outcome()).toBe("playing");

    await dropMove(
      { zone: "tableau", index: 0 },
      { zone: "foundation", index: 3 },
    );

    expect(outcome()).toBe("won");
  });

  test("running out of moves with no redeals left loses", async () => {
    const tableau = stuckColumns(tableauCount);
    tableau[0] = [card("K", "hearts"), card("A", "spades")];
    await renderGame(path, Game, {
      setupPile: [],
      tableau,
      reserve: [card("9", "clubs")],
      foundations: Array.from({ length: 4 }, () => []),
      redealsUsed: redeals,
      ended: false,
      won: false,
    });
    expect(outcome()).toBe("playing");

    await dropMove(
      { zone: "tableau", index: 0 },
      { zone: "foundation", index: 0 },
    );

    expect(outcome()).toBe("lost");
  });
});

describe.each<VariantCase>([
  ["Australian Patience", "/australian-patience", AustralianPatience, 7, 4],
  ["Whitehead", "/whitehead", Whitehead, 7, 4],
  ["Easthaven", "/easthaven", Easthaven, 7, 4],
  ["Josephine", "/josephine", Josephine, 10, 8],
  ["Congress", "/congress", Congress, 8, 8],
  ["Westcliff", "/westcliff", Westcliff, 10, 4],
  ["Gargantua", "/gargantua", Gargantua, 9, 8],
  ["Harp", "/harp", Harp, 9, 8],
  ["Raglan", "/raglan", Raglan, 7, 4],
  ["Thumb and Pouch", "/thumb-and-pouch", ThumbAndPouch, 7, 4],
  ["Lucas", "/lucas", Lucas, 13, 8],
  ["Rank and File", "/rank-and-file", RankAndFile, 10, 8],
  ["Indian", "/indian", Indian, 10, 8],
  ["Diplomat", "/diplomat", Diplomat, 8, 8],
  ["Maria", "/maria", Maria, 9, 8],
  ["Number Ten", "/number-ten", NumberTen, 10, 8],
])("%s", (_name, path, Game, columns, foundations) => {
  // A face-down card keeps auto-complete from finishing before the test moves.
  test("playing the last king to the foundations wins", async () => {
    const tableau = Array.from({ length: columns }, () => [] as PlayingCard[]);
    tableau[0] = [card("K", "spades")];
    tableau[1] = [card("5", "clubs", false)];
    await renderGame(path, Game, {
      tableau,
      stock: [],
      waste: [],
      foundations: lastKingFoundations(foundations),
      redealsUsed: 0,
      ended: false,
      won: false,
    });
    expect(outcome()).toBe("playing");

    await dropMove(
      { zone: "tableau", pile: 0, card: 0 },
      { zone: "foundation", pile: foundations - 1 },
    );

    expect(outcome()).toBe("won");
  });

  test("running out of moves with an empty stock loses", async () => {
    const tableau = stuckColumns(columns);
    tableau[0] = [card("K", "hearts"), card("A", "spades")];
    tableau[1] = [card("7", "clubs", false), ...tableau[1]];
    await renderGame(path, Game, {
      tableau,
      stock: [],
      waste: [],
      foundations: Array.from({ length: foundations }, () => []),
      redealsUsed: 0,
      ended: false,
      won: false,
    });
    expect(outcome()).toBe("playing");

    await dropMove(
      { zone: "tableau", pile: 0, card: 1 },
      { zone: "foundation", pile: 0 },
    );

    expect(outcome()).toBe("lost");
  });
});
