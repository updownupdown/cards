import {
  RANKS,
  SUITS,
  type CardSuit,
  type StandardRank,
} from "@/components/Cards/card-utils";
import { TAO_CHAPTERS } from "@/components/Nodes/TaoChapters";
import { QUOTES_COLLECTION } from "@/components/Nodes/QuotesCollection";

export const TAO_CHAPTER_COUNT = 81;
export const QUOTE_COUNT = 104;

export type TaoId = number;
export type QuoteId = number;

export type CollectibleReward =
  | { type: "tao"; id: TaoId }
  | { type: "quote"; id: QuoteId };

export type QuoteCard = {
  deck: "white" | "black";
  suit: CardSuit;
  rank: StandardRank;
};

export function getTaoChapter(id: TaoId) {
  return id >= 1 && id <= TAO_CHAPTER_COUNT ? TAO_CHAPTERS[id - 1] : undefined;
}

export function getQuote(id: QuoteId) {
  return id >= 1 && id <= QUOTE_COUNT ? QUOTES_COLLECTION[id - 1] : undefined;
}

export function getQuoteCard(id: QuoteId): QuoteCard | undefined {
  if (!Number.isInteger(id) || id < 1 || id > QUOTE_COUNT) return undefined;

  const zeroBasedId = id - 1;
  const cardIndex = zeroBasedId % 52;

  return {
    deck: zeroBasedId < 52 ? "white" : "black",
    suit: SUITS[Math.floor(cardIndex / RANKS.length)],
    rank: RANKS[cardIndex % RANKS.length],
  };
}

export function validateCollectibleCatalogs() {
  const errors: string[] = [];
  if (TAO_CHAPTERS.length !== TAO_CHAPTER_COUNT) {
    errors.push(
      `Expected ${TAO_CHAPTER_COUNT} Tao chapters, found ${TAO_CHAPTERS.length}.`,
    );
  }
  if (QUOTES_COLLECTION.length !== QUOTE_COUNT) {
    errors.push(
      `Expected ${QUOTE_COUNT} quotes, found ${QUOTES_COLLECTION.length}.`,
    );
  }
  return errors;
}
