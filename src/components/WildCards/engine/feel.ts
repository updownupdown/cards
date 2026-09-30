import { haptics } from "@/utils/haptics";
import { now } from "./loop";

type Kind = keyof typeof haptics;

const lastAt: Partial<Record<Kind, number>> = {};

/**
 * Haptics for the Wild Cards, all kept subtle and spaced out: a burst of
 * collisions gives one tap, not a buzz. Behind the "Haptic feedback" setting,
 * as all the app's haptics are.
 */
export function feel(kind: Kind, minGapMs = 60) {
  const time = now();
  if (time - (lastAt[kind] ?? -Infinity) < minGapMs) return;
  lastAt[kind] = time;
  haptics[kind]();
}
