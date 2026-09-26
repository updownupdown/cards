import type { QuoteId } from "@/data/collectibles";
import { QUOTE_AUTHORS, QUOTE_IDS_BY_AUTHOR } from "@/data/quote-authors";

/**
 * The quotes collection as a gallery: every author on one long line, oldest
 * first, and under the author in view, the quotes of theirs collected. This
 * file is the plain logic (who is where, where a step goes); QuoteGallery
 * draws it.
 */

export type GalleryAuthor = {
  name: string;
  portrait: string;
  born: number;
  died: number | null;
  circa: boolean;
  /** All of the author's quotes, and those collected, in QuotesText order. */
  quoteIds: QuoteId[];
  collectedIds: QuoteId[];
};

/** Where the view is: an author, and one of their collected quotes (or -1, the portrait). */
export type GalleryPosition = { author: number; quote: number };

export const PORTRAIT_FOCUS = -1;

export function galleryAuthors(
  collected: ReadonlySet<QuoteId>,
): GalleryAuthor[] {
  return QUOTE_AUTHORS.map((author) => {
    const quoteIds = QUOTE_IDS_BY_AUTHOR.get(author.name) ?? [];
    return {
      name: author.name,
      portrait: author.portrait,
      born: author.born,
      died: author.died,
      circa: author.circa,
      quoteIds,
      collectedIds: quoteIds.filter((id) => collected.has(id)),
    };
  });
}

/** The first author with a quote collected, on their portrait. */
export function firstPosition(authors: GalleryAuthor[]): GalleryPosition {
  const author = authors.findIndex((entry) => entry.collectedIds.length > 0);
  return { author: Math.max(0, author), quote: PORTRAIT_FOCUS };
}

/**
 * The previous or next author, round the ends, on their portrait. Authors
 * with nothing collected are stepped through too.
 */
export function stepAuthor(
  position: GalleryPosition,
  authors: GalleryAuthor[],
  direction: 1 | -1,
): GalleryPosition {
  const count = authors.length;
  return {
    author: (position.author + direction + count) % count,
    quote: PORTRAIT_FOCUS,
  };
}

/** Whether there is a quote (or the portrait) further up or down. */
export function canStepQuote(
  position: GalleryPosition,
  authors: GalleryAuthor[],
  direction: 1 | -1,
) {
  const collected = authors[position.author]?.collectedIds.length ?? 0;
  const next = position.quote + direction;
  return next >= PORTRAIT_FOCUS && next < collected;
}

/**
 * Down to the author's next collected quote, or up to the previous one (and
 * from the first, up to the portrait). Stays put at either end.
 */
export function stepQuote(
  position: GalleryPosition,
  authors: GalleryAuthor[],
  direction: 1 | -1,
): GalleryPosition {
  return canStepQuote(position, authors, direction)
    ? { ...position, quote: position.quote + direction }
    : position;
}

// --- Years ---------------------------------------------------------------------------

type Translate = (
  key: "quotes.yearsBC" | "quotes.yearsBCtoAD" | "quotes.circa",
  options: Record<string, string | number>,
) => string;

/**
 * An author's years, under their name: "1817–1862", "341–270 BC",
 * "c. 4 BC – AD 65", "1935–" while living.
 */
export function lifespan(
  author: Pick<GalleryAuthor, "born" | "died" | "circa">,
  t: Translate,
) {
  const { born, died, circa } = author;
  const years =
    died === null
      ? `${born}–`
      : died < 0
        ? t("quotes.yearsBC", { from: -born, to: -died })
        : born < 0
          ? t("quotes.yearsBCtoAD", { from: -born, to: died })
          : `${born}–${died}`;
  return circa ? t("quotes.circa", { years }) : years;
}

// --- Lines ---------------------------------------------------------------------------

/** Portraits are drawn in a box this size; the line runs along its bottom. */
export const CELL_BOX = { width: 200, height: 240 };
export const LINE_Y = 238;
/** Room drawn above and below the box, so no ink is cut off at its edges. */
export const CELL_BLEED = 24;

/**
 * The few gently wavy lines that stand in for an author with nothing
 * collected yet, keeping the line unbroken without hinting at a face. Each is
 * [half-waves, height] pairs, summed and pinned to the line at both ends.
 */
const PLACEHOLDER_WAVES: [number, number][][] = [
  [
    [3, 9],
    [7, 2],
  ],
  [
    [2, -12],
    [5, 3],
  ],
  [
    [4, 7],
    [9, -2],
  ],
  [
    [1, -16],
    [6, 3],
  ],
  [
    [5, -6],
    [2, 5],
  ],
];

/** Stable per author, so their line doesn't change between visits. */
function placeholderIndex(name: string) {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return Math.abs(hash) % PLACEHOLDER_WAVES.length;
}

export function placeholderLine(name: string) {
  const waves = PLACEHOLDER_WAVES[placeholderIndex(name)];
  const steps = 48;
  let d = `M0 ${LINE_Y}`;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    // Pinned at both ends, so it meets its neighbours on the line.
    const envelope = Math.sin(Math.PI * t);
    const lift = waves.reduce(
      (sum, [halfWaves, height]) =>
        sum + height * Math.sin(Math.PI * halfWaves * t),
      0,
    );
    d += `L${(t * CELL_BOX.width).toFixed(1)} ${(LINE_Y - lift * envelope).toFixed(1)}`;
  }
  return d;
}

/**
 * An author's stretch of the line, across the whole cell: in from the left
 * edge, their portrait once a quote of theirs is collected (else a
 * placeholder), and out to the right edge.
 */
export function cellLine(author: GalleryAuthor) {
  if (author.collectedIds.length === 0) return placeholderLine(author.name);
  return `M0 ${LINE_Y}L${author.portrait.slice(1)}L${CELL_BOX.width} ${LINE_Y}`;
}
