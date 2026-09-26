# Tao constellations: feasibility and plan

When a win earns a Tao chapter, the chapter is read out over a starfield. Its
letters then fly into a constellation that depicts the chapter. The collection
becomes a star map of the 81 constellations.

Implemented for Campaign wins: `src/components/TaoReveal/` (the reveal and a
still figure for the collection) and `src/data/tao-constellations.ts` (all 81
figures). In development builds the Tao modal opens every chapter and labels
each figure with its name and confidence, for review.

## Verdict per question

| Question | Verdict | Evidence |
| --- | --- | --- |
| Unique, recognisable constellation per chapter | Feasible. Hand-authored, not algorithmic | 5 authored (wheel, yin-yang, tree + sprout, archer, water scene); all read at a glance. Subjects for all 81 below |
| Type the text, morph letters into the figure, animate it | Feasible with Reanimated 4 alone | Demo runs 54-60 fps on web (dev build); one shared clock drives every letter on the UI thread |
| Integrate after the reward is earned | Small change | `WinLoseBox` got `actionsHidden`; the overlay swallows touches (tested: header taps during the reveal = 0); Android back / Escape skip in ~0.5 s |
| Star-map collection, organic 9x9, pan/zoom | Feasible; renderer choice matters | Variant D already shrinks the figure into its slot on a jittered 9x9 map |

## How the reveal works

1. **Measure**: the chapter is laid out invisibly with plain `Text` (one per
   letter, grouped in word rows that wrap), and the font shrinks until it fits.
   Each letter reports its position.
2. **Plan** (`timeline.ts`, pure and unit-tested): assigns every letter a role
   and a schedule:
   - *star*: one per constellation star, taken from the chapter's key line(s)
     in stroke order.
   - *dust*: a halo along the strokes, fill for nebula polygons, or open sky.
   - *caption*: variant C only; the key lines stay readable.
   It also plans flight curves (cubic Béziers), line pen timings, pulses and
   fades.
3. **Play**: one `useSharedValue` clock runs 0 → total on the UI thread. The
   letters are absolutely positioned where they were measured:
   - Dust letters are a single `Animated.Text` with one mapper.
   - Star letters use 3 mappers: the letter cross-fades into a glowing dot.
   - Lines are views scaled from their start point (`transformOrigin`).

   Letters mount 60 per frame while the starfield fades in, so the win doesn't
   stall.

Speed, skip and the demo's scrubbing all act on the one clock.

**Translations:** constellations point at *line indices*, not phrases. All 486
translated chapters (81 x 6 languages) keep the English line structure, so the
key lines and captions work in every language.

## Risks and mitigations

- **Low-end Android performance** (the main unknown). The demo mounts about
  450 animated letters, with about 530 mappers. Measure on a mid-range phone
  with a release build first. If it stutters, the fallback is
  `@shopify/react-native-skia`: one canvas that draws every glyph with a
  per-glyph transform (RSXform). It needs a native rebuild and about 3 MB of
  CanvasKit on web.
- **Duration**: letters at 35 per second; 0.4 s at a line break, 1 s when
  the line ends in punctuation, 2 s between paragraphs; 3 s rest, 10 s hold.
  Chapter 1 takes 56 s from the win to the buttons returning. The reveal can't
  be hurried by tapping; only the back button (Escape on web) leaves it.
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

- 15-40 stars with magnitudes, and strokes in pen order.
- Optional nebula polygons, weighted per figure (e.g. the yang half of 42).
- The key line(s) the image comes from.

Recognisability lessons from the demo:

- Geometric symbols and scenes read instantly.
- People and animals need an outline, not a stick-skeleton, and more stars.
- Negative space can carry meaning: the wheel's empty hub is "the center hole".
- A name caption (variant C) resolves the abstract ones.

## Subjects for all 81 chapters

Confidence: **A** the chapter names the image; **B** a symbol drawn from the
text; **C** an interpretive choice worth your review.

| Ch | Constellation | Drawn from | |
| --- | --- | --- | --- |
| 1 | The Gateway | "the hidden mystery ... this source is called darkness" | B |
| 2 | Sun and Moon | "being and non-being produce each other" | B |
| 3 | The Closed Chest | "do not display your treasures" | B |
| 4 | The Bottomless Well | "like an empty container ... infinitely deep" | A |
| 5 | The Bellows | "the space between Heaven and Earth is like a bellows" | A |
| 6 | The Valley Mist | "like a vapor, barely seen but always present" | B |
| 7 | Heaven over Earth | "the Tao of Heaven is eternal, and the earth is long enduring" | B |
| 8 | Water *(demo)* | "the supreme good is like water ... gathers in unpopular places" | A |
| 9 | The Brimming Cup | "an empty cup than one that is filled to the brim" | A |
| 10 | The Inner Eye | "while you cleanse your inner vision" | B |
| 11 | The Wheel *(demo)* | "it is the center hole that allows the wheel to function" | A |
| 12 | The Lute | "five notes deafen the ear" | B |
| 13 | The Ladder | "he who is superior is also someone's subordinate" | C |
| 14 | The Endless Thread | "follow it and there will be no end" | C |
| 15 | The Winter Crossing | "careful as someone crossing a frozen stream in winter" | A |
| 16 | The Ripple | "if you can empty your mind of all thoughts" | B |
| 17 | The Shepherd | "the best leaders are those the people hardly know exist" | C |
| 18 | The Mask | "when intellectualism arises, hypocrisy is close behind" | B |
| 19 | The Centre of the Circle | "keep us at the center of the circle" | A |
| 20 | The Drifting Boat | "I drift on the waves on the ocean" | A |
| 21 | The Seed | "secluded and dark, yet there is a vitality within it" | C |
| 22 | The Crescent Moon | "if you want to become full, first let yourself become empty" | B |
| 23 | The Passing Storm | "when the gale blows, it will not last long" | A |
| 24 | The One on Tiptoe | "those who stand on tiptoes do not stand firmly" | A |
| 25 | The Four Great Things | "Tao, Heaven, Earth, Humanity" | C |
| 26 | The Laden Wagon | "travels all day without ever leaving her wagon" | A |
| 27 | The Knot | "a good knot needs no rope and it can not come undone" | A |
| 28 | The Uncarved Block | "return you to the Uncarved Block" | A |
| 29 | The Sacred Vessel | "the world is sacred vessel" | A |
| 30 | The Bramble | "where armies march, thorns and briars bloom" | A |
| 31 | The Sheathed Sword | "weapons are the bearers of bad news" | A |
| 32 | Rivers to the Sea | "small streams and the largest rivers flow through valleys to the sea" | A |
| 33 | The Summit | "those who persist will reach their goal" | B |
| 34 | The Spring | "the great Tao flows unobstructed in every direction" | B |
| 35 | The Silent Flute | "where there is music ... there is nothing for them to hear" | B |
| 36 | The Hidden Fish | "fish remain hidden in deep waters" | A |
| 37 | Moon on Still Water | "the world would naturally settle into peace" | C |
| 38 | The Fruit and the Husk | "the master abides in the fruit and not in the husk" | A |
| 39 | The Common Stone | "do not shine like the precious gem, but be as dull as a common stone" | A |
| 40 | The Returning Swallow | "all movement returns to the Tao" | C |
| 41 | The Silent Bell | "the greatest sounds cannot be heard" | B |
| 42 | Yin and Yang *(demo)* | "all things carry Yin yet embrace Yang" | A |
| 43 | The Feather | "that which offers no resistance ... enter where there is no space" | C |
| 44 | The Hourglass | "knowing when to stop will keep you from danger" | B |
| 45 | The Crooked Staff | "the greatest straightness seems crooked" | B |
| 46 | The Free Horse | "horses run free to fertilize the fields" | A |
| 47 | The Window | "without looking out your window" | A |
| 48 | Falling Leaves | "unlearns something new every day ... less and less remains" | C |
| 49 | The Nest | "she treats them all as her children" | B |
| 50 | The Tiger | "walk safely among the wild animals" | B |
| 51 | Cupped Hands | "cares for them, nurtures them, gives them a place of refuge" | B |
| 52 | The Lamp | "use your inner light for understanding" | B |
| 53 | The Plough | "no one out working the fields" | B |
| 54 | The Well-Built House | "that which is well built will never be torn down" | A |
| 55 | The Newborn | "like a newborn child ... its grip is firm and strong" | A |
| 56 | The Silent Sage | "stop talking, meditate in silence" | A |
| 57 | The Open Palm | "I let go of all my desires" | C |
| 58 | Lotus in the Mud | "good fortune has its roots in disaster" | B |
| 59 | The Deep Root | "the deep root and the firm trunk" | A |
| 60 | The Small Fish | "governing a large country is like frying small fish" | A |
| 61 | The Bowing Figure | "a large country should take the low place" | B |
| 62 | The Temple | "the Tao is the tabernacle of creation ... a place of refuge" | A |
| 63 | The Cairn | "great projects are best started while they are small" | B |
| 64 | The Tree and the Sprout *(demo)* | "the tallest tree begins as a tiny sprout" | A |
| 65 | The Loom | "knowing the two alternatives is a pattern" | C |
| 66 | The Sea | "rivers and seas are rulers of the streams of hundreds of valleys" | A |
| 67 | The Three Jewels | "three jewels: compassion, moderation, and humility" | A |
| 68 | The Shield | "the best warriors do not use violence" | B |
| 69 | Steps Backward | "better to retreat a foot than to advance only an inch" | A |
| 70 | The Scroll | "my teachings come from the ancients" | B |
| 71 | The Healing Herb | "recognizing that you have an illness can you move to seek a cure" | C |
| 72 | The Mirror | "the Master knows herself but is not arrogant" | B |
| 73 | The Net of Heaven | "the nets of Heaven are wide, but nothing escapes" | A |
| 74 | The Axe | "trying to take the place of a great lumberjack" | A |
| 75 | The Open Cage | "only those who do not cling to their life can save it" | B |
| 76 | The Reed and the Broken Branch | "the soft and yielding will overcome" | A |
| 77 | The Archer *(demo)* | "like the drawing of a bow" | A |
| 78 | Water and Stone | "nothing is better than water for overcoming the hard" | A |
| 79 | The Balance | "the Tao does not choose sides" | B |
| 80 | The Rooster | "hear their roosters crowing and dogs barking" | A |
| 81 | The Sage on the Ox | Finale: Lao Tzu leaving through the western pass | C |

Tally: 39 A, 29 B, 13 C.
