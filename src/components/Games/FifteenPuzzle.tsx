import { useStateManager } from "@/hooks/useStateManager";
import { useMemo } from "react";
import { AnimatedCardMapping } from "../Cards/AnimatedCard";
import {
  CardRank,
  collectCards,
  flipAllToBack,
  PlayingCard,
  shuffle,
  SUITS,
} from "../Cards/card-utils";
import { delay } from "@/utils/utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";

import { i18n } from "@/i18n";
import { useHint } from "@/hints/hint-store";
import { cardTarget, makeHint } from "@/hints/hint";
const GRID_SIZE = 4;
const CELL_COUNT = GRID_SIZE * GRID_SIZE;
const PUZZLE_RANKS: CardRank[] = ["A", "2", "3", "4"];

type GameState = {
  cells: (PlayingCard | null)[];
  moves: number;
  won: boolean;
  /** Every tile, face down, while the puzzle is being gathered and dealt. */
  deal: PlayingCard[];
};

function createSolvedCells(): (PlayingCard | null)[] {
  const cards = SUITS.flatMap((suit) =>
    PUZZLE_RANKS.map((rank) => ({
      id: `fifteen-${suit}-${rank}`,
      suit,
      rank,
      faceUp: true,
    })),
  );
  return [...cards.slice(0, CELL_COUNT - 1), null];
}

const SOLVED_CELLS = createSolvedCells();

function adjacentIndices(index: number) {
  const row = Math.floor(index / GRID_SIZE);
  const col = index % GRID_SIZE;
  return [
    ...(row > 0 ? [index - GRID_SIZE] : []),
    ...(row < GRID_SIZE - 1 ? [index + GRID_SIZE] : []),
    ...(col > 0 ? [index - 1] : []),
    ...(col < GRID_SIZE - 1 ? [index + 1] : []),
  ];
}

function moveCell(cells: (PlayingCard | null)[], index: number) {
  const emptyIndex = cells.indexOf(null);
  if (!adjacentIndices(emptyIndex).includes(index)) return cells;
  const next = [...cells];
  [next[index], next[emptyIndex]] = [next[emptyIndex], next[index]];
  return next;
}

function isSolved(cells: (PlayingCard | null)[]) {
  return cells.every((card, index) => card?.id === SOLVED_CELLS[index]?.id);
}

function createInitialState(): GameState {
  let cells = [...SOLVED_CELLS];
  let emptyIndex = CELL_COUNT - 1;
  let previousEmpty = -1;

  for (let move = 0; move < 160; move += 1) {
    const choices = adjacentIndices(emptyIndex).filter(
      (index) => index !== previousEmpty,
    );
    const chosen = choices[Math.floor(Math.random() * choices.length)];
    previousEmpty = emptyIndex;
    cells = moveCell(cells, chosen);
    emptyIndex = chosen;
  }

  return { cells, moves: 0, won: false, deal: [] };
}

/** The grid cleared, with every tile gathered face down into the deal pile. */
function gatherState(state: GameState): GameState {
  return {
    cells: Array.from({ length: CELL_COUNT }, () => null),
    moves: 0,
    won: false,
    deal: shuffle(flipAllToBack(collectCards(state))),
  };
}

// The solution the last hint found: for each position, the cell to slide.
let solutionPath = new Map<string, number>();

/**
 * Slides tiles home along a short solution found by a weighted A* search
 * (how far each tile is from home guides it), remembered so the hints along
 * it come at once. If none turns up in time, the slide that brings the tiles
 * closest to home.
 */
function findFifteenPuzzleHint(state: GameState) {
  // Each cell's tile as its home cell; the gap is the last cell.
  const homeOf = new Map(SOLVED_CELLS.map((card, index) => [card?.id, index]));
  const start = state.cells.map((card) =>
    card ? homeOf.get(card.id)! : CELL_COUNT - 1,
  );
  const key = (tiles: number[]) => tiles.join(",");
  const distance = (tiles: number[]) =>
    tiles.reduce((sum, home, at) => {
      if (home === CELL_COUNT - 1) return sum;
      return (
        sum +
        Math.abs((home % GRID_SIZE) - (at % GRID_SIZE)) +
        Math.abs(Math.floor(home / GRID_SIZE) - Math.floor(at / GRID_SIZE))
      );
    }, 0);
  const slide = (tiles: number[], cell: number) => {
    const gap = tiles.indexOf(CELL_COUNT - 1);
    const next = [...tiles];
    [next[cell], next[gap]] = [next[gap], next[cell]];
    return next;
  };
  const hintFor = (cell: number) =>
    makeHint("tapCard", cardTarget(state.cells[cell]!));

  const startKey = key(start);
  const known = solutionPath.get(startKey);
  if (known !== undefined) return hintFor(known);
  if (distance(start) === 0) return null;

  type Node = { tiles: number[]; cost: number; priority: number };
  const parent = new Map<string, { from: string; cell: number }>();
  const best = new Map([[startKey, 0]]);
  const heap: Node[] = [{ tiles: start, cost: 0, priority: 0 }];
  const push = (node: Node) => {
    heap.push(node);
    for (let i = heap.length - 1; i > 0; ) {
      const up = (i - 1) >> 1;
      if (heap[up].priority <= heap[i].priority) break;
      [heap[up], heap[i]] = [heap[i], heap[up]];
      i = up;
    }
  };
  const pop = () => {
    const first = heap[0];
    const last = heap.pop()!;
    if (heap.length > 0) {
      heap[0] = last;
      for (let i = 0; ; ) {
        const left = i * 2 + 1;
        const right = left + 1;
        let low = i;
        if (left < heap.length && heap[left].priority < heap[low].priority)
          low = left;
        if (right < heap.length && heap[right].priority < heap[low].priority)
          low = right;
        if (low === i) break;
        [heap[low], heap[i]] = [heap[i], heap[low]];
        i = low;
      }
    }
    return first;
  };

  // A slow phone stops early and gets the nearest slide instead.
  const startedAt = Date.now();
  for (
    let expanded = 0;
    heap.length > 0 && expanded < 60000 && Date.now() - startedAt < 400;
    expanded += 1
  ) {
    const node = pop();
    const nodeKey = key(node.tiles);
    if (distance(node.tiles) === 0) {
      solutionPath = new Map();
      let first = -1;
      for (let at = parent.get(nodeKey); at; at = parent.get(at.from)) {
        solutionPath.set(at.from, at.cell);
        first = at.cell;
      }
      return hintFor(first);
    }
    for (const cell of adjacentIndices(node.tiles.indexOf(CELL_COUNT - 1))) {
      const tiles = slide(node.tiles, cell);
      const tilesKey = key(tiles);
      const cost = node.cost + 1;
      if (cost >= (best.get(tilesKey) ?? Infinity)) continue;
      best.set(tilesKey, cost);
      parent.set(tilesKey, { from: nodeKey, cell });
      push({ tiles, cost, priority: cost + 2 * distance(tiles) });
    }
  }

  const gap = start.indexOf(CELL_COUNT - 1);
  const closest = adjacentIndices(gap).reduce((pick, cell) =>
    distance(slide(start, cell)) < distance(slide(start, pick)) ? cell : pick,
  );
  return hintFor(closest);
}

export const fifteenPuzzleRules = {
  findHint: findFifteenPuzzleHint,
  adjacentIndices,
  moveCell,
  isSolved,
};

// Starts with every tile in the deal pile, to be dealt out from there.
const gameStateInitial = gatherState(createInitialState());

export default function FifteenPuzzle() {
  const {
    isLoaded,
    isSettingUp,
    game,
    setGame,
    reset,
    undo,
    canUndo,
    saveUndoState,
  } = useStateManager<GameState>({
    gameStateInitial,
    resetAndSetup: async () => {
      // Gather every tile into the deal pile, then deal them back out.
      setGame((draft) => gatherState(draft));
      await delay();
      setGame(() => createInitialState());
    },
  });

  useHint(() => findFifteenPuzzleHint(game), {
    game,
    enabled: !isSettingUp && !game.won && !game.deal.length,
  });

  const emptyIndex = game.cells.indexOf(null);
  const movable = useMemo(
    () => new Set(adjacentIndices(emptyIndex)),
    [emptyIndex],
  );
  const zones = useMemo<MapZone[]>(
    () => [
      ...game.cells.map((card, index) => ({
        id: `cell-${index}`,
        name: "cell",
        pileIndex: index,
        cards: card ? [card] : [],
        col: index % GRID_SIZE,
        row: Math.floor(index / GRID_SIZE),
        baseZIndex: 5,
      })),
      {
        id: "deal",
        name: "deal",
        cards: game.deal,
        col: (GRID_SIZE - 1) / 2,
        row: (GRID_SIZE - 1) / 2,
        baseZIndex: 20,
        fan: { maxVisible: 3 },
      },
    ],
    [game.cells, game.deal],
  );

  function selectCell(index: number) {
    if (game.won || !movable.has(index)) return;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      draft.cells = moveCell(draft.cells, index);
      draft.moves += 1;
      draft.won = isSolved(draft.cells);
    });
  }

  const cardMapper = (mappedCard: MappedCard): AnimatedCardMapping => {
    const index = mappedCard.pileIndex ?? -1;
    const isSolved = SOLVED_CELLS[index]?.id === game.cells[index]?.id;

    return {
      onPress: () => selectCell(index),
      isDisabled: game.won || !movable.has(index),
      forceOverlayColor: isSolved,
      selectColor: isSolved ? "green" : "none",
    };
  };

  const { cardMap } = useCardMap({
    game,
    zones,
    cardMapper,
    cardSize: "small",
    fixedCols: GRID_SIZE,
    fixedRows: GRID_SIZE,
    gap: 0.2,
  });

  return (
    <GameWrapper
      outcome={game.won ? "won" : "playing"}
      reset={() => void reset()}
      isLoaded={isLoaded}
      score={game.moves}
      winLoseMessage={i18n.t("games:fifteenPuzzle.theCardsAreBackIn")}
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}
    </GameWrapper>
  );
}
