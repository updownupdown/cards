import { Text } from "@/components/common/Text";
import { usePalette } from "@/styles/palette";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useTranslation } from "@/i18n";
import { Colors, LayerZIndexes, layoutDims, rgba } from "@/styles/styles";
import { ActionButton, Caps, Kicker } from "@/components/ui/Nocturne";
import { useToast } from "@/components/common/Toast";
import { useGamePath } from "@/hooks/useGamePath";
import { gameShareUrl, shareWin } from "@/utils/share-win";
import { GameCollectibleIcons } from "@/components/ui/GameCollectibleIcons";
import { UfoNote } from "@/components/common/UfoNote";
import { useEffect, useRef } from "react";
import { Animated, Easing, Platform, Pressable, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ReactNode } from "react";
import { formatPlayTime } from "@/data/game-menu";
import type { CollectibleReward } from "@/data/collectibles";

export type WinTimes = { timeMs: number; bestMs: number };

interface Props {
  gameEnded: boolean;
  headerBottom: number;
  score?: string | number;
  /** Suppress the default "Score: {{score}}" line, e.g. when the message already includes it. */
  hideScore?: boolean;
  message?: string;
  /** A word from the UFO (it helped with this one), above the box. */
  ufoNote?: string;
  won: boolean;
  /** How long this win took, and the fastest win so far. */
  winTimes?: WinTimes | null;
  reset: () => void;
  handleUndo?: () => void;
  isCampaignMode?: boolean;
  collectibleRewards?: readonly CollectibleReward[];
  collectedTaoIds?: ReadonlySet<number>;
  collectedQuoteIds?: ReadonlySet<number>;
  newlyEarnedReward?: CollectibleReward;
  rewardPreview?: ReactNode;
  /**
   * Leave the buttons out (and Share faded and disabled) until a reward has
   * played: the box is shorter meanwhile, with no gap where they will be.
   */
  actionsHidden?: boolean;
  /** The game's name, large at the top. */
  title: string;
  /** How many times the game has been won, this win included. */
  winCount?: number;
  onExit?: () => void;
}

export const WinLoseBox = ({
  headerBottom,
  score,
  hideScore = false,
  message,
  ufoNote,
  won,
  winTimes,
  gameEnded,
  reset,
  handleUndo,
  isCampaignMode = false,
  collectibleRewards,
  collectedTaoIds,
  collectedQuoteIds,
  newlyEarnedReward,
  rewardPreview,
  actionsHidden = false,
  title,
  winCount,
  onExit,
}: Props) => {
  const { ui, spacing } = useResponsiveMetrics();
  const theme = usePalette();
  const { t } = useTranslation("game");
  const { t: tCommon } = useTranslation("common");
  const stat = (label: string, value: string) => (
    <View style={{ gap: spacing(2) }}>
      <Text
        size="lg"
        weight={500}
        style={{ fontVariant: ["tabular-nums", "lining-nums"] }}
      >
        {value}
      </Text>
      <Caps>{label}</Caps>
    </View>
  );
  const gamePath = useGamePath();
  const showToast = useToast();
  const share = async () => {
    const text = winTimes
      ? t("result.shareText", {
          game: title,
          time: formatPlayTime(winTimes.timeMs),
        })
      : t("result.shareTextNoTime", { game: title });
    const outcome = await shareWin({ text, url: gameShareUrl(gamePath) });
    if (outcome === "copied") showToast(t("result.shareCopied"));
    if (outcome === "failed") showToast(t("result.shareFailed"));
  };
  const showCollectibles =
    isCampaignMode &&
    !!collectibleRewards &&
    !!collectedTaoIds &&
    !!collectedQuoteIds;
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
            gap: spacing(14),
          },
        ]}
      >
        {ufoNote ? <UfoNote text={ufoNote} /> : null}
        <View
          style={{
            padding: spacing(20),
            gap: spacing(18),
            borderRadius: spacing(22),
            backgroundColor: rgba(theme.surface, 0.96),
            borderWidth: 1,
            borderColor: rgba(theme.ink, 0.14),
            boxShadow: `0 ${spacing(12)}px ${spacing(40)}px ${rgba(Colors.black, 0.5)}`,
          }}
        >
          {rewardPreview}
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: spacing(12),
            }}
          >
            <View style={{ flex: 1, minWidth: 0 }}>
              <Kicker color={won ? theme.accent : theme.dim}>{title}</Kicker>
              <Text weight={500} size="xxxl" numberOfLines={2}>
                {won ? t("result.won") : t("result.lost")}
              </Text>
            </View>
            {(showCollectibles || won) && (
              <View style={{ alignItems: "flex-end", gap: spacing(8) }}>
                {showCollectibles && (
                  <GameCollectibleIcons
                    rewards={collectibleRewards}
                    collectedTaoIds={collectedTaoIds}
                    collectedQuoteIds={collectedQuoteIds}
                    glowingReward={newlyEarnedReward}
                  />
                )}
                {won && (
                  <Pressable
                    testID="share-win"
                    accessibilityRole="button"
                    disabled={actionsHidden}
                    onPress={share}
                    hitSlop={spacing(10)}
                    style={{ opacity: actionsHidden ? 0.2 : 1 }}
                  >
                    <Text size="md" weight={500} color={theme.accent}>
                      {t("result.share")}
                    </Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>

          {message || (!hideScore && score !== undefined) ? (
            <View style={{ gap: spacing(4) }}>
              {message ? (
                <Text size="md" weight={400} color={theme.dim}>
                  {message.replace(/\\n/g, "\n")}
                </Text>
              ) : null}
              {!hideScore && score !== undefined && (
                <Text size="md" weight={400} color={theme.dim}>
                  {t("result.score", { score })}
                </Text>
              )}
            </View>
          ) : null}

          {/* Time, Best Time, Wins */}
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

          {!actionsHidden && (
            <View style={{ flexDirection: "row", gap: spacing(10) }}>
              {handleUndo && !won && (
                <ActionButton
                  secondary
                  iconName="undo"
                  label=""
                  accessibilityLabel={tCommon("undo")}
                  onPress={() => fadeOutWLM(handleUndo)}
                />
              )}
              <ActionButton
                secondary
                iconName="reset"
                label={won ? t("result.playAgain") : t("result.tryAgain")}
                onPress={() => fadeOutWLM(reset)}
                style={{ flex: 1 }}
              />
              <ActionButton
                iconName={isCampaignMode ? "milky-way" : "home"}
                label={
                  isCampaignMode
                    ? t("result.continueOdyssey")
                    : t("result.home")
                }
                onPress={() => fadeOutWLM(onExit)}
              />
            </View>
          )}
        </View>
      </Animated.View>
    </>
  ) : null;
};
