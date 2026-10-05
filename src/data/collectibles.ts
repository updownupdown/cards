import { TAO_CHAPTERS } from "@/components/Campaign/TaoChapters";
import { quotes } from "@/components/Collectibles/QuotesText";

export const TAO_CHAPTER_COUNT = 81;
export const QUOTE_COUNT = 184;

export type TaoId = number;
export type QuoteId = number;

export type CollectibleReward =
  { type: "tao"; id: TaoId } | { type: "quote"; id: QuoteId };

export function getTaoChapter(id: TaoId) {
  return id >= 1 && id <= TAO_CHAPTER_COUNT ? TAO_CHAPTERS[id - 1] : undefined;
}

export function getQuote(id: QuoteId) {
  return id >= 1 && id <= QUOTE_COUNT ? quotes[id - 1] : undefined;
}

export function validateCollectibleCatalogs() {
  const errors: string[] = [];
  if (TAO_CHAPTERS.length !== TAO_CHAPTER_COUNT) {
    errors.push(
      `Expected ${TAO_CHAPTER_COUNT} Tao chapters, found ${TAO_CHAPTERS.length}.`,
    );
  }
  if (quotes.length !== QUOTE_COUNT) {
    errors.push(`Expected ${QUOTE_COUNT} quotes, found ${quotes.length}.`);
  }
  return errors;
}
