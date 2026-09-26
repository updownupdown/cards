# Traditional solitaire variants: overlap review

Reviewed 2026-09-26 from `src/data/games/*.ts` (rules text) and the engine configs in
`src/components/Games/` (`StockTableauSolitaire`, `YukonBoard`, `ReserveCellBoard`,
`FanSolitaire`, `SingleDeckSpider`, `WastePilesSolitaire`, `RowsSolitaire`, `CastleBoard`).
Where the rules text and the code disagree, the code wins.

Out of scope: original and modern designs (Modern Mechanics, Card Combat, Dungeon Crawler,
Puzzles, Sports other than Golf).

**Summary.** There are about 75 traditional games. Most of the overlap is in the three
stock-and-tableau families (Klondike, Yukon and Forty Thieves), which hold 24 games between them.

- **Congress and Diplomat are the same game in code.** Their configs are identical.
- Gargantua and Harp differ only in the number of redeals.
- Number Ten and Rank and File differ only in the number of face-down cards per column.
- The four Yukon games share one board and differ only in the build rule.
- Raglan, as implemented, is Klondike with the Aces already on the foundations and no redeal.

Merging the obvious duplicates would take roughly 10 games off the menu without losing any rule
set. Each merged game would become a named option of a "Variant" setting on the surviving game,
and its old name would stay searchable as an alias.

---

## 0. Recommended end state

The goal is to reproduce known games faithfully. Each variant that is kept is named after the
game it reproduces. When two games merge, the better-known one keeps the menu slot and the other
becomes a setting option under its own name. The first option listed is the default. This
section replaces the merge advice in §2 where they differ: Congress and Diplomat stay separate,
with Congress's deal fixed, and Raglan becomes King Albert. Implemented on 2026-09-26; the four new games are local-only until played.

| Game | Settings (default first) | Change needed |
|---|---|---|
| Klondike | Draw: 3 / 1 | — |
| Gargantua | Redeals: 1 (Gargantua) / 3 (Harp) | Absorbs Harp |
| Miss Milligan | Variant: Miss Milligan / Giant | New game |
| Thumb and Pouch | — | — |
| Whitehead | — | — |
| Westcliff | — | — |
| Easthaven | — | Switch to the published rules: build down by alternating colour (ours currently builds regardless of suit) |
| King Albert | Variant: King Albert / Raglan | Replaces the current Raglan. Rebuild to the real rules: 9 face-up staircase columns, single-card moves, alternating colour, and an open reserve (7 cards for King Albert; 6 cards with the Aces pre-placed for Raglan). Rename in code as well as in the UI: slug, route (`/king-albert`), component, variant keys, i18n keys, thumbnail and campaign-map entry |
| Canfield | Draw: 1 / 3 | — |
| Four Seasons | — | New game |
| Terrace | Variant: Terrace (also called Queen of Italy) / General's Patience / Blondes and Brunettes / Falling Star | New game. Queen of Italy turned out to be another name for Terrace, so the variants are the real Terrace family |
| Yukon | Build: Alternating colour (Yukon) / Same suit (Russian) / Suit up or down (Alaska) / Any other suit (Moosehide) | Absorbs Russian Solitaire, Alaska and Moosehide |
| Australian Patience | — | — |
| Forty Thieves | Variant: Forty Thieves / Josephine / Lucas / Busy Aces. Redeals: none / unlimited (the existing Hard/Easy setting) | Absorbs Josephine, Lucas and Busy Aces. Keep the Ace placeholder icons on empty foundations (as in FreeCell), but use the stock/waste placement from `StockTableauSolitaire` that the other three variants use |
| Maria | — | — |
| Indian | — | — |
| Diplomat | — | — |
| Congress | — | Fix the deal: 8 columns of 1 card each, around the foundations |
| Rank and File | Deal: 3 face-down (Rank and File) / 2 face-down (Number Ten) | Absorbs Number Ten. Number Ten rules: move the top card of any column or the waste, or a valid descending alternating-colour run as one unit; any card or valid run fills an empty column; uncovered face-down cards flip; draw 1 from the stock with no redeal |
| FreeCell | Build: Alternating colour (FreeCell) / Same suit (Baker's Game) | Absorbs Baker's Game, which moves onto `ReserveCellBoard` |
| Eight Off | — | — |
| Seahaven Towers | — | — |
| Penguin | — | — |
| Spider | Suits: 4 / 2 / 1 | New setting |
| Spiderette | — | — |
| Simple Simon | — | — |
| Scorpion | Variant: Scorpion / Wasp (any card fills an empty column) | New setting |
| Beleaguered Castle | — | — |
| Fortress | — | — |
| Bisley | — | — |
| Baker's Dozen | — | — |
| Crescent | — | — |
| Cruel | — | — |
| La Belle Lucie | Variant: La Belle Lucie / Trefoil (Aces pre-placed) / Shamrocks | Absorbs Shamrocks; Trefoil is a new option |
| Flower Garden | — | — |
| Bristol | — | New game |
| Sir Tommy | Variant: Sir Tommy / Puss in the Corner | Absorbs Puss in the Corner; Sir Tommy moves onto `WastePilesSolitaire` |
| Frog | — | — |
| Calculation | — | — |
| Grandfather's Clock | — | — |
| Clock Solitaire | — | — |
| Labyrinth | — | — |
| Parallels | — | — |
| Carpet | — | — |
| Royal Cotillion | — | — |
| Sultan | — | — |
| Windmill | — | — |
| Queen's Audience | — | — |
| Crazy Quilt | — | — |
| Sly Fox | — | — |
| Devil's Grip | — | — |
| Black Hole | Variant: Black Hole / All in a Row | Renames Singularity to Black Hole and absorbs All in a Row. Black Hole starts with the A♠ on the foundation. Add landscape support so the All in a Row variant can use its 13 × 4 layout |
| Golf | Difficulty: Hard / Easy (existing) | — |
| Three Peaks | — | — |
| Pyramid | Difficulty (existing) | — |
| Baroness | Difficulty (existing) | — |
| Nestor | — | — |
| Monte Carlo | — | — |
| Accordion | — | — |
| Aces Up | — | — |
| Ten Twenty Thirty | — | — |
| Gaps | Redeals: 3 / 2 (existing) | — |
| Beehive | — | — |
| Poker Squares | — | — |
| Cribbage Squares | — | — |

That is 65 games, down from 73. Twelve games are absorbed: Harp, Russian Solitaire, Alaska,
Moosehide, Josephine, Lucas, Busy Aces, Number Ten, Baker's Game, Shamrocks, Puss in the Corner
and All in a Row. Four new games are added: Miss Milligan, Four Seasons, Terrace and Bristol.
Build the new games one at a time, starting as `enabledOnLocalOnly`.

---

## 1. Rule-variant tables

Legend:
- **Build:** Alt = alternating colour, Suit = same suit, Colour = same colour,
  Not-suit = any suit except its own, Any = regardless of suit, ± = one rank up or down.
- **Moves:** Single = one card at a time, Runs = correctly built runs, Suited runs = only
  same-suit runs, Tail = any face-up card with everything on top of it, Supermove = runs
  limited by free cells and empty columns.
- **Empty:** which cards may fill an empty column. K = Kings only, Blocked = never refilled.

### 1a. Klondike family and Canfield (stock and waste, face-down cards)

| Game | Decks | Tableau deal | Face-down | Build | Moves | Empty | Stock | Redeals | Other |
|---|---|---|---|---|---|---|---|---|---|
| Klondike | 1 | 7, staircase 1–7 | Yes | Alt | Runs | K | Draw 1 or 3 (setting) | Unlimited | |
| **Raglan** | 1 | 7, staircase 1–7 | Yes | Alt | Runs | K | Draw 1 | None | Aces start on foundations |
| Thumb and Pouch | 1 | 7, staircase 1–7 | Yes | Not-suit | Runs | Any | Draw 1 | None | |
| Whitehead | 1 | 7, staircase 1–7 | No | Colour | Suited runs | Any | Draw 1 | None | |
| Westcliff | 1 | 10 × 3 | 2 per column | Alt | Runs | Any | Draw 1 | None | |
| Easthaven | 1 | 7 × 3 | 2 per column | Any | Suited runs | K | Deals one card onto each column | n/a | |
| **Gargantua** | 2 | 9, staircase 1–9 | Yes | Alt | Runs | K | Draw 1 | 1 | |
| **Harp** | 2 | 9, staircase 1–9 | Yes | Alt | Runs | K | Draw 1 | 3 | |
| Canfield | 1 | 4 × 1 | No | Alt, wrapping | Runs | From reserve | Draw 1 or 3 (setting) | Unlimited | 13-card reserve; random foundation base |

### 1b. Yukon family (move any face-up tail)

| Game | Decks | Tableau deal | Face-down | Build | Moves | Empty | Stock |
|---|---|---|---|---|---|---|---|
| **Yukon** | 1 | 7, Yukon deal | Yes | Alt | Tail | K | None |
| **Russian Solitaire** | 1 | 7, Yukon deal | Yes | Suit | Tail | K | None |
| **Alaska** | 1 | 7, Yukon deal | Yes | Suit ± | Tail | K | None |
| **Moosehide** | 1 | 7, Yukon deal | Yes | Not-suit | Tail | K | None |
| Australian Patience | 1 | 7 × 4 | No | Suit | Tail | K | Draw 1, no redeal |

All four Yukon games are `YukonBoard` with a different `canStack` function.

### 1c. Forty Thieves family (2 decks, 8 foundations, draw 1)

| Game | Tableau deal | Face-down | Build | Moves | Empty | Redeals | Other |
|---|---|---|---|---|---|---|---|
| Forty Thieves | 10 × 4 | No | Suit | Single | Any | Unlimited (Easy) or none (Hard) | |
| **Josephine** | 10 × 4 | No | Suit | Suited runs | Any | None | |
| Lucas | 13 × 3 | No | Suit | Single | Any | None | Aces start on foundations |
| Busy Aces | 12 × 2 | 1 per column | Suit | Single | Any | None | |
| Indian | 10 × 3 | 1 per column | Not-suit | Single | Any | None | |
| Maria | 9 × 4 | No | Alt | Single | Any | None | |
| **Diplomat** | 8 × 4 | No | Any | Single | Any | None | |
| **Congress** | 8 × 4 | No | Any | Single | Any | None | **Config identical to Diplomat** |
| **Number Ten** | 10 × 4 | 2 per column | Alt | Runs | Any | None | |
| **Rank and File** | 10 × 4 | 3 per column | Alt | Runs | Any | None | |

### 1d. FreeCell family (1 deck, all cards face up, no stock)

| Game | Tableau deal | Cells | Build | Moves | Empty | Other |
|---|---|---|---|---|---|---|
| **FreeCell** | 8 (7,7,7,7,6,6,6,6) | 4, empty | Alt | Supermove | Any | |
| **Baker's Game** | 8 (7,7,7,7,6,6,6,6) | 4, empty | Suit | Supermove | Any | Separate 883-line copy of the board |
| Eight Off | 8 × 6 | 8, 4 of them filled | Suit | Supermove | K | |
| Seahaven Towers | 10 × 5 | 4, 2 of them filled | Suit | Supermove | K | |
| Penguin | 7 × 7 | 7, empty | Suit, wrapping | Supermove | Rank below the beak | Foundations start at a random "beak" rank |

### 1e. Spider family (build down in any suit, but only suited runs move, unless noted)

| Game | Decks | Tableau deal | Face-down | Empty | Stock | Other |
|---|---|---|---|---|---|---|
| Spider | 2 | 10 columns, 54 cards | Yes | Any | 5 deals of one card per column | Always 4 suits; there is no suit-count setting |
| Spiderette | 1 | 7, staircase 1–7 | Yes | Any | Deals of one card per column | |
| Simple Simon | 1 | 10 (8,8,8,7…1) | No | Any | None | |
| Scorpion | 1 | 7 × 7 | 3 in each of 4 columns | K | 3 cards, dealt once | Builds by suit; moves any tail (a Yukon/Spider hybrid) |

### 1f. Castles and fans (open deal, single-card moves, no stock)

| Game | Decks | Tableau deal | Build | Empty | Redeals | Other |
|---|---|---|---|---|---|---|
| Beleaguered Castle | 1 | 8 × 6 | Any | Any | None | Aces start on foundations |
| Fortress | 1 | 10 (6,6,5…) | Suit ± | Any | None | |
| Bisley | 1 | 13 (3,3,3,3,4…) | Suit ± | Blocked | None | Ace-up and King-down foundations |
| Baker's Dozen | 1 | 13 × 4 | Any | Blocked | None | Kings moved to the bottom of their columns |
| Crescent | 2 | 16 × 6 | Suit ±, wrapping | Blocked | 3 restacks | Ace-up and King-down foundations |
| Cruel | 1 | 12 × 4 | Suit | Blocked | Unlimited, in order | Aces start on foundations |
| **La Belle Lucie** | 1 | 18 fans of 3 | Suit | Blocked | 2 shuffles | |
| **Shamrocks** | 1 | 18 fans of 3 | Any ± | Blocked | None | At most 3 cards per fan |
| Flower Garden | 1 | 6 × 6 + 16 open reserve | Any | Any | None | |

### 1g. Other traditional games (no tableau building, or a different core mechanic)

| Game | Decks | Core mechanic | Nearest sibling in the app |
|---|---|---|---|
| **Sir Tommy** | 1 | 4 waste piles; foundations regardless of suit; no redeal | Puss in the Corner |
| **Puss in the Corner** | 1 | 4 waste piles; foundations by colour; Aces start; 1 redeal | Sir Tommy |
| Frog | 2 | 5 waste piles + 13-card reserve; foundations regardless of suit | Sir Tommy |
| Calculation | 1 | 4 waste piles; foundations count up by 1, 2, 3 and 4 | Sir Tommy |
| **Singularity** (this is Black Hole) | 1 | 17 fans of 3; one foundation, ±1 with wrap | All in a Row |
| **All in a Row** | 1 | 13 × 4 open; one foundation, ±1 with wrap, any starting card | Singularity |
| Golf | 1 | 7 × 5 + stock; ±1 without wrap (Easy mode wraps A–K) | Three Peaks |
| Three Peaks | 1 | TriPeaks layout + stock; ±1 with wrap | Golf |
| Pyramid | 1 | Pairs that total 13; pyramid + stock | Baroness |
| Baroness | 1 | Pairs that total 13; 5 piles fed from the stock | Pyramid |
| Nestor | 1 | Same-rank pairs from column bottoms + reserve | Monte Carlo |
| Monte Carlo | 1 | Adjacent same-rank pairs on a grid; consolidate | Nestor |
| Accordion, Aces Up, Ten Twenty Thirty, Gaps, Beehive, Clock | 1 | Each has its own mechanic | — |
| **Labyrinth** | 1 | Rows of 8; a card is free when above or below is empty | Parallels |
| **Parallels** | 2 | Same as Labyrinth; Ace-up and King-down foundations | Labyrinth |
| Carpet | 1 | 20-card open grid refilled from the waste | Refill-from-waste cluster (see §2, tier 3) |
| Royal Cotillion | 2 | Foundations count up by twos; open reserve refilled from the waste | Refill-from-waste cluster |
| Sultan | 2 | Foundations start on Kings around the K♥; 8 reserve spaces; 2 redeals | Refill-from-waste cluster |
| Windmill | 2 | Centre foundation built up four times; corners built down | Refill-from-waste cluster |
| Queen's Audience | 1 | Pair K+Q and J+A; foundations built down from the Jack | Refill-from-waste cluster |
| Grandfather's Clock | 1 | Clock-face foundations, each ending on its hour | — |
| Crazy Quilt | 2 | Woven quilt; the waste builds ± by suit | — |
| Sly Fox | 2 | 20 reserve piles fed 20 cards at a time | — |
| Devil's Grip | 2 | 3 × 8 grid of 2-5-8-J, 3-6-9-Q and 4-7-10-K stacks | — |
| Poker Squares, Cribbage Squares | 1 | Place cards on a grid to score hands | — |

---

## 2. Too-similar variants

**Tier 1: effectively the same game. Merge or remove.**

1. **Congress = Diplomat.** Their `StockTableauSolitaire` configs are byte-for-byte identical.
   Real Congress deals only one card to each of 8 columns, arranged in two groups around the
   foundations. That would make it slightly different, but it would still be Diplomat with a
   thinner deal. Recommendation: remove Congress, or make it a "Deal: 4 per column / 1 per
   column" setting on Diplomat.
2. **Gargantua ≈ Harp.** Everything is the same except redeals (1 vs 3). Recommendation: keep
   one "Double Klondike" with a "Stock passes: 2 / 4" setting.
3. **Number Ten ≈ Rank and File.** Same columns, build and moves; the only difference is 2 vs 3
   face-down cards per column. Recommendation: keep one.
4. **Raglan (as implemented) ≈ Klondike.** It plays like Klondike with the Aces pre-placed, draw 1
   and no redeal. Real Raglan is a King Albert variant: 9 columns dealt face up, a 6-card
   reserve, and single-card moves. Recommendation: either rebuild it to the real rules (this
   would add a family the app lacks, see §4) or remove it.

**Tier 2: same engine, and only one rule changes.**

5. **Yukon / Russian / Alaska / Moosehide.** Only the build rule differs. These would make a
   natural **Yukon** game with a "Build" setting: Alternating colour (Yukon), Same suit
   (Russian), Suit up or down (Alaska), Any other suit (Moosehide). Australian Patience stays
   separate because it has a stock and a face-up deal.
6. **FreeCell / Baker's Game.** Only the build rule differs. Baker's Game is also a separate
   883-line copy of the board, so merging would remove duplicated code as well. Suggested
   settings on **FreeCell**: "Build: Alternating colour / Same suit (Baker's Game)", plus
   optionally "Free cells: 4 / 3 / 2" for difficulty.
7. **Forty Thieves / Josephine.** Josephine is Forty Thieves with suited runs allowed to move
   together. Add a "Move suited runs" toggle to Forty Thieves.
8. **Sir Tommy / Puss in the Corner.** The only differences are the foundation rule (any suit vs
   by colour) and one redeal. Sir Tommy is a standalone component, while Puss already runs on
   `WastePilesSolitaire`, so Sir Tommy could become a third config there. (The note in
   `game-suggestions-distinct` already records that Puss and Frog were suggested even though
   they are close to Sir Tommy.)
9. **Singularity (Black Hole) / All in a Row.** Both have a single foundation built ±1 with wrap
   and every pile open; only the layout differs (17 fans of 3 vs 13 columns of 4). These are
   sister games in the literature too. Keep one; the other could be a "Layout" setting.

**Tier 3: related, but worth keeping.**

- **La Belle Lucie / Shamrocks.** Same fan engine with different build rules. Shamrocks is the
  weaker, less-known one and could become a Lucie variant option.
- **Labyrinth / Parallels.** Parallels is the 2-deck, two-way version of the same engine.
  Possible to merge, but low priority.
- **Pyramid / Baroness** and **Golf / Three Peaks.** The mechanic is shared, but the layouts
  make them play differently, and all four are well-known names. Keep.
- **Refill-from-waste cluster** (Carpet, Royal Cotillion, Sultan, Windmill, Queen's Audience):
  five games with an open grid refilled from the waste and no tableau building. Each has its
  own foundation twist, so none is a duplicate, but avoid adding more of this type.
- **Klondike-shape crowding.** Thumb and Pouch, Whitehead, Westcliff and Easthaven each change
  one or two Klondike rules. They are genuinely different, but together with Klondike, Raglan,
  Gargantua and Harp there are 8 Klondike-shaped games. If more trimming is wanted, a
  "Klondike variants" picker (Klondike / Whitehead / Thumb and Pouch / Westcliff) would be the
  next candidate.
- **Forty Thieves crowding.** Even after merging Josephine, Congress and Number Ten, the family
  would have 7 games: Forty Thieves, Lucas, Busy Aces, Indian, Maria, Diplomat, and Rank and
  File. Lucas and Busy Aces differ from Forty Thieves only in the deal shape. They are the
  next candidates for a Forty Thieves "Variant" option list, leaving Maria (alternating
  colour), Indian (any other suit) and Diplomat (any suit) as the build-rule siblings.

**Net effect.** Merging tier 1 and tier 2 takes about 10 entries off the menu: Congress, Harp,
Number Ten, Raglan, Russian Solitaire, Alaska, Moosehide, Baker's Game, Josephine, and either
Puss in the Corner or All in a Row. No rule set is lost.

---

## 3. How a merge could work

- **A "Variant" setting with named options.** For example, the Yukon setting would read
  "Variant: Yukon / Russian / Alaska / Moosehide", with `applyBehavior: "next-game"`. This keeps
  the classic names visible. It matches the existing pattern in `game-settings.ts` (Klondike
  and Canfield `drawCount`, Forty Thieves `difficulty`).
- **Aliases for search.** Add the merged names to `aliases` on the surviving game, so that
  searching "Russian Solitaire" still finds it.
- **Engines already support most merges.** The Yukon, StockTableau, WastePiles, Fan and Rows
  merges only need the variant to be read from settings instead of from the route.
  FreeCell/Baker's Game needs Baker's Game to move onto `ReserveCellBoard`, which is also a
  code-health win.
- **Costs to plan for:**
  - Stats and best times are stored per game path, so decide whether to split them by variant
    or pool them, and migrate or archive the old paths' stats.
  - The campaign map (`campaign-map.generated.ts`) includes every one of these paths, so the
    map needs regenerating, and the removed nodes' collectibles need a new home.
  - Every merge candidate has a custom thumbnail. These are lost, or could be reused as
    variant art.
  - Locale strings in 7 languages need updating (write the English first, per the usual rule).
  - Tests that import the removed games' rules objects need updating.

---

## 4. Known traditional games not covered yet

These were checked against the current catalogue and against the removed-game history (Streets
and Alleys, Salic Law, Trick Klondike and Marsh were built and removed). Games that would only
be a setting on an existing game are listed separately at the end.

### Candidates for new games

| Game | Decks | What makes it distinct | Known variants | Closest game here |
|---|---|---|---|---|
| **Miss Milligan** | 2 | Starts with only 8 cards. The stock deals one card onto every column (Spider-style) while you build Klondike-style (alternating colour, Kings to empty columns). Once the stock is out, you may "waive" (lift out) one card temporarily. | Giant (any card fills a gap), Imperial Guards, Milligan Cell (adds a free cell) | Easthaven (the single-deck row-deal game); check that they feel different |
| **King Albert** | 1 | 9 columns dealt face up, plus a 7-card open reserve that can't be refilled; alternating colour, single-card moves. It plays like FreeCell with a stock of spare cards instead of cells. | Raglan (Aces pre-placed, 6-card reserve), Queen Victoria, Brigade | Raglan (as implemented), which it would replace |
| **Four Seasons** (Corner Card, Vanishing Cross) | 1 | A 5-card cross; the first corner card sets the base rank for all foundations; builds down in any suit with wrap; one pass through the stock. Small and quick. | Czarina | Canfield (random base), but much simpler |
| **Terrace** (Queen of Italy) | 2 | You choose the foundation base from 4 dealt cards; an 11-card terrace reserve where only the top card plays; foundations built by alternating colour. | General's Patience, Falling Star, Blondes and Brunettes, Signora | None |
| **Bristol** | 1 | 8 fans of 3; the stock deals 3 cards at a time, one onto each of 3 reserve piles; builds down in any suit. | Dover (2 decks), Belvedere, New York | Sly Fox, loosely (a reserve fed from the stock) |
| **Stalactites** | 1 | No tableau building. You choose whether foundations build up or down, and by one or two ranks; up to 2 holding cells. | Setting options (step, number of cells) | None |
| **St Helena** (Napoleon's Favourite) | 2 | Ace-up and King-down foundations framed by 12 piles; in the first pass a pile can play only to the foundations next to it; 2 redeals. | Louis, Box Kite | Bisley and Crescent (dual foundations) |
| **Agnes Sorel / Agnes Bernauer** | 1 | Klondike shape, but the foundation base is the first card dealt, and the stock deals a row onto the tableau (Sorel) or refills a 7-card reserve (Bernauer). | — | Easthaven + Canfield, so medium overlap |
| **Martha** | 1 | 12 columns of 4 dealt alternately face down and face up; Aces start on foundations; builds by alternating colour. | Stonewall (which is closer to Flower Garden) | Baker's Dozen and Beleaguered Castle, so medium overlap |
| **Eagle Wing** | 1 | A 13-card "trunk" reserve feeding 8 wings; random foundation base. | Thirteen Up (Storehouse) | Canfield, so high overlap |

My pick, in order: **Miss Milligan** (already on the TODO list, well known, and plays
differently from anything here), **King Albert** (would also fix the misnamed Raglan), **Four
Seasons**, **Terrace**, then **Bristol**. The last three rows overlap enough with existing games
that they are probably not worth doing.

### Better as settings on existing games

| Variant | Add to | Setting |
|---|---|---|
| Spider, 1 suit and 2 suits | Spider | "Suits: 1 / 2 / 4". This is the most-expected missing option in the catalogue; every major Spider app has it. |
| Thoughtful / Saratoga (all cards face up) | Klondike | "Deal face up" toggle |
| Double FreeCell, Relaxed FreeCell, fewer-cell FreeCell | FreeCell | "Free cells" count |
| Wasp, Three Blind Mice | Scorpion | "Any card fills an empty column" toggle (Wasp) |
| Superior Canfield, Rainbow, Storehouse | Canfield | Reserve face up; no build restriction |
| Mrs. Mop (2-deck Simple Simon) | Simple Simon | Probably not worth it on a phone screen (13 columns) |
| Trefoil (La Belle Lucie with Aces pre-placed) | La Belle Lucie | Easy option |
| Elevens, Block Ten, Fourteen Out | Baroness or Pyramid | Target sum. These are all close to the existing pairing games, so a setting at most. |
| Citadel | Beleaguered Castle | Cards go straight to the foundations during the deal |
