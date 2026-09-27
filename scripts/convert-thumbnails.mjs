#!/usr/bin/env node

// Normalizes game art and assigns new art to its games. Drop an image of any
// common format and size into assets/thumbnails-source, named after its game
// (e.g. "Klondike.jpg"), then run:
//   npm run thumbnails:convert
//
// 1. Converts every source image that isn't a JPEG within the size limit into
//    one, keeping its aspect ratio, and replaces the original file (and any
//    JPEG of the same name). Source images aren't bundled with the app; they
//    are what its thumbnails are made from.
// 2. Assigns each new image to the game whose file name, path, title or an
//    alias matches its name (e.g. "GrandfatherClock.jpg" ->
//    grandfathers-clock.ts), and existing images to games without one. A
//    game's thumbnail is named after its source, as a WebP.
// 3. A game given new art needs a thumbnailCredit (title, artistName,
//    sourceName and sourceLink) in its data file. Without one the assignment
//    is written commented out, with a warning; add the credit and run again
//    to enable it.
// 4. Regenerates the thumbnails, full and cropped to the artwork, and
//    src/data/game-thumbnails.ts (see scripts/generate-assets.js). Check the
//    crops with npm run thumbnails:review.
//
// Pass --dry-run to only report what would change.

import fs from "fs/promises";
import { existsSync, statSync } from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";
import sharp from "sharp";
import { SOURCE_DIRECTORY } from "./thumbnail-crop.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const thumbnailsDirectory = path.join(projectRoot, "assets", "thumbnails");
const gamesDirectory = path.join(projectRoot, "src", "data", "games");

// Enough to make every thumbnail from, cropped or not, without keeping
// museum-sized scans in the repository.
const SOURCE_LONG_SIDE = 1400;
const SOURCE_QUALITY = 88;
// The cropped thumbnails' shorter side (see scripts/generate-assets.js);
// smaller sources make blurry cards.
const MIN_SHORT_SIDE = 460;
// Art more elongated than this loses too much to the square crops.
const WARN_ASPECT = 1.6;
const IMAGE_EXTS = [".png", ".jpg", ".jpeg", ".webp", ".avif", ".tif", ".tiff"];
const IGNORED_WORDS = new Set(["the", "a", "an"]);
const CREDIT_FIELDS = ["title", "artistName", "sourceName", "sourceLink"];
const MISSING_CREDIT_NOTE = "Needs a thumbnailCredit";
const dryRun = process.argv.includes("--dry-run");

// "GrandfatherClock", "grandfathers-clock" and "Grandfather's Clock" all
// become "grandfatherclock": split into words, drop articles and plurals.
function matchKey(name) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word && !IGNORED_WORDS.has(word))
    .map((word) => (word.length > 3 ? word.replace(/s$/, "") : word))
    .filter((word) => word !== "s")
    .join("");
}

function isConverted(file, { format, width, height }) {
  return (
    format === "jpeg" &&
    path.extname(file) === ".jpg" &&
    Math.max(width, height) <= SOURCE_LONG_SIDE
  );
}

/** The thumbnail made from a source image. */
const thumbnailName = (file) => `${path.parse(file).name}.webp`;

/** Whether no thumbnail has been made from this source yet. */
function isNewArt(source) {
  const thumbnail = path.join(thumbnailsDirectory, thumbnailName(source));
  return (
    !existsSync(thumbnail) ||
    statSync(thumbnail).mtimeMs < statSync(source).mtimeMs
  );
}

async function convertThumbnails() {
  await fs.mkdir(SOURCE_DIRECTORY, { recursive: true });
  const files = (await fs.readdir(SOURCE_DIRECTORY))
    .filter((file) => IMAGE_EXTS.includes(path.extname(file).toLowerCase()))
    .sort((a, b) => a.localeCompare(b));
  // Thumbnail names of new art, which needs a credit.
  const fresh = new Set();
  const written = new Set();

  for (const file of files) {
    const source = path.join(SOURCE_DIRECTORY, file);
    // A JPEG just written from an image of the same name.
    if (written.has(file)) continue;
    const metadata = await sharp(source).metadata();
    const { format, width, height } = metadata;
    const [upright, across] =
      (metadata.orientation ?? 1) >= 5 ? [width, height] : [height, width];
    const aspect = Math.max(width, height) / Math.min(width, height);
    const shortSide = Math.min(width, height);

    const converted = isConverted(file, metadata);
    if (converted && !isNewArt(source)) continue;
    fresh.add(thumbnailName(file));
    const outputName = `${path.parse(file).name}.jpg`;
    if (!converted) {
      const replacesExisting =
        outputName !== file && files.includes(outputName);
      console.log(
        `Convert ${file} (${format} ${width}x${height}) -> ${outputName}` +
          (replacesExisting ? " (replaces existing file)" : ""),
      );
    }
    if (aspect > WARN_ASPECT) {
      console.warn(
        `  ${file} is ${aspect.toFixed(2)}:1; much of it will be cropped away`,
      );
    }
    if (shortSide < MIN_SHORT_SIDE) {
      console.warn(
        `  ${file} is only ${shortSide}px across; its cards will look soft`,
      );
    }
    if (converted || dryRun) continue;
    written.add(outputName);
    const output = path.join(SOURCE_DIRECTORY, outputName);

    const scale = Math.min(1, SOURCE_LONG_SIDE / Math.max(across, upright));
    const buffer = await sharp(source)
      .rotate()
      .resize(Math.round(across * scale), Math.round(upright * scale))
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: SOURCE_QUALITY, mozjpeg: true })
      .toBuffer();
    await fs.writeFile(output, buffer);
    if (outputName !== file) await fs.unlink(source);
  }

  const available = [...new Set(files.map(thumbnailName))];
  return { renames: new Map(), fresh, available };
}

function gameKeys(fileName, source) {
  const keys = new Set([matchKey(path.parse(fileName).name)]);
  const pathMatch = source.match(/\bpath:\s*["']\/?([^"']+)["']/);
  const titleMatch = source.match(/\btitle:\s*["']([^"']+)["']/);
  const aliasesMatch = source.match(/\baliases:\s*\[([^\]]*)\]/);
  if (pathMatch) keys.add(matchKey(pathMatch[1]));
  if (titleMatch) keys.add(matchKey(titleMatch[1]));
  for (const alias of aliasesMatch?.[1].matchAll(/["']([^"']+)["']/g) ?? []) {
    keys.add(matchKey(alias[1]));
  }
  keys.delete("");
  return keys;
}

const ACTIVE_THUMBNAIL = /^([ \t]*)thumbnail:\s*["']([^"']+)["'],?[^\n]*$/m;
const DISABLED_THUMBNAIL =
  /^([ \t]*)\/\/\s*thumbnail:\s*["']([^"']+)["'],?[^\n]*$/m;

/** Whether the game file credits its thumbnail's art in full. */
function hasCredit(source) {
  const block = source.match(/\bthumbnailCredit:\s*\{([^}]*)\}/)?.[1];
  if (!block) return false;
  return (
    CREDIT_FIELDS.every((field) =>
      new RegExp(`\\b${field}:\\s*["'\`][^"'\`]+`).test(block),
    ) && /\bsourceLink:\s*["'`]https?:\/\//.test(block)
  );
}

/** The thumbnail line for `file`, commented out when the art has no credit. */
function thumbnailLine(indent, file, enabled) {
  return enabled
    ? `${indent}thumbnail: "${file}",`
    : `${indent}// thumbnail: "${file}", // ${MISSING_CREDIT_NOTE}`;
}

/** The game file with its thumbnail line set, or inserted after its rating. */
function withThumbnail(source, file, enabled) {
  for (const pattern of [ACTIVE_THUMBNAIL, DISABLED_THUMBNAIL]) {
    const line = source.match(pattern);
    if (line) {
      return source.replace(pattern, thumbnailLine(line[1], file, enabled));
    }
  }
  const rating = source.match(/\n(\s*)rating:\s*\{[^}]*\},?\n/);
  if (!rating) return null;
  const end = rating.index + rating[0].length;
  return `${source.slice(0, end)}${thumbnailLine(rating[1], file, enabled)}\n${source.slice(end)}`;
}

async function assignThumbnails({ renames, fresh, available }) {
  const files = (await fs.readdir(gamesDirectory))
    .filter((file) => file.endsWith(".ts"))
    .sort();
  const games = await Promise.all(
    files.map(async (file) => {
      const filePath = path.join(gamesDirectory, file);
      const source = await fs.readFile(filePath, "utf8");
      const active = source.match(ACTIVE_THUMBNAIL)?.[2];
      const disabled = source.match(DISABLED_THUMBNAIL)?.[2];
      return {
        file,
        filePath,
        source,
        keys: gameKeys(file, source),
        current: active && (renames.get(active) ?? active),
        disabled: disabled && (renames.get(disabled) ?? disabled),
        credited: hasCredit(source),
      };
    }),
  );
  const matchesGame = (game, file) =>
    game.keys.has(matchKey(path.parse(file).name));

  const used = new Set();
  for (const game of games) {
    for (const file of [game.current, game.disabled]) {
      if (file) used.add(file);
    }
  }

  let assigned = 0;
  let uncredited = 0;
  for (const game of games) {
    // New art named after this game replaces whatever it had.
    const freshMatches = [...fresh].filter((file) => matchesGame(game, file));
    let target;
    if (freshMatches.length > 1) {
      console.warn(
        `Skip ${game.file}: several new thumbnails match (${freshMatches.join(", ")})`,
      );
      continue;
    } else if (freshMatches.length === 1) {
      target = freshMatches[0];
    } else if (game.current) {
      target = game.current;
    } else if (game.disabled) {
      target = game.disabled;
    } else {
      const matches = available.filter(
        (file) => !used.has(file) && matchesGame(game, file),
      );
      if (matches.length > 1) {
        console.warn(
          `Skip ${game.file}: several thumbnails match (${matches.join(", ")})`,
        );
        continue;
      }
      if (matches.length === 0) continue;
      target = matches[0];
    }
    used.add(target);

    // Only new art must be credited; older thumbnails stay as they are.
    const needsCredit = fresh.has(target) || target === game.disabled;
    const enabled = !needsCredit || game.credited;
    const next = withThumbnail(game.source, target, enabled);
    if (next === null) {
      console.warn(
        `Skip ${game.file}: no rating block to place ${target} after`,
      );
      continue;
    }
    if (!enabled) {
      uncredited += 1;
      console.warn(
        `${game.file}: ${target} has no thumbnailCredit (title, artistName, ` +
          `sourceName, sourceLink); its assignment is commented out`,
      );
    }
    if (next === game.source) continue;
    const before = game.current ?? (game.disabled && `// ${game.disabled}`);
    console.log(
      `Assign ${game.file}: ${before ?? "(none)"} -> ${enabled ? "" : "// "}${target}`,
    );
    assigned += 1;
    if (!dryRun) await fs.writeFile(game.filePath, next);
  }

  const unassigned = available.filter((file) => !used.has(file));
  if (unassigned.length > 0) {
    console.warn(`Not used by any game: ${unassigned.join(", ")}`);
  }
  return { assigned, uncredited };
}

async function main() {
  const conversion = await convertThumbnails();
  const { assigned, uncredited } = await assignThumbnails(conversion);
  console.log(
    `${dryRun ? "[dry run] " : ""}Converted ${conversion.fresh.size} ` +
      `thumbnail(s), assigned ${assigned}` +
      (uncredited ? `, ${uncredited} commented out for want of credit.` : "."),
  );
  if (!dryRun) {
    execFileSync(
      process.execPath,
      [path.join(__dirname, "generate-assets.js")],
      { stdio: "inherit" },
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
