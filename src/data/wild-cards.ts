import AsyncStorage from "@react-native-async-storage/async-storage";
import { WILD_CARDS_STORAGE_KEY } from "./storage-keys";
import type { GAME_BACKGROUNDS } from "./game-backgrounds";

// Wild Cards: physics mini-games with playing cards, at the foot of the Home
// tab. They sit outside the campaign (no artwork, no map node, no stats); the
// only tie to it is that every GAMES_PER_WILD_CARD campaign games won earn a
// credit, spent by tapping a locked game.

export type WildGameId =
  | "castle-demolition"
  | "hat-trick"
  | "cutting-deck"
  | "royal-flush"
  | "architect";

export type WildGameDefinition = {
  id: WildGameId;
  /** A picture behind the game, or a plain colour. */
  background: keyof typeof GAME_BACKGROUNDS | { color: string };
  /** The way the game is laid out; the other way shows the rotate hint. */
  orientation: "portrait" | "landscape";
};

/** In shelf order. Ids are saved, so never rename one. */
export const WILD_GAMES: readonly WildGameDefinition[] = [
  { id: "castle-demolition", background: "castle", orientation: "landscape" },
  { id: "hat-trick", background: { color: "#2a211b" }, orientation: "portrait" },
  { id: "cutting-deck", background: "club", orientation: "portrait" },
  { id: "royal-flush", background: "nightCity", orientation: "portrait" },
  { id: "architect", background: "bookstore", orientation: "portrait" },
];

/**
 * Off while the games are being finished: every game is open to anyone who
 * can see Wild Cards (SHOW_WILD_CARDS, below).
 * Before release: turn this on, so games stay locked until won with credits
 * (the 12-tap "just this once" still lets a locked one be played daily), and
 * finish the translations and tests.
 */
export const WILD_CARDS_LOCKED = false;

/**
 * Whether Wild Cards show at all: the Home tab's section and their screens.
 * Off until they're refined after launch; turn it on locally to work on them.
 * Players' Wild Cards progress is kept either way.
 */
export const SHOW_WILD_CARDS = false;

export const GAMES_PER_WILD_CARD = 10;

/** The local day, as the Game of the Day writes it (kept apart from it, so
 * this file doesn't load every game). */
const getDateKey = (date: Date) =>
  `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
/** Taps in a row on a locked game that open it anyway, once a day. */
export const WILD_BYPASS_TAPS = 12;
/** A longer pause than this between taps starts the count again. */
export const WILD_BYPASS_TAP_GAP_MS = 1500;

/** Unlocked by the player, or open to all while WILD_CARDS_LOCKED is off. */
export function isWildGameUnlocked(progress: WildCardsProgress, id: WildGameId) {
  return !WILD_CARDS_LOCKED || progress.unlockedIds.includes(id);
}

export function getWildGame(id: string | undefined) {
  return WILD_GAMES.find((game) => game.id === id);
}

export type WildCardsProgress = {
  unlockedIds: WildGameId[];
  /** The day (getDateKey) the ids in `bypassedIds` were opened while locked. */
  bypassDay: string;
  bypassedIds: WildGameId[];
};

export const DEFAULT_WILD_CARDS_PROGRESS: WildCardsProgress = {
  unlockedIds: [],
  bypassDay: "",
  bypassedIds: [],
};

const isWildGameId = (value: unknown): value is WildGameId =>
  typeof value === "string" && WILD_GAMES.some((game) => game.id === value);

function normalize(value: unknown): WildCardsProgress {
  if (!value || typeof value !== "object") return DEFAULT_WILD_CARDS_PROGRESS;
  const record = value as Record<string, unknown>;
  const ids = (list: unknown) =>
    Array.isArray(list) ? [...new Set(list.filter(isWildGameId))] : [];
  return {
    unlockedIds: ids(record.unlockedIds),
    bypassDay: typeof record.bypassDay === "string" ? record.bypassDay : "",
    bypassedIds: ids(record.bypassedIds),
  };
}

type Listener = (progress: WildCardsProgress) => void;
const listeners = new Set<Listener>();
let writeQueue: Promise<unknown> = Promise.resolve();

export async function loadWildCardsProgress() {
  try {
    const raw = await AsyncStorage.getItem(WILD_CARDS_STORAGE_KEY);
    return normalize(raw ? JSON.parse(raw) : null);
  } catch {
    return DEFAULT_WILD_CARDS_PROGRESS;
  }
}

export function subscribeToWildCardsProgress(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Reads, changes and saves the progress, one change at a time. */
function mutate(change: (progress: WildCardsProgress) => WildCardsProgress) {
  const next = writeQueue.then(async () => {
    const updated = change(await loadWildCardsProgress());
    await AsyncStorage.setItem(WILD_CARDS_STORAGE_KEY, JSON.stringify(updated));
    listeners.forEach((listener) => listener(updated));
    return updated;
  });
  writeQueue = next.catch(() => {});
  return next;
}

export type WildCardsStatus = {
  /** Unlocks the player can still spend. */
  credits: number;
  /** Campaign wins still needed for the next credit; 0 when none is owed. */
  winsNeeded: number;
  allUnlocked: boolean;
};

/** What `wonCount` campaign wins buy, given the games already unlocked. */
export function getWildCardsStatus(
  wonCount: number,
  unlockedCount: number,
): WildCardsStatus {
  const allUnlocked = unlockedCount >= WILD_GAMES.length;
  const earned = Math.floor(wonCount / GAMES_PER_WILD_CARD);
  const credits = allUnlocked
    ? 0
    : Math.min(Math.max(0, earned - unlockedCount), WILD_GAMES.length - unlockedCount);
  const winsNeeded =
    allUnlocked || credits > 0
      ? 0
      : GAMES_PER_WILD_CARD * (unlockedCount + 1) - wonCount;
  return { credits, winsNeeded, allUnlocked };
}

/** Spends a credit on `id`. The caller checks there is one to spend. */
export function unlockWildGame(id: WildGameId) {
  return mutate((progress) =>
    progress.unlockedIds.includes(id)
      ? progress
      : { ...progress, unlockedIds: [...progress.unlockedIds, id] },
  );
}

/** Whether a locked game can still be opened "just this once" today. */
export function canBypassToday(
  progress: WildCardsProgress,
  id: WildGameId,
  date: Date = new Date(),
) {
  return (
    progress.bypassDay !== getDateKey(date) || !progress.bypassedIds.includes(id)
  );
}

/** Uses up today's one play of a locked game. */
export function recordWildBypass(id: WildGameId, date: Date = new Date()) {
  const day = getDateKey(date);
  return mutate((progress) => {
    const today = progress.bypassDay === day ? progress.bypassedIds : [];
    return {
      ...progress,
      bypassDay: day,
      bypassedIds: today.includes(id) ? today : [...today, id],
    };
  });
}

/** Part of resetting all the player's data (Settings). */
export function resetWildCardsProgress() {
  return mutate(() => DEFAULT_WILD_CARDS_PROGRESS);
}

// A locked game opened "just this once" is let in by its screen only for a
// few seconds after the tap that opened it: long enough for the screen to
// open, and never again from a link or the back stack.
const PASS_MS = 10_000;
const passes = new Map<WildGameId, number>();

export function grantWildPass(id: WildGameId, at = Date.now()) {
  passes.set(id, at);
}

export function hasWildPass(id: WildGameId, at = Date.now()) {
  const grantedAt = passes.get(id);
  return grantedAt !== undefined && at - grantedAt < PASS_MS;
}
