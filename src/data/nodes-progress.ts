import AsyncStorage from "@react-native-async-storage/async-storage";
import { NODES_PROGRESS_STORAGE_KEY } from "./storage-keys";
import {
  QUOTE_COUNT,
  TAO_CHAPTER_COUNT,
  type CollectibleReward,
} from "./collectibles";
import {
  getNodeDefinition,
  getUnlockedNodePaths,
  NODE_DEFINITIONS,
  NODES_BY_PATH,
  NODES_START_PATH,
} from "./nodes-map";

const NODES_PROGRESS_VERSION = 2;

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

export type NodesProgress = {
  version: number;
  lastPlayedPath: string;
  winsByPath: Record<string, number>;
  collectedTaoIds: number[];
  collectedQuoteIds: number[];
  lastResultSessionIds: Record<string, string>;
  /** Unused "skip this game and mark it won" tokens, granted by the rare
   * travelling UFO on the nodes map. */
  mercySkipCount: number;
  /** Total collectibles owned when a mercy skip was last used, or null if
   * one has never been used. Gates the UFO from reappearing until the player
   * has collected several more since. */
  mercySkipCollectibleCheckpoint: number | null;
};

export type NodesWinResult = {
  progress: NodesProgress;
  awardedReward?: CollectibleReward;
  newlyUnlockedPaths: string[];
  duplicate: boolean;
};

export type NodesMercySkipResult = {
  progress: NodesProgress;
  newlyUnlockedPaths: string[];
  applied: boolean;
};

export const DEFAULT_NODES_PROGRESS: NodesProgress = {
  version: NODES_PROGRESS_VERSION,
  lastPlayedPath: NODES_START_PATH,
  winsByPath: {},
  collectedTaoIds: [],
  collectedQuoteIds: [],
  lastResultSessionIds: {},
  mercySkipCount: 0,
  mercySkipCollectibleCheckpoint: null,
};

function createDefaultNodesProgress(): NodesProgress {
  return {
    ...DEFAULT_NODES_PROGRESS,
    winsByPath: {},
    collectedTaoIds: [],
    collectedQuoteIds: [],
    lastResultSessionIds: {},
  };
}

type NodesProgressListener = (progress: NodesProgress) => void;

const listeners = new Set<NodesProgressListener>();
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

function validPathRecord<T>(
  value: unknown,
  isValidValue: (entry: unknown) => entry is T,
) {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      ([path, entry]) => NODES_BY_PATH.has(path) && isValidValue(entry),
    ),
  ) as Record<string, T>;
}

function normalizeNodesProgress(value: unknown): NodesProgress {
  const parsed = value && typeof value === "object" ? value : {};
  const candidate = parsed as Partial<NodesProgress>;

  return {
    version: NODES_PROGRESS_VERSION,
    lastPlayedPath:
      typeof candidate.lastPlayedPath === "string" &&
      NODES_BY_PATH.has(candidate.lastPlayedPath)
        ? candidate.lastPlayedPath
        : NODES_START_PATH,
    winsByPath: validPathRecord(
      candidate.winsByPath,
      (entry): entry is number =>
        typeof entry === "number" && Number.isInteger(entry) && entry > 0,
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

export async function loadNodesProgress() {
  const raw = await AsyncStorage.getItem(NODES_PROGRESS_STORAGE_KEY);
  if (!raw) return createDefaultNodesProgress();
  try {
    return normalizeNodesProgress(JSON.parse(raw));
  } catch {
    return createDefaultNodesProgress();
  }
}

async function mutateNodesProgress<T>(
  mutation: (progress: NodesProgress) => T | Promise<T>,
) {
  const queuedMutation = writeQueue.then(async () => {
    const progress = await loadNodesProgress();
    const result = await mutation(progress);
    await AsyncStorage.setItem(
      NODES_PROGRESS_STORAGE_KEY,
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

export function subscribeToNodesProgress(listener: NodesProgressListener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function setLastPlayedNode(path: string) {
  if (!NODES_BY_PATH.has(path)) return;
  await mutateNodesProgress((progress) => {
    progress.lastPlayedPath = path;
  });
}

export async function recordNodesWin(
  path: string,
  sessionId: string | undefined,
): Promise<NodesWinResult> {
  const node = getNodeDefinition(path);
  if (!node) {
    const progress = await loadNodesProgress();
    return { progress, newlyUnlockedPaths: [], duplicate: false };
  }

  return mutateNodesProgress((progress): NodesWinResult => {
    if (sessionId && progress.lastResultSessionIds[path] === sessionId) {
      return { progress, newlyUnlockedPaths: [], duplicate: true };
    }

    const wonPaths = new Set(Object.keys(progress.winsByPath));
    if (!getUnlockedNodePaths(wonPaths).has(path)) {
      return { progress, newlyUnlockedPaths: [], duplicate: false };
    }

    const collectedTaoIds = new Set(progress.collectedTaoIds);
    const collectedQuoteIds = new Set(progress.collectedQuoteIds);
    const awardedReward = node.rewards.find((reward) =>
      reward.type === "tao"
        ? !collectedTaoIds.has(reward.id)
        : !collectedQuoteIds.has(reward.id),
    );

    const unlockedPathsBeforeWin = getUnlockedNodePaths(wonPaths);
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

    const unlockedPathsAfterWin = getUnlockedNodePaths(
      new Set(Object.keys(progress.winsByPath)),
    );
    const newlyUnlockedPaths = [...unlockedPathsAfterWin].filter(
      (unlockedPath) => !unlockedPathsBeforeWin.has(unlockedPath),
    );

    return { progress, awardedReward, newlyUnlockedPaths, duplicate: false };
  });
}

/**
 * Marks a reachable, not-yet-won node as won using a mercy skip: unlocks its
 * neighbours exactly like a real win, but never awards a collectible and
 * never touches `lastResultSessionIds` (no play session took place).
 */
export async function spendMercySkip(
  path: string,
): Promise<NodesMercySkipResult> {
  const node = getNodeDefinition(path);
  if (!node) {
    const progress = await loadNodesProgress();
    return { progress, newlyUnlockedPaths: [], applied: false };
  }

  return mutateNodesProgress((progress): NodesMercySkipResult => {
    if (progress.mercySkipCount <= 0 || progress.winsByPath[path]) {
      return { progress, newlyUnlockedPaths: [], applied: false };
    }

    const wonPaths = new Set(Object.keys(progress.winsByPath));
    if (!getUnlockedNodePaths(wonPaths).has(path)) {
      return { progress, newlyUnlockedPaths: [], applied: false };
    }

    const unlockedPathsBeforeSkip = getUnlockedNodePaths(wonPaths);
    progress.winsByPath[path] = 1;
    progress.lastPlayedPath = path;
    progress.mercySkipCount -= 1;
    progress.mercySkipCollectibleCheckpoint =
      progress.collectedTaoIds.length + progress.collectedQuoteIds.length;

    const unlockedPathsAfterSkip = getUnlockedNodePaths(
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
  return mutateNodesProgress((progress) => {
    progress.mercySkipCount += 1;
    return progress;
  });
}

export async function resetNodesProgress() {
  await mutateNodesProgress((progress) => {
    Object.assign(progress, createDefaultNodesProgress());
  });
}

export async function populateTestNodesProgress() {
  await mutateNodesProgress((progress) => {
    const queuedPaths = [NODES_START_PATH];
    const visitedPaths = new Set<string>();
    const progressedNodes = [];

    while (queuedPaths.length > 0 && progressedNodes.length < 24) {
      const path = queuedPaths.shift()!;
      if (visitedPaths.has(path)) continue;
      visitedPaths.add(path);

      const node = getNodeDefinition(path);
      if (!node) continue;
      progressedNodes.push(node);
      node.connections.forEach((connection) => {
        if (!visitedPaths.has(connection)) queuedPaths.push(connection);
      });
    }

    const winsByPath: Record<string, number> = {};
    const collectedTaoIds = new Set<number>();
    const collectedQuoteIds = new Set<number>();

    progressedNodes.forEach((node, index) => {
      const isPartial = index % 2 === 1 && node.rewards.length > 1;
      const awardedRewards = isPartial
        ? node.rewards.slice(0, 1)
        : node.rewards;
      winsByPath[node.path] = awardedRewards.length;

      awardedRewards.forEach((reward) => {
        if (reward.type === "tao") collectedTaoIds.add(reward.id);
        else collectedQuoteIds.add(reward.id);
      });
    });

    Object.assign(progress, {
      version: NODES_PROGRESS_VERSION,
      lastPlayedPath:
        progressedNodes.at(-1)?.path ??
        NODE_DEFINITIONS[0]?.path ??
        NODES_START_PATH,
      winsByPath,
      collectedTaoIds: [...collectedTaoIds].sort((left, right) => left - right),
      collectedQuoteIds: [...collectedQuoteIds].sort(
        (left, right) => left - right,
      ),
      lastResultSessionIds: {},
    });
  });
}
