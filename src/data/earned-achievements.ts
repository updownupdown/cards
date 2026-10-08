import AsyncStorage from "@react-native-async-storage/async-storage";
import { ACHIEVEMENT_KEYS, type AchievementKey } from "./achievements";
import { EARNED_ACHIEVEMENTS_STORAGE_KEY } from "./storage-keys";

// Achievements are worked out from stats and collectibles, but some aim at
// "every game" or "every quote", which grow as games and quotes are added. The
// ones a player has earned are saved, so an update never takes one away.
// They are recorded from the Stats tab and after each win
// (syncEarnedAchievements in achievement-sync.ts).

type EarnedListener = (earned: ReadonlySet<AchievementKey>) => void;
const listeners = new Set<EarnedListener>();
let writeQueue: Promise<unknown> = Promise.resolve();

const isAchievementKey = (key: unknown): key is AchievementKey =>
  (ACHIEVEMENT_KEYS as readonly unknown[]).includes(key);

export async function loadEarnedAchievements(): Promise<Set<AchievementKey>> {
  try {
    const raw = await AsyncStorage.getItem(EARNED_ACHIEVEMENTS_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return new Set(
      Array.isArray(parsed) ? parsed.filter(isAchievementKey) : [],
    );
  } catch {
    return new Set();
  }
}

export function subscribeToEarnedAchievements(listener: EarnedListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Saves achievements as earned; ones already saved are left as they are. */
export function recordEarnedAchievements(keys: Iterable<AchievementKey>) {
  const added = [...keys];
  const write = writeQueue.then(async () => {
    const earned = await loadEarnedAchievements();
    if (added.every((key) => earned.has(key))) return earned;
    added.forEach((key) => earned.add(key));
    await AsyncStorage.setItem(
      EARNED_ACHIEVEMENTS_STORAGE_KEY,
      JSON.stringify([...earned].sort()),
    );
    listeners.forEach((listener) => listener(earned));
    return earned;
  });
  writeQueue = write.catch(() => {});
  return write;
}
