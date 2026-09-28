// Finds where a thumbnail's artwork sits inside its source image: without the
// paper margins, mats, frames and pillarbox bars that museum scans come with.
// Cropped thumbnails (home cards, stamps) are cut to this box; the full
// thumbnails (game details, art gallery) keep the whole image.
//
// Detection trims near-uniform edges, a few passes deep so a margin and a
// frame line inside it both go, then pulls in a little further on each
// trimmed side to lose the soft line an edge leaves. Where it gets an image
// wrong, set the crop by hand in assets/thumbnails-source/crops.json, keyed by
// the image's name without extension:
//   "SeahavenTowers": false                  keep the whole image
//   "Gargantua": { "left": 0.05, "top": 0.04, "right": 0.05, "bottom": 0.04 }
// Each side is the fraction of the image's width or height cut from it.
// Check the results with npm run thumbnails:review.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const SOURCE_DIRECTORY = path.join(
  __dirname,
  "..",
  "assets",
  "thumbnails-source",
);
export const CROPS_FILE = path.join(SOURCE_DIRECTORY, "crops.json");

// Detection works on a copy this size; plenty to find an edge.
const DETECT_SIZE = 800;
// How far a pixel may stray from the edge colour and still count as border.
const THRESHOLD = 30;
const PASSES = 3;
// Ignore trims thinner than this (a fraction of the side): scan noise.
const MIN_TRIM = 0.005;
// Extra cut on each trimmed side.
const INSET = 0.015;
// A detected artwork smaller than this share of the image is more likely a
// misread (a dark painting, say) than a border; keep the whole image.
const MIN_AREA = 0.4;

export const NO_CROP = { left: 0, top: 0, right: 0, bottom: 0 };

export function readCropOverrides() {
  if (!fs.existsSync(CROPS_FILE)) return {};
  return JSON.parse(fs.readFileSync(CROPS_FILE, "utf8"));
}

function validOverride(name, crop) {
  const sides = ["left", "top", "right", "bottom"];
  const ok =
    crop &&
    sides.every((side) => typeof crop[side] === "number" && crop[side] >= 0) &&
    crop.left + crop.right < 1 &&
    crop.top + crop.bottom < 1;
  if (!ok) {
    throw new Error(
      `crops.json: "${name}" needs false or { left, top, right, bottom } ` +
        "fractions that leave some of the image",
    );
  }
  return crop;
}

/**
 * The crop for a source image, as fractions cut from each side, and whether
 * it was set by hand.
 */
export async function findCrop(sourcePath, overrides = readCropOverrides()) {
  const name = path.parse(sourcePath).name;
  if (name in overrides) {
    const crop = overrides[name];
    return {
      crop: crop === false ? NO_CROP : validOverride(name, crop),
      manual: true,
    };
  }

  const buffer = await sharp(sourcePath)
    .rotate()
    .resize(DETECT_SIZE, DETECT_SIZE, { fit: "inside" })
    .toBuffer();
  const { width, height } = await sharp(buffer).metadata();
  const box = { left: 0, top: 0, width, height };
  let current = buffer;
  for (let pass = 0; pass < PASSES; pass++) {
    let info;
    try {
      ({ info } = await sharp(current)
        .trim({ threshold: THRESHOLD })
        .toBuffer({ resolveWithObject: true }));
    } catch {
      break; // Nothing left to trim.
    }
    const left = -(info.trimOffsetLeft ?? 0);
    const top = -(info.trimOffsetTop ?? 0);
    if (info.width === box.width && info.height === box.height) break;
    current = await sharp(current)
      .extract({ left, top, width: info.width, height: info.height })
      .toBuffer();
    box.left += left;
    box.top += top;
    box.width = info.width;
    box.height = info.height;
  }

  if ((box.width * box.height) / (width * height) < MIN_AREA) {
    return { crop: NO_CROP, manual: false, rejected: true };
  }
  const trimmed = {
    left: box.left / width,
    top: box.top / height,
    right: (width - box.left - box.width) / width,
    bottom: (height - box.top - box.height) / height,
  };
  const crop = {};
  for (const [side, amount] of Object.entries(trimmed)) {
    crop[side] = amount < MIN_TRIM ? 0 : Math.min(amount + INSET, 0.45);
  }
  return { crop, manual: false };
}

/** The crop in pixels of an image `width` by `height`, for sharp's extract. */
export function cropRegion(crop, width, height) {
  const left = Math.round(crop.left * width);
  const top = Math.round(crop.top * height);
  return {
    left,
    top,
    width: Math.max(1, Math.round((1 - crop.right) * width) - left),
    height: Math.max(1, Math.round((1 - crop.bottom) * height) - top),
  };
}
