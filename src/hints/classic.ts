import {
  rankValue,
  type CardSuit,
  type PlayingCard,
} from "@/components/Cards/card-utils";
import {
  cardTarget,
  makeHint,
  zoneTarget,
  type Hint,
  type HintMessageKey,
} from "./hint";

/**
 * Hints for the classic solitaires: piles you build on (the tableau),
 * foundations, free cells, and piles whose top card plays (a waste, a
 * reserve). Each game describes its position as a ClassicBoard and its rules
 * as ClassicRules; this file finds the move a good player would show a
 * learner:
 *
 * - When every card is in view (FreeCell, Baker's Dozen...), it searches
 *   ahead, a few thousand positions at most, for a way to win, or else for
 *   the move leading to the best position it saw.
 * - When cards are hidden (face down, or in a stock), it never peeks: it
 *   ranks the moves on view as an expert would, putting safe foundation plays
 *   first, then turning up hidden cards, emptying columns and freeing cards
 *   for the foundations, and drawing from the stock only when nothing on the
 *   table helps. Moves that only shuffle cards between equal places aren't
 *   shown.
 */

export type ClassicBoard = {
  tableau: PlayingCard[][];
  foundations: PlayingCard[][];
  /** Free cells, holding one card each. */
  cells?: (PlayingCard | null)[];
  /** Piles whose top card plays but takes no cards: a waste, a reserve. */
  reserves?: PlayingCard[][];
};

export type ClassicSource =
  | { kind: "tableau"; pile: number; index: number }
  | { kind: "cell"; cell: number }
  | { kind: "reserve"; pile: number };

export type ClassicDestination =
  | { kind: "foundation"; pile: number }
  | { kind: "tableau"; pile: number }
  | { kind: "cell"; cell: number };

export type ClassicMove = {
  from: ClassicSource;
  to: ClassicDestination;
  /** The cards that move, the one moved by (lowest in the pile) first. */
  cards: PlayingCard[];
};

export type ClassicRules = {
  /** May the card go onto this foundation pile? */
  toFoundation: (
    card: PlayingCard,
    pile: PlayingCard[],
    pileIndex: number,
    board: ClassicBoard,
  ) => boolean;
  /**
   * May these cards (the one moved by first) go onto this tableau pile? It
   * covers empty piles and limits on how many cards move at once.
   */
  toTableau: (
    cards: PlayingCard[],
    pile: PlayingCard[],
    pileIndex: number,
    board: ClassicBoard,
    from: ClassicSource,
  ) => boolean;
  /** May the cards of a tableau pile from `index` up be picked up together? */
  canLift: (
    pile: PlayingCard[],
    index: number,
    pileIndex: number,
    board: ClassicBoard,
  ) => boolean;
  /**
   * How well `card` sits on `base` in the tableau: 0 not built on it, 1 a
   * legal build, 2 the best build (same suit in Spider). Defaults to 0/2 from
   * toTableau with single cards.
   */
  buildQuality?: (card: PlayingCard, base: PlayingCard) => 0 | 1 | 2;
  /** Whether a reserve's top card may go to the tableau (default yes). */
  reserveToTableau?: (pile: number) => boolean;
  /** Whether a reserve's top card may go to a free cell (default no). */
  reserveToCell?: boolean;
  /** How many of each card there are (default 1). */
  decks?: number;
  /**
   * Whether tableau piles can be told apart by position only (default no):
   * then the search treats piles with the same cards as the same position.
   */
  pilesDiffer?: boolean;
  /**
   * What happens on its own after a move, e.g. a finished Spider run leaving
   * for the foundations. Must not turn hidden cards up.
   */
  afterMove?: (board: ClassicBoard) => ClassicBoard;
  /** Extra score for a move, e.g. completing a Spider run. */
  bonus?: (
    move: ClassicMove,
    before: ClassicBoard,
    after: ClassicBoard,
  ) => number;
};

export type ClassicZones = {
  tableau: (pile: number) => string;
  foundation: (pile: number) => string;
  cell?: (cell: number) => string;
};

/** The stock, when drawing from it is a move. */
export type StockAction = {
  zone: string;
  message: Extract<HintMessageKey, "draw" | "redeal" | "dealRow" | "press">;
  /** The button's text, for "press". */
  label?: string;
};

type Options = {
  /** Drawing or dealing from the stock, if allowed now. */
  stock?: StockAction | null;
  /**
   * Search for a win, naming the game (its path and variant) so a plan found
   * for one game is never followed in another. Only for games whose cards
   * are all on view: the search plays moves out, and must not learn what a
   * hidden card is.
   */
  search?: string;
  /** Positions the search may look at (default 8000). */
  searchBudget?: number;
};

// ── Moves ────────────────────────────────────────────────────────────────────

function topOf<T>(pile: T[]): T | undefined {
  return pile[pile.length - 1];
}

function defaultQuality(rules: ClassicRules, board: ClassicBoard) {
  return (card: PlayingCard, base: PlayingCard): 0 | 1 | 2 => {
    if (rules.buildQuality) return rules.buildQuality(card, base);
    // A probe pile: any tableau index will do for the rule's build check.
    return rules.toTableau([card], [base], 0, board, {
      kind: "cell",
      cell: -1,
    })
      ? 2
      : 0;
  };
}

/** Every legal move on the board (not the stock). */
export function listClassicMoves(
  board: ClassicBoard,
  rules: ClassicRules,
): ClassicMove[] {
  const moves: ClassicMove[] = [];
  const singles: { from: ClassicSource; card: PlayingCard }[] = [];

  board.cells?.forEach((card, cell) => {
    if (card) singles.push({ from: { kind: "cell", cell }, card });
  });
  board.reserves?.forEach((pile, index) => {
    const card = topOf(pile);
    if (card?.faceUp) {
      singles.push({ from: { kind: "reserve", pile: index }, card });
    }
  });

  const tryTableau = (cards: PlayingCard[], from: ClassicSource) => {
    board.tableau.forEach((pile, pileIndex) => {
      if (from.kind === "tableau" && from.pile === pileIndex) return;
      // In play it would have been turned up; looking ahead, it's unknown.
      if (pile.length > 0 && !pile[pile.length - 1].faceUp) return;
      if (rules.toTableau(cards, pile, pileIndex, board, from)) {
        moves.push({ from, to: { kind: "tableau", pile: pileIndex }, cards });
      }
    });
  };
  const tryFoundation = (card: PlayingCard, from: ClassicSource) => {
    const pile = board.foundations.findIndex((foundation, index) =>
      rules.toFoundation(card, foundation, index, board),
    );
    if (pile >= 0) {
      moves.push({ from, to: { kind: "foundation", pile }, cards: [card] });
    }
  };
  const freeCell = board.cells?.findIndex((card) => card === null) ?? -1;

  board.tableau.forEach((pile, pileIndex) => {
    for (let index = 0; index < pile.length; index += 1) {
      if (!pile[index].faceUp) continue;
      if (!rules.canLift(pile, index, pileIndex, board)) continue;
      const cards = pile.slice(index);
      const from: ClassicSource = { kind: "tableau", pile: pileIndex, index };
      if (cards.length === 1) {
        tryFoundation(cards[0], from);
        if (freeCell >= 0) {
          moves.push({ from, to: { kind: "cell", cell: freeCell }, cards });
        }
      }
      tryTableau(cards, from);
    }
  });

  for (const { from, card } of singles) {
    tryFoundation(card, from);
    if (
      from.kind === "reserve" &&
      rules.reserveToTableau &&
      !rules.reserveToTableau(from.pile)
    ) {
      continue;
    }
    tryTableau([card], from);
    if (from.kind === "reserve" && rules.reserveToCell && freeCell >= 0) {
      moves.push({ from, to: { kind: "cell", cell: freeCell }, cards: [card] });
    }
  }

  return moves;
}

/** The board after a move. Cards it uncovers stay as they are. */
export function applyClassicMove(
  board: ClassicBoard,
  move: ClassicMove,
  rules?: ClassicRules,
): ClassicBoard {
  const next: ClassicBoard = {
    tableau: [...board.tableau],
    foundations: [...board.foundations],
    cells: board.cells ? [...board.cells] : undefined,
    reserves: board.reserves ? [...board.reserves] : undefined,
  };
  const { from, to, cards } = move;
  if (from.kind === "tableau") {
    next.tableau[from.pile] = next.tableau[from.pile].slice(0, from.index);
  } else if (from.kind === "cell") {
    next.cells![from.cell] = null;
  } else {
    next.reserves![from.pile] = next.reserves![from.pile].slice(0, -1);
  }
  if (to.kind === "tableau") {
    next.tableau[to.pile] = [...next.tableau[to.pile], ...cards];
  } else if (to.kind === "foundation") {
    next.foundations[to.pile] = [...next.foundations[to.pile], ...cards];
  } else {
    next.cells![to.cell] = cards[0];
  }
  return rules?.afterMove ? rules.afterMove(next) : next;
}

// ── Judging moves as an expert would ────────────────────────────────────────

const SUITS: CardSuit[] = ["hearts", "clubs", "diamonds", "spades"];

/**
 * A foundation play is safe when no card left in play could still want to
 * be built on the card: low cards, or every card that builds on it is
 * already home. Unsafe plays can strand those cards.
 */
function isSafeFoundationPlay(
  card: PlayingCard,
  board: ClassicBoard,
  rules: ClassicRules,
  quality: (card: PlayingCard, base: PlayingCard) => 0 | 1 | 2,
) {
  const rank = rankValue(card);
  if (rank <= 2) return true;
  const decks = rules.decks ?? 1;
  const belowRank = rankName(rank - 1);
  if (!belowRank) return true;
  return SUITS.every((suit) => {
    const below: PlayingCard = {
      id: "probe",
      suit,
      rank: belowRank,
      faceUp: true,
    };
    if (quality(below, card) === 0) return true;
    let copiesHome = 0;
    for (const pile of board.foundations) {
      for (const homeCard of pile) {
        if (homeCard.suit === suit && homeCard.rank === belowRank) {
          copiesHome += 1;
        }
      }
    }
    return copiesHome >= decks;
  });
}

const RANK_NAMES = [
  "",
  "A",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
] as const;

function rankName(value: number) {
  return RANK_NAMES[value] || undefined;
}

function scoreMove(
  move: ClassicMove,
  board: ClassicBoard,
  rules: ClassicRules,
  quality: (card: PlayingCard, base: PlayingCard) => 0 | 1 | 2,
): number | null {
  const { from, to, cards } = move;
  const after = applyClassicMove(board, move, rules);
  let score = rules.bonus?.(move, board, after) ?? 0;

  // What the move leaves behind.
  let reveals = false;
  let empties = false;
  let leftBase: PlayingCard | undefined;
  if (from.kind === "tableau") {
    const pile = board.tableau[from.pile];
    leftBase = pile[from.index - 1];
    if (!leftBase) {
      empties = true;
    } else if (!leftBase.faceUp) {
      reveals = true;
      const hidden = pile.slice(0, from.index).filter((c) => !c.faceUp);
      score += 600 + 10 * hidden.length;
    }
  }

  // A card the move frees for the foundations.
  if (from.kind === "tableau" && leftBase?.faceUp) {
    const freed = after.foundations.some((pile, index) =>
      rules.toFoundation(leftBase!, pile, index, after),
    );
    if (freed) score += 300;
  }

  if (to.kind === "foundation") {
    score += isSafeFoundationPlay(cards[0], board, rules, quality) ? 1000 : 400;
    if (from.kind !== "tableau") score += 20;
    return score + (empties ? 200 : 0);
  }

  if (to.kind === "cell") {
    // Parking a card is worth it only for what it uncovers.
    if (!reveals && score < 300) return null;
    return score - 150;
  }

  // To the tableau.
  const destination = board.tableau[to.pile];
  const base = topOf(destination);
  const toEmpty = !base;

  if (from.kind === "cell") score += 200;
  if (from.kind === "reserve") score += 250;

  if (from.kind === "tableau" && !reveals) {
    if (empties) {
      // Moving a whole pile into an empty one changes nothing.
      if (toEmpty) return null;
      score += 450;
    } else {
      const sourceQuality = leftBase ? quality(cards[0], leftBase) : 0;
      const destinationQuality = base ? quality(cards[0], base) : 0;
      const improves = destinationQuality > sourceQuality;
      if (!improves && score < 300) return null;
      if (improves) score += 60 * (destinationQuality - sourceQuality);
      if (toEmpty && !improves) score -= 100;
    }
  }

  // Empty columns are precious: spend one only for a reason.
  if (toEmpty) score -= 120;
  if (base && quality(cards[0], base) === 2) score += 30;

  return score > 0 ? score : null;
}

// ── Searching ahead (all cards on view) ─────────────────────────────────────

const cardKeys = new Map<string, string>();

function cardKey(card: PlayingCard) {
  let key = cardKeys.get(card.id);
  if (key === undefined) {
    key = `${card.rank}${card.suit[0]}${card.faceUp ? "" : "?"}`;
    cardKeys.set(card.id, key);
  }
  return key;
}

function boardKey(board: ClassicBoard, rules: ClassicRules) {
  const piles = board.tableau.map((pile) => pile.map(cardKey).join(","));
  if (!rules.pilesDiffer) piles.sort();
  const cells = (board.cells ?? []).map((card) => (card ? cardKey(card) : "-"));
  cells.sort();
  return `${piles.join("|")}/${cells.join(",")}/${board.foundations
    .map((pile) => pile.length)
    .join(",")}/${(board.reserves ?? []).map((pile) => pile.length).join(",")}`;
}

function cardsInPlay(board: ClassicBoard) {
  let count = 0;
  for (const pile of board.tableau) count += pile.length;
  for (const card of board.cells ?? []) if (card) count += 1;
  for (const pile of board.reserves ?? []) count += pile.length;
  return count;
}

/**
 * How promising a position is: cards home count most; then empty columns and
 * free cells; low cards buried under higher ones count against it.
 */
function evaluate(
  board: ClassicBoard,
  quality: (card: PlayingCard, base: PlayingCard) => 0 | 1 | 2,
) {
  let score = 0;
  for (const pile of board.foundations) score += 120 * pile.length;
  for (const pile of board.tableau) {
    if (pile.length === 0) {
      score += 40;
      continue;
    }
    let highestAbove = 0;
    for (let index = pile.length - 1; index >= 0; index -= 1) {
      if (!pile[index].faceUp) break;
      const rank = rankValue(pile[index]);
      if (highestAbove > rank) score -= (14 - rank) * 6;
      if (rank > highestAbove) highestAbove = rank;
      if (index > 0 && quality(pile[index], pile[index - 1]) === 0) score -= 4;
    }
  }
  for (const card of board.cells ?? []) score += card ? 0 : 15;
  return score;
}

/** Plays every safe foundation move, as a good player does without thinking. */
function playSafeMoves(
  board: ClassicBoard,
  rules: ClassicRules,
  quality: (card: PlayingCard, base: PlayingCard) => 0 | 1 | 2,
) {
  let current = board;
  const moves: ClassicMove[] = [];
  for (let guard = 0; guard < 60; guard += 1) {
    const move = findSafeFoundationMove(current, rules, quality);
    if (!move) break;
    moves.push(move);
    current = applyClassicMove(current, move, rules);
  }
  return { board: current, moves };
}

function findSafeFoundationMove(
  board: ClassicBoard,
  rules: ClassicRules,
  quality: (card: PlayingCard, base: PlayingCard) => 0 | 1 | 2,
): ClassicMove | null {
  const tryCard = (
    card: PlayingCard | null | undefined,
    from: ClassicSource,
  ): ClassicMove | null => {
    if (!card?.faceUp) return null;
    const pile = board.foundations.findIndex((foundation, index) =>
      rules.toFoundation(card, foundation, index, board),
    );
    if (pile < 0 || !isSafeFoundationPlay(card, board, rules, quality)) {
      return null;
    }
    return { from, to: { kind: "foundation", pile }, cards: [card] };
  };
  for (let pile = 0; pile < board.tableau.length; pile += 1) {
    const cards = board.tableau[pile];
    const index = cards.length - 1;
    const move =
      index >= 0 &&
      rules.canLift(cards, index, pile, board) &&
      tryCard(cards[index], { kind: "tableau", pile, index });
    if (move) return move;
  }
  const cells = board.cells ?? [];
  for (let cell = 0; cell < cells.length; cell += 1) {
    const move = tryCard(cells[cell], { kind: "cell", cell });
    if (move) return move;
  }
  const reserves = board.reserves ?? [];
  for (let pile = 0; pile < reserves.length; pile += 1) {
    const move = tryCard(topOf(reserves[pile]), { kind: "reserve", pile });
    if (move) return move;
  }
  return null;
}

type SearchNode = {
  board: ClassicBoard;
  parent: SearchNode | null;
  /** The move from the parent, then the safe plays that followed it. */
  moves: ClassicMove[];
  depth: number;
  priority: number;
  value: number;
};

/** A binary heap that pops the most promising position first. */
class Frontier {
  private items: SearchNode[] = [];
  get size() {
    return this.items.length;
  }
  push(node: SearchNode) {
    const items = this.items;
    items.push(node);
    let index = items.length - 1;
    while (index > 0) {
      const parent = (index - 1) >> 1;
      if (items[parent].priority >= items[index].priority) break;
      [items[parent], items[index]] = [items[index], items[parent]];
      index = parent;
    }
  }
  pop() {
    const items = this.items;
    const first = items[0];
    const last = items.pop()!;
    if (items.length > 0) {
      items[0] = last;
      let index = 0;
      for (;;) {
        const left = index * 2 + 1;
        const right = left + 1;
        let largest = index;
        if (
          left < items.length &&
          items[left].priority > items[largest].priority
        ) {
          largest = left;
        }
        if (
          right < items.length &&
          items[right].priority > items[largest].priority
        ) {
          largest = right;
        }
        if (largest === index) break;
        [items[largest], items[index]] = [items[index], items[largest]];
        index = largest;
      }
    }
    return first;
  }
}

export type SearchStats = { won?: boolean; generated?: number };

/**
 * A best-first search for a win, within a budget (a number of positions, and
 * a time limit so a slow phone still answers quickly). Returns every move of
 * the win, or else the moves toward the best position it saw (when that
 * beats the board as it is).
 */
export function solveClassic(
  board: ClassicBoard,
  rules: ClassicRules,
  { budget = 5000, maxMs = 250 }: { budget?: number; maxMs?: number } = {},
  stats?: SearchStats,
): { win: ClassicMove[] | null; toward: ClassicMove[] | null } {
  const startedAt = Date.now();
  const quality = defaultQuality(rules, board);
  const seen = new Set([boardKey(board, rules)]);
  const frontier = new Frontier();
  let generated = 0;
  const candidates: SearchNode[] = [];

  const expand = (node: SearchNode): SearchNode | null => {
    for (const move of listClassicMoves(node.board, rules)) {
      // Nothing comes of moving a whole pile into an empty one.
      if (
        move.from.kind === "tableau" &&
        move.from.index === 0 &&
        move.to.kind === "tableau" &&
        node.board.tableau[move.to.pile].length === 0
      ) {
        continue;
      }
      const played = playSafeMoves(
        applyClassicMove(node.board, move, rules),
        rules,
        quality,
      );
      const key = boardKey(played.board, rules);
      if (seen.has(key)) continue;
      seen.add(key);
      generated += 1;
      const value = evaluate(played.board, quality);
      const child: SearchNode = {
        board: played.board,
        parent: node,
        moves: [move, ...played.moves],
        depth: node.depth + 1,
        priority: value - node.depth,
        value,
      };
      if (cardsInPlay(played.board) === 0) return child;
      candidates.push(child);
      frontier.push(child);
    }
    return null;
  };

  // Safe plays on the board as it is come first.
  const opening = playSafeMoves(board, rules, quality);
  const rootValue = evaluate(board, quality);
  const root: SearchNode = {
    board: opening.board,
    parent: null,
    moves: opening.moves,
    depth: 0,
    priority: 0,
    value: rootValue,
  };
  let won: SearchNode | null =
    cardsInPlay(opening.board) === 0 ? root : expand(root);
  while (
    !won &&
    frontier.size > 0 &&
    generated < budget &&
    Date.now() - startedAt < maxMs
  ) {
    won = expand(frontier.pop());
  }
  if (stats) {
    stats.won = !!won;
    stats.generated = generated;
  }

  const lineTo = (end: SearchNode) => {
    const lines: ClassicMove[][] = [];
    for (let node: SearchNode | null = end; node; node = node.parent) {
      lines.push(node.moves);
    }
    return lines.reverse().flat();
  };
  if (won) return { win: lineTo(won), toward: null };
  // The best position seen that isn't a dead end, if it beats this one.
  candidates.sort((a, b) => b.value - a.value);
  const found = candidates.find(
    (node) =>
      node.value > rootValue && listClassicMoves(node.board, rules).length > 0,
  );
  return { win: null, toward: found ? lineTo(found) : null };
}

// The line of moves the last hint started (a win, or a plan a few moves
// long), so the next hints along it come at once and stay on the same plan
// instead of changing their mind every move. Positions match exactly, pile
// for pile, and a move is only offered while it's still legal.
let line: Map<string, ClassicMove> | null = null;
// The last position the search gave up on, so asking again answers at once.
let unsolved: { game: string; key: string } | null = null;

function exactKey(board: ClassicBoard) {
  return boardKey(board, { pilesDiffer: true } as ClassicRules);
}

function isStillLegal(
  move: ClassicMove,
  board: ClassicBoard,
  rules: ClassicRules,
) {
  return listClassicMoves(board, rules).some(
    (candidate) =>
      candidate.cards[0].id === move.cards[0].id &&
      candidate.cards.length === move.cards.length &&
      candidate.to.kind === move.to.kind &&
      ("pile" in candidate.to ? candidate.to.pile : candidate.to.cell) ===
        ("pile" in move.to ? move.to.pile : move.to.cell),
  );
}

function rememberLine(
  board: ClassicBoard,
  moves: ClassicMove[],
  rules: ClassicRules,
) {
  line = new Map();
  let current = board;
  for (const move of moves) {
    line.set(exactKey(current), move);
    current = applyClassicMove(current, move, rules);
  }
}

function followLine(board: ClassicBoard, rules: ClassicRules) {
  const move = line?.get(exactKey(board));
  return move && isStillLegal(move, board, rules) ? move : null;
}

/**
 * The first move of a win from here; when no win turns up in time, of the
 * line toward the best position seen.
 */
function searchMove(
  board: ClassicBoard,
  rules: ClassicRules,
  game: string,
  limits: { budget?: number; maxMs?: number },
): ClassicMove | null {
  const key = exactKey(board);
  if (unsolved?.game === game && unsolved.key === key) return null;
  const { win, toward } = solveClassic(board, rules, limits);
  const moves = win ?? toward;
  if (!win) unsolved = { game, key };
  if (!moves || moves.length === 0) return null;
  rememberLine(board, moves, rules);
  return moves[0];
}

// ── Looking a few moves ahead (cards may be hidden) ─────────────────────────

function progressOf(board: ClassicBoard) {
  let home = 0;
  for (const pile of board.foundations) home += pile.length;
  let hiddenTops = 0;
  let empty = 0;
  for (const pile of board.tableau) {
    if (pile.length === 0) empty += 1;
    else if (!pile[pile.length - 1].faceUp) hiddenTops += 1;
  }
  let reserved = 0;
  for (const pile of board.reserves ?? []) reserved += pile.length;
  return { home, hiddenTops, empty, reserved };
}

/**
 * The shortest line (up to `depth` moves) that turns up a
 * hidden card, plays a card home, plays a reserve card or empties a column:
 * what a good player looks for when no single move helps. Hidden cards stay
 * hidden: the line only uses cards on view.
 */
export function planClassicProgress(
  board: ClassicBoard,
  rules: ClassicRules,
  { depth = 4, budget = 3000 }: { depth?: number; budget?: number } = {},
): ClassicMove[] | null {
  const start = progressOf(board);
  const seen = new Set([boardKey(board, rules)]);
  let layer: { board: ClassicBoard; moves: ClassicMove[] }[] = [
    { board, moves: [] },
  ];
  let generated = 0;

  for (let level = 0; level < depth && layer.length > 0; level += 1) {
    const next: typeof layer = [];
    let best: { moves: ClassicMove[]; worth: number } | null = null;
    for (const node of layer) {
      for (const move of listClassicMoves(node.board, rules)) {
        if (
          move.from.kind === "tableau" &&
          move.from.index === 0 &&
          move.to.kind === "tableau" &&
          node.board.tableau[move.to.pile].length === 0
        ) {
          continue;
        }
        const after = applyClassicMove(node.board, move, rules);
        const key = boardKey(after, rules);
        if (seen.has(key)) continue;
        seen.add(key);
        generated += 1;
        const moves = [...node.moves, move];
        const now = progressOf(after);
        const worth =
          (now.hiddenTops - start.hiddenTops) * 4 +
          (now.home - start.home) * 3 +
          (start.reserved - now.reserved) * 2 +
          (now.empty > start.empty ? 1 : 0);
        if (worth > 0 && (!best || worth > best.worth)) {
          best = { moves, worth };
        }
        next.push({ board: after, moves });
        if (generated >= budget) break;
      }
      if (generated >= budget) break;
    }
    if (best) return best.moves;
    layer = next;
  }
  return null;
}

// ── The hint ─────────────────────────────────────────────────────────────────

export function classicMoveHint(move: ClassicMove, zones: ClassicZones): Hint {
  const { to, cards } = move;
  const destination =
    to.kind === "foundation"
      ? zones.foundation(to.pile)
      : to.kind === "tableau"
        ? zones.tableau(to.pile)
        : zones.cell?.(to.cell);
  const message: HintMessageKey =
    to.kind === "foundation"
      ? "toFoundation"
      : to.kind === "cell"
        ? "toCell"
        : cards.length > 1
          ? "moveCards"
          : "moveCard";
  return makeHint(
    message,
    cardTarget(cards[0]),
    destination ? [zoneTarget(destination)] : [],
  );
}

/** The best move on view, ranked as an expert would (see the top of file). */
export function bestClassicMove(
  board: ClassicBoard,
  rules: ClassicRules,
): { move: ClassicMove; score: number } | null {
  const quality = defaultQuality(rules, board);
  let best: { move: ClassicMove; score: number } | null = null;
  for (const move of listClassicMoves(board, rules)) {
    const score = scoreMove(move, board, rules, quality);
    if (score !== null && (!best || score > best.score)) best = { move, score };
  }
  return best;
}

const STOCK_SCORE = 100;

export function findClassicHint(
  board: ClassicBoard,
  rules: ClassicRules,
  zones: ClassicZones,
  { stock = null, search, searchBudget }: Options = {},
): Hint | null {
  const planned = followLine(board, rules);
  if (planned) return classicMoveHint(planned, zones);
  if (search && !stock) {
    const move = searchMove(board, rules, search, { budget: searchBudget });
    if (move) return classicMoveHint(move, zones);
  }
  const best = bestClassicMove(board, rules);
  if (best && best.score > STOCK_SCORE) {
    return classicMoveHint(best.move, zones);
  }
  // Nothing helps right away: look a few moves ahead before the stock.
  const plan = planClassicProgress(board, rules);
  if (plan) {
    rememberLine(board, plan, rules);
    return classicMoveHint(plan[0], zones);
  }
  if (stock) {
    return makeHint(
      {
        key: stock.message,
        ...(stock.label ? { values: { label: stock.label } } : {}),
      },
      zoneTarget(stock.zone),
    );
  }
  return best ? classicMoveHint(best.move, zones) : null;
}

/** Common tableau build rules. */
export function buildsDown(card: PlayingCard, base: PlayingCard) {
  return rankValue(card) === rankValue(base) - 1;
}
