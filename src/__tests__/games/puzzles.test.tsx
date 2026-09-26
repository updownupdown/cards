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
  outcome,
  pressCard,
  pressCardId,
  renderGame,
  renderVariant,
} from "../../../jest/game-harness";
import { SUITS, type PlayingCard } from "@/components/Cards/card-utils";
import BlackHole from "@/components/Games/BlackHole";
import FifteenPuzzle from "@/components/Games/FifteenPuzzle";
import LightsOut from "@/components/Games/LightsOut";

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("Lights Out (no lose condition)", () => {
  test("switching off the last lights wins", async () => {
    const lit = new Set([7, 11, 12, 13, 17]); // a plus around the centre
    const cards: PlayingCard[] = Array.from({ length: 25 }, (_, index) => ({
      ...card("A", "spades"),
      faceUp: lit.has(index),
    }));
    await renderGame("/lights-out", LightsOut, {
      cards,
      moves: 0,
      won: false,
    });
    expect(outcome()).toBe("playing");

    await pressCard((mapped) => mapped.pileIndex === 12);

    expect(outcome()).toBe("won");
  });
});

describe("Fifteen Puzzle (no lose condition)", () => {
  test("sliding the last card home wins", async () => {
    const solved: (PlayingCard | null)[] = SUITS.flatMap((suit) =>
      (["A", "2", "3", "4"] as const).map((rank) => ({
        id: `fifteen-${suit}-${rank}`,
        suit,
        rank,
        faceUp: true,
      })),
    ).slice(0, 15);
    const lastCard = solved[14]!;
    const cells = [...solved.slice(0, 14), null, lastCard];

    await renderGame("/fifteen-puzzle", FifteenPuzzle, {
      cells,
      moves: 0,
      won: false,
    });
    expect(outcome()).toBe("playing");

    await pressCardId(lastCard.id);

    expect(outcome()).toBe("won");
  });
});

describe("All in a Row (Black Hole variant)", () => {
  test("playing the last card wins", async () => {
    const two = card("2", "spades");
    await renderVariant("/black-hole", "all-in-a-row", BlackHole, {
      piles: [[two]],
      hole: [card("A", "hearts")],
      ended: false,
      won: false,
    });
    expect(outcome()).toBe("playing");

    await pressCardId(two.id);

    expect(outcome()).toBe("won");
  });

  test("no adjacent rank left loses", async () => {
    const two = card("2", "spades");
    await renderVariant("/black-hole", "all-in-a-row", BlackHole, {
      piles: [[card("9", "hearts")], [two]],
      hole: [card("A", "clubs")],
      ended: false,
      won: false,
    });
    expect(outcome()).toBe("playing");

    await pressCardId(two.id);

    expect(outcome()).toBe("lost");
  });
});
