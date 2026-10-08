// What keeps players' progress when games come and go, beyond the campaign
// map (which saved-data-guard.test.ts covers): achievements earned against
// the old game count, and unfinished deals of a game whose rules changed.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { beforeEach, describe, expect, test } from "@jest/globals";
import { getAchievements } from "@/data/achievements";
import { syncEarnedAchievements } from "@/data/achievement-sync";
import {
  loadEarnedAchievements,
  recordEarnedAchievements,
} from "@/data/earned-achievements";
import {
  EMPTY_STATS,
  GAME_SETTINGS_STORAGE_KEY,
  loadLastGameSession,
  saveLastGameSession,
} from "@/data/game-menu";
import { GAMES_DATA } from "@/data/games-registry";

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe("Achievements once earned", () => {
  const won = { ...EMPTY_STATS, attempts: 1, wins: 1 };

  test("stay earned when a game is added", () => {
    const before = getAchievements({
      stats: [won, won],
      collectedQuotes: 0,
      collectedTaoChapters: 0,
    }).find((achievement) => achievement.key === "wonAll")!;
    expect(before.achieved).toBe(true);

    // A new game, not yet won.
    const after = getAchievements({
      stats: [won, won, EMPTY_STATS],
      collectedQuotes: 0,
      collectedTaoChapters: 0,
      earned: new Set(["wonAll"]),
    }).find((achievement) => achievement.key === "wonAll")!;
    expect(after).toMatchObject({ achieved: true, current: 2, target: 3 });
  });

  test("are saved after a win, from what is saved", async () => {
    // Every game won once.
    await AsyncStorage.setItem(
      GAME_SETTINGS_STORAGE_KEY,
      JSON.stringify(
        Object.fromEntries(
          Object.keys(GAMES_DATA).map((path) => [path, { stats: won }]),
        ),
      ),
    );
    await syncEarnedAchievements();
    const earned = await loadEarnedAchievements();
    expect(earned.has("wonAll")).toBe(true);
    expect(earned.has("triedAll")).toBe(true);
    expect(earned.has("wins500")).toBe(false);
  });

  test("are only ever added to", async () => {
    await recordEarnedAchievements(["wins50"]);
    await recordEarnedAchievements(["mastery"]);
    expect([...(await loadEarnedAchievements())].sort()).toEqual([
      "mastery",
      "wins50",
    ]);
  });
});

describe("An unfinished deal", () => {
  test("is dropped when its game's session version changes, and only then", async () => {
    await saveLastGameSession("/golf", { cards: [] }, "session-1");
    expect((await loadLastGameSession())?.sessionId).toBe("session-1");

    const golf = GAMES_DATA["/golf"];
    golf.sessionVersion = 2;
    try {
      expect(await loadLastGameSession()).toBeNull();
      // Saved by the new build, it loads again.
      await saveLastGameSession("/golf", { cards: [] }, "session-2");
      expect((await loadLastGameSession())?.sessionId).toBe("session-2");
    } finally {
      delete golf.sessionVersion;
    }
  });

  test("saved before session versions existed still loads", async () => {
    await saveLastGameSession("/golf", { cards: [] }, "session-1");
    const saved = JSON.parse(
      (await AsyncStorage.getItem("cards.gameSession.v1"))!,
    );
    delete saved.gameVersion;
    await AsyncStorage.setItem("cards.gameSession.v1", JSON.stringify(saved));
    expect((await loadLastGameSession())?.sessionId).toBe("session-1");
  });
});
