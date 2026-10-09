import type { Constellation } from "@/data/tao-constellations";

/**
 * The Tao chapter's reading: its text parsed into lines and words, and the
 * calm pace at which the lines are read out, shared by the reveal after a
 * win and the collection's chapter page. Also the constellation's star
 * helpers (colours, glow, pen order, minor stars), which the collection's
 * figure drawing uses.
 */

export const REVEAL = {
  charsPerSecond: 30,
  /** A line fades in over this long. */
  lineFadeMs: 750,
  /** The quote reveal's words fade in over this long. */
  wordFadeMs: 500,
  commaPauseMs: 140,
  sentencePauseMs: 300,
  linePauseMs: 450,
  /** Replaces `linePauseMs` when the line ends in punctuation. */
  punctuatedLinePauseMs: 1000,
  paragraphPauseMs: 2000,
  /** Share of star dust that forms a halo around the figure's strokes. */
  haloShare: 0.5,
  /** Of the rest, the share scattered close around the figure. */
  nearShare: 0.7,
  /** How far the halo and the near dust spread, in figure units (0-100). */
  haloSpread: 5,
  nearSpread: 48,
} as const;

// --- Text --------------------------------------------------------------------

export type TextGlyph = {
  char: string;
  /** Index among the chapter's non-empty lines. */
  line: number;
  /** Index among the chapter's words, in reading order. */
  word: number;
  isWordEnd: boolean;
  isLineEnd: boolean;
  isParagraphEnd: boolean;
};

export type TextWord = { glyphs: number[] };
export type TextLine = { words: number[]; paragraphStart: boolean };

export type ParsedText = {
  glyphs: TextGlyph[];
  words: TextWord[];
  lines: TextLine[];
  paragraphCount: number;
  longestLine: number;
};

export function parseChapterText(text: string): ParsedText {
  const glyphs: TextGlyph[] = [];
  const words: TextWord[] = [];
  const lines: TextLine[] = [];
  let paragraphStart = true;
  let paragraphCount = 0;
  let longestLine = 0;

  const rawLines = text.trim().split("\n");
  rawLines.forEach((rawLine, rawIndex) => {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      paragraphStart = true;
      return;
    }
    if (paragraphStart) paragraphCount += 1;
    longestLine = Math.max(longestLine, trimmed.length);
    const nextRaw = rawLines[rawIndex + 1];
    const endsParagraph = nextRaw === undefined || !nextRaw.trim();
    const lineIndex = lines.length;
    const line: TextLine = { words: [], paragraphStart };
    paragraphStart = false;

    const lineWords = trimmed.split(/\s+/);
    lineWords.forEach((wordText, wordInLine) => {
      const word: TextWord = { glyphs: [] };
      const wordIndex = words.length;
      [...wordText].forEach((char, charIndex, chars) => {
        const isWordEnd = charIndex === chars.length - 1;
        const isLineEnd = isWordEnd && wordInLine === lineWords.length - 1;
        word.glyphs.push(glyphs.length);
        glyphs.push({
          char,
          line: lineIndex,
          word: wordIndex,
          isWordEnd,
          isLineEnd,
          isParagraphEnd: isLineEnd && endsParagraph,
        });
      });
      words.push(word);
      line.words.push(wordIndex);
    });
    lines.push(line);
  });

  return { glyphs, words, lines, paragraphCount, longestLine };
}

// --- Helpers -------------------------------------------------------------------

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pointInPolygon(x: number, y: number, polygon: [number, number][]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/** Stars in the order the pen first reaches them. */
export function starsInStrokeOrder(constellation: Constellation) {
  const seen = new Set<number>();
  const order: number[] = [];
  for (const stroke of constellation.strokes) {
    for (const id of stroke) {
      if (!seen.has(id)) {
        seen.add(id);
        order.push(id);
      }
    }
  }
  constellation.stars.forEach((_, id) => {
    if (!seen.has(id)) order.push(id);
  });
  return order;
}

const SENTENCE_END = /[.;:!?]/;
const COMMA = /[,—]/;
const PUNCTUATION = /[.,;:!?—–…"'’”»)\]]/;
/** Star dust is drawn this much larger and brighter than its base values. */
export const SPECK_SCALE = 1.5625;
/** The named stars are drawn this much larger than their base size. */
export const STAR_DOT_SCALE = 1.25;
/**
 * The named stars' colours, as real stars show them (by temperature, from a
 * hot blue through white and yellow to a cool orange). Most are white; the
 * rest take one of the others.
 */
export const STAR_TINTS = [
  "#fbf8ff",
  "#aabfff",
  "#cad7ff",
  "#fff1d6",
  "#ffd6a5",
  "#ffbf8f",
] as const;

/**
 * A star's glow: layered soft halos in its own colour that fade out with
 * distance, the way a bright star blooms on a long exposure. No spread, so
 * no hard-edged ring round the star.
 */
export function starGlow(color: string, dot: number, bright: boolean) {
  const strength = bright ? 1 : 0.7;
  return [
    `0 0 ${dot * 0.8}px ${rgbaHex(color, 0.95 * strength)}`,
    `0 0 ${dot * 2.2}px ${rgbaHex(color, 0.55 * strength)}`,
    `0 0 ${dot * (bright ? 5 : 3.5)}px ${rgbaHex(color, 0.28 * strength)}`,
  ].join(", ");
}

function rgbaHex(hex: string, alpha: number) {
  const value = parseInt(hex.slice(1), 16);
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
}
/** At most this share of a constellation's stars is coloured. */
export const TINTED_SHARE = 0.25;

const tintCache = new Map<number, number[]>();

/**
 * Each named star's colour (an index into STAR_TINTS). The same chapter
 * always gets the same colours, and at most a quarter of its stars (rounded
 * down) are coloured.
 */
export function starTints(constellation: Constellation): number[] {
  const cached = tintCache.get(constellation.chapter);
  if (cached) return cached;
  const random = mulberry32(constellation.chapter * 48271);
  const count = constellation.stars.length;
  const order = Array.from({ length: count }, (_, id) => ({
    id,
    key: random(),
  })).sort((a, b) => a.key - b.key);
  const tints: number[] = new Array(count).fill(0);
  order.slice(0, Math.floor(count * TINTED_SHARE)).forEach(({ id }) => {
    tints[id] = 1 + Math.floor(random() * (STAR_TINTS.length - 1));
  });
  tintCache.set(constellation.chapter, tints);
  return tints;
}
const DUST_BRIGHTNESS = 1.25;
/** All star dust is then dimmed by this much, to keep it behind the figure. */
const DUST_DIM = 0.75;

// --- Reading schedule ------------------------------------------------------------

/**
 * When each letter starts to fade in, read at a calm pace from `start`. The
 * letters of a word appear together, at the moment the word is reached.
 */
export function scheduleReading(parsed: ParsedText, start: number) {
  const msPerChar = 1000 / REVEAL.charsPerSecond;
  const tIn: number[] = new Array(parsed.glyphs.length);
  let clock = start;
  let wordStart = start;

  parsed.glyphs.forEach((glyph, index) => {
    if (index === 0 || parsed.glyphs[index - 1].isWordEnd) wordStart = clock;
    tIn[index] = wordStart;
    clock += msPerChar;
    if (index === parsed.glyphs.length - 1 || !glyph.isWordEnd) return;
    if (glyph.isParagraphEnd) {
      clock += REVEAL.paragraphPauseMs;
    } else if (glyph.isLineEnd) {
      clock += PUNCTUATION.test(glyph.char)
        ? REVEAL.punctuatedLinePauseMs
        : REVEAL.linePauseMs;
    } else {
      // A space, plus a breath at punctuation.
      clock +=
        msPerChar +
        (SENTENCE_END.test(glyph.char)
          ? REVEAL.sentencePauseMs
          : COMMA.test(glyph.char)
            ? REVEAL.commaPauseMs
            : 0);
    }
  });

  return { tIn, textEnd: Math.max(...tIn) + REVEAL.wordFadeMs };
}

// --- Star dust -----------------------------------------------------------------

/**
 * One minor star, in the figure's units (0-100 across; the open sky spills
 * past the edges). `speck` is its size in px before SPECK_SCALE.
 */
export type DustPoint = {
  x: number;
  y: number;
  speck: number;
  /** Resting opacity, 0-1. */
  opacity: number;
};

/**
 * The chapter's minor stars. The same chapter always gets the same dust, and
 * a larger count only adds points, so the reveal (one speck per letter) and
 * the collection's still figure agree.
 */
export function planStarDust(
  constellation: Constellation,
  count: number,
): DustPoint[] {
  const random = mulberry32(constellation.chapter * 104729);
  const gaussian = () =>
    Math.sqrt(-2 * Math.log(1 - random())) * Math.cos(2 * Math.PI * random());
  const { stars } = constellation;
  const segments = constellation.strokes.flatMap((stroke) =>
    stroke.slice(1).map((id, index) => {
      const a = stars[stroke[index]];
      const b = stars[id];
      return { a, b, length: Math.hypot(b.x - a.x, b.y - a.y) };
    }),
  );
  const totalLength = segments.reduce(
    (sum, segment) => sum + segment.length,
    0,
  );
  const brighter = (value: number) =>
    Math.min(1, value * DUST_BRIGHTNESS) * DUST_DIM;

  const point = (): DustPoint => {
    const r = random();
    if (r < constellation.nebulaShare && constellation.nebulae.length) {
      const polygon =
        constellation.nebulae[
          Math.floor(random() * constellation.nebulae.length)
        ];
      const xs = polygon.map(([x]) => x);
      const ys = polygon.map(([, y]) => y);
      const [minX, maxX] = [Math.min(...xs), Math.max(...xs)];
      const [minY, maxY] = [Math.min(...ys), Math.max(...ys)];
      for (let attempt = 0; attempt < 40; attempt++) {
        const x = minX + random() * (maxX - minX);
        const y = minY + random() * (maxY - minY);
        if (pointInPolygon(x, y, polygon)) {
          return {
            x,
            y,
            speck: 1.6 + random() * 2,
            opacity: brighter(0.65 + random() * 0.35),
          };
        }
      }
    }
    if (r < constellation.nebulaShare + REVEAL.haloShare && segments.length) {
      // Along a stroke, picked by length.
      let along = random() * totalLength;
      const segment =
        segments.find((candidate) => (along -= candidate.length) <= 0) ??
        segments[segments.length - 1];
      const t = random();
      return {
        x:
          segment.a.x +
          (segment.b.x - segment.a.x) * t +
          gaussian() * REVEAL.haloSpread,
        y:
          segment.a.y +
          (segment.b.y - segment.a.y) * t +
          gaussian() * REVEAL.haloSpread,
        speck: 1.2 + random() * 1.8,
        opacity: brighter(0.55 + random() * 0.45),
      };
    }
    const near = random() < REVEAL.nearShare;
    return {
      // Close around the figure, or anywhere in the sky around it.
      x: near ? 50 + gaussian() * REVEAL.nearSpread : -40 + random() * 180,
      y: near ? 50 + gaussian() * REVEAL.nearSpread : -90 + random() * 280,
      speck: 1 + random() * 1.6,
      opacity: brighter(0.45 + random() * 0.4),
    };
  };

  return Array.from({ length: Math.max(0, count) }, point);
}
