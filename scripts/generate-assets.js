#!/usr/bin/env node

// Generates the static asset map for thumbnails, and the small copies of
// them used for the Collect tab's stickers. Drop an image into the relevant
// assets/ folder, then run:
//   npm run assets:generate
//
// Metro requires static require() strings, so these maps must be generated
// rather than resolved dynamically at runtime.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, "..");

const IMAGE_EXTS = [".png", ".jpg", ".jpeg", ".webp"];

// The Collect tab shows every game at once as a 40pt sticker. Full-size
// thumbnails cost Android about 2MB of GPU memory each there, which starved
// the rest of the app, so the stickers use copies this many pixels across:
// sharp at 40pt on the densest phones.
const STICKER_SIZE = 160;

function listImages(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((file) => IMAGE_EXTS.includes(path.extname(file).toLowerCase()))
    .sort((a, b) => a.localeCompare(b));
}

function mapEntries(files, aliasDir) {
  return files
    .map((file) => `  "${file}": require("@/assets/${aliasDir}/${file}"),`)
    .join("\n");
}

// --- Thumbnails ---------------------------------------------------------
async function generateStickers(files) {
  const dir = path.join(projectRoot, "assets", "thumbnails");
  const stickerDir = path.join(projectRoot, "assets", "thumbnail-stickers");
  fs.mkdirSync(stickerDir, { recursive: true });
  const wanted = new Set(files);
  // Stickers of thumbnails since removed.
  for (const file of listImages(stickerDir)) {
    if (!wanted.has(file)) fs.rmSync(path.join(stickerDir, file));
  }
  for (const file of files) {
    const source = path.join(dir, file);
    const target = path.join(stickerDir, file);
    if (
      fs.existsSync(target) &&
      fs.statSync(target).mtimeMs >= fs.statSync(source).mtimeMs
    ) {
      continue;
    }
    await sharp(source)
      .resize(STICKER_SIZE, STICKER_SIZE, { fit: "cover" })
      .webp({ quality: 80 })
      .toFile(target);
  }
}

async function generateThumbnails() {
  const dir = path.join(projectRoot, "assets", "thumbnails");
  const files = listImages(dir);
  await generateStickers(files);
  const output = `// AUTO-GENERATED FILE. DO NOT EDIT.
// Run: npm run assets:generate

export const GAME_THUMBNAIL_ASSETS = {
${mapEntries(files, "thumbnails")}
} as const;

/** Small copies of the thumbnails, for the Collect tab's stickers. */
export const GAME_STICKER_ASSETS: Record<GameThumbnailName, number> = {
${mapEntries(files, "thumbnail-stickers")}
};

export type GameThumbnailName = keyof typeof GAME_THUMBNAIL_ASSETS;
`;
  fs.writeFileSync(
    path.join(projectRoot, "src", "data", "game-thumbnails.ts"),
    output,
    "utf8",
  );
  return files.length;
}

async function main() {
  const thumbs = await generateThumbnails();
  console.log(`Generated asset map: ${thumbs} thumbnails.`);
}

await main();
