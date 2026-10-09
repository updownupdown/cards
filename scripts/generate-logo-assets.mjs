#!/usr/bin/env node

// Draws every app icon, the web icons and the splash image from the spade in
// assets/images/spade.svg: a white spade on black. The system shows these
// before the app runs, so they can't take the chosen colour theme; the launch
// intro (LaunchIntro) starts from the same white on black and eases into it.
// Run:
//   npm run logo:generate

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(path.join(root, "assets/images/spade.svg"), "utf8");

const BLACK = "#000000";
const WHITE = "#ffffff";

// The spade's bounds on its 828 grid.
const BOX = { x: 56.88, y: 8.68, width: 713.94, height: 810.64 };

/**
 * The spade at `height` pixels tall on a square `size` wide, centred, or with
 * its top at `top` pixels down.
 */
async function spade(size, height, colour, background, top = null) {
  const scale = height / BOX.height;
  const left = size / 2 - (BOX.x + BOX.width / 2) * scale;
  const y =
    top === null
      ? size / 2 - (BOX.y + BOX.height / 2) * scale
      : top - BOX.y * scale;
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
// the size of the launch intro's.
const icon = (size) => spade(size, Math.round(size * 0.79), WHITE, BLACK);
const pwaIcon = (size) => spade(size, Math.round(size * 0.55), WHITE, BLACK);
const maskable = (size) => spade(size, Math.round(size * 0.533), WHITE, BLACK);

await write("assets/app-icon/icon.png", await icon(1024));
await write(
  "assets/app-icon/android-foreground.png",
  await spade(432, 175, WHITE, null),
);
await write(
  "assets/app-icon/android-monochrome.png",
  await spade(432, 175, WHITE, null),
);
await write(
  "assets/app-icon/android-background.png",
  sharp({ create: { width: 1024, height: 1024, channels: 4, background: BLACK } }).png(),
);
// The splash image is a square as tall as the launch lockup (spade, gap and
// name: LOCKUP_HEIGHT in LaunchIntro), with the spade at its top and nothing
// under it. The system centres it, which puts the spade where the intro's
// centred lockup has it. LOCKUP is the lockup's height in spade heights.
const LOCKUP = 1 + 1.75 / 3.4;
const SPLASH = 1024;
await write(
  "assets/app-icon/splash-icon.png",
  await spade(SPLASH, SPLASH / LOCKUP, WHITE, null, 0),
);

for (const size of [192, 512, 1024]) {
  await write(`public/icon-${size}.png`, await pwaIcon(size));
  await write(`public/icon-${size}-maskable.png`, await maskable(size));
}
await write("public/apple-touch-icon.png", await spade(180, 141, WHITE, BLACK));
await write(
  "store-assets/play-store-icon-512.png",
  (await icon(512)).flatten({ background: BLACK }),
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
