import { describe, expect, jest, test } from "@jest/globals";
import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";
import {
  MAP_GEOMETRY,
  MIN_GAME_DOT_SPACING,
  CAMPAIGN_START_PATH,
  HUB_EXTRA_LINKS,
  GAME_DOT_DEFINITIONS,
  LAYOUT_FINGERPRINT,
  validateCampaignMap,
} from "@/data/campaign-map";
import { GAMES_DATA } from "@/data/games-registry";
import { TAO_CHAPTER_COUNT } from "@/data/collectibles";

const generatorSource = fs.readFileSync(
  path.join(__dirname, "../../scripts/generate-campaign-map.mjs"),
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

/** How far out a game belongs, matching the generator's progressionScore. */
function progression(gamePath: string) {
  const rating = GAMES_DATA[gamePath]!.rating;
  return 0.75 * rating.difficulty + 0.25 * rating.complexity;
}

const isLocalOnly = (gamePath: string) =>
  !!GAMES_DATA[gamePath]?.enabledOnLocalOnly;

/** The map as release builds show it, without local-only games. */
const RELEASED = GAME_DOT_DEFINITIONS.filter(
  (gameDot) => !isLocalOnly(gameDot.path),
).map((gameDot) => ({
  ...gameDot,
  connections: gameDot.connections.filter((path) => !isLocalOnly(path)),
}));

/** The games that can only be reached through `gate`. */
function gatedBy(gameDots: typeof RELEASED, gate: string) {
  const byPath = new Map(gameDots.map((gameDot) => [gameDot.path, gameDot]));
  const reached = new Set<string>();
  const queue = [CAMPAIGN_START_PATH];
  while (queue.length > 0) {
    const current = queue.pop()!;
    if (current === gate || reached.has(current)) continue;
    reached.add(current);
    for (const next of byPath.get(current)!.connections) {
      if (!reached.has(next)) queue.push(next);
    }
  }
  return gameDots.filter(
    (gameDot) => gameDot.path !== gate && !reached.has(gameDot.path),
  );
}

/**
 * The layout rules (which game sits where, and which get a Tao chapter) are
 * what a rebuild fits the map to. Once games are added at the rim, removed or
 * re-rated, the locked map stays as it is and can't be held to them any more,
 * so they are only checked while the games are the ones it was laid out for.
 */
const AS_LAID_OUT =
  execFileSync(
    process.execPath,
    [
      path.join(__dirname, "../../scripts/generate-campaign-map.mjs"),
      "--fingerprint",
    ],
    { cwd: path.join(__dirname, "../.."), encoding: "utf8" },
  ).trim() === LAYOUT_FINGERPRINT;
const layoutTest = AS_LAID_OUT ? test : test.skip;

const hasTao = (gameDot: (typeof GAME_DOT_DEFINITIONS)[number]) =>
  gameDot.rewards.some((reward) => reward.type === "tao");

describe("Campaign map", () => {
  test("covers every game with a valid graph and rewards", () => {
    expect(validateCampaignMap()).toEqual([]);
  });

  test("the generator and the app agree on the map's geometry", () => {
    expect(generatorNumber("const WORLD_SIZE")).toBe(MAP_GEOMETRY.worldSize);
    expect(generatorNumber("const GAME_DOT_DIAMETER")).toBe(
      MAP_GEOMETRY.gameDotDiameter,
    );
    expect(generatorNumber("const MIN_SPACING_IN_DOTS")).toBe(
      MAP_GEOMETRY.minSpacingInDots,
    );
    expect(generatorNumber("  max")).toBe(MAP_GEOMETRY.maxConnections);
    expect(generatorNumber("  min")).toBe(MAP_GEOMETRY.minRewards);
  });

  test("no two nodes are closer than three dot diameters", () => {
    for (const gameDot of GAME_DOT_DEFINITIONS) {
      for (const other of GAME_DOT_DEFINITIONS) {
        if (gameDot.path === other.path) continue;
        expect(distance(gameDot, other)).toBeGreaterThanOrEqual(
          MIN_GAME_DOT_SPACING,
        );
      }
    }
  });

  test("Klondike is the centre of the galaxy", () => {
    const start = GAME_DOT_DEFINITIONS.find(
      (gameDot) => gameDot.path === CAMPAIGN_START_PATH,
    );
    expect(start).toBeDefined();
    expect(Math.hypot(start!.x, start!.y)).toBe(0);
  });

  test("the nodes form spiral arms with field stars between them", () => {
    const arms = new Set(
      GAME_DOT_DEFINITIONS.map((gameDot) => gameDot.arm).filter(
        (arm): arm is number => arm !== null,
      ),
    );
    expect(arms.size).toBeGreaterThanOrEqual(4);

    // Each arm has to be substantial, or it reads as a stray cluster.
    for (const arm of arms) {
      const members = GAME_DOT_DEFINITIONS.filter(
        (gameDot) => gameDot.arm === arm,
      );
      expect(members.length).toBeGreaterThanOrEqual(8);
    }
    // And some game dots sit between the arms, so the gaps are not empty.
    expect(
      GAME_DOT_DEFINITIONS.filter((gameDot) => gameDot.arm === null).length,
    ).toBeGreaterThan(5);
  });

  layoutTest("gentler games sit nearer the centre than punishing ones", () => {
    const withRadius = RELEASED.map((gameDot) => ({
      radius: Math.hypot(gameDot.x, gameDot.y),
      score: progression(gameDot.path),
    })).sort((left, right) => left.radius - right.radius);

    const quarter = Math.floor(withRadius.length / 4);
    const mean = (list: { score: number }[]) =>
      list.reduce((total, item) => total + item.score, 0) / list.length;
    const quarters = [0, 1, 2, 3].map((index) =>
      mean(withRadius.slice(index * quarter, (index + 1) * quarter)),
    );
    for (let index = 1; index < quarters.length; index += 1) {
      expect(quarters[index]).toBeGreaterThan(quarters[index - 1]);
    }
  });

  layoutTest("no game is the only way through to an easier one", () => {
    for (const gate of RELEASED) {
      if (gate.path === CAMPAIGN_START_PATH) continue;
      const gateDifficulty = GAMES_DATA[gate.path]!.rating.difficulty;
      for (const blocked of gatedBy(RELEASED, gate.path)) {
        expect({
          gate: gate.path,
          blocked: blocked.path,
          easier: GAMES_DATA[blocked.path]!.rating.difficulty < gateDifficulty,
        }).toEqual({ gate: gate.path, blocked: blocked.path, easier: false });
      }
    }
  });

  layoutTest("the first games are each of a different category", () => {
    const byPath = new Map(RELEASED.map((gameDot) => [gameDot.path, gameDot]));
    // The layout's own links: Klondike's hand-added ones don't count.
    const handAdded = (from: string, to: string) =>
      [from, to].includes(CAMPAIGN_START_PATH) &&
      [from, to].some((path) => HUB_EXTRA_LINKS.includes(path));
    const near = new Set([CAMPAIGN_START_PATH]);
    for (let step = 0; step < 2; step += 1) {
      for (const path of [...near]) {
        byPath
          .get(path)!
          .connections.filter((next) => !handAdded(path, next))
          .forEach((next) => near.add(next));
      }
    }
    const categories = [...near].map((path) => GAMES_DATA[path]!.tags[0]);
    expect(near.size).toBeGreaterThanOrEqual(6);
    expect(new Set(categories).size).toBe(categories.length);
  });

  layoutTest(
    "local-only games sit on the rim as dead ends, without Tao chapters",
    () => {
      const byRadius = [...GAME_DOT_DEFINITIONS].sort(
        (left, right) =>
          Math.hypot(left.x, left.y) - Math.hypot(right.x, right.y),
      );
      const local = GAME_DOT_DEFINITIONS.filter((gameDot) =>
        isLocalOnly(gameDot.path),
      );
      expect(local.length).toBeGreaterThan(0);
      for (const gameDot of local) {
        expect(byRadius.indexOf(gameDot)).toBeGreaterThanOrEqual(
          Math.floor(byRadius.length * 0.7),
        );
        expect(hasTao(gameDot)).toBe(false);
        // Nothing else is reached only through it.
        expect(gatedBy(GAME_DOT_DEFINITIONS, gameDot.path)).toEqual([]);
      }
    },
  );

  test("every Tao chapter is awarded exactly once", () => {
    const chapters = GAME_DOT_DEFINITIONS.flatMap((gameDot) =>
      gameDot.rewards
        .filter((reward) => reward.type === "tao")
        .map((r) => r.id),
    );
    expect(new Set(chapters).size).toBe(chapters.length);
    expect(chapters.length).toBe(TAO_CHAPTER_COUNT);
  });

  layoutTest("Tao chapters go one each to the easiest games", () => {
    const withTao = RELEASED.filter(hasTao);
    const without = RELEASED.filter((gameDot) => !hasTao(gameDot));
    for (const gameDot of GAME_DOT_DEFINITIONS) {
      expect(
        gameDot.rewards.filter((reward) => reward.type === "tao").length,
      ).toBeLessThanOrEqual(1);
    }
    const hardestWithTao = Math.max(
      ...withTao.map((gameDot) => progression(gameDot.path)),
    );
    const easiestWithout = Math.min(
      ...without.map((gameDot) => progression(gameDot.path)),
    );
    expect(hardestWithTao).toBeLessThanOrEqual(easiestWithout);
  });

  // The lock is checked in saved-data-guard.test.ts.

  test("no single game locks away much of the map", () => {
    const byPath = new Map(
      GAME_DOT_DEFINITIONS.map((gameDot) => [gameDot.path, gameDot]),
    );
    const limit = Math.ceil(
      GAME_DOT_DEFINITIONS.length * MAP_GEOMETRY.maxGatedShare,
    );

    for (const blocked of GAME_DOT_DEFINITIONS) {
      if (blocked.path === CAMPAIGN_START_PATH) continue;
      const reached = new Set<string>();
      const queue = [CAMPAIGN_START_PATH];
      while (queue.length > 0) {
        const current = queue.pop()!;
        if (current === blocked.path || reached.has(current)) continue;
        reached.add(current);
        for (const next of byPath.get(current)!.connections) {
          if (next !== blocked.path && !reached.has(next)) queue.push(next);
        }
      }
      expect(
        GAME_DOT_DEFINITIONS.length - 1 - reached.size,
      ).toBeLessThanOrEqual(limit);
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
    jest.doMock("@/data/campaign-map.generated", () => ({
      HUB_EXTRA_LINKS: [],
      LAYOUT_FINGERPRINT: "",
      GAME_DOT_DEFINITIONS: [
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

    // campaign-map.ts throws at import time in dev if the map is invalid; this
    // test's whole point is to feed it an invalid map, so disable that
    // self-check just for this import.
    const devGlobal = globalThis as typeof globalThis & { __DEV__: boolean };
    const originalDev = devGlobal.__DEV__;
    devGlobal.__DEV__ = false;
    let errors: string[];
    try {
      const { validateCampaignMap: validateBrokenMap } = jest.requireActual<
        typeof import("@/data/campaign-map")
      >("@/data/campaign-map");
      errors = validateBrokenMap();
    } finally {
      devGlobal.__DEV__ = originalDev;
      jest.dontMock("@/data/games-registry");
      jest.dontMock("@/data/campaign-map.generated");
      jest.resetModules();
    }

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          `must have 1 to ${MAP_GEOMETRY.maxConnections} connections`,
        ),
        expect.stringContaining("Duplicate tao reward"),
        expect.stringContaining("connects to unknown game dot"),
        expect.stringContaining("is not symmetric"),
        expect.stringContaining("has an unknown quote 99999"),
        expect.stringContaining("Missing game dot for /freecell"),
        expect.stringContaining("has an invalid arm"),
        expect.stringContaining("is under the"),
        expect.stringContaining("Tao chapter 2 is not awarded"),
      ]),
    );
  });
});
