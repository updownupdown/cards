#!/usr/bin/env node
/* global Buffer */

// Generates Google Play store listing graphics into store-assets/.
// Run: node scripts/generate-store-graphics.mjs

import sharp from "sharp";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "store-assets");

const BG_DARK = "#21282E";
const BG_DARKER = "#14181C";
const RED = "#C62440";
const GREY = "#CAD3DC";

// The feature graphic carries the store tagline, so it is rendered per
// language: `--lang fr` writes feature-graphic-1024x500-fr.png. The icon has
// no text, so it is only written for English.
const TAGLINES = {
  en: [
    "A collection of 100 solo playing card games,",
    "including classic solitaire and modern mechanics games.",
  ],
  fr: [
    "Une collection de 100 jeux de cartes en solo,",
    "des réussites classiques aux jeux aux mécaniques modernes.",
  ],
  es: [
    "Una colección de 100 juegos de cartas en solitario,",
    "del solitario clásico a los juegos de mecánicas modernas.",
  ],
  it: [
    "Una raccolta di 100 giochi di carte in solitario,",
    "dai solitari classici ai giochi dalle meccaniche moderne.",
  ],
  pt: [
    "Uma coleção de 100 jogos de cartas para um jogador,",
    "das paciências clássicas aos jogos de mecânicas modernas.",
  ],
  tr: [
    "Tek kişilik 100 kart oyunundan oluşan bir koleksiyon;",
    "klasik pasyanslardan modern mekanikli oyunlara.",
  ],
  id: [
    "Koleksi 100 permainan kartu untuk satu pemain,",
    "dari solitaire klasik hingga permainan bermekanik modern.",
  ],
};

const languageIndex = process.argv.indexOf("--lang");
const LANGUAGE = languageIndex === -1 ? "en" : process.argv[languageIndex + 1];
if (!TAGLINES[LANGUAGE]) {
  console.error(`Unknown language "${LANGUAGE}".`);
  process.exit(1);
}

fs.mkdirSync(OUT, { recursive: true });

// ---------- 1. Play Store icon: 512x512 from the 1024x1024 source ----------
async function makeStoreIcon() {
  await sharp(`${ROOT}/assets/app-icon/icon.png`)
    .resize(512, 512)
    .flatten({ background: RED })
    .png()
    .toFile(`${OUT}/play-store-icon-512.png`);
  console.log("wrote play-store-icon-512.png");
}

// ---------- 2. Feature graphic: 1024x500 ----------
async function makeFeatureGraphic() {
  const W = 1024;
  const H = 500;

  const bgSvg = `
  <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="g" cx="30%" cy="45%" r="85%">
        <stop offset="0%" stop-color="${BG_DARK}"/>
        <stop offset="100%" stop-color="${BG_DARKER}"/>
      </radialGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#g)"/>
  </svg>`;

  const background = await sharp(Buffer.from(bgSvg)).png().toBuffer();

  // Large faded spade mark bleeding off the right edge. Isolate the white
  // spade silhouette (drop the red square background) by thresholding
  // luminance, scale it down to a faint alpha level, then join it as the
  // alpha channel of a solid white layer - so only the spade shape tints
  // the background, with no visible bounding box.
  const spadeSize = 640;
  const spadeLeft = W - spadeSize + 160;
  const spadeTop = Math.round(H / 2 - spadeSize / 2);
  const visibleTop = Math.max(0, -spadeTop);
  const visibleHeight = Math.min(spadeSize - visibleTop, H);
  const visibleWidth = Math.min(spadeSize, W - spadeLeft);

  const spadeAlpha = await sharp(`${ROOT}/assets/app-icon/icon.png`)
    .resize(spadeSize, spadeSize)
    .extract({
      left: 0,
      top: visibleTop,
      width: visibleWidth,
      height: visibleHeight,
    })
    .grayscale()
    .threshold(180)
    .linear(0.16, 0)
    .raw()
    .toBuffer();

  const whiteRgb = await sharp({
    create: {
      width: visibleWidth,
      height: visibleHeight,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  })
    .raw()
    .toBuffer();

  const fadedSpade = await sharp(whiteRgb, {
    raw: { width: visibleWidth, height: visibleHeight, channels: 3 },
  })
    .joinChannel(spadeAlpha, {
      raw: { width: visibleWidth, height: visibleHeight, channels: 1 },
    })
    .png()
    .toBuffer();

  // Wordmark, scaled up, plus tagline, as one vector composition
  const wordmarkSrc = fs.readFileSync(
    `${ROOT}/assets/images/SoloSuiteLogo.svg`,
    "utf8",
  );
  const wordmarkInner = wordmarkSrc
    .replace(/^[\s\S]*?<svg[^>]*>/, "")
    .replace(/<\/svg>\s*$/, "");

  const wordmarkWidth = 560;
  const wordmarkHeight = (wordmarkWidth * 32) / 140;
  const leftMargin = 72;

  const taglineLines = TAGLINES[LANGUAGE];
  const featureGraphicName =
    LANGUAGE === "en"
      ? "feature-graphic-1024x500.png"
      : `feature-graphic-1024x500-${LANGUAGE}.png`;
  const taglineFontSize = 26;
  const taglineLineHeight = taglineFontSize * 1.4;
  const taglineTop = wordmarkHeight + 46;

  const blockHeight =
    wordmarkHeight + 46 + taglineLineHeight * taglineLines.length;
  const blockTop = Math.round((H - blockHeight) / 2);

  const taglineTspans = taglineLines
    .map(
      (line, index) =>
        `<tspan x="0" dy="${index === 0 ? 0 : taglineLineHeight}">${line}</tspan>`,
    )
    .join("");

  const lockupSvg = `
  <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <g transform="translate(${leftMargin}, ${blockTop})">
      <svg width="${wordmarkWidth}" height="${wordmarkHeight}" viewBox="0 0 140 32">
        ${wordmarkInner}
      </svg>
      <text x="0" y="${taglineTop + taglineFontSize}" font-family="Outfit" font-weight="400" font-size="${taglineFontSize}" fill="${GREY}">${taglineTspans}</text>
    </g>
  </svg>`;

  const outfitFontDir = path.join(
    ROOT,
    "node_modules",
    "@expo-google-fonts",
    "outfit",
  );
  const fontConfigDir = fs.mkdtempSync(path.join(os.tmpdir(), "fc-outfit-"));
  fs.mkdirSync(path.join(fontConfigDir, "cache"), { recursive: true });
  fs.writeFileSync(
    path.join(fontConfigDir, "fonts.conf"),
    `<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <dir>${outfitFontDir}</dir>
  <cachedir>${fontConfigDir}/cache</cachedir>
</fontconfig>`,
  );
  process.env.FONTCONFIG_FILE = path.join(fontConfigDir, "fonts.conf");

  const lockup = await sharp(Buffer.from(lockupSvg)).png().toBuffer();

  await sharp(background)
    .composite([
      { input: fadedSpade, left: spadeLeft, top: Math.max(0, spadeTop) },
      { input: lockup, left: 0, top: 0 },
    ])
    .flatten({ background: BG_DARKER })
    .png()
    .toFile(`${OUT}/${featureGraphicName}`);
  console.log(`wrote ${featureGraphicName}`);
}

async function main() {
  // The icon has no text, so it is the same in every language.
  if (LANGUAGE === "en") await makeStoreIcon();
  await makeFeatureGraphic();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
