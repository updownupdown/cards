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

## Adding a game

1. Add the normal game definition and component.
2. Run `npm run campaign:generate`. Existing nodes keep their positions, links and rewards; the new game is placed out on the rim, linked to its nearest nodes, and given two unused quotes. Every quote is assigned now, so first append new quotes to `QuotesText.ts` (appended, so existing IDs keep their quotes).
3. Run `npx tsc --noEmit`, `npm run lint`, and `npm test`, which validates the map.

## Locking the map

Once players have progress, the map must not change under them: which games are unlocked comes from the links, and every collected reward belongs to a game. `npm run campaign:lock` records every game's position, links and rewards in `src/data/campaign-map.lock.json`. From then on:

- `--rebuild` and `--rebalance-rewards` are refused;
- a plain run fails rather than move, unlink, drop or re-reward a locked game, so a new game can only be added around the locked ones;
- a test checks the generated map against the lock, so a manual edit of a locked game fails too.

The map was locked on 2026-09-27, with the 170 hand-picked quotes. To change a locked map on purpose, delete the lock file, and migrate saved progress in `src/data/campaign-progress.ts` if it no longer fits.

On 2026-09-29 Klondike gained two links by hand, to Beehive and Pocket Poker (`HUB_EXTRA_LINKS` in `src/data/campaign-map.ts`), so the first win opens more of the map; the map was locked again with them. A new link only unlocks more, so saved progress needed no migration. The centre may hold up to six links like any node, and the rule that the first games are each of a different category leaves these two out.

## Validation

Development validation in `src/data/campaign-map.ts` enforces:

- Every game has exactly one node, local-only games included.
- The graph is connected, with and without local-only games.
- Every node has one to six connections, and connections are symmetric and contain no unknown paths.
- No single game holds back more than a fifth of the map, with and without local-only games.
- Nodes do not overlap.
- Every node has two or three rewards, with at most one Tao chapter, and none on local-only games.
- Tao and quote reward IDs are unique and exist in their catalogs, and every Tao chapter is awarded.

`src/__tests__/campaign-map.test.ts` also checks the placement rules above, and the lock once it exists.

## Quotes

See `docs/quotes.md` for the quote reveal, the collection and adding quotes or authors.

## Progress storage

Nodes progress is stored separately under `cards.nodesProgress.v1`. It records the last played node, node-mode win counts, collected IDs, and the last processed game session for each node. Derived unlock state is not persisted: Klondike starts unlocked, and winning a node unlocks its direct neighbors.

Progress version 2 dropped twelve quotes, and version 3 replaced the quotes with a hand-picked list. Older progress is migrated when it loads: dropped quotes are removed from the collection and kept ones follow their new IDs.
