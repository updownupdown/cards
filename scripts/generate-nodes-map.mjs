import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const gamesDirectory = path.join(root, "src/data/games");
const outputPath = path.join(root, "src/data/nodes-map.generated.ts");

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
  const tags = [...source.matchAll(/GameTag\.([A-Za-z]+)/g)].map(
    (match) => match[1],
  );

  if (!gamePath || !Number.isFinite(difficulty) || tags.length === 0) {
    throw new Error(`Could not parse node metadata from ${filename}.`);
  }

  return { path: gamePath, difficulty, tags: [...new Set(tags)] };
}

const games = fs
  .readdirSync(gamesDirectory)
  .filter((filename) => filename.endsWith(".ts"))
  .map(parseGame)
  .sort(
    (left, right) =>
      left.difficulty - right.difficulty || left.path.localeCompare(right.path),
  );

if (games.length !== 100) {
  throw new Error(`Expected 100 games, found ${games.length}.`);
}

const goldenAngle = Math.PI * (3 - Math.sqrt(5));
const outerGames = games.filter((game) => game.path !== "/klondike");
const coordinateByPath = new Map([["/klondike", { x: 0, y: 0 }]]);

outerGames.forEach((game, index) => {
  const equalAreaRadius = 0.92 * Math.sqrt((index + 1) / outerGames.length);
  const candidates = Array.from({ length: 32 }, (_, candidateIndex) => {
    const radialNoise =
      (hash(`${game.path}:radius:${candidateIndex}`) % 1000) / 999 - 0.5;
    const angularNoise =
      (hash(`${game.path}:angle:${candidateIndex}`) % 1000) / 999 - 0.5;
    const radius = equalAreaRadius * (1 + radialNoise * 0.2);
    const angle = index * goldenAngle + angularNoise * 0.55;

    return {
      x: Number((Math.cos(angle) * radius).toFixed(4)),
      y: Number((Math.sin(angle) * radius).toFixed(4)),
    };
  }).filter((candidate) =>
    [...coordinateByPath.values()].every(
      (existing) => distance(candidate, existing) >= 0.094,
    ),
  );

  if (candidates.length === 0) {
    throw new Error(
      `Could not place ${game.path} without reducing node spacing.`,
    );
  }

  coordinateByPath.set(
    game.path,
    candidates[hash(game.path) % candidates.length],
  );
});
const placements = games.map((game) => ({
  ...game,
  ...coordinateByPath.get(game.path),
}));

const connections = new Map(placements.map((game) => [game.path, new Set()]));

function distance(left, right) {
  return Math.hypot(left.x - right.x, left.y - right.y);
}

function connect(leftPath, rightPath) {
  if (leftPath === rightPath) return false;
  const left = connections.get(leftPath);
  const right = connections.get(rightPath);
  if (left.has(rightPath) || left.size >= 5 || right.size >= 5) return false;
  left.add(rightPath);
  right.add(leftPath);
  return true;
}

const outward = [...placements].sort(
  (left, right) => Math.hypot(left.x, left.y) - Math.hypot(right.x, right.y),
);

for (let index = 1; index < outward.length; index += 1) {
  const game = outward[index];
  const inwardCandidates = outward
    .slice(0, index)
    .sort((left, right) => distance(game, left) - distance(game, right));
  if (
    !inwardCandidates.some((candidate) => connect(game.path, candidate.path))
  ) {
    throw new Error(`Could not connect ${game.path} to the inner graph.`);
  }
}

for (const game of outward) {
  while (connections.get(game.path).size < 2) {
    const candidates = [...placements].sort(
      (left, right) => distance(game, left) - distance(game, right),
    );
    if (!candidates.some((candidate) => connect(game.path, candidate.path))) {
      throw new Error(`Could not give ${game.path} at least two connections.`);
    }
  }
}

const requiredBypasses = [["/ouroboros", "/baroness"]];
for (const [leftPath, rightPath] of requiredBypasses) {
  if (!connect(leftPath, rightPath)) {
    throw new Error(
      `Could not add required bypass ${leftPath} -> ${rightPath}.`,
    );
  }
}

function componentsWithout(blockedPath) {
  const visited = new Set([blockedPath]);
  const components = [];

  for (const game of placements) {
    if (visited.has(game.path)) continue;
    const component = [];
    const pending = [game.path];
    visited.add(game.path);

    while (pending.length > 0) {
      const path = pending.pop();
      component.push(path);
      for (const connection of connections.get(path)) {
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

while (true) {
  const bottleneck = placements.find(
    (game) => componentsWithout(game.path).length > 1,
  );
  if (!bottleneck) break;

  const components = componentsWithout(bottleneck.path);
  const candidates = [];
  for (let leftIndex = 0; leftIndex < components.length; leftIndex += 1) {
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < components.length;
      rightIndex += 1
    ) {
      for (const leftPath of components[leftIndex]) {
        for (const rightPath of components[rightIndex]) {
          if (
            connections.get(leftPath).size < 5 &&
            connections.get(rightPath).size < 5
          ) {
            candidates.push({
              leftPath,
              rightPath,
              distance: distance(
                placements.find((game) => game.path === leftPath),
                placements.find((game) => game.path === rightPath),
              ),
            });
          }
        }
      }
    }
  }

  candidates.sort((left, right) => left.distance - right.distance);
  const bypass = candidates[0];
  if (!bypass || !connect(bypass.leftPath, bypass.rightPath)) {
    throw new Error(
      `Could not bypass progression bottleneck ${bottleneck.path}.`,
    );
  }
}

const hardGames = games.filter((game) => game.difficulty >= 80);
const taoGames = new Set([
  ...hardGames.map((game) => game.path),
  ...games
    .filter((game) => game.difficulty < 80)
    .slice(0, 81 - hardGames.length)
    .map((game) => game.path),
]);

let taoId = 1;
let quoteId = 1;
const records = placements.map((game) => {
  const rewards = [];
  if (taoGames.has(game.path)) rewards.push({ type: "tao", id: taoId++ });

  const quoteCount = game.difficulty <= 35 ? 2 : game.difficulty <= 76 ? 1 : 0;
  for (let index = 0; index < quoteCount; index += 1) {
    rewards.push({ type: "quote", id: quoteId++ });
  }

  return {
    path: game.path,
    x: game.x,
    y: game.y,
    connections: [...connections.get(game.path)].sort(),
    rewards,
  };
});

const errors = [];
if (taoId !== 82) errors.push(`assigned ${taoId - 1} Tao chapters`);
if (quoteId !== 105) errors.push(`assigned ${quoteId - 1} quotes`);
const nearestDistances = placements.map((placement) =>
  Math.min(
    ...placements
      .filter((candidate) => candidate.path !== placement.path)
      .map((candidate) => distance(placement, candidate)),
  ),
);
const minimumSpacing = Math.min(...nearestDistances);
const maximumSpacing = Math.max(...nearestDistances);
if (minimumSpacing < 0.094) {
  errors.push(
    `minimum node spacing ${minimumSpacing.toFixed(4)} permits overlap`,
  );
}
if (maximumSpacing / minimumSpacing < 2.2) {
  errors.push(
    `nearest-node spacing ratio ${(maximumSpacing / minimumSpacing).toFixed(2)} is too uniform`,
  );
}
if (maximumSpacing / minimumSpacing > 3) {
  errors.push(
    `nearest-node spacing ratio ${(maximumSpacing / minimumSpacing).toFixed(2)} exceeds 3`,
  );
}
for (const record of records) {
  if (record.connections.length < 2 || record.connections.length > 5) {
    errors.push(`${record.path} has degree ${record.connections.length}`);
  }
  if (record.rewards.length < 1 || record.rewards.length > 3) {
    errors.push(`${record.path} has ${record.rewards.length} rewards`);
  }
}
if (errors.length > 0) throw new Error(errors.join("\n"));

const output =
  `// Generated by scripts/generate-nodes-map.mjs. Coordinates and entries may be edited manually.\n` +
  `import type { NodeDefinition } from "./nodes-map";\n\n` +
  `export const NODE_DEFINITIONS: NodeDefinition[] = ${JSON.stringify(records, null, 2)};\n`;

fs.writeFileSync(outputPath, output);
console.log(
  `Generated ${records.length} nodes at ${path.relative(root, outputPath)}.`,
);
