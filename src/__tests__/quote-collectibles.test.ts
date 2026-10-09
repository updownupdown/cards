import { quotes } from "@/components/Collectibles/QuotesText";
import { getQuote, QUOTE_COUNT } from "@/data/collectibles";
import {
  getQuoteAuthor,
  QUOTE_AUTHORS,
  QUOTE_IDS_BY_AUTHOR,
} from "@/data/quote-authors";
import { describe, expect, test } from "@jest/globals";

/** The points of a portrait's line ("M x y L x y ..."). */
function points(d: string) {
  return d
    .slice(1)
    .split("L")
    .map((pair) => pair.trim().split(/\s+/).map(Number))
    .map(([x, y]) => ({ x, y }));
}

// --- Authors and portraits ----------------------------------------------------------

/** The portraits' box, and the line they start and end on. */
const CELL_BOX = { width: 200, height: 240 };
const LINE_Y = 238;

describe("Quote authors", () => {
  test("every quote's author has a portrait, and every portrait an author with quotes", () => {
    const authors = new Set(quotes.map((quote) => quote.author));
    expect(QUOTE_AUTHORS.map((author) => author.name).sort()).toEqual(
      [...authors].sort(),
    );
    for (const quote of quotes)
      expect(getQuoteAuthor(quote.author)).toBeDefined();
  });

  test("are in order of birth", () => {
    const years = QUOTE_AUTHORS.map((author) => author.born);
    expect(years).toEqual([...years].sort((a, b) => a - b));
  });

  test("died after they were born, within a plausible lifetime", () => {
    for (const author of QUOTE_AUTHORS) {
      if (author.died === null) continue;
      // Anne Frank, the youngest, died at 15.
      expect(author.died - author.born).toBeGreaterThan(10);
      expect(author.died - author.born).toBeLessThan(110);
    }
    expect(getQuoteAuthor("Dalai Lama XIV")!.died).toBeNull();
  });

  test("list every quote exactly once", () => {
    const ids = [...QUOTE_IDS_BY_AUTHOR.values()].flat().sort((a, b) => a - b);
    expect(ids).toEqual(Array.from({ length: QUOTE_COUNT }, (_, i) => i + 1));
    for (const [name, list] of QUOTE_IDS_BY_AUTHOR) {
      for (const id of list) expect(getQuote(id)!.author).toBe(name);
    }
  });

  test("portraits are one line from the bottom left to the bottom right, in their box", () => {
    for (const author of QUOTE_AUTHORS) {
      expect(author.portrait.match(/M/g)).toHaveLength(1);
      const line = points(author.portrait);
      expect({ name: author.name, start: line[0] }).toEqual({
        name: author.name,
        start: { x: 4, y: LINE_Y },
      });
      expect({ name: author.name, end: line[line.length - 1] }).toEqual({
        name: author.name,
        end: { x: 196, y: LINE_Y },
      });
      for (const { x, y } of line) {
        expect(x).toBeGreaterThanOrEqual(-4);
        expect(x).toBeLessThanOrEqual(CELL_BOX.width + 4);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(CELL_BOX.height + 2);
      }
    }
  });
});
