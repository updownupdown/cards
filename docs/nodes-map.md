# Nodes Map

The Nodes home tab is a progression mode layered over the existing game catalog. Normal attempts, wins, losses, and scores remain global. Unlocks and collectibles change only when a game is launched with `mode=nodes`.

## Authored graph

`src/data/nodes-map.generated.ts` contains the editable node records. Coordinates are normalized around `(0, 0)`, where Klondike must remain. Connections are undirected and must appear in both nodes' `connections` arrays.

`npm run nodes:generate` keeps the existing file as the source of truth, including any manual edits:

- Every existing node keeps its position, connections, and rewards.
- Nodes for removed games are dropped, along with their connections.
- New games are placed around the periphery of the map, in order from easiest to hardest, and linked to their two or three nearest nodes.
- Each new node gets the next two unused quotes. All three quote decks are currently full, so a new game first needs a new deck (see Quote cards below).

Existing players keep their progress: wins and collected rewards are stored per game and reward, and a new node only ever adds connections, so nothing already unlocked becomes locked.

`npm run nodes:generate -- --rebuild` lays out the whole map again. Klondike sits at the centre and Monte Carlo is the second node, next to it. Every other game is placed outwards by a centre score of 60% difficulty and 40% luck, so easy games stay near the middle and hard or luck-heavy games sit at the edges. Positions come from an equal-area golden-angle spiral with deterministic variation. Every game keeps the rewards it already has, but manual coordinate and connection edits are replaced, and connections can change, so a node a player had unlocked may become locked again until they win a neighbour.

`npm run nodes:generate -- --rebalance-rewards` deals the rewards again without moving any node (combine it with `--rebuild` to do both). See Reward policy below. Rewards that move to another game leave that game's node incomplete for players who had collected them, so only rebalance when the catalog or ratings change substantially.

Development validation in `src/data/nodes-map.ts` enforces:

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
2. Run `npm run nodes:generate`. If it reports that it is out of quotes, add a deck (see Quote cards below).
3. Run `npx tsc --noEmit`, `npm run lint`, and `npm test`, which validates the map.

## Reward policy

- Every node has two or three rewards. Manual edits may add a fourth.
- The gold deck goes to the hardest or luckiest games: games are ranked by half the greater of difficulty and luck plus a quarter of each, and the top 26 get two gold quotes each.
- Every other game gets two Tao chapters or white and black quotes. The nine spare ones are a third reward on the top gold games.
- A normal run never moves rewards between games, so collected rewards stay complete. Only `--rebalance-rewards` does, and it keeps each game's existing rewards wherever they still fit.
- Rewards are awarded one per win: Tao first, then white and black quotes, then gold quotes.

## Quote cards

Each quote is shown on a collectible card, in three 52-card decks with no Jokers:

- IDs 1–52: the white deck, Ace through King in the shared suit order in `card-utils.ts`.
- IDs 53–104: the black deck, in the same order.
- IDs 105–156: the gold deck, in the same order.

Going past 156 quotes needs another 52-card deck of card images in `assets/cards/`, its folder in `CardAssets.ts`, and a matching deck in `getQuoteCard`.

## Progress storage

Nodes progress is stored separately under `cards.nodesProgress.v1`. It records the last played node, node-mode win counts, collected IDs, and the last processed game session for each node. Derived unlock state is not persisted: Klondike starts unlocked, and winning a node unlocks its direct neighbors.

Progress version 2 dropped twelve quotes to make three 52-card decks. Version 1 progress is migrated when it loads: dropped quotes are removed from the collection and later quote IDs move down to match.
