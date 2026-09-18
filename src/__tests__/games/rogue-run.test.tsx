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
  renderGame,
} from "../../../jest/game-harness";
import type { PlayingCard } from "@/components/Cards/card-utils";
import RogueRun from "@/components/Games/RogueRun";

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
    roomNum: 12,
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
