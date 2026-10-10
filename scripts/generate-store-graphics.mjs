// Generates Google Play store listing graphics into store-assets/.
// Run: node scripts/generate-store-graphics.mjs [--lang fr]
//
// The feature graphic is drawn as a page in Chromium (Playwright): the
// Home sky (assets/images/starfield.webp) with the Milky Way and shooting
// stars across it, in Nocturne's colours: the spade and name, the store's
// lines, a fan of the Regular deck's cards, and the middle of the Odyssey map
// (src/data/campaign-map.generated.ts) laid out beneath them.
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

/** Nocturne, the colour theme the app opens in (src/styles/themes.ts). */
const NIGHT = "#07080d";
const SKY = "#161830";
const INK = "#ece7f2";
const DIM = "#b2aec2";
const ACCENT = "#ffcf87";
const ACCENT2 = "#9fb2ff";

// The feature graphic carries the store's lines, so it is rendered per
// language: `--lang fr` writes feature-graphic-1024x500-fr.png. The icon has
// no text, so it is only written for English. The first line is the headline.
const TAGLINES = {
  en: [
    "100+ curated classic and modern solo card games.",
    "Campaign mode with artworks and other collectibles.",
    "Polished, serene design with clear rules, a hint system, and quiet moments built-in.",
  ],
  fr: [
    "Plus de 100 jeux de cartes en solo, classiques et modernes, choisis avec soin.",
    "Un mode campagne avec des œuvres d'art et d'autres objets à collectionner.",
    "Un design soigné et serein : des règles claires, des indices et des moments de calme intégrés.",
  ],
  es: [
    "Más de 100 juegos de cartas en solitario, clásicos y modernos, elegidos con cuidado.",
    "Modo campaña con obras de arte y otros coleccionables.",
    "Un diseño pulido y sereno, con reglas claras, un sistema de pistas y momentos de calma.",
  ],
  it: [
    "Oltre 100 giochi di carte in solitario, classici e moderni, scelti con cura.",
    "Modalità campagna con opere d'arte e altri oggetti da collezionare.",
    "Un design curato e sereno, con regole chiare, un sistema di suggerimenti e momenti di quiete.",
  ],
  pt: [
    "Mais de 100 jogos de cartas para um jogador, clássicos e modernos, escolhidos a dedo.",
    "Modo campanha com obras de arte e outros colecionáveis.",
    "Design refinado e sereno, com regras claras, um sistema de dicas e momentos de calma.",
  ],
  tr: [
    "Özenle seçilmiş 100'den fazla klasik ve modern tek kişilik kart oyunu.",
    "Sanat eserleri ve diğer koleksiyonlarla kampanya modu.",
    "Net kurallar, ipucu sistemi ve sakin anlarla özenli, huzurlu bir tasarım.",
  ],
  id: [
    "Lebih dari 100 permainan kartu satu pemain pilihan, klasik dan modern.",
    "Mode kampanye dengan karya seni dan koleksi lainnya.",
    "Desain rapi dan tenang dengan aturan jelas, sistem petunjuk, dan momen hening bawaan.",
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

/** The Odyssey's game dots and links, from the generated campaign map. */
function readMap() {
  const source = fs.readFileSync(
    path.join(ROOT, "src/data/campaign-map.generated.ts"),
    "utf8",
  );
  const start =
    source.indexOf("= [", source.indexOf("GAME_DOT_DEFINITIONS")) + 2;
  const end = source.indexOf("\n];", start) + 2;
  return JSON.parse(source.slice(start, end));
}

/**
 * The middle of the Odyssey map as an SVG: its links, its dots (the ones
 * inside the force field in the accent) and the field's ring.
 */
function mapSvg() {
  const RADIUS = 0.62;
  const FIELD = 0.45;
  const SIZE = 600;
  const dots = readMap().filter((dot) => Math.hypot(dot.x, dot.y) <= RADIUS);
  const byPath = new Map(dots.map((dot) => [dot.path, dot]));
  const at = (value) => ((value / RADIUS + 1) * SIZE) / 2;
  const links = [];
  for (const dot of dots) {
    for (const other of dot.connections) {
      const next = byPath.get(other);
      if (next && dot.path < other) {
        links.push(
          `<line x1="${at(dot.x)}" y1="${at(dot.y)}" x2="${at(next.x)}" y2="${at(next.y)}"/>`,
        );
      }
    }
  }
  const circles = dots.map((dot) => {
    const inside = Math.hypot(dot.x, dot.y) <= FIELD;
    const r = dot.path === "/klondike" ? 9 : inside ? 5.5 : 4.5;
    return `<circle cx="${at(dot.x)}" cy="${at(dot.y)}" r="${r}" fill="${inside ? ACCENT : ACCENT2}" opacity="${inside ? 1 : 0.75}"/>`;
  });
  const half = SIZE / 2;
  return `<svg viewBox="0 0 ${SIZE} ${SIZE}" width="${SIZE}" height="${SIZE}">
<defs><radialGradient id="fade"><stop offset="60%" stop-color="#fff"/><stop offset="100%" stop-color="#000"/></radialGradient>
<mask id="edge"><circle cx="${half}" cy="${half}" r="${half}" fill="url(#fade)"/></mask></defs>
<g mask="url(#edge)">
<circle cx="${half}" cy="${half}" r="${(FIELD / RADIUS) * half}" fill="${ACCENT}" fill-opacity="0.05" stroke="${ACCENT}" stroke-opacity="0.7" stroke-width="2.5" stroke-dasharray="3 8"/>
<g stroke="${ACCENT2}" stroke-opacity="0.4" stroke-width="1.6">${links.join("")}</g>
${circles.join("")}
</g></svg>`;
}

/** Shooting stars: where each starts, its angle and length. */
const SHOOTING_STARS = [
  { left: 430, top: 108, angle: -28, length: 170, opacity: 0.9 },
  { left: 900, top: 74, angle: -36, length: 110, opacity: 0.7 },
  { left: 585, top: 290, angle: -30, length: 80, opacity: 0.5 },
];

function featureGraphicPage([headline, ...lines]) {
  const spade = fs
    .readFileSync(path.join(ROOT, "assets/images/spade.svg"), "utf8")
    .replace("<svg", '<svg class="spade"');
  const cards = FAN.map(
    (card, index) =>
      `<div class="card" style="transform:rotate(${(index - 2) * 10}deg)"><img src="${dataUrl(
        `assets/cards/regular/${card}.webp`,
        "image/webp",
      )}"></div>`,
  ).join("");
  const stars = SHOOTING_STARS.map(
    ({ left, top, angle, length, opacity }) =>
      `<div class="shoot" style="left:${left}px;top:${top}px;width:${length}px;opacity:${opacity};transform:rotate(${angle}deg)"></div>`,
  ).join("");
  return `<!doctype html><html><head><style>
${outfit(300, "300Light")}${outfit(400, "400Regular")}${outfit(600, "600SemiBold")}
*{margin:0;padding:0;box-sizing:border-box}
body{width:1024px;height:500px;overflow:hidden;background:${NIGHT};font-family:Outfit;position:relative}
.sky{position:absolute;left:50%;top:50%;width:1200px;height:1800px;background:url(${dataUrl("assets/images/starfield.webp", "image/webp")}) center/cover;transform:translate(-50%,-50%) rotate(-58deg) scale(0.95) translate(40px,-60px);filter:saturate(1.15) brightness(1.3)}
.glow{position:absolute;left:500px;top:-200px;width:640px;height:840px;background:url(${dataUrl("assets/images/galaxy-glow.webp", "image/webp")}) center/contain no-repeat;opacity:.5;mix-blend-mode:screen}
.veil{position:absolute;inset:0;background:linear-gradient(90deg,rgba(7,8,13,.9) 0%,rgba(7,8,13,.72) 44%,rgba(22,24,48,.25) 70%,rgba(22,24,48,.35) 100%)}
.shoot{position:absolute;height:2px;transform-origin:0 50%;border-radius:2px;background:linear-gradient(90deg,rgba(255,255,255,1),rgba(255,233,200,.5) 25%,rgba(255,255,255,0))}
.shoot::before{content:"";position:absolute;left:-3px;top:-3px;width:8px;height:8px;border-radius:50%;background:#fff;box-shadow:0 0 10px 3px rgba(255,236,205,.8)}
.copy{position:absolute;left:64px;top:50%;width:470px;transform:translateY(-50%)}
.brand{display:flex;align-items:center;gap:16px}
.spade{width:62px;height:62px}
.spade path{fill:${ACCENT}}
.name{color:${INK};font-weight:400;font-size:54px;letter-spacing:.4px;line-height:1}
.headline{margin-top:26px;color:${ACCENT};font-weight:600;font-size:29px;line-height:1.22}
.line{margin-top:12px;color:${DIM};font-weight:300;font-size:19px;line-height:1.38}
.map{position:absolute;left:792px;top:420px;width:600px;height:600px;margin:-300px 0 0 -300px;transform:perspective(1000px) rotateX(58deg) scale(.95)}
.fan{position:absolute;left:792px;top:236px}
.card{position:absolute;width:122px;height:171px;left:-61px;top:-128px;border-radius:9px;overflow:hidden;transform-origin:50% 135%;box-shadow:0 14px 30px rgba(0,0,0,.6),0 0 0 1px rgba(0,0,0,.25)}
.card img{width:100%;height:100%;display:block}
</style></head><body>
<div class="sky"></div><div class="glow"></div><div class="veil"></div>
${stars}
<div class="map">${mapSvg()}</div>
<div class="copy"><div class="brand">${spade}<div class="name">Solitarius</div></div>
<div class="headline">${headline}</div>${lines.map((line) => `<div class="line">${line}</div>`).join("")}</div>
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
