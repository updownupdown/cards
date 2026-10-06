import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { HINT_BUTTON_STORAGE_KEY } from "./storage-keys";

/**
 * "Show hint button", from the settings: on unless the player turned it off.
 * Saved under its own key (as beta games are), and kept here so every screen
 * reads the same value.
 */
let hintButtonShown = true;
const listeners = new Set<(shown: boolean) => void>();

function setShown(shown: boolean) {
  hintButtonShown = shown;
  listeners.forEach((listener) => listener(shown));
}

export function isHintButtonShown() {
  return hintButtonShown;
}

/** Reads the saved choice; called once at startup. */
export async function loadHintButton() {
  try {
    setShown((await AsyncStorage.getItem(HINT_BUTTON_STORAGE_KEY)) !== "0");
  } catch {
    setShown(true);
  }
  return hintButtonShown;
}

export async function saveHintButton(shown: boolean) {
  setShown(shown);
  await AsyncStorage.setItem(HINT_BUTTON_STORAGE_KEY, shown ? "1" : "0");
}

/** The player's choice, updating when it changes. */
export function useHintButtonShown() {
  const [shown, setState] = useState(hintButtonShown);
  useEffect(() => {
    setState(hintButtonShown);
    listeners.add(setState);
    return () => {
      listeners.delete(setState);
    };
  }, []);
  return shown;
}
