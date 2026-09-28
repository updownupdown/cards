import { Text } from "@/components/common/Text";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useTranslation } from "@/i18n";
import { flexStyles } from "@/styles/flexStyles";
import {
  Colors,
  LayerZIndexes,
  layoutDims,
  rgba,
  theme,
} from "@/styles/styles";
import { ActionButton, Caps, Kicker } from "@/components/ui/Nocturne";
import { useEffect, useRef } from "react";
import { Animated, Easing, Platform, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ReactNode } from "react";
import { formatPlayTime } from "@/data/game-menu";

export type WinTimes = { timeMs: number; bestMs: number };

interface Props {
  gameEnded: boolean;
  headerBottom: number;
  score?: string | number;
  /** Suppress the default "Score: {{score}}" line, e.g. when the message already includes it. */
  hideScore?: boolean;
  message?: string;
  won: boolean;
  /** How long this win took, and the fastest win so far. */
  winTimes?: WinTimes | null;
  reset: () => void;
  handleUndo?: () => void;
  isCampaignMode?: boolean;
  rewardPreview?: ReactNode;
  /** Show the buttons faded and disabled, e.g. until a reward has played. */
  actionsDisabled?: boolean;
  /** @deprecated The old name of actionsDisabled. */
  actionsHidden?: boolean;
  /** The game's name, large at the top. */
  title?: string;
  /** How many times the game has been won, this win included. */
  winCount?: number;
  onExit?: () => void;
}

export const WinLoseBox = ({
  headerBottom,
  score,
  hideScore = false,
  message,
  won,
  winTimes,
  gameEnded,
  reset,
  handleUndo,
  isCampaignMode = false,
  rewardPreview,
  actionsDisabled: actionsDisabledProp = false,
  actionsHidden = false,
  title,
  winCount,
  onExit,
}: Props) => {
  const { ui, spacing } = useResponsiveMetrics();
  const actionsDisabled = actionsDisabledProp || actionsHidden;
  const { t } = useTranslation("game");
  const { t: tCommon } = useTranslation("common");
  const stat = (label: string, value: string) => (
    <View style={{ gap: spacing(2) }}>
      <Text
        size="xl"
        weight={500}
        style={{ fontVariant: ["tabular-nums", "lining-nums"] }}
      >
        {value}
      </Text>
      <Caps>{label}</Caps>
    </View>
  );
  const insets = useSafeAreaInsets();
  const restingBottom = spacing(layoutDims.pagePadding) + insets.bottom;
  const backdropGradientColors = [
    rgba(theme.night, 0),
    rgba(theme.night, 0.9),
  ] as const;

  // Win/lose animations
  const wlmAnim = useRef(new Animated.Value(0)).current;

  // A quick fade only: easing out, so it shows at once and settles gently.
  const fadeInWLM = () => {
    Animated.timing(wlmAnim, {
      toValue: 1,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== "web",
    }).start();
  };
  const fadeOutWLM = (actionAfterFadeout?: () => void) => {
    Animated.timing(wlmAnim, {
      toValue: 0,
      duration: 200,
      easing: Easing.in(Easing.quad),
      useNativeDriver: Platform.OS !== "web",
    }).start(({ finished }) => {
      if (finished && actionAfterFadeout) {
        actionAfterFadeout();
      }
    });
  };

  useEffect(() => {
    if (gameEnded) {
      fadeInWLM();
    } else {
      fadeOutWLM();
    }
  }, [gameEnded]);

  return gameEnded ? (
    <>
      <Animated.View
        style={{
          opacity: wlmAnim,
          position: "absolute",
          zIndex: LayerZIndexes.winLoseBackdrop,
          top: headerBottom,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      >
        {Platform.OS === "web" ? (
          <View
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              top: 0,
              right: 0,
              width: "100%",
              pointerEvents: "none",
              backgroundImage: `linear-gradient(to bottom, ${backdropGradientColors.join(", ")})`,
            }}
          />
        ) : (
          <LinearGradient
            colors={backdropGradientColors}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              top: 0,
              right: 0,
              width: "100%",
              pointerEvents: "none",
            }}
          />
        )}
      </Animated.View>

      <Animated.View
        style={[
          {
            opacity: wlmAnim,
            position: "absolute",
            zIndex: LayerZIndexes.winLoseCard,
            alignSelf: "center",
            width: "92%",
            maxWidth: ui.contentMaxWidth - spacing(layoutDims.pagePadding) * 2,
            // Clear of the bottom safe area (Android's navigation bar).
            bottom: restingBottom,
          },
        ]}
      >
        <View
          style={{
            padding: spacing(20),
            gap: spacing(18),
            borderRadius: spacing(22),
            backgroundColor: rgba(theme.surface, 0.96),
            borderWidth: 1,
            borderColor: rgba(theme.ink, 0.08),
            boxShadow: `0 ${spacing(12)}px ${spacing(40)}px ${rgba(Colors.black, 0.5)}`,
          }}
        >
          {rewardPreview}
          <View style={{ gap: spacing(4) }}>
            <Kicker color={won ? theme.accent : theme.dim}>
              {won ? t("result.won") : t("result.lost")}
            </Kicker>
            {title ? (
              <Text weight={500} size="xxxl" numberOfLines={2}>
                {title}
              </Text>
            ) : null}
          </View>

          {won && (winTimes || winCount !== undefined) && (
            <View style={{ flexDirection: "row", gap: spacing(24) }}>
              {winTimes &&
                stat(tCommon("stats.time"), formatPlayTime(winTimes.timeMs))}
              {winTimes &&
                stat(
                  tCommon("stats.bestTimeLabel"),
                  formatPlayTime(winTimes.bestMs),
                )}
              {winCount !== undefined &&
                stat(tCommon("stats.wins"), String(winCount))}
            </View>
          )}

          {message || (!hideScore && score !== undefined) ? (
            <View style={{ gap: spacing(4) }}>
              {message ? (
                <Text size="md" weight={300} color={theme.dim}>
                  {message.replace(/\\n/g, "\n")}
                </Text>
              ) : null}
              {!hideScore && score !== undefined && (
                <Text size="md" weight={300} color={theme.dim}>
                  {t("result.score", { score })}
                </Text>
              )}
            </View>
          ) : null}

          <View
            style={{
              flexDirection: "row",
              gap: spacing(10),
              opacity: actionsDisabled ? 0.2 : 1,
            }}
            pointerEvents={actionsDisabled ? "none" : "auto"}
          >
            {handleUndo && !won && (
              <ActionButton
                small
                secondary
                iconName="undo"
                label={tCommon("undo")}
                disabled={actionsDisabled}
                onPress={() => fadeOutWLM(handleUndo)}
              />
            )}
            <ActionButton
              small
              secondary
              iconName="reset"
              label={won ? t("result.playAgain") : t("result.tryAgain")}
              disabled={actionsDisabled}
              onPress={() => fadeOutWLM(reset)}
              style={{ flex: 1 }}
            />
            <ActionButton
              small
              iconName={isCampaignMode ? "milky-way" : "home"}
              label={
                isCampaignMode ? t("result.continueOdyssey") : t("result.home")
              }
              disabled={actionsDisabled}
              onPress={() => fadeOutWLM(onExit)}
              style={{ flex: 1.2 }}
            />
          </View>
        </View>
      </Animated.View>
    </>
  ) : null;
};
