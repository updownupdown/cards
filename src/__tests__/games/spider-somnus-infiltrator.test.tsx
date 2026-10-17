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
