# Nodes Map

The Nodes home tab is a progression mode layered over the existing game catalog. Normal attempts, wins, losses, and scores remain global. Unlocks and collectibles change only when a game is launched with `mode=nodes`.

## Authored graph

`src/data/nodes-map.generated.ts` contains the editable node records. Coordinates are normalized around `(0, 0)`, where Klondike must remain. Connections are undirected and must appear in both nodes' `connections` arrays.

Run `npm run nodes:generate` to rebuild the complete authored file from game ratings. The generator orders games radially by difficulty, starts from an equal-area golden-angle spiral, and samples deterministic radial and angular variations. Candidates that violate the minimum spacing are rejected, producing larger organic gaps without overlaps. Running it replaces manual coordinate and connection edits, so commit or preserve curated changes first.

Development validation in `src/data/nodes-map.ts` enforces:

- Every enabled game has exactly one node.
- The graph is connected.
- Every node has two to five connections.
- Connections are symmetric and contain no unknown paths.
- Removing any single node leaves every other node connected, so no locked game can block an entire branch of progression.
- Nodes do not overlap, and the nearest-node spacing ratio stays between 2.2 and 3 so the distribution remains varied without isolating nodes.
- Every node has one to three rewards.
- Tao IDs 1 through 81 and quote IDs 1 through 104 are unique.

## Adding a game

1. Add the normal game definition and component.
2. Run `npm run nodes:generate`, or add a record manually near the periphery.
3. Give the new node two to five symmetric connections.
4. Rebalance collectible IDs if the catalog totals or tier policy changes.
5. Run `npx tsc --noEmit`, `npm run lint`, and a development build so graph validation executes.

## Reward policy

- Easy games, difficulty 35 or below, have two quotes.
- Medium games, difficulty 40 through 76, have one quote.
- Hard games, difficulty 80 or above, have no quotes.
- All hard games and the 68 easiest remaining games have one Tao chapter.
- Rewards are awarded one per win, Tao first and then quotes.

Quote IDs 1 through 52 use the white deck. IDs 53 through 104 use the black deck. Within each deck, IDs advance Ace through King and then advance through the shared suit order in `card-utils.ts`.

## Progress storage

Nodes progress is stored separately under `cards.nodesProgress.v1`. It records the last played node, node-mode win counts, collected IDs, and the last processed game session for each node. Derived unlock state is not persisted: Klondike starts unlocked, and winning a node unlocks its direct neighbors.
