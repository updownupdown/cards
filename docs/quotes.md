# Quotes: the reveal, the collection and the portraits

When a Campaign win earns a quote, the quote is revealed over the game, much as
a Tao chapter is; the Campaign tab's **Quotes** collection then shows every
author on one long line, with a one-line portrait for each author collected.

| Piece | Where |
| --- | --- |
| The quotes themselves (text, author, source) | `src/components/Collectibles/QuotesText.ts` |
| Authors: years of birth and death, and portrait (generated) | `src/data/quote-authors.generated.ts`, read through `src/data/quote-authors.ts` |
| Portrait drawings (one Python file per author) | `scripts/portraits/` |
| The reveal | `src/components/QuoteReveal/QuoteReveal.tsx` (timeline in `REVEAL_TIMES`) |
| Writing: the pen font, layout and timing | `src/components/QuoteReveal/pen-font.generated.ts`, `pen-text.ts` |
| Portrait harmonics (Fourier series) | `src/components/QuoteReveal/fourier.ts` |
| Win-box announcement ("A quote by ...") | `src/components/Campaign/CampaignWinRewardPreview.tsx` |
| The collection | `src/components/Modals/QuotesCollectionModal.tsx`, `src/components/QuotesCollection/` |
| Tests | `src/__tests__/quote-collectibles.test.ts`, `src/__tests__/quotes-collection.test.tsx` |

## The reveal

`GameWrapper` mounts `QuoteReveal` when a Campaign win awards a quote, just as
it mounts `TaoReveal` for a chapter. The reveal:

1. redraws the game's background over its UI, with the game colour at 85%, so
   the board fades away (fading the game's own views instead would make every
   game's tree take part, and on Android overlapping cards show through each
   other while fading);
2. writes the quote in a single-line hand (Oooh Baby), each letter fading in as
   it is written;
3. 2 s into the writing, resolves the author's portrait from a faint circle,
   over the rest of the writing (at least 3 s), fading in as it goes;
4. fades in the author's name, then the source (Outfit Light, 20 and 13 px);
5. holds for 3 s, then clears, and the win box's buttons come back.

It cannot be skipped; the Android back button is swallowed while it runs. The
quote is shown translated when "translate collectibles" is on and a translation
exists. All timings are in `REVEAL_TIMES`; the pen's pace in `PEN_SPEED` and
`PEN_MAX_MS` (a long quote is written faster rather than taking longer).

## The collection

Every author sits on one horizontal line, oldest first (by `born`). An author
with a quote collected shows their portrait in full; one with none yet shows one
of a few gently wavy lines (chosen by name, so it stays the same), keeping the
line unbroken. Each author's name, years and "collected/total" are always
shown.

There is no free panning or zooming. Swiping sideways moves between authors
(content follows the finger: swipe left for the next author); swiping up and
down moves through that author's collected quotes, shown under the portrait
(swipe up for the next quote, down for the previous, and past the first quote,
the portrait). The bar at the bottom does the same: previous author, previous
quote (or the portrait), next quote, next author. The author arrows always work
and wrap round the ends; the quote arrows dim at either end. To flip the swipe
directions, see `onEnd` in `QuoteGallery.tsx`.

## When the quotes change

**Adding, removing or replacing a quote** in `QuotesText.ts`:

1. Keep `QUOTE_COUNT` in `src/data/collectibles.ts` equal to the number of
   quotes. Quote IDs are positions in the list, and players' collections store
   IDs: to keep collections meaningful, replace quotes in place or append new
   ones rather than removing from the middle. When quotes do have to go (as
   when the list was cut to 170 hand-picked quotes), raise
   `CAMPAIGN_PROGRESS_VERSION` in `src/data/campaign-progress.ts` and migrate
   the saved IDs there, as version 3 does, and remap the campaign's rewards.
2. Campaign rewards: every quote is assigned to a game at random (see
   `docs/campaign-map.md`). New quotes stay unassigned until a new game takes
   them (`npm run campaign:generate`), or until the rewards are dealt again
   with `--rebalance-rewards`, which a locked map refuses.
3. Translations: changing a quote's English makes its translations stale (they
   show in English until translated again). Run `npm run i18n -- status`, then
   translate (`npm run i18n -- translate --lang fr --type quotes`, and so on).
4. Run the tests. `quote-collectibles.test.ts` fails if a quote's author has no
   portrait, if an author no longer has any quote, or if the pen font can't
   write a character of any quote in any language.

**A new author** needs a portrait and their years:

1. Draw them: copy a similar author's file in `scripts/portraits/` (for
   example `thoreau.py`) and combine parts from `parts.py` (hair, beards,
   glasses, collars...). The file's `draw()` returns the line's points.
2. Add them to `AUTHORS` in `scripts/portraits/export.py`: the module name, the
   name exactly as in `QuotesText.ts`, a year of birth (an estimate is fine;
   negative is BC; it decides their place on the line), a year of death
   (`None` while living) and a note. If the years are only known roughly, add
   the module to `CIRCA` ("c. 50–135").
3. Check the drawing: `python3 scripts/portraits/preview.py newauthor` writes
   `scripts/portraits/preview.png` (git-ignored); green marks where the line
   starts, red where it ends.
4. Run `python3 scripts/portraits/export.py`, which rewrites
   `src/data/quote-authors.generated.ts`.

Removing an author's last quote: remove them from `AUTHORS` (and their file)
and run the export again. Renaming an author: change the name in both
`QuotesText.ts` and `AUTHORS`.

## Changing a portrait

Edit its file in `scripts/portraits/`, preview it, and run
`python3 scripts/portraits/export.py`. Needs Python 3 and Pillow (for the
preview only). The rules, checked by the tests:

- one unbroken line, face on, in a 200 x 240 box;
- it starts at (4, 238), bottom left, and ends at (196, 238), bottom right, so
  portraits join into one line in the collection;
- points in `draw()` go through a smooth spline (`dsl.catmull`); repeat a point
  to make a corner. `face.py` and `parts.py` hold the shared features; most
  portraits are a few parts in the order described at the top of `parts.py`.

The harmonics in the reveal are computed from the drawing when the reveal
starts, so there is nothing else to regenerate.

## The pen font

The quote is written in a single-line font traced from
[Oooh Baby](https://fonts.google.com/specimen/Oooh+Baby) (SIL OFL,
`assets/pen-fonts/OFL.txt`). It covers ASCII, Latin-1 and Latin Extended-A,
so French, Spanish, Italian, Portuguese, Turkish, Indonesian and most other
Latin-script languages; letters the font lacks are composed from the base
letter and the accent at build time. Anything it still can't write is drawn as
"?", and the tests list it.

- `npm run pen-font:generate` turns `assets/pen-fonts/OoohBabyPen.svg` into
  `src/components/QuoteReveal/pen-font.generated.ts`. Run it after changing the
  character set or the composition rules in `scripts/generate-pen-font.mjs`.
- `OoohBabyPen.svg` itself is traced from
  `assets/pen-fonts/source/OoohBaby-Regular.ttf` by
  `scripts/skeletonize-pen-font.py` (see its header; it needs scikit-image,
  best in a throwaway virtual environment). Only needed to trace another font
  or retrace this one. Mind Reserved Font Names: an OFL font with one must not
  lend its name to the traced version.

## To check on Android

- Frame rate while writing: only the strokes being written are animated (a
  handful at a time); finished ones are plain paths.
- Frame rate while the portrait resolves: each frame rebuilds a 360-point line
  from up to 160 terms on the UI thread. If it stutters, lower
  `HARMONIC_POINTS` or `SERIES_TERMS` in `QuoteReveal.tsx`.
- The reveal computes the portrait's series when it starts (about 20 ms on a
  desktop); if that shows as a hitch on slow phones, the series can be
  precomputed by `scripts/portraits/export.py` instead.
- The collection draws all the portraits at once (137 of them; static paths).
- Swipes in the collection, and that they don't fight the Android back gesture.
