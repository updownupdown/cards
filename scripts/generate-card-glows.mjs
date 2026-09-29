#!/usr/bin/env node

// Bakes each game's glow: its art shrunk to a few pixels, its colours
// lifted, then blurred out into a soft halo on transparency. Home draws it
// scaled up behind the game's card, so the painting seems to cast its own
// light. Baked rather than blurred in the app: a live blur keeps a hard edge
// on Android and costs a pass per card; these are a few hundred bytes each.
// Run:
//   npm run glows:generate

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = path.join(root, "assets/thumbnails");
const outDir = path.join(root, "assets/glows");
fs.mkdirSync(outDir, { recursive: true });

/** The art's size in the glow, and the soft margin round it (see CardGlow). */
const CORE = 32;
const MARGIN = 10;

const files = fs
  .readdirSync(sourceDir)
  .filter((file) => file.endsWith(".webp"))
  .sort((a, b) => a.localeCompare(b));

for (const file of files) {
  const core = await sharp(path.join(sourceDir, file))
    .resize(CORE, CORE, { fit: "cover" })
    .modulate({ saturation: 1.5, brightness: 1.1 })
    .ensureAlpha()
    .png()
    .toBuffer();
  await sharp(core)
    .extend({
      top: MARGIN,
      bottom: MARGIN,
      left: MARGIN,
      right: MARGIN,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .blur(5)
    .webp({ quality: 80, alphaQuality: 80 })
    .toFile(path.join(outDir, file));
}

const lines = files.map(
  (file) => `  "${file}": require("@/assets/glows/${file}"),`,
);
fs.writeFileSync(
  path.join(root, "src/data/game-glows.ts"),
  `// AUTO-GENERATED FILE. DO NOT EDIT.
// Run: npm run glows:generate

/** Each game's soft glow (see scripts/generate-card-glows.mjs). */
export const GAME_GLOW_ASSETS = {
${lines.join("\n")}
} as const;

/** The art's share of a glow's side, and the soft margin round it. */
export const GLOW_CORE = ${CORE};
export const GLOW_MARGIN = ${MARGIN};
`,
);
const total = files.reduce(
  (sum, file) => sum + fs.statSync(path.join(outDir, file)).size,
  0,
);
console.log(`${files.length} glows, ${Math.round(total / 1024)} KB`);
