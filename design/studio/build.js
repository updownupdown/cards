// Builds the design studio page (design/studio/studio.html, not committed)
// from the template, the drawings here and the app's own icons, themes and
// art. Run from the repo root: node design/studio/build.js
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const here = __dirname;
const repo = path.join(here, "..", "..");

const read = (file) => fs.readFileSync(file, "utf8");
const alts = require("./icon-alts.js");
const logos = require("./logos.js");

// The app's icons as they are today.
const iconsDir = path.join(repo, "src/icons");
const icons = Object.fromEntries(
  fs
    .readdirSync(iconsDir)
    .filter((file) => file.endsWith(".svg"))
    .map((file) => {
      const svg = read(path.join(iconsDir, file)).replace(/\n/g, "");
      return [
        file.replace(".svg", ""),
        {
          vb: svg.match(/viewBox="([^"]+)"/)[1],
          inner: svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, ""),
        },
      ];
    }),
);
// The current card-back ornament, without its white card, as a mask.
const ornament =
  "data:image/svg+xml;base64," +
  Buffer.from(
    read(path.join(repo, "assets/cards/CardBack.svg"))
      .replace('<rect width="250" height="350" fill="white"/>', "")
      .replace(/\n/g, ""),
  ).toString("base64");

async function artThumbs() {
  const out = {};
  for (const name of ["Klondike", "NightVigil"]) {
    const buffer = await sharp(
      path.join(repo, `assets/thumbnails/${name}.webp`),
    )
      .resize(250, 350, { fit: "cover" })
      .webp({ quality: 70 })
      .toBuffer();
    out[name] = `data:image/webp;base64,${buffer.toString("base64")}`;
  }
  return out;
}

// The app's themes, read from themes.ts.
const themesSource = read(path.join(repo, "src/styles/themes.ts"));
const themes = [
  ...themesSource.matchAll(
    /id: "([^"]+)",\s*name: "([^"]+)",\s*colors: \{([^}]+)\}/g,
  ),
].map(([, id, name, body]) => ({
  id,
  name,
  colors: Object.fromEntries(
    [...body.matchAll(/(\w+): "(#[0-9a-f]{6})"/gi)].map(([, k, v]) => [k, v]),
  ),
}));

const GROUPS = {
  Navigation: [
    "Home",
    "MilkyWay",
    "Gallery",
    "Search",
    "Chart",
    "Settings",
    "Menu",
    "More",
    "Close",
    "Cancel",
    "ArrowBack",
    "ArrowForward",
    "ArrowUp",
    "ArrowDown",
    "ChevronLeft",
    "ChevronRight",
    "ExpandLess",
    "ExpandMore",
  ],
  Controls: [
    "Play",
    "Undo",
    "Reset",
    "FastForward",
    "Shuffle",
    "Recent",
    "Instructions",
    "HelpOutline",
    "Info",
    "PlusOutline",
    "EqualOutline",
    "CheckBoxOff",
    "CheckBoxOn",
    "CheckCircle",
    "Lock",
    "RotateDevice",
    "Star",
    "StarOutline",
    "Quote",
    "Tao",
  ],
  "Cards and suits": [
    "Spades",
    "Hearts",
    "Diamonds",
    "Clubs",
    "Heart",
    "Ace",
    "King",
    "Games",
    "PlayHand",
    "FreeCell",
    "CardColumn",
    "CardRow",
    "Sequence",
    "Easy",
  ],
  "Game items": [
    "Door",
    "Dragon",
    "Equip",
    "Fist",
    "GrappleHook",
    "Herbs",
    "HerbsBowl",
    "Joker",
    "Offer",
    "Potion",
    "Royal",
    "Shield",
    "Skull",
    "SmokeBomb",
    "Sword",
    "Trophy",
  ],
};
const grouped = Object.values(GROUPS).flat();
const missing = Object.keys(icons).filter((name) => !grouped.includes(name));
const extra = grouped.filter((name) => !icons[name] || !alts[name]);
if (missing.length || extra.length)
  throw new Error(
    `Icon groups out of step: missing ${missing}, extra ${extra}`,
  );

const CURRENT_MARK = `<g fill="none" stroke="var(--a)" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3C12.2 8 4.5 11.4 4.5 17c0 3.6 3.2 5.9 6.6 5.5 2.1-.2 3.7-1.6 4.9-3.5 1.2 1.9 2.8 3.3 4.9 3.5 3.4.4 6.6-1.9 6.6-5.5C27.5 11.4 19.8 8 16 3Z"/><path d="M16 19c0 4-1.1 7.1-4 9.5h8c-2.9-2.4-4-5.5-4-9.5"/></g>`;

const SIZE_USE = [
  { name: "Small", games: 47, kb: 596 },
  { name: "Tableau", games: 28, kb: 604 },
  { name: "Regular", games: 17, kb: 548 },
  { name: "Classic", games: 1, kb: 740 },
];

async function main() {
  const thumbs = await artThumbs();
  const data = [
    `const THEMES = ${JSON.stringify(themes)};`,
    `const LOGOS = ${JSON.stringify(logos)};`,
    `const ICONS = ${JSON.stringify(icons)};`,
    `const ICON_ALTS = ${JSON.stringify(alts)};`,
    `const ICON_GROUPS = ${JSON.stringify(GROUPS)};`,
    `const CURRENT_MARK = ${JSON.stringify(CURRENT_MARK)};`,
    `const ORNAMENT = ${JSON.stringify(ornament)};`,
    `const THUMBS = ${JSON.stringify(thumbs)};`,
    `const SIZE_USE = ${JSON.stringify(SIZE_USE)};`,
  ].join("\n");

  let html = read(path.join(here, "template.html"));
  html = html
    .replace("/*DATA*/", () => data)
    .replace("/*CARDS*/", () => read(path.join(here, "cards.js")))
    .replace("/*BACKS*/", () => read(path.join(here, "backs.js")))
    .replace("/*APP*/", () => read(path.join(here, "app.js")));
  const out = path.join(here, "studio.html");
  fs.writeFileSync(out, html);
  console.log(
    `${out}: ${(html.length / 1024).toFixed(0)} KB, ${themes.length} themes, ${Object.keys(icons).length} icons`,
  );
}

main();
