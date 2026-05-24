import { useEffect, useState } from "react";
import {
  GameSettings,
  DEFAULT_GAME_SETTINGS,
  loadGameSettingsMap,
  getGameSettings,
  updateGameSettings,
  normalizeGamePath,
} from "@/data/game-menu";

export function useGameSettings(pathname: string) {
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_GAME_SETTINGS);
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

  const updateSettings = async (updates: Partial<GameSettings>) => {
    // Optimistic UI update
    const nextSettings = { ...settings, ...updates };
    setSettings(nextSettings);

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
