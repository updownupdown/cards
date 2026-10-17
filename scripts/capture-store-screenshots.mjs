#!/usr/bin/env node
// Captures Google Play phone screenshots (1080x1920) of the web build into
// store-assets/screenshots/<lang>/.
//
//   npx expo export -p web --output-dir <dir>
//   npm run store-screenshots:capture -- --web <dir> [--lang fr]
//
// Each shot starts from a seeded player: tips off (so the quick-start banner
// doesn't cover boards), intros dismissed, some games won and some campaign
// progress, so the map and the Gallery aren't empty. Shots vary the colour
// theme to show them off.

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
const OUT = path.join(ROOT, "store-assets/screenshots", LANG);

// 360x640 points at 3x: 1080x1920, within Play's 2:1 limit.
const VIEWPORT = { width: 360, height: 640 };
const SCALE = 3;

/** Games the seeded player has won, near the start of the campaign. */
const WON = [
  "/klondike",
  "/beehive",
  "/memory",
  "/sultan",
  "/fifteen-puzzle",
  "/bowling",
  "/grandfathers-clock",
  "/golf",
  "/pyramid",
  "/freecell",
  "/spider-solitaire",
];

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

/** The screenshots, in store order. */
const SHOTS = [
  { name: "01-home", url: "/", theme: "nocturne" },
  { name: "02-odyssey", url: "/?tab=campaign", theme: "aurora" },
  { name: "03-klondike", url: "/klondike", theme: "nocturne" },
  { name: "04-search", url: "/", theme: "ember", after: openTab("search") },
  { name: "05-rogue-run", url: "/rogue-run", theme: "nocturne" },
  { name: "06-gallery", url: "/", theme: "folio", after: openTab("collect") },
  { name: "07-pagoda", url: "/pagoda", theme: "nocturne" },
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

for (const shot of SHOTS) {
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
    await page.waitForTimeout(1500);
  }
  const file = path.join(OUT, `${shot.name}.png`);
  await page.screenshot({ path: file });
  console.log(`Wrote ${path.relative(ROOT, file)}`);
  await context.close();
}

await browser.close();
server.close();
