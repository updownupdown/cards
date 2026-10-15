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
  acceptAutoCompleteOffer,
  card,
  dropMove,
  harness,
  outcome,
  renderVariant,
  run,
} from "../../../jest/game-harness";
import type { PlayingCard } from "@/components/Cards/card-utils";
import type { ComponentType } from "react";
import FlowerGarden from "@/components/Games/FlowerGarden";
import LaBelleLucie from "@/components/Games/LaBelleLucie";
import AustralianPatience from "@/components/Games/AustralianPatience";
import Congress from "@/components/Games/Congress";
import Diplomat from "@/components/Games/Diplomat";
import Easthaven from "@/components/Games/Easthaven";
import FortyThieves from "@/components/Games/FortyThieves";
import Gargantua from "@/components/Games/Gargantua";
import Indian from "@/components/Games/Indian";
import Maria from "@/components/Games/Maria";
import MissMilligan from "@/components/Games/MissMilligan";
import { stockTableauRules } from "@/components/Games/StockTableauSolitaire";
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

function zoneCardIds(id: string) {
  const zone = harness.mapConfig?.zones.find((entry) => entry.id === id);
  return (zone?.cards ?? []).map((entry) => entry.id);
}

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

type VariantCase = [string, string, string, ComponentType, number, number];

describe.each<VariantCase>([
  ["La Belle Lucie", "/la-belle-lucie", "la-belle-lucie", LaBelleLucie, 18, 2],
  ["Trefoil", "/la-belle-lucie", "trefoil", LaBelleLucie, 16, 2],
  ["Shamrocks", "/la-belle-lucie", "shamrocks", LaBelleLucie, 18, 0],
  ["Flower Garden", "/flower-garden", "", FlowerGarden, 6, 0],
])("%s", (_name, path, variant, Game, tableauCount, redeals) => {
  // A reserve card keeps auto-complete from finishing before the test moves.
  test("playing the last king to the foundations wins", async () => {
    const tableau = Array.from(
      { length: tableauCount },
      () => [] as PlayingCard[],
    );
    tableau[0] = [card("K", "spades")];
    await renderVariant(path, variant, Game, {
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
    await renderVariant(path, variant, Game, {
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
  ["Australian Patience", "/australian-patience", "", AustralianPatience, 7, 4],
  ["Whitehead", "/whitehead", "", Whitehead, 7, 4],
  ["Easthaven", "/easthaven", "", Easthaven, 7, 4],
  ["Forty Thieves", "/forty-thieves", "forty-thieves", FortyThieves, 10, 8],
  ["Josephine", "/forty-thieves", "josephine", FortyThieves, 10, 8],
  ["Lucas", "/forty-thieves", "lucas", FortyThieves, 13, 8],
  ["Busy Aces", "/forty-thieves", "busy-aces", FortyThieves, 12, 8],
  ["Congress", "/congress", "", Congress, 8, 8],
  ["Westcliff", "/westcliff", "", Westcliff, 10, 4],
  ["Gargantua", "/gargantua", "gargantua", Gargantua, 9, 8],
  ["Harp", "/gargantua", "harp", Gargantua, 9, 8],
  ["Thumb and Pouch", "/thumb-and-pouch", "", ThumbAndPouch, 7, 4],
  ["Rank and File", "/rank-and-file", "rank-and-file", RankAndFile, 10, 8],
  ["Number Ten", "/rank-and-file", "number-ten", RankAndFile, 10, 8],
  ["Indian", "/indian", "", Indian, 10, 8],
  ["Diplomat", "/diplomat", "", Diplomat, 8, 8],
  ["Maria", "/maria", "", Maria, 9, 8],
  ["Giant", "/miss-milligan", "giant", MissMilligan, 8, 8],
])("%s", (_name, path, variant, Game, columns, foundations) => {
  // A face-down card keeps auto-complete from finishing before the test moves.
  test("playing the last king to the foundations wins", async () => {
    const tableau = Array.from({ length: columns }, () => [] as PlayingCard[]);
    tableau[0] = [card("K", "spades")];
    tableau[1] = [card("5", "clubs", false)];
    await renderVariant(path, variant, Game, {
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
    await renderVariant(path, variant, Game, {
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

describe("Miss Milligan", () => {
  function fixture(tableau: PlayingCard[][], foundations: PlayingCard[][]) {
    return {
      tableau,
      stock: [],
      waste: [],
      foundations,
      redealsUsed: 0,
      pocket: [],
      ended: false,
      won: false,
    };
  }

  test("playing the last king to the foundations wins", async () => {
    const tableau = Array.from({ length: 8 }, () => [] as PlayingCard[]);
    tableau[0] = [card("K", "spades")];
    tableau[1] = [card("5", "clubs", false)];
    await renderVariant(
      "/miss-milligan",
      "miss-milligan",
      MissMilligan,
      fixture(tableau, lastKingFoundations(8)),
    );
    expect(outcome()).toBe("playing");

    await dropMove(
      { zone: "tableau", pile: 0, card: 0 },
      { zone: "foundation", pile: 7 },
    );

    expect(outcome()).toBe("won");
  });

  test("once the stock is empty, a run can wait in the pocket", async () => {
    const tableau = stuckColumns(8);
    const queen = card("Q", "hearts");
    tableau[0] = [card("K", "clubs"), queen];
    await renderVariant(
      "/miss-milligan",
      "miss-milligan",
      MissMilligan,
      fixture(
        tableau,
        Array.from({ length: 8 }, () => []),
      ),
    );

    await dropMove(
      { zone: "tableau", pile: 0, card: 1 },
      { zone: "pocket", pile: 0 },
    );
    // The pocket holds one card or run at a time.
    expect(
      harness.dragOptions?.canDropOnTarget(
        { zone: "tableau", pile: 1, card: 0 },
        { zone: "pocket", pile: 0 },
      ),
    ).toBe(false);
    expect(zoneCardIds("pocket")).toEqual([queen.id]);
  });

  test("a card waiting in the pocket is hinted and auto-completes", async () => {
    // Every foundation done but the last spades; their ace is in the pocket
    // and the rest wait in a column.
    const ace = card("A", "spades");
    const tableau = Array.from({ length: 8 }, () => [] as PlayingCard[]);
    tableau[0] = run("spades", "K", "2");
    const foundations = lastKingFoundations(8);
    foundations[7] = [];
    const state = { ...fixture(tableau, foundations), pocket: [ace] };

    expect(
      stockTableauRules.findHint(state, "miss-milligan")?.steps[0],
    ).toEqual([{ card: ace.id }]);

    await renderVariant("/miss-milligan", "miss-milligan", MissMilligan, state);
    await acceptAutoCompleteOffer();
    expect(zoneCardIds("pocket")).toEqual([]);
    expect(outcome()).toBe("won");
  });
});
