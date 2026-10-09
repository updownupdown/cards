/**
 * New Deck's solver, used when a deal is made: it checks the deal can be won
 * and sets its par, the number of moves in the shortest win it finds.
 *
 * Cards are numbers in new-deck order (0 is the Ace of spades, 51 the King of
 * clubs). A card joins the new deck by itself once a neighbour of it is
 * there, which never costs anything (the card before it can still go next to
 * it), so the search only weighs the moves the player makes: starting a run,
 * and moving a card onto the next card in order or into an empty column.
 */

export const NEW_DECK_SIZE = 52;

export type SolverResult = {
  /** Moves in the shortest win found, or null if none was found. */
  moves: number | null;
  nodes: number;
};

/**
 * The cards in the new deck, as two 26-bit masks (cards 0-25 and 26-51), so
 * a position copies and compares cheaply.
 */
type Placed = [number, number];

type Node = {
  /** Shared with the parent node except where a card left or arrived. */
  columns: number[][];
  placed: Placed;
  moves: number;
};

const HALF = NEW_DECK_SIZE / 2;

function isPlaced(placed: Placed, card: number) {
  return card < HALF
    ? (placed[0] & (1 << card)) !== 0
    : (placed[1] & (1 << (card - HALF))) !== 0;
}

function place(placed: Placed, card: number) {
  if (card < HALF) placed[0] |= 1 << card;
  else placed[1] |= 1 << (card - HALF);
}

function countRuns(placed: Placed) {
  let runs = 0;
  let previous = false;
  for (let card = 0; card < NEW_DECK_SIZE; card += 1) {
    const here = isPlaced(placed, card);
    if (here && !previous) runs += 1;
    previous = here;
  }
  return runs;
}

function touchesDeck(placed: Placed, card: number) {
  return (
    (card > 0 && isPlaced(placed, card - 1)) ||
    (card < NEW_DECK_SIZE - 1 && isPlaced(placed, card + 1))
  );
}

/**
 * Moves every foot card that touches the new deck into it. `owned` marks the
 * columns this node has already copied, which it may change in place.
 */
function settle(columns: number[][], placed: Placed, owned: boolean[]) {
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < columns.length; i += 1) {
      const column = columns[i];
      const card = column[column.length - 1];
      if (card === undefined || !touchesDeck(placed, card)) continue;
      if (!owned[i]) {
        columns[i] = column.slice();
        owned[i] = true;
      }
      columns[i].pop();
      place(placed, card);
      changed = true;
    }
  }
}

function stateKey(columns: number[][], placed: Placed) {
  const cols = columns.map((column) =>
    String.fromCharCode(...column.map((card) => card + 48)),
  );
  cols.sort();
  return `${placed[0]},${placed[1]}|${cols.join(",")}`;
}

/**
 * Depth-first search for a win, then for shorter ones (branch and bound),
 * within `nodeLimit` positions. Columns list their cards from the first dealt
 * to the foot card, the one that can move.
 */
export function solveNewDeck(
  startColumns: number[][],
  maxRuns: number,
  nodeLimit = 20000,
): SolverResult {
  const columns = startColumns.map((column) => column.slice());
  const placed: Placed = [0, 0];
  settle(
    columns,
    placed,
    columns.map(() => true),
  );

  const seen = new Map<string, number>();
  const stack: Node[] = [{ columns, placed, moves: 0 }];
  let best = Infinity;
  let nodes = 0;

  const child = (node: Node, from: number, to: number | null): Node => {
    const next = node.columns.slice();
    const owned = next.map(() => false);
    const nextPlaced: Placed = [node.placed[0], node.placed[1]];
    next[from] = next[from].slice();
    owned[from] = true;
    const card = next[from].pop()!;
    if (to === null) {
      place(nextPlaced, card);
    } else {
      next[to] = [...next[to], card];
      owned[to] = true;
    }
    settle(next, nextPlaced, owned);
    return { columns: next, placed: nextPlaced, moves: node.moves + 1 };
  };

  while (stack.length > 0) {
    const node = stack.pop()!;
    if (node.moves >= best) continue;
    if (node.columns.every((column) => column.length === 0)) {
      best = node.moves;
      continue;
    }
    // One more move is the least a win can still take.
    if (node.moves + 1 >= best) continue;
    nodes += 1;
    if (nodes > nodeLimit) break;

    const key = stateKey(node.columns, node.placed);
    const seenMoves = seen.get(key);
    if (seenMoves !== undefined && seenMoves <= node.moves) continue;
    seen.set(key, node.moves);

    const canStartRun = countRuns(node.placed) < maxRuns;
    // Pushed least promising first, so the search tries run starts, then
    // builds, then empty columns.
    const empties: Node[] = [];
    const builds: Node[] = [];
    const starts: Node[] = [];

    node.columns.forEach((column, from) => {
      const card = column[column.length - 1];
      if (card === undefined) return;
      if (canStartRun) starts.push(child(node, from, null));
      let triedEmpty = false;
      node.columns.forEach((target, to) => {
        if (to === from) return;
        const targetCard = target[target.length - 1];
        if (targetCard === undefined) {
          // Every empty column is the same; a lone card gains nothing there.
          if (triedEmpty || column.length < 2) return;
          triedEmpty = true;
          empties.push(child(node, from, to));
        } else if (targetCard === card + 1) {
          builds.push(child(node, from, to));
        }
      });
    });

    stack.push(...empties, ...builds, ...starts);
  }

  return { moves: best === Infinity ? null : best, nodes };
}
