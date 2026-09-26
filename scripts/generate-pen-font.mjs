// Builds src/components/QuoteReveal/pen-font.generated.ts from the
// single-line ("pen") SVG font in assets/pen-fonts/.
//
//   npm run pen-font:generate
//
// A single-line font draws every letter as open pen strokes instead of filled
// outlines, so a quote can be written out one stroke at a time. Ours is traced
// from the outline font Oooh Baby (SIL OFL, assets/pen-fonts/OFL.txt) by
// scripts/skeletonize-pen-font.py; see docs/quotes.md.
//
// Each glyph is stored as its advance and its strokes, in font units (1000 to
// the em, y up), flattened to polylines and simplified well below a pixel.
// Accented letters the font lacks are composed from the base letter and the
// accent (see compose()), so it covers the whole Latin set below.

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SOURCE_DIR = path.join(ROOT, "assets/pen-fonts");
const OUTPUT = path.join(
  ROOT,
  "src/components/QuoteReveal/pen-font.generated.ts",
);

const SOURCE = "OoohBabyPen.svg";

// Printable ASCII, Latin-1 and Latin Extended-A letters (most Latin-script
// languages), and the typographic marks the quotes use.
const CHARSET = [
  ...Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)),
  ...Array.from({ length: 0x180 - 0xc0 }, (_, i) =>
    String.fromCharCode(0xc0 + i),
  ).filter((char) => /\p{L}/u.test(char)),
  ..."‘’“”–—…«»¡¿·",
];
// Stand-ins for marks a font lacks.
const FALLBACKS = {
  "‘": "'",
  "’": "'",
  "“": '"',
  "”": '"',
  "–": "-",
  "—": "-",
  "…": ".",
};

// Polyline simplification tolerance, in font units (1/1000 em).
const TOLERANCE = 3;
const CURVE_STEPS = 8;

function decodeEntities(value) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCodePoint(parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/** SVG path data (M, L, C, Z, absolute) -> polylines. */
function parsePath(d) {
  const tokens = d.match(/[MLCZmlcz]|-?[\d.]+(?:e[-+]?\d+)?/g) ?? [];
  const strokes = [];
  let current = null;
  let command = null;
  let x = 0;
  let y = 0;
  let i = 0;
  const num = () => Number(tokens[i++]);
  while (i < tokens.length) {
    if (/[a-z]/i.test(tokens[i])) command = tokens[i++];
    switch (command) {
      case "M":
        x = num();
        y = num();
        current = [[x, y]];
        strokes.push(current);
        command = "L";
        break;
      case "L":
        x = num();
        y = num();
        current.push([x, y]);
        break;
      case "C": {
        const [x1, y1, x2, y2, x3, y3] = [
          num(),
          num(),
          num(),
          num(),
          num(),
          num(),
        ];
        for (let step = 1; step <= CURVE_STEPS; step++) {
          const t = step / CURVE_STEPS;
          const u = 1 - t;
          current.push([
            u * u * u * x +
              3 * u * u * t * x1 +
              3 * u * t * t * x2 +
              t * t * t * x3,
            u * u * u * y +
              3 * u * u * t * y1 +
              3 * u * t * t * y2 +
              t * t * t * y3,
          ]);
        }
        x = x3;
        y = y3;
        break;
      }
      case "Z":
      case "z":
        if (current) current.push([...current[0]]);
        break;
      default:
        throw new Error(`Unsupported path command ${command} in ${d}`);
    }
  }
  return strokes.filter((stroke) => stroke.length > 1);
}

function distanceToSegment([px, py], [ax, ay], [bx, by]) {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq
    ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSq))
    : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Ramer-Douglas-Peucker. */
function simplify(points) {
  if (points.length < 3) return points;
  let worst = 0;
  let worstIndex = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const distance = distanceToSegment(points[i], points[0], points.at(-1));
    if (distance > worst) {
      worst = distance;
      worstIndex = i;
    }
  }
  if (worst <= TOLERANCE) return [points[0], points.at(-1)];
  return [
    ...simplify(points.slice(0, worstIndex + 1)).slice(0, -1),
    ...simplify(points.slice(worstIndex)),
  ];
}

// --- Composing accented letters -------------------------------------------------

/** Combining mark -> the spacing accents that draw it, and where it goes. */
const MARKS = {
  "́": { spacing: ["´"], place: "above" },
  "̀": { spacing: ["`"], place: "above" },
  "̂": { spacing: ["ˆ", "^"], place: "above" },
  "̈": { spacing: ["¨"], place: "above" },
  "̃": { spacing: ["˜", "~"], place: "above" },
  "̄": { spacing: ["¯"], place: "above", make: "macron" },
  "̊": { spacing: ["˚", "°"], place: "above" },
  "̆": { spacing: ["˘"], place: "above", make: "breve" },
  "̌": { spacing: ["ˇ"], place: "above", make: "caron" },
  "̇": { spacing: ["˙"], place: "above", make: "dot" },
  "̋": { spacing: ["˝"], place: "above", make: "doubleAcute" },
  "̧": { spacing: ["¸"], place: "below" },
  "̨": { spacing: ["˛"], place: "belowRight", make: "ogonek" },
};

function bounds(strokes) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const stroke of strokes) {
    for (const [x, y] of stroke) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }
  return { minX, minY, maxX, maxY };
}

const shift = (strokes, dx, dy) =>
  strokes.map((stroke) => stroke.map(([x, y]) => [x + dx, y + dy]));

/** Horizontal centre of the part of the strokes nearest the top (or bottom). */
function edgeCentre(strokes, top) {
  const box = bounds(strokes);
  const cut = top
    ? box.maxY - (box.maxY - box.minY) * 0.3
    : box.minY + (box.maxY - box.minY) * 0.3;
  const xs = strokes
    .flat()
    .filter(([, y]) => (top ? y >= cut : y <= cut))
    .map(([x]) => x);
  return xs.length
    ? (Math.min(...xs) + Math.max(...xs)) / 2
    : (box.minX + box.maxX) / 2;
}

/** The i's dot: its strokes that sit wholly above the x-height. */
function splitDot(glyph, xHeight) {
  const dot = glyph.strokes.filter((stroke) =>
    stroke.every(([, y]) => y > xHeight * 1.1),
  );
  const rest = glyph.strokes.filter((stroke) => !dot.includes(stroke));
  return { dot, rest };
}

/** An accent the font lacks, drawn from ones it has. */
function makeMark(kind, glyphs, xHeight) {
  switch (kind) {
    case "caron": {
      const hat = (glyphs["ˆ"] ?? glyphs["^"])?.strokes;
      if (!hat) return null;
      const { minY, maxY } = bounds(hat);
      return hat.map((stroke) => stroke.map(([x, y]) => [x, minY + maxY - y]));
    }
    case "macron":
      return [
        [
          [-80, 0],
          [80, 0],
        ],
      ];
    case "breve": {
      const points = [];
      for (let i = 0; i <= 12; i++) {
        const a = Math.PI + (Math.PI * i) / 12;
        points.push([90 * Math.cos(a) * -1, 60 + 60 * Math.sin(a)]);
      }
      return [points.reverse()];
    }
    case "dot": {
      const i = glyphs.i && splitDot(glyphs.i, xHeight).dot;
      return i?.length
        ? i
        : [
            [
              [0, 0],
              [8, 12],
            ],
          ];
    }
    case "doubleAcute": {
      const acute = glyphs["´"]?.strokes;
      if (!acute) return null;
      return [...shift(acute, -55, 0), ...shift(acute, 55, 0)];
    }
    case "ogonek": {
      const cedilla = glyphs["¸"]?.strokes;
      if (!cedilla) return null;
      const { minX, maxX } = bounds(cedilla);
      return cedilla.map((stroke) =>
        stroke.map(([x, y]) => [minX + maxX - x, y]),
      );
    }
    default:
      return null;
  }
}

/** Letters with a stroke through them, and ligatures, drawn from their parts. */
function composeSpecial(char, glyphs, xHeight) {
  const bar = (base, y0, y1, x0, x1) => {
    const glyph = glyphs[base];
    if (!glyph) return null;
    const box = bounds(glyph.strokes);
    const cx = (box.minX + box.maxX) / 2;
    return {
      advance: glyph.advance,
      strokes: [
        ...glyph.strokes,
        [
          [cx + x0, y0],
          [cx + x1, y1],
        ],
      ],
    };
  };
  const pair = (a, b) =>
    glyphs[a] && glyphs[b]
      ? {
          advance: glyphs[a].advance + glyphs[b].advance,
          strokes: [
            ...glyphs[a].strokes,
            ...shift(glyphs[b].strokes, glyphs[a].advance, 0),
          ],
        }
      : null;
  switch (char) {
    case "ı":
      return (
        glyphs.i && {
          advance: glyphs.i.advance,
          strokes: splitDot(glyphs.i, xHeight).rest,
        }
      );
    case "ł":
      return bar("l", xHeight * 0.9, xHeight * 1.4, -90, 90);
    case "Ł":
      return bar("L", xHeight * 0.9, xHeight * 1.5, -140, 60);
    case "đ":
      return bar("d", xHeight * 1.6, xHeight * 1.6, 0, 160);
    case "Đ":
    case "Ð":
      return bar("D", xHeight * 0.9, xHeight * 0.9, -180, 20);
    case "ø":
      return bar("o", -40, xHeight + 40, -120, 120);
    case "Ø":
      return bar("O", -40, xHeight * 2.3, -220, 220);
    case "ħ":
      return bar("h", xHeight * 1.6, xHeight * 1.6, -120, 40);
    case "Ħ":
      return bar("H", xHeight * 1.5, xHeight * 1.5, -200, 200);
    case "ŧ":
      return bar("t", xHeight * 0.55, xHeight * 0.55, -80, 80);
    case "Ŧ":
      return bar("T", xHeight * 0.9, xHeight * 0.9, -100, 100);
    case "æ":
      return pair("a", "e");
    case "œ":
      return pair("o", "e");
    case "Œ":
      return pair("O", "E");
    case "ß":
      return pair("s", "s");
    default:
      return null;
  }
}

function compose(char, glyphs, xHeight) {
  const special = composeSpecial(char, glyphs, xHeight);
  if (special) return special;
  const [baseChar, ...marks] = char.normalize("NFD");
  if (!marks.length) return null;
  let base = glyphs[baseChar];
  if (!base) return null;
  // Accents above an i or j replace its dot.
  if (
    (baseChar === "i" || baseChar === "j") &&
    MARKS[marks[0]]?.place === "above"
  ) {
    base = { advance: base.advance, strokes: splitDot(base, xHeight).rest };
  }
  let strokes = [...base.strokes];
  for (const mark of marks) {
    const spec = MARKS[mark];
    if (!spec) return null;
    const spacing = spec.spacing
      .map((c) => glyphs[c])
      .find((g) => g?.strokes.length);
    const markStrokes =
      spacing?.strokes ?? makeMark(spec.make, glyphs, xHeight);
    if (!markStrokes?.length) return null;
    const box = bounds(strokes);
    const markBox = bounds(markStrokes);
    const markCentre = (markBox.minX + markBox.maxX) / 2;
    if (spec.place === "above") {
      const dx = edgeCentre(strokes, true) - markCentre;
      const dy = Math.max(box.maxY, xHeight) + 70 - markBox.minY;
      strokes = [...strokes, ...shift(markStrokes, dx, dy)];
    } else {
      const x =
        spec.place === "belowRight"
          ? box.maxX - 40
          : edgeCentre(strokes, false);
      const dy = Math.min(box.minY, 0) - 10 - markBox.maxY;
      strokes = [...strokes, ...shift(markStrokes, x - markCentre, dy)];
    }
  }
  return { advance: base.advance, strokes };
}

// --- Reading -------------------------------------------------------------------

function readFont(file) {
  const source = fs.readFileSync(path.join(SOURCE_DIR, file), "utf8");
  const defaultAdvance = Number(
    source.match(/<font [^>]*horiz-adv-x="([\d.]+)"/)[1],
  );
  // Every glyph, marks included, so accents can be composed from them.
  const all = {};
  for (const [, attributes] of source.matchAll(/<glyph ([^>]*?)\/>/g)) {
    const unicode = attributes.match(/unicode="([^"]*)"/);
    if (!unicode) continue;
    const char = decodeEntities(unicode[1]);
    if ([...char].length !== 1) continue;
    const advance = attributes.match(/horiz-adv-x="([-\d.]+)"/);
    const d = attributes.match(/\sd="([^"]*)"/);
    all[char] = {
      advance: advance ? Number(advance[1]) : defaultAdvance,
      strokes: d ? parsePath(d[1]).map(simplify) : [],
    };
  }
  const xHeight = Math.round(bounds(all.x.strokes).maxY);

  const glyphs = {};
  const composed = [];
  for (const char of CHARSET) {
    let glyph = all[char];
    if (!glyph && FALLBACKS[char]) glyph = all[FALLBACKS[char]];
    if (!glyph) {
      glyph = compose(char, all, xHeight);
      if (glyph) composed.push(char);
    }
    if (!glyph) continue;
    glyphs[char] = [
      Math.round(glyph.advance),
      glyph.strokes.map((stroke) =>
        stroke.flatMap(([x, y]) => [Math.round(x), Math.round(y)]),
      ),
    ];
  }
  const missing = CHARSET.filter((char) => !glyphs[char]);
  const name = source.match(/font-family="([^"]*)"/)[1];
  console.log(
    `${name}: ${Object.keys(glyphs).length} glyphs, composed ${composed.length}` +
      (missing.length ? `, missing ${missing.join("")}` : ""),
  );
  return { name, xHeight, glyphs };
}

const font = readFont(SOURCE);

const output = `// Generated by scripts/generate-pen-font.mjs - do not edit.
// Single-line font: [advance, strokes], font units (1000/em, y up), each
// stroke a flat [x0, y0, x1, y1, ...] polyline.

export type PenGlyph = [advance: number, strokes: number[][]];

export const PEN_FONT: {
  name: string;
  /** Height of the letter x. */
  xHeight: number;
  glyphs: Record<string, PenGlyph>;
} = ${JSON.stringify(font)};
`;

fs.writeFileSync(OUTPUT, output);
console.log(
  `Wrote ${path.relative(ROOT, OUTPUT)} (${(output.length / 1024).toFixed(0)} KB)`,
);
