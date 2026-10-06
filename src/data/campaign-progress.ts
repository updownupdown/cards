import AsyncStorage from "@react-native-async-storage/async-storage";
import { CAMPAIGN_PROGRESS_STORAGE_KEY } from "./storage-keys";
import {
  QUOTE_COUNT,
  TAO_CHAPTER_COUNT,
  type CollectibleReward,
} from "./collectibles";
import {
  getGameDotDefinition,
  getUnlockedGameDotPaths,
  GAME_DOT_DEFINITIONS,
  GAME_DOTS_BY_PATH,
  CAMPAIGN_START_PATH,
} from "./campaign-map";
// Straight from the generated file: campaign-map is still loading when a
// game's own imports reach this module first.
import { GAME_DOT_DEFINITIONS as ALL_GAME_DOT_DEFINITIONS } from "./campaign-map.generated";
import { getV3Neighbours } from "./campaign-map.v3";
import { currentGamePath } from "./game-variants";

const CAMPAIGN_PROGRESS_VERSION = 4;

// Version 2 cut the quotes to three 52-card decks: these version 1 quotes were
// dropped, and the quotes after them moved down to close the gaps.
const V1_REMOVED_QUOTE_IDS = [
  115, 132, 136, 140, 143, 145, 150, 156, 157, 161, 164, 165,
];

function migrateV1QuoteIds(value: unknown) {
  if (!Array.isArray(value)) return value;
  return value.flatMap((id) =>
    typeof id !== "number" || V1_REMOVED_QUOTE_IDS.includes(id)
      ? []
      : [id - V1_REMOVED_QUOTE_IDS.filter((removed) => removed < id).length],
  );
}

// Version 3 replaced the quotes with a hand-picked list: only these version 2
// quotes were kept, in this order, as IDs 1 to 66; the quotes after them are
// new, and the rest of version 2's were dropped.
const V2_KEPT_QUOTE_IDS = [
  1, 2, 3, 5, 6, 7, 8, 9, 12, 18, 20, 21, 29, 32, 34, 45, 46, 47, 53, 60, 85,
  91, 92, 93, 94, 95, 100, 102, 105, 108, 110, 111, 112, 113, 114, 116, 117,
  119, 120, 122, 125, 129, 133, 136, 138, 140, 153, 164, 165, 166, 168, 171,
  175, 176, 181, 187, 189, 192, 193, 194, 197, 198, 200, 202, 204, 205,
];

function migrateV2QuoteIds(value: unknown) {
  if (!Array.isArray(value)) return value;
  return value.flatMap((id) => {
    const index = V2_KEPT_QUOTE_IDS.indexOf(id);
    return index === -1 ? [] : [index + 1];
  });
}

function migrateQuoteIds(version: unknown, value: unknown) {
  if (version === 1) return migrateV2QuoteIds(migrateV1QuoteIds(value));
  if (version === 2) return migrateV2QuoteIds(value);
  return value;
}

// Version 4 laid the map out afresh and started keeping `unlockedPaths`.
// Until then, which games were open was worked out from the wins and the
// map's links alone, so a change to the map could lock a game again. Older
// progress is opened against the map it was played on (campaign-map.v3.ts).

/** Every game on the map, whether or not this build shows it. */
const KNOWN_GAME_DOT_PATHS = new Set(
  ALL_GAME_DOT_DEFINITIONS.map((gameDot) => gameDot.path),
);

/**
 * The games a save has open, to be kept open from now on: the ones it lists
 * (or, before version 4, the ones its wins had unlocked on the old map) and
 * the ones its wins unlock on today's map. Games that have since been renamed
 * follow their new path; ones that were removed drop out.
 */
function migrateUnlockedPaths(
  candidate: Partial<CampaignProgress>,
  winsByPath: Record<string, number>,
) {
  const opened = new Set<string>();
  const version = typeof candidate.version === "number" ? candidate.version : 0;
  if (version >= 4) {
    if (Array.isArray(candidate.unlockedPaths)) {
      for (const path of candidate.unlockedPaths) {
        if (typeof path === "string") opened.add(path);
      }
    }
  } else if (candidate.winsByPath && typeof candidate.winsByPath === "object") {
    for (const [wonPath, wins] of Object.entries(candidate.winsByPath)) {
      if (typeof wins !== "number" || !(wins > 0)) continue;
      opened.add(wonPath);
      // The old map knew a game by the path it had then, which may itself
      // have been the new name of an even older one.
      for (const path of [wonPath, currentGamePath(wonPath)]) {
        getV3Neighbours(path).forEach((next) => opened.add(next));
      }
    }
  }

  const current = getUnlockedGameDotPaths(new Set(Object.keys(winsByPath)));
  return [
    ...new Set([
      ...[...opened]
        .map(currentGamePath)
        .filter((path) => KNOWN_GAME_DOT_PATHS.has(path)),
      ...current,
    ]),
  ].sort();
}

export type CampaignProgress = {
  version: number;
  lastPlayedPath: string;
  winsByPath: Record<string, number>;
  /**
   * Every game that has been open to the player. Winning a game opens its
   * neighbours; this keeps them open whatever later happens to the map.
   */
  unlockedPaths: string[];
  collectedTaoIds: number[];
  collectedQuoteIds: number[];
  lastResultSessionIds: Record<string, string>;
  /** Unused "skip this game and mark it won" tokens, granted by the rare
   * travelling UFO on the Campaign map. */
  mercySkipCount: number;
  /** Total collectibles owned when a mercy skip was last used, or null if
   * one has never been used. Gates the UFO from reappearing until the player
   * has collected several more since. */
  mercySkipCollectibleCheckpoint: number | null;
};

export type CampaignWinResult = {
  progress: CampaignProgress;
  awardedReward?: CollectibleReward;
  newlyUnlockedPaths: string[];
  duplicate: boolean;
};

export type CampaignMercySkipResult = {
  progress: CampaignProgress;
  newlyUnlockedPaths: string[];
  applied: boolean;
};

export const DEFAULT_CAMPAIGN_PROGRESS: CampaignProgress = {
  version: CAMPAIGN_PROGRESS_VERSION,
  lastPlayedPath: CAMPAIGN_START_PATH,
  winsByPath: {},
  unlockedPaths: [],
  collectedTaoIds: [],
  collectedQuoteIds: [],
  lastResultSessionIds: {},
  mercySkipCount: 0,
  mercySkipCollectibleCheckpoint: null,
};

function createDefaultCampaignProgress(): CampaignProgress {
  return {
    ...DEFAULT_CAMPAIGN_PROGRESS,
    winsByPath: {},
    unlockedPaths: [],
    collectedTaoIds: [],
    collectedQuoteIds: [],
    lastResultSessionIds: {},
  };
}

type CampaignProgressListener = (progress: CampaignProgress) => void;

const listeners = new Set<CampaignProgressListener>();
let writeQueue: Promise<void> = Promise.resolve();

function validIds(value: unknown, max: number) {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value.filter(
        (id): id is number =>
          Number.isInteger(id) && (id as number) >= 1 && (id as number) <= max,
      ),
    ),
  ].sort((left, right) => left - right);
}

/**
 * Entries for games on the map, with games that were folded into another game
 * or renamed moved to its path; `combine` settles two entries for one path.
 */
function validPathRecord<T>(
  value: unknown,
  isValidValue: (entry: unknown) => entry is T,
  combine: (current: T, moved: T) => T = (current) => current,
) {
  if (!value || typeof value !== "object") return {};
  const record: Record<string, T> = {};
  // Current paths first, so their own entries are the ones kept.
  const entries = Object.entries(value).sort(
    ([left], [right]) =>
      Number(currentGamePath(left) !== left) -
      Number(currentGamePath(right) !== right),
  );
  for (const [oldPath, entry] of entries) {
    const path = currentGamePath(oldPath);
    if (!GAME_DOTS_BY_PATH.has(path) || !isValidValue(entry)) continue;
    record[path] = path in record ? combine(record[path], entry) : entry;
  }
  return record;
}

function normalizeCampaignProgress(value: unknown): CampaignProgress {
  const parsed = value && typeof value === "object" ? value : {};
  const candidate = parsed as Partial<CampaignProgress>;
  const winsByPath = validPathRecord(
    candidate.winsByPath,
    (entry): entry is number =>
      typeof entry === "number" && Number.isInteger(entry) && entry > 0,
    (current, moved) => current + moved,
  );

  return {
    version: CAMPAIGN_PROGRESS_VERSION,
    lastPlayedPath:
      typeof candidate.lastPlayedPath === "string" &&
      GAME_DOTS_BY_PATH.has(currentGamePath(candidate.lastPlayedPath))
        ? currentGamePath(candidate.lastPlayedPath)
        : CAMPAIGN_START_PATH,
    winsByPath,
    unlockedPaths: migrateUnlockedPaths(candidate, winsByPath),
    collectedTaoIds: validIds(candidate.collectedTaoIds, TAO_CHAPTER_COUNT),
    collectedQuoteIds: validIds(
      migrateQuoteIds(candidate.version, candidate.collectedQuoteIds),
      QUOTE_COUNT,
    ),
    lastResultSessionIds: validPathRecord(
      candidate.lastResultSessionIds,
      (entry): entry is string => typeof entry === "string" && entry.length > 0,
    ),
    mercySkipCount:
      typeof candidate.mercySkipCount === "number" &&
      Number.isInteger(candidate.mercySkipCount) &&
      candidate.mercySkipCount >= 0
        ? candidate.mercySkipCount
        : 0,
    mercySkipCollectibleCheckpoint:
      typeof candidate.mercySkipCollectibleCheckpoint === "number" &&
      Number.isInteger(candidate.mercySkipCollectibleCheckpoint)
        ? candidate.mercySkipCollectibleCheckpoint
        : null,
  };
}

export async function loadCampaignProgress() {
  const raw = await AsyncStorage.getItem(CAMPAIGN_PROGRESS_STORAGE_KEY);
  if (!raw) return createDefaultCampaignProgress();
  try {
    return normalizeCampaignProgress(JSON.parse(raw));
  } catch {
    return createDefaultCampaignProgress();
  }
}

async function mutateCampaignProgress<T>(
  mutation: (progress: CampaignProgress) => T | Promise<T>,
) {
  const queuedMutation = writeQueue.then(async () => {
    const progress = await loadCampaignProgress();
    const result = await mutation(progress);
    await AsyncStorage.setItem(
      CAMPAIGN_PROGRESS_STORAGE_KEY,
      JSON.stringify(progress),
    );
    listeners.forEach((listener) => listener(progress));
    return result;
  });

  writeQueue = queuedMutation.then(
    () => undefined,
    () => undefined,
  );
  return queuedMutation;
}

export function subscribeToCampaignProgress(
  listener: CampaignProgressListener,
) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function setLastPlayedGameDot(path: string) {
  if (!GAME_DOTS_BY_PATH.has(path)) return;
  await mutateCampaignProgress((progress) => {
    progress.lastPlayedPath = path;
  });
}

/**
 * After a win or a skip: adds the games it opened to the ones kept open, and
 * returns them.
 */
function openNewlyUnlockedPaths(
  progress: CampaignProgress,
  unlockedBefore: ReadonlySet<string>,
) {
  const unlockedAfter = getUnlockedGameDotPaths(
    new Set(Object.keys(progress.winsByPath)),
    progress.unlockedPaths,
  );
  progress.unlockedPaths = [
    ...new Set([...progress.unlockedPaths, ...unlockedAfter]),
  ].sort();
  return [...unlockedAfter].filter((path) => !unlockedBefore.has(path));
}

export async function recordCampaignWin(
  path: string,
  sessionId: string | undefined,
): Promise<CampaignWinResult> {
  const gameDot = getGameDotDefinition(path);
  if (!gameDot) {
    const progress = await loadCampaignProgress();
    return { progress, newlyUnlockedPaths: [], duplicate: false };
  }

  return mutateCampaignProgress((progress): CampaignWinResult => {
    if (sessionId && progress.lastResultSessionIds[path] === sessionId) {
      return { progress, newlyUnlockedPaths: [], duplicate: true };
    }

    const wonPaths = new Set(Object.keys(progress.winsByPath));
    const unlockedPathsBeforeWin = getUnlockedGameDotPaths(
      wonPaths,
      progress.unlockedPaths,
    );
    if (!unlockedPathsBeforeWin.has(path)) {
      return { progress, newlyUnlockedPaths: [], duplicate: false };
    }

    const collectedTaoIds = new Set(progress.collectedTaoIds);
    const collectedQuoteIds = new Set(progress.collectedQuoteIds);
    const awardedReward = gameDot.rewards.find((reward) =>
      reward.type === "tao"
        ? !collectedTaoIds.has(reward.id)
        : !collectedQuoteIds.has(reward.id),
    );

    progress.winsByPath[path] = (progress.winsByPath[path] ?? 0) + 1;
    progress.lastPlayedPath = path;
    if (sessionId) progress.lastResultSessionIds[path] = sessionId;

    if (awardedReward?.type === "tao") {
      progress.collectedTaoIds = [
        ...progress.collectedTaoIds,
        awardedReward.id,
      ].sort((left, right) => left - right);
    } else if (awardedReward?.type === "quote") {
      progress.collectedQuoteIds = [
        ...progress.collectedQuoteIds,
        awardedReward.id,
      ].sort((left, right) => left - right);
    }

    const newlyUnlockedPaths = openNewlyUnlockedPaths(
      progress,
      unlockedPathsBeforeWin,
    );

    return { progress, awardedReward, newlyUnlockedPaths, duplicate: false };
  });
}

/**
 * Marks a reachable, not-yet-won game dot as won using a mercy skip: unlocks its
 * neighbours exactly like a real win, but never awards a collectible and
 * never touches `lastResultSessionIds` (no play session took place).
 */
export async function spendMercySkip(
  path: string,
): Promise<CampaignMercySkipResult> {
  const gameDot = getGameDotDefinition(path);
  if (!gameDot) {
    const progress = await loadCampaignProgress();
    return { progress, newlyUnlockedPaths: [], applied: false };
  }

  return mutateCampaignProgress((progress): CampaignMercySkipResult => {
    if (progress.mercySkipCount <= 0 || progress.winsByPath[path]) {
      return { progress, newlyUnlockedPaths: [], applied: false };
    }

    const wonPaths = new Set(Object.keys(progress.winsByPath));
    const unlockedPathsBeforeSkip = getUnlockedGameDotPaths(
      wonPaths,
      progress.unlockedPaths,
    );
    if (!unlockedPathsBeforeSkip.has(path)) {
      return { progress, newlyUnlockedPaths: [], applied: false };
    }

    progress.winsByPath[path] = 1;
    progress.lastPlayedPath = path;
    progress.mercySkipCount -= 1;
    progress.mercySkipCollectibleCheckpoint =
      progress.collectedTaoIds.length + progress.collectedQuoteIds.length;

    const newlyUnlockedPaths = openNewlyUnlockedPaths(
      progress,
      unlockedPathsBeforeSkip,
    );

    return { progress, newlyUnlockedPaths, applied: true };
  });
}

/** Grants one mercy skip and records the collectible count at grant time, so
 * the UFO knows not to reappear until several more collectibles are owned. */
export async function grantMercySkip() {
  return mutateCampaignProgress((progress) => {
    progress.mercySkipCount += 1;
    return progress;
  });
}

export async function resetCampaignProgress() {
  await mutateCampaignProgress((progress) => {
    Object.assign(progress, createDefaultCampaignProgress());
  });
}

/** Fills in Campaign progress for testing: wins on `paths`, in order. */
export async function populateTestCampaignProgress(paths: string[]) {
  await mutateCampaignProgress((progress) => {
    const progressedGameDots = paths.flatMap((path) => {
      const gameDot = getGameDotDefinition(path);
      return gameDot ? [gameDot] : [];
    });

    const winsByPath: Record<string, number> = {};
    const collectedTaoIds = new Set<number>();
    const collectedQuoteIds = new Set<number>();

    progressedGameDots.forEach((gameDot, index) => {
      const isPartial = index % 2 === 1 && gameDot.rewards.length > 1;
      const awardedRewards = isPartial
        ? gameDot.rewards.slice(0, 1)
        : gameDot.rewards;
      winsByPath[gameDot.path] = awardedRewards.length;

      awardedRewards.forEach((reward) => {
        if (reward.type === "tao") collectedTaoIds.add(reward.id);
        else collectedQuoteIds.add(reward.id);
      });
    });

    Object.assign(progress, {
      version: CAMPAIGN_PROGRESS_VERSION,
      lastPlayedPath:
        progressedGameDots.at(-1)?.path ??
        GAME_DOT_DEFINITIONS[0]?.path ??
        CAMPAIGN_START_PATH,
      winsByPath,
      unlockedPaths: [
        ...getUnlockedGameDotPaths(new Set(Object.keys(winsByPath))),
      ].sort(),
      collectedTaoIds: [...collectedTaoIds].sort((left, right) => left - right),
      collectedQuoteIds: [...collectedQuoteIds].sort(
        (left, right) => left - right,
      ),
      lastResultSessionIds: {},
    });
  });
}
