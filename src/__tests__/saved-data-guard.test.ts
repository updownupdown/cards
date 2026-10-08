// Guards players' saved data: favourites, settings, stats, campaign progress
// and collectibles. Everything a player keeps is stored under a key, points at
// a game by its path, or points at a quote or Tao chapter by its number, so
// renaming a key, dropping a game, reordering the quotes or changing a loader
// can silently wipe it on their next launch.
//
// If a test here fails, STOP and ask the owner before going on. Don't update
// the pins or the golden save to make it pass: add a migration instead (see
// MOVED_GAME_PATHS in src/data/game-variants.ts and the version migrations in
// src/data/campaign-progress.ts). See "Locked: players' saved data" in
// AGENTS.md.
//
// A game the owner has agreed to remove is listed in RETIRED_GAME_PATHS (and
// its settings in RETIRED_GAME_SETTINGS) in src/data/game-variants.ts: what
// saves hold for it is dropped, and its pins here are let go. Its place on the
// map and its rewards are handled by `npm run campaign:generate`, which hands
// the rewards to other games. One replaced by a different game is listed in
// REPLACED_GAME_PATHS: the same, but the new game takes its node.
//
// saved-data/contract.json pins what saves refer to. Additions pass; to pin
// them too, run `npm run saved-data:pin`, which only ever adds. Removing a pin
// is a hand edit, made only with the owner's OK.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { describe, expect, jest, test } from "@jest/globals";
import { execFileSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { loadCampaignProgress } from "@/data/campaign-progress";
import { GAME_DOT_DEFINITIONS } from "@/data/campaign-map";
import { QUOTE_COUNT, TAO_CHAPTER_COUNT, getQuote } from "@/data/collectibles";
import {
  DEFAULT_GAME_SETTINGS,
  DEFAULT_GLOBAL_SETTINGS,
  GAME_SETTINGS_STORAGE_KEY,
  type GlobalSettings,
} from "@/data/game-menu";
import {
  MOVED_GAME_PATHS,
  REPLACED_GAME_PATHS,
  RETIRED_GAME_PATHS,
  RETIRED_GAME_SETTINGS,
  currentGamePath,
} from "@/data/game-variants";
import { GAMES_DATA } from "@/data/games-registry";
import {
  CAMPAIGN_PROGRESS_STORAGE_KEY,
  GLOBAL_SETTINGS_STORAGE_KEY,
} from "@/data/storage-keys";
import { COLOR_THEMES } from "@/styles/themes";

const repoRoot = path.join(__dirname, "../..");
const contractPath = path.join(__dirname, "saved-data/contract.json");
const goldenSavePath = path.join(__dirname, "saved-data/golden-save.json");
const lockPath = path.join(repoRoot, "src/data/campaign-map.lock.json");
const PINNING = process.env.PIN_SAVED_DATA === "1";

const STOP =
  "\n\n⚠ STOP: this change can wipe players' saved data (favourites, " +
  "settings, stats, campaign progress or collectibles). Ask the owner before " +
  "going on, and migrate old saves rather than updating this test. See " +
  "src/__tests__/saved-data-guard.test.ts.\n\n";

/** Fails with the STOP banner and a list of what would be lost. */
function expectNothingLost(problems: string[]) {
  if (problems.length > 0) {
    throw new Error(`${STOP}${problems.map((p) => `  - ${p}`).join("\n")}\n`);
  }
}

type Contract = {
  note: string;
  storageKeys: string[];
  gamePaths: string[];
  quoteAuthors: Record<string, string>;
  taoChapterCount: number;
  colorThemes: string[];
  globalSettings: string[];
  gameSettings: string[];
  gameStats: string[];
  campaignProgressVersion: number;
};

// ========== What the code refers to today ========== //

function sourceFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return entry.name === "__tests__" ? [] : sourceFiles(full);
    }
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

/** Every "cards.something.vN" storage key written anywhere in the app. */
function currentStorageKeys() {
  const keys = new Set<string>();
  for (const file of sourceFiles(path.join(repoRoot, "src"))) {
    const source = fs.readFileSync(file, "utf8");
    for (const match of source.matchAll(/["'`](cards\.[\w.]+\.v\d+)["'`]/g)) {
      keys.add(match[1]);
    }
  }
  return [...keys].sort();
}

/** Games a release build offers: the ones players can have data for. */
const releasedGamePaths = () =>
  Object.entries(GAMES_DATA)
    .filter(([, game]) => !game.enabledOnLocalOnly)
    .map(([gamePath]) => gamePath)
    .sort();

function currentContract(): Omit<Contract, "note"> {
  return {
    storageKeys: currentStorageKeys(),
    gamePaths: releasedGamePaths(),
    quoteAuthors: Object.fromEntries(
      Array.from({ length: QUOTE_COUNT }, (_, i) => [
        String(i + 1),
        getQuote(i + 1)!.author,
      ]),
    ),
    taoChapterCount: TAO_CHAPTER_COUNT,
    colorThemes: COLOR_THEMES.map((theme) => theme.id).sort(),
    globalSettings: Object.keys(DEFAULT_GLOBAL_SETTINGS).sort(),
    gameSettings: Object.keys(DEFAULT_GAME_SETTINGS).sort(),
    gameStats: Object.keys(DEFAULT_GAME_SETTINGS.stats).sort(),
    campaignProgressVersion: 4,
  };
}

const union = (left: string[], right: string[]) =>
  [...new Set([...left, ...right])].sort();

/** The pinned contract, extended with today's additions when pinning. */
function readContract(): Contract {
  const pinned = JSON.parse(fs.readFileSync(contractPath, "utf8")) as Contract;
  if (!PINNING) return pinned;

  const now = currentContract();
  const extended: Contract = {
    ...pinned,
    storageKeys: union(pinned.storageKeys, now.storageKeys),
    gamePaths: union(pinned.gamePaths, now.gamePaths),
    quoteAuthors: { ...now.quoteAuthors, ...pinned.quoteAuthors },
    taoChapterCount: Math.max(pinned.taoChapterCount, now.taoChapterCount),
    colorThemes: union(pinned.colorThemes, now.colorThemes),
    globalSettings: union(pinned.globalSettings, now.globalSettings),
    gameSettings: union(pinned.gameSettings, now.gameSettings),
    gameStats: union(pinned.gameStats, now.gameStats),
  };
  fs.writeFileSync(contractPath, `${JSON.stringify(extended, null, 2)}\n`);
  return extended;
}

const contract = readContract();
const now = currentContract();

/** Pinned games still in the app, under whatever path they have now. */
const livingGamePaths = contract.gamePaths.filter(
  (gamePath) =>
    !RETIRED_GAME_PATHS.includes(gamePath) && !REPLACED_GAME_PATHS[gamePath],
);

// ========== The pins ========== //

describe("Saved data: what saves refer to still exists", () => {
  test("storage keys are never renamed or dropped", () => {
    expectNothingLost(
      contract.storageKeys
        .filter((key) => !now.storageKeys.includes(key))
        .map(
          (key) =>
            `storage key "${key}" is no longer used: everything saved under it would be lost`,
        ),
    );
  });

  test("every released game still exists, has moved to a game that does, or was retired", () => {
    expectNothingLost(
      livingGamePaths.flatMap((gamePath) => {
        const target = currentGamePath(gamePath);
        if (GAMES_DATA[target]) return [];
        return MOVED_GAME_PATHS[gamePath]
          ? [`${gamePath} moved to ${target}, which doesn't exist`]
          : [
              `${gamePath} is gone: its stats, favourite and campaign wins would be lost (add it to MOVED_GAME_PATHS if it was renamed or merged; only with the owner's OK, to REPLACED_GAME_PATHS if a different game takes its place, or RETIRED_GAME_PATHS to remove it)`,
            ];
      }),
    );
  });

  test("a retired game is really gone, and not also moved", () => {
    expect(
      RETIRED_GAME_PATHS.filter(
        (gamePath) => GAMES_DATA[gamePath] || MOVED_GAME_PATHS[gamePath],
      ),
    ).toEqual([]);
    expect(
      RETIRED_GAME_SETTINGS.filter((field) => field in DEFAULT_GAME_SETTINGS),
    ).toEqual([]);
  });

  test("a replaced game is really gone, and the game in its place is new", () => {
    expect(
      Object.entries(REPLACED_GAME_PATHS).flatMap(([gamePath, successor]) => [
        ...(GAMES_DATA[gamePath] ||
        MOVED_GAME_PATHS[gamePath] ||
        RETIRED_GAME_PATHS.includes(gamePath)
          ? [`${gamePath} is replaced but still a game, moved or retired`]
          : []),
        ...(!GAMES_DATA[successor]
          ? [`${gamePath} is replaced by ${successor}, which isn't a game`]
          : []),
      ]),
    ).toEqual([]);
  });

  test("released games stay released", () => {
    expectNothingLost(
      contract.gamePaths
        .filter((gamePath) => GAMES_DATA[gamePath]?.enabledOnLocalOnly)
        .map(
          (gamePath) =>
            `${gamePath} was released but is now local-only: players would lose sight of its stats and campaign wins`,
        ),
    );
  });

  test("quote numbers keep their quotes", () => {
    // Collected quotes are saved by number, so inserting, removing or
    // reordering quotes hands players different quotes.
    expectNothingLost(
      Object.entries(contract.quoteAuthors).flatMap(([id, author]) => {
        const quote = getQuote(Number(id));
        if (!quote) return [`quote ${id} (${author}) is gone`];
        return quote.author === author
          ? []
          : [`quote ${id} was by ${author} and is now by ${quote.author}`];
      }),
    );
  });

  test("no Tao chapter is taken away", () => {
    expectNothingLost(
      TAO_CHAPTER_COUNT >= contract.taoChapterCount
        ? []
        : [
            `there were ${contract.taoChapterCount} Tao chapters and now there are ${TAO_CHAPTER_COUNT}`,
          ],
    );
  });

  test("saved colour themes still exist", () => {
    expectNothingLost(
      contract.colorThemes
        .filter((id) => !now.colorThemes.includes(id))
        .map((id) => `colour theme "${id}" is gone: players using it lose it`),
    );
  });

  test("settings and stats fields are never renamed or dropped", () => {
    const missing = (kind: string, pinned: string[], current: string[]) =>
      pinned
        .filter((field) => !current.includes(field))
        .map((field) => `${kind} "${field}" is gone: saved values are lost`);

    expectNothingLost([
      ...missing("global setting", contract.globalSettings, now.globalSettings),
      ...missing(
        "game setting",
        contract.gameSettings.filter(
          (field) => !RETIRED_GAME_SETTINGS.includes(field),
        ),
        now.gameSettings,
      ),
      ...missing("game stat", contract.gameStats, now.gameStats),
    ]);
  });

  test("campaign progress is still read at the pinned version", async () => {
    // A new version must migrate the old one (see campaign-progress.ts); bump
    // campaignProgressVersion in the contract once it does.
    await AsyncStorage.clear();
    const progress = await loadCampaignProgress();
    expectNothingLost(
      progress.version === contract.campaignProgressVersion
        ? []
        : [
            `campaign progress is now version ${progress.version}, pinned at ${contract.campaignProgressVersion}: check old saves migrate, then bump the pin`,
          ],
    );
  });
});

// ========== Golden saves ========== //

type App = {
  menu: typeof import("@/data/game-menu");
  campaign: typeof import("@/data/campaign-progress");
  daily: typeof import("@/data/game-of-the-day");
};

/**
 * Starts the app afresh on a device holding `storage` (raw values by key),
 * as a player's next launch would: no settings cached in memory.
 */
async function launchApp(storage: Record<string, unknown>): Promise<App> {
  /* eslint-disable @typescript-eslint/no-require-imports */
  jest.resetModules();
  const storageModule = require("@react-native-async-storage/async-storage");
  const freshStorage: typeof AsyncStorage =
    storageModule.default ?? storageModule;
  await freshStorage.clear();
  await freshStorage.multiSet(
    Object.entries(storage).map(([key, value]) => [key, JSON.stringify(value)]),
  );
  return {
    menu: require("@/data/game-menu"),
    campaign: require("@/data/campaign-progress"),
    daily: require("@/data/game-of-the-day"),
  };
  /* eslint-enable @typescript-eslint/no-require-imports */
}

/**
 * What the golden save's five wins had open on the September 2026 map, read
 * off that map by hand. A later map may open more; it must never open less.
 */
// The games the save had open, and those its wins open on the current map
// (redone in October 2026, which opened a few more).
const GOLDEN_UNLOCKED_PATHS = [
  "/bakers-dozen",
  "/beehive",
  "/blackberry-pie",
  "/boiling-over",
  "/bowling",
  "/crescent",
  "/delta-21",
  "/diplomat",
  "/eight-off",
  "/fifteen-puzzle",
  "/freecell",
  "/frog",
  "/golf",
  "/grandfathers-clock",
  "/klondike",
  "/memory",
  "/ouroboros",
  "/penguin",
  "/pocket-poker",
  "/red-diamond",
  "/simple-simon",
  "/stalactites",
  "/sultan",
  "/three-peaks",
  "/tower-of-hanoi",
  "/twelve-trials",
  "/yukon",
];

describe("Saved data: an existing player's save loads intact", () => {
  const golden = JSON.parse(fs.readFileSync(goldenSavePath, "utf8")) as {
    storage: Record<string, unknown>;
  };

  test("the golden save is stored under keys the app still reads", () => {
    expectNothingLost(
      Object.keys(golden.storage)
        .filter((key) => !now.storageKeys.includes(key))
        .map((key) => `the golden save's "${key}" is no longer read`),
    );
  });

  test("settings", async () => {
    const { menu } = await launchApp(golden.storage);
    const saved = golden.storage[GLOBAL_SETTINGS_STORAGE_KEY] as GlobalSettings;

    expect(await menu.loadGlobalSettings()).toEqual(saved);
    // The golden save changes every setting, so a loader that resets one to
    // its default can't hide.
    for (const [field, value] of Object.entries(DEFAULT_GLOBAL_SETTINGS)) {
      expect({
        field,
        value: saved[field as keyof GlobalSettings],
      }).not.toEqual({ field, value });
    }
  });

  test("favourites", async () => {
    const { menu } = await launchApp(golden.storage);

    expect([...(await menu.loadFavoriteGames())].sort()).toEqual([
      "/klondike",
      "/rogue-run",
      "/spider-solitaire",
      // Starred as /alaska, which became a Yukon variant.
      "/yukon",
    ]);
  });

  test("stats and game options", async () => {
    const { menu } = await launchApp(golden.storage);
    const map = await menu.loadGameSettingsMap();

    expect(menu.getGameSettings(map, "/klondike").stats).toEqual({
      attempts: 120,
      wins: 41,
      losses: 70,
      highestScore: 5120,
      fastestTimeMs: 143000,
    });
    expect(menu.getGameSettings(map, "/klondike").drawCount).toBe(1);
    expect(menu.getGameSettings(map, "/spider-solitaire").spiderSuits).toBe(2);
    expect(menu.getGameSettings(map, "/rogue-run")).toMatchObject({
      dungeonLevel: 3,
      stats: { attempts: 9, wins: 2, losses: 7 },
    });
    // /alaska's stats add to Yukon's own.
    expect(menu.getGameSettings(map, "/yukon").stats).toEqual({
      attempts: 15,
      wins: 6,
      losses: 8,
      highestScore: null,
      fastestTimeMs: 200000,
    });
  });

  test("campaign progress and collectibles", async () => {
    const { campaign } = await launchApp(golden.storage);

    expect(await campaign.loadCampaignProgress()).toEqual({
      version: 4,
      lastPlayedPath: "/beehive",
      winsByPath: {
        "/klondike": 3,
        "/beehive": 1,
        "/memory": 2,
        "/pocket-poker": 1,
        // Won as /alaska.
        "/yukon": 1,
      },
      // Every game those wins had opened on the map of the time.
      unlockedPaths: GOLDEN_UNLOCKED_PATHS,
      collectedTaoIds: [1, 2, 3],
      collectedQuoteIds: [1, 40, 84, 170],
      lastResultSessionIds: { "/beehive": "session-7" },
      mercySkipCount: 1,
      mercySkipCollectibleCheckpoint: 6,
    });
  });

  test("recently played games and Game of the Day wins", async () => {
    const { menu, daily } = await launchApp(golden.storage);

    expect(
      (await menu.loadRecentlyPlayedGames()).map((entry) => entry.path),
    ).toEqual(["/beehive", "/klondike", "/yukon"]);
    expect([...(await daily.loadDailyWins())].sort()).toEqual([
      "2026-09-20",
      "2026-09-27",
    ]);
  });

  test("a player who has played everything keeps everything", async () => {
    // Built from the pins, so it grows with the game: every released game
    // starred, played and won in the campaign, and every collectible.
    const stats = {
      attempts: 5,
      wins: 3,
      losses: 2,
      highestScore: 10,
      fastestTimeMs: 60000,
    };
    const quoteIds = Object.keys(contract.quoteAuthors).map(Number);
    const taoIds = Array.from(
      { length: contract.taoChapterCount },
      (_, i) => i + 1,
    );
    const { menu, campaign } = await launchApp({
      [GAME_SETTINGS_STORAGE_KEY]: Object.fromEntries(
        contract.gamePaths.map((gamePath) => [
          gamePath,
          { isFavorite: true, stats },
        ]),
      ),
      [CAMPAIGN_PROGRESS_STORAGE_KEY]: {
        version: contract.campaignProgressVersion,
        winsByPath: Object.fromEntries(
          contract.gamePaths.map((gamePath) => [gamePath, 1]),
        ),
        collectedTaoIds: taoIds,
        collectedQuoteIds: quoteIds,
      },
    });

    const favorites = await menu.loadFavoriteGames();
    const map = await menu.loadGameSettingsMap();
    const progress = await campaign.loadCampaignProgress();

    const problems: string[] = [];
    for (const gamePath of livingGamePaths) {
      const target = currentGamePath(gamePath);
      if (!favorites.has(target)) problems.push(`${gamePath} lost its star`);
      if (menu.getGameSettings(map, target).stats.wins < stats.wins) {
        problems.push(`${gamePath} lost its stats`);
      }
      if (!progress.winsByPath[target]) {
        problems.push(`${gamePath} lost its campaign win`);
      }
      if (!progress.unlockedPaths.includes(target)) {
        problems.push(`${gamePath} is locked again`);
      }
    }
    const lostTao = taoIds.filter(
      (id) => !progress.collectedTaoIds.includes(id),
    );
    const lostQuotes = quoteIds.filter(
      (id) => !progress.collectedQuoteIds.includes(id),
    );
    if (lostTao.length) {
      problems.push(`lost Tao chapters ${lostTao.join(", ")}`);
    }
    if (lostQuotes.length) {
      problems.push(`lost quotes ${lostQuotes.join(", ")}`);
    }
    expectNothingLost(problems);
  });
});

// ========== The campaign map ========== //

type LockedGameDot = {
  x: number;
  y: number;
  connections: string[];
  rewards: unknown[];
};

describe("Saved data: the campaign map stays locked", () => {
  test("the lock file is there", () => {
    // Deleting it would switch off every check below and let the generator
    // rebuild the map, reshuffling every player's unlocks and rewards.
    expectNothingLost(
      fs.existsSync(lockPath)
        ? []
        : ["src/data/campaign-map.lock.json is missing"],
    );
  });

  const lock = fs.existsSync(lockPath)
    ? (JSON.parse(fs.readFileSync(lockPath, "utf8")) as {
        gameDots: Record<string, LockedGameDot>;
      })
    : { gameDots: {} };

  test("locked games keep their place, links and rewards", () => {
    const byPath = new Map(
      GAME_DOT_DEFINITIONS.map((gameDot) => [gameDot.path, gameDot]),
    );
    expectNothingLost(
      Object.entries(lock.gameDots).flatMap(([gamePath, locked]) => {
        const gameDot = byPath.get(gamePath);
        if (!gameDot) return [`${gamePath} left the map`];
        return [
          ...(gameDot.x !== locked.x || gameDot.y !== locked.y
            ? [`${gamePath} moved`]
            : []),
          ...locked.connections
            .filter((next) => !gameDot.connections.includes(next))
            .map((next) => `${gamePath} lost its link to ${next}`),
          ...(JSON.stringify(gameDot.rewards) !== JSON.stringify(locked.rewards)
            ? [`${gamePath}'s rewards changed`]
            : []),
        ];
      }),
    );
  });

  test("every released game is locked", () => {
    // Once a game ships, players' campaign progress depends on its node.
    const unlocked = livingGamePaths.filter(
      (gamePath) => !MOVED_GAME_PATHS[gamePath] && !(gamePath in lock.gameDots),
    );
    if (unlocked.length > 0) {
      throw new Error(
        `Released games missing from the campaign lock: ${unlocked.join(", ")}. ` +
          "Run `npm run campaign:lock` to lock them where they are.",
      );
    }
  });

  describe("the generator", () => {
    // Runs the real generator on a copy of src/data, so nothing here can
    // touch the map itself.
    function runGenerator(
      args: string[],
      {
        withLock = true,
        prepare,
      }: { withLock?: boolean; prepare?: (dataDirectory: string) => void } = {},
    ) {
      const root = fs.mkdtempSync(path.join(os.tmpdir(), "campaign-map-"));
      fs.cpSync(path.join(repoRoot, "src/data"), path.join(root, "src/data"), {
        recursive: true,
      });
      if (!withLock)
        fs.rmSync(path.join(root, "src/data/campaign-map.lock.json"));
      prepare?.(path.join(root, "src/data"));
      const read = () =>
        fs.readFileSync(
          path.join(root, "src/data/campaign-map.generated.ts"),
          "utf8",
        );
      const before = read();
      let error = "";
      try {
        execFileSync(
          process.execPath,
          [path.join(repoRoot, "scripts/generate-campaign-map.mjs"), ...args],
          { cwd: root, stdio: "pipe" },
        );
      } catch (caught) {
        error = String((caught as { stderr?: Buffer }).stderr ?? caught);
      }
      const after = read();
      fs.rmSync(root, { recursive: true, force: true });
      return { before, after, error };
    }

    type GeneratedGameDot = {
      path: string;
      x: number;
      y: number;
      connections: string[];
      rewards: { type: string; id: number }[];
    };

    /** The node list in a generated file, however it was formatted. */
    function parseMap(source: string) {
      const list = source.slice(source.indexOf("GAME_DOT_DEFINITIONS"));
      const body = list.slice(list.indexOf("= [") + 2).replace(/;\s*$/, "");
      return Function(`return ${body}`)() as GeneratedGameDot[];
    }

    /** Edits game-variants.ts in a copy of src/data. */
    const editVariants =
      (edit: (source: string) => string) => (dataDirectory: string) => {
        const file = path.join(dataDirectory, "game-variants.ts");
        fs.writeFileSync(file, edit(fs.readFileSync(file, "utf8")));
      };
    const removeGame = (dataDirectory: string) =>
      fs.rmSync(path.join(dataDirectory, "games/golf.ts"));
    const renameGame = (dataDirectory: string) => {
      const file = path.join(dataDirectory, "games/golf.ts");
      fs.writeFileSync(
        file,
        fs
          .readFileSync(file, "utf8")
          .replace('path: "/golf"', 'path: "/links-golf"'),
      );
    };

    /** A copy of Golf under another path, as a new game. */
    const addGolfCopy = (dataDirectory: string) =>
      fs.writeFileSync(
        path.join(dataDirectory, "games/test-golf.ts"),
        fs
          .readFileSync(path.join(dataDirectory, "games/golf.ts"), "utf8")
          .replace('path: "/golf"', 'path: "/test-golf"'),
      );
    /** Whether `paths` can all reach each other by links among themselves. */
    const linkedAmongThemselves = (
      map: GeneratedGameDot[],
      paths: string[],
    ) => {
      const members = new Set(paths);
      const seen = new Set([paths[0]]);
      const queue = [paths[0]];
      while (queue.length > 0) {
        const currentPath = queue.pop();
        const current = map.find((gameDot) => gameDot.path === currentPath)!;
        for (const next of current.connections) {
          if (members.has(next) && !seen.has(next)) {
            seen.add(next);
            queue.push(next);
          }
        }
      }
      return seen.size === members.size;
    };
    const progressionScore = (gamePath: string) => {
      const { difficulty, complexity } = GAMES_DATA[gamePath].rating;
      return 0.75 * difficulty + 0.25 * complexity;
    };

    test("a game that disappears without a word is refused", () => {
      const { before, after, error } = runGenerator([], {
        prepare: removeGame,
      });
      expect(error).toMatch(/\/golf is on the map but no longer a game/);
      expect(after).toBe(before);
    }, 30000);

    test("a retired game leaves the map and its rewards are handed on", () => {
      const { before, after, error } = runGenerator([], {
        prepare: (dataDirectory) => {
          removeGame(dataDirectory);
          editVariants((source) =>
            source.replace(
              /(RETIRED_GAME_PATHS: readonly string\[\] = \[)/,
              '$1"/golf", ',
            ),
          )(dataDirectory);
        },
      });
      expect(error).toBe("");
      const was = parseMap(before);
      const now = parseMap(after);
      const golf = was.find((gameDot) => gameDot.path === "/golf")!;

      expect(now.some((gameDot) => gameDot.path === "/golf")).toBe(false);
      expect(now.some((gameDot) => gameDot.connections.includes("/golf"))).toBe(
        false,
      );
      // Its neighbours can still reach each other, so a player who had Golf
      // open, by winning one of them, isn't cut off from the rest.
      expect(linkedAmongThemselves(now, golf.connections)).toBe(true);
      // Golf's rewards can still be collected, each from one other game.
      for (const reward of golf.rewards) {
        expect(
          now.filter((gameDot) =>
            gameDot.rewards.some(
              (kept) => kept.type === reward.type && kept.id === reward.id,
            ),
          ),
        ).toHaveLength(1);
      }
      // No other game moved, lost a link to a game still there, or lost a
      // reward.
      for (const gameDot of was) {
        if (gameDot.path === "/golf") continue;
        const kept = now.find((entry) => entry.path === gameDot.path)!;
        expect([kept.x, kept.y]).toEqual([gameDot.x, gameDot.y]);
        expect(kept.connections).toEqual(
          expect.arrayContaining(
            gameDot.connections.filter((next) => next !== "/golf"),
          ),
        );
        expect(kept.rewards).toEqual(expect.arrayContaining(gameDot.rewards));
      }
    }, 30000);

    test("a renamed game keeps its place, links and rewards", () => {
      const { before, after, error } = runGenerator([], {
        prepare: (dataDirectory) => {
          renameGame(dataDirectory);
          editVariants((source) =>
            source.replace(
              /(export const MOVED_GAME_PATHS[^=]*= \{)/,
              '$1 "/golf": { path: "/links-golf" },',
            ),
          )(dataDirectory);
        },
      });
      expect(error).toBe("");
      const rename = (gamePath: string) =>
        gamePath === "/golf" ? "/links-golf" : gamePath;
      expect(parseMap(after)).toEqual(
        parseMap(before).map((gameDot) => ({
          ...gameDot,
          path: rename(gameDot.path),
          connections: gameDot.connections.map(rename).sort(),
        })),
      );
    }, 30000);

    test("a game that replaces another takes its place, links and rewards", () => {
      const { before, after, error } = runGenerator([], {
        prepare: (dataDirectory) => {
          addGolfCopy(dataDirectory);
          removeGame(dataDirectory);
          editVariants((source) =>
            source.replace(
              /(export const REPLACED_GAME_PATHS[^=]*= \{)/,
              '$1 "/golf": "/test-golf",',
            ),
          )(dataDirectory);
        },
      });
      expect(error).toBe("");
      const replace = (gamePath: string) =>
        gamePath === "/golf" ? "/test-golf" : gamePath;
      expect(parseMap(after)).toEqual(
        parseMap(before).map((gameDot) => ({
          ...gameDot,
          path: replace(gameDot.path),
          connections: gameDot.connections.map(replace).sort(),
        })),
      );
    }, 30000);

    test("a new game goes among games about as hard, linked to one no harder", () => {
      const { before, after, error } = runGenerator([], {
        prepare: addGolfCopy,
      });
      expect(error).toBe("");
      const was = parseMap(before);
      const now = parseMap(after);
      const golf = was.find((gameDot) => gameDot.path === "/golf")!;
      const added = now.find((gameDot) => gameDot.path === "/test-golf")!;
      const radius = ({ x, y }: { x: number; y: number }) => Math.hypot(x, y);

      // Not out on the rim, where an easy game would sit behind hard ones.
      expect(Math.abs(radius(added) - radius(golf))).toBeLessThan(0.2);
      expect(
        added.connections.some(
          (next) =>
            next === "/klondike" ||
            progressionScore(next) <= progressionScore("/golf"),
        ),
      ).toBe(true);
      // Nothing that was there moved, lost a link or lost a reward.
      for (const gameDot of was) {
        const kept = now.find((entry) => entry.path === gameDot.path)!;
        expect([kept.x, kept.y]).toEqual([gameDot.x, gameDot.y]);
        expect(kept.connections).toEqual(
          expect.arrayContaining(gameDot.connections),
        );
        expect(kept.rewards).toEqual(gameDot.rewards);
      }
    }, 30000);

    test("a plain run leaves the map as it is", () => {
      const { before, after, error } = runGenerator([]);
      expect(error).toBe("");
      expectNothingLost(
        JSON.stringify(parseMap(after)) === JSON.stringify(parseMap(before))
          ? []
          : [
              "npm run campaign:generate would change the map; run it and review the diff with the owner",
            ],
      );
    }, 30000);

    test.each([["--rebuild"], ["--rebalance-rewards"]])(
      "%s is refused",
      (flag) => {
        const { before, after, error } = runGenerator([flag]);
        expect(error).toMatch(/locked/);
        expect(after).toBe(before);
      },
      30000,
    );

    test.each([["--rebuild"], ["--rebalance-rewards"]])(
      "%s is refused even without the lock, unless confirmed",
      (flag) => {
        const { before, after, error } = runGenerator([flag], {
          withLock: false,
        });
        expect(error).toMatch(/--reset-player-progress/);
        expect(after).toBe(before);
      },
      30000,
    );
  });
});
