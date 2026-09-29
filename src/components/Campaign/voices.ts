import type { QuoteId } from "@/data/collectibles";
import { QUOTE_AUTHORS, QUOTE_IDS_BY_AUTHOR } from "@/data/quote-authors";

/** The quotes collection by period: the authors grouped by when they were
 * born. */

export type VoicesPeriod = {
  id: string;
  name: string;
  /** Born before this year (and on or after the previous period's). */
  until: number;
};

export const VOICES_PERIODS: VoicesPeriod[] = [
  { id: "ancients", name: "The Ancients", until: 1500 },
  { id: "early-modern", name: "The Early Moderns", until: 1800 },
  { id: "nineteenth", name: "The Nineteenth Century", until: 1870 },
  { id: "fin-de-siecle", name: "Fin de Siècle", until: 1900 },
  { id: "new-century", name: "The New Century", until: 1925 },
  { id: "mid-century", name: "Mid-Century", until: 1950 },
  { id: "contemporary", name: "Contemporaries", until: Infinity },
];

export type VoicesAuthor = {
  name: string;
  portrait: string;
  born: number;
  died: number | null;
  circa: boolean;
  quoteIds: QuoteId[];
  collectedIds: QuoteId[];
};

export type VoicesGroup = {
  period: VoicesPeriod;
  authors: VoicesAuthor[];
  /** Every collected quote in the period, oldest author first. */
  collected: QuoteId[];
  from: number;
  to: number | null;
};

export function voicesGroups(collected: ReadonlySet<QuoteId>): VoicesGroup[] {
  let from = -Infinity;
  return VOICES_PERIODS.map((period) => {
    const members = QUOTE_AUTHORS.filter(
      (author) => author.born >= from && author.born < period.until,
    ).sort((a, b) => a.born - b.born);
    from = period.until;
    const authors = members.map((author) => {
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
    const deaths = authors.map((author) => author.died);
    return {
      period,
      authors,
      collected: authors.flatMap((author) => author.collectedIds),
      from: Math.min(...authors.map((author) => author.born)),
      to: deaths.includes(null)
        ? null
        : Math.max(...deaths.map((died) => died ?? 0)),
    };
  }).filter((group) => group.authors.length > 0);
}

/** A year as it reads on a label: 563 BC, 1478. */
export function formatYear(year: number) {
  return year < 0 ? `${-year} BC` : String(year);
}

/** An author's years: 1803–1882, b. 1946, c. 551–479 BC. */
export function lifespan(author: {
  born: number;
  died: number | null;
  circa: boolean;
}) {
  const text =
    author.died === null
      ? `b. ${formatYear(author.born)}`
      : author.born < 0 && author.died < 0
        ? `${-author.born}–${-author.died} BC`
        : `${formatYear(author.born)}–${author.died}`;
  return author.circa ? `c. ${text}` : text;
}

/** The length of a portrait's line ("M x y L x y ..."), for drawing it. */
export function portraitLength(path: string) {
  const points = path
    .slice(1)
    .split("L")
    .map((pair) => pair.trim().split(/\s+/).map(Number));
  let length = 0;
  for (let index = 1; index < points.length; index += 1) {
    length += Math.hypot(
      points[index][0] - points[index - 1][0],
      points[index][1] - points[index - 1][1],
    );
  }
  return length;
}

/** Names that aren't shortened to their last word. */
const SHORT_NAMES: Record<string, string> = {
  "Sun Tzu": "Sun Tzu",
  "Li Bai": "Li Bai",
  "Marcus Aurelius": "Aurelius",
  "Michel de Montaigne": "Montaigne",
  "Vincent van Gogh": "Van Gogh",
  "José Ortega y Gasset": "Ortega y Gasset",
  "Antoine de Saint-Exupéry": "Saint-Exupéry",
  "Martin Luther King Jr.": "King",
  "Elizabeth II": "Elizabeth II",
  "Dalai Lama XIV": "Dalai Lama",
  "Thich Nhat Hanh": "Thich Nhat Hanh",
  "Bessel van der Kolk": "Van der Kolk",
  "Ursula K. Le Guin": "Le Guin",
};

/** Names kept as they are in an A–Z list: a title, not a surname, leads. */
const LISTED_AS_IS = new Set(["Dalai Lama XIV"]);

/**
 * An author as an A–Z list names them: last name first ("Tolstoy, Leo"), or
 * the name as it is when it has no given name to move (Laozi, Sun Tzu).
 */
export function listedName(name: string) {
  const last = shortName(name);
  if (last === name || LISTED_AS_IS.has(name)) return name;
  const given = name
    .replace(new RegExp(last.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), "")
    .replace(/\s+/g, " ")
    .trim();
  return given ? `${last}, ${given}` : last;
}

/** An author as the bar names them: usually their last name. */
export function shortName(name: string) {
  return SHORT_NAMES[name] ?? name.split(" ").at(-1) ?? name;
}
