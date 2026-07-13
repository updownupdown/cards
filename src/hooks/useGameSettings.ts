import { useEffect, useState } from "react";
import {
  GameSettings,
  DEFAULT_GAME_SETTINGS,
  loadGameSettingsMap,
  getGameSettings,
  updateGameSettings,
  normalizeGamePath,
} from "@/data/game-menu";

// Keep every `useGameSettings` instance for a given game path in sync, so a
// change made in one place (e.g. the game menu) is reflected immediately in the
// game board, tutorial box, etc. without needing a reload.
type SettingsListener = (settings: GameSettings) => void;
const settingsListeners = new Map<string, Set<SettingsListener>>();

function subscribeToGameSettings(path: string, listener: SettingsListener) {
  let set = settingsListeners.get(path);
  if (!set) {
    set = new Set();
    settingsListeners.set(path, set);
  }
  set.add(listener);
  return () => {
    set?.delete(listener);
  };
}

function emitGameSettings(path: string, settings: GameSettings) {
  settingsListeners.get(path)?.forEach((listener) => listener(settings));
}

export function useGameSettings(pathname: string) {
  const [settings, setSettings] = useState<GameSettings | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  const normalizedPath = normalizeGamePath(pathname);

  useEffect(() => {
    let active = true;
    loadGameSettingsMap().then((map) => {
      if (active) {
        setSettings(getGameSettings(map, normalizedPath));
        setIsLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [normalizedPath]);

  useEffect(() => {
    return subscribeToGameSettings(normalizedPath, setSettings);
  }, [normalizedPath]);

  const updateSettings = async (updates: Partial<GameSettings>) => {
    // Optimistic update, broadcast to every instance for this game path.
    const nextSettings = { ...DEFAULT_GAME_SETTINGS, ...settings, ...updates };
    emitGameSettings(normalizedPath, nextSettings);

    // Background save
    await updateGameSettings(normalizedPath, (current) => ({
      ...current,
      ...updates,
    }));
  };

  return {
    settings,
    updateSettings,
    isLoading,
  };
}
