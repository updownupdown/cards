# Quote picker (temporary)

A one-off page for choosing about 250 quotes out of 500 candidates. Delete
this folder once the quotes library has been updated.

- IDs 1–208 are the quotes in `src/components/Collectibles/QuotesText.ts`
  today, in the same order (same IDs as the app).
- IDs 209–500 are the new candidates in `candidates.mjs`, in order. Don't
  reorder or remove entries there until the chosen IDs have been applied, or
  the exported IDs will point at the wrong quotes.

`node scripts/quote-picker/build.mjs` rebuilds `index.html` from
`template.html`, `QuotesText.ts` and `candidates.mjs`. Open `index.html` in a
browser, or use the published copy.

On the page, "Export" gives the kept IDs as a comma-separated list. Chips
mark quotes that are new, whose author has no portrait yet ("Needs
portrait"), that repeat another current quote ("Like #…"), or that are only
attributed.

## Applying the chosen IDs (next session)

Given the list of kept IDs:

1. Build the new `QuotesText.ts` from the kept quotes (current quotes from
   `QuotesText.ts`, new ones from `candidates.mjs`).
2. Mind the ID rule in `docs/quotes.md`: players' collections store quote IDs
   (positions in the list), so decide how to keep existing collections
   meaningful before removing current quotes from the middle.
3. Follow `docs/quotes.md` for the rest: `QUOTE_COUNT`, campaign rewards,
   portraits for new authors, translations and tests.
