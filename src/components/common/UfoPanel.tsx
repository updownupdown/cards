import { UfoFrame } from "@/components/common/UfoFrame";
import { Text, toDisplayUpperCase } from "@/components/common/Text";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { Icon } from "@/icons";
import { UfoColors } from "@/styles/styles";
import type { ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";

/**
 * A "Help from Above" box: the UFO and its title in green capitals, in the
 * UFO's frame. The Rules modal and the settings both show one.
 */
export function UfoPanel({
  title,
  still,
  style,
  children,
}: {
  title: string;
  /** A plain border instead of the turning one. */
  still?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}) {
  const { spacing } = useResponsiveMetrics();
  return (
    <UfoFrame
      radius={spacing(10)}
      still={still}
      style={[
        {
          width: "100%",
          gap: spacing(16),
          paddingHorizontal: spacing(18),
          paddingVertical: spacing(!!children ? 18 : 12),
        },
        style,
      ]}
    >
      <View
        style={{ flexDirection: "row", alignItems: "center", gap: spacing(10) }}
      >
        <Icon name="ufo" size={spacing(28)} color={UfoColors.green} />
        <Text
          size="xs"
          weight={500}
          color={UfoColors.green}
          style={{ flex: 1, letterSpacing: 2 }}
        >
          {toDisplayUpperCase(title)}
        </Text>
      </View>
      {children}
    </UfoFrame>
  );
}
