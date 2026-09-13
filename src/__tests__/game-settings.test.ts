import { describe, expect, test } from "@jest/globals";
import {
  compactGameSettings,
  DEFAULT_GAME_SETTINGS,
  getGameSettings,
  type GameSettings,
} from "@/data/game-menu";

const path = "/klondike";

describe("getGameSettings", () => {
  test("returns defaults for a game with no stored entry", () => {
    expect(getGameSettings({}, path)).toEqual(DEFAULT_GAME_SETTINGS);
  });

  test("replaces invalid stored values with defaults", () => {
    const settings = getGameSettings(
      {
        [path]: {
          drawCount: 7 as never,
          pyramidDifficulty: "nonsense" as never,
          seerDifficulty: "impossible" as never,
          memoryDifficulty: "legendary" as never,
          stats: { attempts: -3, wins: 2.7, losses: NaN, highestScore: null, fastestTimeMs: null },
        },
      },
      path,
    );

    expect(settings.drawCount).toBe(1);
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
  test("stores nothing for default settings", () => {
    expect(compactGameSettings(DEFAULT_GAME_SETTINGS)).toEqual({});
  });

  test("stores only values that differ from the defaults", () => {
    const settings: GameSettings = {
      ...DEFAULT_GAME_SETTINGS,
      drawCount: 3,
      stats: { attempts: 4, wins: 1, losses: 2, highestScore: 120, fastestTimeMs: 61000 },
    };

    expect(compactGameSettings(settings)).toEqual({
      drawCount: 3,
      stats: { attempts: 4, wins: 1, losses: 2, highestScore: 120, fastestTimeMs: 61000 },
    });
  });

  test("a compact entry loads back to the same settings", () => {
    const settings: GameSettings = {
      ...DEFAULT_GAME_SETTINGS,
      isFavorite: true,
      nightVigilDifficulty: "city",
      lastResultSessionId: "session-1",
      lastResultWon: false,
      stats: { attempts: 9, wins: 3, losses: 5, highestScore: null, fastestTimeMs: null },
    };

    const stored = compactGameSettings(settings);
    expect(getGameSettings({ [path]: stored }, path)).toEqual(settings);
  });
});
