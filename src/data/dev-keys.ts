/**
 * Developer keys: each one's fingerprint, never the key itself, with who it
 * was for. A developer key lets dev mode be turned on outside a local run.
 * Written by `npm run keys:add` and `npm run keys:remove`
 * (scripts/dev-keys.mjs); see docs/dev-keys.md.
 *
 * Removing a key stops it working wherever it was entered, at the next start.
 */
export type DevKey = {
  label: string;
  /** sha256Hex(DEV_KEY_SALT + the key, normalised). */
  hash: string;
};

/**
 * Unchanged from when these were the Odyssey's unlock keys, so keys already
 * made and entered still work.
 */
export const DEV_KEY_SALT = "solitarius-unlock-v1:";

// The list between these markers is rewritten by scripts/dev-keys.mjs.
// keys:begin
export const DEV_KEYS: DevKey[] = [
  {
    label: "James",
    hash: "f528e54765020578f7174ec09690e7166feda47d938cb7d2b253044d3108a036",
  },
];
// keys:end
