// Backups of a player's saved data, to move it between browsers and devices
// (Safari and the installed web app keep separate storage, as do two phones):
// a .json file to save and open, or the same thing as a code to copy and paste.
//
// A backup holds the raw stored strings under each kept key, so it goes back
// through the same loaders (and their migrations) as the player's own data.
// Restoring replaces every kept key, then the page reloads, so no in-memory
// cache can write the old data back.
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  GAME_SESSION_STORAGE_KEY,
  GAME_SETTINGS_STORAGE_KEY,
  RECENT_GAMES_STORAGE_KEY,
} from "./game-menu";
import { DAILY_WINS_STORAGE_KEY } from "./game-of-the-day";
import {
  AUTOPILOT_SESSIONS_STORAGE_KEY,
  CAMPAIGN_PROGRESS_STORAGE_KEY,
  EARNED_ACHIEVEMENTS_STORAGE_KEY,
  GALLERY_LAST_CHAPTER_STORAGE_KEY,
  GALLERY_LAST_QUOTE_STORAGE_KEY,
  GLOBAL_SETTINGS_STORAGE_KEY,
  HINT_BUTTON_STORAGE_KEY,
  HINT_INTRO_STORAGE_KEY,
  MOMENTS_STORAGE_KEY,
  SWIPE_DISMISS_STORAGE_KEY,
} from "./storage-keys";

export const BACKUP_APP = "solitarius";
/** Raised when a backup's shape changes; older ones must still restore. */
export const BACKUP_FORMAT = 1;
/** Starts every backup code, so a stray paste is easy to tell apart. */
export const BACKUP_CODE_PREFIX = "SOLITARIUS1:";
/** The same, for a code whose JSON is gzipped. */
export const BACKUP_CODE_PREFIX_GZIP = "SOLITARIUS1Z:";
/** Far beyond any real save; stops a wrong file being read into memory. */
export const MAX_BACKUP_CHARS = 5_000_000;

/** Stored as JSON; anything else is a plain string. */
const JSON_KEYS = new Set<string>([
  GLOBAL_SETTINGS_STORAGE_KEY,
  GAME_SETTINGS_STORAGE_KEY,
  RECENT_GAMES_STORAGE_KEY,
  GAME_SESSION_STORAGE_KEY,
  CAMPAIGN_PROGRESS_STORAGE_KEY,
  AUTOPILOT_SESSIONS_STORAGE_KEY,
  EARNED_ACHIEVEMENTS_STORAGE_KEY,
  MOMENTS_STORAGE_KEY,
  DAILY_WINS_STORAGE_KEY,
]);

/** What a backup carries: everything the player would miss. */
export const BACKUP_KEYS: readonly string[] = [
  GLOBAL_SETTINGS_STORAGE_KEY,
  GAME_SETTINGS_STORAGE_KEY,
  RECENT_GAMES_STORAGE_KEY,
  GAME_SESSION_STORAGE_KEY,
  CAMPAIGN_PROGRESS_STORAGE_KEY,
  AUTOPILOT_SESSIONS_STORAGE_KEY,
  EARNED_ACHIEVEMENTS_STORAGE_KEY,
  MOMENTS_STORAGE_KEY,
  DAILY_WINS_STORAGE_KEY,
  GALLERY_LAST_CHAPTER_STORAGE_KEY,
  GALLERY_LAST_QUOTE_STORAGE_KEY,
  HINT_BUTTON_STORAGE_KEY,
  HINT_INTRO_STORAGE_KEY,
  SWIPE_DISMISS_STORAGE_KEY,
];

/**
 * Stored keys a backup leaves out, each for a reason. Every pinned key is in
 * one list or the other (save-transfer.test.ts), so a new key gets a choice.
 */
export const BACKUP_SKIPPED_KEYS: Readonly<Record<string, string>> = {
  "cards.devMode.v1": "a developer's switch, kept to the device",
  "cards.gameLaunchGuard.v1": "the crash guard of the launch in progress",
  "cards.wildCards.v1": "retired",
  "cards.betaGames.v1": "retired",
  "cards.odysseyUnlock.v1": "retired",
  "cards.storeReviewPrompted.v1": "retired",
};

export type Backup = {
  app: typeof BACKUP_APP;
  format: number;
  /** ISO time it was made. */
  exportedAt: string;
  /** Stored strings by key; only BACKUP_KEYS. */
  data: Record<string, string>;
};

export type BackupSummary = {
  exportedAt: Date | null;
  wins: number;
  gamesWon: number;
  quotes: number;
  taoChapters: number;
};

export type BackupError = "notBackup" | "newer" | "damaged";

export type ParsedBackup =
  | { ok: true; backup: Backup }
  | { ok: false; error: BackupError };

// ── Making one ──────────────────────────────────────────────────────────────

export function buildBackup(
  stored: Record<string, string | null | undefined>,
  now = new Date(),
): Backup {
  const data: Record<string, string> = {};
  BACKUP_KEYS.forEach((key) => {
    const value = stored[key];
    if (typeof value === "string" && value !== "") data[key] = value;
  });
  return {
    app: BACKUP_APP,
    format: BACKUP_FORMAT,
    exportedAt: now.toISOString(),
    data,
  };
}

export async function readBackup(): Promise<Backup> {
  const entries = await AsyncStorage.multiGet([...BACKUP_KEYS]);
  return buildBackup(Object.fromEntries(entries));
}

export const backupToJson = (backup: Backup) => JSON.stringify(backup);

export function backupFileName(backup: Backup) {
  return `solitarius-backup-${backup.exportedAt.slice(0, 10)}.json`;
}

// ── Codes ───────────────────────────────────────────────────────────────────

function utf8ToBase64(text: string) {
  return bytesToBase64(new TextEncoder().encode(text));
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

function base64ToBytes(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

const canGzip = () =>
  typeof CompressionStream !== "undefined" &&
  typeof DecompressionStream !== "undefined" &&
  typeof Response !== "undefined";

async function pipeThrough(
  bytes: Uint8Array,
  stream: CompressionStream | DecompressionStream,
) {
  const piped = new Blob([bytes as BlobPart]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(piped).arrayBuffer());
}

/** The backup as one line to copy: gzipped where the browser can. */
export async function backupToCode(backup: Backup) {
  const json = backupToJson(backup);
  if (canGzip()) {
    try {
      const zipped = await pipeThrough(
        new TextEncoder().encode(json),
        new CompressionStream("gzip"),
      );
      return BACKUP_CODE_PREFIX_GZIP + bytesToBase64(zipped);
    } catch {
      // Fall through to the plain code.
    }
  }
  return BACKUP_CODE_PREFIX + utf8ToBase64(json);
}

// ── Reading one ─────────────────────────────────────────────────────────────

/** The JSON inside a pasted code or an opened file; null if it isn't one. */
async function unwrapText(text: string): Promise<string | null> {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) return trimmed;
  // Pasting can break a long code across lines.
  const compact = trimmed.replace(/\s+/g, "");
  const zipped = compact.startsWith(BACKUP_CODE_PREFIX_GZIP);
  const prefix = zipped ? BACKUP_CODE_PREFIX_GZIP : BACKUP_CODE_PREFIX;
  if (!compact.startsWith(prefix)) return null;
  const bytes = base64ToBytes(compact.slice(prefix.length));
  if (!zipped) return new TextDecoder().decode(bytes);
  if (!canGzip()) throw new Error("no gzip");
  return new TextDecoder().decode(
    await pipeThrough(bytes, new DecompressionStream("gzip")),
  );
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Reads a backup file or code. Only kept keys are taken, and each must hold
 * what its loader expects to parse, so a restore can't leave junk behind.
 */
export async function parseBackup(text: string): Promise<ParsedBackup> {
  if (text.length > MAX_BACKUP_CHARS) return { ok: false, error: "notBackup" };

  let json: string | null;
  try {
    json = await unwrapText(text);
  } catch {
    // A code cut short, or mistyped.
    return { ok: false, error: "damaged" };
  }
  if (json === null) return { ok: false, error: "notBackup" };

  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    return { ok: false, error: "damaged" };
  }
  if (!isRecord(value) || value.app !== BACKUP_APP) {
    return { ok: false, error: "notBackup" };
  }
  if (typeof value.format !== "number" || !Number.isInteger(value.format)) {
    return { ok: false, error: "damaged" };
  }
  if (value.format > BACKUP_FORMAT) return { ok: false, error: "newer" };
  if (!isRecord(value.data)) return { ok: false, error: "damaged" };

  const data: Record<string, string> = {};
  for (const key of BACKUP_KEYS) {
    const stored = value.data[key];
    if (stored === undefined) continue;
    if (typeof stored !== "string") return { ok: false, error: "damaged" };
    if (JSON_KEYS.has(key)) {
      try {
        JSON.parse(stored);
      } catch {
        return { ok: false, error: "damaged" };
      }
    }
    data[key] = stored;
  }

  // Settings and stats are the least a real save has.
  if (Object.keys(data).length === 0) return { ok: false, error: "damaged" };

  return {
    ok: true,
    backup: {
      app: BACKUP_APP,
      format: value.format,
      exportedAt: typeof value.exportedAt === "string" ? value.exportedAt : "",
      data,
    },
  };
}

function parseStored(backup: Backup, key: string): unknown {
  try {
    return JSON.parse(backup.data[key] ?? "null");
  } catch {
    return null;
  }
}

const countOf = (value: unknown) => (Array.isArray(value) ? value.length : 0);

/** What the player is about to restore, to show before they agree. */
export function summarizeBackup(backup: Backup): BackupSummary {
  const exportedAt = new Date(backup.exportedAt);
  let wins = 0;
  let gamesWon = 0;
  const games = parseStored(backup, GAME_SETTINGS_STORAGE_KEY);
  if (isRecord(games)) {
    Object.values(games).forEach((game) => {
      const won =
        isRecord(game) && isRecord(game.stats) ? game.stats.wins : null;
      if (typeof won === "number" && won > 0) {
        wins += won;
        gamesWon += 1;
      }
    });
  }
  const campaign = parseStored(backup, CAMPAIGN_PROGRESS_STORAGE_KEY);
  return {
    exportedAt: Number.isNaN(exportedAt.getTime()) ? null : exportedAt,
    wins,
    gamesWon,
    quotes: isRecord(campaign) ? countOf(campaign.collectedQuoteIds) : 0,
    taoChapters: isRecord(campaign) ? countOf(campaign.collectedTaoIds) : 0,
  };
}

// ── Restoring ───────────────────────────────────────────────────────────────

/**
 * Replaces the player's data with the backup's: kept keys it doesn't hold are
 * cleared, as on a fresh install. The caller reloads the app straight after.
 */
export async function writeBackup(backup: Backup) {
  const missing = BACKUP_KEYS.filter((key) => !(key in backup.data));
  await AsyncStorage.multiRemove(missing);
  await AsyncStorage.multiSet(Object.entries(backup.data));
}
