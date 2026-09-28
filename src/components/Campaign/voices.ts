import type { QuoteId } from "@/data/collectibles";
import { QUOTE_AUTHORS, QUOTE_IDS_BY_AUTHOR } from "@/data/quote-authors";

/**
 * The quotes collection by period: the authors grouped by when they were
 * born, each period drawn as a constellation with one star per author.
 */

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
  /** The author's star in the period's constellation, on a 100 x 100 grid. */
  star: { x: number; y: number };
};

export type VoicesGroup = {
  period: VoicesPeriod;
  authors: VoicesAuthor[];
  /** Every collected quote in the period, oldest author first. */
  collected: QuoteId[];
  from: number;
  to: number | null;
};

function hashUnit(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 0xffffffff;
}

/**
 * The authors' stars: laid out along a loose winding path, oldest first, so
 * joined in order they read as a single figure.
 */
function placeStars(names: string[]) {
  const count = names.length;
  return names.map((name, index) => {
    const t = count <= 1 ? 0.5 : index / (count - 1);
    const angle = t * Math.PI * (1.2 + (count > 10 ? 1.4 : 0.6));
    const radius = 18 + t * 26;
    const jitter = (key: string) => (hashUnit(`${name}:${key}`) - 0.5) * 12;
    return {
      x: Math.max(6, Math.min(94, 50 + Math.cos(angle) * radius + jitter("x"))),
      y: Math.max(6, Math.min(94, 50 + Math.sin(angle) * radius * 0.85 + jitter("y"))),
    };
  });
}

export function voicesGroups(collected: ReadonlySet<QuoteId>): VoicesGroup[] {
  let from = -Infinity;
  return VOICES_PERIODS.map((period) => {
    const members = QUOTE_AUTHORS.filter(
      (author) => author.born >= from && author.born < period.until,
    ).sort((a, b) => a.born - b.born);
    from = period.until;
    const stars = placeStars(members.map((author) => author.name));
    const authors = members.map((author, index) => {
      const quoteIds = QUOTE_IDS_BY_AUTHOR.get(author.name) ?? [];
      return {
        name: author.name,
        portrait: author.portrait,
        born: author.born,
        died: author.died,
        circa: author.circa,
        quoteIds,
        collectedIds: quoteIds.filter((id) => collected.has(id)),
        star: stars[index],
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
