import { getScaledTextSize, Text } from "@/components/common/Text";
import { Icon } from "@/icons";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useTranslation } from "@/i18n";
import { flexStyles } from "@/styles/flexStyles";
import { Colors, LayerZIndexes, layoutDims, rgba } from "@/styles/styles";
import { useEffect, useRef } from "react";
import { Animated, Easing, Platform, View } from "react-native";
import { Button } from "../Button/Button";
import { useGameColors } from "@/hooks/useGameColors";
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
  /** Shown in its own soft panel just above the card. */
  topPanel?: ReactNode;
  /** Leave the buttons out, e.g. while a reward plays over the screen. */
  actionsHidden?: boolean;
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
  topPanel,
  actionsHidden = false,
  onExit,
}: Props) => {
  const { ui, spacing, textScale } = useResponsiveMetrics();
  const { t } = useTranslation("game");
  const { t: tCommon } = useTranslation("common");
  const { colorDark } = useGameColors();
  const insets = useSafeAreaInsets();
  const restingBottom = spacing(layoutDims.pagePadding) + insets.bottom;
  const backdropGradientColors = [
    rgba(colorDark, 0),
    rgba(colorDark, 0.9),
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
            gap: spacing(24),
            alignSelf: "center",
            width: "90%",
            maxWidth: ui.contentMaxWidth - spacing(layoutDims.pagePadding) * 2,
            // Clear of the bottom safe area (Android's navigation bar).
            bottom: restingBottom,
          },
        ]}
      >
        {topPanel && (
          <View
            style={[
              flexStyles.colCentered,
              {
                padding: spacing(20),
                borderRadius: spacing(20),
                backgroundColor: rgba(colorDark, 0.75),
                // Wide and soft, so the panel has no sharp outline.
                boxShadow: `0 0 ${spacing(32)}px ${spacing(12)}px ${rgba(colorDark, 0.75)}`,
              },
            ]}
          >
            {topPanel}
          </View>
        )}
        <View
          style={[
            flexStyles.colCentered,
            {
              padding: spacing(20),
              gap: spacing(20),
              borderRadius: spacing(20),
              backgroundColor: won ? rgba(Colors.win, 1) : rgba(Colors.lose, 1),
              boxShadow: won
                ? `0 0 20px ${rgba(Colors.win, 0.6)}, 0 0 40px ${rgba(Colors.win, 0.6)}`
                : `0 0 20px ${rgba(Colors.lose, 0.6)}, 0 0 40px ${rgba(Colors.lose, 0.6)}`,
            },
          ]}
        >
          {rewardPreview}
          <View style={[flexStyles.fullWidth, { gap: spacing(8) }]}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: spacing(12),
              }}
            >
              <Text
                size="xl"
                weight={400}
                color={Colors.white}
                style={{ flexShrink: 1 }}
              >
                {won ? t("result.won") : t("result.lost")}
              </Text>

              {won && winTimes && (
                <View style={{ alignItems: "flex-end" }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: spacing(4),
                    }}
                  >
                    {/* As tall as the time beside it. */}
                    <Icon
                      name="clock"
                      size={getScaledTextSize("md", textScale)}
                      color={Colors.white}
                    />
                    <Text size="md" weight={600} color={Colors.white}>
                      {formatPlayTime(winTimes.timeMs)}
                    </Text>
                  </View>
                  <Text size="sm" weight={300} color={rgba(Colors.white, 0.85)}>
                    {tCommon("stats.bestTime", {
                      time: formatPlayTime(winTimes.bestMs),
                    })}
                  </Text>
                </View>
              )}
            </View>

            {message ? (
              <Text size="md" weight={300} color={Colors.white}>
                {message.replace(/\\n/g, "\n")}
              </Text>
            ) : null}
            {!hideScore && score !== undefined && (
              <Text size="md" weight={300} color={Colors.white}>
                {t("result.score", { score })}
              </Text>
            )}
          </View>

          {!actionsHidden && (
            <View
              style={[
                flexStyles.rowCentered,
                flexStyles.fullWidth,
                { gap: spacing(12) },
              ]}
            >
              <Button
                size="md"
                accessibilityLabel={
                  isCampaignMode ? t("menu.campaign") : t("menu.home")
                }
                onPress={() => fadeOutWLM(onExit)}
                taller
                iconName={isCampaignMode ? "milky-way" : "home"}
                theme={won ? "winDark" : "loseDark"}
              />

              {handleUndo && !won && (
                <Button
                  onPress={() => fadeOutWLM(handleUndo)}
                  iconName="undo"
                  size="md"
                  theme="loseDark"
                  taller
                />
              )}

              <Button
                onPress={() => fadeOutWLM(reset)}
                size="md"
                iconName="reset"
                text={won ? t("result.playAgain") : t("result.tryAgain")}
                theme={won ? "winDark" : "loseDark"}
                taller
                style={{
                  flex: 1,
                }}
              />
            </View>
          )}
        </View>
      </Animated.View>
    </>
  ) : null;
};
