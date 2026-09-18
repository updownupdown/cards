import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { NODES_PROGRESS_STORAGE_KEY } from "./storage-keys";
import { formatPercent } from "@/i18n/format";
import {
  isLanguagePreference,
  type LanguagePreference,
} from "@/i18n/languages";
import { GameMenuInfo, isGameEnabled } from "./games-data";
import { GAMES_DATA } from "./games-registry";

export type GameStats = {
  attempts: number;
  wins: number;
  losses: number;
  highestScore: number | null;
  /** Fastest winning play time in milliseconds. */
  fastestTimeMs: number | null;
};

export type GameSettings = {
  showCardHints: boolean;
  isFavorite: boolean;
  difficulty: "easy" | "difficult";
  memoryDifficulty:
    "veryeasy" | "easy" | "medium" | "hard" | "veryhard" | "extreme";
  drawCount: 1 | 3;
  islandJokers: boolean;
  lycanMode: "hard" | "medium" | "easy";
  dungeonLevel: 1 | 2 | 3 | 4 | 5;
  boomerAce: boolean;
  powerReserve: boolean;
  specialAbilities: boolean;
  gridlinesHard: boolean;
  pokerJokers: boolean;
  ascentDifficulty: "gentle" | "standard" | "intense";
  ascentChallenge: AscentChallenge;
  chapterAndVerseLoyalPatrons: boolean;
  chapterAndVerseCheckBack: boolean;
  chapterAndVerseSuperExclusive: boolean;
  chapterAndVerseVandals: "off" | "one" | "two";
  fightClubsDifficulty: "easy" | "hard";
  herbalistOpenStables: boolean;
  royalRestHardMode: boolean;
  pyramidDifficulty: "easy" | "hard";
  golfDifficulty: "easy" | "hard";
  gapsDifficulty: "easy" | "hard";
  seerDifficulty: "easy" | "normal" | "hard";
  gremlinDifficulty: "easy" | "hard";
  nightVigilDifficulty: "street" | "kingpin" | "city";
  lastResultSessionId?: string;
  lastResultWon?: boolean;
  stats: GameStats;
};

export type AscentChallenge =
  | "none"
  | "cho-oyu"
  | "shishapangma"
  | "manaslu"
  | "broad-peak"
  | "gasherbrum-ii"
  | "everest"
  | "dhaulagiri"
  | "gasherbrum-i"
  | "kangchenjunga"
  | "lhotse"
  | "makalu"
  | "nanga-parbat"
  | "k2"
  | "annapurna";

export const ASCENT_CHALLENGES: AscentChallenge[] = [
  "none",
  "cho-oyu",
  "shishapangma",
  "manaslu",
  "broad-peak",
  "gasherbrum-ii",
  "everest",
  "dhaulagiri",
  "gasherbrum-i",
  "kangchenjunga",
  "lhotse",
  "makalu",
  "nanga-parbat",
  "k2",
  "annapurna",
];

/**
 * Stored settings per game path. Entries hold only non-default values (see
 * compactGameSettings); read them through getGameSettings, which fills in
 * defaults and validates.
 */
export type GameSettingsMap = Record<string, Partial<GameSettings>>;

export type GlobalSettings = {
  language: LanguagePreference;
  /** Show quotes and Tao Te Ching chapters translated, when a translation exists. */
  translateCollectibles: boolean;
  discoverCardSize: "small" | "medium" | "large";
  dismissHomeInstallPrompt: boolean;
  resumeLastGame: boolean;
  showAnimations: boolean;
  showTipsForNewGames: boolean;
  hapticFeedback: boolean;
  keepScreenAwake: boolean;
};

export type HomeGameEntry = {
  path: string;
  title: string;
};

export type RecentGameEntry = {
  path: string;
  playedAt: number;
};

export type GameLaunchMode = "standard" | "nodes";

export const GLOBAL_SETTINGS_STORAGE_KEY = "cards.globalSettings.v1";
export const GAME_SETTINGS_STORAGE_KEY = "cards.gameSettings.v1";
export const RECENT_GAMES_STORAGE_KEY = "cards.recentGames.v1";
export const GAME_SESSION_STORAGE_KEY = "cards.gameSession.v1";
export const MAX_RECENT_GAMES = 10;
const GAME_SESSION_VERSION = 3;
const MAX_SESSION_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export type SavedGameSession<T = unknown> = {
  version: number;
  sessionId: string;
  path: string;
  launchMode?: GameLaunchMode;
  savedAt: number;
  state: T;
};

export const DEFAULT_GLOBAL_SETTINGS: GlobalSettings = {
  language: "system",
  translateCollectibles: true,
  discoverCardSize: "large",
  dismissHomeInstallPrompt: false,
  resumeLastGame: true,
  showAnimations: true,
  showTipsForNewGames: true,
  hapticFeedback: false,
  keepScreenAwake: false,
};

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  showCardHints: true,
  isFavorite: false,
  difficulty: "easy",
  memoryDifficulty: "easy",
  drawCount: 1,
  islandJokers: false,
  lycanMode: "medium",
  dungeonLevel: 1,
  boomerAce: false,
  powerReserve: false,
  specialAbilities: false,
  gridlinesHard: false,
  pokerJokers: false,
  ascentDifficulty: "standard",
  ascentChallenge: "none",
  chapterAndVerseLoyalPatrons: false,
  chapterAndVerseCheckBack: false,
  chapterAndVerseSuperExclusive: false,
  chapterAndVerseVandals: "off",
  fightClubsDifficulty: "easy",
  herbalistOpenStables: false,
  royalRestHardMode: false,
  pyramidDifficulty: "hard",
  golfDifficulty: "easy",
  gapsDifficulty: "easy",
  seerDifficulty: "normal",
  gremlinDifficulty: "easy",
  nightVigilDifficulty: "kingpin",
  stats: {
    attempts: 0,
    wins: 0,
    losses: 0,
    highestScore: null,
    fastestTimeMs: null,
  },
};

export const EMPTY_STATS: GameStats = {
  attempts: 0,
  wins: 0,
  losses: 0,
  highestScore: null,
  fastestTimeMs: null,
};

let gameSettingsWriteQueue: Promise<void> = Promise.resolve();

async function runWithGameSettingsMapWriteLock<T>(
  mutate: (map: GameSettingsMap) => T | Promise<T>,
): Promise<T> {
  const queuedMutation = gameSettingsWriteQueue.then(async () => {
    // A copy: on native the loaded map is the shared cache, which must not
    // change if the mutation throws before it's saved.
    const map = structuredClone(await loadGameSettingsMap());
    const result = await mutate(map);
    await saveGameSettingsMap(map);
    return result;
  });

  // Keep the queue alive even if one mutation fails.
  gameSettingsWriteQueue = queuedMutation.then(
    () => undefined,
    () => undefined,
  );

  return queuedMutation;
}

export const homeGameList: HomeGameEntry[] = Object.entries(GAMES_DATA)
  .filter(([_, game]) => isGameEnabled(game))
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

export function isGamePath(pathname: string) {
  const key = normalizeGamePath(pathname);
  if (key === "/") return false;
  return !!GAMES_DATA[key] && isGameEnabled(GAMES_DATA[key]);
}

// ========== Settings Cache ========== //
// On native, settings are read from storage once and then served from memory.
// Every screen re-reading them (an AsyncStorage round trip and JSON parse,
// then an extra render once it resolves) noticeably slowed opening a game.
// Web keeps reading storage: another tab may have written to it, and a stale
// cache there could overwrite that tab's stats.
const CACHE_SETTINGS = Platform.OS !== "web";

let globalSettingsCache: GlobalSettings | null = null;
let globalSettingsLoad: Promise<GlobalSettings> | null = null;
const globalSettingsListeners = new Set<(settings: GlobalSettings) => void>();

let gameSettingsMapCache: GameSettingsMap | null = null;
let gameSettingsMapLoad: Promise<GameSettingsMap> | null = null;

/** Loaded global settings, or null if they haven't been read yet (or on web). */
export function getCachedGlobalSettings() {
  return globalSettingsCache;
}

/** Notified whenever global settings are saved, so every screen stays in sync. */
export function subscribeToGlobalSettings(
  listener: (settings: GlobalSettings) => void,
) {
  globalSettingsListeners.add(listener);
  return () => {
    globalSettingsListeners.delete(listener);
  };
}

/** The loaded game settings map, or null if it hasn't been read yet (or on web). */
export function getCachedGameSettingsMap() {
  return gameSettingsMapCache;
}

// ========== Global Settings ========== //
export async function loadGlobalSettings(): Promise<GlobalSettings> {
  if (globalSettingsCache) return globalSettingsCache;
  if (!CACHE_SETTINGS) return readGlobalSettings();

  globalSettingsLoad ??= readGlobalSettings()
    .then((settings) => {
      // A save that landed while this read was in flight wins.
      globalSettingsCache ??= settings;
      return globalSettingsCache;
    })
    .finally(() => {
      globalSettingsLoad = null;
    });

  return globalSettingsLoad;
}

async function readGlobalSettings(): Promise<GlobalSettings> {
  const raw = await AsyncStorage.getItem(GLOBAL_SETTINGS_STORAGE_KEY);
  if (!raw) return DEFAULT_GLOBAL_SETTINGS;
  try {
    const parsed = JSON.parse(raw) as Partial<GlobalSettings>;
    const merged = { ...DEFAULT_GLOBAL_SETTINGS, ...parsed };

    return {
      ...merged,
      language: isLanguagePreference(merged.language)
        ? merged.language
        : DEFAULT_GLOBAL_SETTINGS.language,
      translateCollectibles: merged.translateCollectibles !== false,
      discoverCardSize:
        merged.discoverCardSize === "small" ||
        merged.discoverCardSize === "medium" ||
        merged.discoverCardSize === "large"
          ? merged.discoverCardSize
          : DEFAULT_GLOBAL_SETTINGS.discoverCardSize,
      dismissHomeInstallPrompt: merged.dismissHomeInstallPrompt === true,
      resumeLastGame: merged.resumeLastGame !== false,
      showAnimations: merged.showAnimations !== false,
      showTipsForNewGames: merged.showTipsForNewGames !== false,
      hapticFeedback: merged.hapticFeedback === true,
      keepScreenAwake: merged.keepScreenAwake === true,
    };
  } catch {
    return DEFAULT_GLOBAL_SETTINGS;
  }
}

export async function saveGlobalSettings(settings: GlobalSettings) {
  if (CACHE_SETTINGS) globalSettingsCache = settings;
  globalSettingsListeners.forEach((listener) => listener(settings));

  await AsyncStorage.setItem(
    GLOBAL_SETTINGS_STORAGE_KEY,
    JSON.stringify(settings),
  );
}

export async function resetAllSettings() {
  globalSettingsCache = null;
  gameSettingsMapCache = null;

  await Promise.all([
    AsyncStorage.setItem(GLOBAL_SETTINGS_STORAGE_KEY, ""),
    AsyncStorage.setItem(RECENT_GAMES_STORAGE_KEY, ""),
    clearLastGameSession(),
    AsyncStorage.removeItem(NODES_PROGRESS_STORAGE_KEY),
  ]);

  await runWithGameSettingsMapWriteLock((map) => {
    Object.keys(map).forEach((key) => {
      delete map[key];
    });
  });
}

export async function populateTestGameProgress() {
  await runWithGameSettingsMapWriteLock((map) => {
    homeGameList.forEach(({ path }, index) => {
      const current = getGameSettings(map, path);
      const wins = (index % 7) + 1;
      const losses = (index * 3) % 6;

      map[path] = compactGameSettings({
        ...current,
        stats: {
          attempts: wins + losses + (index % 3),
          wins,
          losses,
          highestScore: index % 4 === 0 ? (index + 1) * 100 : null,
          fastestTimeMs: index % 3 === 0 ? (95 + index * 7) * 1000 : null,
        },
      });
    });
  });
}

export async function loadLastGameSession<T = unknown>() {
  const raw = await AsyncStorage.getItem(GAME_SESSION_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<SavedGameSession<T>>;

    if (parsed.version !== GAME_SESSION_VERSION) return null;
    if (typeof parsed.sessionId !== "string" || !parsed.sessionId) return null;
    if (typeof parsed.path !== "string" || !isGamePath(parsed.path)) {
      return null;
    }

    if (
      typeof parsed.savedAt !== "number" ||
      !Number.isFinite(parsed.savedAt) ||
      parsed.savedAt <= 0
    ) {
      return null;
    }

    if (Date.now() - parsed.savedAt > MAX_SESSION_AGE_MS) {
      return null;
    }

    if (!("state" in parsed)) {
      return null;
    }

    return {
      version: GAME_SESSION_VERSION,
      sessionId: parsed.sessionId,
      path: normalizeGamePath(parsed.path),
      launchMode: parsed.launchMode === "nodes" ? "nodes" : "standard",
      savedAt: parsed.savedAt,
      state: parsed.state as T,
    };
  } catch {
    return null;
  }
}

export async function saveLastGameSession<T = unknown>(
  pathname: string,
  state: T,
  sessionId: string,
  launchMode: GameLaunchMode = "standard",
) {
  const path = normalizeGamePath(pathname);
  if (!isGamePath(path) || !sessionId) return;

  const payload: SavedGameSession<T> = {
    version: GAME_SESSION_VERSION,
    sessionId,
    path,
    launchMode,
    savedAt: Date.now(),
    state,
  };

  await AsyncStorage.setItem(GAME_SESSION_STORAGE_KEY, JSON.stringify(payload));
}

export async function clearLastGameSession() {
  await AsyncStorage.removeItem(GAME_SESSION_STORAGE_KEY);
}

// ========== Game Launch Guard ========== //
// Set while a game screen is opening and cleared once it has run for a few
// seconds (or is left normally). If it's still set on the next launch, the app
// died while opening a game, so auto-resuming that game could crash-loop.

const GAME_LAUNCH_GUARD_STORAGE_KEY = "cards.gameLaunchGuard.v1";
export const GAME_LAUNCH_STABLE_MS = 5000;

export async function markGameLaunchPending(path: string) {
  await AsyncStorage.setItem(
    GAME_LAUNCH_GUARD_STORAGE_KEY,
    JSON.stringify({ path, at: Date.now() }),
  );
}

export async function clearGameLaunchPending() {
  await AsyncStorage.removeItem(GAME_LAUNCH_GUARD_STORAGE_KEY);
}

/** Returns true (and clears the flag) if the last game launch never settled. */
export async function consumeInterruptedGameLaunch() {
  const raw = await AsyncStorage.getItem(GAME_LAUNCH_GUARD_STORAGE_KEY);
  if (!raw) return false;
  await clearGameLaunchPending();
  return true;
}

// ========== Game Settings ========== //
/**
 * On native this returns the shared cached map, so treat it as read-only;
 * change settings through the write-locked helpers.
 */
export async function loadGameSettingsMap(): Promise<GameSettingsMap> {
  if (gameSettingsMapCache) return gameSettingsMapCache;
  if (!CACHE_SETTINGS) return readGameSettingsMap();

  gameSettingsMapLoad ??= readGameSettingsMap()
    .then((map) => {
      // A save that landed while this read was in flight wins.
      gameSettingsMapCache ??= map;
      return gameSettingsMapCache;
    })
    .finally(() => {
      gameSettingsMapLoad = null;
    });

  return gameSettingsMapLoad;
}

async function readGameSettingsMap(): Promise<GameSettingsMap> {
  const raw = await AsyncStorage.getItem(GAME_SETTINGS_STORAGE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as GameSettingsMap;
  } catch {}
  return {};
}

export async function saveGameSettingsMap(map: GameSettingsMap) {
  if (CACHE_SETTINGS) gameSettingsMapCache = map;
  await AsyncStorage.setItem(GAME_SETTINGS_STORAGE_KEY, JSON.stringify(map));
}

export function getGameSettings(
  map: GameSettingsMap,
  pathname: string,
): GameSettings {
  const key = normalizeGamePath(pathname);
  const existing = map[key];
  if (!existing) return DEFAULT_GAME_SETTINGS;

  const merged = {
    ...DEFAULT_GAME_SETTINGS,
    ...existing,
  };

  return {
    ...merged,
    showCardHints: merged.showCardHints !== false,
    isFavorite: merged.isFavorite === true,
    memoryDifficulty: MEMORY_DIFFICULTIES.includes(merged.memoryDifficulty)
      ? merged.memoryDifficulty
      : DEFAULT_GAME_SETTINGS.memoryDifficulty,
    difficulty: merged.difficulty === "difficult" ? "difficult" : "easy",
    drawCount: merged.drawCount === 3 ? 3 : 1,
    islandJokers: merged.islandJokers === true,
    lycanMode:
      merged.lycanMode === "hard" || merged.lycanMode === "easy"
        ? merged.lycanMode
        : "medium",
    dungeonLevel:
      merged.dungeonLevel >= 1 && merged.dungeonLevel <= 5
        ? merged.dungeonLevel
        : 1,
    boomerAce: merged.boomerAce === true,
    powerReserve: merged.powerReserve === true,
    specialAbilities: merged.specialAbilities === true,
    gridlinesHard: merged.gridlinesHard === true,
    pokerJokers: merged.pokerJokers === true,
    ascentDifficulty:
      merged.ascentDifficulty === "gentle" ||
      merged.ascentDifficulty === "intense"
        ? merged.ascentDifficulty
        : "standard",
    ascentChallenge: ASCENT_CHALLENGES.includes(merged.ascentChallenge)
      ? merged.ascentChallenge
      : "none",
    chapterAndVerseLoyalPatrons: merged.chapterAndVerseLoyalPatrons === true,
    chapterAndVerseCheckBack: merged.chapterAndVerseCheckBack === true,
    chapterAndVerseSuperExclusive:
      merged.chapterAndVerseSuperExclusive === true,
    chapterAndVerseVandals:
      merged.chapterAndVerseVandals === "one" ||
      merged.chapterAndVerseVandals === "two"
        ? merged.chapterAndVerseVandals
        : "off",
    fightClubsDifficulty:
      merged.fightClubsDifficulty === "hard" ? "hard" : "easy",
    herbalistOpenStables: merged.herbalistOpenStables === true,
    royalRestHardMode: merged.royalRestHardMode === true,
    pyramidDifficulty: merged.pyramidDifficulty === "easy" ? "easy" : "hard",
    golfDifficulty: merged.golfDifficulty === "hard" ? "hard" : "easy",
    gapsDifficulty: merged.gapsDifficulty === "hard" ? "hard" : "easy",
    seerDifficulty:
      merged.seerDifficulty === "easy" || merged.seerDifficulty === "hard"
        ? merged.seerDifficulty
        : "normal",
    gremlinDifficulty: merged.gremlinDifficulty === "hard" ? "hard" : "easy",
    nightVigilDifficulty:
      merged.nightVigilDifficulty === "street" ||
      merged.nightVigilDifficulty === "city"
        ? merged.nightVigilDifficulty
        : "kingpin",
    stats: normalizeStats(existing.stats),
  };
}

const MEMORY_DIFFICULTIES: GameSettings["memoryDifficulty"][] = [
  "veryeasy",
  "easy",
  "medium",
  "hard",
  "veryhard",
  "extreme",
];

function toCount(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : 0;
}

function normalizeStats(stats: Partial<GameStats> | undefined): GameStats {
  const highestScore = stats?.highestScore;
  const fastestTimeMs = stats?.fastestTimeMs;

  return {
    attempts: toCount(stats?.attempts),
    wins: toCount(stats?.wins),
    losses: toCount(stats?.losses),
    highestScore:
      typeof highestScore === "number" && Number.isFinite(highestScore)
        ? highestScore
        : null,
    fastestTimeMs:
      typeof fastestTimeMs === "number" &&
      Number.isFinite(fastestTimeMs) &&
      fastestTimeMs > 0
        ? fastestTimeMs
        : null,
  };
}

/**
 * The entry to store for a game: only values that differ from the defaults.
 * Every game used to store its full settings object (~35 fields), including
 * settings that belong to other games. Reads merge defaults back in through
 * getGameSettings, so a compact entry loads identically.
 */
export function compactGameSettings(
  settings: GameSettings,
): Partial<GameSettings> {
  const compact: Partial<GameSettings> = {};

  (Object.keys(settings) as (keyof GameSettings)[]).forEach((key) => {
    const value = settings[key];
    if (value === undefined) return;

    if (key === "stats") {
      const stats = value as GameStats;
      const isDefault = (Object.keys(EMPTY_STATS) as (keyof GameStats)[]).every(
        (statKey) => stats[statKey] === EMPTY_STATS[statKey],
      );
      if (!isDefault) compact.stats = stats;
      return;
    }

    if (value !== DEFAULT_GAME_SETTINGS[key]) {
      (compact as Record<string, unknown>)[key] = value;
    }
  });

  return compact;
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
  return runWithGameSettingsMapWriteLock((map) => {
    const gameSettings = getGameSettings(map, key);

    gameSettings.isFavorite = !gameSettings.isFavorite;
    map[key] = compactGameSettings(gameSettings);

    const favorites = new Set<string>();
    Object.keys(map).forEach((path) => {
      if (map[path].isFavorite) {
        favorites.add(path);
      }
    });

    return favorites;
  });
}

/** A play time as m:ss, or h:mm:ss from an hour. */
export function formatPlayTime(ms: number) {
  if (!Number.isFinite(ms)) return "-";
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${seconds}`
    : `${minutes}:${seconds}`;
}

export function calculateWinRate(stats: GameStats) {
  if (stats.wins === 0 && stats.losses === 0) return "-";
  return formatPercent(stats.wins / (stats.wins + stats.losses));
}

// Stats functions directly update Game Settings
export async function updateGameSettings(
  pathname: string,
  updater: (settings: GameSettings) => GameSettings,
) {
  const key = normalizeGamePath(pathname);
  await runWithGameSettingsMapWriteLock((map) => {
    const current = getGameSettings(map, key);
    map[key] = compactGameSettings(updater(current));
  });
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

function parseNumericScore(score: number | string | undefined) {
  if (typeof score === "number") {
    return Number.isFinite(score) ? score : null;
  }

  if (typeof score !== "string") {
    return null;
  }

  const trimmed = score.trim();
  if (!/^[-+]?\d+(\.\d+)?$/.test(trimmed)) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function recordResult(
  pathname: string,
  won: boolean,
  score?: number | string,
  sessionId?: string,
  /** Play time of a win; null when the session wasn't timed. */
  timeMs?: number | null,
) {
  const numericScore = parseNumericScore(score);
  const winTimeMs =
    won && typeof timeMs === "number" && timeMs > 0 ? Math.round(timeMs) : null;

  await updateGameSettings(pathname, (settings) => {
    if (sessionId && settings.lastResultSessionId === sessionId) {
      return settings;
    }

    return {
      ...settings,
      lastResultSessionId: sessionId ?? settings.lastResultSessionId,
      lastResultWon: sessionId ? won : settings.lastResultWon,
      stats: {
        ...settings.stats,
        wins: settings.stats.wins + (won ? 1 : 0),
        losses: settings.stats.losses + (won ? 0 : 1),
        highestScore:
          numericScore === null
            ? settings.stats.highestScore
            : settings.stats.highestScore === null
              ? numericScore
              : Math.max(settings.stats.highestScore, numericScore),
        fastestTimeMs:
          winTimeMs === null
            ? settings.stats.fastestTimeMs
            : settings.stats.fastestTimeMs === null
              ? winTimeMs
              : Math.min(settings.stats.fastestTimeMs, winTimeMs),
      },
    };
  });
}

export async function undoRecordedLoss(pathname: string, sessionId: string) {
  await updateGameSettings(pathname, (settings) => {
    if (
      settings.lastResultSessionId !== sessionId ||
      settings.lastResultWon !== false ||
      settings.stats.losses === 0
    ) {
      return settings;
    }

    return {
      ...settings,
      lastResultSessionId: undefined,
      lastResultWon: undefined,
      stats: {
        ...settings.stats,
        losses: settings.stats.losses - 1,
      },
    };
  });
}

/*
## Add a Game-Specific Setting (3 steps)

1. Add the setting key and default value to `GameSettings` and `DEFAULT_GAME_SETTINGS` in `src/data/game-menu.ts`.
2. Register the setting UI in `src/data/game-settings.ts` under the game route using `getGameSpecificSettingDefinitions` data.
3. Read the setting in the game component with `useGameSettingValue("yourSettingKey")` and apply it in setup/reset or runtime logic.

Notes:

- The game modal auto-renders configured settings from `src/data/game-settings.ts`.
- Use `applyBehavior` to indicate whether a setting applies immediately or on next game.
*/
