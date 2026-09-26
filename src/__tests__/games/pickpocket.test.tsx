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
  pressButton,
  pressCardId,
  renderGame,
} from "../../../jest/game-harness";
import Pickpocket, {
  pickpocketRules,
  type PickpocketGameState,
} from "@/components/Games/Pickpocket";
import type { CardRank, PlayingCard } from "@/components/Cards/card-utils";

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

const { ROUNDS, WIN_SCORE, cardValue } = pickpocketRules;

/** A face-down grid from 25 ranks, row by row. */
function grid(ranks: CardRank[]): PlayingCard[] {
  return ranks.map((rank) => card(rank, "spades", false));
}

function stateWith(
  cards: PlayingCard[],
  { round = 0, banked = [] as number[] } = {},
): PickpocketGameState {
  return {
    round,
    grid: cards,
    deck: [],
    shown: cards.map(() => false),
    purse: 0,
    banked,
    roundEnd: null,
    caughtAt: null,
  };
}

// One Two and one Three; the King sits in the last row and column.
// prettier-ignore
const EASY: CardRank[] = [
  "2", "A", "A", "A", "A",
  "A", "3", "A", "A", "A",
  "A", "A", "A", "A", "A",
  "A", "A", "A", "A", "A",
  "A", "A", "A", "A", "K",
];

describe("Pickpocket rules", () => {
  test.each(ROUNDS.map((_, round) => round))(
    "round %i deals a matching mix with at least two safe openings",
    (round) => {
      for (let i = 0; i < 20; i++) {
        const state = pickpocketRules.createRoundState(round, []);
        const cards = [...state.grid, ...state.deck];

        expect(state.grid).toHaveLength(25);
        expect(cards).toHaveLength(56);
        expect(state.grid.every((c) => !c.faceUp)).toBe(true);
        const count = (value: number) =>
          state.grid.filter((c) => cardValue(c) === value).length;
        expect(
          ROUNDS[round].some(
            (mix) =>
              count(0) === mix.courts &&
              count(2) === mix.twos &&
              count(3) === mix.threes,
          ),
        ).toBe(true);
        expect(count(1)).toBeLessThanOrEqual(16);
        expect(
          pickpocketRules.safeCells(state.grid).length,
        ).toBeGreaterThanOrEqual(2);
      }
    },
  );

  test("safe cells are the ones no arrangement can make a court", () => {
    const safe = pickpocketRules.safeCells(grid(EASY));
    // Only the bottom-right corner can hold the King.
    expect(safe).toHaveLength(24);
    expect(safe).not.toContain(24);
  });

  test("hints give each line's coins and courts", () => {
    const hints = pickpocketRules.hintsOf(grid(EASY));
    expect(hints[0]).toEqual({ coins: 6, courts: 0 });
    expect(hints[4]).toEqual({ coins: 4, courts: 1 });
    expect(hints[5 + 1]).toEqual({ coins: 7, courts: 0 });
  });

  test("coins multiply the purse and the last treasure banks it", () => {
    const state = stateWith(grid(EASY));
    pickpocketRules.flipCard(state, 1);
    expect(state.purse).toBe(1);
    pickpocketRules.flipCard(state, 0);
    expect(state.purse).toBe(2);
    pickpocketRules.flipCard(state, 6);
    expect(state.purse).toBe(6);
    expect(state.roundEnd).toBe("clean");
    expect(state.banked).toEqual([6]);
    expect(state.grid.every((c) => c.faceUp)).toBe(true);
    expect(state.shown[24]).toBe(true);
    expect(state.shown[6]).toBe(false);
  });

  test("a court loses the purse; walking away keeps it", () => {
    const caught = stateWith(grid(EASY));
    pickpocketRules.flipCard(caught, 0);
    pickpocketRules.flipCard(caught, 24);
    expect(caught.roundEnd).toBe("caught");
    expect(caught.caughtAt).toBe(24);
    expect(caught.banked).toEqual([0]);

    const walked = stateWith(grid(EASY));
    expect(pickpocketRules.walkAway(walked)).toBe(false);
    pickpocketRules.flipCard(walked, 0);
    expect(pickpocketRules.walkAway(walked)).toBe(true);
    expect(walked.banked).toEqual([2]);
  });
});

describe("Pickpocket game", () => {
  test("a clean sweep banks the purse and deals the next round", async () => {
    const cards = grid(EASY);
    const renderer = await renderGame(
      "/pickpocket",
      Pickpocket,
      stateWith(cards),
    );

    await pressCardId(cards[0].id);
    await pressCardId(cards[6].id);
    expect(harness.wrapperProps?.score).toBe(6);

    await pressButton(renderer, "Next Round");
    const cells = harness.mapConfig?.zones.filter((z) => z.name === "cell");
    expect(cells?.every((z) => z.cards?.length === 1)).toBe(true);
    expect(cells?.every((z) => !z.cards?.[0].faceUp)).toBe(true);
    expect(outcome()).toBe("playing");
  });

  test("the last round decides the game against the target", async () => {
    const lastRound = ROUNDS.length - 1;
    const won = grid(EASY);
    await renderGame(
      "/pickpocket",
      Pickpocket,
      stateWith(won, { round: lastRound, banked: [WIN_SCORE, 0, 0, 0] }),
    );
    await pressCardId(won[24].id);
    expect(outcome()).toBe("won");

    const lost = grid(EASY);
    await renderGame(
      "/pickpocket",
      Pickpocket,
      stateWith(lost, { round: lastRound, banked: [100, 0, 0, 0] }),
    );
    await pressCardId(lost[0].id);
    expect(outcome()).toBe("playing");
    await pressCardId(lost[6].id);
    expect(outcome()).toBe("lost");
  });
});
