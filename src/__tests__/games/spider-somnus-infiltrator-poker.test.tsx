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
  dropMove,
  outcome,
  pressButton,
  pressCardId,
  renderGame,
  run,
} from "../../../jest/game-harness";
import type { PlayingCard } from "@/components/Cards/card-utils";
import Infiltrator from "@/components/Games/Infiltrator";
import PocketPoker from "@/components/Games/PocketPoker";
import Somnus from "@/components/Games/Somnus";
import SpiderSolitaire from "@/components/Games/SpiderSolitaire";

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("Spider Solitaire (no lose condition)", () => {
  test("completing the eighth run wins", async () => {
    const ace = card("A", "spades");
    const tableau: PlayingCard[][] = Array.from({ length: 10 }, () => []);
    tableau[0] = run("spades", "K", "2");
    tableau[1] = [ace];
    await renderGame("/spider-solitaire", SpiderSolitaire, {
      tableau,
      stock: [],
      foundations: [
        ...Array.from({ length: 7 }, () => run("spades", "K", "A")),
        [],
      ],
    });
    expect(outcome()).toBe("playing");

    await dropMove(
      { zone: "tableau", pileIndex: 1, cardIndex: 0 },
      { zone: "tableau", pileIndex: 0 },
    );

    expect(outcome()).toBe("won");
  });
});

describe("Somnus", () => {
  function dreamState(
    board: (PlayingCard | null)[],
    hand: PlayingCard[],
    life: number,
  ) {
    return {
      dreamDeck: [],
      dreamDiscard: [],
      board,
      assignments: [[], [], []],
      guardianDeck: [card("6", "diamonds", false)],
      guardianDiscard: [],
      hand,
      removedGuardians: [],
      removedNightmares: [],
      life,
      playedThisTurn: false,
      exileUsedThisTurn: false,
      remSleepUsed: false,
      turn: 9,
      ended: false,
      won: false,
      winLoseMessage: "",
    };
  }

  test("defeating the last nightmare wins", async () => {
    const guardian = card("4", "hearts");
    const nightmare = card("3", "spades");
    const renderer = await renderGame(
      "/somnus",
      Somnus,
      dreamState([null, null, nightmare], [guardian], 20),
    );
    expect(outcome()).toBe("playing");

    await pressCardId(guardian.id);
    await pressCardId(nightmare.id);
    await pressButton(renderer, "Assign");
    await pressButton(renderer, "Resolve");

    expect(outcome()).toBe("won");
  });

  test("running out of life loses", async () => {
    const renderer = await renderGame(
      "/somnus",
      Somnus,
      dreamState([null, null, card("9", "spades")], [card("2", "hearts")], 2),
    );
    expect(outcome()).toBe("playing");

    await pressButton(renderer, "Resolve");

    expect(outcome()).toBe("lost");
  });
});

describe("Infiltrator", () => {
  function missionState(spyDeck: PlayingCard[], hand: PlayingCard[]) {
    return {
      spyDeck,
      spyDiscard: [],
      neutralizedSpies: [],
      recruitedSpies: [],
      drawDeck: [card("7", "diamonds", false)],
      drawDiscard: [],
      hand,
      selectedCards: [],
      phase: "action",
      ended: false,
      won: false,
      winLoseMessage: null,
    };
  }

  test("recruiting the last key spy wins", async () => {
    const king = card("K", "spades");
    const renderer = await renderGame(
      "/infiltrator",
      Infiltrator,
      missionState([card("J", "spades")], [king, card("3", "hearts")]),
    );
    expect(outcome()).toBe("playing");

    await pressCardId(king.id);
    await pressButton(renderer, "Recruit");

    expect(outcome()).toBe("won");
  });

  test("assassinating without any double agents loses", async () => {
    const renderer = await renderGame(
      "/infiltrator",
      Infiltrator,
      missionState([card("J", "spades")], [card("3", "hearts")]),
    );
    expect(outcome()).toBe("playing");

    await pressButton(renderer, "Assassinate");

    expect(outcome()).toBe("lost");
  });
});

describe("Pocket Poker", () => {
  const baseState = {
    opponent: [],
    discard: [],
    oppBest: [],
    discardCount: 0,
    bet: 0,
    roundResult: null,
    ended: false,
    won: false,
  };

  test("reaching 10 points wins", async () => {
    // The opponent draws six unconnected cards against a royal flush.
    const renderer = await renderGame("/pocket-poker", PocketPoker, {
      ...baseState,
      deck: [
        card("2", "clubs", false),
        card("3", "diamonds", false),
        card("4", "hearts", false),
        card("7", "spades", false),
        card("8", "clubs", false),
        card("9", "diamonds", false),
      ],
      hand: run("spades", "10", "A").reverse(),
      phase: "bet",
      foldStreak: 0,
      score: 9,
    });
    expect(outcome()).toBe("playing");

    await pressButton(renderer, "Bet 1");

    expect(outcome()).toBe("won");
  });

  test("folding three times in a row loses", async () => {
    const renderer = await renderGame("/pocket-poker", PocketPoker, {
      ...baseState,
      deck: run("clubs", "2", "9", false),
      hand: run("hearts", "2", "6"),
      phase: "decide",
      foldStreak: 2,
      score: 5,
    });
    expect(outcome()).toBe("playing");

    await pressButton(renderer, "Fold");

    expect(outcome()).toBe("lost");
  });
});
