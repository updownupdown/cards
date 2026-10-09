import { describe, expect, test } from "@jest/globals";
import {
  HURRY_STEP_MS,
  scheduleLines,
} from "@/components/TaoCollection/ChapterText";
import {
  parseChapterText,
  planStarDust,
  REVEAL,
  scheduleReading,
} from "@/components/TaoReveal/timeline";
import { getTaoChapter, TAO_CHAPTER_COUNT } from "@/data/collectibles";
import {
  getKeyLineIndices,
  getTaoConstellation,
  TAO_CONSTELLATIONS,
} from "@/data/tao-constellations";
import { localizeTaoChapter } from "@/i18n/content";
import { SUPPORTED_LANGUAGES } from "@/i18n/languages";

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

describe("Reading pace", () => {
  test("words, line breaks and paragraphs keep their pace", () => {
    expect(REVEAL.charsPerSecond).toBe(30);
    const text = parseChapterText("ab\ncd,\ngh\nij.\nkl\n\nmn");
    const t = scheduleReading(text, 0).tIn;
    const msPerChar = 1000 / 30;
    // ab | cd, | gh | ij. | kl || mn: a word's letters are timed together,
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

  test("lines come one at a time, a longer line holding the reading longer", () => {
    const text = parseChapterText(
      "A short line\nA much longer line that takes a while to read\nThe end",
    );
    const { startsAt, textEnd } = scheduleLines(text, 100);
    expect(startsAt[0]).toBe(100);
    expect(startsAt[2] - startsAt[1]).toBeGreaterThan(
      startsAt[1] - startsAt[0],
    );
    expect(textEnd).toBe(startsAt[2] + REVEAL.lineFadeMs);
  });

  test("hurried, the lines still to come arrive quickly, in order", () => {
    const text = parseChapterText("one\ntwo\nthree\nfour");
    const calm = scheduleLines(text, 0);
    const hurriedAt = calm.startsAt[1] + 1;
    const hurried = scheduleLines(text, 0, hurriedAt);
    // Lines already shown keep their time; the rest follow at once.
    expect(hurried.startsAt.slice(0, 2)).toEqual(calm.startsAt.slice(0, 2));
    expect(hurried.startsAt[2]).toBe(hurriedAt);
    expect(hurried.startsAt[3]).toBe(hurriedAt + HURRY_STEP_MS);
    expect(hurried.textEnd).toBeLessThan(calm.textEnd);
  });
});
