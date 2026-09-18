import { GameRating, GameStatsNames, HexColor } from "@/data/games-data";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useTranslation } from "@/i18n";
import { Colors, rgba } from "@/styles/styles";
import { View, ViewStyle } from "react-native";
import { Text } from "../common/Text";

type Props = {
  rating: GameRating;
  gameColor: HexColor;
  style?: ViewStyle | ViewStyle[];
};

export const RatingsBars = ({ rating, gameColor, style }: Props) => {
  const { spacing } = useResponsiveMetrics();
  const { t } = useTranslation("common");

  return (
    <View
      style={[
        {
          width: "100%",
          gap: Math.round(spacing(24)),
          paddingTop: Math.round(spacing(6)),
          flexDirection: "row",
        },
        style,
      ]}
    >
      {Object.entries(rating).map(([key, value]) => (
        <RatingBar
          key={key}
          label={t(`stats.${key as GameStatsNames}`)}
          value={value}
          fillColor={gameColor}
          trackHeight={Math.round(spacing(8))}
        />
      ))}
    </View>
  );
};

export const RatingBar = ({
  label,
  value,
  fillColor,
  trackHeight,
}: {
  label: string;
  value: number;
  fillColor: string;
  trackHeight: number;
}) => {
  return (
    <View
      style={{
        flex: 1,
        gap: trackHeight / 1.6,
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
          height: trackHeight,
          borderRadius: trackHeight / 2,
          backgroundColor: rgba(fillColor, 0.16),
        }}
      >
        <View
          style={{
            width: `${value}%`,
            height: "100%",
            borderRadius: trackHeight / 2,
            backgroundColor: fillColor,
          }}
        />
      </View>
    </View>
  );
};
