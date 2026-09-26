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

  test("gives every star a letter and keeps the phases in order", () => {
    const stars = plan.glyphs.filter((glyph) => glyph.role === ROLE_STAR);
    expect(stars).toHaveLength(constellation.stars.length);
    expect(plan.edges.length).toBeGreaterThan(0);

    const t = plan.times;
    expect(t.textStart).toBeLessThan(t.textEnd);
    expect(t.morph).toBe(t.textEnd + REVEAL.restPauseMs);
    expect(t.morph).toBeLessThan(t.formed);
    expect(t.linesStart).toBeLessThanOrEqual(t.linesDone);
    expect(t.linesOut).toBeGreaterThanOrEqual(t.linesDone + REVEAL.holdMs);
    expect(t.starsOut).toBe(t.linesOut + REVEAL.linesOutMs);
    expect(t.skyOut).toBe(t.starsOut + REVEAL.starsOutMs);
    // The win box changes while the sky still covers it.
    expect(t.uncover).toBeGreaterThan(t.starsOut);
    expect(t.uncover).toBeLessThan(t.skyOut);
    expect(t.total).toBe(t.skyOut + REVEAL.skyOutMs);

    // Letters appear in reading order.
    const appear = plan.glyphs.map((glyph) => glyph.tIn);
    expect(appear).toEqual([...appear].sort((a, b) => a - b));
  });

  test("star dust stays mostly with the figure", () => {
    const boxes = fakeBoxes(parsed.glyphs.length);
    const landings = plan.glyphs
      .map((glyph, index) => ({ glyph, x: boxes[index].cx + glyph.dx }))
      .filter(({ glyph }) => glyph.role !== ROLE_STAR);
    const near = landings.filter(
      ({ x }) => Math.abs(x - screen.width / 2) < screen.width * 0.45,
    );
    expect(near.length / landings.length).toBeGreaterThan(0.8);
    expect(plan.glyphs.some((glyph) => glyph.bright)).toBe(true);
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
    expect(REVEAL.charsPerSecond).toBe(35);
    const text = parseChapterText("ab\ncd,\ngh\nij.\nkl\n\nmn");
    const t = planReveal({
      parsed: text,
      boxes: fakeBoxes(text.glyphs.length),
      fontSize: 18,
      constellation,
      keyLines: [],
      screen,
    }).glyphs.map((glyph) => glyph.tIn);
    const msPerChar = 1000 / 35;
    // ab | cd, | gh | ij. | kl || mn: a word's letters appear together,
    // when the reading reaches the word.
    expect(t[1]).toBe(t[0]);
    expect(t[3]).toBe(t[2]);
    expect(t[4]).toBe(t[2]);
    expect(t[2] - t[0]).toBeCloseTo(2 * msPerChar + 400);
    expect(t[5] - t[2]).toBeCloseTo(3 * msPerChar + 1000);
    expect(t[7] - t[5]).toBeCloseTo(2 * msPerChar + 400);
    expect(t[10] - t[7]).toBeCloseTo(3 * msPerChar + 1000);
    expect(t[12] - t[10]).toBeCloseTo(2 * msPerChar + 2000);
  });
});
