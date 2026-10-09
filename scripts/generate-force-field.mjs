#!/usr/bin/env node

// Draws the Odyssey's force field (src/components/Campaign/ForceField.tsx):
// a glass ball seen from above, round the centre of the map. White on
// transparent, so the app tints it in the colour theme's accent. Baked, like
// the galaxy's arms, because Android draws a map-sized SVG as one huge
// bitmap. Run:
//   npm run force-field:generate

import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "assets/images/force-field.webp");

/** The image's side, in pixels. */
const SIZE = 1024;
/**
 * The ball's radius as a share of half the image: the rest is the halo round
 * it. FIELD_EXTENT in ForceField.tsx must match.
 */
const BALL = 1 / 1.08;

const c = SIZE / 2;
const r = c * BALL;
const hex = 22;
const hexH = hex * Math.sqrt(3);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
<defs>
  <radialGradient id="shell" cx="${c}" cy="${c}" r="${r}" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#fff" stop-opacity="0"/>
    <stop offset="0.6" stop-color="#fff" stop-opacity="0.012"/>
    <stop offset="0.85" stop-color="#fff" stop-opacity="0.05"/>
    <stop offset="0.96" stop-color="#fff" stop-opacity="0.13"/>
    <stop offset="1" stop-color="#fff" stop-opacity="0.22"/>
  </radialGradient>
  <radialGradient id="halo" cx="${c}" cy="${c}" r="${c}" gradientUnits="userSpaceOnUse">
    <stop offset="${BALL - 0.004}" stop-color="#fff" stop-opacity="0"/>
    <stop offset="${BALL}" stop-color="#fff" stop-opacity="0.16"/>
    <stop offset="${BALL + 0.025}" stop-color="#fff" stop-opacity="0.05"/>
    <stop offset="1" stop-color="#fff" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="rimFade" cx="${c}" cy="${c}" r="${r}" gradientUnits="userSpaceOnUse">
    <stop offset="0.78" stop-color="#fff" stop-opacity="0"/>
    <stop offset="1" stop-color="#fff" stop-opacity="1"/>
  </radialGradient>
  <mask id="rim"><circle cx="${c}" cy="${c}" r="${r}" fill="url(#rimFade)"/></mask>
  <pattern id="hex" width="${hex * 3}" height="${hexH}" patternUnits="userSpaceOnUse" x="${c}" y="${c}">
    <path d="M0 ${hexH / 2} L${hex / 2} 0 L${hex * 1.5} 0 L${hex * 2} ${hexH / 2} L${hex * 1.5} ${hexH} L${hex / 2} ${hexH} Z M${hex * 2} ${hexH / 2} L${hex * 3} ${hexH / 2}" fill="none" stroke="#fff" stroke-width="1.1"/>
  </pattern>
  <radialGradient id="gloss" cx="0.5" cy="0.5" r="0.5">
    <stop offset="0" stop-color="#fff" stop-opacity="0.07"/>
    <stop offset="1" stop-color="#fff" stop-opacity="0"/>
  </radialGradient>
</defs>
<circle cx="${c}" cy="${c}" r="${c}" fill="url(#halo)"/>
<circle cx="${c}" cy="${c}" r="${r}" fill="url(#shell)"/>
<circle cx="${c}" cy="${c}" r="${r}" fill="url(#hex)" mask="url(#rim)" opacity="0.32"/>
<ellipse cx="${c - r * 0.36}" cy="${c - r * 0.52}" rx="${r * 0.52}" ry="${r * 0.17}" transform="rotate(-32 ${c - r * 0.36} ${c - r * 0.52})" fill="url(#gloss)"/>
<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="#fff" stroke-opacity="0.6" stroke-width="2.4"/>
</svg>`;

await sharp(Buffer.from(svg))
  .webp({ quality: 90, alphaQuality: 100 })
  .toFile(out);
console.log(`Wrote ${path.relative(root, out)}`);
