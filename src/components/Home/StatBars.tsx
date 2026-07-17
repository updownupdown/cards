import { GameStats, HexColor } from "@/data/games-data";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { Colors, rgba } from "@/styles/styles";
import { View } from "react-native";
import { Text } from "../common/Text";

export const StatBars = ({
  stats,
  gameColor,
}: {
  stats: GameStats;
  gameColor: HexColor;
}) => {
  const { spacing } = useResponsiveMetrics();

  return (
    <View
      style={{
        width: "100%",
        gap: Math.round(spacing(24)),
        paddingTop: Math.round(spacing(6)),
        flexDirection: "row",
      }}
    >
      {Object.entries(stats).map(([key, value]) => (
        <StatBar
          key={key}
          label={key}
          value={value}
          fillColor={gameColor}
          statTrackHeight={Math.round(spacing(8))}
        />
      ))}
    </View>
  );
};

export const StatBar = ({
  label,
  value,
  fillColor,
  statTrackHeight,
}: {
  label: string;
  value: number;
  fillColor: string;
  statTrackHeight: number;
}) => {
  return (
    <View
      style={{
        flex: 1,
        gap: statTrackHeight,
      }}
    >
      <Text
        size="xxs"
        weight={300}
        color={Colors.K400}
        textTransform="uppercase"
      >
        {label}
      </Text>

      <View
        style={{
          height: statTrackHeight,
          borderRadius: statTrackHeight / 2,
          backgroundColor: rgba(fillColor, 0.16),
        }}
      >
        <View
          style={{
            width: `${value}%`,
            height: "100%",
            borderRadius: statTrackHeight / 2,
            backgroundColor: fillColor,
          }}
        />
      </View>
    </View>
  );
};
