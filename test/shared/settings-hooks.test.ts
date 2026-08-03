import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  GAME_SETTINGS_STORAGE_KEY,
  GLOBAL_SETTINGS_STORAGE_KEY,
  loadGameSettingsMap,
} from "@/data/game-menu";
import { useGameSettings } from "@/hooks/useGameSettings";
import { useGlobalSettings } from "@/hooks/useGlobalSettings";
import { act, renderHook } from "@testing-library/react-native";

async function flushEffects() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("settings hooks", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test("hydrates and synchronizes every instance for a normalized game path", async () => {
    await AsyncStorage.setItem(
      GAME_SETTINGS_STORAGE_KEY,
      JSON.stringify({
        "/alpha": { showCardHints: false, drawCount: 3 },
      }),
    );

    const { result, unmount } = await renderHook(() => ({
      first: useGameSettings("/alpha"),
      second: useGameSettings("/alpha/"),
      other: useGameSettings("/beta"),
    }));
    await flushEffects();

    expect(result.current.first.isLoading).toBe(false);
    expect(result.current.first.settings).toMatchObject({
      showCardHints: false,
      drawCount: 3,
    });

    await act(async () => {
      await result.current.first.updateSettings({ isFavorite: true });
    });

    expect(result.current.first.settings?.isFavorite).toBe(true);
    expect(result.current.second.settings?.isFavorite).toBe(true);
    expect(result.current.other.settings?.isFavorite).toBe(false);
    expect((await loadGameSettingsMap())["/alpha"].isFavorite).toBe(true);
    unmount();
  });

  test("merges rapid optimistic updates in live and persisted settings", async () => {
    const { result, unmount } = await renderHook(() =>
      useGameSettings("/alpha"),
    );
    await flushEffects();

    await act(async () => {
      await Promise.all([
        result.current.updateSettings({ showCardHints: false }),
        result.current.updateSettings({ isFavorite: true }),
      ]);
    });

    expect(result.current.settings).toMatchObject({
      showCardHints: false,
      isFavorite: true,
    });
    expect((await loadGameSettingsMap())["/alpha"]).toMatchObject({
      showCardHints: false,
      isFavorite: true,
    });
    unmount();
  });

  test("hydrates, normalizes, and persists global settings", async () => {
    await AsyncStorage.setItem(
      GLOBAL_SETTINGS_STORAGE_KEY,
      JSON.stringify({
        discoverCardSize: "small",
        resumeLastGame: false,
      }),
    );

    const { result, unmount } = await renderHook(() => useGlobalSettings());
    await flushEffects();

    expect(result.current.isLoading).toBe(false);
    expect(result.current.settings).toEqual({
      discoverCardSize: "small",
      dismissHomeInstallPrompt: false,
      resumeLastGame: false,
      showAnimations: true,
    });

    await act(async () => {
      await result.current.updateSettings({ discoverCardSize: "medium" });
    });

    expect(result.current.settings.discoverCardSize).toBe("medium");
    await expect(
      AsyncStorage.getItem(GLOBAL_SETTINGS_STORAGE_KEY),
    ).resolves.toBe(
      JSON.stringify({
        discoverCardSize: "medium",
        dismissHomeInstallPrompt: false,
        resumeLastGame: false,
        showAnimations: true,
      }),
    );
    unmount();
  });
});
