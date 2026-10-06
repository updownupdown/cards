import type { PlayingCard } from "@/components/Cards/card-utils";
import {
  classicMoveHint,
  findClassicHint,
  listClassicMoves,
  type ClassicBoard,
  type StockAction,
} from "./classic";
import type { Hint } from "./hint";

type SpiderHintOptions = {
  /** May the cards from `index` up move together? */
  canLift: (pile: PlayingCard[], index: number) => boolean;
  /** May the card go on this one (or an empty pile, when undefined)? */
  canBuild: (card: PlayingCard, base: PlayingCard | undefined) => boolean;
  /** A finished King-to-Ace run, which leaves the table on its own. */
  isComplete: (cards: PlayingCard[]) => boolean;
  stock: StockAction | null;
  /** Names the game when every card is on view, to search for a win. */
  search?: string;
  tableauZone: (pile: number) => string;
};

/** Takes finished runs off the table, as the Spider games do. */
function settleRuns(
  isComplete: (cards: PlayingCard[]) => boolean,
): (board: ClassicBoard) => ClassicBoard {
  return (board) => {
    let next = board;
    board.tableau.forEach((pile, index) => {
      if (pile.length < 13 || !isComplete(pile.slice(-13))) return;
      if (next === board) {
        next = {
          ...board,
          tableau: [...board.tableau],
          foundations: [...board.foundations],
        };
      }
      const empty = next.foundations.findIndex((home) => home.length === 0);
      const home = empty >= 0 ? empty : 0;
      next.foundations[home] = [...next.foundations[home], ...pile.slice(-13)];
      next.tableau[index] = pile.slice(0, -13);
    });
    return next;
  };
}

/**
 * Spider hints: build down in suit where possible (a run of one suit can
 * move, and finishes), turn up hidden cards, and deal a new row only when the
 * table has nothing better. Rows can't be dealt over an empty column, so
 * then the hint fills one.
 */
export function findSpiderHint(
  board: ClassicBoard,
  options: SpiderHintOptions,
): Hint | null {
  const rules = {
    toFoundation: () => false,
    toTableau: (cards: PlayingCard[], pile: PlayingCard[]) =>
      options.canBuild(cards[0], pile.at(-1)),
    canLift: options.canLift,
    buildQuality: (card: PlayingCard, base: PlayingCard) =>
      !options.canBuild(card, base) ? 0 : card.suit === base.suit ? 2 : 1,
    afterMove: settleRuns(options.isComplete),
    bonus: (_move: unknown, before: ClassicBoard, after: ClassicBoard) => {
      const home = (state: ClassicBoard) =>
        state.foundations.reduce((sum, pile) => sum + pile.length, 0);
      return home(after) > home(before) ? 900 : 0;
    },
  } as const;
  const zones = {
    tableau: options.tableauZone,
    foundation: () => options.tableauZone(0),
  };

  const hint = findClassicHint(board, rules, zones, {
    stock: options.stock,
    search: options.search,
  });
  if (hint) return hint;

  // A row can't be dealt while a column is empty: fill one.
  const hasEmpty = board.tableau.some((pile) => pile.length === 0);
  if (!hasEmpty) return null;
  const fill = listClassicMoves(board, rules)
    .filter(
      (move) =>
        move.to.kind === "tableau" &&
        board.tableau[move.to.pile].length === 0 &&
        !(move.from.kind === "tableau" && move.from.index === 0),
    )
    // The shortest run, so the least is taken apart.
    .sort((a, b) => a.cards.length - b.cards.length)[0];
  return fill ? classicMoveHint(fill, zones) : null;
}
