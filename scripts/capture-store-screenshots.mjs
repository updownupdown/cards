#!/usr/bin/env node
// Captures Google Play phone screenshots (1080x1920) of the web build into
// store-assets/screenshots/<lang>/.
//
//   npx expo export -p web --output-dir <dir>
//   npm run store-screenshots:capture -- --web <dir> [--lang fr] [--device tablet]
//
// Each shot starts from a seeded player: tips off (so the quick-start banner
// doesn't cover boards), intros dismissed, some games won and some campaign
// progress, so the map and the Gallery aren't empty. Every shot uses the Nocturne
// colour theme.

import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const arg = (name, fallback) => {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? fallback : process.argv[index + 1];
};
const WEB = path.resolve(arg("web", path.join(ROOT, "dist")));
const LANG = arg("lang", "en");
const TABLET = arg("device", "phone") === "tablet";
const OUT = path.join(
  ROOT,
  "store-assets/screenshots",
  TABLET ? `${LANG}-tablet` : LANG,
);

// 360x640 points at 3x: 1080x1920, within Play's 2:1 limit.
// --device tablet: 810x1440 points at 1.5x, 1215x2160, 9:16 within Play's
// 1080-7680px limits.
const VIEWPORT = TABLET
  ? { width: 810, height: 1440 }
  : { width: 360, height: 640 };
const SCALE = TABLET ? 1.5 : 3;

/** A deterministic 90% completion state, so Gallery shelves show artworks. */
const ALL_GAME_PATHS = fs
  .readdirSync(path.join(ROOT, "src/data/games"))
  .sort()
  .flatMap((file) => {
    if (!file.endsWith(".ts")) return [];
    const definition = fs.readFileSync(
      path.join(ROOT, "src/data/games", file),
      "utf8",
    );
    const match = definition.match(/path:\s*["']([^"']+)["']/);
    return match ? [match[1]] : [];
  });
const WON = ALL_GAME_PATHS.slice(0, Math.ceil(ALL_GAME_PATHS.length * 0.9));

function seededStorage(colorTheme) {
  const stats = (wins) => ({
    attempts: wins + 2,
    wins,
    losses: 2,
    highestScore: null,
    fastestTimeMs: 180000 + wins * 9000,
  });
  return {
    "cards.globalSettings.v1": {
      language: LANG,
      showTipsForNewGames: false,
      dismissHomeInstallPrompt: true,
      dismissCampaignIntro: true,
      dismissCollectIntro: true,
      resumeLastGame: false,
      colorTheme,
    },
    "cards.gameSettings.v1": Object.fromEntries(
      WON.map((gamePath, index) => [
        gamePath,
        { isFavorite: index % 3 === 0, stats: stats((index % 5) + 1) },
      ]),
    ),
    "cards.campaignProgress.v1": {
      version: 3,
      lastPlayedPath: "/beehive",
      winsByPath: Object.fromEntries(WON.slice(0, 8).map((p) => [p, 1])),
      collectedTaoIds: [1, 2, 3, 4, 5],
      collectedQuoteIds: [1, 2, 3, 40, 84, 90, 120],
    },
    // Opens the full Odyssey, as a save with a win beyond the force field.
    "cards.odysseyUnlock.v1": {
      keyHash: null,
      keptFromBefore: true,
      checkedBeforeField: true,
      devFieldView: "asPlayed",
    },
    "cards.recentGames.v1": WON.slice(0, 5).map((gamePath, index) => ({
      path: gamePath,
      playedAt: Date.now() - index * 3600000,
    })),
  };
}

const homeStrings = JSON.parse(
  fs.readFileSync(path.join(ROOT, "src/locales", LANG, "home.json"), "utf8"),
);
const gameStrings = JSON.parse(
  fs.readFileSync(path.join(ROOT, "src/locales", LANG, "game.json"), "utf8"),
);
/** Taps a Home tab, by its label in the tab bar. */
const openTab = (key) => async (page) => {
  await page
    .getByRole("button", { name: homeStrings.tabs[key], exact: true })
    .click();
};

/** Taps a button by its label. */
const press = (name) => async (page) => {
  await page.getByRole("button", { name, exact: true }).first().click();
};

/** Zooms the Odyssey map out enough to show the unlocked local galaxy. */
const zoomOutMap = async (page) => {
  const { width, height } = VIEWPORT;
  await page.mouse.move(width / 2, height / 2);
  // One notch shows the surrounding unlocked paths without shrinking the map
  // into an unreadable overview.
  if (!TABLET) await page.mouse.wheel(0, 650);
  await page.waitForTimeout(300);
  if (TABLET) return;
  // The map stays where it was; drag the galaxy up to the middle.
  await page.mouse.move(width / 2, height * 0.3);
  await page.mouse.down();
  for (let i = 1; i <= 15; i++) {
    await page.mouse.move(width / 2, height * 0.3 - i * height * 0.022);
    await page.waitForTimeout(30);
  }
  await page.mouse.up();
  await page.waitForTimeout(500);
};

/**
 * Plays a few moves with the UFO's Autopilot, for a game under way. With
 * \`flying\`, shoots while the last move is still in the air.
 */
const midGame =
  (moves, { flying = false } = {}) =>
  async (page) => {
    const hint = page.getByRole("button", {
      name: gameStrings.menu.hint,
      exact: true,
    });
    // Some games have no hints to play with.
    if (!(await hint.isEnabled())) return;
    await hint.click();
    await page.waitForTimeout(900);
    await page.getByRole("button", { name: "Autopilot", exact: true }).click();
    await page.waitForTimeout(600);
    await page.getByRole("button", { name: "Dismiss", exact: true }).click();
    await page.waitForTimeout(1000);
    for (let i = 0; i < moves; i++) {
      if (!(await hint.isEnabled())) return;
      await hint.click();
      await page.waitForTimeout(i === moves - 1 && flying ? 150 : 2200);
    }
  };

/** The screenshots, in store order. */
const SHOTS = [
  {
    name: "01-queens-audience",
    url: "/queens-audience",
    theme: "nocturne",
    after: midGame(6),
  },
  {
    name: "02-odyssey",
    url: "/?tab=campaign",
    theme: "nocturne",
    after: zoomOutMap,
  },
  {
    name: "03-klondike",
    url: "/klondike",
    theme: "nocturne",
    after: midGame(4),
  },
  {
    name: "04-pyramid",
    url: "/pyramid",
    theme: "nocturne",
    after: midGame(10),
  },
  {
    name: "05-rogue-run",
    url: "/rogue-run",
    theme: "nocturne",
    after: midGame(5),
  },
  {
    name: "06-gallery",
    url: "/",
    theme: "nocturne",
    after: async (page) => {
      await openTab("collect")(page);
      await page.waitForTimeout(800);
      await page.getByText("Style", { exact: true }).first().click();
      await page.mouse.move(VIEWPORT.width / 2, VIEWPORT.height / 2);
      for (let i = 0; i < 4; i++) {
        await page.mouse.wheel(0, 500);
        await page.waitForTimeout(150);
      }
    },
  },
  {
    name: "07-freecell",
    url: "/freecell",
    theme: "nocturne",
    after: midGame(8, { flying: true }),
    afterWait: 0,
  },
  {
    name: "08-rules",
    url: "/beehive",
    theme: "nocturne",
    after: async (page) => {
      await page
        .getByRole("button", { name: gameStrings.menu.rules, exact: true })
        .first()
        .click();
    },
  },
];

/** Serves the export, where /klondike is klondike.html. */
function serve(directory) {
  const types = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".png": "image/png",
    ".webp": "image/webp",
    ".jpg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".ttf": "font/ttf",
    ".woff2": "font/woff2",
  };
  const server = http.createServer((request, response) => {
    const url = decodeURIComponent(request.url.split("?")[0]);
    const candidates = [
      url,
      `${url}.html`,
      path.join(url, "index.html"),
      "/[game].html",
    ];
    for (const candidate of candidates) {
      const file = path.join(directory, candidate);
      if (
        file.startsWith(directory) &&
        fs.existsSync(file) &&
        fs.statSync(file).isFile()
      ) {
        response.writeHead(200, {
          "Content-Type":
            types[path.extname(file)] ?? "application/octet-stream",
        });
        fs.createReadStream(file).pipe(response);
        return;
      }
    }
    response.writeHead(404).end();
  });
  return new Promise((resolve) =>
    server.listen(0, "0.0.0.0", () => resolve(server)),
  );
}

const server = await serve(WEB);
// Not localhost, which the app treats as a dev machine (local-only games on).
const lanAddress = Object.values(os.networkInterfaces())
  .flat()
  .find((address) => address?.family === "IPv4" && !address.internal)?.address;
if (!lanAddress) throw new Error("No network address to serve the build on.");
const origin = `http://${lanAddress}:${server.address().port}`;
fs.mkdirSync(OUT, { recursive: true });
// CHROMIUM_PATH: a Chromium of your own, if Playwright's isn't installed.
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH,
});

const ONLY = arg("only", null);
for (const shot of SHOTS.filter((s) => !ONLY || s.name.includes(ONLY))) {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: SCALE,
    isMobile: true,
    hasTouch: true,
    locale: LANG,
  });
  await context.addInitScript((storage) => {
    if (sessionStorage.getItem("seeded")) return;
    localStorage.clear();
    for (const [key, value] of Object.entries(storage)) {
      localStorage.setItem(key, JSON.stringify(value));
    }
    sessionStorage.setItem("seeded", "1");
  }, seededStorage(shot.theme));
  const page = await context.newPage();
  await page.goto(`${origin}${shot.url}`, { waitUntil: "networkidle" });
  // Deals, fonts and art settle.
  await page.waitForTimeout(3500);
  if (shot.after) {
    await shot.after(page);
    await page.waitForTimeout(shot.afterWait ?? 1500);
  }
  const file = path.join(OUT, `${shot.name}.png`);
  await page.screenshot({ path: file });
  console.log(`Wrote ${path.relative(ROOT, file)}`);
  await context.close();
}

await browser.close();
server.close();
