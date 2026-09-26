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
import { currentGamePath } from "./game-variants";

const CAMPAIGN_PROGRESS_VERSION = 2;

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

export type CampaignProgress = {
  version: number;
  lastPlayedPath: string;
  winsByPath: Record<string, number>;
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

  return {
    version: CAMPAIGN_PROGRESS_VERSION,
    lastPlayedPath:
      typeof candidate.lastPlayedPath === "string" &&
      GAME_DOTS_BY_PATH.has(currentGamePath(candidate.lastPlayedPath))
        ? currentGamePath(candidate.lastPlayedPath)
        : CAMPAIGN_START_PATH,
    winsByPath: validPathRecord(
      candidate.winsByPath,
      (entry): entry is number =>
        typeof entry === "number" && Number.isInteger(entry) && entry > 0,
      (current, moved) => current + moved,
    ),
    collectedTaoIds: validIds(candidate.collectedTaoIds, TAO_CHAPTER_COUNT),
    collectedQuoteIds: validIds(
      candidate.version === 1
        ? migrateV1QuoteIds(candidate.collectedQuoteIds)
        : candidate.collectedQuoteIds,
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
    if (!getUnlockedGameDotPaths(wonPaths).has(path)) {
      return { progress, newlyUnlockedPaths: [], duplicate: false };
    }

    const collectedTaoIds = new Set(progress.collectedTaoIds);
    const collectedQuoteIds = new Set(progress.collectedQuoteIds);
    const awardedReward = gameDot.rewards.find((reward) =>
      reward.type === "tao"
        ? !collectedTaoIds.has(reward.id)
        : !collectedQuoteIds.has(reward.id),
    );

    const unlockedPathsBeforeWin = getUnlockedGameDotPaths(wonPaths);
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

    const unlockedPathsAfterWin = getUnlockedGameDotPaths(
      new Set(Object.keys(progress.winsByPath)),
    );
    const newlyUnlockedPaths = [...unlockedPathsAfterWin].filter(
      (unlockedPath) => !unlockedPathsBeforeWin.has(unlockedPath),
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
    if (!getUnlockedGameDotPaths(wonPaths).has(path)) {
      return { progress, newlyUnlockedPaths: [], applied: false };
    }

    const unlockedPathsBeforeSkip = getUnlockedGameDotPaths(wonPaths);
    progress.winsByPath[path] = 1;
    progress.lastPlayedPath = path;
    progress.mercySkipCount -= 1;
    progress.mercySkipCollectibleCheckpoint =
      progress.collectedTaoIds.length + progress.collectedQuoteIds.length;

    const unlockedPathsAfterSkip = getUnlockedGameDotPaths(
      new Set(Object.keys(progress.winsByPath)),
    );
    const newlyUnlockedPaths = [...unlockedPathsAfterSkip].filter(
      (unlockedPath) => !unlockedPathsBeforeSkip.has(unlockedPath),
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
      collectedTaoIds: [...collectedTaoIds].sort((left, right) => left - right),
      collectedQuoteIds: [...collectedQuoteIds].sort(
        (left, right) => left - right,
      ),
      lastResultSessionIds: {},
    });
  });
}
