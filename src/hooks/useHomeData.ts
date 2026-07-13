import {
  loadFavoriteGames,
  loadGameSettingsMap,
  loadRecentlyPlayedGames,
  toggleFavoriteGame,
  type GameSettingsMap,
} from "@/data/game-menu";
import { GAMES_DATA } from "@/data/games";
import { GameMenuInfo, isGameEnabled } from "@/data/games-data";
import { useEffect, useMemo, useState } from "react";

export type HomeGameEntry = [string, GameMenuInfo];

export function useHomeData(refreshToken?: number) {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [recentPaths, setRecentPaths] = useState<string[]>([]);
  const [settingsMap, setSettingsMap] = useState<GameSettingsMap>({});
  const [hasLoaded, setHasLoaded] = useState(false);

  const allEnabledGames = useMemo<HomeGameEntry[]>(
    () =>
      (Object.entries(GAMES_DATA) as HomeGameEntry[])
        .filter(([, game]) => isGameEnabled(game))
        .sort((a, b) => a[1].title.localeCompare(b[1].title)),
    [],
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
      setHasLoaded(false);

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
        if (!cancelled) {
          setHasLoaded(true);
        }
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
    hasLoaded,
    toggleFavorite,
  };
}
