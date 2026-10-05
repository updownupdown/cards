/**
 * A depth-first look ahead for games with few moves at a time (Golf, Black
 * Hole...): tries lines of moves, within a budget of positions, and returns
 * the line whose final position scores best. Only use it with moves the
 * player can see; it must not play through hidden cards.
 */
export function bestLine<S, M>(
  root: S,
  {
    moves,
    apply,
    score,
    budget = 4000,
    maxDepth = 60,
    positionKey,
  }: {
    moves: (state: S) => M[];
    apply: (state: S, move: M) => S;
    /** How good a position is to stop in (higher is better). */
    score: (state: S, depth: number) => number;
    budget?: number;
    maxDepth?: number;
    /** Names positions, so one reached again by another way isn't searched twice. */
    positionKey?: (state: S) => string;
  },
): M[] {
  let best: { line: M[]; score: number } = {
    line: [],
    score: score(root, 0),
  };
  let visited = 0;
  const line: M[] = [];
  const seen = new Set<string>();

  const visit = (state: S, depth: number) => {
    if (visited >= budget) return;
    if (positionKey) {
      const key = positionKey(state);
      if (seen.has(key)) return;
      seen.add(key);
    }
    visited += 1;
    const value = score(state, depth);
    if (line.length > 0 && value > best.score) {
      best = { line: [...line], score: value };
    }
    if (depth >= maxDepth) return;
    for (const move of moves(state)) {
      line.push(move);
      visit(apply(state, move), depth + 1);
      line.pop();
      if (visited >= budget) return;
    }
  };

  visit(root, 0);
  return best.line;
}

// The line the last hint started, by position, so the next hints follow the
// same plan instead of changing their mind every move.
let memory: Map<string, string> | null = null;

/**
 * The first move of the best line from here (see bestLine), remembering the
 * line so the hints after it keep to it. `key` names a position; moves are
 * compared by their JSON.
 */
export function planMove<S, M>(
  root: S,
  options: Parameters<typeof bestLine<S, M>>[1] & { key: (state: S) => string },
): M | null {
  const known = memory?.get(options.key(root));
  if (known !== undefined) {
    const move = options
      .moves(root)
      .find((candidate) => JSON.stringify(candidate) === known);
    if (move !== undefined) return move;
  }
  const line = bestLine(root, options);
  if (line.length === 0) return null;
  memory = new Map();
  let state = root;
  for (const move of line) {
    // A line may pass a position twice: the hint there is its first move.
    const key = options.key(state);
    if (!memory.has(key)) memory.set(key, JSON.stringify(move));
    state = options.apply(state, move);
  }
  return line[0];
}
