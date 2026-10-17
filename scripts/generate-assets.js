#!/usr/bin/env node

// Generates the game thumbnails from their source images (full and cropped),
// the copies of them used for the Collect tab's stamps, their asset map, and
// the stamps' perforated paper frame. Drop an image into the relevant assets/
// folder, then run:
//   npm run assets:generate
//
// Metro requires static require() strings, so these maps must be generated
// rather than resolved dynamically at runtime.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";
import {
  CROPS_FILE,
  SOURCE_DIRECTORY,
  cropRegion,
  findCrop,
  readCropOverrides,
} from "./thumbnail-crop.mjs";

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
// Each game's art comes from one source image in assets/thumbnails-source,
// which the app never loads. From it come two thumbnails:
// - assets/thumbnails-full: the whole image, borders and all, for showing
//   the artwork as it is (game details, art gallery).
// - assets/thumbnails: the artwork cut from its margins and frames (see
//   scripts/thumbnail-crop.mjs), for surfaces that crop it to their own
//   shape (home cards, stamps), where a border would show as a stripe.
// Cropped thumbnails are shown cropped to fill squares, cards and stamps, so
// their shorter side is what must stay sharp.
const SHORT_SIDE = 460;
const MAX_LONG_SIDE = SHORT_SIDE * 2;
// Full thumbnails are shown whole, so their longer side is what counts.
const FULL_LONG_SIDE = 1000;
// The Collect tab's shelves show every work whole at once, WORK_HEIGHT in
// src/components/Gallery/WorksView.tsx tall. Android decodes a bundled image
// at its own size, and there the full thumbnails took 345MB of GPU memory,
// three times what it keeps, so every frame uploaded them all again (8 fps on
// a Pixel 7, on every tab). The shelves use copies this many pixels tall:
// sharp at WORK_HEIGHT on a Pixel 7.
const SHELF_HEIGHT = 360;

/** Whether `target` needs making again from any of `sources`. */
function isStale(target, sources) {
  if (!fs.existsSync(target)) return true;
  const made = fs.statSync(target).mtimeMs;
  return sources.some(
    (source) => fs.existsSync(source) && fs.statSync(source).mtimeMs > made,
  );
}

/** Removes images in `dir` not named in `wanted`. */
function removeUnwanted(dir, wanted) {
  for (const file of listImages(dir)) {
    if (!wanted.has(file)) fs.rmSync(path.join(dir, file));
  }
}

/** Makes the full and cropped thumbnails; returns their (shared) names. */
async function generateFromSources() {
  const sources = listImages(SOURCE_DIRECTORY);
  const cropDir = path.join(projectRoot, "assets", "thumbnails");
  const fullDir = path.join(projectRoot, "assets", "thumbnails-full");
  fs.mkdirSync(cropDir, { recursive: true });
  fs.mkdirSync(fullDir, { recursive: true });
  const overrides = readCropOverrides();
  const names = [];
  for (const file of sources) {
    const name = `${path.parse(file).name}.webp`;
    if (names.includes(name)) {
      throw new Error(`Two source images make ${name}; keep one`);
    }
    names.push(name);
    const source = path.join(SOURCE_DIRECTORY, file);

    const full = path.join(fullDir, name);
    if (isStale(full, [source])) {
      await sharp(source)
        .rotate()
        .resize(FULL_LONG_SIDE, FULL_LONG_SIDE, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 78 })
        .toFile(full);
    }

    const cropped = path.join(cropDir, name);
    if (isStale(cropped, [source, CROPS_FILE])) {
      const upright = await sharp(source).rotate().toBuffer();
      const { width, height } = await sharp(upright).metadata();
      const { crop } = await findCrop(source, overrides);
      const region = cropRegion(crop, width, height);
      // The shorter side at SHORT_SIDE, unless that makes the longer one
      // too long; never enlarged.
      const scale = Math.min(
        1,
        SHORT_SIDE / Math.min(region.width, region.height),
        MAX_LONG_SIDE / Math.max(region.width, region.height),
      );
      await sharp(upright)
        .extract(region)
        .resize(
          Math.round(region.width * scale),
          Math.round(region.height * scale),
        )
        .webp({ quality: 80 })
        .toFile(cropped);
    }
  }
  const wanted = new Set(names);
  removeUnwanted(cropDir, wanted);
  removeUnwanted(fullDir, wanted);
  return names;
}

/**
 * Copies of every thumbnail in `targetName`, `width` across and cropped to
 * the stamp's picture, redone when stale.
 */
async function generateCopies(files, targetName, width, { grey = false } = {}) {
  const dir = path.join(projectRoot, "assets", "thumbnails");
  const targetDir = path.join(projectRoot, "assets", targetName);
  fs.mkdirSync(targetDir, { recursive: true });
  // Copies of thumbnails since removed.
  removeUnwanted(targetDir, new Set(files));
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

/** Copies of the full thumbnails, SHELF_HEIGHT tall, redone when stale. */
async function generateShelfCopies(files) {
  const fullDir = path.join(projectRoot, "assets", "thumbnails-full");
  const targetDir = path.join(projectRoot, "assets", "thumbnails-shelf");
  fs.mkdirSync(targetDir, { recursive: true });
  removeUnwanted(targetDir, new Set(files));
  for (const file of files) {
    const source = path.join(fullDir, file);
    const target = path.join(targetDir, file);
    const height = Math.min(
      SHELF_HEIGHT,
      (await sharp(source).metadata()).height,
    );
    if (
      fs.existsSync(target) &&
      fs.statSync(target).mtimeMs >= fs.statSync(source).mtimeMs &&
      (await sharp(target).metadata()).height === height
    ) {
      continue;
    }
    await sharp(source).resize({ height }).webp({ quality: 80 }).toFile(target);
  }
}

async function generateThumbnails() {
  const files = await generateFromSources();
  await generateShelfCopies(files);
  await generateCopies(files, "thumbnail-stickers", STICKER_SIZE);
  await generateCopies(files, "thumbnail-stickers-grey", STICKER_SIZE, {
    grey: true,
  });
  await generateCopies(files, "thumbnails-grey", GREY_STAMP_SIZE, {
    grey: true,
  });
  // Width over height of each full thumbnail, for showing the whole artwork.
  const fullDir = path.join(projectRoot, "assets", "thumbnails-full");
  const aspects = [];
  for (const file of files) {
    const { width, height } = await sharp(path.join(fullDir, file)).metadata();
    aspects.push(`  "${file}": ${Math.round((width / height) * 1000) / 1000},`);
  }
  const output = `// AUTO-GENERATED FILE. DO NOT EDIT.
// Run: npm run assets:generate

/** Each game's art cut from its margins and frames, for filling a shape. */
export const GAME_THUMBNAIL_ASSETS = {
${mapEntries(files, "thumbnails")}
} as const;

/** Each game's art whole, borders and all, for showing it uncropped. */
export const GAME_FULL_THUMBNAIL_ASSETS: Record<GameThumbnailName, number> = {
${mapEntries(files, "thumbnails-full")}
};

/** The full thumbnails SHELF_HEIGHT tall, for the Collect tab's shelves. */
export const GAME_SHELF_THUMBNAIL_ASSETS: Record<GameThumbnailName, number> = {
${mapEntries(files, "thumbnails-shelf")}
};

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

/** Width over height of each full thumbnail. */
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
