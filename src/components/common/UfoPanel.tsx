import { UfoFrame, type UfoFrameStyle } from "@/components/common/UfoFrame";
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
  trailing,
  wrapHeading,
  variant,
  style,
  children,
}: {
  title: string;
  /** Next to the title, at the end (an expand arrow, say). */
  trailing?: ReactNode;
  /** Wraps the heading, e.g. a Pressable that opens the panel. */
  wrapHeading?: (heading: ReactNode) => ReactNode;
  variant?: UfoFrameStyle;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}) {
  const { spacing } = useResponsiveMetrics();
  const heading = (
    <View
      style={{ flexDirection: "row", alignItems: "center", gap: spacing(10) }}
    >
      <Icon name="ufo" size={spacing(26)} color={UfoColors.green} />
      <Text
        size="sm"
        weight={700}
        color={UfoColors.green}
        style={{ flex: 1, letterSpacing: 1.5 }}
      >
        {toDisplayUpperCase(title)}
      </Text>
      {trailing}
    </View>
  );
  return (
    <UfoFrame
      variant={variant}
      radius={spacing(14)}
      style={[
        {
          width: "100%",
          gap: spacing(16),
          paddingHorizontal: spacing(18),
          paddingVertical: spacing(18),
        },
        style,
      ]}
    >
      {wrapHeading ? wrapHeading(heading) : heading}
      {children}
    </UfoFrame>
  );
}
