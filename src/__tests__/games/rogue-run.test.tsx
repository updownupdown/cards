import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from "@jest/globals";
import type React from "react";
import "../../../jest/game-mocks";
import {
  card,
  outcome,
  pressButton,
  renderGame,
} from "../../../jest/game-harness";
import { shuffle, type PlayingCard } from "@/components/Cards/card-utils";
import RogueRun, {
  rogueRunRules,
  type RogueRunGameState,
} from "@/components/Games/RogueRun";
import { ProgressBar } from "@/components/Home/ProgressBar";

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

function lastRoom(roomCard: PlayingCard, health: number) {
  return {
    draw: [],
    discard: [],
    roomCards: [roomCard, null, null, null],
    roomNum: 15,
    weaponCard: null,
    weaponUsedOn: [],
    health,
    lastRoomNumRanFrom: null,
    isRunning: false,
    ended: false,
    won: false,
  };
}

describe("Rogue Run", () => {
  test("clearing the last card of the dungeon wins", async () => {
    const renderer = await renderGame(
      "/rogue-run",
      RogueRun,
      lastRoom(card("5", "hearts"), 10),
    );
    expect(outcome()).toBe("playing");

    await pressButton(renderer, "+5");

    expect(outcome()).toBe("won");
  });

  test("fighting a monster bare-handed at low health loses", async () => {
    const renderer = await renderGame(
      "/rogue-run",
      RogueRun,
      lastRoom(card("K", "spades"), 5),
    );
    expect(outcome()).toBe("playing");

    await pressButton(renderer, "-13");

    expect(outcome()).toBe("lost");
  });
});

// Plays a whole dungeon with the real rules, never dying, running from the
// rooms listed in `runFromRooms` (by room number), and records the room bar
// each time a room is dealt or run from.
function playDungeon(runFromRooms: number[], seedDeck?: PlayingCard[]) {
  let game: RogueRunGameState = {
    draw: seedDeck ?? shuffle(rogueRunRules.createDeck()),
    discard: [],
    roomCards: [null, null, null, null],
    roomNum: 0,
    weaponCard: null,
    weaponUsedOn: [],
    health: 20,
    lastRoomNumRanFrom: null,
    isRunning: false,
    roomsSkipped: 0,
    ended: false,
    won: false,
  };
  const bars: { current: number; total: number }[] = [];

  for (let step = 0; step < 500 && !game.ended; step += 1) {
    const advanced = rogueRunRules.advanceGame(game);
    if (advanced !== game) {
      game = advanced;
      if (!game.ended) bars.push(rogueRunRules.roomProgress(game));
      continue;
    }

    const room = rogueRunRules.validRoomCards(game.roomCards);
    if (
      runFromRooms.includes(game.roomNum) &&
      room.length === 4 &&
      game.lastRoomNumRanFrom !== game.roomNum
    ) {
      rogueRunRules.applyAction(game, { type: "run" });
      bars.push(rogueRunRules.roomProgress(game));
      continue;
    }

    game.health = 20;
    const roomIndex = game.roomCards.findIndex((c) => c !== null);
    const type = rogueRunRules.cardType(game.roomCards[roomIndex]!);
    rogueRunRules.applyAction(game, {
      type:
        type === "potion" ? "heal" : type === "weapon" ? "equip" : "fight-bare",
      roomIndex,
    });
  }

  return { game, bars };
}

describe("Rogue Run room bar", () => {
  test("a dungeon has as many rooms as the deck deals", () => {
    // 44 cards: a first room of 4, then 3 new cards per room, the last room
    // taking the single card left over.
    expect(rogueRunRules.createDeck()).toHaveLength(44);
    expect(rogueRunRules.dungeonRoomCount(44)).toBe(15);
    expect(rogueRunRules.dungeonRoomCount(4)).toBe(1);
    expect(rogueRunRules.dungeonRoomCount(7)).toBe(2);
    expect(rogueRunRules.dungeonRoomCount(8)).toBe(3);
  });

  test.each([
    ["never running", []],
    ["running once", [1]],
    [
      "running from every room it can",
      Array.from({ length: 15 }, (_, i) => i + 1),
    ],
    ["running late", [13, 14]],
  ])("the bar reaches 100%% exactly on the last room when %s", (_, runs) => {
    for (let deal = 0; deal < 20; deal += 1) {
      const { game, bars } = playDungeon(runs);

      expect(game.won).toBe(true);
      for (const bar of bars) {
        expect(bar.current).toBeGreaterThanOrEqual(1);
        expect(bar.current).toBeLessThanOrEqual(bar.total);
      }
      const last = bars[bars.length - 1];
      expect(last.current).toBe(last.total);
      expect(last.total).toBe(15 + game.roomsSkipped);
      // Only the final room fills the bar.
      expect(bars.filter((bar) => bar.current === bar.total)).toHaveLength(1);
    }
  });

  test("running counts the skipped room as a room", () => {
    const { bars } = playDungeon([2]);
    const before = bars.find((bar) => bar.current === 2)!;
    const afterRun = bars[bars.indexOf(before) + 1];

    expect(before).toEqual({ current: 2, total: 15 });
    expect(afterRun).toEqual({ current: 3, total: 16 });
  });

  test("saves from before rooms were counted still show a sensible bar", () => {
    expect(
      rogueRunRules.roomProgress({ roomNum: 4 } as RogueRunGameState),
    ).toEqual({
      current: 4,
      total: 15,
    });
  });

  test("the room bar on screen shows the room count and total", async () => {
    const renderer = await renderGame("/rogue-run", RogueRun, {
      ...lastRoom(card("5", "hearts"), 10),
      roomNum: 13,
      roomsSkipped: 2,
    });
    const roomBar = renderer.root
      .findAllByType(ProgressBar as React.ComponentType)
      .find((bar) => bar.props.iconName === "door")!;

    expect(roomBar.props.progressValue).toBe(15);
    expect(roomBar.props.totalValue).toBe(17);
    expect(roomBar.props.tallyText).toBe(15);
  });
});
