import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from "@jest/globals";
import "../../../jest/game-mocks";
import { harness, renderGame, settle } from "../../../jest/game-harness";
import { seedRandomForEachTest } from "../../../jest/seeded-random";
import { getGameComponentByPath } from "@/data/games-router";
import { GAME_DEFINITIONS } from "@/data/games-registry";
import type { PlayingCard } from "@/components/Cards/card-utils";
import { act } from "react-test-renderer";

// Every registered game's Reset must gather every card back, wherever play
// left it, and deal afresh. The games' own tests start from a fixture, which
// skips the deal, so this is where a pile a reset forgets shows up (Miss
// Milligan's pocket kept its cards through a reset; Sly Fox's dealing pile and
// Ascent's trail lost theirs from the deck for good).
//
// It deals each game, puts a card from its biggest pile into every pile that
// was dealt empty, as play would, then resets.

seedRandomForEachTest();

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

/**
 * Empty lists that aren't piles of their own: picked cards, ids, numbers, and
 * tallies of cards that also lie in a pile. Names starting "selected" or
 * ending "Ids" are skipped everywhere.
 */
const NOT_PILES: Record<string, string[]> = {
  "/bowling": ["bonusRolls"],
  "/delta-21": ["breakthroughs"],
  "/infiltrator": ["neutralizedSpies", "recruitedSpies"],
};

/** Piles of groups of cards, and a group holding one card for each. */
const GROUP_PILES: Record<
  string,
  Record<string, (card: PlayingCard) => unknown>
> = {
  "/ascent": {
    playedRoutes: (card) => ascentRoute(card),
    trail: (card) => ascentRoute(card),
  },
};

function ascentRoute(card: PlayingCard) {
  return {
    cards: [card],
    type: "ascent",
    size: 1,
    anchorValue: 1,
    anchorSuit: card.suit,
  };
}

type Path = (string | number)[];

function isCard(value: unknown): value is PlayingCard {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "rank" in value &&
    "suit" in value
  );
}

function holdsCards(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.some((entry) => isCard(entry) || holdsCards(entry))
  );
}

/**
 * The state's lists of cards, and the empty lists beside them (in the same
 * object or list) that could hold cards.
 */
function cardLists(state: unknown, skip: string[]) {
  const filled: Path[] = [];
  const empty: Path[] = [];

  function walk(value: unknown, path: Path, besideCards: boolean) {
    const key = String(path[path.length - 1] ?? "");
    if (Array.isArray(value)) {
      if (value.length === 0) {
        const skipped =
          /^selected/.test(key) || /Ids$/.test(key) || skip.includes(key);
        if (besideCards && !skipped) empty.push(path);
      } else if (value.every(isCard)) {
        filled.push(path);
      } else {
        const beside = value.some(holdsCards);
        value.forEach((entry, index) => walk(entry, [...path, index], beside));
      }
    } else if (typeof value === "object" && value !== null && !isCard(value)) {
      const beside = Object.values(value).some(holdsCards);
      for (const [name, entry] of Object.entries(value)) {
        walk(entry, [...path, name], beside);
      }
    }
  }

  walk(state, [], false);
  return { filled, empty };
}

function at(state: unknown, path: Path): unknown[] {
  return path.reduce<unknown>(
    (value, key) => (value as Record<string | number, unknown>)[key],
    state,
  ) as unknown[];
}

function cardIds(state: unknown) {
  const ids: string[] = [];
  (function walk(value: unknown) {
    if (isCard(value)) ids.push(value.id);
    else if (Array.isArray(value)) value.forEach(walk);
    else if (typeof value === "object" && value !== null)
      Object.values(value).forEach(walk);
  })(state);
  return ids;
}

describe.each(GAME_DEFINITIONS.map(({ path }) => [path]))("%s", (path) => {
  test("Reset gathers every card back and deals afresh", async () => {
    await renderGame(path, getGameComponentByPath(path)!);
    const dealt = structuredClone(harness.stateManager!.game);
    const groups = GROUP_PILES[path] ?? {};
    const { filled, empty } = cardLists(dealt, [
      ...(NOT_PILES[path] ?? []),
      ...Object.keys(groups),
    ]);
    if (filled.length === 0) return;

    const played = structuredClone(dealt);
    const donor = filled.reduce((longest, entry) =>
      at(played, entry).length > at(played, longest).length ? entry : longest,
    );
    const take = () => at(played, donor).pop() as PlayingCard;
    const placed: { path: Path; id: string }[] = [];
    for (const target of empty) {
      if (at(played, donor).length < 2) break;
      const card = take();
      at(played, target).push(card);
      placed.push({ path: target, id: card.id });
    }
    for (const [key, group] of Object.entries(groups)) {
      if (at(played, donor).length < 2) break;
      const card = take();
      at(played, [key]).push(group(card));
      placed.push({ path: [key], id: card.id });
    }
    await act(async () => harness.stateManager!.setGame(played));

    // The reset waits on timers, which settle() plays out.
    await act(async () => {
      (harness.wrapperProps!.reset as () => void)();
    });
    await settle();

    const redealt = harness.stateManager!.game;
    // No card lost or doubled (some games deal a fresh deck or a new pick of
    // cards, so they're counted, not named).
    expect(cardIds(redealt)).toHaveLength(cardIds(dealt).length);
    // And none left where play had put it.
    const leftBehind = placed
      .filter(({ path: target, id }) =>
        cardIds(at(redealt, target) ?? []).includes(id),
      )
      .map(({ path: target }) => target.join("."));
    expect(leftBehind).toEqual([]);
  });
});
