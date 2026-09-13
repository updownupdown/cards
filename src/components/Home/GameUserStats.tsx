import { getScaledTextSize, Typography } from "@/components/common/Text";
import {
  calculateWinRate,
  formatPlayTime,
  EMPTY_STATS,
  type GameStats,
} from "@/data/game-menu";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
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
          textTransform,
          lineHeight: fontSize * 1.3,
          flexShrink: 1,
        },
        animatedStyle,
      ]}
    >
      {children}
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

  const hasBestScore =
    typeof stats.highestScore === "number" &&
    Number.isFinite(stats.highestScore);

  const cells: { label: string; value: string | number }[] = [
    ...(showPlayed ? [{ label: "Played", value: stats.attempts }] : []),
    { label: "Won", value: stats.wins },
    { label: "Lost", value: stats.losses },
    { label: "Win rate", value: calculateWinRate(stats) ?? "N/A" },
    {
      label: "Best",
      value: hasBestScore ? (stats.highestScore as number) : "N/A",
    },
    ...(showFastestTime
      ? [
          {
            label: "Fastest",
            value:
              stats.fastestTimeMs == null
                ? "N/A"
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
          key={cell.label}
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
            weight={cell.value === "N/A" ? 300 : 600}
            color={cell.value === "N/A" ? labelColor : accentColor}
            colorProgress={colorProgress}
            fromColor={cell.value === "N/A" ? fromLabelColor : fromValueColor}
            toColor={cell.value === "N/A" ? toLabelColor : toValueColor}
          >
            {cell.value}
          </StatsText>
        </View>
      ))}
    </View>
  );
}
