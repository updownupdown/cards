import { act, renderHook } from "@testing-library/react-native";
import { useHomeData } from "@/hooks/useHomeData";
import {
  loadFavoriteGames,
  loadGameSettingsMap,
  loadRecentlyPlayedGames,
  toggleFavoriteGame,
} from "@/data/game-menu";

jest.mock("@/data/games-registry", () => ({
  GAMES_DATA: {
    "/beta": { path: "/beta", title: "Beta", enabled: true },
    "/hidden": { path: "/hidden", title: "Hidden", enabled: false },
    "/alpha": { path: "/alpha", title: "Alpha", enabled: true },
  },
}));

jest.mock("@/data/games-data", () => ({
  isGameEnabled: (game: { enabled: boolean }) => game.enabled,
}));

jest.mock("@/data/game-menu", () => ({
  loadFavoriteGames: jest.fn(),
  loadRecentlyPlayedGames: jest.fn(),
  loadGameSettingsMap: jest.fn(),
  toggleFavoriteGame: jest.fn(),
}));

const mockLoadFavoriteGames = jest.mocked(loadFavoriteGames);
const mockLoadRecentlyPlayedGames = jest.mocked(loadRecentlyPlayedGames);
const mockLoadGameSettingsMap = jest.mocked(loadGameSettingsMap);
const mockToggleFavoriteGame = jest.mocked(toggleFavoriteGame);

async function flushEffects() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("useHomeData", () => {
  beforeEach(() => {
    mockLoadFavoriteGames.mockReset().mockResolvedValue(new Set(["/beta"]));
    mockLoadRecentlyPlayedGames.mockReset().mockResolvedValue([
      { path: "/beta", playedAt: 20 },
      { path: "/alpha", playedAt: 10 },
    ]);
    mockLoadGameSettingsMap.mockReset().mockResolvedValue({
      "/alpha": { stats: { attempts: 3 } },
    } as never);
    mockToggleFavoriteGame.mockReset();
  });

  test("hydrates persisted data and exposes enabled games alphabetically", async () => {
    const { result, unmount } = await renderHook(() => useHomeData());
    await flushEffects();

    expect(result.current.allEnabledGamePaths).toEqual(["/alpha", "/beta"]);
    expect(result.current.allEnabledGames.map(([path]) => path)).toEqual([
      "/alpha",
      "/beta",
    ]);
    expect(result.current.favorites).toEqual(new Set(["/beta"]));
    expect(result.current.recentPaths).toEqual(["/beta", "/alpha"]);
    expect(result.current.attemptsByPath).toEqual({ "/alpha": 3 });
    await unmount();
  });

  test("updates favorites optimistically and reconciles the saved result", async () => {
    let resolveToggle!: (favorites: Set<string>) => void;
    mockToggleFavoriteGame.mockReturnValue(
      new Promise((resolve) => {
        resolveToggle = resolve;
      }),
    );
    const { result, unmount } = await renderHook(() => useHomeData());
    await flushEffects();

    await act(async () => {
      result.current.toggleFavorite("/alpha");
      await Promise.resolve();
    });
    expect(result.current.favorites).toEqual(new Set(["/beta", "/alpha"]));

    resolveToggle(new Set(["/alpha"]));
    await flushEffects();
    expect(result.current.favorites).toEqual(new Set(["/alpha"]));
    await unmount();
  });

  test("rolls favorites back from storage after a failed mutation", async () => {
    let rejectToggle!: (error: Error) => void;
    mockToggleFavoriteGame.mockReturnValue(
      new Promise((_, reject) => {
        rejectToggle = reject;
      }),
    );
    mockLoadFavoriteGames
      .mockResolvedValueOnce(new Set(["/beta"]))
      .mockResolvedValueOnce(new Set(["/beta"]));
    const { result, unmount } = await renderHook(() => useHomeData());
    await flushEffects();

    await act(async () => {
      result.current.toggleFavorite("/alpha");
      await Promise.resolve();
    });
    expect(result.current.favorites.has("/alpha")).toBe(true);
    rejectToggle(new Error("write failed"));
    await flushEffects();

    expect(result.current.favorites).toEqual(new Set(["/beta"]));
    expect(mockLoadFavoriteGames).toHaveBeenCalledTimes(2);
    await unmount();
  });

  test("reloads persisted Home data when the refresh token changes", async () => {
    const { result, rerender, unmount } = await renderHook(
      ({ token }: { token: number }) => useHomeData(token),
      { initialProps: { token: 0 } },
    );
    await flushEffects();

    mockLoadFavoriteGames.mockResolvedValue(new Set(["/alpha"]));
    await rerender({ token: 1 });
    await flushEffects();

    expect(result.current.favorites).toEqual(new Set(["/alpha"]));
    expect(mockLoadGameSettingsMap).toHaveBeenCalledTimes(2);
    await unmount();
  });
});
