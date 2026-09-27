#!/usr/bin/env node

// Draws every thumbnail's source image with the box its cropped thumbnail is
// cut to, so a wrong crop is quick to spot:
//   npm run thumbnails:review
// Red boxes were found automatically, blue ones set in
// assets/thumbnails-source/crops.json, and a dashed box means detection gave
// up and kept the whole image. The sheets go to .thumbnail-review/ (not
// committed). Fix a wrong crop in crops.json (see scripts/thumbnail-crop.mjs),
// then run npm run assets:generate.
//
// Pass image names (without extension) to review only those.

import { Buffer } from "buffer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";
import {
  SOURCE_DIRECTORY,
  cropRegion,
  findCrop,
  readCropOverrides,
} from "./thumbnail-crop.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputDirectory = path.join(__dirname, "..", ".thumbnail-review");
const CELL = Number(process.env.CELL || 240);
const LABEL = 18;
const COLUMNS = 6;
const PER_SHEET = 36;

const escape = (text) =>
  text.replace(
    /[&<>]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c],
  );

async function cell(file, overrides) {
  const source = path.join(SOURCE_DIRECTORY, file);
  const image = await sharp(source)
    .rotate()
    .resize(CELL, CELL - LABEL, { fit: "inside" })
    .toBuffer();
  const { width, height } = await sharp(image).metadata();
  const { crop, manual, rejected } = await findCrop(source, overrides);
  const box = cropRegion(crop, width, height);
  const colour = manual ? "#1e6fff" : "#ff2020";
  const box_svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect x="${box.left + 1}" y="${box.top + 1}" width="${box.width - 2}" height="${box.height - 2}"
      fill="none" stroke="${colour}" stroke-width="2" ${rejected ? 'stroke-dasharray="6 4"' : ""}/></svg>`;
  return {
    input: await sharp(image)
      .composite([{ input: Buffer.from(box_svg) }])
      .toBuffer(),
    width,
    height,
    name: path.parse(file).name,
  };
}

async function main() {
  const only = process.argv.slice(2);
  const files = fs
    .readdirSync(SOURCE_DIRECTORY)
    .filter((file) => /\.(jpe?g|png|webp)$/i.test(file))
    .filter((file) => !only.length || only.includes(path.parse(file).name))
    .sort((a, b) => a.localeCompare(b));
  const overrides = readCropOverrides();
  fs.mkdirSync(outputDirectory, { recursive: true });
  for (const old of fs.readdirSync(outputDirectory)) {
    fs.rmSync(path.join(outputDirectory, old));
  }

  for (let start = 0; start < files.length; start += PER_SHEET) {
    const cells = [];
    for (const file of files.slice(start, start + PER_SHEET)) {
      cells.push(await cell(file, overrides));
    }
    const rows = Math.ceil(cells.length / COLUMNS);
    const sheetWidth = COLUMNS * (CELL + 8);
    const sheetHeight = rows * (CELL + 8);
    let labels = "";
    const composites = cells.map((c, i) => {
      const x = (i % COLUMNS) * (CELL + 8);
      const y = Math.floor(i / COLUMNS) * (CELL + 8);
      labels += `<text x="${x + 4}" y="${y + CELL - 4}" font-family="sans-serif" font-size="13">${escape(c.name)}</text>`;
      return {
        input: c.input,
        left: x + Math.round((CELL - c.width) / 2),
        top: y + Math.round((CELL - LABEL - c.height) / 2),
      };
    });
    const background = `<svg width="${sheetWidth}" height="${sheetHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#bbbbbb"/>${labels}</svg>`;
    const output = path.join(
      outputDirectory,
      `crops-${String(start / PER_SHEET + 1).padStart(2, "0")}.jpg`,
    );
    await sharp(Buffer.from(background))
      .composite(composites)
      .jpeg({ quality: 80 })
      .toFile(output);
    console.log(`Wrote ${path.relative(process.cwd(), output)}`);
  }
}

await main();
