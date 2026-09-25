import { describe, expect, test } from "@jest/globals";
import {
  compactGameSettings,
  DEFAULT_GAME_SETTINGS,
  getDefaultGameSettings,
  getGameSettings,
  type GameSettings,
} from "@/data/game-menu";

const path = "/klondike";

describe("getGameSettings", () => {
  test("returns defaults for a game with no stored entry", () => {
    expect(getGameSettings({}, "/canfield")).toEqual(DEFAULT_GAME_SETTINGS);
    expect(getGameSettings({}, path)).toEqual(getDefaultGameSettings(path));
  });

  test("Klondike draws three by default; other games keep one", () => {
    expect(getGameSettings({}, path).drawCount).toBe(3);
    expect(getGameSettings({}, "/canfield").drawCount).toBe(1);
  });

  test("replaces invalid stored values with defaults", () => {
    const settings = getGameSettings(
      {
        [path]: {
          drawCount: 7 as never,
          pyramidDifficulty: "nonsense" as never,
          seerDifficulty: "impossible" as never,
          memoryDifficulty: "legendary" as never,
          stats: {
            attempts: -3,
            wins: 2.7,
            losses: NaN,
            highestScore: null,
            fastestTimeMs: null,
          },
        },
      },
      path,
    );

    // Klondike's own default, not the shared one.
    expect(settings.drawCount).toBe(3);
    expect(settings.pyramidDifficulty).toBe(
      DEFAULT_GAME_SETTINGS.pyramidDifficulty,
    );
    expect(settings.seerDifficulty).toBe("normal");
    expect(settings.memoryDifficulty).toBe(
      DEFAULT_GAME_SETTINGS.memoryDifficulty,
    );
    expect(settings.stats).toEqual({
      attempts: 0,
      wins: 2,
      losses: 0,
      highestScore: null,
      fastestTimeMs: null,
    });
  });

  test("keeps valid stored values", () => {
    const settings = getGameSettings(
      { [path]: { drawCount: 3, golfDifficulty: "hard", isFavorite: true } },
      path,
    );

    expect(settings.drawCount).toBe(3);
    expect(settings.golfDifficulty).toBe("hard");
    expect(settings.isFavorite).toBe(true);
  });
});

describe("compactGameSettings", () => {
  test("keeps a choice that differs from the game's own default", () => {
    const drawOne = { ...getDefaultGameSettings(path), drawCount: 1 as const };
    const stored = compactGameSettings(drawOne, path);

    expect(stored).toEqual({ drawCount: 1 });
    expect(getGameSettings({ [path]: stored }, path).drawCount).toBe(1);
    expect(compactGameSettings(getDefaultGameSettings(path), path)).toEqual({});
  });

  test("stores nothing for default settings", () => {
    expect(compactGameSettings(DEFAULT_GAME_SETTINGS)).toEqual({});
  });

  test("stores only values that differ from the defaults", () => {
    const settings: GameSettings = {
      ...DEFAULT_GAME_SETTINGS,
      drawCount: 3,
      stats: {
        attempts: 4,
        wins: 1,
        losses: 2,
        highestScore: 120,
        fastestTimeMs: 61000,
      },
    };

    expect(compactGameSettings(settings)).toEqual({
      drawCount: 3,
      stats: {
        attempts: 4,
        wins: 1,
        losses: 2,
        highestScore: 120,
        fastestTimeMs: 61000,
      },
    });
  });

  test("a compact entry loads back to the same settings", () => {
    const settings: GameSettings = {
      ...DEFAULT_GAME_SETTINGS,
      isFavorite: true,
      nightVigilDifficulty: "city",
      lastResultSessionId: "session-1",
      lastResultWon: false,
      stats: {
        attempts: 9,
        wins: 3,
        losses: 5,
        highestScore: null,
        fastestTimeMs: null,
      },
    };

    const stored = compactGameSettings(settings, path);
    expect(getGameSettings({ [path]: stored }, path)).toEqual(settings);
  });
});
