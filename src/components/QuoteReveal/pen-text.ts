import { PEN_FONT } from "./pen-font.generated";

/**
 * Lays text out in a single-line font and plans how a pen writes it. Unlike
 * the Tao reveal nothing needs measuring on screen: every glyph's advance and
 * strokes are known, so the layout is plain arithmetic.
 */

const EM = 1000;

export type PenStroke = {
  /** Polyline in block pixels: flat [x0, y0, x1, y1, ...]. */
  points: number[];
  /** Arc length at each point. */
  lengths: number[];
  length: number;
  d: string;
  word: number;
  line: number;
};

export type PenWord = { x: number; y: number; width: number; height: number };

export type PenBlock = {
  width: number;
  height: number;
  strokes: PenStroke[];
  words: PenWord[];
  lineCount: number;
  fontSize: number;
};

type LayoutOptions = {
  fontSize: number;
  maxWidth: number;
  lineHeight?: number;
  /** Ink width, so strokes aren't clipped at the block's edges. */
  inkWidth?: number;
};

const GLYPHS = PEN_FONT.glyphs as Record<
  string,
  [number, number[][]] | undefined
>;

/** A character's glyph; one the font lacks is drawn as "?". */
function glyphFor(char: string) {
  return GLYPHS[char] ?? GLYPHS["?"];
}

/** Whether the pen font can write the character (else it writes "?"). */
export function hasPenGlyph(char: string) {
  return /\s/.test(char) || !!GLYPHS[char];
}

function wordAdvance(word: string) {
  let advance = 0;
  for (const char of word) advance += glyphFor(char)?.[0] ?? 0;
  return advance;
}

/**
 * Wraps and centres the text in `maxWidth`, keeping its own line breaks. The
 * block is cropped to the ink, so its height is what the eye sees.
 */
export function layoutPenText(
  text: string,
  { fontSize, maxWidth, lineHeight = 1.4, inkWidth = 2 }: LayoutOptions,
): PenBlock {
  const scale = fontSize / EM;
  const space = (glyphFor(" ")?.[0] ?? 300) * scale;

  // Greedy wrap, paragraph by paragraph.
  const lines: { words: string[]; width: number }[] = [];
  for (const paragraph of text.split("\n")) {
    let line: { words: string[]; width: number } = { words: [], width: 0 };
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const width = wordAdvance(word) * scale;
      const next = line.words.length ? line.width + space + width : width;
      if (line.words.length && next > maxWidth) {
        lines.push(line);
        line = { words: [word], width };
      } else {
        line.words.push(word);
        line.width = next;
      }
    }
    lines.push(line);
  }

  const blockWidth = Math.min(
    maxWidth,
    Math.max(...lines.map((line) => line.width)),
  );
  const raw: {
    points: number[];
    word: number;
    line: number;
    glyphIndex: number;
  }[] = [];
  const wordBoxes: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  }[] = [];
  let wordIndex = 0;
  lines.forEach((line, lineIndex) => {
    const baseline = lineIndex * fontSize * lineHeight;
    let x = (blockWidth - line.width) / 2;
    for (const word of line.words) {
      const box = {
        minX: Infinity,
        minY: Infinity,
        maxX: -Infinity,
        maxY: -Infinity,
      };
      for (const char of word) {
        const glyph = glyphFor(char);
        if (!glyph) continue;
        glyph[1].forEach((stroke, glyphIndex) => {
          const points: number[] = [];
          for (let i = 0; i < stroke.length; i += 2) {
            const px = x + stroke[i] * scale;
            const py = baseline - stroke[i + 1] * scale;
            points.push(px, py);
            box.minX = Math.min(box.minX, px);
            box.maxX = Math.max(box.maxX, px);
            box.minY = Math.min(box.minY, py);
            box.maxY = Math.max(box.maxY, py);
          }
          raw.push({ points, word: wordIndex, line: lineIndex, glyphIndex });
        });
        x += glyph[0] * scale;
      }
      wordBoxes.push(box);
      wordIndex += 1;
      x += space;
    }
  });

  // Crop to the ink, with room for the pen's width.
  const pad = inkWidth * 2;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const box of wordBoxes) {
    minX = Math.min(minX, box.minX);
    minY = Math.min(minY, box.minY);
    maxX = Math.max(maxX, box.maxX);
    maxY = Math.max(maxY, box.maxY);
  }
  if (!Number.isFinite(minX)) {
    return {
      width: 0,
      height: 0,
      strokes: [],
      words: [],
      lineCount: 0,
      fontSize,
    };
  }
  const offsetX = pad - minX;
  const offsetY = pad - minY;

  // Within a word the pen writes the flowing strokes first, then comes back
  // for the i dots and t bars, as a hand does.
  const secondaryLength = fontSize * 0.45;
  const byWord = new Map<number, PenStroke[][]>();
  for (const entry of raw) {
    const points = entry.points.map((value, i) =>
      i % 2 === 0 ? value + offsetX : value + offsetY,
    );
    const lengths = [0];
    let d = `M${points[0].toFixed(1)} ${points[1].toFixed(1)}`;
    for (let i = 2; i < points.length; i += 2) {
      lengths.push(
        lengths[lengths.length - 1] +
          Math.hypot(points[i] - points[i - 2], points[i + 1] - points[i - 1]),
      );
      d += `L${points[i].toFixed(1)} ${points[i + 1].toFixed(1)}`;
    }
    const stroke: PenStroke = {
      points,
      lengths,
      length: lengths[lengths.length - 1],
      d,
      word: entry.word,
      line: entry.line,
    };
    const groups = byWord.get(entry.word) ?? [[], []];
    const secondary = entry.glyphIndex > 0 && stroke.length < secondaryLength;
    groups[secondary ? 1 : 0].push(stroke);
    byWord.set(entry.word, groups);
  }
  const strokes = [...byWord.keys()]
    .sort((a, b) => a - b)
    .flatMap((word) => [...byWord.get(word)![0], ...byWord.get(word)![1]]);

  return {
    width: maxX - minX + pad * 2,
    height: maxY - minY + pad * 2,
    strokes,
    words: wordBoxes.map((box) => ({
      x: box.minX + offsetX - pad,
      y: box.minY + offsetY - pad,
      width: box.maxX - box.minX + pad * 2,
      height: box.maxY - box.minY + pad * 2,
    })),
    lineCount: lines.length,
    fontSize,
  };
}

/**
 * The largest font size, down to `minSize`, at which the text fits the box.
 */
export function fitPenText(
  text: string,
  box: { width: number; height: number },
  {
    maxSize,
    minSize,
    lineHeight,
  }: { maxSize: number; minSize: number; lineHeight?: number },
) {
  let block: PenBlock | null = null;
  for (let size = maxSize; size >= minSize; size -= 1) {
    block = layoutPenText(text, {
      fontSize: size,
      maxWidth: box.width,
      lineHeight,
      inkWidth: inkWidthFor(size),
    });
    if (block.height <= box.height) return block;
  }
  return block!;
}

/** A pen that reads at any size: a little heavier as the letters grow. */
export function inkWidthFor(fontSize: number) {
  return Math.max(1.1, fontSize * 0.058);
}

export type PenTiming = {
  t0: number[];
  t1: number[];
  end: number;
};

type TimingOptions = {
  start: number;
  /** Pen speed while drawing, in pixels per millisecond. */
  speed: number;
  /** Longest it may take; a long quote is written faster. */
  maxMs: number;
  liftMs?: number;
  wordGapMs?: number;
  lineGapMs?: number;
};

/** When each stroke starts and ends, at a steady pen speed. */
export function planPenTiming(
  block: PenBlock,
  {
    start,
    speed,
    maxMs,
    liftMs = 40,
    wordGapMs = 110,
    lineGapMs = 220,
  }: TimingOptions,
): PenTiming {
  const draws: number[] = [];
  const gaps: number[] = [];
  block.strokes.forEach((stroke, index) => {
    const previous = block.strokes[index - 1];
    let gap = 0;
    if (previous) {
      // The pen lifts and travels to the next stroke's start.
      const travel = Math.hypot(
        stroke.points[0] - previous.points[previous.points.length - 2],
        stroke.points[1] - previous.points[previous.points.length - 1],
      );
      gap =
        liftMs +
        travel / (speed * 3) +
        (stroke.line !== previous.line
          ? lineGapMs
          : stroke.word !== previous.word
            ? wordGapMs
            : 0);
    }
    gaps.push(gap);
    // At least a frame, so even a dot is written.
    draws.push(Math.max(16, stroke.length / speed));
  });
  const natural =
    draws.reduce((sum, value) => sum + value, 0) +
    gaps.reduce((sum, value) => sum + value, 0);
  const factor = natural > maxMs ? maxMs / natural : 1;

  const t0: number[] = [];
  const t1: number[] = [];
  let t = start;
  block.strokes.forEach((_, index) => {
    t += gaps[index] * factor;
    t0.push(t);
    t += draws[index] * factor;
    t1.push(t);
  });
  return { t0, t1, end: t };
}

function polylineD(points: number[]) {
  let d = `M${points[0].toFixed(1)} ${points[1].toFixed(1)}`;
  for (let i = 2; i < points.length; i += 2) {
    d += `L${points[i].toFixed(1)} ${points[i + 1].toFixed(1)}`;
  }
  return d;
}

/** The block moved by (dx, dy), e.g. into a canvas it shares with others. */
export function shiftBlock(block: PenBlock, dx: number, dy: number): PenBlock {
  return {
    ...block,
    strokes: block.strokes.map((stroke) => {
      const points = stroke.points.map((value, i) =>
        i % 2 === 0 ? value + dx : value + dy,
      );
      return { ...stroke, points, d: polylineD(points) };
    }),
    words: block.words.map((word) => ({
      ...word,
      x: word.x + dx,
      y: word.y + dy,
    })),
  };
}
