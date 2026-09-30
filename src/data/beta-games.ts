import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { isLocalDevEnvironment } from "@/utils/utils";
import { BETA_GAMES_STORAGE_KEY } from "./storage-keys";

/**
 * Beta (local-only) games are always shown on a dev machine. Elsewhere, a
 * player turns them on by tapping the version number in the settings ten
 * times. The choice is saved under its own key and kept here, so the
 * synchronous game checks (isGameEnabled) can read it.
 */
let betaGamesEnabled = false;
const listeners = new Set<(enabled: boolean) => void>();

function setEnabled(enabled: boolean) {
  betaGamesEnabled = enabled;
  listeners.forEach((listener) => listener(enabled));
}

export function areBetaGamesVisible() {
  return betaGamesEnabled || isLocalDevEnvironment();
}

/** Whether the player turned beta games on (dev machines aside). */
export function areBetaGamesEnabled() {
  return betaGamesEnabled;
}

/** Reads the saved choice; called once at startup. */
export async function loadBetaGames() {
  try {
    setEnabled((await AsyncStorage.getItem(BETA_GAMES_STORAGE_KEY)) === "1");
  } catch {
    setEnabled(false);
  }
  return betaGamesEnabled;
}

export async function saveBetaGames(enabled: boolean) {
  setEnabled(enabled);
  await AsyncStorage.setItem(BETA_GAMES_STORAGE_KEY, enabled ? "1" : "0");
}

/** The player's choice, updating when it changes. */
export function useBetaGamesEnabled() {
  const [enabled, setState] = useState(betaGamesEnabled);
  useEffect(() => {
    setState(betaGamesEnabled);
    listeners.add(setState);
    return () => {
      listeners.delete(setState);
    };
  }, []);
  return enabled;
}
