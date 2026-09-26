#!/usr/bin/env node

// Generates the static asset map for thumbnails, the copies of them used for
// the Collect tab's stamps, and the stamps' perforated paper frame. Drop an
// image into the relevant assets/ folder, then run:
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

// The Collect tab shows every game at once as a small stamp. Full-size
// thumbnails cost Android about 2MB of GPU memory each there, which starved
// the rest of the app, so the stickers use copies this many pixels across:
// sharp at that size on the densest phones. Thumbnails come in any aspect
// ratio, so the copies are cropped to the stamp's picture, which is its paper
// (STAMP_FRAME below) less PICTURE_INSET in src/components/Home/Stamp.tsx.
const STAMP_PICTURE_ASPECT = (400 - 2 * 25) / (500 - 2 * 25);
const STICKER_SIZE = 160;
// Games not yet won show in greyscale; iOS can't filter an image, so they get
// greyscale copies: stickers, and sharper ones for an opened category.
const GREY_STAMP_SIZE = 400;

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
/**
 * Copies of every thumbnail in `targetName`, `width` across and cropped to
 * the stamp's picture, redone when stale.
 */
async function generateCopies(files, targetName, width, { grey = false } = {}) {
  const dir = path.join(projectRoot, "assets", "thumbnails");
  const targetDir = path.join(projectRoot, "assets", targetName);
  fs.mkdirSync(targetDir, { recursive: true });
  const wanted = new Set(files);
  // Copies of thumbnails since removed.
  for (const file of listImages(targetDir)) {
    if (!wanted.has(file)) fs.rmSync(path.join(targetDir, file));
  }
  const height = Math.round(width * STAMP_PICTURE_ASPECT);
  for (const file of files) {
    const source = path.join(dir, file);
    const target = path.join(targetDir, file);
    if (
      fs.existsSync(target) &&
      fs.statSync(target).mtimeMs >= fs.statSync(source).mtimeMs &&
      (await sharp(target).metadata()).height === height
    ) {
      continue;
    }
    let image = sharp(source).resize(width, height, { fit: "cover" });
    if (grey) image = image.greyscale();
    await image.webp({ quality: 80 }).toFile(target);
  }
}

async function generateThumbnails() {
  const dir = path.join(projectRoot, "assets", "thumbnails");
  const files = listImages(dir);
  await generateCopies(files, "thumbnail-stickers", STICKER_SIZE);
  await generateCopies(files, "thumbnail-stickers-grey", STICKER_SIZE, {
    grey: true,
  });
  await generateCopies(files, "thumbnails-grey", GREY_STAMP_SIZE, {
    grey: true,
  });
  // Width over height of each thumbnail, for showing the whole artwork.
  const aspects = [];
  for (const file of files) {
    const { width, height } = await sharp(path.join(dir, file)).metadata();
    aspects.push(`  "${file}": ${Math.round((width / height) * 1000) / 1000},`);
  }
  const output = `// AUTO-GENERATED FILE. DO NOT EDIT.
// Run: npm run assets:generate

export const GAME_THUMBNAIL_ASSETS = {
${mapEntries(files, "thumbnails")}
} as const;

/** Small copies of the thumbnails, for the Collect tab's stickers. */
export const GAME_STICKER_ASSETS: Record<GameThumbnailName, number> = {
${mapEntries(files, "thumbnail-stickers")}
};

/** Greyscale stickers, for games not yet won. */
export const GAME_GREY_STICKER_ASSETS: Record<GameThumbnailName, number> = {
${mapEntries(files, "thumbnail-stickers-grey")}
};

/** Sharper greyscale copies, for an opened category's games not yet won. */
export const GAME_GREY_THUMBNAIL_ASSETS: Record<GameThumbnailName, number> = {
${mapEntries(files, "thumbnails-grey")}
};

/** Width over height of each thumbnail, uncropped. */
export const GAME_THUMBNAIL_ASPECTS: Record<GameThumbnailName, number> = {
${aspects.join("\n")}
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

// --- Stamp frame ---------------------------------------------------------
// The white paper of a won game's stamp in the Collect tab: perforated edges
// and a drop shadow following them, in one image every stamp shares. Sizes
// are in stamp units; keep them in step with STAMP_FRAME in
// src/components/Home/Stamp.tsx.
const STAMP_FRAME = {
  width: 500,
  height: 400,
  /** Room around the stamp for its shadow. */
  pad: 40,
  /** Distance between perforation holes; divides both sides evenly. */
  pitch: 25,
  holeRadius: 8,
  shadowOffsetY: 6,
  shadowBlur: 10,
  shadowOpacity: 0.5,
  paper: "#fbfaf6",
  /** Pixels per stamp unit: sharp at the largest stamp on dense screens. */
  resolution: 2,
};

async function generateStampFrame() {
  const f = STAMP_FRAME;
  const canvasWidth = f.width + f.pad * 2;
  const canvasHeight = f.height + f.pad * 2;
  const holes = [];
  for (let x = 0; x <= f.width; x += f.pitch) {
    holes.push([x, 0], [x, f.height]);
  }
  for (let y = f.pitch; y < f.height; y += f.pitch) {
    holes.push([0, y], [f.width, y]);
  }
  const circles = holes
    .map(
      ([x, y]) =>
        `<circle cx="${x + f.pad}" cy="${y + f.pad}" r="${f.holeRadius}" fill="black"/>`,
    )
    .join("");
  const paper = `<rect x="${f.pad}" y="${f.pad}" width="${f.width}" height="${f.height}" mask="url(#holes)"`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasWidth * f.resolution}" height="${canvasHeight * f.resolution}" viewBox="0 0 ${canvasWidth} ${canvasHeight}">
  <defs>
    <mask id="holes" maskUnits="userSpaceOnUse" x="0" y="0" width="${canvasWidth}" height="${canvasHeight}">
      <rect width="${canvasWidth}" height="${canvasHeight}" fill="white"/>${circles}
    </mask>
    <filter id="shadow" filterUnits="userSpaceOnUse" x="0" y="0" width="${canvasWidth}" height="${canvasHeight}">
      <feGaussianBlur stdDeviation="${f.shadowBlur}"/>
    </filter>
  </defs>
  <g filter="url(#shadow)" opacity="${f.shadowOpacity}" transform="translate(0 ${f.shadowOffsetY})">${paper} fill="black"/></g>
  ${paper} fill="${f.paper}"/>
</svg>`;
  await sharp(Buffer.from(svg))
    .png({ compressionLevel: 9, palette: false })
    .toFile(path.join(projectRoot, "assets", "images", "stamp-frame.png"));
}

async function main() {
  const thumbs = await generateThumbnails();
  await generateStampFrame();
  console.log(`Generated asset map: ${thumbs} thumbnails.`);
}

await main();
