import { describe, expect, jest, test } from "@jest/globals";
import fs from "fs";
import path from "path";
import {
  MAP_GEOMETRY,
  MIN_NODE_SPACING,
  NODES_START_PATH,
  NODE_DEFINITIONS,
  validateNodesMap,
} from "@/data/nodes-map";
import { GAMES_DATA } from "@/data/games-registry";
import { TAO_CHAPTER_COUNT } from "@/data/collectibles";

const generatorSource = fs.readFileSync(
  path.join(__dirname, "../../scripts/generate-nodes-map.mjs"),
  "utf8",
);

/** Reads a plain numeric constant out of the generator. */
function generatorNumber(name: string) {
  const match = generatorSource.match(
    new RegExp(`${name}:?\\s*=?\\s*([0-9.]+(?:\\s*\\*\\s*[0-9.]+)?)\\s*[,;]`),
  );
  expect(match).not.toBeNull();
  return Function(`return ${match![1]}`)() as number;
}

const distance = (
  left: { x: number; y: number },
  right: { x: number; y: number },
) => Math.hypot(left.x - right.x, left.y - right.y);

/** How hard a game is to beat repeatedly, matching the generator's grindScore. */
function grind(gamePath: string) {
  const rating = GAMES_DATA[gamePath]?.rating;
  if (!rating) return 0;
  return (
    0.5 * Math.max(rating.difficulty, rating.luck) +
    0.25 * (rating.difficulty + rating.luck)
  );
}

describe("Nodes map", () => {
  test("covers every game with a valid graph and rewards", () => {
    expect(validateNodesMap()).toEqual([]);
  });

  test("the generator and the app agree on the map's geometry", () => {
    expect(generatorNumber("const WORLD_SIZE")).toBe(MAP_GEOMETRY.worldSize);
    expect(generatorNumber("const NODE_DOT_DIAMETER")).toBe(
      MAP_GEOMETRY.nodeDotDiameter,
    );
    expect(generatorNumber("const MIN_SPACING_IN_DOTS")).toBe(
      MAP_GEOMETRY.minSpacingInDots,
    );
    expect(generatorNumber("  max")).toBe(MAP_GEOMETRY.maxConnections);
    expect(generatorNumber("  min")).toBe(MAP_GEOMETRY.minRewards);
  });

  test("no two nodes are closer than three node-dot diameters", () => {
    for (const node of NODE_DEFINITIONS) {
      for (const other of NODE_DEFINITIONS) {
        if (node.path === other.path) continue;
        expect(distance(node, other)).toBeGreaterThanOrEqual(MIN_NODE_SPACING);
      }
    }
  });

  test("Klondike is the centre of the galaxy", () => {
    const start = NODE_DEFINITIONS.find(
      (node) => node.path === NODES_START_PATH,
    );
    expect(start).toBeDefined();
    expect(Math.hypot(start!.x, start!.y)).toBe(0);
  });

  test("the nodes form spiral arms with field stars between them", () => {
    const arms = new Set(
      NODE_DEFINITIONS.map((node) => node.arm).filter(
        (arm): arm is number => arm !== null,
      ),
    );
    expect(arms.size).toBeGreaterThanOrEqual(4);

    // Each arm has to be substantial, or it reads as a stray cluster.
    for (const arm of arms) {
      const members = NODE_DEFINITIONS.filter((node) => node.arm === arm);
      expect(members.length).toBeGreaterThanOrEqual(8);
    }
    // And some nodes sit between the arms, so the gaps are not empty.
    expect(
      NODE_DEFINITIONS.filter((node) => node.arm === null).length,
    ).toBeGreaterThan(5);
  });

  test("gentler games sit nearer the centre than punishing ones", () => {
    const withRadius = NODE_DEFINITIONS.map((node) => ({
      radius: Math.hypot(node.x, node.y),
      grind: grind(node.path),
    })).sort((left, right) => left.radius - right.radius);

    const half = Math.floor(withRadius.length / 2);
    const inner = withRadius.slice(0, half);
    const outer = withRadius.slice(half);
    const mean = (list: { grind: number }[]) =>
      list.reduce((total, item) => total + item.grind, 0) / list.length;

    expect(mean(inner)).toBeLessThan(mean(outer));
  });

  test("every Tao chapter is awarded exactly once", () => {
    const chapters = NODE_DEFINITIONS.flatMap((node) =>
      node.rewards.filter((reward) => reward.type === "tao").map((r) => r.id),
    );
    expect(new Set(chapters).size).toBe(chapters.length);
    expect(chapters.length).toBe(TAO_CHAPTER_COUNT);
  });

  test("third rewards go to the games that are kindest to replay", () => {
    const three = NODE_DEFINITIONS.filter((node) => node.rewards.length === 3);
    const two = NODE_DEFINITIONS.filter((node) => node.rewards.length === 2);
    expect(three.length).toBeGreaterThan(0);

    // A third reward means beating the game three times, so none of them
    // should be harder than the gentlest game that only has two.
    const hardestWithThree = Math.max(...three.map((n) => grind(n.path)));
    const gentlestWithTwo = Math.min(...two.map((n) => grind(n.path)));
    expect(hardestWithThree).toBeLessThanOrEqual(gentlestWithTwo);
  });

  test("no single game locks away much of the map", () => {
    const byPath = new Map(NODE_DEFINITIONS.map((node) => [node.path, node]));
    const limit = Math.ceil(
      NODE_DEFINITIONS.length * MAP_GEOMETRY.maxGatedShare,
    );

    for (const blocked of NODE_DEFINITIONS) {
      if (blocked.path === NODES_START_PATH) continue;
      const reached = new Set<string>();
      const queue = [NODES_START_PATH];
      while (queue.length > 0) {
        const current = queue.pop()!;
        if (current === blocked.path || reached.has(current)) continue;
        reached.add(current);
        for (const next of byPath.get(current)!.connections) {
          if (next !== blocked.path && !reached.has(next)) queue.push(next);
        }
      }
      expect(NODE_DEFINITIONS.length - 1 - reached.size).toBeLessThanOrEqual(
        limit,
      );
    }
  });

  test("flags authoring mistakes instead of always passing", () => {
    jest.resetModules();
    jest.doMock("@/data/games-registry", () => {
      const games = [
        { path: "/klondike" },
        { path: "/beehive" },
        { path: "/freecell" },
      ];
      return {
        GAME_DEFINITIONS: games,
        GAMES_DATA: Object.fromEntries(games.map((game) => [game.path, game])),
      };
    });
    jest.doMock("@/data/nodes-map.generated", () => ({
      NODE_DEFINITIONS: [
        {
          path: "/klondike",
          x: 0,
          y: 0,
          arm: null,
          // One link over whatever the limit currently is.
          connections: [
            "/beehive",
            ...Array.from(
              { length: MAP_GEOMETRY.maxConnections },
              (_, index) => `/filler-${index}`,
            ),
          ],
          // Duplicate reward id: should trip the duplicate-reward rule.
          rewards: [
            { type: "tao", id: 1 },
            { type: "tao", id: 1 },
          ],
        },
        {
          path: "/beehive",
          x: 0.004,
          y: 0,
          // Not a whole number, and far too close to /klondike.
          arm: 1.5,
          // /klondike lists /beehive, but not the other way about.
          connections: ["/does-not-exist"],
          rewards: [
            { type: "quote", id: 1 },
            { type: "quote", id: 99999 },
          ],
        },
        // /freecell is a real game left off the map entirely.
      ],
    }));

    // nodes-map.ts throws at import time in dev if the map is invalid; this
    // test's whole point is to feed it an invalid map, so disable that
    // self-check just for this import.
    const devGlobal = globalThis as typeof globalThis & { __DEV__: boolean };
    const originalDev = devGlobal.__DEV__;
    devGlobal.__DEV__ = false;
    let errors: string[];
    try {
      const { validateNodesMap: validateBrokenMap } = jest.requireActual<
        typeof import("@/data/nodes-map")
      >("@/data/nodes-map");
      errors = validateBrokenMap();
    } finally {
      devGlobal.__DEV__ = originalDev;
      jest.dontMock("@/data/games-registry");
      jest.dontMock("@/data/nodes-map.generated");
      jest.resetModules();
    }

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          `must have 1 to ${MAP_GEOMETRY.maxConnections} connections`,
        ),
        expect.stringContaining("Duplicate tao reward"),
        expect.stringContaining("connects to unknown node"),
        expect.stringContaining("is not symmetric"),
        expect.stringContaining("has an unknown quote 99999"),
        expect.stringContaining("Missing node for /freecell"),
        expect.stringContaining("has an invalid arm"),
        expect.stringContaining("is under the"),
        expect.stringContaining("Tao chapter 2 is not awarded"),
      ]),
    );
  });
});
