import {
  QUOTE_COUNT,
  TAO_CHAPTER_COUNT,
  validateCollectibleCatalogs,
  type CollectibleReward,
} from "./collectibles";
import { GAME_DEFINITIONS } from "./games-registry";
import { ARM_DUST, NODE_DEFINITIONS } from "./nodes-map.generated";

export const NODES_START_PATH = "/klondike";

export type NodeDefinition = {
  path: string;
  x: number;
  y: number;
  /** Which spiral arm this node sits on, or null for a field star between
   *  them. Two nodes sharing an arm are drawn as one of its thick strands. */
  arm: number | null;
  connections: string[];
  rewards: CollectibleReward[];
};

/**
 * The map's geometry, which must stay in step with the same names in
 * scripts/generate-nodes-map.mjs; a test asserts the two agree.
 */
export const MAP_GEOMETRY = {
  worldSize: 1800,
  /** NODE_SIZE * the largest STATE_SIZE_MULTIPLIER in NodesMap. */
  nodeDotDiameter: 18 * 1.2,
  /** Node centres stay at least this many dot-diameters apart. */
  minSpacingInDots: 3,
  /** Most links one node may hold. */
  maxConnections: 6,
  minRewards: 2,
  maxRewards: 3,
  /**
   * No single game may lock more than this share of the map behind it. The
   * map is not required to survive losing any node (arms are chains, so a
   * mid-arm game always gates the rest of its arm), only to keep any one
   * blockage small enough that there is still plenty else to play.
   */
  maxGatedShare: 0.2,
} as const;

/** The minimum gap between two node centres, in map units. */
export const MIN_NODE_SPACING =
  (MAP_GEOMETRY.minSpacingInDots * MAP_GEOMETRY.nodeDotDiameter) /
  (MAP_GEOMETRY.worldSize / 2);

/** A speck of decorative dust: x, y, tint index, opacity. */
export type ArmDust = [number, number, number, number];

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
  // Local-only games are still in development and are left off the map, so
  // they are not reported as missing nodes.
  const mappedGamePaths = new Set(
    GAME_DEFINITIONS.filter((game) => !game.enabledOnLocalOnly).map(
      (game) => game.path,
    ),
  );
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
    if (
      node.connections.length < 1 ||
      node.connections.length > MAP_GEOMETRY.maxConnections
    ) {
      errors.push(
        `${node.path} must have 1 to ${MAP_GEOMETRY.maxConnections} connections.`,
      );
    }
    if (
      node.rewards.length < MAP_GEOMETRY.minRewards ||
      node.rewards.length > MAP_GEOMETRY.maxRewards
    ) {
      errors.push(
        `${node.path} must have ${MAP_GEOMETRY.minRewards} to ${MAP_GEOMETRY.maxRewards} rewards.`,
      );
    }
    if (node.arm !== null && !Number.isInteger(node.arm)) {
      errors.push(`${node.path} has an invalid arm ${node.arm}.`);
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

  for (const gamePath of mappedGamePaths) {
    if (!nodePaths.has(gamePath)) errors.push(`Missing node for ${gamePath}.`);
  }
  const closestPair = Math.min(
    ...NODE_DEFINITIONS.map((node) =>
      Math.min(
        ...NODE_DEFINITIONS.filter(
          (candidate) => candidate.path !== node.path,
        ).map((candidate) =>
          Math.hypot(node.x - candidate.x, node.y - candidate.y),
        ),
      ),
    ),
  );
  if (closestPair < MIN_NODE_SPACING) {
    errors.push(
      `Closest node pair ${closestPair.toFixed(4)} is under the ${MIN_NODE_SPACING.toFixed(4)} minimum, so the dots would crowd.`,
    );
  }

  // Every Tao chapter has to be collectable somewhere. Quotes deliberately
  // are not: the pool is larger than the map needs.
  for (let id = 1; id <= TAO_CHAPTER_COUNT; id += 1) {
    if (!taoIds.has(id)) errors.push(`Tao chapter ${id} is not awarded.`);
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

  // A game nobody can beat should not shut off the rest of the galaxy. Arms
  // are chains, so some gating is unavoidable and expected; what matters is
  // that no single game holds back a large share of the map.
  const gateLimit = Math.ceil(NODE_DEFINITIONS.length * MAP_GEOMETRY.maxGatedShare);
  for (const blockedNode of NODE_DEFINITIONS) {
    if (blockedNode.path === NODES_START_PATH) continue;
    const reachable = new Set<string>();
    const queue = [NODES_START_PATH];
    while (queue.length > 0) {
      const path = queue.pop()!;
      if (path === blockedNode.path || reachable.has(path)) continue;
      reachable.add(path);
      NODES_BY_PATH.get(path)?.connections.forEach((connection) => {
        if (connection !== blockedNode.path && !reachable.has(connection)) {
          queue.push(connection);
        }
      });
    }

    const gated = NODE_DEFINITIONS.length - 1 - reachable.size;
    if (gated > gateLimit) {
      errors.push(
        `${blockedNode.path} gates ${gated} games, over the ${gateLimit} allowed.`,
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

export { ARM_DUST, NODE_DEFINITIONS };
