import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  DEFAULT_GAME_SETTINGS,
  GAME_SESSION_STORAGE_KEY,
  GAME_SETTINGS_STORAGE_KEY,
  GLOBAL_SETTINGS_STORAGE_KEY,
  RECENT_GAMES_STORAGE_KEY,
  loadGameSettingsMap,
  loadGlobalSettings,
  loadLastGameSession,
  loadRecentlyPlayedGames,
  recordAttempt,
  recordRecentlyPlayedGame,
  recordResult,
  resetAllSettings,
  saveLastGameSession,
  toggleFavoriteGame,
  undoRecordedLoss,
  updateGameSettings,
} from "@/data/game-menu";

jest.mock("@/data/games-registry", () => ({
  GAMES_DATA: {
    "/alpha": { path: "/alpha", title: "Alpha" },
    "/beta": { path: "/beta", title: "Beta" },
  },
}));

describe("game menu storage", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.restoreAllMocks();
  });

  test("normalizes global settings and recovers from invalid JSON", async () => {
    await AsyncStorage.setItem(
      GLOBAL_SETTINGS_STORAGE_KEY,
      JSON.stringify({
        discoverCardSize: "enormous",
        dismissHomeInstallPrompt: 1,
        resumeLastGame: 0,
        showAnimations: false,
      }),
    );

    await expect(loadGlobalSettings()).resolves.toEqual({
      discoverCardSize: "large",
      dismissHomeInstallPrompt: false,
      resumeLastGame: true,
      showAnimations: false,
    });

    await AsyncStorage.setItem(GLOBAL_SETTINGS_STORAGE_KEY, "{");
    await expect(loadGlobalSettings()).resolves.toEqual({
      discoverCardSize: "large",
      dismissHomeInstallPrompt: false,
      resumeLastGame: true,
      showAnimations: true,
    });
  });

  test("saves valid sessions and rejects malformed, expired, and unknown sessions", async () => {
    jest.spyOn(Date, "now").mockReturnValue(2_000_000_000_000);

    await saveLastGameSession("/alpha/", { turn: 3 }, "session-1");
    await expect(loadLastGameSession()).resolves.toMatchObject({
      version: 3,
      sessionId: "session-1",
      path: "/alpha",
      savedAt: 2_000_000_000_000,
      state: { turn: 3 },
    });

    const invalidSessions = [
      "not-json",
      JSON.stringify({
        version: 1,
        path: "/alpha",
        savedAt: 2_000_000_000_000,
        state: {},
      }),
      JSON.stringify({
        version: 2,
        path: "/unknown",
        savedAt: 2_000_000_000_000,
        state: {},
      }),
      JSON.stringify({
        version: 2,
        path: "/alpha",
        savedAt: 1,
        state: {},
      }),
      JSON.stringify({
        version: 2,
        path: "/alpha",
        savedAt: 2_000_000_000_000,
      }),
    ];

    for (const raw of invalidSessions) {
      await AsyncStorage.setItem(GAME_SESSION_STORAGE_KEY, raw);
      await expect(loadLastGameSession()).resolves.toBeNull();
    }

    await saveLastGameSession("/unknown", { turn: 4 }, "session-2");
    await expect(loadLastGameSession()).resolves.toBeNull();
  });

  test("serializes concurrent settings mutations without losing updates", async () => {
    await Promise.all([
      toggleFavoriteGame("/alpha"),
      recordAttempt("/alpha"),
      recordResult("/alpha", true, "42.5"),
      updateGameSettings("/beta", (settings) => ({
        ...settings,
        drawCount: 3,
      })),
    ]);

    const map = await loadGameSettingsMap();
    expect(map["/alpha"]).toMatchObject({
      isFavorite: true,
      stats: {
        attempts: 1,
        wins: 1,
        losses: 0,
        highestScore: 42.5,
      },
    });
    expect(map["/beta"].drawCount).toBe(3);
  });

  test("keeps the write queue usable after a storage failure", async () => {
    const setItem = jest.spyOn(AsyncStorage, "setItem");
    setItem.mockRejectedValueOnce(new Error("storage unavailable"));

    await expect(toggleFavoriteGame("/alpha")).rejects.toThrow(
      "storage unavailable",
    );
    await expect(toggleFavoriteGame("/beta")).resolves.toEqual(
      new Set(["/beta"]),
    );
  });

  test("deduplicates, validates, sorts, and limits recent games", async () => {
    jest
      .spyOn(Date, "now")
      .mockReturnValueOnce(100)
      .mockReturnValueOnce(200)
      .mockReturnValueOnce(300);

    await recordRecentlyPlayedGame("/alpha");
    await recordRecentlyPlayedGame("/beta");
    await recordRecentlyPlayedGame("/alpha");

    expect(await loadRecentlyPlayedGames()).toEqual([
      { path: "/alpha", playedAt: 300 },
      { path: "/beta", playedAt: 200 },
    ]);

    await AsyncStorage.setItem(
      RECENT_GAMES_STORAGE_KEY,
      JSON.stringify([
        { path: "/unknown", playedAt: 500 },
        { path: "/alpha", playedAt: 300 },
        { path: "/beta", playedAt: "bad" },
      ]),
    );
    await expect(loadRecentlyPlayedGames(1)).resolves.toEqual([
      { path: "/alpha", playedAt: 300 },
    ]);
  });

  test("records losses without replacing a higher score", async () => {
    await recordResult("/alpha", true, 50);
    await recordResult("/alpha", false, "not a score");
    await recordResult("/alpha", false, 25);

    expect((await loadGameSettingsMap())["/alpha"].stats).toEqual({
      attempts: 0,
      wins: 1,
      losses: 2,
      highestScore: 50,
    });
  });

  test("records a game session result at most once", async () => {
    await recordResult("/alpha", true, 40, "session-1");
    await recordResult("/alpha", true, 40, "session-1");
    await recordResult("/alpha", false, 20, "session-2");

    expect((await loadGameSettingsMap())["/alpha"]).toMatchObject({
      lastResultSessionId: "session-2",
      stats: {
        attempts: 0,
        wins: 1,
        losses: 1,
        highestScore: 40,
      },
    });
  });

  test("undoes only the active session loss and allows it to be recorded again", async () => {
    await recordResult("/alpha", false, undefined, "session-1");
    await undoRecordedLoss("/alpha", "other-session");
    await undoRecordedLoss("/alpha", "session-1");
    await undoRecordedLoss("/alpha", "session-1");

    expect((await loadGameSettingsMap())["/alpha"].stats.losses).toBe(0);

    await recordResult("/alpha", false, undefined, "session-1");
    expect((await loadGameSettingsMap())["/alpha"].stats.losses).toBe(1);
  });

  test("does not undo a recorded win", async () => {
    await recordResult("/alpha", false, undefined, "older-loss");
    await recordResult("/alpha", true, undefined, "session-1");
    await undoRecordedLoss("/alpha", "session-1");

    expect((await loadGameSettingsMap())["/alpha"].stats).toMatchObject({
      wins: 1,
      losses: 1,
    });
  });

  test("reset clears all persisted settings and sessions", async () => {
    await AsyncStorage.multiSet([
      [GLOBAL_SETTINGS_STORAGE_KEY, JSON.stringify({ resumeLastGame: false })],
      [RECENT_GAMES_STORAGE_KEY, JSON.stringify([{ path: "/alpha" }])],
      [GAME_SESSION_STORAGE_KEY, JSON.stringify({ state: {} })],
      [
        GAME_SETTINGS_STORAGE_KEY,
        JSON.stringify({ "/alpha": DEFAULT_GAME_SETTINGS }),
      ],
    ]);

    await resetAllSettings();

    await expect(loadGameSettingsMap()).resolves.toEqual({});
    await expect(loadRecentlyPlayedGames()).resolves.toEqual([]);
    await expect(loadLastGameSession()).resolves.toBeNull();
  });
});
