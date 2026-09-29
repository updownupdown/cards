#!/usr/bin/env node

// Draws the tiles of the Home starfield (src/components/Home/Starfield.tsx):
// one seamless square per parallax layer, repeated and slid behind the tabs.
// Stars are baked in rather than drawn as views, so hundreds of them, with
// their glows and colours, cost a handful of images. Run:
//   npm run starfield:generate

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "assets/starfield");
fs.mkdirSync(outDir, { recursive: true });

/**
 * Star colours by temperature, weighted as a dark sky shows them: mostly
 * white and blue-white, a few warm.
 */
const COLOURS = [
  ["#aabfff", 3],
  ["#cad7ff", 5],
  ["#f8f7ff", 8],
  ["#fff4ea", 4],
  ["#ffe2c0", 2],
  ["#ffcc8f", 1],
];
const TOTAL_WEIGHT = COLOURS.reduce((sum, [, weight]) => sum + weight, 0);

function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickColour(random) {
  let roll = random() * TOTAL_WEIGHT;
  for (const [colour, weight] of COLOURS) {
    roll -= weight;
    if (roll <= 0) return colour;
  }
  return COLOURS[0][0];
}

/**
 * The layers, in dp: a tile's side (sizes kept apart so their repeats never
 * line up), how many stars, their radius and brightness, and how much glow.
 * `clusters` gathers some stars into loose clumps, as open clusters do.
 */
const LAYERS = {
  dust: {
    tile: 480,
    count: 420,
    radius: [0.22, 0.45],
    alpha: [0.25, 0.6],
    glow: 0,
    clusters: 3,
  },
  small: {
    tile: 560,
    count: 170,
    radius: [0.4, 0.7],
    alpha: [0.4, 0.8],
    glow: 0.25,
    clusters: 2,
  },
  mid: {
    tile: 650,
    count: 60,
    radius: [0.65, 0.95],
    alpha: [0.6, 0.95],
    glow: 0.5,
    clusters: 0,
  },
  bright: {
    tile: 770,
    count: 16,
    radius: [0.95, 1.35],
    alpha: [0.8, 1],
    glow: 0.8,
    clusters: 0,
  },
  hero: {
    tile: 910,
    count: 4,
    radius: [1.4, 1.9],
    alpha: [0.9, 1],
    glow: 1,
    clusters: 0,
    spikes: true,
  },
  twinkleA: {
    tile: 700,
    count: 12,
    radius: [0.7, 1.1],
    alpha: [0.8, 1],
    glow: 0.7,
    clusters: 0,
  },
  twinkleB: {
    tile: 830,
    count: 10,
    radius: [0.8, 1.2],
    alpha: [0.8, 1],
    glow: 0.7,
    clusters: 0,
  },
};
/** Pixels per dp in the tiles, capped so no tile decodes too large. */
const DENSITY = 2;
const MAX_PX = 1024;

function starsFor(name, layer) {
  const random = seeded(
    [...name].reduce((sum, char) => sum * 31 + char.charCodeAt(0), 7) >>> 0,
  );
  const centres = Array.from({ length: layer.clusters }, () => [
    random(),
    random(),
  ]);
  return Array.from({ length: layer.count }, (_, index) => {
    let x = random();
    let y = random();
    // A share of the stars fall around a cluster's centre.
    if (centres.length && index % 4 === 0) {
      const [cx, cy] = centres[index % centres.length];
      const angle = random() * Math.PI * 2;
      const reach = Math.abs(random() + random() - 1) * 0.2;
      x = (cx + Math.cos(angle) * reach + 1) % 1;
      y = (cy + Math.sin(angle) * reach + 1) % 1;
    }
    // Most stars faint, a few bright: brightness skews low.
    const skew = random() ** 1.8;
    const [r0, r1] = layer.radius;
    const [a0, a1] = layer.alpha;
    return {
      x,
      y,
      r: r0 + (r1 - r0) * skew,
      a: a0 + (a1 - a0) * (0.4 * random() + 0.6 * skew),
      colour: pickColour(random),
    };
  });
}

async function starTile(name, layer) {
  const px = Math.min(MAX_PX, Math.round(layer.tile * DENSITY));
  const scale = px / layer.tile;
  const stars = starsFor(name, layer);
  const gradients = COLOURS.map(
    ([colour], index) =>
      `<radialGradient id="g${index}"><stop offset="0" stop-color="${colour}" stop-opacity="1"/><stop offset="0.25" stop-color="${colour}" stop-opacity="0.35"/><stop offset="1" stop-color="${colour}" stop-opacity="0"/></radialGradient>`,
  ).join("");
  const shapes = [];
  for (const star of stars) {
    const r = star.r * scale;
    const glowR = r * (4 + 6 * layer.glow);
    const gradient = `g${COLOURS.findIndex(([colour]) => colour === star.colour)}`;
    // Drawn again across each edge it spills over, so the tile is seamless.
    const reach = glowR + (layer.spikes ? r * 14 : 0);
    const cx0 = star.x * px;
    const cy0 = star.y * px;
    for (const dx of [-px, 0, px]) {
      for (const dy of [-px, 0, px]) {
        const cx = cx0 + dx;
        const cy = cy0 + dy;
        if (cx < -reach || cx > px + reach || cy < -reach || cy > px + reach)
          continue;
        if (layer.glow > 0) {
          shapes.push(
            `<circle cx="${cx}" cy="${cy}" r="${glowR}" fill="url(#${gradient})" opacity="${(star.a * layer.glow * 0.55).toFixed(3)}"/>`,
          );
        }
        if (layer.spikes) {
          // Faint diffraction spikes, as a telescope draws a bright star.
          const len = r * 14;
          shapes.push(
            `<path d="M${cx - len} ${cy}H${cx + len}M${cx} ${cy - len}V${cy + len}" stroke="${star.colour}" stroke-width="${r * 0.35}" stroke-linecap="round" opacity="${(star.a * 0.22).toFixed(3)}"/>`,
          );
        }
        shapes.push(
          `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${star.colour}" opacity="${star.a.toFixed(3)}"/>`,
        );
      }
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}"><defs>${gradients}</defs>${shapes.join("")}</svg>`;
  await sharp(Buffer.from(svg))
    .png({ compressionLevel: 9, palette: false })
    .toFile(path.join(outDir, `${name}.png`));
  return { name, tile: layer.tile, px };
}

/**
 * The nebula: soft white clouds on transparency, tinted in the app by the
 * theme. Drawn three by three and blurred, then cut from the middle, so
 * its edges meet.
 */
async function nebulaTile() {
  const tile = 1100;
  const px = 512;
  const random = seeded(90210);
  const blobs = Array.from({ length: 9 }, () => ({
    x: random() * px,
    y: random() * px,
    rx: px * (0.12 + random() * 0.22),
    ry: px * (0.06 + random() * 0.14),
    rotate: random() * 180,
    a: 0.25 + random() * 0.45,
  }));
  const shapes = [];
  for (const blob of blobs) {
    for (const dx of [0, px, px * 2]) {
      for (const dy of [0, px, px * 2]) {
        shapes.push(
          `<ellipse cx="${blob.x + dx}" cy="${blob.y + dy}" rx="${blob.rx}" ry="${blob.ry}" fill="#ffffff" opacity="${blob.a.toFixed(3)}" transform="rotate(${blob.rotate} ${blob.x + dx} ${blob.y + dy})"/>`,
        );
      }
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${px * 3}" height="${px * 3}">${shapes.join("")}</svg>`;
  const blurred = await sharp(Buffer.from(svg))
    .blur(px * 0.09)
    .png()
    .toBuffer();
  await sharp(blurred)
    .extract({ left: px, top: px, width: px, height: px })
    .png({ compressionLevel: 9 })
    .toFile(path.join(outDir, "nebula.png"));
  return { name: "nebula", tile, px };
}

const results = [];
for (const [name, layer] of Object.entries(LAYERS)) {
  results.push(await starTile(name, layer));
}
results.push(await nebulaTile());
for (const { name, tile, px } of results) {
  const kb = Math.round(
    fs.statSync(path.join(outDir, `${name}.png`)).size / 1024,
  );
  console.log(`${name}.png  ${px}px for ${tile}dp  ${kb} KB`);
}
