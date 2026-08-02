import { useStateManager } from "@/hooks/useStateManager";
import { delay } from "@/utils/utils";
import { useEffect, useMemo, useState } from "react";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import {
  createDeck,
  flipToBack,
  flipToFace,
  shuffle,
  type PlayingCard,
} from "../Cards/card-utils";
import {
  getGridColRows,
  MappedCard,
  MapZone,
  useCardMap,
} from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";

const BOARD_COLS = 5;
const BOARD_ROWS = 3;
const BOARD_CELLS = BOARD_COLS * BOARD_ROWS;
const RESERVE_SIZE = 3;

type GameState = {
  board: PlayingCard[][];
  stock: PlayingCard[];
  reserve: PlayingCard | null;
  discard: PlayingCard[];
  ended: boolean;
  won: boolean;
};

const gameStateInitial: GameState = {
  board: Array.from({ length: BOARD_CELLS }, () => []),
  stock: [],
  reserve: null,
  discard: createDeck().map(flipToBack),
  ended: false,
  won: false,
};

function topCard(pile: PlayingCard[]) {
  return pile[pile.length - 1];
}

function collectCards(game: GameState) {
  return [
    ...game.board.flat(),
    ...game.stock,
    ...(game.reserve ? [game.reserve] : []),
    ...game.discard,
  ];
}

function conquerPile(
  board: PlayingCard[][],
  sourceIndex: number,
  targetIndex: number,
) {
  board[targetIndex] = [...board[targetIndex], ...board[sourceIndex]];
  board[sourceIndex] = [];
}

function cardsMatch(first: PlayingCard, second: PlayingCard) {
  return first.rank === second.rank || first.suit === second.suit;
}

function hasClearPath(
  board: PlayingCard[][],
  sourceIndex: number,
  targetIndex: number,
) {
  const sourceRow = Math.floor(sourceIndex / BOARD_COLS);
  const sourceCol = sourceIndex % BOARD_COLS;
  const targetRow = Math.floor(targetIndex / BOARD_COLS);
  const targetCol = targetIndex % BOARD_COLS;
  const rowDistance = Math.abs(sourceRow - targetRow);
  const colDistance = Math.abs(sourceCol - targetCol);

  if (rowDistance <= 1 && colDistance <= 1) return true;

  if (sourceRow === targetRow) {
    const step = sourceCol < targetCol ? 1 : -1;
    for (let col = sourceCol + step; col !== targetCol; col += step) {
      if (board[sourceRow * BOARD_COLS + col].length > 0) return false;
    }
    return true;
  }

  if (sourceCol === targetCol) {
    const step = sourceRow < targetRow ? 1 : -1;
    for (let row = sourceRow + step; row !== targetRow; row += step) {
      if (board[row * BOARD_COLS + sourceCol].length > 0) return false;
    }
    return true;
  }

  return false;
}

function canConquer(
  board: PlayingCard[][],
  sourceIndex: number,
  targetIndex: number,
) {
  if (sourceIndex === targetIndex) return false;
  const source = topCard(board[sourceIndex]);
  const target = topCard(board[targetIndex]);
  return !!(
    source &&
    target &&
    cardsMatch(source, target) &&
    hasClearPath(board, sourceIndex, targetIndex)
  );
}

function hasConquest(board: PlayingCard[][]) {
  return board.some((source, sourceIndex) =>
    source.length > 0
      ? board.some((_, targetIndex) =>
          canConquer(board, sourceIndex, targetIndex),
        )
      : false,
  );
}

export const empireRules = {
  topCard,
  collectCards,
  canConquer,
  conquerPile,
};

function updateOutcome(draft: GameState) {
  if (draft.reserve) return;

  const cardsInPlay = draft.board.filter((pile) => pile.length > 0).length;
  if (cardsInPlay === 1 && draft.stock.length === 0) {
    draft.ended = true;
    draft.won = true;
    return;
  }

  const canDrawReserve = draft.stock.length > 0 && cardsInPlay < BOARD_CELLS;
  if (!hasConquest(draft.board) && !canDrawReserve) {
    draft.ended = true;
    draft.won = false;
  }
}

async function resetAndSetup(
  setGame: (updater: (draft: GameState) => void) => void,
) {
  // Gather all cards to discard
  setGame((draft) => {
    const allCards = collectCards(draft);

    draft.board = Array.from({ length: BOARD_CELLS }, () => []);
    draft.stock = [];
    draft.reserve = null;
    draft.discard = allCards.map(flipToBack);
    draft.ended = false;
    draft.won = false;
  });

  await delay();

  setGame((draft) => {
    const deck = shuffle(draft.discard);
    draft.board = deck.slice(0, BOARD_CELLS).map((card) => [flipToFace(card)]);
    draft.stock = deck
      .slice(BOARD_CELLS, BOARD_CELLS + RESERVE_SIZE)
      .map(flipToBack);
    draft.discard = deck.slice(BOARD_CELLS + RESERVE_SIZE).map(flipToBack);
    updateOutcome(draft);
  });
}

export default function Empire() {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const { isLoaded, game, setGame, undo, canUndo, saveUndoState, reset } =
    useStateManager({
      resetAndSetup: async () => {
        setSelectedIndex(null);
        await resetAndSetup(setGame);
      },
      gameStateInitial,
    });

  useEffect(() => {
    if (selectedIndex !== null && game.board[selectedIndex].length === 0) {
      setSelectedIndex(null);
    }
  }, [game.board, selectedIndex]);

  const legalTargets = useMemo(
    () =>
      selectedIndex === null
        ? []
        : game.board.flatMap((_, index) =>
            canConquer(game.board, selectedIndex, index) ? [index] : [],
          ),
    [game.board, selectedIndex],
  );

  function conquer(targetIndex: number) {
    if (
      game.ended ||
      game.reserve ||
      selectedIndex === null ||
      !canConquer(game.board, selectedIndex, targetIndex)
    ) {
      return;
    }

    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const source = draft.board[selectedIndex];
      if (source.length === 0) return;
      conquerPile(draft.board, selectedIndex, targetIndex);
      updateOutcome(draft);
    });
    setSelectedIndex(null);
  }

  function pressBoardCard(index: number) {
    if (game.ended || game.reserve) return;
    if (selectedIndex === index) {
      setSelectedIndex(null);
    } else if (selectedIndex !== null && legalTargets.includes(index)) {
      conquer(index);
    } else {
      setSelectedIndex(index);
    }
  }

  function drawReserve() {
    if (
      game.ended ||
      game.reserve ||
      game.stock.length === 0 ||
      !game.board.some((pile) => pile.length === 0)
    ) {
      return;
    }

    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const next = draft.stock.pop();
      draft.reserve = next ? flipToFace(next) : null;
    });
    setSelectedIndex(null);
  }

  function placeReserve(index: number) {
    if (game.ended || !game.reserve || game.board[index].length > 0) return;

    saveUndoState(structuredClone(game));
    setGame((draft) => {
      if (!draft.reserve || draft.board[index].length > 0) return;
      draft.board[index] = [draft.reserve];
      draft.reserve = null;
      updateOutcome(draft);
    });
  }

  const zones: MapZone[] = useMemo(() => {
    const boardZones = getGridColRows({
      cols: BOARD_COLS,
      rows: BOARD_ROWS,
      rowOffset: 1.35,
    }).map((position, index) => ({
      id: `board-${index}`,
      name: "board",
      pileIndex: index,
      cards: game.board[index],
      col: position.c,
      row: position.r,
      baseZIndex: 1,
      placeholder: {},
      fan: { maxVisible: 1 },
    }));

    return [
      {
        id: "discard",
        name: "discard",
        cards: game.discard,
        col: BOARD_COLS - 1,
        row: 0,
        baseZIndex: 20,
        placeholder: { text: "Discard", showCount: true },
        fan: { maxVisible: 3 },
      },
      {
        id: "stock",
        name: "stock",
        cards: game.stock,
        col: 0,
        row: 0,
        baseZIndex: 30,
        fan: { maxVisible: 3 },
        placeholder: { text: "Reserve", infoPos: "right", showCount: true },
      },
      {
        id: "reserve",
        name: "reserve",
        cards: game.reserve ? [game.reserve] : [],
        col: 2,
        row: 0,
        baseZIndex: 35,
        placeholder: { showCount: false },
      },
      ...boardZones,
    ];
  }, [game.board, game.discard, game.reserve, game.stock]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (mappedCard.zoneName === "stock") {
      const canDraw =
        mappedCard.topOfZone &&
        !game.ended &&
        !game.reserve &&
        game.board.some((pile) => pile.length === 0);

      return {
        onPress: drawReserve,
        isDisabled: !canDraw,
      };
    } else if (mappedCard.zoneName === "reserve") {
      return {
        isDisabled: true,
        selectColor: "purple",
        // forceOverlayColor: true,
        // forceSelectColor: true,
        isSelected: true,
      };
    } else if (
      mappedCard.zoneName === "board" &&
      mappedCard.pileIndex !== undefined
    ) {
      const index = mappedCard.pileIndex;
      const isSelected = selectedIndex === index;
      const isLegalTarget = legalTargets.includes(index);

      return {
        onPress: () => pressBoardCard(index),
        isDisabled: !mappedCard.topOfZone || game.ended || !!game.reserve,
        isSelected: isSelected,
        selectColor: isLegalTarget ? "green" : "blue",
        forceOverlayColor: isSelected || isLegalTarget,
      };
    }
  };

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    if (zone.name === "stock") {
      return {
        onPress: drawReserve,
        isDisabled:
          game.ended ||
          !!game.reserve ||
          game.stock.length === 0 ||
          !game.board.some((pile) => pile.length === 0),
      };
    }

    if (zone.name === "board" && zone.pileIndex !== undefined) {
      const index = zone.pileIndex;
      return {
        onPress: () => placeReserve(index),
        isDisabled: game.ended || !game.reserve || game.board[index].length > 0,
        isSelected: !!game.reserve && game.board[index].length === 0,
        forceOverlayColor: true,
      };
    }

    return {};
  };

  const { cardMap } = useCardMap({
    game,
    zones,
    zoneMapper,
    cardMapper,
    cardSize: "regular",
    gap: 0.12,
    fixedCols: BOARD_COLS,
    fixedRows: 4.5,
  });

  return (
    <GameWrapper
      ended={game.ended}
      won={game.won}
      reset={reset}
      isLoaded={isLoaded}
      winLoseMessage={
        game.won
          ? "All eighteen cards belong to one empire."
          : "No conquests or reserve placements remain."
      }
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}
    </GameWrapper>
  );
}
