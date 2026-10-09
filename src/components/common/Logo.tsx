import Spade from "@/assets/images/spade.svg";
import { Text } from "@/components/common/Text";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { theme } from "@/styles/styles";
import { View } from "react-native";

/**
 * The spade mark: interlacing ribbons (assets/images/spade.svg), in the colour
 * theme's accent. The app icons and the splash draw it white on black, as
 * they show before the theme is known.
 */
export function SpadeMark({
  size = 32,
  color = theme.accent,
}: {
  size?: number;
  color?: string;
}) {
  return <Spade width={size} height={size} color={color} />;
}

/** The spade mark and the name. */
export function Logo({ height = 32 }: { height?: number }) {
  const { font } = useResponsiveMetrics();
  return (
    <View
      style={{ flexDirection: "row", alignItems: "center", gap: height * 0.25 }}
    >
      <SpadeMark size={height} />
      <Text
        weight={400}
        color={theme.ink}
        style={{ fontSize: font(21), lineHeight: font(26), letterSpacing: 0.3 }}
      >
        Solitarius
      </Text>
    </View>
  );
}
