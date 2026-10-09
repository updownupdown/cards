# Campaign Map

The Campaign home tab is a progression mode layered over the existing game catalog. Normal attempts, wins, losses, and scores remain global. Unlocks and collectibles change only when a game is launched with `mode=campaign` (or the old `mode=nodes`).

## Authored graph

`src/data/campaign-map.generated.ts` holds every game's node: its position, its links and its rewards. Coordinates are normalized around `(0, 0)`, where Klondike must remain. Connections are undirected and must appear in both nodes' `connections` arrays.

Every released game has a node. Local-only games (`enabledOnLocalOnly`) have none and hold no reward, so they can be added, tried out and removed without touching the map or players' progress; a win in one of them records no campaign progress. When one is released (its flag dropped), a plain run adds its node at the rim like any new game.

## Layout

`npm run campaign:generate -- --rebuild` lays out the whole map:

1. Positions come from the galaxy's shape alone (the `GALAXY` parameters): a round bulge, then four spiral arms, with field stars between them. Links follow: each arm chained outwards, then short bridges between arms, then whatever repairs keep every game reachable.
2. Games are then fitted to those positions by simulated annealing (the `PLACEMENT` parameters), seeded so every rebuild is identical:
   - Klondike at the centre, and the rest outwards by progression score: 75% difficulty and 25% complexity, so the first games are easy both to win and to learn. Luck is not counted separately, since difficulty already rates how rarely a game is won.
   - No game is the only way through to an easier one (by difficulty): a hard game may only gate games at least as hard.
   - Linked games of the same category cost more the nearer they are to the centre, and among the games within two steps of Klondike each category appears once, so the first games a player meets are all different.

## Reward policy

- Every game has two or three rewards: a Tao chapter and one or two quotes, or two or three quotes.
- The 81 Tao chapters go one each to the 81 easiest games, by progression score, so the hardest games have none. They are numbered outwards from Klondike (chapter 1), so the chapters are met roughly in order.
- The quotes are shuffled and dealt: first so every game has two rewards, then the rest to games at random, up to three each. Quotes 1-184 are assigned; the rest wait for new games.
- Rewards are awarded one per win, in the order the node lists them: a Tao chapter first.
- `npm run campaign:generate -- --rebalance-rewards` deals them again without moving any node.

## Adding, renaming, replacing and removing games

A plain `npm run campaign:generate` brings the map in line with the games without moving anything players lean on. Existing nodes keep their positions, links and rewards.

**Ground rules**

- A game is *released* once it has been in a store build or the web build on main.
- A local-only game (`enabledOnLocalOnly: true`) is kept apart from all of this: it has no node, no Tao chapter and no quotes (and needs no artwork), and a win in it records no campaign progress. It can be added, changed and deleted freely, with no entry in any list below. It joins the map only when it is released (its flag dropped), as a new game.
- A game's path (`/klondike`) is its identity in every save: stats, favourites, recent games, Campaign wins and the games a save has open. Once released, a path is never used again for a different game, even after it is retired or replaced.
- One change to the catalog per PR (an addition, a rename, a replacement or a removal), so each map diff can be reviewed on its own.
- After any of them: `npm run campaign:generate`, `npm run campaign:lock`, then `npx tsc --noEmit`, `npm run lint` and `npm test`. The saved-data guard must pass without touching its pins, its golden save or the lock by hand.
- Never `--rebuild`, `--rebalance-rewards` or `--reset-player-progress` once players have progress (see "Locking the map").

**Adding a game** (safe; no OK needed)

1. Add the normal game definition and component, with its ratings settled first: its difficulty and complexity decide where it goes. A local-only game stops here: it gets no node until it is released.
2. Run `npm run campaign:generate`. The new game is placed among the games about as hard as it (it aims for the median distance from the centre of the nine games nearest it in progression score), where it links to two nearby games, at least one of them no harder than itself, so reaching it never takes beating a harder game. Only if there is no such free spot does it go out on the rim. It is marked `appended` and given two unused quotes. Nothing already on the map moves.
3. A run warns when fewer than ten quotes are left unassigned. Append new quotes to `QuotesText.ts` then (see `docs/quotes.md`), in the same PR or the one before, so existing IDs keep their quotes.
4. Run `npm run campaign:lock` to lock it where it is.

**Renaming a game** (the same game under a new name; owner's OK if released)

1. Rename its data file, component and path, and add the old path to `MOVED_GAME_PATHS` in `src/data/game-variants.ts` (`"/old": { path: "/new" }`). Saved stats, favourites, recent games, Campaign wins and opened games follow it when a save loads. Folding a game into another as one of its variants is the same, with `variant`.
2. Run `npm run campaign:generate`: the node keeps its place, links and rewards under the new path. Then `npm run campaign:lock`.

**Replacing a game** (a different game in its place; owner's OK if released)

1. Delete the old game, add the new one under a path of its own, and add `"/old": "/new"` to `REPLACED_GAME_PATHS` in `src/data/game-variants.ts`.
2. Run `npm run campaign:generate`: the new game takes the old one's node, its place, links and rewards. Then `npm run campaign:lock`.

What a save keeps: the new game is open wherever the old one was, every game the old one's wins had opened stays open, and every collectible stays. The old game's rewards not yet collected are won from the new game. What it loses, since the new game is a different game: the old game's stats, favourite, recent-games entry and Campaign wins. Use this only for a game that fits the old one's spot (about as hard); otherwise remove the old game and add the new one.

**Removing a game** (owner's OK if released; rare. A local-only game has no node, so it is simply deleted.)

1. Delete the game, and add its path to `RETIRED_GAME_PATHS` in `src/data/game-variants.ts` (and any setting only it used to `RETIRED_GAME_SETTINGS`). The generator refuses a node whose game has gone without an entry in one of these lists.
2. Run `npm run campaign:generate`. The node leaves the map, and its former neighbours are linked to each other until they can all reach one another without it: a player who had the removed game open got there by winning one of them, so the rest stay within reach, as its win would have opened them. (The run warns if a neighbour already has six links and can't be joined.) Any split in the map is bridged too. Its rewards are handed to other games, so they can still be collected: a Tao chapter to a released game without one, quotes to games with room. Collectibles are saved by number, not by game, so players who had them keep them.
3. Run `npm run campaign:lock`, which lets go of the removed node.

What a save keeps when a game is removed: every other win, every collectible, and every game the removed game's win had opened (see "Progress storage"). What it loses: the removed game's own stats, favourite and win.

**Changing a released game**

- Its ratings may change: the node stays where it is, so the map drifts a little from its layout rules (below). Say so in the PR.
- If a change to its rules means an unfinished deal saved by an older build can't be played on (its saved state changed shape), bump the game's `sessionVersion` (from 1). Only that game's unfinished deal is dropped.
- Its settings are only ever added to; one no game uses any more goes in `RETIRED_GAME_SETTINGS`.

**Making a released game local-only** (only with the owner's OK: players lose sight of its stats and campaign wins, which `saved-data-guard` flags)

1. Mark it `enabledOnLocalOnly: true`, then run `npm run campaign:generate`: its node leaves the map, its neighbours are linked to each other as for a removal, its Tao chapter (if any) is handed to another game, and its quotes go back to the unused ones. Then `npm run campaign:lock`, which lets go of the node.

**Elsewhere in a save**

- Achievements are worked out from stats and collectibles, and the ones earned are saved (`cards.achievements.v1`), so "Won every game" or "Every quote" stays earned when a game or quote is added.
- The Game of the Day is picked from the released games by date, so the pick for future days changes when the list does. Wins are saved by date, so streaks are kept.
- The Wear OS app keeps its own saves by its own game ids, so a change here doesn't touch them; but its titles must match these, so a title change here is made there too.

The layout rules above (easier games nearer the centre and never gated by harder ones, Tao chapters on the easiest games) are what a rebuild fits the map to. A locked map can't be held to them once games are added, removed or re-rated, so the generator only enforces them when it lays the map out, and the tests only while the games still match `LAYOUT_FINGERPRINT` in the generated file (a hash of the games, ratings and categories the layout was fitted to). Games added since place themselves by the same score, as above, so the map keeps roughly to them.

## Locking the map

Once players have progress, the map must not change under them: which games are unlocked comes from the links, and every collected reward belongs to a game. `npm run campaign:lock` records every game's position, links and rewards in `src/data/campaign-map.lock.json`. From then on:

- a plain run fails rather than move a locked game, drop one of its links (other than to a retired game) or take a reward from it, so games can only be added around the locked ones (and links added, as when a removed game's neighbours are joined);
- a test checks the generated map against the lock, so a manual edit of a locked game fails too;
- `npm run campaign:lock` can be run again after adding, renaming, replacing or removing a game: it locks the new game, follows the rename or replacement, lets go of the retired one, and fails if a locked game has changed in any other way.

`--rebuild` and `--rebalance-rewards` refuse to replace an existing map, locked or not, unless given `--reset-player-progress`, and `src/__tests__/saved-data-guard.test.ts` fails if the lock file is missing or a released game isn't in it. A rebuild keeps every save's wins, opened games and collectibles (see "Progress storage"), but changes which game gives which reward for everyone, so it still needs the owner's OK. After one, run `npm run campaign:lock -- --reset-player-progress` to write the lock again from the new map.

The map was locked on 2026-09-27, with the 170 hand-picked quotes. Changing a locked game's place, links or rewards needs the owner's OK first (see "Locked: players' saved data" in `AGENTS.md`), and a migration of saved progress in `src/data/campaign-progress.ts` if it no longer fits.

On 2026-09-29 Klondike gained two links by hand, to Beehive and Pocket Poker, so the first win opens more of the map; the map was locked again with them. A new link only unlocks more, so saved progress needed no migration. The centre may hold up to six links like any node, and the rule that the first games are each of a different category leaves these two out. They are listed as `HUB_EXTRA_LINKS` in the generated file, and a rebuild now adds such links itself (`HUB.extraLinks` in the generator).

On 2026-10-05 Seer and Pickpocket were retired and Four Seasons became Little Windmill, with a plain run: Little Windmill kept Four Seasons' node, and Seer's Tao chapter and the four quotes went to other games. The layout itself was not rebuilt, so games appended since the lock (Elevens, Ozanam's Square, Royal Marriage and others) still sit at the rim, and `LAYOUT_FINGERPRINT` is empty until the next rebuild.

Also on 2026-10-05 Charlatan became Boiling Over, with a plain run: its node kept its place, links and rewards under `/boiling-over`.

On 2026-10-08 local-only games left the map for good: the eight added that day (Gambit, Carousel, Sweep, Sevens, Go Fish, Osmosis, Cipher and Mosaic, none ever released) had been appended at the rim with quotes 185–200; a plain run let them go, and those quotes are unassigned again. Cipher was then deleted, and the other seven on 2026-10-09; none was ever on the map players see.

## The force field

A force field round the centre (`FIELD_RADIUS` in `src/data/force-field.ts`,
0.45 map units) holds back the games beyond it until the full Odyssey is
unlocked (`src/data/odyssey-unlock.ts`; see `docs/unlock-keys.md`). Those games
can still be selected on the map, with a banner under the header saying they
lie beyond the field, but not played in the Odyssey: their Play button is
locked, a Campaign win or a Mercy Skip there counts for nothing, and their
quotes and chapters have no "Win to collect" button. Winning a game next to
the field still opens its neighbours beyond it, so they are ready once the
Odyssey is unlocked. Free play is untouched.

When it was set, 46 of the 118 games (39%) lay inside. It sits in the widest
gap between game dots at that distance, and every game inside can be reached
from Klondike without leaving it. `src/__tests__/odyssey-field.test.ts` keeps
the share inside between 30% and 40% and holds the rest: a new game placed
inside or a change to the map may mean moving the radius. The field is a
radius, not part of the map, so it never moves a node, link or reward, and
the lock is unaffected.

The field is drawn from `assets/images/force-field.webp`
(`npm run force-field:generate`), tinted in the colour theme's accent.

## Validation

Development validation in `src/data/campaign-map.ts` enforces:

- Every released game has exactly one node, and no local-only game has one.
- The graph is connected.
- Every node has one to six connections, and connections are symmetric and contain no unknown paths.
- No single game holds back more than a fifth of the map.
- Nodes do not overlap.
- Every node has two or three rewards, with at most one Tao chapter.
- Tao and quote reward IDs are unique and exist in their catalogs, and every Tao chapter is awarded.

`src/__tests__/campaign-map.test.ts` also checks the placement rules above, and `src/__tests__/saved-data-guard.test.ts` the lock.

## Quotes

See `docs/quotes.md` for the quote reveal, the collection and adding quotes or authors.

## Progress storage

Campaign progress is stored under `cards.campaignProgress.v1`. It records the last played node, Campaign win counts, collected IDs, the last processed game session for each node, and `unlockedPaths`: every game that has been open to the player. Klondike starts open, and winning a node opens its direct neighbours; once open, a game stays open whatever later happens to the map, because it is in the save rather than worked out from the links each time.

Progress version 2 dropped twelve quotes, and version 3 replaced the quotes with a hand-picked list. Older progress is migrated when it loads: dropped quotes are removed from the collection and kept ones follow their new IDs.

Version 4 added `unlockedPaths`. Before it, which games were open was derived from the wins and the map's links alone, so removing a game or redrawing the map could lock games again. A save from versions 1 to 3 is opened against the map it was played on, whose links are kept in `src/data/campaign-map.v3.ts`, to list what its wins had opened; renamed games follow their new path and removed ones drop out. That file is a record: never edit it.
