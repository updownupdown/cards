# Tao constellations: feasibility and plan

When a win earns a Tao chapter, the chapter is read out over a starfield. Its
letters then fly into a constellation that depicts the chapter. The collection
becomes a star map of the 81 constellations.

Implemented for Campaign wins: `src/components/TaoReveal/` (the reveal and a
still figure for the collection) and `src/data/tao-constellations.ts` (all 81
figures). In development builds the Tao modal opens every chapter, for review.

## Verdict per question

| Question                                                 | Verdict                                  | Evidence                                                                                                                                         |
| -------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Unique, recognisable constellation per chapter           | Feasible. Hand-authored, not algorithmic | All 81 authored and reviewed; subjects below                                                                                                     |
| Type the text, morph letters into the figure, animate it | Feasible with Reanimated 4 alone         | Demo runs 54-60 fps on web (dev build); one shared clock drives every letter on the UI thread                                                    |
| Integrate after the reward is earned                     | Small change                             | `WinLoseBox` got `actionsHidden`; the overlay swallows touches (tested: header taps during the reveal = 0); Android back / Escape skip in ~0.5 s |
| Star-map collection, organic 9x9, pan/zoom               | Feasible; renderer choice matters        | Variant D already shrinks the figure into its slot on a jittered 9x9 map                                                                         |

## How the reveal works

The reveal after a Campaign win is the collection's chapter page
(`src/components/TaoCollection/TaoChapterDetail.tsx`) shown on the night sky
over the game (`src/components/TaoReveal/TaoReveal.tsx`, on the shared
`src/components/common/RewardReveal.tsx`), so a chapter looks the same when it
is earned and when it is read again in the Gallery:

1. **Sky**: the starfield fades in over the game (`REVEAL_TIMING.fadeInMs`),
   and the page opens on it a little before the fade ends.
2. **Figure**: the chapter's constellation forms (`ConstellationBloom.tsx`:
   dust, then the named stars in pen order, then the lines; 2 s, all CSS
   animations), and its name and number fade in. It stays as bright once
   drawn, its named stars slowly twinkling.
3. **Lines**: the chapter's lines fade in one at a time, whole
   (`ChapterText.tsx`, 750 ms each). A line appears when the reading reaches
   it: the reading pace (`scheduleReading` in `TaoReveal/timeline.ts`: 30
   letters a second, with pauses at commas, sentence ends, line ends and
   paragraphs) sped up by `LINE_PACE` (1.2), so a long line holds the reading
   longer than a short one. A chapter that fits the screen stays put; a
   longer one drifts up as the words start (no further than its own text
   needs, and at most until its title is at the top) and the page then
   follows the reading down.
4. **Hurrying**: the moment the reader scrolls for themselves, the page stops
   steering and every line not yet shown comes quickly, one after another
   (`HURRY_STEP_MS`). The Android back button is swallowed.
5. **The button**: the one thing the reveal adds to the page, fixed at the
   bottom from the moment the page opens. While the chapter is being read it
   is a quiet **Skip** (the theme's night, its accent for the word); once the
   last line is in it becomes the bright **Continue**. Either way, pressing
   it fades the sky out (`REVEAL_TIMING.fadeOutMs`) and gives the win box
   back. Pinned by `src/__tests__/tao-reveal-screen.test.tsx`.

**Translations:** constellations point at _line indices_, not phrases. All 486
translated chapters (81 x 6 languages) keep the English line structure, so the
key lines work in every language.

## Risks and mitigations

- **Low-end Android performance** (the main unknown). The demo mounts about
  450 animated letters, with about 530 mappers. Measure on a mid-range phone
  with a release build first. If it stutters, the fallback is
  `@shopify/react-native-skia`: one canvas that draws every glyph with a
  per-glyph transform (RSXform). It needs a native rebuild and about 3 MB of
  CanvasKit on web.
- **Duration**: letters at 30 per second; 0.45 s at a line break, 1 s when
  the line ends in punctuation, 2 s between paragraphs. A scroll hurries the
  rest in; the button (Skip, then Continue) is the only way out.
- **Starfield image**: preload `starfield.webp` when the win is detected. The
  sky now has an opaque base, so a slow image load can't reveal the game.
- **Web back button**: Escape is handled. The browser's back button would
  still leave the game unless the reveal pushes a history entry.
- **Reduced motion / screen readers**: with `useReducedMotion()`, show the
  finished constellation with the chapter text beneath. Announce the chapter
  text once.

## Integration (done)

- `GameWrapper` mounts `<TaoReveal>` when a Campaign win awards a Tao chapter,
  and passes `actionsHidden` to `WinLoseBox` until it finishes.
- The win box shows "NEW TAO CHAPTER" and "Chapter N" in place of the spinning
  token. Quote cards keep the token.
- `src/__tests__/tao-reveal.test.ts` checks all 81 figures (geometry, key
  phrases, every language) and the reading pace.

## Star map collection (later)

- Layout: a 9x9 grid, each slot jittered inside its cell (as in variant D).
  Locked chapters are faint single stars; collected ones draw their figure.
- Scale: 81 figures x (~30 stars + ~35 lines) is about 5,000 elements. That is
  too many animated views for smooth pinch-zoom, so either:
  - **Skia** (recommended): one canvas; pan/zoom is a single matrix from a
    gesture-handler pinch + pan, with thousands of points in a draw call; or
  - **SVG + level of detail**: dots when zoomed out, and figures mounted only
    for slots near the viewport.
- Tapping a constellation opens its chapter, with an option to replay the
  reveal.

## Authoring approach

Algorithmic generation (tracing icons or images) gives noisy, unrecognisable
star patterns, so each figure is authored as data:

- 10-40 stars with magnitudes, and strokes in pen order.
- Optional nebula polygons, weighted per figure (e.g. the dark half of a moon).
- The key line(s) the image comes from.

The figures were first drawn as clean shapes, chosen over three review rounds
(many from astrology and Chinese philosophy: zodiac signs, star groups, the
Five Elements, the Taijitu). They were then loosened slightly, with a small
tilt, bend and nudge per star, so that no line is exactly horizontal or
vertical, as in a real sky. The file stores the resulting coordinates.

Recognisability lessons from the demo:

- Geometric symbols and scenes read instantly.
- People and animals need an outline, not a stick-skeleton, and more stars.
- Negative space can carry meaning: the wheel's empty hub is "the center hole".
- A name caption (variant C) resolves the abstract ones.

## Subjects for all 81 chapters

| Ch  | Constellation                  | Key line                                                            |
| --- | ------------------------------ | ------------------------------------------------------------------- |
| 1   | The Gateway                    | "This source is called darkness."                                   |
| 2   | Gemini                         | "Being and non-being produce each other."                           |
| 3   | Taurus                         | "If you overvalue possessions,"                                     |
| 4   | The Bottomless Well            | "Infinitely deep, it is the source of all things."                  |
| 5   | Libra                          | "The Master doesn't take sides;"                                    |
| 6   | The Dandelion                  | "It is like a vapor,"                                               |
| 7   | The Candle                     | "They do not live for themselves;"                                  |
| 8   | The Water Drop                 | "The supreme good is like water,"                                   |
| 9   | The Empty Teacup               | "It is easier to carry an empty cup"                                |
| 10  | The Lotus                      | "Nurture the darkness of your soul"                                 |
| 11  | The Wheel                      | "but it is the center hole / that allows the wheel to function."    |
| 12  | The Closed Eye                 | "Five colors blind the eye."                                        |
| 13  | The Ouroboros                  | "and we are often our own worst enemy."                             |
| 14  | The Endless Thread             | "follow it and there will be no end."                               |
| 15  | The Snowflake                  | "as someone crossing a frozen stream in winter."                    |
| 16  | The Ripple                     | "If you can empty your mind of all thoughts"                        |
| 17  | Geese in Formation             | "we did it, all by ourselves!""                                     |
| 18  | The Cracked Vase               | "When the great Tao is abandoned,"                                  |
| 19  | The Single Flower              | "Desire little."                                                    |
| 20  | The Butterfly Dream            | "I am like a fool, my mind is in chaos."                            |
| 21  | The Nautilus                   | "Within it we can find order."                                      |
| 22  | The Crescent Moon              | "If you want to become full,"                                       |
| 23  | The Passing Storm              | "when the gale blows, it will not last long;"                       |
| 24  | The Peacock                    | "Those who boast of their accomplishments"                          |
| 25  | The Four Images                | "Within the universe, these are the four great things."             |
| 26  | The Pagoda                     | "Heaviness is the basis of lightness."                              |
| 27  | Teacher and Student            | "What is a good person but a bad person's teacher?"                 |
| 28  | The Uncarved Block             | "Uncarved Block."                                                   |
| 29  | The Peng and the Quail         | "Some are naturally big and strong,"                                |
| 30  | The Barren Tree                | "bad years must always follow."                                     |
| 31  | The Broken Arrow               | "and thus are avoided by the wise."                                 |
| 32  | Neptune                        | "flow through valleys to the sea."                                  |
| 33  | The Arrow in the Target        | "Those who persist will reach their goal."                          |
| 34  | The Spring                     | "The great Tao flows unobstructed in every direction."              |
| 35  | The Wind Chime                 | "When listen for, there is nothing for them to hear."               |
| 36  | The Koi under the Lily Pads    | "Just as fish remain hidden in deep waters,"                        |
| 37  | Moon on Still Water            | "the world would naturally settle into peace."                      |
| 38  | The Peach                      | "The master abides in the fruit and not in the husk."               |
| 39  | The Gem and the Stone          | "but be as dull as a common stone."                                 |
| 40  | The Returning Swallow          | "All movement returns to the Tao."                                  |
| 41  | The Owl                        | "The brightness of the Tao seems like darkness,"                    |
| 42  | The Triple Swirl               | "The Two gave birth to Three."                                      |
| 43  | The Feather                    | "That which offers no resistance,"                                  |
| 44  | The Hourglass                  | "and knowing when to stop will keep you from danger"                |
| 45  | Fire and Water                 | "Movement overcomes the cold,"                                      |
| 46  | The Free Horse                 | "horses run free to fertilize the fields."                          |
| 47  | The Armillary Sphere           | "you can know the whole world."                                     |
| 48  | The Setting Sun                | "Less and less remains until you arrive at non-action."             |
| 49  | The Nest                       | "Yet she treats them all as her children."                          |
| 50  | The Elephant                   | "walk safely among the wild animals."                               |
| 51  | The Hatching Chick             | "The Tao gives birth to all of creation."                           |
| 52  | The Magnifying Glass           | "To understand the small is called clarity."                        |
| 53  | The Plough                     | "because there is no one out working the fields."                   |
| 54  | The Well-Built House           | "That which is well built"                                          |
| 55  | The Cradle                     | "is like a newborn child."                                          |
| 56  | The Incense Stick              | "meditate in silence,"                                              |
| 57  | The Sky Lanterns               | "I let go of all my desires,"                                       |
| 58  | The Rainbow after the Storm    | "Good fortune has its roots in disaster,"                           |
| 59  | The Root and Trunk             | "This is spoken of as the deep root and the firm trunk,"            |
| 60  | Pisces                         | "Governing a large country"                                         |
| 61  | The Great and Little Dippers   | "If a large country takes the low position,"                        |
| 62  | The Purple Enclosure           | "The Tao is the tabernacle of creation,"                            |
| 63  | The Cairn                      | "Great projects are best started while they are small."             |
| 64  | The Tree and the Sprout        | "The tallest tree / begins as a tiny sprout."                       |
| 65  | The Loom                       | "Knowing the two alternatives is a pattern."                        |
| 66  | The Water Carrier              | "you must speak to them like you are their servant."                |
| 67  | The Trillium                   | "compassion, moderation, and humility."                             |
| 68  | The Quiet Camp                 | "do not destroy indiscriminately."                                  |
| 69  | The Crab                       | "It is better to retreat a foot"                                    |
| 70  | The Scroll                     | "My teachings come from the ancients,"                              |
| 71  | The Serpent Bearer             | "Thinking you know is a disease."                                   |
| 72  | The Mirror                     | "Therefore, the Master knows herself but is not arrogant."          |
| 73  | The Celestial Sphere           | "Who can understand the workings of Heaven?"                        |
| 74  | The Axe                        | "trying to take the place of a great lumberjack."                   |
| 75  | Falling Blossoms               | "Only those who do not cling to their life can save it."            |
| 76  | The Reed and the Broken Branch | "The soft and yielding will overcome."                              |
| 77  | The Archer                     | "The Tao of Heaven works in the world / like the drawing of a bow." |
| 78  | The Wave on the Cliff          | "for overcoming the hard and rigid,"                                |
| 79  | The Balance                    | "The Tao does not choose sides,"                                    |
| 80  | The Rooster                    | "that they can hear their roosters crowing and dogs barking,"       |
| 81  | The Ox                         | "The Tao of the Wise person acts by not competing."                 |
