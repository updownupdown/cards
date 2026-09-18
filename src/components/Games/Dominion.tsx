import { useStateManager } from "@/hooks/useStateManager";
import { delay } from "@/utils/utils";
import { useEffect, useMemo, useState } from "react";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import {
  cardLabel,
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

import { i18n } from "@/i18n";
const BOARD_COLS = 5;
const BOARD_ROWS = 3;
const BOARD_CELLS = BOARD_COLS * BOARD_ROWS;
const RESERVE_SIZE = 3;
const MAX_INITIAL_DEAL_ATTEMPTS = 20;

type GameState = {
  board: PlayingCard[][];
  reserve: PlayingCard[];
  reserveActive: PlayingCard | null;
  discard: PlayingCard[];
  ended: boolean;
  won: boolean;
};

const gameStateInitial: GameState = {
  board: Array.from({ length: BOARD_CELLS }, () => []),
  reserve: [],
  reserveActive: null,
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
    ...game.reserve,
    ...(game.reserveActive ? [game.reserveActive] : []),
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

function findIsolatedCard(board: PlayingCard[][], reserve: PlayingCard[] = []) {
  const exposedCards = board
    .map((pile) => topCard(pile))
    .filter((card): card is PlayingCard => !!card);
  const cardsInPlay = [...exposedCards, ...reserve];

  return cardsInPlay.find(
    (card) =>
      !cardsInPlay.some(
        (other) =>
          other !== card &&
          (other.rank === card.rank || other.suit === card.suit),
      ),
  );
}

function dealInitialGame(
  cards: PlayingCard[],
  shuffleCards: (cards: PlayingCard[]) => PlayingCard[] = shuffle,
) {
  let deck = cards;

  for (let attempt = 0; attempt < MAX_INITIAL_DEAL_ATTEMPTS; attempt += 1) {
    deck = shuffleCards(cards);
    const board = deck.slice(0, BOARD_CELLS).map((card) => [flipToFace(card)]);
    const reserve = deck
      .slice(BOARD_CELLS, BOARD_CELLS + RESERVE_SIZE)
      .map(flipToBack);

    if (!findIsolatedCard(board, reserve)) {
      return {
        board,
        reserve,
        discard: deck.slice(BOARD_CELLS + RESERVE_SIZE).map(flipToBack),
      };
    }
  }

  return {
    board: deck.slice(0, BOARD_CELLS).map((card) => [flipToFace(card)]),
    reserve: deck
      .slice(BOARD_CELLS, BOARD_CELLS + RESERVE_SIZE)
      .map(flipToBack),
    discard: deck.slice(BOARD_CELLS + RESERVE_SIZE).map(flipToBack),
  };
}

export const dominionRules = {
  topCard,
  collectCards,
  canConquer,
  conquerPile,
  dealInitialGame,
  findIsolatedCard,
  updateOutcome,
};

function updateOutcome(draft: GameState) {
  if (draft.reserveActive) return;

  const cardsInPlay = draft.board.filter((pile) => pile.length > 0).length;
  if (cardsInPlay === 1 && draft.reserve.length === 0) {
    draft.ended = true;
    draft.won = true;
    return;
  }

  if (draft.reserve.length === 0 && findIsolatedCard(draft.board)) {
    draft.ended = true;
    draft.won = false;
    return;
  }

  const canDrawReserve = draft.reserve.length > 0 && cardsInPlay < BOARD_CELLS;
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
    draft.reserve = [];
    draft.reserveActive = null;
    draft.discard = allCards.map(flipToBack);
    draft.ended = false;
    draft.won = false;
  });

  await delay();

  setGame((draft) => {
    const nextDeal = dealInitialGame(draft.discard);
    draft.board = nextDeal.board;
    draft.reserve = nextDeal.reserve;
    draft.discard = nextDeal.discard;
    updateOutcome(draft);
  });
}

export default function Dominion() {
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
      game.reserveActive ||
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
    if (game.ended || game.reserveActive) return;
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
      game.reserveActive ||
      game.reserve.length === 0 ||
      !game.board.some((pile) => pile.length === 0)
    ) {
      return;
    }

    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const next = draft.reserve.pop();
      draft.reserveActive = next ? flipToFace(next) : null;
      updateOutcome(draft);
    });
    setSelectedIndex(null);
  }

  function placeReserve(index: number) {
    if (game.ended || !game.reserveActive || game.board[index].length > 0)
      return;

    saveUndoState(structuredClone(game));
    setGame((draft) => {
      if (!draft.reserveActive || draft.board[index].length > 0) return;
      draft.board[index] = [draft.reserveActive];
      draft.reserveActive = null;
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
        placeholder: {
          text: i18n.t("cards:discard"),
          infoPos: "left",
          showCount: false,
        },
        fan: { maxVisible: 3 },
      },
      {
        id: "reserve",
        name: "reserve",
        cards: game.reserve,
        col: 0,
        row: 0,
        baseZIndex: 30,
        fan: { maxVisible: 3 },
        placeholder: {
          text: i18n.t("cards:reserve"),
          infoPos: "right",
          showCount: true,
        },
      },
      {
        id: "reserveActive",
        name: "reserveActive",
        cards: game.reserveActive ? [game.reserveActive] : [],
        col: 2,
        row: 0,
        baseZIndex: 35,
        placeholder: { showCount: false },
      },
      ...boardZones,
    ];
  }, [game.board, game.discard, game.reserve, game.reserveActive]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (mappedCard.zoneName === "reserve") {
      const canDraw =
        mappedCard.topOfZone &&
        !game.ended &&
        !game.reserveActive &&
        game.board.some((pile) => pile.length === 0);

      return {
        onPress: drawReserve,
        isDisabled: !canDraw,
      };
    } else if (mappedCard.zoneName === "reserveActive") {
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
        isDisabled: !mappedCard.topOfZone || game.ended || !!game.reserveActive,
        isSelected: isSelected,
        selectColor: isLegalTarget ? "green" : "blue",
        forceOverlayColor: isSelected || isLegalTarget,
      };
    }
  };

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    if (zone.name === "reserve") {
      return {
        onPress: drawReserve,
        isDisabled:
          game.ended ||
          !!game.reserveActive ||
          game.reserve.length === 0 ||
          !game.board.some((pile) => pile.length === 0),
      };
    }

    if (zone.name === "board" && zone.pileIndex !== undefined) {
      const index = zone.pileIndex;
      return {
        onPress: () => placeReserve(index),
        isDisabled:
          game.ended || !game.reserveActive || game.board[index].length > 0,
        isSelected: !!game.reserveActive && game.board[index].length === 0,
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
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      reset={reset}
      isLoaded={isLoaded}
      winLoseMessage={
        game.won
          ? i18n.t("games:dominion.allEighteenCardsBelongTo")
          : findIsolatedCard(game.board)
            ? i18n.t("games:dominion.theWasIsolatedWithNo", {
                value: cardLabel(findIsolatedCard(game.board)),
              })
            : i18n.t("games:dominion.noConquestsOrReservePlacements")
      }
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}
    </GameWrapper>
  );
}
