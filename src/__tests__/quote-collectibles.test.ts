import { quotes } from "@/components/Collectibles/QuotesText";
import {
  buildPortrait,
  flattenPath,
  seriesPoints,
} from "@/components/QuoteReveal/fourier";
import { PEN_FONT } from "@/components/QuoteReveal/pen-font.generated";
import {
  fitPenText,
  hasPenGlyph,
  layoutPenText,
  planPenTiming,
  shiftBlock,
} from "@/components/QuoteReveal/pen-text";
import {
  planQuoteReveal,
  REVEAL_TIMES,
} from "@/components/QuoteReveal/QuoteReveal";
import {
  canStepQuote,
  CELL_BLEED,
  CELL_BOX,
  cellLine,
  firstPosition,
  galleryAuthors,
  lifespan,
  LINE_Y,
  placeholderLine,
  PORTRAIT_FOCUS,
  stepAuthor,
  stepQuote,
} from "@/components/QuotesCollection/quote-gallery";
import { getQuote, QUOTE_COUNT } from "@/data/collectibles";
import {
  getQuoteAuthor,
  QUOTE_AUTHORS,
  QUOTE_IDS_BY_AUTHOR,
} from "@/data/quote-authors";
import esQuotes from "@/locales/es/content/quotes.json";
import frQuotes from "@/locales/fr/content/quotes.json";
import idQuotes from "@/locales/id/content/quotes.json";
import itQuotes from "@/locales/it/content/quotes.json";
import ptQuotes from "@/locales/pt/content/quotes.json";
import trQuotes from "@/locales/tr/content/quotes.json";
import { describe, expect, test } from "@jest/globals";

const TRANSLATIONS = {
  fr: frQuotes,
  es: esQuotes,
  it: itQuotes,
  pt: ptQuotes,
  tr: trQuotes,
  id: idQuotes,
} as Record<
  string,
  Record<string, { value: { text: string; source?: string } }>
>;

const SCREEN = { width: 400, height: 860, top: 24, bottom: 16 };

function points(d: string) {
  const flat = flattenPath(d);
  return Array.from({ length: flat.length / 2 }, (_, i) => ({
    x: flat[i * 2],
    y: flat[i * 2 + 1],
  }));
}

// --- The pen font --------------------------------------------------------------

describe("Pen font", () => {
  test("writes every character of every quote, source and author, in every language", () => {
    const texts: string[] = [];
    for (const quote of quotes)
      texts.push(quote.text, quote.source, quote.author);
    for (const entries of Object.values(TRANSLATIONS)) {
      for (const entry of Object.values(entries)) {
        texts.push(entry.value.text, entry.value.source ?? "");
      }
    }
    const missing = new Set<string>();
    for (const text of texts) {
      for (const char of text) if (!hasPenGlyph(char)) missing.add(char);
    }
    expect([...missing]).toEqual([]);
  });

  test("covers the Latin letters of the languages to come, composing accents it lacks", () => {
    for (const char of "ĞğŞşİıŁłŃńŚśŹźŻżĆćĘęĄąČčŘřŠšŽžŮůŐőŰűĀāŌōßæœøÆØ") {
      expect({ char, drawn: hasPenGlyph(char) }).toEqual({ char, drawn: true });
    }
    // The dotless i is the i without its dot.
    const [, withDot] = PEN_FONT.glyphs.i;
    const [, dotless] = PEN_FONT.glyphs.ı;
    expect(dotless.length).toBeLessThan(withDot.length);
  });
});

describe("Pen text layout", () => {
  test("wraps within the width, centring each line", () => {
    const block = layoutPenText(
      "one two three four five six seven eight nine",
      {
        fontSize: 30,
        maxWidth: 200,
      },
    );
    expect(block.lineCount).toBeGreaterThan(1);
    expect(block.width).toBeLessThanOrEqual(200 + 40);
    expect(block.words).toHaveLength(9);
    for (const stroke of block.strokes) {
      for (let i = 0; i < stroke.points.length; i += 2) {
        expect(stroke.points[i]).toBeGreaterThanOrEqual(0);
        expect(stroke.points[i]).toBeLessThanOrEqual(block.width);
        expect(stroke.points[i + 1]).toBeGreaterThanOrEqual(0);
        expect(stroke.points[i + 1]).toBeLessThanOrEqual(block.height);
      }
    }
  });

  test("keeps the text's own line breaks", () => {
    const one = layoutPenText("Come what come may", {
      fontSize: 20,
      maxWidth: 999,
    });
    const two = layoutPenText("Come what\ncome may", {
      fontSize: 20,
      maxWidth: 999,
    });
    expect(one.lineCount).toBe(1);
    expect(two.lineCount).toBe(2);
  });

  test("writes each word's dots and bars after its flowing strokes", () => {
    const block = layoutPenText("it", { fontSize: 40, maxWidth: 999 });
    const lengths = block.strokes.map((stroke) => stroke.length);
    // The shortest strokes (the i's dot, the t's bar) come last.
    expect(lengths[lengths.length - 1]).toBeLessThan(Math.max(...lengths));
  });

  test("shrinks long text to fit the box, down to the smallest size", () => {
    const long = quotes.reduce(
      (a, b) => (b.text.length > a.length ? b.text : a),
      "",
    );
    const fitted = fitPenText(
      long,
      { width: 340, height: 220 },
      { maxSize: 32, minSize: 14 },
    );
    expect(fitted.fontSize).toBeLessThan(32);
    const short = fitPenText(
      "Peace.",
      { width: 340, height: 220 },
      { maxSize: 32, minSize: 14 },
    );
    expect(short.fontSize).toBe(32);
  });

  test("moves a block, strokes and all", () => {
    const block = layoutPenText("moral", { fontSize: 20, maxWidth: 999 });
    const moved = shiftBlock(block, 10, 5);
    expect(moved.strokes[0].points[0]).toBeCloseTo(
      block.strokes[0].points[0] + 10,
    );
    expect(moved.strokes[0].points[1]).toBeCloseTo(
      block.strokes[0].points[1] + 5,
    );
    expect(moved.strokes[0].d.startsWith("M")).toBe(true);
    expect(moved.words[0].x).toBeCloseTo(block.words[0].x + 10);
  });

  test("times strokes one after another, and writes long text faster", () => {
    const block = layoutPenText(quotes[0].text, {
      fontSize: 24,
      maxWidth: 300,
    });
    const slow = planPenTiming(block, { start: 100, speed: 1, maxMs: 1e9 });
    for (let i = 0; i < block.strokes.length; i++) {
      expect(slow.t1[i]).toBeGreaterThan(slow.t0[i]);
      if (i > 0) expect(slow.t0[i]).toBeGreaterThanOrEqual(slow.t1[i - 1]);
    }
    expect(slow.t0[0]).toBe(100);
    const capped = planPenTiming(block, { start: 100, speed: 1, maxMs: 2000 });
    expect(capped.end).toBeCloseTo(2100);
    expect(slow.end).toBeGreaterThan(capped.end);
  });
});

// --- Authors and portraits ----------------------------------------------------------

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

describe("Fourier portraits", () => {
  const author = getQuoteAuthor("Jane Austen")!;
  const model = buildPortrait(author.portrait, 200, 160);

  test("fits the portrait to the height asked for", () => {
    const ys = model.outline.filter((_, i) => i % 2 === 1);
    expect(Math.min(...ys)).toBeCloseTo(0);
    expect(Math.max(...ys)).toBeCloseTo(200);
    expect(model.width).toBeGreaterThan(100);
  });

  test("its series draws the line itself, closely", () => {
    // The hand-drawn line, a point every pixel or so.
    const outline: number[][] = [];
    for (let i = 2; i < model.outline.length; i += 2) {
      const [ax, ay] = [model.outline[i - 2], model.outline[i - 1]];
      const [bx, by] = [model.outline[i], model.outline[i + 1]];
      const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay)));
      for (let k = 0; k < steps; k++) {
        outline.push([
          ax + ((bx - ax) * k) / steps,
          ay + ((by - ay) * k) / steps,
        ]);
      }
    }
    // Every point of the trace lies near the hand-drawn line.
    let worst = 0;
    for (let i = 0; i < model.trace.length; i += 2) {
      const [x, y] = [model.trace[i], model.trace[i + 1]];
      const nearest = Math.min(
        ...outline.map(([ox, oy]) => Math.hypot(ox - x, oy - y)),
      );
      worst = Math.max(worst, nearest);
    }
    expect(worst).toBeLessThan(8);
    // It starts and ends where the line does.
    expect(model.trace[0]).toBeCloseTo(model.outline[0], -1);
    expect(model.trace[model.trace.length - 2]).toBeCloseTo(
      model.outline[model.outline.length - 2],
      -1,
    );
  });

  test("the constant term is the drawing's centre, and few terms give a rough shape", () => {
    const centre = seriesPoints(model, 0, 10);
    for (let i = 0; i < centre.length; i += 2) {
      expect(centre[i]).toBeCloseTo(model.re[0]);
      expect(centre[i + 1]).toBeCloseTo(model.im[0]);
    }
    const all = seriesPoints(model, model.freq.length, 900, 0.5);
    expect(all).toHaveLength(model.trace.length);
    all.forEach((value, i) => expect(value).toBeCloseTo(model.trace[i], 3));
  });
});

// --- The reveal's plan -------------------------------------------------------------------

describe("Quote reveal plan", () => {
  const quote = getQuote(10)!;
  const portrait = getQuoteAuthor(quote.author)!.portrait;
  const plan = planQuoteReveal(quote, portrait, SCREEN);

  test("writes the quote, then brings in the author, then the source, then holds", () => {
    const { timing } = plan.quote;
    expect(timing.t0[0]).toBe(REVEAL_TIMES.writeAt);
    const written = plan.quote.fadeEnds[plan.quote.fadeEnds.length - 1];
    expect(plan.authorAt).toBeGreaterThanOrEqual(written);
    expect(plan.sourceAt).toBe(plan.authorAt + REVEAL_TIMES.authorFadeMs);
    // Everything stays up at least 3 s once the source is in.
    expect(
      plan.outStart - (plan.sourceAt + REVEAL_TIMES.sourceFadeMs),
    ).toBeGreaterThanOrEqual(3000);
    expect(plan.total).toBe(plan.outStart + REVEAL_TIMES.outMs);
  });

  test("each letter fades in as it is written", () => {
    plan.quote.fadeEnds.forEach((end, i) =>
      expect(end).toBe(plan.quote.timing.t1[i] + REVEAL_TIMES.letterFadeMs),
    );
  });

  test("the portrait appears 2 s into the writing and resolves as it finishes", () => {
    expect(plan.portrait).not.toBeNull();
    expect(plan.portrait!.start).toBe(REVEAL_TIMES.writeAt + 2000);
    const written = plan.quote.fadeEnds[plan.quote.fadeEnds.length - 1];
    expect(plan.portrait!.end).toBe(
      Math.max(written, plan.portrait!.start + REVEAL_TIMES.portraitMinMs),
    );
    expect(plan.authorAt).toBeGreaterThan(plan.portrait!.end);
  });

  test("fits on the screen, the portrait above the quote", () => {
    expect(plan.canvas.width).toBeLessThanOrEqual(SCREEN.width);
    expect(plan.canvas.height).toBeLessThan(SCREEN.height);
    const firstQuoteY = Math.min(
      ...plan.quote.block.strokes.map((stroke) => stroke.points[1]),
    );
    expect(firstQuoteY).toBeGreaterThan(plan.portrait!.model.height);
  });

  test("the longest quote still fits a small screen", () => {
    const longest = quotes.reduce((a, b) =>
      b.text.length > a.text.length ? b : a,
    );
    const small = { width: 320, height: 568, top: 20, bottom: 0 };
    const tight = planQuoteReveal(
      longest,
      getQuoteAuthor(longest.author)!.portrait,
      small,
    );
    expect(tight.canvas.height).toBeLessThan(small.height);
    expect(tight.canvas.width).toBeLessThanOrEqual(small.width);
  });

  test("without a portrait, it only writes", () => {
    const plain = planQuoteReveal(quote, undefined, SCREEN);
    expect(plain.portrait).toBeNull();
    expect(plain.authorAt).toBeLessThan(plan.authorAt + 1);
  });
});

// --- The gallery ---------------------------------------------------------------------------

describe("Quote gallery", () => {
  const shakespeare = QUOTE_AUTHORS.findIndex(
    (author) => author.name === "William Shakespeare",
  );
  const austen = QUOTE_AUTHORS.findIndex(
    (author) => author.name === "Jane Austen",
  );
  const shakespeareIds = QUOTE_IDS_BY_AUTHOR.get("William Shakespeare")!;
  const austenId = QUOTE_IDS_BY_AUTHOR.get("Jane Austen")![0];
  const authors = galleryAuthors(
    new Set([shakespeareIds[0], shakespeareIds[2], austenId]),
  );

  test("lists every author by birth, with the quotes collected of theirs", () => {
    expect(authors.map((author) => author.name)).toEqual(
      QUOTE_AUTHORS.map((author) => author.name),
    );
    expect(authors[shakespeare].collectedIds).toEqual([
      shakespeareIds[0],
      shakespeareIds[2],
    ]);
    expect(authors[shakespeare].quoteIds).toEqual(shakespeareIds);
    expect(authors[0].collectedIds).toEqual([]);
  });

  test("opens on the first author with a quote, on their portrait", () => {
    expect(firstPosition(authors)).toEqual({
      author: shakespeare,
      quote: PORTRAIT_FOCUS,
    });
    expect(firstPosition(galleryAuthors(new Set()))).toEqual({
      author: 0,
      quote: PORTRAIT_FOCUS,
    });
  });

  test("steps through every author, round the ends, back on the portrait", () => {
    const onQuote = { author: shakespeare, quote: 1 };
    expect(stepAuthor(onQuote, authors, 1)).toEqual({
      author: shakespeare + 1,
      quote: PORTRAIT_FOCUS,
    });
    expect(stepAuthor({ author: 0, quote: -1 }, authors, -1)).toEqual({
      author: authors.length - 1,
      quote: PORTRAIT_FOCUS,
    });
    expect(
      stepAuthor({ author: authors.length - 1, quote: -1 }, authors, 1),
    ).toEqual({
      author: 0,
      quote: PORTRAIT_FOCUS,
    });
  });

  test("goes down the collected quotes and back up to the portrait, stopping at the ends", () => {
    let position = { author: shakespeare, quote: PORTRAIT_FOCUS };
    expect(canStepQuote(position, authors, -1)).toBe(false);
    expect(stepQuote(position, authors, -1)).toEqual(position);
    position = stepQuote(position, authors, 1);
    expect(position.quote).toBe(0);
    position = stepQuote(position, authors, 1);
    expect(position.quote).toBe(1);
    expect(canStepQuote(position, authors, 1)).toBe(false);
    expect(stepQuote(position, authors, 1)).toEqual(position);
    expect(stepQuote(stepQuote(position, authors, -1), authors, -1).quote).toBe(
      PORTRAIT_FOCUS,
    );
    // Nothing collected: nowhere to go.
    expect(canStepQuote({ author: 0, quote: -1 }, authors, 1)).toBe(false);
  });

  test("an author's line is their portrait once collected, else a wavy placeholder", () => {
    const collected = cellLine(authors[austen]);
    expect(collected).toContain(authors[austen].portrait.slice(1));
    const empty = cellLine(authors[0]);
    expect(empty).toBe(placeholderLine(authors[0].name));
    for (const d of [collected, empty]) {
      const line = points(d);
      // Across the whole cell, on the line at both edges.
      expect(line[0]).toEqual({ x: 0, y: LINE_Y });
      expect(line[line.length - 1].x).toBeCloseTo(CELL_BOX.width);
      expect(line[line.length - 1].y).toBeCloseTo(LINE_Y);
    }
  });

  test("placeholders are gently wavy, never flat, and the same every time", () => {
    const shapes = new Set<string>();
    for (const author of QUOTE_AUTHORS) {
      const d = placeholderLine(author.name);
      expect(placeholderLine(author.name)).toBe(d);
      shapes.add(d);
      const lift = Math.max(...points(d).map(({ y }) => Math.abs(LINE_Y - y)));
      expect(lift).toBeGreaterThan(2);
      expect(lift).toBeLessThan(30);
    }
    expect(shapes.size).toBeGreaterThan(1);
  });

  test("everything drawn in a cell fits inside it with its bleed", () => {
    for (const author of galleryAuthors(
      new Set(QUOTE_IDS_BY_AUTHOR.get("Seneca")),
    )) {
      for (const { x, y } of points(cellLine(author))) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(CELL_BOX.width);
        expect(y).toBeGreaterThanOrEqual(-CELL_BLEED + 4);
        expect(y).toBeLessThanOrEqual(CELL_BOX.height + CELL_BLEED - 4);
      }
    }
  });
});

describe("Author years", () => {
  // As the English strings in campaign.json.
  const t = (key: string, options: Record<string, string | number>) =>
    ({
      "quotes.yearsBC": `${options.from}–${options.to} BC`,
      "quotes.yearsBCtoAD": `${options.from} BC – AD ${options.to}`,
      "quotes.circa": `c. ${options.years}`,
    })[key]!;
  const years = (name: string) => lifespan(getQuoteAuthor(name)!, t);

  test("read naturally across eras", () => {
    expect(years("Henry David Thoreau")).toBe("1817–1862");
    expect(years("Sun Tzu")).toBe("c. 544–496 BC");
    expect(years("Zhuangzi")).toBe("c. 369–286 BC");
    expect(years("Seneca")).toBe("c. 4 BC – AD 65");
    expect(years("Epictetus")).toBe("c. 50–135");
    expect(years("Dalai Lama XIV")).toBe("1935–");
  });
});
