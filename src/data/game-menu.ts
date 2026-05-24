import AsyncStorage from "@react-native-async-storage/async-storage";
import { GameMenuInfo, GAMES_DATA } from "./games-data";

export type GameStats = {
  attempts: number;
  wins: number;
  losses: number;
};

export type GameStatsMap = Record<string, GameStats>;

export type HomeGameEntry = {
  path: string;
  title: string;
};

const STORAGE_KEY = "cards.gameStats.v1";
const FAVORITES_STORAGE_KEY = "cards.favorites.v1";

const DEFAULT_STATS: GameStats = {
  attempts: 0,
  wins: 0,
  losses: 0,
};

export const homeGameList: HomeGameEntry[] = Object.entries(GAMES_DATA).map(
  ([path, gameData]) => {
    return { path, title: gameData.title };
  },
);

export function normalizeGamePath(pathname: string) {
  if (pathname === "/") return pathname;
  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

export function getGameInfo(pathname: string): GameMenuInfo {
  const key = normalizeGamePath(pathname);
  return (
    GAMES_DATA[key] ?? {
      title: "Game",
      howToPlay: [
        "Use the in-game controls to complete that game's objective.",
      ],
    }
  );
}

export function sortHomeGames(
  entries: HomeGameEntry[],
  favorites: Set<string>,
) {
  const normalize = (path: string) => normalizeGamePath(path);
  const alpha = [...entries].sort((a, b) => a.title.localeCompare(b.title));

  const starred = alpha.filter((entry) => favorites.has(normalize(entry.path)));
  const nonStarred = alpha.filter(
    (entry) => !favorites.has(normalize(entry.path)),
  );

  return [...starred, ...nonStarred];
}

export async function loadFavoriteGames(): Promise<Set<string>> {
  const raw = await AsyncStorage.getItem(FAVORITES_STORAGE_KEY);
  if (!raw) return new Set<string>();

  try {
    const parsed = JSON.parse(raw) as string[];
    if (!Array.isArray(parsed)) return new Set<string>();
    return new Set(parsed.map((path) => normalizeGamePath(path)));
  } catch {
    return new Set<string>();
  }
}

async function saveFavoriteGames(favorites: Set<string>) {
  const values = [...favorites].sort((a, b) => a.localeCompare(b));
  await AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(values));
}

export async function toggleFavoriteGame(pathname: string) {
  const key = normalizeGamePath(pathname);
  const favorites = await loadFavoriteGames();

  if (favorites.has(key)) {
    favorites.delete(key);
  } else {
    favorites.add(key);
  }

  await saveFavoriteGames(favorites);
  return favorites;
}

function getDefaultStats(map: GameStatsMap, path: string): GameStats {
  return map[path] ?? DEFAULT_STATS;
}

export function calculateWinRate(stats: GameStats) {
  if (stats.attempts === 0) return "0.0%";
  return `${((stats.wins / stats.attempts) * 100).toFixed(1)}%`;
}

export async function loadStatsMap(): Promise<GameStatsMap> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as GameStatsMap;
    return parsed ?? {};
  } catch {
    return {};
  }
}

async function writeStatsMap(map: GameStatsMap) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

async function updateStats(
  pathname: string,
  updater: (stats: GameStats) => GameStats,
) {
  const key = normalizeGamePath(pathname);
  const map = await loadStatsMap();
  const current = getDefaultStats(map, key);
  const nextMap = {
    ...map,
    [key]: updater(current),
  };
  await writeStatsMap(nextMap);
  return nextMap;
}

export async function recordAttempt(pathname: string) {
  return updateStats(pathname, (stats) => ({
    ...stats,
    attempts: stats.attempts + 1,
  }));
}

export async function recordResult(pathname: string, won: boolean) {
  return updateStats(pathname, (stats) => ({
    ...stats,
    wins: stats.wins + (won ? 1 : 0),
    losses: stats.losses + (won ? 0 : 1),
  }));
}
