import AsyncStorage from "@react-native-async-storage/async-storage";
import { sha256Hex } from "@/utils/sha256";
import { DEV_KEY_STORAGE_KEY } from "./storage-keys";
import { DEV_KEY_SALT, DEV_KEYS } from "./dev-keys";

/**
 * The developer key entered on this device (src/data/dev-keys.ts), which lets
 * dev mode be turned on outside a local run (src/data/dev-mode.ts). Kept here
 * as well as saved, so synchronous checks (canUseDevMode) can read it.
 *
 * It's saved as `{ keyHash }` under the key that once held the Odyssey's
 * unlock, so a developer key entered then still counts. What else that save
 * held (the unlock from before the force field, dev mode's view of the field)
 * is left as it is and no longer read.
 */
let keyHash: string | null = null;
let loaded: Promise<string | null> | null = null;

async function readSaved(): Promise<Record<string, unknown>> {
  try {
    const raw = await AsyncStorage.getItem(DEV_KEY_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

/**
 * A key as typed: upper case, with spaces and dashes dropped, and the letters
 * that look like digits read as those digits (the keys never use them).
 */
export function normalizeDevKey(text: string) {
  return text
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, "")
    .replace(/[IL]/g, "1")
    .replace(/O/g, "0");
}

export function devKeyHash(text: string) {
  return sha256Hex(DEV_KEY_SALT + normalizeDevKey(text));
}

function isListed(hash: string | null) {
  return !!hash && DEV_KEYS.some((key) => key.hash === hash);
}

/** Whether a developer key, still on the list, has been entered here. */
export function hasDevKey() {
  return isListed(keyHash);
}

/** Reads the saved key; called at startup (by loadDevMode). */
export function loadDevKey() {
  loaded ??= (async () => {
    const saved = await readSaved();
    keyHash = typeof saved.keyHash === "string" ? saved.keyHash : null;
    return keyHash;
  })();
  return loaded;
}

/** Checks a key as typed and, if it is on the list, keeps it. */
export async function redeemDevKey(text: string): Promise<boolean> {
  if (normalizeDevKey(text).length === 0) return false;
  const hash = devKeyHash(text);
  if (!isListed(hash)) return false;
  await loadDevKey();
  const saved = await readSaved();
  keyHash = hash;
  await AsyncStorage.setItem(
    DEV_KEY_STORAGE_KEY,
    JSON.stringify({ ...saved, keyHash: hash }),
  );
  return true;
}

/** For tests: forgets what was loaded. */
export function resetDevKeyForTests() {
  loaded = null;
  keyHash = null;
}
