// Builds src/data/campaign-map.generated.ts from the game catalog. See
// docs/campaign-map.md.
//
//   npm run campaign:generate
//     Keeps every existing node (position, links and rewards), so players'
//     progress and collected rewards stay put, and brings the map in line
//     with the games:
//     - a new game is placed out towards the rim, linked in and given unused
//       quotes;
//     - a renamed game (MOVED_GAME_PATHS in src/data/game-variants.ts) keeps
//       its node under its new path;
//     - a removed game (RETIRED_GAME_PATHS there, or one folded into another
//       game) leaves the map, the gap it left is bridged, and its rewards
//       are handed to other games so they can still be collected.
//     A game with a node but no definition, and no entry in either list, is
//     an error: say which it is.
//
//   npm run campaign:generate -- --rebuild
//     Lays out a fresh spiral galaxy and fits the games to it: Klondike at
//     the centre, the rest outwards by progression score, no game the only
//     way to an easier one, categories varied near the centre, and
//     local-only games on the rim as dead ends. Deals every reward again.
//
//   npm run campaign:generate -- --rebalance-rewards
//     Keeps the layout and deals every reward again.
//
//   npm run campaign:lock
//     Records every game's place, links and rewards in
//     src/data/campaign-map.lock.json. From then on a plain run fails rather
//     than move, unlink or take a reward from a locked game. Run it again
//     after adding, renaming or removing a game to bring the lock up to date.
//
// Players' progress hangs on the map, so --rebuild and --rebalance-rewards
// refuse to replace an existing map unless given --reset-player-progress.
// Ask the owner first: see "Locked: players' saved data" in AGENTS.md. Saved
// progress keeps its wins, the games it had open and its collectibles across
// a rebuild (see src/data/campaign-progress.ts), but which game gives which
// reward changes for everyone.
//
// The galaxy's shape is tuned from the parameter block below.

import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const gamesDirectory = path.join(root, "src/data/games");
const outputPath = path.join(root, "src/data/campaign-map.generated.ts");
const collectiblesPath = path.join(root, "src/data/collectibles.ts");
const lockPath = path.join(root, "src/data/campaign-map.lock.json");
const variantsPath = path.join(root, "src/data/game-variants.ts");
const rebuild = process.argv.includes("--rebuild");
const rebalance = process.argv.includes("--rebalance-rewards");
const lockOnly = process.argv.includes("--lock");
const resetConfirmed = process.argv.includes("--reset-player-progress");

// ── Map parameters ───────────────────────────────────────────────────────────
// Everything that shapes the galaxy lives here. Retune the map by editing this
// block and re-running with --rebuild; nothing below needs to change.

/** Klondike anchors the centre; every other game is placed by its score. */
const CAMPAIGN_START = "/klondike";

/** Must match WORLD_SIZE in src/components/Campaign/CampaignMap.tsx. */
const WORLD_SIZE = 1800;
/** The largest a node dot is ever drawn there: GAME_DOT_SIZE * the biggest
 *  STATE_SIZE_MULTIPLIER. */
const GAME_DOT_DIAMETER = 18 * 1.2;
/** Node centres stay at least this many dot-diameters apart. */
const MIN_SPACING_IN_DOTS = 3;
/** The same rule in map units, which is the -1..1 space coordinates live in. */
const MIN_SPACING =
  (MIN_SPACING_IN_DOTS * GAME_DOT_DIAMETER) / (WORLD_SIZE / 2);

const GALAXY = {
  /** Main spiral arms. */
  arms: 4,
  /** Radians an arm sweeps per e-fold of radius; higher curls tighter. */
  wind: 2.18,
  /** Angular half-width of an arm at the core, narrowing outwards. */
  width: 0.4,
  /** How far an arm's centre line strays from a true logarithmic spiral, as a
   *  share of its width. This is what keeps the arms from looking drafted. */
  wander: 0.2,
  /** Density between the arms, relative to an arm's centre line. Field stars
   *  in the gaps stop the map reading as five separate strands. */
  fieldDensity: 0.02,
  /** How steeply star density drops with radius, as an exponential disc. */
  radialFalloff: 1.4,
  /** How sharply density falls off across an arm; higher packs the spine. */
  armSharpness: 2.2,
  /** Share of an arm's width that counts as its spine for chaining. */
  armCore: 0.5,
  /**
   * A round central bulge, as a share of all nodes and how far out it reaches.
   * Without it the hub sits in a void: sampling evenly over area puts almost
   * no darts near the middle, and a real spiral is brightest at its core.
   */
  bulgeFraction: 0.16,
  bulgeRadius: 0.4,
  /** No node comes closer to the centre than this, nor goes beyond the rim. */
  coreRadius: 0.085,
  rimRadius: 1,
};

const CONNECTIONS = {
  /** Most links one node may hold. */
  max: 6,
  /** Longest link along an arm, in map units. */
  maxArmEdge: 0.2,
  /** Longest link between arms, or out to a field star. */
  maxBridgeEdge: 0.26,
  /** Links allowed between any one pair of arms, keeping the arms readable. */
  bridgesPerArmPair: 5,
  /** A node this well connected is passed over when adding optional links. */
  comfortable: 4,
  /** How close a link may pass to a node it does not join, in map units. */
  nodeClearance: 0.06,
  /**
   * A node left with a single link is a dead end at the tip of an arm. If
   * another node sits within this reach it gets a second link, so tips only
   * stay lonely when there is genuinely nothing nearby to join.
   */
  lonelyTipReach: 0.34,
};

const HUB = {
  /**
   * Links added from Klondike to its nearest games, beyond the ones the
   * layout drew, so the first win opens more of the map. They are left out of
   * the rule that the first games are each of a different category.
   */
  extraLinks: 2,
};

const REWARDS = {
  /** Every game has two or three rewards: a Tao chapter and one or two
   *  quotes, or quotes only. */
  min: 2,
  max: 3,
};

/**
 * How games are arranged, by the order they should be met in: a game's
 * progression score (difficulty, and some complexity, so the first games are
 * easy to win and to learn) sets how far out it sits.
 */
const PLACEMENT = {
  difficultyWeight: 0.75,
  complexityWeight: 0.25,
  /** How far out local-only games sit: among this outer share of the map. */
  localOnlyRim: 0.3,
  /** Cost of a game sitting further from its ideal ring, per point squared. */
  radialWeight: 1,
  /** Cost per difficulty point by which a game is harder than a game it
   *  gates (one that can only be reached through it). */
  gateWeight: 400,
  /** Cost of two linked games sharing a category, at the centre; it halves
   *  with every step out, where players have more to choose from. */
  sameCategoryWeight: 900,
  /** Among the first games (this many steps from Klondike), each category
   *  appearing more than once costs this much again. */
  openingDepth: 2,
  openingRepeatWeight: 900,
  /** Simulated annealing: moves tried, and the starting temperature. */
  iterations: 400000,
  temperature: 400,
};

function readCount(name) {
  const source = fs.readFileSync(collectiblesPath, "utf8");
  const value = Number(source.match(new RegExp(`${name}\\s*=\\s*(\\d+)`))?.[1]);
  if (!Number.isInteger(value)) {
    throw new Error(`Could not read ${name} from ${collectiblesPath}.`);
  }
  return value;
}

const TAO_COUNT = readCount("TAO_CHAPTER_COUNT");
const QUOTE_COUNT = readCount("QUOTE_COUNT");

function hash(value) {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function parseGame(filename) {
  const source = fs.readFileSync(path.join(gamesDirectory, filename), "utf8");
  const gamePath = source.match(/path:\s*["']([^"']+)["']/)?.[1];
  const rating = (name) =>
    Number(source.match(new RegExp(`${name}:\\s*(\\d+)`))?.[1]);
  const complexity = rating("complexity");
  const difficulty = rating("difficulty");
  const luck = rating("luck");
  const tags = [
    ...(source
      .match(/tags:\s*\[([^\]]+)\]/s)?.[1]
      .matchAll(/GameTag\.(\w+)/g) ?? []),
  ].map((match) => match[1]);

  if (
    !gamePath ||
    !tags.length ||
    ![complexity, difficulty, luck].every(Number.isFinite)
  ) {
    throw new Error(`Could not parse node metadata from ${filename}.`);
  }

  return {
    path: gamePath,
    complexity,
    difficulty,
    luck,
    // A game's first tag is its category, as in the games list.
    category: tags[0],
    localOnly: /enabledOnLocalOnly:\s*true/.test(source),
  };
}

/** Lower scores sit nearer the centre; hard and intricate games drift out. */
function progressionScore(game) {
  return (
    PLACEMENT.difficultyWeight * game.difficulty +
    PLACEMENT.complexityWeight * game.complexity
  );
}

/** A top-level `const name = <literal>` in a TypeScript file, as a value. */
function readConstant(filePath, name, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  const source = fs.readFileSync(filePath, "utf8");
  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const declaration = sourceFile.statements
    .filter(ts.isVariableStatement)
    .flatMap((statement) => [...statement.declarationList.declarations])
    .find(
      (candidate) =>
        ts.isIdentifier(candidate.name) && candidate.name.text === name,
    );
  if (!declaration?.initializer) {
    if (fallback !== undefined) return fallback;
    throw new Error(`Could not read ${name} in ${filePath}.`);
  }

  function readLiteral(node) {
    if (ts.isArrayLiteralExpression(node)) {
      return node.elements.map(readLiteral);
    }
    if (ts.isObjectLiteralExpression(node)) {
      return Object.fromEntries(
        node.properties.map((property) => {
          if (
            !ts.isPropertyAssignment(property) ||
            (!ts.isIdentifier(property.name) &&
              !ts.isStringLiteral(property.name) &&
              !ts.isNumericLiteral(property.name))
          ) {
            throw new Error(`Only literal properties can be read for ${name}.`);
          }
          return [property.name.text, readLiteral(property.initializer)];
        }),
      );
    }
    if (ts.isStringLiteral(node)) return node.text;
    if (ts.isNumericLiteral(node)) return Number(node.text);
    // A field star between the arms carries `arm: null`.
    if (node.kind === ts.SyntaxKind.NullKeyword) return null;
    if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
    if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
    if (
      ts.isPrefixUnaryExpression(node) &&
      node.operator === ts.SyntaxKind.MinusToken &&
      ts.isNumericLiteral(node.operand)
    ) {
      return -Number(node.operand.text);
    }
    throw new Error(`Only literal values can be read for ${name}.`);
  }

  let initializer = declaration.initializer;
  while (ts.isAsExpression(initializer)) initializer = initializer.expression;
  return readLiteral(initializer);
}

const readExistingGameDots = () =>
  readConstant(outputPath, "GAME_DOT_DEFINITIONS", []);

/** Old path -> the path its game goes by now (MOVED_GAME_PATHS). */
const MOVED = Object.fromEntries(
  Object.entries(readConstant(variantsPath, "MOVED_GAME_PATHS", {})).map(
    ([from, to]) => [from, to.path],
  ),
);
/** Games taken out of the app for good (RETIRED_GAME_PATHS). */
const RETIRED = new Set(readConstant(variantsPath, "RETIRED_GAME_PATHS", []));

const distance = (left, right) =>
  Math.hypot(left.x - right.x, left.y - right.y);
const radius = (node) => Math.hypot(node.x, node.y);
const nearestDistance = (point, nodes) =>
  Math.min(
    ...nodes
      .filter((node) => node.path !== point.path)
      .map((node) => distance(point, node)),
  );
const spacingRatio = (nodes) => {
  const nearest = nodes.map((node) => nearestDistance(node, nodes));
  return Math.max(...nearest) / Math.min(...nearest);
};
const crossProduct = (start, end, point) =>
  (end.x - start.x) * (point.y - start.y) -
  (end.y - start.y) * (point.x - start.x);

function segmentsCross(leftStart, leftEnd, rightStart, rightEnd) {
  const leftStartSide = crossProduct(rightStart, rightEnd, leftStart);
  const leftEndSide = crossProduct(rightStart, rightEnd, leftEnd);
  const rightStartSide = crossProduct(leftStart, leftEnd, rightStart);
  const rightEndSide = crossProduct(leftStart, leftEnd, rightEnd);
  return leftStartSide * leftEndSide < 0 && rightStartSide * rightEndSide < 0;
}

// ── Galaxy shape ─────────────────────────────────────────────────────────────

/** A deterministic 0..1 value for a label, so every rebuild is identical. */
function hashUnit(label) {
  return hash(label) / 0xffffffff;
}

/** A small deterministic random source, seeded by name. */
function makeRandom(seed) {
  let state = hash(seed) || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

/**
 * How far an arm's centre line strays from a true logarithmic spiral at this
 * radius. Two slow sine terms with per-arm phases bend each arm differently,
 * which is what keeps them from looking drafted.
 */
function armWander(arm, nodeRadius) {
  const first = hashUnit(`arm:${arm}:wander:1`) * Math.PI * 2;
  const second = hashUnit(`arm:${arm}:wander:2`) * Math.PI * 2;
  return (
    Math.sin(nodeRadius * 3.7 + first) * 0.62 +
    Math.sin(nodeRadius * 6.9 + second) * 0.38
  );
}

/**
 * The angle of an arm's centre line at a radius. Map y grows downward (see
 * toWorld in CampaignMap), so subtracting the curl winds anti-clockwise on
 * screen, and every arm uses the same sign so the galaxy reads as one
 * rotating disc.
 */
function armCentreAngle(arm, nodeRadius) {
  const base = (arm * Math.PI * 2) / GALAXY.arms;
  const curl = GALAXY.wind * Math.log(nodeRadius / GALAXY.coreRadius);
  return (
    base - curl + armWander(arm, nodeRadius) * GALAXY.width * GALAXY.wander
  );
}

/** An arm is widest at the core and tightens as it runs out. */
function armHalfWidth(nodeRadius) {
  return GALAXY.width / (1 + nodeRadius * 1.1);
}

/** The arm whose centre line runs closest to a point, and how far off it is. */
function nearestArm(x, y) {
  const nodeRadius = Math.hypot(x, y);
  const angle = Math.atan2(y, x);
  let best = { arm: 0, offset: Infinity };

  for (let arm = 0; arm < GALAXY.arms; arm += 1) {
    const delta = angle - armCentreAngle(arm, nodeRadius);
    const offset = Math.abs(Math.atan2(Math.sin(delta), Math.cos(delta)));
    if (offset < best.offset) best = { arm, offset };
  }
  return best;
}

/**
 * How likely the galaxy is to hold a star at a point: an exponential disc,
 * brightened along the arms, with a floor between them for field stars.
 */
function starDensity(x, y) {
  const nodeRadius = Math.hypot(x, y);
  if (nodeRadius < GALAXY.coreRadius || nodeRadius > GALAXY.rimRadius) return 0;

  const across = nearestArm(x, y).offset / armHalfWidth(nodeRadius);
  const onArm = Math.exp(-across * across * GALAXY.armSharpness);
  const disc = Math.exp(-nodeRadius * GALAXY.radialFalloff);
  return disc * (GALAXY.fieldDensity + (1 - GALAXY.fieldDensity) * onArm);
}

/** Which arm a node sits on, or null for a field star in the gaps. */
function armOf(point) {
  const nodeRadius = Math.hypot(point.x, point.y);
  if (nodeRadius < GALAXY.coreRadius) return null;
  const { arm, offset } = nearestArm(point.x, point.y);
  return offset <= armHalfWidth(nodeRadius) * GALAXY.armCore ? arm : null;
}

// ── Connections ──────────────────────────────────────────────────────────────

/** Distance from a point to the segment `start`-`end`. */
function pointToSegment(point, start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return distance(point, start);
  let along =
    ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared;
  along = Math.max(0, Math.min(1, along));
  return distance(point, { x: start.x + along * dx, y: start.y + along * dy });
}

/** A link that skims past an unrelated node reads as running through it. */
function passesThroughGameDot(records, left, right) {
  return records.some(
    (record) =>
      record !== left &&
      record !== right &&
      pointToSegment(record, left, right) < CONNECTIONS.nodeClearance,
  );
}

/** Crossed lines are the one thing that always looks like a mistake. */
function crossesExistingLink(records, connections, left, right) {
  const byPath = new Map(records.map((record) => [record.path, record]));
  for (const record of records) {
    for (const otherPath of connections.get(record.path)) {
      if (record.path >= otherPath) continue;
      if (
        record.path === left.path ||
        record.path === right.path ||
        otherPath === left.path ||
        otherPath === right.path
      ) {
        continue;
      }
      if (segmentsCross(left, right, record, byPath.get(otherPath)))
        return true;
    }
  }
  return false;
}

/**
 * Joins two nodes if the link is legal. `maxLength` varies by link type, and
 * `force` is for the repairs that keep the map whole, which must succeed even
 * where a tidier link would not.
 */
function link(records, connections, left, right, maxLength, force = false) {
  if (left.path === right.path) return false;
  const leftLinks = connections.get(left.path);
  const rightLinks = connections.get(right.path);
  if (leftLinks.has(right.path)) return false;
  if (leftLinks.size >= CONNECTIONS.max || rightLinks.size >= CONNECTIONS.max) {
    return false;
  }
  if (distance(left, right) > maxLength) return false;
  if (!force) {
    if (passesThroughGameDot(records, left, right)) return false;
    if (crossesExistingLink(records, connections, left, right)) return false;
  }
  leftLinks.add(right.path);
  rightLinks.add(left.path);
  return true;
}

/** The groups of nodes that can reach each other. */
function components(records, connections) {
  const seen = new Set();
  const groups = [];
  for (const record of records) {
    if (seen.has(record.path)) continue;
    const group = [];
    const queue = [record.path];
    seen.add(record.path);
    while (queue.length > 0) {
      const current = queue.pop();
      group.push(current);
      for (const next of connections.get(current)) {
        if (seen.has(next)) continue;
        seen.add(next);
        queue.push(next);
      }
    }
    groups.push(group);
  }
  return groups;
}

/**
 * Links the nearest pair of nodes across separate groups until every game can
 * be reached. These links are forced through even if they cross something.
 */
function joinComponents(records, connections) {
  const byPath = new Map(records.map((record) => [record.path, record]));
  for (let guard = 0; guard < records.length; guard += 1) {
    const groups = components(records, connections);
    if (groups.length <= 1) break;

    const main = groups.reduce((largest, group) =>
      group.length > largest.length ? group : largest,
    );
    const mainSet = new Set(main);
    let best = null;
    for (const fromPath of main) {
      for (const record of records) {
        if (mainSet.has(record.path)) continue;
        const length = distance(byPath.get(fromPath), record);
        if (!best || length < best.length) {
          best = { from: byPath.get(fromPath), to: record, length };
        }
      }
    }
    if (!best) break;
    link(records, connections, best.from, best.to, Infinity, true);
  }
}

/**
 * Wires the map: arms first, because they are the shape the galaxy is read
 * by, then bridges across the gaps, then whatever repairs are needed so every
 * game is reachable.
 */
function wireGalaxy(records, connections) {
  const byPath = new Map(records.map((record) => [record.path, record]));

  // Each arm, chained outwards. These are the map's thick strands.
  const arms = new Map();
  for (const record of records) {
    if (record.arm === null) continue;
    if (!arms.has(record.arm)) arms.set(record.arm, []);
    arms.get(record.arm).push(record);
  }
  for (const members of arms.values()) {
    members.sort((left, right) => radius(left) - radius(right));
    for (let index = 1; index < members.length; index += 1) {
      link(
        records,
        connections,
        members[index - 1],
        members[index],
        CONNECTIONS.maxArmEdge,
      );
    }
  }

  // Bridges: the short hops that tie arms to each other and pick up the field
  // stars between them. Shortest first, so the map keeps its nearest links.
  const candidates = [];
  for (let left = 0; left < records.length; left += 1) {
    for (let right = left + 1; right < records.length; right += 1) {
      const from = records[left];
      const to = records[right];
      if (from.arm !== null && from.arm === to.arm) continue;
      const length = distance(from, to);
      if (length > CONNECTIONS.maxBridgeEdge) continue;
      candidates.push({ from, to, length });
    }
  }
  candidates.sort((left, right) => left.length - right.length);

  const perArmPair = new Map();
  for (const { from, to } of candidates) {
    if (
      connections.get(from.path).size >= CONNECTIONS.comfortable ||
      connections.get(to.path).size >= CONNECTIONS.comfortable
    ) {
      continue;
    }
    if (from.arm !== null && to.arm !== null) {
      const key = [from.arm, to.arm].sort().join("-");
      if ((perArmPair.get(key) ?? 0) >= CONNECTIONS.bridgesPerArmPair) continue;
      if (link(records, connections, from, to, CONNECTIONS.maxBridgeEdge)) {
        perArmPair.set(key, (perArmPair.get(key) ?? 0) + 1);
      }
    } else {
      link(records, connections, from, to, CONNECTIONS.maxBridgeEdge);
    }
  }

  // Nobody is left floating: an unlinked node takes its nearest neighbour.
  for (const record of records) {
    if (connections.get(record.path).size > 0) continue;
    const nearest = records
      .filter((other) => other !== record)
      .sort((left, right) => distance(record, left) - distance(record, right));
    for (const candidate of nearest) {
      if (link(records, connections, record, candidate, Infinity, true)) break;
    }
  }

  // A single-link node is a dead end. Give it a second where anything is in
  // reach, so an arm tip is only ever isolated when it truly stands alone.
  for (const record of records) {
    if (connections.get(record.path).size !== 1) continue;
    const reachable = records
      .filter((other) => other !== record)
      .sort((left, right) => distance(record, left) - distance(record, right));
    for (const candidate of reachable) {
      if (distance(record, candidate) > CONNECTIONS.lonelyTipReach) break;
      if (
        link(
          records,
          connections,
          record,
          candidate,
          CONNECTIONS.lonelyTipReach,
        )
      ) {
        break;
      }
    }
  }

  // One galaxy, not several: join separate groups by their closest pair. The
  // map has to be walkable from the hub or games would be unreachable, so
  // these links are forced through even if they cross something.
  joinComponents(records, connections);
}

// ── Layout ───────────────────────────────────────────────────────────────────

/**
 * Scatters `count` positions across the galaxy by dart-throwing: a candidate
 * is kept in proportion to the star density there, and only if it clears
 * MIN_SPACING from everything already placed. Sampling against the density
 * field is what gives the arms soft, uneven edges; snapping nodes onto an
 * arm's centre line instead produces a drawn spiral rather than a galaxy.
 */
function scatterPositions(count) {
  const random = makeRandom("galaxy-positions");
  const positions = [{ x: 0, y: 0 }];
  const maxAttempts = count * 6000;

  // The bulge: a round, evenly packed core the arms then wind out of. It is
  // filled first so the innermost, easiest games always have somewhere to go.
  const bulgeCount = Math.round(count * GALAXY.bulgeFraction);
  for (
    let attempt = 0;
    positions.length < bulgeCount && attempt < maxAttempts;
    attempt += 1
  ) {
    const nodeRadius = Math.sqrt(
      GALAXY.coreRadius ** 2 +
        random() * (GALAXY.bulgeRadius ** 2 - GALAXY.coreRadius ** 2),
    );
    const angle = random() * Math.PI * 2;
    const candidate = {
      x: Number((Math.cos(angle) * nodeRadius).toFixed(4)),
      y: Number((Math.sin(angle) * nodeRadius).toFixed(4)),
    };
    if (positions.some((placed) => distance(placed, candidate) < MIN_SPACING)) {
      continue;
    }
    positions.push(candidate);
  }

  for (
    let attempt = 0;
    positions.length < count && attempt < maxAttempts;
    attempt += 1
  ) {
    // Uniform over area first, so density alone shapes the result.
    const nodeRadius = Math.sqrt(
      GALAXY.coreRadius ** 2 +
        random() * (GALAXY.rimRadius ** 2 - GALAXY.coreRadius ** 2),
    );
    const angle = random() * Math.PI * 2;
    const x = Math.cos(angle) * nodeRadius;
    const y = Math.sin(angle) * nodeRadius;

    if (random() > starDensity(x, y)) continue;
    const candidate = { x: Number(x.toFixed(4)), y: Number(y.toFixed(4)) };
    if (positions.some((placed) => distance(placed, candidate) < MIN_SPACING)) {
      continue;
    }
    positions.push(candidate);
  }

  if (positions.length < count) {
    throw new Error(
      `Only placed ${positions.length} of ${count} nodes. The galaxy is too ` +
        `tight for a ${MIN_SPACING.toFixed(4)} minimum gap: raise WORLD_SIZE, ` +
        `widen GALAXY.arms/width, or lower GALAXY.radialFalloff.`,
    );
  }
  return positions;
}

/** Which nodes can only be reached through `gate`: they gate on it. */
function gatedBy(order, adjacency, gate) {
  const reached = new Set();
  const queue = [0];
  while (queue.length > 0) {
    const current = queue.pop();
    if (current === gate || reached.has(current)) continue;
    reached.add(current);
    for (const next of adjacency[current]) {
      if (!reached.has(next) && next !== gate) queue.push(next);
    }
  }
  return order.filter((slot) => slot !== gate && !reached.has(slot));
}

/** Steps from the centre along links, for every slot. */
function depths(adjacency) {
  const depth = adjacency.map(() => Infinity);
  depth[0] = 0;
  const queue = [0];
  while (queue.length > 0) {
    const current = queue.shift();
    for (const next of adjacency[current]) {
      if (depth[next] !== Infinity) continue;
      depth[next] = depth[current] + 1;
      queue.push(next);
    }
  }
  return depth;
}

/**
 * Slots for local-only games: out on the rim, and dead ends, so that when a
 * build leaves them out every other game can still be reached exactly as
 * before. Prefers slots not beside one another.
 */
function pickLocalOnlySlots(slots, adjacency, count) {
  if (count === 0) return [];
  const withoutSlots = (removed) =>
    adjacency.map((links, slot) =>
      removed.has(slot) ? [] : links.filter((next) => !removed.has(next)),
    );
  const reachesAll = (removed) => {
    const trimmed = withoutSlots(removed);
    const reached = new Set();
    const queue = [0];
    while (queue.length > 0) {
      const current = queue.pop();
      if (reached.has(current)) continue;
      reached.add(current);
      for (const next of trimmed[current]) queue.push(next);
    }
    return reached.size === slots.length - removed.size;
  };

  const rimFrom = Math.floor(slots.length * (1 - PLACEMENT.localOnlyRim));
  const outermost = slots
    .map((slot, index) => ({ index, radius: radius(slot) }))
    .filter(({ index }) => index !== 0)
    .sort((left, right) => right.radius - left.radius)
    .slice(0, slots.length - rimFrom)
    .map(({ index }) => index);

  const chosen = new Set();
  for (const apart of [true, false]) {
    for (const slot of outermost) {
      if (chosen.size >= count) break;
      if (chosen.has(slot)) continue;
      if (apart && adjacency[slot].some((next) => chosen.has(next))) continue;
      const trial = new Set([...chosen, slot]);
      if (reachesAll(trial)) chosen.add(slot);
    }
  }
  if (chosen.size < count) {
    throw new Error(
      `Only found ${chosen.size} of ${count} rim slots that local-only games ` +
        `could leave without cutting the map; widen PLACEMENT.localOnlyRim.`,
    );
  }
  return [...chosen];
}

/**
 * Every node from scratch, as a spiral galaxy. The positions and links come
 * from the galaxy's shape alone; games are then fitted to them:
 *
 * - Klondike at the centre, and progression scores rising outwards;
 * - no game the only way through to an easier one (checked on the map as
 *   release builds show it, without local-only games);
 * - categories varied between neighbours, most of all near the centre;
 * - local-only games on the rim, as dead ends.
 */
function layoutAll(games) {
  const positions = scatterPositions(games.length);
  const [centre, ...outer] = positions;
  outer.sort((left, right) => radius(left) - radius(right));
  const slots = [centre, ...outer].map((point, index) => ({
    path: `slot:${String(index).padStart(3, "0")}`,
    x: point.x,
    y: point.y,
    arm: armOf(point),
    connections: [],
    rewards: [],
  }));

  const connections = new Map(slots.map((slot) => [slot.path, new Set()]));
  wireGalaxy(slots, connections);
  const indexOf = new Map(slots.map((slot, index) => [slot.path, index]));
  const adjacency = slots.map((slot) =>
    [...connections.get(slot.path)].map((next) => indexOf.get(next)),
  );

  const hub = games.find((game) => game.path === CAMPAIGN_START);
  const local = games.filter((game) => game.localOnly);
  const placed = games.filter((game) => game !== hub && !game.localOnly);

  const localSlots = pickLocalOnlySlots(slots, adjacency, local.length);
  const localSet = new Set(localSlots);
  const released = adjacency.map((links, slot) =>
    localSet.has(slot) ? [] : links.filter((next) => !localSet.has(next)),
  );
  const freeSlots = slots
    .map((_, index) => index)
    .filter((index) => index !== 0 && !localSet.has(index));

  // Gates, on the map as release builds show it.
  const gates = [];
  for (const gate of freeSlots) {
    const blocked = gatedBy(freeSlots, released, gate);
    if (blocked.length > 0) gates.push([gate, blocked]);
  }
  const depth = depths(released);

  // Each free slot's ideal score: the score of the game at its rank by radius.
  const sortedScores = placed.map(progressionScore).sort((a, b) => a - b);
  const target = new Map(
    freeSlots.map((slot, rank) => [slot, sortedScores[rank]]),
  );
  const edges = [];
  for (const slot of [0, ...freeSlots]) {
    for (const next of released[slot])
      if (slot < next) edges.push([slot, next]);
  }
  const opening = [0, ...freeSlots].filter(
    (slot) => depth[slot] <= PLACEMENT.openingDepth,
  );

  // game at each slot; starts in rank order.
  const at = new Map([[0, hub]]);
  const byScore = [...placed].sort(
    (left, right) =>
      progressionScore(left) - progressionScore(right) ||
      left.path.localeCompare(right.path),
  );
  freeSlots.forEach((slot, rank) => at.set(slot, byScore[rank]));

  const cost = () => {
    let total = 0;
    for (const slot of freeSlots) {
      const off = progressionScore(at.get(slot)) - target.get(slot);
      total += PLACEMENT.radialWeight * off * off;
    }
    for (const [gate, blocked] of gates) {
      const gateDifficulty = at.get(gate).difficulty;
      for (const slot of blocked) {
        const over = gateDifficulty - at.get(slot).difficulty;
        if (over > 0) total += PLACEMENT.gateWeight * over;
      }
    }
    for (const [left, right] of edges) {
      if (at.get(left).category !== at.get(right).category) continue;
      const steps = Math.min(depth[left], depth[right]);
      total += PLACEMENT.sameCategoryWeight / 2 ** steps;
    }
    const seen = new Map();
    for (const slot of opening) {
      const category = at.get(slot).category;
      seen.set(category, (seen.get(category) ?? 0) + 1);
    }
    for (const count of seen.values()) {
      if (count > 1) total += PLACEMENT.openingRepeatWeight * (count - 1);
    }
    return total;
  };

  // Simulated annealing over swaps, seeded so every rebuild is identical.
  const random = makeRandom("galaxy-placement");
  let current = cost();
  let best = current;
  let bestAt = new Map(at);
  for (let step = 0; step < PLACEMENT.iterations; step += 1) {
    const heat = PLACEMENT.temperature * (1 - step / PLACEMENT.iterations);
    const left = freeSlots[Math.floor(random() * freeSlots.length)];
    const right = freeSlots[Math.floor(random() * freeSlots.length)];
    if (left === right) continue;
    const held = at.get(left);
    at.set(left, at.get(right));
    at.set(right, held);
    const next = cost();
    if (next <= current || random() < Math.exp((current - next) / heat)) {
      current = next;
      if (current < best) {
        best = current;
        bestAt = new Map(at);
      }
    } else {
      at.set(right, at.get(left));
      at.set(left, held);
    }
  }

  // Local-only games take the rim slots, gentlest nearest the centre.
  const localByScore = [...local].sort(
    (left, right) => progressionScore(left) - progressionScore(right),
  );
  [...localSlots]
    .sort((left, right) => radius(slots[left]) - radius(slots[right]))
    .forEach((slot, rank) => bestAt.set(slot, localByScore[rank]));

  const records = slots.map((slot, index) => ({
    ...slot,
    path: bestAt.get(index).path,
  }));
  const pathOf = new Map(
    slots.map((slot, index) => [slot.path, records[index].path]),
  );
  // Klondike's extra links, to its nearest games not already joined to it.
  const hubSlot = slots[0];
  const hubExtraLinks = [];
  for (const slot of [...slots.slice(1)].sort(
    (left, right) => distance(hubSlot, left) - distance(hubSlot, right),
  )) {
    if (hubExtraLinks.length >= HUB.extraLinks) break;
    if (localSet.has(indexOf.get(slot.path))) continue;
    if (link(slots, connections, hubSlot, slot, CONNECTIONS.maxBridgeEdge)) {
      hubExtraLinks.push(pathOf.get(slot.path));
    }
  }

  for (const [index, record] of records.entries()) {
    record.connections = [...connections.get(slots[index].path)]
      .map((slotPath) => pathOf.get(slotPath))
      .sort();
  }
  return { records, hubExtraLinks: hubExtraLinks.sort() };
}

/**
 * A spot for a new game out towards the rim, where the newest and usually
 * hardest games belong. Keeps the existing map untouched so saved progress
 * and collected rewards stay where they are.
 */
function rimPoint(game, records) {
  const random = makeRandom(`rim:${game.path}`);
  let fallback = null;
  // Local-only games go out among the outermost games, where nothing else
  // depends on them (see PLACEMENT.localOnlyRim).
  const radii = records.map(radius).sort((left, right) => left - right);
  const innerRadius = game.localOnly
    ? Math.max(
        0.55,
        radii[Math.ceil(radii.length * (1 - PLACEMENT.localOnlyRim * 0.8))] ??
          0.55,
      )
    : 0.55;

  for (let attempt = 0; attempt < 40000; attempt += 1) {
    const nodeRadius = Math.sqrt(
      innerRadius ** 2 + random() * (GALAXY.rimRadius ** 2 - innerRadius ** 2),
    );
    const angle = random() * Math.PI * 2;
    const x = Number((Math.cos(angle) * nodeRadius).toFixed(4));
    const y = Number((Math.sin(angle) * nodeRadius).toFixed(4));
    if (random() > starDensity(x, y)) continue;

    const point = { x, y };
    const nearest = nearestDistance(point, records);
    if (nearest < MIN_SPACING) continue;
    // Close enough to link to, far enough not to crowd.
    if (nearest <= CONNECTIONS.maxBridgeEdge) return point;
    if (!fallback) fallback = point;
  }

  if (fallback) return fallback;
  throw new Error(`Could not find room for ${game.path} at the rim.`);
}

/**
 * The existing map as-is, brought in line with the games: renamed games keep
 * their node under the new path, removed games leave (their rewards are
 * returned as `orphaned`, to be handed on), and new games are added.
 */
function extendMap(existing, games) {
  const gamePaths = new Set(games.map((game) => game.path));
  const existingPaths = new Set(existing.map((record) => record.path));

  // Where each node that no longer has a game went.
  const renamed = new Map();
  const removed = [];
  const unexplained = [];
  for (const record of existing) {
    if (gamePaths.has(record.path)) continue;
    const target = MOVED[record.path];
    if (target && gamePaths.has(target) && !existingPaths.has(target)) {
      renamed.set(record.path, target);
    } else if (target || RETIRED.has(record.path)) {
      // Retired, or folded into a game that has its own node.
      removed.push(record);
    } else {
      unexplained.push(record.path);
    }
  }
  if (unexplained.length > 0) {
    throw new Error(
      `${unexplained.join(", ")} ${unexplained.length > 1 ? "are" : "is"} on ` +
        `the map but no longer a game. If it was renamed or folded into ` +
        `another game, add it to MOVED_GAME_PATHS; if it was removed, to ` +
        `RETIRED_GAME_PATHS (both in src/data/game-variants.ts). Removing a ` +
        `released game needs the owner's OK.`,
    );
  }

  const nowAt = (gamePath) => renamed.get(gamePath) ?? gamePath;
  const records = existing
    .filter((record) => gamePaths.has(nowAt(record.path)))
    .map((record) => ({
      ...record,
      path: nowAt(record.path),
      arm: record.arm ?? armOf(record),
      connections: record.connections
        .map(nowAt)
        .filter((next) => gamePaths.has(next)),
    }));

  const known = new Set(records.map((record) => record.path));
  const added = games.filter((game) => !known.has(game.path));

  const connections = new Map(
    records.map((record) => [record.path, new Set(record.connections)]),
  );
  // Removing games can cut the map in two: bridge the gaps they left.
  joinComponents(records, connections);

  for (const game of added) {
    const point = rimPoint(game, records);
    const record = {
      path: game.path,
      ...point,
      connections: [],
      rewards: [],
      arm: armOf(point),
      // Not part of the layout: the placement rules don't apply to it.
      appended: true,
    };
    records.push(record);
    connections.set(record.path, new Set());

    const nearest = records
      .filter((other) => other !== record)
      .sort((left, right) => distance(record, left) - distance(record, right));
    for (const candidate of nearest) {
      if (connections.get(record.path).size >= 2) break;
      link(records, connections, record, candidate, CONNECTIONS.maxBridgeEdge);
    }
    if (connections.get(record.path).size === 0) {
      link(records, connections, record, nearest[0], Infinity, true);
    }
  }

  for (const record of records) {
    record.connections = [...connections.get(record.path)].sort();
  }
  return {
    records,
    added,
    renamed,
    removed: removed.map((record) => record.path),
    orphaned: removed.flatMap((record) => record.rewards),
  };
}

// ── Rewards ──────────────────────────────────────────────────────────────────

/**
 * Deals every reward from scratch:
 *
 * - one Tao chapter each for the easiest games (never two, and never on a
 *   local-only game), numbered outwards from Klondike so the chapters are met
 *   roughly in order;
 * - quotes shuffled and dealt so every game has two rewards, then the rest to
 *   games at random, up to three each (never extra ones to local-only games,
 *   whose quotes would be lost if they were left out of a release).
 *
 * Rewards are awarded one per win, in the order listed: a Tao chapter first.
 */
function dealRewards(records, gamesByPath) {
  const released = records.filter(
    (record) => !gamesByPath.get(record.path).localOnly,
  );
  if (released.length < TAO_COUNT) {
    throw new Error(
      `${TAO_COUNT} Tao chapters need as many released games; there are ${released.length}.`,
    );
  }
  const easiest = [...released]
    .sort(
      (left, right) =>
        (left.path === CAMPAIGN_START ? -1 : 0) -
          (right.path === CAMPAIGN_START ? -1 : 0) ||
        progressionScore(gamesByPath.get(left.path)) -
          progressionScore(gamesByPath.get(right.path)) ||
        radius(left) - radius(right),
    )
    .slice(0, TAO_COUNT)
    .sort((left, right) => radius(left) - radius(right));
  for (const record of records) record.rewards = [];
  easiest.forEach((record, index) =>
    record.rewards.push({ type: "tao", id: index + 1 }),
  );

  const random = makeRandom("quote-rewards");
  const shuffle = (list) => {
    for (let index = list.length - 1; index > 0; index -= 1) {
      const other = Math.floor(random() * (index + 1));
      [list[index], list[other]] = [list[other], list[index]];
    }
    return list;
  };
  const quotes = shuffle(
    Array.from({ length: QUOTE_COUNT }, (_, index) => index + 1),
  );

  const needed = records.reduce(
    (sum, record) => sum + Math.max(0, REWARDS.min - record.rewards.length),
    0,
  );
  if (quotes.length < needed) {
    throw new Error(
      `${records.length} games need ${needed} quotes to have ${REWARDS.min} ` +
        `rewards each, and there are ${quotes.length}. Add quotes.`,
    );
  }
  for (const record of records) {
    while (record.rewards.length < REWARDS.min) {
      record.rewards.push({ type: "quote", id: quotes.pop() });
    }
  }
  const roomy = shuffle(
    released.filter((record) => record.rewards.length < REWARDS.max),
  );
  for (const record of roomy) {
    if (quotes.length === 0) break;
    record.rewards.push({ type: "quote", id: quotes.pop() });
  }

  records.forEach(sortRewards);
  return quotes.sort((left, right) => left - right);
}

const sortRewards = (record) =>
  record.rewards.sort(
    (left, right) =>
      (left.type === "tao" ? 0 : 1) - (right.type === "tao" ? 0 : 1) ||
      left.id - right.id,
  );

/**
 * Rewards on an existing map after games came or went. Existing games keep
 * the rewards they have; nothing a player could have collected moves.
 *
 * - `orphaned` rewards (those of removed games) are handed on, so they can
 *   still be collected: a Tao chapter to a released game without one, new
 *   games first and then the easiest; quotes to new games and then to
 *   released games with room.
 * - New games are then topped up with unused quotes.
 */
function redistributeRewards(records, added, orphaned, gamesByPath) {
  const addedPaths = new Set(added.map((game) => game.path));
  const hasTao = (record) =>
    record.rewards.some((reward) => reward.type === "tao");
  const released = (record) => !gamesByPath.get(record.path).localOnly;
  const byPreference = (left, right) =>
    Number(addedPaths.has(right.path)) - Number(addedPaths.has(left.path)) ||
    left.rewards.length - right.rewards.length ||
    progressionScore(gamesByPath.get(left.path)) -
      progressionScore(gamesByPath.get(right.path)) ||
    left.path.localeCompare(right.path);

  for (const reward of orphaned.filter((reward) => reward.type === "tao")) {
    const [home] = records
      .filter(
        (record) =>
          released(record) &&
          !hasTao(record) &&
          record.rewards.length < REWARDS.max,
      )
      .sort(byPreference);
    if (!home) {
      throw new Error(
        `No released game has room for Tao chapter ${reward.id}, which a ` +
          `removed game gave. Every chapter must stay collectable.`,
      );
    }
    home.rewards.push(reward);
  }

  for (const reward of orphaned.filter((reward) => reward.type === "quote")) {
    const [home] = records
      .filter(
        (record) =>
          record.rewards.length < REWARDS.max &&
          (released(record) || record.rewards.length < REWARDS.min),
      )
      .sort(byPreference);
    // With every game full, the quote goes back to the unused ones.
    if (home) home.rewards.push(reward);
  }

  const used = new Set(
    records.flatMap((record) =>
      record.rewards
        .filter((reward) => reward.type === "quote")
        .map((reward) => reward.id),
    ),
  );
  const spare = [];
  for (let id = 1; id <= QUOTE_COUNT; id += 1) {
    if (!used.has(id)) spare.push(id);
  }
  for (const game of added) {
    const record = records.find((candidate) => candidate.path === game.path);
    while (record.rewards.length < REWARDS.min) {
      const id = spare.shift();
      if (id === undefined) {
        throw new Error(
          `No unused quotes left for ${game.path}: add quotes to ` +
            `QuotesText.ts (appended, so existing IDs keep their quotes).`,
        );
      }
      record.rewards.push({ type: "quote", id });
    }
  }
  records.forEach(sortRewards);
  return spare;
}

// ── Validation and output ────────────────────────────────────────────────────

/**
 * The rules the map must hold to, checked on every run. Each one is here
 * because breaking it either makes a game unreachable or makes the map look
 * wrong; nothing is checked purely for tidiness.
 */
function validate(records, gamesByPath, { layoutRules }) {
  const errors = [];
  const byPath = new Map(records.map((record) => [record.path, record]));

  // Nodes must not crowd each other, or the dots overlap when drawn.
  const closest = Math.min(
    ...records.map((record) => nearestDistance(record, records)),
  );
  if (closest < MIN_SPACING) {
    errors.push(
      `closest pair ${closest.toFixed(4)} is under the ${MIN_SPACING.toFixed(4)} minimum gap`,
    );
  }

  for (const record of records) {
    // A node with no links cannot be reached, and one with too many is a mess.
    if (record.connections.length < 1) {
      errors.push(`${record.path} has no connections`);
    }
    if (record.connections.length > CONNECTIONS.max) {
      errors.push(
        `${record.path} has ${record.connections.length} connections, over the ${CONNECTIONS.max} limit`,
      );
    }
    if (
      record.rewards.length < REWARDS.min ||
      record.rewards.length > REWARDS.max
    ) {
      errors.push(`${record.path} has ${record.rewards.length} rewards`);
    }
    // Links run both ways, or the map walks differently in each direction.
    for (const other of record.connections) {
      if (!byPath.get(other)?.connections.includes(record.path)) {
        errors.push(`${record.path} -> ${other} is not mutual`);
      }
    }
  }

  // Every game has to be reachable from the starting node.
  const connections = new Map(
    records.map((record) => [record.path, new Set(record.connections)]),
  );
  const groups = components(records, connections);
  if (groups.length > 1) {
    errors.push(
      `the map is in ${groups.length} pieces; ${records.length - Math.max(...groups.map((group) => group.length))} games cannot be reached`,
    );
  }

  // Every Tao chapter must be collectable somewhere.
  const chapters = new Set(
    records.flatMap((record) =>
      record.rewards.filter((reward) => reward.type === "tao").map((r) => r.id),
    ),
  );
  for (let id = 1; id <= TAO_COUNT; id += 1) {
    if (!chapters.has(id)) errors.push(`Tao chapter ${id} is not awarded`);
  }

  // One Tao chapter at most per game, and none on local-only games.
  for (const record of records) {
    const chapterCount = record.rewards.filter(
      (reward) => reward.type === "tao",
    ).length;
    if (chapterCount > 1)
      errors.push(`${record.path} has ${chapterCount} Tao chapters`);
    if (chapterCount > 0 && gamesByPath.get(record.path)?.localOnly) {
      errors.push(`${record.path} is local-only but has a Tao chapter`);
    }
    for (const reward of record.rewards) {
      const max = reward.type === "tao" ? TAO_COUNT : QUOTE_COUNT;
      if (!(reward.id >= 1 && reward.id <= max)) {
        errors.push(
          `${record.path} has an unknown ${reward.type} ${reward.id}`,
        );
      }
    }
  }

  // Release builds leave local-only games out: the rest must stay whole.
  const released = records.filter(
    (record) => !gamesByPath.get(record.path)?.localOnly,
  );
  const releasedPaths = new Set(released.map((record) => record.path));
  const releasedLinks = new Map(
    released.map((record) => [
      record.path,
      new Set(record.connections.filter((next) => releasedPaths.has(next))),
    ]),
  );
  if (components(released, releasedLinks).length > 1) {
    errors.push("the map comes apart without its local-only games");
  }

  // No game is the only way through to an easier one. This is a rule of the
  // layout: once games are added at the rim, removed or re-rated, the locked
  // map can no longer be held to it.
  if (layoutRules) {
    const order = released.map((record) => record.path);
    const indexOf = new Map(order.map((gamePath, index) => [gamePath, index]));
    const adjacency = order.map((gamePath) =>
      [...releasedLinks.get(gamePath)].map((next) => indexOf.get(next)),
    );
    const start = indexOf.get(CAMPAIGN_START);
    const swap = (index) => (index === 0 ? start : index === start ? 0 : index);
    const rooted = adjacency.map((_, index) =>
      adjacency[swap(index)].map(swap),
    );
    const indices = order
      .map((_, index) => index)
      .filter((index) => index !== 0);
    for (const gate of indices) {
      const gateGame = gamesByPath.get(order[swap(gate)]);
      for (const blocked of gatedBy(indices, rooted, gate)) {
        const blockedGame = gamesByPath.get(order[swap(blocked)]);
        if (blockedGame.difficulty < gateGame.difficulty) {
          errors.push(
            `${gateGame.path} (difficulty ${gateGame.difficulty}) is the only way to ` +
              `${blockedGame.path} (difficulty ${blockedGame.difficulty})`,
          );
        }
      }
    }
  }

  // No reward may be handed out twice, or it cannot be collected twice over.
  const seen = new Set();
  for (const record of records) {
    for (const reward of record.rewards) {
      const key = `${reward.type}:${reward.id}`;
      if (seen.has(key)) errors.push(`${key} is awarded more than once`);
      seen.add(key);
    }
  }

  if (errors.length > 0) throw new Error(errors.join("\n"));
}

/**
 * Once the map is locked, players' progress leans on it, so a locked game
 * must keep its place, its links and its rewards (it may gain rewards, when a
 * removed game's are handed on). New games may only be added around it. A
 * renamed game is checked under its new path; a removed one, and links to
 * it, are let go.
 */
function checkLock(lock, records) {
  const byPath = new Map(records.map((record) => [record.path, record]));
  const gone = (gamePath) => !byPath.has(gamePath) && RETIRED.has(gamePath);
  const nowAt = (gamePath) =>
    !byPath.has(gamePath) && MOVED[gamePath] ? MOVED[gamePath] : gamePath;
  const errors = [];
  for (const [lockedPath, before] of Object.entries(lock.gameDots)) {
    if (gone(lockedPath)) continue;
    const gamePath = nowAt(lockedPath);
    const now = byPath.get(gamePath);
    if (!now) {
      errors.push(`${lockedPath} is locked and cannot leave the map`);
      continue;
    }
    // Folded into a game with its own node: that node is checked instead.
    if (gamePath !== lockedPath && lock.gameDots[gamePath]) continue;
    if (now.x !== before.x || now.y !== before.y) {
      errors.push(`${gamePath} is locked and cannot move`);
    }
    for (const next of before.connections) {
      if (gone(next)) continue;
      if (!now.connections.includes(nowAt(next))) {
        errors.push(
          `${gamePath} is locked and cannot lose its link to ${next}`,
        );
      }
    }
    for (const reward of before.rewards) {
      if (
        !now.rewards.some(
          (kept) => kept.type === reward.type && kept.id === reward.id,
        )
      ) {
        errors.push(
          `${gamePath} is locked and cannot lose ${reward.type} ${reward.id}`,
        );
      }
    }
  }
  if (errors.length > 0) throw new Error(errors.join("\n"));
}

function lockFileFor(records) {
  return `${JSON.stringify(
    {
      note:
        "Written by npm run campaign:lock. Players' progress depends on these " +
        "games' places, links and rewards; see docs/campaign-map.md.",
      gameDots: Object.fromEntries(
        records.map(({ path: gameDotPath, x, y, connections, rewards }) => [
          gameDotPath,
          { x, y, connections, rewards },
        ]),
      ),
    },
    null,
    2,
  )}\n`;
}

// Every game is on the map, local-only ones included: they sit on the rim as
// dead ends, and release builds simply leave them out (see campaign-map.ts).
const games = fs
  .readdirSync(gamesDirectory)
  .filter((filename) => filename.endsWith(".ts"))
  .map(parseGame)
  .sort((left, right) => left.path.localeCompare(right.path));
if (!games.some((game) => game.path === CAMPAIGN_START)) {
  throw new Error(`${CAMPAIGN_START} must exist as the first node.`);
}

const existing = readExistingGameDots();
const gamesByPath = new Map(games.map((game) => [game.path, game]));
const locked = fs.existsSync(lockPath)
  ? JSON.parse(fs.readFileSync(lockPath, "utf8"))
  : null;
let records;
let summary;
let unassigned = [];
let hubExtraLinks = readConstant(outputPath, "HUB_EXTRA_LINKS", []);
/** Whether this run lays the map out, rather than keeping the one there. */
const laidOutNow = !lockOnly && (rebuild || existing.length === 0);
// What the layout was fitted to: the games and their ratings at the time.
// Tests hold the map to the layout rules only while this still matches.
const fingerprintNow = String(
  hash(
    games
      .map((game) =>
        [
          game.path,
          game.difficulty,
          game.complexity,
          game.category,
          game.localOnly,
        ].join(":"),
      )
      .join("|"),
  ),
);
if (process.argv.includes("--fingerprint")) {
  // For the tests: what the map would be fitted to if it were laid out now.
  console.log(fingerprintNow);
  process.exit(0);
}
const layoutFingerprint = laidOutNow
  ? fingerprintNow
  : readConstant(outputPath, "LAYOUT_FINGERPRINT", "");

if (lockOnly) {
  records = existing;
  const newlyLocked = locked
    ? records.filter((record) => !locked.gameDots[record.path]).length
    : records.length;
  const unlocked = locked
    ? Object.keys(locked.gameDots).filter(
        (gamePath) => !records.some((record) => record.path === gamePath),
      ).length
    : 0;
  summary =
    `Locked ${newlyLocked} more nodes` +
    (unlocked > 0 ? `, let go of ${unlocked} that left the map` : "") +
    ` (${records.length} in all)`;
} else if ((rebuild || rebalance) && existing.length > 0 && !resetConfirmed) {
  throw new Error(
    (locked
      ? `The map is locked (${path.relative(root, lockPath)}): players' ` +
        `progress depends on every game's place, links and rewards. `
      : "") +
      `--rebuild and --rebalance-rewards replace the map players' progress ` +
      `depends on: which game gives which reward changes for everyone. New ` +
      `games can be added, and games renamed or removed, with a plain run. ` +
      `Only with the owner's OK, run again with --reset-player-progress.`,
  );
} else if (rebuild || existing.length === 0) {
  ({ records, hubExtraLinks } = layoutAll(games));
  unassigned = dealRewards(records, gamesByPath);
  summary = `Rebuilt ${records.length} nodes and dealt every reward`;
} else if (rebalance) {
  records = existing;
  unassigned = dealRewards(records, gamesByPath);
  summary = `Kept ${records.length} nodes and dealt every reward again`;
} else {
  const result = extendMap(existing, games);
  records = result.records;
  unassigned = redistributeRewards(
    records,
    result.added,
    result.orphaned,
    gamesByPath,
  );
  hubExtraLinks = hubExtraLinks
    .map((gamePath) => result.renamed.get(gamePath) ?? gamePath)
    .filter((gamePath) => gamesByPath.has(gamePath));
  const changes = [
    result.added.length > 0 &&
      `added ${result.added.map((game) => game.path).join(", ")} at the edge`,
    result.renamed.size > 0 &&
      `renamed ${[...result.renamed].map(([from, to]) => `${from} to ${to}`).join(", ")}`,
    result.removed.length > 0 &&
      `removed ${result.removed.join(", ")} and handed on ` +
        `${result.orphaned.length} rewards`,
  ].filter(Boolean);
  summary =
    changes.length > 0
      ? `${changes.join("; ")} (${records.length} nodes)`.replace(/^./, (c) =>
          c.toUpperCase(),
        )
      : `No changes; kept all ${records.length} nodes`;
}

validate(records, gamesByPath, { layoutRules: laidOutNow });
// A rebuild or a fresh deal replaces the locked map outright, with the
// owner's say-so; the lock is then written again from the result.
if (locked && !lockOnly && !rebuild && !rebalance) checkLock(locked, records);
if (lockOnly && locked && !resetConfirmed) checkLock(locked, records);
if (unassigned.length > 0) {
  summary += `; ${unassigned.length} quotes left unassigned (${unassigned.join(", ")})`;
}

const armed = records.filter((record) => record.arm !== null).length;
summary += ` (${armed} on arms, ${records.length - armed} between them)`;

const output =
  `// Generated by scripts/generate-campaign-map.mjs. Coordinates and entries may be edited manually.\n` +
  `import type { GameDotDefinition } from "./campaign-map";\n\n` +
  `/**\n` +
  ` * What the layout was fitted to: a hash of the games, their ratings and\n` +
  ` * categories when the map was last rebuilt. The layout rules (easier games\n` +
  ` * nearer the centre and never gated by harder ones, Tao chapters on the\n` +
  ` * easiest) are only checked while it still matches.\n` +
  ` */\n` +
  `export const LAYOUT_FINGERPRINT = ${JSON.stringify(layoutFingerprint)};\n\n` +
  `/** Klondike's links beyond the ones the layout drew (see HUB.extraLinks). */\n` +
  `export const HUB_EXTRA_LINKS: readonly string[] = ${JSON.stringify(hubExtraLinks)};\n\n` +
  `export const GAME_DOT_DEFINITIONS: GameDotDefinition[] = ${JSON.stringify(
    records.map(
      ({ path: gameDotPath, x, y, arm, connections, rewards, appended }) => ({
        path: gameDotPath,
        x,
        y,
        arm: arm ?? null,
        connections,
        rewards,
        ...(appended ? { appended: true } : {}),
      }),
    ),
    null,
    2,
  )};\n`;

if (lockOnly) {
  fs.writeFileSync(lockPath, lockFileFor(records));
} else {
  fs.writeFileSync(outputPath, output);
}
console.log(
  `${summary} in ${path.relative(root, lockOnly ? lockPath : outputPath)}.`,
);
