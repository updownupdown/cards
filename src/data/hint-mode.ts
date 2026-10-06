import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import {
  HINT_BUTTON_STORAGE_KEY,
  HINT_INTRO_STORAGE_KEY,
} from "./storage-keys";

/**
 * "Help from Above", from the settings: what the UFO in the game header does.
 *
 * - off: no UFO in the header;
 * - beacons: it lights up a good move (the default; wins still count);
 * - autopilot: it flies out and plays the move itself (a win in a game it
 *   played doesn't count).
 *
 * Saved under the old "show hint button" key, which held "1" (shown) or "0"
 * (hidden): those read as beacons and off.
 */
export type HintMode = "off" | "beacons" | "autopilot";

export const HINT_MODES: readonly HintMode[] = ["off", "beacons", "autopilot"];
export const DEFAULT_HINT_MODE: HintMode = "beacons";

export function parseHintMode(saved: string | null): HintMode {
  if (saved === "0") return "off";
  if (saved === "1" || saved === null) return DEFAULT_HINT_MODE;
  return (HINT_MODES as readonly string[]).includes(saved)
    ? (saved as HintMode)
    : DEFAULT_HINT_MODE;
}

/** A tiny shared store: every screen reads the same value. */
function createStore<T>(initial: T) {
  let value = initial;
  const listeners = new Set<(value: T) => void>();
  return {
    get: () => value,
    set(next: T) {
      value = next;
      listeners.forEach((listener) => listener(next));
    },
    use() {
      const [state, setState] = useState(value);
      useEffect(() => {
        setState(value);
        listeners.add(setState);
        return () => {
          listeners.delete(setState);
        };
      }, []);
      return state;
    },
  };
}

const mode = createStore<HintMode>(DEFAULT_HINT_MODE);
// Until it's read, the introduction counts as seen, so it never flashes up.
const introSeen = createStore(true);

export function getHintMode() {
  return mode.get();
}

/** Reads the saved choices; called once at startup. */
export async function loadHintMode() {
  try {
    const [savedMode, savedIntro] = await Promise.all([
      AsyncStorage.getItem(HINT_BUTTON_STORAGE_KEY),
      AsyncStorage.getItem(HINT_INTRO_STORAGE_KEY),
    ]);
    mode.set(parseHintMode(savedMode));
    introSeen.set(savedIntro === "1");
  } catch {
    mode.set(DEFAULT_HINT_MODE);
    introSeen.set(true);
  }
  return mode.get();
}

export async function saveHintMode(next: HintMode) {
  mode.set(next);
  await AsyncStorage.setItem(HINT_BUTTON_STORAGE_KEY, next);
}

/** The player's choice, updating when it changes. */
export function useHintMode() {
  return mode.use();
}

/** Whether the player has put away the Rules modal's introduction. */
export function useHintIntroSeen() {
  return introSeen.use();
}

export async function markHintIntroSeen() {
  introSeen.set(true);
  await AsyncStorage.setItem(HINT_INTRO_STORAGE_KEY, "1");
}
