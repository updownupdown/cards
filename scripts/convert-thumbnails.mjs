#!/usr/bin/env node

// Normalizes game thumbnails and assigns new ones to their games. Drop an
// image of any common format and size into assets/thumbnails, then run:
//   npm run thumbnails:convert
//
// 1. Converts every image that isn't a 460x460 WebP into one (center-cropped
//    if not square), replacing the original file.
// 2. For each game file that has no thumbnail, or uses the default one,
//    assigns a thumbnail whose name matches the game's file name, path,
//    title or an alias (e.g. "GrandfatherClock.webp" -> grandfathers-clock.ts).
// 3. Regenerates src/data/game-thumbnails.ts.
//
// Pass --dry-run to only report what would change.

import fs from "fs/promises";
import path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const thumbnailsDirectory = path.join(projectRoot, "assets", "thumbnails");
const gamesDirectory = path.join(projectRoot, "src", "data", "games");

const SIZE = 460;
const QUALITY = 80;
const IMAGE_EXTS = [".png", ".jpg", ".jpeg", ".webp", ".avif", ".tif", ".tiff"];
const DEFAULT_THUMBNAIL = "DefaultThumbnail.webp";
const IGNORED_WORDS = new Set(["the", "a", "an"]);
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

async function convertThumbnails() {
  const files = (await fs.readdir(thumbnailsDirectory))
    .filter((file) => IMAGE_EXTS.includes(path.extname(file).toLowerCase()))
    .sort((a, b) => a.localeCompare(b));
  const renames = new Map();
  let converted = 0;

  for (const file of files) {
    const source = path.join(thumbnailsDirectory, file);
    const { format, width, height } = await sharp(source).metadata();
    if (format === "webp" && width === SIZE && height === SIZE) continue;

    const outputName = `${path.parse(file).name}.webp`;
    const output = path.join(thumbnailsDirectory, outputName);
    const replacesExisting = outputName !== file && files.includes(outputName);
    console.log(
      `Convert ${file} (${format} ${width}x${height}) -> ${outputName}` +
        (replacesExisting ? " (replaces existing file)" : ""),
    );
    if (outputName !== file) renames.set(file, outputName);
    converted += 1;
    if (dryRun) continue;

    const buffer = await sharp(source)
      .rotate()
      .resize(SIZE, SIZE, { fit: "cover" })
      .webp({ quality: QUALITY })
      .toBuffer();
    await fs.writeFile(output, buffer);
    if (outputName !== file) await fs.unlink(source);
  }

  const available = dryRun
    ? files.map((file) => renames.get(file) ?? file)
    : (await fs.readdir(thumbnailsDirectory)).filter(
        (file) => path.extname(file).toLowerCase() === ".webp",
      );
  return { converted, renames, available: [...new Set(available)] };
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

async function assignThumbnails({ renames, available }) {
  const files = (await fs.readdir(gamesDirectory))
    .filter((file) => file.endsWith(".ts"))
    .sort();
  const games = await Promise.all(
    files.map(async (file) => {
      const filePath = path.join(gamesDirectory, file);
      const source = await fs.readFile(filePath, "utf8");
      return { file, filePath, source, keys: gameKeys(file, source) };
    }),
  );

  const used = new Set();
  for (const game of games) {
    const current = game.source.match(/\bthumbnail:\s*["']([^"']+)["']/)?.[1];
    game.current = current;
    if (current && current !== DEFAULT_THUMBNAIL) {
      used.add(renames.get(current) ?? current);
    }
  }

  let assigned = 0;
  for (const game of games) {
    let next = game.source;
    let message;

    // Keep references valid when a referenced file was converted to .webp.
    if (game.current && renames.has(game.current)) {
      const renamed = renames.get(game.current);
      next = next.replace(
        /(\bthumbnail:\s*["'])[^"']+(["'])/,
        `$1${renamed}$2`,
      );
      message = `${game.file}: ${game.current} -> ${renamed}`;
    } else if (!game.current || game.current === DEFAULT_THUMBNAIL) {
      const matches = available.filter(
        (file) =>
          file !== DEFAULT_THUMBNAIL &&
          !used.has(file) &&
          game.keys.has(matchKey(path.parse(file).name)),
      );
      if (matches.length > 1) {
        console.warn(
          `Skip ${game.file}: several thumbnails match (${matches.join(", ")})`,
        );
        continue;
      }
      if (matches.length === 0) continue;

      const [match] = matches;
      used.add(match);
      if (game.current) {
        next = next.replace(
          /(\bthumbnail:\s*["'])[^"']+(["'])/,
          `$1${match}$2`,
        );
      } else {
        // Insert after the rating block, where other games declare it.
        const rating = next.match(/\n(\s*)rating:\s*\{[^}]*\},?\n/);
        if (!rating) {
          console.warn(
            `Skip ${game.file}: no rating block to place ${match} after`,
          );
          continue;
        }
        const end = rating.index + rating[0].length;
        next = `${next.slice(0, end)}${rating[1]}thumbnail: "${match}",\n${next.slice(end)}`;
      }
      message = `${game.file}: ${game.current ?? "(none)"} -> ${match}`;
    }

    if (!message || next === game.source) continue;
    console.log(`Assign ${message}`);
    assigned += 1;
    if (!dryRun) await fs.writeFile(game.filePath, next);
  }

  const unassigned = available.filter(
    (file) => file !== DEFAULT_THUMBNAIL && !used.has(file),
  );
  if (unassigned.length > 0) {
    console.warn(`Not used by any game: ${unassigned.join(", ")}`);
  }
  return assigned;
}

async function main() {
  const conversion = await convertThumbnails();
  const assigned = await assignThumbnails(conversion);
  console.log(
    `${dryRun ? "[dry run] " : ""}Converted ${conversion.converted} ` +
      `thumbnail(s), assigned ${assigned}.`,
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
