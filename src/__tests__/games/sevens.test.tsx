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
import { act } from "react-test-renderer";
import { createDeck, shuffle } from "@/components/Cards/card-utils";
import Sevens, {
  sevensRules,
  type SevensGameState,
} from "@/components/Games/Sevens";
import { seededRandom } from "@/hints/random";

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

const {
  HAND_SIZE,
  isPlayable,
  unlocks,
  rivalChoice,
  gather,
  deal,
  playerPlays,
  playerDraws,
  rivalPlays,
  bestCard,
} = sevensRules;

function baseState(overrides: Partial<SevensGameState>): SevensGameState {
  return {
    stock: [],
    table: [],
    hand: [],
    rival: [],
    phase: "play",
    passes: 0,
    ...overrides,
  };
}

function autoPlay(state: SevensGameState) {
  for (let step = 0; step < 300; step += 1) {
    if (state.phase === "over") return;
    if (state.phase === "play") {
      const best = bestCard(state);
      if (best) playerPlays(state, best.id);
      else playerDraws(state);
    } else if (state.phase === "rival") {
      rivalPlays(state);
    }
  }
}

describe("Sevens rules", () => {
  test("a 7 starts its row, and cards go next to either end", () => {
    const table = [card("7", "hearts"), card("8", "hearts")];
    expect(isPlayable(table, card("9", "hearts"))).toBe(true);
    expect(isPlayable(table, card("6", "hearts"))).toBe(true);
    expect(isPlayable(table, card("10", "hearts"))).toBe(false);
    expect(isPlayable(table, card("7", "spades"))).toBe(true);
    expect(isPlayable(table, card("8", "spades"))).toBe(false);
    expect(isPlayable(table, card("7", "hearts"))).toBe(false);
  });

  test("a card unlocks the run of your own cards behind it", () => {
    const hand = [
      card("8", "clubs"),
      card("9", "clubs"),
      card("10", "clubs"),
      card("Q", "clubs"),
      card("6", "clubs"),
    ];
    expect(unlocks(hand, hand[0])).toBe(2);
    expect(unlocks(hand, card("7", "clubs"))).toBe(4);
    expect(unlocks(hand, hand[4])).toBe(0);
  });

  test("the rival plays a 7, else the card that frees the most of its own", () => {
    const table = [card("7", "hearts"), card("7", "spades")];
    const hand = [
      card("7", "clubs"),
      card("8", "hearts"),
      card("9", "hearts"),
      card("6", "spades"),
    ];
    expect(rivalChoice(table, hand)?.rank).toBe("7");
    const noSeven = hand.slice(1);
    expect(rivalChoice(table, noSeven)?.id).toBe(noSeven[0].id);
    expect(rivalChoice(table, [card("K", "clubs")])).toBeNull();
  });

  test("a stuck hand draws from the stock, and passes when it's empty", () => {
    const state = baseState({
      stock: [card("2", "clubs", false)],
      table: [card("7", "hearts")],
      hand: [card("K", "clubs")],
      rival: [card("8", "hearts")],
    });
    playerDraws(state);
    expect(state.hand).toHaveLength(2);
    expect(state.stock).toHaveLength(0);
    expect(state.phase).toBe("rival");
    rivalPlays(state);
    expect(state.phase).toBe("over");
    expect(state.rival).toHaveLength(0);
  });

  test("you can't draw while you hold a card that fits", () => {
    const state = baseState({
      stock: [card("2", "clubs", false)],
      table: [card("7", "hearts")],
      hand: [card("8", "hearts")],
      rival: [card("K", "clubs")],
    });
    playerDraws(state);
    expect(state.hand).toHaveLength(1);
    expect(state.phase).toBe("play");
  });

  test("deals seven cards each, and lays out a 7 to start", () => {
    const state = baseState({ stock: createDeck() });
    gather(state);
    deal(state);
    expect(state.hand).toHaveLength(HAND_SIZE);
    expect(state.rival).toHaveLength(HAND_SIZE);
    expect(state.table).toHaveLength(1);
    expect(state.table[0].rank).toBe("7");
    expect(state.stock).toHaveLength(52 - HAND_SIZE * 2 - 1);
  });

  test("playing by the hints wins a fair share of deals", () => {
    const random = seededRandom("sevens-auto");
    let wins = 0;
    const games = 80;
    for (let index = 0; index < games; index += 1) {
      const state = baseState({ stock: shuffle(createDeck(), random) });
      deal(state);
      autoPlay(state);
      expect(state.phase).toBe("over");
      expect(
        state.stock.length +
          state.table.length +
          state.hand.length +
          state.rival.length,
      ).toBe(52);
      if (state.hand.length === 0) wins += 1;
    }
    if (process.env.SEVENS_DEBUG) console.log(`won ${wins} of ${games}`);
    expect(wins).toBeGreaterThan(games * 0.4);
    expect(wins).toBeLessThan(games * 0.95);
  });
});

describe("Sevens screen", () => {
  test("plays a card, or draws, and the rival answers", async () => {
    await renderGame("/sevens", Sevens);
    const game = () =>
      (harness.mapConfig as unknown as { game: SevensGameState }).game;
    expect(game().hand).toHaveLength(HAND_SIZE);
    expect(mappedCards()).toHaveLength(52);
    const best = bestCard(game());
    if (best) {
      await pressCardId(best.id);
      expect(game().hand).toHaveLength(HAND_SIZE - 1);
      // The rival may already have answered.
      expect(game().table.some((card) => card.id === best.id)).toBe(true);
      expect(game().table.length).toBeGreaterThanOrEqual(2);
    } else {
      const stock = harness.mapConfig!.zones.find((z) => z.id === "stock")!;
      await act(async () => harness.mapConfig!.zoneMapper!(stock)!.onPress!());
      expect(game().hand).toHaveLength(HAND_SIZE + 1);
    }
    await settle(8);
    expect(game().phase).toBe("play");
    expect(outcome()).toBe("playing");
  });
});
