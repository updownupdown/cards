#!/usr/bin/env node

// Draws every app icon, the web icons and the splash image from the spade in
// assets/images/spade.svg, in the Nocturne theme's colours: the gold accent
// on its night. (Inside the app the spade takes the chosen theme's accent;
// these can't, since the system shows them before the app runs.) Run:
//   npm run logo:generate

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(path.join(root, "assets/images/spade.svg"), "utf8");

/** Nocturne's night and accent (src/styles/themes.ts). */
const NIGHT = "#07080d";
const GOLD = "#ffcf87";
const WHITE = "#ffffff";

// The spade's bounds on its 32 grid.
const BOX = { x: 5, y: 3.46, width: 22.03, height: 25.06 };

/** The spade at `height` pixels tall, centred on a square `size` wide. */
async function spade(size, height, colour, background) {
  const scale = height / BOX.height;
  const left = size / 2 - (BOX.x + BOX.width / 2) * scale;
  const top = size / 2 - (BOX.y + BOX.height / 2) * scale;
  const inner = source
    .replace(/<svg[^>]*>/, "")
    .replace("</svg>", "")
    .replaceAll('fill="black"', `fill="${colour}"`);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
    (background ? `<rect width="${size}" height="${size}" fill="${background}"/>` : "") +
    `<g transform="translate(${left} ${top}) scale(${scale})">${inner}</g></svg>`;
  return sharp(Buffer.from(svg)).png();
}

const write = async (file, image) => {
  await image.toFile(path.join(root, file));
  console.log(`  ${file}`);
};

// Sizes follow the icons they replace: the spade fills about 79% of a plain
// icon, 53% of a maskable one (inside the safe zone) and 41% of Android's
// adaptive-icon foreground.
const icon = (size) => spade(size, Math.round(size * 0.79), GOLD, NIGHT);
const maskable = (size) => spade(size, Math.round(size * 0.533), GOLD, NIGHT);

await write("assets/app-icon/icon.png", await icon(1024));
await write(
  "assets/app-icon/android-foreground.png",
  await spade(432, 175, GOLD, null),
);
await write(
  "assets/app-icon/android-monochrome.png",
  await spade(432, 175, WHITE, null),
);
await write(
  "assets/app-icon/android-background.png",
  sharp({ create: { width: 1024, height: 1024, channels: 4, background: NIGHT } }).png(),
);
// The splash shows the spade alone on the night (see app.config.js).
await write("assets/app-icon/splash-icon.png", await spade(512, 500, GOLD, null));

for (const size of [192, 512, 1024]) {
  await write(`public/icon-${size}.png`, await icon(size));
  await write(`public/icon-${size}-maskable.png`, await maskable(size));
}
await write("public/apple-touch-icon.png", await spade(180, 141, GOLD, NIGHT));
await write(
  "store-assets/play-store-icon-512.png",
  (await icon(512)).flatten({ background: NIGHT }),
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
