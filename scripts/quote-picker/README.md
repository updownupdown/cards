# Quote picker (temporary)

A page for choosing the final quotes (about 250). Delete this folder once the
quotes library has been updated.

Quote IDs never change meaning:

- 1–208: the quotes in `src/components/Collectibles/QuotesText.ts` today
  (same IDs as the app).
- 209–760: candidates from earlier rounds. Only the kept ones remain, in
  `shortlist.mjs`, with their IDs.
- 761–860: this round's candidates in `round4.mjs`, numbered in order from
  761. Don't reorder or remove entries there until the chosen IDs have been
  applied.

`shortlist.mjs` also lists which of the app's quotes (1–208) were kept. On the
page, everything in the shortlist starts as kept and this round starts
undecided.

`node scripts/quote-picker/build.mjs` rebuilds `index.html` from
`template.html`, `QuotesText.ts`, `shortlist.mjs` and `round4.mjs`.

On the page, "Export" gives the kept IDs as a comma-separated list. Chips
mark where a quote came from, authors with no portrait yet ("Needs
portrait"), and quotes that are only attributed.

## Building the final library (next session)

Given the final list of kept IDs:

1. Build the new `QuotesText.ts` from them: IDs 1–208 from `QuotesText.ts`,
   the rest from `shortlist.mjs` and `round4.mjs`.
2. Mind the ID rule in `docs/quotes.md`: players' collections store quote IDs
   (positions in the list), so decide how to keep existing collections
   meaningful before removing current quotes from the middle.
3. Follow `docs/quotes.md` for the rest: `QUOTE_COUNT`, campaign rewards,
   portraits for new authors, translations and tests.
