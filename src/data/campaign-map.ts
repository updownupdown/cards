import {
  QUOTE_COUNT,
  TAO_CHAPTER_COUNT,
  validateCollectibleCatalogs,
  type CollectibleReward,
} from "./collectibles";
import { GAME_DEFINITIONS } from "./games-registry";
import {
  GAME_DOT_DEFINITIONS as ALL_GAME_DOT_DEFINITIONS,
  HUB_EXTRA_LINKS,
  LAYOUT_FINGERPRINT,
} from "./campaign-map.generated";

export const CAMPAIGN_START_PATH = "/klondike";

export type GameDotDefinition = {
  path: string;
  x: number;
  y: number;
  /** Which spiral arm this game dot sits on, or null for a field star between
   *  them. Two game dots sharing an arm are drawn as one of its thick strands. */
  arm: number | null;
  connections: string[];
  rewards: CollectibleReward[];
  /** Added at the rim after the map was laid out, where there was room. */
  appended?: boolean;
};

/**
 * The map's geometry, which must stay in step with the same names in
 * scripts/generate-campaign-map.mjs; a test asserts the two agree.
 */
export const MAP_GEOMETRY = {
  worldSize: 1800,
  /**
   * The unit game dots are spaced in. Dots were drawn up to this size when
   * the map was laid out; they are smaller now, but the unit stays so the
   * layout (and players' progress on it) stays put.
   */
  gameDotDiameter: 18 * 1.2,
  /** Game dot centres stay at least this many dot-diameters apart. */
  minSpacingInDots: 3,
  /** Most links one game dot may hold. */
  maxConnections: 6,
  minRewards: 2,
  maxRewards: 3,
  /**
   * No single game may lock more than this share of the map behind it. The
   * map is not required to survive losing any game dot (arms are chains, so a
   * mid-arm game always gates the rest of its arm), only to keep any one
   * blockage small enough that there is still plenty else to play.
   */
  maxGatedShare: 0.2,
} as const;

/** The minimum gap between two game dot centres, in map units. */
export const MIN_GAME_DOT_SPACING =
  (MAP_GEOMETRY.minSpacingInDots * MAP_GEOMETRY.gameDotDiameter) /
  (MAP_GEOMETRY.worldSize / 2);

export type GameDotState = "locked" | "connected" | "won" | "complete";

/**
 * The game dots: one for every released game. Local-only games
 * (`enabledOnLocalOnly`) have none, so they can come and go without touching
 * the map or holding any reward.
 */
export const GAME_DOT_DEFINITIONS: GameDotDefinition[] =
  ALL_GAME_DOT_DEFINITIONS;

export const GAME_DOTS_BY_PATH = new Map(
  GAME_DOT_DEFINITIONS.map((gameDot) => [gameDot.path, gameDot]),
);

export function getGameDotDefinition(path: string) {
  return GAME_DOTS_BY_PATH.get(path);
}

const REWARD_SOURCES = new Map(
  GAME_DOT_DEFINITIONS.flatMap((gameDot) =>
    gameDot.rewards.map(
      (reward) => [`${reward.type}:${reward.id}`, gameDot.path] as const,
    ),
  ),
);

/** The game whose Campaign win gives a Tao chapter or a quote. */
export function getRewardSource(reward: CollectibleReward) {
  return REWARD_SOURCES.get(`${reward.type}:${reward.id}`);
}

/**
 * The games a player may play: Klondike, every game won and its neighbours,
 * and every game that was open before (`openedPaths`, kept in the saved
 * progress), so a game never locks again when the map changes.
 */
export function getUnlockedGameDotPaths(
  wonPaths: ReadonlySet<string>,
  openedPaths: Iterable<string> = [],
) {
  const unlocked = new Set<string>([CAMPAIGN_START_PATH]);
  for (const path of openedPaths) {
    if (GAME_DOTS_BY_PATH.has(path)) unlocked.add(path);
  }
  for (const wonPath of wonPaths) {
    const gameDot = GAME_DOTS_BY_PATH.get(wonPath);
    if (!gameDot) continue;
    unlocked.add(wonPath);
    gameDot.connections.forEach((path) => unlocked.add(path));
  }
  return unlocked;
}

const GAMES_BY_PATH = new Map(
  GAME_DEFINITIONS.map((game) => [game.path, game]),
);

/**
 * The games the player can play next on the map: unlocked but not yet won,
 * easiest first.
 */
export function getNextGameDotPaths(
  wonPaths: ReadonlySet<string>,
  unlockedPaths: ReadonlySet<string> = getUnlockedGameDotPaths(wonPaths),
) {
  const effort = (path: string) => {
    const rating = GAMES_BY_PATH.get(path)?.rating;
    return rating ? rating.difficulty + rating.complexity : Infinity;
  };
  return [...unlockedPaths]
    .filter((path) => !wonPaths.has(path))
    .sort((left, right) => effort(left) - effort(right));
}

export function getGameDotState(
  gameDot: GameDotDefinition,
  wonPaths: ReadonlySet<string>,
  collectedTaoIds: ReadonlySet<number>,
  collectedQuoteIds: ReadonlySet<number>,
  unlockedPaths: ReadonlySet<string> = getUnlockedGameDotPaths(wonPaths),
): GameDotState {
  if (!unlockedPaths.has(gameDot.path)) return "locked";
  if (!wonPaths.has(gameDot.path)) return "connected";

  const hasAllRewards = gameDot.rewards.every((reward) =>
    reward.type === "tao"
      ? collectedTaoIds.has(reward.id)
      : collectedQuoteIds.has(reward.id),
  );
  return hasAllRewards ? "complete" : "won";
}

/** Every game in the map is reachable from the start, and no one game
 *  holds back a large share of the map. */
function checkReach(gameDots: GameDotDefinition[], label: string) {
  const errors: string[] = [];
  const byPath = new Map(gameDots.map((gameDot) => [gameDot.path, gameDot]));
  const visited = new Set<string>();
  const pending = [CAMPAIGN_START_PATH];
  while (pending.length > 0) {
    const path = pending.pop()!;
    if (visited.has(path)) continue;
    visited.add(path);
    byPath.get(path)?.connections.forEach((connection) => {
      if (!visited.has(connection)) pending.push(connection);
    });
  }
  if (visited.size !== gameDots.length) {
    errors.push(
      `${label} is disconnected: reached ${visited.size}/${gameDots.length}.`,
    );
  }

  // A game nobody can beat should not shut off the rest of the galaxy. Arms
  // are chains, so some gating is unavoidable and expected; what matters is
  // that no single game holds back a large share of the map.
  const gateLimit = Math.ceil(gameDots.length * MAP_GEOMETRY.maxGatedShare);
  for (const blockedGameDot of gameDots) {
    if (blockedGameDot.path === CAMPAIGN_START_PATH) continue;
    const reachable = new Set<string>();
    const queue = [CAMPAIGN_START_PATH];
    while (queue.length > 0) {
      const path = queue.pop()!;
      if (path === blockedGameDot.path || reachable.has(path)) continue;
      reachable.add(path);
      byPath.get(path)?.connections.forEach((connection) => {
        if (connection !== blockedGameDot.path && !reachable.has(connection)) {
          queue.push(connection);
        }
      });
    }

    const gated = gameDots.length - 1 - reachable.size;
    if (gated > gateLimit) {
      errors.push(
        `${label}: ${blockedGameDot.path} gates ${gated} games, over the ${gateLimit} allowed.`,
      );
    }
  }
  return errors;
}

export function validateCampaignMap() {
  const errors: string[] = [...validateCollectibleCatalogs()];
  const gamePaths = new Set(GAME_DEFINITIONS.map((game) => game.path));
  const gameDotPaths = new Set<string>();
  const taoIds = new Set<number>();
  const quoteIds = new Set<number>();

  for (const gameDot of ALL_GAME_DOT_DEFINITIONS) {
    if (gameDotPaths.has(gameDot.path))
      errors.push(`Duplicate game dot ${gameDot.path}.`);
    gameDotPaths.add(gameDot.path);
    if (!gamePaths.has(gameDot.path))
      errors.push(`Unknown game ${gameDot.path}.`);
    if (!Number.isFinite(gameDot.x) || !Number.isFinite(gameDot.y)) {
      errors.push(`Invalid coordinates for ${gameDot.path}.`);
    }
    if (
      gameDot.connections.length < 1 ||
      gameDot.connections.length > MAP_GEOMETRY.maxConnections
    ) {
      errors.push(
        `${gameDot.path} must have 1 to ${MAP_GEOMETRY.maxConnections} connections.`,
      );
    }
    if (
      gameDot.rewards.length < MAP_GEOMETRY.minRewards ||
      gameDot.rewards.length > MAP_GEOMETRY.maxRewards
    ) {
      errors.push(
        `${gameDot.path} must have ${MAP_GEOMETRY.minRewards} to ${MAP_GEOMETRY.maxRewards} rewards.`,
      );
    }
    if (gameDot.arm !== null && !Number.isInteger(gameDot.arm)) {
      errors.push(`${gameDot.path} has an invalid arm ${gameDot.arm}.`);
    }

    const chapters = gameDot.rewards.filter((reward) => reward.type === "tao");
    if (chapters.length > 1) {
      errors.push(`${gameDot.path} has more than one Tao chapter.`);
    }

    for (const reward of gameDot.rewards) {
      const ids = reward.type === "tao" ? taoIds : quoteIds;
      const maxId = reward.type === "tao" ? TAO_CHAPTER_COUNT : QUOTE_COUNT;
      if (!Number.isInteger(reward.id) || reward.id < 1 || reward.id > maxId) {
        errors.push(
          `${gameDot.path} has an unknown ${reward.type} ${reward.id}.`,
        );
      }
      if (ids.has(reward.id)) {
        errors.push(`Duplicate ${reward.type} reward ${reward.id}.`);
      }
      ids.add(reward.id);
    }

    for (const connection of gameDot.connections) {
      const connectedGameDot = ALL_GAME_DOT_DEFINITIONS.find(
        (candidate) => candidate.path === connection,
      );
      if (!connectedGameDot) {
        errors.push(
          `${gameDot.path} connects to unknown game dot ${connection}.`,
        );
      } else if (!connectedGameDot.connections.includes(gameDot.path)) {
        errors.push(`${gameDot.path} -> ${connection} is not symmetric.`);
      }
    }
  }

  // Every released game has a dot; local-only games have none.
  for (const game of GAME_DEFINITIONS) {
    if (game.enabledOnLocalOnly) {
      if (gameDotPaths.has(game.path))
        errors.push(`${game.path} is local-only but has a game dot.`);
    } else if (!gameDotPaths.has(game.path)) {
      errors.push(`Missing game dot for ${game.path}.`);
    }
  }
  const closestPair = Math.min(
    ...ALL_GAME_DOT_DEFINITIONS.map((gameDot) =>
      Math.min(
        ...ALL_GAME_DOT_DEFINITIONS.filter(
          (candidate) => candidate.path !== gameDot.path,
        ).map((candidate) =>
          Math.hypot(gameDot.x - candidate.x, gameDot.y - candidate.y),
        ),
      ),
    ),
  );
  if (closestPair < MIN_GAME_DOT_SPACING) {
    errors.push(
      `Closest game dot pair ${closestPair.toFixed(4)} is under the ${MIN_GAME_DOT_SPACING.toFixed(4)} minimum, so the dots would crowd.`,
    );
  }

  // Every Tao chapter has to be collectable somewhere. Quotes deliberately
  // are not: the pool may run ahead of the games that award it.
  for (let id = 1; id <= TAO_CHAPTER_COUNT; id += 1) {
    if (!taoIds.has(id)) errors.push(`Tao chapter ${id} is not awarded.`);
  }

  errors.push(...checkReach(ALL_GAME_DOT_DEFINITIONS, "Game dot graph"));
  return errors;
}

if (__DEV__) {
  const errors = validateCampaignMap();
  if (errors.length > 0) {
    throw new Error(`Invalid Campaign map:\n${errors.join("\n")}`);
  }
}

export { ALL_GAME_DOT_DEFINITIONS, HUB_EXTRA_LINKS, LAYOUT_FINGERPRINT };
