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
 * come (or turns them off) before ever seeing one. How often is saved under
 * its own key, which is only written once that choice has been shown.
 */
export type MomentFrequency = "off" | "every3" | "every5" | "every10";

export const MOMENT_FREQUENCIES: readonly MomentFrequency[] = [
  "off",
  "every3",
  "every5",
  "every10",
];
export const DEFAULT_MOMENT_FREQUENCY: MomentFrequency = "every5";

/** The chance that a win is followed by a moment: about one in N games. */
export const MOMENT_CHANCE: Record<MomentFrequency, number> = {
  off: 0,
  every3: 1 / 3,
  every5: 1 / 5,
  every10: 1 / 10,
};

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

export function parseMomentFrequency(saved: string | null): MomentFrequency {
  return (MOMENT_FREQUENCIES as readonly string[]).includes(saved ?? "")
    ? (saved as MomentFrequency)
    : DEFAULT_MOMENT_FREQUENCY;
}

const frequency = createStore<MomentFrequency>(DEFAULT_MOMENT_FREQUENCY);
/** Whether the player has been shown the choice (a moment's first time). */
let introduced = false;
let last: { kind: MomentKind; quoteId?: number } | null = null;

export function getMomentFrequency() {
  return frequency.get();
}

export function isMomentIntroduced() {
  return introduced;
}

/** Reads the saved choice; called once at startup. */
export async function loadMomentFrequency() {
  try {
    const saved = await AsyncStorage.getItem(MOMENTS_STORAGE_KEY);
    introduced = (MOMENT_FREQUENCIES as readonly string[]).includes(
      saved ?? "",
    );
    frequency.set(parseMomentFrequency(saved));
  } catch {
    frequency.set(DEFAULT_MOMENT_FREQUENCY);
  }
  return frequency.get();
}

/** Saves a choice, which also means the player has seen it. */
export async function saveMomentFrequency(next: MomentFrequency) {
  frequency.set(next);
  introduced = true;
  await AsyncStorage.setItem(MOMENTS_STORAGE_KEY, next);
}

/** The player's choice, updating when it changes. */
export function useMomentFrequency() {
  return frequency.use();
}

export type MomentOptions = {
  frequency?: MomentFrequency;
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
  frequency: chosen = frequency.get(),
  random = Math.random,
  introduced: shown = introduced,
  quoteIds = [],
  artworkPath,
}: MomentOptions = {}): Moment | null {
  if (random() >= MOMENT_CHANCE[chosen]) return null;
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
