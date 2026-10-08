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
  harness,
  mappedCards,
  outcome,
  pressCardId,
  renderGame,
  settle,
} from "../../../jest/game-harness";
import { createDeck, shuffle } from "@/components/Cards/card-utils";
import Sweep, {
  sweepRules,
  type SweepGameState,
} from "@/components/Games/Sweep";
import { seededRandom } from "@/hints/random";

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

const {
  HAND_SIZE,
  TABLE_SIZE,
  captures,
  rivalMove,
  points,
  gather,
  deal,
  playerPlays,
  rivalPlays,
  isWon,
  bestMove,
} = sweepRules;

function baseState(overrides: Partial<SweepGameState>): SweepGameState {
  return {
    stock: [],
    table: [],
    hand: [],
    rival: [],
    playerTaken: [],
    rivalTaken: [],
    playerSweeps: 0,
    rivalSweeps: 0,
    lastTaker: null,
    round: 0,
    phase: "play",
    ...overrides,
  };
}

/** Plays a whole game the way the hints would. */
function autoPlay(state: SweepGameState) {
  for (let step = 0; step < 200; step += 1) {
    if (state.phase === "over") return;
    if (state.phase === "play") {
      const move = bestMove(state)!;
      playerPlays(
        state,
        move.card.id,
        move.taken.map((c) => c.id),
      );
    } else if (state.phase === "rival") {
      rivalPlays(state);
    } else if (state.phase === "redeal") {
      state.round += 1;
      deal(state);
    }
  }
}

describe("Sweep rules", () => {
  test("a card takes one of its value, else cards adding up to it", () => {
    const table = [
      card("3", "clubs"),
      card("4", "hearts"),
      card("7", "spades"),
      card("A", "diamonds"),
    ];
    // The 7 must be taken alone, although 3 + 4 would do.
    expect(captures(table, card("7", "hearts"))).toEqual([[table[2]]]);
    // An 8 takes 7 + A, or 3 + 4 + A.
    const eights = captures(table, card("8", "clubs"));
    expect(eights).toHaveLength(2);
    expect(captures(table, card("2", "clubs"))).toHaveLength(0);
    // Court cards count 11, 12 and 13.
    expect(
      captures([card("10", "clubs"), card("3", "hearts")], card("K", "spades")),
    ).toHaveLength(1);
  });

  test("a card that can take something must, else it's laid down", () => {
    const state = baseState({
      table: [card("5", "clubs")],
      hand: [card("5", "hearts"), card("9", "spades")],
      rival: [card("2", "clubs")],
    });
    playerPlays(state, state.hand[0].id, []);
    expect(state.hand).toHaveLength(2);
    playerPlays(state, state.hand[1].id, []);
    expect(state.table).toHaveLength(2);
    expect(state.phase).toBe("rival");
  });

  test("taking every card on the table is a sweep", () => {
    const table = [card("2", "clubs"), card("6", "hearts")];
    const state = baseState({
      table,
      hand: [card("8", "spades")],
      rival: [card("K", "clubs")],
    });
    playerPlays(state, state.hand[0].id, [table[0].id, table[1].id]);
    expect(state.table).toHaveLength(0);
    expect(state.playerSweeps).toBe(1);
    expect(state.playerTaken).toHaveLength(3);
    expect(state.lastTaker).toBe("player");
  });

  test("the rival takes the most cards, then prefers the 7♦ and diamonds", () => {
    const table = [
      card("7", "diamonds"),
      card("7", "clubs"),
      card("2", "spades"),
      card("5", "hearts"),
    ];
    const hand = [card("7", "hearts"), card("3", "clubs")];
    // The 7♥ takes a single 7, and chooses the 7♦ over the 7♣.
    const move = rivalMove(table, hand)!;
    expect(move.card.rank).toBe("7");
    expect(move.taken).toEqual([table[0]]);
    // With nothing to take, it trails its lowest card.
    const trail = rivalMove([card("K", "clubs")], hand)!;
    expect(trail.taken).toHaveLength(0);
    expect(trail.card.rank).toBe("3");
  });

  test("points are sweeps, then cards, diamonds and the 7♦", () => {
    const state = baseState({
      playerSweeps: 1,
      playerTaken: [card("7", "diamonds"), card("2", "diamonds")],
      rivalTaken: [card("3", "clubs"), card("4", "clubs"), card("5", "clubs")],
      phase: "over",
    });
    expect(points(state)).toEqual({ player: 3, rival: 1 });
    expect(isWon(state)).toBe(true);
  });

  test("the last taker gets what's left when the deck runs out", () => {
    const state = baseState({
      table: [card("K", "clubs")],
      hand: [card("2", "hearts")],
      rival: [],
      lastTaker: "rival",
    });
    playerPlays(state, state.hand[0].id, []);
    expect(state.phase).toBe("over");
    expect(state.rivalTaken).toHaveLength(2);
    expect(state.table).toHaveLength(0);
  });

  test("deals three each and four to the table, every card once", () => {
    const state = baseState({ stock: createDeck() });
    gather(state);
    deal(state);
    expect(state.table).toHaveLength(TABLE_SIZE);
    expect(state.hand).toHaveLength(HAND_SIZE);
    expect(state.rival).toHaveLength(HAND_SIZE);
    expect(state.stock).toHaveLength(52 - TABLE_SIZE - HAND_SIZE * 2);
    expect(state.phase).toBe("play");
  });

  test("playing by the hints wins a fair share of deals", () => {
    const random = seededRandom("sweep-auto");
    let wins = 0;
    const games = 60;
    for (let index = 0; index < games; index += 1) {
      const state = baseState({ stock: shuffle(createDeck(), random) });
      state.phase = "dealing";
      deal(state);
      autoPlay(state);
      expect(state.phase).toBe("over");
      expect(state.playerTaken.length + state.rivalTaken.length).toBe(52);
      if (isWon(state)) wins += 1;
    }
    if (process.env.SWEEP_DEBUG) console.log(`won ${wins} of ${games}`);
    expect(wins).toBeGreaterThan(games * 0.35);
    expect(wins).toBeLessThan(games * 0.95);
  });
});

describe("Sweep screen", () => {
  test("plays a card from the hand and the rival answers", async () => {
    await renderGame("/sweep", Sweep);
    const game = () =>
      (harness.mapConfig as unknown as { game: SweepGameState }).game;
    expect(game().hand).toHaveLength(HAND_SIZE);
    expect(mappedCards()).toHaveLength(52);
    const move = bestMove(game())!;
    await pressCardId(move.card.id);
    // A card with several captures waits for the table cards to be picked.
    if (captures(game().table, move.card).length > 1) {
      for (const taken of move.taken) await pressCardId(taken.id);
    }
    expect(game().hand).toHaveLength(HAND_SIZE - 1);
    await settle(8);
    expect(game().rival).toHaveLength(HAND_SIZE - 1);
    expect(game().phase).toBe("play");
    expect(outcome()).toBe("playing");
  });
});
