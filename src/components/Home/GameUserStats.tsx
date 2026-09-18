import {
  getScaledTextSize,
  toDisplayUpperCase,
  Typography,
} from "@/components/common/Text";
import {
  calculateWinRate,
  formatPlayTime,
  EMPTY_STATS,
  type GameStats,
} from "@/data/game-menu";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useTranslation } from "@/i18n";
import { Colors } from "@/styles/styles";
import { View, type ViewStyle } from "react-native";
import Animated, {
  interpolateColor,
  type SharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";

type ReadonlyColorSharedValue = Readonly<Pick<SharedValue<string>, "value">>;

function StatsText({
  children,
  size,
  weight,
  color,
  textTransform,
  colorProgress,
  fromColor,
  toColor,
}: {
  children: string | number;
  size: "xxs" | "md";
  weight: 300 | 400 | 600;
  color: string;
  textTransform?: "uppercase";
  colorProgress?: SharedValue<number>;
  fromColor?: ReadonlyColorSharedValue;
  toColor?: ReadonlyColorSharedValue;
}) {
  const { textScale } = useResponsiveMetrics();
  const fontSize = getScaledTextSize(size, textScale);
  const animatedStyle = useAnimatedStyle(() => {
    if (!colorProgress || !fromColor || !toColor) return {};
    return {
      color: interpolateColor(
        colorProgress.value,
        [0, 1],
        [fromColor.value, toColor.value],
        "RGB",
      ),
    };
  });

  return (
    <Animated.Text
      style={[
        {
          fontSize,
          fontFamily: Typography.fontFamily[weight],
          color,
          lineHeight: fontSize * 1.3,
          flexShrink: 1,
        },
        animatedStyle,
      ]}
    >
      {textTransform === "uppercase"
        ? toDisplayUpperCase(String(children))
        : children}
    </Animated.Text>
  );
}

type GameUserStatsProps = {
  stats?: GameStats;
  accentColor?: string;
  labelColor?: string;
  colorProgress?: SharedValue<number>;
  fromLabelColor?: ReadonlyColorSharedValue;
  toLabelColor?: ReadonlyColorSharedValue;
  fromValueColor?: ReadonlyColorSharedValue;
  toValueColor?: ReadonlyColorSharedValue;
  style?: ViewStyle;
  showPlayed?: boolean;
  /** Adds the fastest winning time (shown in the Stats modal only). */
  showFastestTime?: boolean;
};

/**
 * Reusable display of a single game's play stats for the current user:
 * games played, wins, losses and win rate (plus best score when recorded).
 */
export function GameUserStats({
  stats = EMPTY_STATS,
  accentColor = Colors.accentBlue,
  labelColor = Colors.K400,
  colorProgress,
  fromLabelColor,
  toLabelColor,
  fromValueColor,
  toValueColor,
  style,
  showPlayed = true,
  showFastestTime = false,
}: GameUserStatsProps) {
  const { spacing } = useResponsiveMetrics();
  const { t } = useTranslation("common");

  const hasBestScore =
    typeof stats.highestScore === "number" &&
    Number.isFinite(stats.highestScore);

  // A null value has nothing to show yet ("N/A").
  const cells: { id: string; label: string; value: string | number | null }[] =
    [
      ...(showPlayed
        ? [{ id: "played", label: t("stats.played"), value: stats.attempts }]
        : []),
      { id: "won", label: t("stats.won"), value: stats.wins },
      { id: "lost", label: t("stats.lost"), value: stats.losses },
      {
        id: "winRate",
        label: t("stats.winRate"),
        value: calculateWinRate(stats) ?? null,
      },
      {
        id: "best",
        label: t("stats.best"),
        value: hasBestScore ? (stats.highestScore as number) : null,
      },
      ...(showFastestTime
        ? [
            {
              id: "fastest",
              label: t("stats.fastest"),
              value:
                stats.fastestTimeMs == null
                  ? null
                  : formatPlayTime(stats.fastestTimeMs),
            },
          ]
        : []),
    ];

  return (
    <View
      style={[
        {
          flexDirection: "row",
          width: "100%",
        },
        style,
      ]}
    >
      {cells.map((cell) => (
        <View
          key={cell.id}
          style={{
            flex: 1,
            alignItems: "center",
            paddingVertical: spacing(6),
          }}
        >
          <StatsText
            size="xxs"
            weight={400}
            color={labelColor}
            textTransform="uppercase"
            colorProgress={colorProgress}
            fromColor={fromLabelColor}
            toColor={toLabelColor}
          >
            {cell.label}
          </StatsText>
          <StatsText
            size="md"
            weight={cell.value === null ? 300 : 600}
            color={cell.value === null ? labelColor : accentColor}
            colorProgress={colorProgress}
            fromColor={cell.value === null ? fromLabelColor : fromValueColor}
            toColor={cell.value === null ? toLabelColor : toValueColor}
          >
            {cell.value ?? t("notAvailable")}
          </StatsText>
        </View>
      ))}
    </View>
  );
}
