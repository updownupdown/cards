import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { useEffect, useState } from "react";
import { sha256Hex } from "@/utils/sha256";
import { isPathBeyondField } from "./force-field";
import {
  CAMPAIGN_PROGRESS_STORAGE_KEY,
  ODYSSEY_UNLOCK_STORAGE_KEY,
} from "./storage-keys";
import {
  UNLOCK_KEY_SALT,
  UNLOCK_KEYS,
  type UnlockKey,
  type UnlockKeyRole,
} from "./unlock-keys";

/**
 * The full Odyssey: the games beyond the force field (FIELD_RADIUS in
 * src/data/campaign-map.ts). It comes from an unlock key (src/data/unlock-keys.ts),
 * or is kept by a save that had already won a game beyond the field when the
 * field arrived. Google Play's purchase will be a third way.
 *
 * Kept here as well as saved, like dev mode, so synchronous checks (a
 * Campaign win, isFieldUp) can read it.
 */
export type DevFieldView = "asPlayed" | "shown" | "lifted";

export type OdysseyUnlock = {
  /** The fingerprint of the key entered, checked against the list at start. */
  keyHash: string | null;
  /** The save had a win beyond the field when the field first loaded. */
  keptFromBefore: boolean;
  /** Whether the save has been checked for that, once. */
  checkedBeforeField: boolean;
  /** Dev mode only: show the field as played, always, or never. */
  devFieldView: DevFieldView;
};

const DEFAULT_UNLOCK: OdysseyUnlock = {
  keyHash: null,
  keptFromBefore: false,
  checkedBeforeField: false,
  devFieldView: "asPlayed",
};

let unlock: OdysseyUnlock = DEFAULT_UNLOCK;
let loaded: Promise<OdysseyUnlock> | null = null;
const listeners = new Set<(unlock: OdysseyUnlock) => void>();

function setUnlock(next: OdysseyUnlock) {
  unlock = next;
  listeners.forEach((listener) => listener(next));
}

async function save(next: OdysseyUnlock) {
  setUnlock(next);
  await AsyncStorage.setItem(ODYSSEY_UNLOCK_STORAGE_KEY, JSON.stringify(next));
}

/**
 * A key as typed: upper case, with spaces and dashes dropped, and the letters
 * that look like digits read as those digits (the keys never use them).
 */
export function normalizeUnlockKey(text: string) {
  return text
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, "")
    .replace(/[IL]/g, "1")
    .replace(/O/g, "0");
}

export function unlockKeyHash(text: string) {
  return sha256Hex(UNLOCK_KEY_SALT + normalizeUnlockKey(text));
}

function findKey(hash: string | null): UnlockKey | undefined {
  return hash ? UNLOCK_KEYS.find((key) => key.hash === hash) : undefined;
}

/** The role of the key entered, if it is still on the list. */
export function getUnlockKeyRole(): UnlockKeyRole | null {
  return findKey(unlock.keyHash)?.role ?? null;
}

/** Whether a developer key has been entered (dev mode may be turned on). */
export function hasDevKey() {
  return getUnlockKeyRole() === "dev";
}

/**
 * A friend's key opens the Odyssey on the web; on Android, Play does. A
 * tester's or developer's key opens it anywhere.
 */
function keyOpensOdyssey(role: UnlockKeyRole | null) {
  return (
    role === "dev" ||
    role === "tester" ||
    (role === "friend" && Platform.OS === "web")
  );
}

/** Whether this player has the full Odyssey. */
export function isOdysseyUnlocked() {
  return unlock.keptFromBefore || keyOpensOdyssey(getUnlockKeyRole());
}

export function getOdysseyUnlock() {
  return unlock;
}

/** Whether the save in storage has won a game beyond the field. */
async function savedWinBeyondField() {
  try {
    const raw = await AsyncStorage.getItem(CAMPAIGN_PROGRESS_STORAGE_KEY);
    const wins = raw ? JSON.parse(raw)?.winsByPath : null;
    return (
      !!wins &&
      typeof wins === "object" &&
      Object.keys(wins).some((path) => isPathBeyondField(path))
    );
  } catch {
    return false;
  }
}

/**
 * Reads the saved unlock; called at startup (by loadDevMode). The first time,
 * a save that already won a game beyond the field keeps the Odyssey open.
 */
export function loadOdysseyUnlock() {
  loaded ??= (async () => {
    let next = DEFAULT_UNLOCK;
    try {
      const raw = await AsyncStorage.getItem(ODYSSEY_UNLOCK_STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as Partial<OdysseyUnlock>) : {};
      next = {
        keyHash: typeof parsed.keyHash === "string" ? parsed.keyHash : null,
        keptFromBefore: parsed.keptFromBefore === true,
        checkedBeforeField: parsed.checkedBeforeField === true,
        devFieldView:
          parsed.devFieldView === "shown" || parsed.devFieldView === "lifted"
            ? parsed.devFieldView
            : "asPlayed",
      };
    } catch {
      // Unreadable: start afresh, below.
    }
    if (!next.checkedBeforeField) {
      next = {
        ...next,
        checkedBeforeField: true,
        keptFromBefore: await savedWinBeyondField(),
      };
      try {
        await save(next);
      } catch {
        setUnlock(next);
      }
    } else {
      setUnlock(next);
    }
    return next;
  })();
  return loaded;
}

export type RedeemResult =
  /** The full Odyssey is open. */
  | "unlocked"
  /** A developer key: the Odyssey is open and dev mode may be turned on. */
  | "devKey"
  /** A friend's key, entered in the Android app: it only works on the web. */
  | "webOnly"
  | "invalid";

/** Checks a key as typed and, if it is on the list, keeps it. */
export async function redeemUnlockKey(text: string): Promise<RedeemResult> {
  if (normalizeUnlockKey(text).length === 0) return "invalid";
  const hash = unlockKeyHash(text);
  const key = findKey(hash);
  if (!key) return "invalid";
  if (!keyOpensOdyssey(key.role)) return "webOnly";
  await loadOdysseyUnlock();
  // A developer key is never replaced by a friend's.
  if (getUnlockKeyRole() !== "dev" || key.role === "dev") {
    await save({ ...unlock, keyHash: hash });
  }
  return key.role === "dev" ? "devKey" : "unlocked";
}

export async function setDevFieldView(devFieldView: DevFieldView) {
  await save({ ...unlock, devFieldView });
}

/**
 * On the web, a link with `?key=` enters that key and takes it out of the
 * address, so it isn't kept in the history or shared on by accident.
 */
export async function redeemUnlockKeyFromLink() {
  if (Platform.OS !== "web" || typeof window === "undefined") return null;
  const url = new URL(window.location.href);
  const key = url.searchParams.get("key");
  if (!key) return null;
  url.searchParams.delete("key");
  window.history.replaceState(window.history.state, "", url.toString());
  return redeemUnlockKey(key);
}

export function subscribeToOdysseyUnlock(
  listener: (unlock: OdysseyUnlock) => void,
) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The unlock, updating when it changes. */
export function useOdysseyUnlock() {
  const [state, setState] = useState(unlock);
  useEffect(() => {
    setState(unlock);
    return subscribeToOdysseyUnlock(setState);
  }, []);
  return state;
}

/** For tests: forgets what was loaded. */
export function resetOdysseyUnlockForTests() {
  loaded = null;
  unlock = DEFAULT_UNLOCK;
}
