import AsyncStorage from "@react-native-async-storage/async-storage";
import { beforeEach, describe, expect, test } from "@jest/globals";
import {
  getGameSettings,
  loadGameSettingsMap,
  recordResult,
} from "@/data/game-menu";

// Settings are cached in memory once read, so each test uses its own game
// rather than relying on storage being cleared in between.
async function bestScore(path: string) {
  return getGameSettings(await loadGameSettingsMap(), path).stats.highestScore;
}

describe("Best score", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test("is the highest score for most games", async () => {
    await recordResult("/poker-squares", true, 80);
    await recordResult("/poker-squares", true, 120);
    await recordResult("/poker-squares", false, 30);
    expect(await bestScore("/poker-squares")).toBe(120);
  });

  test("is the lowest winning score when fewer is better", async () => {
    await recordResult("/memory", true, 40);
    await recordResult("/memory", true, 28);
    await recordResult("/memory", true, 35);
    expect(await bestScore("/memory")).toBe(28);
  });

  test("ignores losses when fewer is better", async () => {
    // Giving up after three moves must not stand as a record.
    await recordResult("/fifteen-puzzle", false, 3);
    expect(await bestScore("/fifteen-puzzle")).toBeNull();
    await recordResult("/fifteen-puzzle", true, 90);
    await recordResult("/fifteen-puzzle", false, 2);
    expect(await bestScore("/fifteen-puzzle")).toBe(90);
  });
});
