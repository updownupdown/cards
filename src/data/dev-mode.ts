import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef, useState } from "react";
import { isLocalDevEnvironment } from "@/utils/utils";
import { hasDevKey, loadOdysseyUnlock } from "./odyssey-unlock";
import { DEV_MODE_STORAGE_KEY } from "./storage-keys";

/**
 * Dev mode, for testing on any platform: a player turns it on with a knock
 * on the version number in Settings, Advanced (createDevModeKnock), and off
 * from the Dev tab it brings. While it's on, the game header has a trophy
 * that wins the game at once, the beta (local-only) games show, the dev pages
 * open, the app doesn't resume the last game at startup, and Settings has a
 * Dev tab of shortcuts (test progress, unlocking the campaign, a Mercy Skip,
 * the force field's view, previews of the quiet moments, the art gallery).
 * The choice is saved under its own key and kept here, so synchronous checks
 * (isGameEnabled) can read it.
 *
 * It can only be turned on where the app runs locally (a development build,
 * or the web build served from this computer), or once a developer key has
 * been entered (src/data/unlock-keys.ts): elsewhere the knock asks for one,
 * and a saved "on" is read as off.
 */
let devMode = false;
let firstLoad: Promise<boolean> | null = null;
const listeners = new Set<(enabled: boolean) => void>();

function setDevMode(enabled: boolean) {
  devMode = enabled;
  listeners.forEach((listener) => listener(enabled));
}

export function isDevMode() {
  return devMode;
}

/** Whether dev mode may be turned on here. */
export function canUseDevMode() {
  return isLocalDevEnvironment() || hasDevKey();
}

/** Reads the saved choice; called once at startup. */
export function loadDevMode() {
  const load = readDevMode();
  firstLoad ??= load;
  return load;
}

/**
 * Whether dev mode is on, once the saved choice has been read: for what
 * decides at startup (resuming the last game, a dev page opened by its
 * address), which would otherwise see it off.
 */
export function devModeReady() {
  return firstLoad ?? loadDevMode();
}

async function readDevMode() {
  try {
    await loadOdysseyUnlock();
    setDevMode(
      canUseDevMode() &&
        (await AsyncStorage.getItem(DEV_MODE_STORAGE_KEY)) === "1",
    );
  } catch {
    setDevMode(false);
  }
  return devMode;
}

export async function saveDevMode(enabled: boolean) {
  if (enabled && !canUseDevMode()) return;
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

/**
 * The knock on the version number: five taps, a five second pause (the
 * number turns red), five more taps.
 */
export const DEV_MODE_KNOCK_TAPS = 5;
export const DEV_MODE_KNOCK_PAUSE_MS = 5000;

/**
 * Listens for the knock. Taps are counted in runs, a run ending once the
 * pause goes by without a tap: a first run of exactly five arms the knock
 * (onArmedChange, for the red), any other is forgotten, so tapping on past
 * five does nothing. Armed, the fifth tap calls onUnlock; a pause before it
 * disarms the knock again, so stray taps never add up.
 */
export function createDevModeKnock(handlers: {
  onArmedChange: (armed: boolean) => void;
  onUnlock: () => void;
}) {
  let armed = false;
  let taps = 0;
  let pause: ReturnType<typeof setTimeout> | undefined;

  const setArmed = (next: boolean) => {
    if (next === armed) return;
    armed = next;
    handlers.onArmedChange(next);
  };
  const endRun = () => {
    pause = undefined;
    const knocked = !armed && taps === DEV_MODE_KNOCK_TAPS;
    taps = 0;
    setArmed(knocked);
  };

  return {
    tap() {
      clearTimeout(pause);
      taps += 1;
      if (armed && taps === DEV_MODE_KNOCK_TAPS) {
        pause = undefined;
        taps = 0;
        setArmed(false);
        handlers.onUnlock();
        return;
      }
      pause = setTimeout(endRun, DEV_MODE_KNOCK_PAUSE_MS);
    },
    /** Forgets the knock so far. */
    reset() {
      clearTimeout(pause);
      pause = undefined;
      taps = 0;
      setArmed(false);
    },
  };
}

/** The knock for a screen: whether it is armed, and the tap to pass on. */
export function useDevModeKnock(onUnlock: () => void) {
  const [armed, setArmed] = useState(false);
  const onUnlockRef = useRef(onUnlock);
  onUnlockRef.current = onUnlock;
  const [knock] = useState(() =>
    createDevModeKnock({
      onArmedChange: setArmed,
      onUnlock: () => onUnlockRef.current(),
    }),
  );
  useEffect(() => () => knock.reset(), [knock]);
  return { armed, tap: knock.tap };
}
