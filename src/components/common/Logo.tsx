import { Text } from "@/components/common/Text";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { theme } from "@/styles/styles";
import { View } from "react-native";
import Svg, { G, Path } from "react-native-svg";

/** A spade on a 32 x 32 grid, its lobes meeting at (16, 19). */
const SPADE =
  "M16 3C12.2 8 4.5 11.4 4.5 17c0 3.6 3.2 5.9 6.6 5.5 2.1-.2 3.7-1.6 4.9-3.5 1.2 1.9 2.8 3.3 4.9 3.5 3.4.4 6.6-1.9 6.6-5.5C27.5 11.4 19.8 8 16 3Z";
const STEM = "M16 19c0 4-1.1 7.1-4 9.5h8c-2.9-2.4-4-5.5-4-9.5";

/**
 * The spade mark: the outline echoed twice inside itself, like contour lines,
 * drawn in the theme's accent.
 */
export function SpadeMark({
  size = 32,
  color = theme.accent,
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <G
        fill="none"
        stroke={color}
        strokeWidth={1.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <Path d={SPADE} />
        <Path d={STEM} />
        {[0.66, 0.34].map((scale) => (
          <Path
            key={scale}
            d={SPADE}
            strokeWidth={1.4 / scale}
            opacity={scale > 0.5 ? 0.75 : 0.5}
            transform={`translate(${16 * (1 - scale)} ${15 * (1 - scale)}) scale(${scale})`}
          />
        ))}
      </G>
    </Svg>
  );
}

/** The spade mark and the name. */
export function Logo({ height = 32 }: { height?: number }) {
  const { font } = useResponsiveMetrics();
  return (
    <View
      style={{ flexDirection: "row", alignItems: "center", gap: height * 0.3 }}
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
