import { GameStats, HexColor } from "@/data/games-data";
import { useResponsiveScale } from "@/hooks/useResponsiveLayout";
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
  const responsiveScale = useResponsiveScale();

  return (
    <View
      style={{
        gap: Math.round(24 * responsiveScale),
        paddingTop: Math.round(6 * responsiveScale),
        flexDirection: "row",
      }}
    >
      {Object.entries(stats).map(([key, value]) => (
        <StatBar
          key={key}
          label={key}
          value={value}
          fillColor={gameColor}
          responsiveScale={responsiveScale}
        />
      ))}
    </View>
  );
};

export const StatBar = ({
  label,
  value,
  fillColor,
  responsiveScale,
}: {
  label: string;
  value: number;
  fillColor: string;
  responsiveScale: number;
}) => {
  const statTrackHeight = Math.round(8 * responsiveScale);

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
