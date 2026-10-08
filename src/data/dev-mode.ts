import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { BETA_GAMES_STORAGE_KEY, DEV_MODE_STORAGE_KEY } from "./storage-keys";

/**
 * Dev mode, for testing on any platform: a player turns it on by tapping
 * the version number in the settings ten times, and off from the link under
 * it. While it's on, the game header has a trophy that wins the game at
 * once, every Wild Cards game is open, and the beta (local-only) games
 * show. The choice is saved under its own key and kept here, so synchronous
 * checks (isGameEnabled) can read it.
 */
let devMode = false;
const listeners = new Set<(enabled: boolean) => void>();

function setDevMode(enabled: boolean) {
  devMode = enabled;
  listeners.forEach((listener) => listener(enabled));
}

export function isDevMode() {
  return devMode;
}

/** Reads the saved choice; called once at startup. */
export async function loadDevMode() {
  try {
    const saved = await AsyncStorage.getItem(DEV_MODE_STORAGE_KEY);
    // Before dev mode, the same ten taps turned on the beta games alone.
    const legacy =
      saved === null &&
      (await AsyncStorage.getItem(BETA_GAMES_STORAGE_KEY)) === "1";
    setDevMode(saved === "1" || legacy);
  } catch {
    setDevMode(false);
  }
  return devMode;
}

export async function saveDevMode(enabled: boolean) {
  setDevMode(enabled);
  await AsyncStorage.setItem(DEV_MODE_STORAGE_KEY, enabled ? "1" : "0");
}

/** Whether dev mode is on, updating when it changes. */
export function useDevMode() {
  const [enabled, setState] = useState(devMode);
  useEffect(() => {
    setState(devMode);
    listeners.add(setState);
    return () => {
      listeners.delete(setState);
    };
  }, []);
  return enabled;
}
