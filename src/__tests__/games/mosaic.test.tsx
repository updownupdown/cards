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
import { createDeck, isRed } from "@/components/Cards/card-utils";
import Mosaic, {
  mosaicRules,
  type MosaicGameState,
} from "@/components/Games/Mosaic";
import { seededRandom } from "@/hints/random";

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

const {
  SIZE,
  SLIPS,
  runs,
  clues,
  countSolutions,
  hasOneSolution,
  gather,
  deal,
  turnUp,
  isWon,
  isLost,
  nextRed,
} = mosaicRules;

function freshState(random: () => number) {
  const state: MosaicGameState = { stock: createDeck(), grid: [], slips: 0 };
  gather(state);
  deal(state, random);
  return state;
}

describe("Mosaic rules", () => {
  test("clues are the runs of red in a line", () => {
    expect(runs([true, true, false, true, false])).toEqual([2, 1]);
    expect(runs([false, false, false, false, false])).toEqual([]);
    expect(runs([true, true, true, true, true])).toEqual([5]);
  });

  test("counts the squares that fit a set of clues", () => {
    // A full red square has one answer; an empty one too.
    const full = Array.from({ length: SIZE }, () => [SIZE]);
    expect(countSolutions(full, full)).toBe(1);
    const empty = Array.from({ length: SIZE }, () => []);
    expect(countSolutions(empty, empty)).toBe(1);
    // One red in each row and column, in no fixed place: many answers.
    const one = Array.from({ length: SIZE }, () => [1]);
    expect(countSolutions(one, one, 5)).toBe(5);
  });

  test("every deal has exactly one answer", () => {
    const random = seededRandom("mosaic-deal");
    for (let index = 0; index < 10; index += 1) {
      const state = freshState(random);
      expect(state.grid).toHaveLength(SIZE * SIZE);
      expect(state.grid.every((c) => !c.faceUp)).toBe(true);
      expect(state.stock).toHaveLength(52 - SIZE * SIZE);
      expect(hasOneSolution(state.grid)).toBe(true);
    }
  });

  test("turning up a black card is a slip, and three slips lose", () => {
    const state: MosaicGameState = {
      stock: [],
      grid: [
        card("2", "hearts", false),
        card("3", "spades", false),
        card("4", "clubs", false),
        card("5", "spades", false),
      ],
      slips: 0,
    };
    turnUp(state, state.grid[0].id);
    expect(state.slips).toBe(0);
    for (const index of [1, 2, 3]) turnUp(state, state.grid[index].id);
    expect(state.slips).toBe(SLIPS);
    expect(isLost(state)).toBe(true);
  });

  test("turning up every red card wins", () => {
    const state = freshState(seededRandom("mosaic-win"));
    const { rows } = clues(state.grid);
    expect(rows).toHaveLength(SIZE);
    for (let guard = 0; guard < 30; guard += 1) {
      const red = nextRed(state);
      if (!red) break;
      turnUp(state, red.id);
    }
    expect(isWon(state)).toBe(true);
    expect(state.slips).toBe(0);
    expect(state.grid.filter((c) => c.faceUp).length).toBe(
      state.grid.filter((c) => isRed(c.suit)).length,
    );
  });
});

describe("Mosaic screen", () => {
  test("turns cards up by tapping them", async () => {
    await renderGame("/mosaic", Mosaic);
    const game = () =>
      (harness.mapConfig as unknown as { game: MosaicGameState }).game;
    expect(mappedCards()).toHaveLength(SIZE * SIZE);
    const red = nextRed(game())!;
    await pressCardId(red.id);
    expect(game().grid.find((c) => c.id === red.id)?.faceUp).toBe(true);
    expect(game().slips).toBe(0);
    await pressCardId(red.id).catch(() => undefined);
    expect(outcome()).toBe("playing");
  });
});
