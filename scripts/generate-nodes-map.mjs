// Builds src/data/nodes-map.generated.ts from the game catalog.
//
//   npm run nodes:generate
//     Keeps every existing node (position, connections and rewards), so manual
//     edits and players' progress stay intact. Removed games are dropped, and
//     new games are placed around the periphery with two new quotes each.
//
//   npm run nodes:generate -- --rebuild
//     Lays out every node again: Klondike at the centre, Monte Carlo next, then
//     the rest outwards from easy to hard and luck-heavy. Each game keeps the
//     rewards it already has. Overwrites manual coordinate and connection edits.
//
//   npm run nodes:generate -- --rebalance-rewards
//     Deals the rewards again by game (and can be combined with --rebuild):
//     the gold deck goes two quotes at a time to the hardest or luckiest games,
//     every other game gets two Tao chapters or white and black quotes, and any
//     spare become a third reward on the hardest gold games. Games keep the
//     rewards they already hold wherever those still fit.

import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const gamesDirectory = path.join(root, "src/data/games");
const outputPath = path.join(root, "src/data/nodes-map.generated.ts");
const collectiblesPath = path.join(root, "src/data/collectibles.ts");
const rebuild = process.argv.includes("--rebuild");
const rebalance = process.argv.includes("--rebalance-rewards");

// Klondike (the classic) is the first node and Monte Carlo (easy to learn and
// to beat) the second; every other game is ordered by its centre score.
const FIXED_ORDER = ["/klondike", "/monte-carlo"];
const MIN_REWARDS = 2;
// Manual edits may give a node a fourth reward; rebalancing deals at most three.
const MAX_REWARDS = 4;
const REBALANCED_MAX_REWARDS = 3;
// Quotes 1-104 are the white and black decks; the rest are the gold deck.
const GOLD_FIRST_QUOTE_ID = 105;
const GOLD_PER_GAME = 2;
const MIN_CONNECTIONS = 2;
const MAX_CONNECTIONS = 5;
const MIN_SPACING = 0.094;
const SPACING_RATIO = { min: 2.2, max: 3 };

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
  const difficulty = Number(source.match(/difficulty:\s*(\d+)/)?.[1]);
  const luck = Number(source.match(/luck:\s*(\d+)/)?.[1]);

  if (!gamePath || !Number.isFinite(difficulty) || !Number.isFinite(luck)) {
    throw new Error(`Could not parse node metadata from ${filename}.`);
  }

  return { path: gamePath, difficulty, luck };
}

/** Lower scores sit nearer the centre; hard and luck-heavy games drift out. */
function centerScore(game) {
  return 0.6 * game.difficulty + 0.4 * game.luck;
}

function compareGames(left, right) {
  const leftFixed = FIXED_ORDER.indexOf(left.path);
  const rightFixed = FIXED_ORDER.indexOf(right.path);
  if (leftFixed !== -1 || rightFixed !== -1) {
    return (
      (leftFixed === -1 ? Infinity : leftFixed) -
      (rightFixed === -1 ? Infinity : rightFixed)
    );
  }
  return (
    centerScore(left) - centerScore(right) ||
    left.path.localeCompare(right.path)
  );
}

function readExistingNodes() {
  if (!fs.existsSync(outputPath)) return [];
  const source = fs.readFileSync(outputPath, "utf8");
  const sourceFile = ts.createSourceFile(
    outputPath,
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
        ts.isIdentifier(candidate.name) &&
        candidate.name.text === "NODE_DEFINITIONS",
    );
  if (!declaration?.initializer) {
    throw new Error(`Could not read the node list in ${outputPath}.`);
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
            throw new Error("Only literal node properties may be generated.");
          }
          return [property.name.text, readLiteral(property.initializer)];
        }),
      );
    }
    if (ts.isStringLiteral(node)) return node.text;
    if (ts.isNumericLiteral(node)) return Number(node.text);
    if (
      ts.isPrefixUnaryExpression(node) &&
      node.operator === ts.SyntaxKind.MinusToken &&
      ts.isNumericLiteral(node.operand)
    ) {
      return -Number(node.operand.text);
    }
    throw new Error("Only literal node values may be generated.");
  }

  return readLiteral(declaration.initializer);
}

const distance = (left, right) =>
  Math.hypot(left.x - right.x, left.y - right.y);
const radius = (node) => Math.hypot(node.x, node.y);
const nearestDistance = (point, nodes) =>
  Math.min(
    ...nodes
      .filter((node) => node.path !== point.path)
      .map((node) => distance(point, node)),
  );

// ── Connections ──────────────────────────────────────────────────────────────

function connect(connections, leftPath, rightPath) {
  if (leftPath === rightPath) return false;
  const left = connections.get(leftPath);
  const right = connections.get(rightPath);
  if (
    left.has(rightPath) ||
    left.size >= MAX_CONNECTIONS ||
    right.size >= MAX_CONNECTIONS
  ) {
    return false;
  }
  left.add(rightPath);
  right.add(leftPath);
  return true;
}

function ensureMinimumConnections(records, connections) {
  for (const record of records) {
    const candidates = records
      .filter((other) => other !== record)
      .sort((left, right) => distance(record, left) - distance(record, right));
    for (const candidate of candidates) {
      if (connections.get(record.path).size >= MIN_CONNECTIONS) break;
      connect(connections, record.path, candidate.path);
    }
    if (connections.get(record.path).size < MIN_CONNECTIONS) {
      throw new Error(`Could not give ${record.path} enough connections.`);
    }
  }
}

function componentsWithout(records, connections, blockedPath) {
  const visited = new Set([blockedPath]);
  const components = [];

  for (const record of records) {
    if (visited.has(record.path)) continue;
    const component = [];
    const pending = [record.path];
    visited.add(record.path);

    while (pending.length > 0) {
      const current = pending.pop();
      component.push(current);
      for (const connection of connections.get(current)) {
        if (!visited.has(connection)) {
          visited.add(connection);
          pending.push(connection);
        }
      }
    }
    components.push(component);
  }

  return components;
}

/** No single locked node may cut off part of the map. */
function removeBottlenecks(records, connections) {
  const byPath = new Map(records.map((record) => [record.path, record]));

  while (true) {
    const bottleneck = records.find(
      (record) =>
        componentsWithout(records, connections, record.path).length > 1,
    );
    if (!bottleneck) return;

    const components = componentsWithout(records, connections, bottleneck.path);
    const candidates = [];
    for (let left = 0; left < components.length; left += 1) {
      for (let right = left + 1; right < components.length; right += 1) {
        for (const leftPath of components[left]) {
          for (const rightPath of components[right]) {
            if (
              connections.get(leftPath).size < MAX_CONNECTIONS &&
              connections.get(rightPath).size < MAX_CONNECTIONS
            ) {
              candidates.push({
                leftPath,
                rightPath,
                distance: distance(byPath.get(leftPath), byPath.get(rightPath)),
              });
            }
          }
        }
      }
    }

    candidates.sort((left, right) => left.distance - right.distance);
    const bypass = candidates[0];
    if (!bypass || !connect(connections, bypass.leftPath, bypass.rightPath)) {
      throw new Error(
        `Could not bypass progression bottleneck ${bottleneck.path}.`,
      );
    }
  }
}

function finishConnections(records, connections) {
  ensureMinimumConnections(records, connections);
  removeBottlenecks(records, connections);
  for (const record of records) {
    record.connections = [...connections.get(record.path)].sort();
  }
}

// ── Layout ───────────────────────────────────────────────────────────────────

/** Every node from scratch, on an equal-area golden-angle spiral. */
function layoutAll(games) {
  const [center, ...outer] = games;
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const records = [
    { path: center.path, x: 0, y: 0, connections: [], rewards: [] },
  ];

  outer.forEach((game, index) => {
    const equalAreaRadius = Math.max(
      0.12,
      0.92 * Math.sqrt((index + 1) / outer.length),
    );
    const candidates = Array.from({ length: 32 }, (_, candidateIndex) => {
      const radialNoise =
        (hash(`${game.path}:radius:${candidateIndex}`) % 1000) / 999 - 0.5;
      const angularNoise =
        (hash(`${game.path}:angle:${candidateIndex}`) % 1000) / 999 - 0.5;
      const nodeRadius = equalAreaRadius * (1 + radialNoise * 0.2);
      const angle = index * goldenAngle + angularNoise * 0.55;
      return {
        x: Number((Math.cos(angle) * nodeRadius).toFixed(4)),
        y: Number((Math.sin(angle) * nodeRadius).toFixed(4)),
      };
    }).filter((candidate) =>
      records.every((record) => distance(candidate, record) >= MIN_SPACING),
    );

    if (candidates.length === 0) {
      throw new Error(`Could not place ${game.path} without overlapping.`);
    }
    records.push({
      path: game.path,
      ...candidates[hash(game.path) % candidates.length],
      connections: [],
      rewards: [],
    });
  });

  // Each node links inwards to its nearest already-placed neighbour, so
  // Monte Carlo, the second node, always connects to Klondike.
  const connections = new Map(
    records.map((record) => [record.path, new Set()]),
  );
  const outward = [...records].sort(
    (left, right) => radius(left) - radius(right),
  );
  for (let index = 1; index < outward.length; index += 1) {
    const record = outward[index];
    const inward = outward
      .slice(0, index)
      .sort((left, right) => distance(record, left) - distance(record, right));
    if (
      !inward.some((candidate) =>
        connect(connections, record.path, candidate.path),
      )
    ) {
      throw new Error(`Could not connect ${record.path} to the inner map.`);
    }
  }

  finishConnections(records, connections);
  return records;
}

/** A spot at the edge of the map, close to but clear of its outer nodes. */
function peripheryPoint(game, records, minimumSpacing) {
  const outerRadius = Math.max(...records.map(radius));
  const lowest = Math.max(0.11, minimumSpacing);
  const highest = Math.min(0.16, SPACING_RATIO.max * minimumSpacing);

  for (let ring = 0.9 * outerRadius; ring <= outerRadius + 0.4; ring += 0.01) {
    const spots = [];
    for (let step = 0; step < 180; step += 1) {
      const angle = (step / 180) * Math.PI * 2;
      const point = {
        path: game.path,
        x: Number((Math.cos(angle) * ring).toFixed(4)),
        y: Number((Math.sin(angle) * ring).toFixed(4)),
      };
      if (radius(point) < 0.9 * outerRadius) continue;
      const nearest = nearestDistance(point, records);
      if (nearest >= lowest && nearest <= highest) spots.push(point);
    }
    if (spots.length > 0) {
      return spots[hash(game.path) % spots.length];
    }
  }
  throw new Error(
    `Could not find room for ${game.path} at the edge of the map.`,
  );
}

/** The existing map as-is, with removed games dropped and new games added. */
function extendMap(existing, games) {
  const gamePaths = new Set(games.map((game) => game.path));
  const records = existing
    .filter((record) => gamePaths.has(record.path))
    .map((record) => ({
      ...record,
      connections: record.connections.filter((connection) =>
        gamePaths.has(connection),
      ),
    }));
  const known = new Set(records.map((record) => record.path));
  const added = games.filter((game) => !known.has(game.path));
  const connections = new Map(
    records.map((record) => [record.path, new Set(record.connections)]),
  );
  const minimumSpacing = Math.max(
    MIN_SPACING,
    Math.min(...records.map((record) => nearestDistance(record, records))),
  );

  for (const game of added) {
    const point = peripheryPoint(game, records, minimumSpacing);
    const record = { ...point, connections: [], rewards: [] };
    connections.set(record.path, new Set());

    const neighbours = records
      .filter((other) => connections.get(other.path).size < MAX_CONNECTIONS)
      .sort((left, right) => distance(record, left) - distance(record, right));
    const linkCount =
      neighbours[2] &&
      distance(record, neighbours[2]) < distance(record, neighbours[0]) * 1.5
        ? 3
        : 2;
    records.push(record);
    neighbours
      .slice(0, linkCount)
      .forEach((neighbour) =>
        connect(connections, record.path, neighbour.path),
      );
  }

  finishConnections(records, connections);
  return { records, added };
}

// ── Rewards ──────────────────────────────────────────────────────────────────

/**
 * Games keep the rewards they already have, so collected rewards stay with
 * their node. Any node short of two gets the next unused quotes; quote IDs are
 * only ever appended, never recycled from a removed game.
 */
function assignRewards(records, existingByPath) {
  const used = { tao: new Set(), quote: new Set() };
  const maxId = { tao: TAO_COUNT, quote: QUOTE_COUNT };

  for (const record of records) {
    const previous = existingByPath.get(record.path)?.rewards ?? [];
    record.rewards = previous
      .filter(
        (reward) =>
          reward.id >= 1 &&
          reward.id <= maxId[reward.type] &&
          !used[reward.type].has(reward.id),
      )
      .slice(0, MAX_REWARDS);
    record.rewards.forEach((reward) => used[reward.type].add(reward.id));
  }

  let nextQuoteId = Math.max(0, ...used.quote) + 1;
  for (const record of records) {
    while (record.rewards.length < MIN_REWARDS) {
      if (nextQuoteId > QUOTE_COUNT) {
        throw new Error(
          `Out of quotes for ${record.path}. Every quote deck is full: add a 52-card deck of card images, its quotes in src/components/Collectibles/QuotesText.ts, raise QUOTE_COUNT and extend getQuoteCard in src/data/collectibles.ts.`,
        );
      }
      record.rewards.push({ type: "quote", id: nextQuoteId });
      nextQuoteId += 1;
    }
  }
}

/** Higher for games that are hard or luck-heavy, whichever is greater. */
function goldScore(game) {
  return (
    0.5 * Math.max(game.difficulty, game.luck) +
    0.25 * (game.difficulty + game.luck)
  );
}

const rewardKey = (reward) => `${reward.type}:${reward.id}`;
const isGold = (reward) =>
  reward.type === "quote" && reward.id >= GOLD_FIRST_QUOTE_ID;
// Tao first, then quotes, which puts gold quotes last.
const compareRewards = (left, right) =>
  (left.type === "tao" ? 0 : 1) - (right.type === "tao" ? 0 : 1) ||
  left.id - right.id;

/** See --rebalance-rewards at the top of this file. */
function rebalanceRewards(records, existingByPath, gamesByPath) {
  const ranked = [...records].sort(
    (left, right) =>
      goldScore(gamesByPath.get(right.path)) -
        goldScore(gamesByPath.get(left.path)) ||
      left.path.localeCompare(right.path),
  );

  const targets = new Map(
    records.map((record) => [record.path, { gold: 0, plain: MIN_REWARDS }]),
  );
  let goldLeft = QUOTE_COUNT - GOLD_FIRST_QUOTE_ID + 1;
  for (const record of ranked) {
    if (goldLeft === 0) break;
    const target = targets.get(record.path);
    target.gold = Math.min(GOLD_PER_GAME, goldLeft);
    target.plain = Math.max(0, MIN_REWARDS - target.gold);
    goldLeft -= target.gold;
  }

  const plainCount = TAO_COUNT + GOLD_FIRST_QUOTE_ID - 1;
  let spare =
    plainCount -
    [...targets.values()].reduce((sum, target) => sum + target.plain, 0);
  if (spare < 0) {
    throw new Error(
      `${records.length} nodes need ${-spare} more Tao chapters or white and black quotes.`,
    );
  }
  while (spare > 0) {
    const roomy = ranked.find((record) => {
      const target = targets.get(record.path);
      return target.gold + target.plain < REBALANCED_MAX_REWARDS;
    });
    if (!roomy) {
      throw new Error(
        `${spare} rewards do not fit within ${REBALANCED_MAX_REWARDS} per node.`,
      );
    }
    targets.get(roomy.path).plain += 1;
    spare -= 1;
  }

  // Keep what each game already holds, as far as its new share allows.
  const used = new Set();
  const maxId = { tao: TAO_COUNT, quote: QUOTE_COUNT };
  for (const record of ranked) {
    const target = targets.get(record.path);
    const previous = (existingByPath.get(record.path)?.rewards ?? [])
      .filter(
        (reward) =>
          reward.id >= 1 &&
          reward.id <= maxId[reward.type] &&
          !used.has(rewardKey(reward)),
      )
      .sort(compareRewards);
    record.rewards = [
      ...previous.filter(isGold).slice(0, target.gold),
      ...previous.filter((reward) => !isGold(reward)).slice(0, target.plain),
    ];
    record.rewards.forEach((reward) => used.add(rewardKey(reward)));
  }

  const unused = (type, first, last) =>
    Array.from({ length: last - first + 1 }, (_, index) => ({
      type,
      id: first + index,
    })).filter((reward) => !used.has(rewardKey(reward)));
  const goldPool = unused("quote", GOLD_FIRST_QUOTE_ID, QUOTE_COUNT);
  // Alternate Tao chapters and quotes so games get a mix.
  const taoPool = unused("tao", 1, TAO_COUNT);
  const quotePool = unused("quote", 1, GOLD_FIRST_QUOTE_ID - 1);
  const plainPool = [];
  while (taoPool.length > 0 || quotePool.length > 0) {
    if (taoPool.length > 0) plainPool.push(taoPool.shift());
    if (quotePool.length > 0) plainPool.push(quotePool.shift());
  }

  for (const record of ranked) {
    const target = targets.get(record.path);
    while (record.rewards.filter(isGold).length < target.gold) {
      record.rewards.push(goldPool.shift());
    }
    while (
      record.rewards.filter((reward) => !isGold(reward)).length < target.plain
    ) {
      record.rewards.push(plainPool.shift());
    }
    record.rewards.sort(compareRewards);
  }
}

// ── Validation and output ────────────────────────────────────────────────────

function validate(records) {
  const errors = [];
  const nearest = records.map((record) => nearestDistance(record, records));
  const minimum = Math.min(...nearest);
  const ratio = Math.max(...nearest) / minimum;
  if (minimum < MIN_SPACING) {
    errors.push(`minimum node spacing ${minimum.toFixed(4)} permits overlap`);
  }
  if (ratio < SPACING_RATIO.min || ratio > SPACING_RATIO.max) {
    errors.push(
      `nearest-node spacing ratio ${ratio.toFixed(2)} is outside ${SPACING_RATIO.min}-${SPACING_RATIO.max}`,
    );
  }
  for (const record of records) {
    if (
      record.connections.length < MIN_CONNECTIONS ||
      record.connections.length > MAX_CONNECTIONS
    ) {
      errors.push(
        `${record.path} has ${record.connections.length} connections`,
      );
    }
    if (
      record.rewards.length < MIN_REWARDS ||
      record.rewards.length > MAX_REWARDS
    ) {
      errors.push(`${record.path} has ${record.rewards.length} rewards`);
    }
  }
  if (errors.length > 0) throw new Error(errors.join("\n"));
}

const games = fs
  .readdirSync(gamesDirectory)
  .filter((filename) => filename.endsWith(".ts"))
  .map(parseGame)
  .sort(compareGames);

if (games[0]?.path !== FIXED_ORDER[0]) {
  throw new Error(`${FIXED_ORDER[0]} must exist as the first node.`);
}

const existing = readExistingNodes();
const existingByPath = new Map(existing.map((record) => [record.path, record]));
let records;
let summary;

if (rebuild || existing.length === 0) {
  records = layoutAll(games);
  summary = `Rebuilt ${records.length} nodes`;
} else {
  const result = extendMap(existing, games);
  records = result.records;
  summary =
    result.added.length > 0
      ? `Added ${result.added.map((game) => game.path).join(", ")} at the edge (${records.length} nodes)`
      : `No new games; kept all ${records.length} nodes`;
}

if (rebalance) {
  rebalanceRewards(
    records,
    existingByPath,
    new Map(games.map((game) => [game.path, game])),
  );
  summary += "; rebalanced rewards";
} else {
  assignRewards(records, existingByPath);
}
validate(records);

const output =
  `// Generated by scripts/generate-nodes-map.mjs. Coordinates and entries may be edited manually.\n` +
  `import type { NodeDefinition } from "./nodes-map";\n\n` +
  `export const NODE_DEFINITIONS: NodeDefinition[] = ${JSON.stringify(
    records.map(({ path: nodePath, x, y, connections, rewards }) => ({
      path: nodePath,
      x,
      y,
      connections,
      rewards,
    })),
    null,
    2,
  )};\n`;

fs.writeFileSync(outputPath, output);
console.log(`${summary} in ${path.relative(root, outputPath)}.`);
