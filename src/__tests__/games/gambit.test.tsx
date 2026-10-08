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
import { createDeck } from "@/components/Cards/card-utils";
import Gambit, {
  gambitRules,
  type GambitGameState,
} from "@/components/Games/Gambit";
import { seededRandom } from "@/hints/random";

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

const {
  DEAL_SIZES,
  beats,
  rivalLead,
  rivalReply,
  maxTricks,
  naiveTricks,
  findDeal,
  dealInto,
  gather,
  playCard,
  rivalPlays,
  resolveTrick,
  bestCard,
} = gambitRules;

function baseState(overrides: Partial<GambitGameState>): GambitGameState {
  return {
    stock: [],
    trump: card("2", "hearts"),
    hand: [],
    rival: [],
    playerCard: null,
    rivalCard: null,
    leader: "player",
    playerTricks: [],
    rivalTricks: [],
    deal: 0,
    contract: 1,
    phase: "play",
    won: false,
    ...overrides,
  };
}

describe("Gambit rules", () => {
  test("a trump beats any other suit, and aces are high", () => {
    const lead = card("K", "spades");
    expect(beats(card("A", "spades"), lead, "hearts")).toBe(true);
    expect(beats(card("Q", "spades"), lead, "hearts")).toBe(false);
    expect(beats(card("2", "hearts"), lead, "hearts")).toBe(true);
    expect(beats(card("A", "clubs"), lead, "hearts")).toBe(false);
  });

  test("the rival leads its highest card that isn't a trump", () => {
    const hand = [
      card("A", "hearts"),
      card("Q", "clubs"),
      card("Q", "spades"),
      card("4", "diamonds"),
    ];
    expect(rivalLead(hand, "hearts").id).toBe(hand[2].id);
    const trumpsOnly = [card("3", "hearts"), card("9", "hearts")];
    expect(rivalLead(trumpsOnly, "hearts").id).toBe(trumpsOnly[1].id);
  });

  test("the rival answers with its lowest winner, else its lowest card", () => {
    const hand = [
      card("5", "spades"),
      card("J", "spades"),
      card("A", "spades"),
    ];
    expect(rivalReply(hand, card("9", "spades"), "hearts").id).toBe(hand[1].id);
    const outranked = [card("3", "spades"), card("8", "spades")];
    expect(rivalReply(outranked, card("K", "spades"), "hearts").id).toBe(
      outranked[0].id,
    );
    // Void in the suit led, it trumps as cheaply as it can.
    const void_ = [
      card("7", "hearts"),
      card("4", "hearts"),
      card("2", "clubs"),
    ];
    expect(rivalReply(void_, card("K", "spades"), "hearts").id).toBe(
      void_[1].id,
    );
    // Nothing wins: the lowest card, ♣ before ♦ at the same rank.
    const discards = [card("6", "diamonds"), card("6", "clubs")];
    expect(rivalReply(discards, card("K", "spades"), "hearts").id).toBe(
      discards[1].id,
    );
  });

  test("the solver finds the line the obvious play misses", () => {
    // Leading 6♦ first wins it cheaply; the rival then has to spend its
    // trump on 3♦, and leads K♣ into your trump.
    const hand = [
      card("6", "hearts"),
      card("3", "diamonds"),
      card("6", "diamonds"),
    ];
    const rival = [
      card("4", "diamonds"),
      card("K", "hearts"),
      card("K", "clubs"),
    ];
    expect(maxTricks(hand, rival, "player", "hearts")).toBe(2);
    expect(naiveTricks(hand, rival, "hearts", true)).toBe(1);
    expect(naiveTricks(hand, rival, "hearts", false)).toBe(1);
  });

  test("deals are kept only when the obvious play falls short", () => {
    const random = seededRandom("gambit-deal");
    for (const size of DEAL_SIZES) {
      const deal = findDeal(createDeck(), size, random);
      expect(deal.hand).toHaveLength(size);
      expect(deal.rival).toHaveLength(size);
      expect(deal.rest).toHaveLength(52 - size * 2 - 1);
      expect(deal.contract).toBeGreaterThanOrEqual(Math.ceil(size / 2));
      const obvious = Math.max(
        naiveTricks(deal.hand, deal.rival, deal.trump.suit, true),
        naiveTricks(deal.hand, deal.rival, deal.trump.suit, false),
      );
      expect(obvious).toBeLessThan(deal.contract);
    }
  });

  test("following the best card always makes the contract", () => {
    const random = seededRandom("gambit-play");
    const state = baseState({ stock: createDeck(), trump: null });
    for (let dealIndex = 0; dealIndex < DEAL_SIZES.length; dealIndex += 1) {
      gather(state);
      dealInto(state, dealIndex, random);
      expect(state.stock).toHaveLength(52 - DEAL_SIZES[dealIndex] * 2 - 1);
      let guard = 0;
      while (!["made", "over"].includes(state.phase) && guard < 100) {
        guard += 1;
        if (state.phase === "play") playCard(state, bestCard(state)!.id);
        else if (state.phase === "rival") rivalPlays(state);
        else if (state.phase === "resolve") resolveTrick(state);
      }
      expect(state.playerTricks.length / 2).toBe(state.contract);
    }
    expect(state.phase).toBe("over");
    expect(state.won).toBe(true);
  });

  test("you must follow suit when you can", () => {
    const state = baseState({
      hand: [card("2", "spades"), card("A", "clubs")],
      rival: [card("3", "diamonds")],
      rivalCard: card("K", "spades"),
      leader: "rival",
    });
    playCard(state, state.hand[1].id);
    expect(state.playerCard).toBeNull();
    playCard(state, state.hand[0].id);
    expect(state.playerCard?.rank).toBe("2");
    expect(state.phase).toBe("resolve");
  });

  test("the game is lost once the contract is out of reach", () => {
    const state = baseState({
      hand: [card("2", "spades")],
      rival: [card("A", "spades")],
      playerCard: card("3", "spades"),
      rivalCard: card("K", "spades"),
      contract: 2,
      phase: "resolve",
    });
    resolveTrick(state);
    expect(state.rivalTricks).toHaveLength(2);
    expect(state.phase).toBe("over");
    expect(state.won).toBe(false);
  });
});

describe("Gambit screen", () => {
  test("plays a deal through to the next one", async () => {
    await renderGame("/gambit", Gambit);
    const game = () =>
      (harness.mapConfig as unknown as { game: GambitGameState }).game;
    expect(game().hand).toHaveLength(DEAL_SIZES[0]);
    expect(game().rival.every((c) => c.faceUp)).toBe(true);

    let guard = 0;
    while (game().deal === 0 && outcome() === "playing" && guard < 40) {
      guard += 1;
      const best = bestCard(game());
      if (best) await pressCardId(best.id);
      else await settle(8);
    }
    expect(outcome()).toBe("playing");
    expect(game().deal).toBe(1);
    expect(game().hand).toHaveLength(DEAL_SIZES[1]);
    expect(mappedCards()).toHaveLength(52);
  });
});
