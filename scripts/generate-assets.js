#!/usr/bin/env node

// Generates the static asset map for thumbnails. Drop an image into the
// relevant assets/ folder, then run:
//   npm run assets:generate
//
// Metro requires static require() strings, so these maps must be generated
// rather than resolved dynamically at runtime.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, "..");

const IMAGE_EXTS = [".png", ".jpg", ".jpeg", ".webp"];

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
function generateThumbnails() {
  const dir = path.join(projectRoot, "assets", "thumbnails");
  const files = listImages(dir);
  const output = `// AUTO-GENERATED FILE. DO NOT EDIT.
// Run: npm run assets:generate

export const GAME_THUMBNAIL_ASSETS = {
${mapEntries(files, "thumbnails")}
} as const;

export type GameThumbnailName = keyof typeof GAME_THUMBNAIL_ASSETS;
`;
  fs.writeFileSync(
    path.join(projectRoot, "src", "data", "game-thumbnails.ts"),
    output,
    "utf8",
  );
  return files.length;
}

function main() {
  const thumbs = generateThumbnails();
  console.log(`Generated asset map: ${thumbs} thumbnails.`);
}

main();
