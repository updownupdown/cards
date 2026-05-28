import AsyncStorage from "@react-native-async-storage/async-storage";
import { GameMenuInfo, GAMES_DATA } from "./games-data";

export type GameStats = {
  attempts: number;
  wins: number;
  losses: number;
};

export type GameSettings = {
  showIntro: boolean;
  showCardHints: boolean;
  isFavorite: boolean;
  difficulty: "easy" | "difficult";
  stats: GameStats;
};

export type ThemeName = "dark" | "light";

export type GameSettingsMap = Record<string, GameSettings>;

export type GlobalSettings = {
  theme: ThemeName;
  showHints: boolean;
};

export type HomeGameEntry = {
  path: string;
  title: string;
};

export const GLOBAL_SETTINGS_STORAGE_KEY = "cards.globalSettings.v1";
export const GAME_SETTINGS_STORAGE_KEY = "cards.gameSettings.v1";

export const DEFAULT_GLOBAL_SETTINGS: GlobalSettings = {
  theme: "dark",
  showHints: true,
};

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  showIntro: true,
  showCardHints: true,
  isFavorite: false,
  difficulty: "easy",
  stats: {
    attempts: 0,
    wins: 0,
    losses: 0,
  },
};

export const EMPTY_STATS: GameStats = {
  attempts: 0,
  wins: 0,
  losses: 0,
};

export const homeGameList: HomeGameEntry[] = Object.entries(GAMES_DATA)
  .filter(([key, game]) => game.enabled !== false)
  .map(([path, gameData]) => {
    return { path, title: gameData.title };
  });

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

// Global Settings

export async function loadGlobalSettings(): Promise<GlobalSettings> {
  const raw = await AsyncStorage.getItem(GLOBAL_SETTINGS_STORAGE_KEY);
  if (!raw) return DEFAULT_GLOBAL_SETTINGS;
  try {
    const parsed = JSON.parse(raw) as Partial<GlobalSettings>;
    return { ...DEFAULT_GLOBAL_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_GLOBAL_SETTINGS;
  }
}

export async function saveGlobalSettings(settings: GlobalSettings) {
  await AsyncStorage.setItem(
    GLOBAL_SETTINGS_STORAGE_KEY,
    JSON.stringify(settings),
  );
}

// Game Settings

export async function loadGameSettingsMap(): Promise<GameSettingsMap> {
  const raw = await AsyncStorage.getItem(GAME_SETTINGS_STORAGE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as GameSettingsMap;
  } catch {}
  return {};
}

export async function saveGameSettingsMap(map: GameSettingsMap) {
  await AsyncStorage.setItem(GAME_SETTINGS_STORAGE_KEY, JSON.stringify(map));
}

export function getGameSettings(
  map: GameSettingsMap,
  pathname: string,
): GameSettings {
  const key = normalizeGamePath(pathname);
  const existing = map[key];
  if (!existing) return DEFAULT_GAME_SETTINGS;

  return {
    ...DEFAULT_GAME_SETTINGS,
    ...existing,
    stats: {
      ...DEFAULT_GAME_SETTINGS.stats,
      ...(existing.stats ?? {}),
    },
  };
}

export async function loadFavoriteGames(): Promise<Set<string>> {
  const map = await loadGameSettingsMap();
  const favorites = new Set<string>();
  Object.keys(map).forEach((key) => {
    if (map[key].isFavorite) {
      favorites.add(key);
    }
  });
  return favorites;
}

export async function toggleFavoriteGame(pathname: string) {
  const key = normalizeGamePath(pathname);
  const map = await loadGameSettingsMap();
  const gameSettings = getGameSettings(map, key);

  gameSettings.isFavorite = !gameSettings.isFavorite;
  map[key] = gameSettings;

  await saveGameSettingsMap(map);
  return loadFavoriteGames();
}

export function calculateWinRate(stats: GameStats) {
  if (stats.attempts === 0) return "0%";
  return `${((stats.wins / stats.attempts) * 100).toFixed()}%`;
}

// Stats functions directly update Game Settings
export async function updateGameSettings(
  pathname: string,
  updater: (settings: GameSettings) => GameSettings,
) {
  const key = normalizeGamePath(pathname);
  const map = await loadGameSettingsMap();
  const current = getGameSettings(map, key);
  map[key] = updater(current);
  await saveGameSettingsMap(map);
}

export async function recordAttempt(pathname: string) {
  await updateGameSettings(pathname, (settings) => ({
    ...settings,
    stats: {
      ...settings.stats,
      attempts: settings.stats.attempts + 1,
    },
  }));
}

export async function recordResult(pathname: string, won: boolean) {
  await updateGameSettings(pathname, (settings) => ({
    ...settings,
    stats: {
      ...settings.stats,
      wins: settings.stats.wins + (won ? 1 : 0),
      losses: settings.stats.losses + (won ? 0 : 1),
    },
  }));
}
