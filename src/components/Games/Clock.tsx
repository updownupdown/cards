import ClockHandHours from "@/assets/images/ClockHandHours.svg";
import { MappedCard, MapZone, useCardMap } from "@/components/Cards/CardMap";
import { useGameColors } from "@/hooks/useGameColors";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useStateManager } from "@/hooks/useStateManager";
import { flexStyles } from "@/styles/flexStyles";
import { Colors, rgba } from "@/styles/styles";
import { delay } from "@/utils/utils";
import { useEffect, useMemo, useRef } from "react";
import { View } from "react-native";
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { AnimatedCardMapping } from "../Cards/AnimatedCard";
import {
  cardDims,
  createDeck,
  flipAllToBack,
  flipTopCardToFace,
  rankValue,
  shuffle,
  top,
  type PlayingCard,
} from "../Cards/card-utils";
import { GameWrapper } from "../common/GameWrapper";

import { i18n } from "@/i18n";
type GameState = {
  piles: PlayingCard[][];
  nextPileIndex?: number;
  prevPileIndex?: number;
  revealedKings: number;
  revealedCards: number;
  ended: boolean;
  won: boolean;
};

export type ClockGameState = GameState;

const gameStateInitial: GameState = {
  piles: Array.from({ length: 13 }, (_, i) =>
    i === 0 ? flipAllToBack(shuffle(createDeck())) : [],
  ),
  nextPileIndex: 0,
  prevPileIndex: undefined,
  revealedKings: 0,
  revealedCards: 0,
  ended: false,
  won: false,
};

async function resetAndSetup(
  setGame: (updater: (draft: GameState) => void) => void,
) {
  setGame((draft) => {
    const allCards = draft.piles.flat();

    draft.piles = Array.from({ length: 13 }, () => []);
    draft.piles[0] = flipAllToBack(allCards);
    draft.nextPileIndex = 0;
    draft.prevPileIndex = undefined;
    draft.revealedKings = 0;
    draft.revealedCards = 0;
    draft.ended = false;
    draft.won = false;
  });

  await delay();

  setGame((draft) => {
    const deck = shuffle(draft.piles[0]);
    draft.piles[0] = [];
    let target = 0;
    while (deck.length > 0) {
      const card = deck.shift();
      if (card) draft.piles[target].push(card);
      target = (target + 1) % 13;
    }
  });
}

function revealCardAtPileIndex(draft: GameState, pileIndex: number) {
  if (draft.ended || draft.piles.length === 0) return false;

  const clickedCard = top(draft.piles[pileIndex]);
  if (!clickedCard) return false;

  if (draft.prevPileIndex !== undefined) {
    const cardToMove = draft.piles[draft.prevPileIndex].pop();
    if (!cardToMove) return false;
    draft.piles[pileIndex].unshift(cardToMove);
  }

  draft.piles[pileIndex] = flipTopCardToFace(draft.piles[pileIndex]);

  let nextCardRank = rankValue(clickedCard);
  if (pileIndex === draft.nextPileIndex) {
    const topOfSamePile = top(draft.piles[pileIndex]);
    if (!topOfSamePile) return false;
    nextCardRank = rankValue(topOfSamePile);
  }

  draft.nextPileIndex = nextCardRank === 13 ? 0 : nextCardRank;
  draft.prevPileIndex = pileIndex;
  draft.revealedKings += nextCardRank === 13 ? 1 : 0;
  draft.revealedCards += 1;
  draft.won = draft.revealedCards === 52;
  draft.ended = draft.won || draft.revealedKings === 4;
  return true;
}

export const clockRules = {
  revealCardAtPileIndex,
};

export default function Clock() {
  const AnimatedCircle = Animated.createAnimatedComponent(Circle);
  const { colorPale, colorDark, colorZone } = useGameColors();
  const { scale: responsiveScale } = useResponsiveMetrics();

  const {
    isSettingUp,
    isLoaded,
    game,
    setGame,
    undo,
    canUndo,
    saveUndoState,
    reset,
  } = useStateManager({
    resetAndSetup: async () => {
      await resetAndSetup(setGame);
    },
    gameStateInitial,
  });

  async function revealCard(pileIndex: number) {
    if (game.ended || game.piles.length === 0) {
      return;
    }

    saveUndoState(structuredClone(game));

    setGame((draft) => {
      revealCardAtPileIndex(draft, pileIndex);
    });
  }

  // ========== Card Mapping ========== //
  const kingPileWidth = 2.5;
  const clockRadius = 2.6;
  const kingPileExtraHeight = 0.2;
  const kingPileRow =
    clockRadius * cardDims.aspectRatio - kingPileExtraHeight / 2;

  const zones: MapZone[] = useMemo(() => {
    const pileZones = Array.from({ length: 13 }).map((_, i) => {
      let col, row;

      if (i === 0) {
        // Middle position
        col = clockRadius - kingPileWidth / 2 + 0.5;
        row = kingPileRow;
      } else {
        // Clock positions: 12 is top, 3 is right, 6 is bottom, 9 is left
        // Formula: angle = (index - 3) * (2 * Math.PI / 12)
        // We adjust by -3 to align index 3 with 0 radians (right)
        const angle = (i - 3) * (Math.PI / 6);

        col = clockRadius + clockRadius * Math.cos(angle);
        row =
          clockRadius * cardDims.aspectRatio +
          clockRadius * Math.sin(angle) * cardDims.aspectRatio;
      }

      return {
        id: `pile-${i}`,
        name: "pile",
        col: Math.round(col * 100) / 100,
        row: Math.round(row * 100) / 100,
        width: i === 0 ? kingPileWidth : 1,
        height: 1 + (i === 0 ? kingPileExtraHeight : 0),
        pileIndex: i,
        cards: game.piles[i] ?? undefined,
        baseZIndex: i === 0 ? 1 : 20,
        rotation: (i % 12) * 30,
        fan: {
          maxVisible: 6,
          offset: i === 0 ? (isSettingUp ? 0 : 0.4) : 0.05,
          direction: i === 0 ? "right" : "diagonal-depth",
        },
        placeholder: i === 0 ? {} : undefined,
      } as MapZone;
    });

    return [
      ...pileZones,
      {
        id: "clockface",
        col: clockRadius + 0.5,
        row: (clockRadius + 0.5) * cardDims.aspectRatio,
        width: 1,
        height: 1,
      },
    ];
  }, [game]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    const pileIndex = mappedCard.pileIndex;

    if (pileIndex === undefined) return;

    const pressable =
      mappedCard.topOfZone && pileIndex === game.nextPileIndex && !game.ended;
    const forceOverlayColor =
      mappedCard.topOfZone &&
      game.prevPileIndex !== undefined &&
      pileIndex === game.prevPileIndex;

    return {
      onPress: pressable ? () => revealCard(pileIndex) : undefined,
      selectColor: "blue",
      forceOverlayColor,
    };
  };

  const { cardMap, cardWidth, getZoneStylesById } = useCardMap({
    game,
    zones,
    cardMapper,
    cardSize: "small",
    paddingLeft: 0.8,
    paddingRight: 0.8,
    paddingTop: 1.7,
    paddingBottom: 1.7,
  });

  const revealedProgress = Math.min(Math.max(game.revealedCards / 52, 0), 1);
  const progressSize = clockRadius * 2 * cardDims.aspectRatio * cardWidth;
  const progressStroke = Math.max(4, cardWidth * 0.08);
  const progressRadius = (progressSize - progressStroke) / 2;
  const progressCircumference = 2 * Math.PI * progressRadius;

  const progressValue = useSharedValue(revealedProgress);
  const hourAngle = useSharedValue(0);

  const prevHourAngle = useRef(0);

  const animDuration = 1250;

  function nextSmoothAngle(prev: number, target: number) {
    const delta = ((target - prev + 540) % 360) - 180;
    return prev + delta;
  }

  useEffect(() => {
    progressValue.value = withTiming(revealedProgress, {
      duration: animDuration,
    });
  }, [revealedProgress, progressValue]);

  useEffect(() => {
    const targetHourAngle = revealedProgress * 360;
    const smoothHourAngle = nextSmoothAngle(
      prevHourAngle.current,
      targetHourAngle,
    );
    prevHourAngle.current = smoothHourAngle;
    hourAngle.value = withTiming(smoothHourAngle, {
      duration: animDuration,
    });
  }, [revealedProgress, hourAngle]);

  const animatedProgressProps = useAnimatedProps(() => {
    return {
      strokeDashoffset: progressCircumference * (1 - progressValue.value),
    };
  });
  const animatedHourStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${hourAngle.value}deg` }],
    };
  });

  const center = progressSize / 2;

  const hourSource = { width: 130, height: 376, pivotFromBottom: 35 };

  const hourHeight = progressSize * 0.58;
  const hourScale = hourHeight / hourSource.height;
  const hourWidth = hourSource.width * hourScale;
  const hourPivotY = hourHeight - hourSource.pivotFromBottom * hourScale;

  const clockFaceRadius = clockRadius * 3.34 * cardWidth;

  const progressStrokeColor = useMemo(() => {
    const kings = game.revealedKings;
    if (kings === 0) return Colors.brightGreen;
    if (kings === 1) return Colors.brightYellow;
    if (kings === 2) return Colors.brightOrange;
    if (kings === 3) return Colors.brightRed;
    return Colors.brightRed;
  }, [game.revealedKings]);

  return (
    <GameWrapper
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      reset={reset}
      isLoaded={isLoaded}
      winLoseMessage={
        game.won
          ? i18n.t("games:clock.youRevealedAll52Cards")
          : i18n.t("games:clock.theFourthKingAppearedBefore")
      }
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}

      <View
        style={[
          flexStyles.rowCentered,
          getZoneStylesById("clockface"),
          {
            transform: [{ translateX: "-50%" }, { translateY: "-50%" }],
            pointerEvents: "none",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1,
            backgroundColor: colorZone,
            width: clockFaceRadius,
            height: clockFaceRadius,
            borderRadius: clockFaceRadius / 2,
          },
        ]}
      >
        <View
          style={[
            flexStyles.rowCentered,
            {
              top: "50%",
              left: "50%",
              transform: [{ translateX: "-50%" }, { translateY: "-50%" }],
              zIndex: 1,
              pointerEvents: "none",
              justifyContent: "center",
              alignItems: "center",
              width: clockFaceRadius,
              height: clockFaceRadius,
            },
          ]}
        >
          <View style={{ width: progressSize, height: progressSize }}>
            <Svg
              width={progressSize}
              height={progressSize}
              style={{ transform: [{ rotate: "-90deg" }] }}
            >
              <Circle
                cx={progressSize / 2}
                cy={progressSize / 2}
                r={progressRadius}
                stroke={rgba(colorPale, 0.15)}
                strokeWidth={progressStroke}
                fill="transparent"
              />
              <AnimatedCircle
                animatedProps={animatedProgressProps}
                cx={progressSize / 2}
                cy={progressSize / 2}
                r={progressRadius}
                stroke={progressStrokeColor}
                strokeWidth={progressStroke}
                strokeLinecap="round"
                strokeDasharray={progressCircumference}
                fill="transparent"
              />
            </Svg>

            <Animated.View
              style={[
                {
                  position: "absolute",
                  zIndex: 10,
                  left: 0,
                  top: 0,
                  width: progressSize,
                  height: progressSize,
                },
                animatedHourStyle,
              ]}
            >
              <ClockHandHours
                width={hourWidth}
                height={hourHeight}
                style={{
                  position: "absolute",
                  left: center - hourWidth / 2,
                  top: center - hourPivotY,
                }}
                fill={colorPale}
                stroke={rgba(colorDark, 0.7)}
                strokeWidth={responsiveScale * 4}
              />
            </Animated.View>
          </View>
        </View>
      </View>
    </GameWrapper>
  );
}
