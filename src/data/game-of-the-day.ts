import AsyncStorage from "@react-native-async-storage/async-storage";
import { GAME_DEFINITIONS } from "./games-registry";

const DAILY_WINS_STORAGE_KEY = "cards.dailyWins.v1";
/** Enough history for any streak worth showing, without growing forever. */
const MAX_DAILY_WINS = 400;

/**
 * The released games, in a fixed order, so everyone gets the same pick on the
 * same day whatever their language (and local-only games never get picked).
 */
const DAILY_GAME_PATHS = GAME_DEFINITIONS.filter(
  (game) => !game.enabledOnLocalOnly,
)
  .map((game) => game.path)
  .sort();

/** A calendar date in local time, e.g. "2026-9-23". */
export function getDateKey(date: Date = new Date()) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

/** The date `days` calendar days before `date`. */
export function daysBefore(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
}

/**
 * Deterministically picks a "Game of the Day" from the provided list of game
 * paths using only the calendar date. The same date always yields the same
 * pick, and consecutive days produce a well-distributed spread of games.
 */
export function getGameOfTheDayPath(
  date: Date = new Date(),
  paths: string[] = DAILY_GAME_PATHS,
): string | null {
  if (paths.length === 0) {
    return null;
  }

  const key = getDateKey(date);

  // Simple, stable string hash (djb2-ish) folded into a positive integer.
  let hash = 5381;
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 33 + key.charCodeAt(index)) >>> 0;
  }

  return paths[hash % paths.length];
}

type DailyWinsListener = (dateKeys: Set<string>) => void;
const listeners = new Set<DailyWinsListener>();

/** The days on which the player won that day's Game of the Day. */
export async function loadDailyWins() {
  try {
    const raw = await AsyncStorage.getItem(DAILY_WINS_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return new Set(
      Array.isArray(parsed)
        ? parsed.filter((key): key is string => typeof key === "string")
        : [],
    );
  } catch {
    return new Set<string>();
  }
}

export function subscribeToDailyWins(listener: DailyWinsListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Records a win if `path` is today's Game of the Day. */
export async function recordDailyWin(path: string, date: Date = new Date()) {
  if (getGameOfTheDayPath(date) !== path) return;
  const wins = await loadDailyWins();
  const key = getDateKey(date);
  if (wins.has(key)) return;
  wins.add(key);
  const kept = [...wins].slice(-MAX_DAILY_WINS);
  await AsyncStorage.setItem(DAILY_WINS_STORAGE_KEY, JSON.stringify(kept));
  const next = new Set(kept);
  listeners.forEach((listener) => listener(next));
}

/**
 * Days in a row the daily game was won, up to today. Today not being won yet
 * does not break the streak; it is still there to be kept.
 */
export function getDailyStreak(
  wins: ReadonlySet<string>,
  today: Date = new Date(),
) {
  let day = wins.has(getDateKey(today)) ? 0 : 1;
  let streak = 0;
  while (wins.has(getDateKey(daysBefore(today, day)))) {
    streak += 1;
    day += 1;
  }
  return streak;
}
