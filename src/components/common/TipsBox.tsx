import { usePalette } from "@/styles/palette";
import { getGameInfo } from "@/data/game-menu";
import {
  markSwipeDismissKnown,
  useSwipeDismissKnown,
} from "@/data/swipe-dismiss";
import { useGamePath } from "@/hooks/useGamePath";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useDisplayLanguage, useTranslation } from "@/i18n";
import { localizeGame } from "@/i18n/content";
import { flexStyles } from "@/styles/flexStyles";
import { Colors, layoutDims, rgba } from "@/styles/styles";
import { useEffect, useMemo } from "react";
import { View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { Button } from "../Button/Button";
import { swipeOpacity } from "../Home/DealMeAGame";
import { QuickStart } from "../Modals/RulesModal";
import { Text } from "./Text";

/** Share of the card width a drag must pass to count as a swipe. */
const SWIPE_THRESHOLD = 0.3;
/** A quick flick counts as a swipe whatever its distance (points/s). */
const SWIPE_VELOCITY = 800;
const FLY_OUT_DURATION = 220;
/** Degrees the card has turned once dragged its own width. */
const SWIPE_ROTATION = 8;
/** The cue for a player who hasn't swiped yet: how far it leans each way. */
const CUE_REACH = 0.12;
const CUE_DELAY = 900;
/** Stands in for the game's name while the heading is translated. */
const GAME_NAME_SLOT = "\u0000";

type Props = {
  onClose: () => void;
  showRulesModal: () => void;
};

/**
 * The quick start shown over a game not played yet. It follows a sideways
 * drag, fading as it goes, and is dismissed once swiped far enough either
 * way, as the Random Deal's cards are. Until the player has swiped one away,
 * it leans left then right as it appears, to show that it can be.
 */
export function TipsBox({ onClose, showRulesModal }: Props) {
  const pathname = useGamePath();
  const gameInfo = localizeGame(
    getGameInfo(pathname),
    pathname,
    useDisplayLanguage(),
  );
  const { t } = useTranslation("game");
  // The heading around the game's name, which gets its own colour.
  const [titleStart, titleEnd = ""] = t("tips.title", {
    game: GAME_NAME_SLOT,
  }).split(GAME_NAME_SLOT);
  const { spacing, ui } = useResponsiveMetrics();
  const theme = usePalette();
  const sidePadding = spacing(layoutDims.pagePadding / 2);
  const translateX = useSharedValue(0);
  const width = useSharedValue(0);
  // The cue's lean, as a share of CUE_REACH: -1 left, 1 right.
  const cue = useSharedValue(0);
  const swipeKnown = useSwipeDismissKnown();

  useEffect(() => {
    if (swipeKnown) return;
    const ease = Easing.inOut(Easing.quad);
    cue.value = withDelay(
      CUE_DELAY,
      withSequence(
        withTiming(-1, { duration: 320, easing: ease }),
        withTiming(1, { duration: 520, easing: ease }),
        withTiming(0, { duration: 320, easing: ease }),
      ),
    );
    return () => cancelAnimation(cue);
  }, [swipeKnown, cue]);

  const swipeToDismiss = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-12, 12])
        .failOffsetY([-14, 14])
        .onStart(() => {
          "worklet";
          cue.value = withTiming(0, { duration: 120 });
        })
        .onUpdate((event) => {
          "worklet";
          translateX.value = event.translationX;
        })
        .onEnd((event) => {
          "worklet";
          const passed =
            Math.abs(event.translationX) > width.value * SWIPE_THRESHOLD ||
            Math.abs(event.velocityX) > SWIPE_VELOCITY;
          if (!passed) {
            translateX.value = withTiming(0, { duration: 180 });
            return;
          }
          scheduleOnRN(markSwipeDismissKnown);
          const sign = event.translationX > 0 ? 1 : -1;
          translateX.value = withTiming(
            sign * width.value * 1.4,
            { duration: FLY_OUT_DURATION },
            (finished) => {
              if (finished) scheduleOnRN(onClose);
            },
          );
        }),
    [onClose, translateX, width, cue],
  );

  const cardStyle = useAnimatedStyle(() => {
    const offset = translateX.value + cue.value * CUE_REACH * width.value;
    // Flat and solid until it has been measured.
    const measured = width.value > 0;
    return {
      transform: [
        { translateX: offset },
        {
          rotate: `${measured ? (offset / width.value) * SWIPE_ROTATION : 0}deg`,
        },
      ],
      opacity: measured ? swipeOpacity(offset, width.value) : 1,
    };
  });

  return (
    <View
      style={{
        width: "100%",
        maxWidth: ui.contentMaxWidth,
        alignSelf: "center",
        paddingHorizontal: sidePadding,
      }}
    >
      <GestureDetector gesture={swipeToDismiss} touchAction="pan-y">
        <Animated.View
          onLayout={(event) => {
            width.value = event.nativeEvent.layout.width;
          }}
          style={[
            flexStyles.colCentered,
            {
              paddingHorizontal: spacing(14),
              paddingTop: spacing(18),
              paddingBottom: spacing(14),
              gap: spacing(12),
              outline: "none",
              borderRadius: spacing(18),
              backgroundColor: theme.surface,
              boxShadow: `${spacing(1)}px ${spacing(2)}px ${spacing(6)}px ${rgba(Colors.black, 0.3)}, ${spacing(2)}px ${spacing(4)}px ${spacing(10)}px ${rgba(
                Colors.black,
                0.3,
              )}`,
            },
            cardStyle,
          ]}
        >
          <Text
            size="xxs"
            weight={500}
            textTransform="uppercase"
            color={rgba(theme.ink, 0.7)}
            style={{ textAlign: "center", letterSpacing: spacing(1.5) }}
          >
            {titleStart}
            <Text
              size="xxs"
              weight={600}
              textTransform="uppercase"
              color={theme.accent2}
              style={{ letterSpacing: spacing(1.5) }}
            >
              {gameInfo.title}
            </Text>
            {titleEnd}
          </Text>

          <QuickStart
            gameInfo={gameInfo}
            style={{
              gap: spacing(8),
              paddingLeft: spacing(4),
              paddingRight: spacing(8),
            }}
          />

          <View
            style={[
              flexStyles.rowCentered,
              flexStyles.fullWidth,
              {
                justifyContent: "space-between",
                gap: spacing(12),
                paddingTop: spacing(4),
              },
            ]}
          >
            <Button
              size="sm"
              iconName="instructions"
              text={t("rules.title")}
              onPress={() => {
                onClose();
                showRulesModal();
              }}
              theme={rgba(theme.ink, 0.1)}
              style={{ paddingLeft: spacing(14), borderWidth: 0 }}
            />

            <Button
              size="sm"
              iconName="swipe"
              iconSize={spacing(24 * 1.15)}
              text={t("tips.dismiss")}
              onPress={onClose}
              theme="none"
              style={{ borderWidth: 0 }}
            />
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
