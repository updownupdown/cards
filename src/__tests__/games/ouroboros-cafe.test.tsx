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
  pressButton,
  pressCardId,
  renderGame,
} from "../../../jest/game-harness";
import type { PlayingCard } from "@/components/Cards/card-utils";
import CafeQueue from "@/components/Games/CafeQueue";
import Ouroboros from "@/components/Games/Ouroboros";

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("Ouroboros", () => {
  async function exploreTwoSteps(
    landing: {
      id: string;
      suit: PlayingCard["suit"];
      rank: string;
      faceUp: boolean;
    },
    aces: PlayingCard[],
  ) {
    const two = card("2", "spades");
    const renderer = await renderGame("/ouroboros", Ouroboros, {
      // Exploring with the 2 moves two places along the loop.
      deck: [
        two,
        card("5", "hearts", false),
        landing,
        card("7", "clubs", false),
      ],
      dealDeck: [],
      deckPos: 0,
      paths: [null, null, null],
      acesPile: aces,
      trinketsPile: [],
      ended: false,
      won: false,
      numLoops: 0,
    });
    expect(outcome()).toBe("playing");

    await pressCardId(two.id);
    await pressButton(renderer, "Explore");
  }

  test("reaching the exit with all four jewels wins", async () => {
    await exploreTwoSteps(
      { id: "joker-exit", suit: "spades", rank: "Joker", faceUp: true },
      [
        card("A", "spades"),
        card("A", "hearts"),
        card("A", "diamonds"),
        card("A", "clubs"),
      ],
    );

    expect(outcome()).toBe("won");
  });

  test("landing on a trap loses", async () => {
    await exploreTwoSteps(card("K", "clubs"), []);

    expect(outcome()).toBe("lost");
  });
});

describe("Cafe Queue", () => {
  const noDiscards = () => ({
    A: 0,
    "2": 0,
    "3": 0,
    "4": 0,
    "5": 0,
    "6": 0,
    "7": 0,
    "8": 0,
    "9": 0,
    "10": 0,
    J: 0,
    Q: 0,
    K: 0,
    Joker: 0,
  });

  test("seating the last customer from the stock wins", async () => {
    // A 5 fits behind the 9 at position 2.
    const renderer = await renderGame("/cafe-queue", CafeQueue, {
      deck: [card("5", "hearts", false)],
      queues: [[card("9", "spades")], [], [], []],
      discard: [],
      discardsByRank: noDiscards(),
      decisionNeeded: false,
      selectedPos: { queueIndex: 0, cardIndex: 1 },
      ended: false,
      won: false,
    });
    expect(outcome()).toBe("playing");

    await pressButton(renderer, "Reveal next customer");

    expect(outcome()).toBe("won");
  });

  test("discarding the fourth card of a rank loses", async () => {
    // An ace doesn't fit ahead of the 5, so it has to be kicked out.
    const renderer = await renderGame("/cafe-queue", CafeQueue, {
      deck: [card("2", "clubs", false), card("A", "hearts", false)],
      queues: [[card("5", "spades")], [], [], []],
      discard: [],
      discardsByRank: { ...noDiscards(), A: 3 },
      decisionNeeded: false,
      selectedPos: { queueIndex: 0, cardIndex: 0 },
      ended: false,
      won: false,
    });
    expect(outcome()).toBe("playing");

    await pressButton(renderer, "Reveal next customer");
    await pressButton(renderer, "Kick them out");

    expect(outcome()).toBe("lost");
  });
});
