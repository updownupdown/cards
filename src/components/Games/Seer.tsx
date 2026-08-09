import { Button } from "@/components/Button/Button";
import { useGameColors } from "@/hooks/useGameColors";
import { useGameSettingValue } from "@/hooks/useGameSettingValue";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useStateManager } from "@/hooks/useStateManager";
import { flexStyles } from "@/styles/flexStyles";
import { delay } from "@/utils/utils";
import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import {
  createDeck,
  flipToBack,
  flipToFace,
  isRed,
  rankValue,
  shuffle,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";
import { Text } from "../common/Text";

const BOARD_COLS = 4;
const BOARD_ROWS = 2;
const BOARD_CELLS = BOARD_COLS * BOARD_ROWS;

export type SeerDifficulty = "easy" | "normal" | "hard";

export type SeerGameState = {
  stock: PlayingCard[];
  table: PlayingCard[];
  board: PlayingCard[][];
  discard: PlayingCard[];
  pendingFreed: PlayingCard[];
  pendingHardChoice: number[];
  ended: boolean;
  won: boolean;
  winLoseMessage: string;
};

const PREDICTIONS: readonly {
  subtitle: string;
}[] = [
  { subtitle: "Red" },
  { subtitle: "Red odd · Black even" },
  { subtitle: "Even" },
  { subtitle: "Diamonds · Hearts" },
  { subtitle: "Spades · Clubs" },
  { subtitle: "Odd" },
  { subtitle: "Black odd · Red even" },
  { subtitle: "Black" },
];

function PredictionMark({ index }: { index: number }) {
  const red = "#c92f38";
  const black = "#111318";
  const markProps = {
    size: "xs" as const,
    weight: 600 as const,
    lineHeight: 1,
    style: { textAlign: "center" as const },
  };

  if (index === 1 || index === 6) {
    return (
      <View style={[flexStyles.rowCentered, { gap: 8 }]}>
        <Text {...markProps} color={index === 1 ? red : black}>
          {"1\n3\n5"}
        </Text>
        <Text {...markProps} color={index === 1 ? black : red}>
          {"2\n4\n6"}
        </Text>
      </View>
    );
  }

  const marks = ["●", "", "2\n4\n6", "♦\n♥", "♠\n♣", "1\n3\n5", "", "●"];
  const isRedMark = index === 0 || index === 3;
  return (
    <Text {...markProps} color={isRedMark ? red : black}>
      {marks[index]}
    </Text>
  );
}

function createSeerDeck() {
  return createDeck({ faceUp: false })
    .filter((card) => rankValue(card) <= 6)
    .map(flipToBack);
}

function cardMatchesPrediction(card: PlayingCard, index: number) {
  const red = isRed(card.suit);
  const even = rankValue(card) % 2 === 0;

  switch (index) {
    case 0:
      return red;
    case 1:
      return (red && !even) || (!red && even);
    case 2:
      return even;
    case 3:
      return card.suit === "diamonds" || card.suit === "hearts";
    case 4:
      return card.suit === "spades" || card.suit === "clubs";
    case 5:
      return !even;
    case 6:
      return (!red && !even) || (red && even);
    case 7:
      return !red;
    default:
      return false;
  }
}

function stoneCount(pile: PlayingCard[]) {
  return pile.filter((card) => !card.faceUp).length;
}

function isCompleted(pile: PlayingCard[]) {
  return pile.length > 0 && pile[pile.length - 1].faceUp;
}

function isBlocked(pile: PlayingCard[]) {
  return stoneCount(pile) >= 3;
}

function adjacentIndices(index: number, includeDiagonals = false) {
  const row = Math.floor(index / BOARD_COLS);
  const col = index % BOARD_COLS;

  return Array.from(
    { length: BOARD_CELLS },
    (_, candidate) => candidate,
  ).filter((candidate) => {
    if (candidate === index) return false;
    const rowDistance = Math.abs(Math.floor(candidate / BOARD_COLS) - row);
    const colDistance = Math.abs((candidate % BOARD_COLS) - col);
    return includeDiagonals
      ? rowDistance <= 1 && colDistance <= 1
      : rowDistance + colDistance === 1;
  });
}

function exposedStoneIndices(board: PlayingCard[][], sourceIndex: number) {
  return adjacentIndices(sourceIndex).filter((index) => {
    const pile = board[index];
    return pile.length > 0 && !pile[pile.length - 1].faceUp;
  });
}

function updateOutcome(draft: SeerGameState) {
  if (draft.pendingFreed.length > 0 || draft.pendingHardChoice.length > 0) {
    return;
  }

  if (draft.board.every(isCompleted)) {
    draft.ended = true;
    draft.won = true;
    draft.winLoseMessage = "All eight predictions are complete.";
  } else if (draft.stock.length === 0) {
    draft.ended = true;
    draft.won = false;
    draft.winLoseMessage =
      "The deck ran out before all predictions were complete.";
  } else if (draft.board.every(isBlocked)) {
    draft.ended = true;
    draft.won = false;
    draft.winLoseMessage = "All eight predictions are blocked by stones.";
  }
}

function freeStone(draft: SeerGameState, index: number) {
  const top = draft.board[index][draft.board[index].length - 1];
  if (!top || top.faceUp) return;
  draft.pendingFreed.push(draft.board[index].pop()!);
}

function resolveSuccess(
  draft: SeerGameState,
  index: number,
  difficulty: SeerDifficulty,
) {
  if (difficulty === "hard") {
    draft.pendingHardChoice = exposedStoneIndices(draft.board, index);
    if (draft.pendingHardChoice.length === 0) updateOutcome(draft);
    return;
  }

  const candidates = adjacentIndices(index, difficulty === "easy");
  candidates.forEach((candidate) => freeStone(draft, candidate));
  updateOutcome(draft);
}

function playPrediction(
  draft: SeerGameState,
  index: number,
  difficulty: SeerDifficulty,
) {
  if (draft.ended || isBlocked(draft.board[index])) return;
  const revealed = draft.stock.pop();
  if (!revealed) {
    updateOutcome(draft);
    return;
  }

  if (cardMatchesPrediction(revealed, index)) {
    draft.board[index].push(flipToFace(revealed));
    resolveSuccess(draft, index, difficulty);
    return;
  }

  draft.table.push(flipToFace(revealed));
  const stone = draft.stock.pop();
  if (stone) draft.board[index].push(flipToBack(stone));
  updateOutcome(draft);
}

function collectCards(game: SeerGameState) {
  return [
    ...game.stock,
    ...game.table,
    ...game.board.flat(),
    ...game.discard,
    ...game.pendingFreed,
  ];
}

function disposeFreed(draft: SeerGameState, returnToDeck: boolean) {
  if (returnToDeck) {
    draft.stock = [...draft.pendingFreed.map(flipToBack), ...draft.stock];
  } else {
    draft.table.push(...draft.pendingFreed.map(flipToFace));
  }
  draft.pendingFreed = [];
  updateOutcome(draft);
}

export const seerRules = {
  adjacentIndices,
  cardMatchesPrediction,
  collectCards,
  createSeerDeck,
  disposeFreed,
  exposedStoneIndices,
  isBlocked,
  isCompleted,
  playPrediction,
  stoneCount,
  resetSeer,
  updateOutcome,
};

const gameStateInitial: SeerGameState = {
  stock: [],
  table: [],
  board: Array.from({ length: BOARD_CELLS }, () => []),
  discard: createSeerDeck(),
  pendingFreed: [],
  pendingHardChoice: [],
  ended: false,
  won: false,
  winLoseMessage: "",
};

async function resetSeer(
  setGame: (updater: (draft: SeerGameState) => void) => void,
) {
  setGame((draft) => {
    const gathered = collectCards(draft);
    draft.stock = [];
    draft.table = [];
    draft.board = Array.from({ length: BOARD_CELLS }, () => []);
    draft.discard = (gathered.length === 24 ? gathered : createSeerDeck()).map(
      flipToBack,
    );
    draft.pendingFreed = [];
    draft.pendingHardChoice = [];
    draft.ended = false;
    draft.won = false;
    draft.winLoseMessage = "";
  });

  await delay();

  setGame((draft) => {
    draft.stock = shuffle(draft.discard).map(flipToBack);
    draft.discard = [];
  });
}

export default function Seer() {
  const difficulty = useGameSettingValue("seerDifficulty");
  const { colorDark, colorPale } = useGameColors();
  const { spacing } = useResponsiveMetrics();
  const [showBottom, setShowBottom] = useState(false);
  const { isLoaded, game, setGame, undo, canUndo, saveUndoState, reset } =
    useStateManager<SeerGameState>({
      gameStateInitial,
      resetNonGameStates: () => setShowBottom(false),
      resetAndSetup: async () => {
        await resetSeer(setGame);
      },
    });

  function choosePrediction(index: number) {
    if (
      game.ended ||
      game.pendingFreed.length > 0 ||
      game.pendingHardChoice.length > 0 ||
      isBlocked(game.board[index])
    ) {
      return;
    }
    saveUndoState(structuredClone(game));
    setShowBottom(false);
    setGame((draft) => playPrediction(draft, index, difficulty));
  }

  function chooseHardStone(index: number) {
    if (!game.pendingHardChoice.includes(index)) return;
    setGame((draft) => {
      freeStone(draft, index);
      draft.pendingHardChoice = [];
      updateOutcome(draft);
    });
  }

  function chooseFreedDisposition(returnToDeck: boolean) {
    if (game.pendingFreed.length === 0) return;
    setGame((draft) => disposeFreed(draft, returnToDeck));
  }

  const completedCount = game.board.filter(isCompleted).length;
  const stockCards =
    showBottom && game.stock[0]
      ? [
          {
            ...flipToFace(game.stock[0]),
            id: `${game.stock[0].id}-bottom-preview`,
          },
        ]
      : game.stock;

  const zones: MapZone[] = useMemo(
    () => [
      {
        id: "stock",
        name: "stock",
        cards: stockCards,
        col: 0,
        row: 0,
        baseZIndex: 30,
        fan: { maxVisible: 3 },
        placeholder: { text: "Stock", infoPos: "right", showCount: false },
      },
      {
        id: "table",
        name: "table",
        cards: game.table,
        col: 2.75,
        row: 0,
        baseZIndex: 30,
        fan: { maxVisible: 5, direction: "left", offset: 0.18 },
        placeholder: { text: "Table", infoPos: "left", showCount: true },
      },
      ...game.board.map((pile, index) => ({
        id: `prediction-${index}`,
        name: "prediction",
        pileIndex: index,
        cards: pile,
        col: index % BOARD_COLS,
        row: Math.floor(index / BOARD_COLS) + 1.25,
        baseZIndex: 10,
        fan: { maxVisible: 5 },
        placeholder: { hideBackground: true, showCount: false },
      })),
      {
        id: "actions",
        name: "actions",
        col: 0,
        row: 3.5,
        width: "full",
        height: 0.55,
      },
    ],
    [game.board, game.table, stockCards],
  );

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    if (zone.name === "stock") {
      return {
        onPress: () => setShowBottom((current) => !current),
        isDisabled: game.stock.length === 0,
      };
    }
    if (zone.name === "prediction" && zone.pileIndex !== undefined) {
      const index = zone.pileIndex;
      const hardTarget = game.pendingHardChoice.includes(index);
      const isUnavailable =
        game.ended ||
        game.pendingFreed.length > 0 ||
        (game.pendingHardChoice.length > 0
          ? !hardTarget
          : isBlocked(game.board[index]));
      return {
        onPress: () =>
          hardTarget ? chooseHardStone(index) : choosePrediction(index),
        isDisabled: isUnavailable,
        isSelected: hardTarget,
        selectColor: hardTarget ? "green" : "blue",
        forceOverlayColor: hardTarget,
      };
    }
    return {};
  };

  const cardMapper = (mappedCard: MappedCard): AnimatedCardMapping => {
    if (mappedCard.zoneName === "stock") {
      return {
        onPress: () => setShowBottom((current) => !current),
        isDisabled: !mappedCard.topOfZone,
      };
    }
    if (
      mappedCard.zoneName === "prediction" &&
      mappedCard.pileIndex !== undefined
    ) {
      const index = mappedCard.pileIndex;
      const hardTarget = game.pendingHardChoice.includes(index);
      const isUnavailable =
        game.ended ||
        game.pendingFreed.length > 0 ||
        (game.pendingHardChoice.length > 0
          ? !hardTarget
          : isBlocked(game.board[index]));
      return {
        onPress: () =>
          hardTarget ? chooseHardStone(index) : choosePrediction(index),
        isDisabled: !mappedCard.topOfZone || isUnavailable,
        isSelected: hardTarget,
        selectColor: hardTarget ? "green" : "blue",
        forceOverlayColor: hardTarget,
      };
    }
    return { isDisabled: true };
  };

  const { cardMap, getZoneStylesById } = useCardMap({
    game,
    zones,
    zoneMapper,
    cardMapper,
    cardSize: "small-colored",
    gap: 0.1,
    fixedCols: BOARD_COLS,
    fixedRows: 4.15,
  });

  const prompt =
    game.pendingHardChoice.length > 0
      ? "Choose one highlighted stone"
      : game.pendingFreed.length > 0
        ? `${game.pendingFreed.length} freed ${game.pendingFreed.length === 1 ? "stone" : "stones"}`
        : `Deck ${game.stock.length} · Completed ${completedCount}/8`;

  return (
    <GameWrapper
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      reset={reset}
      isLoaded={isLoaded}
      score={`${completedCount} / 8`}
      winLoseMessage={game.winLoseMessage}
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}

      {PREDICTIONS.map((prediction, index) => {
        const blocked = isBlocked(game.board[index]);
        const complete = isCompleted(game.board[index]);
        const hardTarget = game.pendingHardChoice.includes(index);
        const disabled =
          game.ended ||
          game.pendingFreed.length > 0 ||
          (game.pendingHardChoice.length > 0 ? !hardTarget : blocked);
        return (
          <Pressable
            key={prediction.subtitle}
            accessibilityRole="button"
            accessibilityLabel={`${prediction.subtitle} prediction, ${stoneCount(game.board[index])} stones${complete ? ", complete" : ""}${blocked ? ", blocked" : ""}`}
            accessibilityState={{ disabled, selected: hardTarget }}
            onPress={() =>
              hardTarget ? chooseHardStone(index) : choosePrediction(index)
            }
            disabled={disabled}
            style={[
              getZoneStylesById(`prediction-${index}`),
              flexStyles.colCentered,
              {
                zIndex: 5,
                borderWidth: spacing(1.5),
                borderColor: blocked
                  ? "#d94343"
                  : complete
                    ? "#68b87a"
                    : colorPale,
                borderRadius: spacing(5),
                backgroundColor: colorPale,
                padding: spacing(4),
                opacity: blocked ? 0.55 : 0.9,
              },
            ]}
          >
            <PredictionMark index={index} />
            <Text size="xxs" color={colorDark} style={{ textAlign: "center" }}>
              {prediction.subtitle}
            </Text>
            {stoneCount(game.board[index]) > 0 && (
              <Text size="xxs" color={blocked ? "#a91520" : colorDark}>
                {stoneCount(game.board[index])} stone
                {stoneCount(game.board[index]) === 1 ? "" : "s"}
              </Text>
            )}
          </Pressable>
        );
      })}

      <View
        style={[
          getZoneStylesById("actions"),
          flexStyles.colCentered,
          { gap: spacing(5) },
        ]}
      >
        <Text size="xs" color={colorPale} style={{ textAlign: "center" }}>
          {prompt}
        </Text>
        {game.pendingFreed.length > 0 && (
          <View style={[flexStyles.rowCentered, { gap: spacing(8) }]}>
            <Button
              size="xs"
              text="Reveal"
              theme="orange"
              onPress={() => chooseFreedDisposition(false)}
            />
            <Button
              size="xs"
              text="Return"
              theme="green"
              onPress={() => chooseFreedDisposition(true)}
            />
          </View>
        )}
      </View>
    </GameWrapper>
  );
}
