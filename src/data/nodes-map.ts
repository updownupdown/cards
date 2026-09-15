import {
  QUOTE_COUNT,
  TAO_CHAPTER_COUNT,
  validateCollectibleCatalogs,
  type CollectibleReward,
} from "./collectibles";
import { GAME_DEFINITIONS } from "./games-registry";
import { NODE_DEFINITIONS } from "./nodes-map.generated";

export const NODES_START_PATH = "/klondike";

export type NodeDefinition = {
  path: string;
  x: number;
  y: number;
  connections: string[];
  rewards: CollectibleReward[];
};

export type NodeVisualState = "locked" | "connected" | "won" | "complete";

export const NODES_BY_PATH = new Map(
  NODE_DEFINITIONS.map((node) => [node.path, node]),
);

export function getNodeDefinition(path: string) {
  return NODES_BY_PATH.get(path);
}

export function getUnlockedNodePaths(wonPaths: ReadonlySet<string>) {
  const unlocked = new Set<string>([NODES_START_PATH]);
  for (const wonPath of wonPaths) {
    const node = NODES_BY_PATH.get(wonPath);
    if (!node) continue;
    unlocked.add(wonPath);
    node.connections.forEach((path) => unlocked.add(path));
  }
  return unlocked;
}

export function getNodeVisualState(
  node: NodeDefinition,
  wonPaths: ReadonlySet<string>,
  collectedTaoIds: ReadonlySet<number>,
  collectedQuoteIds: ReadonlySet<number>,
  unlockedPaths = getUnlockedNodePaths(wonPaths),
): NodeVisualState {
  if (!unlockedPaths.has(node.path)) return "locked";
  if (!wonPaths.has(node.path)) return "connected";

  const hasAllRewards = node.rewards.every((reward) =>
    reward.type === "tao"
      ? collectedTaoIds.has(reward.id)
      : collectedQuoteIds.has(reward.id),
  );
  return hasAllRewards ? "complete" : "won";
}

export function validateNodesMap() {
  const errors: string[] = [...validateCollectibleCatalogs()];
  const gamePaths = new Set(GAME_DEFINITIONS.map((game) => game.path));
  const nodePaths = new Set<string>();
  const taoIds = new Set<number>();
  const quoteIds = new Set<number>();

  for (const node of NODE_DEFINITIONS) {
    if (nodePaths.has(node.path)) errors.push(`Duplicate node ${node.path}.`);
    nodePaths.add(node.path);
    if (!gamePaths.has(node.path)) errors.push(`Unknown game ${node.path}.`);
    if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) {
      errors.push(`Invalid coordinates for ${node.path}.`);
    }
    if (node.connections.length < 2 || node.connections.length > 5) {
      errors.push(`${node.path} must have 2 to 5 connections.`);
    }
    if (node.rewards.length < 2 || node.rewards.length > 4) {
      errors.push(`${node.path} must have 2 to 4 rewards.`);
    }

    for (const reward of node.rewards) {
      const ids = reward.type === "tao" ? taoIds : quoteIds;
      const maxId = reward.type === "tao" ? TAO_CHAPTER_COUNT : QUOTE_COUNT;
      if (!Number.isInteger(reward.id) || reward.id < 1 || reward.id > maxId) {
        errors.push(`${node.path} has an unknown ${reward.type} ${reward.id}.`);
      }
      if (ids.has(reward.id)) {
        errors.push(`Duplicate ${reward.type} reward ${reward.id}.`);
      }
      ids.add(reward.id);
    }

    for (const connection of node.connections) {
      const connectedNode = NODES_BY_PATH.get(connection);
      if (!connectedNode) {
        errors.push(`${node.path} connects to unknown node ${connection}.`);
      } else if (!connectedNode.connections.includes(node.path)) {
        errors.push(`${node.path} -> ${connection} is not symmetric.`);
      }
    }
  }

  for (const gamePath of gamePaths) {
    if (!nodePaths.has(gamePath)) errors.push(`Missing node for ${gamePath}.`);
  }
  const nearestDistances = NODE_DEFINITIONS.map((node) =>
    Math.min(
      ...NODE_DEFINITIONS.filter(
        (candidate) => candidate.path !== node.path,
      ).map((candidate) =>
        Math.hypot(node.x - candidate.x, node.y - candidate.y),
      ),
    ),
  );
  const minimumSpacing = Math.min(...nearestDistances);
  const maximumSpacing = Math.max(...nearestDistances);
  if (minimumSpacing < 0.094) {
    errors.push(`Node spacing ${minimumSpacing.toFixed(4)} permits overlap.`);
  }
  if (maximumSpacing / minimumSpacing < 2.2) {
    errors.push(
      `Nearest-node spacing ratio ${(maximumSpacing / minimumSpacing).toFixed(2)} is too uniform.`,
    );
  }
  if (maximumSpacing / minimumSpacing > 3) {
    errors.push(
      `Nearest-node spacing ratio ${(maximumSpacing / minimumSpacing).toFixed(2)} exceeds 3.`,
    );
  }

  const visited = new Set<string>();
  const pending = [NODES_START_PATH];
  while (pending.length > 0) {
    const path = pending.pop()!;
    if (visited.has(path)) continue;
    visited.add(path);
    NODES_BY_PATH.get(path)?.connections.forEach((connection) => {
      if (!visited.has(connection)) pending.push(connection);
    });
  }
  if (visited.size !== NODE_DEFINITIONS.length) {
    errors.push(
      `Node graph is disconnected: reached ${visited.size}/${NODE_DEFINITIONS.length}.`,
    );
  }

  for (const blockedNode of NODE_DEFINITIONS) {
    const reachable = new Set<string>();
    const pendingWithoutBlocked = [
      blockedNode.path === NODES_START_PATH
        ? NODE_DEFINITIONS.find((node) => node.path !== blockedNode.path)?.path
        : NODES_START_PATH,
    ].filter((path): path is string => !!path);

    while (pendingWithoutBlocked.length > 0) {
      const path = pendingWithoutBlocked.pop()!;
      if (path === blockedNode.path || reachable.has(path)) continue;
      reachable.add(path);
      NODES_BY_PATH.get(path)?.connections.forEach((connection) => {
        if (connection !== blockedNode.path && !reachable.has(connection)) {
          pendingWithoutBlocked.push(connection);
        }
      });
    }

    if (reachable.size !== NODE_DEFINITIONS.length - 1) {
      errors.push(
        `${blockedNode.path} is a progression bottleneck: removing it leaves ${reachable.size}/${NODE_DEFINITIONS.length - 1} nodes reachable.`,
      );
    }
  }

  return errors;
}

if (__DEV__) {
  const errors = validateNodesMap();
  if (errors.length > 0) {
    throw new Error(`Invalid Nodes map:\n${errors.join("\n")}`);
  }
}

export { NODE_DEFINITIONS };
