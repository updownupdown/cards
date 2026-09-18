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

  test("quotes fill the white, black and gold decks in order", () => {
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
    expect(getQuoteCard(157)).toBeUndefined();
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

  test("every Tao chapter and quote is awarded by exactly one node", () => {
    const rewards = NODE_DEFINITIONS.flatMap((node) =>
      node.rewards.map((reward) => `${reward.type}:${reward.id}`),
    );
    const expected = [
      ...Array.from(
        { length: TAO_CHAPTER_COUNT },
        (_, index) => `tao:${index + 1}`,
      ),
      ...Array.from(
        { length: QUOTE_COUNT },
        (_, index) => `quote:${index + 1}`,
      ),
    ];
    expect([...rewards].sort()).toEqual([...expected].sort());
  });
});
