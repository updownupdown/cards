# Campaign Map

The Campaign home tab is a progression mode layered over the existing game catalog. Normal attempts, wins, losses, and scores remain global. Unlocks and collectibles change only when a game is launched with `mode=campaign` (or the old `mode=nodes`).

## Authored graph

`src/data/campaign-map.generated.ts` contains the editable node records. Coordinates are normalized around `(0, 0)`, where Klondike must remain. Connections are undirected and must appear in both nodes' `connections` arrays.

`npm run campaign:generate` keeps the existing file as the source of truth, including any manual edits:

- Every existing node keeps its position, connections, and rewards.
- Nodes for removed games are dropped, along with their connections.
- New games are placed around the periphery of the map, in order from easiest to hardest, and linked to their two or three nearest nodes.
- Each new node gets the next two unused rewards. Quotes past `REWARDS.lastAssignableQuote` are held back; raise it when the pool runs out (see Quotes below).

Existing players keep their progress: wins and collected rewards are stored per game and reward, and a new node only ever adds connections, so nothing already unlocked becomes locked.

`npm run campaign:generate -- --rebuild` lays out the whole map again. Klondike sits at the centre and Monte Carlo is the second node, next to it. Every other game is placed outwards by a centre score of 60% difficulty and 40% luck, so easy games stay near the middle and hard or luck-heavy games sit at the edges. Positions come from an equal-area golden-angle spiral with deterministic variation. Every game keeps the rewards it already has, but manual coordinate and connection edits are replaced, and connections can change, so a node a player had unlocked may become locked again until they win a neighbour.

`npm run campaign:generate -- --rebalance-rewards` deals the rewards again without moving any node (combine it with `--rebuild` to do both). See Reward policy below. Rewards that move to another game leave that game's node incomplete for players who had collected them, so only rebalance when the catalog or ratings change substantially.

`npm run campaign:generate -- --sprites-only` only redraws the game dot and flare sprites in `assets/images/campaign/`, for when their look in the script changes.

Development validation in `src/data/campaign-map.ts` enforces:

- Every enabled game has exactly one node.
- The graph is connected.
- Every node has two to five connections.
- Connections are symmetric and contain no unknown paths.
- Removing any single node leaves every other node connected, so no locked game can block an entire branch of progression.
- Nodes do not overlap, and the nearest-node spacing ratio stays between 2.2 and 3 so the distribution remains varied without isolating nodes.
- Every node has two to four rewards.
- Tao and quote reward IDs are unique and exist in their catalogs.

`src/__tests__/collectibles.test.ts` also checks that every Tao chapter and quote is awarded by exactly one node.

## Adding a game

1. Add the normal game definition and component.
2. Run `npm run campaign:generate`. If it reports that it is out of quotes, raise `REWARDS.lastAssignableQuote` (see Quotes below).
3. Run `npx tsc --noEmit`, `npm run lint`, and `npm test`, which validates the map.

## Reward policy

- Every node has two or three rewards. Manual edits may add a fourth.
- Tao chapters and quotes are woven together in proportion, so both turn up across the whole map.
- Every game gets two rewards; the leftovers go as a third reward to the games that are easiest to beat a third time.
- A normal run never moves rewards between games, so collected rewards stay complete. Only `--rebalance-rewards` does, and it keeps each game's existing rewards wherever they still fit.
- Rewards are awarded one per win, in the order the node lists them.

## Quotes

Quotes are awarded by ID, 1 to `REWARDS.lastAssignableQuote` (140) in `scripts/generate-campaign-map.mjs`; the rest of the 170 are held back for games still to come. See `docs/quotes.md` for the quote reveal, the collection and adding quotes or authors.

## Progress storage

Nodes progress is stored separately under `cards.nodesProgress.v1`. It records the last played node, node-mode win counts, collected IDs, and the last processed game session for each node. Derived unlock state is not persisted: Klondike starts unlocked, and winning a node unlocks its direct neighbors.

Progress version 2 dropped twelve quotes. Version 1 progress is migrated when it loads: dropped quotes are removed from the collection and later quote IDs move down to match.
