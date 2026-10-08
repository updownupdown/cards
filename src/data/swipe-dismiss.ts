import AsyncStorage from "@react-native-async-storage/async-storage";
import { createStore } from "./hint-mode";
import { SWIPE_DISMISS_STORAGE_KEY } from "./storage-keys";

// Until it's read, the swipe counts as known, so its cue never plays for a
// player who doesn't need it.
const known = createStore(true);

/** Reads whether the swipe has been used; called once at startup. */
export async function loadSwipeDismissKnown() {
  try {
    known.set((await AsyncStorage.getItem(SWIPE_DISMISS_STORAGE_KEY)) === "1");
  } catch {
    known.set(true);
  }
}

/** Whether the player has swiped a quick start away before, in any game. */
export function useSwipeDismissKnown() {
  return known.use();
}

export function markSwipeDismissKnown() {
  if (known.get()) return;
  known.set(true);
  AsyncStorage.setItem(SWIPE_DISMISS_STORAGE_KEY, "1").catch(() => {});
}
