#!/usr/bin/env node

// Renders assets/cards/CardBack.svg once per card-back ink. Run:
//   npm run card-backs:generate
//
// The SVG is a two-tone ornament: black linework on a white rect. Each ink
// recolours the linework and the rect is replaced by the card stock, so one
// drawing produces the whole set. Inks come from src/data/card-backs.ts, so
// editing that list (or the SVG) and re-running is all it takes.
//
// Backs are shared across games, so this writes one file per ink rather than
// one per game. Pass --dry-run to only report what would change.

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const sourceSvg = path.join(projectRoot, "assets", "cards", "CardBack.svg");
const paletteFile = path.join(projectRoot, "src", "data", "card-backs.ts");
const outputDirectory = path.join(projectRoot, "assets", "cards", "backs");

const WIDTH = 500;
const HEIGHT = 700;
const QUALITY = 88;
const dryRun = process.argv.includes("--dry-run");

/** Reads CARD_BACK_INKS and CARD_BACK_STOCK out of the palette module. */
async function readPalette() {
  const source = await fs.readFile(paletteFile, "utf8");

  const block = source.match(
    /CARD_BACK_INKS:\s*Record<CardBackColor,\s*HexColor>\s*=\s*\{([\s\S]*?)\n\};/,
  )?.[1];
  if (!block) throw new Error(`Could not read CARD_BACK_INKS from ${paletteFile}`);

  const inks = [...block.matchAll(/(\w+):\s*["'](#[0-9a-fA-F]{6})["']/g)].map(
    (match) => ({ name: match[1], ink: match[2].toLowerCase() }),
  );
  if (inks.length === 0) throw new Error("No inks found in CARD_BACK_INKS.");

  const stock =
    source.match(/CARD_BACK_STOCK:\s*HexColor\s*=\s*["'](#[0-9a-fA-F]{6})["']/)?.[1] ??
    "#ffffff";

  return { inks, stock: stock.toLowerCase() };
}

/**
 * The ornament is every black fill; the single white rect is the stock. Both
 * are swapped textually, which keeps the vector crisp at any output size.
 */
function recolor(svg, ink, stock) {
  return svg
    .replaceAll('fill="white"', `fill="${stock}"`)
    .replaceAll('fill="black"', `fill="${ink}"`);
}

async function main() {
  const [svg, palette] = await Promise.all([
    fs.readFile(sourceSvg, "utf8"),
    readPalette(),
  ]);

  if (!svg.includes('fill="black"') || !svg.includes('fill="white"')) {
    throw new Error(
      "CardBack.svg no longer uses plain black/white fills; update recolor().",
    );
  }

  await fs.mkdir(outputDirectory, { recursive: true });

  const expected = new Set();
  for (const { name, ink } of palette.inks) {
    const fileName = `${name.toLowerCase()}.webp`;
    expected.add(fileName);
    console.log(`${dryRun ? "[dry run] " : ""}${fileName.padEnd(16)} ${ink}`);
    if (dryRun) continue;

    const buffer = await sharp(
      Buffer.from(recolor(svg, ink, palette.stock)),
      { density: 300 },
    )
      .resize(WIDTH, HEIGHT, { fit: "fill" })
      .webp({ quality: QUALITY })
      .toBuffer();
    await fs.writeFile(path.join(outputDirectory, fileName), buffer);
  }

  // Backs used to be generated per game; drop anything no longer in the list.
  const existing = await fs.readdir(outputDirectory).catch(() => []);
  const stale = existing.filter(
    (file) => file.endsWith(".webp") && !expected.has(file),
  );
  for (const file of stale) {
    console.log(`${dryRun ? "[dry run] " : ""}remove stale ${file}`);
    if (!dryRun) await fs.unlink(path.join(outputDirectory, file));
  }

  console.log(
    `\n${dryRun ? "[dry run] " : ""}${palette.inks.length} card back(s), ` +
      `${stale.length} stale file(s) removed.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
