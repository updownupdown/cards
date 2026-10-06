# Campaign Map

The Campaign home tab is a progression mode layered over the existing game catalog. Normal attempts, wins, losses, and scores remain global. Unlocks and collectibles change only when a game is launched with `mode=campaign` (or the old `mode=nodes`).

## Authored graph

`src/data/campaign-map.generated.ts` holds every game's node: its position, its links and its rewards. Coordinates are normalized around `(0, 0)`, where Klondike must remain. Connections are undirected and must appear in both nodes' `connections` arrays.

Every game has a node, local-only games included. They sit on the rim as dead ends, and `src/data/campaign-map.ts` leaves them (and the links to them) out of builds where they are off, so the map works either way. Their quotes can only be collected where they are on.

## Layout

`npm run campaign:generate -- --rebuild` lays out the whole map:

1. Positions come from the galaxy's shape alone (the `GALAXY` parameters): a round bulge, then four spiral arms, with field stars between them. Links follow: each arm chained outwards, then short bridges between arms, then whatever repairs keep every game reachable.
2. Games are then fitted to those positions by simulated annealing (the `PLACEMENT` parameters), seeded so every rebuild is identical:
   - Klondike at the centre, and the rest outwards by progression score: 75% difficulty and 25% complexity, so the first games are easy both to win and to learn. Luck is not counted separately, since difficulty already rates how rarely a game is won.
   - No game is the only way through to an easier one (by difficulty): a hard game may only gate games at least as hard. This is checked on the map as release builds show it, without local-only games.
   - Linked games of the same category cost more the nearer they are to the centre, and among the games within two steps of Klondike each category appears once, so the first games a player meets are all different.
   - Local-only games take rim slots in the outer 30% that nothing else depends on.

## Reward policy

- Every game has two or three rewards: a Tao chapter and one or two quotes, or two or three quotes.
- The 81 Tao chapters go one each to the 81 easiest released games, by progression score, so the hardest games and local-only games have none. They are numbered outwards from Klondike (chapter 1), so the chapters are met roughly in order.
- The quotes are shuffled and dealt: first so every game has two rewards, then the rest to released games at random, up to three each. Every quote is currently assigned.
- Rewards are awarded one per win, in the order the node lists them: a Tao chapter first.
- `npm run campaign:generate -- --rebalance-rewards` deals them again without moving any node.

## Adding, renaming and removing games

A plain `npm run campaign:generate` brings the map in line with the games without moving anything players lean on. Existing nodes keep their positions, links and rewards.

**Adding a game**

1. Add the normal game definition and component.
2. Run `npm run campaign:generate`. The new game is placed out on the rim, linked to its nearest nodes, marked `appended`, and given two unused quotes. If every quote is assigned, first append new quotes to `QuotesText.ts` (appended, so existing IDs keep their quotes).
3. Run `npm run campaign:lock` to lock it where it is, then `npx tsc --noEmit`, `npm run lint`, and `npm test`.

**Renaming a game**

1. Rename its data file, component and path, and add the old path to `MOVED_GAME_PATHS` in `src/data/game-variants.ts` (`"/old": { path: "/new" }`). Saved stats, favourites, recent games, Campaign wins and opened games follow it when a save loads.
2. Run `npm run campaign:generate`: the node keeps its place, links and rewards under the new path. Then `npm run campaign:lock`.

**Removing a game** (a released one only with the owner's OK)

1. Delete the game, and add its path to `RETIRED_GAME_PATHS` in `src/data/game-variants.ts` (and any setting only it used to `RETIRED_GAME_SETTINGS`). The generator refuses a node whose game has gone without one of these entries.
2. Run `npm run campaign:generate`. The node leaves the map and any gap it leaves is bridged. Its rewards are handed to other games, so they can still be collected: a Tao chapter to a released game without one, quotes to games with room. Collectibles are saved by number, not by game, so players who had them keep them.
3. Run `npm run campaign:lock`, which lets go of the removed node.

What a save keeps when a game is removed: every other win, every collectible, and every game the removed game's win had opened (see "Progress storage"). What it loses: the removed game's own stats, favourite and win.

The layout rules above (easier games nearer the centre and never gated by harder ones, Tao chapters on the easiest games, local-only games as dead ends) are what a rebuild fits the map to. A locked map can't be held to them once games are added at the rim, removed or re-rated, so the generator only enforces them when it lays the map out, and the tests only while the games still match `LAYOUT_FINGERPRINT` in the generated file (a hash of the games, ratings and categories the layout was fitted to).

## Locking the map

Once players have progress, the map must not change under them: which games are unlocked comes from the links, and every collected reward belongs to a game. `npm run campaign:lock` records every game's position, links and rewards in `src/data/campaign-map.lock.json`. From then on:

- a plain run fails rather than move a locked game, drop one of its links (other than to a retired game) or take a reward from it, so games can only be added around the locked ones;
- a test checks the generated map against the lock, so a manual edit of a locked game fails too;
- `npm run campaign:lock` can be run again after adding, renaming or removing a game: it locks the new game, follows the rename, lets go of the retired one, and fails if a locked game has changed in any other way.

`--rebuild` and `--rebalance-rewards` refuse to replace an existing map, locked or not, unless given `--reset-player-progress`, and `src/__tests__/saved-data-guard.test.ts` fails if the lock file is missing or a released game isn't in it. A rebuild keeps every save's wins, opened games and collectibles (see "Progress storage"), but changes which game gives which reward for everyone, so it still needs the owner's OK. After one, run `npm run campaign:lock -- --reset-player-progress` to write the lock again from the new map.

The map was locked on 2026-09-27, with the 170 hand-picked quotes. Changing a locked game's place, links or rewards needs the owner's OK first (see "Locked: players' saved data" in `AGENTS.md`), and a migration of saved progress in `src/data/campaign-progress.ts` if it no longer fits.

On 2026-09-29 Klondike gained two links by hand, to Beehive and Pocket Poker, so the first win opens more of the map; the map was locked again with them. A new link only unlocks more, so saved progress needed no migration. The centre may hold up to six links like any node, and the rule that the first games are each of a different category leaves these two out. They are listed as `HUB_EXTRA_LINKS` in the generated file, and a rebuild now adds such links itself (`HUB.extraLinks` in the generator).

On 2026-10-05 Seer and Pickpocket were retired and Four Seasons became Little Windmill, with a plain run: Little Windmill kept Four Seasons' node, and Seer's Tao chapter and the four quotes went to other games. The layout itself was not rebuilt, so games appended since the lock (Elevens, Ozanam's Square, Royal Marriage and others) still sit at the rim, and `LAYOUT_FINGERPRINT` is empty until the next rebuild.

Also on 2026-10-05 Charlatan became Boiling Over, with a plain run: its node kept its place, links and rewards under `/boiling-over`.

## Validation

Development validation in `src/data/campaign-map.ts` enforces:

- Every game has exactly one node, local-only games included.
- The graph is connected, with and without local-only games.
- Every node has one to six connections, and connections are symmetric and contain no unknown paths.
- No single game holds back more than a fifth of the map, with and without local-only games.
- Nodes do not overlap.
- Every node has two or three rewards, with at most one Tao chapter, and none on local-only games.
- Tao and quote reward IDs are unique and exist in their catalogs, and every Tao chapter is awarded.

`src/__tests__/campaign-map.test.ts` also checks the placement rules above, and `src/__tests__/saved-data-guard.test.ts` the lock.

## Quotes

See `docs/quotes.md` for the quote reveal, the collection and adding quotes or authors.

## Progress storage

Campaign progress is stored under `cards.campaignProgress.v1`. It records the last played node, Campaign win counts, collected IDs, the last processed game session for each node, and `unlockedPaths`: every game that has been open to the player. Klondike starts open, and winning a node opens its direct neighbours; once open, a game stays open whatever later happens to the map, because it is in the save rather than worked out from the links each time.

Progress version 2 dropped twelve quotes, and version 3 replaced the quotes with a hand-picked list. Older progress is migrated when it loads: dropped quotes are removed from the collection and kept ones follow their new IDs.

Version 4 added `unlockedPaths`. Before it, which games were open was derived from the wins and the map's links alone, so removing a game or redrawing the map could lock games again. A save from versions 1 to 3 is opened against the map it was played on, whose links are kept in `src/data/campaign-map.v3.ts`, to list what its wins had opened; renamed games follow their new path and removed ones drop out. That file is a record: never edit it.
