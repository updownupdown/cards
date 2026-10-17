#!/usr/bin/env node

// Draws every app icon, the web icons and the splash image from the spade in
// assets/images/spade.svg: Nocturne's yellow spade on its night (the default
// colour theme's accent and background, SPLASH_* in launch-lockup.ts). The
// system shows these before the app runs, so they can't take the chosen theme.
// Android's monochrome icon is white, as Android tints it.
// Run:
//   npm run logo:generate

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(path.join(root, "assets/images/spade.svg"), "utf8");

const NIGHT = "#07080d";
const YELLOW = "#ffcf87";
const WHITE = "#ffffff";

// The spade's bounds on its 828 grid.
const BOX = { x: 56.88, y: 8.68, width: 713.94, height: 810.64 };

/** The spade at `height` pixels tall, centred on a square `size` wide. */
async function spade(size, height, colour, background) {
  const scale = height / BOX.height;
  const left = size / 2 - (BOX.x + BOX.width / 2) * scale;
  const y = size / 2 - (BOX.y + BOX.height / 2) * scale;
  const inner = source
    .replace(/<svg[^>]*>/, "")
    .replace("</svg>", "")
    .replaceAll('fill="black"', `fill="${colour}"`);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
    (background ? `<rect width="${size}" height="${size}" fill="${background}"/>` : "") +
    `<g transform="translate(${left} ${y}) scale(${scale})">${inner}</g></svg>`;
  return sharp(Buffer.from(svg)).png();
}

const write = async (file, image) => {
  await image.toFile(path.join(root, file));
  console.log(`  ${file}`);
};

// The spade fills about 79% of a plain icon, 53% of a maskable one (inside
// the safe zone) and 41% of Android's adaptive-icon foreground. The PWA's
// "any" icons are the exception, at 55%: Chrome's splash for the installed
// app shows that icon about 128 dp tall, which puts the spade at about 70 dp,
// the size of the page's own splash's.
const icon = (size) => spade(size, Math.round(size * 0.79), YELLOW, NIGHT);
const pwaIcon = (size) => spade(size, Math.round(size * 0.55), YELLOW, NIGHT);
const maskable = (size) => spade(size, Math.round(size * 0.533), YELLOW, NIGHT);

await write("assets/app-icon/icon.png", await icon(1024));
await write(
  "assets/app-icon/android-foreground.png",
  await spade(432, 175, YELLOW, null),
);
await write(
  "assets/app-icon/android-monochrome.png",
  await spade(432, 175, WHITE, null),
);
await write(
  "assets/app-icon/android-background.png",
  sharp({ create: { width: 1024, height: 1024, channels: 4, background: NIGHT } }).png(),
);
// The splash image is a square as wide as the web splash's lockup is tall
// (LOCKUP_HEIGHT in launch-lockup.ts) with the spade centred, as tall as the
// lockup's spade. LOCKUP is the lockup's height in spade heights.
const LOCKUP = 1 + 1.75 / 3.4;
const SPLASH = 1024;
await write(
  "assets/app-icon/splash-icon.png",
  await spade(SPLASH, SPLASH / LOCKUP, YELLOW, null),
);

for (const size of [192, 512, 1024]) {
  await write(`public/icon-${size}.png`, await pwaIcon(size));
  await write(`public/icon-${size}-maskable.png`, await maskable(size));
}
await write("public/apple-touch-icon.png", await spade(180, 141, YELLOW, NIGHT));
// Play Console's app icon: 512 px, opaque, in 32-bit RGBA as Play asks.
await write(
  "store-assets/play-store-icon-512.png",
  (await icon(512)).flatten({ background: NIGHT }).ensureAlpha(),
);

// favicon.ico: PNG images in an ICO wrapper, which every browser reads.
const sizes = [16, 24, 32, 48];
const images = await Promise.all(
  sizes.map(async (size) => (await icon(size)).toBuffer()),
);
const header = Buffer.alloc(6 + 16 * sizes.length);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
sizes.forEach((size, index) => {
  const entry = 6 + 16 * index;
  header.writeUInt8(size, entry);
  header.writeUInt8(size, entry + 1);
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(images[index].length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += images[index].length;
});
fs.writeFileSync(path.join(root, "public/favicon.ico"), Buffer.concat([header, ...images]));
console.log("  public/favicon.ico");
