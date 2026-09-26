import AsyncStorage from "@react-native-async-storage/async-storage";
import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import {
  loadGameSettingsMap,
  loadRecentlyPlayedGames,
  MAX_RECENT_GAMES,
  recordAttempt,
  RECENT_GAMES_STORAGE_KEY,
  resetAllSettings,
} from "@/data/game-menu";
import { GAMES_DATA } from "@/data/games-registry";

// The recent list feeds the Home tab's "Jump back in": opening a game is
// enough, with no win, loss or time played needed.

const recentPaths = async () =>
  (await loadRecentlyPlayedGames()).map((entry) => entry.path);

let clock = 1_000_000;

beforeEach(async () => {
  // Each open gets its own time, so the order never rests on a tie.
  jest.spyOn(Date, "now").mockImplementation(() => (clock += 1000));
  await resetAllSettings();
});

describe("Recently played games", () => {
  test("opening a game puts it on the list, with no result recorded", async () => {
    await recordAttempt("/klondike");

    expect(await recentPaths()).toEqual(["/klondike"]);
    const { stats } = (await loadGameSettingsMap())["/klondike"];
    expect(stats).toMatchObject({ attempts: 1, wins: 0, losses: 0 });
  });

  test("the newest open comes first, and reopening moves a game back up", async () => {
    await recordAttempt("/klondike");
    await recordAttempt("/yukon");
    await recordAttempt("/canfield");
    expect(await recentPaths()).toEqual(["/canfield", "/yukon", "/klondike"]);

    await recordAttempt("/klondike/");
    expect(await recentPaths()).toEqual(["/klondike", "/canfield", "/yukon"]);
  });

  test(`keeps only the ${MAX_RECENT_GAMES} most recent games`, async () => {
    const paths = Object.keys(GAMES_DATA).slice(0, MAX_RECENT_GAMES + 2);
    expect(paths).toHaveLength(MAX_RECENT_GAMES + 2);
    for (const path of paths) await recordAttempt(path);

    expect(await recentPaths()).toEqual(paths.slice(2).reverse());
  });

  test("drops removed games and bad entries from storage", async () => {
    await AsyncStorage.setItem(
      RECENT_GAMES_STORAGE_KEY,
      JSON.stringify([
        { path: "/klondike", playedAt: 2 },
        { path: "/no-such-game", playedAt: 5 },
        { path: "/yukon", playedAt: "yesterday" },
        { path: "/canfield", playedAt: 3 },
        null,
      ]),
    );
    expect(await recentPaths()).toEqual(["/canfield", "/klondike"]);

    await AsyncStorage.setItem(RECENT_GAMES_STORAGE_KEY, "not json");
    expect(await recentPaths()).toEqual([]);
  });
});
