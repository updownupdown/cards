import { describe, expect, test } from "@jest/globals";
import {
  getQuote,
  getQuoteCard,
  getQuoteCardName,
  QUOTE_COUNT,
  TAO_CHAPTER_COUNT,
  validateCollectibleCatalogs,
} from "@/data/collectibles";
import { NODE_DEFINITIONS } from "@/data/nodes-map.generated";

describe("Quote cards", () => {
  test("the catalogs match their counts", () => {
    expect(validateCollectibleCatalogs()).toEqual([]);
    expect(getQuote(QUOTE_COUNT)).toBeDefined();
    expect(getQuote(QUOTE_COUNT + 1)).toBeUndefined();
  });

  test("quotes fill the white, black, gold and red decks in order", () => {
    expect(getQuoteCard(1)).toEqual({
      deck: "white",
      suit: "hearts",
      rank: "A",
    });
    expect(getQuoteCard(52)).toEqual({
      deck: "white",
      suit: "spades",
      rank: "K",
    });
    expect(getQuoteCard(53)).toEqual({
      deck: "black",
      suit: "hearts",
      rank: "A",
    });
    expect(getQuoteCard(104)).toEqual({
      deck: "black",
      suit: "spades",
      rank: "K",
    });
    expect(getQuoteCard(105)).toEqual({
      deck: "gold",
      suit: "hearts",
      rank: "A",
    });
    expect(getQuoteCard(156)).toEqual({
      deck: "gold",
      suit: "spades",
      rank: "K",
    });
    expect(getQuoteCard(157)).toEqual({
      deck: "red",
      suit: "hearts",
      rank: "A",
    });
    expect(getQuoteCard(208)).toEqual({
      deck: "red",
      suit: "spades",
      rank: "K",
    });
    expect(getQuoteCard(209)).toBeUndefined();
    expect(getQuoteCardName(getQuoteCard(156)!)).toBe("KS");
  });

  test("every quote has its own card", () => {
    const names = new Set(
      Array.from({ length: QUOTE_COUNT }, (_, index) => {
        const card = getQuoteCard(index + 1)!;
        return `${card.deck}:${getQuoteCardName(card)}`;
      }),
    );
    expect(names.size).toBe(QUOTE_COUNT);
  });

  test("every Tao chapter is awarded by exactly one node", () => {
    const awarded = NODE_DEFINITIONS.flatMap((node) =>
      node.rewards
        .filter((reward) => reward.type === "tao")
        .map((reward) => reward.id),
    );
    const expected = Array.from(
      { length: TAO_CHAPTER_COUNT },
      (_, index) => index + 1,
    );
    expect([...awarded].sort((a, b) => a - b)).toEqual(expected);
  });

  /**
   * Quotes may be prepared ahead of the games that will award them, so the
   * catalog is allowed a tail of unawarded quotes. What must hold is that the
   * awarded ones are unique, in range, and taken in order from the front.
   */
  test("awarded quotes are unique and taken in order from the front", () => {
    const awarded = NODE_DEFINITIONS.flatMap((node) =>
      node.rewards
        .filter((reward) => reward.type === "quote")
        .map((reward) => reward.id),
    ).sort((a, b) => a - b);

    expect(new Set(awarded).size).toBe(awarded.length);
    expect(awarded).toEqual(
      Array.from({ length: awarded.length }, (_, index) => index + 1),
    );
    expect(awarded.length).toBeLessThanOrEqual(QUOTE_COUNT);
  });
});
