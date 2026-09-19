#!/usr/bin/env node

// Converts JPG backgrounds to pre-blurred WebP assets. Run:
//   npm run backgrounds:convert
//
// Images larger than 1200x1600 are resized to fit within those bounds without
// changing their aspect ratio. Pass --dry-run to only report changes.

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const backgroundsDirectory = path.join(projectRoot, "assets", "backgrounds");
const backgroundsRegistry = path.join(
  projectRoot,
  "src",
  "data",
  "game-backgrounds.ts",
);

const MAX_WIDTH = 1200;
const MAX_HEIGHT = 1600;
const BLUR_SIGMA = 4.9;
const QUALITY = 95;
const JPG_EXTS = new Set([".jpg", ".jpeg"]);
const dryRun = process.argv.includes("--dry-run");

async function main() {
  const files = (await fs.readdir(backgroundsDirectory))
    .filter((file) => JPG_EXTS.has(path.extname(file).toLowerCase()))
    .sort((first, second) => first.localeCompare(second));
  let registrySource = await fs.readFile(backgroundsRegistry, "utf8");
  let updatedReferences = 0;

  for (const file of files) {
    const source = path.join(backgroundsDirectory, file);
    const outputName = `${path.parse(file).name}.webp`;
    const output = path.join(backgroundsDirectory, outputName);
    const { width, height } = await sharp(source).metadata();
    console.log(
      `Convert ${file} (${width}x${height}) -> ${outputName} ` +
        `(max ${MAX_WIDTH}x${MAX_HEIGHT}, blur ${BLUR_SIGMA})`,
    );

    const sourceReference = `/backgrounds/${file}`;
    const outputReference = `/backgrounds/${outputName}`;
    if (registrySource.includes(sourceReference)) {
      registrySource = registrySource.replaceAll(
        sourceReference,
        outputReference,
      );
      updatedReferences += 1;
    }

    if (dryRun) continue;

    const buffer = await sharp(source)
      .rotate()
      .resize({
        width: MAX_WIDTH,
        height: MAX_HEIGHT,
        fit: "inside",
        withoutEnlargement: true,
      })
      .blur(BLUR_SIGMA)
      .webp({ quality: QUALITY, smartSubsample: true, effort: 6 })
      .toBuffer();
    await fs.writeFile(output, buffer);
    await fs.unlink(source);
  }

  if (!dryRun && updatedReferences > 0) {
    await fs.writeFile(backgroundsRegistry, registrySource);
  }

  console.log(
    `${dryRun ? "[dry run] " : ""}Converted ${files.length} background(s), ` +
      `updated ${updatedReferences} registry reference(s).`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
