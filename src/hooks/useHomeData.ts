import {
  loadFavoriteGames,
  loadGameSettingsMap,
  loadRecentlyPlayedGames,
  toggleFavoriteGame,
  type GameSettingsMap,
} from "@/data/game-menu";
import { GAMES_DATA } from "@/data/games-registry";
import { GameMenuInfo, isGameEnabled } from "@/data/games-data";
import { useDisplayLanguage } from "@/i18n";
import { localizeGameTitle } from "@/i18n/content";
import { useEffect, useMemo, useState } from "react";

export type HomeGameEntry = [string, GameMenuInfo];

export function useHomeData(refreshToken?: number) {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [recentPaths, setRecentPaths] = useState<string[]>([]);
  const [settingsMap, setSettingsMap] = useState<GameSettingsMap>({});
  const language = useDisplayLanguage();

  // Alphabetical by the title the player sees.
  const allEnabledGames = useMemo<HomeGameEntry[]>(
    () =>
      (Object.entries(GAMES_DATA) as HomeGameEntry[])
        .filter(([, game]) => isGameEnabled(game))
        .map(
          ([path, game]) =>
            [path, game, localizeGameTitle(game, path, language)] as const,
        )
        .sort((a, b) => a[2].localeCompare(b[2], language))
        .map(([path, game]) => [path, game] as HomeGameEntry),
    [language],
  );

  const allEnabledGamePaths = useMemo(
    () => allEnabledGames.map(([path]) => path),
    [allEnabledGames],
  );

  const attemptsByPath = useMemo(() => {
    const attempts: Record<string, number> = {};
    Object.entries(settingsMap).forEach(([path, gameSettings]) => {
      attempts[path] = gameSettings.stats?.attempts ?? 0;
    });
    return attempts;
  }, [settingsMap]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [loadedFavorites, loadedRecent, loadedSettings] =
          await Promise.all([
            loadFavoriteGames(),
            loadRecentlyPlayedGames(),
            loadGameSettingsMap(),
          ]);

        if (cancelled) return;

        setFavorites(loadedFavorites);
        setRecentPaths(loadedRecent.map((entry) => entry.path));
        setSettingsMap(loadedSettings);
      } finally {
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [refreshToken]);

  function toggleFavorite(path: string) {
    setFavorites((previous) => {
      const next = new Set(previous);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });

    void (async () => {
      try {
        const updated = await toggleFavoriteGame(path);
        setFavorites(new Set(updated));
      } catch {
        const latest = await loadFavoriteGames();
        setFavorites(latest);
      }
    })();
  }

  return {
    favorites,
    recentPaths,
    settingsMap,
    attemptsByPath,
    allEnabledGames,
    allEnabledGamePaths,
    toggleFavorite,
  };
}
