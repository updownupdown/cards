import type { Constellation } from "@/data/tao-constellations";
import { REVEAL_TIMING } from "@/components/common/reveal-timing";

/**
 * Plans the whole Tao reveal up front: the chapter's constellation forming in
 * the sky, then dimming while its stars write the chapter out, letter by
 * letter. Everything runs off one clock (ms of "story time"), so the UI
 * thread animation and the button below read from the same numbers. The
 * reveal then waits for the player to close it; its exit is timed from that
 * moment (REVEAL.exit*).
 */

export const REVEAL = {
  // Constellation
  /** The star dust fades in, each speck at its own moment, over this. */
  dustInMs: 1800,
  dustFadeMs: 900,
  /** The named stars light up in the pen's order, starting this late... */
  starsStartMs: 500,
  /** ...and spread over this. */
  starsSpreadMs: 1600,
  starPopMs: 600,
  linesDrawMs: 2600,
  /** The figure, complete, before it starts to dim. */
  formedHoldMs: 1800,
  // Dimming, so the words can be read over it
  dimMs: 2200,
  /** How bright the named stars and lines stay behind the words. */
  starDim: 0.35,
  lineDim: 0.3,
  /** Star dust waiting to be written keeps this share of its light. */
  dustDim: 0.5,
  // Writing
  /** The first words land this long after the figure starts to dim. */
  writeLeadMs: 1400,
  /** A letter's flight from its star to its place in the text. */
  flightMs: 1700,
  charsPerSecond: 30,
  /** Words appear whole, each fading in over this long. */
  wordFadeMs: 400,
  commaPauseMs: 140,
  sentencePauseMs: 300,
  linePauseMs: 450,
  /** Replaces `linePauseMs` when the line ends in punctuation. */
  punctuatedLinePauseMs: 1000,
  paragraphPauseMs: 2000,
  /** The player can close the chapter this long after it is all written. */
  closeAfterMs: 2000,
  /** Share of star dust that forms a halo around the figure's strokes. */
  haloShare: 0.5,
  /** Of the rest, the share scattered close around the figure. */
  nearShare: 0.7,
  /** How far the halo and the near dust spread, in figure units (0-100). */
  haloSpread: 5,
  nearSpread: 48,
  /** Share of the named stars that shine brighter than the others. */
  brightShare: 0.35,
  // Exit, from the moment the player closes it: as long as fadeOutMs.
  exitTextMs: REVEAL_TIMING.fadeOutMs * 0.4,
  exitStarsAtMs: REVEAL_TIMING.fadeOutMs * 0.15,
  exitStarsMs: REVEAL_TIMING.fadeOutMs * 0.4,
  exitSkyAtMs: REVEAL_TIMING.fadeOutMs * 0.45,
  exitSkyMs: REVEAL_TIMING.fadeOutMs * 0.55,
  /** The win box is finished off this long before the sky starts to clear. */
  uncoverLeadMs: 300,
} as const;

/** When the screen behind can change unseen, after the player closes it. */
export const EXIT_UNCOVER_MS = REVEAL.exitSkyAtMs - REVEAL.uncoverLeadMs;
/** When the reveal is gone, after the player closes it. */
export const EXIT_TOTAL_MS = REVEAL.exitSkyAtMs + REVEAL.exitSkyMs;

// The pause before the reveal is the win box's (REVEAL_TIMING.delayMs).
export const SKY_IN_AT = 0;
export const SKY_IN_MS = REVEAL_TIMING.fadeInMs;
/** The constellation starts to form this soon, if its plan is ready. */
export const BLOOM_AT = SKY_IN_AT + SKY_IN_MS * 0.6;
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
  /** Star dust: when its speck appears in the sky. */
  tBorn: number;
  /** When it leaves its star for its place in the text... */
  tFly: number;
  /** ...and how long it takes; it is read from tFly + flyMs - wordFadeMs. */
  flyMs: number;
  /** Where it starts, from its place in the text, and its path between. */
  dx: number;
  dy: number;
  c1x: number;
  c1y: number;
  c2x: number;
  c2y: number;
  /** Its size as a speck, as a share of the letter's. */
  speckScale: number;
  /** Star dust's resting opacity in the sky. */
  starOpacity: number;
  pulseA: number;
  phase: number;
  twinkle: number;
};

/** One of the constellation's named stars, which stays in the sky. */
export type StarPlan = {
  x: number;
  y: number;
  /** When it lights up. */
  tIn: number;
  dotSize: number;
  pulseA: number;
  pulseB: number;
  phase: number;
  /** 1 for the named stars that shine brighter. */
  bright: number;
  /** Index into STAR_TINTS. */
  tint: number;
  /** When its letter leaves it, so it can flare. */
  tWrite: number;
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
  /** The constellation starts to form... */
  bloom: number;
  linesStart: number;
  /** ...and is complete. */
  formed: number;
  /** It starts to dim, and the letters start to leave their stars. */
  dim: number;
  textStart: number;
  textEnd: number;
  /** From here the player can close it. */
  canClose: number;
};

export type RevealPlan = {
  glyphs: GlyphPlan[];
  stars: StarPlan[];
  edges: EdgePlan[];
  times: RevealTimes;
};

export type GlyphBox = { cx: number; cy: number };

export type PlanInput = {
  parsed: ParsedText;
  boxes: GlyphBox[];
  fontSize: number;
  constellation: Constellation;
  /** Lines whose letters come from the named stars (see getKeyLineIndices). */
  keyLines: number[];
  screen: { width: number; height: number; top: number; bottom: number };
  /** When the constellation starts to form; BLOOM_AT by default. */
  start?: number;
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
  start = BLOOM_AT,
  seed = constellation.chapter * 7919,
}: PlanInput): RevealPlan {
  const random = mulberry32(seed);
  const count = parsed.glyphs.length;

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
  const starPoints = constellation.stars.map((star) => ({
    ...toScreen(star.x, star.y),
    mag: star.mag,
  }));

  // --- The constellation forms: dust, then the named stars, then the lines.
  const starOrder = starsInStrokeOrder(constellation);
  const starIn = new Map<number, number>();
  starOrder.forEach((id, rank) => {
    starIn.set(
      id,
      start +
        REVEAL.starsStartMs +
        (rank / Math.max(starOrder.length - 1, 1)) * REVEAL.starsSpreadMs,
    );
  });
  const segments: { a: number; b: number; length: number }[] = [];
  for (const stroke of constellation.strokes) {
    for (let i = 1; i < stroke.length; i++) {
      const a = starPoints[stroke[i - 1]];
      const b = starPoints[stroke[i]];
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
  // Lines stop short of the stars, like a star chart, and are traced by one
  // pen moving at a steady speed, setting off as the last stars light up.
  const linesStart = start + REVEAL.starsStartMs + REVEAL.starsSpreadMs * 0.7;
  const edges: EdgePlan[] = [];
  const penSpeed = totalLength / REVEAL.linesDrawMs;
  let pen = linesStart;
  for (const segment of segments) {
    const a = starPoints[segment.a];
    const b = starPoints[segment.b];
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
  const formed = Math.max(
    pen,
    start + REVEAL.starsStartMs + REVEAL.starsSpreadMs + REVEAL.starPopMs,
  );
  const dim = formed + REVEAL.formedHoldMs;

  // --- Then the stars write the chapter out, at a calm reading pace.
  const textStart = dim + REVEAL.writeLeadMs;
  const { tIn, textEnd } = scheduleReading(parsed, textStart);

  // The key lines' letters come from the named stars, in the pen's order.
  const keySet = new Set(keyLines);
  const keyGlyphs: number[] = [];
  const otherGlyphs: number[] = [];
  parsed.glyphs.forEach((glyph, index) =>
    (keySet.has(glyph.line) ? keyGlyphs : otherGlyphs).push(index),
  );
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

  const tints = starTints(constellation);
  // Some named stars shine brighter.
  const brightStars = new Set(
    [...constellation.stars.keys()].filter(() => random() < REVEAL.brightShare),
  );
  const starWrite = new Map<number, number>();

  const glyphs: GlyphPlan[] = parsed.glyphs.map((glyph, index) => {
    const box = boxes[index];
    const starId = starOfGlyph.get(index);
    const star = starId === undefined ? null : starPoints[starId];
    let origin: { x: number; y: number };
    let speckScale: number;
    let starOpacity: number;

    if (star) {
      origin = star;
      speckScale = 0.12;
      starOpacity = 0;
    } else {
      const speck = dust[nextDust++];
      const onScreen = toScreen(speck.x, speck.y);
      origin = {
        x: reflectInto(onScreen.x, 12, screen.width - 12),
        y: reflectInto(onScreen.y, dustTop, dustBottom),
      };
      speckScale =
        ((speck.speck * SPECK_SCALE) / fontSize) *
        1.05 *
        (TINY_INK.test(glyph.char) ? 2 : 1);
      starOpacity = speck.opacity;
    }

    // A gentle curve, bending to one side or the other.
    const dx = origin.x - box.cx;
    const dy = origin.y - box.cy;
    const distance = Math.hypot(dx, dy) || 1;
    const bend = (random() - 0.5) * 0.7 * distance;
    const px = -dy / distance;
    const py = dx / distance;
    const flyMs = REVEAL.flightMs * (0.85 + random() * 0.3);
    // It lands as its word is read, never before the figure starts to dim.
    const tFly = Math.max(dim, tIn[index] + REVEAL.wordFadeMs - flyMs);
    if (starId !== undefined) starWrite.set(starId, tFly);

    return {
      role: star ? ROLE_STAR : ROLE_DUST,
      tBorn: start + random() * REVEAL.dustInMs,
      tFly,
      flyMs: tIn[index] + REVEAL.wordFadeMs - tFly,
      dx,
      dy,
      // From its star (the path's far end) back to its place in the text.
      c1x: dx * 0.3 + px * bend,
      c1y: dy * 0.3 + py * bend,
      c2x: dx * 0.7 + px * bend * 0.6,
      c2y: dy * 0.7 + py * bend * 0.6,
      speckScale,
      starOpacity,
      pulseA: 0.0015 + random() * 0.0035,
      phase: random() * Math.PI * 2,
      twinkle: !star && random() < 0.3 ? 0.5 : 0,
    };
  });

  const stars: StarPlan[] = starPoints.map((point, id) => ({
    x: point.x,
    y: point.y,
    tIn: starIn.get(id) ?? start,
    dotSize:
      STAR_DOT_SCALE *
      (2.2 + point.mag * 1.5) *
      (brightStars.has(id) ? 1.3 : 1),
    pulseA: 0.0015 + random() * 0.0035,
    pulseB: 0.0007 + random() * 0.0012,
    phase: random() * Math.PI * 2,
    bright: brightStars.has(id) ? 1 : 0,
    tint: tints[id],
    tWrite: starWrite.get(id) ?? -1,
  }));

  return {
    glyphs,
    stars,
    edges,
    times: {
      skyIn: SKY_IN_AT,
      skyInMs: SKY_IN_MS,
      bloom: start,
      linesStart,
      formed,
      dim,
      textStart,
      textEnd,
      canClose: textEnd + REVEAL.closeAfterMs,
    },
  };
}
