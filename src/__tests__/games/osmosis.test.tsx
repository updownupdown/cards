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
} from "../../../jest/game-harness";
import { act } from "react-test-renderer";
import { createDeck, shuffle } from "@/components/Cards/card-utils";
import Osmosis, {
  osmosisRules,
  type OsmosisGameState,
} from "@/components/Games/Osmosis";
import { seededRandom } from "@/hints/random";

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

const {
  DRAW_COUNT,
  targetRow,
  playable,
  gather,
  deal,
  playCard,
  draw,
  isWon,
  isLost,
  bestCard,
} = osmosisRules;

function baseState(overrides: Partial<OsmosisGameState>): OsmosisGameState {
  return {
    stock: [],
    waste: [],
    reserves: [[], [], [], []],
    foundations: [],
    drawsSincePlay: 0,
    ...overrides,
  };
}

function autoPlay(state: OsmosisGameState) {
  for (let step = 0; step < 2000; step += 1) {
    if (isWon(state) || isLost(state)) return;
    const best = bestCard(state);
    if (best) playCard(state, best.id);
    else draw(state);
  }
}

describe("Osmosis rules", () => {
  test("a card joins a row once its rank lies in the row above", () => {
    const state = baseState({
      foundations: [
        [card("9", "hearts"), card("4", "hearts")],
        [card("9", "spades")],
      ],
    });
    // Any heart goes to the first row.
    expect(targetRow(state, card("K", "hearts"))).toBe(0);
    // A spade only once its rank is among the hearts.
    expect(targetRow(state, card("4", "spades"))).toBe(1);
    expect(targetRow(state, card("K", "spades"))).toBe(-1);
    // A new row starts with the first row's first rank.
    expect(targetRow(state, card("9", "clubs"))).toBe(2);
    expect(targetRow(state, card("4", "clubs"))).toBe(-1);
  });

  test("only reserve tops and the waste top can be played", () => {
    const top = card("9", "clubs");
    const under = card("9", "diamonds");
    const state = baseState({
      foundations: [[card("9", "hearts")]],
      reserves: [[under, top], [], [], []],
      waste: [card("2", "hearts"), card("9", "spades")],
    });
    expect(playable(state).map((c) => c.id)).toEqual([
      top.id,
      state.waste[1].id,
    ]);
    expect(playCard(state, under.id)).toBe(false);
    expect(playCard(state, top.id)).toBe(true);
    expect(state.foundations[1]).toEqual([top]);
    expect(state.reserves[0]).toEqual([under]);
  });

  test("the stock turns one card at a time and the waste goes round again", () => {
    const state = baseState({
      stock: [card("2", "clubs", false), card("3", "clubs", false)],
    });
    draw(state);
    expect(state.waste.map((c) => c.rank)).toEqual(["3"]);
    expect(state.waste[0].faceUp).toBe(true);
    draw(state);
    expect(state.stock).toHaveLength(0);
    expect(state.waste.map((c) => c.rank)).toEqual(["3", "2"]);
    draw(state);
    expect(state.stock.map((c) => c.rank)).toEqual(["2"]);
    expect(state.waste.map((c) => c.rank)).toEqual(["3"]);
  });

  test("the game is lost after a full pass with nothing to play", () => {
    const state = baseState({
      foundations: [[card("9", "hearts")]],
      stock: [card("2", "clubs", false), card("3", "clubs", false)],
    });
    expect(isLost(state)).toBe(false);
    draw(state);
    draw(state);
    expect(isLost(state)).toBe(false);
    draw(state);
    expect(isLost(state)).toBe(true);
  });

  test("an empty stock with nothing to play is lost", () => {
    const state = baseState({
      foundations: [[card("9", "hearts")]],
      reserves: [[card("2", "clubs")], [], [], []],
    });
    expect(isLost(state)).toBe(true);
  });

  test("deals four reserves of four and the first foundation card", () => {
    const state = baseState({ stock: createDeck() });
    gather(state);
    deal(state);
    expect(state.reserves.map((pile) => pile.length)).toEqual([4, 4, 4, 4]);
    expect(state.reserves.flat().every((c) => c.faceUp)).toBe(true);
    expect(state.foundations).toHaveLength(1);
    expect(state.stock).toHaveLength(52 - 17);
  });

  test("playing by the hints wins a fair share of deals", () => {
    const random = seededRandom("osmosis-auto");
    let wins = 0;
    const games = 60;
    for (let index = 0; index < games; index += 1) {
      const state = baseState({ stock: shuffle(createDeck(), random) });
      deal(state);
      autoPlay(state);
      expect(isWon(state) || isLost(state)).toBe(true);
      if (isWon(state)) wins += 1;
    }
    if (process.env.OSMOSIS_DEBUG) console.log(`won ${wins} of ${games}`);
    expect(wins).toBeGreaterThan(games * 0.2);
    expect(wins).toBeLessThan(games * 0.95);
  });
});

describe("Osmosis screen", () => {
  test("plays a reserve card, or draws, by tapping", async () => {
    await renderGame("/osmosis", Osmosis);
    const game = () =>
      (harness.mapConfig as unknown as { game: OsmosisGameState }).game;
    expect(mappedCards()).toHaveLength(52);
    const best = bestCard(game());
    if (best) {
      const before = game().foundations.flat().length;
      await pressCardId(best.id);
      expect(game().foundations.flat().length).toBe(before + 1);
    } else {
      const stock = harness.mapConfig!.zones.find((z) => z.id === "stock")!;
      await act(async () => harness.mapConfig!.zoneMapper!(stock)!.onPress!());
      expect(game().waste).toHaveLength(DRAW_COUNT);
    }
    expect(outcome()).toBe("playing");
  });
});
