import { afterEach, beforeEach, describe, expect, jest, test } from "@jest/globals";
import "../../../jest/game-mocks";
import { harness, outcome, renderGame } from "../../../jest/game-harness";
import { getGameComponentByPath } from "@/data/games-router";
import { GAME_DEFINITIONS } from "@/data/games-registry";
import { act } from "react-test-renderer";

// Every registered game must mount, deal and be playable without errors.

let consoleErrors: unknown[][] = [];

beforeEach(() => {
  jest.useFakeTimers();
  consoleErrors = [];
  jest.spyOn(console, "error").mockImplementation((...args) => {
    consoleErrors.push(args);
  });
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe.each(GAME_DEFINITIONS.map(({ path }) => [path]))("%s", (path) => {
  test("deals and starts in play", async () => {
    const Game = getGameComponentByPath(path);
    expect(Game).not.toBeNull();

    const renderer = await renderGame(path, Game!);

    expect(harness.wrapperProps).not.toBeNull();
    expect(outcome()).toBe("playing");
    expect(consoleErrors).toEqual([]);

    await act(async () => {
      renderer.unmount();
    });
  });
});
