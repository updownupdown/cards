import { describe, expect, test } from "@jest/globals";
import {
  getQuote,
  QUOTE_COUNT,
  TAO_CHAPTER_COUNT,
  validateCollectibleCatalogs,
} from "@/data/collectibles";
import { GAME_DOT_DEFINITIONS } from "@/data/campaign-map.generated";

describe("Collectibles", () => {
  test("the catalogs match their counts", () => {
    expect(validateCollectibleCatalogs()).toEqual([]);
    expect(getQuote(QUOTE_COUNT)).toBeDefined();
    expect(getQuote(QUOTE_COUNT + 1)).toBeUndefined();
  });

  test("every Tao chapter is awarded by exactly one gameDot", () => {
    const awarded = GAME_DOT_DEFINITIONS.flatMap((gameDot) =>
      gameDot.rewards
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
    const awarded = GAME_DOT_DEFINITIONS.flatMap((gameDot) =>
      gameDot.rewards
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
