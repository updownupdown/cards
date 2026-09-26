import { quotes } from "@/components/Collectibles/QuotesText";
import type { QuoteId } from "./collectibles";
import { QUOTE_AUTHORS, type QuoteAuthor } from "./quote-authors.generated";

export { QUOTE_AUTHORS, type QuoteAuthor };

const BY_NAME = new Map(QUOTE_AUTHORS.map((author) => [author.name, author]));

/** An author (with their portrait) by name, as written in QuotesText.ts. */
export function getQuoteAuthor(name: string): QuoteAuthor | undefined {
  return BY_NAME.get(name);
}

/** Each author's quote IDs, in the order they appear in QuotesText.ts. */
export const QUOTE_IDS_BY_AUTHOR: ReadonlyMap<string, QuoteId[]> = (() => {
  const byAuthor = new Map<string, QuoteId[]>();
  quotes.forEach((quote, index) => {
    const ids = byAuthor.get(quote.author) ?? [];
    ids.push(index + 1);
    byAuthor.set(quote.author, ids);
  });
  return byAuthor;
})();
