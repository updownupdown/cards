/**
 * Unlock keys: each one's fingerprint, never the key itself, with who it was
 * for and what it opens. Written by `npm run keys:add` and `npm run
 * keys:remove` (scripts/unlock-keys.mjs); see docs/unlock-keys.md.
 *
 * - "friend": the full Odyssey, in the web app only (on Android it comes
 *   from Google Play).
 * - "dev": the full Odyssey anywhere, and dev mode may be turned on.
 *
 * Removing a key locks it again wherever it was entered, at the next start.
 */
export type UnlockKeyRole = "friend" | "dev";

export type UnlockKey = {
  label: string;
  role: UnlockKeyRole;
  /** sha256Hex(UNLOCK_KEY_SALT + the key, normalised). */
  hash: string;
};

export const UNLOCK_KEY_SALT = "solitarius-unlock-v1:";

// The list between these markers is rewritten by scripts/unlock-keys.mjs.
// keys:begin
export const UNLOCK_KEYS: UnlockKey[] = [];
// keys:end
