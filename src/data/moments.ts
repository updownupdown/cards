import AsyncStorage from "@react-native-async-storage/async-storage";
import { createStore } from "./hint-mode";
import { MOMENTS_STORAGE_KEY } from "./storage-keys";

/**
 * Quiet moments: now and then, after a win outside the Odyssey, the screen
 * offers a pause before the next deal, on black, with next to no words: a
 * breath to follow, cards settling into a pile, a quote already collected,
 * or the game's own picture to look into. Each one moves on by itself, and
 * "Skip quiet moment" at the foot (with how long is left) ends it at once.
 *
 * The first one is the setting itself, so the player picks how often they
 * come (or turns them off) before ever seeing one. The choice is saved under
 * its own key, which is only written once that choice has been shown.
 */
export type MomentSettings = {
  enabled: boolean;
  /** A moment follows about one win in this many. */
  every: number;
};

/** 1 is every win. */
export const MOMENT_EVERY_MIN = 1;
export const MOMENT_EVERY_MAX = 15;
export const DEFAULT_MOMENT_SETTINGS: MomentSettings = {
  enabled: true,
  every: 3,
};

/** The chance that a win is followed by a moment: about one in N games. */
export function momentChance({ enabled, every }: MomentSettings) {
  return enabled ? 1 / every : 0;
}

export type MomentKind = "intro" | "breathe" | "settle" | "quote" | "artwork";

export type Moment =
  | { kind: "intro" | "breathe" | "settle" }
  | { kind: "quote"; quoteId: number }
  | { kind: "artwork"; path: string };

/** Every kind, in the order the dev-mode preview lists them. */
export const MOMENT_KINDS: readonly MomentKind[] = [
  "intro",
  "breathe",
  "settle",
  "quote",
  "artwork",
];

export function momentKey(moment: Moment) {
  if (moment.kind === "quote") return `quote-${moment.quoteId}`;
  if (moment.kind === "artwork") return `artwork-${moment.path}`;
  return moment.kind;
}

function clampEvery(every: unknown) {
  return typeof every === "number" && Number.isFinite(every)
    ? Math.min(MOMENT_EVERY_MAX, Math.max(MOMENT_EVERY_MIN, Math.round(every)))
    : DEFAULT_MOMENT_SETTINGS.every;
}

/**
 * The saved choice, or null if there is none yet (or it can't be read).
 * Before the slider it was one word: "off", or "every3", "every5", "every10".
 */
export function parseMomentSettings(
  saved: string | null,
): MomentSettings | null {
  if (!saved) return null;
  if (saved === "off") return { ...DEFAULT_MOMENT_SETTINGS, enabled: false };
  const word = /^every(\d+)$/.exec(saved);
  if (word) return { enabled: true, every: clampEvery(Number(word[1])) };
  try {
    const parsed: unknown = JSON.parse(saved);
    if (!parsed || typeof parsed !== "object") return null;
    const { enabled, every } = parsed as Record<string, unknown>;
    return { enabled: enabled !== false, every: clampEvery(every) };
  } catch {
    return null;
  }
}

const settings = createStore<MomentSettings>(DEFAULT_MOMENT_SETTINGS);
/** Whether the player has been shown the choice (a moment's first time). */
let introduced = false;
let last: { kind: MomentKind; quoteId?: number } | null = null;

export function getMomentSettings() {
  return settings.get();
}

export function isMomentIntroduced() {
  return introduced;
}

/** Reads the saved choice; called once at startup. */
export async function loadMomentSettings() {
  try {
    const saved = parseMomentSettings(
      await AsyncStorage.getItem(MOMENTS_STORAGE_KEY),
    );
    introduced = saved !== null;
    settings.set(saved ?? DEFAULT_MOMENT_SETTINGS);
  } catch {
    settings.set(DEFAULT_MOMENT_SETTINGS);
  }
  return settings.get();
}

/** Saves a choice, which also means the player has seen it. */
export async function saveMomentSettings(next: MomentSettings) {
  settings.set(next);
  introduced = true;
  await AsyncStorage.setItem(MOMENTS_STORAGE_KEY, JSON.stringify(next));
}

/** The player's choice, updating when it changes. */
export function useMomentSettings() {
  return settings.use();
}

export type MomentOptions = {
  settings?: MomentSettings;
  random?: () => number;
  /** Whether the choice has been shown; if not, it is the moment. */
  introduced?: boolean;
  /** Quotes the player has collected: only those are shown. */
  quoteIds?: readonly number[];
  /** The game just won, when it has a picture. */
  artworkPath?: string;
};

/**
 * Whether this win is followed by a moment, and which. The first is always
 * the setting; after that, any kind there is something for, but not the one
 * shown last, and a quote never twice running.
 */
export function rollMoment({
  settings: chosen = settings.get(),
  random = Math.random,
  introduced: shown = introduced,
  quoteIds = [],
  artworkPath,
}: MomentOptions = {}): Moment | null {
  if (random() >= momentChance(chosen)) return null;
  if (!shown) return { kind: "intro" };

  const quotes = quoteIds.filter((id) => id !== last?.quoteId);
  const kinds: MomentKind[] = ["breathe", "settle"];
  if (quotes.length > 0) kinds.push("quote");
  if (artworkPath) kinds.push("artwork");
  const fresh = kinds.filter((kind) => kind !== last?.kind);
  const kind = fresh[Math.floor(random() * fresh.length)];

  let moment: Moment;
  if (kind === "quote") {
    moment = {
      kind,
      quoteId: quotes[Math.floor(random() * quotes.length)],
    };
  } else if (kind === "artwork" && artworkPath) {
    moment = { kind, path: artworkPath };
  } else {
    moment = { kind: kind as "breathe" | "settle" };
  }
  last = {
    kind,
    quoteId: moment.kind === "quote" ? moment.quoteId : last?.quoteId,
  };
  return moment;
}
