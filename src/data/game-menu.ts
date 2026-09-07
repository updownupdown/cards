import AsyncStorage from "@react-native-async-storage/async-storage";
import { NODES_PROGRESS_STORAGE_KEY } from "./storage-keys";
import { GameMenuInfo, isGameEnabled } from "./games-data";
import { GAMES_DATA } from "./games-registry";

export type GameStats = {
  attempts: number;
  wins: number;
  losses: number;
  highestScore: number | null;
};

export type GameSettings = {
  showCardHints: boolean;
  isFavorite: boolean;
  difficulty: "easy" | "difficult";
  memoryDifficulty:
    | "veryeasy"
    | "easy"
    | "medium"
    | "hard"
    | "veryhard"
    | "extreme";
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
  dungeonDifficulty: "beginner" | "intermediate" | "advanced" | "bloodlust";
  merchantLoyalPatrons: boolean;
  merchantCheckBack: boolean;
  merchantSuperExclusive: boolean;
  merchantVandals: 0 | 1 | 2;
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
  sultanAutoRefillReserves: boolean;
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

export type GameSettingsMap = Record<string, GameSettings>;

export type GlobalSettings = {
  discoverCardSize: "small" | "medium" | "large";
  dismissHomeInstallPrompt: boolean;
  resumeLastGame: boolean;
  showAnimations: boolean;
  showTipsForNewGames: boolean;
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
  discoverCardSize: "large",
  dismissHomeInstallPrompt: false,
  resumeLastGame: true,
  showAnimations: true,
  showTipsForNewGames: true,
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
  dungeonDifficulty: "beginner",
  merchantLoyalPatrons: false,
  merchantCheckBack: false,
  merchantSuperExclusive: false,
  merchantVandals: 0,
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
  sultanAutoRefillReserves: false,
  stats: {
    attempts: 0,
    wins: 0,
    losses: 0,
    highestScore: null,
  },
};

export const EMPTY_STATS: GameStats = {
  attempts: 0,
  wins: 0,
  losses: 0,
  highestScore: null,
};

let gameSettingsWriteQueue: Promise<void> = Promise.resolve();

async function runWithGameSettingsMapWriteLock<T>(
  mutate: (map: GameSettingsMap) => T | Promise<T>,
): Promise<T> {
  const queuedMutation = gameSettingsWriteQueue.then(async () => {
    const map = await loadGameSettingsMap();
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

// ========== Global Settings ========== //
export async function loadGlobalSettings(): Promise<GlobalSettings> {
  const raw = await AsyncStorage.getItem(GLOBAL_SETTINGS_STORAGE_KEY);
  if (!raw) return DEFAULT_GLOBAL_SETTINGS;
  try {
    const parsed = JSON.parse(raw) as Partial<GlobalSettings>;
    const merged = { ...DEFAULT_GLOBAL_SETTINGS, ...parsed };

    return {
      ...merged,
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
    };
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

      map[path] = {
        ...current,
        stats: {
          attempts: wins + losses + (index % 3),
          wins,
          losses,
          highestScore: index % 4 === 0 ? (index + 1) * 100 : null,
        },
      };
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

  const merged = {
    ...DEFAULT_GAME_SETTINGS,
    ...existing,
  };

  return {
    ...merged,
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
    dungeonDifficulty:
      merged.dungeonDifficulty === "intermediate" ||
      merged.dungeonDifficulty === "advanced" ||
      merged.dungeonDifficulty === "bloodlust"
        ? merged.dungeonDifficulty
        : "beginner",
    merchantLoyalPatrons: merged.merchantLoyalPatrons === true,
    merchantCheckBack: merged.merchantCheckBack === true,
    merchantSuperExclusive: merged.merchantSuperExclusive === true,
    merchantVandals:
      merged.merchantVandals === 1 || merged.merchantVandals === 2
        ? merged.merchantVandals
        : 0,
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
  return runWithGameSettingsMapWriteLock((map) => {
    const gameSettings = getGameSettings(map, key);

    gameSettings.isFavorite = !gameSettings.isFavorite;
    map[key] = gameSettings;

    const favorites = new Set<string>();
    Object.keys(map).forEach((path) => {
      if (map[path].isFavorite) {
        favorites.add(path);
      }
    });

    return favorites;
  });
}

export function calculateWinRate(stats: GameStats) {
  if (stats.wins === 0 && stats.losses === 0) return "-";
  return `${((stats.wins / (stats.wins + stats.losses)) * 100).toFixed()}%`;
}

// Stats functions directly update Game Settings
export async function updateGameSettings(
  pathname: string,
  updater: (settings: GameSettings) => GameSettings,
) {
  const key = normalizeGamePath(pathname);
  await runWithGameSettingsMapWriteLock((map) => {
    const current = getGameSettings(map, key);
    map[key] = updater(current);
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
) {
  const numericScore = parseNumericScore(score);

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
