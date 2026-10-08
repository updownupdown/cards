import { describe, expect, test } from "@jest/globals";
import {
  parseChapterText,
  planReveal,
  planStarDust,
  REVEAL,
  ROLE_STAR,
} from "@/components/TaoReveal/timeline";
import { getTaoChapter, TAO_CHAPTER_COUNT } from "@/data/collectibles";
import {
  getKeyLineIndices,
  getTaoConstellation,
  TAO_CONSTELLATIONS,
} from "@/data/tao-constellations";
import { localizeTaoChapter } from "@/i18n/content";
import { SUPPORTED_LANGUAGES } from "@/i18n/languages";

const screen = { width: 390, height: 780, top: 24, bottom: 0 };

/** Letters laid out on a simple grid, as the measuring pass would report. */
function fakeBoxes(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    cx: 24 + (index % 30) * 11,
    cy: 120 + Math.floor(index / 30) * 26,
  }));
}

describe("Tao constellations", () => {
  test("every chapter has one, in order", () => {
    expect(TAO_CONSTELLATIONS).toHaveLength(TAO_CHAPTER_COUNT);
    TAO_CONSTELLATIONS.forEach((constellation, index) => {
      expect(constellation.chapter).toBe(index + 1);
      expect(getTaoConstellation(index + 1)).toBe(constellation);
    });
  });

  test.each(TAO_CONSTELLATIONS.map((c) => [c.chapter, c] as const))(
    "chapter %i is well formed",
    (chapter, constellation) => {
      expect(constellation.stars.length).toBeGreaterThanOrEqual(10);
      expect(constellation.stars.length).toBeLessThanOrEqual(40);
      for (const star of constellation.stars) {
        expect(star.x).toBeGreaterThanOrEqual(0);
        expect(star.x).toBeLessThanOrEqual(100);
        expect(star.y).toBeGreaterThanOrEqual(0);
        expect(star.y).toBeLessThanOrEqual(100);
        expect(star.mag).toBeGreaterThan(0);
      }
      for (const stroke of constellation.strokes) {
        expect(stroke.length).toBeGreaterThanOrEqual(2);
        stroke.forEach((id, index) => {
          expect(id).toBeLessThan(constellation.stars.length);
          if (index > 0) expect(id).not.toBe(stroke[index - 1]);
        });
      }
      // Every key phrase is found, in a line of its own.
      const keyLines = getKeyLineIndices(constellation);
      expect(keyLines).toHaveLength(constellation.keyPhrases.length);

      // Each language keeps the English lines, so the key lines hold, and
      // has more letters than the figure has stars.
      const english = parseChapterText(getTaoChapter(chapter)!.text);
      for (const language of SUPPORTED_LANGUAGES) {
        const text = localizeTaoChapter(
          chapter,
          getTaoChapter(chapter)!,
          language,
        ).text;
        const parsed = parseChapterText(text);
        expect(parsed.lines).toHaveLength(english.lines.length);
        expect(parsed.glyphs.length).toBeGreaterThan(
          constellation.stars.length,
        );
      }
    },
  );
});

describe("Star dust", () => {
  test("is the same every time, and a larger count only adds to it", () => {
    const constellation = getTaoConstellation(21)!;
    const small = planStarDust(constellation, 120);
    const large = planStarDust(constellation, 300);
    expect(large.slice(0, 120)).toEqual(small);
    expect(planStarDust(constellation, 120)).toEqual(small);
  });

  test("gathers around the figure, with some sky beyond it", () => {
    const dust = planStarDust(getTaoConstellation(1)!, 400);
    const inside = dust.filter(
      (point) =>
        point.x >= 0 && point.x <= 100 && point.y >= 0 && point.y <= 100,
    );
    expect(inside.length / dust.length).toBeGreaterThan(0.6);
    expect(inside.length).toBeLessThan(dust.length);
    for (const point of dust) {
      // Dimmed to stay behind the figure.
      expect(point.opacity).toBeGreaterThan(0.4);
      expect(point.opacity).toBeLessThanOrEqual(0.75);
    }
  });
});

describe("Reveal plan", () => {
  const constellation = getTaoConstellation(11)!;
  const parsed = parseChapterText(getTaoChapter(11)!.text);
  const plan = planReveal({
    parsed,
    boxes: fakeBoxes(parsed.glyphs.length),
    fontSize: 18,
    constellation,
    keyLines: getKeyLineIndices(constellation),
    screen,
  });

  /** When a letter lands in the text and is read. */
  const readAt = (glyph: (typeof plan.glyphs)[number]) =>
    glyph.tFly + glyph.flyMs - REVEAL.wordFadeMs;

  test("gives every star a letter and keeps the phases in order", () => {
    const stars = plan.glyphs.filter((glyph) => glyph.role === ROLE_STAR);
    expect(stars).toHaveLength(constellation.stars.length);
    expect(plan.stars).toHaveLength(constellation.stars.length);
    expect(plan.edges.length).toBeGreaterThan(0);

    // The constellation forms first, then dims, then the words are written.
    const t = plan.times;
    expect(t.skyIn + t.skyInMs).toBeGreaterThan(t.bloom);
    expect(t.bloom).toBeLessThan(t.linesStart);
    expect(t.linesStart).toBeLessThan(t.formed);
    expect(t.dim).toBe(t.formed + REVEAL.formedHoldMs);
    expect(t.textStart).toBe(t.dim + REVEAL.writeLeadMs);
    expect(t.textStart).toBeLessThan(t.textEnd);
    expect(t.canClose).toBe(t.textEnd + REVEAL.closeAfterMs);
    for (const star of plan.stars) {
      expect(star.tIn).toBeGreaterThanOrEqual(t.bloom);
      expect(star.tIn).toBeLessThan(t.formed);
      // Each one sends a letter.
      expect(star.tWrite).toBeGreaterThanOrEqual(t.dim);
    }
    for (const edge of plan.edges) {
      expect(edge.tDraw + edge.drawMs).toBeLessThanOrEqual(t.formed + 1);
    }

    // No letter leaves its star before the figure dims, and they are read
    // in order, the last as the text ends.
    for (const glyph of plan.glyphs) {
      expect(glyph.tFly).toBeGreaterThanOrEqual(t.dim);
      expect(glyph.tBorn).toBeLessThan(t.formed);
    }
    const read = plan.glyphs.map(readAt);
    expect(read).toEqual([...read].sort((a, b) => a - b));
    expect(Math.max(...read) + REVEAL.wordFadeMs).toBeCloseTo(t.textEnd);
  });

  test("star dust stays mostly with the figure", () => {
    const boxes = fakeBoxes(parsed.glyphs.length);
    const origins = plan.glyphs
      .map((glyph, index) => ({ glyph, x: boxes[index].cx + glyph.dx }))
      .filter(({ glyph }) => glyph.role !== ROLE_STAR);
    const near = origins.filter(
      ({ x }) => Math.abs(x - screen.width / 2) < screen.width * 0.45,
    );
    expect(near.length / origins.length).toBeGreaterThan(0.8);
    expect(plan.stars.some((star) => star.bright)).toBe(true);
  });

  test("the named stars are the key line's letters", () => {
    const keyLines = new Set(getKeyLineIndices(constellation));
    plan.glyphs.forEach((glyph, index) => {
      if (glyph.role === ROLE_STAR) {
        expect(keyLines.has(parsed.glyphs[index].line)).toBe(true);
      }
    });
  });

  test("words, line breaks and paragraphs keep their pace", () => {
    expect(REVEAL.charsPerSecond).toBe(30);
    const text = parseChapterText("ab\ncd,\ngh\nij.\nkl\n\nmn");
    const t = planReveal({
      parsed: text,
      boxes: fakeBoxes(text.glyphs.length),
      fontSize: 18,
      constellation,
      keyLines: [],
      screen,
    }).glyphs.map(readAt);
    const msPerChar = 1000 / 30;
    // ab | cd, | gh | ij. | kl || mn: a word's letters appear together,
    // when the reading reaches the word.
    expect(t[1]).toBeCloseTo(t[0]);
    expect(t[3]).toBeCloseTo(t[2]);
    expect(t[4]).toBeCloseTo(t[2]);
    expect(t[2] - t[0]).toBeCloseTo(2 * msPerChar + 450);
    expect(t[5] - t[2]).toBeCloseTo(3 * msPerChar + 1000);
    expect(t[7] - t[5]).toBeCloseTo(2 * msPerChar + 450);
    expect(t[10] - t[7]).toBeCloseTo(3 * msPerChar + 1000);
    expect(t[12] - t[10]).toBeCloseTo(2 * msPerChar + 2000);
  });
});
