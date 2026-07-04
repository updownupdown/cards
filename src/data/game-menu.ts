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

export type GameSettingsMap = Record<string, GameSettings>;

export type GlobalSettings = {
  showIntros: boolean;
  discoverCardSize: "small" | "medium" | "large";
};

export type HomeGameEntry = {
  path: string;
  title: string;
};

export type RecentGameEntry = {
  path: string;
  playedAt: number;
};

export const GLOBAL_SETTINGS_STORAGE_KEY = "cards.globalSettings.v1";
export const GAME_SETTINGS_STORAGE_KEY = "cards.gameSettings.v1";
export const RECENT_GAMES_STORAGE_KEY = "cards.recentGames.v1";
export const MAX_RECENT_GAMES = 10;

export const DEFAULT_GLOBAL_SETTINGS: GlobalSettings = {
  showIntros: true,
  discoverCardSize: "large",
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
  return GAMES_DATA[key];
}

// ========== Global Settings ========== //
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

export async function resetAllSettings() {
  await AsyncStorage.setItem(GLOBAL_SETTINGS_STORAGE_KEY, "");
  await AsyncStorage.setItem(RECENT_GAMES_STORAGE_KEY, "");
  await AsyncStorage.setItem(GAME_SETTINGS_STORAGE_KEY, "");
}

// ========== Game Settings ========== //
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

function parseRecentGames(raw: string | null): RecentGameEntry[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as Partial<RecentGameEntry>[];
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(
        (entry): entry is RecentGameEntry =>
          typeof entry?.path === "string" &&
          typeof entry?.playedAt === "number" &&
          Number.isFinite(entry.playedAt) &&
          !!GAMES_DATA[entry.path],
      )
      .sort((a, b) => b.playedAt - a.playedAt);
  } catch {
    return [];
  }
}

export async function loadRecentlyPlayedGames(
  limit = MAX_RECENT_GAMES,
): Promise<RecentGameEntry[]> {
  const raw = await AsyncStorage.getItem(RECENT_GAMES_STORAGE_KEY);
  const list = parseRecentGames(raw);
  return list.slice(0, Math.max(0, limit));
}

async function saveRecentlyPlayedGames(games: RecentGameEntry[]) {
  await AsyncStorage.setItem(RECENT_GAMES_STORAGE_KEY, JSON.stringify(games));
}

export async function recordRecentlyPlayedGame(pathname: string) {
  const path = normalizeGamePath(pathname);
  const now = Date.now();

  const current = await loadRecentlyPlayedGames(MAX_RECENT_GAMES);
  const withoutCurrent = current.filter((entry) => entry.path !== path);
  const next = [{ path, playedAt: now }, ...withoutCurrent].slice(
    0,
    MAX_RECENT_GAMES,
  );

  await saveRecentlyPlayedGames(next);
  return next;
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
  await Promise.all([
    updateGameSettings(pathname, (settings) => ({
      ...settings,
      stats: {
        ...settings.stats,
        attempts: settings.stats.attempts + 1,
      },
    })),
    recordRecentlyPlayedGame(pathname),
  ]);
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
