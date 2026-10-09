import AsyncStorage from "@react-native-async-storage/async-storage";
import { createStore } from "./hint-mode";
import { MOMENTS_STORAGE_KEY } from "./storage-keys";

/**
 * Quiet moments: now and then, after a win outside the Odyssey, the screen
 * offers a pause before the next deal. Most are a single line, written for
 * the app (not quotes, not the Tao); a few have next to no words: a breath to
 * follow, cards settling into a pile, ripples on still water. A tap anywhere
 * puts one away, at once.
 *
 * How often they come is a setting of its own, saved under its own key.
 */
export type MomentFrequency = "off" | "infrequent" | "frequent";

export const MOMENT_FREQUENCIES: readonly MomentFrequency[] = [
  "off",
  "infrequent",
  "frequent",
];
export const DEFAULT_MOMENT_FREQUENCY: MomentFrequency = "infrequent";

/** The chance that a win is followed by a moment. */
export const MOMENT_CHANCE: Record<MomentFrequency, number> = {
  off: 0,
  infrequent: 1 / 8,
  frequent: 1 / 3,
};

export type MomentKind = "words" | "breathe" | "settle" | "ripples";

export type Moment = {
  /** Also its key: `moments.lines.<id>` for words. */
  id: string;
  kind: MomentKind;
};

export const MOMENTS: readonly Moment[] = [
  { id: "dealt", kind: "words" },
  { id: "shuffled", kind: "words" },
  { id: "choices", kind: "words" },
  { id: "stillHere", kind: "words" },
  { id: "hidden", kind: "words" },
  { id: "noticed", kind: "words" },
  { id: "hands", kind: "words" },
  { id: "attention", kind: "words" },
  { id: "smallGood", kind: "words" },
  { id: "forget", kind: "words" },
  { id: "again", kind: "words" },
  { id: "noHurry", kind: "words" },
  { id: "breathe", kind: "breathe" },
  { id: "settle", kind: "settle" },
  { id: "ripples", kind: "ripples" },
];

export function getMoment(id: string) {
  return MOMENTS.find((moment) => moment.id === id);
}

export function parseMomentFrequency(saved: string | null): MomentFrequency {
  return (MOMENT_FREQUENCIES as readonly string[]).includes(saved ?? "")
    ? (saved as MomentFrequency)
    : DEFAULT_MOMENT_FREQUENCY;
}

const frequency = createStore<MomentFrequency>(DEFAULT_MOMENT_FREQUENCY);
let lastMomentId: string | null = null;

export function getMomentFrequency() {
  return frequency.get();
}

/** Reads the saved choice; called once at startup. */
export async function loadMomentFrequency() {
  try {
    frequency.set(
      parseMomentFrequency(await AsyncStorage.getItem(MOMENTS_STORAGE_KEY)),
    );
  } catch {
    frequency.set(DEFAULT_MOMENT_FREQUENCY);
  }
  return frequency.get();
}

export async function saveMomentFrequency(next: MomentFrequency) {
  frequency.set(next);
  await AsyncStorage.setItem(MOMENTS_STORAGE_KEY, next);
}

/** The player's choice, updating when it changes. */
export function useMomentFrequency() {
  return frequency.use();
}

/**
 * Whether this win is followed by a moment, and which: any but the one shown
 * last, so the same one never comes twice running.
 */
export function rollMoment(
  chosen: MomentFrequency = frequency.get(),
  random: () => number = Math.random,
): Moment | null {
  if (random() >= MOMENT_CHANCE[chosen]) return null;
  const choices = MOMENTS.filter((moment) => moment.id !== lastMomentId);
  const moment = choices[Math.floor(random() * choices.length)];
  lastMomentId = moment.id;
  return moment;
}
