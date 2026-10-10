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
export const UNLOCK_KEYS: UnlockKey[] = [
  {
    label: "Kate",
    role: "friend",
    hash: "268f304371c98d6556b38b85e03f54dfc5d631a6c34e28c1e39db62a3fd49f4e",
  },
  {
    label: "James",
    role: "dev",
    hash: "f528e54765020578f7174ec09690e7166feda47d938cb7d2b253044d3108a036",
  },
];
// keys:end
