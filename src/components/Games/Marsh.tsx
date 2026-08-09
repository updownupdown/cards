import { useStateManager } from "@/hooks/useStateManager";
import { delay } from "@/utils/utils";
import { useMemo, useState } from "react";
import { AnimatedCardMapping } from "../Cards/AnimatedCard";
import {
  createDeck,
  flipToBack,
  flipToFace,
  shuffle,
  type CardSuit,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";
import { View } from "react-native";
import { Text } from "../common/Text";
import { useGameColors } from "@/hooks/useGameColors";
import { flexStyles } from "@/styles/flexStyles";

const BOARD_COLS = 4;
const BOARD_ROWS = 3;
const BOARD_CELLS = BOARD_COLS * BOARD_ROWS;
const TURNS_PER_ROUND = 4;
const BOARD_COL_STEP = 1.42;

type GameState = {
  board: (PlayingCard | null)[];
  stock: PlayingCard[];
  discard: PlayingCard[];
  round: number;
  turn: number;
  movesMade: number;
  ended: boolean;
  won: boolean;
  winLoseMessage: string;
};

export type MarshGameState = GameState;

const gameStateInitial: GameState = {
  board: Array.from({ length: BOARD_CELLS }, () => null),
  stock: createDeck().map(flipToBack),
  discard: [],
  round: 1,
  turn: 1,
  movesMade: 0,
  ended: false,
  won: false,
  winLoseMessage: "",
};

function rowOf(index: number) {
  return Math.floor(index / BOARD_COLS);
}

function colOf(index: number) {
  return index % BOARD_COLS;
}

function orthogonalNeighbors(index: number) {
  const row = rowOf(index);
  const col = colOf(index);
  return [
    row > 0 ? index - BOARD_COLS : -1,
    row < BOARD_ROWS - 1 ? index + BOARD_COLS : -1,
    col > 0 ? index - 1 : -1,
    col < BOARD_COLS - 1 ? index + 1 : -1,
  ].filter((neighbor) => neighbor >= 0);
}

function isAnimal(card: PlayingCard | null, suit: CardSuit) {
  return !!card?.faceUp && card.suit === suit;
}

function lineLengthThrough(
  board: (PlayingCard | null)[],
  index: number,
  suit: CardSuit,
  rowStep: number,
  colStep: number,
) {
  const startRow = rowOf(index);
  const startCol = colOf(index);
  let count = 1;

  for (const direction of [-1, 1]) {
    let row = startRow + rowStep * direction;
    let col = startCol + colStep * direction;
    while (
      row >= 0 &&
      row < BOARD_ROWS &&
      col >= 0 &&
      col < BOARD_COLS &&
      isAnimal(board[row * BOARD_COLS + col], suit)
    ) {
      count += 1;
      row += rowStep * direction;
      col += colStep * direction;
    }
  }

  return count;
}

function makesAnimalLine(
  board: (PlayingCard | null)[],
  index: number,
  suit: CardSuit,
) {
  return (
    lineLengthThrough(board, index, suit, 0, 1) >= 3 ||
    lineLengthThrough(board, index, suit, 1, 0) >= 3
  );
}

function getCollapseMessage(board: (PlayingCard | null)[]) {
  for (let index = 0; index < board.length; index += 1) {
    if (
      isAnimal(board[index], "clubs") &&
      lineLengthThrough(board, index, "clubs", 0, 1) >= 3
    ) {
      return "Three Bears formed a horizontal line.";
    }
    if (
      isAnimal(board[index], "spades") &&
      lineLengthThrough(board, index, "spades", 1, 0) >= 3
    ) {
      return "Three Gators formed a vertical line.";
    }
  }
  return null;
}

function getLegalTargets(board: (PlayingCard | null)[], sourceIndex: number) {
  const source = board[sourceIndex];
  if (!source?.faceUp || source.suit === "diamonds") return [];

  const sourceRow = rowOf(sourceIndex);
  const sourceCol = colOf(sourceIndex);
  const hogHasSupport = orthogonalNeighbors(sourceIndex).some((index) =>
    isAnimal(board[index], "hearts"),
  );

  return orthogonalNeighbors(sourceIndex).filter((targetIndex) => {
    const target = board[targetIndex];
    if (!target) return false;

    const horizontal = rowOf(targetIndex) === sourceRow;
    const vertical = colOf(targetIndex) === sourceCol;
    const isDuck = !target.faceUp;

    if (source.suit === "spades") {
      return horizontal && (isDuck || isAnimal(target, "hearts"));
    }
    if (source.suit === "clubs") {
      return vertical && (isDuck || isAnimal(target, "spades"));
    }
    if (source.suit === "hearts") {
      return (
        (horizontal || vertical) && isAnimal(target, "clubs") && hogHasSupport
      );
    }
    return false;
  });
}

function hasLegalEat(board: (PlayingCard | null)[]) {
  return board.some((_, index) => getLegalTargets(board, index).length > 0);
}

function prepareCard(card: PlayingCard) {
  return card.suit === "diamonds" ? flipToBack(card) : flipToFace(card);
}

function dealOpeningCard(draft: GameState, index: number) {
  const next = draft.stock.pop();
  if (!next) return;

  draft.board[index] = prepareCard(next);
  const placed = draft.board[index];
  if (
    placed?.faceUp &&
    placed.suit !== "diamonds" &&
    makesAnimalLine(draft.board, index, placed.suit)
  ) {
    draft.board[index] = flipToBack(placed);
  }
}

function lose(draft: GameState, message: string) {
  draft.ended = true;
  draft.won = false;
  draft.winLoseMessage = message;
}

function checkForLoss(draft: GameState) {
  const collapseMessage = getCollapseMessage(draft.board);
  if (collapseMessage) {
    lose(draft, collapseMessage);
    return true;
  }
  if (draft.stock.length > 0 && !hasLegalEat(draft.board)) {
    lose(draft, "No animal can move and eat.");
    return true;
  }
  return false;
}

function refillBoard(draft: GameState) {
  for (let index = 0; index < draft.board.length; index += 1) {
    if (draft.board[index]) continue;
    const next = draft.stock.pop();
    if (!next) break;
    draft.board[index] = prepareCard(next);

    if (draft.stock.length === 0) {
      draft.ended = true;
      draft.won = true;
      draft.winLoseMessage = "The last card entered the Marsh.";
      return;
    }
  }
}

function advanceTurn(draft: GameState) {
  refillBoard(draft);
  if (draft.ended || checkForLoss(draft)) return;

  draft.movesMade = 0;
  if (draft.turn === TURNS_PER_ROUND) {
    draft.round += 1;
    draft.turn = 1;
  } else {
    draft.turn += 1;
  }
}

export const marshRules = {
  orthogonalNeighbors,
  makesAnimalLine,
  getCollapseMessage,
  getLegalTargets,
  hasLegalEat,
  prepareCard,
  dealOpeningCard,
  checkForLoss,
  refillBoard,
  advanceTurn,
  boardCells: BOARD_CELLS,
  turnsPerRound: TURNS_PER_ROUND,
};

async function resetAndSetup(
  setGame: (updater: (draft: GameState) => void) => void,
) {
  setGame((draft) => {
    const allCards = [
      ...draft.board.filter((card): card is PlayingCard => card !== null),
      ...draft.stock,
      ...draft.discard,
    ];
    draft.board = Array.from({ length: BOARD_CELLS }, () => null);
    draft.stock = shuffle(
      (allCards.length === 52 ? allCards : createDeck()).map(flipToBack),
    );
    draft.discard = [];
    draft.round = 1;
    draft.turn = 1;
    draft.movesMade = 0;
    draft.ended = false;
    draft.won = false;
    draft.winLoseMessage = "";
  });

  await delay();

  setGame((draft) => {
    for (let index = 0; index < BOARD_CELLS; index += 1) {
      dealOpeningCard(draft, index);
    }
    checkForLoss(draft);
  });
}

export default function Marsh() {
  const { colorPale } = useGameColors();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const { isLoaded, game, setGame, undo, canUndo, saveUndoState, reset } =
    useStateManager({
      resetAndSetup: async () => {
        await resetAndSetup(setGame);
      },
      gameStateInitial,
      resetNonGameStates: () => {
        setSelectedIndex(null);
      },
    });

  const legalTargets = useMemo(
    () =>
      selectedIndex === null ? [] : getLegalTargets(game.board, selectedIndex),
    [game.board, selectedIndex],
  );
  const movableSources = useMemo(
    () =>
      game.board.flatMap((_, index) =>
        getLegalTargets(game.board, index).length > 0 ? [index] : [],
      ),
    [game.board],
  );

  function eat(targetIndex: number) {
    if (
      game.ended ||
      selectedIndex === null ||
      !legalTargets.includes(targetIndex)
    ) {
      return;
    }

    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const source = draft.board[selectedIndex];
      const target = draft.board[targetIndex];
      if (!source || !target) return;

      draft.discard.push(target);
      draft.board[targetIndex] = source;
      draft.board[selectedIndex] = null;
      draft.movesMade += 1;

      if (getCollapseMessage(draft.board)) {
        checkForLoss(draft);
      } else if (draft.movesMade === draft.round) {
        advanceTurn(draft);
      } else {
        checkForLoss(draft);
      }
    });
    setSelectedIndex(null);
  }

  function pressCard(index: number) {
    if (game.ended) return;
    if (selectedIndex === index) {
      setSelectedIndex(null);
    } else if (selectedIndex !== null && legalTargets.includes(index)) {
      eat(index);
    } else if (movableSources.includes(index)) {
      setSelectedIndex(index);
    }
  }

  const zones: MapZone[] = useMemo(() => {
    const boardZones = game.board.map((card, index) => ({
      id: `board-${index}`,
      name: "board",
      pileIndex: index,
      cards: card ? [card] : [],
      col: colOf(index) * BOARD_COL_STEP,
      row: rowOf(index) + 1.3,
      rotation: card?.faceUp && card.suit === "spades" ? 90 : undefined,
      baseZIndex: 10,
    }));

    return [
      { id: "hud", name: "hud", col: 1.5, row: 0, width: 2.25, baseZIndex: 1 },
      {
        id: "stock",
        name: "stock",
        cards: game.stock,
        col: 0,
        row: 0,
        baseZIndex: 30,
        fan: { maxVisible: 3 },
        placeholder: { text: "Stock", infoPos: "right", showCount: true },
      },
      {
        id: "discard",
        name: "discard",
        cards: game.discard,
        col: (BOARD_COLS - 1) * BOARD_COL_STEP,
        row: 0,
        baseZIndex: 30,
        fan: { maxVisible: 3 },
        placeholder: { text: "Eaten", infoPos: "left", showCount: true },
      },
      ...boardZones,
    ];
  }, [game.board, game.discard, game.stock]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (mappedCard.zoneName !== "board" || mappedCard.pileIndex === undefined) {
      return { isDisabled: true };
    }

    const index = mappedCard.pileIndex;
    const isSelected = selectedIndex === index;
    const isLegalTarget = legalTargets.includes(index);
    const canSelect = movableSources.includes(index);
    return {
      onPress: () => pressCard(index),
      isDisabled: game.ended || (!isSelected && !isLegalTarget && !canSelect),
      isSelected,
      selectColor: isLegalTarget ? "green" : "blue",
      forceOverlayColor: isSelected || isLegalTarget,
    };
  };

  const { cardMap, getZoneStylesById } = useCardMap({
    game,
    zones,
    cardMapper,
    cardSize: "regular",
    gap: 0.12,
  });

  return (
    <GameWrapper
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      reset={reset}
      isLoaded={isLoaded}
      score={`Round ${game.round}, turn ${game.turn}, move ${game.movesMade}`}
      winLoseMessage={game.winLoseMessage}
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}

      <View style={[flexStyles.rowCentered, getZoneStylesById("hud")]}>
        <View style={[flexStyles.colCentered, flexStyles.flex1]}>
          <Text size="xxs" textTransform="uppercase" color={colorPale}>
            Round
          </Text>
          <Text size="sm" weight={600} color={colorPale}>
            {game.round} / {TURNS_PER_ROUND}
          </Text>
        </View>
        <View style={[flexStyles.colCentered, flexStyles.flex1]}>
          <Text size="xxs" textTransform="uppercase" color={colorPale}>
            Turn
          </Text>
          <Text size="sm" weight={600} color={colorPale}>
            {game.turn} / {TURNS_PER_ROUND}
          </Text>
        </View>
        <View style={[flexStyles.colCentered, flexStyles.flex1]}>
          <Text size="xxs" textTransform="uppercase" color={colorPale}>
            Moves
          </Text>
          <Text size="sm" weight={600} color={colorPale}>
            {game.movesMade} / {game.round}
          </Text>
        </View>
      </View>
    </GameWrapper>
  );
}
