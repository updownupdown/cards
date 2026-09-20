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
  outcome,
  pressCardId,
  renderGame,
} from "../../../jest/game-harness";
import Jailbreak, {
  jailbreakRules,
  type JailbreakDifficulty,
  type JailbreakGameState,
} from "@/components/Games/Jailbreak";
import type { PlayingCard } from "@/components/Cards/card-utils";

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

function stateWithPiles(piles: PlayingCard[][]): JailbreakGameState {
  return {
    piles,
    remainder: [],
    jokerPile: [],
    discard: [],
    ended: false,
    won: false,
  };
}

describe("Jailbreak rules", () => {
  test.each<[JailbreakDifficulty, number, number]>([
    ["easy", 4, 12],
    ["normal", 2, 20],
    ["hard", 0, 28],
  ])(
    "%s deals six-card walls, %i-card corners, and %i remainder cards",
    (difficulty, cornerSize, remainderSize) => {
      const state = jailbreakRules.createInitialState(difficulty, () => 0.5);

      expect(state.piles.map((pile) => pile.length)).toEqual([
        6,
        cornerSize,
        6,
        cornerSize,
        6,
        cornerSize,
        6,
        cornerSize,
      ]);
      expect(state.remainder).toHaveLength(remainderSize);
      expect(
        state.piles.every((pile) => pile.length === 0 || pile.at(-1)?.faceUp),
      ).toBe(true);
    },
  );

  test("balances multiple red cards against one black card", () => {
    const piles = Array.from({ length: 8 }, () => [] as PlayingCard[]);
    piles[0] = [card("6", "spades")];
    piles[1] = [card("4", "hearts")];
    piles[2] = [card("2", "diamonds")];
    const state = stateWithPiles(piles);
    const selected = [
      { zone: "jail", index: 0 },
      { zone: "jail", index: 1 },
      { zone: "jail", index: 2 },
    ] as const;

    expect(jailbreakRules.selectionTotals(state, [...selected])).toEqual({
      red: 6,
      black: 6,
    });
    expect(jailbreakRules.isBalancedSelection(state, [...selected])).toBe(true);
  });

  test("only an empty wall with a clear joker pile wins", () => {
    const piles = Array.from({ length: 8 }, () => [card("A", "spades")]);
    piles[1] = [];
    expect(jailbreakRules.isWon(stateWithPiles(piles))).toBe(false);

    piles[0] = [];
    expect(jailbreakRules.isWon(stateWithPiles(piles))).toBe(true);

    const blocked = stateWithPiles(piles);
    blocked.jokerPile = [card("2", "hearts")];
    expect(jailbreakRules.isWon(blocked)).toBe(false);
  });

  test("a full joker stack with no equal color totals has no move", () => {
    const piles = Array.from({ length: 8 }, () => [] as PlayingCard[]);
    piles[0] = [card("A", "hearts")];
    const state = stateWithPiles(piles);
    state.jokerPile = [
      card("2", "hearts"),
      card("3", "hearts"),
      card("4", "hearts"),
    ];
    expect(jailbreakRules.hasAvailableMove(state)).toBe(false);
  });
});

describe("Jailbreak game", () => {
  test("automatically clears equal selected totals and opens a wall", async () => {
    const blackSix = card("6", "spades");
    const redFour = card("4", "hearts");
    const redTwo = card("2", "diamonds");
    const piles = Array.from({ length: 8 }, () => [card("K", "clubs")]);
    piles[0] = [blackSix];
    piles[1] = [redFour];
    piles[3] = [redTwo];

    await renderGame("/jailbreak", Jailbreak, stateWithPiles(piles));
    expect(outcome()).toBe("playing");

    await pressCardId(redFour.id);
    await pressCardId(redTwo.id);
    await pressCardId(blackSix.id);

    expect(outcome()).toBe("won");
    const discard = harness.mapConfig?.zones.find(
      (zone) => zone.name === "discard",
    );
    expect(discard?.cards?.map((discarded) => discarded.id)).toEqual([
      redFour.id,
      redTwo.id,
      blackSix.id,
    ]);
  });
});
