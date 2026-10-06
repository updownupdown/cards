import { describe, expect, test } from "@jest/globals";
import "../../../jest/game-mocks";
import { card } from "../../../jest/game-harness";
import { ascentRules } from "@/components/Games/Ascent";
import { crosswordRules } from "@/components/Games/Crossword";
import { dynastyRules } from "@/components/Games/Dynasty";
import { memoryRules } from "@/components/Games/Memory";
import type { PlayingCard } from "@/components/Cards/card-utils";
import type { Hint } from "@/hints/hint";
import { i18n } from "@/i18n";

// Hint finders for Ascent, Memory, Dynasty and Crossword, on positions a few
// deals may never reach.

function targets(hint: Hint | null) {
  return (hint?.steps ?? []).map((step) =>
    step.map((target) => ("card" in target ? target.card : target.zone)),
  );
}

describe("Memory hints", () => {
  const faceOf = (placed: PlayingCard) => `${placed.rank}-${placed.suit}`;
  const board = () => {
    const [a, b] = [card("5", "hearts", false), card("5", "hearts", false)];
    const [c, d] = [card("K", "clubs", false), card("K", "clubs", false)];
    return [a, c, b, d];
  };

  test("turns up an unseen card when nothing is known", () => {
    const grid = board();
    expect(targets(memoryRules.findHint(grid, new Map(), null))).toEqual([
      [grid[0].id],
    ]);
  });

  test("never peeks: a match not yet seen isn't shown", () => {
    const grid = board();
    grid[0] = { ...grid[0], faceUp: true };
    // grid[2] matches grid[0], but only grid[1] comes first among unseen.
    expect(targets(memoryRules.findHint(grid, new Map(), 0))).toEqual([
      [grid[1].id],
    ]);
  });

  test("goes for a match it has seen", () => {
    const grid = board();
    grid[0] = { ...grid[0], faceUp: true };
    const seen = new Map([[grid[2].id, faceOf(grid[2])]]);
    expect(targets(memoryRules.findHint(grid, seen, 0))).toEqual([
      [grid[2].id],
    ]);
  });

  test("takes a pair whose cards are both known", () => {
    const grid = board();
    const seen = new Map([
      [grid[1].id, faceOf(grid[1])],
      [grid[3].id, faceOf(grid[3])],
    ]);
    const hint = memoryRules.findHint(grid, seen, null);
    expect(targets(hint)).toEqual([[grid[1].id]]);
    expect(hint?.message.note).toBe(i18n.t("games:memory.hint.knownPair"));
  });

  test("skips the cards of a missed guess still showing", () => {
    const grid = board().map((placed, index) =>
      index < 2 ? { ...placed, faceUp: true } : placed,
    );
    const seen = new Map(grid.slice(0, 2).map((p) => [p.id, faceOf(p)]));
    // grid[0] and grid[1] are showing: start the known pair... none yet, so
    // turn up an unseen card instead.
    expect(targets(memoryRules.findHint(grid, seen, null, [0, 1]))).toEqual([
      [grid[2].id],
    ]);
  });
});

describe("Dynasty hints", () => {
  const empty = () => ({ cards: [] as PlayingCard[], armour: 0, dead: false });

  test("places the card where it brings down a royal", () => {
    const grid: PlayingCard[][] = Array.from({ length: 9 }, () => [
      card("10", "spades"),
    ]);
    grid[0] = [card("2", "hearts")];
    grid[1] = [card("6", "clubs")];
    grid[2] = [card("5", "diamonds")];
    const royals = Array.from({ length: 12 }, empty);
    royals[4] = { cards: [card("J", "hearts")], armour: 0, dead: false };
    const pending = card("3", "spades");
    const state = {
      stock: [card("4", "clubs", false), card("8", "hearts", false)],
      discard: [],
      grid,
      royals,
      aces: [],
      jokers: [],
      pending,
      lastDrawWasSpecial: false,
      mode: "place" as const,
      selectedStack: null,
      ended: false,
      won: false,
    };
    const hint = dynastyRules.findHint(state);
    expect(targets(hint)).toEqual([[pending.id], ["grid-0"]]);
    expect(hint?.message.note).toBe(i18n.t("games:dynasty.hint.kill"));
  });

  test("plays every move of a deal by the rules", () => {
    let state = dynastyRules.createInitialState();
    for (let step = 0; step < 200 && !state.ended; step++) {
      if (!state.pending && state.stock.length) {
        dynastyRules.processDraw(state);
        continue;
      }
      const move = dynastyRules.bestMove(state);
      if (!move) break;
      state = dynastyRules.applyMove(state, move);
    }
    expect(state.grid.flat().length).toBeGreaterThan(9);
  });
});

describe("Crossword hints", () => {
  test("the last space gets the card that keeps its runs even", () => {
    const state = crosswordRules.createInitialState();
    state.grid = state.grid.map(() => card("2", "hearts"));
    const last = crosswordRules.CELLS - 1;
    state.grid[last] = null;
    const fits = card("4", "diamonds");
    state.hand = [
      card("3", "hearts"),
      card("5", "clubs"),
      fits,
      card("7", "spades"),
    ];
    state.stock = [];
    expect(targets(crosswordRules.findHint(state))).toEqual([
      [fits.id],
      [`cell-${last}`],
    ]);
  });

  test("never makes an odd run while there is another way", () => {
    for (let deal = 0; deal < 3; deal++) {
      const state = crosswordRules.createInitialState();
      for (let step = 0; step < 30 && !state.ended; step++) {
        const move = crosswordRules.bestMove(state)!;
        crosswordRules.placeCard(state, move.hand, move.cell);
      }
      expect(state.lossReason).toBeNull();
    }
  });
});

describe("Ascent hints", () => {
  const settings = {
    difficulty: "standard" as const,
    challenge: "none" as const,
  };
  const climb = (hand: PlayingCard[]) => ({
    deck: Array.from({ length: 20 }, () => card("9", "hearts", false)),
    fatigue: [card("2", "clubs", false)],
    discard: [],
    hand,
    playedRoutes: [],
    trail: [],
    phase: "play" as const,
    winLoseMessage: "",
    ended: false,
    won: false,
  });

  test("plays the whole hand as one route to make camp", () => {
    // Played one at a time, the second five couldn't beat the first.
    const hand = [card("5", "spades"), card("5", "hearts")];
    const hint = ascentRules.findHint(climb(hand), [], settings);
    const steps = targets(hint);
    expect(steps.at(-1)).toEqual(["buttons"]);
    expect(steps.slice(0, -1).flat().sort()).toEqual(
      hand.map((placed) => placed.id).sort(),
    );
    expect(hint?.message.note).toBe(i18n.t("games:ascent.hint.camp"));
  });

  test("clears picked cards that don't start the route", () => {
    const hand = [
      card("5", "spades"),
      card("6", "spades"),
      card("7", "spades"),
    ];
    const state = climb(hand);
    const route = targets(ascentRules.findHint(state, [], settings));
    const wrong = hand.find((placed) => placed.id !== route[0][0])!;
    const hint = ascentRules.findHint(state, [wrong.id], settings);
    expect(hint?.message.values?.label).toBe(i18n.t("cards:clear"));
  });

  test("tapping the route's cards in order makes a playable route", () => {
    const hand = [
      card("2", "hearts"),
      card("9", "clubs"),
      card("9", "diamonds"),
      card("Q", "spades"),
      card("J", "spades"),
      card("4", "clubs"),
    ];
    const hint = ascentRules.findHint(climb(hand), [], settings);
    const ids = targets(hint).slice(0, -1).flat();
    const cards = ids.map((id) => hand.find((placed) => placed.id === id)!);
    const route = ascentRules.analyzeRoute(cards, "none");
    expect(route).not.toBeNull();
    expect(ascentRules.canPlayRoute(route!, null, "none", null).ok).toBe(true);
  });
});
