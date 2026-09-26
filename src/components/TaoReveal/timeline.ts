import type { Constellation } from "@/data/tao-constellations";

/**
 * Plans the whole Tao reveal up front: when each letter appears, where it
 * flies, what it becomes, and when each constellation line is drawn.
 * Everything runs off one clock (ms of "story time"), so the UI thread
 * animation and skipping all read from the same numbers.
 */

export const REVEAL = {
  // Reading
  charsPerSecond: 35,
  /** Words appear whole, each fading in over this long. */
  wordFadeMs: 400,
  commaPauseMs: 120,
  sentencePauseMs: 260,
  linePauseMs: 400,
  /** Replaces `linePauseMs` when the line ends in punctuation. */
  punctuatedLinePauseMs: 1000,
  paragraphPauseMs: 2000,
  /** The whole chapter on screen before the letters fly. */
  restPauseMs: 3000,
  // Flight
  flightSpreadMs: 1600,
  flightMs: 2400,
  /** Share of star dust that forms a halo around the figure's strokes. */
  haloShare: 0.5,
  /** Of the rest, the share scattered close around the figure. */
  nearShare: 0.7,
  /** How far the halo and the near dust spread, in figure units (0-100). */
  haloSpread: 5,
  nearSpread: 48,
  /** Share of the named stars that shine brighter than the others. */
  brightShare: 0.35,
  // Constellation
  linesDrawMs: 3000,
  holdMs: 5000,
  // Exit
  linesOutMs: 1300,
  starsOutMs: 1300,
  skyOutMs: 3900,
  /** The win box is finished off this long before the sky starts to clear. */
  uncoverLeadMs: 300,
} as const;

export const SKY_IN_AT = 1500;
export const SKY_IN_MS = 3000;
const LINE_GAP = 5;

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

// --- Plan types ----------------------------------------------------------------

export const ROLE_DUST = 0;
export const ROLE_STAR = 1;

/** Flat numbers only: this object is copied to the UI thread. */
export type GlyphPlan = {
  role: number;
  tIn: number;
  tFly: number;
  flyMs: number;
  dx: number;
  dy: number;
  c1x: number;
  c1y: number;
  c2x: number;
  c2y: number;
  endScale: number;
  /** Resting opacity once it has become a star. */
  starOpacity: number;
  dotSize: number;
  pulseA: number;
  pulseB: number;
  phase: number;
  twinkle: number;
  /** 1 for the named stars that shine brighter. */
  bright: number;
  /** Index into STAR_TINTS. */
  tint: number;
};

export type EdgePlan = {
  x: number;
  y: number;
  length: number;
  angle: number;
  tDraw: number;
  drawMs: number;
};

export type RevealTimes = {
  skyIn: number;
  skyInMs: number;
  textStart: number;
  textEnd: number;
  morph: number;
  formed: number;
  linesStart: number;
  linesDone: number;
  linesOut: number;
  starsOut: number;
  /** When the win box behind can change unseen (the sky is still opaque). */
  uncover: number;
  skyOut: number;
  total: number;
};

export type RevealPlan = {
  glyphs: GlyphPlan[];
  edges: EdgePlan[];
  times: RevealTimes;
};

export type GlyphBox = { cx: number; cy: number };

export type PlanInput = {
  parsed: ParsedText;
  boxes: GlyphBox[];
  fontSize: number;
  constellation: Constellation;
  /** Lines whose letters become the named stars (see getKeyLineIndices). */
  keyLines: number[];
  screen: { width: number; height: number; top: number; bottom: number };
  seed?: number;
};

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

function evenlyPick<T>(items: T[], count: number) {
  if (count <= 0) return [];
  if (count >= items.length) return items.slice();
  return Array.from(
    { length: count },
    (_, index) => items[Math.floor(((index + 0.5) * items.length) / count)],
  );
}

const SENTENCE_END = /[.;:!?]/;
const COMMA = /[,—]/;
const PUNCTUATION = /[.,;:!?—–…"'’”»)\]]/;
/** Glyphs with so little ink that they need a bigger speck to stay visible. */
const TINY_INK = /[.,;:'’‘"“”`·\-–—]/;
/** Star dust is drawn this much larger and brighter than its base values. */
export const SPECK_SCALE = 1.5625;
/** The named stars are drawn this much larger than their base size. */
export const STAR_DOT_SCALE = 1.25;
/**
 * The named stars' colours: white, and a few that are clearly blue, green,
 * red, yellow or violet while staying close to white, like a real sky.
 */
export const STAR_TINTS = [
  "#ffffff",
  "#bcd3ff",
  "#bff2cd",
  "#ffc4b8",
  "#ffe6a3",
  "#d6c2ff",
] as const;
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

/** Folds a coordinate that falls outside [min, max] back inside, mirrored. */
function reflectInto(value: number, min: number, max: number) {
  const span = max - min;
  if (span <= 0) return min;
  const period = span * 2;
  const offset = (((value - min) % period) + period) % period;
  return min + (offset <= span ? offset : period - offset);
}

// --- The plan ------------------------------------------------------------------

export function planReveal({
  parsed,
  boxes,
  fontSize,
  constellation,
  keyLines,
  screen,
  seed = constellation.chapter * 7919,
}: PlanInput): RevealPlan {
  const random = mulberry32(seed);
  const count = parsed.glyphs.length;

  const textStart = SKY_IN_AT + SKY_IN_MS + 200;
  const { tIn, textEnd } = scheduleReading(parsed, textStart);
  const morph = textEnd + REVEAL.restPauseMs;

  // Where the figure sits.
  const usableTop = screen.top + 28;
  const usableHeight = screen.height - screen.bottom - 28 - usableTop;
  const size = Math.min(screen.width - 56, usableHeight * 0.92, 560);
  const figureX = screen.width / 2;
  const figureY = usableTop + usableHeight / 2;
  const toScreen = (x: number, y: number) => ({
    x: figureX + ((x - 50) / 100) * size,
    y: figureY + ((y - 50) / 100) * size,
  });
  const stars = constellation.stars.map((star) => ({
    ...toScreen(star.x, star.y),
    mag: star.mag,
  }));

  // The key lines' letters are the named stars, in the pen's order.
  const keySet = new Set(keyLines);
  const keyGlyphs: number[] = [];
  const otherGlyphs: number[] = [];
  parsed.glyphs.forEach((glyph, index) =>
    (keySet.has(glyph.line) ? keyGlyphs : otherGlyphs).push(index),
  );
  const starOrder = starsInStrokeOrder(constellation);
  const fromKey = keyGlyphs.slice(0, starOrder.length);
  const starGlyphs = [
    ...fromKey,
    ...evenlyPick(otherGlyphs, starOrder.length - fromKey.length),
  ].sort((a, b) => a - b);
  const starOfGlyph = new Map<number, number>();
  starGlyphs.forEach((glyphIndex, order) => {
    if (order < starOrder.length) starOfGlyph.set(glyphIndex, starOrder[order]);
  });

  // The minor stars, one per remaining letter, kept on screen.
  const dust = planStarDust(constellation, count - starOfGlyph.size);
  const dustTop = screen.top + 8;
  const dustBottom = screen.height - screen.bottom - 8;
  let nextDust = 0;
  const segments: { a: number; b: number; length: number }[] = [];
  for (const stroke of constellation.strokes) {
    for (let i = 1; i < stroke.length; i++) {
      const a = stars[stroke[i - 1]];
      const b = stars[stroke[i]];
      segments.push({
        a: stroke[i - 1],
        b: stroke[i],
        length: Math.hypot(b.x - a.x, b.y - a.y),
      });
    }
  }
  const totalLength = segments.reduce(
    (sum, segment) => sum + segment.length,
    0,
  );

  const tints = starTints(constellation);
  // Some named stars shine brighter.
  const brightStars = new Set(
    [...constellation.stars.keys()].filter(() => random() < REVEAL.brightShare),
  );

  const glyphs: GlyphPlan[] = parsed.glyphs.map((glyph, index) => {
    const box = boxes[index];
    const starId = starOfGlyph.get(index);
    const star = starId === undefined ? null : stars[starId];
    let target: { x: number; y: number };
    let endScale: number;
    let starOpacity: number;

    if (star) {
      target = star;
      endScale = 0.12;
      starOpacity = 1;
    } else {
      const speck = dust[nextDust++];
      const onScreen = toScreen(speck.x, speck.y);
      target = {
        x: reflectInto(onScreen.x, 12, screen.width - 12),
        y: reflectInto(onScreen.y, dustTop, dustBottom),
      };
      endScale =
        ((speck.speck * SPECK_SCALE) / fontSize) *
        1.05 *
        (TINY_INK.test(glyph.char) ? 2 : 1);
      starOpacity = speck.opacity;
    }

    // A gentle curve, bending to one side or the other.
    const dx = target.x - box.cx;
    const dy = target.y - box.cy;
    const distance = Math.hypot(dx, dy) || 1;
    const bend = (random() - 0.5) * 0.7 * distance;
    const px = -dy / distance;
    const py = dx / distance;

    return {
      role: star ? ROLE_STAR : ROLE_DUST,
      tIn: tIn[index],
      // A wave through the text, in reading order.
      tFly:
        morph +
        (index / Math.max(count - 1, 1)) * REVEAL.flightSpreadMs +
        random() * 140,
      flyMs: REVEAL.flightMs * (0.85 + random() * 0.3),
      dx,
      dy,
      c1x: dx * 0.3 + px * bend,
      c1y: dy * 0.3 + py * bend,
      c2x: dx * 0.7 + px * bend * 0.6,
      c2y: dy * 0.7 + py * bend * 0.6,
      endScale,
      starOpacity,
      dotSize: star
        ? STAR_DOT_SCALE *
          (2.2 + star.mag * 1.5) *
          (brightStars.has(starId!) ? 1.3 : 1)
        : 0,
      pulseA: 0.0015 + random() * 0.0035,
      pulseB: 0.0007 + random() * 0.0012,
      phase: random() * Math.PI * 2,
      twinkle: !star && random() < 0.3 ? 0.5 : 0,
      bright: star && brightStars.has(starId!) ? 1 : 0,
      tint: star ? tints[starId!] : 0,
    };
  });

  const formed = Math.max(...glyphs.map((glyph) => glyph.tFly + glyph.flyMs));
  const linesStart =
    Math.max(
      ...glyphs
        .filter((glyph) => glyph.role === ROLE_STAR)
        .map((glyph) => glyph.tFly + glyph.flyMs),
    ) - 300;

  // Lines stop short of the stars, like a star chart, and are traced by one
  // pen moving at a steady speed.
  const edges: EdgePlan[] = [];
  const penSpeed = totalLength / REVEAL.linesDrawMs;
  let pen = linesStart;
  for (const segment of segments) {
    const a = stars[segment.a];
    const b = stars[segment.b];
    const drawMs = segment.length / penSpeed;
    if (segment.length > LINE_GAP * 2 + 4) {
      const ux = (b.x - a.x) / segment.length;
      const uy = (b.y - a.y) / segment.length;
      edges.push({
        x: a.x + ux * LINE_GAP,
        y: a.y + uy * LINE_GAP,
        length: segment.length - LINE_GAP * 2,
        angle: Math.atan2(uy, ux),
        tDraw: pen,
        drawMs,
      });
    }
    pen += drawMs;
  }
  const linesDone = Math.max(linesStart, pen);

  const linesOut = Math.max(formed, linesDone) + REVEAL.holdMs;
  const starsOut = linesOut + REVEAL.linesOutMs;
  const skyOut = starsOut + REVEAL.starsOutMs;

  return {
    glyphs,
    edges,
    times: {
      skyIn: SKY_IN_AT,
      skyInMs: SKY_IN_MS,
      textStart,
      textEnd,
      morph,
      formed,
      linesStart,
      linesDone,
      linesOut,
      starsOut,
      uncover: skyOut - REVEAL.uncoverLeadMs,
      skyOut,
      total: skyOut + REVEAL.skyOutMs,
    },
  };
}
