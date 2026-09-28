import { Text } from "@/components/common/Text";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { Icon } from "@/icons";
import { flexStyles } from "@/styles/flexStyles";
import { homeSurfaceShadow } from "@/styles/homeSurfaceShadow";
import { Colors, rgba, theme } from "@/styles/styles";
import { Kicker } from "@/components/ui/Nocturne";
import { Pressable, View } from "react-native";

type IntroPanelProps = {
  title: string;
  text: string;
  onClose: () => void;
  closeLabel: string;
};

/**
 * A small, one-time explainer shown on a tab (Campaign, Collect) until
 * dismissed: a title and one short paragraph. Kept short enough that it
 * never needs to scroll.
 */
export function IntroPanel({
  title,
  text,
  onClose,
  closeLabel,
}: IntroPanelProps) {
  const { spacing } = useResponsiveMetrics();

  return (
    <View
      style={{
        width: "100%",
        borderRadius: spacing(18),
        backgroundColor: rgba(theme.surface, 0.92),
        borderWidth: 1,
        borderColor: rgba(theme.ink, 0.14),
        overflow: "hidden",
        ...homeSurfaceShadow(spacing, { translucent: true }),
      }}
    >
      <View
        style={[
          flexStyles.colStart,
          {
            gap: spacing(8),
            paddingHorizontal: spacing(20),
            paddingVertical: spacing(20),
          },
        ]}
      >
        <Kicker>{title}</Kicker>

        <Text
          size="sm"
          weight={300}
          color={theme.dim}
          lineHeight={1.45}
          style={{ paddingRight: spacing(24) }}
        >
          {text}
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
          onPress={onClose}
          hitSlop={spacing(12)}
          style={{
            padding: spacing(8),
            position: "absolute",
            top: spacing(8),
            right: spacing(8),
          }}
        >
          <Icon name="close" size={spacing(28)} color={Colors.K500} />
        </Pressable>
      </View>
    </View>
  );
}
