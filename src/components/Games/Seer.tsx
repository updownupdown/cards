import { Button } from "@/components/Button/Button";
import { useGameColors } from "@/hooks/useGameColors";
import { useGameSettingValue } from "@/hooks/useGameSettingValue";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useStateManager } from "@/hooks/useStateManager";
import { flexStyles } from "@/styles/flexStyles";
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
  zoneFanOffset,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";
import { Text } from "../common/Text";
import { Colors, rgba } from "@/styles/styles";

import { i18n } from "@/i18n";
const BOARD_COLS = 4;
const BOARD_ROWS = 2;
const BOARD_CELLS = BOARD_COLS * BOARD_ROWS;

const cardSize = "regular";

export type SeerDifficulty = "easy" | "normal" | "hard";

export type SeerGameState = {
  stock: PlayingCard[];
  table: PlayingCard[];
  board: PlayingCard[][];
  discard: PlayingCard[];
  pendingFreed: string[];
  pendingHardChoice: number[];
  ended: boolean;
  won: boolean;
  winLoseMessage: string;
};

const PREDICTIONS: readonly {
  /** The prediction's label, in games:seer.predictions. */
  subtitle:
    | "red"
    | "redOddBlackEven"
    | "even"
    | "diamondsHearts"
    | "spadesClubs"
    | "odd"
    | "blackOddRedEven"
    | "black";
}[] = [
  { subtitle: "red" },
  { subtitle: "redOddBlackEven" },
  { subtitle: "even" },
  { subtitle: "diamondsHearts" },
  { subtitle: "spadesClubs" },
  { subtitle: "odd" },
  { subtitle: "blackOddRedEven" },
  { subtitle: "black" },
];

function PredictionMark({ index }: { index: number }) {
  const red = Colors.suitsRed;
  const black = Colors.suitsBlack;
  const markProps = {
    size: "xxl" as const,
    weight: 600 as const,
    lineHeight: 1.2,
    style: { textAlign: "center" as const },
  };

  if (index === 1 || index === 6) {
    return (
      <View style={[flexStyles.rowCentered, { gap: 10 }]}>
        <Text
          {...markProps}
          color={index === 1 ? red : black}
          lineHeight={markProps.lineHeight}
        >
          {"1\n3\n5"}
        </Text>
        <Text
          {...markProps}
          color={index === 1 ? black : red}
          lineHeight={markProps.lineHeight}
        >
          {"2\n4\n6"}
        </Text>
      </View>
    );
  }

  const marks = ["●", "", "2\n4\n6", "♦\n♥", "♠\n♣", "1\n3\n5", "", "●"];
  const isRedMark = index === 0 || index === 3;
  const isDotMark = index === 0 || index === 7;
  const isSuitMark = index === 3 || index === 4;

  return (
    <Text
      {...markProps}
      color={isRedMark ? red : black}
      style={{
        fontSize: isDotMark ? 80 : isSuitMark ? 42 : undefined,
        textAlign: "center",
      }}
      lineHeight={isSuitMark ? 1.8 : markProps.lineHeight}
    >
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
    draft.winLoseMessage = i18n.t("games:seer.allPredictionsComplete");
  } else if (draft.stock.length === 0) {
    draft.ended = true;
    draft.won = false;
    draft.winLoseMessage = i18n.t("games:seer.deckRanOut");
  } else if (draft.board.every(isBlocked)) {
    draft.ended = true;
    draft.won = false;
    draft.winLoseMessage = i18n.t("games:seer.allPredictionsBlocked");
  }
}

function freeStone(draft: SeerGameState, index: number) {
  const top = draft.board[index][draft.board[index].length - 1];
  if (!top || top.faceUp) return;
  draft.pendingFreed.push(top.id);
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
  return [...game.stock, ...game.table, ...game.board.flat(), ...game.discard];
}

function disposeFreed(draft: SeerGameState, returnToDeck: boolean) {
  const freedIds = new Set(draft.pendingFreed);
  const freedCards = draft.board.flat().filter((card) => freedIds.has(card.id));
  draft.board = draft.board.map((pile) =>
    pile.filter((card) => !freedIds.has(card.id)),
  );

  if (returnToDeck) {
    draft.stock = [...freedCards.map(flipToBack), ...draft.stock];
  } else {
    draft.table.push(...freedCards.map(flipToFace));
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
  stock: shuffle(createSeerDeck()),
  table: [],
  board: Array.from({ length: BOARD_CELLS }, () => []),
  discard: [],
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
    draft.stock = shuffle(
      (gathered.length === 24 ? gathered : createSeerDeck()).map(flipToBack),
    );
    draft.table = [];
    draft.board = Array.from({ length: BOARD_CELLS }, () => []);
    draft.discard = [];
    draft.pendingFreed = [];
    draft.pendingHardChoice = [];
    draft.ended = false;
    draft.won = false;
    draft.winLoseMessage = "";
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

  const stockCards = showBottom
    ? game.stock.map((card, index) =>
        index === game.stock.length - 1 ? flipToFace(card) : card,
      )
    : game.stock;
  const pendingFreedIds = new Set(game.pendingFreed);

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
        placeholder: { text: i18n.t("cards:stock"), infoPos: "right" },
      },
      {
        id: "table",
        name: "table",
        cards: game.table,
        col: 1.5,
        row: 0,
        width: 2.5,
        baseZIndex: 30,
        fan: {
          maxVisible: 5,
          direction: "left",
          offset: zoneFanOffset(game.table.length, 2.5, 0.1, 0.28),
        },
        placeholder: {},
      },
      ...game.board.map((pile, index) => ({
        id: `prediction-${index}`,
        name: "prediction",
        pileIndex: index,
        cards: pile,
        col: index % BOARD_COLS,
        row: Math.floor(index / BOARD_COLS) + 1.9,
        baseZIndex: 10,
        fan: { maxVisible: 5 },
        placeholder: { hideBackground: true, showCount: false },
      })),
      {
        id: "actions",
        name: "actions",
        col: 0,
        row: 1,
        width: "full",
        height: 0.7,
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
        isSelected: showBottom && mappedCard.topOfZone,
      };
    }
    if (
      mappedCard.zoneName === "prediction" &&
      mappedCard.pileIndex !== undefined
    ) {
      const index = mappedCard.pileIndex;
      const hardTarget = game.pendingHardChoice.includes(index);
      const isFreed = pendingFreedIds.has(mappedCard.card.id);
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
        isSelected: hardTarget || isFreed,
        selectColor: isFreed || hardTarget ? "green" : "blue",
        forceOverlayColor: isFreed || hardTarget,
      };
    }
    return { isDisabled: true };
  };

  const { cardMap, getZoneStylesById } = useCardMap({
    game,
    zones,
    zoneMapper,
    cardMapper,
    cardSize,
    gap: 0.16,
    fixedCols: BOARD_COLS,
    fixedRows: 4.15,
  });

  const prompt =
    game.pendingHardChoice.length > 0
      ? i18n.t("games:seer.chooseHighlightedStone")
      : game.pendingFreed.length > 0
        ? i18n.t("games:seer.freedStones", { count: game.pendingFreed.length })
        : "";

  return (
    <GameWrapper
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      reset={reset}
      isLoaded={isLoaded}
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
        const firstFour = index < 4;

        return (
          <Pressable
            key={prediction.subtitle}
            accessibilityRole="button"
            accessibilityLabel={
              i18n.t("games:seer.predictionLabel", {
                label: i18n.t(`games:seer.predictions.${prediction.subtitle}`),
                count: stoneCount(game.board[index]),
              }) +
              (complete ? i18n.t("games:seer.complete") : "") +
              (blocked ? i18n.t("games:seer.blocked") : "")
            }
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
                borderRadius: spacing(5),
                backgroundColor: rgba(colorPale, 1),
              },
            ]}
          >
            <PredictionMark index={index} />

            <Text
              size="xs"
              weight={500}
              color={blocked ? Colors.suitsRed : colorPale}
              style={[
                flexStyles.colCentered,
                {
                  textAlign: "center",
                  position: "absolute",
                  top: firstFour ? spacing(24) * -1 : "100%",
                  marginTop: firstFour ? spacing(8) * -1 : spacing(8),
                  left: 0,
                  height: spacing(24),
                },
              ]}
            >
              {i18n.t(`games:seer.predictions.${prediction.subtitle}`)}
            </Text>

            {stoneCount(game.board[index]) > 0 && (
              <View
                style={[
                  flexStyles.colCentered,
                  {
                    position: "absolute",
                    top: firstFour ? spacing(24) * -1 : "100%",
                    right: 0,
                    height: spacing(24),
                    width: spacing(24),
                    marginTop: firstFour ? spacing(8) * -1 : spacing(8),
                    backgroundColor: blocked ? Colors.suitsRed : colorPale,
                    borderRadius: spacing(12),
                  },
                ]}
              >
                <Text size="xs" color={colorDark} weight={600}>
                  {stoneCount(game.board[index])}
                </Text>
              </View>
            )}
          </Pressable>
        );
      })}

      <View
        style={[
          getZoneStylesById("actions"),
          flexStyles.rowCentered,
          { gap: spacing(10) },
        ]}
      >
        <Text
          size="md"
          weight={500}
          color={colorPale}
          style={{ flex: 1, textAlign: "center" }}
        >
          {prompt}
        </Text>

        {game.pendingFreed.length > 0 && (
          <>
            <Button
              size="md"
              text={i18n.t("games:seer.reveal")}
              theme="orange"
              taller
              onPress={() => chooseFreedDisposition(false)}
            />
            <Button
              size="md"
              text={i18n.t("games:seer.return")}
              theme="purple"
              taller
              onPress={() => chooseFreedDisposition(true)}
            />
          </>
        )}
      </View>
    </GameWrapper>
  );
}
