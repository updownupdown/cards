import { Text } from "@/components/common/Text";
import {
  calculateWinRate,
  EMPTY_STATS,
  type GameStats,
} from "@/data/game-menu";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { Colors, rgba } from "@/styles/styles";
import { View, type ViewStyle } from "react-native";

type GameUserStatsProps = {
  stats?: GameStats;
  accentColor?: string;
  style?: ViewStyle;
};

/**
 * Reusable display of a single game's play stats for the current user:
 * games played, wins, losses and win rate (plus best score when recorded).
 */
export function GameUserStats({
  stats = EMPTY_STATS,
  accentColor = Colors.accentBlue,
  style,
}: GameUserStatsProps) {
  const { spacing } = useResponsiveMetrics();

  const hasBestScore =
    typeof stats.highestScore === "number" &&
    Number.isFinite(stats.highestScore);

  const cells: { label: string; value: string | number }[] = [
    { label: "Played", value: stats.attempts },
    { label: "Won", value: stats.wins },
    { label: "Lost", value: stats.losses },
    { label: "Win rate", value: calculateWinRate(stats) ?? "N/A" },
  ];

  if (hasBestScore) {
    cells.push({ label: "Best", value: stats.highestScore as number });
  }

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
          <Text
            size="xxs"
            weight={400}
            color={Colors.K400}
            textTransform="uppercase"
          >
            {cell.label}
          </Text>
          <Text size="md" weight={600} color={accentColor}>
            {cell.value}
          </Text>
        </View>
      ))}
    </View>
  );
}
