import { describe, expect, test } from "@jest/globals";
import "../../../jest/game-mocks";
import { card } from "../../../jest/game-harness";
import {
  crownslayerRules,
  type CrownslayerGameState,
} from "@/components/Games/Crownslayer";
import {
  elementaryDetectiveRules,
  type ElementaryDetectiveGameState,
} from "@/components/Games/ElementaryDetective";
import {
  herbalistRules,
  type HerbalistGameState,
} from "@/components/Games/Herbalist";
import {
  waypointRules,
  type WaypointGameState,
} from "@/components/Games/Waypoint";
import type { PlayingCard } from "@/components/Cards/card-utils";
import type { Hint } from "@/hints/hint";

// The hint finders of Crownslayer, Elementary Detective, Waypoint and
// Herbalist, on positions a few deals may never reach.

const ids = (cards: PlayingCard[] | null | undefined) =>
  cards?.map((c) => c.id).sort();

function targets(hint: Hint | null) {
  return hint?.steps.flatMap((step) =>
    step.map((target) => ("card" in target ? target.card : target.zone)),
  );
}

describe("Crownslayer hints", () => {
  const crownslayer = (
    state: Partial<CrownslayerGameState>,
  ): CrownslayerGameState => ({
    castleDeck: Array.from({ length: 11 }, () => card("K", "spades", false)),
    hand: [],
    selectedCards: [],
    tavernDeck: Array.from({ length: 20 }, () => card("5", "clubs", false)),
    discardPile: [],
    jestersDeck: [],
    phase: "attack",
    currentEnemy: crownslayerRules.createEnemy(card("J", "spades")),
    enemiesDefeated: 0,
    damageDealt: 0,
    spadeShield: 0,
    ended: false,
    won: false,
    winLoseMessage: null,
    victoryType: null,
    ...state,
  });

  test("doubles with clubs for an exact kill, and says so", () => {
    const ace = card("A", "clubs");
    const nine = card("9", "hearts");
    const state = crownslayer({
      hand: [ace, nine, card("8", "spades"), card("2", "spades")],
    });
    expect(ids(crownslayerRules.bestAttack(state)?.play)).toEqual(
      ids([ace, nine]),
    );
    const hint = crownslayerRules.findHint(state);
    expect(targets(hint)).toEqual([ace.id, nine.id, "actions"]);
    expect(hint?.message.values?.label).toBe("Attack");
    expect(hint?.message.note).toBe("Exact kill: the enemy joins your tavern");
  });

  test("blocks with the cards least worth keeping", () => {
    const four = card("4", "spades");
    const six = card("6", "clubs");
    const state = crownslayer({
      phase: "defend",
      hand: [card("10", "diamonds"), four, six, card("9", "hearts")],
    });
    expect(ids(crownslayerRules.bestDefense(state))).toEqual(ids([four, six]));
    expect(crownslayerRules.findHint(state)?.message.values?.label).toBe(
      "Defend",
    );
  });

  test("calls a jester when the hand can't block, picks undone first", () => {
    const three = card("3", "hearts");
    const jester = card("Joker", "spades");
    const hint = crownslayerRules.findHint(
      crownslayer({
        phase: "defend",
        hand: [three, card("2", "clubs")],
        selectedCards: [three],
        jestersDeck: [jester],
      }),
    );
    expect(targets(hint)).toEqual([three.id, jester.id]);
    expect(hint?.message.note).toBe("Call a jester for a fresh hand");
  });
});

describe("Elementary Detective hints", () => {
  // Playmates in a 4 x 3 grid, row by row; "?" ones face down.
  const detective = (
    playmates: PlayingCard[],
    state: Partial<ElementaryDetectiveGameState> = {},
  ): ElementaryDetectiveGameState => ({
    playmates,
    guesses: Array.from({ length: 14 }, () => null),
    draw: [],
    discard: [],
    scorePile: [],
    ended: false,
    won: false,
    winLoseMessage: "",
    ...state,
  });
  const hiddenGrid = () =>
    (["J", "Q", "K"] as const).flatMap((rank) =>
      (["hearts", "clubs", "diamonds", "spades"] as const).map((suit) =>
        card(rank, suit, false),
      ),
    );

  test("places the top card where it most likely scores", () => {
    const move = elementaryDetectiveRules.bestMove(
      detective(hiddenGrid(), { draw: [card("7", "hearts")] }),
    );
    // A row space: four playmates in its line, against three in a column.
    expect(move).toMatchObject({ type: "place" });
    expect([4, 5, 6, 11, 12, 13]).toContain((move as { guess: number }).guess);
  });

  test("reveals the playmate whose guesses should score most", () => {
    const guesses = Array<PlayingCard | null>(14).fill(null);
    // Playmate 5 (row 1, column 1) scores spaces 1, 9, 12 and 5.
    for (const space of [1, 9, 12, 5]) guesses[space] = card("4", "clubs");
    const move = elementaryDetectiveRules.bestMove(
      detective(hiddenGrid(), { guesses }),
    );
    expect(move).toMatchObject({ type: "reveal", playmate: 5 });
  });

  test("clears a guess of a suit all revealed, for a useless card", () => {
    const grid = hiddenGrid();
    // Every heart playmate is revealed (the first of each rank).
    for (const index of [0, 4, 8])
      grid[index] = { ...grid[index], faceUp: true };
    const guesses = Array<PlayingCard | null>(14).fill(card("2", "clubs"));
    guesses[2] = card("5", "hearts");
    const hint = elementaryDetectiveRules.findHint(
      detective(grid, { guesses, draw: [card("8", "hearts")] }),
    );
    expect(targets(hint)).toEqual([guesses[2]!.id]);
    expect(hint?.message.key).toBe("removeCard");
  });
});

describe("Waypoint hints", () => {
  const waypoint = (
    sector: PlayingCard[],
    state: Partial<WaypointGameState> = {},
  ): WaypointGameState => {
    const game = waypointRules.createInitialState();
    game.sectors[0] = sector;
    return { ...game, boosts: [], brakes: [], ...state };
  };

  test("finishes a sector hit with one card", () => {
    const game = waypoint([card("6", "clubs"), card("6", "hearts")]);
    expect(waypointRules.bestMove(game)).toBe("finish");
    expect(waypointRules.findHint(game)?.message.values?.label).toBe("Finish");
  });

  test("draws from the gear of the target's range on an empty sector", () => {
    expect(waypointRules.bestMove(waypoint([card("2", "clubs")]))).toBe(
      "gearOne",
    );
  });

  test("brakes back onto the target rather than crash", () => {
    const game = waypoint([card("5", "clubs"), card("6", "hearts")], {
      brakes: [card("J", "spades")],
    });
    expect(waypointRules.bestMove(game)).toBe("brakes");
    expect(targets(waypointRules.findHint(game))).toEqual(["brakes"]);
  });
});

describe("Herbalist hints", () => {
  const herbalist = (
    creatures: (PlayingCard | null)[],
    herbStacks: PlayingCard[][],
  ): HerbalistGameState => ({
    creatures: creatures.map((c) => (c ? { card: c, healthy: false } : null)),
    stables: [],
    herbStacks,
    eatenHerbs: Array.from({ length: 9 }, () => []),
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
  });

  test("sows the herb that heals a Jack onto it", () => {
    const ace = card("A", "clubs");
    const creatures = [
      card("Q", "spades"),
      card("J", "hearts"),
      card("Q", "clubs"),
      card("K", "clubs"),
      null,
      card("K", "hearts"),
      card("Q", "diamonds"),
      card("K", "spades"),
      card("Q", "hearts"),
    ];
    const stacks: PlayingCard[][] = Array.from({ length: 9 }, () => []);
    stacks[0] = [card("2", "diamonds"), ace];
    stacks[1] = [card("5", "hearts"), card("5", "spades")];
    stacks[6] = [card("3", "spades"), card("4", "clubs")];
    const state = herbalist(creatures, stacks);
    expect(herbalistRules.bestSource(state)).toBe(0);
    expect(herbalistRules.findHint(state)?.message.note).toBe(
      "Pick up these herbs: sown well, they heal a creature",
    );

    const sowing = structuredClone(state);
    herbalistRules.beginDistribution(sowing, 0);
    const hint = herbalistRules.findHint(sowing);
    expect(targets(hint)).toEqual([ace.id, "herbs-1"]);
  });
});
