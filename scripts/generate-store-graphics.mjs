// Generates Google Play store listing graphics into store-assets/.
// Run: node scripts/generate-store-graphics.mjs [--lang fr]
//
// The feature graphic is drawn as a page in Chromium (Playwright): the
// Home sky (assets/images/starfield.webp) with the Milky Way across it, the
// white spade and name in Outfit, and a fan of the Regular deck's cards.
// CHROMIUM_PATH: a Chromium of your own, if Playwright's isn't installed.

import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "store-assets");

/** Nocturne's night, under the sky. */
const NIGHT = "#07080d";

// The feature graphic carries the store tagline, so it is rendered per
// language: `--lang fr` writes feature-graphic-1024x500-fr.png. The icon has
// no text, so it is only written for English.
const TAGLINES = {
  en: ["Classic and modern solo card games,", "in a calm place to play."],
  fr: [
    "Des réussites classiques aux jeux modernes,",
    "des cartes en solo, en toute sérénité.",
  ],
  es: [
    "Del solitario clásico a los juegos modernos,",
    "cartas en solitario para jugar con calma.",
  ],
  it: [
    "Dai solitari classici ai giochi moderni,",
    "carte in solitario da giocare con calma.",
  ],
  pt: [
    "Das paciências clássicas aos jogos modernos,",
    "cartas para um jogador, com calma.",
  ],
  tr: [
    "Klasik pasyanslardan modern oyunlara,",
    "sakin bir köşede tek kişilik kart oyunları.",
  ],
  id: [
    "Dari solitaire klasik hingga yang modern,",
    "permainan kartu satu pemain yang tenang.",
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
    .flatten({ background: NIGHT })
    .png()
    .toFile(`${OUT}/play-store-icon-512.png`);
  console.log("wrote play-store-icon-512.png");
}

// ---------- 2. Feature graphic: 1024x500 ----------
const dataUrl = (file, type) =>
  `data:${type};base64,${fs.readFileSync(path.join(ROOT, file)).toString("base64")}`;

const outfit = (weight, name) =>
  `@font-face{font-family:Outfit;font-weight:${weight};src:url(${dataUrl(
    `node_modules/@expo-google-fonts/outfit/${name}/Outfit_${name}.ttf`,
    "font/ttf",
  )})}`;

/** A royal flush in four suits' colours, fanned from the left. */
const FAN = ["10S", "JD", "QC", "KH", "AS"];

function featureGraphicPage(taglineLines) {
  const spade = fs
    .readFileSync(path.join(ROOT, "assets/images/spade.svg"), "utf8")
    .replace("<svg", '<svg class="spade"');
  const cards = FAN.map(
    (card, index) =>
      `<div class="card" style="transform:rotate(${(index - 2) * 11}deg)"><img src="${dataUrl(
        `assets/cards/regular/${card}.webp`,
        "image/webp",
      )}"></div>`,
  ).join("");
  return `<!doctype html><html><head><style>
${outfit(300, "300Light")}${outfit(400, "400Regular")}
*{margin:0;padding:0;box-sizing:border-box}
body{width:1024px;height:500px;overflow:hidden;background:${NIGHT};font-family:Outfit;position:relative}
.sky{position:absolute;left:50%;top:50%;width:1200px;height:1800px;background:url(${dataUrl("assets/images/starfield.webp", "image/webp")}) center/cover;transform:translate(-50%,-50%) rotate(-58deg) scale(0.95) translate(40px,-60px);filter:saturate(1.15) brightness(1.35)}
.glow{position:absolute;left:470px;top:-180px;width:640px;height:840px;background:url(${dataUrl("assets/images/galaxy-glow.webp", "image/webp")}) center/contain no-repeat;opacity:.55;mix-blend-mode:screen}
.veil{position:absolute;inset:0;background:linear-gradient(90deg,rgba(7,8,13,.85) 0%,rgba(7,8,13,.62) 40%,rgba(7,8,13,.12) 72%,rgba(7,8,13,.2) 100%)}
.lockup{position:absolute;left:78px;top:50%;transform:translateY(-50%)}
.brand{display:flex;align-items:center;gap:22px}
.spade{width:92px;height:92px}
.spade path{fill:#fff}
.name{color:#fff;font-weight:400;font-size:78px;letter-spacing:.5px;line-height:1}
.tag{margin-top:26px;color:rgba(232,234,244,.86);font-weight:300;font-size:26px;line-height:1.38;white-space:nowrap}
.fan{position:absolute;left:806px;top:262px}
.card{position:absolute;width:148px;height:207px;left:-74px;top:-150px;border-radius:11px;overflow:hidden;transform-origin:50% 135%;box-shadow:0 14px 34px rgba(0,0,0,.55),0 0 0 1px rgba(0,0,0,.25)}
.card img{width:100%;height:100%;display:block}
</style></head><body>
<div class="sky"></div><div class="glow"></div><div class="veil"></div>
<div class="lockup"><div class="brand">${spade}<div class="name">Solitarius</div></div><div class="tag">${taglineLines.join("<br>")}</div></div>
<div class="fan">${cards}</div>
</body></html>`;
}

async function makeFeatureGraphic() {
  const name =
    LANGUAGE === "en"
      ? "feature-graphic-1024x500.png"
      : `feature-graphic-1024x500-${LANGUAGE}.png`;
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH,
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1024, height: 500 },
    });
    await page.setContent(featureGraphicPage(TAGLINES[LANGUAGE]));
    await page.evaluate(() => document.fonts.ready);
    const shot = await page.screenshot({ type: "png" });
    // Play wants no transparency.
    await sharp(shot)
      .flatten({ background: NIGHT })
      .png()
      .toFile(path.join(OUT, name));
  } finally {
    await browser.close();
  }
  console.log(`wrote ${name}`);
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
