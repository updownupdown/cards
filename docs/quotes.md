# Quotes: the reveal, the collection and the portraits

When a Campaign win earns a quote, the quote is revealed over the game, much as
a Tao chapter is; the Campaign tab's **Quotes** collection then shows every
author on one long line, with a one-line portrait for each author collected.

| Piece                                                       | Where                                                                                     |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| The quotes themselves (text, author, source)                | `src/components/Collectibles/QuotesText.ts`                                               |
| Authors: years of birth and death, and portrait (generated) | `src/data/quote-authors.generated.ts`, read through `src/data/quote-authors.ts`           |
| Portrait drawings (one Python file per author)              | `scripts/portraits/`                                                                      |
| The reveal                                                  | `src/components/QuoteReveal/QuoteReveal.tsx`, on `src/components/common/RewardReveal.tsx` |
| The quote's page (Gallery and reveal)                       | `src/components/Gallery/QuoteDetail.tsx`                                                  |
| Win-box announcement ("A quote by ...")                     | `src/components/Campaign/CampaignWinRewardPreview.tsx`                                    |
| The collection                                              | `src/components/Modals/QuotesCollectionModal.tsx`, `src/components/QuotesCollection/`     |
| Tests                                                       | `src/__tests__/quote-collectibles.test.ts`, `src/__tests__/quote-reveal.test.tsx`         |

## The reveal

`GameWrapper` mounts `QuoteReveal` when a Campaign win awards a quote, just as
it mounts `TaoReveal` for a chapter. Both sit on `RewardReveal`, which:

1. fades a backdrop in over the game. For a quote it is the game's own
   background redrawn with the game colour at 86%, so the board fades away
   (fading the game's own views instead would make every game's tree take
   part, and on Android overlapping cards show through each other while
   fading);
2. opens the collectible's page from the Gallery on it. For a quote that is
   `QuoteDetail`, the same component the Gallery shows, so a quote looks the
   same when it is earned and when it is read again;
3. keeps one button fixed at the bottom: a quiet **Skip** (the palette's night,
   its accent for the word) while the page is still animating, then the bright
   **Continue**. Either closes the reveal and gives the win box back. Nothing
   closes it by itself; the Android back button is swallowed.

The win box shows without its button row until the reveal has covered and
uncovered it (`actionsHidden`), so it has no gap where the buttons will be.

### The quote's page

`QuoteDetail` shows the author's portrait, name and years, then the quote (set
in Libre Baskerville) and its source:

- the quote and its source fade in whole (`QUOTE_FADE_MS`);
- a new author appears only after that (`AUTHOR_AT_MS`), so the words are read
  before the portrait draws the eye: the portrait's single line is drawn along
  its length (`PORTRAIT_DRAW_MS`) while the name and years fade in;
- in the Gallery, stepping to another quote by the same author changes the
  words alone; the author is not drawn again;
- it draws in the palette around it (`usePalette`): the app's colour theme in
  the Gallery, the game's own colours in the reveal, so the portrait's line is
  the theme's accent there and the game's accent here;
- the quote is shown translated when "translate collectibles" is on and a
  translation exists.

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
   portrait or if an author no longer has any quote.

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

The line is drawn straight from the exported path, so there is nothing else to
regenerate.

## To check on Android

- The portrait's line being drawn: one animated dash offset on one path.
- The Gallery's quote list and steppers, and that swipes don't fight the
  Android back gesture.
