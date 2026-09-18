import { useStateManager } from "@/hooks/useStateManager";
import { useMemo } from "react";
import { AnimatedCardMapping } from "../Cards/AnimatedCard";
import { CardRank, PlayingCard, SUITS } from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";

import { i18n } from "@/i18n";
const GRID_SIZE = 4;
const CELL_COUNT = GRID_SIZE * GRID_SIZE;
const PUZZLE_RANKS: CardRank[] = ["A", "2", "3", "4"];

type GameState = {
  cells: (PlayingCard | null)[];
  moves: number;
  won: boolean;
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

  return { cells, moves: 0, won: false };
}

export const fifteenPuzzleRules = { adjacentIndices, moveCell, isSolved };

const gameStateInitial = createInitialState();

export default function FifteenPuzzle() {
  const { isLoaded, game, setGame, reset, undo, canUndo, saveUndoState } =
    useStateManager<GameState>({
      gameStateInitial,
      resetAndSetup: async () => {
        const next = createInitialState();
        setGame((draft) => void Object.assign(draft, next));
      },
    });

  const emptyIndex = game.cells.indexOf(null);
  const movable = useMemo(
    () => new Set(adjacentIndices(emptyIndex)),
    [emptyIndex],
  );
  const zones = useMemo<MapZone[]>(
    () =>
      game.cells.map((card, index) => ({
        id: `cell-${index}`,
        name: "cell",
        pileIndex: index,
        cards: card ? [card] : [],
        col: index % GRID_SIZE,
        row: Math.floor(index / GRID_SIZE),
        baseZIndex: 5,
      })),
    [game.cells],
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
