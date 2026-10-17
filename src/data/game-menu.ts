import {
  GLOBAL_SETTINGS_STORAGE_KEY,
  CAMPAIGN_PROGRESS_STORAGE_KEY,
} from "./storage-keys";
import { DEFAULT_COLOR_THEME } from "@/styles/themes";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { formatPercent } from "@/i18n/format";
import {
  isLanguagePreference,
  type LanguagePreference,
} from "@/i18n/languages";
import { GameMenuInfo, isGameEnabled } from "./games-data";
import { GAMES_DATA } from "./games-registry";
import {
  currentGamePath,
  GAME_VARIANTS,
  isVariantGamePath,
  MOVED_GAME_PATHS,
  pickVariant,
} from "./game-variants";

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
  elevensDifficulty: "easy" | "medium" | "hard";
  elevensEliminateBadDeals: boolean;
  jailbreakDifficulty: "easy" | "normal" | "hard";
  littleWindmillDifficulty: "easy" | "normal";
  gremlinDifficulty: "easy" | "hard";
  nightVigilDifficulty: "street" | "kingpin" | "city";
  pagodaDifficulty: "easy" | "normal" | "hard";
  ebbAndFlowDifficulty: "easy" | "normal" | "hard";
  machinationDifficulty: "easy" | "medium" | "hard";
  /** Which classic variant to deal, for games listed in GAME_VARIANTS. */
  variant: string;
  spiderSuits: 1 | 2 | 4;
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

export const AUTO_COMPLETE_MODES = ["ask", "always", "never"] as const;
export type AutoCompleteMode = (typeof AUTO_COMPLETE_MODES)[number];

export type GlobalSettings = {
  language: LanguagePreference;
  /** Show quotes and Tao Te Ching chapters translated, when a translation exists. */
  translateCollectibles: boolean;
  /** Game titles stay in English, whatever the language. */
  useEnglishGameTitles: boolean;
  discoverCardSize: "small" | "medium" | "large";
  dismissHomeInstallPrompt: boolean;
  /** The intro panel on the Campaign tab was closed. */
  dismissCampaignIntro: boolean;
  /** The intro panel on the Collect tab was closed. */
  dismissCollectIntro: boolean;
  resumeLastGame: boolean;
  showAnimations: boolean;
  showTipsForNewGames: boolean;
  hapticFeedback: boolean;
  keepScreenAwake: boolean;
  /** When a game that can finish itself on the foundations does so: from a
   *  button in a panel under the header, right away, or never. */
  autoComplete: AutoCompleteMode;
  /** Send anonymous crash diagnostics to Sentry. */
  crashReports: boolean;
  /** The colour theme's id, from COLOR_THEMES. */
  colorTheme: string;
};

export type HomeGameEntry = {
  path: string;
  title: string;
};

export type RecentGameEntry = {
  path: string;
  playedAt: number;
};

export type GameLaunchMode = "standard" | "campaign";

/**
 * Whether a game's `mode` param launches it in Campaign mode. "nodes" is the
 * mode's old name, still in saved links.
 */
export function isCampaignModeParam(mode: string | undefined) {
  return mode === "campaign" || mode === "nodes";
}

export { GLOBAL_SETTINGS_STORAGE_KEY };
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
  /** Play time so far; missing when the session wasn't timed. */
  playTimeMs?: number | null;
  /** The classic variant it was dealt as, for games in GAME_VARIANTS. */
  variant?: string;
  /** The game's `sessionVersion` when saved; missing means 1. */
  gameVersion?: number;
  state: T;
};

/** The version of a game's saved deals (see GameMenuInfo.sessionVersion). */
function getGameSessionVersion(path: string) {
  return getGameInfo(path)?.sessionVersion ?? 1;
}

export const DEFAULT_GLOBAL_SETTINGS: GlobalSettings = {
  language: "system",
  translateCollectibles: true,
  useEnglishGameTitles: false,
  discoverCardSize: "large",
  dismissHomeInstallPrompt: false,
  dismissCampaignIntro: false,
  dismissCollectIntro: false,
  resumeLastGame: true,
  showAnimations: true,
  showTipsForNewGames: true,
  hapticFeedback: false,
  keepScreenAwake: false,
  autoComplete: "ask",
  crashReports: true,
  colorTheme: DEFAULT_COLOR_THEME,
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
  elevensDifficulty: "hard",
  elevensEliminateBadDeals: true,
  jailbreakDifficulty: "normal",
  littleWindmillDifficulty: "normal",
  gremlinDifficulty: "easy",
  nightVigilDifficulty: "kingpin",
  pagodaDifficulty: "normal",
  ebbAndFlowDifficulty: "normal",
  machinationDifficulty: "medium",
  variant: "",
  spiderSuits: 4,
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
      useEnglishGameTitles: merged.useEnglishGameTitles === true,
      discoverCardSize:
        merged.discoverCardSize === "small" ||
        merged.discoverCardSize === "medium" ||
        merged.discoverCardSize === "large"
          ? merged.discoverCardSize
          : DEFAULT_GLOBAL_SETTINGS.discoverCardSize,
      dismissHomeInstallPrompt: merged.dismissHomeInstallPrompt === true,
      dismissCampaignIntro: merged.dismissCampaignIntro === true,
      dismissCollectIntro: merged.dismissCollectIntro === true,
      resumeLastGame: merged.resumeLastGame !== false,
      showAnimations: merged.showAnimations !== false,
      showTipsForNewGames: merged.showTipsForNewGames !== false,
      hapticFeedback: merged.hapticFeedback === true,
      keepScreenAwake: merged.keepScreenAwake === true,
      autoComplete: AUTO_COMPLETE_MODES.includes(merged.autoComplete)
        ? merged.autoComplete
        : DEFAULT_GLOBAL_SETTINGS.autoComplete,
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
    AsyncStorage.removeItem(CAMPAIGN_PROGRESS_STORAGE_KEY),
  ]);

  await runWithGameSettingsMapWriteLock((map) => {
    Object.keys(map).forEach((key) => {
      delete map[key];
    });
  });
}

/**
 * Fills in play stats for testing. Only `wonPaths` get wins; of the rest,
 * some have been tried and lost and some never played.
 */
export async function populateTestGameProgress(wonPaths: ReadonlySet<string>) {
  await runWithGameSettingsMapWriteLock((map) => {
    homeGameList.forEach(({ path }, index) => {
      const current = getGameSettings(map, path);
      const won = wonPaths.has(path);
      const wins = won ? (index % 7) + 1 : 0;
      const losses = won || index % 2 === 0 ? (index * 3) % 6 : 0;

      map[path] = compactGameSettings(
        {
          ...current,
          stats: {
            attempts: wins + losses,
            wins,
            losses,
            highestScore: won && index % 4 === 0 ? (index + 1) * 100 : null,
            fastestTimeMs:
              won && index % 3 === 0 ? (95 + index * 7) * 1000 : null,
          },
        },
        path,
      );
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

    // Saved before a change to the game that the deal can't survive.
    if (
      (parsed.gameVersion ?? 1) !==
      getGameSessionVersion(normalizeGamePath(parsed.path))
    ) {
      return null;
    }

    return {
      version: GAME_SESSION_VERSION,
      sessionId: parsed.sessionId,
      path: normalizeGamePath(parsed.path),
      launchMode: isCampaignModeParam(parsed.launchMode)
        ? "campaign"
        : "standard",
      savedAt: parsed.savedAt,
      playTimeMs:
        typeof parsed.playTimeMs === "number" &&
        Number.isFinite(parsed.playTimeMs) &&
        parsed.playTimeMs >= 0
          ? parsed.playTimeMs
          : null,
      variant: typeof parsed.variant === "string" ? parsed.variant : undefined,
      gameVersion: getGameSessionVersion(normalizeGamePath(parsed.path)),
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
  playTimeMs: number | null = null,
  variant?: string,
) {
  const path = normalizeGamePath(pathname);
  if (!isGamePath(path) || !sessionId) return;

  const payload: SavedGameSession<T> = {
    version: GAME_SESSION_VERSION,
    sessionId,
    path,
    launchMode,
    savedAt: Date.now(),
    playTimeMs,
    ...(variant ? { variant } : {}),
    gameVersion: getGameSessionVersion(path),
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

/**
 * Returns the game path (and clears the flag) if the last game launch never
 * settled, or null if it did. The path names the game in a crash report.
 */
export async function consumeInterruptedGameLaunch() {
  const raw = await AsyncStorage.getItem(GAME_LAUNCH_GUARD_STORAGE_KEY);
  if (!raw) return null;
  await clearGameLaunchPending();

  try {
    const { path } = JSON.parse(raw) as { path?: string };
    return path ?? "unknown";
  } catch {
    return "unknown";
  }
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
    return moveGameSettings(JSON.parse(raw) as GameSettingsMap);
  } catch {}
  return {};
}

function mergeStats(
  target: Partial<GameStats> | undefined,
  source: Partial<GameStats> | undefined,
): GameStats {
  const a = normalizeStats(target);
  const b = normalizeStats(source);
  const pick = (
    x: number | null,
    y: number | null,
    best: (...values: number[]) => number,
  ) => (x === null ? y : y === null ? x : best(x, y));

  return {
    attempts: a.attempts + b.attempts,
    wins: a.wins + b.wins,
    losses: a.losses + b.losses,
    highestScore: pick(a.highestScore, b.highestScore, Math.max),
    fastestTimeMs: pick(a.fastestTimeMs, b.fastestTimeMs, Math.min),
  };
}

/**
 * Moves the saved settings of games that were folded into another game or
 * renamed (see MOVED_GAME_PATHS): stats add up, and a favourite stays one. The
 * new game's own settings win. Exported for tests.
 */
export function moveGameSettings(map: GameSettingsMap): GameSettingsMap {
  if (!Object.keys(map).some((path) => MOVED_GAME_PATHS[path])) return map;

  const next: GameSettingsMap = {};
  for (const [path, entry] of Object.entries(map)) {
    if (!MOVED_GAME_PATHS[path]) next[path] = { ...next[path], ...entry };
  }
  for (const [path, entry] of Object.entries(map)) {
    const moved = MOVED_GAME_PATHS[path];
    if (!moved || !entry) continue;
    const target = next[moved.path] ?? {};
    next[moved.path] = {
      ...target,
      isFavorite: target.isFavorite || entry.isFavorite || undefined,
      stats: mergeStats(target.stats, entry.stats),
    };
    if (!next[moved.path].isFavorite) delete next[moved.path].isFavorite;
  }
  return next;
}

export async function saveGameSettingsMap(map: GameSettingsMap) {
  if (CACHE_SETTINGS) gameSettingsMapCache = map;
  await AsyncStorage.setItem(GAME_SETTINGS_STORAGE_KEY, JSON.stringify(map));
}

/** Defaults that differ for one game, keyed by game path. */
const GAME_DEFAULT_OVERRIDES: Record<string, Partial<GameSettings>> = {
  // Forty Thieves proper has no redeal; unlimited redeals are the easy option.
  "/forty-thieves": { difficulty: "difficult" },
  ...Object.fromEntries(
    Object.entries(GAME_VARIANTS).map(([path, variants]) => [
      path,
      { variant: variants[0] },
    ]),
  ),
};

/** A game's defaults: the shared defaults plus its own overrides. */
export function getDefaultGameSettings(pathname?: string): GameSettings {
  const overrides = pathname
    ? GAME_DEFAULT_OVERRIDES[normalizeGamePath(pathname)]
    : undefined;
  return overrides
    ? { ...DEFAULT_GAME_SETTINGS, ...overrides }
    : DEFAULT_GAME_SETTINGS;
}

export function getGameSettings(
  map: GameSettingsMap,
  pathname: string,
): GameSettings {
  const key = normalizeGamePath(pathname);
  const defaults = getDefaultGameSettings(key);
  const existing = map[key];
  // A copy: callers change what they get back (toggleFavoriteGame flips
  // isFavorite), which on the shared defaults made every game a favourite in
  // memory and left the stored entry without one.
  if (!existing) return { ...defaults, stats: { ...defaults.stats } };

  const merged = {
    ...defaults,
    ...existing,
  };

  return {
    ...merged,
    showCardHints: merged.showCardHints !== false,
    isFavorite: merged.isFavorite === true,
    memoryDifficulty: MEMORY_DIFFICULTIES.includes(merged.memoryDifficulty)
      ? merged.memoryDifficulty
      : DEFAULT_GAME_SETTINGS.memoryDifficulty,
    difficulty:
      merged.difficulty === "difficult" || merged.difficulty === "easy"
        ? merged.difficulty
        : defaults.difficulty,
    drawCount:
      merged.drawCount === 1 || merged.drawCount === 3
        ? merged.drawCount
        : defaults.drawCount,
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
    elevensDifficulty:
      merged.elevensDifficulty === "easy" ||
      merged.elevensDifficulty === "medium"
        ? merged.elevensDifficulty
        : "hard",
    elevensEliminateBadDeals: merged.elevensEliminateBadDeals !== false,
    littleWindmillDifficulty:
      merged.littleWindmillDifficulty === "easy" ? "easy" : "normal",
    jailbreakDifficulty:
      merged.jailbreakDifficulty === "easy" ||
      merged.jailbreakDifficulty === "hard"
        ? merged.jailbreakDifficulty
        : "normal",
    gremlinDifficulty: merged.gremlinDifficulty === "hard" ? "hard" : "easy",
    nightVigilDifficulty:
      merged.nightVigilDifficulty === "street" ||
      merged.nightVigilDifficulty === "city"
        ? merged.nightVigilDifficulty
        : "kingpin",
    pagodaDifficulty:
      merged.pagodaDifficulty === "easy" || merged.pagodaDifficulty === "hard"
        ? merged.pagodaDifficulty
        : "normal",
    ebbAndFlowDifficulty:
      merged.ebbAndFlowDifficulty === "easy" ||
      merged.ebbAndFlowDifficulty === "hard"
        ? merged.ebbAndFlowDifficulty
        : "normal",
    machinationDifficulty:
      merged.machinationDifficulty === "easy" ||
      merged.machinationDifficulty === "hard"
        ? merged.machinationDifficulty
        : "medium",
    variant: isVariantGamePath(key)
      ? pickVariant(key, merged.variant)
      : defaults.variant,
    spiderSuits:
      merged.spiderSuits === 1 || merged.spiderSuits === 2
        ? merged.spiderSuits
        : 4,
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
  pathname?: string,
): Partial<GameSettings> {
  const compact: Partial<GameSettings> = {};
  const defaults = getDefaultGameSettings(pathname);

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

    if (value !== defaults[key]) {
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

    const seen = new Set<string>();
    return parsed
      .map((entry) =>
        typeof entry?.path === "string"
          ? { ...entry, path: currentGamePath(entry.path) }
          : entry,
      )
      .filter(
        (entry): entry is RecentGameEntry =>
          typeof entry?.path === "string" &&
          typeof entry?.playedAt === "number" &&
          Number.isFinite(entry.playedAt) &&
          !!GAMES_DATA[entry.path],
      )
      .sort((a, b) => b.playedAt - a.playedAt)
      .filter((entry) => !seen.has(entry.path) && !!seen.add(entry.path));
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
    map[key] = compactGameSettings(gameSettings, key);

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
    map[key] = compactGameSettings(updater(current), key);
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
  const lowerIsBetter = !!getGameInfo(pathname)?.lowerScoreIsBetter;
  const countsTowardsBest = numericScore !== null && (!lowerIsBetter || won);
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
        highestScore: !countsTowardsBest
          ? settings.stats.highestScore
          : settings.stats.highestScore === null
            ? numericScore
            : (lowerIsBetter ? Math.min : Math.max)(
                settings.stats.highestScore,
                numericScore!,
              ),
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
