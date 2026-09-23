import {
  RANKS,
  SUITS,
  type CardSuit,
  type StandardRank,
} from "@/components/Cards/card-utils";
import { TAO_CHAPTERS } from "@/components/Nodes/TaoChapters";
import { quotes } from "@/components/Collectibles/QuotesText";

export const TAO_CHAPTER_COUNT = 81;
export const QUOTE_COUNT = 208;

export type TaoId = number;
export type QuoteId = number;

export type CollectibleReward =
  { type: "tao"; id: TaoId } | { type: "quote"; id: QuoteId };

export type QuoteDeck = "white" | "black" | "gold" | "red";

export type QuoteCard = {
  deck: QuoteDeck;
  suit: CardSuit;
  rank: StandardRank;
};

const DECK_SIZE = SUITS.length * RANKS.length;
const QUOTE_DECKS: QuoteDeck[] = ["white", "black", "gold", "red"];

export function getTaoChapter(id: TaoId) {
  return id >= 1 && id <= TAO_CHAPTER_COUNT ? TAO_CHAPTERS[id - 1] : undefined;
}

export function getQuote(id: QuoteId) {
  return id >= 1 && id <= QUOTE_COUNT ? quotes[id - 1] : undefined;
}

/**
 * Each quote is shown on a collectible card: IDs 1-52 are the white deck,
 * 53-104 the black deck, 105-156 the gold deck and 157-208 the red deck,
 * each from Ace to King in the suit order in card-utils.ts.
 */
export function getQuoteCard(id: QuoteId): QuoteCard | undefined {
  if (!Number.isInteger(id) || id < 1 || id > QUOTE_COUNT) return undefined;

  const zeroBasedId = id - 1;
  const cardIndex = zeroBasedId % DECK_SIZE;

  return {
    deck: QUOTE_DECKS[Math.floor(zeroBasedId / DECK_SIZE)],
    suit: SUITS[Math.floor(cardIndex / RANKS.length)],
    rank: RANKS[cardIndex % RANKS.length],
  };
}

/** Card image name, e.g. "QH". */
export function getQuoteCardName(card: QuoteCard) {
  return `${card.rank}${card.suit.charAt(0).toUpperCase()}`;
}

export function validateCollectibleCatalogs() {
  const errors: string[] = [];
  if (TAO_CHAPTERS.length !== TAO_CHAPTER_COUNT) {
    errors.push(
      `Expected ${TAO_CHAPTER_COUNT} Tao chapters, found ${TAO_CHAPTERS.length}.`,
    );
  }
  if (quotes.length !== QUOTE_COUNT) {
    errors.push(
      `Expected ${QUOTE_COUNT} quotes, found ${quotes.length}.`,
    );
  }
  return errors;
}
