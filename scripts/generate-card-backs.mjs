#!/usr/bin/env node

// Pre-renders the SVG card-back color filter into one PNG per game. Run:
//   npm run card-backs:generate

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const gamesDirectory = path.join(projectRoot, "src", "data", "games");
const sourceImage = path.join(projectRoot, "assets", "cards", "CardBack.png");
const outputDirectory = path.join(projectRoot, "assets", "cards", "backs");
const LUMINANCE = [0.2126, 0.7152, 0.0722];
const DEFAULT_CARD_BACK = {
  path: "/default",
  title: "Default",
  color: "#315a9b",
};

function srgbToLinear(channel) {
  return channel <= 0.04045
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4;
}

function linearToSrgb(channel) {
  return channel <= 0.0031308
    ? channel * 12.92
    : 1.055 * channel ** (1 / 2.4) - 0.055;
}

function parseGameDefinition(source, fileName) {
  const pathMatch = source.match(/\bpath:\s*["']([^"']+)["']/);
  const titleMatch = source.match(/\btitle:\s*["']([^"']+)["']/);
  const colorMatch = source.match(/\bgameColorMid:\s*["'](#[0-9a-f]{6})["']/i);

  if (!pathMatch || !titleMatch || !colorMatch) {
    throw new Error(`Could not read game metadata from ${fileName}.`);
  }

  return {
    path: pathMatch[1],
    title: titleMatch[1],
    color: colorMatch[1],
  };
}

function colorBackPixels(data, color) {
  const targetRgb = [1, 3, 5].map((index) =>
    srgbToLinear(parseInt(color.slice(index, index + 2), 16) / 255),
  );

  for (let index = 0; index < data.length; index += 4) {
    const sourceLuminance = LUMINANCE.reduce(
      (total, weight, channel) =>
        total + weight * srgbToLinear(data[index + channel] / 255),
      0,
    );

    for (let channel = 0; channel < 3; channel += 1) {
      const tinted =
        targetRgb[channel] + (1 - targetRgb[channel]) * sourceLuminance;
      data[index + channel] = Math.round(
        Math.min(1, Math.max(0, linearToSrgb(tinted))) * 255,
      );
    }
  }
}

async function renderCardBack(game) {
  const { data, info } = await sharp(sourceImage)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  colorBackPixels(data, game.color);

  const outputFile = path.join(outputDirectory, `${game.path.slice(1)}.png`);
  await sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: info.channels,
    },
  })
    .png()
    .toFile(outputFile);
}

async function main() {
  const files = (await fs.readdir(gamesDirectory))
    .filter((file) => file.endsWith(".ts"))
    .sort((first, second) => first.localeCompare(second));
  const games = await Promise.all(
    files.map(async (fileName) =>
      parseGameDefinition(
        await fs.readFile(path.join(gamesDirectory, fileName), "utf8"),
        fileName,
      ),
    ),
  );

  await fs.mkdir(outputDirectory, { recursive: true });
  await Promise.all([...games, DEFAULT_CARD_BACK].map(renderCardBack));
  console.log(
    `Generated ${games.length} game card backs in ${outputDirectory}.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
