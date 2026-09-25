import { useEffect, useState, useMemo, useRef } from "react";
import {
  GameSettings,
  getDefaultGameSettings,
  getCachedGameSettingsMap,
  loadGameSettingsMap,
  getGameSettings,
  updateGameSettings,
  normalizeGamePath,
} from "@/data/game-menu";
import { getGameSpecificSettingDefinitions } from "@/data/game-settings";

// Keep every `useGameSettings` instance for a given game path in sync, so a
// change made in one place (e.g. the game menu) is reflected immediately in the
// game board, tips box, etc. without needing a reload.
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

function getInitialSettings(normalizedPath: string) {
  const cachedMap = getCachedGameSettingsMap();
  return cachedMap ? getGameSettings(cachedMap, normalizedPath) : undefined;
}

export function useGameSettings(pathname: string) {
  const normalizedPath = normalizeGamePath(pathname);

  // On native the settings map is usually already in memory: start from it so
  // the first render is final, instead of rendering without settings and then
  // again once an async load resolves.
  const [settings, setSettings] = useState<GameSettings | undefined>(() =>
    getInitialSettings(normalizedPath),
  );
  const settingsRef = useRef<GameSettings | undefined>(settings);
  const [isLoading, setIsLoading] = useState(() => settings === undefined);
  const loadedPathRef = useRef<string | null>(
    settings === undefined ? null : normalizedPath,
  );

  const applySettings = (nextSettings: GameSettings) => {
    settingsRef.current = nextSettings;
    setSettings(nextSettings);
  };

  useEffect(() => {
    // Already initialised from the cache for this path.
    if (loadedPathRef.current === normalizedPath) return;

    let active = true;
    loadGameSettingsMap().then((map) => {
      if (active) {
        loadedPathRef.current = normalizedPath;
        applySettings(getGameSettings(map, normalizedPath));
        setIsLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [normalizedPath]);

  useEffect(() => {
    return subscribeToGameSettings(normalizedPath, applySettings);
  }, [normalizedPath]);

  const updateSettings = async (updates: Partial<GameSettings>) => {
    // Optimistic update, broadcast to every instance for this game path.
    const nextSettings = {
      ...getDefaultGameSettings(normalizedPath),
      ...settingsRef.current,
      ...updates,
    };
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

export function useGameSpecificSettings(pathname: string) {
  return useMemo(() => getGameSpecificSettingDefinitions(pathname), [pathname]);
}
